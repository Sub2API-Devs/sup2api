/**
 * constants/product.ts
 *
 * 产品 URL 常量与远程会话 URL（claude.ai/code/<id>，staging/本地变体）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/product.ts
 * pieces: chunk-jcnpfn31.js (5), chunk-yxnffbzs.js (1)
 * attribution: fingerprint 6
 */
import { getArtifactHostOverride, claudeAiEnvironment } from "./claudeAiOrigin.js";

//@ chunk-yxnffbzs.js:26395-26471 fingerprint = CLAUDE_AI_BASE_URL (1)
/**
 * 当前会话匹配时返回覆盖的 claude.ai 源，否则 https://claude.ai。
 */
function getClaudeAiOrigin_2(env) {
  let artifactHostOverride = getArtifactHostOverride();
  if (artifactHostOverride && env === claudeAiEnvironment()) return artifactHostOverride;
  return "https://claude.ai";
}
//@ chunk-jcnpfn31.js:13050-13115 fingerprint = PRODUCT_URL (0.681)
/**
 * https://claude.com/claude-code 与 https://claude.ai。
 */
var HTTPS_CLAUDE_COM_CLAUDE_CODE = "https://claude.com/claude-code";
var HTTPS_CLAUDE_AI = "https://claude.ai";
//@ chunk-jcnpfn31.js:13115-13198 fingerprint = isRemoteSessionStaging (1)
/**
 * 会话 id 含 _staging_ 或入口 URL 含 staging。
 */
function isRemoteSessionStaging(sessionId, ingressUrl) {
  return sessionId?.includes("_staging_") === true || ingressUrl?.includes("staging") === true;
}
//@ chunk-jcnpfn31.js:13198-13282 fingerprint = isRemoteSessionLocal (1)
/**
 * 会话 id 含 _local_ 或 URL 含 localhost。
 */
function isRemoteSessionLocal(sessionId, ingressUrl) {
  return sessionId?.includes("_local_") === true || ingressUrl?.includes("localhost") === true;
}
//@ chunk-jcnpfn31.js:13282-13421 fingerprint = CLAUDE_AI_STAGING_BASE_URL (0.524)
/**
 * 按会话环境返回 claude.ai 基址（本地 localhost:4000、staging、生产）。旧版名 CLAUDE_AI_STAGING_BASE_URL 是常量名，这里是函数。
 */
function getClaudeAiBaseUrl(sessionId, ingressUrl) {
  if (isRemoteSessionLocal(sessionId, ingressUrl)) return "http://localhost:4000";
  if (isRemoteSessionStaging(sessionId, ingressUrl)) return "https://claude-ai.staging.ant.dev";
  return "https://claude.ai";
}
//@ chunk-jcnpfn31.js:13421-13573 fingerprint = getRemoteSessionUrl (0.756)
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
  getClaudeAiBaseUrl,
  HTTPS_CLAUDE_COM_CLAUDE_CODE,
  HTTPS_CLAUDE_AI,
  getClaudeAiOrigin_2,
  isRemoteSessionLocal,
};
