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
import { realpath, lstat, readFile, open } from "fs/promises";
import { join, basename, dirname, sep, relative, isAbsolute, delimiter } from "path";
import { constants } from "fs";
import { release } from "os";
import {
  getProtectedTempDirsWithPreSettings,
  protectedHomeRoots,
} from "../../permissions/protectedSettingsPaths.js";
import {
  resolveForeignSpellingAsync,
  classifyPathSpelling_3,
  spellingsToCheck,
  readGitdirPointer,
  resolveRelative,
  cleanSingleLine,
  isPathInside as isPathInside_2,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { resolveRealPathLoose, pathIsForeignOrUnsafePointer } from "./sandboxReach.js";
import { logForDebugging } from "../../debug.js";
import { truncateWithCount } from "../../stringUtils.js";
import { uniq } from "../../collections.js";
import { hasBackslash } from "../../pathClassification.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { listGitRefs } from "./gitConfigAudit.js";
import { readGitConfigFile } from "./inTreeConfig.js";
import { birthTimeSalt } from "../../windowsPathNames.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "../../fsBoundRead.js";
import { getWslVersion, getPlatform as getPlatform_2 } from "../../platform.js";
import { isSentinelInode, didInodeChange } from "../../slowOperations.js";
import { probeEntryKind } from "./gitDirShape.js";
import { readOnlyNoFollowFlags } from "../../platformTargets.js";

//@ chunk-s61vbvea.js:279403-279520 placement
function homeSetupFailure(detail, home) {
  return {
    kind: "failed",
    reason: "setup",
    cause: "home",
    home,
    detail,
    [Symbol.asyncDispose]: async () => {},
  };
}
//@ chunk-s61vbvea.js:279520-279653 placement
function setupFailure(detail, n) {
  return {
    kind: "failed",
    reason: n === "placement" ? "placement" : "setup",
    cause: n,
    detail,
    [Symbol.asyncDispose]: async () => {},
  };
}
//@ chunk-s61vbvea.js:279653-280118 placement
async function checkSessionTempRoot(e) {
  let protectedTempDirsWithPreSettings = getProtectedTempDirsWithPreSettings();
  let results = await Promise.all(
    protectedTempDirsWithPreSettings.map(async (protectedTempDirsWithPreSetting) => {
      let foreignSpelling = await resolveForeignSpellingAsync(
        await classifyPathSpelling_3(protectedTempDirsWithPreSetting, e),
        e,
        protectedHomeRoots(),
      );
      if (foreignSpelling.verdict === "local") {
        let y = await realpath(foreignSpelling.spelling).catch(() =>
          resolveRealPathLoose(foreignSpelling.spelling, e),
        );
        return y === null
          ? spellingsToCheck(
              {
                ...foreignSpelling,
                verdict: "opaque",
              },
              e,
            )
          : [y];
      }
      logForDebugging(
        `[builderGit] session temp root ${truncateWithCount(protectedTempDirsWithPreSetting, 256)} cannot be vouched for (${foreignSpelling.verdict}): nothing under any volume is`,
        {
          level: "warn",
        },
      );
      return spellingsToCheck(
        foreignSpelling.verdict === "foreign"
          ? {
              ...foreignSpelling,
              verdict: "opaque",
            }
          : foreignSpelling,
        e,
      );
    }),
  );
  return uniq([...protectedTempDirsWithPreSettings, ...results.flat()]);
}
//@ chunk-s61vbvea.js:280118-281030 placement
async function resolveGitFile(e) {
  let n = join(e, ".git");
  let r = await lstat(n).catch(() => null);
  if (r === null || r.isDirectory())
    return {
      kind: "not_file",
    };
  if (!r.isFile())
    return {
      kind: "refuse",
      why: "git_file",
    };
  let gitdirPointer = readGitdirPointer(
    await readTextFileQuiet(n, {
      oneName: true,
    }).catch(() => {
      return;
    }),
  );
  if (
    gitdirPointer === undefined ||
    pathIsForeignOrUnsafePointer(gitdirPointer, e) ||
    hasBackslash(resolveRelative(e, gitdirPointer))
  )
    return {
      kind: "refuse",
      why: "git_file",
    };
  let h = await realpath(resolveRelative(e, gitdirPointer)).catch(() => null);
  if (h === null)
    return {
      kind: "refuse",
      why: "admin_dir",
    };
  if (hasBackslash(h))
    return {
      kind: "refuse",
      why: "admin_dir",
    };
  if (basename(dirname(h)) !== "worktrees")
    return {
      kind: "refuse",
      why: "git_file",
      adminDir: h,
    };
  let y = dirname(dirname(h));
  if (resolveCommonDir(await readCommonDirFile(h), h) !== y)
    return {
      kind: "refuse",
      why: "common_dir",
      adminDir: h,
    };
  let S = cleanSingleLine(
    await readTextFileQuiet(join(h, "gitdir")).catch(() => {
      return;
    }),
  );
  if (
    (S === null || pathIsForeignOrUnsafePointer(S, h, e) || hasBackslash(resolveRelative(h, S))
      ? null
      : await realpath(resolveRelative(h, S)).catch(() => null)) !== n
  )
    return {
      kind: "refuse",
      why: "back_link",
      adminDir: h,
    };
  if (!(await isLooseGitDirPath(y, e)))
    return {
      kind: "refuse",
      why: "placement",
      adminDir: h,
    };
  return {
    kind: "chain",
    adminDir: h,
    commonDir: y,
  };
}
//@ chunk-s61vbvea.js:281030-282455 placement
async function resolveLinkedWorktreeGitDir(e, n, r, gitFile) {
  let h = (detail) => ({
    kind: "linked_worktree",
    detail,
  });
  if (
    pathIsForeignOrUnsafePointer(n, e) ||
    pathIsForeignOrUnsafePointer(r, e) ||
    hasBackslash(n) ||
    hasBackslash(r)
  )
    return h("admin_dir");
  let [filePath, filePath_2] = await Promise.all([
    realpath(n).catch(() => null),
    realpath(r).catch(() => null),
  ]);
  if (filePath === null || filePath_2 === null)
    return {
      kind: "unread",
      detail: "the git directory could not be resolved",
    };
  if (hasBackslash(filePath) || hasBackslash(filePath_2)) return h("admin_dir");
  let [fileIdentity, fileIdentity_2, fileIdentity_3, fileIdentity_4] = await Promise.all([
    getFileIdentity(filePath),
    getFileIdentity_2(gitFile.adminDir),
    getFileIdentity(filePath_2),
    getFileIdentity_2(dirname(dirname(filePath))),
  ]);
  let id = fileIdentity?.id ?? null;
  let id_2 = fileIdentity_3?.id ?? null;
  if (id !== null && id === id_2)
    return {
      kind: "git_file",
    };
  if (
    id === null ||
    fileIdentity_2 !== id ||
    basename(dirname(filePath)) !== "worktrees" ||
    id_2 === null ||
    fileIdentity_4 !== id_2
  )
    return h("admin_dir");
  let [mountId, mountId_2] = await Promise.all([readMountId(filePath), readMountId(filePath_2)]);
  let Q = mountId !== null && mountId_2 !== null && "id" in mountId && "id" in mountId_2;
  if (
    hasUnreadableGitDirRead([mountId, mountId_2]) ||
    (Q && (mountId.identity !== id || mountId_2.identity !== id_2))
  )
    return {
      kind: "unread",
      detail: "the git directory changed while it was read",
    };
  if (!Q && mountId !== null) {
    let joined = [mountId, mountId_2]
      .flatMap((se) => (se !== null && "unread" in se ? [se.unread] : []))
      .join(", ");
    logForDebugging(
      `[builderGit] ${filePath}: mount ids unread (${joined}); the admin dir is compared with the common dir by device alone`,
    );
  }
  if (
    !sameMount(
      {
        id,
        mountId: Q ? mountId.id : null,
      },
      {
        id: id_2,
        mountId: Q ? mountId_2.id : null,
      },
    ) &&
    !(
      Q &&
      sameMount(
        {
          id,
          mountId: null,
        },
        {
          id: id_2,
          mountId: null,
        },
      ) &&
      (await readMountInfo(
        {
          dir: filePath,
          mountId: mountId.id,
        },
        {
          dir: filePath_2,
          mountId: mountId_2.id,
        },
      ))
    )
  )
    return h("foreign_mount");
  if (resolveCommonDir(await readCommonDirFile(filePath), filePath) !== filePath_2) return h("common_dir");
  if (!(await isLooseGitDirPath(filePath_2, e))) return h("placement");
  let born = fileIdentity?.born;
  let born_2 = fileIdentity_3?.born;
  return {
    kind: "vouched",
    gitDir: filePath,
    gitDirId: id,
    ...(born !== undefined && {
      gitDirBorn: born,
    }),
    commonDir: filePath_2,
    commonDirId: id_2,
    ...(born_2 !== undefined && {
      commonDirBorn: born_2,
    }),
  };
}
//@ chunk-s61vbvea.js:282455-282897 placement
/**
 * 两个 git 目录（含 .git）身份或真实路径是否一致。
 */
async function isSameGitDir(e, n, r) {
  if (r === null || hasBackslash(r)) return false;
  let s = await realpath(r).catch(() => null);
  if (s === null) return "unresolved";
  if (s === n) return true;
  let h = join(r, ".git");
  let id = await getFileIdentity_2(r);
  let id_2 = await getFileIdentity_2(h);
  let w = await realpath(h).catch((error) =>
    ["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "") ? null : "unresolved",
  );
  let R = {
    id: e.id ?? (await getFileIdentity_2(e.resolved)),
    resolved: e.resolved,
  };
  return (
    [
      {
        id,
        resolved: s,
      },
      {
        id: id_2,
        resolved: w === "unresolved" ? null : w,
      },
    ].some((P) => sameIdentity(P, R)) || (w === "unresolved" ? "unresolved" : false)
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
  let filtered = e.split(sep).filter((S) => S !== "");
  let s = filtered.at(-1) ?? "";
  let h = (S) => S.toLowerCase() === ".git" || S.toLowerCase().endsWith(".git");
  if (!h(s) || filtered.slice(0, -1).some(h)) return false;
  if (isPathInside_2(n, e) || isPathInside_2(e, n)) return false;
  return !(await checkSessionTempRoot(n)).some((S) => isPathInside_2(S, e));
}
//@ chunk-s61vbvea.js:283304-283538 placement
async function readWorktreeConfigExtension(e, n, signal, probes) {
  let h = await listGitRefs(
    e,
    [
      "config",
      "--file",
      join(n.commonDir, "config"),
      "--bool",
      "--default=false",
      "extensions.worktreeConfig",
    ],
    {
      hardened: true,
      layout: n,
      signal,
      probes,
    },
  );
  return h.code !== 0 ? null : h.stdout.trim() === "true";
}
//@ chunk-s61vbvea.js:283538-283910 placement
/**
 * worktree 配置状态：absent/extension/inert/file/unread。
 */
async function classifyWorktreeConfig(e, n, signal, probes) {
  let [h, y] = await Promise.all([
    listGitRefs(
      e,
      [
        "config",
        "--file",
        join(n.commonDir, "config"),
        "--bool",
        "--default=false",
        "extensions.worktreeConfig",
      ],
      {
        hardened: true,
        layout: n,
        signal,
        probes,
      },
    ),
    probeWorktreeConfigFile(n.gitDir),
  ]);
  if (h.code !== 0 || y === "unread") return "unread";
  if (y !== "absent") return (await isInertWorktreeConfig(n.gitDir)) ? "inert" : "file";
  return h.stdout.trim() === "false" ? "absent" : "extension";
}
//@ chunk-s61vbvea.js:283910-284022 placement
async function isInertWorktreeConfig(gitDir) {
  let gitConfigFile = await readGitConfigFile(join(gitDir, "config.worktree"), false);
  return gitConfigFile.kind === "read" && gitConfigFile.inertWorktreeKeysOnly;
}
//@ chunk-s61vbvea.js:284022-284211 placement
/**
 * config.worktree 是否存在（空文件视为不存在）。
 */
function probeWorktreeConfigFile(e) {
  return lstat(join(e, "config.worktree")).then(
    (n) => (n.isFile() && n.nlink === 1 && n.size === 0 ? "absent" : "standing"),
    (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unread";
    },
  );
}
//@ chunk-s61vbvea.js:284211-284350 placement = getFileIdentity (0.787)
async function getFileIdentity(filePath) {
  try {
    let stats = await lstat(filePath, {
      bigint: true,
    });
    return stats.isDirectory()
      ? {
          id: `${stats.dev}:${stats.ino}`,
          born: birthTimeSalt(stats),
        }
      : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:284350-284452 placement
function sameMount(e, n) {
  let r = (id) => id.slice(0, id.indexOf(":"));
  return r(e.id) === r(n.id) && e.mountId === n.mountId;
}
//@ chunk-s61vbvea.js:284452-285080 placement
async function readMountInfo(e, n) {
  let r;
  try {
    r = await readFile("/proc/self/mountinfo", "utf8");
  } catch {
    return false;
  }
  let s = (j) => j.replace(/\\([0-7]{3})/g, (G, L) => String.fromCharCode(parseInt(L, 8)));
  let h = new Map();
  for (let line of r.split(`
`)) {
    let parts = line.split(" ");
    if (parts.length >= 5 && (parts[0] === e.mountId || parts[0] === n.mountId))
      h.set(parts[0], {
        device: parts[2],
        root: s(parts[3]),
        point: s(parts[4]),
      });
  }
  let y = h.get(e.mountId);
  let S = h.get(n.mountId);
  if (y === undefined || S === undefined) return false;
  let w = (dir, G) => {
    let L = relative(G.point, dir);
    return L.startsWith("..") || isAbsolute(L) ? null : join(G.root, L);
  };
  let R = w(e.dir, y);
  let x = w(n.dir, S);
  let P = relative(n.dir, e.dir);
  return (
    y.device === S.device &&
    R !== null &&
    x !== null &&
    !P.startsWith("..") &&
    !isAbsolute(P) &&
    R === join(x, P)
  );
}
//@ chunk-s61vbvea.js:285080-285140 placement
var GIT_DIR_READ_FAILURE_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ELOOP", "ENAMETOOLONG"]);
//@ chunk-s61vbvea.js:285140-285236 placement
function hasUnreadableGitDirRead(e) {
  return e.some(
    (n) => n !== null && "unread" in n && n.stage === "open" && GIT_DIR_READ_FAILURE_ERRNOS.has(n.unread),
  );
}
//@ chunk-s61vbvea.js:285236-285278 placement
var OPEN_GIT_DIR_FLAGS = O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
//@ chunk-s61vbvea.js:285278-285662 placement
/**
 * 经 /proc/self/fdinfo 读挂载 id 与身份。
 */
async function readMountId(e) {
  let n;
  try {
    n = await open(e, OPEN_GIT_DIR_FLAGS);
    let [file, s] = await Promise.all([
      readFile(`/proc/self/fdinfo/${n.fd}`, "utf8"),
      n.stat({
        bigint: true,
      }),
    ]);
    let h = /^mnt_id:[ \t]*(\d+)$/m.exec(file)?.[1];
    return h === undefined
      ? {
          unread: "no mnt_id in fdinfo",
          stage: "fdinfo",
        }
      : {
          id: h,
          identity: `${s.dev}:${s.ino}`,
        };
  } catch (error) {
    return {
      unread: getErrnoCode(error) ?? errorMessage(error),
      stage: n === undefined ? "open" : "fdinfo",
    };
  } finally {
    await n?.close().catch(() => {});
  }
}
//@ chunk-s61vbvea.js:285662-285723 placement
/**
 * 判断 git 目录身份是否仍成立（未持有或非 gone 且 id 相同）。
 */
function gitDirIdentityHeld(e, n) {
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
function isWsl2Kernel() {
  return getWslVersion() === "1" && !release().toLowerCase().includes("microsoft-standard");
}
//@ chunk-s61vbvea.js:285988-286361 placement
function holdDirectory() {
  let e = [];
  return {
    hold: async (n) => {
      if (O_NOFOLLOW_ANY === 0 || isWsl2Kernel()) return "not_held";
      try {
        let r = await open(n, OPEN_GIT_DIR_FLAGS);
        e.push(r);
        let stats = await r.stat({
          bigint: true,
        });
        return {
          id: `${stats.dev}:${stats.ino}`,
        };
      } catch (error) {
        logForDebugging(
          `[builderGit] could not open a directory to hold it: ${getErrnoCode(error) ?? errorMessage(error)}`,
        );
        return "gone";
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
    let stats = await lstat(filePath, {
      bigint: true,
    });
    return stats.isDirectory() ? `${stats.dev}:${stats.ino}` : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:286483-286633 placement
/**
 * dev:ino 字符串：an_object/none/unreadable。
 */
function classifyIdentity(e) {
  let [, n, r] = /^(-?\d+):(-?\d+)$/.exec(e) ?? [];
  return n === undefined || r === undefined
    ? "unreadable"
    : BigInt(n) === 0n || isSentinelInode(BigInt(r))
      ? "none"
      : "an_object";
}
//@ chunk-s61vbvea.js:286633-286895 placement
/**
 * 工作树是否同一：the_same/another_at_the_path/another_elsewhere/not_known。
 */
function compareWorkTree(layout, n, r) {
  if (
    r === null ||
    layout.workTreeId === undefined ||
    classifyIdentity(r) === "unreadable" ||
    classifyIdentity(layout.workTreeId) === "unreadable"
  )
    return "not_known";
  let s = layout.workTree === toPosixSpelling(n);
  return layout.workTreeId === r && (s || classifyIdentity(r) === "an_object")
    ? "the_same"
    : s
      ? "another_at_the_path"
      : "another_elsewhere";
}
//@ chunk-s61vbvea.js:286895-286959 placement
/**
 * 在 Windows 上把反斜杠转成正斜杠，其它平台原样返回。
 */
function toPosixSpelling(e) {
  return getPlatform_2() === "windows" ? e.replaceAll("\\", "/") : e;
}
//@ chunk-s61vbvea.js:286959-287034 placement
/**
 * 生成 git 目录的比较键（多种拼写形式排序后以分隔符连接）。
 */
function gitDirComparisonKey(e, n) {
  return uniq([e, n].flatMap((r) => [dirname(r), toPosixSpelling(dirname(r))])).join(delimiter);
}
//@ chunk-s61vbvea.js:287034-287203 placement = scanDirectory (0.766)
async function probePathKind(commonDir, n) {
  let r = commonDir;
  for (let s of n.slice(0, -1)) {
    r = join(r, s);
    let h = await probeEntryKind(r);
    if (h !== "directory") return h === "absent" ? "absent" : "other";
  }
  return probeEntryKind(join(r, n.at(-1)));
}
//@ chunk-s61vbvea.js:287203-287215 placement
var MAX_COMMONDIR_FILE_BYTES = 4096;
//@ chunk-s61vbvea.js:287215-287342 placement
async function readCommonDirFile(e) {
  try {
    let textFileQuiet = await readTextFileQuiet(join(e, "commondir"));
    return cleanSingleLine(textFileQuiet) ?? undefined;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? null : undefined;
  }
}
//@ chunk-s61vbvea.js:287342-287412 placement
/**
 * 静默读取文本文件内容（失败返回 undefined）。
 */
async function readTextFileQuiet(e, n = {}) {
  return ((await openWithIdentityCheck(e, n)) ?? (await openWithIdentityCheck(e, n)))?.text;
}
//@ chunk-s61vbvea.js:287412-288118 placement
async function openWithIdentityCheck(e, { tail, oneName = false }) {
  let s =
    getPlatform_2() === "windows"
      ? await lstat(e, {
          bigint: true,
        })
      : null;
  if (s !== null && !s.isFile())
    return {
      text: undefined,
    };
  let h = await open(e, readOnlyNoFollowFlags());
  try {
    let stats = await h.stat({
      bigint: true,
    });
    if (s !== null && didInodeChange(s, stats)) {
      logForDebugging(
        `[builderGit] ${e}, once opened, had file number ${stats.ino}, not the ${s.ino} that the lstat before it saw; nothing of it was read`,
      );
      return null;
    }
    let S = Number(stats.size);
    if (
      !stats.isFile() ||
      (oneName && stats.nlink !== 1n) ||
      (tail === undefined && S > MAX_COMMONDIR_FILE_BYTES)
    )
      return {
        text: undefined,
      };
    let min = Math.min(S, tail ?? MAX_COMMONDIR_FILE_BYTES);
    let R = Buffer.alloc(min);
    let { bytesRead } = await h.read(R, 0, min, S - min);
    if (bytesRead !== min)
      return {
        text: undefined,
      };
    let P = oneName
      ? await h.stat({
          bigint: true,
        })
      : stats;
    return {
      text: P.nlink === stats.nlink && P.ctimeNs === stats.ctimeNs ? R.toString("utf8") : undefined,
    };
  } finally {
    await h.close();
  }
}
//@ chunk-s61vbvea.js:288118-288260 placement
function resolveCommonDir(commonDirFile, n) {
  if (commonDirFile === undefined) return;
  let r =
    commonDirFile === null
      ? "."
      : commonDirFile.length > 1 && commonDirFile.endsWith("/")
        ? commonDirFile.slice(0, -1)
        : commonDirFile;
  return r === "." ? n : r === "../.." ? dirname(dirname(n)) : r;
}
//@ chunk-s61vbvea.js:288260-288350 placement
/**
 * 去掉末尾换行；没有换行时返回 null。
 */
function stripLineEnding(stdout) {
  let n = getPlatform_2() === "windows" ? /\r?\n$/ : /\n$/;
  return n.test(stdout) ? stdout.replace(n, "") : null;
}
//@ chunk-s61vbvea.js:288350-288580 placement
function gitDirEnv({ gitDir, commonDir, workTree, adminDir, pinnedIndexFile }) {
  return adminDir === undefined
    ? {
        GIT_DIR: gitDir,
        GIT_COMMON_DIR: commonDir,
        GIT_WORK_TREE: workTree,
        ...(pinnedIndexFile !== undefined && {
          GIT_INDEX_FILE: pinnedIndexFile,
        }),
      }
    : {
        GIT_DIR: adminDir,
        GIT_WORK_TREE: workTree,
        GIT_INDEX_FILE: join(adminDir, "index"),
      };
}
export {
  toPosixSpelling,
  checkSessionTempRoot,
  probeWorktreeConfigFile,
  readTextFileQuiet,
  holdDirectory,
  classifyIdentity,
  compareWorkTree,
  getFileIdentity_2,
  gitDirEnv,
  resolveGitFile,
  isSameGitDir,
  gitDirComparisonKey,
  stripLineEnding,
  gitDirIdentityHeld,
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
