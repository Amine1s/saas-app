import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X, Save, AlertCircle, UserCheck, Phone, Mail, Building } from 'lucide-react';
import { Supplier } from '../types';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  supplier: Supplier | null;
  onSave: (id: string, name: string, company: string, phone: string, email: string) => Promise<void>;
}

export default function EditSupplierModal({
  isOpen,
  onClose,
  darkMode,
  supplier,
  onSave
}: EditSupplierModalProps) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setCompany(supplier.company || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setError('');
    }
  }, [supplier]);

  if (!isOpen || !supplier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم المورد أو الممثل التجاري.');
      return;
    }
    if (!company.trim()) {
      setError('يرجى إدخال اسم الشركة أو المصنع.');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف المورد.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(supplier.id, name.trim(), company.trim(), phone.trim(), email.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ التعديلات على بيانات المورد.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="edit-supplier-modal-container"
        className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`rounded-2xl p-6 shadow-2xl space-y-4 border mx-auto my-auto max-w-lg w-full ${
            darkMode ? 'bg-[#0a2f24] text-white border-emerald-800/80' : 'bg-white border-emerald-100 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className={`flex justify-between items-center pb-3 border-b ${darkMode ? 'border-emerald-800/50' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>
                  تعديل بيانات المورد (مدير النظام)
                </h3>
                <p className={`text-[11px] font-mono ${darkMode ? 'text-emerald-500/60' : 'text-slate-400'}`}>
                  المعرف: #{supplier.id}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                darkMode ? 'text-slate-400 hover:text-white hover:bg-emerald-900/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Validation Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                اسم الممثل / المورد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="مثال: المهندس يوسف حسن"
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                <Building className="h-3 w-3 text-emerald-500" />
                <span>اسم الشركة / المصنع <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="مثال: شركة النخبة للتوريدات المحدودة"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  <Phone className="h-3 w-3 text-emerald-500" />
                  <span>رقم الهاتف <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full text-xs font-mono sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="0500000000"
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 flex items-center gap-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                  <Mail className="h-3 w-3 text-emerald-500" />
                  <span>البريد الإلكتروني</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none transition-all ${
                    darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                  }`}
                  placeholder="supplier@company.sa"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={`px-4 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer transition ${
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
