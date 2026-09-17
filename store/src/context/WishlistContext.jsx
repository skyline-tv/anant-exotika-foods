import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as wishlistService from '../services/wishlistService';
import { getErrorMessage } from '../utils/getErrorMessage';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = useCallback(async () => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const wishlist = await wishlistService.getWishlist();
      setProducts(wishlist?.products || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to load wishlist.'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, toast]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const ids = useMemo(() => new Set(products.map((product) => String(product._id))), [products]);

  const requireLogin = useCallback(
    (from) => {
      toast.info('Please log in to save items to your wishlist.');
      navigate('/login', { state: { from } });
    },
    [navigate, toast]
  );

  const toggle = useCallback(
    async (product, from = '/wishlist') => {
      const productId = product?._id || product;
      if (!productId) return;

      if (!isAuthenticated) {
        requireLogin(from);
        return;
      }

      try {
        const next = ids.has(String(productId))
          ? await wishlistService.removeFromWishlist(productId)
          : await wishlistService.addToWishlist(productId);
        setProducts(next?.products || []);
        toast.success(ids.has(String(productId)) ? 'Removed from wishlist.' : 'Added to wishlist.');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Unable to update wishlist.'));
      }
    },
    [ids, isAuthenticated, requireLogin, toast]
  );

  const remove = useCallback(
    async (productId) => {
      if (!isAuthenticated) return;
      const next = await wishlistService.removeFromWishlist(productId);
      setProducts(next?.products || []);
      toast.success('Removed from wishlist.');
    },
    [isAuthenticated, toast]
  );

  const value = useMemo(
    () => ({
      products,
      count: products.length,
      loading,
      isSaved: (productId) => ids.has(String(productId)),
      toggle,
      remove,
      refresh: loadWishlist,
    }),
    [products, loading, ids, toggle, remove, loadWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}
