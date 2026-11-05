/**
 * utils/transcriptIds.ts
 *
 * 2.1.316 新增：记录 id
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z0fny38e.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { promisify } from "util";
import { realpath } from "fs";
import { join } from "path";
import { sanitizePath, canonicalizePath, getProjectDir, getProjectKey } from "./sessionStoragePortable.js";
import { identity } from "./pathClassification.js";
import { getRealPathOptions } from "./sessionStorage.js";
import { dirSyncRecordFileName, dirSyncRecordKey } from "./teleport/dirSync.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z0fny38e.js:488-506 placement
var realpathNativeAsync; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z0fny38e.js:488", () => {
  realpathNativeAsync = promisify(realpath.native);
});
//@ chunk-z0fny38e.js:506-579 placement
function sanitizeIdSegment(value) {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : sanitizePath(value) || "empty-id";
}
//@ chunk-z0fny38e.js:579-653 placement
async function resolveTranscriptRealPath(path, options, { isRootResolved = false } = {}) {
  return isRootResolved ? identity(path) : canonicalizePath(path, getRealPathOptions(options));
}
//@ chunk-z0fny38e.js:653-717 placement
/**
 * 定位会话转录文件路径。
 */
async function locateTranscriptPath(a, infraSessionId, storageBackend, realPathOptions) {
  return join(
    getProjectDir(await resolveTranscriptRealPath(a, storageBackend, realPathOptions)),
    dirSyncRecordFileName(infraSessionId),
  );
}
//@ chunk-z0fny38e.js:717-900 placement
/**
 * 解析会话转录的位置：项目目录下的文件路径、项目键，以及存储 v5 时的后端与键。
 */
async function resolveTranscriptLocation(a, infraSessionId, storageBackend, realPathOptions) {
  let transcriptRealPath = await resolveTranscriptRealPath(a, storageBackend, realPathOptions);
  let path = join(getProjectDir(transcriptRealPath), dirSyncRecordFileName(infraSessionId));
  let projectKey = getProjectKey(transcriptRealPath);
  let recordKey = storageBackend === undefined ? undefined : dirSyncRecordKey(projectKey, infraSessionId);
  return {
    path,
    projectKey,
    v5:
      storageBackend === undefined || recordKey === undefined
        ? undefined
        : {
            backend: storageBackend,
            key: recordKey,
          },
  };
}
export { sanitizeIdSegment, locateTranscriptPath, resolveTranscriptLocation };
