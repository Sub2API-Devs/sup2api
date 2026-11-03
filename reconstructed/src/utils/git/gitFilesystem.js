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
  let r = (o) => {
    let s = firstGitConfigValue(gitConfigValue, "remote", "origin", o);
    return s ? normalizeGitRemoteUrl(s) : null;
  };
  return r("pushurl") ?? r("url") ?? REPO_NEGATIVE_RESULT;
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
var trustGuardRegistry = new HostScoped(() => new TrustGuardHolder());
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
async function lookupPackedRef(e, n) {
  let buffer = Buffer.from(n, "utf-8");
  let o = buffer.length;
  let s = Buffer.allocUnsafe(PACKED_REFS_CHUNK_BYTES + 1);
  let a;
  let c = 0;
  let u = 0;
  let p = 0;
  let y = 0;
  let w = 0;
  let E = 0;
  let h = 0;
  let b = 0;
  let v = 0;
  let _ = 0;
  let R = 0;
  let L = 0;
  let P;
  try {
    a = await open(join(e, "packed-refs"), "r");
    c = (await a.stat()).size;
    p = c;
    while (u < p) {
      y = u + Math.floor((p - u) / 2);
      E = Math.max(u, y - PACKED_REFS_OVERLAP_BYTES);
      h = (await a.read(s, 0, Math.min(PACKED_REFS_CHUNK_BYTES, c - E), E)).bytesRead;
      w = y - E;
      if (w >= h) return null;
      s[h] = NEWLINE_CODE;
      b = w > 0 ? s.lastIndexOf(NEWLINE_CODE, w - 1) + 1 : 0;
      if (b > 1 && s[b] === CARET_CODE) b = s.lastIndexOf(NEWLINE_CODE, b - 2) + 1;
      if (s[b] === SPACE_CODE) {
        R = s.indexOf(NEWLINE_CODE, b);
        u = E + (R < 0 || R >= h ? h : R + 1);
        continue;
      }
      if (v === 0) v = b + 40 < h && s[b + 40] === SHA256_HEX_LENGTH ? 40 : 64;
      _ = b + v + 1;
      if (_ >= h) return null;
      L = s.compare(buffer, 0, o, _, Math.min(_ + o, h));
      if (L === 0) {
        if (_ + o < h && s[_ + o] !== NEWLINE_CODE) {
          p = E + b;
          continue;
        }
        P = s.toString("ascii", b, b + v);
        return HEX_STRING_RE.test(P) ? P : null;
      }
      if (L < 0) {
        R = s.indexOf(NEWLINE_CODE, w);
        if (R < 0 || R >= h) R = h - 1;
        if (R + 1 < h && s[R + 1] === CARET_CODE) {
          R = s.indexOf(NEWLINE_CODE, R + 1);
          if (R < 0 || R >= h) R = h - 1;
        }
        u = E + R + 1;
      } else p = E + b;
    }
    return null;
  } catch {
    return null;
  } finally {
    await a?.close();
  }
}
//@ chunk-t0gq9gyw.js:87558-87598 facade-exports
function clearResolveGitDirCache() {
  getGitRepoCache().gitDirByCwd.clear();
}
//@ chunk-t0gq9gyw.js:87598-87749 facade-exports
async function resolveGitDir(e) {
  let n = e ?? (isRemoteSessionAvailable() ? getOriginalCwdOrNull() : getCwdOrNull());
  if (n === null) return null;
  let r = resolve(n);
  let o = getGitRepoCache().gitDirByCwd.get(r);
  if (o !== undefined) return o;
  return resolveGitDirForCwd(r, findGitRoot(r));
}
//@ chunk-t0gq9gyw.js:87749-87802 facade-exports
async function refreshGitDir(e) {
  let n = resolve(e);
  return resolveGitDirForCwd(n, findGitRootUncached(n));
}
//@ chunk-t0gq9gyw.js:87802-88271 layout
/**
 * 解析目录的 git 目录（.git 文件中的 gitdir 指针，带安全检查与缓存）。
 */
