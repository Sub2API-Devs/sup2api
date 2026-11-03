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
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  stat,
  stat as stat_2,
  stat as stat_3,
  readFile,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  readdir,
  readdir as readdir_2,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  resolve,
  resolve as resolve_2,
  relative,
  relative as relative_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
} from "path";
import {
  lstatSync,
  lstatSync as lstatSync_2,
  readlinkSync,
  unwatchFile,
  unwatchFile as unwatchFile_2,
  realpathSync,
  realpathSync as realpathSync_2,
  statSync,
  statSync as statSync_2,
  openSync,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  fstatSync,
  readSync,
  closeSync,
} from "fs";
import { parseGitConfigValue_2, fut, IMn, hasNulByte } from "./gitConfigParser.js";
import { Ae, lde, getGitRepoCache } from "./gitRepoCache.js";
import { logForDebugging } from "../debug.js";
import { normalizeGitRemoteUrl, findGitRoot, findGitRootUncached, gitExe } from "../git.js";
import { HostScoped } from "../hostScoped.js";
import { wt } from "../../remote/remoteMode.js";
import {
  getOriginalCwdOrNull,
  getRootSession,
  waitForScrollIdle,
  isDiskless,
} from "../../bootstrap/state.js";
import { gl } from "../cwd.js";
import { readFileGuarded, uQt, NMn } from "../fsSafety/guardedFileRead.js";
import { isOnForeignMount, isForeignMountPath, isUnderNetworkDirCached } from "../networkPaths.js";
import { getErrnoCode } from "../errors.js";
import { isSafeRefName as isSafeRefName_2 } from "./safeRefName.js";
import { isSentinelInode } from "../slowOperations.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { freeze } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { createSignal } from "../signal.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { withDeadline } from "../sleep.js";
import { logError } from "../log.js";
import { FileStatWatcher } from "../fileStatWatcher.js";
import { Mn } from "../pathClassification.js";
import { isPathWithin } from "../fsJunctions.js";
import { O_NONBLOCK } from "../fsFlags.js";
import { lstatErrnoOrFalse } from "./gitDirResolution.js";
import { Ad } from "./builderGit/gitConfigAudit.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

/**
 * 读某仓库目录的 git config 解析 origin URL；config 含 NUL、路径不安全或读失败时记录并返回标记值。
 */
//@ chunk-t0gq9gyw.js:80246-80537 callgraph-fingerprint = getRemoteUrlForDir (0.543)
function getRemoteUrlForDir_2(cwd) {
  let n = parseGitConfigValue_2(cwd);
  if (n === Ae)
    logForDebugging(
      `[git] could not read the git config of ${cwd} (a NUL byte, an unsafe path or a read error), so its origin is unknown`,
    );
  if (typeof n !== "string") return n;
  let r = (o) => {
    let s = fut(n, "remote", "origin", o);
    return s ? normalizeGitRemoteUrl(s) : null;
  };
  return r("pushurl") ?? r("url") ?? lde;
}
//@ chunk-t0gq9gyw.js:86395-86531 placement
class TrustGuardHolder {
  guards = null;
  setGuards(e) {
    this.guards = e;
  }
  blocked() {
    if (!this.guards) return !0;
    try {
      return !this.guards.trustProbe();
    } catch {
      return !0;
    }
  }
}
//@ chunk-t0gq9gyw.js:86531-86557 placement
var Plo = new HostScoped(() => new TrustGuardHolder());
//@ chunk-t0gq9gyw.js:86622-86684 layout
var mr = 65536,
  Us = 4096,
  _e = 10,
  Ys = 32,
  hr = 94,
  Vs = 35,
  zs = /^[0-9a-f]+$/;
/**
 * 打开 packed-refs，按块二分查找 ref 名，跳过注释与剥离行，自动识别 sha1/sha256 长度；找到返回对象 id，否则 null。
 */
