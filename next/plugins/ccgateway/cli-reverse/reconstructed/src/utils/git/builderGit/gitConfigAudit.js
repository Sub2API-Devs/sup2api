/**
 * utils/git/builderGit/gitConfigAudit.ts
 *
 * builderGit：审查仓库 git 配置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fepf8jp6.js (37)
 * attribution: placement 37
 */
import { isAbsolute, join, basename, dirname, resolve, sep } from "path";
import { realpath, stat } from "fs/promises";
import { homedir, userInfo } from "os";
import {
  GIT_SAFE_GLOBAL_ARGS,
  GIT_ENV_VARS_TO_CLEAR,
  regExp as regExp_2,
  GIT_TRANSPORT_ENV_RE,
} from "../gitSafeEnv.js";
import {
  reachRootsOrUnreadable,
  boundSessionReachRoots,
  IN_TREE_SETTINGS_UNREADABLE,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  buildGitEnvForReach,
  buildGitEnv,
  EMPTY_VALUE,
  GIT_READ_ARGS,
  MAX_GIT_BUFFER_BYTES,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  GIT_READ_ENV,
  GIT_REF_PARANOIA_ENV,
  runGitWithEnv,
  isDangerousEnvName,
  isBuildToolEnvVar,
  opensslConfIncludeEnv,
  applyOpenSslConfInclude,
  getPreSettingsEnv,
  reachForBoundSession,
  INCLUDE_PATH_CONFIG_KEY_RE,
  isCannotChangeToError,
  regExp,
  GIT_ISOLATION_CONFIG_ARGS,
} from "./gitEnv.js";
import { currentGitBinaryState, gitExeOnPathInEnv, windowsGitNote, GitBinaryError } from "./gitBinary.js";
import {
  GIT_NOT_FOUND_MESSAGE,
  SANDBOX_REACH_TEXTS,
  homeInCheckoutNote,
  UNEXAMINABLE_REACH_NOTE,
  reachRootsForRepo,
  findEnclosingRepos,
  checkoutDirOfGitDir,
  createReachCollector,
} from "./sandboxReach.js";
import { getRemoteHostSessionCount } from "../../../commands/insights.js";
import {
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
} from "./gitDirIdentity.js";
import { annotateStderr, withholdGitStderr, firstGitFailureClass, seenStderr } from "./gitRun.js";
import { GIT_FILES_REF_BACKEND_ENV } from "../gitLanes.js";
import {
  PROTECTED_ENV_VARS,
  isPathInside,
  collectGitProtectedPaths,
  getGitConfigPaths,
  systemGitConfigPaths,
  findReachableProtectedPath,
  isWindowsNonDrivePath,
  getHomeDirCandidates,
  resolveRelative,
} from "../../permissions/protectedEnvAndGitPaths.js";
import { GIT_SAFETY_ENV as GIT_SAFETY_ENV_2 } from "../gitSafeInvocation.js";
import { DEFAULT_INVOCATION_ENCODING } from "../../detectRepository.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { getPlatform } from "../../platform.js";
import { normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { findCanonicalGitRootUncached } from "../../git.js";
import { hasBackslash } from "../../pathClassification.js";
import { getEnvCaseInsensitive } from "../../plugins/securityDefaultPlugin.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  statDotGit,
  detectUnsupportedLayout,
  objectsDirFingerprint,
  statFingerprint,
  hasReftableOrigin,
} from "./gitDirShape.js";
import { getFirstLine } from "../../stringUtils.js";
import { mapped } from "../../gitSafeExec.js";
import { readAttributesConfig } from "./repoCopy.js";
import { countWhere } from "../../collections.js";
import { readGitConfigFromEnv } from "./inTreeConfig.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-fepf8jp6.js:12094-13421 placement
function listGitRefs(cwd, args, options) {
  let inputOption =
    options.input === undefined
      ? {}
      : {
          input: options.input,
        };
  if (!options.hardened)
    return runGitForAudit([...GIT_SAFE_GLOBAL_ARGS, ...args], {
      cwd,
      abortSignal: options.signal,
      ...inputOption,
      ...buildAuditEnv(options.env),
      ...(options.maxBuffer !== undefined && {
        maxBuffer: options.maxBuffer,
      }),
    });
  let reachRoots =
    options.reach ??
    (options.reachRoots !== undefined
      ? reachRootsOrUnreadable(options.reachRoots)
      : options.layout === undefined
        ? undefined
        : boundSessionReachRoots(options.layout));
  if (reachRoots === IN_TREE_SETTINGS_UNREADABLE)
    return Promise.resolve({
      stdout: "",
      stderr: IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
      code: 126,
    });
  let probes = options.probes ?? currentGitBinaryState();
  let screenMemo = options.screenMemo ?? probes.screenMemo;
  let env = buildGitEnvForReach(reachRoots, screenMemo);
  let gitExePath = gitExeOnPathInEnv(env, probes);
  if (gitExePath === null)
    return Promise.resolve({
      stdout: "",
      stderr:
        reachRoots === undefined || gitExeOnPathInEnv(buildGitEnv(undefined), probes) === null
          ? GIT_NOT_FOUND_MESSAGE
          : `${SANDBOX_REACH_TEXTS}${homeInCheckoutNote(options.layout?.workTree ?? cwd)}. ${UNEXAMINABLE_REACH_NOTE}`,
      code: 127,
    });
  let extraArgs = [];
  if (extraArgs === undefined)
    return Promise.resolve({
      stdout: "",
      stderr: EMPTY_VALUE,
      code: 126,
    });
  let invocationArgs = [
    {
      file: gitExePath,
      startsOutside:
        reachRoots !== undefined &&
        !(options.startsInProject || options.reachRoots?.startsInProject || options.layout?.startsInProject),
    },
    [...GIT_SAFE_GLOBAL_ARGS, ...GIT_READ_ARGS, ...extraArgs, ...args],
    {
      dir: options.layout?.workTree ?? cwd,
      abortSignal: options.signal,
      maxBuffer: Math.min(options.hardenedMaxBuffer ?? MAX_GIT_BUFFER_BYTES, MAX_GIT_BUFFER_BYTES),
      ...inputOption,
      ...(options.stripFinalNewline === false && {
        stripFinalNewline: false,
      }),
      ...(options.encoding !== undefined && {
        encoding: options.encoding,
      }),
      ...(options.stdoutFd !== undefined && {
        stdout: options.stdoutFd,
      }),
      env: {
        ...neutralizeGitConfigEnv(
          getRemoteHostSessionCount(
            {
              ...gitConfigLocationEnv(env),
              ...scrubGitTrace2Env(env),
              ...GIT_READ_ENV,
              ...(args[0] === "for-each-ref" && GIT_REF_PARANOIA_ENV),
              ...(options.layout && gitDirEnv(options.layout)),
              ...(options.layout?.borrowedObjects !== undefined && {
                GIT_ALTERNATE_OBJECT_DIRECTORIES: annotateStderr(options.layout.borrowedObjects),
              }),
              ...options.layout?.configPins,
              ...options.env,
            },
            {
              base: env,
            },
          ),
        ),
        ...(options.layout && GIT_FILES_REF_BACKEND_ENV),
      },
    },
  ];
  return runGitWithEnv(...invocationArgs).then(withholdGitStderr);
}
//@ chunk-fepf8jp6.js:13421-14129 placement
/**
 * 审查 git 时关注的环境变量集合与判断函数。
 */
