import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [cartOpen, setCartOpen] = useState(false);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const value = useMemo(
    () => ({
      cartOpen,
      openCart,
      closeCart,
    }),
    [cartOpen, openCart, closeCart]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error('useUi must be used within UiProvider');
  }
  return context;
}
