/**
 * utils/model/modelCapabilities.ts
 *
 * 模型能力缓存（~/.claude/cache/model-capabilities.json：id、max_input_tokens、max_tokens），在 316 中该缓存的读取开关恒为关（vmr 恒假）；另混入网关模型缓存路径、accessFallbackModels 客户端数据解析、一个提示词块规整函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/modelCapabilities.ts
 * pieces: chunk-aepeg2w5.js (17), chunk-e6aww6q8.js (1)
 * attribution: fingerprint 4, layout 12, callgraph-fingerprint 1, file-local 1
 */
import { join } from "path";
import { readFileSync } from "fs";
import { readFile, mkdir, writeFile } from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, numberSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { safeParseJSON } from "../json.js";
import { getProviderState } from "./providerCaches.js";
import { logForDebugging } from "../debug.js";
import { isDiskless, getFlagSettingsInline } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonStringify } from "../slowOperations.js";
import { parseAccessFallbackModels, ACCESSFALLBACKMODELS } from "../../services/api/modelFallback.js";
import { isModelKeyAliasOrResolved, strip1mSuffix } from "./modelIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:467817-467981 fingerprint = ModelCapabilitySchema (0.613)
/**
 * 见同句首个绑定的说明。
 */
var ModelCapabilitySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ModelCapabilitiesCacheSchema;
var CAPABILITY_CACHE_EXACT_TTL_MS;
var CAPABILITY_CACHE_FUZZY_TTL_MS;
var CAPABILITY_CACHE_TTL_JITTER;
deferInit("chunk-aepeg2w5.js:467817", () => {
  ModelCapabilitySchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema(),
      max_input_tokens: numberSchema().optional(),
      max_tokens: numberSchema().optional(),
    }).strip(),
  );
  ModelCapabilitiesCacheSchema = DoctorLazy(() =>
    objectSchema({
      models: array(ModelCapabilitySchema()),
      timestamp: numberSchema(),
    }),
  );
  CAPABILITY_CACHE_EXACT_TTL_MS = 3600000;
  CAPABILITY_CACHE_FUZZY_TTL_MS = 300000;
  CAPABILITY_CACHE_TTL_JITTER = 0.1;
});
//@ chunk-aepeg2w5.js:467981-468052 layout
/**
 * 按 schema 解析单个能力条目。
 */
