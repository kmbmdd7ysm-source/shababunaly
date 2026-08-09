import { trackEvent } from './analytics.ts';

export async function share({
  title,
  text,
  url,
  method,
}: {
  title?: string;
  text?: string;
  url?: string;
  method?: string;
}): Promise<boolean> {
  trackEvent('share', { method, title });
  if (method === 'native' && navigator.share) {
    const data: ShareData = {};
    if (title) data.title = title;
    if (text) data.text = text;
    if (url) data.url = url;
    await navigator.share(data);
    return true;
  }
  if (method === 'copy' && url) {
    await navigator.clipboard.writeText(url);
    return true;
  }
  if (method === 'whatsapp')
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'facebook' && url)
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'x' && url)
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(String(title || ''))}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'email')
    window.location.href = `mailto:?subject=${encodeURIComponent(String(title || ''))}&body=${encodeURIComponent(`${text}\n${url}`)}`;
  return true;
}
