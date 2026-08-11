import type { ReactElement } from 'react';
import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AnnouncementStack from './AnnouncementStack';
import MainHeader from './MainHeader';
import MobileDock from './MobileDock';
import '../../styles/sysbanner.css';
import '../../styles/design/phase2-chrome.css';

const DOCK_HIDDEN_PREFIXES = [
  '/checkout',
  '/cart',
  '/products',
  '/customize',
  '/operations',
  '/team-locker',
  '/design-share',
];

export default function GlobalChrome(): ReactElement {
  const { pathname } = useLocation();
  const hideMobileDock = DOCK_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useLayoutEffect(() => {
    document.documentElement.dataset.mobileDock = hideMobileDock ? 'hidden' : 'visible';
    return () => {
      delete document.documentElement.dataset.mobileDock;
    };
  }, [hideMobileDock]);

  return (
    <div className="s2-chrome">
      <div className="s2-chrome__sticky">
        <AnnouncementStack />
        <MainHeader />
      </div>
      {hideMobileDock ? null : <MobileDock />}
    </div>
  );
}
