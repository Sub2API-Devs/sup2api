/**
 * utils/teleport/dirSync.ts
 *
 * 2.1.316 新增：目录同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (56), chunk-k50y1rw8.js (2)
 * attribution: placement 58
 */
import { sep, join, resolve as resolve_2, parse, dirname, isAbsolute, relative as relative_2 } from "path";
import { readdir, lstat } from "fs/promises";
import { homedir } from "os";
import { readdirSync, realpathSync, readlinkSync, lstatSync, writeSync } from "fs";
import { sanitizeErrnoForTelemetry, isPathAbsent, getErrnoCode, errorMessage, toError } from "../errors.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS, IGNORE_SUBMODULES_DIRTY_FLAG } from "../git/gitSafeEnv.js";
import { uniq } from "../collections.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { CHANGED_FILE_SCAN_CONCURRENCY } from "./repositoriesTrusted.js";
import { byteBudgetedRetry } from "../fsJunctions.js";
import { MAX_REALPATH_WORK, toUncLongPath } from "../windowsUncPaths.js";
import {
  isCaseInsensitivePlatform as isCaseInsensitivePlatform_2,
  foldPathCase,
} from "../pathCaseFolding.js";
import { foldName } from "../permissions/protectedDirNames.js";
import {
  parentDirsOf,
  nfcLowerNfc,
  hasSpecialLatinLetter,
  foldPathCaseKeepingIgnorables,
} from "./remoteTaskLabels.js";
import { hasBackslash } from "../pathClassification.js";
import { isNetworkMountPath, isNetworkMountRoot_2, neverOtherHostMount } from "../networkPaths.js";
import { getPathNormalizationVariants, isSensitiveNameOrVariant } from "../permissions/sensitivePaths.js";
import { hasDosShortNameSegment } from "../windowsPathNames.js";
import { env } from "../env.js";
import { HostScoped } from "../hostScoped.js";
import {
  getRootSession,
  getFlagSettingsPath,
  isDiskless,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getIsInteractive,
} from "../../bootstrap/state.js";
import { permissionRuleValueFromString } from "../permissions/permissionRuleParser.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_picomatch_2 } from "../../../vendor/picomatch/index.js";
import {
  stripExtendedPathPrefix,
  removeTrailingGlobSuffix,
  containsGlobChars,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import {
  denyEntryCovers,
  posixCovers,
  matchesGuardedGlob,
  matchesNameReading,
  nameReadingsOfGlobSpelling,
} from "../sandbox/sandbox-adapter.js";
import { getPlatform } from "../platform.js";
import { getClaudeConfigDirs, claudeStatePathPatterns } from "../permissions/claudeStatePaths.js";
import { managedFileSettingsDirs, isManagedSettingsDropInName } from "../settings/managedFileSettings.js";
import { getManagedFilePath } from "../settings/managedPath.js";
import { logError } from "../log.js";
import { logDirSyncHostConfig } from "./dirSyncRules.js";
import { logForDebugging } from "../debug.js";
import { createSignal } from "../signal.js";
import { toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { CLEANUP_TIMEOUT_MS, registerCleanup } from "../cleanupRegistry.js";
import { stripControlChars as stripControlChars_3 } from "../settings/writeQueues.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { sanitizeIdSegment } from "../transcriptIds.js";
import { validateStorageKey, DIR_SYNC_RECORD_SUFFIX } from "../storage/storageKeys.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1882524-1882609 placement
function joinAsLatin1Buffer(dir, name) {
  return Buffer.concat([Buffer.from(dir + sep), Buffer.from(name, "latin1")]);
}
//@ chunk-e6aww6q8.js:1882609-1883138 placement
/**
 * 检查目录同步目标子目录是否已有内容、为空还是无权限，并识别沿途符号链接。
 */
async function probeSyncedSubdir(dir, name) {
  let onFailure = (error) => ({
    failedWith: sanitizeErrnoForTelemetry(error),
  });
  let probe = await readdir(joinAsLatin1Buffer(dir, name)).then(
    (entries) => (entries.length > 0 ? "stands" : "clear"),
    (error) =>
      isPathAbsent(error)
        ? "clear"
        : ["EACCES", "EPERM"].includes(getErrnoCode(error) ?? "")
          ? "denied"
          : onFailure(error),
  );
  if (probe === "clear") return "clear";
  let parts = name.split("/");
  let probeAncestor = (ancestorIndex) =>
    lstat(joinAsLatin1Buffer(dir, parts.slice(0, ancestorIndex).join("/"))).catch(onFailure);
  let [deepest, shallowerStats] = await Promise.all([
    probeAncestor(parts.length),
    Promise.all(parts.slice(1).map((part, index) => probeAncestor(index + 1))),
  ]);
  if ([deepest, ...shallowerStats].some((stats) => !("failedWith" in stats) && stats.isSymbolicLink()))
    return "clear";
  if (probe !== "denied") return probe;
  return "failedWith" in deepest ? deepest : deepest.isDirectory() ? "stands" : "clear";
}
//@ chunk-e6aww6q8.js:1883138-1884157 placement
/**
 * 列出工作目录中被跟踪且有改动的文件（git 命令），没有 .git 时返回失败。
 */
async function listChangedTrackedFiles(repoRoot, env) {
  if (!(await lstat(join(repoRoot, ".git")).catch(() => null)))
    return {
      kind: "failed",
      cause: "no_dot_git_seen_at_cwd",
    };
  let runGit = (gitArgs) =>
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...gitArgs], {
      cwd: repoRoot,
      preserveOutputOnError: false,
      env,
      encoding: "latin1",
      maxBuffer: 67108864,
    });
  let [statusOut, assumeUnchangedOut] = await Promise.all([
    runGit(["diff-index", "-z", "--diff-filter=DT", IGNORE_SUBMODULES_DIRTY_FLAG, "HEAD", "--"]),
    runGit(["ls-files", "-z", "-v", "-s"]),
  ]);
  if (statusOut.code !== 0)
    return {
      kind: "failed",
      cause: "changed_listing",
    };
  let parts = statusOut.stdout.split("\x00");
  let filtered = parts.filter(
    (diffOut, untrackedOut) => untrackedOut % 2 === 1 && !parts[untrackedOut - 1]?.startsWith(":160000"),
  );
  let status =
    assumeUnchangedOut.code === 0
      ? Array.from(
          assumeUnchangedOut.stdout.matchAll(/(?:^|\0)h (?!160000)\d{6} [0-9a-f]+ \d\t([^\0]+)/g),
          (pathMatch) => pathMatch[1] ?? "",
        )
      : [];
  let trackedFiles = uniq([...filtered, ...status]);
  if (
    trackedFiles.some(
      (path) => path.startsWith("/") || path.split(sep === "\\" ? /[\\/]/ : "/").includes(".."),
    )
  )
    return {
      kind: "failed",
      cause: "tracked_path_leaves_checkout",
    };
  let probeResults = await pMap(trackedFiles, (file) => probeSyncedSubdir(repoRoot, file), {
    concurrency: CHANGED_FILE_SCAN_CONCURRENCY,
  });
  let found = probeResults.find((errorEntry) => typeof errorEntry === "object");
  return found !== undefined
    ? {
        kind: "failed",
        cause: "path_read",
        errno: found.failedWith,
      }
    : {
        kind: "looked",
        replaced: trackedFiles.filter((file_2, probeIndex) => probeResults[probeIndex] === "stands"),
        isAssumeUnchangedListed: assumeUnchangedOut.code === 0,
      };
}
//@ chunk-e6aww6q8.js:1884510-1885139 placement
/**
 * 目录同步时排除的目录名（代理记忆、缓存、备份等）。
 */
