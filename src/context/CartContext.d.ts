export function useCart(): {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  count: number;
  items: unknown[];
  addItem: (...args: unknown[]) => void;
  removeItem: (...args: unknown[]) => void;
  updateQty: (...args: unknown[]) => void;
};
