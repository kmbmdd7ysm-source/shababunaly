import { SITE } from '../config';
const iconPaths = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path
      d="M13.7 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5H17V3.6c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2v2.3H8v3.1h2.5v8h3.2Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  tiktok: (
    <path
      d="M14.3 3.5c.4 2.2 1.7 3.6 3.9 4v3.2c-1.5 0-2.8-.5-3.9-1.3v5.8a5.7 5.7 0 1 1-4.9-5.7v3.3a2.5 2.5 0 1 0 1.7 2.4V3.5h3.2Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  email: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

export const footerContacts = [
  {
    id: 'instagram',
    href: SITE.social.instagram,
    labelKey: 'instagram',
    external: true,
    icon: iconPaths.instagram,
  },
  {
    id: 'facebook',
    href: SITE.social.facebook,
    labelKey: 'facebook',
    external: true,
    icon: iconPaths.facebook,
  },
  {
    id: 'tiktok',
    href: SITE.social.tiktok,
    labelKey: 'tiktok',
    external: true,
    icon: iconPaths.tiktok,
  },
  {
    id: 'email',
    href: SITE.emailLink,
    labelKey: 'email',
    external: false,
    icon: iconPaths.email,
  },
];