var AUDITED_ENV_VARS; // deferred: uses PROTECTED_ENV_VARS (../../permissions/protectedEnvAndGitPaths.js) of its import cycle while loading; runs once the cycle is complete
var GIT_TRACE_ENV_RE;
var isAuditedEnvVar;
deferInit("chunk-fepf8jp6.js:13421", () => {
  AUDITED_ENV_VARS = new Set([
    ...GIT_ENV_VARS_TO_CLEAR,
    "GIT_CONFIG_NOSYSTEM",
    "GIT_REFERENCE_BACKEND",
    "GIT_EXEC_PATH",
    "GIT_ATTR_SOURCE",
    "GIT_SSH",
    "GIT_SSH_COMMAND",
    "GIT_ASKPASS",
    "SSH_ASKPASS",
    "HOME",
    "XDG_CONFIG_HOME",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "PROGRAMDATA",
    "PATH",
    "GIT_EXTERNAL_DIFF",
    "GIT_DIFF_OPTS",
    "GIT_PAGER",
    "GIT_TEMPLATE_DIR",
    "GIT_SSH_VARIANT",
    "SSH_ASKPASS_REQUIRE",
    "GIT_HTTP_PROXY_AUTHMETHOD",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "NO_PROXY",
    "CURL_CA_BUNDLE",
    "SSL_CERT_FILE",
    "SSL_CERT_DIR",
    "NIX_SSL_CERT_FILE",
    "SSLKEYLOGFILE",
    "GIT_ALLOW_PROTOCOL",
    ...PROTECTED_ENV_VARS,
    ...Object.keys(GIT_SAFETY_ENV_2),
  ]);
  GIT_TRACE_ENV_RE = /^GIT_(?:CURL_|LFS_|TRACE|TRANSFER_TRACE$|REDIRECT_STD)/i;
  isAuditedEnvVar = (varName) =>
    AUDITED_ENV_VARS.has(varName.toUpperCase()) ||
    regExp_2.test(varName) ||
    GIT_TRACE_ENV_RE.test(varName) ||
    GIT_TRANSPORT_ENV_RE.test(varName) ||
    isDangerousEnvName(varName) ||
    isBuildToolEnvVar(varName);
});
//@ chunk-fepf8jp6.js:14129-14250 placement
/**
 * 审查用 git 环境（恢复设置前的值与 OpenSSL include）。
 */
function buildAuditEnv(extraEnv) {
  let mergedEnv = {
    ...diffPreSettingsEnv(),
    ...extraEnv,
  };
  let opensslEnv = opensslConfIncludeEnv({
    ...process.env,
    ...mergedEnv,
  });
  let auditEnv = {
    ...mergedEnv,
    ...opensslEnv,
  };
  return Object.keys(auditEnv).length > 0
    ? {
        env: auditEnv,
      }
    : {};
}
//@ chunk-fepf8jp6.js:14250-14281 placement
function gitExeForAudit() {
  return gitExeOnPathInEnv(auditEnvironment());
}
//@ chunk-fepf8jp6.js:14281-14439 placement
/**
 * 运行 git（找不到时返回 127 并隐藏 stderr）。
 */
function runGitForAudit(args, options) {
  let gitExePath = gitExeForAudit();
  let invocationOptions = {
    ...options,
    encoding: options.encoding ?? DEFAULT_INVOCATION_ENCODING,
  };
  return gitExePath === null
    ? Promise.resolve({
        stdout: "",
        stderr: `${GIT_NOT_FOUND_MESSAGE}${windowsGitNote()}`,
        code: 127,
      })
    : execFileNoThrowWithCwd(gitExePath, args, invocationOptions).then(withholdGitStderr);
}
//@ chunk-fepf8jp6.js:14439-14490 placement
/**
 * 构造 git 审查用的环境（进程环境叠加设置生效后的差异）。
 */
function auditEnvironment() {
  return applyOpenSslConfInclude({
    ...process.env,
    ...diffPreSettingsEnv(),
  });
}
//@ chunk-fepf8jp6.js:14490-14894 placement
/**
 * 设置生效前后不同的被审查变量。
 */
function diffPreSettingsEnv() {
  if (getLatchedPreSettingsEnvSnapshot() === undefined) return {};
  let preSettingsEnv = getPreSettingsEnv();
  let env = process.env;
  let foldCase = getPlatform() === "windows" ? (key) => key.toUpperCase() : (key) => key;
  let currentKeys = new Map(Object.keys(env).map((key) => [foldCase(key), key]));
  let preKeys = new Map(Object.keys(preSettingsEnv).map((key) => [foldCase(key), key]));
  return Object.fromEntries(
    normalizeCaseForComparison_2([...currentKeys.keys(), ...preKeys.keys()]).flatMap((foldedKey) => {
      let currentName = currentKeys.get(foldedKey);
      let preName = preKeys.get(foldedKey);
      let reportedName = currentName ?? preName ?? foldedKey;
      let preValue = preName === undefined ? undefined : preSettingsEnv[preName];
      if (
        !isAuditedEnvVar(reportedName) ||
        (currentName === undefined ? undefined : env[currentName]) === preValue
      )
        return [];
      return [[reportedName, preValue ?? gitSafetyEnvValue(reportedName)]];
    }),
  );
}
//@ chunk-fepf8jp6.js:14894-14968 placement
/**
 * git 安全相关环境变量的基准表及其取值函数，以及需要额外清空的变量。
 */
