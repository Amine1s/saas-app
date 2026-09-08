import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  FileText, 
  AlertCircle, 
  DollarSign, 
  Plus, 
  Check,
  Printer,
  FileSpreadsheet,
  Activity,
  Clock,
  PackagePlus,
  Receipt,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  Building2,
  UserCheck,
  Users,
  ClipboardList,
  BookOpen,
  Layers,
  Filter,
  Search,
  Download,
  Trash2,
  ShieldAlert,
  MapPin,
  Mail,
  Phone,
  Pencil,
  BarChart3,
  Calendar,
  AlertTriangle,
  UserCog,
  Tag,
  Package,
  History,
  CheckCircle2,
  ArrowDownToLine,
  ArrowUpFromLine,
  X
} from 'lucide-react';
import { Product, Invoice, ChartPoint, StoreActivity, Warehouse, Supplier, Customer, Category, StockMovement } from '../types';
import { API_BASE } from '../config';
import UserManagementTab from './UserManagementTab';
import '../styles/Dashboard.css';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface DashboardProps {
  darkMode: boolean;
  userRole: 'admin' | 'manager' | 'cashier';
  userName: string;
  products: Product[];
  invoices: Invoice[];
  activities: StoreActivity[];
  weeklyChartData: ChartPoint[];
  monthlyChartData: ChartPoint[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  customers: Customer[];
  categories: Category[];
  stockMovements: StockMovement[];
  fetchBackendData: () => Promise<void>;
  addActivity: (
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
  ) => void;
  handleQuickQuantityUpdate: (productId: string, newQty: number) => void;
  setShowAddProductModal: (show: boolean) => void;
  setShowAddInvoiceModal: (show: boolean) => void;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  triggerNotification: (text: string, type?: 'green' | 'red' | 'yellow') => void;
}

export default function Dashboard({
  darkMode,
  userRole,
  userName,
  products,
  invoices,
  activities,
  weeklyChartData,
  monthlyChartData,
  warehouses = [],
  suppliers = [],
  customers = [],
  categories = [],
  stockMovements = [],
  fetchBackendData,
  addActivity,
  handleQuickQuantityUpdate,
  setShowAddProductModal,
  setShowAddInvoiceModal,
  setInvoices,
  triggerNotification
}: DashboardProps) {
  // تتبع التبويب النشط في لوحة الإدارة
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'warehouses' | 'suppliers_customers' | 'movements' | 'activities' | 'reports' | 'users'>('overview');
  
  // تتبع فترة الرسم البياني
  const [chartTimeframe, setChartTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  // ولايات البحث والفلترة للمنتجات
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productWarehouseFilter, setProductWarehouseFilter] = useState('');
  const [productLowStockOnly, setProductLowStockOnly] = useState(false);

  // ولاية الحركات المفلترة
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'in' | 'out'>('all');

  // نماذج الإدخال الفرعية السريعة للمجالات الجديدة
  const [newWarehouse, setNewWarehouse] = useState({ name: '', location: '', capacity: '', description: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', company: '', phone: '', email: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', taxNumber: '' });
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [newMovement, setNewMovement] = useState({ productId: '', type: 'in' as 'in' | 'out', quantity: '', notes: '', warehouseId: '' });

  // تتبع عملية الحفظ للنماذج لتجنب النقرات المتكررة
  const [isSubmitting, setIsSubmitting] = useState(false);

  // التحقق من الصلاحيات والتحكم بالوصول
  const hasWriteAccess = userRole === 'admin' || userRole === 'manager';
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager';
  const isCashier = userRole === 'cashier';

  // إعادة توجيه الكاشير تلقائياً للوحة الإحصائية في حال كان التبويب النشط هو إدارة المخازن
  useEffect(() => {
    if (isCashier && activeTab === 'warehouses') {
      setActiveTab('overview');
    }
  }, [isCashier, activeTab]);

  // 1. صلاحية حذف المنتجات والتصنيفات (للأدمن ومدير المستودع)
  const canDeleteProductOrCategory = isAdmin || isManager;
  // 2. صلاحية حذف كامل سجل العمليات أو سجل فردي، وحذف المستودعات (للأدمن وحده فقط)
  const canManageSystemDeletions = isAdmin;

  // تصفية وبحث سجل رقابة المنتجات والأصناف (خاص بمدير النظام)
  const [auditFilter, setAuditFilter] = useState<'all' | 'products' | 'categories' | 'create' | 'update' | 'delete'>('all');
  const [auditSearch, setAuditSearch] = useState('');

  // حالات ونماذج تعديل المنتجات والتصنيفات
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // دالة ذكية لتحليل واستخراج بيانات العمليات على المنتجات والتصنيفات ومن قام بها
  const parseAuditActivity = (act: StoreActivity) => {
    let entityType = act.entityType;
    let action = act.action;
    let performedBy = act.performedBy;
    let performerRole = act.performerRole;
    let itemName = act.itemName;

    const msg = act.message || '';
    const isProduct = entityType === 'product' || act.type === 'add_product' || act.type === 'edit_product' || act.type === 'delete_product' || msg.includes('منتج') || msg.includes('صنف') || msg.includes('بضاعة') || msg.includes('SKU');
    const isCategory = entityType === 'category' || act.type === 'add_category' || act.type === 'edit_category' || act.type === 'delete_category' || msg.includes('تصنيف');

    if (!entityType) {
      if (isProduct) entityType = 'product';
      else if (isCategory) entityType = 'category';
    }

    if (!action) {
      if (msg.includes('حذف') || act.type === 'delete_product' || act.type === 'delete_category') action = 'delete';
      else if (msg.includes('إضافة') || msg.includes('إنشاء') || msg.includes('تسجيل') || act.type === 'add_product' || act.type === 'add_category') action = 'create';
      else if (msg.includes('تعديل') || msg.includes('تحديث') || msg.includes('تغيير') || act.type === 'stock_update' || act.type === 'edit_product' || act.type === 'edit_category') action = 'update';
      else action = 'other';
    }

    if (!performedBy) {
      const byMatch = msg.match(/بواسطة\s+([^()،.\n]+)/);
      const byGam = msg.match(/قام\s+([^()،.\n]+)/);
      if (byMatch && byMatch[1]) {
        performedBy = byMatch[1].trim();
      } else if (byGam && byGam[1]) {
        performedBy = byGam[1].trim();
      } else {
        performedBy = 'مدير النظام';
      }
    }

    if (!performerRole) {
      if (msg.includes('مدير مستودع')) performerRole = 'مدير مستودع';
      else if (msg.includes('كاشير')) performerRole = 'كاشير';
      else performerRole = 'مدير نظام';
    }

    if (!itemName) {
      const quoteMatch = msg.match(/"([^"]+)"/);
      if (quoteMatch && quoteMatch[1]) {
        itemName = quoteMatch[1];
      } else {
        itemName = act.meta || 'صنف غير محدد';
      }
    }

    return {
      id: act.id,
      timestamp: act.timestamp,
      message: act.message,
      meta: act.meta,
      isTarget: isProduct || isCategory,
      entityType: entityType || 'product',
      action: action || 'other',
      performedBy: performedBy || 'مدير النظام',
      performerRole: performerRole || 'مدير نظام',
      itemName: itemName || 'غير محدد'
    };
  };

  // حصر كافة عمليات المنتجات والأصناف
  const productAndCategoryAudits = activities
    .map(parseAuditActivity)
    .filter(item => item.isTarget);

  const auditKpis = {
    totalCount: productAndCategoryAudits.length,
    createdCount: productAndCategoryAudits.filter(a => a.action === 'create').length,
    updatedCount: productAndCategoryAudits.filter(a => a.action === 'update').length,
    deletedCount: productAndCategoryAudits.filter(a => a.action === 'delete').length,
    productsCount: productAndCategoryAudits.filter(a => a.entityType === 'product').length,
    categoriesCount: productAndCategoryAudits.filter(a => a.entityType === 'category').length,
  };

  const filteredAuditList = productAndCategoryAudits.filter(item => {
    if (auditFilter === 'products' && item.entityType !== 'product') return false;
    if (auditFilter === 'categories' && item.entityType !== 'category') return false;
    if (auditFilter === 'create' && item.action !== 'create') return false;
    if (auditFilter === 'update' && item.action !== 'update') return false;
    if (auditFilter === 'delete' && item.action !== 'delete') return false;

    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase().trim();
      const matchName = item.itemName?.toLowerCase().includes(q);
      const matchPerformer = item.performedBy?.toLowerCase().includes(q);
      const matchRole = item.performerRole?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q);
      const matchMeta = item.meta?.toLowerCase().includes(q);
      if (!matchName && !matchPerformer && !matchRole && !matchMsg && !matchMeta) return false;
    }

    return true;
  });

  // معالج تصدير الفواتير بصيغة إكسل
  const handleExportToExcel = () => {
    const headers = [
      'الرقم المرجعي',
      'اسم العميل',
      'تاريخ الإصدار',
      'المشتريات والتفاصيل',
      'الإجمالي قبل الضريبة',
      'مبلغ الضريبة (15%)',
      'الصافي النهائي المستحق',
      'طريقة الدفع',
      'حالة السداد'
    ];

    const csvRows = invoices.map(inv => {
      const vatAmount = inv.totalAmount * 0.15;
      const netFinalTotal = inv.totalAmount * 1.15;
      const itemsString = inv.items.map(it => `${it.name} (عدد ${it.quantity})`).join(' - ');
      const statusText = inv.status === 'paid' ? 'مدفوعة بالكامل' : inv.status === 'partial' ? 'مدفوعة جزئياً' : 'مرتجع / تالف';
      
      return [
        inv.id,
        `"${inv.customerName.replace(/"/g, '""')}"`,
        inv.invoiceDate,
        `"${itemsString.replace(/"/g, '""')}"`,
        inv.totalAmount.toFixed(2),
        vatAmount.toFixed(2),
        netFinalTotal.toFixed(2),
        inv.paymentMethod,
        statusText
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_الفواتير_المخازن_السحابية_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification('تم تصدير كشف الفواتير باللغة العربية والترميز المتوافق مع Excel بنجاح!', 'green');
  };

  // معالج طباعة وتصدير الفاتورة كـ PDF
  const handlePrintInvoice = (inv: Invoice) => {
    const vatAmount = inv.totalAmount * 0.15;
    const netFinalTotal = inv.totalAmount * 1.15;
    const itemsHtml = inv.items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; text-align: center; font-weight: bold;">${index + 1}</td>
        <td style="padding: 12px; text-align: right;">${item.name}</td>
        <td style="padding: 12px; text-align: center; font-family: monospace;">${item.price.toFixed(2)} ر.س</td>
        <td style="padding: 12px; text-align: center; font-family: monospace;">${item.quantity}</td>
        <td style="padding: 12px; text-align: left; font-family: monospace; font-weight: bold;">${(item.price * item.quantity).toFixed(2)} ر.س</td>
      </tr>
    `).join('');

    const statusBadge = inv.status === 'paid' 
      ? '<span style="background-color: #d1fae5; color: #065f46; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 9999px;">مدفوعة بالكامل</span>'
      : inv.status === 'partial'
      ? `<span style="background-color: #fef3c7; color: #92400e; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 9999px;">مدفوعة جزئياً (${inv.amountPaid.toFixed(2)} ر.س)</span>`
      : '<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; font-size: 11px; font-weight: bold; border-radius: 9999px;">مرتجع مالي / تالف</span>';

    const qrSvg = `
      <svg width="100" height="100" viewBox="0 0 100 100" style="margin: 0 auto; display: block;">
        <rect width="100" height="100" fill="white"/>
        <path d="M10,10 h30 v30 h-30 z M20,20 h10 v10 h-10 z" fill="black"/>
        <path d="M60,10 h30 v30 h-30 z M70,20 h10 v10 h-10 z" fill="black"/>
        <path d="M10,60 h30 v30 h-30 z M20,70 h10 v10 h-10 z" fill="black"/>
        <path d="M50,55 h10 v10 h-10 z M75,50 h15 v15 h-15 z M60,65 h15 v15 h-15 z" fill="black"/>
        <path d="M50,75 h15 v15 h-15 z M75,75 h15 v15 h-15 z" fill="black"/>
        <path d="M45,45 h10 v10 h-10 z M45,15 h5 v20 h-5 z" fill="black"/>
        <circle cx="50" cy="50" r="3" fill="#10B981" />
      </svg>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerNotification('الرجاء تفعيل النوافذ المنبثقة (Popups) لعرض الفاتورة والتمكن من طباعتها كـ PDF.', 'red');
      return;
    }

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>فاتورة مبيعات - ${inv.id}</title>
          <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Almarai', sans-serif;
              color: #1e293b;
              background-color: #f8fafc;
              padding: 40px;
              margin: 0;
            }
            .invoice-card {
              background-color: white;
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .logo-badge {
              display: inline-block;
              width: 48px;
              height: 48px;
              background-color: #064E3B;
              color: white;
              border-radius: 12px;
              text-align: center;
              line-height: 48px;
              font-size: 24px;
              font-weight: 800;
              float: right;
              margin-left: 15px;
            }
            .title-info {
              float: right;
            }
            .invoice-title {
              margin: 0;
              font-size: 20px;
              font-weight: 800;
              color: #064E3B;
            }
            .subtitle {
              margin: 2px 0 0 0;
              font-size: 11px;
              color: #64748b;
            }
            .meta-details {
              font-size: 12px;
              line-height: 1.6;
              color: #475569;
            }
            .meta-val {
              font-family: 'JetBrains Mono', monospace;
              font-weight: bold;
            }
            .divider {
              border-top: 2px solid #f1f5f9;
              margin: 25px 0;
            }
            .bill-to {
              background-color: #f8fafc;
              border-radius: 12px;
              padding: 16px;
              font-size: 12px;
              line-height: 1.6;
            }
            .bill-title {
              font-size: 10px;
              text-transform: uppercase;
              color: #94a3b8;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .customer-name {
              font-weight: bold;
              font-size: 14px;
              color: #0f172a;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-bottom: 30px;
            }
            .items-table th {
              background-color: #064E3B;
              color: white;
              padding: 12px;
              font-weight: bold;
            }
            .summary-table {
              width: 320px;
              margin-right: auto;
              border-collapse: collapse;
              font-size: 13px;
              margin-top: 20px;
            }
            .summary-table td {
              padding: 8px 12px;
            }
            .summary-label {
              text-align: right;
              color: #64748b;
            }
            .summary-val {
              text-align: left;
              font-family: 'JetBrains Mono', monospace;
              font-weight: bold;
            }
            .summary-total {
              background-color: #ecfdf5;
              color: #064E3B;
              font-weight: bold;
              font-size: 14px;
              border-radius: 8px;
            }
            .qr-sec {
              text-align: center;
              font-size: 11px;
              color: #64748b;
              margin-top: 40px;
            }
            .qr-text {
              margin-top: 8px;
              font-weight: bold;
            }
            .footer-info {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              margin-top: 60px;
              border-top: 1px solid #cbd5e1;
              padding-top: 20px;
            }
            .print-btn-bar {
              background-color: #f1f5f9;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin-bottom: 25px;
              max-width: 800px;
              margin-left: auto;
              margin-right: auto;
            }
            .print-btn {
              background-color: #10B981;
              color: #0f172a;
              border: none;
              padding: 10px 24px;
              font-size: 13px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.2s;
              font-family: 'Almarai', sans-serif;
            }
            .print-btn:hover {
              background-color: #0da06f;
            }
            @media print {
              .print-btn-bar {
                display: none;
              }
              body {
                padding: 0;
              }
              .invoice-card {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-btn-bar">
            <button class="print-btn" onclick="window.print()">تحميل وحفظ كـ PDF / طباعة الفاتورة الفورية</button>
            <div style="font-size: 10px; color: #64748b; margin-top: 5px;">يمكنك اختيار "حفظ بصيغة PDF / Save as PDF" من خيارات الطابعة لحفظ المستند كملف على جهازك.</div>
          </div>

          <div class="invoice-card">
            <!-- الهيدر واللوغو -->
            <table class="header-table">
              <tr>
                <td>
                  <div class="logo-badge">S</div>
                  <div class="title-info">
                    <h1 class="invoice-title">مخازن سحابية للفوترة</h1>
                    <p class="subtitle">شركة الفواتير وإدارة البضائع الموحدة السريعة</p>
                  </div>
                </td>
                <td style="text-align: left;">
                  <div class="meta-details">
                    <div>الرقم المرجعي: <span class="meta-val" style="color: #064E3B;">${inv.id}</span></div>
                    <div>تاريخ الفاتورة: <span class="meta-val">${inv.invoiceDate}</span></div>
                    <div>حالة التحصيل: ${statusBadge}</div>
                  </div>
                </td>
              </tr>
            </table>

            <div class="divider"></div>

            <!-- معلومات العميل الضريبي -->
            <table style="width: 100%; margin-bottom: 20px;">
              <tr>
                <td style="width: 50%; padding-left: 10px; vertical-align: top;">
                  <div class="bill-to">
                    <div class="bill-title">فاتورة ضريبية مبسطة صادرة إلى:</div>
                    <div class="customer-name">${inv.customerName}</div>
                    <div style="color: #64748b; margin-top: 4px; font-size: 12px;">مشار إليها كعميل معمنتج ومسجل لدينا</div>
                  </div>
                </td>
                <td style="width: 50%; padding-right: 10px; vertical-align: top;">
                  <div class="bill-to" style="border-right: 3px solid #064E3B; background-color: #f0fdf4;">
                    <div class="bill-title">التاجر ومزود الخدمة المسجل:</div>
                    <div class="customer-name" style="color: #064E3B;">شركة مخازن سحابية المحدودة</div>
                    <div style="color: #064E3B; font-weight: bold; margin-top: 4px; font-size: 11px;">الرقم الضريبي الموحد (VAT): <span style="font-family: monospace;">310248590600003</span></div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- جدول المواد والكميات والأسعار -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 8%; border-top-right-radius: 8px;">#</th>
                  <th style="width: 50%; text-align: right;">المنتج والوصف</th>
                  <th style="width: 15%; text-align: center;">سعر الوحدة</th>
                  <th style="width: 12%; text-align: center;">الكمية</th>
                  <th style="width: 15%; text-align: left; border-top-left-radius: 8px;">المجموع الفرعي</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- ملخص الحساب شامل ضريبة القيمة المضافة 15% السعودية -->
            <table class="summary-table">
              <tr>
                <td class="summary-label">المجموع الخاضع للضريبة:</td>
                <td class="summary-val">${inv.totalAmount.toFixed(2)} ر.س</td>
              </tr>
              <tr>
                <td class="summary-label" style="color: #ef4444;">ضريبة القيمة المضافة (15%):</td>
                <td class="summary-val" style="color: #ef4444;">+${vatAmount.toFixed(2)} ر.س</td>
              </tr>
              <tr class="summary-total">
                <td class="summary-label" style="color: #064E3B; font-weight: bold; padding: 12px 10px; border-bottom-right-radius: 8px; border-top-right-radius: 8px;">الصافي النهائي شامل الضريبة:</td>
                <td class="summary-val" style="color: #064E3B; font-weight: bold; padding: 12px 10px; border-bottom-left-radius: 8px; border-top-left-radius: 8px;">${netFinalTotal.toFixed(2)} ر.س</td>
              </tr>
              <tr>
                <td class="summary-label">طريقة السداد المعتمدة:</td>
                <td class="summary-val" style="font-size: 11px;">${inv.paymentMethod}</td>
              </tr>
            </table>

            <!-- الـ QR المتوافق مع الفواتير الضريبية المبسطة -->
            <div class="qr-sec">
              ${qrSvg}
              <div class="qr-text">فوترة ضريبية مبسطة موثقة بالكامل ومتوافقة مع هيئة الزكاة والضريبة والجمارك (ZATCA)</div>
              <div style="font-size: 9px; margin-top: 3px;">تمت الفوترة السحابية عبر amine879mohamed@gmail.com بنجاح</div>
            </div>

            <!-- معلومات الضمان والأرشفة السفلية -->
            <div class="footer-info">
              <div>نشكركم على تعاملكم معنا، يرجى الاحتفاظ بهذه الفاتورة لسهولة الاسترجاع والضمان.</div>
              <div style="margin-top: 5px; font-family: 'Almarai', sans-serif; font-size: 10px; color: #cbd5e1;">مخازن سحابية للفوترة الموحدة | نظام السحاب المتكامل للتجارة والإنتاج</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    triggerNotification(`تم تجهيز قالب الطباعة والتصدير للفاتورة ${inv.id} بنجاح!`, 'green');
  };

  // معالجات الإرسال الفرعية الفورية للخادم
  const handleAddWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.name || !newWarehouse.location || !newWarehouse.capacity) {
      triggerNotification('الرجاء ملء حقول المستودع المطلوبة.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWarehouse.name,
          location: newWarehouse.location,
          capacity: Number(newWarehouse.capacity),
          description: newWarehouse.description
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification('تم تسجيل مستودع تخزيني جغرافي جديد بنجاح!', 'green');
        addActivity('system', `إنشاء مستودع جديد "${newWarehouse.name}" بسعة استيعابية قدرها ${newWarehouse.capacity} وحدة.`, newWarehouse.name);
        setNewWarehouse({ name: '', location: '', capacity: '', description: '' });
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حفظ المستودع.', 'red');
      }
    } catch (err) {
      triggerNotification('خطأ في الاتصال بالخادم لحفظ المستودع.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCashier) {
      triggerNotification('عفواً، لا يملك الكاشير صلاحية إنشاء أو إضافة تصنيفات جديدة.', 'red');
      return;
    }
    if (!newCategory.name) {
      triggerNotification('الرجاء إدخال اسم فئة التصنيف.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({ ...newCategory, userRole })
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification('تم تسجيل عائلة تصنيف جديدة للمنتجات بنجاح!', 'green');
        addActivity(
          'add_category', 
          `إضافة تصنيف منتجات جديد: "${newCategory.name}" بواسطة ${userName} (${userRole === 'admin' ? 'مدير نظام' : 'مدير مستودع'}).`, 
          newCategory.name,
          {
            entityType: 'category',
            action: 'create',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: newCategory.name
          }
        );
        setNewCategory({ name: '', description: '' });
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حفظ التصنيف.', 'red');
      }
    } catch (err) {
      triggerNotification('خطأ في الاتصال بالخادم لحفظ التصنيف.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح وتعديل منتج
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name.trim() || !editingProduct.sku.trim()) {
      triggerNotification('الرجاء تعبئة اسم ورمز SKU للمنتج.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification(`تم تحديث بيانات المنتج "${editingProduct.name}" بنجاح!`, 'green');
        addActivity(
          'edit_product',
          `تعديل بيانات المنتج "${editingProduct.name}" (SKU: ${editingProduct.sku}) بسعر ${editingProduct.price} ومخزون ${editingProduct.quantity} بواسطة ${userName} (${userRole === 'admin' ? 'مدير نظام' : 'مدير مستودع'}).`,
          editingProduct.sku,
          {
            entityType: 'product',
            action: 'update',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: editingProduct.name
          }
        );
        setEditingProduct(null);
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل تعديل بيانات المنتج.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لتعديل المنتج.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح وتعديل تصنيف
  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory({ ...cat });
  };

  const handleSaveCategoryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
      triggerNotification('الرجاء إدخال اسم التصنيف.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification(`تم تحديث تصنيف المنتجات "${editingCategory.name}" بنجاح!`, 'green');
        addActivity(
          'edit_category',
          `تعديل وتحديث تصنيف المنتجات "${editingCategory.name}" بواسطة ${userName} (${userRole === 'admin' ? 'مدير نظام' : 'مدير مستودع'}).`,
          editingCategory.id,
          {
            entityType: 'category',
            action: 'update',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: editingCategory.name
          }
        );
        setEditingCategory(null);
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل تعديل التصنيف.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لتعديل التصنيف.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name || !newSupplier.company || !newSupplier.phone) {
      triggerNotification('الرجاء إدخال الاسم، والشركة، وهاتف المورد.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/suppliers${editingSupplierId ? `/${editingSupplierId}` : ''}`, {
        method: editingSupplierId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification(editingSupplierId ? 'تم تحديث بيانات المورد بنجاح!' : 'تم تسجيل المورد في سجلات B2B بنجاح!', 'green');
        addActivity('system', `${editingSupplierId ? 'تحديث بيانات' : 'تسجيل المورد المعتمد'} "${newSupplier.name}" من شركة "${newSupplier.company}".`, newSupplier.name);
        setNewSupplier({ name: '', company: '', phone: '', email: '' });
        setEditingSupplierId(null);
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حفظ المورد.', 'red');
      }
    } catch (err) {
      triggerNotification('خطأ في الاتصال بالخادم لحفظ المورد.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      triggerNotification('الرجاء إدخال اسم وهاتف العميل.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/customers${editingCustomerId ? `/${editingCustomerId}` : ''}`, {
        method: editingCustomerId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification(editingCustomerId ? 'تم تحديث بيانات العميل بنجاح!' : 'تمت إضافة العميل إلى سجلات CRM بنجاح!', 'green');
        addActivity('system', `${editingCustomerId ? 'تحديث بيانات' : 'إضافة العميل المشترك'} "${newCustomer.name}" مع رقم الهاتف ${newCustomer.phone}.`, newCustomer.name);
        setNewCustomer({ name: '', phone: '', email: '', taxNumber: '' });
        setEditingCustomerId(null);
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل إضافة العميل.', 'red');
      }
    } catch (err) {
      triggerNotification('خطأ في الاتصال بالخادم لإضافة العميل.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovement.productId || !newMovement.quantity || !newMovement.warehouseId) {
      triggerNotification('الرجاء اختيار المنتج، وتحديد الكمية، واختيار المستودع.', 'red');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/stock-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newMovement.productId,
          type: newMovement.type,
          quantity: Number(newMovement.quantity),
          warehouseId: newMovement.warehouseId,
          notes: newMovement.notes || 'حركة تسوية مخزنية يدوية',
          recordedBy: userName
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerNotification('تم تسجيل وتسوية حركة المخزون بنجاح!', 'green');
        addActivity('stock_update', `تسجيل حركة مخزنية ${newMovement.type === 'in' ? 'توريد إدخال' : 'صرف إخراج'} للمنتج بمقدار ${newMovement.quantity} وحدة.`, newMovement.productId);
        setNewMovement({ productId: '', type: 'in', quantity: '', notes: '', warehouseId: '' });
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشلت تسوية حركة المخزون.', 'red');
      }
    } catch (err) {
      triggerNotification('خطأ في الاتصال لتسجيل حركة المخزون.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. حذف منتج محدد (متاح للأدمن ومدير المستودع)
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!canDeleteProductOrCategory) {
      triggerNotification('غير مصرح لك بحذف المنتجات. الصلاحية مقتصرة على الأدمن ومدير المستودع.', 'red');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف المنتج "${productName}" نهائياً من المستودع والنظام؟`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification(`تم حذف المنتج "${productName}" بنجاح.`, 'green');
        addActivity(
          'delete_product', 
          `حذف المنتج "${productName}" نهائياً من المستودع والنظام بواسطة ${userName} (${userRole === 'admin' ? 'مدير نظام' : 'مدير مستودع'}).`,
          productId,
          {
            entityType: 'product',
            action: 'delete',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: productName
          }
        );
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حذف المنتج.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لحذف المنتج.', 'red');
    }
  };

  // 2. حذف تصنيف منتجات (متاح للأدمن ومدير المستودع)
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!canDeleteProductOrCategory) {
      triggerNotification('غير مصرح لك بحذف التصنيفات. الصلاحية مقتصرة على الأدمن ومدير المستودع.', 'red');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف تصنيف المنتجات "${categoryName}"؟`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification(`تم حذف التصنيف "${categoryName}" بنجاح.`, 'green');
        addActivity(
          'delete_category', 
          `حذف تصنيف المنتجات "${categoryName}" بواسطة ${userName} (${userRole === 'admin' ? 'مدير نظام' : 'مدير مستودع'}).`,
          categoryId,
          {
            entityType: 'category',
            action: 'delete',
            performedBy: userName,
            performerRole: userRole === 'admin' ? 'مدير نظام' : userRole === 'manager' ? 'مدير مستودع' : 'كاشير',
            itemName: categoryName
          }
        );
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حذف التصنيف.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لحذف التصنيف.', 'red');
    }
  };

  // 3. حذف سجل عملية فردي من سجل الرقابة (للأدمن فقط)
  const handleDeleteActivity = async (activityId: string) => {
    if (!canManageSystemDeletions) {
      triggerNotification('غير مصرح لك. حذف سجلات الرقابة مقتصر حصراً على مدير النظام (الأدمن).', 'red');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/activities/${activityId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification('تم حذف سجل العملية بنجاح.', 'green');
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حذف سجل العملية.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لحذف السجل.', 'red');
    }
  };

  // 4. مسح كامل سجل العمليات دفعة واحدة (للأدمن فقط)
  const handleClearAllActivities = async () => {
    if (!canManageSystemDeletions) {
      triggerNotification('غير مصرح لك. تفريغ كامل سجل العمليات مقتصر حصراً على مدير النظام (الأدمن).', 'red');
      return;
    }
    if (!window.confirm('تحذير أمني: هل أنت متأكد من مسح وتفريغ كامل سجل العمليات والرقابة الفنية دفعة واحدة؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/activities`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification('تم مسح وتفريغ كامل سجل العمليات بنجاح.', 'green');
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل مسح السجلات.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لمسح السجلات.', 'red');
    }
  };

  // 5. حذف مستودع محدد (للأدمن فقط)
  const handleDeleteWarehouse = async (warehouseId: string, warehouseName: string) => {
    if (!canManageSystemDeletions) {
      triggerNotification('غير مصرح لك بحذف المستودعات. الصلاحية مقتصرة حصراً على مدير النظام (الأدمن).', 'red');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف المستودع "${warehouseName}"؟`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/warehouses/${warehouseId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification(`تم حذف المستودع "${warehouseName}" بنجاح.`, 'green');
        addActivity('system', `حذف المستودع "${warehouseName}" بواسطة مدير النظام.`);
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل حذف المستودع.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لحذف المستودع.', 'red');
    }
  };

  // 6. مسح كافة المستودعات دفعة واحدة (للأدمن فقط)
  const handleClearAllWarehouses = async () => {
    if (!canManageSystemDeletions) {
      triggerNotification('غير مصرح لك. مسح كافة المستودعات مقتصر حصراً على مدير النظام (الأدمن).', 'red');
      return;
    }
    if (!window.confirm('تحذير شديد الأهمية: هل أنت متأكد من حذف كافة المستودعات دفعة واحدة من النظام؟')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/warehouses`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerNotification('تم مسح وحذف كافة المستودعات بنجاح.', 'green');
        addActivity('system', 'مسح وتفريغ كافة المستودعات دفعة واحدة بواسطة مدير النظام.');
        await fetchBackendData();
      } else {
        triggerNotification(data.message || 'فشل مسح المستودعات.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لمسح المستودعات.', 'red');
    }
  };

  // حساب الإحصائيات والأرقام والمؤشرات
  const totalSalesSum = invoices
    .filter(inv => inv.status !== 'refunded')
    .reduce((sum, inv) => sum + (inv.totalAmount * 1.15), 0);

  const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= 10);
  const totalInStock = products.length;

  const currentChartPoints = chartTimeframe === 'weekly' ? weeklyChartData : monthlyChartData;
  const maxSalesValue = currentChartPoints.length > 0 ? Math.max(...currentChartPoints.map(p => p.sales), 100) : 100;

  // فلترة وتصنيف وعرض المنتجات
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()));
    
    const matchesCategory = !productCategoryFilter || p.category === productCategoryFilter;
    const matchesWarehouse = !productWarehouseFilter || p.warehouseId === productWarehouseFilter;
    const matchesLowStock = !productLowStockOnly || (p.quantity <= 10);

    return matchesSearch && matchesCategory && matchesWarehouse && matchesLowStock;
  });

  // تصفية حركات الإدخال والإخراج
  const filteredMovements = stockMovements.filter(m => {
    if (movementTypeFilter === 'all') return true;
    return m.type === movementTypeFilter;
  });

  return (
    <div id="dashboard-view-wrapper" className={`space-y-6 rounded-2xl transition-colors duration-500 ${darkMode ? '' : 'bg-[#eef1f3]'}`}>
      
      {/* 0. شريط التبويبات العلوي للوصول السريع لجميع أدوات SaaS المتقدمة */}
      <div className={`p-1.5 rounded-2xl flex flex-wrap gap-1 shadow-sm border transition-all duration-500 ${
        darkMode ? 'bg-[#05231b]/60 border-emerald-950/80' : 'bg-[#f8fafb] border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>اللوحة الإحصائية</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
            activeTab === 'products'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>الأصناف والمنتجات</span>
          {lowStockProducts.length > 0 && (
            <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-slate-950 animate-bounce">
              {lowStockProducts.length}
            </span>
          )}
        </button>

        {/* إدارة المخازن - محجوبة بالكامل عن رتبة الكاشير */}
        {!isCashier && (
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'warehouses'
                ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
                : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>إدارة المخازن</span>
            <span className="hidden sm:inline-block text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-[#10B981]">
              {warehouses.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>تصنيف المنتجات</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers_customers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'suppliers_customers'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>الموردين والعملاء</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>حركات المخزون</span>
        </button>

        <button
          onClick={() => setActiveTab('activities')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'activities'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>سجل العمليات</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
              : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>التقارير والتصدير</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#10B981] text-slate-950 shadow-md font-extrabold'
                : darkMode ? 'text-emerald-300 hover:bg-[#07362a]/50' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCog className="h-4 w-4" />
            <span>إدارة المستخدمين والحسابات</span>
          </button>
        )}
      </div>

      {/* ======================= التبويب الأول: اللوحة الإحصائية العامة ======================= */}
      {activeTab === 'overview' && (
        <>
          {/* مؤشرات الأداء والتحليلات الرئيسية - تخطيط متجاوب مرن يمنع تكدس البطاقات على التابلت */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* أ. إجمالي المبيعات */}
            <div className={`transition-all duration-500 border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md relative overflow-hidden ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-[#064E3B]" />
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <span className={`text-xs font-semibold block transition-colors duration-500 truncate ${darkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                    إجمالي المبيعات (شامل الضريبة 15%)
                  </span>
                  <h3 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono tracking-tight transition-colors duration-500 whitespace-nowrap ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>
                    {totalSalesSum.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-sans font-bold">ر.س</span>
                  </h3>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl transition-colors duration-500 shrink-0 ${darkMode ? 'bg-[#0b3d2f] text-emerald-300' : 'bg-emerald-50 text-[#064E3B]'}`}>
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 text-xs flex-wrap">
                <span className="flex items-center gap-0.5 text-[#22C55E] font-extrabold bg-[#22C55E]/10 px-2 py-0.5 rounded shrink-0">
                  <TrendingUp className="h-3 w-3" />
                  +15.2%
                </span>
                <span className={`transition-colors duration-500 text-[11px] truncate ${darkMode ? 'text-emerald-400/60' : 'text-slate-400'}`}>
                  حسابات مبيعات حية مؤكدة
                </span>
              </div>
            </div>

            {/* ب. الفواتير الصادرة */}
            <div className={`transition-all duration-500 border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md relative overflow-hidden ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-[#10B981]" />
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <span className={`text-xs font-semibold block transition-colors duration-500 truncate ${darkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                    عدد الفواتير الصادرة
                  </span>
                  <h3 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold font-mono tracking-tight transition-colors duration-500 whitespace-nowrap ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>
                    {invoices.length} <span className="text-sm font-sans font-bold">فواتير</span>
                  </h3>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl transition-colors duration-500 shrink-0 ${darkMode ? 'bg-[#0b3d2f] text-emerald-300' : 'bg-teal-50 text-[#10B981]'}`}>
                  <FileText className="h-5 w-5" />
                </div>
              </div>
              <div className={`mt-4 flex items-center justify-between text-xs transition-colors duration-500 gap-1 flex-wrap ${darkMode ? 'text-emerald-400/60' : 'text-slate-500'}`}>
                <span className="text-[11px] truncate">منها مدفوعة بالكامل:</span>
                <span className="font-mono text-[#10B981] font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                  {invoices.filter(inv => inv.status === 'paid').length} فواتير ناجحة
                </span>
              </div>
            </div>

            {/* ج. منبه البضائع المنخفضة */}
            <div className={`transition-all duration-500 border rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:shadow-md relative overflow-hidden sm:col-span-2 lg:col-span-1 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="absolute top-0 left-0 w-2 h-full bg-[#F59E0B]" />
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1 min-w-0">
                  <span className={`text-xs font-semibold block transition-colors duration-500 truncate ${darkMode ? 'text-emerald-300/80' : 'text-slate-500'}`}>
                    منتجات أوشكت على النفاد
                  </span>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#F59E0B] font-mono tracking-tight whitespace-nowrap">
                    {lowStockProducts.length} <span className="text-sm font-sans font-bold">أصناف</span>
                  </h3>
                </div>
                <div className={`p-2.5 sm:p-3 rounded-xl transition-colors duration-500 shrink-0 ${darkMode ? 'bg-[#0b3d2f] text-[#F59E0B]' : 'bg-amber-50 text-[#F59E0B]'}`}>
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                </div>
              </div>
              <div className={`mt-4 flex items-center justify-between gap-1.5 text-xs transition-colors duration-500 flex-wrap ${darkMode ? 'text-emerald-400/60' : 'text-slate-500'}`}>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444] shrink-0" />
                  <span>الحالة المقررة:</span>
                  <span className={`font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>متبقي 10 قطع أو أقل</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${darkMode ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>تنبيه المخزون</span>
              </div>
            </div>
          </div>

          {/* الرسم البياني وحالات الخطر السلعي */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* أ. رسم بياني تفاعلي SVG للمبيعات */}
            <div className={`transition-all duration-500 border rounded-2xl p-5 shadow-sm lg:col-span-2 space-y-4 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className={`flex justify-between items-center pb-2 border-b transition-colors duration-500 ${darkMode ? 'border-emerald-900/40' : 'border-slate-100'}`}>
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-1">
                    <Activity className="h-4.5 w-4.5 text-[#10B981]" />
                    <span>منحنى تحليل مبيعات وحركة الفواتير</span>
                  </h4>
                  <span className={`text-[10px] ${darkMode ? 'text-emerald-500/50' : 'text-slate-400'}`}>مقارنة الفوترة بحجم المداخيل</span>
                </div>
                <div className="flex gap-1.5 bg-slate-100 dark:bg-[#031510] p-1 rounded-xl">
                  <button 
                    onClick={() => setChartTimeframe('weekly')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition ${
                      chartTimeframe === 'weekly' 
                        ? 'bg-[#10B981] text-slate-950 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-emerald-400'
                    }`}
                  >
                    أسبوعي
                  </button>
                  <button 
                    onClick={() => setChartTimeframe('monthly')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition ${
                      chartTimeframe === 'monthly' 
                        ? 'bg-[#10B981] text-slate-950 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-emerald-400'
                    }`}
                  >
                    شهري
                  </button>
                </div>
              </div>

              {/* ريندر الرسم البياني من ريتشارتس Recharts */}
              <div className="h-72 w-full pt-2 min-w-0">
                {userRole === 'manager' ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-[#031510]/30 rounded-xl border border-dashed border-emerald-900/10">
                    <ShieldAlert className="h-10 w-10 text-amber-500 mb-2 animate-bounce" />
                    <h5 className="font-bold text-xs">صلاحيات محدودة لمستودع المخازن</h5>
                    <p className="text-[10px] text-slate-450 mt-1">كأمين مستودع، تم إخفاء الرسوم البيانية الخاصة بالأرباح وإجمالي المبيعات لأسباب الأمان المالي.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={currentChartPoints}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#0a362a' : '#f1f5f9'} />
                      <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <RechartsTooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ChartPoint;
                          return (
                            <div className={`p-3 border rounded-xl shadow-xl text-xs space-y-1 font-sans ${
                              darkMode ? 'bg-[#05231b] border-emerald-900 text-white' : 'bg-white border-slate-100 text-slate-800'
                            }`}>
                              <p className="font-bold text-[#10B981]">{data.label}</p>
                              <p>حجم مبيعات: <strong className="font-mono">{data.sales.toLocaleString()} ر.س</strong></p>
                              <p>فواتير صادرة: <strong className="font-mono text-emerald-450">{data.invoices} فواتير</strong></p>
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Area type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="المبيعات" />
                      <Line type="monotone" dataKey="invoices" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 6 }} name="الفواتير" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ب. ملخص العمليات وقائمة الأصناف المهددة بالنفاد */}
            <div className={`transition-all duration-500 border rounded-2xl p-5 shadow-sm space-y-4 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="pb-2 border-b border-emerald-900/10 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                    <span>تنبيهات انخفاض المخزون</span>
                  </h4>
                  <span className={`text-[10px] ${darkMode ? 'text-emerald-500/50' : 'text-slate-400'}`}>الأصناف التي متبقي منها 10 قطع أو أقل</span>
                </div>
                <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold animate-pulse">هام</span>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Check className="h-8 w-8 text-emerald-500 mx-auto bg-emerald-500/10 p-1.5 rounded-full" />
                  <p className="text-xs font-bold text-emerald-500">كل السلع متوفرة بمخزون آمن وعالٍ!</p>
                  <p className="text-[10px] text-slate-400">لا توجد أصناف في منطقة الخطر أو قاربت على النفاد.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {lowStockProducts.map(p => (
                    <div 
                      key={p.id} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                        darkMode ? 'bg-[#042018]/50 border-emerald-950 hover:bg-[#042018]' : 'bg-amber-50/30 border-amber-100/50 hover:bg-amber-50/80'
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold">{p.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku} | فئة {p.category}</span>
                      </div>
                      <div className="text-left space-y-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold block text-center ${
                          p.quantity === 0 
                            ? 'bg-red-500/15 text-red-500' 
                            : 'bg-amber-500/15 text-amber-600'
                        }`}>
                          {p.quantity === 0 ? 'نفد تماماً' : `متبقي ${p.quantity} قطع`}
                        </span>
                        
                        {hasWriteAccess && (
                          <button
                            onClick={() => handleQuickQuantityUpdate(p.id, p.quantity + 20)}
                            className="text-[9px] text-[#10B981] hover:underline block w-full text-left font-bold"
                          >
                            + توريد 20 قطعة
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ======================= التبويب الثاني: إدارة البضائع والمنتجات ======================= */}
      {activeTab === 'products' && (
        <div className={`p-6 rounded-2xl border transition-all duration-500 ${
          darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
        }`}>
          {/* شريط الإجراءات والبحث الفلترة */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-900/10 mb-6">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-emerald-400">سجل ودليل البضائع والمنتجات المودعة</h3>
              <p className="text-xs text-slate-400">إجمالي الأصناف الفعالة بالمستودع: {products.length} أصناف تجارية</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setProductLowStockOnly(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition ${
                  productLowStockOnly 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                    : darkMode ? 'border-emerald-900 text-emerald-400 hover:bg-[#031510]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>عرض النواقص فقط</span>
              </button>

              {hasWriteAccess && !isCashier && (
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs px-4 py-2 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>تأسيس صنف بضاعة</span>
                </button>
              )}
            </div>
          </div>

          {/* تصفية وبحث متقدم */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم، SKU، أو المواصفات..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={`w-full pr-9 pl-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                  darkMode 
                    ? 'bg-[#031510] border-emerald-900/60 text-emerald-100 placeholder-emerald-900 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                }`}
              />
            </div>

            <div>
              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                  darkMode 
                    ? 'bg-[#031510] border-emerald-900/60 text-emerald-100 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="">-- فلترة حسب عائلة الفئة --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={productWarehouseFilter}
                onChange={(e) => setProductWarehouseFilter(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none transition-all ${
                  darkMode 
                    ? 'bg-[#031510] border-emerald-900/60 text-emerald-100 focus:border-emerald-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
              >
                <option value="">-- فلترة حسب المستودع --</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* جدول البضائع الأساسي */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className={`border-b ${darkMode ? 'border-emerald-900/40 text-emerald-300' : 'border-slate-100 text-[#064E3B]'} font-extrabold`}>
                  <th className="pb-3 text-center w-12">#</th>
                  <th className="pb-3">تفاصيل الصنف</th>
                  <th className="pb-3 font-mono">SKU</th>
                  <th className="pb-3">الفئة والتصنيف</th>
                  <th className="pb-3">المستودع الرئيسي</th>
                  <th className="pb-3 text-center">السعر المعتمد</th>
                  <th className="pb-3 text-center">الرصيد الفعلي</th>
                  <th className="pb-3 text-center">الحالة</th>
                  {hasWriteAccess && <th className="pb-3 text-center">إجراءات وتحديث الأرصدة</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-slate-400">
                      لا توجد بضائع تطابق محددات البحث والفلترة الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, index) => {
                    const matchedWh = warehouses.find(wh => wh.id === p.warehouseId);
                    const stockStatus = p.quantity === 0 
                      ? { label: 'نفد', color: 'bg-red-500/10 text-red-500' }
                      : p.quantity <= 10 
                      ? { label: 'منخفض', color: 'bg-amber-500/10 text-amber-500' }
                      : { label: 'آمن', color: 'bg-emerald-500/10 text-emerald-500' };

                    return (
                      <tr key={p.id} className="hover:bg-slate-500/5 transition duration-150">
                        <td className="py-3.5 text-center font-bold text-slate-450">{index + 1}</td>
                        <td className="py-3.5">
                          <p className="font-bold">{p.name}</p>
                          <span className={`text-[10px] block mt-0.5 ${darkMode ? 'text-emerald-500/40' : 'text-slate-400'}`}>
                            {p.description || 'لا يوجد تفاصيل إضافية.'}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono font-semibold">{p.sku}</td>
                        <td className="py-3.5 font-bold text-[#10B981]">{p.category}</td>
                        <td className="py-3.5 text-slate-450">{matchedWh ? matchedWh.name : 'مستودع غير مخصص'}</td>
                        <td className="py-3.5 text-center font-mono font-bold">{p.price.toFixed(2)} ر.س</td>
                        <td className="py-3.5 text-center font-mono font-bold">{p.quantity} وحدة</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stockStatus.color}`}>
                            {stockStatus.label}
                          </span>
                        </td>
                        {hasWriteAccess && (
                          <td className="py-3.5 text-center">
                            <div className="inline-flex items-center gap-1.5 justify-center">
                              <button 
                                onClick={() => handleQuickQuantityUpdate(p.id, Math.max(0, p.quantity - 5))}
                                className="h-6 w-6 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold flex items-center justify-center text-[10px] cursor-pointer"
                                title="نقص مخزون الصنف بـ 5"
                              >
                                -5
                              </button>
                              <button 
                                onClick={() => handleQuickQuantityUpdate(p.id, p.quantity + 10)}
                                className="h-6 w-6 rounded bg-[#10B981]/15 hover:bg-[#10B981]/30 text-[#10B981] font-bold flex items-center justify-center text-[10px] cursor-pointer"
                                title="زيادة شحنة توريد بـ 10"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="h-6 w-6 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] transition cursor-pointer"
                                title="تعديل بيانات المنتج"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              {canDeleteProductOrCategory && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id, p.name)}
                                  className="h-6 w-6 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-[10px] transition cursor-pointer"
                                  title="حذف هذا المنتج نهائياً (للأدمن ومدير المستودع)"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= التبويب الثالث: إدارة المستودعات والمخازن (محجوب عن الكاشير) ======================= */}
      {activeTab === 'warehouses' && !isCashier && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قائمة المستودعات الفعالة */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-900/10 mb-5">
              <h3 className="font-bold text-base text-[#10B981]">دليل المستودعات التخزينية وحجم الإشغال</h3>
              {canManageSystemDeletions && warehouses.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllWarehouses}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                  title="مسح وتفريغ كافة المستودعات دفعة واحدة (للأدمن فقط)"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>مسح كافة المستودعات</span>
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {warehouses.map(wh => {
                // حساب عدد السلع والقطع المسكنة في هذا المستودع
                const warehouseProducts = products.filter(p => p.warehouseId === wh.id);
                const totalUnits = warehouseProducts.reduce((sum, p) => sum + p.quantity, 0);
                const occupancyPercentage = Math.min(100, Math.round((totalUnits / wh.capacity) * 100));

                return (
                  <div key={wh.id} className={`light-content-item p-5 rounded-2xl border transition hover:shadow-md ${
                    darkMode ? 'bg-[#042018]/50 border-emerald-950' : 'bg-slate-50/40 border-slate-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-emerald-500" />
                          <h4 className="font-bold text-sm">{wh.name}</h4>
                          {canManageSystemDeletions && (
                            <button
                              type="button"
                              onClick={() => handleDeleteWarehouse(wh.id, wh.name)}
                              className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              title="حذف هذا المستودع نهائياً (للأدمن فقط)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-450 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-red-400" />
                          <span>{wh.location}</span>
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">إجمالي السلع المسكنة</span>
                        <strong className="text-xs font-mono">{warehouseProducts.length} أصناف ({totalUnits} قطع)</strong>
                      </div>
                    </div>

                    <p className={`text-xs mt-3 leading-relaxed ${darkMode ? 'text-emerald-400/60' : 'text-slate-500'}`}>
                      {wh.description || 'لا يوجد وصف تفصيلي.'}
                    </p>

                    {/* بار الإشغال والقدرة الاستيعابية */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span>حجم شغل الحيز للمستودع</span>
                        <span className="font-mono font-bold text-[#10B981]">{occupancyPercentage}% ({totalUnits} / {wh.capacity} وحدة قصوى)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-[#031510] h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            occupancyPercentage > 85 ? 'bg-red-500' : occupancyPercentage > 60 ? 'bg-amber-500' : 'bg-[#10B981]'
                          }`}
                          style={{ width: `${occupancyPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* إضافة مستودع جديد */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <h3 className="font-bold text-base text-[#10B981] pb-3 border-b border-emerald-900/10 mb-5">تأسيس مستودع جديد</h3>
            
            {hasWriteAccess ? (
              <form onSubmit={handleAddWarehouseSubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>اسم المستودع أو الفرع</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مستودع المنطقة الشرقية"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all focus:ring-1 focus:ring-[#10B981]/20 ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>العنوان التفصيلي / الموقع الجغرافي</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الدمام - المدينة الصناعية الثانية"
                    value={newWarehouse.location}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, location: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>السعة التخزينية الإجمالية بالوحدات</label>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="أقصى كمية بضائع مثل: 10000"
                    value={newWarehouse.capacity}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, capacity: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all focus:ring-1 focus:ring-[#10B981]/20 ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>توصيف المستودع وإجراءات الأمان</label>
                  <textarea
                    placeholder="مثال: مستودع مبرد للأحذية والسلع الحساسة للحرارة..."
                    value={newWarehouse.description}
                    onChange={(e) => setNewWarehouse(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all h-20 resize-none focus:ring-1 focus:ring-[#10B981]/20 ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs py-2.5 rounded-xl shadow cursor-pointer text-center"
                >
                  {isSubmitting ? 'جاري الحفظ والإنشاء...' : 'حفظ وتسجيل المستودع'}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-red-500/10 text-red-500 rounded-xl space-y-2 text-xs flex flex-col items-center text-center">
                <ShieldAlert className="h-8 w-8 animate-bounce mb-1" />
                <h5 className="font-bold">مرفوض: غير مصرح لك بالتأسيس</h5>
                <p className="text-[11px] text-slate-450 leading-relaxed">صلاحية أمين الخزينة أو المشغل لا تتيح إنشاء مستودعات جديدة. يرجى مراجعة إدارة تكنولوجيا المعلومات لمنحك صلاحيات (مدير مستودع أو مسؤول).</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= التبويب الرابع: تصنيفات عوائل المنتجات ======================= */}
      {activeTab === 'categories' && (
        <div className={`grid grid-cols-1 ${!isCashier ? 'lg:grid-cols-3' : ''} gap-6`}>
          {/* دليل التصنيفات الحالي */}
          <div className={`${!isCashier ? 'lg:col-span-2' : 'w-full'} p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <h3 className="font-bold text-base text-[#10B981] pb-3 border-b border-emerald-900/10 mb-5">قائمة عوائل وتصنيفات المنتجات المعتمدة</h3>
            
            <div className={`grid grid-cols-1 ${!isCashier ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {categories.map(cat => {
                // حساب عدد منتجات هذا التصنيف
                const count = products.filter(p => p.category === cat.name).length;

                return (
                  <div key={cat.id} className={`light-content-item p-4 rounded-xl border flex flex-col justify-between hover:shadow-sm transition ${
                    darkMode ? 'bg-[#042018]/50 border-emerald-950' : 'bg-slate-50/40 border-slate-100'
                  }`}>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{cat.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-[#10B981]/15 text-[#10B981] px-2 py-0.5 rounded font-mono font-bold">
                            {count} أصناف
                          </span>
                          {hasWriteAccess && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition cursor-pointer"
                              title="تعديل بيانات هذا التصنيف"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDeleteProductOrCategory && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              title="حذف هذا التصنيف (للأدمن ومدير المستودع)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs ${darkMode ? 'text-emerald-500/60' : 'text-slate-500'}`}>
                        {cat.description || 'لا يوجد وصف تفصيلي.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* نموذج إضافة تصنيف جديد (مخصص للأدمن ومدير المستودع ومحجوب تماماً عن رتبة الكاشير) */}
          {!isCashier && (
            <div className={`p-6 rounded-2xl border transition-all duration-500 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <h3 className="font-bold text-base text-[#10B981] pb-3 border-b border-emerald-900/10 mb-5">إنشاء تصنيف جديد</h3>
              
              <form onSubmit={handleAddCategorySubmit} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>اسم التصنيف / العائلة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أجهزة كهربائية"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>شرح ووصف الفئة (اختياري)</label>
                  <textarea
                    placeholder="تفاصيل تصفية هذا التصنيف لتسهيل البحث على محاسبين الكاشير..."
                    value={newCategory.description}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all h-24 resize-none ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs py-2.5 rounded-xl shadow cursor-pointer text-center"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفئة في السجلات'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ======================= التبويب الخامس: الموردين والعملاء ======================= */}
      {activeTab === 'suppliers_customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* قسم الموردين */}
            <div className={`p-6 rounded-2xl border transition-all duration-500 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="flex justify-between items-center pb-3 border-b border-emerald-900/10 mb-4">
                <h3 className="font-bold text-sm sm:text-base text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="h-5 w-5 text-emerald-500" />
                  <span>دليل الموردين (B2B Procurement)</span>
                </h3>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-500 font-bold">
                  {suppliers.length} موردين معتمدين
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {suppliers.map(sup => (
                  <div key={sup.id} className={`light-content-item p-4 rounded-xl border text-xs space-y-1.5 transition ${
                    darkMode ? 'bg-[#031510]/30 border-emerald-950' : 'bg-slate-50/40 border-slate-100'
                  }`}>
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-white">{sup.name}</strong>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-500/10 px-2 py-0.5 rounded font-semibold">{sup.company}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            title="تعديل بيانات المورد"
                            aria-label={`تعديل بيانات المورد ${sup.name}`}
                            onClick={() => {
                              setEditingSupplierId(sup.id);
                              setNewSupplier({ name: sup.name, company: sup.company, phone: sup.phone, email: sup.email });
                            }}
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-emerald-950/20">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-500" />
                        <span>{sup.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-[#10B981]" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* إضافة مورد */}
              <div className="mt-6 pt-4 border-t border-dashed border-emerald-900/20">
                <h4 className="font-bold text-xs text-white mb-3">{editingSupplierId ? 'تعديل بيانات المورد' : 'تسجيل مورد B2B جديد'}</h4>
                <form onSubmit={handleAddSupplierSubmit} className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">اسم الممثل / المورد</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: المهندس يوسف حسن"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">اسم الشركة / المصنع</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: شركة النخبة للتوريدات"
                      value={newSupplier.company}
                      onChange={(e) => setNewSupplier(prev => ({ ...prev, company: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">رقم الهاتف النشط</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 0500000000"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">البريد الإلكتروني للطلبيات</label>
                    <input
                      type="email"
                      required
                      placeholder="supplier@company.sa"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded shadow text-xs mt-1"
                  >
                    {editingSupplierId ? 'حفظ تعديلات المورد' : 'تسجيل المورد وحفظه في سجلات B2B'}
                  </button>
                  {editingSupplierId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplierId(null);
                        setNewSupplier({ name: '', company: '', phone: '', email: '' });
                      }}
                      className="col-span-2 text-slate-400 hover:text-white font-semibold py-1 text-xs cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* قسم العملاء */}
            <div className={`p-6 rounded-2xl border transition-all duration-500 ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <div className="flex justify-between items-center pb-3 border-b border-emerald-900/10 mb-4">
                <h3 className="font-bold text-sm sm:text-base text-emerald-400 flex items-center gap-1.5">
                  <Users className="h-5 w-5 text-emerald-500" />
                  <span>سجل العملاء التجاريين (CRM Directory)</span>
                </h3>
                <span className="text-[10px] bg-[#10B981]/15 px-2 py-0.5 rounded text-[#10B981] font-bold">
                  {customers.length} عملاء نشطين
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {customers.map(cust => (
                  <div key={cust.id} className={`light-content-item p-4 rounded-xl border text-xs space-y-1.5 transition ${
                    darkMode ? 'bg-[#031510]/30 border-emerald-950' : 'bg-slate-50/40 border-slate-100'
                  }`}>
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-white">{cust.name}</strong>
                      <div className="flex items-center gap-2">
                        {cust.taxNumber ? (
                          <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-[#10B981] font-mono">
                            ضريبي: {cust.taxNumber}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">عميل تجزئة مبسط</span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            title="تعديل بيانات العميل"
                            aria-label={`تعديل بيانات العميل ${cust.name}`}
                            onClick={() => {
                              setEditingCustomerId(cust.id);
                              setNewCustomer({ name: cust.name, phone: cust.phone, email: cust.email, taxNumber: cust.taxNumber || '' });
                            }}
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-emerald-950/20">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-500" />
                        <span>{cust.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-[#10B981]" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* إضافة عميل */}
              <div className="mt-6 pt-4 border-t border-dashed border-emerald-900/20">
                <h4 className="font-bold text-xs text-white mb-3">{editingCustomerId ? 'تعديل بيانات العميل' : 'إضافة عميل / شريك تجاري جديد'}</h4>
                <form onSubmit={handleAddCustomerSubmit} className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">اسم العميل / المؤسسة</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: الأستاذ هاني منصور"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">رقم الهاتف</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 0550000000"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">البريد الإلكتروني للعميل</label>
                    <input
                      type="email"
                      placeholder="customer@email.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] mb-1 font-semibold text-slate-400">الرقم الضريبي للمنشأة (إن وجد)</label>
                    <input
                      type="text"
                      placeholder="15 خانة ضريبية مبسطة"
                      value={newCustomer.taxNumber}
                      onChange={(e) => setNewCustomer(prev => ({ ...prev, taxNumber: e.target.value }))}
                      className={`w-full px-2.5 py-1.5 text-xs rounded border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <button
                    type="submit"
                    className="col-span-2 bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded shadow text-xs mt-1"
                  >
                    {editingCustomerId ? 'حفظ تعديلات العميل' : 'تسجيل وإدراج العميل في الدليل'}
                  </button>
                  {editingCustomerId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomerId(null);
                        setNewCustomer({ name: '', phone: '', email: '', taxNumber: '' });
                      }}
                      className="col-span-2 text-slate-400 hover:text-white font-semibold py-1 text-xs cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= التبويب السادس: حركات المخزون والإدخال والإخراج ======================= */}
      {activeTab === 'movements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* سجل الحركات الموثق */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <div className="flex justify-between items-center pb-3 border-b border-emerald-900/10 mb-5">
              <div>
                <h3 className="font-bold text-base text-emerald-400">سجل حركات البضائع والمستندات</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">أرشيف شامل لعمليات الشحن، الاستلام والتسويات</p>
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-[#031510] p-1 rounded-xl text-[10px] font-bold">
                <button 
                  onClick={() => setMovementTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${movementTypeFilter === 'all' ? 'bg-[#10B981] text-slate-950 font-bold' : 'text-slate-450'}`}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setMovementTypeFilter('in')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${movementTypeFilter === 'in' ? 'bg-[#10B981] text-slate-950 font-bold' : 'text-slate-450'}`}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>إدخال</span>
                </button>
                <button 
                  onClick={() => setMovementTypeFilter('out')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${movementTypeFilter === 'out' ? 'bg-[#10B981] text-slate-950 font-bold' : 'text-slate-450'}`}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  <span>صرف</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  لا توجد حركات مسجلة تحت هذا التصنيف حالياً.
                </div>
              ) : (
                filteredMovements.map(mov => (
                  <div key={mov.id} className={`light-content-item p-4 rounded-xl border flex justify-between items-center text-xs transition hover:shadow-sm ${
                    darkMode ? 'bg-[#042018]/40 border-emerald-950' : 'bg-slate-50/40 border-slate-100'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                          mov.type === 'in' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {mov.type === 'in' ? (
                            <>
                              <ArrowDownToLine className="h-3 w-3" />
                              <span>توريد إدخال</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpFromLine className="h-3 w-3" />
                              <span>صرف وتصدير</span>
                            </>
                          )}
                        </span>
                        <strong className="text-sm font-bold">{mov.productName}</strong>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        كمية الحركة: <span className="font-bold text-white">{mov.quantity} وحدة</span> | مستودع: {mov.warehouseName}
                      </p>
                      <p className={`text-[10px] italic ${darkMode ? 'text-emerald-500/60' : 'text-slate-500'}`}>ملاحظة: {mov.notes}</p>
                    </div>

                    <div className="text-left space-y-1">
                      <span className="text-[9px] text-slate-400 block font-mono">{mov.timestamp}</span>
                      <span className="text-[10px] bg-slate-500/10 px-2 py-0.5 rounded text-slate-450 block text-center">
                        بواسطة: {mov.recordedBy}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* نموذج إدخال حركة مخزنية يدوية */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <h3 className="font-bold text-base text-[#10B981] pb-3 border-b border-emerald-900/10 mb-5">تسجيل حركة تسوية مخزنية يدوية</h3>
            
            {hasWriteAccess ? (
              <form onSubmit={handleAddMovementSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-400">حدد المنتج المعني</label>
                  <select
                    required
                    value={newMovement.productId}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, productId: e.target.value }))}
                    className={`w-full text-xs rounded px-3 py-2 outline-none border ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- اختر صنفاً مخزنياً --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (متوفر: {p.quantity} قطع)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-400">نوع الحركة</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewMovement(prev => ({ ...prev, type: 'in' }))}
                      className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                        newMovement.type === 'in' 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>إدخال / توريد جديد</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewMovement(prev => ({ ...prev, type: 'out' }))}
                      className={`py-2 rounded font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                        newMovement.type === 'out' 
                          ? 'bg-red-500/20 border-red-500 text-red-500' 
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      <span>صرف / تصدير سلع</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-400">كمية الحركة بالوحدات</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="مثال: 50"
                    value={newMovement.quantity}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: e.target.value }))}
                    className={`w-full text-xs rounded px-3 py-2 outline-none border ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-400">المستودع المستضيف للحركة</label>
                  <select
                    required
                    value={newMovement.warehouseId}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, warehouseId: e.target.value }))}
                    className={`w-full text-xs rounded px-3 py-2 outline-none border ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- اختر مستودعاً جغرافياً --</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-400">أسباب التسوية والتفاصيل</label>
                  <textarea
                    required
                    placeholder="تفاصيل الحركة مثل: جرد سنوي، توريد من المورد، تحويل لفرع آخر..."
                    value={newMovement.notes}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, notes: e.target.value }))}
                    className={`w-full text-xs rounded px-3 py-2 outline-none h-20 resize-none border ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs py-2.5 rounded-xl shadow cursor-pointer text-center"
                >
                  {isSubmitting ? 'جاري تسجيل التسوية...' : 'حفظ وتسوية حركة المخزون'}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-red-500/10 text-red-500 rounded-xl space-y-2 text-xs flex flex-col items-center text-center">
                <ShieldAlert className="h-8 w-8 animate-bounce mb-1" />
                <h5 className="font-bold">مرفوض: صلاحيات محدودة</h5>
                <p className="text-[11px] text-slate-450 leading-relaxed">فقط مدراء المستودعات والمسؤولين يمتلكون حق تعديل أو تسوية الأرصدة يدوياً.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= التبويب السابع: سجل عمليات النظام والـ Logs ======================= */}
      {activeTab === 'activities' && (
        <div className="space-y-6">

          {/* ========================================================================= */}
          {/* قسم تدقيق ورقابة عمليات المنتجات والأصناف (خاص بمدير النظام فقط - Admin Only) */}
          {/* ========================================================================= */}
          {isAdmin && (
            <div className={`p-6 rounded-2xl border transition-all duration-500 ${
              darkMode 
                ? 'bg-gradient-to-b from-[#06271c] to-[#02130e] border-emerald-500/30 text-white shadow-xl shadow-emerald-950/50' 
                : 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-200 text-slate-900 shadow-sm'
            }`}>
              {/* ترويسة القسم الحصري للأدمن */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-500/20 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>قسم خاص بمدير النظام فقط (Admin Exclusive)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      تتبع الرقابة والامتثال الداخلي
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-emerald-400 flex items-center gap-2">
                    <History className="h-5 w-5 text-emerald-400" />
                    <span>سجل رقابة عمليات المنتجات والأصناف (من قام بالإجراء)</span>
                  </h3>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-emerald-200/70' : 'text-slate-600'}`}>
                    رصد توثيقي دقيق لجميع عمليات إنشاء، إضافة، تعديل، وحذف المنتجات والتصنيفات، موضحاً اسم ورتبة منفّذ العملية والتوقيت الفعلي.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {filteredAuditList.length} عملية مسجلة
                  </span>
                </div>
              </div>

              {/* بطاقات الإحصائيات الأربع المصغرة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className={`p-3.5 rounded-xl border ${
                  darkMode ? 'bg-[#031c14]/80 border-emerald-900/60' : 'bg-white border-emerald-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">إضافة وإنشاء</span>
                    <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                      <PackagePlus className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-emerald-400">{auditKpis.createdCount}</span>
                    <span className="text-[10px] text-slate-400">عملية</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  darkMode ? 'bg-[#031c14]/80 border-emerald-900/60' : 'bg-white border-emerald-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">تعديل وتحديث</span>
                    <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-amber-400">{auditKpis.updatedCount}</span>
                    <span className="text-[10px] text-slate-400">عملية</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  darkMode ? 'bg-[#031c14]/80 border-emerald-900/60' : 'bg-white border-emerald-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">حذف واستبعاد</span>
                    <span className="p-1 rounded-md bg-red-500/20 text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-red-400">{auditKpis.deletedCount}</span>
                    <span className="text-[10px] text-slate-400">عملية</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  darkMode ? 'bg-[#031c14]/80 border-emerald-900/60' : 'bg-white border-emerald-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">إجمالي الرقابة</span>
                    <span className="p-1 rounded-md bg-blue-500/20 text-blue-400">
                      <Activity className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-blue-400">{auditKpis.totalCount}</span>
                    <span className="text-[10px] text-slate-400">سجل</span>
                  </div>
                </div>
              </div>

              {/* شريط الفلاتر والبحث */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setAuditFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      auditFilter === 'all'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-slate-300 hover:bg-emerald-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    الكل ({auditKpis.totalCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter('create')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      auditFilter === 'create'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-emerald-400 hover:bg-emerald-950' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <span>+ إضافة وإنشاء ({auditKpis.createdCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter('update')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      auditFilter === 'update'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-amber-400 hover:bg-emerald-950' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    <span>التعديل ({auditKpis.updatedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter('delete')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      auditFilter === 'delete'
                        ? 'bg-red-600 text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-red-400 hover:bg-emerald-950' : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>الحذف ({auditKpis.deletedCount})</span>
                  </button>

                  <span className="text-slate-500 mx-1">|</span>

                  <button
                    type="button"
                    onClick={() => setAuditFilter('products')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      auditFilter === 'products'
                        ? 'bg-[#10B981] text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-slate-300 hover:bg-emerald-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Package className="h-3 w-3" />
                    <span>المنتجات ({auditKpis.productsCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuditFilter('categories')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      auditFilter === 'categories'
                        ? 'bg-[#10B981] text-white shadow-sm'
                        : darkMode ? 'bg-[#031510] text-slate-300 hover:bg-emerald-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    <span>التصنيفات ({auditKpis.categoriesCount})</span>
                  </button>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="بحث باسم الصنف أو من قام بالعملية..."
                    className={`w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border outline-none transition ${
                      darkMode 
                        ? 'bg-[#031510] border-emerald-900/60 text-white placeholder-slate-500 focus:border-emerald-400' 
                        : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
                    }`}
                  />
                  {auditSearch && (
                    <button 
                      onClick={() => setAuditSearch('')}
                      className="absolute left-2.5 top-2 text-xs text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* جدول تدقيق العمليات */}
              <div className="overflow-x-auto rounded-xl border border-emerald-500/20 max-h-[460px] overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-[#021811] text-emerald-300' : 'bg-emerald-50/90 text-emerald-900'}`}>
                    <tr className="border-b border-emerald-500/20">
                      <th className="py-2.5 px-3">نوع الإجراء</th>
                      <th className="py-2.5 px-3">الكيان</th>
                      <th className="py-2.5 px-3">اسم الصنف / المنتج</th>
                      <th className="py-2.5 px-3">من قام بالعملية</th>
                      <th className="py-2.5 px-3">رتبة المستخدم</th>
                      <th className="py-2.5 px-3">التوقيت والتاريخ</th>
                      <th className="py-2.5 px-3">بيان وتفاصيل الإجراء</th>
                      <th className="py-2.5 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    {filteredAuditList.map((item) => {
                      const actionBadge = item.action === 'create'
                        ? { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'إضافة / إنشاء', icon: Plus }
                        : item.action === 'update'
                        ? { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'تعديل وتحديث', icon: Pencil }
                        : item.action === 'delete'
                        ? { bg: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'حذف واستبعاد', icon: Trash2 }
                        : { bg: 'bg-slate-500/15 text-slate-300 border-slate-500/30', label: 'إجراء', icon: Activity };

                      const ActionIcon = actionBadge.icon;

                      const roleBadge = item.performerRole?.includes('مدير نظام')
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : item.performerRole?.includes('مدير مستودع')
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-blue-500/15 text-blue-300 border-blue-500/30';

                      return (
                        <tr 
                          key={item.id} 
                          className={`transition ${darkMode ? 'hover:bg-emerald-950/40' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${actionBadge.bg}`}>
                              <ActionIcon className="h-3 w-3" />
                              <span>{actionBadge.label}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.entityType === 'product' ? (
                              <span className="font-semibold text-emerald-300 inline-flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>منتج</span>
                              </span>
                            ) : (
                              <span className="font-semibold text-teal-300 inline-flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                <span>تصنيف</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold">{item.itemName}</span>
                            {item.meta && (
                              <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                                SKU: {item.meta}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{item.performedBy}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${roleBadge}`}>
                              {item.performerRole}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            {item.timestamp}
                          </td>
                          <td className="py-2.5 px-3 max-w-[280px]">
                            <p className="line-clamp-2 text-slate-300 text-[11px]">
                              {item.message}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(item.id)}
                              className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              title="حذف هذا السجل الرقابي"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredAuditList.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50 text-emerald-400" />
                    <p className="font-bold text-sm">لا توجد عمليات تطابق الفلتر أو البحث المحدد</p>
                    <p className="text-xs mt-1">يتم هنا توثيق كل عملية إنشاء، إضافة، تعديل، أو حذف تطرأ على المنتجات والتصنيفات فور وقوعها مع إبراز اسم المنفذ.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================= السجل العام للعمليات ======================= */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-900/10 mb-5">
              <div>
                <h3 className="font-bold text-base text-emerald-400">أرشيف العمليات والرقابة الفنية (System Audit Log)</h3>
                <p className="text-xs text-slate-400 mt-0.5">مراقبة حية لجميع الأحداث المسجلة للتحقق ومكافحة التلاعب</p>
              </div>
              
              <div className="flex items-center gap-2">
                {canManageSystemDeletions && activities.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllActivities}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1.5 transition cursor-pointer"
                    title="مسح وتفريغ كامل سجل العمليات دفعة واحدة (للأدمن فقط)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>مسح كامل السجل دفعة واحدة</span>
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-[#10B981] bg-emerald-500/15">
                  <Clock className="h-4 w-4" />
                  <span className="font-bold">مزامنة تتبع حية</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {activities.map(act => (
                <div 
                  key={act.id} 
                  className={`light-content-item p-4 rounded-xl border flex items-center justify-between gap-3 text-xs transition hover:bg-slate-500/5 ${
                    darkMode ? 'bg-[#031510]/50 border-emerald-950/40' : 'bg-slate-50/20 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      act.type === 'add_invoice' 
                        ? 'bg-blue-500/10 text-blue-500' 
                        : act.type === 'add_product' 
                        ? 'bg-emerald-500/10 text-[#10B981]' 
                        : act.type === 'stock_update' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold leading-relaxed">{act.message}</p>
                      {act.meta && (
                        <span className={`text-[9px] font-mono mt-0.5 block ${darkMode ? 'text-emerald-500/40' : 'text-slate-400'}`}>
                          رمز المستند المرجعي: {act.meta}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-450 font-mono">{act.timestamp}</span>
                    {canManageSystemDeletions && (
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                        title="حذف هذا السجل نهائياً (للأدمن فقط)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================= التبويب الثامن: التقارير المالية والفوترة وتصدير PDF ======================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* لوحة التقارير وبنتو التحليلات */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* 1. المبيعات الإجمالية */}
            <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <span className="text-[10px] text-slate-400 block mb-1">المبيعات (شامل الضريبة)</span>
              <strong className="text-xl font-mono text-[#10B981]">{totalSalesSum.toFixed(2)} ر.س</strong>
              <div className="text-[9px] text-slate-450 mt-1 flex justify-between">
                <span>قبل الضريبة:</span>
                <span className="font-mono">{(totalSalesSum / 1.15).toFixed(2)} ر.س</span>
              </div>
            </div>

            {/* 2. قيمة الضريبة المضافة المحصلة */}
            <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <span className="text-[10px] text-slate-400 block mb-1">ضريبة القيمة المضافة المحصلة (15%)</span>
              <strong className="text-xl font-mono text-red-400">{(totalSalesSum - (totalSalesSum / 1.15)).toFixed(2)} ر.س</strong>
              <div className="text-[9px] text-slate-450 mt-1">الزكاة والضريبة والجمارك (ZATCA)</div>
            </div>

            {/* 3. متوسط قيمة الفاتورة */}
            <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <span className="text-[10px] text-slate-400 block mb-1">متوسط قيمة الفاتورة (AOV)</span>
              <strong className="text-xl font-mono text-[#10B981]">
                {invoices.length > 0 ? ((totalSalesSum) / invoices.length).toFixed(2) : '0.00'} ر.س
              </strong>
              <div className="text-[9px] text-slate-450 mt-1">إجمالي الفواتير: {invoices.length}</div>
            </div>

            {/* 4. إجمالي السلع المدخلة */}
            <div className={`p-5 rounded-2xl border transition hover:shadow-md ${
              darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
            }`}>
              <span className="text-[10px] text-slate-400 block mb-1">إجمالي المنتجات المدخلة</span>
              <strong className="text-xl font-mono text-yellow-500">{products.length} أصناف</strong>
              <div className="text-[9px] text-slate-450 mt-1">إجمالي القطع: {products.reduce((acc, p) => acc + p.quantity, 0)} قطعة</div>
            </div>

          </div>

          {/* لوحة تصدير التقارير الفورية */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${
            darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
          }`}>
            <h3 className="font-bold text-base text-[#10B981] pb-3 border-b border-emerald-900/10 mb-5">تصدير التقارير واستخراج البيانات</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-xl border space-y-3 ${
                darkMode ? 'bg-[#031510]/50 border-emerald-950' : 'bg-slate-50/50 border-slate-200'
              }`}>
                <h4 className="font-bold text-sm text-white">تصدير البيانات بصيغة Excel (CSV متوافق)</h4>
                <p className="text-xs text-slate-400 leading-relaxed">قم باستخراج كافة الفواتير المسجلة بالنظام بملف واحد متناسق، مشتملاً على ترميز اللغة العربية السليم لفتحه في Microsoft Excel مباشرة وبدون مشاكل في الحروف.</p>
                <button
                  onClick={handleExportToExcel}
                  className="bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                  <span>تصدير كشف الفواتير لإكسل</span>
                </button>
              </div>

              <div className={`p-5 rounded-xl border space-y-3 ${
                darkMode ? 'bg-[#031510]/50 border-emerald-950' : 'bg-slate-50/50 border-slate-200'
              }`}>
                <h4 className="font-bold text-sm text-white">طباعة الفواتير الفردية وتصديرها كـ PDF</h4>
                <p className="text-xs text-slate-400 leading-relaxed">يعمل النظام على محاكاة الفوترة الضريبية المبسطة المتوافقة مع هيئة الزكاة والضريبة والجمارك بالمملكة العربية السعودية، حيث يتيح لك معاينة أي فاتورة وحفظها كملف PDF فوري.</p>
                
                {/* دليل الفواتير السريع للطباعة */}
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {invoices.map(inv => (
                    <div key={inv.id} className={`flex justify-between items-center text-[11px] p-2 rounded border transition-colors ${
                      darkMode ? 'bg-[#031510]/40 border-emerald-950/20' : 'bg-[#eef1f3] border-slate-200'
                    }`}>
                      <div>
                        <span className="font-bold font-mono text-[#10B981]">{inv.id}</span>
                        <span className="text-slate-450 block">{inv.customerName} - {inv.invoiceDate}</span>
                      </div>
                      <button
                        onClick={() => handlePrintInvoice(inv)}
                        className="text-[#10B981] hover:underline flex items-center gap-1 font-bold"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>طباعة / PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= التبويب التاسع: إدارة المستخدمين والصلاحيات (أدمن فقط) ======================= */}
      {activeTab === 'users' && isAdmin && (
        <UserManagementTab
          darkMode={darkMode}
          warehouses={warehouses}
          triggerNotification={triggerNotification}
          addActivity={addActivity}
          currentUserName={userName}
        />
      )}

      {/* ======================= مودال تعديل بيانات المنتج ======================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
            darkMode ? 'bg-[#041a13] border-emerald-900/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-emerald-900/20 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-emerald-400">تعديل بيانات المنتج / الصنف</h4>
                  <p className="text-xs text-slate-400">تحديث تفاصيل الصنف ورصد التعديل بسجل الرقابة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-300">اسم المنتج / الصنف *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-300">رمز المنتج (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                    className={`w-full p-2.5 rounded-xl border font-mono outline-none ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-300">السعر الإفرادي (ر.س) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-300">كمية المخزون الحالي *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: parseInt(e.target.value, 10) || 0 })}
                    className={`w-full p-2.5 rounded-xl border outline-none font-mono ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-slate-300">التصنيف / العائلة</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-slate-300">المستودع المخصص</label>
                  <select
                    value={editingProduct.warehouseId || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, warehouseId: e.target.value })}
                    className={`w-full p-2.5 rounded-xl border outline-none ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-300">الوصف والمواصفات</label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  placeholder="ملاحظات أو مواصفات فنية إضافية..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-900/20">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات وتوثيقها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= مودال تعديل بيانات التصنيف ======================= */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
            darkMode ? 'bg-[#041a13] border-emerald-900/80 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-emerald-900/20 mb-5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-emerald-400">تعديل تصنيف المنتجات</h4>
                  <p className="text-xs text-slate-400">تحديث بيانات فئة التصنيف وتوثيق العملية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryEdit} className="space-y-4 text-xs">
              <div>
                <label className="block mb-1 font-bold text-slate-300">اسم عائلة التصنيف *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  placeholder="مثال: إلكترونيات، مستلزمات طبية..."
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-slate-300">وصف التصنيف</label>
                <textarea
                  rows={3}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  placeholder="شرح موجز لأصناف هذا التصنيف..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-emerald-900/20">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-md transition cursor-pointer"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
