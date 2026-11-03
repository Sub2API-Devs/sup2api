/**
 * utils/instructionFileAccess.ts
 *
 * 2.1.316 新增：指令文件（CLAUDE.md 等）访问跟踪
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (73)
 * attribution: placement 73
 */
import { isAbsolute, join, resolve as resolve_2, dirname, parse, sep } from "path";
import { randomUUID } from "crypto";
import { open } from "fs/promises";
import { constants } from "fs";
import { setImmediate as THo } from "timers/promises";
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
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";

//@ chunk-e6aww6q8.js:1318890-1318918 placement
/**
 * 宿主/会话级 CLAUDE.md 访问跟踪器槽位。
 */
var claudeMdAccessTrackerSlot = new SessionRootSlot(() => new ClaudeMdAccessTracker());
//@ chunk-e6aww6q8.js:1318918-1319092 placement
/**
 * 从记忆索引内容中提取链接的相对路径（排除绝对路径、带协议的、含 .. 的），拼到记忆目录下。
 */
function indexLinkedMemoryPaths(indexContent, memoryDir) {
  return [...indexContent.matchAll(MD_LINK_RE)]
    .map((r) => r[1].trim())
    .filter((r) => !isAbsolute(r) && !/^[a-z][a-z0-9+.-]*:/i.test(r) && !r.split(/[\\/]/).includes(".."))
    .map((r) => join(memoryDir, r));
}
//@ chunk-e6aww6q8.js:1319092-1319152 placement = setCwdState (1)
function nfcLowerPath(cwd) {
  return resolve_2(cwd).normalize("NFC").toLowerCase();
}
//@ chunk-e6aww6q8.js:1319152-1319163 placement
/**
 * 跟踪指令文件路径的数量上限（日志/待记账/已见各一份）。
 */
var MAX_TRACKED_INSTRUCTION_PATHS = 200;
//@ chunk-e6aww6q8.js:1319163-1319417 placement
/**
 * 指令文件未加载的原因说明（Read 拒绝规则、工作目录外、无法判定、无法确定指向）。
 */
var INSTRUCTION_WITHHELD_REASONS = {
  denied: "a Read deny rule covers it",
  outside: "it's read from outside your working directories, where reads are blocked",
  unjudged: "a Read deny rule couldn't be checked without a working directory",
  unsettled: "where it leads couldn't be worked out",
};
//@ chunk-e6aww6q8.js:1319455-1319531 placement
/**
 * 会话级的"被扣留指令文件"状态（待记账、已记录、一次性 token、已见集合）。
 */
var withheldInstructionStateSlot = new SessionRootSlot(() => ({
  owed: new Map(),
  logged: new Set(),
  token: randomUUID(),
  seen: new Set(),
}));
//@ chunk-e6aww6q8.js:1319531-1319680 placement
/**
 * 为未加载的指令文件记录调试日志（每个路径一次，总数有上限）。
 */
function logWithheldInstructionFiles(e, n) {
  let { logged } = withheldInstructionStateSlot.of(e);
  for (let { path, why } of n)
    if (!logged.has(path) && logged.size < MAX_TRACKED_INSTRUCTION_PATHS) {
      logged.add(path);
      logForDebugging(`Instruction file not loaded: ${path} (${INSTRUCTION_WITHHELD_REASONS[why]})`);
    }
}
//@ chunk-e6aww6q8.js:1319680-1319795 placement
/**
 * 记录因 Read 规则未加载的指令文件：写调试日志，交互会话中再登记到 owed 表（有上限），以便之后作为附件告知。
 */
function recordWithheldInstructionFiles(e, n) {
  let { owed } = withheldInstructionStateSlot.of(e);
  logWithheldInstructionFiles(e, n);
  for (let s of getIsNonInteractiveSession() ? [] : n)
    if (!owed.has(s.path) && owed.size < MAX_TRACKED_INSTRUCTION_PATHS) owed.set(s.path, s);
}
//@ chunk-e6aww6q8.js:1319795-1319861 placement
/**
 * 从待记账集合中移除已处理的指令文件。
 */
