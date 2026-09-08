import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { Product, Invoice, StoreActivity, ChartPoint, Warehouse, Supplier, Customer, Category, StockMovement, AppUser } from './src/types';
import {
  getFirestoreDb,
  fetchCollection,
  setFirestoreDoc,
  deleteFirestoreDoc,
  clearFirestoreCollection,
  seedInitialFirestoreData,
} from './src/lib/firestoreDb';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'saas_inventory_jwt_secret_2026_x89q3m4';

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(plainPassword: string, storedPasswordHashOrPlain?: string): boolean {
  if (!storedPasswordHashOrPlain) return false;
  if (storedPasswordHashOrPlain.startsWith('$2a$') || storedPasswordHashOrPlain.startsWith('$2b$') || storedPasswordHashOrPlain.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(plainPassword, storedPasswordHashOrPlain);
    } catch {
      return false;
    }
  }
  return plainPassword === storedPasswordHashOrPlain;
}

// حماية مسار الدخول من هجمات التخمين العنيف (Rate Limiting)
const loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

const loginRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = String(req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (attempt && attempt.blockedUntil && attempt.blockedUntil > now) {
    const remainingMinutes = Math.ceil((attempt.blockedUntil - now) / 60000);
    res.status(429).json({
      success: false,
      message: `تم قفل تسجيل الدخول مؤقتاً بسبب تكرار المحاولات غير الصحيحة. يرجى المحاولة بعد ${remainingMinutes} دقيقة.`
    });
    return;
  }

  next();
};

function recordFailedLogin(ip: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastAttempt: now };
  attempt.count += 1;
  attempt.lastAttempt = now;
  if (attempt.count >= 5) {
    attempt.blockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(ip, attempt);
}

function recordSuccessfulLogin(ip: string) {
  loginAttempts.delete(ip);
}

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'manager' | 'cashier';
    warehouseId?: string;
  };
}

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'غير مصرح: يلزم تسجيل الدخول للمتابعة.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'رمز الدخول (Token) غير صالح أو منتهي الصلاحية.' });
  }
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  requireAuth(req, res, () => {
    const user = (req as AuthenticatedRequest).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'صلاحية غير كافية: هذا الإجراء مقتصر على مدير النظام فقط.' });
      return;
    }
    next();
  });
};

// =========================================================================
// بيانات المخزن والذاكرة الحية (In-Memory Database State)
// =========================================================================

let users: AppUser[] = [
  {
    id: 'usr-admin',
    username: 'admin',
    name: 'أمين محمد',
    role: 'admin',
    isActive: true,
    password: 'admin@123',
    createdAt: '2026-01-01'
  },
  {
    id: 'usr-manager',
    username: 'manager',
    name: 'خالد أحمد',
    role: 'manager',
    isActive: true,
    password: 'manager@123',
    warehouseId: 'WH-01',
    warehouseName: 'المستودع الرئيسي - الرياض',
    createdAt: '2026-01-15'
  },
  {
    id: 'usr-cashier',
    username: 'cashier',
    name: 'فاطمة علي',
    role: 'cashier',
    isActive: true,
    password: 'cashier@123',
    warehouseId: 'WH-01',
    warehouseName: 'المستودع الرئيسي - الرياض',
    createdAt: '2026-02-01'
  }
];

let warehouses: Warehouse[] = [
  { id: 'WH-01', name: 'المستودع الرئيسي - الرياض', location: 'الرياض - حي الملز', capacity: 5000, description: 'مستودع السلع الأساسية والمكيفة' },
  { id: 'WH-02', name: 'مستودع المنطقة الغربية - جدة', location: 'جدة - المدينة الصناعية', capacity: 3000, description: 'مستودع المنتجات المستوردة والأحذية' }
];

let suppliers: Supplier[] = [
  { id: 'SUP-01', name: 'شركة المنسوجات الموحدة', company: 'المصنع السعودي للملابس', phone: '0501112222', email: 'info@unifiedtextiles.com' },
  { id: 'SUP-02', name: 'مؤسسة خطوات التقنية', company: 'شركة الاستيراد العالمية', phone: '0503334444', email: 'sales@techsteps.sa' }
];

let customers: Customer[] = [
  { id: 'CUST-01', name: 'أحمد مصطفى', phone: '0551112222', email: 'ahmed@gmail.com', taxNumber: '300012345600003' },
  { id: 'CUST-02', name: 'سارة عبد الرحمن', phone: '0553334444', email: 'sara@outlook.com', taxNumber: '' },
  { id: 'CUST-03', name: 'شركة الأمل للتجارة', phone: '0555556666', email: 'contact@alamal.com', taxNumber: '310987654300003' }
];

let categories: Category[] = [
  { id: 'CAT-01', name: 'رجالي', description: 'ملابس وأحذية وإكسسوارات رجالية تمتاز بالجودة العالية' },
  { id: 'CAT-02', name: 'نسائي', description: 'ملابس فخمة وفساتين سهرة وتصاميم عصرية للمناسبات' },
  { id: 'CAT-03', name: 'أحذية', description: 'أحذية رياضية ورسمية مريحة ومقاومة للماء' }
];

