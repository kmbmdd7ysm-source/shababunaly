/**
 * Canonical domain types for Shababuna commerce.
 * Prefer these over ad-hoc inline shapes in business modules.
 */

export type Currency = 'USD' | 'LYD';

export interface MoneyAmount {
  readonly amount: number;
  readonly currency: Currency;
}

export type AvailabilityState =
  | 'READY_TO_SHIP'
  | 'MADE_TO_ORDER'
  | 'SUPPLIER_ORDER'
  | 'QUOTE_ONLY'
  | 'COMING_SOON'
  | 'OUT_OF_STOCK';

export type InventoryState = 'tracked' | 'untracked' | 'unknown';
export type ReadyToShipState = 'ready' | 'not_ready' | 'unknown';

export type UserRole =
  | 'anonymous'
  | 'customer'
  | 'team_member'
  | 'organization_manager'
  | 'staff'
  | 'operations'
  | 'admin';

export type ProductionStage =
  | 'draft'
  | 'quoted'
  | 'deposit'
  | 'proof'
  | 'approved'
  | 'production'
  | 'shipment'
  | 'final_payment'
  | 'complete'
  | 'cancelled';

export type FactoryApprovalState =
  | 'CONCEPT'
  | 'CUSTOMER_APPROVED'
  | 'FACTORY_REVIEW'
  | 'FACTORY_CHANGES_REQUIRED'
  | 'FACTORY_APPROVED'
  | 'PRODUCTION_READY';

export type PaymentVerificationState = 'MOCK_VERIFIED' | 'SANDBOX_VERIFIED' | 'LIVE_VERIFIED' | 'UNCONFIGURED';

export type UnknownCommercialField = null | 'unknown' | 'pending_verification';

export interface ProductMasterFields {
  supplierSKU: string | UnknownCommercialField;
  cost: number | UnknownCommercialField;
  barcode: string | UnknownCommercialField;
  warehouse: string | UnknownCommercialField;
  leadTime: string | UnknownCommercialField;
  weight: number | UnknownCommercialField;
  dimensions: { length: number; width: number; height: number; unit: string } | UnknownCommercialField;
  HSCode: string | UnknownCommercialField;
  countryOfOrigin: string | UnknownCommercialField;
  variantOrigin: string | UnknownCommercialField;
  inventoryLocation: string | UnknownCommercialField;
}

export interface VariantInventory {
  quantity: number | null;
  inventoryVerified: boolean;
  inventoryTracking: boolean;
  inventoryLocation: string | UnknownCommercialField;
  warehouse: string | UnknownCommercialField;
  readyToShip: boolean;
  lastVerifiedAt: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size?: string;
  color?: string;
  inventory: VariantInventory;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  nameAr?: string;
  category: string;
  subcategory?: string;
  price: number;
  currency?: Currency;
  image: string;
  variants?: ProductVariant[];
  sizes?: string[];
  colors?: string[];
  customizable?: boolean;
  quoteOnly?: boolean;
  readyToShip?: boolean;
  availability: AvailabilityState;
  master?: Partial<ProductMasterFields>;
}

export interface CartItem {
  productId: string;
  sku?: string;
  quantity: number;
  size?: string;
  color?: string;
  unitPriceUsd: number;
  isDigital?: boolean;
  custom?: boolean;
}

export interface ShippingQuote {
  status: string;
  countryCode?: string;
  amount: number | null;
  currency: Currency | null;
  canonicalAmount: number | null;
  freeShippingEligible?: boolean;
  pendingShippingQuote?: boolean;
  discountReason?: string;
  reason?: string;
  originalRate?: MoneyAmount;
}

export interface Order {
  id: string;
  status: string;
  currency: Currency;
  items: CartItem[];
  shipping: ShippingQuote;
  paymentMethod?: string;
  customerId?: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: Currency;
  provider: string;
  verification: PaymentVerificationState;
  status: string;
}

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  currency: Currency;
  status: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  reason: string;
  status: string;
}

export interface RosterMember {
  id: string;
  name: string;
  number?: string;
  size?: string;
}

export interface DesignDocument {
  id: string;
  productType: string;
  primary: string;
  secondary: string;
  accent?: string;
  layers: unknown[];
  factoryState: FactoryApprovalState;
}

export interface Quote {
  id: string;
  status: string;
  currency: Currency;
  total?: number;
}

export interface Proof {
  id: string;
  quoteId?: string;
  status: string;
  revision?: number;
}

export interface TeamProject {
  id: string;
  name: string;
  stage: ProductionStage;
  organizationId?: string;
}
