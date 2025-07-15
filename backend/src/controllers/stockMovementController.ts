import { Request, Response } from 'express';
import { prisma } from '../server';

export class StockMovementController {
  // Listar movimientos de stock
  static async getStockMovements(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        productId = '',
        type = '',
        dateFrom = '',
        dateTo = ''
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where = {
        ...(productId && { productId: productId as string }),
        ...(type && { type: type as any }),
        ...(dateFrom && dateTo && {
          createdAt: {
            gte: new Date(dateFrom as string),
            lte: new Date(dateTo as string)
          }
        })
      };

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                unit: true
              }
            },
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.stockMovement.count({ where })
      ]);

      res.json({
        movements,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo movimientos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Usar producto en tratamiento
  static async useInTreatment(req: Request, res: Response) {
    try {
      const { productId, quantity, appointmentId, notes } = req.body;
      const userId = req.user.id;

      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (product.currentStock < quantity) {
        return res.status(400).json({ error: 'Stock insuficiente' });
      }

      // Actualizar stock y registrar movimiento en transacción
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: {
            currentStock: {
              decrement: quantity
            }
          }
        }),
        prisma.stockMovement.create({
          data: {
            productId,
            userId,
            type: 'USO_TRATAMIENTO',
            quantity: -quantity, // Negativo porque es salida
            reason: notes || 'Uso en tratamiento',
            reference: appointmentId
          }
        })
      ]);

      res.json({ message: 'Stock actualizado correctamente' });
    } catch (error) {
      console.error('Error usando producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Reportar vencimiento
  static async reportExpiry(req: Request, res: Response) {
    try {
      const { productId, quantity, reason } = req.body;
      const userId = req.user.id;

      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: {
            currentStock: {
              decrement: quantity
            }
          }
        }),
        prisma.stockMovement.create({
          data: {
            productId,
            userId,
            type: 'VENCIMIENTO',
            quantity: -quantity,
            reason: reason || 'Producto vencido'
          }
        })
      ]);

      res.json({ message: 'Vencimiento registrado correctamente' });
    } catch (error) {
      console.error('Error registrando vencimiento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
