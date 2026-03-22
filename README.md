# CMF Mission Control

Canton Financial AI Team - Central Data Store & Status Platform

## Structure
- `schema.sql` — Database schema (agent status, events, tasks, decisions)
- `mission-control.db` — SQLite database (auto-generated, gitignored)

## Agents
| ID | Name | Role | Model |
|----|------|------|-------|
| icy | Icy | CEO | GPT-5.4 |
| nova | Nova | Lead Dev | Claude Opus 4.6 |
| qual | Qual | QA | GLM-5 |
| imax | Imax | DevOps | Gemini 3.1 Pro |
| nas | Nas | Research & Data | Claude Sonnet 4.6 |
| davvy | Davvy | Product Manager | MiniMax M2.5 |

## Tables
- `agent_status` — Real-time agent state, model, token usage
- `events` — Append-only event log (heartbeats, alerts, decisions)
- `tasks` — Task queue with assignment and priority
- `decisions` — Icy ↔ David decisions and action items
