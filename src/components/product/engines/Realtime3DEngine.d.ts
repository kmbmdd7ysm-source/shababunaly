declare const Realtime3DEngine: import('react').ComponentType<{
  model?: string | null;
  fallbackSrc?: string;
  alt?: string;
  eager?: boolean;
  pick: (value: { en?: string; ar?: string } | string) => string;
}>;
export default Realtime3DEngine;
