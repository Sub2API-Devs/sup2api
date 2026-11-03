/**
 * utils/advisor/advisorState.ts
 *
 * 2.1.316 新增：advisor 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mw4q1ac2.js (13)
 * attribution: placement 13
 */
import { classifyQuerySource } from "../../services/api/requestHeaders.js";
import {
  buildAdvisorToolAttachment,
  isAdvisorToolEnabled,
  baseModelSupportsAdvisor,
  getValidAdvisorAliases,
  canAdviseModelStrict,
  hasFullAdvisorNotice,
  resolveAdvisorModel,
  isAdvisorEnabled,
  canUseAsAdvisor,
  isSameModelFamilyId,
  canAdviseModel,
  canAdviseModelLenient,
} from "../advisor.js";
import { logError } from "../log.js";
import { isFirstPartyApiBackend } from "../model/providers.js";
import { isModelKnownServedToOrg } from "../model/modelAllowlist.js";
import { logForDebugging } from "../debug.js";
import { isUsageCreditsOnlyModel, parseUserSpecifiedModel } from "../model/modelDisplay.js";

//@ chunk-mw4q1ac2.js:422-506 placement
var C = { announcement: void 0, advisorModel: void 0, advisorDeferred: !1, advisorActive: !1 };
/**
 * 为一次查询计算 advisor（顾问模型）状态：按查询来源（主线程/辅助）、恢复状态与配置模型确定 advisor 模型，处理经工具变更加入/移除与回退，返回 advisorModel、advisorDeferred、advisorActive 及需要发出的 advisor_tool 附件；出错时返回空状态。
 */
//@ chunk-mw4q1ac2.js:506-1628 placement
function resolveAdvisorState(
  messages,
  o,
  {
    querySource: querySource,
    resumeActive: resumeActive,
    configuredRuntimeModel: configuredRuntimeModel,
    runtimeOptionsModel: runtimeOptionsModel,
    carrier: carrier,
    toolChangesRide: toolChangesRide,
  },
) {
  try {
    let r = typeof toolChangesRide === "function" ? toolChangesRide : () => toolChangesRide,
      b = classifyQuerySource(querySource),
      advisorSetting = o.getAdvisorSetting(),
      s = b === "main" ? configuredRuntimeModel : runtimeOptionsModel,
      m = r(runtimeOptionsModel),
      c = buildAdvisorToolAttachment(messages);
    if (resumeActive || b === "auxiliary") {
      let p =
          carrier?.advisorHeld ??
          tzn(c) ??
          chooseAdvisorModel(advisorSetting, s, configuredRuntimeModel, r(s)),
        h =
          p.model === void 0 && m && !p.refused
            ? { model: A(advisorSetting, s, configuredRuntimeModel), viaToolChange: !0 }
            : p;
      return finalizeAdvisorState(S(h, m), c, s, configuredRuntimeModel);
    }
    let held = carrier?.advisorHeld;
    if (held === void 0) {
      if (
        ((held = tzn(c) ?? chooseAdvisorModel(advisorSetting, s, configuredRuntimeModel, r(s))),
        carrier !== void 0)
      )
        carrier.advisorHeld = held;
    } else if (held.model === void 0 && m && !held.refused) {
      let p = A(advisorSetting, s, configuredRuntimeModel);
      if (p !== void 0) {
        if (((held = { model: p, viaToolChange: !0 }), carrier !== void 0)) carrier.advisorHeld = held;
      }
    }
    let F = S(held, m),
      q = held.viaToolChange && !m && held.inFallback !== !0,
      y = buildAdvisorAnnouncement(messages, advisorSetting, s, configuredRuntimeModel, F, q),
      N = held.model === void 0 || c !== void 0 || T(held.model, s, configuredRuntimeModel),
      B = m ? !1 : held.inFallback === !0 || N;
    if (carrier !== void 0 && held.viaToolChange && (held.inFallback === !0) !== B) {
      let { inFallback: inFallback, ...h } = held;
      carrier.advisorHeld = B ? { ...h, inFallback: !0 } : h;
    }
    let O =
      y === void 0
        ? c
        : y.available
          ? { available: !0, model: y.model, toolChange: y.toolChange !== void 0, byBase: !1 }
          : { available: !1, model: y.model, toolChange: y.toolChange !== void 0, byBase: y.byBase === !0 };
    return { ...finalizeAdvisorState(F, O, s, configuredRuntimeModel), announcement: y };
  } catch (error) {
    return (logError(error), C);
  }
}
//@ chunk-mw4q1ac2.js:1628-1747 placement
function advisorStateResult(e, o, i) {
  return {
    announcement: void 0,
    advisorModel: e,
    advisorDeferred: e !== void 0 && o,
    advisorActive: e !== void 0 && i,
  };
}
//@ chunk-mw4q1ac2.js:1747-1991 placement
function finalizeAdvisorState(e, o, i, u) {
  if (e.model === void 0 || !T(e.model, i, u)) return C;
  if (e.viaToolChange) return advisorStateResult(e.model, !0, o?.available === !0);
  if (e.standby && o === void 0) return C;
  if (o !== void 0 && !o.available && o.toolChange && !o.byBase) return C;
  return advisorStateResult(e.model, !1, !0);
}
//@ chunk-mw4q1ac2.js:1991-2060 placement
function S(e, o) {
  return e.viaToolChange && !o ? { ...e, viaToolChange: !1 } : e;
}
//@ chunk-mw4q1ac2.js:2060-2146 placement
function tzn(e) {
  if (e === void 0) return;
  return { model: e.model, viaToolChange: e.toolChange };
}
//@ chunk-mw4q1ac2.js:2146-2335 placement
function chooseAdvisorModel(e, o, i, u) {
  let d = A(e, o, i);
  if (d !== void 0 || !u || e) return { model: d, viaToolChange: u };
  let f = findStandbyAdvisorModel(o, i);
  return f === void 0 ? { model: void 0, viaToolChange: !0 } : { model: f, viaToolChange: !0, standby: !0 };
}
//@ chunk-mw4q1ac2.js:2335-2624 placement
function findStandbyAdvisorModel(e, o) {
  if (!isFirstPartyApiBackend() || !isAdvisorToolEnabled() || !baseModelSupportsAdvisor(e)) return;
  let i = getValidAdvisorAliases(),
    u = [...i.filter((d) => !k(d)), ...i.filter((d) => k(d))];
  for (let d of u) {
    let f = A(d, e, o);
    if (f === void 0 || !canAdviseModelStrict(e, f)) continue;
    if (isModelKnownServedToOrg(f)) return f;
    logForDebugging(`[AdvisorTool] No standby advisor entry - this org is not known to serve ${f}`);
    return;
  }
  return;
}
//@ chunk-mw4q1ac2.js:2624-2656 placement
function k(e) {
  return isUsageCreditsOnlyModel(parseUserSpecifiedModel(e));
}
/**
 * 根据当前 advisor 选择与上一条 advisor_tool 附件，决定是否需要发出新的 advisor_tool 附件（可用/不可用、add/remove 工具变更、简略形式），无变化时返回 undefined。
 */
