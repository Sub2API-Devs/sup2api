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
import { redactUrlsInText } from "../../redaction/urlRedaction.js";
import { isAnthropicHost } from "../../anthropicHosts.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, lit } from "../../../services/analytics/safeMetadata.js";
import { gn } from "../../shortHash.js";
import { getBetaByName } from "../../betas.js";
import { jsonStringify } from "../../slowOperations.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getFileReader } from "../../fileStore.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, A, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { getClaudeConfigDir } from "../../envUtils.js";
import { getProviderState } from "../providerCaches.js";
import { logForDebugging } from "../../debug.js";
import { addMaskedModelIds, co, normalizeModelId } from "./catalogEntries.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { safeParseJSON } from "../../json.js";
import { uniq } from "../../collections.js";

//@ chunk-aepeg2w5.js:754516-754570 placement
function Dki(e) {
  let n = redactUrlsInText(e);
  return isAnthropicHost(n) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : gn(n);
}
/**
 * 工具名列表的哈希（自定义工具归为 custom）。
 */
//@ chunk-aepeg2w5.js:754570-754637 placement
function hashToolNames(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e.map((n) => (getBetaByName(n) ? n : "custom")).join(","));
}
/**
 * 把工具名转换为遥测安全形式（MCP、评测注册与动态工具归为类别）。
 */
//@ chunk-aepeg2w5.js:754637-754817 placement
function sanitizeToolNameForTelemetry(e) {
  if (e.startsWith("mcp__")) return lit("mcp");
  if (e.startsWith("eval_registered__")) return lit("eval_registered");
  if (e.includes("__")) return lit("dynamic_tool");
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
/**
 * 键值对的哈希。
 */
//@ chunk-aepeg2w5.js:754817-754869 placement
function hashEntries(e) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(jsonStringify(Object.fromEntries(e)));
}
//@ chunk-aepeg2w5.js:754898-755007 placement
function rejectDiskless(e) {
  return () => Promise.reject(Object.assign(Error("this session keeps nothing on disk"), { code: e }));
}
//@ chunk-aepeg2w5.js:755007-755109 placement
var DISKLESS_MASK_STORE = {
  readRange: rejectDiskless("ENOENT"),
  delete: rejectDiskless("ENOENT"),
  mkdir: rejectDiskless("EDISKLESS"),
  atomicWrite: rejectDiskless("EDISKLESS"),
};
/**
 * 遮盖 id 文件使用的存储后端。
 */
//@ chunk-aepeg2w5.js:755109-755142 placement
function maskStorage() {
  return isDiskless() ? DISKLESS_MASK_STORE : getFileReader();
}
//@ chunk-aepeg2w5.js:755142-755315 placement
var MASKED_IDS_JSON = "masked-ids.json",
  vx = 512,
  _j = 64,
  hj = 5000,
  Ex = /^[a-z0-9._:@/[\]-]{1,200}$/,
  kx = 1,
  bx = 131072,
  MASKED_IDS_UNPARSEABLE_JSON = "masked-ids.unparseable.json",
  yj = 3,
  Sj = DoctorLazy(() => u({ version: T(kx), ids: A(oe()) }));
/**
 * 模型目录缓存目录。
 */
//@ chunk-aepeg2w5.js:755315-755369 placement
function modelCatalogCacheDir() {
  return join_9(getClaudeConfigDir(), "cache", "model-catalog");
}
//@ chunk-aepeg2w5.js:755369-755403 placement
function Ax() {
  return join_9(modelCatalogCacheDir(), MASKED_IDS_JSON);
}
//@ chunk-aepeg2w5.js:755403-755436 placement
function vj() {
  return join_9(modelCatalogCacheDir(), MASKED_IDS_UNPARSEABLE_JSON);
}
/**
 * 判断遮盖 id 的加载是否已完成或暂不需要（无盘、已加载或在重试冷却中）。
 */
//@ chunk-aepeg2w5.js:755436-755544 placement
function isMaskHydrationSettled(e = Date.now()) {
  let n = getProviderState();
  return isDiskless() || n.servedCatalogMaskHydrated || e < n.servedCatalogMaskRetryAt;
}
/**
 * 加载持久化的遮盖 id。
 */
//@ chunk-aepeg2w5.js:755544-756043 placement
function hydrateMaskedIds() {
  let e = getProviderState();
  if (isDiskless() && !e.servedCatalogMaskHydrated)
    ((e.servedCatalogPersistedMaskedIds = []), (e.servedCatalogMaskHydrated = !0));
  if (e.servedCatalogMaskHydrated || Date.now() < e.servedCatalogMaskRetryAt) return Promise.resolve();
  return (
    (e.servedCatalogMaskHydration ??= hydrateMaskedIds_2()
      .catch((n) => {
        (logForDebugging(
          `[servedCatalog] mask hydration failed: ${n instanceof Error ? n.name : "unknown"}`,
          { level: "error" },
        ),
          (getProviderState().servedCatalogMaskHydrated = !0));
      })
      .finally(() => {
        getProviderState().servedCatalogMaskHydration = void 0;
      })),
    e.servedCatalogMaskHydration
  );
}
//@ chunk-aepeg2w5.js:756043-756244 placement
async function hydrateMaskedIds_2() {
  let e = getProviderState(),
    n = await readMaskedIdsFile();
  if (n.status === "unreadable") {
    e.servedCatalogMaskRetryAt = Date.now() + hj;
    return;
  }
  (addMaskedModelIds(n.ids), (e.servedCatalogPersistedMaskedIds = n.ids), (e.servedCatalogMaskHydrated = !0));
}
/**
 * 读取 masked-ids.json（大小上限）。
 */
