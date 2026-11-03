/**
 * services/tools/toolErrorCodes.ts
 *
 * 2.1.316 新增：工具错误码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { eCi, authExpiredBlock } from "../policyLimits/capabilityBlocks.js";
import { McpAuthError, McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../mcp/client.js";
import { ShellError } from "../../utils/errors.js";
import { resolveMcpConnectionForTool } from "../mcp/mcpStringUtils.js";
import { decisionReasonCode } from "../../types/permissions.js";
import { L9r } from "../../utils/permissions/PermissionUpdate.js";
import { configHasAuthorizationHeader } from "../mcp/auth.js";
import { Zl, byr } from "../mcp/cliOwnedClients.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../utils/auth.js";

/**
 * 把工具执行错误归类为错误码：已知分类、MCP 认证（单一服务器时细分）、沙箱违规、MCP 服务器已禁用。
 */
//@ chunk-e6aww6q8.js:2497868-2498229 placement
async function getToolErrorCode(e, n, r) {
  let s = eCi(e);
  if (s !== void 0) return s;
  if (e instanceof McpAuthError) {
    let filtered = r.filter((S) => S.name === e.serverName);
    return filtered.length === 1 ? getMcpAuthErrorCode(e, filtered[0]) : void 0;
  }
  if (e instanceof ShellError && e.hadSandboxViolation) return { kind: "sandbox_violation" };
  let { connection: connection } = resolveMcpConnectionForTool(n, r);
  if (
    connection?.type === "disabled" &&
    !(e instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
  )
    return { kind: "mcp_disabled", servers: [connection.name] };
  return;
}
/**
 * 把拒绝结果映射为错误代码：读取外部路径被拦（附路径与是否受管）、记忆暂停，其他不映射。
 */
//@ chunk-e6aww6q8.js:2498229-2498538 placement
function getDenialErrorCode(e) {
  if (e.behavior !== "deny") return;
  switch (decisionReasonCode(e.decisionReason)) {
    case "outside_reads_blocked":
      return {
        kind: "outside_reads_blocked",
        ...(e.blockedPath !== void 0 && { path: e.blockedPath }),
        managed: L9r(),
      };
    case "memory_paused":
      return { kind: "memory_paused" };
    case "classifier_transcript_too_long":
    case void 0:
      return;
  }
}
//@ chunk-e6aww6q8.js:2498538-2498742 placement
async function getMcpAuthErrorCode(e, n) {
  if (e.firstPartyBearer !== void 0)
    return e.authErrorKind === "token_expired" ? getAuthExpiredCode(e.firstPartyBearer, n.config) : void 0;
  return hasCustomMcpAuth(n) ? void 0 : { kind: "mcp_needs_auth", servers: [e.serverName] };
}
//@ chunk-e6aww6q8.js:2498742-2498886 placement
function getNeedsAuthServers(e) {
  let mapped = e.filter((r) => r.type === "needs-auth" && !hasCustomMcpAuth(r)).map((r) => r.name);
  return mapped.length > 0 ? { kind: "mcp_needs_auth", servers: mapped } : void 0;
}
/**
 * MCP 服务器是否使用自定义认证（Authorization 头、headersHelper 等）而无需 OAuth 重新授权。
 */
//@ chunk-e6aww6q8.js:2498886-2499163 placement
function hasCustomMcpAuth(e) {
  let { config: config } = e;
  switch (config.type) {
    case "http":
    case "sse":
      if (configHasAuthorizationHeader(config) || Zl(config)) return !0;
      break;
    case "ws":
      return !!config.headersHelper;
    default:
      return !1;
  }
  switch (e.type) {
    case "connected":
      return !byr(e);
    case "failed":
      return e.errorCode === "HEADERS_HELPER_AUTH_REJECTED";
    default:
      return !1;
  }
}
/**
 * 按登录失败类型给出认证过期信息：设计凭证或无凭证时指明提供方；登录类型下令牌来自存储或无时返回认证过期块，来自环境变量/fd 时不处理。
 */
//@ chunk-e6aww6q8.js:2499163-2499478 placement
async function getAuthExpiredCode(e, n) {
  switch (e) {
    case "design_credential":
      return { kind: "auth_expired", provider: "claude_design" };
    case "none":
      return { kind: "auth_expired", provider: isDesignMcpUrl(n) ? "claude_design" : "claude_ai" };
    case "login":
    case "design_scoped_login":
      switch (await getClaudeAIOAuthTokenOriginAsync()) {
        case "env":
        case "fd":
          return;
        case "store":
        case "none":
          return authExpiredBlock();
      }
  }
}
//@ chunk-e6aww6q8.js:2499478-2499615 placement
function isDesignMcpUrl(e) {
  if (e.type !== "http" && e.type !== "sse") return !1;
  try {
    return new URL(e.url).pathname.startsWith("/v1/design/");
  } catch {
    return !1;
  }
}

export { getDenialErrorCode, getToolErrorCode, getNeedsAuthServers };
