import { Link } from 'react-router-dom';
import AccountNav from '../../components/account/AccountNav';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';

const SHORTCUTS = [
  { to: '/account/orders', num: '01', title: 'Orders', text: 'Track purchases and past gifts.' },
  { to: '/account/addresses', num: '02', title: 'Addresses', text: 'Keep delivery details ready.' },
  { to: '/account/profile', num: '03', title: 'Profile', text: 'Your details, kept quietly.' },
];

const Account = () => {
  const { user, logout } = useAuth();

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Account" title="My Account" subtitle="Orders, addresses and profile — kept simple and close at hand." />
        <div className="account-layout">
          <AccountNav />
          <div>
            <div className="account-card account-welcome">
              <p className="eyebrow">Welcome</p>
              <h2>{user?.name || 'Guest'}</h2>
              <p>{user?.email}</p>
              <div className="product-actions">
                <Button as={Link} to="/account/orders" variant="primary">
                  View orders
                </Button>
                <Button variant="ghost" onClick={logout}>
                  Logout
                </Button>
              </div>
            </div>
            <div className="account-shortcuts">
              {SHORTCUTS.map((item) => (
                <Link key={item.to} to={item.to} className="account-shortcut">
                  <span className="eyebrow">{item.num}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Account;
