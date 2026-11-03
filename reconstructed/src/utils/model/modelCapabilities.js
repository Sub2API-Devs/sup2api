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
} from "path";
import { readFileSync, readFileSync as readFileSync_2, readFileSync as readFileSync_3 } from "fs";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
} from "fs/promises";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { safeParseJSON } from "../json.js";
import { getProviderState } from "./providerCaches.js";
import { logForDebugging } from "../debug.js";
import { isDiskless, getFlagSettingsInline } from "../../bootstrap/state.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonStringify } from "../slowOperations.js";
import { parseAccessFallbackModels, ACCESSFALLBACKMODELS } from "../../services/api/modelFallback.js";
import { pve, Lt } from "./modelIds.js";

/**
 * 见同句首个绑定的说明。
 */
//@ chunk-aepeg2w5.js:467817-467981 fingerprint = ModelCapabilitySchema (0.613)
var ModelCapabilitySchema = DoctorLazy(() =>
    u({ id: o(), max_input_tokens: E().optional(), max_tokens: E().optional() }).strip(),
  ),
  ModelCapabilitiesCacheSchema = DoctorLazy(() => u({ models: A(ModelCapabilitySchema()), timestamp: E() })),
  CAPABILITY_CACHE_EXACT_TTL_MS = 3600000,
  CAPABILITY_CACHE_FUZZY_TTL_MS = 300000,
  CAPABILITY_CACHE_TTL_JITTER = 0.1;
/**
 * 按 schema 解析单个能力条目。
 */
//@ chunk-aepeg2w5.js:467981-468052 layout
function parseModelCapability(e) {
  let safeParse = ModelCapabilitySchema().safeParse(e);
  return safeParse.success ? safeParse.data : void 0;
}
/**
 * ~/.claude/cache。覆盖后缀名 getCacheDir_4。
 */
//@ chunk-aepeg2w5.js:468052-468090 layout = getCacheDir (1)
function getModelCapabilitiesCacheDir() {
  return join_8(getClaudeConfigDir(), "cache");
}
/**
 * model-capabilities.json 的完整路径。
 */
//@ chunk-aepeg2w5.js:468090-468146 fingerprint = getCachePath (1)
function getCachePath() {
  return join_8(getModelCapabilitiesCacheDir(), "model-capabilities.json");
}
/**
 * 存储 v5 下的缓存键。
 */
//@ chunk-aepeg2w5.js:468146-468224 layout
function getModelCapabilitiesStorageKey() {
  return STORAGE_SPACES.cache("model-capabilities", "model-capabilities.json");
}
/**
 * 缓存文本 → models 数组或 null。
 */
//@ chunk-aepeg2w5.js:468224-468266 layout
function parseCapabilitiesModels(e) {
  return parseCapabilitiesCache(e)?.models ?? null;
}
/**
 * 缓存文本 → {models, timestamp} 或 null。
 */
//@ chunk-aepeg2w5.js:468266-468341 layout
function parseCapabilitiesCache(e) {
  let safeParse = ModelCapabilitiesCacheSchema().safeParse(safeParseJSON(e, !1));
  return safeParse.success ? safeParse.data : null;
}
/**
 * 恒为 false（构建时关闭；能力改由 catalog 与服务端目录提供）。
 */
//@ chunk-aepeg2w5.js:468341-468365 layout
function isModelCapabilitiesCacheEnabled() {
  return !1;
}
/**
 * 按 id 长度降序、再字典序排序（长 id 优先匹配）。
 */
//@ chunk-aepeg2w5.js:468365-468456 callgraph-fingerprint = sortForMatching (1)
function sortForMatching(models) {
  return [...models].sort((n, r) => r.id.length - n.id.length || n.id.localeCompare(r.id));
}
/**
 * 进程内 按缓存路径 的能力缓存。
 */
//@ chunk-aepeg2w5.js:468456-468511 layout
function getCapabilitiesMemo() {
  return getProviderState().modelCapabilitiesByCachePath;
}
/**
 * 读缓存文件（同步，存储 v5 时不读盘）并记入进程缓存。
 */
//@ chunk-aepeg2w5.js:468511-468693 layout
function readCapabilitiesCached(e, n = getProviderState().modelCapabilitiesStorageV5) {
  let r = getCapabilitiesMemo();
  if (r.has(e)) return r.get(e) ?? null;
  if (n) return null;
  let s;
  try {
    let h = readFileSync_3(e, "utf-8");
    s = parseCapabilitiesModels(h);
  } catch {
    s = null;
  }
  return (r.set(e, s), s);
}
/**
 * 从存储 v5 预读能力缓存（开关关闭时什么都不做）。
 */
//@ chunk-aepeg2w5.js:468693-469107 layout
async function primeModelCapabilities(e) {
  if (!e || !isModelCapabilitiesCacheEnabled()) return;
  let n = getCachePath();
  if (getCapabilitiesMemo().has(n)) return;
  let read = await e.read([getModelCapabilitiesStorageKey()]);
  if (!read.ok) {
    logForDebugging(`[modelCapabilities] prime read failed: ${read.error.code}`);
    return;
  }
  let s = read.value.items[0];
  if (!s.found) return;
  let h = parseCapabilitiesModels(Buffer.from(s.value).toString("utf-8"));
  if (h === null) return;
  let y = getProviderState();
  if (!y.modelCapabilitiesByCachePath.has(n)) y.modelCapabilitiesByCachePath.set(n, h);
  y.modelCapabilitiesStorageV5 = e;
}
/**
 * 按 id 精确或包含匹配取缓存能力（开关关闭时 undefined）。
 */
