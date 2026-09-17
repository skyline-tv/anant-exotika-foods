import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, X } from 'lucide-react';
import Button from '../../components/common/Button';
import Breadcrumb from '../../components/common/Breadcrumb';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import QuantitySelector from '../../components/common/QuantitySelector';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import { getProductBySlug } from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getCategoryName, getMrp, getPrimaryImage, getSellingRate, isOutOfStock } from '../../utils/productHelpers';
import { resolveAssetUrl } from '../../utils/assetUrl';

const ProductDetails = () => {
  const { slug } = useParams();
  const toast = useToast();
  const { openCart } = useUi();
  const { addItem } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [adding, setAdding] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState('description');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getProductBySlug(slug)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setActiveImage(getPrimaryImage(data));
        setQuantity(1);
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
  const categoryName = getCategoryName(product.category);
  const categorySlug = product.category?.slug;

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

  const details = [
    product.sku ? `SKU ${product.sku}` : null,
    product.brand ? `Brand ${product.brand}` : null,
    product.weight ? `Weight ${product.weight} g` : null,
    product.dimensions?.length
      ? `Dimensions ${product.dimensions.length} × ${product.dimensions.width} × ${product.dimensions.height} ${product.dimensions.unit || 'cm'}`
      : null,
  ].filter(Boolean);

  const panels = [
    { id: 'description', title: 'Description', body: product.description || product.shortDescription || 'A signature piece from the Anant Exotika collection.' },
    { id: 'details', title: 'Product details', body: details.length ? details.join('\n') : 'Each piece is finished with care and presented as a complete luxury experience.' },
    { id: 'shipping', title: 'Shipping', body: 'Pan India delivery with complimentary premium packaging on selected orders. Timelines are confirmed at checkout.' },
    { id: 'returns', title: 'Returns', body: 'Please review our returns policy for eligibility, timelines and the condition in which pieces should be received.' },
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
                <div className="product-card__placeholder" style={{ aspectRatio: '3 / 4' }}>
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
            </div>
            {product.shortDescription ? <p className="product-info__lead">{product.shortDescription}</p> : null}
            <p className="product-info__stock">{outOfStock ? 'Currently unavailable' : 'In stock'}</p>

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
                {adding ? 'Adding...' : 'Add to bag'}
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
      </div>

      <div className="pdp-sticky show-mobile-only">
        <div>
          <strong>{formatCurrency(sellingRate)}</strong>
          <span>{product.name}</span>
        </div>
        <Button onClick={handleAdd} disabled={outOfStock || adding} size="sm">
          {outOfStock ? 'Unavailable' : 'Add to bag'}
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
