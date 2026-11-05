/**
 * utils/git/gitExclude.ts
 *
 * 2.1.316 新增。.git/info/exclude 追加。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2g3amcsc.js (3), chunk-75adsf9v.js (3)
 * attribution: placement 5, sole-consumer 1
 */
import { join, dirname, basename } from "path";
import { constants, fstat, read, write, close } from "fs";
import { open, mkdir, lstat, readFile, appendFile } from "fs/promises";
import { promisify } from "util";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getPlatform } from "../platform.js";
import { platformNoFollowFlags } from "../platformTargets.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { getErrnoCode, isENOENT } from "../errors.js";
import { realpathNativeAsync } from "../windowsUncPaths.js";
import { isSentinelInode } from "../slowOperations.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { resolveGitDir, getCommonDir } from "./gitFilesystem.js";
import { findGitRoot } from "../git.js";
import { resolveGitDirs } from "./gitDirResolution.js";
import { logForDebugging } from "../debug.js";

//@ chunk-2g3amcsc.js:663-704 placement
var TENGU_MOONLIT_LOCKET_2 = "tengu_moonlit_locket";
var TENGU_MOONLIT_LOCKET = 1048576;
//@ chunk-2g3amcsc.js:704-4708 placement
/**
 * 向 .git/info/exclude 追加条目（避免把 Claude 产生的文件纳入版本控制）。
 */
