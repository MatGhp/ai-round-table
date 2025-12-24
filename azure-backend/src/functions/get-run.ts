import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getRunById } from '../lib/cosmos-client';

/**
 * GET /api/runs/{id}
 * Retrieves run status and conversation history
 */
export async function getRunHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const run_id = request.params.id;
  
  context.log(`Get run requested: ${run_id}`);

  if (!run_id) {
    return {
      status: 400,
      jsonBody: {
        error: 'Missing run_id parameter',
      },
    };
  }

  try {
    // Query CosmosDB
    const runDocument = await getRunById(run_id);

    if (!runDocument) {
      return {
        status: 404,
        jsonBody: {
          error: 'Run not found',
          run_id,
        },
      };
    }

    context.log(`Run retrieved: ${run_id}, status: ${runDocument.status}`);

    return {
      status: 200,
      jsonBody: runDocument,
    };
  } catch (error: any) {
    context.error('Get run error:', error);
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
app.http('get-run', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'runs/{id}',
  handler: getRunHandler,
});
