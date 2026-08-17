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
  const hasMotion = !reducedMotion && !failed && Boolean(desktopVideo || mobileVideo);

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
