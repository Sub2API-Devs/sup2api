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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { isFirstPartyTelemetryBlocked } from "../hostEnvironment.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { parsePluginIdentifier, isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { isPluginInstalled } from "./installedPluginsManager.js";
import { isPluginBlockedByPolicy } from "./marketplacePolicy.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { installSelectedPlugins } from "./pluginStartupCheck.js";
import { logForDebugging } from "../debug.js";
import { getPluginByIdAnySource } from "./marketplaceManager.js";
import { Bd } from "./commandSource.js";
import { errorMessage } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";

//@ chunk-18hwfzwa.js:1804920-1804924 placement
j();
//@ chunk-18hwfzwa.js:1804924-1804936 layout
var KGo = 100;
/**
 * 记录 CLI/工具输出中的 <claude-code-hint> 插件推荐（全局 claudeCodeHints，每会话最多一次）。
 */
//@ chunk-18hwfzwa.js:1804936-1805306 fingerprint = maybeRecordPluginHint (0.607)
function maybeRecordPluginHint(h, x) {
  if (isFirstPartyTelemetryBlocked()) return;
  if (x.shownThisSession) return;
  let state = getGlobalConfig().claudeCodeHints;
  if (state?.disabled) return;
  let shown = state?.plugin ?? [];
  if (shown.length >= KGo) return;
  let pluginId = h.value,
    { name: name, marketplace: marketplace } = parsePluginIdentifier(pluginId);
  if (!name || !marketplace) return;
  if (!isOfficialMarketplaceName_3(marketplace)) return;
  if (shown.includes(pluginId)) return;
  if (isPluginInstalled(pluginId)) return;
  if (isPluginBlockedByPolicy(pluginId)) return;
  let { hintedPluginIds: hintedPluginIds } = getPluginRegistry();
  if (hintedPluginIds.has(pluginId)) return;
  (hintedPluginIds.add(pluginId), x.offer(h));
}
/**
 * 解析插件推荐：已安装（含别名 ID）则丢弃，否则从市场取条目供提示安装。
 */
//@ chunk-18hwfzwa.js:1805306-1805970 fingerprint = resolvePluginHint (0.814)
async function resolvePluginHint(h, x) {
  let pluginId = h.value,
    { name: name, marketplace: marketplace } = parsePluginIdentifier(pluginId);
  if ((await installSelectedPlugins(pluginId, x)) !== void 0)
    return (
      logForDebugging(`[hintRecommendation] ${pluginId} is installed under its other id; hint dropped`),
      null
    );
  let ke;
  try {
    ke = await getPluginByIdAnySource(pluginId, x, "install");
  } catch (error) {
    if (error instanceof Bd)
      return (logForDebugging(`Plugin hint ${pluginId} not resolvable: ${errorMessage(error)}`), null);
    throw error;
  }
  if (
    (logEvent("tengu_plugin_hint_detected", {
      _PROTO_plugin_name: name ?? "",
      _PROTO_marketplace_name: marketplace ?? "",
      result: lit_2(ke ? "passed" : "not_in_cache"),
    }),
    !ke)
  )
    return (logForDebugging(`[hintRecommendation] ${pluginId} not found in marketplace cache`), null);
  return {
    pluginId: pluginId,
    pluginName: getPluginDisplayName(ke.entry),
    marketplaceName: marketplace ?? "",
    pluginDescription: ke.entry.description,
    sourceCommand: h.sourceCommand,
  };
}
/**
 * 记下某插件推荐已展示过（全局配置 claudeCodeHints.plugin）。
 */
//@ chunk-18hwfzwa.js:1805970-1806131 fingerprint = markHintPluginShown (1)
function markHintPluginShown(h, x) {
  saveGlobalConfig((current) => {
    let existing = current.claudeCodeHints?.plugin ?? [];
    if (existing.includes(h)) return current;
    return { ...current, claudeCodeHints: { ...current.claudeCodeHints, plugin: [...existing, h] } };
  }, x);
}
/**
 * 关闭插件推荐（claudeCodeHints.disabled=true）。
 */
//@ chunk-18hwfzwa.js:1806131-1806264 fingerprint = disableHintRecommendations (1)
function disableHintRecommendations(h) {
  saveGlobalConfig((current) => {
    if (current.claudeCodeHints?.disabled) return current;
    return { ...current, claudeCodeHints: { ...current.claudeCodeHints, disabled: !0 } };
  }, h);
}

export { maybeRecordPluginHint, resolvePluginHint, markHintPluginShown, disableHintRecommendations };
