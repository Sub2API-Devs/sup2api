/**
 * utils/plugins/pluginDirectories.ts
 *
 * 插件目录布局：插件根（~/.claude/plugins 或 cowork_plugins、CLAUDE_CODE_PLUGIN_CACHE_DIR）、种子目录、data/ 数据目录、ID 转目录名与备份文件名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginDirectories.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-e6aww6q8.js (7), chunk-f3qhjfah.js (34)
 * attribution: placement 19, fingerprint 7, layout 16, file-local 1
 */
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  delimiter,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
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
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
} from "path";
import { readdir, stat, stat as stat_2, stat as stat_3, rm } from "fs/promises";
import { getVersionFromPath } from "./pluginVersioning.js";
import { uA, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { RJr } from "./pluginLinks.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { getUseCoworkPlugins, isDiskless } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { Lu, Qg, classifyHomeMount } from "../networkPaths.js";
import { dU } from "../pathSegments.js";
import { CLAUDEAI_MARKETPLACE_PREFIX, isNpmPluginId, NPM } from "./schemas.js";
import { getFsImplementation } from "../fsOperations.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { isFsInaccessible, isENOENT, errorMessage, getErrnoCode } from "../errors.js";
import { formatFileSize } from "../format.js";
import { logForDebugging } from "../debug.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { projectPluginsDir } from "./pluginCachePaths.js";
import { CL } from "../fsJunctions.js";
import { classifyMarketplacePath } from "./localMarketplacePaths.js";
import { getPlatform } from "../platform.js";

/**
 * 把 <plugins>/cache 下的路径拆成分段（不在其下返回 null）。
 */
//@ chunk-f3qhjfah.js:2741-2910 placement
function splitPluginCachePath(e, n) {
  let r = getVersionFromPath();
  if (n !== r) return null;
  let s = relative(r, e);
  if (s === "" || s === ".." || s.startsWith(`..${sep}`) || isAbsolute_2(s)) return null;
  let parts = s.split(sep);
  return join_2(r, ...parts) === e ? parts : null;
}
/**
 * 路径是否以 .zip 结尾。
 */
//@ chunk-f3qhjfah.js:2910-2950 placement = getVersionedZipCachePath (1)
function isZipPath(e) {
  return e.endsWith(".zip");
}
/**
 * 缓存路径拆成 {marketplace, plugin, version}（必须恰好三段）。
 */
//@ chunk-f3qhjfah.js:2950-3089 placement
function parseVersionCachePath(e, n) {
  let r = splitPluginCachePath(e, n);
  if (r === null || r.length !== 3 || !uA(r) || isZipPath(r[2])) return null;
  let [s, a, c] = r;
  return { marketplace: s, plugin: a, version: c };
}
/**
 * 存储键是否指向版本目录根。
 */
//@ chunk-f3qhjfah.js:3089-3223 placement
function isVersionRootStorageKey(e) {
  return (
    e.namespace === "pluginCache" &&
    e.marketplace !== void 0 &&
    e.plugin !== void 0 &&
    e.version !== void 0 &&
    e.relPath === void 0
  );
}
//@ chunk-f3qhjfah.js:3223-3307 placement
function c5t(e, n) {
  let r = parseVersionCachePath(e, n);
  return r === null ? null : { namespace: "pluginCache", ...r };
}
/**
 * 版本根存储键转本地缓存路径。
 */
//@ chunk-f3qhjfah.js:3307-3428 placement
function storageKeyToCachePath(e, n) {
  let r = [e.marketplace, e.plugin, e.version];
  if (n !== getVersionFromPath() || !uA(r) || isZipPath(e.version)) return null;
  return join_2(n, ...r);
}
//@ chunk-f3qhjfah.js:3428-3560 placement
function cachePathToStorageKey(e, n) {
  let r = splitPluginCachePath(e, n);
  if (r === null || r.length < 4 || !uA(r) || isZipPath(r[2])) return null;
  let [s, a, c, ...l] = r;
  return STORAGE_SPACES.pluginCache(s, a, c, l);
}
//@ chunk-f3qhjfah.js:3560-3601 placement
function kkn(e, n) {
  return cachePathToStorageKey(e, n) ?? RJr(e);
}
//@ chunk-f3qhjfah.js:3601-3657 placement
function xJr(e, n) {
  return isDefaultPluginsDir(n) ? STORAGE_SPACES.pluginRegistry(e) : null;
}
//@ chunk-f3qhjfah.js:3657-3728 placement
function PJr(e, n, r) {
  return isDefaultPluginsDir(r) && uA([e]) ? STORAGE_SPACES.marketplaceCache(e, n) : null;
}
/**
 * 路径是否为默认插件根目录 <configHome>/plugins。
 */
//@ chunk-f3qhjfah.js:3728-3771 fingerprint = PLUGINS_DIR (1)
function isDefaultPluginsDir(e) {
  return e === join_2(getClaudeConfigDir(), "plugins");
}
//@ chunk-f3qhjfah.js:3771-3953 layout = getMarketplacesCacheDir (1)
function splitMarketplaceCachePath(e, n) {
  if (!isDefaultPluginsDir(n)) return null;
  let r = join_2(n, "marketplaces"),
    s = relative(r, e);
  if (s === "" || s === ".." || s.startsWith(`..${sep}`) || isAbsolute_2(s)) return null;
  let parts = s.split(sep);
  return join_2(r, ...parts) === e ? parts : null;
}
/**
 * 市场缓存路径 → 存储层的 marketplaceTree 键。
 */
//@ chunk-f3qhjfah.js:3953-4072 placement
function getMarketplaceStorageKey(e, n) {
  let r = splitMarketplaceCachePath(e, n);
  if (r === null || r.length < 2 || !uA(r)) return null;
  return STORAGE_SPACES.marketplaceTree(r[0], r.slice(1));
}
//@ chunk-f3qhjfah.js:4634-4670 fingerprint = COWORK_PLUGINS_DIR (0.727)
var PLUGINS_DIR_NAME = "plugins",
  COWORK_PLUGINS_DIR_NAME = "cowork_plugins";
//@ chunk-f3qhjfah.js:4670-4756 fingerprint = getPluginsDirectoryName (1)
function getPluginsDirectoryName() {
  if (getUseCoworkPlugins()) return COWORK_PLUGINS_DIR_NAME;
  if (env.CLAUDE_CODE_USE_COWORK_PLUGINS) return COWORK_PLUGINS_DIR_NAME;
  return PLUGINS_DIR_NAME;
}
/**
 * 是否使用默认插件目录（非 cowork、未设 CLAUDE_CODE_PLUGIN_CACHE_DIR）。
 */
//@ chunk-f3qhjfah.js:4756-4820 layout = getPluginsDirectory (1)
function isUsingDefaultPluginsDirectory() {
  return getPluginsDirectoryName() === PLUGINS_DIR_NAME && !env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
}
/**
 * 是否使用 cowork_plugins 目录。
 */
//@ chunk-f3qhjfah.js:4820-4850 layout
function isUsingCoworkPlugins() {
  return getPluginsDirectoryName() === COWORK_PLUGINS_DIR_NAME;
}
/**
 * 插件根目录：CLAUDE_CODE_PLUGIN_CACHE_DIR 覆盖，否则 ~/.claude/plugins（cowork 模式或 CLAUDE_CODE_USE_COWORK_PLUGINS 时为 cowork_plugins）。
 */
//@ chunk-f3qhjfah.js:4850-4938 layout = getPluginsDirectory (1)
function getPluginsDirectory() {
  let envOverride = env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
  if (envOverride) return Lu(envOverride);
  return join(getClaudeConfigDir(), getPluginsDirectoryName());
}
/**
 * 解析 CLAUDE_CODE_PLUGIN_SEED_DIR（按路径分隔符分开的多个只读种子目录）。
 */
//@ chunk-f3qhjfah.js:4938-5046 fingerprint = getPluginSeedDirs (1)
function getPluginSeedDirs() {
  let raw = env.CLAUDE_CODE_PLUGIN_SEED_DIR;
  if (!raw) return [];
  return raw.split(delimiter).filter(Boolean).map(Lu);
}
/**
 * 把插件 ID 中非字母数字/-/_ 的字符替换成 -（用于目录名）。
 */
//@ chunk-f3qhjfah.js:5046-5103 file-local
function sanitizePluginId(pluginId) {
  return pluginId.replace(/[^a-zA-Z0-9\-_]/g, "-");
}
/**
 * 小写的转义插件 ID。
 */
//@ chunk-f3qhjfah.js:5103-5147 layout
function sanitizePluginIdLower(e) {
  return sanitizePluginId(e).toLowerCase();
}
/**
 * 名字（NFKC 规范化后）是否以保留前缀 claudeai- 开头。
 */
//@ chunk-f3qhjfah.js:5147-5256 layout
function hasClaudeAiReservedPrefix(e) {
  let n = dU(e.normalize("NFKC"));
  return (
    n.startsWith(CLAUDEAI_MARKETPLACE_PREFIX) ||
    sanitizePluginId(n).toLowerCase().startsWith(CLAUDEAI_MARKETPLACE_PREFIX)
  );
}
/**
 * 市场名的规范键（NFKC、去不可见字符、转义、小写），用于判重。
 */
//@ chunk-f3qhjfah.js:5256-5322 layout
function canonicalMarketplaceKey(e) {
  return sanitizePluginId(dU(e.normalize("NFKC"))).toLowerCase();
}
/**
 * npm 包名中非 [a-z0-9-] 字符转义为 _hh / __hex_。
 */
//@ chunk-f3qhjfah.js:5322-5478 layout
function escapeNpmPackageForDir(e) {
  return e.replace(/[^a-z0-9-]/gu, (n) => {
    let r = n.codePointAt(0) ?? 0;
    return r <= 255 ? `_${r.toString(16).padStart(2, "0")}` : `__${r.toString(16)}_`;
  });
}
/**
 * 插件 ID → data/ 下的目录名；<pkg>@npm 用可逆转义 + -npm 后缀。
 */
//@ chunk-f3qhjfah.js:5478-5577 layout
function pluginIdToDirName(e) {
  if (isNpmPluginId(e)) {
    let sliced = e.slice(0, e.lastIndexOf("@"));
    return `${escapeNpmPackageForDir(sliced)}-${NPM}`;
  }
  return sanitizePluginId(e);
}
/**
 * 两个插件 ID 的数据目录名是否相同（忽略大小写）。
 */
//@ chunk-f3qhjfah.js:5577-5642 layout
function isSamePluginDirName(e, n) {
  return pluginIdToDirName(e).toLowerCase() === pluginIdToDirName(n).toLowerCase();
}
/**
 * installed_plugins 无效条目的“放一边”文件名 installed_plugins.set-aside.<日期>.<id>.json。
 */
//@ chunk-f3qhjfah.js:5642-5737 layout
function setAsideFileName(e, n) {
  return `installed_plugins.set-aside.${e.toISOString().slice(0, 10)}.${n}.json`;
}
/**
 * 是否为 set-aside 文件名。
 */
//@ chunk-f3qhjfah.js:5737-5839 layout
function isSetAsideFileName(e) {
  return /^installed_plugins\.set-aside\.\d{4}-\d{2}-\d{2}\.[0-9a-f]{12}\.json$/.test(e);
}
/**
 * 无法读取的 installed_plugins 备份文件名 installed_plugins.unreadable.<日期>.<id>.kept。
 */
//@ chunk-f3qhjfah.js:5839-5935 layout
function unreadableKeptFileName(e, n) {
  return `installed_plugins.unreadable.${e.toISOString().slice(0, 10)}.${n}.kept`;
}
/**
 * 是否为 unreadable.kept 文件名。
 */
//@ chunk-f3qhjfah.js:5935-6038 layout
function isUnreadableKeptFileName(e) {
  return /^installed_plugins\.unreadable\.\d{4}-\d{2}-\d{2}\.[0-9a-f]{12}\.kept$/.test(e);
}
/**
 * 插件持久数据目录 <plugins>/data/<转义后的插件 ID>（hooks/MCP 中的 ${CLAUDE_PLUGIN_DATA}）。
 */
//@ chunk-f3qhjfah.js:6038-6080 layout = pluginDataDirPath (1)
function pluginDataDirPath(pluginId) {
  return join(getPluginsDirectory(), "data", pluginIdToDirName(pluginId));
}
/**
 * 返回并（非只读模式下）创建插件数据目录。
 */
//@ chunk-f3qhjfah.js:6080-6151 layout
function ensurePluginDataDir(e) {
  let n = pluginDataDirPath(e);
  if (isDiskless()) return n;
  return (getFsImplementation().mkdirSync(n), n);
}
/**
 * 统计插件数据目录大小（卸载时提示是否删除），空目录返回 null。
 */
//@ chunk-f3qhjfah.js:6151-6516 fingerprint = getPluginDataDirSize (0.653)
async function getPluginDataDirSize(e, { throwIfUnreadable: n = !1 } = {}) {
  let dir = pluginDataDirPath(e),
    bytes = 0,
    walk = async (c) => {
      for (let entry of await readdir(c, { withFileTypes: !0 })) {
        let full = join(c, entry.name);
        if (entry.isDirectory()) await walk(full);
        else
          try {
            bytes += (await stat(full)).size;
          } catch {}
      }
    };
  try {
    await walk(dir);
  } catch (error) {
    if (n) {
      if ((await pathPresence(dir)) === "gone") return null;
      throw error;
    }
    if (isFsInaccessible(error)) return null;
    throw error;
  }
  if (bytes === 0) return null;
  return { bytes: bytes, human: formatFileSize(bytes) };
}
/**
 * 删除插件数据目录，返回 removed/absent/failed。
 */
//@ chunk-f3qhjfah.js:6516-6714 fingerprint = deletePluginDataDir (0.724)
async function deletePluginDataDir(pluginId) {
  let dir = pluginDataDirPath(pluginId);
  try {
    return (await rm(dir, { recursive: !0 }), "removed");
  } catch (error) {
    if (isENOENT(error)) return "absent";
    return (
      logForDebugging(`Failed to delete plugin data dir ${dir}: ${errorMessage(error)}`, { level: "warn" }),
      "failed"
    );
  }
}
/**
 * zip 缓存模式时返回 CLAUDE_CODE_PLUGIN_CACHE_DIR（zip 缓存根），否则 undefined。
 */
//@ chunk-e6aww6q8.js:608444-608534 fingerprint = getPluginsDirectory (1)
function getZipCacheDirOverride() {
  if (!isPluginZipCacheEnabled()) return;
  let envOverride = env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
  return envOverride ? Lu(envOverride) : void 0;
}
//@ chunk-e6aww6q8.js:732186-732240 placement
var L2e = (e, n) => typeof e === "string" && n !== void 0 && isLocalMarketplaceSource(n);
//@ chunk-e6aww6q8.js:732240-732300 placement
function Tet(e) {
  return isDiskless() ? STORAGE_SPACES.pluginRegistry(e) : xJr(e, getPluginsDirectory());
}
//@ chunk-e6aww6q8.js:732402-732486 placement
var dSo = new Set(["plugins", "cowork_plugins"]),
  uSo = new Set(["marketplaces", "cache"]);
/**
 * 在路径中找到 plugins/cache 等标志段，若其前缀不是当前插件目录且不是网络/可疑路径，则改写为当前插件目录下的同名相对路径；否则原样返回。
 */
//@ chunk-e6aww6q8.js:732486-732917 placement
function relocateInstallPath(e) {
  let parts = e.split(/[/\\]/),
    r = -1;
  for (let w = parts.length - 2; w >= 1; w--)
    if (dSo.has(parts[w]) && uSo.has(parts[w + 1])) {
      r = w;
      break;
    }
  if (r === -1 || isDiskless()) return e;
  let joined = parts.slice(0, r + 1).join(sep_17),
    h = projectPluginsDir();
  if (resolve_9(joined) === resolve_9(h)) return e;
  if (CL(joined) || Qg(joined)) return e;
  let y = classifyHomeMount(joined);
  if (isAbsolute_7(joined)) {
    if (
      !y &&
      !hasUnreadablePathComponent(joined) &&
      (classifyMarketplacePath(joined).suspect || isFileWithinReadSizeLimit(joined))
    )
      return e;
  } else if (!/^[A-Za-z]:[\\/]/.test(joined)) return e;
  let S = join_28(h, ...parts.slice(r + 1));
  if (!resolve_9(S).startsWith(resolve_9(h) + sep_17)) return e;
  return S;
}
/**
 * 逐级 lstat 路径，遇到无权限组件返回 true。
 */
//@ chunk-e6aww6q8.js:732917-733231 placement
function hasUnreadablePathComponent(e) {
  if (getPlatform() === "windows") return !1;
  let root = parse_3(e).root,
    filtered = e
      .slice(root.length)
      .split(sep_17)
      .filter((s) => s !== "");
  for (let s of filtered) {
    if (s === ".") continue;
    if (s === "..") {
      root = dirname_18(root);
      continue;
    }
    root = join_28(root, s);
    let h;
    try {
      h = getFsImplementation().lstatSync(root);
    } catch (error) {
      let S = getErrnoCode(error);
      return S === "EACCES" || S === "EPERM";
    }
    if (h.isSymbolicLink()) return !1;
  }
  return !1;
}
/**
 * 文件是否存在（statSync，非 ENOENT 错误也视为存在）。误配名。
 */
//@ chunk-e6aww6q8.js:733231-733301 placement = isFileWithinReadSizeLimit (1)
function isFileWithinReadSizeLimit(e) {
  try {
    return (getFsImplementation().statSync(e), !0);
  } catch (error) {
    return !isFsInaccessible(error);
  }
}
//@ chunk-aepeg2w5.js:64497-64555 placement
var BI1 = "bi1-",
  eoo = `${BI1}key-unavailable`,
  na = new Map(),
  wI = 32;
//@ chunk-aepeg2w5.js:64789-64835 placement
var AI = 12,
  RTi = 86400000,
  TI = 604800000,
  CI = 300000;

export {
  eoo,
  getPluginsDirectory,
  getPluginSeedDirs,
  L2e,
  pluginDataDirPath,
  deletePluginDataDir,
  isSetAsideFileName,
  isUnreadableKeptFileName,
  isUsingDefaultPluginsDirectory,
  parseVersionCachePath,
  sanitizePluginId,
  escapeNpmPackageForDir,
  kkn,
  c5t,
  isVersionRootStorageKey,
  storageKeyToCachePath,
  isUsingCoworkPlugins,
  ensurePluginDataDir,
  getPluginDataDirSize,
  isSamePluginDirName,
  Tet,
  RTi,
  na,
  BI1,
  wI,
  AI,
  TI,
  CI,
  hasClaudeAiReservedPrefix,
  relocateInstallPath,
  getMarketplaceStorageKey,
  PJr,
  getZipCacheDirOverride,
  xJr,
  sanitizePluginIdLower,
  canonicalMarketplaceKey,
  pluginIdToDirName,
  splitPluginCachePath,
  setAsideFileName,
  unreadableKeptFileName,
};
