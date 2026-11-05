/**
 * bridge/oauthRefreshFailure.ts
 *
 * 2.1.316 新增。分类失败的 OAuth 刷新。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e3d0refm.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getBridgeTokenOverride } from "./bridgeConfig.js";
import {
  getClaudeAIOAuthTokenOrigin,
  hasStoredOAuthRefreshToken,
  isOAuthRefreshKnownDead,
  getOAuthAccountOnHold,
} from "../utils/auth.js";

//@ chunk-e3d0refm.js:275-400 placement
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
