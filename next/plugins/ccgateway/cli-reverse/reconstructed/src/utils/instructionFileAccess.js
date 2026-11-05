/**
 * utils/instructionFileAccess.ts
 *
 * 2.1.316 新增：指令文件（CLAUDE.md 等）访问跟踪
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (73)
 * attribution: placement 73
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, join, resolve as resolve_2, dirname, parse, sep } from "path";
import { randomUUID } from "crypto";
import { open } from "fs/promises";
import { constants } from "fs";
import { setImmediate as Gjo } from "timers/promises";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { ClaudeMdAccessTracker, MD_LINK_RE } from "./claudemd.js";
import { logForDebugging } from "./debug.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { truncatePathForDisplay_2 } from "./invisibleChars.js";
import { plural } from "./stringUtils.js";
import { isSentinelInode } from "./slowOperations.js";
import { isNetworkRelatedPath, isNonWslUncPath, isWslUncPath } from "./networkPaths.js";
import { getPlatform } from "./platform.js";
import { raceWithAbortSignal, withDeadline } from "./sleep.js";
import { getFsImplementation, walkPermissionCheckPathsAsync } from "./fsOperations.js";
import { isPathAbsent, getErrnoCode } from "./errors.js";
import { expandPath, expandStablePath } from "./path.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import {
  readFdTargetPath,
  openReadBoundToApproval,
  lastExistingIdentity,
} from "./fsSafety/pathRevalidation.js";
import {
  matchingRuleForInput,
  matchingDenyRuleForDirectoryContents,
  hasReadDenyRuleForPath,
  pathInWorkingPath,
  spellingsToJudge,
  declaredAbsoluteAdditionalDirectories,
  hasPermissionAuthoredBareReadDeny,
  hasReadDenyRuleInForce,
} from "./permissions/filesystem.js";
import { getContentRulesForToolName } from "./permissions/permissions.js";
import { READ } from "../tools/FileReadTool/constants.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1318036-1318064 placement
/**
 * 宿主/会话级 CLAUDE.md 访问跟踪器槽位。
 */
var claudeMdAccessTrackerSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1318036", () => {
  claudeMdAccessTrackerSlot = new SessionRootSlot(() => new ClaudeMdAccessTracker());
});
//@ chunk-5xgkngpb.js:1318064-1318238 placement
/**
 * 从记忆索引内容中提取链接的相对路径（排除绝对路径、带协议的、含 .. 的），拼到记忆目录下。
 */
function indexLinkedMemoryPaths(indexContent, memoryDir) {
  return [...indexContent.matchAll(MD_LINK_RE)]
    .map((match) => match[1].trim())
    .filter(
      (linkPath) =>
        !isAbsolute(linkPath) &&
        !/^[a-z][a-z0-9+.-]*:/i.test(linkPath) &&
        !linkPath.split(/[\\/]/).includes(".."),
    )
    .map((relativePath) => join(memoryDir, relativePath));
}
//@ chunk-5xgkngpb.js:1318238-1318298 placement (2.1.88 match: setCwdState, 1)
function nfcLowerPath(cwd) {
  return resolve_2(cwd).normalize("NFC").toLowerCase();
}
//@ chunk-5xgkngpb.js:1318298-1318309 placement
/**
 * 跟踪指令文件路径的数量上限（日志/待记账/已见各一份）。
 */
var MAX_TRACKED_INSTRUCTION_PATHS = 200;
//@ chunk-5xgkngpb.js:1318309-1318563 placement
/**
 * 指令文件未加载的原因说明（Read 拒绝规则、工作目录外、无法判定、无法确定指向）。
 */
var INSTRUCTION_WITHHELD_REASONS = {
  denied: "a Read deny rule covers it",
  outside: "it's read from outside your working directories, where reads are blocked",
  unjudged: "a Read deny rule couldn't be checked without a working directory",
  unsettled: "where it leads couldn't be worked out",
};
//@ chunk-5xgkngpb.js:1318601-1318677 placement
/**
 * 会话级的"被扣留指令文件"状态（待记账、已记录、一次性 token、已见集合）。
 */
var withheldInstructionStateSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1318601", () => {
  withheldInstructionStateSlot = new SessionRootSlot(() => ({
    owed: new Map(),
    logged: new Set(),
    token: randomUUID(),
    seen: new Set(),
  }));
});
//@ chunk-5xgkngpb.js:1318677-1318826 placement
/**
 * 为未加载的指令文件记录调试日志（每个路径一次，总数有上限）。
 */
