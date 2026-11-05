/**
 * utils/git/builderGit/gitDirIdentity.ts
 *
 * builderGit：git 目录身份与挂载检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fepf8jp6.js (36)
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
  isPathInside,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { resolveRealPathLoose, pathIsForeignOrUnsafePointer } from "./sandboxReach.js";
import { logForDebugging } from "../../debug.js";
import { truncateWithCount } from "../../stringUtils.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { hasBackslash } from "../../pathClassification.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { listGitRefs } from "./gitConfigAudit.js";
import { readGitConfigFile } from "./inTreeConfig.js";
import { birthTimeSalt } from "../../windowsPathNames.js";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "../../fsBoundRead.js";
import { getWslVersion, getPlatform } from "../../platform.js";
import { isSentinelInode, didInodeChange } from "../../slowOperations.js";
import { probeEntryKind } from "./gitDirShape.js";
import { readOnlyNoFollowFlags } from "../../platformTargets.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:73074-73191 placement
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
//@ chunk-fepf8jp6.js:73191-73324 placement
function setupFailure(detail, reason) {
  return {
    kind: "failed",
    reason: reason === "placement" ? "placement" : "setup",
    cause: reason,
    detail,
    [Symbol.asyncDispose]: async () => {},
  };
}
//@ chunk-fepf8jp6.js:73324-73789 placement
async function checkSessionTempRoot(launchDir) {
  let protectedTempDirsWithPreSettings = getProtectedTempDirsWithPreSettings();
  let results = await Promise.all(
    protectedTempDirsWithPreSettings.map(async (protectedTempDirsWithPreSetting) => {
      let foreignSpelling = await resolveForeignSpellingAsync(
        await classifyPathSpelling_3(protectedTempDirsWithPreSetting, launchDir),
        launchDir,
        protectedHomeRoots(),
      );
      if (foreignSpelling.verdict === "local") {
        let realTempRoot = await realpath(foreignSpelling.spelling).catch(() =>
          resolveRealPathLoose(foreignSpelling.spelling, launchDir),
        );
        return realTempRoot === null
          ? spellingsToCheck(
              {
                ...foreignSpelling,
                verdict: "opaque",
              },
              launchDir,
            )
          : [realTempRoot];
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
        launchDir,
      );
    }),
  );
  return normalizeCaseForComparison_2([...protectedTempDirsWithPreSettings, ...results.flat()]);
}
//@ chunk-fepf8jp6.js:73789-74695 placement
async function resolveGitFile(launchDir) {
  let dotGitPath = join(launchDir, ".git");
  let dotGitStats = await lstat(dotGitPath).catch(() => null);
  if (dotGitStats === null || dotGitStats.isDirectory())
    return {
      kind: "not_file",
    };
  if (!dotGitStats.isFile())
    return {
      kind: "refuse",
      why: "git_file",
    };
  let gitdirPointer = readGitdirPointer(
    await readTextFileQuiet(dotGitPath, {
      oneName: true,
    }).catch(() => {
      return;
    }),
  );
  if (
    gitdirPointer === undefined ||
    pathIsForeignOrUnsafePointer(gitdirPointer, launchDir) ||
    hasBackslash(resolveRelative(launchDir, gitdirPointer))
  )
    return {
      kind: "refuse",
      why: "git_file",
    };
  let adminDir = await realpath(resolveRelative(launchDir, gitdirPointer)).catch(() => null);
  if (adminDir === null)
    return {
      kind: "refuse",
      why: "admin_dir",
    };
  if (hasBackslash(adminDir))
    return {
      kind: "refuse",
      why: "admin_dir",
    };
  if (basename(dirname(adminDir)) !== "worktrees")
    return {
      kind: "refuse",
      why: "git_file",
      adminDir,
    };
  let commonDir = dirname(dirname(adminDir));
  if (resolveCommonDir(await readCommonDirFile(adminDir), adminDir) !== commonDir)
    return {
      kind: "refuse",
      why: "common_dir",
      adminDir,
    };
  let backLink = cleanSingleLine(
    await readTextFileQuiet(join(adminDir, "gitdir")).catch(() => {
      return;
    }),
  );
  if (
    (backLink === null ||
    pathIsForeignOrUnsafePointer(backLink, adminDir, launchDir) ||
    hasBackslash(resolveRelative(adminDir, backLink))
      ? null
      : await realpath(resolveRelative(adminDir, backLink)).catch(() => null)) !== dotGitPath
  )
    return {
      kind: "refuse",
      why: "back_link",
      adminDir,
    };
  if (!(await isLooseGitDirPath(commonDir, launchDir)))
    return {
      kind: "refuse",
      why: "placement",
      adminDir,
    };
  return {
    kind: "chain",
    adminDir,
    commonDir,
  };
}
//@ chunk-fepf8jp6.js:74695-76106 placement
async function resolveLinkedWorktreeGitDir(launchDir, adminDirPath, commonDirPath, gitFile) {
  let linkedWorktreeFailure = (detail) => ({
    kind: "linked_worktree",
    detail,
  });
  if (
    pathIsForeignOrUnsafePointer(adminDirPath, launchDir) ||
    pathIsForeignOrUnsafePointer(commonDirPath, launchDir) ||
    hasBackslash(adminDirPath) ||
    hasBackslash(commonDirPath)
  )
    return linkedWorktreeFailure("admin_dir");
  let [resolvedAdminDir, resolvedCommonDir] = await Promise.all([
    realpath(adminDirPath).catch(() => null),
    realpath(commonDirPath).catch(() => null),
  ]);
  if (resolvedAdminDir === null || resolvedCommonDir === null)
    return {
      kind: "unread",
      detail: "the git directory could not be resolved",
    };
  if (hasBackslash(resolvedAdminDir) || hasBackslash(resolvedCommonDir))
    return linkedWorktreeFailure("admin_dir");
  let [fileIdentity, fileIdentity_2, fileIdentity_3, fileIdentity_4] = await Promise.all([
    getFileIdentity(resolvedAdminDir),
    getFileIdentity_2(gitFile.adminDir),
    getFileIdentity(resolvedCommonDir),
    getFileIdentity_2(dirname(dirname(resolvedAdminDir))),
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
    basename(dirname(resolvedAdminDir)) !== "worktrees" ||
    id_2 === null ||
    fileIdentity_4 !== id_2
  )
    return linkedWorktreeFailure("admin_dir");
  let [mountId, mountId_2] = await Promise.all([
    readMountId(resolvedAdminDir),
    readMountId(resolvedCommonDir),
  ]);
  let hasMountIds = mountId !== null && mountId_2 !== null && "id" in mountId && "id" in mountId_2;
  if (
    hasUnreadableGitDirRead([mountId, mountId_2]) ||
    (hasMountIds && (mountId.identity !== id || mountId_2.identity !== id_2))
  )
    return {
      kind: "unread",
      detail: "the git directory changed while it was read",
    };
  if (!hasMountIds && mountId !== null) {
    let joined = [mountId, mountId_2]
      .flatMap((mountRecord) => (mountRecord !== null && "unread" in mountRecord ? [mountRecord.unread] : []))
      .join(", ");
    logForDebugging(
      `[builderGit] ${resolvedAdminDir}: mount ids unread (${joined}); the admin dir is compared with the common dir by device alone`,
    );
  }
  if (
    !sameMount(
      {
        id,
        mountId: hasMountIds ? mountId.id : null,
      },
      {
        id: id_2,
        mountId: hasMountIds ? mountId_2.id : null,
      },
    ) &&
    !(
      hasMountIds &&
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
          dir: resolvedAdminDir,
          mountId: mountId.id,
        },
        {
          dir: resolvedCommonDir,
          mountId: mountId_2.id,
        },
      ))
    )
  )
    return linkedWorktreeFailure("foreign_mount");
  if (resolveCommonDir(await readCommonDirFile(resolvedAdminDir), resolvedAdminDir) !== resolvedCommonDir)
    return linkedWorktreeFailure("common_dir");
  if (!(await isLooseGitDirPath(resolvedCommonDir, launchDir))) return linkedWorktreeFailure("placement");
  let born = fileIdentity?.born;
  let born_2 = fileIdentity_3?.born;
  return {
    kind: "vouched",
    gitDir: resolvedAdminDir,
    gitDirId: id,
    ...(born !== undefined && {
      gitDirBorn: born,
    }),
    commonDir: resolvedCommonDir,
    commonDirId: id_2,
    ...(born_2 !== undefined && {
      commonDirBorn: born_2,
    }),
  };
}
//@ chunk-fepf8jp6.js:76106-76547 placement
/**
 * 两个 git 目录（含 .git）身份或真实路径是否一致。
 */
