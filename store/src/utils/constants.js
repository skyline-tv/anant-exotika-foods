export const BRAND_NAME = 'ANANT EXOTIKA';
export const BRAND_TAGLINE = 'Beyond Time, Beyond Luxury';

export const CONTACT = {
  emails: ['info@anantexotika.in', 'anantexotika.in@gmail.com'],
  phone: '9623079356',
  phoneDisplay: '+91 96230 79356',
  phoneTel: '+919623079356',
  instagramHandle: 'anantexotika.in',
  instagramUrl: 'https://www.instagram.com/anantexotika.in/',
  facebookHandle: 'anantexotika.in',
  facebookUrl: 'https://www.facebook.com/anantexotika.in',
  whatsappUrl: 'https://wa.me/919623079356',
  occasions: ['Weddings', 'Birthdays', 'Diwali', 'Ganesh Chaturthi', 'Custom orders'],
};

export const CUSTOMER_TOKEN_KEY = 'anant_customer_token';
export const GUEST_CART_KEY = 'anant_guest_cart';

export const AUTH_UNAUTHORIZED_EVENT = 'customer:unauthorized';

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'featured', label: 'Featured' },
];

export const ADDRESS_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
];

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};
