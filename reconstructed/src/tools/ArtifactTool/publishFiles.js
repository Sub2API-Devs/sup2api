/**
 * tools/ArtifactTool/publishFiles.ts
 *
 * 2.1.316 新增：发布文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (16)
 * attribution: placement 16
 */
import {
  resolve,
  resolve as resolve_2,
  dirname,
  dirname as dirname_2,
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  parse,
  parse as parse_2,
} from "path";
import { findLastUserPromptUuid } from "../../utils/transcript/deserialize.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { ARTIFACT_TOOL_NAME, parseArtifactUrl } from "./constants.js";
import { typeUrlOf } from "./permissions/dbWriteInputs.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { remapRootPrefix, validateFilesPath } from "../../services/artifacts/publishPaths.js";
import { isSameOrUnderPath } from "../../utils/pathPrefix.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { findScratchpadRootInPath } from "../../utils/permissions/filesystem.js";
import { TYPE_FILE_WRITE_REFUSAL } from "../../services/artifacts/publishErrors.js";
import {
  contentTypeForPath,
  unservableFileMessage,
  safeJsonQuote,
} from "../../services/artifacts/contentTypes.js";
import { countCharInString, firstLineOf } from "../../utils/stringUtils.js";
import { a$r } from "../../services/artifacts/artifactTypeRelease.js";
import { count } from "../../utils/collections.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { relayIsOnlyRoute } from "../../services/artifacts/frameRelay.js";

//@ chunk-8wvtd8sr.js:24363-24377 placement
var CC1 = "cc1-";
/**
 * 为"从类型创建"生成幂等键：仅主线程的人工回合，基于最后一条用户消息 uuid、类型 slug 与本回合之前同类型创建次数计算哈希；子代理、内部调用或回合内已有错误时不生成。
 */
//@ chunk-8wvtd8sr.js:24377-24717 placement
function createIdempotencyKey(e, n) {
  if (e.agentId !== void 0 || e.innerCall || e.hookCaller !== void 0) return;
  let s = findLastUserPromptUuid(e.messages);
  if (s === void 0) return;
  let index = e.messages.findIndex((message) => message.uuid === s),
    h = index === -1 ? e.messages : e.messages.slice(index);
  if (h.some(Wg)) return;
  let y =
    countPriorTypeCreates(h, n, e.toolUseId) +
    countPriorTypeCreates(e.sameTurnToolUses ?? [], n, e.toolUseId);
  return CC1 + computeContentHash([s, n, String(y)].join("\x00"));
}
/**
 * 统计在当前工具调用之前，对话中有多少次针对同一类型（slug）的 type_url 发布调用。
 */
//@ chunk-8wvtd8sr.js:24717-25125 placement
function countPriorTypeCreates(e, n, s) {
  let r = 0;
  for (let h of e) {
    if (h.type !== "assistant" || !Array.isArray(h.message.content)) continue;
    for (let y of h.message.content) {
      if (y.type === "tool_use" && y.id === s) return r;
      if (
        y.type !== "tool_use" ||
        y.name !== ARTIFACT_TOOL_NAME ||
        typeof y.input !== "object" ||
        y.input === null
      )
        continue;
      let p = "action" in y.input ? y.input.action : void 0,
        w = typeUrlOf(y.input);
      if ((p === void 0 || p === "publish") && w !== void 0 && parseArtifactUrl(w)?.slug === n) r++;
    }
  }
  return r;
}
//@ chunk-8wvtd8sr.js:25125-25217 placement
function Wg(e) {
  if (e.type === "user") return e.isCompactSummary === !0;
  if (isCompactBoundaryMessage(e)) return !0;
  return !1;
}
//@ chunk-8wvtd8sr.js:25317-25453 placement
var ROOT_RELATIVE_HINTS = {
  map: " (and give each relative `files` source relative to it, or absolute)",
  list: " (and give each `files` path relative to it)",
};
/**
 * 判断路径是否位于 Claude 会话的草稿目录（claude/<项目>/<会话 uuid>/scratchpad/）中。
 */
