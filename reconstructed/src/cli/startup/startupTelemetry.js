/**
 * cli/startup/startupTelemetry.ts
 *
 * 2.1.316 新增：启动遥测（已注册钩子、命令、用户设置键、环境变量）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (10)
 * attribution: placement 10
 */
import { resolve, resolve as resolve_2, resolve as resolve_3, resolve as resolve_4 } from "path";
import { getCommands, isSkillToolCommand } from "../../commands.js";
import { EVe } from "../../skills/loadSkillsDir.js";
import { getCharBudget } from "../../tools/SkillTool/prompt.js";
import { af, getPolicyAllowedSet } from "../../utils/plugins/pluginPolicy.js";
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
  lx,
} from "../../utils/telemetry/pluginTelemetry.js";
import { rYo, logSkillsLoaded } from "../../utils/telemetry/skillLoadedEvent.js";
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
  getInitialSettings_2,
} from "../../utils/settings/settings.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { GLOBAL_CONFIG_KEYS, DEFAULT_GLOBAL_CONFIG } from "../../utils/config.js";
import { USER_INTENT_SETTING_KEYS } from "../../utils/settings/userIntentSettings.js";

//@ chunk-3wek6r2k.js:91593-92252 placement
async function logStartupCommandTelemetry(e, o, n, r, u = !1) {
  try {
    let p = await getCommands(e, r),
      h = EVe(),
      S = new Set(h),
      y = [...p, ...h],
      M = getCharBudget(o, n),
      E = af(),
      w = isCoworkEntrypoint(),
      startTime = performance.now();
    for (let A of y) {
      if (u && !isCleanupStarted() && performance.now() - startTime > MAX_TELEMETRY_KEYS)
        (await yieldToEventLoop(), (startTime = performance.now()));
      if (A.type !== "prompt") continue;
      if (A.source === "builtin") continue;
      if (w && A.source === "bundled") continue;
      logEvent("tengu_skill_loaded", {
        _PROTO_skill_name: A.name,
        ...!1,
        ...(getCommandId(A) && rYo(A.name)),
        ...logSkillsLoaded(A.source, A.loadedFrom, A.kind, A.createdBy),
        skill_budget: M,
        skill_content_chars: A.contentLength,
        model_invocable: isSkillToolCommand(A),
        is_conditional: S.has(A),
        ...frontmatterKeyFlags(A.declaredFields),
        ...buildServerAttributionFields(A, E),
      });
    }
    return groupCommandsByRepository(p);
  } catch (error) {
    return (logError(withTelemetryMessage(toError(error), "skill load telemetry failed")), null);
  }
}
//@ chunk-3wek6r2k.js:92284-93159 placement
function logRegisteredHooks(e, o) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  if (isCustomizationDisabled("hooks")) return;
  let n = isToolDetailsLoggingEnabled(),
    r = shouldAllowManagedHooksOnly(),
    u = new Set();
  for (let h of getEnabledSettingSources()) {
    if (r && h !== "policySettings") continue;
    let S = getSettingsFilePathForSource(h);
    if (S) {
      let M = resolve_4(S);
      if (u.has(M)) continue;
      u.add(M);
    }
    let y = getSettingsForSource(h)?.hooks;
    if (!y) continue;
    for (let [M, E] of Object.entries(y))
      for (let w of E)
        for (let hook of w.hooks)
          logOTelEvent("hook_registered", {
            hook_event: M,
            hook_type: hook.type,
            hook_source: h,
            safe_mode: String(isSafeMode()),
            ...(n && w.matcher && { hook_matcher: w.matcher }),
          });
  }
  let p = r && !isSafeMode() ? getPolicyAllowedSet() : null;
  for (let h of e) {
    if (!h.hooksConfig) continue;
    if (r && !p?.has(h.source)) continue;
    let { marketplace: marketplace } = parsePluginIdentifier_2(h.repository),
      y = isAnthropicPluginSource(getTelemetryPluginScope(h.name, marketplace, o)) || n;
    for (let [M, E] of Object.entries(h.hooksConfig))
      for (let w of E)
        for (let hook of w.hooks)
          logOTelEvent("hook_registered", {
            hook_event: M,
            hook_type: hook.type,
            hook_source: "pluginHook",
            safe_mode: String(isSafeMode()),
            "plugin.name": y ? h.name : THIRD_PARTY,
            plugin_id_hash: lx(h.name, marketplace),
            ...(n && w.matcher && { hook_matcher: w.matcher }),
          });
  }
}
//@ chunk-3wek6r2k.js:93159-93263 placement
var TELEMETRY_SKIP_ENV_VARS = new Set([
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
]);
//@ chunk-3wek6r2k.js:93263-93441 placement
function envVarsForTelemetry(e = process.env) {
  let o = [];
  for (let key in e)
    if (
      (key.startsWith("CLAUDE_CODE_") || key.startsWith("ANTHROPIC_")) &&
      !TELEMETRY_SKIP_ENV_VARS.has(key) &&
      e[key] !== void 0 &&
      e[key] !== ""
    )
      o.push(key);
  return o.sort();
}
//@ chunk-3wek6r2k.js:93441-93682 placement
var TELEMETRY_SKIP_CONFIG_KEYS = new Set([
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
//@ chunk-3wek6r2k.js:93682-93855 placement
function nonDefaultGlobalConfigKeys(e) {
  let o = getInitialSettings_2(),
    n = [];
  for (let r of GLOBAL_CONFIG_KEYS) {
    if (TELEMETRY_SKIP_CONFIG_KEYS.has(r)) continue;
    let p = (USER_INTENT_SETTING_KEYS.includes(r) ? o[r] : void 0) ?? e[r],
      h = DEFAULT_GLOBAL_CONFIG[r];
    if (p === void 0 || isDefaultConfigValue(p, h)) continue;
    n.push(r);
  }
  return n;
}
//@ chunk-3wek6r2k.js:93855-94500 placement
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
//@ chunk-3wek6r2k.js:94500-94837 placement
function setUserSettingKeys(e) {
  let o = [];
  for (let n of USER_SETTING_KEYS_FOR_TELEMETRY) if (e[n] !== void 0) o.push(n);
  if (e.permissions?.defaultMode !== void 0) o.push("permissions.defaultMode");
  if (e.worktree?.baseRef !== void 0) o.push("worktree.baseRef");
  if (Object.values(e.modelSettings ?? {}).some((n) => n?.autoCompactWindow !== void 0))
    o.push("modelSettings.autoCompactWindow");
  return o.sort();
}
//@ chunk-3wek6r2k.js:94837-94920 placement = getClientSurface (0.78)
function getClientSurface_2(e, o) {
  let n = [];
  for (let key in e) if (o(key) === "cli") n.push(key);
  return n.sort();
}
//@ chunk-3wek6r2k.js:94920-95030 placement
function isDefaultConfigValue(e, o) {
  if (e === o) return !0;
  if (typeof e === "object" && e !== null) return Object.keys(e).length === 0;
  return !1;
}

export {
  envVarsForTelemetry,
  nonDefaultGlobalConfigKeys,
  setUserSettingKeys,
  getClientSurface_2,
  logStartupCommandTelemetry,
  logRegisteredHooks,
};