function logWithheldInstructionFiles(context, withheldFiles) {
  let { logged } = withheldInstructionStateSlot.of(context);
  for (let { path, why } of withheldFiles)
    if (!logged.has(path) && logged.size < MAX_TRACKED_INSTRUCTION_PATHS) {
      logged.add(path);
      logForDebugging(`Instruction file not loaded: ${path} (${INSTRUCTION_WITHHELD_REASONS[why]})`);
    }
}
//@ chunk-5xgkngpb.js:1318826-1318941 placement
/**
 * 记录因 Read 规则未加载的指令文件：写调试日志，交互会话中再登记到 owed 表（有上限），以便之后作为附件告知。
 */
function recordWithheldInstructionFiles(context, withheldFiles) {
  let { owed } = withheldInstructionStateSlot.of(context);
  logWithheldInstructionFiles(context, withheldFiles);
  for (let entry of getIsNonInteractiveSession() ? [] : withheldFiles)
    if (!owed.has(entry.path) && owed.size < MAX_TRACKED_INSTRUCTION_PATHS) owed.set(entry.path, entry);
}
//@ chunk-5xgkngpb.js:1318941-1319007 placement
/**
 * 从待记账集合中移除已处理的指令文件。
 */
function clearOwedInstructionFiles(context, paths) {
  let { owed } = withheldInstructionStateSlot.of(context);
  for (let path of paths) owed.delete(path);
}
//@ chunk-5xgkngpb.js:1319007-1319103 placement
/**
 * 取走（清空并返回）待记账的指令文件路径。
 */
function takeOwedInstructionFiles(context, paths) {
  let { owed } = withheldInstructionStateSlot.of(context);
  for (let path of paths) owed.delete(path);
  return Array.from(owed.values());
}
//@ chunk-5xgkngpb.js:1319103-1319119 placement
var PATH = "path:";
//@ chunk-5xgkngpb.js:1319119-1319130 placement
/**
 * 提示中最多列出的未加载指令文件数。
 */
var MAX_SHOWN_INSTRUCTION_FILES = 20;
//@ chunk-5xgkngpb.js:1319130-1319384 placement
/**
 * 从消息的 withheld_memory 附件中收集指定来源扣留的记忆文件路径。
 */
var withheldMemoryPaths = (messages, token) =>
  new Set(
    messages
      .flatMap((message) => (message.type === "attachment" ? [message.attachment] : []))
      .flatMap((attachment) => (attachment.type === "withheld_memory" ? [attachment] : []))
      .flatMap((withheldMemory) => (withheldMemory.by === token ? [withheldMemory.entries] : []))
      .flatMap((entry) => (Array.isArray(entry) ? entry : []))
      .flatMap((pathEntry) => (typeof pathEntry?.path === "string" ? [pathEntry.path] : [])),
  );
//@ chunk-5xgkngpb.js:1319384-1319515 placement
/**
 * 合并会话中已记录的与消息中出现的被扣留路径（记录数有上限）。
 */
function seenWithheldPaths(context, messages) {
  let { seen, token } = withheldInstructionStateSlot.of(context.session);
  let withheldPaths = withheldMemoryPaths(messages, token);
  for (let withheldPath of withheldPaths)
    if (seen.size < MAX_TRACKED_INSTRUCTION_PATHS) seen.add(withheldPath);
  return new Set([...seen, ...withheldPaths]);
}
//@ chunk-5xgkngpb.js:1319515-1319642 placement
/**
 * 构造"指令文件未加载"提示的显示片段（原因说明、路径标记与截断后的路径）。
 */
var withheldInstructionNotice = (reason, displayPath) => ({
  lead: `Instruction file not loaded (${INSTRUCTION_WITHHELD_REASONS[reason]}):`,
  mark: PATH,
  path: truncatePathForDisplay_2(displayPath.replace(/\s+/g, " ")).replace(/\s+/g, " "),
});
//@ chunk-5xgkngpb.js:1319642-1319719 placement
/**
 * 生成"另有 N 个指令文件未加载"的文案。
 */
var moreInstructionFilesText = (omitted) =>
  `and ${omitted.more} more instruction ${plural(omitted.more, "file")} not loaded`;
//@ chunk-5xgkngpb.js:1319719-1319787 placement
/**
 * 把列表截断为"展示前 N 个 + 剩余数量"。
 */
var takeShownInstructionFiles = (withheldInstructionFiles) => ({
  shown: withheldInstructionFiles.slice(0, MAX_SHOWN_INSTRUCTION_FILES),
  more: Math.max(withheldInstructionFiles.length - MAX_SHOWN_INSTRUCTION_FILES, 0),
});
//@ chunk-5xgkngpb.js:1319833-1319844 placement
/**
 * 目录中按名查找的指令文件名清单。
 */
