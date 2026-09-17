import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/account', label: 'Dashboard', end: true },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/profile', label: 'Profile' },
  { to: '/wishlist', label: 'Wishlist' },
];

const AccountNav = () => (
  <nav className="account-nav" aria-label="Account">
    {LINKS.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.end}
        className={({ isActive }) => (isActive ? 'is-active' : undefined)}
      >
        {link.label}
      </NavLink>
    ))}
  </nav>
);

export default AccountNav;