async function resolveGitDirForCwd(e, n) {
  let gitDirByCwd = getGitRepoCache().gitDirByCwd;
  if (!n) {
    gitDirByCwd.set(e, null);
    return null;
  }
  let o = join(n, ".git");
  try {
    if ((await stat(o)).isFile()) {
      let fileGuarded = await readFileGuarded(o, GIT_POINTER_MAX_BYTES, {
        sniffEncoding: true,
        withBytes: true,
      });
      if (fileGuarded === null || fileGuarded.truncated) {
        gitDirByCwd.set(e, null);
        return null;
      }
      let trimmed = fileGuarded.content.trim();
      if (trimmed.startsWith("gitdir:")) {
        let trimmed_2 = trimmed.slice(7).trim();
        if (isOnForeignMount(trimmed_2, n)) {
          gitDirByCwd.set(e, null);
          return null;
        }
        let p = resolve(n, trimmed_2);
        if (isPointerPathUnsafe(trimmed_2, n)) {
          gitDirByCwd.set(e, null);
          return null;
        }
        gitDirByCwd.set(e, p);
        return p;
      }
    }
    gitDirByCwd.set(e, o);
    return o;
  } catch {
    gitDirByCwd.set(e, null);
    return null;
  }
}
//@ chunk-t0gq9gyw.js:88271-88470 layout
function lstatKind(e) {
  try {
    let n = lstatSync(e);
    if (n.isSymbolicLink()) return "symlink";
    return n.isFile() ? "file" : n.isDirectory() ? "dir" : "special";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-t0gq9gyw.js:88470-88641 facade-exports
function readLinkTextSafe(e) {
  try {
    let n = readlinkSync(e, {
      encoding: "buffer",
    });
    let str = n.toString("utf-8");
    if (str.includes("\x00") || !Buffer.from(str, "utf-8").equals(n)) return null;
    return str;
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:88641-88740 facade-exports
function pointerFileIsSuspect(e, n) {
  if (!walkPathSafely(e, n)) return true;
  let r = lstatKind(e);
  return r === "symlink" || r === "special" || r === "other";
}
//@ chunk-t0gq9gyw.js:88740-88814 file-local
function isSafeRefName(e, n) {
  let r = relative(n, e);
  return !(r === "" || r.startsWith("..") || isAbsolute(r));
}
//@ chunk-t0gq9gyw.js:88814-88867 facade-exports
function readPositionIsUnsafe(e, n) {
  if (!isSafeRefName(e, n)) return true;
  return !walkPathSafely(e, n);
}
//@ chunk-t0gq9gyw.js:88867-88899 layout
function isPathOnForeignMount(e, n) {
  return isOnForeignMount(e, n);
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
function walkPathSafely(e, n, r = 40, o = n, s = false, a, c = Number.POSITIVE_INFINITY, u) {
  if (r <= 0) return false;
  let match = LEADING_SLASH_ANCHORED_RE.exec(e);
  let y = match ? match[0] : "";
  let parts = e.slice(y.length).split(SEPARATOR_RUN_RE);
  let min = Math.min(c, parts.length);
  for (let j = 0; j < parts.length; j++) {
    let b = parts[j];
    if (b === "" || b === ".") continue;
    if (b === "..") {
      y = dirname(y);
      if (a && j >= parts.length - min) a.missingTail = null;
      continue;
    }
    y = join(y, b);
    if (isForeignMountPath(y, o) || isUnderNetworkDirCached(y)) return false;
    let v = u ? memoizedCall(u.kinds, y, lstatKind) : lstatKind(y);
    if (a && a.stoppedAt === undefined && (v === "absent" || v === "other" || (v === "special" && !s)))
      a.stoppedAt = {
        path: y,
        kind: v,
      };
    if (v === "other" || (v === "special" && !s)) return false;
    if (v === "absent" && a && a.missingTail === undefined)
      a.missingTail = j >= parts.length - min ? parts.length - j : null;
    if (v === "symlink") {
      if (a) a.throughLink = true;
      let _ = u ? memoizedCall(u.linkTexts, y, readLinkTextSafe) : readLinkTextSafe(y);
      if (_ === null) return false;
      if (isPathOnForeignMount(_, dirname(y))) return false;
      let R = LEADING_SLASH_RE.test(_) ? _ : dirname(y) + sep + _;
      let joined = parts.slice(j + 1).join(sep);
      let P = joined ? (TRAILING_SEPARATOR_RE.test(R) ? R + joined : R + sep + joined) : R;
      return walkPathSafely(P, n, r - 1, o, s, a, Math.min(min, parts.length - j - 1), u);
    }
  }
  if (a && a.missingTail === undefined) a.missingTail = 0;
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
function memoizedCall(e, n, r) {
  let o = e.get(n);
  if (o === undefined && !e.has(n)) {
    o = r(n);
    e.set(n, o);
  }
  return o;
}
//@ chunk-t0gq9gyw.js:89988-90249 layout
function isPointerPathUnsafe(e, n, r = n, o = false, s, a) {
  let c = LEADING_SLASH_RE.test(e) ? e : n + sep + e;
  let u = resolve(n, e);
  let p = u === c ? s : undefined;
  if (s && !p) s.throughLink = true;
  if (!walkPathSafely(c, n, undefined, r, o, p, undefined, a)) {
    if (s) s.missingTail = null;
    return true;
  }
  if (u === c) return false;
  if (s) s.missingTail = null;
  return !walkPathSafely(u, n, undefined, r, o, undefined, undefined, a);
}
//@ chunk-t0gq9gyw.js:90249-90287 facade-exports
function rawPointerPathIsUnsafe(e, n, r = n) {
  return isPointerPathUnsafe(e, n, r);
}
//@ chunk-t0gq9gyw.js:90287-90450 facade-exports
function rawPointerPathWalk(path, cwdState, r) {
  let o = {
    missingTail: undefined,
  };
  return {
    unsafe: isPointerPathUnsafe(path, cwdState, cwdState, false, o, r),
    missingTail: o.missingTail ?? null,
    stoppedAt: o.stoppedAt,
    throughLink: o.throughLink ?? false,
  };
}
//@ chunk-t0gq9gyw.js:90450-90488 facade-exports
function linkChainIsUnsafeToFollow(e, n) {
  return isPointerPathUnsafe(e, n, n, true);
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
        let s = await runGitForWatcher(gitDir, ["symbolic-ref", "-q", "--no-recurse", "HEAD"]);
        if (s?.exitCode === 1) {
          let ref = await resolveRef(gitDir, "HEAD");
          return ref
            ? {
                type: "detached",
                sha: ref,
              }
            : null;
        }
        if (s === null || s.code !== 0) return null;
        ref = s.stdout.trim();
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
async function resolveRef(gitDir, n, r = 5) {
  if (r <= 0) return null;
  if (await keepsRefsInReftable(gitDir)) {
    if (n !== "HEAD" && (!n.startsWith("refs/") || !isSafeRefName_2(n))) return null;
    let result = await runGitForWatcher(gitDir, ["show-ref", "--verify", "--hash", "--end-of-options", n]);
    let c = result?.code === 0 ? result.stdout.trim() : null;
    return c !== null && isValidGitSha(c) ? c : null;
  }
  let refInDir = await resolveRefInDir(gitDir, n, r);
  if (refInDir) return refInDir;
  let commonDir = await getCommonDir(gitDir);
  if (commonDir && commonDir !== gitDir) return resolveRefInDir(commonDir, n, r);
  return null;
}
//@ chunk-t0gq9gyw.js:91551-91831 fingerprint = resolveRefInDir (1)
/**
 * 在单个 git 目录中按 loose 文件 → packed-refs 顺序查找 ref。
 */
async function resolveRefInDir(e, n, r) {
  try {
    if (readPositionIsUnsafe(join(e, n), e)) return null;
    let content = (await readFile(join(e, n), "utf-8")).trim();
    if (content.startsWith("ref:")) {
      let target = content.slice(4).trim();
      if (!isSafeRefName_2(target)) return null;
      return resolveRef(e, target, r - 1);
    }
    if (!isValidGitSha(content)) return null;
    return content;
  } catch {}
  if (readPositionIsUnsafe(join(e, "packed-refs"), e)) return null;
  return lookupPackedRef(e, n);
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
async function resolveSymrefTarget(commonDir, n, r) {
  if (await keepsRefsInReftable(commonDir)) {
    if (!n.startsWith("refs/") || !isSafeRefName_2(n)) return null;
    let o = await runGitForWatcher(commonDir, ["symbolic-ref", "-q", "--no-recurse", "--end-of-options", n]);
    let s = o?.code === 0 ? o.stdout.trim() : "";
    if (!s.startsWith(r)) return null;
    let sliced = s.slice(r.length);
    return isSafeRefName_2(sliced) ? sliced : null;
  }
  try {
    if (readPositionIsUnsafe(join(commonDir, n), commonDir)) return null;
    let trimmed = (await readFile(join(commonDir, n), "utf-8")).trim();
    if (trimmed.startsWith("ref:")) {
      let trimmed_2 = trimmed.slice(4).trim();
      if (trimmed_2.startsWith(r)) {
        let sliced = trimmed_2.slice(r.length);
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
async function runGitForWatcher(e, n) {
  if (isGitSpawnBlocked()) return null;
  let r = (await getCommonDir(e)) ?? e;
  let originalCwdOrNull = getOriginalCwdOrNull();
  let s = originalCwdOrNull === null ? null : await resolveGitDir(originalCwdOrNull);
  if (s === null) return null;
  let [a, c, u] = await Promise.all([
    realpathAsyncOrNull(e),
    realpathAsyncOrNull(r),
    realpathAsyncOrNull((await getCommonDir(s)) ?? s),
  ]);
  if (a === null || c === null || u === null || (a !== c && dirname(a) !== join(c, "worktrees"))) return null;
  let [p, y, w] = await Promise.all([
    stat(c, {
      bigint: true,
    }).catch(() => null),
    stat(u, {
      bigint: true,
    }).catch(() => null),
    stat(dirname(c), {
      bigint: true,
    }).catch(() => null),
  ]);
  if (p === null || !p.isDirectory()) return null;
  if (
    !(w !== null && p.dev !== 0n && !isSentinelInode(p.ino) && !(p.dev === w.dev && p.ino === w.ino)
      ? y !== null && p.dev === y.dev && p.ino === y.ino
      : c === u)
  )
    return null;
  let b = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...n], {
    cwd: a,
    timeout: INVALID_HEAD_REF,
    preserveOutputOnError: false,
    env: getRemoteHostSessionCount(undefined, {
      repository: {
        gitDir: a,
        commonDir: c,
        workTree: null,
      },
    }),
  });
  if (b.exitCode === undefined) getGitFileWatcher().noteInconclusiveRefRead();
  return b;
}
//@ chunk-t0gq9gyw.js:93644-93679 layout
var GIT_WATCH_POLL_MS_2 = 1000;
var GIT_WATCH_POLL_MS = 60000;
var GIT_WATCH_SAFETY_POLL_MS = 200;
var GIT_CHECK_DEADLINE_MS = 100;
//@ chunk-t0gq9gyw.js:93679-93846 layout
async function statFileIdentity(e) {
  try {
    let { dev, ino, size, mtimeNs, ctimeNs, birthtimeNs } = await stat(e, {
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
  watchPath(e, n, r) {
    if (readPositionIsUnsafe(e, n)) return;
    this.watchedFiles.push({
      path: e,
      stop: this.watchFile(e, r),
    });
  }
  watchFile(e, n) {
    if (isConfigWatchEventsEnabled()) {
      let o = {
        path: e,
        onChange: n,
        seen: statFileIdentity(e),
      };
      this.filesCheckedOnRead.add(o);
      return () => this.filesCheckedOnRead.delete(o);
    }
    let r = watchFileSafe(
      e,
      {
        interval: GIT_WATCH_POLL_MS_2,
      },
      n,
    );
    return () => unwatchFile(e, r);
  }
  checkFiles(e) {
    if (this.checkUnderWay) {
      this.mustCheckAgain ||= e === "now";
      return this.checkUnderWay;
    }
    if (
      this.filesCheckedOnRead.size === 0 ||
      (e === "ifDue" && performance.now() - this.lastCheckMs < GIT_WATCH_POLL_MS_2)
    )
      return;
    this.lastCheckMs = performance.now();
    let n = new Map();
    for (let { path } of this.filesCheckedOnRead) if (!n.has(path)) n.set(path, statFileIdentity(path));
    let r = Promise.all(
      Array.from(this.filesCheckedOnRead, (o) => this.reportIfChanged(o, n.get(o.path))),
    ).then(() => {
      this.checkUnderWay = undefined;
      if (this.mustCheckAgain) {
        this.mustCheckAgain = false;
        this.checkFilesNow();
      }
    });
    this.checkUnderWay = withDeadline(r, GIT_CHECK_DEADLINE_MS);
    return this.checkUnderWay;
  }
  async reportIfChanged(e, n) {
    let [r, o] = await Promise.all([e.seen, n]);
    if (o === r || !this.filesCheckedOnRead.has(e)) return;
    e.seen = n;
    try {
      e.onChange();
    } catch (error) {
      logError(error);
    }
  }
  async watchCurrentBranchRef() {
    if (!this.gitDir) return;
    let generation = this.generation;
    let n = this.reftable ? null : await readGitHead(this.gitDir);
    if (generation !== this.generation) return;
    let refsDir = this.commonDir ?? this.gitDir;
    let refPath = n?.type === "branch" ? join(refsDir, "refs", "heads", n.name) : null;
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
      await Promise.all(Array.from(this.filesCheckedOnRead, (n) => n.seen));
      this.invalidate();
    }
  }
  invalidate() {
    for (let e of this.cache.values()) e.dirty = true;
    this.computing.clear();
    this.retriesLeft.clear();
    this.stateChanged.emit();
  }
  onStateChange(e) {
    let n = this.stateChanged.subscribe(e);
    if (!isConfigWatchEventsEnabled()) return n;
    let interval = setInterval(this.checkFilesNow, GIT_WATCH_POLL_MS_2);
    interval.unref();
    this.stateChangeTimers.add(interval);
    return () => {
      clearInterval(interval);
      this.stateChangeTimers.delete(interval);
      n();
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
  async get(e, n) {
    for (;;) {
      let generation = this.generation;
      await this.ensureStarted();
      let o = this.checkFiles("ifDue");
      if (o) await o;
      let s = this.cache.get(e);
      if (s && !s.dirty) return s.value;
      let a = s ? undefined : this.computing.get(e);
      if (a?.generation === generation && !(a.awaitedTrust && !(this.reftable && isGitSpawnBlocked()))) {
        let b = await a.value;
        if (generation !== this.generation) continue;
        return b;
      }
      if (s) s.dirty = false;
      let c = this.reftable && isGitSpawnBlocked();
      let inconclusiveRefReads = this.inconclusiveRefReads;
      let p = n();
      let y = {
        generation,
        awaitedTrust: c,
        value: p,
      };
      this.computing.set(e, y);
      let w;
      try {
        w = await p;
      } finally {
        if (this.computing.get(e) === y) this.computing.delete(e);
      }
      if (generation !== this.generation) continue;
      let dirty = c || this.retryAfterNoAnswer(e, inconclusiveRefReads);
      let h = this.cache.get(e);
      if (h && !h.dirty) {
        h.value = w;
        h.dirty = dirty;
      }
      if (!h)
        this.cache.set(e, {
          value: w,
          dirty,
        });
      return w;
    }
  }
  async getDefaultBranchIfKnownAnchored() {
    let e = await this.get("defaultBranchIfKnown", this.computeDefaultBranchIfKnownAnchored);
    if (e === null) return e;
    let n = this.commonDir ?? this.gitDir;
    if (n && (await resolveRef(n, `refs/remotes/origin/${e}`))) return e;
    let r = this.cache.get("defaultBranchIfKnown");
    if (r) r.dirty = true;
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
  async addRepo(e) {
    if (this.repoWatchers.has(e)) return;
    let gitDir = await resolveGitDir(e);
    if (!gitDir) return;
    let r = await keepsRefsInReftable(gitDir);
    if (this.repoWatchers.has(e)) return;
    let file = r ? join(gitDir, "reftable", "tables.list") : join(gitDir, "HEAD");
    if (readPositionIsUnsafe(file, gitDir)) return;
    let stop = this.watchFile(file, () => {
      this.repoBranches.delete(e);
      this.retriesLeft.delete(`repo:${e}`);
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
    this.repoWatchers.set(e, {
      gitDir,
      headPath: file,
      stop,
      reftable: r,
    });
  }
  removeRepo(e) {
    let n = this.repoWatchers.get(e);
    if (!n) return;
    n.stop();
    this.repoWatchers.delete(e);
    this.repoBranches.delete(e);
    this.retriesLeft.delete(`repo:${e}`);
  }
  onRepoBranchChange(e) {
    this.repoBranchListeners.push(e);
    return () => {
      let index = this.repoBranchListeners.indexOf(e);
      if (index !== -1) this.repoBranchListeners.splice(index, 1);
    };
  }
  async getBranchForRepo(e) {
    let n = this.checkFiles("ifDue");
    if (n) await n;
    if (this.repoBranches.has(e)) return this.repoBranches.get(e);
    let r = this.repoWatchers.get(e);
    if (!r) return;
    let o = r.reftable && isGitSpawnBlocked();
    let inconclusiveRefReads = this.inconclusiveRefReads;
    let gitHead = await readGitHead(r.gitDir);
    let c = gitHead?.type === "branch" ? gitHead.name : null;
    if (!o && !this.retryAfterNoAnswer(`repo:${e}`, inconclusiveRefReads)) this.repoBranches.set(e, c);
    return c;
  }
  noteInconclusiveRefRead() {
    this.inconclusiveRefReads++;
  }
  retryAfterNoAnswer(e, n) {
    if (this.inconclusiveRefReads === n) return false;
    let r = this.retriesLeft.get(e) ?? GIT_PROBE_RETRIES;
    if (r === 0) return false;
    this.retriesLeft.set(e, r - 1);
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
var gitFileWatcherByHost = new HostScoped(() => new GitFileWatcher());
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
async function readOriginUrlFromConfig(e) {
  if (readPositionIsUnsafe(join(e, "config"), e)) return null;
  return (
    (await readGitConfigValueAsync(e, "remote", "origin", "pushurl")) ||
    (await readGitConfigValueAsync(e, "remote", "origin", "url"))
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
function removeWatchedRepo(e) {
  getGitFileWatcher().removeRepo(e);
}
//@ chunk-t0gq9gyw.js:102590-102640 facade-exports
function onRepoBranchChange(e) {
  return getGitFileWatcher().onRepoBranchChange(e);
}
//@ chunk-t0gq9gyw.js:102640-102711 facade-exports
function onWatchedGitStateChange(e) {
  let gitFileWatcher = getGitFileWatcher();
  gitFileWatcher.ensureStarted();
  return gitFileWatcher.onStateChange(e);
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
async function getHeadForDir(e) {
  let gitDir = await resolveGitDir(e);
  if (!gitDir) return null;
  let head = await readGitHead(gitDir);
  if (!head) return null;
  if (head.type === "branch") return resolveRef(gitDir, `refs/heads/${head.name}`);
  return head.sha;
}
//@ chunk-t0gq9gyw.js:102982-103100 facade-exports = computeBranch (1)
async function getBranchForDir(e) {
  let gitDir = await resolveGitDir(e);
  if (!gitDir) return "HEAD";
  let head = await readGitHead(gitDir);
  return head?.type === "branch" ? head.name : "HEAD";
}
//@ chunk-t0gq9gyw.js:103100-103190 layout
var reflogWatchesByGitDir = new Map();
var reflogWatchRegistry = 4096;
var COMMIT_SUBJECT_RE = /^commit(?: \((?:amend|initial|merge|cherry-pick|rebase)\))?: /;
//@ chunk-t0gq9gyw.js:103190-103383 layout
async function getHeadReflogSize(gitDir) {
  if (readPositionIsUnsafe(join(gitDir, "logs", "HEAD"), gitDir)) return null;
  try {
    let n = await lstat(join(gitDir, "logs", "HEAD"));
    return n.isFile() ? n.size : null;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? 0 : null;
  }
}
//@ chunk-t0gq9gyw.js:103383-103828 facade-exports
async function markHeadReflog(cwd) {
  if (isRemoteSessionAvailable()) return;
  let n;
  try {
    let gitDir = await resolveGitDir(cwd);
    if (gitDir === null) return;
    if (linkChainIsUnsafeToFollow(gitDir, cwd)) return;
    let o = realpathSync(gitDir);
    let s = reflogWatchesByGitDir.get(o) ?? new Set();
    n = {
      gitDir,
      realGitDir: o,
      size: 0,
      overlapped: s.size > 0,
    };
    for (let c of s) c.overlapped = true;
    reflogWatchesByGitDir.set(o, s.add(n));
    if (await keepsRefsInReftable(gitDir)) {
      let reflogEntries = await readReflogEntries(gitDir, 1);
      if (reflogEntries === undefined) {
        releaseHeadReflogMark(n);
        return;
      }
      n.reftableNewest = reflogEntries[0]?.key ?? null;
      return n;
    }
    let headReflogSize = await getHeadReflogSize(gitDir);
    if (headReflogSize === null) {
      releaseHeadReflogMark(n);
      return;
    }
    n.size = headReflogSize;
    return n;
  } catch {
    if (n !== undefined) releaseHeadReflogMark(n);
    return;
  }
}
//@ chunk-t0gq9gyw.js:103828-103913 facade-exports
function releaseHeadReflogMark(e) {
  for (let [n, r] of reflogWatchesByGitDir)
    if (r.delete(e)) {
      if (r.size === 0) reflogWatchesByGitDir.delete(n);
      return;
    }
}
//@ chunk-t0gq9gyw.js:103913-104542 facade-exports
async function readCommitAppendedToHeadReflog(e) {
  if (e.reftableNewest !== undefined) return readNewCommitFromReftable(e, e.reftableNewest);
  let n = join(e.gitDir, "logs", "HEAD");
  if (e.overlapped || readPositionIsUnsafe(n, e.gitDir)) return;
  let fileGuarded = await readFileGuarded(n, reflogWatchRegistry, {
    noFollow: true,
    fromTail: true,
    requireNlink1: true,
    verifyHandlePath: (p) => p === join(e.realGitDir, "logs", "HEAD"),
  });
  if (
    fileGuarded === null ||
    fileGuarded === "unreadable" ||
    fileGuarded.end <= e.size ||
    !fileGuarded.content.endsWith(`
`)
  )
    return;
  let sliced = fileGuarded.content.slice(0, -1);
  let sliced_2 = sliced.slice(
    sliced.lastIndexOf(`
`) + 1,
  );
  if (sliced_2.includes("\uFFFD") || fileGuarded.end - Buffer.byteLength(sliced_2) - 1 !== e.size) return;
  let index = sliced_2.indexOf("\t");
  if (index === -1) return;
  let [c = "", u = ""] = sliced_2.slice(0, index).split(" ");
  if (!isValidGitSha(c) || !isValidGitSha(u) || c === u || !COMMIT_SUBJECT_RE.test(sliced_2.slice(index + 1)))
    return;
  return getHeadForDir_2(e, u);
}
//@ chunk-t0gq9gyw.js:104542-104732 layout
async function readNewCommitFromReftable(e, reftableNewest) {
  if (e.overlapped) return;
  let reflogEntries = await readReflogEntries(e.gitDir, 2);
  let [o, s] = reflogEntries ?? [];
  if (
    o === undefined ||
    o.key === reftableNewest ||
    (s?.key ?? null) !== reftableNewest ||
    o.id === s?.id ||
    !COMMIT_SUBJECT_RE.test(o.subject)
  )
    return;
  return getHeadForDir_2(e, o.id);
}
//@ chunk-t0gq9gyw.js:104732-104937 callgraph-fingerprint = getHeadForDir (0.683)
async function getHeadForDir_2(e, n) {
  let gitDir = await readGitHead(e.gitDir);
  if (
    (gitDir?.type === "branch" ? await resolveRef(e.gitDir, `refs/heads/${gitDir.name}`) : gitDir?.sha) !==
      n ||
    e.overlapped
  )
    return;
  return {
    commitId: n,
    ...(gitDir?.type === "branch" && {
      branch: gitDir.name,
    }),
  };
}
//@ chunk-t0gq9gyw.js:104937-105584 layout
async function readReflogEntries(gitDir, n) {
  let r = await runGitForWatcher(gitDir, [
    "log",
    "--walk-reflogs",
    `--max-count=${n}`,
    "--no-show-signature",
    "--no-mailmap",
    "--no-decorate",
    "--no-color",
    "--date=raw",
    "--format=%H%x09%gd%x09%gs",
    "HEAD",
    "--",
  ]);
  if (r === null || r.exitCode === undefined) return;
  if (r.code !== 0) {
    let s = await runGitForWatcher(gitDir, ["symbolic-ref", "-q", "HEAD"]);
    let a = s?.code === 0 ? s.stdout.trim() : "";
    if (!a.startsWith("refs/heads/") || !isSafeRefName_2(a)) return;
    return (await runGitForWatcher(gitDir, ["show-ref", "--exists", "--end-of-options", a]))?.exitCode === 2
      ? []
      : undefined;
  }
  let o = [];
  for (let line of r.stdout.split(`
`)) {
    if (line === "") continue;
    let [a = "", c = "", ...u] = line.split("\t");
    if (!isValidGitSha(a) || c === "") return;
    o.push({
      key: line,
      id: a,
      subject: u.join("\t"),
    });
  }
  return o;
}
//@ chunk-t0gq9gyw.js:105584-106036 facade-exports
async function probeHeadForDirBounded(e, n) {
  if (isDiskless())
    return {
      repo: true,
      sha: null,
    };
  let r = resolve(e);
  let gitRoot = findGitRoot(r);
  let s = identity(resolve(n));
  if (
    gitRoot === null ||
    !isPathWithin(s, gitRoot, {
      alreadyComparable: true,
    })
  )
    return (await hasNoNestedRepoBetween(r, s))
      ? {
          repo: false,
        }
      : {
          repo: true,
          sha: null,
        };
  let [a, c] = await Promise.all([normalizedRealpathOrNull(s), normalizedRealpathOrNull(gitRoot)]);
  if (
    a === null ||
    c === null ||
    !isPathWithin(a, c, {
      alreadyComparable: true,
    })
  )
    return {
      repo: true,
      sha: null,
    };
  let gitDir = await resolveGitDir(r);
  if (gitDir !== null && (await isPathAbsentLstat(join(gitDir, "HEAD")))) {
    if (await hasNoNestedRepoBetween(r, s, gitRoot))
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
    sha: await getHeadForDir(r),
  };
}
//@ chunk-t0gq9gyw.js:106036-106173 layout
async function hasNoNestedRepoBetween(e, n, gitRoot) {
  let o = e;
  for (;;) {
    let s = identity(o);
    if (s !== gitRoot && !(await isPathAbsentLstat(join(o, ".git")))) return false;
    let a = dirname(o);
    if (s === n || a === o) return true;
    o = a;
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
async function normalizedRealpathOrNull(e) {
  let n = await realpathAsyncOrNull(e);
  return n === null ? null : identity(n);
}
//@ chunk-t0gq9gyw.js:106342-106405 layout
async function realpathAsyncOrNull(e) {
  try {
    return await realpath(e);
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
async function getRemoteUrlForDir(e) {
  let gitDir = await resolveGitDir(e);
  if (!gitDir) return null;
  return getRemoteUrlForGitDir(gitDir);
}
//@ chunk-t0gq9gyw.js:106832-106946 facade-exports
async function getRemoteUrlForGitDir(gitDir, commonDir) {
  let originUrlFromConfig = await readOriginUrlFromConfig(gitDir);
  if (originUrlFromConfig) return originUrlFromConfig;
  let o = commonDir ?? (await getCommonDir(gitDir));
  if (o && o !== gitDir) return readOriginUrlFromConfig(o);
  return null;
}
//@ chunk-t0gq9gyw.js:106946-107057 facade-exports
function getRemoteUrlForDirSync(startPath) {
  let gitDir = resolveGitDirSync(startPath);
  if (!gitDir) return null;
  let originUrl = readOriginUrlSync(gitDir);
  if (originUrl) return originUrl;
  let commonDir = readCommonDirSync(gitDir);
  return commonDir && commonDir !== gitDir ? readOriginUrlSync(commonDir) : null;
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
  let s = join(gitRoot, ".git");
  try {
    if (!statSync(s).isFile()) return s;
    let content = readBoundedSync(s, GIT_POINTER_MAX_BYTES)?.trim();
    if (content === undefined || !content.startsWith("gitdir:")) return content === undefined ? null : s;
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
function readOriginUrlSync(e) {
  let n = join(e, "config");
  if (readPositionIsUnsafe(n, e)) return null;
  let bounded = readBoundedSync(n, GIT_CONFIG_MAX_BYTES);
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
function readBoundedSync(e, n) {
  let r;
  try {
    r = openSync(e, constants.O_RDONLY | O_NONBLOCK);
    let o = fstatSync(r);
    if (!o.isFile() || o.size > n) return;
    let s = Buffer.allocUnsafe(n + 1);
    let a = 0;
    while (a < s.length) {
      let c = readSync(r, s, a, s.length - a, a);
      if (c === 0) break;
      a += c;
    }
    return a > n ? undefined : s.toString("utf-8", 0, a);
  } catch {
    return;
  } finally {
    if (r !== undefined) closeSync(r);
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
//@ chunk-ca06bv0t.js:16992-17085 fingerprint = computeRemoteUrl (0.798)
var computeRemoteUrl_2 = (r) =>
  hasNulByte(r)
    ? ""
    : firstGitConfigValue(r, "remote", "origin", "pushurl") ||
      firstGitConfigValue(r, "remote", "origin", "url") ||
      "";
//@ chunk-dgqyqzy0.js:3870-3908 fingerprint = getCommonDir (0.737)
/**
 * 读 gitDir/commondir 得到共享 git 目录，没有则返回 gitDir 本身。
 */
function getCommonDir_2(gitDir) {
  return lstatErrnoOrFalse(gitDir, "commondir");
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
//@ chunk-s61vbvea.js:254014-254155 fingerprint = isShallowClone (0.431)
/**
 * 根据 .git/shallow 等文件判断是否浅克隆。
 */
function isShallowClone(e, n) {
  return [
    [e.gitDir, "index", "index"],
    [e.commonDir, "shallow", "shallow"],
    ...n.slice(0, MAX_PLACEMENT_DEPTH).map((r) => [e.gitDir, r, "shared_index"]),
  ];
}
//@ chunk-yj65zw1g.js:625-708 fingerprint = resetGitFileWatcher (0.682)
class resetGitFileWatcher_2 {
  #e = 0;
  next(o, t) {
    this.#e = this.#e * t + o * (1 - t);
    return this.#e;
  }
  reset() {
    this.#e = 0;
  }
}
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
};
