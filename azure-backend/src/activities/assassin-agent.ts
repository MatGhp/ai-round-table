import { InvocationContext } from '@azure/functions';
import { callAgentWithRetry } from '../lib/openai-client';
import { ASSASSIN_PROMPT, buildUserPrompt } from '../prompts/agents';

/**
 * Assassin Agent Output Schema
 */
interface AssassinOutput {
  veto: boolean;
  kill_reason?: string;  // Required if veto=true
  failure_mode?: 'no_real_user' | 'simpler_solution_exists' | 'unjustified_complexity' 
                 | 'unsound_assumptions' | 'economic_nonviability';
  message: string;       // Conversational message (max 700 chars)
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
 * Assassin Agent Activity Input
 */
interface AssassinInput {
  ideaText: string;
  conversation: ConversationTurn[];
}

/**
 * Assassin Agent Activity
 * 
 * Decides if the idea should be killed:
 * - Reviews Refiner's structure and Reality Checker's challenges
 * - Has veto power to terminate evaluation
 * - Issues veto only for fundamentally flawed ideas
 * 
 * This is the third agent in the pipeline.
 * If veto=true, the orchestrator terminates early.
 */
export async function assassinAgent(
  input: AssassinInput,
  context: InvocationContext
): Promise<ConversationTurn> {
  context.log('AssassinAgent: Starting analysis');

  const userPrompt = buildUserPrompt(input.ideaText, input.conversation);

  try {
    const result = await callAgentWithRetry<AssassinOutput>({
      systemPrompt: ASSASSIN_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 1500,
      context,
    }, 3);

    context.log('AssassinAgent: Analysis complete');
    context.log(`Veto decision: ${result.veto}`);
    if (result.veto) {
      context.warn(`Veto issued: ${result.failure_mode} - ${result.kill_reason}`);
    }

    // Ensure message length constraint
    const message = result.message.length > 700
      ? result.message.substring(0, 697) + '...'
      : result.message;

    return {
      turn_number: input.conversation.length + 1,
      agent_id: 'assassin',
      agent_name: 'Assassin',
      message,
      structured_output: {
        veto: result.veto,
        kill_reason: result.kill_reason,
        failure_mode: result.failure_mode,
      },
      model_id: 'gpt-4',
      model_version: '2024-turbo',
    };
  } catch (error) {
    context.error('AssassinAgent: Failed', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`AssassinAgent failed: ${errorMessage}`);
  }
}
