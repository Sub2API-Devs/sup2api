/**
 * utils/plugins/hintRecommendation.ts
 *
 * 并入旧版已有路径：插件推荐提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/hintRecommendation.ts
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 1, layout 1, fingerprint 4
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { isFirstPartyTelemetryBlocked } from "../hostEnvironment.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { parsePluginIdentifier, isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { isPluginInstalled } from "./installedPluginsManager.js";
import { isPluginBlockedByPolicy } from "./marketplacePolicy.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { installSelectedPlugins } from "./pluginStartupCheck.js";
import { logForDebugging } from "../debug.js";
import { getPluginByIdAnySource } from "./marketplaceManager.js";
import { CommandSourceError } from "./commandSource.js";
import { errorMessage } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1804920-1804924 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1804920", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1804924-1804936 layout
var MAX_PLUGIN_HINTS_PER_SESSION = 100;
//@ chunk-18hwfzwa.js:1804936-1805306 fingerprint (2.1.88 match: maybeRecordPluginHint, 0.607)
/**
 * 记录 CLI/工具输出中的 <claude-code-hint> 插件推荐（全局 claudeCodeHints，每会话最多一次）。
 */
function maybeRecordPluginHint(hint, pendingHint) {
  if (isFirstPartyTelemetryBlocked()) return;
  if (pendingHint.shownThisSession) return;
  let state = getGlobalConfig().claudeCodeHints;
  if (state?.disabled) return;
  let shown = state?.plugin ?? [];
  if (shown.length >= MAX_PLUGIN_HINTS_PER_SESSION) return;
  let pluginId = hint.value;
  let { name, marketplace } = parsePluginIdentifier(pluginId);
  if (!name || !marketplace) return;
  if (!isOfficialMarketplaceName_3(marketplace)) return;
  if (shown.includes(pluginId)) return;
  if (isPluginInstalled(pluginId)) return;
  if (isPluginBlockedByPolicy(pluginId)) return;
  let { hintedPluginIds } = getPluginRegistry();
  if (hintedPluginIds.has(pluginId)) return;
  hintedPluginIds.add(pluginId);
  pendingHint.offer(hint);
}
//@ chunk-18hwfzwa.js:1805306-1805970 fingerprint (2.1.88 match: resolvePluginHint, 0.814)
/**
 * 解析插件推荐：已安装（含别名 ID）则丢弃，否则从市场取条目供提示安装。
 */
async function resolvePluginHint(hint, storageV5) {
  let pluginId = hint.value;
  let { name, marketplace } = parsePluginIdentifier(pluginId);
  if ((await installSelectedPlugins(pluginId, storageV5)) !== undefined) {
    logForDebugging(`[hintRecommendation] ${pluginId} is installed under its other id; hint dropped`);
    return null;
  }
  let pluginData;
  try {
    pluginData = await getPluginByIdAnySource(pluginId, storageV5, "install");
  } catch (error) {
    if (error instanceof CommandSourceError) {
      logForDebugging(`Plugin hint ${pluginId} not resolvable: ${errorMessage(error)}`);
      return null;
    }
    throw error;
  }
  logEvent("tengu_plugin_hint_detected", {
    _PROTO_plugin_name: name ?? "",
    _PROTO_marketplace_name: marketplace ?? "",
    result: lit_2(pluginData ? "passed" : "not_in_cache"),
  });
  if (!pluginData) {
    logForDebugging(`[hintRecommendation] ${pluginId} not found in marketplace cache`);
    return null;
  }
  return {
    pluginId,
    pluginName: getPluginDisplayName(pluginData.entry),
    marketplaceName: marketplace ?? "",
    pluginDescription: pluginData.entry.description,
    sourceCommand: hint.sourceCommand,
  };
}
//@ chunk-18hwfzwa.js:1805970-1806131 fingerprint (2.1.88 match: markHintPluginShown, 1)
/**
 * 记下某插件推荐已展示过（全局配置 claudeCodeHints.plugin）。
 */
function markHintPluginShown(pluginId, storageV5) {
  saveGlobalConfig((current) => {
    let existing = current.claudeCodeHints?.plugin ?? [];
    if (existing.includes(pluginId)) return current;
    return {
      ...current,
      claudeCodeHints: {
        ...current.claudeCodeHints,
        plugin: [...existing, pluginId],
      },
    };
  }, storageV5);
}
//@ chunk-18hwfzwa.js:1806131-1806264 fingerprint (2.1.88 match: disableHintRecommendations, 1)
/**
 * 关闭插件推荐（claudeCodeHints.disabled=true）。
 */
function disableHintRecommendations(storageV5) {
  saveGlobalConfig((current) => {
    if (current.claudeCodeHints?.disabled) return current;
    return {
      ...current,
      claudeCodeHints: {
        ...current.claudeCodeHints,
        disabled: true,
      },
    };
  }, storageV5);
}
export { maybeRecordPluginHint, resolvePluginHint, markHintPluginShown, disableHintRecommendations };
