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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PrivacySettingsDialog, GroveDialog } from "../../components/grove/Grove.js";

/**
 * FALLBACK_MESSAGE：同旧版。
 */
//@ chunk-p3x5wbde.js:13680-13891 fingerprint = FALLBACK_MESSAGE (0.667)
var FALLBACK_MESSAGE =
    "Review and manage your privacy settings at https://claude.ai/settings/data-privacy-controls",
  FETCH_FAILED_MESSAGE =
    "Unable to fetch your privacy settings at this time. Check https://claude.ai/settings/data-privacy-controls";
/**
 * /privacy-settings 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-p3x5wbde.js:13891-14861 fingerprint = call (0.847)
async function call(onDone, context) {
  if (!(await isQualifiedForGrove(context.storageV5, context.credentials)))
    return (onDone(FALLBACK_MESSAGE), null);
  (updateGroveSettings_2.cache.clear?.(), getGroveNoticeConfig.cache.clear?.());
  let [r, c] = await Promise.all([
    updateGroveSettings_2(context.credentials),
    getGroveNoticeConfig(context.credentials),
  ]);
  if (!r.success || !c.success) return (onDone(FETCH_FAILED_MESSAGE), null);
  let o = r.data,
    settings = c.data;
  async function onDoneWithDecision(decision) {
    if (decision === "escape" || decision === "defer") {
      onDone("Privacy settings dialog dismissed", { display: "system" });
      return;
    }
    await onDoneWithSettingsCheck();
  }
  async function onDoneWithSettingsCheck() {
    let t = await updateGroveSettings_2(context.credentials);
    if (!t.success) {
      onDone(FETCH_FAILED_MESSAGE, { display: "system" });
      return;
    }
    let updatedSettings = t.data,
      m = updatedSettings.grove_enabled ? "true" : "false";
    if (
      (onDone(`"Help improve our AI models" set to ${m}.`),
      o.grove_enabled !== null && o.grove_enabled !== updatedSettings.grove_enabled)
    )
      logEvent("tengu_grove_policy_toggled", {
        state: updatedSettings.grove_enabled ?? void 0,
        location: lit("settings"),
      });
  }
  if (o.grove_enabled !== null) {
    let grove_locked_by_claude_science = settings.grove_locked_by_claude_science;
    return e(PrivacySettingsDialog, {
      settings: o,
      domainExcluded: settings.domain_excluded,
      lockedByClaudeScience: grove_locked_by_claude_science,
      onDone: grove_locked_by_claude_science
        ? () => onDone(void 0, { display: "skip" })
        : onDoneWithSettingsCheck,
    });
  }
  return e(GroveDialog, { showIfAlreadyViewed: !0, onDone: onDoneWithDecision, location: "settings" });
}
