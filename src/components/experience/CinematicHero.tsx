import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { LOCAL_HERO_MEDIA } from '../../data/localHeroMedia';
import '../../styles/design/phase2-home.css';

const HERO = LOCAL_HERO_MEDIA.home;
const isEmbed = (url: string) => /youtube(?:-nocookie)?\.com\/embed\//i.test(url);

export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const [failed, setFailed] = useState(false);
  const [shellActive, setShellActive] = useState(
    () => typeof document !== 'undefined' && Boolean(document.getElementById('lcp-shell')),
  );

  useEffect(() => {
    const shell = document.getElementById('lcp-shell');
    if (!shell) { setShellActive(false); return undefined; }
    const fade = globalThis.setTimeout(() => shell.classList.add('is-retiring'), 900);
    const remove = globalThis.setTimeout(() => { shell.remove(); setShellActive(false); }, 1250);
    return () => { globalThis.clearTimeout(fade); globalThis.clearTimeout(remove); };
  }, []);

  const mediaAllowed = capability !== 'c' && !reduced && !navigator.connection?.saveData;
  const embedded = isEmbed(HERO.desktopVideo);

  return (
    <section className="s2-hero" aria-labelledby="s2-home-title">
      <div className="s2-hero__media" aria-hidden="true">
        {!shellActive ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={HERO.mobilePoster} />
            <img src={HERO.desktopPoster} alt="" width="1600" height="900" decoding="async" />
          </picture>
        ) : null}
        {mediaAllowed && !failed ? (
          embedded ? (
            <div className="s2-hero__embed">
              <iframe
                src={HERO.desktopVideo}
                title=""
                tabIndex={-1}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setFailed(true)}
              />
            </div>
          ) : (
            <video muted loop playsInline autoPlay preload="auto" poster={HERO.desktopPoster} onError={() => setFailed(true)}>
              <source media="(max-width: 899px)" src={HERO.mobileVideo} type="video/mp4" />
              <source src={HERO.desktopVideo} type="video/mp4" />
            </video>
          )
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
