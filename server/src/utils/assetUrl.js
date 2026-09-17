const getPublicBaseUrl = (req) => {
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) {
    return String(configured).replace(/\/$/, '');
  }

  if (req) {
    return `${req.protocol}://${req.get('host')}`;
  }

  return '';
};

const toPublicAssetUrl = (url, req) => {
  if (!url) return url;

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads/')) {
        const base = getPublicBaseUrl(req);
        return base ? `${base}${parsed.pathname}` : parsed.pathname;
      }
    } catch {
      return url;
    }
    return url;
  }

  const pathname = url.startsWith('/') ? url : `/${url}`;
  const base = getPublicBaseUrl(req);
  return base ? `${base}${pathname}` : pathname;
};

const toStoredAssetPath = (url) => {
  if (!url) return url;

  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  return url.startsWith('/') ? url : `/${url}`;
};

const normalizeProductImages = (images) => {
  if (!Array.isArray(images)) return images;

  return images
    .filter((image) => image && image.url)
    .map((image, index) => ({
      url: toStoredAssetPath(image.url),
      altText: image.altText || '',
      isPrimary: Boolean(image.isPrimary) || index === 0,
    }));
};

module.exports = {
  getPublicBaseUrl,
  toPublicAssetUrl,
  toStoredAssetPath,
  normalizeProductImages,
};
