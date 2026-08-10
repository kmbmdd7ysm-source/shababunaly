/**
 * Minimal ambient declarations only.
 * Official packages use npm-installed types (@types/react, @types/node,
 * @supabase/supabase-js, vitest, playwright, etc.). Do not redeclare those modules.
 */

declare module '*.css';
declare module '*.png' {
  const value: string;
  export default value;
}
declare module '*.jpg' {
  const value: string;
  export default value;
}
declare module '*.jpeg' {
  const value: string;
  export default value;
}
declare module '*.webp' {
  const value: string;
  export default value;
}
declare module '*.svg' {
  const value: string;
  export default value;
}
declare module '*.glb' {
  const value: string;
  export default value;
}
declare module '*.gltf' {
  const value: string;
  export default value;
}

interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FORM_ENDPOINT?: string;
  readonly VITE_SHOW_BUILD_MARKER?: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  clarity?: (...args: unknown[]) => void;
  ApplePaySession?: unknown;
  __shababunaErrorMonitoringInstalled?: boolean;
  __e2ePaymentConfigured?: boolean;
}

interface Navigator {
  connection?: { saveData?: boolean; effectiveType?: string };
  standalone?: boolean;
}

/** Deno edge runtime (Supabase functions). */
declare const Deno: {
  env: { get(key: string): string | undefined };
};

declare module 'https://esm.sh/@supabase/supabase-js@2' {
  export { createClient } from '@supabase/supabase-js';
}
