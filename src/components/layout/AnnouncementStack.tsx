import type { ReactElement } from 'react';
import ReadinessBanner from './ReadinessBanner';
import AnnouncementBar from './AnnouncementBar';

/**
 * Document-flow announcement stack owned by GlobalChrome.
 * Readiness + commerce announcements — never overlays the header.
 */
export default function AnnouncementStack(): ReactElement {
  return (
    <div className="gw-announce-stack">
      <ReadinessBanner />
      <AnnouncementBar />
    </div>
  );
}
