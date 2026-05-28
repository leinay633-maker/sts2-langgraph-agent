import { z } from "zod";

export const ExecuteActionRequestSchema = z.object({
  action_id: z.string().min(1)
});

export const SearchKbRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(10).default(5)
});

export const ReadKbSectionRequestSchema = z.object({
  file: z.string().min(1),
  heading: z.string().min(1).optional()
});

export const UpdateRunSummaryRequestSchema = z.object({
  diff: z.record(z.string(), z.unknown())
});
