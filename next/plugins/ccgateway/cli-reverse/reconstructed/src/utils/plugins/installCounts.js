/**
 * utils/plugins/installCounts.ts
 *
 * 插件目录（安装数、组件、token 开销估计）的获取与本地缓存，安装数格式化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/installCounts.ts
 * pieces: chunk-5xgkngpb.js (15), chunk-b3a6nm9h.js (1)
 * attribution: placement 3, fingerprint 4, layout 8, callgraph-fingerprint 1
 */
import { join, dirname } from "path";
import { randomBytes } from "crypto";
import { open, readFile, unlink } from "fs/promises";
import {
  assertPathSafeAsync,
  retryFsOp,
  writeFileAtomic as writeFileAtomic_2,
} from "../atomicPublishWrite.js";
import { unlinkQuietly } from "../../services/memoryStore/memoryDocumentFs.js";
import { MAX_PLUGIN_ARCHIVE_BYTES } from "./commandSource.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  record,
  array,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, pluginRegistrySpace } from "./pluginDirectories.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { readPluginsDirJsonFile } from "./pluginDirectoryBindings.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isENOENT, errorMessage } from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b3a6nm9h.js:22344-22646 fingerprint (2.1.88 match: saveInstallCountsCache, 0.666)
/**
 * 原子写文件（临时文件 + rename）。名字配错，见 lead 建议。
 */
async function writeFileAtomic(filePath, content, mode) {
  let tempPath = join(dirname(filePath), `.${randomBytes(6).toString("hex")}.tmp`);
  await assertPathSafeAsync(tempPath);
  let handle = await open(tempPath, "wx", mode);
  try {
    await handle.writeFile(content, {
      encoding: "utf8",
    });
    if (mode !== undefined) await handle.chmod(mode).catch(() => {});
    await handle.close();
    await retryFsOp(tempPath, filePath);
  } catch (error) {
    await handle.close().catch(() => {});
    await unlinkQuietly(tempPath).catch(() => {});
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4327276-4328057 placement
/**
 * 插件目录缓存的常量组：_ut 是缓存版本 1；k1n 是缓存文件名 plugin-catalog-cache.json；Ire 是插件统计目录下载地址；Ngs 是缓存时长 1 天；Fgs 是缓存体积上限（2 × 平台上限）；b1n/hut/$gs/w1n/Hgs 依次是 token 费用、目录条目、目录、目录文件与缓存文件的 schema。
 */
var PLUGIN_CATALOG_CACHE_VERSION; // deferred: uses MAX_SPILL_BYTES (./commandSource.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_CATALOG_CACHE_JSON;
var PLUGIN_CATALOG_STATS_URL;
var PLUGIN_CATALOG_CACHE_TTL_MS;
var MAX_PLUGIN_CATALOG_BYTES;
var tokenCostSchema;
var pluginCatalogEntrySchema;
var pluginCatalogSchema;
var pluginCatalogFileSchema;
var pluginCatalogCacheSchema;
deferInit("chunk-5xgkngpb.js:4327276", () => {
  PLUGIN_CATALOG_CACHE_VERSION = 1;
  PLUGIN_CATALOG_CACHE_JSON = "plugin-catalog-cache.json";
  PLUGIN_CATALOG_STATS_URL =
    "https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/plugin-stats/plugin-details.json";
  PLUGIN_CATALOG_CACHE_TTL_MS = 86400000;
  MAX_PLUGIN_CATALOG_BYTES = 2 * MAX_PLUGIN_ARCHIVE_BYTES;
  tokenCostSchema = DoctorLazy(() =>
    objectSchema({
      always_on: numberSchema(),
      on_invoke: numberSchema(),
    }),
  );
  pluginCatalogEntrySchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema(),
      chars: tokenCostSchema().optional(),
    }).loose(),
  );
  pluginCatalogSchema = DoctorLazy(() =>
    objectSchema({
      plugin: stringSchema(),
      tokens: record(stringSchema(), tokenCostSchema()),
      components: objectSchema({
        commands: array(pluginCatalogEntrySchema()),
        agents: array(pluginCatalogEntrySchema()),
        skills: array(pluginCatalogEntrySchema()),
        hooks: array(stringSchema()).optional(),
        mcpServers: array(stringSchema()).optional(),
        lspServers: array(stringSchema()).optional(),
      }).loose(),
      unique_installs: numberSchema().optional(),
      last_updated: stringSchema().optional(),
      marketplace_entry: record(stringSchema(), unknown()),
    }).loose(),
  );
  pluginCatalogFileSchema = DoctorLazy(() =>
    objectSchema({
      generated_at: stringSchema(),
      installs_generated_at: stringSchema().optional(),
      marketplace_sha: stringSchema(),
      models: array(stringSchema()),
      plugins: record(stringSchema(), pluginCatalogSchema()),
    }).loose(),
  );
  pluginCatalogCacheSchema = DoctorLazy(() =>
    objectSchema({
      version: numberSchema(),
      fetchedAt: stringSchema(),
      catalog: pluginCatalogFileSchema(),
    }),
  );
});
//@ chunk-5xgkngpb.js:4328057-4328093 placement
function pluginCatalogCachePath() {
  return join(getPluginsDirectory(), PLUGIN_CATALOG_CACHE_JSON);
}
//@ chunk-5xgkngpb.js:4328093-4328563 placement
/**
 * 读取插件目录缓存：v5 存储启用时从存储读；无盘模式返回 null；n 为真时从只读缓存 JSON 读；否则读本地缓存文件。
 */
