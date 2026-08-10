import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { fetchSiteContent } from '../../services/siteContent';
import { SITE } from '../../config';
import '../../styles/domain-media.css';

const ENV_DESKTOP_VIDEO = String(import.meta.env.VITE_HERO_VIDEO_URL || '').trim();
const ENV_MOBILE_VIDEO = String(import.meta.env.VITE_HERO_MOBILE_VIDEO_URL || '').trim();

/** Only an https source is ever accepted; `media-src` allows https and nothing else useful. */
const safeUrl = (value: unknown) =>
  /^https:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';

/**
 * The opening sequence.
 *
 * GROUNDWORK: before anyone plays, someone draws the ground. The poster is the
 * ground; the court plan is drawn over it in hairlines; the film, when one
 * exists, dissolves in behind the drawing. The commercial message, the three
 * calls to action and the location all live in the DOM — never inside the
 * canvas, the video or an animation — so the hero is complete and purchasable
 * with media, motion and scripting all switched off.
 *
 * Media architecture (all of it fallback-first):
 *   poster            always painted, preloaded, explicit dimensions, no CLS
 *   desktop source    >= 900px, only after real user intent
 *   mobile source     < 900px, separate encode, only after real user intent
 *   reduced motion    poster only, never requests the film
 *   saveData          poster only, never requests the film
 *   Tier C device     poster only, court drawing withheld
 *   video error       falls back to the poster and never retries
 *   sound             muted always; there is no autoplay audio path at all
 */