function clearOwedInstructionFiles(e, n) {
  let { owed } = withheldInstructionStateSlot.of(e);
  for (let s of n) owed.delete(s);
}
//@ chunk-e6aww6q8.js:1319861-1319957 placement
/**
 * 取走（清空并返回）待记账的指令文件路径。
 */
function takeOwedInstructionFiles(e, n) {
  let { owed } = withheldInstructionStateSlot.of(e);
  for (let s of n) owed.delete(s);
  return Array.from(owed.values());
}
//@ chunk-e6aww6q8.js:1319957-1319973 placement
var PATH = "path:";
//@ chunk-e6aww6q8.js:1319973-1319984 placement
/**
 * 提示中最多列出的未加载指令文件数。
 */
var MAX_SHOWN_INSTRUCTION_FILES = 20;
//@ chunk-e6aww6q8.js:1319984-1320238 placement
/**
 * 从消息的 withheld_memory 附件中收集指定来源扣留的记忆文件路径。
 */
var withheldMemoryPaths = (e, token) =>
  new Set(
    e
      .flatMap((r) => (r.type === "attachment" ? [r.attachment] : []))
      .flatMap((r) => (r.type === "withheld_memory" ? [r] : []))
      .flatMap((r) => (r.by === token ? [r.entries] : []))
      .flatMap((r) => (Array.isArray(r) ? r : []))
      .flatMap((r) => (typeof r?.path === "string" ? [r.path] : [])),
  );
//@ chunk-e6aww6q8.js:1320238-1320369 placement
/**
 * 合并会话中已记录的与消息中出现的被扣留路径（记录数有上限）。
 */
function seenWithheldPaths(e, n) {
  let { seen, token } = withheldInstructionStateSlot.of(e.session);
  let h = withheldMemoryPaths(n, token);
  for (let y of h) if (seen.size < MAX_TRACKED_INSTRUCTION_PATHS) seen.add(y);
  return new Set([...seen, ...h]);
}
//@ chunk-e6aww6q8.js:1320369-1320496 placement
/**
 * 构造"指令文件未加载"提示的显示片段（原因说明、路径标记与截断后的路径）。
 */
var withheldInstructionNotice = (e, displayPath) => ({
  lead: `Instruction file not loaded (${INSTRUCTION_WITHHELD_REASONS[e]}):`,
  mark: PATH,
  path: truncatePathForDisplay_2(displayPath.replace(/\s+/g, " ")).replace(/\s+/g, " "),
});
//@ chunk-e6aww6q8.js:1320496-1320573 placement
/**
 * 生成"另有 N 个指令文件未加载"的文案。
 */
var moreInstructionFilesText = (e) => `and ${e.more} more instruction ${plural(e.more, "file")} not loaded`;
//@ chunk-e6aww6q8.js:1320573-1320641 placement
/**
 * 把列表截断为"展示前 N 个 + 剩余数量"。
 */
var takeShownInstructionFiles = (withheldInstructionFiles) => ({
  shown: withheldInstructionFiles.slice(0, MAX_SHOWN_INSTRUCTION_FILES),
  more: Math.max(withheldInstructionFiles.length - MAX_SHOWN_INSTRUCTION_FILES, 0),
});
//@ chunk-e6aww6q8.js:1320687-1320698 placement
/**
 * 目录中按名查找的指令文件名清单。
 */
var INSTRUCTION_FILE_NAMES = [];
//@ chunk-e6aww6q8.js:1320698-1320744 placement
/**
 * 列出目录下所有指令文件路径。
 */
function instructionFilesInDir(e) {
  return INSTRUCTION_FILE_NAMES.map((n) => join(e, n));
}
//@ chunk-e6aww6q8.js:1320744-1320841 placement
/**
 * 托管指令专用模式下只保留 Managed 类型的指令文件。
 */