var INSTRUCTION_FILE_NAMES = [];
//@ chunk-5xgkngpb.js:1319844-1319890 placement
/**
 * 列出目录下所有指令文件路径。
 */
function instructionFilesInDir(dirPath) {
  return INSTRUCTION_FILE_NAMES.map((fileName) => join(dirPath, fileName));
}
//@ chunk-5xgkngpb.js:1319890-1319987 placement
/**
 * 托管指令专用模式下只保留 Managed 类型的指令文件。
 */
function filterManagedInstructions(instructions, options) {
  if (options.managedInstructionsOnly)
    return instructions.filter((instruction) => instruction.type === "Managed");
  return instructions;
}
//@ chunk-5xgkngpb.js:1319987-1320043 placement (2.1.88 match: getFileIdentity, 0.795)
var getFileIdentity_5 = (leftStat, rightStat) =>
  !isSentinelInode(leftStat.ino) && leftStat.dev === rightStat.dev && leftStat.ino === rightStat.ino;
//@ chunk-5xgkngpb.js:1320076-1320141 placement
/**
 * 判断路径是否指向设备命名空间/Windows 设备（不可作为普通文件读取）。
 */
var isDeviceNamespacePath = (inputPath) =>
  isNetworkRelatedPath(inputPath.replace(/^\/{2,}/, "/")) ||
  (getPlatform() === "windows" && isNonWslUncPath(inputPath));
//@ chunk-5xgkngpb.js:1320177-1320189 placement
/**
 * 默认的指令文件读取超时（毫秒）。
 */
var DEFAULT_READ_TIMEOUT_MS = 1000;
//@ chunk-5xgkngpb.js:1320189-1320200 placement
/**
 * 路径遍历时批量刷新缓存的间隔（每 N 次）。
 */
var WALK_FLUSH_INTERVAL = 50;
//@ chunk-5xgkngpb.js:1320200-1320211 placement
var MAX_SYMLINK_HOPS = 40;
//@ chunk-5xgkngpb.js:1320211-1320222 placement
var MAX_RESOLVED_SEGMENTS = 32;
//@ chunk-5xgkngpb.js:1320268-1320511 placement
async function isWalkUnresolved(walk, signal) {
  return walk.unresolved &&
    walk.reason === "unexamined" &&
    isWslUncPath(walk.requested) &&
    dirname(walk.stoppedAt) === parse(walk.stoppedAt).root
    ? raceWithAbortSignal(
        getFsImplementation()
          .lstat(parse(walk.stoppedAt).root)
          .then(
            () => true,
            (error) => !isPathAbsent(error),
          ),
        signal,
        () => Error("cut short"),
      ).catch(() => true)
    : walk.unresolved;
}
//@ chunk-5xgkngpb.js:1320556-1320655 placement
async function resolveLandingOnWindows(path, signal) {
  let walk = await walkPermissionCheckPathsAsync(path, signal);
  return (await isWalkUnresolved(walk, signal)) ? undefined : walk.unresolved ? path : walk.landing;
}
//@ chunk-5xgkngpb.js:1320655-1320700 placement
var raceWithCutShort = (promise, signal) => raceWithAbortSignal(promise, signal, () => Error("cut short"));
//@ chunk-5xgkngpb.js:1320700-1320861 placement
async function isSymlinkPath(path) {
  try {
    return (await getFsImplementation().lstat(path)).isSymbolicLink();
  } catch (error) {
    if (!(
      !isPathAbsent(error) &&
      (await getFsImplementation()
        .openDirNoFollow(path)
        .then(
          () => true,
          () => false,
        ))
    ))
      throw error;
    return false;
  }
}
//@ chunk-5xgkngpb.js:1320861-1320916 placement
var splitPathSegments = (path) => path.split("/").filter((segment) => segment !== "" && segment !== ".");
//@ chunk-5xgkngpb.js:1320916-1321416 placement
/**
 * 不经 realpath 逐段解析路径中的符号链接（处理 ..、链接跳数上限、中断信号），返回解析后的路径；Windows 走另一实现，失败或越界返回 undefined。
 */
