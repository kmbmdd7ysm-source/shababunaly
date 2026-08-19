import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDeviceCapability } from '../../hooks/useDeviceCapability';
import { LOCAL_HERO_MEDIA } from '../../data/localHeroMedia';
import '../../styles/design/phase2-home.css';
const HERO = LOCAL_HERO_MEDIA.home;
export default function CinematicHero(): ReactElement {
  const { pick } = useLanguage();
  const reduced = useReducedMotion();
  const capability = useDeviceCapability();
  const autoplay = capability !== 'c' && !reduced && !navigator.connection?.saveData;
  return <section className="s2-hero" aria-labelledby="s2-home-title">
    <div className="s2-hero__media" aria-hidden="true">
      <video muted loop playsInline autoPlay={autoplay} controls={false} disablePictureInPicture preload={autoplay ? 'auto' : 'metadata'}>
        <source media="(max-width: 899px)" src={HERO.mobileVideo} type="video/mp4" />
        <source src={HERO.desktopVideo} type="video/mp4" />
      </video><span className="s2-hero__scrim" />
    </div>
    <div className="s2-hero__content"><p className="s2-hero__eyebrow">{pick({ en: 'Shababuna Basketball', ar: 'شبابنا لكرة السلة' })}</p><h1 id="s2-home-title">{pick({ en: 'Built for the game.', ar: 'مصنوع للعبة.' })}</h1><div className="s2-hero__actions"><Link to="/shop">{pick({ en: 'Shop now', ar: 'تسوق الآن' })}</Link><Link to="/discover">{pick({ en: 'Discover', ar: 'اكتشف' })}</Link></div></div>
    <a className="s2-hero__scroll" href="#s2-trending" aria-label={pick({ en: 'Explore more', ar: 'اكتشف المزيد' })}><span /></a>
  </section>;
}
