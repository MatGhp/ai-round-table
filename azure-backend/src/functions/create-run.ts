import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import * as df from 'durable-functions';
import { createRun } from '../lib/cosmos-client';
import { generateRunId } from '../lib/utils';
import { CreateRunRequestSchema, RunDocumentSchema } from '../lib/schemas';

/**
 * POST /api/runs
 * Creates a new run and starts the agent pipeline orchestration
 */
export async function createRunHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Create run initiated');

  try {
    // Parse request body
    const body = await request.json();
    const parsed = CreateRunRequestSchema.safeParse(body);

    if (!parsed.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request',
          details: parsed.error.errors,
        },
      };
    }

    const { idea_text, preset_id } = parsed.data;

    // Generate run ID
    const run_id = generateRunId();
    const now = new Date().toISOString();

    // Create initial run document
    const runDocument = {
      id: run_id,
      status: 'INIT',
      idea_text,
      preset_id,
      conversation: [],
      result: null,
      metadata: null,
      created_at: now,
      updated_at: now,
      ttl: 2592000, // 30 days
    };

    // Validate document against schema
    const validatedDocument = RunDocumentSchema.parse(runDocument);

    // Save to CosmosDB
    await createRun(validatedDocument);

    context.log(`Run created: ${run_id}`);

    // Start Durable Functions orchestrator
    const client = df.getClient(context);
    const instanceId = await client.startNew('AgentPipeline', {
      input: { runId: run_id, ideaText: idea_text },
    });

    context.log(`Orchestrator started: ${instanceId} for run ${run_id}`);

    // Return response immediately (202 Accepted - processing async)
    return {
      status: 202,
      jsonBody: {
        run_id,
        status: 'INIT',
        orchestrator_instance_id: instanceId,
        created_at: now,
      },
    };
  } catch (error: any) {
    context.error('Create run error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error.message,
      },
    };
  }
}

// Register function
app.http('create-run', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: createRunHandler,
});
