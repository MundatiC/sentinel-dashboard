import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { toApiQuery, type EventFilters } from '@/features/events/filters';
import { apiFetch } from './client';
import {
  alertDetailSchema,
  alertListSchema,
  alertUpdateSchema,
  eventDetailSchema,
  eventListSchema,
  eventStatsSchema,
  incidentDetailSchema,
  incidentListSchema,
  scanDetailSchema,
  scanListSchema,
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

// ---------- alerts ----------

export function useAlerts(params: {
  status?: string;
  severity?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ['alerts', 'list', params],
    queryFn: ({ signal }) =>
      apiFetch('/alerts', { query: params, schema: alertListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: ({ signal }) =>
      apiFetch(`/alerts/${id}`, { schema: alertDetailSchema, signal }).then((r) => r.alert),
  });
}

/** After anything alert-related changes, refresh every view that shows alerts. */
function refreshAlertViews(client: QueryClient) {
  for (const key of ['alerts', 'alert', 'alert-count', 'incident-count', 'incidents', 'incident']) {
    void client.invalidateQueries({ queryKey: [key] });
  }
}
export { refreshAlertViews };

export function useUpdateAlert(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { status?: 'ACKNOWLEDGED' | 'RESOLVED'; assigneeId?: string | null }) =>
      apiFetch(`/alerts/${id}`, { method: 'PATCH', body, schema: alertUpdateSchema }),
    onSuccess: () => refreshAlertViews(client),
  });
}

// ---------- incidents ----------

export function useIncidents(params: { status?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['incidents', 'list', params],
    queryFn: ({ signal }) =>
      apiFetch('/incidents', { query: params, schema: incidentListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: ['incident', id],
    queryFn: ({ signal }) =>
      apiFetch(`/incidents/${id}`, { schema: incidentDetailSchema, signal }).then(
        (r) => r.incident,
      ),
  });
}

export function useIncidentMutations(id?: string) {
  const client = useQueryClient();
  const done = () => refreshAlertViews(client);
  return {
    create: useMutation({
      mutationFn: (body: {
        title: string;
        severity: string;
        summary?: string;
        alertIds?: string[];
      }) =>
        apiFetch('/incidents', { method: 'POST', body, schema: incidentDetailSchema }).then(
          (r) => r.incident,
        ),
      onSuccess: done,
    }),
    setStatus: useMutation({
      mutationFn: (status: string) =>
        apiFetch(`/incidents/${id}`, {
          method: 'PATCH',
          body: { status },
          schema: incidentDetailSchema,
        }),
      onSuccess: done,
    }),
    addNote: useMutation({
      mutationFn: (body: string) =>
        apiFetch(`/incidents/${id}/timeline`, { method: 'POST', body: { body } }),
      onSuccess: done,
    }),
    linkAlert: useMutation({
      mutationFn: (alertId: string) =>
        apiFetch(`/incidents/${id}/alerts`, {
          method: 'POST',
          body: { alertId },
          schema: incidentDetailSchema,
        }),
      onSuccess: done,
    }),
  };
}

// ---------- scans ----------

export function useScans(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['scans', 'list', page, pageSize],
    queryFn: ({ signal }) =>
      apiFetch('/scans', { query: { page, pageSize }, schema: scanListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useScan(id: string) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: ({ signal }) =>
      apiFetch(`/scans/${id}`, { schema: scanDetailSchema, signal }).then((r) => r.scan),
  });
}
