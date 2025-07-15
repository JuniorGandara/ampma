import { Request, Response } from 'express';
import { prisma } from '../server';
import { Prisma } from '@prisma/client';

export class PurchaseController {
  // Crear orden de compra
  static async createPurchase(req: Request, res: Response) {
    try {
      const {
        supplierId,
        items,
        dueDate,
        notes
      } = req.body;

      // Generar número de compra único
      const lastPurchase = await prisma.purchase.findFirst({
        orderBy: { createdAt: 'desc' }
      });
      
      const purchaseNumber = `OC-${String(lastPurchase ? 
        parseInt(lastPurchase.purchaseNumber.split('-')[1]) + 1 : 1
      ).padStart(6, '0')}`;

      // Calcular totales
      let subtotal = 0;
      const processedItems = items.map((item: any) => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        return {
          ...item,
          total: itemTotal
        };
      });

      const tax = subtotal * 0.21; // IVA 21%
      const total = subtotal + tax;

      // Crear compra con items
      const purchase = await prisma.purchase.create({
        data: {
          supplierId,
          purchaseNumber,
          dueDate: dueDate ? new Date(dueDate) : null,
          subtotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          items: {
            create: processedItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              total: new Prisma.Decimal(item.total),
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
            }))
          }
        },
        include: {
          supplier: true,
          items: {
            include: { product: true }
          }
        }
      });

      res.status(201).json(purchase);
    } catch (error) {
      console.error('Error creando compra:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Recibir mercadería (actualizar stock)
  static async receivePurchase(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { receivedItems } = req.body;
      const userId = req.user.id;

      const purchase = await prisma.purchase.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!purchase) {
        return res.status(404).json({ error: 'Compra no encontrada' });
      }

      if (purchase.status !== 'PENDIENTE') {
        return res.status(400).json({ error: 'La compra ya fue procesada' });
      }

      // Procesar cada item recibido
      const stockMovements = [];
      const productUpdates = [];

      for (const receivedItem of receivedItems) {
        const originalItem = purchase.items.find(item => item.id === receivedItem.itemId);
        if (!originalItem) continue;

        // Actualizar stock del producto
        productUpdates.push(
          prisma.product.update({
            where: { id: originalItem.productId },
            data: {
              currentStock: {
                increment: receivedItem.quantityReceived
              }
            }
          })
        );

        // Registrar movimiento de stock
        stockMovements.push(
          prisma.stockMovement.create({
            data: {
              productId: originalItem.productId,
              userId,
              type: 'COMPRA',
              quantity: receivedItem.quantityReceived,
              reason: `Compra ${purchase.purchaseNumber}`,
              reference: purchase.id,
              expiryDate: originalItem.expiryDate
            }
          })
        );
      }

      // Ejecutar todas las operaciones en transacción
      await prisma.$transaction([
        ...productUpdates,
        ...stockMovements,
        // Actualizar estado de la compra
        prisma.purchase.update({
          where: { id },
          data: { status: 'RECIBIDA' }
        })
      ]);

      res.json({ message: 'Mercadería recibida correctamente' });
    } catch (error) {
      console.error('Error recibiendo compra:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Listar compras
  static async getPurchases(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status = '',
        supplierId = '' 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where = {
        ...(status && { status: status as any }),
        ...(supplierId && { supplierId: supplierId as string })
      };

      const [purchases, total] = await Promise.all([
        prisma.purchase.findMany({
          where,
          include: {
            supplier: true,
            items: {
              include: { product: true }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.purchase.count({ where })
      ]);

      res.json({
        purchases,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo compras:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
