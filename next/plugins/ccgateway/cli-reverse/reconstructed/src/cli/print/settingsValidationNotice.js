/**
 * cli/print/settingsValidationNotice.ts
 *
 * 2.1.316 新增：设置校验错误的格式化与上报
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (4)
 * attribution: placement 4
 */
import { isReportableDiagnostic } from "../../screens/Doctor.js";
import { getSettingsWithErrors, getPolicySettingsLoadErrors } from "../../utils/settings/settings.js";
import { helperSelectionWarnings } from "../../utils/settings/policyHelper/helperRemote.js";
import { logSkippedInvalidSetting } from "../../utils/settings/settingsErrorsHeadless.js";
import { logEvent } from "../../services/analytics/index.js";
import { settingsSourceLabel } from "../../utils/settings/settingsLabel.js";
import { SETTINGS_ERROR_NOTICE_LIMITS, SETTINGS_NOTICE_MAX_CHARS } from "./lateSessionStartHooks.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";

//@ chunk-0yw3taqg.js:548020-548784 placement
/**
 * headless 启动时把配置文件校验错误（被跳过的设置项）输出给 stream-json 宿主。
 */
function reportSettingsValidationErrors(outputFormat) {
  let reportable = isReportableDiagnostic(getSettingsWithErrors().errors);
  if (reportable.length === 0) return;
  let knownKeys = new Set(
    [...getPolicySettingsLoadErrors(), ...helperSelectionWarnings()].map(settingsErrorKey),
  );
  let errors = reportable.filter((error) => !knownKeys.has(settingsErrorKey(error)));
  if (errors.length === 0) return;
  let errors_2 = errors.filter((error) => error.severity !== "warning");
  let errorFiles = new Set(errors_2.map((error) => error.file));
  let errors_3 = errors.filter((error) => !errorFiles.has(error.file));
  logSkippedInvalidSetting(errors);
  logEvent("tengu_own_settings_validation_errors", {
    not_loaded_file_count: errorFiles.size,
    skipped_entry_count: errors_3.length,
  });
  if (outputFormat === "json" || outputFormat === "stream-json") return;
  let lines = [];
  if (errors_2.length > 0)
    lines.push(`These settings files did not load, so nothing in them is in effect, including hooks and permission rules. Each loads again once the problem listed for it is fixed:
${formatSettingsErrors(errors_2)}`);
  if (errors_3.length > 0)
    lines.push(`These settings entries were skipped; the rest of each file is in effect:
${formatSettingsErrors(errors_3)}`);
  process.stderr.write(`${lines.join(`
`)}
`);
}
//@ chunk-0yw3taqg.js:548784-548840 placement
function settingsErrorKey(error) {
  return `${error.file}:${error.path}:${error.message}`;
}
//@ chunk-0yw3taqg.js:548840-549106 placement
function formatSettingsErrors(errors) {
  let lines = [];
  for (let [file, fileErrors] of Map.groupBy(errors, (error) => error.file)) {
    let label = sanitizeNoticeText(settingsSourceLabel(file));
    for (let error of fileErrors.slice(0, SETTINGS_ERROR_NOTICE_LIMITS)) {
      let path = sanitizeNoticeText(error.path);
      lines.push(`  ${label}${path ? ` (${path})` : ""}: ${sanitizeNoticeText(error.message)}`);
    }
    if (fileErrors.length > SETTINGS_ERROR_NOTICE_LIMITS)
      lines.push(`  \u2026 and ${fileErrors.length - SETTINGS_ERROR_NOTICE_LIMITS} more in ${label}`);
  }
  return lines.join(`
`);
}
//@ chunk-0yw3taqg.js:549106-549152 placement
function sanitizeNoticeText(text) {
  return sanitizeDisplayText(text, {
    maxCodeUnits: SETTINGS_NOTICE_MAX_CHARS,
  });
}
export { reportSettingsValidationErrors };
