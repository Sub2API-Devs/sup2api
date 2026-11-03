/**
 * utils/remoteTools/toolHostRouting.ts
 *
 * 2.1.316 新增：工具宿主路由
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import {
  $r,
  UFe,
  splitHostField,
  machineNameMatches,
  HT,
  Cf,
  hostFieldNotForwardedMessage,
  remoteToolCallsDisabledMessage,
  yO,
  $kn,
} from "../../bridge/deviceRegistration.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { eKe, ServedCallRegistry } from "./restartNotices.js";
import {
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabledCached,
} from "../../services/remoteTools/servingGates.js";
import { _2 } from "../../services/api/deferredToolsState.js";
import { XVe } from "../worktreeIsolation.js";
import { getToolRemoteExecution } from "../../Tool.js";

//@ chunk-e6aww6q8.js:1406520-1406548 placement
var RKo = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:1406548-1406620 placement
function PSe(e, n) {
  logEvent("tengu_tool_host_refused", { tool: sanitizeToolNameForAnalytics(e), reason: fromEnum(n) });
}
//@ chunk-e6aww6q8.js:1406620-1406711 placement
function $Xt(e, n) {
  return `${n} runs only in this session's ${e} environment; omit "${$r}".`;
}
/**
 * 在会话的宿主中找提供该工具的宿主。
 */
//@ chunk-e6aww6q8.js:1406711-1406826 placement
function findHostServingTool(e, n) {
  if (e === void 0) return;
  let peek = RKo.peek(e);
  return peek && [...peek.values()].find((s) => s.servedTools.has(n));
}
//@ chunk-e6aww6q8.js:1406826-1407661 placement
function resolveToolHost(e, n, r) {
  let s = findHostServingTool(r.session, e.name);
  if (s === void 0) return;
  let h = n[$r];
  if (typeof h === "string" && UFe(h))
    return {
      kind: "refused",
      reason: "named_own_process",
      dispatch: { where: "refused", message: $Xt(s.name, e.name) },
    };
  let { requested: requested, input: input } = splitHostField(n);
  if (requested === void 0 || requested === s.name)
    return { kind: "decided", dispatch: { where: "here", input: input } };
  if (machineNameMatches(requested, s.name))
    return r.toolState
      .get(ToolHostRegistry)
      .hosts()
      .some((w) => w.kind === "remote" && machineNameMatches(requested, w.name))
      ? {
          kind: "refused",
          reason: "ambiguous_spelling",
          dispatch: {
            where: "refused",
            message: `"${HT(requested)}" could name ${s.name} or an attached machine; the call did not run. Write the machine's name exactly as this session lists it.`,
          },
        }
      : { kind: "decided", dispatch: { where: "here", input: input } };
  return {
    kind: "names_other",
    refusal: {
      where: "refused",
      message: `No machine named "${HT(requested)}" is attached to this session. ${$Xt(s.name, e.name)}`,
    },
  };
}
/**
 * 路由工具调用；接管的重启调用不能路由到别处时拒绝并记录。
 */
//@ chunk-e6aww6q8.js:1407661-1408033 placement
async function routeToolCallWithAdoption(e, n, r, s, h) {
  let y = UXt(r, s),
    S = s === void 0 ? void 0 : y?.adopted(s),
    w = await routeToolCallToHost(e, CKo(e, n, S), r, h);
  if (w.where === "elsewhere" || s === void 0 || y === void 0 || S === void 0) return w;
  return (
    y.takeAdopted(s),
    y.remove(s),
    logEvent("tengu_remote_tool_restart_adoption_unroutable", {
      where: lit_2("here"),
      parked_at_restart: S.parkedAtRestart === !0,
    }),
    { where: "refused", message: eKe({ host: S.host }, S) }
  );
}
//@ chunk-e6aww6q8.js:1408033-1408104 placement
function UXt(e, n) {
  return n === void 0 || !isRemoteToolForwardingSwitchOn() ? void 0 : e.toolState.get(ServedCallRegistry);
}
//@ chunk-e6aww6q8.js:1408104-1408195 placement
function CKo(e, n, r) {
  return r !== void 0 && _2(e) && typeof n[$r] !== "string" ? { ...n, [$r]: r.host } : n;
}
//@ chunk-e6aww6q8.js:1408195-1408963 placement
async function routeToolCallToHost(e, n, r, s) {
  if (r.remoteCall !== void 0) {
    let w = findHostServingTool(r.session, e.name);
    if (w !== void 0)
      return (
        PSe(e.name, "serving_another_session"),
        {
          where: "refused",
          message: `${e.name} was not run: this session runs it on ${w.name}, and a call served for another session does not travel there.`,
        }
      );
  }
  let h = resolveToolHost(e, n, r);
  if (h?.kind === "refused") return (PSe(e.name, h.reason), h.dispatch);
  if (h?.kind === "decided") return h.dispatch;
  let remote = XVe().remote;
  if (h?.kind === "names_other" && (remote === void 0 || !remote.applies(e)))
    return (PSe(e.name, "machine_not_attached"), h.refusal);
  if (remote === void 0 || !remote.applies(e))
    return OSe(e) && Cf(n)
      ? {
          where: "refused",
          message: isRemoteToolForwardingEnabledCached()
            ? hostFieldNotForwardedMessage()
            : remoteToolCallsDisabledMessage(),
        }
      : { where: "here", input: n };
  let route = await remote.route(e, n, r, s);
  return route.kind === "local"
    ? { where: "here", input: route.input }
    : { where: "elsewhere", route: route, hosts: remote };
}
//@ chunk-e6aww6q8.js:1408963-1409008 placement
function OSe(e) {
  return yO() && getToolRemoteExecution(e).supported;
}
//@ chunk-e6aww6q8.js:1409008-1409084 placement
function jXt(e, n, r, s) {
  return OSe(e) && (Cf(n) || UXt(r, s)?.adopted(s) !== void 0);
}
//@ chunk-e6aww6q8.js:1409084-1409130 placement
function zCe(e) {
  if (!isRemoteToolForwardingSwitchOn()) return;
  return $kn(e);
}

export { zCe, jXt, routeToolCallWithAdoption, OSe };