let stockMovements: StockMovement[] = [
  { id: 'MOV-01', type: 'in', productId: '1', productName: 'قميص بولو Ralph Lauren', quantity: 45, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'توريد دفعة إنتاج جديدة من المصنع', timestamp: '2026-06-10 09:00', recordedBy: 'خالد أحمد (مدير المستودع)' },
  { id: 'MOV-02', type: 'in', productId: '2', productName: 'بنطال جينز Levi\'s 511', quantity: 15, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'توريد ملابس من المورد الشريك', timestamp: '2026-06-10 10:15', recordedBy: 'خالد أحمد (مدير المستودع)' },
  { id: 'MOV-03', type: 'out', productId: '2', productName: 'بنطال جينز Levi\'s 511', quantity: 11, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'تلف شحنة أو تحويل فرعي', timestamp: '2026-06-11 11:30', recordedBy: 'خالد أحمد (مدير المستودع)' }
];

let products: Product[] = [
  { id: '1', name: 'قميص بولو Ralph Lauren', sku: 'PROD-001', price: 150.00, quantity: 45, description: 'رجالي | مقاس XL | اللون أزرق', category: 'رجالي', warehouseId: 'WH-01', supplierId: 'SUP-01' },
  { id: '2', name: 'بنطال جينز Levi\'s 511', sku: 'PROD-002', price: 220.00, quantity: 4, description: 'رجالي | مقاس 32 | اللون أسود', category: 'رجالي', warehouseId: 'WH-01', supplierId: 'SUP-01' },
  { id: '3', name: 'فستان شانيل Chanel حرير', sku: 'PROD-003', price: 450.00, quantity: 18, description: 'نسائي | مقاس M | اللون أحمر', category: 'نسائي', warehouseId: 'WH-02', supplierId: 'SUP-01' },
  { id: '4', name: 'حذاء نايكي Nike Air Max', sku: 'PROD-004', price: 300.00, quantity: 7, description: 'أحذية | مقاس 42 | اللون أبيض', category: 'أحذية', warehouseId: 'WH-02', supplierId: 'SUP-02' }
];

let invoices: Invoice[] = [
  {
    id: 'INV-2026-01',
    customerName: 'أحمد مصطفى',
    invoiceDate: '2026-06-10',
    status: 'paid',
    items: [
      { productId: '1', name: 'قميص بولو Ralph Lauren', quantity: 1, price: 150.00 },
      { productId: '2', name: 'بنطال جينز Levi\'s 511', quantity: 1, price: 220.00 }
    ],
    totalAmount: 370.00,
    amountPaid: 425.50,
    paymentMethod: 'بطاقة ائتمان / مدى'
  },
  {
    id: 'INV-2026-02',
    customerName: 'سارة عبد الرحمن',
    invoiceDate: '2026-06-10',
    status: 'paid',
    items: [
      { productId: '3', name: 'فستان شانيل Chanel حرير', quantity: 1, price: 450.00 }
    ],
    totalAmount: 450.00,
    amountPaid: 517.50,
    paymentMethod: 'نقداً (كاش)'
  }
];

let activities: StoreActivity[] = [
  { id: '1', type: 'add_invoice', message: 'إصدار فاتورة مبيعات رقم INV-2026-02 للمشترية سارة عبد الرحمن بقيمة 517.50 ر.س شاملة الضريبة.', timestamp: 'قبل ساعة', meta: 'INV-2026-02' },
  { id: '2', type: 'add_product', message: 'إضافة صنف منتج جديد "حذاء نايكي Nike Air Max" بالرمز SKU الحالي PROD-004 ومخزون 7 قطع.', timestamp: 'قبل 4 ساعات', meta: 'PROD-004' },
  { id: '3', type: 'stock_update', message: 'تحديث مخزون "بنطال جينز Levi\'s 511" يدوياً إلى 4 قطع.', timestamp: 'قبل يوم واحد', meta: 'PROD-002' },
  { id: '4', type: 'add_invoice', message: 'إصدار فاتورة مبيعات رقم INV-2026-01 للعميل أحمد مصطفى بمبلغ 425.50 ر.س.', timestamp: 'قبل يومين', meta: 'INV-2026-01' },
  { id: '5', type: 'system', message: 'تم إقران مستودع المتاجر السحابية وإدارة الأرصدة والفوترة بنجاح.', timestamp: 'منذ أسبوع', meta: 'SYSTEM-START' }
];

let weeklyChartPoints: ChartPoint[] = [
  { label: 'السبت', sales: 950, invoices: 3 },
  { label: 'الأحد', sales: 1320, invoices: 5 },
  { label: 'الأثنين', sales: 1850, invoices: 8 },
  { label: 'الثلاثاء', sales: 1100, invoices: 4 },
  { label: 'الأربعاء', sales: 2400, invoices: 11 },
  { label: 'الخميس', sales: 3100, invoices: 14 },
  { label: 'الجمعة', sales: 2150, invoices: 9 },
];

let monthlyChartPoints: ChartPoint[] = [
  { label: 'يناير', sales: 18500, invoices: 72 },
  { label: 'فبراير', sales: 21400, invoices: 94 },
  { label: 'مارس', sales: 29800, invoices: 115 },
  { label: 'أبريل', sales: 24200, invoices: 88 },
  { label: 'مايو', sales: 34900, invoices: 142 },
  { label: 'يونيو', sales: 28800, invoices: 120 },
  { label: 'يوليو', sales: 0, invoices: 0 },
  { label: 'أغسطس', sales: 0, invoices: 0 },
  { label: 'سبتمبر', sales: 0, invoices: 0 },
  { label: 'أكتوبر', sales: 0, invoices: 0 },
  { label: 'نوفمبر', sales: 0, invoices: 0 },
  { label: 'ديسمبر', sales: 0, invoices: 0 },
];

