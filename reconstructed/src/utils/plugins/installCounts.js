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
import { join, dirname } from "path";
import { readFile, unlink, open } from "fs/promises";
import { randomBytes } from "crypto";
import { MAX_PLUGIN_ARCHIVE_BYTES } from "./commandSource.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, string, record, array, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { getPluginsDirectory, pluginRegistrySpace } from "./pluginDirectories.js";
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
import { unlinkQuietly } from "../../services/memoryStore/memoryDocumentFs.js";

//@ chunk-e6aww6q8.js:4220852-4221633 placement
/**
 * PLUGIN_CATALOG_STATS_URL：插件统计目录的下载地址；PLUGIN_CATALOG_CACHE_TTL_MS：插件目录缓存时长；MAX_PLUGIN_CATALOG_BYTES：插件目录缓存字节上限（同一声明共 8 个绑定）。
 */
var readPluginCatalogCache = 1;
var PLUGIN_CATALOG_CACHE_JSON = "plugin-catalog-cache.json";
var PLUGIN_CATALOG_STATS_URL =
  "https://storage.googleapis.com/claude-code-dist-86c565f3-f756-42ad-8dfa-d59b1c096819/plugin-stats/plugin-details.json";
var PLUGIN_CATALOG_CACHE_TTL_MS = 86400000;
var MAX_PLUGIN_CATALOG_BYTES = 2 * MAX_PLUGIN_ARCHIVE_BYTES;
var tokenCostSchema = DoctorLazy(() =>
  u({
    always_on: E(),
    on_invoke: E(),
  }),
);
var pluginCatalogEntrySchema = DoctorLazy(() =>
  u({
    name: string(),
    chars: tokenCostSchema().optional(),
  }).loose(),
);
var pluginCatalogSchema = DoctorLazy(() =>
  u({
    plugin: string(),
    tokens: record(string(), tokenCostSchema()),
    components: u({
      commands: array(pluginCatalogEntrySchema()),
      agents: array(pluginCatalogEntrySchema()),
      skills: array(pluginCatalogEntrySchema()),
      hooks: array(string()).optional(),
      mcpServers: array(string()).optional(),
      lspServers: array(string()).optional(),
    }).loose(),
    unique_installs: E().optional(),
    last_updated: string().optional(),
    marketplace_entry: record(string(), unknown()),
  }).loose(),
);
var MAX_PLUGIN_CATALOG_ENTRIES = DoctorLazy(() =>
  u({
    generated_at: string(),
    installs_generated_at: string().optional(),
    marketplace_sha: string(),
    models: array(string()),
    plugins: record(string(), pluginCatalogSchema()),
  }).loose(),
);
var MAX_PLUGIN_CATALOG_NAME_LENGTH = DoctorLazy(() =>
  u({
    version: E(),
    fetchedAt: string(),
    catalog: MAX_PLUGIN_CATALOG_ENTRIES(),
  }),
);
//@ chunk-e6aww6q8.js:4221633-4221669 placement
function pluginCatalogCachePath() {
  return join(getPluginsDirectory(), PLUGIN_CATALOG_CACHE_JSON);
}
//@ chunk-e6aww6q8.js:4221669-4222139 placement
/**
 * 读取插件目录缓存：v5 存储启用时从存储读；无盘模式返回 null；n 为真时从只读缓存 JSON 读；否则读本地缓存文件。
 */
