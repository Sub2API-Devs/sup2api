/**
 * utils/hooks/hooksSettings.ts
 *
 * 钩子显示文本、来源文案、全部钩子列表、相等判断与 matcher 排序。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/hooksSettings.ts
 * pieces: chunk-bajxb7bf.js (1), chunk-f9asxqh1.js (1), chunk-s61vbvea.js (14)
 * attribution: fingerprint 6, placement 5, layout 5
 */
import { resolve } from "path";
import { defaultShellKind } from "../shell/shellToolUtils.js";
import { jsonStringify } from "../slowOperations.js";
import { stableStringifySafe } from "./hookSerialization.js";
import { isManagedOrAllowlistedHook } from "./managedHooksOnly.js";
import { hookSourceOf } from "./sessionHooks.js";
import { isVouchedMarketplaceRef } from "../permissions/permissionsLoader.js";
import { escapeControlCharsForDisplay } from "../stringUtils.js";
import { scriptHookDisplayLabel } from "./scriptHooks.js";
import { getSettingsForSource, getSettingsFilePathForSource } from "../settings/settings.js";
import { EDITABLE_SETTING_SOURCES, isSettingSourceEnabled, SOURCES } from "../settings/constants.js";
import { getSessionId } from "../../bootstrap/state.js";
import { uniq } from "../collections.js";
import { getDisplayPath } from "../file.js";

//@ chunk-f9asxqh1.js:4192-4888 fingerprint (2.1.88 match: isHookEqual, 0.737)
/**
 * 判断两个钩子配置是否相同（按类型比较 command/args/shell/prompt/url/server/tool/input/script/file 与 if）；function 钩子永不相等。
 */
function isHookEqual(a, b) {
  if (a.type !== b.type) return false;
  let sameIf = (x, y) => (x.if ?? "") === (y.if ?? "");
  switch (a.type) {
    case "command": {
      let shell = defaultShellKind();
      return (
        b.type === "command" &&
        a.command === b.command &&
        jsonStringify(a.args ?? null) === jsonStringify(b.args ?? null) &&
        (a.shell ?? shell) === (b.shell ?? shell) &&
        sameIf(a, b)
      );
    }
    case "prompt":
      return b.type === "prompt" && a.prompt === b.prompt && sameIf(a, b);
    case "agent":
      return b.type === "agent" && a.prompt === b.prompt && sameIf(a, b);
    case "http":
      return b.type === "http" && a.url === b.url && sameIf(a, b);
    case "mcp_tool":
      return (
        b.type === "mcp_tool" &&
        a.server === b.server &&
        a.tool === b.tool &&
        jsonStringify(a.input ?? {}) === jsonStringify(b.input ?? {}) &&
        sameIf(a, b)
      );
    case "script":
      return (
        b.type === "script" &&
        (a.script ?? null) === (b.script ?? null) &&
        (a.file ?? null) === (b.file ?? null) &&
        sameIf(a, b)
      );
    case "function":
      return false;
  }
}
//@ chunk-s61vbvea.js:200006-200126 placement
var isInternalCallbackHookMatcher = (matcher) =>
  matcher.pluginRoot === undefined &&
  matcher.deviceOwner === undefined &&
  matcher.hooks.every((hook) => hook.type === "callback" || hook.type === "function");
//@ chunk-s61vbvea.js:200126-200256 placement
function isManagedHookMatcher(matcher, holdState) {
  let isManagedKey = () =>
    matcher.deviceOwner === undefined && holdState.managedKeys.has(stableStringifySafe(matcher));
  return matcher.pluginId !== undefined
    ? isManagedOrAllowlistedHook(matcher.pluginId)
    : isInternalCallbackHookMatcher(matcher) || isManagedKey();
}
//@ chunk-s61vbvea.js:200256-200312 placement
function isManagedHookMatcherSafe(matcher, holdState) {
  try {
    return isManagedHookMatcher(matcher, holdState);
  } catch {
    return isInternalCallbackHookMatcher(matcher);
  }
}
//@ chunk-s61vbvea.js:200312-200387 placement
/**
 * 判断单个钩子条目能否解析出所属插件且该插件满足条件（解析出错视为否），用于按插件过滤钩子设置。
 */
function isHookPluginSatisfied(hook) {
  try {
    let source = hookSourceOf(hook);
    return source !== undefined && isVouchedMarketplaceRef(source);
  } catch {
    return false;
  }
}
//@ chunk-s61vbvea.js:200387-200618 placement (2.1.88 match: getAutoUpdatedPluginNames, 0.672)
/**
 * 按“钩子是否来自托管/可更新插件”过滤一组钩子：整组都满足时返回该组或空数组，混合时返回只含满足条目的新组。被 filterHooksByManagedHold 使用。
 */
