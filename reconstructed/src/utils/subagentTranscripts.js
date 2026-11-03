/**
 * utils/subagentTranscripts.ts
 *
 * 2.1.316 新增。子代理转录列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-51xseqzx.js (6)
 * attribution: placement 6
 */
import { relative, sep, isAbsolute, join } from "path";
import { readdir } from "fs/promises";
import { getProjectsDir } from "./sessionStoragePortable.js";
import { areValidKeySegments, STORAGE_SPACES, isValidKeySegment } from "./storage/storageSpaces.js";
import { validateStorageKey, validateStorageScope } from "./storage/storageKeys.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { isENOENT } from "./errors.js";
import { readAllPages } from "./pagedRead.js";

//@ chunk-51xseqzx.js:535-689 placement
function subagentPathParts(i) {
  let e = relative(getProjectsDir(), i);
  if (e === "" || e.startsWith(`..${sep}`) || e === ".." || isAbsolute(e)) return null;
  let parts = e.split(sep);
  return parts.length < 4 || parts[2] !== "subagents" ? null : parts;
}
//@ chunk-51xseqzx.js:689-967 placement
/**
 * 由子代理转录文件路径（.../agent-<id>.jsonl）推出存储键，路径格式不符时返回 null。
 */
function subagentTranscriptKey(filePath) {
  let e = subagentPathParts(filePath);
  let last = e?.at(-1);
  if (!e || !last?.startsWith("agent-") || !last.endsWith(".jsonl")) return null;
  let sliced = last.slice(6, -6);
  let sliced_2 = e.slice(3, -1);
  if (!areValidKeySegments([e[0], e[1], sliced]) || (sliced_2.length > 0 && !areValidKeySegments(sliced_2)))
    return null;
  let a = STORAGE_SPACES.transcript(e[0], e[1], sliced, sliced_2.length > 0 ? sliced_2 : undefined);
  return validateStorageKey(a) === undefined ? a : null;
}
//@ chunk-51xseqzx.js:967-1418 placement
async function listSubagentTranscripts(
  subagentsDir,
  store,
  { rejectUnlistable: throwOnIncomplete = false } = {},
) {
  let scope = isStorageV5Enabled() && store !== undefined ? subagentsScopeForDir(subagentsDir) : null;
  if (store !== undefined && scope !== null)
    return listSubagentTranscripts_2(
      store,
      scope,
      subagentsDir,
      MAX_SUBAGENT_TRANSCRIPT_PAGES,
      throwOnIncomplete,
    );
  let o = [];
  async function a(u) {
    let d;
    try {
      d = await readdir(u, {
        withFileTypes: true,
      });
    } catch (error) {
      if (throwOnIncomplete && !isENOENT(error)) throw error;
      return;
    }
    for (let s of d)
      if (s.isFile() && s.name.startsWith("agent-") && s.name.endsWith(".jsonl")) {
        let agentId = s.name.slice(6, -6);
        o.push({
          agentId,
          filePath: join(u, s.name),
        });
      } else if (s.isDirectory()) await a(join(u, s.name));
  }
  await a(subagentsDir);
  return o;
}
//@ chunk-51xseqzx.js:1418-1675 placement
function subagentsScopeForDir(i) {
  let e = relative(getProjectsDir(), i);
  if (e === "" || e.startsWith(`..${sep}`) || isAbsolute(e)) return null;
  let parts = e.split(sep);
  if (parts.length !== 3 || parts[2] !== "subagents" || !areValidKeySegments([parts[0], parts[1]]))
    return null;
  let r = {
    namespace: "transcript",
    projectKey: parts[0],
    sessionId: parts[1],
  };
  return validateStorageScope(r) === undefined ? r : null;
}
//@ chunk-51xseqzx.js:1675-1685 placement
var MAX_SUBAGENT_TRANSCRIPT_PAGES = 1e4;
//@ chunk-51xseqzx.js:1685-2605 placement
/**
 * 在存储 v5 中遍历某会话 transcript 作用域（含嵌套 agentRelPath）列出全部子代理转录，返回 {agentId, filePath}；超出页数上限或未读完时抛错或返回空（取决于 o）。
 */
async function listSubagentTranscripts_2(store, scope, subagentsDir, maxPages, throwOnIncomplete) {
  let a = [];
  let u = [scope];
  let d = new Set([""]);
  let s = 0;
  try {
    while (u.length > 0) {
      if (++s > maxPages) throw Error("sub-agent listing incomplete");
      let c = u.shift();
      let m = [];
      if (
        (
          await readAllPages(
            (l) =>
              store.listEntries(c, {
                skipKeyStats: true,
                skipScopeStats: true,
                ...(l !== undefined && {
                  cursor: l,
                }),
              }),
            (l) => {
              for (let n of l)
                if (
                  n.kind === "key" &&
                  n.key.namespace === "transcript" &&
                  n.key.agentId !== undefined &&
                  isValidKeySegment(n.key.agentId) &&
                  (n.key.agentRelPath === undefined || areValidKeySegments(n.key.agentRelPath))
                )
                  a.push({
                    agentId: n.key.agentId,
                    filePath: join(
                      subagentsDir,
                      ...(n.key.agentRelPath ?? []),
                      `agent-${n.key.agentId}.jsonl`,
                    ),
                  });
                else if (
                  n.kind === "scope" &&
                  n.scope.namespace === "transcript" &&
                  n.scope.agentRelPath !== undefined &&
                  areValidKeySegments(n.scope.agentRelPath) &&
                  !d.has(n.scope.agentRelPath.join("/"))
                ) {
                  let g = {
                    ...scope,
                    agentRelPath: n.scope.agentRelPath,
                  };
                  if (validateStorageScope(g) === undefined) {
                    d.add(n.scope.agentRelPath.join("/"));
                    m.push(g);
                  }
                }
            },
          )
        ).status !== "done"
      )
        throw Error("sub-agent listing incomplete");
      u.unshift(...m);
    }
  } catch (error) {
    if (throwOnIncomplete) throw error;
    return [];
  }
  return a;
}
export { subagentTranscriptKey, listSubagentTranscripts };
