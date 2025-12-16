import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, Factory, Shield, LogOut, Smartphone, Menu, X, Clock, Truck, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('userInfo'));

  const currentLang = (i18n.language || 'en').startsWith('es') ? 'es' : 'en';
  const toggleLanguage = () => {
    const next = currentLang === 'en' ? 'es' : 'en';
    localStorage.setItem('lang', next);
    i18n.changeLanguage(next);
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  const menuItems = [
    {
      label: t('active_orders'),
      path: '/',
      icon: <LayoutDashboard size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: "Pending Items",
      path: '/procurement/pending',
      icon: <Clock size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: 'Purchasing',
      path: '/procurement/tracking',
      icon: <Truck size={20} />,
      roles: ['super_admin', 'admin', 'office', 'production']
    },

    {
      label: t('production'),
      path: '/production',
      icon: <Factory size={20} />,
      roles: ['super_admin', 'admin', 'production']
    },
    {
      label: 'Scheduling',
      path: '/installations',
      icon: <CalendarIcon size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: t('calendar'),
      path: '/calendar',
      icon: <CalendarIcon size={20} />,
      roles: ['super_admin', 'admin', 'office', 'production', 'installer']
    },
    {
      label: 'Financial approvals',
      path: '/approvals',
      icon: <CheckCircle size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: 'Completed orders',
      path: '/completed',
      icon: <CheckCircle size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: t('admin_panel'),
      path: '/admin',
      icon: <Shield size={20} />,
      roles: ['super_admin', 'admin']
    },
    {
      label: t('customers'),
      path: '/customers',
      icon: <Users size={20} />,
      roles: ['super_admin', 'admin', 'office']
    },
    {
      label: t('supplier_management'),
      path: '/admin/suppliers',
      icon: <ShoppingCart size={20} />,
      roles: ['super_admin', 'admin']
    },
    {
      label: t('installer_app'),
      path: '/installer',
      icon: <Smartphone size={20} />,
      roles: ['super_admin', 'admin', 'installer']
    },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-40">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Glass Dynamic</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLanguage}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700"
            title="Change language"
          >
            {currentLang === 'en' ? 'ES' : 'EN'}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Glass Dynamic
          </h1>
          <p className="text-xs text-slate-400 mt-1">{user?.name} ({user?.role})</p>
        </div>

        <div className="p-6 md:hidden mt-16">
          <p className="text-sm text-slate-400">Hello, {user?.name}</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            if (item.roles[0] !== 'all' && !item.roles.includes(user?.role)) return null;

            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 pb-20 md:pb-4">
          <button
            type="button"
            onClick={toggleLanguage}
            className="mb-3 w-full bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold border border-slate-700"
          >
            {currentLang === 'en' ? 'Español' : 'English'}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm w-full">
            <LogOut size={16} /> {t('logout')}
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;