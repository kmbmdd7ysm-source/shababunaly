export function validateAddress(input: Record<string, unknown>): {
  value: Record<string, unknown>;
  errors: Record<string, string>;
  valid: boolean;
};
export function listAddresses(userId: string, options?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
export function saveAddress(userId: string, input: Record<string, unknown>, id?: string): Promise<Record<string, unknown>>;
export function deleteAddress(userId: string, id: string): Promise<void>;
export function setDefaultAddress(userId: string, id: string): Promise<Array<Record<string, unknown>>>;
