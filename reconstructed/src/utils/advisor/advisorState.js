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
/**
 * 空的顾问状态（无附件、无模型、未推迟、未激活）。
 */
var EMPTY_ADVISOR_STATE = {
  announcement: undefined,
  advisorModel: undefined,
  advisorDeferred: false,
  advisorActive: false,
};
//@ chunk-mw4q1ac2.js:506-1628 placement
/**
 * 为一次查询计算 advisor（顾问模型）状态：按查询来源（主线程/辅助）、恢复状态与配置模型确定 advisor 模型，处理经工具变更加入/移除与回退，返回 advisorModel、advisorDeferred、advisorActive 及需要发出的 advisor_tool 附件；出错时返回空状态。
 */
function resolveAdvisorState(
  messages,
  toolUseContext,
  { querySource, resumeActive, configuredRuntimeModel, runtimeOptionsModel, carrier, toolChangesRide },
) {
  try {
    let r = typeof toolChangesRide === "function" ? toolChangesRide : () => toolChangesRide;
    let b = classifyQuerySource(querySource);
    let advisorSetting = toolUseContext.getAdvisorSetting();
    let s = b === "main" ? configuredRuntimeModel : runtimeOptionsModel;
    let m = r(runtimeOptionsModel);
    let advisorToolAttachment = buildAdvisorToolAttachment(messages);
    if (resumeActive || b === "auxiliary") {
      let p =
        carrier?.advisorHeld ??
        advisorAttachmentToHeld(advisorToolAttachment) ??
        chooseAdvisorModel(advisorSetting, s, configuredRuntimeModel, r(s));
      let h =
        p.model === undefined && m && !p.refused
          ? {
              model: resolveAdvisorModelFor(advisorSetting, s, configuredRuntimeModel),
              viaToolChange: true,
            }
          : p;
      return finalizeAdvisorState(
        clearToolChangeFlag(h, m),
        advisorToolAttachment,
        s,
        configuredRuntimeModel,
      );
    }
    let held = carrier?.advisorHeld;
    if (held === undefined) {
      held =
        advisorAttachmentToHeld(advisorToolAttachment) ??
        chooseAdvisorModel(advisorSetting, s, configuredRuntimeModel, r(s));
      if (carrier !== undefined) carrier.advisorHeld = held;
    } else if (held.model === undefined && m && !held.refused) {
      let advisorModelFor = resolveAdvisorModelFor(advisorSetting, s, configuredRuntimeModel);
      if (advisorModelFor !== undefined) {
        held = {
          model: advisorModelFor,
          viaToolChange: true,
        };
        if (carrier !== undefined) carrier.advisorHeld = held;
      }
    }
    let F = clearToolChangeFlag(held, m);
    let q = held.viaToolChange && !m && held.inFallback !== true;
    let advisorAnnouncement = buildAdvisorAnnouncement(
      messages,
      advisorSetting,
      s,
      configuredRuntimeModel,
      F,
      q,
    );
    let N =
      held.model === undefined ||
      advisorToolAttachment !== undefined ||
      canUseAdvisorFor(held.model, s, configuredRuntimeModel);
    let B = m ? false : held.inFallback === true || N;
    if (carrier !== undefined && held.viaToolChange && (held.inFallback === true) !== B) {
      let { inFallback, ...h } = held;
      carrier.advisorHeld = B
        ? {
            ...h,
            inFallback: true,
          }
        : h;
    }
    let O =
      advisorAnnouncement === undefined
        ? advisorToolAttachment
        : advisorAnnouncement.available
          ? {
              available: true,
              model: advisorAnnouncement.model,
              toolChange: advisorAnnouncement.toolChange !== undefined,
              byBase: false,
            }
          : {
              available: false,
              model: advisorAnnouncement.model,
              toolChange: advisorAnnouncement.toolChange !== undefined,
              byBase: advisorAnnouncement.byBase === true,
            };
    return {
      ...finalizeAdvisorState(F, O, s, configuredRuntimeModel),
      announcement: advisorAnnouncement,
    };
  } catch (error) {
    logError(error);
    return EMPTY_ADVISOR_STATE;
  }
}
//@ chunk-mw4q1ac2.js:1628-1747 placement
function advisorStateResult(model, o, i) {
  return {
    announcement: undefined,
    advisorModel: model,
    advisorDeferred: model !== undefined && o,
    advisorActive: model !== undefined && i,
  };
}
//@ chunk-mw4q1ac2.js:1747-1991 placement
function finalizeAdvisorState(e, o, i, configuredRuntimeModel) {
  if (e.model === undefined || !canUseAdvisorFor(e.model, i, configuredRuntimeModel))
    return EMPTY_ADVISOR_STATE;
  if (e.viaToolChange) return advisorStateResult(e.model, true, o?.available === true);
  if (e.standby && o === undefined) return EMPTY_ADVISOR_STATE;
  if (o !== undefined && !o.available && o.toolChange && !o.byBase) return EMPTY_ADVISOR_STATE;
  return advisorStateResult(e.model, false, true);
}
//@ chunk-mw4q1ac2.js:1991-2060 placement
/**
 * 不需要工具变更时清掉 viaToolChange 标记。
 */
