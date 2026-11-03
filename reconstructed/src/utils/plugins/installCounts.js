/**
 * utils/plugins/installCounts.ts
 *
 * 插件目录（安装数、组件、token 开销估计）的获取与本地缓存，安装数格式化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/installCounts.ts
 * pieces: chunk-a477qqne.js (1), chunk-e6aww6q8.js (15)
 * attribution: fingerprint 4, placement 3, layout 8, callgraph-fingerprint 1
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
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
  dirname,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
  open,
} from "fs/promises";
import { randomBytes } from "crypto";
import { FVt } from "./commandSource.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o, pe, A, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, Tet } from "./pluginDirectories.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { readPluginsDirJsonFile } from "./pluginDirectoryBindings.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isENOENT, errorMessage } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import {
  writeFileAtomic as writeFileAtomic_2,
  assertPathSafeAsync,
  retryFsOp,
} from "../atomicPublishWrite.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { HostScoped } from "../hostScoped.js";
import { $e } from "../../services/memoryStore/memoryDocumentFs.js";

//@ chunk-e6aww6q8.js:4220852-4221633 placement
var readPluginCatalogCache = 1,
  PLUGIN_CATALOG_CACHE_JSON = "plugin-catalog-cache.json",
  Ire =
    "https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/plugin-stats/plugin-details.json",
  Ngs = 86400000,
  Fgs = 2 * FVt,
  b1n = DoctorLazy(() => u({ always_on: E(), on_invoke: E() })),
  hut = DoctorLazy(() => u({ name: o(), chars: b1n().optional() }).loose()),
  $gs = DoctorLazy(() =>
    u({
      plugin: o(),
      tokens: pe(o(), b1n()),
      components: u({
        commands: A(hut()),
        agents: A(hut()),
        skills: A(hut()),
        hooks: A(o()).optional(),
        mcpServers: A(o()).optional(),
        lspServers: A(o()).optional(),
      }).loose(),
      unique_installs: E().optional(),
      last_updated: o().optional(),
      marketplace_entry: pe(o(), oe()),
    }).loose(),
  ),
  w1n = DoctorLazy(() =>
    u({
      generated_at: o(),
      installs_generated_at: o().optional(),
      marketplace_sha: o(),
      models: A(o()),
      plugins: pe(o(), $gs()),
    }).loose(),
  ),
  Hgs = DoctorLazy(() => u({ version: E(), fetchedAt: o(), catalog: w1n() }));
//@ chunk-e6aww6q8.js:4221633-4221669 placement
function T1n() {
  return join_118(getPluginsDirectory(), PLUGIN_CATALOG_CACHE_JSON);
}
/**
 * 读取插件目录缓存：v5 存储启用时从存储读；无盘模式返回 null；n 为真时从只读缓存 JSON 读；否则读本地缓存文件。
 */
//@ chunk-e6aww6q8.js:4221669-4222139 placement
async function readPluginCatalogCacheRaw(e, n) {
  let r = isStorageV5Enabled() && e !== void 0 ? Tet("catalog") : null;
  if (e && r) {
    let read = await e.read([r]);
    if (!read.ok)
      return (
        logForDebugging(`Failed to load plugin catalog cache: ${formatStorageError(read.error)}`),
        null
      );
    let h = read.value.items[0];
    if (!h.found) return null;
    let y = h.value;
    return Buffer.from(y.buffer, y.byteOffset, y.byteLength).toString("utf-8");
  }
  if (isDiskless()) return null;
  if (n) {
    let s = await readPluginsDirJsonFile(PLUGIN_CATALOG_CACHE_JSON, Fgs, "plugin catalog cache");
    return s.state === "read" ? { json: s.json } : null;
  }
  return await readFile_18(T1n(), { encoding: "utf-8" });
}
/**
 * 读取插件目录缓存文件（校验结构与版本，可允许过期）。
 */