var DIR_SYNC_EXCLUDED_DIRS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1884510", () => {
  DIR_SYNC_EXCLUDED_DIRS = new Set([
    "agent-memory",
    "agent-memory-local",
    "agent-memory-project",
    "api-dumps",
    "backups",
    "cache",
    "chrome",
    "cowork_plugins",
    "daemon",
    "debug",
    "downloads",
    "dump-prompts",
    "feedback",
    "feedback-bundles",
    "file-history",
    "file-transfers",
    "ide",
    "image-cache",
    "jobs",
    "local",
    "local-settings",
    "logs",
    "mcp-discovery-cache",
    "mcp-skill-archives",
    "paste-cache",
    "plans",
    "plugins",
    "project-settings",
    "projects",
    "remote",
    "remote-control",
    "scratch",
    "seed-admin",
    "session-env",
    "sessions",
    "shares",
    "shell-snapshots",
    "startup-perf",
    "state",
    "statsig",
    "storage-v2",
    "systemd",
    "tasks",
    "teams",
    "telemetry",
    "todos",
    "traces",
    "uploads",
    "usage-data",
  ]);
});
//@ chunk-e6aww6q8.js:1885139-1885168 placement
var MAX_SYNC_SCAN_ENTRIES = 20000;
var MAX_SYNC_SCAN_DEPTH = 64;
var MAX_SYNC_SCAN_NODES = 256;
//@ chunk-e6aww6q8.js:1885168-1885388 placement
var UNSUPPORTED_REALPATH_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SYNCED_STATE_DIR_NAMES;
var SKIPPED_DEPENDENCY_DIRS;
var UNCOVERED_ROOT;
deferInit("chunk-e6aww6q8.js:1885168", () => {
  UNSUPPORTED_REALPATH_ERRNOS = new Set(["EINVAL", "UNKNOWN", "ENOTSUP"]);
  SYNCED_STATE_DIR_NAMES = new Set(["plugins", "cowork_plugins", "state"]);
  SKIPPED_DEPENDENCY_DIRS = new Set(["node_modules", "venv", ".venv", "__pycache__"]);
  UNCOVERED_ROOT = {
    covers: () => false,
    ground: null,
    targetCount: 0,
    entriesExamined: 0,
  };
});
//@ chunk-e6aww6q8.js:1885388-1890193 placement
/**
 * 判断目录同步的根目录类型（网络位置、家目录内、链接根等）。
 */
