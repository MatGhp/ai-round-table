import { CosmosClient, Database, Container } from '@azure/cosmos';

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseName = process.env.COSMOS_DATABASE_NAME || 'RoundTable';
const containerName = process.env.COSMOS_CONTAINER_NAME || 'runs';

if (!connectionString) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is not set');
}

// Initialize CosmosDB client (singleton)
const cosmosClient = new CosmosClient(connectionString);
const database: Database = cosmosClient.database(databaseName);
const container: Container = database.container(containerName);

export { cosmosClient, database, container };

// Helper functions for CRUD operations

export async function createRun(runDocument: any): Promise<any> {
  const { resource } = await container.items.create(runDocument);
  return resource;
}

export async function getRunById(runId: string): Promise<any | null> {
  try {
    const { resource } = await container.item(runId, runId).read();
    return resource;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    throw error;
  }
}

export async function updateRun(runId: string, updates: Partial<any>): Promise<any> {
  const existing = await getRunById(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found`);
  }

  const updated = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { resource } = await container.item(runId, runId).replace(updated);
  return resource;
}

export async function appendConversationTurn(runId: string, turn: any): Promise<any> {
  const existing = await getRunById(runId);
  if (!existing) {
    throw new Error(`Run ${runId} not found`);
  }

  const updated = {
    ...existing,
    conversation: [...existing.conversation, turn],
    updated_at: new Date().toISOString(),
  };

  const { resource } = await container.item(runId, runId).replace(updated);
  return resource;
}

export async function updateRunStatus(
  runId: string,
  status: string,
  result?: any,
  metadata?: any
): Promise<any> {
  const updates: any = { status };
  if (result) updates.result = result;
  if (metadata) updates.metadata = metadata;

  return updateRun(runId, updates);
}
