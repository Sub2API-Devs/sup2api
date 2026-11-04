/**
 * utils/worktree.ts
 *
 * worktree 生命周期：在 .claude/worktrees/<slug> 创建（git worktree add 或 WorktreeCreate hook）、加锁（pid 锁原因）、.worktreeinclude 复制、进入/退出校验、清理陈旧 worktree 与锁、tmux 会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/worktree.ts
 * pieces: chunk-aepeg2w5.js (7), chunk-dcmhvw5a.js (6), chunk-e6aww6q8.js (127)
 * attribution: placement 14, facade-exports 49, affinity 9, sole-consumer 14, fingerprint 4, layout 48, file-local 1, callgraph-witnessed 1
 */
import {
  sep,
  join,
  isAbsolute,
  dirname,
  basename,
  resolve as resolve_2,
  relative,
  normalize,
  win32,
} from "path";
import {
  realpath,
  lstat,
  symlink,
  readdir,
  writeFile,
  unlink,
  copyFile,
  readFile,
  rm as rm_2,
  readlink,
  stat,
  utimes,
  mkdir,
} from "fs/promises";
import { availableParallelism, homedir } from "os";
import { HostScoped } from "./hostScoped.js";
import {
  onProcessRootHost,
  isDiskless,
  getOriginalCwd,
  getSessionId,
  getProjectRoot,
} from "../bootstrap/state.js";
import {
  parseSettingsFileUncached,
  getInitialSettings_2,
  getRelativeSettingsFilePathForSource,
} from "./settings/settings.js";
import { saveCurrentProjectConfig, checkHasTrustDialogAccepted } from "./config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { env } from "./env.js";
import { containsPathTraversal } from "./path.js";
import { getErrnoCode, errorMessage, isENOENT, withTelemetryMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";
import {
  findCanonicalGitRoot,
  gitExe,
  getDefaultBranch,
  findGitRoot,
  getGitSshEnv,
  getBranch,
  isLinkedWorktree,
  hasUnpushedCommits_2,
  findGitRootUncached,
  findCanonicalGitRootUncached,
  findGitRootVerifyingPositive,
} from "./git.js";
import {
  getClaudeWorktreesDir,
  checkWorktreePath,
  candidateWorktreeDirs,
  worktreesDirSpec,
  checkWorktreeIsolation,
  gitRootsForPath,
  parseWorktreeAddError,
  describeRepoRelativeLocation,
  worktreesDirSpecs,
  CONTROL_CHAR_RE,
  CONTROL_OR_FORMAT_CHAR_RE,
  worktreeLocationOf,
  getWorktreesDirSpec,
} from "./worktreeIsolation.js";
import {
  readWorktreeHeadSha,
  resolveGitDir,
  resolveRef,
  resolveGitDir_2,
  isValidGitSha,
  getCommonDir,
  pointerFileIsSuspect,
  rawPointerPathIsUnsafe,
} from "./git/gitFilesystem.js";
import { hasDotSegment, identity, uncHostOf } from "./pathClassification.js";
import {
  stripTrailingSeparators,
  findSamePath,
  symlinkVerdictForPath,
  foldCaseForCompare as foldCaseForCompare_2,
  isPathSymlinkClear,
  findWorktreeMatchingPaths,
  findUniqueWorktreeForBranch,
  containsSamePath,
  isRemovableWorktreeDir,
  toForwardSlashesOnWindows,
  normalizePathKey,
  clearReparsePoints,
  foldCaseBasic,
} from "./pathIdentity.js";
import {
  writeIfMissing,
  retryFsOp,
  copyIntoTemp,
  assertSafeThenWrite,
  writeNewFile,
} from "./atomicPublishWrite.js";
import { getPlatform } from "./platform.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { TRANSIENT_FS_ERRORS as TRANSIENT_FS_ERRORS_2 } from "./plugins/safeCopy.js";
import {
  isWorktreeMadeElsewhereStub,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  micromatch,
  pruneWorktreeRegistrations,
  installRepoDetectionGuards,
} from "./worktree/worktreeRegistrations.js";
import { execFileNoThrowWithCwd, execFileNoThrow } from "./execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS, SAFE_GIT_ENV_CONSTANTS } from "./git/gitSafeEnv.js";
import {
  buildGitEnvForRepo,
  resolveGitDirsOrPlaceholder,
  NOT_A_GIT_REPO_PATH,
  resolveGitDirs,
  resolveGitDir as resolveGitDir_3,
} from "./git/gitDirResolution.js";
import {
  isStrictSandboxFilesystem,
  readSparseCheckoutConfig,
  hasMissingSparseObjects,
  minimalSparseDirs,
} from "./worktree/sparseCheckout.js";
import {
  inspectPartialClone,
  explainPartialCloneFailure,
  partialCloneFetchEnv,
  gitSupportsPartialCloneFetch,
  explainOnDemandFetchOff,
} from "./worktree/partialClone.js";
import { inspectSubmodules, submoduleChanges, describeSubmoduleChanges } from "./git/submoduleInspection.js";
import { withSafeGitConfig } from "./git/gitLanes.js";
import { hideUnsafePath, hideUnsafeText, hasUnsafePathGlyphsOrSurrogate } from "./unsafePathGlyphs.js";
import { printableLabel, printableNameOrPlaceholder } from "./printableName.js";
import { getFirstLine, truncateToLength, firstLineOf, countCharInString } from "./stringUtils.js";
import { isOnForeignMount, isNetworkMountPath, isForeignMountPath } from "./networkPaths.js";
import { isSentinelInode } from "./slowOperations.js";
import { isSameRepository, vetRepoForWorktrees } from "./git/worktreeVetting.js";
import { deregisterWorktree, pruneWorktreeRegistration } from "./git/worktreeRegistrations.js";
import { removeWorktreeSafely, worktreeRemovalText } from "./git/worktreeRemoval.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { resolveRemoteUrl } from "./detectRepository.js";
import { ghIsDangerousCallback as ghIsDangerousCallback_2, getGitHostKind } from "./gitHosts.js";
import { SAFE_UPLOAD_PACK_ARG_2 } from "./gitSafeExec.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { filterUsableIgnorePatterns, splitNonEmptyLines } from "./ignorePatterns.js";
import { resolveLocalSettingsStoreRoot } from "./settings/settingsFileParsing.js";
import { storageRootFor } from "./settings/settingsStorage.js";
import { readGitConfigValueAsync } from "./git/gitConfigParser.js";
import { getPreSettingsEnvHonoringLiveDeletions } from "./managedEnvApply.js";
import { isProcessRunning as isProcessRunning_2 } from "./genericProcessUtils.js";
import {
  isSameProcessAsync,
  procIdentityFields,
  ownProcStartAsync,
  isProcessProvablyGone,
} from "./processIdentity.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { getCwd } from "./cwd.js";
import { dispatchesWorktreeCreate, executeWorktreeCreateHook, executeWorktreeRemoveHook } from "./hooks.js";
import { markIsolationUnavailableForCwd, clearResumeHintWorktree } from "./concurrentSessions.js";
import { containsVulnerableUncPath } from "./shell/readOnlyCommandValidation.js";
import {
  hasUntouchableRecordSpelling,
  processChdir,
  resolveDeepestExistingAncestorSync,
  getFsImplementation,
  UNVERIFIED_ANCESTRY,
} from "./fsOperations.js";
import { getRepoRootForWorktreePath } from "./permissions/protectedDirs.js";
import { sleep } from "./sleep.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import {
  TRACE_ENV_VARS,
  buildFilterNeutralizingArgs,
  describeGitConfigUnreadable,
} from "./git/gitConfigFilters.js";
import { foldPathCase } from "./pathCaseFolding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isDirectlyUnderClaudeWorktreesDir } from "../daemon/jobs/killJob.js";
import { hasInode } from "./fsSafety/hardenedRead.js";
import { preferRemoteValue } from "../remote/remoteMode.js";
import { VARIADIC_VALUE_FLAGS, lastValueSlot, looksLikeOption } from "./cliArgs.js";
import { isHomeRelativePath } from "../cli/earlyArgs.js";
import { isPersonalConfigRestricted, getPersonalConfigFixHint } from "./personalConfigRestriction.js";
import { isRestrictedMode } from "./envUtils.js";
import { isInITerm2 } from "./swarm/backends/detection.js";
import { sequential } from "./sequential.js";
import { safeExecFile } from "./safeSpawn.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:13922-14013 sole-consumer
var AGENT_WORKTREE_SLUG_PATTERNS = [
  /^agent-a[0-9a-f]{16}$/,
  /^agent-a[0-9a-f]{7}$/,
  /^wf_[0-9a-f]{8}-[0-9a-f]{3}-\d+$/,
];
//@ chunk-dcmhvw5a.js:14013-14162 sole-consumer
var EPHEMERAL_WORKTREE_SLUG_PATTERNS; // deferred: uses AGENT_WORKTREE_SLUG_PATTERNS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dcmhvw5a.js:14013", () => {
  EPHEMERAL_WORKTREE_SLUG_PATTERNS = [
    ...AGENT_WORKTREE_SLUG_PATTERNS,
    /^wf-\d+$/,
    /^bridge-[A-Za-z0-9_]+(-[A-Za-z0-9_]+)*$/,
    /^job-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
    /^bg-[a-zA-Z0-9._-]{1,55}-[0-9a-f]{8}$/,
  ];
});
//@ chunk-dcmhvw5a.js:14162-14209 sole-consumer
function isEphemeralWorktreeSlug(slug) {
  return EPHEMERAL_WORKTREE_SLUG_PATTERNS.some((pattern) => pattern.test(slug));
}
//@ chunk-dcmhvw5a.js:14209-14242 sole-consumer
var WORKTREE_SLUG_SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
var MAX_WORKTREE_SLUG_CHARS = 64;
//@ chunk-dcmhvw5a.js:14242-14312 affinity
function suffixWorktreeSlug(slug, suffix) {
  let match = `-${suffix}`;
  return `${slug.slice(0, MAX_WORKTREE_SLUG_CHARS - match.length)}${match}`;
}
//@ chunk-dcmhvw5a.js:14312-14849 fingerprint = validateWorktreeSlug (0.807)
/**
 * 校验 worktree slug：每段只允许字母数字 ._-，总长 ≤64，不能含 . 或 .. 段。
 */
function validateWorktreeSlug_2(slug) {
  if (slug.length > MAX_WORKTREE_SLUG_CHARS)
    return `Invalid worktree name: must be ${MAX_WORKTREE_SLUG_CHARS} characters or fewer (got ${slug.length})`;
  for (let segment of slug.split("/")) {
    if (segment === "." || segment === "..")
      return `Invalid worktree name "${slug}": must not contain "." or ".." path segments`;
    if (segment.toLowerCase().replace(/\.+$/, "") === ".git")
      return `Invalid worktree name "${slug}": "${segment}" is a reserved git directory name`;
    if (!WORKTREE_SLUG_SEGMENT_PATTERN.test(segment))
      return `Invalid worktree name "${slug}": each "/"-separated segment must be non-empty and contain only letters, digits, dots, underscores, and dashes`;
  }
  return;
}
//@ chunk-aepeg2w5.js:834957-835049 placement
function isOwnedWorktreeSession(currentWorktreeSession) {
  return (
    !currentWorktreeSession.hookBased &&
    (!currentWorktreeSession.enteredExisting || currentWorktreeSession.madeElsewhere === "resumedByName")
  );
}
//@ chunk-aepeg2w5.js:835049-835243 placement
/**
 * 代理隔离证据
 */
class AgentIsolationEvidence {
  spawned = new Set();
  cleanlyRemoved = new Set();
  recordSpawned(spawned) {
    this.spawned.add(spawned);
  }
  recordCleanlyRemoved(cleanlyRemoved) {
    this.cleanlyRemoved.add(cleanlyRemoved);
  }
  clear() {
    this.spawned.clear();
    this.cleanlyRemoved.clear();
  }
}
//@ chunk-aepeg2w5.js:835243-835866 placement
/**
 * worktree 会话状态
 */
class WorktreeSessionState {
  currentSession = null;
  resumeHintWorktreeName = null;
  hasBeenInWorktree = false;
  bgTakeover = null;
  agentIsolationEvidence = new AgentIsolationEvidence();
  isolationUnavailableCwd = null;
  setCurrentSession(session) {
    this.currentSession = session;
    this.hasBeenInWorktree ||= session !== null;
    if (session && !session.enteredExisting) this.resumeHintWorktreeName = session.worktreeName;
  }
  getResumeHintWorktreeName() {
    if (this.currentSession)
      return this.currentSession.enteredExisting ? null : this.currentSession.worktreeName;
    return this.resumeHintWorktreeName;
  }
  clearResumeHintWorktreeName() {
    this.resumeHintWorktreeName = null;
  }
  setBgTakeover(bgTakeover) {
    this.bgTakeover = bgTakeover;
  }
  markIsolationUnavailable(isolationUnavailableCwd) {
    this.isolationUnavailableCwd = isolationUnavailableCwd;
  }
}
//@ chunk-aepeg2w5.js:835866-835891 placement
var worktreeSessionSlot; // deferred: uses WorktreeSessionState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:835866", () => {
  worktreeSessionSlot = new HostScoped(() => new WorktreeSessionState());
});
//@ chunk-aepeg2w5.js:835891-835919 placement
function getWorktreeSessionState() {
  return onProcessRootHost(worktreeSessionSlot);
}
//@ chunk-aepeg2w5.js:835919-835960 facade-exports
function getCurrentWorktreeSession() {
  return getWorktreeSessionState().currentSession;
}
//@ chunk-aepeg2w5.js:835960-836002 affinity
/**
 * 设置当前 worktree 会话。
 */
function setCurrentWorktreeSession(session) {
  getWorktreeSessionState().setCurrentSession(session);
}
//@ chunk-e6aww6q8.js:3041035-3041144 placement
var WORKTREES_SEGMENT = `${sep}worktrees${sep}`;
var WORKTREE_CONFIG_SUFFIXES = [`${sep}config.worktree`, `${sep}config.worktree.lock`, `${sep}commondir`];
//@ chunk-e6aww6q8.js:3041144-3041213 placement
function isWorktreeConfigPath(path) {
  return path.includes(WORKTREES_SEGMENT) && WORKTREE_CONFIG_SUFFIXES.some((suffix) => path.endsWith(suffix));
}
//@ chunk-e6aww6q8.js:3594932-3595112 placement = isClaudeSettingsPath (0.871)
function hasSandboxEnabledInProjectSettings(dir) {
  return ["settings.json", "settings.local.json"].some((name) => {
    let expandedPath = parseSettingsFileUncached(join(dir, ".claude", name));
    return expandedPath.settings === null
      ? expandedPath.errors.length > 0
      : expandedPath.settings.sandbox?.enabled === true;
  });
}
//@ chunk-e6aww6q8.js:3595112-3595272 facade-exports
function persistWorktreeSession(session, storageV5) {
  setCurrentWorktreeSession(session);
  let activeWorktreeSession =
    session !== null
      ? (() => {
          let { liveLaunchAnchor, originalChangeset, ...configSession } = session;
          return configSession;
        })()
      : undefined;
  saveCurrentProjectConfig(
    (config) => ({
      ...config,
      activeWorktreeSession,
    }),
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:3595272-3595355 facade-exports
class WorktreeIsolationError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeIsolationError";
  }
}
//@ chunk-e6aww6q8.js:3595355-3595657 facade-exports
function throwAgentWorktreeNotGitRefusal() {
  logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo");
  throw new WorktreeIsolationError(
    "Cannot create agent worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
  );
}
//@ chunk-e6aww6q8.js:3595657-3596040 facade-exports
function refuseUnavailableWorktree(reason) {
  if (env.CLAUDE_CODE_EVAL_CONFINED) {
    logFeatureBad("git_worktree_create", "git_worktree_create_eval_confined");
    throw new WorktreeIsolationError(
      `Cannot create ${reason}: worktree isolation is unavailable in this session (plugin evaluation harness)`,
    );
  }
  if (isDiskless()) {
    logFeatureBad("git_worktree_create", "git_worktree_create_diskless");
    throw new WorktreeIsolationError(
      `Cannot create ${reason}: worktree isolation is unavailable in a session without a disk`,
    );
  }
}
//@ chunk-e6aww6q8.js:3596040-3596127 layout
class WorktreeGitTransientError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorktreeGitTransientError";
  }
}
//@ chunk-e6aww6q8.js:3596127-3596185 facade-exports
function validateWorktreeSlug(slug) {
  let error = validateWorktreeSlug_2(slug);
  if (error !== undefined) throw Error(error);
}
//@ chunk-e6aww6q8.js:3596185-3596273 layout
function isUnsafeWorktreeSlugPath(dir) {
  return (
    containsPathTraversal(dir) ||
    isAbsolute(dir) ||
    dir.split(/[/\\]/).some((segment) => /^\.\.[ .]*$/.test(segment))
  );
}
//@ chunk-e6aww6q8.js:3596273-3596601 layout
async function hasUnsafeAncestor(targetPath, rootDir) {
  let ancestorDir = dirname(targetPath);
  for (;;)
    try {
      let realAncestor = await realpath(ancestorDir);
      if (!(await isPathUnderIdentity(rootDir, realAncestor))) return true;
      break;
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return true;
      if (
        (await lstat(ancestorDir).catch((error) => (getErrnoCode(error) === "ENOENT" ? null : error))) != null
      )
        return true;
      let parentDir = dirname(ancestorDir);
      if (parentDir === ancestorDir) return true;
      ancestorDir = parentDir;
    }
  try {
    if ((await lstat(targetPath)).isSymbolicLink()) return true;
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3596601-3597450 fingerprint = symlinkDirectories (0.642)
/**
 * 把仓库中的指定目录（如 node_modules）以符号链接方式挂到 worktree，避免重复安装。
 */
async function symlinkDirectories(repoRootPath, worktreePath, dirsToSymlink) {
  let worktreeRealPath;
  try {
    worktreeRealPath = await realpath(worktreePath);
  } catch (error) {
    logForDebugging(`Skipping symlinkDirectories: realpath(${worktreePath}) failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
  for (let dir of dirsToSymlink) {
    if (isUnsafeWorktreeSlugPath(dir)) {
      logForDebugging(`Skipping symlink for "${dir}": path traversal or absolute path`, {
        level: "warn",
      });
      continue;
    }
    let sourcePath = join(repoRootPath, dir);
    let destPath = join(worktreePath, dir);
    if (await hasUnsafeAncestor(destPath, worktreeRealPath)) {
      logForDebugging(`Skipping symlink for "${dir}": destination escapes worktree via committed symlink`, {
        level: "warn",
      });
      continue;
    }
    try {
      await lstat(sourcePath);
    } catch (error) {
      if (isENOENT(error))
        logForDebugging(`Skipping symlink for "${dir}": source does not exist in main repository`);
      else
        logForDebugging(
          `Skipping symlink for "${dir}": lstat failed (${getErrnoCode(error) ?? "unknown"}): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      continue;
    }
    try {
      await symlink(sourcePath, destPath, "dir");
      logForDebugging(`Symlinked ${dir} from main repository to worktree to avoid disk bloat`);
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "EEXIST")
        logForDebugging(`Failed to symlink ${dir} (${code ?? "unknown"}): ${errorMessage(error)}`, {
          level: "warn",
        });
    }
  }
}
//@ chunk-e6aww6q8.js:3597450-3597473 facade-exports
function restoreWorktreeSession(session) {
  setCurrentWorktreeSession(session);
}
//@ chunk-e6aww6q8.js:3597473-3597534 facade-exports
function generateTmuxSessionName(repoPath, branch) {
  return `${basename(repoPath)}_${branch}`.replace(/[/.]/g, "_");
}
//@ chunk-e6aww6q8.js:3597534-3597612 facade-exports
function resolveWorktreeCleanupRoot(worktreePath, originCwd) {
  let hostFiles = findCanonicalGitRoot(worktreePath);
  if (hostFiles && isAgentWorktreeOf(worktreePath, hostFiles)) return hostFiles;
  return (originCwd ? findCanonicalGitRoot(originCwd) : null) ?? hostFiles;
}
//@ chunk-e6aww6q8.js:3597612-3597660 facade-exports
function isAgentWorktreeOf(path, hostFiles) {
  return resolve_2(dirname(path)) === resolve_2(getClaudeWorktreesDir(hostFiles));
}
//@ chunk-e6aww6q8.js:3597660-3597705 file-local
function flattenSlug(slug) {
  return slug.replaceAll("/", "+");
}
//@ chunk-e6aww6q8.js:3597705-3597748 facade-exports = worktreeBranchName (1)
function worktreeBranchName(slug) {
  return `worktree-${flattenSlug(slug)}`;
}
//@ chunk-e6aww6q8.js:3597748-3597790 affinity
function getWorktreePathForSlug(layout, slug) {
  return join(layout.dir, flattenSlug(slug));
}
//@ chunk-e6aww6q8.js:3597790-3597994 affinity
async function assertWorktreeDirNotSymlink(layout, worktreePath) {
  let check = await checkWorktreePath(layout, worktreePath);
  if (check.ok) return;
  logFeatureBad(
    "git_worktree_create",
    check.reason === "symlink" ? "git_worktree_create_symlink_rejected" : "git_worktree_create_lstat_failed",
  );
  throw new WorktreeIsolationError(check.message);
}
//@ chunk-e6aww6q8.js:3597994-3598005 affinity
var MAX_WORKTREE_SLUG_RETRIES = 20;
//@ chunk-e6aww6q8.js:3598005-3598575 affinity
async function allocateWorktreeSlug(layout, slug, { isGiven, hasSessionHad }) {
  let candidateDirs = candidateWorktreeDirs(layout);
  for (let candidateDir of candidateDirs)
    await assertWorktreeDirNotSymlink(candidateDir, getWorktreePathForSlug(candidateDir, slug));
  if (
    isGiven &&
    (!hasSessionHad(slug) ||
      (
        await Promise.all(
          candidateDirs.map((candidateDir) =>
            readWorktreeHeadSha(getWorktreePathForSlug(candidateDir, slug)),
          ),
        )
      ).some((headSha) => headSha !== null))
  )
    return {
      slug,
      number: 1,
    };
  let existingNames = new Set(
    (
      await Promise.all(
        candidateDirs.map((candidateDir) =>
          readdir(candidateDir.dir).then(
            (names) => names.map((name) => name.toLowerCase()),
            (error) => {
              if (isENOENT(error)) return [];
              throw error;
            },
          ),
        ),
      )
    ).flat(),
  );
  let gitDir = await resolveGitDir(layout);
  let isEphemeral = isEphemeralWorktreeSlug(slug);
  for (let idx = 1; idx <= MAX_WORKTREE_SLUG_RETRIES; idx++) {
    let slug_2 = idx === 1 ? slug : suffixWorktreeSlug(slug, idx);
    if (
      !hasSessionHad(slug_2) &&
      (isEphemeral || !isEphemeralWorktreeSlug(slug_2)) &&
      !existingNames.has(flattenSlug(slug_2).toLowerCase()) &&
      (gitDir === null || (await resolveRef(gitDir, `refs/heads/${worktreeBranchName(slug_2)}`)) === null)
    )
      return {
        slug: slug_2,
        number: idx,
      };
  }
  return {
    slug,
    number: 0,
  };
}
//@ chunk-e6aww6q8.js:3598575-3599093 affinity
/**
 * 检查 worktree 路径相对仓库根的每一段是否为符号链接或无法验证，防止仓库内提交的符号链接把 worktree 引到仓库外。
 */
async function findSymlinkInWorktreeAncestry(worktreePath, rootPath) {
  if (hasDotSegment(worktreePath) || hasDotSegment(rootPath))
    return {
      component: worktreePath,
      kind: "unverifiable",
    };
  worktreePath = identity(worktreePath);
  rootPath = identity(rootPath);
  let escapesRoot = (relativePart) =>
    !relativePart || relativePart === ".." || relativePart.startsWith(`..${sep}`) || isAbsolute(relativePart);
  let relativePath = relative(rootPath, worktreePath);
  if (escapesRoot(relativePath)) {
    let foldedRelativePath = relative(
      comparablePath(rootPath, "foldingPlatforms"),
      comparablePath(worktreePath, "foldingPlatforms"),
    );
    if (escapesRoot(foldedRelativePath)) return null;
    relativePath = stripTrailingSeparators(normalize(worktreePath))
      .split(sep)
      .slice(-foldedRelativePath.split(sep).length)
      .join(sep);
  }
  let currentPath = rootPath;
  for (let segment of relativePath.split(sep)) {
    currentPath = join(currentPath, segment);
    let stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (isENOENT(error)) return null;
      return {
        component: currentPath,
        kind: "unverifiable",
      };
    }
    if (stats.isSymbolicLink())
      return {
        component: currentPath,
        kind: "symlink",
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:3599093-3599115 affinity
var CLAUDE_BASE_ENV = "CLAUDE_BASE";
//@ chunk-e6aww6q8.js:3599365-3599839 sole-consumer
/**
 * 移除 agent worktree 时把 .git 指针文件（gitdir: …）写回目录；目录已不存在或 inode/dev 与核验时不一致则不写。EEXIST/ENOENT 之外的失败记 warn。
 */
async function restoreWorktreeGitPointer(path, gitDirPath, vettedStats) {
  let stats = await lstat(path).catch(() => null);
  if (
    stats === null ||
    !stats.isDirectory() ||
    stats.ino !== vettedStats.ino ||
    stats.dev !== vettedStats.dev
  ) {
    logForDebugging(
      `removeAgentWorktree: not restoring the .git pointer of ${path} \u2014 the directory is gone or no longer the one that was vetted`,
      {
        level: "warn",
      },
    );
    return;
  }
  await writeFile(
    join(path, ".git"),
    `gitdir: ${gitDirPath}
`,
    {
      flag: "wx",
    },
  ).catch((error) => {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "EEXIST" && errnoCode !== "ENOENT")
      logForDebugging(
        `removeAgentWorktree: could not restore the .git pointer of ${path}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
  });
}
//@ chunk-e6aww6q8.js:3599839-3600295 sole-consumer
/**
 * 把 worktree 的基准提交写到 gitdir 下的 CLAUDE_BASE 文件（先写临时文件再独占创建）；原文件不是普通文件或有多个硬链接时记埋点并替换。
 */
async function writeWorktreeBaseline(worktreePath, baselineSha) {
  let gitDir = await resolveGitDir_2(worktreePath);
  if (!gitDir) {
    logForDebugging(`[worktree] cannot write baseline: gitdir unresolvable for ${worktreePath}`);
    return;
  }
  let baselinePath = join(gitDir, CLAUDE_BASE_ENV);
  try {
    let replacingUnsafeLeaf = false;
    try {
      let existingStats = await lstat(baselinePath);
      replacingUnsafeLeaf = !existingStats.isFile() || existingStats.nlink !== 1;
    } catch {}
    let stagedPath = await writeIfMissing(baselinePath, baselineSha);
    await tryCreateExclusive(stagedPath, baselinePath);
    if (replacingUnsafeLeaf) {
      logFeatureSad("git_worktree_create", "git_worktree_baseline_plant_replaced");
      logForDebugging(`[worktree] replaced a non-regular or multi-link CLAUDE_BASE leaf at ${baselinePath}`);
    }
  } catch (error) {
    logForDebugging(`[worktree] failed to write baseline to ${gitDir}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:3600295-3600472 sole-consumer = tryCreateExclusive (0.782)
async function tryCreateExclusive(a, b) {
  try {
    try {
      await retryFsOp(a, b);
    } catch (error) {
      if (getPlatform() === "windows" && getErrnoCode(error) === "EEXIST") {
        await unlink(b);
        await retryFsOp(a, b);
      } else throw error;
    }
  } catch (error) {
    await unlink(a).catch(() => {});
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3600472-3600825 sole-consumer
/**
 * 复制 .worktreeinclude 文件：开关 tengu_squishy_spring 关闭时直接 copyFile；否则复制到临时文件再独占改名，遇到瞬时 FS 错误退回为独占创建。
 */
async function copyIncludedFileSafely(file, destinationPath) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_squishy_spring", true)) {
    await copyFile(file, destinationPath);
    return;
  }
  let tempPath = await copyIntoTemp(file, destinationPath);
  try {
    await tryCreateExclusive(tempPath, destinationPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && TRANSIENT_FS_ERRORS_2.has(errnoCode)) {
      logForDebugging(
        `[worktree] rename of the staged copy onto ${destinationPath} failed (${errorMessage(error)}); creating it exclusively instead`,
        {
          level: "warn",
        },
      );
      try {
        await assertSafeThenWrite(file, destinationPath);
      } finally {
        await unlink(tempPath).catch(() => {});
      }
      return;
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3600825-3601052 affinity
async function readWorktreeBaseline_2(path) {
  let gitDir = await resolveGitDir_2(path);
  if (!gitDir)
    return {
      kind: "unreadable",
    };
  try {
    let trimmed = (await readFile(join(gitDir, CLAUDE_BASE_ENV), "utf-8")).trim();
    return isValidGitSha(trimmed)
      ? {
          kind: "recorded",
          sha: trimmed,
        }
      : {
          kind: "unreadable",
        };
  } catch (error) {
    return {
      kind: isENOENT(error) ? "absent" : "unreadable",
    };
  }
}
//@ chunk-e6aww6q8.js:3601052-3601119 facade-exports
async function isWorktreeMadeElsewhere(path) {
  return isWorktreeMadeElsewhereStub() && (await readWorktreeBaseline_2(path)).kind === "absent";
}
//@ chunk-e6aww6q8.js:3601119-3601198 facade-exports
async function readWorktreeBaseline(path) {
  let worktreeBaseline = await readWorktreeBaseline_2(path);
  return worktreeBaseline.kind === "recorded" ? worktreeBaseline.sha : null;
}
//@ chunk-e6aww6q8.js:3601198-3601314 layout
var WORKTREE_STALE_AGE_MS = 86400000;
var WORKTREE_GIT_TIMEOUT_MS = 5000;
var WORKTREE_FETCH_TIMEOUT_MS = 120000;
var MISSING_REMOTE_REF_RE = /^fatal: couldn't find remote ref /im;
var FETCH_FROM_LINE_RE = /(?:^|\n)From ([^\r\n]+)/;
var MAX_CHECKOUT_WORKERS = 16;
//@ chunk-e6aww6q8.js:3601314-3601507 layout
async function checkoutWorkersArgs(worktreePath) {
  if (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "--get-all", "checkout.workers"],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath),
        },
      )
    ).code === 0
  )
    return [];
  return ["-c", `checkout.workers=${Math.min(MAX_CHECKOUT_WORKERS, Math.max(1, availableParallelism()))}`];
}
//@ chunk-e6aww6q8.js:3601507-3601783 layout = isRealPathWithinTeamDir (0.762)
async function isNotFoundErrno_2(error, originalCwd, repoRoot) {
  if (
    isStrictSandboxFilesystem() ||
    hasSandboxEnabledInProjectSettings(error) ||
    (originalCwd !== null && hasSandboxEnabledInProjectSettings(originalCwd)) ||
    (repoRoot !== null && hasSandboxEnabledInProjectSettings(repoRoot))
  )
    return true;
  for (let { dir } of candidateWorktreeDirs(error))
    try {
      if (
        (
          await readdir(dir, {
            withFileTypes: true,
          })
        ).some((entry) => entry.isDirectory() && hasSandboxEnabledInProjectSettings(join(dir, entry.name)))
      )
        return true;
    } catch (error) {
      let code = getErrnoCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") return true;
    }
  return false;
}
//@ chunk-e6aww6q8.js:3601783-3601831 layout
function inspectRepoPartialClone(repoRoot, worktreePath) {
  return inspectPartialClone(repoRoot, (worktreePathCandidate) =>
    isNotFoundErrno_2(repoRoot, worktreePath, worktreePathCandidate),
  );
}
//@ chunk-e6aww6q8.js:3601831-3601841 layout
var MAX_BASELINE_MISMATCH = 2;
//@ chunk-e6aww6q8.js:3601841-3602246 layout
/**
 * 重新核验 worktree：状态干净、HEAD 仍是 s、分支仍是 refs/heads/r，且锁不被另一个同启动时间的存活进程持有。
 */
async function isWorktreeCleanOnBranch(worktreePath, repoRoot, branch, headSha) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null) return false;
  let [filterNeutralizingArgs_2, headResult] = await Promise.all([
    execFileNoThrowWithCwd(
      gitExe(),
      [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, "--no-optional-locks", ...SAFE_GIT_ENV_CONSTANTS],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    ),
    execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD", "--symbolic-full-name", "HEAD"],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    ),
  ]);
  if (
    filterNeutralizingArgs_2.code !== 0 ||
    filterNeutralizingArgs_2.stdout.trim().length > 0 ||
    headResult.code !== 0 ||
    headResult.stdout.trim() !==
      `${headSha}
refs/heads/${branch}`
  )
    return false;
  try {
    return !(await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(worktreePath, repoRoot)));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3602246-3604218 layout
/**
 * 恢复已有 worktree 时尝试把它快进重置到 origin 默认分支的新基准：要求分支未变、工作区干净、子模块无改动、上游已 gone 且无独有提交、无他人持锁，
 * 必要时先补取部分克隆缺的对象，再 reset。任何前提不满足都返回 null（保留旧基准）。
 */
async function fastResumeResetToNewBase(repoRoot, worktreePath, branch, headSha, baselineSha) {
  let [defaultBranch, gitDir] = await Promise.all([getDefaultBranch(), resolveGitDir(repoRoot)]);
  let newBaseBranch = defaultBranch && !defaultBranch.startsWith("-") ? defaultBranch : null;
  let newBaseSha =
    newBaseBranch && gitDir ? await resolveRef(gitDir, `refs/remotes/origin/${newBaseBranch}`) : null;
  if (!newBaseSha || newBaseSha === headSha) return null;
  let branchResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath),
    },
  );
  if (branchResult.code !== 0 || branchResult.stdout.trim() !== branch) return null;
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null) return null;
  let statusResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath, undefined, {
        userLocale: true,
      }),
    },
  );
  if (statusResult.code !== 0 || statusResult.stdout.trim().length > 0) {
    logForDebugging(
      `[worktree] fast-resume reset skipped for ${worktreePath}: ` +
        (statusResult.code !== 0
          ? `status failed (code ${statusResult.code})`
          : "tree read dirty under filter-driver-off pins"),
    );
    return null;
  }
  let submoduleReport = await inspectSubmodules(worktreePath);
  if (submoduleReport.kind !== "verified" || submoduleChanges(submoduleReport) !== undefined) return null;
  if (!(baselineSha !== null && headSha === baselineSha)) {
    let defaultRemoteRef = await getDefaultRemoteRef(repoRoot);
    if (defaultRemoteRef === null || !(await isUpstreamGoneAndMerged(worktreePath, defaultRemoteRef)))
      return null;
  }
  try {
    if (await isLockHeldByLiveSameStartProcess(await readWorktreeLockReason(worktreePath, repoRoot)))
      return null;
  } catch {
    return null;
  }
  let partialClone = await inspectRepoPartialClone(repoRoot, worktreePath);
  let fetchExplanation = await explainPartialCloneFailure(
    repoRoot,
    newBaseSha,
    partialClone,
    () => readSparseCheckoutConfig(worktreePath),
    MAX_BASELINE_MISMATCH,
  ).catch((error) => ({
    failure: errorMessage(error),
    fetches: 0,
  }));
  if (fetchExplanation.failure !== null) {
    logForDebugging(
      `[worktree] resumed worktree ${worktreePath} keeps its old base; the objects its new base ${newBaseSha} needs were not fetched: ${fetchExplanation.failure}`,
    );
    return null;
  }
  if (
    partialClone.inForce &&
    (await readSparseCheckoutConfig(worktreePath)
      .then((sparseCheckoutConfig) => hasMissingSparseObjects(repoRoot, newBaseSha, sparseCheckoutConfig))
      .catch(() => true))
  ) {
    logForDebugging(
      `[worktree] resumed worktree ${worktreePath} keeps its old base: moving it to ${newBaseSha} needs objects this repository does not have (or they could not be listed)`,
    );
    return null;
  }
  let workerArgs = await checkoutWorkersArgs(worktreePath);
  if (partialClone.inForce && !(await isWorktreeCleanOnBranch(worktreePath, repoRoot, branch, headSha))) {
    logForDebugging(
      `[worktree] fast-resume reset skipped for ${worktreePath}: after listing or fetching the objects for ${newBaseSha}, a re-check found the worktree dirty, off its commit or branch, claimed by another session, or unreadable`,
    );
    return null;
  }
  let filterNeutralizingArgs_2 = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs_2 === null) return null;
  if (
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [
          ...filterNeutralizingArgs_2,
          ...GIT_SAFE_GLOBAL_ARGS,
          ...workerArgs,
          "reset",
          "--hard",
          newBaseSha,
          "--",
        ],
        {
          cwd: worktreePath,
          env: withSafeGitConfig(worktreePath, partialCloneFetchEnv(partialClone)),
        },
      )
    ).code !== 0
  ) {
    logForDebugging(
      `[worktree] could not reset resumed worktree ${worktreePath} to ${newBaseSha}; resuming it unchanged`,
    );
    return null;
  }
  await writeWorktreeBaseline(worktreePath, newBaseSha);
  logForDebugging(
    `[worktree] reset resumed worktree ${worktreePath} to ${newBaseSha} \u2014 its previous work was fully upstream`,
  );
  return newBaseSha;
}
//@ chunk-e6aww6q8.js:3604218-3606147 layout
/**
 * 目录存在但 gitdir 已不存在的孤儿 worktree：确认 .git 指向本仓库的 worktrees 目录、分支没有未推送提交后删除该目录；任一 git 命令失败都拒绝自愈并抛错。
 */
