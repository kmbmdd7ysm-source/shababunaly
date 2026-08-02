import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteExperience({ children }) {
  const location = useLocation();
  const shellRef = useRef(null);
  const firstRoute = useRef(true);

  useEffect(() => {
    const live = document.getElementById('route-announcer');
    if (live) live.textContent = document.title;

    // Do not force a layout read or hide the LCP content on the initial page.
    // Route transitions keep the premium motion after the first navigation.
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }

    const shell = shellRef.current;
    if (shell) {
      shell.classList.remove('route-enter');
      requestAnimationFrame(() => shell.classList.add('route-enter'));
    }

    const heading = document.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    <>
      <div id="route-announcer" className="sr-only" aria-live="polite" />
      <div ref={shellRef} key={location.pathname} className="route-shell">
        {children}
      </div>
    </>
  );
}