//@ chunk-t0gq9gyw.js:86684-87558 layout
async function lookupPackedRef(e, n) {
  let buffer = Buffer.from(n, "utf-8"),
    o = buffer.length,
    allocUnsafe = Buffer.allocUnsafe(mr + 1),
    a,
    c = 0,
    u = 0,
    p = 0,
    y = 0,
    w = 0,
    E = 0,
    h = 0,
    b = 0,
    v = 0,
    _ = 0,
    R = 0,
    L = 0,
    P;
  try {
    ((a = await open_6(join_8(e, "packed-refs"), "r")), (c = (await a.stat()).size), (p = c));
    while (u < p) {
      if (
        ((y = u + Math.floor((p - u) / 2)),
        (E = Math.max(u, y - Us)),
        (h = (await a.read(allocUnsafe, 0, Math.min(mr, c - E), E)).bytesRead),
        (w = y - E),
        w >= h)
      )
        return null;
      if (
        ((allocUnsafe[h] = _e),
        (b = w > 0 ? allocUnsafe.lastIndexOf(_e, w - 1) + 1 : 0),
        b > 1 && allocUnsafe[b] === hr)
      )
        b = allocUnsafe.lastIndexOf(_e, b - 2) + 1;
      if (allocUnsafe[b] === Vs) {
        ((R = allocUnsafe.indexOf(_e, b)), (u = E + (R < 0 || R >= h ? h : R + 1)));
        continue;
      }
      if (v === 0) v = b + 40 < h && allocUnsafe[b + 40] === Ys ? 40 : 64;
      if (((_ = b + v + 1), _ >= h)) return null;
      if (((L = allocUnsafe.compare(buffer, 0, o, _, Math.min(_ + o, h))), L === 0)) {
        if (_ + o < h && allocUnsafe[_ + o] !== _e) {
          p = E + b;
          continue;
        }
        return ((P = allocUnsafe.toString("ascii", b, b + v)), zs.test(P) ? P : null);
      }
      if (L < 0) {
        if (((R = allocUnsafe.indexOf(_e, w)), R < 0 || R >= h)) R = h - 1;
        if (R + 1 < h && allocUnsafe[R + 1] === hr) {
          if (((R = allocUnsafe.indexOf(_e, R + 1)), R < 0 || R >= h)) R = h - 1;
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
  let n = e ?? (wt() ? getOriginalCwdOrNull() : gl());
  if (n === null) return null;
  let r = resolve(n),
    o = getGitRepoCache().gitDirByCwd.get(r);
  if (o !== void 0) return o;
  return resolveGitDirForCwd(r, findGitRoot(r));
}
//@ chunk-t0gq9gyw.js:87749-87802 facade-exports
async function refreshGitDir(e) {
  let n = resolve(e);
  return resolveGitDirForCwd(n, findGitRootUncached(n));
}
/**
 * 解析目录的 git 目录（.git 文件中的 gitdir 指针，带安全检查与缓存）。
 */
//@ chunk-t0gq9gyw.js:87802-88271 layout
async function resolveGitDirForCwd(e, n) {
  let gitDirByCwd = getGitRepoCache().gitDirByCwd;
  if (!n) return (gitDirByCwd.set(e, null), null);
  let o = join_5(n, ".git");
  try {
    if ((await stat(o)).isFile()) {
      let a = await readFileGuarded(o, GIT_POINTER_MAX_BYTES, { sniffEncoding: !0, withBytes: !0 });
      if (a === null || a.truncated) return (gitDirByCwd.set(e, null), null);
      let trimmed = a.content.trim();
      if (trimmed.startsWith("gitdir:")) {
        let trimmed_2 = trimmed.slice(7).trim();
        if (isOnForeignMount(trimmed_2, n)) return (gitDirByCwd.set(e, null), null);
        let p = resolve(n, trimmed_2);
        if (isPointerPathUnsafe(trimmed_2, n)) return (gitDirByCwd.set(e, null), null);
        return (gitDirByCwd.set(e, p), p);
      }
    }
    return (gitDirByCwd.set(e, o), o);
  } catch {
    return (gitDirByCwd.set(e, null), null);
  }
}
//@ chunk-t0gq9gyw.js:88271-88470 layout
function lstatKind(e) {
  try {
    let n = lstatSync(e);
    if (n.isSymbolicLink()) return "symlink";
    return n.isFile() ? "file" : n.isDirectory() ? "dir" : "special";
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "absent" : "other";
  }
}
//@ chunk-t0gq9gyw.js:88470-88641 facade-exports
function readLinkTextSafe(e) {
  try {
    let n = readlinkSync(e, { encoding: "buffer" }),
      str = n.toString("utf-8");
    if (str.includes("\x00") || !Buffer.from(str, "utf-8").equals(n)) return null;
    return str;
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:88641-88740 facade-exports
function pointerFileIsSuspect(e, n) {
  if (!walkPathSafely(e, n)) return !0;
  let r = lstatKind(e);
  return r === "symlink" || r === "special" || r === "other";
}
//@ chunk-t0gq9gyw.js:88740-88814 file-local
function isSafeRefName(e, n) {
  let r = relative_2(n, e);
  return !(r === "" || r.startsWith("..") || isAbsolute_5(r));
}
//@ chunk-t0gq9gyw.js:88814-88867 facade-exports
function readPositionIsUnsafe(e, n) {
  if (!isSafeRefName(e, n)) return !0;
  return !walkPathSafely(e, n);
}
//@ chunk-t0gq9gyw.js:88867-88899 layout
function da(e, n) {
  return isOnForeignMount(e, n);
}
//@ chunk-t0gq9gyw.js:88899-88939 layout
var fa = /\/+/,
  ga = /\/$/,
  xr = /^\//,
  pa = /^\//;
/**
 * 逐段检查路径（拒绝特殊文件、记录链接与缺失）。
 */
//@ chunk-t0gq9gyw.js:88939-89847 layout
function walkPathSafely(e, n, r = 40, o = n, s = !1, a, c = Number.POSITIVE_INFINITY, u) {
  if (r <= 0) return !1;
  let match = pa.exec(e),
    y = match ? match[0] : "",
    parts = e.slice(y.length).split(fa),
    min = Math.min(c, parts.length);
  for (let h = 0; h < parts.length; h++) {
    let b = parts[h];
    if (b === "" || b === ".") continue;
    if (b === "..") {
      if (((y = dirname_7(y)), a && h >= parts.length - min)) a.missingTail = null;
      continue;
    }
    if (((y = join_5(y, b)), isForeignMountPath(y, o) || isUnderNetworkDirCached(y))) return !1;
    let v = u ? wr(u.kinds, y, lstatKind) : lstatKind(y);
    if (a && a.stoppedAt === void 0 && (v === "absent" || v === "other" || (v === "special" && !s)))
      a.stoppedAt = { path: y, kind: v };
    if (v === "other" || (v === "special" && !s)) return !1;
    if (v === "absent" && a && a.missingTail === void 0)
      a.missingTail = h >= parts.length - min ? parts.length - h : null;
    if (v === "symlink") {
      if (a) a.throughLink = !0;
      let _ = u ? wr(u.linkTexts, y, readLinkTextSafe) : readLinkTextSafe(y);
      if (_ === null) return !1;
      if (da(_, dirname_7(y))) return !1;
      let R = xr.test(_) ? _ : dirname_7(y) + sep_3 + _,
        joined = parts.slice(h + 1).join(sep_3),
        P = joined ? (ga.test(R) ? R + joined : R + sep_3 + joined) : R;
      return walkPathSafely(P, n, r - 1, o, s, a, Math.min(min, parts.length - h - 1), u);
    }
  }
  if (a && a.missingTail === void 0) a.missingTail = 0;
  return !0;
}
//@ chunk-t0gq9gyw.js:89847-89902 facade-exports
function createWalkMemo() {
  return { kinds: new Map(), linkTexts: new Map() };
}
//@ chunk-t0gq9gyw.js:89902-89988 layout
function wr(e, n, r) {
  let o = e.get(n);
  if (o === void 0 && !e.has(n)) ((o = r(n)), e.set(n, o));
  return o;
}
//@ chunk-t0gq9gyw.js:89988-90249 layout
function isPointerPathUnsafe(e, n, r = n, o = !1, s, a) {
  let c = xr.test(e) ? e : n + sep_3 + e,
    u = resolve(n, e),
    p = u === c ? s : void 0;
  if (s && !p) s.throughLink = !0;
  if (!walkPathSafely(c, n, void 0, r, o, p, void 0, a)) {
    if (s) s.missingTail = null;
    return !0;
  }
  if (u === c) return !1;
  if (s) s.missingTail = null;
  return !walkPathSafely(u, n, void 0, r, o, void 0, void 0, a);
}
//@ chunk-t0gq9gyw.js:90249-90287 facade-exports
function rawPointerPathIsUnsafe(e, n, r = n) {
  return isPointerPathUnsafe(e, n, r);
}
//@ chunk-t0gq9gyw.js:90287-90450 facade-exports
function rawPointerPathWalk(e, n, r) {
  let o = { missingTail: void 0 };
  return {
    unsafe: isPointerPathUnsafe(e, n, n, !1, o, r),
    missingTail: o.missingTail ?? null,
    stoppedAt: o.stoppedAt,
    throughLink: o.throughLink ?? !1,
  };
}
//@ chunk-t0gq9gyw.js:90450-90488 facade-exports
function linkChainIsUnsafeToFollow(e, n) {
  return isPointerPathUnsafe(e, n, n, !0);
}
//@ chunk-t0gq9gyw.js:90488-90560 facade-exports
function isValidGitSha(s) {
  return /^[0-9a-f]{40}$/.test(s) || /^[0-9a-f]{64}$/.test(s);
}
/**
 * 不 spawn git 直接读 <gitDir>/HEAD：`ref: refs/heads/x` 返回分支，40/64 位 hex 返回 detached sha；reftable 仓库回退 git symbolic-ref。
 */
//@ chunk-t0gq9gyw.js:90560-91195 facade-exports = readGitHead (0.817)
async function readGitHead(gitDir) {
  try {
    if (readPositionIsUnsafe(join_5(gitDir, "HEAD"), gitDir)) return null;
    let content = (await readFile(join_5(gitDir, "HEAD"), "utf-8")).trim();
    if (content.startsWith("ref:")) {
      let ref = content.slice(4).trim();
      if (ref === REFS_HEADS_INVALID) {
        let s = await runGitForWatcher(gitDir, ["symbolic-ref", "-q", "--no-recurse", "HEAD"]);
        if (s?.exitCode === 1) {
          let a = await resolveRef(gitDir, "HEAD");
          return a ? { type: "detached", sha: a } : null;
        }
        if (s === null || s.code !== 0) return null;
        ref = s.stdout.trim();
      }
      if (ref.startsWith("refs/heads/")) {
        let name = ref.slice(11);
        if (!isSafeRefName_2(name)) return null;
        return { type: "branch", name: name };
      }
      if (!isSafeRefName_2(ref)) return null;
      let sha = await resolveRef(gitDir, ref);
      return sha ? { type: "detached", sha: sha } : { type: "detached", sha: "" };
    }
    if (!isValidGitSha(content)) return null;
    return { type: "detached", sha: content };
  } catch {
    return null;
  }
}
/**
 * 把 ref 解析成 sha：先在 gitDir 再在 commondir 查 loose ref 文件与 packed-refs，最多跟随 5 层符号引用；reftable 时用 git show-ref。
 */
//@ chunk-t0gq9gyw.js:91195-91551 facade-exports = resolveRef (0)
async function resolveRef(e, n, r = 5) {
  if (r <= 0) return null;
  if (await keepsRefsInReftable(e)) {
    if (n !== "HEAD" && (!n.startsWith("refs/") || !isSafeRefName_2(n))) return null;
    let result = await runGitForWatcher(e, ["show-ref", "--verify", "--hash", "--end-of-options", n]),
      c = result?.code === 0 ? result.stdout.trim() : null;
    return c !== null && isValidGitSha(c) ? c : null;
  }
  let o = await resolveRefInDir(e, n, r);
  if (o) return o;
  let commonDir = await getCommonDir(e);
  if (commonDir && commonDir !== e) return resolveRefInDir(commonDir, n, r);
  return null;
}
/**
 * 在单个 git 目录中按 loose 文件 → packed-refs 顺序查找 ref。
 */
//@ chunk-t0gq9gyw.js:91551-91831 fingerprint = resolveRefInDir (1)
async function resolveRefInDir(e, n, r) {
  try {
    if (readPositionIsUnsafe(join_5(e, n), e)) return null;
    let content = (await readFile(join_5(e, n), "utf-8")).trim();
    if (content.startsWith("ref:")) {
      let target = content.slice(4).trim();
      if (!isSafeRefName_2(target)) return null;
      return resolveRef(e, target, r - 1);
    }
    if (!isValidGitSha(content)) return null;
    return content;
  } catch {}
  if (readPositionIsUnsafe(join_5(e, "packed-refs"), e)) return null;
  return lookupPackedRef(e, n);
}
//@ chunk-t0gq9gyw.js:91831-91845 facade-exports
var GIT_POINTER_MAX_BYTES = 65536;
/**
 * 读 <gitDir>/commondir 并解析为绝对路径（限 64KB、拒绝不安全路径）。
 */
//@ chunk-t0gq9gyw.js:91845-92117 facade-exports
async function getCommonDir(e) {
  try {
    if (pointerFileIsSuspect(join_5(e, "commondir"), e)) return null;
    let n = await readFileGuarded(join_5(e, "commondir"), GIT_POINTER_MAX_BYTES, {
      sniffEncoding: !0,
      withBytes: !0,
    });
    if (n === null || n.truncated) return null;
    let trimmed = n.content.trim();
    if (isOnForeignMount(trimmed, e)) return null;
    if (isPointerPathUnsafe(trimmed, e)) return null;
    return resolve(e, trimmed);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:92117-92607 layout
async function resolveSymrefTarget(e, n, r) {
  if (await keepsRefsInReftable(e)) {
    if (!n.startsWith("refs/") || !isSafeRefName_2(n)) return null;
    let o = await runGitForWatcher(e, ["symbolic-ref", "-q", "--no-recurse", "--end-of-options", n]),
      s = o?.code === 0 ? o.stdout.trim() : "";
    if (!s.startsWith(r)) return null;
    let sliced = s.slice(r.length);
    return isSafeRefName_2(sliced) ? sliced : null;
  }
  try {
    if (readPositionIsUnsafe(join_5(e, n), e)) return null;
    let trimmed = (await readFile(join_5(e, n), "utf-8")).trim();
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
var REFS_HEADS_INVALID = "refs/heads/.invalid",
  ma = 5000,
  ha = 3;
//@ chunk-t0gq9gyw.js:92649-92697 layout
function isGitSpawnBlocked() {
  return Plo.of(getRootSession().host).blocked();
}
/**
 * 读 HEAD 原始内容判断是否为 reftable（refs/heads/.invalid）布局。
 */
//@ chunk-t0gq9gyw.js:92697-92866 facade-exports = readRawSymref (0.832)
async function keepsRefsInReftable(e) {
  if (readPositionIsUnsafe(join_5(e, "HEAD"), e)) return !1;
  try {
    let content = (await readFile(join_5(e, "HEAD"), "utf-8")).trim();
    return content.startsWith("ref:") && content.slice(4).trim() === REFS_HEADS_INVALID;
  } catch {
    return !1;
  }
}
//@ chunk-t0gq9gyw.js:92866-93644 layout
async function runGitForWatcher(e, n) {
  if (isGitSpawnBlocked()) return null;
  let r = (await getCommonDir(e)) ?? e,
    o = getOriginalCwdOrNull(),
    s = o === null ? null : await resolveGitDir(o);
  if (s === null) return null;
  let [a, c, u] = await Promise.all([
    realpathAsyncOrNull(e),
    realpathAsyncOrNull(r),
    realpathAsyncOrNull((await getCommonDir(s)) ?? s),
  ]);
  if (a === null || c === null || u === null || (a !== c && dirname_7(a) !== join_5(c, "worktrees")))
    return null;
  let [p, y, w] = await Promise.all([
    stat(c, { bigint: !0 }).catch(() => null),
    stat(u, { bigint: !0 }).catch(() => null),
    stat(dirname_7(c), { bigint: !0 }).catch(() => null),
  ]);
  if (p === null || !p.isDirectory()) return null;
  if (
    !(w !== null && p.dev !== 0n && !isSentinelInode(p.ino) && !(p.dev === w.dev && p.ino === w.ino)
      ? y !== null && p.dev === y.dev && p.ino === y.ino
      : c === u)
  )
    return null;
  let b = await execFileNoThrowWithCwd(gitExe(), [...freeze, ...n], {
    cwd: a,
    timeout: ma,
    preserveOutputOnError: !1,
    env: getRemoteHostSessionCount(void 0, { repository: { gitDir: a, commonDir: c, workTree: null } }),
  });
  if (b.exitCode === void 0) getGitFileWatcher().noteInconclusiveRefRead();
  return b;
}
//@ chunk-t0gq9gyw.js:93644-93679 layout
var GIT_WATCH_POLL_MS = 1000,
  ya = 60000,
  wa = 200,
  ba = 100;
//@ chunk-t0gq9gyw.js:93679-93846 layout
async function statFileIdentity(e) {
  try {
    let {
      dev: dev,
      ino: ino,
      size: size,
      mtimeNs: mtimeNs,
      ctimeNs: ctimeNs,
      birthtimeNs: birthtimeNs,
    } = await stat(e, { bigint: !0 });
    return `${dev}:${ino}:${size}:${mtimeNs}:${ctimeNs}:${birthtimeNs}`;
  } catch {
    return "absent";
  }
}
/**
 * GitFileWatcher：监视 .git/HEAD、config、当前分支 ref 等文件（fs 事件或轮询），缓存 branch/head/remoteUrl/defaultBranch，变化时失效并通知 onStateChange；也可登记额外仓库跟踪其分支变化。
 */
//@ chunk-t0gq9gyw.js:93846-101450 fingerprint = GitFileWatcher (0.399)
class GitFileWatcher {
  gitDir = null;
  commonDir = null;
  initialized = !1;
  initPromise = null;
  watchedFiles = [];
  filesCheckedOnRead = new Set();
  lastCheckMs = Number.NEGATIVE_INFINITY;
  checkUnderWay = void 0;
  mustCheckAgain = !1;
  checkFilesNow = () => {
    this.checkFiles("now");
  };
  repoHeadWatches = new Map();
  stateChangeTimers = new Set();
  branchRefPath = null;
  reftable = !1;
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
    return ((this.initPromise = this.start()), this.initPromise);
  }
  cleanupHandle = null;
  async start() {
    let generation = this.generation;
    if (wt()) {
      ((this.gitDir = null), (this.initialized = !0));
      return;
    }
    let n = await resolveGitDir(),
      r = n !== null && (await keepsRefsInReftable(n));
    if (generation !== this.generation) return;
    if (((this.gitDir = n), (this.reftable = r), (this.initialized = !0), !this.cleanupHandle))
      this.cleanupHandle = registerCleanup(async () => {
        this.stopWatching();
      });
    if (!this.gitDir) return;
    let o = await getCommonDir(this.gitDir);
    if (generation !== this.generation) return;
    if (
      ((this.commonDir = o),
      this.watchPath(join_5(this.gitDir, "HEAD"), this.gitDir, () => {
        this.onHeadChanged();
      }),
      this.watchPath(join_5(this.commonDir ?? this.gitDir, "config"), this.commonDir ?? this.gitDir, () => {
        this.invalidate();
      }),
      this.watchPath(
        join_5(this.commonDir ?? this.gitDir, "refs", "remotes", "origin", "HEAD"),
        this.commonDir ?? this.gitDir,
        () => {
          this.invalidate();
        },
      ),
      this.reftable)
    ) {
      if (
        (this.watchPath(join_5(this.gitDir, "reftable", "tables.list"), this.gitDir, () => {
          this.onHeadChanged();
        }),
        this.commonDir && this.commonDir !== this.gitDir)
      )
        this.watchPath(join_5(this.commonDir, "reftable", "tables.list"), this.commonDir, () => {
          this.invalidate();
        });
    }
    await this.watchCurrentBranchRef();
  }
  watchPath(e, n, r) {
    if (readPositionIsUnsafe(e, n)) return;
    this.watchedFiles.push({ path: e, stop: this.watchFile(e, r) });
  }
  watchFile(e, n) {
    if (uQt()) {
      let o = { path: e, onChange: n, seen: statFileIdentity(e) };
      return (this.filesCheckedOnRead.add(o), () => this.filesCheckedOnRead.delete(o));
    }
    let r = NMn(e, { interval: GIT_WATCH_POLL_MS }, n);
    return () => unwatchFile(e, r);
  }
  checkFiles(e) {
    if (this.checkUnderWay) return ((this.mustCheckAgain ||= e === "now"), this.checkUnderWay);
    if (
      this.filesCheckedOnRead.size === 0 ||
      (e === "ifDue" && performance.now() - this.lastCheckMs < GIT_WATCH_POLL_MS)
    )
      return;
    this.lastCheckMs = performance.now();
    let n = new Map();
    for (let { path: path } of this.filesCheckedOnRead) if (!n.has(path)) n.set(path, statFileIdentity(path));
    let r = Promise.all(
      Array.from(this.filesCheckedOnRead, (o) => this.reportIfChanged(o, n.get(o.path))),
    ).then(() => {
      if (((this.checkUnderWay = void 0), this.mustCheckAgain))
        ((this.mustCheckAgain = !1), this.checkFilesNow());
    });
    return ((this.checkUnderWay = withDeadline(r, ba)), this.checkUnderWay);
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
    let generation = this.generation,
      n = this.reftable ? null : await readGitHead(this.gitDir);
    if (generation !== this.generation) return;
    let r = this.commonDir ?? this.gitDir,
      o = n?.type === "branch" ? join_5(r, "refs", "heads", n.name) : null;
    if (o === this.branchRefPath) return;
    if (this.branchRefPath) {
      for (let { path: path, stop: stop } of this.watchedFiles) if (path === this.branchRefPath) stop();
      this.watchedFiles = this.watchedFiles.filter((watchedFile) => watchedFile.path !== this.branchRefPath);
    }
    if (((this.branchRefPath = o), !o)) return;
    this.watchPath(o, r, () => {
      this.invalidate();
    });
  }
  async onHeadChanged() {
    (this.invalidate(), await waitForScrollIdle());
    let branchRefPath = this.branchRefPath;
    if (
      (await this.watchCurrentBranchRef(),
      this.branchRefPath !== branchRefPath && this.filesCheckedOnRead.size > 0)
    )
      (await Promise.all(Array.from(this.filesCheckedOnRead, (n) => n.seen)), this.invalidate());
  }
  invalidate() {
    for (let e of this.cache.values()) e.dirty = !0;
    (this.computing.clear(), this.retriesLeft.clear(), this.stateChanged.emit());
  }
  onStateChange(e) {
    let subscribe = this.stateChanged.subscribe(e);
    if (!uQt()) return subscribe;
    let r = setInterval(this.checkFilesNow, GIT_WATCH_POLL_MS);
    return (
      r.unref(),
      this.stateChangeTimers.add(r),
      () => {
        (clearInterval(r), this.stateChangeTimers.delete(r), subscribe());
      }
    );
  }
  stopWatching() {
    for (let { stop: stop } of this.watchedFiles) stop();
    for (let { stop: stop } of this.repoWatchers.values()) stop();
    for (let e of this.repoHeadWatches.values()) e.close();
    (this.repoHeadWatches.clear(), (this.watchedFiles = []), (this.branchRefPath = null));
  }
  async get(e, n) {
    for (;;) {
      let generation = this.generation;
      await this.ensureStarted();
      let checkFiles = this.checkFiles("ifDue");
      if (checkFiles) await checkFiles;
      let s = this.cache.get(e);
      if (s && !s.dirty) return s.value;
      let a = s ? void 0 : this.computing.get(e);
      if (a?.generation === generation && !(a.awaitedTrust && !(this.reftable && isGitSpawnBlocked()))) {
        let b = await a.value;
        if (generation !== this.generation) continue;
        return b;
      }
      if (s) s.dirty = !1;
      let c = this.reftable && isGitSpawnBlocked(),
        inconclusiveRefReads = this.inconclusiveRefReads,
        p = n(),
        y = { generation: generation, awaitedTrust: c, value: p };
      this.computing.set(e, y);
      let w;
      try {
        w = await p;
      } finally {
        if (this.computing.get(e) === y) this.computing.delete(e);
      }
      if (generation !== this.generation) continue;
      let E = c || this.retryAfterNoAnswer(e, inconclusiveRefReads),
        h = this.cache.get(e);
      if (h && !h.dirty) ((h.value = w), (h.dirty = E));
      if (!h) this.cache.set(e, { value: w, dirty: E });
      return w;
    }
  }
  async getDefaultBranchIfKnownAnchored() {
    let e = await this.get("defaultBranchIfKnown", this.computeDefaultBranchIfKnownAnchored);
    if (e === null) return e;
    let n = this.commonDir ?? this.gitDir;
    if (n && (await resolveRef(n, `refs/remotes/origin/${e}`))) return e;
    let r = this.cache.get("defaultBranchIfKnown");
    if (r) r.dirty = !0;
    return this.get("defaultBranchIfKnown", this.computeDefaultBranchIfKnownAnchored);
  }
  computeDefaultBranchIfKnownAnchored = async () => {
    let gitDir = this.gitDir;
    if (!gitDir) return null;
    let n = this.commonDir ?? gitDir,
      r = await resolveSymrefTarget(n, "refs/remotes/origin/HEAD", "refs/remotes/origin/");
    if (r && (await resolveRef(n, `refs/remotes/origin/${r}`))) return r;
    return null;
  };
  async addRepo(e) {
    if (this.repoWatchers.has(e)) return;
    let n = await resolveGitDir(e);
    if (!n) return;
    let r = await keepsRefsInReftable(n);
    if (this.repoWatchers.has(e)) return;
    let o = r ? join_5(n, "reftable", "tables.list") : join_5(n, "HEAD");
    if (readPositionIsUnsafe(o, n)) return;
    let watchFile = this.watchFile(o, () => {
      (this.repoBranches.delete(e), this.retriesLeft.delete(`repo:${e}`));
      for (let repoBranchListener of this.repoBranchListeners) repoBranchListener();
    });
    if (uQt() && !this.repoHeadWatches.has(o))
      this.repoHeadWatches.set(
        o,
        new FileStatWatcher(
          o,
          { fallbackPollMs: GIT_WATCH_POLL_MS, safetyPollMs: ya, settleMs: wa },
          this.checkFilesNow,
        ),
      );
    this.repoWatchers.set(e, { gitDir: n, headPath: o, stop: watchFile, reftable: r });
  }
  removeRepo(e) {
    let n = this.repoWatchers.get(e);
    if (!n) return;
    (n.stop(),
      this.repoWatchers.delete(e),
      this.repoBranches.delete(e),
      this.retriesLeft.delete(`repo:${e}`));
  }
  onRepoBranchChange(e) {
    return (
      this.repoBranchListeners.push(e),
      () => {
        let index = this.repoBranchListeners.indexOf(e);
        if (index !== -1) this.repoBranchListeners.splice(index, 1);
      }
    );
  }
  async getBranchForRepo(e) {
    let checkFiles = this.checkFiles("ifDue");
    if (checkFiles) await checkFiles;
    if (this.repoBranches.has(e)) return this.repoBranches.get(e);
    let r = this.repoWatchers.get(e);
    if (!r) return;
    let o = r.reftable && isGitSpawnBlocked(),
      inconclusiveRefReads = this.inconclusiveRefReads,
      a = await readGitHead(r.gitDir),
      c = a?.type === "branch" ? a.name : null;
    if (!o && !this.retryAfterNoAnswer(`repo:${e}`, inconclusiveRefReads)) this.repoBranches.set(e, c);
    return c;
  }
  noteInconclusiveRefRead() {
    this.inconclusiveRefReads++;
  }
  retryAfterNoAnswer(e, n) {
    if (this.inconclusiveRefReads === n) return !1;
    let r = this.retriesLeft.get(e) ?? ha;
    if (r === 0) return !1;
    return (this.retriesLeft.set(e, r - 1), !0);
  }
  reset() {
    (this.generation++,
      this.stopWatching(),
      this.cleanupHandle?.(),
      (this.cleanupHandle = null),
      this.cache.clear(),
      this.computing.clear(),
      this.retriesLeft.clear(),
      this.stateChanged.clear());
    for (let stateChangeTimer of this.stateChangeTimers) clearInterval(stateChangeTimer);
    (this.stateChangeTimers.clear(),
      (this.lastCheckMs = Number.NEGATIVE_INFINITY),
      (this.checkUnderWay = void 0),
      (this.mustCheckAgain = !1),
      this.repoBranches.clear(),
      this.repoWatchers.clear(),
      (this.repoBranchListeners = []),
      (this.initialized = !1),
      (this.initPromise = null),
      (this.gitDir = null),
      (this.commonDir = null),
      (this.reftable = !1));
  }
  reanchor() {
    this.generation++;
    for (let { stop: stop } of this.watchedFiles) stop();
    ((this.watchedFiles = []),
      (this.branchRefPath = null),
      this.cache.clear(),
      this.computing.clear(),
      this.retriesLeft.clear(),
      (this.initialized = !1),
      (this.initPromise = null),
      (this.gitDir = null),
      (this.commonDir = null),
      (this.reftable = !1));
  }
}
//@ chunk-t0gq9gyw.js:101450-101475 layout
var gitFileWatcherByHost = new HostScoped(() => new GitFileWatcher());
/**
 * 取当前宿主的 GitFileWatcher 单例。
 */
//@ chunk-t0gq9gyw.js:101475-101512 layout
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
/**
 * 从 <gitDir>/config 文本解析 remote.origin.pushurl 或 url。
 */
//@ chunk-t0gq9gyw.js:101678-101820 layout
async function readOriginUrlFromConfig(e) {
  if (readPositionIsUnsafe(join_5(e, "config"), e)) return null;
  return (await IMn(e, "remote", "origin", "pushurl")) || (await IMn(e, "remote", "origin", "url"));
}
//@ chunk-t0gq9gyw.js:101820-101962 layout
async function computeRemoteUrl() {
  let e = await resolveGitDir();
  if (!e) return null;
  let n = await readOriginUrlFromConfig(e);
  if (n) return n;
  let r = await getCommonDir(e);
  if (r && r !== e) return readOriginUrlFromConfig(r);
  return null;
}
//@ chunk-t0gq9gyw.js:101962-101988 facade-exports
var CONVENTIONAL_DEFAULT_BRANCH_NAMES = ["main", "master"];
/**
 * 不 spawn 计算默认分支：读 refs/remotes/origin/HEAD 符号引用，否则看 origin/main、origin/master 是否存在，默认 main。
 */
//@ chunk-t0gq9gyw.js:101988-102264 fingerprint = computeDefaultBranch (0.831)
async function computeDefaultBranch() {
  let gitDir = await resolveGitDir();
  if (!gitDir) return "main";
  let commonDir = (await getCommonDir(gitDir)) ?? gitDir,
    branchFromSymref = await resolveSymrefTarget(
      commonDir,
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/",
    );
  if (branchFromSymref && (await resolveRef(commonDir, `refs/remotes/origin/${branchFromSymref}`)))
    return branchFromSymref;
  for (let o of CONVENTIONAL_DEFAULT_BRANCH_NAMES)
    if (await resolveRef(commonDir, `refs/remotes/origin/${o}`)) return o;
  return "main";
}
/**
 * GitFileWatcher 缓存的当前分支名。
 */
//@ chunk-t0gq9gyw.js:102264-102315 facade-exports = getCachedBranch (1)
function getCachedBranch() {
  return getGitFileWatcher().get("branch", () => getBranchForDir());
}
/**
 * GitFileWatcher 缓存的 HEAD sha。
 */
//@ chunk-t0gq9gyw.js:102315-102357 facade-exports = getCachedHead (1)
function getCachedHead() {
  return getGitFileWatcher().get("head", computeHead);
}
/**
 * GitFileWatcher 缓存的 origin URL（config 中 remote.origin.pushurl 优先于 url）。
 */
//@ chunk-t0gq9gyw.js:102357-102404 facade-exports = getCachedRemoteUrl (1)
function getCachedRemoteUrl() {
  return getGitFileWatcher().get("remoteUrl", computeRemoteUrl);
}
/**
 * GitFileWatcher 缓存的默认分支。
 */
//@ chunk-t0gq9gyw.js:102404-102455 facade-exports = getCachedDefaultBranch (1)
function getCachedDefaultBranch() {
  return getGitFileWatcher().get("defaultBranch", computeDefaultBranch);
}
//@ chunk-t0gq9gyw.js:102455-102516 facade-exports
function getCachedDefaultBranchIfKnown() {
  return getGitFileWatcher().getDefaultBranchIfKnownAnchored();
}
//@ chunk-t0gq9gyw.js:102516-102555 facade-exports
function addWatchedRepo(e) {
  return getGitFileWatcher().addRepo(e);
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
  let n = getGitFileWatcher();
  return (n.ensureStarted(), n.onStateChange(e));
}
//@ chunk-t0gq9gyw.js:102711-102759 facade-exports
function getCachedBranchForRepo(e) {
  return getGitFileWatcher().getBranchForRepo(e);
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
  let n = await resolveGitDir(e);
  if (!n) return null;
  let head = await readGitHead(n);
  if (!head) return null;
  if (head.type === "branch") return resolveRef(n, `refs/heads/${head.name}`);
  return head.sha;
}
//@ chunk-t0gq9gyw.js:102982-103100 facade-exports = computeBranch (1)
async function getBranchForDir(e) {
  let n = await resolveGitDir(e);
  if (!n) return "HEAD";
  let head = await readGitHead(n);
  return head?.type === "branch" ? head.name : "HEAD";
}
//@ chunk-t0gq9gyw.js:103100-103190 layout
var reflogWatchesByGitDir = new Map(),
  Pa = 4096,
  Or = /^commit(?: \((?:amend|initial|merge|cherry-pick|rebase)\))?: /;
//@ chunk-t0gq9gyw.js:103190-103383 layout
async function getHeadReflogSize(e) {
  if (readPositionIsUnsafe(join_5(e, "logs", "HEAD"), e)) return null;
  try {
    let n = await lstat(join_5(e, "logs", "HEAD"));
    return n.isFile() ? n.size : null;
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? 0 : null;
  }
}
//@ chunk-t0gq9gyw.js:103383-103828 facade-exports
async function markHeadReflog(e) {
  if (wt()) return;
  let n;
  try {
    let r = await resolveGitDir(e);
    if (r === null) return;
    if (linkChainIsUnsafeToFollow(r, e)) return;
    let o = realpathSync(r),
      s = reflogWatchesByGitDir.get(o) ?? new Set();
    n = { gitDir: r, realGitDir: o, size: 0, overlapped: s.size > 0 };
    for (let c of s) c.overlapped = !0;
    if ((reflogWatchesByGitDir.set(o, s.add(n)), await keepsRefsInReftable(r))) {
      let c = await readReflogEntries(r, 1);
      if (c === void 0) {
        releaseHeadReflogMark(n);
        return;
      }
      return ((n.reftableNewest = c[0]?.key ?? null), n);
    }
    let a = await getHeadReflogSize(r);
    if (a === null) {
      releaseHeadReflogMark(n);
      return;
    }
    return ((n.size = a), n);
  } catch {
    if (n !== void 0) releaseHeadReflogMark(n);
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
  if (e.reftableNewest !== void 0) return readNewCommitFromReftable(e, e.reftableNewest);
  let n = join_5(e.gitDir, "logs", "HEAD");
  if (e.overlapped || readPositionIsUnsafe(n, e.gitDir)) return;
  let r = await readFileGuarded(n, Pa, {
    noFollow: !0,
    fromTail: !0,
    requireNlink1: !0,
    verifyHandlePath: (p) => p === join_5(e.realGitDir, "logs", "HEAD"),
  });
  if (
    r === null ||
    r === "unreadable" ||
    r.end <= e.size ||
    !r.content.endsWith(`
`)
  )
    return;
  let sliced = r.content.slice(0, -1),
    sliced_2 = sliced.slice(
      sliced.lastIndexOf(`
`) + 1,
    );
  if (sliced_2.includes("\uFFFD") || r.end - Buffer.byteLength(sliced_2) - 1 !== e.size) return;
  let index = sliced_2.indexOf("\t");
  if (index === -1) return;
  let [c = "", u = ""] = sliced_2.slice(0, index).split(" ");
  if (!isValidGitSha(c) || !isValidGitSha(u) || c === u || !Or.test(sliced_2.slice(index + 1))) return;
  return getHeadForDir_2(e, u);
}
//@ chunk-t0gq9gyw.js:104542-104732 layout
async function readNewCommitFromReftable(e, n) {
  if (e.overlapped) return;
  let r = await readReflogEntries(e.gitDir, 2),
    [o, s] = r ?? [];
  if (o === void 0 || o.key === n || (s?.key ?? null) !== n || o.id === s?.id || !Or.test(o.subject)) return;
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
  return { commitId: n, ...(gitDir?.type === "branch" && { branch: gitDir.name }) };
}
//@ chunk-t0gq9gyw.js:104937-105584 layout
async function readReflogEntries(e, n) {
  let r = await runGitForWatcher(e, [
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
  if (r === null || r.exitCode === void 0) return;
  if (r.code !== 0) {
    let s = await runGitForWatcher(e, ["symbolic-ref", "-q", "HEAD"]),
      a = s?.code === 0 ? s.stdout.trim() : "";
    if (!a.startsWith("refs/heads/") || !isSafeRefName_2(a)) return;
    return (await runGitForWatcher(e, ["show-ref", "--exists", "--end-of-options", a]))?.exitCode === 2
      ? []
      : void 0;
  }
  let o = [];
  for (let s of r.stdout.split(`
`)) {
    if (s === "") continue;
    let [a = "", c = "", ...u] = s.split("\t");
    if (!isValidGitSha(a) || c === "") return;
    o.push({ key: s, id: a, subject: u.join("\t") });
  }
  return o;
}
//@ chunk-t0gq9gyw.js:105584-106036 facade-exports
async function probeHeadForDirBounded(e, n) {
  if (isDiskless()) return { repo: !0, sha: null };
  let r = resolve(e),
    o = findGitRoot(r),
    s = Mn(resolve(n));
  if (o === null || !isPathWithin(s, o, { alreadyComparable: !0 }))
    return (await hasNoNestedRepoBetween(r, s)) ? { repo: !1 } : { repo: !0, sha: null };
  let [a, c] = await Promise.all([normalizedRealpathOrNull(s), normalizedRealpathOrNull(o)]);
  if (a === null || c === null || !isPathWithin(a, c, { alreadyComparable: !0 }))
    return { repo: !0, sha: null };
  let u = await resolveGitDir(r);
  if (u !== null && (await isPathAbsentLstat(join_5(u, "HEAD")))) {
    if (await hasNoNestedRepoBetween(r, s, o)) return { repo: !1 };
    return { repo: !0, sha: null };
  }
  return { repo: !0, sha: await getHeadForDir(r) };
}
//@ chunk-t0gq9gyw.js:106036-106173 layout
async function hasNoNestedRepoBetween(e, n, r) {
  let o = e;
  for (;;) {
    let s = Mn(o);
    if (s !== r && !(await isPathAbsentLstat(join_5(o, ".git")))) return !1;
    let a = dirname_7(o);
    if (s === n || a === o) return !0;
    o = a;
  }
}
//@ chunk-t0gq9gyw.js:106173-106276 layout = isRealPathWithinTeamDir (1)
async function isPathAbsentLstat(realCandidate) {
  try {
    return (await lstat(realCandidate), !1);
  } catch (error) {
    let code = getErrnoCode(error);
    return code === "ENOENT" || code === "ENOTDIR";
  }
}
//@ chunk-t0gq9gyw.js:106276-106342 layout
async function normalizedRealpathOrNull(e) {
  let n = await realpathAsyncOrNull(e);
  return n === null ? null : Mn(n);
}
//@ chunk-t0gq9gyw.js:106342-106405 layout
async function realpathAsyncOrNull(e) {
  try {
    return await realpath(e);
  } catch {
    return null;
  }
}
/**
 * 读 worktree 目录 .git 文件指向的 gitdir 下的 HEAD，返回 sha（分支则解析 ref），不存在返回 null。
 */
//@ chunk-t0gq9gyw.js:106405-106760 facade-exports = readWorktreeHeadSha (1)
async function readWorktreeHeadSha(worktreePath) {
  let gitDir;
  try {
    if (pointerFileIsSuspect(join_5(worktreePath, ".git"), worktreePath)) return null;
    let ptr = (await readFile(join_5(worktreePath, ".git"), "utf-8")).trim();
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
  let n = await resolveGitDir(e);
  if (!n) return null;
  return getRemoteUrlForGitDir(n);
}
//@ chunk-t0gq9gyw.js:106832-106946 facade-exports
async function getRemoteUrlForGitDir(e, n) {
  let r = await readOriginUrlFromConfig(e);
  if (r) return r;
  let o = n ?? (await getCommonDir(e));
  if (o && o !== e) return readOriginUrlFromConfig(o);
  return null;
}
//@ chunk-t0gq9gyw.js:106946-107057 facade-exports
function getRemoteUrlForDirSync(e) {
  let n = resolveGitDirSync(e);
  if (!n) return null;
  let r = readOriginUrlSync(n);
  if (r) return r;
  let o = readCommonDirSync(n);
  return o && o !== n ? readOriginUrlSync(o) : null;
}
/**
 * 同步解析 cwd 对应的 git 目录（.git 目录本身，或 .git 文件中 gitdir: 指向），结果缓存在 gitDirByCwd。
 */
//@ chunk-t0gq9gyw.js:107057-107383 layout
function resolveGitDirSync(e) {
  let n = resolve(e),
    r = getGitRepoCache().gitDirByCwd.get(n);
  if (r !== void 0) return r;
  let o = findGitRoot(n);
  if (!o) return null;
  let s = join_5(o, ".git");
  try {
    if (!statSync(s).isFile()) return s;
    let a = readBoundedSync(s, GIT_POINTER_MAX_BYTES)?.trim();
    if (a === void 0 || !a.startsWith("gitdir:")) return a === void 0 ? null : s;
    let trimmed = a.slice(7).trim();
    return isOnForeignMount(trimmed, o) || isPointerPathUnsafe(trimmed, o) ? null : resolve(o, trimmed);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:107383-107548 layout
function readCommonDirSync(e) {
  try {
    if (pointerFileIsSuspect(join_5(e, "commondir"), e)) return null;
    let n = readBoundedSync(join_5(e, "commondir"), GIT_POINTER_MAX_BYTES)?.trim();
    return n === void 0 || isOnForeignMount(n, e) || isPointerPathUnsafe(n, e) ? null : resolve(e, n);
  } catch {
    return null;
  }
}
//@ chunk-t0gq9gyw.js:107548-107560 facade-exports
var GIT_CONFIG_MAX_BYTES = 1e6;
//@ chunk-t0gq9gyw.js:107560-107743 layout
function readOriginUrlSync(e) {
  let n = join_5(e, "config");
  if (readPositionIsUnsafe(n, e)) return null;
  let r = readBoundedSync(n, GIT_CONFIG_MAX_BYTES);
  if (r === void 0 || hasNulByte(r)) return null;
  return fut(r, "remote", "origin", "pushurl") || fut(r, "remote", "origin", "url");
}
/**
 * 以 O_NONBLOCK 同步读取小文件：必须是普通文件且不超过上限，否则返回 undefined（避免读到 FIFO/设备或巨型文件）。
 */
//@ chunk-t0gq9gyw.js:107743-108024 facade-exports
function readBoundedSync(e, n) {
  let r;
  try {
    r = openSync(e, constants.O_RDONLY | O_NONBLOCK);
    let o = fstatSync(r);
    if (!o.isFile() || o.size > n) return;
    let allocUnsafe = Buffer.allocUnsafe(n + 1),
      a = 0;
    while (a < allocUnsafe.length) {
      let c = readSync(r, allocUnsafe, a, allocUnsafe.length - a, a);
      if (c === 0) break;
      a += c;
    }
    return a > n ? void 0 : allocUnsafe.toString("utf-8", 0, a);
  } catch {
    return;
  } finally {
    if (r !== void 0) closeSync(r);
  }
}
/**
 * 统计 <commondir>/worktrees 下的条目数（不 spawn）。
 */
//@ chunk-t0gq9gyw.js:108024-108197 facade-exports = getWorktreeCountFromFs (1)
async function getWorktreeCountFromFs() {
  try {
    let gitDir = await resolveGitDir();
    if (!gitDir) return 0;
    let commonDir = (await getCommonDir(gitDir)) ?? gitDir;
    if (readPositionIsUnsafe(join_5(commonDir, "worktrees"), commonDir)) return 1;
    return (await readdir(join_5(commonDir, "worktrees"))).length + 1;
  } catch {
    return 1;
  }
}
//@ chunk-ca06bv0t.js:16992-17085 fingerprint = computeRemoteUrl (0.798)
var computeRemoteUrl_2 = (r) =>
  hasNulByte(r) ? "" : fut(r, "remote", "origin", "pushurl") || fut(r, "remote", "origin", "url") || "";
/**
 * 读 gitDir/commondir 得到共享 git 目录，没有则返回 gitDir 本身。
 */
//@ chunk-dgqyqzy0.js:3870-3908 fingerprint = getCommonDir (0.737)
function getCommonDir_2(gitDir) {
  return lstatErrnoOrFalse(gitDir, "commondir");
}
/**
 * 异步解析 .git：目录直接返回，文件则解析 gitdir: 指向的路径。
 */
//@ chunk-e6aww6q8.js:3599115-3599365 fingerprint = resolveGitDir (1)
async function resolveGitDir_2(startPath) {
  try {
    if (pointerFileIsSuspect(join_91(startPath, ".git"), startPath)) return null;
    let content = (await readFile_15(join_91(startPath, ".git"), "utf-8")).trim();
    if (!content.startsWith("gitdir:")) return null;
    let rawDir = content.slice(7).trim();
    if (isOnForeignMount(rawDir, startPath)) return null;
    if (rawPointerPathIsUnsafe(rawDir, startPath)) return null;
    return resolve_37(startPath, rawDir);
  } catch {
    return null;
  }
}
/**
 * 根据 .git/shallow 等文件判断是否浅克隆。
 */
//@ chunk-s61vbvea.js:254014-254155 fingerprint = isShallowClone (0.431)
function isShallowClone(e, n) {
  return [
    [e.gitDir, "index", "index"],
    [e.commonDir, "shallow", "shallow"],
    ...n.slice(0, Ad).map((r) => [e.gitDir, r, "shared_index"]),
  ];
}
//@ chunk-yj65zw1g.js:625-708 fingerprint = resetGitFileWatcher (0.682)
class resetGitFileWatcher_2 {
  #e = 0;
  next(o, t) {
    return ((this.#e = this.#e * t + o * (1 - t)), this.#e);
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
  getCommonDir_2,
  readLinkTextSafe,
  readBoundedSync,
  GIT_POINTER_MAX_BYTES,
  GIT_CONFIG_MAX_BYTES,
  readGitHead,
  createWalkMemo,
  rawPointerPathWalk,
  getBranchForDir,
  resetGitFileWatcher_2,
  probeHeadForDirBounded,
  getHeadForDir,
  onWatchedGitStateChange,
  isShallowClone,
  readCommitAppendedToHeadReflog,
  Plo,
};
