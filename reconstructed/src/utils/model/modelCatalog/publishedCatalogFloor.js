/**
 * utils/model/modelCatalog/publishedCatalogFloor.ts
 *
 * 2.1.316 新增：模型目录已发布下限（published-floor.json）的读写与合并，用于跨会话保留已发布的目录版本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sn6pxb4.js (10)
 * attribution: placement 10
 */
import { join } from "path";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, literal, record, string, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { modelCatalogCacheDir, maskStorage } from "./maskedIds.js";
import { getProviderState } from "../providerCaches.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { logForDebugging } from "../../debug.js";
import { safeParseJSON } from "../../json.js";
import { jsonStringify } from "../../slowOperations.js";

//@ chunk-0sn6pxb4.js:483-682 placement
var PUBLISHED_FLOOR_JSON = "published-floor.json";
var FLOOR_FILE_VERSION = 1;
var MAX_FLOOR_ENTRIES = 32;
var MAX_FLOOR_FILE_BYTES = 65536;
var publishedFloorSchema = DoctorLazy(() =>
  u({
    version: literal(FLOOR_FILE_VERSION),
    sources: record(
      string().min(1).max(64),
      u({
        version: E().int().nonnegative(),
        issuedAt: string().max(64),
        recordedAt: E().int().nonnegative(),
      }),
    ),
  }),
);
//@ chunk-0sn6pxb4.js:682-714 placement
function publishedFloorPath() {
  return join(modelCatalogCacheDir(), PUBLISHED_FLOOR_JSON);
}
//@ chunk-0sn6pxb4.js:714-766 placement
function publishedCatalogFloorMarks() {
  return getProviderState().publishedCatalogFloorMarks;
}
//@ chunk-0sn6pxb4.js:766-828 placement
/**
 * 读取已发布目录下限记录的版本号（缺省 0）。
 */
async function publishedFloorVersion(cacheKey) {
  await loadPublishedCatalogFloorOnce();
  return publishedCatalogFloorMarks().get(cacheKey)?.version ?? 0;
}
//@ chunk-0sn6pxb4.js:828-1028 placement
/**
 * 读入已持久化的版本下限后，若该来源的新版本更高则记录（版本、签发时间、记录时间）并排队写回文件。
 */
async function recordPublishedCatalogFloor(cacheKey, r, recordedAt = Date.now()) {
  await loadPublishedCatalogFloorOnce();
  let n = publishedCatalogFloorMarks().get(cacheKey);
  if (n !== undefined && n.version >= r.version) return;
  publishedCatalogFloorMarks().set(cacheKey, {
    version: r.version,
    issuedAt: (r.issued_at ?? "").slice(0, 64),
    recordedAt,
  });
  await writePublishedCatalogFloorQueued();
}
//@ chunk-0sn6pxb4.js:1028-1129 placement
function loadPublishedCatalogFloorOnce() {
  let providerState = getProviderState();
  providerState.publishedCatalogFloorRead ??= readPublishedCatalogFloorFile().then(mergeCatalogFloors);
  return providerState.publishedCatalogFloorRead;
}
//@ chunk-0sn6pxb4.js:1129-1248 placement
function mergeCatalogFloors(publishedCatalogFloorFile) {
  if (publishedCatalogFloorFile === undefined) return;
  for (let [r, i] of publishedCatalogFloorFile) {
    let n = publishedCatalogFloorMarks().get(r);
    if (n === undefined || i.version > n.version) publishedCatalogFloorMarks().set(r, i);
  }
}
//@ chunk-0sn6pxb4.js:1248-1691 placement
/**
 * 读版本下限文件（过大或无效时忽略并记日志）。
 */
async function readPublishedCatalogFloorFile() {
  let e;
  try {
    e = await maskStorage().readRange(publishedFloorPath(), 0, MAX_FLOOR_FILE_BYTES + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[publishedCatalog] floor file read failed: ${getErrnoCode(error) ?? "unknown"}; no persisted version marks this session`,
      );
    return;
  }
  let r =
    e.length > MAX_FLOOR_FILE_BYTES
      ? undefined
      : publishedFloorSchema().safeParse(safeParseJSON(e.toString("utf8"), false));
  if (!r?.success) {
    logForDebugging(
      `[publishedCatalog] floor file ${r === undefined ? "oversized" : "invalid"}; no persisted version marks this session`,
    );
    return;
  }
  return new Map(Object.entries(r.data.sources));
}
//@ chunk-0sn6pxb4.js:1691-1817 placement
function writePublishedCatalogFloorQueued() {
  let providerState = getProviderState();
  let r = (providerState.publishedCatalogFloorWrite ?? Promise.resolve()).then(
    writePublishedCatalogFloorFile,
    writePublishedCatalogFloorFile,
  );
  providerState.publishedCatalogFloorWrite = r;
  return r;
}
//@ chunk-0sn6pxb4.js:1817-2113 placement
async function writePublishedCatalogFloorFile() {
  try {
    mergeCatalogFloors(await readPublishedCatalogFloorFile());
    let sliced = [...publishedCatalogFloorMarks().entries()]
      .sort(([, i], [, n]) => n.recordedAt - i.recordedAt)
      .slice(0, MAX_FLOOR_ENTRIES);
    let r = maskStorage();
    await r.mkdir(modelCatalogCacheDir());
    await r.atomicWrite(
      publishedFloorPath(),
      jsonStringify({
        version: FLOOR_FILE_VERSION,
        sources: Object.fromEntries(sliced),
      }),
      384,
    );
  } catch (error) {
    logForDebugging(`[publishedCatalog] floor file write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}
export { PUBLISHED_FLOOR_JSON, recordPublishedCatalogFloor, publishedFloorVersion };
