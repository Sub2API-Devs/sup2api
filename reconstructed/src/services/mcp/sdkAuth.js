/**
 * services/mcp/sdkAuth.ts
 *
 * 2.1.316 新增：MCP SDK 认证
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-74e5eddx.js (1)
 * attribution: placement 1
 */
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import { getServerKey } from "./auth.js";

//@ chunk-74e5eddx.js:230-1093 placement
/**
 * 判断 MCP SDK 认证失败是否属于"动态客户端注册（DCR）被服务器拒绝"：仅限 dcr_failed/dcr_rejected 类，需已发现 OAuth 元数据，HTTP 4xx（除 408/429）或 invalid_client 类错误码时为真。
 */
async function isDcrRejection(error, serverName, config) {
  if (
    !(error instanceof Error) ||
    !error.message.startsWith("SDK auth failed: ") ||
    !(error.cause instanceof Error)
  )
    return false;
  let { cause } = error;
  let failureKind = require("./emitTripwireEvent.lazy.js")
    .mcpAuthModule()
    .classifySdkAuthFailure(error.message, cause);
  if (failureKind !== "dcr_failed" && failureKind !== "dcr_rejected") return false;
  if (!("status" in cause) && !("errorCode" in cause))
    return cause.message === "Incompatible auth server: does not support dynamic client registration";
  if (!(
    (await readMcpOAuthStore())?.[getServerKey(serverName, config)]?.discoveryState?.oauthMetadataFound ??
    config.oauth?.authServerMetadataUrl !== undefined
  ))
    return false;
  let status =
    "status" in cause
      ? cause.status
      : Number(/^HTTP (\d{3}): Invalid OAuth error response: /.exec(cause.message)?.[1]);
  if (typeof status === "number" && Number.isFinite(status))
    return status >= 400 && status < 500 && status !== 408 && status !== 429;
  switch ("errorCode" in cause ? cause.errorCode : undefined) {
    case "invalid_client_metadata":
    case "invalid_client":
    case "unauthorized_client":
      return true;
    default:
      return false;
  }
}
export { isDcrRejection };