function classifyDirSyncRoot(
  roots,
  {
    configHomes,
    configFiles,
    configDirs = [],
    peekedDirs = [],
    unwalkedDirs = [],
    vouchedDirs = [],
    home = homedir(),
    maxEntries = MAX_SYNC_SCAN_ENTRIES,
    probes,
  },
) {
  let realpath = probes?.settled ?? byteBudgetedRetry(MAX_REALPATH_WORK);
  let realpathOf = probes?.real ?? createRealpathCache(realpath);
  let mapped = roots.map((root) => ({
    root,
    resolved: realpathOf(root),
  }));
  let found = mapped.find(({ resolved }) => resolved === "unexamined");
  if (found !== undefined)
    return {
      ...UNCOVERED_ROOT,
      ground: {
        kind: "unexamined",
        at: found.root,
        why: "unreadable",
      },
    };
  let excludedRoots = uniq([
    ...roots,
    ...mapped.flatMap(({ resolved }) => (resolved === null || resolved === "unexamined" ? [] : [resolved])),
  ]);
  let ignoreCase = excludedRoots.some((root) => isCaseInsensitivePlatform_2(root));
  let relativeTo = (root, candidate) => relativeWithCaseFold(root, candidate, ignoreCase);
  let isInside = (root, candidate) => !escapesRoot(relativeTo(root, candidate));
  let isSamePath = (root, candidate) => relativeTo(root, candidate) === "";
  let coveredDirs = new Set();
  let recordPassed = () => {};
  let configHomeReal = uniq(configHomes.map((configHome) => resolve_2(configHome)));
  let firstConfigHome = configHomeReal[0];
  if (firstConfigHome !== undefined && excludedRoots.some((root) => isSamePath(firstConfigHome, root)))
    return UNCOVERED_ROOT;
  let uncovered = (ground) => ({
    ...UNCOVERED_ROOT,
    ground,
  });
  let homeSpellingsList = homeSpellings(home, realpathOf);
  let peekedReal = uniq(peekedDirs.map((peekedDir) => resolve_2(peekedDir)));
  let allowedPaths = [
    ...homeSpellingsList,
    ...excludedRoots,
    ...configHomeReal,
    ...vouchedDirs
      .map((vouchedDir) => resolve_2(vouchedDir))
      .filter((vouchedReal) => !excludedRoots.some((excludedRoot) => isInside(excludedRoot, vouchedReal)))
      .flatMap((vouchedReal) => {
        let classified = classifySyncRootPath(
          vouchedReal,
          realpathOf,
          (real, passed) =>
            !passed.some((passedPath) =>
              excludedRoots.some((excludedRoot) => isInside(excludedRoot, passedPath)),
            ),
        );
        return classified !== null && typeof classified === "object"
          ? [vouchedReal, classified.spelling]
          : [vouchedReal];
      })
      .filter(hasNetworkAncestor),
  ];
  let isAllowedPath = (candidatePath) =>
    allowedPaths.some((allowedPath) => isInside(allowedPath, candidatePath));
  let passesRoots = (path) =>
    isAllowedPath(path) || allowedPaths.some((allowedPath) => isInside(path, allowedPath));
  let homeRepos = [];
  let missingConfigHomes = [];
  for (let configHome of configHomeReal) {
    let classified = classifySyncRootPath(configHome, realpathOf, () => true, recordPassed);
    if (classified === "unexamined" || classified === "network")
      return uncovered({
        kind: "unexamined",
        at: configHome,
        why: "unreadable",
      });
    if (classified !== null) recordPassed(classified.passed);
    if (classified !== null && !classified.exists) {
      missingConfigHomes.push({
        path: configHome,
        spelling: classified.spelling,
      });
      continue;
    }
    let spelling = classified === null ? null : classified.spelling;
    if (excludedRoots.some((excludedRoot) => isInside(configHome, excludedRoot)))
      return uncovered({
        kind: "inside_home",
        home: configHome,
      });
    if (spelling !== null && !homeRepos.some((repo) => repo.real === spelling)) {
      if (excludedRoots.some((excludedRoot) => isSamePath(spelling, excludedRoot)))
        return uncovered({
          kind: "root_linked",
          link: configHome,
        });
      if (excludedRoots.some((excludedRoot) => isInside(spelling, excludedRoot)))
        return uncovered({
          kind: "inside_home",
          home: configHome,
        });
      homeRepos.push({
        path: configHome,
        real: spelling,
      });
      allowedPaths.push(spelling);
    }
  }
  let coverSet = new Set();
  let ground = null;
  let entriesLeft = maxEntries;
  let walkedDirs = new Set();
  let includeExcludedOnly = false;
  let isUnderPeekedHome = (spelling) =>
    peekedReal.length === 0 && homeSpellingsList.some((homeSpelling) => isInside(spelling, homeSpelling));
  let coverSpelling = (link, spelling) => {
    for (let root of excludedRoots) {
      let relative = relativeTo(root, spelling);
      if (relative === "")
        ground ??= {
          kind: "root_linked",
          link,
        };
      else if (!escapesRoot(relative)) coverSet.add(foldPathCase(relative.split(sep).join("/")));
      else if (isInside(spelling, root) && !isUnderPeekedHome(spelling))
        ground ??= {
          kind: "root_linked",
          link,
        };
    }
  };
  let shouldWalkEntry = (name, syncedState) => {
    let foldedName = foldName(name);
    return (
      !name.startsWith(".") &&
      !SKIPPED_DEPENDENCY_DIRS.has(foldedName) &&
      !(syncedState && DIR_SYNC_EXCLUDED_DIRS.has(foldedName))
    );
  };
  let isInExcludedRepoDir = (spelling) =>
    homeRepos.some(({ real }) => {
      let relative = relativeTo(real, spelling);
      return (
        !escapesRoot(relative) &&
        relative !== "" &&
        DIR_SYNC_EXCLUDED_DIRS.has(foldName(relative.split(sep)[0] ?? ""))
      );
    });
  let handleLink = (linkPath, fromWalk, depth, syncedStateEntry = false) => {
    let classified = classifySyncRootPath(linkPath, realpathOf, passesRoots, recordPassed);
    if (classified === "unexamined") {
      ground ??= {
        kind: "unexamined",
        at: linkPath,
        why: "unreadable",
      };
      return;
    }
    if (classified === null) return;
    let strict = fromWalk || syncedStateEntry || includeExcludedOnly;
    if (classified === "network") {
      if (strict)
        ground ??= {
          kind: "unexamined",
          at: linkPath,
          why: "on_share",
        };
      return;
    }
    recordPassed(classified.passed);
    coverSpelling(linkPath, classified.spelling);
    if (
      strict &&
      ground === null &&
      isUnsafeSyncRootSpelling(classified.spelling) &&
      !isAllowedPath(classified.spelling) &&
      !isUnderPeekedHome(classified.spelling)
    ) {
      ground = {
        kind: "unexamined",
        at: linkPath,
        why: "on_share",
      };
      return;
    }
    let shouldRecord =
      classified.exists &&
      ground === null &&
      (!isUnsafeSyncRootSpelling(classified.spelling) || isAllowedPath(classified.spelling)) &&
      !isUnderPeekedHome(classified.spelling) &&
      !homeRepos.some(({ real }) => isSamePath(real, classified.spelling)) &&
      !isInExcludedRepoDir(classified.spelling);
    if (fromWalk && shouldRecord) walkDir(classified.spelling, false, depth + 1);
    else if (syncedStateEntry && shouldRecord) walkSyncedStateDir(classified.spelling, depth + 1);
  };
  let walkDir = (dir, fromWalk, depth) => {
    if (walkedDirs.has(dir) || (!fromWalk && homeRepos.some(({ real }) => isSamePath(real, dir)))) return;
    if (depth > MAX_SYNC_SCAN_NODES) {
      ground ??= {
        kind: "unexamined",
        at: dir,
        why: "too_many",
      };
      return;
    }
    walkedDirs.add(dir);
    let entries;
    try {
      entries = realpath(() =>
        readdirSync(dir, {
          withFileTypes: true,
        }),
      );
    } catch (error) {
      if (!(getErrnoCode(error) === "ENOTDIR" || (!fromWalk && isNotFoundErrno(error))))
        ground ??= {
          kind: "unexamined",
          at: dir,
          why: "unreadable",
        };
      return;
    }
    entriesLeft -= entries.length + 1;
    if (entriesLeft < 0)
      ground ??= {
        kind: "unexamined",
        at: dir,
        why: "too_many",
      };
    for (let entry of entries) {
      if (ground !== null) return;
      let entryPath = join(dir, entry.name);
      let entryKind = classifyDirEntryForCompletion(entry, entryPath, realpathOf, realpath);
      if (entryKind === "unexamined") {
        ground ??= {
          kind: "unexamined",
          at: entryPath,
          why: "unreadable",
        };
        return;
      }
      if (entryKind === "link")
        handleLink(
          entryPath,
          shouldWalkEntry(entry.name, fromWalk),
          depth,
          fromWalk && SYNCED_STATE_DIR_NAMES.has(foldName(entry.name)),
        );
      else if (entryKind === "directory") {
        if (shouldWalkEntry(entry.name, fromWalk)) walkDir(entryPath, false, depth + 1);
        else if (fromWalk && SYNCED_STATE_DIR_NAMES.has(foldName(entry.name)))
          walkSyncedStateDir(entryPath, depth + 1);
      }
    }
  };
  let walkSyncedStateDir = (dir, depth) => {
    let entries;
    try {
      entries = realpath(() =>
        readdirSync(dir, {
          withFileTypes: true,
        }),
      );
    } catch (error) {
      if (!isNotFoundErrno(error))
        ground ??= {
          kind: "unexamined",
          at: dir,
          why: "unreadable",
        };
      return;
    }
    entriesLeft -= entries.length + 1;
    if (entriesLeft < 0)
      ground ??= {
        kind: "unexamined",
        at: dir,
        why: "too_many",
      };
    for (let entry of entries) {
      if (ground !== null) return;
      let entryPath = join(dir, entry.name);
      let entryKind = classifyDirEntryForCompletion(entry, entryPath, realpathOf, realpath);
      if (entryKind === "unexamined") {
        ground ??= {
          kind: "unexamined",
          at: entryPath,
          why: "unreadable",
        };
        return;
      }
      if (entryKind === "link") handleLink(entryPath, false, depth);
    }
  };
  for (let { path, spelling } of missingConfigHomes) coverSpelling(path, spelling);
  let flattened = configDirs.flatMap(({ path, accepts }) => {
    let dirPath = resolve_2(path);
    let classified = classifySyncRootPath(dirPath, realpathOf, passesRoots, recordPassed);
    if (classified === "unexamined") {
      ground ??= {
        kind: "unexamined",
        at: dirPath,
        why: "unreadable",
      };
      return [];
    }
    if (classified !== null && classified !== "network") {
      recordPassed(classified.passed);
      coverSpelling(dirPath, classified.spelling);
    }
    try {
      return realpath(() => readdirSync(dirPath))
        .filter(accepts)
        .map((entryName) => join(dirPath, entryName));
    } catch (error) {
      if (!isUnreadableRealpathError(error))
        ground ??= {
          kind: "unexamined",
          at: dirPath,
          why: "unreadable",
        };
      return [];
    }
  });
  let mapped_2 = unwalkedDirs.map((unwalkedDir) => resolve_2(unwalkedDir));
  for (let path of uniq([
    ...configFiles.map((configFile) => resolve_2(configFile)),
    ...mapped_2,
    ...flattened,
  ])) {
    let classified = classifySyncRootPath(path, realpathOf, passesRoots, recordPassed);
    if (classified === "unexamined")
      return uncovered({
        kind: "unexamined",
        at: path,
        why: "unreadable",
      });
    if (classified !== null && classified !== "network") {
      recordPassed(classified.passed);
      coverSpelling(path, classified.spelling);
    }
  }
  for (let { path, real } of homeRepos) {
    coverSpelling(path, real);
    if (ground === null) walkDir(real, true, 0);
  }
  includeExcludedOnly = true;
  for (let peekedDir of peekedReal) if (ground === null) handleLink(peekedDir, false, 0, true);
  let entriesExamined = maxEntries - Math.max(entriesLeft, 0);
  if (ground !== null)
    return {
      ...uncovered(ground),
      entriesExamined,
    };
  let isCovered = (path) =>
    coverSet.has(path) || parentDirsOf(path).some((parentDir) => coverSet.has(parentDir));
  return {
    covers: (path) => coverSet.size > 0 && isCovered(foldPathCase(path)),
    ground: null,
    targetCount: coverSet.size,
    entriesExamined,
    ...{},
  };
}
//@ chunk-e6aww6q8.js:1890193-1890347 placement
function classifySyncRootPath(
  targetPath,
  cache = createRealpathCache(byteBudgetedRetry(MAX_REALPATH_WORK)),
  isDenied = () => false,
  options,
) {
  let result = classifySyncRootFromScope(targetPath, cache, isDenied, options);
  return result !== null && typeof result === "object"
    ? {
        spelling: result.spelling,
        exists: result.exists,
        passed: result.passed,
      }
    : result;
}
//@ chunk-e6aww6q8.js:1890347-1890397 placement
function classifySyncRootFromScope(targetPath, targetPath_2, cache, isDenied) {
  return classifySyncRoot(targetPath, targetPath_2, cache, 0, [], [], isDenied);
}
//@ chunk-e6aww6q8.js:1890397-1891437 placement
/**
 * 沿根目录逐级检查目录同步根的类型：网络位置、家目录及其隐藏目录、链接根等，用于拒绝不安全的同步根。
 */
