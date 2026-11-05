/**
 * bridge/bridgePermissionResponse.ts
 *
 * 2.1.316 新增：解析桥接权限响应、校验工具名，并为桥接会话提供可用工具列表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z4r73bkw.js (5), chunk-zn00h5j5.js (4)
 * attribution: placement 9
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, _enum, record, stringSchema, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { capPermissionUpdates_2 } from "../utils/permissions/permissionAnswer.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { REPL_TOOL_NAME, REPL_DISPLAY_NAME } from "../tools/REPLTool/constants.js";
import { POLL } from "../tools/PollTool/prompt.js";
import { isCodeModeExperimentEnabled } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z4r73bkw.js:528-791 placement
var bridgePermissionResponseSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-z4r73bkw.js:528", () => {
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
//@ chunk-z4r73bkw.js:791-1181 placement
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
//@ chunk-z4r73bkw.js:1181-1488 placement
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
//@ chunk-z4r73bkw.js:1488-1540 placement
function isDifferentString(value, other) {
  return typeof value === "string" && value !== other;
}
//@ chunk-z4r73bkw.js:1540-1685 placement
function humanizeToolName(toolName) {
  if (
    codeModeAccepted() &&
    (toolName === REPL_TOOL_NAME || (toolName === POLL && isCodeModeExperimentEnabled()))
  )
    return REPL_DISPLAY_NAME;
  return (toolName.split("__").pop() || toolName)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
//@ chunk-zn00h5j5.js:191-200 placement
var EMPTY_BRIDGE_TOOLS = [];
//@ chunk-zn00h5j5.js:200-939 placement
/**
 * 为桥接会话提供可用工具列表与是否允许、是否远程的判断（按工具状态隔离）。
 */
class BridgeToolProvider {
  #n = () => EMPTY_BRIDGE_TOOLS;
  #l = () => true;
  #t = () => false;
  #e = EMPTY_BRIDGE_TOOLS;
  #s = () => false;
  #o;
  #i = new WeakMap();
  provide(sourceTools, isPresentable = () => true, shouldHideMachine = () => false) {
    this.#n = sourceTools;
    this.#l = isPresentable;
    this.#t = shouldHideMachine;
    this.#o = undefined;
  }
  presentUntilAnnounced(pendingTools, isPresenting) {
    this.#e = pendingTools;
    this.#s = isPresenting;
    this.#o = undefined;
  }
  presentable() {
    return this.#l();
  }
  tools() {
    let sourceTools = this.#n();
    if (this.#e.some(({ machine }) => this.#t(machine))) {
      let filtered = this.#e.filter(({ machine }) => !this.#t(machine));
      this.#e = filtered.length > 0 ? filtered : EMPTY_BRIDGE_TOOLS;
    }
    let pendingTools = this.#s() ? this.#e : EMPTY_BRIDGE_TOOLS;
    if (this.#o === undefined || this.#o.source !== sourceTools || this.#o.pending !== pendingTools) {
      let mergedTools = [
        ...sourceTools,
        ...pendingTools.filter(
          ({ tool, machine }) =>
            !sourceTools.some((existing) => existing.machine === machine && existing.tool.name === tool.name),
        ),
      ];
      for (let { tool, machine } of mergedTools) this.#i.set(tool, machine);
      this.#o = {
        source: sourceTools,
        pending: pendingTools,
        tools: mergedTools.map(({ tool }) => tool),
      };
    }
    return this.#o.tools;
  }
  machineFor(tool) {
    this.tools();
    return this.#i.get(tool);
  }
}
//@ chunk-zn00h5j5.js:939-995 placement
function bridgeToolsOf(extension) {
  return extension.toolState?.get(BridgeToolProvider).tools() ?? EMPTY_BRIDGE_TOOLS_FALLBACK;
}
//@ chunk-zn00h5j5.js:995-1004 placement
var EMPTY_BRIDGE_TOOLS_FALLBACK = [];
export {
  isDifferentString,
  isValidBridgeToolName,
  BridgeToolProvider,
  humanizeToolName,
  parseBridgePermissionResponse,
  bridgeToolsOf,
};
