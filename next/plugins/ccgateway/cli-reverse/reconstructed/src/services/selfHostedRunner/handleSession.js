/**
 * services/selfHostedRunner/handleSession.ts
 *
 * 2.1.316 新增：自托管 runner 处理单个会话的主流程（准备源码与配置、启动 claude 子进程、监控、清理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (25)
 * attribution: placement 25
 */
import { join, dirname, sep, normalize } from "path";
import { homedir } from "os";
import { rm, mkdir, lstat, realpath, unlink, writeFile } from "fs/promises";
import { spawn } from "child_process";
import { createInterface } from "readline";
import {
  GOVERNED_REPRESENT_RETRY_MS,
  splitMountRouting,
  gitConfigOwnershipLabel,
  restoreHookStubs,
  ignoreLocalSettingsInGit,
  isLoopbackHttpUrl,
  formatSourcesOnHostWarning,
  formatAskpassWarning,
  governedNoProxyHosts,
  classifySourceRouting,
  branchesByRepo,
  gitRepositorySources,
  lowercaseRepoName,
  shouldSanitizeCanonical,
  sanitizeCanonicalRepo,
  runGitConfigLocal,
  setCredentialHelper,
  getRemoteOriginUrls,
  setHostCredentialHelper,
  reconcileGovernedPushUrls,
  chooseChildCwd,
  isLoopbackUrl,
  BAD_REST_MOUNT_WARNING,
  GOVERNED_REPRESENT_RETRY_STEPS,
  GOVERNED_REPRESENT_RETRY_SLACK_MS,
  retryGitOperation,
  setUrlInsteadOf,
} from "./governedGit.js";
import {
  ALLOWED_SIGNING_PROGRAMS,
  isSessionJwtFresh,
  getSessionClaudeConfigDir,
  lifecycleHookGitConfig,
  INGRESS_TOKEN_DEADLINE_MS,
  getToolServerConfigDir,
  writeBestEffort,
  validateLauncherHooks,
  INGRESS_TOKEN_FILE_TIMEOUT_MS,
  isGreaterThanOne,
  getIngressTokenTempPrefix,
  LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
  writeSessionIngressTokenFile,
  customOauthUrlSuffix,
  materializeSessionGitConfig,
  sessionGitConfig,
  writeFileAtomicDefaultMode,
  overlayEntriesWithoutHooks,
  runGit,
  DEFAULT_GIT_SLOTS,
  serializeByKey,
  CHECKOUT_FAILURE_NOTES,
  SourceRefNotFoundError,
  classifySourcePrepFailure,
  runWithSlots,
  DEFAULT_HOOK_SLOTS,
  NO_SLOTS_AVAILABLE,
  MIN_GIT_VERSION_FOR_MOUNT,
  PUSH_ON_RELEASE_TIMEOUT_MS,
  tagFailureStage,
  EMPTY_MCP_CONFIG_JSON,
  MCP_CONFIG_DELIVERED_JSON,
  writeLauncherSettings,
  POST_HOOK_TIMEOUT_MS,
  CHECKOUT_DISPLAY_LIMIT,
  setupFailureKindOf,
  SETUP_STEP_DEADLINE_MS,
  removeSessionState,
  SIGKILL_DELAY_MS,
  cleanupSessionIngressTokenFiles,
  getStartupTimeoutMs,
  CHILD_EXTRA_FORWARDED_FLAGS,
  CHILD_FORWARDED_FLAGS,
  envPositiveMs,
} from "./launcherHooks.js";
import {
  NO_ALLOW,
  isCcrAutoModeApplySet,
  CCR_AUTO_MODE_APPLY,
  applyAutoModePreset,
  autoModeConfigHandler,
  readServerAutoModeRules,
} from "../../selfHostedRunner/serverAutoMode.js";
import { systemClock, withDeadline, sleep } from "../../utils/sleep.js";
import {
  createPrepTimer,
  isEpochMismatchError,
  isNotFoundOrInactive,
  decodeSessionJwt,
  getJwtExpiry,
  writeSystemPromptFile,
  APPEND_SUBAGENT_SYSTEM_PROMPT,
  postSessionFailureResult,
  REPO_NOT_FOUND_REASON,
  stripSystemPromptFileArgs,
  getSessionIdFromJwt,
  CCR_SHR_START_MARKS,
  describeSpawnFailure,
} from "./sessionLaunch.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
  isPathAbsent,
  isENOENT,
} from "../../utils/errors.js";
import { isRetryableRunnerError, getHttpStatus } from "../../selfHostedRunner/runnerApiErrors.js";
import { disableCoreDumps } from "../../utils/processHardening.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getPlatform } from "../../utils/platform.js";
import { getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import {
  agentProxyStandaloneRefusal,
  RUNNER_AGENT_PROXY_URL_SETTING,
  runnerUsesAgentProxyStandalone,
  childRelayEnvValue,
  agentProxyStandaloneRunnerEnv,
} from "./agentProxyStandalone.js";
import { env, antEnv } from "../../utils/env.js";
import { isEgressProxyActive, egressProxyChildEnv } from "./egressProxy.js";
import {
  getRemoteHostname,
  fetchOutcomeBranches,
  resumePushOnRelease,
  fetchSourceBranch,
  revParseVerify,
  isLocalhostUrl,
  hasGovernedMountAndUpstream,
  pushOnRelease,
  runGitQuiet,
} from "./outcomeBranches.js";
import { withBoundedTimeout, withFsOpTimeout, FS_OP_TIMEOUT_MS } from "../../utils/boundedTimeout.js";
import {
  ensureSessionConfigDirs,
  isHostConfigSnapshotError,
  formatHostConfigNotAppliedNotice,
  seedHostConfigForSession,
  formatHostConfigPartiallyAppliedNotice,
  writeSessionFileAtomically,
  isHooksDirSafe,
  buildClearedAuthEnv,
  CHILD_STDIO_MODES,
  writeChildSessionTokens,
} from "./hostConfigSnapshot.js";
import {
  createGovernedGitState,
  buildGitTrustBundle,
  readTrustBundleSource,
  readServerGitSslVars,
  resolveChildGitEnvironment,
  MIN_GIT_VERSION_FOR_TRUST,
  formatCertificatesLeftOutWarning,
  formatGovernedGitDecisionWarnings,
  gitTrustDecisionForRole,
  applyMountGitEnvironment,
  formatTrustBundleWarning,
  governedMountUrlOf,
  gitEnvironmentForSourceHook,
  needsMountFetchWithoutUpstream,
  gitEnvironmentForRole,
  gitEnvironmentForSessionHook,
  isOnGovernedMount,
  removeFileIfExists,
  silenceStretchMs,
  CLAUDE_CODE_REMOTE_SESSION_ORIGIN,
  buildChildGitEnv,
  getGitConfigParameters,
  SilenceWatchdog,
} from "./governedGitTrust.js";
import { readGitVersion, parseGitVersion, configureGitGovernedEntries } from "./configureGit.js";
import { getNoProxy } from "../../utils/proxy.js";
import { makeInitMilestoneMessage, logEnvManager, logCloneStep, forwardLogFile } from "./workOrder.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import {
  findHook,
  runCheckoutHook,
  CheckoutHookFailedError,
  CheckoutHookTimedOutError,
  runPostSessionHook,
} from "../../selfHostedRunner/lifecycleHooks.js";
import {
  isPreparableRepoType,
  prepareRepositories,
  RepositoryAccessError,
  REPO_ACCESS_FAILURE_LABELS,
} from "../../selfHostedRunner/git/repoPrepare.js";
import { repoCheckoutDir, repoDirSlug, isGitRemoteUrl } from "../../selfHostedRunner/git/repoSources.js";
import {
  getUpstreamUrl,
  FetchRefNotFoundError,
  isFetchRefNotFound,
  FetchThrottledError,
  FETCH_REFUSAL_REASONS,
  rewriteContractionError,
} from "../../selfHostedRunner/git/fetchErrors.js";
import { nfcLower } from "../../memdir/memdir.js";
import { isSafeRefName } from "../../utils/git/safeRefName.js";
import { addSessionWorktree, removeSessionWorktree } from "../../selfHostedRunner/git/sessionWorktrees.js";
import { plural } from "../../utils/stringUtils.js";
import {
  resolveInside,
  ensureDirsNoSymlinks,
  isRealpathInside,
  checkSessionDirOutsideWriteScope,
  checkRepoCommittedSettings,
  RepoSettingsRejectedError,
} from "./repoSettingsConfinement.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { getClaudeTempDirRealpath, getChildProcessTmpDirRealpath } from "../../utils/tempDirRealpaths.js";
import { claudeTempDir } from "../../utils/tempDir.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { writeSessionAgentsFile, mergeSessionEnv } from "./sessionEnvironment.js";
import { startGuestVitals } from "../vitals/guestVitals.js";
import { SIDELOAD_FLAGS_BLOCKED_PHRASE } from "../../utils/plugins/marketplacePolicy.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import {
  DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
  DECLARES_NO_REPOSITORY_CHECKED_OUT,
  runnerDeclarationArgument,
} from "./runnerDeclaration.js";
import { normalizeToolsArg, hasDisallowedToolSpec } from "./runnerToolNames.js";
import { appendServerArgs } from "./childArgs.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { sanitizeMetricLabel } from "../../entrypoints/selfHostedRunner/metrics.js";
import { decodeTaggedUuid } from "../mcp/serverIdentity.js";
import {
  SESSION_MOVED_TAIL_PROMPT,
  SESSION_MOVED_CONTINUE_PROMPT,
} from "../../utils/conversationRecovery.js";
import { formatDuration } from "../../utils/format.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../tools/ScheduleWakeupTool/prompt.js";
import { OTEL_DIAG_ERROR_PREFIX } from "../../utils/telemetry/logger.js";
import { isChangesPaneProblemMessage } from "./changesPaneRefusals.js";
import {
  countLiveProcesses,
  killProcessTree,
  snapshotProcessTree,
} from "../../selfHostedRunner/processTable.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { normalizeHost, HOST_LABEL_RE, isGithubDotCom, GITHUB_HOST } from "../../utils/git/githubUrl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hm0ce8vc.js:58886-59069 placement
/**
 * getRemoteSessionOrigin：environment_variables.CLAUDE_CODE_REMOTE_SESSION_ORIGIN。
 */
function getRemoteSessionOrigin(joinResponse) {
  let environmentVariables = joinResponse.environment_variables ?? {};
  let CLAUDE_CODE_REMOTE_SESSION_ORIGIN = Object.hasOwn(
    environmentVariables,
    "CLAUDE_CODE_REMOTE_SESSION_ORIGIN",
  )
    ? environmentVariables.CLAUDE_CODE_REMOTE_SESSION_ORIGIN
    : undefined;
  return typeof CLAUDE_CODE_REMOTE_SESSION_ORIGIN === "string"
    ? CLAUDE_CODE_REMOTE_SESSION_ORIGIN
    : undefined;
}
//@ chunk-hm0ce8vc.js:59069-59108 placement (2.1.88 match: review, 0.384)
/**
 * isReviewOriginSession：旧版名 review 配错。
 */
function isReviewOriginSession(joinResponse) {
  return getRemoteSessionOrigin(joinResponse) === "review";
}
//@ chunk-hm0ce8vc.js:82431-140444 placement
/**
 * 处理一个会话工单：准备目录/配置/仓库、合成环境、启动子进程并在结束后发布结果与清理（约 58 KB）。
 */
