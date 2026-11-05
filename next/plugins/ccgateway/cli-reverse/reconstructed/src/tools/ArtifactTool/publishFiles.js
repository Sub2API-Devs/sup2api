/**
 * tools/ArtifactTool/publishFiles.ts
 *
 * 2.1.316 新增：发布文件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (17)
 * attribution: placement 16, layout 1
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
import { TYPE_FILE_WRITE_REFUSAL } from "../../services/artifacts/publishErrors.js";
import {
  contentTypeForPath,
  unservableFileMessage,
  safeJsonQuote,
} from "../../services/artifacts/contentTypes.js";
import { countCharInString, firstLineOf } from "../../utils/stringUtils.js";
import { shortPathList } from "../../services/artifacts/artifactTypeRelease.js";
import { countWhere } from "../../utils/collections.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { relayIsOnlyRoute } from "../../services/artifacts/frameRelay.js";

//@ chunk-xzmy9dn4.js:24674-24688 placement
/**
 * 从类型创建时幂等键的前缀。
 */
var CREATE_IDEMPOTENCY_PREFIX = "cc1-";
//@ chunk-xzmy9dn4.js:24688-25028 placement
/**
 * 为"从类型创建"生成幂等键：仅主线程的人工回合，基于最后一条用户消息 uuid、类型 slug 与本回合之前同类型创建次数计算哈希；子代理、内部调用或回合内已有错误时不生成。
 */
function createIdempotencyKey(context, typeSlug) {
  if (context.agentId !== undefined || context.innerCall || context.hookCaller !== undefined) return;
  let lastUserPromptUuid = findLastUserPromptUuid(context.messages);
  if (lastUserPromptUuid === undefined) return;
  let index = context.messages.findIndex((message) => message.uuid === lastUserPromptUuid);
  let fromLastPrompt = index === -1 ? context.messages : context.messages.slice(index);
  if (fromLastPrompt.some(isCompactOrSummaryMessage)) return;
  let priorCreates =
    countPriorTypeCreates(fromLastPrompt, typeSlug, context.toolUseId) +
    countPriorTypeCreates(context.sameTurnToolUses ?? [], typeSlug, context.toolUseId);
  return (
    CREATE_IDEMPOTENCY_PREFIX +
    computeContentHash([lastUserPromptUuid, typeSlug, String(priorCreates)].join("\x00"))
  );
}
//@ chunk-xzmy9dn4.js:25028-25436 placement
/**
 * 统计在当前工具调用之前，对话中有多少次针对同一类型（slug）的 type_url 发布调用。
 */
function countPriorTypeCreates(messages, typeSlug, toolUseId) {
  let count = 0;
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type === "tool_use" && block.id === toolUseId) return count;
      if (
        block.type !== "tool_use" ||
        block.name !== ARTIFACT_TOOL_NAME ||
        typeof block.input !== "object" ||
        block.input === null
      )
        continue;
      let action = "action" in block.input ? block.input.action : undefined;
      let typeUrl = typeUrlOf(block.input);
      if (
        (action === undefined || action === "publish") &&
        typeUrl !== undefined &&
        parseArtifactUrl(typeUrl)?.slug === typeSlug
      )
        count++;
    }
  }
  return count;
}
//@ chunk-xzmy9dn4.js:25436-25528 placement
/**
 * 判断消息是否是压缩摘要或压缩边界。
 */
function isCompactOrSummaryMessage(message) {
  if (message.type === "user") return message.isCompactSummary === true;
  if (isCompactBoundaryMessage(message)) return true;
  return false;
}
//@ chunk-xzmy9dn4.js:25628-25764 placement
var ROOT_RELATIVE_HINTS = {
  map: " (and give each relative `files` source relative to it, or absolute)",
  list: " (and give each `files` path relative to it)",
};
//@ chunk-xzmy9dn4.js:25764-25880 placement
/**
 * 判断路径是否位于 Claude 会话的草稿目录（claude/<项目>/<会话 uuid>/scratchpad/）中。
 */
function isScratchpadPath(path) {
  return /(^|\/)claude(-\d+)?\/[^/]+\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/scratchpad\//i.test(path);
}
//@ chunk-xzmy9dn4.js:25880-25944 placement
/**
 * 按 served 路径反查其所属根目录。
 */
