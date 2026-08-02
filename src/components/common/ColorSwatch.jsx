const SAFE_HEX = /^#[0-9a-f]{6}$/i;

export default function ColorSwatch({ color, className = 'swatch-dot' }) {
  const fill = SAFE_HEX.test(String(color || '')) ? color : '#777777';
  return (
    <svg className={className} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="9" fill={fill} />
    </svg>
  );
}