async function selfHealOrphanedWorktreeDir(repoRoot, worktreesDir, worktreePath, branch) {
  let gitDir = await resolveGitDir_2(worktreePath);
  if (!gitDir) return;
  let gitDirMissing = false;
  try {
    await readdir(gitDir);
  } catch (error) {
    gitDirMissing = isENOENT(error);
  }
  if (!gitDirMissing) return;
  let gitDir_2 = await resolveGitDir(repoRoot);
  if (gitDir_2) {
    let registeredWorktreesDir = identity(resolve_2(dirname(gitDir)));
    let repoWorktreesDir = identity(resolve_2(join(gitDir_2, "worktrees")));
    let realWorktreesDir = await realpath(gitDir_2).then(
      (realGitDir) => identity(join(realGitDir, "worktrees")),
      () => null,
    );
    if (registeredWorktreesDir !== repoWorktreesDir && registeredWorktreesDir !== realWorktreesDir)
      throw new WorktreeIsolationError(
        `The folder ${hideUnsafePath(worktreePath)} is a leftover worktree whose .git file points to another location, so it was left as is. Remove it if it has no work to keep, or choose a different worktree name.`,
      );
  }
  let remotesResult = await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "remote"], {
    cwd: repoRoot,
    env: buildGitEnvForRepo(repoRoot),
  });
  if (remotesResult.code !== 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but \`git remote\` failed (git said ${
        printableLabel(getFirstLine(remotesResult.stderr.trim()), {
          head: 60,
          tail: 120,
        }) || "nothing"
      }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  let revParseResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", branch],
    {
      cwd: repoRoot,
      env: buildGitEnvForRepo(repoRoot),
    },
  );
  if (revParseResult.code !== 0 && revParseResult.stderr.trim().length > 0)
    throw Error(
      `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-parse on ${branch} failed (git said ${
        printableLabel(getFirstLine(revParseResult.stderr.trim()), {
          head: 60,
          tail: 120,
        }) || "nothing"
      }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
    );
  if (remotesResult.stdout.trim().length > 0 && revParseResult.code === 0) {
    let unpushedResult = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", branch, "--not", "--remotes"],
      {
        cwd: repoRoot,
        env: buildGitEnvForRepo(repoRoot),
      },
    );
    if (unpushedResult.code !== 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but rev-list on ${branch} failed (git said ${
          printableLabel(getFirstLine(unpushedResult.stderr.trim()), {
            head: 60,
            tail: 120,
          }) || "nothing"
        }) \u2014 refusing to self-heal. Remove ${hideUnsafePath(worktreePath)} manually if it has no work to keep.`,
      );
    if (unpushedResult.stdout.trim().length > 0)
      throw Error(
        `Orphaned worktree dir at ${hideUnsafePath(worktreePath)} but branch ${branch} has unpushed commits \u2014 refusing to self-heal. Push or delete the branch, then retry.`,
      );
  }
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  try {
    await rm_2(worktreePath, {
      recursive: true,
      force: true,
    });
    logForDebugging(`[worktree] removed orphaned worktree directory at ${worktreePath}`);
  } catch (error) {
    throw Error(
      `Cannot self-heal orphaned worktree at ${hideUnsafePath(worktreePath)}: it could not be removed${getErrnoCode(error) ? ` (${getErrnoCode(error)})` : ""}. Remove manually to proceed.`,
    );
  }
}
//@ chunk-e6aww6q8.js:3606147-3606276 layout
async function candidateWorktreePaths(worktreesDir, worktreePath) {
  let realAnchor = await realpath(worktreesDir.anchor).catch(() => null);
  return [
    join(worktreesDir.dir, basename(worktreePath)),
    ...(realAnchor === null
      ? []
      : [join(worktreesDirSpec(worktreesDir, realAnchor).dir, basename(worktreePath))]),
  ];
}
//@ chunk-e6aww6q8.js:3606276-3606391 layout
async function isSameRegisteredPath(pathA, onlyIfRegisteredAt, above) {
  let pathB = findSamePath(pathA, onlyIfRegisteredAt);
  if (pathB === null) return false;
  if (isOnForeignMount(pathA, pathB)) return false;
  return (await comparePathIdentity(pathA, pathB, above)) === "same";
}
//@ chunk-e6aww6q8.js:3606391-3607352 layout
/**
 * 比较两个路径是否指向同一目录/文件：两侧祖先都无链接（P1 为 clear）后用 bigint lstat 比较 dev/ino，前后两次检查防竞态；
 * 返回 same / different / unknown / unreadable / untrusted（inode 不可信）。
 */
async function comparePathIdentity(pathA, pathB, above, kind = "directory") {
  let normalizedA = stripTrailingSeparators(normalize(pathA));
  let normalizedB = stripTrailingSeparators(normalize(pathB));
  let [verdictA, verdictB] = await Promise.all([
    symlinkVerdictForPath(kind === "file" ? dirname(normalizedA) : normalizedA, above),
    symlinkVerdictForPath(kind === "file" ? dirname(normalizedB) : normalizedB, above),
  ]);
  if (verdictA === "unknown" || verdictB === "unknown") return "unknown";
  if (verdictA !== "clear" || verdictB !== "clear") return "different";
  let [statsA, statsB] = await Promise.all([
    lstat(normalizedA, {
      bigint: true,
    }).catch(() => null),
    lstat(normalizedB, {
      bigint: true,
    }).catch(() => null),
  ]);
  if (statsA === null || statsB === null) return "unreadable";
  let [recheckVerdictA, secondVerdict] = await Promise.all([
    symlinkVerdictForPath(kind === "file" ? dirname(normalizedA) : normalizedA, above),
    symlinkVerdictForPath(kind === "file" ? dirname(normalizedB) : normalizedB, above),
  ]);
  if (recheckVerdictA !== "clear" || secondVerdict !== "clear")
    return recheckVerdictA === "unknown" || secondVerdict === "unknown" ? "unknown" : "different";
  if (!(kind === "file" ? statsA.isFile() && statsB.isFile() : statsA.isDirectory() && statsB.isDirectory()))
    return "different";
  if (isSentinelInode(statsA.ino) !== isSentinelInode(statsB.ino)) return "different";
  if (statsA.dev !== 0n && statsB.dev !== 0n && statsA.dev !== statsB.dev) return "different";
  if (isSentinelInode(statsA.ino) || statsA.dev === 0n || statsB.dev === 0n) return "untrusted";
  let parentStats = await lstat(dirname(normalizedA), {
    bigint: true,
  }).catch(() => null);
  if (parentStats !== null && statsA.dev === parentStats.dev && statsA.ino === parentStats.ino)
    return "untrusted";
  return statsA.dev === statsB.dev && statsA.ino === statsB.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:3607352-3607411 layout = getReservedShortcuts (1)
function isCaseInsensitivePlatform() {
  let platform = getPlatform();
  return platform === "windows" || platform === "macos";
}
//@ chunk-e6aww6q8.js:3607411-3607487 layout
function comparablePath(a, b) {
  let stripped = stripTrailingSeparators(identity(a));
  return b === "everyPlatform" || isCaseInsensitivePlatform() ? foldCaseForCompare_2(stripped) : stripped;
}
//@ chunk-e6aww6q8.js:3607487-3607591 layout
function isIdentityMatch(identity, foldOn, pathA, pathB) {
  return (
    identity === "same" ||
    (identity === "untrusted" &&
      (foldOn === "everyPlatform" || isCaseInsensitivePlatform()) &&
      foldCaseForCompare(pathA) === foldCaseForCompare(pathB))
  );
}
//@ chunk-e6aww6q8.js:3607591-3607727 layout
function foldCaseForCompare(path) {
  return stripTrailingSeparators(identity(path)).replace(/\p{Lu}/gu, (upperChar) => {
    if (upperChar.length > 1) return upperChar;
    let lower = upperChar.toLowerCase();
    return lower.toUpperCase() === upperChar ? lower : upperChar;
  });
}
//@ chunk-e6aww6q8.js:3607727-3607891 layout
async function isSamePathIdentity(pathA, pathB, options = {}) {
  if (stripTrailingSeparators(normalize(pathA)) === stripTrailingSeparators(normalize(pathB))) return true;
  let foldOn = options.foldOn ?? "foldingPlatforms";
  return (
    comparablePath(pathA, foldOn) === comparablePath(pathB, foldOn) &&
    isIdentityMatch(
      await comparePathIdentity(pathA, pathB, options.above, options.kind),
      foldOn,
      pathA,
      pathB,
    )
  );
}
//@ chunk-e6aww6q8.js:3607891-3608241 layout
/**
 * 判断 n 是否在 e 之下（strictly 时不含相等）：先按规范化字符串，再在大小写折叠平台上按前缀段的 inode 身份比较。
 */
async function isPathUnderIdentity(path, parent, options = {}) {
  let strictly = options.strictly ?? false;
  let pathB = stripTrailingSeparators(normalize(path));
  let strictly_2 = stripTrailingSeparators(normalize(parent));
  if (strictly_2.startsWith(pathB + sep)) return true;
  if (strictly_2 === pathB) return !strictly;
  let foldOn = options.foldOn ?? "foldingPlatforms";
  let comparablePathValue = comparablePath(pathB, foldOn);
  let comparableParent = comparablePath(strictly_2, foldOn);
  let prefixSegmentCount = pathB.split(sep).length;
  let parts = strictly_2.split(sep);
  if (
    parts.length < prefixSegmentCount ||
    (strictly && parts.length === prefixSegmentCount) ||
    (comparableParent !== comparablePathValue && !comparableParent.startsWith(comparablePathValue + sep))
  )
    return false;
  let pathA = parts.slice(0, prefixSegmentCount).join(sep);
  return isIdentityMatch(await comparePathIdentity(pathA, pathB, options.above), foldOn, pathA, pathB);
}
//@ chunk-e6aww6q8.js:3608241-3611558 layout
/**
 * 撤销一次 worktree add 的结果：核验注册信息与仓库一致、从 git worktree list 找到该分支（或按 byPathIn 路径）的 worktree，
 * 排除主 worktree、他机、含链接或不完整的路径后安全删除；不能删除时视情况删掉 .git 指针并记 "Kept worktree registration"。返回是否已删除。
 */
async function removeWorktreeRegistration(repoRoot, branch, worktreePath, options = {}) {
  let originallyUnpinned = options.onlyIfRegisteredAt === undefined;
  let realRepoRoot = await realpath(repoRoot).catch(() => null);
  let keepRegistration = async (
    reason,
    {
      deregister: shouldDeregister = options.deregisterOnKeep === "ifOwned"
        ? originallyUnpinned
        : (options.deregisterOnKeep ?? true),
    } = {},
  ) => {
    logForDebugging(`Kept worktree registration for ${branch}: ${reason}`, {
      level: "warn",
    });
    if (
      shouldDeregister &&
      (await isPathSymlinkClear(worktreePath, repoRoot)) &&
      (await readlink(worktreePath).then(
        () => false,
        (error) => getErrnoCode(error) === "EINVAL",
      ))
    )
      await unlink(join(worktreePath, ".git")).catch(() => {});
    return false;
  };
  let pinned = await vetWorktreeRegistration(repoRoot);
  if (!pinned.ok)
    return keepRegistration(pinned.reason, {
      ...(pinned.outcome === "unlisted" && {
        deregister: false,
      }),
    });
  let repoCheck = await isSameRepository(pinned.root, pinned.gitDir);
  if ("refused" in repoCheck)
    return keepRegistration(repoCheck.refused, {
      deregister: false,
    });
  let pinnedGitDirArgs = ["--git-dir", pinned.gitDir];
  let runGit = async (args) => {
    let pinnedDir = await verifyPinnedGitDir(pinned, resolveGitDirsOrPlaceholder(repoRoot));
    return "refused" in pinnedDir
      ? pinnedDir
      : execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...pinnedGitDirArgs, ...args], {
          cwd: repoRoot,
          env: pinnedDir.env,
        });
  };
  let listResult = await runGit(["worktree", "list", "--porcelain", "-z"]);
  if ("refused" in listResult)
    return keepRegistration(listResult.reason, {
      deregister: false,
    });
  let gitPathArg;
  if (listResult.code === 0) {
    let registeredPath;
    if (options.byPathIn) {
      let byPathIn = options.byPathIn;
      let baseName = basename(worktreePath);
      let realAnchor =
        byPathIn.anchor === repoRoot ? realRepoRoot : await realpath(byPathIn.anchor).catch(() => null);
      let candidatePaths = [
        ...(realAnchor === null ? [] : [join(worktreesDirSpec(byPathIn, realAnchor).dir, baseName)]),
        join(byPathIn.dir, baseName),
      ];
      registeredPath = findWorktreeMatchingPaths(listResult.stdout, candidatePaths);
      if (registeredPath === null)
        return keepRegistration(`git lists no worktree at ${candidatePaths.join(" or ")}`);
    } else {
      registeredPath = findUniqueWorktreeForBranch(listResult.stdout, branch);
      if (registeredPath === null) return keepRegistration("git lists no worktree checked out on it");
    }
    if (
      options.onlyIfRegisteredAt !== undefined &&
      !containsSamePath(registeredPath, options.onlyIfRegisteredAt) &&
      !(await isSameRegisteredPath(registeredPath, options.onlyIfRegisteredAt, repoRoot))
    ) {
      logForDebugging(
        `Kept worktree registration for ${branch}: ${registeredPath} is not at ${options.onlyIfRegisteredAt.join(" or ")}, so this add did not create it`,
        {
          level: "warn",
        },
      );
      return false;
    }
    originallyUnpinned = true;
    if (findSamePath(registeredPath, [repoRoot, ...(realRepoRoot === null ? [] : [realRepoRoot])]) !== null) {
      logForDebugging(`Kept worktree registration for ${branch}: it names the main worktree`, {
        level: "warn",
      });
      return false;
    }
    if (isOnForeignMount(registeredPath, repoRoot)) {
      logForDebugging(`Kept worktree registration for ${branch}: ${registeredPath} is on another host`, {
        level: "warn",
      });
      return false;
    }
    let linkVerdict = await symlinkVerdictForPath(registeredPath, repoRoot);
    if (linkVerdict === "missing") {
      let repoCheck = await isSameRepository(pinned.root, pinned.gitDir);
      if ("refused" in repoCheck)
        logForDebugging(`Kept worktree registration for ${branch}: ${repoCheck.refused}`, {
          level: "warn",
        });
      return (
        ("refused" in repoCheck
          ? {
              outcome: "kept",
              reason: repoCheck.refused,
            }
          : await deregisterWorktree(
              repoCheck.gitDir,
              {
                worktreePath: registeredPath,
                repoSpelled: pinned.root,
              },
              {
                locked: "keep",
              },
            )
        ).outcome === "dropped"
      );
    }
    if (linkVerdict !== "clear")
      return keepRegistration(`${registeredPath} has a link in a component, or one that cannot be probed`);
    let realRegistered = await realpath(registeredPath).catch(() => null);
    if (realRegistered === null) return keepRegistration(`${registeredPath} does not resolve`);
    if (
      realRepoRoot !== null &&
      stripTrailingSeparators(realRegistered) === stripTrailingSeparators(realRepoRoot)
    ) {
      logForDebugging(`Kept worktree registration for ${branch}: it resolves to the main worktree`, {
        level: "warn",
      });
      return false;
    }
    if (!(await isRemovableWorktreeDir(registeredPath, realRegistered, repoRoot)))
      return keepRegistration(`${registeredPath} is not intact (a link may have been introduced)`);
    gitPathArg = toForwardSlashesOnWindows(registeredPath);
  } else if (await gitSupportsPartialCloneFetch(repoRoot))
    return keepRegistration("could not read git's worktree list", {
      deregister: false,
    });
  else {
    if (!(await isPathSymlinkClear(worktreePath, repoRoot)))
      return keepRegistration(`${worktreePath} has a link in a component`);
    let realFallback = await realpath(worktreePath).catch(() => null);
    if (realFallback === null || !(await isRemovableWorktreeDir(worktreePath, realFallback, repoRoot)))
      return keepRegistration(`${worktreePath} is not intact`);
    gitPathArg = worktreePath;
  }
  let removal = await removeWorktreeSafely(repoRoot, gitPathArg, {
    git: {
      dir: repoCheck.gitDir,
      root: pinned.root,
    },
    deregisterIfStopped: options.dropIfStopped === true,
  });
  if (removal.outcome === "unanchored") {
    let forceResult = await runGit(["worktree", "remove", "--force", gitPathArg]);
    if ("refused" in forceResult)
      return keepRegistration(forceResult.reason, {
        deregister: false,
      });
    if (forceResult.code !== 0)
      logForDebugging(`Kept worktree registration for ${branch}: git could not remove ${gitPathArg}`, {
        level: "warn",
      });
    return forceResult.code === 0;
  }
  if (removal.outcome === "delete_failed") {
    if (removal.deregistered) {
      logForDebugging(
        `Worktree for ${branch} not fully deleted, its registration dropped: ${worktreeRemovalText(removal)}`,
        {
          level: "warn",
        },
      );
      return false;
    }
    return keepRegistration(
      worktreeRemovalText(removal),
      removal.started
        ? {
            deregister: true,
          }
        : {},
    );
  }
  if (removal.outcome !== "removed")
    logForDebugging(
      `Removing the worktree for ${branch} at ${gitPathArg} did not finish: ${worktreeRemovalText(removal)}`,
      {
        level: "warn",
      },
    );
  return removal.outcome === "removed";
}
//@ chunk-e6aww6q8.js:3611558-3614484 layout
/**
 * 用 git rev-parse（或 exactRef 时 show-ref）解析 worktree 的基准提交；失败时按退出码/超时/输出分类原因、记埋点，并抛出带诊断建议的错误。
 */
async function resolveWorktreeBaseSha({ base, kind, failure, cwd, root, exactRef }) {
  let gitEnvForRepo = buildGitEnvForRepo(root);
  let verifyCommand = exactRef === true ? "show-ref" : "rev-parse";
  let { stdout, stderr, code, exitCode, timedOut } = await execFileNoThrowWithCwd(
    gitExe(),
    exactRef === true
      ? [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--hash", base]
      : [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "--quiet", base],
    {
      cwd,
      env: gitEnvForRepo,
    },
  );
  let trimmed = stdout.trim();
  if (code === 0 && trimmed !== "") return trimmed;
  logFeatureBad("git_worktree_create", "git_worktree_create_revparse_failed");
  let trimmed_2 = stderr.trim();
  let isNotAValidRef =
    exactRef === true && exitCode === 128 && trimmed_2 === `fatal: '${base}' - not a valid ref`;
  let failureCause =
    code === 0
      ? "empty_answer"
      : timedOut
        ? "timed_out"
        : exitCode === undefined
          ? "not_completed"
          : exitCode === 1
            ? trimmed_2 === "" && trimmed === ""
              ? "name_missing"
              : "exit_1_with_output"
            : isNotAValidRef
              ? "name_missing"
              : exitCode === 128
                ? "git_refused"
                : "other_exit";
  let repoConfirmed = gitEnvForRepo.GIT_DIR === NOT_A_GIT_REPO_PATH ? "no" : "yes";
  let mapped = truncateToLength(trimmed_2, 65536)
    .split(
      `
`,
    )
    .map((line) => truncateToLength(line, 4096));
  let notableLine =
    mapped.find((line) => /^(fatal|error):/.test(line)) ??
    mapped.find((line) => line.startsWith("warning:")) ??
    mapped.find((line) => printableLabel(line) !== "") ??
    "";
  let hiddenOutputNote = `git ${verifyCommand} failed, and its output is not shown.`;
  let gitExeNote = "the git that Claude Code runs (which may not be the one in your shell)";
  let checkGitHint = `or that ${gitExeNote} is not working. Running git status in this repository may show which.`;
  let checkGitHintAlt = `It may also be that ${gitExeNote} is not working. Running git status in this repository may show more.`;
  let headBaseHint =
    'To start worktrees from your current HEAD instead, set worktree.baseRef to "head" in Claude Code settings.';
  let explanation =
    failureCause === "empty_answer"
      ? `git ${verifyCommand} succeeded but printed no commit id.`
      : failureCause === "timed_out"
        ? `git ${verifyCommand} timed out.`
        : failureCause === "not_completed"
          ? "git failed to start, or was stopped before it finished."
          : repoConfirmed === "no"
            ? "Claude Code could not confirm that this repository's .git entry belongs to the folder it is in (for example a symlinked .git, or a .git file that points elsewhere), so no worktree can be made from it."
            : failureCause === "exit_1_with_output"
              ? kind === "origin_default"
                ? `${hiddenOutputNote} The fetch from origin succeeded, so it may be that this repository has no such ref afterwards (for example a single-branch clone of another branch, or a bare clone without a fetch refspec), ${checkGitHint} ${headBaseHint}`
                : kind === "fetch_head"
                  ? `${hiddenOutputNote} The fetch of the PR/MR succeeded, so it may be that FETCH_HEAD names no commit afterwards, ${checkGitHint}`
                  : `${hiddenOutputNote} It may be that HEAD does not point to a commit (for example a new repository, or a branch without a commit yet), ${checkGitHint}`
              : failureCause !== "name_missing"
                ? `git ${verifyCommand} failed (git said ${
                    printableLabel(notableLine, {
                      head: 60,
                      tail: 120,
                    }) || (trimmed_2 === "" && trimmed === "" ? "nothing" : "nothing that can be shown here")
                  }).`
                : kind === "origin_default"
                  ? `the fetch from origin succeeded, but git ${verifyCommand} found no such ref afterwards (for example in a single-branch clone of another branch, or a bare clone without a fetch refspec). ${headBaseHint} ${checkGitHintAlt}`
                  : kind === "fetch_head"
                    ? `the fetch of the PR/MR succeeded, but git rev-parse returned no commit for FETCH_HEAD afterwards. ${checkGitHintAlt}`
                    : `git rev-parse returned no commit for HEAD (for example in a new repository, or on a branch without a commit yet), so Claude Code has nothing to base a worktree on. ${checkGitHintAlt}`;
  throw withTelemetryMessage(
    Error(`${failure}: ${explanation}`),
    `worktree base not resolved (base=${kind}, cause=${failureCause}, repo_confirmed=${repoConfirmed})`,
  );
}
//@ chunk-e6aww6q8.js:3614484-3614710 layout
function resolveHeadAsBase({ repoRoot, fromCwd, kind }) {
  let gitCwd = fromCwd ?? repoRoot;
  return resolveWorktreeBaseSha({
    base: "HEAD",
    kind,
    failure:
      kind === "head_requested"
        ? `Failed to resolve HEAD in ${hideUnsafePath(gitCwd)}`
        : 'Failed to resolve base branch "HEAD"',
    cwd: gitCwd,
    root: fromCwd === undefined ? repoRoot : (findGitRoot(fromCwd) ?? fromCwd),
  });
}
//@ chunk-e6aww6q8.js:3614710-3615195 layout
async function readFetchHeadForRef(gitDir, refspec, remoteUrl) {
  let fetchHeadText;
  try {
    fetchHeadText = await readFile(join(gitDir, "FETCH_HEAD"), "utf-8");
  } catch {
    return null;
  }
  let matchingNotations = new Set([
    `'refs/${refspec}' of ${remoteUrl}`,
    `tag '${refspec}' of ${remoteUrl}`,
    `branch '${refspec}' of ${remoteUrl}`,
    `remote-tracking branch '${refspec}' of ${remoteUrl}`,
    `remote-tracking branch '${refspec}/HEAD' of ${remoteUrl}`,
  ]);
  let exactSha;
  let sawRelatedNotation = false;
  for (let line of fetchHeadText.split(/\r?\n/)) {
    let [shaField = "", , notedRef = ""] = line.split("\t");
    if (!isValidGitSha(shaField)) continue;
    if (notedRef === `'${refspec}' of ${remoteUrl}`) {
      if (exactSha !== undefined && exactSha !== shaField) return null;
      exactSha = shaField;
    } else if (matchingNotations.has(notedRef)) sawRelatedNotation = true;
  }
  if (exactSha !== undefined)
    return {
      sha: exactSha,
    };
  return sawRelatedNotation ? "absent" : null;
}
//@ chunk-e6aww6q8.js:3615195-3625933 callgraph-witnessed = getOrCreateWorktree (0.265)
/**
 * 创建或复用 <repo>/.claude/worktrees/<slug>（分支 worktree-<slug>）：已存在则校验属于本仓库、未被符号链接重定向并按需刷新到基准；否则清理陈旧锁、按 worktree.baseRef（head 或默认远程分支）git worktree add。
 */
async function getOrCreateWorktree(a, worktreesDir, slug, options) {
  refuseUnavailableWorktree("a worktree");
  let worktreePath = getWorktreePathForSlug(worktreesDir, slug);
  let worktreeBranch = worktreeBranchName(slug);
  let fromHead =
    options?.fromHead ?? (!options?.prNumber && getInitialSettings_2().worktree?.baseRef === "head");
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  let existingHead = await readWorktreeHeadSha(worktreePath);
  if (existingHead && options?.isBranchNew) {
    logFeatureBad("git_worktree_create", "git_worktree_create_numbered_name_taken");
    throw new WorktreeIsolationError(
      `a worktree named "${slug}" appeared while Claude Code was about to create it, so it was left as it is. Call ${ENTER_WORKTREE_TOOL_NAME} again, or pass a different name.`,
    );
  }
  if (existingHead) {
    let gitDir = await resolveGitDir_2(worktreePath);
    let gitDir_2 = await resolveGitDir(a);
    if (gitDir && gitDir_2) {
      let repoWorktreesDir = join(gitDir_2, "worktrees");
      let [registeredStats, worktreesStats] = await Promise.all([
        stat(dirname(gitDir)).catch(() => null),
        stat(repoWorktreesDir).catch((error) => (isENOENT(error) ? "enoent" : null)),
      ]);
      if (
        registeredStats !== null &&
        worktreesStats !== null &&
        (worktreesStats === "enoent" ||
          registeredStats.dev !== worktreesStats.dev ||
          registeredStats.ino !== worktreesStats.ino)
      ) {
        logFeatureBad("git_worktree_create", "git_worktree_resume_foreign_repo");
        throw new WorktreeIsolationError(
          `The worktree directory at ${hideUnsafePath(worktreePath)} belongs to a different repository. Remove it if it has no work to keep, or choose a different worktree name.`,
        );
      }
    }
    let isolationCheck = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(getOriginalCwd(), a));
    if (!isolationCheck.ok) {
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
      throw new WorktreeIsolationError(isolationCheck.message);
    }
    let worktreeBaseline = await readWorktreeBaseline_2(worktreePath);
    let sha = worktreeBaseline.kind === "recorded" ? worktreeBaseline.sha : null;
    let madeElsewhere = worktreeBaseline.kind === "absent" && isWorktreeMadeElsewhereStub();
    let date = new Date();
    await utimes(worktreePath, date, date).catch(() => {});
    if (!fromHead && !options?.prNumber && !options?.resumeAsIs && !madeElsewhere) {
      let refreshedHead = await fastResumeResetToNewBase(a, worktreePath, worktreeBranch, existingHead, sha);
      if (refreshedHead)
        return {
          worktreePath,
          worktreeBranch,
          headCommit: refreshedHead,
          existed: true,
          refreshed: true,
          madeElsewhere: false,
        };
    }
    return {
      worktreePath,
      worktreeBranch,
      headCommit: sha ?? existingHead,
      existed: true,
      madeElsewhere,
    };
  }
  if (resolveGitDirs(a) === null && resolveGitDir_3(a)) {
    logFeatureBad("git_worktree_create", "git_worktree_create_bare_layout_root");
    throw new WorktreeIsolationError(
      `The .git in ${hideUnsafePath(a)} points to a bare repository, so Claude Code can't create a worktree from this directory. Start Claude Code in one of that repository's worktrees instead (git worktree add makes one).`,
    );
  }
  await selfHealOrphanedWorktreeDir(a, worktreesDir, worktreePath, worktreeBranch);
  let lockReason = await readWorktreeLockReason(worktreePath, a).catch((error) => {
    logForDebugging(
      `[worktree] skipped the stale-lock self-heal for ${worktreePath}: ${errorMessage(error)}`,
    );
    return;
  });
  if (
    lockReason !== undefined &&
    CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(lockReason) &&
    (await readdir(worktreePath).then(
      (entries) => entries.length === 0,
      (error) => isENOENT(error),
    )) &&
    !(await isLockHeldByLiveSameStartProcess(lockReason))
  )
    await pruneWorktreeRegistration(a, worktreePath, {
      locked: {
        unlockIf: (reason) =>
          CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(reason.trim()) && reason.trim() === lockReason.trim(),
      },
    });
  await mkdir(worktreesDir.dir, {
    recursive: true,
  });
  let baseBranch;
  let baseSha = null;
  if (fromHead) {
    baseSha = await resolveHeadAsBase({
      repoRoot: a,
      fromCwd: options?.fromCwd,
      kind: "head_requested",
    });
    baseBranch = `${baseSha}^{commit}`;
  } else if (options?.prNumber) {
    let remoteUrl = await resolveRemoteUrl(a);
    let remoteParsed = remoteUrl ? ghIsDangerousCallback_2(remoteUrl) : null;
    let forgeKind = remoteParsed ? getGitHostKind(remoteParsed) : "other";
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_melodic_octopus", true);
    let candidateRefs;
    let preferredRef;
    if (featureValue_CACHED_MAY_BE_STALE) {
      let githubPrRef = `refs/pull/${options.prNumber}/head`;
      let gitlabMrRef = `refs/merge-requests/${options.prNumber}/head`;
      if (forgeKind === "github") candidateRefs = [githubPrRef];
      else if (forgeKind === "gitlab") candidateRefs = [gitlabMrRef];
      else {
        preferredRef =
          options.prForge === "gitlab" ? gitlabMrRef : options.prForge === "github" ? githubPrRef : undefined;
        candidateRefs =
          preferredRef === gitlabMrRef ? [gitlabMrRef, githubPrRef] : [githubPrRef, gitlabMrRef];
      }
    } else {
      let githubPrRef = `pull/${options.prNumber}/head`;
      let gitlabMrRef = `merge-requests/${options.prNumber}/head`;
      candidateRefs =
        forgeKind === "gitlab"
          ? [gitlabMrRef]
          : forgeKind === "github"
            ? [githubPrRef]
            : [githubPrRef, gitlabMrRef];
    }
    let gitDir = featureValue_CACHED_MAY_BE_STALE ? resolveGitDirsOrPlaceholder(a).gitDir : "";
    let fetchedRefs = [];
    let uncheckedRef;
    let lastFetchCode = 1;
    let prFailureReason = "git_worktree_create_pr_fetch_failed";
    let prFailureDetail = "";
    let gitSshEnv = await getGitSshEnv(a);
    for (let refspec of candidateRefs) {
      let {
        code: prFetchCode,
        stderr: prFetchStderr,
        timedOut,
      } = await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", refspec], {
        cwd: a,
        stdin: "ignore",
        ...gitSshEnv,
        env: {
          ...gitSshEnv.env,
          LC_ALL: "C",
        },
        timeout: WORKTREE_FETCH_TIMEOUT_MS,
      });
      lastFetchCode = prFetchCode;
      if (prFetchCode === 0) {
        if (!featureValue_CACHED_MAY_BE_STALE) break;
        let fetchedFromUrl = FETCH_FROM_LINE_RE.exec(prFetchStderr)?.[1];
        let fetchHeadEntry =
          fetchedFromUrl === undefined ? null : await readFetchHeadForRef(gitDir, refspec, fetchedFromUrl);
        if (fetchHeadEntry && fetchHeadEntry !== "absent")
          fetchedRefs.push({
            refspec,
            sha: fetchHeadEntry.sha,
          });
        else {
          lastFetchCode = 1;
          if (!preferredRef || refspec === preferredRef || !prFailureDetail) {
            prFailureReason = "git_worktree_create_pr_ref_unverified";
            prFailureDetail =
              fetchHeadEntry === "absent"
                ? `origin has no ref ${refspec}; a branch, tag or other ref named like it was fetched instead, which is not pull or merge request #${options.prNumber}. Check the number, and that origin is the repository #${options.prNumber} belongs to; if both are right, that ref has to be deleted from origin first.`
                : fetchedFromUrl === undefined
                  ? `the fetch of ${refspec} succeeded, but git did not print the "From <url>" line that says where it fetched from, so the result could not be checked. Run the command again.`
                  : `the fetch succeeded, but FETCH_HEAD does not record ${refspec} from ${fetchedFromUrl}, most likely because another git fetch in this repository overwrote it at the same moment. Run the command again.`;
          }
          if (fetchHeadEntry === null)
            uncheckedRef ??= {
              refspec,
              why:
                fetchedFromUrl === undefined
                  ? "git did not print where it fetched from"
                  : "FETCH_HEAD did not record that fetch",
            };
        }
        continue;
      }
      if (!prFailureDetail)
        prFailureDetail = prFetchStderr || (timedOut ? `the fetch of ${refspec} timed out` : "");
      if (featureValue_CACHED_MAY_BE_STALE && !uncheckedRef && !MISSING_REMOTE_REF_RE.test(prFetchStderr)) {
        let filtered = stripProgressLines(prFetchStderr)
          .split(
            `
`,
          )
          .filter(Boolean);
        let replaced = (
          filtered.find((line) => /^(fatal|error):/i.test(line)) ??
          filtered.at(-1) ??
          ""
        ).replace(/^(fatal|error|warning):\s*/i, "");
        uncheckedRef = {
          refspec,
          why: timedOut
            ? "that fetch timed out"
            : replaced
              ? `that fetch failed: ${replaced}`
              : `that fetch failed with exit status ${prFetchCode}`,
        };
      }
    }
    let chosenRef = fetchedRefs[0];
    if (chosenRef && preferredRef && chosenRef.refspec !== preferredRef) {
      lastFetchCode = 1;
      chosenRef = undefined;
    } else if (chosenRef && fetchedRefs[1] && fetchedRefs[1].sha !== chosenRef.sha) {
      lastFetchCode = 1;
      prFailureReason = "git_worktree_create_pr_ref_ambiguous";
      prFailureDetail = `origin has both ${chosenRef.refspec} and ${fetchedRefs[1].refspec}, at different commits. GitHub and GitHub-compatible servers create only refs/pull/${options.prNumber}/head and GitLab only refs/merge-requests/${options.prNumber}/head, so the other one was pushed to origin, or copied there from another server, and could be mistaken for #${options.prNumber}. Delete from origin the ref your server does not create, then retry.`;
      chosenRef = undefined;
    } else if (chosenRef && uncheckedRef) {
      lastFetchCode = 1;
      prFailureReason = "git_worktree_create_pr_other_ref_unchecked";
      prFailureDetail = `fetched ${chosenRef.refspec}, but could not check whether origin also has ${uncheckedRef.refspec} (${uncheckedRef.why}). Because origin was not recognised as github.com or gitlab.com, both refs are checked before either is used, so that a pushed look-alike cannot be mistaken for #${options.prNumber}. Retry.`;
      chosenRef = undefined;
    }
    if (!chosenRef && lastFetchCode !== 0) {
      logFeatureBad("git_worktree_create", prFailureReason);
      let failureSummary =
        truncateMiddle_2(hideUnsafeText(stripProgressLines(prFailureDetail.trim()), "git's error")) ||
        'it may not exist, the fetch may have timed out, or the repository may not have a remote named "origin"';
      throw Error(
        prFailureReason === "git_worktree_create_pr_fetch_failed"
          ? `Failed to fetch PR/MR #${options.prNumber}: ${failureSummary}`
          : `Cannot use PR/MR #${options.prNumber}: ${failureSummary}`,
      );
    }
    baseSha = chosenRef?.sha ?? null;
    baseBranch = baseSha === null ? "FETCH_HEAD" : `${baseSha}^{commit}`;
  } else {
    let defaultBranch = await getDefaultBranch();
    let gitDir = resolveGitDirs(a)?.gitDir ?? null;
    let branchName = defaultBranch && !defaultBranch.startsWith("-") ? defaultBranch : "HEAD";
    let originRef = `origin/${branchName}`;
    let originRefSha = gitDir ? await resolveRef(gitDir, `refs/remotes/origin/${branchName}`) : null;
    if (originRefSha && gitDir) {
      baseBranch = originRef;
      baseSha = originRefSha;
      let fetchHeadMtime = await stat(join(gitDir, "FETCH_HEAD")).then(
        (stats) => stats.mtimeMs,
        () => 0,
      );
      if (Date.now() - fetchHeadMtime > WORKTREE_STALE_AGE_MS) {
        await execFileNoThrowWithCwd(gitExe(), ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", branchName], {
          cwd: a,
          stdin: "ignore",
          ...(await getGitSshEnv(a)),
          timeout: WORKTREE_GIT_TIMEOUT_MS,
        });
        let ref = await resolveRef(gitDir, `refs/remotes/origin/${branchName}`);
        if (ref) baseSha = ref;
      }
    } else {
      let { code: fetchCode } = await execFileNoThrowWithCwd(
        gitExe(),
        ["fetch", SAFE_UPLOAD_PACK_ARG_2, "origin", branchName],
        {
          cwd: a,
          stdin: "ignore",
          ...(await getGitSshEnv(a)),
        },
      );
      if (fetchCode === 0) {
        baseBranch = originRef;
        baseSha = await resolveWorktreeBaseSha({
          base: `refs/remotes/${originRef}`,
          exactRef: true,
          kind: "origin_default",
          failure: `Failed to resolve base branch "${originRef}"`,
          cwd: a,
          root: a,
        });
      } else {
        logForDebugging(
          `[worktree] fetch of origin/${branchName} failed \u2014 basing worktree on local HEAD`,
          {
            level: "warn",
          },
        );
        baseSha = await resolveHeadAsBase({
          repoRoot: a,
          fromCwd: options?.fromCwd,
          kind: "head_fallback",
        });
        baseBranch = `${baseSha}^{commit}`;
      }
    }
  }
  if (!baseSha)
    baseSha = await resolveWorktreeBaseSha({
      base: baseBranch,
      kind: "fetch_head",
      failure: `Failed to resolve base branch "${baseBranch}"`,
      cwd: a,
      root: a,
    });
  let sparsePaths = getInitialSettings_2().worktree?.sparsePaths;
  let addArgs = ["worktree", "add"];
  if (sparsePaths?.length) addArgs.push("--no-checkout");
  let baseCommit = `${baseSha}^{commit}`;
  addArgs.push("--no-track", options?.isBranchNew ? "-b" : "-B", worktreeBranch, worktreePath, baseCommit);
  let workerArgs = await checkoutWorkersArgs(a);
  let partialClone = await inspectRepoPartialClone(a, null);
  let failure = (
    await explainPartialCloneFailure(a, baseSha, partialClone, async () =>
      sparsePaths?.length
        ? minimalSparseDirs(sparsePaths)
        : (await gitSupportsPartialCloneFetch(a))
          ? readSparseCheckoutConfig(a)
          : null,
    )
  ).failure;
  let partialCloneNote = (repoDir) =>
    failure !== null
      ? `
${failure}`
      : partialClone.inForce
        ? explainOnDemandFetchOff(repoDir, partialClone, baseSha)
        : "";
  await assertWorktreeDirNotSymlink(worktreesDir, worktreePath);
  let filterNeutralizingArgsOrRefusal = await getFilterNeutralizingArgsOrRefusal(a);
  if ("refusal" in filterNeutralizingArgsOrRefusal)
    throw new WorktreeIsolationError(filterNeutralizingArgsOrRefusal.refusal);
  let { code: createCode, stderr: createStderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgsOrRefusal.args, ...workerArgs, ...addArgs],
    {
      cwd: a,
      env: withSafeGitConfig(a, {
        LC_ALL: "C",
        ...partialCloneFetchEnv(partialClone),
      }),
    },
  );
  if (createCode !== 0) {
    logFeatureBad("git_worktree_create", "git_worktree_create_add_failed");
    let addErrorText = stripProgressLines(createStderr);
    if (parseWorktreeAddError(createStderr, worktreeBranch))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" for worktree "${slug}" is already checked out elsewhere in this repository. Pass a different --worktree name.`,
      );
    if (options?.isBranchNew && /^fatal: a branch named .* already exists/im.test(addErrorText))
      throw new WorktreeIsolationError(
        `branch "${worktreeBranch}" already exists, so the numbered name "${slug}" could not be used. The branch was left as it is. Pass a different worktree name.`,
      );
    if (/^fatal: .* already exists/m.test(addErrorText))
      throw new WorktreeIsolationError(
        `worktree "${slug}" already exists at ${hideUnsafePath(worktreePath)} but cannot be reused (${truncateMiddle_2(hideUnsafeText(addErrorText, "git's error"))}). Remove that directory (with \`git worktree remove\` if it's a registered worktree, or by deleting it if it's a stray directory) or pass a different --worktree name.`,
      );
    let addFailureMessage = `Failed to create worktree: ${truncateMiddle_2(hideUnsafeText(addErrorText, "git's error"))}${partialCloneNote(addErrorText)}`;
    if (await readWorktreeHeadSha(worktreePath)) {
      if (
        !(await removeWorktreeRegistration(a, worktreeBranch, worktreePath, {
          onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
          deregisterOnKeep: "ifOwned",
        }))
      )
        throw new WorktreeIsolationError(
          `${addFailureMessage} ${worktreeRegistrationKeptMessage(worktreeBranch)}`,
        );
    }
    throw new WorktreeIsolationError(addFailureMessage);
  }
  let failContainment = async (message, kind) => {
    if (kind === "redirected") {
      logForDebugging(
        `Removed nothing for ${worktreeBranch}: containment failed, so the tree cannot be identified safely`,
        {
          level: "warn",
        },
      );
      throw new WorktreeIsolationError(
        `${message} Nothing was removed: the checkout was written wherever the link at that path pointed at the time, so before removing anything, check the sensitive locations it could have reached, such as .git/hooks (a hook checked out there runs on the next git command) and ~/.claude/skills. ` +
          worktreeRegistrationKeptMessage(worktreeBranch),
      );
    }
    let removed = await removeWorktreeRegistration(a, worktreeBranch, worktreePath, {
      onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
      deregisterOnKeep: "ifOwned",
    });
    throw new WorktreeIsolationError(
      removed ? message : `${message} ${worktreeRegistrationKeptMessage(worktreeBranch)}`,
    );
  };
  try {
    let [realWorktree, realAnchor] = await Promise.all([
      realpath(worktreePath),
      realpath(worktreesDir.anchor),
    ]);
    let expectedPath = join(worktreesDirSpec(worktreesDir, realAnchor).dir, basename(worktreePath));
    if (
      !(await isSamePathIdentity(realWorktree, expectedPath, {
        above: realAnchor,
      }))
    ) {
      logFeatureBad("git_worktree_create", "git_worktree_create_containment_failed");
      await failContainment(
        `Cannot create worktree: ${hideUnsafePath(worktreePath)} resolved to ${describeRepoRelativeLocation(realWorktree, realAnchor)}, which is not the expected worktree location ${hideUnsafePath(expectedPath)}.`,
        "redirected",
      );
    }
  } catch (error) {
    if (error instanceof WorktreeIsolationError) throw error;
    logFeatureBad("git_worktree_create", "git_worktree_create_realpath_failed");
    await failContainment(
      `Cannot create worktree: failed to verify containment of ${hideUnsafePath(worktreePath)}: ${hasUnsafePathGlyphsOrSurrogate(errorMessage(error)) ? "it could not be resolved" : errorMessage(error)}. The path no longer resolves, so the checkout may have been written ` +
        "through a since-removed link to a location outside the repository \u2014 " +
        "check ~/.claude/skills and other sensitive locations for unexpected content.",
      "unresolved",
    );
  }
  if (sparsePaths?.length) {
    let tearDown = async (msg) => {
      await removeWorktreeRegistration(a, worktreeBranch, worktreePath, {
        onlyIfRegisteredAt: await candidateWorktreePaths(worktreesDir, worktreePath),
      });
      await restoreWorktreeConfigExtension(a);
      throw new WorktreeIsolationError(msg);
    };
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--get", "extensions.worktreeConfig"],
          {
            cwd: a,
            env: buildGitEnvForRepo(a),
          },
        )
      ).exitCode === 1
    )
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", CLAUDE_WORKTREE_CONFIG_KEY, "true"],
        {
          cwd: a,
          env: buildGitEnvForRepo(a),
        },
      );
    let filterNeutralizingArgsOrRefusal = await getFilterNeutralizingArgsOrRefusal(worktreePath);
    let sparseArgs =
      "refusal" in filterNeutralizingArgsOrRefusal
        ? await tearDown(filterNeutralizingArgsOrRefusal.refusal)
        : filterNeutralizingArgsOrRefusal.args;
    let { code: sparseCode, stderr: sparseErr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...sparseArgs, ...GIT_SAFE_GLOBAL_ARGS, "sparse-checkout", "set", "--cone", "--", ...sparsePaths],
      {
        cwd: worktreePath,
        env: withSafeGitConfig(worktreePath, partialCloneFetchEnv(partialClone)),
      },
    );
    if (sparseCode !== 0) {
      logFeatureBad("git_worktree_create", "git_worktree_create_sparse_set_failed");
      await tearDown(
        `Failed to configure sparse-checkout: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(sparseErr), "git's error"))}`,
      );
    }
    let workerArgs = await checkoutWorkersArgs(worktreePath);
    let filterNeutralizingArgsOrRefusal_2 = await getFilterNeutralizingArgsOrRefusal(worktreePath);
    let checkoutArgs =
      "refusal" in filterNeutralizingArgsOrRefusal_2
        ? await tearDown(filterNeutralizingArgsOrRefusal_2.refusal)
        : filterNeutralizingArgsOrRefusal_2.args;
    let { code: coCode, stderr: coErr } = await execFileNoThrowWithCwd(
      gitExe(),
      [...checkoutArgs, ...workerArgs, "checkout", "--no-recurse-submodules", "HEAD"],
      {
        cwd: worktreePath,
        env: withSafeGitConfig(worktreePath, {
          ...(partialClone.inForce && {
            LC_ALL: "C",
          }),
          ...partialCloneFetchEnv(partialClone),
        }),
      },
    );
    let partialCloneHit =
      partialClone.inForce && explainOnDemandFetchOff(coErr, partialClone, baseSha) !== "";
    if (coCode !== 0 || partialCloneHit) {
      logFeatureBad("git_worktree_create", "git_worktree_create_sparse_checkout_failed");
      await tearDown(
        coCode !== 0
          ? `Failed to checkout sparse worktree: ${truncateMiddle_2(hideUnsafeText(stripProgressLines(coErr), "git's error"))}${partialCloneNote(coErr)}`
          : `Failed to checkout sparse worktree: git left out files whose contents it could not read, so the new worktree was removed.${partialCloneNote(coErr)}`,
      );
    }
  }
  await writeWorktreeBaseline(worktreePath, baseSha);
  return {
    worktreePath,
    worktreeBranch,
    headCommit: baseSha,
    baseBranch,
    existed: false,
  };
}
//@ chunk-e6aww6q8.js:3625933-3627962 fingerprint = copyWorktreeIncludeFiles (0.781)
/**
 * 按仓库根 .worktreeinclude（gitignore 语法）把被忽略但需要的文件（如 .env）复制到新 worktree。
 */