function servedPathRoot(absPath, served, folders) {
  return servedPathCandidates(absPath, folders).find((candidate) => candidate.served === served)?.root;
}
//@ chunk-xzmy9dn4.js:25944-28799 placement
function resolvePublishFileEntry(request) {
  let { absPath, root, folders } = request;
  let { cwd, realCwd } = folders;
  let realAbsPath = remapRootPrefix(absPath, cwd, realCwd);
  let listedIndex = request.mapForm
    ? request.listed.findIndex(
        (listed) =>
          remapRootPrefix(resolve(root ?? cwd, listed.from), cwd, realCwd).normalize("NFC") ===
          realAbsPath.normalize("NFC"),
      )
    : -1;
  if (listedIndex !== -1)
    return {
      entries: [request.listed[listedIndex], ...request.listed.toSpliced(listedIndex, 1)],
      relativeTo: undefined,
    };
  let relativeTo;
  let publishedAt = request.publishedAt;
  if (root !== undefined || publishedAt === undefined) {
    relativeTo =
      root !== undefined
        ? {
            dir: root,
            words: "`root`",
          }
        : request.readFolder !== null &&
            isSameOrUnderPath(realAbsPath, remapRootPrefix(request.readFolder, cwd, realCwd))
          ? {
              dir: request.readFolder,
              words: "the folder this tool saved this Artifact's files in",
            }
          : {
              dir: cwd,
              words: "the working directory",
            };
    let knownPrefixes = servedPrefixes(request.known.filter((known) => !isScratchpadPath(known)));
    let candidates = servedPathCandidates(absPath, folders);
    let nonIndex = candidates
      .filter((candidate) => candidate.served !== "index.html")
      .toSorted(
        (left, right) =>
          Number(isServedPath(right.served, knownPrefixes)) -
          Number(isServedPath(left.served, knownPrefixes)),
      );
    let rootHint =
      nonIndex.length === 0 && candidates.length > 0
        ? `The folder that holds it would serve it as "index.html", the Artifact type's page, which can't be changed here; publish the data file the page reads instead.`
        : nonIndex.length === 0
          ? "No folder that holds it can be a `root`: a `root` must lie in one of the session's working directories or your scratchpad directory. Copy it into one of them, at the path this Artifact's page reads it from under a folder there, then send the call again with `root` set to that folder."
          : `Send the call again with \`root\` set to the folder that holds this Artifact's files at their served paths${request.listed.length === 0 ? "" : ROOT_RELATIVE_HINTS[request.mapForm ? "map" : "list"]}. For this file: ${nonIndex.map((candidate) => `\`root\` ${jsonStringify(candidate.root)} serves it at ${jsonStringify(candidate.served)}`).join("; ")}.`;
    if (isUnderScratchpad(dirname(absPath), folders) && !isUnderScratchpad(relativeTo.dir, folders))
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is in your scratchpad directory, and ${root !== undefined ? `\`root\` (${jsonStringify(relativeTo.dir)}) is outside the scratchpad` : `with no \`root\` its path is taken relative to the working directory (${jsonStringify(relativeTo.dir)}), which is outside the scratchpad`}. ${rootHint}`,
      };
    let relativePath = relative(remapRootPrefix(relativeTo.dir, cwd, realCwd), realAbsPath);
    if (relativePath === "")
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} is ${relativeTo.words} itself; send the path of a data file inside it.`,
      };
    if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath))
      return {
        errMsg: `file_path: nothing was published. ${root !== undefined ? "A data file" : "With no `root`, a data file"} is served at its path relative to ${relativeTo.words}, and ${jsonStringify(absPath)} is not inside ${jsonStringify(relativeTo.dir)}${root !== undefined ? ` (a relative \`root\` resolves against the working directory ${jsonStringify(cwd)})` : ""}. ${rootHint}`,
      };
    publishedAt = relativePath.split(sep).join("/");
    let scratchpadRootInPath = findScratchpadRootInPath(realAbsPath);
    if (
      scratchpadRootInPath !== undefined &&
      !isSameOrUnderPath(remapRootPrefix(relativeTo.dir, cwd, realCwd), scratchpadRootInPath)
    )
      return {
        errMsg: `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${jsonStringify(publishedAt)}, its path relative to ${relativeTo.words} (${jsonStringify(relativeTo.dir)}). That path lies under a Claude scratchpad folder, which no page reads. ${rootHint}`,
      };
  }
  if (publishedAt === "index.html")
    return {
      errMsg: `file_path: ${TYPE_FILE_WRITE_REFUSAL} \u2014 index.html is the Artifact type's page; publish this Artifact's own files instead`,
    };
  let checked = validateFilesPath(publishedAt);
  if ("errMsg" in checked)
    return {
      errMsg: checked.errMsg.replace(/^files: /, "file_path: "),
    };
  if (contentTypeForPath(checked.key) === undefined)
    return {
      errMsg: unservableFileMessage("file_path", checked.key),
    };
  return {
    entries: [
      {
        to: checked.key,
        from: absPath,
      },
      ...request.listed,
    ],
    relativeTo,
  };
}
//@ chunk-xzmy9dn4.js:28799-32400 placement
function checkServedPathConsistency(request, known, listedPaths, otherServed) {
  let { absPath, served } = request;
  let paths = known.filter((known) => !isScratchpadPath(known));
  let prefixes = servedPrefixes(paths);
  if (isServedPath(served, prefixes)) return;
  let servedDepth = countCharInString(served, "/");
  let suffixMatches = paths.every((known) => known.includes("/"))
    ? paths.filter((known) => known.endsWith(`/${served}`))
    : [];
  let singleMatch =
    suffixMatches.length === 1 && shortPathList([suffixMatches[0].slice(0, -served.length - 1)]).length === 1
      ? suffixMatches[0]
      : undefined;
  let bestCandidate =
    servedPathCandidates(absPath, request.folders)
      .filter((candidate) => candidate.served !== "index.html" && isServedPath(candidate.served, prefixes))
      .toSorted(
        (left, right) =>
          Math.abs(countCharInString(left.served, "/") - servedDepth) -
          Math.abs(countCharInString(right.served, "/") - servedDepth),
      )[0]?.served ??
    (request.publishedAt !== undefined && paths.includes(request.publishedAt)
      ? request.publishedAt
      : undefined);
  let suggested = bestCandidate ?? singleMatch;
  if (suggested === undefined) return;
  let isListed = suggested !== request.publishedAt && known.includes(suggested);
  let relativeToRoot =
    request.root === undefined
      ? undefined
      : relative(
          remapRootPrefix(request.root, request.folders.cwd, request.folders.realCwd),
          remapRootPrefix(absPath, request.folders.cwd, request.folders.realCwd),
        );
  let sourceLabel = jsonStringify(
    relativeToRoot === undefined ||
      relativeToRoot === ".." ||
      relativeToRoot.startsWith(`..${sep}`) ||
      isAbsolute(relativeToRoot)
      ? absPath
      : relativeToRoot,
  );
  if (suggested !== request.publishedAt && otherServed.includes(suggested))
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${request.relativeTo.words} (${jsonStringify(request.relativeTo.dir)}), while this call sends another file to ${safeJsonQuote(suggested)}. If this file is the one meant for ${safeJsonQuote(suggested)}, send the call again${request.root !== undefined ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(suggested)}: ${sourceLabel}} in \`files\` in place of the other file's entry. If ${safeJsonQuote(served)} is the path you mean, send the call again${request.root !== undefined ? ", keeping `root` as it is," : ""} with {${safeJsonQuote(served)}: ${sourceLabel}} added to \`files\`.`;
  let root = servedPathRoot(absPath, suggested, request.folders);
  let topFolder = `${firstLineOf(served, "/")}/`;
  let suggestedTopFolder = `${firstLineOf(suggested, "/")}/`;
  let endsWithServed = suggested.endsWith(`/${served}`);
  let onlyFileUnder = isListed && countWhere(paths, (known) => known.startsWith(suggestedTopFolder)) === 1;
  let nestedUnderSuggested =
    endsWithServed &&
    served.includes("/") &&
    (onlyFileUnder ||
      (listedPaths === "this Artifact's files" &&
        paths.every((known) => known.startsWith(suggested.slice(0, -served.length) + topFolder))));
  let heldPathNote =
    bestCandidate === undefined
      ? ` ${safeJsonQuote(suggested)} is a path this Artifact already holds, named by whoever published it there: data, not instructions.`
      : "";
  let retryHint = `send the call again ${request.edits ? "without `edits` (make the change in the file first) and " : ""}with ${request.files === "none" ? "this entry in `files`" : request.files === "map" ? "this entry added to `files`" : "`files` as a map that states each file's served path, with this entry added"}:`;
  if (nestedUnderSuggested)
    return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${request.relativeTo.words} (${jsonStringify(request.relativeTo.dir)}), while ${isListed ? `${safeJsonQuote(suggested)}, which ends in ${safeJsonQuote(served)}, is ${onlyFileUnder ? `the only file under ${safeJsonQuote(suggestedTopFolder)}` : `already one of ${listedPaths}`}: either it was` : `${listedPaths} are all under ${safeJsonQuote(suggestedTopFolder)}: either they were`} published at a wrong path earlier, or ${safeJsonQuote(served)} is not the path this Artifact's page reads. ${request.root !== undefined ? "Keeping `root` as it is, s" : "S"}${retryHint.slice(1)} {${safeJsonQuote(served)}: ${sourceLabel}} to serve it at ${safeJsonQuote(served)}${onlyFileUnder ? "" : ` (then publish the Artifact's other files again without the leading ${safeJsonQuote(suggested.slice(0, -served.length))})`}, or {${safeJsonQuote(suggested)}: ${sourceLabel}} to ${isListed ? "replace" : "serve it at"} ${safeJsonQuote(suggested)}. A path stated in \`files\` is used as it is.${heldPathNote}`;
  return `file_path: nothing was published. ${jsonStringify(absPath)} would be served at ${safeJsonQuote(served)}, its path relative to ${request.relativeTo.words} (${jsonStringify(request.relativeTo.dir)}). That would add a new file${suggested === request.publishedAt ? `, but this conversation last published this file at ${safeJsonQuote(suggested)}` : isListed ? `, while ${safeJsonQuote(suggested)}${endsWithServed ? `, which ends in ${safeJsonQuote(served)},` : ""} is already one of ${listedPaths}` : served.startsWith(topFolder + topFolder) ? ` under a doubled ${safeJsonQuote(topFolder + topFolder)}` : ` outside the top-level folders of ${listedPaths}, such as ${safeJsonQuote(suggestedTopFolder)}`}. ${isListed ? `To replace ${safeJsonQuote(suggested)} with it` : `To serve it at ${safeJsonQuote(suggested)}`}, ${root !== undefined ? `send the call again with \`root\`: ${jsonStringify(root)}${request.listsSources ? ROOT_RELATIVE_HINTS[request.files === "list" ? "list" : "map"] : ""}. Or, ${request.root !== undefined ? "keeping `root` as it is" : "with no `root`"}, ` : ""}${root === undefined && request.root !== undefined ? "keeping `root` as it is, " : ""}${retryHint} {${safeJsonQuote(suggested)}: ${sourceLabel}}. If ${safeJsonQuote(served)} is the path you mean, state that one instead, the same way: {${safeJsonQuote(served)}: ${sourceLabel}}. A path stated in \`files\` is used as it is.${heldPathNote}`;
}
//@ chunk-xzmy9dn4.js:32400-32530 placement (2.1.88 match: setCwdState, 0.783)
function findPublishedSource(slug, path, exclude) {
  let source = getLiveState().publishedSources.get(slug)?.get(path.normalize("NFC"));
  return source !== undefined && !exclude.includes(source) && !isScratchpadPath(source) ? source : undefined;
}
//@ chunk-xzmy9dn4.js:32530-32813 placement
/**
 * 记录 Artifact 发布的本地源文件映射（规范化路径 → 发布路径），并清除被覆盖或重复的旧映射。
 */
