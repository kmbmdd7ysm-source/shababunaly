import type { ReactElement } from 'react';
const paths = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />
      <path d="M9 8.5V6a3 3 0 0 1 6 0v2.5" />
    </>
  ),
  heart: (
    <path d="M20.5 5.2a5 5 0 0 0-7.1 0L12 6.6l-1.4-1.4a5 5 0 0 0-7.1 7.1L12 20l8.5-7.7a5 5 0 0 0 0-7.1Z" />
  ),
  compare: (
    <>
      <path d="M4 7h15" />
      <path d="m16 4 3 3-3 3" />
      <path d="M20 17H5" />
      <path d="m8 14-3 3 3 3" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.2a2.8 2.8 0 1 1 4.1 2.5c-1 .6-1.5 1.1-1.5 2.2" />
      <path d="M12 17.2h.01" />
    </>
  ),
  orders: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="m14.5 5-7 7 7 7" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  filter: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
      <circle cx="8" cy="7" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="12" cy="17" r="1.5" />
    </>
  ),
  sort: (
    <>
      <path d="M8 5v14M5 8l3-3 3 3" />
      <path d="M16 19V5m-3 11 3 3 3-3" />
    </>
  ),
  arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
  play: <path d="m9 6 9 6-9 6V6Z" />,
  pause: <path d="M9 6v12M15 6v12" />,
  previous: <path d="m15 5-7 7 7 7" />,
  next: <path d="m9 5 7 7-7 7" />,
  copy: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v6" />
      <path d="M12 17h.01" />
    </>
  ),
  ruler: (
    <>
      <path d="M4 8v10h16V8" />
      <path d="M7 8v4M10 8v2M13 8v4M16 8v2" />
    </>
  ),
  /* ── Navigation set ────────────────────────────────────────────────────
     Added because the rail and the mobile command bar were asking for icons
     that did not exist — `Icon name="home"` was silently rendering an empty
     <svg>, and the rail fell back to a bare index number instead.

     One system, one grammar: a 24px box, 1.9 stroke, round caps and joins,
     built from the same court vocabulary the rest of the site uses — arcs,
     baselines, keys and panels — so navigation reads as one family rather than
     a borrowed icon pack. Nothing pictorial enough to be mistaken for a mark. */

  /* A backboard over a baseline. */
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.6V20h12V9.6" />
      <path d="M10 20v-4.2h4V20" />
    </>
  ),
  /* The key and the arc above it — the shop floor. */
  shop: (
    <>
      <path d="M8.5 4h7v9h-7z" />
      <path d="M6 20a6 6 0 0 1 12 0" />
      <path d="M4 20h16" />
    </>
  ),
  /* A panel being drawn on: the studio. */
  customize: (
    <>
      <path d="M4 5.5h11v13H4z" />
      <path d="M4 9.5h11" />
      <path d="m17 5 3 3-6.5 6.5L10 15l.5-3.5Z" />
    </>
  ),
  /* Three figures on a bench line: the roster. */
  teams: (
    <>
      <circle cx="7" cy="8" r="2.4" />
      <circle cx="17" cy="8" r="2.4" />
      <circle cx="12" cy="6.5" r="2.4" />
      <path d="M3.5 18a3.5 3.5 0 0 1 7 0" />
      <path d="M13.5 18a3.5 3.5 0 0 1 7 0" />
      <path d="M3 21h18" />
    </>
  ),
  /* A shopfront awning over an opening: the partner store. */
  store: (
    <>
      <path d="M4 9.5h16l-1.2-4.2a1 1 0 0 0-1-.8H6.2a1 1 0 0 0-1 .8L4 9.5Z" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  /* Stacked plates: completed work. */
  work: (
    <>
      <path d="M3.5 8.5 12 4l8.5 4.5L12 13 3.5 8.5Z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </>
  ),
  /* The centre circle and its line: the organisation. */
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M6 8.5a8.5 8.5 0 0 0 12 0" />
    </>
  ),
  /* Phase 2 commerce/navigation additions — same 24px stroke grammar. */
  spark: (
    <>
      <path d="M12 3.5 13.7 8l4.8 1.7-4.8 1.7L12 16l-1.7-4.6-4.8-1.7L10.3 8 12 3.5Z" />
      <path d="m18.5 15 .9 2.4 2.4.9-2.4.9-.9 2.3-.9-2.3-2.4-.9 2.4-.9.9-2.4Z" />
    </>
  ),
  shoe: (
    <>
      <path d="M4 15.5c3.4.2 5.4-.6 6.8-2.7l1.6-2.5 2.2 2.1c1.4 1.4 2.8 2.1 5.4 2.6v2.3H4v-1.8Z" />
      <path d="M11.2 12.1 9.7 9.6M13.1 11.5l-1.4-2.4" />
    </>
  ),
  shirt: (
    <>
      <path d="M8 5.2 10 4h4l2 1.2 4 2.2-2.5 4-2-1V20h-7V10.4l-2 1-2.5-4 4-2.2Z" />
      <path d="M10 4c.3 1.5 1 2.2 2 2.2S13.7 5.5 14 4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m14.7 9.3-1.8 3.6-3.6 1.8 1.8-3.6 3.6-1.8Z" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="1.5" />
      <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
      <path d="M8 13h3M13.5 13H16M8 16h3" />
    </>
  ),

  /* Fallback so a missing key is visibly wrong in review rather than invisible. */
  grid: (
    <>
      <path d="M4 4.5h6.5V11H4zM13.5 4.5H20V11h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z" />
    </>
  ),
};

export default function Icon({
  name,
  size = 24,
  strokeWidth = 1.9,
  className = '',
}: {
  name?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}): ReactElement | null {
  if (!name || !(name in paths)) return null;
  const icon = paths[name as keyof typeof paths];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon}
    </svg>
  );
}
