import { resolveAssetUrl } from './assetUrl';

export function getCategoryImage(category) {
  if (!category?.image) return '';
  return resolveAssetUrl(category.image);
}

export function getPrimaryImage(product) {
  if (product?.images?.length) {
    const primary = product.images.find((image) => image.isPrimary);
    const url = (primary || product.images[0]).url || '';
    if (url) return resolveAssetUrl(url);
  }

  return getCategoryImage(product?.category);
}

export function getCategoryName(category) {
  if (!category) return 'Collection';
  if (typeof category === 'string') return category;
  return category.name || 'Collection';
}

export function getProductBadge(product) {
  if (product?.isNewArrival) return 'New';
  if (product?.isFeatured) return 'Featured';
  if (product?.isBestSeller) return 'Best Seller';
  return '';
}

export function getMrp(product) {
  return Number(product?.mrp || product?.compareAtPrice) || 0;
}

export function getSellingRate(product) {
  return Number(product?.price) || 0;
}

export function isOutOfStock(product) {
  return !product || product.status === 'out_of_stock' || Number(product.stock) <= 0;
}
