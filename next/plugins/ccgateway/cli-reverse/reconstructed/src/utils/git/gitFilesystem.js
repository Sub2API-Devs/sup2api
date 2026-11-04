/**
 * utils/git/gitFilesystem.ts
 *
 * 不 spawn git 直接读 .git：HEAD、loose ref/packed-refs、commondir、config 中的 origin URL；GitFileWatcher 监视并缓存 branch/head/remote/defaultBranch；为 git 子进程固定 GIT_DIR 等环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/git/gitFilesystem.ts
 * pieces: chunk-ca06bv0t.js (1), chunk-dgqyqzy0.js (1), chunk-e6aww6q8.js (1), chunk-s61vbvea.js (1), chunk-t0gq9gyw.js (81), chunk-yj65zw1g.js (1)
 * attribution: fingerprint 9, callgraph-fingerprint 2, placement 2, layout 30, facade-exports 42, file-local 1
 */
import { open, stat, readFile, lstat, realpath, readdir } from "fs/promises";
import { join, resolve, relative, isAbsolute, dirname, sep } from "path";
import {
  lstatSync,
  readlinkSync,
  unwatchFile,
  realpathSync,
  statSync,
  openSync,
  constants,
  fstatSync,
  readSync,
  closeSync,
} from "fs";
import {
  parseGitConfigValue_2,
  firstGitConfigValue,
  readGitConfigValueAsync,
  hasNulByte,
} from "./gitConfigParser.js";
import { REPO_UNREADABLE_RESULT, REPO_NEGATIVE_RESULT, getGitRepoCache } from "./gitRepoCache.js";
import { logForDebugging } from "../debug.js";
import { normalizeGitRemoteUrl, findGitRoot, findGitRootUncached, gitExe } from "../git.js";
import { HostScoped } from "../hostScoped.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import {
  getOriginalCwdOrNull,
  getRootSession,
  waitForScrollIdle,
  isDiskless,
} from "../../bootstrap/state.js";
import { getCwdOrNull } from "../cwd.js";
import { readFileGuarded, isConfigWatchEventsEnabled, watchFileSafe } from "../fsSafety/guardedFileRead.js";
import { isOnForeignMount, isForeignMountPath, isUnderNetworkDirCached } from "../networkPaths.js";
import { getErrnoCode } from "../errors.js";
import { isSafeRefName as isSafeRefName_2 } from "./safeRefName.js";
import { isSentinelInode } from "../slowOperations.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { createSignal } from "../signal.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { withDeadline } from "../sleep.js";
import { logError } from "../log.js";
import { FileStatWatcher } from "../fileStatWatcher.js";
import { identity } from "../pathClassification.js";
import { isPathWithin } from "../fsJunctions.js";
import { O_NONBLOCK } from "../fsFlags.js";
import { lstatErrnoOrFalse } from "./gitDirResolution.js";
import { MAX_PLACEMENT_DEPTH } from "./builderGit/gitConfigAudit.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-t0gq9gyw.js:80246-80537 callgraph-fingerprint = getRemoteUrlForDir (0.543)
/**
 * 读某仓库目录的 git config 解析 origin URL；config 含 NUL、路径不安全或读失败时记录并返回标记值。
 */
function getRemoteUrlForDir_2(cwd) {
  let gitConfigValue = parseGitConfigValue_2(cwd);
  if (gitConfigValue === REPO_UNREADABLE_RESULT)
    logForDebugging(
      `[git] could not read the git config of ${cwd} (a NUL byte, an unsafe path or a read error), so its origin is unknown`,
    );
  if (typeof gitConfigValue !== "string") return gitConfigValue;
  let readOriginValue = (key) => {
    let value = firstGitConfigValue(gitConfigValue, "remote", "origin", key);
    return value ? normalizeGitRemoteUrl(value) : null;
  };
  return readOriginValue("pushurl") ?? readOriginValue("url") ?? REPO_NEGATIVE_RESULT;
}
//@ chunk-t0gq9gyw.js:86395-86531 placement
class TrustGuardHolder {
  guards = null;
  setGuards(guards) {
    this.guards = guards;
  }
  blocked() {
    if (!this.guards) return true;
    try {
      return !this.guards.trustProbe();
    } catch {
      return true;
    }
  }
}
//@ chunk-t0gq9gyw.js:86531-86557 placement
/**
 * 宿主隔离的信任守卫状态注册表。
 */
var trustGuardRegistry; // deferred: uses TrustGuardHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t0gq9gyw.js:86531", () => {
  trustGuardRegistry = new HostScoped(() => new TrustGuardHolder());
});
//@ chunk-t0gq9gyw.js:86622-86684 layout
var PACKED_REFS_CHUNK_BYTES = 65536;
var PACKED_REFS_OVERLAP_BYTES = 4096;
var NEWLINE_CODE = 10;
var SHA256_HEX_LENGTH = 32;
var CARET_CODE = 94;
var SPACE_CODE = 35;
var HEX_STRING_RE = /^[0-9a-f]+$/;
//@ chunk-t0gq9gyw.js:86684-87558 layout
/**
 * 打开 packed-refs，按块二分查找 ref 名，跳过注释与剥离行，自动识别 sha1/sha256 长度；找到返回对象 id，否则 null。
 */
