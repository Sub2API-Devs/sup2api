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
import { foundryModelKey, makeToolSchema } from "./clientHelpers.js";
import { getFoundryDeploymentCapabilities } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { DEFERREDTOOLPLACEHOLDER, DEFERRED_PLACEHOLDER_NOTE } from "../../tools/ToolSearchTool/prompt.js";

//@ chunk-hwmsct5x.js:248450-248718 placement
/**
 * 记录某 Azure Foundry 部署不支持的能力（如 tool_search/structured_outputs），供后续请求剥离。
 */
function recordFoundryUnsupportedCapabilities(e, foundryUnsupportedCapabilities) {
  if (foundryUnsupportedCapabilities.length === 0) return;
  let r = foundryModelKey(e);
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  let h = foundryDeploymentCapabilities.get(r);
  if (h && foundryUnsupportedCapabilities.every((w) => h.has(w))) return;
  let y = h ? new Set(h) : new Set();
  for (let w of foundryUnsupportedCapabilities) y.add(w);
  foundryDeploymentCapabilities.set(r, y);
  logForDebugging(`[foundry-capabilities] deployment ${r} does not support: ${[...y].join(", ")}`, {
    level: "warn",
  });
}
//@ chunk-hwmsct5x.js:248718-248799 placement
function foundrySupportsCapability(e, n) {
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  if (foundryDeploymentCapabilities.size === 0) return true;
  return !foundryDeploymentCapabilities.get(foundryModelKey(e))?.has(n);
}
//@ chunk-hwmsct5x.js:248799-249081 placement
function parseFoundryUnsupportedCapabilities(e) {
  if (getAPIProvider() !== "foundry") return null;
  if (!(e instanceof APIError) || e.status !== 400) return null;
  let error = e.error;
  if (error && typeof error === "object" && "error" in error) {
    let error_2 = error.error;
    if (error_2 && typeof error_2 === "object" && "message" in error_2 && typeof error_2.message === "string")
      return makeToolSchema(error_2.message);
  }
  return makeToolSchema(e.message ?? "");
}
//@ chunk-hwmsct5x.js:249081-249190 placement
var FOUNDRY_STRIPPABLE_CAPABILITIES = new Set(["tool_search_server", "tool_search", "structured_outputs"]);
var FAIL_FOUNDRY_PURPOSE_REQUEST = "fail:foundry-purpose-request";
//@ chunk-hwmsct5x.js:249190-249378 placement
function getFoundryRetryDirective(e, model, querySource) {
  let foundryUnsupportedCapabilities = parseFoundryUnsupportedCapabilities(e);
  if (!foundryUnsupportedCapabilities) return null;
  recordFoundryUnsupportedCapabilities(model, foundryUnsupportedCapabilities);
  if (querySource === "web_search_tool") return FAIL_FOUNDRY_PURPOSE_REQUEST;
  if (
    foundryUnsupportedCapabilities.some((foundryUnsupportedCapability) =>
      FOUNDRY_STRIPPABLE_CAPABILITIES.has(foundryUnsupportedCapability),
    )
  )
    return `retry:foundry-capability-strip:${foundryUnsupportedCapabilities.join(",")}`;
  return null;
}
//@ chunk-hwmsct5x.js:249378-249859 placement
/**
 * 对已知不支持的 Foundry 部署，从请求参数中去掉 tool search / structured outputs 字段。
 */
function stripUnsupportedFoundryCapabilities(allTools, model) {
  if (getAPIProvider() !== "foundry") return allTools;
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  if (foundryDeploymentCapabilities.size === 0) return allTools;
  let s = foundryDeploymentCapabilities.get(foundryModelKey(model));
  if (!s || s.size === 0) return allTools;
  let h = s.has("tool_search_server") || s.has("tool_search");
  let y = s.has("structured_outputs");
  if (!h && !y) return allTools;
  let w = false;
  let S = [];
  for (let E of allTools) {
    let deferLoading = h && E.defer_loading;
    if (deferLoading && E.name === DEFERREDTOOLPLACEHOLDER && E.description === DEFERRED_PLACEHOLDER_NOTE) {
      w = true;
      continue;
    }
    let strict = y && E.strict;
    if (!deferLoading && !strict) {
      S.push(E);
      continue;
    }
    w = true;
    let O = {
      ...E,
    };
    if (deferLoading) delete O.defer_loading;
    if (strict) delete O.strict;
    S.push(O);
  }
  return w ? S : allTools;
}
//@ chunk-hwmsct5x.js:249859-249931 placement
class FoundryCapabilityError extends Error {
  reason;
  constructor(message, reason) {
    super(message);
    this.reason = reason;
  }
}
//@ chunk-hwmsct5x.js:249931-249957 placement
var SAFE_FOUNDRY_KEY_RE = /^[A-Za-z0-9_-]+$/;
export {
  foundrySupportsCapability,
  parseFoundryUnsupportedCapabilities,
  recordFoundryUnsupportedCapabilities,
  stripUnsupportedFoundryCapabilities,
  getFoundryRetryDirective,
  FAIL_FOUNDRY_PURPOSE_REQUEST,
  FoundryCapabilityError,
  SAFE_FOUNDRY_KEY_RE,
};
