import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Droplets, LayoutDashboard, ShoppingCart, Package, BarChart3,
  Users, LogOut, Menu, ChevronDown, Bell, UserCircle
} from 'lucide-react';
import NewOrderAlert from './NewOrderAlert';


interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth();
  const { getPendingOrders, getLowStockProducts } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const pendingCount  = getPendingOrders();
  const lowStockCount = getLowStockProducts().length;

  const getNavItems = (): NavItem[] => {
    if (user?.role === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'walk-in', label: 'Walk-in Sale', icon: UserCircle },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: pendingCount },
        { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'users', label: 'Users', icon: Users },
      ];
    }
    if (user?.role === 'staff') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'walk-in', label: 'Walk-in Sale', icon: UserCircle },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, badge: pendingCount },
        { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ];
    }
    // Customer
    return [
      { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { id: 'place-order', label: 'Place Order', icon: ShoppingCart },
      { id: 'my-orders', label: 'My Orders', icon: Package },
    ];
  };

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };

  const roleColors: Record<string, string> = {
    admin: 'from-red-900 via-red-800 to-orange-800',
    staff: 'from-emerald-900 via-teal-800 to-cyan-800',
    customer: 'from-blue-900 via-blue-800 to-indigo-800',
  };

  const sidebarGradient = roleColors[user?.role || 'customer'];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b ${sidebarGradient} text-white transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
              <Droplets className="w-6 h-6 text-blue-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Water Market</h1>
              <p className="text-white/50 text-xs capitalize">{user?.role} Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {getNavItems().map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                currentPage === item.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-cyan-400 rounded-full flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-blue-900" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-white/50 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {currentPage.replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              {(pendingCount + lowStockCount) > 0 && user?.role !== 'customer' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <UserCircle className="w-6 h-6 text-gray-500" />
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-medium text-sm text-gray-800">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-blue-600 capitalize mt-1 font-medium">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Real-time new order alert for admin & staff */}
      <NewOrderAlert onNavigate={onNavigate} />
    </div>
  );
}
