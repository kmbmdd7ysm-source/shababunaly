import { useId, useState } from 'react';

export default function VideoGalleryEngine({
  videos,
  label,
  pick,
}: {
  videos: string[];
  label: string;
  pick: (value: { en?: string; ar?: string }) => string;
}) {
  const [index, setIndex] = useState(0);
  const id = useId();
  const current = videos[index] || '';
  if (!current) return null;

  return (
    <div className="gw-video-gallery" aria-label={pick({ en: 'Product videos', ar: 'فيديوهات المنتج' })}>
      <video
        key={current}
        className="gw-video-gallery__player"
        controls
        playsInline
        preload="metadata"
        aria-label={label}
      >
        <source src={current} />
        {pick({ en: 'Your browser cannot play this product video.', ar: 'المتصفح لا يدعم تشغيل فيديو المنتج.' })}
      </video>
      {videos.length > 1 ? (
        <div className="gw-video-gallery__rail" role="tablist" aria-label={pick({ en: 'Video views', ar: 'مشاهد الفيديو' })}>
          {videos.map((src, position) => (
            <button
              id={`${id}-${position}`}
              key={src}
              type="button"
              role="tab"
              aria-selected={position === index}
              className={position === index ? 'is-active' : ''}
              onClick={() => setIndex(position)}
            >
              {String(position + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
