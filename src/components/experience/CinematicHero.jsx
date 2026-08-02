import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { fetchSiteContent } from '../../services/siteContent';

const ENV_DESKTOP_VIDEO = String(import.meta.env.VITE_HERO_VIDEO_URL || '').trim();
const ENV_MOBILE_VIDEO = String(import.meta.env.VITE_HERO_MOBILE_VIDEO_URL || '').trim();

export default function CinematicHero() {
  const { pick } = useLanguage();
  const video = useRef(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [mediaConfig, setMediaConfig] = useState({ enabled: true, desktopVideoUrl: ENV_DESKTOP_VIDEO, mobileVideoUrl: ENV_MOBILE_VIDEO });
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();


  useEffect(() => {
    let active = true;
    const load = () => fetchSiteContent('home_hero').then((content) => {
      if (!active || !content) return;
      const safeUrl = (value) => /^https:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';
      setMediaConfig({
        enabled: content.enabled !== false,
        desktopVideoUrl: safeUrl(content.desktopVideoUrl) || ENV_DESKTOP_VIDEO,
        mobileVideoUrl: safeUrl(content.mobileVideoUrl) || ENV_MOBILE_VIDEO,
      });
    }).catch(() => {});
    const idle = globalThis.requestIdleCallback?.(load, { timeout: 2200 });
    const timer = idle == null ? setTimeout(load, 900) : null;
    return () => { active = false; if (idle != null) globalThis.cancelIdleCallback?.(idle); if (timer) clearTimeout(timer); };
  }, []);

  const desktop = globalThis.matchMedia?.('(min-width: 900px)')?.matches ?? true;
  const selectedVideo = mediaConfig.enabled ? (desktop ? mediaConfig.desktopVideoUrl : mediaConfig.mobileVideoUrl) : '';

  useEffect(() => {
    if (!selectedVideo || reduced || navigator.connection?.saveData) return undefined;
    const media = matchMedia('(hover: hover) and (pointer: fine), (max-width: 899px)');
    if (!media.matches) return undefined;
    const enable = () => setVideoEnabled(true);
    addEventListener('pointerdown', enable, { once: true, passive: true });
    addEventListener('keydown', enable, { once: true });
    return () => {
      removeEventListener('pointerdown', enable);
      removeEventListener('keydown', enable);
    };
  }, [reduced, selectedVideo]);

  useEffect(() => {
    if (videoEnabled && !failed) video.current?.play().catch(() => {});
  }, [videoEnabled, failed]);

  return (
    <section className="hero cinematic-hero shababuna-hero">
      <div className="hero-media" aria-hidden="true">
        <picture className="hero-poster-picture">
          <source media="(max-width: 767px)" srcSet="/media/hero/shababuna-hero-poster-mobile.webp" />
          <img className="hero-poster" src="/media/hero/shababuna-hero-poster.webp" alt="" width="1940" height="1024" fetchPriority="high" decoding="async" />
        </picture>
        {selectedVideo && videoEnabled && !failed && <video ref={video} muted loop playsInline autoPlay preload="none" poster="/media/hero/shababuna-hero-poster.webp" onError={() => setFailed(true)}><source src={selectedVideo} type="video/mp4" /></video>}
      </div>
      <div className="container hero-inner">
        <p className="hero-kicker">SHABABUNA · BASKETBALL SUPPLY</p>
        <h1 className="hero-title display-title"><span>BUILT</span><br/><span className="outline">DIFFERENT.</span></h1>
        <p className="hero-text">{pick({en:'Basketball retail, custom manufacturing, club supply and wholesale — built in one global platform.',ar:'متجر كرة سلة وتصنيع مخصص وتجهيز أندية وجملة — ضمن منصة عالمية واحدة.'})}</p>
        <div className="hero-actions"><Link to="/shop" className="btn-primary block">{pick({en:'Shop',ar:'تسوّق'})}</Link><Link to="/customize" className="btn-secondary block">{pick({en:'Customize',ar:'صمّم'})}</Link><Link to="/teams-wholesale" className="btn-ghost block">{pick({en:'Teams & Wholesale',ar:'الأندية والجملة'})}</Link></div>
      </div>
      <a className="hero-scroll" href="#departments"><span className="sr-only">{pick({en:'Scroll to shop departments',ar:'انتقل إلى أقسام المتجر'})}</span><span className="hero-scroll-dot" aria-hidden="true" /></a>
    </section>
  );
}
