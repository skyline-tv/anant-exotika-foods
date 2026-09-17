import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SIDEBAR_STORAGE_KEY } from '../../utils/constants';
import Header from './Header';
import MobileSidebar from './MobileSidebar';
import Sidebar from './Sidebar';

function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleCollapse = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className="admin-layout">
      <Sidebar collapsed={collapsed} onLogout={handleLogout} />
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div className={`admin-main ${collapsed ? 'is-collapsed' : ''}`}>
        <Header
          admin={admin}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
