import '../../styles/domain-chrome.css';
import type { ReactElement } from 'react';
import AnnouncementStack from './AnnouncementStack';
import MainHeader from './MainHeader';
import '../../styles/sysbanner.css';
import '../../styles/shell.nav.css';
import '../../styles/domain-overlays.css';

/**
 * Authoritative global chrome — single ownership, no bridge duplicates.
 *
 * GlobalChrome
 *   AnnouncementStack (readiness + shipping/commerce dismissibles)
 *   MainHeader
 *     MainNavigation · UtilityNavigation · Search · LocaleCurrency · MobileNavigation
 *
 * Banners stay in document flow so dismiss never covers logo/menu.
 * Ready to Ship remains discoverable worldwide via header mega menu + footer.
 */
export default function GlobalChrome(): ReactElement {
  return (
    <div className="gw-chrome">
      <div className="gw-chrome-sticky">
        <AnnouncementStack />
        <MainHeader />
      </div>
    </div>
  );
}