//@ chunk-aepeg2w5.js:756244-756886 placement
async function readMaskedIdsFile() {
  let e;
  try {
    e = await maskStorage().readRange(Ax(), 0, bx + 1);
  } catch (error) {
    if (isENOENT(error)) return { status: "ok", ids: [] };
    return (
      logForDebugging(`[servedCatalog] mask file read failed: ${getErrnoCode(error) ?? "unknown"}`),
      { status: "unreadable" }
    );
  }
  if (e.length > bx)
    return (
      logForDebugging("[servedCatalog] mask file oversized; not in this format"),
      { status: "foreign", ids: [], bytes: void 0 }
    );
  let n = safeParseJSON(e.toString("utf8"), !1),
    safeParse = Sj().safeParse(n);
  if (safeParse.success) return { status: "ok", ids: sanitizeMaskedIds(safeParse.data.ids) };
  let s =
    n !== null && typeof n === "object" && !Array.isArray(n) && Array.isArray(n.ids)
      ? sanitizeMaskedIds(n.ids)
      : [];
  return (
    logForDebugging(`[servedCatalog] mask file not in this format; keeping ${s.length} ids it names`),
    { status: "foreign", ids: s, bytes: e }
  );
}
//@ chunk-aepeg2w5.js:756886-757140 placement
function sanitizeMaskedIds(e) {
  let sliced = uniq(e.filter((r) => typeof r === "string" && Ex.test(r) && !co(r))).slice(0, vx);
  if (sliced.length < e.length)
    logForDebugging(
      `[servedCatalog] mask file: ${e.length - sliced.length} entries are not ids (or repeat one, or name a family this build ships), dropped`,
    );
  return sliced;
}
/**
 * 增加遮盖 id 并持久化。
 */
//@ chunk-aepeg2w5.js:757140-757656 placement
function addMaskedIds(e) {
  let n = uniq([...e].map(normalizeModelId).filter((y) => y.length > 0 && !co(y)));
  if (n.length === 0) return Promise.resolve();
  if ((addMaskedModelIds(n), isDiskless())) return Promise.resolve();
  let sliced = n.filter((y) => Ex.test(y)).slice(0, _j);
  if (sliced.length < n.length)
    logForDebugging(
      `[servedCatalog] ${n.length - sliced.length} confidential ids masked this session but not persisted (outside the id charset or over the per-entry cap)`,
    );
  if (sliced.length === 0) return Promise.resolve();
  let s = getProviderState(),
    h = (s.servedCatalogMaskWrite ?? Promise.resolve()).then(() => persistMaskedIds(sliced));
  return ((s.servedCatalogMaskWrite = h), h);
}
/**
 * 写回遮盖 id 文件。
 */
//@ chunk-aepeg2w5.js:757656-758527 placement
async function persistMaskedIds(e) {
  try {
    await hydrateMaskedIds();
    let n = getProviderState(),
      servedCatalogPersistedMaskedIds = n.servedCatalogPersistedMaskedIds;
    if (servedCatalogPersistedMaskedIds === void 0) {
      logForDebugging("[servedCatalog] mask file unreadable; not rewriting it this session");
      return;
    }
    if (e.every((y) => servedCatalogPersistedMaskedIds.includes(y))) return;
    let s = servedCatalogPersistedMaskedIds,
      h = maskStorage();
    for (let y = 0; y < yj; y++) {
      let S = await readMaskedIdsFile();
      if (S.status === "unreadable") {
        logForDebugging("[servedCatalog] mask file unreadable at write time; not rewriting it");
        return;
      }
      if ((addMaskedModelIds(S.ids), S.status === "foreign")) await preserveUnparsableMaskFile(S.bytes);
      let sliced = uniq([...e, ...S.ids, ...s]).slice(0, vx);
      (await h.mkdir(modelCatalogCacheDir()),
        await h.atomicWrite(Ax(), jsonStringify({ version: kx, ids: sliced }), 384));
      let R = await readMaskedIdsFile();
      if (R.status !== "ok") {
        n.servedCatalogPersistedMaskedIds = sliced;
        return;
      }
      if (
        (addMaskedModelIds(R.ids),
        (n.servedCatalogPersistedMaskedIds = R.ids),
        sliced.every((x) => R.ids.includes(x)))
      )
        return;
      ((s = R.ids), logForDebugging("[servedCatalog] mask file changed under the write; merging again"));
    }
  } catch (error) {
    logForDebugging(`[servedCatalog] mask file write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
/**
 * 保存无法解析的遮盖文件副本。
 */
//@ chunk-aepeg2w5.js:758527-758850 placement
async function preserveUnparsableMaskFile(e) {
  if (e === void 0) {
    logForDebugging("[servedCatalog] oversized mask file replaced without a copy");
    return;
  }
  try {
    (await maskStorage().atomicWrite(vj(), e.toString("utf8"), 384),
      logForDebugging(
        `[servedCatalog] mask file not in this format; copied to ${MASKED_IDS_UNPARSEABLE_JSON} and replaced`,
      ));
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
  MASKED_IDS_JSON,
  addMaskedIds,
  Dki,
  isMaskHydrationSettled,
};
