#!/bin/bash
# OVH 开发环境一键部署脚本
# 用途：拉取最新代码，构建镜像，滚动重启所有节点

set -e

echo "======================================"
echo "OVH 开发环境部署"
echo "======================================"
echo ""

# 1. 更新代码
echo "📥 [1/4] 拉取最新代码..."
cd ~/sup2api/src
git pull
COMMIT=$(git rev-parse --short HEAD)
echo "✓ 当前 commit: $COMMIT"
echo ""

# 2. 构建新镜像
echo "🔨 [2/4] 构建 gateway 镜像（包含核心和内置插件）..."
cd ~/sup2api-managed
docker compose build --no-cache sup2api-1
echo "✓ 镜像构建完成"
echo ""

# 3. 滚动重启节点（零停机）
echo "🔄 [3/4] 滚动重启节点..."
for node in sup2api-2 sup2api-3 sup2api-4 sup2api-1; do
  echo "  → 重启 $node..."
  docker compose up -d --no-deps --force-recreate $node
  sleep 5

  # 检查节点是否启动成功
  for i in {1..30}; do
    if docker compose ps $node | grep -q "Up"; then
      echo "  ✓ $node 已启动"
      break
    fi
    sleep 1
  done
done
echo ""

# 4. 验证所有节点
echo "✅ [4/4] 验证节点状态..."
for port in 3130 3131 3132 3133; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$port/api/v1/key/prices || echo "ERR")
  NODE="sup2api-$((port-3129))"
  if [ "$STATUS" = "401" ]; then
    echo "  ✓ $NODE (端口 $port): 正常"
  else
    echo "  ✗ $NODE (端口 $port): 异常 (HTTP $STATUS)"
  fi
done
echo ""

echo "======================================"
echo "部署完成！commit: $COMMIT"
echo "======================================"
