# 🚀 Quick Start - AI Round Table

**Last Updated:** December 24, 2025  
**Status:** Backend ✅ | Frontend ✅ | Ready for Testing

---

## Start Both Servers

### Terminal 1: Backend
```powershell
cd c:\me\git\ai-round-table\azure-backend
func start
```
**Expected:** Running on http://localhost:7071

### Terminal 2: Frontend
```powershell
cd c:\me\git\ai-round-table\ai-ideas-lab
npm run dev
```
**Expected:** Running on http://localhost:8080

---

## Open Application

```
http://localhost:8080
```

---

## Test Flow

### 1. Landing Page
- Enter idea (50-1000 chars)
- Click "Submit for Evaluation"

### 2. Results Page
- Watch progress bar (0% → 100%)
- See agents appear:
  - 🔵 Refiner
  - 🟣 Reality Checker
  - 🔴 Assassin (may veto)
  - 🟡 Cost Analyst
  - 🟢 Synthesizer
- Click "Show Structured Analysis" to expand
- Wait 40-60 seconds for completion

### 3. Final Recommendation
- See decision badge (STOP/CONTINUE/CONDITIONAL)
- Read MVP recommendation
- Review open risks
- Click "Evaluate Another Idea"

---

## Test Ideas

### Happy Path (All 5 agents)
```
Build a mobile app for tracking fitness goals with AI-powered 
recommendations based on user progress, integrated with wearables, 
and gamification elements to boost engagement.
```

### Veto Path (Assassin stops early)
```
Create a time machine using quantum physics and temporal manipulation 
to allow users to travel back in time and change historical events.
```

---

## Quick Checks

### Backend Health
```powershell
Invoke-RestMethod http://localhost:7071/api/preflight -Method POST -Body '{"idea_text":"test"}' -ContentType "application/json"
```

### Frontend Build
```powershell
cd ai-ideas-lab
npm run build
```

---

## Files Changed Today

### Created
- `ai-ideas-lab/.env.local` - Environment config
- `ai-ideas-lab/src/lib/api.ts` - API client
- `ai-ideas-lab/src/pages/LandingPage.tsx` - Landing page
- `ai-ideas-lab/src/pages/ResultsPage.tsx` - Results page (replaced)
- `FRONTEND_GUIDE.md` - Frontend development guide
- `WEEK3_PROGRESS.md` - Progress report
- `QUICKSTART.md` - This file

### Modified
- `ai-ideas-lab/src/App.tsx` - Updated routing

---

## Troubleshooting

### Backend won't start
```powershell
cd azure-backend
npm run build
func start
```

### Frontend won't start
```powershell
cd ai-ideas-lab
npm install
npm run dev
```

### Can't connect to API
- Check `.env.local` has `VITE_API_BASE_URL=http://localhost:7071`
- Verify backend is running (Terminal 1)
- Check browser console for errors

---

## Documentation Index

| File | Purpose |
|------|---------|
| [STATUS.md](STATUS.md) | System overview & quick reference |
| [WEEK3_PLAN.md](WEEK3_PLAN.md) | Week 3 detailed plan (9 tasks) |
| [WEEK3_PROGRESS.md](WEEK3_PROGRESS.md) | What we built today (Tasks 1-5) |
| [FRONTEND_GUIDE.md](ai-ideas-lab/FRONTEND_GUIDE.md) | Frontend development guide |
| [TESTING.md](azure-backend/TESTING.md) | Backend testing guide |
| [architecture.md](architecture.md) | System architecture |
| [PRD-EN.md](prd/PRD-EN.md) | Product requirements |
| [QUICKSTART.md](QUICKSTART.md) | This file |

---

**Ready to test!** 🎉

Start both servers → Open http://localhost:8080 → Submit an idea → Watch the magic happen!
