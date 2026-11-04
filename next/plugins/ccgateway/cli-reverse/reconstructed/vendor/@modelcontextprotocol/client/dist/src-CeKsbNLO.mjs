/**
 * @modelcontextprotocol/client/dist/src-CeKsbNLO.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-1ny7cxrt.js (3), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (1)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { LOOPBACK_HOSTS } from "./index.mjs";
import { isLoopbackUrl, isAllowedLoopbackUrl } from "../../../../src/services/claudeGateway/ssrfGuard.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1526298-1526407 esm-fingerprint
var ANNOTATION_KEYWORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1526298", () => {
  ANNOTATION_KEYWORDS = new Set([
    "$comment",
    "default",
    "deprecated",
    "description",
    "examples",
    "readOnly",
    "title",
    "writeOnly",
  ]);
});
//@ chunk-8t8n4kdh.js:25800-25977 esm-fingerprint
/**
 * 协议版本 _meta 键与可缓存列表方法；installModernResultBackfill 用。
 */
var PROTOCOL_VERSION_META_KEY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CACHEABLE_LIST_METHODS;
var MAX_CACHEABLE_LIST_ITEMS;
deferInit("chunk-8t8n4kdh.js:25800", () => {
  PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";
  CACHEABLE_LIST_METHODS = new Set([
    "tools/list",
    "prompts/list",
    "resources/list",
    "resources/templates/list",
    "resources/read",
    "server/discover",
  ]);
  MAX_CACHEABLE_LIST_ITEMS = 256;
});
//@ chunk-1ny7cxrt.js:1387570-1387602 esm-layout
function isLoopbackHost(host) {
  return LOOPBACK_HOSTS.has(host);
}
//@ chunk-1ny7cxrt.js:1387602-1387650 esm-layout
function isAllowedNonTlsTarget(value) {
  return value === undefined || !isLoopbackUrl(value) || isAllowedLoopbackUrl(value);
}
//@ chunk-1ny7cxrt.js:1387650-1387798 esm-fingerprint
function isHttpsOrLoopbackUrl(host) {
  try {
    let url = new URL(host);
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}
export {
  isLoopbackHost,
  isHttpsOrLoopbackUrl,
  isAllowedNonTlsTarget,
  MAX_CACHEABLE_LIST_ITEMS,
  PROTOCOL_VERSION_META_KEY,
  CACHEABLE_LIST_METHODS,
  ANNOTATION_KEYWORDS,
};
