/**
 * utils/listSessionsImpl.ts
 *
 * SDK listSessions：扫描项目目录下会话 jsonl 并读取头尾摘要。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/listSessionsImpl.ts
 * pieces: chunk-csvcrjg7.js (4), chunk-wzyv38y8.js (1), chunk-xmpe3wef.js (1)
 * attribution: sole-consumer 1, fingerprint 3, layout 1, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { npmGlobalPrefixes } from "./autoUpdater.js";
import {
  getProjectKeyIfRepresentable,
  wrapStorageSource,
  getTranscriptStorageKey,
  transcriptMayContainMarker,
} from "./sessionStorage.js";
import { isValidKeySegment } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { readAllPages } from "./pagedRead.js";
import { validateUuid, readSessionLite } from "./sessionStoragePortable.js";
import { findContinuedInSessionId } from "./backgroundSessionResume.js";
import { stripBomAndCarriageReturn } from "./remoteFileState.js";

//@ chunk-wzyv38y8.js:19732-19927 fingerprint (2.1.88 match: gatherAllCandidates, 1)
async function gatherAllCandidates() {
  return (
    await Promise.all(
      npmGlobalPrefixes().map((globalPrefix) =>
        readdir(globalPrefix, {
          withFileTypes: true,
        })
          .then((dirents) =>
            dirents
              .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith("."))
              .map((dirent) => join(globalPrefix, dirent.name)),
          )
          .catch(() => []),
      ),
    )
  ).flat();
}
//@ chunk-csvcrjg7.js:545-605 sole-consumer
function getProjectKeyIfValid(projectPath) {
  let projectKeyIfRepresentable = getProjectKeyIfRepresentable(projectPath);
  return projectKeyIfRepresentable !== undefined && isValidKeySegment(projectKeyIfRepresentable)
    ? projectKeyIfRepresentable
    : undefined;
}
//@ chunk-csvcrjg7.js:605-1662 fingerprint (2.1.88 match: listCandidates, 0.444)
/**
 * 列出某项目目录（或全部）下的 .jsonl 会话候选及 mtime。
 */
async function listCandidates(projectsDir, includeMtime, projectPath, storage, budget, ownWorktrees) {
  let projectKey =
    isStorageV5Enabled() && storage !== undefined ? getProjectKeyIfValid(projectsDir) : undefined;
  if (storage !== undefined && projectKey !== undefined) {
    let sessionsById = new Map();
    try {
      await readAllPages(
        (cursor) =>
          storage.listEntries(
            {
              namespace: "transcript",
              projectKey,
            },
            {
              skipScopeStats: true,
              ...(includeMtime
                ? {}
                : {
                    skipKeyStats: true,
                  }),
              ...(cursor !== undefined && {
                cursor,
              }),
            },
          ),
        (entries) => {
          for (let entry of entries) {
            if (entry.kind !== "key" || entry.key.namespace !== "transcript") continue;
            let sessionId = validateUuid(entry.key.sessionId);
            if (!sessionId) continue;
            if (includeMtime && entry.mtimeMs === undefined) continue;
            let mtimeMs = includeMtime ? Math.trunc(entry.mtimeMs ?? 0) : 0;
            let existing = sessionsById.get(sessionId);
            if (existing !== undefined) {
              if (mtimeMs > existing.mtime) existing.mtime = mtimeMs;
              continue;
            }
            sessionsById.set(sessionId, {
              sessionId,
              filePath: join(projectsDir, `${entry.key.sessionId}.jsonl`),
              mtime: mtimeMs,
              projectPath,
              ownWorktrees,
            });
          }
        },
        budget !== undefined
          ? {
              budget,
            }
          : undefined,
      );
    } catch {}
    return [...sessionsById.values()];
  }
  let names;
  try {
    names = await readdir(projectsDir);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      names.map(async (name) => {
        if (!name.endsWith(".jsonl")) return null;
        let sessionId = validateUuid(name.slice(0, -6));
        if (!sessionId) return null;
        let filePath = join(projectsDir, name);
        if (!includeMtime)
          return {
            sessionId,
            filePath,
            mtime: 0,
            projectPath,
            ownWorktrees,
          };
        try {
          let fileStats = await stat(filePath);
          return {
            sessionId,
            filePath,
            mtime: fileStats.mtime.getTime(),
            projectPath,
            ownWorktrees,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((candidate) => candidate !== null);
}
//@ chunk-csvcrjg7.js:1662-1671 layout
var CANDIDATE_READ_CONCURRENCY = 32;
//@ chunk-csvcrjg7.js:1671-2014 callgraph-fingerprint (2.1.88 match: readCandidate, 0.24)
/**
 * 读取候选会话文件头尾，提取摘要信息（标题、首条提示、cwd、分支）。
 */
async function readCandidate(projectsDir, sessionId, storage) {
  let candidates = await listCandidates(projectsDir, false, undefined, storage);
  for (let offset = 0; offset < candidates.length; offset += CANDIDATE_READ_CONCURRENCY) {
    let found = (
      await Promise.all(
        candidates.slice(offset, offset + CANDIDATE_READ_CONCURRENCY).map(async (candidate) => {
          let sessionLite = await readSessionLite(
            candidate.filePath,
            wrapStorageSource(getTranscriptStorageKey(candidate.filePath, storage)),
          );
          return sessionLite !== null &&
            findContinuedInSessionId(sessionLite.tail) === sessionId &&
            (await transcriptMayContainMarker(
              candidate.filePath,
              sessionLite.head,
              sessionLite.tail,
              sessionLite.size,
              storage,
            ))
            ? candidate.filePath
            : undefined;
        }),
      )
    ).find((foundPath) => foundPath !== undefined);
    if (found !== undefined) return found;
  }
  return;
}
//@ chunk-xmpe3wef.js:17962-18047 fingerprint (2.1.88 match: listSessionsImpl, 0.816)
/**
 * SDK listSessions 实现：扫描项目目录候选会话文件并读取 lite 信息。
 */
function listSessionsImpl(entry, timestamp) {
  return {
    content: stripBomAndCarriageReturn(entry.content),
    timestamp,
    offset: undefined,
    limit: undefined,
  };
}
export { gatherAllCandidates, listCandidates, readCandidate, listSessionsImpl };