function filterManagedInstructions(e, options) {
  if (options.managedInstructionsOnly) return e.filter((r) => r.type === "Managed");
  return e;
}
//@ chunk-e6aww6q8.js:1320841-1320897 placement = getFileIdentity (0.794)
var getFileIdentity_5 = (e, n) => !isSentinelInode(e.ino) && e.dev === n.dev && e.ino === n.ino;
//@ chunk-e6aww6q8.js:1320930-1320995 placement
/**
 * 判断路径是否指向设备命名空间/Windows 设备（不可作为普通文件读取）。
 */
var isDeviceNamespacePath = (e) =>
  isNetworkRelatedPath(e.replace(/^\/{2,}/, "/")) || (getPlatform() === "windows" && isNonWslUncPath(e));
//@ chunk-e6aww6q8.js:1321031-1321043 placement
/**
 * 默认的指令文件读取超时（毫秒）。
 */
var DEFAULT_READ_TIMEOUT_MS = 1000;
//@ chunk-e6aww6q8.js:1321043-1321054 placement
/**
 * 路径遍历时批量刷新缓存的间隔（每 N 次）。
 */
var WALK_FLUSH_INTERVAL = 50;
//@ chunk-e6aww6q8.js:1321054-1321065 placement
var MAX_SYMLINK_HOPS = 40;
//@ chunk-e6aww6q8.js:1321065-1321076 placement
var MAX_RESOLVED_SEGMENTS = 32;
//@ chunk-e6aww6q8.js:1321122-1321365 placement
async function isWalkUnresolved(e, n) {
  return e.unresolved &&
    e.reason === "unexamined" &&
    isWslUncPath(e.requested) &&
    dirname(e.stoppedAt) === parse(e.stoppedAt).root
    ? raceWithAbortSignal(
        getFsImplementation()
          .lstat(parse(e.stoppedAt).root)
          .then(
            () => true,
            (error) => !isPathAbsent(error),
          ),
        n,
        () => Error("cut short"),
      ).catch(() => true)
    : e.unresolved;
}
//@ chunk-e6aww6q8.js:1321410-1321508 placement
async function resolveLandingOnWindows(path, signal) {
  let r = await walkPermissionCheckPathsAsync(path, signal);
  return (await isWalkUnresolved(r, signal)) ? undefined : r.unresolved ? path : r.landing;
}
//@ chunk-e6aww6q8.js:1321508-1321553 placement
var raceWithCutShort = (e, signal) => raceWithAbortSignal(e, signal, () => Error("cut short"));
//@ chunk-e6aww6q8.js:1321553-1321714 placement
async function isSymlinkPath(e) {
  try {
    return (await getFsImplementation().lstat(e)).isSymbolicLink();
  } catch (error) {
    if (!(
      !isPathAbsent(error) &&
      (await getFsImplementation()
        .openDirNoFollow(e)
        .then(
          () => true,
          () => false,
        ))
    ))
      throw error;
    return false;
  }
}
//@ chunk-e6aww6q8.js:1321714-1321769 placement
var splitPathSegments = (e) => e.split("/").filter((n) => n !== "" && n !== ".");
//@ chunk-e6aww6q8.js:1321769-1322269 placement
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
      let [y = "", ...S] = pending;
      let w = y === "..";
      let L = w ? dirname(resolved) : join(resolved, y);
      if (isDeviceNamespacePath(L)) return S.includes("..") ? undefined : join(L, ...S);
      let G = !w && (await raceWithCutShort(isSymlinkPath(L), signal));
      let q = G
        ? await raceWithCutShort(getFsImplementation().readlink(L), signal).catch(() => {
            return;
          })
        : "";
      if (q === undefined) return;
      let Se = q.startsWith("/");
      pending = [...splitPathSegments(q), ...S];
      hops += G ? 1 : 0;
      resolved = Se ? "/" : G ? resolved : L;
    }
    return hops > MAX_SYMLINK_HOPS ? undefined : resolved;
  } catch (error) {
    let [, ...S] = pending;
    return isPathAbsent(error) && !S.includes("..") ? join(resolved, ...pending) : undefined;
  }
}
//@ chunk-e6aww6q8.js:1322269-1322586 placement
/**
 * 收集一个路径为做读权限判断所需的全部拼写（各级符号链接展开后的路径与着陆点），超出上限或无法解析时返回 undefined。
 */
