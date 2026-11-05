/**
 * utils/advisor/advisorState.ts
 *
 * 2.1.316 新增：advisor 状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (1), chunk-yy7jv10y.js (12)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-7jxyna5q.js:64566-64757 placement
function lastAdvisorToolChange(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (
      message.type === "attachment" &&
      message.attachment.type === "advisor_tool" &&
      message.attachment.toolChange !== undefined
    )
      return message.attachment.toolChange;
  }
  return;
}
//@ chunk-yy7jv10y.js:426-510 placement
/**
 * 空的顾问状态（无附件、无模型、未推迟、未激活）。
 */
var EMPTY_ADVISOR_STATE = {
  announcement: undefined,
  advisorModel: undefined,
  advisorDeferred: false,
  advisorActive: false,
};
//@ chunk-yy7jv10y.js:510-1632 placement
/**
 * 为一次查询计算 advisor（顾问模型）状态：按查询来源（主线程/辅助）、恢复状态与配置模型确定 advisor 模型，处理经工具变更加入/移除与回退，返回 advisorModel、advisorDeferred、advisorActive 及需要发出的 advisor_tool 附件；出错时返回空状态。
 */
function resolveAdvisorState(
  messages,
  toolUseContext,
  { querySource, resumeActive, configuredRuntimeModel, runtimeOptionsModel, carrier, toolChangesRide },
) {
  try {
    let toolChangesRideFn = typeof toolChangesRide === "function" ? toolChangesRide : () => toolChangesRide;
    let querySourceKind = classifyQuerySource(querySource);
    let advisorSetting = toolUseContext.getAdvisorSetting();
    let effectiveModel = querySourceKind === "main" ? configuredRuntimeModel : runtimeOptionsModel;
    let toolChangeAllowed = toolChangesRideFn(runtimeOptionsModel);
    let toolAttachment = buildAdvisorToolAttachment(messages);
    if (resumeActive || querySourceKind === "auxiliary") {
      let heldAdvisor =
        carrier?.advisorHeld ??
        advisorAttachmentToHeld(toolAttachment) ??
        chooseAdvisorModel(
          advisorSetting,
          effectiveModel,
          configuredRuntimeModel,
          toolChangesRideFn(effectiveModel),
        );
      let heldWithToolChange =
        heldAdvisor.model === undefined && toolChangeAllowed && !heldAdvisor.refused
          ? {
              model: resolveAdvisorModelFor(advisorSetting, effectiveModel, configuredRuntimeModel),
              viaToolChange: true,
            }
          : heldAdvisor;
      return finalizeAdvisorState(
        clearToolChangeFlag(heldWithToolChange, toolChangeAllowed),
        toolAttachment,
        effectiveModel,
        configuredRuntimeModel,
      );
    }
    let held = carrier?.advisorHeld;
    if (held === undefined) {
      held =
        advisorAttachmentToHeld(toolAttachment) ??
        chooseAdvisorModel(
          advisorSetting,
          effectiveModel,
          configuredRuntimeModel,
          toolChangesRideFn(effectiveModel),
        );
      if (carrier !== undefined) carrier.advisorHeld = held;
    } else if (held.model === undefined && toolChangeAllowed && !held.refused) {
      let advisorModelFor = resolveAdvisorModelFor(advisorSetting, effectiveModel, configuredRuntimeModel);
      if (advisorModelFor !== undefined) {
        held = {
          model: advisorModelFor,
          viaToolChange: true,
        };
        if (carrier !== undefined) carrier.advisorHeld = held;
      }
    }
    let heldCleared = clearToolChangeFlag(held, toolChangeAllowed);
    let isToolChangePending = held.viaToolChange && !toolChangeAllowed && held.inFallback !== true;
    let advisorAnnouncement = buildAdvisorAnnouncement(
      messages,
      advisorSetting,
      effectiveModel,
      configuredRuntimeModel,
      heldCleared,
      isToolChangePending,
    );
    let canActivateAdvisor =
      held.model === undefined ||
      toolAttachment !== undefined ||
      canUseAdvisorFor(held.model, effectiveModel, configuredRuntimeModel);
    let inFallback = toolChangeAllowed ? false : held.inFallback === true || canActivateAdvisor;
    if (carrier !== undefined && held.viaToolChange && (held.inFallback === true) !== inFallback) {
      let { inFallback: inFallback_2, ...heldRest } = held;
      carrier.advisorHeld = inFallback
        ? {
            ...heldRest,
            inFallback: true,
          }
        : heldRest;
    }
    let effectiveAttachment =
      advisorAnnouncement === undefined
        ? toolAttachment
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
      ...finalizeAdvisorState(heldCleared, effectiveAttachment, effectiveModel, configuredRuntimeModel),
      announcement: advisorAnnouncement,
    };
  } catch (error) {
    logError(error);
    return EMPTY_ADVISOR_STATE;
  }
}
//@ chunk-yy7jv10y.js:1632-1751 placement
function advisorStateResult(model, isDeferred, isActive) {
  return {
    announcement: undefined,
    advisorModel: model,
    advisorDeferred: model !== undefined && isDeferred,
    advisorActive: model !== undefined && isActive,
  };
}
//@ chunk-yy7jv10y.js:1751-1995 placement
function finalizeAdvisorState(heldAdvisor, toolAttachment, effectiveModel, configuredRuntimeModel) {
  if (
    heldAdvisor.model === undefined ||
    !canUseAdvisorFor(heldAdvisor.model, effectiveModel, configuredRuntimeModel)
  )
    return EMPTY_ADVISOR_STATE;
  if (heldAdvisor.viaToolChange)
    return advisorStateResult(heldAdvisor.model, true, toolAttachment?.available === true);
  if (heldAdvisor.standby && toolAttachment === undefined) return EMPTY_ADVISOR_STATE;
  if (
    toolAttachment !== undefined &&
    !toolAttachment.available &&
    toolAttachment.toolChange &&
    !toolAttachment.byBase
  )
    return EMPTY_ADVISOR_STATE;
  return advisorStateResult(heldAdvisor.model, false, true);
}
//@ chunk-yy7jv10y.js:1995-2064 placement
/**
 * 不需要工具变更时清掉 viaToolChange 标记。
 */
