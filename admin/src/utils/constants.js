export const BRAND_NAME = 'ANANT EXOTIKA';
export const BRAND_TAGLINE = 'Beyond Time, Beyond Luxury';
export const ADMIN_PORTAL_LABEL = 'Admin Portal';

export const TOKEN_STORAGE_KEY = 'anant_admin_token';
export const REMEMBER_STORAGE_KEY = 'anant_admin_remember';
export const SIDEBAR_STORAGE_KEY = 'anant_admin_sidebar_collapsed';
export const SETTINGS_STORAGE_KEY = 'anant_admin_store_settings';

export const PRODUCT_STATUSES = ['draft', 'active', 'inactive', 'out_of_stock'];

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'refunded',
  'failed',
];

export const SENSITIVE_ORDER_STATUSES = ['cancelled', 'refunded'];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'razorpay', label: 'Razorpay' },
];

export const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed', label: 'Fixed' },
];

export const COUPON_KINDS = [
  { value: 'promo', label: 'Coupon' },
  { value: 'gift_voucher', label: 'Gift voucher' },
];

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export const DEFAULT_SETTINGS = {
  storeName: BRAND_NAME,
  storeEmail: 'info@anantexotika.in',
  phone: '9623079356',
  address: '',
  orderPrefix: 'AE',
  currency: 'INR',
  storeStatus: 'open',
  maintenanceMode: false,
};

export const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/products/add': 'Add Product',
  '/categories': 'Categories',
  '/orders': 'Orders',
  '/customers': 'Customers',
  '/inventory': 'Inventory',
  '/coupons': 'Coupons & Vouchers',
  '/settings': 'Settings',
};

export const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
  out_of_stock: 'Out of Stock',
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
  failed: 'Failed',
  paid: 'Paid',
  failed: 'Failed',
  low_stock: 'Low Stock',
  healthy: 'Healthy',
  open: 'Open',
  closed: 'Closed',
  gift_voucher: 'Gift voucher',
  promo: 'Coupon',
  redeemed: 'Redeemed',
};

export function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/products/') && pathname.endsWith('/edit')) {
    return 'Edit Product';
  }
  if (pathname.startsWith('/orders/')) return 'Order Details';
  if (pathname.startsWith('/customers/')) return 'Customer Details';
  return 'Admin';
}
