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
import { u, U, pe, o, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { capPermissionUpdates_2 } from "../utils/permissions/permissionAnswer.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-z4hdycrw.js:380-643 placement
var bridgePermissionResponseSchema = DoctorLazy(() =>
  u({
    behavior: U(["allow", "deny"]),
    updatedInput: pe(o(), oe())
      .optional()
      .transform((e) => (e && Object.keys(e).length === 0 ? void 0 : e)),
    updatedPermissions: capPermissionUpdates_2("refused", "bridge client"),
    message: o()
      .optional()
      .catch(void 0),
    toolName: o()
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-z4hdycrw.js:643-1033 placement
function parseBridgePermissionResponse(e) {
  let safeParse = bridgePermissionResponseSchema().safeParse(e);
  if (!safeParse.success) {
    (logForDebugging(
      `Malformed bridge permission response ignored: ${safeParse.error.issues[0]?.message ?? "unknown"}`,
      { level: "warn" },
    ),
      logFeatureBad("permission_bridge_relay", "permission_response_malformed"));
    return;
  }
  if (
    typeof e === "object" &&
    e !== null &&
    e.updatedPermissions !== void 0 &&
    safeParse.data.updatedPermissions === void 0
  )
    return { ...safeParse.data, updatedPermissionsDropped: !0 };
  return safeParse.data;
}
//@ chunk-z4hdycrw.js:1033-1340 placement
function isValidBridgeToolName(e, n, s) {
  if (typeof e !== "string") return !1;
  if (!isDifferentString(e, n)) return (logFeatureOk("bridge_permission_toolname_check"), !1);
  return (
    logForDebugging(
      `Ignoring can_use_tool control_response for request_id=${s}: toolName '${e}' does not match pending '${n}'`,
      { level: "warn" },
    ),
    logFeatureBad("bridge_permission_toolname_check", "toolname_mismatch"),
    !0
  );
}
//@ chunk-z4hdycrw.js:1340-1392 placement
function isDifferentString(e, n) {
  return typeof e === "string" && e !== n;
}
//@ chunk-z4hdycrw.js:1392-1494 placement
function humanizeToolName(e) {
  return (e.split("__").pop() || e).replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}
//@ chunk-z4hdycrw.js:1494-1503 placement
var r = [];
/**
 * 为桥接会话提供可用工具列表与是否允许、是否远程的判断（按工具状态隔离）。
 */
//@ chunk-z4hdycrw.js:1503-2242 placement
class BridgeToolProvider {
  #s = () => r;
  #i = () => !0;
  #n = () => !1;
  #o = r;
  #r = () => !1;
  #e;
  #t = new WeakMap();
  provide(e, n = () => !0, s = () => !1) {
    ((this.#s = e), (this.#i = n), (this.#n = s), (this.#e = void 0));
  }
  presentUntilAnnounced(e, n) {
    ((this.#o = e), (this.#r = n), (this.#e = void 0));
  }
  presentable() {
    return this.#i();
  }
  tools() {
    let e = this.#s();
    if (this.#o.some(({ machine: machine }) => this.#n(machine))) {
      let filtered = this.#o.filter(({ machine: machine }) => !this.#n(machine));
      this.#o = filtered.length > 0 ? filtered : r;
    }
    let n = this.#r() ? this.#o : r;
    if (this.#e === void 0 || this.#e.source !== e || this.#e.pending !== n) {
      let s = [
        ...e,
        ...n.filter(
          ({ tool: tool, machine: machine }) =>
            !e.some((l) => l.machine === machine && l.tool.name === tool.name),
        ),
      ];
      for (let { tool: tool, machine: machine } of s) this.#t.set(tool, machine);
      this.#e = { source: e, pending: n, tools: s.map(({ tool: tool }) => tool) };
    }
    return this.#e.tools;
  }
  machineFor(e) {
    return (this.tools(), this.#t.get(e));
  }
}
//@ chunk-z4hdycrw.js:2242-2298 placement
function bridgeToolsOf(e) {
  return e.toolState?.get(BridgeToolProvider).tools() ?? c;
}
//@ chunk-z4hdycrw.js:2298-2307 placement
var c = [];

export {
  isDifferentString,
  humanizeToolName,
  bridgeToolsOf,
  isValidBridgeToolName,
  BridgeToolProvider,
  parseBridgePermissionResponse,
};
