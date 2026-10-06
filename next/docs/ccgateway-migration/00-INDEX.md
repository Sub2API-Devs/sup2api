# CCGateway 迁移项目文档索引

## 项目概述

将 CCGateway 从独立工具迁移为 sup2api-next 的标准插件，实现：
- 每个账号对应一个独立的 CC Worker 容器
- 核心负责账号调度，插件负责请求路由
- 零文件通信（环境变量 + HTTP 回调）
- 完整的历史会话管理

## 文档导航

### 阶段 0：发现和规划
- [01-DISCOVERY.md](01-DISCOVERY.md) - 系统探索报告
  - 现有账号体系分析
  - 插件系统机制
  - 调度和网关流程
  - CCGateway 现状
  
- [02-ARCHITECTURE.md](02-ARCHITECTURE.md) - 目标架构设计
  - 整体架构图
  - 组件职责划分
  - 数据流和控制流
  - 技术选型

- [03-MIGRATION-PLAN.md](03-MIGRATION-PLAN.md) - 迁移计划
  - 迁移策略（灰度/蓝绿/并行运行）
  - 时间线和里程碑
  - 风险评估
  - 人员分工

### 阶段 1：实施
- [04-IMPLEMENTATION-GUIDE.md](04-IMPLEMENTATION-GUIDE.md) - 实施指南
  - Worker 容器改造
  - 插件开发步骤
  - 核心集成点
  - 配置管理

- [05-TESTING-STRATEGY.md](05-TESTING-STRATEGY.md) - 测试策略
  - 单元测试清单
  - 集成测试场景
  - 性能测试基准
  - 验收测试标准

### 阶段 2：部署
- [06-DEPLOYMENT-GUIDE.md](06-DEPLOYMENT-GUIDE.md) - 部署指南
  - 环境准备
  - 容器部署步骤
  - 账号初始化
  - 健康检查

- [07-ROLLBACK-PLAN.md](07-ROLLBACK-PLAN.md) - 回滚预案
  - 回滚触发条件
  - 回滚操作步骤
  - 数据恢复方案
  - 应急联系人

### 阶段 3：跟踪和交接
- [08-PROGRESS-TRACKER.md](08-PROGRESS-TRACKER.md) - 进度跟踪
  - 任务清单（实时更新）
  - 完成状态
  - 阻塞问题
  - 下一步行动

- [09-ISSUES-AND-DECISIONS.md](09-ISSUES-AND-DECISIONS.md) - 问题和决策
  - 技术问题记录
  - 架构决策（ADR）
  - 变更请求
  - 遗留问题

- [10-HANDOFF.md](10-HANDOFF.md) - 交接文档
  - 系统概览
  - 运维手册
  - 故障排查
  - 联系方式

- [11-CODE-CLEANUP.md](11-CODE-CLEANUP.md) - 代码清理和规范
  - 代码规范（抽象、复用、解耦、低嵌套、简洁）
  - 旧代码清理计划
  - 重构技巧
  - 质量门禁

## 项目状态

**当前阶段：** 阶段 0 - 发现和规划

**进度概览：**
- [x] 启动项目
- [ ] 系统探索（进行中）
- [ ] 架构设计
- [ ] 迁移计划
- [ ] 实施
- [ ] 测试
- [ ] 部署
- [ ] 交接

**最后更新：** 2026-10-07

## 快速链接

- [当前进度](08-PROGRESS-TRACKER.md)
- [待办事项](08-PROGRESS-TRACKER.md#待办任务)
- [已知问题](09-ISSUES-AND-DECISIONS.md#已知问题)
- [最新决策](09-ISSUES-AND-DECISIONS.md#架构决策记录)

## 参与人员

- **项目负责人：** [待定]
- **架构师：** Claude (AI Agent)
- **开发人员：** [待分配]
- **测试人员：** [待分配]
- **运维人员：** [待分配]

## 相关资源

- 原始 CCGateway 代码：`tools/ccgateway/`
- sup2api-next 核心：`next/server/`
- 插件 SDK：`next/sdk/pluginsdk/`
- 现有插件参考：`next/plugins/anthropic/`
- 系统契约：`next/docs/CONTRACTS.md`
