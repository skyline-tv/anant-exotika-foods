import { CONTACT } from '../../utils/constants';

const Contact = () => (
  <section className="page-shell">
    <div className="container container--narrow">
      <span className="eyebrow">Concierge</span>
      <h1>Contact Us</h1>
      <p className="page-header__subtitle">
        For orders, gifting and bulk enquiries — including weddings, birthdays, Diwali and Ganesh
        Chaturthi — we are glad to help.
      </p>
      <div className="info-stack">
        <div>
          <span className="eyebrow">Email</span>
          {CONTACT.emails.map((email) => (
            <p key={email}>
              <a className="link-quiet" href={`mailto:${email}`}>
                {email}
              </a>
            </p>
          ))}
        </div>
        <div>
          <span className="eyebrow">Bulk enquiry</span>
          <p>
            <a className="link-quiet" href={`tel:${CONTACT.phoneTel}`}>
              {CONTACT.phoneDisplay}
            </a>
          </p>
          <p>
            <a className="link-quiet" href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp the same number
            </a>
          </p>
        </div>
        <div>
          <span className="eyebrow">Occasions</span>
          <p>{CONTACT.occasions.join(', ').replace(/, ([^,]*)$/, ' and $1')}.</p>
        </div>
        <div>
          <span className="eyebrow">Social</span>
          <p>
            <a
              className="link-quiet"
              href={CONTACT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram @{CONTACT.instagramHandle}
            </a>
          </p>
          <p>
            <a
              className="link-quiet"
              href={CONTACT.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook {CONTACT.facebookHandle}
            </a>
          </p>
        </div>
        <div>
          <span className="eyebrow">Hours</span>
          <p>Monday to Saturday, 10:00 – 18:00 IST</p>
        </div>
      </div>
    </div>
  </section>
);

export default Contact;
