/**
 * utils/hooks/hookSourceDisplay.ts
 *
 * 2.1.316 新增：钩子来源展示与策略汇总
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w5j5chas.js (8)
 * attribution: placement 8
 */
import {
  getSettingsForSource,
  getSettings_DEPRECATED,
  getSettingsWithErrors_2,
} from "../settings/settings.js";
import {
  getHookDisplayText,
  isHookPluginSatisfied,
  hookSourceDescriptionDisplayString,
  getHookStatusText,
} from "./hooksSettings.js";
import {
  shouldSkipSessionHooksByPolicy,
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  policySettingsUnreadable,
} from "./hooksConfigSnapshot.js";
import { isHookEligible } from "../hooks.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { isManagedOrAllowlistedHook } from "./managedHooksOnly.js";
import { getPolicyAllowedSet } from "../plugins/pluginPolicy.js";
import { isSafeMode, getSafeModeExitHint, isBareMode, getBareModeExitHint } from "../envUtils.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { escapeControlCharsForDisplay, escapeControlChars } from "../stringUtils.js";
import {
  getHookEventMetadata,
  groupHooksByEventAndMatcher,
  getSortedMatchersForEvent,
} from "./hooksConfigManager.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { hasPolicySettings } from "../plugins/managedPluginSeating.js";

//@ chunk-w5j5chas.js:647-792 placement = isHTTPConfig (0.785)
function redactHttpHeaderValues(config) {
  if (config.type !== "http" || config.headers === undefined) return config;
  return {
    ...config,
    headers: Object.fromEntries(Object.keys(config.headers).map((key) => [key, ""])),
  };
}
//@ chunk-w5j5chas.js:792-940 placement
function countHooksInSource(t) {
  let o = 0;
  let hooks = getSettingsForSource(t)?.hooks ?? {};
  for (let s of Object.values(hooks)) {
    if (!Array.isArray(s)) continue;
    for (let c of s) o += c.hooks?.length ?? 0;
  }
  return o;
}
//@ chunk-w5j5chas.js:940-1181 placement
function hookContentLabel(config) {
  switch (config.type) {
    case "command":
      return "Command";
    case "prompt":
    case "agent":
      return "Prompt";
    case "http":
      return "URL";
    case "mcp_tool":
      return "MCP tool";
    case "script":
      return config.file !== undefined ? "Script file" : "Script";
    default:
      return "Definition";
  }
}
//@ chunk-w5j5chas.js:1181-1257 placement
function hookCommandDisplayText(config) {
  if (config.type === "script") return config.file ?? config.script ?? "";
  return getHookDisplayText(config);
}
//@ chunk-w5j5chas.js:1257-1614 placement
function isHookSourceActive(t) {
  if (t.source === "sessionHook")
    return (
      (!shouldSkipSessionHooksByPolicy() || isHookEligible(t.config)) &&
      (!isHookPolicyUnanswered() || isHookPluginSatisfied(t.config))
    );
  if (isCustomizationDisabled("hooks")) return false;
  if (t.source === "builtinHook") return true;
  if (shouldDisableAllHooksIncludingManaged()) return false;
  if (t.source === "policySettings") return true;
  let o = shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
  if (t.source === "pluginHook") {
    let pluginName = t.pluginName ?? "";
    let s = isHookPolicyUnanswered()
      ? isManagedOrAllowlistedHook(pluginName)
      : getPolicyAllowedSet()?.has(pluginName) === true;
    return !isSafeMode() && (!o || s);
  }
  return !o && !isRestrictedToPluginOnly("hooks");
}
//@ chunk-w5j5chas.js:1614-2544 placement
function hookSourceLabel(t) {
  let config = t.config;
  let n = t.source === "userSettings" || t.source === "projectSettings" || t.source === "localSettings";
  let s = redactHttpHeaderValues(config);
  return {
    event: t.event,
    matcher: escapeControlCharsForDisplay(t.matcher ?? ""),
    source: t.source,
    sourceLabel:
      t.source === "flagSettings"
        ? "Startup settings (--settings option)"
        : t.source === "policySettings"
          ? "Managed settings (set by your organization)"
          : hookSourceDescriptionDisplayString(t.source),
    ...(t.pluginName !== undefined && {
      pluginName: escapeControlCharsForDisplay(t.pluginName),
    }),
    type: config.type,
    displayText: getHookStatusText(config),
    commandText: escapeControlChars(hookCommandDisplayText(config)),
    contentLabel: hookContentLabel(config),
    ...("if" in config &&
      config.if !== undefined && {
        condition: escapeControlCharsForDisplay(config.if),
      }),
    ...("timeout" in config &&
      typeof config.timeout === "number" && {
        timeout: config.timeout,
      }),
    ...("statusMessage" in config &&
      config.statusMessage !== undefined &&
      config.statusMessage !== "" && {
        statusMessage: escapeControlCharsForDisplay(config.statusMessage),
      }),
    ...("once" in config &&
      config.once === true && {
        runsOnce: true,
      }),
    ...(config.type === "command" &&
      (config.async === true || config.asyncRewake === true) && {
        runsInBackground: true,
      }),
    ...(!isHookSourceActive(t) && {
      disabled: true,
    }),
    ...(n && {
      editable: {
        matcher: t.matcher ?? "",
        config: s,
        ...(s !== config && {
          headersRedacted: true,
        }),
      },
    }),
  };
}
//@ chunk-w5j5chas.js:2544-2798 placement = getEnabledSettingSources (0.773)
function getManagedHooksForEventMatcher(t, o) {
  let n = [];
  for (let s of ["flagSettings", "policySettings"]) {
    let c = getSettingsForSource(s)?.hooks?.[t];
    if (!Array.isArray(c)) continue;
    for (let u of c) {
      if ((u.matcher ?? "") !== o) continue;
      for (let config of u.hooks)
        n.push(
          hookSourceLabel({
            event: t,
            config,
            matcher: o,
            source: s,
          }),
        );
    }
  }
  return n;
}
//@ chunk-w5j5chas.js:2798-4160 placement
/**
 * 汇总托管策略对钩子的限制（仅托管钩子、仅插件、全部禁用等）用于展示。
 */
