# 第一轮审计修复：文档索引

**日期**: 2026-10-04  
**状态**: 🔄 合并进行中  
**负责**: 主控 session + 3 个子代理

---

## 📋 文档清单

### 核心文档
1. **[00-MERGE-SUMMARY.md](./00-MERGE-SUMMARY.md)** - 合并报告总览
   - 12 个 agent 的交付成果
   - 改动文件统计（150+ 文件）
   - 建议的合并策略（3 个阶段）
   - 冲突矩阵和处理方案

2. **[01-WORKTREE-MAPPING.md](./01-WORKTREE-MAPPING.md)** - Worktree 映射表
   - 每个审计修复对应的 worktree 路径
   - 改动文件清单
   - 验证命令
   - 使用方法（复制/应用 patch）

3. **[MERGE-PROGRESS.md](./MERGE-PROGRESS.md)** - 实时进度跟踪
   - 3 个阶段的详细进度
   - 子任务状态
   - 冲突矩阵
   - 风险点和注意事项
   - 预计时间表

### 阶段报告（子代理生成）
4. **02-STAGE2-MERGE-STRATEGY.md** - 阶段 2 冲突分析和合并策略（生成中）
   - 冲突文件逐个分析
   - 合并策略和代码片段
   - 迁移脚本重新编号

5. **03-STAGE3-PLUGINS.md** - 阶段 3 插件检查报告（生成中）
   - 插件完整性检查
   - CONTRACTS.md 章节编号
   - go.work 最终内容
   - 编译验证结果

---

## 🗂️ Worktree 快速索引

### 阶段 1：基础设施（无依赖）
```
abc888fa9a66eca86 → fix-stability       (grpcruntime 重构)
aed00b872ad55c605 → fix-plugins-sdk     (SDK 去重)
aed26b87d127f3317 → fix-web             (前端护栏)
```

### 阶段 2：核心修复（有冲突）
```
ac67c88cd192a58c2 → fix-money-data      (资金数据层)
a13f229afd3455127 → fix-security-combined (SSRF+权限+审计)
ad33353fd21f95096 → fix-gateway-shell-v3 (外壳网关)
```

### 阶段 3：新插件（独立）
```
a0279196ac0dedc24 → feat-oauth-accounts  (4个OAuth插件)
ac2c78416f9cad92d → feat-growth          (邀请返利+签到)
ad4645dea546259b0 → feat-payment         (充值支付)
a866de702c8127416 → feat-ops-plugins     (动态权重骨架)
```

---

## 🔄 当前活跃的子代理

### 1. merge-stage1 (acdadba75ac90476e)
- **任务**: 执行阶段 1 的 3 项合并
- **状态**: 🔄 运行中
- **预计**: 15-30 分钟完成

### 2. prep-stage2 (ad314c49676eae511)
- **任务**: 分析阶段 2 冲突，生成合并策略
- **状态**: 🔄 运行中
- **预计**: 20-30 分钟完成
- **输出**: `02-STAGE2-MERGE-STRATEGY.md`

### 3. prep-stage3 (aa17dbcf6e728908a)
- **任务**: 检查阶段 3 插件完整性
- **状态**: 🔄 运行中
- **预计**: 15-20 分钟完成
- **输出**: `03-STAGE3-PLUGINS.md`

---

## 📊 整体进度

```
┌─────────────────────────────────────────────────────────┐
│ 阶段 1: 基础设施    [████████░░] 80% (执行中)            │
│ 阶段 2: 核心修复    [██░░░░░░░░] 20% (准备中)            │
│ 阶段 3: 新插件      [██░░░░░░░░] 20% (准备中)            │
│                                                         │
│ 总进度             [████░░░░░░] 40%                     │
└─────────────────────────────────────────────────────────┘

预计完成时间: 5-7 小时
已用时间: 0.5 小时
```

---

## ⚠️ 关键冲突

### 🔴 高优先级
1. **account/handlers.go** - money-data vs security-combined
   - money-data: 批量查询槽位（`InUseMany`）
   - security: 分组权限检查 + 目标等级检查

2. **迁移脚本编号冲突** - 两个 `0027`
   - `0027_security_hardening.sql`
   - `0027_token_version.sql`
   - 需要重新编号为 0029 和 0030

### 🟡 中优先级
3. **billing/ledger.go** - money-data vs security
   - money-data: 幂等核对（user_id/amount/kind）
   - security: 审计日志

4. **CONTRACTS.md** - 所有 agent 都追加了章节
   - 需要统一编号（§43-§51）

---

## 🎯 执行计划

### 第 1 步：等待子代理完成（当前）
- ⏳ merge-stage1 完成阶段 1 合并
- ⏳ prep-stage2 完成冲突分析报告
- ⏳ prep-stage3 完成插件检查报告

### 第 2 步：验证阶段 1（15 分钟）
```bash
cd next/web && npm run lint && npm test && npm run build
cd next/server && go test -short ./internal/plugin/grpcruntime/
cd next/plugins/openai && go build ./...
```

### 第 3 步：合并阶段 2（2-3 小时）
- 先合并 fix-money-data
- 再合并 fix-security-combined（手工解决冲突）
- 最后合并 fix-gateway-shell-v3
- 重新编号迁移脚本

### 第 4 步：合并阶段 3（1 小时）
- 复制 4 个新插件目录
- 更新 go.work 和 CONTRACTS.md
- 验证编译

### 第 5 步：最终验证（1 小时）
- 运行完整测试套件
- 检查所有编译错误
- 清理 worktree
- 提交并推送

---

## 📦 交付物清单

### 文档
- [x] Worktree 映射表
- [x] 合并进度跟踪
- [ ] 阶段 2 冲突分析（生成中）
- [ ] 阶段 3 插件报告（生成中）
- [ ] 最终合并报告（待更新）

### 代码
- [ ] 阶段 1：基础设施（合并中）
- [ ] 阶段 2：核心修复（等待）
- [ ] 阶段 3：新插件（等待）

### 数据库
- [ ] 迁移脚本统一编号
- [ ] 迁移脚本测试

---

## 🔗 相关资源

### 原始问题表
- `99-ISSUES.md` - 第一轮审计发现的问题清单

### Agent 交付报告
每个 agent 的详细交付报告在各自的 worktree 中（如果有的话）

### 验证证据
阶段完成后会生成验证日志：
- `evidence/stage1-verification.txt`
- `evidence/stage2-verification.txt`
- `evidence/stage3-verification.txt`

---

**最后更新**: 2026-10-04 20:15  
**更新者**: 主控 session (f4bc457b)