async function resolveSymlinksLexically(path, signal) {
  if (getPlatform() === "windows") return resolveLandingOnWindows(path, signal);
  let pending = splitPathSegments(path);
  let resolved = "/";
  let hops = 0;
  try {
    while (pending.length > 0 && hops <= MAX_SYMLINK_HOPS) {
      signal.throwIfAborted();
      let [head = "", ...rest] = pending;
      let isParent = head === "..";
      let candidate = isParent ? dirname(resolved) : join(resolved, head);
      if (isDeviceNamespacePath(candidate)) return rest.includes("..") ? undefined : join(candidate, ...rest);
      let isSymlink = !isParent && (await raceWithCutShort(isSymlinkPath(candidate), signal));
      let linkTarget = isSymlink
        ? await raceWithCutShort(getFsImplementation().readlink(candidate), signal).catch(() => {
            return;
          })
        : "";
      if (linkTarget === undefined) return;
      let isAbsoluteLink = linkTarget.startsWith("/");
      pending = [...splitPathSegments(linkTarget), ...rest];
      hops += isSymlink ? 1 : 0;
      resolved = isAbsoluteLink ? "/" : isSymlink ? resolved : candidate;
    }
    return hops > MAX_SYMLINK_HOPS ? undefined : resolved;
  } catch (error) {
    let [, ...rest] = pending;
    return isPathAbsent(error) && !rest.includes("..") ? join(resolved, ...pending) : undefined;
  }
}
//@ chunk-5xgkngpb.js:1321416-1321734 placement
/**
 * 收集一个路径为做读权限判断所需的全部拼写（各级符号链接展开后的路径与着陆点），超出上限或无法解析时返回 undefined。
 */
async function pathSpellingsForRead(inputPath, signal) {
  let path = isAbsolute(inputPath) ? inputPath : expandPath(inputPath);
  let spellings = new Set([path]);
  for (let current of spellings) {
    let walk = await walkPermissionCheckPathsAsync(current, signal);
    if (signal.aborted || (await isWalkUnresolved(walk, signal))) return;
    walk.spellings.forEach((spelling) => spellings.add(spelling));
    spellings.add(walk.unresolved ? current : walk.landing);
    let lexicalPath =
      current === path && spellings.size > 1 && getPlatform() !== "windows"
        ? await resolveSymlinksLexically(path, signal)
        : current;
    if (lexicalPath === undefined || spellings.size > MAX_RESOLVED_SEGMENTS) return;
    spellings.add(lexicalPath);
  }
  return Array.from(spellings);
}
//@ chunk-5xgkngpb.js:1321734-1321834 placement
async function spellingsUnchanged(path, expected, signal) {
  let spellings = await pathSpellingsForRead(path, signal);
  return (
    spellings?.length === expected.length &&
    spellings.every((spelling, index) => spelling === expected[index])
  );
}
//@ chunk-5xgkngpb.js:1321834-1321892 placement
var spellingsUnchangedWithLexicalLinks = async (path, expected, signal) =>
  (await resolveSymlinksLexically(path, signal)) === resolve_2(path) &&
  spellingsUnchanged(path, expected, signal);
//@ chunk-5xgkngpb.js:1321962-1322100 placement
async function withNoSymlinkLeaf(path, readPath) {
  let needsLeafCheck = !isDeviceNamespacePath(path);
  if (needsLeafCheck && (await isSymlinkPath(path).catch(() => true))) return;
  let result = await readPath(path);
  return needsLeafCheck && (await isSymlinkPath(path).catch(() => true)) ? undefined : result;
}
//@ chunk-5xgkngpb.js:1322100-1322174 placement
function swallowLoopOrNotDir(error) {
  if (!["ELOOP", "ENOTDIR"].includes(getErrnoCode(error) ?? "")) throw error;
  return;
}
//@ chunk-5xgkngpb.js:1322174-1322508 placement
/**
 * 在 Linux/WSL 上先以 O_DIRECTORY|O_NOFOLLOW 打开目录并钉住，通过 /proc/self/fd 路径执行回调（目录真实路径须在允许列表内）；其他平台或无法取得真实路径时直接按原路径执行。
 */
async function withPinnedDir(path, expected, readPath) {
  if (!["linux", "wsl"].includes(getPlatform())) return withNoSymlinkLeaf(path, readPath);
  await using dirHandle = await open(
    path,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
  ).catch(swallowLoopOrNotDir);
  if (dirHandle === undefined) return;
  let procPath = `/proc/self/fd/${dirHandle.fd}`;
  let fdTargetPath = await readFdTargetPath(dirHandle.fd).catch(() => null);
  let isTargetUnknown = fdTargetPath === undefined;
  let isExpectedTarget = typeof fdTargetPath === "string" && expected.includes(fdTargetPath);
  return isTargetUnknown
    ? withNoSymlinkLeaf(path, readPath)
    : isExpectedTarget
      ? await readPath(procPath)
      : undefined;
}
//@ chunk-5xgkngpb.js:1322508-1322563 placement
var ignoreAfterAbort = (signal) =>
  function (error) {
    if (!signal.aborted) throw error;
    return;
  };
