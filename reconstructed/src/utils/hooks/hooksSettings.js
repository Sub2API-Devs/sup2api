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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
} from "path";
import { Rs } from "./hookSerialization.js";
import { eKt } from "./managedHooksOnly.js";
import { n6e } from "./sessionHooks.js";
import { yYt } from "../permissions/permissionsLoader.js";
import { Mu } from "../stringUtils.js";
import { scriptHookDisplayLabel } from "./scriptHooks.js";
import { getSettingsForSource, getSettingsFilePathForSource } from "../settings/settings.js";
import { EDITABLE_SETTING_SOURCES, isSettingSourceEnabled, SOURCES } from "../settings/constants.js";
import { getSessionId } from "../../bootstrap/state.js";
import { uniq } from "../collections.js";
import { getDisplayPath } from "../file.js";
import { defaultShellKind } from "../shell/shellToolUtils.js";
import { jsonStringify } from "../slowOperations.js";

//@ chunk-s61vbvea.js:200006-200126 placement
var isInternalCallbackHookMatcher = (e) =>
  e.pluginRoot === void 0 &&
  e.deviceOwner === void 0 &&
  e.hooks.every((hook) => hook.type === "callback" || hook.type === "function");
//@ chunk-s61vbvea.js:200126-200256 placement
function isManagedHookMatcher(e, n) {
  let r = () => e.deviceOwner === void 0 && n.managedKeys.has(Rs(e));
  return e.pluginId !== void 0 ? eKt(e.pluginId) : isInternalCallbackHookMatcher(e) || r();
}
//@ chunk-s61vbvea.js:200256-200312 placement
function qh(e, n) {
  try {
    return isManagedHookMatcher(e, n);
  } catch {
    return isInternalCallbackHookMatcher(e);
  }
}
/**
 * 判断单个钩子条目能否解析出所属插件且该插件满足条件（解析出错视为否），用于按插件过滤钩子设置。
 */
//@ chunk-s61vbvea.js:200312-200387 placement
function Eqr(e) {
  try {
    let n = n6e(e);
    return n !== void 0 && yYt(n);
  } catch {
    return !1;
  }
}
/**
 * 按托管键过滤会话 hooks 集合（名字配错，与自动更新无关，见 lead 建议）。
 */
//@ chunk-s61vbvea.js:200387-200618 placement = getAutoUpdatedPluginNames (0.672)
function getAutoUpdatedPluginNames(e, n, r) {
  if (!(e.pluginId === void 0 && e.hooks.some((hook) => n6e(hook) !== void 0)))
    return qh(e, n) === r ? [] : [e];
  let filtered = e.hooks.filter((hook) => Eqr(hook) !== r),
    y = filtered.length === e.hooks.length;
  if (y || filtered.length === 0) return y ? [e] : [];
  return [{ ...e, hooks: filtered }];
}
/**
 * 钩子的显示文本：command（含 args）、prompt、url、server/tool、script 文件、callback、function。
 */
//@ chunk-s61vbvea.js:374768-375124 fingerprint = getHookDisplayText (0.633)
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
      return hook.file !== void 0 ? Mu(hook.file) : scriptHookDisplayLabel(hook.script ?? "");
    case "callback":
      return "callback";
    case "function":
      return "function";
  }
}
/**
 * 钩子进度显示：{command 显示文本, statusMessage}。
 */
//@ chunk-s61vbvea.js:375124-375244 layout
function getHookProgressDisplay(e) {
  return {
    command: Mu(getHookDisplayText(e)),
    statusMessage: "statusMessage" in e && e.statusMessage ? Mu(e.statusMessage) : void 0,
  };
}
/**
 * 钩子运行时的状态文本：有 statusMessage 用它，否则用显示文本。
 */
//@ chunk-s61vbvea.js:375244-375329 layout
function getHookStatusText(e) {
  return Mu("statusMessage" in e && e.statusMessage ? e.statusMessage : getHookDisplayText(e));
}
/**
 * 列出全部已配置钩子（各 settings 来源按文件去重 + 当前会话钩子），allowManagedHooksOnly 时跳过 settings。
 */
//@ chunk-s61vbvea.js:375329-375832 fingerprint = getAllHooks (0.755)
function getAllHooks(appState) {
  let hooks = [];
  if (getSettingsForSource("policySettings")?.allowManagedHooksOnly !== !0) {
    let filtered = EDITABLE_SETTING_SOURCES.filter(isSettingSourceEnabled),
      seenFiles = new Set();
    for (let source of filtered) {
      let filePath = getSettingsFilePathForSource(source);
      if (filePath) {
        let resolvedPath = resolve_5(filePath);
        if (seenFiles.has(resolvedPath)) continue;
        seenFiles.add(resolvedPath);
      }
      let sourceSettings = getSettingsForSource(source);
      if (!sourceSettings?.hooks) continue;
      for (let [P, j] of Object.entries(sourceSettings.hooks))
        for (let G of j)
          for (let hookCommand of G.hooks)
            hooks.push({ event: P, config: hookCommand, matcher: G.matcher, source: source });
    }
  }
  let sessionId = getSessionId();
  for (let [y, S] of appState.get(sessionId).entries())
    for (let matcher of S)
      for (let hookCommand of matcher.hooks)
        hooks.push({ event: y, config: hookCommand, matcher: matcher.matcher, source: "sessionHook" });
  return hooks;
}
/**
 * 钩子来源 → 描述/标题/行内文案表（userSettings、projectSettings、localSettings、policySettings、pluginHook、sessionHook、builtinHook）。
 */