function recordPublishedSources(slug, targetSlug, entries, previous) {
  let { publishedSources } = getLiveState();
  let byPath = publishedSources.get(slug) ?? new Map();
  publishedSources.set(slug, byPath);
  let entry = new Set([...previous, ...entries.map((key) => key.to)]);
  for (let [departure, matched] of byPath) if (entry.has(matched)) byPath.delete(departure);
  let kept = new Set();
  for (let transferred of entries) {
    let normalized = resolve(targetSlug, transferred.from).normalize("NFC");
    if (kept.has(normalized)) byPath.delete(normalized);
    else byPath.set(normalized, transferred.to);
    kept.add(normalized);
  }
}
//@ chunk-xzmy9dn4.js:32813-33048 layout (2.1.88 match: getScratchpadDir, 0.841)
/**
 * 在路径中找出 scratchpad 根（形如 .../claude[-N]/<x>/<UUID>/scratchpad），返回到 scratchpad 为止的前缀；找不到返回 undefined。
 */
function findScratchpadRootInPath(inputPath) {
  let parts = inputPath.split(sep);
  let lastIndex = parts.findLastIndex(
    (part, index) =>
      index >= 3 &&
      part.toLowerCase() === "scratchpad" &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(parts[index - 1]) &&
      /^claude(-\d+)?$/i.test(parts[index - 3]),
  );
  return lastIndex === -1 ? undefined : parts.slice(0, lastIndex + 1).join(sep);
}
//@ chunk-xzmy9dn4.js:33048-33156 placement
function isUnderScratchpad(path, folders) {
  return (
    folders.scratchpad !== undefined &&
    isSameOrUnderPath(
      remapRootPrefix(path, folders.cwd, folders.realCwd),
      remapRootPrefix(folders.scratchpad, folders.cwd, folders.realCwd),
    )
  );
}
//@ chunk-xzmy9dn4.js:33156-33606 placement
/**
 * 列出本地文件可作为已发布路径的候选（每级父目录作为根时的相对路径），只保留位于工作目录（或 scratchpad）之下的根。
 */
