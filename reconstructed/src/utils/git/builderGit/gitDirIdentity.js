/**
 * utils/git/builderGit/gitDirIdentity.ts
 *
 * builderGit：git 目录身份与挂载检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (36)
 * attribution: placement 36
 */
import {
  realpath,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  delimiter,
} from "path";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
} from "fs";
import { release } from "os";
import {
  getProtectedTempDirsWithPreSettings,
  protectedHomeRoots,
} from "../../permissions/protectedSettingsPaths.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_2,
  spellingsToCheck,
  readGitdirPointer,
  resolveRelative,
  cleanSingleLine,
  isPathInside as isPathInside_2,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { resolveRealPathLoose, Lyn } from "./sandboxReach.js";
import { logForDebugging } from "../../debug.js";
import { truncateWithCount } from "../../stringUtils.js";
import { uniq } from "../../collections.js";
import { rc } from "../../pathClassification.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { listGitRefs } from "./gitConfigAudit.js";
import { readGitConfigFile } from "./inTreeConfig.js";
import { u6o } from "../../windowsPathNames.js";
import { tz, READ_LIMITS } from "../../fsBoundRead.js";
import { getWslVersion, getPlatform as getPlatform_2 } from "../../platform.js";
import { isSentinelInode, Kwr } from "../../slowOperations.js";
import { probeEntryKind } from "./gitDirShape.js";
import { $c } from "../../platformTargets.js";

