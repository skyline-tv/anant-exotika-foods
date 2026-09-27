import { Link } from 'react-router-dom';
import Button from './Button';
import SuggestedProducts from '../product/SuggestedProducts';

const PagePlaceholder = ({
  title,
  description = 'The page you are looking for does not exist or has been moved.',
  ctaLabel = 'Return Home',
  ctaTo = '/',
  secondaryLabel,
  secondaryTo,
  suggestions = false,
}) => {
  return (
    <section className="page-placeholder animate-in">
      <div className="container">
        <div className="page-placeholder__inner">
          <span className="eyebrow">Anant Exotika</span>
          <h1 className="page-placeholder__title">{title}</h1>
          <p className="page-placeholder__text">{description}</p>
          <div className="page-placeholder__actions">
            <Button as={Link} to={ctaTo} variant="primary">
              {ctaLabel}
            </Button>
            {secondaryLabel && secondaryTo ? (
              <Button as={Link} to={secondaryTo} variant="outline">
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>
        {suggestions ? <SuggestedProducts title="Or begin with the collection" /> : null}
      </div>
    </section>
  );
};

export default PagePlaceholder;
