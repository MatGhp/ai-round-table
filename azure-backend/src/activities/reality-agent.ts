import { InvocationContext } from '@azure/functions';
import { callAgentWithRetry } from '../lib/openai-client';
import { REALITY_CHECKER_PROMPT, buildUserPrompt } from '../prompts/agents';

/**
 * Reality Checker Agent Output Schema
 */
interface RealityCheckerOutput {
  assumptions: string[];      // Validated/challenged assumptions
  testable_claims: string[];  // 2-4 claims that can be tested
  failure_points: string[];   // 2-4 ways this could fail
  message: string;            // Conversational message (max 700 chars)
}

/**
 * Conversation Turn Structure
 */
interface ConversationTurn {
  turn_number: number;
  agent_id: string;
  agent_name: string;
  message: string;
  structured_output: Record<string, any>;
  model_id?: string;
  model_version?: string;
}

/**
 * Reality Checker Agent Activity Input
 */
interface RealityCheckerInput {
  ideaText: string;
  conversation: ConversationTurn[];
}

/**
 * Reality Checker Agent Activity
 * 
 * Challenges assumptions and identifies failure points:
 * - Validates or challenges Refiner's assumptions
 * - Identifies testable claims
 * - Articulates specific failure points and risks
 * 
 * This is the second agent in the pipeline.
 */
export async function realityCheckerAgent(
  input: RealityCheckerInput,
  context: InvocationContext
): Promise<ConversationTurn> {
  context.log('RealityCheckerAgent: Starting analysis');

  const userPrompt = buildUserPrompt(input.ideaText, input.conversation);

  try {
    const result = await callAgentWithRetry<RealityCheckerOutput>({
      systemPrompt: REALITY_CHECKER_PROMPT,
      userPrompt,
      temperature: 0.3,
      maxTokens: 2000,
      context,
    }, 3);

    context.log('RealityCheckerAgent: Analysis complete');
    context.log(`Testable claims: ${result.testable_claims.length}`);
    context.log(`Failure points: ${result.failure_points.length}`);

    // Ensure message length constraint
    const message = result.message.length > 700
      ? result.message.substring(0, 697) + '...'
      : result.message;

    return {
      turn_number: input.conversation.length + 1,
      agent_id: 'reality_checker',
      agent_name: 'Reality Checker',
      message,
      structured_output: {
        assumptions: result.assumptions,
        testable_claims: result.testable_claims,
        failure_points: result.failure_points,
      },
      model_id: 'gpt-4',
      model_version: '2024-turbo',
    };
  } catch (error) {
    context.error('RealityCheckerAgent: Failed', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`RealityCheckerAgent failed: ${errorMessage}`);
  }
}
