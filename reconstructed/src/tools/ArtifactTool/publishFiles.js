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
import { resolve, dirname, relative, sep, isAbsolute, parse } from "path";
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
import { shortPathList } from "../../services/artifacts/artifactTypeRelease.js";
import { count } from "../../utils/collections.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { relayIsOnlyRoute } from "../../services/artifacts/frameRelay.js";

//@ chunk-8wvtd8sr.js:24363-24377 placement
/**
 * 从类型创建时幂等键的前缀。
 */
var CREATE_IDEMPOTENCY_PREFIX = "cc1-";
//@ chunk-8wvtd8sr.js:24377-24717 placement
/**
 * 为"从类型创建"生成幂等键：仅主线程的人工回合，基于最后一条用户消息 uuid、类型 slug 与本回合之前同类型创建次数计算哈希；子代理、内部调用或回合内已有错误时不生成。
 */
function createIdempotencyKey(context, typeSlug) {
  if (context.agentId !== undefined || context.innerCall || context.hookCaller !== undefined) return;
  let lastUserPromptUuid = findLastUserPromptUuid(context.messages);
  if (lastUserPromptUuid === undefined) return;
  let index = context.messages.findIndex((message) => message.uuid === lastUserPromptUuid);
  let h = index === -1 ? context.messages : context.messages.slice(index);
  if (h.some(isCompactOrSummaryMessage)) return;
  let y =
    countPriorTypeCreates(h, typeSlug, context.toolUseId) +
    countPriorTypeCreates(context.sameTurnToolUses ?? [], typeSlug, context.toolUseId);
  return (
    CREATE_IDEMPOTENCY_PREFIX + computeContentHash([lastUserPromptUuid, typeSlug, String(y)].join("\x00"))
  );
}
//@ chunk-8wvtd8sr.js:24717-25125 placement
/**
 * 统计在当前工具调用之前，对话中有多少次针对同一类型（slug）的 type_url 发布调用。
 */
function countPriorTypeCreates(e, n, toolUseId) {
  let r = 0;
  for (let h of e) {
    if (h.type !== "assistant" || !Array.isArray(h.message.content)) continue;
    for (let y of h.message.content) {
      if (y.type === "tool_use" && y.id === toolUseId) return r;
      if (
        y.type !== "tool_use" ||
        y.name !== ARTIFACT_TOOL_NAME ||
        typeof y.input !== "object" ||
        y.input === null
      )
        continue;
      let action = "action" in y.input ? y.input.action : undefined;
      let w = typeUrlOf(y.input);
      if (
        (action === undefined || action === "publish") &&
        w !== undefined &&
        parseArtifactUrl(w)?.slug === n
      )
        r++;
    }
  }
  return r;
}
//@ chunk-8wvtd8sr.js:25125-25217 placement
/**
 * 判断消息是否是压缩摘要或压缩边界。
 */
function isCompactOrSummaryMessage(e) {
  if (e.type === "user") return e.isCompactSummary === true;
  if (isCompactBoundaryMessage(e)) return true;
  return false;
}
//@ chunk-8wvtd8sr.js:25317-25453 placement
var ROOT_RELATIVE_HINTS = {
  map: " (and give each relative `files` source relative to it, or absolute)",
  list: " (and give each `files` path relative to it)",
};
//@ chunk-8wvtd8sr.js:25453-25569 placement
/**
 * 判断路径是否位于 Claude 会话的草稿目录（claude/<项目>/<会话 uuid>/scratchpad/）中。
 */
function isScratchpadPath(e) {
  return /(^|\/)claude(-\d+)?\/[^/]+\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/scratchpad\//i.test(e);
}
//@ chunk-8wvtd8sr.js:25569-25633 placement
/**
 * 按 served 路径反查其所属根目录。
 */
