import type { ReactElement, RefObject } from 'react';
declare function SearchOverlay(props: {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}): ReactElement | null;
export default SearchOverlay;