//@ chunk-s61vbvea.js:279403-279520 placement
function homeSetupFailure(e, n) {
  return {
    kind: "failed",
    reason: "setup",
    cause: "home",
    home: n,
    detail: e,
    [Symbol.asyncDispose]: async () => {},
  };
}
//@ chunk-s61vbvea.js:279520-279653 placement
function setupFailure(e, n) {
  return {
    kind: "failed",
    reason: n === "placement" ? "placement" : "setup",
    cause: n,
    detail: e,
    [Symbol.asyncDispose]: async () => {},
  };
}
//@ chunk-s61vbvea.js:279653-280118 placement
async function checkSessionTempRoot(e) {
  let n = getProtectedTempDirsWithPreSettings(),
    results = await Promise.all(
      n.map(async (s) => {
        let h = await resolveForeignSpellingAsync(
          await classifyPathSpelling_2(s, e),
          e,
          protectedHomeRoots(),
        );
        if (h.verdict === "local") {
          let y = await realpath_3(h.spelling).catch(() => resolveRealPathLoose(h.spelling, e));
          return y === null ? spellingsToCheck({ ...h, verdict: "opaque" }, e) : [y];
        }
        return (
          logForDebugging(
            `[builderGit] session temp root ${truncateWithCount(s, 256)} cannot be vouched for (${h.verdict}): nothing under any volume is`,
            { level: "warn" },
          ),
          spellingsToCheck(h.verdict === "foreign" ? { ...h, verdict: "opaque" } : h, e)
        );
      }),
    );
  return uniq([...n, ...results.flat()]);
}
//@ chunk-s61vbvea.js:280118-281030 placement
async function resolveGitFile(e) {
  let n = join_7(e, ".git"),
    r = await lstat_2(n).catch(() => null);
  if (r === null || r.isDirectory()) return { kind: "not_file" };
  if (!r.isFile()) return { kind: "refuse", why: "git_file" };
  let s = readGitdirPointer(
    await lKt(n, { oneName: !0 }).catch(() => {
      return;
    }),
  );
  if (s === void 0 || Lyn(s, e) || rc(resolveRelative(e, s))) return { kind: "refuse", why: "git_file" };
  let h = await realpath_3(resolveRelative(e, s)).catch(() => null);
  if (h === null) return { kind: "refuse", why: "admin_dir" };
  if (rc(h)) return { kind: "refuse", why: "admin_dir" };
  if (basename_2(dirname_2(h)) !== "worktrees") return { kind: "refuse", why: "git_file", adminDir: h };
  let y = dirname_2(dirname_2(h));
  if (resolveCommonDir(await readCommonDirFile(h), h) !== y)
    return { kind: "refuse", why: "common_dir", adminDir: h };
  let S = cleanSingleLine(
    await lKt(join_7(h, "gitdir")).catch(() => {
      return;
    }),
  );
  if (
    (S === null || Lyn(S, h, e) || rc(resolveRelative(h, S))
      ? null
      : await realpath_3(resolveRelative(h, S)).catch(() => null)) !== n
  )
    return { kind: "refuse", why: "back_link", adminDir: h };
  if (!(await isLooseGitDirPath(y, e))) return { kind: "refuse", why: "placement", adminDir: h };
  return { kind: "chain", adminDir: h, commonDir: y };
}
//@ chunk-s61vbvea.js:281030-282455 placement
async function resolveLinkedWorktreeGitDir(e, n, r, s) {
  let h = (ae) => ({ kind: "linked_worktree", detail: ae });
  if (Lyn(n, e) || Lyn(r, e) || rc(n) || rc(r)) return h("admin_dir");
  let [y, S] = await Promise.all([realpath_3(n).catch(() => null), realpath_3(r).catch(() => null)]);
  if (y === null || S === null) return { kind: "unread", detail: "the git directory could not be resolved" };
  if (rc(y) || rc(S)) return h("admin_dir");
  let [w, R, x, P] = await Promise.all([
      getFileIdentity(y),
      getFileIdentity_2(s.adminDir),
      getFileIdentity(S),
      getFileIdentity_2(dirname_2(dirname_2(y))),
    ]),
    j = w?.id ?? null,
    G = x?.id ?? null;
  if (j !== null && j === G) return { kind: "git_file" };
  if (j === null || R !== j || basename_2(dirname_2(y)) !== "worktrees" || G === null || P !== G)
    return h("admin_dir");
  let [L, q] = await Promise.all([readMountId(y), readMountId(S)]),
    Q = L !== null && q !== null && "id" in L && "id" in q;
  if (HI([L, q]) || (Q && (L.identity !== j || q.identity !== G)))
    return { kind: "unread", detail: "the git directory changed while it was read" };
  if (!Q && L !== null) {
    let joined = [L, q].flatMap((se) => (se !== null && "unread" in se ? [se.unread] : [])).join(", ");
    logForDebugging(
      `[builderGit] ${y}: mount ids unread (${joined}); the admin dir is compared with the common dir by device alone`,
    );
  }
  if (
    !sameMount({ id: j, mountId: Q ? L.id : null }, { id: G, mountId: Q ? q.id : null }) &&
    !(
      Q &&
      sameMount({ id: j, mountId: null }, { id: G, mountId: null }) &&
      (await readMountInfo({ dir: y, mountId: L.id }, { dir: S, mountId: q.id }))
    )
  )
    return h("foreign_mount");
  if (resolveCommonDir(await readCommonDirFile(y), y) !== S) return h("common_dir");
  if (!(await isLooseGitDirPath(S, e))) return h("placement");
  let Z = w?.born,
    ee = x?.born;
  return {
    kind: "vouched",
    gitDir: y,
    gitDirId: j,
    ...(Z !== void 0 && { gitDirBorn: Z }),
    commonDir: S,
    commonDirId: G,
    ...(ee !== void 0 && { commonDirBorn: ee }),
  };
}
/**
 * 两个 git 目录（含 .git）身份或真实路径是否一致。
 */
//@ chunk-s61vbvea.js:282455-282897 placement
async function isSameGitDir(e, n, r) {
  if (r === null || rc(r)) return !1;
  let s = await realpath_3(r).catch(() => null);
  if (s === null) return "unresolved";
  if (s === n) return !0;
  let h = join_7(r, ".git"),
    y = await getFileIdentity_2(r),
    S = await getFileIdentity_2(h),
    w = await realpath_3(h).catch((P) =>
      ["ENOENT", "ENOTDIR"].includes(getErrnoCode(P) ?? "") ? null : "unresolved",
    ),
    R = { id: e.id ?? (await getFileIdentity_2(e.resolved)), resolved: e.resolved };
  return (
    [
      { id: y, resolved: s },
      { id: S, resolved: w === "unresolved" ? null : w },
    ].some((P) => sameIdentity(P, R)) || (w === "unresolved" ? "unresolved" : !1)
  );
}
//@ chunk-s61vbvea.js:282897-283051 placement
function sameIdentity(e, n) {
  return e.id !== null &&
    n.id !== null &&
    classifyIdentity(e.id) === "an_object" &&
    classifyIdentity(n.id) === "an_object"
    ? e.id === n.id
    : e.resolved !== null && e.resolved === n.resolved;
}
//@ chunk-s61vbvea.js:283051-283304 placement
async function isLooseGitDirPath(e, n) {
  let filtered = e.split(sep_5).filter((S) => S !== ""),
    s = filtered.at(-1) ?? "",
    h = (S) => S.toLowerCase() === ".git" || S.toLowerCase().endsWith(".git");
  if (!h(s) || filtered.slice(0, -1).some(h)) return !1;
  if (isPathInside_2(n, e) || isPathInside_2(e, n)) return !1;
  return !(await checkSessionTempRoot(n)).some((S) => isPathInside_2(S, e));
}
//@ chunk-s61vbvea.js:283304-283538 placement
async function readWorktreeConfigExtension(e, n, r, s) {
  let h = await listGitRefs(
    e,
    [
      "config",
      "--file",
      join_7(n.commonDir, "config"),
      "--bool",
      "--default=false",
      "extensions.worktreeConfig",
    ],
    { hardened: !0, layout: n, signal: r, probes: s },
  );
  return h.code !== 0 ? null : h.stdout.trim() === "true";
}
/**
 * worktree 配置状态：absent/extension/inert/file/unread。
 */