async function appendGitExclude(commonDir, appendBlock) {
  let infoDir = join(commonDir, "info");
  let excludePath = join(infoDir, "exclude");
  let posixAtEnabled = readFlagWithOverride(TENGU_MOONLIT_LOCKET_2, {
    safe: true,
  });
  let isWindows = getPlatform() === "windows";
  let commonDirHandle;
  let infoDirHandle;
  let excludeFileHandle;
  let excludeFd;
  try {
    let appendFlags = constants.O_RDWR | constants.O_APPEND | platformNoFollowFlags() | READ_LIMITS;
    let posixFsAt = isWindows || !posixAtEnabled ? undefined : globalThis.Bun?.ant?.posixFsAt;
    let posixFsAt_2 =
      typeof posixFsAt?.openat === "function" &&
      typeof posixFsAt.mkdirat === "function" &&
      typeof posixFsAt.lstatat === "function"
        ? posixFsAt
        : undefined;
    let dirFlags = constants.O_RDONLY | constants.O_DIRECTORY | platformNoFollowFlags() | READ_LIMITS;
    let infoStats;
    let openAttempts = [constants.O_CREAT];
    if (posixFsAt_2 !== undefined) {
      try {
        commonDirHandle = await open(commonDir, dirFlags);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
          return {
            kind: "skipped",
            reason: "the git folder is a link or not a folder",
          };
        throw error;
      }
      try {
        posixFsAt_2.mkdirat(commonDirHandle.fd, "info");
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      }
      try {
        infoDirHandle = posixFsAt_2.openat(commonDirHandle.fd, "info", dirFlags);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ELOOP" || errnoCode === "ENOTDIR")
          return {
            kind: "skipped",
            reason: "its parent folder is a link or not a folder",
          };
        throw error;
      }
    } else {
      let realCommonDir = null;
      if (posixAtEnabled && isWindows) {
        let [realCommonDirPath, realParentDir] = await Promise.all([
          realpathNativeAsync(commonDir),
          realpathNativeAsync(dirname(commonDir)),
        ]);
        if (
          realParentDir === null ||
          !samePrintablePath(realCommonDirPath, join(realParentDir, basename(commonDir)))
        )
          return {
            kind: "skipped",
            reason: "the git folder is a link or could not be resolved",
          };
        realCommonDir = realCommonDirPath;
      }
      await mkdir(infoDir).catch((error) => {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      });
      infoStats = await lstat(infoDir, {
        bigint: true,
      });
      if (
        !infoStats.isDirectory() ||
        (realCommonDir !== null &&
          !samePrintablePath(await realpathNativeAsync(infoDir), join(realCommonDir, "info")))
      )
        return {
          kind: "skipped",
          reason: "its parent folder is a link or not a folder",
        };
      if (posixAtEnabled && isSentinelInode(infoStats.ino))
        return {
          kind: "skipped",
          reason:
            "this drive gives folders no file id, so Claude Code cannot confirm afterwards that the info folder was not swapped",
        };
      try {
        let excludeStats = await lstat(excludePath);
        if (!excludeStats.isFile())
          return {
            kind: "skipped",
            reason: excludeStats.isSymbolicLink() ? "it is a symlink" : "it is not a regular file",
          };
        openAttempts = [0];
      } catch (error) {
        if (!isENOENT(error))
          return {
            kind: "skipped",
            reason: `Claude Code could not check it (${getErrnoCode(error) ?? String(error)})`,
          };
        openAttempts = [constants.O_CREAT | constants.O_EXCL, 0];
      }
    }
    for (let [attemptIndex, createFlag] of openAttempts.entries())
      try {
        if (posixFsAt_2 !== undefined && infoDirHandle !== undefined)
          excludeFd = posixFsAt_2.openat(infoDirHandle, "exclude", appendFlags | createFlag, 420);
        else {
          excludeFileHandle = await open(excludePath, appendFlags | createFlag, 420);
          excludeFd = excludeFileHandle.fd;
        }
        break;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EEXIST" && attemptIndex < openAttempts.length - 1) continue;
        if (errnoCode === "ELOOP")
          return {
            kind: "skipped",
            reason: "it is a symlink",
          };
        if (errnoCode === "EISDIR" || errnoCode === "ENXIO")
          return {
            kind: "skipped",
            reason: "it is not a regular file",
          };
        if (errnoCode === "EEXIST" || errnoCode === "ENOENT")
          return {
            kind: "skipped",
            reason: "it was replaced or removed while Claude Code was opening it",
          };
        if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS") {
          let readHandle = await open(
            excludePath,
            constants.O_RDONLY | platformNoFollowFlags() | READ_LIMITS,
          );
          try {
            let stats = await readHandle.stat();
            if (!stats.isFile() || stats.nlink > 1 || stats.size > TENGU_MOONLIT_LOCKET)
              return {
                kind: "skipped",
                reason: "it cannot be written to",
              };
            let buffer = Buffer.alloc(stats.size);
            let { bytesRead } = await readHandle.read(buffer, 0, buffer.length, 0);
            return appendBlock(buffer.subarray(0, bytesRead)) === null
              ? {
                  kind: "present",
                }
              : {
                  kind: "skipped",
                  reason: "it cannot be written to",
                };
          } finally {
            await readHandle.close();
          }
        }
        throw error;
      }
    if (excludeFd === undefined)
      return {
        kind: "skipped",
        reason: "it was replaced or removed while Claude Code was opening it",
      };
    let fdStats = await promisify(fstat)(excludeFd, {
      bigint: true,
    });
    let pathStats;
    try {
      pathStats =
        posixFsAt_2 !== undefined && infoDirHandle !== undefined
          ? posixFsAt_2.lstatat(infoDirHandle, "exclude")
          : await lstat(excludePath, {
              bigint: true,
            });
    } catch (error) {
      if (!isENOENT(error)) throw error;
      return {
        kind: "skipped",
        reason: "it was replaced or removed while Claude Code was opening it",
      };
    }
    if (!fdStats.isFile() || !pathStats.isFile())
      return {
        kind: "skipped",
        reason: "it is not a regular file",
      };
    if (posixAtEnabled && isSentinelInode(fdStats.ino))
      return {
        kind: "skipped",
        reason:
          "this drive gives files no id, so Claude Code cannot confirm it is writing to the file it checked",
      };
    if ((posixAtEnabled || isWindows) && (pathStats.dev !== fdStats.dev || pathStats.ino !== fdStats.ino))
      return {
        kind: "skipped",
        reason: "it was replaced or removed while Claude Code was opening it",
      };
    if (fdStats.nlink > 1n || pathStats.nlink > 1n)
      return {
        kind: "skipped",
        reason: "it has more than one hard link",
      };
    if (fdStats.size > TENGU_MOONLIT_LOCKET)
      return {
        kind: "skipped",
        reason: "it is larger than 1 MiB",
      };
    if (posixAtEnabled && infoStats !== undefined) {
      let infoStatsAfter = await lstat(infoDir, {
        bigint: true,
      });
      if (
        !infoStatsAfter.isDirectory() ||
        infoStatsAfter.dev !== infoStats.dev ||
        infoStatsAfter.ino !== infoStats.ino
      )
        return {
          kind: "skipped",
          reason: "its parent folder was replaced while Claude Code was opening it",
        };
    }
    let contentBuffer = Buffer.alloc(Number(fdStats.size));
    let { bytesRead } = await promisify(read)(excludeFd, contentBuffer, 0, contentBuffer.length, 0);
    let chunk = contentBuffer.subarray(0, bytesRead);
    let missingBlock = appendBlock(chunk);
    if (missingBlock === null)
      return {
        kind: "present",
      };
    let newlinePrefix =
      chunk.length > 0 && chunk.at(-1) !== 10
        ? `
`
        : "";
    let buffer = Buffer.from(newlinePrefix + missingBlock);
    let writeOffset = isWindows ? Number(fdStats.size) : null;
    let written = 0;
    while (written < buffer.length) {
      let { bytesWritten } = await promisify(write)(
        excludeFd,
        buffer,
        written,
        buffer.length - written,
        writeOffset,
      );
      if (bytesWritten <= 0) throw Error("info/exclude: the write stopped making progress");
      written += bytesWritten;
      if (writeOffset !== null) writeOffset += bytesWritten;
    }
    return {
      kind: "written",
    };
  } finally {
    await Promise.all([
      commonDirHandle?.close(),
      infoDirHandle !== undefined ? promisify(close)(infoDirHandle) : undefined,
      excludeFileHandle !== undefined
        ? excludeFileHandle.close()
        : excludeFd !== undefined
          ? promisify(close)(excludeFd)
          : undefined,
    ]).catch(() => {});
  }
}
//@ chunk-2g3amcsc.js:4708-4747 placement
function samePrintablePath(actualPath, expectedPath) {
  return actualPath !== null && actualPath === expectedPath;
}
//@ chunk-75adsf9v.js:1371-1733 placement
/**
 * Claude Code 在 .claude/ 下写入的运行时文件的 git 忽略规则、标记行与完整规则块。
 */
