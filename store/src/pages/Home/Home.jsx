import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
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
import './Home.css';

const PILLARS = [
  {
    num: '01',
    title: 'Curated Excellence',
    text: 'Every product is carefully selected.',
  },
  {
    num: '02',
    title: 'Premium Presentation',
    text: 'Luxury lies in every detail.',
  },
  {
    num: '03',
    title: 'Delivered with Care',
    text: 'A seamless experience from us to you.',
  },
];

const ROTATE_MS = 4200;

const HeroShowcase = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) return null;

  const active = slides[index] || slides[0];

  return (
    <div
      className="hero__showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
          <div className="hero__dots" role="tablist" aria-label="Featured collections">
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
  );
};

const Home = () => {
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
        const [categoryData, productData] = await Promise.all([
          getCategories(),
          getProducts({ limit: 8, sort: 'newest' }),
        ]);
        if (!active) return;
        setCategories(getParentCategories(categoryData || []).slice(0, 8));
        setProducts(productData.products || []);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Unable to load the latest collection.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    setSubscribed(true);
  };

  const heroSlides = categories
    .map((category) => {
      const src = resolveAssetUrl(category.image);
      if (!src) return null;
      return {
        id: category._id,
        name: category.name,
        src,
        to: `/shop/${category.slug}`,
      };
    })
    .filter(Boolean);

  return (
    <div className="home">
      <section className="hero" aria-label="Hero">
        <div className="hero__shade" aria-hidden="true" />
        <div className="hero__inner">
          <div className="hero__content">
            <p className="hero__brand">ANANT EXOTIKA</p>
            <h1 className="hero__title">
              Beyond Time
              <br />
              Beyond Luxury
            </h1>
            <p className="hero__subtitle">
              Discover thoughtfully curated products and extraordinary gifting experiences.
            </p>
            <div className="hero__actions">
              <Button as={Link} to="/shop" variant="glass" size="lg">
                Explore Collection
              </Button>
              <Link to="/about" className="hero__story">
                Discover Our Story
              </Link>
            </div>
          </div>
          <HeroShowcase slides={heroSlides} />
        </div>
      </section>

      <Reveal as="section" className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Collections"
            title="Shop by Collection"
            subtitle="Start with the flavour, the ritual, or the gift — then find the piece that belongs."
          />
          {loading ? (
            <div className="collection-row" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton collection-skeleton" />
              ))}
            </div>
          ) : error ? (
            <EmptyState title="Unable to load collections" message={error} actionLabel="Shop now" actionTo="/shop" />
          ) : categories.length === 0 ? (
            <EmptyState
              title="Collections arriving soon"
              message="New collections will appear here as they are added."
              actionLabel="Browse shop"
              actionTo="/shop"
            />
          ) : (
            <div className="collection-row">
              {categories.map((category) => {
                const imageSrc = resolveAssetUrl(category.image);
                return (
                  <Link key={category._id} to={`/shop/${category.slug}`} className="collection-tile">
                    <span className="collection-tile__media">
                      {imageSrc ? <img src={imageSrc} alt="" /> : <span>{category.name.charAt(0)}</span>}
                    </span>
                    <span className="collection-tile__name">
                      {category.name}
                      <ArrowUpRight size={15} strokeWidth={1.4} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal as="section" className="section section--cream">
        <div className="container">
          <div className="section-heading-row">
            <SectionTitle
              align="left"
              eyebrow="The Collection"
              title="Pieces to Fall For"
              subtitle="Large, quiet product presentation — so the craftsmanship can speak first."
            />
            <Button as={Link} to="/shop" variant="ghost" className="hide-mobile">
              View all
            </Button>
          </div>
          {loading ? (
            <ProductSkeleton count={8} />
          ) : products.length === 0 ? (
            <EmptyState title="The collection is being prepared" message="New pieces will appear here when they are published." />
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
          <div className="brand-story">
            <div className="brand-story__quote">
              <p>Beyond Time</p>
              <p>Beyond Luxury</p>
            </div>
            <div className="brand-story__content">
              <SectionTitle
                align="left"
                eyebrow="The House"
                title="Curated for Extraordinary Moments"
                subtitle="Every Anant Exotika creation is selected to transform an ordinary occasion into something memorable."
              />
              <p className="brand-story__text">
                From rare ingredients to thoughtful presentation, each piece is chosen for those who
                value elegance, exclusivity and the art of giving well.
              </p>
              <Button as={Link} to="/about" variant="secondary">
                Discover Our Story
              </Button>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className="campaign">
        <div className="campaign__inner">
          <p className="eyebrow">The Art of Gifting</p>
          <h2>
            Thoughtfully curated.
            <br />
            Beautifully presented.
            <br />
            Unforgettable.
          </h2>
          <Button as={Link} to="/shop" variant="glass">
            Shop the Collection
          </Button>
        </div>
      </Reveal>

      <Reveal as="section" className="section">
        <div className="container">
          <SectionTitle eyebrow="The Difference" title="Why Anant Exotika" />
          <div className="pillars">
            {PILLARS.map((item) => (
              <article key={item.num} className="pillar">
                <span>{item.num}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <section className="newsletter-band">
        <div className="container">
          <div className="newsletter">
            <p className="eyebrow">Correspondence</p>
            <h2>Enter the World of Anant Exotika</h2>
            <p>Be the first to discover new collections, exclusive pieces and special experiences.</p>
            {subscribed ? (
              <p className="newsletter__thanks">Thank you. You are now part of the house.</p>
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
                <Button type="submit" variant="glass">
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
