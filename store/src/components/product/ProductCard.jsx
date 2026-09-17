import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import {
  formatWeight,
  getCategoryName,
  getDiscountPercent,
  getMrp,
  getPrimaryImage,
  getProductBadge,
  getSellingRate,
  isOutOfStock,
} from '../../utils/productHelpers';
import './ProductCard.css';

const ProductCard = ({ product, name, slug, price, category, image, badge }) => {
  const toast = useToast();
  const { openCart } = useUi();
  const { addItem } = useCart();
  const { isSaved, toggle } = useWishlist();
  const [adding, setAdding] = useState(false);
  const resolved = product || { name, slug, price, category, image, badge };
  const title = resolved.name || 'Signature selection';
  const productSlug = resolved.slug || 'signature-selection';
  const imageSrc = product ? getPrimaryImage(product) : image;
  const categoryLabel = product ? getCategoryName(product.category) : category || 'Collection';
  const sellingValue = product ? getSellingRate(product) : 0;
  const sellingRate = product ? formatCurrency(sellingValue) : price;
  const mrp = product ? getMrp(product) : 0;
  const discount = product ? getDiscountPercent(product) : 0;
  const displayBadge = product ? getProductBadge(product) : badge;
  const saved = product?._id ? isSaved(product._id) : false;
  const outOfStock = product ? isOutOfStock(product) : false;
  const weight = product ? formatWeight(product.weight) : '';
  const descriptor = product?.shortDescription || categoryLabel;

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product?._id) return;
    await toggle(product, `/product/${productSlug}`);
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product?._id || adding) return;
    if (outOfStock) {
      toast.error('This product is currently out of stock.');
      return;
    }
    setAdding(true);
    try {
      await addItem(product, 1);
      openCart();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to add to cart.'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${productSlug}`} className="product-card__media" aria-label={`View ${title}`}>
        <div className="product-card__image">
          {imageSrc ? (
            <img src={imageSrc} alt={title} loading="lazy" />
          ) : (
            <div className="product-card__placeholder" aria-hidden="true">
              <span>ANANT</span>
            </div>
          )}
        </div>
        {displayBadge ? <span className="product-card__badge">{displayBadge}</span> : null}
        <button
          type="button"
          className={`product-card__wishlist${saved ? ' wishlist-active' : ''}`}
          aria-label={saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
          onClick={handleWishlist}
        >
          <Heart size={16} strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </Link>

      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link to={`/product/${productSlug}`}>{title}</Link>
        </h3>
        <p className="product-card__descriptor">{descriptor}</p>
        {weight ? <p className="product-card__meta">{weight}</p> : null}
        <p className="product-card__price">
          <span>{sellingRate}</span>
          {mrp > sellingValue ? <s>{formatCurrency(mrp)}</s> : null}
          {discount ? <em>{discount}% off</em> : null}
        </p>
        {product?._id ? (
          <button type="button" className="product-card__cart" onClick={handleAdd} disabled={outOfStock || adding}>
            {outOfStock ? 'Out of stock' : adding ? 'Adding' : 'Add to cart'}
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default ProductCard;
