/**
 * utils/model/modelCatalog/maskedIds.ts
 *
 * 2.1.316 新增：写回遮盖 id 文件；读取 masked-ids.json（大小上限）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (19)
 * attribution: placement 19
 */
import { join } from "path";
import { redactUrlsInText } from "../../redaction/urlRedaction.js";
import { isAnthropicHost } from "../../anthropicHosts.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../../services/analytics/safeMetadata.js";
import { shortHash } from "../../shortHash.js";
import { getBetaByName } from "../../betas.js";
import { jsonStringify } from "../../slowOperations.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getFileReader } from "../../fileStore.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, literal, array, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { getProviderState } from "../providerCaches.js";
import { logForDebugging } from "../../debug.js";
import { addMaskedModelIds, isMaskFreeModelId, normalizeModelId } from "./catalogEntries.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { safeParseJSON } from "../../json.js";
import { uniq } from "../../collections.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:754516-754570 placement
/**
 * 对文本中的 URL 先遮盖，再按主机是否 Anthropic 决定是否清洗。
 */
function hashOrRedactUrl(customApiBaseUrl) {
  let redacted = redactUrlsInText(customApiBaseUrl);
  return isAnthropicHost(redacted) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(redacted) : shortHash(redacted);
}
//@ chunk-aepeg2w5.js:754570-754637 placement
/**
 * 工具名列表的哈希（自定义工具归为 custom）。
 */
function hashToolNames(betas) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    betas.map((beta) => (getBetaByName(beta) ? beta : "custom")).join(","),
  );
}
//@ chunk-aepeg2w5.js:754637-754817 placement
/**
 * 把工具名转换为遥测安全形式（MCP、评测注册与动态工具归为类别）。
 */
function sanitizeToolNameForTelemetry(toolName) {
  if (toolName.startsWith("mcp__")) return lit("mcp");
  if (toolName.startsWith("eval_registered__")) return lit("eval_registered");
  if (toolName.includes("__")) return lit("dynamic_tool");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(toolName);
}
//@ chunk-aepeg2w5.js:754817-754869 placement
/**
 * 键值对的哈希。
 */
function hashEntries(entries) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(jsonStringify(Object.fromEntries(entries)));
}
//@ chunk-aepeg2w5.js:754898-755007 placement
function rejectDiskless(code) {
  return () =>
    Promise.reject(
      Object.assign(Error("this session keeps nothing on disk"), {
        code,
      }),
    );
}
//@ chunk-aepeg2w5.js:755007-755109 placement
var DISKLESS_MASK_STORE; // deferred: uses rejectDiskless of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:755007", () => {
  DISKLESS_MASK_STORE = {
    readRange: rejectDiskless("ENOENT"),
    delete: rejectDiskless("ENOENT"),
    mkdir: rejectDiskless("EDISKLESS"),
    atomicWrite: rejectDiskless("EDISKLESS"),
  };
});
//@ chunk-aepeg2w5.js:755109-755142 placement
/**
 * 遮盖 id 文件使用的存储后端。
 */
function maskStorage() {
  return isDiskless() ? DISKLESS_MASK_STORE : getFileReader();
}
//@ chunk-aepeg2w5.js:755142-755315 placement
var MASKED_IDS_JSON_2; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MASKED_IDS_JSON;
var MAX_MASKED_TOOL_NAMES;
var MASK_RETRY_DELAY_MS;
var MASKED_ID_RE;
var MASKED_IDS_VERSION;
var MAX_MASKED_IDS_FILE_BYTES;
var MASKED_IDS_UNPARSEABLE_JSON;
var MAX_UNPARSEABLE_WRITES;
var maskedIdsSchema;
deferInit("chunk-aepeg2w5.js:755142", () => {
  MASKED_IDS_JSON_2 = "masked-ids.json";
  MASKED_IDS_JSON = 512;
  MAX_MASKED_TOOL_NAMES = 64;
  MASK_RETRY_DELAY_MS = 5000;
  MASKED_ID_RE = /^[a-z0-9._:@/[\]-]{1,200}$/;
  MASKED_IDS_VERSION = 1;
  MAX_MASKED_IDS_FILE_BYTES = 131072;
  MASKED_IDS_UNPARSEABLE_JSON = "masked-ids.unparseable.json";
  MAX_UNPARSEABLE_WRITES = 3;
  maskedIdsSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(MASKED_IDS_VERSION),
      ids: array(unknown()),
    }),
  );
});
//@ chunk-aepeg2w5.js:755315-755369 placement
/**
 * 模型目录缓存目录。
 */
