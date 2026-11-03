/**
 * utils/settings/settingsNotices.ts
 *
 * 设置提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pr8s5wf6.js (5)
 * attribution: placement 5
 */
import {
  getSettingsWithErrors_2,
  projectSettingsAliasesUserSettings,
  getSettingsForSource,
  getSettingsFilePathForSource,
  getRelativeSettingsFilePathForSource,
  getLocalSettingsValidationErrors,
} from "./settings.js";
import { MCP_SETTINGS_SCOPES, getMcpConfigsByScope } from "../../services/mcp/config.js";
import { describeMcpConfigFilePath } from "../../services/mcp/utils.js";
import { getGlobalConfig, DEFAULT_GLOBAL_CONFIG } from "../config.js";
import { USER_INTENT_SETTING_KEYS } from "./userIntentSettings.js";
import { isInvalidGlobalConfigValue, isAutoUploadFlagKey } from "../config/globalConfigValidation.js";
import { describeGlobalConfigFile } from "../env.js";
import { OTEL_ENV_VARS, isDangerousEnvVar, isDisablingTelemetryEnv } from "../managedEnvConstants.js";
import { getEnabledSettingSources } from "./constants.js";
import { getEnvAboveProjectSettings } from "../managedEnvApply.js";

//@ chunk-pr8s5wf6.js:524-1095 placement
function formatInvalidSettingNotice() {
  let settingsWithErrors = getSettingsWithErrors_2();
  let flattened = MCP_SETTINGS_SCOPES.flatMap((e) =>
    getMcpConfigsByScope(e).errors.map((error) =>
      error.file
        ? error
        : {
            ...error,
            file: describeMcpConfigFilePath(e),
          },
    ),
  );
  let globalConfig = getGlobalConfig();
  let mapped = USER_INTENT_SETTING_KEYS.filter(
    (e) =>
      settingsWithErrors.settings[e] === undefined &&
      globalConfig[e] !== DEFAULT_GLOBAL_CONFIG[e] &&
      isInvalidGlobalConfigValue(e, globalConfig[e]),
  ).map((e) => ({
    file: describeGlobalConfigFile(),
    path: e,
    message: isAutoUploadFlagKey(e)
      ? "Not a valid value for this setting, so it is ignored and the setting counts as off"
      : "Not a valid value for this setting, so it is ignored and the setting counts as unset",
    severity: "warning",
    suggestion: "Set it with /config, or delete the key from this file",
  }));
  let n = formatIgnoredTelemetryEnvNotice();
  return {
    settings: settingsWithErrors.settings,
    errors: [...settingsWithErrors.errors, ...flattened, ...mapped, ...n.ignored, ...n.turnedOff],
  };
}
//@ chunk-pr8s5wf6.js:1095-1114 placement
var OTEL_ENV_VAR_SET = new Set(OTEL_ENV_VARS);
//@ chunk-pr8s5wf6.js:1114-2503 placement
function formatIgnoredTelemetryEnvNotice() {
  let t = [];
  let i = [];
  let enabledSettingSources = getEnabledSettingSources();
  for (let enabledSettingSource of enabledSettingSources) {
    if (!isDangerousEnvVar(enabledSettingSource)) continue;
    if (
      enabledSettingSource === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    let env = getSettingsForSource(enabledSettingSource)?.env ?? {};
    let e = [];
    let s = [];
    for (let key of Object.keys(env)) {
      let upper = key.toUpperCase();
      if (!OTEL_ENV_VAR_SET.has(upper)) continue;
      if (isDisablingTelemetryEnv(key, env[key], getEnvAboveProjectSettings)) s.push(key);
      else e.push(key);
    }
    let file = getSettingsFilePathForSource(enabledSettingSource);
    let relativeSettingsFilePathForSource = getRelativeSettingsFilePathForSource(enabledSettingSource);
    if (e.length > 0)
      t.push({
        file,
        path: "env",
        message: `Claude Code ignores these telemetry variables in ${relativeSettingsFilePathForSource}: ${e.join(", ")}. A project's settings files can only turn telemetry off: set OTEL_LOGS_EXPORTER, OTEL_METRICS_EXPORTER, or OTEL_TRACES_EXPORTER to none, or a content variable such as OTEL_LOG_USER_PROMPTS to 0, with the name in upper case. That doesn't work for a variable that managed settings, a --settings file, or the environment you start Claude Code from already sets. If you set them on purpose, set them in your shell, your user settings (~/.claude/settings.json), or managed settings instead.`,
        severity: "warning",
        statusOnly: true,
      });
    if (s.length > 0)
      i.push({
        file,
        path: "env",
        message: `${relativeSettingsFilePathForSource} turns telemetry off with these variables: ${s.join(", ")}. Claude Code uses these values unless managed settings or a --settings file sets the same variable. Your user settings don't override this file. To keep one on, set it in the environment you start Claude Code from, in a --settings file, or in managed settings.`,
        severity: "warning",
        statusOnly: true,
      });
  }
  return {
    ignored: t,
    turnedOff: i,
  };
}
//@ chunk-pr8s5wf6.js:2503-2563 placement
/**
 * blockingLocalSettingsErrors：会阻止操作的本地设置错误。
 */
function blockingLocalSettingsErrors() {
  return getLocalSettingsValidationErrors().filter((t) => !t.preserveOnWrite);
}
//@ chunk-pr8s5wf6.js:2563-2706 placement
/**
 * 列出会阻止操作的设置错误（排除 MCP 相关、警告与本地设置文件），并附上其他检查结果。
 */
function blockingSettingsErrors() {
  let settingsFilePathForSource = getSettingsFilePathForSource("localSettings");
  return [
    ...formatInvalidSettingNotice().errors.filter(
      (error) =>
        !error.mcpErrorMetadata && error.severity !== "warning" && error.file !== settingsFilePathForSource,
    ),
    ...blockingLocalSettingsErrors(),
  ];
}
export {
  formatInvalidSettingNotice,
  formatIgnoredTelemetryEnvNotice,
  blockingSettingsErrors,
  blockingLocalSettingsErrors,
};