function hookPolicySummary(appState) {
  let settingsForSource = getSettingsForSource("policySettings");
  let n = settingsForSource?.allowManagedHooksOnly === true;
  let s = isRestrictedToPluginOnly("hooks");
  let disabledByPolicy = settingsForSource?.disableAllHooks === true;
  let allDisabled = getSettings_DEPRECATED()?.disableAllHooks === true;
  let hookEventMetadata = getHookEventMetadata([]);
  let hooksByEventAndMatcher = groupHooksByEventAndMatcher(appState, []);
  let b = (e) =>
    e.source === "sessionHook" ||
    e.source === "pluginHook" ||
    e.source === "builtinHook" ||
    isSettingSourceEnabled(e.source);
  let p = !n && !s;
  let g = [];
  let d = [];
  for (let key of Object.keys(hookEventMetadata)) {
    let sortedMatchersForEvent = getSortedMatchersForEvent(hooksByEventAndMatcher, key);
    let a = [];
    let y = new Set();
    for (let i of sortedMatchersForEvent) {
      y.add(i);
      a.push(...(hooksByEventAndMatcher[key]?.[i] ?? []).filter(b).map(hookSourceLabel));
      if (p) a.push(...getManagedHooksForEventMatcher(key, i));
    }
    if (p) {
      let i = new Set();
      for (let l of ["flagSettings", "policySettings"]) {
        let k = getSettingsForSource(l)?.hooks?.[key];
        if (!Array.isArray(k)) continue;
        for (let C of k) {
          let matcher = C.matcher ?? "";
          if (!y.has(matcher)) i.add(matcher);
        }
      }
      for (let l of [...i].sort()) a.push(...getManagedHooksForEventMatcher(key, l));
    }
    if (a.length > 0) {
      g.push({
        name: key,
        summary: hookEventMetadata[key].summary,
        supportsMatcher:
          hookEventMetadata[key].matcherMetadata !== undefined || a.some((i) => i.matcher !== ""),
        hookCount: a.length,
      });
      d.push(...a);
    }
  }
  let mapped = getSettingsWithErrors_2()
    .errors.filter((error) => error.severity !== "warning")
    .map((error) => ({
      file: error.file,
      path: error.path,
      message: error.message,
    }));
  return {
    events: g,
    hooks: d,
    eventCatalog: Object.keys(hookEventMetadata).map((key) => ({
      name: key,
      summary: hookEventMetadata[key].summary,
      supportsMatcher: hookEventMetadata[key].matcherMetadata !== undefined || key === "FileChanged",
    })),
    policy: {
      disabledByPolicy,
      managedOnly: n,
      pluginOnly: s,
      allDisabled,
      policyHookCount: countHooksInSource("policySettings"),
      ...(policySettingsUnreadable() && {
        policyUnreadable: true,
      }),
    },
    ...(isSafeMode() && {
      safeMode: {
        managedHooksStillApply: hasPolicySettings(),
        exitHint: getSafeModeExitHint(),
      },
    }),
    ...(isBareMode() &&
      isCustomizationDisabled("hooks") && {
        bareMode: {
          exitHint: getBareModeExitHint(),
        },
      }),
    ...(mapped.length > 0 && {
      errors: mapped,
    }),
  };
}
export { hookPolicySummary, redactHttpHeaderValues };
