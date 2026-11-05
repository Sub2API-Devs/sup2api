/**
 * services/mcp/redirectUriOnlyRefusal.ts
 *
 * redirectUriOnly 校验错误：没有 redirectUri 或配置了 clientId/xaa 时拒绝（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e08yqx9s.js (2)
 * attribution: placement 2
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e08yqx9s.js:226-247 placement
/**
 * MCP OAuth 的 redirectUriOnly 拒绝错误类型。
 */
let McpOauthRefusedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e08yqx9s.js:226", () => {
  McpOauthRefusedError = class McpOauthRefusedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-e08yqx9s.js:247-669 placement
/**
 * redirectUriOnly 校验：没有 redirectUri 或配置了 clientId/xaa 时抛拒绝。
 */
function assertRedirectUriOnlyAllowed(redirectUri, serverConfig) {
  if (!redirectUri)
    throw new McpOauthRefusedError(
      "redirectUriOnly is set and the request names no redirectUri.",
      "MCP OAuth refused: redirectUriOnly with no redirectUri",
    );
  if (serverConfig.oauth?.clientId || serverConfig.oauth?.xaa)
    throw new McpOauthRefusedError(
      "This server's configuration sets oauth.clientId or oauth.xaa, so sign-in may need a callback on this computer, which redirectUriOnly does not allow.",
      "MCP OAuth refused: redirectUriOnly with a configured client",
    );
}
export { McpOauthRefusedError, assertRedirectUriOnlyAllowed };
