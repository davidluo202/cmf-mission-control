#!/bin/bash
# 部署 Mission Control 到 Nas (via Tailscale)
# 用法: ./deploy-to-nas.sh [ssh_user] [ssh_port]
# 例如: ./deploy-to-nas.sh david 22

NAS_IP="100.107.235.107"
SSH_USER="${1:-ubuntu}"
SSH_PORT="${2:-22}"
REMOTE_DIR="/opt/mission-control"

echo "=== 部署 Mission Control 到 Nas ==="
echo "目标: $SSH_USER@$NAS_IP:$SSH_PORT"

# 1. 上传文件
rsync -avz -e "ssh -p $SSH_PORT" \
  --exclude node_modules \
  --exclude data \
  ./server/ $SSH_USER@$NAS_IP:$REMOTE_DIR/

# 2. 远程安装依赖并启动
ssh -p $SSH_PORT $SSH_USER@$NAS_IP "
  cd $REMOTE_DIR
  npm ci --omit=dev
  
  # 用 PM2 管理进程（如果有）
  if command -v pm2 &> /dev/null; then
    pm2 delete mission-control 2>/dev/null || true
    API_TOKEN='cmf-mc-token-2026' DATA_DIR='/opt/mission-control/data' \
    pm2 start index.js --name mission-control
    pm2 save
    echo '✅ 已用 PM2 启动'
  else
    # 否则用 nohup
    mkdir -p /opt/mission-control/data
    nohup env API_TOKEN='cmf-mc-token-2026' DATA_DIR='/opt/mission-control/data' \
    node index.js > /opt/mission-control/server.log 2>&1 &
    echo '✅ 已用 nohup 启动'
  fi
  
  sleep 2
  curl -s http://localhost:8765/health
"

echo ""
echo "=== 部署完成 ==="
echo "访问地址: http://$NAS_IP:8765/health"
