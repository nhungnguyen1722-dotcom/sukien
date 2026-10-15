export const DEFAULT_TRAINING_TOKEN_RATE = 5000;

export function normalizeTrainingTokenRate(value: unknown): number {
  const rate = Number(value);
  return Number.isSafeInteger(rate) && rate > 0 ? rate : DEFAULT_TRAINING_TOKEN_RATE;
}
