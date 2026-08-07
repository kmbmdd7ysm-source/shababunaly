import ReadinessBanner from './ReadinessBanner';
import AnnouncementBar from './AnnouncementBar';
import MainHeader from './MainHeader';
import '../../styles/sysbanner.css';
import '../../styles/shell.nav.css';

/**
 * ONE coordinated chrome stack:
 *   GlobalChrome
 *   ├── ReadinessBanner
 *   ├── AnnouncementBar
 *   └── MainHeader
 *
 * Owns stacking, sticky offsets, safe areas, dismiss height collapse,
 * mobile and RTL behaviour. Banners stay in document flow so they never
 * cover logo/menu/content.
 */
export default function GlobalChrome() {
  return (
    <div className="gw-chrome">
      <div className="gw-chrome-sticky">
        <ReadinessBanner />
        <AnnouncementBar />
        <MainHeader />
      </div>
    </div>
  );
}
