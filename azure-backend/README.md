# AI Round Table - Azure Backend

Production backend for AI Round Table multi-agent evaluation system.

## Tech Stack

- **Azure Functions** (Consumption Plan, Node.js 20)
- **Durable Functions** (Sequential orchestration)
- **Azure CosmosDB** (NoSQL, document model)
- **Azure OpenAI Service** (GPT-4o)
- **Application Insights** (Monitoring)

## Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4
- Azure CLI
- Azure subscription

## Installation

```bash
npm install
```

## Configuration

1. Copy `local.settings.json.template` to `local.settings.json`
2. Fill in Azure credentials:
   - `COSMOS_CONNECTION_STRING`
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_KEY`

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run watch

# Start Functions locally
npm start
```

## API Endpoints

- `POST /api/preflight` - Validate idea and get clarification questions
- `POST /api/runs` - Create run and start orchestration
- `GET /api/runs/:id` - Get run status and conversation

## Project Structure

```
src/
├── functions/          # HTTP triggers
│   ├── preflight.ts
│   ├── create-run.ts
│   └── get-run.ts
├── orchestrators/      # Durable orchestrators
│   └── agent-pipeline.ts
├── activities/         # Agent activity functions
│   ├── refiner-agent.ts
│   ├── reality-agent.ts
│   ├── assassin-agent.ts
│   ├── cost-agent.ts
│   └── synthesizer-agent.ts
├── lib/               # Shared utilities
│   ├── cosmos-client.ts
│   ├── openai-client.ts
│   ├── schemas.ts
│   └── types.ts
└── prompts/           # Agent prompts
    └── agents.ts
```

## Testing

```bash
npm test
```

## Deployment

See `docs/DEPLOYMENT.md` for Azure deployment instructions.

## Related Documentation

- [PRD-001: Azure Backend Implementation](../prd/PRD-001-azure-backend.md)
- [OpenSpec Proposal](../openspec/changes/implement-azure-backend/proposal.md)
- [Implementation Tasks](../openspec/changes/implement-azure-backend/tasks.md)
