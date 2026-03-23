# HEARTBEAT.md

# Auto-Development & Coordination Pipeline (7/24 Schedule)

1. **Development & Bug Fixes (Continuous):**
   - Check GitHub repo for new issues or pending features.
   - Run coding agents in the background to implement features (e.g., removing Manus dependencies completely, migrating to standard backend, adding "Contact Us" email form).

2. **Testing Handoff (Once a feature is committed):**
   - Notify @cmftesting_bot in the Telegram group to run regression tests and UI verification on the latest deployment (Railway / Vercel).
   - If @cmftesting_bot reports bugs, spawn a coding agent to fix them immediately and redeploy.

3. **Project Management & Reporting (Daily):**
   - Collaborate with @davidluo202_bot to track the overall roadmap (Database integration, Email system, Next.js/Vercel migration).
   - At the end of each daily cycle, compile a **UAT Release Report** detailing new features, known issues, and testing instructions.
   - Mention David with the daily UAT summary.
