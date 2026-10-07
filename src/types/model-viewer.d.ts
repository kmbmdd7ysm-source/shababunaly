import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string | undefined;
  alt?: string | undefined;
  className?: string | undefined;
  'camera-controls'?: boolean | undefined;
  'touch-action'?: string | undefined;
  'shadow-intensity'?: string | number | undefined;
  exposure?: string | number | undefined;
  [key: string]: unknown;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes;
    }
  }
}

export {};