export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const video = useRef<HTMLVideoElement | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [mediaConfig, setMediaConfig] = useState<Record<string, unknown>>({
    enabled: true,
    desktopVideoUrl: ENV_DESKTOP_VIDEO,
    mobileVideoUrl: ENV_MOBILE_VIDEO,
  });
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();

  useEffect(() => {
    // Fixed LCP overlay stays above React until after the LCP window, then fades out.
    const shell = document.getElementById('lcp-shell');
    if (!shell) return undefined;
    const fade = globalThis.setTimeout(() => {
      shell.style.transition = 'opacity 280ms ease';
      shell.style.opacity = '0';
    }, 2200);
    const remove = globalThis.setTimeout(() => {
      shell.remove();
    }, 2600);
    return () => {
      globalThis.clearTimeout(fade);
      globalThis.clearTimeout(remove);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchSiteContent('home_hero')
        .then((content) => {
          if (!active || !content) return;
          setMediaConfig({
            enabled: content.enabled !== false,
            desktopVideoUrl: safeUrl(content.desktopVideoUrl) || ENV_DESKTOP_VIDEO,
            mobileVideoUrl: safeUrl(content.mobileVideoUrl) || ENV_MOBILE_VIDEO,
          });
        })
        .catch(() => {});
    const idle = globalThis.requestIdleCallback?.(() => {
      void load();
    }, { timeout: 2200 });
    const timer =
      idle == null
        ? setTimeout(() => {
            void load();
          }, 900)
        : null;
    return () => {
      if (active) active = false;
      if (idle != null) globalThis.cancelIdleCallback?.(idle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const desktop = globalThis.matchMedia?.('(min-width: 900px)')?.matches ?? true;
  const selectedVideo = mediaConfig.enabled
    ? desktop
      ? mediaConfig.desktopVideoUrl
      : mediaConfig.mobileVideoUrl
    : '';

  // The film is never requested until the visitor has actually engaged, and
  // never at all when the device or the visitor has told us not to.
  const mediaAllowed = capability === 'a' && !reduced && !navigator.connection?.saveData;

  useEffect(() => {
    if (!selectedVideo || !mediaAllowed) return undefined;
    const enable = () => setVideoEnabled(true);
    addEventListener('pointerdown', enable, { once: true, passive: true });
    addEventListener('keydown', enable, { once: true });
    addEventListener('scroll', enable, { once: true, passive: true });
    return () => {
      removeEventListener('pointerdown', enable);
      removeEventListener('keydown', enable);
      removeEventListener('scroll', enable);
    };
  }, [mediaAllowed, selectedVideo]);

  useEffect(() => {
    if (videoEnabled && !failed) video.current?.play().catch(() => {});
  }, [videoEnabled, failed]);

  const showFilm = Boolean(selectedVideo) && videoEnabled && !failed;

  return (
    <section className="gw-hero" aria-labelledby="gw-home-hero-title">
      <div className="gw-hero-media" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/media/hero/shababuna-hero-poster-mobile.webp"
          />
          <img
            className="gw-hero-poster"
            src="/media/hero/shababuna-hero-poster.webp"
            alt=""
            width="1940"
            height="1024"
            fetchPriority="high"
            decoding="sync"
          />
        </picture>
        {showFilm && (
          <video
            ref={video}
            className="gw-hero-film"
            muted
            loop
            playsInline
            autoPlay
            preload="none"
            width="1940"
            height="1024"
            poster="/media/hero/shababuna-hero-poster.webp"
            onError={() => setFailed(true)}
          >
            <source src={String(selectedVideo || '')} type="video/mp4" />
          </video>
        )}
        <span className="gw-hero-wash" />
      </div>

      <CourtPlan />

      <div className="gw-container gw-hero-inner">
        <div className="gw-stack gw-stack--loose gw-hero-copy">
          <p className="gw-kicker gw-hero-kicker">
            {pick({ en: 'Shababuna · Basketball supply', ar: 'شبابنا · تجهيز كرة السلة' })}
          </p>
          <h1
            id="gw-home-hero-title"
            className="gw-hero-title"
            aria-label={pick({ en: 'Built Different.', ar: 'نبني مختلفين.' })}
          >
            <span className="gw-hero-line" aria-hidden="true">
              {pick({ en: 'BUILT', ar: 'نبني' })}
            </span>
            <span className="gw-hero-line gw-hero-line--outline" aria-hidden="true">
              {pick({ en: 'DIFFERENT.', ar: 'مختلفين.' })}
            </span>
          </h1>
          <p className="gw-lead gw-hero-lead">
            {pick({
              en: 'Basketball retail, custom manufacturing, club supply and wholesale — built in one global platform.',
              ar: 'متجر كرة سلة وتصنيع مخصص وتجهيز أندية وجملة — ضمن منصة عالمية واحدة.',
            })}
          </p>
          <div className="gw-cluster gw-hero-actions">
            <Link className="gw-btn gw-btn--primary" to="/shop">
              {pick({ en: 'Shop', ar: 'تسوّق' })}
            </Link>
            <Link className="gw-btn gw-btn--secondary" to="/customize">
              {pick({ en: 'Customize', ar: 'صمّم' })}
            </Link>
            <Link className="gw-btn gw-btn--secondary" to="/teams-wholesale">
              {pick({ en: 'Teams & Wholesale', ar: 'الأندية والجملة' })}
            </Link>
          </div>
          <p className="gw-leader gw-leader--start gw-kicker gw-hero-place">
            <span>{pick(SITE.address)}</span>
          </p>
        </div>
      </div>

      <a className="gw-hero-scroll" href="#game">
        <span className="sr-only">
          {pick({ en: 'Scroll to shop', ar: 'انتقل إلى المتجر' })}
        </span>
        <span className="gw-hero-scroll-tick" aria-hidden="true" />
      </a>
    </section>
  );
}

/**
 * The drawn ground: a half court at FIBA dimensions in centimetres.
 * Pure inline SVG — no image request, no layout cost, crisp at any DPR, and
 * withheld entirely on Tier C devices by `geometry.css`.
 */
export function CourtPlan() {
  return (
    <div className="gw-court gw-hero-court" aria-hidden="true">
      <svg
        className="gw-court-svg"
        viewBox="0 0 1500 1400"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      >
        <rect x="1.5" y="1.5" width="1497" height="1397" />
        <rect x="505" y="0" width="490" height="580" />
        <circle cx="750" cy="580" r="180" />
        <circle cx="750" cy="157.5" r="22" />
        <path d="M 630 90 H 870" />
        <path d="M 90 0 V 299" />
        <path d="M 1410 0 V 299" />
        <path d="M 90 299 A 675 675 0 0 0 1410 299" />
        <path d="M 625 157.5 A 125 125 0 0 0 875 157.5" />
        <circle cx="750" cy="1400" r="180" />
      </svg>
    </div>
  );
}