async function isSameGitDir(expected, resolvedLaunchDir, keyedFolder) {
  if (keyedFolder === null || hasBackslash(keyedFolder)) return false;
  let realKeyedFolder = await realpath(keyedFolder).catch(() => null);
  if (realKeyedFolder === null) return "unresolved";
  if (realKeyedFolder === resolvedLaunchDir) return true;
  let dotGitPath = join(keyedFolder, ".git");
  let id = await getFileIdentity_2(keyedFolder);
  let id_2 = await getFileIdentity_2(dotGitPath);
  let realDotGit = await realpath(dotGitPath).catch((error) =>
    ["ENOENT", "ENOTDIR"].includes(getErrnoCode(error) ?? "") ? null : "unresolved",
  );
  let expectedIdentity = {
    id: expected.id ?? (await getFileIdentity_2(expected.resolved)),
    resolved: expected.resolved,
  };
  return (
    [
      {
        id,
        resolved: realKeyedFolder,
      },
      {
        id: id_2,
        resolved: realDotGit === "unresolved" ? null : realDotGit,
      },
    ].some((candidate) => sameIdentity(candidate, expectedIdentity)) ||
    (realDotGit === "unresolved" ? "unresolved" : false)
  );
}
//@ chunk-fepf8jp6.js:76547-76701 placement
function sameIdentity(left, right) {
  return left.id !== null &&
    right.id !== null &&
    classifyIdentity(left.id) === "an_object" &&
    classifyIdentity(right.id) === "an_object"
    ? left.id === right.id
    : left.resolved !== null && left.resolved === right.resolved;
}
//@ chunk-fepf8jp6.js:76701-76954 placement
async function isLooseGitDirPath(gitDirPath, launchDir) {
  let filtered = gitDirPath.split(sep).filter((segment) => segment !== "");
  let lastSegment = filtered.at(-1) ?? "";
  let isGitNamedSegment = (segment) =>
    segment.toLowerCase() === ".git" || segment.toLowerCase().endsWith(".git");
  if (!isGitNamedSegment(lastSegment) || filtered.slice(0, -1).some(isGitNamedSegment)) return false;
  if (isPathInside(launchDir, gitDirPath) || isPathInside(gitDirPath, launchDir)) return false;
  return !(await checkSessionTempRoot(launchDir)).some((tempRoot) => isPathInside(tempRoot, gitDirPath));
}
//@ chunk-fepf8jp6.js:76954-77187 placement
async function readWorktreeConfigExtension(launchDir, layout, signal, probes) {
  let result = await listGitRefs(
    launchDir,
    [
      "config",
      "--file",
      join(layout.commonDir, "config"),
      "--bool",
      "--default=false",
      "extensions.worktreeConfig",
    ],
    {
      hardened: true,
      layout,
      signal,
      probes,
    },
  );
  return result.code !== 0 ? null : result.stdout.trim() === "true";
}
//@ chunk-fepf8jp6.js:77187-77558 placement
/**
 * worktree 配置状态：absent/extension/inert/file/unread。
 */
