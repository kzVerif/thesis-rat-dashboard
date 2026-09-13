import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string(), user_id: z.string().nullable(), username: z.string().nullable(),
  display_name: z.string().nullable(), action: z.string(), target_agent_id: z.string().nullable(),
  agent_hostname: z.string().nullable(), detail: z.record(z.string(), z.unknown()).nullable(),
  ip_address: z.string().nullable(), created_at: z.string(),
});
export const logsResponseSchema = z.object({
  logs: z.array(auditLogSchema),
  pagination: z.object({ page: z.number().int().positive(), limit: z.number().int().min(1).max(100), total: z.number().int().nonnegative(), total_pages: z.number().int().nonnegative() }),
});
export const logsQuerySchema = z.object({
  page: z.number().int().positive(), limit: z.number().int().min(1).max(100),
  user_id: z.union([z.literal(""), z.uuid()]), target_agent_id: z.union([z.literal(""), z.uuid()]),
  action: z.string(), from: z.union([z.literal(""), z.iso.datetime({ offset: true })]), to: z.union([z.literal(""), z.iso.datetime({ offset: true })]),
}).refine(value => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to));
export type AuditLog = z.infer<typeof auditLogSchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type LogsResponse = z.infer<typeof logsResponseSchema>;
export type AuditLogsSnapshot = { data: LogsResponse | null; error: string | null; query: LogsQuery };
