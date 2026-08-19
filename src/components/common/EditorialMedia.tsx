import type { ReactElement } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

type EditorialMediaProps = {
  desktopMedia?: string;
  mobileMedia?: string;
  desktopVideo?: string;
  mobileVideo?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
};
function videoType(url: string): string { return /\.webm($|\?)/i.test(url) ? 'video/webm' : 'video/mp4'; }
export default function EditorialMedia({desktopMedia='',mobileMedia,desktopVideo,mobileVideo,alt='',loading='lazy'}: EditorialMediaProps): ReactElement {
  const reducedMotion = useReducedMotion();
  if (desktopVideo || mobileVideo) {
    return <video muted loop playsInline autoPlay={!reducedMotion} disablePictureInPicture controls={false} preload={loading === 'eager' ? 'auto' : 'metadata'} aria-hidden={alt ? undefined : true}>
      {mobileVideo ? <source media="(max-width: 699px)" src={mobileVideo} type={videoType(mobileVideo)} /> : null}
      {desktopVideo ? <source src={desktopVideo} type={videoType(desktopVideo)} /> : null}
    </video>;
  }
  return <picture>{mobileMedia ? <source media="(max-width: 699px)" srcSet={mobileMedia} /> : null}<img src={desktopMedia} alt={alt} width="1600" height="1067" loading={loading} decoding="async" /></picture>;
}
