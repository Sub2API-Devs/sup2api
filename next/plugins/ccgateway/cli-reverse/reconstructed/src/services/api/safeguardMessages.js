/**
 * services/api/safeguardMessages.ts
 *
 * 2.1.316 新增：安全机制拒绝的用户提示文案（类别说明、切换建议、了解更多）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (26)
 * attribution: placement 25, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { updateSettingsForSource } from "../../utils/settings/settings.js";
import {
  isRefusalFallbackEnabled,
  usesSecondSafeguardsArticle,
  isHardRefusalCategory,
  buildSafeguardsLearnMore,
} from "./refusalFallback.js";
import { sanitizeDisplayText, MAX_TITLE_LENGTH } from "../../utils/resultError.js";
import { lifeSciencesSuffix } from "../../utils/programUseCaseChoices.js";
import { getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getRefusalFallbackModelLatch, getMainLoopModelOverride } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:235402-235814 placement
/**
 * 安全机制提示的文案与开关：了解链接、宽泛性说明、切换模型标题、开关名与用户偏好标签。
 */
var CYBER_SAFEGUARDS_URL =
  "https://support.claude.com/en/articles/14604842-real-time-cyber-safeguards-on-claude";
var SAFEGUARDS_BROAD_NOTE =
  "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate cybersecurity work.";
var SWITCH_MODELS_WHEN_FLAGGED_TEXT = "Switch models when a message is flagged";
var TENGU_JAZZY_GOBLET = "tengu_jazzy_goblet";
var FALLBACK_PREFERENCE_LABELS = {
  switchAutomatically: "Switch automatically",
  askEachTime: "Ask each time",
  notAskedYet: "Not asked yet",
};
//@ chunk-vn3g7zt8.js:235814-235957 placement
function setSwitchModelsOnFlag(value, reason, source) {
  logEvent("tengu_refusal_fallback_setting_changed", {
    enabled: value,
    via: fromEnum(reason),
  });
  return updateSettingsForSource(
    "userSettings",
    {
      switchModelsOnFlag: value,
    },
    undefined,
    source,
  );
}
//@ chunk-vn3g7zt8.js:235957-235984 placement
/**
 * 导出函数 `isRefusalFallbackActive`：返回 isRefusalFallbackEnabled()。
 */
