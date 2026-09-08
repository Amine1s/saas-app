import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3, X, Save, AlertCircle, Layers } from 'lucide-react';
import { Category } from '../types';

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  category: Category | null;
  onSave: (id: string, name: string, description: string) => Promise<void>;
}

export default function EditCategoryModal({
  isOpen,
  onClose,
  darkMode,
  category,
  onSave
}: EditCategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setError('');
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم التصنيف/العائلة.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(category.id, name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ التعديلات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className={`rounded-2xl p-6 shadow-2xl space-y-4 border mx-auto my-auto max-w-md w-full ${
            darkMode ? 'bg-[#0a2f24] text-white border-emerald-800/80' : 'bg-white border-emerald-100 text-slate-800'
          }`}
        >
          <div className="flex justify-between items-center pb-3 border-b border-emerald-800/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className={`text-base font-bold ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>
                تعديل فئة وتصنيف السلع
              </h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                اسم الفئة / التصنيف <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="مثال: إلكترونيات، أحذية..."
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${darkMode ? 'text-emerald-300' : 'text-slate-700'}`}>
                شرح ووصف الفئة
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full text-xs sm:text-sm border rounded-xl px-3 py-2.5 outline-none h-20 resize-none ${
                  darkMode ? 'bg-[#08231b] border-emerald-800/80 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-500'
                }`}
                placeholder="وصف مختصر للمنتجات التابعة..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 border rounded-xl text-xs font-semibold cursor-pointer ${
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
