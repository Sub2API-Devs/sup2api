/**
 * commands/plugin/skillHealth.ts
 *
 * 2.1.316 新增：技能健康度看板数据（/api/claude_code/skills，tengu_skills_dashboard_enabled）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (11)
 * attribution: placement 11
 */
import { join, resolve, sep } from "path";
import { readFile } from "fs/promises";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { y, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { streamFallbackWarning } from "../../services/api/streamFallbackWarning.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { readLocalMarketplaceFile, enoentError } from "../../utils/plugins/localMarketplacePaths.js";
import { getExistingSessionPluginCachePath } from "../../utils/plugins/zipCache.js";
import { getPluginsDirectory } from "../../utils/plugins/pluginDirectories.js";
import { marketplaceOf, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { loadKnownMarketplacesSafe, seedDirFor } from "../../utils/plugins/marketplaceManager.js";
import { isLocalMarketplaceSource } from "../../utils/plugins/reconciler.js";
import { useSettingsSyncEffect } from "../../state/AppState.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { formatErrorMessage } from "./PluginErrors.js";

//@ chunk-vrb44rx7.js:125194-125233 placement
var SKILL_HEALTH_LEVELS = new Set(["good", "warn", "poor"]);
//@ chunk-vrb44rx7.js:125233-125286 placement
function isSkillHealthLevel(health) {
  return typeof health === "string" && SKILL_HEALTH_LEVELS.has(health);
}
//@ chunk-vrb44rx7.js:125286-125352 placement
function cachedSkillHealth(i, credentials) {
  i.skillHealthMap ??= fetchSkillHealth(credentials);
  return i.skillHealthMap;
}
//@ chunk-vrb44rx7.js:125352-125900 placement
/**
 * 拉取技能健康度（开关关闭或失败时返回 null）。
 */
async function fetchSkillHealth(credentials) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_skills_dashboard_enabled", false)) return null;
  try {
    let h = await apiClient.get("/api/claude_code/skills", {
      auth: "async",
      timeout: 5000,
      validateStatus: () => true,
      credentials,
    });
    if (!h.ok) {
      logForDebugging(`Skill health fetch skipped: ${h.reason}`);
      return null;
    }
    if (h.status >= 400) {
      logForDebugging(`Skill health fetch skipped: status ${h.status}`);
      return null;
    }
    let skills = h.data?.skills;
    if (!Array.isArray(skills)) return null;
    let C = new Map();
    for (let skill of skills)
      if (skill.skill_name && isSkillHealthLevel(skill.health)) C.set(skill.skill_name, skill.health);
    return C;
  } catch (error) {
    logForDebugging(`Skill health fetch skipped: ${error}`);
    return null;
  }
}
//@ chunk-vrb44rx7.js:125900-126039 placement
/**
 * 按当前凭据异步拉取技能健康度看板数据，组件卸载后忽略结果；返回数据或 null。
 */
function useSkillHealthData() {
  let { credentials } = useTheme_2();
  let [h, k] = y(null);
  P(() => {
    let C = false;
    cachedSkillHealth(streamFallbackWarning(), credentials).then((x) => {
      if (!C && x) k(x);
    });
    return () => {
      C = true;
    };
  }, [credentials]);
  return h;
}
//@ chunk-vrb44rx7.js:126132-126345 placement = readMarketplaceJsonContent (0.844)
/**
 * 读取工作区 .claude-plugin/marketplace.json 内容（存储后端模式经存储层）。
 */
async function readMarketplaceJsonContent(storageV5, plugin) {
  let k = join(plugin.path, "..", ".claude-plugin", "marketplace.json");
  if (isStorageV5Enabled() && storageV5 !== undefined && (await isLocalOnlyPlugin(storageV5, plugin))) {
    let localMarketplaceFile = await readLocalMarketplaceFile(storageV5, "workspace", k);
    if ("absent" in localMarketplaceFile) throw enoentError(k);
    return localMarketplaceFile.text;
  }
  return readFile(k, "utf-8");
}
//@ chunk-vrb44rx7.js:126345-126608 placement
/**
 * 判断插件是否只在本机存在（不在插件目录/会话缓存里）：内联市场插件，或来自本地市场源且没有种子目录的插件。
 */
async function isLocalOnlyPlugin(i, h) {
  let existingSessionPluginCachePath = getExistingSessionPluginCachePath();
  if (
    isPathInsideDir(getPluginsDirectory(), h.path) ||
    (existingSessionPluginCachePath !== null && isPathInsideDir(existingSessionPluginCachePath, h.path))
  )
    return false;
  let C = marketplaceOf(h.source);
  if (C !== undefined) return C === INLINE_PLUGIN_MARKETPLACE;
  let x = marketplaceSuffix(h.source);
  if (x === undefined) return false;
  let T = (await loadKnownMarketplacesSafe(i))[x];
  return T !== undefined && isLocalMarketplaceSource(T.source) && seedDirFor(T.installLocation) === undefined;
}
//@ chunk-vrb44rx7.js:126608-126678 placement
function isPathInsideDir(i, path) {
  let k = resolve(i);
  let C = resolve(path);
  return C === k || C.startsWith(k + sep);
}
//@ chunk-vrb44rx7.js:126678-126682 placement
init_react_production();
//@ chunk-vrb44rx7.js:126682-126762 placement
function watchSkillHealthInvalidation(getEnabledPluginsBySource, enabledPluginsEqual) {
  let [k, C] = y(getEnabledPluginsBySource);
  useSettingsSyncEffect(() => {
    let x = getEnabledPluginsBySource();
    C((T) => (enabledPluginsEqual(T, x) ? T : x));
  });
  return k;
}
//@ chunk-vrb44rx7.js:126762-126794 placement
function formatSkillErrorMessage(error) {
  return stripInvisibleKeepEmoji(formatErrorMessage(error));
}
export {
  useSkillHealthData,
  watchSkillHealthInvalidation,
  readMarketplaceJsonContent,
  formatSkillErrorMessage,
};