function classifySyncRoot(targetPath, fs, isNetworkRisk, depth = 0, visited = [], passed = [], settingsPath) {
  let root = parse(targetPath).root || sep;
  let passedDirs = [...passed];
  let asIs = (value) => value;
  let isNetworkSpelling = (spelling, passedDirs = visited) =>
    isUnsafeSyncRootSpelling(spelling) && !isNetworkRisk(spelling, passedDirs);
  if (
    isNetworkSpelling(targetPath) ||
    (isUnsafeSyncRootSpelling(root) && !isNetworkRisk(targetPath, visited))
  )
    return asIs("network");
  let filtered = targetPath
    .slice(root.length)
    .split(sep === "/" ? "/" : /[\\/]+/)
    .filter((segment) => segment !== "" && segment !== ".");
  let current = root;
  for (let [segmentIndex, segment] of filtered.entries()) {
    if (segment === "..") {
      current = dirname(current);
      continue;
    }
    let next = join(current, segment);
    if (isNetworkSpelling(next)) return asIs("network");
    let linkResult = fs.linkText(next);
    if (linkResult === "unexamined") return asIs("unexamined");
    let linkTarget = linkResult;
    if (linkTarget === "unexamined") return asIs("unexamined");
    if (linkTarget !== null) {
      if (depth >= MAX_SYNC_SCAN_DEPTH) return asIs(null);
      if (isNetworkSpelling(linkTarget, [...visited, current])) return asIs("network");
      let absoluteTarget = !isAbsolute(linkTarget)
        ? `${current}${sep}${linkTarget}`
        : /^[\\/](?![\\/])/.test(linkTarget)
          ? `${parse(current).root}${linkTarget.slice(1)}`
          : linkTarget;
      return classifySyncRoot(
        [absoluteTarget, ...filtered.slice(segmentIndex + 1)].join(sep),
        fs,
        isNetworkRisk,
        depth + 1,
        [...visited, current],
        passedDirs,
        settingsPath,
      );
    }
    let realPath = fs(next);
    if (realPath === "unexamined") return asIs("unexamined");
    if (realPath !== null && isNetworkSpelling(realPath)) return asIs("network");
    if (realPath === null) {
      let sliced = filtered.slice(segmentIndex + 1);
      if (sliced.includes("..")) {
        let nextPassed = [];
        return classifySyncRoot(
          resolve_2(next, ...sliced),
          fs,
          isNetworkRisk,
          depth + 1,
          visited,
          [...passedDirs, ...nextPassed],
          settingsPath,
        );
      }
      return {
        spelling: join(next, ...sliced),
        exists: false,
        stoodIn: visited,
        passed: passedDirs,
      };
    }
    current = realPath;
  }
  return {
    spelling: current,
    exists: true,
    stoodIn: visited,
    passed: passedDirs,
  };
}
//@ chunk-e6aww6q8.js:1891437-1891980 placement
/**
 * 创建带缓存的 realpath 与 lstat 查询器，避免重复访问文件系统。
 */
