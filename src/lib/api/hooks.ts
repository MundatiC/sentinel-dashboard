import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toApiQuery, type EventFilters } from '@/features/events/filters';
import { apiFetch } from './client';
import {
  alertListSchema,
  eventDetailSchema,
  eventListSchema,
  eventStatsSchema,
  incidentListSchema,
} from './schemas';

export function useEvents(filters: EventFilters) {
  return useQuery({
    // The key holds the UI filters (stable); "from" is computed fresh when the request is actually made.
    queryKey: ['events', filters],
    queryFn: ({ signal }) =>
      apiFetch('/events', { query: toApiQuery(filters), schema: eventListSchema, signal }),
    placeholderData: keepPreviousData, // keep showing the previous page while the next one loads
  });
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ['event', id],
    enabled: Boolean(id),
    queryFn: ({ signal }) =>
      apiFetch(`/events/${id}`, { schema: eventDetailSchema, signal }).then((r) => r.event),
  });
}

export function useEventStats(hours = 24) {
  return useQuery({
    queryKey: ['event-stats', hours],
    queryFn: ({ signal }) =>
      apiFetch('/events/stats', {
        query: { from: new Date(Date.now() - hours * 3_600_000).toISOString(), bucket: 'hour' },
        schema: eventStatsSchema,
        signal,
      }),
    refetchInterval: 60_000,
  });
}

/** Total number of alerts with the given status/severity (asks for a page of 1 and reads the total). */
export function useAlertCount(params: { status?: string; severity?: string }) {
  return useQuery({
    queryKey: ['alert-count', params],
    queryFn: ({ signal }) =>
      apiFetch('/alerts', {
        query: { ...params, pageSize: 1 },
        schema: alertListSchema,
        signal,
      }).then((r) => r.pagination.total),
    refetchInterval: 30_000,
  });
}

export function useRecentAlerts(limit = 5) {
  return useQuery({
    queryKey: ['alerts', 'recent', limit],
    queryFn: ({ signal }) =>
      apiFetch('/alerts', {
        query: { status: 'OPEN,ACKNOWLEDGED', pageSize: limit },
        schema: alertListSchema,
        signal,
      }),
    refetchInterval: 30_000,
  });
}

export function useIncidentCount(status: string) {
  return useQuery({
    queryKey: ['incident-count', status],
    queryFn: ({ signal }) =>
      apiFetch('/incidents', {
        query: { status, pageSize: 1 },
        schema: incidentListSchema,
        signal,
      }).then((r) => r.pagination.total),
    refetchInterval: 30_000,
  });
}