async function copyWorktreeIncludeFiles(repoRoot, worktreePath) {
  let includeContent;
  try {
    includeContent = await readFile(join(repoRoot, ".worktreeinclude"), "utf-8");
  } catch {
    return [];
  }
  let patterns = includeContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  if (patterns.length === 0) return [];
  let gitignored = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "ls-files", "--others", "--ignored", "--exclude-standard", "--directory"],
    {
      cwd: repoRoot,
      env: buildGitEnvForRepo(repoRoot),
    },
  );
  let entries =
    gitignored.code === 0
      ? gitignored.stdout
          .split(
            `
`,
          )
          .filter((line) => line !== "")
      : [];
  if (entries.length === 0) return [];
  let matcher = micromatch
    .default()
    .add(filterUsableIgnorePatterns(splitNonEmptyLines(includeContent), "worktreeinclude"));
  let collapsedDirs = entries.filter((e) => e.endsWith("/"));
  let files = entries.filter((e) => !e.endsWith("/") && matcher.ignores(e));
  let dirsToExpand = collapsedDirs.filter((dir) => {
    if (
      patterns.some((pattern) => {
        let normalized = pattern.startsWith("/") ? pattern.slice(1) : pattern;
        if (normalized.startsWith(dir)) return true;
        let globIdx = normalized.search(/[*?[]/);
        if (globIdx > 0) {
          let literalPrefix = normalized.slice(0, globIdx);
          if (dir.startsWith(literalPrefix)) return true;
        }
        let normalizedPattern = normalized;
        while (normalizedPattern.startsWith("**/")) normalizedPattern = normalizedPattern.slice(3);
        if (normalizedPattern !== normalized) {
          let firstSegment = firstLineOf(normalizedPattern, "/");
          let globStartIndex = firstSegment.search(/[*?[]/);
          let lower = (globStartIndex === -1 ? firstSegment : firstSegment.slice(0, globStartIndex))
            .replace(/\\/g, "")
            .toLowerCase();
          if (lower.length > 0) {
            let mapped = dir
              .slice(0, -1)
              .split("/")
              .map((dirSegment) => dirSegment.toLowerCase());
            if (
              globStartIndex === -1
                ? mapped.includes(lower)
                : mapped.some((dirSegment) => dirSegment.startsWith(lower))
            )
              return true;
          }
        }
        return false;
      })
    )
      return true;
    if (matcher.ignores(dir.slice(0, -1)) || matcher.ignores(dir)) return true;
    return false;
  });
  if (dirsToExpand.length > 0) {
    let expanded = await execFileNoThrowWithCwd(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "ls-files",
        "--others",
        "--ignored",
        "--exclude-standard",
        "--",
        ...dirsToExpand,
      ],
      {
        cwd: repoRoot,
        env: buildGitEnvForRepo(repoRoot),
      },
    );
    if (expanded.code === 0) {
      for (let line of expanded.stdout
        .split(
          `
`,
        )
        .filter((line) => line !== ""))
        if (matcher.ignores(line)) files.push(line);
    }
  }
  let copied = [];
  let worktreeRealPath;
  try {
    worktreeRealPath = await realpath(worktreePath);
  } catch (error) {
    logForDebugging(
      `Skipping .worktreeinclude copy: realpath(${worktreePath}) failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return copied;
  }
  for (let relativePath of files) {
    let srcPath = join(repoRoot, relativePath);
    let destPath = join(worktreePath, relativePath);
    try {
      if ((await lstat(srcPath)).isSymbolicLink()) {
        logForDebugging(`Skipping symlink in .worktreeinclude: ${relativePath}`, {
          level: "warn",
        });
        continue;
      }
      if (await hasUnsafeAncestor(destPath, worktreeRealPath)) {
        logForDebugging(
          `Skipping .worktreeinclude entry: destination escapes worktree via committed symlink: ${relativePath}`,
          {
            level: "warn",
          },
        );
        continue;
      }
      await mkdir(dirname(destPath), {
        recursive: true,
      });
      await copyIncludedFileSafely(srcPath, destPath);
      copied.push(relativePath);
    } catch (e) {
      logForDebugging(`Failed to copy ${relativePath} to worktree: ${errorMessage(e)}`, {
        level: "warn",
      });
    }
  }
  if (copied.length > 0)
    logForDebugging(`Copied ${copied.length} files from .worktreeinclude: ${copied.join(", ")}`);
  return copied;
}
//@ chunk-e6aww6q8.js:3627962-3628683 layout
async function copyLocalSettingsIntoWorktree(repoRoot, worktreePath, rootDir) {
  if (resolveLocalSettingsStoreRoot(worktreePath, storageRootFor) !== resolve_2(worktreePath)) {
    logForDebugging(
      `Skipping settings.local.json copy into ${worktreePath}: it resolves localSettings to the canonical repo root, so a copy would become a stale, revocation-resurrecting legacy overlay`,
    );
    return;
  }
  let relativeSettingsFilePathForSource = getRelativeSettingsFilePathForSource("localSettings");
  let settingsSourcePath = join(repoRoot, relativeSettingsFilePathForSource);
  try {
    if ((await lstat(settingsSourcePath)).isSymbolicLink()) {
      logForDebugging(`Skipping symlinked settings.local.json: ${settingsSourcePath}`, {
        level: "warn",
      });
      return;
    }
    let settingsDestPath = join(worktreePath, relativeSettingsFilePathForSource);
    if (rootDir == null || (await hasUnsafeAncestor(settingsDestPath, rootDir))) {
      logForDebugging(
        "Skipping settings.local.json copy: destination escapes worktree via committed symlink",
        {
          level: "warn",
        },
      );
      return;
    }
    await mkdir(dirname(settingsDestPath), {
      recursive: true,
    });
    await copyIncludedFileSafely(settingsSourcePath, settingsDestPath);
    logForDebugging(`Copied settings.local.json to worktree: ${settingsDestPath}`);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT")
      logForDebugging(`Failed to copy settings.local.json: ${errorMessage(error)}`, {
        level: "warn",
      });
  }
}
//@ chunk-e6aww6q8.js:3628683-3629223 fingerprint = performPostCreationSetup (0.787)
/**
 * worktree 创建后的设置：复制 settings.local.json、.worktreeinclude 文件、配置的符号链接目录等。
 */
async function performPostCreationSetup(repoRoot, worktreePath) {
  let localSettingsRelativePath = await realpath(worktreePath).catch(() => null);
  await copyLocalSettingsIntoWorktree(repoRoot, worktreePath, localSettingsRelativePath);
  let code = join(repoRoot, ".husky");
  let gitDir = await resolveGitDir(repoRoot);
  let configDir = gitDir ? ((await getCommonDir(gitDir)) ?? gitDir) : null;
  let hooksPathSetting = configDir
    ? await readGitConfigValueAsync(configDir, "core", null, "hooksPath")
    : null;
  let resolvedHooksPath = null;
  if (hooksPathSetting) {
    resolvedHooksPath = isAbsolute(hooksPathSetting)
      ? hooksPathSetting
      : resolve_2(repoRoot, hooksPathSetting);
    if (hooksPathSetting !== resolvedHooksPath) {
      let { code: configCode, stderr: configError } = await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "config", "core.hooksPath", resolvedHooksPath],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath),
        },
      );
      if (configCode === 0)
        logForDebugging(`Configured worktree to use hooks from main repository: ${resolvedHooksPath}`);
      else
        logForDebugging(`Failed to configure hooks path: ${configError}`, {
          level: "error",
        });
    }
  }
  let dirsToSymlink = getInitialSettings_2().worktree?.symlinkDirectories ?? [];
  if (dirsToSymlink.length > 0) await symlinkDirectories(repoRoot, worktreePath, dirsToSymlink);
  await copyWorktreeIncludeFiles(repoRoot, worktreePath);
}
//@ chunk-e6aww6q8.js:3629223-3629610 facade-exports
function parsePRReference(ref) {
  let match = ref.match(/^https?:\/\/[^/]+\/[^/]+\/[^/]+\/pull\/(\d+)\/?(?:[?#].*)?$/i);
  if (match?.[1])
    return {
      number: parseInt(match[1], 10),
      forge: "github",
    };
  let match_2 = ref.match(/^https?:\/\/[^/]+\/[^?#]+\/-\/merge_requests\/(\d+)\/?(?:[?#].*)?$/i);
  if (match_2?.[1])
    return {
      number: parseInt(match_2[1], 10),
      forge: "gitlab",
    };
  let match_3 = ref.match(/^#(\d+)$/);
  if (match_3?.[1])
    return {
      number: parseInt(match_3[1], 10),
      forge: null,
    };
  return null;
}
//@ chunk-e6aww6q8.js:3629610-3629656 layout
function getIsolatedGitExecOptions() {
  return {
    env: getPreSettingsEnvHonoringLiveDeletions(),
    extendEnv: false,
  };
}
//@ chunk-e6aww6q8.js:3629656-3629732 facade-exports = TMUX_COMMAND (1)
/**
 * 检查 tmux 是否可用（tmux -V 退出码 0）。
 */
async function isTmuxAvailable() {
  let { code } = await execFileNoThrowWithCwd("tmux", ["-V"], getIsolatedGitExecOptions());
  return code === 0;
}
//@ chunk-e6aww6q8.js:3629732-3630102 facade-exports = getTmuxInstallInstructions (1)
function getTmuxInstallInstructions() {
  switch (getPlatform()) {
    case "macos":
      return "Install tmux with: brew install tmux";
    case "linux":
    case "wsl":
      return "Install tmux with: sudo apt install tmux (Debian/Ubuntu) or sudo dnf install tmux (Fedora/RHEL)";
    case "windows":
      return "tmux is not natively available on Windows. Consider using WSL or Cygwin.";
    default:
      return "Install tmux using your system package manager.";
  }
}
//@ chunk-e6aww6q8.js:3630102-3630288 facade-exports = createTmuxSessionForWorktree (0.91)
async function createTmuxSessionForWorktree(sessionName, worktreePath) {
  let { code, stderr } = await execFileNoThrowWithCwd(
    "tmux",
    ["new-session", "-d", "-s", sessionName, "-c", worktreePath],
    {
      ...getIsolatedGitExecOptions(),
      useToolMemoryCgroup: false,
    },
  );
  if (code !== 0)
    return {
      created: false,
      error: stderr,
    };
  return {
    created: true,
  };
}
//@ chunk-e6aww6q8.js:3630288-3630382 facade-exports = killTmuxSession (1)
async function killTmuxSession(sessionName) {
  let { code } = await execFileNoThrowWithCwd(
    "tmux",
    ["kill-session", "-t", sessionName],
    getIsolatedGitExecOptions(),
  );
  return code === 0;
}
//@ chunk-e6aww6q8.js:3630382-3630468 layout
var CLAUDE_WORKTREE_LOCK_REASON_PATTERN =
  /^claude (?:agent|session) .{1,255} \(pid (\d{1,10})(?: start (.{1,255}))?\)$/;
//@ chunk-e6aww6q8.js:3630468-3630530 facade-exports
function claudeWorktreeLockPid(input) {
  let match = input?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  return match ? Number(match[1]) : null;
}
//@ chunk-e6aww6q8.js:3630530-3630650 layout
async function isLockHeldByLiveOtherProcess(reason) {
  let match = reason?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  let lockPid = Number(match[1]);
  if (lockPid === process.pid || !isProcessRunning_2(lockPid)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:3630650-3630773 layout
async function isLockHeldByLiveSameStartProcess(reason) {
  let match = reason?.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  let lockPid = Number(match[1]);
  return (
    lockPid !== process.pid && isProcessRunning_2(lockPid) && (await isSameProcessAsync(lockPid, match[2]))
  );
}
//@ chunk-e6aww6q8.js:3630773-3630862 facade-exports
async function mayReleaseWorktreeLock(reason) {
  if (reason === undefined) return true;
  if (!CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(reason)) return false;
  return !(await isLockHeldByLiveOtherProcess(reason));
}
//@ chunk-e6aww6q8.js:3630862-3631053 facade-exports
async function releaseOwnWorktreeLock(worktreePath, repoRoot) {
  try {
    if (await mayReleaseWorktreeLock(await readWorktreeLockReason(worktreePath, repoRoot)))
      await unlockAgentWorktree(worktreePath, repoRoot);
  } catch (error) {
    logForDebugging(
      `[worktree] left the lock on ${worktreePath} \u2014 cannot read the worktree registry to verify ownership (${errorMessage(error)})`,
    );
  }
}
//@ chunk-e6aww6q8.js:3631053-3631345 facade-exports
async function readWorktreeLockReason(a, b) {
  let resolvedPath = resolve_2(await realpath(a).catch(() => a));
  let foldedPath = comparablePath(resolvedPath, "everyPlatform");
  let foldedMatch;
  for (let worktree of await listRegisteredWorktrees(b)) {
    let resolvedWorktreePath = resolve_2(
      await realpath(worktree.worktreePath).catch(() => worktree.worktreePath),
    );
    if (resolvedWorktreePath === resolvedPath) return worktree.lockReason;
    if (foldedMatch === undefined && comparablePath(resolvedWorktreePath, "everyPlatform") === foldedPath)
      foldedMatch = {
        lockReason: worktree.lockReason,
      };
  }
  return foldedMatch?.lockReason;
}
//@ chunk-e6aww6q8.js:3631345-3633066 facade-exports
/**
 * 用 git worktree lock --reason 'claude <agent|session> <id> (pid N start T)' 给 worktree 加锁，标明持有进程，供陈旧锁清理判断。
 */
async function lockClaudeWorktree(a, b, worktreePath, ownerKind) {
  try {
    let procStart = procIdentityFields(await ownProcStartAsync()).procStart;
    let lockReason = procStart
      ? `claude ${ownerKind} ${worktreePath} (pid ${process.pid} start ${procStart})`
      : `claude ${ownerKind} ${worktreePath} (pid ${process.pid})`;
    let writeLock = async () => {
      if (
        !readFlagWithOverride("tengu_mighty_sprout", {
          safe: true,
        })
      )
        return execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "worktree", "lock", "--reason", lockReason, a],
          {
            cwd: b,
            env: buildGitEnvForRepo(b),
          },
        );
      try {
        let gitDirs = resolveGitDirs(b);
        let gitDirs_2 = resolveGitDirs(a);
        if (
          gitDirs === null ||
          gitDirs_2 === null ||
          gitDirs_2.workTree === null ||
          gitDirs_2.gitDir === gitDirs_2.commonDir ||
          gitDirs_2.commonDir !== gitDirs.commonDir
        ) {
          logFeatureSad("git_worktree_create", "git_worktree_lock_unvetted");
          return {
            code: 1,
            stderr: `no lock marker written: could not confirm from the .git files of this worktree and ${b} that this is a linked worktree of that repository`,
          };
        }
        await writeNewFile(
          join(gitDirs.commonDir, "worktrees", basename(gitDirs_2.gitDir), "locked"),
          `${lockReason}
`,
        );
        return {
          code: 0,
          stderr: "",
        };
      } catch (error) {
        switch (getErrnoCode(error)) {
          case "EEXIST":
            break;
          case "EACCES":
          case "EPERM":
          case "EROFS":
            logFeatureSad("git_worktree_create", "git_worktree_lock_entry_unwritable");
            break;
          default:
            logFeatureSad("git_worktree_create", "git_worktree_lock_create_failed");
        }
        return {
          code: 1,
          stderr: errorMessage(error),
        };
      }
    };
    let lockResult = await writeLock();
    if (lockResult.code === 0) return true;
    let lockReason_2;
    try {
      lockReason_2 = await readWorktreeLockReason(a, b);
    } catch (error) {
      logForDebugging(
        `[worktree] failed to lock ${ownerKind} worktree ${a} and could not read the registry (${errorMessage(error)}); treating this session as a guest`,
      );
      return false;
    }
    if (lockReason_2 === undefined) {
      logForDebugging(`[worktree] failed to lock ${ownerKind} worktree ${a}: ${lockResult.stderr.trim()}`);
      return true;
    }
    if (
      !CLAUDE_WORKTREE_LOCK_REASON_PATTERN.test(lockReason_2) ||
      (await isLockHeldByLiveOtherProcess(lockReason_2))
    ) {
      logForDebugging(
        `[worktree] ${a} is already locked (${lockReason_2 || "no reason"}); leaving the existing lock in place \u2014 this session is a guest, not the owner`,
      );
      return false;
    }
    if (Number(lockReason_2.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN)?.[1]) === process.pid) return true;
    await unlockAgentWorktree(a, b);
    let relockResult = await writeLock();
    if (relockResult.code !== 0)
      logForDebugging(
        `[worktree] failed to re-lock ${ownerKind} worktree ${a} after clearing a stale lock: ${relockResult.stderr.trim()}`,
      );
    return true;
  } catch (error) {
    logForDebugging(`[worktree] failed to lock ${ownerKind} worktree ${a}: ${errorMessage(error)}`);
    return true;
  }
}
//@ chunk-e6aww6q8.js:3633066-3636445 facade-exports = createWorktreeForSession (0.402)
/**
 * --worktree 启动：要求已信任工作区，校验 slug；配置了 WorktreeCreate hook 时用 hook 返回的目录（拒绝点段路径与符号链接祖先），否则 getOrCreateWorktree，随后复制 .worktreeinclude 文件、settings.local.json 并可创建 tmux 会话。
 */
async function createWorktreeForSession(sessionId, slug, tmuxSessionName, options) {
  refuseUnavailableWorktree("a worktree");
  if (!checkHasTrustDialogAccepted())
    throw Error(
      "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    );
  validateWorktreeSlug(slug);
  let fromCwd = options.fromCwd ?? getCwd();
  let originalCwd = getOriginalCwd();
  let worktreeSession;
  let hookWorktree = dispatchesWorktreeCreate()
    ? await executeWorktreeCreateHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        slug,
        {
          storageV5: options.storageV5,
          credentials: options.credentials,
        },
      ).catch((error) => {
        if (!findGitRoot(fromCwd)) {
          markIsolationUnavailableForCwd(fromCwd);
          logFeatureBad("git_worktree_create", "hook_failed_not_git_repo");
        }
        throw error;
      })
    : undefined;
  if (hookWorktree) {
    {
      if (hasDotSegment(hookWorktree.worktreePath)) {
        logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
        throw new WorktreeIsolationError(
          `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${hookWorktree.worktreePath}). The ` +
            "symlink screen cannot verify a dotted spelling \u2014 have the " +
            "hook emit a normalized (dot-free) absolute path and retry.",
        );
      }
      for (let gitRoot of new Set(
        [findCanonicalGitRoot(fromCwd), findGitRoot(fromCwd)].filter((root) => Boolean(root)),
      )) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(
          hookWorktree.worktreePath,
          gitRoot,
        );
        if (symlinkInWorktreeAncestry) {
          logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
          throw new WorktreeIsolationError(
            `Cannot use the WorktreeCreate hook's worktree: ${symlinkInWorktreeAncestry.component} ` +
              (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
              "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
          );
        }
      }
    }
    logForDebugging(`Created hook-based worktree at: ${hookWorktree.worktreePath}`);
    worktreeSession = {
      originalCwd: fromCwd,
      preEnterOriginalCwd: originalCwd,
      worktreePath: hookWorktree.worktreePath,
      worktreeName: slug,
      sessionId,
      tmuxSessionName,
      hookBased: true,
    };
  } else {
    let repoRoot = options.repoRoot ?? findCanonicalGitRoot(fromCwd);
    if (!repoRoot) {
      logFeatureBad("git_worktree_create", "git_worktree_create_not_git_repo");
      throw new WorktreeIsolationError(
        "Cannot create a worktree: not in a git repository and no WorktreeCreate hooks are configured. Configure WorktreeCreate/WorktreeRemove hooks in settings.json to use worktree isolation with other VCS systems.",
      );
    }
    let originalBranch = await getBranch();
    let slugChoice =
      options.slugPick === undefined
        ? {
            slug,
            number: undefined,
          }
        : await allocateWorktreeSlug(repoRoot, slug, options.slugPick);
    validateWorktreeSlug(slugChoice.slug);
    if (slugChoice.number === 0) {
      logFeatureBad("git_worktree_create", "git_worktree_create_no_numbered_name");
      throw new WorktreeIsolationError(
        `no name from "${slug}" to "${suffixWorktreeSlug(slug, MAX_WORKTREE_SLUG_RETRIES)}" could be used for a new worktree: each is a name this session has already used, is held by a folder or a branch, or is one that Claude Code keeps for itself. Nothing was changed. Pass a different worktree name.`,
      );
    }
    let createStart = Date.now();
    let created = await getOrCreateWorktree(repoRoot, worktreesDirSpecs(repoRoot), slugChoice.slug, {
      ...options,
      isBranchNew: (slugChoice.number ?? 0) >= 2,
    });
    let { worktreePath, worktreeBranch, headCommit, existed } = created;
    let refreshed = created.existed ? created.refreshed : undefined;
    let creationDurationMs;
    if (existed)
      logForDebugging(
        refreshed
          ? `Reset existing worktree to the current base at: ${worktreePath}`
          : `Resuming existing worktree at: ${worktreePath}`,
      );
    else {
      logForDebugging(`Created worktree at: ${worktreePath} on branch: ${worktreeBranch}`);
      await performPostCreationSetup(repoRoot, worktreePath);
      creationDurationMs = Date.now() - createStart;
    }
    let lockHeld = await lockClaudeWorktree(worktreePath, repoRoot, slugChoice.slug, "session");
    let madeElsewhere = created.existed && created.madeElsewhere;
    worktreeSession = {
      originalCwd: fromCwd,
      preEnterOriginalCwd: originalCwd,
      worktreePath,
      worktreeName: slugChoice.slug,
      slugNumber: slugChoice.number,
      worktreeBranch,
      originalBranch,
      originalHeadCommit: headCommit,
      sessionId,
      tmuxSessionName,
      creationDurationMs,
      enteredExisting: lockHeld && !madeElsewhere ? undefined : true,
      madeElsewhere: madeElsewhere ? "resumedByName" : undefined,
      resumedExisting: existed || undefined,
      resetToFreshBase: refreshed || undefined,
      usedSparsePaths: (getInitialSettings_2().worktree?.sparsePaths?.length ?? 0) > 0,
    };
  }
  let isolationCheck = await checkWorktreeIsolation(
    worktreeSession.worktreePath,
    [],
    gitRootsForPath(fromCwd, options.repoRoot),
  );
  if (!isolationCheck.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(isolationCheck.message);
  }
  if (worktreeSession.hookBased) {
    let hookWorktreeHead = await getHookWorktreeHead(worktreeSession.worktreePath, fromCwd);
    if (hookWorktreeHead !== undefined) worktreeSession.originalChangeset = hookWorktreeHead;
  }
  persistWorktreeSession(worktreeSession, options.storageV5);
  logFeatureOk("git_worktree_create");
  return worktreeSession;
}
//@ chunk-e6aww6q8.js:3636445-3637534 facade-exports
/**
 * git worktree list --porcelain 并解析每个 worktree 的路径、分支与锁原因；可要求先确认 git 目录可信。
 */