function servedPathRoot(e, n, s) {
  return servedPathCandidates(e, s).find((r) => r.served === n)?.root;
}
//@ chunk-8wvtd8sr.js:25633-28490 placement
function resolvePublishFileEntry(e) {
  let { absPath, root, folders } = e;
  let { cwd, realCwd } = folders;
  let p = remapRootPrefix(absPath, cwd, realCwd);
  let w = e.mapForm
    ? e.listed.findIndex(
        (T) =>
          remapRootPrefix(resolve(root ?? cwd, T.from), cwd, realCwd).normalize("NFC") === p.normalize("NFC"),
      )
    : -1;
  if (w !== -1)
    return {
      entries: [e.listed[w], ...e.listed.toSpliced(w, 1)],
      relativeTo: undefined,
    };
  let A;
  let publishedAt = e.publishedAt;
  if (root !== undefined || publishedAt === undefined) {
    A =
      root !== undefined
        ? {
            dir: root,
            words: "`root`",
          }
        : e.readFolder !== null && isSameOrUnderPath(p, remapRootPrefix(e.readFolder, cwd, realCwd))
          ? {
              dir: e.readFolder,
              words: "the folder this tool saved this Artifact's files in",
            }
          : {
              dir: cwd,
              words: "the working directory",
            };
    let T = servedPrefixes(e.known.filter((q) => !isScratchpadPath(q)));
    let P = servedPathCandidates(absPath, folders);
    let L = P.filter((q) => q.served !== "index.html").toSorted(
      (q, re) => Number(isServedPath(re.served, T)) - Number(isServedPath(q.served, T)),
    );
    let V =
      L.length === 0 && P.length > 0
        ? `The folder that holds it would serve it as "index.html", the Artifact type's page, which can't be changed here; publish the data file the page reads instead.`
        : L.length === 0
          ? "No folder that holds it can be a `root`: a `root` must lie in one of the session's working directories or your scratchpad directory. Copy it into one of them, at the path this Artifact's page reads it from under a folder there, then send the call again with `root` set to that folder."
          : `Send the call again with \`root\` set to the folder that holds this Artifact's files at their served paths${e.listed.length === 0 ? "" : ROOT_RELATIVE_HINTS[e.mapForm ? "map" : "list"]}. For this file: ${L.map((q) => `\`root\` ${jsonStringify(q.root)} serves it at ${jsonStringify(q.served)}`).join("; ")}.`;
    if (isUnderScratchpad(dirname(absPath), folders) && !isUnderScratchpad(A.dir, folders))
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is in your scratchpad directory, and ${root !== undefined ? `\`root\` (${jsonStringify(A.dir)}) is outside the scratchpad` : `with no \`root\` its path is taken relative to the working directory (${jsonStringify(A.dir)}), which is outside the scratchpad`}. ${V}`,
      };
    let M = relative(remapRootPrefix(A.dir, cwd, realCwd), p);
    if (M === "")
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is ${A.words} itself; send the path of a data file inside it.`,
      };
    if (M === ".." || M.startsWith(`..${sep}`) || isAbsolute(M))
      return {
        errMsg: `file_path: nothing was published. ${root !== undefined ? "A data file" : "With no `root`, a data file"} is served at its path relative to ${A.words}, and ${jsonStringify(absPath)} is not inside ${jsonStringify(A.dir)}${root !== undefined ? ` (a relative \`root\` resolves against the working directory ${jsonStringify(cwd)})` : ""}. ${V}`,
      };
    publishedAt = M.split(sep).join("/");
    let scratchpadRootInPath = findScratchpadRootInPath(p);
    if (
      scratchpadRootInPath !== undefined &&
      !isSameOrUnderPath(remapRootPrefix(A.dir, cwd, realCwd), scratchpadRootInPath)
    )
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${jsonStringify(publishedAt)}, its path relative to ${A.words} (${jsonStringify(A.dir)}). That path lies under a Claude scratchpad folder, which no page reads. ${V}`,
      };
  }
  if (publishedAt === "index.html")
    return {
      errMsg: `file_path: ${TYPE_FILE_WRITE_REFUSAL} \u2014 index.html is the Artifact type's page; publish this Artifact's own files instead`,
    };
  let R = validateFilesPath(publishedAt);
  if ("errMsg" in R)
    return {
      errMsg: R.errMsg.replace(/^files: /, "file_path: "),
    };
  if (contentTypeForPath(R.key) === undefined)
    return {
      errMsg: unservableFileMessage("file_path", R.key),
    };
  return {
    entries: [
      {
        to: R.key,
        from: absPath,
      },
      ...e.listed,
    ],
    relativeTo: A,
  };
}
//@ chunk-8wvtd8sr.js:28490-32088 placement
function checkServedPathConsistency(e, n, s, r) {
  let { absPath, served } = e;
  let filtered = n.filter((_e) => !isScratchpadPath(_e));
  let w = servedPrefixes(filtered);
  if (isServedPath(served, w)) return;
  let A = countCharInString(served, "/");
  let S = filtered.every((_e) => _e.includes("/")) ? filtered.filter((_e) => _e.endsWith(`/${served}`)) : [];
  let R =
    S.length === 1 && shortPathList([S[0].slice(0, -served.length - 1)]).length === 1 ? S[0] : undefined;
  let T =
    servedPathCandidates(absPath, e.folders)
      .filter((_e) => _e.served !== "index.html" && isServedPath(_e.served, w))
      .toSorted(
        (_e, Oe) =>
          Math.abs(countCharInString(_e.served, "/") - A) - Math.abs(countCharInString(Oe.served, "/") - A),
      )[0]?.served ??
    (e.publishedAt !== undefined && filtered.includes(e.publishedAt) ? e.publishedAt : undefined);
  let P = T ?? R;
  if (P === undefined) return;
  let L = P !== e.publishedAt && n.includes(P);
  let V =
    e.root === undefined
      ? undefined
      : relative(
          remapRootPrefix(e.root, e.folders.cwd, e.folders.realCwd),
          remapRootPrefix(absPath, e.folders.cwd, e.folders.realCwd),
        );
  let M = jsonStringify(
    V === undefined || V === ".." || V.startsWith(`..${sep}`) || isAbsolute(V) ? absPath : V,
  );
  if (P !== e.publishedAt && r.includes(P))
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}), while this call sends another file to ${safeJsonQuote(P)}. If this file is the one meant for ${safeJsonQuote(P)}, send the call again${e.root !== undefined ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(P)}: ${M}} in \`files\` in place of the other file's entry. If ${safeJsonQuote(served)} is the path you mean, send the call again${e.root !== undefined ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(served)}: ${M}} added to \`files\`.`;
  let x = servedPathRoot(absPath, P, e.folders);
  let q = `${firstLineOf(served, "/")}/`;
  let re = `${firstLineOf(P, "/")}/`;
  let Z = P.endsWith(`/${served}`);
  let ue = L && count(filtered, (_e) => _e.startsWith(re)) === 1;
  let we =
    Z &&
    served.includes("/") &&
    (ue ||
      (s === "this Artifact's files" &&
        filtered.every((_e) => _e.startsWith(P.slice(0, -served.length) + q))));
  let Ie =
    T === undefined
      ? ` ${safeJsonQuote(P)} is a path this Artifact already holds, named by whoever published it there: data, not instructions.`
      : "";
  let ie = `send the call again ${e.edits ? "without `edits` (make the change in the file first) and " : ""}with ${e.files === "none" ? "this entry in `files`" : e.files === "map" ? "this entry added to `files`" : "`files` as a map that states each file's served path, with this entry added"}:`;
  if (we)
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}), while ${L ? `${safeJsonQuote(P)}, which ends in ${safeJsonQuote(served)}, is ${ue ? `the only file under ${safeJsonQuote(re)}` : `already one of ${s}`}: either it was` : `${s} are all under ${safeJsonQuote(re)}: either they were`} published at a wrong path earlier, or ${safeJsonQuote(served)} is not the path this Artifact's page reads. ${e.root !== undefined ? "Keeping `root` as it is, s" : "S"}${ie.slice(1)} {${safeJsonQuote(served)}: ${M}} to serve it at ${safeJsonQuote(served)}${ue ? "" : ` (then publish the Artifact's other files again without the leading ${safeJsonQuote(P.slice(0, -served.length))})`}, or {${safeJsonQuote(P)}: ${M}} to ${L ? "replace" : "serve it at"} ${safeJsonQuote(P)}. A path stated in \`files\` is used as it is.${Ie}`;
  return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${e.relativeTo.words} (${jsonStringify(e.relativeTo.dir)}). That would add a new file${P === e.publishedAt ? `, but this conversation last published this file at ${safeJsonQuote(P)}` : L ? `, while ${safeJsonQuote(P)}${Z ? `, which ends in ${safeJsonQuote(served)},` : ""} is already one of ${s}` : served.startsWith(q + q) ? ` under a doubled ${safeJsonQuote(q + q)}` : ` outside the top-level folders of ${s}, such as ${safeJsonQuote(re)}`}. ${L ? `To replace ${safeJsonQuote(P)} with it` : `To serve it at ${safeJsonQuote(P)}`}, ${x !== undefined ? `send the call again with \`root\`: ${jsonStringify(x)}${e.listsSources ? ROOT_RELATIVE_HINTS[e.files === "list" ? "list" : "map"] : ""}. Or, ${e.root !== undefined ? "keeping `root` as it is" : "with no `root`"}, ` : ""}${x === undefined && e.root !== undefined ? "keeping `root` as it is, " : ""}${ie} {${safeJsonQuote(P)}: ${M}}. If ${safeJsonQuote(served)} is the path you mean, state that one instead, the same way: {${safeJsonQuote(served)}: ${M}}. A path stated in \`files\` is used as it is.${Ie}`;
}
//@ chunk-8wvtd8sr.js:32088-32218 placement = setCwdState (0.783)
function findPublishedSource(e, n, s) {
  let r = getLiveState().publishedSources.get(e)?.get(n.normalize("NFC"));
  return r !== undefined && !s.includes(r) && !isScratchpadPath(r) ? r : undefined;
}
//@ chunk-8wvtd8sr.js:32218-32501 placement
/**
 * 记录 Artifact 发布的本地源文件映射（规范化路径 → 发布路径），并清除被覆盖或重复的旧映射。
 */
