import { z } from "zod";

export const workspaceStorageKey = "cardiolens-workspace-v1";

const numbers = z.record(z.string(), z.number());
const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const record = z.record(z.string(), cell);

const assessment = z.looseObject({
  timestamp: z.string(),
  predicted_class: z.union([z.literal(0), z.literal(1)]),
  label: z.string(),
  class_description: z.string(),
  model_score: z.number(),
  disease_class_score: z.number().optional(),
  measurements: z.record(z.string(), z.number().nullable()),
  demonstration: z.boolean().optional(),
  synthetic: z.literal(true).optional(),
  explanation: z
    .looseObject({
      features: z.array(
        z.object({
          feature: z.string(),
          value: z.number(),
          contribution: z.number(),
        }),
      ),
    })
    .nullable(),
});

const uploadDraft = z.object({
  name: z.string(),
  columns: z.array(z.string()),
  rows: z.array(record),
  mapping: z.record(z.string(), z.string()),
  mode: z.enum(["prediction", "monitoring"]),
});

const temporalAnalysis = z.looseObject({
  trends: z.record(
    z.string(),
    z.array(
      z.looseObject({
        time: z.number(),
        observed: z.number(),
        filtered: z.number(),
      }),
    ),
  ),
  hmm: z.discriminatedUnion("available", [
    z.looseObject({ available: z.literal(false), reason: z.string() }),
    z.looseObject({
      available: z.literal(true),
      log_likelihood: z.number(),
      method: z.string(),
      states: z.array(
        z.looseObject({
          state: z.number(),
          label: z.string(),
          mean_heart_rate: z.number(),
          mean_systolic: z.number(),
        }),
      ),
      posterior: z.array(
        z.looseObject({
          time: z.number(),
          state: z.number(),
          label: z.string(),
          state_0: z.number(),
          state_1: z.number(),
        }),
      ),
    }),
  ]),
});

export const workspaceStorageSchema = z.object({
  assessments: z.array(assessment),
  uploads: z.array(z.object({ name: z.string(), rows: z.number() })),
  temporary: z
    .object({ records: z.array(record), analysis: temporalAnalysis })
    .nullable(),
  assessmentDraft: z
    .object({
      values: numbers,
      step: z.number().int().min(0).max(3),
      example: z.boolean(),
      synthetic: z.boolean().optional(),
    })
    .nullable(),
  uploadDraft: uploadDraft.nullable(),
});

export type WorkspaceData = z.infer<typeof workspaceStorageSchema>;
export type UploadDraft = z.infer<typeof uploadDraft>;
