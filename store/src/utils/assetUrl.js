export function getAssetBaseUrl() {
  const explicit = import.meta.env.VITE_ASSET_URL;
  if (explicit) return String(explicit).replace(/\/$/, '');

  const api = import.meta.env.VITE_API_URL || '';
  return api.replace(/\/api\/v1\/?$/, '');
}

export function resolveAssetUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const base = getAssetBaseUrl();
  const path = url.startsWith('/') ? url : `/${url}`;
  return base ? `${base}${path}` : path;
}
