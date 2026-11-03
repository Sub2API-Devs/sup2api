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
import { uA, STORAGE_SPACES, isValidKeySegment } from "./storage/storageSpaces.js";
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
/**
 * 由子代理转录文件路径（.../agent-<id>.jsonl）推出存储键，路径格式不符时返回 null。
 */
//@ chunk-51xseqzx.js:689-967 placement
function subagentTranscriptKey(i) {
  let e = subagentPathParts(i),
    t = e?.at(-1);
  if (!e || !t?.startsWith("agent-") || !t.endsWith(".jsonl")) return null;
  let sliced = t.slice(6, -6),
    sliced_2 = e.slice(3, -1);
  if (!uA([e[0], e[1], sliced]) || (sliced_2.length > 0 && !uA(sliced_2))) return null;
  let transcript = STORAGE_SPACES.transcript(e[0], e[1], sliced, sliced_2.length > 0 ? sliced_2 : void 0);
  return validateStorageKey(transcript) === void 0 ? transcript : null;
}
//@ chunk-51xseqzx.js:967-1418 placement
async function listSubagentTranscripts(i, e, { rejectUnlistable: t = !1 } = {}) {
  let r = isStorageV5Enabled() && e !== void 0 ? subagentsScopeForDir(i) : null;
  if (e !== void 0 && r !== null) return listSubagentTranscripts_2(e, r, i, M, t);
  let o = [];
  async function a(u) {
    let d;
    try {
      d = await readdir(u, { withFileTypes: !0 });
    } catch (error) {
      if (t && !isENOENT(error)) throw error;
      return;
    }
    for (let s of d)
      if (s.isFile() && s.name.startsWith("agent-") && s.name.endsWith(".jsonl")) {
        let sliced = s.name.slice(6, -6);
        o.push({ agentId: sliced, filePath: join(u, s.name) });
      } else if (s.isDirectory()) await a(join(u, s.name));
  }
  return (await a(i), o);
}
//@ chunk-51xseqzx.js:1418-1675 placement
function subagentsScopeForDir(i) {
  let e = relative(getProjectsDir(), i);
  if (e === "" || e.startsWith(`..${sep}`) || isAbsolute(e)) return null;
  let parts = e.split(sep);
  if (parts.length !== 3 || parts[2] !== "subagents" || !uA([parts[0], parts[1]])) return null;
  let r = { namespace: "transcript", projectKey: parts[0], sessionId: parts[1] };
  return validateStorageScope(r) === void 0 ? r : null;
}
//@ chunk-51xseqzx.js:1675-1685 placement
var M = 1e4;
/**
 * 在存储 v5 中遍历某会话 transcript 作用域（含嵌套 agentRelPath）列出全部子代理转录，返回 {agentId, filePath}；超出页数上限或未读完时抛错或返回空（取决于 o）。
 */
//@ chunk-51xseqzx.js:1685-2605 placement
async function listSubagentTranscripts_2(store, scope, subagentsDir, maxPages, throwOnIncomplete) {
  let a = [],
    u = [scope],
    d = new Set([""]),
    s = 0;
  try {
    while (u.length > 0) {
      if (++s > maxPages) throw Error("sub-agent listing incomplete");
      let c = u.shift(),
        m = [];
      if (
        (
          await readAllPages(
            (l) =>
              store.listEntries(c, {
                skipKeyStats: !0,
                skipScopeStats: !0,
                ...(l !== void 0 && { cursor: l }),
              }),
            (l) => {
              for (let n of l)
                if (
                  n.kind === "key" &&
                  n.key.namespace === "transcript" &&
                  n.key.agentId !== void 0 &&
                  isValidKeySegment(n.key.agentId) &&
                  (n.key.agentRelPath === void 0 || uA(n.key.agentRelPath))
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
                  n.scope.agentRelPath !== void 0 &&
                  uA(n.scope.agentRelPath) &&
                  !d.has(n.scope.agentRelPath.join("/"))
                ) {
                  let g = { ...scope, agentRelPath: n.scope.agentRelPath };
                  if (validateStorageScope(g) === void 0) (d.add(n.scope.agentRelPath.join("/")), m.push(g));
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
