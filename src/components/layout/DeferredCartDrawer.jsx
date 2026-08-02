import { lazy, Suspense } from 'react';
import { useCart } from '../../context/CartContext';

const CartDrawer = lazy(() => import('./CartDrawer'));

export default function DeferredCartDrawer() {
  const { drawerOpen } = useCart();
  if (!drawerOpen) return null;
  return (
    <Suspense fallback={null}>
      <CartDrawer />
    </Suspense>
  );
}
