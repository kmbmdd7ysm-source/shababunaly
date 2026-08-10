/** Shared Operations action runner — concrete signature, not unknown[] rest. */
export type OperationsRunFn = (
  key: string,
  action: () => Promise<unknown>,
  success: string,
) => Promise<void>;