async function lookupPackedRef(gitDir, refName) {
  let buffer = Buffer.from(refName, "utf-8");
  let needle = buffer.length;
  let buffer_2 = Buffer.allocUnsafe(PACKED_REFS_CHUNK_BYTES + 1);
  let handle;
  let fileSize = 0;
  let low = 0;
  let high = 0;
  let mid = 0;
  let chunkLength = 0;
  let readStart = 0;
  let chunkSize = 0;
  let lineStart = 0;
  let hashLength = 0;
  let hashStart = 0;
  let newlineIndex = 0;
  let cmp = 0;
  let hash;
  try {
    handle = await open(join(gitDir, "packed-refs"), "r");
    fileSize = (await handle.stat()).size;
    high = fileSize;
    while (low < high) {
      mid = low + Math.floor((high - low) / 2);
      readStart = Math.max(low, mid - PACKED_REFS_OVERLAP_BYTES);
      chunkSize = (
        await handle.read(buffer_2, 0, Math.min(PACKED_REFS_CHUNK_BYTES, fileSize - readStart), readStart)
      ).bytesRead;
      chunkLength = mid - readStart;
      if (chunkLength >= chunkSize) return null;
      buffer_2[chunkSize] = NEWLINE_CODE;
      lineStart = chunkLength > 0 ? buffer_2.lastIndexOf(NEWLINE_CODE, chunkLength - 1) + 1 : 0;
      if (lineStart > 1 && buffer_2[lineStart] === CARET_CODE)
        lineStart = buffer_2.lastIndexOf(NEWLINE_CODE, lineStart - 2) + 1;
      if (buffer_2[lineStart] === SPACE_CODE) {
        newlineIndex = buffer_2.indexOf(NEWLINE_CODE, lineStart);
        low = readStart + (newlineIndex < 0 || newlineIndex >= chunkSize ? chunkSize : newlineIndex + 1);
        continue;
      }
      if (hashLength === 0)
        hashLength = lineStart + 40 < chunkSize && buffer_2[lineStart + 40] === SHA256_HEX_LENGTH ? 40 : 64;
      hashStart = lineStart + hashLength + 1;
      if (hashStart >= chunkSize) return null;
      cmp = buffer_2.compare(buffer, 0, needle, hashStart, Math.min(hashStart + needle, chunkSize));
      if (cmp === 0) {
        if (hashStart + needle < chunkSize && buffer_2[hashStart + needle] !== NEWLINE_CODE) {
          high = readStart + lineStart;
          continue;
        }
        hash = buffer_2.toString("ascii", lineStart, lineStart + hashLength);
        return HEX_STRING_RE.test(hash) ? hash : null;
      }
      if (cmp < 0) {
        newlineIndex = buffer_2.indexOf(NEWLINE_CODE, chunkLength);
        if (newlineIndex < 0 || newlineIndex >= chunkSize) newlineIndex = chunkSize - 1;
        if (newlineIndex + 1 < chunkSize && buffer_2[newlineIndex + 1] === CARET_CODE) {
          newlineIndex = buffer_2.indexOf(NEWLINE_CODE, newlineIndex + 1);
          if (newlineIndex < 0 || newlineIndex >= chunkSize) newlineIndex = chunkSize - 1;
        }
        low = readStart + newlineIndex + 1;
      } else high = readStart + lineStart;
    }
    return null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}
//@ chunk-t0gq9gyw.js:87558-87598 facade-exports
function clearResolveGitDirCache() {
  getGitRepoCache().gitDirByCwd.clear();
}
//@ chunk-t0gq9gyw.js:87598-87749 facade-exports
async function resolveGitDir(cwd) {
  let startPath = cwd ?? (isRemoteSessionAvailable() ? getOriginalCwdOrNull() : getCwdOrNull());
  if (startPath === null) return null;
  let resolved = resolve(startPath);
  let cached = getGitRepoCache().gitDirByCwd.get(resolved);
  if (cached !== undefined) return cached;
  return resolveGitDirForCwd(resolved, findGitRoot(resolved));
}
//@ chunk-t0gq9gyw.js:87749-87802 facade-exports
async function refreshGitDir(cwd) {
  let resolved = resolve(cwd);
  return resolveGitDirForCwd(resolved, findGitRootUncached(resolved));
}
//@ chunk-t0gq9gyw.js:87802-88271 layout
/**
 * 解析目录的 git 目录（.git 文件中的 gitdir 指针，带安全检查与缓存）。
 */
async function resolveGitDirForCwd(cwd, gitRoot) {
  let gitDirByCwd = getGitRepoCache().gitDirByCwd;
  if (!gitRoot) {
    gitDirByCwd.set(cwd, null);
    return null;
  }
  let dotGitPath = join(gitRoot, ".git");
  try {
    if ((await stat(dotGitPath)).isFile()) {
      let fileGuarded = await readFileGuarded(dotGitPath, GIT_POINTER_MAX_BYTES, {
        sniffEncoding: true,
        withBytes: true,
      });
      if (fileGuarded === null || fileGuarded.truncated) {
        gitDirByCwd.set(cwd, null);
        return null;
      }
      let trimmed = fileGuarded.content.trim();
      if (trimmed.startsWith("gitdir:")) {
        let trimmed_2 = trimmed.slice(7).trim();
        if (isOnForeignMount(trimmed_2, gitRoot)) {
          gitDirByCwd.set(cwd, null);
          return null;
        }
        let resolvedGitDir = resolve(gitRoot, trimmed_2);
        if (isPointerPathUnsafe(trimmed_2, gitRoot)) {
          gitDirByCwd.set(cwd, null);
          return null;
        }
        gitDirByCwd.set(cwd, resolvedGitDir);
        return resolvedGitDir;
      }
    }
    gitDirByCwd.set(cwd, dotGitPath);
    return dotGitPath;
  } catch {
    gitDirByCwd.set(cwd, null);
    return null;
  }
}
//@ chunk-t0gq9gyw.js:88271-88470 layout
function lstatKind(path) {
  try {
    let stats = lstatSync(path);
    if (stats.isSymbolicLink()) return "symlink";
    return stats.isFile() ? "file" : stats.isDirectory() ? "dir" : "special";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-t0gq9gyw.js:88470-88641 facade-exports
function readLinkTextSafe(linkPath) {
  try {
    let raw = readlinkSync(linkPath, {
      encoding: "buffer",
    });
    let str = raw.toString("utf-8");
    if (str.includes("\x00") || !Buffer.from(str, "utf-8").equals(raw)) return null;
    return str;
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:88641-88740 facade-exports
function pointerFileIsSuspect(filePath, baseDir) {
  if (!walkPathSafely(filePath, baseDir)) return true;
  let kind = lstatKind(filePath);
  return kind === "symlink" || kind === "special" || kind === "other";
}
//@ chunk-t0gq9gyw.js:88740-88814 file-local
function isSafeRefName(filePath, baseDir) {
  let relPath = relative(baseDir, filePath);
  return !(relPath === "" || relPath.startsWith("..") || isAbsolute(relPath));
}
//@ chunk-t0gq9gyw.js:88814-88867 facade-exports
function readPositionIsUnsafe(filePath, baseDir) {
  if (!isSafeRefName(filePath, baseDir)) return true;
  return !walkPathSafely(filePath, baseDir);
}
//@ chunk-t0gq9gyw.js:88867-88899 layout
function isPathOnForeignMount(path, baseDir) {
  return isOnForeignMount(path, baseDir);
}
//@ chunk-t0gq9gyw.js:88899-88939 layout
var SEPARATOR_RUN_RE = /\/+/;
var TRAILING_SEPARATOR_RE = /\/$/;
var LEADING_SLASH_RE = /^\//;
var LEADING_SLASH_ANCHORED_RE = /^\//;
//@ chunk-t0gq9gyw.js:88939-89847 layout
/**
 * 逐段检查路径（拒绝特殊文件、记录链接与缺失）。
 */
function walkPathSafely(
  startPath,
  baseDir,
  hopsLeft = 40,
  mountBase = baseDir,
  allowSpecial = false,
  report,
  tailParts = Number.POSITIVE_INFINITY,
  memo,
) {
  if (hopsLeft <= 0) return false;
  let match = LEADING_SLASH_ANCHORED_RE.exec(startPath);
  let currentPath = match ? match[0] : "";
  let parts = startPath.slice(currentPath.length).split(SEPARATOR_RUN_RE);
  let min = Math.min(tailParts, parts.length);
  for (let j = 0; j < parts.length; j++) {
    let segment = parts[j];
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      currentPath = dirname(currentPath);
      if (report && j >= parts.length - min) report.missingTail = null;
      continue;
    }
    currentPath = join(currentPath, segment);
    if (isForeignMountPath(currentPath, mountBase) || isUnderNetworkDirCached(currentPath)) return false;
    let kind = memo ? memoizedCall(memo.kinds, currentPath, lstatKind) : lstatKind(currentPath);
    if (
      report &&
      report.stoppedAt === undefined &&
      (kind === "absent" || kind === "other" || (kind === "special" && !allowSpecial))
    )
      report.stoppedAt = {
        path: currentPath,
        kind,
      };
    if (kind === "other" || (kind === "special" && !allowSpecial)) return false;
    if (kind === "absent" && report && report.missingTail === undefined)
      report.missingTail = j >= parts.length - min ? parts.length - j : null;
    if (kind === "symlink") {
      if (report) report.throughLink = true;
      let linkText = memo
        ? memoizedCall(memo.linkTexts, currentPath, readLinkTextSafe)
        : readLinkTextSafe(currentPath);
      if (linkText === null) return false;
      if (isPathOnForeignMount(linkText, dirname(currentPath))) return false;
      let nextPath = LEADING_SLASH_RE.test(linkText) ? linkText : dirname(currentPath) + sep + linkText;
      let joined = parts.slice(j + 1).join(sep);
      let restPath = joined
        ? TRAILING_SEPARATOR_RE.test(nextPath)
          ? nextPath + joined
          : nextPath + sep + joined
        : nextPath;
      return walkPathSafely(
        restPath,
        baseDir,
        hopsLeft - 1,
        mountBase,
        allowSpecial,
        report,
        Math.min(min, parts.length - j - 1),
        memo,
      );
    }
  }
  if (report && report.missingTail === undefined) report.missingTail = 0;
  return true;
}
//@ chunk-t0gq9gyw.js:89847-89902 facade-exports
function createWalkMemo() {
  return {
    kinds: new Map(),
    linkTexts: new Map(),
  };
}
//@ chunk-t0gq9gyw.js:89902-89988 layout
function memoizedCall(memo, key, compute) {
  let value = memo.get(key);
  if (value === undefined && !memo.has(key)) {
    value = compute(key);
    memo.set(key, value);
  }
  return value;
}
//@ chunk-t0gq9gyw.js:89988-90249 layout
function isPointerPathUnsafe(pointer, baseDir, mountBase = baseDir, allowSpecial = false, report, memo) {
  let spelledPath = LEADING_SLASH_RE.test(pointer) ? pointer : baseDir + sep + pointer;
  let resolved = resolve(baseDir, pointer);
  let reportForSpelled = resolved === spelledPath ? report : undefined;
  if (report && !reportForSpelled) report.throughLink = true;
  if (
    !walkPathSafely(
      spelledPath,
      baseDir,
      undefined,
      mountBase,
      allowSpecial,
      reportForSpelled,
      undefined,
      memo,
    )
  ) {
    if (report) report.missingTail = null;
    return true;
  }
  if (resolved === spelledPath) return false;
  if (report) report.missingTail = null;
  return !walkPathSafely(resolved, baseDir, undefined, mountBase, allowSpecial, undefined, undefined, memo);
}
//@ chunk-t0gq9gyw.js:90249-90287 facade-exports
function rawPointerPathIsUnsafe(pointer, cwd, mountBase = cwd) {
  return isPointerPathUnsafe(pointer, cwd, mountBase);
}
//@ chunk-t0gq9gyw.js:90287-90450 facade-exports
function rawPointerPathWalk(gitDir, cwdState, memo) {
  let report = {
    missingTail: undefined,
  };
  return {
    unsafe: isPointerPathUnsafe(gitDir, cwdState, cwdState, false, report, memo),
    missingTail: report.missingTail ?? null,
    stoppedAt: report.stoppedAt,
    throughLink: report.throughLink ?? false,
  };
}
//@ chunk-t0gq9gyw.js:90450-90488 facade-exports
function linkChainIsUnsafeToFollow(pointer, cwd) {
  return isPointerPathUnsafe(pointer, cwd, cwd, true);
}
//@ chunk-t0gq9gyw.js:90488-90560 facade-exports
function isValidGitSha(s) {
  return /^[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s);
}
//@ chunk-t0gq9gyw.js:90560-91195 facade-exports = readGitHead (0.817)
/**
 * 不 spawn git 直接读 <gitDir>/HEAD：`ref: refs/heads/x` 返回分支，40/64 位 hex 返回 detached sha；reftable 仓库回退 git symbolic-ref。
 */
async function readGitHead(gitDir) {
  try {
    if (readPositionIsUnsafe(join(gitDir, "HEAD"), gitDir)) return null;
    let content = (await readFile(join(gitDir, "HEAD"), "utf-8")).trim();
    if (content.startsWith("ref:")) {
      let ref = content.slice(4).trim();
      if (ref === REFS_HEADS_INVALID) {
        let symrefResult = await runGitForWatcher(gitDir, ["symbolic-ref", "-q", "--no-recurse", "HEAD"]);
        if (symrefResult?.exitCode === 1) {
          let ref = await resolveRef(gitDir, "HEAD");
          return ref
            ? {
                type: "detached",
                sha: ref,
              }
            : null;
        }
        if (symrefResult === null || symrefResult.code !== 0) return null;
        ref = symrefResult.stdout.trim();
      }
      if (ref.startsWith("refs/heads/")) {
        let name = ref.slice(11);
        if (!isSafeRefName_2(name)) return null;
        return {
          type: "branch",
          name,
        };
      }
      if (!isSafeRefName_2(ref)) return null;
      let sha = await resolveRef(gitDir, ref);
      return sha
        ? {
            type: "detached",
            sha,
          }
        : {
            type: "detached",
            sha: "",
          };
    }
    if (!isValidGitSha(content)) return null;
    return {
      type: "detached",
      sha: content,
    };
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:91195-91551 facade-exports = resolveRef (0)
/**
 * 把 ref 解析成 sha：先在 gitDir 再在 commondir 查 loose ref 文件与 packed-refs，最多跟随 5 层符号引用；reftable 时用 git show-ref。
 */
async function resolveRef(gitDir, refName, hopsLeft = 5) {
  if (hopsLeft <= 0) return null;
  if (await keepsRefsInReftable(gitDir)) {
    if (refName !== "HEAD" && (!refName.startsWith("refs/") || !isSafeRefName_2(refName))) return null;
    let result = await runGitForWatcher(gitDir, [
      "show-ref",
      "--verify",
      "--hash",
      "--end-of-options",
      refName,
    ]);
    let sha = result?.code === 0 ? result.stdout.trim() : null;
    return sha !== null && isValidGitSha(sha) ? sha : null;
  }
  let refInDir = await resolveRefInDir(gitDir, refName, hopsLeft);
  if (refInDir) return refInDir;
  let commonDir = await getCommonDir(gitDir);
  if (commonDir && commonDir !== gitDir) return resolveRefInDir(commonDir, refName, hopsLeft);
  return null;
}
//@ chunk-t0gq9gyw.js:91551-91831 fingerprint = resolveRefInDir (1)
/**
 * 在单个 git 目录中按 loose 文件 → packed-refs 顺序查找 ref。
 */
async function resolveRefInDir(gitDir, refName, hopsLeft) {
  try {
    if (readPositionIsUnsafe(join(gitDir, refName), gitDir)) return null;
    let content = (await readFile(join(gitDir, refName), "utf-8")).trim();
    if (content.startsWith("ref:")) {
      let target = content.slice(4).trim();
      if (!isSafeRefName_2(target)) return null;
      return resolveRef(gitDir, target, hopsLeft - 1);
    }
    if (!isValidGitSha(content)) return null;
    return content;
  } catch {}
  if (readPositionIsUnsafe(join(gitDir, "packed-refs"), gitDir)) return null;
  return lookupPackedRef(gitDir, refName);
}
//@ chunk-t0gq9gyw.js:91831-91845 facade-exports
var GIT_POINTER_MAX_BYTES = 65536;
//@ chunk-t0gq9gyw.js:91845-92117 facade-exports
/**
 * 读 <gitDir>/commondir 并解析为绝对路径（限 64KB、拒绝不安全路径）。
 */
async function getCommonDir(gitDir) {
  try {
    if (pointerFileIsSuspect(join(gitDir, "commondir"), gitDir)) return null;
    let fileGuarded = await readFileGuarded(join(gitDir, "commondir"), GIT_POINTER_MAX_BYTES, {
      sniffEncoding: true,
      withBytes: true,
    });
    if (fileGuarded === null || fileGuarded.truncated) return null;
    let trimmed = fileGuarded.content.trim();
    if (isOnForeignMount(trimmed, gitDir)) return null;
    if (isPointerPathUnsafe(trimmed, gitDir)) return null;
    return resolve(gitDir, trimmed);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:92117-92607 layout
async function resolveSymrefTarget(commonDir, refName, prefix) {
  if (await keepsRefsInReftable(commonDir)) {
    if (!refName.startsWith("refs/") || !isSafeRefName_2(refName)) return null;
    let result = await runGitForWatcher(commonDir, [
      "symbolic-ref",
      "-q",
      "--no-recurse",
      "--end-of-options",
      refName,
    ]);
    let stdout = result?.code === 0 ? result.stdout.trim() : "";
    if (!stdout.startsWith(prefix)) return null;
    let sliced = stdout.slice(prefix.length);
    return isSafeRefName_2(sliced) ? sliced : null;
  }
  try {
    if (readPositionIsUnsafe(join(commonDir, refName), commonDir)) return null;
    let trimmed = (await readFile(join(commonDir, refName), "utf-8")).trim();
    if (trimmed.startsWith("ref:")) {
      let trimmed_2 = trimmed.slice(4).trim();
      if (trimmed_2.startsWith(prefix)) {
        let sliced = trimmed_2.slice(prefix.length);
        if (!isSafeRefName_2(sliced)) return null;
        return sliced;
      }
    }
  } catch {}
  return null;
}
//@ chunk-t0gq9gyw.js:92607-92649 layout
var REFS_HEADS_INVALID = "refs/heads/.invalid";
var INVALID_HEAD_REF = 5000;
var GIT_PROBE_RETRIES = 3;
//@ chunk-t0gq9gyw.js:92649-92697 layout
function isGitSpawnBlocked() {
  return trustGuardRegistry.of(getRootSession().host).blocked();
}
//@ chunk-t0gq9gyw.js:92697-92866 facade-exports = readRawSymref (0.832)
/**
 * 读 HEAD 原始内容判断是否为 reftable（refs/heads/.invalid）布局。
 */
async function keepsRefsInReftable(gitDir) {
  if (readPositionIsUnsafe(join(gitDir, "HEAD"), gitDir)) return false;
  try {
    let content = (await readFile(join(gitDir, "HEAD"), "utf-8")).trim();
    return content.startsWith("ref:") && content.slice(4).trim() === REFS_HEADS_INVALID;
  } catch {
    return false;
  }
}
//@ chunk-t0gq9gyw.js:92866-93644 layout
async function runGitForWatcher(gitDir, args) {
  if (isGitSpawnBlocked()) return null;
  let commonDir = (await getCommonDir(gitDir)) ?? gitDir;
  let originalCwdOrNull = getOriginalCwdOrNull();
  let sessionGitDir = originalCwdOrNull === null ? null : await resolveGitDir(originalCwdOrNull);
  if (sessionGitDir === null) return null;
  let [realGitDir, realCommonDir, sessionCommonDir] = await Promise.all([
    realpathAsyncOrNull(gitDir),
    realpathAsyncOrNull(commonDir),
    realpathAsyncOrNull((await getCommonDir(sessionGitDir)) ?? sessionGitDir),
  ]);
  if (
    realGitDir === null ||
    realCommonDir === null ||
    sessionCommonDir === null ||
    (realGitDir !== realCommonDir && dirname(realGitDir) !== join(realCommonDir, "worktrees"))
  )
    return null;
  let [commonDirStats, sessionStats, parentStats] = await Promise.all([
    stat(realCommonDir, {
      bigint: true,
    }).catch(() => null),
    stat(sessionCommonDir, {
      bigint: true,
    }).catch(() => null),
    stat(dirname(realCommonDir), {
      bigint: true,
    }).catch(() => null),
  ]);
  if (commonDirStats === null || !commonDirStats.isDirectory()) return null;
  if (
    !(parentStats !== null &&
    commonDirStats.dev !== 0n &&
    !isSentinelInode(commonDirStats.ino) &&
    !(commonDirStats.dev === parentStats.dev && commonDirStats.ino === parentStats.ino)
      ? sessionStats !== null &&
        commonDirStats.dev === sessionStats.dev &&
        commonDirStats.ino === sessionStats.ino
      : realCommonDir === sessionCommonDir)
  )
    return null;
  let result = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...args], {
    cwd: realGitDir,
    timeout: INVALID_HEAD_REF,
    preserveOutputOnError: false,
    env: getRemoteHostSessionCount(undefined, {
      repository: {
        gitDir: realGitDir,
        commonDir: realCommonDir,
        workTree: null,
      },
    }),
  });
  if (result.exitCode === undefined) getGitFileWatcher().noteInconclusiveRefRead();
  return result;
}
//@ chunk-t0gq9gyw.js:93644-93679 layout
var GIT_WATCH_POLL_MS_2 = 1000;
var GIT_WATCH_POLL_MS = 60000;
var GIT_WATCH_SAFETY_POLL_MS = 200;
var GIT_CHECK_DEADLINE_MS = 100;
//@ chunk-t0gq9gyw.js:93679-93846 layout
async function statFileIdentity(path) {
  try {
    let { dev, ino, size, mtimeNs, ctimeNs, birthtimeNs } = await stat(path, {
      bigint: true,
    });
    return `${dev}:${ino}:${size}:${mtimeNs}:${ctimeNs}:${birthtimeNs}`;
  } catch {
    return "absent";
  }
}
//@ chunk-t0gq9gyw.js:93846-101450 fingerprint = GitFileWatcher (0.399)
/**
 * GitFileWatcher：监视 .git/HEAD、config、当前分支 ref 等文件（fs 事件或轮询），缓存 branch/head/remoteUrl/defaultBranch，变化时失效并通知 onStateChange；也可登记额外仓库跟踪其分支变化。
 */
class GitFileWatcher {
  gitDir = null;
  commonDir = null;
  initialized = false;
  initPromise = null;
  watchedFiles = [];
  filesCheckedOnRead = new Set();
  lastCheckMs = Number.NEGATIVE_INFINITY;
  checkUnderWay = undefined;
  mustCheckAgain = false;
  checkFilesNow = () => {
    this.checkFiles("now");
  };
  repoHeadWatches = new Map();
  stateChangeTimers = new Set();
  branchRefPath = null;
  reftable = false;
  generation = 0;
  cache = new Map();
  computing = new Map();
  inconclusiveRefReads = 0;
  retriesLeft = new Map();
  stateChanged = createSignal();
  repoBranches = new Map();
  repoWatchers = new Map();
  repoBranchListeners = [];
  async ensureStarted() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.start();
    return this.initPromise;
  }
  cleanupHandle = null;
  async start() {
    let generation = this.generation;
    if (isRemoteSessionAvailable()) {
      this.gitDir = null;
      this.initialized = true;
      return;
    }
    let gitDir = await resolveGitDir();
    let reftable = gitDir !== null && (await keepsRefsInReftable(gitDir));
    if (generation !== this.generation) return;
    this.gitDir = gitDir;
    this.reftable = reftable;
    this.initialized = true;
    if (!this.cleanupHandle)
      this.cleanupHandle = registerCleanup(async () => {
        this.stopWatching();
      });
    if (!this.gitDir) return;
    let commonDir = await getCommonDir(this.gitDir);
    if (generation !== this.generation) return;
    this.commonDir = commonDir;
    this.watchPath(join(this.gitDir, "HEAD"), this.gitDir, () => {
      this.onHeadChanged();
    });
    this.watchPath(join(this.commonDir ?? this.gitDir, "config"), this.commonDir ?? this.gitDir, () => {
      this.invalidate();
    });
    this.watchPath(
      join(this.commonDir ?? this.gitDir, "refs", "remotes", "origin", "HEAD"),
      this.commonDir ?? this.gitDir,
      () => {
        this.invalidate();
      },
    );
    if (this.reftable) {
      this.watchPath(join(this.gitDir, "reftable", "tables.list"), this.gitDir, () => {
        this.onHeadChanged();
      });
      if (this.commonDir && this.commonDir !== this.gitDir)
        this.watchPath(join(this.commonDir, "reftable", "tables.list"), this.commonDir, () => {
          this.invalidate();
        });
    }
    await this.watchCurrentBranchRef();
  }
  watchPath(filePath, baseDir, onChange) {
    if (readPositionIsUnsafe(filePath, baseDir)) return;
    this.watchedFiles.push({
      path: filePath,
      stop: this.watchFile(filePath, onChange),
    });
  }
  watchFile(filePath, onChange) {
    if (isConfigWatchEventsEnabled()) {
      let watchedEntry = {
        path: filePath,
        onChange,
        seen: statFileIdentity(filePath),
      };
      this.filesCheckedOnRead.add(watchedEntry);
      return () => this.filesCheckedOnRead.delete(watchedEntry);
    }
    let listener = watchFileSafe(
      filePath,
      {
        interval: GIT_WATCH_POLL_MS_2,
      },
      onChange,
    );
    return () => unwatchFile(filePath, listener);
  }
  checkFiles(mode) {
    if (this.checkUnderWay) {
      this.mustCheckAgain ||= mode === "now";
      return this.checkUnderWay;
    }
    if (
      this.filesCheckedOnRead.size === 0 ||
      (mode === "ifDue" && performance.now() - this.lastCheckMs < GIT_WATCH_POLL_MS_2)
    )
      return;
    this.lastCheckMs = performance.now();
    let identities = new Map();
    for (let { path } of this.filesCheckedOnRead)
      if (!identities.has(path)) identities.set(path, statFileIdentity(path));
    let checkPromise = Promise.all(
      Array.from(this.filesCheckedOnRead, (entry) => this.reportIfChanged(entry, identities.get(entry.path))),
    ).then(() => {
      this.checkUnderWay = undefined;
      if (this.mustCheckAgain) {
        this.mustCheckAgain = false;
        this.checkFilesNow();
      }
    });
    this.checkUnderWay = withDeadline(checkPromise, GIT_CHECK_DEADLINE_MS);
    return this.checkUnderWay;
  }
  async reportIfChanged(entry, identityPromise) {
    let [previousIdentity, identity] = await Promise.all([entry.seen, identityPromise]);
    if (identity === previousIdentity || !this.filesCheckedOnRead.has(entry)) return;
    entry.seen = identityPromise;
    try {
      entry.onChange();
    } catch (error) {
      logError(error);
    }
  }
  async watchCurrentBranchRef() {
    if (!this.gitDir) return;
    let generation = this.generation;
    let head = this.reftable ? null : await readGitHead(this.gitDir);
    if (generation !== this.generation) return;
    let refsDir = this.commonDir ?? this.gitDir;
    let refPath = head?.type === "branch" ? join(refsDir, "refs", "heads", head.name) : null;
    if (refPath === this.branchRefPath) return;
    if (this.branchRefPath) {
      for (let { path, stop } of this.watchedFiles) if (path === this.branchRefPath) stop();
      this.watchedFiles = this.watchedFiles.filter((watchedFile) => watchedFile.path !== this.branchRefPath);
    }
    this.branchRefPath = refPath;
    if (!refPath) return;
    this.watchPath(refPath, refsDir, () => {
      this.invalidate();
    });
  }
  async onHeadChanged() {
    this.invalidate();
    await waitForScrollIdle();
    let branchRefPath = this.branchRefPath;
    await this.watchCurrentBranchRef();
    if (this.branchRefPath !== branchRefPath && this.filesCheckedOnRead.size > 0) {
      await Promise.all(Array.from(this.filesCheckedOnRead, (entry) => entry.seen));
      this.invalidate();
    }
  }
  invalidate() {
    for (let entry of this.cache.values()) entry.dirty = true;
    this.computing.clear();
    this.retriesLeft.clear();
    this.stateChanged.emit();
  }
  onStateChange(listener) {
    let unsubscribe = this.stateChanged.subscribe(listener);
    if (!isConfigWatchEventsEnabled()) return unsubscribe;
    let interval = setInterval(this.checkFilesNow, GIT_WATCH_POLL_MS_2);
    interval.unref();
    this.stateChangeTimers.add(interval);
    return () => {
      clearInterval(interval);
      this.stateChangeTimers.delete(interval);
      unsubscribe();
    };
  }
  stopWatching() {
    for (let { stop } of this.watchedFiles) stop();
    for (let { stop } of this.repoWatchers.values()) stop();
    for (let repoHeadWatch of this.repoHeadWatches.values()) repoHeadWatch.close();
    this.repoHeadWatches.clear();
    this.watchedFiles = [];
    this.branchRefPath = null;
  }
  async get(key, compute) {
    for (;;) {
      let generation = this.generation;
      await this.ensureStarted();
      let checkPromise = this.checkFiles("ifDue");
      if (checkPromise) await checkPromise;
      let cached = this.cache.get(key);
      if (cached && !cached.dirty) return cached.value;
      let inFlight = cached ? undefined : this.computing.get(key);
      if (
        inFlight?.generation === generation &&
        !(inFlight.awaitedTrust && !(this.reftable && isGitSpawnBlocked()))
      ) {
        let value = await inFlight.value;
        if (generation !== this.generation) continue;
        return value;
      }
      if (cached) cached.dirty = false;
      let needsRetry = this.reftable && isGitSpawnBlocked();
      let inconclusiveRefReads = this.inconclusiveRefReads;
      let promise = compute();
      let entry = {
        generation,
        awaitedTrust: needsRetry,
        value: promise,
      };
      this.computing.set(key, entry);
      let value;
      try {
        value = await promise;
      } finally {
        if (this.computing.get(key) === entry) this.computing.delete(key);
      }
      if (generation !== this.generation) continue;
      let dirty = needsRetry || this.retryAfterNoAnswer(key, inconclusiveRefReads);
      let existing = this.cache.get(key);
      if (existing && !existing.dirty) {
        existing.value = value;
        existing.dirty = dirty;
      }
      if (!existing)
        this.cache.set(key, {
          value,
          dirty,
        });
      return value;
    }
  }
  async getDefaultBranchIfKnownAnchored() {
    let branch = await this.get("defaultBranchIfKnown", this.computeDefaultBranchIfKnownAnchored);
    if (branch === null) return branch;
    let commonDir = this.commonDir ?? this.gitDir;
    if (commonDir && (await resolveRef(commonDir, `refs/remotes/origin/${branch}`))) return branch;
    let cached = this.cache.get("defaultBranchIfKnown");
    if (cached) cached.dirty = true;
    return this.get("defaultBranchIfKnown", this.computeDefaultBranchIfKnownAnchored);
  }
  computeDefaultBranchIfKnownAnchored = async () => {
    let gitDir = this.gitDir;
    if (!gitDir) return null;
    let commonDir = this.commonDir ?? gitDir;
    let symrefTarget = await resolveSymrefTarget(
      commonDir,
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/",
    );
    if (symrefTarget && (await resolveRef(commonDir, `refs/remotes/origin/${symrefTarget}`)))
      return symrefTarget;
    return null;
  };
  async addRepo(repoPath) {
    if (this.repoWatchers.has(repoPath)) return;
    let gitDir = await resolveGitDir(repoPath);
    if (!gitDir) return;
    let reftable = await keepsRefsInReftable(gitDir);
    if (this.repoWatchers.has(repoPath)) return;
    let file = reftable ? join(gitDir, "reftable", "tables.list") : join(gitDir, "HEAD");
    if (readPositionIsUnsafe(file, gitDir)) return;
    let stop = this.watchFile(file, () => {
      this.repoBranches.delete(repoPath);
      this.retriesLeft.delete(`repo:${repoPath}`);
      for (let repoBranchListener of this.repoBranchListeners) repoBranchListener();
    });
    if (isConfigWatchEventsEnabled() && !this.repoHeadWatches.has(file))
      this.repoHeadWatches.set(
        file,
        new FileStatWatcher(
          file,
          {
            fallbackPollMs: GIT_WATCH_POLL_MS_2,
            safetyPollMs: GIT_WATCH_POLL_MS,
            settleMs: GIT_WATCH_SAFETY_POLL_MS,
          },
          this.checkFilesNow,
        ),
      );
    this.repoWatchers.set(repoPath, {
      gitDir,
      headPath: file,
      stop,
      reftable,
    });
  }
  removeRepo(repoPath) {
    let watcher = this.repoWatchers.get(repoPath);
    if (!watcher) return;
    watcher.stop();
    this.repoWatchers.delete(repoPath);
    this.repoBranches.delete(repoPath);
    this.retriesLeft.delete(`repo:${repoPath}`);
  }
  onRepoBranchChange(listener) {
    this.repoBranchListeners.push(listener);
    return () => {
      let index = this.repoBranchListeners.indexOf(listener);
      if (index !== -1) this.repoBranchListeners.splice(index, 1);
    };
  }
  async getBranchForRepo(repoPath) {
    let checkPromise = this.checkFiles("ifDue");
    if (checkPromise) await checkPromise;
    if (this.repoBranches.has(repoPath)) return this.repoBranches.get(repoPath);
    let watcher = this.repoWatchers.get(repoPath);
    if (!watcher) return;
    let needsRetry = watcher.reftable && isGitSpawnBlocked();
    let inconclusiveRefReads = this.inconclusiveRefReads;
    let gitHead = await readGitHead(watcher.gitDir);
    let branch = gitHead?.type === "branch" ? gitHead.name : null;
    if (!needsRetry && !this.retryAfterNoAnswer(`repo:${repoPath}`, inconclusiveRefReads))
      this.repoBranches.set(repoPath, branch);
    return branch;
  }
  noteInconclusiveRefRead() {
    this.inconclusiveRefReads++;
  }
  retryAfterNoAnswer(key, seenReads) {
    if (this.inconclusiveRefReads === seenReads) return false;
    let remaining = this.retriesLeft.get(key) ?? GIT_PROBE_RETRIES;
    if (remaining === 0) return false;
    this.retriesLeft.set(key, remaining - 1);
    return true;
  }
  reset() {
    this.generation++;
    this.stopWatching();
    this.cleanupHandle?.();
    this.cleanupHandle = null;
    this.cache.clear();
    this.computing.clear();
    this.retriesLeft.clear();
    this.stateChanged.clear();
    for (let stateChangeTimer of this.stateChangeTimers) clearInterval(stateChangeTimer);
    this.stateChangeTimers.clear();
    this.lastCheckMs = Number.NEGATIVE_INFINITY;
    this.checkUnderWay = undefined;
    this.mustCheckAgain = false;
    this.repoBranches.clear();
    this.repoWatchers.clear();
    this.repoBranchListeners = [];
    this.initialized = false;
    this.initPromise = null;
    this.gitDir = null;
    this.commonDir = null;
    this.reftable = false;
  }
  reanchor() {
    this.generation++;
    for (let { stop } of this.watchedFiles) stop();
    this.watchedFiles = [];
    this.branchRefPath = null;
    this.cache.clear();
    this.computing.clear();
    this.retriesLeft.clear();
    this.initialized = false;
    this.initPromise = null;
    this.gitDir = null;
    this.commonDir = null;
    this.reftable = false;
  }
}
//@ chunk-t0gq9gyw.js:101450-101475 layout
var gitFileWatcherByHost; // deferred: uses GitFileWatcher of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t0gq9gyw.js:101450", () => {
  gitFileWatcherByHost = new HostScoped(() => new GitFileWatcher());
});
//@ chunk-t0gq9gyw.js:101475-101512 layout
/**
 * 取当前宿主的 GitFileWatcher 单例。
 */
function getGitFileWatcher() {
  return gitFileWatcherByHost.of(getRootSession().host);
}
//@ chunk-t0gq9gyw.js:101512-101678 fingerprint = computeHead (1)
async function computeHead() {
  let gitDir = await resolveGitDir();
  if (!gitDir) return "";
  let head = await readGitHead(gitDir);
  if (!head) return "";
  if (head.type === "branch") return (await resolveRef(gitDir, `refs/heads/${head.name}`)) ?? "";
  return head.sha;
}
//@ chunk-t0gq9gyw.js:101678-101820 layout
/**
 * 从 <gitDir>/config 文本解析 remote.origin.pushurl 或 url。
 */
async function readOriginUrlFromConfig(gitDir) {
  if (readPositionIsUnsafe(join(gitDir, "config"), gitDir)) return null;
  return (
    (await readGitConfigValueAsync(gitDir, "remote", "origin", "pushurl")) ||
    (await readGitConfigValueAsync(gitDir, "remote", "origin", "url"))
  );
}
//@ chunk-t0gq9gyw.js:101820-101962 layout
async function computeRemoteUrl() {
  let gitDir = await resolveGitDir();
  if (!gitDir) return null;
  let originUrlFromConfig = await readOriginUrlFromConfig(gitDir);
  if (originUrlFromConfig) return originUrlFromConfig;
  let commonDir = await getCommonDir(gitDir);
  if (commonDir && commonDir !== gitDir) return readOriginUrlFromConfig(commonDir);
  return null;
}
//@ chunk-t0gq9gyw.js:101962-101988 facade-exports
var CONVENTIONAL_DEFAULT_BRANCH_NAMES = ["main", "master"];
//@ chunk-t0gq9gyw.js:101988-102264 fingerprint = computeDefaultBranch (0.831)
/**
 * 不 spawn 计算默认分支：读 refs/remotes/origin/HEAD 符号引用，否则看 origin/main、origin/master 是否存在，默认 main。
 */
async function computeDefaultBranch() {
  let gitDir = await resolveGitDir();
  if (!gitDir) return "main";
  let commonDir = (await getCommonDir(gitDir)) ?? gitDir;
  let branchFromSymref = await resolveSymrefTarget(
    commonDir,
    "refs/remotes/origin/HEAD",
    "refs/remotes/origin/",
  );
  if (branchFromSymref && (await resolveRef(commonDir, `refs/remotes/origin/${branchFromSymref}`)))
    return branchFromSymref;
  for (let candidate of CONVENTIONAL_DEFAULT_BRANCH_NAMES)
    if (await resolveRef(commonDir, `refs/remotes/origin/${candidate}`)) return candidate;
  return "main";
}
//@ chunk-t0gq9gyw.js:102264-102315 facade-exports = getCachedBranch (1)
/**
 * GitFileWatcher 缓存的当前分支名。
 */
function getCachedBranch() {
  return getGitFileWatcher().get("branch", () => getBranchForDir());
}
//@ chunk-t0gq9gyw.js:102315-102357 facade-exports = getCachedHead (1)
/**
 * GitFileWatcher 缓存的 HEAD sha。
 */
function getCachedHead() {
  return getGitFileWatcher().get("head", computeHead);
}
//@ chunk-t0gq9gyw.js:102357-102404 facade-exports = getCachedRemoteUrl (1)
/**
 * GitFileWatcher 缓存的 origin URL（config 中 remote.origin.pushurl 优先于 url）。
 */
function getCachedRemoteUrl() {
  return getGitFileWatcher().get("remoteUrl", computeRemoteUrl);
}
//@ chunk-t0gq9gyw.js:102404-102455 facade-exports = getCachedDefaultBranch (1)
/**
 * GitFileWatcher 缓存的默认分支。
 */
function getCachedDefaultBranch() {
  return getGitFileWatcher().get("defaultBranch", computeDefaultBranch);
}
//@ chunk-t0gq9gyw.js:102455-102516 facade-exports
function getCachedDefaultBranchIfKnown() {
  return getGitFileWatcher().getDefaultBranchIfKnownAnchored();
}
//@ chunk-t0gq9gyw.js:102516-102555 facade-exports
function addWatchedRepo(checkoutPath) {
  return getGitFileWatcher().addRepo(checkoutPath);
}
//@ chunk-t0gq9gyw.js:102555-102590 facade-exports
function removeWatchedRepo(repoPath) {
  getGitFileWatcher().removeRepo(repoPath);
}
//@ chunk-t0gq9gyw.js:102590-102640 facade-exports
function onRepoBranchChange(listener) {
  return getGitFileWatcher().onRepoBranchChange(listener);
}
//@ chunk-t0gq9gyw.js:102640-102711 facade-exports
function onWatchedGitStateChange(listener) {
  let gitFileWatcher = getGitFileWatcher();
  gitFileWatcher.ensureStarted();
  return gitFileWatcher.onStateChange(listener);
}
//@ chunk-t0gq9gyw.js:102711-102759 facade-exports
function getCachedBranchForRepo(checkoutPath) {
  return getGitFileWatcher().getBranchForRepo(checkoutPath);
}
//@ chunk-t0gq9gyw.js:102759-102787 facade-exports
function resetGitFileWatcher() {
  getGitFileWatcher().reset();
}
//@ chunk-t0gq9gyw.js:102787-102817 facade-exports
function reanchorGitFileWatcher() {
  getGitFileWatcher().reanchor();
}
//@ chunk-t0gq9gyw.js:102817-102982 facade-exports = computeHead (1)
async function getHeadForDir(startPath) {
  let gitDir = await resolveGitDir(startPath);
  if (!gitDir) return null;
  let head = await readGitHead(gitDir);
  if (!head) return null;
  if (head.type === "branch") return resolveRef(gitDir, `refs/heads/${head.name}`);
  return head.sha;
}
//@ chunk-t0gq9gyw.js:102982-103100 facade-exports = computeBranch (1)
async function getBranchForDir(startPath) {
  let gitDir = await resolveGitDir(startPath);
  if (!gitDir) return "HEAD";
  let head = await readGitHead(gitDir);
  return head?.type === "branch" ? head.name : "HEAD";
}
//@ chunk-t0gq9gyw.js:103100-103190 layout
var reflogWatchesByGitDir; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var reflogWatchRegistry;
var COMMIT_SUBJECT_RE;
deferInit("chunk-t0gq9gyw.js:103100", () => {
  reflogWatchesByGitDir = new Map();
  reflogWatchRegistry = 4096;
  COMMIT_SUBJECT_RE = /^commit(?: \((?:amend|initial|merge|cherry-pick|rebase)\))?: /;
});
//@ chunk-t0gq9gyw.js:103190-103383 layout
async function getHeadReflogSize(gitDir) {
  if (readPositionIsUnsafe(join(gitDir, "logs", "HEAD"), gitDir)) return null;
  try {
    let stats = await lstat(join(gitDir, "logs", "HEAD"));
    return stats.isFile() ? stats.size : null;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? 0 : null;
  }
}
//@ chunk-t0gq9gyw.js:103383-103828 facade-exports
async function markHeadReflog(cwd) {
  if (isRemoteSessionAvailable()) return;
  let mark;
  try {
    let gitDir = await resolveGitDir(cwd);
    if (gitDir === null) return;
    if (linkChainIsUnsafeToFollow(gitDir, cwd)) return;
    let realGitDir = realpathSync(gitDir);
    let marks = reflogWatchesByGitDir.get(realGitDir) ?? new Set();
    mark = {
      gitDir,
      realGitDir,
      size: 0,
      overlapped: marks.size > 0,
    };
    for (let otherMark of marks) otherMark.overlapped = true;
    reflogWatchesByGitDir.set(realGitDir, marks.add(mark));
    if (await keepsRefsInReftable(gitDir)) {
      let reflogEntries = await readReflogEntries(gitDir, 1);
      if (reflogEntries === undefined) {
        releaseHeadReflogMark(mark);
        return;
      }
      mark.reftableNewest = reflogEntries[0]?.key ?? null;
      return mark;
    }
    let headReflogSize = await getHeadReflogSize(gitDir);
    if (headReflogSize === null) {
      releaseHeadReflogMark(mark);
      return;
    }
    mark.size = headReflogSize;
    return mark;
  } catch {
    if (mark !== undefined) releaseHeadReflogMark(mark);
    return;
  }
}
//@ chunk-t0gq9gyw.js:103828-103913 facade-exports
function releaseHeadReflogMark(mark) {
  for (let [realGitDir, marks] of reflogWatchesByGitDir)
    if (marks.delete(mark)) {
      if (marks.size === 0) reflogWatchesByGitDir.delete(realGitDir);
      return;
    }
}
//@ chunk-t0gq9gyw.js:103913-104542 facade-exports
async function readCommitAppendedToHeadReflog(mark) {
  if (mark.reftableNewest !== undefined) return readNewCommitFromReftable(mark, mark.reftableNewest);
  let reflogPath = join(mark.gitDir, "logs", "HEAD");
  if (mark.overlapped || readPositionIsUnsafe(reflogPath, mark.gitDir)) return;
  let fileGuarded = await readFileGuarded(reflogPath, reflogWatchRegistry, {
    noFollow: true,
    fromTail: true,
    requireNlink1: true,
    verifyHandlePath: (handlePath) => handlePath === join(mark.realGitDir, "logs", "HEAD"),
  });
  if (
    fileGuarded === null ||
    fileGuarded === "unreadable" ||
    fileGuarded.end <= mark.size ||
    !fileGuarded.content.endsWith(`
`)
  )
    return;
  let sliced = fileGuarded.content.slice(0, -1);
  let sliced_2 = sliced.slice(
    sliced.lastIndexOf(`
`) + 1,
  );
  if (sliced_2.includes("\uFFFD") || fileGuarded.end - Buffer.byteLength(sliced_2) - 1 !== mark.size) return;
  let index = sliced_2.indexOf("\t");
  if (index === -1) return;
  let [newId = "", oldId = ""] = sliced_2.slice(0, index).split(" ");
  if (
    !isValidGitSha(newId) ||
    !isValidGitSha(oldId) ||
    newId === oldId ||
    !COMMIT_SUBJECT_RE.test(sliced_2.slice(index + 1))
  )
    return;
  return getHeadForDir_2(mark, oldId);
}
//@ chunk-t0gq9gyw.js:104542-104732 layout
async function readNewCommitFromReftable(mark, reftableNewest) {
  if (mark.overlapped) return;
  let reflogEntries = await readReflogEntries(mark.gitDir, 2);
  let [newest, previous] = reflogEntries ?? [];
  if (
    newest === undefined ||
    newest.key === reftableNewest ||
    (previous?.key ?? null) !== reftableNewest ||
    newest.id === previous?.id ||
    !COMMIT_SUBJECT_RE.test(newest.subject)
  )
    return;
  return getHeadForDir_2(mark, newest.id);
}
//@ chunk-t0gq9gyw.js:104732-104937 callgraph-fingerprint = getHeadForDir (0.683)
async function getHeadForDir_2(mark, commitId) {
  let gitDir = await readGitHead(mark.gitDir);
  if (
    (gitDir?.type === "branch" ? await resolveRef(mark.gitDir, `refs/heads/${gitDir.name}`) : gitDir?.sha) !==
      commitId ||
    mark.overlapped
  )
    return;
  return {
    commitId,
    ...(gitDir?.type === "branch" && {
      branch: gitDir.name,
    }),
  };
}
//@ chunk-t0gq9gyw.js:104937-105584 layout
async function readReflogEntries(gitDir, count) {
  let result = await runGitForWatcher(gitDir, [
    "log",
    "--walk-reflogs",
    `--max-count=${count}`,
    "--no-show-signature",
    "--no-mailmap",
    "--no-decorate",
    "--no-color",
    "--date=raw",
    "--format=%H%x09%gd%x09%gs",
    "HEAD",
    "--",
  ]);
  if (result === null || result.exitCode === undefined) return;
  if (result.code !== 0) {
    let symrefResult = await runGitForWatcher(gitDir, ["symbolic-ref", "-q", "HEAD"]);
    let branchRef = symrefResult?.code === 0 ? symrefResult.stdout.trim() : "";
    if (!branchRef.startsWith("refs/heads/") || !isSafeRefName_2(branchRef)) return;
    return (await runGitForWatcher(gitDir, ["show-ref", "--exists", "--end-of-options", branchRef]))
      ?.exitCode === 2
      ? []
      : undefined;
  }
  let entries = [];
  for (let line of result.stdout.split(`
`)) {
    if (line === "") continue;
    let [id = "", selector = "", ...subjectParts] = line.split("\t");
    if (!isValidGitSha(id) || selector === "") return;
    entries.push({
      key: line,
      id,
      subject: subjectParts.join("\t"),
    });
  }
  return entries;
}
//@ chunk-t0gq9gyw.js:105584-106036 facade-exports
async function probeHeadForDirBounded(dir, cwd) {
  if (isDiskless())
    return {
      repo: true,
      sha: null,
    };
  let resolvedDir = resolve(dir);
  let gitRoot = findGitRoot(resolvedDir);
  let resolvedCwd = identity(resolve(cwd));
  if (
    gitRoot === null ||
    !isPathWithin(resolvedCwd, gitRoot, {
      alreadyComparable: true,
    })
  )
    return (await hasNoNestedRepoBetween(resolvedDir, resolvedCwd))
      ? {
          repo: false,
        }
      : {
          repo: true,
          sha: null,
        };
  let [realDir, realRoot] = await Promise.all([
    normalizedRealpathOrNull(resolvedCwd),
    normalizedRealpathOrNull(gitRoot),
  ]);
  if (
    realDir === null ||
    realRoot === null ||
    !isPathWithin(realDir, realRoot, {
      alreadyComparable: true,
    })
  )
    return {
      repo: true,
      sha: null,
    };
  let gitDir = await resolveGitDir(resolvedDir);
  if (gitDir !== null && (await isPathAbsentLstat(join(gitDir, "HEAD")))) {
    if (await hasNoNestedRepoBetween(resolvedDir, resolvedCwd, gitRoot))
      return {
        repo: false,
      };
    return {
      repo: true,
      sha: null,
    };
  }
  return {
    repo: true,
    sha: await getHeadForDir(resolvedDir),
  };
}
//@ chunk-t0gq9gyw.js:106036-106173 layout
async function hasNoNestedRepoBetween(dir, limitDir, limitKey) {
  let currentDir = dir;
  for (;;) {
    let currentKey = identity(currentDir);
    if (currentKey !== limitKey && !(await isPathAbsentLstat(join(currentDir, ".git")))) return false;
    let parentDir = dirname(currentDir);
    if (currentKey === limitDir || parentDir === currentDir) return true;
    currentDir = parentDir;
  }
}
//@ chunk-t0gq9gyw.js:106173-106276 layout = isRealPathWithinTeamDir (1)
async function isPathAbsentLstat(realCandidate) {
  try {
    await lstat(realCandidate);
    return false;
  } catch (e) {
    let code = getErrnoCode(e);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-t0gq9gyw.js:106276-106342 layout
async function normalizedRealpathOrNull(path) {
  let real = await realpathAsyncOrNull(path);
  return real === null ? null : identity(real);
}
//@ chunk-t0gq9gyw.js:106342-106405 layout
async function realpathAsyncOrNull(path) {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:106405-106760 facade-exports = readWorktreeHeadSha (1)
/**
 * 读 worktree 目录 .git 文件指向的 gitdir 下的 HEAD，返回 sha（分支则解析 ref），不存在返回 null。
 */
async function readWorktreeHeadSha(worktreePath) {
  let gitDir;
  try {
    if (pointerFileIsSuspect(join(worktreePath, ".git"), worktreePath)) return null;
    let ptr = (await readFile(join(worktreePath, ".git"), "utf-8")).trim();
    if (!ptr.startsWith("gitdir:")) return null;
    let trimmed = ptr.slice(7).trim();
    if (isOnForeignMount(trimmed, worktreePath)) return null;
    if (isPointerPathUnsafe(trimmed, worktreePath)) return null;
    gitDir = resolve(worktreePath, trimmed);
  } catch {
    return null;
  }
  let head = await readGitHead(gitDir);
  if (!head) return null;
  if (head.type === "branch") return resolveRef(gitDir, `refs/heads/${head.name}`);
  return head.sha;
}
//@ chunk-t0gq9gyw.js:106760-106832 facade-exports
async function getRemoteUrlForDir(dir) {
  let gitDir = await resolveGitDir(dir);
  if (!gitDir) return null;
  return getRemoteUrlForGitDir(gitDir);
}
//@ chunk-t0gq9gyw.js:106832-106946 facade-exports
async function getRemoteUrlForGitDir(gitDir, commonDir) {
  let originUrlFromConfig = await readOriginUrlFromConfig(gitDir);
  if (originUrlFromConfig) return originUrlFromConfig;
  let commonDir_2 = commonDir ?? (await getCommonDir(gitDir));
  if (commonDir_2 && commonDir_2 !== gitDir) return readOriginUrlFromConfig(commonDir_2);
  return null;
}
//@ chunk-t0gq9gyw.js:106946-107057 facade-exports
function getRemoteUrlForDirSync(startPath) {
  let gitDir = resolveGitDirSync(startPath);
  if (!gitDir) return null;
  let originUrl = readOriginUrlSync(gitDir);
  if (originUrl) return originUrl;
  let gitDir_2 = readCommonDirSync(gitDir);
  return gitDir_2 && gitDir_2 !== gitDir ? readOriginUrlSync(gitDir_2) : null;
}
//@ chunk-t0gq9gyw.js:107057-107383 layout
/**
 * 同步解析 cwd 对应的 git 目录（.git 目录本身，或 .git 文件中 gitdir: 指向），结果缓存在 gitDirByCwd。
 */
function resolveGitDirSync(startPath) {
  let cwd = resolve(startPath);
  let cached = getGitRepoCache().gitDirByCwd.get(cwd);
  if (cached !== undefined) return cached;
  let gitRoot = findGitRoot(cwd);
  if (!gitRoot) return null;
  let dotGitPath = join(gitRoot, ".git");
  try {
    if (!statSync(dotGitPath).isFile()) return dotGitPath;
    let content = readBoundedSync(dotGitPath, GIT_POINTER_MAX_BYTES)?.trim();
    if (content === undefined || !content.startsWith("gitdir:"))
      return content === undefined ? null : dotGitPath;
    let trimmed = content.slice(7).trim();
    return isOnForeignMount(trimmed, gitRoot) || isPointerPathUnsafe(trimmed, gitRoot)
      ? null
      : resolve(gitRoot, trimmed);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:107383-107548 layout
function readCommonDirSync(gitDir) {
  try {
    if (pointerFileIsSuspect(join(gitDir, "commondir"), gitDir)) return null;
    let trimmed = readBoundedSync(join(gitDir, "commondir"), GIT_POINTER_MAX_BYTES)?.trim();
    return trimmed === undefined || isOnForeignMount(trimmed, gitDir) || isPointerPathUnsafe(trimmed, gitDir)
      ? null
      : resolve(gitDir, trimmed);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:107548-107560 facade-exports
var GIT_CONFIG_MAX_BYTES = 1e6;
//@ chunk-t0gq9gyw.js:107560-107743 layout
function readOriginUrlSync(gitDir) {
  let configPath = join(gitDir, "config");
  if (readPositionIsUnsafe(configPath, gitDir)) return null;
  let bounded = readBoundedSync(configPath, GIT_CONFIG_MAX_BYTES);
  if (bounded === undefined || hasNulByte(bounded)) return null;
  return (
    firstGitConfigValue(bounded, "remote", "origin", "pushurl") ||
    firstGitConfigValue(bounded, "remote", "origin", "url")
  );
}
//@ chunk-t0gq9gyw.js:107743-108024 facade-exports
/**
 * 以 O_NONBLOCK 同步读取小文件：必须是普通文件且不超过上限，否则返回 undefined（避免读到 FIFO/设备或巨型文件）。
 */
function readBoundedSync(filePath, maxBytes) {
  let fd;
  try {
    fd = openSync(filePath, constants.O_RDONLY | O_NONBLOCK);
    let stats = fstatSync(fd);
    if (!stats.isFile() || stats.size > maxBytes) return;
    let buffer = Buffer.allocUnsafe(maxBytes + 1);
    let totalRead = 0;
    while (totalRead < buffer.length) {
      let bytesRead = readSync(fd, buffer, totalRead, buffer.length - totalRead, totalRead);
      if (bytesRead === 0) break;
      totalRead += bytesRead;
    }
    return totalRead > maxBytes ? undefined : buffer.toString("utf-8", 0, totalRead);
  } catch {
    return;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
//@ chunk-t0gq9gyw.js:108024-108197 facade-exports = getWorktreeCountFromFs (1)
/**
 * 统计 <commondir>/worktrees 下的条目数（不 spawn）。
 */
async function getWorktreeCountFromFs() {
  try {
    let gitDir = await resolveGitDir();
    if (!gitDir) return 0;
    let commonDir = (await getCommonDir(gitDir)) ?? gitDir;
    if (readPositionIsUnsafe(join(commonDir, "worktrees"), commonDir)) return 1;
    return (await readdir(join(commonDir, "worktrees"))).length + 1;
  } catch {
    return 1;
  }
}
//@ chunk-dgqyqzy0.js:3870-3908 fingerprint = getCommonDir (0.737)
/**
 * 读 gitDir/commondir 得到共享 git 目录，没有则返回 gitDir 本身。
 */
function getCommonDir_2(gitDir) {
  return lstatErrnoOrFalse(gitDir, "commondir");
}
//@ chunk-s61vbvea.js:254014-254155 fingerprint = isShallowClone (0.431)
/**
 * 根据 .git/shallow 等文件判断是否浅克隆。
 */
function isShallowClone(layout, sharedIndexNames) {
  return [
    [layout.gitDir, "index", "index"],
    [layout.commonDir, "shallow", "shallow"],
    ...sharedIndexNames.slice(0, MAX_PLACEMENT_DEPTH).map((name) => [layout.gitDir, name, "shared_index"]),
  ];
}
//@ chunk-e6aww6q8.js:3599115-3599365 fingerprint = resolveGitDir (1)
/**
 * 异步解析 .git：目录直接返回，文件则解析 gitdir: 指向的路径。
 */
async function resolveGitDir_2(startPath) {
  try {
    if (pointerFileIsSuspect(join(startPath, ".git"), startPath)) return null;
    let content = (await readFile(join(startPath, ".git"), "utf-8")).trim();
    if (!content.startsWith("gitdir:")) return null;
    let rawDir = content.slice(7).trim();
    if (isOnForeignMount(rawDir, startPath)) return null;
    if (rawPointerPathIsUnsafe(rawDir, startPath)) return null;
    return resolve(startPath, rawDir);
  } catch {
    return null;
  }
}
//@ chunk-yj65zw1g.js:625-708 fingerprint = resetGitFileWatcher (0.682)
class resetGitFileWatcher_2 {
  #e = 0;
  next(input, factor) {
    this.#e = this.#e * factor + input * (1 - factor);
    return this.#e;
  }
  reset() {
    this.#e = 0;
  }
}
//@ chunk-ca06bv0t.js:16992-17085 fingerprint = computeRemoteUrl (0.798)
var computeRemoteUrl_2 = (text) =>
  hasNulByte(text)
    ? ""
    : firstGitConfigValue(text, "remote", "origin", "pushurl") ||
      firstGitConfigValue(text, "remote", "origin", "url") ||
      "";
export {
  reanchorGitFileWatcher,
  rawPointerPathIsUnsafe,
  pointerFileIsSuspect,
  resolveGitDir,
  getCachedHead,
  getCachedBranch,
  getCachedDefaultBranch,
  CONVENTIONAL_DEFAULT_BRANCH_NAMES,
  getCachedRemoteUrl,
  getCachedDefaultBranchIfKnown,
  getRemoteUrlForDir_2,
  readPositionIsUnsafe,
  getWorktreeCountFromFs,
  getRemoteUrlForGitDir,
  getRemoteUrlForDir,
  onWatchedGitStateChange,
  resetGitFileWatcher,
  linkChainIsUnsafeToFollow,
  clearResolveGitDirCache,
  refreshGitDir,
  getCommonDir,
  addWatchedRepo,
  onRepoBranchChange,
  getCachedBranchForRepo,
  keepsRefsInReftable,
  readWorktreeHeadSha,
  resolveRef,
  resolveGitDir_2,
  isValidGitSha,
  markHeadReflog,
  releaseHeadReflogMark,
  computeRemoteUrl_2,
  createWalkMemo,
  rawPointerPathWalk,
  getCommonDir_2,
  readLinkTextSafe,
  readBoundedSync,
  GIT_POINTER_MAX_BYTES,
  GIT_CONFIG_MAX_BYTES,
  readGitHead,
  getBranchForDir,
  resetGitFileWatcher_2,
  probeHeadForDirBounded,
  getHeadForDir,
  isShallowClone,
  readCommitAppendedToHeadReflog,
  trustGuardRegistry,
  getRemoteUrlForDirSync,
  removeWatchedRepo,
};