async function classifyWorktreeConfig(launchDir, layout, signal, probes) {
  let [configResult, fileKind] = await Promise.all([
    listGitRefs(
      launchDir,
      [
        "config",
        "--file",
        join(layout.commonDir, "config"),
        "--bool",
        "--default=false",
        "extensions.worktreeConfig",
      ],
      {
        hardened: true,
        layout,
        signal,
        probes,
      },
    ),
    probeWorktreeConfigFile(layout.gitDir),
  ]);
  if (configResult.code !== 0 || fileKind === "unread") return "unread";
  if (fileKind !== "absent") return (await isInertWorktreeConfig(layout.gitDir)) ? "inert" : "file";
  return configResult.stdout.trim() === "false" ? "absent" : "extension";
}
//@ chunk-fepf8jp6.js:77558-77669 placement
async function isInertWorktreeConfig(gitDir) {
  let gitConfigFile = await readGitConfigFile(join(gitDir, "config.worktree"), false);
  return gitConfigFile.kind === "read" && gitConfigFile.inertWorktreeKeysOnly;
}
//@ chunk-fepf8jp6.js:77669-77856 placement
/**
 * config.worktree 是否存在（空文件视为不存在）。
 */
function probeWorktreeConfigFile(gitDir) {
  return lstat(join(gitDir, "config.worktree")).then(
    (stats) => (stats.isFile() && stats.nlink === 1 && stats.size === 0 ? "absent" : "standing"),
    (error) => {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "unread";
    },
  );
}
//@ chunk-fepf8jp6.js:77856-77994 placement (2.1.88 match: getFileIdentity, 0.785)
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
//@ chunk-fepf8jp6.js:77994-78096 placement
function sameMount(left, right) {
  let mountIdOf = (id) => id.slice(0, id.indexOf(":"));
  return mountIdOf(left.id) === mountIdOf(right.id) && left.mountId === right.mountId;
}
//@ chunk-fepf8jp6.js:78096-78720 placement
async function readMountInfo(leftLocation, rightLocation) {
  let mountInfo;
  try {
    mountInfo = await readFile("/proc/self/mountinfo", "utf8");
  } catch {
    return false;
  }
  let decodeOctal = (encoded) =>
    encoded.replace(/\\([0-7]{3})/g, (escapeMatch, octal) => String.fromCharCode(parseInt(octal, 8)));
  let mountsById = new Map();
  for (let line of mountInfo.split(`
`)) {
    let parts = line.split(" ");
    if (parts.length >= 5 && (parts[0] === leftLocation.mountId || parts[0] === rightLocation.mountId))
      mountsById.set(parts[0], {
        device: parts[2],
        root: decodeOctal(parts[3]),
        point: decodeOctal(parts[4]),
      });
  }
  let leftMount = mountsById.get(leftLocation.mountId);
  let rightMount = mountsById.get(rightLocation.mountId);
  if (leftMount === undefined || rightMount === undefined) return false;
  let toMountPath = (dir, mount) => {
    let relPath = relative(mount.point, dir);
    return relPath.startsWith("..") || isAbsolute(relPath) ? null : join(mount.root, relPath);
  };
  let leftMountedPath = toMountPath(leftLocation.dir, leftMount);
  let rightMountedPath = toMountPath(rightLocation.dir, rightMount);
  let dirRelPath = relative(rightLocation.dir, leftLocation.dir);
  return (
    leftMount.device === rightMount.device &&
    leftMountedPath !== null &&
    rightMountedPath !== null &&
    !dirRelPath.startsWith("..") &&
    !isAbsolute(dirRelPath) &&
    leftMountedPath === join(rightMountedPath, dirRelPath)
  );
}
//@ chunk-fepf8jp6.js:78720-78780 placement
var GIT_DIR_READ_FAILURE_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fepf8jp6.js:78720", () => {
  GIT_DIR_READ_FAILURE_ERRNOS = new Set(["ENOENT", "ENOTDIR", "ELOOP", "ENAMETOOLONG"]);
});
//@ chunk-fepf8jp6.js:78780-78876 placement
function hasUnreadableGitDirRead(reads) {
  return reads.some(
    (read) =>
      read !== null &&
      "unread" in read &&
      read.stage === "open" &&
      GIT_DIR_READ_FAILURE_ERRNOS.has(read.unread),
  );
}
//@ chunk-fepf8jp6.js:78876-78918 placement
var OPEN_GIT_DIR_FLAGS = O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
//@ chunk-fepf8jp6.js:78918-79302 placement
/**
 * 经 /proc/self/fdinfo 读挂载 id 与身份。
 */
