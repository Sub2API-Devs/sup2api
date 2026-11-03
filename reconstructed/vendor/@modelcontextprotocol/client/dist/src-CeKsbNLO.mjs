/**
 * @modelcontextprotocol/client/dist/src-CeKsbNLO.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-1ny7cxrt.js (3), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (1)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { Wz } from "./index.mjs";
import { isLoopbackUrl, isAllowedLoopbackUrl } from "../../../../src/services/claudeGateway/ssrfGuard.js";

//@ chunk-1ny7cxrt.js:1387570-1387602 esm-layout
function B0(host) {
  return Wz.has(host);
}
//@ chunk-1ny7cxrt.js:1387602-1387650 esm-layout
function j0(value) {
  return value === undefined || !isLoopbackUrl(value) || isAllowedLoopbackUrl(value);
}
//@ chunk-1ny7cxrt.js:1387650-1387798 esm-fingerprint
function x0(e) {
  try {
    let t = new URL(e);
    if (t.protocol === "https:") return true;
    if (t.protocol === "http:" && Wz.has(t.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}
//@ chunk-8t8n4kdh.js:25800-25977 esm-fingerprint
/**
 * 协议版本 _meta 键与可缓存列表方法；installModernResultBackfill 用。
 */
var PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
var CACHEABLE_LIST_METHODS = new Set([
  "tools/list",
  "prompts/list",
  "resources/list",
  "resources/templates/list",
  "resources/read",
  "server/discover",
]);
var la = 256;
//@ chunk-e6aww6q8.js:1526298-1526407 esm-fingerprint
var c4o = new Set([
  "$comment",
  "default",
  "deprecated",
  "description",
  "examples",
  "readOnly",
  "title",
  "writeOnly",
]);
export { B0, x0, j0, la, PROTOCOL_VERSION_META_KEY, CACHEABLE_LIST_METHODS, c4o };