function filterHooksByPluginHold(matcher, holdState, wanted) {
  if (!(matcher.pluginId === undefined && matcher.hooks.some((hook) => hookSourceOf(hook) !== undefined)))
    return isManagedHookMatcherSafe(matcher, holdState) === wanted ? [] : [matcher];
  let filtered = matcher.hooks.filter((hook) => isHookPluginSatisfied(hook) !== wanted);
  let allMatch = filtered.length === matcher.hooks.length;
  if (allMatch || filtered.length === 0) return allMatch ? [matcher] : [];
  return [
    {
      ...matcher,
      hooks: filtered,
    },
  ];
}
//@ chunk-s61vbvea.js:374768-375124 fingerprint (2.1.88 match: getHookDisplayText, 0.633)
/**
 * 钩子的显示文本：command（含 args）、prompt、url、server/tool、script 文件、callback、function。
 */
function getHookDisplayText(hook) {
  switch (hook.type) {
    case "command":
      return hook.args ? [hook.command, ...hook.args].join(" ") : hook.command;
    case "prompt":
      return hook.prompt;
    case "agent":
      return hook.prompt;
    case "http":
      return hook.url;
    case "mcp_tool":
      return `${hook.server}/${hook.tool}`;
    case "script":
      return hook.file !== undefined
        ? escapeControlCharsForDisplay(hook.file)
        : scriptHookDisplayLabel(hook.script ?? "");
    case "callback":
      return "callback";
    case "function":
      return "function";
  }
}
//@ chunk-s61vbvea.js:375124-375244 layout
/**
 * 钩子进度显示：{command 显示文本, statusMessage}。
 */
function getHookProgressDisplay(hook) {
  return {
    command: escapeControlCharsForDisplay(getHookDisplayText(hook)),
    statusMessage:
      "statusMessage" in hook && hook.statusMessage
        ? escapeControlCharsForDisplay(hook.statusMessage)
        : undefined,
  };
}
//@ chunk-s61vbvea.js:375244-375329 layout
/**
 * 钩子运行时的状态文本：有 statusMessage 用它，否则用显示文本。
 */
function getHookStatusText(hook) {
  return escapeControlCharsForDisplay(
    "statusMessage" in hook && hook.statusMessage ? hook.statusMessage : getHookDisplayText(hook),
  );
}
//@ chunk-s61vbvea.js:375329-375832 fingerprint (2.1.88 match: getAllHooks, 0.755)
/**
 * 列出全部已配置钩子（各 settings 来源按文件去重 + 当前会话钩子），allowManagedHooksOnly 时跳过 settings。
 */
function getAllHooks(appState) {
  let hooks = [];
  if (getSettingsForSource("policySettings")?.allowManagedHooksOnly !== true) {
    let sources = EDITABLE_SETTING_SOURCES.filter(isSettingSourceEnabled);
    let seenFiles = new Set();
    for (let source of sources) {
      let filePath = getSettingsFilePathForSource(source);
      if (filePath) {
        let resolvedPath = resolve(filePath);
        if (seenFiles.has(resolvedPath)) continue;
        seenFiles.add(resolvedPath);
      }
      let sourceSettings = getSettingsForSource(source);
      if (!sourceSettings?.hooks) continue;
      for (let [key, matchers] of Object.entries(sourceSettings.hooks))
        for (let matcher of matchers)
          for (let hookCommand of matcher.hooks)
            hooks.push({
              event: key,
              config: hookCommand,
              matcher: matcher.matcher,
              source,
            });
    }
  }
  let sessionId = getSessionId();
  for (let [event, matchers] of appState.get(sessionId).entries())
    for (let matcher of matchers)
      for (let hookCommand of matcher.hooks)
        hooks.push({
          event,
          config: hookCommand,
          matcher: matcher.matcher,
          source: "sessionHook",
        });
  return hooks;
}
//@ chunk-s61vbvea.js:375832-376617 fingerprint (2.1.88 match: hookSourceDescriptionDisplayString, 0.389)
/**
 * 钩子来源 → 描述/标题/行内文案表（userSettings、projectSettings、localSettings、policySettings、pluginHook、sessionHook、builtinHook）。
 */
