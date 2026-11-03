/**
 * utils/listSessionsImpl.ts
 *
 * SDK listSessions：扫描项目目录下会话 jsonl 并读取头尾摘要。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/listSessionsImpl.ts
 * pieces: chunk-19fynvg9.js (4), chunk-1bmxdqa0.js (1), chunk-6zvphrsz.js (1)
 * attribution: sole-consumer 1, fingerprint 3, layout 1, callgraph-fingerprint 1
 */
import { join, join as join_2, join as join_3 } from "path";
import { readdir, stat } from "fs/promises";
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
import { __ } from "./remoteFileState.js";
import { Ke } from "./autoUpdater.js";

//@ chunk-19fynvg9.js:545-605 sole-consumer
function getProjectKeyIfValid(s) {
  let e = getProjectKeyIfRepresentable(s);
  return e !== void 0 && isValidKeySegment(e) ? e : void 0;
}
/**
 * 列出某项目目录（或全部）下的 .jsonl 会话候选及 mtime。
 */
//@ chunk-19fynvg9.js:605-1662 fingerprint = listCandidates (0.444)
async function listCandidates(s, e, o, d, a, u) {
  let f = isStorageV5Enabled() && d !== void 0 ? getProjectKeyIfValid(s) : void 0;
  if (d !== void 0 && f !== void 0) {
    let i = new Map();
    try {
      await readAllPages(
        (r) =>
          d.listEntries(
            { namespace: "transcript", projectKey: f },
            { skipScopeStats: !0, ...(e ? {} : { skipKeyStats: !0 }), ...(r !== void 0 && { cursor: r }) },
          ),
        (r) => {
          for (let t of r) {
            if (t.kind !== "key" || t.key.namespace !== "transcript") continue;
            let l = validateUuid(t.key.sessionId);
            if (!l) continue;
            if (e && t.mtimeMs === void 0) continue;
            let m = e ? Math.trunc(t.mtimeMs ?? 0) : 0,
              p = i.get(l);
            if (p !== void 0) {
              if (m > p.mtime) p.mtime = m;
              continue;
            }
            i.set(l, {
              sessionId: l,
              filePath: join(s, `${t.key.sessionId}.jsonl`),
              mtime: m,
              projectPath: o,
              ownWorktrees: u,
            });
          }
        },
        a !== void 0 ? { budget: a } : void 0,
      );
    } catch {}
    return [...i.values()];
  }
  let names;
  try {
    names = await readdir(s);
  } catch {
    return [];
  }
  return (
    await Promise.all(
      names.map(async (name) => {
        if (!name.endsWith(".jsonl")) return null;
        let sessionId = validateUuid(name.slice(0, -6));
        if (!sessionId) return null;
        let filePath = join(s, name);
        if (!e)
          return { sessionId: sessionId, filePath: filePath, mtime: 0, projectPath: o, ownWorktrees: u };
        try {
          let l = await stat(filePath);
          return {
            sessionId: sessionId,
            filePath: filePath,
            mtime: l.mtime.getTime(),
            projectPath: o,
            ownWorktrees: u,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((i) => i !== null);
}
//@ chunk-19fynvg9.js:1662-1671 layout
var CANDIDATE_READ_CONCURRENCY = 32;
/**
 * 读取候选会话文件头尾，提取摘要信息（标题、首条提示、cwd、分支）。
 */
//@ chunk-19fynvg9.js:1671-2014 callgraph-fingerprint = readCandidate (0.239)
async function readCandidate(s, e, o) {
  let d = await listCandidates(s, !1, void 0, o);
  for (let a = 0; a < d.length; a += CANDIDATE_READ_CONCURRENCY) {
    let found = (
      await Promise.all(
        d.slice(a, a + CANDIDATE_READ_CONCURRENCY).map(async (n) => {
          let c = await readSessionLite(
            n.filePath,
            wrapStorageSource(getTranscriptStorageKey(n.filePath, o)),
          );
          return c !== null &&
            findContinuedInSessionId(c.tail) === e &&
            (await transcriptMayContainMarker(n.filePath, c.head, c.tail, c.size, o))
            ? n.filePath
            : void 0;
        }),
      )
    ).find((n) => n !== void 0);
    if (found !== void 0) return found;
  }
  return;
}
/**
 * SDK listSessions 实现：扫描项目目录候选会话文件并读取 lite 信息。
 */
//@ chunk-1bmxdqa0.js:16776-16861 fingerprint = listSessionsImpl (0.817)
function listSessionsImpl(o, l) {
  return { content: __(o.content), timestamp: l, offset: void 0, limit: void 0 };
}
//@ chunk-6zvphrsz.js:19666-19861 fingerprint = gatherAllCandidates (1)
async function gatherAllCandidates() {
  return (
    await Promise.all(
      Ke().map((r) =>
        readdir(r, { withFileTypes: !0 })
          .then((n) => n.filter((o) => o.isDirectory() && o.name.startsWith(".")).map((o) => join(r, o.name)))
          .catch(() => []),
      ),
    )
  ).flat();
}

export { listSessionsImpl, gatherAllCandidates, readCandidate, listCandidates };
