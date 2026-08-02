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
};

export default function Icon({ name, size = 24, strokeWidth = 1.9, className = '' }) {
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
      {paths[name] || null}
    </svg>
  );
}
