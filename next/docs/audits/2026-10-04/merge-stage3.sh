#!/bin/bash
set -e

echo "阶段 3：新插件合并脚本"
echo "========================================"
echo ""

# 基础路径
BASE_DIR="/d/projects/golang/sup2api"
WORKTREE_BASE="$BASE_DIR/.claude/worktrees"

# 插件映射
declare -A PLUGINS=(
  ["claude-oauth"]="agent-a0279196ac0dedc24"
  ["codex-oauth"]="agent-a0279196ac0dedc24"
  ["gemini-oauth"]="agent-a0279196ac0dedc24"
  ["openai-oauth"]="agent-a0279196ac0dedc24"
  ["growth"]="agent-ac2c78416f9cad92d"
  ["payment"]="agent-ad4645dea546259b0"
)

# 1. 复制完整插件
echo "1. 复制插件目录..."
for plugin in "${!PLUGINS[@]}"; do
  wt="${PLUGINS[$plugin]}"
  src="$WORKTREE_BASE/$wt/next/plugins/$plugin"
  dst="$BASE_DIR/next/plugins/$plugin"
  
  if [ -d "$src" ]; then
    echo "  复制 $plugin..."
    cp -r "$src" "$dst"
  else
    echo "  ⚠️ 跳过 $plugin（源目录不存在）"
  fi
done

echo ""
echo "2. 更新 go.work..."
# 备份
cp "$BASE_DIR/next/go.work" "$BASE_DIR/next/go.work.backup"

# 添加新插件路径
cat >> "$BASE_DIR/next/go.work" << 'GO_WORK_EOF'
	./plugins/claude-oauth
	./plugins/codex-oauth
	./plugins/growth
	./plugins/payment
GO_WORK_EOF

echo "  已添加 4 个完整插件到 go.work"
echo "  ⚠️ gemini-oauth 和 openai-oauth 只有 go.mod，已跳过"
echo ""

echo "3. 验证编译..."
cd "$BASE_DIR/next"

for plugin in claude-oauth codex-oauth growth payment; do
  echo "  编译 $plugin..."
  cd "plugins/$plugin"
  if go mod tidy && go build ./...; then
    echo "    ✅ $plugin 编译成功"
  else
    echo "    ❌ $plugin 编译失败"
  fi
  cd "$BASE_DIR/next"
done

echo ""
echo "4. 运行测试..."
for plugin in claude-oauth growth; do
  echo "  测试 $plugin..."
  cd "plugins/$plugin"
  if go test -short ./...; then
    echo "    ✅ $plugin 测试通过"
  else
    echo "    ⚠️ $plugin 测试失败"
  fi
  cd "$BASE_DIR/next"
done

echo ""
echo "========================================"
echo "阶段 3 合并完成"
echo ""
echo "注意事项："
echo "1. payment 插件需要网络下载依赖（alipay、wechatpay SDK）"
echo "2. gemini-oauth 和 openai-oauth 只有占位 go.mod，未合并"
echo "3. dynamic-weight 插件缺少 go.mod 和主文件，未合并"
echo "4. 需要手动合并 CONTRACTS.md 第 45 和 44 章节"
echo "5. OAuth 插件需要核心提供 UpdateAccountCredentials 接口"