async function handleSelfHostedSession(sessionId, options, signal) {
  let {
    apiClient,
    getRunnerToken,
    baseDir,
    execPath,
    execArgs,
    updatedChildBin,
    restartedHere,
    childUpdateBin,
    onChildUpdateReady,
    capacity,
    healthPort,
    onDebug,
    onStatus,
    onSessionActivity,
    onBgTaskLedger,
    onBgFollowupPending,
    onPostTurnSettle,
    onSessionTokenIssued,
    onChildLifecycle,
    clientPlatform,
    onInitPhase,
    onSessionStartHookError,
    onMaxLifetime,
    onChildTerminating,
    canonicalLocks,
    spawnedSessionIds,
    tokenFileOpTimeoutMs,
    governedPushRepresentRetryMs = GOVERNED_REPRESENT_RETRY_MS,
    gitSshRewriteHosts,
    gitHostRewrites,
    useAnthropicGitProxy,
    gitProxyGlobalConfigPath,
    gitProxyGlobalConfigSnapshot,
    gitProxyCredHelper,
    configureGitHookStubs,
    configureGitSigningArtifacts,
    operatorGitSnapshot,
    hookGitPrograms = ALLOWED_SIGNING_PROGRAMS,
    hookGitLegacyParams = false,
    pushOutcomeOnRelease,
    trustWorkspace,
    removeSessionState: removeSessionState_2 = false,
    diffFindsNestedRepository = false,
    freshMachinePerSession = false,
    confineRepoSettings = "enforce",
    serverAutoModeLists = NO_ALLOW,
    hostConfig,
    governedGitConfigSeed,
    debugTokenDir,
    standbyIdleMs,
    takeStartCommandPhases,
    getHealthzClaimVisibleMs,
    moveWatch,
    clock = systemClock,
  } = options;
  let unusedSlot = undefined;
  let otherSessionsShareTheAccount = capacity > 1;
  let ownsHookStubs = configureGitHookStubs !== undefined && !otherSessionsShareTheAccount;
  onDebug(`[runner:session] Handling session ${sessionId}`);
  let unusedFlagA = false;
  let serializeEventPosts = false;
  let unusedFlagB = false;
  let startupProbe;
  let prepTimer = createPrepTimer();
  let initStartMs;
  let childInitSeen = false;
  let exitBeforeInitFailed = false;
  let tokenRef = {
    current: undefined,
  };
  let tokenHistory = {
    current: undefined,
    previous: undefined,
    held: [],
  };
  let recordHeldToken = (heldToken) => {
    tokenHistory.held = [
      ...tokenHistory.held.filter(
        (previousToken) => previousToken !== heldToken && isSessionJwtFresh(previousToken),
      ),
      ...(heldToken ? [heldToken] : []),
    ].slice(-32);
  };
  let remoteConfig;
  let result = "failed";
  let restartingForUpdate = false;
  let failedOnUpdateBuild = false;
  let failureReason;
  let setupFailureKind;
  let failureKind;
  let mcpConfigPath;
  let launcherSettingsPath;
  let launcherStagedPaths = [];
  let stagedPaths = [];
  let sessionClaudeConfigDir = getSessionClaudeConfigDir(baseDir, sessionId);
  let gitConfigPins =
    configureGitSigningArtifacts === undefined
      ? lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms)
      : undefined;
  let sessionGitConfigFiles;
  let governedGitConfigPath = join(baseDir, "_sessions", `${sessionId}.gitconfig`);
  let childGitEnvironment;
  let caBundlePath = join(baseDir, "_sessions", `${sessionId}.git-ca-bundle.pem`);
  let childTrustBundlePath = join(baseDir, "_sessions", `${sessionId}.git-ca-bundle.child.pem`);
  let governedGitState;
  let ghRouteDir = join(baseDir, "_sessions", `${sessionId}.gh`);
  let sessionGitRulesPath = join(baseDir, "_sessions", `${sessionId}.gitrules`);
  let stageFileRoot = join(baseDir, "_sessions", `${sessionId}.uploads`);
  let diffCopyRoot = join(baseDir, "_sessions", `${sessionId}.diff-copies`);
  let sessionDirsCreated = false;
  let debugFile = join(sessionClaudeConfigDir, "claude-code-debug.txt");
  let workerEpoch;
  let sessionDir;
  let ingressTokenFile;
  let toolServerTokenFile;
  let tokenFilePaths = () =>
    [ingressTokenFile, toolServerTokenFile].filter((tokenFile) => tokenFile !== undefined);
  let extraTokenFiles = [];
  let hostConfigFailed = false;
  let unusedFlagC = false;
  let agentProxyRefused = false;
  let resolved = Promise.resolve();
  let tokenWriteMissed = false;
  let resolved_2 = Promise.resolve();
  let removingTokenFiles = false;
  let rewriteTokenFiles;
  let sessionWorktrees = [];
  let hookCheckouts = [];
  let gitProxyCredPaths = [];
  let mountReadWiring = [];
  let ghRoute;
  let sessionGitRules;
  let sessionGitRuleList = [];
  let splitSourcesByMount = (governedRepo, directUpstreams, hasDirectUpstreams) => {
    try {
      return splitMountRouting(governedRepo, sessionGitRuleList, directUpstreams, hasDirectUpstreams);
    } catch (error) {
      onDebug(
        `[runner:session] session git rules: the sources in a /remote reply for ${sessionId} could not be used (${errorMessage(error)}); which repositories are fetched through the git mount is unchanged, and the next reply is read anew`,
      );
      return;
    }
  };
  let pushUrlReconciler;
  let representRetrySender;
  let abortController = new AbortController();
  let childSignal = AbortSignal.any([signal, abortController.signal]);
  let workspacePaths = [];
  let initBaseDir;
  let childStarted = false;
  let epochStale = false;
  let envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR;
  let outcomeBranches = [];
  let skipOutcomePush = false;
  let gitConfigOwnership = gitConfigOwnershipLabel(spawnedSessionIds, sessionId);
  let preparedCheckouts = new Map();
  let sanitizedRepos = new Set();
  let handOvers = [];
  let prepHeartbeat;
  let stopTokenWait;
  let tokenWaitAbort;
  let tokenWaitPromise;
  let tokenWaitSettled = false;
  let resetEarlyRemote;
  let tokenWaitDeadline;
  let awaitTokenWrites = async () => {
    for (;;) {
      while (tokenWaitAbort !== undefined) {
        tokenWaitDeadline ??= performance.now() + INGRESS_TOKEN_DEADLINE_MS;
        let waitRemainingMs = tokenWaitDeadline - performance.now();
        if (waitRemainingMs <= 0) break;
        let previousWait = tokenWaitPromise;
        await withDeadline(previousWait ?? Promise.resolve(), waitRemainingMs);
        if (tokenWaitPromise === previousWait) break;
      }
      let observedWait = tokenWaitPromise;
      if (tokenWaitSettled) await resolved;
      if (tokenWaitPromise === observedWait) return;
    }
  };
  let abortTokenWait = () => {
    stopTokenWait?.();
    stopTokenWait = undefined;
    tokenWaitAbort?.abort();
    tokenWaitAbort = undefined;
  };
  let resolved_3 = Promise.resolve();
  let eventPostError;
  let eventPostFenced = false;
  let flushEventPosts = async () => {
    await resolved_3;
    eventPostFenced = true;
    if (eventPostError !== undefined) throw eventPostError;
  };
  try {
    initStartMs = Date.now();
    onInitPhase?.({
      kind: "start",
    });
    if (!sessionId || !/^[a-zA-Z0-9_-]+$/.test(sessionId))
      throw Error("Invalid session_id: contains unsafe characters");
    sessionDirsCreated = true;
    sessionDir = join(baseDir, "_sessions", sessionId);
    let issuedToken = await retryWithBackoff(
      () => apiClient.issueSessionToken(getRunnerToken(), sessionId, signal),
      {
        initialDelayMs: 500,
        maxDelayMs: 8000,
        maxAttempts: 5,
        shouldRetry: isRetryableRunnerError,
        signal,
        onRetry: (attempt, retryError) => {
          onDebug(
            `[runner:session] issueSessionToken attempt ${attempt} transient failure (${retryError instanceof Error ? retryError.message : retryError}) \u2014 retrying`,
          );
        },
      },
    );
    if (!issuedToken)
      return {
        result: "abandoned",
      };
    tokenRef.current = issuedToken.session_token;
    let toolsHost = issuedToken.tools_host;
    if (toolsHost !== undefined) {
      moveWatch?.holdOff(sessionId);
      sessionClaudeConfigDir = getToolServerConfigDir(baseDir, sessionId);
      debugFile = join(sessionClaudeConfigDir, "claude-code-debug.txt");
    }
    let getRemoteConfig =
      toolsHost === undefined
        ? (...remoteConfigArgs) => apiClient.getSessionRemoteConfig(...remoteConfigArgs)
        : async () => ({
            sources: [],
            push_targets: [],
            claude_code_args: {},
            environment_variables: {},
            api_base_url: toolsHost.api_base_url,
            ...(toolsHost.cwd !== undefined && {
              cwd: toolsHost.cwd,
            }),
          });
    if (ownsHookStubs) await restoreHookStubs(configureGitHookStubs, configureGitSigningArtifacts, onDebug);
    if (useAnthropicGitProxy) {
      if (issuedToken.tools_host === undefined)
        process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = issuedToken.session_token;
      if (gitProxyGlobalConfigSnapshot !== undefined && gitProxyGlobalConfigPath) {
        let xdgConfigHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
        await ignoreLocalSettingsInGit(
          {
            globalConfigPath: gitProxyGlobalConfigPath,
            globalConfigSnapshot: gitProxyGlobalConfigSnapshot,
            homeGitconfigPath: join(homedir(), ".gitconfig"),
            xdgConfigPath: join(xdgConfigHome, "git", "config"),
            credHelper: gitProxyCredHelper,
            signingArtifacts: configureGitSigningArtifacts,
          },
          onDebug,
          onStatus,
        );
      }
    }
    onSessionTokenIssued?.(issuedToken.session_token);
    if (signal.aborted) {
      onDebug(
        `[runner:session] Aborted after issueSessionToken for ${sessionId} \u2014 skipping registration`,
      );
      return {
        result: "abandoned",
      };
    }
    onDebug(`[runner:session] Issued session_token for ${sessionId}`);
    remoteConfig = await retryWithBackoff(() => getRemoteConfig(sessionId, tokenRef.current, signal), {
      initialDelayMs: 500,
      maxDelayMs: 8000,
      maxAttempts: 5,
      shouldRetry: isRetryableRunnerError,
      signal,
      onRetry: (attempt, retryError) => {
        onDebug(
          `[runner:session] getSessionRemoteConfig attempt ${attempt} transient failure (${retryError instanceof Error ? retryError.message : retryError}) \u2014 retrying`,
        );
      },
    });
    if (!remoteConfig)
      return {
        result: "abandoned",
      };
    onDebug(
      `[runner:session] Fetched remote config: ${remoteConfig.sources.length} source(s), ${remoteConfig.push_targets.length} push target(s), api_base_url=${remoteConfig.api_base_url}`,
    );
    if (signal.aborted) {
      onDebug(
        `[runner:session] Aborted after getSessionRemoteConfig for ${sessionId} \u2014 skipping registration`,
      );
      return {
        result: "abandoned",
      };
    }
    let isReviewSession = isReviewOriginSession(remoteConfig);
    let reviewTokensHandedOver = false;
    let dumpableError;
    if (isReviewSession)
      disableCoreDumps((coreDumpError) => {
        dumpableError = coreDumpError;
      });
    if (isReviewSession && debugTokenDir !== undefined) {
      logFeatureBad("self_hosted_review_session", "debug_token_dir");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${sessionId} is a code review, which this runner does not start while --debug-token-dir keeps tokens in files. Restart the runner without --debug-token-dir to take code reviews.`,
        "a code review is not started while --debug-token-dir keeps tokens in files",
      );
    }
    if (debugTokenDir && toolsHost === undefined)
      writeBestEffort(debugTokenDir, `session_token_${sessionId}.jwt`, issuedToken.session_token, onStatus);
    if (isReviewSession && getPlatform() === "windows") {
      logFeatureBad("self_hosted_review_session", "windows");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${sessionId} is a code review, which a runner on Windows does not start: it cannot hand the child its tokens on descriptors. Nothing on this runner needs changing.`,
        "a code review is not started by a runner on Windows",
      );
    }
    if (isReviewSession && capacity > 1) {
      logFeatureBad("self_hosted_review_session", "capacity");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${sessionId} is a code review, which a runner started with --capacity ${capacity} does not take: the commands of its other sessions run as the same user, and could take the review's tokens while Claude Code starts. To take code reviews, run every runner of this environment with --capacity 1.`,
        "a code review is not started by a runner with --capacity above 1",
      );
    }
    let launcherHookProblem =
      isReviewSession && remoteConfig.launcher_hooks !== undefined
        ? validateLauncherHooks(remoteConfig.launcher_hooks)
        : undefined;
    if (launcherHookProblem !== undefined) {
      logFeatureBad("self_hosted_review_session", "launcher_hooks");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${sessionId} is a code review and is not started: the service sent launcher hooks that this runner cannot accept (${launcherHookProblem}), and a code review needs them. That is a fault of the service, or an event newer than this runner's build.`,
        "a code review is not started without the hooks that the service sent for it",
      );
    }
    if (isReviewSession) {
      if (dumpableError !== undefined) {
        logFeatureBad("self_hosted_review_session", "dumpable");
        onStatus(
          `[runner:session] ${sessionId} the runner could not make itself non-dumpable: ${dumpableError}`,
        );
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${sessionId} is a code review, which this runner does not start: it could not make itself non-dumpable, so the review's commands could read the session's tokens from the runner's memory. To take code reviews, run the released claude binary, and allow prctl(PR_SET_DUMPABLE) in any sandbox or seccomp profile around the runner.`,
          "a code review is not started by a runner that cannot make itself non-dumpable",
        );
      }
      onStatus(
        `[runner:session] ${sessionId} is a code review: its child gets no repository as --add-dir, no user, project or local settings (so nothing from this machine's Claude Code config), no session token file, and its session and inference tokens on file descriptors 4 and 5 instead of in its environment`,
      );
    }
    let toolServerHosting = undefined;
    let procStart = toolServerHosting === undefined ? undefined : await getProcessStartTimeAsync(process.pid);
    if (toolsHost !== undefined && (toolServerHosting === undefined || procStart === undefined)) {
      logFeatureBad("self_hosted_tools_host", "cannot_host");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${sessionId} needs a tool server, which this runner cannot host`,
        "session needs a tool server, which this runner cannot host",
      );
    }
    let governedGit = isLoopbackHttpUrl(
      remoteConfig.governed_git,
      () => {
        let sessionToken = tokenRef.current;
        if (!sessionToken)
          throw Error(
            "governed git credential requested but no session token is available \u2014 token issue/refresh failed?",
          );
        return sessionToken;
      },
      onStatus,
      undefined,
    );
    let childIsOwnBinary = execPath === process.execPath || execPath === updatedChildBin;
    let agentProxyRefusal = agentProxyStandaloneRefusal({
      sessionId,
      serverEnv: remoteConfig.environment_variables,
      runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
      governedGit:
        governedGit?.toolConfig.gitConfig === true || governedGit?.toolConfig.ghPathShim === true
          ? "on"
          : "off",
      egressListener: isEgressProxyActive() !== undefined,
      gitConfigArmed: governedGit?.toolConfig.gitConfig === true,
    });
    if (agentProxyRefusal) {
      onStatus(`[runner:error] ${agentProxyRefusal.message}`);
      throw agentProxyRefusal;
    }
    let needsSessionHooks =
      otherSessionsShareTheAccount &&
      governedGit?.toolConfig.gitConfig === true &&
      (configureGitHookStubs !== undefined || configureGitSigningArtifacts !== undefined);
    let operatorHooksApply = needsSessionHooks && operatorGitSnapshot?.hooksPath !== undefined;
    if (governedGit) {
      let hostSplit = governedGit.toolConfig.hostSplit;
      let hostSplitDetail = hostSplit
        ? `; per-host routing \u2014 governed hosts: ${hostSplit.governed.join(", ") || "(none)"} (git mount + session relay); direct hosts: ${hostSplit.direct.join(", ") || "(none)"} (this machine's own git rewrite and credentials)`
        : "";
      onStatus(
        `[runner:session] governed git ACTIVE for ${sessionId}: pre-CLI clone via git mount, in-session git/gh via the session relay (git_config=${governedGit.toolConfig.gitConfig}, gh_path_shim=${governedGit.toolConfig.ghPathShim})` +
          hostSplitDetail +
          (otherSessionsShareTheAccount
            ? " \u2014 capacity>1: shared-canonical prep relies on per-invocation git hardening (no cross-session sanitize)"
            : ""),
      );
      if (hostSplit) {
        let sourcesWarning = formatSourcesOnHostWarning(
          hostSplit,
          !!useAnthropicGitProxy,
          remoteConfig.sources.map((source) =>
            source.type === "git_repository" && source.url ? getRemoteHostname(source.url) : undefined,
          ),
        );
        if (sourcesWarning) onStatus(sourcesWarning);
        let askpassWarning = formatAskpassWarning(hostSplit, Boolean(env.GIT_ASKPASS));
        if (askpassWarning) onStatus(askpassWarning);
      }
      if (useAnthropicGitProxy)
        onDebug(
          `[runner:session] ${sessionId}: governed git delivered for this session (requested with --use-anthropic-git-proxy); the flag's older clone-URL proxy rewrite is skipped`,
        );
      if (pushOutcomeOnRelease)
        onStatus(
          "[runner:warn] --push-outcome-on-release under governed git pushes to the PLAIN upstream URL with customer-managed credentials (the runner's release-time push does not use the session's git-mount push URL, and the session relay ends with the child). If no ambient git credential covers the push target, the release-time push will fail naming this flag.",
        );
    }
    let gitProxyConfig = governedGit ? undefined : useAnthropicGitProxy;
    if (useAnthropicGitProxy && !governedGit && !remoteConfig.governed_git && toolsHost === undefined)
      onStatus(
        `[runner:warn] ${sessionId}: --use-anthropic-git-proxy is set but the server withheld ` +
          "Anthropic-managed git for this session (the reason is logged server-side \u2014 for example a " +
          "source host the server does not route through Anthropic-managed git, or a server that predates the opt-in); falling back to the legacy clone-URL git proxy for this session (deprecated; this fallback will be removed in a future runner release).",
      );
    try {
      let hosting;
      if (toolServerHosting !== undefined && procStart !== undefined) {
        onDebug(`[runner:session] ${sessionId} hosts tools only, no worker`);
        hosting = {
          kind: "tool-server",
          hosting: toolServerHosting,
          runner: {
            pid: process.pid,
            proc_start: procStart,
          },
        };
      } else {
        workerEpoch = await retryWithBackoff(
          () => apiClient.registerWorker(remoteConfig.api_base_url, sessionId, tokenRef.current, signal),
          {
            initialDelayMs: 500,
            maxDelayMs: 8000,
            maxAttempts: 5,
            shouldRetry: isRetryableRunnerError,
            signal,
            onRetry: (attempt, retryError) => {
              onDebug(
                `[runner:session] registerWorker attempt ${attempt} transient failure (${retryError instanceof Error ? retryError.message : retryError}) \u2014 retrying`,
              );
            },
          },
        );
        if (workerEpoch === undefined)
          return {
            result: "interrupted",
          };
        onDebug(`[runner:session] Registered worker, epoch=${workerEpoch}`);
        let epoch = workerEpoch;
        await retryWithBackoff(
          () =>
            apiClient.updateSessionWorkerState(
              remoteConfig.api_base_url,
              sessionId,
              tokenRef.current,
              epoch,
              undefined,
              signal,
            ),
          {
            initialDelayMs: 500,
            maxDelayMs: 8000,
            maxAttempts: 5,
            shouldRetry: isRetryableRunnerError,
            signal,
            onRetry: (attempt, retryError) => {
              onDebug(
                `[runner:session] updateSessionWorkerState attempt ${attempt} transient failure (${retryError instanceof Error ? retryError.message : retryError}) \u2014 retrying`,
              );
            },
          },
        );
        if (signal.aborted)
          return {
            result: "interrupted",
          };
        hosting = {
          kind: "agent-loop",
          workerEpoch,
        };
      }
      let hostingKey = sessionHostingKey(hosting);
      let dirsToEnsure = [sessionClaudeConfigDir];
      let [dirState] = await withBoundedTimeout(
        ensureSessionConfigDirs(dirname(sessionClaudeConfigDir), dirsToEnsure),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] session config dir check ${sessionClaudeConfigDir} (check NFS/CSI mount health)`,
      ).catch((error) => {
        if (isHostConfigSnapshotError(error)) {
          hostConfigFailed = true;
          onStatus(`[runner:error] ${error.message}`);
        }
        throw error;
      });
      if (
        isReviewSession &&
        (isGreaterThanOne(workerEpoch) || dirState !== "made" || spawnedSessionIds?.has(sessionId) === true)
      ) {
        hostConfigFailed = true;
        logFeatureBad("self_hosted_review_session", "second_start");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${sessionId} is a code review that a worker took before, here or on another runner, perhaps a worker that failed before it started Claude Code. A code review is started only by its first worker, in a config directory that the runner has just created. Nothing on this runner needs changing.`,
          "a code review is started only once",
        );
      }
      if (governedGit) {
        let hostSplit = governedGit.toolConfig.hostSplit;
        governedGitState = createGovernedGitState(
          process.env,
          getPlatform() === "windows",
          hostSplit
            ? {
                governedHosts: hostSplit.governed,
                directHosts: hostSplit.direct,
                mountBaseUrl: governedGit.mountBaseUrl,
                pushBaseUrl: governedGit.pushBaseUrl,
              }
            : undefined,
          caBundlePath,
          otherSessionsShareTheAccount,
        );
        await withFsOpTimeout(
          buildGitTrustBundle(governedGitState, readTrustBundleSource),
          "build the trust bundle",
        ).catch((error) => {
          onDebug(
            `[runner:session] governed git: the trust bundle could not be built (${errorMessage(error)}); the runner's own git keeps GIT_SSL_CAINFO`,
          );
        });
        let serverGitSslVars = readServerGitSslVars(
          remoteConfig.environment_variables,
          getPlatform() === "windows",
        );
        let rawGitVersion = "";
        let childGitEnvironment_2 = await resolveChildGitEnvironment(
          governedGitState,
          {
            ...serverGitSslVars,
            gitConfigArm: governedGit.toolConfig.gitConfig,
            serverValueTrustBundlePath: childTrustBundlePath,
          },
          async () => {
            rawGitVersion = (await withFsOpTimeout(readGitVersion(), "git --version").catch(() => "")).trim();
            let gitVersion = parseGitVersion(rawGitVersion);
            let [minMajor, minMinor] = MIN_GIT_VERSION_FOR_TRUST;
            return (
              gitVersion !== null &&
              (gitVersion[0] > minMajor || (gitVersion[0] === minMajor && gitVersion[1] >= minMinor))
            );
          },
          (bundlePath, bundleDest) =>
            withFsOpTimeout(
              readTrustBundleSource(bundlePath, bundleDest),
              "build the trust bundle from the server's GIT_SSL_CAINFO",
            ).catch((error) => {
              onDebug(
                `[runner:session] governed git: the trust bundle for the session's git could not be built (${errorMessage(error)}); git inside the session checks the git mount against the moved file alone`,
              );
              return {
                status: "unavailable",
                reason: "bundle_write_failed",
              };
            }),
        );
        childGitEnvironment = childGitEnvironment_2.answer;
        let leftOutWarning = formatCertificatesLeftOutWarning([
          governedGitState.trustBundle,
          childGitEnvironment_2.trustBundle,
        ]);
        if (leftOutWarning) onStatus(leftOutWarning);
        for (let decisionWarning of formatGovernedGitDecisionWarnings({
          governedHosts: hostSplit?.governed ?? [],
          gitConfigArm: governedGit.toolConfig.gitConfig,
          child: childGitEnvironment_2.answer.decision,
          childTrustBundle: childGitEnvironment_2.trustBundle,
          serverSetsCertificateFile: typeof serverGitSslVars.serverCertificateFile === "string",
          runnerMountGit: gitTrustDecisionForRole(governedGitState, "prep", {
            url: governedGit.mountBaseUrl,
            mountRouted: true,
          }),
          rawGitVersion,
          clientCertificateVariablesSet: ["GIT_SSL_CERT", "GIT_SSL_KEY"].filter(
            (envName) => process.env[envName] !== undefined,
          ),
          hostsCoveredByNoProxy: governedNoProxyHosts(hostSplit, getNoProxy()),
        }))
          onStatus(decisionWarning);
      }
      ingressTokenFile =
        hosting.kind === "agent-loop" && !isReviewSession
          ? getIngressTokenTempPrefix(sessionClaudeConfigDir, hostingKey)
          : undefined;
      if (hosting.kind === "tool-server") {
        for (let dirToRemove of [getSessionClaudeConfigDir(baseDir, sessionId), sessionClaudeConfigDir])
          await withBoundedTimeout(
            rm(dirToRemove, {
              recursive: true,
              force: true,
            }),
            LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
            `[runner:stuck] rm ${dirToRemove} (check NFS/CSI mount health)`,
          );
        await withBoundedTimeout(
          mkdir(dirname(sessionClaudeConfigDir), {
            recursive: true,
            mode: 448,
          }),
          INGRESS_TOKEN_FILE_TIMEOUT_MS,
          `[runner:stuck] mkdir ${dirname(sessionClaudeConfigDir)}`,
        );
        await withBoundedTimeout(
          mkdir(sessionClaudeConfigDir, {
            mode: 448,
          }),
          INGRESS_TOKEN_FILE_TIMEOUT_MS,
          `[runner:stuck] mkdir ${sessionClaudeConfigDir}`,
        );
      }
      let newIngressTokenFile = ingressTokenFile;
      let rewriteTokens = (writePromise) => {
        tokenWriteMissed = true;
        let writeSettled = writePromise.catch(() => {});
        resolved_2 = Promise.all([resolved_2, writeSettled]).then(() => {});
        writeSettled.then(() => {
          if (removingTokenFiles || newIngressTokenFile === undefined) return;
          let sessionToken = tokenRef.current;
          if (!sessionToken) return;
          for (let tokenFile of tokenFilePaths())
            resolved = resolved.then(() =>
              writeSessionIngressTokenFile(
                tokenFile,
                sessionToken,
                onStatus,
                rewriteTokens,
                tokenFileOpTimeoutMs,
              ),
            );
        });
      };
      rewriteTokenFiles = rewriteTokens;
      if (newIngressTokenFile !== undefined)
        resolved = writeSessionIngressTokenFile(
          newIngressTokenFile,
          issuedToken.session_token,
          onStatus,
          rewriteTokens,
          tokenFileOpTimeoutMs,
        );
      await resolved;
      onDebug(`[runner:session] Epoch fence passed for ${sessionId} (epoch=${workerEpoch})`);
      prepHeartbeat = createDebouncedSender({
        intervalMs: 30000,
        refresh: async () => {
          if (workerEpoch === undefined || !tokenRef.current) return;
          await apiClient.heartbeat(
            remoteConfig.api_base_url,
            sessionId,
            tokenRef.current,
            workerEpoch,
            signal,
          );
          onDebug(`[runner:session] prep heartbeat sent for ${sessionId}`);
          return;
        },
        onError: (heartbeatError) => {
          onDebug(`[runner:session] prep heartbeat failed: ${heartbeatError}`);
        },
        signal,
      });
      let setSessionToken = (nextToken) => {
        tokenRef.current = nextToken;
        if (useAnthropicGitProxy && !reviewTokensHandedOver)
          process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = nextToken;
        for (let tokenFile of tokenFilePaths())
          resolved = resolved.then(() =>
            writeSessionIngressTokenFile(
              tokenFile,
              nextToken,
              onStatus,
              rewriteTokenFiles,
              tokenFileOpTimeoutMs,
            ),
          );
      };
      let deferredEvents = [];
      let postEvent = (event, eventOptions) => {
        if (workerEpoch === undefined || !tokenRef.current) return Promise.resolve();
        let epoch = workerEpoch;
        let sessionToken = tokenRef.current;
        let flushedDeferred = eventOptions.withDeferred ? deferredEvents.splice(0) : [];
        let send = async () => {
          try {
            await apiClient.postWorkerEvents(
              remoteConfig.api_base_url,
              sessionId,
              sessionToken,
              epoch,
              [...flushedDeferred, event],
              signal,
            );
          } catch (error) {
            if (isEpochMismatchError(error)) throw error;
            let droppedNote =
              flushedDeferred.length > 0
                ? ` (${flushedDeferred.length} deferred step event(s) dropped with it)`
                : "";
            onDebug(`[runner:session] ${eventOptions.kind} event post failed${droppedNote}: ${error}`);
          }
        };
        if (!serializeEventPosts) return send();
        let sendUnlessFailed = () => (eventPostError === undefined ? send() : Promise.resolve());
        if (eventPostFenced) return sendUnlessFailed();
        if (!eventOptions.withDeferred) return resolved_3.then(sendUnlessFailed);
        resolved_3 = resolved_3.then(() =>
          sendUnlessFailed().catch((error) => {
            eventPostError = error;
            prepHeartbeat?.cancel();
          }),
        );
        return Promise.resolve();
      };
      let postActivity = (message) =>
        postEvent(makeInitMilestoneMessage(message), {
          kind: "activity",
          withDeferred: true,
        });
      let postStep = (stepId, stepName, content, stepDetail) =>
        postEvent(logEnvManager(stepId, stepName, content, stepDetail), {
          kind: "step",
          withDeferred: true,
        });
      let queueEvent = (...event) => {
        if (workerEpoch === undefined || !tokenRef.current) return;
        deferredEvents.push(logEnvManager(...event));
      };
      let earlyRemotePromise;
      resetEarlyRemote = () => {
        earlyRemotePromise = undefined;
      };
      let fetchEarlyRemote = () =>
        (earlyRemotePromise ??= (async () => {
          let armedAt = performance.now();
          let presentedToken = tokenRef.current;
          return {
            config: await getRemoteConfig(sessionId, presentedToken, signal),
            armedAt,
            presentedToken,
          };
        })().catch((error) => {
          onDebug(
            `[runner:session] early /remote re-fetch failed: ${error} \u2014 step 6 re-fetches if the session continues`,
          );
          return;
        }));
      let mappedSources = classifySourceRouting(
        remoteConfig.sources,
        gitSshRewriteHosts,
        gitHostRewrites,
        onDebug,
        gitProxyConfig
          ? {
              apiBaseUrl: gitProxyConfig,
              sessionId,
            }
          : undefined,
        governedGit,
        onStatus,
      );
      if (governedGitState && applyMountGitEnvironment(governedGitState, mappedSources)) {
        let trustWarning = formatTrustBundleWarning(governedGitState);
        if (trustWarning) onStatus(trustWarning);
      }
      await postStep("provision", "completed", "Runner registered", {
        expected_steps: mappedSources.length > 0 ? "provision,clone,start_cc" : "provision,start_cc",
      });
      let branchMap = branchesByRepo(gitRepositorySources(remoteConfig.push_targets));
      await withBoundedTimeout(
        mkdir(sessionDir, {
          recursive: true,
        }),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] mkdir ${sessionDir} (check NFS/CSI mount health)`,
      );
      await withBoundedTimeout(
        mkdir(sessionClaudeConfigDir, {
          recursive: true,
          mode: 448,
        }),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] mkdir ${sessionClaudeConfigDir}`,
      );
      let configSuffix = customOauthUrlSuffix(remoteConfig.api_base_url);
      if (hostConfig?.notApplied)
        await postEvent(formatHostConfigNotAppliedNotice(sessionId, hostConfig.notApplied), {
          kind: "notice",
          withDeferred: true,
        });
      try {
        let seedResult =
          hosting.kind === "agent-loop"
            ? await seedHostConfigForSession(
                sessionClaudeConfigDir,
                hostConfig?.snapshot,
                onDebug,
                onStatus,
                configSuffix,
              )
            : undefined;
        if (seedResult?.outcome === "partial" && hostConfig?.snapshot)
          await postEvent(
            formatHostConfigPartiallyAppliedNotice(
              sessionId,
              hostConfig.snapshot.sourceDir,
              redactSecretsInText(seedResult.error),
            ),
            {
              kind: "notice",
              withDeferred: true,
            },
          );
      } catch (error) {
        if (isHostConfigSnapshotError(error))
          await postStep("host_config", "failed", redactSecretsInText(error.message), {
            step_label: "Apply runner host config",
          });
        throw error;
      }
      if (configureGitSigningArtifacts !== undefined) {
        sessionGitConfigFiles = await materializeSessionGitConfig({
          configDir: sessionClaudeConfigDir,
          baseDir,
          hookStubs:
            needsSessionHooks && !operatorHooksApply && configureGitHookStubs !== undefined
              ? configureGitHookStubs
              : [],
          signingArtifacts: configureGitSigningArtifacts,
          onDebug,
          onStatus,
        });
        gitConfigPins = sessionGitConfig(sessionGitConfigFiles, operatorGitSnapshot, hookGitPrograms);
      }
      if (governedGit?.toolConfig.gitConfig) {
        await writeFileAtomicDefaultMode(
          governedGitConfigPath,
          (governedGitConfigSeed ?? "") + (childGitEnvironment?.fileSeedLines ?? ""),
        );
        let configEntries;
        if (ownsHookStubs) configEntries = configureGitGovernedEntries(baseDir);
        else if (needsSessionHooks) {
          if (configureGitHookStubs === undefined || sessionGitConfigFiles === undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: a governed session at capacity>1 needs both the hook stubs and the code-sign artifacts (hook stubs ${configureGitHookStubs === undefined ? "missing" : "present"}, session copy ${sessionGitConfigFiles === undefined ? "not written" : "written"}); the session was stopped rather than run with unsigned commits`,
              "--configure-git: incomplete startup artifacts for a governed session at capacity>1",
            );
          configEntries = overlayEntriesWithoutHooks(sessionGitConfigFiles, operatorHooksApply);
        }
        if (configEntries !== undefined) {
          await rm(governedGitConfigPath + ".lock", {
            force: true,
          }).catch(() => {});
          try {
            for (let [configKey, configValue] of configEntries)
              await runGit([
                "config",
                "--file",
                governedGitConfigPath,
                "--replace-all",
                configKey,
                configValue,
              ]);
          } catch (error) {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: could not write the commit-signing settings into this session's git config (${governedGitConfigPath}): ${errorMessage(error)}. The session was stopped rather than run with unsigned commits. Check that ${join(baseDir, "_sessions")} is writable and holds no leftover ${sessionId}.gitconfig.lock`,
              "--configure-git: could not write commit-signing settings into the governed per-session gitconfig",
            );
          }
        }
      }
      let childCwd = sessionDir;
      let addDirs = [];
      let preparedRepos = [];
      let hook = await findHook(envSelfHostedRunnerHooksDir, "checkout");
      if (hook && pushOutcomeOnRelease)
        onStatus(
          `[runner:warn] --push-outcome-on-release does not push repos checked out via the checkout lifecycle hook (${hook}); use the post-session hook to snapshot those`,
        );
      let unusedPrewarmState;
      let usesGovernedGit =
        governedGit?.toolConfig.ghPathShim === true || governedGit?.toolConfig.gitConfig === true;
      let configSnapshot = remoteConfig;
      let unusedGitStateA;
      let unusedGitStateB;
      let unusedGitList = [];
      let checkoutBaseDir = initBaseDir ?? baseDir;
      let unusedGitFlagA = false;
      let unusedGitFlagB = false;
      let resetToRelease = async () => {};
      if (mappedSources.length > 0) {
        onDebug(
          `[runner:session] Preparing ${mappedSources.length} git ${mappedSources.length === 1 ? "repository" : "repositories"} (${otherSessionsShareTheAccount ? "worktree" : "canonical-direct"} mode)`,
        );
        let repoSlugs = [];
        let sources = [];
        let sourceUrls = [];
        let firstError;
        let throttleError;
        let skippedSources = [];
        let prepKind = (prepKindOf) => (hook ? "hook" : "builtin");
        let runReposInParallel = false;
        let repoKind = (source) => (prepKind(source) !== "builtin" && hook ? "hook" : "git");
        let found = mappedSources.find(
          (source) => isPreparableRepoType(source.type) && repoKind(source) === "git",
        );
        let git = DEFAULT_GIT_SLOTS;
        let resolved = Promise.resolve();
        let serialize = (task) => {
          let queued = resolved.then(task);
          resolved = queued.catch(() => {});
          return queued;
        };
        let announceRepo = (repo) =>
          serialize(async () => {
            await postActivity(`Preparing ${repo}...`);
            await postStep("clone", "started", `Preparing ${repo}`, {
              step_detail: repo,
            });
          });
        let finishRepo = (slot, repo, stepDetail) => {
          if (!runReposInParallel) {
            queueEvent("clone", "completed", `Prepared ${repo}`, stepDetail);
            return Promise.resolve();
          }
          slot.leave();
          return serialize(() => postStep("clone", "completed", `Prepared ${repo}`, stepDetail));
        };
        let checkoutRoot = sessionDir;
        let prepareSource = async (source, slot) => {
          if (!isPreparableRepoType(source.type)) return;
          let canonicalDir = repoCheckoutDir(checkoutBaseDir, source);
          let repoSlug = repoDirSlug(source);
          let repoUrl = getUpstreamUrl(source) ?? source.url;
          if (!canonicalDir || !repoSlug)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Source '${source.url}' resolved to an unsafe repo path (slug='${source.repo}'). Check for path traversal in the URL.`,
              "source URL resolved to an unsafe repo path",
            );
          await announceRepo(source.repo);
          if (await slot.take()) await serialize(() => postActivity(`Preparing ${source.repo}...`));
          let hasWorkBranch = (branchMap.get(lowercaseRepoName(source.repo))?.length ?? 0) > 0;
          let checkoutPath = join(checkoutRoot, repoSlug);
          let requirement = prepKind(source);
          let checkoutHook = requirement === "builtin" ? null : hook;
          let isContextSource = !checkoutHook && !hasWorkBranch && source !== mappedSources[0];
          let removeSkippedCheckout = async () => {
            if (!checkoutHook) return;
            if (preparedRepos.includes(checkoutPath)) {
              onDebug(`[runner:hook] not removing ${checkoutPath}: a prepared checkout (in use)`);
              return;
            }
            let found = preparedRepos.find(
              (preparedTwin) => nfcLower(preparedTwin) === nfcLower(checkoutPath),
            );
            if (found !== undefined) {
              onDebug(
                `[runner:hook] not removing ${checkoutPath}: same name as prepared checkout ${found} modulo case`,
              );
              hookCheckouts.push(checkoutPath);
              return {
                cause: "kept_prepared_twin",
                warn: `[runner:warn] not removing ${checkoutPath} for skipped context source ${source.repo}: same name as the prepared checkout ${found} modulo case (one directory on a case-insensitive filesystem); whatever the hook wrote there may remain visible to this session. Removal is retried when the session ends.`,
              };
            }
            let rmFailure = await withBoundedTimeout(
              rm(checkoutPath, {
                recursive: true,
                force: true,
              }).then(
                () => {
                  return;
                },
                (error) => error,
              ),
              LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
              `[runner:hook] rm -rf ${checkoutPath}`,
            );
            if (rmFailure === undefined) return;
            hookCheckouts.push(checkoutPath);
            return {
              cause: "rm_failed",
              warn: `[runner:warn] could not remove the partial checkout the hook left for skipped context source ${source.repo} at ${checkoutPath} (${errorMessage(rmFailure)}); the session may still be able to read it. Removal is retried when the session ends.`,
            };
          };
          try {
            if (checkoutHook) {
              if (source.ref && !isSafeRefName(source.ref))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `[runner:session] refusing to pass unsafe ref to checkout hook: ${source.ref}`,
                  "refusing to pass unsafe ref to checkout hook",
                );
              if (!repoUrl || !isGitRemoteUrl(repoUrl))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `[runner:session] refusing to pass unsafe repo URL to checkout hook: ${repoUrl}`,
                  "refusing to pass unsafe repo URL to checkout hook",
                );
              let stderrReader = undefined;
              let startTime = performance.now();
              if (false) preparedCheckouts.set(checkoutPath, true);
              else
                await runCheckoutHook({
                  hookPath: checkoutHook,
                  gitConfigPins,
                  gitConfigLegacyParams: hookGitLegacyParams,
                  cwd: checkoutRoot,
                  sessionId,
                  repoUrl,
                  repoRef: source.ref,
                  checkoutPath,
                  sessionAccessToken: tokenRef.current,
                  apiBaseUrl: configSnapshot.api_base_url,
                  gitMountUrl: governedMountUrlOf(source),
                  gitEnvironment: governedGitState && gitEnvironmentForSourceHook(governedGitState, source),
                  clientPlatform,
                  onStatus,
                  onDebug,
                  onStderrLine: stderrReader?.read,
                  signal,
                  timeoutMs: options.checkoutHookTimeoutMs ?? CHECKOUT_HOOK_TIMEOUT_MS,
                });
              let rounded = Math.round(performance.now() - startTime);
              hookCheckouts.push(checkoutPath);
              await finishRepo(slot, source.repo, {
                step_detail: source.repo,
                ...false,
              });
              return {
                prepared: checkoutPath,
                src: source,
              };
            }
            let worktreePath = otherSessionsShareTheAccount ? join(checkoutRoot, repoSlug) : canonicalDir;
            let handOver;
            await serializeByKey(canonicalLocks, canonicalDir, async () => {
              let inUse = preparedCheckouts.get(canonicalDir);
              let prepContext = {
                canonical: canonicalDir,
                repo: source.repo,
                sessionId,
                onStatus,
              };
              let unusedTrustResult = undefined;
              let prewarmTrusted = false;
              if (
                isContextSource &&
                prewarmTrusted &&
                (await lstat(join(canonicalDir, ".git"))
                  .then((gitEntryStats) =>
                    gitEntryStats.isDirectory() ? lstat(join(canonicalDir, ".git", "index")) : gitEntryStats,
                  )
                  .then(
                    () => true,
                    (error) => getErrnoCode(error) !== "ENOENT",
                  ))
              )
                isContextSource = false;
              let sanitized = false;
              if (undefined?.sanitize || gitProxyConfig || (governedGit && !otherSessionsShareTheAccount)) {
                if (
                  undefined?.sanitize ||
                  (!prewarmTrusted && shouldSanitizeCanonical(onStatus, canonicalDir, gitConfigOwnership))
                ) {
                  await sanitizeCanonicalRepo(canonicalDir, onDebug, repoUrl);
                  sanitized = true;
                }
              } else await runGitConfigLocal(canonicalDir, onDebug, !otherSessionsShareTheAccount);
              await prepareRepositories({
                baseDir: checkoutBaseDir,
                sources: [
                  {
                    ...source,
                    ...(sanitized && {
                      sanitized: {
                        onIndexFromHead: () => {
                          sanitizedRepos.add(canonicalDir);
                        },
                      },
                    }),
                    ...(isContextSource && {
                      skippedIfThrottled: isContextSource,
                    }),
                    ...false,
                  },
                ],
                alwaysFetch: true,
                skipReset: otherSessionsShareTheAccount,
                initWithoutTemplate: initBaseDir !== undefined,
                skipValidation:
                  antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM &&
                  !otherSessionsShareTheAccount &&
                  unusedPrewarmState === undefined,
                onDebug,
                onPhase: (phase, phaseDetail, phaseMessage) => {
                  if (workerEpoch === undefined || !tokenRef.current) return;
                  let epoch = workerEpoch;
                  let sessionToken = tokenRef.current;
                  let phaseEvents = [logCloneStep(source.repo, phase, phaseDetail, phaseMessage)];
                  let postPhase = () =>
                    eventPostError !== undefined
                      ? Promise.resolve()
                      : apiClient.postWorkerEvents(
                          remoteConfig.api_base_url,
                          sessionId,
                          sessionToken,
                          epoch,
                          phaseEvents,
                          signal,
                        );
                  (serializeEventPosts ? resolved_3.then(postPhase) : postPhase()).catch((error) =>
                    onDebug(`[runner:session] prep-phase event post failed: ${error}`),
                  );
                },
                onProgress: (cloneSub, progress) => {
                  let progressDetail =
                    progress.total !== undefined ? ` (${progress.done}/${progress.total})` : "";
                  postEvent(
                    logEnvManager(
                      "clone",
                      "started",
                      `${source.repo} \u2014 ${progress.label} ${progress.pct}%${progressDetail}`,
                      {
                        step_detail: source.repo,
                        clone_sub: cloneSub,
                        progress_label: progress.label,
                        progress_pct: String(progress.pct),
                        ...(progress.done !== undefined && {
                          progress_done: String(progress.done),
                        }),
                        ...(progress.total !== undefined && {
                          progress_total: String(progress.total),
                        }),
                      },
                    ),
                    {
                      kind: "progress",
                      withDeferred: false,
                    },
                  ).catch(() => {});
                },
                signal,
              });
              if (otherSessionsShareTheAccount)
                await addSessionWorktree({
                  canonicalRepoPath: canonicalDir,
                  worktreePath,
                  ref: source.ref,
                  onDebug,
                  signal,
                  gitEnvironment: source.gitEnvironment,
                });
            });
            if (otherSessionsShareTheAccount)
              sessionWorktrees.push({
                canonicalRepoPath: canonicalDir,
                worktreePath,
              });
            await finishRepo(slot, source.repo, {
              step_detail: source.repo,
            });
            return {
              prepared: worktreePath,
              src: source,
              handOver,
            };
          } catch (error) {
            if (
              error instanceof FetchRefNotFoundError ||
              (error instanceof CheckoutHookFailedError && isFetchRefNotFound(error.message))
            ) {
              if (!hasWorkBranch && requirement !== "required") {
                let refLabel = source.ref ? `'${source.ref}'` : "the configured ref";
                onDebug(
                  `[runner:session] context source ${source.repo} ref ${refLabel} permanently not found on remote; ` +
                    "skipping (not a work repo \u2014 no push_targets entry)",
                );
                let skipInfo = await removeSkippedCheckout();
                if (skipInfo) onStatus(skipInfo.warn);
                return {
                  skipped: {
                    repo: source.repo,
                    sads: skipInfo ? [CHECKOUT_FAILURE_NOTES[skipInfo.cause].sad] : [],
                    step:
                      `Skipped ${source.repo} \u2014 source ref ${refLabel} no longer exists on remote; continuing without this context repo` +
                      (skipInfo ? CHECKOUT_FAILURE_NOTES[skipInfo.cause].note : ""),
                  },
                  error: new SourceRefNotFoundError(source.repo, source.ref),
                };
              }
              throw new SourceRefNotFoundError(source.repo, source.ref);
            }
            if (
              checkoutHook &&
              requirement !== "required" &&
              !hasWorkBranch &&
              error instanceof CheckoutHookFailedError &&
              !signal.aborted
            ) {
              onStatus(
                `[runner:warn] checkout hook failed for context source ${source.repo} (${error.telemetryMessage}); not a work repo (no push_targets entry), skipping it: ` +
                  redactSecretsInText(error.message),
              );
              let skipInfo = await removeSkippedCheckout();
              if (skipInfo) onStatus(skipInfo.warn);
              return {
                error,
                skipped: {
                  repo: source.repo,
                  sads: [
                    "context_source_checkout_hook_failed",
                    ...(skipInfo ? [CHECKOUT_FAILURE_NOTES[skipInfo.cause].sad] : []),
                  ],
                  step:
                    `Skipped ${source.repo} \u2014 its checkout hook ${error.telemetryMessage}; continuing without this context repo` +
                    (skipInfo ? CHECKOUT_FAILURE_NOTES[skipInfo.cause].note : ""),
                },
              };
            }
            if (
              !checkoutHook &&
              !hasWorkBranch &&
              error instanceof RepositoryAccessError &&
              error.denial !== undefined &&
              !signal.aborted
            ) {
              let authLabel = source.getAuthToken
                ? source.governedMount
                  ? "git mount"
                  : "git proxy"
                : undefined;
              let accessLabel = REPO_ACCESS_FAILURE_LABELS[error.denial];
              onStatus(
                `[runner:warn] could not access context source ${source.repo} (${accessLabel}; auth: ` +
                  (authLabel ? `session token via the ${authLabel}` : "this runner's own git credentials") +
                  "); not a work repo (no push_targets entry), skipping it: " +
                  redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
              );
              return {
                error,
                skipped: {
                  repo: source.repo,
                  sads: ["context_source_access_denied"],
                  step: authLabel
                    ? `Skipped ${source.repo} \u2014 this session couldn't read it ` +
                      `(${accessLabel}). Check that you've connected a GitHub account that can open it. If so, ask an admin to check that your organization gives Claude access to it.`
                    : `Skipped ${source.repo} \u2014 this runner couldn't read it ` +
                      `(${accessLabel}). Ask the team that manages your runners to check this runner's access.`,
                  skipKind: "context_source_access_denied",
                  skipReason: error.denial,
                },
              };
            }
            if (
              isContextSource &&
              (error instanceof RepositoryAccessError || error instanceof FetchThrottledError) &&
              error.throttle !== undefined &&
              !signal.aborted
            ) {
              onStatus(
                `[runner:warn] could not read context source ${source.repo} (told to try again later: ${FETCH_REFUSAL_REASONS[error.throttle]}); not a work repo (no push_targets entry), skipping it: ` +
                  redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
              );
              return {
                error,
                skipped: {
                  repo: source.repo,
                  sads: ["context_source_throttled"],
                  step:
                    `Skipped ${source.repo} \u2014 after several tries this runner was ` +
                    "still told to try again later; a rate limit is the usual cause. This session runs without it. It is tried again the next time this session starts.",
                  skipKind: "context_source_throttled",
                  skipReason: error.throttle,
                },
              };
            }
            throw classifySourcePrepFailure(error);
          }
        };
        let collectPrep = (prepResult) => {
          if (prepResult === undefined) return;
          if ("skipped" in prepResult) {
            skippedSources.push(prepResult.skipped);
            firstError ??= prepResult.error;
            if (prepResult.skipped.skipKind === "context_source_throttled")
              throttleError ??= prepResult.error;
            return;
          }
          preparedRepos.push(prepResult.prepared);
          repoSlugs.push(prepResult.src.repo);
          sources.push(prepResult.src);
          sourceUrls.push(prepResult.src.url ?? "");
          if (prepResult.handOver) handOvers.push(prepResult.handOver);
        };
        if (runReposInParallel)
          (
            await runWithSlots(
              mappedSources.map(repoKind),
              {
                git,
                hook: DEFAULT_HOOK_SLOTS,
              },
              (index, slot) => prepareSource(mappedSources[index], slot),
              isEpochMismatchError,
            )
          ).forEach(collectPrep);
        else for (let source of mappedSources) collectPrep(await prepareSource(source, NO_SLOTS_AVAILABLE));
        if (preparedRepos.length === 0 && firstError)
          throw classifySourcePrepFailure(throttleError ?? firstError);
        for (let skipped of skippedSources) {
          for (let sad of skipped.sads) logFeatureSad("self_hosted_session_handle", sad);
          await postStep("clone", "completed", skipped.step, {
            step_detail: skipped.repo,
            ...(skipped.skipKind && {
              skip_kind: skipped.skipKind,
            }),
            ...(skipped.skipReason && {
              skip_reason: skipped.skipReason,
            }),
          });
        }
        await postStep("clone", "completed", "Finished preparing sources");
        prepTimer.start();
        fetchEarlyRemote();
        if (gitProxyConfig) {
          let origin = new URL(gitProxyConfig).origin;
          for (let idx = 0; idx < preparedRepos.length; idx++) {
            if (!sources[idx]?.getAuthToken) continue;
            if (hookCheckouts.includes(preparedRepos[idx])) continue;
            gitProxyCredPaths.push({
              path: preparedRepos[idx],
              origin,
            });
            await setCredentialHelper(preparedRepos[idx], gitProxyConfig, onDebug, signal);
          }
        }
        prepTimer.mark("runner_prep_git_proxy_config_ms");
        if (governedGit) {
          let seenCanonical = new Set();
          let capacitySkippedRepos = [];
          let oldGitSkippedRepos = [];
          let mountFetchedRepos = [];
          let originChecks = [];
          let gitVersionInfo;
          for (let idx = 0; idx < preparedRepos.length; idx++) {
            let source = sources[idx];
            let upstreamUrl = source && getUpstreamUrl(source);
            if (!source || !upstreamUrl) continue;
            if (hookCheckouts.includes(preparedRepos[idx])) continue;
            let canonicalDir =
              sessionWorktrees.find((worktree) => worktree.worktreePath === preparedRepos[idx])
                ?.canonicalRepoPath ?? preparedRepos[idx];
            if (seenCanonical.has(canonicalDir)) continue;
            seenCanonical.add(canonicalDir);
            originChecks.push(await getRemoteOriginUrls(canonicalDir, upstreamUrl, onDebug, signal));
            if (source.fetchViaMount && source.url) {
              if (otherSessionsShareTheAccount) {
                capacitySkippedRepos.push(source.repo);
                continue;
              }
              if (gitVersionInfo === undefined) {
                let output = (
                  await withFsOpTimeout(readGitVersion(), "git --version").catch(() => "")
                ).trim();
                let gitVersion = parseGitVersion(output);
                let [minMajor, minMinor] = MIN_GIT_VERSION_FOR_MOUNT;
                gitVersionInfo = {
                  raw: output,
                  ok:
                    gitVersion !== null &&
                    (gitVersion[0] > minMajor || (gitVersion[0] === minMajor && gitVersion[1] >= minMinor)),
                };
              }
              if (!gitVersionInfo.ok) {
                oldGitSkippedRepos.push(source.repo);
                continue;
              }
              mountFetchedRepos.push(source.repo);
              mountReadWiring.push({
                path: canonicalDir,
                mountUrl: source.url,
                mountBaseUrl: governedGit.mountBaseUrl,
              });
              try {
                await setHostCredentialHelper(
                  canonicalDir,
                  source.url,
                  upstreamUrl,
                  governedGit.mountBaseUrl,
                  onDebug,
                  signal,
                );
              } catch (error) {
                logFeatureBad("self_hosted_governed_mount_read", "config_write_failed");
                throw error;
              }
            }
          }
          if (originChecks.includes("not_upstream"))
            logFeatureSad("self_hosted_governed_origin_check", "not_upstream");
          else if (originChecks.includes("read_failed"))
            logFeatureSad("self_hosted_governed_origin_check", "read_failed");
          else if (originChecks.length > 0) logFeatureOk("self_hosted_governed_origin_check");
          if (capacitySkippedRepos.length > 0) {
            onStatus(
              `[runner:warn] governed git: ${capacitySkippedRepos.join(", ")} ${plural(capacitySkippedRepos.length, "is", "are")} outside the runner's list of directly reachable upstreams, but at --capacity ${capacity} sessions share one git config per repository, so ${plural(capacitySkippedRepos.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Run with --capacity 1 to route such fetches through the mount.`,
            );
            logFeatureSad("self_hosted_governed_mount_read", "skipped_capacity_gt1");
          } else if (oldGitSkippedRepos.length > 0) {
            onStatus(
              `[runner:warn] governed git: ${oldGitSkippedRepos.join(", ")} ${plural(oldGitSkippedRepos.length, "is", "are")} outside the runner's list of directly reachable upstreams, but this machine's git (${gitVersionInfo?.raw || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_MOUNT.join(".")} or newer, which the mount's path-scoped credential needs, so ${plural(oldGitSkippedRepos.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Upgrade git to route such fetches through the mount.`,
            );
            logFeatureSad("self_hosted_governed_mount_read", "skipped_git_too_old");
          } else if (mountFetchedRepos.length > 0) {
            onStatus(
              `[runner:session] governed git: ${mountFetchedRepos.join(", ")} ${plural(mountFetchedRepos.length, "is", "are")} fetched through the git mount for ${sessionId} (not directly reachable from this runner) \u2014 origin keeps its upstream URL; a repo-local insteadOf sends in-session fetches to the mount with the session token`,
            );
            logFeatureOk("self_hosted_governed_mount_read");
          }
        }
        if (governedGit?.pushBaseUrl !== undefined) {
          let pushWirings = [];
          let seenPushCanonical = new Set();
          let notGithubCount = 0;
          for (let idx = 0; idx < preparedRepos.length; idx++) {
            let source = sources[idx];
            if (!source?.governedMount || !source.upstreamUrl) continue;
            if (hookCheckouts.includes(preparedRepos[idx])) continue;
            if (!source.governedPushUrl) {
              notGithubCount++;
              continue;
            }
            let canonicalPath =
              sessionWorktrees.find((worktree) => worktree.worktreePath === preparedRepos[idx])
                ?.canonicalRepoPath ?? preparedRepos[idx];
            if (seenPushCanonical.has(canonicalPath)) continue;
            seenPushCanonical.add(canonicalPath);
            pushWirings.push({
              canonicalPath,
              mountPath: source.governedPushUrl.slice(governedGit.pushBaseUrl.length + 1),
              upstreamUrl: source.upstreamUrl,
            });
          }
          if (notGithubCount > 0) logFeatureSad("self_hosted_governed_push_url", "host_not_github");
          if (pushWirings.length === 0);
          else if (otherSessionsShareTheAccount) {
            onStatus(
              `[runner:warn] governed git: the work item carries a git-mount push URL but this runner runs with --capacity ${capacity} (per-session worktrees share one canonical git config), so the push URL is NOT applied and session pushes keep going to the upstream remote. Run with --capacity 1 to route session pushes through the git mount.`,
            );
            logFeatureSad("self_hosted_governed_push_url", "skipped_capacity_gt1");
          } else {
            let pushWiring = reconcileGovernedPushUrls({
              sessionId,
              pushBaseUrl: governedGit.pushBaseUrl,
              wirings: pushWirings,
              getCurrentToken: () => tokenRef.current,
              onStatus,
              onDebug,
              signal,
            });
            pushUrlReconciler = pushWiring;
            try {
              await pushWiring.apply();
            } catch (error) {
              logFeatureBad("self_hosted_governed_push_url", "config_write_failed");
              throw error;
            }
            onStatus(
              `[runner:session] governed git: push URL ACTIVE for ${sessionId} \u2014 session git pushes go through the ` +
                `git mount (${pushWirings.length} ${plural(pushWirings.length, "repository", "repositories")}, origin ${new URL(governedGit.pushBaseUrl).origin})` +
                (mountReadWiring.length > 0 ? "" : "; fetches stay on the upstream remote"),
            );
            logFeatureOk("self_hosted_governed_push_url");
          }
        }
        await resetToRelease();
        prepTimer.mark("runner_prep_reset_remote_ms");
        for (let idx = 0; idx < preparedRepos.length; idx++) {
          let branches = branchMap.get(lowercaseRepoName(repoSlugs[idx]));
          if (!branches || branches.length === 0) continue;
          let [branch, ...extraBranches] = branches;
          let found = sessionWorktrees.find((worktree) => worktree.worktreePath === preparedRepos[idx]);
          let canonicalPath = found?.canonicalRepoPath ?? preparedRepos[idx];
          let skipped = false;
          if (extraBranches.length > 0 && !skipped) {
            let source = sources[idx];
            let canUseToken = source?.getAuthToken && !hookCheckouts.includes(preparedRepos[idx]);
            await fetchOutcomeBranches(
              preparedRepos[idx],
              extraBranches,
              onDebug,
              signal,
              undefined,
              sourceUrls[idx].startsWith("file://"),
              gitProxyConfig && canUseToken ? source.url : undefined,
              source?.governedMount && canUseToken
                ? {
                    url: source.url,
                    getToken: source.getAuthToken,
                  }
                : undefined,
              source?.governedMount && canUseToken ? source.gitEnvironment : undefined,
            );
          }
          let createdSha;
          if (
            pushOutcomeOnRelease &&
            hostingKey > 1 &&
            !skipped &&
            !hookCheckouts.includes(preparedRepos[idx])
          ) {
            if (
              await resumePushOnRelease(
                canonicalPath,
                branch,
                sources[idx],
                PUSH_ON_RELEASE_TIMEOUT_MS,
                onDebug,
                signal,
                sources[idx].gitEnvironment,
              )
            )
              createdSha = `refs/remotes/origin/${branch}`;
          }
          if (!skipped)
            await fetchSourceBranch(
              preparedRepos[idx],
              branch,
              onDebug,
              signal,
              !!useAnthropicGitProxy || (sanitizedRepos.has(canonicalPath) && "checkout"),
              createdSha,
              undefined,
              sources[idx].gitEnvironment,
            );
          if (hookCheckouts.includes(preparedRepos[idx])) continue;
          outcomeBranches.push({
            canonicalPath,
            branch,
            needsDetach: !found,
            createdSha:
              pushOutcomeOnRelease && !skipped
                ? await revParseVerify(canonicalPath, `refs/heads/${branch}`)
                : undefined,
            source: sources[idx],
          });
        }
        prepTimer.mark("runner_prep_outcome_branch_ms");
        workspacePaths.push(...preparedRepos);
      } else await resetToRelease();
      prepTimer.start();
      fetchEarlyRemote();
      ({ childCwd, addDirs } = chooseChildCwd(sessionDir, preparedRepos, remoteConfig.cwd, isReviewSession));
      if (remoteConfig.cwd) {
        let inside = resolveInside(sessionDir, remoteConfig.cwd);
        if (!(
          inside !== null &&
          (await withBoundedTimeout(
            ensureDirsNoSymlinks(sessionDir, inside),
            INGRESS_TOKEN_FILE_TIMEOUT_MS,
            `[runner:stuck] mkdir ${inside} (check NFS/CSI mount health)`,
          ).catch(() => false)) &&
          (await withBoundedTimeout(
            isRealpathInside(sessionDir, inside),
            FS_OP_TIMEOUT_MS,
            `[runner:stuck] realpath ${inside} (check NFS/CSI mount health)`,
          ).catch(() => false))
        )) {
          onDebug(
            `[runner:session] config.cwd=${remoteConfig.cwd} rejected (not under ${sessionDir}, a segment is a symlink, or fs op timed out)`,
          );
          ({ childCwd, addDirs } = chooseChildCwd(sessionDir, preparedRepos, undefined, isReviewSession));
        }
      }
      let unusedChildCwd = undefined;
      if (addDirs.length > 0) onDebug(`[runner:session] cwd=${childCwd} + ${addDirs.length} --add-dir`);
      checkSessionDirOutsideWriteScope(sessionClaudeConfigDir, "config dir", childCwd, addDirs);
      checkSessionDirOutsideWriteScope(stageFileRoot, "stage-file root", childCwd, addDirs);
      checkSessionDirOutsideWriteScope(diffCopyRoot, "diff copy root", childCwd, addDirs);
      checkSessionDirOutsideWriteScope(ghRouteDir, "gh route dir", childCwd, addDirs);
      let snapshotDir =
        hostConfig?.snapshot?.storage.mode === "disk" ? hostConfig.snapshot.storage.snapshotDir : undefined;
      if (snapshotDir !== undefined)
        checkSessionDirOutsideWriteScope(snapshotDir, "host config snapshot dir", childCwd, addDirs);
      let repoSettingEntries = [];
      let confineFailed = false;
      let confineScanThrew = false;
      let repoFindings = {};
      if (confineRepoSettings !== "off") {
        try {
          repoSettingEntries = await checkRepoCommittedSettings(childCwd, preparedRepos, repoFindings);
        } catch (error) {
          if (confineRepoSettings === "warn") {
            let message = error instanceof Error ? error.message : String(error);
            let kind = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            onStatus(`[runner:confine] WARN (would refuse): ${message}`);
            logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_warn", {
              confine_kind: fromEnum(kind),
            });
            confineFailed = true;
            confineScanThrew = true;
          } else {
            let kind = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_enforce", {
              confine_kind: fromEnum(kind),
            });
            throw error;
          }
        }
        let allowedRoots = [...addDirs, ...repoSettingEntries.map((entry) => entry.path)];
        let checkRoots = () => {
          checkSessionDirOutsideWriteScope(sessionClaudeConfigDir, "config dir", childCwd, allowedRoots);
          checkSessionDirOutsideWriteScope(stageFileRoot, "stage-file root", childCwd, allowedRoots);
          checkSessionDirOutsideWriteScope(diffCopyRoot, "diff copy root", childCwd, allowedRoots);
          checkSessionDirOutsideWriteScope(ghRouteDir, "gh route dir", childCwd, allowedRoots);
          if (snapshotDir !== undefined)
            checkSessionDirOutsideWriteScope(snapshotDir, "host config snapshot dir", childCwd, allowedRoots);
        };
        if (confineRepoSettings === "warn")
          try {
            checkRoots();
          } catch (error) {
            let message = error instanceof Error ? error.message : String(error);
            onStatus(`[runner:confine] WARN (would refuse under enforce): ${message}`);
            logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_warn");
            confineFailed = true;
          }
        else
          try {
            checkRoots();
          } catch (error) {
            logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_enforce");
            throw tagFailureStage(error, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED");
          }
      }
      if (repoSettingEntries.length > 0) {
        let normalizePath = (value) => value;
        let allowedRoots = new Set();
        let statError = false;
        for (let rootPath of [childCwd, ...addDirs]) {
          allowedRoots.add(normalizePath(rootPath));
          allowedRoots.add(normalizePath(rootPath.normalize("NFC")));
          let realRoot = await withFsOpTimeout(
            realpath(rootPath).catch((error) => {
              statError ||= !isPathAbsent(error);
              return;
            }),
            `realpath ${rootPath}`,
          );
          if (realRoot !== undefined) {
            allowedRoots.add(normalizePath(realRoot));
            allowedRoots.add(normalizePath(realRoot.normalize("NFC")));
          }
        }
        let isUnderAllowedRoot = (candidatePath) => {
          for (let allowedRoot of allowedRoots)
            if (
              candidatePath === allowedRoot ||
              candidatePath.startsWith(allowedRoot.endsWith(sep) ? allowedRoot : allowedRoot + sep)
            )
              return true;
          return false;
        };
        for (let entry of repoSettingEntries)
          if (!isUnderAllowedRoot(normalizePath(entry.path))) {
            let rejection = new RepoSettingsRejectedError(
              entry,
              entry.kind === "permissions.allow (bare write-tool rule)"
                ? `grants unbounded file-tool writes (toolAlwaysAllowedRule matches a bare ${entry.raw} rule for ANY path). defaultMode:"acceptEdits" already auto-allows in-workspace edits; drop the bare rule, or use "Edit(/**)" / "Write(/**)" for an explicit workspace-scoped rule, or move it to the operator's user-level settings.json`
                : "resolves outside this session's own workspace",
            );
            if (confineRepoSettings === "warn") {
              onStatus(`[runner:confine] WARN (would refuse): ${rejection.message}`);
              logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_warn");
              confineFailed = true;
              continue;
            }
            logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_enforce");
            throw statError ? tagFailureStage(rejection, "SETUP_FAILURE_KIND_FILESYSTEM_ERROR") : rejection;
          }
      }
      if (confineRepoSettings !== "off" && !confineFailed) logFeatureOk("self_hosted_confine");
      checkSessionDirOutsideWriteScope(
        sessionClaudeConfigDir,
        "config dir",
        getClaudeTempDirRealpath().replace(/[/\\]$/, ""),
        [claudeTempDir(), getChildProcessTmpDirRealpath().replace(/[/\\]$/, "")],
      );
      prepTimer.mark("runner_prep_repo_settings_ms");
      if (trustWorkspace) {
        let projects = {};
        for (let dirPath of new Set([
          childCwd,
          ...preparedRepos,
          ...sessionWorktrees.map((worktree) => worktree.canonicalRepoPath),
        ])) {
          let normalized = normalize(dirPath);
          let realPath = await withFsOpTimeout(
            realpath(dirPath).catch(() => {
              return;
            }),
            `realpath ${dirPath}`,
          );
          for (let trustKey of [
            normalized,
            normalized.normalize("NFC"),
            ...(realPath !== undefined ? [realPath, realPath.normalize("NFC")] : []),
          ])
            projects[trustKey] = {
              hasTrustDialogAccepted: true,
            };
        }
        let settingsContent = await jsonStringify({
          ...(hosting.kind === "agent-loop" &&
            hostConfig?.snapshot?.mcpServers && {
              mcpServers: hostConfig.snapshot.mcpServers,
            }),
          projects,
        });
        let settingsPath = join(sessionClaudeConfigDir, `.claude${configSuffix}.json`);
        await withBoundedTimeout(
          writeSessionFileAtomically(
            sessionClaudeConfigDir,
            `.claude${configSuffix}.json`,
            settingsContent,
            384,
          ),
          INGRESS_TOKEN_FILE_TIMEOUT_MS,
          `[runner:stuck] write ${settingsPath} (check NFS/CSI mount health)`,
        ).catch((error) => {
          if (isHostConfigSnapshotError(error)) onStatus(`[runner:error] ${error.message}`);
          throw error;
        });
        onDebug(
          `[runner:session] Seeded persisted trust for ${Object.keys(projects).length} path(s) in ${settingsPath}`,
        );
      }
      let mcpConfigContent = EMPTY_MCP_CONFIG_JSON;
      if (remoteConfig.mcp_config?.content) {
        let str = Buffer.from(remoteConfig.mcp_config.content, "base64").toString("utf-8");
        mcpConfigPath = join(sessionClaudeConfigDir, "mcp-config.json");
        await withFsOpTimeout(unlink(mcpConfigPath), `unlink ${mcpConfigPath}`).catch(() => {});
        await withFsOpTimeout(
          writeFile(mcpConfigPath, str, {
            flag: "wx",
            mode: 384,
          }),
          `writeFile ${mcpConfigPath}`,
        );
        onDebug(`[runner:session] Wrote MCP config to ${mcpConfigPath} (${str.length} bytes)`);
        mcpConfigContent = str;
      }
      let deliveredMcpPath = join(sessionClaudeConfigDir, MCP_CONFIG_DELIVERED_JSON);
      stagedPaths.push(deliveredMcpPath);
      let writeState = {
        cancelled: false,
      };
      await withBoundedTimeout(
        writeSessionFileAtomically(
          sessionClaudeConfigDir,
          MCP_CONFIG_DELIVERED_JSON,
          mcpConfigContent,
          384,
          writeState,
        ),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] write ${deliveredMcpPath} (check NFS/CSI mount health)`,
      ).catch((error) => {
        writeState.cancelled = true;
        if (isHostConfigSnapshotError(error)) onStatus(`[runner:error] ${error.message}`);
        throw error;
      });
      prepTimer.mark("runner_prep_config_seed_ms");
      onDebug(
        isCcrAutoModeApplySet(remoteConfig)
          ? `[runner:session] ${sessionId}: the server asked this runner to apply the auto mode lists it sends (${CCR_AUTO_MODE_APPLY}=1 in /remote)`
          : `[runner:session] ${sessionId}: the server did not ask this runner to apply the auto mode lists it sends (no ${CCR_AUTO_MODE_APPLY}=1 in /remote), so none is read; nothing on this runner needs changing`,
      );
      let presetResult = applyAutoModePreset(autoModeConfigHandler(remoteConfig), serverAutoModeLists);
      let isNoAllow = serverAutoModeLists === NO_ALLOW;
      let allowWithheldBySetting = presetResult.withheld.includes("allow");
      if (presetResult.withheld.length > 0) {
        let mapped = presetResult.withheld.map((listName) => `autoMode.${listName}`);
        let listLabel =
          mapped.length > 1
            ? `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)} lists`
            : `${mapped[0]} list`;
        if (isNoAllow)
          onDebug(
            `[runner:session] ${sessionId}: not applying the server's ${listLabel} for this session (--server-auto-mode-lists is ${serverAutoModeLists}, the default; set it to all to apply allow)`,
          );
        else
          onStatus(
            `[runner:session] ${sessionId}: not applying the server's ${listLabel} for this session, because this runner is set to --server-auto-mode-lists ${serverAutoModeLists}`,
          );
      }
      let serverAutoModeRules = readServerAutoModeRules(presetResult.carried);
      for (let statusLine of serverAutoModeRules.statusLines)
        onStatus(`[runner:warn] ${sessionId}: ${statusLine}`);
      let autoModeWritten = false;
      if (remoteConfig.launcher_hooks !== undefined || serverAutoModeRules.autoMode !== undefined) {
        let launcherResult = await writeLauncherSettings(
          sessionClaudeConfigDir,
          {
            hooks: remoteConfig.launcher_hooks === undefined ? [] : remoteConfig.launcher_hooks,
            autoMode: serverAutoModeRules.autoMode,
          },
          launcherStagedPaths,
          onDebug,
          onStatus,
        );
        if (launcherResult) {
          launcherSettingsPath = launcherResult.settingsPath;
          autoModeWritten = launcherResult.autoModeWritten;
        }
        if (
          isReviewSession &&
          remoteConfig.launcher_hooks !== undefined &&
          !(Array.isArray(remoteConfig.launcher_hooks) && remoteConfig.launcher_hooks.length === 0) &&
          launcherResult?.hooksRegistered !== true
        ) {
          logFeatureBad("self_hosted_review_session", "launcher_hooks");
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Session ${sessionId} is a code review and is not started: the launcher hooks that the service sent for it could not be set up, and a code review does not go on without them. The [runner:session] line before this one says why.`,
            "a code review is not started without the hooks that the service sent for it",
          );
        }
        if (launcherResult?.hooksRegistered)
          if (repoFindings.repoDisablesAllHooks && !isReviewSession) {
            onStatus(
              "[runner:session] launcher_hooks materialized, but a repo .claude/settings.json or settings.local.json carries disableAllHooks:true \u2014 the child will drop every flagSettings hook (CCR-supplied Stop reply-gate included)",
            );
            logFeatureSad(
              "self_hosted_launcher_hooks",
              "self_hosted_launcher_hooks_disabled_by_repo_disableAllHooks",
            );
          } else if (confineScanThrew)
            logFeatureSad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_confine_scan_aborted");
          else logFeatureOk("self_hosted_launcher_hooks");
      }
      let refusedCounts = {
        ...serverAutoModeRules.refusedCounts,
        allow_withheld_by_setting: allowWithheldBySetting,
      };
      if (!autoModeWritten && serverAutoModeRules.autoMode !== undefined)
        logFeatureBad("self_hosted_auto_mode_lists", "settings_too_large", refusedCounts);
      else if (serverAutoModeRules.grantsWithheld) {
        if (autoModeWritten) logFeatureSad("self_hosted_auto_mode_lists", "grants_withheld", refusedCounts);
        else logFeatureBad("self_hosted_auto_mode_lists", "grants_withheld", refusedCounts);
      } else if (serverAutoModeRules.statusLines.length > 0) {
        if (autoModeWritten) logFeatureSad("self_hosted_auto_mode_lists", "list_ignored", refusedCounts);
        else logFeatureBad("self_hosted_auto_mode_lists", "all_lists_ignored", refusedCounts);
      } else if (presetResult.withheld.length > 0 && !isNoAllow)
        logFeatureSad("self_hosted_auto_mode_lists", "operator_withheld", {
          allow_withheld_by_setting: allowWithheldBySetting,
        });
      else if (presetResult.withheld.length > 0 || autoModeWritten)
        logFeatureOk("self_hosted_auto_mode_lists", {
          allow_withheld_by_setting: allowWithheldBySetting,
          lists_written: autoModeWritten,
        });
      if (signal.aborted) {
        onDebug(`[runner:session] Aborted after git prep for ${sessionId} \u2014 bailing before spawn`);
        return {
          result: "abandoned",
        };
      }
      let writeStdin;
      let pendingAcks = new Map();
      let tokenAckWaiters = new Map();
      let sessionGoneSent = false;
      let endSessionMessage =
        jsonStringify({
          type: "control_request",
          request_id: `runner-session-gone-${sessionId}`,
          request: {
            subtype: "end_session",
            reason: "session_not_found",
          },
        }) +
        `
`;
      let handleSessionGone = (error, source) => {
        if (!isNotFoundOrInactive(error)) return false;
        if (sessionGoneSent) return true;
        sessionGoneSent = true;
        onStatus(
          `[runner:session] ${sessionId} ${source} says session gone server-side \u2014 sending end_session to child`,
        );
        writeStdin?.(endSessionMessage);
        return true;
      };
      let reconcileRemote = async (config, token) => {
        let governedGit_2 = config.governed_git;
        await pushUrlReconciler?.reconcile(governedGit_2, token);
        if (sessionGitRules !== undefined && governedGit?.directUpstreams !== undefined) {
          let keepPushWiring =
            governedGit_2 === undefined || governedGit_2.git_mount_push_base_url !== undefined;
          let fetchLines =
            governedGit_2 === undefined
              ? undefined
              : splitSourcesByMount(config.sources, governedGit.mountBaseUrl, governedGit.directUpstreams);
          await withFsOpTimeout(
            sessionGitRules.reconcile({
              ...(keepPushWiring && {
                push: {
                  baseUrl: isLoopbackUrl(governedGit_2?.git_mount_push_base_url, onDebug),
                },
              }),
              ...(fetchLines !== undefined && {
                fetchLines,
              }),
              presentedToken: token,
            }),
            "session git rules rewrite",
          ).catch((error) => {
            onDebug(`[runner:session] session git rules: ${errorMessage(error)} (ignored)`);
          });
        }
        if (governedGit_2 !== undefined && governedGit_2.rest_mount_base_url === undefined) return;
        await ghRoute?.reconcile(
          isLoopbackUrl(governedGit_2?.rest_mount_base_url, onDebug, BAD_REST_MOUNT_WARNING),
          token,
        );
      };
      let representToken = async (token, tokenExpiry) => {
        tokenRef.current = token;
        let expiryEpoch = tokenExpiry === undefined ? null : decodeSessionJwt(tokenExpiry);
        let maxBudgetMs = governedPushRepresentRetryMs * GOVERNED_REPRESENT_RETRY_STEPS;
        let deadlineMs =
          expiryEpoch === null
            ? maxBudgetMs
            : Math.max(
                0,
                Math.min(maxBudgetMs, expiryEpoch * 1000 - Date.now() - GOVERNED_REPRESENT_RETRY_SLACK_MS),
              );
        let representOutcome = await retryGitOperation({
          represent: () =>
            tokenRef.current === token
              ? getRemoteConfig(sessionId, token, childSignal)
              : Promise.reject(Error("a newer session token is in use")),
          isTransient: (error) => tokenRef.current === token && isRetryableRunnerError(error),
          retryDelayMs: governedPushRepresentRetryMs,
          deadlineMs,
          signal: childSignal,
          onDebug,
        });
        if (childSignal.aborted) return;
        if (tokenRef.current !== token) return;
        if (representOutcome.outcome === "presented") {
          representRetrySender?.cancel();
          representRetrySender = undefined;
          await reconcileRemote(representOutcome.config, token);
          return;
        }
        if (
          representOutcome.reason === "permanent" &&
          handleSessionGone(representOutcome.error, "/remote (token re-present)")
        )
          return;
        onStatus(
          `[runner:warn] governed git: could not re-present the refreshed session token on /remote for ${sessionId} (${representOutcome.reason === "budget" ? "still failing when the retry budget ran out" : "the request was refused"}); the child gets the token anyway. Session traffic through CCR's mounts (git pushes and fetches, gh writes) may be refused (git_token_mismatch) until a /remote call with this token succeeds` +
            (representOutcome.reason === "budget" ? " \u2014 retrying in the background." : "."),
        );
        if (pushUrlReconciler !== undefined)
          logFeatureSad("self_hosted_governed_push_url", "represent_failed");
        if (mountReadWiring.length > 0) logFeatureSad("self_hosted_governed_mount_read", "represent_failed");
        if (ghRoute !== undefined) logFeatureSad("self_hosted_governed_gh_route", "represent_failed");
        if (sessionGitRules !== undefined) logFeatureSad("self_hosted_session_git_rules", "represent_failed");
        representRetrySender?.cancel();
        representRetrySender = undefined;
        if (representOutcome.reason !== "budget") return;
        let retrySender = undefined;
        let stopRetrySender = () => {
          retrySender?.cancel();
          if (representRetrySender === retrySender) representRetrySender = undefined;
        };
        retrySender = createDebouncedSender({
          intervalMs: governedPushRepresentRetryMs * 4,
          errorRetryMs: governedPushRepresentRetryMs * 4,
          signal: childSignal,
          refresh: async () => {
            let token = tokenRef.current;
            let config = await getRemoteConfig(sessionId, token, childSignal);
            if (childSignal.aborted) return;
            if (token === tokenRef.current) {
              stopRetrySender();
              onStatus(
                `[runner:session] governed git: refreshed session token re-presented on /remote for ${sessionId}`,
              );
              await reconcileRemote(config, token);
            }
            return;
          },
          onError: (error) => {
            if (childSignal.aborted) return;
            if (handleSessionGone(error, "/remote (token re-present)")) {
              stopRetrySender();
              return;
            }
            if (!isRetryableRunnerError(error)) {
              stopRetrySender();
              onStatus(
                `[runner:warn] governed git: background re-present of the session token for ${sessionId} refused: ${errorMessage(error)}; giving up until the next scheduled /remote read`,
              );
              return;
            }
            onDebug(
              `[runner:session] governed git: background /remote re-present failed: ${errorMessage(error)}; retrying`,
            );
          },
        });
        representRetrySender = retrySender;
      };
      let onTokenRefreshed = (token) => {
        setSessionToken(token);
        tokenHistory.previous = tokenHistory.current;
        tokenHistory.current = token;
        recordHeldToken(token);
        warnTokenUpdateNotAcked({
          pendingAcks,
          sessionId,
          onStatus,
        });
        deliverRefreshedToken({
          write: writeStdin,
          envVar: "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
          token,
          sessionId,
          label: "session_token",
          onStatus,
          pendingAcks,
        });
      };
      let jwtExpiry = getJwtExpiry({
        getAccessToken: async () => {
          let token = tokenRef.current;
          let newToken;
          try {
            ({ token: newToken } = await apiClient.refreshToken(token));
          } catch (error) {
            if (handleSessionGone(error, "refreshToken")) jwtExpiry.cancel(sessionId);
            throw error;
          }
          if (tokenRef.current !== token) return;
          if (
            pushUrlReconciler !== undefined ||
            mountReadWiring.length > 0 ||
            ghRoute !== undefined ||
            sessionGitRules !== undefined
          ) {
            await representToken(newToken, token);
            if (tokenRef.current !== newToken) return;
          }
          return newToken;
        },
        onRefresh: (refreshError, refreshedToken) => onTokenRefreshed(refreshedToken),
        label: "self-hosted-runner-session",
      });
      if (toolServerHosting === undefined) jwtExpiry.schedule(sessionId, tokenRef.current);
      let childResult;
      let lifecycleStatus;
      try {
        prepTimer.lap();
        let earlyRemote = await fetchEarlyRemote();
        if (serializeEventPosts && eventPostError !== undefined) throw eventPostError;
        let earlyRemoteAgeMs =
          earlyRemote === undefined ? undefined : Math.round(performance.now() - earlyRemote.armedAt);
        let refetchedConfig;
        let presentedToken;
        if (
          earlyRemote !== undefined &&
          earlyRemoteAgeMs !== undefined &&
          earlyRemoteAgeMs <= POST_HOOK_TIMEOUT_MS
        ) {
          refetchedConfig = earlyRemote.config;
          presentedToken = earlyRemote.presentedToken;
        } else {
          if (earlyRemoteAgeMs !== undefined)
            onDebug(
              `[runner:session] early /remote result is ${earlyRemoteAgeMs}ms old (> ${POST_HOOK_TIMEOUT_MS}ms) \u2014 re-fetching for a fresh inference token`,
            );
          refetchedConfig = await retryWithBackoff(
            () => {
              presentedToken = tokenRef.current;
              return getRemoteConfig(sessionId, presentedToken, signal);
            },
            {
              initialDelayMs: 1000,
              maxDelayMs: 30000,
              signal,
              ...(serializeEventPosts && {
                shouldRetry: () => eventPostError === undefined,
              }),
              onRetry: (attempt, error) => {
                onDebug(`[runner:session] /remote re-fetch attempt ${attempt} failed: ${error}. Retrying.`);
              },
            },
          );
        }
        if (refetchedConfig) {
          if (isReviewOriginSession(refetchedConfig) !== isReviewSession) {
            logFeatureBad("self_hosted_review_session", "marker_changed");
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Session ${sessionId}: two /remote responses disagree on whether it is a code review (a server-side fault: nothing on this runner needs changing)`,
              "two /remote responses disagree on whether the session is a code review",
            );
          }
          remoteConfig = refetchedConfig;
          let proxyRefusal = agentProxyStandaloneRefusal({
            sessionId,
            serverEnv: remoteConfig.environment_variables,
            runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
            runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
            governedGit:
              governedGit?.toolConfig.gitConfig === true || governedGit?.toolConfig.ghPathShim === true
                ? "on"
                : "off",
            egressListener: isEgressProxyActive() !== undefined,
            gitConfigArmed: governedGit?.toolConfig.gitConfig === true,
          });
          if (proxyRefusal) {
            onStatus(`[runner:error] ${proxyRefusal.message}`);
            agentProxyRefused = true;
            throw proxyRefusal;
          }
          onDebug(
            `[runner:session] Re-fetched /remote for fresh inference token (expires_in=${remoteConfig.inference_auth?.expires_in_seconds}s)`,
          );
          await reconcileRemote(remoteConfig, presentedToken);
        } else
          onDebug(
            "[runner:session] /remote re-fetch failed after retries \u2014 using stale step-2 token. Interval refresher will converge.",
          );
        prepTimer.mark("runner_prep_remote_refetch_ms");
        let stagedArgs = [];
        let subagentPromptInline = Object.hasOwn(
          await writeSystemPromptFile({
            args: stagedArgs,
            claudeCodeArgs: remoteConfig.claude_code_args,
            configDir: sessionClaudeConfigDir,
            stagedPaths,
            childIsOwnBinary,
            onDebug,
          }),
          APPEND_SUBAGENT_SYSTEM_PROMPT,
        );
        await writeSessionAgentsFile({
          args: stagedArgs,
          agentFiles: remoteConfig.agent_files ?? [],
          serverAgentsArg: remoteConfig.claude_code_args.agents,
          configDir: sessionClaudeConfigDir,
          stagedPaths,
          onDebug,
        });
        if (debugTokenDir && remoteConfig.inference_auth?.access_token)
          writeBestEffort(
            debugTokenDir,
            `inference_token_${sessionId}.txt`,
            remoteConfig.inference_auth.access_token,
            onStatus,
          );
        let inferenceRefresher = undefined;
        let debouncedSender = createDebouncedSender({
          intervalMs: tokenRefreshIntervalMs(remoteConfig.inference_auth?.expires_in_seconds),
          ttlMs: ttlMsFromSeconds(remoteConfig.inference_auth?.expires_in_seconds),
          ...TOKEN_REFRESH_TIMING,
          isTransient: isTransientRunnerError,
          refresh: async () => {
            if (toolServerHosting !== undefined) return;
            let token = tokenRef.current;
            let finishRemoteCall = inferenceRefresher?.onRemoteCallStarted();
            let config = await getRemoteConfig(sessionId, token, signal, {
              timeoutMs: SESSION_POLL_MS,
            });
            finishRemoteCall?.();
            await reconcileRemote(config, token);
            let accessToken = config.inference_auth?.access_token;
            if (!accessToken) throw new RemoteConfigWithoutInferenceAuthError();
            warnTokenUpdateNotAcked({
              pendingAcks,
              sessionId,
              onStatus,
            });
            deliverRefreshedToken({
              write: writeStdin,
              envVar: "CLAUDE_CODE_OAUTH_TOKEN",
              token: accessToken,
              sessionId,
              label: "inference_token",
              onStatus,
              expiresInSeconds: config.inference_auth?.expires_in_seconds,
              pendingAcks,
            });
            let expiresInSeconds = config.inference_auth?.expires_in_seconds;
            return {
              intervalMs: tokenRefreshIntervalMs(expiresInSeconds),
              ttlMs: ttlMsFromSeconds(expiresInSeconds),
              nextInMs: inferenceRefresher?.takeFollowUpInMs(),
            };
          },
          onError: (error, details) => {
            if (handleSessionGone(error, "/remote")) {
              debouncedSender.cancel();
              return;
            }
            let delayLabel =
              details.delayMs >= 120000
                ? `${Math.round(details.delayMs / 60000)}m`
                : `${Math.round(details.delayMs / 1000)}s`;
            let retryNote = details.transient
              ? `Retrying shortly (in ${delayLabel})`
              : `Not retrying early (${error instanceof RemoteConfigWithoutInferenceAuthError ? "CCR answered without an inference token" : `HTTP ${getHttpStatus(error) ?? "none"}: the request or the session, not the network, is the problem`}); next scheduled attempt in ${delayLabel}`;
            let expiryNote = details.expired
              ? " The child's current token has expired or is within a minute of expiring; its turns will fail until a refresh succeeds."
              : "";
            onStatus(
              `[runner:session] inference_token refresh failed for ${sessionId}: ${error}. ${retryNote}.${expiryNote}`,
            );
          },
          signal,
        });
        let retryAbort;
        let refreshInferenceToken = (
          reason,
          { force } = {
            force: false,
          },
        ) => {
          let outcome = debouncedSender.refreshNow({
            force,
          });
          if (outcome === "fired") {
            onStatus(
              `[runner:session] ${reason} for ${sessionId} \u2014 requesting a fresh inference_token from CCR now`,
            );
            return outcome;
          }
          onDebug(
            `[runner:session] ${reason} for ${sessionId} \u2014 ${outcome === "in_flight" ? "an inference_token refresh is already in progress" : outcome === "debounced" ? `an inference_token refresh started under ${TOKEN_REFRESH_TIMING.minRefreshGapMs / 1000}s ago; not starting another` : "the session is ending; not refreshing"}`,
          );
          return outcome;
        };
        let probeResult = await withBoundedTimeout(
          startupProbe ?? Promise.resolve(undefined),
          CHECKOUT_DISPLAY_LIMIT,
          "startup probe",
        ).catch(() => {
          return;
        });
        let inPrivateCheckout = false;
        let guestVitals;
        let stopChildUpdate;
        let unusedCleanupA;
        let unusedCleanupB;
        let unusedChildHandle = undefined;
        let unusedChildStopper;
        try {
          await awaitTokenWrites();
          await postStep("start_cc", "started", "Starting Claude Code");
          if (serializeEventPosts) await flushEventPosts();
          await awaitTokenWrites();
          signal.throwIfAborted();
          prepHeartbeat?.cancel();
          abortTokenWait();
          childStarted = true;
          let runnerStartupTiming = undefined;
          guestVitals =
            hosting.kind === "agent-loop" && ingressTokenFile !== undefined
              ? startGuestVitals({
                  sessionId,
                  apiBaseUrl: new URL(isLocalhostUrl(remoteConfig.api_base_url, sessionId).sdkUrl).origin,
                  tokenFilePath: ingressTokenFile,
                  binaryResolution: "pinned",
                  log: onDebug,
                })
              : undefined;
          tokenHistory.current = tokenRef.current;
          recordHeldToken(tokenHistory.current);
          let unusedChildRunner;
          spawnedSessionIds?.add(sessionId);
          if (isReviewSession) {
            reviewTokensHandedOver = true;
            env.unset("CLAUDE_CODE_SESSION_ACCESS_TOKEN");
          }
          childResult = await runSessionChild({
            execPath,
            execArgs,
            updatedChildBin,
            childUpdateBin: inPrivateCheckout || isReviewSession ? undefined : childUpdateBin,
            onChildUpdateReady: inPrivateCheckout || isReviewSession ? undefined : onChildUpdateReady,
            config: remoteConfig,
            inPrivateCheckout,
            sessionId,
            sessionToken: tokenRef.current,
            child: hosting,
            trustWorkspace: trustWorkspace === true,
            ghRoutePath: ghRoute?.path,
            ghRouteBasePath: ghRoute?.basePath,
            sessionGitRulesPath: sessionGitRules && sessionGitRulesPath,
            runnerStartupTiming,
            ...false,
            capacity,
            healthPort,
            clientPlatform,
            cwd: childCwd,
            configDir: sessionClaudeConfigDir,
            diffFindsNestedRepository,
            freshMachinePerSession: freshMachinePerSession && gitConfigOwnership !== "another",
            diffCopyRoot,
            noRepositoryCheckedOut: preparedRepos.length === 0,
            stageFileRoot,
            stagedFileArgs: stagedArgs,
            subagentPromptInline,
            governedGit,
            governedGitConfigPath,
            childGitEnvironment,
            debugFile,
            mcpConfigPath,
            launcherSettingsPath,
            addDirs,
            onDebug,
            onStatus,
            onSessionActivity,
            onBgTaskLedger,
            onBgFollowupPending,
            onPostTurnSettle,
            onChildLifecycle: onChildLifecycle
              ? (lifecycle) => {
                  if (lifecycle === "spawned") onChildLifecycle(lifecycle);
                  else lifecycleStatus = lifecycle;
                }
              : undefined,
            onChildInit: () => {
              childInitSeen = true;
              onInitPhase?.({
                kind: "end",
                durationSec: (Date.now() - initStartMs) / 1000,
              });
            },
            onSessionStartHookError,
            onMaxLifetime,
            onChildTerminating,
            postSessionHookTimeoutMs: options.postSessionHookTimeoutMs ?? POST_SESSION_HOOK_TIMEOUT_MS,
            pushOutcomeOnRelease: pushOutcomeOnRelease ?? false,
            signal,
            onTokenAck: (ackId) => {
              tokenAckWaiters.get(ackId)?.(true);
              let pendingAck = pendingAcks.get(ackId);
              if (pendingAck) {
                pendingAcks.delete(ackId);
                onStatus(
                  `[runner:session] ${pendingAck.label} update ${ackId} acked by child (${Date.now() - pendingAck.sentAtMs}ms)`,
                );
              }
            },
            onResultApiError: (httpStatus) => {
              if (httpStatus === 401 || httpStatus === 403)
                refreshInferenceToken(`child turn ended with HTTP ${httpStatus} from the model API`);
            },
            onProxyRefusal: undefined,
            onChildStdinReady: (writeFn) => {
              writeStdin = writeFn;
              if (sessionGoneSent) writeFn(endSessionMessage);
            },
          });
          inferenceRefresher?.onChildExited(childResult.result);
        } finally {
          stopChildUpdate?.();
          unusedCleanupA?.();
          unusedChildStopper?.();
          for (let waiter of tokenAckWaiters.values()) waiter(false);
          retryAbort?.abort();
          retryAbort = undefined;
          debouncedSender.cancel();
          writeStdin = undefined;
          guestVitals?.then((vitals) => vitals?.stop());
        }
      } finally {
        jwtExpiry.cancelAll();
        abortController.abort();
      }
      result = childResult.result;
      let stderrTail = rewriteContractionError(childResult.stderrTail);
      let reason = typeof signal.reason === "string" ? signal.reason : undefined;
      if (childResult.result === "failed") {
        failureReason = childResult.startError
          ? `child failed to start (${childResult.startError.class}): ${stderrTail}`
          : `child exited ${childResult.exitCode ?? "null"}: ${stderrTail}`;
        failureKind =
          childResult.startError?.class === "e2big"
            ? "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR"
            : "SESSION_FAILURE_KIND_RUNNER_CRASH";
        exitBeforeInitFailed = true;
      } else if (childResult.result === "interrupted")
        failureReason = `child interrupted (SIGTERM/watchdog): ${stderrTail}`;
      onDebug(`[runner:session] Session ${sessionId} completed: ${result}`);
      failedOnUpdateBuild = false;
      restartingForUpdate = reason === "update";
      if ((restartingForUpdate || failedOnUpdateBuild) && workerEpoch !== undefined) {
        let epoch = workerEpoch;
        let apiBaseUrl = remoteConfig.api_base_url;
        await retryWithBackoff(
          () =>
            apiClient.updateSessionWorkerState(apiBaseUrl, sessionId, tokenRef.current, epoch, {
              connectionStatus: "disconnected",
            }),
          {
            initialDelayMs: 500,
            maxDelayMs: 2000,
            maxAttempts: 3,
            shouldRetry: isRetryableRunnerError,
          },
        ).catch((error) => {
          onDebug(
            `[runner:session] ${sessionId} disconnect before the update restart failed: ${errorMessage(error)}`,
          );
          if (!isRetryableRunnerError(error)) failedOnUpdateBuild = false;
        });
      }
      if (
        (result === "failed" || result === "interrupted") &&
        workerEpoch !== undefined &&
        !restartingForUpdate &&
        !failedOnUpdateBuild
      ) {
        let failureOutcome = await postSessionFailureResult({
          apiClient,
          apiBaseUrl: remoteConfig.api_base_url,
          sessionId,
          sessionToken: tokenRef.current,
          workerEpoch,
          exitCode: childResult.exitCode,
          exitSignal: childResult.exitSignal,
          stderrTail,
          startError: childResult.startError,
          refusedByHostPolicy:
            !childInitSeen && childResult.stderrTail.includes(SIDELOAD_FLAGS_BLOCKED_PHRASE),
          onDebug,
          onStatus,
          signal,
        });
        if (failureOutcome === "session_gone") sessionGoneSent = true;
        else if (failureOutcome === "epoch_stale") {
          epochStale = true;
          failureKind = undefined;
        }
      }
      if (
        result === "failed" &&
        sessionGoneSent &&
        (childResult.stderrTail.includes("SDKStartup: exiting without result") ||
          childResult.stderrTail.includes("RemoteIO: transport closed permanently") ||
          childResult.stderrTail.includes("worker epoch mismatch (409)"))
      ) {
        onStatus(
          `[runner:session] ${sessionId} child exit ${childResult.exitCode ?? "null"} after server end_session \u2014 session archived/deleted; clean close, not a runner failure`,
        );
        result = "completed";
        failureReason = undefined;
        failureKind = undefined;
        failedOnUpdateBuild = false;
        exitBeforeInitFailed = false;
      }
      if (result === "failed")
        logFeatureBad("self_hosted_session_handle", "self_hosted_session_child_failed");
      else if (result === "completed") logFeatureOk("self_hosted_session_handle");
      if (lifecycleStatus !== undefined && (result === "completed" || result === "failed"))
        onChildLifecycle?.(result);
      else if (result === "interrupted")
        onChildLifecycle?.(
          reason === "idle-release" || reason === "deassign" || reason === "update"
            ? "completed"
            : "interrupted",
        );
    } catch (error) {
      prepHeartbeat?.cancel();
      if (signal.aborted) {
        let reason = typeof signal.reason === "string" ? signal.reason : "unspecified";
        onDebug(
          `[runner:session] ${sessionId} aborted during setup (reason=${String(reason)}) \u2014 not a failure`,
        );
        result = "interrupted";
        return {
          result: "interrupted",
        };
      }
      let epochRejected = serializeEventPosts
        ? await flushEventPosts().then(
            () => false,
            (error) => isEpochMismatchError(error),
          )
        : false;
      if (isEpochMismatchError(error) || epochRejected) {
        let setupErrorNote =
          epochRejected && !isEpochMismatchError(error)
            ? ` Setup had meanwhile thrown: ${redactSecretsInText(error instanceof Error ? error.message : String(error))}`
            : "";
        onDebug(
          `[runner:session] epoch fence tripped \u2014 another runner has taken ${sessionId} (we got epoch ${workerEpoch} but server rejected). Aborting before spawn.${setupErrorNote}`,
        );
        epochStale = true;
        result = "abandoned";
        return {
          result: "abandoned",
        };
      }
      let setupTerminal = false;
      let isRefNotFound =
        !setupTerminal && (error instanceof SourceRefNotFoundError || error instanceof FetchRefNotFoundError);
      let errorMessageText = redactSecretsInText(error instanceof Error ? error.message : String(error));
      let redactedMessage = isRefNotFound ? errorMessageText : rewriteContractionError(errorMessageText);
      failureReason = `setup threw: ${redactedMessage}`;
      {
        let httpStatus = getHttpStatus(error);
        if (httpStatus !== undefined && httpStatus >= 500)
          failureKind = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
        else if (isRefNotFound) failureKind = "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR";
      }
      if (isRefNotFound) setupFailureKind = "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
      else if (setupTerminal) setupFailureKind = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TERMINAL";
      else if (error instanceof CheckoutHookTimedOutError)
        setupFailureKind = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TIMEOUT";
      else if (!childStarted) setupFailureKind = setupFailureKindOf(error);
      exitBeforeInitFailed = true;
      logFeatureBad("self_hosted_session_handle", "self_hosted_session_setup_failed");
      onDebug(`[runner:session] Session ${sessionId} threw: ${redactedMessage}`);
      if (workerEpoch === undefined)
        onDebug(
          `[runner:session] Session ${sessionId} setup failed at/before registerWorker \u2014 skipping best-effort UI failure post (no valid epoch)`,
        );
      else if (agentProxyRefused)
        onDebug(
          `[runner:session] Session ${sessionId} is refused for the agent proxy mode and left to another runner \u2014 no failure result is posted`,
        );
      else if (
        (await postSessionFailureResult({
          apiClient,
          apiBaseUrl: remoteConfig.api_base_url,
          sessionId,
          sessionToken: tokenRef.current,
          workerEpoch,
          exitCode: null,
          exitSignal: null,
          stderrTail: redactedMessage,
          setupTerminal,
          setupFailureKind,
          insteadOfRetryHint: isRefNotFound
            ? "Retrying will fail the same way until you fix the missing branch described below."
            : REPO_NOT_FOUND_REASON(error),
          onDebug,
          onStatus,
          signal,
        })) === "epoch_stale"
      )
        epochStale = true;
      result = "failed";
    }
  } catch (error) {
    if (signal.aborted) {
      onDebug(`[runner:session] ${sessionId} aborted during pre-spawn \u2014 not a failure`);
      return {
        result: "interrupted",
      };
    }
    let redactedMessage = rewriteContractionError(
      redactSecretsInText(error instanceof Error ? error.message : String(error)),
    );
    failureReason = `pre-spawn threw: ${redactedMessage}`;
    {
      let httpStatus = getHttpStatus(error);
      if (httpStatus !== undefined && httpStatus >= 500)
        failureKind = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
    }
    setupFailureKind ??= setupFailureKindOf(error);
    exitBeforeInitFailed = true;
    logFeatureBad("self_hosted_session_handle", "self_hosted_session_prespawn_failed");
    if (tokenRef.current && remoteConfig)
      onDebug(
        `[runner:session] FATAL pre-spawn: ${sessionId}: ${redactedMessage} \u2014 cannot post failure to UI: no worker epoch obtained`,
      );
    else if (tokenRef.current)
      onDebug(
        `[runner:session] FATAL pre-spawn: ${sessionId}: ${redactedMessage} \u2014 cannot post failure to UI: config not yet fetched`,
      );
    else
      onDebug(
        `[runner:session] FATAL pre-spawn: ${sessionId}: ${redactedMessage} \u2014 cannot post failure to UI: no session_token obtained`,
      );
    result = "failed";
  } finally {
    moveWatch?.release(sessionId);
    abortTokenWait();
    let timeoutMs = options.postSessionHookTimeoutMs ?? POST_SESSION_HOOK_TIMEOUT_MS;
    let deadline = Date.now() + SETUP_STEP_DEADLINE_MS;
    for (let wiring of mountReadWiring) {
      let remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        onStatus(
          `[runner:warn] governed git: mount-read cleanup budget exhausted; the repo-local mount rewrite stays in ${wiring.path}, so the post-session hook's fetches of that repository still address the mount (best-effort; the next prep drops it)`,
        );
        continue;
      }
      await setUrlInsteadOf(wiring.path, wiring.mountUrl, wiring.mountBaseUrl, onDebug, remainingMs);
    }
    let rebuilt = false;
    let rebuildTrustBundle = async () => {
      if (!governedGitState || rebuilt) return;
      rebuilt = true;
      await withFsOpTimeout(
        buildGitTrustBundle(governedGitState, readTrustBundleSource),
        "rebuild the trust bundle",
      ).catch((error) => {
        onDebug(
          `[runner:session] governed git: the trust bundle could not be rebuilt (${errorMessage(error)}); the runner's own git keeps GIT_SSL_CAINFO`,
        );
      });
    };
    if (
      pushOutcomeOnRelease &&
      childStarted &&
      !(remoteConfig !== undefined && isReviewOriginSession(remoteConfig)) &&
      result !== "completed" &&
      signal.reason !== "deassign" &&
      !epochStale &&
      outcomeBranches.length > 0
    ) {
      onStatus(
        `[runner:session] ${sessionId} ${result}: --push-outcome-on-release pushing ${outcomeBranches.length} outcome branch(es) to the source remote`,
      );
      let deadline = Date.now() + PUSH_ON_RELEASE_TIMEOUT_MS;
      if (outcomeBranches.some((branch) => needsMountFetchWithoutUpstream(branch.source)))
        await rebuildTrustBundle();
      for (let branch of outcomeBranches) {
        let remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          onDebug(
            `[runner:session] push-on-release budget exhausted; skipping '${branch.branch}' (best-effort)`,
          );
          continue;
        }
        if (branch.createdSha) {
          if (
            (await revParseVerify(branch.canonicalPath, `refs/heads/${branch.branch}`, remainingMs)) ===
            branch.createdSha
          ) {
            onDebug(
              `[runner:session] push-on-release '${branch.branch}' has no commits since creation; skipping (best-effort)`,
            );
            continue;
          }
        }
        if (branch.source.fetchViaMount) {
          onStatus(
            `[runner:warn] push-on-release: '${branch.branch}' NOT pushed \u2014 ${branch.source.repo} is reachable from this runner only through the session's git mount and the release push addresses the plain upstream; its commits exist only in this runner's checkout, so push from inside the session (those pushes use the mount) or preserve them in a post-session hook`,
          );
          continue;
        }
        let pushRemainingMs = deadline - Date.now();
        if (pushRemainingMs <= 0) {
          onDebug(
            `[runner:session] push-on-release budget exhausted; skipping '${branch.branch}' (best-effort)`,
          );
          continue;
        }
        let mountOnly = hasGovernedMountAndUpstream(branch.source);
        await pushOnRelease(
          branch.canonicalPath,
          branch.branch,
          branch.source,
          pushRemainingMs,
          onDebug,
          governedGitState && branch.source.url
            ? gitEnvironmentForRole(governedGitState, "outcome", {
                url: mountOnly ? branch.source.upstreamUrl : branch.source.url,
                mountRouted: branch.source.governedMount === true && !mountOnly,
              })
            : undefined,
        );
      }
    }
    let skippedCleanup = restartingForUpdate || failedOnUpdateBuild;
    if (childStarted) {
      let hook = await findHook(envSelfHostedRunnerHooksDir, "post-session");
      if (hook) {
        if (sessionGitConfigFiles !== undefined && configureGitSigningArtifacts !== undefined)
          await withBoundedTimeout(
            materializeSessionGitConfig({
              configDir: sessionClaudeConfigDir,
              baseDir,
              hookStubs: [],
              signingArtifacts: configureGitSigningArtifacts,
              onDebug,
              onStatus,
            }),
            GIT_ARTIFACTS_REFRESH_TIMEOUT_MS,
            "[runner:session] refresh session-scoped git artifacts",
          ).catch((error) => {
            gitConfigPins = lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms);
            onStatus(
              `[runner:session] could not refresh session-scoped git artifacts before the post-session hook (${errorMessage(error)}); its git runs with commit signing OFF instead`,
            );
          });
        await runPostSessionHook({
          hookPath: hook,
          gitConfigPins,
          gitConfigLegacyParams: hookGitLegacyParams,
          gitEnvironment: governedGitState && gitEnvironmentForSessionHook(governedGitState),
          cwd: sessionDir ?? baseDir,
          sessionId,
          exitReason: result,
          debugLogPath: debugFile,
          workspacePaths,
          sessionAccessToken:
            workerEpoch === undefined || (remoteConfig !== undefined && isReviewOriginSession(remoteConfig))
              ? undefined
              : tokenRef.current,
          apiBaseUrl: remoteConfig?.api_base_url,
          clientPlatform,
          timeoutMs,
          onStatus,
          onDebug,
        }).catch((error) => {
          onDebug(`[runner:hook:post-session] unexpected rejection (ignored): ${error}`);
        });
      }
    }
    if (sessionDirsCreated)
      await removeSessionState({
        sessionId,
        targets: [
          {
            path: diffCopyRoot,
            recursive: true,
          },
        ],
        onStatus,
        label: "removing the Changes pane's copies of git settings (they can hold a secret)",
      });
    let logForwarded = false;
    if (!hostConfigFailed && workerEpoch !== undefined && tokenRef.current && remoteConfig?.api_base_url)
      logForwarded = await forwardLogFile({
        apiClient,
        apiBaseUrl: remoteConfig.api_base_url,
        sessionId,
        sessionToken: tokenRef.current,
        workerEpoch,
        debugFile,
        onDebug,
      }).catch((error) => {
        onDebug(`[runner:session] debug log flush failed (best-effort): ${error}`);
        return false;
      });
    if (hostConfigFailed);
    else if (result === "completed")
      await withFsOpTimeout(unlink(debugFile), `unlink ${debugFile}`).catch(() => {});
    else if (removeSessionState_2 && sessionDirsCreated) {
      let unlinked = await withFsOpTimeout(unlink(debugFile), `unlink ${debugFile}`).then(
        () => true,
        (error) => isENOENT(error),
      );
      if (childStarted)
        onStatus(
          `[runner:session] ${sessionId} ${result} \u2014 child debug log ${logForwarded ? "tail forwarded to the session diagnostics on the server" : "NOT forwarded (no log, no worker registration, or the upload failed)"}; ${unlinked ? "not kept on disk" : "could not be unlinked, left to the directory removal below"} (--remove-session-state)`,
        );
    } else
      onStatus(`[runner:session] ${sessionId} ${result} \u2014 child debug log preserved at ${debugFile}`);
    if (mcpConfigPath)
      await withFsOpTimeout(unlink(mcpConfigPath), `unlink ${mcpConfigPath}`).catch(() => {});
    for (let path of [
      ...(launcherSettingsPath ? [launcherSettingsPath] : []),
      ...launcherStagedPaths,
      ...stagedPaths,
    ])
      await withFsOpTimeout(unlink(path), `unlink ${path}`).catch(() => {});
    if (sessionWorktrees.length > 0)
      await removeSessionWorktree({
        worktrees: sessionWorktrees,
        onDebug,
      }).catch((error) => {
        onDebug(`[runner:session] worktree cleanup failed: ${error}`);
      });
    let storedBranches = skipOutcomePush || skippedCleanup ? [] : outcomeBranches;
    if (storedBranches.some((branch) => isOnGovernedMount(branch.source))) await rebuildTrustBundle();
    for (let branch of storedBranches)
      await runGitQuiet(
        branch.canonicalPath,
        branch.branch,
        branch.needsDetach,
        onDebug,
        !!useAnthropicGitProxy || (sanitizedRepos.has(branch.canonicalPath) && "checkout"),
        undefined,
        undefined,
        governedGitState && branch.source.governedMount && branch.source.url
          ? gitEnvironmentForRole(governedGitState, "outcome", {
              url: branch.source.url,
              mountRouted: true,
            })
          : undefined,
      );
    if (sessionDirsCreated)
      await withFsOpTimeout(
        Promise.all([removeFileIfExists(caBundlePath), removeFileIfExists(childTrustBundlePath)]),
        "remove the trust bundle",
      ).catch((error) => {
        onDebug(
          `[runner:session] governed git: the trust bundle could not be removed (${errorMessage(error)})`,
        );
      });
    for (let credPath of gitProxyCredPaths)
      for (let configArgs of [["credential.helper", "^$"], [`credential.${credPath.origin}.helper`]])
        await new Promise((resolve) => {
          let child = spawn("git", ["-C", credPath.path, "config", "--local", "--unset-all", ...configArgs], {
            cwd: undefined,
            stdio: "ignore",
            windowsHide: true,
            ...cgroupSpawnOptions("helper"),
          });
          let timer = setTimeout((spawned) => spawned.kill("SIGKILL"), SIGKILL_DELAY_MS, child);
          let onExit = () => {
            clearTimeout(timer);
            resolve();
          };
          child.on("close", onExit);
          child.on("error", onExit);
        });
    abortController.abort();
    representRetrySender?.cancel();
    await pushUrlReconciler?.cleanup();
    if (sessionGitRules)
      await withBoundedTimeout(
        sessionGitRules.remove(),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        "[runner:stuck] session git rules removal (check the session directory mount)",
      ).catch((error) => {
        onDebug(`[runner:session] session git rules: ${errorMessage(error)} (ignored)`);
      });
    if (ghRoute)
      await withBoundedTimeout(
        ghRoute.close(),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        "[runner:stuck] gh route teardown (check the session directory mount)",
      ).catch((error) => {
        onDebug(`[runner:session] gh route: ${errorMessage(error)} (ignored)`);
      });
    for (let path of skippedCleanup ? [] : hookCheckouts)
      await withBoundedTimeout(
        rm(path, {
          recursive: true,
          force: true,
        }),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        `[runner:hook] rm -rf ${path}`,
      ).catch((error) => {
        onDebug(`[runner:hook] cleanup ${path} failed: ${error}`);
      });
    if (sessionGitConfigFiles !== undefined) {
      let dir = sessionGitConfigFiles;
      await withBoundedTimeout(
        isHooksDirSafe(sessionClaudeConfigDir, onStatus).then((dirSafe) =>
          dirSafe
            ? rm(dir, {
                recursive: true,
                force: true,
              })
            : undefined,
        ),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        `[runner:session] rm -rf ${dir}`,
      ).catch((error) => {
        onDebug(`[runner:session] cleanup ${dir} failed: ${error}`);
      });
    }
    if (useAnthropicGitProxy) delete process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
    if (ingressTokenFile) {
      removingTokenFiles = true;
      await resolved;
      let tokenFiles = tokenFilePaths();
      for (let tokenFile of tokenFiles)
        await cleanupSessionIngressTokenFiles(
          tokenFile,
          onStatus,
          rewriteTokenFiles,
          tokenFileOpTimeoutMs,
        ).catch(() => {});
      await Promise.all(
        extraTokenFiles.map((tokenFile) =>
          cleanupSessionIngressTokenFiles(tokenFile, onStatus, rewriteTokenFiles, tokenFileOpTimeoutMs).catch(
            () => {},
          ),
        ),
      );
      if (tokenWriteMissed)
        resolved_2
          .then(async () => {
            for (let tokenFile of [...tokenFiles, ...extraTokenFiles])
              await cleanupSessionIngressTokenFiles(
                tokenFile,
                onStatus,
                undefined,
                tokenFileOpTimeoutMs,
              ).catch(() => {});
          })
          .catch(() => {});
    }
    if (removeSessionState_2 && sessionDirsCreated && sessionDir) {
      let mapped = [
        getSessionClaudeConfigDir(baseDir, sessionId),
        getToolServerConfigDir(baseDir, sessionId),
        stageFileRoot,
        sessionDir,
        governedGitConfigPath,
        governedGitConfigPath + ".lock",
        caBundlePath,
        childTrustBundlePath,
      ].map((path) => ({
        path,
        recursive: true,
      }));
      let removedCount = await removeSessionState({
        sessionId,
        targets: mapped,
        onStatus,
      });
      onDebug(
        `[runner:session] ${sessionId}: --remove-session-state removed (or found absent) ${removedCount.length}/${mapped.length} per-session paths${removedCount.length > 0 ? `: ${removedCount.join(", ")}` : ""}`,
      );
    }
    if (initStartMs !== undefined && !childInitSeen)
      onInitPhase?.({
        kind: "exit-before-init",
        failed: exitBeforeInitFailed,
      });
  }
  return {
    result,
    failureReason,
    setupFailureKind,
    failureKind,
    failedOnUpdateBuild,
  };
}
//@ chunk-hm0ce8vc.js:140444-140512 placement
function sessionHostingKey(hosting) {
  return hosting.kind === "agent-loop" ? hosting.workerEpoch : hosting.hosting;
}
//@ chunk-hm0ce8vc.js:140512-159381 placement
/**
 * 启动并监管会话子进程：转发 stdin 控制、活动心跳、令牌刷新、输出转发与退出处理。
 */