function updateChartStatistics(amount: number, countChange: number, isRefund: boolean = false) {
  const currentDay = new Date().getDay();
  const dayNames = ['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const todayLabel = dayNames[currentDay];

  const currentMonth = new Date().getMonth();
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const thisMonthLabel = monthNames[currentMonth];

  const dayIndex = weeklyChartPoints.findIndex(p => p.label === todayLabel);
  if (dayIndex !== -1) {
    if (isRefund) {
      weeklyChartPoints[dayIndex].sales = Math.max(0, weeklyChartPoints[dayIndex].sales - amount);
      weeklyChartPoints[dayIndex].invoices = Math.max(0, weeklyChartPoints[dayIndex].invoices - countChange);
    } else {
      weeklyChartPoints[dayIndex].sales += amount;
      weeklyChartPoints[dayIndex].invoices += countChange;
    }
  }

  const monthIndex = monthlyChartPoints.findIndex(p => p.label === thisMonthLabel);
  if (monthIndex !== -1) {
    if (isRefund) {
      monthlyChartPoints[monthIndex].sales = Math.max(0, monthlyChartPoints[monthIndex].sales - amount);
      monthlyChartPoints[monthIndex].invoices = Math.max(0, monthlyChartPoints[monthIndex].invoices - countChange);
    } else {
      monthlyChartPoints[monthIndex].sales += amount;
      monthlyChartPoints[monthIndex].invoices += countChange;
    }
  }
}

// =========================================================================
// تشغيل الخادم وتحديد مسارات الـ API
// =========================================================================

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// مزامنة البيانات الأولية مع Firestore عند بدء التشغيل
async function syncFromFirestore() {
  const db = getFirestoreDb();
  if (!db) {
    console.log('[Database] Running with In-Memory store (Firestore credentials not set).');
    return;
  }
  try {
    await seedInitialFirestoreData({
      products,
      invoices,
      activities,
      warehouses,
      suppliers,
      customers,
      categories,
      stockMovements
    });
    const [p, inv, w, sup, cust, cat, mov, act, u] = await Promise.all([
      fetchCollection<Product>('products'),
      fetchCollection<Invoice>('invoices'),
      fetchCollection<Warehouse>('warehouses'),
      fetchCollection<Supplier>('suppliers'),
      fetchCollection<Customer>('customers'),
      fetchCollection<Category>('categories'),
      fetchCollection<StockMovement>('stock_movements'),
      fetchCollection<StoreActivity>('activities'),
      fetchCollection<AppUser>('users')
    ]);
    if (p.length) products = p;
    if (inv.length) invoices = inv;
    if (w.length) warehouses = w;
    if (sup.length) suppliers = sup;
    if (cust.length) customers = cust;
    if (cat.length) categories = cat;
    if (mov.length) stockMovements = mov;
    if (act.length) activities = act;
    if (u.length) {
      users = u;
      // ترقية أي كلمات مرور قديمة غير مشفرة تلقائياً إلى هاش bcrypt
      users.forEach(user => {
        if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          user.password = hashPassword(user.password);
          setFirestoreDoc('users', user.id, user);
        }
      });
    } else {
      // تشفير كلمات مرور المستخدمين الافتراضيين وحفظها في Firestore
      users.forEach(user => {
        if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
          user.password = hashPassword(user.password);
        }
        setFirestoreDoc('users', user.id, user);
      });
    }
    console.log(`[Firestore] Successfully connected and synced: ${products.length} products, ${invoices.length} invoices, ${users.length} users.`);
  } catch (err) {
    console.warn('[Firestore] Sync warning, proceeding with in-memory state:', err);
  }
}