var GIT_SAFETY_ENV; // deferred: uses GIT_SAFETY_CONFIG_KEYS (../gitSafeInvocation.js) of its import cycle while loading; runs once the cycle is complete
var gitSafetyEnvValue;
var UNSET_REFERENCE_BACKEND_ENV;
deferInit("chunk-fepf8jp6.js:14894", () => {
  GIT_SAFETY_ENV = GIT_SAFETY_ENV_2;
  gitSafetyEnvValue = (varName) => GIT_SAFETY_ENV[varName.toUpperCase()];
  UNSET_REFERENCE_BACKEND_ENV = {
    GIT_REFERENCE_BACKEND: undefined,
  };
});
//@ chunk-fepf8jp6.js:14968-15211 placement
function neutralizeGitConfigEnv(remoteHostSessionCount) {
  let neutralizedNames = new Set([
    "GIT_CONFIG",
    "GIT_ATTR_SOURCE",
    ...Object.keys(UNSET_REFERENCE_BACKEND_ENV),
  ]);
  let filtered = Object.keys(remoteHostSessionCount).filter((key) => neutralizedNames.has(key.toUpperCase()));
  return {
    ...remoteHostSessionCount,
    ...Object.fromEntries(filtered.map((varName) => [varName, undefined])),
    GIT_CONFIG: undefined,
    GIT_ATTR_SOURCE: undefined,
    ...UNSET_REFERENCE_BACKEND_ENV,
  };
}
//@ chunk-fepf8jp6.js:15211-15273 placement
function isUnsafeReferenceBackend(backend) {
  return backend !== undefined && backend !== "files" && backend !== "reftable";
}
//@ chunk-fepf8jp6.js:15273-15491 placement
function classifyConfigFile(filePath, gitConfigPaths, gitProtectedPaths) {
  return {
    path: filePath,
    kind: gitConfigPaths.includes(filePath)
      ? "user_level"
      : gitProtectedPaths.fixed.includes(filePath)
        ? "repository"
        : "included",
    ground: filePath.includes("\uFFFD")
      ? "not_text"
      : !gitProtectedPaths.fixed.includes(filePath) &&
          gitProtectedPaths.roots.some((root) => isPathInside(root, filePath))
        ? "inside"
        : "indirect",
  };
}
//@ chunk-fepf8jp6.js:15491-15557 placement
var CONFIG_SCOPE_ORDER = ["user_level", "system", "condition", "unknown", "repository"];
//@ chunk-fepf8jp6.js:15557-16569 placement
function auditRefStorageSetting(keptBy) {
  if (keptBy === "ignored_setting")
    return "a git configuration file other than this repository\u2019s own config sets extensions.refStorage. git ignores that key there, but this upload does not start while git lists it with a location. The file is one of these: the system-wide git configuration, ~/.gitconfig, ~/.config/git/config (or $XDG_CONFIG_HOME/git/config), what GIT_CONFIG_GLOBAL or GIT_CONFIG_SYSTEM names, the repository\u2019s config.worktree, or a file that one of them or the repository\u2019s config includes. Remove the key from that file and retry";
  return keptBy === "variable"
    ? "the variable GIT_REFERENCE_BACKEND tells git to keep branches and tags in another place, which this upload does not read; start claude without that variable (a Claude Code settings file may also set it, in its env block)"
    : "this repository\u2019s own git configuration (extensions.refStorage) keeps its branches and tags in another place, which this upload does not read; work from an ordinary clone of the repository";
}
//@ chunk-fepf8jp6.js:16569-21412 placement
/**
 * 检查仓库 git 布局（common dir、worktree、admin dir）是否可信
 */
