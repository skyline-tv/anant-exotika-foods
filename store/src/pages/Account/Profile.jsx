import { useNavigate } from 'react-router-dom';
import AccountNav from '../../components/account/AccountNav';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatDate';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Account" title="Profile" />
        <div className="account-layout">
          <AccountNav />
          <div>
            <div className="account-card form-grid two">
              <div>
                <span className="eyebrow">Name</span>
                <h2>{user?.name}</h2>
              </div>
              <div>
                <span className="eyebrow">Email</span>
                <h2>{user?.email}</h2>
              </div>
              <div>
                <span className="eyebrow">Phone</span>
                <h2>{user?.phone || '—'}</h2>
              </div>
              <div>
                <span className="eyebrow">Member since</span>
                <h2>{formatDate(user?.createdAt)}</h2>
              </div>
            </div>
            <Button variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Profile;
