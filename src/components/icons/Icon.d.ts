import type { ReactElement, SVGProps } from 'react';

declare function Icon(
  props: SVGProps<SVGSVGElement> & {
    name?: string;
    title?: string;
    size?: number | string;
  },
): ReactElement;
export default Icon;
