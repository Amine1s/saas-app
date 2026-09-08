import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

import { Product, Invoice, StoreActivity, ChartPoint, Warehouse, Supplier, Customer, Category, StockMovement } from './types';
import { CODE_SNIPPETS } from './data';
import { API_BASE, removeAuthToken } from './config';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CodeSandbox from './components/CodeSandbox';
import AddProductModal from './components/AddProductModal';
import AddInvoiceModal from './components/AddInvoiceModal';
import { Login } from './components/Login';

export default function App() {
  // تتبع حالة تسجيل الدخول التابعة للنظام
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('saas_app_logged_in') === 'true' && !!localStorage.getItem('saas_auth_token');
    } catch {
      return false;
    }
  });

  // تتبع صلاحية واسم مستخدم النظام النشط
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'cashier'>(() => {
    try {
      return (localStorage.getItem('saas_user_role') as 'admin' | 'manager' | 'cashier') || 'admin';
    } catch {
      return 'admin';
    }
  });

  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('saas_user_name') || 'أمين محمد (مدير النظام)';
    } catch {
      return 'أمين محمد (مدير النظام)';
    }
  });

  // تتبع حالة الصفحة المفتوحة
  const [currentView, setCurrentView] = useState<'dashboard' | 'code_sandbox'>('dashboard');
  const [activeTab, setActiveTab] = useState<'db' | 'api' | 'env'>('db');
  
  const [copied, setCopied] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // الوضع الداكن
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      return saved ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => {
      const newVal = !prev;
      try {
        localStorage.setItem('darkMode', String(newVal));
      } catch (err) {
        console.error(err);
      }
      return newVal;
    });
  };
  
  // البضائع والمستودع
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'قميص بولو Ralph Lauren', sku: 'PROD-001', price: 150.00, quantity: 45, description: 'رجالي | مقاس XL | اللون أزرق', category: 'رجالي', warehouseId: 'WH-01', supplierId: 'SUP-01' },
    { id: '2', name: 'بنطال جينز Levi\'s 511', sku: 'PROD-002', price: 220.00, quantity: 4, description: 'رجالي | مقاس 32 | اللون أسود', category: 'رجالي', warehouseId: 'WH-01', supplierId: 'SUP-01' },
    { id: '3', name: 'فستان شانيل Chanel حرير', sku: 'PROD-003', price: 450.00, quantity: 18, description: 'نسائي | مقاس M | اللون أحمر', category: 'نسائي', warehouseId: 'WH-02', supplierId: 'SUP-01' },
    { id: '4', name: 'حذاء نايكي Nike Air Max', sku: 'PROD-004', price: 300.00, quantity: 7, description: 'أحذية | مقاس 42 | اللون أبيض', category: 'أحذية', warehouseId: 'WH-02', supplierId: 'SUP-02' }
  ]);

  // المستودعات والمخازن
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    { id: 'WH-01', name: 'المستودع الرئيسي - الرياض', location: 'الرياض - حي الملز', capacity: 5000, description: 'مستودع السلع الأساسية والمكيفة' },
    { id: 'WH-02', name: 'مستودع المنطقة الغربية - جدة', location: 'جدة - المدينة الصناعية', capacity: 3000, description: 'مستودع المنتجات المستوردة والأحذية' }
  ]);

  // الموردين
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 'SUP-01', name: 'شركة المنسوجات الموحدة', company: 'المصنع السعودي للملابس', phone: '0501112222', email: 'info@unifiedtextiles.com' },
    { id: 'SUP-02', name: 'مؤسسة خطوات التقنية', company: 'شركة الاستيراد العالمية', phone: '0503334444', email: 'sales@techsteps.sa' }
  ]);

  // العملاء
  const [customers, setCustomers] = useState<Customer[]>([
    { id: 'CUST-01', name: 'أحمد مصطفى', phone: '0551112222', email: 'ahmed@gmail.com', taxNumber: '300012345600003' },
    { id: 'CUST-02', name: 'سارة عبد الرحمن', phone: '0553334444', email: 'sara@outlook.com', taxNumber: '' },
    { id: 'CUST-03', name: 'شركة الأمل للتجارة', phone: '0555556666', email: 'contact@alamal.com', taxNumber: '310987654300003' }
  ]);

  // تصنيف وعوائل المنتجات
  const [categories, setCategories] = useState<Category[]>([
    { id: 'CAT-01', name: 'رجالي', description: 'ملابس وأحذية وإكسسوارات رجالية تمتاز بالجودة العالية' },
    { id: 'CAT-02', name: 'نسائي', description: 'ملابس فخمة وفساتين سهرة وتصاميم عصرية للمناسبات' },
    { id: 'CAT-03', name: 'أحذية', description: 'أحذية رياضية ورسمية مريحة ومقاومة للماء' }
  ]);

  // سجل حركات المخزون (الإدخال والإخراج)
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([
    { id: 'MOV-01', type: 'in', productId: '1', productName: 'قميص بولو Ralph Lauren', quantity: 45, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'توريد دفعة إنتاج جديدة من المصنع', timestamp: '2026-06-10 09:00', recordedBy: 'خالد أحمد (مدير المستودع)' },
    { id: 'MOV-02', type: 'in', productId: '2', productName: 'بنطال جينز Levi\'s 511', quantity: 15, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'توريد ملابس من المورد الشريك', timestamp: '2026-06-10 10:15', recordedBy: 'خالد أحمد (مدير المستودع)' },
    { id: 'MOV-03', type: 'out', productId: '2', productName: 'بنطال جينز Levi\'s 511', quantity: 11, warehouseId: 'WH-01', warehouseName: 'المستودع الرئيسي - الرياض', notes: 'تلف شحنة أو تحويل فرعي', timestamp: '2026-06-11 11:30', recordedBy: 'خالد أحمد (مدير المستودع)' }
  ]);

  // الفواتير
  const [invoices, setInvoices] = useState<Invoice[]>([
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
  ]);

  // سجل النشاطات الأخيرة لتعزيز مراقبة العمليات
  const [activities, setActivities] = useState<StoreActivity[]>([
    { id: '1', type: 'add_invoice', message: 'إصدار فاتورة مبيعات رقم INV-2026-02 للمشترية سارة عبد الرحمن بقيمة 517.50 ر.س شاملة الضريبة.', timestamp: 'قبل ساعة', meta: 'INV-2026-02' },
    { id: '2', type: 'add_product', message: 'إضافة صنف منتج جديد "حذاء نايكي Nike Air Max" بالرمز SKU الحالي PROD-004 ومخزون 7 قطع.', timestamp: 'قبل 4 ساعات', meta: 'PROD-004' },
    { id: '3', type: 'stock_update', message: 'تحديث مخزون "بنطال جينز Levi\'s 511" يدوياً إلى 4 قطع.', timestamp: 'قبل يوم واحد', meta: 'PROD-002' },
    { id: '4', type: 'add_invoice', message: 'إصدار فاتورة مبيعات رقم INV-2026-01 للعميل أحمد مصطفى بمبلغ 425.50 ر.س.', timestamp: 'قبل يومين', meta: 'INV-2026-01' },
    { id: '5', type: 'system', message: 'تم إقران مستودع المتاجر السحابية وإدارة الأرصدة والفوترة بنجاح.', timestamp: 'منذ أسبوع', meta: 'SYSTEM-START' }
  ]);

  // ولاية المخططات الإحصائية مأخوذة ديناميكياً من الباك إند
  const [weeklyChartData, setWeeklyChartData] = useState<ChartPoint[]>([
    { label: 'السبت', sales: 950, invoices: 3 },
    { label: 'الأحد', sales: 1320, invoices: 5 },
    { label: 'الأثنين', sales: 1850, invoices: 8 },
    { label: 'الثلاثاء', sales: 1100, invoices: 4 },
    { label: 'الأربعاء', sales: 2400, invoices: 11 },
    { label: 'الخميس', sales: 3100, invoices: 14 },
    { label: 'الجمعة', sales: 2150, invoices: 9 },
  ]);

  const [monthlyChartData, setMonthlyChartData] = useState<ChartPoint[]>([
    { label: 'يناير', sales: 18500, invoices: 72 },
    { label: 'فبراير', sales: 21400, invoices: 94 },
    { label: 'مارس', sales: 29800, invoices: 115 },
    { label: 'أبريل', sales: 24200, invoices: 88 },
    { label: 'مايو', sales: 34900, invoices: 142 },
    { label: 'يونيو', sales: 28800, invoices: 120 },
  ]);

  // دالة جلب وتحديث الأرقام والبيانات بشكل ديناميكي كامل من الخادم
  const fetchBackendData = async () => {
    try {
      const [prodRes, invRes, actRes, chartRes, whRes, supRes, custRes, catRes, movRes] = await Promise.all([
        fetch(`${API_BASE}/api/products`).then(res => res.json()),
        fetch(`${API_BASE}/api/invoices`).then(res => res.json()),
        fetch(`${API_BASE}/api/activities`).then(res => res.json()),
        fetch(`${API_BASE}/api/charts`).then(res => res.json()),
        fetch(`${API_BASE}/api/warehouses`).then(res => res.json()),
        fetch(`${API_BASE}/api/suppliers`).then(res => res.json()),
        fetch(`${API_BASE}/api/customers`).then(res => res.json()),
        fetch(`${API_BASE}/api/categories`).then(res => res.json()),
        fetch(`${API_BASE}/api/stock-movements`).then(res => res.json())
      ]);
      
      if (prodRes.success && prodRes.products) {
        setProducts(prodRes.products);
      }
      if (invRes.success && invRes.invoices) {
        setInvoices(invRes.invoices);
      }
      if (actRes.success && actRes.activities) {
        setActivities(actRes.activities);
      }
      if (chartRes.success) {
        if (chartRes.weekly) setWeeklyChartData(chartRes.weekly);
        if (chartRes.monthly) setMonthlyChartData(chartRes.monthly);
      }
      if (whRes.success && whRes.warehouses) {
        setWarehouses(whRes.warehouses);
      }
      if (supRes.success && supRes.suppliers) {
        setSuppliers(supRes.suppliers);
      }
      if (custRes.success && custRes.customers) {
        setCustomers(custRes.customers);
      }
      if (catRes.success && catRes.categories) {
        setCategories(catRes.categories);
      }
      if (movRes.success && movRes.stockMovements) {
        setStockMovements(movRes.stockMovements);
      }
    } catch (err) {
      console.warn('Backend server is starting up or unreachable. Falling back to local state.', err);
    }
  };

  // جلب البيانات من الباك إند عند تهيئة التطبيق
  useEffect(() => {
    fetchBackendData();
  }, []);

  const addActivity = async (
    type: StoreActivity['type'], 
    message: string, 
    meta?: string,
    extra?: {
      entityType?: 'product' | 'category' | 'invoice' | 'user' | 'warehouse' | 'general';
      action?: 'create' | 'update' | 'delete' | 'other';
      performedBy?: string;
      performerRole?: string;
      itemName?: string;
    }
  ) => {
    const actorName = extra?.performedBy || userName || 'مدير النظام';
    const actorRole = extra?.performerRole || (userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير');

    try {
      const res = await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          message, 
          meta,
          entityType: extra?.entityType,
          action: extra?.action,
          performedBy: actorName,
          performerRole: actorRole,
          itemName: extra?.itemName
        })
      });
      const data = await res.json();
      if (data.success && data.activity) {
        setActivities((prev: StoreActivity[]) => [data.activity, ...prev]);
        return;
      }
    } catch (err) {
      console.warn('API error listing activity, adding locally:', err);
    }

    const formattedTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const newActivity: StoreActivity = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      message,
      timestamp: formattedTime,
      meta,
      entityType: extra?.entityType,
      action: extra?.action,
      performedBy: actorName,
      performerRole: actorRole,
      itemName: extra?.itemName
    };
    setActivities((prev: StoreActivity[]) => [newActivity, ...prev]);
  };

  // مودال منتج جديد
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: '',
    description: '',
    category: 'رجالي',
    warehouseId: '',
    supplierId: ''
  });

  // مودال فاتورة جديدة
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '1', quantity: 1 }
  ]);
  const [invoiceForm, setInvoiceForm] = useState({
    customerName: '',
    status: 'paid' as 'paid' | 'partial' | 'refunded',
    amountPaid: '',
    paymentMethod: 'بطاقة ائتمان / مدى'
  });

  // الإشعارات الفورية
  const [notification, setNotification] = useState<{ type: 'green' | 'red' | 'yellow'; text: string } | null>(null);

  const triggerNotification = (text: string, type: 'green' | 'red' | 'yellow' = 'green') => {
    setNotification({ type, text });
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('saas_app_logged_in');
      localStorage.removeItem('saas_user_id');
      localStorage.removeItem('saas_user_role');
      localStorage.removeItem('saas_user_name');
      removeAuthToken();
    } catch (err) {
      console.error(err);
    }
    setIsLoggedIn(false);
    triggerNotification('تم تسجيل الخروج من النظام بأمان.', 'yellow');
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      const dismissOnPageClick = () => setNotification(null);
      window.addEventListener('pointerdown', dismissOnPageClick);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('pointerdown', dismissOnPageClick);
      };
    }
  }, [notification]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // مستمع اختصارات لوحة المفاتيح لتحسين سرعة التعامل وسهولة الاستخدام
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInput) {
        if (e.key === 'Escape') {
          setShowAddProductModal(false);
          setShowAddInvoiceModal(false);
        }
        return;
      }

      // إضافة منتج جديد: Ctrl + N أو Alt + N أو Alt + P (محجوب عن الكاشير)
      if ((e.ctrlKey && e.key.toLowerCase() === 'n') || (e.altKey && e.key.toLowerCase() === 'n') || (e.altKey && e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        if (userRole !== 'cashier') {
          setShowAddProductModal(true);
          triggerNotification('فتح نافذة صنف منتج جديد', 'green');
        } else {
          triggerNotification('غير مصرح للكاشير بإضافة أصناف جديدة.', 'red');
        }
      }

      // إصدار فاتورة جديدة: Alt + I
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setShowAddInvoiceModal(true);
        triggerNotification('فتح نافذة إصدار فاتورة جديدة', 'green');
      }

      // الانتقال للوحة التحكم: Alt + D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setCurrentView('dashboard');
        triggerNotification('الانتقال إلى لوحة التحكم', 'green');
      }

      // الانتقال إلى بيئة المطور: Alt + S
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setCurrentView('code_sandbox');
        triggerNotification('الانتقال إلى الساندبوكس', 'green');
      }

      // تبديل تبويبات الكود بالساندبوكس: Alt + 1, Alt + 2, Alt + 3
      if (currentView === 'code_sandbox') {
        if (e.altKey && e.key === '1') {
          e.preventDefault();
          setActiveTab('db');
        } else if (e.altKey && e.key === '2') {
          e.preventDefault();
          setActiveTab('api');
        } else if (e.altKey && e.key === '3') {
          e.preventDefault();
          setActiveTab('env');
        }
      }

      // إغلاق النوافذ عند الضغط على Escape
      if (e.key === 'Escape') {
        setShowAddProductModal(false);
        setShowAddInvoiceModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, activeTab]);

  // نسخ كود الاتصال وقاعدة البيانات
  const handleCopyCode = () => {
    const textToCopy = CODE_SNIPPETS[activeTab].code;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    triggerNotification('تم نسخ ملف الاستعلام والبرمجة بنجاح!', 'green');
  };

  // تسجيل إضافة صنف بضاعة جديد
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'cashier') {
      triggerNotification('غير مصرح للكاشير بإضافة أصناف جديدة.', 'red');
      return;
    }
    const { name, sku, price, quantity, description, category, warehouseId, supplierId } = newProductForm;

    if (!name.trim() || !sku.trim() || price === '' || quantity === '') {
      triggerNotification('الرجاء تعبئة كافة الحقول الأساسية.', 'red');
      return;
    }

    if (products.some(p => p.sku.toUpperCase() === sku.trim().toUpperCase())) {
      triggerNotification('خطأ: رمز SKU مسجل مسبقاً لصنف آخر.', 'red');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          price: Number(price),
          quantity: Number(quantity),
          description: description.trim() || 'لا يوجد وصف تفصيلي.',
          category,
          warehouseId: warehouseId || undefined,
          supplierId: supplierId || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev: Product[]) => [data.product, ...prev]);
        setShowAddProductModal(false);
        triggerNotification(`تمت إضافة منتج "${data.product.name}" بنجاح وتحديث قاعدة البيانات.`, 'green');
        addActivity(
          'add_product', 
          `إضافة صنف منتج جديد "${data.product.name}" بالرمز SKU: ${data.product.sku} ومخزون ${data.product.quantity} قطع بواسطة ${userName}.`, 
          data.product.sku,
          {
            entityType: 'product',
            action: 'create',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: data.product.name
          }
        );

        // تحديث كل البيانات لتشمل حركات المخزون الناتجة عن التأسيس
        await fetchBackendData();

        // تصفير النموذج
        setNewProductForm({
          name: '',
          sku: '',
          price: '',
          quantity: '',
          description: '',
          category: 'رجالي',
          warehouseId: '',
          supplierId: ''
        });
      } else {
        triggerNotification(data.message || 'فشلت إضافة المنتج.', 'red');
      }
    } catch (err) {
      console.error('Error creating product:', err);
      triggerNotification('خطأ في الاتصال بالشبكة مع السيرفر.', 'red');
    }
  };

  // تعديل وتحديث كمية صنف في المستودع فورياً
  const handleQuickQuantityUpdate = async (productId: string, newQty: number) => {
    if (newQty < 0) {
      triggerNotification('لا يمكن أن تكون الكمية أقل من الصفر.', 'red');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQty })
      });
      const data = await res.json();
      
      if (data.success && data.product) {
        setProducts((prev: Product[]) => prev.map(p => p.id === productId ? data.product : p));

        const prod = data.product;
        if (newQty === 0) {
          triggerNotification(`تنبيه: نفدت كمية المنتج "${prod.name}" تماماً!`, 'red');
        } else if (newQty <= 5) {
          triggerNotification(`تنبيه: مخزون صنف "${prod.name}" منخفض جداً (${newQty} قطع متبقية).`, 'yellow');
        } else {
          triggerNotification(`تم تحديث مخزون صنف "${prod.name}" إلى ${newQty} بنجاح.`, 'green');
        }
        addActivity(
          'stock_update', 
          `تعديل مخزون الصنف "${prod.name}" يدوياً إلى ${newQty} قطع بواسطة ${userName}.`, 
          prod.sku,
          {
            entityType: 'product',
            action: 'update',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: prod.name
          }
        );
      } else {
         triggerNotification(data.message || 'فشل تحديث كمية المخزون.', 'red');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      triggerNotification('حدث خطأ بالاتصال أثناء تعديل الكمية يدوياً.', 'red');
    }
  };

  // معالجة إصدار وحفظ الفاتورة وتعديل الأرصدة
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const { customerName, status, amountPaid, paymentMethod } = invoiceForm;

    if (!customerName.trim()) {
      triggerNotification('الرجاء كتابة اسم العميل أولاً.', 'red');
      return;
    }

    if (selectedItems.length === 0 || selectedItems.some(item => !item.productId || item.quantity <= 0)) {
      triggerNotification('الرجاء اختيار صنف وتحديد كمية صحيحة.', 'red');
      return;
    }

    // التحقق من مستويات الأرصدة المتوفرة بالمسجل
    let stockError = false;
    selectedItems.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (!prod || prod.quantity < item.quantity) {
        triggerNotification(`المخزون غير كافٍ للمنتج "${prod?.name || 'مجهول'}". المتوفر هو: ${prod?.quantity || 0}`, 'red');
        stockError = true;
      }
    });

    if (stockError) return;

    let subtotal = 0;
    const itemsList = selectedItems.map(item => {
      const prod = products.find(p => p.id === item.productId)!;
      subtotal += prod.price * item.quantity;
      return {
        productId: item.productId,
        name: prod.name,
        quantity: item.quantity,
        price: prod.price
      };
    });

    const isPartial = status === 'partial';
    const isRefunded = status === 'refunded';
    const finalTotal = subtotal * 1.15;
    const paidSum = isRefunded ? 0 : (isPartial ? Number(amountPaid) || 0 : finalTotal);

    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          status,
          items: itemsList,
          totalAmount: subtotal,
          amountPaid: paidSum,
          paymentMethod
        })
      });
      const data = await res.json();
      if (data.success && data.invoice) {
        setInvoices((prev: Invoice[]) => [data.invoice, ...prev]);
        
        // مزامنة كافة المنتجات، الفواتير، المخططات، والأنشطة من السيرفر فوراً
        await fetchBackendData();

        setShowAddInvoiceModal(false);
        triggerNotification(`تم إصدار فاتورة المبيعات #${data.invoice.id} بنجاح!`, 'green');
        addActivity('add_invoice', `إصدار فاتورة مبيعات جديدة #${data.invoice.id} للعميل ${data.invoice.customerName} بقيمة ${(data.invoice.totalAmount * 1.15).toFixed(2)} ر.س.`, data.invoice.id);

        // تصفير فروع الفاتورة
        setInvoiceForm({ customerName: '', status: 'paid', amountPaid: '', paymentMethod: 'بطاقة ائتمان / مدى' });
        setSelectedItems([{ productId: products[0]?.id || '1', quantity: 1 }]);
      } else {
        triggerNotification(data.message || 'فشل إصدار الفاتورة على السيرفر.', 'red');
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      triggerNotification('فشل إصدار الفاتورة بسبب خطأ في اتصال السيرفر.', 'red');
    }
  };

  return (
    <div className={`${darkMode ? '' : 'light-mode'} min-h-screen font-sans antialiased flex flex-col relative transition-all duration-500 ${
      darkMode 
        ? 'bg-[#031510] text-[#E0F2FE]' 
        : 'bg-[#eef1f3] text-[#1F2937]'
    }`} dir="rtl">
      
      {/* شاشة التنبيهات المنبثقة */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 font-sans cursor-pointer"
          >
            <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center justify-between gap-3 ${
              darkMode
                ? notification.type === 'green'
                  ? 'bg-emerald-950/90 border-emerald-700/70 text-emerald-100'
                  : notification.type === 'red'
                  ? 'bg-red-950/90 border-red-700/70 text-red-100'
                  : 'bg-amber-950/90 border-amber-700/70 text-amber-100'
                : notification.type === 'green'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                : notification.type === 'red'
                ? 'bg-red-50/95 border-red-300 text-red-950'
                : 'bg-amber-50/95 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  notification.type === 'green' ? 'bg-[#22C55E]' : notification.type === 'red' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                }`} />
                <p className="text-xs sm:text-sm font-semibold">{notification.text}</p>
              </div>
              <button onClick={() => setNotification(null)} aria-label="إغلاق الإشعار" className="rounded-lg p-1 hover:bg-black/10 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoggedIn ? (
        <Login 
          onLoginSuccess={(session) => { 
            setIsLoggedIn(true); 
            setUserRole(session.role);
            const fullName = session.role === 'admin' ? 'أمين محمد (مدير النظام)' : session.role === 'manager' ? 'خالد أحمد (مدير المستودع)' : 'فاطمة علي (أمين الصندوق)';
            setUserName(fullName);
            triggerNotification(`تم تسجيل الدخول بنجاح! مرحباً بك يا ${fullName}.`, 'green'); 
          }} 
          darkMode={darkMode} 
        />
      ) : (
        <>
          {/* الهيكل الأساسي */}
          <div className="flex flex-1 overflow-hidden">
            
            {/* المكون الجانبي */}
            <Sidebar 
              currentView={currentView}
              setCurrentView={setCurrentView}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              setShowAddInvoiceModal={setShowAddInvoiceModal}
              setShowAddProductModal={setShowAddProductModal}
              darkMode={darkMode}
              userRole={userRole}
            />

            {/* المكون الرئيسي */}
            <main className="flex-grow overflow-y-auto">
              
              {/* شريط الرأس */}
              <Header 
                currentView={currentView}
                setSidebarOpen={setSidebarOpen}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onLogout={handleLogout}
                userRole={userRole}
                userName={userName}
              />

              {/* محتويات العرض حسب التبويب النشط */}
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                {currentView === 'dashboard' ? (
                  <Dashboard 
                    darkMode={darkMode}
                    userRole={userRole}
                    userName={userName}
                    products={products}
                    invoices={invoices}
                    activities={activities}
                    weeklyChartData={weeklyChartData}
                    monthlyChartData={monthlyChartData}
                    warehouses={warehouses}
                    suppliers={suppliers}
                    customers={customers}
                    categories={categories}
                    stockMovements={stockMovements}
                    fetchBackendData={fetchBackendData}
                    addActivity={addActivity}
                    handleQuickQuantityUpdate={handleQuickQuantityUpdate}
                    setShowAddProductModal={setShowAddProductModal}
                    setShowAddInvoiceModal={setShowAddInvoiceModal}
                    setInvoices={setInvoices}
                    triggerNotification={triggerNotification}
                  />
                ) : (
                  <CodeSandbox 
                    darkMode={darkMode}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    handleCopyCode={handleCopyCode}
                    copied={copied}
                  />
                )}
              </div>
            </main>
          </div>

          {/* النوافذ العائمة المنبثقة */}
          {userRole !== 'cashier' && (
            <AddProductModal 
              isOpen={showAddProductModal}
              onClose={() => setShowAddProductModal(false)}
              darkMode={darkMode}
              onSubmit={handleCreateProduct}
              formState={newProductForm}
              setFormState={setNewProductForm}
              categories={categories}
              warehouses={warehouses}
              suppliers={suppliers}
            />
          )}

          <AddInvoiceModal 
            isOpen={showAddInvoiceModal}
            onClose={() => setShowAddInvoiceModal(false)}
            darkMode={darkMode}
            onSubmit={handleCreateInvoice}
            invoiceForm={invoiceForm}
            setInvoiceForm={setInvoiceForm}
            products={products}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        </>
      )}

    </div>
  );
}
