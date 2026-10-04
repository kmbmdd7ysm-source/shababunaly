import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LOCAL_HERO_MEDIA } from '../../data/localHeroMedia';
import '../../styles/design/phase2-home.css';

const HERO = LOCAL_HERO_MEDIA.home;
const HOME_POSTER = '/media/hero-posters/home.webp';
const MOBILE_BREAKPOINT = '(max-width: 899px)';

export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSrc, setVideoSrc] = useState(() =>
    typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(MOBILE_BREAKPOINT).matches
      ? HERO.mobileVideo
      : HERO.desktopVideo,
  );

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') void attempt.catch(() => undefined);
  };

  useEffect(() => {
    const query = globalThis.matchMedia?.(MOBILE_BREAKPOINT);
    if (!query) return undefined;

    const syncSource = () => {
      setVideoSrc(query.matches ? HERO.mobileVideo : HERO.desktopVideo);
    };

    syncSource();
    query.addEventListener?.('change', syncSource);
    return () => query.removeEventListener?.('change', syncSource);
  }, []);

  useEffect(() => {
    startPlayback();

    const retry = () => startPlayback();
    const onVisible = () => {
      if (document.visibilityState === 'visible') startPlayback();
    };

    document.addEventListener('visibilitychange', onVisible);
    globalThis.addEventListener('pointerdown', retry, { once: true });
    globalThis.addEventListener('touchstart', retry, { once: true, passive: true });
    globalThis.addEventListener('keydown', retry, { once: true });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      globalThis.removeEventListener('pointerdown', retry);
      globalThis.removeEventListener('touchstart', retry);
      globalThis.removeEventListener('keydown', retry);
    };
  }, [videoSrc]);

  return (
    <section className="s2-hero" aria-labelledby="s2-home-title">
      <div className="s2-hero__media" aria-hidden="true">
        <img
          className="s2-hero__poster"
          src={HOME_POSTER}
          alt=""
          width="1600"
          height="900"
          decoding="async"
          fetchPriority="high"
        />
        <video
          key={videoSrc}
          ref={videoRef}
          src={videoSrc}
          muted
          loop
          playsInline
          autoPlay
          controls={false}
          disablePictureInPicture
          preload="auto"
          poster={HOME_POSTER}
          onLoadedMetadata={startPlayback}
          onLoadedData={startPlayback}
          onCanPlay={startPlayback}
        />
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
      <a className="s2-hero__scroll" href="#s2-trending" aria-label={pick({ en: 'Explore more', ar: 'اكتشف المزيد' })}><span /></a>
    </section>
  );
}