async function inspectGitLayout(
  launchDir,
  signal,
  {
    linkedTrees = false,
    bound = linkedTrees,
    startsInProject = false,
    perWorktreeConfig = "refuse",
    notesBareRepository = false,
    probes = currentGitBinaryState(),
    holder,
    namedCommonDirs = [],
    findKeyedFolder = findCanonicalGitRootUncached,
    keepsListedSettings = false,
  } = {},
) {
  if (namedCommonDirs.some((commonDir) => !isAbsolute(commonDir)))
    return {
      kind: "failed",
      detail: "a common directory named for this tree is not an absolute path",
    };
  let gitProbes = probes.screenMemo === undefined ? new GitBinaryError("operation") : probes;
  let resolvedLaunchDir = hasBackslash(launchDir) ? null : await realpath(launchDir).catch(() => null);
  if (resolvedLaunchDir === null)
    return {
      kind: "failed",
      detail: "the launch directory could not be resolved",
      cause: "launch_folder_unresolved",
    };
  if (bound) {
    if (
      (await checkSessionTempRoot(resolvedLaunchDir)).some(
        (tempRoot) => isPathInside(tempRoot, resolvedLaunchDir) || isPathInside(tempRoot, launchDir),
      )
    )
      return {
        kind: "tampered",
        misplaced: "temp_root",
        gitDir: "",
        commonDir: "",
      };
  }
  if (
    [buildGitEnv(undefined), process.env].some((envVars) =>
      isUnsafeReferenceBackend(getEnvCaseInsensitive(envVars, "GIT_REFERENCE_BACKEND")),
    )
  )
    return {
      kind: "tampered",
      misplaced: "ref_storage",
      keptBy: "variable",
      gitDir: "",
      commonDir: "",
    };
  let gitFile = await resolveGitFile(resolvedLaunchDir);
  if (gitFile.kind === "refuse" || (gitFile.kind === "chain" && !linkedTrees))
    return {
      kind: "tampered",
      misplaced: gitFile.kind === "refuse" && gitFile.why !== "git_file" ? "linked_worktree" : "git_file",
      gitDir: gitFile.adminDir ?? "",
      commonDir: gitFile.kind === "chain" ? gitFile.commonDir : "",
      ...(gitFile.kind === "refuse" && {
        detail: gitFile.why,
      }),
    };
  if (gitFile.kind === "chain" && namedCommonDirs.some((commonDir) => commonDir !== gitFile.commonDir))
    return {
      kind: "tampered",
      misplaced: "common_dir",
      gitDir: gitFile.adminDir,
      commonDir: gitFile.commonDir,
    };
  let checkKeyedFolder = async (target) => {
    let results = await Promise.all(
      normalizeCaseForComparison_2([launchDir, resolvedLaunchDir]).map((dir) =>
        isSameGitDir(target, resolvedLaunchDir, findKeyedFolder(dir)),
      ),
    );
    return results.includes(false) ? false : results.includes("unresolved") ? "unresolved" : true;
  };
  if (gitFile.kind === "chain") {
    let keyedResult = await checkKeyedFolder({
      resolved: gitFile.commonDir,
    });
    if (keyedResult !== true)
      logEvent("tengu_git_layout_keyed_elsewhere", {
        bound,
        unresolved: keyedResult === "unresolved",
      });
    if (keyedResult === "unresolved" && bound)
      return {
        kind: "failed",
        detail: "the folder that keeps this tree\u2019s trust could not be resolved",
        cause: "keyed_folder_unresolved",
      };
    if (keyedResult === false && bound)
      return {
        kind: "tampered",
        misplaced: "linked_worktree",
        gitDir: gitFile.adminDir,
        commonDir: gitFile.commonDir,
        detail: "keyed_elsewhere",
      };
  }
  if (gitFile.kind === "not_file" && namedCommonDirs.length > 0) {
    let gitDirPath = join(resolvedLaunchDir, ".git");
    let dotGitStats = await statDotGit(resolvedLaunchDir);
    if (dotGitStats.kind === "unreadable")
      return {
        kind: "failed",
        detail: dotGitStats.detail,
      };
    return dotGitStats.kind === "directory"
      ? {
          kind: "tampered",
          misplaced: "git_dir",
          gitDir: gitDirPath,
          commonDir: gitDirPath,
        }
      : {
          kind: "failed",
          detail: "this linked working tree's .git file is missing",
        };
  }
  let [gitDirHold = "not_held", commonDirHold = "not_held"] =
    holder === undefined
      ? []
      : await Promise.all(
          (gitFile.kind === "chain"
            ? [gitFile.adminDir, gitFile.commonDir]
            : [join(resolvedLaunchDir, ".git")]
          ).map((dirPath) => holder.hold(dirPath)),
        );
  let reachRoots = bound
    ? reachRootsForRepo(resolvedLaunchDir, [
        ...findEnclosingRepos(resolvedLaunchDir),
        ...(gitFile.kind === "chain" ? [checkoutDirOfGitDir(gitFile.commonDir)] : []),
      ])
    : undefined;
  let revParse = (revParseArgs) =>
    listGitRefs(launchDir, ["rev-parse", ...revParseArgs], {
      hardened: true,
      signal,
      probes: gitProbes,
      stripFinalNewline: false,
      env: {
        GIT_CEILING_DIRECTORIES: gitDirComparisonKey(resolvedLaunchDir, launchDir),
      },
      ...(reachRoots !== undefined && {
        reach: reachRoots,
        startsInProject,
      }),
    });
  let [gitDirResult, commonDirResult, topLevelResult] = await Promise.all([
    revParse(["--absolute-git-dir"]),
    revParse(["--path-format=absolute", "--git-common-dir"]),
    revParse(["--show-toplevel"]),
  ]);
  let gitDirPath = stripLineEnding(gitDirResult.stdout);
  let commonDirPath = stripLineEnding(commonDirResult.stdout);
  let topLevelPath = stripLineEnding(topLevelResult.stdout);
  if (
    [gitDirResult, commonDirResult, topLevelResult].some(({ code }) => code !== 0) ||
    gitDirPath === null ||
    commonDirPath === null ||
    topLevelPath === null ||
    !isAbsolute(gitDirPath) ||
    !isAbsolute(topLevelPath)
  ) {
    let found = [gitDirResult, commonDirResult, topLevelResult].find(({ stderr }) => stderr !== "");
    let failureCause =
      gitDirResult.exitCode === 126 || gitDirResult.exitCode === 127
        ? reachRoots !== undefined && !startsInProject
          ? "git_did_not_run_from_outside"
          : "git_did_not_run"
        : found && firstGitFailureClass(seenStderr(found));
    return {
      kind: "failed",
      detail: getFirstLine((found?.stderr ?? gitDirResult.stdout).trim()),
      ...(failureCause !== undefined && {
        cause: failureCause,
      }),
      ...(gitDirResult.code === 127 &&
        gitDirResult.stderr.startsWith(GIT_NOT_FOUND_MESSAGE) && {
          why: "git_not_found",
          ...(gitDirResult.stderr !== GIT_NOT_FOUND_MESSAGE && {
            withinReach: true,
          }),
        }),
      ...(gitDirResult.stderr === IN_TREE_SETTINGS_UNREADABLE_MESSAGE && {
        why: "settings_unreadable",
      }),
    };
  }
  if (getFirstLine(commonDirPath) === "--path-format=absolute")
    return {
      kind: "tampered",
      misplaced: "old_git",
      gitDir: gitDirPath,
      commonDir: commonDirPath,
    };
  if (!isAbsolute(commonDirPath))
    return {
      kind: "tampered",
      misplaced: "common_dir",
      gitDir: gitDirPath,
      commonDir: commonDirPath,
    };
  let launchDotGit = await statDotGit(launchDir);
  if (launchDotGit.kind === "unreadable")
    return {
      kind: "failed",
      detail: launchDotGit.detail,
    };
  if (launchDotGit.kind === "directory") {
    if (!gitDirIdentityHeld(gitDirHold, launchDotGit.id)) return gitDirChangedFailure(gitDirHold);
    if (launchDotGit.id !== (await getFileIdentity_2(gitDirPath)))
      return {
        kind: "tampered",
        misplaced: "git_dir",
        gitDir: gitDirPath,
        commonDir: commonDirPath,
      };
    if (commonDirPath !== gitDirPath)
      return {
        kind: "tampered",
        misplaced: "common_dir",
        gitDir: gitDirPath,
        commonDir: commonDirPath,
      };
  }
  let unsupportedLayout = await detectUnsupportedLayout(commonDirPath);
  if (unsupportedLayout !== null)
    return {
      kind: "tampered",
      misplaced: unsupportedLayout,
      gitDir: gitDirPath,
      commonDir: commonDirPath,
    };
  if (launchDotGit.kind === "not_a_directory") {
    if (!linkedTrees || gitFile.kind !== "chain")
      return {
        kind: "tampered",
        misplaced: "git_file",
        gitDir: gitDirPath,
        commonDir: commonDirPath,
        detail: "git_file",
      };
    let linkedWorktreeGitDir = await resolveLinkedWorktreeGitDir(
      resolvedLaunchDir,
      gitDirPath,
      commonDirPath,
      gitFile,
    );
    if (linkedWorktreeGitDir.kind !== "vouched")
      return linkedWorktreeGitDir.kind === "unread"
        ? {
            kind: "failed",
            detail: linkedWorktreeGitDir.detail,
            why: "changed_under_read",
          }
        : {
            kind: "tampered",
            misplaced: linkedWorktreeGitDir.kind,
            gitDir: gitDirPath,
            commonDir: commonDirPath,
            detail:
              linkedWorktreeGitDir.kind === "linked_worktree" ? linkedWorktreeGitDir.detail : "git_file",
          };
    let commonDirIdentity = {
      resolved: linkedWorktreeGitDir.commonDir,
      id: linkedWorktreeGitDir.commonDirId,
    };
    if (
      bound &&
      !(
        sameIdentity(commonDirIdentity, {
          id: await getFileIdentity_2(gitFile.commonDir),
          resolved: gitFile.commonDir,
        }) && (await checkKeyedFolder(commonDirIdentity)) === true
      )
    )
      return {
        kind: "failed",
        detail: "the git directory changed while it was read",
        why: "changed_under_read",
      };
    if (
      !gitDirIdentityHeld(gitDirHold, linkedWorktreeGitDir.gitDirId) ||
      !gitDirIdentityHeld(commonDirHold, linkedWorktreeGitDir.commonDirId)
    )
      return gitDirChangedFailure(gitDirHold, commonDirHold);
    return auditGitDirConfig(
      launchDir,
      {
        gitDir: linkedWorktreeGitDir.gitDir,
        gitDirId: linkedWorktreeGitDir.gitDirId,
        ...(linkedWorktreeGitDir.gitDirBorn !== undefined && {
          gitDirBorn: linkedWorktreeGitDir.gitDirBorn,
        }),
        commonDir: linkedWorktreeGitDir.commonDir,
        commonDirId: linkedWorktreeGitDir.commonDirId,
        ...(linkedWorktreeGitDir.commonDirBorn !== undefined && {
          commonDirBorn: linkedWorktreeGitDir.commonDirBorn,
        }),
        workTree: topLevelPath,
        checkout: "linked",
        bound,
        ...(startsInProject && {
          startsInProject,
        }),
      },
      resolvedLaunchDir,
      signal,
      gitProbes,
      {
        perWorktreeConfig,
        notesBareRepository,
      },
    );
  }
  return auditGitDirConfig(
    launchDir,
    {
      gitDir: gitDirPath,
      gitDirId: launchDotGit.id,
      ...(launchDotGit.born !== undefined && {
        gitDirBorn: launchDotGit.born,
      }),
      commonDir: commonDirPath,
      workTree: topLevelPath,
      checkout: "main",
      bound,
      ...(startsInProject && {
        startsInProject,
      }),
    },
    resolvedLaunchDir,
    signal,
    gitProbes,
    {
      keepsListedSettings,
    },
  );
}
//@ chunk-fepf8jp6.js:21412-23240 placement
async function auditGitDirConfig(
  launchDir,
  layout,
  resolvedLaunchDir,
  signal,
  probes,
  { perWorktreeConfig = "refuse", notesBareRepository = false, keepsListedSettings = false },
) {
  let { gitDir, commonDir, workTree } = layout;
  let [workTreeIdentity, launchIdentity] = await (workTree === toPosixSpelling(resolvedLaunchDir)
    ? getFileIdentity_2(resolvedLaunchDir).then((fileIdentity) => [fileIdentity, fileIdentity])
    : Promise.all([getFileIdentity_2(workTree), getFileIdentity_2(resolvedLaunchDir)]));
  if (launchIdentity === null || workTreeIdentity !== launchIdentity)
    return {
      kind: "tampered",
      misplaced: "work_tree",
      gitDir,
      commonDir,
      ...(launchIdentity === null && {
        unexamined: true,
      }),
    };
  let respelledLayout = {
    ...layout,
    workTree: toPosixSpelling(resolvedLaunchDir),
    workTreeId: launchIdentity,
    ...(workTree !== toPosixSpelling(resolvedLaunchDir) && {
      workTreeRespelled: true,
    }),
  };
  let storeStamps = await objectsDirFingerprint(commonDir);
  if (storeStamps.info === "absent" || storeStamps.pack === "absent")
    return {
      kind: "failed",
      detail:
        "objects/info or objects/pack is missing from the git directory (running git init again in the checkout puts them back)",
      cause: "git_dir_objects_folder_missing",
    };
  let worktreeConfigKind =
    respelledLayout.checkout === "linked"
      ? await classifyWorktreeConfig(launchDir, respelledLayout, signal, probes)
      : "absent";
  if (worktreeConfigKind === "unread")
    return {
      kind: "failed",
      detail: "could not read extensions.worktreeConfig",
    };
  if (worktreeConfigKind === "file" || (worktreeConfigKind !== "absent" && perWorktreeConfig === "refuse"))
    return {
      kind: "tampered",
      misplaced: "linked_worktree",
      gitDir,
      commonDir,
      detail: "worktree_config",
    };
  let layoutWithWorktreeConfig =
    worktreeConfigKind === "absent"
      ? respelledLayout
      : {
          ...respelledLayout,
          worktreeConfig: worktreeConfigKind,
        };
  let configPaths = [join(commonDir, "config"), join(gitDir, "config.worktree")];
  let settingsStamps = keepsListedSettings ? await statFingerprint(configPaths) : null;
  let configScan = await listGitConfigInForce(launchDir, layoutWithWorktreeConfig, signal, probes);
  switch (configScan.kind) {
    case "unlistable":
      return {
        kind: "failed",
        detail: configScan.detail,
      };
    case "many_includes":
      return {
        kind: "tampered",
        misplaced: "many_includes",
        gitDir,
        commonDir,
      };
    case "ref_storage":
      return {
        kind: "tampered",
        misplaced: "ref_storage",
        keptBy: configScan.keptBy,
        gitDir,
        commonDir,
      };
    case "reftable":
      return {
        kind: "tampered",
        misplaced: "reftable",
        gitDir,
        commonDir,
      };
    case "included":
      return {
        kind: "tampered",
        misplaced: "included_config",
        writable: `${configScan.configFile.kind}_${configScan.configFile.ground}`,
        configFile: configScan.configFile,
        ...(configScan.includedBy !== undefined && {
          includedBy: configScan.includedBy,
        }),
        gitDir,
        commonDir,
      };
    case "pins": {
      let settingsStampsAfter =
        settingsStamps === null || configScan.listed.some(({ key }) => key.startsWith("includeif.onbranch:"))
          ? null
          : await statFingerprint(configScan.settingsFiles);
      return {
        kind: "read",
        layout: {
          ...layoutWithWorktreeConfig,
          storeStamps,
          ...configScan.pins,
          ...{},
          ...{},
        },
      };
    }
  }
}
//@ chunk-fepf8jp6.js:23240-23349 placement
function isCommonDirConfigFile(filePath, { commonDir, workTree }) {
  let fileUrl = resolveFileUrl(filePath, workTree);
  return (
    fileUrl !== null &&
    basename(fileUrl) === "config" &&
    isPathInside(commonDir, fileUrl) &&
    isPathInside(dirname(fileUrl), commonDir)
  );
}
//@ chunk-fepf8jp6.js:23349-23434 placement
var HOOK_CONFIG_KEY_RE; // deferred: uses NULL_HOOKS_PATH_PATTERN (../../gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var declaredHookNames;
deferInit("chunk-fepf8jp6.js:23349", () => {
  HOOK_CONFIG_KEY_RE = /^hook\.(?:(.*)\.)?(?:command|event|enabled)$/s;
  declaredHookNames = new Set(mapped.map(([hookName]) => hookName));
});
//@ chunk-fepf8jp6.js:23434-23466 placement
function isDeclaredHookName(name) {
  return declaredHookNames.has(name);
}
//@ chunk-fepf8jp6.js:23466-23541 placement
function hookOwnerOfKey(name) {
  let match = isDeclaredHookName(name) ? null : HOOK_CONFIG_KEY_RE.exec(name);
  return match === null ? undefined : (match[1] ?? "");
}
//@ chunk-fepf8jp6.js:23541-26297 placement
async function listGitConfigInForce(launchDir, layout, signal, probes) {
  let unlistable = {
    kind: "unlistable",
    detail: "could not list the configuration in force",
  };
  let reachRoots = reachForBoundSession(layout);
  let screenMemo = probes.screenMemo ?? createReachCollector();
  let gitConfig = (args) =>
    listGitRefs(launchDir, args, {
      hardened: true,
      layout,
      signal,
      probes,
      ...(reachRoots !== undefined && {
        reachRoots,
        screenMemo,
      }),
    });
  let listConfig = async (extraArgs) => {
    let [listResult, includesResult] = await Promise.all([
      gitConfig(["config", "-z", "--show-origin", ...extraArgs, "--list"]),
      gitConfig([
        "config",
        "-z",
        "--show-origin",
        "--type=path",
        ...extraArgs,
        "--get-regexp",
        INCLUDE_PATH_CONFIG_KEY_RE,
      ]),
    ]);
    let cannotChangeTo =
      extraArgs.length > 0 && listResult.exitCode === 128 && !isCannotChangeToError(listResult);
    if (
      (listResult.code !== 0 && !cannotChangeTo) ||
      (includesResult.code !== 0 && includesResult.exitCode === undefined)
    )
      return null;
    let entries = cannotChangeTo ? [] : parseGitConfigNullList(listResult.stdout);
    let flattened = [
      ...entries.filter(({ key }) => regExp.test(key)),
      ...(includesResult.code === 0 ? parseGitConfigNullList(includesResult.stdout) : []),
    ].flatMap(({ origin, key, value }) =>
      resolveIncludePaths(value, origin, layout.workTree).map((target) => ({
        holder: origin,
        key,
        target,
      })),
    );
    return {
      keys: entries,
      targets: flattened.map(({ target }) => target),
      directives: flattened,
    };
  };
  let [systemConfig, globalPath, systemPath] = await Promise.all([
    listConfig([]),
    gitConfig(["var", "GIT_CONFIG_GLOBAL"]),
    gitConfig(["var", "GIT_CONFIG_SYSTEM"]),
  ]);
  if (systemConfig === null) return unlistable;
  let entries = systemConfig.keys.filter(({ key }) => key === "extensions.refstorage");
  let isOwnConfig = (filePath) =>
    resolveFileUrl(filePath, layout.workTree) === null || isCommonDirConfigFile(filePath, layout);
  let filtered = entries.filter(({ value }) => isUnsafeReferenceBackend(value));
  if (filtered.length > 0)
    return {
      kind: "ref_storage",
      keptBy: filtered.some(({ origin }) => isOwnConfig(origin)) ? "setting" : "ignored_setting",
    };
  if (hasReftableOrigin(entries, isOwnConfig))
    return {
      kind: "reftable",
    };
  let gitProtectedPaths = await collectGitProtectedPaths(
    layout.workTree,
    {
      GIT_DIR: layout.gitDir,
      GIT_COMMON_DIR: layout.commonDir,
    },
    layout.workTree,
  );
  if (gitProtectedPaths === null) return unlistable;
  let systemPathLines =
    systemPath.code === 0
      ? systemPath.stdout.split(`
`)
      : [];
  let extraArg = null;
  let gitEnv = buildGitEnv(undefined);
  let gitConfigPathsArgs = [layout.workTree, extraArg, gitEnv];
  let gitConfigPaths = getGitConfigPaths(
    [
      ...(globalPath.code === 0
        ? globalPath.stdout.split(`
`)
        : []),
      ...systemPathLines,
    ],
    ...gitConfigPathsArgs,
  );
  let systemFiles = systemGitConfigPaths(systemPathLines, ...gitConfigPathsArgs);
  let allConfigSources = [
    ...systemConfig.keys.map(({ origin }) => resolveFileUrl(origin, layout.workTree)),
    ...gitConfigPaths,
  ];
  let classifyIncluded = (filePath) => ({
    kind: "included",
    configFile: classifyConfigFile(filePath, gitConfigPaths, gitProtectedPaths),
    ...(!gitConfigPaths.includes(filePath) &&
      !gitProtectedPaths.fixed.includes(filePath) && {
        includedBy: attributeIncludeSource(filePath, systemConfig.directives, {
          workTree: layout.workTree,
          userFiles: gitConfigPaths,
          systemFiles,
          fromOwnConfig: isOwnConfig,
        }),
      }),
  });
  let filePath = allConfigSources.find((source) => source?.includes("\uFFFD"));
  if (filePath !== undefined && filePath !== null) return classifyIncluded(filePath);
  let filePath_2 = await findReachableProtectedPath(gitProtectedPaths, allConfigSources);
  if (filePath_2 !== undefined) return filePath_2 === null ? unlistable : classifyIncluded(filePath_2);
  let includedConfigs = await collectIncludedConfigs(
    systemConfig.targets,
    (includeFilePath) => listConfig(["--file", includeFilePath]),
    (targets) => findReachableProtectedPath(gitProtectedPaths, targets),
  );
  if (includedConfigs === null) return unlistable;
  if ("tooMany" in includedConfigs)
    return {
      kind: "many_includes",
    };
  if ("contributes" in includedConfigs) return classifyIncluded(includedConfigs.contributes);
  let allEntries = [...systemConfig.keys, ...includedConfigs.keys];
  let filterDrivers = ((driverPattern) =>
    normalizeCaseForComparison_2(
      allEntries.flatMap(({ key }) => {
        let driverName = driverPattern.exec(key)?.[1];
        return driverName === undefined ? [] : [driverName];
      }),
    ))(/^filter\.(.*)\.(?:clean|smudge|process|required)$/s);
  let hookNames = normalizeCaseForComparison_2(allEntries.flatMap(({ key }) => hookOwnerOfKey(key) ?? []));
  if ([...filterDrivers, ...hookNames].some((name) => name.includes("\uFFFD")))
    return {
      kind: "unlistable",
      detail: INVALID_UTF8_NAME_DETAIL,
    };
  let configPins = [
    ...filterDrivers.flatMap((driverName) => [
      [`filter.${driverName}.clean`, ""],
      [`filter.${driverName}.smudge`, ""],
      [`filter.${driverName}.process`, ""],
      [`filter.${driverName}.required`, "false"],
    ]),
    ...hookNames.flatMap((hookName) => [
      [`hook.${hookName}.enabled`, "false"],
      [`hook.${hookName}.event`, ""],
    ]),
  ];
  return {
    kind: "pins",
    listed: systemConfig.keys,
    settingsFiles: normalizeCaseForComparison_2(
      [...allConfigSources, ...systemConfig.targets].filter((path) => path !== null),
    ),
    pins: {
      filterDrivers,
      attributeSetting: readAttributesConfig(systemConfig.keys, includedConfigs.keys, gitConfigPaths, layout),
      configPins: Object.fromEntries([
        ["GIT_CONFIG_COUNT", String(configPins.length)],
        ...configPins.flatMap(([pinKey, pinValue], pinIndex) => [
          [`GIT_CONFIG_KEY_${pinIndex}`, pinKey],
          [`GIT_CONFIG_VALUE_${pinIndex}`, pinValue],
        ]),
      ]),
    },
  };
}
//@ chunk-fepf8jp6.js:26297-26321 placement
/**
 * include 展开的轮数上限、文件数上限与集合大小上限。
 */
