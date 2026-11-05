/**
 * constants/claudeAiOrigin.ts
 *
 * 2.1.316 新增：规范化 URL 的源（https/wss、本地 http）；当前 claude.ai 是 staging 还是 prod。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bvz8t570.js (9)
 * attribution: placement 9
 */
import { getOauthConfig } from "./oauth.js";
import { isLoopbackHost } from "../utils/localhost.js";

//@ chunk-bvz8t570.js:1848-1928 placement
/**
 * 当前 claude.ai 是 staging 还是 prod。
 */
function claudeAiEnvironment() {
  return getOauthConfig().CLAUDE_AI_ORIGIN.includes("staging") ? "staging" : "prod";
}
//@ chunk-bvz8t570.js:1928-1978 placement
/**
 * 函数 getClaudeAiOrigin（claude.ai 源（可被覆盖））。
 */
function getClaudeAiOrigin() {
  return getClaudeAiOriginOverride() ?? getOauthConfig().CLAUDE_AI_ORIGIN;
}
//@ chunk-bvz8t570.js:1978-1999 placement
function getClaudeAiOriginOverride() {
  return;
}
//@ chunk-bvz8t570.js:1999-2311 placement
/**
 * 规范化 URL 的源（https/wss、本地 http）。
 */
function normalizeOriginUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return;
  }
  let isLoopback = isLoopbackHost(parsedUrl.hostname);
  let normalizedProtocol;
  switch (parsedUrl.protocol) {
    case "https:":
    case "wss:":
      normalizedProtocol = "https:";
      break;
    case "http:":
    case "ws:":
      if (!isLoopback) return;
      normalizedProtocol = "http:";
      break;
    default:
      return;
  }
  if (
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search !== "" ||
    parsedUrl.hash !== ""
  )
    return;
  return `${normalizedProtocol}//${parsedUrl.host}`;
}
//@ chunk-bvz8t570.js:2311-2335 placement
/**
 * 函数 isClaudeAiCpOverride（恒 false 的 cp 覆盖开关）。
 */
function isClaudeAiCpOverride() {
  return false;
}
//@ chunk-bvz8t570.js:2335-2381 placement (2.1.88 match: getSettingsSyncEndpoint, 1)
/**
 * 函数 getBaseApiUrl（BASE_API_URL（可被覆盖））。
 */
function getBaseApiUrl() {
  return getBaseApiUrlOverride() ?? getOauthConfig().BASE_API_URL;
}
//@ chunk-bvz8t570.js:2381-2402 placement
function getBaseApiUrlOverride() {
  return;
}
//@ chunk-bvz8t570.js:2402-2426 placement
/**
 * 函数 isBaseApiCpOverride（恒 false 的 cp 覆盖开关）。
 */
function isBaseApiCpOverride() {
  return false;
}
//@ chunk-bvz8t570.js:2426-2448 placement
/**
 * 函数 getArtifactHostOverride（artifact 主机覆盖（当前恒为 undefined））。
 */
function getArtifactHostOverride() {
  return;
}
export {
  claudeAiEnvironment,
  getArtifactHostOverride,
  isClaudeAiCpOverride,
  getBaseApiUrl,
  isBaseApiCpOverride,
  getClaudeAiOrigin,
};