async function listRegisteredWorktrees(a, { vetted: pinned } = {}) {
  let runList = async (separatorArg) => {
    let gitTarget =
      pinned === undefined
        ? {
            env: buildGitEnvForRepo(a),
          }
        : await verifyPinnedGitDir(pinned, resolveGitDirsOrPlaceholder(a));
    if ("refused" in gitTarget)
      throw Error(
        "git was not run: the repository's git directory could not be confirmed as the one whose worktree registrations were checked",
      );
    return execFileNoThrow(
      gitExe(),
      [
        ...GIT_SAFE_GLOBAL_ARGS,
        "-C",
        a,
        ...(pinned === undefined ? [] : ["--git-dir", pinned.gitDir]),
        "worktree",
        "list",
        "--porcelain",
        ...(separatorArg === null ? [] : [separatorArg]),
      ],
      {
        timeout: 1e4,
        env: gitTarget.env,
      },
    );
  };
  let supportsZ = await gitSupportsPartialCloneFetch(a);
  let listResult = await runList(supportsZ ? "-z" : null);
  let lineSeparator = supportsZ
    ? "\x00"
    : `
`;
  let { code, stdout, stderr, error } = listResult;
  if (code !== 0) {
    let trimmed = stderr.trim();
    let message = `\`git -C ${a} worktree list\` failed: ${trimmed || (error !== undefined ? errorMessage(error) : "") || `exit ${code}`}`;
    if (trimmed === "" && error !== undefined && /premature close\s*$/i.test(error))
      throw new WorktreeGitTransientError(message);
    throw Error(message);
  }
  let entries = [];
  let current = null;
  for (let line of stdout.split(lineSeparator))
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = {
        worktreePath: line.slice(9),
      };
    } else if (line.startsWith("branch ") && current)
      current.worktreeBranch = line.slice(7).replace(/^refs\/heads\//, "");
    else if ((line === "locked" || line.startsWith("locked ")) && current)
      current.lockReason = line.slice(6).trim();
    else if ((line === "prunable" || line.startsWith("prunable ")) && current) current.prunable = true;
  if (current) entries.push(current);
  return entries;
}
//@ chunk-e6aww6q8.js:3637534-3637607 layout
function isNetworkOrOutsidePath(path, cwd) {
  let normalized = win32.normalize(path);
  return (
    isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true) || isOnForeignMount(path, cwd)
  );
}
//@ chunk-e6aww6q8.js:3637607-3637675 layout
function isNetworkOrUnsafePath(path) {
  let normalized = win32.normalize(path);
  return (
    isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true) || isNetworkMountPath(path)
  );
}
//@ chunk-e6aww6q8.js:3637675-3638308 facade-exports
async function listRepoWorktrees(a) {
  let canonicalGitRoot = findCanonicalGitRoot(a);
  if (canonicalGitRoot === null) return {};
  let registered = await listRegisteredWorktrees(canonicalGitRoot).catch(() => null);
  if (registered === null) return null;
  let realRoot;
  try {
    realRoot = identity(await realpath(canonicalGitRoot));
  } catch {
    return null;
  }
  let worktreesByName = {};
  for (let entry of registered.slice(1)) {
    let slug = basename(entry.worktreePath);
    let worktreeBranch = entry.worktreeBranch ?? "";
    if (
      entry.prunable === true ||
      !slug ||
      /\s/.test(slug) ||
      CONTROL_CHAR_RE.test(entry.worktreePath) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(slug) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(worktreeBranch) ||
      isEphemeralWorktreeSlug(slug) ||
      isNetworkOrUnsafePath(entry.worktreePath) ||
      containsPathTraversal(entry.worktreePath) ||
      entry.worktreePath.split(/[/\\]/).some((segment) => /^\.\.[ .]*$/.test(segment)) ||
      worktreesByName[slug] !== undefined
    )
      continue;
    let realWorktree;
    try {
      realWorktree = identity(await realpath(entry.worktreePath));
    } catch {
      continue;
    }
    if (
      isNetworkOrUnsafePath(realWorktree) ||
      !(await isPathUnderIdentity(realRoot, realWorktree, {
        strictly: true,
      })) ||
      CONTROL_OR_FORMAT_CHAR_RE.test(realWorktree.slice(realRoot.length))
    )
      continue;
    worktreesByName[slug] = {
      path: realWorktree,
      branch: worktreeBranch,
    };
  }
  return worktreesByName;
}
//@ chunk-e6aww6q8.js:3638308-3638367 layout
function isWindowsUncPath(path) {
  return getPlatform() === "windows" && /^[\\/]{2}/.test(path);
}
//@ chunk-e6aww6q8.js:3638367-3641891 facade-exports
/**
 * 校验要进入的 worktree 路径：拒绝 UNC/网络自动挂载路径，要求位于本仓库 .claude/worktrees/ 下并属于同一 git 仓库。
 */
