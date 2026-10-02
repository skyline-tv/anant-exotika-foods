import { useEffect, useId, useState } from 'react';
import Button from '../common/Button';
import { submitLead } from '../../services/leadService';
import { getErrorMessage } from '../../utils/getErrorMessage';

const EMPTY = { name: '', phone: '', email: '', message: '' };

const OccasionEnquiry = ({ occasion, onClose }) => {
  const titleId = useId();
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      await submitLead({ ...values, occasion });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send your details. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="lead-modal" role="presentation" onMouseDown={onClose}>
      <div
        className="lead-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="lead-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {sent ? (
          <div className="lead-modal__done">
            <h2 id={titleId}>Thank You</h2>
            <p>We have your details for {occasion}. Our team will be in touch.</p>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="eyebrow">{occasion}</p>
            <h2 id={titleId}>Share Your Details</h2>
            <p className="lead-modal__note">Tell us how to reach you and we will help plan this gift.</p>
            {error ? <p className="alert">{error}</p> : null}
            <div className="field">
              <label htmlFor="lead-name">Name</label>
              <input id="lead-name" name="name" autoComplete="name" autoFocus required value={values.name} onChange={update('name')} />
            </div>
            <div className="field">
              <label htmlFor="lead-phone">Phone</label>
              <input id="lead-phone" name="phone" type="tel" autoComplete="tel" required value={values.phone} onChange={update('phone')} />
            </div>
            <div className="field">
              <label htmlFor="lead-email">Email</label>
              <input id="lead-email" name="email" type="email" autoComplete="email" required value={values.email} onChange={update('email')} />
            </div>
            <div className="field">
              <label htmlFor="lead-message">About the gift</label>
              <textarea id="lead-message" name="message" rows={3} value={values.message} onChange={update('message')} />
            </div>
            <Button type="submit" disabled={sending} className="btn--full">
              {sending ? 'Sending' : 'Send Details'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OccasionEnquiry;
