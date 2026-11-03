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
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-hm0ce8vc.js:58886-59069 placement
/**
 * getRemoteSessionOrigin：environment_variables.CLAUDE_CODE_REMOTE_SESSION_ORIGIN。
 */
function getRemoteSessionOrigin(e) {
  let environmentVariables = e.environment_variables ?? {};
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
//@ chunk-hm0ce8vc.js:59069-59108 placement = review (0.384)
/**
 * isReviewOriginSession：旧版名 review 配错。
 */
function isReviewOriginSession(e) {
  return getRemoteSessionOrigin(e) === "review";
}
//@ chunk-hm0ce8vc.js:82431-140444 placement
/**
 * 处理一个会话工单：准备目录/配置/仓库、合成环境、启动子进程并在结束后发布结果与清理（约 58 KB）。
 */
async function handleSelfHostedSession(e, n, r) {
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
  } = n;
  let zn = undefined;
  let otherSessionsShareTheAccount = capacity > 1;
  let Xn = configureGitHookStubs !== undefined && !otherSessionsShareTheAccount;
  onDebug(`[runner:session] Handling session ${e}`);
  let Pt = false;
  let Wt = false;
  let $n = false;
  let lt;
  let prepTimer = createPrepTimer();
  let Mn;
  let ir = false;
  let Hn = false;
  let de = {
    current: undefined,
  };
  let Yt = {
    current: undefined,
    previous: undefined,
    held: [],
  };
  let qn = (Qe) => {
    Yt.held = [...Yt.held.filter((gt) => gt !== Qe && isSessionJwtFresh(gt)), ...(Qe ? [Qe] : [])].slice(-32);
  };
  let q;
  let Pe = "failed";
  let En = false;
  let ft = false;
  let he;
  let De;
  let Vt;
  let P;
  let Z;
  let re = [];
  let be = [];
  let sessionClaudeConfigDir = getSessionClaudeConfigDir(baseDir, e);
  let Re =
    configureGitSigningArtifacts === undefined
      ? lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms)
      : undefined;
  let Ue;
  let ht = join(baseDir, "_sessions", `${e}.gitconfig`);
  let wn;
  let trustBundlePath = join(baseDir, "_sessions", `${e}.git-ca-bundle.pem`);
  let Ct = join(baseDir, "_sessions", `${e}.git-ca-bundle.child.pem`);
  let St;
  let Or = join(baseDir, "_sessions", `${e}.gh`);
  let Ar = join(baseDir, "_sessions", `${e}.gitrules`);
  let Gr = join(baseDir, "_sessions", `${e}.uploads`);
  let pr = join(baseDir, "_sessions", `${e}.diff-copies`);
  let Bn = false;
  let un = join(sessionClaudeConfigDir, "claude-code-debug.txt");
  let We;
  let se;
  let ke;
  let jt;
  let cn = () => [ke, jt].filter((Qe) => Qe !== undefined);
  let Pn = [];
  let Jt = false;
  let In = false;
  let nn = false;
  let resolved = Promise.resolve();
  let R = false;
  let resolved_2 = Promise.resolve();
  let It = false;
  let Ie;
  let ye = [];
  let Xe = [];
  let qe = [];
  let Nt = [];
  let Je;
  let fn;
  let Wn = [];
  let Dn = (sources, mountBaseUrl, directUpstreams) => {
    try {
      return splitMountRouting(sources, Wn, mountBaseUrl, directUpstreams);
    } catch (error) {
      onDebug(
        `[runner:session] session git rules: the sources in a /remote reply for ${e} could not be used (${errorMessage(error)}); which repositories are fetched through the git mount is unchanged, and the next reply is read anew`,
      );
      return;
    }
  };
  let Zt;
  let hn;
  let abortController = new AbortController();
  let Dt = AbortSignal.any([r, abortController.signal]);
  let Cr = [];
  let pt;
  let Lt = false;
  let Ke = false;
  let envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR;
  let V = [];
  let ue = false;
  let U = gitConfigOwnershipLabel(spawnedSessionIds, e);
  let nt = new Map();
  let Tt = new Set();
  let xn = [];
  let Kn;
  let wr;
  let Jn;
  let es;
  let ts = false;
  let yo;
  let Hr;
  let vs = async () => {
    for (;;) {
      while (Jn !== undefined) {
        Hr ??= performance.now() + INGRESS_TOKEN_DEADLINE_MS;
        let gt = Hr - performance.now();
        if (gt <= 0) break;
        let Qt = es;
        await withDeadline(Qt ?? Promise.resolve(), gt);
        if (es === Qt) break;
      }
      let Qe = es;
      if (ts) await resolved;
      if (es === Qe) return;
    }
  };
  let Br = () => {
    wr?.();
    wr = undefined;
    Jn?.abort();
    Jn = undefined;
  };
  let resolved_3 = Promise.resolve();
  let pn;
  let ns = false;
  let rs = async () => {
    await resolved_3;
    ns = true;
    if (pn !== undefined) throw pn;
  };
  try {
    Mn = Date.now();
    onInitPhase?.({
      kind: "start",
    });
    if (!e || !/^[a-zA-Z0-9_-]+$/.test(e)) throw Error("Invalid session_id: contains unsafe characters");
    Bn = true;
    se = join(baseDir, "_sessions", e);
    let Qe = await retryWithBackoff(() => apiClient.issueSessionToken(getRunnerToken(), e, r), {
      initialDelayMs: 500,
      maxDelayMs: 8000,
      maxAttempts: 5,
      shouldRetry: isRetryableRunnerError,
      signal: r,
      onRetry: (ne, mt) => {
        onDebug(
          `[runner:session] issueSessionToken attempt ${ne} transient failure (${mt instanceof Error ? mt.message : mt}) \u2014 retrying`,
        );
      },
    });
    if (!Qe)
      return {
        result: "abandoned",
      };
    de.current = Qe.session_token;
    let toolsHost = Qe.tools_host;
    if (toolsHost !== undefined) {
      moveWatch?.holdOff(e);
      sessionClaudeConfigDir = getToolServerConfigDir(baseDir, e);
      un = join(sessionClaudeConfigDir, "claude-code-debug.txt");
    }
    let Qt =
      toolsHost === undefined
        ? (...ne) => apiClient.getSessionRemoteConfig(...ne)
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
    if (Xn) await restoreHookStubs(configureGitHookStubs, configureGitSigningArtifacts, onDebug);
    if (useAnthropicGitProxy) {
      if (Qe.tools_host === undefined) process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = Qe.session_token;
      if (gitProxyGlobalConfigSnapshot !== undefined && gitProxyGlobalConfigPath) {
        let ne = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
        await ignoreLocalSettingsInGit(
          {
            globalConfigPath: gitProxyGlobalConfigPath,
            globalConfigSnapshot: gitProxyGlobalConfigSnapshot,
            homeGitconfigPath: join(homedir(), ".gitconfig"),
            xdgConfigPath: join(ne, "git", "config"),
            credHelper: gitProxyCredHelper,
            signingArtifacts: configureGitSigningArtifacts,
          },
          onDebug,
          onStatus,
        );
      }
    }
    onSessionTokenIssued?.(Qe.session_token);
    if (r.aborted) {
      onDebug(`[runner:session] Aborted after issueSessionToken for ${e} \u2014 skipping registration`);
      return {
        result: "abandoned",
      };
    }
    onDebug(`[runner:session] Issued session_token for ${e}`);
    q = await retryWithBackoff(() => Qt(e, de.current, r), {
      initialDelayMs: 500,
      maxDelayMs: 8000,
      maxAttempts: 5,
      shouldRetry: isRetryableRunnerError,
      signal: r,
      onRetry: (ne, mt) => {
        onDebug(
          `[runner:session] getSessionRemoteConfig attempt ${ne} transient failure (${mt instanceof Error ? mt.message : mt}) \u2014 retrying`,
        );
      },
    });
    if (!q)
      return {
        result: "abandoned",
      };
    onDebug(
      `[runner:session] Fetched remote config: ${q.sources.length} source(s), ${q.push_targets.length} push target(s), api_base_url=${q.api_base_url}`,
    );
    if (r.aborted) {
      onDebug(`[runner:session] Aborted after getSessionRemoteConfig for ${e} \u2014 skipping registration`);
      return {
        result: "abandoned",
      };
    }
    let yt = isReviewOriginSession(q);
    let $r = false;
    let ar;
    if (yt)
      disableCoreDumps((ne) => {
        ar = ne;
      });
    if (yt && debugTokenDir !== undefined) {
      logFeatureBad("self_hosted_review_session", "debug_token_dir");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${e} is a code review, which this runner does not start while --debug-token-dir keeps tokens in files. Restart the runner without --debug-token-dir to take code reviews.`,
        "a code review is not started while --debug-token-dir keeps tokens in files",
      );
    }
    if (debugTokenDir && toolsHost === undefined)
      writeBestEffort(debugTokenDir, `session_token_${e}.jwt`, Qe.session_token, onStatus);
    if (yt && getPlatform() === "windows") {
      logFeatureBad("self_hosted_review_session", "windows");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${e} is a code review, which a runner on Windows does not start: it cannot hand the child its tokens on descriptors. Nothing on this runner needs changing.`,
        "a code review is not started by a runner on Windows",
      );
    }
    if (yt && capacity > 1) {
      logFeatureBad("self_hosted_review_session", "capacity");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${e} is a code review, which a runner started with --capacity ${capacity} does not take: the commands of its other sessions run as the same user, and could take the review's tokens while Claude Code starts. To take code reviews, run every runner of this environment with --capacity 1.`,
        "a code review is not started by a runner with --capacity above 1",
      );
    }
    let ss = yt && q.launcher_hooks !== undefined ? validateLauncherHooks(q.launcher_hooks) : undefined;
    if (ss !== undefined) {
      logFeatureBad("self_hosted_review_session", "launcher_hooks");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${e} is a code review and is not started: the service sent launcher hooks that this runner cannot accept (${ss}), and a code review needs them. That is a fault of the service, or an event newer than this runner's build.`,
        "a code review is not started without the hooks that the service sent for it",
      );
    }
    if (yt) {
      if (ar !== undefined) {
        logFeatureBad("self_hosted_review_session", "dumpable");
        onStatus(`[runner:session] ${e} the runner could not make itself non-dumpable: ${ar}`);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review, which this runner does not start: it could not make itself non-dumpable, so the review's commands could read the session's tokens from the runner's memory. To take code reviews, run the released claude binary, and allow prctl(PR_SET_DUMPABLE) in any sandbox or seccomp profile around the runner.`,
          "a code review is not started by a runner that cannot make itself non-dumpable",
        );
      }
      onStatus(
        `[runner:session] ${e} is a code review: its child gets no repository as --add-dir, no user, project or local settings (so nothing from this machine's Claude Code config), no session token file, and its session and inference tokens on file descriptors 4 and 5 instead of in its environment`,
      );
    }
    let Q = undefined;
    let N = Q === undefined ? undefined : await getProcessStartTimeAsync(process.pid);
    if (toolsHost !== undefined && (Q === undefined || N === undefined)) {
      logFeatureBad("self_hosted_tools_host", "cannot_host");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Session ${e} needs a tool server, which this runner cannot host`,
        "session needs a tool server, which this runner cannot host",
      );
    }
    let x = isLoopbackHttpUrl(
      q.governed_git,
      () => {
        let ne = de.current;
        if (!ne)
          throw Error(
            "governed git credential requested but no session token is available \u2014 token issue/refresh failed?",
          );
        return ne;
      },
      onStatus,
      undefined,
    );
    let childIsOwnBinary = execPath === process.execPath || execPath === updatedChildBin;
    let xt = agentProxyStandaloneRefusal({
      sessionId: e,
      serverEnv: q.environment_variables,
      runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
      governedGit: x?.toolConfig.gitConfig === true || x?.toolConfig.ghPathShim === true ? "on" : "off",
      egressListener: isEgressProxyActive() !== undefined,
      gitConfigArmed: x?.toolConfig.gitConfig === true,
    });
    if (xt) {
      onStatus(`[runner:error] ${xt.message}`);
      throw xt;
    }
    let Yn =
      otherSessionsShareTheAccount &&
      x?.toolConfig.gitConfig === true &&
      (configureGitHookStubs !== undefined || configureGitSigningArtifacts !== undefined);
    let Zn = Yn && operatorGitSnapshot?.hooksPath !== undefined;
    if (x) {
      let hostSplit = x.toolConfig.hostSplit;
      let mt = hostSplit
        ? `; per-host routing \u2014 governed hosts: ${hostSplit.governed.join(", ") || "(none)"} (git mount + session relay); direct hosts: ${hostSplit.direct.join(", ") || "(none)"} (this machine's own git rewrite and credentials)`
        : "";
      onStatus(
        `[runner:session] governed git ACTIVE for ${e}: pre-CLI clone via git mount, in-session git/gh via the session relay (git_config=${x.toolConfig.gitConfig}, gh_path_shim=${x.toolConfig.ghPathShim})` +
          mt +
          (otherSessionsShareTheAccount
            ? " \u2014 capacity>1: shared-canonical prep relies on per-invocation git hardening (no cross-session sanitize)"
            : ""),
      );
      if (hostSplit) {
        let rn = formatSourcesOnHostWarning(
          hostSplit,
          !!useAnthropicGitProxy,
          q.sources.map((source) =>
            source.type === "git_repository" && source.url ? getRemoteHostname(source.url) : undefined,
          ),
        );
        if (rn) onStatus(rn);
        let _t = formatAskpassWarning(hostSplit, Boolean(env.GIT_ASKPASS));
        if (_t) onStatus(_t);
      }
      if (useAnthropicGitProxy)
        onDebug(
          `[runner:session] ${e}: governed git delivered for this session (requested with --use-anthropic-git-proxy); the flag's older clone-URL proxy rewrite is skipped`,
        );
      if (pushOutcomeOnRelease)
        onStatus(
          "[runner:warn] --push-outcome-on-release under governed git pushes to the PLAIN upstream URL with customer-managed credentials (the runner's release-time push does not use the session's git-mount push URL, and the session relay ends with the child). If no ambient git credential covers the push target, the release-time push will fail naming this flag.",
        );
    }
    let yn = x ? undefined : useAnthropicGitProxy;
    if (useAnthropicGitProxy && !x && !q.governed_git && toolsHost === undefined)
      onStatus(
        `[runner:warn] ${e}: --use-anthropic-git-proxy is set but the server withheld ` +
          "Anthropic-managed git for this session (the reason is logged server-side \u2014 for example a " +
          "source host the server does not route through Anthropic-managed git, or a server that predates the opt-in); falling back to the legacy clone-URL git proxy for this session (deprecated; this fallback will be removed in a future runner release).",
      );
    try {
      let ne;
      if (Q !== undefined && N !== undefined) {
        onDebug(`[runner:session] ${e} hosts tools only, no worker`);
        ne = {
          kind: "tool-server",
          hosting: Q,
          runner: {
            pid: process.pid,
            proc_start: N,
          },
        };
      } else {
        We = await retryWithBackoff(() => apiClient.registerWorker(q.api_base_url, e, de.current, r), {
          initialDelayMs: 500,
          maxDelayMs: 8000,
          maxAttempts: 5,
          shouldRetry: isRetryableRunnerError,
          signal: r,
          onRetry: (X, j) => {
            onDebug(
              `[runner:session] registerWorker attempt ${X} transient failure (${j instanceof Error ? j.message : j}) \u2014 retrying`,
            );
          },
        });
        if (We === undefined)
          return {
            result: "interrupted",
          };
        onDebug(`[runner:session] Registered worker, epoch=${We}`);
        let M = We;
        await retryWithBackoff(
          () => apiClient.updateSessionWorkerState(q.api_base_url, e, de.current, M, undefined, r),
          {
            initialDelayMs: 500,
            maxDelayMs: 8000,
            maxAttempts: 5,
            shouldRetry: isRetryableRunnerError,
            signal: r,
            onRetry: (X, j) => {
              onDebug(
                `[runner:session] updateSessionWorkerState attempt ${X} transient failure (${j instanceof Error ? j.message : j}) \u2014 retrying`,
              );
            },
          },
        );
        if (r.aborted)
          return {
            result: "interrupted",
          };
        ne = {
          kind: "agent-loop",
          workerEpoch: We,
        };
      }
      let mt = sessionHostingKey(ne);
      let rn = [sessionClaudeConfigDir];
      let [_t] = await withBoundedTimeout(
        ensureSessionConfigDirs(dirname(sessionClaudeConfigDir), rn),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] session config dir check ${sessionClaudeConfigDir} (check NFS/CSI mount health)`,
      ).catch((error) => {
        if (isHostConfigSnapshotError(error)) {
          Jt = true;
          onStatus(`[runner:error] ${error.message}`);
        }
        throw error;
      });
      if (yt && (isGreaterThanOne(We) || _t !== "made" || spawnedSessionIds?.has(e) === true)) {
        Jt = true;
        logFeatureBad("self_hosted_review_session", "second_start");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review that a worker took before, here or on another runner, perhaps a worker that failed before it started Claude Code. A code review is started only by its first worker, in a config directory that the runner has just created. Nothing on this runner needs changing.`,
          "a code review is started only once",
        );
      }
      if (x) {
        let hostSplit = x.toolConfig.hostSplit;
        St = createGovernedGitState(
          process.env,
          getPlatform() === "windows",
          hostSplit
            ? {
                governedHosts: hostSplit.governed,
                directHosts: hostSplit.direct,
                mountBaseUrl: x.mountBaseUrl,
                pushBaseUrl: x.pushBaseUrl,
              }
            : undefined,
          trustBundlePath,
          otherSessionsShareTheAccount,
        );
        await withFsOpTimeout(buildGitTrustBundle(St, readTrustBundleSource), "build the trust bundle").catch(
          (error) => {
            onDebug(
              `[runner:session] governed git: the trust bundle could not be built (${errorMessage(error)}); the runner's own git keeps GIT_SSL_CAINFO`,
            );
          },
        );
        let serverGitSslVars = readServerGitSslVars(q.environment_variables, getPlatform() === "windows");
        let j = "";
        let childGitEnvironment = await resolveChildGitEnvironment(
          St,
          {
            ...serverGitSslVars,
            gitConfigArm: x.toolConfig.gitConfig,
            serverValueTrustBundlePath: Ct,
          },
          async () => {
            j = (await withFsOpTimeout(readGitVersion(), "git --version").catch(() => "")).trim();
            let gitVersion = parseGitVersion(j);
            let [rt, tn] = MIN_GIT_VERSION_FOR_TRUST;
            return (
              gitVersion !== null && (gitVersion[0] > rt || (gitVersion[0] === rt && gitVersion[1] >= tn))
            );
          },
          (ce, rt) =>
            withFsOpTimeout(
              readTrustBundleSource(ce, rt),
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
        wn = childGitEnvironment.answer;
        let Se = formatCertificatesLeftOutWarning([St.trustBundle, childGitEnvironment.trustBundle]);
        if (Se) onStatus(Se);
        for (let ce of formatGovernedGitDecisionWarnings({
          governedHosts: hostSplit?.governed ?? [],
          gitConfigArm: x.toolConfig.gitConfig,
          child: childGitEnvironment.answer.decision,
          childTrustBundle: childGitEnvironment.trustBundle,
          serverSetsCertificateFile: typeof serverGitSslVars.serverCertificateFile === "string",
          runnerMountGit: gitTrustDecisionForRole(St, "prep", {
            url: x.mountBaseUrl,
            mountRouted: true,
          }),
          rawGitVersion: j,
          clientCertificateVariablesSet: ["GIT_SSL_CERT", "GIT_SSL_KEY"].filter(
            (rt) => process.env[rt] !== undefined,
          ),
          hostsCoveredByNoProxy: governedNoProxyHosts(hostSplit, getNoProxy()),
        }))
          onStatus(ce);
      }
      ke =
        ne.kind === "agent-loop" && !yt ? getIngressTokenTempPrefix(sessionClaudeConfigDir, mt) : undefined;
      if (ne.kind === "tool-server") {
        for (let M of [getSessionClaudeConfigDir(baseDir, e), sessionClaudeConfigDir])
          await withBoundedTimeout(
            rm(M, {
              recursive: true,
              force: true,
            }),
            LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
            `[runner:stuck] rm ${M} (check NFS/CSI mount health)`,
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
      let bt = ke;
      let en = (M) => {
        R = true;
        let X = M.catch(() => {});
        resolved_2 = Promise.all([resolved_2, X]).then(() => {});
        X.then(() => {
          if (It || bt === undefined) return;
          let j = de.current;
          if (!j) return;
          for (let _e of cn())
            resolved = resolved.then(() =>
              writeSessionIngressTokenFile(_e, j, onStatus, en, tokenFileOpTimeoutMs),
            );
        });
      };
      Ie = en;
      if (bt !== undefined)
        resolved = writeSessionIngressTokenFile(bt, Qe.session_token, onStatus, en, tokenFileOpTimeoutMs);
      await resolved;
      onDebug(`[runner:session] Epoch fence passed for ${e} (epoch=${We})`);
      Kn = createDebouncedSender({
        intervalMs: 30000,
        refresh: async () => {
          if (We === undefined || !de.current) return;
          await apiClient.heartbeat(q.api_base_url, e, de.current, We, r);
          onDebug(`[runner:session] prep heartbeat sent for ${e}`);
          return;
        },
        onError: (M) => {
          onDebug(`[runner:session] prep heartbeat failed: ${M}`);
        },
        signal: r,
      });
      let Me = (M) => {
        de.current = M;
        if (useAnthropicGitProxy && !$r) process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = M;
        for (let X of cn())
          resolved = resolved.then(() =>
            writeSessionIngressTokenFile(X, M, onStatus, Ie, tokenFileOpTimeoutMs),
          );
      };
      let gr = [];
      let er = (M, X) => {
        if (We === undefined || !de.current) return Promise.resolve();
        let j = We;
        let _e = de.current;
        let Se = X.withDeferred ? gr.splice(0) : [];
        let ce = async () => {
          try {
            await apiClient.postWorkerEvents(q.api_base_url, e, _e, j, [...Se, M], r);
          } catch (error) {
            if (isEpochMismatchError(error)) throw error;
            let zt = Se.length > 0 ? ` (${Se.length} deferred step event(s) dropped with it)` : "";
            onDebug(`[runner:session] ${X.kind} event post failed${zt}: ${error}`);
          }
        };
        if (!Wt) return ce();
        let rt = () => (pn === undefined ? ce() : Promise.resolve());
        if (ns) return rt();
        if (!X.withDeferred) return resolved_3.then(rt);
        resolved_3 = resolved_3.then(() =>
          rt().catch((error) => {
            pn = error;
            Kn?.cancel();
          }),
        );
        return Promise.resolve();
      };
      let xi = (message) =>
        er(makeInitMilestoneMessage(message), {
          kind: "activity",
          withDeferred: true,
        });
      let Wr = (stepId, X, content, _e) =>
        er(logEnvManager(stepId, X, content, _e), {
          kind: "step",
          withDeferred: true,
        });
      let Fu = (...M) => {
        if (We === undefined || !de.current) return;
        gr.push(logEnvManager(...M));
      };
      let Fi;
      yo = () => {
        Fi = undefined;
      };
      let bo = () =>
        (Fi ??= (async () => {
          let armedAt = performance.now();
          let X = de.current;
          return {
            config: await Qt(e, X, r),
            armedAt,
            presentedToken: X,
          };
        })().catch((error) => {
          onDebug(
            `[runner:session] early /remote re-fetch failed: ${error} \u2014 step 6 re-fetches if the session continues`,
          );
          return;
        }));
      let _r = classifySourceRouting(
        q.sources,
        gitSshRewriteHosts,
        gitHostRewrites,
        onDebug,
        yn
          ? {
              apiBaseUrl: yn,
              sessionId: e,
            }
          : undefined,
        x,
        onStatus,
      );
      if (St && applyMountGitEnvironment(St, _r)) {
        let M = formatTrustBundleWarning(St);
        if (M) onStatus(M);
      }
      await Wr("provision", "completed", "Runner registered", {
        expected_steps: _r.length > 0 ? "provision,clone,start_cc" : "provision,start_cc",
      });
      let Gi = branchesByRepo(gitRepositorySources(q.push_targets));
      await withBoundedTimeout(
        mkdir(se, {
          recursive: true,
        }),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] mkdir ${se} (check NFS/CSI mount health)`,
      );
      await withBoundedTimeout(
        mkdir(sessionClaudeConfigDir, {
          recursive: true,
          mode: 448,
        }),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] mkdir ${sessionClaudeConfigDir}`,
      );
      let Oo = customOauthUrlSuffix(q.api_base_url);
      if (hostConfig?.notApplied)
        await er(formatHostConfigNotAppliedNotice(e, hostConfig.notApplied), {
          kind: "notice",
          withDeferred: true,
        });
      try {
        let M =
          ne.kind === "agent-loop"
            ? await seedHostConfigForSession(
                sessionClaudeConfigDir,
                hostConfig?.snapshot,
                onDebug,
                onStatus,
                Oo,
              )
            : undefined;
        if (M?.outcome === "partial" && hostConfig?.snapshot)
          await er(
            formatHostConfigPartiallyAppliedNotice(
              e,
              hostConfig.snapshot.sourceDir,
              redactSecretsInText(M.error),
            ),
            {
              kind: "notice",
              withDeferred: true,
            },
          );
      } catch (error) {
        if (isHostConfigSnapshotError(error))
          await Wr("host_config", "failed", redactSecretsInText(error.message), {
            step_label: "Apply runner host config",
          });
        throw error;
      }
      if (configureGitSigningArtifacts !== undefined) {
        Ue = await materializeSessionGitConfig({
          configDir: sessionClaudeConfigDir,
          baseDir,
          hookStubs: Yn && !Zn && configureGitHookStubs !== undefined ? configureGitHookStubs : [],
          signingArtifacts: configureGitSigningArtifacts,
          onDebug,
          onStatus,
        });
        Re = sessionGitConfig(Ue, operatorGitSnapshot, hookGitPrograms);
      }
      if (x?.toolConfig.gitConfig) {
        await writeFileAtomicDefaultMode(ht, (governedGitConfigSeed ?? "") + (wn?.fileSeedLines ?? ""));
        let M;
        if (Xn) M = configureGitGovernedEntries(baseDir);
        else if (Yn) {
          if (configureGitHookStubs === undefined || Ue === undefined)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: a governed session at capacity>1 needs both the hook stubs and the code-sign artifacts (hook stubs ${configureGitHookStubs === undefined ? "missing" : "present"}, session copy ${Ue === undefined ? "not written" : "written"}); the session was stopped rather than run with unsigned commits`,
              "--configure-git: incomplete startup artifacts for a governed session at capacity>1",
            );
          M = overlayEntriesWithoutHooks(Ue, Zn);
        }
        if (M !== undefined) {
          await rm(ht + ".lock", {
            force: true,
          }).catch(() => {});
          try {
            for (let [X, j] of M) await runGit(["config", "--file", ht, "--replace-all", X, j]);
          } catch (error) {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: could not write the commit-signing settings into this session's git config (${ht}): ${errorMessage(error)}. The session was stopped rather than run with unsigned commits. Check that ${join(baseDir, "_sessions")} is writable and holds no leftover ${e}.gitconfig.lock`,
              "--configure-git: could not write commit-signing settings into the governed per-session gitconfig",
            );
          }
        }
      }
      let gn = se;
      let tr = [];
      let Ge = [];
      let hook = await findHook(envSelfHostedRunnerHooksDir, "checkout");
      if (hook && pushOutcomeOnRelease)
        onStatus(
          `[runner:warn] --push-outcome-on-release does not push repos checked out via the checkout lifecycle hook (${hook}); use the post-session hook to snapshot those`,
        );
      let Gu;
      let Vh = x?.toolConfig.ghPathShim === true || x?.toolConfig.gitConfig === true;
      let Hu = q;
      let jh;
      let zh;
      let Xh = [];
      let Hi = pt ?? baseDir;
      let Jh = false;
      let Zh = false;
      let Bi = async () => {};
      if (_r.length > 0) {
        onDebug(
          `[runner:session] Preparing ${_r.length} git ${_r.length === 1 ? "repository" : "repositories"} (${otherSessionsShareTheAccount ? "worktree" : "canonical-direct"} mode)`,
        );
        let M = [];
        let X = [];
        let j = [];
        let _e;
        let Se;
        let ce = [];
        let rt = (b) => (hook ? "hook" : "builtin");
        let zt = false;
        let ds = (b) => (rt(b) !== "builtin" && hook ? "hook" : "git");
        let found = _r.find((b) => isPreparableRepoType(b.type) && ds(b) === "git");
        let git = DEFAULT_GIT_SLOTS;
        let resolved = Promise.resolve();
        let bs = (b) => {
          let le = resolved.then(b);
          resolved = le.catch(() => {});
          return le;
        };
        let Zi = (repo) =>
          bs(async () => {
            await xi(`Preparing ${repo}...`);
            await Wr("clone", "started", `Preparing ${repo}`, {
              step_detail: repo,
            });
          });
        let No = (b, repo, Ee) => {
          if (!zt) {
            Fu("clone", "completed", `Prepared ${repo}`, Ee);
            return Promise.resolve();
          }
          b.leave();
          return bs(() => Wr("clone", "completed", `Prepared ${repo}`, Ee));
        };
        let Os = se;
        let Et = async (b, le) => {
          if (!isPreparableRepoType(b.type)) return;
          let Ee = repoCheckoutDir(Hi, b);
          let ot = repoDirSlug(b);
          let wt = getUpstreamUrl(b) ?? b.url;
          if (!Ee || !ot)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Source '${b.url}' resolved to an unsafe repo path (slug='${b.repo}'). Check for path traversal in the URL.`,
              "source URL resolved to an unsafe repo path",
            );
          await Zi(b.repo);
          if (await le.take()) await bs(() => xi(`Preparing ${b.repo}...`));
          let qt = (Gi.get(lowercaseRepoName(b.repo))?.length ?? 0) > 0;
          let Le = join(Os, ot);
          let $t = rt(b);
          let Ot = $t === "builtin" ? null : hook;
          let nr = !Ot && !qt && b !== _r[0];
          let vr = async () => {
            if (!Ot) return;
            if (Ge.includes(Le)) {
              onDebug(`[runner:hook] not removing ${Le}: a prepared checkout (in use)`);
              return;
            }
            let found = Ge.find((Ft) => nfcLower(Ft) === nfcLower(Le));
            if (found !== undefined) {
              onDebug(
                `[runner:hook] not removing ${Le}: same name as prepared checkout ${found} modulo case`,
              );
              Xe.push(Le);
              return {
                cause: "kept_prepared_twin",
                warn: `[runner:warn] not removing ${Le} for skipped context source ${b.repo}: same name as the prepared checkout ${found} modulo case (one directory on a case-insensitive filesystem); whatever the hook wrote there may remain visible to this session. Removal is retried when the session ends.`,
              };
            }
            let vt = await withBoundedTimeout(
              rm(Le, {
                recursive: true,
                force: true,
              }).then(
                () => {
                  return;
                },
                (error) => error,
              ),
              LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
              `[runner:hook] rm -rf ${Le}`,
            );
            if (vt === undefined) return;
            Xe.push(Le);
            return {
              cause: "rm_failed",
              warn: `[runner:warn] could not remove the partial checkout the hook left for skipped context source ${b.repo} at ${Le} (${errorMessage(vt)}); the session may still be able to read it. Removal is retried when the session ends.`,
            };
          };
          try {
            if (Ot) {
              if (b.ref && !isSafeRefName(b.ref))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `[runner:session] refusing to pass unsafe ref to checkout hook: ${b.ref}`,
                  "refusing to pass unsafe ref to checkout hook",
                );
              if (!wt || !isGitRemoteUrl(wt))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  `[runner:session] refusing to pass unsafe repo URL to checkout hook: ${wt}`,
                  "refusing to pass unsafe repo URL to checkout hook",
                );
              let Ft = undefined;
              let startTime = performance.now();
              if (false) nt.set(Le, true);
              else
                await runCheckoutHook({
                  hookPath: Ot,
                  gitConfigPins: Re,
                  gitConfigLegacyParams: hookGitLegacyParams,
                  cwd: Os,
                  sessionId: e,
                  repoUrl: wt,
                  repoRef: b.ref,
                  checkoutPath: Le,
                  sessionAccessToken: de.current,
                  apiBaseUrl: Hu.api_base_url,
                  gitMountUrl: governedMountUrlOf(b),
                  gitEnvironment: St && gitEnvironmentForSourceHook(St, b),
                  clientPlatform,
                  onStatus,
                  onDebug,
                  onStderrLine: Ft?.read,
                  signal: r,
                  timeoutMs: n.checkoutHookTimeoutMs ?? CHECKOUT_HOOK_TIMEOUT_MS,
                });
              let rounded = Math.round(performance.now() - startTime);
              Xe.push(Le);
              await No(le, b.repo, {
                step_detail: b.repo,
                ...false,
              });
              return {
                prepared: Le,
                src: b,
              };
            }
            let we = otherSessionsShareTheAccount ? join(Os, ot) : Ee;
            let handOver;
            await serializeByKey(canonicalLocks, Ee, async () => {
              let Ft = nt.get(Ee);
              let qs = {
                canonical: Ee,
                repo: b.repo,
                sessionId: e,
                onStatus,
              };
              let Yu = undefined;
              let $o = false;
              if (
                nr &&
                $o &&
                (await lstat(join(Ee, ".git"))
                  .then((Rr) => (Rr.isDirectory() ? lstat(join(Ee, ".git", "index")) : Rr))
                  .then(
                    () => true,
                    (error) => getErrnoCode(error) !== "ENOENT",
                  ))
              )
                nr = false;
              let Mo = false;
              if (undefined?.sanitize || yn || (x && !otherSessionsShareTheAccount)) {
                if (undefined?.sanitize || (!$o && shouldSanitizeCanonical(onStatus, Ee, U))) {
                  await sanitizeCanonicalRepo(Ee, onDebug, wt);
                  Mo = true;
                }
              } else await runGitConfigLocal(Ee, onDebug, !otherSessionsShareTheAccount);
              await prepareRepositories({
                baseDir: Hi,
                sources: [
                  {
                    ...b,
                    ...(Mo && {
                      sanitized: {
                        onIndexFromHead: () => {
                          Tt.add(Ee);
                        },
                      },
                    }),
                    ...(nr && {
                      skippedIfThrottled: nr,
                    }),
                    ...false,
                  },
                ],
                alwaysFetch: true,
                skipReset: otherSessionsShareTheAccount,
                initWithoutTemplate: pt !== undefined,
                skipValidation:
                  antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM &&
                  !otherSessionsShareTheAccount &&
                  Gu === undefined,
                onDebug,
                onPhase: (Rr, Vn, Po) => {
                  if (We === undefined || !de.current) return;
                  let Vu = We;
                  let ju = de.current;
                  let zu = [logCloneStep(b.repo, Rr, Vn, Po)];
                  let Qi = () =>
                    pn !== undefined
                      ? Promise.resolve()
                      : apiClient.postWorkerEvents(q.api_base_url, e, ju, Vu, zu, r);
                  (Wt ? resolved_3.then(Qi) : Qi()).catch((error) =>
                    onDebug(`[runner:session] prep-phase event post failed: ${error}`),
                  );
                },
                onProgress: (cloneSub, Vn) => {
                  let Po = Vn.total !== undefined ? ` (${Vn.done}/${Vn.total})` : "";
                  er(
                    logEnvManager("clone", "started", `${b.repo} \u2014 ${Vn.label} ${Vn.pct}%${Po}`, {
                      step_detail: b.repo,
                      clone_sub: cloneSub,
                      progress_label: Vn.label,
                      progress_pct: String(Vn.pct),
                      ...(Vn.done !== undefined && {
                        progress_done: String(Vn.done),
                      }),
                      ...(Vn.total !== undefined && {
                        progress_total: String(Vn.total),
                      }),
                    }),
                    {
                      kind: "progress",
                      withDeferred: false,
                    },
                  ).catch(() => {});
                },
                signal: r,
              });
              if (otherSessionsShareTheAccount)
                await addSessionWorktree({
                  canonicalRepoPath: Ee,
                  worktreePath: we,
                  ref: b.ref,
                  onDebug,
                  signal: r,
                  gitEnvironment: b.gitEnvironment,
                });
            });
            if (otherSessionsShareTheAccount)
              ye.push({
                canonicalRepoPath: Ee,
                worktreePath: we,
              });
            await No(le, b.repo, {
              step_detail: b.repo,
            });
            return {
              prepared: we,
              src: b,
              handOver,
            };
          } catch (error) {
            if (
              error instanceof FetchRefNotFoundError ||
              (error instanceof CheckoutHookFailedError && isFetchRefNotFound(error.message))
            ) {
              if (!qt && $t !== "required") {
                let vt = b.ref ? `'${b.ref}'` : "the configured ref";
                onDebug(
                  `[runner:session] context source ${b.repo} ref ${vt} permanently not found on remote; ` +
                    "skipping (not a work repo \u2014 no push_targets entry)",
                );
                let Ft = await vr();
                if (Ft) onStatus(Ft.warn);
                return {
                  skipped: {
                    repo: b.repo,
                    sads: Ft ? [CHECKOUT_FAILURE_NOTES[Ft.cause].sad] : [],
                    step:
                      `Skipped ${b.repo} \u2014 source ref ${vt} no longer exists on remote; continuing without this context repo` +
                      (Ft ? CHECKOUT_FAILURE_NOTES[Ft.cause].note : ""),
                  },
                  error: new SourceRefNotFoundError(b.repo, b.ref),
                };
              }
              throw new SourceRefNotFoundError(b.repo, b.ref);
            }
            if (Ot && $t !== "required" && !qt && error instanceof CheckoutHookFailedError && !r.aborted) {
              onStatus(
                `[runner:warn] checkout hook failed for context source ${b.repo} (${error.telemetryMessage}); not a work repo (no push_targets entry), skipping it: ` +
                  redactSecretsInText(error.message),
              );
              let vt = await vr();
              if (vt) onStatus(vt.warn);
              return {
                error,
                skipped: {
                  repo: b.repo,
                  sads: [
                    "context_source_checkout_hook_failed",
                    ...(vt ? [CHECKOUT_FAILURE_NOTES[vt.cause].sad] : []),
                  ],
                  step:
                    `Skipped ${b.repo} \u2014 its checkout hook ${error.telemetryMessage}; continuing without this context repo` +
                    (vt ? CHECKOUT_FAILURE_NOTES[vt.cause].note : ""),
                },
              };
            }
            if (
              !Ot &&
              !qt &&
              error instanceof RepositoryAccessError &&
              error.denial !== undefined &&
              !r.aborted
            ) {
              let vt = b.getAuthToken ? (b.governedMount ? "git mount" : "git proxy") : undefined;
              let Ft = REPO_ACCESS_FAILURE_LABELS[error.denial];
              onStatus(
                `[runner:warn] could not access context source ${b.repo} (${Ft}; auth: ` +
                  (vt ? `session token via the ${vt}` : "this runner's own git credentials") +
                  "); not a work repo (no push_targets entry), skipping it: " +
                  redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
              );
              return {
                error,
                skipped: {
                  repo: b.repo,
                  sads: ["context_source_access_denied"],
                  step: vt
                    ? `Skipped ${b.repo} \u2014 this session couldn't read it ` +
                      `(${Ft}). Check that you've connected a GitHub account that can open it. If so, ask an admin to check that your organization gives Claude access to it.`
                    : `Skipped ${b.repo} \u2014 this runner couldn't read it ` +
                      `(${Ft}). Ask the team that manages your runners to check this runner's access.`,
                  skipKind: "context_source_access_denied",
                  skipReason: error.denial,
                },
              };
            }
            if (
              nr &&
              (error instanceof RepositoryAccessError || error instanceof FetchThrottledError) &&
              error.throttle !== undefined &&
              !r.aborted
            ) {
              onStatus(
                `[runner:warn] could not read context source ${b.repo} (told to try again later: ${FETCH_REFUSAL_REASONS[error.throttle]}); not a work repo (no push_targets entry), skipping it: ` +
                  redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
              );
              return {
                error,
                skipped: {
                  repo: b.repo,
                  sads: ["context_source_throttled"],
                  step:
                    `Skipped ${b.repo} \u2014 after several tries this runner was ` +
                    "still told to try again later; a rate limit is the usual cause. This session runs without it. It is tried again the next time this session starts.",
                  skipKind: "context_source_throttled",
                  skipReason: error.throttle,
                },
              };
            }
            throw classifySourcePrepFailure(error);
          }
        };
        let bn = (b) => {
          if (b === undefined) return;
          if ("skipped" in b) {
            ce.push(b.skipped);
            _e ??= b.error;
            if (b.skipped.skipKind === "context_source_throttled") Se ??= b.error;
            return;
          }
          Ge.push(b.prepared);
          M.push(b.src.repo);
          X.push(b.src);
          j.push(b.src.url ?? "");
          if (b.handOver) xn.push(b.handOver);
        };
        if (zt)
          (
            await runWithSlots(
              _r.map(ds),
              {
                git,
                hook: DEFAULT_HOOK_SLOTS,
              },
              (le, Ee) => Et(_r[le], Ee),
              isEpochMismatchError,
            )
          ).forEach(bn);
        else for (let b of _r) bn(await Et(b, NO_SLOTS_AVAILABLE));
        if (Ge.length === 0 && _e) throw classifySourcePrepFailure(Se ?? _e);
        for (let b of ce) {
          for (let sad of b.sads) logFeatureSad("self_hosted_session_handle", sad);
          await Wr("clone", "completed", b.step, {
            step_detail: b.repo,
            ...(b.skipKind && {
              skip_kind: b.skipKind,
            }),
            ...(b.skipReason && {
              skip_reason: b.skipReason,
            }),
          });
        }
        await Wr("clone", "completed", "Finished preparing sources");
        prepTimer.start();
        bo();
        if (yn) {
          let origin = new URL(yn).origin;
          for (let idx = 0; idx < Ge.length; idx++) {
            if (!X[idx]?.getAuthToken) continue;
            if (Xe.includes(Ge[idx])) continue;
            qe.push({
              path: Ge[idx],
              origin,
            });
            await setCredentialHelper(Ge[idx], yn, onDebug, r);
          }
        }
        prepTimer.mark("runner_prep_git_proxy_config_ms");
        if (x) {
          let b = new Set();
          let le = [];
          let Ee = [];
          let ot = [];
          let wt = [];
          let qt;
          for (let idx = 0; idx < Ge.length; idx++) {
            let $t = X[idx];
            let Ot = $t && getUpstreamUrl($t);
            if (!$t || !Ot) continue;
            if (Xe.includes(Ge[idx])) continue;
            let vr = ye.find((we) => we.worktreePath === Ge[idx])?.canonicalRepoPath ?? Ge[idx];
            if (b.has(vr)) continue;
            b.add(vr);
            wt.push(await getRemoteOriginUrls(vr, Ot, onDebug, r));
            if ($t.fetchViaMount && $t.url) {
              if (otherSessionsShareTheAccount) {
                le.push($t.repo);
                continue;
              }
              if (qt === undefined) {
                let trimmed = (
                  await withFsOpTimeout(readGitVersion(), "git --version").catch(() => "")
                ).trim();
                let gitVersion = parseGitVersion(trimmed);
                let [Ft, qs] = MIN_GIT_VERSION_FOR_MOUNT;
                qt = {
                  raw: trimmed,
                  ok:
                    gitVersion !== null &&
                    (gitVersion[0] > Ft || (gitVersion[0] === Ft && gitVersion[1] >= qs)),
                };
              }
              if (!qt.ok) {
                Ee.push($t.repo);
                continue;
              }
              ot.push($t.repo);
              Nt.push({
                path: vr,
                mountUrl: $t.url,
                mountBaseUrl: x.mountBaseUrl,
              });
              try {
                await setHostCredentialHelper(vr, $t.url, Ot, x.mountBaseUrl, onDebug, r);
              } catch (error) {
                logFeatureBad("self_hosted_governed_mount_read", "config_write_failed");
                throw error;
              }
            }
          }
          if (wt.includes("not_upstream")) logFeatureSad("self_hosted_governed_origin_check", "not_upstream");
          else if (wt.includes("read_failed"))
            logFeatureSad("self_hosted_governed_origin_check", "read_failed");
          else if (wt.length > 0) logFeatureOk("self_hosted_governed_origin_check");
          if (le.length > 0) {
            onStatus(
              `[runner:warn] governed git: ${le.join(", ")} ${plural(le.length, "is", "are")} outside the runner's list of directly reachable upstreams, but at --capacity ${capacity} sessions share one git config per repository, so ${plural(le.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Run with --capacity 1 to route such fetches through the mount.`,
            );
            logFeatureSad("self_hosted_governed_mount_read", "skipped_capacity_gt1");
          } else if (Ee.length > 0) {
            onStatus(
              `[runner:warn] governed git: ${Ee.join(", ")} ${plural(Ee.length, "is", "are")} outside the runner's list of directly reachable upstreams, but this machine's git (${qt?.raw || "version not readable"}) could not be confirmed as ${MIN_GIT_VERSION_FOR_MOUNT.join(".")} or newer, which the mount's path-scoped credential needs, so ${plural(Ee.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Upgrade git to route such fetches through the mount.`,
            );
            logFeatureSad("self_hosted_governed_mount_read", "skipped_git_too_old");
          } else if (ot.length > 0) {
            onStatus(
              `[runner:session] governed git: ${ot.join(", ")} ${plural(ot.length, "is", "are")} fetched through the git mount for ${e} (not directly reachable from this runner) \u2014 origin keeps its upstream URL; a repo-local insteadOf sends in-session fetches to the mount with the session token`,
            );
            logFeatureOk("self_hosted_governed_mount_read");
          }
        }
        if (x?.pushBaseUrl !== undefined) {
          let b = [];
          let le = new Set();
          let Ee = 0;
          for (let idx = 0; idx < Ge.length; idx++) {
            let wt = X[idx];
            if (!wt?.governedMount || !wt.upstreamUrl) continue;
            if (Xe.includes(Ge[idx])) continue;
            if (!wt.governedPushUrl) {
              Ee++;
              continue;
            }
            let Le = ye.find(($t) => $t.worktreePath === Ge[idx])?.canonicalRepoPath ?? Ge[idx];
            if (le.has(Le)) continue;
            le.add(Le);
            b.push({
              canonicalPath: Le,
              mountPath: wt.governedPushUrl.slice(x.pushBaseUrl.length + 1),
              upstreamUrl: wt.upstreamUrl,
            });
          }
          if (Ee > 0) logFeatureSad("self_hosted_governed_push_url", "host_not_github");
          if (b.length === 0);
          else if (otherSessionsShareTheAccount) {
            onStatus(
              `[runner:warn] governed git: the work item carries a git-mount push URL but this runner runs with --capacity ${capacity} (per-session worktrees share one canonical git config), so the push URL is NOT applied and session pushes keep going to the upstream remote. Run with --capacity 1 to route session pushes through the git mount.`,
            );
            logFeatureSad("self_hosted_governed_push_url", "skipped_capacity_gt1");
          } else {
            let ot = reconcileGovernedPushUrls({
              sessionId: e,
              pushBaseUrl: x.pushBaseUrl,
              wirings: b,
              getCurrentToken: () => de.current,
              onStatus,
              onDebug,
              signal: r,
            });
            Zt = ot;
            try {
              await ot.apply();
            } catch (error) {
              logFeatureBad("self_hosted_governed_push_url", "config_write_failed");
              throw error;
            }
            onStatus(
              `[runner:session] governed git: push URL ACTIVE for ${e} \u2014 session git pushes go through the ` +
                `git mount (${b.length} ${plural(b.length, "repository", "repositories")}, origin ${new URL(x.pushBaseUrl).origin})` +
                (Nt.length > 0 ? "" : "; fetches stay on the upstream remote"),
            );
            logFeatureOk("self_hosted_governed_push_url");
          }
        }
        await Bi();
        prepTimer.mark("runner_prep_reset_remote_ms");
        for (let idx = 0; idx < Ge.length; idx++) {
          let le = Gi.get(lowercaseRepoName(M[idx]));
          if (!le || le.length === 0) continue;
          let [Ee, ...ot] = le;
          let found = ye.find((Ot) => Ot.worktreePath === Ge[idx]);
          let qt = found?.canonicalRepoPath ?? Ge[idx];
          let Le = false;
          if (ot.length > 0 && !Le) {
            let Ot = X[idx];
            let nr = Ot?.getAuthToken && !Xe.includes(Ge[idx]);
            await fetchOutcomeBranches(
              Ge[idx],
              ot,
              onDebug,
              r,
              undefined,
              j[idx].startsWith("file://"),
              yn && nr ? Ot.url : undefined,
              Ot?.governedMount && nr
                ? {
                    url: Ot.url,
                    getToken: Ot.getAuthToken,
                  }
                : undefined,
              Ot?.governedMount && nr ? Ot.gitEnvironment : undefined,
            );
          }
          let $t;
          if (pushOutcomeOnRelease && mt > 1 && !Le && !Xe.includes(Ge[idx])) {
            if (
              await resumePushOnRelease(
                qt,
                Ee,
                X[idx],
                PUSH_ON_RELEASE_TIMEOUT_MS,
                onDebug,
                r,
                X[idx].gitEnvironment,
              )
            )
              $t = `refs/remotes/origin/${Ee}`;
          }
          if (!Le)
            await fetchSourceBranch(
              Ge[idx],
              Ee,
              onDebug,
              r,
              !!useAnthropicGitProxy || (Tt.has(qt) && "checkout"),
              $t,
              undefined,
              X[idx].gitEnvironment,
            );
          if (Xe.includes(Ge[idx])) continue;
          V.push({
            canonicalPath: qt,
            branch: Ee,
            needsDetach: !found,
            createdSha:
              pushOutcomeOnRelease && !Le ? await revParseVerify(qt, `refs/heads/${Ee}`) : undefined,
            source: X[idx],
          });
        }
        prepTimer.mark("runner_prep_outcome_branch_ms");
        Cr.push(...Ge);
      } else await Bi();
      prepTimer.start();
      bo();
      ({ childCwd: gn, addDirs: tr } = chooseChildCwd(se, Ge, q.cwd, yt));
      if (q.cwd) {
        let inside = resolveInside(se, q.cwd);
        if (!(
          inside !== null &&
          (await withBoundedTimeout(
            ensureDirsNoSymlinks(se, inside),
            INGRESS_TOKEN_FILE_TIMEOUT_MS,
            `[runner:stuck] mkdir ${inside} (check NFS/CSI mount health)`,
          ).catch(() => false)) &&
          (await withBoundedTimeout(
            isRealpathInside(se, inside),
            FS_OP_TIMEOUT_MS,
            `[runner:stuck] realpath ${inside} (check NFS/CSI mount health)`,
          ).catch(() => false))
        )) {
          onDebug(
            `[runner:session] config.cwd=${q.cwd} rejected (not under ${se}, a segment is a symlink, or fs op timed out)`,
          );
          ({ childCwd: gn, addDirs: tr } = chooseChildCwd(se, Ge, undefined, yt));
        }
      }
      let Qh = undefined;
      if (tr.length > 0) onDebug(`[runner:session] cwd=${gn} + ${tr.length} --add-dir`);
      checkSessionDirOutsideWriteScope(sessionClaudeConfigDir, "config dir", gn, tr);
      checkSessionDirOutsideWriteScope(Gr, "stage-file root", gn, tr);
      checkSessionDirOutsideWriteScope(pr, "diff copy root", gn, tr);
      checkSessionDirOutsideWriteScope(Or, "gh route dir", gn, tr);
      let snapshotDir =
        hostConfig?.snapshot?.storage.mode === "disk" ? hostConfig.snapshot.storage.snapshotDir : undefined;
      if (snapshotDir !== undefined)
        checkSessionDirOutsideWriteScope(snapshotDir, "host config snapshot dir", gn, tr);
      let Hs = [];
      let Bs = false;
      let Wi = false;
      let Ki = {};
      if (confineRepoSettings !== "off") {
        try {
          Hs = await checkRepoCommittedSettings(gn, Ge, Ki);
        } catch (error) {
          if (confineRepoSettings === "warn") {
            let _e = error instanceof Error ? error.message : String(error);
            let kind = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            onStatus(`[runner:confine] WARN (would refuse): ${_e}`);
            logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_warn", {
              confine_kind: fromEnum(kind),
            });
            Bs = true;
            Wi = true;
          } else {
            let kind = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_enforce", {
              confine_kind: fromEnum(kind),
            });
            throw error;
          }
        }
        let M = [...tr, ...Hs.map((j) => j.path)];
        let X = () => {
          checkSessionDirOutsideWriteScope(sessionClaudeConfigDir, "config dir", gn, M);
          checkSessionDirOutsideWriteScope(Gr, "stage-file root", gn, M);
          checkSessionDirOutsideWriteScope(pr, "diff copy root", gn, M);
          checkSessionDirOutsideWriteScope(Or, "gh route dir", gn, M);
          if (snapshotDir !== undefined)
            checkSessionDirOutsideWriteScope(snapshotDir, "host config snapshot dir", gn, M);
        };
        if (confineRepoSettings === "warn")
          try {
            X();
          } catch (error) {
            let _e = error instanceof Error ? error.message : String(error);
            onStatus(`[runner:confine] WARN (would refuse under enforce): ${_e}`);
            logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_warn");
            Bs = true;
          }
        else
          try {
            X();
          } catch (error) {
            logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_enforce");
            throw tagFailureStage(error, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED");
          }
      }
      if (Hs.length > 0) {
        let M = (Se) => Se;
        let X = new Set();
        let j = false;
        for (let Se of [gn, ...tr]) {
          X.add(M(Se));
          X.add(M(Se.normalize("NFC")));
          let ce = await withFsOpTimeout(
            realpath(Se).catch((error) => {
              j ||= !isPathAbsent(error);
              return;
            }),
            `realpath ${Se}`,
          );
          if (ce !== undefined) {
            X.add(M(ce));
            X.add(M(ce.normalize("NFC")));
          }
        }
        let _e = (Se) => {
          for (let ce of X) if (Se === ce || Se.startsWith(ce.endsWith(sep) ? ce : ce + sep)) return true;
          return false;
        };
        for (let Se of Hs)
          if (!_e(M(Se.path))) {
            let ce = new RepoSettingsRejectedError(
              Se,
              Se.kind === "permissions.allow (bare write-tool rule)"
                ? `grants unbounded file-tool writes (toolAlwaysAllowedRule matches a bare ${Se.raw} rule for ANY path). defaultMode:"acceptEdits" already auto-allows in-workspace edits; drop the bare rule, or use "Edit(/**)" / "Write(/**)" for an explicit workspace-scoped rule, or move it to the operator's user-level settings.json`
                : "resolves outside this session's own workspace",
            );
            if (confineRepoSettings === "warn") {
              onStatus(`[runner:confine] WARN (would refuse): ${ce.message}`);
              logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_warn");
              Bs = true;
              continue;
            }
            logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_enforce");
            throw j ? tagFailureStage(ce, "SETUP_FAILURE_KIND_FILESYSTEM_ERROR") : ce;
          }
      }
      if (confineRepoSettings !== "off" && !Bs) logFeatureOk("self_hosted_confine");
      checkSessionDirOutsideWriteScope(
        sessionClaudeConfigDir,
        "config dir",
        getClaudeTempDirRealpath().replace(/[/\\]$/, ""),
        [claudeTempDir(), getChildProcessTmpDirRealpath().replace(/[/\\]$/, "")],
      );
      prepTimer.mark("runner_prep_repo_settings_ms");
      if (trustWorkspace) {
        let M = {};
        for (let _e of new Set([gn, ...Ge, ...ye.map((Se) => Se.canonicalRepoPath)])) {
          let Se = normalize(_e);
          let ce = await withFsOpTimeout(
            realpath(_e).catch(() => {
              return;
            }),
            `realpath ${_e}`,
          );
          for (let rt of [Se, Se.normalize("NFC"), ...(ce !== undefined ? [ce, ce.normalize("NFC")] : [])])
            M[rt] = {
              hasTrustDialogAccepted: true,
            };
        }
        let X = await jsonStringify({
          ...(ne.kind === "agent-loop" &&
            hostConfig?.snapshot?.mcpServers && {
              mcpServers: hostConfig.snapshot.mcpServers,
            }),
          projects: M,
        });
        let j = join(sessionClaudeConfigDir, `.claude${Oo}.json`);
        await withBoundedTimeout(
          writeSessionFileAtomically(sessionClaudeConfigDir, `.claude${Oo}.json`, X, 384),
          INGRESS_TOKEN_FILE_TIMEOUT_MS,
          `[runner:stuck] write ${j} (check NFS/CSI mount health)`,
        ).catch((error) => {
          if (isHostConfigSnapshotError(error)) onStatus(`[runner:error] ${error.message}`);
          throw error;
        });
        onDebug(`[runner:session] Seeded persisted trust for ${Object.keys(M).length} path(s) in ${j}`);
      }
      let Yi = EMPTY_MCP_CONFIG_JSON;
      if (q.mcp_config?.content) {
        let str = Buffer.from(q.mcp_config.content, "base64").toString("utf-8");
        P = join(sessionClaudeConfigDir, "mcp-config.json");
        await withFsOpTimeout(unlink(P), `unlink ${P}`).catch(() => {});
        await withFsOpTimeout(
          writeFile(P, str, {
            flag: "wx",
            mode: 384,
          }),
          `writeFile ${P}`,
        );
        onDebug(`[runner:session] Wrote MCP config to ${P} (${str.length} bytes)`);
        Yi = str;
      }
      let Vi = join(sessionClaudeConfigDir, MCP_CONFIG_DELIVERED_JSON);
      be.push(Vi);
      let ji = {
        cancelled: false,
      };
      await withBoundedTimeout(
        writeSessionFileAtomically(sessionClaudeConfigDir, MCP_CONFIG_DELIVERED_JSON, Yi, 384, ji),
        INGRESS_TOKEN_FILE_TIMEOUT_MS,
        `[runner:stuck] write ${Vi} (check NFS/CSI mount health)`,
      ).catch((error) => {
        ji.cancelled = true;
        if (isHostConfigSnapshotError(error)) onStatus(`[runner:error] ${error.message}`);
        throw error;
      });
      prepTimer.mark("runner_prep_config_seed_ms");
      onDebug(
        isCcrAutoModeApplySet(q)
          ? `[runner:session] ${e}: the server asked this runner to apply the auto mode lists it sends (${CCR_AUTO_MODE_APPLY}=1 in /remote)`
          : `[runner:session] ${e}: the server did not ask this runner to apply the auto mode lists it sends (no ${CCR_AUTO_MODE_APPLY}=1 in /remote), so none is read; nothing on this runner needs changing`,
      );
      let os = applyAutoModePreset(autoModeConfigHandler(q), serverAutoModeLists);
      let zi = serverAutoModeLists === NO_ALLOW;
      let allowWithheldBySetting = os.withheld.includes("allow");
      if (os.withheld.length > 0) {
        let mapped = os.withheld.map((j) => `autoMode.${j}`);
        let X =
          mapped.length > 1
            ? `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)} lists`
            : `${mapped[0]} list`;
        if (zi)
          onDebug(
            `[runner:session] ${e}: not applying the server's ${X} for this session (--server-auto-mode-lists is ${serverAutoModeLists}, the default; set it to all to apply allow)`,
          );
        else
          onStatus(
            `[runner:session] ${e}: not applying the server's ${X} for this session, because this runner is set to --server-auto-mode-lists ${serverAutoModeLists}`,
          );
      }
      let serverAutoModeRules = readServerAutoModeRules(os.carried);
      for (let statusLine of serverAutoModeRules.statusLines) onStatus(`[runner:warn] ${e}: ${statusLine}`);
      let is = false;
      if (q.launcher_hooks !== undefined || serverAutoModeRules.autoMode !== undefined) {
        let M = await writeLauncherSettings(
          sessionClaudeConfigDir,
          {
            hooks: q.launcher_hooks === undefined ? [] : q.launcher_hooks,
            autoMode: serverAutoModeRules.autoMode,
          },
          re,
          onDebug,
          onStatus,
        );
        if (M) {
          Z = M.settingsPath;
          is = M.autoModeWritten;
        }
        if (
          yt &&
          q.launcher_hooks !== undefined &&
          !(Array.isArray(q.launcher_hooks) && q.launcher_hooks.length === 0) &&
          M?.hooksRegistered !== true
        ) {
          logFeatureBad("self_hosted_review_session", "launcher_hooks");
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Session ${e} is a code review and is not started: the launcher hooks that the service sent for it could not be set up, and a code review does not go on without them. The [runner:session] line before this one says why.`,
            "a code review is not started without the hooks that the service sent for it",
          );
        }
        if (M?.hooksRegistered)
          if (Ki.repoDisablesAllHooks && !yt) {
            onStatus(
              "[runner:session] launcher_hooks materialized, but a repo .claude/settings.json or settings.local.json carries disableAllHooks:true \u2014 the child will drop every flagSettings hook (CCR-supplied Stop reply-gate included)",
            );
            logFeatureSad(
              "self_hosted_launcher_hooks",
              "self_hosted_launcher_hooks_disabled_by_repo_disableAllHooks",
            );
          } else if (Wi)
            logFeatureSad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_confine_scan_aborted");
          else logFeatureOk("self_hosted_launcher_hooks");
      }
      let ks = {
        ...serverAutoModeRules.refusedCounts,
        allow_withheld_by_setting: allowWithheldBySetting,
      };
      if (!is && serverAutoModeRules.autoMode !== undefined)
        logFeatureBad("self_hosted_auto_mode_lists", "settings_too_large", ks);
      else if (serverAutoModeRules.grantsWithheld) {
        if (is) logFeatureSad("self_hosted_auto_mode_lists", "grants_withheld", ks);
        else logFeatureBad("self_hosted_auto_mode_lists", "grants_withheld", ks);
      } else if (serverAutoModeRules.statusLines.length > 0) {
        if (is) logFeatureSad("self_hosted_auto_mode_lists", "list_ignored", ks);
        else logFeatureBad("self_hosted_auto_mode_lists", "all_lists_ignored", ks);
      } else if (os.withheld.length > 0 && !zi)
        logFeatureSad("self_hosted_auto_mode_lists", "operator_withheld", {
          allow_withheld_by_setting: allowWithheldBySetting,
        });
      else if (os.withheld.length > 0 || is)
        logFeatureOk("self_hosted_auto_mode_lists", {
          allow_withheld_by_setting: allowWithheldBySetting,
          lists_written: is,
        });
      if (r.aborted) {
        onDebug(`[runner:session] Aborted after git prep for ${e} \u2014 bailing before spawn`);
        return {
          result: "abandoned",
        };
      }
      let Ts;
      let as = new Map();
      let Xi = new Map();
      let ys = false;
      let qi =
        jsonStringify({
          type: "control_request",
          request_id: `runner-session-gone-${e}`,
          request: {
            subtype: "end_session",
            reason: "session_not_found",
          },
        }) +
        `
`;
      let Ws = (error, X) => {
        if (!isNotFoundOrInactive(error)) return false;
        if (ys) return true;
        ys = true;
        onStatus(
          `[runner:session] ${e} ${X} says session gone server-side \u2014 sending end_session to child`,
        );
        Ts?.(qi);
        return true;
      };
      let Ks = async (M, X) => {
        let governedGit = M.governed_git;
        await Zt?.reconcile(governedGit, X);
        if (fn !== undefined && x?.directUpstreams !== undefined) {
          let _e = governedGit === undefined || governedGit.git_mount_push_base_url !== undefined;
          let Se = governedGit === undefined ? undefined : Dn(M.sources, x.mountBaseUrl, x.directUpstreams);
          await withFsOpTimeout(
            fn.reconcile({
              ...(_e && {
                push: {
                  baseUrl: isLoopbackUrl(governedGit?.git_mount_push_base_url, onDebug),
                },
              }),
              ...(Se !== undefined && {
                fetchLines: Se,
              }),
              presentedToken: X,
            }),
            "session git rules rewrite",
          ).catch((error) => {
            onDebug(`[runner:session] session git rules: ${errorMessage(error)} (ignored)`);
          });
        }
        if (governedGit !== undefined && governedGit.rest_mount_base_url === undefined) return;
        await Je?.reconcile(
          isLoopbackUrl(governedGit?.rest_mount_base_url, onDebug, BAD_REST_MOUNT_WARNING),
          X,
        );
      };
      let Bu = async (M, X) => {
        de.current = M;
        let j = X === undefined ? null : decodeSessionJwt(X);
        let _e = governedPushRepresentRetryMs * GOVERNED_REPRESENT_RETRY_STEPS;
        let deadlineMs =
          j === null
            ? _e
            : Math.max(0, Math.min(_e, j * 1000 - Date.now() - GOVERNED_REPRESENT_RETRY_SLACK_MS));
        let ce = await retryGitOperation({
          represent: () =>
            de.current === M ? Qt(e, M, Dt) : Promise.reject(Error("a newer session token is in use")),
          isTransient: (zt) => de.current === M && isRetryableRunnerError(zt),
          retryDelayMs: governedPushRepresentRetryMs,
          deadlineMs,
          signal: Dt,
          onDebug,
        });
        if (Dt.aborted) return;
        if (de.current !== M) return;
        if (ce.outcome === "presented") {
          hn?.cancel();
          hn = undefined;
          await Ks(ce.config, M);
          return;
        }
        if (ce.reason === "permanent" && Ws(ce.error, "/remote (token re-present)")) return;
        onStatus(
          `[runner:warn] governed git: could not re-present the refreshed session token on /remote for ${e} (${ce.reason === "budget" ? "still failing when the retry budget ran out" : "the request was refused"}); the child gets the token anyway. Session traffic through CCR's mounts (git pushes and fetches, gh writes) may be refused (git_token_mismatch) until a /remote call with this token succeeds` +
            (ce.reason === "budget" ? " \u2014 retrying in the background." : "."),
        );
        if (Zt !== undefined) logFeatureSad("self_hosted_governed_push_url", "represent_failed");
        if (Nt.length > 0) logFeatureSad("self_hosted_governed_mount_read", "represent_failed");
        if (Je !== undefined) logFeatureSad("self_hosted_governed_gh_route", "represent_failed");
        if (fn !== undefined) logFeatureSad("self_hosted_session_git_rules", "represent_failed");
        hn?.cancel();
        hn = undefined;
        if (ce.reason !== "budget") return;
        let rt = undefined;
        let tn = () => {
          rt?.cancel();
          if (hn === rt) hn = undefined;
        };
        rt = createDebouncedSender({
          intervalMs: governedPushRepresentRetryMs * 4,
          errorRetryMs: governedPushRepresentRetryMs * 4,
          signal: Dt,
          refresh: async () => {
            let zt = de.current;
            let ds = await Qt(e, zt, Dt);
            if (Dt.aborted) return;
            if (zt === de.current) {
              tn();
              onStatus(
                `[runner:session] governed git: refreshed session token re-presented on /remote for ${e}`,
              );
              await Ks(ds, zt);
            }
            return;
          },
          onError: (zt) => {
            if (Dt.aborted) return;
            if (Ws(zt, "/remote (token re-present)")) {
              tn();
              return;
            }
            if (!isRetryableRunnerError(zt)) {
              tn();
              onStatus(
                `[runner:warn] governed git: background re-present of the session token for ${e} refused: ${errorMessage(zt)}; giving up until the next scheduled /remote read`,
              );
              return;
            }
            onDebug(
              `[runner:session] governed git: background /remote re-present failed: ${errorMessage(zt)}; retrying`,
            );
          },
        });
        hn = rt;
      };
      let Wu = (M) => {
        Me(M);
        Yt.previous = Yt.current;
        Yt.current = M;
        qn(M);
        warnTokenUpdateNotAcked({
          pendingAcks: as,
          sessionId: e,
          onStatus,
        });
        deliverRefreshedToken({
          write: Ts,
          envVar: "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
          token: M,
          sessionId: e,
          label: "session_token",
          onStatus,
          pendingAcks: as,
        });
      };
      let jwtExpiry = getJwtExpiry({
        getAccessToken: async () => {
          let M = de.current;
          let X;
          try {
            ({ token: X } = await apiClient.refreshToken(M));
          } catch (error) {
            if (Ws(error, "refreshToken")) jwtExpiry.cancel(e);
            throw error;
          }
          if (de.current !== M) return;
          if (Zt !== undefined || Nt.length > 0 || Je !== undefined || fn !== undefined) {
            await Bu(X, M);
            if (de.current !== X) return;
          }
          return X;
        },
        onRefresh: (M, X) => Wu(X),
        label: "self-hosted-runner-session",
      });
      if (Q === undefined) jwtExpiry.schedule(e, de.current);
      let sn;
      let Ji;
      try {
        prepTimer.lap();
        let M = await bo();
        if (Wt && pn !== undefined) throw pn;
        let X = M === undefined ? undefined : Math.round(performance.now() - M.armedAt);
        let j;
        let _e;
        if (M !== undefined && X !== undefined && X <= POST_HOOK_TIMEOUT_MS) {
          j = M.config;
          _e = M.presentedToken;
        } else {
          if (X !== undefined)
            onDebug(
              `[runner:session] early /remote result is ${X}ms old (> ${POST_HOOK_TIMEOUT_MS}ms) \u2014 re-fetching for a fresh inference token`,
            );
          j = await retryWithBackoff(
            () => {
              _e = de.current;
              return Qt(e, _e, r);
            },
            {
              initialDelayMs: 1000,
              maxDelayMs: 30000,
              signal: r,
              ...(Wt && {
                shouldRetry: () => pn === undefined,
              }),
              onRetry: (Et, bn) => {
                onDebug(`[runner:session] /remote re-fetch attempt ${Et} failed: ${bn}. Retrying.`);
              },
            },
          );
        }
        if (j) {
          if (isReviewOriginSession(j) !== yt) {
            logFeatureBad("self_hosted_review_session", "marker_changed");
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Session ${e}: two /remote responses disagree on whether it is a code review (a server-side fault: nothing on this runner needs changing)`,
              "two /remote responses disagree on whether the session is a code review",
            );
          }
          q = j;
          let Et = agentProxyStandaloneRefusal({
            sessionId: e,
            serverEnv: q.environment_variables,
            runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
            runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
            governedGit: x?.toolConfig.gitConfig === true || x?.toolConfig.ghPathShim === true ? "on" : "off",
            egressListener: isEgressProxyActive() !== undefined,
            gitConfigArmed: x?.toolConfig.gitConfig === true,
          });
          if (Et) {
            onStatus(`[runner:error] ${Et.message}`);
            nn = true;
            throw Et;
          }
          onDebug(
            `[runner:session] Re-fetched /remote for fresh inference token (expires_in=${q.inference_auth?.expires_in_seconds}s)`,
          );
          await Ks(q, _e);
        } else
          onDebug(
            "[runner:session] /remote re-fetch failed after retries \u2014 using stale step-2 token. Interval refresher will converge.",
          );
        prepTimer.mark("runner_prep_remote_refetch_ms");
        let Se = [];
        let subagentPromptInline = Object.hasOwn(
          await writeSystemPromptFile({
            args: Se,
            claudeCodeArgs: q.claude_code_args,
            configDir: sessionClaudeConfigDir,
            stagedPaths: be,
            childIsOwnBinary,
            onDebug,
          }),
          APPEND_SUBAGENT_SYSTEM_PROMPT,
        );
        await writeSessionAgentsFile({
          args: Se,
          agentFiles: q.agent_files ?? [],
          serverAgentsArg: q.claude_code_args.agents,
          configDir: sessionClaudeConfigDir,
          stagedPaths: be,
          onDebug,
        });
        if (debugTokenDir && q.inference_auth?.access_token)
          writeBestEffort(debugTokenDir, `inference_token_${e}.txt`, q.inference_auth.access_token, onStatus);
        let rt = undefined;
        let debouncedSender = createDebouncedSender({
          intervalMs: tokenRefreshIntervalMs(q.inference_auth?.expires_in_seconds),
          ttlMs: ttlMsFromSeconds(q.inference_auth?.expires_in_seconds),
          ...TOKEN_REFRESH_TIMING,
          isTransient: isTransientRunnerError,
          refresh: async () => {
            if (Q !== undefined) return;
            let Et = de.current;
            let bn = rt?.onRemoteCallStarted();
            let b = await Qt(e, Et, r, {
              timeoutMs: SESSION_POLL_MS,
            });
            bn?.();
            await Ks(b, Et);
            let accessToken = b.inference_auth?.access_token;
            if (!accessToken) throw new RemoteConfigWithoutInferenceAuthError();
            warnTokenUpdateNotAcked({
              pendingAcks: as,
              sessionId: e,
              onStatus,
            });
            deliverRefreshedToken({
              write: Ts,
              envVar: "CLAUDE_CODE_OAUTH_TOKEN",
              token: accessToken,
              sessionId: e,
              label: "inference_token",
              onStatus,
              expiresInSeconds: b.inference_auth?.expires_in_seconds,
              pendingAcks: as,
            });
            let expiresInSeconds = b.inference_auth?.expires_in_seconds;
            return {
              intervalMs: tokenRefreshIntervalMs(expiresInSeconds),
              ttlMs: ttlMsFromSeconds(expiresInSeconds),
              nextInMs: rt?.takeFollowUpInMs(),
            };
          },
          onError: (Et, bn) => {
            if (Ws(Et, "/remote")) {
              debouncedSender.cancel();
              return;
            }
            let b =
              bn.delayMs >= 120000
                ? `${Math.round(bn.delayMs / 60000)}m`
                : `${Math.round(bn.delayMs / 1000)}s`;
            let le = bn.transient
              ? `Retrying shortly (in ${b})`
              : `Not retrying early (${Et instanceof RemoteConfigWithoutInferenceAuthError ? "CCR answered without an inference token" : `HTTP ${getHttpStatus(Et) ?? "none"}: the request or the session, not the network, is the problem`}); next scheduled attempt in ${b}`;
            let Ee = bn.expired
              ? " The child's current token has expired or is within a minute of expiring; its turns will fail until a refresh succeeds."
              : "";
            onStatus(`[runner:session] inference_token refresh failed for ${e}: ${Et}. ${le}.${Ee}`);
          },
          signal: r,
        });
        let zt;
        let ds = (
          Et,
          { force: bn } = {
            force: false,
          },
        ) => {
          let b = debouncedSender.refreshNow({
            force: bn,
          });
          if (b === "fired") {
            onStatus(
              `[runner:session] ${Et} for ${e} \u2014 requesting a fresh inference_token from CCR now`,
            );
            return b;
          }
          onDebug(
            `[runner:session] ${Et} for ${e} \u2014 ${b === "in_flight" ? "an inference_token refresh is already in progress" : b === "debounced" ? `an inference_token refresh started under ${TOKEN_REFRESH_TIMING.minRefreshGapMs / 1000}s ago; not starting another` : "the session is ending; not refreshing"}`,
          );
          return b;
        };
        let Ku = await withBoundedTimeout(
          lt ?? Promise.resolve(undefined),
          CHECKOUT_DISPLAY_LIMIT,
          "startup probe",
        ).catch(() => {
          return;
        });
        let js = false;
        let zs;
        let Xs;
        let bs;
        let Zi;
        let No = undefined;
        let Os;
        try {
          await vs();
          await Wr("start_cc", "started", "Starting Claude Code");
          if (Wt) await rs();
          await vs();
          r.throwIfAborted();
          Kn?.cancel();
          Br();
          Lt = true;
          let runnerStartupTiming = undefined;
          zs =
            ne.kind === "agent-loop" && ke !== undefined
              ? startGuestVitals({
                  sessionId: e,
                  apiBaseUrl: new URL(isLocalhostUrl(q.api_base_url, e).sdkUrl).origin,
                  tokenFilePath: ke,
                  binaryResolution: "pinned",
                  log: onDebug,
                })
              : undefined;
          Yt.current = de.current;
          qn(Yt.current);
          let bn;
          spawnedSessionIds?.add(e);
          if (yt) {
            $r = true;
            env.unset("CLAUDE_CODE_SESSION_ACCESS_TOKEN");
          }
          sn = await runSessionChild({
            execPath,
            execArgs,
            updatedChildBin,
            childUpdateBin: js || yt ? undefined : childUpdateBin,
            onChildUpdateReady: js || yt ? undefined : onChildUpdateReady,
            config: q,
            inPrivateCheckout: js,
            sessionId: e,
            sessionToken: de.current,
            child: ne,
            trustWorkspace: trustWorkspace === true,
            ghRoutePath: Je?.path,
            ghRouteBasePath: Je?.basePath,
            sessionGitRulesPath: fn && Ar,
            runnerStartupTiming,
            ...false,
            capacity,
            healthPort,
            clientPlatform,
            cwd: gn,
            configDir: sessionClaudeConfigDir,
            diffFindsNestedRepository,
            freshMachinePerSession: freshMachinePerSession && U !== "another",
            diffCopyRoot: pr,
            noRepositoryCheckedOut: Ge.length === 0,
            stageFileRoot: Gr,
            stagedFileArgs: Se,
            subagentPromptInline,
            governedGit: x,
            governedGitConfigPath: ht,
            childGitEnvironment: wn,
            debugFile: un,
            mcpConfigPath: P,
            launcherSettingsPath: Z,
            addDirs: tr,
            onDebug,
            onStatus,
            onSessionActivity,
            onBgTaskLedger,
            onBgFollowupPending,
            onPostTurnSettle,
            onChildLifecycle: onChildLifecycle
              ? (b) => {
                  if (b === "spawned") onChildLifecycle(b);
                  else Ji = b;
                }
              : undefined,
            onChildInit: () => {
              ir = true;
              onInitPhase?.({
                kind: "end",
                durationSec: (Date.now() - Mn) / 1000,
              });
            },
            onSessionStartHookError,
            onMaxLifetime,
            onChildTerminating,
            postSessionHookTimeoutMs: n.postSessionHookTimeoutMs ?? POST_SESSION_HOOK_TIMEOUT_MS,
            pushOutcomeOnRelease: pushOutcomeOnRelease ?? false,
            signal: r,
            onTokenAck: (b) => {
              Xi.get(b)?.(true);
              let le = as.get(b);
              if (le) {
                as.delete(b);
                onStatus(
                  `[runner:session] ${le.label} update ${b} acked by child (${Date.now() - le.sentAtMs}ms)`,
                );
              }
            },
            onResultApiError: (b) => {
              if (b === 401 || b === 403) ds(`child turn ended with HTTP ${b} from the model API`);
            },
            onProxyRefusal: undefined,
            onChildStdinReady: (b) => {
              Ts = b;
              if (ys) b(qi);
            },
          });
          rt?.onChildExited(sn.result);
        } finally {
          Xs?.();
          bs?.();
          Os?.();
          for (let Et of Xi.values()) Et(false);
          zt?.abort();
          zt = undefined;
          debouncedSender.cancel();
          Ts = undefined;
          zs?.then((Et) => Et?.stop());
        }
      } finally {
        jwtExpiry.cancelAll();
        abortController.abort();
      }
      Pe = sn.result;
      let Ys = rewriteContractionError(sn.stderrTail);
      let reason = typeof r.reason === "string" ? r.reason : undefined;
      if (sn.result === "failed") {
        he = sn.startError
          ? `child failed to start (${sn.startError.class}): ${Ys}`
          : `child exited ${sn.exitCode ?? "null"}: ${Ys}`;
        Vt =
          sn.startError?.class === "e2big"
            ? "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR"
            : "SESSION_FAILURE_KIND_RUNNER_CRASH";
        Hn = true;
      } else if (sn.result === "interrupted") he = `child interrupted (SIGTERM/watchdog): ${Ys}`;
      onDebug(`[runner:session] Session ${e} completed: ${Pe}`);
      ft = false;
      En = reason === "update";
      if ((En || ft) && We !== undefined) {
        let M = We;
        let apiBaseUrl = q.api_base_url;
        await retryWithBackoff(
          () =>
            apiClient.updateSessionWorkerState(apiBaseUrl, e, de.current, M, {
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
            `[runner:session] ${e} disconnect before the update restart failed: ${errorMessage(error)}`,
          );
          if (!isRetryableRunnerError(error)) ft = false;
        });
      }
      if ((Pe === "failed" || Pe === "interrupted") && We !== undefined && !En && !ft) {
        let M = await postSessionFailureResult({
          apiClient,
          apiBaseUrl: q.api_base_url,
          sessionId: e,
          sessionToken: de.current,
          workerEpoch: We,
          exitCode: sn.exitCode,
          exitSignal: sn.exitSignal,
          stderrTail: Ys,
          startError: sn.startError,
          refusedByHostPolicy: !ir && sn.stderrTail.includes(SIDELOAD_FLAGS_BLOCKED_PHRASE),
          onDebug,
          onStatus,
          signal: r,
        });
        if (M === "session_gone") ys = true;
        else if (M === "epoch_stale") {
          Ke = true;
          Vt = undefined;
        }
      }
      if (
        Pe === "failed" &&
        ys &&
        (sn.stderrTail.includes("SDKStartup: exiting without result") ||
          sn.stderrTail.includes("RemoteIO: transport closed permanently") ||
          sn.stderrTail.includes("worker epoch mismatch (409)"))
      ) {
        onStatus(
          `[runner:session] ${e} child exit ${sn.exitCode ?? "null"} after server end_session \u2014 session archived/deleted; clean close, not a runner failure`,
        );
        Pe = "completed";
        he = undefined;
        Vt = undefined;
        ft = false;
        Hn = false;
      }
      if (Pe === "failed") logFeatureBad("self_hosted_session_handle", "self_hosted_session_child_failed");
      else if (Pe === "completed") logFeatureOk("self_hosted_session_handle");
      if (Ji !== undefined && (Pe === "completed" || Pe === "failed")) onChildLifecycle?.(Pe);
      else if (Pe === "interrupted")
        onChildLifecycle?.(
          reason === "idle-release" || reason === "deassign" || reason === "update"
            ? "completed"
            : "interrupted",
        );
    } catch (error) {
      Kn?.cancel();
      if (r.aborted) {
        let reason = typeof r.reason === "string" ? r.reason : "unspecified";
        onDebug(`[runner:session] ${e} aborted during setup (reason=${String(reason)}) \u2014 not a failure`);
        Pe = "interrupted";
        return {
          result: "interrupted",
        };
      }
      let mt = Wt
        ? await rs().then(
            () => false,
            (error) => isEpochMismatchError(error),
          )
        : false;
      if (isEpochMismatchError(error) || mt) {
        let Me =
          mt && !isEpochMismatchError(error)
            ? ` Setup had meanwhile thrown: ${redactSecretsInText(error instanceof Error ? error.message : String(error))}`
            : "";
        onDebug(
          `[runner:session] epoch fence tripped \u2014 another runner has taken ${e} (we got epoch ${We} but server rejected). Aborting before spawn.${Me}`,
        );
        Ke = true;
        Pe = "abandoned";
        return {
          result: "abandoned",
        };
      }
      let rn = false;
      let _t = !rn && (error instanceof SourceRefNotFoundError || error instanceof FetchRefNotFoundError);
      let bt = redactSecretsInText(error instanceof Error ? error.message : String(error));
      let en = _t ? bt : rewriteContractionError(bt);
      he = `setup threw: ${en}`;
      {
        let httpStatus = getHttpStatus(error);
        if (httpStatus !== undefined && httpStatus >= 500)
          Vt = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
        else if (_t) Vt = "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR";
      }
      if (_t) De = "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
      else if (rn) De = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TERMINAL";
      else if (error instanceof CheckoutHookTimedOutError) De = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TIMEOUT";
      else if (!Lt) De = setupFailureKindOf(error);
      Hn = true;
      logFeatureBad("self_hosted_session_handle", "self_hosted_session_setup_failed");
      onDebug(`[runner:session] Session ${e} threw: ${en}`);
      if (We === undefined)
        onDebug(
          `[runner:session] Session ${e} setup failed at/before registerWorker \u2014 skipping best-effort UI failure post (no valid epoch)`,
        );
      else if (nn)
        onDebug(
          `[runner:session] Session ${e} is refused for the agent proxy mode and left to another runner \u2014 no failure result is posted`,
        );
      else if (
        (await postSessionFailureResult({
          apiClient,
          apiBaseUrl: q.api_base_url,
          sessionId: e,
          sessionToken: de.current,
          workerEpoch: We,
          exitCode: null,
          exitSignal: null,
          stderrTail: en,
          setupTerminal: rn,
          setupFailureKind: De,
          insteadOfRetryHint: _t
            ? "Retrying will fail the same way until you fix the missing branch described below."
            : REPO_NOT_FOUND_REASON(error),
          onDebug,
          onStatus,
          signal: r,
        })) === "epoch_stale"
      )
        Ke = true;
      Pe = "failed";
    }
  } catch (error) {
    if (r.aborted) {
      onDebug(`[runner:session] ${e} aborted during pre-spawn \u2014 not a failure`);
      return {
        result: "interrupted",
      };
    }
    let gt = rewriteContractionError(
      redactSecretsInText(error instanceof Error ? error.message : String(error)),
    );
    he = `pre-spawn threw: ${gt}`;
    {
      let httpStatus = getHttpStatus(error);
      if (httpStatus !== undefined && httpStatus >= 500)
        Vt = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
    }
    De ??= setupFailureKindOf(error);
    Hn = true;
    logFeatureBad("self_hosted_session_handle", "self_hosted_session_prespawn_failed");
    if (de.current && q)
      onDebug(
        `[runner:session] FATAL pre-spawn: ${e}: ${gt} \u2014 cannot post failure to UI: no worker epoch obtained`,
      );
    else if (de.current)
      onDebug(
        `[runner:session] FATAL pre-spawn: ${e}: ${gt} \u2014 cannot post failure to UI: config not yet fetched`,
      );
    else
      onDebug(
        `[runner:session] FATAL pre-spawn: ${e}: ${gt} \u2014 cannot post failure to UI: no session_token obtained`,
      );
    Pe = "failed";
  } finally {
    moveWatch?.release(e);
    Br();
    let timeoutMs = n.postSessionHookTimeoutMs ?? POST_SESSION_HOOK_TIMEOUT_MS;
    let gt = Date.now() + SETUP_STEP_DEADLINE_MS;
    for (let Q of Nt) {
      let N = gt - Date.now();
      if (N <= 0) {
        onStatus(
          `[runner:warn] governed git: mount-read cleanup budget exhausted; the repo-local mount rewrite stays in ${Q.path}, so the post-session hook's fetches of that repository still address the mount (best-effort; the next prep drops it)`,
        );
        continue;
      }
      await setUrlInsteadOf(Q.path, Q.mountUrl, Q.mountBaseUrl, onDebug, N);
    }
    let Qt = false;
    let yt = async () => {
      if (!St || Qt) return;
      Qt = true;
      await withFsOpTimeout(buildGitTrustBundle(St, readTrustBundleSource), "rebuild the trust bundle").catch(
        (error) => {
          onDebug(
            `[runner:session] governed git: the trust bundle could not be rebuilt (${errorMessage(error)}); the runner's own git keeps GIT_SSL_CAINFO`,
          );
        },
      );
    };
    if (
      pushOutcomeOnRelease &&
      Lt &&
      !(q !== undefined && isReviewOriginSession(q)) &&
      Pe !== "completed" &&
      r.reason !== "deassign" &&
      !Ke &&
      V.length > 0
    ) {
      onStatus(
        `[runner:session] ${e} ${Pe}: --push-outcome-on-release pushing ${V.length} outcome branch(es) to the source remote`,
      );
      let Q = Date.now() + PUSH_ON_RELEASE_TIMEOUT_MS;
      if (V.some((N) => needsMountFetchWithoutUpstream(N.source))) await yt();
      for (let N of V) {
        let x = Q - Date.now();
        if (x <= 0) {
          onDebug(`[runner:session] push-on-release budget exhausted; skipping '${N.branch}' (best-effort)`);
          continue;
        }
        if (N.createdSha) {
          if ((await revParseVerify(N.canonicalPath, `refs/heads/${N.branch}`, x)) === N.createdSha) {
            onDebug(
              `[runner:session] push-on-release '${N.branch}' has no commits since creation; skipping (best-effort)`,
            );
            continue;
          }
        }
        if (N.source.fetchViaMount) {
          onStatus(
            `[runner:warn] push-on-release: '${N.branch}' NOT pushed \u2014 ${N.source.repo} is reachable from this runner only through the session's git mount and the release push addresses the plain upstream; its commits exist only in this runner's checkout, so push from inside the session (those pushes use the mount) or preserve them in a post-session hook`,
          );
          continue;
        }
        let xe = Q - Date.now();
        if (xe <= 0) {
          onDebug(`[runner:session] push-on-release budget exhausted; skipping '${N.branch}' (best-effort)`);
          continue;
        }
        let xt = hasGovernedMountAndUpstream(N.source);
        await pushOnRelease(
          N.canonicalPath,
          N.branch,
          N.source,
          xe,
          onDebug,
          St && N.source.url
            ? gitEnvironmentForRole(St, "outcome", {
                url: xt ? N.source.upstreamUrl : N.source.url,
                mountRouted: N.source.governedMount === true && !xt,
              })
            : undefined,
        );
      }
    }
    let $r = En || ft;
    if (Lt) {
      let hook = await findHook(envSelfHostedRunnerHooksDir, "post-session");
      if (hook) {
        if (Ue !== undefined && configureGitSigningArtifacts !== undefined)
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
            Re = lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms);
            onStatus(
              `[runner:session] could not refresh session-scoped git artifacts before the post-session hook (${errorMessage(error)}); its git runs with commit signing OFF instead`,
            );
          });
        await runPostSessionHook({
          hookPath: hook,
          gitConfigPins: Re,
          gitConfigLegacyParams: hookGitLegacyParams,
          gitEnvironment: St && gitEnvironmentForSessionHook(St),
          cwd: se ?? baseDir,
          sessionId: e,
          exitReason: Pe,
          debugLogPath: un,
          workspacePaths: Cr,
          sessionAccessToken:
            We === undefined || (q !== undefined && isReviewOriginSession(q)) ? undefined : de.current,
          apiBaseUrl: q?.api_base_url,
          clientPlatform,
          timeoutMs,
          onStatus,
          onDebug,
        }).catch((error) => {
          onDebug(`[runner:hook:post-session] unexpected rejection (ignored): ${error}`);
        });
      }
    }
    if (Bn)
      await removeSessionState({
        sessionId: e,
        targets: [
          {
            path: pr,
            recursive: true,
          },
        ],
        onStatus,
        label: "removing the Changes pane's copies of git settings (they can hold a secret)",
      });
    let ar = false;
    if (!Jt && We !== undefined && de.current && q?.api_base_url)
      ar = await forwardLogFile({
        apiClient,
        apiBaseUrl: q.api_base_url,
        sessionId: e,
        sessionToken: de.current,
        workerEpoch: We,
        debugFile: un,
        onDebug,
      }).catch((error) => {
        onDebug(`[runner:session] debug log flush failed (best-effort): ${error}`);
        return false;
      });
    if (Jt);
    else if (Pe === "completed") await withFsOpTimeout(unlink(un), `unlink ${un}`).catch(() => {});
    else if (removeSessionState_2 && Bn) {
      let Q = await withFsOpTimeout(unlink(un), `unlink ${un}`).then(
        () => true,
        (error) => isENOENT(error),
      );
      if (Lt)
        onStatus(
          `[runner:session] ${e} ${Pe} \u2014 child debug log ${ar ? "tail forwarded to the session diagnostics on the server" : "NOT forwarded (no log, no worker registration, or the upload failed)"}; ${Q ? "not kept on disk" : "could not be unlinked, left to the directory removal below"} (--remove-session-state)`,
        );
    } else onStatus(`[runner:session] ${e} ${Pe} \u2014 child debug log preserved at ${un}`);
    if (P) await withFsOpTimeout(unlink(P), `unlink ${P}`).catch(() => {});
    for (let Q of [...(Z ? [Z] : []), ...re, ...be])
      await withFsOpTimeout(unlink(Q), `unlink ${Q}`).catch(() => {});
    if (ye.length > 0)
      await removeSessionWorktree({
        worktrees: ye,
        onDebug,
      }).catch((error) => {
        onDebug(`[runner:session] worktree cleanup failed: ${error}`);
      });
    let ss = ue || $r ? [] : V;
    if (ss.some((Q) => isOnGovernedMount(Q.source))) await yt();
    for (let Q of ss)
      await runGitQuiet(
        Q.canonicalPath,
        Q.branch,
        Q.needsDetach,
        onDebug,
        !!useAnthropicGitProxy || (Tt.has(Q.canonicalPath) && "checkout"),
        undefined,
        undefined,
        St && Q.source.governedMount && Q.source.url
          ? gitEnvironmentForRole(St, "outcome", {
              url: Q.source.url,
              mountRouted: true,
            })
          : undefined,
      );
    if (Bn)
      await withFsOpTimeout(
        Promise.all([removeFileIfExists(trustBundlePath), removeFileIfExists(Ct)]),
        "remove the trust bundle",
      ).catch((error) => {
        onDebug(
          `[runner:session] governed git: the trust bundle could not be removed (${errorMessage(error)})`,
        );
      });
    for (let Q of qe)
      for (let N of [["credential.helper", "^$"], [`credential.${Q.origin}.helper`]])
        await new Promise((resolve) => {
          let xe = spawn("git", ["-C", Q.path, "config", "--local", "--unset-all", ...N], {
            cwd: undefined,
            stdio: "ignore",
            windowsHide: true,
            ...cgroupSpawnOptions("helper"),
          });
          let timer = setTimeout((Zn) => Zn.kill("SIGKILL"), SIGKILL_DELAY_MS, xe);
          let Yn = () => {
            clearTimeout(timer);
            resolve();
          };
          xe.on("close", Yn);
          xe.on("error", Yn);
        });
    abortController.abort();
    hn?.cancel();
    await Zt?.cleanup();
    if (fn)
      await withBoundedTimeout(
        fn.remove(),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        "[runner:stuck] session git rules removal (check the session directory mount)",
      ).catch((error) => {
        onDebug(`[runner:session] session git rules: ${errorMessage(error)} (ignored)`);
      });
    if (Je)
      await withBoundedTimeout(
        Je.close(),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        "[runner:stuck] gh route teardown (check the session directory mount)",
      ).catch((error) => {
        onDebug(`[runner:session] gh route: ${errorMessage(error)} (ignored)`);
      });
    for (let Q of $r ? [] : Xe)
      await withBoundedTimeout(
        rm(Q, {
          recursive: true,
          force: true,
        }),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        `[runner:hook] rm -rf ${Q}`,
      ).catch((error) => {
        onDebug(`[runner:hook] cleanup ${Q} failed: ${error}`);
      });
    if (Ue !== undefined) {
      let Q = Ue;
      await withBoundedTimeout(
        isHooksDirSafe(sessionClaudeConfigDir, onStatus).then((N) =>
          N
            ? rm(Q, {
                recursive: true,
                force: true,
              })
            : undefined,
        ),
        LAUNCHER_HOOK_DEFAULT_TIMEOUT_MS,
        `[runner:session] rm -rf ${Q}`,
      ).catch((error) => {
        onDebug(`[runner:session] cleanup ${Q} failed: ${error}`);
      });
    }
    if (useAnthropicGitProxy) delete process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
    if (ke) {
      It = true;
      await resolved;
      let Q = cn();
      for (let N of Q)
        await cleanupSessionIngressTokenFiles(N, onStatus, Ie, tokenFileOpTimeoutMs).catch(() => {});
      await Promise.all(
        Pn.map((N) => cleanupSessionIngressTokenFiles(N, onStatus, Ie, tokenFileOpTimeoutMs).catch(() => {})),
      );
      if (R)
        resolved_2
          .then(async () => {
            for (let N of [...Q, ...Pn])
              await cleanupSessionIngressTokenFiles(N, onStatus, undefined, tokenFileOpTimeoutMs).catch(
                () => {},
              );
          })
          .catch(() => {});
    }
    if (removeSessionState_2 && Bn && se) {
      let mapped = [
        getSessionClaudeConfigDir(baseDir, e),
        getToolServerConfigDir(baseDir, e),
        Gr,
        se,
        ht,
        ht + ".lock",
        trustBundlePath,
        Ct,
      ].map((path) => ({
        path,
        recursive: true,
      }));
      let N = await removeSessionState({
        sessionId: e,
        targets: mapped,
        onStatus,
      });
      onDebug(
        `[runner:session] ${e}: --remove-session-state removed (or found absent) ${N.length}/${mapped.length} per-session paths${N.length > 0 ? `: ${N.join(", ")}` : ""}`,
      );
    }
    if (Mn !== undefined && !ir)
      onInitPhase?.({
        kind: "exit-before-init",
        failed: Hn,
      });
  }
  return {
    result: Pe,
    failureReason: he,
    setupFailureKind: De,
    failureKind: Vt,
    failedOnUpdateBuild: ft,
  };
}
//@ chunk-hm0ce8vc.js:140444-140512 placement
function sessionHostingKey(e) {
  return e.kind === "agent-loop" ? e.workerEpoch : e.hosting;
}
//@ chunk-hm0ce8vc.js:140512-159381 placement
/**
 * 启动并监管会话子进程：转发 stdin 控制、活动心跳、令牌刷新、输出转发与退出处理。
 */
