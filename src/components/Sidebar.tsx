import React from 'react';
import { Store, Layers, Code, PlusCircle, Plus, X, ShieldAlert } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'code_sandbox';
  setCurrentView: (view: 'dashboard' | 'code_sandbox') => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setShowAddInvoiceModal: (show: boolean) => void;
  setShowAddProductModal: (show: boolean) => void;
  darkMode: boolean;
  userRole?: 'admin' | 'manager' | 'cashier';
}

export default function Sidebar({
  currentView,
  setCurrentView,
  sidebarOpen,
  setSidebarOpen,
  setShowAddInvoiceModal,
  setShowAddProductModal,
  darkMode,
  userRole = 'admin'
}: SidebarProps) {
  // القائمة الجانبية لإدارة التنقل والتحكم الرئيسي
  return (
    <aside 
      id="sidebar-container"
      className={`w-64 text-white shadow-2xl flex flex-col shrink-0 transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-64'
      } fixed md:relative z-40 h-full right-0 transition-colors duration-500 ${
        darkMode ? 'bg-[#021812] border-l border-emerald-950/40' : 'bg-[#064E3B]'
      }`}
    >
      {/* هيدر القائمة الجانبية والشعار */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-[#10B981] rounded-lg flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#10B981]/20">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-wide uppercase text-emerald-200 font-sans">مخازن سحابية</h2>
            <span className="text-[10px] text-white/60 block -mt-0.5 font-sans">لوحة تحكم الفواتير والمخازن</span>
          </div>
        </div>
        
        <button className="md:hidden text-white/80 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* الروابط وأزرار التحكم بالتنقل */}
      <nav className="flex-1 p-4 space-y-1.5 grow overflow-y-auto">
        <span className="text-[10px] uppercase text-white/40 tracking-wider font-bold block px-2 mb-2 font-sans">القائمة الأساسية</span>
        
        <button
          onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            currentView === 'dashboard' 
              ? 'bg-[#10B981] text-slate-950 shadow-lg shadow-[#10B981]/15 font-bold' 
              : 'text-white/85 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Layers className="h-4.5 w-4.5" />
          <span>لوحة التحكم والمحاكاة</span>
        </button>

        {userRole === 'admin' && (
          <button
            onClick={() => { setCurrentView('code_sandbox'); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              currentView === 'code_sandbox' 
                ? 'bg-[#10B981] text-slate-950 shadow-lg shadow-[#10B981]/15 font-bold' 
                : 'text-white/85 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Code className="h-4.5 w-4.5" />
            <span>بيئة المطور وصياغة الكود API</span>
          </button>
        )}

        <div className="pt-6">
          <span className="text-[10px] uppercase text-white/40 tracking-wider font-bold block px-2 mb-2 font-sans">إجراءات سريعة فورية</span>
          
          {/* كاشير أو أدمن فقط يصدر فاتورة */}
          {(userRole === 'admin' || userRole === 'cashier') && (
            <button 
              onClick={() => { setShowAddInvoiceModal(true); setSidebarOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-[#064E3B] hover:bg-slate-50 transition active:scale-95 shadow-md shadow-black/10 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-[#10B981]" />
              <span>إصدار فاتورة جديدة</span>
            </button>
          )}
          
          {/* مدير مستودع أو أدمن فقط يضيف منتج */}
          {(userRole === 'admin' || userRole === 'manager') && (
            <button 
              onClick={() => { setShowAddProductModal(true); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#10B981]/20 hover:bg-[#10B981]/30 text-white/90 border border-white/10 transition active:scale-95 cursor-pointer ${
                userRole === 'admin' ? 'mt-2' : ''
              }`}
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              <span>إضافة صنف جديد</span>
            </button>
          )}

          {userRole === 'manager' && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] text-white/60 leading-relaxed">
              <span className="text-[#10B981] font-bold block mb-1">صلاحية مدير المستودع:</span>
              تتيح لك هذه الصلاحية التحكم الكامل بالبضائع، التوريد، الفئات، وحركات الشحن. تم قفل إصدار الفواتير المالية لك.
            </div>
          )}

          {userRole === 'cashier' && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] text-white/60 leading-relaxed">
              <span className="text-[#10B981] font-bold block mb-1">صلاحية أمين الصندوق:</span>
              تتيح لك إصدار الفواتير الفورية ومعاينة الأرصدة المتوفرة. تم قفل تعديل المخزون أو إدخال بضائع جديدة لك.
            </div>
          )}
        </div>
      </nav>

      {/* البريد والوقت */}
      <div className={`p-4 border-t border-white/10 text-xs text-white/50 flex flex-col gap-1 select-none transition-colors duration-500 ${
        darkMode ? 'bg-[#01140e]' : 'bg-[#043327]'
      }`}>
        <span className="font-semibold text-emerald-300">مستخدم النظام الحالي</span>
        <span className="text-[10px] font-bold text-white/80">
          {userRole === 'admin' ? 'مدير عام النظام' : userRole === 'manager' ? 'مدير مستودعات ساس' : 'أمين الصندوق والكاشير'}
        </span>
        <span className="text-[9px] text-[#10B981] mt-1 font-mono">ZATCA VAT SIMULATOR v2.6</span>
      </div>
    </aside>
  );
}
