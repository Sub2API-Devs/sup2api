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
import { readFile, readFile as readFile_2 } from "fs/promises";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { y, P, j } from "../../../vendor/react/cjs/react.production.js";
import { Ws } from "../../services/api/streamFallbackWarning.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { readLocalMarketplaceFile, enoentError } from "../../utils/plugins/localMarketplacePaths.js";
import { getExistingSessionPluginCachePath } from "../../utils/plugins/zipCache.js";
import { getPluginsDirectory } from "../../utils/plugins/pluginDirectories.js";
import { marketplaceOf, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../../utils/telemetry/pluginTelemetry.js";
import { loadKnownMarketplacesSafe, seedDirFor } from "../../utils/plugins/marketplaceManager.js";
import { isLocalMarketplaceSource } from "../../utils/plugins/reconciler.js";
import { kJe } from "../../state/AppState.js";
import { stripInvisibleKeepEmoji } from "../../utils/settings/marketplaceSettingsAliases.js";
import { formatErrorMessage } from "./PluginErrors.js";

//@ chunk-vrb44rx7.js:125194-125233 placement
var SKILL_HEALTH_LEVELS = new Set(["good", "warn", "poor"]);
//@ chunk-vrb44rx7.js:125233-125286 placement
function ny(i) {
  return typeof i === "string" && SKILL_HEALTH_LEVELS.has(i);
}
//@ chunk-vrb44rx7.js:125286-125352 placement
function oy(i, h) {
  return ((i.skillHealthMap ??= fetchSkillHealth(h)), i.skillHealthMap);
}
/**
 * 拉取技能健康度（开关关闭或失败时返回 null）。
 */
//@ chunk-vrb44rx7.js:125352-125900 placement
async function fetchSkillHealth(i) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_skills_dashboard_enabled", !1)) return null;
  try {
    let h = await apiClient.get("/api/claude_code/skills", {
      auth: "async",
      timeout: 5000,
      validateStatus: () => !0,
      credentials: i,
    });
    if (!h.ok) return (logForDebugging(`Skill health fetch skipped: ${h.reason}`), null);
    if (h.status >= 400) return (logForDebugging(`Skill health fetch skipped: status ${h.status}`), null);
    let k = h.data?.skills;
    if (!Array.isArray(k)) return null;
    let C = new Map();
    for (let x of k) if (x.skill_name && ny(x.health)) C.set(x.skill_name, x.health);
    return C;
  } catch (error) {
    return (logForDebugging(`Skill health fetch skipped: ${error}`), null);
  }
}
/**
 * 按当前凭据异步拉取技能健康度看板数据，组件卸载后忽略结果；返回数据或 null。
 */
//@ chunk-vrb44rx7.js:125900-126039 placement
function useSkillHealthData() {
  let { credentials: credentials } = Me(),
    [h, k] = y(null);
  return (
    P(() => {
      let C = !1;
      return (
        oy(Ws(), credentials).then((x) => {
          if (!C && x) k(x);
        }),
        () => {
          C = !0;
        }
      );
    }, [credentials]),
    h
  );
}
/**
 * 读取工作区 .claude-plugin/marketplace.json 内容（存储后端模式经存储层）。
 */
//@ chunk-vrb44rx7.js:126132-126345 placement = readMarketplaceJsonContent (0.844)
async function readMarketplaceJsonContent(i, h) {
  let k = join(h.path, "..", ".claude-plugin", "marketplace.json");
  if (isStorageV5Enabled() && i !== void 0 && (await isLocalOnlyPlugin(i, h))) {
    let C = await readLocalMarketplaceFile(i, "workspace", k);
    if ("absent" in C) throw enoentError(k);
    return C.text;
  }
  return readFile_2(k, "utf-8");
}
/**
 * 判断插件是否只在本机存在（不在插件目录/会话缓存里）：内联市场插件，或来自本地市场源且没有种子目录的插件。
 */
//@ chunk-vrb44rx7.js:126345-126608 placement
async function isLocalOnlyPlugin(i, h) {
  let k = getExistingSessionPluginCachePath();
  if (bd(getPluginsDirectory(), h.path) || (k !== null && bd(k, h.path))) return !1;
  let C = marketplaceOf(h.source);
  if (C !== void 0) return C === INLINE_PLUGIN_MARKETPLACE;
  let x = marketplaceSuffix(h.source);
  if (x === void 0) return !1;
  let T = (await loadKnownMarketplacesSafe(i))[x];
  return T !== void 0 && isLocalMarketplaceSource(T.source) && seedDirFor(T.installLocation) === void 0;
}
//@ chunk-vrb44rx7.js:126608-126678 placement
function bd(i, h) {
  let k = resolve(i),
    C = resolve(h);
  return C === k || C.startsWith(k + sep);
}
//@ chunk-vrb44rx7.js:126678-126682 placement
j();
//@ chunk-vrb44rx7.js:126682-126762 placement
function wd(i, h) {
  let [k, C] = y(i);
  return (
    kJe(() => {
      let x = i();
      C((T) => (h(T, x) ? T : x));
    }),
    k
  );
}
//@ chunk-vrb44rx7.js:126762-126794 placement
function Io(i) {
  return stripInvisibleKeepEmoji(formatErrorMessage(i));
}

export { useSkillHealthData, wd, readMarketplaceJsonContent, Io };
