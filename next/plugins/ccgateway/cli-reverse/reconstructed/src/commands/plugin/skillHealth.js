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
import { useState, useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrb44rx7.js:125194-125233 placement
var SKILL_HEALTH_LEVELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:125194", () => {
  SKILL_HEALTH_LEVELS = new Set(["good", "warn", "poor"]);
});
//@ chunk-vrb44rx7.js:125233-125286 placement
function isSkillHealthLevel(health) {
  return typeof health === "string" && SKILL_HEALTH_LEVELS.has(health);
}
//@ chunk-vrb44rx7.js:125286-125352 placement
function cachedSkillHealth(streamWarning, credentials) {
  streamWarning.skillHealthMap ??= fetchSkillHealth(credentials);
  return streamWarning.skillHealthMap;
}
//@ chunk-vrb44rx7.js:125352-125900 placement
/**
 * 拉取技能健康度（开关关闭或失败时返回 null）。
 */
async function fetchSkillHealth(credentials) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_skills_dashboard_enabled", false)) return null;
  try {
    let response = await apiClient.get("/api/claude_code/skills", {
      auth: "async",
      timeout: 5000,
      validateStatus: () => true,
      credentials,
    });
    if (!response.ok) {
      logForDebugging(`Skill health fetch skipped: ${response.reason}`);
      return null;
    }
    if (response.status >= 400) {
      logForDebugging(`Skill health fetch skipped: status ${response.status}`);
      return null;
    }
    let skills = response.data?.skills;
    if (!Array.isArray(skills)) return null;
    let byName = new Map();
    for (let skill of skills)
      if (skill.skill_name && isSkillHealthLevel(skill.health)) byName.set(skill.skill_name, skill.health);
    return byName;
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
  let [health, setHealth] = useState(null);
  useEffect(() => {
    let loaded = false;
    cachedSkillHealth(streamFallbackWarning(), credentials).then((health) => {
      if (!loaded && health) setHealth(health);
    });
    return () => {
      loaded = true;
    };
  }, [credentials]);
  return health;
}
//@ chunk-vrb44rx7.js:126132-126345 placement (2.1.88 match: readMarketplaceJsonContent, 0.844)
/**
 * 读取工作区 .claude-plugin/marketplace.json 内容（存储后端模式经存储层）。
 */
async function readMarketplaceJsonContent(storageV5, plugin) {
  let marketplacePath = join(plugin.path, "..", ".claude-plugin", "marketplace.json");
  if (isStorageV5Enabled() && storageV5 !== undefined && (await isLocalOnlyPlugin(storageV5, plugin))) {
    let localMarketplaceFile = await readLocalMarketplaceFile(storageV5, "workspace", marketplacePath);
    if ("absent" in localMarketplaceFile) throw enoentError(marketplacePath);
    return localMarketplaceFile.text;
  }
  return readFile(marketplacePath, "utf-8");
}
//@ chunk-vrb44rx7.js:126345-126608 placement
/**
 * 判断插件是否只在本机存在（不在插件目录/会话缓存里）：内联市场插件，或来自本地市场源且没有种子目录的插件。
 */
async function isLocalOnlyPlugin(storageV5, plugin) {
  let dir = getExistingSessionPluginCachePath();
  if (
    isPathInsideDir(getPluginsDirectory(), plugin.path) ||
    (dir !== null && isPathInsideDir(dir, plugin.path))
  )
    return false;
  let marketplace = marketplaceOf(plugin.source);
  if (marketplace !== undefined) return marketplace === INLINE_PLUGIN_MARKETPLACE;
  let suffix = marketplaceSuffix(plugin.source);
  if (suffix === undefined) return false;
  let known = (await loadKnownMarketplacesSafe(storageV5))[suffix];
  return (
    known !== undefined &&
    isLocalMarketplaceSource(known.source) &&
    seedDirFor(known.installLocation) === undefined
  );
}
//@ chunk-vrb44rx7.js:126608-126678 placement
function isPathInsideDir(dir, path) {
  let parent = resolve(dir);
  let child = resolve(path);
  return child === parent || child.startsWith(parent + sep);
}
//@ chunk-vrb44rx7.js:126678-126682 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:126678", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:126682-126762 placement
function watchSkillHealthInvalidation(getEnabledPluginsBySource, enabledPluginsEqual) {
  let [current, setCurrent] = useState(getEnabledPluginsBySource);
  useSettingsSyncEffect(() => {
    let snapshot = getEnabledPluginsBySource();
    setCurrent((prev) => (enabledPluginsEqual(prev, snapshot) ? prev : snapshot));
  });
  return current;
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
