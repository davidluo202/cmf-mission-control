-- CMF Mission Control Database Schema v0.1
-- Central data store for Canton Financial AI Team

-- Agent status table (real-time)
CREATE TABLE IF NOT EXISTS agent_status (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    status TEXT CHECK(status IN ('online','working','idle','error','unresponsive')) DEFAULT 'idle',
    current_task_id TEXT,
    current_task_desc TEXT,
    task_started_at TEXT,
    model_name TEXT,
    tokens_used INTEGER DEFAULT 0,
    tokens_limit INTEGER DEFAULT 0,
    model_switched_at TEXT,
    model_switch_reason TEXT,
    last_heartbeat TEXT,
    last_output_quality TEXT CHECK(last_output_quality IN ('normal','degraded','error')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Events log (append-only, full team visible)
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL, -- heartbeat|task_assigned|task_done|task_failed|alert|model_switch|decision|status_change
    agent_id TEXT,
    target_agent_id TEXT,
    task_id TEXT,
    summary TEXT,
    detail TEXT,
    model_name TEXT,
    tokens_used INTEGER,
    severity TEXT CHECK(severity IN ('info','warn','error','critical')) DEFAULT 'info',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Tasks queue
CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    assigned_by TEXT,
    assigned_to TEXT,
    status TEXT CHECK(status IN ('pending','in_progress','done','failed','blocked')) DEFAULT 'pending',
    priority TEXT CHECK(priority IN ('p0','p1','p2','p3')) DEFAULT 'p2',
    result_summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

-- Decisions log (Icy <-> David conclusions)
CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    participants TEXT, -- JSON array of agent_ids
    conclusion TEXT NOT NULL,
    action_items TEXT, -- JSON array
    decided_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Seed initial agents
INSERT OR IGNORE INTO agent_status (agent_id, agent_name, model_name) VALUES
    ('icy', 'Icy (CEO)', 'openai/gpt-5.4'),
    ('nova', 'Nova (Dev)', 'anthropic/claude-opus-4-6'),
    ('qual', 'Qual (QA)', 'zai/glm-5'),
    ('imax', 'Imax (DevOps)', 'google/gemini-3.1-pro'),
    ('nas', 'Nas (Research)', 'anthropic/claude-sonnet-4-6'),
    ('davvy', 'Davvy (PM)', 'minimax/MiniMax-M2.5');