function runSessionChild(options) {
  let {
    execPath,
    execArgs = [],
    updatedChildBin,
    childUpdateBin,
    onChildUpdateReady,
    config,
    sessionId,
    sessionToken,
    child,
    cwd,
    configDir,
    trustWorkspace,
    diffFindsNestedRepository,
    freshMachinePerSession,
    diffCopyRoot,
    noRepositoryCheckedOut,
    stageFileRoot,
    stagedFileArgs,
    subagentPromptInline,
    governedGit,
    governedGitConfigPath,
    childGitEnvironment,
    ghRoutePath,
    ghRouteBasePath,
    sessionGitRulesPath,
    capacity,
    inPrivateCheckout,
    healthPort,
    clientPlatform,
    debugFile,
    mcpConfigPath,
    launcherSettingsPath,
    addDirs,
    onDebug,
    onStatus,
    onBgTaskLedger,
    onBgFollowupPending,
    onPostTurnSettle,
    signal,
    onChildStdinReady,
    onTokenAck,
    onResultApiError,
    onProxyRefusal,
    onChildLifecycle,
    onChildInit,
    onSessionStartHookError,
    onMaxLifetime,
    onChildTerminating,
    runnerStartupTiming,
  } = options;
  let watchdog = {
    current: undefined,
  };
  let workerEpoch = child.kind === "agent-loop" ? child.workerEpoch : undefined;
  let reportActivity =
    options.onSessionActivity === undefined
      ? undefined
      : (activityKind, details) => {
          if (activityKind !== "activity" && watchdog.current?.terminationRequested) {
            onDebug(
              `[runner:session] ${sessionId} ignoring '${activityKind}' from a child that is being terminated`,
            );
            return;
          }
          options.onSessionActivity?.(activityKind, details);
        };
  let startupTimeoutMs = env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT ? 0 : getStartupTimeoutMs();
  let { sdkUrl, resumeUrl } = isLocalhostUrl(config.api_base_url, sessionId);
  let isReviewSession = isReviewOriginSession(config);
  let declarations = [
    ...(diffFindsNestedRepository && capacity === 1
      ? [
          DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
          ...(noRepositoryCheckedOut ? [DECLARES_NO_REPOSITORY_CHECKED_OUT] : []),
        ]
      : []),
    ...[],
  ];
  let childArgs = [
    ...execArgs,
    ...(declarations.length > 0 ? [runnerDeclarationArgument(declarations)] : []),
    "--print",
    "--sdk-url",
    sdkUrl,
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--replay-user-messages",
    `--resume=${resumeUrl}`,
    "--debug-file",
    debugFile,
  ];
  if (mcpConfigPath) childArgs.push("--mcp-config", mcpConfigPath);
  if (launcherSettingsPath) childArgs.push("--settings", launcherSettingsPath);
  for (let dir of addDirs ?? []) childArgs.push("--add-dir", dir);
  childArgs.push(...stagedFileArgs);
  let normalizedArgs = normalizeToolsArg(config.claude_code_args);
  if (hasDisallowedToolSpec(config.claude_code_args.tools)) {
    onDebug(
      "[runner:session] Stripped self-hosted-runner operator tool names from the server-supplied tools arg",
    );
    if (normalizedArgs.tools === "")
      onDebug(
        "[runner:warn] server-supplied tools arg contained ONLY self-hosted-runner operator tool names; dropping --tools and using the default pool",
      );
  }
  let forwardedCount = appendServerArgs(
    childArgs,
    stripSystemPromptFileArgs(
      isReviewSession
        ? import_reject(normalizedArgs, (key, value) => CHILD_EXTRA_FORWARDED_FLAGS.has(value))
        : normalizedArgs,
      subagentPromptInline,
    ),
    CHILD_FORWARDED_FLAGS,
    (reason, detail) => onDebug(`[runner:session] Skipping ${reason} claude_code_arg: ${detail}`),
  );
  if (forwardedCount > 0)
    onDebug(
      `[runner:session] Added ${forwardedCount}/${Object.keys(config.claude_code_args).length} claude_code_args`,
    );
  if (isReviewSession) childArgs.push("--setting-sources=");
  let inferenceAuth = config.inference_auth;
  if (child.kind === "agent-loop" && !inferenceAuth?.access_token)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Session ${sessionId} /remote response is missing inference_auth.access_token`,
      "/remote response is missing inference_auth.access_token",
    );
  onDebug(
    `[runner:session] inference_auth ${inferenceAuth ? `set (expires_in=${inferenceAuth.expires_in_seconds}s)` : "absent: the child calls no model"}`,
  );
  let replaced = sessionId.replace(/^cse_/, "session_");
  let OTEL_RESOURCE_ATTRIBUTES =
    config.environment_variables.OTEL_RESOURCE_ATTRIBUTES ?? env.OTEL_RESOURCE_ATTRIBUTES;
  let otelEnv =
    capacity > 1 && healthPort !== undefined && healthPort > 0 && env.OTEL_METRICS_EXPORTER === "prometheus"
      ? {
          OTEL_METRICS_EXPORTER: "otlp",
          OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/json",
          OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `http://127.0.0.1:${healthPort}/v1/metrics`,
          OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "none",
          OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "cumulative",
          OTEL_RESOURCE_ATTRIBUTES:
            (OTEL_RESOURCE_ATTRIBUTES ? `${OTEL_RESOURCE_ATTRIBUTES},` : "") +
            `session.id=${replaced}` +
            (clientPlatform ? `,client.platform=${clientPlatform}` : ""),
        }
      : {};
  let sessionIdFromJwt = getSessionIdFromJwt(sessionToken);
  if (
    ghRoutePath !== undefined &&
    (config.environment_variables?.PATH ?? process.env.PATH ?? "") !== ghRouteBasePath
  )
    onStatus(
      "[runner:warn] governed git: the session's PATH changed after the GitHub API route was set up; the session runs with the earlier PATH, so gh stays routed, and the new PATH is not used",
    );
  let sessionTokenEnv = child.kind === "agent-loop" ? sessionToken : undefined;
  let proxyUrlSet = env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL !== undefined;
  let usesStandaloneProxy = runnerUsesAgentProxyStandalone(
    config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
    env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
  );
  let showsCutOffCalls = (workerEpoch ?? 0) > 1 && env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS !== false;
  let enforcedEnv = {
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: sessionTokenEnv,
    ...(child.kind === "tool-server" && {
      CLAUDE_CODE_MCP_SERVE_SETTINGS: "{}",
    }),
    CLAUDE_SESSION_INGRESS_TOKEN_FILE:
      child.kind === "agent-loop" && !isReviewSession
        ? getIngressTokenTempPrefix(configDir, sessionHostingKey(child))
        : undefined,
    CLAUDE_CODE_OAUTH_TOKEN: inferenceAuth?.access_token,
    ...(isReviewSession && buildClearedAuthEnv()),
    CLAUDE_CODE_OAUTH_SCOPES: "user:inference user:ccr_inference user:file_upload",
    CLAUDE_CONFIG_DIR: configDir,
    CLAUDE_STAGE_FILE_ROOT: stageFileRoot,
    CLAUDE_CODE_DIFF_COPY_ROOT: diffFindsNestedRepository && capacity === 1 ? diffCopyRoot : undefined,
    ANTHROPIC_MODEL: undefined,
    ANTHROPIC_DEFAULT_MODEL: undefined,
    CLAUDE_CODE_ENVIRONMENT_KIND: "byoc",
    CLAUDE_CODE_IGNORE_PERSISTED_TRUST: trustWorkspace ? undefined : "1",
    CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION:
      env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION ||
      isEnvTruthy(config.environment_variables?.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION)
        ? "1"
        : undefined,
    CLAUDE_CODE_BYOC_ENABLE_DATADOG: process.env.CLAUDE_CODE_BYOC_ENABLE_DATADOG,
    DISABLE_TELEMETRY: process.env.DISABLE_TELEMETRY,
    DO_NOT_TRACK: process.env.DO_NOT_TRACK,
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
    DISABLE_ERROR_REPORTING: process.env.DISABLE_ERROR_REPORTING,
    DISABLE_GROWTHBOOK: process.env.DISABLE_GROWTHBOOK,
    ...otelEnv,
    CLAUDE_CODE_OTEL_DIAG_STDERR: "1",
    CLAUDE_CODE_TEE_SDK_STDOUT: "1",
    CLAUDE_RUNNER_ACTIVITY_FD: "3",
    CLAUDE_RUNNER_ALIVE_EVERY_MS: String(silenceStretchMs(startupTimeoutMs) || ""),
    CLAUDE_CODE_REMOTE: "true",
    CLAUDE_CODE_REMOTE_MCP_CONFIG: join(configDir, MCP_CONFIG_DELIVERED_JSON),
    CLAUDE_CODE_RETRY_WATCHDOG: "1",
    CLAUDE_CODE_MAX_RETRIES: "",
    CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE: "self_hosted",
    CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(clientPlatform),
    DISABLE_AUTOUPDATER: "1",
    CLAUDE_ENABLE_STREAM_WATCHDOG: "1",
    CLAUDE_RUNNER_CLAUDE_BIN: updatedChildBin ?? process.execPath,
    CLAUDE_RUNNER_UPDATE_BIN: childUpdateBin ?? "",
    CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: isReviewSession ? undefined : "1",
    [CLAUDE_CODE_REMOTE_SESSION_ORIGIN]: getRemoteSessionOrigin(config),
    ...(isReviewSession && {
      CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS: undefined,
    }),
    CLAUDE_CODE_REMOTE_SESSION_ID: sessionId,
    CLAUDE_CODE_REMOTE_SESSION_UUID: decodeTaggedUuid(sessionId),
    CLAUDE_CODE_ACCOUNT_UUID: config.environment_variables?.CLAUDE_CODE_ACCOUNT_UUID ?? undefined,
    CLAUDE_CODE_ORGANIZATION_UUID: config.environment_variables?.CLAUDE_CODE_ORGANIZATION_UUID ?? undefined,
    CCR_SESSION_ACCOUNT_EMAIL: sessionIdFromJwt ?? undefined,
    ANTHROPIC_BASE_URL: config.api_base_url,
    SESSION_INGRESS_URL: config.api_base_url,
    ...(config.api_base_url.includes("staging")
      ? {
          USE_STAGING_OAUTH: "1",
        }
      : {
          USE_STAGING_OAUTH: undefined,
        }),
    CLAUDE_CODE_USE_CCR_V2: "1",
    CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG: governedGit?.toolConfig.gitConfig ? "1" : undefined,
    CLAUDE_CODE_AGENT_PROXY_GH_SHIM: governedGit?.toolConfig.ghPathShim ? "1" : undefined,
    CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS:
      governedGit?.toolConfig.gitConfig && governedGit.toolConfig.hostSplit
        ? governedGit.toolConfig.hostSplit.governed.join(",")
        : undefined,
    ...(governedGit?.toolConfig.gitConfig && {
      GIT_CONFIG_GLOBAL: governedGitConfigPath,
    }),
    ...buildChildGitEnv(
      childGitEnvironment,
      config.environment_variables?.GIT_CONFIG_COUNT ?? process.env.GIT_CONFIG_COUNT,
      sessionGitRulesPath,
      getGitConfigParameters(config.environment_variables, process.env, getPlatform() === "windows"),
    ),
    ...(ghRoutePath !== undefined && {
      PATH: ghRoutePath,
    }),
    CCR_AGENT_PROXY_ENABLED:
      governedGit && (governedGit.toolConfig.gitConfig || governedGit.toolConfig.ghPathShim)
        ? "1"
        : undefined,
    SELF_HOSTED_RUNNER_AGENT_PROXY_URL: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
    AGENT_PROXY_URL: undefined,
    AGENT_PROXY_AUTH_TOKEN: undefined,
    CCR_AGENT_PROXY_STANDALONE_URL: undefined,
    ...((proxyUrlSet || child.kind === "agent-loop") && {
      CCR_AGENT_PROXY_RELAY_MODE: childRelayEnvValue(
        config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
        env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      ),
    }),
    ...(usesStandaloneProxy && agentProxyStandaloneRunnerEnv(process.env)),
    SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    ...egressProxyChildEnv(),
    SELF_HOSTED_RUNNER_HOST_CONFIG_DIR: undefined,
    SELF_HOSTED_RUNNER_HOLD_IDLE_FILE: undefined,
    SELF_HOSTED_RUNNER_MAX_HOLD_MS: undefined,
    CLAUDE_CODE_EXIT_AFTER_STOP_DELAY: undefined,
    CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN: undefined,
    CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS: undefined,
    CLAUDE_CODE_BRIDGE_PROMPT_SHA256: undefined,
    CLAUDE_CODE_BRIDGE_MCP_CARRIER: undefined,
    ...false,
    CCR_AUTO_MODE_APPLY: undefined,
    CCR_AUTO_MODE_ALLOW: undefined,
    CCR_AUTO_MODE_ENVIRONMENT: undefined,
    CCR_AUTO_MODE_SOFT_DENY: undefined,
    ...{},
    CLAUDE_CODE_WORKER_EPOCH: workerEpoch?.toString(),
    CLAUDE_CODE_RESUME_INTERRUPTED_TURN: (workerEpoch ?? 0) > 1 ? "1" : undefined,
    CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS: showsCutOffCalls ? "1" : undefined,
    CLAUDE_CODE_RESUME_PROMPT: showsCutOffCalls
      ? SESSION_MOVED_TAIL_PROMPT
      : (workerEpoch ?? 0) > 1
        ? SESSION_MOVED_CONTINUE_PROMPT
        : undefined,
    CCR_SPAWN_TIMESTAMP_MS: String(Date.now()),
    CCR_RUNNER_STARTUP_TIMING: runnerStartupTiming,
    [CCR_SHR_START_MARKS]: undefined,
    ...false,
  };
  let spawnArgs =
    child.kind === "tool-server"
      ? [
          ...execArgs,
          "mcp",
          "serve",
          "--transport",
          "http",
          "--port",
          "28471",
          "--result-format",
          "rendered",
          "--session-tunnel",
        ]
      : childArgs;
  let childEnv = mergeSessionEnv({
    inheritedEnv: process.env,
    serverEnv: config.environment_variables,
    enforcedEnv,
    onDropped: (reason, advice, name) =>
      onDebug(`[runner:session] Skipping ${name} environment name ${reason}: ${advice}`),
  });
  onDebug(
    `[runner:session] Spawning child: ${[execPath, ...execArgs].join(" ")} (${spawnArgs.length - execArgs.length} args) ANTHROPIC_BASE_URL=${config.api_base_url} CLAUDE_CODE_WORKER_EPOCH=${workerEpoch} cwd=${cwd}`,
  );
  let spawnFailure = (error) => {
    let description = describeSpawnFailure(error, [execPath, ...spawnArgs], childEnv);
    onDebug(
      `[runner:session] ${sessionId} spawn error (${description.class}): ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      result: "failed",
      exitCode: null,
      exitSignal: null,
      stderrTail: description.description,
      startError: description,
    };
  };
  let spawnOptions = {
    cwd,
    stdio: isReviewSession ? [...CHILD_STDIO_MODES] : ["pipe", "pipe", "pipe", "pipe"],
    env: childEnv,
    windowsHide: true,
    detached: true,
  };
  let childProcess;
  try {
    childProcess = spawn(execPath, spawnArgs, spawnOptions);
  } catch (error) {
    return Promise.resolve(spawnFailure(error));
  }
  let activityPipe;
  try {
    activityPipe = childProcess.stdio[3];
    activityPipe?.on?.("error", (pipeError) => {
      onDebug(`[runner:session] activity pipe error (${pipeError.message}); falling back to stdout readline`);
      activityPipe = undefined;
    });
  } catch (error) {
    onDebug(
      `[runner:session] activity pipe unavailable (${error instanceof Error ? error.message : String(error)}); falling back to stdout readline`,
    );
    activityPipe = undefined;
  }
  onStatus(`[runner:session] ${sessionId} child spawned pid=${childProcess.pid} cwd=${cwd}`);
  onChildLifecycle?.("spawned");
  if (isReviewSession && childProcess.pid !== undefined) {
    let accessToken = inferenceAuth?.access_token;
    if (
      accessToken !== undefined &&
      writeChildSessionTokens(
        childProcess,
        {
          sessionToken,
          inferenceToken: accessToken,
        },
        (writeError) =>
          onDebug(
            `[runner:session] ${sessionId} writing a token to its descriptor failed (${writeError.message})`,
          ),
      )
    )
      logFeatureOk("self_hosted_review_session");
    else {
      logFeatureBad("self_hosted_review_session", "handoff_failed");
      onStatus(
        `[runner:session] ${sessionId} could not be handed its tokens on descriptors; ending its child. The session fails. Nothing on this runner needs changing.`,
      );
      try {
        if (childProcess.pid === undefined || childProcess.pid <= 1)
          throw Error("no process group to signal");
        process.kill(-childProcess.pid, "SIGKILL");
      } catch {
        childProcess.kill("SIGKILL");
      }
    }
  }
  reportActivity?.("startup");
  let startupSilenceWatchdog = new SilenceWatchdog({
    limitMs: startupTimeoutMs,
    onSilent: () =>
      reportActivity?.("startup", {
        ...ledgerSnapshot(),
        childSilent: true,
      }),
  });
  if (child.kind === "tool-server") {
    childProcess.stdin?.on("error", (stdinError) => {
      onDebug(
        `[runner:session] ${sessionId} tool server's standard input closed before its line was read (${stdinError.message})`,
      );
    });
    childProcess.stdin?.write(
      jsonStringify({
        v: 1,
        session_id: sessionId,
        session_token: sessionToken,
        api_base_url: config.api_base_url,
        runner: child.runner,
      }) +
        `
`,
    );
  } else
    onChildStdinReady?.((write) => {
      if (childProcess.stdin && !childProcess.stdin.destroyed) {
        childProcess.stdin.write(write);
        return true;
      }
      return false;
    });
  let lifetimeWatchdog = new SessionLifetimeWatchdog({
    child: childProcess,
    sessionId,
    startTokenStale: options.startTokenStale,
    stuckExitCode: options.stuckExitCode,
    maxLifetimeMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS"),
    maxLifetimeGraceMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS") || MAX_LIFETIME_GRACE_MS,
    sigkillGraceMs: Math.min(
      Math.max(
        envPositiveMs("SELF_HOSTED_RUNNER_SIGKILL_GRACE_MS") || 30000,
        options.postSessionHookTimeoutMs +
          (options.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0) +
          SIGKILL_GRACE_BASE_MS,
      ),
      2147483647,
    ),
    sigkillTimeoutMs:
      envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") ||
      SessionLifetimeWatchdog.SIGKILL_TIMEOUT_DEFAULT_MS,
    onMaxLifetime,
    onTerminating: () => {
      startupSilenceWatchdog.end();
      onChildTerminating?.();
    },
    onDebug,
    onStatus,
  });
  watchdog.current = lifetimeWatchdog;
  let onAbort = () => lifetimeWatchdog.terminate();
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  if (signal.aborted) lifetimeWatchdog.terminate();
  let liveTasks = new Map();
  let countLiveTasks = () => {
    let count = 0;
    for (let kind of liveTasks.values()) if (kind !== "monitor_mcp" && kind !== "monitor_ws") count++;
    return count;
  };
  let wakeupAt = null;
  let turnEndTimer;
  let turnOpen = false;
  let sawWaitingOnUser = false;
  let turnIsFollowup = false;
  let awaitingUser = false;
  let sawInit = false;
  let sawSessionState = false;
  let sawRequiresAction = false;
  let sawResult = false;
  let wakeupSlackMs = 120000;
  let wakeupPending = () => wakeupAt !== null && Date.now() < wakeupAt;
  let ledgerSnapshot = () => ({
    liveTasks: liveTasks.size,
    liveTaskIds: Array.from(liveTasks, ([taskId, taskKind]) => `${taskId}:${taskKind}`),
    wakeupInMs: wakeupAt !== null ? Math.max(0, wakeupAt - Date.now()) : undefined,
    bgResultAwaitingFollowup: followupPending,
  });
  let followupGraceMs = envPositiveMs("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS") || BG_RESULT_GRACE_MS;
  let settleMs = envPositiveMs("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS") || POST_TURN_SETTLE_MS;
  let settleOpen = false;
  let settleDeadline = 0;
  let settleTimer;
  let closeSettle = (terminated = false) => {
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    if (settleOpen) {
      settleOpen = false;
      onPostTurnSettle?.(false, terminated);
    }
  };
  let scheduleSettleClose = (delayMs) => {
    let min = Math.min(Date.now() + delayMs, settleDeadline);
    if (settleTimer !== undefined) clearTimeout(settleTimer);
    settleTimer = setTimeout(closeSettle, Math.max(0, min - Date.now()));
  };
  let noteTurnSettled = () => {
    settleDeadline = Date.now() + settleMs;
    if (!settleOpen) {
      settleOpen = true;
      onPostTurnSettle?.(true);
    }
    scheduleSettleClose(settleMs);
  };
  let endedTaskIds = new Set();
  let turnHadTasks = false;
  let notifiedTaskIds = new Set();
  let subagentTasks = new Set();
  let followupPending = false;
  let followupGraceTimer;
  let clearFollowupGrace = () => {
    if (followupGraceTimer !== undefined) {
      clearTimeout(followupGraceTimer);
      followupGraceTimer = undefined;
    }
  };
  let clearFollowup = (reason, keepTurnOpen = false, terminated = false) => {
    if (!keepTurnOpen) {
      clearFollowupGrace();
      turnHadTasks = false;
      notifiedTaskIds.clear();
    }
    if (followupPending) {
      followupPending = false;
      onDebug(`[runner:session] ${sessionId} background-result follow-up cleared (${reason})`);
      onBgFollowupPending?.(false, terminated || watchdog.current?.terminationRequested === true);
    }
  };
  let armFollowupGrace = () => {
    clearFollowupGrace();
    followupGraceTimer = setTimeout(() => {
      followupGraceTimer = undefined;
      onStatus(
        `[runner:session] ${sessionId} no follow-up turn within ${formatDuration(followupGraceMs)} of the background task finishing \u2014 ` +
          "releasing the follow-up hold",
      );
      clearFollowup("grace elapsed");
      maybeEndTurn();
    }, followupGraceMs);
  };
  let markFollowupPending = () => {
    if (!followupPending) {
      followupPending = true;
      onStatus(
        `[runner:session] ${sessionId} background task finished; follow-up turn ` +
          "pending \u2014 session still counted as busy (grace " +
          `${formatDuration(followupGraceMs)})`,
      );
      onBgFollowupPending?.(true);
    }
    if (!turnOpen) armFollowupGrace();
  };
  let finishTask = (taskId) => {
    endedTaskIds.delete(taskId);
    subagentTasks.delete(taskId);
    if (turnHadTasks && countLiveTasks() === 0 && !awaitingUser && !turnOpen) markFollowupPending();
  };
  let handleTaskEnded = (taskId) => {
    if (subagentTasks.has(taskId)) {
      finishTask(taskId);
      return;
    }
    if (endedTaskIds.delete(taskId)) {
      turnHadTasks = true;
      notifiedTaskIds.add(taskId);
    }
    if (countLiveTasks() > 0) return;
    if (awaitingUser) return;
    if (!(turnHadTasks || !turnOpen)) return;
    turnHadTasks = true;
    notifiedTaskIds.add(taskId);
    markFollowupPending();
  };
  let maybeEndTurn = () => {
    if (turnOpen || liveTasks.size > 0 || wakeupPending() || followupPending) return;
    if (turnEndTimer !== undefined) {
      clearTimeout(turnEndTimer);
      turnEndTimer = undefined;
    }
    reportActivity?.("turn-end");
  };
  let endTurnDeferred = () => {
    for (let key of liveTasks.keys()) endedTaskIds.add(key);
    reportActivity?.("turn-end-deferred", ledgerSnapshot());
    if (followupPending) armFollowupGrace();
    if (turnEndTimer !== undefined) clearTimeout(turnEndTimer);
    if (wakeupAt !== null)
      turnEndTimer = setTimeout(
        () => {
          turnEndTimer = undefined;
          wakeupAt = null;
          maybeEndTurn();
        },
        Math.max(0, wakeupAt - Date.now()),
      );
  };
  let turnSignalSource;
  let everStartedTurn = false;
  let onTurnStarted = (source) => {
    if (
      sawInit ||
      (source === "stderr" && turnSignalSource !== undefined) ||
      env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT
    )
      return;
    if (turnSignalSource === undefined)
      onStatus(
        `[runner:session] ${sessionId} a turn started (signal on ${source === "tee" ? "the activity channel" : "stderr"})${startupTimeoutMs > 0 ? ": until the child has initialized, --startup-timeout-min now counts from its last line on the activity channel" : ""}`,
      );
    if (source === "tee" && turnSignalSource === "stderr")
      onDebug(
        `[runner:session] ${sessionId} a turn started: signal also read on the activity channel, after stderr (both channels work; no action needed)`,
      );
    turnSignalSource = source;
    startupSilenceWatchdog.arm();
    if (source === "stderr") {
      reportActivity?.("init-observed");
      return;
    }
    let wasIdle = !turnOpen;
    turnOpen = true;
    everStartedTurn = true;
    lifetimeWatchdog.noteTurnStart();
    reportActivity?.("activity");
    if (wasIdle) {
      wakeupAt = null;
      if (turnEndTimer !== undefined) {
        clearTimeout(turnEndTimer);
        turnEndTimer = undefined;
      }
      clearFollowup("follow-up turn opened");
    }
  };
  let onChildLine = (line) => {
    let message;
    try {
      message = jsonParse(line);
    } catch {
      return;
    }
    if (!message || typeof message !== "object") return;
    let record = message;
    if (typeof record.type === "string") startupSilenceWatchdog.heard();
    if (record.type === "control_response") {
      let requestId = record.response?.request_id;
      if (typeof requestId === "string" && requestId.startsWith("shr-token-")) onTokenAck?.(requestId);
    }
    if (record.type === "assistant") onDebug("[runner:session] Activity: assistant message");
    else if (record.type === "result") {
      onDebug(`[runner:session] Result: subtype=${record.subtype}`);
      if (record.is_error === true && typeof record.api_error_status === "number")
        onResultApiError?.(record.api_error_status);
    }
    if (record.type === "system" && record.subtype === "task_started") {
      if (typeof record.task_id === "string" && record.task_type !== "in_process_teammate") {
        liveTasks.set(record.task_id, typeof record.task_type === "string" ? record.task_type : "unknown");
        if (record.owned_by_subagent === true) subagentTasks.add(record.task_id);
        else subagentTasks.delete(record.task_id);
        onBgTaskLedger?.(countLiveTasks());
      }
      return;
    }
    if (record.type === "system" && record.subtype === "task_updated") {
      let patch = record.patch;
      let status = patch?.status;
      if (
        typeof record.task_id === "string" &&
        patch?.is_backgrounded === true &&
        liveTasks.has(record.task_id)
      )
        endedTaskIds.add(record.task_id);
      if (
        typeof record.task_id === "string" &&
        (status === "completed" || status === "failed" || status === "killed") &&
        liveTasks.delete(record.task_id)
      ) {
        handleTaskEnded(record.task_id);
        onBgTaskLedger?.(countLiveTasks());
        maybeEndTurn();
      }
      return;
    }
    if (record.type === "system" && record.subtype === "task_notification") {
      if (typeof record.task_id === "string" && liveTasks.delete(record.task_id)) {
        if (record.status === "stopped") finishTask(record.task_id);
        else handleTaskEnded(record.task_id);
        onBgTaskLedger?.(countLiveTasks());
        maybeEndTurn();
      }
      return;
    }
    if (record.type === "system" && record.subtype === "background_tasks_changed") {
      let tasks = record.tasks;
      if (Array.isArray(tasks))
        for (let task of tasks) {
          let taskId = task?.task_id;
          if (typeof taskId === "string") endedTaskIds.add(taskId);
        }
      return;
    }
    if (
      record.type === "system" &&
      record.subtype === "hook_response" &&
      record.hook_event === "SessionStart" &&
      record.outcome === "error"
    ) {
      onSessionStartHookError?.();
      return;
    }
    if (record.type === "system" && record.subtype === "init") {
      if (!sawInit) {
        sawInit = true;
        startupSilenceWatchdog.end();
        onChildInit?.();
        if (child.kind === "tool-server") logFeatureOk("self_hosted_tools_host");
      }
      reportActivity?.(child.kind === "tool-server" ? "init-observed" : "activity");
      return;
    }
    if (record.type === "system" && record.subtype === "turn_began_before_init") {
      onTurnStarted("tee");
      return;
    }
    if (record.type === "system" && record.subtype === "turn_starting") {
      if (!sawInit) return;
      turnIsFollowup = true;
      reportActivity?.("activity");
      if (
        record.mode === undefined ||
        (record.mode === "task-notification" && !("task_id" in record)) ||
        (record.mode === "task-notification" &&
          typeof record.task_id === "string" &&
          notifiedTaskIds.has(record.task_id))
      )
        clearFollowup("follow-up turn starting");
      else {
        clearFollowup("non-follow-up turn starting", true);
        clearFollowupGrace();
      }
      return;
    }
    if (record.type === "system" && record.subtype === "session_state_changed") {
      sawSessionState = true;
      if (settleOpen) scheduleSettleClose(SESSION_STATE_IDLE_SETTLE_MS);
      if (typeof record.waiting_on_user === "boolean") {
        sawWaitingOnUser = true;
        awaitingUser = record.waiting_on_user;
      }
      if (record.state === "idle") {
        if (!sawResult || (everStartedTurn && !sawInit)) {
          lifetimeWatchdog.noteTurnEnd();
          turnOpen = false;
          everStartedTurn = false;
          if (sawResult && turnHadTasks && countLiveTasks() === 0 && !awaitingUser) markFollowupPending();
          if (sawResult && (liveTasks.size > 0 || wakeupPending() || followupPending)) endTurnDeferred();
          else reportActivity?.("turn-end");
        }
        return;
      }
      if (!sawInit) {
        if (
          typeof record.waiting_on_user === "boolean"
            ? record.waiting_on_user
            : record.state === "requires_action"
        )
          sawRequiresAction = true;
        else if (!sawRequiresAction) return;
      }
      if (typeof record.waiting_on_user === "boolean") {
        reportActivity?.(record.waiting_on_user ? "awaiting-action" : "activity");
        clearFollowup(record.waiting_on_user ? "child parked at a prompt" : "child running", true);
      } else if (record.state === "requires_action") {
        reportActivity?.("awaiting-action");
        clearFollowup("child parked at a prompt", true);
      } else if (record.state === "running") {
        reportActivity?.("activity");
        clearFollowup("child running", true);
      }
      return;
    }
    if (record.type === "assistant") {
      let content = record.message?.content;
      if (Array.isArray(content)) {
        for (let contentBlock of content)
          if (
            contentBlock &&
            typeof contentBlock === "object" &&
            contentBlock.type === "tool_use" &&
            contentBlock.name === SCHEDULE_WAKEUP_TOOL_NAME
          ) {
            let input = contentBlock.input;
            let delaySeconds = Number(input?.delaySeconds);
            if (Number.isFinite(delaySeconds)) {
              let min = Math.min(3600, Math.max(60, delaySeconds));
              wakeupAt = Date.now() + min * 1000 + wakeupSlackMs;
            }
          }
      }
    }
    if (record.type === "result") {
      noteTurnSettled();
      lifetimeWatchdog.noteTurnEnd();
      turnOpen = false;
      everStartedTurn = false;
      sawResult = true;
      if (turnHadTasks && countLiveTasks() === 0 && !awaitingUser) markFollowupPending();
      if (liveTasks.size === 0 && !wakeupPending() && !followupPending) reportActivity?.("turn-end");
      else if (awaitingUser && !env.CLAUDE_RUNNER_DISABLE_AWAITING_ACTION_OVERRIDE) {
        reportActivity?.("awaiting-action", ledgerSnapshot());
        clearFollowup("child parked at a prompt", true);
      } else endTurnDeferred();
    } else if (record.type === "user" || record.type === "assistant") {
      if (record.from_subagent === true) return;
      if (turnSignalSource === undefined && !sawInit && !sawSessionState && !sawResult) {
        reportActivity?.("startup", {
          ...ledgerSnapshot(),
          childAlive: true,
        });
        return;
      }
      lifetimeWatchdog.noteTurnStart();
      if (!turnOpen && record.type === "user") wakeupAt = null;
      let wasIdle = !turnOpen;
      turnOpen = true;
      if (turnEndTimer !== undefined) {
        clearTimeout(turnEndTimer);
        turnEndTimer = undefined;
      }
      if (!sawWaitingOnUser) reportActivity?.("activity");
      if (wasIdle) {
        clearFollowup("follow-up turn opened", turnIsFollowup);
        if (turnIsFollowup) clearFollowupGrace();
      }
    }
  };
  if (childProcess.stdout)
    createInterface({
      input: childProcess.stdout,
    }).on("line", onChildLine);
  if (activityPipe)
    createInterface({
      input: activityPipe,
    }).on("line", onChildLine);
  let maxStderrLines = 50;
  let maxStderrChars = 500;
  let stderrTail = [];
  let maxPaneProblems = 9;
  let paneProblemCount = 0;
  if (childProcess.stderr)
    createInterface({
      input: childProcess.stderr,
    }).on("line", (line) => {
      if (!sawInit && line.startsWith("SDKStartup: phase=system_init_emitted")) {
        sawInit = true;
        startupSilenceWatchdog.end();
        onChildInit?.();
        reportActivity?.("init-observed");
        onDebug(`[runner:session] ${sessionId} sawInit latched via stderr SDKStartup marker`);
      }
      if (/^SDKStartup: phase=turn_began_before_init(?: |$)/.test(line)) onTurnStarted("stderr");
      let safeLine = redactAndTruncate(line, maxStderrChars);
      if (safeLine.startsWith(OTEL_DIAG_ERROR_PREFIX)) onStatus(`[runner:session] stderr: ${safeLine}`);
      else if (
        diffFindsNestedRepository &&
        isChangesPaneProblemMessage(safeLine) &&
        paneProblemCount < maxPaneProblems
      ) {
        paneProblemCount++;
        onStatus(`[runner:session] ${sessionId} ${safeLine}`);
      } else onDebug(`[runner:session] stderr: ${safeLine}`);
      stderrTail.push(safeLine);
      if (stderrTail.length > maxStderrLines) stderrTail.shift();
    });
  let lifecycleReported = false;
  return new Promise((resolve) => {
    childProcess.on("close", (exitCode, exitSignal) => {
      signal.removeEventListener("abort", onAbort);
      lifetimeWatchdog.stop();
      startupSilenceWatchdog.end();
      if (turnEndTimer !== undefined) {
        clearTimeout(turnEndTimer);
        turnEndTimer = undefined;
      }
      if (liveTasks.size > 0) {
        liveTasks.clear();
        subagentTasks.clear();
        onBgTaskLedger?.(0);
      }
      clearFollowup("child exited", false, true);
      closeSettle(true);
      let stderrTail_2 = stderrTail.join(`
`);
      if (lifetimeWatchdog.terminationRequested) {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${childProcess.pid} code=${exitCode} signal=${exitSignal} (interrupted \u2014 we asked)`,
        );
        lifetimeWatchdog.descendantsReaped.then(() =>
          resolve({
            result: "interrupted",
            exitCode,
            exitSignal,
            stderrTail: stderrTail_2,
          }),
        );
      } else if (exitSignal === "SIGTERM" || exitSignal === "SIGINT") {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${childProcess.pid} code=${exitCode} signal=${exitSignal} (interrupted)`,
        );
        resolve({
          result: "interrupted",
          exitCode,
          exitSignal,
          stderrTail: stderrTail_2,
        });
      } else if (exitCode === 0) {
        onStatus(`[runner:session] ${sessionId} child exited pid=${childProcess.pid} code=0 (completed)`);
        if (!lifecycleReported) {
          lifecycleReported = true;
          onChildLifecycle?.("completed");
        }
        resolve({
          result: "completed",
          exitCode: 0,
          exitSignal: null,
          stderrTail: stderrTail_2,
        });
      } else {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${childProcess.pid} code=${exitCode} signal=${exitSignal} (failed) \u2014 debug log at ${debugFile}`,
        );
        if (!lifecycleReported) {
          lifecycleReported = true;
          onChildLifecycle?.("failed");
        }
        resolve({
          result: "failed",
          exitCode,
          exitSignal,
          stderrTail: stderrTail_2,
        });
      }
    });
    childProcess.on("error", (error) => {
      signal.removeEventListener("abort", onAbort);
      lifetimeWatchdog.stop();
      startupSilenceWatchdog.end();
      if (!lifecycleReported) {
        lifecycleReported = true;
        onChildLifecycle?.("failed");
      }
      if (childProcess.pid === undefined) {
        resolve(spawnFailure(error));
        return;
      }
      onDebug(`[runner:session] ${sessionId} spawn error: ${error.message}`);
      resolve({
        result: "failed",
        exitCode: null,
        exitSignal: null,
        stderrTail: `spawn error: ${error.message}`,
      });
    });
  });
}
//@ chunk-hm0ce8vc.js:159381-159405 placement
/**
 * 会话钩子的默认超时：结束钩子 1 分钟、检出钩子 30 分钟。
 */
var POST_SESSION_HOOK_TIMEOUT_MS = 60000;
var CHECKOUT_HOOK_TIMEOUT_MS = 1800000;
//@ chunk-hm0ce8vc.js:159405-159615 placement
function getCheckoutHookTimeoutMs() {
  let envSelfHostedRunnerCheckoutHookTimeoutMs = process.env.SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS;
  if (
    envSelfHostedRunnerCheckoutHookTimeoutMs === undefined ||
    envSelfHostedRunnerCheckoutHookTimeoutMs === ""
  )
    return CHECKOUT_HOOK_TIMEOUT_MS;
  let timeoutMs = envPositiveMs("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS");
  return timeoutMs > 0 ||
    (envSelfHostedRunnerCheckoutHookTimeoutMs.trim() !== "" &&
      Number(envSelfHostedRunnerCheckoutHookTimeoutMs) === 0)
    ? timeoutMs
    : CHECKOUT_HOOK_TIMEOUT_MS;
}
//@ chunk-hm0ce8vc.js:159615-159693 placement
/**
 * 会话监控的各类等待与超时（后台结果宽限、回合结算、进程树快照、SIGKILL 宽限等）。
 */
var BG_RESULT_GRACE_MS = 30000;
var POST_TURN_SETTLE_MS = 7000;
var SESSION_STATE_IDLE_SETTLE_MS = 2000;
var SIGKILL_TIMEOUT_DEFAULT_MS = 5000;
var PROCESS_TREE_SNAPSHOT_TIMEOUT_MS = 3000;
var DESCENDANT_REAP_GRACE_MS = 1000;
var STOP_SIGKILL_WAIT_MS = 1500;
var SIGKILL_GRACE_BASE_MS = 15000;
var GIT_ARTIFACTS_REFRESH_TIMEOUT_MS = 1000;
//@ chunk-hm0ce8vc.js:159693-159760 placement
function graceSeconds(postSessionHookMs, pushReleaseMs, sigkillGraceMs = 0, drainWaitMs = 0, maxHoldMs = 0) {
  return Math.ceil(
    (postSessionHookMs + pushReleaseMs + sigkillGraceMs + drainWaitMs + maxHoldMs + SIGKILL_GRACE_BASE_MS) /
      1000,
  );
}
//@ chunk-hm0ce8vc.js:159760-159854 placement
function redactAndTruncate(text, maxChars) {
  let redacted = redactSecretsInText(text);
  return redacted.length > maxChars
    ? redacted.slice(0, maxChars) + ` \u2026[+${redacted.length - maxChars} chars]`
    : redacted;
}
//@ chunk-hm0ce8vc.js:159854-159868 placement
var MAX_LIFETIME_GRACE_MS = 900000;
//@ chunk-hm0ce8vc.js:159868-166298 placement
/**
 * 会话最长存活时间看门狗：可调用 max-lifetime 钩子决定 wait/kill。
 */
class SessionLifetimeWatchdog {
  maxLifetimeTimer;
  maxLifetimeGraceTimer;
  sigkillTimer;
  sigkillGraceTimer;
  stopped = false;
  turnInFlight = false;
  maxLifetimeDeferred = false;
  maxLifetimeDecidedByHook = false;
  terminating = false;
  treeSnapshot;
  reap = Promise.resolve();
  rootToken;
  startTokenStale;
  stuckExitCode;
  terminatedAt = 0;
  child;
  sessionId;
  maxLifetimeGraceMs;
  sigkillTimeoutMs;
  sigkillGraceMs;
  onDebug;
  onStatus;
  onMaxLifetime;
  onTerminating;
  static SIGKILL_TIMEOUT_DEFAULT_MS = SIGKILL_TIMEOUT_DEFAULT_MS;
  constructor(options) {
    this.child = options.child;
    this.sessionId = options.sessionId;
    this.maxLifetimeGraceMs = options.maxLifetimeGraceMs;
    this.sigkillTimeoutMs = options.sigkillTimeoutMs;
    this.sigkillGraceMs = options.sigkillGraceMs;
    this.onMaxLifetime = options.onMaxLifetime;
    this.startTokenStale = options.startTokenStale;
    this.stuckExitCode = options.stuckExitCode;
    this.onTerminating = options.onTerminating;
    this.onDebug = options.onDebug;
    this.onStatus = options.onStatus;
    if (this.child.pid !== undefined)
      getProcessStartTimeAsync(this.child.pid, {
        skipCache: true,
      }).then(
        (rootToken) => {
          this.rootToken = rootToken;
        },
        () => {},
      );
    if (options.maxLifetimeMs > 0) {
      let maxLifetimeMs = options.maxLifetimeMs;
      this.maxLifetimeTimer = setTimeout(
        (maxLifetimeMs) => {
          if (this.stopped || this.terminating) return;
          let decision;
          try {
            decision = this.onMaxLifetime?.();
          } catch (error) {
            this.onStatus(
              `[runner:session] ${this.sessionId} max-lifetime hook threw (${error instanceof Error ? error.message : String(error)}) \u2014 falling back to the watchdog's own decision`,
            );
          }
          this.maxLifetimeDecidedByHook = decision !== undefined;
          decision ??= this.turnInFlight ? "wait" : "kill";
          if (decision === "kill") {
            this.onDebug(
              `[runner:stuck] Session ${this.sessionId} exceeded max lifetime of ${maxLifetimeMs}ms \u2014 aborting child pid=${this.child.pid}`,
            );
            this.terminate();
            return;
          }
          this.maxLifetimeDeferred = true;
          this.onStatus(
            decision === "release"
              ? `[runner:session] ${this.sessionId} max session age reached (${maxLifetimeMs}ms) while not mid-turn \u2014 handing to the poll loop's release instead of terminating (hard stop in ${this.maxLifetimeGraceMs}ms if it is still alive)`
              : this.maxLifetimeDecidedByHook
                ? `[runner:session] ${this.sessionId} max session age reached (${maxLifetimeMs}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for the in-flight turn to park or finish (it is then released; terminated at the hard stop otherwise)`
                : `[runner:session] ${this.sessionId} max session age reached (${maxLifetimeMs}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for in-flight turn to finish before terminating`,
          );
          this.maxLifetimeGraceTimer = setTimeout(
            (maxLifetimeMs) => {
              if (this.stopped || this.terminating) return;
              if (this.maxLifetimeDecidedByHook)
                this.onStatus(
                  `[runner:session] ${this.sessionId} still mid-turn, or its release was not accepted, within ${this.maxLifetimeGraceMs}ms of the max session age (${maxLifetimeMs}ms) \u2014 terminating (hard stop) pid=${this.child.pid}`,
                );
              else
                this.onDebug(
                  `[runner:stuck] Session ${this.sessionId} still mid-turn ${this.maxLifetimeGraceMs}ms after max lifetime of ${maxLifetimeMs}ms \u2014 aborting child pid=${this.child.pid}`,
                );
              this.terminate();
            },
            this.maxLifetimeGraceMs,
            maxLifetimeMs,
          );
        },
        maxLifetimeMs,
        maxLifetimeMs,
      );
    }
  }
  noteTurnStart() {
    this.turnInFlight = true;
  }
  noteTurnEnd() {
    this.turnInFlight = false;
    if (this.maxLifetimeDeferred && !this.stopped && !this.terminating) {
      if (this.maxLifetimeDecidedByHook) return;
      this.onStatus(
        `[runner:session] ${this.sessionId} in-flight turn finished after max session age \u2014 aborting child pid=${this.child.pid}`,
      );
      this.terminate();
    }
  }
  signalGroup(signalName) {
    let pid = this.child.pid;
    if (pid === undefined) {
      this.child.kill(signalName);
      return;
    }
    if (pid <= 1) return;
    try {
      process.kill(-pid, signalName);
    } catch {
      this.child.kill(signalName);
    }
  }
  reapDescendants(graceMs) {
    let treeSnapshot = this.treeSnapshot;
    if (treeSnapshot === undefined) return;
    this.treeSnapshot = undefined;
    let pid = this.child.pid;
    let reapPromise = (async () => {
      let tree = await treeSnapshot;
      if (tree === undefined) {
        this.onStatus(
          `[runner:session] ${this.sessionId} could not list the child's process tree \u2014 signals reached its process group only; detached tool trees may survive`,
        );
        return;
      }
      if (tree.rootRecycled) {
        this.onStatus(
          `[runner:session] ${this.sessionId} child pid=${pid} now names another process \u2014 no process-tree reap; detached tool trees may survive`,
        );
        return;
      }
      let killResult;
      if (graceMs > 0) {
        let { live, incomplete } = await countLiveProcesses(tree);
        if (live > 0 || incomplete) {
          await sleep(graceMs);
          killResult = await killProcessTree(tree, "SIGKILL");
        }
      } else killResult = await killProcessTree(tree, "SIGKILL");
      if (killResult?.incomplete) {
        this.onStatus(
          `[runner:session] ${this.sessionId} process-tree identity check did not complete \u2014 ${tree.pinned.size - killResult.proven} of ${tree.pinned.size} descendant(s) unverified and not signalled; they may survive`,
        );
        return;
      }
      let pids = killResult?.pids ?? 0;
      let groups = killResult?.groups ?? 0;
      if (tree.degraded || tree.truncated || tree.unpinned > 0) {
        this.onStatus(
          `[runner:session] ${this.sessionId} process-tree listing incomplete (partial=${tree.degraded} truncated=${tree.truncated}) \u2014 SIGKILLed ${pids} of ${tree.pinned.size} identified descendant(s) and ${groups} group(s); ${tree.unpinned} descendant(s) could not be identified and were not signalled; they, and any unlisted tool trees, may survive`,
        );
        return;
      }
      this.onDebug(
        killResult === undefined
          ? `[runner:session] process tree pid=${pid}: ${tree.pinned.size} descendant(s) at SIGTERM (${tree.unpinned} unidentifiable), none outlived the child`
          : `[runner:session] process tree pid=${pid}: ${tree.pinned.size} descendant(s) at SIGTERM (${tree.unpinned} unidentifiable); ${pids} outlived the child and were SIGKILLed, with ${groups} tool-tree group(s)`,
      );
    })().catch(() => {});
    this.reap = withDeadline(reapPromise, graceMs + DESCENDANT_REAP_GRACE_MS).then(() => {});
  }
  get descendantsReaped() {
    return this.reap;
  }
  terminate() {
    if (this.terminating) return;
    if (this.stopped) return;
    this.terminating = true;
    this.terminatedAt = Date.now();
    try {
      this.onTerminating?.();
    } catch {}
    {
      let pid = this.child.pid;
      if (pid !== undefined)
        this.treeSnapshot = snapshotProcessTree(
          {
            pid,
            alive: this.child.exitCode === null && this.child.signalCode === null,
            token: this.startTokenStale?.() ? undefined : this.rootToken,
          },
          PROCESS_TREE_SNAPSHOT_TIMEOUT_MS,
        );
      this.onDebug(
        `[runner:session] Abort signal received, sending SIGTERM to process group pgid=${this.child.pid}`,
      );
      this.signalGroup("SIGTERM");
      this.sigkillTimer = setTimeout(
        (timeoutMs) => {
          if (!this.stopped) {
            this.onDebug(
              `[runner:session] Child still running after ${timeoutMs}ms, sending SIGKILL to process group pgid=${this.child.pid} and reaping its process tree`,
            );
            this.signalGroup("SIGKILL");
            this.reapDescendants(0);
            this.sigkillGraceTimer = setTimeout(() => {
              if (!this.stopped) {
                this.onDebug(
                  `[runner:stuck] Session ${this.sessionId} did not exit after SIGKILL within ${this.sigkillGraceMs}ms (likely D-state). Forcing process exit.`,
                );
                process.exit(this.stuckExitCode?.() ?? 1);
              }
            }, this.sigkillGraceMs);
          }
        },
        this.sigkillTimeoutMs,
        this.sigkillTimeoutMs,
      );
    }
  }
  stop() {
    this.stopped = true;
    this.reapDescendants(
      Math.max(1, Math.min(STOP_SIGKILL_WAIT_MS, this.terminatedAt + this.sigkillTimeoutMs - Date.now())),
    );
    if (this.sigkillTimer) clearTimeout(this.sigkillTimer);
    if (this.sigkillGraceTimer) clearTimeout(this.sigkillGraceTimer);
    if (this.maxLifetimeTimer) clearTimeout(this.maxLifetimeTimer);
    if (this.maxLifetimeGraceTimer) clearTimeout(this.maxLifetimeGraceTimer);
  }
  get terminationRequested() {
    return this.terminating;
  }
}
//@ chunk-hm0ce8vc.js:166298-166615 placement
/**
 * 带抖动的指数退避重试，可设最大次数、是否重试判断、重试回调与中止信号。
 */