function modelCatalogCacheDir() {
  return join(getClaudeConfigDir(), "cache", "model-catalog");
}
//@ chunk-aepeg2w5.js:755369-755403 placement
function maskedIdsPath() {
  return join(modelCatalogCacheDir(), MASKED_IDS_JSON_2);
}
//@ chunk-aepeg2w5.js:755403-755436 placement
function maskedIdsUnparseablePath() {
  return join(modelCatalogCacheDir(), MASKED_IDS_UNPARSEABLE_JSON);
}
//@ chunk-aepeg2w5.js:755436-755544 placement
/**
 * 判断遮盖 id 的加载是否已完成或暂不需要（无盘、已加载或在重试冷却中）。
 */
function isMaskHydrationSettled(now = Date.now()) {
  let providerState = getProviderState();
  return (
    isDiskless() || providerState.servedCatalogMaskHydrated || now < providerState.servedCatalogMaskRetryAt
  );
}
//@ chunk-aepeg2w5.js:755544-756043 placement
/**
 * 加载持久化的遮盖 id。
 */
function hydrateMaskedIds() {
  let providerState = getProviderState();
  if (isDiskless() && !providerState.servedCatalogMaskHydrated) {
    providerState.servedCatalogPersistedMaskedIds = [];
    providerState.servedCatalogMaskHydrated = true;
  }
  if (providerState.servedCatalogMaskHydrated || Date.now() < providerState.servedCatalogMaskRetryAt)
    return Promise.resolve();
  providerState.servedCatalogMaskHydration ??= hydrateMaskedIds_2()
    .catch((error) => {
      logForDebugging(
        `[servedCatalog] mask hydration failed: ${error instanceof Error ? error.name : "unknown"}`,
        {
          level: "error",
        },
      );
      getProviderState().servedCatalogMaskHydrated = true;
    })
    .finally(() => {
      getProviderState().servedCatalogMaskHydration = undefined;
    });
  return providerState.servedCatalogMaskHydration;
}
//@ chunk-aepeg2w5.js:756043-756244 placement
async function hydrateMaskedIds_2() {
  let providerState = getProviderState();
  let maskedIdsFile = await readMaskedIdsFile();
  if (maskedIdsFile.status === "unreadable") {
    providerState.servedCatalogMaskRetryAt = Date.now() + MASK_RETRY_DELAY_MS;
    return;
  }
  addMaskedModelIds(maskedIdsFile.ids);
  providerState.servedCatalogPersistedMaskedIds = maskedIdsFile.ids;
  providerState.servedCatalogMaskHydrated = true;
}
//@ chunk-aepeg2w5.js:756244-756886 placement
/**
 * 读取 masked-ids.json（大小上限）。
 */
async function readMaskedIdsFile() {
  let raw;
  try {
    raw = await maskStorage().readRange(maskedIdsPath(), 0, MAX_MASKED_IDS_FILE_BYTES + 1);
  } catch (error) {
    if (isENOENT(error))
      return {
        status: "ok",
        ids: [],
      };
    logForDebugging(`[servedCatalog] mask file read failed: ${getErrnoCode(error) ?? "unknown"}`);
    return {
      status: "unreadable",
    };
  }
  if (raw.length > MAX_MASKED_IDS_FILE_BYTES) {
    logForDebugging("[servedCatalog] mask file oversized; not in this format");
    return {
      status: "foreign",
      ids: [],
      bytes: undefined,
    };
  }
  let parsedJson = safeParseJSON(raw.toString("utf8"), false);
  let parsed = maskedIdsSchema().safeParse(parsedJson);
  if (parsed.success)
    return {
      status: "ok",
      ids: sanitizeMaskedIds(parsed.data.ids),
    };
  let fallbackIds =
    parsedJson !== null &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson) &&
    Array.isArray(parsedJson.ids)
      ? sanitizeMaskedIds(parsedJson.ids)
      : [];
  logForDebugging(`[servedCatalog] mask file not in this format; keeping ${fallbackIds.length} ids it names`);
  return {
    status: "foreign",
    ids: fallbackIds,
    bytes: raw,
  };
}
//@ chunk-aepeg2w5.js:756886-757140 placement
function sanitizeMaskedIds(ids) {
  let sliced = uniq(
    ids.filter((id) => typeof id === "string" && MASKED_ID_RE.test(id) && !isMaskFreeModelId(id)),
  ).slice(0, MASKED_IDS_JSON);
  if (sliced.length < ids.length)
    logForDebugging(
      `[servedCatalog] mask file: ${ids.length - sliced.length} entries are not ids (or repeat one, or name a family this build ships), dropped`,
    );
  return sliced;
}
//@ chunk-aepeg2w5.js:757140-757656 placement
/**
 * 增加遮盖 id 并持久化。
 */
