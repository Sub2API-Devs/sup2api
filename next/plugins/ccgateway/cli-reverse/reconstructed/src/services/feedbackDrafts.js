/**
 * services/feedbackDrafts.ts
 *
 * 2.1.316 新增。反馈草稿存储。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mt24sg6g.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-mt24sg6g.js:518-574 placement
/**
 * 取用户设置 feedbackDrafts 的值（默认 notify）。
 */
function getFeedbackDraftsSetting() {
  return getSecuritySensitiveSetting("feedbackDrafts")[0] ?? "notify";
}
//@ chunk-mt24sg6g.js:574-814 placement
/**
 * 产品反馈允许、非无头宿主、非嵌入式搜索、第一方 API 且未被环境变量关闭时，按特性开关决定是否启用反馈中继。
 */
function isFeedbackRelayEnabled() {
  if (checkProductFeedbackAllowed() !== null) return false;
  if (isHeadlessHostEntrypoint()) return false;
  if (hasEmbeddedSearchTools_2()) return false;
  if (getAPIProvider() !== "firstParty") return false;
  let CLAUDE_CODE_SEND_FEEDBACK = env.CLAUDE_CODE_SEND_FEEDBACK;
  if (CLAUDE_CODE_SEND_FEEDBACK === false) return false;
  if (CLAUDE_CODE_SEND_FEEDBACK === true)
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_relay", false);
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_relay", false);
}
//@ chunk-mt24sg6g.js:814-856 placement
/**
 * 反馈草稿功能是否启用：设置不是 off 且反馈中继可用。
 */
function isFeedbackDraftsEnabled() {
  return getFeedbackDraftsSetting() !== "off" && isFeedbackRelayEnabled();
}
//@ chunk-mt24sg6g.js:856-1073 placement
/**
 * 写入用户设置 feedbackDrafts（可走存储 v5），并上报变更来源。
 */
function setFeedbackDraftsSetting(value, { storageV5, via }) {
  let result =
    isStorageV5Enabled() && storageV5 !== undefined
      ? updateSettingsForSource(
          "userSettings",
          {
            feedbackDrafts: value,
          },
          undefined,
          storageV5,
        )
      : updateSettingsForSource("userSettings", {
          feedbackDrafts: value,
        });
  logEvent("tengu_feedback_drafts_setting_changed", {
    value: fromEnum(value),
    via: fromEnum(via),
  });
  return result;
}
export {
  isFeedbackDraftsEnabled,
  getFeedbackDraftsSetting,
  setFeedbackDraftsSetting,
  isFeedbackRelayEnabled,
};
