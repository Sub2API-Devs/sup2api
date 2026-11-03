/**
 * services/feedbackDrafts.ts
 *
 * 2.1.316 新增。反馈草稿存储。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sn9h1dxj.js (4)
 * attribution: placement 4
 */
import { getSecuritySensitiveSetting, updateSettingsForSource } from "../utils/settings/settings.js";
import { checkProductFeedbackAllowed } from "../commands/feedback/feedbackPolicy.js";
import { isHeadlessHostEntrypoint } from "../utils/entrypointKinds.js";
import { hasEmbeddedSearchTools_2 } from "../utils/embeddedTools.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { logEvent } from "./analytics/index.js";
import { fromEnum } from "./analytics/safeMetadata.js";

//@ chunk-sn9h1dxj.js:518-574 placement
function Kan() {
  return getSecuritySensitiveSetting("feedbackDrafts")[0] ?? "notify";
}
/**
 * 产品反馈允许、非无头宿主、非嵌入式搜索、第一方 API 且未被环境变量关闭时，按特性开关决定是否启用反馈中继。
 */
//@ chunk-sn9h1dxj.js:574-814 placement
function isFeedbackRelayEnabled() {
  if (checkProductFeedbackAllowed() !== null) return !1;
  if (isHeadlessHostEntrypoint()) return !1;
  if (hasEmbeddedSearchTools_2()) return !1;
  if (getAPIProvider() !== "firstParty") return !1;
  let CLAUDE_CODE_SEND_FEEDBACK = env.CLAUDE_CODE_SEND_FEEDBACK;
  if (CLAUDE_CODE_SEND_FEEDBACK === !1) return !1;
  if (CLAUDE_CODE_SEND_FEEDBACK === !0) return getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_relay", !1);
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_relay", !1);
}
//@ chunk-sn9h1dxj.js:814-856 placement
function R5() {
  return Kan() !== "off" && isFeedbackRelayEnabled();
}
/**
 * 写入用户设置 feedbackDrafts（可走存储 v5），并上报变更来源。
 */
//@ chunk-sn9h1dxj.js:856-1073 placement
function setFeedbackDraftsSetting(e, { storageV5: storageV5, via: via }) {
  let n =
    isStorageV5Enabled() && storageV5 !== void 0
      ? updateSettingsForSource("userSettings", { feedbackDrafts: e }, void 0, storageV5)
      : updateSettingsForSource("userSettings", { feedbackDrafts: e });
  return (logEvent("tengu_feedback_drafts_setting_changed", { value: fromEnum(e), via: fromEnum(via) }), n);
}

export { R5, Kan, setFeedbackDraftsSetting, isFeedbackRelayEnabled };
