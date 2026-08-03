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
};

export default function BuildMarker() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.buildSha = BUILD.sha;
    globalThis.__SHABABUNA_BUILD__ = BUILD;
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
        {BUILD.sha.slice(0, 7)}
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
            <dt>Note</dt>
            <dd>Review build — not production</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
