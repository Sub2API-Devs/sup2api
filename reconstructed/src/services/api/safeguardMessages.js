/**
 * services/api/safeguardMessages.ts
 *
 * 2.1.316 新增：安全机制拒绝的用户提示文案（类别说明、切换建议、了解更多）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (25)
 * attribution: placement 25
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
import { getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { getRefusalFallbackModelLatch, getMainLoopModelOverride } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hwmsct5x.js:231889-232301 placement
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
//@ chunk-hwmsct5x.js:232301-232444 placement
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
//@ chunk-hwmsct5x.js:232444-232471 placement
/**
 * 导出函数 `isRefusalFallbackActive`：返回 isRefusalFallbackEnabled()。
 */
function isRefusalFallbackActive() {
  return isRefusalFallbackEnabled();
}
//@ chunk-hwmsct5x.js:232471-232772 placement
var SAFEGUARD_CATEGORY_LEADS = {
  bio: "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate biology tasks.",
  cyber:
    "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate coding and cybersecurity tasks.",
};
//@ chunk-hwmsct5x.js:232772-232847 placement
function categoryFlaggedLead(model, category) {
  return `${model}'s safeguards flagged this message. ${SAFEGUARD_CATEGORY_LEADS[category]}`;
}
//@ chunk-hwmsct5x.js:232847-232977 placement
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
//@ chunk-hwmsct5x.js:232977-233089 placement
var GENERIC_SAFEGUARD_MESSAGE =
  "This model's safeguards flagged this message. This sometimes happens with safe, normal conversations.";
//@ chunk-hwmsct5x.js:233089-233208 placement
function safeguardsFlaggedLead(model) {
  return `${model}'s safeguards flagged this message. This sometimes happens with safe, normal conversations.`;
}
//@ chunk-hwmsct5x.js:233208-234089 placement
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
//@ chunk-hwmsct5x.js:234089-234180 placement
function familySafeguardRule(family) {
  let family_2 = getCatalogEntry(strippedCanonicalName(family))?.family;
  return family_2 !== undefined && Object.hasOwn(FAMILY_SAFEGUARD_RULES, family_2)
    ? FAMILY_SAFEGUARD_RULES[family_2]
    : undefined;
}
//@ chunk-hwmsct5x.js:234180-234216 placement
var OPUS_55_FAMILY_MODELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hwmsct5x.js:234180", () => {
  OPUS_55_FAMILY_MODELS = new Set(["claude-opus-5-5"]);
});
//@ chunk-hwmsct5x.js:234216-234268 placement
function hasFirstTimeSafeguardNote(info) {
  return OPUS_55_FAMILY_MODELS.has(strippedCanonicalName(info)) || familySafeguardRule(info) !== undefined;
}
//@ chunk-hwmsct5x.js:234268-234434 placement
var FALLBACK_RECOVERY_LINES = {
  switched: (line) => `${line.fallback} is answering instead, or you can edit and retry with ${line.model}.`,
  paused: (line) => `Edit and retry, or continue with ${line.fallback}.`,
};
//@ chunk-hwmsct5x.js:234434-234649 placement
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
//@ chunk-hwmsct5x.js:234649-234760 placement
function formatSafeguardLead(model, category, modelLabel, suffix = "") {
  let formatter = categoryLeadFormatter(category, modelLabel);
  return formatter === undefined
    ? undefined
    : `${model}'s safeguards flagged ${SAFEGUARD_FIRST_TIME_NOTES}${suffix}. ${formatter(model)}`;
}
//@ chunk-hwmsct5x.js:234760-234918 placement
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
//@ chunk-hwmsct5x.js:234918-234980 placement
function getSafeguardLead(fromModel, info, category) {
  return (
    formatSafeguardLead(fromModel, info, category) ??
    (isHardRefusalCategory(category)
      ? categoryFlaggedLead(fromModel, category)
      : safeguardsFlaggedLead(fromModel))
  );
}
//@ chunk-hwmsct5x.js:234980-235072 placement
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
//@ chunk-hwmsct5x.js:235072-235170 placement
/**
 * 生成"某模型的安全机制标记了此消息"的用户提示（类别说明、可选切换建议、了解更多链接）。
 */
function buildRefusalMessage(fromModel, toModel, apiRefusalCategory) {
  let modelName = renderModelName(toModel);
  let safeguardLead = getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory);
  let line = switchedSafeguardLine(fromModel, modelName, apiRefusalCategory);
  return `${safeguardLead} ${line} ${buildSafeguardsLearnMore(fromModel)}${formatRefusalDetails(apiRefusalCategory)}`;
}
//@ chunk-hwmsct5x.js:235170-235325 placement
function buildFallbackGeneratedNotice(fromModel, toModel, apiRefusalCategory) {
  let modelName = renderModelName(toModel);
  return `${getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory)} This response was generated by ${modelName} instead. Your session model is unchanged. ${buildSafeguardsLearnMore(fromModel)}${formatRefusalDetails(apiRefusalCategory)}`;
}
//@ chunk-hwmsct5x.js:235325-235472 placement
function buildFallbackCompletedNotice(fromModel, toModel, apiRefusalCategory) {
  let toModelName = renderModelName(toModel);
  return `${getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory)} This response was completed by ${toModelName}. Your session model is unchanged. ${buildSafeguardsLearnMore(fromModel)}${formatRefusalDetails(apiRefusalCategory)}`;
}
//@ chunk-hwmsct5x.js:235472-235570 placement
/**
 * 导出函数 `safeguardsFlaggedMessage`：参数 e, n, r，返回 `${h} ${y} ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`。
 */
function safeguardsFlaggedMessage(fromModel, toModel, apiRefusalCategory) {
  let toModelName = renderModelName(toModel);
  let safeguardLead = getSafeguardLead(renderModelName(fromModel), fromModel, apiRefusalCategory);
  let line = switchedSafeguardLine(fromModel, toModelName, apiRefusalCategory);
  return `${safeguardLead} ${line} ${buildSafeguardsLearnMore(fromModel)}${formatRefusalDetails(apiRefusalCategory)}`;
}
//@ chunk-hwmsct5x.js:235570-235717 placement
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
//@ chunk-hwmsct5x.js:235717-235949 placement
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
//@ chunk-hwmsct5x.js:235949-236067 placement
function describeAutoSwitchedModel(info) {
  return `automatically switched from ${info} after a message was flagged \u2014 run /model to switch back`;
}
export {
  getActiveModelFallback,
  describeAutoSwitchedModel,
  buildRefusalMessage,
  isRefusalFallbackActive,
  formatRefusalDetails,
  GENERIC_SAFEGUARD_MESSAGE,
  getSafeguardLead,
  safeguardRecoveryLine,
  isFallbackServedRequest,
  buildFallbackGeneratedNotice,
  formatSafeguardLead,
  SAFEGUARD_CATEGORY_LEADS,
  CYBER_SAFEGUARDS_URL,
  SAFEGUARDS_BROAD_NOTE,
  buildFallbackCompletedNotice,
  safeguardsFlaggedMessage,
  TENGU_JAZZY_GOBLET,
  FALLBACK_PREFERENCE_LABELS,
  setSwitchModelsOnFlag,
  SWITCH_MODELS_WHEN_FLAGGED_TEXT,
};