async function resolveExistingWorktreeTarget(a, { requireManagedLocation, requireCwdInsideRepo = false }) {
  let normalized = win32.normalize(a);
  if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${a} is a UNC network path.`);
  let cwd = getCwd();
  if (isForeignMountPath(a, cwd) || isForeignMountPath(resolve_2(cwd, a), cwd))
    throw new WorktreeIsolationError(`Cannot enter worktree: ${a} is a network automount path.`);
  let canonicalGitRoot = findCanonicalGitRoot(cwd);
  let workingCopyRoot = canonicalGitRoot === null ? getWorkingCopyRootFallback(cwd) : null;
  let repoRoot = canonicalGitRoot ?? workingCopyRoot?.workingCopyRoot;
  if (!repoRoot)
    throw new WorktreeIsolationError(
      "Cannot enter an existing worktree: the current directory is not in a git repository.",
    );
  let realTarget;
  let realRepoRoot;
  let realCwd;
  try {
    realTarget = await realpath(resolve_2(cwd, a));
    realRepoRoot = await realpath(repoRoot);
    realCwd = await realpath(cwd);
  } catch (error) {
    throw new WorktreeIsolationError(`Cannot enter worktree: ${a}: ${errorMessage(error)}`);
  }
  let targetUncHost = uncHostOf(realTarget);
  if (
    (isWindowsUncPath(realTarget) || containsVulnerableUncPath(realTarget, true)) &&
    (targetUncHost === null ||
      /^[\\/]{2}[?.][\\/]/.test(realTarget) ||
      (targetUncHost !== uncHostOf(realRepoRoot) && targetUncHost !== uncHostOf(realCwd)))
  )
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${a} resolves to a UNC network path (${realTarget}).`,
    );
  if (isForeignMountPath(realTarget, realRepoRoot) && isForeignMountPath(realTarget, realCwd))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${a} resolves to a network automount path (${realTarget}).`,
    );
  if (realTarget === realRepoRoot) {
    let mainTreeMessage = `Cannot enter worktree: ${a} is the main working tree, not a linked worktree.`;
    throw new WorktreeIsolationError(mainTreeMessage);
  }
  if (realTarget === realCwd)
    throw new WorktreeIsolationError(`Cannot enter worktree: ${a} is the current working directory.`);
  if (false) {
    if (workingCopyRoot !== null) {
      if (!("wcRoot" in lt))
        switch (lt.refusal) {
          case "session-untrusted":
          case "not-a-working-copy-root":
          case "not-a-worktree":
          case "other-checkout":
          case "no-answer":
        }
    }
  }
  if (requireCwdInsideRepo) {
    let cwdInsideCheckout = await isPathUnderIdentity(realRepoRoot, realCwd, {
      foldOn: "everyPlatform",
      strictly: true,
    });
    let cwdIsRoot =
      !cwdInsideCheckout &&
      (await isSamePathIdentity(realCwd, realRepoRoot, {
        foldOn: "everyPlatform",
      }));
    if (!cwdInsideCheckout)
      throw new WorktreeIsolationError(
        cwdIsRoot
          ? `Cannot enter worktree: the current working directory ${cwd} is the repository root, not an isolated worktree \u2014 switching is only available to sessions whose working directory is inside a worktree of this repository.`
          : `Cannot enter worktree: the current working directory ${cwd} is not inside the repository at ${repoRoot}.`,
      );
  }
  if (requireManagedLocation) {
    let dir = candidateWorktreeDirs(realRepoRoot)[0].dir;
    let realManagedDir;
    try {
      realManagedDir = await realpath(dir);
    } catch {
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} does not exist, so ${a} cannot be a worktree managed by Claude Code.`,
      );
    }
    if (!(await isSamePathIdentity(realManagedDir, dir)))
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${dir} resolves to ${realManagedDir}; the managed worktrees directory must not be a symlink.`,
      );
    if (
      !(await isPathUnderIdentity(dir, realTarget, {
        strictly: true,
      }))
    )
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${a} is not under ${dir}. Switching from this session is limited to worktrees managed by Claude Code (created under .claude/worktrees/ of this repository).`,
      );
    let worktreesGitDir = join(realRepoRoot, ".git", "worktrees");
    let gitDir = await resolveGitDir_2(realTarget);
    let realGitDir = null;
    let realBackPointer = null;
    if (gitDir)
      try {
        realGitDir = await realpath(gitDir);
        if (pointerFileIsSuspect(join(realGitDir, "gitdir"), realGitDir))
          throw Error("gitdir back-link is a symlink");
        let trimmed = (await readFile(join(realGitDir, "gitdir"), "utf-8")).trim();
        if (
          !isOnForeignMount(trimmed, realTarget) &&
          !rawPointerPathIsUnsafe(trimmed, realGitDir, realTarget)
        )
          realBackPointer = await realpath(resolve_2(realGitDir, trimmed));
      } catch {}
    if (
      !realGitDir ||
      !realBackPointer ||
      !(await isSamePathIdentity(dirname(realGitDir), worktreesGitDir, {
        foldOn: "everyPlatform",
      })) ||
      !(await isSamePathIdentity(realBackPointer, join(realTarget, ".git"), {
        foldOn: "everyPlatform",
        kind: "file",
      }))
    )
      throw new WorktreeIsolationError(
        `Cannot enter worktree: ${a} is not a linked worktree of ${repoRoot}.`,
      );
  }
  let canonicalGitRoot_2 = findCanonicalGitRoot(realTarget);
  let realOwnerRoot = null;
  if (canonicalGitRoot_2 !== null && isLinkedWorktree(realTarget))
    try {
      realOwnerRoot = await realpath(canonicalGitRoot_2);
    } catch {}
  let repoOwnerRoot =
    realOwnerRoot !== null && realOwnerRoot.startsWith(realRepoRoot + sep) ? realOwnerRoot : repoRoot;
  let ownerRepoRoot = repoOwnerRoot === repoRoot ? realRepoRoot : repoOwnerRoot;
  let registered = await listRegisteredWorktrees(repoOwnerRoot);
  let registration;
  for (let entry of registered)
    try {
      if ((await realpath(entry.worktreePath)) === realTarget) {
        registration = entry;
        break;
      }
    } catch {}
  if (!registration)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${a} is not a registered worktree of ${repoOwnerRoot}. Run 'git -C ${repoOwnerRoot} worktree list' to see registered worktrees.`,
    );
  if (registration.prunable)
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${a} is marked prunable by git (its directory or administrative files are missing or broken).`,
    );
  if (await isLockHeldByLiveSameStartProcess(registration.lockReason))
    throw new WorktreeIsolationError(
      `Cannot enter worktree: ${a} belongs to another running Claude Code session (locked: ${printableNameOrPlaceholder(registration.lockReason ?? "")}). Wait for that session to finish or choose a different worktree.`,
    );
  return {
    worktreePath: realTarget,
    worktreeBranch: registration.worktreeBranch,
    ownerRepoRoot,
  };
}
//@ chunk-e6aww6q8.js:3641891-3642776 facade-exports
async function enterExistingWorktreeForSession(sessionId, path, options) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  let originalCwd = currentWorktreeSession?.originalCwd ?? getCwd();
  let preEnterCwd =
    currentWorktreeSession?.preEnterOriginalCwd ?? currentWorktreeSession?.originalCwd ?? getOriginalCwd();
  let { worktreePath, worktreeBranch, ownerRepoRoot } = await resolveExistingWorktreeTarget(path, {
    requireManagedLocation: options.requireManagedLocation ?? currentWorktreeSession != null,
  });
  let nestedRepoRoot = ownerRepoRoot;
  try {
    let canonicalGitRoot = findCanonicalGitRoot(preEnterCwd);
    if (canonicalGitRoot !== null && (await realpath(canonicalGitRoot)) === ownerRepoRoot)
      nestedRepoRoot = undefined;
  } catch {}
  let isolationCheck = await checkWorktreeIsolation(
    worktreePath,
    [],
    gitRootsForPath(preEnterCwd, ownerRepoRoot),
  );
  if (!isolationCheck.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(isolationCheck.message);
  }
  let currentRealPath =
    currentWorktreeSession && isOwnedWorktreeSession(currentWorktreeSession)
      ? await realpath(currentWorktreeSession.worktreePath).catch(() => currentWorktreeSession.worktreePath)
      : undefined;
  if (currentWorktreeSession && currentRealPath !== undefined && worktreePath !== currentRealPath)
    await releaseOwnWorktreeLock(
      currentWorktreeSession.worktreePath,
      resolveWorktreeCwdForRemoval(currentWorktreeSession.originalCwd, currentWorktreeSession.worktreePath),
    );
  let madeElsewhere =
    worktreePath === currentRealPath && currentWorktreeSession?.madeElsewhere
      ? currentWorktreeSession.madeElsewhere
      : (await isWorktreeMadeElsewhere(worktreePath))
        ? "enteredByPath"
        : undefined;
  let worktreeSession = {
    originalCwd,
    preEnterOriginalCwd: preEnterCwd,
    worktreePath,
    worktreeName: basename(worktreePath),
    worktreeBranch,
    sessionId,
    enteredExisting: true,
    madeElsewhere,
    nestedRepoRoot,
    liveLaunchAnchor: currentWorktreeSession?.liveLaunchAnchor,
  };
  persistWorktreeSession(worktreeSession, options.storageV5);
  return worktreeSession;
}
//@ chunk-e6aww6q8.js:3642776-3643394 facade-exports
async function resolveManagedWorktreePath(path) {
  try {
    let normalized = win32.normalize(path);
    if (isWindowsUncPath(normalized) || containsVulnerableUncPath(normalized, true)) return null;
    let cwd = getCwd();
    if (isForeignMountPath(path, cwd) || isForeignMountPath(resolve_2(cwd, path), cwd)) return null;
    let canonicalGitRoot = findCanonicalGitRoot(cwd);
    let repoRoot = canonicalGitRoot ?? null?.workingCopyRoot;
    if (!repoRoot) return null;
    let realTarget = await realpath(resolve_2(cwd, path));
    let realRepoRoot = await realpath(repoRoot);
    let realCwd = await realpath(cwd);
    let targetUncHost = uncHostOf(realTarget);
    if (
      (isWindowsUncPath(realTarget) || containsVulnerableUncPath(realTarget, true)) &&
      (targetUncHost === null ||
        /^[\\/]{2}[?.][\\/]/.test(realTarget) ||
        (targetUncHost !== uncHostOf(realRepoRoot) && targetUncHost !== uncHostOf(realCwd)))
    )
      return null;
    if (isForeignMountPath(realTarget, realRepoRoot) && isForeignMountPath(realTarget, realCwd)) return null;
    if (canonicalGitRoot === null)
      return {
        targetReal: realTarget,
        managed: false,
      };
    for (let { dir } of candidateWorktreeDirs(realRepoRoot)) {
      let realDir = await realpath(dir).catch(() => null);
      if (
        realDir !== null &&
        (await isSamePathIdentity(realDir, dir)) &&
        (await isPathUnderIdentity(dir, realTarget, {
          strictly: true,
        }))
      )
        return {
          targetReal: realTarget,
          managed: true,
        };
    }
    return {
      targetReal: realTarget,
      managed: false,
    };
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:3643394-3643572 facade-exports
async function isPathUnderManagedWorktreesDir(path) {
  try {
    let canonicalGitRoot = findCanonicalGitRoot(getCwd());
    if (!canonicalGitRoot) return false;
    return candidateWorktreeDirs(await realpath(canonicalGitRoot)).some(({ dir }) =>
      comparablePath(path, "foldingPlatforms").startsWith(comparablePath(dir, "foldingPlatforms") + sep),
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3643572-3643640 layout
function resolveWorktreeCwdForRemoval(originalCwd, worktreePath) {
  if (!hasUntouchableRecordSpelling(originalCwd)) return originalCwd;
  return worktreeLocationOf(worktreePath)?.checkout ?? homedir();
}
//@ chunk-e6aww6q8.js:3643640-3644074 facade-exports = keepWorktree (0.829)
/**
 * 保留 worktree（退出时选择保留），解除本进程的锁。
 */
async function keepWorktree(storageV5) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (!currentWorktreeSession) return;
  try {
    let { worktreePath, originalCwd, worktreeBranch } = currentWorktreeSession;
    let worktreeCwdForRemoval = resolveWorktreeCwdForRemoval(originalCwd, worktreePath);
    let storage = findGitRoot(worktreeCwdForRemoval) ?? worktreeCwdForRemoval;
    try {
      processChdir(worktreeCwdForRemoval);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while keeping worktree: ${error}`);
    }
    if (isOwnedWorktreeSession(currentWorktreeSession)) await releaseOwnWorktreeLock(worktreePath, storage);
    persistWorktreeSession(null, storageV5);
    logForDebugging(
      `Linked worktree preserved at: ${worktreePath}${worktreeBranch ? ` on branch: ${worktreeBranch}` : ""}`,
    );
    logForDebugging(`You can continue working there by running: cd ${worktreePath}`);
  } catch (error) {
    logForDebugging(`Error keeping worktree: ${error}`, {
      level: "error",
    });
  }
}
//@ chunk-e6aww6q8.js:3644074-3647459 facade-exports = cleanupWorktree (0.347)
/**
 * 退出时清理会话 worktree：无改动则 git worktree remove 并删除分支，有改动保留并提示；hook 创建的走 WorktreeRemove hook。
 */
async function cleanupWorktree(storageV5, credentials) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (!currentWorktreeSession) return true;
  try {
    let { worktreePath, originalCwd, worktreeBranch, hookBased } = currentWorktreeSession;
    let worktreeCwdForRemoval = resolveWorktreeCwdForRemoval(originalCwd, worktreePath);
    let repoRootForRemoval = findGitRoot(worktreeCwdForRemoval) ?? worktreeCwdForRemoval;
    try {
      processChdir(worktreeCwdForRemoval);
    } catch (error) {
      logForDebugging(`Could not chdir to original directory while cleaning up worktree: ${error}`);
    }
    if (currentWorktreeSession.enteredExisting) {
      if (isOwnedWorktreeSession(currentWorktreeSession))
        await releaseOwnWorktreeLock(worktreePath, repoRootForRemoval);
      persistWorktreeSession(null, storageV5);
      return true;
    }
    let removedByHook = false;
    if (hookBased) {
      let hookResult = await executeWorktreeRemoveHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        worktreePath,
        {
          storageV5,
          credentials,
        },
      );
      switch (hookResult.kind) {
        case "removed":
          removedByHook = true;
          logForDebugging(`Removed hook-based worktree at: ${worktreePath}`);
          break;
        case "not_configured":
          logForDebugging(
            `No WorktreeRemove hook configured; falling back to removing the git worktree at: ${worktreePath}`,
          );
          break;
        case "failed":
          logForDebugging(`WorktreeRemove hook ${hookResult.summary}; kept worktree at: ${worktreePath}`, {
            level: "warn",
          });
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
      }
    }
    if (!removedByHook) {
      let lockReason;
      try {
        lockReason = await readWorktreeLockReason(worktreePath, repoRootForRemoval);
      } catch (error) {
        if (
          await lstat(worktreePath).then(
            () => true,
            () => false,
          )
        ) {
          logForDebugging(
            `cleanupWorktree: kept ${worktreePath} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
            {
              level: "warn",
            },
          );
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
        }
        logForDebugging(
          `cleanupWorktree: worktree registry unreadable and ${worktreePath} is already gone (${errorMessage(error)}); continuing to the already-removed path`,
        );
      }
      if (!(await mayReleaseWorktreeLock(lockReason))) {
        logForDebugging(
          `cleanupWorktree: kept ${worktreePath} \u2014 locked by another live Claude Code process, or with a reason we did not write (${lockReason || "no reason"})`,
          {
            level: "warn",
          },
        );
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      await unlockAgentWorktree(worktreePath, repoRootForRemoval);
      let worktreeLocation = hookBased ? null : worktreeLocationOf(worktreePath);
      let normalizedWorktreePath = stripTrailingSeparators(worktreePath);
      let repoRootForWorktreePath = getRepoRootForWorktreePath(normalizedWorktreePath);
      if (worktreeLocation === null && hasDotSegment(normalizedWorktreePath)) {
        logForDebugging(`Kept worktree \u2014 ${worktreePath} carries a dot segment`, {
          level: "warn",
        });
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      let normalizedPath = normalize(normalizedWorktreePath);
      let normalizedCwd = stripTrailingSeparators(normalize(worktreeCwdForRemoval));
      let ancestorRoots = [];
      let gitRoot = findGitRoot(worktreeCwdForRemoval);
      while (gitRoot !== null) {
        ancestorRoots.push(gitRoot);
        let parentDir = dirname(gitRoot);
        let parentRoot = parentDir === gitRoot ? null : findGitRoot(parentDir);
        gitRoot =
          parentRoot !== null &&
          parentRoot.length < gitRoot.length &&
          gitRoot.startsWith(parentRoot.endsWith(sep) ? parentRoot : parentRoot + sep)
            ? parentRoot
            : null;
      }
      let sorted = [
        ...new Set(
          [findCanonicalGitRoot(worktreeCwdForRemoval), ...ancestorRoots]
            .filter((root) => root !== null)
            .map((root) => stripTrailingSeparators(normalize(root))),
        ),
        normalizedCwd,
      ].sort((left, right) => left.length - right.length);
      let normalizedRepoRoot =
        repoRootForWorktreePath === null ? null : stripTrailingSeparators(normalize(repoRootForWorktreePath));
      let any = sorted.some((root) =>
        normalizePathKey(normalizedPath).startsWith(normalizePathKey(root) + sep),
      );
      let found = sorted.find((current) => normalizedPath.startsWith(current + sep));
      let anchorRoot =
        repoRootForWorktreePath !== null &&
        normalizedRepoRoot !== null &&
        (found === undefined ? !any : found.startsWith(normalizedRepoRoot + sep))
          ? repoRootForWorktreePath
          : found;
      let linkVerdict =
        worktreeLocation !== null
          ? "clear"
          : await symlinkVerdictForPath(
              anchorRoot === repoRootForWorktreePath ? normalizedWorktreePath : normalizedPath,
              anchorRoot !== undefined
                ? anchorRoot === repoRootForWorktreePath && found === undefined
                  ? dirname(anchorRoot)
                  : anchorRoot
                : any
                  ? undefined
                  : dirname(normalizedPath),
            );
      if (linkVerdict !== "clear" && linkVerdict !== "missing") {
        logForDebugging(`Kept linked worktree \u2014 ${worktreePath} is a link, or cannot be probed`, {
          level: "warn",
        });
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      let skipReparseCheck = false;
      if (hookBased && getPlatform() === "windows") {
        let registered = await listRegisteredWorktrees(repoRootForRemoval).catch(() => null);
        if (registered != null) {
          skipReparseCheck = true;
          let realWorktree = await realpath(worktreePath).catch(() => worktreePath);
          for (let entry of registered)
            if (realWorktree === (await realpath(entry.worktreePath).catch(() => entry.worktreePath))) {
              skipReparseCheck = false;
              break;
            }
        }
      }
      let removed;
      let stderrText = "";
      if (worktreeLocation !== null)
        removed = await removeWorktreeRegistration(
          worktreeLocation.checkout,
          worktreeBranch ?? basename(worktreePath),
          worktreePath,
          {
            byPathIn: worktreeLocation.home,
            deregisterOnKeep: false,
            dropIfStopped: true,
          },
        );
      else if (linkVerdict === "missing")
        removed =
          (
            await pruneWorktreeRegistration(
              findCanonicalGitRoot(repoRootForRemoval) ?? repoRootForRemoval,
              normalizedWorktreePath,
            )
          ).outcome === "dropped";
      else {
        if (!skipReparseCheck && !(await clearReparsePoints(normalizedWorktreePath))) {
          logForDebugging(`Kept linked worktree \u2014 unremovable reparse point in ${worktreePath}`, {
            level: "warn",
          });
          clearResumeHintWorktree();
          persistWorktreeSession(null, storageV5);
          return false;
        }
        let safeRemoval = await removeWorktreeSafely(repoRootForRemoval, normalizedWorktreePath, {
          resolveAboveParent: true,
        });
        if (safeRemoval.outcome === "unanchored") {
          let forceResult = await execFileNoThrowWithCwd(
            gitExe(),
            [...GIT_SAFE_GLOBAL_ARGS, "worktree", "remove", "--force", normalizedWorktreePath],
            {
              cwd: repoRootForRemoval,
              env: buildGitEnvForRepo(repoRootForRemoval),
            },
          );
          removed = forceResult.code === 0;
          stderrText = forceResult.stderr;
        } else {
          removed = safeRemoval.outcome === "removed";
          stderrText = removed ? "" : worktreeRemovalText(safeRemoval);
        }
      }
      if (
        !removed &&
        (await lstat(worktreePath).then(
          () => true,
          () => false,
        ))
      ) {
        logForDebugging(
          `Failed to remove linked worktree, kept ${worktreePath}${stderrText.trim() ? `: ${stderrText.trim()}` : ""}`,
          {
            level: "warn",
          },
        );
        clearResumeHintWorktree();
        persistWorktreeSession(null, storageV5);
        return false;
      }
      logForDebugging(`Removed linked worktree at: ${worktreePath}`);
      await restoreWorktreeConfigExtension(repoRootForRemoval);
    }
    clearResumeHintWorktree();
    persistWorktreeSession(null, storageV5);
    if (!hookBased && worktreeBranch) {
      await sleep(100);
      await deleteWorktreeBranch(repoRootForRemoval, worktreeBranch, {
        logSuccess: true,
      });
    }
    logForDebugging("Linked worktree cleaned up completely");
    return true;
  } catch (error) {
    logForDebugging(`Error cleaning up worktree: ${error}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3647459-3647914 layout
async function assertWorktreeDirExists(worktreePath, fromHook) {
  let isDirectory = false;
  try {
    isDirectory = (await stat(worktreePath)).isDirectory();
  } catch {}
  if (!isDirectory) {
    logFeatureBad("git_worktree_create", "git_worktree_create_path_missing");
    throw new WorktreeIsolationError(
      fromHook
        ? `WorktreeCreate hook returned a path that is not a directory: ${worktreePath}. The hook must create the directory before echoing its path.`
        : `Worktree directory does not exist at ${worktreePath} after creation. ` +
            "Refusing to launch agent in parent repo \u2014 check for concurrent worktree cleanup or filesystem errors.",
    );
  }
}
//@ chunk-e6aww6q8.js:3647914-3650083 facade-exports = createAgentWorktree (0.429)
/**
 * 为子代理创建隔离 worktree（slug 形如 agent-a<hex>），优先 WorktreeCreate hook，否则在 .claude/worktrees 下创建并加锁。
 */
async function createAgentWorktree(slug, options) {
  validateWorktreeSlug(slug);
  refuseUnavailableWorktree("agent worktree");
  let hookWorktree = dispatchesWorktreeCreate()
    ? await executeWorktreeCreateHook(
        {
          id: getSessionId(),
          project: {
            originalCwd: getOriginalCwd(),
            projectRoot: getProjectRoot(),
          },
        },
        slug,
        {
          storageV5: options?.storageV5,
          credentials: options?.credentials,
        },
      )
    : undefined;
  if (hookWorktree) {
    if (hasDotSegment(hookWorktree.worktreePath)) {
      logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
      throw new WorktreeIsolationError(
        `Cannot use the WorktreeCreate hook's worktree: the hook emitted a path with dot segments (${hookWorktree.worktreePath}). The ` +
          "symlink screen cannot verify a dotted spelling \u2014 have the " +
          "hook emit a normalized (dot-free) absolute path and retry.",
      );
    }
    let fromCwd = options?.fromCwd ?? getCwd();
    for (let gitRoot of new Set(
      [findCanonicalGitRoot(fromCwd), findGitRoot(fromCwd)].filter((root) => Boolean(root)),
    )) {
      let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(hookWorktree.worktreePath, gitRoot);
      if (symlinkInWorktreeAncestry) {
        logFeatureBad("git_worktree_create", "git_worktree_create_hook_ancestry_rejected");
        throw new WorktreeIsolationError(
          `Cannot use the WorktreeCreate hook's worktree: ${symlinkInWorktreeAncestry.component} ` +
            (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink. " : "could not be verified. ") +
            "A repository-committed symlink below the checkout root could redirect the worktree outside the repository. Remove the symlink (or emit a path outside the repository) and retry.",
        );
      }
    }
    await assertWorktreeDirExists(hookWorktree.worktreePath, true);
    logForDebugging(`Created hook-based agent worktree at: ${hookWorktree.worktreePath}`);
    let isolationCheck = await checkWorktreeIsolation(
      hookWorktree.worktreePath,
      [],
      gitRootsForPath(fromCwd),
    );
    if (!isolationCheck.ok) {
      logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
      throw new WorktreeIsolationError(isolationCheck.message);
    }
    let revParseResult = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD"],
      {
        cwd: hookWorktree.worktreePath,
        env: buildGitEnvForRepo(hookWorktree.worktreePath),
      },
    );
    let headSha = revParseResult.code === 0 ? revParseResult.stdout.trim() : undefined;
    let hookHead =
      headSha === undefined ? await getHookWorktreeHead(hookWorktree.worktreePath, fromCwd) : undefined;
    logFeatureOk("git_worktree_create");
    return {
      worktreePath: hookWorktree.worktreePath,
      hookBased: true,
      headCommit: headSha,
      ...(headSha === undefined && {
        sessionDir: fromCwd,
      }),
      ...(hookHead !== undefined && {
        baseChangeset: hookHead,
      }),
    };
  }
  let fromCwd = options?.fromCwd ?? getCwd();
  let gitRoot = findCanonicalGitRoot(fromCwd);
  if (!gitRoot) throwAgentWorktreeNotGitRefusal();
  let { worktreePath, worktreeBranch, headCommit, existed } = await getOrCreateWorktree(
    gitRoot,
    getWorktreesDirSpec(gitRoot),
    slug,
    {
      fromHead: options?.fromHead,
      fromCwd,
    },
  );
  if (!existed) {
    logForDebugging(`Created agent worktree at: ${worktreePath} on branch: ${worktreeBranch}`);
    await performPostCreationSetup(gitRoot, worktreePath);
  } else logForDebugging(`Resuming existing agent worktree at: ${worktreePath}`);
  await lockClaudeWorktree(worktreePath, gitRoot, slug, "agent");
  await assertWorktreeDirExists(worktreePath, false);
  let reason = await checkWorktreeIsolation(worktreePath, [], gitRootsForPath(fromCwd, gitRoot));
  if (!reason.ok) {
    logFeatureBad("git_worktree_create", "git_worktree_create_root_rejected");
    throw new WorktreeIsolationError(reason.message);
  }
  logFeatureOk("git_worktree_create");
  return {
    worktreePath,
    worktreeBranch,
    headCommit,
    gitRoot,
  };
}
//@ chunk-e6aww6q8.js:3650083-3650375 layout
async function isNestedInOtherRepo(path) {
  if (resolveGitDirs(path) !== null) return false;
  let topLevelResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--show-toplevel"],
    {
      cwd: path,
      env: getRemoteHostSessionCount(),
    },
  );
  let trimmed = topLevelResult.stdout.trim();
  if (topLevelResult.code !== 0 || !trimmed) return false;
  let resolvedTopLevel = resolve_2(await realpath(trimmed).catch(() => trimmed));
  let resolvedPath = resolve_2(await realpath(path).catch(() => path));
  if (resolvedTopLevel === resolvedPath) return false;
  return getPlatform() === "windows" ? foldCaseBasic(resolvedTopLevel) !== foldCaseBasic(resolvedPath) : true;
}
//@ chunk-e6aww6q8.js:3650375-3651154 facade-exports = hasWorktreeChanges (0.49)
/**
 * worktree 是否 dirty 以及相对创建提交领先的提交数。
 */
async function getAgentWorktreeChanges(worktreePath, baselineCommit, r) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  if (filterNeutralizingArgs === null)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: await isGitDirMissing(worktreePath),
    };
  let statusResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath, undefined, {
        userLocale: true,
      }),
    },
  );
  if (statusResult.code !== 0)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: true,
    };
  let submoduleReport = await inspectSubmodules(worktreePath);
  let submoduleChange = submoduleChanges(submoduleReport);
  let dirty = statusResult.stdout.trim().length > 0 || submoduleChange !== undefined;
  let trackedChanges =
    hasNonIgnoredChanges(statusResult.stdout) ||
    submoduleReport.kind === "unverifiable" ||
    submoduleReport.withTrackedChanges.length > 0;
  if (!baselineCommit)
    return {
      dirty,
      trackedChanges,
      commitsAhead: 0,
      ...(submoduleChange !== undefined && {
        submoduleWork: submoduleChange,
      }),
    };
  let countResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--count", `${baselineCommit}..HEAD`],
    {
      cwd: worktreePath,
      env: buildGitEnvForRepo(worktreePath),
    },
  );
  if (countResult.code !== 0)
    return {
      dirty: true,
      trackedChanges: true,
      commitsAhead: 0,
      gitError: true,
    };
  return {
    dirty,
    trackedChanges,
    commitsAhead: parseInt(countResult.stdout.trim(), 10) || 0,
    ...(submoduleChange !== undefined && {
      submoduleWork: submoduleChange,
    }),
  };
}
//@ chunk-e6aww6q8.js:3651154-3651185 layout
async function getHookWorktreeHead(worktreePath, fromCwd) {
  return;
}
//@ chunk-e6aww6q8.js:3651185-3651213 layout
function getWorkingCopyRootFallback(cwd) {
  return null;
}
//@ chunk-e6aww6q8.js:3651213-3651253 facade-exports
async function getWorkingCopyWorktreeChanges(worktreePath, originalChangeset, originalCwd, s) {
  return null;
}
//@ chunk-e6aww6q8.js:3651253-3651332 layout
function hasNonIgnoredChanges(stdout) {
  return stdout
    .split(
      `
`,
    )
    .some((line) => line.length > 0 && !line.startsWith("??"));
}
//@ chunk-e6aww6q8.js:3651332-3651419 facade-exports
async function unlockAgentWorktree(worktreePath, repoRoot) {
  await execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "worktree", "unlock", worktreePath], {
    cwd: repoRoot,
    env: buildGitEnvForRepo(repoRoot),
  });
}
//@ chunk-e6aww6q8.js:3651419-3651488 placement
function runGitInWorktree(a, b) {
  return execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, ...b], {
    cwd: a,
    env: buildGitEnvForRepo(a, TRACE_ENV_VARS),
  });
}
//@ chunk-e6aww6q8.js:3651656-3651830 sole-consumer
async function isLocalBranchMissing(worktreePath, worktreeBranch) {
  let refResult = await runGitInWorktree(worktreePath, [
    "for-each-ref",
    "--count=1",
    "--format=%(refname)",
    `refs/heads/${worktreeBranch}`,
  ]);
  return refResult.code === 0 && refResult.stdout.trim() === "" && refResult.stderr.trim() === "";
}
//@ chunk-e6aww6q8.js:3651830-3652603 sole-consumer
/**
 * 判断 worktree 当前 HEAD 状态（its_branch/another_branch/detached/unreadable）及相对创建时提交的新增提交数，退出 worktree 时决定是否提示保留。
 */
