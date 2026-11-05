/**
 * utils/codeMode/modHooksGate.ts
 *
 * 判定插件是否为会检查工具调用的 mod（有 JS hook），不支持时给出拒绝文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d5d5va77.js (4)
 * attribution: placement 4
 */
import { isOfficialMarketplacePlugin } from "../../plugins/functionHooks/panes.js";
import { getHooksModuleScan } from "../../plugins/functionHooks/hooksModuleScan.js";
import { matchesEventPattern } from "../../plugins/functionHooks/eventPatterns.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { hasLink } from "../hasLink.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherTestTarget } from "../hooks/matcherGrammar.js";
import { logError } from "../log.js";
import { CODE_MODE_LABEL, CODE_MODE_EXPERIMENTAL_LABEL } from "../../constants/codeMode.js";
import { codeModeEnvHint } from "../foresightStatus.js";

//@ chunk-d5d5va77.js:554-975 placement
/**
 * 需要判断的 hook 事件名表与其中属于工具调用检查的子集。
 */
var HOOK_EVENT_PATTERNS = [
  "tool.call",
  "tool.check",
  "classic.PreToolUse",
  "classic.PermissionRequest",
  "classic.PermissionDenied",
  "classic.PostToolUse",
  "classic.PostToolUseFailure",
  "agent.offer",
  "agent.spawn",
  "session.send",
  "classic.TaskCreated",
  "classic.TaskCompleted",
  "classic.Elicitation",
  "classic.ElicitationResult",
  "classic.WorktreeCreate",
];
var SETTINGS_ONLY_EVENTS = new Set([
  "tool.call",
  "classic.PreToolUse",
  "classic.PostToolUse",
  "classic.PostToolUseFailure",
]);
//@ chunk-d5d5va77.js:975-1187 placement
/**
 * 给定模块里是否装有会检查工具调用的 hook。
 */
async function hasHookingPlugin(enabled) {
  for (let plugin of enabled) {
    if (plugin.modulePath === undefined || isOfficialMarketplacePlugin(plugin.source)) continue;
    try {
      let { hooks } = await getHooksModuleScan(plugin.modulePath, plugin.path, plugin.name);
      if (
        hooks.some((hook) =>
          HOOK_EVENT_PATTERNS.some((eventPattern) => matchesEventPattern(hook, eventPattern)),
        )
      )
        return true;
    } catch {
      return true;
    }
  }
  return false;
}
//@ chunk-d5d5va77.js:1187-1609 placement
/**
 * 列出对这次工具调用生效的 mod 插件名；settingsHooksOff 时排除工具调用类事件。
 */
async function pluginsHookingTool(tool, context) {
  let patterns =
    context.options.settingsHooksOff === true
      ? HOOK_EVENT_PATTERNS.filter((pattern) => !SETTINGS_ONLY_EVENTS.has(pattern))
      : HOOK_EVENT_PATTERNS;
  try {
    let pluginRegistry = getPluginRegistry();
    let seen = new Set();
    for (;;) {
      let filtered = [...pluginRegistry.hooksRespawns].filter((hooksRespawn) => !seen.has(hooksRespawn));
      if (filtered.length === 0) break;
      for (let respawn of filtered) seen.add(respawn);
      await Promise.allSettled(filtered);
    }
    return pluginRegistry.loadedModules
      .filter(
        (loadedModule) =>
          !hasLink(loadedModule) &&
          patterns.some((pattern) =>
            hasModuleHookingSite(
              pattern,
              pattern === "tool.call"
                ? {
                    tool: tool.name,
                  }
                : pattern === "tool.check"
                  ? matcherTestTarget(tool)
                  : undefined,
              [loadedModule],
            ),
          ),
      )
      .map((loadedModule) => loadedModule.name);
  } catch (error) {
    logError(error);
    return "unknown";
  }
}
//@ chunk-d5d5va77.js:1609-2527 placement
/**
 * 脚本内调用遇到会检查工具调用的 mod 时的拒绝文案（含禁用插件或关掉 Code 模式的指引）。
 */
function hookingPluginNotice(pluginNames) {
  let fallbackAdvice = `or exit and start a new session with ${CODE_MODE_LABEL} off (${codeModeEnvHint(0)}). This conversation can only be continued in ${CODE_MODE_LABEL}.`;
  if (pluginNames === "unknown")
    return `This call was not made. Claude Code could not find out whether an installed plugin is a mod (a plugin with JavaScript hooks) that checks tool calls, and ${CODE_MODE_EXPERIMENTAL_LABEL} does not yet support that for a tool call that your code makes. Do not look for another way to do the same thing. Tell the user that they can try again, ${fallbackAdvice}`;
  let [who, them] =
    pluginNames.length === 1
      ? [`The plugin ${pluginNames[0]} is a mod (it has JavaScript hooks)`, "that plugin"]
      : [`The plugins ${pluginNames.join(", ")} are mods (they have JavaScript hooks)`, "those plugins"];
  return `This call was not made. ${who} that may check tool calls, and ${CODE_MODE_EXPERIMENTAL_LABEL} does not yet support that for a tool call that your code makes. Do not look for another way to do the same thing. Tell the user that they can disable ${them} with /plugin and go on here, ${fallbackAdvice}`;
}
export { hasHookingPlugin, pluginsHookingTool, hookingPluginNotice };
