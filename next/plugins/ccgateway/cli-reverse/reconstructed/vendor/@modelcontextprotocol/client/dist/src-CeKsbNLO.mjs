/**
 * @modelcontextprotocol/client/dist/src-CeKsbNLO.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-1hnjmk23.js (3), chunk-5xgkngpb.js (1), chunk-sywnjtqb.js (1)
 * attribution: esm-layout 2, esm-fingerprint 3
 */
import { LOOPBACK_HOSTS } from "./index.mjs";
import { isLoopbackUrl, isAllowedLoopbackUrl } from "../../../../src/services/claudeGateway/ssrfGuard.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1531835-1531944 esm-fingerprint
var ANNOTATION_KEYWORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1531835", () => {
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
//@ chunk-sywnjtqb.js:27209-27386 esm-fingerprint
/**
 * 协议版本 _meta 键与可缓存列表方法；installModernResultBackfill 用。
 */
var PROTOCOL_VERSION_META_KEY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CACHEABLE_LIST_METHODS;
var MAX_CACHEABLE_LIST_ITEMS;
deferInit("chunk-sywnjtqb.js:27209", () => {
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
//@ chunk-1hnjmk23.js:1389407-1389439 esm-layout
function isLoopbackHost(host) {
  return LOOPBACK_HOSTS.has(host);
}
//@ chunk-1hnjmk23.js:1389439-1389487 esm-layout
function isAllowedNonTlsTarget(value) {
  return value === undefined || !isLoopbackUrl(value) || isAllowedLoopbackUrl(value);
}
//@ chunk-1hnjmk23.js:1389487-1389635 esm-fingerprint
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
  ANNOTATION_KEYWORDS,
  MAX_CACHEABLE_LIST_ITEMS,
  PROTOCOL_VERSION_META_KEY,
  CACHEABLE_LIST_METHODS,
};