async function getWorktreeBranchState({ worktreePath, worktreeBranch, originalHeadCommit, hookBased }) {
  if (hookBased || !worktreeBranch) return null;
  let branchRef = `refs/heads/${worktreeBranch}`;
  let headResult = await runGitInWorktree(worktreePath, ["symbolic-ref", "-q", "HEAD"]);
  let [, headBranch] = /^refs\/heads\/(.+)$/.exec(headResult.stdout.replace(/\r?\n$/, "")) ?? [];
  let isDetached =
    headResult.exitCode === 1 && headResult.stdout.trim() === "" && headResult.stderr.trim() === "";
  if (headBranch === undefined && !isDetached)
    return {
      head: "unreadable",
      commits: null,
    };
  if (
    headBranch !== undefined &&
    headBranch !== worktreeBranch &&
    foldPathCase(headBranch) === foldPathCase(worktreeBranch)
  )
    return {
      head: "like_its_branch",
      commits: null,
    };
  let baselineCommit = originalHeadCommit;
  if (headBranch === worktreeBranch)
    return {
      head: "its_branch",
      commits: baselineCommit
        ? await hasUnpushedCommits_2(worktreePath, [branchRef], [baselineCommit])
        : null,
    };
  if (headBranch !== undefined) {
    let commits = baselineCommit
      ? ((await hasUnpushedCommits_2(
          worktreePath,
          [branchRef],
          [`refs/heads/${headBranch}`, baselineCommit],
        )) ?? ((await isLocalBranchMissing(worktreePath, worktreeBranch)) ? 0 : null))
      : null;
    return {
      head: "another_branch",
      branch: headBranch,
      commits,
    };
  }
  return {
    head: "detached",
    commits: baselineCommit
      ? ((await hasUnpushedCommits_2(worktreePath, [branchRef, "HEAD"], [baselineCommit])) ??
        ((await isLocalBranchMissing(worktreePath, worktreeBranch))
          ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [baselineCommit])
          : null))
      : null,
  };
}
//@ chunk-e6aww6q8.js:3652603-3652841 facade-exports
function describeWhereCommitsAre(a, b, c) {
  switch (a.head) {
    case "another_branch":
    case "like_its_branch":
      return `on ${b} that ${c} doesn't have`;
    case "detached":
      return `on ${b} or at the detached HEAD`;
    case "its_branch":
    case "unreadable":
    case "not_read":
      return `on ${b}`;
  }
}
//@ chunk-e6aww6q8.js:3652841-3653222 facade-exports
async function countCommitsAtStake(a, b) {
  let { worktreePath, originalHeadCommit } = a;
  let branchState =
    b ||
    readFlagWithOverride("tengu_wary_ladle", {
      safe: true,
    })
      ? await getWorktreeBranchState(a)
      : null;
  if (branchState === null)
    return {
      head: "not_read",
      commits: originalHeadCommit
        ? await hasUnpushedCommits_2(worktreePath, ["HEAD"], [originalHeadCommit])
        : null,
    };
  if (b || branchState.head !== "another_branch" || branchState.commits !== 0) return branchState;
  let keptBranchCommits = originalHeadCommit
    ? await hasUnpushedCommits_2(worktreePath, [`refs/heads/${branchState.branch}`], [originalHeadCommit])
    : null;
  return keptBranchCommits === 0
    ? branchState
    : {
        head: branchState.head,
        branch: branchState.branch,
        commits: 0,
        onKeptBranch: keptBranchCommits,
      };
}
//@ chunk-e6aww6q8.js:3653222-3653505 layout
async function deleteWorktreeBranch(a, b, c) {
  let { code, stderr } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "branch", "-D", "--end-of-options", b],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  if (code !== 0) {
    logForDebugging(`${c?.errorLabel ?? "Could not delete worktree branch"}: ${stderr}`, {
      level: "error",
    });
    return false;
  }
  if (c?.logSuccess) logForDebugging(`Deleted worktree branch: ${b}`);
  return true;
}
//@ chunk-e6aww6q8.js:3653505-3653770 facade-exports
/**
 * worktree 已不存在的 git 错误正则，以及 worktree 清理时的几类摘要文案（解析变化、文件未核对、无法删除的重解析点）。
 */
var WORKTREE_GONE_RE =
  /is not a working tree|validation failed|not a git repository: .*[\\/]\.git[\\/]worktrees[\\/]/;
