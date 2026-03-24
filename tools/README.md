# tools/

## mc-listener.js

A lightweight agent-side listener for CMF Mission Control.

- SSE (`/api/stream`) for real-time messages
- Poll fallback (`/api/messages?to_agent=...`) every N seconds

### Run (manual)

```bash
export MC_AGENT_ID=nova
export MC_TOKEN=cmf-mc-token-2026
node tools/mc-listener.js
```

### Run (nohup)

```bash
export MC_AGENT_ID=nova
export MC_TOKEN=cmf-mc-token-2026
nohup node tools/mc-listener.js > /tmp/mc-listener.log 2>&1 &
```

### Autostart (crontab)

```bash
@reboot MC_AGENT_ID=nova MC_TOKEN=cmf-mc-token-2026 nohup node /path/to/repo/tools/mc-listener.js > /tmp/mc-listener.log 2>&1 &
```
