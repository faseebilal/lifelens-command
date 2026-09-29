# LifeLens Command

> **“See the consequences before they become problems.”**

LifeLens Command is a production-quality operational decision-intelligence application built for the 36-hour Hackathon (Web & App Development).

---

## 1. Problem
Traditional productivity and project management tools tell users:
*“What do I need to do?”*
They fail when tasks slip because they treat to-do lists as isolated items, leaving teams blind to the cascading downstream impact of delays, resource absences, and deadline compression.

## 2. Solution
LifeLens Command tells users:
*“What could happen if I delay, miss, or change something?”*
The central workflow is:
**PLAN → MAP → DETECT RISK → SIMULATE → DECIDE**

---

## 3. Core Innovation: Dependency Intelligence
* **Topological Directed Acyclic Graph (DAG)**: Tasks are modeled as graph nodes and blockers as directional edges.
* **Deadlock & Cycle Prevention**: Prohibits circular dependencies via DFS/Tarjan cycle detection before edges can be formed.
* **Cascading Risk Propagation**: A delay in a foundational dependency automatically sends a calculated risk wave downstream.
* **Isolated In-Memory What-If Simulation**: Test hypothetical disruptions without mutating real production data.

---

## 4. Key Features

1. **Executive Command Dashboard (`/dashboard`)**:
   - Live metrics: Critical Risks, Active Projects, Upcoming Deadlines, Tasks at Risk.
   - Interactive horizontal **Impact Preview Chain**.
   - Project health gauge with dynamic completion tracking.
   - Chronological schedule feed with automated collision warnings.

2. **Life Map (`/life-map`)**:
   - Flagship interactive **React Flow** dependency graph.
   - Real-time risk halo glows (Red = Critical, Amber = Warning, Green = Healthy, Blue = Prerequisite).
   - Critical path analysis highlight.
   - Detailed inspection drawer with **THIS TASK ↓ AFFECTS ↓ DOWNSTREAM TASKS** visualization.

3. **Projects CRUD (`/projects`)**:
   - Complete create, read, update, delete operations.
   - Workload progress, active deadlines, and linked task counts.

4. **Tasks CRUD (`/tasks`)**:
   - Complete create, read, update, delete operations.
   - Priority levels (LOW, MEDIUM, HIGH, CRITICAL), estimated hours, deadlines, assignees, and graph links.

5. **Risk Center (`/risk-center`)**:
   - Categorized by CRITICAL (61–100), ELEVATED (31–60), and LOW (0–30).
   - Transparent explanations covering: **WHY**, **AFFECTED DOWNSTREAM**, and **ACTION PLAN**.

6. **What-If Simulator (`/what-if`)**:
   - Non-mutating state cloning in memory.
   - Side-by-side **BEFORE vs AFTER** diffs (Project Health Delta, Risk Score Shift, Downstream Blast Radius).
   - "Apply to Real Data" or "Discard Simulation".

7. **Chaos Mode (`⚡ SIMULATE DISRUPTION`)**:
   - Cinematic 5-step disruption injection (e.g., *“API Development delayed by 24h”*, *“Lead Architect unavailable for 6 hours”*).
   - Real-time consequence propagation.

8. **AI Command Center (`/ai-command`)**:
   - Mission advisor with live project context injection.
   - Structured answers: Priority Assessment, Root Cause / Why, Downstream Impact, Tactical Action.
   - Built-in zero-fail intelligence engine fallback plus optional Gemini/OpenAI integration.

9. **Calendar & Schedule (`/calendar`)**:
   - Timeline aggregating classes, meetings, and hard task deadlines.
   - Collision detection warning banner for overlapping commitments.

---

## 5. Technology Stack
* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React
* **Graph Visualization**: `@xyflow/react` (React Flow)
* **Animation & Polish**: Framer Motion, Tailwind Glassmorphism
* **Backend & Database**: PostgreSQL, Supabase (Auth, RLS Policies, Edge Routes)
* **AI Architecture**: Secure server-side endpoint (`/api/ai/command`) with contextual DAG telemetry injection

---

## 6. PostgreSQL Database Schema & Migrations
Located at: `supabase/migrations/20260928000000_lifelens_schema.sql`

Includes 8 isolated tables with Row Level Security (RLS) policies:
1. `profiles`
2. `projects`
3. `tasks`
4. `dependencies`
5. `events`
6. `risks`
7. `simulations`
8. `ai_conversations` & `ai_messages`

---

## 7. How to Run Locally

### Prerequisites
* Node.js v18+ (tested on v24.14.0)
* npm v9+

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Run Next.js development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

### Production Build & Typecheck
```bash
# Typecheck
npm run typecheck

# Production build
npm run build

# Start production server
npm run start
```

---

## 8. Environment Variables
Copy `.env.example` to `.env.local`:
```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: External LLM Key (Gemini or OpenAI)
# If blank, LifeLens Command executes its built-in rule-based reasoning engine out of the box!
AI_API_KEY=
AI_MODEL=gemini-1.5-flash
```

---

## 9. Core Demo Path for Judges
1. Open `http://localhost:3000` → Click **"Enter Command Center"**.
2. **Dashboard**: Observe greeting, health meter (74%), and the **Impact Preview Chain**.
3. **Life Map**: Click **"Life Map"** in sidebar. Select **"API Development"** node.
4. **Dependency Chain**: Observe the detail drawer showing **API Development (Risk 88) → Frontend Integration → Testing → Deployment → Final Submission**.
5. **What-If Mode**: Click **"What-If Simulation"**. Select 24h delay on API Development and click **"Run Hypothetical Simulation"**.
6. **Cascading Impact**: Inspect the Before vs After diff showing health drop and risk surge.
7. **Chaos Mode**: Click the **⚡ Chaos Mode** button in the top bar to trigger a disruption animation.
8. **AI Command Center**: Open **"AI Command"** and click or ask:
   *“What should I prioritize today?”* or *“What happens if I delay API Development?”*
