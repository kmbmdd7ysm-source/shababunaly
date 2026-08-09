import type { ReactElement } from 'react';

declare function MediaLightbox(props: {
  open?: boolean;
  onClose?: () => void;
  images?: string[];
  index?: number;
  onIndexChange?: (index: number) => void;
  alt?: string;
  [key: string]: unknown;
}): ReactElement | null;

export default MediaLightbox;
