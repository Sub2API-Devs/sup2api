/**
 * cli/print/settingsValidationNotice.ts
 *
 * 2.1.316 新增：设置校验错误的格式化与上报
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (4)
 * attribution: placement 4
 */
import { isReportableDiagnostic } from "../../screens/Doctor.js";
import { getSettingsWithErrors_2, getPolicySettingsLoadErrors } from "../../utils/settings/settings.js";
import { helperSelectionWarnings } from "../../utils/settings/policyHelper/helperRemote.js";
import { logSkippedInvalidSetting } from "../../utils/settings/settingsErrorsHeadless.js";
import { logEvent } from "../../services/analytics/index.js";
import { settingsSourceLabel } from "../../utils/settings/settingsLabel.js";
import { SETTINGS_ERROR_NOTICE_LIMITS, SETTINGS_NOTICE_MAX_CHARS } from "./lateSessionStartHooks.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";

//@ chunk-tyg7f3ek.js:508695-509459 placement
/**
 * headless 启动时把配置文件校验错误（被跳过的设置项）输出给 stream-json 宿主。
 */
function reportSettingsValidationErrors(outputFormat) {
  let n = isReportableDiagnostic(getSettingsWithErrors_2().errors);
  if (n.length === 0) return;
  let r = new Set([...getPolicySettingsLoadErrors(), ...helperSelectionWarnings()].map(settingsErrorKey));
  let filtered = n.filter((w) => !r.has(settingsErrorKey(w)));
  if (filtered.length === 0) return;
  let filtered_2 = filtered.filter((w) => w.severity !== "warning");
  let y = new Set(filtered_2.map((w) => w.file));
  let filtered_3 = filtered.filter((w) => !y.has(w.file));
  logSkippedInvalidSetting(filtered);
  logEvent("tengu_own_settings_validation_errors", {
    not_loaded_file_count: y.size,
    skipped_entry_count: filtered_3.length,
  });
  if (outputFormat === "json" || outputFormat === "stream-json") return;
  let R = [];
  if (filtered_2.length > 0)
    R.push(`These settings files did not load, so nothing in them is in effect, including hooks and permission rules. Each loads again once the problem listed for it is fixed:
${formatSettingsErrors(filtered_2)}`);
  if (filtered_3.length > 0)
    R.push(`These settings entries were skipped; the rest of each file is in effect:
${formatSettingsErrors(filtered_3)}`);
  process.stderr.write(`${R.join(`
`)}
`);
}
//@ chunk-tyg7f3ek.js:509459-509515 placement
function settingsErrorKey(e) {
  return `${e.file}:${e.path}:${e.message}`;
}
//@ chunk-tyg7f3ek.js:509515-509781 placement
function formatSettingsErrors(e) {
  let n = [];
  for (let [r, s] of Map.groupBy(e, (h) => h.file)) {
    let h = sanitizeNoticeText(settingsSourceLabel(r));
    for (let y of s.slice(0, SETTINGS_ERROR_NOTICE_LIMITS)) {
      let S = sanitizeNoticeText(y.path);
      n.push(`  ${h}${S ? ` (${S})` : ""}: ${sanitizeNoticeText(y.message)}`);
    }
    if (s.length > SETTINGS_ERROR_NOTICE_LIMITS)
      n.push(`  \u2026 and ${s.length - SETTINGS_ERROR_NOTICE_LIMITS} more in ${h}`);
  }
  return n.join(`
`);
}
//@ chunk-tyg7f3ek.js:509781-509827 placement
function sanitizeNoticeText(e) {
  return sanitizeDisplayText(e, {
    maxCodeUnits: SETTINGS_NOTICE_MAX_CHARS,
  });
}
export { reportSettingsValidationErrors };