var IDENTITY_CHANGED_SUMMARY = "resolution changed since ownership verification";
var UNCHECKED_FILES_SUMMARY = "has files that were not checked against a repository";
var UNREMOVABLE_REPARSE_SUMMARY = "unremovable reparse point in the worktree";
//@ chunk-e6aww6q8.js:3653770-3653847 facade-exports
function carriesDiscardConsent(consent) {
  return consent === "job_delete_force" || consent === "job_delete_force_remove";
}
//@ chunk-e6aww6q8.js:3653847-3653976 facade-exports
function repositoryVouchedByWorktree(dir) {
  let resolvedDir = identity(resolve_2(dir));
  let gitRootUncached = findGitRootUncached(dir);
  if (gitRootUncached === null || identity(resolve_2(gitRootUncached)) !== resolvedDir) return null;
  let canonicalGitRootUncached = findCanonicalGitRootUncached(dir);
  return canonicalGitRootUncached !== null && identity(resolve_2(canonicalGitRootUncached)) !== resolvedDir
    ? canonicalGitRootUncached
    : null;
}
//@ chunk-e6aww6q8.js:3653976-3654790 facade-exports
async function worktreeDeregisteredByRemoval(a, b) {
  let gitDir = await resolveGitDir_2(a);
  if (gitDir === null) return false;
  let adminDirName = basename(gitDir);
  if (adminDirName === "" || adminDirName === "." || adminDirName === "..") return false;
  let commonDirResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-common-dir"],
    {
      cwd: b,
      env: buildGitEnvForRepo(b),
    },
  );
  let trimmed = commonDirResult.stdout.trim();
  if (commonDirResult.code !== 0 || !trimmed) return false;
  let commonDir = resolve_2(b, trimmed);
  let realCommonDir = await realpath(commonDir).catch(() => commonDir);
  let pathsEqual = (left, right) =>
    getPlatform() === "windows" ? foldCaseBasic(left) === foldCaseBasic(right) : left === right;
  let adminDir = dirname(gitDir);
  if (
    !pathsEqual(adminDir, join(commonDir, "worktrees")) &&
    !pathsEqual(adminDir, join(realCommonDir, "worktrees"))
  )
    return false;
  try {
    await lstat(join(realCommonDir, "worktrees", adminDirName));
    return false;
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return false;
  }
  let pinned = await vetWorktreeRegistration(b);
  if (!pinned.ok) return false;
  let registered = await listRegisteredWorktrees(b, {
    vetted: pinned,
  }).catch(() => null);
  if (registered === null) return false;
  for (let entry of registered) {
    if (pathsEqual(resolve_2(entry.worktreePath), a)) return false;
    if (isNetworkOrUnsafePath(entry.worktreePath)) continue;
    let realWorktree;
    try {
      realWorktree = await realpath(entry.worktreePath);
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return false;
      continue;
    }
    if (!isNetworkOrUnsafePath(realWorktree) && pathsEqual(realWorktree, a)) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:3654875-3658413 sole-consumer
/**
 * 不经 git 直接删除 agent worktree 目录（无仓库根 / hook 创建 / 强制删除三条路径）：必须是绝对、本地、无可疑链接、身份未变且直接位于 .claude/worktrees 下；
 * 强制删除时还要核对 .git 形态。记 tengu_worktree_removed 埋点，返回 {outcome, errorSummary?}。
 */
async function removeWorktreeDirWithoutGit(
  worktreePath,
  source,
  { vettedReal, via: lane = "no_root", forced = false, changedFiles = 0 } = {},
) {
  let refuse = (reason) => {
    logForDebugging(
      `removeAgentWorktree: refused ${forced ? "forced" : "no-root"} removal of ${worktreePath} \u2014 ${reason}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: reason,
    };
  };
  let finish = (outcome) => {
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: outcome === "deleted_forced" ? changedFiles : 0,
      commits: 0,
      ...(lane === "hook" && {
        hook_based: true,
      }),
      ...((outcome === "deleted_no_root" || (outcome === "already_gone" && lane === "no_root")) && {
        no_root: 1,
      }),
      ...(outcome === "already_gone" && {
        already_gone: 1,
      }),
      ...(outcome === "deleted_forced" && {
        forced_rm: 1,
      }),
    });
    return outcome === "deleted_forced"
      ? {
          outcome: "removed",
          forcedDirectoryRemoval: {},
        }
      : {
          outcome: "removed",
        };
  };
  if (!isAbsolute(worktreePath)) return refuse("path is not absolute");
  let cwd = getCwd();
  let isOutside = (path) => isNetworkOrOutsidePath(path, cwd);
  if (isOutside(worktreePath)) return refuse("network path (UNC or automount)");
  if (hasDotSegment(worktreePath)) return refuse("unverifiable symlinked ancestor");
  let path = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
    surfaceNetworkRaw: true,
    anchor: cwd,
  });
  if (path === UNVERIFIED_ANCESTRY) return refuse("unverifiable symlinked ancestor");
  if (path !== undefined && isOutside(path)) return refuse("network path (UNC or automount)");
  if (path !== undefined && hasDotSegment(path)) return refuse("unverifiable symlinked ancestor");
  let stats;
  try {
    stats = await lstat(worktreePath);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR")
      return refuse(`cannot stat the directory (${getErrnoCode(error) ?? "unknown error"})`);
    logForDebugging(
      lane === "no_root"
        ? `removeAgentWorktree: ${worktreePath} already gone and no git root resolves \u2014 nothing left to remove`
        : `removeAgentWorktree: ${worktreePath} already gone \u2014 nothing left to remove (${lane} lane)`,
    );
    return finish("already_gone");
  }
  if (!stats.isDirectory()) return refuse("not a directory");
  let path_2 = await realpath(worktreePath).catch(() => null);
  if (path_2 === null) return refuse("could not canonicalize the path");
  if (isOutside(path_2)) return refuse("network path (UNC or automount)");
  if (vettedReal !== undefined && path_2 !== vettedReal) return refuse(IDENTITY_CHANGED_SUMMARY);
  if (!isDirectlyUnderClaudeWorktreesDir(path_2))
    return refuse(
      "it isn't directly under a .claude/worktrees directory, so it is never deleted automatically",
    );
  if (forced) {
    let gitEntryKind;
    try {
      let gitEntryStats = await lstat(join(path_2, ".git"));
      gitEntryKind = gitEntryStats.isDirectory()
        ? "directory"
        : gitEntryStats.isFile()
          ? "file"
          : "unverifiable";
    } catch (error) {
      gitEntryKind = isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? "none" : "unverifiable";
    }
    switch (gitEntryKind) {
      case "file":
        break;
      case "directory":
        return refuse(
          "it is a standalone git repository, and deleting it would destroy the only copy of its history",
        );
      case "none":
        return refuse(
          "it has no .git file of its own linking it to a repository, so it is never deleted by force",
        );
      case "unverifiable":
        return refuse("its .git entry couldn't be verified");
    }
  } else if ((await findGitRootVerifyingPositive(path_2)) !== null)
    return refuse("still resolves to a repository");
  let entries = await readdir(path_2).catch(() => null);
  if (entries === null) return refuse("unreadable directory");
  if (!forced && entries.length > 0 && !carriesDiscardConsent(source)) {
    logForDebugging(
      `removeAgentWorktree: kept rootless ${worktreePath} \u2014 ${entries.length} unverifiable file(s); only an explicit discard may remove them`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: 0,
      commits: 0,
      no_root: 1,
      aborted: 1,
    });
    return {
      outcome: "failed",
      errorSummary: UNCHECKED_FILES_SUMMARY,
      needsForce: true,
    };
  }
  if ((await realpath(path_2).catch(() => null)) !== path_2) return refuse(IDENTITY_CHANGED_SUMMARY);
  if (!(await clearReparsePoints(path_2))) {
    logForDebugging(
      `removeAgentWorktree: aborted ${source} removal \u2014 unremovable reparse point in ${worktreePath}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: UNREMOVABLE_REPARSE_SUMMARY,
    };
  }
  if ((await realpath(path_2).catch((error) => (isENOENT(error) ? path_2 : null))) !== path_2)
    return refuse(IDENTITY_CHANGED_SUMMARY);
  let worktreeEntries = forced ? await resolveGitDir_2(path_2) : null;
  try {
    if (forced) {
      for (let entry of entries)
        if (entry !== ".git")
          await rm_2(join(path_2, entry), {
            recursive: true,
            force: true,
          });
    }
    await rm_2(path_2, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    if (worktreeEntries !== null) await restoreWorktreeGitPointer(path_2, worktreeEntries, stats);
    logForDebugging(`removeAgentWorktree: could not delete ${worktreePath}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      outcome: "failed",
      errorSummary: `the directory could not be deleted (${getErrnoCode(error) ?? "unknown error"})`,
      ...(forced && {
        forceRemovable: "rm_failed",
      }),
    };
  }
  logForDebugging(
    forced
      ? `Removed agent worktree by force (${lane} lane) at: ${worktreePath}`
      : `Removed agent worktree with no git root at: ${worktreePath}`,
  );
  return finish(forced ? "deleted_forced" : "deleted_no_root");
}
//@ chunk-e6aww6q8.js:3658413-3658678 sole-consumer
async function compareInodeIdentity(a, b) {
  let [statsA, statsB] = await Promise.all([
    stat(a, {
      bigint: true,
    }).catch(() => null),
    stat(b, {
      bigint: true,
    }).catch(() => null),
  ]);
  if (
    statsA === null ||
    statsB === null ||
    !hasInode(statsA.ino) ||
    !hasInode(statsB.ino) ||
    statsA.dev === 0n ||
    statsB.dev === 0n
  )
    return "unknown";
  return statsA.dev === statsB.dev && statsA.ino === statsB.ino ? "same" : "different";
}
//@ chunk-e6aww6q8.js:3658678-3659510 sole-consumer
/**
 * 计算存储路径的真实身份路径：在仓库根下直接拼接；经祖先链接进入时按 inode 找到对应祖先；若从外部链接进入仓库则拒绝（inside_root）。
 */
async function resolveWorktreeIdentity(storedPath, repoRoot) {
  let normalizedPath = stripTrailingSeparators(normalize(storedPath));
  let ancestors = [];
  for (let ancestor = dirname(normalizedPath); dirname(ancestor) !== ancestor; ancestor = dirname(ancestor))
    ancestors.push(ancestor);
  if (repoRoot !== undefined) {
    let normalizedRoot = stripTrailingSeparators(normalize(repoRoot));
    let realRoot = await realpath(normalizedRoot).catch(() => null);
    if (realRoot === null)
      return {
        refused: "unreadable",
      };
    let realRootPath = stripTrailingSeparators(realRoot);
    if (normalizedPath.startsWith(normalizedRoot + sep))
      return {
        identity: realRootPath + normalizedPath.slice(normalizedRoot.length),
      };
    let matchingAncestor = null;
    for (let ancestor of ancestors) {
      let inodeVerdict = await compareInodeIdentity(ancestor, realRootPath);
      if (inodeVerdict === "unknown")
        return {
          refused: "unreadable",
        };
      if (inodeVerdict === "same") matchingAncestor = ancestor;
    }
    if (matchingAncestor !== null)
      return {
        identity: realRootPath + normalizedPath.slice(matchingAncestor.length),
      };
    let firstResolvedAncestor = null;
    for (let ancestor of ancestors) {
      let resolvedAncestor = await realpath(ancestor).catch(() => null);
      if (resolvedAncestor === null)
        return {
          refused: "unreadable",
        };
      firstResolvedAncestor ??= resolvedAncestor;
      for (
        let resolvedPath = stripTrailingSeparators(resolvedAncestor);
        dirname(resolvedPath) !== resolvedPath;
        resolvedPath = dirname(resolvedPath)
      ) {
        let inodeVerdict = await compareInodeIdentity(resolvedPath, realRootPath);
        if (inodeVerdict !== "different")
          return {
            refused: inodeVerdict === "same" ? "inside_root" : "unreadable",
          };
      }
    }
    return firstResolvedAncestor === null
      ? {
          refused: "unreadable",
        }
      : {
          identity: join(firstResolvedAncestor, basename(normalizedPath)),
        };
  }
  let realParent = await realpath(dirname(normalizedPath)).catch(() => null);
  return realParent === null
    ? {
        refused: "unreadable",
      }
    : {
        identity: join(realParent, basename(normalizedPath)),
      };
}
//@ chunk-e6aww6q8.js:3659510-3662869 sole-consumer
/**
 * 强制删除 agent worktree：身份必须与核验一致、.git 必须链接到该仓库，已跟踪文件需无改动（git status 校验），再删除目录并处理分支。失败返回 {outcome:"failed", errorSummary}。
 */
async function forceRemoveAgentWorktree(
  worktreePath,
  vettedIdentity,
  repoRoot,
  { via, source, changedFiles = 0, keptBranch },
) {
  let worktreeIdentity = await resolveWorktreeIdentity(worktreePath, repoRoot);
  if ("refused" in worktreeIdentity) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 ${worktreeIdentity.refused === "inside_root" ? "the stored path reaches into the repository through a link from outside it" : "the directory at the stored path could not be identified"}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        worktreeIdentity.refused === "inside_root"
          ? "the path reaches into the repository through a link from outside it, so nothing was deleted by force; remove the link or the directory by hand"
          : "the directory at this path could not be identified, so nothing was deleted by force; remove it by hand",
    };
  }
  if (vettedIdentity !== worktreeIdentity.identity) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 the vetted identity is not the stored path's own`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        "the directory that was checked is not the one at this path, so nothing was deleted by force; retry, or remove the link or the directory by hand",
    };
  }
  let vouchedRoot = repositoryVouchedByWorktree(vettedIdentity);
  let stillSameRepo =
    repoRoot !== undefined &&
    vouchedRoot !== null &&
    (await realpath(vouchedRoot).catch(() => vouchedRoot)) ===
      (await realpath(repoRoot).catch(() => repoRoot));
  if (
    repoRoot === undefined ||
    (!stillSameRepo && !(await worktreeDeregisteredByRemoval(vettedIdentity, repoRoot)))
  ) {
    logForDebugging(
      `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 its .git does not link it to ${repoRoot ?? "any repository"}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary:
        "its own .git doesn't link it to the repository it would be pruned from, so it is never deleted by force",
    };
  }
  let branchToKeep = keptBranch;
  if (stillSameRepo) {
    let filterNeutralizingArgs = await getFilterNeutralizingArgs(vettedIdentity);
    let env = buildGitEnvForRepo(vettedIdentity, undefined, {
      userLocale: true,
    });
    let statusResult = filterNeutralizingArgs
      ? await execFileNoThrowWithCwd(
          gitExe(),
          [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
          {
            cwd: vettedIdentity,
            env,
          },
        )
      : null;
    if (statusResult === null || statusResult.code !== 0) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 git status failed, cannot verify tracked files are unchanged`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary:
          "its tracked files couldn't be checked for uncommitted changes (git status failed there)",
      };
    }
    if (hasNonIgnoredChanges(statusResult.stdout)) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 uncommitted changes to tracked files`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary: "it has uncommitted changes to tracked files, so it is never deleted by force",
      };
    }
    let submoduleReport = await inspectSubmodules(vettedIdentity);
    let submoduleChange =
      submoduleReport.kind === "unverifiable"
        ? submoduleReport
        : submoduleReport.withTrackedChanges.length > 0
          ? {
              kind: "changes",
              paths: submoduleReport.withTrackedChanges,
            }
          : undefined;
    if (submoduleChange !== undefined) {
      logForDebugging(
        `removeAgentWorktree: refused forced removal of ${worktreePath} \u2014 submodule work unverified or uncommitted`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "failed",
        errorSummary: `${submoduleChange.kind === "changes" ? "it has uncommitted " : ""}${describeSubmoduleChanges(submoduleChange)}, so it is never deleted by force`,
      };
    }
    let path = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
      {
        cwd: vettedIdentity,
        env,
      },
    );
    if (path.code === 0 && path.stdout.trim()) branchToKeep = path.stdout.trim();
  } else
    logForDebugging(
      `removeAgentWorktree: ${worktreePath} is no longer registered with ${repoRoot} though its own .git still names it \u2014 deleting it as asked, nothing left to verify its contents against`,
      {
        level: "warn",
      },
    );
  let worktreesDir = await removeWorktreeDirWithoutGit(worktreePath, source, {
    vettedReal: vettedIdentity,
    via,
    forced: true,
    changedFiles,
  });
  if (worktreesDir.outcome !== "removed") return worktreesDir;
  let pruneResult = await pruneWorktreeRegistration(repoRoot, [worktreePath, vettedIdentity]);
  if (pruneResult.outcome !== "dropped")
    logForDebugging(
      `removeAgentWorktree: the registration of ${worktreePath} in ${repoRoot} was not dropped after the forced removal (${pruneResult.outcome === "kept" ? pruneResult.reason : "no registration names it"})`,
      {
        level: "warn",
      },
    );
  await restoreWorktreeConfigExtension(repoRoot);
  return worktreesDir.forcedDirectoryRemoval !== undefined &&
    branchToKeep !== undefined &&
    (
      await execFileNoThrowWithCwd(
        gitExe(),
        [...GIT_SAFE_GLOBAL_ARGS, "show-ref", "--verify", "--quiet", `refs/heads/${branchToKeep}`],
        {
          cwd: repoRoot,
          env: buildGitEnvForRepo(repoRoot),
        },
      )
    ).code === 0
    ? {
        outcome: "removed",
        forcedDirectoryRemoval: {
          keptBranch: branchToKeep,
        },
      }
    : worktreesDir;
}
//@ chunk-e6aww6q8.js:3662869-3670830 facade-exports
async function removeAgentWorktree(
  worktreePath,
  worktreeBranch,
  repoRoot,
  hookBased,
  source = "unknown",
  vettedIdentity,
  extraRoot,
  { storageV5, credentials, forceRemoveRequested = false, keepsWorktreesInside } = {},
) {
  if (hookBased) {
    if (
      !isAbsolute(worktreePath) ||
      hasDotSegment(worktreePath) ||
      isNetworkOrOutsidePath(worktreePath, getCwd())
    )
      return removeWorktreeDirWithoutGit(worktreePath, source, {
        vettedReal: vettedIdentity,
        via: "hook",
      });
    let removalTarget = worktreePath;
    if (vettedIdentity !== undefined) {
      let cwd = getCwd();
      let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
        surfaceNetworkRaw: true,
        anchor: cwd,
      });
      if (
        deepestExistingAncestor === UNVERIFIED_ANCESTRY ||
        (deepestExistingAncestor !== undefined &&
          (isNetworkOrOutsidePath(deepestExistingAncestor, cwd) || hasDotSegment(deepestExistingAncestor)))
      )
        return removeWorktreeDirWithoutGit(worktreePath, source, {
          vettedReal: vettedIdentity,
          via: "hook",
        });
      let targetStats;
      try {
        targetStats = await lstat(worktreePath);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(worktreePath, source, {
            vettedReal: vettedIdentity,
            via: "hook",
          });
        return {
          outcome: "failed",
          errorSummary: `cannot stat the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (targetStats.isSymbolicLink()) {
        logForDebugging(
          `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 stored worktree path is a symlink`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary:
            "the stored worktree path is a symlink \u2014 remove the link itself to clear this session",
        };
      }
      for (let anchorRoot of new Set([repoRoot, extraRoot].filter((root) => Boolean(root)))) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(worktreePath, anchorRoot);
        if (symlinkInWorktreeAncestry) {
          logForDebugging(
            `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 ${symlinkInWorktreeAncestry.kind} at ${symlinkInWorktreeAncestry.component}`,
            {
              level: "warn",
            },
          );
          return {
            outcome: "failed",
            errorSummary:
              symlinkInWorktreeAncestry.kind === "symlink"
                ? "a component of the stored worktree path is a symlink \u2014 remove the worktree at its resolved location (or the link, if the worktree is already gone), then retry"
                : "a component of the stored worktree path could not be verified \u2014 check its permissions, then retry",
          };
        }
      }
      if (!carriesDiscardConsent(source)) {
        let entries = await readdir(worktreePath).catch(() => null);
        if (entries === null)
          return {
            outcome: "failed",
            errorSummary: "unreadable directory",
          };
        if (entries.length > 0) {
          logForDebugging(
            `removeAgentWorktree: kept hook worktree ${worktreePath} \u2014 ${entries.length} unverifiable file(s); only an explicit discard may dispatch the remove hook`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_worktree_removed", {
            source: fromEnum(source),
            changed_files: 0,
            commits: 0,
            hook_based: true,
            aborted: 1,
          });
          return {
            outcome: "failed",
            errorSummary: UNCHECKED_FILES_SUMMARY,
            needsForce: true,
          };
        }
      }
      let realPath;
      try {
        realPath = await realpath(worktreePath);
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
          return removeWorktreeDirWithoutGit(worktreePath, source, {
            vettedReal: vettedIdentity,
            via: "hook",
          });
        return {
          outcome: "failed",
          errorSummary: `cannot resolve the worktree path (${getErrnoCode(error) ?? "unknown error"})`,
        };
      }
      if (realPath !== vettedIdentity) {
        logForDebugging(
          `removeAgentWorktree: refused hook removal of ${worktreePath} \u2014 ${IDENTITY_CHANGED_SUMMARY}`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary: IDENTITY_CHANGED_SUMMARY,
        };
      }
      if (isNetworkOrOutsidePath(realPath, cwd))
        return removeWorktreeDirWithoutGit(worktreePath, source, {
          vettedReal: vettedIdentity,
          via: "hook",
        });
      removalTarget = vettedIdentity;
    }
    let hookResult = await executeWorktreeRemoveHook(
      {
        id: getSessionId(),
        project: {
          originalCwd: getOriginalCwd(),
          projectRoot: getProjectRoot(),
        },
      },
      removalTarget,
      {
        storageV5,
        credentials,
      },
    );
    if (hookResult.kind === "removed") {
      logEvent("tengu_worktree_removed", {
        source: fromEnum(source),
        changed_files: 0,
        commits: 0,
        hook_based: true,
      });
      logForDebugging(`Removed hook-based agent worktree at: ${worktreePath}`);
      return {
        outcome: "removed",
      };
    }
    let hookFailureNote =
      hookResult.kind === "failed"
        ? `the WorktreeRemove hook ${hookResult.summary}`
        : "no WorktreeRemove hook is enabled here (hooks are disabled, or the repo defines only WorktreeCreate)";
    if (source === "job_delete_force_remove" && vettedIdentity !== undefined) {
      logForDebugging(`removeAgentWorktree: ${hookFailureNote} \u2014 removing ${worktreePath} by force`, {
        level: "warn",
      });
      return forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, {
        via: "hook",
        source,
        keptBranch: worktreeBranch,
      });
    }
    logForDebugging(
      `removeAgentWorktree: kept hook-based worktree ${worktreePath} \u2014 ${hookFailureNote}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: hookFailureNote,
      forceRemovable: hookResult.kind === "failed" ? "hook_failed" : "hook_not_enabled",
    };
  }
  if (!repoRoot)
    return removeWorktreeDirWithoutGit(worktreePath, source, {
      vettedReal: vettedIdentity,
    });
  await unlockAgentWorktree(worktreePath, repoRoot);
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(worktreePath);
  let statusResult = filterNeutralizingArgs
    ? await execFileNoThrowWithCwd(
        gitExe(),
        [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
        {
          cwd: worktreePath,
          env: buildGitEnvForRepo(worktreePath, undefined, {
            userLocale: true,
          }),
        },
      )
    : null;
  let statusUnverifiable = statusResult?.code !== 0 && !(await isGitDirMissing(worktreePath));
  let changedFileCount =
    statusResult?.code === 0 && statusResult.stdout.trim()
      ? countCharInString(
          statusResult.stdout.trim(),
          `
`,
        ) + 1
      : 0;
  if (statusResult?.code === 0) {
    let submoduleChange = submoduleChanges(await inspectSubmodules(worktreePath));
    if (submoduleChange !== undefined)
      changedFileCount += submoduleChange.kind === "changes" ? submoduleChange.paths.length : 1;
  }
  if (statusUnverifiable && (await isNestedInOtherRepo(worktreePath))) statusUnverifiable = false;
  if (
    (changedFileCount > 0 || statusUnverifiable) &&
    source !== "exit_tool" &&
    source !== "exit_dialog" &&
    !carriesDiscardConsent(source)
  ) {
    let abortSummary = statusUnverifiable
      ? "could not verify the worktree is clean (git status failed or repository git config unpinnable)"
      : `${changedFileCount} changed file(s) would be lost`;
    logForDebugging(
      `removeAgentWorktree: aborted ${source} removal \u2014 ${abortSummary}, kept ${worktreePath}`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: changedFileCount,
      commits: 0,
      aborted: 1,
    });
    return {
      outcome: "failed",
      errorSummary: abortSummary,
    };
  }
  let alreadyGone = false;
  if (vettedIdentity !== undefined) {
    let currentReal = await realpath(worktreePath).catch((error) =>
      isENOENT(error) || getErrnoCode(error) === "ENOTDIR" ? null : undefined,
    );
    if (currentReal === null) alreadyGone = true;
    else if (currentReal === undefined || currentReal !== vettedIdentity)
      return {
        outcome: "failed",
        errorSummary: IDENTITY_CHANGED_SUMMARY,
      };
  }
  if (!alreadyGone && !(await clearReparsePoints(worktreePath))) {
    logForDebugging(
      `removeAgentWorktree: aborted ${source} removal \u2014 unremovable reparse point in ${worktreePath}`,
      {
        level: "warn",
      },
    );
    return {
      outcome: "failed",
      errorSummary: UNREMOVABLE_REPARSE_SUMMARY,
    };
  }
  let currentBranch = null;
  if (worktreeBranch) {
    let symbolicRef = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "--short", "-q", "HEAD"],
      {
        cwd: worktreePath,
        env: buildGitEnvForRepo(worktreePath),
      },
    );
    currentBranch = symbolicRef.code === 0 ? symbolicRef.stdout.trim() : null;
  }
  let forceVetted = source === "job_delete_force_remove" && vettedIdentity !== undefined;
  let targetLstat = vettedIdentity !== undefined ? await lstat(vettedIdentity).catch(() => null) : null;
  let targetGitDir =
    targetLstat !== null && vettedIdentity !== undefined ? await resolveGitDir_2(vettedIdentity) : null;
  let pruneResult = await pruneWorktreeRegistrations(repoRoot, worktreePath, {
    forceTwice: forceVetted,
    pinRepository: true,
    deregisterIfStopped: true,
  });
  let pruneFailed = pruneResult.outcome === "removed" ? 0 : 1;
  let pruneDetail =
    pruneResult.outcome === "failed"
      ? pruneResult.stderr
      : pruneResult.outcome === "removed"
        ? ""
        : pruneResult.reason;
  let checkout = pruneResult.outcome === "failed" ? pruneResult.checkout : undefined;
  let registrationStale =
    pruneResult.outcome === "unregistered" ||
    checkout === "not_pointing_back" ||
    (checkout === undefined &&
      (pruneResult.outcome === "failed" || pruneResult.outcome === "unlisted") &&
      WORKTREE_GONE_RE.test(pruneDetail));
  let forcedDelete = false;
  if (
    pruneFailed !== 0 &&
    (await lstat(worktreePath).then(
      () => true,
      () => false,
    ))
  ) {
    if (pruneResult.outcome === "kept") {
      let symlinkClear = await isPathSymlinkClear(worktreePath, repoRoot);
      if (!forceVetted || !symlinkClear)
        return {
          outcome: "failed",
          errorSummary: `refused before anything was deleted (${printableLabel(pruneResult.reason, {
            head: 60,
            tail: 120,
          })})${symlinkClear ? "" : "; remove it by hand"}`,
          ...(symlinkClear && {
            forceRemovable: "git_refused",
          }),
        };
    }
    if (targetGitDir !== null && targetLstat !== null && vettedIdentity !== undefined)
      await restoreWorktreeGitPointer(vettedIdentity, targetGitDir, targetLstat);
    let removeOptions = {
      via: "git",
      source,
      changedFiles: changedFileCount,
      keptBranch: currentBranch ?? worktreeBranch,
    };
    if (forceVetted) {
      logForDebugging(
        `removeAgentWorktree: the removal refused or the registration vet kept ${worktreePath} (${pruneDetail.trim()}) \u2014 deleting the directory`,
        {
          level: "warn",
        },
      );
      return forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, removeOptions);
    }
    let gitErrorHint = printableLabel(
      getFirstLine(pruneDetail.trim()).replace(/^(fatal|error|warning):\s*/, ""),
      {
        head: 40,
        tail: 100,
      },
    );
    let deregisteredByRemoval =
      vettedIdentity !== undefined && (await worktreeDeregisteredByRemoval(vettedIdentity, repoRoot));
    if (registrationStale) {
      if (deregisteredByRemoval || forceRemoveRequested) {
        logForDebugging(
          `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${pruneDetail.trim()}) \u2014 ${deregisteredByRemoval ? "its own .git still names the dropped registration" : "a forced retry was asked for"}, kept with its record`,
          {
            level: "warn",
          },
        );
        return {
          outcome: "failed",
          errorSummary: deregisteredByRemoval
            ? "git no longer has it registered as a worktree (its own .git still points at that repository, the way a removal that failed partway leaves it), so nothing can check its files any more"
            : checkout === "not_pointing_back"
              ? "its .git file is missing or does not point to git's record of it"
              : `git no longer has it registered as a worktree (${gitErrorHint})`,
          forceRemovable: "git_refused",
        };
      }
      let deregistered = await deregisterWorktreeEntry(
        repoRoot,
        targetGitDir,
        vettedIdentity === undefined ? [worktreePath] : [worktreePath, vettedIdentity],
      );
      await restoreWorktreeConfigExtension(repoRoot);
      logForDebugging(
        deregistered
          ? `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${pruneDetail.trim()}) \u2014 dropped the stale registration, left the directory in place`
          : `removeAgentWorktree: git's registration no longer matches ${worktreePath} (${pruneDetail.trim()}) \u2014 no stale registration of it was dropped from ${repoRoot}, left the directory in place`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_worktree_removed", {
        source: fromEnum(source),
        changed_files: changedFileCount,
        commits: 0,
        left_in_place: 1,
        ...(deregistered && {
          deregistered_stale: 1,
        }),
      });
      return {
        outcome: "left_in_place",
      };
    }
    if (!deregisteredByRemoval || vettedIdentity === undefined || checkout !== undefined) {
      logForDebugging(`removeAgentWorktree: removal failed, kept ${worktreePath}: ${pruneDetail.trim()}`, {
        level: "warn",
      });
      return {
        outcome: "failed",
        errorSummary: `${checkout === undefined ? "git" : "Claude Code"} couldn't remove it${gitErrorHint ? ` (${gitErrorHint})` : ""}`,
        forceRemovable: checkout === "delete_failed" ? "rm_failed" : "git_refused",
      };
    }
    logForDebugging(
      `removeAgentWorktree: git worktree remove deregistered ${worktreePath} but could not delete it (${pruneDetail.trim()}) \u2014 deleting what it left`,
      {
        level: "warn",
      },
    );
    let forceResult = await forceRemoveAgentWorktree(worktreePath, vettedIdentity, repoRoot, removeOptions);
    if (forceResult.outcome !== "removed")
      return forceResult.outcome === "failed" && forceResult.forceRemovable === "rm_failed"
        ? {
            outcome: "failed",
            errorSummary: `git gave up its registration but couldn't delete the directory (${gitErrorHint}); Claude Code then tried, and ${forceResult.errorSummary ?? "could not either"}`,
            forceRemovable: "rm_failed",
          }
        : forceResult;
    forcedDelete = true;
  }
  if (pruneResult.outcome === "kept" || pruneResult.outcome === "unlisted")
    await pruneWorktreeRegistration(
      repoRoot,
      vettedIdentity === undefined ? worktreePath : [worktreePath, vettedIdentity],
      {
        locked: forceVetted ? "drop" : "keep",
      },
    );
  logForDebugging(`Removed agent worktree at: ${worktreePath}`);
  if (!forcedDelete) {
    await restoreWorktreeConfigExtension(repoRoot);
    logEvent("tengu_worktree_removed", {
      source: fromEnum(source),
      changed_files: changedFileCount,
      commits: 0,
    });
  }
  if (!worktreeBranch)
    return {
      outcome: "removed",
    };
  if (currentBranch !== worktreeBranch) {
    logForDebugging(
      `removeAgentWorktree: kept branch ${worktreeBranch} \u2014 not the checked-out branch (${currentBranch ?? "detached or dir gone"}), so no safety check ever verified it`,
    );
    return {
      outcome: "removed",
    };
  }
  await deleteWorktreeBranch(repoRoot, worktreeBranch, {
    errorLabel: "Could not delete agent worktree branch",
  });
  return {
    outcome: "removed",
  };
}
//@ chunk-e6aww6q8.js:3670830-3670904 layout
var CLAUDE = "claude";
var ENABLEDWORKTREECONFIGEXTENSION = "enabledWorktreeConfigExtension";
var CLAUDE_WORKTREE_CONFIG_KEY = `${CLAUDE}.${ENABLEDWORKTREECONFIGEXTENSION}`;
//@ chunk-e6aww6q8.js:3670904-3671717 layout
/**
 * 删除最后一个 linked worktree 后，若 extensions.worktreeConfig 是 Claude Code 开启的且 config.worktree 为空，则 unset 该扩展与配套键。
 */
