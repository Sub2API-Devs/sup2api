# Changelog

本文档记录 CCGateway Worker 的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中
- 性能优化：LRU 缓存历史索引
- 功能增强：模型名称白名单验证
- 监控：Prometheus metrics 导出
- 文档：API 文档生成

---

## [0.1.0] - 2026-10-07

### 🎉 首次发布

#### 新增功能
- **HTTP 服务器**: 基于 Gin 的 RESTful API
  - `POST /v1/messages` - 处理 Claude Messages 请求
  - `GET /health` - 健康检查端点
  - `GET /metrics` - 基础指标（uptime, version）
  
- **CLI 管理**: 管理 Claude Code CLI 进程
  - 进程启动和停止
  - 标准输入/输出流管理
  - Stream JSON 协议解析
  
- **历史存储**: 基于指纹的会话匹配
  - 客户端消息指纹计算
  - 原生会话 ID 映射
  - 支持 prefix-hit 和 rebuild 模式
  
- **Worker 核心**: 请求执行和响应处理
  - 历史匹配和 CLI 参数构建
  - 流式响应转发（SSE）
  - 错误处理和上下文传播

#### 架构特性
- **三层架构**: Presentation → Business Logic → Infrastructure
- **接口优先**: 所有核心模块定义清晰的接口
- **依赖注入**: 通过构造函数注入依赖
- **并发安全**: 使用 `sync.RWMutex` 保护共享状态
- **优雅关闭**: 支持 SIGINT/SIGTERM 信号处理

#### 代码质量
- **测试覆盖率**: 83%+
  - 15+ 单元测试用例
  - 使用 testify 断言库
  - Mock 测试覆盖关键路径
  
- **代码规范**: 遵守五大原则
  - 抽象: 接口优先设计
  - 复用: DRY 原则
  - 解耦: 依赖注入
  - 低嵌套: Early return
  - 简洁: YAGNI 原则

- **静态分析**: 通过 golangci-lint 检查
  - 无 lint 警告
  - 无竞态条件
  - 错误处理完整

#### 部署支持
- **Docker 镜像**: 多阶段构建优化
  - 基础镜像: `golang:1.21-alpine`
  - 最终镜像: `alpine:3.18`
  - 镜像大小: ~20 MB
  
- **配置管理**: 环境变量配置
  - `WORKER_ID` - Worker 标识符
  - `WORKER_PORT` - HTTP 服务端口
  - `WORKER_CLI_PATH` - Claude Code CLI 路径
  - `CLAUDE_CONFIG_DIR` - 配置目录
  - `WORKER_HISTORY_DIR` - 历史存储目录

#### 文档
- `README.md` - 项目概览和快速开始
- `CODE-REVIEW.md` - 代码审核报告
- `CONTRIBUTING.md` - 贡献指南
- `CHANGELOG.md` - 版本历史
- `TASK-STATUS.md` - 任务进度看板

#### 技术栈
- **语言**: Go 1.21+
- **Web 框架**: Gin 1.9.1
- **测试**: testify 1.8.4
- **容器**: Docker + Docker Compose
- **构建**: Make + Go modules

---

## [0.0.0] - 2026-10-06

### 🏗️ 项目初始化

#### 规划和设计
- 架构设计文档 (02-ARCHITECTURE.md)
- 迁移计划 (03-MIGRATION-PLAN.md)
- 实施指南 (04-IMPLEMENTATION-GUIDE.md)
- 系统探索报告 (01-DISCOVERY.md)

#### 设计决策
- ADR-001: Worker 架构（无 Manager 层）
- ADR-002: HTTP 通信协议
- ADR-003: 历史存储策略
- ADR-004: 测试策略

---

## 版本说明

### 版本号规则

格式: `MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复

### 更改类型

- **新增**: 新功能
- **变更**: 已有功能的变更
- **弃用**: 即将移除的功能
- **移除**: 已移除的功能
- **修复**: Bug 修复
- **安全**: 安全漏洞修复

---

## 升级指南

### 从 0.0.0 到 0.1.0

这是首次正式发布，从规划阶段到可运行版本。

**新用户**:
1. 参考 README.md 快速开始
2. 使用 Docker Compose 部署
3. 配置环境变量

**开发者**:
1. 阅读 CONTRIBUTING.md
2. 运行 `make test` 确保测试通过
3. 查看 CODE-REVIEW.md 了解代码标准

---

## 已知问题

### v0.1.0

1. **历史索引无限增长**
   - 影响: 长时间运行可能内存泄漏
   - 缓解: 定期重启 Worker
   - 计划修复: v0.2.0 实现 LRU 缓存

2. **模型名称未验证**
   - 影响: 可能传递无效模型给 CLI
   - 缓解: 插件层验证
   - 计划修复: v0.1.1 添加白名单

3. **无性能监控**
   - 影响: 难以诊断性能问题
   - 缓解: 查看 Docker 日志
   - 计划修复: v0.2.0 添加 Prometheus metrics

---

## 贡献者

感谢以下贡献者的努力：

- **Coordinator** - 核心代码实现、代码审核
- **cli-tester** - CLI 模块测试
- **server-tester** - Server 模块测试
- **integration-tester** - 集成测试和文档

---

## 参考链接

- [项目仓库](../../)
- [问题跟踪](../next/docs/ccgateway-migration/09-ISSUES-AND-DECISIONS.md)
- [迁移文档](../next/docs/ccgateway-migration/)
- [代码规范](../next/docs/ccgateway-migration/11-CODE-CLEANUP.md)

---

[Unreleased]: https://github.com/yourusername/ccgateway-worker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/ccgateway-worker/releases/tag/v0.1.0
[0.0.0]: https://github.com/yourusername/ccgateway-worker/tree/planning
