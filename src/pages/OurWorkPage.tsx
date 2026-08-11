import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/common/Seo';
import SmartImage from '../components/common/SmartImage';
import { useLanguage } from '../context/LanguageContext';
import '../styles/teams-stories.css';

const stories = [
  {
    image: '/images/catalog/apparel.svg',
    category: { en: 'Custom teamwear', ar: 'ملابس الفرق' },
    title: { en: 'From identity to game night.', ar: 'من الهوية إلى ليلة المباراة.' },
    copy: { en: 'A visual path through custom game sets, roster details and production-ready design.', ar: 'مسار بصري لأطقم اللعب المخصصة وتفاصيل القائمة والتصميم الجاهز للإنتاج.' },
    to: '/customize',
  },
  {
    image: '/images/catalog/shoe.svg',
    category: { en: 'Performance', ar: 'الأداء' },
    title: { en: 'Shop basketball by how you play.', ar: 'تسوق كرة السلة حسب طريقة لعبك.' },
    copy: { en: 'Performance discovery without invented ratings. Verified data when it exists, honest unknowns when it does not.', ar: 'اكتشاف منتجات الأداء دون تقييمات مختلقة. بيانات موثقة عندما تتوفر ووضوح عندما لا تتوفر.' },
    to: '/basketball/shoe-finder',
  },
  {
    image: '/images/catalog/ball.svg',
    category: { en: 'Programs', ar: 'البرامج' },
    title: { en: 'One order. The whole program.', ar: 'طلب واحد. برنامج كامل.' },
    copy: { en: 'Uniforms, training, equipment and club supply organized as one basketball project.', ar: 'أطقم وتدريب ومعدات وتجهيز النادي ضمن مشروع كرة سلة واحد.' },
    to: '/teams-wholesale',
  },
  {
    image: '/images/catalog/bag.svg',
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
            <SmartImage src="/media/atmosphere/court-overhead-1600.webp" alt="" width={1600} height={1067} sizes="(min-width: 760px) 50vw, 100vw" />
          </div>
        </header>

        <section className="story-grid" aria-label={pick({ en: 'Stories', ar: 'القصص' })}>
          {stories.map((story) => (
            <Link className="story-card" to={story.to} key={story.title.en}>
              <div className="story-card-media"><SmartImage src={story.image} alt="" width={1000} height={1250} /></div>
              <div className="story-card-meta"><span>{pick(story.category)}</span><span>Shababuna</span></div>
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
