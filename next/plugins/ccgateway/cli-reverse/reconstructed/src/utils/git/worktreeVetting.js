/**
 * utils/git/worktreeVetting.ts
 *
 * 2.1.316 新增：worktree 目录与 gitdir 校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b2dh3swb.js (34)
 * attribution: placement 34
 */
import { readlink, lstat, stat, readdir, realpath } from "fs/promises";
import { join, resolve, normalize, sep, isAbsolute, relative, dirname, parse, basename } from "path";
import { constants } from "fs";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { getErrnoCode, isENOENT, errorMessage } from "../errors.js";
import {
  isWindowsShortcutAbsent,
  symlinkVerdictForPath,
  stripTrailingSeparators,
  isSafeAbsoluteWorktreePath,
  normalizePathKey,
  checkPathForSymlinks,
} from "../pathIdentity.js";
import { readFileGuarded } from "../fsSafety/guardedFileRead.js";
import { isOnForeignMount } from "../networkPaths.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { buildGitConfigEnv } from "./gitConfigEnv.js";
import { env } from "../env.js";
import { identity } from "../identity.js";
import { openFailureText } from "./worktreeRegistrations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b2dh3swb.js:1124-1168 placement
var MAX_GITDIR_FILE_BYTES = 65536;
var MAX_LINK_TEXT_BYTES = 4096;
var runGitForVetting = (args, options) => execFileNoThrowWithCwd(gitExe(), args, options);
//@ chunk-b2dh3swb.js:1168-4308 placement
/**
 * 检查目录是否为可安全操作的 worktree：.git 指针、gitdir 与 commondir 是否一致且在仓库内。
 */
