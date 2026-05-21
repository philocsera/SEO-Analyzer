export type ModelId =
  | "anthropic/claude-opus-4-7"
  | "anthropic/claude-sonnet-4-6"
  | "anthropic/claude-haiku-4-5"
  | "openai/gpt-5"
  | "openai/gpt-5-mini"
  | "google/gemini-2.5-flash";

export type ModelPrice = {
  inputPerM: number;
  outputPerM: number;
  label: string;
};

export const PRICING: Record<ModelId, ModelPrice> = {
  "anthropic/claude-opus-4-7": {
    inputPerM: 15,
    outputPerM: 75,
    label: "Claude Opus 4.7",
  },
  "anthropic/claude-sonnet-4-6": {
    inputPerM: 3,
    outputPerM: 15,
    label: "Claude Sonnet 4.6",
  },
  "anthropic/claude-haiku-4-5": {
    inputPerM: 1,
    outputPerM: 5,
    label: "Claude Haiku 4.5",
  },
  "openai/gpt-5": {
    inputPerM: 1.25,
    outputPerM: 10,
    label: "GPT-5",
  },
  "openai/gpt-5-mini": {
    inputPerM: 0.25,
    outputPerM: 2,
    label: "GPT-5 mini",
  },
  "google/gemini-2.5-flash": {
    inputPerM: 0.3,
    outputPerM: 2.5,
    label: "Gemini 2.5 Flash",
  },
};

export const DEFAULT_REVIEW_MODEL: ModelId = "anthropic/claude-sonnet-4-6";
export const DEFAULT_VERIFICATION_MODELS: ModelId[] = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-5",
];

export const TOKEN_BUDGET = {
  review: { input: 8000, output: 2000 },
  verificationPerQuestion: { input: 300, output: 1500 },
  verificationQuestionsPerModel: 3,
} as const;
