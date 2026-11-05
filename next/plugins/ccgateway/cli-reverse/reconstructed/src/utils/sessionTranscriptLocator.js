/**
 * utils/sessionTranscriptLocator.ts
 *
 * 2.1.316 新增：会话记录文件定位
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wdd04e0j.js (7)
 * attribution: placement 7
 */
import { lstat, realpath, readdir } from "fs/promises";
import { dirname, resolve, join } from "path";
import { getErrnoCode, isENOENT, errorMessage } from "./errors.js";
import { isSessionRecordLookupEnabled } from "../cli/headlessCloud/sessionRecords.js";
import { toInfraSessionId } from "../bridge/sessionIdCompat.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { findGitRoot } from "./git.js";
import { hasBackslash, cwdHasBackslash } from "./pathClassification.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { locateTranscriptPath, resolveTranscriptLocation } from "./transcriptIds.js";
import { getProjectsDir } from "./sessionStoragePortable.js";
import { dirSyncRecordFileName, dirSyncRecordKey } from "./teleport/dirSync.js";
import { getFileKind } from "./fileKind.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";

//@ chunk-wdd04e0j.js:4063-4161 placement
var TRANSCRIPT_LOCATE_TIMEOUT_MS = 4000;
var MAX_TRANSCRIPT_CANDIDATES = 16;
var ELSEWHERE_RESULT = {
  kind: "elsewhere",
};
var NOWHERE_RESULT = {
  kind: "nowhere",
};
var NOWHERE_WITH_RECORD_RESULT = {
  kind: "nowhere",
  hasOwnSessionRecord: true,
};
//@ chunk-wdd04e0j.js:4161-4319 placement
async function pathKindExists(path, kind) {
  return lstat(path).then(
    (stats) => ((kind === "file" ? stats.isFile() : stats.isDirectory()) ? true : undefined),
    (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? false : undefined;
    },
  );
}
//@ chunk-wdd04e0j.js:4319-4352 placement
function isFilePath(path) {
  return pathKindExists(path, "file");
}
//@ chunk-wdd04e0j.js:4352-4419 placement
async function isFileUnderExistingDir(path) {
  let parentKind = await pathKindExists(dirname(path), "dir");
  return parentKind === true ? isFilePath(path) : parentKind;
}
//@ chunk-wdd04e0j.js:4419-5401 placement
/**
 * 查找会话记录文件位置（本地或 v5 存储），返回未知原因或路径。
 */