function parseModelCapability(raw) {
  let parsed = ModelCapabilitySchema().safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-aepeg2w5.js:468052-468090 layout = getCacheDir (1)
/**
 * ~/.claude/cache。覆盖后缀名 getCacheDir_4。
 */
function getModelCapabilitiesCacheDir() {
  return join(getClaudeConfigDir(), "cache");
}
//@ chunk-aepeg2w5.js:468090-468146 fingerprint = getCachePath (1)
/**
 * model-capabilities.json 的完整路径。
 */
function getCachePath() {
  return join(getModelCapabilitiesCacheDir(), "model-capabilities.json");
}
//@ chunk-aepeg2w5.js:468146-468224 layout
/**
 * 存储 v5 下的缓存键。
 */
function getModelCapabilitiesStorageKey() {
  return STORAGE_SPACES.cache("model-capabilities", "model-capabilities.json");
}
//@ chunk-aepeg2w5.js:468224-468266 layout
/**
 * 缓存文本 → models 数组或 null。
 */
function parseCapabilitiesModels(raw) {
  return parseCapabilitiesCache(raw)?.models ?? null;
}
//@ chunk-aepeg2w5.js:468266-468341 layout
/**
 * 缓存文本 → {models, timestamp} 或 null。
 */
function parseCapabilitiesCache(raw) {
  let parsed = ModelCapabilitiesCacheSchema().safeParse(safeParseJSON(raw, false));
  return parsed.success ? parsed.data : null;
}
//@ chunk-aepeg2w5.js:468341-468365 layout
/**
 * 恒为 false（构建时关闭；能力改由 catalog 与服务端目录提供）。
 */
function isModelCapabilitiesCacheEnabled() {
  return false;
}
//@ chunk-aepeg2w5.js:468365-468456 callgraph-fingerprint = sortForMatching (1)
/**
 * 按 id 长度降序、再字典序排序（长 id 优先匹配）。
 */
function sortForMatching(models) {
  return [...models].sort(
    (modelA, modelB) => modelB.id.length - modelA.id.length || modelA.id.localeCompare(modelB.id),
  );
}
//@ chunk-aepeg2w5.js:468456-468511 layout
/**
 * 进程内 按缓存路径 的能力缓存。
 */
function getCapabilitiesMemo() {
  return getProviderState().modelCapabilitiesByCachePath;
}
//@ chunk-aepeg2w5.js:468511-468693 layout
/**
 * 读缓存文件（同步，存储 v5 时不读盘）并记入进程缓存。
 */
function readCapabilitiesCached(cachePath, storage = getProviderState().modelCapabilitiesStorageV5) {
  let capabilitiesMemo = getCapabilitiesMemo();
  if (capabilitiesMemo.has(cachePath)) return capabilitiesMemo.get(cachePath) ?? null;
  if (storage) return null;
  let models;
  try {
    let file = readFileSync(cachePath, "utf-8");
    models = parseCapabilitiesModels(file);
  } catch {
    models = null;
  }
  capabilitiesMemo.set(cachePath, models);
  return models;
}
//@ chunk-aepeg2w5.js:468693-469107 layout
/**
 * 从存储 v5 预读能力缓存（开关关闭时什么都不做）。
 */
async function primeModelCapabilities(storage) {
  if (!storage || !isModelCapabilitiesCacheEnabled()) return;
  let cachePath = getCachePath();
  if (getCapabilitiesMemo().has(cachePath)) return;
  let readResult = await storage.read([getModelCapabilitiesStorageKey()]);
  if (!readResult.ok) {
    logForDebugging(`[modelCapabilities] prime read failed: ${readResult.error.code}`);
    return;
  }
  let item = readResult.value.items[0];
  if (!item.found) return;
  let capabilitiesModels = parseCapabilitiesModels(Buffer.from(item.value).toString("utf-8"));
  if (capabilitiesModels === null) return;
  let providerState = getProviderState();
  if (!providerState.modelCapabilitiesByCachePath.has(cachePath))
    providerState.modelCapabilitiesByCachePath.set(cachePath, capabilitiesModels);
  providerState.modelCapabilitiesStorageV5 = storage;
}
//@ chunk-aepeg2w5.js:469107-469311 file-local
/**
 * 按 id 精确或包含匹配取缓存能力（开关关闭时 undefined）。
 */
function getModelCapability(model) {
  if (!isModelCapabilitiesCacheEnabled() || isDiskless()) return;
  let cached = readCapabilitiesCached(getCachePath());
  if (!cached || cached.length === 0) return;
  let m = model.toLowerCase();
  let exact = cached.find((entry) => entry.id.toLowerCase() === m);
  if (exact) return exact;
  return cached.find((entry) => m.includes(entry.id.toLowerCase()));
}
//@ chunk-aepeg2w5.js:469311-469530 layout
/**
 * 异步读缓存（存储 v5 或文件）。
 */
async function readCapabilitiesFile(cachePath, storage) {
  if (isStorageV5Enabled() && storage !== undefined) {
    let readResult = await storage.read([getModelCapabilitiesStorageKey()]);
    let item = readResult.ok ? readResult.value.items[0] : undefined;
    return item?.found ? parseCapabilitiesCache(Buffer.from(item.value).toString("utf-8")) : null;
  }
  try {
    return parseCapabilitiesCache(await readFile(cachePath, "utf-8"));
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:469530-469728 layout
/**
 * 带抖动的 TTL 判定。
 */
function isCapabilitiesCacheFresh(capabilitiesFile, model, now) {
  if (capabilitiesFile.models.length === 0) return false;
  let lower = model.toLowerCase();
  let ttlMs = capabilitiesFile.models.some((model) => model.id.toLowerCase() === lower)
    ? CAPABILITY_CACHE_EXACT_TTL_MS
    : CAPABILITY_CACHE_FUZZY_TTL_MS;
  let jitter = CAPABILITY_CACHE_TTL_JITTER * (2 * ((capabilitiesFile.timestamp % 1000) / 1000) - 1);
  let ageMs = now - capabilitiesFile.timestamp;
  return ageMs >= 0 && ageMs < ttlMs * (1 + jitter);
}
//@ chunk-aepeg2w5.js:469728-469880 layout
/**
 * 缓存新鲜时载入进程缓存并返回 true。
 */
async function loadFreshCapabilities(model, storage, now = Date.now()) {
  if (!isModelCapabilitiesCacheEnabled() || isDiskless()) return false;
  let cachePath = getCachePath();
  let capabilitiesFile = await readCapabilitiesFile(cachePath, storage);
  if (capabilitiesFile === null || !isCapabilitiesCacheFresh(capabilitiesFile, model, now)) return false;
  getCapabilitiesMemo().set(cachePath, capabilitiesFile.models);
  return true;
}
//@ chunk-aepeg2w5.js:469880-470748 fingerprint = refreshModelCapabilities (0.502)
/**
 * 刷新能力缓存：排序后写入文件或存储 v5（非交互/禁止写入时跳过）。
 */
async function refreshModelCapabilities(models, storage) {
  if (isDiskless()) return;
  let cachePath = getCachePath();
  let sortedModels = sortForMatching(models);
  if (isStorageV5Enabled() && storage !== undefined) {
    let readResult = await storage.read([getModelCapabilitiesStorageKey()]);
    let betas =
      readResult.ok && readResult.value.items[0]?.found
        ? parseCapabilitiesModels(Buffer.from(readResult.value.items[0].value).toString("utf-8"))
        : null;
    if (!readResult.ok) logForDebugging(`[modelCapabilities] cache read failed: ${readResult.error.code}`);
    else getCapabilitiesMemo().set(cachePath, betas);
    let models = jsonStringify({
      models: sortedModels,
      timestamp: Date.now(),
    });
    try {
      await mkdir(getModelCapabilitiesCacheDir(), {
        recursive: true,
      });
    } catch (error) {
      logForDebugging(
        `[modelCapabilities] cache folder could not be made: ${error instanceof Error ? error.message : "unknown"}`,
      );
      return;
    }
    let writeResult = await storage.write(getModelCapabilitiesStorageKey(), models, {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!writeResult.ok) {
      logForDebugging(`[modelCapabilities] cache write failed: ${writeResult.error.code}`);
      return;
    }
    getCapabilitiesMemo().set(cachePath, parseCapabilitiesModels(models));
    logForDebugging(`[modelCapabilities] cached ${sortedModels.length} models`);
    return;
  }
  await mkdir(getModelCapabilitiesCacheDir(), {
    recursive: true,
  });
  await writeFile(
    cachePath,
    jsonStringify({
      models: sortedModels,
      timestamp: Date.now(),
    }),
    {
      encoding: "utf-8",
      mode: 384,
    },
  );
  getCapabilitiesMemo().set(cachePath, sortedModels);
  logForDebugging(`[modelCapabilities] cached ${sortedModels.length} models`);
}
//@ chunk-e6aww6q8.js:2404750-2404913 fingerprint = loadCache (0.453)
/**
 * 读客户端数据里的 accessFallbackModels，去掉别名与 default。旧版名 loadCache 不准确。
 */
function loadAccessFallbackModels() {
  let accessFallbackModels = parseAccessFallbackModels(getFlagSettingsInline()?.[ACCESSFALLBACKMODELS]);
  if (accessFallbackModels === undefined) return;
  return {
    for: accessFallbackModels.for,
    models: accessFallbackModels.models.filter((model) => {
      let lower = model.toLowerCase();
      return !isModelKeyAliasOrResolved(lower) && strip1mSuffix(lower) !== "default";
    }),
  };
}
export {
  primeModelCapabilities,
  isModelCapabilitiesCacheEnabled,
  loadFreshCapabilities,
  parseModelCapability,
  refreshModelCapabilities,
  getModelCapability,
  loadAccessFallbackModels,
};
