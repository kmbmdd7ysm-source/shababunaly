# Hero embed presentation fix

This revision improves the existing external film embeds without changing the selected films:

- autoplay requests are reinforced through the YouTube iframe API command channel;
- films are muted, looped, non-interactive and keyboard-disabled;
- player chrome is cropped outside the hero viewport;
- local poster fallbacks are bundled under `public/media/hero-posters/`;
- no YouTube thumbnail URL is used as a poster fallback.

Important: the film payloads are still remote YouTube embeds. A remote embed cannot remain playable after the source film is removed. Full source independence requires licensed MP4/WebM files to be stored in `public/media/heroes/` or in first-party object storage.
