import { InvocationContext } from '@azure/functions';
import { callAgentWithRetry } from '../lib/openai-client';
import { REFINER_PROMPT, buildUserPrompt } from '../prompts/agents';

/**
 * Refiner Agent Output Schema
 */
interface RefinerOutput {
  problem_statement: string;  // Max 200 chars
  assumptions: string[];      // 2-5 items
  proposed_solution: string;  // Max 300 chars
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
 * Refiner Agent Activity Input
 */
interface RefinerInput {
  ideaText: string;
  conversation: ConversationTurn[];
}

/**
 * Refiner Agent Activity
 * 
 * Transforms raw user input into structured analysis:
 * - Extracts core problem statement
 * - Identifies assumptions
 * - Articulates proposed solution
 * 
 * This is the first agent in the pipeline.
 */
export async function refinerAgent(
  input: RefinerInput,
  context: InvocationContext
): Promise<ConversationTurn> {
  context.log('RefinerAgent: Starting analysis');
  context.log(`Idea length: ${input.ideaText.length} characters`);

  const userPrompt = buildUserPrompt(input.ideaText, input.conversation);

  try {
    const result = await callAgentWithRetry<RefinerOutput>({
      systemPrompt: REFINER_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 2000,
      context,
    }, 3);

    context.log('RefinerAgent: Analysis complete');
    context.log(`Problem statement: ${result.problem_statement.substring(0, 100)}...`);
    context.log(`Assumptions count: ${result.assumptions.length}`);

    // Ensure message length constraint
    const message = result.message.length > 700
      ? result.message.substring(0, 697) + '...'
      : result.message;

    return {
      turn_number: input.conversation.length + 1,
      agent_id: 'refiner',
      agent_name: 'Refiner',
      message,
      structured_output: {
        problem_statement: result.problem_statement,
        assumptions: result.assumptions,
        proposed_solution: result.proposed_solution,
      },
      model_id: 'gpt-4',
      model_version: '2024-turbo',
    };
  } catch (error) {
    context.error('RefinerAgent: Failed', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`RefinerAgent failed: ${errorMessage}`);
  }
}
