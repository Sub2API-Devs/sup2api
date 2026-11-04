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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:248450-248718 placement
/**
 * 记录某 Azure Foundry 部署不支持的能力（如 tool_search/structured_outputs），供后续请求剥离。
 */
function recordFoundryUnsupportedCapabilities(model, capabilities) {
  if (capabilities.length === 0) return;
  let key = foundryModelKey(model);
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  let known = foundryDeploymentCapabilities.get(key);
  if (known && capabilities.every((capability) => known.has(capability))) return;
  let merged = known ? new Set(known) : new Set();
  for (let capability of capabilities) merged.add(capability);
  foundryDeploymentCapabilities.set(key, merged);
  logForDebugging(`[foundry-capabilities] deployment ${key} does not support: ${[...merged].join(", ")}`, {
    level: "warn",
  });
}
//@ chunk-hwmsct5x.js:248718-248799 placement
function foundrySupportsCapability(model, capability) {
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  if (foundryDeploymentCapabilities.size === 0) return true;
  return !foundryDeploymentCapabilities.get(foundryModelKey(model))?.has(capability);
}
//@ chunk-hwmsct5x.js:248799-249081 placement
function parseFoundryUnsupportedCapabilities(error) {
  if (getAPIProvider() !== "foundry") return null;
  if (!(error instanceof APIError) || error.status !== 400) return null;
  let error_2 = error.error;
  if (error_2 && typeof error_2 === "object" && "error" in error_2) {
    let error = error_2.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
      return makeToolSchema(error.message);
  }
  return makeToolSchema(error.message ?? "");
}
//@ chunk-hwmsct5x.js:249081-249190 placement
var FOUNDRY_STRIPPABLE_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FAIL_FOUNDRY_PURPOSE_REQUEST;
deferInit("chunk-hwmsct5x.js:249081", () => {
  FOUNDRY_STRIPPABLE_CAPABILITIES = new Set(["tool_search_server", "tool_search", "structured_outputs"]);
  FAIL_FOUNDRY_PURPOSE_REQUEST = "fail:foundry-purpose-request";
});
//@ chunk-hwmsct5x.js:249190-249378 placement
function getFoundryRetryDirective(error, model, querySource) {
  let capabilities = parseFoundryUnsupportedCapabilities(error);
  if (!capabilities) return null;
  recordFoundryUnsupportedCapabilities(model, capabilities);
  if (querySource === "web_search_tool") return FAIL_FOUNDRY_PURPOSE_REQUEST;
  if (capabilities.some((capability) => FOUNDRY_STRIPPABLE_CAPABILITIES.has(capability)))
    return `retry:foundry-capability-strip:${capabilities.join(",")}`;
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
  let caps = foundryDeploymentCapabilities.get(foundryModelKey(model));
  if (!caps || caps.size === 0) return allTools;
  let stripsToolSearch = caps.has("tool_search_server") || caps.has("tool_search");
  let stripsStrict = caps.has("structured_outputs");
  if (!stripsToolSearch && !stripsStrict) return allTools;
  let changed = false;
  let out = [];
  for (let tool of allTools) {
    let deferLoading = stripsToolSearch && tool.defer_loading;
    if (
      deferLoading &&
      tool.name === DEFERREDTOOLPLACEHOLDER &&
      tool.description === DEFERRED_PLACEHOLDER_NOTE
    ) {
      changed = true;
      continue;
    }
    let strict = stripsStrict && tool.strict;
    if (!deferLoading && !strict) {
      out.push(tool);
      continue;
    }
    changed = true;
    let copy = {
      ...tool,
    };
    if (deferLoading) delete copy.defer_loading;
    if (strict) delete copy.strict;
    out.push(copy);
  }
  return changed ? out : allTools;
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
