/**
 * Narrow ambient surface for react-router-dom used by our TSX components.
 * Avoids pulling broken RR type packages under skipLibCheck:false.
 * Full migration should replace this with compatible package types later.
 */
declare module 'react-router-dom' {
  import type { ComponentType, ReactNode, MouseEventHandler } from 'react';

  export type To = string | { pathname?: string; search?: string; hash?: string };

  export const Link: ComponentType<{
    to: To;
    className?: string;
    children?: ReactNode;
    onClick?: MouseEventHandler;
    replace?: boolean;
    state?: unknown;
    'aria-label'?: string;
  }>;

  export const NavLink: ComponentType<{
    to: To;
    className?: string | ((args: { isActive: boolean }) => string);
    children?: ReactNode;
    end?: boolean;
    onClick?: (event?: unknown) => void;
  }>;

  export const Navigate: ComponentType<{ to: To; replace?: boolean; state?: unknown }>;

  export const BrowserRouter: ComponentType<{
    children?: ReactNode;
    basename?: string;
    future?: { v7_startTransition?: boolean; v7_relativeSplatPath?: boolean };
  }>;
  export const MemoryRouter: ComponentType<{ children?: ReactNode; initialEntries?: string[] }>;
  export const Routes: ComponentType<{ children?: ReactNode }>;
  export const Route: ComponentType<{
    path?: string;
    element?: ReactNode;
    index?: boolean;
    children?: ReactNode;
  }>;
  export const Outlet: ComponentType;

  export function useNavigate(): (to: To | number, options?: { replace?: boolean; state?: unknown }) => void;
  export function useLocation(): {
    pathname: string;
    search: string;
    hash: string;
    state: unknown;
    key: string;
  };
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
  export function useSearchParams(): [
    URLSearchParams,
    (next: URLSearchParams | Record<string, string>) => void,
  ];
  export function useMatch(pattern: string): { params: Record<string, string> } | null;
  export function generatePath(path: string, params?: Record<string, string | undefined>): string;
}
