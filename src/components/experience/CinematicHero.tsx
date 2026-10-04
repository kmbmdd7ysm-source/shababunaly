import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { LOCAL_HERO_MEDIA } from '../../data/localHeroMedia';
import '../../styles/design/phase2-home.css';

const HERO = LOCAL_HERO_MEDIA.home;
const HOME_POSTER = '/media/hero-posters/home.webp';

export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      void attempt.catch(() => undefined);
    }
  };

  useEffect(() => {
    startPlayback();

    const onVisible = () => {
      if (document.visibilityState === 'visible') startPlayback();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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
        {!failed ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            autoPlay
            controls={false}
            disablePictureInPicture
            preload="auto"
            poster={HOME_POSTER}
            onLoadedData={startPlayback}
            onCanPlay={startPlayback}
            onError={() => setFailed(true)}
          >
            <source media="(max-width: 899px)" src={HERO.mobileVideo} type="video/mp4" />
            <source src={HERO.desktopVideo} type="video/mp4" />
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
      <a className="s2-hero__scroll" href="#s2-trending" aria-label={pick({ en: 'Explore more', ar: 'اكتشف المزيد' })}><span /></a>
    </section>
  );
}