var MAX_INCLUDE_ROUNDS = 8;
var MAX_INCLUDE_FILES = 32;
var MAX_INCLUDE_SET_SIZE = 4096;
//@ chunk-fepf8jp6.js:26321-26739 placement
/**
 * 判断 include 目标由哪类配置引入。
 */
function attributeIncludeSource(fileUrl, directives, { workTree, userFiles, systemFiles, fromOwnConfig }) {
  let resolvedTarget = resolve(fileUrl);
  let ownConfigScope = directives.some(({ target }) => fromOwnConfig(`file:${target}`))
    ? "unknown"
    : "repository";
  let scopes = new Set(
    directives
      .filter(({ target }) => resolve(target) === resolvedTarget)
      .map(({ holder, key }) => {
        let fileUrl = resolveFileUrl(holder, workTree);
        if (fileUrl === null) return "unknown";
        if (!userFiles.includes(fileUrl)) return fromOwnConfig(holder) ? ownConfigScope : "unknown";
        if (GIT_ISOLATION_CONFIG_ARGS.test(key)) return "condition";
        return systemFiles.includes(fileUrl) ? "system" : "user_level";
      }),
  );
  return CONFIG_SCOPE_ORDER.find((scope) => scopes.has(scope)) ?? "unknown";
}
//@ chunk-fepf8jp6.js:26739-27416 placement
/**
 * 逐层追踪 include 的配置文件（限层数与数量）。
 */