async function locateSessionTranscript(sessionId, storage, cap = TRANSCRIPT_LOCATE_TIMEOUT_MS) {
  if (!isSessionRecordLookupEnabled())
    return {
      kind: "unknown",
      why: "not_looked",
    };
  let infraSessionId = toInfraSessionId(sessionId);
  let originalCwd = getOriginalCwd();
  let root = findGitRoot(originalCwd) ?? resolve(originalCwd);
  if (hasBackslash(root) || cwdHasBackslash() || hasBackslash(await realpath(root).catch(() => root)))
    return {
      kind: "unknown",
      why: "path_misread",
    };
  if (isStorageV5Enabled() && storage !== undefined)
    return findTranscriptPathSafe(storage, root, infraSessionId, cap);
  let path = await locateTranscriptPath(root, infraSessionId, storage);
  let projectsDir = getProjectsDir();
  let fileName = dirSyncRecordFileName(infraSessionId);
  try {
    let here = await isFileUnderExistingDir(path);
    if (here !== false)
      return here
        ? NOWHERE_WITH_RECORD_RESULT
        : {
            kind: "unknown",
            why: "here_unreadable",
          };
    let dirents = await readdir(projectsDir, {
      withFileTypes: true,
    });
    let results = await Promise.all(
      dirents.map((dirent) => getFileKind(dirent, join(projectsDir, dirent.name), "unknown")),
    );
    let filtered = dirents.filter((dirent, index) => results[index] === "dir");
    let sliced = filtered.slice(0, cap);
    let any = results.some((kind) => kind === "symlink" || kind === "unknown");
    for (let offset = 0; offset < sliced.length; offset += MAX_TRANSCRIPT_CANDIDATES) {
      let results = await Promise.all(
        sliced
          .slice(offset, offset + MAX_TRANSCRIPT_CANDIDATES)
          .map((dirent) => isFilePath(join(projectsDir, dirent.name, fileName))),
      );
      if (results.includes(true)) return ELSEWHERE_RESULT;
      any ||= results.includes(undefined);
    }
    return any
      ? {
          kind: "unknown",
          why: "probe_failed",
        }
      : filtered.length > sliced.length
        ? {
            kind: "unknown",
            why: "listing_capped",
          }
        : NOWHERE_RESULT;
  } catch (error) {
    if (isENOENT(error)) return NOWHERE_RESULT;
    logForDebugging(
      `[sessionRecord] could not tell whether another project folder holds this session's record: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return {
      kind: "unknown",
      why: "listing_failed",
    };
  }
}
//@ chunk-wdd04e0j.js:5401-5629 placement
async function findTranscriptPathSafe(storage, root, infraSessionId, cap) {
  try {
    return await findTranscriptPath(storage, root, infraSessionId, cap);
  } catch (error) {
    logForDebugging(
      `[sessionRecord] could not tell whether another project folder holds this session's record: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return {
      kind: "unknown",
      why: "listing_failed",
    };
  }
}
//@ chunk-wdd04e0j.js:5629-6971 placement
async function findTranscriptPath(storage, root, infraSessionId, cap) {
  let transcriptLocation = await resolveTranscriptLocation(root, infraSessionId, storage);
  if (transcriptLocation.v5 === undefined) {
    let here = await isFileUnderExistingDir(transcriptLocation.path);
    if (here !== false)
      return here
        ? NOWHERE_WITH_RECORD_RESULT
        : {
            kind: "unknown",
            why: "here_unreadable",
          };
  } else {
    let scope = await storage.scopeKind({
      namespace: "transcript",
      projectKey: transcriptLocation.projectKey,
    });
    if (!scope.ok || scope.value.kind === "link" || scope.value.kind === "other")
      return {
        kind: "unknown",
        why: "here_unreadable",
      };
    if (scope.value.kind === "directory") {
      let meta = await storage.statMeta(transcriptLocation.v5.key);
      if (meta.ok) return NOWHERE_WITH_RECORD_RESULT;
      if (meta.error.code !== "NotFound")
        return {
          kind: "unknown",
          why: "here_unreadable",
        };
    }
  }
  let projectKeys = [];
  let cursor;
  do {
    let page = await storage.listEntries(
      {
        namespace: "transcript",
      },
      {
        cursor,
        skipScopeStats: true,
        skipKeyStats: true,
      },
    );
    if (!page.ok) {
      logForDebugging(
        `[sessionRecord] could not tell whether another project folder holds this session's record: ${formatStorageError(page.error)}`,
        {
          level: "warn",
        },
      );
      return {
        kind: "unknown",
        why: "listing_failed",
      };
    }
    for (let item of page.value.items)
      if (item.kind === "scope" && item.scope.namespace === "transcript") {
        let projectKey = item.scope.projectKey;
        if (projectKey !== undefined) projectKeys.push(projectKey);
      }
    cursor = page.value.cursor;
  } while (cursor !== undefined && projectKeys.length < cap);
  let sliced = projectKeys.slice(0, cap);
  let anyUnknown = false;
  for (let offset = 0; offset < sliced.length; offset += MAX_TRANSCRIPT_CANDIDATES) {
    let results = await Promise.all(
      sliced.slice(offset, offset + MAX_TRANSCRIPT_CANDIDATES).map(async (projectKey) => {
        let key = dirSyncRecordKey(projectKey, infraSessionId);
        if (key === undefined) return;
        let meta = await storage.statMeta(key);
        return meta.ok ? true : meta.error.code === "NotFound" ? false : undefined;
      }),
    );
    if (results.includes(true)) return ELSEWHERE_RESULT;
    anyUnknown ||= results.includes(undefined);
  }
  return anyUnknown
    ? {
        kind: "unknown",
        why: "probe_failed",
      }
    : cursor !== undefined || projectKeys.length > sliced.length
      ? {
          kind: "unknown",
          why: "listing_capped",
        }
      : NOWHERE_RESULT;
}
export { locateSessionTranscript };
