/**
 * utils/transcriptIds.ts
 *
 * 2.1.316 新增：记录 id
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k50y1rw8.js (7)
 * attribution: placement 7
 */
import { promisify } from "util";
import { realpath } from "fs";
import { join } from "path";
import { sanitizePath, canonicalizePath, getProjectDir, getProjectKey } from "./sessionStoragePortable.js";
import { Mn } from "./pathClassification.js";
import { getRealPathOptions } from "./sessionStorage.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { validateStorageKey, DIR_SYNC_RECORD_SUFFIX } from "./storage/storageKeys.js";

//@ chunk-k50y1rw8.js:488-506 placement
var h = promisify(realpath.native);
//@ chunk-k50y1rw8.js:506-579 placement
function c(e) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(e) ? e : sanitizePath(e) || "empty-id";
}
//@ chunk-k50y1rw8.js:579-653 placement
async function d(e, t, { isRootResolved: n = !1 } = {}) {
  return n ? Mn(e) : canonicalizePath(e, getRealPathOptions(t));
}
//@ chunk-k50y1rw8.js:653-717 placement
async function C$s(e, t, n, i) {
  return join(getProjectDir(await d(e, n, i)), CMr(t));
}
/**
 * 解析会话转录的位置：项目目录下的文件路径、项目键，以及存储 v5 时的后端与键。
 */
//@ chunk-k50y1rw8.js:717-900 placement
async function resolveTranscriptLocation(e, t, n, i) {
  let o = await d(e, n, i),
    p = join(getProjectDir(o), CMr(t)),
    r = getProjectKey(o),
    s = n === void 0 ? void 0 : kAo(r, t);
  return { path: p, projectKey: r, v5: n === void 0 || s === void 0 ? void 0 : { backend: n, key: s } };
}
//@ chunk-k50y1rw8.js:900-980 placement
function kAo(e, t) {
  let dirSyncRecord = STORAGE_SPACES.dirSyncRecord(e, c(t));
  return validateStorageKey(dirSyncRecord) === void 0 ? dirSyncRecord : void 0;
}
//@ chunk-k50y1rw8.js:980-1018 placement
function CMr(e) {
  return `${c(e)}${DIR_SYNC_RECORD_SUFFIX}`;
}

export { C$s, CMr, resolveTranscriptLocation, kAo };