function createRealpathCache(guard) {
  let realpathCache = new Map();
  let linkCache = new Map();
  let memo = (cache, key, compute) => {
    let cached = cache.get(key);
    if (cached !== undefined) return cached;
    let value = compute();
    cache.set(key, value);
    return value;
  };
  return Object.assign(
    (path) =>
      memo(realpathCache, path, () => {
        if (hasBackslash(path)) return "unexamined";
        try {
          return toUncLongPath(guard(() => realpathSync.native(path)));
        } catch (error) {
          return isUnreadableRealpathError(error) ? null : "unexamined";
        }
      }),
    {
      linkText: (linkPath) =>
        memo(linkCache, linkPath, () => {
          try {
            let target = guard(() => readlinkSync(linkPath));
            return target.includes("\uFFFD") ? "unexamined" : target;
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "EINVAL" || isUnreadableRealpathError(error)) return null;
            if (UNSUPPORTED_REALPATH_ERRNOS.has(errnoCode))
              try {
                return guard(() => lstatSync(linkPath)).isFile() ? null : "unexamined";
              } catch (error) {
                return isUnreadableRealpathError(error) ? null : "unexamined";
              }
            return "unexamined";
          }
        }),
    },
  );
}
//@ chunk-e6aww6q8.js:1891980-1892302 placement
function classifyDirEntryForCompletion(stats, root, options, ctx) {
  if (stats.isSymbolicLink()) return "link";
  if (stats.isDirectory()) return scanDirectory_3(root, options);
  if (
    stats.isFile() ||
    stats.isFIFO() ||
    stats.isSocket() ||
    stats.isBlockDevice() ||
    stats.isCharacterDevice()
  )
    return "other";
  try {
    let error = ctx(() => lstatSync(root));
    return error.isSymbolicLink() ? "link" : error.isDirectory() ? scanDirectory_3(root, options) : "other";
  } catch (error) {
    return isUnreadableRealpathError(error) ? "other" : "unexamined";
  }
}
//@ chunk-e6aww6q8.js:1892302-1892338 placement (2.1.88 match: scanDirectory, 0.766)
function scanDirectory_3(root, options) {
  return "directory";
}
//@ chunk-e6aww6q8.js:1892338-1892401 placement
function homeSpellings(home, cache = createRealpathCache(byteBudgetedRetry(MAX_REALPATH_WORK))) {
  return uniq([resolve_2(home), resolveIfKnown(cache, resolve_2(home))]);
}
//@ chunk-e6aww6q8.js:1892401-1892468 placement
function resolveIfKnown(cache, path) {
  let resolved = cache(path);
  return resolved === null || resolved === "unexamined" ? path : resolved;
}
//@ chunk-e6aww6q8.js:1892468-1892522 placement
function hasNetworkAncestor(path) {
  return isUnsafeSyncRootSpelling(path) || (dirname(path) !== path && hasNetworkAncestor(dirname(path)));
}
//@ chunk-e6aww6q8.js:1892522-1892564 placement
function isUnsafeSyncRootSpelling(path) {
  return isNetworkMountPath(path) || isNetworkMountRoot_2(path) || neverOtherHostMount(path);
}
//@ chunk-e6aww6q8.js:1892564-1892626 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isNotFoundErrno(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-e6aww6q8.js:1892626-1892671 placement
function isUnreadableRealpathError(error) {
  return isNotFoundErrno(error) || getErrnoCode(error) === "ELOOP";
}
//@ chunk-e6aww6q8.js:1892671-1892771 placement
function relativeWithCaseFold(cwd, cwd_2, ignoreCase) {
  let relative = relative_2(cwd, cwd_2);
  if (!ignoreCase || !escapesRoot(relative)) return relative;
  let folded = relative_2(nfcLowerNfc(cwd), nfcLowerNfc(cwd_2));
  return escapesRoot(folded) ? relative : folded;
}
//@ chunk-e6aww6q8.js:1892771-1892835 placement
function escapesRoot(relative) {
  return relative === ".." || relative.startsWith(`..${sep}`) || isAbsolute(relative);
}
//@ chunk-e6aww6q8.js:1892835-1892860 placement
var ASCII_ONLY_RE = /^[\x00-\x7f]*$/;
//@ chunk-e6aww6q8.js:1892860-1893022 placement
function isSensitiveSyncedPath(
  path,
  { tracked, readings = getPathNormalizationVariants(path), namesCredential = isSensitiveNameOrVariant },
) {
  if (readings === null) return true;
  return (
    (ASCII_ONLY_RE.test(path) ? [path] : [path, foldPathCase(path)]).some(namesCredential) ||
    hasSpecialLatinLetter(path) ||
    (tracked && hasDosShortNameSegment(path)) ||
    readings.some(hasDosShortNameSegment)
  );
}
//@ chunk-e6aww6q8.js:1893022-1893218 placement
var EMPTY_TYPED_TOOL_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_LAUNCH_PERMISSIONS;
deferInit("chunk-e6aww6q8.js:1893022", () => {
  EMPTY_TYPED_TOOL_FLAGS = {
    disallowedTools: [],
    tools: [],
  };
  EMPTY_LAUNCH_PERMISSIONS = {
    allowRules: [],
    denyRules: [],
    sessionDenyRules: [],
    toolsNarrowingDenyRules: [],
    additionalWorkingDirectories: new Map(),
    launchedInAutoMode: false,
    typedToolFlags: EMPTY_TYPED_TOOL_FLAGS,
  };
});
//@ chunk-e6aww6q8.js:1893218-1893872 placement
/**
 * 启动权限快照：发布并保存会话启动时的权限规则与工具开关。
 */