async function pathSpellingsForRead(e, signal) {
  let path = isAbsolute(e) ? e : expandPath(e);
  let s = new Set([path]);
  for (let h of s) {
    let y = await walkPermissionCheckPathsAsync(h, signal);
    if (signal.aborted || (await isWalkUnresolved(y, signal))) return;
    y.spellings.forEach((spelling) => s.add(spelling));
    s.add(y.unresolved ? h : y.landing);
    let w =
      h === path && s.size > 1 && getPlatform() !== "windows"
        ? await resolveSymlinksLexically(path, signal)
        : h;
    if (w === undefined || s.size > MAX_RESOLVED_SEGMENTS) return;
    s.add(w);
  }
  return Array.from(s);
}
//@ chunk-e6aww6q8.js:1322586-1322686 placement
async function spellingsUnchanged(e, n, r) {
  let s = await pathSpellingsForRead(e, r);
  return s?.length === n.length && s.every((h, y) => h === n[y]);
}
//@ chunk-e6aww6q8.js:1322686-1322744 placement
var spellingsUnchangedWithLexicalLinks = async (path, n, signal) =>
  (await resolveSymlinksLexically(path, signal)) === resolve_2(path) && spellingsUnchanged(path, n, signal);
//@ chunk-e6aww6q8.js:1322814-1322952 placement
async function withNoSymlinkLeaf(e, n) {
  let r = !isDeviceNamespacePath(e);
  if (r && (await isSymlinkPath(e).catch(() => true))) return;
  let h = await n(e);
  return r && (await isSymlinkPath(e).catch(() => true)) ? undefined : h;
}
//@ chunk-e6aww6q8.js:1322952-1323026 placement
function swallowLoopOrNotDir(e) {
  if (!["ELOOP", "ENOTDIR"].includes(getErrnoCode(e) ?? "")) throw e;
  return;
}
//@ chunk-e6aww6q8.js:1323026-1323360 placement
/**
 * 在 Linux/WSL 上先以 O_DIRECTORY|O_NOFOLLOW 打开目录并钉住，通过 /proc/self/fd 路径执行回调（目录真实路径须在允许列表内）；其他平台或无法取得真实路径时直接按原路径执行。
 */
async function withPinnedDir(symlinksLexically, n, r) {
  if (!["linux", "wsl"].includes(getPlatform())) return withNoSymlinkLeaf(symlinksLexically, r);
  await using h = await open(
    symlinksLexically,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
  ).catch(swallowLoopOrNotDir);
  if (h === undefined) return;
  let S = `/proc/self/fd/${h.fd}`;
  let w = await readFdTargetPath(h.fd).catch(() => null);
  let L = w === undefined;
  let G = typeof w === "string" && n.includes(w);
  return L ? withNoSymlinkLeaf(symlinksLexically, r) : G ? await r(S) : undefined;
}
//@ chunk-e6aww6q8.js:1323360-1323415 placement
var ignoreAfterAbort = (e) =>
  function (r) {
    if (!e.aborted) throw r;
    return;
  };
//@ chunk-e6aww6q8.js:1323415-1323603 placement
/**
 * 在路径拼写集不变的前提下读取目录：Linux 上以 O_NOFOLLOW 打开目录并经 /proc/self/fd 读取，读完再确认拼写未变，否则放弃。
 */
