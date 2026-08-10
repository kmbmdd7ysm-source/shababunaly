import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '../config.ts';
import { trackEvent } from '../utils/analytics.ts';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { readScoped, writeScoped, createChannel } from '../services/sync/storage.ts';
import {
  cartRequiresPhysicalShipping,
  type FulfillmentItem,
} from '../utils/fulfillment.ts';
import {
  getVariantPurchaseLimit,
  isVariantPurchasable,
  type ProductLike,
  type VariantLike,
} from '../utils/productEligibility.ts';

export type CartItem = {
  key: string;
  id: string;
  type: string;
  quantity: number;
  price?: number;
  maxStock?: number | null;
  minQuantity?: number;
  sku?: string;
  purchaseMode?: string;
  name?: unknown;
  image?: string;
  slug?: string;
  href?: string;
  retailPrice?: number;
  wholesalePrice?: number | null;
  inventoryTracking?: boolean;
  readyToShip?: boolean;
  deliveryProfile?: string;
  unavailable?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'UPDATE_QTY'; key: string; quantity: number }
  | { type: 'REMOVE'; key: string }
  | { type: 'CLEAR' }
  | { type: 'REPLACE'; items: CartItem[] }
  | { type: 'RECONCILE_CATALOG'; byId: Map<string, Record<string, unknown>> };

export type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem, options?: { openDrawer?: boolean }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  replaceItems: (next: CartItem[]) => void;
  subtotal: number;
  count: number;
  hasPhysical: boolean;
  digitalOnly: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function reducer(state: CartItem[], action: CartAction): CartItem[] {

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
            item.type === 'product'
              ? Math.max(item.minQuantity ?? 1, Math.min(item.quantity, item.maxStock ?? Infinity))
              : 1,
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
              quantity: Math.max(
                i.minQuantity ?? 1,
                Math.min(action.quantity, i.maxStock ?? Infinity),
              ),
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
      return state.map((item): CartItem => {
        if (item.type !== 'product') return item;
        const product = action.byId.get(item.id) as Record<string, unknown> | undefined;
        if (!product) return { ...item, unavailable: true, maxStock: 0 };
        const variants = Array.isArray(product.variants) ? (product.variants as Array<Record<string, unknown>>) : [];
        const variant = variants.find((entry) => entry.sku === item.sku);
        if (!variant) return { ...item, unavailable: true, maxStock: 0 };
        const wholesale = item.purchaseMode === 'wholesale';
        const retailPrice = Number(variant.unitPrice ?? product.price);
        const wholesalePrice = Number(variant.wholesalePrice ?? product.wholesalePrice ?? 0);
        const price = wholesale && wholesalePrice > 0 ? wholesalePrice : retailPrice;
        const tracked = variant.inventoryTracking !== false;
        const purchasable = isVariantPurchasable(product as ProductLike, variant as VariantLike);
        const maxStock = getVariantPurchaseLimit(variant as VariantLike);
        return {
          ...item,
          name: product.name as CartItem['name'],
          image: String(product.image || item.image || ''),
          slug: String(product.slug || ''),
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
            : Math.max(
                wholesale ? Number(product.wholesaleMin || 1) : 1,
                Math.min(Number(item.quantity || 1), maxStock || 99),
              ),
        };
      });
    default:
      return state;
  }
}
export function CartProvider({ children }: { children?: ReactNode }) {
  const auth = useAuth(),
    catalog = useCatalog(),
    scope = auth.user?.id || null;
  const [items, dispatch] = useReducer(reducer, [] as CartItem[]),
    [drawerOpen, setDrawerOpen] = useState(false);
  const priorScope = useRef<string | null | symbol>(Symbol('initial'));
  const channel = useRef<ReturnType<typeof createChannel> | null>(null);
  const ready = useRef(false);
  useEffect(() => {
    if (auth.loading) return;
    ready.current = false;
    dispatch({ type: 'REPLACE', items: readScoped(STORAGE_KEYS.cart, scope, []) });
    priorScope.current = scope;
    ready.current = true;
  }, [scope, auth.loading]);
  useEffect(() => {
    if (!ready.current || !catalog.products?.length) return;
    dispatch({
      type: 'RECONCILE_CATALOG',
      byId: new Map((catalog.products as Array<Record<string, unknown>>).map((product) => [String(product.id), product])),
    });
  }, [catalog.products]);
  useEffect(() => {
    channel.current?.close();
    channel.current = createChannel('shababuna-cart-channel', (msg) => {
      if (msg.type === 'cart' && msg.scope === (scope || 'guest'))
        dispatch({ type: 'REPLACE', items: Array.isArray(msg.payload) ? (msg.payload as CartItem[]) : [] });
    });
    return () => channel.current?.close();
  }, [scope]);
  useEffect(() => {
    if (!ready.current) return;
    writeScoped(STORAGE_KEYS.cart, scope, items);
    channel.current?.post('cart', items, { scope: scope || 'guest', version: Date.now() });
  }, [items, scope]);
  const addItem = useCallback((item: CartItem, { openDrawer = true }: { openDrawer?: boolean } = {}) => {
      dispatch({ type: 'ADD', item });
      trackEvent('add_to_cart', { item_id: item.id, item_type: item.type, value: item.price });
      if (openDrawer) setDrawerOpen(true);
    }, []),
    updateQuantity = useCallback(
      (key: string, quantity: number) => dispatch({ type: 'UPDATE_QTY', key, quantity }),
      [],
    ),
    removeItem = useCallback((key: string) => dispatch({ type: 'REMOVE', key }), []),
    clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []),
    replaceItems = useCallback((next: CartItem[]) => dispatch({ type: 'REPLACE', items: next }), []);
  const subtotal = useMemo(
      () => items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0),
      [items],
    ),
    count = useMemo(() => items.reduce((s, i) => s + Number(i.quantity || 0), 0), [items]),
    hasPhysical = useMemo(() => cartRequiresPhysicalShipping(items as FulfillmentItem[]), [items]),
    digitalOnly = useMemo(
      () => items.length > 0 && !cartRequiresPhysicalShipping(items as FulfillmentItem[]),
      [items],
    );
  return (
    <CartContext.Provider
      value={useMemo<CartContextValue>(
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
export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [],
      addItem: () => undefined,
      updateQuantity: () => undefined,
      removeItem: () => undefined,
      clearCart: () => undefined,
      replaceItems: () => undefined,
      subtotal: 0,
      count: 0,
      hasPhysical: false,
      digitalOnly: false,
      drawerOpen: false,
      openDrawer: () => undefined,
      closeDrawer: () => undefined,
    };
  }
  return ctx;
};
export const cartKey = (type: string, id: string, variant = ''): string => `${type}:${id}:${variant}`;