//@ chunk-s61vbvea.js:375832-376617 fingerprint = hookSourceDescriptionDisplayString (0.389)
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
  policySettings: { description: "policySettings", header: "policySettings", inline: "policySettings" },
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
/**
 * 钩子来源的长描述（如 User settings (~/.claude/settings.json)）。
 */
//@ chunk-s61vbvea.js:376617-376662 layout
function hookSourceDescriptionDisplayString(e) {
  return HOOK_SOURCE_LABELS[e]?.description ?? e;
}
/**
 * 钩子来源的标题文案（如 User Settings）。
 */
//@ chunk-s61vbvea.js:376662-376702 layout
function hookSourceHeaderDisplayString(e) {
  return HOOK_SOURCE_LABELS[e]?.header ?? e;
}
/**
 * 钩子来源的行内短文案（如 User、Plugin、Session）。
 */
//@ chunk-s61vbvea.js:376702-376742 layout
function hookSourceInlineDisplayString(e) {
  return HOOK_SOURCE_LABELS[e]?.inline ?? e;
}
/**
 * /hooks 界面里按来源优先级（插件/内置最后）再按名字排序 matcher。
 */
//@ chunk-s61vbvea.js:376742-377065 fingerprint = sortMatchersByPriority (1)
function sortMatchersByPriority(matchers, hooksByEventAndMatcher, selectedEvent) {
  let sourcePriority = SOURCES.reduce((acc, source, index) => ((acc[source] = index), acc), {});
  return [...matchers].sort((h, y) => {
    let S = hooksByEventAndMatcher[selectedEvent]?.[h] || [],
      w = hooksByEventAndMatcher[selectedEvent]?.[y] || [],
      R = uniq(S.map((L) => L.source)),
      x = uniq(w.map((L) => L.source)),
      getSourcePriority = (source) =>
        source === "pluginHook" || source === "builtinHook" ? 999 : sourcePriority[source],
      aHighestPriority = Math.min(...R.map(getSourcePriority)),
      bHighestPriority = Math.min(...x.map(getSourcePriority));
    if (aHighestPriority !== bHighestPriority) return aHighestPriority - bHighestPriority;
    return h.localeCompare(y);
  });
}
/**
 * 告诉用户该钩子在哪里修改或删除（settings 文件路径、插件、内置、会话、组织策略）。
 */
//@ chunk-bajxb7bf.js:47171-47988 fingerprint = hookSourceInlineDisplayString (0.375)
function getHookSourceEditHint(source) {
  switch (source.source) {
    case "userSettings":
    case "projectSettings":
    case "localSettings": {
      let o = getSettingsFilePathForSource(source.source);
      return `To change or remove this hook, edit ${o ? Mu(getDisplayPath(o)) : "settings.json"} or ask Claude.`;
    }
    case "pluginHook":
      return source.pluginName
        ? `This hook comes from the ${Mu(source.pluginName)} plugin and stops running when that plugin is disabled (/plugin).`
        : "This hook comes from a plugin and stops running when that plugin is disabled (/plugin).";
    case "builtinHook":
      return "This hook is built in to Claude Code and can't be changed or removed.";
    case "sessionHook":
      return "This hook was registered while Claude Code was running (by /goal, an agent or a skill), not by a settings file, and can't be changed here.";
    case "policySettings":
      return "This hook is set by your organization's managed settings and can't be changed here.";
  }
}
/**
 * 判断两个钩子配置是否相同（按类型比较 command/args/shell/prompt/url/server/tool/input/script/file 与 if）；function 钩子永不相等。
 */
//@ chunk-f9asxqh1.js:4192-4888 fingerprint = isHookEqual (0.737)
function isHookEqual(a, b) {
  if (a.type !== b.type) return !1;
  let sameIf = (r, f) => (r.if ?? "") === (f.if ?? "");
  switch (a.type) {
    case "command": {
      let r = defaultShellKind();
      return (
        b.type === "command" &&
        a.command === b.command &&
        jsonStringify(a.args ?? null) === jsonStringify(b.args ?? null) &&
        (a.shell ?? r) === (b.shell ?? r) &&
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
      return !1;
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
  getAutoUpdatedPluginNames,
  Eqr,
};