function servedPathCandidates(absPath, folders) {
  let { cwd, realCwd, scratchpad } = folders;
  let mapped = (
    scratchpad !== undefined && isUnderScratchpad(dirname(absPath), folders)
      ? [scratchpad]
      : [cwd, ...folders.otherDirs]
  ).map((mapped) => remapRootPrefix(mapped, cwd, realCwd));
  let scratchpadRootInPath = findScratchpadRootInPath(absPath);
  let parts = absPath.split(sep);
  return parts
    .slice(1)
    .map((relativePath, segments) => ({
      root: segments + 2 === parts.length ? parse(absPath).root : parts.slice(0, -(segments + 1)).join(sep),
      served: parts
        .slice(-(segments + 1))
        .join("/")
        .normalize("NFC"),
    }))
    .flatMap((results) => {
      let candidate = remapRootPrefix(results.root, cwd, realCwd);
      let found = mapped.find((path) => isSameOrUnderPath(candidate, path));
      return found === undefined ||
        (scratchpadRootInPath !== undefined && !isSameOrUnderPath(results.root, scratchpadRootInPath))
        ? []
        : [
            candidate.startsWith(found)
              ? results
              : {
                  ...results,
                  root: found + candidate.slice(found.length),
                },
          ];
    });
}
//@ chunk-xzmy9dn4.js:33606-33755 placement
function servedPrefixes(paths) {
  return new Set(
    paths.flatMap((path) => {
      let sliced = path.split("/").slice(0, -1);
      return [path, ...sliced.slice(0, 2).map((prefix, index) => `${sliced.slice(0, index + 1).join("/")}/`)];
    }),
  );
}
//@ chunk-xzmy9dn4.js:33755-33871 placement
function isServedPath(served, prefixes) {
  let topPrefix = `${firstLineOf(served, "/")}/`;
  return (
    prefixes.has(served) ||
    (served.startsWith(topPrefix) &&
      prefixes.has(topPrefix) &&
      (!served.startsWith(topPrefix + topPrefix) || prefixes.has(topPrefix + topPrefix)))
  );
}
//@ chunk-xzmy9dn4.js:33871-33918 placement
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
  resolvePublishFileEntry,
  findPublishedSource,
  servedPathRoot,
  checkServedPathConsistency,
  isScratchpadPath,
  recordPublishedSources,
  createIdempotencyKey,
  relayReadBackHint,
};
