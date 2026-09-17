import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/getErrorMessage';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import logo from '../../assets/logo/anant-exotika-logo.jpg';
import '../../styles/login.css';

function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <Loader label="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password, remember });
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-visual" aria-hidden="true">
        <div className="login-visual-inner">
          <img className="login-logo" src={logo} alt="ANANT EXOTIKA" />
          <h2>Beyond Time.<br />Beyond Luxury.</h2>
          <p>A calm, secure workspace for store operations.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <img className="login-card-logo" src={logo} alt="ANANT EXOTIKA" />
          <header>
            <span className="login-eyebrow">Admin Portal</span>
            <h1>Sign in</h1>
            <p className="page-subtitle">Use your admin credentials to continue.</p>
          </header>

          <form onSubmit={handleSubmit} className="form-section">
            {error ? (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--icon password-toggle"
                  onClick={() => setShowPassword((open) => !open)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember Me
            </label>

            <Button type="submit" className="btn--lg" loading={submitting}>
              Sign in
            </Button>
          </form>

          <p className="login-footer">© 2026 Anant Exotika</p>
        </div>
      </section>
    </main>
  );
}

export default Login;