async function collectIncludedConfigs(targets, readConfigFile, checkReachable) {
  let isPresent = (value) => value !== null;
  let seen = new Set(targets.filter(isPresent));
  let collectedKeys = [];
  let pending = [...seen];
  let fileCount = 0;
  for (let round = 0; pending.length > 0; round += 1) {
    if (round === MAX_INCLUDE_ROUNDS || seen.size > MAX_INCLUDE_SET_SIZE)
      return {
        tooMany: true,
      };
    let found = pending.find((badPath) => badPath.includes("\uFFFD"));
    if (found !== undefined)
      return {
        contributes: found,
      };
    let reachable = await checkReachable(pending);
    if (reachable !== undefined)
      return reachable === null
        ? null
        : {
            contributes: reachable,
          };
    let results = await Promise.all(
      pending.map(async (target) =>
        !isWindowsNonDrivePath(target) && (await stat(target).catch(() => null))?.isFile() ? target : null,
      ),
    );
    fileCount += countWhere(results, isPresent);
    if (fileCount > MAX_INCLUDE_FILES)
      return {
        tooMany: true,
      };
    let results_2 = await Promise.all(results.filter(isPresent).map(readConfigFile));
    if (results_2.some((result) => result === null)) return null;
    collectedKeys.push(...results_2.flatMap((result) => result?.keys ?? []));
    pending = normalizeCaseForComparison_2(
      results_2.flatMap((result) => result?.targets ?? []).filter(isPresent),
    ).filter((target) => !seen.has(target));
    pending.forEach((target) => seen.add(target));
  }
  return {
    files: [...seen],
    keys: collectedKeys,
  };
}
//@ chunk-fepf8jp6.js:27416-27630 placement
function parseGitConfigNullList(stdout) {
  let parts = stdout.split("\x00");
  return Array.from(
    {
      length: Math.floor(parts.length / 2),
    },
    (origin, entryIndex) => {
      let keyAndValue = parts[2 * entryIndex + 1];
      let index = keyAndValue.indexOf(`
`);
      return {
        origin: parts[2 * entryIndex],
        key: index < 0 ? keyAndValue : keyAndValue.slice(0, index),
        value: index < 0 ? "" : keyAndValue.slice(index + 1),
        valueless: index < 0,
      };
    },
  );
}
//@ chunk-fepf8jp6.js:27630-27797 placement
function resolveIncludePaths(includeValue, originUrl, workTree) {
  let match = /^~[^/]*\//.exec(includeValue);
  if (match !== null)
    return getHomeDirCandidates(buildGitEnv(undefined)).map((homeDir) =>
      resolveRelative(workTree, `${homeDir}${sep}${includeValue.slice(match[0].length)}`),
    );
  let includePath = resolveIncludePath(includeValue, originUrl, workTree);
  return isAbsolute(includePath) ? [includePath] : [];
}
//@ chunk-fepf8jp6.js:27797-27866 placement (2.1.88 match: _temp2, 1)
function resolveFileUrl(filePath, workTree) {
  return filePath.startsWith("file:") ? resolveRelative(workTree, filePath.slice(5)) : null;
}
//@ chunk-fepf8jp6.js:27866-28105 placement
function resolveIncludePath(includePath, origin, workTree) {
  let match = /^~([^/]*)\//.exec(includePath);
  if (match !== null)
    return match[1] === "" || match[1] === currentUserName()
      ? `${homedir()}${sep}${includePath.slice(match[0].length)}`
      : includePath;
  if (isAbsolute(includePath) || includePath.startsWith("%(prefix)/")) return includePath;
  return `${origin.startsWith("file:") ? dirname(resolveRelative(workTree, origin.slice(5))) : workTree}${sep}${includePath}`;
}
//@ chunk-fepf8jp6.js:28105-28184 placement
var INVALID_UTF8_NAME_DETAIL = "a configured filter driver or hook has a name that is not valid UTF-8";
//@ chunk-fepf8jp6.js:28184-28224 placement
var KNOWN_SAFE_FILTER_DRIVERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fepf8jp6.js:28184", () => {
  KNOWN_SAFE_FILTER_DRIVERS = new Set(["unset", "unspecified"]);
});
//@ chunk-fepf8jp6.js:28224-28426 placement
/**
 * 涉及的 filter 驱动都是已知安全的。
 */
