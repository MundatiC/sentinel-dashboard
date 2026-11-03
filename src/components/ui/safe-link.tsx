import { ExternalLink } from 'lucide-react';

/** True only for absolute http(s) URLs. Anything else ("javascript:", "data:", relative paths) is refused. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// Reference links come from scan results, i.e. from data we do not control. Only real web links become
// clickable; everything else is shown as inert text. noopener/noreferrer stop the opened page from
// getting a handle on this one.
export function SafeLink({ href, className }: { href: string; className?: string }) {
  if (!isSafeHttpUrl(href)) return <span className={className}>{href}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ?? 'inline-flex items-center gap-1 break-all text-primary hover:underline'
      }
    >
      {href.replace(/^https?:\/\//, '')}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
