/**
 * utils/settings/settingsNotices.ts
 *
 * 设置提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7m8srhy8.js (5)
 * attribution: placement 5
 */
import {
  getSettingsWithErrors,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7m8srhy8.js:523-1093 placement
function formatInvalidSettingNotice() {
  let settingsWithErrors = getSettingsWithErrors();
  let flattened = MCP_SETTINGS_SCOPES.flatMap((scope) =>
    getMcpConfigsByScope(scope).errors.map((error) =>
      error.file
        ? error
        : {
            ...error,
            file: describeMcpConfigFilePath(scope),
          },
    ),
  );
  let globalConfig = getGlobalConfig();
  let mapped = USER_INTENT_SETTING_KEYS.filter(
    (key) =>
      settingsWithErrors.settings[key] === undefined &&
      globalConfig[key] !== DEFAULT_GLOBAL_CONFIG[key] &&
      isInvalidGlobalConfigValue(key, globalConfig[key]),
  ).map((key) => ({
    file: describeGlobalConfigFile(),
    path: key,
    message: isAutoUploadFlagKey(key)
      ? "Not a valid value for this setting, so it is ignored and the setting counts as off"
      : "Not a valid value for this setting, so it is ignored and the setting counts as unset",
    severity: "warning",
    suggestion: "Set it with /config, or delete the key from this file",
  }));
  let telemetryNotice = formatIgnoredTelemetryEnvNotice();
  return {
    settings: settingsWithErrors.settings,
    errors: [
      ...settingsWithErrors.errors,
      ...flattened,
      ...mapped,
      ...telemetryNotice.ignored,
      ...telemetryNotice.turnedOff,
    ],
  };
}
//@ chunk-7m8srhy8.js:1093-1112 placement
var OTEL_ENV_VAR_SET; // deferred: uses OTEL_ENV_VARS (../managedEnvConstants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7m8srhy8.js:1093", () => {
  OTEL_ENV_VAR_SET = new Set(OTEL_ENV_VARS);
});
//@ chunk-7m8srhy8.js:1112-2501 placement
function formatIgnoredTelemetryEnvNotice() {
  let ignored = [];
  let turnedOff = [];
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
    let ignoredKeys = [];
    let disablingKeys = [];
    for (let key of Object.keys(env)) {
      let upper = key.toUpperCase();
      if (!OTEL_ENV_VAR_SET.has(upper)) continue;
      if (isDisablingTelemetryEnv(key, env[key], getEnvAboveProjectSettings)) disablingKeys.push(key);
      else ignoredKeys.push(key);
    }
    let file = getSettingsFilePathForSource(enabledSettingSource);
    let relativeSettingsFilePathForSource = getRelativeSettingsFilePathForSource(enabledSettingSource);
    if (ignoredKeys.length > 0)
      ignored.push({
        file,
        path: "env",
        message: `Claude Code ignores these telemetry variables in ${relativeSettingsFilePathForSource}: ${ignoredKeys.join(", ")}. A project's settings files can only turn telemetry off: set OTEL_LOGS_EXPORTER, OTEL_METRICS_EXPORTER, or OTEL_TRACES_EXPORTER to none, or a content variable such as OTEL_LOG_USER_PROMPTS to 0, with the name in upper case. That doesn't work for a variable that managed settings, a --settings file, or the environment you start Claude Code from already sets. If you set them on purpose, set them in your shell, your user settings (~/.claude/settings.json), or managed settings instead.`,
        severity: "warning",
        statusOnly: true,
      });
    if (disablingKeys.length > 0)
      turnedOff.push({
        file,
        path: "env",
        message: `${relativeSettingsFilePathForSource} turns telemetry off with these variables: ${disablingKeys.join(", ")}. Claude Code uses these values unless managed settings or a --settings file sets the same variable. Your user settings don't override this file. To keep one on, set it in the environment you start Claude Code from, in a --settings file, or in managed settings.`,
        severity: "warning",
        statusOnly: true,
      });
  }
  return {
    ignored,
    turnedOff,
  };
}
//@ chunk-7m8srhy8.js:2501-2561 placement
/**
 * blockingLocalSettingsErrors：会阻止操作的本地设置错误。
 */
function blockingLocalSettingsErrors() {
  return getLocalSettingsValidationErrors().filter((errorEntry) => !errorEntry.preserveOnWrite);
}
//@ chunk-7m8srhy8.js:2561-2704 placement
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
  blockingSettingsErrors,
  formatInvalidSettingNotice,
  formatIgnoredTelemetryEnvNotice,
  blockingLocalSettingsErrors,
};
