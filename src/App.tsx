import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import OrderManagement from './pages/OrderManagement';
import InventoryManagement from './pages/InventoryManagement';
import Reports from './pages/Reports';
import PlaceOrder from './pages/PlaceOrder';
import UserManagement from './pages/UserManagement';
import WalkInSale from './pages/WalkInSale';

function AppContent() {
  const { isAuthenticated, isAdmin, isStaff } = useAuth();
  const [page, setPage] = useState('auth');

  useEffect(() => {
    if (isAuthenticated) {
      setPage('dashboard');
    } else {
      setPage('auth');
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    setPage('dashboard');
  };

  if (!isAuthenticated || page === 'auth') {
    return <AuthPage onLogin={handleLogin} />;
  }

  // Route to correct dashboard based on role
  const renderPage = () => {
    if (isAdmin) {
      switch (page) {
        case 'dashboard': return <AdminDashboard />;
        case 'walk-in': return <WalkInSale />;
        case 'orders': return <OrderManagement />;
        case 'inventory': return <InventoryManagement />;
        case 'reports': return <Reports />;
        case 'users': return <UserManagement />;
        default: return <AdminDashboard />;
      }
    }

    if (isStaff) {
      switch (page) {
        case 'dashboard': return <StaffDashboard />;
        case 'walk-in': return <WalkInSale />;
        case 'orders': return <OrderManagement />;
        case 'inventory': return <InventoryManagement />;
        case 'reports': return <Reports />;
        default: return <StaffDashboard />;
      }
    }

    // Customer
    switch (page) {
      case 'dashboard': return <CustomerDashboard onNavigate={setPage} />;
      case 'place-order': return <PlaceOrder />;
      case 'my-orders': return <OrderManagement />;
      default: return <CustomerDashboard onNavigate={setPage} />;
    }
  };

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