//@ chunk-5xgkngpb.js:1322563-1322751 placement
/**
 * 在路径拼写集不变的前提下读取目录：Linux 上以 O_NOFOLLOW 打开目录并经 /proc/self/fd 读取，读完再确认拼写未变，否则放弃。
 */
async function readDirIfSpellingsStable(path, expected, readPath) {
  let signal = AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS);
  let symlinksLexically = await resolveSymlinksLexically(path, signal);
  if (!(symlinksLexically !== undefined && expected.includes(symlinksLexically))) return;
  let result = await raceWithCutShort(withPinnedDir(symlinksLexically, expected, readPath), signal).catch(
    ignoreAfterAbort(signal),
  );
  return (await spellingsUnchanged(path, expected, signal)) ? result : undefined;
}
//@ chunk-5xgkngpb.js:1322751-1322851 placement (2.1.88 match: getReservedShortcuts, 1)
async function checkPathRefused(path, expected, context) {
  let isMacos = getPlatform() === "macos";
  return openReadBoundToApproval(
    expandStablePath(path),
    expected,
    context,
    isMacos ? await lastExistingIdentity(expected) : undefined,
    "refused",
  );
}
//@ chunk-5xgkngpb.js:1322851-1323169 placement
/**
 * 生成一个读文件函数：用 checkPathRefused 打开并固定目标，确认是普通文件后回调读取，并在读后核对文件身份（inode 不可信时重新检查）。
 */
var readPinnedFile = (path, expected, context) =>
  async function (readFile) {
    let opened = await checkPathRefused(path, expected, context).catch(() => {
      return;
    });
    if (opened === undefined) return;
    try {
      let leftStat = await opened.handle.stat({
        bigint: true,
      });
      let result = leftStat.isFile() ? await readFile(opened, leftStat) : undefined;
      return (
        isSentinelInode(leftStat.ino)
          ? await spellingsUnchangedWithLexicalLinks(path, expected, context)
          : getFileIdentity_5(leftStat, await getFsImplementation().statBigint(opened.canonicalPath))
      )
        ? result
        : undefined;
    } catch {
      return;
    } finally {
      await opened.close().catch(() => {});
    }
  };
//@ chunk-5xgkngpb.js:1323207-1323443 placement
/**
 * 为附带读取的文件暂存一次读权限（生成 attached-read 工具调用 id；macOS 上同时记录文件身份），返回带该 id 的上下文。
 */
async function stashAttachedReadPermission(inputPath, expandedPath, context) {
  let toolUseId = `attached-read-${randomUUID()}`;
  let stablePath = expandStablePath(inputPath);
  let isMacos = getPlatform() === "macos";
  let identity = isMacos ? await lastExistingIdentity(expandedPath) : null;
  context.session.writePermissionStash.stash(toolUseId, stablePath, expandedPath, "read");
  if (isMacos) context.session.writePermissionStash.stashIdentity(toolUseId, stablePath, identity);
  return {
    ...context,
    toolUseId,
  };
}
//@ chunk-5xgkngpb.js:1323443-1323517 placement (2.1.88 match: isFileReadDenied, 1)
var isFileReadDenied = (filePath, toolPermissionContext) =>
  filePath.some(
    (filePath) =>
      matchingRuleForInput(filePath, toolPermissionContext, "read", "deny", {
        isDirectory: true,
      }) !== null,
  );
//@ chunk-5xgkngpb.js:1323517-1323589 placement (2.1.88 match: isFileReadDenied, 1)
var isFileReadDenied_2 = (filePath, toolPermissionContext) =>
  filePath.some(
    (path) => matchingDenyRuleForDirectoryContents(path, toolPermissionContext, "read") !== null,
  ) || hasReadDenyRuleForPath(filePath.at(0) ?? "", toolPermissionContext, filePath);
//@ chunk-5xgkngpb.js:1323638-1323853 placement
/**
 * 创建读取节流器：每到一定数量的读取就等前一批全部完成并让出一次，返回本次读取完成时调用的 resolve。
 */
