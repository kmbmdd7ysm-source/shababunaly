import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { announcementBar } from '../../data/announcements';
import { useLanguage } from '../../context/LanguageContext';
import { SHIPPING_MESSAGES } from '../../config/shipping';
import { useCommerce } from '../../context/CommerceContext';
import '../../styles/sysbanner.css';

const DISMISS_KEY = 'shababuna-announce-dismissed-v1';

/*
 * Merchandising announcement — in flow inside the sticky shell.
 * Dismiss is kept as text with a 44px hit area; no rectangular chrome.
 */
export default function AnnouncementBar(): ReactElement | null {
  const { pick, lang } = useLanguage();
  const { countryCode } = useCommerce();
  const [i, setI] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const messages = announcementBar.messages || [];

  useEffect(() => {
    if (!announcementBar.enabled || messages.length <= 1 || dismissed) return undefined;
    const id = setInterval(
      () => setI((p) => (p + 1) % messages.length),
      announcementBar.rotateMs || 5000,
    );
    return () => clearInterval(id);
  }, [messages.length, dismissed]);

  if (!announcementBar.enabled || messages.length === 0) return null;

  const msg = messages[i] ?? messages[0];
  if (!msg) return null;
  const text =
    msg.type === 'free-shipping'
      ? countryCode === 'LY'
        ? SHIPPING_MESSAGES.announcement[lang]
        : SHIPPING_MESSAGES.quoteRequired[lang]
      : pick(msg);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  };

  return (
    <div
      className="gw-announce"
      data-open={dismissed ? 'no' : 'yes'}
      role="region"
      aria-label={pick({ en: 'Announcements', ar: 'الإعلانات' })}
    >
      <div className="gw-announce-inner" aria-live="polite">
        {msg.link ? (
          <Link to={msg.link} className="gw-announce-link">
            {text}
          </Link>
        ) : (
          <span className="gw-announce-link">{text}</span>
        )}
        <button type="button" className="gw-announce-dismiss" onClick={dismiss}>
          {pick({ en: 'Dismiss', ar: 'إغلاق' })}
        </button>
      </div>
    </div>
  );
}