async function readPluginCatalogCacheRaw(cachePath, n) {
  let r = isStorageV5Enabled() && cachePath !== undefined ? pluginRegistrySpace("catalog") : null;
  if (cachePath && r) {
    let s = await cachePath.read([r]);
    if (!s.ok) {
      logForDebugging(`Failed to load plugin catalog cache: ${formatStorageError(s.error)}`);
      return null;
    }
    let h = s.value.items[0];
    if (!h.found) return null;
    let y = h.value;
    return Buffer.from(y.buffer, y.byteOffset, y.byteLength).toString("utf-8");
  }
  if (isDiskless()) return null;
  if (n) {
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
//@ chunk-e6aww6q8.js:4222139-4222714 fingerprint = loadInstallCountsCache (0.312)
/**
 * 读取插件目录缓存文件（校验结构与版本，可允许过期）。
 */
async function loadInstallCountsCache(cachePath, { allowStale: n = false } = {}) {
  try {
    let content = await readPluginCatalogCacheRaw(cachePath, n);
    if (content === null) return null;
    let s = MAX_PLUGIN_CATALOG_NAME_LENGTH().safeParse(
      typeof content === "string" ? jsonParse(content) : content.json,
    );
    if (!s.success) {
      logForDebugging("Plugin catalog cache has invalid structure");
      return null;
    }
    let h = s.data;
    if (h.version !== readPluginCatalogCache) {
      logForDebugging(
        `Plugin catalog cache version mismatch (got ${h.version}, expected ${readPluginCatalogCache})`,
      );
      return null;
    }
    let fetchedAt = new Date(h.fetchedAt).getTime();
    if (!n && (Number.isNaN(fetchedAt) || Date.now() - fetchedAt > PLUGIN_CATALOG_CACHE_TTL_MS)) {
      logForDebugging("Plugin catalog cache is stale (>24 h old)");
      return null;
    }
    return h;
  } catch (error) {
    if (!isENOENT(error)) logForDebugging(`Failed to load plugin catalog cache: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-e6aww6q8.js:4222714-4223137 fingerprint = INSTALL_COUNTS_CACHE_FILENAME (0.491)
/**
 * 写插件目录缓存（存储后端或文件）。名字配错，见 lead 建议。
 */
async function saveInstallCountsCache(e, n) {
  try {
    let r = isStorageV5Enabled() && n !== undefined ? pluginRegistrySpace("catalog") : null;
    let s = isDiskless();
    if (n && r) {
      let h = await n.write(r, jsonStringify(e));
      if (!h.ok) {
        logForDebugging(`Failed to save plugin catalog cache: ${formatStorageError(h.error)}`, {
          level: "error",
        });
        return;
      }
    } else if (!s) {
      let h = pluginCatalogCachePath();
      await getFsImplementation().mkdir(getPluginsDirectory());
      await writeFileAtomic_2(h, jsonStringify(e), 384);
    }
    if (s) return;
    await unlink(join(getPluginsDirectory(), "install-counts-cache.json")).catch(() => {});
  } catch (error) {
    logForDebugging(`Failed to save plugin catalog cache: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:4223137-4223533 layout
/**
 * 从插件目录服务下载插件目录（安装数、组件、token 估计），10 秒超时，校验格式。
 */
async function fetchPluginCatalog() {
  logForDebugging(`Fetching plugin catalog from ${PLUGIN_CATALOG_STATS_URL}`);
  let started = performance.now();
  try {
    let n = await externalHttp.get(PLUGIN_CATALOG_STATS_URL, {
      timeout: 1e4,
      maxContentLength: MAX_PLUGIN_ARCHIVE_BYTES,
    });
    let r = MAX_PLUGIN_CATALOG_ENTRIES().safeParse(n.data);
    if (!r.success) throw Error("Invalid response format from plugin catalog");
    logPluginFetch("plugin_catalog", PLUGIN_CATALOG_STATS_URL, "success", performance.now() - started);
    return r.data;
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
//@ chunk-e6aww6q8.js:4223533-4223614 layout
class OncePromise {
  promise;
  load(e) {
    return (this.promise ??= e());
  }
  reset() {
    this.promise = undefined;
  }
}
//@ chunk-e6aww6q8.js:4223614-4223641 layout
var catalogFetchOnce = new HostScoped(() => new OncePromise());
//@ chunk-e6aww6q8.js:4223641-4223982 fingerprint = getInstallCounts (0.402)
/**
 * 取插件目录（安装数等）：优先 24 小时内的本地缓存，过期则联网获取并写缓存。
 */
function getInstallCounts(cachePath) {
  let n = catalogFetchOnce.of(getRootSession().host);
  return n.load(async () => {
    let installCountsCache = await loadInstallCountsCache(cachePath);
    if (installCountsCache) {
      logPluginFetch("plugin_catalog", PLUGIN_CATALOG_STATS_URL, "cache_hit", 0);
      return installCountsCache.catalog;
    }
    try {
      let cache = await fetchPluginCatalog();
      await saveInstallCountsCache(
        {
          version: readPluginCatalogCache,
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
      n.reset();
      return null;
    }
  });
}
//@ chunk-e6aww6q8.js:4223982-4224171 layout
/**
 * 插件 ID → 去重安装数 的映射，用于 /plugin 浏览排序。
 */
async function getUniqueInstallCounts(storageV5) {
  let installCounts = await getInstallCounts(storageV5);
  if (!installCounts) return null;
  let r = new Map();
  for (let [key, value] of Object.entries(installCounts.plugins))
    if (typeof value.unique_installs === "number") r.set(key, value.unique_installs);
  return r;
}
//@ chunk-e6aww6q8.js:4224171-4224228 layout
/**
 * 取插件目录中某插件的条目。
 */
async function getCatalogEntry(e, n) {
  return (await getInstallCounts(n))?.plugins[e];
}
//@ chunk-e6aww6q8.js:4224228-4224304 layout
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
//@ chunk-e6aww6q8.js:4224304-4224323 layout
/**
 * ESTIMATED_TOKENS_PER_COMPONENT：每组件估算 token 数；MAX_COMPONENT_ESTIMATE_COUNT：估算组件数上限（同一声明共 2 个绑定）。
 */
var ESTIMATED_TOKENS_PER_COMPONENT = 2000;
var MAX_COMPONENT_ESTIMATE_COUNT = 3;
//@ chunk-e6aww6q8.js:4224323-4224703 layout
/**
 * 估计插件对上下文的 token 开销（常驻/调用时），目录没有精确值时按组件数估算。
 */
async function estimatePluginTokenCost(pluginId, canonicalName, storageV5) {
  let catalogEntry = await getCatalogEntry(pluginId, storageV5);
  if (!catalogEntry) return null;
  let h = catalogEntry.tokens[canonicalName];
  if (h)
    return {
      alwaysOn: h.always_on,
      onInvoke: h.on_invoke,
      isEstimate: false,
    };
  let y = [
    ...catalogEntry.components.commands,
    ...catalogEntry.components.agents,
    ...catalogEntry.components.skills,
  ];
  let S = 0;
  let w = 0;
  for (let L of y) {
    S += L.chars?.always_on ?? 0;
    w += L.chars?.on_invoke ?? 0;
  }
  return {
    alwaysOn: Math.round(S / MAX_COMPONENT_ESTIMATE_COUNT),
    onInvoke: Math.round(w / MAX_COMPONENT_ESTIMATE_COUNT),
    isEstimate: true,
  };
}
//@ chunk-e6aww6q8.js:4224703-4224911 callgraph-fingerprint = formatInstallCount (1)
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
//@ chunk-a477qqne.js:22307-22609 fingerprint = saveInstallCountsCache (0.666)
/**
 * 原子写文件（临时文件 + rename）。名字配错，见 lead 建议。
 */
async function writeFileAtomic(e, n, r) {
  let s = join(dirname(e), `.${randomBytes(6).toString("hex")}.tmp`);
  await assertPathSafeAsync(s);
  let i = await open(s, "wx", r);
  try {
    await i.writeFile(n, {
      encoding: "utf8",
    });
    if (r !== undefined) await i.chmod(r).catch(() => {});
    await i.close();
    await retryFsOp(s, e);
  } catch (error) {
    await i.close().catch(() => {});
    await unlinkQuietly(s).catch(() => {});
    throw error;
  }
}
export {
  writeFileAtomic,
  getUniqueInstallCounts,
  getCachedCatalogPlugins,
  getCatalogEntry,
  formatInstallCount,
  estimatePluginTokenCost,
  ESTIMATED_TOKENS_PER_COMPONENT,
};