async function readMountId(filePath) {
  let handle;
  try {
    handle = await open(filePath, OPEN_GIT_DIR_FLAGS);
    let [file, stats] = await Promise.all([
      readFile(`/proc/self/fdinfo/${handle.fd}`, "utf8"),
      handle.stat({
        bigint: true,
      }),
    ]);
    let rawMountId = /^mnt_id:[ \t]*(\d+)$/m.exec(file)?.[1];
    return rawMountId === undefined
      ? {
          unread: "no mnt_id in fdinfo",
          stage: "fdinfo",
        }
      : {
          id: rawMountId,
          identity: `${stats.dev}:${stats.ino}`,
        };
  } catch (error) {
    return {
      unread: getErrnoCode(error) ?? errorMessage(error),
      stage: handle === undefined ? "open" : "fdinfo",
    };
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-fepf8jp6.js:79302-79363 placement
/**
 * 判断 git 目录身份是否仍成立（未持有或非 gone 且 id 相同）。
 */
function gitDirIdentityHeld(hold, expectedId) {
  return hold === "not_held" || (hold !== "gone" && hold.id === expectedId);
}
//@ chunk-fepf8jp6.js:79363-79543 placement
function gitDirChangedFailure(...holds) {
  return {
    kind: "failed",
    detail: "a git directory was replaced after the read opened it, or could not be opened",
    why: "changed_under_hold",
    unopened: holds.includes("gone"),
  };
}
//@ chunk-fepf8jp6.js:79543-79628 placement
function isWsl2Kernel() {
  return getWslVersion() === "1" && !release().toLowerCase().includes("microsoft-standard");
}
//@ chunk-fepf8jp6.js:79628-80001 placement
function holdDirectory() {
  let openHandles = [];
  return {
    hold: async (dirPath) => {
      if (O_NOFOLLOW_ANY === 0 || isWsl2Kernel()) return "not_held";
      try {
        let handle = await open(dirPath, OPEN_GIT_DIR_FLAGS);
        openHandles.push(handle);
        let stats = await handle.stat({
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
      await Promise.all(openHandles.splice(0).map((handle) => handle.close().catch(() => {})));
    },
  };
}
//@ chunk-fepf8jp6.js:80001-80122 placement (2.1.88 match: getFileIdentity, 1)
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
//@ chunk-fepf8jp6.js:80122-80272 placement
/**
 * dev:ino 字符串：an_object/none/unreadable。
 */
function classifyIdentity(identity) {
  let [, devPart, inoPart] = /^(-?\d+):(-?\d+)$/.exec(identity) ?? [];
  return devPart === undefined || inoPart === undefined
    ? "unreadable"
    : BigInt(devPart) === 0n || isSentinelInode(BigInt(inoPart))
      ? "none"
      : "an_object";
}
//@ chunk-fepf8jp6.js:80272-80534 placement
/**
 * 工作树是否同一：the_same/another_at_the_path/another_elsewhere/not_known。
 */
function compareWorkTree(layout, spelledWorkTree, currentWorkTreeId) {
  if (
    currentWorkTreeId === null ||
    layout.workTreeId === undefined ||
    classifyIdentity(currentWorkTreeId) === "unreadable" ||
    classifyIdentity(layout.workTreeId) === "unreadable"
  )
    return "not_known";
  let sameSpelling = layout.workTree === toPosixSpelling(spelledWorkTree);
  return layout.workTreeId === currentWorkTreeId &&
    (sameSpelling || classifyIdentity(currentWorkTreeId) === "an_object")
    ? "the_same"
    : sameSpelling
      ? "another_at_the_path"
      : "another_elsewhere";
}
//@ chunk-fepf8jp6.js:80534-80598 placement
/**
 * 在 Windows 上把反斜杠转成正斜杠，其它平台原样返回。
 */
function toPosixSpelling(path) {
  return getPlatform() === "windows" ? path.replaceAll("\\", "/") : path;
}
//@ chunk-fepf8jp6.js:80598-80671 placement
/**
 * 生成 git 目录的比较键（多种拼写形式排序后以分隔符连接）。
 */
function gitDirComparisonKey(gitDir, launchDir) {
  return normalizeCaseForComparison_2(
    [gitDir, launchDir].flatMap((path) => [dirname(path), toPosixSpelling(dirname(path))]),
  ).join(delimiter);
}
//@ chunk-fepf8jp6.js:80671-80838 placement (2.1.88 match: scanDirectory, 0.767)
async function probePathKind(commonDir, commonDir_2) {
  let currentPath = commonDir;
  for (let part of commonDir_2.slice(0, -1)) {
    currentPath = join(currentPath, part);
    let kind = await probeEntryKind(currentPath);
    if (kind !== "directory") return kind === "absent" ? "absent" : "other";
  }
  return probeEntryKind(join(currentPath, commonDir_2.at(-1)));
}
//@ chunk-fepf8jp6.js:80838-80850 placement
var MAX_COMMONDIR_FILE_BYTES = 4096;
//@ chunk-fepf8jp6.js:80850-80976 placement
async function readCommonDirFile(gitDir) {
  try {
    let textFileQuiet = await readTextFileQuiet(join(gitDir, "commondir"));
    return cleanSingleLine(textFileQuiet) ?? undefined;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? null : undefined;
  }
}
//@ chunk-fepf8jp6.js:80976-81046 placement
/**
 * 静默读取文本文件内容（失败返回 undefined）。
 */
async function readTextFileQuiet(filePath, options = {}) {
  return (
    (await openWithIdentityCheck(filePath, options)) ?? (await openWithIdentityCheck(filePath, options))
  )?.text;
}
//@ chunk-fepf8jp6.js:81046-81751 placement
async function openWithIdentityCheck(filePath, { tail, oneName = false }) {
  let beforeStats =
    getPlatform() === "windows"
      ? await lstat(filePath, {
          bigint: true,
        })
      : null;
  if (beforeStats !== null && !beforeStats.isFile())
    return {
      text: undefined,
    };
  let handle = await open(filePath, readOnlyNoFollowFlags());
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    if (beforeStats !== null && didInodeChange(beforeStats, stats)) {
      logForDebugging(
        `[builderGit] ${filePath}, once opened, had file number ${stats.ino}, not the ${beforeStats.ino} that the lstat before it saw; nothing of it was read`,
      );
      return null;
    }
    let size = Number(stats.size);
    if (
      !stats.isFile() ||
      (oneName && stats.nlink !== 1n) ||
      (tail === undefined && size > MAX_COMMONDIR_FILE_BYTES)
    )
      return {
        text: undefined,
      };
    let min = Math.min(size, tail ?? MAX_COMMONDIR_FILE_BYTES);
    let buffer = Buffer.alloc(min);
    let { bytesRead } = await handle.read(buffer, 0, min, size - min);
    if (bytesRead !== min)
      return {
        text: undefined,
      };
    let afterStats = oneName
      ? await handle.stat({
          bigint: true,
        })
      : stats;
    return {
      text:
        afterStats.nlink === stats.nlink && afterStats.ctimeNs === stats.ctimeNs
          ? buffer.toString("utf8")
          : undefined,
    };
  } finally {
    await handle.close();
  }
}
//@ chunk-fepf8jp6.js:81751-81891 placement
function resolveCommonDir(commonDirFile, gitDir) {
  if (commonDirFile === undefined) return;
  let normalized =
    commonDirFile === null
      ? "."
      : commonDirFile.length > 1 && commonDirFile.endsWith("/")
        ? commonDirFile.slice(0, -1)
        : commonDirFile;
  return normalized === "." ? gitDir : normalized === "../.." ? dirname(dirname(gitDir)) : normalized;
}
//@ chunk-fepf8jp6.js:81891-81981 placement
/**
 * 去掉末尾换行；没有换行时返回 null。
 */
function stripLineEnding(stdout) {
  let lineEndingRe = getPlatform() === "windows" ? /\r?\n$/ : /\n$/;
  return lineEndingRe.test(stdout) ? stdout.replace(lineEndingRe, "") : null;
}
//@ chunk-fepf8jp6.js:81981-82210 placement
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
  gitDirEnv,
  checkSessionTempRoot,
  resolveGitFile,
  isSameGitDir,
  gitDirComparisonKey,
  stripLineEnding,
  gitDirIdentityHeld,
  gitDirChangedFailure,
  getFileIdentity_2,
  resolveLinkedWorktreeGitDir,
  sameIdentity,
  toPosixSpelling,
  classifyWorktreeConfig,
  readCommonDirFile,
  probePathKind,
  resolveCommonDir,
  setupFailure,
  readTextFileQuiet,
  readWorktreeConfigExtension,
  homeSetupFailure,
  probeWorktreeConfigFile,
  holdDirectory,
  classifyIdentity,
  compareWorkTree,
};
