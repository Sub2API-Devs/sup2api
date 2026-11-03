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
import { identity } from "./pathClassification.js";
import { getRealPathOptions } from "./sessionStorage.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { validateStorageKey, DIR_SYNC_RECORD_SUFFIX } from "./storage/storageKeys.js";

//@ chunk-k50y1rw8.js:488-506 placement
var realpathNativeAsync = promisify(realpath.native);
//@ chunk-k50y1rw8.js:506-579 placement
function sanitizeIdSegment(e) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(e) ? e : sanitizePath(e) || "empty-id";
}
//@ chunk-k50y1rw8.js:579-653 placement
async function resolveTranscriptRealPath(e, t, { isRootResolved: n = false } = {}) {
  return n ? identity(e) : canonicalizePath(e, getRealPathOptions(t));
}
//@ chunk-k50y1rw8.js:653-717 placement
/**
 * 定位会话转录文件路径。
 */
async function locateTranscriptPath(e, infraSessionId, n, i) {
  return join(getProjectDir(await resolveTranscriptRealPath(e, n, i)), dirSyncRecordFileName(infraSessionId));
}
//@ chunk-k50y1rw8.js:717-900 placement
/**
 * 解析会话转录的位置：项目目录下的文件路径、项目键，以及存储 v5 时的后端与键。
 */
async function resolveTranscriptLocation(e, t, n, i) {
  let transcriptRealPath = await resolveTranscriptRealPath(e, n, i);
  let path = join(getProjectDir(transcriptRealPath), dirSyncRecordFileName(t));
  let projectKey = getProjectKey(transcriptRealPath);
  let s = n === undefined ? undefined : dirSyncRecordKey(projectKey, t);
  return {
    path,
    projectKey,
    v5:
      n === undefined || s === undefined
        ? undefined
        : {
            backend: n,
            key: s,
          },
  };
}
//@ chunk-k50y1rw8.js:900-980 placement
/**
 * 构造目录同步记录键（非法返回 undefined）。
 */
function dirSyncRecordKey(e, t) {
  let n = STORAGE_SPACES.dirSyncRecord(e, sanitizeIdSegment(t));
  return validateStorageKey(n) === undefined ? n : undefined;
}
//@ chunk-k50y1rw8.js:980-1018 placement
/**
 * 目录同步记录文件名。
 */
function dirSyncRecordFileName(e) {
  return `${sanitizeIdSegment(e)}${DIR_SYNC_RECORD_SUFFIX}`;
}
export { locateTranscriptPath, dirSyncRecordFileName, resolveTranscriptLocation, dirSyncRecordKey };