async function readDirIfSpellingsStable(path, n, r) {
  let signal = AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS);
  let symlinksLexically = await resolveSymlinksLexically(path, signal);
  if (!(symlinksLexically !== undefined && n.includes(symlinksLexically))) return;
  let S = await raceWithCutShort(withPinnedDir(symlinksLexically, n, r), signal).catch(
    ignoreAfterAbort(signal),
  );
  return (await spellingsUnchanged(path, n, signal)) ? S : undefined;
}
//@ chunk-e6aww6q8.js:1323603-1323703 placement = getReservedShortcuts (1)
async function checkPathRefused(e, n, r) {
  let s = getPlatform() === "macos";
  return openReadBoundToApproval(
    expandStablePath(e),
    n,
    r,
    s ? await lastExistingIdentity(n) : undefined,
    "refused",
  );
}
//@ chunk-e6aww6q8.js:1323703-1324021 placement
/**
 * 生成一个读文件函数：用 checkPathRefused 打开并固定目标，确认是普通文件后回调读取，并在读后核对文件身份（inode 不可信时重新检查）。
 */
var readPinnedFile = (e, n, r) =>
  async function (h) {
    let y = await checkPathRefused(e, n, r).catch(() => {
      return;
    });
    if (y === undefined) return;
    try {
      let stats = await y.handle.stat({
        bigint: true,
      });
      let L = stats.isFile() ? await h(y, stats) : undefined;
      return (
        isSentinelInode(stats.ino)
          ? await spellingsUnchangedWithLexicalLinks(e, n, r)
          : getFileIdentity_5(stats, await getFsImplementation().statBigint(y.canonicalPath))
      )
        ? L
        : undefined;
    } catch {
      return;
    } finally {
      await y.close().catch(() => {});
    }
  };
//@ chunk-e6aww6q8.js:1324059-1324295 placement
/**
 * 为附带读取的文件暂存一次读权限（生成 attached-read 工具调用 id；macOS 上同时记录文件身份），返回带该 id 的上下文。
 */
async function stashAttachedReadPermission(e, n, r) {
  let s = `attached-read-${randomUUID()}`;
  let h = expandStablePath(e);
  let y = getPlatform() === "macos";
  let S = y ? await lastExistingIdentity(n) : null;
  r.session.writePermissionStash.stash(s, h, n, "read");
  if (y) r.session.writePermissionStash.stashIdentity(s, h, S);
  return {
    ...r,
    toolUseId: s,
  };
}
//@ chunk-e6aww6q8.js:1324295-1324369 placement = isFileReadDenied (1)
var isFileReadDenied = (filePath, toolPermissionContext) =>
  filePath.some(
    (filePath) =>
      matchingRuleForInput(filePath, toolPermissionContext, "read", "deny", {
        isDirectory: true,
      }) !== null,
  );
//@ chunk-e6aww6q8.js:1324369-1324441 placement = isFileReadDenied (1)
var isFileReadDenied_2 = (filePath, toolPermissionContext) =>
  filePath.some((r) => matchingDenyRuleForDirectoryContents(r, toolPermissionContext, "read") !== null) ||
  hasReadDenyRuleForPath(filePath.at(0) ?? "", toolPermissionContext, filePath);
//@ chunk-e6aww6q8.js:1324490-1324705 placement
/**
 * 创建读取节流器：每到一定数量的读取就等前一批全部完成并让出一次，返回本次读取完成时调用的 resolve。
 */
function createReadThrottle() {
  let e = 0;
  let resolved = Promise.resolve();
  let r = [];
  return async function () {
    if (e > 0 && e % WALK_FLUSH_INTERVAL === 0) {
      resolved = Promise.all([resolved, ...r]).then(() => THo());
      r = [];
    }
    e += 1;
    let deferred = Promise.withResolvers();
    r = [...r, deferred.promise];
    await resolved;
    return deferred.resolve;
  };
}
//@ chunk-e6aww6q8.js:1324705-1324790 placement
var isSymlinkToAbsent = async (e, n) =>
  !isDeviceNamespacePath(e) &&
  (await raceWithAbortSignal(isSymlinkPath(e), n, () => Error("cut short")).then(() => false, isPathAbsent));
