import {
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  TicketPercent,
  Users,
  Warehouse,
} from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/inventory', label: 'Inventory', icon: Warehouse },
  { to: '/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/settings', label: 'Settings', icon: Settings },
];
