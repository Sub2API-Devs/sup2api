/**
 * services/api/foundryCapabilities.ts
 *
 * 2.1.316 新增：Azure Foundry 部署不支持能力的记录与剥离
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (8)
 * attribution: placement 8
 */
import { El, makeToolSchema } from "./clientHelpers.js";
import { getFoundryDeploymentCapabilities } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { DEFERREDTOOLPLACEHOLDER, Udr } from "../../tools/ToolSearchTool/prompt.js";

/**
 * 记录某 Azure Foundry 部署不支持的能力（如 tool_search/structured_outputs），供后续请求剥离。
 */
//@ chunk-hwmsct5x.js:248450-248718 placement
function recordFoundryUnsupportedCapabilities(e, n) {
  if (n.length === 0) return;
  let r = El(e),
    s = getFoundryDeploymentCapabilities(),
    h = s.get(r);
  if (h && n.every((w) => h.has(w))) return;
  let y = h ? new Set(h) : new Set();
  for (let w of n) y.add(w);
  (s.set(r, y),
    logForDebugging(`[foundry-capabilities] deployment ${r} does not support: ${[...y].join(", ")}`, {
      level: "warn",
    }));
}
//@ chunk-hwmsct5x.js:248718-248799 placement
function foundrySupportsCapability(e, n) {
  let r = getFoundryDeploymentCapabilities();
  if (r.size === 0) return !0;
  return !r.get(El(e))?.has(n);
}
//@ chunk-hwmsct5x.js:248799-249081 placement
function parseFoundryUnsupportedCapabilities(e) {
  if (getAPIProvider() !== "foundry") return null;
  if (!(e instanceof Ot) || e.status !== 400) return null;
  let error = e.error;
  if (error && typeof error === "object" && "error" in error) {
    let error_2 = error.error;
    if (error_2 && typeof error_2 === "object" && "message" in error_2 && typeof error_2.message === "string")
      return makeToolSchema(error_2.message);
  }
  return makeToolSchema(e.message ?? "");
}
//@ chunk-hwmsct5x.js:249081-249190 placement
var FOUNDRY_STRIPPABLE_CAPABILITIES = new Set(["tool_search_server", "tool_search", "structured_outputs"]),
  FAIL_FOUNDRY_PURPOSE_REQUEST = "fail:foundry-purpose-request";
//@ chunk-hwmsct5x.js:249190-249378 placement
function getFoundryRetryDirective(e, n, r) {
  let s = parseFoundryUnsupportedCapabilities(e);
  if (!s) return null;
  if ((recordFoundryUnsupportedCapabilities(n, s), r === "web_search_tool"))
    return FAIL_FOUNDRY_PURPOSE_REQUEST;
  if (s.some((h) => FOUNDRY_STRIPPABLE_CAPABILITIES.has(h)))
    return `retry:foundry-capability-strip:${s.join(",")}`;
  return null;
}
/**
 * 对已知不支持的 Foundry 部署，从请求参数中去掉 tool search / structured outputs 字段。
 */
//@ chunk-hwmsct5x.js:249378-249859 placement
function stripUnsupportedFoundryCapabilities(e, n) {
  if (getAPIProvider() !== "foundry") return e;
  let r = getFoundryDeploymentCapabilities();
  if (r.size === 0) return e;
  let s = r.get(El(n));
  if (!s || s.size === 0) return e;
  let h = s.has("tool_search_server") || s.has("tool_search"),
    y = s.has("structured_outputs");
  if (!h && !y) return e;
  let w = !1,
    S = [];
  for (let E of e) {
    let R = h && E.defer_loading;
    if (R && E.name === DEFERREDTOOLPLACEHOLDER && E.description === Udr) {
      w = !0;
      continue;
    }
    let L = y && E.strict;
    if (!R && !L) {
      S.push(E);
      continue;
    }
    w = !0;
    let O = { ...E };
    if (R) delete O.defer_loading;
    if (L) delete O.strict;
    S.push(O);
  }
  return w ? S : e;
}
//@ chunk-hwmsct5x.js:249859-249931 placement
class FoundryCapabilityError extends Error {
  reason;
  constructor(e, n) {
    super(e);
    this.reason = n;
  }
}
//@ chunk-hwmsct5x.js:249931-249957 placement
var Xb = /^[A-Za-z0-9_-]+$/;

export {
  foundrySupportsCapability,
  parseFoundryUnsupportedCapabilities,
  recordFoundryUnsupportedCapabilities,
  stripUnsupportedFoundryCapabilities,
  getFoundryRetryDirective,
  FAIL_FOUNDRY_PURPOSE_REQUEST,
  FoundryCapabilityError,
  Xb,
};