async function retryWithBackoff(fn, options) {
  let initialDelayMs = options.initialDelayMs;
  let attempt = 0;
  for (;;) {
    if (options.signal?.aborted) return;
    attempt++;
    try {
      return await fn();
    } catch (error) {
      if (options.shouldRetry && !options.shouldRetry(error)) throw error;
      if (options.maxAttempts !== undefined && attempt >= options.maxAttempts) throw error;
      options.onRetry?.(attempt, error);
      let delayMs = initialDelayMs * (0.75 + Math.random() * 0.5);
      await sleep(delayMs, options.signal);
      initialDelayMs = Math.min(initialDelayMs * 2, options.maxDelayMs);
    }
  }
}
//@ chunk-hm0ce8vc.js:166615-166657 placement
/**
 * 每 host 的单调递增计数器（用于生成唯一的临时标签）。
 */
class TokenCounter {
  last = 0;
  next() {
    return ++this.last;
  }
}
//@ chunk-hm0ce8vc.js:166657-166682 placement
/**
 * 按 host 保存的计数器实例。
 */
var tokenCounters; // deferred: uses TokenCounter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hm0ce8vc.js:166657", () => {
  tokenCounters = new HostScoped(() => new TokenCounter());
});
//@ chunk-hm0ce8vc.js:166682-166719 placement
function nextTokenCounter() {
  return tokenCounters.of(getRootSession().host);
}
//@ chunk-hm0ce8vc.js:166719-167351 placement
/**
 * 把刷新的会话令牌写入子进程 stdin（未接好时记录未投递）。
 */
