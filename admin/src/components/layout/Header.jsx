import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getPageTitle } from '../../utils/constants';
import { useLocation } from 'react-router-dom';

function Header({ admin, collapsed, onToggleCollapse, onOpenMobile, onLogout }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const title = getPageTitle(location.pathname);
  const initials = (admin?.name || 'A')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="admin-header">
      <div className="header-left">
        <button
          type="button"
          className="btn btn--ghost btn--icon menu-btn"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--icon collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-right">
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="header-profile" ref={menuRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="header-profile-name">{admin?.name || 'Admin'}</span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="profile-menu" role="menu">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onLogout}
                role="menuitem"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
