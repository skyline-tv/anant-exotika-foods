import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

const Register = () => {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader label="Loading" />;
  if (isAuthenticated) return <Navigate to="/account" replace />;

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || undefined,
        password: values.password,
      });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome"
      title="Create account"
      subtitle="Save addresses, track orders and keep your favourite hampers close at hand."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" value={values.name} onChange={(event) => update('name', event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={values.email} onChange={(event) => update('email', event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" value={values.phone} onChange={(event) => update('phone', event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={values.password}
            onChange={(event) => update('password', event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <div className="auth-split__meta">
        <p>
          Already have an account? <Link to="/login" className="link-quiet">Login</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;
