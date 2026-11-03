import { z } from 'zod';

// The API's OpenAPI document describes requests but not responses, so we describe the responses here and
// VALIDATE every one at runtime. Data from the network is untrusted: if the API (or something in
// between) sends an unexpected shape, we fail loudly here instead of crashing a component later.

export const roleSchema = z.enum(['VIEWER', 'ANALYST', 'ADMIN']);
export const severitySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const sessionSchema = z.object({ accessToken: z.string(), user: userSchema });
export type Session = z.infer<typeof sessionSchema>;

export const meSchema = z.object({ user: userSchema });

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
