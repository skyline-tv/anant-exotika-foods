import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as cartService from '../services/cartService';
import { getProducts } from '../services/productService';
import { getErrorMessage } from '../utils/getErrorMessage';
import { clearGuestCart, getGuestCart, setGuestCart } from '../utils/storage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

const emptyCart = {
  items: [],
  subtotal: 0,
  itemCount: 0,
  warnings: [],
};

const toGuestCartState = (items) => {
  const mapped = items
    .filter((item) => item?.product)
    .map((item) => {
      const price = Number(item.product.price) || 0;
      const quantity = Number(item.quantity) || 1;
      return {
        product: item.product,
        quantity,
        price,
        lineTotal: price * quantity,
      };
    });

  return {
    items: mapped,
    subtotal: mapped.reduce((sum, item) => sum + item.lineTotal, 0),
    itemCount: mapped.reduce((sum, item) => sum + item.quantity, 0),
  };
};

const persistGuest = (items) => {
  setGuestCart(
    items.map((item) => ({
      productId: item.product?._id || item.productId,
      quantity: item.quantity,
      product: item.product,
    }))
  );
};

export function CartProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(true);
  const mergedRef = useRef(false);

  const applyServerCart = (nextCart) => {
    setCart({
      items: nextCart?.items || [],
      subtotal: nextCart?.subtotal || 0,
      itemCount: nextCart?.itemCount || 0,
      warnings: nextCart?.warnings || [],
    });
  };

  const refreshGuestProducts = useCallback(async (guestItems) => {
    const ids = guestItems.map((item) => item.productId).filter(Boolean);
    if (!ids.length) return toGuestCartState([]);

    try {
      const { products } = await getProducts({ ids: ids.join(','), limit: 50 });
      const productMap = new Map((products || []).map((product) => [String(product._id), product]));
      const hydrated = guestItems
        .map((item) => ({
          ...item,
          product: productMap.get(String(item.productId)) || item.product,
        }))
        .filter((item) => item.product && item.product.status !== 'draft' && item.product.status !== 'inactive')
        .map((item) => {
          const stock = Number(item.product.stock);
          if (!Number.isFinite(stock)) return item;
          if (stock <= 0 || item.product.status === 'out_of_stock') return null;
          if (item.quantity > stock) {
            return { ...item, quantity: stock };
          }
          return item;
        })
        .filter(Boolean);
      persistGuest(hydrated);
      const warnings = [];
      guestItems.forEach((item) => {
        const product = productMap.get(String(item.productId));
        if (!product) {
          warnings.push('Your cart has been updated because an item is no longer available.');
          return;
        }
        const stock = Number(product.stock);
        if (!Number.isFinite(stock) || stock <= 0 || product.status === 'out_of_stock') {
          warnings.push(`${product.name} is currently unavailable.`);
        } else if (item.quantity > stock) {
          warnings.push(`Quantity for ${product.name} was updated because stock availability changed.`);
        }
      });
      const next = toGuestCartState(hydrated);
      return { ...next, warnings: [...new Set(warnings)] };
    } catch {
      return toGuestCartState(guestItems);
    }
  }, []);

  const loadCart = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);

    try {
      if (isAuthenticated) {
        const guestItems = getGuestCart();
        if (guestItems.length && !mergedRef.current) {
          mergedRef.current = true;
          try {
            const merged = await cartService.mergeCart(
              guestItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              }))
            );
            clearGuestCart();
            applyServerCart(merged);
          } catch {
            const next = await cartService.getCart();
            applyServerCart(next);
          }
        } else {
          const next = await cartService.getCart();
          applyServerCart(next);
          if (next?.warnings?.length) {
            toast.warning(next.warnings[0]);
          }
        }
      } else {
        mergedRef.current = false;
        const guestItems = getGuestCart();
        const next = await refreshGuestProducts(guestItems);
        setCart(next);
        if (next?.warnings?.length) {
          toast.warning(next.warnings[0]);
        }
      }
    } catch (error) {
      if (!isAuthenticated) {
        setCart(toGuestCartState(getGuestCart()));
      } else {
        toast.error(getErrorMessage(error, 'Unable to load cart.'));
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, refreshGuestProducts, toast]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = useCallback(
    async (product, quantity = 1) => {
      const productId = product?._id || product;
      if (!productId) return;

      if (isAuthenticated) {
        const next = await cartService.addToCart({ productId, quantity });
        applyServerCart(next);
        if (next?.warnings?.length) {
          toast.warning(next.warnings[0]);
        } else {
          toast.success('Added to cart.');
        }
        return next;
      }

      const guestItems = getGuestCart();
      const existing = guestItems.find((item) => String(item.productId) === String(productId));
      const nextQty = (existing?.quantity || 0) + quantity;
      const available = Number(product?.stock);
      if (product?.status === 'out_of_stock' || (Number.isFinite(available) && available <= 0)) {
        toast.error('Product is currently unavailable.');
        throw new Error('out of stock');
      }
      if (Number.isFinite(available) && nextQty > available) {
        toast.error('Product is currently unavailable in that quantity.');
        throw new Error('insufficient stock');
      }
      const nextItems = existing
        ? guestItems.map((item) =>
            String(item.productId) === String(productId) ? { ...item, quantity: nextQty, product } : item
          )
        : [...guestItems, { productId, quantity, product }];

      persistGuest(nextItems);
      setCart(toGuestCartState(nextItems));
      toast.success('Added to cart.');
      return toGuestCartState(nextItems);
    },
    [isAuthenticated, toast]
  );

  const updateItem = useCallback(
    async (productId, quantity) => {
      if (isAuthenticated) {
        const next = await cartService.updateCartItem(productId, quantity);
        applyServerCart(next);
        return next;
      }

      const guestItems = getGuestCart();
      const current = guestItems.find((item) => String(item.productId) === String(productId));
      if (quantity > 0) {
        const available = Number(current?.product?.stock);
        if (current?.product?.status === 'out_of_stock' || (Number.isFinite(available) && available <= 0)) {
          toast.error('Product is currently unavailable.');
          throw new Error('out of stock');
        }
        if (Number.isFinite(available) && quantity > available) {
          toast.error('Product is currently unavailable in that quantity.');
          throw new Error('insufficient stock');
        }
      }
      const nextItems =
        quantity <= 0
          ? guestItems.filter((item) => String(item.productId) !== String(productId))
          : guestItems.map((item) =>
              String(item.productId) === String(productId) ? { ...item, quantity } : item
            );
      persistGuest(nextItems);
      const next = toGuestCartState(nextItems);
      setCart(next);
      return next;
    },
    [isAuthenticated, toast]
  );

  const removeItem = useCallback(
    async (productId) => {
      if (isAuthenticated) {
        const next = await cartService.removeCartItem(productId);
        applyServerCart(next);
        toast.success('Item removed from cart.');
        return next;
      }

      const nextItems = getGuestCart().filter((item) => String(item.productId) !== String(productId));
      persistGuest(nextItems);
      setCart(toGuestCartState(nextItems));
      toast.success('Item removed from cart.');
    },
    [isAuthenticated, toast]
  );

  const clear = useCallback(async () => {
    if (isAuthenticated) {
      const next = await cartService.clearCart();
      applyServerCart(next);
      return next;
    }
    clearGuestCart();
    setCart(emptyCart);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      cart,
      items: cart.items,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      loading,
      addItem,
      updateItem,
      removeItem,
      clear,
      refresh: loadCart,
    }),
    [cart, loading, addItem, updateItem, removeItem, clear, loadCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
