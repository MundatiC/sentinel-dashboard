import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import {
  adminUserListSchema,
  apiKeyCreatedSchema,
  apiKeyListSchema,
  auditListSchema,
  ruleListSchema,
  ruleResponseSchema,
} from '@/lib/api/schemas';

export function useUsers(page: number, pageSize = 25) {
  return useQuery({
    queryKey: ['admin', 'users', page, pageSize],
    queryFn: ({ signal }) =>
      apiFetch('/users', { query: { page, pageSize }, schema: adminUserListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: string; isActive?: boolean }) =>
      apiFetch(`/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: ({ signal }) =>
      apiFetch('/api-keys', { schema: apiKeyListSchema, signal }).then((r) => r.data),
  });
}

export function useCreateApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; scopes: string[]; expiresAt?: string }) =>
      apiFetch('/api-keys', { method: 'POST', body, schema: apiKeyCreatedSchema }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'api-keys'] }),
  });
}

export function useRevokeApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'api-keys'] }),
  });
}

export function useRules() {
  return useQuery({
    queryKey: ['admin', 'rules'],
    queryFn: ({ signal }) =>
      apiFetch('/alert-rules', { schema: ruleListSchema, signal }).then((r) => r.data),
  });
}

export interface RuleInput {
  name: string;
  description: string;
  enabled: boolean;
  eventType: string;
  groupBy: 'IP' | 'ACTOR' | 'SOURCE';
  threshold: number;
  windowSeconds: number;
  severity: string;
  cooldownSeconds: number;
}

export function useSaveRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Partial<RuleInput>) =>
      apiFetch(id ? `/alert-rules/${id}` : '/alert-rules', {
        method: id ? 'PATCH' : 'POST',
        body,
        schema: ruleResponseSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'rules'] }),
  });
}

export function useDeleteRule() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/alert-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'rules'] }),
  });
}

export function useAudit(params: { action?: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['admin', 'audit', params],
    queryFn: ({ signal }) =>
      apiFetch('/audit-logs', { query: params, schema: auditListSchema, signal }),
    placeholderData: keepPreviousData,
  });
}
