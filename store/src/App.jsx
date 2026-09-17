import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ContentProvider } from './context/ContentContext';
import { ToastProvider } from './context/ToastContext';
import { UiProvider } from './context/UiContext';
import { WishlistProvider } from './context/WishlistContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ContentProvider>
            <UiProvider>
              <CartProvider>
                <WishlistProvider>
                  <AppRoutes />
                </WishlistProvider>
              </CartProvider>
            </UiProvider>
          </ContentProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
