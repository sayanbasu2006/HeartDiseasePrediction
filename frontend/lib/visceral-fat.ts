import { z } from "zod";

export const visceralFatEffectSchema = z.object({
  index: z.number().finite().nonnegative(),
  reference_index: z.number().finite().nonnegative(),
  reference_score: z.number().min(0).max(1),
  submitted_score: z.number().min(0).max(1),
  difference: z.number().min(-1).max(1),
  development_range: z.tuple([z.number().finite(), z.number().finite()]),
  reference_count: z.number().int().positive(),
  curve: z.array(
    z.object({ index: z.number().finite(), score: z.number().min(0).max(1) }),
  ),
  method: z.string(),
});

export type VisceralFatEffect = z.infer<typeof visceralFatEffectSchema>;
export type VisceralFatAssessment = {
  measurements: Record<string, number | null>;
  visceral_fat_effect?: VisceralFatEffect;
  synthetic?: boolean;
};

export function formatFatDifference(difference: number) {
  const points = Math.round(difference * 10_000) / 100;
  return `${points > 0 ? "+" : ""}${points.toFixed(2)}`;
}
