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
  Eqr,
  hookSourceDescriptionDisplayString,
  getHookStatusText,
} from "./hooksSettings.js";
import {
  shouldSkipSessionHooksByPolicy,
  shouldDisableAllHooksIncludingManaged,
  shouldAllowManagedHooksOnly,
  policySettingsUnreadable,
} from "./hooksConfigSnapshot.js";
import { O7o } from "../hooks.js";
import { isHookPolicyUnanswered } from "../../commands/goal/goal.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { eKt } from "./managedHooksOnly.js";
import { getPolicyAllowedSet } from "../plugins/pluginPolicy.js";
import { isSafeMode, getSafeModeExitHint, isBareMode, getBareModeExitHint } from "../envUtils.js";
import { isRestrictedToPluginOnly } from "../settings/pluginOnlyPolicy.js";
import { Mu, escapeControlChars } from "../stringUtils.js";
import {
  getHookEventMetadata,
  groupHooksByEventAndMatcher,
  getSortedMatchersForEvent,
} from "./hooksConfigManager.js";
import { isSettingSourceEnabled } from "../settings/constants.js";
import { hasPolicySettings } from "../plugins/managedPluginSeating.js";

//@ chunk-w5j5chas.js:647-792 placement = isHTTPConfig (0.785)
function redactHttpHeaderValues(config) {
  if (config.type !== "http" || config.headers === void 0) return config;
  return { ...config, headers: Object.fromEntries(Object.keys(config.headers).map((o) => [o, ""])) };
}
//@ chunk-w5j5chas.js:792-940 placement
function countHooksInSource(t) {
  let o = 0,
    n = getSettingsForSource(t)?.hooks ?? {};
  for (let s of Object.values(n)) {
    if (!Array.isArray(s)) continue;
    for (let c of s) o += c.hooks?.length ?? 0;
  }
  return o;
}
//@ chunk-w5j5chas.js:940-1181 placement
function hookContentLabel(t) {
  switch (t.type) {
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
      return t.file !== void 0 ? "Script file" : "Script";
    default:
      return "Definition";
  }
}
//@ chunk-w5j5chas.js:1181-1257 placement
function E(t) {
  if (t.type === "script") return t.file ?? t.script ?? "";
  return getHookDisplayText(t);
}
//@ chunk-w5j5chas.js:1257-1614 placement
function isHookSourceActive(t) {
  if (t.source === "sessionHook")
    return (
      (!shouldSkipSessionHooksByPolicy() || O7o(t.config)) && (!isHookPolicyUnanswered() || Eqr(t.config))
    );
  if (isCustomizationDisabled("hooks")) return !1;
  if (t.source === "builtinHook") return !0;
  if (shouldDisableAllHooksIncludingManaged()) return !1;
  if (t.source === "policySettings") return !0;
  let o = shouldAllowManagedHooksOnly() || isHookPolicyUnanswered();
  if (t.source === "pluginHook") {
    let n = t.pluginName ?? "",
      s = isHookPolicyUnanswered() ? eKt(n) : getPolicyAllowedSet()?.has(n) === !0;
    return !isSafeMode() && (!o || s);
  }
  return !o && !isRestrictedToPluginOnly("hooks");
}
//@ chunk-w5j5chas.js:1614-2544 placement
function hookSourceLabel(t) {
  let config = t.config,
    n = t.source === "userSettings" || t.source === "projectSettings" || t.source === "localSettings",
    s = redactHttpHeaderValues(config);
  return {
    event: t.event,
    matcher: Mu(t.matcher ?? ""),
    source: t.source,
    sourceLabel:
      t.source === "flagSettings"
        ? "Startup settings (--settings option)"
        : t.source === "policySettings"
          ? "Managed settings (set by your organization)"
          : hookSourceDescriptionDisplayString(t.source),
    ...(t.pluginName !== void 0 && { pluginName: Mu(t.pluginName) }),
    type: config.type,
    displayText: getHookStatusText(config),
    commandText: escapeControlChars(E(config)),
    contentLabel: hookContentLabel(config),
    ...("if" in config && config.if !== void 0 && { condition: Mu(config.if) }),
    ...("timeout" in config && typeof config.timeout === "number" && { timeout: config.timeout }),
    ...("statusMessage" in config &&
      config.statusMessage !== void 0 &&
      config.statusMessage !== "" && { statusMessage: Mu(config.statusMessage) }),
    ...("once" in config && config.once === !0 && { runsOnce: !0 }),
    ...(config.type === "command" &&
      (config.async === !0 || config.asyncRewake === !0) && { runsInBackground: !0 }),
    ...(!isHookSourceActive(t) && { disabled: !0 }),
    ...(n && {
      editable: { matcher: t.matcher ?? "", config: s, ...(s !== config && { headersRedacted: !0 }) },
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
      for (let hook of u.hooks) n.push(hookSourceLabel({ event: t, config: hook, matcher: o, source: s }));
    }
  }
  return n;
}
/**
 * 汇总托管策略对钩子的限制（仅托管钩子、仅插件、全部禁用等）用于展示。
 */
//@ chunk-w5j5chas.js:2798-4160 placement
function hookPolicySummary(t) {
  let o = getSettingsForSource("policySettings"),
    n = o?.allowManagedHooksOnly === !0,
    s = isRestrictedToPluginOnly("hooks"),
    c = o?.disableAllHooks === !0,
    u = getSettings_DEPRECATED()?.disableAllHooks === !0,
    r = getHookEventMetadata([]),
    m = groupHooksByEventAndMatcher(t, []),
    b = (e) =>
      e.source === "sessionHook" ||
      e.source === "pluginHook" ||
      e.source === "builtinHook" ||
      isSettingSourceEnabled(e.source),
    p = !n && !s,
    g = [],
    d = [];
  for (let e of Object.keys(r)) {
    let M = getSortedMatchersForEvent(m, e),
      a = [],
      y = new Set();
    for (let i of M)
      if ((y.add(i), a.push(...(m[e]?.[i] ?? []).filter(b).map(hookSourceLabel)), p))
        a.push(...getManagedHooksForEventMatcher(e, i));
    if (p) {
      let i = new Set();
      for (let l of ["flagSettings", "policySettings"]) {
        let k = getSettingsForSource(l)?.hooks?.[e];
        if (!Array.isArray(k)) continue;
        for (let C of k) {
          let H = C.matcher ?? "";
          if (!y.has(H)) i.add(H);
        }
      }
      for (let l of [...i].sort()) a.push(...getManagedHooksForEventMatcher(e, l));
    }
    if (a.length > 0)
      (g.push({
        name: e,
        summary: r[e].summary,
        supportsMatcher: r[e].matcherMetadata !== void 0 || a.some((i) => i.matcher !== ""),
        hookCount: a.length,
      }),
        d.push(...a));
  }
  let mapped = getSettingsWithErrors_2()
    .errors.filter((error) => error.severity !== "warning")
    .map((e) => ({ file: e.file, path: e.path, message: e.message }));
  return {
    events: g,
    hooks: d,
    eventCatalog: Object.keys(r).map((e) => ({
      name: e,
      summary: r[e].summary,
      supportsMatcher: r[e].matcherMetadata !== void 0 || e === "FileChanged",
    })),
    policy: {
      disabledByPolicy: c,
      managedOnly: n,
      pluginOnly: s,
      allDisabled: u,
      policyHookCount: countHooksInSource("policySettings"),
      ...(policySettingsUnreadable() && { policyUnreadable: !0 }),
    },
    ...(isSafeMode() && {
      safeMode: { managedHooksStillApply: hasPolicySettings(), exitHint: getSafeModeExitHint() },
    }),
    ...(isBareMode() &&
      isCustomizationDisabled("hooks") && { bareMode: { exitHint: getBareModeExitHint() } }),
    ...(mapped.length > 0 && { errors: mapped }),
  };
}

export { hookPolicySummary, redactHttpHeaderValues };
