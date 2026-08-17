import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { fetchSiteContent } from '../../services/siteContent';
import { OFFICIAL_MEDIA } from '../../data/officialEditorialMedia.ts';
import '../../styles/design/phase2-home.css';

const DEFAULT_DESKTOP_VIDEO = OFFICIAL_MEDIA.none;
const DEFAULT_MOBILE_VIDEO = OFFICIAL_MEDIA.none;
const DEFAULT_DESKTOP_POSTER = OFFICIAL_MEDIA.nikeKobeHeroDesktop;
const DEFAULT_MOBILE_POSTER = OFFICIAL_MEDIA.nikeKobeHeroMobile;
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
  const [officialMotion, setOfficialMotion] = useState<{ embedUrl: string; videoUrl: string }>({ embedUrl: '', videoUrl: '' });
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


  useEffect(() => {
    if (reduced) {
      setOfficialMotion({ embedUrl: '', videoUrl: '' });
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);
    void fetch('/api/official-media?source=nike-only-basketball', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { embedUrl?: unknown; videoUrl?: unknown };
      })
      .then((payload) => {
        if (!payload) return;
        const embedUrl = /^https:\/\/www\.youtube-nocookie\.com\/embed\//i.test(String(payload.embedUrl || ''))
          ? String(payload.embedUrl)
          : '';
        const videoUrl = /^https:\/\//i.test(String(payload.videoUrl || '')) ? String(payload.videoUrl) : '';
        if (embedUrl || videoUrl) setOfficialMotion({ embedUrl, videoUrl });
      })
      .catch(() => {
        // Official Nike imagery remains the fallback if the source blocks server-side retrieval.
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [reduced]);

  const desktop = globalThis.matchMedia?.('(min-width: 900px)')?.matches ?? true;
  const selectedVideo = mediaConfig.enabled
    ? String(desktop ? mediaConfig.desktopVideoUrl || '' : mediaConfig.mobileVideoUrl || '')
    : '';
  const selectedPoster = String(desktop ? mediaConfig.desktopPosterUrl || DEFAULT_DESKTOP_POSTER : mediaConfig.mobilePosterUrl || DEFAULT_MOBILE_POSTER);
  const mediaAllowed = capability !== 'c' && !reduced && !navigator.connection?.saveData;

  useEffect(() => {
    if (mediaAllowed && !officialMotion.embedUrl && !officialMotion.videoUrl && selectedVideo && !failed) {
      videoRef.current?.play().catch(() => {});
    }
  }, [mediaAllowed, officialMotion.embedUrl, officialMotion.videoUrl, selectedVideo, failed]);

  return (
    <section className="s2-hero" aria-labelledby="s2-home-title">
      <div className="s2-hero__media" aria-hidden="true">
        {!shellActive ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={DEFAULT_MOBILE_POSTER} />
            <img src={DEFAULT_DESKTOP_POSTER} alt="" width="1940" height="1024" decoding="async" />
          </picture>
        ) : null}
        {officialMotion.embedUrl && mediaAllowed && !failed ? (
          <div className="s2-hero__embed">
            <iframe
              src={officialMotion.embedUrl}
              title="Official basketball campaign video"
              tabIndex={-1}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : officialMotion.videoUrl && mediaAllowed && !failed ? (
          <video
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            poster={selectedPoster}
            onError={() => setFailed(true)}
          >
            <source src={officialMotion.videoUrl} type="video/mp4" />
          </video>
        ) : selectedVideo && mediaAllowed && !failed ? (
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
