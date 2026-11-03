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
  hl,
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

//@ chunk-hwmsct5x.js:231889-232301 placement
var CYBER_SAFEGUARDS_URL =
    "https://support.claude.com/en/articles/14604842-real-time-cyber-safeguards-on-claude",
  gci =
    "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate cybersecurity work.",
  hci = "Switch models when a message is flagged",
  TENGU_JAZZY_GOBLET = "tengu_jazzy_goblet",
  Bie = {
    switchAutomatically: "Switch automatically",
    askEachTime: "Ask each time",
    notAskedYet: "Not asked yet",
  };
//@ chunk-hwmsct5x.js:232301-232444 placement
function setSwitchModelsOnFlag(e, n, r) {
  return (
    logEvent("tengu_refusal_fallback_setting_changed", { enabled: e, via: fromEnum(n) }),
    updateSettingsForSource("userSettings", { switchModelsOnFlag: e }, void 0, r)
  );
}
//@ chunk-hwmsct5x.js:232444-232471 placement
function Eir() {
  return isRefusalFallbackEnabled();
}
//@ chunk-hwmsct5x.js:232471-232772 placement
var SAFEGUARD_CATEGORY_LEADS = {
  bio: "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate biology tasks.",
  cyber:
    "Our intentionally broad safeguards allow us to deliver more capabilities faster, but can sometimes flag legitimate coding and cybersecurity tasks.",
};
//@ chunk-hwmsct5x.js:232772-232847 placement
function wb(e, n) {
  return `${e}'s safeguards flagged this message. ${SAFEGUARD_CATEGORY_LEADS[n]}`;
}
//@ chunk-hwmsct5x.js:232847-232977 placement
function formatRefusalDetails(e) {
  if (typeof e !== "string") return "";
  let n = sanitizeDisplayText(e, { drop: /[`\[\]]/g, maxCodeUnits: MAX_TITLE_LENGTH });
  return n
    ? `

Details: \`[${n}]\``
    : "";
}
//@ chunk-hwmsct5x.js:232977-233089 placement
var GENERIC_SAFEGUARD_MESSAGE =
  "This model's safeguards flagged this message. This sometimes happens with safe, normal conversations.";
//@ chunk-hwmsct5x.js:233089-233208 placement
function safeguardsFlaggedLead(e) {
  return `${e}'s safeguards flagged this message. This sometimes happens with safe, normal conversations.`;
}
//@ chunk-hwmsct5x.js:233208-234089 placement
var SAFEGUARD_FIRST_TIME_NOTES = "this session",
  Cc = {
    cyber: (e, n) =>
      `You may be seeing this for the first time${n}: ${e} is more capable and has stronger safeguards as a result, which can sometimes flag non-cybersecurity work. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
    bio: (e, n) =>
      `You may be seeing this for the first time${n}: ${e} is more capable and has stronger safeguards as a result, which can sometimes flag biology-research-adjacent work. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
    frontier_llm: (e, n) =>
      `You may be seeing this for the first time${n}: ${e} is more capable and has stronger safeguards as a result. We're improving these safeguards to reduce the amount of incorrectly flagged messages.`,
  },
  Ic = {
    sonnet: {
      categories: ["cyber"],
      recoveryAfterGeneralLead: ["frontier_llm"],
      firstTimeOn: " on a Sonnet model",
    },
  };
//@ chunk-hwmsct5x.js:234089-234180 placement
function ml(e) {
  let n = getCatalogEntry(strippedCanonicalName(e))?.family;
  return n !== void 0 && Object.hasOwn(Ic, n) ? Ic[n] : void 0;
}
//@ chunk-hwmsct5x.js:234180-234216 placement
var vb = new Set(["claude-opus-5-5"]);
//@ chunk-hwmsct5x.js:234216-234268 placement
function Rb(e) {
  return vb.has(strippedCanonicalName(e)) || ml(e) !== void 0;
}
//@ chunk-hwmsct5x.js:234268-234434 placement
var FALLBACK_RECOVERY_LINES = {
  switched: (e) => `${e.fallback} is answering instead, or you can edit and retry with ${e.model}.`,
  paused: (e) => `Edit and retry, or continue with ${e.fallback}.`,
};
//@ chunk-hwmsct5x.js:234434-234649 placement
function categoryLeadFormatter(e, n) {
  if (e == null || typeof n !== "string" || hl(e) || !Rb(e)) return;
  let r = ml(e);
  if (r !== void 0 && !r.categories.includes(n)) return;
  let s = Object.hasOwn(Cc, n) ? Cc[n] : void 0,
    h = r?.firstTimeOn ?? "";
  return s && ((y) => s(y, h));
}
//@ chunk-hwmsct5x.js:234649-234760 placement
function formatSafeguardLead(e, n, r, s = "") {
  let h = categoryLeadFormatter(n, r);
  return h === void 0 ? void 0 : `${e}'s safeguards flagged ${SAFEGUARD_FIRST_TIME_NOTES}${s}. ${h(e)}`;
}
/**
 * 安全拦截后，若给定行动属于该类别可在通用说明后补充的恢复办法，返回对应的恢复提示行。
 */
//@ chunk-hwmsct5x.js:234760-234918 placement
function safeguardRecoveryLine(state, names, model, category) {
  if (model == null || typeof category !== "string" || hl(model)) return;
  return categoryLeadFormatter(model, category) !== void 0 ||
    ml(model)?.recoveryAfterGeneralLead.includes(category) === !0
    ? FALLBACK_RECOVERY_LINES[state](names)
    : void 0;
}
//@ chunk-hwmsct5x.js:234918-234980 placement
function getSafeguardLead(e, n, r) {
  return formatSafeguardLead(e, n, r) ?? (isHardRefusalCategory(r) ? wb(e, r) : safeguardsFlaggedLead(e));
}
//@ chunk-hwmsct5x.js:234980-235072 placement
function zc(e, n, r) {
  return (
    safeguardRecoveryLine("switched", { model: renderModelName(e), fallback: n }, e, r) ?? `Switched to ${n}.`
  );
}
/**
 * 生成"某模型的安全机制标记了此消息"的用户提示（类别说明、可选切换建议、了解更多链接）。
 */
//@ chunk-hwmsct5x.js:235072-235170 placement
function buildRefusalMessage(e, n, r) {
  let s = renderModelName(n),
    h = getSafeguardLead(renderModelName(e), e, r),
    y = zc(e, s, r);
  return `${h} ${y} ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`;
}
//@ chunk-hwmsct5x.js:235170-235325 placement
function buildFallbackGeneratedNotice(e, n, r) {
  let s = renderModelName(n);
  return `${getSafeguardLead(renderModelName(e), e, r)} This response was generated by ${s} instead. Your session model is unchanged. ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`;
}
//@ chunk-hwmsct5x.js:235325-235472 placement
function buildFallbackCompletedNotice(e, n, r) {
  let s = renderModelName(n);
  return `${getSafeguardLead(renderModelName(e), e, r)} This response was completed by ${s}. Your session model is unchanged. ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`;
}
//@ chunk-hwmsct5x.js:235472-235570 placement
function bci(e, n, r) {
  let s = renderModelName(n),
    h = getSafeguardLead(renderModelName(e), e, r),
    y = zc(e, s, r);
  return `${h} ${y} ${buildSafeguardsLearnMore(e)}${formatRefusalDetails(r)}`;
}
//@ chunk-hwmsct5x.js:235570-235717 placement
function getActiveModelFallback() {
  let e = getRefusalFallbackModelLatch();
  if (e === void 0 || getMainLoopModelOverride() !== e.fallbackModel) return;
  return { previousModel: e.previousAppStateModel, fallbackModel: e.fallbackModel };
}
//@ chunk-hwmsct5x.js:235717-235949 placement
function isFallbackServedRequest({
  requestModel: requestModel,
  turnRefusalOverride: turnRefusalOverride,
  chainStepModel: chainStepModel,
  userModel: userModel,
}) {
  try {
    let h = strippedCanonicalName(requestModel),
      w =
        strippedCanonicalName(userModel) !== h &&
        [turnRefusalOverride, chainStepModel].some((E) => E !== void 0 && strippedCanonicalName(E) === h),
      S = getActiveModelFallback();
    return w || (S !== void 0 && strippedCanonicalName(S.fallbackModel) === h);
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-hwmsct5x.js:235949-236067 placement
function describeAutoSwitchedModel(e) {
  return `automatically switched from ${e} after a message was flagged \u2014 run /model to switch back`;
}

export {
  getActiveModelFallback,
  describeAutoSwitchedModel,
  buildRefusalMessage,
  Eir,
  formatRefusalDetails,
  GENERIC_SAFEGUARD_MESSAGE,
  getSafeguardLead,
  safeguardRecoveryLine,
  isFallbackServedRequest,
  buildFallbackGeneratedNotice,
  formatSafeguardLead,
  SAFEGUARD_CATEGORY_LEADS,
  CYBER_SAFEGUARDS_URL,
  gci,
  buildFallbackCompletedNotice,
  bci,
  TENGU_JAZZY_GOBLET,
  Bie,
  setSwitchModelsOnFlag,
  hci,
};
