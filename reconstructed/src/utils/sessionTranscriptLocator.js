/**
 * utils/sessionTranscriptLocator.ts
 *
 * 2.1.316 新增：会话记录文件定位
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dmh8arxx.js (7)
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
import {
  locateTranscriptPath,
  dirSyncRecordFileName,
  resolveTranscriptLocation,
  dirSyncRecordKey,
} from "./transcriptIds.js";
import { getProjectsDir } from "./sessionStoragePortable.js";
import { getFileKind } from "./fileKind.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";

//@ chunk-dmh8arxx.js:3727-3825 placement
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
//@ chunk-dmh8arxx.js:3825-3983 placement
async function pathKindExists(n, r) {
  return lstat(n).then(
    (o) => ((r === "file" ? o.isFile() : o.isDirectory()) ? true : undefined),
    (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? false : undefined;
    },
  );
}
//@ chunk-dmh8arxx.js:3983-4016 placement
function isFilePath(n) {
  return pathKindExists(n, "file");
}
//@ chunk-dmh8arxx.js:4016-4083 placement
async function isFileUnderExistingDir(n) {
  let r = await pathKindExists(dirname(n), "dir");
  return r === true ? isFilePath(n) : r;
}
//@ chunk-dmh8arxx.js:4083-5065 placement
/**
 * 查找会话记录文件位置（本地或 v5 存储），返回未知原因或路径。
 */
async function locateSessionTranscript(n, r, o = TRANSCRIPT_LOCATE_TIMEOUT_MS) {
  if (!isSessionRecordLookupEnabled())
    return {
      kind: "unknown",
      why: "not_looked",
    };
  let infraSessionId = toInfraSessionId(n);
  let originalCwd = getOriginalCwd();
  let l = findGitRoot(originalCwd) ?? resolve(originalCwd);
  if (hasBackslash(l) || cwdHasBackslash() || hasBackslash(await realpath(l).catch(() => l)))
    return {
      kind: "unknown",
      why: "path_misread",
    };
  if (isStorageV5Enabled() && r !== undefined) return findTranscriptPathSafe(r, l, infraSessionId, o);
  let h = await locateTranscriptPath(l, infraSessionId, r);
  let projectsDir = getProjectsDir();
  let m = dirSyncRecordFileName(infraSessionId);
  try {
    let e = await isFileUnderExistingDir(h);
    if (e !== false)
      return e
        ? NOWHERE_WITH_RECORD_RESULT
        : {
            kind: "unknown",
            why: "here_unreadable",
          };
    let i = await readdir(projectsDir, {
      withFileTypes: true,
    });
    let results = await Promise.all(i.map((a) => getFileKind(a, join(projectsDir, a.name), "unknown")));
    let filtered = i.filter((a, R) => results[R] === "dir");
    let sliced = filtered.slice(0, o);
    let any = results.some((a) => a === "symlink" || a === "unknown");
    for (let a = 0; a < sliced.length; a += MAX_TRANSCRIPT_CANDIDATES) {
      let results = await Promise.all(
        sliced.slice(a, a + MAX_TRANSCRIPT_CANDIDATES).map((F) => isFilePath(join(projectsDir, F.name, m))),
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
//@ chunk-dmh8arxx.js:5065-5293 placement
async function findTranscriptPathSafe(n, r, infraSessionId, s) {
  try {
    return await findTranscriptPath(n, r, infraSessionId, s);
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
//@ chunk-dmh8arxx.js:5293-6635 placement
async function findTranscriptPath(n, r, o, s) {
  let transcriptLocation = await resolveTranscriptLocation(r, o, n);
  if (transcriptLocation.v5 === undefined) {
    let e = await isFileUnderExistingDir(transcriptLocation.path);
    if (e !== false)
      return e
        ? NOWHERE_WITH_RECORD_RESULT
        : {
            kind: "unknown",
            why: "here_unreadable",
          };
  } else {
    let e = await n.scopeKind({
      namespace: "transcript",
      projectKey: transcriptLocation.projectKey,
    });
    if (!e.ok || e.value.kind === "link" || e.value.kind === "other")
      return {
        kind: "unknown",
        why: "here_unreadable",
      };
    if (e.value.kind === "directory") {
      let i = await n.statMeta(transcriptLocation.v5.key);
      if (i.ok) return NOWHERE_WITH_RECORD_RESULT;
      if (i.error.code !== "NotFound")
        return {
          kind: "unknown",
          why: "here_unreadable",
        };
    }
  }
  let l = [];
  let h;
  do {
    let e = await n.listEntries(
      {
        namespace: "transcript",
      },
      {
        cursor: h,
        skipScopeStats: true,
        skipKeyStats: true,
      },
    );
    if (!e.ok) {
      logForDebugging(
        `[sessionRecord] could not tell whether another project folder holds this session's record: ${formatStorageError(e.error)}`,
        {
          level: "warn",
        },
      );
      return {
        kind: "unknown",
        why: "listing_failed",
      };
    }
    for (let item of e.value.items)
      if (item.kind === "scope" && item.scope.namespace === "transcript") {
        let projectKey = item.scope.projectKey;
        if (projectKey !== undefined) l.push(projectKey);
      }
    h = e.value.cursor;
  } while (h !== undefined && l.length < s);
  let sliced = l.slice(0, s);
  let m = false;
  for (let e = 0; e < sliced.length; e += MAX_TRANSCRIPT_CANDIDATES) {
    let results = await Promise.all(
      sliced.slice(e, e + MAX_TRANSCRIPT_CANDIDATES).map(async (f) => {
        let p = dirSyncRecordKey(f, o);
        if (p === undefined) return;
        let w = await n.statMeta(p);
        return w.ok ? true : w.error.code === "NotFound" ? false : undefined;
      }),
    );
    if (results.includes(true)) return ELSEWHERE_RESULT;
    m ||= results.includes(undefined);
  }
  return m
    ? {
        kind: "unknown",
        why: "probe_failed",
      }
    : h !== undefined || l.length > sliced.length
      ? {
          kind: "unknown",
          why: "listing_capped",
        }
      : NOWHERE_RESULT;
}