//@ chunk-mw4q1ac2.js:2656-4176 placement
function buildAdvisorAnnouncement(messages, o, i, u, d, f = !1) {
  let n = buildAdvisorToolAttachment(messages),
    g = d ?? tzn(n) ?? { model: A(o, i, u), viaToolChange: !1 },
    model = g.model,
    b = lastAdvisorToolChange(messages) === "add";
  if (model === void 0 || !T(model, i, u)) {
    let c = g.viaToolChange || f,
      a = isAdvisorToolEnabled() && Boolean(o);
    if (n?.available !== !0) {
      if (!c || model === void 0 || n === void 0) return;
      if (n.byBase && !a) return { type: "advisor_tool", available: !1, model: model, toolChange: "remove" };
      if (n.toolChange && !n.byBase && a)
        return { type: "advisor_tool", available: !1, model: model, toolChange: "remove", byBase: !0 };
      return;
    }
    if (model === void 0) return { type: "advisor_tool", available: !1 };
    if (!c) return { type: "advisor_tool", available: !1, model: model, byBase: !0 };
    return a
      ? { type: "advisor_tool", available: !1, model: model, toolChange: "remove", byBase: !0 }
      : { type: "advisor_tool", available: !1, model: model, toolChange: "remove" };
  }
  let v = hasFullAdvisorNotice(messages);
  if (g.viaToolChange) {
    if (resolveAdvisorModel(o, i) === void 0)
      return b || n?.available === !0
        ? { type: "advisor_tool", available: !1, model: model, toolChange: "remove" }
        : void 0;
    if (b && n?.available !== !1)
      return v ? void 0 : { type: "advisor_tool", available: !0, model: model, toolChange: "add" };
    return v
      ? { type: "advisor_tool", available: !0, model: model, abbreviated: !0, toolChange: "add" }
      : { type: "advisor_tool", available: !0, model: model, toolChange: "add" };
  }
  let s = { type: "advisor_tool", available: !0, model: model },
    m = { ...s, abbreviated: !0 };
  if (f) {
    if (resolveAdvisorModel(o, i) === void 0)
      return n?.available === !0 || (n !== void 0 && n.byBase) || (n === void 0 && g.standby !== !0)
        ? { type: "advisor_tool", available: !1, model: model, toolChange: "remove" }
        : void 0;
    if (n?.available === !0) return v ? void 0 : s;
    return v ? m : s;
  }
  if (n === void 0) return g.standby ? void 0 : s;
  if (n.available) return v ? void 0 : s;
  if (n.toolChange && !n.byBase) return;
  return v ? m : s;
}
//@ chunk-mw4q1ac2.js:4176-4365 placement
function lastAdvisorToolChange(e) {
  for (let o = e.length - 1; o >= 0; o--) {
    let i = e[o];
    if (i.type === "attachment" && i.attachment.type === "advisor_tool" && i.attachment.toolChange !== void 0)
      return i.attachment.toolChange;
  }
  return;
}
//@ chunk-mw4q1ac2.js:4365-4441 placement
function T(e, o, i) {
  return (
    isAdvisorEnabled() &&
    canUseAsAdvisor(e) &&
    baseModelSupportsAdvisor(o) &&
    (isSameModelFamilyId(o, i) ? canAdviseModel(o, e) : canAdviseModelLenient(o, e))
  );
}
//@ chunk-mw4q1ac2.js:4441-4523 placement
function A(e, o, i) {
  let u = resolveAdvisorModel(e, o);
  return u !== void 0 && (isSameModelFamilyId(o, i) || canAdviseModelLenient(o, u)) ? u : void 0;
}

export { resolveAdvisorState, tzn };
