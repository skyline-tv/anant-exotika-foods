import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import Button from '../../components/common/Button';
import { forgotPassword } from '../../services/authService';
import { getErrorMessage } from '../../utils/getErrorMessage';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await forgotPassword(email.trim());
      setMessage(response.message || 'If an account exists for this email, password reset instructions have been sent.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to start password recovery.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (message) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Check your email"
        subtitle="A link to reset your password has been sent to your email."
      >
        <p className="auth-sent">
          We sent it to <strong>{email}</strong>. Open that message and follow the link. It expires in one hour.
        </p>
        <div className="auth-split__meta">
          <p>
            <Link to="/login" className="link-quiet">Back to login</Link>
          </p>
          <p>
            <button type="button" className="link-quiet" onClick={() => setMessage('')}>
              Use a different email
            </button>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password"
      subtitle="Enter the email associated with your Anant Exotika account."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
      <div className="auth-split__meta">
        <p>
          <Link to="/login" className="link-quiet">Back to login</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ForgotPassword;
