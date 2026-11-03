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

// ---------- events ----------

export const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: severitySchema,
  source: z.string(),
  actor: z.string().nullable(),
  ip: z.string().nullable(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  occurredAt: z.string(),
  receivedAt: z.string(),
});
export type ApiEvent = z.infer<typeof eventSchema>;

export const eventListSchema = z.object({
  data: z.array(eventSchema),
  pagination: paginationSchema,
});
export const eventDetailSchema = z.object({ event: eventSchema });

export const statsBucketSchema = z.object({
  bucket: z.string(),
  INFO: z.number(),
  LOW: z.number(),
  MEDIUM: z.number(),
  HIGH: z.number(),
  CRITICAL: z.number(),
  total: z.number(),
});
export type StatsBucket = z.infer<typeof statsBucketSchema>;
export const eventStatsSchema = z.object({
  from: z.string(),
  to: z.string(),
  bucket: z.enum(['hour', 'day']),
  data: z.array(statsBucketSchema),
});

// ---------- alerts ----------

export const alertStatusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);
export type AlertStatus = z.infer<typeof alertStatusSchema>;

export const alertSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  status: alertStatusSchema,
  severity: severitySchema,
  title: z.string(),
  groupKey: z.string(),
  eventCount: z.number(),
  firstEventAt: z.string(),
  lastEventAt: z.string(),
  assigneeId: z.string().nullable(),
  incidentId: z.string().nullable().optional(),
  createdAt: z.string(),
  rule: z.object({ name: z.string() }).optional(),
});
export type ApiAlert = z.infer<typeof alertSchema>;
export const alertListSchema = z.object({
  data: z.array(alertSchema),
  pagination: paginationSchema,
});

// ---------- incidents ----------

export const incidentStatusSchema = z.enum(['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED']);
export const incidentSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: incidentStatusSchema,
  severity: severitySchema,
  createdAt: z.string(),
  alertCount: z.number(),
});
export const incidentListSchema = z.object({
  data: z.array(incidentSummarySchema),
  pagination: paginationSchema,
});

// ---------- alert detail ----------

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  eventType: z.string(),
  groupBy: z.enum(['IP', 'ACTOR', 'SOURCE']),
  threshold: z.number(),
  windowSeconds: z.number(),
  severity: severitySchema,
  cooldownSeconds: z.number(),
});
export type ApiRule = z.infer<typeof ruleSchema>;
export const ruleListSchema = z.object({ data: z.array(ruleSchema) });

export const alertDetailSchema = z.object({
  alert: alertSchema.extend({
    incidentId: z.string().nullable(),
    acknowledgedAt: z.string().nullable(),
    resolvedAt: z.string().nullable(),
    rule: ruleSchema,
    events: z.array(eventSchema),
  }),
});
export const alertUpdateSchema = z.object({ alert: alertSchema });

// ---------- incident detail ----------

export const timelineEntrySchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  kind: z.enum(['NOTE', 'STATUS_CHANGE', 'ALERT_LINKED']),
  body: z.string(),
  author: z.object({ id: z.string(), email: z.string() }).nullable(),
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

export const incidentDetailSchema = z.object({
  incident: z.object({
    id: z.string(),
    title: z.string(),
    status: incidentStatusSchema,
    severity: severitySchema,
    summary: z.string(),
    createdAt: z.string(),
    resolvedAt: z.string().nullable(),
    timeline: z.array(timelineEntrySchema),
    alerts: z.array(alertSchema.extend({ ruleName: z.string() })),
  }),
});
export type IncidentDetail = z.infer<typeof incidentDetailSchema>['incident'];

// ---------- scans ----------

export const scanCategorySchema = z.enum([
  'HEADERS',
  'COOKIES',
  'TLS',
  'EXPOSED_FILES',
  'DEPENDENCIES',
]);
export type ScanCategory = z.infer<typeof scanCategorySchema>;

const severityCounts = z
  .object({
    INFO: z.number(),
    LOW: z.number(),
    MEDIUM: z.number(),
    HIGH: z.number(),
    CRITICAL: z.number(),
  })
  .partial();
export const scanSummarySchema = z.object({
  id: z.string(),
  target: z.string(),
  scannerVersion: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  summary: severityCounts,
  createdAt: z.string(),
});
export const scanListSchema = z.object({
  data: z.array(scanSummarySchema),
  pagination: paginationSchema,
});

export const findingSchema = z.object({
  id: z.string(),
  checkId: z.string(),
  category: scanCategorySchema,
  severity: severitySchema,
  title: z.string(),
  description: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  remediation: z.string(),
  references: z.array(z.string()),
});
export type ApiFinding = z.infer<typeof findingSchema>;
export const scanDetailSchema = z.object({
  scan: scanSummarySchema.extend({ findings: z.array(findingSchema) }),
});
