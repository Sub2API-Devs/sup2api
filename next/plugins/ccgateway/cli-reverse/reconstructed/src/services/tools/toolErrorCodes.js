/**
 * services/tools/toolErrorCodes.ts
 *
 * 2.1.316 新增：工具错误码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getTaggedObject, authExpiredBlock } from "../policyLimits/capabilityBlocks.js";
import { McpAuthError, McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../mcp/client.js";
import { ShellError } from "../../utils/errors.js";
import { resolveMcpConnectionForTool } from "../mcp/mcpStringUtils.js";
import { decisionReasonCode } from "../../types/permissions.js";
import { blocksReadsOutsideWorkingDirs } from "../../utils/permissions/PermissionUpdate.js";
import { configHasAuthorizationHeader } from "../mcp/auth.js";
import { isCliOwnedConfig, hasCliOwnedAuthProvider } from "../mcp/cliOwnedClients.js";
import { getClaudeAIOAuthTokenOriginAsync } from "../../utils/auth.js";

//@ chunk-5xgkngpb.js:2539168-2539529 placement
/**
 * 把工具执行错误归类为错误码：已知分类、MCP 认证（单一服务器时细分）、沙箱违规、MCP 服务器已禁用。
 */
async function getToolErrorCode(error, name, mcpClients) {
  let taggedObject = getTaggedObject(error);
  if (taggedObject !== undefined) return taggedObject;
  if (error instanceof McpAuthError) {
    let filtered = mcpClients.filter((client) => client.name === error.serverName);
    return filtered.length === 1 ? getMcpAuthErrorCode(error, filtered[0]) : undefined;
  }
  if (error instanceof ShellError && error.hadSandboxViolation)
    return {
      kind: "sandbox_violation",
    };
  let { connection } = resolveMcpConnectionForTool(name, mcpClients);
  if (
    connection?.type === "disabled" &&
    !(error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
  )
    return {
      kind: "mcp_disabled",
      servers: [connection.name],
    };
  return;
}
//@ chunk-5xgkngpb.js:2539529-2539838 placement
/**
 * 把拒绝结果映射为错误代码：读取外部路径被拦（附路径与是否受管）、记忆暂停，其他不映射。
 */
function getDenialErrorCode(permissionDecision) {
  if (permissionDecision.behavior !== "deny") return;
  switch (decisionReasonCode(permissionDecision.decisionReason)) {
    case "outside_reads_blocked":
      return {
        kind: "outside_reads_blocked",
        ...(permissionDecision.blockedPath !== undefined && {
          path: permissionDecision.blockedPath,
        }),
        managed: blocksReadsOutsideWorkingDirs(),
      };
    case "memory_paused":
      return {
        kind: "memory_paused",
      };
    case "classifier_transcript_too_long":
    case undefined:
      return;
  }
}
//@ chunk-5xgkngpb.js:2539838-2540042 placement
async function getMcpAuthErrorCode(error, mcpClient) {
  if (error.firstPartyBearer !== undefined)
    return error.authErrorKind === "token_expired"
      ? getAuthExpiredCode(error.firstPartyBearer, mcpClient.config)
      : undefined;
  return hasCustomMcpAuth(mcpClient)
    ? undefined
    : {
        kind: "mcp_needs_auth",
        servers: [error.serverName],
      };
}
//@ chunk-5xgkngpb.js:2540042-2540186 placement
function getNeedsAuthServers(connections) {
  let mapped = connections
    .filter((connection) => connection.type === "needs-auth" && !hasCustomMcpAuth(connection))
    .map((connection) => connection.name);
  return mapped.length > 0
    ? {
        kind: "mcp_needs_auth",
        servers: mapped,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:2540186-2540463 placement
/**
 * MCP 服务器是否使用自定义认证（Authorization 头、headersHelper 等）而无需 OAuth 重新授权。
 */
function hasCustomMcpAuth(mcpClient) {
  let { config } = mcpClient;
  switch (config.type) {
    case "http":
    case "sse":
      if (configHasAuthorizationHeader(config) || isCliOwnedConfig(config)) return true;
      break;
    case "ws":
      return !!config.headersHelper;
    default:
      return false;
  }
  switch (mcpClient.type) {
    case "connected":
      return !hasCliOwnedAuthProvider(mcpClient);
    case "failed":
      return mcpClient.errorCode === "HEADERS_HELPER_AUTH_REJECTED";
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:2540463-2540778 placement
/**
 * 按登录失败类型给出认证过期信息：设计凭证或无凭证时指明提供方；登录类型下令牌来自存储或无时返回认证过期块，来自环境变量/fd 时不处理。
 */
async function getAuthExpiredCode(firstPartyBearer, config) {
  switch (firstPartyBearer) {
    case "design_credential":
      return {
        kind: "auth_expired",
        provider: "claude_design",
      };
    case "none":
      return {
        kind: "auth_expired",
        provider: isDesignMcpUrl(config) ? "claude_design" : "claude_ai",
      };
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
//@ chunk-5xgkngpb.js:2540778-2540915 placement
function isDesignMcpUrl(config) {
  if (config.type !== "http" && config.type !== "sse") return false;
  try {
    return new URL(config.url).pathname.startsWith("/v1/design/");
  } catch {
    return false;
  }
}
export { getNeedsAuthServers, getDenialErrorCode, getToolErrorCode };
