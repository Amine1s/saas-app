import React from 'react';
import { Menu, Sun, Moon, LogOut, ShieldCheck, Package, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import '../styles/Header.css';

interface HeaderProps {
  currentView: 'dashboard' | 'code_sandbox';
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  userRole?: 'admin' | 'manager' | 'cashier';
  userName?: string;
}

export default function Header({
  currentView,
  setSidebarOpen,
  darkMode,
  toggleDarkMode,
  onLogout,
  userRole,
  userName
}: HeaderProps) {
  // استخلاص الاسم بدون الأقواس المكررة لتفادي حشر النصوص (مثل: فاطمة علي بدلاً من فاطمة علي (أمين الصندوق))
  const cleanDisplayName = userName ? userName.replace(/\s*\([^)]*\)/g, '').trim() : '';

  // شريط الرأس العلوي وتطبيق المظهر المتطور الداكن/الساطع
  return (
    <header 
      id="app-header"
      className={`header-container py-2.5 px-3 sm:py-3 sm:px-6 flex items-center justify-between shadow-sm border-b transition-colors duration-500 gap-2 ${
        darkMode 
          ? 'dark-mode bg-[#051e16] border-emerald-950/40' 
          : 'light-mode bg-[#f8fafb] border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
        <button 
          onClick={() => setSidebarOpen(true)}
          className={`md:hidden p-1.5 sm:p-2 rounded-lg transition-colors duration-300 shrink-0 ${
            darkMode ? 'hover:bg-emerald-900/40 text-emerald-400' : 'hover:bg-slate-100 text-[#064E3B]'
          }`}
          title="فتح القائمة الجانبية"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 overflow-hidden">
          <h2 className="text-sm sm:text-base md:text-lg font-extrabold header-title transition-colors duration-500 truncate">
            {currentView === 'dashboard' ? (
              <>
                <span className="lg:hidden">لوحة التحكم</span>
                <span className="hidden lg:inline">لوحة التحكم السحابية</span>
              </>
            ) : (
              <>
                <span className="lg:hidden">بيئة API</span>
                <span className="hidden lg:inline">بيئة المطور وصياغة API</span>
              </>
            )}
          </h2>
          {/* يظهر النص الوصفي فقط على الشاشات الكبيرة لتفادي أي تزاحم في التابلت والهاتف */}
          <p className="text-[11px] header-subtitle transition-colors duration-500 hidden xl:block truncate">
            نظام إدارة المخازن والفواتير السريع للمتاجر الصغيرة
          </p>
        </div>
      </div>

      {/* زر المظهر ومعلومات المستخدم وزر تسجيل الخروج */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* معلومات المستخدم النشط - تظهر بوضوح وبدون قص لحرف الياء أو تزاحم */}
        {cleanDisplayName && (
          <div 
            className="flex flex-col text-right pl-2 sm:pl-3 border-l border-emerald-500/20 shrink-0" 
            dir="rtl"
            title={userName}
          >
            <span className="text-xs sm:text-sm font-bold leading-normal pb-0.5 header-user-name whitespace-nowrap block">
              {cleanDisplayName}
            </span>
            <span className={`text-[10px] font-semibold flex items-center gap-1 ${
              userRole === 'admin' 
                ? 'text-emerald-500' 
                : userRole === 'manager' 
                ? 'text-yellow-600 dark:text-amber-400' 
                : 'text-blue-600 dark:text-sky-400'
            }`}>
              {userRole === 'admin' ? (
                <>
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  <span className="whitespace-nowrap">مدير النظام</span>
                </>
              ) : userRole === 'manager' ? (
                <>
                  <Package className="h-3 w-3 shrink-0" />
                  <span className="whitespace-nowrap">مدير مستودع</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-3 w-3 shrink-0" />
                  <span className="whitespace-nowrap">كاشير</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* زر تبديل المظهر كأيقونة نقية وسريعة بدون استهلاك للمساحة */}
        <motion.button
          id="theme-toggle-button-header"
          onClick={toggleDarkMode}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92, rotate: 15 }}
          className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 ${
            darkMode 
              ? 'bg-[#0d362a] border-emerald-800 text-amber-400 hover:border-emerald-700 hover:bg-[#124a3a]' 
              : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100/80'
          }`}
          title={darkMode ? 'التحويل للوضع الساطع' : 'التحويل للوضع الداكن'}
          aria-label="تبديل مظهر النظام"
        >
          <motion.div
            animate={{ rotate: darkMode ? 360 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.div>
        </motion.button>

        {/* مؤشر السيرفر يظهر فقط للشاشات الكبيرة جداً لمنع مزاحمة عناصر التابلت والهاتف */}
        <div className={`hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors duration-500 shrink-0 ${
          darkMode 
            ? 'text-emerald-300 bg-[#0d362a]/30 border-emerald-900/60' 
            : 'text-slate-500 bg-slate-100 border-slate-200'
        }`}>
          <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="font-mono font-bold text-[11px] ${darkMode ? 'text-emerald-400' : 'text-[#064E3B]'}">متصل</span>
        </div>

        {/* زر تسجيل الخروج */}
        <button
          id="logout-btn"
          onClick={onLogout}
          className="header-logout-btn p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0"
          title="تسجيل الخروج من ساس وب"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">خروج</span>
        </button>
      </div>
    </header>
  );
}

