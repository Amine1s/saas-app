import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X, Building2, UserCheck, Tag, Save, AlertCircle, Zap } from 'lucide-react';
import { Product, Category, Warehouse, Supplier } from '../types';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  product: Product | null;
  onSave: (updatedData: {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
    description: string;
    category: string;
    warehouseId?: string;
    supplierId?: string;
  }) => Promise<void>;
  categories: Category[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
}

export default function EditProductModal({
  isOpen,
  onClose,
  darkMode,
  product,
  onSave,
  categories = [],
  warehouses = [],
  suppliers = []
}: EditProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: '',
    description: '',
    category: '',
    warehouseId: '',
    supplierId: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        price: product.price !== undefined ? String(product.price) : '',
        quantity: product.quantity !== undefined ? String(product.quantity) : '',
        description: product.description || '',
        category: product.category || (categories[0]?.name || 'عام'),
        warehouseId: product.warehouseId || '',
        supplierId: product.supplierId || ''
      });
      setValidationError('');
    }
  }, [product, categories]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const { name, sku, price, quantity, description, category, warehouseId, supplierId } = formData;

    if (!name.trim()) {
      setValidationError('يرجى إدخال اسم الصنف.');
      return;
    }
    if (!sku.trim()) {
      setValidationError('يرجى إدخال رمز SKU الخاص بالصنف.');
      return;
    }
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
      setValidationError('يرجى إدخال سعر صالح (أكبر من أو يساوي 0).');
      return;
    }
    if (quantity === '' || isNaN(Number(quantity)) || Number(quantity) < 0) {
      setValidationError('يرجى إدخال كمية صحيحة في المخزون.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        id: product.id,
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: Number(price),
        quantity: Number(quantity),
        description: description.trim(),
        category: category || product.category,
        warehouseId: warehouseId || undefined,
        supplierId: supplierId || undefined
      });
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || 'حدث خطأ أثناء حفظ التعديلات.');
    } finally {
      setIsSaving(false);
    }
  };

  const initialQty = product.quantity || 0;
  const currentEnteredQty = Number(formData.quantity) || 0;
  const qtyChanged = currentEnteredQty !== initialQty;

  return (
    <AnimatePresence>
      <div 
        id="edit-product-modal-container" 
        className="modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`modal-card transition-all duration-300 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 border mx-auto my-auto ${
            darkMode ? 'bg-[#0a2f24] text-white border-emerald-800/80 shadow-emerald-950/50' : 'bg-white border-emerald-100 text-slate-800'
          } max-w-lg w-full max-h-[90vh] overflow-y-auto`}
        >
          {/* عنوان وتصنيف الهيدر */}
          <div className={`flex justify-between items-center pb-3 border-b ${darkMode ? 'border-emerald-800/50' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-bold ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>
                  تعديل بيانات الصنف المخزني
                </h3>
                <p className={`text-[11px] font-mono ${darkMode ? 'text-emerald-500/60' : 'text-slate-400'}`}>
                  المعرف: {product.sku} | #{product.id}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'text-emerald-400 hover:bg-emerald-900/50 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* تنبيه خطأ التحقق */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* حقول نموذج الإدخال والتعديل */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                اسم المنتج التفصيلي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all duration-300 focus:ring-2 focus:ring-emerald-500/20 ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="مثال: قميص أكسفورد قطني"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  رمز التعريف (SKU) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className={`w-full text-xs font-mono sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="مثال: PROD-109"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  <Tag className="h-3 w-3 text-emerald-500" />
                  <span>الفئة والتصنيف</span>
                </label>
                <select
                  className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="رجالي">رجالي</option>
                      <option value="نسائي">نسائي</option>
                      <option value="أحذية">أحذية</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  سعر البيع (ر.س) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  className={`w-full text-xs font-mono sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  الرصيد الفعلي بالمستودع <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  className={`w-full text-xs font-mono sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                />
                {qtyChanged && (
                  <span className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <Zap className="h-3 w-3 inline text-amber-400 shrink-0" />
                    <span>سيتم تسجيل تسوية مخزنية فارقة: ({currentEnteredQty - initialQty > 0 ? '+' : ''}{currentEnteredQty - initialQty} قطعة)</span>
                  </span>
                )}
              </div>

              {/* اختيار المستودع */}
              <div>
                <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  <Building2 className="h-3 w-3 text-emerald-500" />
                  <span>المستودع المخصص</span>
                </label>
                <select
                  className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  value={formData.warehouseId}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                >
                  <option value="">-- غير محدد --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>

              {/* اختيار المورد */}
              <div>
                <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  <UserCheck className="h-3 w-3 text-emerald-500" />
                  <span>المورد المعتمد</span>
                </label>
                <select
                  className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  value={formData.supplierId}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                >
                  <option value="">-- غير محدد --</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name} ({sup.company})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                الوصف والمواصفات (اختياري)
              </label>
              <textarea
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2 outline-none transition-all h-18 resize-none ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="الوصف، الألوان، المقاسات..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md font-extrabold disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`px-5 py-2.5 border rounded-xl text-xs font-semibold transition cursor-pointer ${
                  darkMode ? 'border-emerald-800 text-emerald-300 hover:bg-emerald-950' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
