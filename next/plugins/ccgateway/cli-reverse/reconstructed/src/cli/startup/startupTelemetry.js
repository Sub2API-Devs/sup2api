/**
 * cli/startup/startupTelemetry.ts
 *
 * 2.1.316 新增：启动遥测（已注册钩子、命令、用户设置键、环境变量）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { getCommands, isSkillToolCommand } from "../../commands.js";
import { conditionalSkillEntries } from "../../skills/loadSkillsDir.js";
import { getCharBudget } from "../../tools/SkillTool/prompt.js";
import { policyEnabledPluginNameSet, getPolicyAllowedSet } from "../../utils/plugins/pluginPolicy.js";
import { isCoworkEntrypoint } from "../../utils/entrypointKinds.js";
import { isCleanupStarted } from "../../utils/cleanupRegistry.js";
import { MAX_TELEMETRY_KEYS, frontmatterKeyFlags } from "../../utils/settings/settingsTelemetryKeys.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  getCommandId,
  buildServerAttributionFields,
  groupCommandsByRepository,
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  pluginIdHash,
} from "../../utils/telemetry/pluginTelemetry.js";
import { skillNameHashFields, logSkillsLoaded } from "../../utils/telemetry/skillLoadedEvent.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import {
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isToolDetailsLoggingEnabled, THIRD_PARTY } from "../../services/analytics/metadata.js";
import { getEnabledSettingSources } from "../../utils/settings/constants.js";
import {
  getSettingsFilePathForSource,
  getSettingsForSource,
  getInitialSettings,
} from "../../utils/settings/settings.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { GLOBAL_CONFIG_KEYS, DEFAULT_GLOBAL_CONFIG } from "../../utils/config.js";
import { USER_INTENT_SETTING_KEYS } from "../../utils/settings/userIntentSettings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:90992-91651 placement
async function logStartupCommandTelemetry(command, session, storageV5, options, flag = false) {
  try {
    let commands = await getCommands(command, options);
    let skillEntries = conditionalSkillEntries();
    let skillSet = new Set(skillEntries);
    let allCommands = [...commands, ...skillEntries];
    let skillBudget = getCharBudget(session, storageV5);
    let policyPlugins = policyEnabledPluginNameSet();
    let isCowork = isCoworkEntrypoint();
    let startTime = performance.now();
    for (let entry of allCommands) {
      if (flag && !isCleanupStarted() && performance.now() - startTime > MAX_TELEMETRY_KEYS) {
        await yieldToEventLoop();
        startTime = performance.now();
      }
      if (entry.type !== "prompt") continue;
      if (entry.source === "builtin") continue;
      if (isCowork && entry.source === "bundled") continue;
      logEvent("tengu_skill_loaded", {
        _PROTO_skill_name: entry.name,
        ...false,
        ...(getCommandId(entry) && skillNameHashFields(entry.name)),
        ...logSkillsLoaded(entry.source, entry.loadedFrom, entry.kind, entry.createdBy),
        skill_budget: skillBudget,
        skill_content_chars: entry.contentLength,
        model_invocable: isSkillToolCommand(entry),
        is_conditional: skillSet.has(entry),
        ...frontmatterKeyFlags(entry.declaredFields),
        ...buildServerAttributionFields(entry, policyPlugins),
      });
    }
    return groupCommandsByRepository(commands);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "skill load telemetry failed"));
    return null;
  }
}
//@ chunk-hjswk319.js:91683-92558 placement
function logRegisteredHooks(enabled, options) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (isCustomizationDisabled("hooks")) return;
  let logDetails = isToolDetailsLoggingEnabled();
  let managedHooksOnly = shouldAllowManagedHooksOnly();
  let seen = new Set();
  for (let source of getEnabledSettingSources()) {
    if (managedHooksOnly && source !== "policySettings") continue;
    let settingsFilePathForSource = getSettingsFilePathForSource(source);
    if (settingsFilePathForSource) {
      let path = resolve(settingsFilePathForSource);
      if (seen.has(path)) continue;
      seen.add(path);
    }
    let hooks = getSettingsForSource(source)?.hooks;
    if (!hooks) continue;
    for (let [key, value] of Object.entries(hooks))
      for (let hook of value)
        for (let hook_2 of hook.hooks)
          logOTelEvent("hook_registered", {
            hook_event: key,
            hook_type: hook_2.type,
            hook_source: source,
            safe_mode: String(isSafeMode()),
            ...(logDetails &&
              hook.matcher && {
                hook_matcher: hook.matcher,
              }),
          });
  }
  let policyAllowed = managedHooksOnly && !isSafeMode() ? getPolicyAllowedSet() : null;
  for (let hook of enabled) {
    if (!hook.hooksConfig) continue;
    if (managedHooksOnly && !policyAllowed?.has(hook.source)) continue;
    let { marketplace } = parsePluginIdentifier_2(hook.repository);
    let fields =
      isAnthropicPluginSource(getTelemetryPluginScope(hook.name, marketplace, options)) || logDetails;
    for (let [key, value] of Object.entries(hook.hooksConfig))
      for (let event of value)
        for (let hook_2 of event.hooks)
          logOTelEvent("hook_registered", {
            hook_event: key,
            hook_type: hook_2.type,
            hook_source: "pluginHook",
            safe_mode: String(isSafeMode()),
            "plugin.name": fields ? hook.name : THIRD_PARTY,
            plugin_id_hash: pluginIdHash(hook.name, marketplace),
            ...(logDetails &&
              event.matcher && {
                hook_matcher: event.matcher,
              }),
          });
  }
}
//@ chunk-hjswk319.js:92558-92662 placement
var TELEMETRY_SKIP_ENV_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hjswk319.js:92558", () => {
  TELEMETRY_SKIP_ENV_VARS = new Set([
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
  ]);
});
//@ chunk-hjswk319.js:92662-92840 placement
function envVarsForTelemetry(sourceEnv = process.env) {
  let names = [];
  for (let key in sourceEnv)
    if (
      (key.startsWith("CLAUDE_CODE_") || key.startsWith("ANTHROPIC_")) &&
      !TELEMETRY_SKIP_ENV_VARS.has(key) &&
      sourceEnv[key] !== undefined &&
      sourceEnv[key] !== ""
    )
      names.push(key);
  return names.sort();
}
//@ chunk-hjswk319.js:92840-93081 placement
var TELEMETRY_SKIP_CONFIG_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hjswk319.js:92840", () => {
  TELEMETRY_SKIP_CONFIG_KEYS = new Set([
    "tipsHistory",
    "installMethod",
    "shiftEnterKeyBindingInstalled",
    "hasUsedBackslashReturn",
    "hasCompletedClaudeInChromeOnboarding",
    "remoteDialogSeen",
    "lspRecommendationIgnoredCount",
    "autoUpdates",
    "autoUpdatesProtectedForNative",
  ]);
});
//@ chunk-hjswk319.js:93081-93254 placement
function nonDefaultGlobalConfigKeys(globals) {
  let initialSettings = getInitialSettings();
  let keys = [];
  for (let key of GLOBAL_CONFIG_KEYS) {
    if (TELEMETRY_SKIP_CONFIG_KEYS.has(key)) continue;
    let value = (USER_INTENT_SETTING_KEYS.includes(key) ? initialSettings[key] : undefined) ?? globals[key];
    let defaultValue = DEFAULT_GLOBAL_CONFIG[key];
    if (value === undefined || isDefaultConfigValue(value, defaultValue)) continue;
    keys.push(key);
  }
  return keys;
}
//@ chunk-hjswk319.js:93254-93899 placement
var USER_SETTING_KEYS_FOR_TELEMETRY = [
  "model",
  "outputStyle",
  "language",
  "effortLevel",
  "fastMode",
  "alwaysThinkingEnabled",
  "spinnerTipsEnabled",
  "prefersReducedMotion",
  "timeFormat",
  "timeZone",
  "promptSuggestionEnabled",
  "awaySummaryEnabled",
  "precomputeCompactionEnabled",
  "idleCompaction",
  "switchModelsOnFlag",
  "autoUpdatesChannel",
  "viewMode",
  "syntaxHighlightingDisabled",
  "maxProseWidth",
  "useAutoModeDuringPlan",
  "enableWorkflows",
  "disableWorkflows",
  "disableArtifact",
  "enableArtifact",
  "workflowKeywordTriggerEnabled",
  "respondToBashCommands",
  "bashEditDiffEnabled",
  "bashOutputMaxChars",
  "taskOutputMaxChars",
  "autoCompactWindow",
  "cleanupPeriodDays",
  "forceLoginMethod",
  "keybindingFlavor",
];
//@ chunk-hjswk319.js:93899-94236 placement
function setUserSettingKeys(initialSettings) {
  let keys = [];
  for (let key of USER_SETTING_KEYS_FOR_TELEMETRY) if (initialSettings[key] !== undefined) keys.push(key);
  if (initialSettings.permissions?.defaultMode !== undefined) keys.push("permissions.defaultMode");
  if (initialSettings.worktree?.baseRef !== undefined) keys.push("worktree.baseRef");
  if (
    Object.values(initialSettings.modelSettings ?? {}).some(
      (settings) => settings?.autoCompactWindow !== undefined,
    )
  )
    keys.push("modelSettings.autoCompactWindow");
  return keys.sort();
}
//@ chunk-hjswk319.js:94236-94319 placement (2.1.88 match: getClientSurface, 0.779)
function getClientSurface_2(value, surface) {
  let parts = [];
  for (let key in value) if (surface(key) === "cli") parts.push(key);
  return parts.sort();
}
//@ chunk-hjswk319.js:94319-94429 placement
function isDefaultConfigValue(value, defaultValue) {
  if (value === defaultValue) return true;
  if (typeof value === "object" && value !== null) return Object.keys(value).length === 0;
  return false;
}
export {
  envVarsForTelemetry,
  nonDefaultGlobalConfigKeys,
  setUserSettingKeys,
  getClientSurface_2,
  logStartupCommandTelemetry,
  logRegisteredHooks,
};
