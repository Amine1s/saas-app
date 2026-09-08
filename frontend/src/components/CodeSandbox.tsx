import React from 'react';
import { Code, Server, Cpu, FileText, FileCode, Check, Copy } from 'lucide-react';
import { CODE_SNIPPETS } from '../data';

interface CodeSandboxProps {
  darkMode: boolean;
  activeTab: 'db' | 'api' | 'env';
  setActiveTab: (tab: 'db' | 'api' | 'env') => void;
  handleCopyCode: () => void;
  copied: boolean;
}

export default function CodeSandbox({
  darkMode,
  activeTab,
  setActiveTab,
  handleCopyCode,
  copied
}: CodeSandboxProps) {
  // بيئة صياغة الكود والملفات البرمجية للمطور للتكامل مع قاعدة غوغل وبوستجرس
  return (
    <div id="code-sandbox-wrapper" className="space-y-6">
      
      {/* 1. رأس التبويب والخيارات الفيدرالية */}
      <div className={`transition-all duration-500 border rounded-2xl p-6 shadow-sm space-y-4 ${
        darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center transition-colors duration-500 ${darkMode ? 'bg-[#0b3c2e] text-emerald-300' : 'bg-teal-50 text-[#064E3B]'}`}>
            <Code className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className={`font-bold text-lg transition-colors duration-500 ${darkMode ? 'text-emerald-300' : 'text-[#064E3B]'}`}>منصة كود الاتصال وقاعدة البيانات لسهولة التكامل</h3>
            <p className={`text-xs transition-colors duration-500 ${darkMode ? 'text-emerald-400/55' : 'text-slate-500'} mt-1`}>تسهل هذه الواجهة عملية تفحص ونسخ ملفات ربط Node.js مع الخادم السحابي وقاعدة البيانات.</p>
          </div>
        </div>
        
        {/* ألسنة تبديل الملفات */}
        <div className={`flex p-1 rounded-xl border transition-all duration-500 ${
          darkMode ? 'bg-[#0b372a] border-[#10b981]/25' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setActiveTab('db')}
            className={`flex-1 py-2 px-4 text-center rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'db' 
                ? (darkMode ? 'bg-[#10B981] text-slate-950 font-extrabold shadow' : 'bg-[#064E3B] text-white shadow font-semibold') 
                : (darkMode ? 'text-emerald-300 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50')
            }`}
          >
            <Server className="h-4 w-4" />
            <span>1. الاتصال بقاعدة البيانات</span>
          </button>
          
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-2 px-4 text-center rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'api' 
                ? (darkMode ? 'bg-[#10B981] text-slate-950 font-extrabold shadow' : 'bg-[#064E3B] text-white shadow font-semibold') 
                : (darkMode ? 'text-emerald-300 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50')
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>2. كود الـ API (إضافة وتحديث)</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`flex-1 py-2 px-4 text-center rounded-lg font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'env' 
                ? (darkMode ? 'bg-[#10B981] text-slate-950 font-extrabold shadow' : 'bg-[#064E3B] text-white shadow font-semibold') 
                : (darkMode ? 'text-emerald-300 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50')
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>3. المتغيرات والـ Schema</span>
          </button>
        </div>

        {/* شريط مساعد لاختصارات لوحة المفاتيح والتحكم السريع بالساندبوكس */}
        <div className={`p-3 rounded-xl border flex flex-wrap gap-4 items-center justify-between text-xs transition-all duration-300 ${
          darkMode ? 'bg-[#042018] border-emerald-950/40 text-emerald-300/80 font-sans' : 'bg-emerald-50/40 border-emerald-100 text-slate-600 font-sans'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="font-bold">مفاتيح الاختصارات السريعة:</span>
            <span className="text-[10px] opacity-75">(يمكن استخدامها في أي وقت للتنقل والتحكم السريع)</span>
          </div>
          <div className="flex flex-wrap gap-2.5 items-center">
            <span className="inline-flex gap-1 items-center">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-mono text-[10px]">Ctrl+N</kbd>
              <span className="text-[11px]">أو Alt+N (منتج جديد)</span>
            </span>
            <span className="opacity-40">|</span>
            <span className="inline-flex gap-1 items-center">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-mono text-[10px]">Alt+I</kbd>
              <span className="text-[11px]">إصدار فاتورة</span>
            </span>
            <span className="opacity-40">|</span>
            <span className="inline-flex gap-1 items-center">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-mono text-[10px]">Alt+D</kbd>
              <span className="text-[11px]">لوحة التحكم</span>
            </span>
            <span className="opacity-40">|</span>
            <span className="inline-flex gap-1 items-center">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-mono text-[10px]">Alt+S</kbd>
              <span className="text-[11px]">بيئة المطور</span>
            </span>
            <span className="opacity-40">|</span>
            <span className="inline-flex gap-1 items-center">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-100 font-mono text-[10px]">Alt+1,2,3</kbd>
              <span className="text-[11px]">الملفات</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. حاوية استعراض ونسخ كتل الكود */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden h-[540px]">
        
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-[#10B981]" />
            <span className="font-semibold text-xs sm:text-sm text-slate-200 font-mono">
              {activeTab === 'db' ? 'config/database.js' : activeTab === 'api' ? 'routes/products.js' : 'database-schema.sql'}
            </span>
          </div>
          
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 text-xs font-semibold py-1.5 px-3 bg-[#10B981] hover:bg-[#0da06f] text-slate-950 rounded-lg transition"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'تم النسخ!' : 'نسخ ملف الكود'}
          </button>
        </div>

        {/* صندوق الوصف */}
        <div className="bg-slate-900/60 p-4 border-b border-slate-800/60 text-slate-300">
          <p className="text-xs sm:text-sm leading-relaxed">
            <strong className="text-white block mb-0.5">{CODE_SNIPPETS[activeTab].title}</strong>
            {CODE_SNIPPETS[activeTab].description}
          </p>
        </div>

        {/* عرض محتوى الملف برمجياً */}
        <div className="flex-1 overflow-auto bg-[#030712] p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-300 select-all overflow-y-auto">
          <pre className="text-left" dir="ltr">
            <code>{CODE_SNIPPETS[activeTab].code}</code>
          </pre>
        </div>

      </div>

    </div>
  );
}
