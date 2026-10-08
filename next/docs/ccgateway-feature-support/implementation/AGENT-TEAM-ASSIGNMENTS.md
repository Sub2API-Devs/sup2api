# Agent Team 任务分配

日期：2026-10-09
基线：feat/next-platform @ 9fe335f64

## 主线任务（已完成）

### ✅ 合并 endpoint-subsets 分支
- **提交**：c61eab371 → c6c8bf888
- **内容**：插件平台端点子集支持
- **测试**：✅ 通过

### ✅ 修复前端 i18n 测试
- **提交**：9fe335f64
- **问题**：动态字符串拼接的翻译键
- **解决**：排除已知动态键模式
- **测试**：✅ 通过

## Agent 任务分配

### Agent 1: agent-single-turn
- **Worktree**: `wt-single-turn`
- **任务**: 单轮客户端工具优化（SINGLE-TURN-CLIENT-TOOLS-DESIGN.md）
- **状态**: 🔄 进行中
- **负责人**: agent-single-turn

#### 实施计划
1. ✅ 统一单轮模式（maxTurns 统一返回 "1"）
2. 修改 maxTurns() 逻辑
3. 保留结构化输出的格式验证续轮
4. 完善轮次上限处理逻辑
5. 测试各种场景

### Agent 2: agent-account-ui
- **Worktree**: `wt-account-ui`
- **任务**: 账号列表手动刷新授权按钮
- **状态**: 🔄 进行中
- **负责人**: agent-account-ui

#### 实施计划
1. 核心提供插件自定义菜单脚手架
2. 插件注册自定义操作按钮
3. 前端账号列表集成自定义按钮
4. 测试手动刷新流程

### Agent 3: agent-cc-params
- **Worktree**: `wt-cc-params`
- **任务**: 支持 CC 的 `--add-dir` 参数
- **状态**: 🔄 进行中
- **负责人**: agent-cc-params

#### 实施计划
1. 调研 CC 如何在 API 请求中附带 `--add-dir`
2. 保留客户端附带的参数
3. 测试参数传递
4. 更新 CC 特性文档

### Agent 4: agent-tool-mapping
- **Worktree**: `wt-tool-mapping`
- **任务**: 避免工具映射冲突
- **状态**: 🔄 进行中
- **负责人**: agent-tool-mapping

#### 实施计划
1. 检测客户端是否已有 ccgateway MCP
2. 避免映射到已存在的 MCP 服务器
3. Worker 每次映射时确认 ccgateway MCP 可用性
4. 测试映射冲突场景

### Agent 5: agent-proxy-config
- **Worktree**: `wt-proxy-config`
- **任务**: IP 代理展示 + 账号绑定代理配置
- **状态**: 🔄 进行中
- **负责人**: agent-proxy-config

#### 实施计划
1. **IP 代理测试展示真实 IP**
   - 列表显示代理真实 IP
   - 每次更新后获取并记录真实 IP
   
2. **账号绑定代理配置语言/时区**
   - 代理配置容器包含语言和时区
   - 部署与运行配置可指定语言/时区
   - 支持跟随代理或手动指定

### Agent 6: agent-panel-connection
- **Worktree**: `wt-panel-connection`
- **任务**: CCGateway 插件控制面板连接改造
- **状态**: 🔄 进行中
- **负责人**: agent-panel-connection

#### 实施计划
1. **初始安装控制面板**
   - 首次需要 SSH 安装控制面板
   - 检查 Docker 已安装（不自动安装）
   - 上传所需镜像（镜像与插件一起打包）
   
2. **后续连接控制面板**
   - 配置插件时检查是否已连接控制面板
   - 已连接则无需 SSH 信息
   - 保留控制面板端点（IP、端口）和密钥
   - 使用 HTTP 加密连接
   
3. **插件更新**
   - 基于控制面板连接上传新镜像
   - 控制面板提供自动启动新版本功能
   - 实现内部更新脚本

## 后续任务

### GitHub Actions 修复
- 检查并修复所有 CI 报错
- 确保所有测试通过

## 合并策略

各 agent 完成任务后：
1. 在各自 worktree 中完成开发和测试
2. 提交到本地分支
3. 主线负责人审查并合并到 feat/next-platform
4. 推送到远程仓库
5. 清理 worktree

## 注意事项

- 每个 agent 独立工作，避免冲突
- 完成后及时通知主线合并
- 保持文档同步更新
- 测试覆盖所有场景
