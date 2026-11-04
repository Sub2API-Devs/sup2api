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
import {
  objectSchema,
  literal,
  record,
  stringSchema,
  numberSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { modelCatalogCacheDir, maskStorage } from "./maskedIds.js";
import { getProviderState } from "../providerCaches.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { logForDebugging } from "../../debug.js";
import { safeParseJSON } from "../../json.js";
import { jsonStringify } from "../../slowOperations.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-0sn6pxb4.js:483-682 placement
var PUBLISHED_FLOOR_JSON; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FLOOR_FILE_VERSION;
var MAX_FLOOR_ENTRIES;
var MAX_FLOOR_FILE_BYTES;
var publishedFloorSchema;
deferInit("chunk-0sn6pxb4.js:483", () => {
  PUBLISHED_FLOOR_JSON = "published-floor.json";
  FLOOR_FILE_VERSION = 1;
  MAX_FLOOR_ENTRIES = 32;
  MAX_FLOOR_FILE_BYTES = 65536;
  publishedFloorSchema = DoctorLazy(() =>
    objectSchema({
      version: literal(FLOOR_FILE_VERSION),
      sources: record(
        stringSchema().min(1).max(64),
        objectSchema({
          version: numberSchema().int().nonnegative(),
          issuedAt: stringSchema().max(64),
          recordedAt: numberSchema().int().nonnegative(),
        }),
      ),
    }),
  );
});
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
async function recordPublishedCatalogFloor(cacheKey, record, recordedAt = Date.now()) {
  await loadPublishedCatalogFloorOnce();
  let existing = publishedCatalogFloorMarks().get(cacheKey);
  if (existing !== undefined && existing.version >= record.version) return;
  publishedCatalogFloorMarks().set(cacheKey, {
    version: record.version,
    issuedAt: (record.issued_at ?? "").slice(0, 64),
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
  for (let [cacheKey, mark] of publishedCatalogFloorFile) {
    let existing = publishedCatalogFloorMarks().get(cacheKey);
    if (existing === undefined || mark.version > existing.version)
      publishedCatalogFloorMarks().set(cacheKey, mark);
  }
}
//@ chunk-0sn6pxb4.js:1248-1691 placement
/**
 * 读版本下限文件（过大或无效时忽略并记日志）。
 */
async function readPublishedCatalogFloorFile() {
  let text;
  try {
    text = await maskStorage().readRange(publishedFloorPath(), 0, MAX_FLOOR_FILE_BYTES + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[publishedCatalog] floor file read failed: ${getErrnoCode(error) ?? "unknown"}; no persisted version marks this session`,
      );
    return;
  }
  let parsed =
    text.length > MAX_FLOOR_FILE_BYTES
      ? undefined
      : publishedFloorSchema().safeParse(safeParseJSON(text.toString("utf8"), false));
  if (!parsed?.success) {
    logForDebugging(
      `[publishedCatalog] floor file ${parsed === undefined ? "oversized" : "invalid"}; no persisted version marks this session`,
    );
    return;
  }
  return new Map(Object.entries(parsed.data.sources));
}
//@ chunk-0sn6pxb4.js:1691-1817 placement
function writePublishedCatalogFloorQueued() {
  let providerState = getProviderState();
  let pending = (providerState.publishedCatalogFloorWrite ?? Promise.resolve()).then(
    writePublishedCatalogFloorFile,
    writePublishedCatalogFloorFile,
  );
  providerState.publishedCatalogFloorWrite = pending;
  return pending;
}
//@ chunk-0sn6pxb4.js:1817-2113 placement
async function writePublishedCatalogFloorFile() {
  try {
    mergeCatalogFloors(await readPublishedCatalogFloorFile());
    let sliced = [...publishedCatalogFloorMarks().entries()]
      .sort(([, markA], [, markB]) => markB.recordedAt - markA.recordedAt)
      .slice(0, MAX_FLOOR_ENTRIES);
    let storage = maskStorage();
    await storage.mkdir(modelCatalogCacheDir());
    await storage.atomicWrite(
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
