import type { ReactElement, SVGProps } from 'react';

declare function Icon(
  props: SVGProps<SVGSVGElement> & { name?: string; title?: string },
): ReactElement;
export default Icon;
