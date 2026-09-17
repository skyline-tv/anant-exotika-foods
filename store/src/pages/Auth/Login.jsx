import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/getErrorMessage';

const Login = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const from = location.state?.from || '/account';

  if (loading) return <Loader label="Loading" />;
  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Access your Anant Exotika account, orders and saved gifts."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="auth-split__meta">
        <p>
          <Link to="/forgot-password" className="link-quiet">Forgot password?</Link>
        </p>
        <p>
          New here? <Link to="/register" className="link-quiet">Create an account</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;
