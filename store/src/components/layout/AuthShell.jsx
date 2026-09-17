import BrandMark from '../brand/BrandMark';
import './AuthShell.css';

const AuthShell = ({ eyebrow, title, subtitle, children }) => (
  <section className="auth-split">
    <div className="auth-split__visual">
      <BrandMark inverted to="/" />
      <p>Thoughtfully curated. Elegantly gifted.</p>
    </div>
    <div className="auth-split__panel">
      <div className="auth-split__content">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="auth-split__lead">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  </section>
);

export default AuthShell;
