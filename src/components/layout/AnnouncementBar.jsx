import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { announcementBar } from '../../data/announcements';
import { useLanguage } from '../../context/LanguageContext';
import { SHIPPING_MESSAGES } from '../../config/shipping';
import { useCommerce } from '../../context/CommerceContext';

export default function AnnouncementBar() {
  const { pick, lang } = useLanguage();
  const { countryCode } = useCommerce();
  const [i, setI] = useState(0);
  const messages = announcementBar.messages || [];
  useEffect(() => {
    if (!announcementBar.enabled || messages.length <= 1) return undefined;
    const id = setInterval(
      () => setI((p) => (p + 1) % messages.length),
      announcementBar.rotateMs || 5000,
    );
    return () => clearInterval(id);
  }, [messages.length]);
  if (!announcementBar.enabled || messages.length === 0) return null;
  const msg = messages[i];
  const text = msg.type === 'free-shipping'
    ? countryCode === 'LY'
      ? SHIPPING_MESSAGES.announcement[lang]
      : SHIPPING_MESSAGES.quoteRequired[lang]
    : pick(msg);
  return (
    <div className="announcement-bar" role="region" aria-label="Announcements">
      <div className="container announcement-inner" aria-live="polite">
        {msg.link ? <Link to={msg.link}>{text}</Link> : <span>{text}</span>}
      </div>
    </div>
  );
}
