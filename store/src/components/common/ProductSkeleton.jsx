const ProductSkeleton = ({ count = 8 }) => (
  <div className="product-grid" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="skeleton-card">
        <div className="skeleton skeleton-card__image" />
        <div className="skeleton skeleton-card__line" />
        <div className="skeleton skeleton-card__line skeleton-card__line--short" />
      </div>
    ))}
  </div>
);

export default ProductSkeleton;
