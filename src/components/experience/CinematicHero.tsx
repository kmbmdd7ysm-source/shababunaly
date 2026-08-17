import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { fetchSiteContent } from '../../services/siteContent';
import '../../styles/design/phase2-home.css';

const DEFAULT_DESKTOP_VIDEO = '/media/hero/shababuna-hero-desktop.mp4';
const DEFAULT_MOBILE_VIDEO = '/media/hero/shababuna-hero-mobile.mp4';
const DEFAULT_DESKTOP_POSTER = '/media/hero/shababuna-hero-poster.webp';
const DEFAULT_MOBILE_POSTER = '/media/hero/shababuna-hero-poster-mobile.webp';
const safeUrl = (value: unknown) => {
  const url = String(value || '').trim();
  return /^\/(?!\/)/.test(url) || /^https:\/\//i.test(url) ? url : '';
};

export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const [failed, setFailed] = useState(false);
  const [mediaConfig, setMediaConfig] = useState<Record<string, unknown>>({
    enabled: true,
    desktopVideoUrl: DEFAULT_DESKTOP_VIDEO,
    mobileVideoUrl: DEFAULT_MOBILE_VIDEO,
    desktopPosterUrl: DEFAULT_DESKTOP_POSTER,
    mobilePosterUrl: DEFAULT_MOBILE_POSTER,
  });
  const [shellActive, setShellActive] = useState(
    () => typeof document !== 'undefined' && Boolean(document.getElementById('lcp-shell')),
  );

  useEffect(() => {
    const shell = document.getElementById('lcp-shell');
    if (!shell) {
      setShellActive(false);
      return undefined;
    }
    const fade = globalThis.setTimeout(() => shell.classList.add('is-retiring'), 1600);
    const remove = globalThis.setTimeout(() => {
      shell.remove();
      setShellActive(false);
    }, 1900);
    return () => {
      globalThis.clearTimeout(fade);
      globalThis.clearTimeout(remove);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => fetchSiteContent('home_hero').then((content) => {
      if (!active || !content) return;
      setMediaConfig({
        enabled: content.enabled !== false,
        desktopVideoUrl: safeUrl(content.desktopVideoUrl) || DEFAULT_DESKTOP_VIDEO,
        mobileVideoUrl: safeUrl(content.mobileVideoUrl) || DEFAULT_MOBILE_VIDEO,
        desktopPosterUrl: safeUrl(content.desktopPosterUrl) || DEFAULT_DESKTOP_POSTER,
        mobilePosterUrl: safeUrl(content.mobilePosterUrl) || DEFAULT_MOBILE_POSTER,
      });
    }).catch(() => {});
    const timer = setTimeout(() => void load(), 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const desktop = globalThis.matchMedia?.('(min-width: 900px)')?.matches ?? true;
  const selectedVideo = mediaConfig.enabled
    ? String(desktop ? mediaConfig.desktopVideoUrl || '' : mediaConfig.mobileVideoUrl || '')
    : '';
  const selectedPoster = String(desktop ? mediaConfig.desktopPosterUrl || DEFAULT_DESKTOP_POSTER : mediaConfig.mobilePosterUrl || DEFAULT_MOBILE_POSTER);
  const mediaAllowed = capability !== 'c' && !reduced && !navigator.connection?.saveData;

  useEffect(() => {
    if (mediaAllowed && selectedVideo && !failed) {
      videoRef.current?.play().catch(() => {});
    }
  }, [mediaAllowed, selectedVideo, failed]);

  return (
    <section className="s2-hero" aria-labelledby="s2-home-title">
      <div className="s2-hero__media" aria-hidden="true">
        {!shellActive ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={DEFAULT_MOBILE_POSTER} />
            <img src={DEFAULT_DESKTOP_POSTER} alt="" width="1940" height="1024" decoding="async" />
          </picture>
        ) : null}
        {selectedVideo && mediaAllowed && !failed ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            poster={selectedPoster}
            onError={() => setFailed(true)}
          >
            <source src={selectedVideo} type="video/mp4" />
          </video>
        ) : null}
        <span className="s2-hero__scrim" />
      </div>
      <div className="s2-hero__content">
        <p className="s2-hero__eyebrow">{pick({ en: 'Shababuna Basketball', ar: 'شبابنا لكرة السلة' })}</p>
        <h1 id="s2-home-title">{pick({ en: 'Built for the game.', ar: 'مصنوع للعبة.' })}</h1>
        <div className="s2-hero__actions">
          <Link to="/shop">{pick({ en: 'Shop now', ar: 'تسوق الآن' })}</Link>
          <Link to="/discover">{pick({ en: 'Discover', ar: 'اكتشف' })}</Link>
        </div>
      </div>
      <a className="s2-hero__scroll" href="#s2-trending" aria-label={pick({ en: 'Explore more', ar: 'اكتشف المزيد' })}>
        <span />
      </a>
    </section>
  );
}
