# Mission Control Server (Cloud)

CMF AI Agents 协作控制面板后端：Express + SQLite + JSONL。

## Deploy (Railway)

### Option A: Dockerfile
Railway 直接识别 `Dockerfile` 构建部署。

### Environment Variables
- `PORT` (Railway 自动注入，默认 8765)
- `DATA_DIR` (default: `/data`)
- `API_TOKEN` (required, e.g. a long random string)

### Health
- `GET /health`

### API (all require `x-api-token: <API_TOKEN>`)
- `POST /api/status`
- `POST /api/event`
- `GET /api/overview`
- `GET /api/events`
- `GET /api/status/all`

## Local Run

```bash
cd server
npm install
API_TOKEN=devtoken npm start
# http://localhost:8765/health
```

## Notes
- SQLite file: `${DATA_DIR}/mission_control.db`
- Audit log: `${DATA_DIR}/events.jsonl`
