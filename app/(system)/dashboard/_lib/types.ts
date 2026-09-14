import { z } from "zod";

const countSchema = z.record(z.string(), z.number().int().nonnegative());
export const dashboardSchema = z.object({
  generated_at: z.string(), agents: countSchema, rooms: z.object({ total: z.number().int().nonnegative() }), users: countSchema,
  tokens: countSchema, files: z.object({ total: z.number().int().nonnegative(), total_bytes: z.number().nonnegative() }),
  antivirus: countSchema, file_distributions: countSchema, activity: z.object({ last_24_hours: z.number().int().nonnegative() }),
});
export type DashboardData = z.infer<typeof dashboardSchema>;
export type DashboardSnapshot = { data: DashboardData | null; error: string | null };