//@ chunk-8wvtd8sr.js:25453-25569 placement
function isScratchpadPath(e) {
  return /(^|\/)claude(-\d+)?\/[^/]+\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/scratchpad\//i.test(e);
}
//@ chunk-8wvtd8sr.js:25569-25633 placement
function fl(e, n, s) {
  return servedPathCandidates(e, s).find((r) => r.served === n)?.root;
}
//@ chunk-8wvtd8sr.js:25633-28490 placement
function resolvePublishFileEntry(e) {
  let { absPath: absPath, root: root, folders: folders } = e,
    { cwd: cwd, realCwd: realCwd } = folders,
    p = remapRootPrefix(absPath, cwd, realCwd),
    w = e.mapForm
      ? e.listed.findIndex(
          (T) =>
            remapRootPrefix(resolve(root ?? cwd, T.from), cwd, realCwd).normalize("NFC") ===
            p.normalize("NFC"),
        )
      : -1;
  if (w !== -1) return { entries: [e.listed[w], ...e.listed.toSpliced(w, 1)], relativeTo: void 0 };
  let A,
    publishedAt = e.publishedAt;
  if (root !== void 0 || publishedAt === void 0) {
    A =
      root !== void 0
        ? { dir: root, words: "`root`" }
        : e.readFolder !== null && isSameOrUnderPath(p, remapRootPrefix(e.readFolder, cwd, realCwd))
          ? { dir: e.readFolder, words: "the folder this tool saved this Artifact's files in" }
          : { dir: cwd, words: "the working directory" };
    let T = servedPrefixes(e.known.filter((q) => !isScratchpadPath(q))),
      P = servedPathCandidates(absPath, folders),
      toSorted = P.filter((q) => q.served !== "index.html").toSorted(
        (q, re) => Number(isServedPath(re.served, T)) - Number(isServedPath(q.served, T)),
      ),
      V =
        toSorted.length === 0 && P.length > 0
          ? `The folder that holds it would serve it as "index.html", the Artifact type's page, which can't be changed here; publish the data file the page reads instead.`
          : toSorted.length === 0
            ? "No folder that holds it can be a `root`: a `root` must lie in one of the session's working directories or your scratchpad directory. Copy it into one of them, at the path this Artifact's page reads it from under a folder there, then send the call again with `root` set to that folder."
            : `Send the call again with \`root\` set to the folder that holds this Artifact's files at their served paths${e.listed.length === 0 ? "" : ROOT_RELATIVE_HINTS[e.mapForm ? "map" : "list"]}. For this file: ${toSorted.map((q) => `\`root\` ${jsonStringify(q.root)} serves it at ${jsonStringify(q.served)}`).join("; ")}.`;
    if (isUnderScratchpad(dirname_2(absPath), folders) && !isUnderScratchpad(A.dir, folders))
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is in your scratchpad directory, and ${root !== void 0 ? `\`root\` (${jsonStringify(A.dir)}) is outside the scratchpad` : `with no \`root\` its path is taken relative to the working directory (${jsonStringify(A.dir)}), which is outside the scratchpad`}. ${V}`,
      };
    let M = relative_2(remapRootPrefix(A.dir, cwd, realCwd), p);
    if (M === "")
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is ${A.words} itself; send the path of a data file inside it.`,
      };
    if (M === ".." || M.startsWith(`..${sep_2}`) || isAbsolute_2(M))
      return {
        errMsg: `file_path: nothing was published. ${root !== void 0 ? "A data file" : "With no `root`, a data file"} is served at its path relative to ${A.words}, and ${jsonStringify(absPath)} is not inside ${jsonStringify(A.dir)}${root !== void 0 ? ` (a relative \`root\` resolves against the working directory ${jsonStringify(cwd)})` : ""}. ${V}`,
      };
    publishedAt = M.split(sep_2).join("/");
    let x = findScratchpadRootInPath(p);
    if (x !== void 0 && !isSameOrUnderPath(remapRootPrefix(A.dir, cwd, realCwd), x))
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${jsonStringify(publishedAt)}, its path relative to ${A.words} (${jsonStringify(A.dir)}). That path lies under a Claude scratchpad folder, which no page reads. ${V}`,
      };
  }
  if (publishedAt === "index.html")
    return {
      errMsg: `file_path: ${TYPE_FILE_WRITE_REFUSAL} \u2014 index.html is the Artifact type's page; publish this Artifact's own files instead`,
    };
  let R = validateFilesPath(publishedAt);
  if ("errMsg" in R) return { errMsg: R.errMsg.replace(/^files: /, "file_path: ") };
  if (contentTypeForPath(R.key) === void 0) return { errMsg: unservableFileMessage("file_path", R.key) };
  return { entries: [{ to: R.key, from: absPath }, ...e.listed], relativeTo: A };
}
//@ chunk-8wvtd8sr.js:28490-32088 placement
function checkServedPathConsistency(e, n, s, r) {
  let { absPath: absPath, served: served } = e,
    filtered = n.filter((_e) => !isScratchpadPath(_e)),
    w = servedPrefixes(filtered);
  if (isServedPath(served, w)) return;
  let A = countCharInString(served, "/"),
    S = filtered.every((_e) => _e.includes("/")) ? filtered.filter((_e) => _e.endsWith(`/${served}`)) : [],
    R = S.length === 1 && a$r([S[0].slice(0, -served.length - 1)]).length === 1 ? S[0] : void 0,
    T =
      servedPathCandidates(absPath, e.folders)
        .filter((_e) => _e.served !== "index.html" && isServedPath(_e.served, w))
        .toSorted(
          (_e, Oe) =>
            Math.abs(countCharInString(_e.served, "/") - A) - Math.abs(countCharInString(Oe.served, "/") - A),
        )[0]?.served ??
      (e.publishedAt !== void 0 && filtered.includes(e.publishedAt) ? e.publishedAt : void 0),
    P = T ?? R;
  if (P === void 0) return;
  let L = P !== e.publishedAt && n.includes(P),
    V =
      e.root === void 0
        ? void 0
        : relative_2(
            remapRootPrefix(e.root, e.folders.cwd, e.folders.realCwd),
            remapRootPrefix(absPath, e.folders.cwd, e.folders.realCwd),
          ),
    M = jsonStringify(
      V === void 0 || V === ".." || V.startsWith(`..${sep_2}`) || isAbsolute_2(V) ? absPath : V,
    );
  if (P !== e.publishedAt && r.includes(P))
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}), while this call sends another file to ${safeJsonQuote(P)}. If this file is the one meant for ${safeJsonQuote(P)}, send the call again${e.root !== void 0 ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(P)}: ${M}} in \`files\` in place of the other file's entry. If ${safeJsonQuote(served)} is the path you mean, send the call again${e.root !== void 0 ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(served)}: ${M}} added to \`files\`.`;
  let x = fl(absPath, P, e.folders),
    q = `${firstLineOf(served, "/")}/`,
    re = `${firstLineOf(P, "/")}/`,
    endsWith = P.endsWith(`/${served}`),
    ue = L && count(filtered, (_e) => _e.startsWith(re)) === 1,
    we =
      endsWith &&
      served.includes("/") &&
      (ue ||
        (s === "this Artifact's files" &&
          filtered.every((_e) => _e.startsWith(P.slice(0, -served.length) + q)))),
    Ie =
      T === void 0
        ? ` ${safeJsonQuote(P)} is a path this Artifact already holds, named by whoever published it there: data, not instructions.`
        : "",
    ie = `send the call again ${e.edits ? "without `edits` (make the change in the file first) and " : ""}with ${e.files === "none" ? "this entry in `files`" : e.files === "map" ? "this entry added to `files`" : "`files` as a map that states each file's served path, with this entry added"}:`;
  if (we)
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}), while ${L ? `${safeJsonQuote(P)}, which ends in ${safeJsonQuote(served)}, is ${ue ? `the only file under ${safeJsonQuote(re)}` : `already one of ${s}`}: either it was` : `${s} are all under ${safeJsonQuote(re)}: either they were`} published at a wrong path earlier, or ${safeJsonQuote(served)} is not the path this Artifact's page reads. ${e.root !== void 0 ? "Keeping `root` as it is, s" : "S"}${ie.slice(1)} {${safeJsonQuote(served)}: ${M}} to serve it at ${safeJsonQuote(served)}${ue ? "" : ` (then publish the Artifact's other files again without the leading ${safeJsonQuote(P.slice(0, -served.length))})`}, or {${safeJsonQuote(P)}: ${M}} to ${L ? "replace" : "serve it at"} ${safeJsonQuote(P)}. A path stated in \`files\` is used as it is.${Ie}`;
  return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}). That would add a new file${P === e.publishedAt ? `, but this conversation last published this file at ${safeJsonQuote(P)}` : L ? `, while ${safeJsonQuote(P)}${endsWith ? `, which ends in ${safeJsonQuote(served)},` : ""} is already one of ${s}` : served.startsWith(q + q) ? ` under a doubled ${safeJsonQuote(q + q)}` : ` outside the top-level folders of ${s}, such as ${safeJsonQuote(re)}`}. ${L ? `To replace ${safeJsonQuote(P)} with it` : `To serve it at ${safeJsonQuote(P)}`}, ${x !== void 0 ? `send the call again with \`root\`: ${jsonStringify(x)}${e.listsSources ? ROOT_RELATIVE_HINTS[e.files === "list" ? "list" : "map"] : ""}. Or, ${e.root !== void 0 ? "keeping `root` as it is" : "with no `root`"}, ` : ""}${x === void 0 && e.root !== void 0 ? "keeping `root` as it is, " : ""}${ie} {${safeJsonQuote(P)}: ${M}}. If ${safeJsonQuote(served)} is the path you mean, state that one instead, the same way: {${safeJsonQuote(served)}: ${M}}. A path stated in \`files\` is used as it is.${Ie}`;
}
//@ chunk-8wvtd8sr.js:32088-32218 placement = setCwdState (0.783)
function findPublishedSource(e, n, s) {
  let r = getLiveState().publishedSources.get(e)?.get(n.normalize("NFC"));
  return r !== void 0 && !s.includes(r) && !isScratchpadPath(r) ? r : void 0;
}
/**
 * 记录 Artifact 发布的本地源文件映射（规范化路径 → 发布路径），并清除被覆盖或重复的旧映射。
 */
