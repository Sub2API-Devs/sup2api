/**
 * utils/hooks/hookSourceDisplay.ts
 *
 * 2.1.316 新增：钩子来源展示与策略汇总
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gavd4ahg.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSettingsForSource, getSettings_DEPRECATED, getSettingsWithErrors } from "../settings/settings.js";
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

//@ chunk-gavd4ahg.js:648-793 placement (2.1.88 match: isHTTPConfig, 0.785)
function redactHttpHeaderValues(config) {
  if (config.type !== "http" || config.headers === undefined) return config;
  return {
    ...config,
    headers: Object.fromEntries(Object.keys(config.headers).map((key) => [key, ""])),
  };
}
//@ chunk-gavd4ahg.js:793-941 placement
function countHooksInSource(source) {
  let count = 0;
  let hooks = getSettingsForSource(source)?.hooks ?? {};
  for (let matchers of Object.values(hooks)) {
    if (!Array.isArray(matchers)) continue;
    for (let matcher of matchers) count += matcher.hooks?.length ?? 0;
  }
  return count;
}
//@ chunk-gavd4ahg.js:941-1182 placement
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
//@ chunk-gavd4ahg.js:1182-1258 placement
function hookCommandDisplayText(config) {
  if (config.type === "script") return config.file ?? config.script ?? "";
  return getHookDisplayText(config);
}
//@ chunk-gavd4ahg.js:1258-1615 placement
function isHookSourceActive(hook) {
  if (hook.source === "sessionHook")
    return (
      (!shouldSkipSessionHooksByPolicy() || isHookEligible(hook.config)) &&
      (!isHookPolicyUnanswered() || isHookPluginSatisfied(hook.config))
    );
  if (isCustomizationDisabled("hooks")) return false;
  if (hook.source === "builtinHook") return true;
  if (shouldDisableAllHooksIncludingManaged()) return false;
  if (hook.source === "policySettings") return true;
  let managedOnly = shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
  if (hook.source === "pluginHook") {
    let pluginName = hook.pluginName ?? "";
    let pluginAllowed = isHookPolicyUnanswered()
      ? isManagedOrAllowlistedHook(pluginName)
      : getPolicyAllowedSet()?.has(pluginName) === true;
    return !isSafeMode() && (!managedOnly || pluginAllowed);
  }
  return !managedOnly && !isRestrictedToPluginOnly("hooks");
}
//@ chunk-gavd4ahg.js:1615-2546 placement
function hookSourceLabel(hook) {
  let config = hook.config;
  let editableSource =
    hook.source === "userSettings" || hook.source === "projectSettings" || hook.source === "localSettings";
  let redacted = redactHttpHeaderValues(config);
  return {
    event: hook.event,
    matcher: escapeControlCharsForDisplay(hook.matcher ?? ""),
    source: hook.source,
    sourceLabel:
      hook.source === "flagSettings"
        ? "Startup settings (--settings option)"
        : hook.source === "policySettings"
          ? "Managed settings (set by your organization)"
          : hookSourceDescriptionDisplayString(hook.source),
    ...(hook.pluginName !== undefined && {
      pluginName: escapeControlCharsForDisplay(hook.pluginName),
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
    ...(!isHookSourceActive(hook) && {
      disabled: true,
    }),
    ...(editableSource && {
      editable: {
        matcher: hook.matcher ?? "",
        config: redacted,
        ...(redacted !== config && {
          headersRedacted: true,
        }),
      },
    }),
  };
}
//@ chunk-gavd4ahg.js:2546-2800 placement (2.1.88 match: getEnabledSettingSources, 0.772)
function getManagedHooksForEventMatcher(event, matcher) {
  let labels = [];
  for (let sourceName of ["flagSettings", "policySettings"]) {
    let matchers = getSettingsForSource(sourceName)?.hooks?.[event];
    if (!Array.isArray(matchers)) continue;
    for (let matcher_2 of matchers) {
      if ((matcher_2.matcher ?? "") !== matcher) continue;
      for (let config of matcher_2.hooks)
        labels.push(
          hookSourceLabel({
            event,
            config,
            matcher,
            source: sourceName,
          }),
        );
    }
  }
  return labels;
}
//@ chunk-gavd4ahg.js:2800-4162 placement
/**
 * 汇总托管策略对钩子的限制（仅托管钩子、仅插件、全部禁用等）用于展示。
 */
function hookPolicySummary(appState) {
  let settingsForSource = getSettingsForSource("policySettings");
  let managedOnly = settingsForSource?.allowManagedHooksOnly === true;
  let pluginOnly = isRestrictedToPluginOnly("hooks");
  let disabledByPolicy = settingsForSource?.disableAllHooks === true;
  let allDisabled = getSettings_DEPRECATED()?.disableAllHooks === true;
  let hookEventMetadata = getHookEventMetadata([]);
  let hooksByEventAndMatcher = groupHooksByEventAndMatcher(appState, []);
  let isSourceEnabled = (entry) =>
    entry.source === "sessionHook" ||
    entry.source === "pluginHook" ||
    entry.source === "builtinHook" ||
    isSettingSourceEnabled(entry.source);
  let includeManagedExtras = !managedOnly && !pluginOnly;
  let eventSummaries = [];
  let allLabels = [];
  for (let key of Object.keys(hookEventMetadata)) {
    let sortedMatchersForEvent = getSortedMatchersForEvent(hooksByEventAndMatcher, key);
    let labels = [];
    let seenMatchers = new Set();
    for (let matcherKey of sortedMatchersForEvent) {
      seenMatchers.add(matcherKey);
      labels.push(
        ...(hooksByEventAndMatcher[key]?.[matcherKey] ?? []).filter(isSourceEnabled).map(hookSourceLabel),
      );
      if (includeManagedExtras) labels.push(...getManagedHooksForEventMatcher(key, matcherKey));
    }
    if (includeManagedExtras) {
      let extraMatchers = new Set();
      for (let sourceName of ["flagSettings", "policySettings"]) {
        let matchers = getSettingsForSource(sourceName)?.hooks?.[key];
        if (!Array.isArray(matchers)) continue;
        for (let matcher of matchers) {
          let matcher_2 = matcher.matcher ?? "";
          if (!seenMatchers.has(matcher_2)) extraMatchers.add(matcher_2);
        }
      }
      for (let matcherKey of [...extraMatchers].sort())
        labels.push(...getManagedHooksForEventMatcher(key, matcherKey));
    }
    if (labels.length > 0) {
      eventSummaries.push({
        name: key,
        summary: hookEventMetadata[key].summary,
        supportsMatcher:
          hookEventMetadata[key].matcherMetadata !== undefined || labels.some((hook) => hook.matcher !== ""),
        hookCount: labels.length,
      });
      allLabels.push(...labels);
    }
  }
  let mapped = getSettingsWithErrors()
    .errors.filter((error) => error.severity !== "warning")
    .map((error) => ({
      file: error.file,
      path: error.path,
      message: error.message,
    }));
  return {
    events: eventSummaries,
    hooks: allLabels,
    eventCatalog: Object.keys(hookEventMetadata).map((key) => ({
      name: key,
      summary: hookEventMetadata[key].summary,
      supportsMatcher: hookEventMetadata[key].matcherMetadata !== undefined || key === "FileChanged",
    })),
    policy: {
      disabledByPolicy,
      managedOnly,
      pluginOnly,
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
