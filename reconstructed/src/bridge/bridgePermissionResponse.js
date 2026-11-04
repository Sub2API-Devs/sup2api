/**
 * bridge/bridgePermissionResponse.ts
 *
 * 2.1.316 新增：解析桥接权限响应、校验工具名，并为桥接会话提供可用工具列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4hdycrw.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, _enum, record, stringSchema, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { capPermissionUpdates_2 } from "../utils/permissions/permissionAnswer.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z4hdycrw.js:380-643 placement
var bridgePermissionResponseSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z4hdycrw.js:380", () => {
  bridgePermissionResponseSchema = DoctorLazy(() =>
    objectSchema({
      behavior: _enum(["allow", "deny"]),
      updatedInput: record(stringSchema(), unknown())
        .optional()
        .transform((input) => (input && Object.keys(input).length === 0 ? undefined : input)),
      updatedPermissions: capPermissionUpdates_2("refused", "bridge client"),
      message: stringSchema().optional().catch(undefined),
      toolName: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-z4hdycrw.js:643-1033 placement
function parseBridgePermissionResponse(response) {
  let parsed = bridgePermissionResponseSchema().safeParse(response);
  if (!parsed.success) {
    logForDebugging(
      `Malformed bridge permission response ignored: ${parsed.error.issues[0]?.message ?? "unknown"}`,
      {
        level: "warn",
      },
    );
    logFeatureBad("permission_bridge_relay", "permission_response_malformed");
    return;
  }
  if (
    typeof response === "object" &&
    response !== null &&
    response.updatedPermissions !== undefined &&
    parsed.data.updatedPermissions === undefined
  )
    return {
      ...parsed.data,
      updatedPermissionsDropped: true,
    };
  return parsed.data;
}
//@ chunk-z4hdycrw.js:1033-1340 placement
function isValidBridgeToolName(toolName, toolName_2, requestId) {
  if (typeof toolName !== "string") return false;
  if (!isDifferentString(toolName, toolName_2)) {
    logFeatureOk("bridge_permission_toolname_check");
    return false;
  }
  logForDebugging(
    `Ignoring can_use_tool control_response for request_id=${requestId}: toolName '${toolName}' does not match pending '${toolName_2}'`,
    {
      level: "warn",
    },
  );
  logFeatureBad("bridge_permission_toolname_check", "toolname_mismatch");
  return true;
}
//@ chunk-z4hdycrw.js:1340-1392 placement
function isDifferentString(value, other) {
  return typeof value === "string" && value !== other;
}
//@ chunk-z4hdycrw.js:1392-1494 placement
function humanizeToolName(toolName) {
  return (toolName.split("__").pop() || toolName)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
//@ chunk-z4hdycrw.js:1494-1503 placement
var EMPTY_BRIDGE_TOOLS = [];
//@ chunk-z4hdycrw.js:1503-2242 placement
/**
 * 为桥接会话提供可用工具列表与是否允许、是否远程的判断（按工具状态隔离）。
 */
class BridgeToolProvider {
  #s = () => EMPTY_BRIDGE_TOOLS;
  #i = () => true;
  #n = () => false;
  #o = EMPTY_BRIDGE_TOOLS;
  #r = () => false;
  #e;
  #t = new WeakMap();
  provide(sourceTools, isPresentable = () => true, shouldHideMachine = () => false) {
    this.#s = sourceTools;
    this.#i = isPresentable;
    this.#n = shouldHideMachine;
    this.#e = undefined;
  }
  presentUntilAnnounced(pendingTools, isPresenting) {
    this.#o = pendingTools;
    this.#r = isPresenting;
    this.#e = undefined;
  }
  presentable() {
    return this.#i();
  }
  tools() {
    let sourceTools = this.#s();
    if (this.#o.some(({ machine }) => this.#n(machine))) {
      let filtered = this.#o.filter(({ machine }) => !this.#n(machine));
      this.#o = filtered.length > 0 ? filtered : EMPTY_BRIDGE_TOOLS;
    }
    let pendingTools = this.#r() ? this.#o : EMPTY_BRIDGE_TOOLS;
    if (this.#e === undefined || this.#e.source !== sourceTools || this.#e.pending !== pendingTools) {
      let mergedTools = [
        ...sourceTools,
        ...pendingTools.filter(
          ({ tool, machine }) =>
            !sourceTools.some((existing) => existing.machine === machine && existing.tool.name === tool.name),
        ),
      ];
      for (let { tool, machine } of mergedTools) this.#t.set(tool, machine);
      this.#e = {
        source: sourceTools,
        pending: pendingTools,
        tools: mergedTools.map(({ tool }) => tool),
      };
    }
    return this.#e.tools;
  }
  machineFor(tool) {
    this.tools();
    return this.#t.get(tool);
  }
}
//@ chunk-z4hdycrw.js:2242-2298 placement
function bridgeToolsOf(extension) {
  return extension.toolState?.get(BridgeToolProvider).tools() ?? EMPTY_BRIDGE_TOOLS_FALLBACK;
}
//@ chunk-z4hdycrw.js:2298-2307 placement
var EMPTY_BRIDGE_TOOLS_FALLBACK = [];
export {
  isDifferentString,
  humanizeToolName,
  bridgeToolsOf,
  isValidBridgeToolName,
  BridgeToolProvider,
  parseBridgePermissionResponse,
};
