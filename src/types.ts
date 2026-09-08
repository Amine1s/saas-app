// تعريف الأنواع وهياكل البيانات المستخدمة في التطبيق

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface UserSession {
  id?: string;
  username: string;
  name: string;
  role: UserRole;
  warehouseId?: string;
  warehouseName?: string;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  warehouseId?: string; // المستودع المعين لمدير المستودع أو الفرع للكاشير
  warehouseName?: string;
  createdAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number; // بالوحدات القصوى مثلاً
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
  type: 'in' | 'out'; // إدخال (توريد) أو إخراج (صرف/بيع)
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
  warehouseId?: string; // المستودع التابع له المنتج
  supplierId?: string; // المورد المعتمد للمنتج
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
  type: 'add_product' | 'add_invoice' | 'refund_invoice' | 'stock_update' | 'system' | 'edit_product' | 'delete_product' | 'add_category' | 'edit_category' | 'delete_category';
  message: string;
  timestamp: string;
  meta?: string;
  entityType?: 'product' | 'category' | 'invoice' | 'user' | 'warehouse' | 'general';
  action?: 'create' | 'update' | 'delete' | 'other';
  performedBy?: string;
  performerRole?: string;
  itemName?: string;
}