class LaunchPermissionsSnapshot {
  snapshot = EMPTY_LAUNCH_PERMISSIONS;
  get() {
    return this.snapshot;
  }
  publish(context, inheritedDirs, flags) {
    let isBg = env.CLAUDE_CODE_SESSION_KIND === "bg";
    let inheritedSet = new Set(inheritedDirs);
    let filtered = [...context.additionalWorkingDirectories].filter(
      ([dir, dirInfo]) => !(dirInfo.source === "session" && inheritedSet.has(dir)),
    );
    this.snapshot = {
      allowRules: isBg ? [] : [...(context.alwaysAllowRules.cliArg ?? [])],
      denyRules: [...(context.alwaysDenyRules.cliArg ?? [])],
      sessionDenyRules: [...(context.alwaysDenyRules.session ?? [])],
      toolsNarrowingDenyRules: [...(context.alwaysDenyRules.toolsNarrowing ?? [])],
      additionalWorkingDirectories: new Map(
        isBg ? filtered.filter(([, dirEntry]) => dirEntry.source === "session") : filtered,
      ),
      launchedInAutoMode: context.mode === "auto",
      typedToolFlags: {
        disallowedTools: [...flags.disallowedTools],
        tools: [...flags.tools],
      },
    };
  }
  reset() {
    this.snapshot = EMPTY_LAUNCH_PERMISSIONS;
  }
}
//@ chunk-e6aww6q8.js:1893872-1893899 placement
var launchPermissionsByHost; // deferred: uses LaunchPermissionsSnapshot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1893872", () => {
  launchPermissionsByHost = new HostScoped(() => new LaunchPermissionsSnapshot());
});
//@ chunk-e6aww6q8.js:1893899-1893938 placement
function launchPermissions() {
  return launchPermissionsByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1893938-1893972 placement
/**
 * 取启动权限快照。
 */
function getLaunchPermissions() {
  return launchPermissions().get();
}
//@ chunk-e6aww6q8.js:1893972-1894013 placement
/**
 * 发布启动权限快照。
 */
function publishLaunchPermissions(toolPermissionContext, inheritedSessionDirectories, permissionContext) {
  launchPermissions().publish(toolPermissionContext, inheritedSessionDirectories, permissionContext);
}
//@ chunk-e6aww6q8.js:1894013-1894170 placement
function launchDenyRules(launchPermissions) {
  return [
    ["cliArg", launchPermissions.denyRules],
    ["session", launchPermissions.sessionDenyRules],
  ].flatMap(([source, rules]) =>
    rules.map((ruleText) => ({
      source,
      ruleBehavior: "deny",
      ruleValue: permissionRuleValueFromString(ruleText),
    })),
  );
}
//@ chunk-e6aww6q8.js:1894170-1894190 placement
var minimatch; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1894170", () => {
  minimatch = __toESM(require_picomatch_2(), 1);
});
//@ chunk-e6aww6q8.js:1894220-1894266 placement
var EMPTY_DIR_SYNC_RULES = {
  denies: [],
  credentials: [],
  reopens: [],
};
//@ chunk-e6aww6q8.js:1894266-1894390 placement
function normalizeRulePathSlashes(path) {
  let stripped = stripExtendedPathPrefix(path);
  return (
    (/^(?:[A-Za-z]:)?\\|^[A-Za-z]:\//.test(stripped) ? stripped.replace(/\\/g, "/") : stripped).replace(
      /\/+$/,
      "",
    ) || "/"
  );
}
//@ chunk-e6aww6q8.js:1894390-1894424 placement
function normalizeRulePath(path) {
  return removeTrailingGlobSuffix(normalizeRulePathSlashes(path));
}
//@ chunk-e6aww6q8.js:1894424-1894514 placement
function globBaseDir(glob) {
  let prefix = glob.split(/[*?[\]]/)[0] ?? "";
  return prefix.slice(0, prefix.lastIndexOf("/")) || "/";
}
//@ chunk-e6aww6q8.js:1894514-1894607 placement
function expandRuleGlobBase(glob) {
  if (!containsGlobChars(glob)) return glob;
  try {
    minimatch.default(glob, {
      dot: true,
    });
    return glob;
  } catch {
    return globBaseDir(glob);
  }
}
//@ chunk-e6aww6q8.js:1894607-1894816 placement
function createDenyMatcher(denies) {
  let byPrefix = new Map();
  let byGlob = new Map();
  let reopens = new Set();
  let getRules = () => byPrefix;
  return {
    covers: (path, entry) =>
      containsGlobChars(path) ? denyEntryCovers(path, entry, getRules(path)) : posixCovers(path, entry),
    coversReopen: (path_2, entry_2) => denyEntryCovers(path_2, entry_2, byPrefix),
    matchesAt: (path_3, entry_3) =>
      containsGlobChars(path_3)
        ? matchesGuardedGlob(entry_3, path_3, getRules(path_3)) ||
          (containsGlobChars(entry_3) &&
            matchesNameReading(entry_3, nameReadingsOfGlobSpelling(path_3), getRules(path_3)))
        : path_3 === entry_3,
  };
}
//@ chunk-e6aww6q8.js:1894816-1894961 placement
function pathPrefixesBetween(from, to) {
  if (to === from) return [];
  let base = from === "/" ? "" : from;
  return to
    .slice(base.length + 1)
    .split("/")
    .reduce((acc, part) => {
      acc.push(`${acc.at(-1) ?? base}/${part}`);
      return acc;
    }, []);
}
//@ chunk-e6aww6q8.js:1894961-1895571 placement
/**
 * 根据 deny/credentials/reopen 规则构造上传过滤的匹配函数（含大小写折叠与 reopen 例外）。
 */
function createDenyFilterEntries(
  { denies, credentials, reopens },
  normalize,
  toDenyPath,
  matcher,
  checkReopens,
) {
  let coversAny = (path, other) => posixCovers(path, other) || matcher.covers(path, other);
  let toCredentialPath_2 = (path) => expandRuleGlobBase(toDenyPath(normalize(normalizeRulePath(path))));
  let mapped = credentials.map(toCredentialPath_2);
  let mapped_2 = denies.map((deny) => {
    let spelled = toCredentialPath_2(deny);
    return {
      spelled,
      matchesAllBeneath: normalizeRulePathSlashes(deny).endsWith("/**") && containsGlobChars(spelled),
    };
  });
  let mapped_3 = reopens
    .filter((reopen) => !containsGlobChars(reopen))
    .map((reopen) => normalize(normalizeRulePathSlashes(reopen)))
    .map((reopen) => ({
      named: reopen,
      inDeny: toDenyPath(reopen),
    }));
  let isReopenBlocked = (named, from, reopenPath) =>
    checkReopens &&
    (named.matchesAllBeneath
      ? reopenPath !== from
      : pathPrefixesBetween(from, reopenPath).some((prefix) => matcher.matchesAt(named.spelled, prefix)));
  return (entry) => {
    let path_2 = normalize(entry);
    let denyPath = toDenyPath(path_2);
    return (
      mapped.some((credentialEntry) => coversAny(credentialEntry, denyPath)) ||
      mapped_2.some(
        (denyEntry) =>
          coversAny(denyEntry.spelled, denyPath) &&
          !mapped_3.some(
            (reopenEntry) =>
              matcher.coversReopen(denyEntry.spelled, reopenEntry.inDeny) &&
              posixCovers(reopenEntry.named, path_2) &&
              !isReopenBlocked(denyEntry, reopenEntry.inDeny, denyPath),
          ),
      )
    );
  };
}
//@ chunk-e6aww6q8.js:1895571-1895596 placement
function identityPath(path) {
  return path;
}
//@ chunk-e6aww6q8.js:1895596-1895659 placement
function escapeLineBreaks(text) {
  return text.replace(/[\n\r\u2028\u2029]/g, "\x01");
}
//@ chunk-e6aww6q8.js:1895659-1895705 placement
function memoizeFold(createFold) {
  let cached;
  return (value) => (cached ??= createFold())(value);
}
//@ chunk-e6aww6q8.js:1895705-1896125 placement
/**
 * 创建目录同步的拒绝过滤器：根据 deny/credentials/reopen 规则，对路径的原样、大小写折叠等多种拼写判断是否应被排除上传；没有规则时始终放行。
 */