function runSessionChild(e) {
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
  } = e;
  let An = {
    current: undefined,
  };
  let workerEpoch = child.kind === "agent-loop" ? child.workerEpoch : undefined;
  let kt =
    e.onSessionActivity === undefined
      ? undefined
      : (V, ue) => {
          if (V !== "activity" && An.current?.terminationRequested) {
            onDebug(`[runner:session] ${sessionId} ignoring '${V}' from a child that is being terminated`);
            return;
          }
          e.onSessionActivity?.(V, ue);
        };
  let Cn = env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT ? 0 : getStartupTimeoutMs();
  let { sdkUrl, resumeUrl } = isLocalhostUrl(config.api_base_url, sessionId);
  let Nn = isReviewOriginSession(config);
  let zn = [
    ...(diffFindsNestedRepository && capacity === 1
      ? [
          DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
          ...(noRepositoryCheckedOut ? [DECLARES_NO_REPOSITORY_CHECKED_OUT] : []),
        ]
      : []),
    ...[],
  ];
  let ze = [
    ...execArgs,
    ...(zn.length > 0 ? [runnerDeclarationArgument(zn)] : []),
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
  if (mcpConfigPath) ze.push("--mcp-config", mcpConfigPath);
  if (launcherSettingsPath) ze.push("--settings", launcherSettingsPath);
  for (let V of addDirs ?? []) ze.push("--add-dir", V);
  ze.push(...stagedFileArgs);
  let Xn = normalizeToolsArg(config.claude_code_args);
  if (hasDisallowedToolSpec(config.claude_code_args.tools)) {
    onDebug(
      "[runner:session] Stripped self-hosted-runner operator tool names from the server-supplied tools arg",
    );
    if (Xn.tools === "")
      onDebug(
        "[runner:warn] server-supplied tools arg contained ONLY self-hosted-runner operator tool names; dropping --tools and using the default pool",
      );
  }
  let Pt = appendServerArgs(
    ze,
    stripSystemPromptFileArgs(
      Nn ? wi(Xn, (V, ue) => CHILD_EXTRA_FORWARDED_FLAGS.has(ue)) : Xn,
      subagentPromptInline,
    ),
    CHILD_FORWARDED_FLAGS,
    (V, ue) => onDebug(`[runner:session] Skipping ${V} claude_code_arg: ${ue}`),
  );
  if (Pt > 0)
    onDebug(`[runner:session] Added ${Pt}/${Object.keys(config.claude_code_args).length} claude_code_args`);
  if (Nn) ze.push("--setting-sources=");
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
  let Kt =
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
  let ir = child.kind === "agent-loop" ? sessionToken : undefined;
  let Hn = env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL !== undefined;
  let de = runnerUsesAgentProxyStandalone(
    config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
    env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
  );
  let Yt = (workerEpoch ?? 0) > 1 && env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS !== false;
  let enforcedEnv = {
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: ir,
    ...(child.kind === "tool-server" && {
      CLAUDE_CODE_MCP_SERVE_SETTINGS: "{}",
    }),
    CLAUDE_SESSION_INGRESS_TOKEN_FILE:
      child.kind === "agent-loop" && !Nn
        ? getIngressTokenTempPrefix(configDir, sessionHostingKey(child))
        : undefined,
    CLAUDE_CODE_OAUTH_TOKEN: inferenceAuth?.access_token,
    ...(Nn && buildClearedAuthEnv()),
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
    ...Kt,
    CLAUDE_CODE_OTEL_DIAG_STDERR: "1",
    CLAUDE_CODE_TEE_SDK_STDOUT: "1",
    CLAUDE_RUNNER_ACTIVITY_FD: "3",
    CLAUDE_RUNNER_ALIVE_EVERY_MS: String(silenceStretchMs(Cn) || ""),
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
    CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: Nn ? undefined : "1",
    [CLAUDE_CODE_REMOTE_SESSION_ORIGIN]: getRemoteSessionOrigin(config),
    ...(Nn && {
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
    ...((Hn || child.kind === "agent-loop") && {
      CCR_AGENT_PROXY_RELAY_MODE: childRelayEnvValue(
        config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
        env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      ),
    }),
    ...(de && agentProxyStandaloneRunnerEnv(process.env)),
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
    CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS: Yt ? "1" : undefined,
    CLAUDE_CODE_RESUME_PROMPT: Yt
      ? SESSION_MOVED_TAIL_PROMPT
      : (workerEpoch ?? 0) > 1
        ? SESSION_MOVED_CONTINUE_PROMPT
        : undefined,
    CCR_SPAWN_TIMESTAMP_MS: String(Date.now()),
    CCR_RUNNER_STARTUP_TIMING: runnerStartupTiming,
    [CCR_SHR_START_MARKS]: undefined,
    ...false,
  };
  let q =
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
      : ze;
  let Pe = mergeSessionEnv({
    inheritedEnv: process.env,
    serverEnv: config.environment_variables,
    enforcedEnv,
    onDropped: (V, ue, U) => onDebug(`[runner:session] Skipping ${U} environment name ${V}: ${ue}`),
  });
  onDebug(
    `[runner:session] Spawning child: ${[execPath, ...execArgs].join(" ")} (${q.length - execArgs.length} args) ANTHROPIC_BASE_URL=${config.api_base_url} CLAUDE_CODE_WORKER_EPOCH=${workerEpoch} cwd=${cwd}`,
  );
  let En = (V) => {
    let ue = describeSpawnFailure(V, [execPath, ...q], Pe);
    onDebug(
      `[runner:session] ${sessionId} spawn error (${ue.class}): ${V instanceof Error ? V.message : String(V)}`,
    );
    return {
      result: "failed",
      exitCode: null,
      exitSignal: null,
      stderrTail: ue.description,
      startError: ue,
    };
  };
  let ft = {
    cwd,
    stdio: Nn ? [...CHILD_STDIO_MODES] : ["pipe", "pipe", "pipe", "pipe"],
    env: Pe,
    windowsHide: true,
    detached: true,
  };
  let he;
  try {
    he = spawn(execPath, q, ft);
  } catch (error) {
    return Promise.resolve(En(error));
  }
  let De;
  try {
    De = he.stdio[3];
    De?.on?.("error", (V) => {
      onDebug(`[runner:session] activity pipe error (${V.message}); falling back to stdout readline`);
      De = undefined;
    });
  } catch (error) {
    onDebug(
      `[runner:session] activity pipe unavailable (${error instanceof Error ? error.message : String(error)}); falling back to stdout readline`,
    );
    De = undefined;
  }
  onStatus(`[runner:session] ${sessionId} child spawned pid=${he.pid} cwd=${cwd}`);
  onChildLifecycle?.("spawned");
  if (Nn && he.pid !== undefined) {
    let accessToken = inferenceAuth?.access_token;
    if (
      accessToken !== undefined &&
      writeChildSessionTokens(
        he,
        {
          sessionToken,
          inferenceToken: accessToken,
        },
        (U) =>
          onDebug(`[runner:session] ${sessionId} writing a token to its descriptor failed (${U.message})`),
      )
    )
      logFeatureOk("self_hosted_review_session");
    else {
      logFeatureBad("self_hosted_review_session", "handoff_failed");
      onStatus(
        `[runner:session] ${sessionId} could not be handed its tokens on descriptors; ending its child. The session fails. Nothing on this runner needs changing.`,
      );
      try {
        if (he.pid === undefined || he.pid <= 1) throw Error("no process group to signal");
        process.kill(-he.pid, "SIGKILL");
      } catch {
        he.kill("SIGKILL");
      }
    }
  }
  kt?.("startup");
  let Vt = new SilenceWatchdog({
    limitMs: Cn,
    onSilent: () =>
      kt?.("startup", {
        ...Bn(),
        childSilent: true,
      }),
  });
  if (child.kind === "tool-server") {
    he.stdin?.on("error", (V) => {
      onDebug(
        `[runner:session] ${sessionId} tool server's standard input closed before its line was read (${V.message})`,
      );
    });
    he.stdin?.write(
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
    onChildStdinReady?.((V) => {
      if (he.stdin && !he.stdin.destroyed) {
        he.stdin.write(V);
        return true;
      }
      return false;
    });
  let P = new SessionLifetimeWatchdog({
    child: he,
    sessionId,
    startTokenStale: e.startTokenStale,
    stuckExitCode: e.stuckExitCode,
    maxLifetimeMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS"),
    maxLifetimeGraceMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS") || MAX_LIFETIME_GRACE_MS,
    sigkillGraceMs: Math.min(
      Math.max(
        envPositiveMs("SELF_HOSTED_RUNNER_SIGKILL_GRACE_MS") || 30000,
        e.postSessionHookTimeoutMs +
          (e.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0) +
          SIGKILL_GRACE_BASE_MS,
      ),
      2147483647,
    ),
    sigkillTimeoutMs:
      envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") ||
      SessionLifetimeWatchdog.SIGKILL_TIMEOUT_DEFAULT_MS,
    onMaxLifetime,
    onTerminating: () => {
      Vt.end();
      onChildTerminating?.();
    },
    onDebug,
    onStatus,
  });
  An.current = P;
  let Z = () => P.terminate();
  signal.addEventListener("abort", Z, {
    once: true,
  });
  if (signal.aborted) P.terminate();
  let re = new Map();
  let be = () => {
    let V = 0;
    for (let ue of re.values()) if (ue !== "monitor_mcp" && ue !== "monitor_ws") V++;
    return V;
  };
  let ee = null;
  let Re;
  let Ue = false;
  let ht = false;
  let wn = false;
  let et = false;
  let Ct = false;
  let St = false;
  let Or = false;
  let Ar = false;
  let Gr = 120000;
  let pr = () => ee !== null && Date.now() < ee;
  let Bn = () => ({
    liveTasks: re.size,
    liveTaskIds: Array.from(re, ([V, ue]) => `${V}:${ue}`),
    wakeupInMs: ee !== null ? Math.max(0, ee - Date.now()) : undefined,
    bgResultAwaitingFollowup: pe,
  });
  let un = envPositiveMs("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS") || BG_RESULT_GRACE_MS;
  let We = envPositiveMs("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS") || POST_TURN_SETTLE_MS;
  let se = false;
  let ke = 0;
  let jt;
  let cn = (V = false) => {
    if (jt !== undefined) {
      clearTimeout(jt);
      jt = undefined;
    }
    if (se) {
      se = false;
      onPostTurnSettle?.(false, V);
    }
  };
  let Pn = (V) => {
    let min = Math.min(Date.now() + V, ke);
    if (jt !== undefined) clearTimeout(jt);
    jt = setTimeout(cn, Math.max(0, min - Date.now()));
  };
  let Jt = () => {
    ke = Date.now() + We;
    if (!se) {
      se = true;
      onPostTurnSettle?.(true);
    }
    Pn(We);
  };
  let In = new Set();
  let nn = false;
  let tt = new Set();
  let R = new Set();
  let pe = false;
  let It;
  let Ie = () => {
    if (It !== undefined) {
      clearTimeout(It);
      It = undefined;
    }
  };
  let ye = (V, ue = false, U = false) => {
    if (!ue) {
      Ie();
      nn = false;
      tt.clear();
    }
    if (pe) {
      pe = false;
      onDebug(`[runner:session] ${sessionId} background-result follow-up cleared (${V})`);
      onBgFollowupPending?.(false, U || An.current?.terminationRequested === true);
    }
  };
  let Xe = () => {
    Ie();
    It = setTimeout(() => {
      It = undefined;
      onStatus(
        `[runner:session] ${sessionId} no follow-up turn within ${formatDuration(un)} of the background task finishing \u2014 ` +
          "releasing the follow-up hold",
      );
      ye("grace elapsed");
      fn();
    }, un);
  };
  let qe = () => {
    if (!pe) {
      pe = true;
      onStatus(
        `[runner:session] ${sessionId} background task finished; follow-up turn ` +
          "pending \u2014 session still counted as busy (grace " +
          `${formatDuration(un)})`,
      );
      onBgFollowupPending?.(true);
    }
    if (!Ue) Xe();
  };
  let Nt = (V) => {
    In.delete(V);
    R.delete(V);
    if (nn && be() === 0 && !et && !Ue) qe();
  };
  let Je = (taskId) => {
    if (R.has(taskId)) {
      Nt(taskId);
      return;
    }
    if (In.delete(taskId)) {
      nn = true;
      tt.add(taskId);
    }
    if (be() > 0) return;
    if (et) return;
    if (!(nn || !Ue)) return;
    nn = true;
    tt.add(taskId);
    qe();
  };
  let fn = () => {
    if (Ue || re.size > 0 || pr() || pe) return;
    if (Re !== undefined) {
      clearTimeout(Re);
      Re = undefined;
    }
    kt?.("turn-end");
  };
  let Wn = () => {
    for (let key of re.keys()) In.add(key);
    kt?.("turn-end-deferred", Bn());
    if (pe) Xe();
    if (Re !== undefined) clearTimeout(Re);
    if (ee !== null)
      Re = setTimeout(
        () => {
          Re = undefined;
          ee = null;
          fn();
        },
        Math.max(0, ee - Date.now()),
      );
  };
  let Dn;
  let Zt = false;
  let hn = (V) => {
    if (Ct || (V === "stderr" && Dn !== undefined) || env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT)
      return;
    if (Dn === undefined)
      onStatus(
        `[runner:session] ${sessionId} a turn started (signal on ${V === "tee" ? "the activity channel" : "stderr"})${Cn > 0 ? ": until the child has initialized, --startup-timeout-min now counts from its last line on the activity channel" : ""}`,
      );
    if (V === "tee" && Dn === "stderr")
      onDebug(
        `[runner:session] ${sessionId} a turn started: signal also read on the activity channel, after stderr (both channels work; no action needed)`,
      );
    Dn = V;
    Vt.arm();
    if (V === "stderr") {
      kt?.("init-observed");
      return;
    }
    let ue = !Ue;
    Ue = true;
    Zt = true;
    P.noteTurnStart();
    kt?.("activity");
    if (ue) {
      ee = null;
      if (Re !== undefined) {
        clearTimeout(Re);
        Re = undefined;
      }
      ye("follow-up turn opened");
    }
  };
  let Ln = (V) => {
    let ue;
    try {
      ue = jsonParse(V);
    } catch {
      return;
    }
    if (!ue || typeof ue !== "object") return;
    let U = ue;
    if (typeof U.type === "string") Vt.heard();
    if (U.type === "control_response") {
      let requestId = U.response?.request_id;
      if (typeof requestId === "string" && requestId.startsWith("shr-token-")) onTokenAck?.(requestId);
    }
    if (U.type === "assistant") onDebug("[runner:session] Activity: assistant message");
    else if (U.type === "result") {
      onDebug(`[runner:session] Result: subtype=${U.subtype}`);
      if (U.is_error === true && typeof U.api_error_status === "number")
        onResultApiError?.(U.api_error_status);
    }
    if (U.type === "system" && U.subtype === "task_started") {
      if (typeof U.task_id === "string" && U.task_type !== "in_process_teammate") {
        re.set(U.task_id, typeof U.task_type === "string" ? U.task_type : "unknown");
        if (U.owned_by_subagent === true) R.add(U.task_id);
        else R.delete(U.task_id);
        onBgTaskLedger?.(be());
      }
      return;
    }
    if (U.type === "system" && U.subtype === "task_updated") {
      let patch = U.patch;
      let status = patch?.status;
      if (typeof U.task_id === "string" && patch?.is_backgrounded === true && re.has(U.task_id))
        In.add(U.task_id);
      if (
        typeof U.task_id === "string" &&
        (status === "completed" || status === "failed" || status === "killed") &&
        re.delete(U.task_id)
      ) {
        Je(U.task_id);
        onBgTaskLedger?.(be());
        fn();
      }
      return;
    }
    if (U.type === "system" && U.subtype === "task_notification") {
      if (typeof U.task_id === "string" && re.delete(U.task_id)) {
        if (U.status === "stopped") Nt(U.task_id);
        else Je(U.task_id);
        onBgTaskLedger?.(be());
        fn();
      }
      return;
    }
    if (U.type === "system" && U.subtype === "background_tasks_changed") {
      let tasks = U.tasks;
      if (Array.isArray(tasks))
        for (let task of tasks) {
          let taskId = task?.task_id;
          if (typeof taskId === "string") In.add(taskId);
        }
      return;
    }
    if (
      U.type === "system" &&
      U.subtype === "hook_response" &&
      U.hook_event === "SessionStart" &&
      U.outcome === "error"
    ) {
      onSessionStartHookError?.();
      return;
    }
    if (U.type === "system" && U.subtype === "init") {
      if (!Ct) {
        Ct = true;
        Vt.end();
        onChildInit?.();
        if (child.kind === "tool-server") logFeatureOk("self_hosted_tools_host");
      }
      kt?.(child.kind === "tool-server" ? "init-observed" : "activity");
      return;
    }
    if (U.type === "system" && U.subtype === "turn_began_before_init") {
      hn("tee");
      return;
    }
    if (U.type === "system" && U.subtype === "turn_starting") {
      if (!Ct) return;
      wn = true;
      kt?.("activity");
      if (
        U.mode === undefined ||
        (U.mode === "task-notification" && !("task_id" in U)) ||
        (U.mode === "task-notification" && typeof U.task_id === "string" && tt.has(U.task_id))
      )
        ye("follow-up turn starting");
      else {
        ye("non-follow-up turn starting", true);
        Ie();
      }
      return;
    }
    if (U.type === "system" && U.subtype === "session_state_changed") {
      St = true;
      if (se) Pn(SESSION_STATE_IDLE_SETTLE_MS);
      if (typeof U.waiting_on_user === "boolean") {
        ht = true;
        et = U.waiting_on_user;
      }
      if (U.state === "idle") {
        if (!Ar || (Zt && !Ct)) {
          P.noteTurnEnd();
          Ue = false;
          Zt = false;
          if (Ar && nn && be() === 0 && !et) qe();
          if (Ar && (re.size > 0 || pr() || pe)) Wn();
          else kt?.("turn-end");
        }
        return;
      }
      if (!Ct) {
        if (typeof U.waiting_on_user === "boolean" ? U.waiting_on_user : U.state === "requires_action")
          Or = true;
        else if (!Or) return;
      }
      if (typeof U.waiting_on_user === "boolean") {
        kt?.(U.waiting_on_user ? "awaiting-action" : "activity");
        ye(U.waiting_on_user ? "child parked at a prompt" : "child running", true);
      } else if (U.state === "requires_action") {
        kt?.("awaiting-action");
        ye("child parked at a prompt", true);
      } else if (U.state === "running") {
        kt?.("activity");
        ye("child running", true);
      }
      return;
    }
    if (U.type === "assistant") {
      let content = U.message?.content;
      if (Array.isArray(content)) {
        for (let Tt of content)
          if (
            Tt &&
            typeof Tt === "object" &&
            Tt.type === "tool_use" &&
            Tt.name === SCHEDULE_WAKEUP_TOOL_NAME
          ) {
            let input = Tt.input;
            let Kn = Number(input?.delaySeconds);
            if (Number.isFinite(Kn)) {
              let min = Math.min(3600, Math.max(60, Kn));
              ee = Date.now() + min * 1000 + Gr;
            }
          }
      }
    }
    if (U.type === "result") {
      Jt();
      P.noteTurnEnd();
      Ue = false;
      Zt = false;
      Ar = true;
      if (nn && be() === 0 && !et) qe();
      if (re.size === 0 && !pr() && !pe) kt?.("turn-end");
      else if (et && !env.CLAUDE_RUNNER_DISABLE_AWAITING_ACTION_OVERRIDE) {
        kt?.("awaiting-action", Bn());
        ye("child parked at a prompt", true);
      } else Wn();
    } else if (U.type === "user" || U.type === "assistant") {
      if (U.from_subagent === true) return;
      if (Dn === undefined && !Ct && !St && !Ar) {
        kt?.("startup", {
          ...Bn(),
          childAlive: true,
        });
        return;
      }
      P.noteTurnStart();
      if (!Ue && U.type === "user") ee = null;
      let nt = !Ue;
      Ue = true;
      if (Re !== undefined) {
        clearTimeout(Re);
        Re = undefined;
      }
      if (!ht) kt?.("activity");
      if (nt) {
        ye("follow-up turn opened", wn);
        if (wn) Ie();
      }
    }
  };
  if (he.stdout)
    createInterface({
      input: he.stdout,
    }).on("line", Ln);
  if (De)
    createInterface({
      input: De,
    }).on("line", Ln);
  let Dt = 50;
  let Cr = 500;
  let pt = [];
  let Lt = 9;
  let Ke = 0;
  if (he.stderr)
    createInterface({
      input: he.stderr,
    }).on("line", (ue) => {
      if (!Ct && ue.startsWith("SDKStartup: phase=system_init_emitted")) {
        Ct = true;
        Vt.end();
        onChildInit?.();
        kt?.("init-observed");
        onDebug(`[runner:session] ${sessionId} sawInit latched via stderr SDKStartup marker`);
      }
      if (/^SDKStartup: phase=turn_began_before_init(?: |$)/.test(ue)) hn("stderr");
      let U = redactAndTruncate(ue, Cr);
      if (U.startsWith(OTEL_DIAG_ERROR_PREFIX)) onStatus(`[runner:session] stderr: ${U}`);
      else if (diffFindsNestedRepository && isChangesPaneProblemMessage(U) && Ke < Lt) {
        Ke++;
        onStatus(`[runner:session] ${sessionId} ${U}`);
      } else onDebug(`[runner:session] stderr: ${U}`);
      pt.push(U);
      if (pt.length > Dt) pt.shift();
    });
  let Ut = false;
  return new Promise((resolve) => {
    he.on("close", (ue, U) => {
      signal.removeEventListener("abort", Z);
      P.stop();
      Vt.end();
      if (Re !== undefined) {
        clearTimeout(Re);
        Re = undefined;
      }
      if (re.size > 0) {
        re.clear();
        R.clear();
        onBgTaskLedger?.(0);
      }
      ye("child exited", false, true);
      cn(true);
      let stderrTail = pt.join(`
`);
      if (P.terminationRequested) {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (interrupted \u2014 we asked)`,
        );
        P.descendantsReaped.then(() =>
          resolve({
            result: "interrupted",
            exitCode: ue,
            exitSignal: U,
            stderrTail,
          }),
        );
      } else if (U === "SIGTERM" || U === "SIGINT") {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (interrupted)`,
        );
        resolve({
          result: "interrupted",
          exitCode: ue,
          exitSignal: U,
          stderrTail,
        });
      } else if (ue === 0) {
        onStatus(`[runner:session] ${sessionId} child exited pid=${he.pid} code=0 (completed)`);
        if (!Ut) {
          Ut = true;
          onChildLifecycle?.("completed");
        }
        resolve({
          result: "completed",
          exitCode: 0,
          exitSignal: null,
          stderrTail,
        });
      } else {
        onStatus(
          `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (failed) \u2014 debug log at ${debugFile}`,
        );
        if (!Ut) {
          Ut = true;
          onChildLifecycle?.("failed");
        }
        resolve({
          result: "failed",
          exitCode: ue,
          exitSignal: U,
          stderrTail,
        });
      }
    });
    he.on("error", (ue) => {
      signal.removeEventListener("abort", Z);
      P.stop();
      Vt.end();
      if (!Ut) {
        Ut = true;
        onChildLifecycle?.("failed");
      }
      if (he.pid === undefined) {
        resolve(En(ue));
        return;
      }
      onDebug(`[runner:session] ${sessionId} spawn error: ${ue.message}`);
      resolve({
        result: "failed",
        exitCode: null,
        exitSignal: null,
        stderrTail: `spawn error: ${ue.message}`,
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
  let n = envPositiveMs("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS");
  return n > 0 ||
    (envSelfHostedRunnerCheckoutHookTimeoutMs.trim() !== "" &&
      Number(envSelfHostedRunnerCheckoutHookTimeoutMs) === 0)
    ? n
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
function graceSeconds(e, n, r = 0, s = 0, a = 0) {
  return Math.ceil((e + n + r + s + a + SIGKILL_GRACE_BASE_MS) / 1000);
}
//@ chunk-hm0ce8vc.js:159760-159854 placement
function redactAndTruncate(e, n) {
  let r = redactSecretsInText(e);
  return r.length > n ? r.slice(0, n) + ` \u2026[+${r.length - n} chars]` : r;
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
  constructor(e) {
    this.child = e.child;
    this.sessionId = e.sessionId;
    this.maxLifetimeGraceMs = e.maxLifetimeGraceMs;
    this.sigkillTimeoutMs = e.sigkillTimeoutMs;
    this.sigkillGraceMs = e.sigkillGraceMs;
    this.onMaxLifetime = e.onMaxLifetime;
    this.startTokenStale = e.startTokenStale;
    this.stuckExitCode = e.stuckExitCode;
    this.onTerminating = e.onTerminating;
    this.onDebug = e.onDebug;
    this.onStatus = e.onStatus;
    if (this.child.pid !== undefined)
      getProcessStartTimeAsync(this.child.pid, {
        skipCache: true,
      }).then(
        (rootToken) => {
          this.rootToken = rootToken;
        },
        () => {},
      );
    if (e.maxLifetimeMs > 0) {
      let maxLifetimeMs = e.maxLifetimeMs;
      this.maxLifetimeTimer = setTimeout(
        (r) => {
          if (this.stopped || this.terminating) return;
          let s;
          try {
            s = this.onMaxLifetime?.();
          } catch (error) {
            this.onStatus(
              `[runner:session] ${this.sessionId} max-lifetime hook threw (${error instanceof Error ? error.message : String(error)}) \u2014 falling back to the watchdog's own decision`,
            );
          }
          this.maxLifetimeDecidedByHook = s !== undefined;
          s ??= this.turnInFlight ? "wait" : "kill";
          if (s === "kill") {
            this.onDebug(
              `[runner:stuck] Session ${this.sessionId} exceeded max lifetime of ${r}ms \u2014 aborting child pid=${this.child.pid}`,
            );
            this.terminate();
            return;
          }
          this.maxLifetimeDeferred = true;
          this.onStatus(
            s === "release"
              ? `[runner:session] ${this.sessionId} max session age reached (${r}ms) while not mid-turn \u2014 handing to the poll loop's release instead of terminating (hard stop in ${this.maxLifetimeGraceMs}ms if it is still alive)`
              : this.maxLifetimeDecidedByHook
                ? `[runner:session] ${this.sessionId} max session age reached (${r}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for the in-flight turn to park or finish (it is then released; terminated at the hard stop otherwise)`
                : `[runner:session] ${this.sessionId} max session age reached (${r}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for in-flight turn to finish before terminating`,
          );
          this.maxLifetimeGraceTimer = setTimeout(
            (a) => {
              if (this.stopped || this.terminating) return;
              if (this.maxLifetimeDecidedByHook)
                this.onStatus(
                  `[runner:session] ${this.sessionId} still mid-turn, or its release was not accepted, within ${this.maxLifetimeGraceMs}ms of the max session age (${a}ms) \u2014 terminating (hard stop) pid=${this.child.pid}`,
                );
              else
                this.onDebug(
                  `[runner:stuck] Session ${this.sessionId} still mid-turn ${this.maxLifetimeGraceMs}ms after max lifetime of ${a}ms \u2014 aborting child pid=${this.child.pid}`,
                );
              this.terminate();
            },
            this.maxLifetimeGraceMs,
            r,
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
  signalGroup(e) {
    let pid = this.child.pid;
    if (pid === undefined) {
      this.child.kill(e);
      return;
    }
    if (pid <= 1) return;
    try {
      process.kill(-pid, e);
    } catch {
      this.child.kill(e);
    }
  }
  reapDescendants(e) {
    let treeSnapshot = this.treeSnapshot;
    if (treeSnapshot === undefined) return;
    this.treeSnapshot = undefined;
    let pid = this.child.pid;
    let s = (async () => {
      let a = await treeSnapshot;
      if (a === undefined) {
        this.onStatus(
          `[runner:session] ${this.sessionId} could not list the child's process tree \u2014 signals reached its process group only; detached tool trees may survive`,
        );
        return;
      }
      if (a.rootRecycled) {
        this.onStatus(
          `[runner:session] ${this.sessionId} child pid=${pid} now names another process \u2014 no process-tree reap; detached tool trees may survive`,
        );
        return;
      }
      let o;
      if (e > 0) {
        let { live, incomplete } = await countLiveProcesses(a);
        if (live > 0 || incomplete) {
          await sleep(e);
          o = await killProcessTree(a, "SIGKILL");
        }
      } else o = await killProcessTree(a, "SIGKILL");
      if (o?.incomplete) {
        this.onStatus(
          `[runner:session] ${this.sessionId} process-tree identity check did not complete \u2014 ${a.pinned.size - o.proven} of ${a.pinned.size} descendant(s) unverified and not signalled; they may survive`,
        );
        return;
      }
      let pids = o?.pids ?? 0;
      let groups = o?.groups ?? 0;
      if (a.degraded || a.truncated || a.unpinned > 0) {
        this.onStatus(
          `[runner:session] ${this.sessionId} process-tree listing incomplete (partial=${a.degraded} truncated=${a.truncated}) \u2014 SIGKILLed ${pids} of ${a.pinned.size} identified descendant(s) and ${groups} group(s); ${a.unpinned} descendant(s) could not be identified and were not signalled; they, and any unlisted tool trees, may survive`,
        );
        return;
      }
      this.onDebug(
        o === undefined
          ? `[runner:session] process tree pid=${pid}: ${a.pinned.size} descendant(s) at SIGTERM (${a.unpinned} unidentifiable), none outlived the child`
          : `[runner:session] process tree pid=${pid}: ${a.pinned.size} descendant(s) at SIGTERM (${a.unpinned} unidentifiable); ${pids} outlived the child and were SIGKILLed, with ${groups} tool-tree group(s)`,
      );
    })().catch(() => {});
    this.reap = withDeadline(s, e + DESCENDANT_REAP_GRACE_MS).then(() => {});
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
        (n) => {
          if (!this.stopped) {
            this.onDebug(
              `[runner:session] Child still running after ${n}ms, sending SIGKILL to process group pgid=${this.child.pid} and reaping its process tree`,
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
  let s = 0;
  for (;;) {
    if (options.signal?.aborted) return;
    s++;
    try {
      return await fn();
    } catch (error) {
      if (options.shouldRetry && !options.shouldRetry(error)) throw error;
      if (options.maxAttempts !== undefined && s >= options.maxAttempts) throw error;
      options.onRetry?.(s, error);
      let o = initialDelayMs * (0.75 + Math.random() * 0.5);
      await sleep(o, options.signal);
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
var tokenCounters = new HostScoped(() => new TokenCounter());
//@ chunk-hm0ce8vc.js:166682-166719 placement
function nextTokenCounter() {
  return tokenCounters.of(getRootSession().host);
}
//@ chunk-hm0ce8vc.js:166719-167351 placement
/**
 * 把刷新的会话令牌写入子进程 stdin（未接好时记录未投递）。
 */
function deliverRefreshedToken(e) {
  let n = e.expiresInSeconds !== undefined ? ` (expires_in=${e.expiresInSeconds}s)` : "";
  if (!e.write) {
    e.onStatus(
      `[runner:session] ${e.label} refreshed for ${e.sessionId} but child stdin is not wired yet \u2014 token NOT delivered; next interval will retry${n}`,
    );
    return;
  }
  let r;
  if (e.pendingAcks) {
    r = `shr-token-${e.label}-${nextTokenCounter().next()}`;
    e.pendingAcks.set(r, {
      label: e.label,
      sentAtMs: e.nowMs ?? Date.now(),
    });
  }
  e.write(
    jsonStringify({
      type: "update_environment_variables",
      variables: {
        [e.envVar]: e.token,
      },
      ...(r && {
        request_id: r,
      }),
    }) +
      `
`,
  );
  e.onStatus(
    `[runner:session] ${e.label} refreshed for ${e.sessionId} \u2014 pushed to child via stdin${n}${r ? ` [${r}]` : ""}`,
  );
}
//@ chunk-hm0ce8vc.js:167351-167833 placement
function warnTokenUpdateNotAcked(e) {
  let n = e.nowMs ?? Date.now();
  let graceMs = e.graceMs ?? 90000;
  for (let [s, a] of e.pendingAcks)
    if (n - a.sentAtMs >= graceMs) {
      e.onStatus(
        `[runner:session] WARNING: ${a.label} update ${s} for ${e.sessionId} was never acked by the child \u2014 the stdin control channel may be severed (wrapper backgrounding without <&0?). Token rotation is NOT reaching the child; it will 401 at token TTL. See docs/self-hosted-runners-guide.md \xA7 "The child must keep the runner's stdin".`,
      );
      e.pendingAcks.delete(s);
    }
}
//@ chunk-hm0ce8vc.js:167833-169415 placement
function createDebouncedSender(e) {
  let errorRetryMs = e.errorRetryMs ?? 30000;
  let max = Math.max(errorRetryMs, e.errorRetryMaxMs ?? 0);
  let jitter = e.jitter ?? 0;
  let expiryMarginMs = e.expiryMarginMs ?? 60000;
  let o = e.expiredRetryMs ?? {
    minMs: 30000,
    maxMs: 60000,
  };
  let minRefreshGapMs = e.minRefreshGapMs ?? 30000;
  let now = e.now ?? Date.now;
  let random = e.random ?? Math.random;
  let p;
  let S = false;
  let T = false;
  let { intervalMs, ttlMs } = e;
  let w = ttlMs === undefined ? undefined : now() + ttlMs;
  let E;
  let A = 0;
  let G = false;
  let K = () => L();
  e.signal.addEventListener("abort", K, {
    once: true,
  });
  function L() {
    S = true;
    if (p) clearTimeout(p);
    e.signal.removeEventListener("abort", K);
  }
  function D(Ne) {
    let me = w !== undefined && now() >= w - expiryMarginMs;
    if (!Ne)
      return {
        delayMs: intervalMs,
        expired: me,
        transient: Ne,
      };
    let Te;
    if (me) {
      let { minMs, maxMs } = o;
      Te = Math.round(minMs + random() * Math.max(0, maxMs - minMs));
    } else {
      let min = Math.min(max, errorRetryMs * 2 ** A);
      Te = Math.round(min * (1 - jitter + 2 * jitter * random()));
    }
    return {
      delayMs: Math.min(Te, intervalMs),
      expired: me,
      transient: Ne,
    };
  }
  function oe() {
    if (S || e.signal.aborted || T) return;
    T = true;
    let Ne = now();
    E = Ne;
    let me;
    let Te;
    Promise.resolve()
      .then(() => e.refresh())
      .then((Ye) => {
        A = 0;
        let He =
          typeof Ye === "number"
            ? {
                intervalMs: Ye,
              }
            : (Ye ?? {});
        if (He.intervalMs !== undefined && He.intervalMs > 0) intervalMs = He.intervalMs;
        if (He.ttlMs !== undefined && He.ttlMs > 0) ttlMs = He.ttlMs;
        if (ttlMs !== undefined) w = Ne + ttlMs;
        if (He.nextInMs !== undefined && He.nextInMs > 0) Te = He.nextInMs;
      })
      .catch((error) => {
        if (S || e.signal.aborted) return;
        me = D(e.isTransient?.(error) ?? true);
        if (G)
          me = {
            ...me,
            delayMs: 0,
          };
        A++;
        e.onError(error, me);
      })
      .finally(() => {
        T = false;
        if (S || e.signal.aborted) return;
        if (G) {
          G = false;
          oe();
          return;
        }
        p = setTimeout(oe, me?.delayMs ?? Te ?? intervalMs);
      });
  }
  function ge(
    { force: Ne } = {
      force: false,
    },
  ) {
    if (S || e.signal.aborted) return "cancelled";
    if (T) {
      G ||= Ne;
      return "in_flight";
    }
    if (!Ne && E !== undefined && now() - E < minRefreshGapMs) return "debounced";
    if (p) {
      clearTimeout(p);
      p = undefined;
    }
    oe();
    return "fired";
  }
  p = setTimeout(oe, intervalMs);
  return {
    cancel: L,
    refreshNow: ge,
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
function isTransientRunnerError(e) {
  let httpStatus = getHttpStatus(e);
  return (
    !(e instanceof RemoteConfigWithoutInferenceAuthError) &&
    (isRetryableRunnerError(e) || httpStatus === 401 || httpStatus === 403)
  );
}
//@ chunk-hm0ce8vc.js:169967-170087 placement
function normalizeGovernedHost(e) {
  if (typeof e !== "string") return;
  let n = normalizeHost(e);
  if (n === "" || n.length > 255 || !HOST_LABEL_RE.test(n)) return;
  return isGithubDotCom(n) ? GITHUB_HOST : n;
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