function createReadThrottle() {
  let walkCount = 0;
  let resolved = Promise.resolve();
  let pending = [];
  return async function () {
    if (walkCount > 0 && walkCount % WALK_FLUSH_INTERVAL === 0) {
      resolved = Promise.all([resolved, ...pending]).then(() => Gjo());
      pending = [];
    }
    walkCount += 1;
    let deferred = Promise.withResolvers();
    pending = [...pending, deferred.promise];
    await resolved;
    return deferred.resolve;
  };
}
//@ chunk-5xgkngpb.js:1323853-1323938 placement
var isSymlinkToAbsent = async (path, signal) =>
  !isDeviceNamespacePath(path) &&
  (await raceWithAbortSignal(isSymlinkPath(path), signal, () => Error("cut short")).then(
    () => false,
    isPathAbsent,
  ));
//@ chunk-5xgkngpb.js:1323992-1324280 placement
async function spellingsBelowFirstLink(path, signal) {
  let filtered = path
    .slice(parse(path).root.length)
    .split(sep)
    .filter((segment) => segment !== "");
  let root = parse(path).root;
  let spellings = [root];
  for (let [segmentIndex, segment] of filtered.entries()) {
    if (!(spellings !== undefined && !spellings.some(isDeviceNamespacePath))) return;
    if (await isSymlinkToAbsent(join(root, segment), signal)) {
      let tailPath = join(...filtered.slice(segmentIndex));
      return spellings?.map((spelling) => join(spelling, tailPath));
    }
    root = join(root, segment);
    spellings = await pathSpellingsForRead(root, signal);
  }
  return;
}
//@ chunk-5xgkngpb.js:1324280-1324324 placement
/**
 * 读取路径拼写集合，失败时回退到首个链接以下的部分。
 */
var spellingsForReadOrFallback = async (path, signal) =>
  (await pathSpellingsForRead(path, signal)) ?? spellingsBelowFirstLink(path, signal);
//@ chunk-5xgkngpb.js:1324324-1324502 placement
/**
 * 检查路径展开后各段的实际拼写是否与预期完全一致（含 .. 或特殊段时不比较）。
 */
async function matchesExpectedSpellings(path, expectedSpellings, signal) {
  let actualSpellings =
    !path.split(/[\\/]/).includes("..") &&
    !expectedSpellings.some(isDeviceNamespacePath) &&
    (await isSymlinkToAbsent(expandPath(path), signal))
      ? await spellingsForReadOrFallback(expandPath(path), signal)
      : undefined;
  return (
    actualSpellings?.length === expectedSpellings.length &&
    actualSpellings.every((spelling, index) => spelling === expectedSpellings[index])
  );
}
//@ chunk-5xgkngpb.js:1324532-1324625 placement
var isSpelledWithinWorkingDirs = (candidatePath, workingDirs, segmentLists) =>
  workingDirs.some((workingDir) =>
    segmentLists.some((segments) =>
      pathInWorkingPath(candidatePath, join(workingDir, ...segments), {
        caseFold: false,
        uncShapeParity: true,
      }),
    ),
  );
//@ chunk-5xgkngpb.js:1324625-1324711 placement
var spellingsAwareReader = (reader, context, segmentLists) => ({
  ...reader,
  isHeldOutside: (candidatePath, settings) =>
    reader.isHeldOutside(candidatePath, settings) &&
    !isSpelledWithinWorkingDirs(candidatePath, spellingsToJudge(context), segmentLists),
});
//@ chunk-5xgkngpb.js:1324711-1324724 placement
/**
 * 指令文件读取的默认超时（30 秒）。
 */
var DEFAULT_INSTRUCTION_READ_TIMEOUT_MS = 30000;
//@ chunk-5xgkngpb.js:1324760-1324826 placement
var absoluteContextRoots = (context) =>
  context.folders
    .filter((folder) => isAbsolute(folder))
    .concat(declaredAbsoluteAdditionalDirectories(context.context));
//@ chunk-5xgkngpb.js:1324826-1324915 placement
function cachedSpellingsToJudge(cache, context) {
  let cached = cache.get(context);
  if (cached !== undefined) return cached;
  let segments = spellingsToJudge(context);
  cache.set(context, segments);
  return segments;
}
//@ chunk-5xgkngpb.js:1324915-1324928 placement
var NO_REMAINING_SEGMENTS = [[]];
//@ chunk-5xgkngpb.js:1324928-1325072 placement
function outsideWorkingDirsReason(spellings, context) {
  if (spellings === undefined) return "unsettled";
  let roots = absoluteContextRoots(context);
  let segmentCache = new Map();
  return spellings.some(
    (spelling) =>
      !roots.some((root) =>
        isSpelledWithinWorkingDirs(
          spelling,
          cachedSpellingsToJudge(segmentCache, root),
          NO_REMAINING_SEGMENTS,
        ),
      ),
  )
    ? "outside"
    : undefined;
}
//@ chunk-5xgkngpb.js:1325072-1325453 placement
/**
 * 生成受读规则保护的指令文件读取器：算出路径拼写、用判定函数得出拒绝原因；允许时在超时与大小上限内安全读取文本，否则返回 {why}。
 */
