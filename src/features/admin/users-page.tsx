'use client';

import { useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status';
import { useAuth } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api/client';
import { formatTimestamp, relativeTime } from '@/lib/format';
import { useUpdateUser, useUsers } from './hooks';

const ROLES = ['VIEWER', 'ANALYST', 'ADMIN'] as const;

export function UsersPage() {
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const { data, error, isLoading, refetch } = useUsers(page);
  const update = useUpdateUser();
  const failure =
    update.error instanceof ApiError
      ? update.error.message
      : update.error
        ? 'Could not update the user.'
        : null;
  const th =
    'px-3 py-2 text-left font-label-mono text-label-mono font-medium uppercase text-outline';

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in, and what they may do. Changes take effect immediately."
      />
      {failure && (
        <p role="alert" className="mb-4 rounded-lg bg-error-container/40 p-3 text-error">
          {failure}
        </p>
      )}
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading users">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.data.length === 0 && <EmptyState title="No users" />}
        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-body-dense">
                <caption className="sr-only">Users</caption>
                <thead>
                  <tr className="bg-surface-container-lowest">
                    <th scope="col" className={th}>
                      Email
                    </th>
                    <th scope="col" className={th}>
                      Role
                    </th>
                    <th scope="col" className={th}>
                      Status
                    </th>
                    <th scope="col" className={th}>
                      Last sign-in
                    </th>
                    <th scope="col" className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id} className="border-t border-outline-variant/20">
                        <td className="px-3 py-3">
                          {u.email}
                          {self && <span className="ml-2 text-on-surface-variant">(you)</span>}
                        </td>
                        <td className="px-3 py-3">
                          <label className="sr-only" htmlFor={`role-${u.id}`}>
                            Role for {u.email}
                          </label>
                          <select
                            id={`role-${u.id}`}
                            value={u.role}
                            disabled={self || update.isPending}
                            title={self ? 'You cannot change your own role' : undefined}
                            onChange={(e) => update.mutate({ id: u.id, role: e.target.value })}
                            className="h-9 rounded-lg bg-surface-container-lowest px-2 disabled:opacity-60"
                          >
                            {ROLES.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            status={u.isActive ? 'RESOLVED' : 'OPEN'}
                            className="[&]:capitalize"
                          />
                          <span className="sr-only">{u.isActive ? ' active' : ' deactivated'}</span>
                        </td>
                        <td
                          className="whitespace-nowrap px-3 py-3 text-on-surface-variant"
                          title={
                            u.lastLoginAt ? `${formatTimestamp(u.lastLoginAt)} UTC` : undefined
                          }
                        >
                          {u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'never'}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Button
                            disabled={self || update.isPending}
                            title={self ? 'You cannot deactivate yourself' : undefined}
                            onClick={() => update.mutate({ id: u.id, isActive: !u.isActive })}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              {...data.pagination}
              pageSizes={[25]}
              noun="users"
              onPage={setPage}
              onPageSize={() => undefined}
            />
          </>
        )}
      </section>
    </>
  );
}
