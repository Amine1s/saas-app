import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Pencil, 
  Trash2, 
  UserCheck, 
  Store, 
  RefreshCw,
  Eye,
  EyeOff,
  UserCog,
  AlertTriangle,
  X
} from 'lucide-react';
import { AppUser, Warehouse } from '../types';
import { API_BASE } from '../config';

interface UserManagementTabProps {
  darkMode: boolean;
  warehouses: Warehouse[];
  triggerNotification: (text: string, type?: 'green' | 'red' | 'yellow') => void;
  addActivity: (type: any, message: string, meta?: string) => void;
  currentUserName: string;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  darkMode,
  warehouses,
  triggerNotification,
  addActivity,
  currentUserName
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // حقول نموذج المستخدم
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    warehouseId: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'cashier'>('all');

  // جلب قائمة المستخدمين من الخادم
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      triggerNotification('تعذر الاتصال بمركز إدارة المستخدمين.', 'red');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'cashier',
      warehouseId: warehouses.length > 0 ? warehouses[0].id : '',
    });
    setIsEditing(false);
    setEditingUserId(null);
    setShowPassword(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password || '',
      role: user.role,
      warehouseId: user.warehouseId || (warehouses.length > 0 ? warehouses[0].id : ''),
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.username.trim()) {
      triggerNotification('يرجى ملء جميع الحقول الإلزامية.', 'red');
      return;
    }

    if (!isEditing && !formData.password.trim()) {
      triggerNotification('كلمة المرور مطلوبة لإنشاء الحساب.', 'red');
      return;
    }

    // حماية أمنية: منع ترقية أو تغيير صلاحية أي مستخدم إلى مدير نظام
    const editingTargetUser = isEditing ? users.find(u => u.id === editingUserId) : null;
    if (formData.role === 'admin' && (!isEditing || editingTargetUser?.role !== 'admin')) {
      triggerNotification('غير مسموح باختيار أو تعيين صلاحية أي مستخدم إلى مدير نظام.', 'red');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditing 
        ? `${API_BASE}/api/users/${editingUserId}` 
        : `${API_BASE}/api/users`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim().toLowerCase(),
          password: formData.password ? formData.password.trim() : undefined,
          role: formData.role,
          warehouseId: formData.warehouseId
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        triggerNotification(
          isEditing ? `تم تعديل بيانات وكلمة مرور الحساب بنجاح!` : `تم إنشاء حساب المشغل الجديد بنجاح!`, 
          'green'
        );
        addActivity(
          'system', 
          isEditing 
            ? `تعديل معلومات الحساب "${formData.name}" (الدور: ${formData.role === 'manager' ? 'مدير مستودع' : formData.role === 'cashier' ? 'كاشير' : 'مدير نظام'}).`
            : `إنشاء حساب مشغل جديد "${formData.name}" بصلاحية ${formData.role === 'manager' ? 'مدير مستودع' : formData.role === 'cashier' ? 'كاشير' : 'مدير نظام'}.`
        );
        setShowModal(false);
        resetForm();
        fetchUsers();
      } else {
        triggerNotification(data.message || 'فشلت العملية. يرجى المحاولة لاحقاً.', 'red');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      triggerNotification('حدث خطأ أثناء الاتصال بالخادم.', 'red');
    } finally {
      setIsSubmitting(false);
    }
  };

  // حظر / إلغاء حظر الحساب
  const handleToggleStatus = async (user: AppUser) => {
    const actionName = user.isActive ? 'حظر وتعطيل' : 'تفعيل وإلغاء حظر';
    
    if (user.role === 'admin' && users.filter(u => u.role === 'admin' && u.isActive).length <= 1 && user.isActive) {
      triggerNotification('لا يمكن حظر حساب مدير النظام الوحيد في النظام!', 'red');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}/status`, {
        method: 'PATCH'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        triggerNotification(
          user.isActive 
            ? `تم حظر حساب "${user.name}" بنجاح ولن يتمكن من الدخول للنظام.` 
            : `تم تنشيط وتفعيل حساب "${user.name}" بنجاح!`, 
          user.isActive ? 'yellow' : 'green'
        );
        fetchUsers();
      } else {
        triggerNotification(data.message || `فشل ${actionName} الحساب.`, 'red');
      }
    } catch {
      triggerNotification(`خطأ في الاتصال بالخادم لتنفيذ ${actionName}.`, 'red');
    }
  };

  // حذف الحساب
  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
      triggerNotification('لا يمكن حذف حساب مدير النظام الرئيسي الوحيد!', 'red');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف الحساب "${user.name}" (@${user.username}) نهائياً؟`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        triggerNotification(`تم حذف الحساب "${user.name}" بنجاح.`, 'green');
        addActivity('system', `قام مدير النظام بحذف الحساب "${user.name}".`);
        fetchUsers();
      } else {
        triggerNotification(data.message || 'فشل حذف الحساب.', 'red');
      }
    } catch {
      triggerNotification('خطأ في الاتصال بالخادم لحذف الحساب.', 'red');
    }
  };

  // الفلترة
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const blockedUsers = users.filter(u => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* 1. إحصائيات حسابات النظام - توزيع متجاوب لمنع التكدس على التابلت */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-450 block mb-1">إجمالي الحسابات المسجلة</span>
              <h4 className="text-2xl font-bold font-mono text-[#10B981]">{totalUsers}</h4>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-450 block mb-1">الحسابات النشطة والفعّالة</span>
              <h4 className="text-2xl font-bold font-mono text-emerald-400">{activeUsers}</h4>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className={`p-4 sm:p-5 rounded-2xl border transition-all sm:col-span-2 lg:col-span-1 ${
          darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-450 block mb-1">الحسابات المحظورة والموقوفة</span>
              <h4 className="text-2xl font-bold font-mono text-red-400">{blockedUsers}</h4>
            </div>
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <Lock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. شريط البحث والإجراءات والجدول */}
      <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
        darkMode ? 'bg-[#08291f] border-emerald-900/60 text-white' : 'bg-white border-emerald-100'
      }`}>
        {/* رأس القسم مع منع انضغاط الزر على التابلت */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-900/10 mb-5">
          <div>
            <h3 className="font-bold text-base text-[#10B981] flex items-center gap-2">
              <UserCog className="h-5 w-5 shrink-0" />
              <span>إدارة مستخدمي النظام والصلاحيات والحظر (RBAC Management)</span>
            </h3>
            <p className="text-xs text-slate-450 mt-1 max-w-2xl leading-relaxed">
              صلاحية الإدارة العليا لإضافة الكاشيرات ومدراء المستودعات وتعيين المستودع والفرع وتعديل كلمات المرور وحظر الحسابات.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              onClick={fetchUsers}
              className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                darkMode ? 'border-emerald-900 text-emerald-400 hover:bg-[#031510]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="تحديث القائمة"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleOpenAdd}
              className="bg-[#10B981] text-slate-950 hover:bg-emerald-400 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              <span>إضافة حساب مشغل جديد</span>
            </button>
          </div>
        </div>

        {/* فلاتر البحث والدور مع تحسين التمرير بدون شريط مزعج */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 items-stretch sm:items-center justify-between">
          <input
            type="text"
            placeholder="ابحث بالاسم أو اسم المستخدم..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className={`w-full sm:max-w-xs px-3.5 py-2 text-xs rounded-xl border outline-none transition-all ${
              darkMode 
                ? 'bg-[#031510] border-emerald-900/60 text-emerald-100 placeholder-emerald-900 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
            }`}
          />

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 -mx-1 px-1">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                roleFilter === 'all' 
                  ? 'bg-[#10B981] text-slate-950 font-extrabold shadow-sm' 
                  : darkMode ? 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              الكل ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                roleFilter === 'admin' 
                  ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm' 
                  : darkMode ? 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              مدير نظام ({users.filter(u => u.role === 'admin').length})
            </button>
            <button
              onClick={() => setRoleFilter('manager')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                roleFilter === 'manager' 
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm' 
                  : darkMode ? 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              مدير مستودع ({users.filter(u => u.role === 'manager').length})
            </button>
            <button
              onClick={() => setRoleFilter('cashier')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 whitespace-nowrap ${
                roleFilter === 'cashier' 
                  ? 'bg-sky-500 text-slate-950 font-extrabold shadow-sm' 
                  : darkMode ? 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              كاشير ({users.filter(u => u.role === 'cashier').length})
            </button>
          </div>
        </div>

        {/* أ. عرض البطاقات المخصص لشاشات الهواتف المحمولة (Mobile Cards) */}
        <div className="block md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 border border-dashed rounded-xl p-6">
              لا يوجد مستخدمين يطابقون محددات البحث.
            </div>
          ) : (
            filteredUsers.map(u => {
              const roleBadge = u.role === 'admin' 
                ? { label: 'مدير نظام (أدمن)', bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' }
                : u.role === 'manager'
                ? { label: 'مدير مستودع (مخازن)', bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' }
                : { label: 'كاشير / محاسب (مبيعات)', bg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' };

              const statusBadge = u.isActive 
                ? { label: 'نشط وفعال', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                : { label: 'محظور وموقوف', color: 'bg-red-500/10 text-red-400 border-red-500/20' };

              const matchedWarehouse = warehouses.find(w => w.id === u.warehouseId);
              const assignedLocationName = u.warehouseName || (matchedWarehouse ? matchedWarehouse.name : (u.role === 'admin' ? 'صلاحية شاملة لكافة الفروع' : 'غير مخصص'));
              const isCurrentUser = u.username === 'admin' || u.name === currentUserName;

              return (
                <div
                  key={`mobile-${u.id}`}
                  className={`p-4 rounded-xl border transition-all shadow-xs ${
                    darkMode ? 'bg-[#041a13] border-emerald-900/40 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* رأس البطاقة */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-emerald-900/10 dark:border-emerald-900/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                        u.role === 'admin' ? 'bg-emerald-600 text-white' : u.role === 'manager' ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                      }`}>
                        {u.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm truncate">{u.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                              حسابك
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                          <span className="font-mono font-bold text-emerald-400">@{u.username}</span>
                          <span className="text-[10px]">•</span>
                          <span className="font-mono text-[10px] text-slate-500">ID: {u.id}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${statusBadge.color} border whitespace-nowrap`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* التفاصيل */}
                  <div className="py-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[11px] shrink-0">الدور والصلاحية:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[11px] shrink-0">المستودع / الفرع:</span>
                      <div className="flex items-center gap-1.5 text-slate-300 font-medium truncate max-w-[200px]">
                        <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate" title={assignedLocationName}>{assignedLocationName}</span>
                      </div>
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="pt-3 border-t border-emerald-900/10 dark:border-emerald-900/30 flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px]"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      <span>{isCurrentUser ? 'تعديل بيانات حسابي' : 'تعديل الحساب'}</span>
                    </button>

                    {u.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer min-h-[38px] ${
                            u.isActive 
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                          }`}
                          title={u.isActive ? 'حظر هذا الحساب ومنعه من الدخول' : 'إلغاء حظر الحساب وإعادة تفعيله'}
                        >
                          {u.isActive ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Unlock className="h-3.5 w-3.5 shrink-0" />}
                          <span>{u.isActive ? 'حظر' : 'تفعيل'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="py-2 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer min-h-[38px]"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          <span>حذف</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ب. عرض الجدول للشاشات اللوحية (التابلت) والحواسيب مع تمرير مخصص وعرض أصغري يمنع التكدس */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar rounded-xl border border-emerald-900/20">
          <table className="w-full text-right text-xs min-w-[760px]">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-emerald-900/40 text-emerald-300' : 'border-slate-200 text-[#064E3B]'} font-extrabold bg-emerald-500/5`}>
                <th className="py-3 px-3.5 whitespace-nowrap">المستخدم</th>
                <th className="py-3 px-3.5 whitespace-nowrap">اسم الدخول</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">الدور والصلاحية</th>
                <th className="py-3 px-3.5 whitespace-nowrap">المستودع أو الفرع المخصص</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">حالة الحساب</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">إجراءات الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/10">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    لا يوجد مستخدمين يطابقون محددات البحث.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
                  const roleBadge = u.role === 'admin' 
                    ? { label: 'مدير نظام (أدمن)', bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' }
                    : u.role === 'manager'
                    ? { label: 'مدير مستودع (مخازن)', bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' }
                    : { label: 'كاشير / محاسب (مبيعات)', bg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' };

                  const statusBadge = u.isActive 
                    ? { label: 'نشط وفعال', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
                    : { label: 'محظور وموقوف', color: 'bg-red-500/10 text-red-400 border-red-500/20' };

                  const matchedWarehouse = warehouses.find(w => w.id === u.warehouseId);
                  const assignedLocationName = u.warehouseName || (matchedWarehouse ? matchedWarehouse.name : (u.role === 'admin' ? 'صلاحية شاملة لكافة الفروع' : 'غير مخصص'));
                  const isCurrentUser = u.username === 'admin' || u.name === currentUserName;

                  return (
                    <tr key={u.id} className="hover:bg-slate-500/5 transition duration-150">
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            u.role === 'admin' ? 'bg-emerald-600 text-white' : u.role === 'manager' ? 'bg-amber-600 text-white' : 'bg-sky-600 text-white'
                          }`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm">{u.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  حسابك
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-450 font-mono">ID: {u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 font-mono font-bold text-slate-300 whitespace-nowrap">
                        @{u.username}
                      </td>

                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center ${roleBadge.bg}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                          <Building2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[220px]" title={assignedLocationName}>
                            {assignedLocationName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {/* زر التعديل لكافة المعلومات بما فيها كلمة السر */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold transition cursor-pointer"
                            title={isCurrentUser ? 'تعديل بيانات حسابي الشخصي' : 'تعديل بيانات الحساب وكلمة المرور والمستودع'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* زر الحظر / فك الحظر (مستثنى لحساب الأدمن الرئيسي لحماية النظام) */}
                          {u.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`p-2 rounded-lg font-bold transition cursor-pointer ${
                                  u.isActive 
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                }`}
                                title={u.isActive ? 'حظر هذا الحساب ومنعه من الدخول' : 'إلغاء حظر الحساب وإعادة تفعيله'}
                              >
                                {u.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                              </button>

                              {/* زر الحذف */}
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition cursor-pointer"
                                title="حذف الحساب نهائياً"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. نافذة منبثقة لإضافة أو تعديل المستخدم */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border p-4 sm:p-6 shadow-2xl transition-all my-auto max-h-[92vh] overflow-y-auto custom-scrollbar ${
            darkMode ? 'bg-[#08291f] border-emerald-900/80 text-white' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 mb-5">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-[#10B981] shrink-0" />
                <h4 className="font-bold text-base text-white truncate">
                  {isEditing ? `تعديل حساب: ${formData.name}` : 'إضافة مشغل جديد (كاشير / مدير مستودع)'}
                </h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors shrink-0"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* الاسم الكامل */}
              <div>
                <label className="block mb-1 font-bold text-slate-300">الاسم الكامل للمشغل</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صالح العتيبي"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* اسم المستخدم */}
              <div>
                <label className="block mb-1 font-bold text-slate-300">اسم الدخول (Username)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: saleh_wh1"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none font-mono ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* كلمة المرور */}
              <div>
                <label className="block mb-1 font-bold text-slate-300">
                  {isEditing ? 'كلمة المرور (اتركها فارغة إذا لم ترغب بتغييرها)' : 'كلمة المرور'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEditing ? 'أدخل كلمة مرور جديدة أو اتركها كما هي' : 'أدخل كلمة مرور آمنة'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none font-mono ${
                      darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* الصلاحية / الدور */}
              <div>
                <label className="block mb-1 font-bold text-slate-300">الصلاحية والدور في النظام</label>
                {isEditing && users.find(u => u.id === editingUserId)?.role === 'admin' ? (
                  <div className="space-y-1">
                    <div className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span>مدير نظام (أدمن - حساب إداري رئيسي ثابت)</span>
                      </span>
                      <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      صلاحية مدير النظام ثابتة ومحمية لا يمكن تغييرها أو تفويضها لأي حساب آخر.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <select
                      value={formData.role === 'admin' ? 'cashier' : formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'manager' | 'cashier' }))}
                      className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                        darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="cashier">كاشير / محاسب (إصدار فواتير بيع وعرض فقط)</option>
                      <option value="manager">مدير مستودع (إدارة المخزن، توريد، صرف، وحذف الأصناف والتصنيفات)</option>
                    </select>
                    <p className="text-[10px] text-emerald-400/80">
                      تم استبعاد وحظر خيار الترقية إلى مدير نظام؛ الأدوار المتاحة محصورة بمدير مستودع أو كاشير فقط.
                    </p>
                  </div>
                )}
              </div>

              {/* تعيين المستودع / الفرع */}
              <div>
                <label className="block mb-1 font-bold text-slate-300">
                  {formData.role === 'manager' 
                    ? 'المستودع الذي يديره مدير المستودع:' 
                    : formData.role === 'cashier' 
                    ? 'الفرع / المستودع الذي ينتمي له الكاشير:' 
                    : 'نطاق الإشراف الجغرافي (اختياري للأدمن):'}
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseId: e.target.value }))}
                  className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                    darkMode ? 'bg-[#031510] border-emerald-900/60 text-white focus:border-[#10B981]' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">-- اختر مستودعاً أو فرعاً --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.location})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {formData.role === 'manager' 
                    ? 'سيتم حصر صلاحيات مدير المستودع بالإشراف على هذا المستودع المحدد.'
                    : 'سيتم ربط مبيعات الكاشير وحركات فواتيره بهذا الفرع/المستودع مباشرة.'}
                </p>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex gap-2 pt-4 border-t border-emerald-900/20">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-extrabold py-2.5 rounded-xl shadow cursor-pointer text-center transition"
                >
                  {isSubmitting ? 'جاري الحفظ...' : isEditing ? 'حفظ التعديلات' : 'تأسيس الحساب الآن'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTab;