//@ chunk-e6aww6q8.js:1324844-1325132 placement
async function spellingsBelowFirstLink(e, n) {
  let filtered = e
    .slice(parse(e).root.length)
    .split(sep)
    .filter((y) => y !== "");
  let root = parse(e).root;
  let h = [root];
  for (let [y, S] of filtered.entries()) {
    if (!(h !== undefined && !h.some(isDeviceNamespacePath))) return;
    if (await isSymlinkToAbsent(join(root, S), n)) {
      let L = join(...filtered.slice(y));
      return h?.map((G) => join(G, L));
    }
    root = join(root, S);
    h = await pathSpellingsForRead(root, n);
  }
  return;
}
//@ chunk-e6aww6q8.js:1325132-1325176 placement
/**
 * 读取路径拼写集合，失败时回退到首个链接以下的部分。
 */
var spellingsForReadOrFallback = async (e, n) =>
  (await pathSpellingsForRead(e, n)) ?? spellingsBelowFirstLink(e, n);
//@ chunk-e6aww6q8.js:1325176-1325354 placement
/**
 * 检查路径展开后各段的实际拼写是否与预期完全一致（含 .. 或特殊段时不比较）。
 */
async function matchesExpectedSpellings(e, n, r) {
  let h =
    !e.split(/[\\/]/).includes("..") &&
    !n.some(isDeviceNamespacePath) &&
    (await isSymlinkToAbsent(expandPath(e), r))
      ? await spellingsForReadOrFallback(expandPath(e), r)
      : undefined;
  return h?.length === n.length && h.every((y, S) => y === n[S]);
}
//@ chunk-e6aww6q8.js:1325384-1325477 placement
var isSpelledWithinWorkingDirs = (e, n, r) =>
  n.some((s) =>
    r.some((h) =>
      pathInWorkingPath(e, join(s, ...h), {
        caseFold: false,
        uncShapeParity: true,
      }),
    ),
  );
//@ chunk-e6aww6q8.js:1325477-1325563 placement
var spellingsAwareReader = (e, n, r) => ({
  ...e,
  isHeldOutside: (s, h) => e.isHeldOutside(s, h) && !isSpelledWithinWorkingDirs(s, spellingsToJudge(n), r),
});
//@ chunk-e6aww6q8.js:1325563-1325576 placement
/**
 * 指令文件读取的默认超时（30 秒）。
 */
var DEFAULT_INSTRUCTION_READ_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:1325612-1325678 placement
var absoluteContextRoots = (e) =>
  e.folders.filter((folder) => isAbsolute(folder)).concat(declaredAbsoluteAdditionalDirectories(e.context));
//@ chunk-e6aww6q8.js:1325678-1325767 placement
function cachedSpellingsToJudge(e, n) {
  let r = e.get(n);
  if (r !== undefined) return r;
  let h = spellingsToJudge(n);
  e.set(n, h);
  return h;
}
//@ chunk-e6aww6q8.js:1325767-1325780 placement
var NO_REMAINING_SEGMENTS = [[]];
//@ chunk-e6aww6q8.js:1325780-1325924 placement
function outsideWorkingDirsReason(e, n) {
  if (e === undefined) return "unsettled";
  let s = absoluteContextRoots(n);
  let h = new Map();
  return e.some(
    (S) => !s.some((w) => isSpelledWithinWorkingDirs(S, cachedSpellingsToJudge(h, w), NO_REMAINING_SEGMENTS)),
  )
    ? "outside"
    : undefined;
}
//@ chunk-e6aww6q8.js:1325924-1326303 placement
/**
 * 生成受读规则保护的指令文件读取器：算出路径拼写、用判定函数得出拒绝原因；允许时在超时与大小上限内安全读取文本，否则返回 {why}。
 */
