/**
 * bridge/oauthRefreshFailure.ts
 *
 * 2.1.316 新增。分类失败的 OAuth 刷新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-znt1ceq9.js (1)
 * attribution: placement 1
 */
import { getBridgeTokenOverride } from "./bridgeConfig.js";
import {
  getClaudeAIOAuthTokenOrigin,
  hasStoredOAuthRefreshToken,
  isOAuthRefreshKnownDead,
  getOAuthAccountOnHold,
} from "../utils/auth.js";

//@ chunk-znt1ceq9.js:275-400 placement
/**
 * 分类失败的 OAuth 刷新。
 */
function classifyFailedOAuthRefresh() {
  try {
    if (
      getBridgeTokenOverride() === undefined &&
      getClaudeAIOAuthTokenOrigin() === "store" &&
      hasStoredOAuthRefreshToken() &&
      !isOAuthRefreshKnownDead() &&
      getOAuthAccountOnHold() === null
    )
      return "unreachable";
  } catch {}
  return "rejected";
}
export { classifyFailedOAuthRefresh };