function hasOnlyKnownFilterDrivers(layout, env = buildGitEnv(undefined)) {
  let gitConfigFromEnv = readGitConfigFromEnv(env);
  return (
    layout.filterDrivers !== undefined &&
    gitConfigFromEnv !== null &&
    ![
      ...layout.filterDrivers,
      ...gitConfigFromEnv.flatMap(({ key }) => /^filter\.(.+)\.[^.]*$/is.exec(key.trim())?.[1] ?? []),
    ].some((driverName) => KNOWN_SAFE_FILTER_DRIVERS.has(driverName))
  );
}
//@ chunk-fepf8jp6.js:28426-28484 placement
function currentUserName() {
  try {
    return userInfo().username;
  } catch {
    return null;
  }
}
//@ chunk-fepf8jp6.js:28484-28571 placement
/**
 * 判断记录中的工作树 id 与当前实际身份不一致（工作树已被替换）。
 */
async function workTreeReplacedSinceRecorded(layout) {
  return layout.workTreeId !== undefined && layout.workTreeId !== (await getFileIdentity_2(layout.workTree));
}
//@ chunk-fepf8jp6.js:33704-33875 placement
var CHECKOUT_SHAPE_CONFIG_KEYS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fepf8jp6.js:33704", () => {
  CHECKOUT_SHAPE_CONFIG_KEYS_2 = new Set([
    "core.autocrlf",
    "core.eol",
    "core.safecrlf",
    "core.symlinks",
    "core.filemode",
    "core.ignorecase",
    "core.precomposeunicode",
    "core.checkstat",
    "core.trustctime",
  ]);
});
//@ chunk-fepf8jp6.js:33875-34002 placement
function quoteGitConfigValue(value) {
  return `"${value
    .replace(/[\\"]/g, (char) => `\\${char}`)
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\x08/g, "\\b")}"`;
}
//@ chunk-fepf8jp6.js:34002-34053 placement
/**
 * 影响检出形态的 git 配置键（core.excludesfile、core.attributesfile）。
 */