function addMaskedIds(maskedIdSet) {
  let toPersist = uniq(
    [...maskedIdSet].map(normalizeModelId).filter((id) => id.length > 0 && !isMaskFreeModelId(id)),
  );
  if (toPersist.length === 0) return Promise.resolve();
  addMaskedModelIds(toPersist);
  if (isDiskless()) return Promise.resolve();
  let sliced = toPersist.filter((id) => MASKED_ID_RE.test(id)).slice(0, MAX_MASKED_TOOL_NAMES);
  if (sliced.length < toPersist.length)
    logForDebugging(
      `[servedCatalog] ${toPersist.length - sliced.length} confidential ids masked this session but not persisted (outside the id charset or over the per-entry cap)`,
    );
  if (sliced.length === 0) return Promise.resolve();
  let providerState = getProviderState();
  let pending = (providerState.servedCatalogMaskWrite ?? Promise.resolve()).then(() =>
    persistMaskedIds(sliced),
  );
  providerState.servedCatalogMaskWrite = pending;
  return pending;
}
//@ chunk-aepeg2w5.js:757656-758527 placement
/**
 * 写回遮盖 id 文件。
 */
async function persistMaskedIds(ids) {
  try {
    await hydrateMaskedIds();
    let providerState = getProviderState();
    let servedCatalogPersistedMaskedIds = providerState.servedCatalogPersistedMaskedIds;
    if (servedCatalogPersistedMaskedIds === undefined) {
      logForDebugging("[servedCatalog] mask file unreadable; not rewriting it this session");
      return;
    }
    if (ids.every((id) => servedCatalogPersistedMaskedIds.includes(id))) return;
    let previousIds = servedCatalogPersistedMaskedIds;
    let storage = maskStorage();
    for (let j = 0; j < MAX_UNPARSEABLE_WRITES; j++) {
      let maskedIdsFile = await readMaskedIdsFile();
      if (maskedIdsFile.status === "unreadable") {
        logForDebugging("[servedCatalog] mask file unreadable at write time; not rewriting it");
        return;
      }
      addMaskedModelIds(maskedIdsFile.ids);
      if (maskedIdsFile.status === "foreign") await preserveUnparsableMaskFile(maskedIdsFile.bytes);
      let sliced = uniq([...ids, ...maskedIdsFile.ids, ...previousIds]).slice(0, MASKED_IDS_JSON);
      await storage.mkdir(modelCatalogCacheDir());
      await storage.atomicWrite(
        maskedIdsPath(),
        jsonStringify({
          version: MASKED_IDS_VERSION,
          ids: sliced,
        }),
        384,
      );
      let maskedIdsFile_2 = await readMaskedIdsFile();
      if (maskedIdsFile_2.status !== "ok") {
        providerState.servedCatalogPersistedMaskedIds = sliced;
        return;
      }
      addMaskedModelIds(maskedIdsFile_2.ids);
      providerState.servedCatalogPersistedMaskedIds = maskedIdsFile_2.ids;
      if (sliced.every((id) => maskedIdsFile_2.ids.includes(id))) return;
      previousIds = maskedIdsFile_2.ids;
      logForDebugging("[servedCatalog] mask file changed under the write; merging again");
    }
  } catch (error) {
    logForDebugging(`[servedCatalog] mask file write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
//@ chunk-aepeg2w5.js:758527-758850 placement
/**
 * 保存无法解析的遮盖文件副本。
 */
async function preserveUnparsableMaskFile(bytes) {
  if (bytes === undefined) {
    logForDebugging("[servedCatalog] oversized mask file replaced without a copy");
    return;
  }
  try {
    await maskStorage().atomicWrite(maskedIdsUnparseablePath(), bytes.toString("utf8"), 384);
    logForDebugging(
      `[servedCatalog] mask file not in this format; copied to ${MASKED_IDS_UNPARSEABLE_JSON} and replaced`,
    );
  } catch (error) {
    logForDebugging(`[servedCatalog] mask file quarantine failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
export {
  modelCatalogCacheDir,
  maskStorage,
  hashToolNames,
  hydrateMaskedIds,
  hashEntries,
  sanitizeToolNameForTelemetry,
  MASKED_IDS_JSON_2,
  addMaskedIds,
  hashOrRedactUrl,
  isMaskHydrationSettled,
};
