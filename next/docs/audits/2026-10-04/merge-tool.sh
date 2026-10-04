#!/bin/bash
# 审计修复合并工具脚本
# 用法: ./merge-tool.sh <stage|worktree-id|plugin-name>

set -e

REPO_ROOT="D:/projects/golang/sup2api"
WORKTREE_BASE=".claude/worktrees"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 从 worktree 复制文件到主工作区
copy_from_worktree() {
    local worktree_id=$1
    local target_path=$2
    local dest_path=${3:-$target_path}

    local source="${WORKTREE_BASE}/agent-${worktree_id}/${target_path}"

    if [[ ! -e "$source" ]]; then
        log_error "Source not found: $source"
        return 1
    fi

    log_info "Copying from worktree ${worktree_id}: ${target_path} -> ${dest_path}"

    if [[ -d "$source" ]]; then
        # 目录：递归复制
        rsync -av --exclude='.git' "$source/" "$dest_path/"
    else
        # 文件：确保目标目录存在
        mkdir -p "$(dirname "$dest_path")"
        cp -f "$source" "$dest_path"
    fi

    log_success "Copied successfully"
}

# 应用 worktree 的所有改动（通过 git diff）
apply_worktree_changes() {
    local worktree_id=$1
    local worktree_path="${WORKTREE_BASE}/agent-${worktree_id}"

    log_info "Applying changes from worktree ${worktree_id}..."

    # 生成 patch
    local patch_file="/tmp/merge-${worktree_id}.patch"
    git -C "$worktree_path" diff > "$patch_file"

    if [[ ! -s "$patch_file" ]]; then
        log_warn "No changes in worktree ${worktree_id}"
        return 0
    fi

    # 应用 patch
    if git apply --check "$patch_file" 2>/dev/null; then
        git apply "$patch_file"
        log_success "Applied patch successfully"
    else
        log_error "Patch has conflicts, manual merge required"
        log_info "Patch saved to: $patch_file"
        return 1
    fi
}

# 复制新增的未跟踪文件
copy_untracked_files() {
    local worktree_id=$1
    local worktree_path="${WORKTREE_BASE}/agent-${worktree_id}"

    log_info "Copying untracked files from worktree ${worktree_id}..."

    # 获取未跟踪的文件列表
    local untracked=$(git -C "$worktree_path" ls-files --others --exclude-standard)

    if [[ -z "$untracked" ]]; then
        log_info "No untracked files"
        return 0
    fi

    echo "$untracked" | while read -r file; do
        local source="${worktree_path}/${file}"
        local dest="${file}"

        if [[ -e "$source" ]]; then
            mkdir -p "$(dirname "$dest")"
            cp -r "$source" "$dest"
            log_info "  Copied: $file"
        fi
    done

    log_success "Untracked files copied"
}

# 合并阶段 1：基础设施
merge_stage1() {
    log_info "=== Merging Stage 1: Infrastructure ==="

    # 1.1 fix-stability
    log_info "--- 1.1 fix-stability ---"
    apply_worktree_changes "abc888fa9a66eca86"

    # 1.2 fix-plugins-sdk
    log_info "--- 1.2 fix-plugins-sdk ---"
    apply_worktree_changes "aed00b872ad55c605"
    copy_untracked_files "aed00b872ad55c605"

    # 1.3 fix-web (配置文件已手工创建，只需要测试文件等)
    log_info "--- 1.3 fix-web ---"
    # 这里需要手工处理，因为主要改动可能已部分合并

    log_success "Stage 1 merge completed"
}

# 合并阶段 2：核心修复
merge_stage2() {
    log_info "=== Merging Stage 2: Core Fixes ==="

    # 2.1 fix-money-data（先合并）
    log_info "--- 2.1 fix-money-data ---"
    apply_worktree_changes "ac67c88cd192a58c2"

    # 2.2 fix-security-combined（有冲突，需要手工处理）
    log_info "--- 2.2 fix-security-combined ---"
    log_warn "This has conflicts with fix-money-data, manual merge required"
    # apply_worktree_changes "a13f229afd3455127"

    # 2.3 fix-gateway-shell-v3
    log_info "--- 2.3 fix-gateway-shell-v3 ---"
    apply_worktree_changes "ad33353fd21f95096"

    log_success "Stage 2 merge completed (with manual steps pending)"
}

# 合并阶段 3：新插件
merge_stage3() {
    log_info "=== Merging Stage 3: New Plugins ==="

    # 3.1 feat-oauth-accounts
    log_info "--- 3.1 feat-oauth-accounts ---"
    copy_untracked_files "a0279196ac0dedc24"

    # 3.2 feat-growth
    log_info "--- 3.2 feat-growth ---"
    copy_untracked_files "ac2c78416f9cad92d"

    # 3.3 feat-payment
    log_info "--- 3.3 feat-payment ---"
    copy_untracked_files "ad4645dea546259b0"

    # 3.4 feat-ops-plugins
    log_info "--- 3.4 feat-ops-plugins ---"
    copy_untracked_files "a866de702c8127416"

    log_success "Stage 3 merge completed"
}

# 验证编译
verify_build() {
    log_info "=== Verifying Build ==="

    log_info "--- Backend ---"
    (cd next/server && go build ./...)

    log_info "--- Plugins ---"
    for plugin in next/plugins/*/; do
        if [[ -f "$plugin/go.mod" ]]; then
            log_info "Building $(basename "$plugin")..."
            (cd "$plugin" && go build ./...)
        fi
    done

    log_info "--- Frontend ---"
    (cd next/web && npm run build)

    log_success "All builds passed"
}

# 运行测试
verify_tests() {
    log_info "=== Running Tests ==="

    log_info "--- Backend Tests ---"
    (cd next/server && go test -short ./...)

    log_info "--- Frontend Tests ---"
    (cd next/web && npm test)

    log_success "All tests passed"
}

# 主函数
main() {
    local action=${1:-help}

    case "$action" in
        stage1)
            merge_stage1
            ;;
        stage2)
            merge_stage2
            ;;
        stage3)
            merge_stage3
            ;;
        verify-build)
            verify_build
            ;;
        verify-tests)
            verify_tests
            ;;
        all)
            merge_stage1
            verify_build
            merge_stage2
            verify_build
            merge_stage3
            verify_build
            verify_tests
            ;;
        help|*)
            echo "Usage: $0 <action>"
            echo ""
            echo "Actions:"
            echo "  stage1        - Merge stage 1 (infrastructure)"
            echo "  stage2        - Merge stage 2 (core fixes)"
            echo "  stage3        - Merge stage 3 (new plugins)"
            echo "  verify-build  - Verify all builds"
            echo "  verify-tests  - Run all tests"
            echo "  all           - Merge all stages and verify"
            echo "  help          - Show this help"
            ;;
    esac
}

main "$@"
