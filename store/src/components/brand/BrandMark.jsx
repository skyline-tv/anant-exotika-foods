import { Link } from 'react-router-dom';
import './BrandMark.css';

const LOGO_SRC = '/logo.png';

const BrandMark = ({ to = '/', inverted = false, compact = false, large = false }) => {
  const classes = [
    'brand-mark',
    inverted ? 'brand-mark--inverted' : '',
    compact ? 'brand-mark--compact' : '',
    large ? 'brand-mark--large' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={to} className={classes} aria-label="Anant Exotika Foods Home">
      <span className="brand-mark__plate">
        <img
          className="brand-mark__logo"
          src={LOGO_SRC}
          alt="Anant Exotika — Beyond Time Beyond Luxury"
          width={320}
          height={80}
          decoding="async"
        />
      </span>
    </Link>
  );
};

export default BrandMark;