function createSyncDenyFilter(launchDirSpellings, rules, platform = getPlatform(), caseInsensitive = false) {
  if (rules.denies.length === 0 && rules.credentials.length === 0) return () => false;
  let checkReopens = false;
  let matchers = [createDenyMatcher(caseInsensitive)];
  let buildEntries = (toDenyPath) =>
    matchers.map((matcher) => {
      let entriesFor = (normalize) =>
        createDenyFilterEntries(rules, normalize, toDenyPath, matcher, checkReopens);
      return {
        asWritten: entriesFor(identityPath),
        folded: entriesFor(foldPathCase),
        foldedKeepingIgnorables: memoizeFold(() =>
          entriesFor((path) => foldPathCaseKeepingIgnorables(path) ?? foldPathCase(path)),
        ),
      };
    });
  let defaultEntries = buildEntries(identityPath);
  let isEscaped = false;
  let escapedEntries;
  return (relativePath) =>
    launchDirSpellings.some((launchDirSpelling) => {
      let candidatePath = normalizeRulePathSlashes(join(launchDirSpelling, relativePath));
      let isDenied = false;
      return [
        ...defaultEntries,
        ...(escapeLineBreaks(candidatePath) === candidatePath
          ? []
          : (escapedEntries ??= buildEntries(escapeLineBreaks))),
      ].some((entries) => entries.asWritten(candidatePath) || entries.folded(candidatePath) || false);
    });
}
//@ chunk-e6aww6q8.js:1896125-1896990 placement
function checkManagedConfigFile(root, home) {
  let startTime = performance.now();
  let flagSettingsPath = getFlagSettingsPath();
  let claudeConfigDirs = getClaudeConfigDirs();
  if (isDiskless()) return unexaminedRoot(claudeConfigDirs[0] ?? home);
  let configDirs = (() => {
    let managedDirs = managedFileSettingsDirs(true);
    try {
      return classifyDirSyncRoot(home === root ? [root] : [root, home], {
        configHomes: claudeConfigDirs,
        configFiles: [
          ...claudeStatePathPatterns(),
          ...managedDirs.map((result) => join(result, "managed-settings.json")),
          join(getManagedFilePath(), "managed-mcp.json"),
          ...(flagSettingsPath === undefined ? [] : [flagSettingsPath]),
          ...getFlagAgentsFilePaths(),
          ...getFlagMcpConfigFilePaths(),
        ],
        configDirs: managedDirs.map((unexamined) => ({
          path: join(unexamined, "managed-settings.d"),
          accepts: isManagedSettingsDropInName,
        })),
      });
    } catch (error) {
      logError(error);
      return unexaminedRoot(claudeConfigDirs[0] ?? home);
    }
  })();
  if (configDirs === UNCOVERED_ROOT) return configDirs;
  logDirSyncHostConfig(
    home,
    {
      targets: configDirs.targetCount,
      ground_root_linked: configDirs.ground?.kind === "root_linked",
      ground_inside_home: configDirs.ground?.kind === "inside_home",
      ground_unreadable: configDirs.ground?.kind === "unexamined" && configDirs.ground.why === "unreadable",
      ground_too_many: configDirs.ground?.kind === "unexamined" && configDirs.ground.why === "too_many",
      ground_on_share: configDirs.ground?.kind === "unexamined" && configDirs.ground.why === "on_share",
    },
    {
      entries_examined: configDirs.entriesExamined,
      duration_ms: Math.round(performance.now() - startTime),
    },
  );
  return configDirs;
}
//@ chunk-e6aww6q8.js:1896990-1897069 placement
function unexaminedRoot(at) {
  return {
    ...UNCOVERED_ROOT,
    ground: {
      kind: "unexamined",
      at,
      why: "unreadable",
    },
  };
}
//@ chunk-e6aww6q8.js:1912185-1912554 placement
/**
 * 目录同步的待答复搁置表：按会话登记、关闭时通知订阅者。
 */
class PendingSyncHold {
  #e = new Map();
  #t = createSignal();
  hold(attach) {
    this.#e.set(attach.sessionId, attach);
    attach.onAnswered(() => this.#t.emit(attach.sessionId));
    this.#t.emit(attach.sessionId);
  }
  release(handle) {
    if (handle.close()) this.#t.emit(handle.sessionId);
  }
  of(sessionId) {
    return this.#e.get(toInfraSessionId(sessionId));
  }
  ready(sessionId) {
    return this.of(sessionId)?.open() === true;
  }
  concerns(sessionId_2) {
    return this.of(sessionId_2) !== undefined;
  }
  onChanged(close, infraSessionId) {
    let infraSessionId_2 = toInfraSessionId(close);
    return this.#t.subscribe((waiting) => {
      if (waiting === infraSessionId_2) infraSessionId();
    });
  }
}
//@ chunk-e6aww6q8.js:1912554-1912573 placement
var MAX_HELD_SESSIONS = 8;
var HOLD_NOTIFY_INTERVAL_MS = 2000;
//@ chunk-e6aww6q8.js:1912573-1915274 placement
/**
 * 目录同步会话对象。
 */
