import Icon from '../icons/Icon';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { onPwaEvent, promptInstall, applyPwaUpdate, isStandalone } from '../../utils/registerPwa';
export default function PwaPrompt() {
  const { pick } = useLanguage();
  // Guards against any possibility of a reload loop.
  const reloadedRef = useRef(false);
  const [install, setInstall] = useState(false),
    [update, setUpdate] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  useEffect(
    () =>
      onPwaEvent((e) => {
        if (e.type === 'install-available') setInstall(true);
        if (e.type === 'update-ready') setUpdate(true);
        // Only a deliberate update may reload, and only once. A `first-control`
        // event means the worker simply took over an already-correct page, so
        // reloading would discard cart, Customize and form state for nothing.
        if (e.type === 'controller-changed' && e.reason === 'update') {
          if (document.querySelector('form :focus')) return;
          if (reloadedRef.current) return;
          reloadedRef.current = true;
          location.reload();
        }
      }),
    [],
  );
  useEffect(() => {
    const on = () => setOnline(true),
      off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    return () => {
      removeEventListener('online', on);
      removeEventListener('offline', off);
    };
  }, []);
  if (isStandalone() && online && !update) return null;
  return (
    <div className="pwa-stack" aria-live="polite">
      {!online && (
        <div className="pwa-banner">
          {pick({
            en: 'You are offline. Shopping changes stay on this device until you reconnect.',
            ar: 'أنت غير متصل. ستبقى تغييرات التسوق على هذا الجهاز حتى عودة الاتصال.',
          })}
        </div>
      )}
      {install && !isStandalone() && (
        <div className="pwa-banner">
          <span>
            {pick({
              en: 'Install Shababuna for faster access.',
              ar: 'ثبّت تطبيق شبابنا للوصول بشكل أسرع.',
            })}
          </span>
          <button
            onClick={async () => {
              await promptInstall();
              setInstall(false);
            }}
          >
            {pick({ en: 'Install', ar: 'تثبيت' })}
          </button>
          <button
            onClick={() => setInstall(false)}
            aria-label={pick({ en: 'Dismiss', ar: 'إغلاق' })}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      )}
      {update && (
        <div className="pwa-banner">
          <span>{pick({ en: 'A new version is ready.', ar: 'يتوفر إصدار جديد.' })}</span>
          <button
            onClick={() => {
              if (document.querySelector('form :focus')) return;
              applyPwaUpdate();
            }}
          >
            {pick({ en: 'Update', ar: 'تحديث' })}
          </button>
          <button onClick={() => setUpdate(false)}>{pick({ en: 'Later', ar: 'لاحقًا' })}</button>
        </div>
      )}
    </div>
  );
}
