import type { ReactElement } from 'react';
import { useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type EditorialMediaProps = {
  desktopMedia: string;
  mobileMedia?: string;
  desktopVideo?: string;
  mobileVideo?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
  poster?: string;
};

function videoType(url: string): string {
  if (/\.webm($|\?)/i.test(url)) return 'video/webm';
  return 'video/mp4';
}

function isEmbed(url?: string): boolean {
  return Boolean(url && /youtube(?:-nocookie)?\.com\/embed\//i.test(url));
}

export default function EditorialMedia({
  desktopMedia,
  mobileMedia,
  desktopVideo,
  mobileVideo,
  alt = '',
  loading = 'lazy',
  poster,
}: EditorialMediaProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const chosenEmbed = isEmbed(desktopVideo) ? desktopVideo : isEmbed(mobileVideo) ? mobileVideo : undefined;
  const hasMotion = !reducedMotion && !failed && Boolean(desktopVideo || mobileVideo);

  if (hasMotion && chosenEmbed) {
    return (
      <div className="s2-official-video-frame" aria-hidden="true">
        <iframe
          src={chosenEmbed}
          title=""
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (hasMotion) {
    return (
      <video
        muted
        loop
        playsInline
        autoPlay
        preload={loading === 'eager' ? 'auto' : 'metadata'}
        poster={poster || mobileMedia || desktopMedia}
        onError={() => setFailed(true)}
        aria-hidden={alt ? undefined : true}
      >
        {mobileVideo ? <source media="(max-width: 699px)" src={mobileVideo} type={videoType(mobileVideo)} /> : null}
        {desktopVideo ? <source src={desktopVideo} type={videoType(desktopVideo)} /> : null}
      </video>
    );
  }

  return (
    <picture>
      {mobileMedia ? <source media="(max-width: 699px)" srcSet={mobileMedia} /> : null}
      <img src={desktopMedia} alt={alt} width="1600" height="1067" loading={loading} />
    </picture>
  );
}
