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
import { u, _enum, record, string, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { capPermissionUpdates_2 } from "../utils/permissions/permissionAnswer.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-z4hdycrw.js:380-643 placement
var bridgePermissionResponseSchema = DoctorLazy(() =>
  u({
    behavior: _enum(["allow", "deny"]),
    updatedInput: record(string(), unknown())
      .optional()
      .transform((e) => (e && Object.keys(e).length === 0 ? undefined : e)),
    updatedPermissions: capPermissionUpdates_2("refused", "bridge client"),
    message: string().optional().catch(undefined),
    toolName: string().optional().catch(undefined),
  }),
);
//@ chunk-z4hdycrw.js:643-1033 placement
function parseBridgePermissionResponse(response) {
  let n = bridgePermissionResponseSchema().safeParse(response);
  if (!n.success) {
    logForDebugging(
      `Malformed bridge permission response ignored: ${n.error.issues[0]?.message ?? "unknown"}`,
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
    n.data.updatedPermissions === undefined
  )
    return {
      ...n.data,
      updatedPermissionsDropped: true,
    };
  return n.data;
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
function isDifferentString(e, n) {
  return typeof e === "string" && e !== n;
}
//@ chunk-z4hdycrw.js:1392-1494 placement
function humanizeToolName(name) {
  return (name.split("__").pop() || name).replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
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
  provide(e, n = () => true, s = () => false) {
    this.#s = e;
    this.#i = n;
    this.#n = s;
    this.#e = undefined;
  }
  presentUntilAnnounced(e, n) {
    this.#o = e;
    this.#r = n;
    this.#e = undefined;
  }
  presentable() {
    return this.#i();
  }
  tools() {
    let e = this.#s();
    if (this.#o.some(({ machine }) => this.#n(machine))) {
      let filtered = this.#o.filter(({ machine }) => !this.#n(machine));
      this.#o = filtered.length > 0 ? filtered : EMPTY_BRIDGE_TOOLS;
    }
    let n = this.#r() ? this.#o : EMPTY_BRIDGE_TOOLS;
    if (this.#e === undefined || this.#e.source !== e || this.#e.pending !== n) {
      let s = [
        ...e,
        ...n.filter(
          ({ tool, machine }) => !e.some((l) => l.machine === machine && l.tool.name === tool.name),
        ),
      ];
      for (let { tool, machine } of s) this.#t.set(tool, machine);
      this.#e = {
        source: e,
        pending: n,
        tools: s.map(({ tool }) => tool),
      };
    }
    return this.#e.tools;
  }
  machineFor(e) {
    this.tools();
    return this.#t.get(e);
  }
}
//@ chunk-z4hdycrw.js:2242-2298 placement
function bridgeToolsOf(e) {
  return e.toolState?.get(BridgeToolProvider).tools() ?? EMPTY_BRIDGE_TOOLS_FALLBACK;
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
