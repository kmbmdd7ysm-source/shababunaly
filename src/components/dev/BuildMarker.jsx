import { useEffect, useState } from 'react';
import '../../styles/buildmarker.css';

/*
 * Build marker — proves which commit a preview is actually serving.
 *
 * A reviewer must never have to trust a claim about which build they are
 * looking at. This reads the values Vite injected at build time and prints
 * them into the page and onto `<html data-build-sha>`, so the commit can be
 * confirmed by eye, by DevTools, or by a scripted check.
 *
 * It renders ONLY when `VITE_SHOW_BUILD_MARKER` is set, which the review build
 * sets and a production build does not. It also exposes `window.__SHABABUNA_BUILD__`
 * for automated verification.
 */
const BUILD = {
  branch: String(import.meta.env.VITE_BUILD_BRANCH || 'unknown'),
  sha: String(import.meta.env.VITE_BUILD_SHA || 'unknown'),
  at: String(import.meta.env.VITE_BUILD_TIME || 'unknown'),
  /*
   * The dist hash cannot be injected at bundle time — it is a hash OF the
   * bundle, so writing it into the bundle would change it. postbuild writes it
   * to /build-info.json instead and the badge fetches it.
   */
  dist: 'loading…',
};

export default function BuildMarker() {
  const [open, setOpen] = useState(true);
  const [dist, setDist] = useState('loading…');

  useEffect(() => {
    document.documentElement.dataset.buildSha = BUILD.sha;
    globalThis.__SHABABUNA_BUILD__ = BUILD;
    if (!import.meta.env.VITE_SHOW_BUILD_MARKER) return;
    // cache: 'no-store' so this can never be answered from a stale HTTP cache.
    fetch('/build-info.json', { cache: 'no-store' })
      .then((response) => response.json())
      .then((info) => {
        const value = String(info.distHash || 'unknown');
        setDist(value);
        BUILD.dist = value;
        globalThis.__SHABABUNA_BUILD__ = { ...BUILD, dist: value };
        document.documentElement.dataset.buildDist = value;
      })
      .catch(() => setDist('unavailable'));
  }, []);

  if (!import.meta.env.VITE_SHOW_BUILD_MARKER) return null;

  return (
    <div className="gw-buildmark" data-open={open ? 'yes' : 'no'}>
      <button
        type="button"
        className="gw-buildmark-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="gw-buildmark-dot" aria-hidden="true" />
        REVIEW BUILD · {BUILD.sha.slice(0, 12)}
      </button>
      {open && (
        <dl className="gw-buildmark-panel">
          <div>
            <dt>Branch</dt>
            <dd>{BUILD.branch}</dd>
          </div>
          <div>
            <dt>Commit</dt>
            <dd>{BUILD.sha}</dd>
          </div>
          <div>
            <dt>Built</dt>
            <dd>{BUILD.at}</dd>
          </div>
          <div>
            <dt>Dist</dt>
            <dd>{dist}</dd>
          </div>
          <div>
            <dt>Note</dt>
            <dd>Review build — no service worker, not production</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
