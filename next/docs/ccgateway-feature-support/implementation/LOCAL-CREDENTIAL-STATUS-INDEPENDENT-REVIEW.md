# 本地凭据状态独立审查

审查日期：2026-10-08。基线 HEAD `686e60546`；审查对象是当前未提交、未部署的 Core/UI 修复。线上 Core/Worker 版本与现场 CLI 遗锁复现来自任务交接，本次没有连接服务器重新确认。

## 范围与工具

读取 Core `auth_status.go`、`result.go`、状态接口调用点、草稿准入，以及前端类型、四个状态视图、授权状态机、提示组件和中英文文案。只读 Worker 快照实现用于核对契约，未编辑 Worker 生产代码。

确认当前工具库存包含 CodeGraph/Serena，但未获取可证实的当前项目绑定，采用 PowerShell、rg、文件读取和本地 Go/Vitest/vue-tsc。没有 CLI auth、helper、真实模型、服务器操作或部署。Go 设置 `SUB2API_TESTPG=off`，不访问本机测试 PostgreSQL。

## 结果

- Core 仅返回固定事实字段；来源枚举不允许任意字符串；未知 auth_method 折叠为 unknown；token/path/helper 等未知字段丢弃。新增独立反例验证了私密占位字符串不会回传。
- local_snapshot 必须显式提供 online_verified=false、selection_verified=false 和 credential_present；重复/未知来源拒绝。logged_in 从 credential_present 重算，避免冲突布尔值把未知 helper 状态当作凭据存在。
- 旧 Worker 只保留 healthy/logged_in/auth_method，不发明本地快照或在线验证字段。当前 Worker 来源枚举与 Core 白名单相容。
- 新增组件级回归直接挂载真实 CCGatewayAccountAuth：unresolved、过期且 presence=false、过期且 presence=true 均不自动 POST 授权链接；旧 Worker 明确 logged_in=false 时保留原有自动授权行为。
- Ready 和 checkDraftLogin 仍消费 logged_in，当前合约下只检查本地存在，不构成在线有效性证据。本次不将账号可保存/可手动切换解释为实际请求成功。

## 文案复核结论

首轮发现已由主作者修复并复核实际 diff：中文 accountAuth.steps.done 改为“凭据已保存”；中英文 reauth.migrateMessage/inProgress 改为本地凭据检查/保存后由用户确认切换；authorizedToast 改为凭据保存；新账号 authorizedDraftHint 简化为可保存账号。此前把本地状态称为在线登录验证成功的问题已关闭。本独审未修改业务或文案文件。

重新授权模式的 reauth.signedIn 重复说明亦由主作者简化为凭据已保存、等待确认切换。未发现 Core/UI 代码级阻断问题。

## 独立验证

- `SUB2API_TESTPG=off go test ./internal/ccgateway -count=1`：首轮 PASS；新增独立反例后再次 PASS（2.567s）。
- `npm test -- src/views/ccgateway`：11 个测试文件、72 个测试 PASS。
- `npm test -- src/views/ccgateway/LocalCredentialFlow.independent.spec.ts`：新增 4 个组件级回归 PASS。
- 文案整改后 `npm test -- src/views/ccgateway/CredentialStatusNotice.spec.ts src/views/ccgateway/LocalCredentialFlow.independent.spec.ts`：2 文件、7 测试 PASS（2.03s），现有文案断言相容；没有重复全部 72 测试。
- `npm run typecheck`：新增测试前后均 PASS。
- 相关已有修改 `git diff --check`：PASS，仅提示 i18n 文件 CRLF/LF 正常化。

独立新增测试：`auth_status_independent_test.go`、`LocalCredentialFlow.independent.spec.ts`。测试全部使用本地模拟数据，不能证明现场 OAuth 刷新、遗锁修复、provider 身份、模型调用或部署成功。
