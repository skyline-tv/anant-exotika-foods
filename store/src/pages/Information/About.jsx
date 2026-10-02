import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { toTitleCase } from '../../utils/titleCase';
import { useStoreContent } from '../../context/ContentContext';
import { usePageMeta } from '../../hooks/usePageMeta';

const About = () => {
  const location = useLocation();
  const { content } = useStoreContent();
  const story = content?.brandStory || null;
  const image = resolveAssetUrl(story?.image);

  useEffect(() => {
    if (location.hash !== '#our-story') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  usePageMeta({
    title: 'Our story | Anant Exotika Foods',
    description: story?.body,
    image,
  });

  return (
    <section className="page-shell" id="our-story">
      <div className="container">
        <div className="editorial-page">
          {image ? (
            <div className="editorial-page__visual">
              <img src={image} alt="" />
            </div>
          ) : null}
          <div>
            <span className="eyebrow">{toTitleCase(story?.eyebrow || 'Our story')}</span>
            <h1>{toTitleCase(story?.heading || 'Quality, elegance and thoughtful gifting')}</h1>
            <p>
              {story?.body ||
                'Anant Exotika Foods is a premium Indian house for dry fruits, mukhwas and gifting. We select for flavour and freshness, then present each piece so it feels worthy of the occasion.'}
            </p>
            <Button as={Link} to={story?.cta?.to || '/shop'} variant="primary">
              {story?.cta?.label || 'Shop the collection'}
            </Button>
            <ul className="about-points">
              <li>
                <span className="eyebrow">01</span>
                <strong>Selected for flavour</strong>
                <p>Dry fruits and mukhwas chosen for freshness, then packed so they arrive ready to gift.</p>
              </li>
              <li>
                <span className="eyebrow">02</span>
                <strong>Presented with care</strong>
                <p>Complimentary premium packaging on selected orders, for festivals, weddings and courtesy gifts.</p>
              </li>
              <li>
                <span className="eyebrow">03</span>
                <strong>Delivered across India</strong>
                <p>Cash on delivery and a simple checkout, with tracking once the shipment is on its way.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