//@ chunk-s61vbvea.js:283538-283910 placement
async function classifyWorktreeConfig(e, n, r, s) {
  let [h, y] = await Promise.all([
    listGitRefs(
      e,
      [
        "config",
        "--file",
        join_7(n.commonDir, "config"),
        "--bool",
        "--default=false",
        "extensions.worktreeConfig",
      ],
      { hardened: !0, layout: n, signal: r, probes: s },
    ),
    probeWorktreeConfigFile(n.gitDir),
  ]);
  if (h.code !== 0 || y === "unread") return "unread";
  if (y !== "absent") return (await isInertWorktreeConfig(n.gitDir)) ? "inert" : "file";
  return h.stdout.trim() === "false" ? "absent" : "extension";
}
//@ chunk-s61vbvea.js:283910-284022 placement
async function isInertWorktreeConfig(e) {
  let n = await readGitConfigFile(join_7(e, "config.worktree"), !1);
  return n.kind === "read" && n.inertWorktreeKeysOnly;
}
/**
 * config.worktree 是否存在（空文件视为不存在）。
 */
//@ chunk-s61vbvea.js:284022-284211 placement
function probeWorktreeConfigFile(e) {
  return lstat_2(join_7(e, "config.worktree")).then(
    (n) => (n.isFile() && n.nlink === 1 && n.size === 0 ? "absent" : "standing"),
    (n) => {
      let r = getErrnoCode(n);
      return r === "ENOENT" || r === "ENOTDIR" ? "absent" : "unread";
    },
  );
}
//@ chunk-s61vbvea.js:284211-284350 placement = getFileIdentity (0.787)
async function getFileIdentity(filePath) {
  try {
    let stats = await lstat_2(filePath, { bigint: !0 });
    return stats.isDirectory() ? { id: `${stats.dev}:${stats.ino}`, born: u6o(stats) } : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:284350-284452 placement
function sameMount(e, n) {
  let r = (s) => s.slice(0, s.indexOf(":"));
  return r(e.id) === r(n.id) && e.mountId === n.mountId;
}
//@ chunk-s61vbvea.js:284452-285080 placement
async function readMountInfo(e, n) {
  let r;
  try {
    r = await readFile_2("/proc/self/mountinfo", "utf8");
  } catch {
    return !1;
  }
  let s = (j) => j.replace(/\\([0-7]{3})/g, (G, L) => String.fromCharCode(parseInt(L, 8))),
    h = new Map();
  for (let j of r.split(`
`)) {
    let parts = j.split(" ");
    if (parts.length >= 5 && (parts[0] === e.mountId || parts[0] === n.mountId))
      h.set(parts[0], { device: parts[2], root: s(parts[3]), point: s(parts[4]) });
  }
  let y = h.get(e.mountId),
    S = h.get(n.mountId);
  if (y === void 0 || S === void 0) return !1;
  let w = (j, G) => {
      let L = relative_5(G.point, j);
      return L.startsWith("..") || isAbsolute_6(L) ? null : join_7(G.root, L);
    },
    R = w(e.dir, y),
    x = w(n.dir, S),
    P = relative_5(n.dir, e.dir);
  return (
    y.device === S.device &&
    R !== null &&
    x !== null &&
    !P.startsWith("..") &&
    !isAbsolute_6(P) &&
    R === join_7(x, P)
  );
}
//@ chunk-s61vbvea.js:285080-285140 placement
var FI = new Set(["ENOENT", "ENOTDIR", "ELOOP", "ENAMETOOLONG"]);
//@ chunk-s61vbvea.js:285140-285236 placement
function HI(e) {
  return e.some((n) => n !== null && "unread" in n && n.stage === "open" && FI.has(n.unread));
}
//@ chunk-s61vbvea.js:285236-285278 placement
var kS = tz | constants_4.O_DIRECTORY | constants_4.O_NOFOLLOW | READ_LIMITS;
/**
 * 经 /proc/self/fdinfo 读挂载 id 与身份。
 */
//@ chunk-s61vbvea.js:285278-285662 placement
async function readMountId(e) {
  let n;
  try {
    n = await open_4(e, kS);
    let [r, s] = await Promise.all([readFile_2(`/proc/self/fdinfo/${n.fd}`, "utf8"), n.stat({ bigint: !0 })]),
      h = /^mnt_id:[ \t]*(\d+)$/m.exec(r)?.[1];
    return h === void 0
      ? { unread: "no mnt_id in fdinfo", stage: "fdinfo" }
      : { id: h, identity: `${s.dev}:${s.ino}` };
  } catch (error) {
    return { unread: getErrnoCode(error) ?? errorMessage(error), stage: n === void 0 ? "open" : "fdinfo" };
  } finally {
    await n?.close().catch(() => {});
  }
}
//@ chunk-s61vbvea.js:285662-285723 placement
function fd(e, n) {
  return e === "not_held" || (e !== "gone" && e.id === n);
}
//@ chunk-s61vbvea.js:285723-285903 placement
function gitDirChangedFailure(...e) {
  return {
    kind: "failed",
    detail: "a git directory was replaced after the read opened it, or could not be opened",
    why: "changed_under_hold",
    unopened: e.includes("gone"),
  };
}
//@ chunk-s61vbvea.js:285903-285988 placement
function $I() {
  return getWslVersion() === "1" && !release().toLowerCase().includes("microsoft-standard");
}
//@ chunk-s61vbvea.js:285988-286361 placement
function holdDirectory() {
  let e = [];
  return {
    hold: async (n) => {
      if (tz === 0 || $I()) return "not_held";
      try {
        let r = await open_4(n, kS);
        e.push(r);
        let stats = await r.stat({ bigint: !0 });
        return { id: `${stats.dev}:${stats.ino}` };
      } catch (error) {
        return (
          logForDebugging(
            `[builderGit] could not open a directory to hold it: ${getErrnoCode(error) ?? errorMessage(error)}`,
          ),
          "gone"
        );
      }
    },
    [Symbol.asyncDispose]: async () => {
      await Promise.all(e.splice(0).map((n) => n.close().catch(() => {})));
    },
  };
}
//@ chunk-s61vbvea.js:286361-286483 placement = getFileIdentity (1)
async function getFileIdentity_2(filePath) {
  try {
    let stats = await lstat_2(filePath, { bigint: !0 });
    return stats.isDirectory() ? `${stats.dev}:${stats.ino}` : null;
  } catch {
    return null;
  }
}
/**
 * dev:ino 字符串：an_object/none/unreadable。
 */
//@ chunk-s61vbvea.js:286483-286633 placement
function classifyIdentity(e) {
  let [, n, r] = /^(-?\d+):(-?\d+)$/.exec(e) ?? [];
  return n === void 0 || r === void 0
    ? "unreadable"
    : BigInt(n) === 0n || isSentinelInode(BigInt(r))
      ? "none"
      : "an_object";
}
/**
 * 工作树是否同一：the_same/another_at_the_path/another_elsewhere/not_known。
 */
//@ chunk-s61vbvea.js:286633-286895 placement
function compareWorkTree(e, n, r) {
  if (
    r === null ||
    e.workTreeId === void 0 ||
    classifyIdentity(r) === "unreadable" ||
    classifyIdentity(e.workTreeId) === "unreadable"
  )
    return "not_known";
  let s = e.workTree === Dnt(n);
  return e.workTreeId === r && (s || classifyIdentity(r) === "an_object")
    ? "the_same"
    : s
      ? "another_at_the_path"
      : "another_elsewhere";
}
//@ chunk-s61vbvea.js:286895-286959 placement
function Dnt(e) {
  return getPlatform_2() === "windows" ? e.replaceAll("\\", "/") : e;
}
//@ chunk-s61vbvea.js:286959-287034 placement
function UI(e, n) {
  return uniq([e, n].flatMap((r) => [dirname_2(r), Dnt(dirname_2(r))])).join(delimiter);
}
//@ chunk-s61vbvea.js:287034-287203 placement = scanDirectory (0.766)
async function probePathKind(e, n) {
  let r = e;
  for (let s of n.slice(0, -1)) {
    r = join_7(r, s);
    let h = await probeEntryKind(r);
    if (h !== "directory") return h === "absent" ? "absent" : "other";
  }
  return probeEntryKind(join_7(r, n.at(-1)));
}
//@ chunk-s61vbvea.js:287203-287215 placement
var Ay = 4096;
//@ chunk-s61vbvea.js:287215-287342 placement
async function readCommonDirFile(e) {
  try {
    let n = await lKt(join_7(e, "commondir"));
    return cleanSingleLine(n) ?? void 0;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? null : void 0;
  }
}
//@ chunk-s61vbvea.js:287342-287412 placement
async function lKt(e, n = {}) {
  return ((await openWithIdentityCheck(e, n)) ?? (await openWithIdentityCheck(e, n)))?.text;
}
//@ chunk-s61vbvea.js:287412-288118 placement
async function openWithIdentityCheck(e, { tail: tail, oneName: oneName = !1 }) {
  let s = getPlatform_2() === "windows" ? await lstat_2(e, { bigint: !0 }) : null;
  if (s !== null && !s.isFile()) return { text: void 0 };
  let h = await open_4(e, $c());
  try {
    let stats = await h.stat({ bigint: !0 });
    if (s !== null && Kwr(s, stats))
      return (
        logForDebugging(
          `[builderGit] ${e}, once opened, had file number ${stats.ino}, not the ${s.ino} that the lstat before it saw; nothing of it was read`,
        ),
        null
      );
    let S = Number(stats.size);
    if (!stats.isFile() || (oneName && stats.nlink !== 1n) || (tail === void 0 && S > Ay))
      return { text: void 0 };
    let min = Math.min(S, tail ?? Ay),
      alloc = Buffer.alloc(min),
      { bytesRead: bytesRead } = await h.read(alloc, 0, min, S - min);
    if (bytesRead !== min) return { text: void 0 };
    let P = oneName ? await h.stat({ bigint: !0 }) : stats;
    return { text: P.nlink === stats.nlink && P.ctimeNs === stats.ctimeNs ? alloc.toString("utf8") : void 0 };
  } finally {
    await h.close();
  }
}
//@ chunk-s61vbvea.js:288118-288260 placement
function resolveCommonDir(e, n) {
  if (e === void 0) return;
  let r = e === null ? "." : e.length > 1 && e.endsWith("/") ? e.slice(0, -1) : e;
  return r === "." ? n : r === "../.." ? dirname_2(dirname_2(n)) : r;
}
//@ chunk-s61vbvea.js:288260-288350 placement
function pd(e) {
  let n = getPlatform_2() === "windows" ? /\r?\n$/ : /\n$/;
  return n.test(e) ? e.replace(n, "") : null;
}
//@ chunk-s61vbvea.js:288350-288580 placement
function gitDirEnv({
  gitDir: gitDir,
  commonDir: commonDir,
  workTree: workTree,
  adminDir: adminDir,
  pinnedIndexFile: pinnedIndexFile,
}) {
  return adminDir === void 0
    ? {
        GIT_DIR: gitDir,
        GIT_COMMON_DIR: commonDir,
        GIT_WORK_TREE: workTree,
        ...(pinnedIndexFile !== void 0 && { GIT_INDEX_FILE: pinnedIndexFile }),
      }
    : { GIT_DIR: adminDir, GIT_WORK_TREE: workTree, GIT_INDEX_FILE: join_7(adminDir, "index") };
}

export {
  Dnt,
  checkSessionTempRoot,
  probeWorktreeConfigFile,
  lKt,
  holdDirectory,
  classifyIdentity,
  compareWorkTree,
  getFileIdentity_2,
  gitDirEnv,
  resolveGitFile,
  isSameGitDir,
  UI,
  pd,
  fd,
  gitDirChangedFailure,
  resolveLinkedWorktreeGitDir,
  sameIdentity,
  classifyWorktreeConfig,
  readCommonDirFile,
  probePathKind,
  resolveCommonDir,
  setupFailure,
  readWorktreeConfigExtension,
  homeSetupFailure,
};
