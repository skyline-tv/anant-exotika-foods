export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=1800&q=80';

export const BRAND_STORY_IMAGE =
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1400&q=80';

export const CATEGORY_SHOWCASE = [
  {
    key: 'dry-fruits',
    title: 'Premium Dry Fruits',
    text: 'Hand-selected almonds, cashews, pistachios and more.',
    keywords: ['dry fruit', 'dryfruit', 'nuts', 'almond', 'cashew', 'pistachio', 'walnut'],
    fallbackTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'hampers',
    title: 'Gift Hampers',
    text: 'Ready-to-gift boxes for every occasion.',
    keywords: ['hamper', 'box', 'combo', 'gift hamper'],
    fallbackTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'festive',
    title: 'Festive Gifting',
    text: 'Diwali, Rakhi and celebration-ready assortments.',
    keywords: ['festive', 'diwali', 'rakhi', 'raksha', 'celebration'],
    fallbackTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'corporate',
    title: 'Corporate Gifting',
    text: 'Refined hampers for clients, teams and partners.',
    keywords: ['corporate', 'bulk', 'business', 'office'],
    fallbackTo: '/contact',
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'mukhwas',
    title: 'Mukhwas',
    text: 'Traditional mouth fresheners, finely blended.',
    keywords: ['mukhwas', 'mouth', 'saunf', 'fennel', 'mouthfreshener'],
    fallbackTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    key: 'collection',
    title: 'The Collection',
    text: 'Explore everything from everyday jars to luxury boxes.',
    keywords: ['collection', 'all', 'featured'],
    fallbackTo: '/shop',
    image:
      'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=1200&q=80',
  },
];

export const GIFTING_OCCASIONS = [
  {
    title: 'Raksha Bandhan',
    text: 'A gracious hamper for the bond that lasts.',
    image:
      'https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=1200&q=80',
    to: '/shop',
  },
  {
    title: 'Diwali',
    text: 'Gold-standard dry fruits for the festival of lights.',
    image:
      'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80',
    to: '/shop',
  },
  {
    title: 'Corporate Gifting',
    text: 'Impeccable presentation for professional relationships.',
    image:
      'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=1200&q=80',
    to: '/contact',
  },
  {
    title: 'Wedding Gifting',
    text: 'Elegant favours that honour hosts and guests alike.',
    image:
      'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
    to: '/shop',
  },
  {
    title: 'Festive Occasions',
    text: 'Thoughtful boxes for birthdays, Ganesh Chaturthi and more.',
    image:
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=1200&q=80',
    to: '/shop',
  },
  {
    title: 'Premium Hampers',
    text: 'Curated assortments, ready to arrive with grace.',
    image:
      'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?auto=format&fit=crop&w=1200&q=80',
    to: '/shop',
  },
];

export const TRUST_POINTS = [
  {
    title: 'Premium Quality',
    text: 'Grade-selected dry fruits chosen for flavour, size and freshness.',
  },
  {
    title: 'Carefully Selected',
    text: 'Sourced with care and tasted before they reach your table.',
  },
  {
    title: 'Hygienically Packed',
    text: 'Sealed in clean, gift-ready packaging you can trust.',
  },
  {
    title: 'Secure Payments',
    text: 'Protected checkout with Cash on Delivery across India.',
  },
  {
    title: 'Fast & Reliable Delivery',
    text: 'Dispatched with care and tracked until it arrives.',
  },
];

export const PRODUCT_FAQS = [
  {
    question: 'How should dry fruits be stored?',
    answer:
      'Keep them in an airtight container, away from heat and humidity. Refrigeration helps preserve freshness in warmer months.',
  },
  {
    question: 'Is Cash on Delivery available?',
    answer: 'Yes. Cash on Delivery is available across India on eligible orders, confirmed at checkout.',
  },
  {
    question: 'Do you offer corporate and wedding gifting?',
    answer:
      'Yes. We curate hampers for corporate programmes, weddings and festivals. Share your brief on the contact page and we will assist with quantities and presentation.',
  },
  {
    question: 'What is the typical delivery time?',
    answer:
      'Most orders are prepared promptly and delivered across India in a few business days, depending on destination and courier partner.',
  },
];

export const PRODUCT_HIGHLIGHTS = [
  'Premium, carefully selected dry fruits',
  'Hygienically packed for freshness',
  'Gift-ready presentation',
  'Pan-India delivery',
  'Cash on Delivery available',
];

export function matchCategoryPath(categories = [], keywords = [], fallback = '/shop') {
  const found = categories.find((category) => {
    const haystack = `${category.name || ''} ${category.slug || ''}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  });
  return found ? `/shop/${found.slug}` : fallback;
}

export function resolveCategoryMedia(category, fallbackImage) {
  return category?.image || fallbackImage;
}