function clearToolChangeFlag(heldAdvisor, toolChangeAllowed) {
  return heldAdvisor.viaToolChange && !toolChangeAllowed
    ? {
        ...heldAdvisor,
        viaToolChange: false,
      }
    : heldAdvisor;
}
//@ chunk-yy7jv10y.js:2064-2150 placement
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
//@ chunk-yy7jv10y.js:2150-2339 placement
function chooseAdvisorModel(advisorSetting, effectiveModel, configuredRuntimeModel, toolChangeAllowed) {
  let advisorModelFor = resolveAdvisorModelFor(advisorSetting, effectiveModel, configuredRuntimeModel);
  if (advisorModelFor !== undefined || !toolChangeAllowed || advisorSetting)
    return {
      model: advisorModelFor,
      viaToolChange: toolChangeAllowed,
    };
  let standbyAdvisorModel = findStandbyAdvisorModel(effectiveModel, configuredRuntimeModel);
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
//@ chunk-yy7jv10y.js:2339-2628 placement
function findStandbyAdvisorModel(baseModel, configuredRuntimeModel) {
  if (!isFirstPartyApiBackend() || !isAdvisorToolEnabled() || !baseModelSupportsAdvisor(baseModel)) return;
  let validAdvisorAliases = getValidAdvisorAliases();
  let orderedAliases = [
    ...validAdvisorAliases.filter((validAdvisorAlias) => !isCreditsOnlyModel(validAdvisorAlias)),
    ...validAdvisorAliases.filter((validAdvisorAlias) => isCreditsOnlyModel(validAdvisorAlias)),
  ];
  for (let alias of orderedAliases) {
    let advisorModelFor = resolveAdvisorModelFor(alias, baseModel, configuredRuntimeModel);
    if (advisorModelFor === undefined || !canAdviseModelStrict(baseModel, advisorModelFor)) continue;
    if (isModelKnownServedToOrg(advisorModelFor)) return advisorModelFor;
    logForDebugging(
      `[AdvisorTool] No standby advisor entry - this org is not known to serve ${advisorModelFor}`,
    );
    return;
  }
  return;
}
//@ chunk-yy7jv10y.js:2628-2660 placement
/**
 * 判断模型是否只能走 usage credits。
 */
function isCreditsOnlyModel(validAdvisorAlias) {
  return isUsageCreditsOnlyModel(parseUserSpecifiedModel(validAdvisorAlias));
}
//@ chunk-yy7jv10y.js:2660-4182 placement
/**
 * 根据当前 advisor 选择与上一条 advisor_tool 附件，决定是否需要发出新的 advisor_tool 附件（可用/不可用、add/remove 工具变更、简略形式），无变化时返回 undefined。
 */
function buildAdvisorAnnouncement(
  messages,
  advisorSetting,
  effectiveModel,
  configuredRuntimeModel,
  heldOverride,
  forcedToolChange = false,
) {
  let advisorToolAttachment = buildAdvisorToolAttachment(messages);
  let heldAdvisor = heldOverride ??
    advisorAttachmentToHeld(advisorToolAttachment) ?? {
      model: resolveAdvisorModelFor(advisorSetting, effectiveModel, configuredRuntimeModel),
      viaToolChange: false,
    };
  let model = heldAdvisor.model;
  let isLastToolChangeAdd = lastAdvisorToolChange(messages) === "add";
  if (model === undefined || !canUseAdvisorFor(model, effectiveModel, configuredRuntimeModel)) {
    let viaToolChange = heldAdvisor.viaToolChange || forcedToolChange;
    let advisorEnabledForSetting = isAdvisorToolEnabled() && Boolean(advisorSetting);
    if (advisorToolAttachment?.available !== true) {
      if (!viaToolChange || model === undefined || advisorToolAttachment === undefined) return;
      if (advisorToolAttachment.byBase && !advisorEnabledForSetting)
        return {
          type: "advisor_tool",
          available: false,
          model,
          toolChange: "remove",
        };
      if (advisorToolAttachment.toolChange && !advisorToolAttachment.byBase && advisorEnabledForSetting)
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
    return advisorEnabledForSetting
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
  let hasFullNotice = hasFullAdvisorNotice(messages);
  if (heldAdvisor.viaToolChange) {
    if (resolveAdvisorModel(advisorSetting, effectiveModel) === undefined)
      return isLastToolChangeAdd || advisorToolAttachment?.available === true
        ? {
            type: "advisor_tool",
            available: false,
            model,
            toolChange: "remove",
          }
        : undefined;
    if (isLastToolChangeAdd && advisorToolAttachment?.available !== false)
      return hasFullNotice
        ? undefined
        : {
            type: "advisor_tool",
            available: true,
            model,
            toolChange: "add",
          };
    return hasFullNotice
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
  let fullAnnouncement = {
    type: "advisor_tool",
    available: true,
    model,
  };
  let abbreviatedAnnouncement = {
    ...fullAnnouncement,
    abbreviated: true,
  };
  if (forcedToolChange) {
    if (resolveAdvisorModel(advisorSetting, effectiveModel) === undefined)
      return advisorToolAttachment?.available === true ||
        (advisorToolAttachment !== undefined && advisorToolAttachment.byBase) ||
        (advisorToolAttachment === undefined && heldAdvisor.standby !== true)
        ? {
            type: "advisor_tool",
            available: false,
            model,
            toolChange: "remove",
          }
        : undefined;
    if (advisorToolAttachment?.available === true) return hasFullNotice ? undefined : fullAnnouncement;
    return hasFullNotice ? abbreviatedAnnouncement : fullAnnouncement;
  }
  if (advisorToolAttachment === undefined) return heldAdvisor.standby ? undefined : fullAnnouncement;
  if (advisorToolAttachment.available) return hasFullNotice ? undefined : fullAnnouncement;
  if (advisorToolAttachment.toolChange && !advisorToolAttachment.byBase) return;
  return hasFullNotice ? abbreviatedAnnouncement : fullAnnouncement;
}
//@ chunk-yy7jv10y.js:4182-4258 placement
/**
 * 给定基础模型与顾问模型能否启用顾问（家族相同用严格判断，否则宽松）。
 */
function canUseAdvisorFor(model, baseModel, configuredRuntimeModel) {
  return (
    isAdvisorEnabled() &&
    canUseAsAdvisor(model) &&
    baseModelSupportsAdvisor(baseModel) &&
    (isSameModelFamilyId(baseModel, configuredRuntimeModel)
      ? canAdviseModel(baseModel, model)
      : canAdviseModelLenient(baseModel, model))
  );
}
//@ chunk-yy7jv10y.js:4258-4340 placement
/**
 * 解析可用的顾问模型（家族相同或宽松判断通过）。
 */
function resolveAdvisorModelFor(advisorSetting, effectiveModel, configuredRuntimeModel) {
  let advisorModel = resolveAdvisorModel(advisorSetting, effectiveModel);
  return advisorModel !== undefined &&
    (isSameModelFamilyId(effectiveModel, configuredRuntimeModel) ||
      canAdviseModelLenient(effectiveModel, advisorModel))
    ? advisorModel
    : undefined;
}
export { lastAdvisorToolChange, advisorAttachmentToHeld, resolveAdvisorState };
