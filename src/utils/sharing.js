import { trackEvent } from './analytics';

export async function share({ title, text, url, method }) {
  trackEvent('share', { method, title });
  if (method === 'native' && navigator.share) {
    await navigator.share({ title, text, url });
    return true;
  }
  if (method === 'copy') {
    await navigator.clipboard.writeText(url);
    return true;
  }
  if (method === 'whatsapp')
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'facebook')
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'x')
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  if (method === 'email')
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n${url}`)}`;
  return true;
}
