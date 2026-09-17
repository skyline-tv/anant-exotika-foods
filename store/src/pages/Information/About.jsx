import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import { resolveAssetUrl } from '../../utils/assetUrl';
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
            <span className="eyebrow">{story?.eyebrow || 'Our story'}</span>
            <h1>{story?.heading || 'Quality, elegance and thoughtful gifting'}</h1>
            <p>
              {story?.body ||
                'Anant Exotika Foods is a premium Indian house for dry fruits, mukhwas and gifting. We select for flavour and freshness, then present each piece so it feels worthy of the occasion.'}
            </p>
            <Button as={Link} to={story?.cta?.to || '/shop'} variant="primary">
              {story?.cta?.label || 'Shop the collection'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
