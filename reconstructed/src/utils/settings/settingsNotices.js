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
import { isInvalidGlobalConfigValue, gxn } from "../config/globalConfigValidation.js";
import { describeGlobalConfigFile } from "../env.js";
import { OTEL_ENV_VARS, isDangerousEnvVar, isDisablingTelemetryEnv } from "../managedEnvConstants.js";
import { getEnabledSettingSources } from "./constants.js";
import { getEnvAboveProjectSettings } from "../managedEnvApply.js";

//@ chunk-pr8s5wf6.js:524-1095 placement
function formatInvalidSettingNotice() {
  let t = getSettingsWithErrors_2(),
    flattened = MCP_SETTINGS_SCOPES.flatMap((e) =>
      getMcpConfigsByScope(e).errors.map((error) =>
        error.file ? error : { ...error, file: describeMcpConfigFilePath(e) },
      ),
    ),
    r = getGlobalConfig(),
    mapped = USER_INTENT_SETTING_KEYS.filter(
      (e) =>
        t.settings[e] === void 0 && r[e] !== DEFAULT_GLOBAL_CONFIG[e] && isInvalidGlobalConfigValue(e, r[e]),
    ).map((e) => ({
      file: describeGlobalConfigFile(),
      path: e,
      message: gxn(e)
        ? "Not a valid value for this setting, so it is ignored and the setting counts as off"
        : "Not a valid value for this setting, so it is ignored and the setting counts as unset",
      severity: "warning",
      suggestion: "Set it with /config, or delete the key from this file",
    })),
    n = formatIgnoredTelemetryEnvNotice();
  return {
    settings: t.settings,
    errors: [...t.errors, ...flattened, ...mapped, ...n.ignored, ...n.turnedOff],
  };
}
//@ chunk-pr8s5wf6.js:1095-1114 placement
var c = new Set(OTEL_ENV_VARS);
//@ chunk-pr8s5wf6.js:1114-2503 placement
function formatIgnoredTelemetryEnvNotice() {
  let t = [],
    i = [],
    r = getEnabledSettingSources();
  for (let o of r) {
    if (!isDangerousEnvVar(o)) continue;
    if (o === "projectSettings" && r.includes("userSettings") && projectSettingsAliasesUserSettings())
      continue;
    let n = getSettingsForSource(o)?.env ?? {},
      e = [],
      s = [];
    for (let a of Object.keys(n)) {
      let upper = a.toUpperCase();
      if (!c.has(upper)) continue;
      if (isDisablingTelemetryEnv(a, n[a], getEnvAboveProjectSettings)) s.push(a);
      else e.push(a);
    }
    let l = getSettingsFilePathForSource(o),
      g = getRelativeSettingsFilePathForSource(o);
    if (e.length > 0)
      t.push({
        file: l,
        path: "env",
        message: `Claude Code ignores these telemetry variables in ${g}: ${e.join(", ")}. A project's settings files can only turn telemetry off: set OTEL_LOGS_EXPORTER, OTEL_METRICS_EXPORTER, or OTEL_TRACES_EXPORTER to none, or a content variable such as OTEL_LOG_USER_PROMPTS to 0, with the name in upper case. That doesn't work for a variable that managed settings, a --settings file, or the environment you start Claude Code from already sets. If you set them on purpose, set them in your shell, your user settings (~/.claude/settings.json), or managed settings instead.`,
        severity: "warning",
        statusOnly: !0,
      });
    if (s.length > 0)
      i.push({
        file: l,
        path: "env",
        message: `${g} turns telemetry off with these variables: ${s.join(", ")}. Claude Code uses these values unless managed settings or a --settings file sets the same variable. Your user settings don't override this file. To keep one on, set it in the environment you start Claude Code from, in a --settings file, or in managed settings.`,
        severity: "warning",
        statusOnly: !0,
      });
  }
  return { ignored: t, turnedOff: i };
}
//@ chunk-pr8s5wf6.js:2503-2563 placement
function Cln() {
  return getLocalSettingsValidationErrors().filter((t) => !t.preserveOnWrite);
}
/**
 * 列出会阻止操作的设置错误（排除 MCP 相关、警告与本地设置文件），并附上其他检查结果。
 */
//@ chunk-pr8s5wf6.js:2563-2706 placement
function blockingSettingsErrors() {
  let t = getSettingsFilePathForSource("localSettings");
  return [
    ...formatInvalidSettingNotice().errors.filter(
      (error) => !error.mcpErrorMetadata && error.severity !== "warning" && error.file !== t,
    ),
    ...Cln(),
  ];
}

export { formatInvalidSettingNotice, formatIgnoredTelemetryEnvNotice, blockingSettingsErrors, Cln };
