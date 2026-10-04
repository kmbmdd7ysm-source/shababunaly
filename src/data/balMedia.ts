/**
 * Official Basketball Africa League media used for Shababuna editorial surfaces.
 * Remote BAL assets stay remote; Shababuna-owned media is self-hosted separately.
 * Source pages: https://bal.nba.com/
 */
const BAL_CDN = 'https://cdn-bal.nba.com/manage/sites/3';

const youtubeBackground = (id: string, start = 0, end?: number): string => {
  const segment = `${start ? `&start=${start}` : ''}${end ? `&end=${end}` : ''}`;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&modestbranding=1&playsinline=1&rel=0${segment}`;
};

export const BAL_MEDIA = {
  images: {
    giantsDrive: `${BAL_CDN}/2026/03/Joshua-Ozabor-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    riversDunk: `${BAL_CDN}/2025/04/Rivers-Hoopers-2025-Kalahari-819x1024.jpg`,
    petroAprDunk: `${BAL_CDN}/2025/06/Petro-APR-2-819x1024.jpg`,
    riversVsAlAhly: `${BAL_CDN}/2026/05/Rivers-Hoopers-vs-Al-Ahly-Ly-2024-1024x683.jpg`,
    petroVsCapeTown: `${BAL_CDN}/2026/05/Petro-de-Luanda-vs-Cape-Town-2024-playoffs-1024x683.jpg`,
    riversTeam: `${BAL_CDN}/2025/04/Rivers-Hoopers-2025-Kalahari-7-1024x683.jpg`,
    lualFabian: `${BAL_CDN}/2025/06/Jo-Lual-Acuil-Jr-and-Fabian-White-Jr-819x1024.jpg`,
    clubAfricainFansWide: `${BAL_CDN}/2026/04/Club-Africain-Fans-1-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    clubAfricainFansVertical: `${BAL_CDN}/2026/04/Club-Africain-Fans-768x1024.jpg`,
    clubAfricainVsDakar: `${BAL_CDN}/2026/04/Club-Africain-vs-ASC-Ville-Dakar-1-1024x683.jpg`,
    sunBetArena: `${BAL_CDN}/2026/03/SunBet-Arena-Pretoria-1-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    fanZone: `${BAL_CDN}/2026/03/Fan-Zone-SunBet-Pretoria-1024x576.jpg`,
    futureProsGroup: `${BAL_CDN}/2026/03/BAL-Future-Pros-Group-02319-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    futureProsSession: `${BAL_CDN}/2026/02/BAL-Future-Pros-HR-Session-02742-1-1024x683.jpg`,
    futureProsSafari: `${BAL_CDN}/2026/02/BAL-Future-Pros-Safari-03177-2-683x1024.jpg`,
    futureProsSafariAlt: `${BAL_CDN}/2026/02/BAL-Future-Pros-Safari-03281-2-819x1024.jpg`,
    alAhlyChampions: `${BAL_CDN}/2023/05/al-ahly-champions-scaled.jpg?im=Resize%3D%28900%2C506%29`,
    alAhlyCelebration: `${BAL_CDN}/2023/05/ehab-omot-222-1024x683.jpg`,
    kigaliArena: `${BAL_CDN}/2023/05/kigali-arena-1-1-1024x683.jpg`,
    pumaMerch: `${BAL_CDN}/2026/05/NBAA-BAL-DTC-Puma-Merch-Promo_9_16-4-576x1024.jpg`,
    balPuma: `${BAL_CDN}/2026/03/BALxPuma.png?im=Resize%3D%28900%2C506%29`,
    alAhliTripoliSadi: `${BAL_CDN}/2025/05/Al-Ahli-Tripoli-Nile-2-1024x683.jpg`,
    monastirHuddle: `${BAL_CDN}/2025/06/Vasco-Curado-US-Monastir-3-1024x683.jpg`,
    ittihadHuddle: `${BAL_CDN}/2025/06/Omar-Soliman-3-Ittihad-1024x683.jpg`,
  },
  videos: {
    seasonSixRecap: youtubeBackground('K5RDhS00rg0'),
    seasonSixMovement: youtubeBackground('K5RDhS00rg0', 2, 13),
    seasonSixCulture: youtubeBackground('K5RDhS00rg0', 14, 25),
    seasonSixTeams: youtubeBackground('K5RDhS00rg0', 26, 38),
  },
  source: 'https://bal.nba.com/',
} as const;