var makeGuardedInstructionReader = (e, n) =>
  async function (s, h) {
    let y = AbortSignal.timeout(n);
    let S = await pathSpellingsForRead(s, y);
    let w = e(S);
    let L =
      S !== undefined &&
      w === undefined &&
      (await withDeadline(
        getFsImplementation()
          .stat(s)
          .catch(() => null),
        n,
      ));
    let G =
      S !== undefined &&
      L &&
      L.isFile() &&
      L.size <= h &&
      (await readPinnedFile(s, S, y)(async (Z, Se) => (Se.size > h ? undefined : Z.handle.readFile())));
    let q = L === undefined || (G === undefined && y.aborted);
    return G
      ? {
          text: G.toString("utf8"),
          why: undefined,
        }
      : {
          text: undefined,
          why: q ? "unsettled" : w,
        };
  };
//@ chunk-e6aww6q8.js:1326303-1326380 placement
var instructionReadDenialReason = (context) =>
  (hasPermissionAuthoredBareReadDeny(context) && "denied") ||
  (getContentRulesForToolName(context, FILE_READ_TOOL_NAME, "deny").length > 0 && "unjudged") ||
  undefined;
//@ chunk-e6aww6q8.js:1326380-1326449 placement
var isNonDirectoryWithinDeadline = (e) =>
  withDeadline(
    getFsImplementation()
      .lstat(e)
      .then(
        (n) => !n.isDirectory(),
        () => false,
      ),
    DEFAULT_READ_TIMEOUT_MS,
  );
//@ chunk-e6aww6q8.js:1326449-1326573 placement
var withWithheldReporting = (e, n) =>
  async function (s, h) {
    let y = await e(s, h);
    let S = y.why !== undefined && (await isNonDirectoryWithinDeadline(s)) !== false;
    n(s, S ? y.why : undefined);
    return y.text;
  };
//@ chunk-e6aww6q8.js:1326573-1326813 placement
/**
 * --restricted 或"禁止读工作目录外"时，构造指令文件读取器 {within, above}，读不到时登记原因；两者都未开启时返回 undefined。
 */
function restrictedInstructionReaders(e, n) {
  let r = instructionReadDenialReason(e.context);
  let s = r !== undefined;
  if (!s && e.context.restricted !== true && e.context.blockReadsOutsideWorkingDirectories !== true) return;
  let y = withWithheldReporting(
    s
      ? async () => ({
          text: undefined,
          why: r,
        })
      : makeGuardedInstructionReader(
          (S) => outsideWorkingDirsReason(S, e),
          DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
        ),
    n,
  );
  return {
    within: y,
    above: () => y,
  };
}
//@ chunk-e6aww6q8.js:1326813-1326992 placement
function instructionReadRefusal(filePath, n) {
  let r = filePath !== undefined && isFileReadDenied_2(filePath, n.context);
  let s = filePath !== undefined && !r && filePath.some((h) => n.isHeldOutside(h, n.context));
  return (filePath === undefined && "unsettled") || (r && "denied") || (s && "outside") || undefined;
}
//@ chunk-e6aww6q8.js:1326992-1327027 placement
var guardedInstructionReader = (e, n) => makeGuardedInstructionReader((r) => instructionReadRefusal(r, e), n);
//@ chunk-e6aww6q8.js:1327027-1327083 placement
/**
 * 用受保护读器读出文本内容。
 */
var instructionReadText =
  (e, n = DEFAULT_READ_TIMEOUT_MS) =>
  async (r, s) =>
    (await guardedInstructionReader(e, n)(r, s)).text;
//@ chunk-e6aww6q8.js:1327083-1327134 placement
var instructionReaderWithin = (e, n) =>
  n === undefined
    ? instructionReadText(e, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS)
    : withWithheldReporting(guardedInstructionReader(e, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS), n);
//@ chunk-e6aww6q8.js:1327134-1327209 placement
/**
 * 判断指令路径是否被 Read 拒绝规则或工作目录限制拦下。
 */
