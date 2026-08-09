import type { ReactElement } from 'react';

declare function SmartImage(props: {
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  className?: string;
  sizes?: string;
  [key: string]: unknown;
}): ReactElement;
export default SmartImage;
