/* Minimal build-environment shims. Project JavaScript/JSX remains checked by
 * TypeScript because tsconfig enables allowJs + checkJs. Official dependency
 * types are used by normal npm installs; these declarations keep offline CI
 * parsing deterministic without hiding project-level missing identifiers. */
declare module 'react' {
  export class Component<P = any, S = any> { props: P; state: S; constructor(props: P); setState(state: Partial<S> | ((state: S, props: P) => Partial<S>)): void; }
  export const lazy: any; export const Suspense: any; export const StrictMode: any;
  export const createContext: any; export const useCallback: any; export const useContext: any;
  export const useEffect: any; export const useId: any; export const useMemo: any;
  export const useReducer: any; export const useRef: any; export const useState: any;
  const React: any; export default React;
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module 'react-dom' { export const createPortal: any; }
declare module 'react-dom/client' { export const createRoot: any; }
declare module 'react-router-dom' {
  export const BrowserRouter: any; export const MemoryRouter: any; export const Link: any; export const Navigate: any; export const NavLink: any;
  export const Outlet: any; export const Route: any; export const Routes: any; export const useLocation: any;
  export const useNavigate: any; export const useParams: any; export const useSearchParams: any;
}
declare module 'react-helmet-async' { export const Helmet: any; export const HelmetProvider: any; }
declare module '@supabase/supabase-js' { export const createClient: any; }
declare module '@playwright/test' { export const test: any; export const expect: any; export const devices: any; export const defineConfig: any; }
declare module '@axe-core/playwright' { export default class AxeBuilder { constructor(...args: any[]); analyze(): Promise<any>; withTags(...args: any[]): this; include(...args: any[]): this; } }
declare module 'node:*' {
  const value: any; export default value;
  export const afterEach: any; export const beforeEach: any; export const describe: any; export const test: any;
  export const strict: any; export const createHash: any; export const createHmac: any; export const timingSafeEqual: any; export const randomUUID: any;
  export const readdir: any; export const readFile: any; export const writeFile: any; export const copyFile: any; export const mkdir: any; export const rm: any; export const stat: any; export const cp: any; export const mkdirSync: any; export const writeFileSync: any;
  export const spawn: any; export const spawnSync: any; export const execFileSync: any; export const createServer: any; export const existsSync: any; export const readFileSync: any; export const readdirSync: any; export const statSync: any;
  export const join: any; export const dirname: any; export const extname: any; export const relative: any; export const sep: any; export const resolve: any; export const normalize: any; export const fileURLToPath: any; export const pathToFileURL: any;
  export const brotliCompressSync: any; export const gzipSync: any; export const deflateRawSync: any; export const inflateRawSync: any;
}
declare module '*.css';
declare module '*.png' { const value: string; export default value; }
declare module '*.jpg' { const value: string; export default value; }
declare module '*.jpeg' { const value: string; export default value; }
declare module '*.webp' { const value: string; export default value; }
declare module '*.svg' { const value: string; export default value; }
declare namespace JSX { interface IntrinsicAttributes { key?: string | number; } interface IntrinsicElements { [elementName: string]: any; } }
interface ImportMeta { readonly env: Record<string, string | boolean | undefined>; }
interface Window { dataLayer?: any[]; gtag?: (...args:any[])=>void; clarity?: (...args:any[])=>void; ApplePaySession?: any; }
interface Navigator { connection?: { saveData?: boolean; effectiveType?: string }; standalone?: boolean; }
interface Error { code?: string; status?: number; fieldRef?: string; }
declare const process: any; declare const Buffer: any; declare const Deno: any; declare const __dirname: string; declare const global: any;
declare module 'https://esm.sh/@supabase/supabase-js@2' { export const createClient: any; }
declare module 'vite' { export const build: any; export const defineConfig: any; }
declare module 'picomatch' { const value: any; export default value; }
declare module 'lighthouse' { const value: any; export default value; }
declare module 'chrome-launcher' { export const launch: any; }
declare module 'playwright' { export const chromium: any; }
declare module '@vitejs/plugin-react' { const value: any; export default value; }
interface Window {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}
interface Window { __shababunaErrorMonitoringInstalled?: boolean; __e2ePaymentConfigured?: boolean; }

declare module 'vitest' {
  export const afterEach: any; export const beforeEach: any; export const describe: any;
  export const expect: any; export const test: any; export const vi: any;
}
declare module '@testing-library/react' {
  export const cleanup: any; export const fireEvent: any; export const render: any; export const screen: any;
}
declare module '@testing-library/user-event' { const value: any; export default value; }
declare module '@testing-library/jest-dom/vitest';