var isInstructionPathRefused = (filePath, n) =>
  isFileReadDenied_2(filePath, n.context) || filePath.some((r) => n.isHeldOutside(r, n.context));
//@ chunk-e6aww6q8.js:1327209-1327291 placement
/**
 * 取可读的指令路径拼写（被拒绝或不可解析时返回 undefined）。
 */
async function readableInstructionSpellings(e, n, signal) {
  let s = await pathSpellingsForRead(e, signal);
  return s === undefined || isInstructionPathRefused(s, n) ? undefined : s;
}
//@ chunk-e6aww6q8.js:1327291-1327438 placement
var INSTRUCTION_FILE_NAMES_2 = [
  ...INSTRUCTION_FILE_NAMES.map((e) => [e]),
  ["CLAUDE.md"],
  ["CLAUDE.local.md"],
  ["AGENTS.md"],
  [".claude", "CLAUDE.md"],
  [".claude", "AGENTS.md"],
  [".claude", "rules"],
];
//@ chunk-e6aww6q8.js:1327438-1327516 placement
/**
 * 仓库级指令读器（目录内与向上各层）。
 */
var repoInstructionReaders = (e, n) => ({
  within: withWithheldReporting(guardedInstructionReader(e, DEFAULT_INSTRUCTION_READ_TIMEOUT_MS), n),
  above: (r) =>
    withWithheldReporting(
      guardedInstructionReader(
        spellingsAwareReader(e, r, INSTRUCTION_FILE_NAMES_2),
        DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
      ),
      n,
    ),
});
//@ chunk-e6aww6q8.js:1327516-1327546 placement
var CLAUDE_RULES_DIR = [[".claude", "rules"]];
//@ chunk-e6aww6q8.js:1327546-1327612 placement
/**
 * .claude/rules 下指令读器（目录内与向上各层）。
 */
var rulesInstructionReaders = (e, n) => ({
  within: instructionReaderWithin(e, n),
  above: (r) => instructionReaderWithin(spellingsAwareReader(e, r, CLAUDE_RULES_DIR), n),
});
//@ chunk-e6aww6q8.js:1327642-1327724 placement
/**
 * 判断当前配置是否限制了指令文件读取（拒绝规则、受限模式、禁止读工作目录外）。
 */
var isInstructionReadRestricted = (e) =>
  hasReadDenyRuleInForce(e) || e.restricted === true || e.blockReadsOutsideWorkingDirectories === true;
export {
  takeShownInstructionFiles,
  withheldInstructionNotice,
  moreInstructionFilesText,
  INSTRUCTION_FILE_NAMES,
  claudeMdAccessTrackerSlot,
  nfcLowerPath,
  indexLinkedMemoryPaths,
  MAX_TRACKED_INSTRUCTION_PATHS,
  logWithheldInstructionFiles,
  restrictedInstructionReaders,
  isInstructionReadRestricted,
  repoInstructionReaders,
  instructionFilesInDir,
  readPinnedFile,
  DEFAULT_READ_TIMEOUT_MS,
  matchesExpectedSpellings,
  isDeviceNamespacePath,
  spellingsForReadOrFallback,
  readableInstructionSpellings,
  isFileReadDenied_2,
  isFileReadDenied,
  WALK_FLUSH_INTERVAL,
  withheldInstructionStateSlot,
  takeOwedInstructionFiles,
  seenWithheldPaths,
  filterManagedInstructions,
  rulesInstructionReaders,
  clearOwedInstructionFiles,
  recordWithheldInstructionFiles,
  createReadThrottle,
  pathSpellingsForRead,
  isInstructionPathRefused,
  readDirIfSpellingsStable,
  stashAttachedReadPermission,
  checkPathRefused,
  PATH,
  INSTRUCTION_WITHHELD_REASONS,
  MAX_SHOWN_INSTRUCTION_FILES,
  withheldMemoryPaths,
  instructionReadText,
  DEFAULT_INSTRUCTION_READ_TIMEOUT_MS,
};
