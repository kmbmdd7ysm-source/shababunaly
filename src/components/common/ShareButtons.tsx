import Icon from '../icons/Icon';
import { useState, type ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { share } from '../../utils/sharing.ts';

export default function ShareButtons({
  title,
  text,
  label,
}: {
  title?: string;
  text?: string;
  label?: ReactNode;
}) {
  const { t } = useLanguage();
  const common = (t.common as Record<string, string> | undefined) || {};
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const act = async (method: string) => {
    try {
      const payload: { title?: string; text?: string; url?: string; method?: string } = {
        url,
        method,
      };
      if (title) payload.title = title;
      if (text) payload.text = text;
      await share(payload);
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
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            type="button"
            className="btn-secondary compact share-control"
            onClick={() => act('native')}
          >
            {common.share}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('copy')}
        >
          {copied && <Icon name="check" size={16} />} {copied ? common.copied : common.copy}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('whatsapp')}
        >
          {common.whatsapp}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('x')}
        >
          {common.x}
        </button>
        <button
          type="button"
          className="btn-secondary compact share-control"
          onClick={() => act('email')}
        >
          {common.email}
        </button>
      </div>
    </div>
  );
}
