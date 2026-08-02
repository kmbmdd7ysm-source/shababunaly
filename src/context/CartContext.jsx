import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
  useRef,
} from 'react';
import { STORAGE_KEYS } from '../config';
import { trackEvent } from '../utils/analytics';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { readScoped, writeScoped, createChannel } from '../services/sync/storage';
import { cartRequiresPhysicalShipping } from '../utils/fulfillment';
import { getVariantPurchaseLimit, isVariantPurchasable } from '../utils/productEligibility';
const CartContext = createContext(null);
function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const item = action.item,
        existing = state.find((i) => i.key === item.key);
      if (existing)
        return state.map((i) =>
          i.key !== item.key
            ? i
            : {
                ...i,
                quantity:
                  i.type === 'product'
                    ? Math.min(i.quantity + item.quantity, i.maxStock ?? Infinity)
                    : 1,
                updatedAt: new Date().toISOString(),
              },
        );
      return [
        ...state,
        {
          ...item,
          quantity:
            item.type === 'product' ? Math.max(item.minQuantity ?? 1, Math.min(item.quantity, item.maxStock ?? Infinity)) : 1,
          updatedAt: new Date().toISOString(),
        },
      ];
    }
    case 'UPDATE_QTY':
      return state.map((i) =>
        i.key !== action.key
          ? i
          : {
              ...i,
              quantity: Math.max(i.minQuantity ?? 1, Math.min(action.quantity, i.maxStock ?? Infinity)),
              updatedAt: new Date().toISOString(),
            },
      );
    case 'REMOVE':
      return state.filter((i) => i.key !== action.key);
    case 'CLEAR':
      return [];
    case 'REPLACE':
      return Array.isArray(action.items) ? action.items : state;
    case 'RECONCILE_CATALOG':
      return state.map((item) => {
        if (item.type !== 'product') return item;
        const product = action.byId.get(item.id);
        if (!product) return { ...item, unavailable: true, maxStock: 0 };
        const variant = (product.variants || []).find((entry) => entry.sku === item.sku);
        if (!variant) return { ...item, unavailable: true, maxStock: 0 };
        const wholesale = item.purchaseMode === 'wholesale';
        const retailPrice = Number(variant.unitPrice ?? product.price);
        const wholesalePrice = Number(variant.wholesalePrice ?? product.wholesalePrice ?? 0);
        const price = wholesale && wholesalePrice > 0 ? wholesalePrice : retailPrice;
        const tracked = variant.inventoryTracking !== false;
        const purchasable = isVariantPurchasable(product, variant);
        const maxStock = getVariantPurchaseLimit(variant);
        return {
          ...item,
          name: product.name,
          image: product.image || item.image,
          slug: product.slug,
          href: `/products/${product.slug}`,
          price,
          retailPrice,
          wholesalePrice: wholesalePrice > 0 ? wholesalePrice : null,
          minQuantity: wholesale ? Number(product.wholesaleMin || product.minimumOrder || 1) : 1,
          maxStock,
          inventoryTracking: tracked,
          readyToShip: Boolean(product.readyToShip && (!tracked || maxStock > 0)),
          deliveryProfile: wholesale ? 'custom' : product.readyToShip ? 'ready' : 'standard',
          unavailable: !purchasable,
          quantity: !purchasable
            ? Number(item.quantity || 1)
            : Math.max(wholesale ? Number(product.wholesaleMin || 1) : 1, Math.min(Number(item.quantity || 1), maxStock || 99)),
        };
      });
    default:
      return state;
  }
}
export function CartProvider({ children }) {
  const auth = useAuth(),
    catalog = useCatalog(),
    scope = auth.user?.id || null;
  const [items, dispatch] = useReducer(reducer, []),
    [drawerOpen, setDrawerOpen] = useState(false);
  const priorScope = useRef(Symbol('initial')),
    channel = useRef(null),
    ready = useRef(false);
  useEffect(() => {
    if (auth.loading) return;
    ready.current = false;
    dispatch({ type: 'REPLACE', items: readScoped(STORAGE_KEYS.cart, scope, []) });
    priorScope.current = scope;
    ready.current = true;
  }, [scope, auth.loading]);
  useEffect(() => {
    if (!ready.current || !catalog.products?.length) return;
    dispatch({ type: 'RECONCILE_CATALOG', byId: new Map(catalog.products.map((product) => [product.id, product])) });
  }, [catalog.products]);
  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-cart-channel', (msg) => {
      if (msg.type === 'cart' && msg.scope === (scope || 'guest'))
        dispatch({ type: 'REPLACE', items: msg.payload });
    });
    return () => channel.current?.close();
  }, [scope]);
  useEffect(() => {
    if (!ready.current) return;
    writeScoped(STORAGE_KEYS.cart, scope, items);
    channel.current?.post('cart', items, { scope: scope || 'guest', version: Date.now() });
  }, [items, scope]);
  const addItem = useCallback((item, { openDrawer = true } = {}) => {
      dispatch({ type: 'ADD', item });
      trackEvent('add_to_cart', { item_id: item.id, item_type: item.type, value: item.price });
      if (openDrawer) setDrawerOpen(true);
    }, []),
    updateQuantity = useCallback(
      (key, quantity) => dispatch({ type: 'UPDATE_QTY', key, quantity }),
      [],
    ),
    removeItem = useCallback((key) => dispatch({ type: 'REMOVE', key }), []),
    clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []),
    replaceItems = useCallback((next) => dispatch({ type: 'REPLACE', items: next }), []);
  const subtotal = useMemo(
      () => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0),
      [items],
    ),
    count = useMemo(() => items.reduce((s, i) => s + Number(i.quantity || 0), 0), [items]),
    hasPhysical = useMemo(() => cartRequiresPhysicalShipping(items), [items]),
    digitalOnly = useMemo(() => items.length > 0 && !cartRequiresPhysicalShipping(items), [items]);
  return (
    <CartContext.Provider
      value={useMemo(
        () => ({
          items,
          addItem,
          updateQuantity,
          removeItem,
          clearCart,
          replaceItems,
          subtotal,
          count,
          hasPhysical,
          digitalOnly,
          drawerOpen,
          openDrawer: () => setDrawerOpen(true),
          closeDrawer: () => setDrawerOpen(false),
        }),
        [
          items,
          addItem,
          updateQuantity,
          removeItem,
          clearCart,
          replaceItems,
          subtotal,
          count,
          hasPhysical,
          digitalOnly,
          drawerOpen,
        ],
      )}
    >
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
export const cartKey = (type, id, variant = '') => `${type}:${id}:${variant}`;
