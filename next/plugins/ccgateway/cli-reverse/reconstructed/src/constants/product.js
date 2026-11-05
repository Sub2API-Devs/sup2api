/**
 * constants/product.ts
 *
 * 产品 URL 常量与远程会话 URL（claude.ai/code/<id>，staging/本地变体）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/product.ts
 * pieces: chunk-bvz8t570.js (1), chunk-kyjhpxvs.js (5)
 * attribution: fingerprint 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getArtifactHostOverride, claudeAiEnvironment } from "./claudeAiOrigin.js";

//@ chunk-bvz8t570.js:26454-26530 fingerprint (2.1.88 match: CLAUDE_AI_BASE_URL, 1)
/**
 * 当前会话匹配时返回覆盖的 claude.ai 源，否则 https://claude.ai。
 */
function getClaudeAiOrigin_2(env) {
  let artifactHostOverride = getArtifactHostOverride();
  if (artifactHostOverride && env === claudeAiEnvironment()) return artifactHostOverride;
  return "https://claude.ai";
}
//@ chunk-kyjhpxvs.js:191-256 fingerprint (2.1.88 match: PRODUCT_URL, 0.681)
/**
 * https://claude.com/claude-code 与 https://claude.ai。
 */
var HTTPS_CLAUDE_COM_CLAUDE_CODE = "https://claude.com/claude-code";
var HTTPS_CLAUDE_AI = "https://claude.ai";
//@ chunk-kyjhpxvs.js:256-338 fingerprint (2.1.88 match: isRemoteSessionStaging, 1)
/**
 * 会话 id 含 _staging_ 或入口 URL 含 staging。
 */
function isRemoteSessionStaging(sessionId, ingressUrl) {
  return sessionId?.includes("_staging_") === true || ingressUrl?.includes("staging") === true;
}
//@ chunk-kyjhpxvs.js:338-422 fingerprint (2.1.88 match: isRemoteSessionLocal, 1)
/**
 * 会话 id 含 _local_ 或 URL 含 localhost。
 */
function isRemoteSessionLocal(sessionId, ingressUrl) {
  return sessionId?.includes("_local_") === true || ingressUrl?.includes("localhost") === true;
}
//@ chunk-kyjhpxvs.js:422-560 fingerprint (2.1.88 match: CLAUDE_AI_STAGING_BASE_URL, 0.524)
/**
 * 按会话环境返回 claude.ai 基址（本地 localhost:4000、staging、生产）。旧版名 CLAUDE_AI_STAGING_BASE_URL 是常量名，这里是函数。
 */
function getClaudeAiBaseUrl(sessionId, ingressUrl) {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) return "http://localhost:4000";
  if (isRemoteSessionStaging(sessionId, ingressUrl)) return "https://claude-ai.staging.ant.dev";
  return "https://claude.ai";
}
//@ chunk-kyjhpxvs.js:560-712 fingerprint (2.1.88 match: getRemoteSessionUrl, 0.756)
/**
 * 远程会话网页 URL：<claude.ai 基址>/code/<兼容会话 id>[?query]。
 */
function getRemoteSessionUrl(sessionId, ingressUrl, queryParams) {
  let { toCompatSessionId } = require("../bridge/sessionIdCompat.js");
  let compatId = toCompatSessionId(sessionId);
  let baseUrl = `${getClaudeAiBaseUrl(compatId, ingressUrl)}/code/${compatId}`;
  return queryParams ? `${baseUrl}?${new URLSearchParams(queryParams)}` : baseUrl;
}
export {
  getRemoteSessionUrl,
  HTTPS_CLAUDE_COM_CLAUDE_CODE,
  isRemoteSessionLocal,
  getClaudeAiOrigin_2,
  getClaudeAiBaseUrl,
  HTTPS_CLAUDE_AI,
};