async function startServer() {
  await syncFromFirestore();

  // فحص حالة السيرفر وقاعدة البيانات
  app.get('/api/health', (req, res) => {
    const db = getFirestoreDb();
    res.json({
      status: 'ok',
      database: db ? 'firestore' : 'in-memory',
      firestoreConnected: !!db,
      productsCount: products.length,
      invoicesCount: invoices.length,
      timestamp: new Date().toISOString()
    });
  });

  // -------------------------------------------------------------
  // 1. مسارات المنتجات والأصناف (/api/products)
  // -------------------------------------------------------------

  app.get('/api/products', (req, res) => {
    res.json({ success: true, products });
  });

  app.post('/api/products', (req, res) => {
    const { name, sku, price, quantity, description, category, warehouseId, supplierId } = req.body;

    if (!name || !sku || price === undefined || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'جميع الحقول الأساسية مطلوبة.'
      });
      return;
    }

    if (products.some(p => p.sku.toUpperCase() === sku.trim().toUpperCase())) {
      res.status(409).json({
        success: false,
        message: 'خطأ: رمز SKU مسجل مسبقاً لصنف آخر.'
      });
      return;
    }

    const newProduct: Product = {
      id: (products.length + 1).toString(),
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      price: Number(price),
      quantity: Number(quantity),
      description: description?.trim() || 'لا يوجد وصف تفصيلي.',
      category: category || 'رجالي',
      warehouseId: warehouseId || 'WH-01',
      supplierId: supplierId || 'SUP-01'
    };

    products = [newProduct, ...products];
    setFirestoreDoc('products', newProduct.id, newProduct);

    if (newProduct.quantity > 0) {
      const wh = warehouses.find(w => w.id === newProduct.warehouseId);
      const whName = wh ? wh.name : 'المستودع الرئيسي';
      const newMov: StockMovement = {
        id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        type: 'in',
        productId: newProduct.id,
        productName: newProduct.name,
        quantity: newProduct.quantity,
        warehouseId: newProduct.warehouseId || 'WH-01',
        warehouseName: whName,
        notes: 'الرصيد الابتدائي الافتتاحي للصنف الجديد',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        recordedBy: 'مدير النظام'
      };
      stockMovements = [newMov, ...stockMovements];
      setFirestoreDoc('stock_movements', newMov.id, newMov);
    }

    res.status(201).json({ success: true, product: newProduct });
  });

  app.patch('/api/products/:id/stock', (req, res) => {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || isNaN(quantity) || Number(quantity) < 0) {
      res.status(400).json({
        success: false,
        message: 'الرجاء توفير كمية صحيحة للمنتج.'
      });
      return;
    }

    const prodIndex = products.findIndex(p => p.id === id);
    if (prodIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'المنتج غير موجود.'
      });
      return;
    }

    products[prodIndex].quantity = Number(quantity);
    setFirestoreDoc('products', products[prodIndex].id, products[prodIndex]);
    res.json({ success: true, product: products[prodIndex] });
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, sku, price, quantity, description, category, warehouseId, supplierId } = req.body;

    const prodIndex = products.findIndex(p => p.id === id);
    if (prodIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'المنتج المطلوب تعديله غير موجود.'
      });
      return;
    }

    if (!name || !sku || price === undefined || quantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'جميع الحقول الأساسية مطلوبة (الاسم، SKU، السعر، والكمية).'
      });
      return;
    }

    const trimmedSku = sku.trim().toUpperCase();
    if (products.some(p => p.id !== id && p.sku.toUpperCase() === trimmedSku)) {
      res.status(409).json({
        success: false,
        message: 'خطأ: رمز SKU هذا مستخدم مسبقاً لصنف آخر.'
      });
      return;
    }

    const oldProduct = products[prodIndex];
    const newQty = Number(quantity);
    const qtyDiff = newQty - oldProduct.quantity;

    const updatedProduct: Product = {
      ...oldProduct,
      name: name.trim(),
      sku: trimmedSku,
      price: Number(price),
      quantity: newQty,
      description: description !== undefined ? description.trim() : oldProduct.description,
      category: category || oldProduct.category,
      warehouseId: warehouseId || oldProduct.warehouseId,
      supplierId: supplierId || oldProduct.supplierId
    };

    products[prodIndex] = updatedProduct;
    setFirestoreDoc('products', updatedProduct.id, updatedProduct);

    if (qtyDiff !== 0) {
      const wh = warehouses.find(w => w.id === updatedProduct.warehouseId);
      const whName = wh ? wh.name : 'المستودع الرئيسي';
      const adjustmentMov: StockMovement = {
        id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        type: qtyDiff > 0 ? 'in' : 'out',
        productId: updatedProduct.id,
        productName: updatedProduct.name,
        quantity: Math.abs(qtyDiff),
        warehouseId: updatedProduct.warehouseId || 'WH-01',
        warehouseName: whName,
        notes: `تسوية كمية يدوية بعد تعديل بيانات الصنف (الفرق: ${qtyDiff > 0 ? '+' : ''}${qtyDiff})`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        recordedBy: 'مدير النظام'
      };
      stockMovements = [adjustmentMov, ...stockMovements];
      setFirestoreDoc('stock_movements', adjustmentMov.id, adjustmentMov);
    }

    res.json({ success: true, product: updatedProduct });
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'المنتج المطلوب حذفه غير موجود.' });
      return;
    }
    const [deleted] = products.splice(index, 1);
    deleteFirestoreDoc('products', id);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `تم حذف صنف البضاعة "${deleted.name}" (SKU: ${deleted.sku}) نهائياً من النظام.`,
      timestamp: formattedTime,
      meta: deleted.id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    res.json({ success: true, message: `تم حذف المنتج "${deleted.name}" بنجاح.` });
  });

  // -------------------------------------------------------------
  // 2. مسارات الفواتير والمبيعات (/api/invoices)
  // -------------------------------------------------------------

  app.get('/api/invoices', (req, res) => {
    res.json({ success: true, invoices });
  });

  app.post('/api/invoices', (req, res) => {
    const { customerName, status, items, totalAmount, amountPaid, paymentMethod } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'بيانات الفاتورة والعميل والمنتجات المشتراة مطلوبة.'
      });
      return;
    }

    let stockError = false;
    let errMessage = '';
    
    for (const item of items) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod || prod.quantity < item.quantity) {
        errMessage = `المخزون غير كافٍ للمنتج "${prod?.name || 'مجهول'}". المتوفر هو: ${prod?.quantity || 0}`;
        stockError = true;
        break;
      }
    }

    if (stockError) {
      res.status(400).json({ success: false, message: errMessage });
      return;
    }

    items.forEach(item => {
      const prodIndex = products.findIndex(p => p.id === item.productId);
      if (prodIndex !== -1) {
        const prod = products[prodIndex];
        prod.quantity = Math.max(0, prod.quantity - item.quantity);

        const wh = warehouses.find(w => w.id === prod.warehouseId);
        const whName = wh ? wh.name : 'المستودع الرئيسي';
        const newMov: StockMovement = {
          id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          type: 'out',
          productId: prod.id,
          productName: prod.name,
          quantity: item.quantity,
          warehouseId: prod.warehouseId || 'WH-01',
          warehouseName: whName,
          notes: `صرف مبيعات للفاتورة INV-2026-0${invoices.length + 1}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          recordedBy: 'محاسب النظام'
        };
        stockMovements = [newMov, ...stockMovements];
      }
    });

    const newInvoice = {
      id: `INV-2026-0${invoices.length + 1}`,
      customerName: customerName.trim(),
      invoiceDate: new Date().toISOString().split('T')[0],
      status: status || 'paid',
      items,
      totalAmount: Number(totalAmount),
      amountPaid: Number(amountPaid),
      paymentMethod: paymentMethod || 'بطاقة ائتمان / مدى'
    };

    invoices = [newInvoice, ...invoices];
    setFirestoreDoc('invoices', newInvoice.id, newInvoice);

    // تحديث كميات المنتجات المخفضة في Firestore
    items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        setFirestoreDoc('products', p.id, p);
      }
    });

    if (newInvoice.status !== 'refunded') {
      updateChartStatistics(Number((newInvoice.totalAmount * 1.15).toFixed(2)), 1, false);
    }

    res.status(201).json({ success: true, invoice: newInvoice });
  });

  app.patch('/api/invoices/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, amountPaid } = req.body;

    const invoiceIndex = invoices.findIndex(inv => inv.id === id);
    if (invoiceIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'الفاتورة غير موجودة.'
      });
      return;
    }

    const previousInvoice = invoices[invoiceIndex];

    if (previousInvoice.status !== 'refunded' && status === 'refunded') {
      updateChartStatistics(Number((previousInvoice.totalAmount * 1.15).toFixed(2)), 1, true);
    }

    invoices[invoiceIndex] = {
      ...invoices[invoiceIndex],
      status: status,
      amountPaid: amountPaid !== undefined ? Number(amountPaid) : invoices[invoiceIndex].amountPaid
    };

    setFirestoreDoc('invoices', invoices[invoiceIndex].id, invoices[invoiceIndex]);

    res.json({ success: true, invoice: invoices[invoiceIndex] });
  });

  // -------------------------------------------------------------
  // 3. مسارات سجل النشاطات (/api/activities)
  // -------------------------------------------------------------

  app.get('/api/activities', (req, res) => {
    res.json({ success: true, activities });
  });

  app.post('/api/activities', (req, res) => {
    const { type, message, meta, entityType, action, performedBy, performerRole, itemName } = req.body;

    if (!type || !message) {
      res.status(400).json({
        success: false,
        message: 'الرجاء توفير تفاصيل النشاط.'
      });
      return;
    }

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity: StoreActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: formattedTime,
      meta,
      entityType,
      action,
      performedBy,
      performerRole,
      itemName
    };

    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);
    res.status(201).json({ success: true, activity: newActivity });
  });

  app.delete('/api/activities/:id', (req, res) => {
    const { id } = req.params;
    const index = activities.findIndex(a => a.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'سجل العملية غير موجود.' });
      return;
    }
    activities.splice(index, 1);
    deleteFirestoreDoc('activities', id);
    res.json({ success: true, message: 'تم حذف سجل العملية بنجاح.' });
  });

  app.delete('/api/activities', async (req, res) => {
    activities = [];
    await clearFirestoreCollection('activities');
    res.json({ success: true, message: 'تم مسح كامل سجل العمليات والرقابة الفنية بنجاح.' });
  });

  // -------------------------------------------------------------
  // 4. مسارات الرسوم والبيانات الإحصائية (/api/charts)
  // -------------------------------------------------------------

  app.get('/api/charts', (req, res) => {
    res.json({
      success: true,
      weekly: weeklyChartPoints,
      monthly: monthlyChartPoints
    });
  });

  // -------------------------------------------------------------
  // 5. مسارات المستودعات والمخازن (/api/warehouses)
  // -------------------------------------------------------------

  app.get('/api/warehouses', (req, res) => {
    res.json({ success: true, warehouses });
  });

  app.post('/api/warehouses', (req, res) => {
    const { name, location, capacity, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'اسم المستودع مطلوب.' });
      return;
    }
    const newWH: Warehouse = {
      id: `WH-${(warehouses.length + 1).toString().padStart(2, '0')}`,
      name: name.trim(),
      location: location?.trim() || 'غير محدد',
      capacity: Number(capacity) || 1000,
      description: description?.trim() || ''
    };
    warehouses.push(newWH);
    setFirestoreDoc('warehouses', newWH.id, newWH);
    res.status(201).json({ success: true, warehouse: newWH });
  });

  app.delete('/api/warehouses/:id', (req, res) => {
    const { id } = req.params;
    const index = warehouses.findIndex(w => w.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'المستودع المطلوب حذفه غير موجود.' });
      return;
    }
    const [deleted] = warehouses.splice(index, 1);
    deleteFirestoreDoc('warehouses', id);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `تم حذف المستودع "${deleted.name}" من النظام بواسطة مدير النظام.`,
      timestamp: formattedTime,
      meta: deleted.id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    res.json({ success: true, message: `تم حذف المستودع "${deleted.name}" بنجاح.` });
  });

  app.delete('/api/warehouses', async (req, res) => {
    warehouses = [];
    await clearFirestoreCollection('warehouses');

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `قام مدير النظام بمسح وحذف كافة المستودعات دفعة واحدة.`,
      timestamp: formattedTime
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    res.json({ success: true, message: 'تم مسح وحذف كافة المستودعات بنجاح.' });
  });

  // -------------------------------------------------------------
  // 6. مسارات الموردين مع التعديل والجلب الفردي (/api/suppliers)
  // -------------------------------------------------------------

  app.get('/api/suppliers', (req, res) => {
    res.json({ success: true, suppliers });
  });

  app.get('/api/suppliers/:id', (req, res) => {
    const { id } = req.params;
    const sup = suppliers.find(s => s.id === id);
    if (!sup) {
      res.status(404).json({ success: false, message: 'المورد المطلوب غير موجود.' });
      return;
    }
    res.json({ success: true, supplier: sup });
  });

  app.post('/api/suppliers', (req, res) => {
    const { name, company, phone, email } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'اسم المورد مطلوب.' });
      return;
    }
    const newSupplier: Supplier = {
      id: `SUP-${(suppliers.length + 1).toString().padStart(2, '0')}`,
      name: name.trim(),
      company: company?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || ''
    };
    suppliers.push(newSupplier);
    setFirestoreDoc('suppliers', newSupplier.id, newSupplier);
    res.status(201).json({ success: true, supplier: newSupplier });
  });

  const updateSupplierHandler = (req: any, res: any) => {
    const { id } = req.params;
    const { name, company, phone, email } = req.body;

    const supIndex = suppliers.findIndex(s => s.id === id);
    if (supIndex === -1) {
      res.status(404).json({ success: false, message: 'المورد المطلوب تعديله غير موجود.' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'اسم المورد مطلوب.' });
      return;
    }

    const updatedSupplier: Supplier = {
      ...suppliers[supIndex],
      name: name.trim(),
      company: company !== undefined ? company.trim() : suppliers[supIndex].company,
      phone: phone !== undefined ? phone.trim() : suppliers[supIndex].phone,
      email: email !== undefined ? email.trim() : suppliers[supIndex].email
    };

    suppliers[supIndex] = updatedSupplier;
    setFirestoreDoc('suppliers', updatedSupplier.id, updatedSupplier);
    res.json({ success: true, supplier: updatedSupplier });
  };

  app.put('/api/suppliers/:id', updateSupplierHandler);
  app.post('/api/suppliers/:id', updateSupplierHandler);

  // -------------------------------------------------------------
  // 7. مسارات العملاء التجاريين والأفراد (/api/customers)
  // -------------------------------------------------------------

  app.get('/api/customers', (req, res) => {
    res.json({ success: true, customers });
  });

  app.get('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const cust = customers.find(c => c.id === id);
    if (!cust) {
      res.status(404).json({ success: false, message: 'العميل المطلوب غير موجود.' });
      return;
    }
    res.json({ success: true, customer: cust });
  });

  app.post('/api/customers', (req, res) => {
    const { name, phone, email, taxNumber } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'اسم العميل مطلوب.' });
      return;
    }
    const newCustomer: Customer = {
      id: `CUST-${(customers.length + 1).toString().padStart(2, '0')}`,
      name: name.trim(),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      taxNumber: taxNumber?.trim() || ''
    };
    customers.push(newCustomer);
    setFirestoreDoc('customers', newCustomer.id, newCustomer);
    res.status(201).json({ success: true, customer: newCustomer });
  });

  const updateCustomerHandler = (req: any, res: any) => {
    const { id } = req.params;
    const { name, phone, email, taxNumber } = req.body;

    const custIndex = customers.findIndex(c => c.id === id);
    if (custIndex === -1) {
      res.status(404).json({ success: false, message: 'العميل المطلوب تعديله غير موجود.' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'اسم العميل مطلوب.' });
      return;
    }

    const updatedCustomer: Customer = {
      ...customers[custIndex],
      name: name.trim(),
      phone: phone !== undefined ? phone.trim() : customers[custIndex].phone,
      email: email !== undefined ? email.trim() : customers[custIndex].email,
      taxNumber: taxNumber !== undefined ? taxNumber.trim() : customers[custIndex].taxNumber
    };

    customers[custIndex] = updatedCustomer;
    setFirestoreDoc('customers', updatedCustomer.id, updatedCustomer);
    res.json({ success: true, customer: updatedCustomer });
  };

  app.put('/api/customers/:id', updateCustomerHandler);
  app.post('/api/customers/:id', updateCustomerHandler);

  // -------------------------------------------------------------
  // 8. مسارات فئات وتصنيفات السلع (/api/categories)
  // -------------------------------------------------------------

  app.get('/api/categories', (req, res) => {
    res.json({ success: true, categories });
  });

  app.post('/api/categories', (req, res) => {
    const userRole = (req.headers['x-user-role'] as string) || req.body?.userRole;
    if (userRole === 'cashier') {
      res.status(403).json({ success: false, message: 'عفواً، لا يملك حساب الكاشير صلاحية إنشاء تصنيفات جديدة.' });
      return;
    }
    const { name, description } = req.body;
    if (!name) {
      res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب.' });
      return;
    }
    const newCat: Category = {
      id: `CAT-${(categories.length + 1).toString().padStart(2, '0')}`,
      name: name.trim(),
      description: description?.trim() || ''
    };
    categories.push(newCat);
    setFirestoreDoc('categories', newCat.id, newCat);
    res.status(201).json({ success: true, category: newCat });
  });

  app.put('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const catIndex = categories.findIndex(c => c.id === id);
    if (catIndex === -1) {
      res.status(404).json({ success: false, message: 'التصنيف غير موجود.' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'اسم التصنيف مطلوب.' });
      return;
    }

    const oldName = categories[catIndex].name;
    const newName = name.trim();

    categories[catIndex] = {
      ...categories[catIndex],
      name: newName,
      description: description !== undefined ? description.trim() : categories[catIndex].description
    };

    if (oldName !== newName) {
      products = products.map(p => p.category === oldName ? { ...p, category: newName } : p);
    }

    setFirestoreDoc('categories', categories[catIndex].id, categories[catIndex]);

    res.json({ success: true, category: categories[catIndex] });
  });

  app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const catIndex = categories.findIndex(c => c.id === id);
    if (catIndex === -1) {
      res.status(404).json({ success: false, message: 'التصنيف المطلوب حذفه غير موجود.' });
      return;
    }
    const [deleted] = categories.splice(catIndex, 1);
    deleteFirestoreDoc('categories', id);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `تم حذف التصنيف "${deleted.name}" من دليل الأصناف.`,
      timestamp: formattedTime,
      meta: deleted.id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    res.json({ success: true, message: `تم حذف التصنيف "${deleted.name}" بنجاح.` });
  });

  // -------------------------------------------------------------
  // 9. مسارات حركات المخزون والإدخال والإخراج (/api/stock-movements)
  // -------------------------------------------------------------

  app.get('/api/stock-movements', (req, res) => {
    res.json({ success: true, stockMovements });
  });

  app.post('/api/stock-movements', (req, res) => {
    const { type, productId, quantity, warehouseId, notes, recordedBy } = req.body;
    if (!type || !productId || quantity === undefined || !warehouseId) {
      res.status(400).json({ success: false, message: 'معطيات حركة المخزون ناقصة.' });
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (!prod) {
      res.status(404).json({ success: false, message: 'المنتج غير موجود.' });
      return;
    }

    const wh = warehouses.find(w => w.id === warehouseId);
    if (!wh) {
      res.status(404).json({ success: false, message: 'المستودع غير موجود.' });
      return;
    }

    const qtyNum = Number(quantity);
    if (type === 'out' && prod.quantity < qtyNum) {
      res.status(400).json({ success: false, message: 'الكمية المطلوبة للصرف غير متوفرة بالكامل بالمخزن.' });
      return;
    }

    if (type === 'in') {
      prod.quantity += qtyNum;
    } else {
      prod.quantity -= qtyNum;
    }

    const newMov: StockMovement = {
      id: `MOV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      type,
      productId,
      productName: prod.name,
      quantity: qtyNum,
      warehouseId,
      warehouseName: wh.name,
      notes: notes || '',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedBy: recordedBy || 'مدير النظام'
    };

    stockMovements = [newMov, ...stockMovements];
    setFirestoreDoc('stock_movements', newMov.id, newMov);
    setFirestoreDoc('products', prod.id, prod);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const actMsg = type === 'in' 
      ? `توريد شحنة منتج "${prod.name}" بمقدار ${qtyNum} وحدة إلى "${wh.name}".`
      : `صرف/إخراج منتج "${prod.name}" بمقدار ${qtyNum} وحدة من "${wh.name}".`;
    
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: actMsg,
      timestamp: formattedTime,
      meta: newMov.id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    res.status(201).json({ success: true, movement: newMov, product: prod });
  });

  app.delete('/api/stock-movements/:id', (req, res) => {
    const { id } = req.params;
    const index = stockMovements.findIndex(m => m.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'حركة المخزون غير موجودة.' });
      return;
    }
    stockMovements.splice(index, 1);
    deleteFirestoreDoc('stock_movements', id);
    res.json({ success: true, message: 'تم حذف حركة المخزون بنجاح.' });
  });

  app.delete('/api/stock-movements', async (req, res) => {
    stockMovements = [];
    await clearFirestoreCollection('stock_movements');
    res.json({ success: true, message: 'تم مسح كامل سجل حركات المخزون بنجاح.' });
  });

  // -------------------------------------------------------------
  // 10. مسارات إدارة المستخدمين والصلاحيات وحظر الحسابات (/api/users)
  // -------------------------------------------------------------

  app.get('/api/users', requireAdmin, (req, res) => {
    // إخفاء كلمات المرور المشفرة من قائمة الإرجاع لحماية الخصوصية
    const sanitizedUsers = users.map(({ password, ...u }) => ({ ...u, password: '' }));
    res.json({ success: true, users: sanitizedUsers });
  });

  app.post('/api/users', requireAdmin, (req, res) => {
    const { username, password, name, role, warehouseId, isActive } = req.body;

    if (!username || !password || !name || !role) {
      res.status(400).json({ success: false, message: 'جميع الحقول الأساسية مطلوبة (اسم المستخدم، كلمة المرور، الاسم، والدور).' });
      return;
    }

    if (role === 'admin') {
      res.status(403).json({ 
        success: false, 
        message: 'غير مسموح بإنشاء مستخدمين بصلاحية مدير نظام. تقتصر الصلاحيات المتاحة على مدير مستودع أو كاشير فقط.' 
      });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      res.status(409).json({ success: false, message: 'اسم المستخدم هذا مستخدم مسبقاً.' });
      return;
    }

    let whName = '';
    if (warehouseId) {
      const wh = warehouses.find(w => w.id === warehouseId);
      if (wh) whName = wh.name;
    }

    const newUser: AppUser = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      username: cleanUsername,
      password: hashPassword(password.trim()),
      name: name.trim(),
      role: role as 'manager' | 'cashier',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      warehouseId: warehouseId || '',
      warehouseName: whName,
      createdAt: new Date().toISOString().substring(0, 10)
    };

    users.push(newUser);
    setFirestoreDoc('users', newUser.id, newUser);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `قام مدير النظام بإضافة حساب جديد "${newUser.name}" بصلاحية ${newUser.role === 'manager' ? 'مدير مستودع' : 'كاشير'}.`,
      timestamp: formattedTime,
      meta: newUser.id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    const safeNewUser = { ...newUser, password: '' };
    res.status(201).json({ success: true, user: safeNewUser });
  });

  app.put('/api/users/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const { username, password, name, role, warehouseId, isActive } = req.body;
    const authUser = (req as AuthenticatedRequest).user;

    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
      return;
    }

    // التحقق من الصلاحيات: مدير النظام يمكنه تعديل الجميع، أو المستخدم يعدل حسابه الشخصي فقط
    if (authUser?.role !== 'admin' && authUser?.id !== id) {
      res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل بيانات هذا الحساب.' });
      return;
    }

    // منع ترقية أي مستخدم أو تغيير صلاحيته إلى مدير نظام
    if (role === 'admin' && users[userIndex].role !== 'admin') {
      res.status(403).json({ 
        success: false, 
        message: 'غير مسموح بتغيير أو ترقية صلاحية أي حساب إلى مدير نظام.' 
      });
      return;
    }

    // منع خفض صلاحية مدير النظام الأساسي لضمان عدم إقفال النظام
    if (users[userIndex].role === 'admin' && role && role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'صلاحية مدير النظام ثابتة ومحمية ولا يمكن تغييرها.'
      });
      return;
    }

    if (username) {
      const cleanU = username.trim().toLowerCase();
      if (users.some(u => u.id !== id && u.username.toLowerCase() === cleanU)) {
        res.status(409).json({ success: false, message: 'اسم المستخدم مسجل لشخص آخر.' });
        return;
      }
      users[userIndex].username = cleanU;
    }

    if (name) users[userIndex].name = name.trim();
    if (password && password.trim()) {
      users[userIndex].password = hashPassword(password.trim());
    }
    if (role && users[userIndex].role !== 'admin' && authUser?.role === 'admin') {
      users[userIndex].role = role;
    }
    if (isActive !== undefined && authUser?.role === 'admin') {
      users[userIndex].isActive = Boolean(isActive);
    }

    if (warehouseId !== undefined && authUser?.role === 'admin') {
      users[userIndex].warehouseId = warehouseId;
      const wh = warehouses.find(w => w.id === warehouseId);
      users[userIndex].warehouseName = wh ? wh.name : '';
    }

    setFirestoreDoc('users', users[userIndex].id, users[userIndex]);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: `تم تحديث بيانات الحساب "${users[userIndex].name}".`,
      timestamp: formattedTime,
      meta: users[userIndex].id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    const safeUser = { ...users[userIndex], password: '' };
    res.json({ success: true, user: safeUser });
  });

  app.patch('/api/users/:id/status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
      return;
    }

    if (users[userIndex].role === 'admin' && users.filter(u => u.role === 'admin' && u.isActive).length <= 1 && users[userIndex].isActive) {
      res.status(400).json({ success: false, message: 'لا يمكن حظر حساب مدير النظام الوحيد الفعّال.' });
      return;
    }

    users[userIndex].isActive = !users[userIndex].isActive;
    setFirestoreDoc('users', users[userIndex].id, users[userIndex]);

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'stock_update' as const,
      message: users[userIndex].isActive 
        ? `تم إلغاء حظر وتنشيط حساب "${users[userIndex].name}".` 
        : `تم حظر وتعطيل حساب "${users[userIndex].name}" ومنعه من تسجيل الدخول.`,
      timestamp: formattedTime,
      meta: users[userIndex].id
    };
    activities = [newActivity, ...activities];
    setFirestoreDoc('activities', newActivity.id, newActivity);

    const safeUser = { ...users[userIndex], password: '' };
    res.json({ success: true, user: safeUser });
  });

  app.delete('/api/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
      return;
    }

    if (users[userIndex].role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      res.status(400).json({ success: false, message: 'لا يمكن حذف حساب مدير النظام الرئيسي.' });
      return;
    }

    const [deleted] = users.splice(userIndex, 1);
    deleteFirestoreDoc('users', id);

    res.json({ success: true, message: `تم حذف الحساب "${deleted.name}" بنجاح.` });
  });

  // مسار تسجيل الدخول الموحد للتحقق من الصلاحيات والحظر مع تشفير bcrypt وتوكن JWT والحماية من Brute Force
  app.post('/api/auth/login', loginRateLimiter, (req, res) => {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown');
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ success: false, message: 'اسم المستخدم وكلمة المرور مطلوبان.' });
      return;
    }

    const u = username.trim().toLowerCase();
    const p = password.trim();

    // فحص المستخدمين في الذاكرة / Firestore مع دعم الهاش المشفر
    const matchedUser = users.find(user => 
      user.username.toLowerCase() === u && verifyPassword(p, user.password)
    );

    if (!matchedUser) {
      recordFailedLogin(ip);
      res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
      return;
    }

    if (!matchedUser.isActive) {
      res.status(403).json({ 
        success: false, 
        message: 'تم حظر هذا الحساب من قبل مدير النظام. يرجى التواصل مع الإدارة لتفعيله.' 
      });
      return;
    }

    // تسجيل نجاح المحاولة ومسح أي سجلات سابقة للمحاولات الخاطئة
    recordSuccessfulLogin(ip);

    // ترقية كلمة المرور للهاش إذا لم تكن مشفرة
    if (matchedUser.password && !matchedUser.password.startsWith('$2a$') && !matchedUser.password.startsWith('$2b$')) {
      matchedUser.password = hashPassword(p);
      setFirestoreDoc('users', matchedUser.id, matchedUser);
    }

    // إنشاء توكن أمني مشفر وموقع رقمياً JWT
    const token = jwt.sign(
      {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
        warehouseId: matchedUser.warehouseId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        name: matchedUser.name,
        role: matchedUser.role,
        warehouseId: matchedUser.warehouseId,
        warehouseName: matchedUser.warehouseName
      }
    });
  });

  // -------------------------------------------------------------
  // 11. تكامل خادم Vite ومخرجات البناء (React Vite Integration)
  // -------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Backend Server] Server running successfully on http://localhost:${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('[Error Starting Server]', err);
});

export default app;
export { app };