//@ chunk-e6aww6q8.js:4222139-4222714 fingerprint = loadInstallCountsCache (0.312)
async function loadInstallCountsCache(e, { allowStale: n = !1 } = {}) {
  try {
    let content = await readPluginCatalogCacheRaw(e, n);
    if (content === null) return null;
    let safeParse = Hgs().safeParse(typeof content === "string" ? jsonParse(content) : content.json);
    if (!safeParse.success) return (logForDebugging("Plugin catalog cache has invalid structure"), null);
    let h = safeParse.data;
    if (h.version !== readPluginCatalogCache)
      return (
        logForDebugging(
          `Plugin catalog cache version mismatch (got ${h.version}, expected ${readPluginCatalogCache})`,
        ),
        null
      );
    let fetchedAt = new Date(h.fetchedAt).getTime();
    if (!n && (Number.isNaN(fetchedAt) || Date.now() - fetchedAt > Ngs))
      return (logForDebugging("Plugin catalog cache is stale (>24 h old)"), null);
    return h;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to load plugin catalog cache: ${errorMessage(error)}`);
    return null;
  }
}
/**
 * 写插件目录缓存（存储后端或文件）。名字配错，见 lead 建议。
 */
//@ chunk-e6aww6q8.js:4222714-4223137 fingerprint = INSTALL_COUNTS_CACHE_FILENAME (0.491)
async function saveInstallCountsCache(e, n) {
  try {
    let r = isStorageV5Enabled() && n !== void 0 ? Tet("catalog") : null,
      s = isDiskless();
    if (n && r) {
      let write = await n.write(r, jsonStringify(e));
      if (!write.ok) {
        logForDebugging(`Failed to save plugin catalog cache: ${formatStorageError(write.error)}`, {
          level: "error",
        });
        return;
      }
    } else if (!s) {
      let h = T1n();
      (await getFsImplementation().mkdir(getPluginsDirectory()),
        await writeFileAtomic_2(h, jsonStringify(e), 384));
    }
    if (s) return;
    await unlink_11(join_118(getPluginsDirectory(), "install-counts-cache.json")).catch(() => {});
  } catch (error) {
    logForDebugging(`Failed to save plugin catalog cache: ${errorMessage(error)}`, { level: "error" });
  }
}
/**
 * 从插件目录服务下载插件目录（安装数、组件、token 估计），10 秒超时，校验格式。
 */
//@ chunk-e6aww6q8.js:4223137-4223533 layout
async function fetchPluginCatalog() {
  logForDebugging(`Fetching plugin catalog from ${Ire}`);
  let startTime = performance.now();
  try {
    let n = await externalHttp.get(Ire, { timeout: 1e4, maxContentLength: FVt }),
      safeParse = w1n().safeParse(n.data);
    if (!safeParse.success) throw Error("Invalid response format from plugin catalog");
    return (logPluginFetch("plugin_catalog", Ire, "success", performance.now() - startTime), safeParse.data);
  } catch (error) {
    throw (
      logPluginFetch(
        "plugin_catalog",
        Ire,
        "failure",
        performance.now() - startTime,
        classifyFetchError(error),
      ),
      error
    );
  }
}
//@ chunk-e6aww6q8.js:4223533-4223614 layout
class OncePromise {
  promise;
  load(e) {
    return (this.promise ??= e());
  }
  reset() {
    this.promise = void 0;
  }
}
//@ chunk-e6aww6q8.js:4223614-4223641 layout
var catalogFetchOnce = new HostScoped(() => new OncePromise());
/**
 * 取插件目录（安装数等）：优先 24 小时内的本地缓存，过期则联网获取并写缓存。
 */
//@ chunk-e6aww6q8.js:4223641-4223982 fingerprint = getInstallCounts (0.402)
function getInstallCounts(e) {
  let of = catalogFetchOnce.of(getRootSession().host);
  return of.load(async () => {
    let r = await loadInstallCountsCache(e);
    if (r) return (logPluginFetch("plugin_catalog", Ire, "cache_hit", 0), r.catalog);
    try {
      let cache = await fetchPluginCatalog();
      return (
        await saveInstallCountsCache(
          { version: readPluginCatalogCache, fetchedAt: new Date().toISOString(), catalog: cache },
          e,
        ),
        cache
      );
    } catch (error) {
      return (
        logForDebugging(`Failed to fetch plugin catalog: ${errorMessage(error)}`, { level: "error" }),
        of.reset(),
        null
      );
    }
  });
}
/**
 * 插件 ID → 去重安装数 的映射，用于 /plugin 浏览排序。
 */
//@ chunk-e6aww6q8.js:4223982-4224171 layout
async function getUniqueInstallCounts(e) {
  let n = await getInstallCounts(e);
  if (!n) return null;
  let r = new Map();
  for (let [s, h] of Object.entries(n.plugins))
    if (typeof h.unique_installs === "number") r.set(s, h.unique_installs);
  return r;
}
/**
 * 取插件目录中某插件的条目。
 */
//@ chunk-e6aww6q8.js:4224171-4224228 layout
async function getCatalogEntry(e, n) {
  return (await getInstallCounts(n))?.plugins[e];
}
/**
 * 读本地缓存的插件目录（允许过期）。
 */
//@ chunk-e6aww6q8.js:4224228-4224304 layout
async function getCachedCatalogPlugins(e) {
  return (await loadInstallCountsCache(e, { allowStale: !0 }))?.catalog.plugins;
}
//@ chunk-e6aww6q8.js:4224304-4224323 layout
var OWo = 2000,
  _1n = 3;
/**
 * 估计插件对上下文的 token 开销（常驻/调用时），目录没有精确值时按组件数估算。
 */
//@ chunk-e6aww6q8.js:4224323-4224703 layout
async function estimatePluginTokenCost(e, n, r) {
  let s = await getCatalogEntry(e, r);
  if (!s) return null;
  let h = s.tokens[n];
  if (h) return { alwaysOn: h.always_on, onInvoke: h.on_invoke, isEstimate: !1 };
  let y = [...s.components.commands, ...s.components.agents, ...s.components.skills],
    S = 0,
    w = 0;
  for (let L of y) ((S += L.chars?.always_on ?? 0), (w += L.chars?.on_invoke ?? 0));
  return { alwaysOn: Math.round(S / _1n), onInvoke: Math.round(w / _1n), isEstimate: !0 };
}
/**
 * 安装数格式化：<1000 原样，千用 k，百万用 M。
 */
//@ chunk-e6aww6q8.js:4224703-4224911 callgraph-fingerprint = formatInstallCount (1)
function formatInstallCount(count) {
  if (count < 1000) return String(count);
  if (count < 1e6) {
    let formatted = (count / 1000).toFixed(1);
    return formatted.endsWith(".0") ? `${formatted.slice(0, -2)}K` : `${formatted}K`;
  }
  let formatted = (count / 1e6).toFixed(1);
  return formatted.endsWith(".0") ? `${formatted.slice(0, -2)}M` : `${formatted}M`;
}
/**
 * 原子写文件（临时文件 + rename）。名字配错，见 lead 建议。
 */
//@ chunk-a477qqne.js:22307-22609 fingerprint = saveInstallCountsCache (0.666)
async function writeFileAtomic(e, n, r) {
  let s = join_4(dirname(e), `.${randomBytes(6).toString("hex")}.tmp`);
  await assertPathSafeAsync(s);
  let i = await open(s, "wx", r);
  try {
    if ((await i.writeFile(n, { encoding: "utf8" }), r !== void 0)) await i.chmod(r).catch(() => {});
    (await i.close(), await retryFsOp(s, e));
  } catch (error) {
    throw (await i.close().catch(() => {}), await $e(s).catch(() => {}), error);
  }
}

export {
  writeFileAtomic,
  getUniqueInstallCounts,
  getCachedCatalogPlugins,
  getCatalogEntry,
  formatInstallCount,
  estimatePluginTokenCost,
  OWo,
};
