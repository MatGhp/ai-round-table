import { z } from 'zod';

// Run Status Enum
export const RunStatus = z.enum(['INIT', 'IN_PROGRESS', 'COMPLETED', 'VETOED', 'FAILED']);
export type RunStatus = z.infer<typeof RunStatus>;

// Agent IDs
export const AgentId = z.enum(['refiner', 'reality', 'assassin', 'cost', 'synthesizer']);
export type AgentId = z.infer<typeof AgentId>;

// Conversation Turn Schema
export const ConversationTurnSchema = z.object({
  turn_number: z.number().int().positive(),
  agent_id: AgentId,
  agent_name: z.string(),
  conversational_message: z.string().max(700), // Max 700 chars
  structured_output: z.record(z.any()), // JSON object
  timestamp: z.string().datetime(),
  duration_ms: z.number().int().nonnegative(),
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

// Result Schema
export const ResultSchema = z.object({
  recommendation: z.enum(['continue', 'stop', 'pivot']),
  priority: z.enum(['low', 'medium', 'high']),
  viability_score: z.number().min(0).max(10),
  summary: z.string(),
  next_steps: z.array(z.string()).optional(),
});
export type Result = z.infer<typeof ResultSchema>;

// Metadata Schema
export const MetadataSchema = z.object({
  total_duration_ms: z.number().int().nonnegative(),
  agent_count: z.number().int().positive(),
  veto_occurred: z.boolean(),
  openai_model: z.string(),
  openai_total_tokens: z.number().int().nonnegative(),
});
export type Metadata = z.infer<typeof MetadataSchema>;

// Run Document Schema (CosmosDB)
export const RunDocumentSchema = z.object({
  id: z.string(), // Format: run_YYYY-MM-DD_NNNN
  status: RunStatus,
  idea_text: z.string().min(10).max(5000),
  preset_id: z.string().default('default'),
  conversation: z.array(ConversationTurnSchema),
  result: ResultSchema.nullable(),
  metadata: MetadataSchema.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  ttl: z.number().int().default(2592000), // 30 days in seconds
});
export type RunDocument = z.infer<typeof RunDocumentSchema>;

// Preflight Question Schema
export const PreflightQuestionSchema = z.object({
  id: z.string(),
  question: z.string(), // i18n key
  required: z.boolean(),
  default_answers: z.array(z.string()).optional(), // i18n keys
});
export type PreflightQuestion = z.infer<typeof PreflightQuestionSchema>;

// Preflight Response Schema
export const PreflightResponseSchema = z.object({
  preflight_id: z.string(),
  ready: z.boolean(),
  questions: z.array(PreflightQuestionSchema),
});
export type PreflightResponse = z.infer<typeof PreflightResponseSchema>;

// Create Run Request Schema
export const CreateRunRequestSchema = z.object({
  idea_text: z.string().min(10).max(5000),
  preset_id: z.string().default('default'),
  preflight_data: z
    .object({
      preflight_id: z.string(),
      answers: z.record(z.string()),
    })
    .optional(),
});
export type CreateRunRequest = z.infer<typeof CreateRunRequestSchema>;

// Create Run Response Schema
export const CreateRunResponseSchema = z.object({
  run_id: z.string(),
  status: RunStatus,
  created_at: z.string().datetime(),
});
export type CreateRunResponse = z.infer<typeof CreateRunResponseSchema>;

// Agent Structured Output Schemas

// Refiner Agent Output
export const RefinerOutputSchema = z.object({
  core_problem: z.string(),
  target_user: z.string(),
  assumptions: z.array(z.string()),
  constraints: z.array(z.string()),
  success_metrics: z.array(z.string()),
});
export type RefinerOutput = z.infer<typeof RefinerOutputSchema>;

// Reality Checker Output
export const RealityCheckerOutputSchema = z.object({
  concerns: z.array(
    z.object({
      category: z.enum(['technical', 'market', 'resource', 'timing']),
      description: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
  viability_score: z.number().min(0).max(10),
  blockers: z.array(z.string()),
});
export type RealityCheckerOutput = z.infer<typeof RealityCheckerOutputSchema>;

// Assassin Agent Output
export const AssassinOutputSchema = z.object({
  veto: z.boolean(),
  veto_reason: z.string().optional(),
  fatal_flaws: z.array(z.string()),
  recommendation: z.enum(['continue', 'stop', 'pivot']),
});
export type AssassinOutput = z.infer<typeof AssassinOutputSchema>;

// Cost Analyst Output
export const CostAnalystOutputSchema = z.object({
  time_estimate: z.object({
    min_weeks: z.number(),
    max_weeks: z.number(),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  budget_estimate: z.object({
    min_usd: z.number(),
    max_usd: z.number(),
    confidence: z.enum(['low', 'medium', 'high']),
  }),
  team_requirements: z.array(z.string()),
  cost_drivers: z.array(z.string()),
});
export type CostAnalystOutput = z.infer<typeof CostAnalystOutputSchema>;

// Synthesizer Output
export const SynthesizerOutputSchema = z.object({
  recommendation: z.enum(['continue', 'stop', 'pivot']),
  priority: z.enum(['low', 'medium', 'high']),
  viability_score: z.number().min(0).max(10),
  summary: z.string(),
  next_steps: z.array(z.string()),
  decision_confidence: z.enum(['low', 'medium', 'high']),
});
export type SynthesizerOutput = z.infer<typeof SynthesizerOutputSchema>;
