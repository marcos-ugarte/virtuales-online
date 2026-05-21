import { useEffect, useRef } from 'react';

function parseVendorTs(ts: string | undefined): number | undefined {
  if (!ts) return undefined;
  return Date.parse(ts.replace(' ', 'T') + 'Z');
}

interface Props {
  url: string;
  poster?: string;
  videoStartDt: string;
  clockOffsetMs: number;
  className?: string;
}

export function RaceVideo({
  url,
  poster,
  videoStartDt,
  clockOffsetMs,
  className,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleLoaded = () => {
      const startMs = parseVendorTs(videoStartDt);
      if (startMs === undefined) return;
      const elapsedSec = Math.max(0, (Date.now() + clockOffsetMs - startMs) / 1000);
      if (elapsedSec < el.duration) {
        el.currentTime = elapsedSec;
      }
      el.play().catch(() => {});
    };
    el.addEventListener('loadedmetadata', handleLoaded);
    return () => el.removeEventListener('loadedmetadata', handleLoaded);
  }, [url, videoStartDt, clockOffsetMs]);

  return (
    <video
      ref={ref}
      className={className ?? 'lm-video-el'}
      src={url}
      poster={poster}
      autoPlay
      muted
      playsInline
      controls={false}
    />
  );
}
