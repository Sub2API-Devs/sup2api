/**
 * commands/privacy-settings/privacy-settings.tsx
 *
 * /privacy-settings 实现：Grove 训练数据开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/privacy-settings/privacy-settings.tsx
 * pieces: chunk-p3x5wbde.js (2)
 * attribution: fingerprint 2
 */
import {
  isQualifiedForGrove,
  updateGroveSettings_2,
  getGroveNoticeConfig,
} from "../../services/api/grove.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PrivacySettingsDialog, GroveDialog } from "../../components/grove/Grove.js";

//@ chunk-p3x5wbde.js:13680-13891 fingerprint (2.1.88 match: FALLBACK_MESSAGE, 0.667)
/**
 * FALLBACK_MESSAGE：同旧版。
 */
var FALLBACK_MESSAGE =
  "Review and manage your privacy settings at https://claude.ai/settings/data-privacy-controls";
var FETCH_FAILED_MESSAGE =
  "Unable to fetch your privacy settings at this time. Check https://claude.ai/settings/data-privacy-controls";
//@ chunk-p3x5wbde.js:13891-14861 fingerprint (2.1.88 match: call, 0.847)
/**
 * /privacy-settings 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  if (!(await isQualifiedForGrove(context.storageV5, context.credentials))) {
    onDone(FALLBACK_MESSAGE);
    return null;
  }
  updateGroveSettings_2.cache.clear?.();
  getGroveNoticeConfig.cache.clear?.();
  let [settingsResult, configResult] = await Promise.all([
    updateGroveSettings_2(context.credentials),
    getGroveNoticeConfig(context.credentials),
  ]);
  if (!settingsResult.success || !configResult.success) {
    onDone(FETCH_FAILED_MESSAGE);
    return null;
  }
  let settings = settingsResult.data;
  let config = configResult.data;
  async function onDoneWithDecision(decision) {
    if (decision === "escape" || decision === "defer") {
      onDone("Privacy settings dialog dismissed", {
        display: "system",
      });
      return;
    }
    await onDoneWithSettingsCheck();
  }
  async function onDoneWithSettingsCheck() {
    let updatedSettingsResult = await updateGroveSettings_2(context.credentials);
    if (!updatedSettingsResult.success) {
      onDone(FETCH_FAILED_MESSAGE, {
        display: "system",
      });
      return;
    }
    let updatedSettings = updatedSettingsResult.data;
    let groveStatus = updatedSettings.grove_enabled ? "true" : "false";
    onDone(`"Help improve our AI models" set to ${groveStatus}.`);
    if (settings.grove_enabled !== null && settings.grove_enabled !== updatedSettings.grove_enabled)
      logEvent("tengu_grove_policy_toggled", {
        state: updatedSettings.grove_enabled ?? undefined,
        location: lit("settings"),
      });
  }
  if (settings.grove_enabled !== null) {
    let groveLockedByClaudeScience = config.grove_locked_by_claude_science;
    return jsxProd_default(PrivacySettingsDialog, {
      settings,
      domainExcluded: config.domain_excluded,
      lockedByClaudeScience: groveLockedByClaudeScience,
      onDone: groveLockedByClaudeScience
        ? () =>
            onDone(undefined, {
              display: "skip",
            })
        : onDoneWithSettingsCheck,
    });
  }
  return jsxProd_default(GroveDialog, {
    showIfAlreadyViewed: true,
    onDone: onDoneWithDecision,
    location: "settings",
  });
}
export { call };
