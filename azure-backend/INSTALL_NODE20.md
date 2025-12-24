# Install Node.js 20 LTS - Manual Steps

**Status:** NVM for Windows is already installed! ✅

You just need to complete these steps in a **new PowerShell terminal**:

---

## Step 1: Close and Reopen PowerShell

**Important:** Close the current PowerShell terminal completely and open a **new** PowerShell window.

NVM needs a fresh terminal session to be recognized.

---

## Step 2: Verify NVM Installation

In the new PowerShell window:

```powershell
nvm version
```

**Expected output:** `1.2.2` (or similar)

---

## Step 3: Install Node.js 20

```powershell
nvm install 20
```

This will download and install the latest Node.js 20.x LTS version.

---

## Step 4: Use Node.js 20

```powershell
nvm use 20
```

---

## Step 5: Verify Node Version

```powershell
node --version
```

**Expected output:** `v20.x.x` (should start with v20)

---

## Step 6: Navigate to Backend and Start Functions

```powershell
cd C:\me\git\ai-round-table\azure-backend
npm install
func start
```

---

## Expected Result

You should see:

```
Functions:
  create-run: [POST] http://localhost:7071/api/runs
  get-run: [GET] http://localhost:7071/api/runs/{id}
  preflight: [POST] http://localhost:7071/api/preflight

For detailed output, run func with --verbose flag.
```

---

## Test the Endpoints

Once running, test in a **separate terminal**:

### Test 1: Preflight
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:7071/api/preflight `
  -ContentType "application/json" `
  -Body '{"idea_text":"Build an app"}'
```

### Test 2: Create Run
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:7071/api/runs `
  -ContentType "application/json" `
  -Body '{"idea_text":"Build a mobile app for water tracking with reminders"}'
```

### Test 3: Get Run (use run_id from previous response)
```powershell
Invoke-RestMethod -Uri http://localhost:7071/api/runs/run_2025-12-24_XXXX
```

---

## Troubleshooting

**If NVM still not found:**
- Make sure you closed **all** PowerShell windows
- Open a **brand new** PowerShell window
- Try: `C:\Users\matgh\AppData\Roaming\nvm\nvm.exe version`

**If Functions still won't start:**
- Check Node version: `node --version` (must be v20.x.x)
- Rebuild: `npm run build`
- Check for errors in the output

---

## ✅ Success Criteria

- [ ] NVM version shows correctly
- [ ] Node version is 20.x.x
- [ ] Functions start without errors
- [ ] All 3 endpoints listed
- [ ] Test endpoints return JSON responses

---

**Next Steps After Success:**
Once the backend is running successfully, we'll move to Week 2: implementing the Durable Functions orchestrator and AI agents!
