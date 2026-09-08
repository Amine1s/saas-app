import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Building2, UserCheck, Tag } from 'lucide-react';
import { Category, Warehouse, Supplier } from '../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onSubmit: (e: React.FormEvent) => void;
  formState: {
    name: string;
    sku: string;
    price: string;
    quantity: string;
    description: string;
    category: string;
    warehouseId: string;
    supplierId: string;
  };
  setFormState: React.Dispatch<React.SetStateAction<{
    name: string;
    sku: string;
    price: string;
    quantity: string;
    description: string;
    category: string;
    warehouseId: string;
    supplierId: string;
  }>>;
  categories: Category[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
}

export default function AddProductModal({
  isOpen,
  onClose,
  darkMode,
  onSubmit,
  formState,
  setFormState,
  categories = [],
  warehouses = [],
  suppliers = []
}: AddProductModalProps) {
  // نافذة منبثقة لإضافة صنف منتج جديد إلى البيانات
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="add-product-modal-container" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`transition-all duration-500 rounded-2xl p-6 shadow-2xl space-y-4 border ${
              darkMode ? 'bg-[#0a2f24] text-white border-emerald-900/60' : 'bg-white border-emerald-100 text-slate-800'
            } max-w-lg w-full`}
          >
            {/* عنوان وتصنيف الهيدر */}
            <div className={`flex justify-between items-center pb-3 border-b ${darkMode ? 'border-emerald-900/40' : 'border-slate-100'}`}>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                <Plus className="h-5.5 w-5.5 text-[#10B981]" />
                <span className={`${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>تسجيل صنف مخزني جديد</span>
              </h3>
              <button onClick={onClose} className={`transition-colors ${darkMode ? 'text-emerald-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* حقول نموذج الإدخال */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>اسم المنتج التفصيلي</label>
                <input
                  type="text"
                  required
                  className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 focus:ring-1 focus:ring-[#10B981]/20 ${
                    darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                  }`}
                  placeholder="مثال: قميص أكسفورد قطني"
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>رمز التعريف للمنتج (SKU)</label>
                  <input
                    type="text"
                    required
                    className={`w-full text-xs font-mono sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    placeholder="مثال: PROD-109"
                    value={formState.sku}
                    onChange={(e) => setFormState(prev => ({ ...prev, sku: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>الفئة والتصنيف</label>
                  <select
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    value={formState.category}
                    onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="رجالي">ملابس رجالية</option>
                        <option value="نسائي">ملابس نسائية</option>
                        <option value="أحذية">أحذية وحقائب</option>
                        <option value="إكسسوارات">أدوات وإكسسوارات</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>سعر القطعة (ر.س)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    placeholder="0.00"
                    value={formState.price}
                    onChange={(e) => setFormState(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>الكمية المبدئية بالمستودع</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    placeholder="0"
                    value={formState.quantity}
                    onChange={(e) => setFormState(prev => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>

                {/* حقل اختيار المستودع الرئيسي */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                    <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>المستودع الجغرافي</span>
                  </label>
                  <select
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    value={formState.warehouseId}
                    onChange={(e) => setFormState(prev => ({ ...prev, warehouseId: e.target.value }))}
                  >
                    <option value="">-- اختر مستودعاً لتسكين السلعة --</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>

                {/* حقل اختيار المورد */}
                <div>
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>المورد الشريك</span>
                  </label>
                  <select
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                    }`}
                    value={formState.supplierId}
                    onChange={(e) => setFormState(prev => ({ ...prev, supplierId: e.target.value }))}
                  >
                    <option value="">-- اختر المورد الرئيسي --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name} ({sup.company})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>مواصفات وتفاصيل المنتج (اختياري)</label>
                <textarea
                  className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 h-16 resize-none ${
                    darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                  }`}
                  placeholder="الوصف، والمقاسات المتوفرة..."
                  value={formState.description}
                  onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    darkMode ? 'bg-[#10B981] text-slate-950 font-extrabold hover:bg-emerald-450' : 'bg-[#064E3B] text-white hover:bg-[#043327]'
                  }`}
                >
                  حفظ وتأكيد التوريد
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 border rounded-lg text-xs font-semibold transition cursor-pointer ${
                    darkMode ? 'border-emerald-800 text-emerald-350 hover:bg-emerald-950' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  إلغاء التوريد
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
