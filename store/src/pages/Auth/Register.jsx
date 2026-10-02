import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/layout/AuthShell';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../context/AuthContext';
import { resendRegistrationCodes } from '../../services/authService';
import { getErrorMessage } from '../../utils/getErrorMessage';

const Register = () => {
  const { register, verifyRegistration, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [codes, setCodes] = useState({ emailCode: '', phoneCode: '' });
  const [sentTo, setSentTo] = useState(null);
  const [pendingCodes, setPendingCodes] = useState(null);
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader label="Loading" />;
  if (isAuthenticated) return <Navigate to="/account" replace />;

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const handleDetails = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      setSentTo({ email: data.email, phone: data.phone });
      setPendingCodes(data.devCodes || null);
      setCodes({ emailCode: '', phoneCode: '' });
      setStep('verify');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to start your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await verifyRegistration({
        email: values.email.trim(),
        emailCode: codes.emailCode.trim(),
        phoneCode: codes.phoneCode.trim(),
      });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to verify those codes.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSubmitting(true);
    try {
      const data = await resendRegistrationCodes(values.email.trim());
      setSentTo({ email: data.email, phone: data.phone });
      setPendingCodes(data.devCodes || null);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send new codes.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome"
      title={step === 'verify' ? 'Verify your details' : 'Create account'}
      subtitle={
        step === 'verify'
          ? `Enter the codes sent to ${sentTo?.email || 'your email'} and ${sentTo?.phone || 'your phone'}.`
          : 'Save addresses, track orders and keep your favourite hampers close at hand.'
      }
    >
      {step === 'details' ? (
        <form className="form-grid" onSubmit={handleDetails}>
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
            <input id="phone" type="tel" autoComplete="tel" inputMode="numeric" value={values.phone} onChange={(event) => update('phone', event.target.value)} required />
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
            {submitting ? 'Sending codes...' : 'Continue'}
          </Button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={handleVerify}>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {pendingCodes ? (
            <div className="alert">
              Delivery is not connected on this server yet.
              {pendingCodes.email ? ` Email code ${pendingCodes.email}.` : ''}
              {pendingCodes.phone ? ` Phone code ${pendingCodes.phone}.` : ''}
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="email-code">Email code</label>
            <input
              id="email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codes.emailCode}
              onChange={(event) => setCodes((current) => ({ ...current, emailCode: event.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="phone-code">Phone code</label>
            <input
              id="phone-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codes.phoneCode}
              onChange={(event) => setCodes((current) => ({ ...current, phoneCode: event.target.value }))}
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Verifying...' : 'Create account'}
          </Button>
          <Button type="button" variant="secondary" disabled={submitting} onClick={handleResend}>
            Send new codes
          </Button>
          <button
            type="button"
            className="link-quiet"
            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            onClick={() => {
              setStep('details');
              setError('');
            }}
          >
            Change details
          </button>
        </form>
      )}
      <div className="auth-split__meta">
        <p>
          Already have an account? <Link to="/login" className="link-quiet">Login</Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;