var RUNTIME_EXCLUDE_PATTERNS = [
  "**/.claude/scheduled_tasks.lock",
  "**/.claude/scheduled_tasks.json",
  "**/.claude/routines/.state/",
  "**/.claude/worktrees/",
  "**/.claude/checkpoints/",
  "**/.claude/mailbox/",
  "**/.claude/agent-registry.json",
  "**/.claude/agent-memory-local",
  "**/.claude/first-run",
  "**/.claude/assistant-daemon-state.json",
];
var RUNTIME_EXCLUDE_MARKER = "# claude-code-runtime";
var RUNTIME_EXCLUDE_BLOCK = [RUNTIME_EXCLUDE_MARKER, ...RUNTIME_EXCLUDE_PATTERNS, ""].join(`
`);
//@ chunk-75adsf9v.js:1733-2870 placement
/**
 * 确保 Claude Code 在 .claude/ 下写的运行时文件被 git 忽略：每个目录只做一次，向公共 git 目录的 info/exclude 追加带标记的规则块（已有标记则跳过）；新路径会先确认 .git 归属与 HEAD/objects 存在，否则记录警告。
 */
async function ensureClaudeRuntimeFilesExcluded(cwd) {
  if (!claimOnce().claim(`claude_runtime_exclude_ensured:${cwd}`)) return;
  try {
    if (
      !readFlagWithOverride(TENGU_MOONLIT_LOCKET_2, {
        safe: true,
      })
    ) {
      let gitDir = await resolveGitDir(cwd);
      if (!gitDir) return;
      let commonDir = (await getCommonDir(gitDir)) ?? gitDir;
      let excludePath = join(commonDir, "info", "exclude");
      let existingText = "";
      try {
        existingText = await readFile(excludePath, "utf-8");
        if (existingText.includes(RUNTIME_EXCLUDE_MARKER)) return;
      } catch (error) {
        if (getErrnoCode(error) !== "ENOENT") throw error;
        await mkdir(join(commonDir, "info")).catch((error) => {
          if (getErrnoCode(error) !== "EEXIST") throw error;
        });
      }
      let leadingNewline =
        existingText &&
        !existingText.endsWith(`
`)
          ? `
`
          : "";
      await appendFile(excludePath, leadingNewline + RUNTIME_EXCLUDE_BLOCK);
      return;
    }
    let gitRoot = findGitRoot(cwd);
    if (gitRoot === null) return;
    let gitDirs = resolveGitDirs(gitRoot);
    if (gitDirs === null) {
      warnExcludeSkipped(
        join(gitRoot, ".git", "info", "exclude"),
        "Claude Code could not confirm that this checkout\u2019s .git belongs to it (the .git holds a commondir file, is a symlink, or is a .git file whose git folder does not point back here, as with --separate-git-dir)",
      );
      return;
    }
    let commonDir = gitDirs.commonDir;
    let excludePath = join(commonDir, "info", "exclude");
    let headStats = await lstat(join(commonDir, "HEAD")).catch(() => null);
    let objectsStats = await lstat(join(commonDir, "objects")).catch(() => null);
    if (!headStats?.isFile() || !objectsStats?.isDirectory()) {
      warnExcludeSkipped(
        excludePath,
        "its git folder lacks a HEAD file or an objects folder of its own (a symbolic link does not count)",
      );
      return;
    }
    let result = await appendGitExclude(commonDir, (text) =>
      text.toString("utf-8").includes(RUNTIME_EXCLUDE_MARKER) ? null : RUNTIME_EXCLUDE_BLOCK,
    );
    if (result.kind === "skipped") warnExcludeSkipped(excludePath, result.reason);
  } catch (error) {
    logForDebugging(`ensureClaudeRuntimeFilesExcluded: ${error}`);
  }
}
//@ chunk-75adsf9v.js:2870-3043 sole-consumer
function warnExcludeSkipped(excludePath, reason) {
  logForDebugging(
    `Not adding ignore rules for the files Claude Code writes under .claude/ to ${excludePath}: ${reason}. Those files may show as untracked in git status.`,
    {
      level: "warn",
    },
  );
}
export { ensureClaudeRuntimeFilesExcluded, appendGitExclude };