async function readPluginCatalogCacheRaw(cachePath, allowStale) {
  let space = isStorageV5Enabled() && cachePath !== undefined ? pluginRegistrySpace("catalog") : null;
  if (cachePath && space) {
    let readResult = await cachePath.read([space]);
    if (!readResult.ok) {
      logForDebugging(`Failed to load plugin catalog cache: ${formatStorageError(readResult.error)}`);
      return null;
    }
    let item = readResult.value.items[0];
    if (!item.found) return null;
    let value = item.value;
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("utf-8");
  }
  if (isDiskless()) return null;
  if (allowStale) {
    let pluginsDirJsonFile = await readPluginsDirJsonFile(
      PLUGIN_CATALOG_CACHE_JSON,
      MAX_PLUGIN_CATALOG_BYTES,
      "plugin catalog cache",
    );
    return pluginsDirJsonFile.state === "read"
      ? {
          json: pluginsDirJsonFile.json,
        }
      : null;
  }
  return await readFile(pluginCatalogCachePath(), {
    encoding: "utf-8",
  });
}
//@ chunk-5xgkngpb.js:4328563-4329138 fingerprint (2.1.88 match: loadInstallCountsCache, 0.312)
/**
 * 读取插件目录缓存文件（校验结构与版本，可允许过期）。
 */
