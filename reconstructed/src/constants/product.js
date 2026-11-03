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
import { HBe, claudeAiEnvironment } from "./claudeAiOrigin.js";

/**
 * https://claude.com/claude-code 与 https://claude.ai。
 */
//@ chunk-jcnpfn31.js:13050-13115 fingerprint = PRODUCT_URL (0.681)
var HTTPS_CLAUDE_COM_CLAUDE_CODE = "https://claude.com/claude-code",
  HTTPS_CLAUDE_AI = "https://claude.ai";
/**
 * 会话 id 含 _staging_ 或入口 URL 含 staging。
 */
//@ chunk-jcnpfn31.js:13115-13198 fingerprint = isRemoteSessionStaging (1)
function isRemoteSessionStaging(sessionId, ingressUrl) {
  return sessionId?.includes("_staging_") === !0 || ingressUrl?.includes("staging") === !0;
}
/**
 * 会话 id 含 _local_ 或 URL 含 localhost。
 */
//@ chunk-jcnpfn31.js:13198-13282 fingerprint = isRemoteSessionLocal (1)
function isRemoteSessionLocal(sessionId, ingressUrl) {
  return sessionId?.includes("_local_") === !0 || ingressUrl?.includes("localhost") === !0;
}
/**
 * 按会话环境返回 claude.ai 基址（本地 localhost:4000、staging、生产）。旧版名 CLAUDE_AI_STAGING_BASE_URL 是常量名，这里是函数。
 */
//@ chunk-jcnpfn31.js:13282-13421 fingerprint = CLAUDE_AI_STAGING_BASE_URL (0.524)
function getClaudeAiBaseUrl(e, n) {
  if (isRemoteSessionLocal(e, n)) return "http://localhost:4000";
  if (isRemoteSessionStaging(e, n)) return "https://claude-ai.staging.ant.dev";
  return "https://claude.ai";
}
/**
 * 远程会话网页 URL：<claude.ai 基址>/code/<兼容会话 id>[?query]。
 */
//@ chunk-jcnpfn31.js:13421-13573 fingerprint = getRemoteSessionUrl (0.756)
function getRemoteSessionUrl(e, n, r) {
  let { toCompatSessionId: toCompatSessionId } = require("./chunk-q9tb4ez8.js"),
    compatId = toCompatSessionId(e),
    l = `${getClaudeAiBaseUrl(compatId, n)}/code/${compatId}`;
  return r ? `${l}?${new URLSearchParams(r)}` : l;
}
/**
 * 当前会话匹配时返回覆盖的 claude.ai 源，否则 https://claude.ai。
 */
//@ chunk-yxnffbzs.js:26395-26471 fingerprint = CLAUDE_AI_BASE_URL (1)
function getClaudeAiOrigin(e) {
  let n = HBe();
  if (n && e === claudeAiEnvironment()) return n;
  return "https://claude.ai";
}

export {
  getRemoteSessionUrl,
  getClaudeAiBaseUrl,
  HTTPS_CLAUDE_COM_CLAUDE_CODE,
  HTTPS_CLAUDE_AI,
  isRemoteSessionLocal,
  getClaudeAiOrigin,
};
