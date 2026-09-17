import { Link } from 'react-router-dom';
import './BrandMark.css';

const BrandMark = ({ to = '/', inverted = false, compact = false }) => {
  const classes = [
    'brand-mark',
    inverted ? 'brand-mark--inverted' : '',
    compact ? 'brand-mark--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={to} className={classes} aria-label="Anant Exotika Foods Home">
      <span className="brand-mark__name">Anant Exotika</span>
      <span className="brand-mark__sub">Foods</span>
    </Link>
  );
};

export default BrandMark;
