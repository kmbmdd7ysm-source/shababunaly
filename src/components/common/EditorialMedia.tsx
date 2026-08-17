import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

export type OfficialVideoSource =
  | 'nike-winning'
  | 'newbalance-basketball'
  | 'nike-kobe-hard-year'
  | 'nike-only-basketball'
  | 'nike-kobe-conductor'
  | 'jordan-too-easy'
  | 'under-armour-curry-make-that-old'
  | 'newbalance-quiet-noise'
  | 'adidas-basketball-is-everything'
  | 'adidas-ant-20-foot-hoop'
  | 'footlocker-hoops-lives-here'
  | 'footlocker-ant-adidas'
  | 'footlocker-melo-puma';

type EditorialMediaProps = {
  desktopMedia: string;
  mobileMedia?: string;
  desktopVideo?: string;
  mobileVideo?: string;
  officialVideoSource?: OfficialVideoSource;
  alt?: string;
  loading?: 'eager' | 'lazy';
  poster?: string;
};

type ResolvedOfficialMedia = {
  videoUrl?: string;
  embedUrl?: string;
};

function videoType(url: string): string {
  if (/\.webm($|\?)/i.test(url)) return 'video/webm';
  if (/\.m3u8($|\?)/i.test(url)) return 'application/x-mpegURL';
  return 'video/mp4';
}

export default function EditorialMedia({
  desktopMedia,
  mobileMedia,
  desktopVideo,
  mobileVideo,
  officialVideoSource,
  alt = '',
  loading = 'lazy',
  poster,
}: EditorialMediaProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [official, setOfficial] = useState<ResolvedOfficialMedia>({});

  useEffect(() => {
    if (!officialVideoSource || reducedMotion) {
      setOfficial({});
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6500);
    void fetch(`/api/official-media?source=${encodeURIComponent(officialVideoSource)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as ResolvedOfficialMedia;
      })
      .then((payload) => {
        if (!payload) return;
        const videoUrl = /^https:\/\//i.test(String(payload.videoUrl || '')) ? String(payload.videoUrl) : '';
        const embedUrl = /^https:\/\/www\.youtube-nocookie\.com\/embed\//i.test(String(payload.embedUrl || ''))
          ? String(payload.embedUrl)
          : '';
        if (videoUrl || embedUrl) setOfficial({ videoUrl, embedUrl });
      })
      .catch(() => {
        // The official image remains the safe fallback if the source blocks server-side retrieval.
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [officialVideoSource, reducedMotion]);

  const localVideo = mobileVideo || desktopVideo || '';
  const selectedVideo = official.videoUrl || localVideo;
  const selectedEmbed = official.embedUrl || '';
  const hasMotion = !reducedMotion && !failed && Boolean(selectedVideo || selectedEmbed);

  if (hasMotion && selectedEmbed) {
    return (
      <div className="s2-official-video-frame" aria-hidden="true">
        <iframe
          src={selectedEmbed}
          title="Official basketball campaign video"
          tabIndex={-1}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (hasMotion && selectedVideo) {
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
        {official.videoUrl ? (
          <source src={official.videoUrl} type={videoType(official.videoUrl)} />
        ) : (
          <>
            {mobileVideo ? <source media="(max-width: 699px)" src={mobileVideo} type={videoType(mobileVideo)} /> : null}
            {desktopVideo ? <source src={desktopVideo} type={videoType(desktopVideo)} /> : null}
          </>
        )}
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
