// تعريف الأنواع وهياكل البيانات المستخدمة في خادم الباك إند

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  taxNumber?: string;
}

export interface StockMovement {
  id: string;
  type: 'in' | 'out';
  productId: string;
  productName: string;
  quantity: number;
  warehouseId: string;
  warehouseName: string;
  notes: string;
  timestamp: string;
  recordedBy: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  description: string;
  category: string;
  warehouseId?: string;
  supplierId?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  customerName: string;
  invoiceDate: string;
  status: 'paid' | 'partial' | 'refunded';
  items: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;
}

export interface ChartPoint {
  label: string;
  sales: number;
  invoices: number;
}

export interface StoreActivity {
  id: string;
  type: 'add_product' | 'add_invoice' | 'refund_invoice' | 'stock_update' | 'system';
  message: string;
  timestamp: string;
  meta?: string;
}
