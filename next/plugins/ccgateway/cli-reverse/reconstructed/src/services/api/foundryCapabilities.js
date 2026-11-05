/**
 * services/api/foundryCapabilities.ts
 *
 * 2.1.316 新增：Azure Foundry 部署不支持能力的记录与剥离
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (8)
 * attribution: placement 8
 */
import { foundryModelKey, makeToolSchema } from "./clientHelpers.js";
import { getFoundryDeploymentCapabilities } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { DEFERREDTOOLPLACEHOLDER, DEFERRED_PLACEHOLDER_NOTE } from "../../tools/ToolSearchTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:252730-252998 placement
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
//@ chunk-vn3g7zt8.js:252998-253079 placement
function foundrySupportsCapability(model, capability) {
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  if (foundryDeploymentCapabilities.size === 0) return true;
  return !foundryDeploymentCapabilities.get(foundryModelKey(model))?.has(capability);
}
//@ chunk-vn3g7zt8.js:253079-253361 placement
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
//@ chunk-vn3g7zt8.js:253361-253470 placement
var FOUNDRY_STRIPPABLE_CAPABILITIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FAIL_FOUNDRY_PURPOSE_REQUEST;
deferInit("chunk-vn3g7zt8.js:253361", () => {
  FOUNDRY_STRIPPABLE_CAPABILITIES = new Set(["tool_search_server", "tool_search", "structured_outputs"]);
  FAIL_FOUNDRY_PURPOSE_REQUEST = "fail:foundry-purpose-request";
});
//@ chunk-vn3g7zt8.js:253470-253658 placement
function getFoundryRetryDirective(error, model, querySource) {
  let capabilities = parseFoundryUnsupportedCapabilities(error);
  if (!capabilities) return null;
  recordFoundryUnsupportedCapabilities(model, capabilities);
  if (querySource === "web_search_tool") return FAIL_FOUNDRY_PURPOSE_REQUEST;
  if (capabilities.some((capability) => FOUNDRY_STRIPPABLE_CAPABILITIES.has(capability)))
    return `retry:foundry-capability-strip:${capabilities.join(",")}`;
  return null;
}
//@ chunk-vn3g7zt8.js:253658-254139 placement
/**
 * 对已知不支持的 Foundry 部署，从请求参数中去掉 tool search / structured outputs 字段。
 */
function stripUnsupportedFoundryCapabilities(tools, model) {
  if (getAPIProvider() !== "foundry") return tools;
  let foundryDeploymentCapabilities = getFoundryDeploymentCapabilities();
  if (foundryDeploymentCapabilities.size === 0) return tools;
  let caps = foundryDeploymentCapabilities.get(foundryModelKey(model));
  if (!caps || caps.size === 0) return tools;
  let stripsToolSearch = caps.has("tool_search_server") || caps.has("tool_search");
  let stripsStrict = caps.has("structured_outputs");
  if (!stripsToolSearch && !stripsStrict) return tools;
  let changed = false;
  let out = [];
  for (let tool of tools) {
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
  return changed ? out : tools;
}
//@ chunk-vn3g7zt8.js:254139-254211 placement
class FoundryCapabilityError extends Error {
  reason;
  constructor(message, reason) {
    super(message);
    this.reason = reason;
  }
}
//@ chunk-vn3g7zt8.js:254211-254237 placement
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
