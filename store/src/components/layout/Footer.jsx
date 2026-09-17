import { Link } from 'react-router-dom';
import BrandMark from '../brand/BrandMark';
import { CONTACT } from '../../utils/constants';
import { useStoreContent } from '../../context/ContentContext';
import './Footer.css';

const SocialIcon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const InstagramIcon = () => (
  <SocialIcon>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
  </SocialIcon>
);

const FacebookIcon = () => (
  <SocialIcon>
    <path d="M14 8h2V5h-2c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9c0-.6.4-1 1-1Z" />
  </SocialIcon>
);

const WhatsAppIcon = () => (
  <SocialIcon>
    <path d="M20.5 11.5a8.5 8.5 0 0 1-12.7 7.4L3.5 20.5l1.7-4.1A8.5 8.5 0 1 1 20.5 11.5Z" />
    <path d="M9.2 9.8c.3-.5.5-.5.7-.5h.6c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.3.4c-.1.1-.2.3 0 .5.3.5.8 1.1 1.4 1.5.5.3.7.2.9.1l.5-.3c.2-.1.4-.1.6 0l1.6.8c.3.1.4.3.4.5v.6c0 .2 0 .4-.2.6-.3.4-1 .8-1.7.8a6.5 6.5 0 0 1-5.5-3.2 6 6 0 0 1-1.1-3.2c0-.7.3-1.4.7-1.8Z" />
  </SocialIcon>
);

const Footer = () => {
  const { content, contact } = useStoreContent();
  const emails = contact.emails?.length ? contact.emails : CONTACT.emails;

  return (
  <footer className="site-footer">
    <div className="container">
      <div className="footer__grid">
        <div className="footer__brand">
          <BrandMark inverted />
          <p className="footer__tagline">
            Thoughtfully curated dry fruits
            <br />
            and gifting, presented with care.
          </p>
          <ul className="footer__links">
            <li>
              <a href={`tel:${contact.phoneTel}`}>{contact.phoneDisplay}</a>
            </li>
            {emails.map((email) => (
              <li key={email}>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            ))}
            {contact.address ? <li>{contact.address}</li> : null}
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Shop</h3>
          <ul className="footer__links">
            <li>
              <Link to="/shop">All products</Link>
            </li>
            <li>
              <Link to="/shop/new-arrivals">New arrivals</Link>
            </li>
            <li>
              <Link to="/shop/featured">Featured collection</Link>
            </li>
            <li>
              <Link to={{ pathname: '/', hash: 'gifting' }}>Gifting</Link>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Customer care</h3>
          <ul className="footer__links">
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
            <li>
              <Link to="/shipping-policy">Shipping policy</Link>
            </li>
            <li>
              <Link to="/returns-policy">Returns &amp; refunds</Link>
            </li>
            <li>
              <Link to="/privacy-policy">Privacy policy</Link>
            </li>
            <li>
              <Link to="/terms">Terms &amp; conditions</Link>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">About</h3>
          <ul className="footer__links">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/shop">Shop</Link>
            </li>
            <li>
              <Link to="/about">About us</Link>
            </li>
            <li>
              <Link to="/about#our-story">Our story</Link>
            </li>
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <h3 className="footer__heading">Socials</h3>
          <div className="footer__social" aria-label="Social media">
            <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <WhatsAppIcon />
            </a>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">© {new Date().getFullYear()} {content?.storeName || 'Anant Exotika Foods'}. All rights reserved.</p>
      </div>
    </div>
  </footer>
  );
};

export default Footer;