var makeGuardedInstructionReader = (refusalReason, timeoutMs) =>
  async function (filePath, maxSize) {
    let signal = AbortSignal.timeout(timeoutMs);
    let spellings = await pathSpellingsForRead(filePath, signal);
    let reason = refusalReason(spellings);
    let stats =
      spellings !== undefined &&
      reason === undefined &&
      (await withDeadline(
        getFsImplementation()
          .stat(filePath)
          .catch(() => null),
        timeoutMs,
      ));
    let text =
      spellings !== undefined &&
      stats &&
      stats.isFile() &&
      stats.size <= maxSize &&
      (await readPinnedFile(
        filePath,
        spellings,
        signal,
      )(async (pinned, fileStats) => (fileStats.size > maxSize ? undefined : pinned.handle.readFile())));
    let unsettled = stats === undefined || (text === undefined && signal.aborted);
    return text
      ? {
          text: text.toString("utf8"),
          why: undefined,
        }
      : {
          text: undefined,
          why: unsettled ? "unsettled" : reason,
        };
  };
//@ chunk-5xgkngpb.js:1325453-1325530 placement
var instructionReadDenialReason = (tool) =>
  (hasPermissionAuthoredBareReadDeny(tool) && "denied") ||
  (getContentRulesForToolName(tool, READ, "deny").length > 0 && "unjudged") ||
  undefined;
//@ chunk-5xgkngpb.js:1325530-1325599 placement
var isNonDirectoryWithinDeadline = (filePath) =>
  withDeadline(
    getFsImplementation()
      .lstat(filePath)
      .then(
        (stats) => !stats.isDirectory(),
        () => false,
      ),
    DEFAULT_READ_TIMEOUT_MS,
  );
//@ chunk-5xgkngpb.js:1325599-1325723 placement
var withWithheldReporting = (readInstruction, reportWithheld) =>
  async function (filePath, maxSize) {
    let result = await readInstruction(filePath, maxSize);
    let shouldReport = result.why !== undefined && (await isNonDirectoryWithinDeadline(filePath)) !== false;
    reportWithheld(filePath, shouldReport ? result.why : undefined);
    return result.text;
  };
//@ chunk-5xgkngpb.js:1325723-1325963 placement
/**
 * --restricted 或"禁止读工作目录外"时，构造指令文件读取器 {within, above}，读不到时登记原因；两者都未开启时返回 undefined。
 */
function restrictedInstructionReaders(context, reportWithheld) {
  let denialReason = instructionReadDenialReason(context.context);
  let isDenied = denialReason !== undefined;
  if (
    !isDenied &&
    context.context.restricted !== true &&
    context.context.blockReadsOutsideWorkingDirectories !== true
  )
    return;
  let reader = withWithheldReporting(
    isDenied
      ? async () => ({
          text: undefined,
          why: denialReason,
        })
      : makeGuardedInstructionReader(
          (spellings) => outsideWorkingDirsReason(spellings, context),
          DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
        ),
    reportWithheld,
  );
  return {
    within: reader,
    above: () => reader,
  };
}
//@ chunk-5xgkngpb.js:1325963-1326142 placement
function instructionReadRefusal(filePath, context) {
  let isDenied = filePath !== undefined && isFileReadDenied_2(filePath, context.context);
  let isHeldOutside =
    filePath !== undefined &&
    !isDenied &&
    filePath.some((spelling) => context.isHeldOutside(spelling, context.context));
  return (
    (filePath === undefined && "unsettled") ||
    (isDenied && "denied") ||
    (isHeldOutside && "outside") ||
    undefined
  );
}
//@ chunk-5xgkngpb.js:1326142-1326177 placement
var guardedInstructionReader = (context, timeoutMs) =>
  makeGuardedInstructionReader((spellings) => instructionReadRefusal(spellings, context), timeoutMs);
//@ chunk-5xgkngpb.js:1326177-1326233 placement
/**
 * 用受保护读器读出文本内容。
 */
var instructionReadText =
  (context, timeoutMs = DEFAULT_READ_TIMEOUT_MS) =>
  async (filePath, maxSize) =>
    (await guardedInstructionReader(context, timeoutMs)(filePath, maxSize)).text;
