import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Lock,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Button from '../../components/common/Button';
import Reveal from '../../components/common/Reveal';
import SectionTitle from '../../components/common/SectionTitle';
import ProductCard from '../../components/product/ProductCard';
import ProductSkeleton from '../../components/common/ProductSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { getCategories } from '../../services/categoryService';
import { getProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { getParentCategories } from '../../utils/categories';
import { getPrimaryImage } from '../../utils/productHelpers';
import { TRUST_POINTS, matchCategoryPath } from '../../data/brandContent';
import { useStoreContent } from '../../context/ContentContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import './Home.css';

const TRUST_ICONS = [Award, Leaf, ShieldCheck, Lock, Truck];
const ROTATE_MS = 4200;

const HeroShowcase = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) return <div className="hero__visual hero__visual--plain" aria-hidden="true" />;

  const active = slides[index] || slides[0];

  return (
    <div
      className="hero__visual"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero__showcase">
        <div className="hero__stage">
          {slides.map((slide, slideIndex) => (
            <Link
              key={slide.id}
              to={slide.to}
              className={`hero__slide${slideIndex === index ? ' is-active' : ''}`}
              tabIndex={slideIndex === index ? 0 : -1}
              aria-hidden={slideIndex !== index}
            >
              <img src={slide.src} alt={slide.name} />
            </Link>
          ))}
        </div>
        <div className="hero__showcase-meta">
          <Link to={active.to} className="hero__caption">
            {active.name}
          </Link>
          {slides.length > 1 ? (
            <div className="hero__dots" role="tablist" aria-label="Featured selections">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={slideIndex === index}
                  aria-label={slide.name}
                  className={slideIndex === index ? 'is-active' : undefined}
                  onClick={() => setIndex(slideIndex)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const CategoryScroller = ({ children }) => {
  const scrollerRef = useRef(null);

  const scrollByCard = (direction) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const card = scroller.querySelector('.category-card');
    const gap = 16;
    const amount = (card?.getBoundingClientRect().width || 240) + gap;
    scroller.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <div className="category-scroller-wrap">
      <button
        type="button"
        className="category-scroller__nav category-scroller__nav--prev"
        aria-label="Scroll categories left"
        onClick={() => scrollByCard(-1)}
      >
        <ChevronLeft size={20} strokeWidth={1.6} />
      </button>
      <div className="category-scroller" ref={scrollerRef} tabIndex={0} aria-label="Shop by category">
        {children}
      </div>
      <button
        type="button"
        className="category-scroller__nav category-scroller__nav--next"
        aria-label="Scroll categories right"
        onClick={() => scrollByCard(1)}
      >
        <ChevronRight size={20} strokeWidth={1.6} />
      </button>
    </div>
  );
};

const Home = () => {
  const location = useLocation();
  const { content } = useStoreContent();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [categoryData, featuredData] = await Promise.all([
          getCategories(),
          getProducts({ featured: true, limit: 8, sort: 'featured' }),
        ]);
        let productList = featuredData.products || [];
        if (!productList.length) {
          const newest = await getProducts({ limit: 8, sort: 'newest' });
          productList = newest.products || [];
        }
        if (!active) return;
        setCategories(getParentCategories(categoryData || []));
        setProducts(productList);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Unable to load products. Please try again.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (location.hash !== '#gifting' && location.hash !== '#our-story') return undefined;
    const id = location.hash.replace('#', '');
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    setSubscribed(true);
  };

  const dryFruitsTo = matchCategoryPath(categories, ['dry fruit', 'dryfruit', 'nuts', 'almond', 'cashew']);
  const hampersTo = matchCategoryPath(categories, ['hamper', 'box', 'combo', 'gift']);
  const hero = content?.hero || {};
  const story = content?.brandStory || {};
  const heroImage = resolveAssetUrl(hero.image);
  const storyImage = resolveAssetUrl(story.image);
  const primaryCta = hero.primaryCta || { label: 'Shop Hampers', to: hampersTo };
  const secondaryCta = hero.secondaryCta || { label: 'Explore Dry Fruits', to: dryFruitsTo };

  const featuredIds = (content?.featuredCategoryIds || [])
    .map((item) => item?._id || item)
    .filter(Boolean);
  const categoryCards = (featuredIds.length
    ? featuredIds
        .map((id) => categories.find((category) => String(category._id) === String(id)))
        .filter(Boolean)
    : categories
  ).filter((category) => category.isActive !== false);

  const giftingTiles = (content?.gifting || [])
    .filter((item) => item.isActive !== false && item.title)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const banners = (content?.banners || []).filter((item) => item.isActive !== false && (item.title || item.image));

  const heroSlides = [];
  const seenSources = new Set();
  const addSlide = (slide) => {
    if (!slide?.src || seenSources.has(slide.src)) return;
    seenSources.add(slide.src);
    heroSlides.push(slide);
  };

  addSlide({
    id: 'hero-banner',
    name: hero.heading || content?.storeName || 'Anant Exotika Foods',
    src: heroImage,
    to: primaryCta.to || hampersTo,
  });
  categories.forEach((category) => {
    addSlide({
      id: category._id,
      name: category.name,
      src: resolveAssetUrl(category.image),
      to: `/shop/${category.slug}`,
    });
  });
  products.forEach((product) => {
    if (heroSlides.length >= 6) return;
    addSlide({
      id: product._id,
      name: product.name,
      src: getPrimaryImage(product),
      to: `/product/${product.slug}`,
    });
  });

  usePageMeta({
    title: content?.seoTitle || 'Anant Exotika Foods | Premium Dry Fruits & Gifting',
    description: content?.seoDescription,
    image: heroImage,
    type: 'website',
  });

  return (
    <div className="home">
      {content?.storeStatus === 'closed' ? (
        <div className="container" style={{ paddingTop: '1rem' }}>
          <p className="alert">The store is temporarily closed. You can still browse the collection.</p>
        </div>
      ) : null}

      <section className="hero" aria-label="Hero">
        <div className="hero__copy">
          <p className="hero__brand">{content?.storeName || 'Anant Exotika Foods'}</p>
          <h1 className="hero__title">{hero.heading || 'Thoughtfully Curated. Elegantly Gifted.'}</h1>
          <p className="hero__subtitle">
            {hero.subheading ||
              'Premium dry fruits and gifting, selected for flavour, freshness and the occasion — from family festivals to corporate courtesy.'}
          </p>
          <div className="hero__actions">
            <Button as={Link} to={primaryCta.to || hampersTo} variant="primary" size="lg">
              {primaryCta.label || 'Shop Hampers'}
            </Button>
            <Button as={Link} to={secondaryCta.to || dryFruitsTo} variant="outline" size="lg">
              {secondaryCta.label || 'Explore Dry Fruits'}
            </Button>
          </div>
        </div>
        <HeroShowcase slides={heroSlides} />
      </section>

      {banners.length ? (
        <section className="section section--ivory">
          <div className="container">
            <div className="gifting-grid">
              {banners.map((item) => (
                <Link key={item._id || item.title} to={item.to || '/shop'} className="gifting-card">
                  {item.image ? <img src={resolveAssetUrl(item.image)} alt="" loading="lazy" /> : null}
                  <span>
                    <strong>{item.title}</strong>
                    {item.text ? <em>{item.text}</em> : null}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Reveal as="section" className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Collections"
            title="Shop by category"
            subtitle="Begin with dry fruits, a hamper, or a gift for the season."
          />
          {loading ? (
            <CategoryScroller>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton category-card" aria-hidden="true" />
              ))}
            </CategoryScroller>
          ) : categoryCards.length === 0 ? (
            <EmptyState
              title="Categories arriving soon"
              message="Collections will appear here as they are published from the admin panel."
              actionLabel="Browse shop"
              actionTo="/shop"
            />
          ) : (
            <CategoryScroller>
              {categoryCards.map((category) => {
                const imageSrc = resolveAssetUrl(category.image);
                return (
                  <Link key={category._id} to={`/shop/${category.slug}`} className="category-card">
                    {imageSrc ? <img src={imageSrc} alt="" loading="lazy" /> : <span className="category-card__fallback">{category.name.charAt(0)}</span>}
                    <span className="category-card__overlay">
                      <strong>{category.name}</strong>
                      {category.description ? <em>{category.description}</em> : null}
                    </span>
                  </Link>
                );
              })}
            </CategoryScroller>
          )}
        </div>
      </Reveal>

      <Reveal as="section" className="section section--ivory">
        <div className="container">
          <div className="section-heading-row">
            <SectionTitle
              align="left"
              eyebrow="The collection"
              title="Selected for the table"
              subtitle="Featured dry fruits and hampers, published from the catalogue."
            />
            <Button as={Link} to="/shop" variant="ghost" className="hide-mobile">
              View all
            </Button>
          </div>
          {loading ? (
            <ProductSkeleton count={8} />
          ) : error ? (
            <EmptyState title="Unable to load products" message={error} actionLabel="Shop now" actionTo="/shop" />
          ) : products.length === 0 ? (
            <EmptyState
              title="The collection is being prepared"
              message="New dry fruits and hampers will appear here when they are published."
            />
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal as="section" className="section">
        <div className="container">
          <SectionTitle
            eyebrow="The Anant standard"
            title="Trusted from orchard to occasion"
            subtitle="Quality, hygiene and careful delivery — the quiet details that make a gift feel assured."
          />
          <div className="trust-grid">
            {TRUST_POINTS.map((item, index) => {
              const Icon = TRUST_ICONS[index] || PackageCheck;
              return (
                <article key={item.title} className="trust-card">
                  <Icon size={22} strokeWidth={1.4} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </Reveal>

      {giftingTiles.length ? (
        <Reveal as="section" className="section section--ivory" id="gifting">
          <div className="container">
            <SectionTitle
              eyebrow="Gifting"
              title="A luxury gifting catalogue"
              subtitle="Hampers and occasions published from the admin panel."
            />
            <div className="gifting-grid">
              {giftingTiles.map((item) => (
                <Link key={item._id || item.title} to={item.to || '/shop'} className="gifting-card">
                  {item.image ? <img src={resolveAssetUrl(item.image)} alt="" loading="lazy" /> : null}
                  <span>
                    <strong>{item.title}</strong>
                    {item.text ? <em>{item.text}</em> : null}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      ) : (
        <div id="gifting" />
      )}

      <Reveal as="section" className="section">
        <div className="container">
          <div className="brand-story" id="our-story">
            {storyImage ? (
              <div className="brand-story__visual">
                <img src={storyImage} alt="" />
              </div>
            ) : null}
            <div className="brand-story__content">
              <SectionTitle
                align="left"
                eyebrow={story.eyebrow || 'Our story'}
                title={story.heading || 'Quality, elegance and the art of giving well'}
                subtitle="Anant Exotika Foods is a modern Indian house for premium dry fruits and gifting."
              />
              <p className="brand-story__text">
                {story.body ||
                  'We believe a gift should feel considered: selected for taste, packed with care, and remembered after the occasion has passed.'}
              </p>
              <Button as={Link} to={story.cta?.to || '/about'} variant="secondary">
                {story.cta?.label || 'Discover our story'}
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <section className="newsletter-band">
        <div className="container">
          <div className="newsletter">
            <p className="eyebrow">Stay close</p>
            <h2>{content?.newsletter?.heading || 'Invitations, harvests and gifting notes'}</h2>
            <p>
              {content?.newsletter?.body ||
                'Be first to know about festive collections, corporate programmes and limited harvests.'}
            </p>
            {subscribed ? (
              <p className="newsletter__thanks">Thank you. You are on the list.</p>
            ) : (
              <form className="newsletter__form" onSubmit={handleNewsletterSubmit}>
                <label htmlFor="home-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="home-newsletter-email"
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  autoComplete="email"
                />
                <Button type="submit" variant="gold">
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