function clearToolChangeFlag(e, o) {
  return e.viaToolChange && !o
    ? {
        ...e,
        viaToolChange: false,
      }
    : e;
}
//@ chunk-mw4q1ac2.js:2060-2146 placement
/**
 * 把上一条 advisor_tool 附件转成内部“已持有”状态。
 */
function advisorAttachmentToHeld(advisorToolAttachment) {
  if (advisorToolAttachment === undefined) return;
  return {
    model: advisorToolAttachment.model,
    viaToolChange: advisorToolAttachment.toolChange,
  };
}
//@ chunk-mw4q1ac2.js:2146-2335 placement
function chooseAdvisorModel(e, o, configuredRuntimeModel, u) {
  let advisorModelFor = resolveAdvisorModelFor(e, o, configuredRuntimeModel);
  if (advisorModelFor !== undefined || !u || e)
    return {
      model: advisorModelFor,
      viaToolChange: u,
    };
  let standbyAdvisorModel = findStandbyAdvisorModel(o, configuredRuntimeModel);
  return standbyAdvisorModel === undefined
    ? {
        model: undefined,
        viaToolChange: true,
      }
    : {
        model: standbyAdvisorModel,
        viaToolChange: true,
        standby: true,
      };
}
//@ chunk-mw4q1ac2.js:2335-2624 placement
function findStandbyAdvisorModel(e, o) {
  if (!isFirstPartyApiBackend() || !isAdvisorToolEnabled() || !baseModelSupportsAdvisor(e)) return;
  let validAdvisorAliases = getValidAdvisorAliases();
  let u = [
    ...validAdvisorAliases.filter((validAdvisorAlias) => !isCreditsOnlyModel(validAdvisorAlias)),
    ...validAdvisorAliases.filter((validAdvisorAlias) => isCreditsOnlyModel(validAdvisorAlias)),
  ];
  for (let d of u) {
    let advisorModelFor = resolveAdvisorModelFor(d, e, o);
    if (advisorModelFor === undefined || !canAdviseModelStrict(e, advisorModelFor)) continue;
    if (isModelKnownServedToOrg(advisorModelFor)) return advisorModelFor;
    logForDebugging(
      `[AdvisorTool] No standby advisor entry - this org is not known to serve ${advisorModelFor}`,
    );
    return;
  }
  return;
}
//@ chunk-mw4q1ac2.js:2624-2656 placement
/**
 * 判断模型是否只能走 usage credits。
 */
function isCreditsOnlyModel(validAdvisorAlias) {
  return isUsageCreditsOnlyModel(parseUserSpecifiedModel(validAdvisorAlias));
}
//@ chunk-mw4q1ac2.js:2656-4176 placement
/**
 * 根据当前 advisor 选择与上一条 advisor_tool 附件，决定是否需要发出新的 advisor_tool 附件（可用/不可用、add/remove 工具变更、简略形式），无变化时返回 undefined。
 */
