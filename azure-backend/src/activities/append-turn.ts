import { InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { container } from '../lib/cosmos-client';

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
 * Append Turn Input
 */
interface AppendTurnInput {
  runId: string;
  turn: ConversationTurn;
}

/**
 * Append a conversation turn to the run's conversation array in CosmosDB
 */
export async function appendTurn(
  input: AppendTurnInput,
  context: InvocationContext
): Promise<void> {
  const { runId, turn } = input;
  
  context.log(`AppendTurn: Adding turn ${turn.turn_number} (${turn.agent_name}) to run ${runId}`);

  try {
    
    // Add timestamp to turn
    const turnWithTimestamp = {
      ...turn,
      created_at: new Date().toISOString(),
    };

    // Append to conversation array
    const operations = [
      {
        op: 'add' as const,
        path: '/conversation/-',
        value: turnWithTimestamp,
      },
    ];

    await container.item(runId, runId).patch(operations);
    
    context.log(`AppendTurn: Successfully added turn ${turn.turn_number} to ${runId}`);
  } catch (error) {
    context.error(`AppendTurn: Failed for ${runId}`, error);
    throw error;
  }
}

df.app.activity('AppendTurn', {
  handler: appendTurn,
});
