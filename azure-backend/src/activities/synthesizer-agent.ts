import { InvocationContext } from '@azure/functions';
import { callAgentWithRetry } from '../lib/openai-client';
import { SYNTHESIZER_PROMPT, buildUserPrompt } from '../prompts/agents';

/**
 * Synthesizer Agent Output Schema
 */
interface SynthesizerOutput {
  constrained_version: string;  // MVP recommendation
  open_risks: string[];         // 2-4 unresolved risks
  recommendation: 'RESEARCH_FIRST' | 'PROCEED' | 'STOP' | 'PIVOT';
  message: string;              // Conversational message (max 700 chars)
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
 * Synthesizer Agent Activity Input
 */
interface SynthesizerInput {
  ideaText: string;
  conversation: ConversationTurn[];
}

/**
 * Synthesizer Agent Activity
 * 
 * Creates final recommendation from all agent outputs:
 * - Proposes constrained MVP version
 * - Identifies remaining open risks
 * - Makes clear recommendation (RESEARCH_FIRST/PROCEED/STOP/PIVOT)
 * 
 * This is the fifth and final agent in the pipeline.
 * Only runs if Assassin did NOT veto.
 */
export async function synthesizerAgent(
  input: SynthesizerInput,
  context: InvocationContext
): Promise<ConversationTurn> {
  context.log('SynthesizerAgent: Starting analysis');

  const userPrompt = buildUserPrompt(input.ideaText, input.conversation);

  try {
    const result = await callAgentWithRetry<SynthesizerOutput>({
      systemPrompt: SYNTHESIZER_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 2000,
      context,
    }, 3);

    context.log('SynthesizerAgent: Analysis complete');
    context.log(`Final recommendation: ${result.recommendation}`);
    context.log(`Open risks count: ${result.open_risks.length}`);

    // Ensure message length constraint
    const message = result.message.length > 700
      ? result.message.substring(0, 697) + '...'
      : result.message;

    return {
      turn_number: input.conversation.length + 1,
      agent_id: 'synthesizer',
      agent_name: 'Synthesizer',
      message,
      structured_output: {
        constrained_version: result.constrained_version,
        open_risks: result.open_risks,
        recommendation: result.recommendation,
      },
      model_id: 'gpt-4',
      model_version: '2024-turbo',
    };
  } catch (error) {
    context.error('SynthesizerAgent: Failed', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SynthesizerAgent failed: ${errorMessage}`);
  }
}
