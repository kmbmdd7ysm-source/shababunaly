import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import SmartImage from '../components/common/SmartImage';
import EditorialMedia from '../components/common/EditorialMedia';
import { useLanguage } from '../context/LanguageContext';
import { LOCAL_HERO_MEDIA } from '../data/localHeroMedia';
import '../styles/teams-stories.css';

const stories = [
  {
    image: '/media/official-brand/square-atwo.webp',
    category: { en: 'Team identity', ar: 'هوية الفريق' },
    title: { en: 'Build the look. Build the program.', ar: 'ابنِ الشكل. وابنِ البرنامج.' },
    copy: { en: 'A global basketball reference for thinking about uniforms, roster identity and presentation before production.', ar: 'مرجع بصري عالمي لكرة السلة للتفكير في الأطقم وهوية الفريق وطريقة العرض قبل الإنتاج.' },
    to: '/customize',
  },
  {
    image: '/media/official-brand/square-sabrina.webp',
    category: { en: 'Performance', ar: 'الأداء' },
    title: { en: 'Shop basketball by how you play.', ar: 'تسوق كرة السلة حسب طريقة لعبك.' },
    copy: { en: 'Performance discovery without invented ratings. Verified data when it exists, honest unknowns when it does not.', ar: 'اكتشاف منتجات الأداء دون تقييمات مختلقة. بيانات موثقة عندما تتوفر ووضوح عندما لا تتوفر.' },
    to: '/basketball/shoe-finder',
  },
  {
    image: '/media/official-brand/clean/global-portrait-lebron.webp',
    category: { en: 'Programs', ar: 'البرامج' },
    title: { en: 'One order. The whole program.', ar: 'طلب واحد. برنامج كامل.' },
    copy: { en: 'Uniforms, training, equipment and club supply organized as one basketball project.', ar: 'أطقم وتدريب ومعدات وتجهيز النادي ضمن مشروع كرة سلة واحد.' },
    to: '/teams-wholesale',
  },
  {
    image: '/media/official-brand/portrait-closeup.webp',
    category: { en: 'Culture', ar: 'الثقافة' },
    title: { en: 'Beyond the forty minutes.', ar: 'أبعد من الأربعين دقيقة.' },
    copy: { en: 'Travel, recovery and off-court products around the everyday life of basketball.', ar: 'السفر والاستشفاء ومنتجات خارج الملعب حول الحياة اليومية لكرة السلة.' },
    to: '/discover',
  },
];

export default function OurWorkPage(): ReactElement {
  const { pick } = useLanguage();
  return (
    <>
      <Seo
        title="Stories | Shababuna"
        description="Basketball stories, product intelligence, custom teamwear and Shababuna projects."
        path="/stories"
      />
      <main className="story-page">
        <header className="story-hero">
          <div className="story-hero-copy">
            <p className="cc-eyebrow">{pick({ en: 'Stories / Discover', ar: 'القصص / اكتشف' })}</p>
            <h1>{pick({ en: 'Basketball, seen closer.', ar: 'كرة السلة عن قرب.' })}</h1>
            <p>{pick({ en: 'Campaigns, product intelligence, custom work and the basketball culture around what we sell.', ar: 'حملات ومعلومات منتجات وأعمال مخصصة وثقافة كرة السلة حول ما نقدمه.' })}</p>
          </div>
          <div className="story-hero-media">
            <EditorialMedia
              desktopMedia={LOCAL_HERO_MEDIA.stories.desktopPoster}
              mobileMedia={LOCAL_HERO_MEDIA.stories.mobilePoster}
              desktopVideo={LOCAL_HERO_MEDIA.stories.desktopVideo}
              mobileVideo={LOCAL_HERO_MEDIA.stories.mobileVideo}
              poster={LOCAL_HERO_MEDIA.stories.desktopPoster}
              loading="eager"
            />
          </div>
        </header>

        <section className="story-grid" aria-label={pick({ en: 'Stories', ar: 'القصص' })}>
          {stories.map((story) => (
            <Link className="story-card" to={story.to} key={story.title.en}>
              <div className="story-card-media"><SmartImage src={story.image} alt="" width={1000} height={1250} /></div>
              <div className="story-card-meta"><span>{pick(story.category)}</span><span>{pick({ en: 'Editorial reference', ar: 'مرجع بصري' })}</span></div>
              <h2>{pick(story.title)}</h2>
              <p>{pick(story.copy)}</p>
            </Link>
          ))}
        </section>

        <section className="story-cta">
          <p className="cc-eyebrow">{pick({ en: 'Build with us', ar: 'ابنِ معنا' })}</p>
          <h2>{pick({ en: 'Make the next story yours.', ar: 'خلّي القصة القادمة قصتك.' })}</h2>
          <div className="cc-actions"><Link className="gw-btn gw-btn--primary" to="/customize">{pick({ en: 'Start customizing', ar: 'ابدأ التصميم' })}</Link><Link className="gw-btn gw-btn--ghost" to="/teams-wholesale">{pick({ en: 'Outfit a team', ar: 'جهّز فريقًا' })}</Link></div>
        </section>
      </main>
    </>
  );
}
