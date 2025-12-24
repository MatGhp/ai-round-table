# Next Steps: Azure Backend Implementation

**Last Updated:** December 24, 2025  
**Current Phase:** Week 1 Foundation Complete ✅  
**Next Phase:** Azure Provisioning + Local Testing

---

## 🎯 What Was Just Completed

### Foundation Work (100% Complete)
✅ PRD-001 created with full requirements  
✅ Azure Functions project initialized  
✅ TypeScript + Zod schemas configured  
✅ CosmosDB client with CRUD operations  
✅ All 3 HTTP triggers implemented:
  - POST /api/preflight (rule-based validation)
  - POST /api/runs (create run + CosmosDB write)
  - GET /api/runs/:id (retrieve run status)  
✅ Infrastructure setup scripts (PowerShell + Bash)  
✅ Documentation updated in OpenSpec

---

## 🚀 Your Immediate Next Actions

### Action 1: Provision Azure Resources (30 min)
**Run the setup script to create all Azure infrastructure:**

```powershell
# For Windows (PowerShell)
cd c:\me\git\ai-round-table\azure-backend\scripts
.\setup-azure.ps1
```

**What this does:**
- Creates Azure Resource Group
- Provisions CosmosDB (serverless mode)
- Creates Azure OpenAI account
- Deploys GPT-4o model
- Sets up Application Insights
- Outputs connection strings

**Save the output values!** You'll need them for the next step.

---

### Action 2: Configure Environment (5 min)
**Edit `azure-backend\local.settings.json` with the credentials from Step 1:**

```json
{
  "Values": {
    "COSMOS_CONNECTION_STRING": "<paste from setup script>",
    "AZURE_OPENAI_ENDPOINT": "<paste from setup script>",
    "AZURE_OPENAI_KEY": "<paste from setup script>",
    "APPINSIGHTS_INSTRUMENTATIONKEY": "<paste from setup script>"
  }
}
```

---

### Action 3: Install Dependencies (5 min)
```bash
cd c:\me\git\ai-round-table\azure-backend
npm install
```

---

### Action 4: Start Functions Locally (1 min)
```bash
npm start
```

**Expected output:**
```
Functions:
  create-run: [POST] http://localhost:7071/api/runs
  get-run: [GET] http://localhost:7071/api/runs/{id}
  preflight: [POST] http://localhost:7071/api/preflight
```

---

### Action 5: Test the Endpoints (10 min)

**Test 1: Preflight Check**
```bash
curl -X POST http://localhost:7071/api/preflight \
  -H "Content-Type: application/json" \
  -d "{\"idea_text\": \"Build an app\"}"
```

**Expected:** JSON response with clarification questions

---

**Test 2: Create Run**
```bash
curl -X POST http://localhost:7071/api/runs \
  -H "Content-Type: application/json" \
  -d "{\"idea_text\": \"Build a mobile app for water tracking with reminders and daily goals\"}"
```

**Expected:** 
```json
{
  "run_id": "run_2025-12-24_1234",
  "status": "INIT",
  "created_at": "2025-12-24T10:00:00Z"
}
```

---

**Test 3: Retrieve Run**
```bash
curl http://localhost:7071/api/runs/run_2025-12-24_1234
```

**Expected:** Full run document from CosmosDB

---

## 📋 After Testing: What's Next?

### Week 2 Focus: Agent Pipeline (24 hours)

**Priority tasks:**
1. **Durable Functions Orchestrator** (4 hours)
   - Sequential agent execution
   - Conversation history passing
   - Veto logic

2. **5 Agent Activity Functions** (8 hours)
   - RefinerAgent
   - RealityCheckerAgent  
   - AssassinAgent (with veto)
   - CostAnalystAgent
   - SynthesizerAgent

3. **Azure OpenAI Integration** (3 hours)
   - Structured outputs mode
   - Retry logic
   - Rate limit handling

4. **Frontend Integration** (4 hours)
   - Replace mockApi.ts with real API client
   - Environment variables
   - Polling logic

---

## 🎯 Definition of Done (Week 1)

Check these before moving to Week 2:

- [ ] Azure infrastructure provisioned (CosmosDB + OpenAI + App Insights)
- [ ] All 3 HTTP endpoints respond locally
- [ ] Can create a run and see it in CosmosDB Data Explorer
- [ ] Can retrieve run by ID
- [ ] Preflight returns questions for short ideas
- [ ] No errors in Functions runtime logs

---

## 📚 Key Files to Review

| File | Purpose |
|------|---------|
| [PRD-001-azure-backend.md](../../../prd/PRD-001-azure-backend.md) | Full requirements document |
| [PROGRESS.md](PROGRESS.md) | Detailed progress update |
| [tasks.md](tasks.md) | Week-by-week implementation tasks |
| [azure-backend/README.md](../../../azure-backend/README.md) | Backend project documentation |

---

## ❓ Questions or Issues?

**If setup script fails:**
- Check Azure CLI is installed: `az --version`
- Verify you're logged in: `az account show`
- Check subscription has OpenAI access (may need approval)

**If Functions won't start:**
- Verify Node.js 20+: `node --version`
- Check Azure Functions Core Tools: `func --version`
- Run `npm install` again

**If CosmosDB connection fails:**
- Verify connection string in local.settings.json
- Check CosmosDB account is created in Azure Portal
- Test connection in Azure Data Explorer

---

## 🎉 Summary

**You now have:**
- Complete PRD (PRD-001)
- Working Azure Functions project
- 3 HTTP endpoints ready to test
- Infrastructure scripts ready to run
- Clear roadmap for Week 2

**Your workflow going forward:**
1. Run setup script → provision Azure
2. Configure local.settings.json
3. Test endpoints locally
4. Move to Week 2 (Durable Functions + Agents)

**Estimated time to production-ready backend:** 2 weeks (Week 1 HTTP layer ✅ + Week 2 agent pipeline)

---

**Ready to proceed?** Run the setup script and start testing! 🚀