//@ chunk-aepeg2w5.js:469107-469311 file-local
function getModelCapability(model) {
  if (!isModelCapabilitiesCacheEnabled() || isDiskless()) return;
  let cached = readCapabilitiesCached(getCachePath());
  if (!cached || cached.length === 0) return;
  let lower = model.toLowerCase(),
    exact = cached.find((h) => h.id.toLowerCase() === lower);
  if (exact) return exact;
  return cached.find((h) => lower.includes(h.id.toLowerCase()));
}
/**
 * 异步读缓存（存储 v5 或文件）。
 */
//@ chunk-aepeg2w5.js:469311-469530 layout
async function readCapabilitiesFile(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let read = await n.read([getModelCapabilitiesStorageKey()]),
      s = read.ok ? read.value.items[0] : void 0;
    return s?.found ? parseCapabilitiesCache(Buffer.from(s.value).toString("utf-8")) : null;
  }
  try {
    return parseCapabilitiesCache(await readFile_2(e, "utf-8"));
  } catch {
    return null;
  }
}
/**
 * 带抖动的 TTL 判定。
 */
//@ chunk-aepeg2w5.js:469530-469728 layout
function isCapabilitiesCacheFresh(e, n, r) {
  if (e.models.length === 0) return !1;
  let lower = n.toLowerCase(),
    h = e.models.some((model) => model.id.toLowerCase() === lower)
      ? CAPABILITY_CACHE_EXACT_TTL_MS
      : CAPABILITY_CACHE_FUZZY_TTL_MS,
    y = CAPABILITY_CACHE_TTL_JITTER * (2 * ((e.timestamp % 1000) / 1000) - 1),
    S = r - e.timestamp;
  return S >= 0 && S < h * (1 + y);
}
/**
 * 缓存新鲜时载入进程缓存并返回 true。
 */
//@ chunk-aepeg2w5.js:469728-469880 layout
async function loadFreshCapabilities(e, n, r = Date.now()) {
  if (!isModelCapabilitiesCacheEnabled() || isDiskless()) return !1;
  let s = getCachePath(),
    h = await readCapabilitiesFile(s, n);
  if (h === null || !isCapabilitiesCacheFresh(h, e, r)) return !1;
  return (getCapabilitiesMemo().set(s, h.models), !0);
}
/**
 * 刷新能力缓存：排序后写入文件或存储 v5（非交互/禁止写入时跳过）。
 */
//@ chunk-aepeg2w5.js:469880-470748 fingerprint = refreshModelCapabilities (0.502)
async function refreshModelCapabilities(e, n) {
  if (isDiskless()) return;
  let r = getCachePath(),
    s = sortForMatching(e);
  if (isStorageV5Enabled() && n !== void 0) {
    let read = await n.read([getModelCapabilitiesStorageKey()]),
      betas =
        read.ok && read.value.items[0]?.found
          ? parseCapabilitiesModels(Buffer.from(read.value.items[0].value).toString("utf-8"))
          : null;
    if (!read.ok) logForDebugging(`[modelCapabilities] cache read failed: ${read.error.code}`);
    else getCapabilitiesMemo().set(r, betas);
    let models = jsonStringify({ models: s, timestamp: Date.now() });
    try {
      await mkdir_2(getModelCapabilitiesCacheDir(), { recursive: !0 });
    } catch (error) {
      logForDebugging(
        `[modelCapabilities] cache folder could not be made: ${error instanceof Error ? error.message : "unknown"}`,
      );
      return;
    }
    let write = await n.write(getModelCapabilitiesStorageKey(), models, {
      publishDiscipline: "inPlace",
      mode: 384,
    });
    if (!write.ok) {
      logForDebugging(`[modelCapabilities] cache write failed: ${write.error.code}`);
      return;
    }
    (getCapabilitiesMemo().set(r, parseCapabilitiesModels(models)),
      logForDebugging(`[modelCapabilities] cached ${s.length} models`));
    return;
  }
  (await mkdir_2(getModelCapabilitiesCacheDir(), { recursive: !0 }),
    await writeFile_2(r, jsonStringify({ models: s, timestamp: Date.now() }), {
      encoding: "utf-8",
      mode: 384,
    }),
    getCapabilitiesMemo().set(r, s),
    logForDebugging(`[modelCapabilities] cached ${s.length} models`));
}
/**
 * 读客户端数据里的 accessFallbackModels，去掉别名与 default。旧版名 loadCache 不准确。
 */
//@ chunk-e6aww6q8.js:2404750-2404913 fingerprint = loadCache (0.453)
function loadAccessFallbackModels() {
  let e = parseAccessFallbackModels(getFlagSettingsInline()?.[ACCESSFALLBACKMODELS]);
  if (e === void 0) return;
  return {
    for: e.for,
    models: e.models.filter((model) => {
      let lower = model.toLowerCase();
      return !pve(lower) && Lt(lower) !== "default";
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
