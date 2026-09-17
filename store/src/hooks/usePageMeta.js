import { useEffect } from 'react';

const upsertMeta = (selector, attributes) => {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value) el.setAttribute(key, value);
  });
  return el;
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const upsertJsonLd = (id, data) => {
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

export function usePageMeta({
  title,
  description,
  image,
  canonical,
  type = 'website',
  jsonLd,
} = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;
    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description });
      upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    }
    if (title) {
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    }
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    if (image) {
      upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image });
    }
    if (typeof window !== 'undefined') {
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical || window.location.href });
      upsertLink('canonical', canonical || window.location.href);
    }
    upsertJsonLd('anant-jsonld', jsonLd);

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image, canonical, type, jsonLd]);
}