//@ chunk-5xgkngpb.js:1326233-1326284 placement
var instructionReaderWithin = (context, reportWithheld) =>
  reportWithheld === undefined
    ? instructionReadText(context, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS)
    : withWithheldReporting(
        guardedInstructionReader(context, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS),
        reportWithheld,
      );
//@ chunk-5xgkngpb.js:1326284-1326359 placement
/**
 * 判断指令路径是否被 Read 拒绝规则或工作目录限制拦下。
 */
var isInstructionPathRefused = (filePath, context) =>
  isFileReadDenied_2(filePath, context.context) ||
  filePath.some((spelling) => context.isHeldOutside(spelling, context.context));
//@ chunk-5xgkngpb.js:1326359-1326441 placement
/**
 * 取可读的指令路径拼写（被拒绝或不可解析时返回 undefined）。
 */
async function readableInstructionSpellings(path, context, signal) {
  let spellings = await pathSpellingsForRead(path, signal);
  return spellings === undefined || isInstructionPathRefused(spellings, context) ? undefined : spellings;
}
//@ chunk-5xgkngpb.js:1326441-1326588 placement
var INSTRUCTION_FILE_NAMES_2; // deferred: uses INSTRUCTION_FILE_NAMES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1326441", () => {
  INSTRUCTION_FILE_NAMES_2 = [
    ...INSTRUCTION_FILE_NAMES.map((fileName) => [fileName]),
    ["CLAUDE.md"],
    ["CLAUDE.local.md"],
    ["AGENTS.md"],
    [".claude", "CLAUDE.md"],
    [".claude", "AGENTS.md"],
    [".claude", "rules"],
  ];
});
//@ chunk-5xgkngpb.js:1326588-1326666 placement
/**
 * 仓库级指令读器（目录内与向上各层）。
 */
var repoInstructionReaders = (context, reportWithheld) => ({
  within: withWithheldReporting(
    guardedInstructionReader(context, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS),
    reportWithheld,
  ),
  above: (segments) =>
    withWithheldReporting(
      guardedInstructionReader(
        spellingsAwareReader(context, segments, INSTRUCTION_FILE_NAMES_2),
        DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
      ),
      reportWithheld,
    ),
});
//@ chunk-5xgkngpb.js:1326666-1326696 placement (2.1.88 match: getManagedClaudeRulesDir, 1)
var CLAUDE_RULES_DIR = [[".claude", "rules"]];
//@ chunk-5xgkngpb.js:1326696-1326762 placement
/**
 * .claude/rules 下指令读器（目录内与向上各层）。
 */
var rulesInstructionReaders = (context, reportWithheld) => ({
  within: instructionReaderWithin(context, reportWithheld),
  above: (segments) =>
    instructionReaderWithin(spellingsAwareReader(context, segments, CLAUDE_RULES_DIR), reportWithheld),
});
//@ chunk-5xgkngpb.js:1326792-1326874 placement
/**
 * 判断当前配置是否限制了指令文件读取（拒绝规则、受限模式、禁止读工作目录外）。
 */
var isInstructionReadRestricted = (context) =>
  hasReadDenyRuleInForce(context) ||
  context.restricted === true ||
  context.blockReadsOutsideWorkingDirectories === true;
export {
  isInstructionReadRestricted,
  readableInstructionSpellings,
  isFileReadDenied_2,
  isFileReadDenied,
  WALK_FLUSH_INTERVAL,
  withheldInstructionStateSlot,
  takeOwedInstructionFiles,
  seenWithheldPaths,
  DEFAULT_READ_TIMEOUT_MS,
  filterManagedInstructions,
  rulesInstructionReaders,
  takeShownInstructionFiles,
  clearOwedInstructionFiles,
  recordWithheldInstructionFiles,
  logWithheldInstructionFiles,
  MAX_TRACKED_INSTRUCTION_PATHS,
  createReadThrottle,
  pathSpellingsForRead,
  isInstructionPathRefused,
  readDirIfSpellingsStable,
  stashAttachedReadPermission,
  checkPathRefused,
  claudeMdAccessTrackerSlot,
  readPinnedFile,
  matchesExpectedSpellings,
  isDeviceNamespacePath,
  spellingsForReadOrFallback,
  withheldInstructionNotice,
  moreInstructionFilesText,
  INSTRUCTION_FILE_NAMES,
  PATH,
  INSTRUCTION_WITHHELD_REASONS,
  MAX_SHOWN_INSTRUCTION_FILES,
  withheldMemoryPaths,
  nfcLowerPath,
  indexLinkedMemoryPaths,
  restrictedInstructionReaders,
  repoInstructionReaders,
  instructionFilesInDir,
  instructionReadText,
  DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
};
