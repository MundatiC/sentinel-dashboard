import { HEAD_ROW, Th } from '@/components/data/table';
import { SeverityBadge } from '@/components/ui/severity';
import { cn } from '@/lib/cn';
import { formatTimestamp } from '@/lib/format';
import type { ApiEvent } from '@/lib/api/schemas';

// SECURITY: event fields (message, actor, source...) come from logs and are controlled by whoever
// triggered the event. React renders them as TEXT, so "<script>" is shown, never executed. Keep it that
// way: never use dangerouslySetInnerHTML for anything that came from the API.
export function EventsTable({
  events,
  selectedId,
  onSelect,
  busy,
}: {
  events: ApiEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  busy?: boolean;
}) {
  return (
    <div
      className={cn('overflow-x-auto transition-opacity', busy && 'opacity-60')}
      aria-busy={busy}
    >
      <table className="w-full min-w-[56rem] text-body-dense">
        <caption className="sr-only">
          Security events, newest first by default. Select a time to open the event details.
        </caption>
        <thead>
          <tr className={HEAD_ROW}>
            <Th>Time (UTC)</Th>
            <Th>Severity</Th>
            <Th>Event type</Th>
            <Th>Source</Th>
            <Th>Actor</Th>
            <Th>IP</Th>
            <Th>Message</Th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const selected = event.id === selectedId;
            return (
              <tr
                key={event.id}
                onClick={() => onSelect(event.id)}
                className={cn(
                  'cursor-pointer border-t border-outline-variant/20 hover:bg-surface-container',
                  selected && 'bg-surface-container-high',
                )}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-code-default text-code-default">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(event.id);
                    }}
                    aria-current={selected ? 'true' : undefined}
                    className="text-primary hover:underline"
                  >
                    {formatTimestamp(event.occurredAt, true)}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <SeverityBadge severity={event.severity} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm">
                    {event.type}
                  </span>
                </td>
                <td className="max-w-[10rem] truncate px-3 py-2.5" title={event.source}>
                  {event.source}
                </td>
                <td
                  className="max-w-[8rem] truncate px-3 py-2.5 text-on-surface-variant"
                  title={event.actor ?? undefined}
                >
                  {event.actor ?? '–'}
                </td>
                <td className="px-3 py-2.5 font-code-sm text-code-sm">{event.ip ?? '–'}</td>
                <td
                  className="max-w-xs truncate px-3 py-2.5 text-on-surface-variant"
                  title={event.message}
                >
                  {event.message}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
