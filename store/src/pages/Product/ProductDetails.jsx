import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Heart, MapPin, ShieldCheck, X } from 'lucide-react';
import Button from '../../components/common/Button';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import ProductCard from '../../components/product/ProductCard';
import QuantitySelector from '../../components/common/QuantitySelector';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import { PRODUCT_FAQS, PRODUCT_HIGHLIGHTS } from '../../data/brandContent';
import { getProductBySlug, getProducts } from '../../services/productService';
import { getProductReviews } from '../../services/reviewService';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import {
  formatWeight,
  getCategoryName,
  getDiscountPercent,
  getMrp,
  getPrimaryImage,
  getSellingRate,
  isOutOfStock,
} from '../../utils/productHelpers';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { usePageMeta } from '../../hooks/usePageMeta';

const ProductDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const { openCart } = useUi();
  const { addItem } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState('description');
  const [pincode, setPincode] = useState('');
  const [pincodeMessage, setPincodeMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getProductBySlug(slug)
      .then(async (data) => {
        if (!active) return;
        setProduct(data);
        setActiveImage(getPrimaryImage(data));
        setQuantity(1);
        const categorySlug = data.category?.slug;
        const [relatedData, reviewData] = await Promise.all([
          categorySlug
            ? getProducts({ category: categorySlug, limit: 4 }).catch(() => ({ products: [] }))
            : Promise.resolve({ products: [] }),
          data._id ? getProductReviews(data._id).catch(() => ({ reviews: [] })) : Promise.resolve({ reviews: [] }),
        ]);
        if (!active) return;
        setRelated((relatedData.products || []).filter((item) => item._id !== data._id).slice(0, 4));
        setReviews(reviewData.reviews || []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'This product could not be found.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  usePageMeta({
    title: product ? `${product.seoTitle || product.name} | Anant Exotika Foods` : 'Anant Exotika Foods',
    description: product?.seoDescription || product?.shortDescription || product?.description,
    image: activeImage,
    type: 'product',
    jsonLd: product
      ? {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          description: product.shortDescription || product.description,
          sku: product.sku,
          image: activeImage ? [activeImage] : undefined,
          brand: { '@type': 'Brand', name: product.brand || 'Anant Exotika Foods' },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: getSellingRate(product),
            availability: isOutOfStock(product)
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          },
        }
      : null,
  });

  if (loading) return <Loader label="Loading product" />;
  if (error || !product) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState title="Product not found" message={error} actionLabel="Back to shop" actionTo="/shop" />
        </div>
      </section>
    );
  }

  const productImages = (product.images || []).map((image) => resolveAssetUrl(image.url)).filter(Boolean);
  const images = productImages.length ? productImages : [getPrimaryImage(product)].filter(Boolean);
  const outOfStock = isOutOfStock(product);
  const saved = isSaved(product._id);
  const sellingRate = getSellingRate(product);
  const mrp = getMrp(product);
  const discount = getDiscountPercent(product);
  const categoryName = getCategoryName(product.category);
  const categorySlug = product.category?.slug;
  const weight = formatWeight(product.weight);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addItem(product, quantity);
      openCart();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to add to cart.'));
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    setBuying(true);
    try {
      await addItem(product, quantity);
      if (isAuthenticated) navigate('/checkout');
      else navigate('/login', { state: { from: '/checkout' } });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to continue to checkout.'));
    } finally {
      setBuying(false);
    }
  };

  const handlePincode = (event) => {
    event.preventDefault();
    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setPincodeMessage('Please enter a valid 6-digit Indian pincode.');
      return;
    }
    setPincodeMessage(`Delivering to ${pincode.trim()} in 3–6 business days. Cash on Delivery is available.`);
  };

  const details = [
    product.sku ? `SKU ${product.sku}` : null,
    product.brand ? `Brand ${product.brand}` : null,
    weight ? `Net weight ${weight}` : null,
    product.dimensions?.length
      ? `Dimensions ${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} ${product.dimensions.unit || 'cm'}`
      : null,
  ].filter(Boolean);

  const panels = [
    {
      id: 'description',
      title: 'Description',
      body: product.description || product.shortDescription || 'A carefully selected piece from the Anant Exotika Foods collection.',
    },
    {
      id: 'details',
      title: 'Ingredients & details',
      body: details.length
        ? details.join('\n')
        : 'Premium dry fruits, hygienically packed and presented for gifting or the table.',
    },
    {
      id: 'shipping',
      title: 'Delivery',
      body: 'Pan-India delivery with complimentary premium packaging on selected orders. Timelines are confirmed at checkout.',
    },
    ...PRODUCT_FAQS.map((item) => ({ id: item.question, title: item.question, body: item.answer })),
  ];

  return (
    <section className="page-shell pdp">
      <div className="container">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/' },
            { label: 'Shop', to: '/shop' },
            ...(categorySlug ? [{ label: categoryName, to: `/shop/${categorySlug}` }] : []),
            { label: product.name },
          ]}
        />

        <div className="product-details">
          <div className="product-gallery">
            <button type="button" className="product-gallery__main" onClick={() => activeImage && setZoomOpen(true)}>
              {activeImage ? (
                <img src={activeImage} alt={product.name} />
              ) : (
                <div className="product-card__placeholder" style={{ aspectRatio: '1' }}>
                  <span>ANANT</span>
                </div>
              )}
            </button>
            {images.length > 1 ? (
              <div className="product-thumbs">
                {images.map((image) => (
                  <button
                    key={image}
                    type="button"
                    className={image === activeImage ? 'is-active' : undefined}
                    onClick={() => setActiveImage(image)}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="product-info">
            <p className="eyebrow">{categoryName}</p>
            <h1>{product.name}</h1>
            <div className="price-compare">
              <strong>{formatCurrency(sellingRate)}</strong>
              {mrp > sellingRate ? <s>{formatCurrency(mrp)}</s> : null}
              {discount ? <span className="price-compare__off">{discount}% off</span> : null}
            </div>
            {product.shortDescription ? <p className="product-info__lead">{product.shortDescription}</p> : null}
            <p className="product-info__stock">{outOfStock ? 'Out of Stock' : 'In Stock'}</p>

            {weight ? (
              <div>
                <p className="qty-selector__label">Weight</p>
                <div className="variant-row">
                  <span className="variant-chip is-active">{weight}</span>
                </div>
              </div>
            ) : null}

            <QuantitySelector
              id="qty"
              value={quantity}
              min={1}
              max={Math.max(1, product.stock || 1)}
              onChange={setQuantity}
              disabled={outOfStock}
            />

            <div className="product-actions">
              <Button onClick={handleAdd} disabled={outOfStock || adding} className="btn--full">
                {adding ? 'Adding...' : 'Add to cart'}
              </Button>
              <Button onClick={handleBuyNow} disabled={outOfStock || buying} variant="secondary" className="btn--full">
                {buying ? 'Continuing...' : 'Buy now'}
              </Button>
              <button
                type="button"
                className={`pdp-wish${saved ? ' is-saved' : ''}`}
                onClick={() => toggle(product, `/product/${product.slug}`)}
                aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={18} strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <form className="pincode-check" onSubmit={handlePincode}>
              <label htmlFor="pincode" className="qty-selector__label">
                <MapPin size={13} strokeWidth={1.6} /> Check delivery
              </label>
              <div className="pincode-check__row">
                <input
                  id="pincode"
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
                <Button type="submit" variant="outline" size="sm">
                  Check
                </Button>
              </div>
              {pincodeMessage ? <p>{pincodeMessage}</p> : null}
            </form>

            <p className="pay-note">
              <ShieldCheck size={16} strokeWidth={1.5} />
              Cash on Delivery available. Payments are processed through a secure checkout.
            </p>

            <ul className="pdp-highlights">
              {PRODUCT_HIGHLIGHTS.map((item) => (
                <li key={item}>
                  <Check size={15} strokeWidth={1.6} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="product-panels">
          {panels.map((panel) => (
            <section key={panel.id} className={`product-panel ${openPanel === panel.id ? 'is-open' : ''}`}>
              <button type="button" onClick={() => setOpenPanel(openPanel === panel.id ? '' : panel.id)}>
                {panel.title}
              </button>
              {openPanel === panel.id ? <p>{panel.body}</p> : null}
            </section>
          ))}
        </div>

        <div className="pdp-reviews">
          <h2>Reviews</h2>
          {reviews.length === 0 ? (
            <p>No reviews yet. Verified reviews appear here after delivery.</p>
          ) : (
            reviews.map((review) => (
              <article key={review._id} className="review-card">
                <span>{'★'.repeat(review.rating || 0)}</span>
                <strong>{review.title || review.user?.name || 'Guest'}</strong>
                <p>{review.comment}</p>
              </article>
            ))
          )}
        </div>

        {related.length ? (
          <div className="pdp-related">
            <h2>You may also like</h2>
            <div className="product-grid" style={{ marginTop: '1.5rem' }}>
              {related.map((item) => (
                <ProductCard key={item._id} product={item} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pdp-sticky show-mobile-only">
        <div>
          <strong>{formatCurrency(sellingRate)}</strong>
          <span>{product.name}</span>
        </div>
        <Button onClick={handleAdd} disabled={outOfStock || adding} size="sm">
          {outOfStock ? 'Unavailable' : 'Add to cart'}
        </Button>
      </div>

      {zoomOpen && activeImage ? (
        <div className="image-zoom" role="dialog" aria-modal="true" aria-label="Product image">
          <button type="button" className="image-zoom__close" onClick={() => setZoomOpen(false)} aria-label="Close">
            <X size={22} strokeWidth={1.4} />
          </button>
          <img src={activeImage} alt={product.name} />
        </div>
      ) : null}
    </section>
  );
};

export default ProductDetails;
