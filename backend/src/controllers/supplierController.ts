import { Request, Response } from 'express';
import { prisma } from '../server';

export class SupplierController {
  // Listar proveedores
  static async getSuppliers(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '',
        active = 'true'
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where = {
        isActive: active === 'true',
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { cuit: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        })
      };

      const [suppliers, total] = await Promise.all([
        prisma.supplier.findMany({
          where,
          include: {
            products: {
              include: { product: true }
            },
            purchases: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: { 
                products: true,
                purchases: true 
              }
            }
          },
          skip,
          take: Number(limit),
          orderBy: { name: 'asc' }
        }),
        prisma.supplier.count({ where })
      ]);

      res.json({
        suppliers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo proveedores:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear proveedor
  static async createSupplier(req: Request, res: Response) {
    try {
      const supplierData = req.body;

      // Verificar CUIT único
      const existingCuit = await prisma.supplier.findUnique({
        where: { cuit: supplierData.cuit }
      });

      if (existingCuit) {
        return res.status(400).json({ error: 'El CUIT ya existe' });
      }

      const supplier = await prisma.supplier.create({
        data: supplierData
      });

      res.status(201).json(supplier);
    } catch (error) {
      console.error('Error creando proveedor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar proveedor
  static async updateSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const supplier = await prisma.supplier.update({
        where: { id },
        data: updateData
      });

      res.json(supplier);
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener productos de un proveedor
  static async getSupplierProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const products = await prisma.productSupplier.findMany({
        where: { supplierId: id },
        include: {
          product: true
        },
        orderBy: { isPreferred: 'desc' }
      });

      res.json(products);
    } catch (error) {
      console.error('Error obteniendo productos del proveedor:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