class DirSyncSession {
  attachSyncs = new PendingSyncHold();
  servedCallHolds = null;
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r;
  #i = null;
  #s = new Map();
  #a = false;
  #d = false;
  #c = new Set();
  #l = new Set();
  register(entry, value) {
    let infraSessionId = toInfraSessionId(entry);
    this.#e.delete(infraSessionId);
    this.#t.delete(infraSessionId);
    this.#n.delete(infraSessionId);
    oldestKeys(this.#e).forEach((infraSessionId) => {
      let held = this.#e.get(infraSessionId);
      this.#e.delete(infraSessionId);
      held?.then(
        (pending) => this.retire(pending.sessionId),
        () => {},
      );
    });
    this.#e.set(infraSessionId, value);
  }
  noteSilentlyNotArmed(sessionId, state) {
    let infraSessionId = toInfraSessionId(sessionId);
    this.#t.delete(infraSessionId);
    oldestKeys(this.#t).forEach((key) => this.#t.delete(key));
    this.#t.set(infraSessionId, state);
  }
  silentlyNotArmed(sessionId_2) {
    return this.#t.get(toInfraSessionId(sessionId_2));
  }
  noteNotOptedIn(sessionId_3, state_2) {
    let infraSessionId = toInfraSessionId(sessionId_3);
    this.#n.delete(infraSessionId);
    oldestKeys(this.#n).forEach((key_2) => this.#n.delete(key_2));
    this.#n.set(infraSessionId, state_2);
  }
  notOptedIn(sessionId_4) {
    return this.#n.get(toInfraSessionId(sessionId_4));
  }
  take(sessionId_5) {
    let infraSessionId = toInfraSessionId(sessionId_5);
    let entry = this.#e.get(infraSessionId);
    this.#e.delete(infraSessionId);
    return entry;
  }
  reportSendGateAnswers(sessionId_6, value) {
    return Promise.resolve(false);
  }
  noteResumeCommandOnScreen(sessionId_7) {
    this.#i = toInfraSessionId(sessionId_7);
  }
  hold(call, opts) {
    let infraSessionId = toInfraSessionId(call.sessionId);
    this.retire(infraSessionId);
    this.#t.delete(infraSessionId);
    this.#n.delete(infraSessionId);
    let write = getIsInteractive()
      ? (text, cb) => writeStderrSafely(this.#i === infraSessionId ? (cb ?? text) : text)
      : undefined;
    let shutDownOnce = null;
    let shutDown = (finalWrite) =>
      (shutDownOnce ??= (async () => {
        await call.sync.shutdown(opts, finalWrite);
        await call.sync.drain(CLEANUP_TIMEOUT_MS);
      })());
    this.#s.set(infraSessionId, {
      unregister: registerCleanup(() => shutDown(write)),
      shutDownOnce: shutDown,
      sync: call.sync,
      root: call.gitRoot,
    });
    this.#u(infraSessionId);
  }
  consentMayHaveChanged() {}
  retire(sessionId_8) {
    let infraSessionId = toInfraSessionId(sessionId_8);
    let entry_2 = this.#s.get(infraSessionId);
    if (entry_2 === undefined) return;
    this.#s.delete(infraSessionId);
    entry_2.unregister();
    entry_2.sync.shutdown(0);
    this.#u(infraSessionId);
  }
  async shutDown(sessionId_9) {
    let infraSessionId = toInfraSessionId(sessionId_9);
    let entry_3 = this.#s.get(infraSessionId);
    if (entry_3 === undefined) return;
    let now = Date.now();
    let failed = await entry_3.shutDownOnce(undefined).then(
      () => false,
      (error) => {
        logError(toError(error));
        return true;
      },
    );
    if (this.#s.get(infraSessionId) === entry_3) {
      this.#s.delete(infraSessionId);
      entry_3.unregister();
      this.#u(infraSessionId);
    }
  }
  watchState(sessionId_10, listener) {
    let infraSessionId = toInfraSessionId(sessionId_10);
    let state_3 = this.#o.get(infraSessionId);
    if (state_3 === undefined) {
      state_3 = {
        changed: createSignal(),
        listening: 0,
        last: describeDirSyncState(this.stateOf(infraSessionId)),
      };
      this.#o.set(infraSessionId, state_3);
    }
    let state_4 = state_3;
    let unsubscribe = state_4.changed.subscribe(listener);
    state_4.listening += 1;
    if (this.#r === undefined) {
      this.#r = setInterval(() => {
        [...this.#o.keys()].forEach((key) => this.#u(key));
      }, HOLD_NOTIFY_INTERVAL_MS);
      this.#r.unref?.();
    }
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      unsubscribe();
      state_4.listening -= 1;
      if (state_4.listening === 0 && this.#o.get(infraSessionId) === state_4) this.#o.delete(infraSessionId);
      if (this.#o.size === 0 && this.#r !== undefined) {
        clearInterval(this.#r);
        this.#r = undefined;
      }
    };
  }
  #u(key_3) {
    let state_5 = this.#o.get(key_3);
    if (state_5 === undefined) return;
    let value_2 = this.stateOf(key_3);
    let label = describeDirSyncState(value_2);
    if (label === state_5.last) return;
    state_5.last = label;
    try {
      state_5.changed.emit(value_2);
    } catch (error) {
      logError(toError(error));
    }
  }
  stateOf(sessionId_11) {
    return this.#s.get(toInfraSessionId(sessionId_11))?.sync.state();
  }
  syncOf(sessionId_12) {
    return this.#s.get(toInfraSessionId(sessionId_12))?.sync;
  }
  servedCallFaceOf(sessionId_13) {
    let infraSessionId = toInfraSessionId(sessionId_13);
    return this.syncOf(infraSessionId);
  }
  rootOf(sessionId_14) {
    return this.#s.get(toInfraSessionId(sessionId_14))?.root;
  }
  tellUnknownEngineWord() {
    if (this.#a) return false;
    this.#a = true;
    return true;
  }
  sayUnknownEngineWord() {
    if (this.#d) return false;
    this.#d = true;
    return true;
  }
  sayGitNotOnStartPath(word) {
    if (this.#c.has(word)) return false;
    this.#c.add(word);
    return true;
  }
  wholeListingOutgrew(key_4) {
    return this.#l.has(key_4);
  }
  noteWholeListingOutgrew(key_5) {
    this.#l.add(key_5);
  }
  get heldCount() {
    return this.#e.size;
  }
  get exitHookCount() {
    return this.#s.size;
  }
}
//@ chunk-e6aww6q8.js:1915274-1915304 placement
function createDirSyncSession() {
  return new DirSyncSession();
}
//@ chunk-e6aww6q8.js:1915304-1915323 placement
/**
 * 按宿主缓存的目录同步会话。
 */
var dirSyncSessionByHost; // deferred: uses createDirSyncSession of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1915304", () => {
  dirSyncSessionByHost = new HostScoped(createDirSyncSession);
});
//@ chunk-e6aww6q8.js:1915323-1915361 placement
/**
 * 取当前宿主的目录同步会话。
 */
function dirSyncSession() {
  return dirSyncSessionByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1915361-1915397 placement
/**
 * 取出目录同步句柄。
 */
function takeDirSyncHandle(sessionId) {
  return dirSyncSession().take(sessionId);
}
//@ chunk-e6aww6q8.js:1915397-1915444 placement
function writeStderrSafely(text) {
  try {
    writeSync(
      2,
      `${stripControlChars_3(text)}
`,
    );
  } catch {}
}
//@ chunk-e6aww6q8.js:1915444-1915514 placement
function oldestKeys(map) {
  return [...map.keys()].slice(0, Math.max(0, map.size + 1 - MAX_HELD_SESSIONS));
}
//@ chunk-e6aww6q8.js:1915514-1915732 placement
function describeDirSyncState(handle) {
  switch (handle?.state) {
    case undefined:
      return "none";
    case "seeding":
      return "seeding";
    case "armed":
      return `armed:${handle.engine}:${handle.direction}`;
    case "off":
      return `off:${handle.reason}`;
    case "stopped":
      return `stopped:${handle.reason}`;
  }
}
//@ chunk-e6aww6q8.js:1915732-1915792 placement
var gitVersionCacheByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var gitProbeCacheByHost;
var GIT_VERSION_PROBE_TIMEOUT_MS;
deferInit("chunk-e6aww6q8.js:1915732", () => {
  gitVersionCacheByHost = new HostScoped(() => new Map());
  gitProbeCacheByHost = new HostScoped(() => new Map());
  GIT_VERSION_PROBE_TIMEOUT_MS = 15000;
});
//@ chunk-k50y1rw8.js:900-980 placement
/**
 * 构造目录同步记录键（非法返回 undefined）。
 */
function dirSyncRecordKey(a, infraSessionId) {
  let recordKey = STORAGE_SPACES.dirSyncRecord(a, sanitizeIdSegment(infraSessionId));
  return validateStorageKey(recordKey) === undefined ? recordKey : undefined;
}
//@ chunk-k50y1rw8.js:980-1018 placement
/**
 * 目录同步记录文件名。
 */
function dirSyncRecordFileName(value) {
  return `${sanitizeIdSegment(value)}${DIR_SYNC_RECORD_SUFFIX}`;
}
export {
  dirSyncSessionByHost,
  listChangedTrackedFiles,
  dirSyncSession,
  publishLaunchPermissions,
  getLaunchPermissions,
  DIR_SYNC_EXCLUDED_DIRS,
  dirSyncRecordFileName,
  dirSyncRecordKey,
  checkManagedConfigFile,
  createSyncDenyFilter,
  EMPTY_DIR_SYNC_RULES,
  isSensitiveSyncedPath,
  launchDenyRules,
  UNCOVERED_ROOT,
  gitVersionCacheByHost,
  GIT_VERSION_PROBE_TIMEOUT_MS,
  gitProbeCacheByHost,
  takeDirSyncHandle,
};
