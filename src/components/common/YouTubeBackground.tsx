import { useEffect, useRef, type ReactElement } from 'react';

type Props = {
  src: string;
  className?: string;
};

export default function YouTubeBackground({ src, className = '' }: Props): ReactElement {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const play = () => {
      const target = frameRef.current?.contentWindow;
      if (!target) return;
      const send = (func: string, args: unknown[] = []) => {
        target.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      };
      send('mute');
      send('playVideo');
      send('setLoop', [true]);
    };

    play();
    const timers = [450, 1200, 2600].map((delay) => globalThis.setTimeout(play, delay));
    const onVisibility = () => { if (document.visibilityState === 'visible') play(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      timers.forEach((timer) => globalThis.clearTimeout(timer));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [src]);

  return (
    <div className={`s2-background-embed ${className}`.trim()} aria-hidden="true">
      <iframe
        ref={frameRef}
        src={src}
        title=""
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        onLoad={() => {
          const target = frameRef.current?.contentWindow;
          if (!target) return;
          target.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
          target.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }}
      />
    </div>
  );
}
