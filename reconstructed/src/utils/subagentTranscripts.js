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
function subagentPathParts(filePath) {
  let relativePath = relative(getProjectsDir(), filePath);
  if (
    relativePath === "" ||
    relativePath.startsWith(`..${sep}`) ||
    relativePath === ".." ||
    isAbsolute(relativePath)
  )
    return null;
  let parts = relativePath.split(sep);
  return parts.length < 4 || parts[2] !== "subagents" ? null : parts;
}
//@ chunk-51xseqzx.js:689-967 placement
/**
 * 由子代理转录文件路径（.../agent-<id>.jsonl）推出存储键，路径格式不符时返回 null。
 */
function subagentTranscriptKey(filePath) {
  let parts = subagentPathParts(filePath);
  let last = parts?.at(-1);
  if (!parts || !last?.startsWith("agent-") || !last.endsWith(".jsonl")) return null;
  let sliced = last.slice(6, -6);
  let sliced_2 = parts.slice(3, -1);
  if (
    !areValidKeySegments([parts[0], parts[1], sliced]) ||
    (sliced_2.length > 0 && !areValidKeySegments(sliced_2))
  )
    return null;
  let key = STORAGE_SPACES.transcript(parts[0], parts[1], sliced, sliced_2.length > 0 ? sliced_2 : undefined);
  return validateStorageKey(key) === undefined ? key : null;
}
//@ chunk-51xseqzx.js:967-1418 placement
async function listSubagentTranscripts(rootDir, store, { rejectUnlistable: throwOnIncomplete = false } = {}) {
  let scope = isStorageV5Enabled() && store !== undefined ? subagentsScopeForDir(rootDir) : null;
  if (store !== undefined && scope !== null)
    return listSubagentTranscripts_2(store, scope, rootDir, MAX_SUBAGENT_TRANSCRIPT_PAGES, throwOnIncomplete);
  let found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch (error) {
      if (throwOnIncomplete && !isENOENT(error)) throw error;
      return;
    }
    for (let entry of entries)
      if (entry.isFile() && entry.name.startsWith("agent-") && entry.name.endsWith(".jsonl")) {
        let agentId = entry.name.slice(6, -6);
        found.push({
          agentId,
          filePath: join(dir, entry.name),
        });
      } else if (entry.isDirectory()) await walk(join(dir, entry.name));
  }
  await walk(rootDir);
  return found;
}
//@ chunk-51xseqzx.js:1418-1675 placement
function subagentsScopeForDir(dir) {
  let relativePath = relative(getProjectsDir(), dir);
  if (relativePath === "" || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) return null;
  let parts = relativePath.split(sep);
  if (parts.length !== 3 || parts[2] !== "subagents" || !areValidKeySegments([parts[0], parts[1]]))
    return null;
  let scope = {
    namespace: "transcript",
    projectKey: parts[0],
    sessionId: parts[1],
  };
  return validateStorageScope(scope) === undefined ? scope : null;
}
//@ chunk-51xseqzx.js:1675-1685 placement
var MAX_SUBAGENT_TRANSCRIPT_PAGES = 1e4;
//@ chunk-51xseqzx.js:1685-2605 placement
/**
 * 在存储 v5 中遍历某会话 transcript 作用域（含嵌套 agentRelPath）列出全部子代理转录，返回 {agentId, filePath}；超出页数上限或未读完时抛错或返回空（取决于 o）。
 */
async function listSubagentTranscripts_2(store, scope, subagentsDir, maxPages, throwOnIncomplete) {
  let found = [];
  let pendingScopes = [scope];
  let seenDirs = new Set([""]);
  let pageCount = 0;
  try {
    while (pendingScopes.length > 0) {
      if (++pageCount > maxPages) throw Error("sub-agent listing incomplete");
      let currentScope = pendingScopes.shift();
      let childScopes = [];
      if (
        (
          await readAllPages(
            (cursor) =>
              store.listEntries(currentScope, {
                skipKeyStats: true,
                skipScopeStats: true,
                ...(cursor !== undefined && {
                  cursor,
                }),
              }),
            (entries) => {
              for (let entry of entries)
                if (
                  entry.kind === "key" &&
                  entry.key.namespace === "transcript" &&
                  entry.key.agentId !== undefined &&
                  isValidKeySegment(entry.key.agentId) &&
                  (entry.key.agentRelPath === undefined || areValidKeySegments(entry.key.agentRelPath))
                )
                  found.push({
                    agentId: entry.key.agentId,
                    filePath: join(
                      subagentsDir,
                      ...(entry.key.agentRelPath ?? []),
                      `agent-${entry.key.agentId}.jsonl`,
                    ),
                  });
                else if (
                  entry.kind === "scope" &&
                  entry.scope.namespace === "transcript" &&
                  entry.scope.agentRelPath !== undefined &&
                  areValidKeySegments(entry.scope.agentRelPath) &&
                  !seenDirs.has(entry.scope.agentRelPath.join("/"))
                ) {
                  let childScope = {
                    ...scope,
                    agentRelPath: entry.scope.agentRelPath,
                  };
                  if (validateStorageScope(childScope) === undefined) {
                    seenDirs.add(entry.scope.agentRelPath.join("/"));
                    childScopes.push(childScope);
                  }
                }
            },
          )
        ).status !== "done"
      )
        throw Error("sub-agent listing incomplete");
      pendingScopes.unshift(...childScopes);
    }
  } catch (error) {
    if (throwOnIncomplete) throw error;
    return [];
  }
  return found;
}
export { subagentTranscriptKey, listSubagentTranscripts };