async function loadInstallCountsCache(cachePath, { allowStale = false } = {}) {
  try {
    let content = await readPluginCatalogCacheRaw(cachePath, allowStale);
    if (content === null) return null;
    let parseResult = pluginCatalogCacheSchema().safeParse(
      typeof content === "string" ? jsonParse(content) : content.json,
    );
    if (!parseResult.success) {
      logForDebugging("Plugin catalog cache has invalid structure");
      return null;
    }
    let cache = parseResult.data;
    if (cache.version !== PLUGIN_CATALOG_CACHE_VERSION) {
      logForDebugging(
        `Plugin catalog cache version mismatch (got ${cache.version}, expected ${PLUGIN_CATALOG_CACHE_VERSION})`,
      );
      return null;
    }
    let fetchedAt = new Date(cache.fetchedAt).getTime();
    if (!allowStale && (Number.isNaN(fetchedAt) || Date.now() - fetchedAt > PLUGIN_CATALOG_CACHE_TTL_MS)) {
      logForDebugging("Plugin catalog cache is stale (>24 h old)");
      return null;
    }
    return cache;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to load plugin catalog cache: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-5xgkngpb.js:4329138-4329561 fingerprint (2.1.88 match: INSTALL_COUNTS_CACHE_FILENAME, 0.491)
/**
 * 写插件目录缓存（存储后端或文件）。名字配错，见 lead 建议。
 */
async function saveInstallCountsCache(cache, cachePath) {
  try {
    let space = isStorageV5Enabled() && cachePath !== undefined ? pluginRegistrySpace("catalog") : null;
    let diskless = isDiskless();
    if (cachePath && space) {
      let writeResult = await cachePath.write(space, jsonStringify(cache));
      if (!writeResult.ok) {
        logForDebugging(`Failed to save plugin catalog cache: ${formatStorageError(writeResult.error)}`, {
          level: "error",
        });
        return;
      }
    } else if (!diskless) {
      let cachePath = pluginCatalogCachePath();
      await getFsImplementation().mkdir(getPluginsDirectory());
      await writeFileAtomic_2(cachePath, jsonStringify(cache), 384);
    }
    if (diskless) return;
    await unlink(join(getPluginsDirectory(), "install-counts-cache.json")).catch(() => {});
  } catch (error) {
    logForDebugging(`Failed to save plugin catalog cache: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-5xgkngpb.js:4329561-4329957 layout
/**
 * 从插件目录服务下载插件目录（安装数、组件、token 估计），10 秒超时，校验格式。
 */
async function fetchPluginCatalog() {
  logForDebugging(`Fetching plugin catalog from ${PLUGIN_CATALOG_STATS_URL}`);
  let started = performance.now();
  try {
    let response = await externalHttp.get(PLUGIN_CATALOG_STATS_URL, {
      timeout: 1e4,
      maxContentLength: MAX_PLUGIN_ARCHIVE_BYTES,
    });
    let parseResult = pluginCatalogFileSchema().safeParse(response.data);
    if (!parseResult.success) throw Error("Invalid response format from plugin catalog");
    logPluginFetch("plugin_catalog", PLUGIN_CATALOG_STATS_URL, "success", performance.now() - started);
    return parseResult.data;
  } catch (error) {
    logPluginFetch(
      "plugin_catalog",
      PLUGIN_CATALOG_STATS_URL,
      "failure",
      performance.now() - started,
      classifyFetchError(error),
    );
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4329957-4330038 layout
class OncePromise {
  promise;
  load(loader) {
    return (this.promise ??= loader());
  }
  reset() {
    this.promise = undefined;
  }
}
//@ chunk-5xgkngpb.js:4330038-4330065 layout
var catalogFetchOnce; // deferred: uses OncePromise of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4330038", () => {
  catalogFetchOnce = new HostScoped(() => new OncePromise());
});
//@ chunk-5xgkngpb.js:4330065-4330406 fingerprint (2.1.88 match: getInstallCounts, 0.402)
/**
 * 取插件目录（安装数等）：优先 24 小时内的本地缓存，过期则联网获取并写缓存。
 */
function getInstallCounts(cachePath) {
  let once = catalogFetchOnce.of(getRootSession().host);
  return once.load(async () => {
    let installCountsCache = await loadInstallCountsCache(cachePath);
    if (installCountsCache) {
      logPluginFetch("plugin_catalog", PLUGIN_CATALOG_STATS_URL, "cache_hit", 0);
      return installCountsCache.catalog;
    }
    try {
      let cache = await fetchPluginCatalog();
      await saveInstallCountsCache(
        {
          version: PLUGIN_CATALOG_CACHE_VERSION,
          fetchedAt: new Date().toISOString(),
          catalog: cache,
        },
        cachePath,
      );
      return cache;
    } catch (error) {
      logForDebugging(`Failed to fetch plugin catalog: ${errorMessage(error)}`, {
        level: "error",
      });
      once.reset();
      return null;
    }
  });
}
//@ chunk-5xgkngpb.js:4330406-4330595 layout
/**
 * 插件 ID → 去重安装数 的映射，用于 /plugin 浏览排序。
 */
async function getUniqueInstallCounts(storageV5) {
  let installCounts = await getInstallCounts(storageV5);
  if (!installCounts) return null;
  let counts = new Map();
  for (let [key, value] of Object.entries(installCounts.plugins))
    if (typeof value.unique_installs === "number") counts.set(key, value.unique_installs);
  return counts;
}
//@ chunk-5xgkngpb.js:4330595-4330652 layout
/**
 * 取插件目录中某插件的条目。
 */
async function getCatalogEntry(pluginId, storageV5) {
  return (await getInstallCounts(storageV5))?.plugins[pluginId];
}
//@ chunk-5xgkngpb.js:4330652-4330728 layout
/**
 * 读本地缓存的插件目录（允许过期）。
 */
async function getCachedCatalogPlugins(cachePath) {
  return (
    await loadInstallCountsCache(cachePath, {
      allowStale: true,
    })
  )?.catalog.plugins;
}
//@ chunk-5xgkngpb.js:4330728-4330747 layout
/**
 * ESTIMATED_TOKENS_PER_COMPONENT：每组件估算 token 数；MAX_COMPONENT_ESTIMATE_COUNT：估算组件数上限（同一声明共 2 个绑定）。
 */
var ESTIMATED_TOKENS_PER_COMPONENT = 2000;
var MAX_COMPONENT_ESTIMATE_COUNT = 3;
//@ chunk-5xgkngpb.js:4330747-4331127 layout
/**
 * 估计插件对上下文的 token 开销（常驻/调用时），目录没有精确值时按组件数估算。
 */
async function estimatePluginTokenCost(pluginId, canonicalName, storageV5) {
  let catalogEntry = await getCatalogEntry(pluginId, storageV5);
  if (!catalogEntry) return null;
  let costEntry = catalogEntry.tokens[canonicalName];
  if (costEntry)
    return {
      alwaysOn: costEntry.always_on,
      onInvoke: costEntry.on_invoke,
      isEstimate: false,
    };
  let components = [
    ...catalogEntry.components.commands,
    ...catalogEntry.components.agents,
    ...catalogEntry.components.skills,
  ];
  let alwaysOnChars = 0;
  let onInvokeChars = 0;
  for (let component of components) {
    alwaysOnChars += component.chars?.always_on ?? 0;
    onInvokeChars += component.chars?.on_invoke ?? 0;
  }
  return {
    alwaysOn: Math.round(alwaysOnChars / MAX_COMPONENT_ESTIMATE_COUNT),
    onInvoke: Math.round(onInvokeChars / MAX_COMPONENT_ESTIMATE_COUNT),
    isEstimate: true,
  };
}
//@ chunk-5xgkngpb.js:4331127-4331335 callgraph-fingerprint (2.1.88 match: formatInstallCount, 1)
/**
 * 安装数格式化：<1000 原样，千用 k，百万用 M。
 */
function formatInstallCount(count) {
  if (count < 1000) return String(count);
  if (count < 1e6) {
    let formatted = (count / 1000).toFixed(1);
    return formatted.endsWith(".0") ? `${formatted.slice(0, -2)}K` : `${formatted}K`;
  }
  let formatted = (count / 1e6).toFixed(1);
  return formatted.endsWith(".0") ? `${formatted.slice(0, -2)}M` : `${formatted}M`;
}
export {
  getCachedCatalogPlugins,
  getUniqueInstallCounts,
  writeFileAtomic,
  getCatalogEntry,
  formatInstallCount,
  estimatePluginTokenCost,
  ESTIMATED_TOKENS_PER_COMPONENT,
};