async function vetWorktree(repoRoot, { dotGitLink = "refuse", run: runGit = runGitForVetting } = {}) {
  let skip = (skipped, reason) => {
    logForDebugging(`Could not vet the worktree registrations of ${repoRoot}: ${reason}`, {
      level: "warn",
    });
    return {
      skipped,
      why: reason,
    };
  };
  let isWindows = getPlatform() === "windows";
  let probeSymlink = async (linkPath) => {
    let verdict = await readlink(linkPath).then(
      () => "link",
      (error) => (getErrnoCode(error) === "EINVAL" ? "clear" : isENOENT(error) ? "missing" : "unknown"),
    );
    if (verdict !== "missing") return verdict;
    return (await isWindowsShortcutAbsent(linkPath)) ? "missing" : "unknown";
  };
  let dotGitPath = join(repoRoot, ".git");
  let dotGitVerdict = await symlinkVerdictForPath(dotGitPath, repoRoot);
  let gitDirPath;
  let ownerUids;
  if (dotGitVerdict === "clear") {
    let [dotGitStats, rootStats] = await Promise.all([
      lstat(dotGitPath).catch(() => null),
      stat(repoRoot).then(
        (stats) => stats,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (rootStats === null) return skip("gone", "the repository root is gone");
    if (rootStats === undefined) return skip("unvettable", "the repository root cannot be stat'd");
    if (dotGitStats === null) return skip("unvettable", ".git vanished");
    if (!dotGitStats.isDirectory()) return skip("pointer", ".git is not a real directory (a pointer file)");
    gitDirPath = dotGitPath;
    ownerUids = [dotGitStats.uid, rootStats.uid];
  } else if (dotGitVerdict === "missing") {
    let [headStats, objectsStats, rootStats] = await Promise.all([
      lstat(join(repoRoot, "HEAD")).catch(() => null),
      lstat(join(repoRoot, "objects")).catch(() => null),
      stat(repoRoot).then(
        (stats) => stats,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (rootStats === null) return skip("gone", "the repository root is gone");
    if (rootStats === undefined) return skip("unvettable", "the repository root cannot be stat'd");
    if (headStats === null || !headStats.isFile() || objectsStats === null || !objectsStats.isDirectory())
      return skip("not-a-repository", "no .git, and the root is not a bare git directory");
    gitDirPath = repoRoot;
    ownerUids = [rootStats.uid];
  } else if (dotGitVerdict === "link" && dotGitLink === "vet") {
    let gitdirFile = await readGitdirFile(dotGitPath, repoRoot);
    if ("refused" in gitdirFile) return skip("unvettable", `.git is a link whose text ${gitdirFile.refused}`);
    let text = gitdirFile.text;
    let resolvedLinkTarget = stripTrailingSeparators(resolve(repoRoot, text));
    let rootSpelling = stripTrailingSeparators(normalize(repoRoot));
    if (
      (await symlinkVerdictForPath(
        resolvedLinkTarget,
        resolvedLinkTarget.startsWith(rootSpelling + sep) ? rootSpelling : undefined,
      )) !== "clear"
    )
      return skip(
        "unvettable",
        ".git is a link whose target is missing, goes through another link, or cannot be probed",
      );
    let [linkStats, linkHeadStats, linkObjectsStats, rootStats] = await Promise.all([
      lstat(resolvedLinkTarget).catch(() => null),
      lstat(join(resolvedLinkTarget, "HEAD")).catch(() => null),
      lstat(join(resolvedLinkTarget, "objects")).catch(() => null),
      stat(repoRoot).then(
        (stats) => stats,
        (error) => (isENOENT(error) ? null : undefined),
      ),
    ]);
    if (rootStats === null) return skip("gone", "the repository root is gone");
    if (rootStats === undefined) return skip("unvettable", "the repository root cannot be stat'd");
    if (
      linkStats === null ||
      !linkStats.isDirectory() ||
      linkHeadStats === null ||
      !linkHeadStats.isFile() ||
      linkObjectsStats === null ||
      !linkObjectsStats.isDirectory()
    )
      return skip("unvettable", ".git is a link to something other than a git directory");
    gitDirPath = resolvedLinkTarget;
    ownerUids = [linkStats.uid, rootStats.uid];
  } else return skip("unvettable", ".git is a link, a mount point, or cannot be probed");
  if ((await probeSymlink(join(gitDirPath, "commondir"))) !== "missing")
    return skip("unvettable", `${gitDirPath}/commondir exists, which git never writes into a main git dir`);
  let ownershipProblem =
    isWindows || !ownerUids.every(isTrustedOwnerUid)
      ? await gitConfigEnvOverrides(repoRoot, gitDirPath, runGit)
      : null;
  if (ownershipProblem !== null) return skip("unvettable", ownershipProblem);
  let worktreesDir = join(gitDirPath, "worktrees");
  let worktreesVerdict = await symlinkVerdictForPath(worktreesDir, repoRoot);
  let vetted = new Map();
  let refused = new Map();
  if (worktreesVerdict === "missing")
    return {
      gitDir: gitDirPath,
      vetted,
      refused,
    };
  let entryNames =
    worktreesVerdict === "clear"
      ? await readdir(worktreesDir, {
          encoding: "buffer",
        }).catch(() => null)
      : null;
  if (entryNames === null) return skip("unvettable", `${worktreesDir} is a link or cannot be read`);
  for (let rawName of entryNames) {
    let entryName = decodeSafeName(rawName);
    if (entryName === null) {
      let entryPath = join(worktreesDir, `<${rawName.toString("hex")}>`);
      let refusalText = "has a name this check and git would read differently";
      refused.set(entryPath, "has a name this check and git would read differently");
      logForDebugging(
        `Refused worktree admin entry ${entryPath}: has a name this check and git would read differently`,
        {
          level: "warn",
        },
      );
      continue;
    }
    let entryPath = join(worktreesDir, entryName);
    let entryResult = await vetWorktreeLink(entryPath, repoRoot, probeSymlink, isWindows);
    if (entryResult === "missing") continue;
    if (entryResult === null) continue;
    if (typeof entryResult === "object") vetted.set(entryPath, entryResult.worktree);
    else {
      refused.set(entryPath, entryResult);
      logForDebugging(`Refused worktree admin entry ${entryPath}: ${entryResult}`, {
        level: "warn",
      });
    }
  }
  return {
    gitDir: gitDirPath,
    vetted,
    refused,
  };
}
//@ chunk-b2dh3swb.js:4308-4458 placement
async function looksLikeGitDir(readEntry) {
  for (let entryName of ["objects", "config", "packed-refs", "hooks", "worktrees"])
    if ((await readEntry(entryName).catch(() => "unchecked")) !== null) return true;
  return false;
}
//@ chunk-b2dh3swb.js:4458-6341 placement
async function vetWorktreeLink(entryPath, repoRoot, probeSymlink, isWindows) {
  let verdict = await symlinkVerdictForPath(entryPath, repoRoot);
  if (verdict === "missing") return "missing";
  if (verdict !== "clear") return "is a link, a mount point, or cannot be probed";
  let stats = await lstat(entryPath).then(
    (stats) => stats,
    (error) => (isENOENT(error) ? null : undefined),
  );
  if (stats === undefined) return "cannot be probed";
  if (stats === null) return "missing";
  if (stats.isSymbolicLink()) return "became a link";
  if (!stats.isDirectory()) return isWindows ? "is not a directory" : null;
  let worktreePointer = await readWorktreePointer(entryPath, probeSymlink, isWindows ? 1 / 0 : 1);
  if (worktreePointer !== null) return worktreePointer;
  if (
    await looksLikeGitDir((entryName) =>
      lstat(join(entryPath, entryName)).catch((error) => {
        if (isENOENT(error)) return null;
        throw error;
      }),
    )
  )
    return "holds a git directory's own files (objects, config, packed-refs, hooks or worktrees), or could not be checked for them";
  let gitdirPath = join(entryPath, "gitdir");
  let gitdirStats = await lstat(gitdirPath).then(
    (stats) => stats,
    (error) => (isENOENT(error) ? null : undefined),
  );
  if (gitdirStats === undefined) return "gitdir cannot be probed";
  if (gitdirStats === null)
    return (await probeSymlink(gitdirPath)) === "missing"
      ? {
          worktree: null,
        }
      : "gitdir is absent to lstat but not to the probe (a shortcut beside it, or a race)";
  if (!gitdirStats.isFile()) return "gitdir is not a regular file";
  if (gitdirStats.size > MAX_GITDIR_FILE_BYTES) return "gitdir is larger than any git writes";
  let gitdirText = await readFileGuarded(gitdirPath, MAX_GITDIR_FILE_BYTES, {
    noFollow: true,
  }).catch(() => null);
  if (gitdirText === null) return "gitdir cannot be read";
  let gitdirValue = gitdirText.replace(/[\r\n]+$/, "");
  if (gitdirValue === "")
    return {
      worktree: null,
    };
  let pathProblem = gitdirPathProblem(gitdirValue, repoRoot, isWindows);
  if (pathProblem !== null) return pathProblem;
  let candidates;
  let containingRoot;
  if (isAbsolute(gitdirValue)) {
    let normalizedTarget = normalize(gitdirValue);
    let normalizedRoot = stripTrailingSeparators(normalize(repoRoot));
    candidates = [normalizedTarget];
    let foldPart = (part, index) => (isWindows && index === 0 ? part.toLowerCase() : part);
    let parts = normalizedTarget.split(sep);
    let parts_2 = normalizedRoot.split(sep);
    containingRoot =
      parts.length > parts_2.length &&
      parts_2.every((rootPart, index) => foldPart(rootPart, index) === foldPart(parts[index] ?? "", index))
        ? parts.slice(0, parts_2.length).join(sep)
        : undefined;
  } else {
    let realRoot = await realpath(repoRoot).catch(() => null);
    if (realRoot === null) return "the repository root does not resolve";
    containingRoot = realRoot;
    let rootSpelling = stripTrailingSeparators(normalize(repoRoot));
    let spelledEntry = entryPath.startsWith(rootSpelling + sep)
      ? join(realRoot, relative(repoRoot, entryPath))
      : entryPath;
    candidates = [resolve(spelledEntry, gitdirValue), resolve(realRoot, gitdirValue)];
  }
  for (let candidatePath of candidates) {
    if (isOnForeignMount(candidatePath, containingRoot ?? repoRoot)) return "gitdir names another host";
    let parentVerdict = await symlinkVerdictForPath(dirname(candidatePath), containingRoot);
    if (parentVerdict === "link" || parentVerdict === "unknown")
      return "gitdir walks through a link, or a component cannot be probed";
    if (parentVerdict === "clear") {
      let entryVerdict = await probeSymlink(candidatePath);
      if (entryVerdict === "link" || entryVerdict === "unknown")
        return "gitdir names a link, or one that cannot be probed";
    }
  }
  return {
    worktree: candidates[0] ?? null,
  };
}
//@ chunk-b2dh3swb.js:6341-7138 placement
async function gitConfigEnvOverrides(cwd, gitDir, runGit) {
  let configEnv = {};
  for (let varName of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let value = process.env[varName];
    if (value !== undefined) configEnv[varName] = value;
  }
  let result = await runGit([...GIT_SAFE_GLOBAL_ARGS, "-C", cwd, "rev-parse", "--git-dir"], {
    cwd,
    env: getRemoteHostSessionCount({
      ...configEnv,
      ...buildGitConfigEnv(),
    }),
    timeout: 1e4,
  }).catch((error) => {
    logForDebugging(`Could not run git to check the ownership of ${gitDir}: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  });
  if (result === null) return `git could not be run to check the ownership of ${gitDir}`;
  if (result.code !== 0)
    return `git's ownership check for ${gitDir} failed (exit ${result.code}); if another user owns it, it needs a safe.directory entry`;
  let trimmed = result.stdout.trim();
  if (trimmed === "") return `git gave no answer when checking the ownership of ${gitDir}`;
  let [realReported, realGitDir] = await Promise.all([
    realpath(resolve(cwd, trimmed)).catch(() => null),
    realpath(gitDir).catch(() => null),
  ]);
  return realReported !== null &&
    realGitDir !== null &&
    stripTrailingSeparators(realReported) === stripTrailingSeparators(realGitDir)
    ? null
    : `git's ownership check did not name ${gitDir}`;
}
//@ chunk-b2dh3swb.js:7138-7276 placement
function isTrustedOwnerUid(uid) {
  let euid = process.geteuid?.();
  if (euid === undefined || uid === euid) return true;
  if (euid !== 0) return false;
  let SUDO_UID = env.SUDO_UID;
  return uid === 0 || (SUDO_UID !== undefined && uid === SUDO_UID);
}
//@ chunk-b2dh3swb.js:7276-8027 placement
function gitdirPathProblem(gitdirValue, baseDir, isWindows) {
  if (
    gitdirValue.includes("\uFFFD") ||
    /\p{Cc}/u.test(gitdirValue) ||
    /^[A-Za-z]:(?![\\/])/.test(gitdirValue)
  )
    return "gitdir holds bytes git would read differently";
  let separatorRe = isWindows ? /[\\/]+/ : /\/+/;
  if (
    isWindows &&
    gitdirValue.split(separatorRe).some((part) => part !== "." && part !== ".." && /[. ]$/.test(part))
  )
    return "gitdir holds a component ending in a dot or space";
  if (!isAbsolute(gitdirValue)) {
    let parts = gitdirValue.split(separatorRe);
    let index = parts.findIndex((startIndex) => startIndex !== "..");
    return (index < 0 ? [] : parts.slice(index)).some((part) => part === "" || part === "." || part === "..")
      ? "gitdir is a relative value git would not write"
      : null;
  }
  if (gitdirValue.split(separatorRe).some((part) => part === "." || part === ".."))
    return "gitdir holds a dot segment git would not write";
  if (!isSafeAbsoluteWorktreePath(gitdirValue)) return "gitdir is rooted without a drive or a host";
  if (isOnForeignMount(gitdirValue, baseDir)) return "gitdir names another host";
  return separatorRe.test(gitdirValue.slice(-1)) ? "gitdir ends in a separator git would not write" : null;
}
//@ chunk-b2dh3swb.js:8027-8695 placement
async function readGitdirFile(linkPath, baseDir) {
  let linkText = await readlink(linkPath, {
    encoding: "buffer",
  }).then(
    (bytes) => {
      let str = bytes.toString("utf-8");
      return str.includes("\x00") || !Buffer.from(str, "utf-8").equals(bytes) ? null : str;
    },
    () => null,
  );
  if (linkText === null)
    return {
      refused: "cannot be read",
    };
  if (/[\p{Cc}\uFFFD]/u.test(linkText))
    return {
      refused: "holds a control character or U+FFFD",
    };
  if (isOnForeignMount(linkText, baseDir))
    return {
      refused: "names another host",
    };
  let isWindows = getPlatform() === "windows";
  let separatorRe = isWindows ? /[\\/]+/ : /\/+/;
  if (
    linkText === "" ||
    separatorRe.test(linkText.slice(-1)) ||
    linkText.split(separatorRe).some((part) => part === "." || part === "..") ||
    (isAbsolute(linkText) && !isSafeAbsoluteWorktreePath(linkText)) ||
    (isWindows && /^[A-Za-z]:(?![\\/])/.test(linkText))
  )
    return {
      refused:
        "is empty, ends in a separator, holds a dot segment, or is rooted or drive-relative in a way git would read differently",
    };
  return {
    text: linkText,
  };
}
//@ chunk-b2dh3swb.js:8695-8860 placement
function decodeSafeName(rawName) {
  let str = rawName.toString("utf8");
  return !str.includes("\uFFFD") &&
    !/\p{Cc}/u.test(str) &&
    !(getPlatform() === "windows" && /[. ]$/.test(str)) &&
    Buffer.from(str, "utf8").equals(rawName)
    ? str
    : null;
}
//@ chunk-b2dh3swb.js:8860-9581 placement
async function readWorktreePointer(dirPath, probeSymlink, maxDepth) {
  let isWindows = getPlatform() === "windows";
  let remainingBudget = MAX_LINK_TEXT_BYTES;
  let walk = async (dirPath, depth) => {
    let names = await readdir(dirPath, {
      encoding: "buffer",
    }).catch(() => null);
    if (names === null) return `${dirPath} cannot be read`;
    for (let rawName of names) {
      if (--remainingBudget < 0) return "holds more files than any entry git writes";
      let name = decodeSafeName(rawName);
      if (name === null) return `${dirPath} holds a name that is not valid UTF-8`;
      if (isWindows && name.toLowerCase().endsWith(".lnk"))
        return `${join(dirPath, name)} is named as a shortcut, which git never writes here`;
      let entryPath = join(dirPath, name);
      let stats = await lstat(entryPath).catch(() => null);
      if (stats === null) return `${entryPath} cannot be probed`;
      let verdict =
        isWindows && stats.isDirectory()
          ? await symlinkVerdictForPath(entryPath, dirPath)
          : await probeSymlink(entryPath);
      if (verdict === "link" || verdict === "unknown") return `${entryPath} is a link or cannot be probed`;
      if (stats.isDirectory() && depth > 1) {
        let nestedProblem = await walk(entryPath, depth - 1);
        if (nestedProblem !== null) return nestedProblem;
      }
    }
    return null;
  };
  return walk(dirPath, maxDepth);
}
//@ chunk-b2dh3swb.js:9581-9695 placement
/**
 * worktree 校验读取的字节上限，以及"匹配前后"回调状态的宿主作用域存储。
 */
var WORKTREE_READ_LIMITS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WORKTREE_READ_LIMITS;
var worktreeHookState;
deferInit("chunk-b2dh3swb.js:9581", () => {
  WORKTREE_READ_LIMITS_2 = 65536;
  WORKTREE_READ_LIMITS = 65536;
  worktreeHookState = identity(
    {
      afterMatch: null,
      beforeMutation: null,
    },
    (state) => {
      state.afterMatch = null;
      state.beforeMutation = null;
    },
  );
});
//@ chunk-b2dh3swb.js:9695-9940 placement
async function vetRepoForWorktrees(repoRoot) {
  let vetResult = await vetWorktree(repoRoot, {
    dotGitLink: "vet",
  });
  if ("skipped" in vetResult) return null;
  let sameRepo = await isSameRepository(repoRoot, vetResult.gitDir);
  if ("refused" in sameRepo) {
    logForDebugging(`Could not vet the worktree registrations of ${repoRoot}: ${sameRepo.refused}`, {
      level: "warn",
    });
    return null;
  }
  return sameRepo.gitDir;
}
//@ chunk-b2dh3swb.js:9940-10483 placement
async function isSameRepository(repoRoot, gitDir) {
  let normalizedRoot = normalizedAbsolute(repoRoot);
  let normalizedGitDir = normalizedAbsolute(gitDir);
  if (normalizedGitDir === normalizedRoot)
    return (await lstat(join(normalizedRoot, ".git")).then(
      () => true,
      (error) => !isENOENT(error),
    ))
      ? {
          refused: `the repository's .git is a link to its own root, ${normalizedRoot}, which cannot be used as a git directory safely`,
        }
      : resolveGitDirUnder(normalizedRoot, "");
  if (normalizedGitDir === normalizedAbsolute(join(repoRoot, ".git")))
    return resolveGitDirUnder(normalizedRoot, ".git");
  let location = await locateInside(normalizedGitDir, normalizedRoot);
  return location === "elsewhere"
    ? {
        gitDir: normalizedGitDir,
      }
    : {
        refused:
          location === "inside"
            ? `the repository's .git is a link to ${normalizedGitDir}, inside its own working tree, which cannot be opened safely`
            : `the repository's .git is a link to ${normalizedGitDir}, which could not be checked against the working tree`,
      };
}
//@ chunk-b2dh3swb.js:10483-10611 placement
async function resolveGitDirUnder(rootPath, suffix) {
  let realRoot = await realpath(rootPath).catch(() => null);
  return realRoot === null
    ? {
        refused: `${rootPath} could not be resolved`,
      }
    : {
        gitDir: join(realRoot, suffix),
      };
}
//@ chunk-b2dh3swb.js:10611-10667 placement
function normalizedAbsolute(path) {
  let normalized = normalize(path);
  return parse(normalized).root === normalized ? normalized : stripTrailingSeparators(normalized);
}
//@ chunk-b2dh3swb.js:10667-10973 placement
async function locateInside(childPath, rootPath) {
  if (isPathInsideOrEqual(normalizePathKey(childPath), normalizePathKey(rootPath))) return "inside";
  let rootStats = await stat(rootPath, {
    bigint: true,
  }).catch(() => null);
  if (rootStats === null) return "unknown";
  for (let currentPath = childPath; ; currentPath = dirname(currentPath)) {
    let stats = await lstat(currentPath, {
      bigint: true,
    }).catch(() => null);
    if (stats === null) return "unknown";
    if (stats.dev === rootStats.dev && stats.ino === rootStats.ino) return "inside";
    if (dirname(currentPath) === currentPath) return "elsewhere";
  }
}
//@ chunk-b2dh3swb.js:10973-11083 placement
async function resolveRootSpellings(path) {
  let normalized = normalizedAbsolute(path);
  let realPath = await realpath(normalized).catch(() => null);
  return {
    root: normalized,
    tops: [normalized, realPath].filter((spelling) => spelling !== null),
  };
}
//@ chunk-b2dh3swb.js:11083-11385 placement
async function collectWorktreeTops(worktreePaths, path) {
  let gitdirs = new Set();
  let unresolved = [];
  let { root, tops } = await resolveRootSpellings(path);
  for (let worktreePath of worktreePaths) {
    let normalized = stripTrailingSeparators(normalize(worktreePath));
    gitdirs.add(join(normalized, ".git"));
    if (isOnForeignMount(normalized, root)) continue;
    let parentDir = dirname(normalized);
    let ancestorResult = await walkToCommonAncestor(parentDir, findDeepestContainingRoot(parentDir, tops));
    if ("refused" in ancestorResult) {
      unresolved.push(`${normalized}: ${ancestorResult.refused}`);
      continue;
    }
    gitdirs.add(join(ancestorResult.resolved, basename(normalized), ".git"));
  }
  return {
    gitdirs,
    unresolved,
    tops,
  };
}
//@ chunk-b2dh3swb.js:11385-11395 placement
var MAX_SYMLINK_LINKS = 16;
//@ chunk-b2dh3swb.js:11395-12028 placement
async function walkToCommonAncestor(dirPath, deepestContainingRoot) {
  let targetPath = dirPath;
  let containingRoot = deepestContainingRoot;
  for (let j = 0; j <= MAX_SYMLINK_LINKS; j++) {
    let verdict =
      targetPath === containingRoot
        ? {
            verdict: "clear",
            at: undefined,
          }
        : await checkPathForSymlinks(targetPath, containingRoot);
    if (verdict.verdict === "clear" || verdict.verdict === "missing") {
      if (containingRoot === undefined)
        return {
          resolved: targetPath,
        };
      let realStop = await realpath(containingRoot).catch(() => null);
      return realStop === null
        ? {
            refused: `${containingRoot} could not be resolved`,
          }
        : {
            resolved: join(realStop, relative(containingRoot, targetPath)),
          };
    }
    if (verdict.verdict !== "link" || verdict.at === undefined)
      return {
        refused: `a component of ${targetPath} cannot be probed`,
      };
    let gitdirFile = await readGitdirFile(verdict.at, dirname(verdict.at));
    if ("refused" in gitdirFile)
      return {
        refused: `the text of the link ${verdict.at} ${gitdirFile.refused}`,
      };
    let resolvedLink = resolve(dirname(verdict.at), gitdirFile.text);
    targetPath = join(resolvedLink, relative(verdict.at, targetPath));
    if (containingRoot !== undefined && !isPathInsideOrEqual(resolvedLink, containingRoot))
      containingRoot = undefined;
  }
  return {
    refused: `more than ${MAX_SYMLINK_LINKS} links lead to ${dirPath}`,
  };
}
//@ chunk-b2dh3swb.js:12028-12095 placement
function isPathInsideOrEqual(path, rootPath) {
  return path === rootPath || path.startsWith(rootPath.endsWith(sep) ? rootPath : rootPath + sep);
}
//@ chunk-b2dh3swb.js:12095-12269 placement
function parseGitdirLine(rawText, baseDir) {
  let gitdirValue = rawText.replace(/[\r\n]+$/, "");
  if (
    gitdirValue === "" ||
    gitdirPathProblem(gitdirValue, baseDir, getPlatform() === "windows") !== null ||
    isOnForeignMount(gitdirValue, baseDir)
  )
    return null;
  let normalizedPath = normalize(isAbsolute(gitdirValue) ? gitdirValue : resolve(baseDir, gitdirValue));
  return basename(normalizedPath) === ".git" && isSafeAbsoluteWorktreePath(normalizedPath)
    ? normalizedPath
    : null;
}
//@ chunk-b2dh3swb.js:12269-12410 placement
function findDeepestContainingRoot(path, tops) {
  let deepestRoot;
  for (let root of tops)
    for (let candidateRoot = root; ; candidateRoot = dirname(candidateRoot)) {
      if (isPathInsideOrEqual(path, candidateRoot)) {
        if (deepestRoot === undefined || candidateRoot.length > deepestRoot.length)
          deepestRoot = candidateRoot;
        break;
      }
      if (dirname(candidateRoot) === candidateRoot) break;
    }
  return deepestRoot;
}
//@ chunk-b2dh3swb.js:12410-12523 placement
async function verifyAdminEntry(gitdirPath, options, worktreePaths) {
  let tops = worktreePaths?.tops ?? (await resolveRootSpellings(options.repoSpelled)).tops;
  return (
    (await symlinkVerdictForPath(gitdirPath, findDeepestContainingRoot(dirname(gitdirPath), tops))) ===
    "missing"
  );
}
//@ chunk-b2dh3swb.js:12523-12602 placement
function isSafePathSegment(name) {
  return name !== "" && name !== "." && name !== ".." && !/[\\/\p{Cc}\uFFFD]/u.test(name);
}
//@ chunk-b2dh3swb.js:12602-12772 placement
function pathVariants(paths) {
  let variants = new Set();
  for (let worktreePath of paths) {
    let baseName = basename(stripTrailingSeparators(normalize(worktreePath)));
    for (let candidateName of [escapeDotSegments(baseName), baseName]) {
      if (candidateName === "") continue;
      variants.add(candidateName);
      for (let j = 1; j <= 99; j++) variants.add(`${candidateName}${j}`);
    }
  }
  return [...variants];
}
//@ chunk-b2dh3swb.js:12772-13055 placement
function escapeDotSegments(name) {
  let out = "";
  for (let j = 0; j < name.length; j++) {
    let char = name[j];
    let code = char.charCodeAt(0);
    if (char === "." && (j === 0 || name[j - 1] === ".")) out += j === 0 ? "-" : "";
    else if (char === "{" && name[j - 1] === "@") out += "-";
    else if (code < 32 || code === 127 || " :?[\\^~*".includes(char)) out += "-";
    else out += char;
  }
  while (out.endsWith(".lock")) out = out.slice(0, -5);
  return out;
}
//@ chunk-b2dh3swb.js:13055-13208 placement
async function loadDeviceTreeHost() {
  let [treeModule, hostModule] = await Promise.all([
    import("../fsAnchor/treeAnchor.js"),
    import("../fsAnchor/deviceTreeHost.js"),
  ]);
  return {
    ...treeModule,
    host: hostModule.createDeviceTreeHost(),
  };
}
//@ chunk-b2dh3swb.js:13208-14073 placement
async function loadRepoLayout(gitDirSpelled, repoSpelled) {
  let modules = await loadDeviceTreeHost().catch((error) => ({
    failed: errorMessage(error),
  }));
  if ("failed" in modules)
    return {
      unavailable: `its module did not load: ${modules.failed}`,
      modules: null,
    };
  let realRoot = await realpath(normalizedAbsolute(repoSpelled)).catch(() => null);
  let isLinkedGitFile =
    realRoot !== null && parse(realRoot).root !== realRoot && gitDirSpelled === join(realRoot, ".git");
  let anchorRoot = isLinkedGitFile ? realRoot : gitDirSpelled;
  let anchor = await (
    isLinkedGitFile || parse(gitDirSpelled).root === gitDirSpelled
      ? modules.openTreeAnchor(modules.host, {
          gitRoot: anchorRoot,
          realRoot: anchorRoot,
        })
      : modules.openTreeAnchorAtName(modules.host, gitDirSpelled)
  ).catch((error) => ({
    unavailable: errorMessage(error),
  }));
  if ("unavailable" in anchor)
    return {
      unavailable: anchor.unavailable,
      modules,
    };
  if (!isLinkedGitFile) return anchor;
  try {
    let gitDirAnchor = await anchor.anchorBeneath(".git");
    let gitDirStats = await gitDirAnchor.lstat("").catch(() => null);
    if (gitDirStats === null || gitDirStats.ino === 0n) {
      await gitDirAnchor.close().catch(() => {});
      return {
        refused:
          gitDirStats === null
            ? `${gitDirSpelled}: its file id could not be read once it was opened`
            : `${gitDirSpelled} is on a volume that reports no file ids`,
      };
    }
    return gitDirAnchor;
  } catch (error) {
    return {
      refused: `could not open ${gitDirSpelled} from ${anchorRoot} without following a link: ${errorMessage(error)}`,
    };
  } finally {
    await anchor.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:14073-14780 placement
async function openNonBlocking(fsOps, relPath, maxBytes) {
  let openResult = await fsOps
    .open(relPath, constants.O_RDONLY | constants.O_NONBLOCK)
    .catch((error) => getErrnoCode(error) ?? "EIO");
  if (typeof openResult === "string") {
    if (openResult !== "ENOENT")
      return {
        unread: openFailureText(openResult),
      };
    let statResult = await fsOps.lstat(relPath).then(
      () => "present",
      (error) => getErrnoCode(error) ?? "EIO",
    );
    return statResult === "ENOENT"
      ? "absent"
      : {
          unread:
            statResult === "present"
              ? "could not be opened where the held folder has it"
              : openFailureText(statResult),
        };
  }
  try {
    let stats = await openResult.stat({
      bigint: true,
    });
    if (fsOps.backend === "darwin_at") {
      let stats_2 = await fsOps.lstat(relPath);
      if (stats.dev !== stats_2.dev || stats.ino !== stats_2.ino)
        return {
          unread: "was replaced as it was opened",
        };
    }
    if (!stats.isFile())
      return {
        unread: "is not a regular file",
      };
    let upToBytes = await readUpToBytes(openResult, maxBytes);
    return upToBytes === null
      ? {
          unread: "is larger than git writes",
        }
      : {
          text: upToBytes,
        };
  } catch {
    return {
      unread: "could not be read",
    };
  } finally {
    await openResult.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:14780-14967 placement
async function readUpToBytes(handle, maxBytes) {
  let buffer = Buffer.alloc(maxBytes + 1);
  let totalRead = 0;
  for (;;) {
    let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
    if (totalRead > maxBytes) return null;
  }
  return buffer.subarray(0, totalRead).toString("utf-8");
}
//@ chunk-b2dh3swb.js:14967-15054 placement
/**
 * worktreePath 字段统一成数组。
 */
function normalizeWorktreePaths(options) {
  return typeof options.worktreePath === "string" ? [options.worktreePath] : options.worktreePath;
}
//@ chunk-b2dh3swb.js:15054-15129 placement (2.1.88 match: WORKTREE_PATH_TAG, 0.798)
/**
 * 有 worktreePath 时解析出仓库内 worktree 路径列表，否则 null。旧版名 WORKTREE_PATH_TAG 为错配。
 */
async function resolveWorktreePaths(options) {
  return "worktreePath" in options
    ? collectWorktreeTops(normalizeWorktreePaths(options), options.repoSpelled)
    : null;
}
//@ chunk-b2dh3swb.js:15129-15174 placement
function noteUnchecked(progress, kindText) {
  progress.unchecked++;
  progress.kinds.add(kindText);
}
export {
  isSameRepository,
  vetRepoForWorktrees,
  vetWorktree,
  pathVariants,
  normalizeWorktreePaths,
  isSafePathSegment,
  noteUnchecked,
  openNonBlocking,
  WORKTREE_READ_LIMITS_2,
  parseGitdirLine,
  loadRepoLayout,
  resolveWorktreePaths,
  verifyAdminEntry,
  worktreeHookState,
  looksLikeGitDir,
  WORKTREE_READ_LIMITS,
  readUpToBytes,
};