async function restoreWorktreeConfigExtension(a) {
  try {
    let gitDir = await resolveGitDir(a);
    let commonDir = gitDir ? ((await getCommonDir(gitDir)) ?? gitDir) : null;
    if (
      !commonDir ||
      (await readGitConfigValueAsync(commonDir, CLAUDE, null, ENABLEDWORKTREECONFIGEXTENSION)) === null
    )
      return;
    try {
      if ((await lstat(join(commonDir, "config.worktree"))).size > 0) return;
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return;
    }
    let remainingCount = 0;
    for (let entry of await listRegisteredWorktrees(a)) {
      if (isNetworkOrUnsafePath(entry.worktreePath)) {
        remainingCount++;
        continue;
      }
      if (
        (await lstat(entry.worktreePath).then(
          () => false,
          (error) => isENOENT(error) || getErrnoCode(error) === "ENOTDIR",
        )) &&
        (await mayReleaseWorktreeLock(entry.lockReason))
      )
        continue;
      remainingCount++;
    }
    if (remainingCount > 1) return;
    let unsetResult = await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--unset-all", "extensions.worktreeConfig"],
      {
        cwd: a,
        env: buildGitEnvForRepo(a),
      },
    );
    if (unsetResult.exitCode !== 0 && unsetResult.exitCode !== 5) return;
    await execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "config", "--local", "--unset-all", CLAUDE_WORKTREE_CONFIG_KEY],
      {
        cwd: a,
        env: buildGitEnvForRepo(a),
      },
    );
    logForDebugging(`Restored extensions.worktreeConfig in ${a} after removing its last linked worktree`);
  } catch (error) {
    logForDebugging(`Could not restore extensions.worktreeConfig for ${a}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-e6aww6q8.js:3671717-3672191 layout
/**
 * 当前分支上游已 gone 且相对 n 没有独有（cherry-pick 后）提交时返回 true。
 */
async function isUpstreamGoneAndMerged(a, b) {
  let headResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "-q", "HEAD"],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  let trimmed = headResult.stdout.trim();
  if (headResult.code !== 0 || !trimmed) return false;
  let trackResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "for-each-ref", "--format=%(upstream:track,nobracket)", trimmed],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  if (trackResult.code !== 0 || trackResult.stdout.trim() !== "gone") return false;
  let aheadResult = await execFileNoThrowWithCwd(
    gitExe(),
    [
      ...GIT_SAFE_GLOBAL_ARGS,
      "rev-list",
      "--cherry-pick",
      "--right-only",
      "--no-merges",
      "--max-count=1",
      `${b}...HEAD`,
    ],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  return aheadResult.code === 0 && aheadResult.stdout.trim().length === 0;
}
//@ chunk-e6aww6q8.js:3672191-3672521 facade-exports = findRemoteBase (0.434)
/**
 * 找远程基准分支：origin/HEAD 指向，否则 origin/main、origin/master。
 */
async function getDefaultRemoteRef(a) {
  let b = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  if (b.code === 0 && b.stdout.trim()) return b.stdout.trim();
  for (let candidateRef of ["origin/main", "origin/master"])
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "-q", candidateRef],
          {
            cwd: a,
            env: buildGitEnvForRepo(a),
          },
        )
      ).code === 0
    )
      return candidateRef;
  return null;
}
//@ chunk-e6aww6q8.js:3672521-3673044 facade-exports = cleanupStaleAgentWorktrees (0.477)
/**
 * 清理超过截止时间、无改动、锁持有进程已退出的代理 worktree。
 */
async function passesCommitSafetyChecks(a, b, { primaryCheckoutVouches }) {
  let unpushedArgs = [...GIT_SAFE_GLOBAL_ARGS, "rev-list", "--max-count=1", "HEAD", "--not", "--remotes"];
  let unpushedResult = await execFileNoThrowWithCwd(gitExe(), unpushedArgs, {
    cwd: a,
    env: buildGitEnvForRepo(a),
  });
  if (unpushedResult.code !== 0) return false;
  if (unpushedResult.stdout.trim().length === 0) return true;
  if (primaryCheckoutVouches) {
    let upstreamBranchRef = await getUpstreamBranchRef(a, b);
    if (upstreamBranchRef) {
      let upstreamResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...unpushedArgs, upstreamBranchRef, "--"],
        {
          cwd: a,
          env: buildGitEnvForRepo(a),
        },
      );
      if (upstreamResult.code === 0 && !upstreamResult.stdout.trim()) return true;
    }
  }
  let [headResult, worktreeBaseline] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "HEAD"], {
      cwd: a,
      env: buildGitEnvForRepo(a),
    }),
    readWorktreeBaseline(a),
  ]);
  if (headResult.code === 0 && worktreeBaseline !== null && headResult.stdout.trim() === worktreeBaseline)
    return true;
  return b !== null && (await isUpstreamGoneAndMerged(a, b));
}
//@ chunk-e6aww6q8.js:3673044-3673758 layout
async function getUpstreamBranchRef(a, b) {
  if (!b?.startsWith("origin/")) return null;
  let expectedBranchRef = `refs/heads/${b.slice(7)}`;
  let dirsResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-dir", "--git-common-dir", "--symbolic-full-name", "HEAD"],
    {
      cwd: a,
      env: buildGitEnvForRepo(a),
    },
  );
  let lines = dirsResult.stdout.trim().split(`
`);
  let [gitDirLine, commonDirLine, headRefLine] = lines;
  if (
    dirsResult.code !== 0 ||
    lines.length !== 3 ||
    !gitDirLine ||
    !commonDirLine ||
    !headRefLine ||
    lines.some((line) => line.startsWith("-")) ||
    (headRefLine !== "HEAD" && !headRefLine.startsWith("refs/heads/")) ||
    resolve_2(a, gitDirLine) === resolve_2(a, commonDirLine)
  )
    return null;
  let [bareResult, mainWorktreeHead] = await Promise.all([
    execFileNoThrowWithCwd(gitExe(), [...GIT_SAFE_GLOBAL_ARGS, "config", "--bool", "--get", "core.bare"], {
      cwd: a,
      env: buildGitEnvForRepo(a),
    }),
    execFileNoThrowWithCwd(
      gitExe(),
      [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--verify", "-q", "--symbolic-full-name", "main-worktree/HEAD"],
      {
        cwd: a,
        env: buildGitEnvForRepo(a),
      },
    ),
  ]);
  let trimmed = mainWorktreeHead.stdout.trim();
  if (
    bareResult.code !== 0 ||
    bareResult.stdout.trim() !== "false" ||
    mainWorktreeHead.code !== 0 ||
    trimmed !== expectedBranchRef ||
    trimmed === headRefLine
  )
    return null;
  return trimmed;
}
//@ chunk-e6aww6q8.js:3673758-3674063 layout
async function cleanupStaleAgentWorktreesIfClean(root, defaultRemoteRef) {
  let filterNeutralizingArgs = await getFilterNeutralizingArgs(root);
  if (filterNeutralizingArgs === null) return false;
  let statusResult = await execFileNoThrowWithCwd(
    gitExe(),
    [...filterNeutralizingArgs, ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
    {
      cwd: root,
      env: buildGitEnvForRepo(root, undefined, {
        userLocale: true,
      }),
    },
  );
  if (statusResult.code !== 0 || statusResult.stdout.trim().length > 0) return false;
  let submoduleReport = await inspectSubmodules(root);
  if (submoduleReport.kind !== "verified" || submoduleChanges(submoduleReport) !== undefined) return false;
  return passesCommitSafetyChecks(root, defaultRemoteRef, {
    primaryCheckoutVouches: false,
  });
}
//@ chunk-e6aww6q8.js:3674063-3674934 facade-exports
async function cleanupStaleAgentWorktrees(cutoffDate, cutoff, keepsWorktreesInside = false) {
  let canonicalGitRoot = findCanonicalGitRoot(preferRemoteValue(getCwd(), getOriginalCwd()));
  if (!canonicalGitRoot) return 0;
  await releaseStaleClaudeWorktreeLocks(canonicalGitRoot);
  let dir = getClaudeWorktreesDir(canonicalGitRoot);
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    await restoreWorktreeConfigExtension(canonicalGitRoot);
    return 0;
  }
  let cutoffMs = cutoffDate.getTime();
  let currentPath = getCurrentWorktreeSession()?.worktreePath;
  let defaultRemoteRef = await getDefaultRemoteRef(canonicalGitRoot);
  let removed = 0;
  for (let entry of entries) {
    if (!isEphemeralWorktreeSlug(entry)) continue;
    let worktreePath = join(dir, entry);
    if (currentPath === worktreePath) continue;
    let mtimeMs;
    try {
      mtimeMs = (await stat(worktreePath)).mtimeMs;
    } catch {
      continue;
    }
    if (mtimeMs >= cutoffMs) continue;
    if (!(await cleanupStaleAgentWorktreesIfClean(worktreePath, defaultRemoteRef))) continue;
    try {
      if (!(await mayReleaseWorktreeLock(await readWorktreeLockReason(worktreePath, canonicalGitRoot)))) {
        logForDebugging(
          `cleanupStaleAgentWorktrees: kept ${worktreePath} \u2014 locked by a live Claude Code process, or with a reason we did not write`,
        );
        continue;
      }
    } catch (error) {
      logForDebugging(
        `cleanupStaleAgentWorktrees: kept ${worktreePath} \u2014 cannot read the worktree registry to verify lock ownership (${errorMessage(error)})`,
      );
      continue;
    }
    if (
      (
        await removeAgentWorktree(
          worktreePath,
          worktreeBranchName(entry),
          canonicalGitRoot,
          false,
          "stale_cleanup",
          undefined,
          undefined,
          {
            keepsWorktreesInside,
          },
        )
      ).outcome !== "failed"
    )
      removed++;
  }
  if (removed > 0) logForDebugging(`cleanupStaleAgentWorktrees: removed ${removed} stale worktree(s)`);
  await restoreWorktreeConfigExtension(canonicalGitRoot);
  return removed;
}
//@ chunk-e6aww6q8.js:3674934-3675966 facade-exports
async function reapJobWorktreeIfSafe(job) {
  let { worktreePath, worktreeBranch, originCwd, hookBased, cutoff } = job;
  if (hookBased) return false;
  let hostFiles = resolveWorktreeCleanupRoot(worktreePath, originCwd);
  if (!hostFiles || !isAgentWorktreeOf(worktreePath, hostFiles)) return false;
  let mtimeMs;
  try {
    mtimeMs = (await stat(worktreePath)).mtimeMs;
  } catch {
    return false;
  }
  let isRecent = mtimeMs >= cutoff.getTime();
  if (isRecent) return false;
  if ((await readWorktreeBaseline(worktreePath)) === null) {
    logForDebugging(
      `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 no Claude Code creation marker (${CLAUDE_BASE_ENV}) in its git admin dir, so Claude Code did not create it; not ours to remove`,
      {
        level: "warn",
      },
    );
    return false;
  }
  let realWorktreePath = await realpath(worktreePath).catch(() => worktreePath);
  let worktreePath_2 = getCurrentWorktreeSession()?.worktreePath;
  if (worktreePath_2 && realWorktreePath === (await realpath(worktreePath_2).catch(() => worktreePath_2)))
    return false;
  let registered = await listRegisteredWorktrees(hostFiles).catch(() => null);
  let registration;
  for (let entry of registered ?? [])
    if (realWorktreePath === (await realpath(entry.worktreePath).catch(() => entry.worktreePath))) {
      registration = entry;
      break;
    }
  if (!(await mayReleaseWorktreeLock(registration?.lockReason))) {
    logForDebugging(
      `reapJobWorktreeIfSafe: kept ${worktreePath} \u2014 locked by a live Claude Code process, or with a reason we did not write (${registration?.lockReason})`,
    );
    return false;
  }
  if (isRecent) return false;
  if (!(await cleanupStaleAgentWorktreesIfClean(worktreePath, await getDefaultRemoteRef(hostFiles))))
    return false;
  return (
    (
      await removeAgentWorktree(
        worktreePath,
        worktreeBranch,
        hostFiles,
        false,
        "job_retention_sweep",
        undefined,
        undefined,
        {
          keepsWorktreesInside: job.keepsWorktreesInside === true,
        },
      )
    ).outcome !== "failed"
  );
}
//@ chunk-e6aww6q8.js:3675966-3675977 layout
var MAX_STALE_WORKTREE_SWEEP = 50;
//@ chunk-e6aww6q8.js:3675977-3676087 layout
function isClaudeLockFromRunningPid(lockReason) {
  if (lockReason === undefined || lockReason.length > 512) return false;
  let match = lockReason.match(CLAUDE_WORKTREE_LOCK_REASON_PATTERN);
  if (!match) return false;
  return isProcessProvablyGone(Number(match[1]));
}
//@ chunk-e6aww6q8.js:3676087-3677257 layout
/**
 * releaseStaleClaudeWorktreeLocks：读 worktree 注册表，解除持有进程已不存在的 Claude 锁（不碰当前会话的 worktree）。
 */
async function releaseStaleClaudeWorktreeLocks(canonicalGitRoot) {
  let registered = await listRegisteredWorktrees(canonicalGitRoot).catch((error) => {
    logForDebugging(
      `releaseStaleClaudeWorktreeLocks: skipped \u2014 cannot read the worktree registry for ${canonicalGitRoot} (${errorMessage(error)})`,
    );
    return [];
  });
  let worktreePath = getCurrentWorktreeSession()?.worktreePath;
  let currentFoldKey =
    worktreePath === undefined
      ? undefined
      : foldCaseBasic(resolve_2(await realpath(worktreePath).catch(() => worktreePath)));
  let releasedCount = 0;
  for (let entry of registered) {
    if (currentFoldKey !== undefined && foldCaseBasic(resolve_2(entry.worktreePath)) === currentFoldKey)
      continue;
    if (isNetworkOrUnsafePath(entry.worktreePath)) continue;
    if (!isClaudeLockFromRunningPid(entry.lockReason)) continue;
    if (
      !(await lstat(join(entry.worktreePath, ".git")).then(
        () => true,
        () => false,
      ))
    )
      continue;
    if (releasedCount >= MAX_STALE_WORKTREE_SWEEP) {
      logForDebugging(
        `releaseStaleClaudeWorktreeLocks: per-sweep cap of ${MAX_STALE_WORKTREE_SWEEP} reached for ${canonicalGitRoot}; remaining stale locks will be reconciled on later sweeps`,
      );
      break;
    }
    let realWorktreePath;
    try {
      realWorktreePath = await realpath(entry.worktreePath);
    } catch {
      continue;
    }
    if (isNetworkOrUnsafePath(realWorktreePath)) continue;
    if (currentFoldKey !== undefined && foldCaseBasic(resolve_2(realWorktreePath)) === currentFoldKey)
      continue;
    let found = (
      await listRegisteredWorktrees(canonicalGitRoot).catch((error) => {
        logForDebugging(
          `releaseStaleClaudeWorktreeLocks: kept ${entry.worktreePath} \u2014 cannot re-read the worktree registry at release time (${errorMessage(error)})`,
        );
        return [];
      })
    ).find((matchedEntry) => matchedEntry.worktreePath === entry.worktreePath);
    if (!isClaudeLockFromRunningPid(found?.lockReason) || !(await mayReleaseWorktreeLock(found?.lockReason)))
      continue;
    await unlockAgentWorktree(entry.worktreePath, canonicalGitRoot);
    releasedCount++;
  }
  if (releasedCount > 0) {
    logForDebugging(
      `releaseStaleClaudeWorktreeLocks: attempted release of ${releasedCount} stale liveness lock(s) in ${canonicalGitRoot}`,
    );
    logEvent("tengu_worktree_stale_lock_released", {
      attempted: releasedCount,
    });
  }
  return releasedCount;
}
//@ chunk-e6aww6q8.js:3677257-3677338 facade-exports
async function hasWorktreeChanges(worktreePath, headCommit) {
  let { dirty, commitsAhead } = await getAgentWorktreeChanges(worktreePath, headCommit);
  return dirty || commitsAhead > 0;
}
//@ chunk-e6aww6q8.js:3677338-3678494 layout
/**
 * 切换到 worktree 重新启动时，把 --settings/--mcp-config/--add-dir/--plugin-dir 等参数中的相对路径改写为基于原 cwd 的绝对路径。
 */
function rewriteCliPathArgsForWorktree(a, rewritePath = (path) => resolve_2(path)) {
  let rewritableFlags = new Map([
    [
      "--settings",
      {
        json: true,
      },
    ],
    [
      "--mcp-config",
      {
        json: true,
      },
    ],
    [
      "--agents",
      {
        json: true,
      },
    ],
    [
      "--add-dir",
      {
        tilde: true,
      },
    ],
    ["--plugin-dir", {}],
    ["--plugin-dir-no-mcp", {}],
    ["--system-prompt-file", {}],
    ["--append-system-prompt-file", {}],
    ["--append-subagent-system-prompt-file", {}],
    ["--debug-file", {}],
  ]);
  let nameOnlyFlags = new Set(["--setting-sources", "--managed-settings"]);
  let rewrittenArgs = [];
  for (let idx = 0; idx < a.length; idx++) {
    let arg = a[idx];
    if (arg === undefined) continue;
    if (arg === "--") {
      rewrittenArgs.push(...a.slice(idx));
      break;
    }
    if (arg === "--tmux" || arg === "--tmux=classic") continue;
    if (arg === "-w" || arg === "--worktree") {
      let nextArg = a[idx + 1];
      if (nextArg !== undefined && !nextArg.startsWith("-")) idx++;
      continue;
    }
    if (arg.startsWith("--worktree=")) continue;
    let index = arg.indexOf("=");
    let flagName = index === -1 ? arg : arg.slice(0, index);
    let rewriteKind = rewritableFlags.get(flagName);
    let isVariadic = VARIADIC_VALUE_FLAGS.has(flagName);
    if (rewriteKind === undefined && !isVariadic && !nameOnlyFlags.has(flagName)) {
      let min = Math.min(lastValueSlot(a, idx), a.length - 1);
      rewrittenArgs.push(...a.slice(idx, min + 1));
      idx = min;
      continue;
    }
    let rewriteValue = (value) =>
      `${flagName}=${rewriteKind !== undefined && value !== "" && !(rewriteKind.json && value.trimStart().startsWith("{")) && !(rewriteKind.tilde && isHomeRelativePath(value)) ? rewritePath(value) : value}`;
    if (index !== -1) {
      rewrittenArgs.push(rewriteValue(arg.slice(index + 1)));
      continue;
    }
    let nextArg = a[idx + 1];
    if (nextArg === undefined || looksLikeOption(nextArg)) {
      rewrittenArgs.push(arg);
      continue;
    }
    rewrittenArgs.push(rewriteValue(nextArg));
    idx++;
    while (isVariadic) {
      let nextArg = a[idx + 1];
      if (nextArg === undefined || looksLikeOption(nextArg)) break;
      rewrittenArgs.push(rewriteValue(nextArg));
      idx++;
    }
  }
  return rewrittenArgs;
}
//@ chunk-e6aww6q8.js:3678494-3683997 facade-exports = execIntoTmuxWorktree (0.795)
/**
 * --tmux 模式：创建/附着 tmux 会话并在 worktree 中重新执行 claude。
 */
async function execIntoTmuxWorktree(args, storageV5, credentials) {
  if (!checkHasTrustDialogAccepted())
    return {
      handled: false,
      error:
        "Workspace trust not yet accepted. Run `claude` once in this directory and accept the trust dialog, then retry with --worktree.",
    };
  installRepoDetectionGuards();
  let env_2 = getIsolatedGitExecOptions().env;
  let runTmux = (tmuxArgs, tmuxOptions = {}) =>
    execFileNoThrowWithCwd("tmux", tmuxArgs, {
      ...tmuxOptions,
      env: env_2,
      extendEnv: false,
    });
  let versionResult = await runTmux(["-V"]);
  if (versionResult.code !== 0)
    return {
      handled: false,
      error: "Error: tmux is not installed. Install tmux with: sudo apt install tmux",
    };
  let worktreeName;
  let forceClassicTmux = false;
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (!arg) continue;
    if (arg === "--") break;
    if (arg === "-w" || arg === "--worktree") {
      let next = args[i + 1];
      if (next && !next.startsWith("-")) worktreeName = next;
    } else if (arg.startsWith("--worktree=")) worktreeName = arg.slice(11);
    else if (arg === "--tmux=classic") forceClassicTmux = true;
    i = lastValueSlot(args, i);
  }
  let prNumber = null;
  if (worktreeName) {
    prNumber = parsePRReference(worktreeName);
    if (prNumber !== null) worktreeName = `pr-${prNumber.number}`;
  }
  if (!worktreeName) {
    let adjectives = ["swift", "bright", "calm", "keen", "bold"];
    let nouns = ["fox", "owl", "elm", "oak", "ray"];
    let adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    let noun = nouns[Math.floor(Math.random() * nouns.length)];
    let suffix = Math.random().toString(36).slice(2, 6);
    worktreeName = `${adj}-${noun}-${suffix}`;
  }
  try {
    validateWorktreeSlug(worktreeName);
  } catch (e) {
    return {
      handled: false,
      error: `Error: ${errorMessage(e)}`,
    };
  }
  let worktreeDir;
  let repoName;
  let hookWorktree;
  try {
    hookWorktree = dispatchesWorktreeCreate()
      ? await executeWorktreeCreateHook(
          {
            id: getSessionId(),
            project: {
              originalCwd: getOriginalCwd(),
              projectRoot: getProjectRoot(),
            },
          },
          worktreeName,
          {
            storageV5,
            credentials,
          },
        )
      : undefined;
  } catch (error) {
    return {
      handled: false,
      error: `Error: ${errorMessage(error)}`,
    };
  }
  if (hookWorktree) {
    try {
      if (hasDotSegment(hookWorktree.worktreePath))
        throw new WorktreeIsolationError(
          `the WorktreeCreate hook emitted a path with dot segments (${hookWorktree.worktreePath}) \u2014 the symlink screen cannot ` +
            "verify a dotted spelling; have the hook emit a normalized (dot-free) absolute path",
        );
      let cwd = getCwd();
      for (let root of new Set(
        [findCanonicalGitRoot(cwd), findGitRoot(cwd)].filter((root) => Boolean(root)),
      )) {
        let symlinkInWorktreeAncestry = await findSymlinkInWorktreeAncestry(hookWorktree.worktreePath, root);
        if (symlinkInWorktreeAncestry)
          throw new WorktreeIsolationError(
            `the WorktreeCreate hook's worktree path component ${symlinkInWorktreeAncestry.component} ` +
              (symlinkInWorktreeAncestry.kind === "symlink" ? "is a symlink" : "could not be verified") +
              " \u2014 a repository-committed symlink below the checkout root " +
              "could redirect the worktree outside the repository",
          );
      }
      worktreeDir = hookWorktree.worktreePath;
    } catch (error) {
      return {
        handled: false,
        error: `Error: ${errorMessage(error)}`,
      };
    }
    repoName = basename(findCanonicalGitRoot(getCwd()) ?? getCwd());
    console.log(`Using worktree via hook: ${worktreeDir}`);
  } else {
    let cwd = getCwd();
    let repoRoot = findCanonicalGitRoot(cwd);
    if (!repoRoot)
      return {
        handled: false,
        error: "Error: --worktree requires a git repository",
      };
    repoName = basename(repoRoot);
    try {
      let result = await getOrCreateWorktree(
        repoRoot,
        worktreesDirSpecs(repoRoot),
        worktreeName,
        prNumber !== null
          ? {
              prNumber: prNumber.number,
              prForge: prNumber.forge,
              fromCwd: cwd,
            }
          : {
              fromCwd: cwd,
            },
      );
      worktreeDir = result.worktreePath;
      if (!result.existed) {
        console.log(
          `Created worktree: ${worktreeDir} (based on ${prNumber !== null || result.baseBranch.endsWith("^{commit}") ? result.headCommit : result.baseBranch})`,
        );
        await performPostCreationSetup(repoRoot, worktreeDir);
      }
    } catch (error) {
      return {
        handled: false,
        error: `Error: ${errorMessage(error)}`,
      };
    }
  }
  let tmuxSessionName = `${repoName}_${worktreeBranchName(worktreeName)}`.replace(/[/.]/g, "_");
  let launchCommand = isPersonalConfigRestricted()
    ? ["env", "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG=1", process.execPath]
    : [process.execPath];
  let cliArgs = [
    ...(isRestrictedMode() ? ["--restricted"] : []),
    ...[],
    ...rewriteCliPathArgsForWorktree(args),
  ];
  let tmuxPrefix = "C-b";
  let prefixResult = await runTmux(["show-options", "-g", "prefix"]);
  if (prefixResult.code === 0 && prefixResult.stdout) {
    let match = prefixResult.stdout.match(/prefix\s+(\S+)/);
    if (match?.[1]) tmuxPrefix = match[1];
  }
  let prefixConflicts = ["C-b", "C-c", "C-d", "C-t", "C-o", "C-r", "C-s", "C-g", "C-e"].includes(tmuxPrefix);
  let tmuxEnv = {
    CLAUDE_CODE_TMUX_SESSION: tmuxSessionName,
    CLAUDE_CODE_TMUX_PREFIX: tmuxPrefix,
    CLAUDE_CODE_TMUX_PREFIX_CONFLICTS: prefixConflicts ? "1" : "",
    ...(isPersonalConfigRestricted() && {
      CLAUDE_CODE_PERSONAL_CONFIG_FIX: getPersonalConfigFixHint() ?? "",
    }),
  };
  let match = versionResult.stdout.match(/(\d+)\.(\d+)/);
  let supportsEnvFlag =
    match !== null && (Number(match[1]) > 3 || (Number(match[1]) === 3 && Number(match[2]) >= 2));
  let envArgs = supportsEnvFlag
    ? Object.entries(tmuxEnv).flatMap(([key, value]) => [
        "-e",
        `${key}=${value.endsWith(";") ? `${value.slice(0, -1)}\\;` : value}`,
      ])
    : [];
  if (!supportsEnvFlag)
    env_2 = {
      ...env_2,
      ...tmuxEnv,
    };
  let execOptions = {
    stdio: "inherit",
    env: env_2,
    extendEnv: false,
  };
  let sessionExists = (await runTmux(["has-session", "-t", tmuxSessionName])).code === 0;
  let isAlreadyInTmux = Boolean(env.TMUX);
  let useControlMode = isInITerm2() && !forceClassicTmux && !isAlreadyInTmux;
  let tmuxGlobalArgs = useControlMode ? ["-CC"] : [];
  if (useControlMode && !sessionExists) {
    let y = sequential.yellow;
    console.log(`
${y("\u256D\u2500 iTerm2 Tip \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E")}
${y("\u2502")} To open as a tab instead of a new window:                           ${y("\u2502")}
${y("\u2502")} iTerm2 > Settings > General > tmux > "Tabs in attaching window"     ${y("\u2502")}
${y("\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F")}
`);
  }
  let It = null;
  let watchPath = It === null ? null : join(worktreeDir, It);
  let watchDir =
    watchPath !== null &&
    (await stat(watchPath).then(
      (stats) => stats.isDirectory(),
      () => false,
    ))
      ? watchPath
      : null;
  if (watchDir !== null) {
    await runTmux(
      [
        "new-session",
        "-d",
        "-s",
        tmuxSessionName,
        ...envArgs,
        "-c",
        watchDir,
        "--",
        ...launchCommand,
        ...cliArgs,
      ],
      {
        cwd: worktreeDir,
        useToolMemoryCgroup: false,
      },
    );
    await runTmux(["split-window", "-h", "-t", tmuxSessionName, "-c", watchDir], {
      cwd: worktreeDir,
    });
    await runTmux(["send-keys", "-t", tmuxSessionName, "bun run watch", "Enter"], {
      cwd: worktreeDir,
    });
    await runTmux(["split-window", "-v", "-t", tmuxSessionName, "-c", watchDir], {
      cwd: worktreeDir,
    });
    await runTmux(["send-keys", "-t", tmuxSessionName, "bun run start"], {
      cwd: worktreeDir,
    });
    await runTmux(["select-pane", "-t", `${tmuxSessionName}:0.0`], {
      cwd: worktreeDir,
    });
    if (isAlreadyInTmux)
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...execOptions,
        cwd: worktreeDir,
        reject: false,
      });
    else
      await safeExecFile("tmux", [...tmuxGlobalArgs, "attach-session", "-t", tmuxSessionName], {
        ...execOptions,
        cwd: worktreeDir,
        reject: false,
        useToolMemoryCgroup: false,
      });
  } else if (isAlreadyInTmux) {
    if (sessionExists)
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...execOptions,
        cwd: worktreeDir,
        reject: false,
      });
    else {
      await runTmux(
        [
          "new-session",
          "-d",
          "-s",
          tmuxSessionName,
          ...envArgs,
          "-c",
          worktreeDir,
          "--",
          ...launchCommand,
          ...cliArgs,
        ],
        {
          cwd: worktreeDir,
          useToolMemoryCgroup: false,
        },
      );
      await safeExecFile("tmux", ["switch-client", "-t", tmuxSessionName], {
        ...execOptions,
        cwd: worktreeDir,
        reject: false,
      });
    }
  } else {
    let tmuxArgs = [
      ...tmuxGlobalArgs,
      "new-session",
      "-A",
      "-s",
      tmuxSessionName,
      ...envArgs,
      "-c",
      worktreeDir,
      "--",
      ...launchCommand,
      ...cliArgs,
    ];
    await safeExecFile("tmux", tmuxArgs, {
      ...execOptions,
      cwd: worktreeDir,
      reject: false,
      useToolMemoryCgroup: false,
    });
  }
  return {
    handled: true,
  };
}
//@ chunk-e6aww6q8.js:3683997-3684863 placement
async function getFilterNeutralizingArgsOrRefusal(worktreePath) {
  let failure = await buildFilterNeutralizingArgs(worktreePath);
  if (failure.ok)
    return {
      args: failure.args,
    };
  switch (failure.reason) {
    case "config_unreadable":
      logFeatureBad("git_worktree_create", "git_worktree_create_config_unreadable");
      return {
        refusal: "Could not read the repository git config to neutralize filter drivers",
      };
    case "filter_name_unrepresentable":
      logFeatureBad("git_worktree_create", "git_worktree_create_filter_name_unrepresentable");
      return {
        refusal:
          'The repository git config defines a filter driver whose name cannot be neutralized (contains "=" or a newline)',
      };
    case "conditional_include":
      logFeatureBad("git_worktree_create", "git_worktree_create_conditional_include");
      return {
        refusal:
          "The repository git config has a conditional include (includeIf), so the filter drivers a checkout would load cannot be determined",
      };
    case "unsafe_key":
      logFeatureBad("git_worktree_create", "git_worktree_create_unsafe_key");
      return {
        refusal: `Git was not run: ${describeGitConfigUnreadable(failure)}`,
      };
  }
}
//@ chunk-e6aww6q8.js:3684863-3684926 placement
async function getFilterNeutralizingArgs(args) {
  let filterNeutralizingArgs = await buildFilterNeutralizingArgs(args);
  return filterNeutralizingArgs.ok ? filterNeutralizingArgs.args : null;
}
//@ chunk-e6aww6q8.js:3684926-3685211 placement
async function deregisterWorktreeEntry(a, b, worktreePath) {
  let repoGitDir = await vetRepoForWorktrees(a);
  let foldCase = (value) => (getPlatform() === "windows" ? value.toLowerCase() : value);
  if (
    repoGitDir === null ||
    (b !== null &&
      foldCase(stripTrailingSeparators(normalize(dirname(b)))) !== foldCase(join(repoGitDir, "worktrees")))
  )
    return false;
  return (
    (
      await deregisterWorktree(
        repoGitDir,
        b === null
          ? {
              worktreePath,
              repoSpelled: a,
            }
          : {
              entryId: basename(b),
              repoSpelled: a,
            },
        {
          locked: "keep",
        },
      )
    ).outcome === "dropped"
  );
}
//@ chunk-e6aww6q8.js:3685211-3685337 placement
async function isGitDirMissing(path) {
  let gitDir = await resolveGitDir_2(path);
  try {
    await (gitDir ? stat(gitDir) : lstat(join(path, ".git")));
    return false;
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR";
  }
}
//@ chunk-e6aww6q8.js:3685337-3685449 placement
function worktreeRegistrationKeptMessage(worktreeBranch) {
  return `The worktree registration for ${worktreeBranch} was left in place; pass a different --worktree name.`;
}
export {
  getCurrentWorktreeSession,
  restoreWorktreeSession,
  createAgentWorktree,
  getAgentWorktreeChanges,
  unlockAgentWorktree,
  removeAgentWorktree,
  runGitInWorktree,
  releaseOwnWorktreeLock,
  refuseUnavailableWorktree,
  throwAgentWorktreeNotGitRefusal,
  hasWorktreeChanges,
  isOwnedWorktreeSession,
  setCurrentWorktreeSession,
  killTmuxSession,
  keepWorktree,
  cleanupWorktree,
  getWorkingCopyWorktreeChanges,
  persistWorktreeSession,
  countCommitsAtStake,
  describeWhereCommitsAre,
  parsePRReference,
  isTmuxAvailable,
  getTmuxInstallInstructions,
  reapJobWorktreeIfSafe,
  cleanupStaleAgentWorktrees,
  getWorktreeSessionState,
  listRepoWorktrees,
  validateWorktreeSlug_2,
  isWorktreeConfigPath,
  resolveWorktreeCleanupRoot,
  listRegisteredWorktrees,
  repositoryVouchedByWorktree,
  worktreeDeregisteredByRemoval,
  carriesDiscardConsent,
  claudeWorktreeLockPid,
  mayReleaseWorktreeLock,
  passesCommitSafetyChecks,
  getDefaultRemoteRef,
  IDENTITY_CHANGED_SUMMARY,
  isAgentWorktreeOf,
  validateWorktreeSlug,
  isWorktreeMadeElsewhere,
  lockClaudeWorktree,
  worktreeBranchName,
  readWorktreeBaseline,
  readWorktreeLockReason,
  generateTmuxSessionName,
  createWorktreeForSession,
  createTmuxSessionForWorktree,
  resolveManagedWorktreePath,
  WorktreeIsolationError,
  resolveExistingWorktreeTarget,
  enterExistingWorktreeForSession,
  isPathUnderManagedWorktreesDir,
  execIntoTmuxWorktree,
};
