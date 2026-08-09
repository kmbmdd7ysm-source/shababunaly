import type { SVGProps } from 'react';

declare function Icon(
  props: SVGProps<SVGSVGElement> & { name?: string; title?: string },
): JSX.Element;
export default Icon;
