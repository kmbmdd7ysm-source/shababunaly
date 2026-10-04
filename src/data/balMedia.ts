/**
 * Official Basketball Africa League media used for Shababuna editorial surfaces.
 *
 * Keep these assets remote so the storefront does not duplicate or re-encode BAL media.
 * Source pages: https://bal.nba.com/
 */
const BAL_CDN = 'https://cdn-bal.nba.com/manage/sites/3';

const youtubeBackground = (id: string): string =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0`;

export const BAL_MEDIA = {
  images: {
    giantsDrive: `${BAL_CDN}/2026/03/Joshua-Ozabor-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    riversDunk: `${BAL_CDN}/2025/04/Rivers-Hoopers-2025-Kalahari-819x1024.jpg`,
    petroAprDunk: `${BAL_CDN}/2025/06/Petro-APR-2-819x1024.jpg`,
    riversVsAlAhly: `${BAL_CDN}/2026/05/Rivers-Hoopers-vs-Al-Ahly-Ly-2024-1024x683.jpg`,
    petroVsCapeTown: `${BAL_CDN}/2026/05/Petro-de-Luanda-vs-Cape-Town-2024-playoffs-1024x683.jpg`,
    riversTeam: `${BAL_CDN}/2025/04/Rivers-Hoopers-2025-Kalahari-7-1024x683.jpg`,
    lualFabian: `${BAL_CDN}/2025/06/Jo-Lual-Acuil-Jr-and-Fabian-White-Jr-819x1024.jpg`,
  },
  videos: {
    seasonSixRecap: youtubeBackground('K5RDhS00rg0'),
  },
  source: 'https://bal.nba.com/',
} as const;
