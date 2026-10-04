## 42. OAuth 插件：Claude 与 Codex 账号认证（2026-10-04）

### 42.1 插件架构

OAuth 插件提供完整的 OAuth 2.0 授权流程，支持：
- 授权码交换（Authorization Code Flow）
- 令牌刷新（Refresh Token）
- 凭证安全存储（敏感字段加密）

每个插件独立管理一个平台的 OAuth 流程，不共享代码，便于定制各平台的特殊逻辑。

### 42.2 claude-oauth 插件

**插件键**：`claude_oauth` (版本 0.1.0)

**账号类型**：

1. `claude_oauth`（完整 OAuth）
   - 范围：`org:create_api_key`
   - 默认模型：`claude-opus-5`、`claude-sonnet-5`、`claude-opus-4-8`
   - 敏感字段：`access_token`、`refresh_token`
   - 设置字段：`proxy_id`

2. `claude_setup_token`（Setup Token）
   - 范围：仅推理（inference-only）
   - 默认模型：同上
   - 敏感字段：`access_token`、`refresh_token`
   - 设置字段：`proxy_id`

**能力**：
- `platform.adapter.v1`：平台适配器
- `app.jobs.v1`：定时任务（每 30 分钟刷新令牌）
- `http.routes.v1`：OAuth 流程端点

**HTTP API**：
- `POST /auth/start`：启动 OAuth 授权流程（返回授权 URL）
- `POST /auth/exchange`：交换授权码获取令牌

**网络权限**：
- `claude.com`
- `platform.claude.com`

**表单 schema**：
- `forms/oauth.schema.json`：OAuth 账号配置
- `forms/setup_token.schema.json`：Setup Token 配置

### 42.3 codex-oauth 插件

**插件键**：`codex_oauth` (版本 0.1.0)

**账号类型**：

1. `codex_oauth`（Codex Responses 端点）
   - 范围：完整 OAuth 授权
   - 默认模型：`gpt-4o-mini`、`gpt-4o`、`gpt-4-turbo`
   - 敏感字段：`access_token`、`refresh_token`、`id_token`
   - 设置字段：`proxy_id`、`organization_id`

**能力**：同 claude-oauth

**HTTP API**：同 claude-oauth

**网络权限**：
- `auth.openai.com`
- `api.openai.com`

**表单 schema**：
- `forms/oauth.schema.json`：OAuth 账号配置

### 42.4 令牌刷新机制

**定时任务**：`refresh_tokens`
- 调度：`@every 30m`
- 超时：300 秒
- 策略：
  1. 查询所有该类型账号（通过 `accounts.credentials` 权限）
  2. 检查 `expires_at` 字段，提前 5 分钟刷新
  3. 调用平台刷新接口
  4. 更新账号凭证（调用 `UpdateAccountCredentials`）

**状态缓存**：
- 使用 KV 存储缓存 OAuth 会话状态
- 键格式：`oauth:session:<state>` → `{account_id, started_at}`
- 过期时间：10 分钟（防止 CSRF）

### 42.5 核心缺口

#### 42.5.1 UpdateAccountCredentials 接口（P0）

**需求**：插件刷新令牌后更新账号凭证

```protobuf
// next/runtime-contract/plugin.proto
service PluginHost {
  rpc UpdateAccountCredentials(UpdateAccountCredentialsRequest) returns (UpdateAccountCredentialsResponse);
}

message UpdateAccountCredentialsRequest {
  string account_id = 1;
  map<string, string> credentials = 2;  // 新凭证（只包含变化的字段）
}

message UpdateAccountCredentialsResponse {
  bool success = 1;
  string error = 2;
}
```

**SDK 接口**：
```go
// next/sdk/runtime.go
type AccountsService interface {
    // 更新账号凭证（插件刷新令牌后调用）
    UpdateAccountCredentials(ctx context.Context, accountID string, credentials map[string]interface{}) error
}
```

**实现要求**：
- 只更新 `credentials` 字段，不触发账号重新加载
- 敏感字段自动加密
- 记录操作日志（插件 ID + 时间戳）
- 幂等性：相同凭证重复调用返回成功

**当前状态**：
- ❌ 核心未提供此接口
- ⚠️ OAuth 插件令牌刷新功能无法生效
- 🔧 临时方案：用户手动重新授权（体验差）

#### 42.5.2 OAuth 会话管理

**当前方案**：
- ✅ 使用 KV 存储管理 `state` 参数
- ✅ 防止 CSRF 攻击
- ✅ 10 分钟超时

**改进建议**（可选）：
- 支持多节点部署时的会话共享（当前 KV 已支持 Redis）
- 记录授权历史（审计需求）

### 42.6 用户权限

| 权限键 | 标签 | 说明 |
|--------|------|------|
| `claude_oauth:manage` | 管理 Claude OAuth 账号 | 创建和管理 Claude OAuth 账号 |
| `codex_oauth:manage` | 管理 OpenAI Codex OAuth 账号 | 创建和管理 OpenAI Codex OAuth 账号 |

### 42.7 部署注意事项

1. **OAuth 客户端配置**：
   - 需要在平台注册 OAuth 应用
   - 配置回调 URL：`https://<domain>/plugin/claude_oauth/auth/exchange`
   - 获取 `client_id` 和 `client_secret`（通过插件配置表单输入）

2. **HTTPS 要求**：
   - OAuth 回调必须使用 HTTPS
   - 本地开发可使用 `localhost` 例外

3. **令牌安全**：
   - 敏感字段自动加密存储
   - 不记录到日志
   - 定时刷新避免过期

### 42.8 测试覆盖

**claude-oauth** (`main_test.go`)：
- `TestManifestValidation`：manifest.json 格式校验
- `TestOAuthFlow`：授权流程单元测试
- `TestTokenRefresh`：令牌刷新逻辑
- `TestStateValidation`：CSRF 防护

**codex-oauth** (`main_test.go`)：
- 同 claude-oauth 结构

### 42.9 占位插件

以下插件只有 `go.mod` 占位（196 字节），无实际实现：

- `gemini-oauth`：Google Gemini OAuth 认证
- `openai-oauth`：OpenAI API OAuth 认证（非 Codex）

**状态**：暂未实现，等待需求明确后开发。

---

**本章节待合并到 CONTRACTS.md 主文档。**
