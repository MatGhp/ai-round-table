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
 * Finalize Run Input
 */
interface FinalizeRunInput {
  runId: string;
  status: 'VETOED' | 'COMPLETED';
  finalTurn: ConversationTurn;
}

/**
 * Finalize a run by setting status and creating run_result
 */
export async function finalizeRun(
  input: FinalizeRunInput,
  context: InvocationContext
): Promise<void> {
  const { runId, status, finalTurn } = input;
  
  context.log(`FinalizeRun: Finalizing ${runId} as ${status}`);

  try {
    
    const now = new Date().toISOString();

    // Build run_result based on status
    let runResult: any;

    if (status === 'VETOED') {
      runResult = {
        summary: finalTurn.message,
        decision: 'STOP',
        veto_reason: finalTurn.structured_output.kill_reason,
        failure_mode: finalTurn.structured_output.failure_mode,
        key_risks: [],
        key_assumptions: [],
        ranked_recommendations: [],
      };
    } else {
      // COMPLETED - extract synthesizer output
      runResult = {
        summary: finalTurn.message,
        decision: mapRecommendationToDecision(finalTurn.structured_output.recommendation),
        recommendation: finalTurn.structured_output.recommendation,
        constrained_version: finalTurn.structured_output.constrained_version,
        open_risks: finalTurn.structured_output.open_risks || [],
        key_risks: finalTurn.structured_output.open_risks || [],
        key_assumptions: [],
        ranked_recommendations: [],
      };
    }

    // Update run with status, completed_at, and run_result
    const operations = [
      { op: 'replace' as const, path: '/status', value: status },
      { op: 'replace' as const, path: '/updated_at', value: now },
      { op: 'replace' as const, path: '/completed_at', value: now },
      { op: 'add' as const, path: '/run_result', value: runResult },
    ];

    await container.item(runId, runId).patch(operations);
    
    context.log(`FinalizeRun: Successfully finalized ${runId} as ${status}`);
  } catch (error) {
    context.error(`FinalizeRun: Failed for ${runId}`, error);
    throw error;
  }
}

/**
 * Map synthesizer recommendation to decision
 */
function mapRecommendationToDecision(
  recommendation: string
): 'STOP' | 'CONTINUE' | 'CONDITIONAL' {
  switch (recommendation) {
    case 'STOP':
      return 'STOP';
    case 'PROCEED':
      return 'CONTINUE';
    case 'RESEARCH_FIRST':
    case 'PIVOT':
      return 'CONDITIONAL';
    default:
      return 'CONDITIONAL';
  }
}

df.app.activity('FinalizeRun', {
  handler: finalizeRun,
});
