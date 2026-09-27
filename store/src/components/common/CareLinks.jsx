import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/shipping-policy', label: 'Shipping' },
  { to: '/returns-policy', label: 'Returns' },
  { to: '/privacy-policy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/contact', label: 'Contact' },
];

const CareLinks = () => (
  <nav className="care-links" aria-label="Customer care">
    {LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
        {link.label}
      </NavLink>
    ))}
  </nav>
);

export default CareLinks;
