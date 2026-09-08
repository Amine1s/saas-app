import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, Plus, Trash, X } from 'lucide-react';
import { Product } from '../types';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onSubmit: (e: React.FormEvent) => void;
  invoiceForm: {
    customerName: string;
    status: 'paid' | 'partial' | 'refunded';
    amountPaid: string;
    paymentMethod: string;
  };
  setInvoiceForm: React.Dispatch<React.SetStateAction<{
    customerName: string;
    status: 'paid' | 'partial' | 'refunded';
    amountPaid: string;
    paymentMethod: string;
  }>>;
  products: Product[];
  selectedItems: { productId: string; quantity: number }[];
  setSelectedItems: React.Dispatch<React.SetStateAction<{ productId: string; quantity: number }[]>>;
}

export default function AddInvoiceModal({
  isOpen,
  onClose,
  darkMode,
  onSubmit,
  invoiceForm,
  setInvoiceForm,
  products,
  selectedItems,
  setSelectedItems
}: AddInvoiceModalProps) {
  
  // معالجة تغيير صنف السلعة المحددة في سطر الفاتورة
  const handleItemProductChange = (index: number, val: string) => {
    setSelectedItems(prev => prev.map((item, i) => i === index ? { ...item, productId: val } : item));
  };

  // معالجة تغيير الكمية المشتراة لسطر الفاتورة
  const handleItemQtyChange = (index: number, qty: number) => {
    setSelectedItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, qty) } : item));
  };

  // إضافة سطر سلعة جديد
  const handleAddProductRow = () => {
    if (products.length > 0) {
      setSelectedItems(prev => [...prev, { productId: products[0].id, quantity: 1 }]);
    }
  };

  // حذف سطر السلعة المحدد
  const handleRemoveProductRow = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // حساب إجمالي السعر الفرعي بدون ضريبة لتسهيل التفاصيل على العميل
  const calculateSubtotal = () => {
    return selectedItems.reduce((acc, item) => {
      const prod = products.find(p => p.id === item.productId);
      return acc + (prod ? prod.price * item.quantity : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const vatAmount = subtotal * 0.15;
  const netFinalTotal = subtotal * 1.15;

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="add-invoice-modal-container" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`transition-all duration-500 rounded-2xl p-6 shadow-2xl space-y-4 border ${
              darkMode ? 'bg-[#0a2f24] text-white border-emerald-900/60' : 'bg-white border-emerald-100 text-slate-800'
            } max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
          >
            {/* الهيدر وقفل النافذة */}
            <div className={`flex justify-between items-center pb-3 border-b ${darkMode ? 'border-emerald-900/40' : 'border-slate-100'}`}>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-1.5">
                <PlusCircle className="h-5.5 w-5.5 text-[#10B981]" />
                <span className={`${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>إصدار فاتورة مبيعات سحابية جديدة</span>
              </h3>
              <button type="button" onClick={onClose} className={`transition-colors ${darkMode ? 'text-emerald-400 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* النموذج */}
            <form onSubmit={onSubmit} className="space-y-4">
              
              <div>
                <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>اسم العميل القانوني / الشركة</label>
                <input
                  type="text"
                  required
                  className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 focus:ring-1 focus:ring-[#10B981]/20 ${
                    darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#10B981]'
                  }`}
                  placeholder="مثال: شركة محمد التونسي للتوريدات م.م"
                  value={invoiceForm.customerName}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerName: e.target.value }))}
                />
              </div>

              {/* قسم اختيار السلع والأعداد */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${darkMode ? 'text-emerald-350' : 'text-slate-700'}`}>القطع والأصناف بالفاتورة</span>
                  <button
                    type="button"
                    onClick={handleAddProductRow}
                    className="p-1 px-2 text-[10px] sm:text-xs font-semibold rounded bg-[#10B981] hover:bg-[#0da06f] text-slate-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>إضافة منتج إضافي</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedItems.map((item, idx) => {
                    const selectedProductObj = products.find(p => p.id === item.productId);
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <div className="flex-1">
                          <select
                            className={`w-full text-xs sm:text-sm border rounded-lg px-2 py-1.5 outline-none transition-all duration-500 ${
                              darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                            value={item.productId}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.price.toFixed(2)} ر.س) - متوفر: {p.quantity} قطع
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-20">
                          <input
                            type="number"
                            min="1"
                            className={`w-full text-xs sm:text-sm border rounded-lg px-2 py-1.5 outline-none transition-all duration-500 ${
                              darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                            value={item.quantity}
                            onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                            placeholder="الكمية"
                          />
                        </div>

                        <div className="w-24 text-left font-mono text-xs font-semibold">
                          {selectedProductObj ? (selectedProductObj.price * item.quantity).toFixed(2) : '0.00'} ر.س
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveProductRow(idx)}
                          disabled={selectedItems.length <= 1}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-30 cursor-pointer"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* معطيات السداد */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>حالة السداد</label>
                  <select
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="paid">مدفوعة بالكامل (نقداً/شبكة)</option>
                    <option value="partial">مدفوعة جزئياً (آجل متجزئ)</option>
                    <option value="refunded">مرتجع / تالف</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>طريقة الدفع</label>
                  <select
                    className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                      darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="بطاقة ائتمان / مدى">بطاقة ائتمان / مدى</option>
                    <option value="نقداً (كاش)">نقداً (كاش)</option>
                  </select>
                </div>

                {invoiceForm.status === 'partial' && (
                  <div className="sm:col-span-2">
                    <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>المبلغ المحصل حالياً (ر.س)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      className={`w-full text-xs sm:text-sm border rounded-lg px-3 py-2 outline-none transition-all duration-500 ${
                        darkMode ? 'bg-[#08231b] border-emerald-900/60 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                      placeholder="أدخل قيمة السداد الجزئي"
                      value={invoiceForm.amountPaid}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* تفاصيل الحساب الضريبي النهائي */}
              <div className={`p-4 border rounded-xl space-y-2 transition-all duration-500 ${
                darkMode ? 'bg-[#08231b] border-[#10b981]/20' : 'bg-slate-50 border-slate-250'
              }`}>
                <div className="flex justify-between text-xs">
                  <span>المبلغ غير شامل الضريبة</span>
                  <span className="font-mono">{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-xs text-red-400">
                  <span>ضريبة القيمة المضافة (15%)</span>
                  <span className="font-mono">+{vatAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t pt-2 border-dashed border-slate-300">
                  <span className={darkMode ? 'text-emerald-350' : 'text-[#064E3B]'}>الصافي النهائي المستحق للتحصيل</span>
                  <span className="font-mono text-base">{netFinalTotal.toFixed(2)} ر.س</span>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    darkMode ? 'bg-[#10B981] text-slate-950 font-extrabold hover:bg-emerald-450' : 'bg-[#064E3B] text-white hover:bg-[#043327]'
                  }`}
                >
                  تأكيد وسداد الفاتورة
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 border rounded-lg text-xs font-semibold transition cursor-pointer ${
                    darkMode ? 'border-emerald-800 text-emerald-350 hover:bg-emerald-950' : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
