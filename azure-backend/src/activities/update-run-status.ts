import { InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { container } from '../lib/cosmos-client';

/**
 * Update Run Status Input
 */
interface UpdateRunStatusInput {
  runId: string;
  status: 'INIT' | 'AGENTS_RUNNING' | 'VETOED' | 'SYNTHESIZING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
}

/**
 * Update the status of a run in CosmosDB
 */
export async function updateRunStatus(
  input: UpdateRunStatusInput,
  context: InvocationContext
): Promise<void> {
  const { runId, status, errorMessage } = input;
  
  context.log(`UpdateRunStatus: ${runId} -> ${status}`);

  try {
    // Build patch operations
    // Use 'replace' for fields that always exist (status, updated_at)
    // Use 'add' for fields that might not exist (completed_at, error_message)
    const operations: any[] = [
      {
        op: 'replace' as const,
        path: '/status',
        value: status,
      },
      {
        op: 'replace' as const,
        path: '/updated_at',
        value: new Date().toISOString(),
      },
    ];

    if (status === 'COMPLETED' || status === 'VETOED') {
      operations.push({
        op: 'add' as const,
        path: '/completed_at',
        value: new Date().toISOString(),
      });
    }

    if (status === 'FAILED' && errorMessage) {
      operations.push({
        op: 'add' as const,
        path: '/error_message',
        value: errorMessage,
      });
    }

    await container.item(runId, runId).patch(operations);
    
    context.log(`UpdateRunStatus: Successfully updated ${runId} to ${status}`);
  } catch (error) {
    context.error(`UpdateRunStatus: Failed for ${runId}`, error);
    throw error;
  }
}

df.app.activity('UpdateRunStatus', {
  handler: updateRunStatus,
});