var CHECKOUT_SHAPE_CONFIG_KEYS = ["core.excludesfile", "core.attributesfile"];
//@ chunk-fepf8jp6.js:34053-34283 placement
function lastGlobalOrSystemValue(stdout) {
  let parts = stdout.split("\x00");
  let list = Array.from(
    {
      length: Math.floor((parts.length - 1) / 3),
    },
    (entry, entryIndex) => parts.slice(3 * entryIndex, 3 * entryIndex + 3),
  );
  let isUserLevel = ([scope]) => scope === "global" || scope === "system";
  let last = list.findLast(isUserLevel);
  return {
    origin: last?.[1],
    value: last?.[2],
    passedOver: list.some((entry) => !isUserLevel(entry)),
  };
}
//@ chunk-fepf8jp6.js:34283-34358 placement
/**
 * 合法的可打印 git 配置值正则，以及配置文件大小、层级与总拷贝上限。
 */
var PRINTABLE_CONFIG_VALUE_RE = /^[^\u0000-\u001f\u007f]{1,4096}$/;
var MAX_CONFIG_FILE_BYTES = 268435456;
var MAX_PLACEMENT_DEPTH = 64;
var MAX_CONFIG_COPY_BYTES = 1073741824;
export {
  MAX_PLACEMENT_DEPTH,
  listGitRefs,
  workTreeReplacedSinceRecorded,
  CHECKOUT_SHAPE_CONFIG_KEYS,
  parseGitConfigNullList,
  CHECKOUT_SHAPE_CONFIG_KEYS_2,
  lastGlobalOrSystemValue,
  PRINTABLE_CONFIG_VALUE_RE,
  MAX_CONFIG_COPY_BYTES,
  MAX_CONFIG_FILE_BYTES,
  quoteGitConfigValue,
  resolveFileUrl,
  resolveIncludePaths,
  MAX_INCLUDE_FILES,
  auditEnvironment,
  UNSET_REFERENCE_BACKEND_ENV,
  inspectGitLayout,
  runGitForAudit,
  buildAuditEnv,
  auditRefStorageSetting,
  hasOnlyKnownFilterDrivers,
};
