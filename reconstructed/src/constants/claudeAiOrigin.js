/**
 * constants/claudeAiOrigin.ts
 *
 * 2.1.316 新增：规范化 URL 的源（https/wss、本地 http）；当前 claude.ai 是 staging 还是 prod。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxnffbzs.js (9)
 * attribution: placement 9
 */
import { getOauthConfig } from "./oauth.js";
import { pw } from "../utils/localhost.js";

/**
 * 当前 claude.ai 是 staging 还是 prod。
 */
//@ chunk-yxnffbzs.js:1875-1955 placement
function claudeAiEnvironment() {
  return getOauthConfig().CLAUDE_AI_ORIGIN.includes("staging") ? "staging" : "prod";
}
//@ chunk-yxnffbzs.js:1955-2005 placement
function aCi() {
  return de() ?? getOauthConfig().CLAUDE_AI_ORIGIN;
}
//@ chunk-yxnffbzs.js:2005-2026 placement
function de() {
  return;
}
/**
 * 规范化 URL 的源（https/wss、本地 http）。
 */
//@ chunk-yxnffbzs.js:2026-2338 placement
function normalizeOriginUrl(e) {
  let n;
  try {
    n = new URL(e);
  } catch {
    return;
  }
  let r = pw(n.hostname),
    o;
  switch (n.protocol) {
    case "https:":
    case "wss:":
      o = "https:";
      break;
    case "http:":
    case "ws:":
      if (!r) return;
      o = "http:";
      break;
    default:
      return;
  }
  if (n.username !== "" || n.password !== "" || n.pathname !== "/" || n.search !== "" || n.hash !== "")
    return;
  return `${o}//${n.host}`;
}
//@ chunk-yxnffbzs.js:2338-2362 placement
function lCi() {
  return !1;
}
//@ chunk-yxnffbzs.js:2362-2408 placement
function dCi() {
  return _e() ?? getOauthConfig().BASE_API_URL;
}
//@ chunk-yxnffbzs.js:2408-2429 placement
function _e() {
  return;
}
//@ chunk-yxnffbzs.js:2429-2453 placement
function cCi() {
  return !1;
}
//@ chunk-yxnffbzs.js:2453-2475 placement
function HBe() {
  return;
}

export { HBe, claudeAiEnvironment, lCi, dCi, cCi, aCi };
