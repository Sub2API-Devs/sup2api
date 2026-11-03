/**
 * utils/model/modelCatalog/publishedCatalogFloor.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sn6pxb4.js (10)
 * attribution: placement 10
 */
import { join } from "path";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, T, pe, o, E } from "../../../../vendor/zod/v4/classic/schemas.js";
import { modelCatalogCacheDir, maskStorage } from "./maskedIds.js";
import { getProviderState } from "../providerCaches.js";
import { isENOENT, getErrnoCode } from "../../errors.js";
import { logForDebugging } from "../../debug.js";
import { safeParseJSON } from "../../json.js";
import { jsonStringify } from "../../slowOperations.js";

//@ chunk-0sn6pxb4.js:483-682 placement
var PUBLISHED_FLOOR_JSON = "published-floor.json",
  l = 1,
  h = 32,
  a = 65536,
  v = DoctorLazy(() =>
    u({
      version: T(l),
      sources: pe(
        o().min(1).max(64),
        u({ version: E().int().nonnegative(), issuedAt: o().max(64), recordedAt: E().int().nonnegative() }),
      ),
    }),
  );
//@ chunk-0sn6pxb4.js:682-714 placement
function c() {
  return join(modelCatalogCacheDir(), PUBLISHED_FLOOR_JSON);
}
//@ chunk-0sn6pxb4.js:714-766 placement
function s() {
  return getProviderState().publishedCatalogFloorMarks;
}
//@ chunk-0sn6pxb4.js:766-828 placement
async function D6n(e) {
  return (await loadPublishedCatalogFloorOnce(), s().get(e)?.version ?? 0);
}
/**
 * 读入已持久化的版本下限后，若该来源的新版本更高则记录（版本、签发时间、记录时间）并排队写回文件。
 */
//@ chunk-0sn6pxb4.js:828-1028 placement
async function recordPublishedCatalogFloor(e, r, i = Date.now()) {
  await loadPublishedCatalogFloorOnce();
  let n = s().get(e);
  if (n !== void 0 && n.version >= r.version) return;
  (s().set(e, { version: r.version, issuedAt: (r.issued_at ?? "").slice(0, 64), recordedAt: i }),
    await writePublishedCatalogFloorQueued());
}
//@ chunk-0sn6pxb4.js:1028-1129 placement
function loadPublishedCatalogFloorOnce() {
  let e = getProviderState();
  return (
    (e.publishedCatalogFloorRead ??= readPublishedCatalogFloorFile().then(mergeCatalogFloors)),
    e.publishedCatalogFloorRead
  );
}
//@ chunk-0sn6pxb4.js:1129-1248 placement
function mergeCatalogFloors(e) {
  if (e === void 0) return;
  for (let [r, i] of e) {
    let n = s().get(r);
    if (n === void 0 || i.version > n.version) s().set(r, i);
  }
}
/**
 * 读版本下限文件（过大或无效时忽略并记日志）。
 */
//@ chunk-0sn6pxb4.js:1248-1691 placement
async function readPublishedCatalogFloorFile() {
  let e;
  try {
    e = await maskStorage().readRange(c(), 0, a + 1);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(
        `[publishedCatalog] floor file read failed: ${getErrnoCode(error) ?? "unknown"}; no persisted version marks this session`,
      );
    return;
  }
  let r = e.length > a ? void 0 : v().safeParse(safeParseJSON(e.toString("utf8"), !1));
  if (!r?.success) {
    logForDebugging(
      `[publishedCatalog] floor file ${r === void 0 ? "oversized" : "invalid"}; no persisted version marks this session`,
    );
    return;
  }
  return new Map(Object.entries(r.data.sources));
}
//@ chunk-0sn6pxb4.js:1691-1817 placement
function writePublishedCatalogFloorQueued() {
  let e = getProviderState(),
    r = (e.publishedCatalogFloorWrite ?? Promise.resolve()).then(
      writePublishedCatalogFloorFile,
      writePublishedCatalogFloorFile,
    );
  return ((e.publishedCatalogFloorWrite = r), r);
}
//@ chunk-0sn6pxb4.js:1817-2113 placement
async function writePublishedCatalogFloorFile() {
  try {
    mergeCatalogFloors(await readPublishedCatalogFloorFile());
    let sliced = [...s().entries()].sort(([, i], [, n]) => n.recordedAt - i.recordedAt).slice(0, h),
      r = maskStorage();
    (await r.mkdir(modelCatalogCacheDir()),
      await r.atomicWrite(c(), jsonStringify({ version: l, sources: Object.fromEntries(sliced) }), 384));
  } catch (error) {
    logForDebugging(`[publishedCatalog] floor file write failed: ${getErrnoCode(error) ?? "unknown"}`);
  }
}

export { PUBLISHED_FLOOR_JSON, recordPublishedCatalogFloor, D6n };
