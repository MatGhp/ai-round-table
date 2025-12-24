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
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'COMPLETED' || status === 'VETOED') {
      updateData.completed_at = new Date().toISOString();
    }

    if (status === 'FAILED' && errorMessage) {
      updateData.error_message = errorMessage;
    }

    // Patch operation to update only specific fields
    const operations = Object.entries(updateData).map(([key, value]) => ({
      op: 'replace' as const,
      path: `/${key}`,
      value,
    }));

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
