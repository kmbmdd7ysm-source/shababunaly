import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { fetchSiteContent } from '../../services/siteContent';
import '../../styles/design/phase2-home.css';

const ENV_DESKTOP_VIDEO = String(import.meta.env.VITE_HERO_VIDEO_URL || '').trim();
const ENV_MOBILE_VIDEO = String(import.meta.env.VITE_HERO_MOBILE_VIDEO_URL || '').trim();
const safeUrl = (value: unknown) => /^https:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';

export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mediaConfig, setMediaConfig] = useState<Record<string, unknown>>({
    enabled: true,
    desktopVideoUrl: ENV_DESKTOP_VIDEO,
    mobileVideoUrl: ENV_MOBILE_VIDEO,
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
        desktopVideoUrl: safeUrl(content.desktopVideoUrl) || ENV_DESKTOP_VIDEO,
        mobileVideoUrl: safeUrl(content.mobileVideoUrl) || ENV_MOBILE_VIDEO,
      });
    }).catch(() => {});
    const id = globalThis.requestIdleCallback?.(() => void load(), { timeout: 1800 });
    const timer = id == null ? setTimeout(() => void load(), 700) : null;
    return () => {
      active = false;
      if (id != null) globalThis.cancelIdleCallback?.(id);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const desktop = globalThis.matchMedia?.('(min-width: 900px)')?.matches ?? true;
  const selectedVideo = mediaConfig.enabled
    ? String(desktop ? mediaConfig.desktopVideoUrl || '' : mediaConfig.mobileVideoUrl || '')
    : '';
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
    if (videoEnabled && !failed) videoRef.current?.play().catch(() => {});
  }, [videoEnabled, failed]);

  return (
    <section className="s2-hero" aria-labelledby="s2-home-title">
      <div className="s2-hero__media" aria-hidden="true">
        {!shellActive ? (
          <picture>
            <source media="(max-width: 767px)" srcSet="/media/hero/shababuna-hero-poster-mobile.webp" />
            <img src="/media/hero/shababuna-hero-poster.webp" alt="" width="1940" height="1024" decoding="async" />
          </picture>
        ) : null}
        {selectedVideo && videoEnabled && !failed ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            autoPlay
            preload="none"
            poster="/media/hero/shababuna-hero-poster.webp"
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
