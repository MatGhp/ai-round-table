import { InvocationContext } from '@azure/functions';
import { callAgentWithRetry } from '../lib/openai-client';
import { COST_ANALYST_PROMPT, buildUserPrompt } from '../prompts/agents';

/**
 * Cost Analyst Agent Output Schema
 */
interface CostOutput {
  implementation_cost: string;  // Low/Medium/High + explanation
  maintenance_cost: string;     // Low/Medium/High + explanation
  operational_risk: string;     // Low/Medium/High + explanation
  cognitive_load: string;       // Low/Medium/High + explanation
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
 * Cost Analyst Agent Activity Input
 */
interface CostInput {
  ideaText: string;
  conversation: ConversationTurn[];
}

/**
 * Cost Analyst Agent Activity
 * 
 * Evaluates implementation costs and risks:
 * - Implementation cost (what's needed to build)
 * - Maintenance cost (ongoing burden)
 * - Operational risk (production failure modes)
 * - Cognitive load (complexity for users/developers)
 * 
 * This is the fourth agent in the pipeline.
 * Only runs if Assassin did NOT veto.
 */
export async function costAnalystAgent(
  input: CostInput,
  context: InvocationContext
): Promise<ConversationTurn> {
  context.log('CostAnalystAgent: Starting analysis');

  const userPrompt = buildUserPrompt(input.ideaText, input.conversation);

  try {
    const result = await callAgentWithRetry<CostOutput>({
      systemPrompt: COST_ANALYST_PROMPT,
      userPrompt,
      temperature: 0.2,
      maxTokens: 2000,
      context,
    }, 3);

    context.log('CostAnalystAgent: Analysis complete');
    context.log(`Implementation: ${result.implementation_cost?.split(':')[0] || 'MISSING'}`);
    context.log(`Maintenance: ${result.maintenance_cost?.split(':')[0] || 'MISSING'}`);
    context.log(`Operational risk: ${result.operational_risk?.split(':')[0] || 'MISSING'}`);

    // Ensure message length constraint
    // If message is missing, create one from the structured output
    const messageText = result.message ||
      `Cost analysis complete. Implementation: ${result.implementation_cost}, Maintenance: ${result.maintenance_cost}, Risk: ${result.operational_risk}`;

    const message = messageText.length > 700
      ? messageText.substring(0, 697) + '...'
      : messageText;

    return {
      turn_number: input.conversation.length + 1,
      agent_id: 'cost',
      agent_name: 'Cost Analyst',
      message,
      structured_output: {
        implementation_cost: result.implementation_cost,
        maintenance_cost: result.maintenance_cost,
        operational_risk: result.operational_risk,
        cognitive_load: result.cognitive_load,
      },
      model_id: 'gpt-4',
      model_version: '2024-turbo',
    };
  } catch (error) {
    context.error('CostAnalystAgent: Failed', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`CostAnalystAgent failed: ${errorMessage}`);
  }
}
