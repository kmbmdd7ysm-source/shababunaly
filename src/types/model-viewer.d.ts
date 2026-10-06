import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'camera-controls'?: boolean;
          'touch-action'?: string;
          'shadow-intensity'?: string | number;
          exposure?: string | number;
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