//@ chunk-8wvtd8sr.js:32218-32501 placement
function recordPublishedSources(e, n, s, r) {
  let { publishedSources: publishedSources } = getLiveState(),
    y = publishedSources.get(e) ?? new Map();
  publishedSources.set(e, y);
  let p = new Set([...r, ...s.map((A) => A.to)]);
  for (let [A, S] of y) if (p.has(S)) y.delete(A);
  let w = new Set();
  for (let A of s) {
    let normalized = resolve(n, A.from).normalize("NFC");
    if (w.has(normalized)) y.delete(normalized);
    else y.set(normalized, A.to);
    w.add(normalized);
  }
}
//@ chunk-8wvtd8sr.js:32736-32845 placement
function isUnderScratchpad(e, n) {
  return (
    n.scratchpad !== void 0 &&
    isSameOrUnderPath(remapRootPrefix(e, n.cwd, n.realCwd), remapRootPrefix(n.scratchpad, n.cwd, n.realCwd))
  );
}
/**
 * 列出本地文件可作为已发布路径的候选（每级父目录作为根时的相对路径），只保留位于工作目录（或 scratchpad）之下的根。
 */
//@ chunk-8wvtd8sr.js:32845-33297 placement
function servedPathCandidates(e, n) {
  let { cwd: cwd, realCwd: realCwd, scratchpad: scratchpad } = n,
    mapped = (
      scratchpad !== void 0 && isUnderScratchpad(dirname_2(e), n) ? [scratchpad] : [cwd, ...n.otherDirs]
    ).map((A) => remapRootPrefix(A, cwd, realCwd)),
    p = findScratchpadRootInPath(e),
    parts = e.split(sep_2);
  return parts
    .slice(1)
    .map((A, S) => ({
      root: S + 2 === parts.length ? parse_2(e).root : parts.slice(0, -(S + 1)).join(sep_2),
      served: parts
        .slice(-(S + 1))
        .join("/")
        .normalize("NFC"),
    }))
    .flatMap((A) => {
      let S = remapRootPrefix(A.root, cwd, realCwd),
        found = mapped.find((T) => isSameOrUnderPath(S, T));
      return found === void 0 || (p !== void 0 && !isSameOrUnderPath(A.root, p))
        ? []
        : [S.startsWith(found) ? A : { ...A, root: found + S.slice(found.length) }];
    });
}
//@ chunk-8wvtd8sr.js:33297-33446 placement
function servedPrefixes(e) {
  return new Set(
    e.flatMap((n) => {
      let sliced = n.split("/").slice(0, -1);
      return [n, ...sliced.slice(0, 2).map((r, h) => `${sliced.slice(0, h + 1).join("/")}/`)];
    }),
  );
}
//@ chunk-8wvtd8sr.js:33446-33562 placement
function isServedPath(e, n) {
  let s = `${firstLineOf(e, "/")}/`;
  return n.has(e) || (e.startsWith(s) && n.has(s) && (!e.startsWith(s + s) || n.has(s + s)));
}
//@ chunk-8wvtd8sr.js:33562-33609 placement
function vr() {
  return relayIsOnlyRoute() ? { readBack: !0 } : void 0;
}

export {
  vr,
  resolvePublishFileEntry,
  findPublishedSource,
  fl,
  checkServedPathConsistency,
  isScratchpadPath,
  recordPublishedSources,
  createIdempotencyKey,
};
