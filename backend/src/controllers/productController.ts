import { Request, Response } from 'express';
import { prisma } from '../server';
import { Prisma } from '@prisma/client';

export class ProductController {
  // Listar productos con filtros y paginación
  static async getProducts(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        category = '', 
        lowStock = false,
        expired = false 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: Prisma.ProductWhereInput = {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { sku: { contains: search as string, mode: 'insensitive' } },
            { brand: { contains: search as string, mode: 'insensitive' } }
          ]
        }),
        ...(category && { category: category as string }),
        ...(lowStock === 'true' && {
          currentStock: { lte: prisma.product.fields.minStock }
        })
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            suppliers: {
              include: { supplier: true }
            },
            stockMovements: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: { user: { select: { firstName: true, lastName: true } } }
            },
            _count: {
              select: { 
                stockMovements: true,
                treatmentProducts: true 
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { name: 'asc' }
        }),
        prisma.product.count({ where })
      ]);

      // Calcular productos próximos a vencer (si tienen vencimiento)
      const productsWithAlerts = products.map(product => ({
        ...product,
        alerts: {
          lowStock: product.currentStock <= product.minStock,
          noStock: product.currentStock <= 0,
          nearExpiry: false, // TODO: Calcular basado en lotes con vencimiento
        }
      }));

      res.json({
        products: productsWithAlerts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener producto por ID
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          suppliers: {
            include: { 
              supplier: true 
            },
            orderBy: { isPreferred: 'desc' }
          },
          stockMovements: {
            include: { 
              user: { select: { firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
          },
          treatmentProducts: {
            include: { treatment: true }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json(product);
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear producto
  static async createProduct(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        sku,
        barcode,
        category,
        brand,
        costPrice,
        salePrice,
        minStock,
        unit,
        hasExpiration,
        suppliers
      } = req.body;

      // Verificar SKU único
      const existingSku = await prisma.product.findUnique({
        where: { sku }
      });

      if (existingSku) {
        return res.status(400).json({ error: 'El SKU ya existe' });
      }

      const product = await prisma.product.create({
        data: {
          name,
          description,
          sku,
          barcode,
          category,
          brand,
          costPrice: new Prisma.Decimal(costPrice),
          salePrice: new Prisma.Decimal(salePrice),
          minStock: Number(minStock),
          unit,
          hasExpiration: Boolean(hasExpiration),
          currentStock: 0 // Inicia en 0, se actualiza con compras
        }
      });

      // Agregar proveedores si fueron especificados
      if (suppliers && suppliers.length > 0) {
        await prisma.productSupplier.createMany({
          data: suppliers.map((supplier: any) => ({
            productId: product.id,
            supplierId: supplier.supplierId,
            supplierPrice: new Prisma.Decimal(supplier.price),
            isPreferred: supplier.isPreferred || false
          }))
        });
      }

      const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
          suppliers: {
            include: { supplier: true }
          }
        }
      });

      res.status(201).json(fullProduct);
    } catch (error) {
      console.error('Error creando producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar producto
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar que el producto existe
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Si se actualiza el SKU, verificar que sea único
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku: updateData.sku }
        });

        if (existingSku) {
          return res.status(400).json({ error: 'El SKU ya existe' });
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          costPrice: updateData.costPrice ? new Prisma.Decimal(updateData.costPrice) : undefined,
          salePrice: updateData.salePrice ? new Prisma.Decimal(updateData.salePrice) : undefined,
        },
        include: {
          suppliers: {
            include: { supplier: true }
          }
        }
      });

      res.json(product);
    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar producto (soft delete)
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Ajustar stock manualmente
  static async adjustStock(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, reason, expiryDate } = req.body;
      const userId = req.user.id;

      const product = await prisma.product.findUnique({
        where: { id }
      });

      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      // Crear transacción para actualizar stock y registrar movimiento
      await prisma.$transaction([
        // Actualizar stock del producto
        prisma.product.update({
          where: { id },
          data: {
            currentStock: {
              increment: Number(quantity)
            }
          }
        }),
        // Registrar movimiento de stock
        prisma.stockMovement.create({
          data: {
            productId: id,
            userId,
            type: 'AJUSTE',
            quantity: Number(quantity),
            reason: reason || 'Ajuste manual de stock',
            expiryDate: expiryDate ? new Date(expiryDate) : null
          }
        })
      ]);

      res.json({ message: 'Stock ajustado correctamente' });
    } catch (error) {
      console.error('Error ajustando stock:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener alertas de stock
  static async getStockAlerts(req: Request, res: Response) {
    try {
      // Productos con stock bajo
      const lowStockProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          currentStock: {
            lte: prisma.product.fields.minStock
          }
        },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          minStock: true,
          unit: true
        }
      });

      // Productos sin stock
      const outOfStockProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          currentStock: {
            lte: 0
          }
        },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          unit: true
        }
      });

      res.json({
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        summary: {
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length
        }
      });
    } catch (error) {
      console.error('Error obteniendo alertas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener categorías de productos
  static async getCategories(req: Request, res: Response) {
    try {
      const categories = await prisma.product.groupBy({
        by: ['category'],
        where: {
          isActive: true,
          category: {
            not: null
          }
        },
        _count: {
          category: true
        },
        orderBy: {
          category: 'asc'
        }
      });

      res.json(categories.map(cat => ({
        name: cat.category,
        count: cat._count.category
      })));
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
