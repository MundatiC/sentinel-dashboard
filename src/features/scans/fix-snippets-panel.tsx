'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { PLATFORMS, PLATFORM_LABEL, snippetsFor, type Platform } from './fix-snippets';

/** "How do I fix it on my stack?": pick a platform, copy the snippet. */
export function FixSnippetsPanel({ checkId }: { checkId: string }) {
  const snippets = snippetsFor(checkId);
  const available = PLATFORMS.filter((p) => snippets?.[p]);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);
  if (!snippets || available.length === 0) return null;

  const current = platform && snippets[platform] ? platform : available[0]!;
  const code = snippets[current]!;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (insecure context, permissions): the text stays selectable.
    }
  }

  return (
    <div>
      <p className="mb-1 text-label-default text-on-surface-variant">Fix it on your stack</p>
      <div role="group" aria-label="Platform" className="mb-2 flex flex-wrap gap-1.5">
        {available.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={p === current}
            onClick={() => setPlatform(p)}
            className={cn(
              'min-h-9 rounded-lg px-3 text-label-default',
              p === current
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface',
            )}
          >
            {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>
      <div className="relative">
        <pre
          tabIndex={0}
          aria-label={`${PLATFORM_LABEL[current]} snippet`}
          className="max-h-60 overflow-auto rounded-lg bg-surface-container-lowest p-3 pr-24 font-code-sm text-code-sm text-primary"
        >
          {code}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="absolute right-2 top-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-surface-container-highest px-3 text-label-default hover:text-on-surface"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span role="status" className="sr-only">
          {copied ? 'Snippet copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
}
