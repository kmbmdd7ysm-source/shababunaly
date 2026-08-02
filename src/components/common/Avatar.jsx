import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/u).filter(Boolean);
  if (!parts.length) return '•';
  const first = Array.from(parts[0])[0] || '';
  const last = parts.length > 1 ? Array.from(parts.at(-1))[0] || '' : '';
  return `${first}${last}`.toLocaleUpperCase();
}

const AVATAR_DIMENSIONS = { small: 32, medium: 48, large: 72 };

export default function Avatar({ name, src, size = 'medium', className = '' }) {
  const { pick } = useLanguage();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = useMemo(() => getInitials(name), [name]);
  const dimension = AVATAR_DIMENSIONS[size] || AVATAR_DIMENSIONS.medium;
  const label = pick({
    en: `${name || 'User'} profile photo`,
    ar: `الصورة الشخصية لـ ${name || 'المستخدم'}`,
  });
  return (
    <span className={`avatar avatar-${size} ${className}`.trim()} role="img" aria-label={label}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={dimension}
          height={dimension}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