var HOOK_SOURCE_LABELS = {
  userSettings: {
    description: "User settings (~/.claude/settings.json)",
    header: "User Settings",
    inline: "User",
  },
  projectSettings: {
    description: "Project settings (.claude/settings.json)",
    header: "Project Settings",
    inline: "Project",
  },
  localSettings: {
    description: "Local settings (.claude/settings.local.json)",
    header: "Local Settings",
    inline: "Local",
  },
  policySettings: {
    description: "policySettings",
    header: "policySettings",
    inline: "policySettings",
  },
  pluginHook: {
    description: "Plugin hooks (~/.claude/plugins/*/hooks/hooks.json)",
    header: "Plugin Hooks",
    inline: "Plugin",
  },
  sessionHook: {
    description: "Session hooks (in-memory, temporary)",
    header: "Session Hooks",
    inline: "Session",
  },
  builtinHook: {
    description: "Built-in hooks (registered internally by Claude Code)",
    header: "Built-in Hooks",
    inline: "Built-in",
  },
};
//@ chunk-s61vbvea.js:376617-376662 layout
/**
 * 钩子来源的长描述（如 User settings (~/.claude/settings.json)）。
 */
function hookSourceDescriptionDisplayString(source) {
  return HOOK_SOURCE_LABELS[source]?.description ?? source;
}
//@ chunk-s61vbvea.js:376662-376702 layout
/**
 * 钩子来源的标题文案（如 User Settings）。
 */
function hookSourceHeaderDisplayString(source) {
  return HOOK_SOURCE_LABELS[source]?.header ?? source;
}
//@ chunk-s61vbvea.js:376702-376742 layout
/**
 * 钩子来源的行内短文案（如 User、Plugin、Session）。
 */
function hookSourceInlineDisplayString(source) {
  return HOOK_SOURCE_LABELS[source]?.inline ?? source;
}
//@ chunk-s61vbvea.js:376742-377065 fingerprint (2.1.88 match: sortMatchersByPriority, 1)
/**
 * /hooks 界面里按来源优先级（插件/内置最后）再按名字排序 matcher。
 */
function sortMatchersByPriority(matchers, hooksByEventAndMatcher, selectedEvent) {
  let sourcePriority = SOURCES.reduce((acc, source, index) => {
    acc[source] = index;
    return acc;
  }, {});
  return [...matchers].sort((a, b) => {
    let aHooks = hooksByEventAndMatcher[selectedEvent]?.[a] || [];
    let bHooks = hooksByEventAndMatcher[selectedEvent]?.[b] || [];
    let aSources = uniq(aHooks.map((aHook) => aHook.source));
    let bSources = uniq(bHooks.map((bHook) => bHook.source));
    let getSourcePriority = (source) =>
      source === "pluginHook" || source === "builtinHook" ? 999 : sourcePriority[source];
    let aHighestPriority = Math.min(...aSources.map(getSourcePriority));
    let bHighestPriority = Math.min(...bSources.map(getSourcePriority));
    if (aHighestPriority !== bHighestPriority) return aHighestPriority - bHighestPriority;
    return a.localeCompare(b);
  });
}
//@ chunk-bajxb7bf.js:47171-47988 fingerprint (2.1.88 match: hookSourceInlineDisplayString, 0.375)
/**
 * 告诉用户该钩子在哪里修改或删除（settings 文件路径、插件、内置、会话、组织策略）。
 */
function getHookSourceEditHint(source) {
  switch (source.source) {
    case "userSettings":
    case "projectSettings":
    case "localSettings": {
      let settingsFilePathForSource = getSettingsFilePathForSource(source.source);
      return `To change or remove this hook, edit ${settingsFilePathForSource ? escapeControlCharsForDisplay(getDisplayPath(settingsFilePathForSource)) : "settings.json"} or ask Claude.`;
    }
    case "pluginHook":
      return source.pluginName
        ? `This hook comes from the ${escapeControlCharsForDisplay(source.pluginName)} plugin and stops running when that plugin is disabled (/plugin).`
        : "This hook comes from a plugin and stops running when that plugin is disabled (/plugin).";
    case "builtinHook":
      return "This hook is built in to Claude Code and can't be changed or removed.";
    case "sessionHook":
      return "This hook was registered while Claude Code was running (by /goal, an agent or a skill), not by a settings file, and can't be changed here.";
    case "policySettings":
      return "This hook is set by your organization's managed settings and can't be changed here.";
  }
}
export {
  getAllHooks,
  sortMatchersByPriority,
  getHookDisplayText,
  getHookStatusText,
  getHookProgressDisplay,
  hookSourceInlineDisplayString,
  hookSourceHeaderDisplayString,
  hookSourceDescriptionDisplayString,
  getHookSourceEditHint,
  isHookEqual,
  filterHooksByPluginHold,
  isHookPluginSatisfied,
};
