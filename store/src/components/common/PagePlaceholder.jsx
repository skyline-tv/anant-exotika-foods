import { Link } from 'react-router-dom';
import Button from './Button';

const PagePlaceholder = ({
  title,
  description = 'The page you are looking for does not exist or has been moved.',
  ctaLabel = 'Return Home',
  ctaTo = '/',
}) => {
  return (
    <section className="page-placeholder animate-in">
      <div className="container">
        <div className="page-placeholder__inner">
          <span className="eyebrow">Anant Exotika</span>
          <h1 className="page-placeholder__title">{title}</h1>
          <p className="page-placeholder__text">{description}</p>
          <Button as={Link} to={ctaTo} variant="primary">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PagePlaceholder;
