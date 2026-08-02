import Icon from '../icons/Icon';
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { share } from '../../utils/sharing';

export default function ShareButtons({ title, text, label }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const act = async (method) => {
    try {
      await share({ title, text, url, method });
      if (method === 'copy') {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <div className="share-row">
      {label && <span className="share-label">{label}</span>}
      <div className="share-buttons">
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            className="btn-secondary compact share-control"
            onClick={() => act('native')}
          >
            {t.common.share}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('copy')}
        >
          {copied && <Icon name="check" size={16} />} {copied ? t.common.copied : t.common.copy}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('whatsapp')}
        >
          {t.common.whatsapp}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('x')}
        >
          {t.common.x}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('email')}
        >
          {t.common.email}
        </button>
      </div>
    </div>
  );
}
