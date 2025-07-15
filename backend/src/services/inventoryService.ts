import { ApiService } from './apiService';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  unit: string;
  hasExpiration: boolean;
  isActive: boolean;
  alerts?: {
    lowStock: boolean;
    noStock: boolean;
    nearExpiry: boolean;
  };
}

export interface Supplier {
  id: string;
  name: string;
  cuit: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  country: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface Purchase {
  id: string;
  supplierId: string;
  purchaseNumber: string;
  purchaseDate: Date;
  dueDate?: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: 'PENDIENTE' | 'RECIBIDA' | 'FACTURADA' | 'PAGADA' | 'CANCELADA';
  supplier: Supplier;
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  expiryDate?: Date;
  product: Product;
}

export interface StockMovement {
  id: string;
  productId: string;
  userId: string;
  type: 'COMPRA' | 'VENTA' | 'USO_TRATAMIENTO' | 'AJUSTE' | 'VENCIMIENTO' | 'DEVOLUCION';
  quantity: number;
  reason?: string;
  reference?: string;
  expiryDate?: Date;
  createdAt: Date;
  product: {
    name: string;
    sku: string;
    unit: string;
  };
  user: {
    firstName: string;
    lastName: string;
  };
}

class InventoryService {
  // PRODUCTOS
  async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
    expired?: boolean;
  }) {
    return ApiService.get('/products', { params });
  }

  async getProductById(id: string) {
    return ApiService.get(`/products/${id}`);
  }

  async createProduct(productData: Partial<Product>) {
    return ApiService.post('/products', productData);
  }

  async updateProduct(id: string, productData: Partial<Product>) {
    return ApiService.put(`/products/${id}`, productData);
  }

  async deleteProduct(id: string) {
    return ApiService.delete(`/products/${id}`);
  }

  async adjustStock(id: string, data: {
    quantity: number;
    reason?: string;
    expiryDate?: string;
  }) {
    return ApiService.post(`/products/${id}/adjust-stock`, data);
  }

  async getStockAlerts() {
    return ApiService.get('/products/alerts');
  }

  async getCategories() {
    return ApiService.get('/products/categories');
  }

  // PROVEEDORES
  async getSuppliers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }) {
    return ApiService.get('/suppliers', { params });
  }

  async createSupplier(supplierData: Partial<Supplier>) {
    return ApiService.post('/suppliers', supplierData);
  }

  async updateSupplier(id: string, supplierData: Partial<Supplier>) {
    return ApiService.put(`/suppliers/${id}`, supplierData);
  }

  async getSupplierProducts(id: string) {
    return ApiService.get(`/suppliers/${id}/products`);
  }

  // COMPRAS
  async getPurchases(params?: {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
  }) {
    return ApiService.get('/purchases', { params });
  }

  async createPurchase(purchaseData: {
    supplierId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      expiryDate?: string;
    }>;
    dueDate?: string;
    notes?: string;
  }) {
    return ApiService.post('/purchases', purchaseData);
  }

  async receivePurchase(id: string, receivedItems: Array<{
    itemId: string;
    quantityReceived: number;
  }>) {
    return ApiService.post(`/purchases/${id}/receive`, { receivedItems });
  }

  // MOVIMIENTOS DE STOCK
  async getStockMovements(params?: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return ApiService.get('/stock/movements', { params });
  }

  async useInTreatment(data: {
    productId: string;
    quantity: number;
    appointmentId?: string;
    notes?: string;
  }) {
    return ApiService.post('/stock/use-treatment', data);
  }

  async reportExpiry(data: {
    productId: string;
    quantity: number;
    reason?: string;
  }) {
    return ApiService.post('/stock/report-expiry', data);
  }
}

export default new InventoryService();