function buildAdvisorAnnouncement(messages, o, i, configuredRuntimeModel, d, f = false) {
  let advisorToolAttachment = buildAdvisorToolAttachment(messages);
  let g = d ??
    advisorAttachmentToHeld(advisorToolAttachment) ?? {
      model: resolveAdvisorModelFor(o, i, configuredRuntimeModel),
      viaToolChange: false,
    };
  let model = g.model;
  let b = lastAdvisorToolChange(messages) === "add";
  if (model === undefined || !canUseAdvisorFor(model, i, configuredRuntimeModel)) {
    let viaToolChange = g.viaToolChange || f;
    let a = isAdvisorToolEnabled() && Boolean(o);
    if (advisorToolAttachment?.available !== true) {
      if (!viaToolChange || model === undefined || advisorToolAttachment === undefined) return;
      if (advisorToolAttachment.byBase && !a)
        return {
          type: "advisor_tool",
          available: false,
          model,
          toolChange: "remove",
        };
      if (advisorToolAttachment.toolChange && !advisorToolAttachment.byBase && a)
        return {
          type: "advisor_tool",
          available: false,
          model,
          toolChange: "remove",
          byBase: true,
        };
      return;
    }
    if (model === undefined)
      return {
        type: "advisor_tool",
        available: false,
      };
    if (!viaToolChange)
      return {
        type: "advisor_tool",
        available: false,
        model,
        byBase: true,
      };
    return a
      ? {
          type: "advisor_tool",
          available: false,
          model,
          toolChange: "remove",
          byBase: true,
        }
      : {
          type: "advisor_tool",
          available: false,
          model,
          toolChange: "remove",
        };
  }
  let v = hasFullAdvisorNotice(messages);
  if (g.viaToolChange) {
    if (resolveAdvisorModel(o, i) === undefined)
      return b || advisorToolAttachment?.available === true
        ? {
            type: "advisor_tool",
            available: false,
            model,
            toolChange: "remove",
          }
        : undefined;
    if (b && advisorToolAttachment?.available !== false)
      return v
        ? undefined
        : {
            type: "advisor_tool",
            available: true,
            model,
            toolChange: "add",
          };
    return v
      ? {
          type: "advisor_tool",
          available: true,
          model,
          abbreviated: true,
          toolChange: "add",
        }
      : {
          type: "advisor_tool",
          available: true,
          model,
          toolChange: "add",
        };
  }
  let s = {
    type: "advisor_tool",
    available: true,
    model,
  };
  let m = {
    ...s,
    abbreviated: true,
  };
  if (f) {
    if (resolveAdvisorModel(o, i) === undefined)
      return advisorToolAttachment?.available === true ||
        (advisorToolAttachment !== undefined && advisorToolAttachment.byBase) ||
        (advisorToolAttachment === undefined && g.standby !== true)
        ? {
            type: "advisor_tool",
            available: false,
            model,
            toolChange: "remove",
          }
        : undefined;
    if (advisorToolAttachment?.available === true) return v ? undefined : s;
    return v ? m : s;
  }
  if (advisorToolAttachment === undefined) return g.standby ? undefined : s;
  if (advisorToolAttachment.available) return v ? undefined : s;
  if (advisorToolAttachment.toolChange && !advisorToolAttachment.byBase) return;
  return v ? m : s;
}
//@ chunk-mw4q1ac2.js:4176-4365 placement
function lastAdvisorToolChange(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let i = messages[j];
    if (
      i.type === "attachment" &&
      i.attachment.type === "advisor_tool" &&
      i.attachment.toolChange !== undefined
    )
      return i.attachment.toolChange;
  }
  return;
}
//@ chunk-mw4q1ac2.js:4365-4441 placement
/**
 * 给定基础模型与顾问模型能否启用顾问（家族相同用严格判断，否则宽松）。
 */
function canUseAdvisorFor(model, o, i) {
  return (
    isAdvisorEnabled() &&
    canUseAsAdvisor(model) &&
    baseModelSupportsAdvisor(o) &&
    (isSameModelFamilyId(o, i) ? canAdviseModel(o, model) : canAdviseModelLenient(o, model))
  );
}
//@ chunk-mw4q1ac2.js:4441-4523 placement
/**
 * 解析可用的顾问模型（家族相同或宽松判断通过）。
 */
function resolveAdvisorModelFor(e, o, i) {
  let advisorModel = resolveAdvisorModel(e, o);
  return advisorModel !== undefined && (isSameModelFamilyId(o, i) || canAdviseModelLenient(o, advisorModel))
    ? advisorModel
    : undefined;
}
export { resolveAdvisorState, advisorAttachmentToHeld };
