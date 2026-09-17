import { LogOut, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/navItems';
import logo from '../../assets/logo/anant-exotika-logo.jpg';

function MobileSidebar({ open, onClose, onLogout }) {
  return (
    <>
      {open ? (
        <div className="mobile-overlay" onClick={onClose} aria-hidden="true" />
      ) : null}
      <aside className={`mobile-sidebar ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="mobile-sidebar-header">
          <div className="sidebar-brand" style={{ padding: 0, border: 0 }}>
            <div className="brand-mark" aria-hidden="true">
              <img src={logo} alt="" />
            </div>
            <div className="brand-copy">
              <strong>ANANT EXOTIKA</strong>
              <span>Admin</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Close navigation menu"
            style={{ color: 'var(--cream)' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin mobile">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="btn" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default MobileSidebar;