function deliverRefreshedToken(options) {
  let expiryNote = options.expiresInSeconds !== undefined ? ` (expires_in=${options.expiresInSeconds}s)` : "";
  if (!options.write) {
    options.onStatus(
      `[runner:session] ${options.label} refreshed for ${options.sessionId} but child stdin is not wired yet \u2014 token NOT delivered; next interval will retry${expiryNote}`,
    );
    return;
  }
  let requestId;
  if (options.pendingAcks) {
    requestId = `shr-token-${options.label}-${nextTokenCounter().next()}`;
    options.pendingAcks.set(requestId, {
      label: options.label,
      sentAtMs: options.nowMs ?? Date.now(),
    });
  }
  options.write(
    jsonStringify({
      type: "update_environment_variables",
      variables: {
        [options.envVar]: options.token,
      },
      ...(requestId && {
        request_id: requestId,
      }),
    }) +
      `
`,
  );
  options.onStatus(
    `[runner:session] ${options.label} refreshed for ${options.sessionId} \u2014 pushed to child via stdin${expiryNote}${requestId ? ` [${requestId}]` : ""}`,
  );
}
//@ chunk-hm0ce8vc.js:167351-167833 placement
function warnTokenUpdateNotAcked(options) {
  let nowMs = options.nowMs ?? Date.now();
  let graceMs = options.graceMs ?? 90000;
  for (let [requestId, pendingAck] of options.pendingAcks)
    if (nowMs - pendingAck.sentAtMs >= graceMs) {
      options.onStatus(
        `[runner:session] WARNING: ${pendingAck.label} update ${requestId} for ${options.sessionId} was never acked by the child \u2014 the stdin control channel may be severed (wrapper backgrounding without <&0?). Token rotation is NOT reaching the child; it will 401 at token TTL. See docs/self-hosted-runners-guide.md \xA7 "The child must keep the runner's stdin".`,
      );
      options.pendingAcks.delete(requestId);
    }
}
//@ chunk-hm0ce8vc.js:167833-169415 placement
function createDebouncedSender(options) {
  let errorRetryMs = options.errorRetryMs ?? 30000;
  let max = Math.max(errorRetryMs, options.errorRetryMaxMs ?? 0);
  let jitter = options.jitter ?? 0;
  let expiryMarginMs = options.expiryMarginMs ?? 60000;
  let expiredJitter = options.expiredRetryMs ?? {
    minMs: 30000,
    maxMs: 60000,
  };
  let minRefreshGapMs = options.minRefreshGapMs ?? 30000;
  let now = options.now ?? Date.now;
  let random = options.random ?? Math.random;
  let timer;
  let cancelled = false;
  let inFlight = false;
  let { intervalMs, ttlMs } = options;
  let expiresAt = ttlMs === undefined ? undefined : now() + ttlMs;
  let lastFiredAt;
  let errorCount = 0;
  let retryImmediately = false;
  let onAbort = () => cancel();
  options.signal.addEventListener("abort", onAbort, {
    once: true,
  });
  function cancel() {
    cancelled = true;
    if (timer) clearTimeout(timer);
    options.signal.removeEventListener("abort", onAbort);
  }
  function retryPlan(transient) {
    let isExpired = expiresAt !== undefined && now() >= expiresAt - expiryMarginMs;
    if (!transient)
      return {
        delayMs: intervalMs,
        expired: isExpired,
        transient,
      };
    let delayMs;
    if (isExpired) {
      let { minMs, maxMs } = expiredJitter;
      delayMs = Math.round(minMs + random() * Math.max(0, maxMs - minMs));
    } else {
      let min = Math.min(max, errorRetryMs * 2 ** errorCount);
      delayMs = Math.round(min * (1 - jitter + 2 * jitter * random()));
    }
    return {
      delayMs: Math.min(delayMs, intervalMs),
      expired: isExpired,
      transient,
    };
  }
  function fire() {
    if (cancelled || options.signal.aborted || inFlight) return;
    inFlight = true;
    let startedAt = now();
    lastFiredAt = startedAt;
    let plan;
    let nextInMs;
    Promise.resolve()
      .then(() => options.refresh())
      .then((result) => {
        errorCount = 0;
        let timing =
          typeof result === "number"
            ? {
                intervalMs: result,
              }
            : (result ?? {});
        if (timing.intervalMs !== undefined && timing.intervalMs > 0) intervalMs = timing.intervalMs;
        if (timing.ttlMs !== undefined && timing.ttlMs > 0) ttlMs = timing.ttlMs;
        if (ttlMs !== undefined) expiresAt = startedAt + ttlMs;
        if (timing.nextInMs !== undefined && timing.nextInMs > 0) nextInMs = timing.nextInMs;
      })
      .catch((error) => {
        if (cancelled || options.signal.aborted) return;
        plan = retryPlan(options.isTransient?.(error) ?? true);
        if (retryImmediately)
          plan = {
            ...plan,
            delayMs: 0,
          };
        errorCount++;
        options.onError(error, plan);
      })
      .finally(() => {
        inFlight = false;
        if (cancelled || options.signal.aborted) return;
        if (retryImmediately) {
          retryImmediately = false;
          fire();
          return;
        }
        timer = setTimeout(fire, plan?.delayMs ?? nextInMs ?? intervalMs);
      });
  }
  function refreshNow(
    { force } = {
      force: false,
    },
  ) {
    if (cancelled || options.signal.aborted) return "cancelled";
    if (inFlight) {
      retryImmediately ||= force;
      return "in_flight";
    }
    if (!force && lastFiredAt !== undefined && now() - lastFiredAt < minRefreshGapMs) return "debounced";
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    fire();
    return "fired";
  }
  timer = setTimeout(fire, intervalMs);
  return {
    cancel,
    refreshNow,
  };
}
//@ chunk-hm0ce8vc.js:169415-169529 placement
function tokenRefreshIntervalMs(expiresInSeconds) {
  if (!expiresInSeconds || expiresInSeconds <= 0) return 1440000;
  let floored = Math.floor(expiresInSeconds * 1000 * 0.8);
  return Math.max(30000, Math.min(1440000, floored));
}
//@ chunk-hm0ce8vc.js:169529-169573 placement
function ttlMsFromSeconds(expiresInSeconds) {
  return expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds * 1000 : 1800000;
}
//@ chunk-hm0ce8vc.js:169573-169726 placement
var SESSION_POLL_MS = 30000;
var TOKEN_REFRESH_TIMING = {
  errorRetryMs: 5000,
  errorRetryMaxMs: 60000,
  jitter: 0.2,
  expiryMarginMs: 60000,
  expiredRetryMs: {
    minMs: 30000,
    maxMs: 60000,
  },
  minRefreshGapMs: 30000,
};
//@ chunk-hm0ce8vc.js:169726-169886 placement
class RemoteConfigWithoutInferenceAuthError extends Error {
  constructor() {
    super("getSessionRemoteConfig returned no inference_auth.access_token");
    this.name = "RemoteConfigWithoutInferenceAuthError";
  }
}
//@ chunk-hm0ce8vc.js:169886-169967 placement
function isTransientRunnerError(error) {
  let httpStatus = getHttpStatus(error);
  return (
    !(error instanceof RemoteConfigWithoutInferenceAuthError) &&
    (isRetryableRunnerError(error) || httpStatus === 401 || httpStatus === 403)
  );
}
//@ chunk-hm0ce8vc.js:169967-170087 placement
function normalizeGovernedHost(host) {
  if (typeof host !== "string") return;
  let normalizedHost = normalizeHost(host);
  if (normalizedHost === "" || normalizedHost.length > 255 || !HOST_LABEL_RE.test(normalizedHost)) return;
  return isGithubDotCom(normalizedHost) ? GITHUB_HOST : normalizedHost;
}
export {
  normalizeGovernedHost,
  SIGKILL_TIMEOUT_DEFAULT_MS,
  POST_SESSION_HOOK_TIMEOUT_MS,
  CHECKOUT_HOOK_TIMEOUT_MS,
  BG_RESULT_GRACE_MS,
  POST_TURN_SETTLE_MS,
  SIGKILL_GRACE_BASE_MS,
  graceSeconds,
  retryWithBackoff,
  getCheckoutHookTimeoutMs,
  handleSelfHostedSession,
};
