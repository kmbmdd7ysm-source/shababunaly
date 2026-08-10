import type { ReactElement } from 'react';
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

export default function BuildMarker(): ReactElement | null {
  const [open, setOpen] = useState(false);
  const [dist, setDist] = useState('loading…');
  const [builtAt, setBuiltAt] = useState(BUILD.at);

  useEffect(() => {
    const runtime = globalThis as unknown as Record<string, unknown>;
    document.documentElement.dataset.buildSha = BUILD.sha;
    runtime.__SHABABUNA_BUILD__ = BUILD;
    if (!import.meta.env.VITE_SHOW_BUILD_MARKER) return;
    // cache: 'no-store' so this can never be answered from a stale HTTP cache.
    fetch('/build-info.json', { cache: 'no-store' })
      .then((response) => response.json())
      .then((info) => {
        const value = String(info.distHash || 'unknown');
        setDist(value);
        BUILD.dist = value;
        /*
         * Take the timestamp from build-info.json too. VITE_BUILD_TIME is
         * stamped when the vite config loads, provenance is written after the
         * bundle is hashed, and the two differed by a couple of seconds — two
         * "build timestamps" on one page is exactly the kind of small
         * inconsistency that makes a reviewer distrust the whole badge.
         * build-info.json is the single authority.
         */
        if (info.builtAt) {
          BUILD.at = String(info.builtAt);
          setBuiltAt(String(info.builtAt));
        }
        runtime.__SHABABUNA_BUILD__ = { ...BUILD, dist: value };
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
            <dd>{builtAt}</dd>
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
