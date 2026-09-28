import { resolveAssetUrl } from './assetUrl';

export function getPrimaryImage(product) {
  if (!product?.images?.length) return '';
  const primary = product.images.find((image) => image.isPrimary);
  return resolveAssetUrl((primary || product.images[0]).url || '');
}

export function getStockStatus(product) {
  const stock = Number(product?.stock) || 0;
  const threshold = Number(product?.lowStockThreshold) || 0;

  if (stock <= 0 || product?.status === 'out_of_stock') return 'out_of_stock';
  if (threshold > 0 && stock <= threshold) return 'low_stock';
  return 'healthy';
}

export function getCategoryName(category) {
  if (!category) return '—';
  if (typeof category === 'string') return category;
  return category.name || '—';
}

export function getCategoryNames(product) {
  const names = [];
  const seen = new Set();
  const add = (category) => {
    const id = category?._id || category;
    const name = getCategoryName(category);
    if (!id || !name || name === '—' || seen.has(String(id))) return;
    seen.add(String(id));
    names.push(name);
  };
  add(product?.category);
  (product?.categories || []).forEach(add);
  add(product?.subCategory);
  return names.length ? names.join(', ') : '—';
}

export function getUserName(user) {
  if (!user) return 'Guest';
  if (typeof user === 'string') return 'Customer';
  return user.name || user.email || 'Customer';
}