function isRefusalFallbackActive() {
  return isRefusalFallbackEnabled();
}
//@ chunk-vn3g7zt8.js:235984-236285 placement
var SAFEGUARD_CATEGORY_LEADS = {
  bio: "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate biology tasks.",
  cyber:
    "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate coding and cybersecurity tasks.",
};
//@ chunk-vn3g7zt8.js:236285-236360 placement
function categoryFlaggedLead(model, category) {
  return `${model}'s safeguards flagged this message. ${SAFEGUARD_CATEGORY_LEADS[category]}`;
}
//@ chunk-vn3g7zt8.js:236360-236489 placement
function formatRefusalDetails(category) {
  if (typeof category !== "string") return "";
  let cleaned = sanitizeDisplayText(category, {
    drop: /[`\[\]]/g,
    maxCodeUnits: MAX_TITLE_LENGTH,
  });
  return cleaned
    ? `

Details: \`[${cleaned}]\``
    : "";
}
//@ chunk-vn3g7zt8.js:236489-236530 layout
function formatErrorDetails(errorDetailText) {
  return `${formatRefusalDetails(errorDetailText)}${lifeSciencesSuffix(errorDetailText)}`;
}
//@ chunk-vn3g7zt8.js:236530-236642 placement
var GENERIC_SAFEGUARD_MESSAGE =
  "This model's safeguards flagged this message. This sometimes happens with safe, normal conversations.";
//@ chunk-vn3g7zt8.js:236642-236761 placement
function safeguardsFlaggedLead(model) {
  return `${model}'s safeguards flagged this message. This sometimes happens with safe, normal conversations.`;
}
//@ chunk-vn3g7zt8.js:236761-237642 placement
/**
 * 各安全类别（cyber/bio/frontier_llm）的首次提示文案，以及按模型族（sonnet）给出的类别与恢复后提示规则。
 */
var SAFEGUARD_FIRST_TIME_NOTES = "this session";
var FIRST_TIME_CATEGORY_NOTES = {
  cyber: (model, category) =>
    `You may be seeing this for the first time${category}: ${model} is more capable and has stronger safeguards as a result, which can sometimes flag non-cybersecurity work. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
  bio: (model, category) =>
    `You may be seeing this for the first time${category}: ${model} is more capable and has stronger safeguards as a result, which can sometimes flag biology-research-adjacent work. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
  frontier_llm: (model, category) =>
    `You may be seeing this for the first time${category}: ${model} is more capable and has stronger safeguards as a result. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
};
var FAMILY_SAFEGUARD_RULES = {
  sonnet: {
    categories: ["cyber"],
    recoveryAfterGeneralLead: ["frontier_llm"],
    firstTimeOn: " on a Sonnet model",
  },
};
//@ chunk-vn3g7zt8.js:237642-237733 placement
function familySafeguardRule(family) {
  let family_2 = getCatalogEntry(strippedCanonicalName(family))?.family;
  return family_2 !== undefined && Object.hasOwn(FAMILY_SAFEGUARD_RULES, family_2)
    ? FAMILY_SAFEGUARD_RULES[family_2]
    : undefined;
}
//@ chunk-vn3g7zt8.js:237733-237769 placement
var OPUS_55_FAMILY_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vn3g7zt8.js:237733", () => {
  OPUS_55_FAMILY_MODELS = new Set(["claude-opus-5-5"]);
});
//@ chunk-vn3g7zt8.js:237769-237821 placement
function hasFirstTimeSafeguardNote(info) {
  return OPUS_55_FAMILY_MODELS.has(strippedCanonicalName(info)) || familySafeguardRule(info) !== undefined;
}
//@ chunk-vn3g7zt8.js:237821-237987 placement
var FALLBACK_RECOVERY_LINES = {
  switched: (line) => `${line.fallback} is answering instead, or you can edit and retry with ${line.model}.`,
  paused: (line) => `Edit and retry, or continue with ${line.fallback}.`,
};
//@ chunk-vn3g7zt8.js:237987-238202 placement
function categoryLeadFormatter(model, category) {
  if (
    model == null ||
    typeof category !== "string" ||
    usesSecondSafeguardsArticle(model) ||
    !hasFirstTimeSafeguardNote(model)
  )
    return;
  let rule = familySafeguardRule(model);
  if (rule !== undefined && !rule.categories.includes(category)) return;
  let firstTimeNote = Object.hasOwn(FIRST_TIME_CATEGORY_NOTES, category)
    ? FIRST_TIME_CATEGORY_NOTES[category]
    : undefined;
  let firstTimeOn = rule?.firstTimeOn ?? "";
  return firstTimeNote && ((firstTime) => firstTimeNote(firstTime, firstTimeOn));
}
//@ chunk-vn3g7zt8.js:238202-238313 placement
function formatSafeguardLead(model, category, modelLabel, suffix = "") {
  let formatter = categoryLeadFormatter(category, modelLabel);
  return formatter === undefined
    ? undefined
    : `${model}'s safeguards flagged ${SAFEGUARD_FIRST_TIME_NOTES}${suffix}. ${formatter(model)}`;
}
//@ chunk-vn3g7zt8.js:238313-238471 placement
/**
 * 安全拦截后，若给定行动属于该类别可在通用说明后补充的恢复办法，返回对应的恢复提示行。
 */
function safeguardRecoveryLine(state, names, model, category) {
  if (model == null || typeof category !== "string" || usesSecondSafeguardsArticle(model)) return;
  return categoryLeadFormatter(model, category) !== undefined ||
    familySafeguardRule(model)?.recoveryAfterGeneralLead.includes(category) === true
    ? FALLBACK_RECOVERY_LINES[state](names)
    : undefined;
}
//@ chunk-vn3g7zt8.js:238471-238533 placement
function getSafeguardLead(fromModel, info, category) {
  return (
    formatSafeguardLead(fromModel, info, category) ??
    (isHardRefusalCategory(category)
      ? categoryFlaggedLead(fromModel, category)
      : safeguardsFlaggedLead(fromModel))
  );
}
//@ chunk-vn3g7zt8.js:238533-238625 placement
function switchedSafeguardLine(model, info, category) {
  return (
    safeguardRecoveryLine(
      "switched",
      {
        model: renderModelName(model),
        fallback: info,
      },
      model,
      category,
    ) ?? `Switched to ${info}.`
  );
}
//@ chunk-vn3g7zt8.js:238625-238723 placement
/**
 * 生成"某模型的安全机制标记了此消息"的用户提示（类别说明、可选切换建议、了解更多链接）。
 */
function buildRefusalMessage(fromModel, toModel, apiRefusalCategory) {
  let modelName = renderModelName(toModel);
  let safeguardLead = getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory);
  let line = switchedSafeguardLine(fromModel, modelName, apiRefusalCategory);
  return `${safeguardLead} ${line} ${buildSafeguardsLearnMore(fromModel)}${formatErrorDetails(apiRefusalCategory)}`;
}
//@ chunk-vn3g7zt8.js:238723-238878 placement
function buildFallbackGeneratedNotice(fromModel, toModel, apiRefusalCategory) {
  let modelName = renderModelName(toModel);
  return `${getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory)} This response was generated by ${modelName} instead. Your session model is unchanged. ${buildSafeguardsLearnMore(fromModel)}${formatErrorDetails(apiRefusalCategory)}`;
}
//@ chunk-vn3g7zt8.js:238878-239025 placement
function buildFallbackCompletedNotice(fromModel, toModel, apiRefusalCategory) {
  let toModelName = renderModelName(toModel);
  return `${getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory)} This response was completed by ${toModelName}. Your session model is unchanged. ${buildSafeguardsLearnMore(fromModel)}${formatErrorDetails(apiRefusalCategory)}`;
}
//@ chunk-vn3g7zt8.js:239025-239123 placement
/**
 * 导出函数 `safeguardsFlaggedMessage`：参数 e, n, r，返回 `${h} ${y} ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`。
 */
function safeguardsFlaggedMessage(fromModel, toModel, apiRefusalCategory) {
  let toModelName = renderModelName(toModel);
  let safeguardLead = getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory);
  let line = switchedSafeguardLine(fromModel, toModelName, apiRefusalCategory);
  return `${safeguardLead} ${line} ${buildSafeguardsLearnMore(fromModel)}${formatErrorDetails(apiRefusalCategory)}`;
}
//@ chunk-vn3g7zt8.js:239123-239270 placement
function getActiveModelFallback() {
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (
    refusalFallbackModelLatch === undefined ||
    getMainLoopModelOverride() !== refusalFallbackModelLatch.fallbackModel
  )
    return;
  return {
    previousModel: refusalFallbackModelLatch.previousAppStateModel,
    fallbackModel: refusalFallbackModelLatch.fallbackModel,
  };
}
//@ chunk-vn3g7zt8.js:239270-239502 placement
function isFallbackServedRequest({ requestModel, turnRefusalOverride, chainStepModel, userModel }) {
  try {
    let requestCanonical = strippedCanonicalName(requestModel);
    let compare =
      strippedCanonicalName(userModel) !== requestCanonical &&
      [turnRefusalOverride, chainStepModel].some(
        (candidate) => candidate !== undefined && strippedCanonicalName(candidate) === requestCanonical,
      );
    let activeModelFallback = getActiveModelFallback();
    return (
      compare ||
      (activeModelFallback !== undefined &&
        strippedCanonicalName(activeModelFallback.fallbackModel) === requestCanonical)
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-vn3g7zt8.js:239502-239620 placement
function describeAutoSwitchedModel(info) {
  return `automatically switched from ${info} after a message was flagged \u2014 run /model to switch back`;
}
export {
  isRefusalFallbackActive,
  buildRefusalMessage,
  getActiveModelFallback,
  describeAutoSwitchedModel,
  formatSafeguardLead,
  SAFEGUARD_CATEGORY_LEADS,
  CYBER_SAFEGUARDS_URL,
  SAFEGUARDS_BROAD_NOTE,
  formatErrorDetails,
  buildFallbackCompletedNotice,
  buildFallbackGeneratedNotice,
  safeguardsFlaggedMessage,
  GENERIC_SAFEGUARD_MESSAGE,
  getSafeguardLead,
  safeguardRecoveryLine,
  TENGU_JAZZY_GOBLET,
  FALLBACK_PREFERENCE_LABELS,
  setSwitchModelsOnFlag,
  isFallbackServedRequest,
  SWITCH_MODELS_WHEN_FLAGGED_TEXT,
};
