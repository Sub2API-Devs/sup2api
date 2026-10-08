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
- **状态**: ✅ 已完成（测试与验证）
- **负责人**: agent-single-turn
- **提交**: 4a5c6784a
- **分支**: wt-single-turn (已推送)

#### 实施总结
1. ✅ 验证现有实现符合设计要求
2. ✅ 工具拦截机制正确（mod/hooks/register.js）
3. ✅ maxTurns 策略合理（渐进式单轮）
4. ✅ 轮次上限处理正确（turn.step hook）
5. ✅ 添加全面测试覆盖（11个测试用例）
6. ✅ 编写实施状态文档

#### 交付成果
- `single_turn_client_tools_test.go`：11个测试用例全部通过
- `SINGLE-TURN-IMPLEMENTATION-STATUS.md`：实施状态和设计对照
- 验证核心机制：工具拦截、maxTurns 逻辑、响应完整性
- 下一步：集成测试和特性文档更新（待主线决定）

### Agent 2: agent-account-ui
- **Worktree**: `wt-account-ui`
- **任务**: 账号列表手动刷新授权按钮
- **状态**: ✅ 已完成并合并
- **提交**: fa77c4284
- **分支**: wt-account-ui (已合并到 feat/next-platform)

#### 实施总结
1. ✅ 核心提供插件自定义操作脚手架（AccountAction 结构和 API）
2. ✅ CCGateway 插件注册 refresh_auth 操作
3. ✅ 前端 AccountRuntimes 表格添加刷新授权按钮
4. ✅ 国际化和类型定义完成

### Agent 3: agent-cc-params
- **Worktree**: `wt-cc-params`
- **任务**: 支持 CC 的 `--add-dir` 参数
- **状态**: ✅ 已完成并合并
- **提交**: e614751ae
- **分支**: 已合并到 feat/next-platform (来自 endpoint-subsets)

#### 实施总结
1. ✅ Request 结构添加 AdditionalDirectories 字段
2. ✅ parseAdditionalDirectories 验证逻辑（最多 100 个目录，每个最长 4096 字符）
3. ✅ 测试覆盖：additional_directories_test.go 和 cwd_probe_cli_test.go
4. ✅ CC 特性文档待更新（功能已实现）

### Agent 4: agent-tool-mapping
- **Worktree**: `wt-tool-mapping`
- **任务**: 避免工具映射冲突
- **状态**: ✅ 已完成并合并
- **提交**: 75627abb8
- **分支**: wt-tool-mapping (已合并到 feat/next-platform)

#### 实施总结
1. ✅ 自动检测和解决工具命名空间冲突
2. ✅ 使用备用命名空间（如 ccgateway-mapped）
3. ✅ 安全敏感场景保持拒绝策略
4. ✅ 全面的测试覆盖：tool_namespace_test.go（156 行测试）
5. ✅ 功能文档：TOOL_NAMESPACE_CONFLICT_RESOLUTION.md

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
