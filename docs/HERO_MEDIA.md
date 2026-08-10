# SHABABUNA hero media

The site ships with approved black-and-white poster placeholders and no final video file. Add the final hosted MP4 URL through:

```env
VITE_HERO_VIDEO_URL=https://cdn.example.com/shababuna-hero.mp4
```

Recommended delivery assets:

- Desktop master: 1920×1080 or wider, H.264 MP4, muted, 6–12 seconds, optimized for web.
- Mobile master: 720×1280; use a responsive media service or replace the hero component with separate source URLs when supplied.
- Posters: replace `public/media/hero/shababuna-hero-poster.webp` and `shababuna-hero-poster-mobile.webp` without changing their paths.

The poster always remains available for reduced-motion users, data-saver connections, failed playback and initial loading. The video is not requested until an approved URL exists and the visitor interacts on a capable desktop device.