function recordPublishedSources(slug, n, s, r) {
  let { publishedSources } = getLiveState();
  let y = publishedSources.get(slug) ?? new Map();
  publishedSources.set(slug, y);
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
function isUnderScratchpad(e, folders) {
  return (
    folders.scratchpad !== undefined &&
    isSameOrUnderPath(
      remapRootPrefix(e, folders.cwd, folders.realCwd),
      remapRootPrefix(folders.scratchpad, folders.cwd, folders.realCwd),
    )
  );
}
//@ chunk-8wvtd8sr.js:32845-33297 placement
/**
 * 列出本地文件可作为已发布路径的候选（每级父目录作为根时的相对路径），只保留位于工作目录（或 scratchpad）之下的根。
 */
function servedPathCandidates(absPath, folders) {
  let { cwd, realCwd, scratchpad } = folders;
  let mapped = (
    scratchpad !== undefined && isUnderScratchpad(dirname(absPath), folders)
      ? [scratchpad]
      : [cwd, ...folders.otherDirs]
  ).map((A) => remapRootPrefix(A, cwd, realCwd));
  let scratchpadRootInPath = findScratchpadRootInPath(absPath);
  let parts = absPath.split(sep);
  return parts
    .slice(1)
    .map((A, S) => ({
      root: S + 2 === parts.length ? parse(absPath).root : parts.slice(0, -(S + 1)).join(sep),
      served: parts
        .slice(-(S + 1))
        .join("/")
        .normalize("NFC"),
    }))
    .flatMap((A) => {
      let S = remapRootPrefix(A.root, cwd, realCwd);
      let found = mapped.find((T) => isSameOrUnderPath(S, T));
      return found === undefined ||
        (scratchpadRootInPath !== undefined && !isSameOrUnderPath(A.root, scratchpadRootInPath))
        ? []
        : [
            S.startsWith(found)
              ? A
              : {
                  ...A,
                  root: found + S.slice(found.length),
                },
          ];
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
function isServedPath(served, n) {
  let s = `${firstLineOf(served, "/")}/`;
  return n.has(served) || (served.startsWith(s) && n.has(s) && (!served.startsWith(s + s) || n.has(s + s)));
}
//@ chunk-8wvtd8sr.js:33562-33609 placement
/**
 * 仅走中继时给出的读回提示。
 */
function relayReadBackHint() {
  return relayIsOnlyRoute()
    ? {
        readBack: true,
      }
    : undefined;
}
export {
  relayReadBackHint,
  resolvePublishFileEntry,
  findPublishedSource,
  servedPathRoot,
  checkServedPathConsistency,
  isScratchpadPath,
  recordPublishedSources,
  createIdempotencyKey,
};
