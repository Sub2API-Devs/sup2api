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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  sep,
  sep as sep_2,
  sep as sep_3,
  normalize,
} from "path";
import { homedir, homedir as homedir_2, homedir as homedir_3 } from "os";
import {
  rm,
  rm as rm_2,
  rm as rm_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  realpath,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  writeFile,
  writeFile as writeFile_2,
} from "fs/promises";
import { spawn } from "child_process";
import { createInterface } from "readline";
import {
  Nf,
  splitMountRouting,
  hf,
  restoreHookStubs,
  ignoreLocalSettingsInGit,
  isLoopbackHttpUrl,
  formatSourcesOnHostWarning,
  formatAskpassWarning,
  governedNoProxyHosts,
  classifySourceRouting,
  branchesByRepo,
  gitRepositorySources,
  Si,
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
  $f,
  Mf,
  retryGitOperation,
  setUrlInsteadOf,
} from "./governedGit.js";
import {
  ALLOWED_SIGNING_PROGRAMS,
  vc,
  getSessionClaudeConfigDir,
  lifecycleHookGitConfig,
  wc,
  getToolServerConfigDir,
  writeBestEffort,
  validateLauncherHooks,
  Sr,
  $c,
  getIngressTokenTempPrefix,
  Xr,
  writeSessionIngressTokenFile,
  Rc,
  materializeSessionGitConfig,
  sessionGitConfig,
  Tc,
  Oc,
  runGit,
  Dc,
  serializeByKey,
  go,
  SourceRefNotFoundError,
  classifySourcePrepFailure,
  runWithSlots,
  Lc,
  Uc,
  Md,
  _s,
  tagFailureStage,
  Sc,
  MCP_CONFIG_DELIVERED_JSON,
  writeLauncherSettings,
  $d,
  CHECKOUT_DISPLAY_LIMIT,
  setupFailureKindOf,
  Qd,
  removeSessionState,
  Dr,
  cleanupSessionIngressTokenFiles,
  getStartupTimeoutMs,
  Mc,
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
import { Aa, withDeadline, sleep } from "../../utils/sleep.js";
import {
  createPrepTimer,
  isEpochMismatchError,
  co,
  decodeSessionJwt,
  getJwtExpiry,
  writeSystemPromptFile,
  APPEND_SUBAGENT_SYSTEM_PROMPT,
  postSessionFailureResult,
  REPO_NOT_FOUND_REASON,
  pd,
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
  hu,
  pushOnRelease,
  runGitQuiet,
} from "./outcomeBranches.js";
import { withBoundedTimeout, z_, Hln } from "../../utils/boundedTimeout.js";
import {
  ensureSessionConfigDirs,
  isHostConfigSnapshotError,
  formatHostConfigNotAppliedNotice,
  seedHostConfigForSession,
  formatHostConfigPartiallyAppliedNotice,
  writeSessionFileAtomically,
  isHooksDirSafe,
  buildClearedAuthEnv,
  Ma,
  writeChildSessionTokens,
} from "./hostConfigSnapshot.js";
import {
  createGovernedGitState,
  buildGitTrustBundle,
  readTrustBundleSource,
  readServerGitSslVars,
  resolveChildGitEnvironment,
  ld,
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
  $0r,
  prepareRepositories,
  RepositoryAccessError,
  REPO_ACCESS_FAILURE_LABELS,
} from "../../selfHostedRunner/git/repoPrepare.js";
import { repoCheckoutDir, repoDirSlug, isGitRemoteUrl } from "../../selfHostedRunner/git/repoSources.js";
import {
  H0r,
  FetchRefNotFoundError,
  NVn,
  FetchThrottledError,
  FETCH_REFUSAL_REASONS,
  Mln,
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
import { Nd } from "../../utils/toolCgroup.js";
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
import { S5s, SESSION_MOVED_CONTINUE_PROMPT } from "../../utils/conversationRecovery.js";
import { formatDuration } from "../../utils/format.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../tools/ScheduleWakeupTool/prompt.js";
import { OTEL_DIAG_ERROR_PREFIX } from "../../utils/telemetry/logger.js";
import { LCs } from "./changesPaneRefusals.js";
import {
  countLiveProcesses,
  killProcessTree,
  snapshotProcessTree,
} from "../../selfHostedRunner/processTable.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { normalizeHost, Nut, isGithubDotCom, GITHUB_HOST } from "../../utils/git/githubUrl.js";

/**
 * getRemoteSessionOrigin：environment_variables.CLAUDE_CODE_REMOTE_SESSION_ORIGIN。
 */
//@ chunk-hm0ce8vc.js:58886-59069 placement
function getRemoteSessionOrigin(e) {
  let n = e.environment_variables ?? {},
    r = Object.hasOwn(n, "CLAUDE_CODE_REMOTE_SESSION_ORIGIN") ? n.CLAUDE_CODE_REMOTE_SESSION_ORIGIN : void 0;
  return typeof r === "string" ? r : void 0;
}
/**
 * isReviewOriginSession：旧版名 review 配错。
 */
//@ chunk-hm0ce8vc.js:59069-59108 placement = review (0.384)
function isReviewOriginSession(e) {
  return getRemoteSessionOrigin(e) === "review";
}
/**
 * 处理一个会话工单：准备目录/配置/仓库、合成环境、启动子进程并在结束后发布结果与清理（约 58 KB）。
 */
//@ chunk-hm0ce8vc.js:82431-140444 placement
async function handleSelfHostedSession(e, n, r) {
  let {
      apiClient: apiClient,
      getRunnerToken: getRunnerToken,
      baseDir: baseDir,
      execPath: execPath,
      execArgs: execArgs,
      updatedChildBin: updatedChildBin,
      restartedHere: restartedHere,
      childUpdateBin: childUpdateBin,
      onChildUpdateReady: onChildUpdateReady,
      capacity: capacity,
      healthPort: healthPort,
      onDebug: onDebug,
      onStatus: onStatus,
      onSessionActivity: onSessionActivity,
      onBgTaskLedger: onBgTaskLedger,
      onBgFollowupPending: onBgFollowupPending,
      onPostTurnSettle: onPostTurnSettle,
      onSessionTokenIssued: onSessionTokenIssued,
      onChildLifecycle: onChildLifecycle,
      clientPlatform: clientPlatform,
      onInitPhase: onInitPhase,
      onSessionStartHookError: onSessionStartHookError,
      onMaxLifetime: onMaxLifetime,
      onChildTerminating: onChildTerminating,
      canonicalLocks: canonicalLocks,
      spawnedSessionIds: spawnedSessionIds,
      tokenFileOpTimeoutMs: tokenFileOpTimeoutMs,
      governedPushRepresentRetryMs: governedPushRepresentRetryMs = Nf,
      gitSshRewriteHosts: gitSshRewriteHosts,
      gitHostRewrites: gitHostRewrites,
      useAnthropicGitProxy: useAnthropicGitProxy,
      gitProxyGlobalConfigPath: gitProxyGlobalConfigPath,
      gitProxyGlobalConfigSnapshot: gitProxyGlobalConfigSnapshot,
      gitProxyCredHelper: gitProxyCredHelper,
      configureGitHookStubs: configureGitHookStubs,
      configureGitSigningArtifacts: configureGitSigningArtifacts,
      operatorGitSnapshot: operatorGitSnapshot,
      hookGitPrograms: hookGitPrograms = ALLOWED_SIGNING_PROGRAMS,
      hookGitLegacyParams: hookGitLegacyParams = !1,
      pushOutcomeOnRelease: pushOutcomeOnRelease,
      trustWorkspace: trustWorkspace,
      removeSessionState: removeSessionState_2 = !1,
      diffFindsNestedRepository: diffFindsNestedRepository = !1,
      freshMachinePerSession: freshMachinePerSession = !1,
      confineRepoSettings: confineRepoSettings = "enforce",
      serverAutoModeLists: serverAutoModeLists = NO_ALLOW,
      hostConfig: hostConfig,
      governedGitConfigSeed: governedGitConfigSeed,
      debugTokenDir: debugTokenDir,
      standbyIdleMs: standbyIdleMs,
      takeStartCommandPhases: takeStartCommandPhases,
      getHealthzClaimVisibleMs: getHealthzClaimVisibleMs,
      moveWatch: moveWatch,
      clock: clock = Aa,
    } = n,
    zn = void 0,
    ze = capacity > 1,
    Xn = configureGitHookStubs !== void 0 && !ze;
  onDebug(`[runner:session] Handling session ${e}`);
  let Pt = !1,
    Wt = !1,
    $n = !1,
    lt,
    Kt = createPrepTimer(),
    Mn,
    ir = !1,
    Hn = !1,
    de = { current: void 0 },
    Yt = { current: void 0, previous: void 0, held: [] },
    qn = (Qe) => {
      Yt.held = [...Yt.held.filter((gt) => gt !== Qe && vc(gt)), ...(Qe ? [Qe] : [])].slice(-32);
    },
    q,
    Pe = "failed",
    En = !1,
    ft = !1,
    he,
    De,
    Vt,
    P,
    Z,
    re = [],
    be = [],
    ee = getSessionClaudeConfigDir(baseDir, e),
    Re =
      configureGitSigningArtifacts === void 0
        ? lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms)
        : void 0,
    Ue,
    ht = join_4(baseDir, "_sessions", `${e}.gitconfig`),
    wn,
    et = join_4(baseDir, "_sessions", `${e}.git-ca-bundle.pem`),
    Ct = join_4(baseDir, "_sessions", `${e}.git-ca-bundle.child.pem`),
    St,
    Or = join_4(baseDir, "_sessions", `${e}.gh`),
    Ar = join_4(baseDir, "_sessions", `${e}.gitrules`),
    Gr = join_4(baseDir, "_sessions", `${e}.uploads`),
    pr = join_4(baseDir, "_sessions", `${e}.diff-copies`),
    Bn = !1,
    un = join_4(ee, "claude-code-debug.txt"),
    We,
    se,
    ke,
    jt,
    cn = () => [ke, jt].filter((Qe) => Qe !== void 0),
    Pn = [],
    Jt = !1,
    In = !1,
    nn = !1,
    resolved = Promise.resolve(),
    R = !1,
    resolved_2 = Promise.resolve(),
    It = !1,
    Ie,
    ye = [],
    Xe = [],
    qe = [],
    Nt = [],
    Je,
    fn,
    Wn = [],
    Dn = (Qe, gt, Qt) => {
      try {
        return splitMountRouting(Qe, Wn, gt, Qt);
      } catch (error) {
        onDebug(
          `[runner:session] session git rules: the sources in a /remote reply for ${e} could not be used (${errorMessage(error)}); which repositories are fetched through the git mount is unchanged, and the next reply is read anew`,
        );
        return;
      }
    },
    Zt,
    hn,
    abortController = new AbortController(),
    any = AbortSignal.any([r, abortController.signal]),
    Cr = [],
    pt,
    Lt = !1,
    Ke = !1,
    envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR,
    V = [],
    ue = !1,
    U = hf(spawnedSessionIds, e),
    nt = new Map(),
    Tt = new Set(),
    xn = [],
    Kn,
    wr,
    Jn,
    es,
    ts = !1,
    yo,
    Hr,
    vs = async () => {
      for (;;) {
        while (Jn !== void 0) {
          Hr ??= performance.now() + wc;
          let gt = Hr - performance.now();
          if (gt <= 0) break;
          let Qt = es;
          if ((await withDeadline(Qt ?? Promise.resolve(), gt), es === Qt)) break;
        }
        let Qe = es;
        if (ts) await resolved;
        if (es === Qe) return;
      }
    },
    Br = () => {
      (wr?.(), (wr = void 0), Jn?.abort(), (Jn = void 0));
    },
    resolved_3 = Promise.resolve(),
    pn,
    ns = !1,
    rs = async () => {
      if ((await resolved_3, (ns = !0), pn !== void 0)) throw pn;
    };
  try {
    if (((Mn = Date.now()), onInitPhase?.({ kind: "start" }), !e || !/^[a-zA-Z0-9_-]+$/.test(e)))
      throw Error("Invalid session_id: contains unsafe characters");
    ((Bn = !0), (se = join_4(baseDir, "_sessions", e)));
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
    if (!Qe) return { result: "abandoned" };
    de.current = Qe.session_token;
    let tools_host = Qe.tools_host;
    if (tools_host !== void 0)
      (moveWatch?.holdOff(e),
        (ee = getToolServerConfigDir(baseDir, e)),
        (un = join_4(ee, "claude-code-debug.txt")));
    let Qt =
      tools_host === void 0
        ? (...ne) => apiClient.getSessionRemoteConfig(...ne)
        : async () => ({
            sources: [],
            push_targets: [],
            claude_code_args: {},
            environment_variables: {},
            api_base_url: tools_host.api_base_url,
            ...(tools_host.cwd !== void 0 && { cwd: tools_host.cwd }),
          });
    if (Xn) await restoreHookStubs(configureGitHookStubs, configureGitSigningArtifacts, onDebug);
    if (useAnthropicGitProxy) {
      if (Qe.tools_host === void 0) process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = Qe.session_token;
      if (gitProxyGlobalConfigSnapshot !== void 0 && gitProxyGlobalConfigPath) {
        let ne = process.env.XDG_CONFIG_HOME || join_4(homedir_3(), ".config");
        await ignoreLocalSettingsInGit(
          {
            globalConfigPath: gitProxyGlobalConfigPath,
            globalConfigSnapshot: gitProxyGlobalConfigSnapshot,
            homeGitconfigPath: join_4(homedir_3(), ".gitconfig"),
            xdgConfigPath: join_4(ne, "git", "config"),
            credHelper: gitProxyCredHelper,
            signingArtifacts: configureGitSigningArtifacts,
          },
          onDebug,
          onStatus,
        );
      }
    }
    if ((onSessionTokenIssued?.(Qe.session_token), r.aborted))
      return (
        onDebug(`[runner:session] Aborted after issueSessionToken for ${e} \u2014 skipping registration`),
        { result: "abandoned" }
      );
    if (
      (onDebug(`[runner:session] Issued session_token for ${e}`),
      (q = await retryWithBackoff(() => Qt(e, de.current, r), {
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
      })),
      !q)
    )
      return { result: "abandoned" };
    if (
      (onDebug(
        `[runner:session] Fetched remote config: ${q.sources.length} source(s), ${q.push_targets.length} push target(s), api_base_url=${q.api_base_url}`,
      ),
      r.aborted)
    )
      return (
        onDebug(
          `[runner:session] Aborted after getSessionRemoteConfig for ${e} \u2014 skipping registration`,
        ),
        { result: "abandoned" }
      );
    let yt = isReviewOriginSession(q),
      $r = !1,
      ar;
    if (yt)
      disableCoreDumps((ne) => {
        ar = ne;
      });
    if (yt && debugTokenDir !== void 0)
      throw (
        logFeatureBad("self_hosted_review_session", "debug_token_dir"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review, which this runner does not start while --debug-token-dir keeps tokens in files. Restart the runner without --debug-token-dir to take code reviews.`,
          "a code review is not started while --debug-token-dir keeps tokens in files",
        )
      );
    if (debugTokenDir && tools_host === void 0)
      writeBestEffort(debugTokenDir, `session_token_${e}.jwt`, Qe.session_token, onStatus);
    if (yt && getPlatform() === "windows")
      throw (
        logFeatureBad("self_hosted_review_session", "windows"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review, which a runner on Windows does not start: it cannot hand the child its tokens on descriptors. Nothing on this runner needs changing.`,
          "a code review is not started by a runner on Windows",
        )
      );
    if (yt && capacity > 1)
      throw (
        logFeatureBad("self_hosted_review_session", "capacity"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review, which a runner started with --capacity ${capacity} does not take: the commands of its other sessions run as the same user, and could take the review's tokens while Claude Code starts. To take code reviews, run every runner of this environment with --capacity 1.`,
          "a code review is not started by a runner with --capacity above 1",
        )
      );
    let ss = yt && q.launcher_hooks !== void 0 ? validateLauncherHooks(q.launcher_hooks) : void 0;
    if (ss !== void 0)
      throw (
        logFeatureBad("self_hosted_review_session", "launcher_hooks"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} is a code review and is not started: the service sent launcher hooks that this runner cannot accept (${ss}), and a code review needs them. That is a fault of the service, or an event newer than this runner's build.`,
          "a code review is not started without the hooks that the service sent for it",
        )
      );
    if (yt) {
      if (ar !== void 0)
        throw (
          logFeatureBad("self_hosted_review_session", "dumpable"),
          onStatus(`[runner:session] ${e} the runner could not make itself non-dumpable: ${ar}`),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Session ${e} is a code review, which this runner does not start: it could not make itself non-dumpable, so the review's commands could read the session's tokens from the runner's memory. To take code reviews, run the released claude binary, and allow prctl(PR_SET_DUMPABLE) in any sandbox or seccomp profile around the runner.`,
            "a code review is not started by a runner that cannot make itself non-dumpable",
          )
        );
      onStatus(
        `[runner:session] ${e} is a code review: its child gets no repository as --add-dir, no user, project or local settings (so nothing from this machine's Claude Code config), no session token file, and its session and inference tokens on file descriptors 4 and 5 instead of in its environment`,
      );
    }
    let Q = void 0,
      N = Q === void 0 ? void 0 : await getProcessStartTimeAsync(process.pid);
    if (tools_host !== void 0 && (Q === void 0 || N === void 0))
      throw (
        logFeatureBad("self_hosted_tools_host", "cannot_host"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Session ${e} needs a tool server, which this runner cannot host`,
          "session needs a tool server, which this runner cannot host",
        )
      );
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
        void 0,
      ),
      xe = execPath === process.execPath || execPath === updatedChildBin,
      xt = agentProxyStandaloneRefusal({
        sessionId: e,
        serverEnv: q.environment_variables,
        runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
        runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
        governedGit: x?.toolConfig.gitConfig === !0 || x?.toolConfig.ghPathShim === !0 ? "on" : "off",
        egressListener: isEgressProxyActive() !== void 0,
        gitConfigArmed: x?.toolConfig.gitConfig === !0,
      });
    if (xt) throw (onStatus(`[runner:error] ${xt.message}`), xt);
    let Yn =
        ze &&
        x?.toolConfig.gitConfig === !0 &&
        (configureGitHookStubs !== void 0 || configureGitSigningArtifacts !== void 0),
      Zn = Yn && operatorGitSnapshot?.hooksPath !== void 0;
    if (x) {
      let hostSplit = x.toolConfig.hostSplit,
        mt = hostSplit
          ? `; per-host routing \u2014 governed hosts: ${hostSplit.governed.join(", ") || "(none)"} (git mount + session relay); direct hosts: ${hostSplit.direct.join(", ") || "(none)"} (this machine's own git rewrite and credentials)`
          : "";
      if (
        (onStatus(
          `[runner:session] governed git ACTIVE for ${e}: pre-CLI clone via git mount, in-session git/gh via the session relay (git_config=${x.toolConfig.gitConfig}, gh_path_shim=${x.toolConfig.ghPathShim})` +
            mt +
            (ze
              ? " \u2014 capacity>1: shared-canonical prep relies on per-invocation git hardening (no cross-session sanitize)"
              : ""),
        ),
        hostSplit)
      ) {
        let rn = formatSourcesOnHostWarning(
          hostSplit,
          !!useAnthropicGitProxy,
          q.sources.map((source) =>
            source.type === "git_repository" && source.url ? getRemoteHostname(source.url) : void 0,
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
    let yn = x ? void 0 : useAnthropicGitProxy;
    if (useAnthropicGitProxy && !x && !q.governed_git && tools_host === void 0)
      onStatus(
        `[runner:warn] ${e}: --use-anthropic-git-proxy is set but the server withheld ` +
          "Anthropic-managed git for this session (the reason is logged server-side \u2014 for example a " +
          "source host the server does not route through Anthropic-managed git, or a server that predates the opt-in); falling back to the legacy clone-URL git proxy for this session (deprecated; this fallback will be removed in a future runner release).",
      );
    try {
      let ne;
      if (Q !== void 0 && N !== void 0)
        (onDebug(`[runner:session] ${e} hosts tools only, no worker`),
          (ne = { kind: "tool-server", hosting: Q, runner: { pid: process.pid, proc_start: N } }));
      else {
        if (
          ((We = await retryWithBackoff(() => apiClient.registerWorker(q.api_base_url, e, de.current, r), {
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
          })),
          We === void 0)
        )
          return { result: "interrupted" };
        onDebug(`[runner:session] Registered worker, epoch=${We}`);
        let M = We;
        if (
          (await retryWithBackoff(
            () => apiClient.updateSessionWorkerState(q.api_base_url, e, de.current, M, void 0, r),
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
          ),
          r.aborted)
        )
          return { result: "interrupted" };
        ne = { kind: "agent-loop", workerEpoch: We };
      }
      let mt = iu(ne),
        rn = [ee],
        [_t] = await withBoundedTimeout(
          ensureSessionConfigDirs(dirname_4(ee), rn),
          Sr,
          `[runner:stuck] session config dir check ${ee} (check NFS/CSI mount health)`,
        ).catch((M) => {
          if (isHostConfigSnapshotError(M)) ((Jt = !0), onStatus(`[runner:error] ${M.message}`));
          throw M;
        });
      if (yt && ($c(We) || _t !== "made" || spawnedSessionIds?.has(e) === !0))
        throw (
          (Jt = !0),
          logFeatureBad("self_hosted_review_session", "second_start"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Session ${e} is a code review that a worker took before, here or on another runner, perhaps a worker that failed before it started Claude Code. A code review is started only by its first worker, in a config directory that the runner has just created. Nothing on this runner needs changing.`,
            "a code review is started only once",
          )
        );
      if (x) {
        let hostSplit = x.toolConfig.hostSplit;
        ((St = createGovernedGitState(
          process.env,
          getPlatform() === "windows",
          hostSplit
            ? {
                governedHosts: hostSplit.governed,
                directHosts: hostSplit.direct,
                mountBaseUrl: x.mountBaseUrl,
                pushBaseUrl: x.pushBaseUrl,
              }
            : void 0,
          et,
          ze,
        )),
          await z_(buildGitTrustBundle(St, readTrustBundleSource), "build the trust bundle").catch((ce) => {
            onDebug(
              `[runner:session] governed git: the trust bundle could not be built (${errorMessage(ce)}); the runner's own git keeps GIT_SSL_CAINFO`,
            );
          }));
        let X = readServerGitSslVars(q.environment_variables, getPlatform() === "windows"),
          j = "",
          _e = await resolveChildGitEnvironment(
            St,
            { ...X, gitConfigArm: x.toolConfig.gitConfig, serverValueTrustBundlePath: Ct },
            async () => {
              j = (await z_(readGitVersion(), "git --version").catch(() => "")).trim();
              let ce = parseGitVersion(j),
                [rt, tn] = ld;
              return ce !== null && (ce[0] > rt || (ce[0] === rt && ce[1] >= tn));
            },
            (ce, rt) =>
              z_(
                readTrustBundleSource(ce, rt),
                "build the trust bundle from the server's GIT_SSL_CAINFO",
              ).catch(
                (tn) => (
                  onDebug(
                    `[runner:session] governed git: the trust bundle for the session's git could not be built (${errorMessage(tn)}); git inside the session checks the git mount against the moved file alone`,
                  ),
                  { status: "unavailable", reason: "bundle_write_failed" }
                ),
              ),
          );
        wn = _e.answer;
        let Se = formatCertificatesLeftOutWarning([St.trustBundle, _e.trustBundle]);
        if (Se) onStatus(Se);
        for (let ce of formatGovernedGitDecisionWarnings({
          governedHosts: hostSplit?.governed ?? [],
          gitConfigArm: x.toolConfig.gitConfig,
          child: _e.answer.decision,
          childTrustBundle: _e.trustBundle,
          serverSetsCertificateFile: typeof X.serverCertificateFile === "string",
          runnerMountGit: gitTrustDecisionForRole(St, "prep", { url: x.mountBaseUrl, mountRouted: !0 }),
          rawGitVersion: j,
          clientCertificateVariablesSet: ["GIT_SSL_CERT", "GIT_SSL_KEY"].filter(
            (rt) => process.env[rt] !== void 0,
          ),
          hostsCoveredByNoProxy: governedNoProxyHosts(hostSplit, getNoProxy()),
        }))
          onStatus(ce);
      }
      if (
        ((ke = ne.kind === "agent-loop" && !yt ? getIngressTokenTempPrefix(ee, mt) : void 0),
        ne.kind === "tool-server")
      ) {
        for (let M of [getSessionClaudeConfigDir(baseDir, e), ee])
          await withBoundedTimeout(
            rm_3(M, { recursive: !0, force: !0 }),
            Xr,
            `[runner:stuck] rm ${M} (check NFS/CSI mount health)`,
          );
        (await withBoundedTimeout(
          mkdir_4(dirname_4(ee), { recursive: !0, mode: 448 }),
          Sr,
          `[runner:stuck] mkdir ${dirname_4(ee)}`,
        ),
          await withBoundedTimeout(mkdir_4(ee, { mode: 448 }), Sr, `[runner:stuck] mkdir ${ee}`));
      }
      let bt = ke,
        en = (M) => {
          R = !0;
          let X = M.catch(() => {});
          ((resolved_2 = Promise.all([resolved_2, X]).then(() => {})),
            X.then(() => {
              if (It || bt === void 0) return;
              let j = de.current;
              if (!j) return;
              for (let _e of cn())
                resolved = resolved.then(() =>
                  writeSessionIngressTokenFile(_e, j, onStatus, en, tokenFileOpTimeoutMs),
                );
            }));
        };
      if (((Ie = en), bt !== void 0))
        resolved = writeSessionIngressTokenFile(bt, Qe.session_token, onStatus, en, tokenFileOpTimeoutMs);
      (await resolved,
        onDebug(`[runner:session] Epoch fence passed for ${e} (epoch=${We})`),
        (Kn = createDebouncedSender({
          intervalMs: 30000,
          refresh: async () => {
            if (We === void 0 || !de.current) return;
            (await apiClient.heartbeat(q.api_base_url, e, de.current, We, r),
              onDebug(`[runner:session] prep heartbeat sent for ${e}`));
            return;
          },
          onError: (M) => {
            onDebug(`[runner:session] prep heartbeat failed: ${M}`);
          },
          signal: r,
        })));
      let Me = (M) => {
          if (((de.current = M), useAnthropicGitProxy && !$r))
            process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN = M;
          for (let X of cn())
            resolved = resolved.then(() =>
              writeSessionIngressTokenFile(X, M, onStatus, Ie, tokenFileOpTimeoutMs),
            );
        },
        gr = [],
        er = (M, X) => {
          if (We === void 0 || !de.current) return Promise.resolve();
          let j = We,
            _e = de.current,
            Se = X.withDeferred ? gr.splice(0) : [],
            ce = async () => {
              try {
                await apiClient.postWorkerEvents(q.api_base_url, e, _e, j, [...Se, M], r);
              } catch (error) {
                if (isEpochMismatchError(error)) throw error;
                let zt = Se.length > 0 ? ` (${Se.length} deferred step event(s) dropped with it)` : "";
                onDebug(`[runner:session] ${X.kind} event post failed${zt}: ${error}`);
              }
            };
          if (!Wt) return ce();
          let rt = () => (pn === void 0 ? ce() : Promise.resolve());
          if (ns) return rt();
          if (!X.withDeferred) return resolved_3.then(rt);
          return (
            (resolved_3 = resolved_3.then(() =>
              rt().catch((tn) => {
                ((pn = tn), Kn?.cancel());
              }),
            )),
            Promise.resolve()
          );
        },
        xi = (M) => er(makeInitMilestoneMessage(M), { kind: "activity", withDeferred: !0 }),
        Wr = (M, X, j, _e) => er(logEnvManager(M, X, j, _e), { kind: "step", withDeferred: !0 }),
        Fu = (...M) => {
          if (We === void 0 || !de.current) return;
          gr.push(logEnvManager(...M));
        },
        Fi;
      yo = () => {
        Fi = void 0;
      };
      let bo = () =>
          (Fi ??= (async () => {
            let startTime = performance.now(),
              X = de.current;
            return { config: await Qt(e, X, r), armedAt: startTime, presentedToken: X };
          })().catch((M) => {
            onDebug(
              `[runner:session] early /remote re-fetch failed: ${M} \u2014 step 6 re-fetches if the session continues`,
            );
            return;
          })),
        _r = classifySourceRouting(
          q.sources,
          gitSshRewriteHosts,
          gitHostRewrites,
          onDebug,
          yn ? { apiBaseUrl: yn, sessionId: e } : void 0,
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
      (await withBoundedTimeout(
        mkdir_4(se, { recursive: !0 }),
        Sr,
        `[runner:stuck] mkdir ${se} (check NFS/CSI mount health)`,
      ),
        await withBoundedTimeout(
          mkdir_4(ee, { recursive: !0, mode: 448 }),
          Sr,
          `[runner:stuck] mkdir ${ee}`,
        ));
      let Oo = Rc(q.api_base_url);
      if (hostConfig?.notApplied)
        await er(formatHostConfigNotAppliedNotice(e, hostConfig.notApplied), {
          kind: "notice",
          withDeferred: !0,
        });
      try {
        let M =
          ne.kind === "agent-loop"
            ? await seedHostConfigForSession(ee, hostConfig?.snapshot, onDebug, onStatus, Oo)
            : void 0;
        if (M?.outcome === "partial" && hostConfig?.snapshot)
          await er(
            formatHostConfigPartiallyAppliedNotice(
              e,
              hostConfig.snapshot.sourceDir,
              redactSecretsInText(M.error),
            ),
            { kind: "notice", withDeferred: !0 },
          );
      } catch (error) {
        if (isHostConfigSnapshotError(error))
          await Wr("host_config", "failed", redactSecretsInText(error.message), {
            step_label: "Apply runner host config",
          });
        throw error;
      }
      if (configureGitSigningArtifacts !== void 0)
        ((Ue = await materializeSessionGitConfig({
          configDir: ee,
          baseDir: baseDir,
          hookStubs: Yn && !Zn && configureGitHookStubs !== void 0 ? configureGitHookStubs : [],
          signingArtifacts: configureGitSigningArtifacts,
          onDebug: onDebug,
          onStatus: onStatus,
        })),
          (Re = sessionGitConfig(Ue, operatorGitSnapshot, hookGitPrograms)));
      if (x?.toolConfig.gitConfig) {
        await Tc(ht, (governedGitConfigSeed ?? "") + (wn?.fileSeedLines ?? ""));
        let M;
        if (Xn) M = configureGitGovernedEntries(baseDir);
        else if (Yn) {
          if (configureGitHookStubs === void 0 || Ue === void 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: a governed session at capacity>1 needs both the hook stubs and the code-sign artifacts (hook stubs ${configureGitHookStubs === void 0 ? "missing" : "present"}, session copy ${Ue === void 0 ? "not written" : "written"}); the session was stopped rather than run with unsigned commits`,
              "--configure-git: incomplete startup artifacts for a governed session at capacity>1",
            );
          M = Oc(Ue, Zn);
        }
        if (M !== void 0) {
          await rm_3(ht + ".lock", { force: !0 }).catch(() => {});
          try {
            for (let [X, j] of M) await runGit(["config", "--file", ht, "--replace-all", X, j]);
          } catch (error) {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `--configure-git: could not write the commit-signing settings into this session's git config (${ht}): ${errorMessage(error)}. The session was stopped rather than run with unsigned commits. Check that ${join_4(baseDir, "_sessions")} is writable and holds no leftover ${e}.gitconfig.lock`,
              "--configure-git: could not write commit-signing settings into the governed per-session gitconfig",
            );
          }
        }
      }
      let gn = se,
        tr = [],
        Ge = [],
        Rs = await findHook(envSelfHostedRunnerHooksDir, "checkout");
      if (Rs && pushOutcomeOnRelease)
        onStatus(
          `[runner:warn] --push-outcome-on-release does not push repos checked out via the checkout lifecycle hook (${Rs}); use the post-session hook to snapshot those`,
        );
      let Gu,
        Vh = x?.toolConfig.ghPathShim === !0 || x?.toolConfig.gitConfig === !0,
        Hu = q,
        jh,
        zh,
        Xh = [],
        Hi = pt ?? baseDir,
        Jh = !1,
        Zh = !1,
        Bi = async () => {};
      if (_r.length > 0) {
        onDebug(
          `[runner:session] Preparing ${_r.length} git ${_r.length === 1 ? "repository" : "repositories"} (${ze ? "worktree" : "canonical-direct"} mode)`,
        );
        let M = [],
          X = [],
          j = [],
          _e,
          Se,
          ce = [],
          rt = (b) => (Rs ? "hook" : "builtin"),
          zt = !1,
          ds = (b) => (rt(b) !== "builtin" && Rs ? "hook" : "git"),
          found = _r.find((b) => $0r(b.type) && ds(b) === "git"),
          zs = Dc,
          resolved = Promise.resolve(),
          bs = (b) => {
            let le = resolved.then(b);
            return ((resolved = le.catch(() => {})), le);
          },
          Zi = (b) =>
            bs(async () => {
              (await xi(`Preparing ${b}...`),
                await Wr("clone", "started", `Preparing ${b}`, { step_detail: b }));
            }),
          No = (b, le, Ee) => {
            if (!zt) return (Fu("clone", "completed", `Prepared ${le}`, Ee), Promise.resolve());
            return (b.leave(), bs(() => Wr("clone", "completed", `Prepared ${le}`, Ee)));
          },
          Os = se,
          Et = async (b, le) => {
            if (!$0r(b.type)) return;
            let Ee = repoCheckoutDir(Hi, b),
              ot = repoDirSlug(b),
              wt = H0r(b) ?? b.url;
            if (!Ee || !ot)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Source '${b.url}' resolved to an unsafe repo path (slug='${b.repo}'). Check for path traversal in the URL.`,
                "source URL resolved to an unsafe repo path",
              );
            if ((await Zi(b.repo), await le.take())) await bs(() => xi(`Preparing ${b.repo}...`));
            let qt = (Gi.get(Si(b.repo))?.length ?? 0) > 0,
              Le = join_4(Os, ot),
              $t = rt(b),
              Ot = $t === "builtin" ? null : Rs,
              nr = !Ot && !qt && b !== _r[0],
              vr = async () => {
                if (!Ot) return;
                if (Ge.includes(Le)) {
                  onDebug(`[runner:hook] not removing ${Le}: a prepared checkout (in use)`);
                  return;
                }
                let found = Ge.find((Ft) => nfcLower(Ft) === nfcLower(Le));
                if (found !== void 0)
                  return (
                    onDebug(
                      `[runner:hook] not removing ${Le}: same name as prepared checkout ${found} modulo case`,
                    ),
                    Xe.push(Le),
                    {
                      cause: "kept_prepared_twin",
                      warn: `[runner:warn] not removing ${Le} for skipped context source ${b.repo}: same name as the prepared checkout ${found} modulo case (one directory on a case-insensitive filesystem); whatever the hook wrote there may remain visible to this session. Removal is retried when the session ends.`,
                    }
                  );
                let vt = await withBoundedTimeout(
                  rm_3(Le, { recursive: !0, force: !0 }).then(
                    () => {
                      return;
                    },
                    (Ft) => Ft,
                  ),
                  Xr,
                  `[runner:hook] rm -rf ${Le}`,
                );
                if (vt === void 0) return;
                return (
                  Xe.push(Le),
                  {
                    cause: "rm_failed",
                    warn: `[runner:warn] could not remove the partial checkout the hook left for skipped context source ${b.repo} at ${Le} (${errorMessage(vt)}); the session may still be able to read it. Removal is retried when the session ends.`,
                  }
                );
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
                let Ft = void 0,
                  startTime = performance.now();
                if (!1) nt.set(Le, !0);
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
                    clientPlatform: clientPlatform,
                    onStatus: onStatus,
                    onDebug: onDebug,
                    onStderrLine: Ft?.read,
                    signal: r,
                    timeoutMs: n.checkoutHookTimeoutMs ?? Es,
                  });
                let rounded = Math.round(performance.now() - startTime);
                return (
                  Xe.push(Le),
                  await No(le, b.repo, { step_detail: b.repo, ...!1 }),
                  { prepared: Le, src: b }
                );
              }
              let we = ze ? join_4(Os, ot) : Ee,
                vt;
              if (
                (await serializeByKey(canonicalLocks, Ee, async () => {
                  let Ft = nt.get(Ee),
                    qs = { canonical: Ee, repo: b.repo, sessionId: e, onStatus: onStatus },
                    Yu = void 0,
                    $o = !1;
                  if (
                    nr &&
                    $o &&
                    (await lstat_3(join_4(Ee, ".git"))
                      .then((Rr) => (Rr.isDirectory() ? lstat_3(join_4(Ee, ".git", "index")) : Rr))
                      .then(
                        () => !0,
                        (Rr) => getErrnoCode(Rr) !== "ENOENT",
                      ))
                  )
                    nr = !1;
                  let Mo = !1;
                  if ((void 0)?.sanitize || yn || (x && !ze)) {
                    if ((void 0)?.sanitize || (!$o && shouldSanitizeCanonical(onStatus, Ee, U)))
                      (await sanitizeCanonicalRepo(Ee, onDebug, wt), (Mo = !0));
                  } else await runGitConfigLocal(Ee, onDebug, !ze);
                  if (
                    (await prepareRepositories({
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
                          ...(nr && { skippedIfThrottled: nr }),
                          ...!1,
                        },
                      ],
                      alwaysFetch: !0,
                      skipReset: ze,
                      initWithoutTemplate: pt !== void 0,
                      skipValidation: antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM && !ze && Gu === void 0,
                      onDebug: onDebug,
                      onPhase: (Rr, Vn, Po) => {
                        if (We === void 0 || !de.current) return;
                        let Vu = We,
                          ju = de.current,
                          zu = [logCloneStep(b.repo, Rr, Vn, Po)],
                          Qi = () =>
                            pn !== void 0
                              ? Promise.resolve()
                              : apiClient.postWorkerEvents(q.api_base_url, e, ju, Vu, zu, r);
                        (Wt ? resolved_3.then(Qi) : Qi()).catch((Xu) =>
                          onDebug(`[runner:session] prep-phase event post failed: ${Xu}`),
                        );
                      },
                      onProgress: (Rr, Vn) => {
                        let Po = Vn.total !== void 0 ? ` (${Vn.done}/${Vn.total})` : "";
                        er(
                          logEnvManager("clone", "started", `${b.repo} \u2014 ${Vn.label} ${Vn.pct}%${Po}`, {
                            step_detail: b.repo,
                            clone_sub: Rr,
                            progress_label: Vn.label,
                            progress_pct: String(Vn.pct),
                            ...(Vn.done !== void 0 && { progress_done: String(Vn.done) }),
                            ...(Vn.total !== void 0 && { progress_total: String(Vn.total) }),
                          }),
                          { kind: "progress", withDeferred: !1 },
                        ).catch(() => {});
                      },
                      signal: r,
                    }),
                    ze)
                  )
                    await addSessionWorktree({
                      canonicalRepoPath: Ee,
                      worktreePath: we,
                      ref: b.ref,
                      onDebug: onDebug,
                      signal: r,
                      gitEnvironment: b.gitEnvironment,
                    });
                }),
                ze)
              )
                ye.push({ canonicalRepoPath: Ee, worktreePath: we });
              return (await No(le, b.repo, { step_detail: b.repo }), { prepared: we, src: b, handOver: vt });
            } catch (error) {
              if (
                error instanceof FetchRefNotFoundError ||
                (error instanceof CheckoutHookFailedError && NVn(error.message))
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
                      sads: Ft ? [go[Ft.cause].sad] : [],
                      step:
                        `Skipped ${b.repo} \u2014 source ref ${vt} no longer exists on remote; continuing without this context repo` +
                        (Ft ? go[Ft.cause].note : ""),
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
                  error: error,
                  skipped: {
                    repo: b.repo,
                    sads: ["context_source_checkout_hook_failed", ...(vt ? [go[vt.cause].sad] : [])],
                    step:
                      `Skipped ${b.repo} \u2014 its checkout hook ${error.telemetryMessage}; continuing without this context repo` +
                      (vt ? go[vt.cause].note : ""),
                  },
                };
              }
              if (
                !Ot &&
                !qt &&
                error instanceof RepositoryAccessError &&
                error.denial !== void 0 &&
                !r.aborted
              ) {
                let vt = b.getAuthToken ? (b.governedMount ? "git mount" : "git proxy") : void 0,
                  Ft = REPO_ACCESS_FAILURE_LABELS[error.denial];
                return (
                  onStatus(
                    `[runner:warn] could not access context source ${b.repo} (${Ft}; auth: ` +
                      (vt ? `session token via the ${vt}` : "this runner's own git credentials") +
                      "); not a work repo (no push_targets entry), skipping it: " +
                      redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
                  ),
                  {
                    error: error,
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
                  }
                );
              }
              if (
                nr &&
                (error instanceof RepositoryAccessError || error instanceof FetchThrottledError) &&
                error.throttle !== void 0 &&
                !r.aborted
              )
                return (
                  onStatus(
                    `[runner:warn] could not read context source ${b.repo} (told to try again later: ${FETCH_REFUSAL_REASONS[error.throttle]}); not a work repo (no push_targets entry), skipping it: ` +
                      redactSecretsInText(error.message).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " | "),
                  ),
                  {
                    error: error,
                    skipped: {
                      repo: b.repo,
                      sads: ["context_source_throttled"],
                      step:
                        `Skipped ${b.repo} \u2014 after several tries this runner was ` +
                        "still told to try again later; a rate limit is the usual cause. This session runs without it. It is tried again the next time this session starts.",
                      skipKind: "context_source_throttled",
                      skipReason: error.throttle,
                    },
                  }
                );
              throw classifySourcePrepFailure(error);
            }
          },
          bn = (b) => {
            if (b === void 0) return;
            if ("skipped" in b) {
              if ((ce.push(b.skipped), (_e ??= b.error), b.skipped.skipKind === "context_source_throttled"))
                Se ??= b.error;
              return;
            }
            if ((Ge.push(b.prepared), M.push(b.src.repo), X.push(b.src), j.push(b.src.url ?? ""), b.handOver))
              xn.push(b.handOver);
          };
        if (zt)
          (
            await runWithSlots(
              _r.map(ds),
              { git: zs, hook: Lc },
              (le, Ee) => Et(_r[le], Ee),
              isEpochMismatchError,
            )
          ).forEach(bn);
        else for (let b of _r) bn(await Et(b, Uc));
        if (Ge.length === 0 && _e) throw classifySourcePrepFailure(Se ?? _e);
        for (let b of ce) {
          for (let sad of b.sads) logFeatureSad("self_hosted_session_handle", sad);
          await Wr("clone", "completed", b.step, {
            step_detail: b.repo,
            ...(b.skipKind && { skip_kind: b.skipKind }),
            ...(b.skipReason && { skip_reason: b.skipReason }),
          });
        }
        if ((await Wr("clone", "completed", "Finished preparing sources"), Kt.start(), bo(), yn)) {
          let origin = new URL(yn).origin;
          for (let le = 0; le < Ge.length; le++) {
            if (!X[le]?.getAuthToken) continue;
            if (Xe.includes(Ge[le])) continue;
            (qe.push({ path: Ge[le], origin: origin }), await setCredentialHelper(Ge[le], yn, onDebug, r));
          }
        }
        if ((Kt.mark("runner_prep_git_proxy_config_ms"), x)) {
          let b = new Set(),
            le = [],
            Ee = [],
            ot = [],
            wt = [],
            qt;
          for (let Le = 0; Le < Ge.length; Le++) {
            let $t = X[Le],
              Ot = $t && H0r($t);
            if (!$t || !Ot) continue;
            if (Xe.includes(Ge[Le])) continue;
            let vr = ye.find((we) => we.worktreePath === Ge[Le])?.canonicalRepoPath ?? Ge[Le];
            if (b.has(vr)) continue;
            if (
              (b.add(vr), wt.push(await getRemoteOriginUrls(vr, Ot, onDebug, r)), $t.fetchViaMount && $t.url)
            ) {
              if (ze) {
                le.push($t.repo);
                continue;
              }
              if (qt === void 0) {
                let trimmed = (await z_(readGitVersion(), "git --version").catch(() => "")).trim(),
                  vt = parseGitVersion(trimmed),
                  [Ft, qs] = Md;
                qt = { raw: trimmed, ok: vt !== null && (vt[0] > Ft || (vt[0] === Ft && vt[1] >= qs)) };
              }
              if (!qt.ok) {
                Ee.push($t.repo);
                continue;
              }
              (ot.push($t.repo), Nt.push({ path: vr, mountUrl: $t.url, mountBaseUrl: x.mountBaseUrl }));
              try {
                await setHostCredentialHelper(vr, $t.url, Ot, x.mountBaseUrl, onDebug, r);
              } catch (error) {
                throw (logFeatureBad("self_hosted_governed_mount_read", "config_write_failed"), error);
              }
            }
          }
          if (wt.includes("not_upstream")) logFeatureSad("self_hosted_governed_origin_check", "not_upstream");
          else if (wt.includes("read_failed"))
            logFeatureSad("self_hosted_governed_origin_check", "read_failed");
          else if (wt.length > 0) logFeatureOk("self_hosted_governed_origin_check");
          if (le.length > 0)
            (onStatus(
              `[runner:warn] governed git: ${le.join(", ")} ${plural(le.length, "is", "are")} outside the runner's list of directly reachable upstreams, but at --capacity ${capacity} sessions share one git config per repository, so ${plural(le.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Run with --capacity 1 to route such fetches through the mount.`,
            ),
              logFeatureSad("self_hosted_governed_mount_read", "skipped_capacity_gt1"));
          else if (Ee.length > 0)
            (onStatus(
              `[runner:warn] governed git: ${Ee.join(", ")} ${plural(Ee.length, "is", "are")} outside the runner's list of directly reachable upstreams, but this machine's git (${qt?.raw || "version not readable"}) could not be confirmed as ${Md.join(".")} or newer, which the mount's path-scoped credential needs, so ${plural(Ee.length, "its", "their")} in-session fetches are NOT routed through the git mount and will fail unless this machine can reach the upstream host. Upgrade git to route such fetches through the mount.`,
            ),
              logFeatureSad("self_hosted_governed_mount_read", "skipped_git_too_old"));
          else if (ot.length > 0)
            (onStatus(
              `[runner:session] governed git: ${ot.join(", ")} ${plural(ot.length, "is", "are")} fetched through the git mount for ${e} (not directly reachable from this runner) \u2014 origin keeps its upstream URL; a repo-local insteadOf sends in-session fetches to the mount with the session token`,
            ),
              logFeatureOk("self_hosted_governed_mount_read"));
        }
        if (x?.pushBaseUrl !== void 0) {
          let b = [],
            le = new Set(),
            Ee = 0;
          for (let ot = 0; ot < Ge.length; ot++) {
            let wt = X[ot];
            if (!wt?.governedMount || !wt.upstreamUrl) continue;
            if (Xe.includes(Ge[ot])) continue;
            if (!wt.governedPushUrl) {
              Ee++;
              continue;
            }
            let Le = ye.find(($t) => $t.worktreePath === Ge[ot])?.canonicalRepoPath ?? Ge[ot];
            if (le.has(Le)) continue;
            (le.add(Le),
              b.push({
                canonicalPath: Le,
                mountPath: wt.governedPushUrl.slice(x.pushBaseUrl.length + 1),
                upstreamUrl: wt.upstreamUrl,
              }));
          }
          if (Ee > 0) logFeatureSad("self_hosted_governed_push_url", "host_not_github");
          if (b.length === 0);
          else if (ze)
            (onStatus(
              `[runner:warn] governed git: the work item carries a git-mount push URL but this runner runs with --capacity ${capacity} (per-session worktrees share one canonical git config), so the push URL is NOT applied and session pushes keep going to the upstream remote. Run with --capacity 1 to route session pushes through the git mount.`,
            ),
              logFeatureSad("self_hosted_governed_push_url", "skipped_capacity_gt1"));
          else {
            let ot = reconcileGovernedPushUrls({
              sessionId: e,
              pushBaseUrl: x.pushBaseUrl,
              wirings: b,
              getCurrentToken: () => de.current,
              onStatus: onStatus,
              onDebug: onDebug,
              signal: r,
            });
            Zt = ot;
            try {
              await ot.apply();
            } catch (error) {
              throw (logFeatureBad("self_hosted_governed_push_url", "config_write_failed"), error);
            }
            (onStatus(
              `[runner:session] governed git: push URL ACTIVE for ${e} \u2014 session git pushes go through the ` +
                `git mount (${b.length} ${plural(b.length, "repository", "repositories")}, origin ${new URL(x.pushBaseUrl).origin})` +
                (Nt.length > 0 ? "" : "; fetches stay on the upstream remote"),
            ),
              logFeatureOk("self_hosted_governed_push_url"));
          }
        }
        (await Bi(), Kt.mark("runner_prep_reset_remote_ms"));
        for (let b = 0; b < Ge.length; b++) {
          let le = Gi.get(Si(M[b]));
          if (!le || le.length === 0) continue;
          let [Ee, ...ot] = le,
            found = ye.find((Ot) => Ot.worktreePath === Ge[b]),
            qt = found?.canonicalRepoPath ?? Ge[b],
            Le = !1;
          if (ot.length > 0 && !Le) {
            let Ot = X[b],
              nr = Ot?.getAuthToken && !Xe.includes(Ge[b]);
            await fetchOutcomeBranches(
              Ge[b],
              ot,
              onDebug,
              r,
              void 0,
              j[b].startsWith("file://"),
              yn && nr ? Ot.url : void 0,
              Ot?.governedMount && nr ? { url: Ot.url, getToken: Ot.getAuthToken } : void 0,
              Ot?.governedMount && nr ? Ot.gitEnvironment : void 0,
            );
          }
          let $t;
          if (pushOutcomeOnRelease && mt > 1 && !Le && !Xe.includes(Ge[b])) {
            if (await resumePushOnRelease(qt, Ee, X[b], _s, onDebug, r, X[b].gitEnvironment))
              $t = `refs/remotes/origin/${Ee}`;
          }
          if (!Le)
            await fetchSourceBranch(
              Ge[b],
              Ee,
              onDebug,
              r,
              !!useAnthropicGitProxy || (Tt.has(qt) && "checkout"),
              $t,
              void 0,
              X[b].gitEnvironment,
            );
          if (Xe.includes(Ge[b])) continue;
          V.push({
            canonicalPath: qt,
            branch: Ee,
            needsDetach: !found,
            createdSha: pushOutcomeOnRelease && !Le ? await revParseVerify(qt, `refs/heads/${Ee}`) : void 0,
            source: X[b],
          });
        }
        (Kt.mark("runner_prep_outcome_branch_ms"), Cr.push(...Ge));
      } else await Bi();
      if ((Kt.start(), bo(), ({ childCwd: gn, addDirs: tr } = chooseChildCwd(se, Ge, q.cwd, yt)), q.cwd)) {
        let M = resolveInside(se, q.cwd);
        if (!(
          M !== null &&
          (await withBoundedTimeout(
            ensureDirsNoSymlinks(se, M),
            Sr,
            `[runner:stuck] mkdir ${M} (check NFS/CSI mount health)`,
          ).catch(() => !1)) &&
          (await withBoundedTimeout(
            isRealpathInside(se, M),
            Hln,
            `[runner:stuck] realpath ${M} (check NFS/CSI mount health)`,
          ).catch(() => !1))
        ))
          (onDebug(
            `[runner:session] config.cwd=${q.cwd} rejected (not under ${se}, a segment is a symlink, or fs op timed out)`,
          ),
            ({ childCwd: gn, addDirs: tr } = chooseChildCwd(se, Ge, void 0, yt)));
      }
      let Qh = void 0;
      if (tr.length > 0) onDebug(`[runner:session] cwd=${gn} + ${tr.length} --add-dir`);
      (checkSessionDirOutsideWriteScope(ee, "config dir", gn, tr),
        checkSessionDirOutsideWriteScope(Gr, "stage-file root", gn, tr),
        checkSessionDirOutsideWriteScope(pr, "diff copy root", gn, tr),
        checkSessionDirOutsideWriteScope(Or, "gh route dir", gn, tr));
      let Gs =
        hostConfig?.snapshot?.storage.mode === "disk" ? hostConfig.snapshot.storage.snapshotDir : void 0;
      if (Gs !== void 0) checkSessionDirOutsideWriteScope(Gs, "host config snapshot dir", gn, tr);
      let Hs = [],
        Bs = !1,
        Wi = !1,
        Ki = {};
      if (confineRepoSettings !== "off") {
        try {
          Hs = await checkRepoCommittedSettings(gn, Ge, Ki);
        } catch (error) {
          if (confineRepoSettings === "warn") {
            let _e = error instanceof Error ? error.message : String(error),
              Se = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            (onStatus(`[runner:confine] WARN (would refuse): ${_e}`),
              logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_warn", {
                confine_kind: fromEnum(Se),
              }),
              (Bs = !0),
              (Wi = !0));
          } else {
            let _e = error instanceof RepoSettingsRejectedError ? error.entry.kind : "unknown";
            throw (
              logFeatureBad("self_hosted_confine", "self_hosted_confine_scan_threw_enforce", {
                confine_kind: fromEnum(_e),
              }),
              error
            );
          }
        }
        let M = [...tr, ...Hs.map((j) => j.path)],
          X = () => {
            if (
              (checkSessionDirOutsideWriteScope(ee, "config dir", gn, M),
              checkSessionDirOutsideWriteScope(Gr, "stage-file root", gn, M),
              checkSessionDirOutsideWriteScope(pr, "diff copy root", gn, M),
              checkSessionDirOutsideWriteScope(Or, "gh route dir", gn, M),
              Gs !== void 0)
            )
              checkSessionDirOutsideWriteScope(Gs, "host config snapshot dir", gn, M);
          };
        if (confineRepoSettings === "warn")
          try {
            X();
          } catch (error) {
            let _e = error instanceof Error ? error.message : String(error);
            (onStatus(`[runner:confine] WARN (would refuse under enforce): ${_e}`),
              logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_warn"),
              (Bs = !0));
          }
        else
          try {
            X();
          } catch (error) {
            throw (
              logFeatureBad("self_hosted_confine", "self_hosted_confine_overlap_enforce"),
              tagFailureStage(error, "SETUP_FAILURE_KIND_REPO_SETTINGS_REJECTED")
            );
          }
      }
      if (Hs.length > 0) {
        let M = (Se) => Se,
          X = new Set(),
          j = !1;
        for (let Se of [gn, ...tr]) {
          (X.add(M(Se)), X.add(M(Se.normalize("NFC"))));
          let ce = await z_(
            realpath(Se).catch((rt) => {
              j ||= !isPathAbsent(rt);
              return;
            }),
            `realpath ${Se}`,
          );
          if (ce !== void 0) (X.add(M(ce)), X.add(M(ce.normalize("NFC"))));
        }
        let _e = (Se) => {
          for (let ce of X) if (Se === ce || Se.startsWith(ce.endsWith(sep_3) ? ce : ce + sep_3)) return !0;
          return !1;
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
              (onStatus(`[runner:confine] WARN (would refuse): ${ce.message}`),
                logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_warn"),
                (Bs = !0));
              continue;
            }
            throw (
              logFeatureBad("self_hosted_confine", "self_hosted_confine_violation_enforce"),
              j ? tagFailureStage(ce, "SETUP_FAILURE_KIND_FILESYSTEM_ERROR") : ce
            );
          }
      }
      if (confineRepoSettings !== "off" && !Bs) logFeatureOk("self_hosted_confine");
      if (
        (checkSessionDirOutsideWriteScope(
          ee,
          "config dir",
          getClaudeTempDirRealpath().replace(/[/\\]$/, ""),
          [claudeTempDir(), getChildProcessTmpDirRealpath().replace(/[/\\]$/, "")],
        ),
        Kt.mark("runner_prep_repo_settings_ms"),
        trustWorkspace)
      ) {
        let M = {};
        for (let _e of new Set([gn, ...Ge, ...ye.map((Se) => Se.canonicalRepoPath)])) {
          let Se = normalize(_e),
            ce = await z_(
              realpath(_e).catch(() => {
                return;
              }),
              `realpath ${_e}`,
            );
          for (let rt of [Se, Se.normalize("NFC"), ...(ce !== void 0 ? [ce, ce.normalize("NFC")] : [])])
            M[rt] = { hasTrustDialogAccepted: !0 };
        }
        let X = await jsonStringify({
            ...(ne.kind === "agent-loop" &&
              hostConfig?.snapshot?.mcpServers && { mcpServers: hostConfig.snapshot.mcpServers }),
            projects: M,
          }),
          j = join_4(ee, `.claude${Oo}.json`);
        (await withBoundedTimeout(
          writeSessionFileAtomically(ee, `.claude${Oo}.json`, X, 384),
          Sr,
          `[runner:stuck] write ${j} (check NFS/CSI mount health)`,
        ).catch((_e) => {
          if (isHostConfigSnapshotError(_e)) onStatus(`[runner:error] ${_e.message}`);
          throw _e;
        }),
          onDebug(`[runner:session] Seeded persisted trust for ${Object.keys(M).length} path(s) in ${j}`));
      }
      let Yi = Sc;
      if (q.mcp_config?.content) {
        let str = Buffer.from(q.mcp_config.content, "base64").toString("utf-8");
        ((P = join_4(ee, "mcp-config.json")),
          await z_(unlink_2(P), `unlink ${P}`).catch(() => {}),
          await z_(writeFile_2(P, str, { flag: "wx", mode: 384 }), `writeFile ${P}`),
          onDebug(`[runner:session] Wrote MCP config to ${P} (${str.length} bytes)`),
          (Yi = str));
      }
      let Vi = join_4(ee, MCP_CONFIG_DELIVERED_JSON);
      be.push(Vi);
      let ji = { cancelled: !1 };
      (await withBoundedTimeout(
        writeSessionFileAtomically(ee, MCP_CONFIG_DELIVERED_JSON, Yi, 384, ji),
        Sr,
        `[runner:stuck] write ${Vi} (check NFS/CSI mount health)`,
      ).catch((M) => {
        if (((ji.cancelled = !0), isHostConfigSnapshotError(M))) onStatus(`[runner:error] ${M.message}`);
        throw M;
      }),
        Kt.mark("runner_prep_config_seed_ms"),
        onDebug(
          isCcrAutoModeApplySet(q)
            ? `[runner:session] ${e}: the server asked this runner to apply the auto mode lists it sends (${CCR_AUTO_MODE_APPLY}=1 in /remote)`
            : `[runner:session] ${e}: the server did not ask this runner to apply the auto mode lists it sends (no ${CCR_AUTO_MODE_APPLY}=1 in /remote), so none is read; nothing on this runner needs changing`,
        ));
      let os = applyAutoModePreset(autoModeConfigHandler(q), serverAutoModeLists),
        zi = serverAutoModeLists === NO_ALLOW,
        included = os.withheld.includes("allow");
      if (os.withheld.length > 0) {
        let mapped = os.withheld.map((j) => `autoMode.${j}`),
          X =
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
      let Kr = readServerAutoModeRules(os.carried);
      for (let statusLine of Kr.statusLines) onStatus(`[runner:warn] ${e}: ${statusLine}`);
      let is = !1;
      if (q.launcher_hooks !== void 0 || Kr.autoMode !== void 0) {
        let M = await writeLauncherSettings(
          ee,
          { hooks: q.launcher_hooks === void 0 ? [] : q.launcher_hooks, autoMode: Kr.autoMode },
          re,
          onDebug,
          onStatus,
        );
        if (M) ((Z = M.settingsPath), (is = M.autoModeWritten));
        if (
          yt &&
          q.launcher_hooks !== void 0 &&
          !(Array.isArray(q.launcher_hooks) && q.launcher_hooks.length === 0) &&
          M?.hooksRegistered !== !0
        )
          throw (
            logFeatureBad("self_hosted_review_session", "launcher_hooks"),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Session ${e} is a code review and is not started: the launcher hooks that the service sent for it could not be set up, and a code review does not go on without them. The [runner:session] line before this one says why.`,
              "a code review is not started without the hooks that the service sent for it",
            )
          );
        if (M?.hooksRegistered)
          if (Ki.repoDisablesAllHooks && !yt)
            (onStatus(
              "[runner:session] launcher_hooks materialized, but a repo .claude/settings.json or settings.local.json carries disableAllHooks:true \u2014 the child will drop every flagSettings hook (CCR-supplied Stop reply-gate included)",
            ),
              logFeatureSad(
                "self_hosted_launcher_hooks",
                "self_hosted_launcher_hooks_disabled_by_repo_disableAllHooks",
              ));
          else if (Wi)
            logFeatureSad("self_hosted_launcher_hooks", "self_hosted_launcher_hooks_confine_scan_aborted");
          else logFeatureOk("self_hosted_launcher_hooks");
      }
      let ks = { ...Kr.refusedCounts, allow_withheld_by_setting: included };
      if (!is && Kr.autoMode !== void 0)
        logFeatureBad("self_hosted_auto_mode_lists", "settings_too_large", ks);
      else if (Kr.grantsWithheld)
        if (is) logFeatureSad("self_hosted_auto_mode_lists", "grants_withheld", ks);
        else logFeatureBad("self_hosted_auto_mode_lists", "grants_withheld", ks);
      else if (Kr.statusLines.length > 0)
        if (is) logFeatureSad("self_hosted_auto_mode_lists", "list_ignored", ks);
        else logFeatureBad("self_hosted_auto_mode_lists", "all_lists_ignored", ks);
      else if (os.withheld.length > 0 && !zi)
        logFeatureSad("self_hosted_auto_mode_lists", "operator_withheld", {
          allow_withheld_by_setting: included,
        });
      else if (os.withheld.length > 0 || is)
        logFeatureOk("self_hosted_auto_mode_lists", {
          allow_withheld_by_setting: included,
          lists_written: is,
        });
      if (r.aborted)
        return (
          onDebug(`[runner:session] Aborted after git prep for ${e} \u2014 bailing before spawn`),
          { result: "abandoned" }
        );
      let Ts,
        as = new Map(),
        Xi = new Map(),
        ys = !1,
        qi =
          jsonStringify({
            type: "control_request",
            request_id: `runner-session-gone-${e}`,
            request: { subtype: "end_session", reason: "session_not_found" },
          }) +
          `
`,
        Ws = (M, X) => {
          if (!co(M)) return !1;
          if (ys) return !0;
          return (
            (ys = !0),
            onStatus(
              `[runner:session] ${e} ${X} says session gone server-side \u2014 sending end_session to child`,
            ),
            Ts?.(qi),
            !0
          );
        },
        Ks = async (M, X) => {
          let governed_git = M.governed_git;
          if ((await Zt?.reconcile(governed_git, X), fn !== void 0 && x?.directUpstreams !== void 0)) {
            let _e = governed_git === void 0 || governed_git.git_mount_push_base_url !== void 0,
              Se = governed_git === void 0 ? void 0 : Dn(M.sources, x.mountBaseUrl, x.directUpstreams);
            await z_(
              fn.reconcile({
                ...(_e && {
                  push: { baseUrl: isLoopbackUrl(governed_git?.git_mount_push_base_url, onDebug) },
                }),
                ...(Se !== void 0 && { fetchLines: Se }),
                presentedToken: X,
              }),
              "session git rules rewrite",
            ).catch((ce) => {
              onDebug(`[runner:session] session git rules: ${errorMessage(ce)} (ignored)`);
            });
          }
          if (governed_git !== void 0 && governed_git.rest_mount_base_url === void 0) return;
          await Je?.reconcile(
            isLoopbackUrl(governed_git?.rest_mount_base_url, onDebug, BAD_REST_MOUNT_WARNING),
            X,
          );
        },
        Bu = async (M, X) => {
          de.current = M;
          let j = X === void 0 ? null : decodeSessionJwt(X),
            _e = governedPushRepresentRetryMs * $f,
            Se = j === null ? _e : Math.max(0, Math.min(_e, j * 1000 - Date.now() - Mf)),
            ce = await retryGitOperation({
              represent: () =>
                de.current === M ? Qt(e, M, any) : Promise.reject(Error("a newer session token is in use")),
              isTransient: (zt) => de.current === M && isRetryableRunnerError(zt),
              retryDelayMs: governedPushRepresentRetryMs,
              deadlineMs: Se,
              signal: any,
              onDebug: onDebug,
            });
          if (any.aborted) return;
          if (de.current !== M) return;
          if (ce.outcome === "presented") {
            (hn?.cancel(), (hn = void 0), await Ks(ce.config, M));
            return;
          }
          if (ce.reason === "permanent" && Ws(ce.error, "/remote (token re-present)")) return;
          if (
            (onStatus(
              `[runner:warn] governed git: could not re-present the refreshed session token on /remote for ${e} (${ce.reason === "budget" ? "still failing when the retry budget ran out" : "the request was refused"}); the child gets the token anyway. Session traffic through CCR's mounts (git pushes and fetches, gh writes) may be refused (git_token_mismatch) until a /remote call with this token succeeds` +
                (ce.reason === "budget" ? " \u2014 retrying in the background." : "."),
            ),
            Zt !== void 0)
          )
            logFeatureSad("self_hosted_governed_push_url", "represent_failed");
          if (Nt.length > 0) logFeatureSad("self_hosted_governed_mount_read", "represent_failed");
          if (Je !== void 0) logFeatureSad("self_hosted_governed_gh_route", "represent_failed");
          if (fn !== void 0) logFeatureSad("self_hosted_session_git_rules", "represent_failed");
          if ((hn?.cancel(), (hn = void 0), ce.reason !== "budget")) return;
          let rt = void 0,
            tn = () => {
              if ((rt?.cancel(), hn === rt)) hn = void 0;
            };
          ((rt = createDebouncedSender({
            intervalMs: governedPushRepresentRetryMs * 4,
            errorRetryMs: governedPushRepresentRetryMs * 4,
            signal: any,
            refresh: async () => {
              let zt = de.current,
                ds = await Qt(e, zt, any);
              if (any.aborted) return;
              if (zt === de.current)
                (tn(),
                  onStatus(
                    `[runner:session] governed git: refreshed session token re-presented on /remote for ${e}`,
                  ),
                  await Ks(ds, zt));
              return;
            },
            onError: (zt) => {
              if (any.aborted) return;
              if (Ws(zt, "/remote (token re-present)")) {
                tn();
                return;
              }
              if (!isRetryableRunnerError(zt)) {
                (tn(),
                  onStatus(
                    `[runner:warn] governed git: background re-present of the session token for ${e} refused: ${errorMessage(zt)}; giving up until the next scheduled /remote read`,
                  ));
                return;
              }
              onDebug(
                `[runner:session] governed git: background /remote re-present failed: ${errorMessage(zt)}; retrying`,
              );
            },
          })),
            (hn = rt));
        },
        Wu = (M) => {
          (Me(M),
            (Yt.previous = Yt.current),
            (Yt.current = M),
            qn(M),
            warnTokenUpdateNotAcked({ pendingAcks: as, sessionId: e, onStatus: onStatus }),
            deliverRefreshedToken({
              write: Ts,
              envVar: "CLAUDE_CODE_SESSION_ACCESS_TOKEN",
              token: M,
              sessionId: e,
              label: "session_token",
              onStatus: onStatus,
              pendingAcks: as,
            }));
        },
        Co = getJwtExpiry({
          getAccessToken: async () => {
            let M = de.current,
              X;
            try {
              ({ token: X } = await apiClient.refreshToken(M));
            } catch (error) {
              if (Ws(error, "refreshToken")) Co.cancel(e);
              throw error;
            }
            if (de.current !== M) return;
            if (Zt !== void 0 || Nt.length > 0 || Je !== void 0 || fn !== void 0) {
              if ((await Bu(X, M), de.current !== X)) return;
            }
            return X;
          },
          onRefresh: (M, X) => Wu(X),
          label: "self-hosted-runner-session",
        });
      if (Q === void 0) Co.schedule(e, de.current);
      let sn, Ji;
      try {
        Kt.lap();
        let M = await bo();
        if (Wt && pn !== void 0) throw pn;
        let X = M === void 0 ? void 0 : Math.round(performance.now() - M.armedAt),
          j,
          _e;
        if (M !== void 0 && X !== void 0 && X <= $d) ((j = M.config), (_e = M.presentedToken));
        else {
          if (X !== void 0)
            onDebug(
              `[runner:session] early /remote result is ${X}ms old (> ${$d}ms) \u2014 re-fetching for a fresh inference token`,
            );
          j = await retryWithBackoff(() => ((_e = de.current), Qt(e, _e, r)), {
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            signal: r,
            ...(Wt && { shouldRetry: () => pn === void 0 }),
            onRetry: (Et, bn) => {
              onDebug(`[runner:session] /remote re-fetch attempt ${Et} failed: ${bn}. Retrying.`);
            },
          });
        }
        if (j) {
          if (isReviewOriginSession(j) !== yt)
            throw (
              logFeatureBad("self_hosted_review_session", "marker_changed"),
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `Session ${e}: two /remote responses disagree on whether it is a code review (a server-side fault: nothing on this runner needs changing)`,
                "two /remote responses disagree on whether the session is a code review",
              )
            );
          q = j;
          let Et = agentProxyStandaloneRefusal({
            sessionId: e,
            serverEnv: q.environment_variables,
            runnerProxyUrl: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
            runnerProxySetting: RUNNER_AGENT_PROXY_URL_SETTING,
            governedGit: x?.toolConfig.gitConfig === !0 || x?.toolConfig.ghPathShim === !0 ? "on" : "off",
            egressListener: isEgressProxyActive() !== void 0,
            gitConfigArmed: x?.toolConfig.gitConfig === !0,
          });
          if (Et) throw (onStatus(`[runner:error] ${Et.message}`), (nn = !0), Et);
          (onDebug(
            `[runner:session] Re-fetched /remote for fresh inference token (expires_in=${q.inference_auth?.expires_in_seconds}s)`,
          ),
            await Ks(q, _e));
        } else
          onDebug(
            "[runner:session] /remote re-fetch failed after retries \u2014 using stale step-2 token. Interval refresher will converge.",
          );
        Kt.mark("runner_prep_remote_refetch_ms");
        let Se = [],
          hasOwn = Object.hasOwn(
            await writeSystemPromptFile({
              args: Se,
              claudeCodeArgs: q.claude_code_args,
              configDir: ee,
              stagedPaths: be,
              childIsOwnBinary: xe,
              onDebug: onDebug,
            }),
            APPEND_SUBAGENT_SYSTEM_PROMPT,
          );
        if (
          (await writeSessionAgentsFile({
            args: Se,
            agentFiles: q.agent_files ?? [],
            serverAgentsArg: q.claude_code_args.agents,
            configDir: ee,
            stagedPaths: be,
            onDebug: onDebug,
          }),
          debugTokenDir && q.inference_auth?.access_token)
        )
          writeBestEffort(debugTokenDir, `inference_token_${e}.txt`, q.inference_auth.access_token, onStatus);
        let rt = void 0,
          tn = createDebouncedSender({
            intervalMs: tokenRefreshIntervalMs(q.inference_auth?.expires_in_seconds),
            ttlMs: Kd(q.inference_auth?.expires_in_seconds),
            ...TOKEN_REFRESH_TIMING,
            isTransient: Qc,
            refresh: async () => {
              if (Q !== void 0) return;
              let Et = de.current,
                bn = rt?.onRemoteCallStarted(),
                b = await Qt(e, Et, r, { timeoutMs: SESSION_POLL_MS });
              (bn?.(), await Ks(b, Et));
              let le = b.inference_auth?.access_token;
              if (!le) throw new RemoteConfigWithoutInferenceAuthError();
              (warnTokenUpdateNotAcked({ pendingAcks: as, sessionId: e, onStatus: onStatus }),
                deliverRefreshedToken({
                  write: Ts,
                  envVar: "CLAUDE_CODE_OAUTH_TOKEN",
                  token: le,
                  sessionId: e,
                  label: "inference_token",
                  onStatus: onStatus,
                  expiresInSeconds: b.inference_auth?.expires_in_seconds,
                  pendingAcks: as,
                }));
              let Ee = b.inference_auth?.expires_in_seconds;
              return {
                intervalMs: tokenRefreshIntervalMs(Ee),
                ttlMs: Kd(Ee),
                nextInMs: rt?.takeFollowUpInMs(),
              };
            },
            onError: (Et, bn) => {
              if (Ws(Et, "/remote")) {
                tn.cancel();
                return;
              }
              let b =
                  bn.delayMs >= 120000
                    ? `${Math.round(bn.delayMs / 60000)}m`
                    : `${Math.round(bn.delayMs / 1000)}s`,
                le = bn.transient
                  ? `Retrying shortly (in ${b})`
                  : `Not retrying early (${Et instanceof RemoteConfigWithoutInferenceAuthError ? "CCR answered without an inference token" : `HTTP ${getHttpStatus(Et) ?? "none"}: the request or the session, not the network, is the problem`}); next scheduled attempt in ${b}`,
                Ee = bn.expired
                  ? " The child's current token has expired or is within a minute of expiring; its turns will fail until a refresh succeeds."
                  : "";
              onStatus(`[runner:session] inference_token refresh failed for ${e}: ${Et}. ${le}.${Ee}`);
            },
            signal: r,
          }),
          zt,
          ds = (Et, { force: bn } = { force: !1 }) => {
            let refreshNow = tn.refreshNow({ force: bn });
            if (refreshNow === "fired")
              return (
                onStatus(
                  `[runner:session] ${Et} for ${e} \u2014 requesting a fresh inference_token from CCR now`,
                ),
                refreshNow
              );
            return (
              onDebug(
                `[runner:session] ${Et} for ${e} \u2014 ${refreshNow === "in_flight" ? "an inference_token refresh is already in progress" : refreshNow === "debounced" ? `an inference_token refresh started under ${TOKEN_REFRESH_TIMING.minRefreshGapMs / 1000}s ago; not starting another` : "the session is ending; not refreshing"}`,
              ),
              refreshNow
            );
          },
          Ku = await withBoundedTimeout(
            lt ?? Promise.resolve(void 0),
            CHECKOUT_DISPLAY_LIMIT,
            "startup probe",
          ).catch(() => {
            return;
          }),
          js = !1,
          zs,
          Xs,
          bs,
          Zi,
          No = void 0,
          Os;
        try {
          if ((await vs(), await Wr("start_cc", "started", "Starting Claude Code"), Wt)) await rs();
          (await vs(), r.throwIfAborted(), Kn?.cancel(), Br(), (Lt = !0));
          let Et = void 0;
          ((zs =
            ne.kind === "agent-loop" && ke !== void 0
              ? startGuestVitals({
                  sessionId: e,
                  apiBaseUrl: new URL(isLocalhostUrl(q.api_base_url, e).sdkUrl).origin,
                  tokenFilePath: ke,
                  binaryResolution: "pinned",
                  log: onDebug,
                })
              : void 0),
            (Yt.current = de.current),
            qn(Yt.current));
          let bn;
          if ((spawnedSessionIds?.add(e), yt)) (($r = !0), env.unset("CLAUDE_CODE_SESSION_ACCESS_TOKEN"));
          ((sn = await runSessionChild({
            execPath: execPath,
            execArgs: execArgs,
            updatedChildBin: updatedChildBin,
            childUpdateBin: js || yt ? void 0 : childUpdateBin,
            onChildUpdateReady: js || yt ? void 0 : onChildUpdateReady,
            config: q,
            inPrivateCheckout: js,
            sessionId: e,
            sessionToken: de.current,
            child: ne,
            trustWorkspace: trustWorkspace === !0,
            ghRoutePath: Je?.path,
            ghRouteBasePath: Je?.basePath,
            sessionGitRulesPath: fn && Ar,
            runnerStartupTiming: Et,
            ...!1,
            capacity: capacity,
            healthPort: healthPort,
            clientPlatform: clientPlatform,
            cwd: gn,
            configDir: ee,
            diffFindsNestedRepository: diffFindsNestedRepository,
            freshMachinePerSession: freshMachinePerSession && U !== "another",
            diffCopyRoot: pr,
            noRepositoryCheckedOut: Ge.length === 0,
            stageFileRoot: Gr,
            stagedFileArgs: Se,
            subagentPromptInline: hasOwn,
            governedGit: x,
            governedGitConfigPath: ht,
            childGitEnvironment: wn,
            debugFile: un,
            mcpConfigPath: P,
            launcherSettingsPath: Z,
            addDirs: tr,
            onDebug: onDebug,
            onStatus: onStatus,
            onSessionActivity: onSessionActivity,
            onBgTaskLedger: onBgTaskLedger,
            onBgFollowupPending: onBgFollowupPending,
            onPostTurnSettle: onPostTurnSettle,
            onChildLifecycle: onChildLifecycle
              ? (b) => {
                  if (b === "spawned") onChildLifecycle(b);
                  else Ji = b;
                }
              : void 0,
            onChildInit: () => {
              ((ir = !0), onInitPhase?.({ kind: "end", durationSec: (Date.now() - Mn) / 1000 }));
            },
            onSessionStartHookError: onSessionStartHookError,
            onMaxLifetime: onMaxLifetime,
            onChildTerminating: onChildTerminating,
            postSessionHookTimeoutMs: n.postSessionHookTimeoutMs ?? Ss,
            pushOutcomeOnRelease: pushOutcomeOnRelease ?? !1,
            signal: r,
            onTokenAck: (b) => {
              Xi.get(b)?.(!0);
              let le = as.get(b);
              if (le)
                (as.delete(b),
                  onStatus(
                    `[runner:session] ${le.label} update ${b} acked by child (${Date.now() - le.sentAtMs}ms)`,
                  ));
            },
            onResultApiError: (b) => {
              if (b === 401 || b === 403) ds(`child turn ended with HTTP ${b} from the model API`);
            },
            onProxyRefusal: void 0,
            onChildStdinReady: (b) => {
              if (((Ts = b), ys)) b(qi);
            },
          })),
            rt?.onChildExited(sn.result));
        } finally {
          (Xs?.(), bs?.(), Os?.());
          for (let Et of Xi.values()) Et(!1);
          (zt?.abort(), (zt = void 0), tn.cancel(), (Ts = void 0), zs?.then((Et) => Et?.stop()));
        }
      } finally {
        (Co.cancelAll(), abortController.abort());
      }
      Pe = sn.result;
      let Ys = Mln(sn.stderrTail),
        Vs = typeof r.reason === "string" ? r.reason : void 0;
      if (sn.result === "failed")
        ((he = sn.startError
          ? `child failed to start (${sn.startError.class}): ${Ys}`
          : `child exited ${sn.exitCode ?? "null"}: ${Ys}`),
          (Vt =
            sn.startError?.class === "e2big"
              ? "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR"
              : "SESSION_FAILURE_KIND_RUNNER_CRASH"),
          (Hn = !0));
      else if (sn.result === "interrupted") he = `child interrupted (SIGTERM/watchdog): ${Ys}`;
      if (
        (onDebug(`[runner:session] Session ${e} completed: ${Pe}`),
        (ft = !1),
        (En = Vs === "update"),
        (En || ft) && We !== void 0)
      ) {
        let M = We,
          api_base_url = q.api_base_url;
        await retryWithBackoff(
          () =>
            apiClient.updateSessionWorkerState(api_base_url, e, de.current, M, {
              connectionStatus: "disconnected",
            }),
          { initialDelayMs: 500, maxDelayMs: 2000, maxAttempts: 3, shouldRetry: isRetryableRunnerError },
        ).catch((j) => {
          if (
            (onDebug(`[runner:session] ${e} disconnect before the update restart failed: ${errorMessage(j)}`),
            !isRetryableRunnerError(j))
          )
            ft = !1;
        });
      }
      if ((Pe === "failed" || Pe === "interrupted") && We !== void 0 && !En && !ft) {
        let M = await postSessionFailureResult({
          apiClient: apiClient,
          apiBaseUrl: q.api_base_url,
          sessionId: e,
          sessionToken: de.current,
          workerEpoch: We,
          exitCode: sn.exitCode,
          exitSignal: sn.exitSignal,
          stderrTail: Ys,
          startError: sn.startError,
          refusedByHostPolicy: !ir && sn.stderrTail.includes(SIDELOAD_FLAGS_BLOCKED_PHRASE),
          onDebug: onDebug,
          onStatus: onStatus,
          signal: r,
        });
        if (M === "session_gone") ys = !0;
        else if (M === "epoch_stale") ((Ke = !0), (Vt = void 0));
      }
      if (
        Pe === "failed" &&
        ys &&
        (sn.stderrTail.includes("SDKStartup: exiting without result") ||
          sn.stderrTail.includes("RemoteIO: transport closed permanently") ||
          sn.stderrTail.includes("worker epoch mismatch (409)"))
      )
        (onStatus(
          `[runner:session] ${e} child exit ${sn.exitCode ?? "null"} after server end_session \u2014 session archived/deleted; clean close, not a runner failure`,
        ),
          (Pe = "completed"),
          (he = void 0),
          (Vt = void 0),
          (ft = !1),
          (Hn = !1));
      if (Pe === "failed") logFeatureBad("self_hosted_session_handle", "self_hosted_session_child_failed");
      else if (Pe === "completed") logFeatureOk("self_hosted_session_handle");
      if (Ji !== void 0 && (Pe === "completed" || Pe === "failed")) onChildLifecycle?.(Pe);
      else if (Pe === "interrupted")
        onChildLifecycle?.(
          Vs === "idle-release" || Vs === "deassign" || Vs === "update" ? "completed" : "interrupted",
        );
    } catch (error) {
      if ((Kn?.cancel(), r.aborted)) {
        let Me = typeof r.reason === "string" ? r.reason : "unspecified";
        return (
          onDebug(`[runner:session] ${e} aborted during setup (reason=${String(Me)}) \u2014 not a failure`),
          (Pe = "interrupted"),
          { result: "interrupted" }
        );
      }
      let mt = Wt
        ? await rs().then(
            () => !1,
            (Me) => isEpochMismatchError(Me),
          )
        : !1;
      if (isEpochMismatchError(error) || mt) {
        let Me =
          mt && !isEpochMismatchError(error)
            ? ` Setup had meanwhile thrown: ${redactSecretsInText(error instanceof Error ? error.message : String(error))}`
            : "";
        return (
          onDebug(
            `[runner:session] epoch fence tripped \u2014 another runner has taken ${e} (we got epoch ${We} but server rejected). Aborting before spawn.${Me}`,
          ),
          (Ke = !0),
          (Pe = "abandoned"),
          { result: "abandoned" }
        );
      }
      let rn = !1,
        _t = !rn && (error instanceof SourceRefNotFoundError || error instanceof FetchRefNotFoundError),
        bt = redactSecretsInText(error instanceof Error ? error.message : String(error)),
        en = _t ? bt : Mln(bt);
      he = `setup threw: ${en}`;
      {
        let Me = getHttpStatus(error);
        if (Me !== void 0 && Me >= 500) Vt = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
        else if (_t) Vt = "SESSION_FAILURE_KIND_SESSION_CONFIG_ERROR";
      }
      if (_t) De = "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND";
      else if (rn) De = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TERMINAL";
      else if (error instanceof CheckoutHookTimedOutError) De = "SETUP_FAILURE_KIND_CHECKOUT_HOOK_TIMEOUT";
      else if (!Lt) De = setupFailureKindOf(error);
      if (
        ((Hn = !0),
        logFeatureBad("self_hosted_session_handle", "self_hosted_session_setup_failed"),
        onDebug(`[runner:session] Session ${e} threw: ${en}`),
        We === void 0)
      )
        onDebug(
          `[runner:session] Session ${e} setup failed at/before registerWorker \u2014 skipping best-effort UI failure post (no valid epoch)`,
        );
      else if (nn)
        onDebug(
          `[runner:session] Session ${e} is refused for the agent proxy mode and left to another runner \u2014 no failure result is posted`,
        );
      else if (
        (await postSessionFailureResult({
          apiClient: apiClient,
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
          onDebug: onDebug,
          onStatus: onStatus,
          signal: r,
        })) === "epoch_stale"
      )
        Ke = !0;
      Pe = "failed";
    }
  } catch (error) {
    if (r.aborted)
      return (
        onDebug(`[runner:session] ${e} aborted during pre-spawn \u2014 not a failure`),
        { result: "interrupted" }
      );
    let gt = Mln(redactSecretsInText(error instanceof Error ? error.message : String(error)));
    he = `pre-spawn threw: ${gt}`;
    {
      let Qt = getHttpStatus(error);
      if (Qt !== void 0 && Qt >= 500) Vt = "SESSION_FAILURE_KIND_ANTHROPIC_CONTROL_PLANE_5XX";
    }
    if (
      ((De ??= setupFailureKindOf(error)),
      (Hn = !0),
      logFeatureBad("self_hosted_session_handle", "self_hosted_session_prespawn_failed"),
      de.current && q)
    )
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
    (moveWatch?.release(e), Br());
    let Qe = n.postSessionHookTimeoutMs ?? Ss,
      gt = Date.now() + Qd;
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
    let Qt = !1,
      yt = async () => {
        if (!St || Qt) return;
        ((Qt = !0),
          await z_(buildGitTrustBundle(St, readTrustBundleSource), "rebuild the trust bundle").catch((Q) => {
            onDebug(
              `[runner:session] governed git: the trust bundle could not be rebuilt (${errorMessage(Q)}); the runner's own git keeps GIT_SSL_CAINFO`,
            );
          }));
      };
    if (
      pushOutcomeOnRelease &&
      Lt &&
      !(q !== void 0 && isReviewOriginSession(q)) &&
      Pe !== "completed" &&
      r.reason !== "deassign" &&
      !Ke &&
      V.length > 0
    ) {
      onStatus(
        `[runner:session] ${e} ${Pe}: --push-outcome-on-release pushing ${V.length} outcome branch(es) to the source remote`,
      );
      let Q = Date.now() + _s;
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
        let xt = hu(N.source);
        await pushOnRelease(
          N.canonicalPath,
          N.branch,
          N.source,
          xe,
          onDebug,
          St && N.source.url
            ? gitEnvironmentForRole(St, "outcome", {
                url: xt ? N.source.upstreamUrl : N.source.url,
                mountRouted: N.source.governedMount === !0 && !xt,
              })
            : void 0,
        );
      }
    }
    let $r = En || ft;
    if (Lt) {
      let Q = await findHook(envSelfHostedRunnerHooksDir, "post-session");
      if (Q) {
        if (Ue !== void 0 && configureGitSigningArtifacts !== void 0)
          await withBoundedTimeout(
            materializeSessionGitConfig({
              configDir: ee,
              baseDir: baseDir,
              hookStubs: [],
              signingArtifacts: configureGitSigningArtifacts,
              onDebug: onDebug,
              onStatus: onStatus,
            }),
            jc,
            "[runner:session] refresh session-scoped git artifacts",
          ).catch((N) => {
            ((Re = lifecycleHookGitConfig(operatorGitSnapshot, hookGitPrograms)),
              onStatus(
                `[runner:session] could not refresh session-scoped git artifacts before the post-session hook (${errorMessage(N)}); its git runs with commit signing OFF instead`,
              ));
          });
        await runPostSessionHook({
          hookPath: Q,
          gitConfigPins: Re,
          gitConfigLegacyParams: hookGitLegacyParams,
          gitEnvironment: St && gitEnvironmentForSessionHook(St),
          cwd: se ?? baseDir,
          sessionId: e,
          exitReason: Pe,
          debugLogPath: un,
          workspacePaths: Cr,
          sessionAccessToken:
            We === void 0 || (q !== void 0 && isReviewOriginSession(q)) ? void 0 : de.current,
          apiBaseUrl: q?.api_base_url,
          clientPlatform: clientPlatform,
          timeoutMs: Qe,
          onStatus: onStatus,
          onDebug: onDebug,
        }).catch((N) => {
          onDebug(`[runner:hook:post-session] unexpected rejection (ignored): ${N}`);
        });
      }
    }
    if (Bn)
      await removeSessionState({
        sessionId: e,
        targets: [{ path: pr, recursive: !0 }],
        onStatus: onStatus,
        label: "removing the Changes pane's copies of git settings (they can hold a secret)",
      });
    let ar = !1;
    if (!Jt && We !== void 0 && de.current && q?.api_base_url)
      ar = await forwardLogFile({
        apiClient: apiClient,
        apiBaseUrl: q.api_base_url,
        sessionId: e,
        sessionToken: de.current,
        workerEpoch: We,
        debugFile: un,
        onDebug: onDebug,
      }).catch((Q) => (onDebug(`[runner:session] debug log flush failed (best-effort): ${Q}`), !1));
    if (Jt);
    else if (Pe === "completed") await z_(unlink_2(un), `unlink ${un}`).catch(() => {});
    else if (removeSessionState_2 && Bn) {
      let Q = await z_(unlink_2(un), `unlink ${un}`).then(
        () => !0,
        (N) => isENOENT(N),
      );
      if (Lt)
        onStatus(
          `[runner:session] ${e} ${Pe} \u2014 child debug log ${ar ? "tail forwarded to the session diagnostics on the server" : "NOT forwarded (no log, no worker registration, or the upload failed)"}; ${Q ? "not kept on disk" : "could not be unlinked, left to the directory removal below"} (--remove-session-state)`,
        );
    } else onStatus(`[runner:session] ${e} ${Pe} \u2014 child debug log preserved at ${un}`);
    if (P) await z_(unlink_2(P), `unlink ${P}`).catch(() => {});
    for (let Q of [...(Z ? [Z] : []), ...re, ...be]) await z_(unlink_2(Q), `unlink ${Q}`).catch(() => {});
    if (ye.length > 0)
      await removeSessionWorktree({ worktrees: ye, onDebug: onDebug }).catch((Q) => {
        onDebug(`[runner:session] worktree cleanup failed: ${Q}`);
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
        void 0,
        void 0,
        St && Q.source.governedMount && Q.source.url
          ? gitEnvironmentForRole(St, "outcome", { url: Q.source.url, mountRouted: !0 })
          : void 0,
      );
    if (Bn)
      await z_(
        Promise.all([removeFileIfExists(et), removeFileIfExists(Ct)]),
        "remove the trust bundle",
      ).catch((Q) => {
        onDebug(`[runner:session] governed git: the trust bundle could not be removed (${errorMessage(Q)})`);
      });
    for (let Q of qe)
      for (let N of [["credential.helper", "^$"], [`credential.${Q.origin}.helper`]])
        await new Promise((x) => {
          let xe = spawn("git", ["-C", Q.path, "config", "--local", "--unset-all", ...N], {
              cwd: void 0,
              stdio: "ignore",
              windowsHide: !0,
              ...Nd("helper"),
            }),
            xt = setTimeout((Zn) => Zn.kill("SIGKILL"), Dr, xe),
            Yn = () => {
              (clearTimeout(xt), x());
            };
          (xe.on("close", Yn), xe.on("error", Yn));
        });
    if ((abortController.abort(), hn?.cancel(), await Zt?.cleanup(), fn))
      await withBoundedTimeout(
        fn.remove(),
        Xr,
        "[runner:stuck] session git rules removal (check the session directory mount)",
      ).catch((Q) => {
        onDebug(`[runner:session] session git rules: ${errorMessage(Q)} (ignored)`);
      });
    if (Je)
      await withBoundedTimeout(
        Je.close(),
        Xr,
        "[runner:stuck] gh route teardown (check the session directory mount)",
      ).catch((Q) => {
        onDebug(`[runner:session] gh route: ${errorMessage(Q)} (ignored)`);
      });
    for (let Q of $r ? [] : Xe)
      await withBoundedTimeout(rm_3(Q, { recursive: !0, force: !0 }), Xr, `[runner:hook] rm -rf ${Q}`).catch(
        (N) => {
          onDebug(`[runner:hook] cleanup ${Q} failed: ${N}`);
        },
      );
    if (Ue !== void 0) {
      let Q = Ue;
      await withBoundedTimeout(
        isHooksDirSafe(ee, onStatus).then((N) => (N ? rm_3(Q, { recursive: !0, force: !0 }) : void 0)),
        Xr,
        `[runner:session] rm -rf ${Q}`,
      ).catch((N) => {
        onDebug(`[runner:session] cleanup ${Q} failed: ${N}`);
      });
    }
    if (useAnthropicGitProxy) delete process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN;
    if (ke) {
      ((It = !0), await resolved);
      let Q = cn();
      for (let N of Q)
        await cleanupSessionIngressTokenFiles(N, onStatus, Ie, tokenFileOpTimeoutMs).catch(() => {});
      if (
        (await Promise.all(
          Pn.map((N) =>
            cleanupSessionIngressTokenFiles(N, onStatus, Ie, tokenFileOpTimeoutMs).catch(() => {}),
          ),
        ),
        R)
      )
        resolved_2
          .then(async () => {
            for (let N of [...Q, ...Pn])
              await cleanupSessionIngressTokenFiles(N, onStatus, void 0, tokenFileOpTimeoutMs).catch(
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
          et,
          Ct,
        ].map((x) => ({ path: x, recursive: !0 })),
        N = await removeSessionState({ sessionId: e, targets: mapped, onStatus: onStatus });
      onDebug(
        `[runner:session] ${e}: --remove-session-state removed (or found absent) ${N.length}/${mapped.length} per-session paths${N.length > 0 ? `: ${N.join(", ")}` : ""}`,
      );
    }
    if (Mn !== void 0 && !ir) onInitPhase?.({ kind: "exit-before-init", failed: Hn });
  }
  return { result: Pe, failureReason: he, setupFailureKind: De, failureKind: Vt, failedOnUpdateBuild: ft };
}
//@ chunk-hm0ce8vc.js:140444-140512 placement
function iu(e) {
  return e.kind === "agent-loop" ? e.workerEpoch : e.hosting;
}
/**
 * 启动并监管会话子进程：转发 stdin 控制、活动心跳、令牌刷新、输出转发与退出处理。
 */
//@ chunk-hm0ce8vc.js:140512-159381 placement
function runSessionChild(e) {
  let {
      execPath: execPath,
      execArgs: execArgs = [],
      updatedChildBin: updatedChildBin,
      childUpdateBin: childUpdateBin,
      onChildUpdateReady: onChildUpdateReady,
      config: config,
      sessionId: sessionId,
      sessionToken: sessionToken,
      child: child,
      cwd: cwd,
      configDir: configDir,
      trustWorkspace: trustWorkspace,
      diffFindsNestedRepository: diffFindsNestedRepository,
      freshMachinePerSession: freshMachinePerSession,
      diffCopyRoot: diffCopyRoot,
      noRepositoryCheckedOut: noRepositoryCheckedOut,
      stageFileRoot: stageFileRoot,
      stagedFileArgs: stagedFileArgs,
      subagentPromptInline: subagentPromptInline,
      governedGit: governedGit,
      governedGitConfigPath: governedGitConfigPath,
      childGitEnvironment: childGitEnvironment,
      ghRoutePath: ghRoutePath,
      ghRouteBasePath: ghRouteBasePath,
      sessionGitRulesPath: sessionGitRulesPath,
      capacity: capacity,
      inPrivateCheckout: inPrivateCheckout,
      healthPort: healthPort,
      clientPlatform: clientPlatform,
      debugFile: debugFile,
      mcpConfigPath: mcpConfigPath,
      launcherSettingsPath: launcherSettingsPath,
      addDirs: addDirs,
      onDebug: onDebug,
      onStatus: onStatus,
      onBgTaskLedger: onBgTaskLedger,
      onBgFollowupPending: onBgFollowupPending,
      onPostTurnSettle: onPostTurnSettle,
      signal: signal,
      onChildStdinReady: onChildStdinReady,
      onTokenAck: onTokenAck,
      onResultApiError: onResultApiError,
      onProxyRefusal: onProxyRefusal,
      onChildLifecycle: onChildLifecycle,
      onChildInit: onChildInit,
      onSessionStartHookError: onSessionStartHookError,
      onMaxLifetime: onMaxLifetime,
      onChildTerminating: onChildTerminating,
      runnerStartupTiming: runnerStartupTiming,
    } = e,
    An = { current: void 0 },
    Bt = child.kind === "agent-loop" ? child.workerEpoch : void 0,
    kt =
      e.onSessionActivity === void 0
        ? void 0
        : (V, ue) => {
            if (V !== "activity" && An.current?.terminationRequested) {
              onDebug(`[runner:session] ${sessionId} ignoring '${V}' from a child that is being terminated`);
              return;
            }
            e.onSessionActivity?.(V, ue);
          },
    Cn = env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT ? 0 : getStartupTimeoutMs(),
    { sdkUrl: sdkUrl, resumeUrl: resumeUrl } = isLocalhostUrl(config.api_base_url, sessionId),
    Nn = isReviewOriginSession(config),
    zn = [
      ...(diffFindsNestedRepository && capacity === 1
        ? [
            DECLARES_DIFF_FINDS_NESTED_REPOSITORY,
            ...(noRepositoryCheckedOut ? [DECLARES_NO_REPOSITORY_CHECKED_OUT] : []),
          ]
        : []),
      ...[],
    ],
    ze = [
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
    if (
      (onDebug(
        "[runner:session] Stripped self-hosted-runner operator tool names from the server-supplied tools arg",
      ),
      Xn.tools === "")
    )
      onDebug(
        "[runner:warn] server-supplied tools arg contained ONLY self-hosted-runner operator tool names; dropping --tools and using the default pool",
      );
  }
  let Pt = appendServerArgs(
    ze,
    pd(Nn ? wi(Xn, (V, ue) => Mc.has(ue)) : Xn, subagentPromptInline),
    CHILD_FORWARDED_FLAGS,
    (V, ue) => onDebug(`[runner:session] Skipping ${V} claude_code_arg: ${ue}`),
  );
  if (Pt > 0)
    onDebug(`[runner:session] Added ${Pt}/${Object.keys(config.claude_code_args).length} claude_code_args`);
  if (Nn) ze.push("--setting-sources=");
  let inference_auth = config.inference_auth;
  if (child.kind === "agent-loop" && !inference_auth?.access_token)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Session ${sessionId} /remote response is missing inference_auth.access_token`,
      "/remote response is missing inference_auth.access_token",
    );
  onDebug(
    `[runner:session] inference_auth ${inference_auth ? `set (expires_in=${inference_auth.expires_in_seconds}s)` : "absent: the child calls no model"}`,
  );
  let replaced = sessionId.replace(/^cse_/, "session_"),
    lt = config.environment_variables.OTEL_RESOURCE_ATTRIBUTES ?? env.OTEL_RESOURCE_ATTRIBUTES,
    Kt =
      capacity > 1 && healthPort !== void 0 && healthPort > 0 && env.OTEL_METRICS_EXPORTER === "prometheus"
        ? {
            OTEL_METRICS_EXPORTER: "otlp",
            OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: "http/json",
            OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `http://127.0.0.1:${healthPort}/v1/metrics`,
            OTEL_EXPORTER_OTLP_METRICS_COMPRESSION: "none",
            OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: "cumulative",
            OTEL_RESOURCE_ATTRIBUTES:
              (lt ? `${lt},` : "") +
              `session.id=${replaced}` +
              (clientPlatform ? `,client.platform=${clientPlatform}` : ""),
          }
        : {},
    Mn = getSessionIdFromJwt(sessionToken);
  if (
    ghRoutePath !== void 0 &&
    (config.environment_variables?.PATH ?? process.env.PATH ?? "") !== ghRouteBasePath
  )
    onStatus(
      "[runner:warn] governed git: the session's PATH changed after the GitHub API route was set up; the session runs with the earlier PATH, so gh stays routed, and the new PATH is not used",
    );
  let ir = child.kind === "agent-loop" ? sessionToken : void 0,
    Hn = env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL !== void 0,
    de = runnerUsesAgentProxyStandalone(
      config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
      env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
    ),
    Yt = (Bt ?? 0) > 1 && env.CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS !== !1,
    qn = {
      CLAUDE_CODE_SESSION_ACCESS_TOKEN: ir,
      ...(child.kind === "tool-server" && { CLAUDE_CODE_MCP_SERVE_SETTINGS: "{}" }),
      CLAUDE_SESSION_INGRESS_TOKEN_FILE:
        child.kind === "agent-loop" && !Nn ? getIngressTokenTempPrefix(configDir, iu(child)) : void 0,
      CLAUDE_CODE_OAUTH_TOKEN: inference_auth?.access_token,
      ...(Nn && buildClearedAuthEnv()),
      CLAUDE_CODE_OAUTH_SCOPES: "user:inference user:ccr_inference user:file_upload",
      CLAUDE_CONFIG_DIR: configDir,
      CLAUDE_STAGE_FILE_ROOT: stageFileRoot,
      CLAUDE_CODE_DIFF_COPY_ROOT: diffFindsNestedRepository && capacity === 1 ? diffCopyRoot : void 0,
      ANTHROPIC_MODEL: void 0,
      ANTHROPIC_DEFAULT_MODEL: void 0,
      CLAUDE_CODE_ENVIRONMENT_KIND: "byoc",
      CLAUDE_CODE_IGNORE_PERSISTED_TRUST: trustWorkspace ? void 0 : "1",
      CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION:
        env.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION ||
        isEnvTruthy(config.environment_variables?.CLAUDE_CODE_DISABLE_HELD_MESSAGE_RECOGNITION)
          ? "1"
          : void 0,
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
      CLAUDE_CODE_REMOTE_MCP_CONFIG: join_4(configDir, MCP_CONFIG_DELIVERED_JSON),
      CLAUDE_CODE_RETRY_WATCHDOG: "1",
      CLAUDE_CODE_MAX_RETRIES: "",
      CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE: "self_hosted",
      CLAUDE_RUNNER_CLIENT_PLATFORM: sanitizeMetricLabel(clientPlatform),
      DISABLE_AUTOUPDATER: "1",
      CLAUDE_ENABLE_STREAM_WATCHDOG: "1",
      CLAUDE_RUNNER_CLAUDE_BIN: updatedChildBin ?? process.execPath,
      CLAUDE_RUNNER_UPDATE_BIN: childUpdateBin ?? "",
      CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: Nn ? void 0 : "1",
      [CLAUDE_CODE_REMOTE_SESSION_ORIGIN]: getRemoteSessionOrigin(config),
      ...(Nn && { CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS: void 0 }),
      CLAUDE_CODE_REMOTE_SESSION_ID: sessionId,
      CLAUDE_CODE_REMOTE_SESSION_UUID: decodeTaggedUuid(sessionId),
      CLAUDE_CODE_ACCOUNT_UUID: config.environment_variables?.CLAUDE_CODE_ACCOUNT_UUID ?? void 0,
      CLAUDE_CODE_ORGANIZATION_UUID: config.environment_variables?.CLAUDE_CODE_ORGANIZATION_UUID ?? void 0,
      CCR_SESSION_ACCOUNT_EMAIL: Mn ?? void 0,
      ANTHROPIC_BASE_URL: config.api_base_url,
      SESSION_INGRESS_URL: config.api_base_url,
      ...(config.api_base_url.includes("staging")
        ? { USE_STAGING_OAUTH: "1" }
        : { USE_STAGING_OAUTH: void 0 }),
      CLAUDE_CODE_USE_CCR_V2: "1",
      CLAUDE_CODE_AGENT_PROXY_GIT_CONFIG: governedGit?.toolConfig.gitConfig ? "1" : void 0,
      CLAUDE_CODE_AGENT_PROXY_GH_SHIM: governedGit?.toolConfig.ghPathShim ? "1" : void 0,
      CLAUDE_CODE_AGENT_PROXY_GIT_HOSTS:
        governedGit?.toolConfig.gitConfig && governedGit.toolConfig.hostSplit
          ? governedGit.toolConfig.hostSplit.governed.join(",")
          : void 0,
      ...(governedGit?.toolConfig.gitConfig && { GIT_CONFIG_GLOBAL: governedGitConfigPath }),
      ...buildChildGitEnv(
        childGitEnvironment,
        config.environment_variables?.GIT_CONFIG_COUNT ?? process.env.GIT_CONFIG_COUNT,
        sessionGitRulesPath,
        getGitConfigParameters(config.environment_variables, process.env, getPlatform() === "windows"),
      ),
      ...(ghRoutePath !== void 0 && { PATH: ghRoutePath }),
      CCR_AGENT_PROXY_ENABLED:
        governedGit && (governedGit.toolConfig.gitConfig || governedGit.toolConfig.ghPathShim) ? "1" : void 0,
      SELF_HOSTED_RUNNER_AGENT_PROXY_URL: env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      AGENT_PROXY_URL: void 0,
      AGENT_PROXY_AUTH_TOKEN: void 0,
      CCR_AGENT_PROXY_STANDALONE_URL: void 0,
      ...((Hn || child.kind === "agent-loop") && {
        CCR_AGENT_PROXY_RELAY_MODE: childRelayEnvValue(
          config.environment_variables?.CCR_AGENT_PROXY_RELAY_MODE,
          env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
        ),
      }),
      ...(de && agentProxyStandaloneRunnerEnv(process.env)),
      SELF_HOSTED_RUNNER_POOL_SECRET: void 0,
      SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: void 0,
      ...egressProxyChildEnv(),
      SELF_HOSTED_RUNNER_HOST_CONFIG_DIR: void 0,
      SELF_HOSTED_RUNNER_HOLD_IDLE_FILE: void 0,
      SELF_HOSTED_RUNNER_MAX_HOLD_MS: void 0,
      CLAUDE_CODE_EXIT_AFTER_STOP_DELAY: void 0,
      CLAUDE_CODE_MCP_SERVE_AUTH_TOKEN: void 0,
      CLAUDE_CODE_MCP_SERVE_ENABLED_PLUGINS: void 0,
      CLAUDE_CODE_BRIDGE_PROMPT_SHA256: void 0,
      CLAUDE_CODE_BRIDGE_MCP_CARRIER: void 0,
      ...!1,
      CCR_AUTO_MODE_APPLY: void 0,
      CCR_AUTO_MODE_ALLOW: void 0,
      CCR_AUTO_MODE_ENVIRONMENT: void 0,
      CCR_AUTO_MODE_SOFT_DENY: void 0,
      ...{},
      CLAUDE_CODE_WORKER_EPOCH: Bt?.toString(),
      CLAUDE_CODE_RESUME_INTERRUPTED_TURN: (Bt ?? 0) > 1 ? "1" : void 0,
      CLAUDE_CODE_RESUME_SHOWS_CUT_OFF_CALLS: Yt ? "1" : void 0,
      CLAUDE_CODE_RESUME_PROMPT: Yt ? S5s : (Bt ?? 0) > 1 ? SESSION_MOVED_CONTINUE_PROMPT : void 0,
      CCR_SPAWN_TIMESTAMP_MS: String(Date.now()),
      CCR_RUNNER_STARTUP_TIMING: runnerStartupTiming,
      [CCR_SHR_START_MARKS]: void 0,
      ...!1,
    },
    q =
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
        : ze,
    Pe = mergeSessionEnv({
      inheritedEnv: process.env,
      serverEnv: config.environment_variables,
      enforcedEnv: qn,
      onDropped: (V, ue, U) => onDebug(`[runner:session] Skipping ${U} environment name ${V}: ${ue}`),
    });
  onDebug(
    `[runner:session] Spawning child: ${[execPath, ...execArgs].join(" ")} (${q.length - execArgs.length} args) ANTHROPIC_BASE_URL=${config.api_base_url} CLAUDE_CODE_WORKER_EPOCH=${Bt} cwd=${cwd}`,
  );
  let En = (V) => {
      let ue = describeSpawnFailure(V, [execPath, ...q], Pe);
      return (
        onDebug(
          `[runner:session] ${sessionId} spawn error (${ue.class}): ${V instanceof Error ? V.message : String(V)}`,
        ),
        { result: "failed", exitCode: null, exitSignal: null, stderrTail: ue.description, startError: ue }
      );
    },
    ft = {
      cwd: cwd,
      stdio: Nn ? [...Ma] : ["pipe", "pipe", "pipe", "pipe"],
      env: Pe,
      windowsHide: !0,
      detached: !0,
    },
    he;
  try {
    he = spawn(execPath, q, ft);
  } catch (error) {
    return Promise.resolve(En(error));
  }
  let De;
  try {
    ((De = he.stdio[3]),
      De?.on?.("error", (V) => {
        (onDebug(`[runner:session] activity pipe error (${V.message}); falling back to stdout readline`),
          (De = void 0));
      }));
  } catch (error) {
    (onDebug(
      `[runner:session] activity pipe unavailable (${error instanceof Error ? error.message : String(error)}); falling back to stdout readline`,
    ),
      (De = void 0));
  }
  if (
    (onStatus(`[runner:session] ${sessionId} child spawned pid=${he.pid} cwd=${cwd}`),
    onChildLifecycle?.("spawned"),
    Nn && he.pid !== void 0)
  ) {
    let V = inference_auth?.access_token;
    if (
      V !== void 0 &&
      writeChildSessionTokens(he, { sessionToken: sessionToken, inferenceToken: V }, (U) =>
        onDebug(`[runner:session] ${sessionId} writing a token to its descriptor failed (${U.message})`),
      )
    )
      logFeatureOk("self_hosted_review_session");
    else {
      (logFeatureBad("self_hosted_review_session", "handoff_failed"),
        onStatus(
          `[runner:session] ${sessionId} could not be handed its tokens on descriptors; ending its child. The session fails. Nothing on this runner needs changing.`,
        ));
      try {
        if (he.pid === void 0 || he.pid <= 1) throw Error("no process group to signal");
        process.kill(-he.pid, "SIGKILL");
      } catch {
        he.kill("SIGKILL");
      }
    }
  }
  kt?.("startup");
  let Vt = new SilenceWatchdog({
    limitMs: Cn,
    onSilent: () => kt?.("startup", { ...Bn(), childSilent: !0 }),
  });
  if (child.kind === "tool-server")
    (he.stdin?.on("error", (V) => {
      onDebug(
        `[runner:session] ${sessionId} tool server's standard input closed before its line was read (${V.message})`,
      );
    }),
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
      ));
  else
    onChildStdinReady?.((V) => {
      if (he.stdin && !he.stdin.destroyed) return (he.stdin.write(V), !0);
      return !1;
    });
  let P = new SessionLifetimeWatchdog({
    child: he,
    sessionId: sessionId,
    startTokenStale: e.startTokenStale,
    stuckExitCode: e.stuckExitCode,
    maxLifetimeMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS"),
    maxLifetimeGraceMs: envPositiveMs("SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS") || Xc,
    sigkillGraceMs: Math.min(
      Math.max(
        envPositiveMs("SELF_HOSTED_RUNNER_SIGKILL_GRACE_MS") || 30000,
        e.postSessionHookTimeoutMs + (e.pushOutcomeOnRelease ? _s : 0) + Lr,
      ),
      2147483647,
    ),
    sigkillTimeoutMs:
      envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") ||
      SessionLifetimeWatchdog.SIGKILL_TIMEOUT_DEFAULT_MS,
    onMaxLifetime: onMaxLifetime,
    onTerminating: () => {
      (Vt.end(), onChildTerminating?.());
    },
    onDebug: onDebug,
    onStatus: onStatus,
  });
  An.current = P;
  let Z = () => P.terminate();
  if ((signal.addEventListener("abort", Z, { once: !0 }), signal.aborted)) P.terminate();
  let re = new Map(),
    be = () => {
      let V = 0;
      for (let ue of re.values()) if (ue !== "monitor_mcp" && ue !== "monitor_ws") V++;
      return V;
    },
    ee = null,
    Re,
    Ue = !1,
    ht = !1,
    wn = !1,
    et = !1,
    Ct = !1,
    St = !1,
    Or = !1,
    Ar = !1,
    Gr = 120000,
    pr = () => ee !== null && Date.now() < ee,
    Bn = () => ({
      liveTasks: re.size,
      liveTaskIds: Array.from(re, ([V, ue]) => `${V}:${ue}`),
      wakeupInMs: ee !== null ? Math.max(0, ee - Date.now()) : void 0,
      bgResultAwaitingFollowup: pe,
    }),
    un = envPositiveMs("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS") || wo,
    We = envPositiveMs("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS") || Ls,
    se = !1,
    ke = 0,
    jt,
    cn = (V = !1) => {
      if (jt !== void 0) (clearTimeout(jt), (jt = void 0));
      if (se) ((se = !1), onPostTurnSettle?.(!1, V));
    },
    Pn = (V) => {
      let min = Math.min(Date.now() + V, ke);
      if (jt !== void 0) clearTimeout(jt);
      jt = setTimeout(cn, Math.max(0, min - Date.now()));
    },
    Jt = () => {
      if (((ke = Date.now() + We), !se)) ((se = !0), onPostTurnSettle?.(!0));
      Pn(We);
    },
    In = new Set(),
    nn = !1,
    tt = new Set(),
    R = new Set(),
    pe = !1,
    It,
    Ie = () => {
      if (It !== void 0) (clearTimeout(It), (It = void 0));
    },
    ye = (V, ue = !1, U = !1) => {
      if (!ue) (Ie(), (nn = !1), tt.clear());
      if (pe)
        ((pe = !1),
          onDebug(`[runner:session] ${sessionId} background-result follow-up cleared (${V})`),
          onBgFollowupPending?.(!1, U || An.current?.terminationRequested === !0));
    },
    Xe = () => {
      (Ie(),
        (It = setTimeout(() => {
          ((It = void 0),
            onStatus(
              `[runner:session] ${sessionId} no follow-up turn within ${formatDuration(un)} of the background task finishing \u2014 ` +
                "releasing the follow-up hold",
            ),
            ye("grace elapsed"),
            fn());
        }, un)));
    },
    qe = () => {
      if (!pe)
        ((pe = !0),
          onStatus(
            `[runner:session] ${sessionId} background task finished; follow-up turn ` +
              "pending \u2014 session still counted as busy (grace " +
              `${formatDuration(un)})`,
          ),
          onBgFollowupPending?.(!0));
      if (!Ue) Xe();
    },
    Nt = (V) => {
      if ((In.delete(V), R.delete(V), nn && be() === 0 && !et && !Ue)) qe();
    },
    Je = (V) => {
      if (R.has(V)) {
        Nt(V);
        return;
      }
      if (In.delete(V)) ((nn = !0), tt.add(V));
      if (be() > 0) return;
      if (et) return;
      if (!(nn || !Ue)) return;
      ((nn = !0), tt.add(V), qe());
    },
    fn = () => {
      if (Ue || re.size > 0 || pr() || pe) return;
      if (Re !== void 0) (clearTimeout(Re), (Re = void 0));
      kt?.("turn-end");
    },
    Wn = () => {
      for (let V of re.keys()) In.add(V);
      if ((kt?.("turn-end-deferred", Bn()), pe)) Xe();
      if (Re !== void 0) clearTimeout(Re);
      if (ee !== null)
        Re = setTimeout(
          () => {
            ((Re = void 0), (ee = null), fn());
          },
          Math.max(0, ee - Date.now()),
        );
    },
    Dn,
    Zt = !1,
    hn = (V) => {
      if (Ct || (V === "stderr" && Dn !== void 0) || env.CLAUDE_RUNNER_DISABLE_TURN_BEGAN_BEFORE_INIT) return;
      if (Dn === void 0)
        onStatus(
          `[runner:session] ${sessionId} a turn started (signal on ${V === "tee" ? "the activity channel" : "stderr"})${Cn > 0 ? ": until the child has initialized, --startup-timeout-min now counts from its last line on the activity channel" : ""}`,
        );
      if (V === "tee" && Dn === "stderr")
        onDebug(
          `[runner:session] ${sessionId} a turn started: signal also read on the activity channel, after stderr (both channels work; no action needed)`,
        );
      if (((Dn = V), Vt.arm(), V === "stderr")) {
        kt?.("init-observed");
        return;
      }
      let ue = !Ue;
      if (((Ue = !0), (Zt = !0), P.noteTurnStart(), kt?.("activity"), ue)) {
        if (((ee = null), Re !== void 0)) (clearTimeout(Re), (Re = void 0));
        ye("follow-up turn opened");
      }
    },
    Ln = (V) => {
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
        let Tt = U.response?.request_id;
        if (typeof Tt === "string" && Tt.startsWith("shr-token-")) onTokenAck?.(Tt);
      }
      if (U.type === "assistant") onDebug("[runner:session] Activity: assistant message");
      else if (U.type === "result") {
        if (
          (onDebug(`[runner:session] Result: subtype=${U.subtype}`),
          U.is_error === !0 && typeof U.api_error_status === "number")
        )
          onResultApiError?.(U.api_error_status);
      }
      if (U.type === "system" && U.subtype === "task_started") {
        if (typeof U.task_id === "string" && U.task_type !== "in_process_teammate") {
          if (
            (re.set(U.task_id, typeof U.task_type === "string" ? U.task_type : "unknown"),
            U.owned_by_subagent === !0)
          )
            R.add(U.task_id);
          else R.delete(U.task_id);
          onBgTaskLedger?.(be());
        }
        return;
      }
      if (U.type === "system" && U.subtype === "task_updated") {
        let patch = U.patch,
          Tt = patch?.status;
        if (typeof U.task_id === "string" && patch?.is_backgrounded === !0 && re.has(U.task_id))
          In.add(U.task_id);
        if (
          typeof U.task_id === "string" &&
          (Tt === "completed" || Tt === "failed" || Tt === "killed") &&
          re.delete(U.task_id)
        )
          (Je(U.task_id), onBgTaskLedger?.(be()), fn());
        return;
      }
      if (U.type === "system" && U.subtype === "task_notification") {
        if (typeof U.task_id === "string" && re.delete(U.task_id)) {
          if (U.status === "stopped") Nt(U.task_id);
          else Je(U.task_id);
          (onBgTaskLedger?.(be()), fn());
        }
        return;
      }
      if (U.type === "system" && U.subtype === "background_tasks_changed") {
        let tasks = U.tasks;
        if (Array.isArray(tasks))
          for (let Tt of tasks) {
            let xn = Tt?.task_id;
            if (typeof xn === "string") In.add(xn);
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
          if (((Ct = !0), Vt.end(), onChildInit?.(), child.kind === "tool-server"))
            logFeatureOk("self_hosted_tools_host");
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
        if (
          ((wn = !0),
          kt?.("activity"),
          U.mode === void 0 ||
            (U.mode === "task-notification" && !("task_id" in U)) ||
            (U.mode === "task-notification" && typeof U.task_id === "string" && tt.has(U.task_id)))
        )
          ye("follow-up turn starting");
        else (ye("non-follow-up turn starting", !0), Ie());
        return;
      }
      if (U.type === "system" && U.subtype === "session_state_changed") {
        if (((St = !0), se)) Pn(Wc);
        if (typeof U.waiting_on_user === "boolean") ((ht = !0), (et = U.waiting_on_user));
        if (U.state === "idle") {
          if (!Ar || (Zt && !Ct)) {
            if ((P.noteTurnEnd(), (Ue = !1), (Zt = !1), Ar && nn && be() === 0 && !et)) qe();
            if (Ar && (re.size > 0 || pr() || pe)) Wn();
            else kt?.("turn-end");
          }
          return;
        }
        if (!Ct) {
          if (typeof U.waiting_on_user === "boolean" ? U.waiting_on_user : U.state === "requires_action")
            Or = !0;
          else if (!Or) return;
        }
        if (typeof U.waiting_on_user === "boolean")
          (kt?.(U.waiting_on_user ? "awaiting-action" : "activity"),
            ye(U.waiting_on_user ? "child parked at a prompt" : "child running", !0));
        else if (U.state === "requires_action") (kt?.("awaiting-action"), ye("child parked at a prompt", !0));
        else if (U.state === "running") (kt?.("activity"), ye("child running", !0));
        return;
      }
      if (U.type === "assistant") {
        let nt = U.message?.content;
        if (Array.isArray(nt)) {
          for (let Tt of nt)
            if (
              Tt &&
              typeof Tt === "object" &&
              Tt.type === "tool_use" &&
              Tt.name === SCHEDULE_WAKEUP_TOOL_NAME
            ) {
              let input = Tt.input,
                Kn = Number(input?.delaySeconds);
              if (Number.isFinite(Kn)) {
                let min = Math.min(3600, Math.max(60, Kn));
                ee = Date.now() + min * 1000 + Gr;
              }
            }
        }
      }
      if (U.type === "result") {
        if ((Jt(), P.noteTurnEnd(), (Ue = !1), (Zt = !1), (Ar = !0), nn && be() === 0 && !et)) qe();
        if (re.size === 0 && !pr() && !pe) kt?.("turn-end");
        else if (et && !env.CLAUDE_RUNNER_DISABLE_AWAITING_ACTION_OVERRIDE)
          (kt?.("awaiting-action", Bn()), ye("child parked at a prompt", !0));
        else Wn();
      } else if (U.type === "user" || U.type === "assistant") {
        if (U.from_subagent === !0) return;
        if (Dn === void 0 && !Ct && !St && !Ar) {
          kt?.("startup", { ...Bn(), childAlive: !0 });
          return;
        }
        if ((P.noteTurnStart(), !Ue && U.type === "user")) ee = null;
        let nt = !Ue;
        if (((Ue = !0), Re !== void 0)) (clearTimeout(Re), (Re = void 0));
        if (!ht) kt?.("activity");
        if (nt) {
          if ((ye("follow-up turn opened", wn), wn)) Ie();
        }
      }
    };
  if (he.stdout) createInterface({ input: he.stdout }).on("line", Ln);
  if (De) createInterface({ input: De }).on("line", Ln);
  let Dt = 50,
    Cr = 500,
    pt = [],
    Lt = 9,
    Ke = 0;
  if (he.stderr)
    createInterface({ input: he.stderr }).on("line", (ue) => {
      if (!Ct && ue.startsWith("SDKStartup: phase=system_init_emitted"))
        ((Ct = !0),
          Vt.end(),
          onChildInit?.(),
          kt?.("init-observed"),
          onDebug(`[runner:session] ${sessionId} sawInit latched via stderr SDKStartup marker`));
      if (/^SDKStartup: phase=turn_began_before_init(?: |$)/.test(ue)) hn("stderr");
      let U = zc(ue, Cr);
      if (U.startsWith(OTEL_DIAG_ERROR_PREFIX)) onStatus(`[runner:session] stderr: ${U}`);
      else if (diffFindsNestedRepository && LCs(U) && Ke < Lt)
        (Ke++, onStatus(`[runner:session] ${sessionId} ${U}`));
      else onDebug(`[runner:session] stderr: ${U}`);
      if ((pt.push(U), pt.length > Dt)) pt.shift();
    });
  let Ut = !1;
  return new Promise((V) => {
    (he.on("close", (ue, U) => {
      if ((signal.removeEventListener("abort", Z), P.stop(), Vt.end(), Re !== void 0))
        (clearTimeout(Re), (Re = void 0));
      if (re.size > 0) (re.clear(), R.clear(), onBgTaskLedger?.(0));
      (ye("child exited", !1, !0), cn(!0));
      let joined = pt.join(`
`);
      if (P.terminationRequested)
        (onStatus(
          `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (interrupted \u2014 we asked)`,
        ),
          P.descendantsReaped.then(() =>
            V({ result: "interrupted", exitCode: ue, exitSignal: U, stderrTail: joined }),
          ));
      else if (U === "SIGTERM" || U === "SIGINT")
        (onStatus(
          `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (interrupted)`,
        ),
          V({ result: "interrupted", exitCode: ue, exitSignal: U, stderrTail: joined }));
      else if (ue === 0) {
        if ((onStatus(`[runner:session] ${sessionId} child exited pid=${he.pid} code=0 (completed)`), !Ut))
          ((Ut = !0), onChildLifecycle?.("completed"));
        V({ result: "completed", exitCode: 0, exitSignal: null, stderrTail: joined });
      } else {
        if (
          (onStatus(
            `[runner:session] ${sessionId} child exited pid=${he.pid} code=${ue} signal=${U} (failed) \u2014 debug log at ${debugFile}`,
          ),
          !Ut)
        )
          ((Ut = !0), onChildLifecycle?.("failed"));
        V({ result: "failed", exitCode: ue, exitSignal: U, stderrTail: joined });
      }
    }),
      he.on("error", (ue) => {
        if ((signal.removeEventListener("abort", Z), P.stop(), Vt.end(), !Ut))
          ((Ut = !0), onChildLifecycle?.("failed"));
        if (he.pid === void 0) {
          V(En(ue));
          return;
        }
        (onDebug(`[runner:session] ${sessionId} spawn error: ${ue.message}`),
          V({
            result: "failed",
            exitCode: null,
            exitSignal: null,
            stderrTail: `spawn error: ${ue.message}`,
          }));
      }));
  });
}
//@ chunk-hm0ce8vc.js:159381-159405 placement
var Ss = 60000,
  Es = 1800000;
//@ chunk-hm0ce8vc.js:159405-159615 placement
function getCheckoutHookTimeoutMs() {
  let envSelfHostedRunnerCheckoutHookTimeoutMs = process.env.SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS;
  if (envSelfHostedRunnerCheckoutHookTimeoutMs === void 0 || envSelfHostedRunnerCheckoutHookTimeoutMs === "")
    return Es;
  let n = envPositiveMs("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS");
  return n > 0 ||
    (envSelfHostedRunnerCheckoutHookTimeoutMs.trim() !== "" &&
      Number(envSelfHostedRunnerCheckoutHookTimeoutMs) === 0)
    ? n
    : Es;
}
//@ chunk-hm0ce8vc.js:159615-159693 placement
var wo = 30000,
  Ls = 7000,
  Wc = 2000,
  Us = 5000,
  Kc = 3000,
  Yc = 1000,
  Vc = 1500,
  Lr = 15000,
  jc = 1000;
//@ chunk-hm0ce8vc.js:159693-159760 placement
function Ti(e, n, r = 0, s = 0, a = 0) {
  return Math.ceil((e + n + r + s + a + Lr) / 1000);
}
//@ chunk-hm0ce8vc.js:159760-159854 placement
function zc(e, n) {
  let r = redactSecretsInText(e);
  return r.length > n ? r.slice(0, n) + ` \u2026[+${r.length - n} chars]` : r;
}
//@ chunk-hm0ce8vc.js:159854-159868 placement
var Xc = 900000;
/**
 * 会话最长存活时间看门狗：可调用 max-lifetime 钩子决定 wait/kill。
 */
//@ chunk-hm0ce8vc.js:159868-166298 placement
class SessionLifetimeWatchdog {
  maxLifetimeTimer;
  maxLifetimeGraceTimer;
  sigkillTimer;
  sigkillGraceTimer;
  stopped = !1;
  turnInFlight = !1;
  maxLifetimeDeferred = !1;
  maxLifetimeDecidedByHook = !1;
  terminating = !1;
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
  static SIGKILL_TIMEOUT_DEFAULT_MS = Us;
  constructor(e) {
    if (
      ((this.child = e.child),
      (this.sessionId = e.sessionId),
      (this.maxLifetimeGraceMs = e.maxLifetimeGraceMs),
      (this.sigkillTimeoutMs = e.sigkillTimeoutMs),
      (this.sigkillGraceMs = e.sigkillGraceMs),
      (this.onMaxLifetime = e.onMaxLifetime),
      (this.startTokenStale = e.startTokenStale),
      (this.stuckExitCode = e.stuckExitCode),
      (this.onTerminating = e.onTerminating),
      (this.onDebug = e.onDebug),
      (this.onStatus = e.onStatus),
      this.child.pid !== void 0)
    )
      getProcessStartTimeAsync(this.child.pid, { skipCache: !0 }).then(
        (n) => {
          this.rootToken = n;
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
          if (
            ((this.maxLifetimeDecidedByHook = s !== void 0),
            (s ??= this.turnInFlight ? "wait" : "kill"),
            s === "kill")
          ) {
            (this.onDebug(
              `[runner:stuck] Session ${this.sessionId} exceeded max lifetime of ${r}ms \u2014 aborting child pid=${this.child.pid}`,
            ),
              this.terminate());
            return;
          }
          ((this.maxLifetimeDeferred = !0),
            this.onStatus(
              s === "release"
                ? `[runner:session] ${this.sessionId} max session age reached (${r}ms) while not mid-turn \u2014 handing to the poll loop's release instead of terminating (hard stop in ${this.maxLifetimeGraceMs}ms if it is still alive)`
                : this.maxLifetimeDecidedByHook
                  ? `[runner:session] ${this.sessionId} max session age reached (${r}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for the in-flight turn to park or finish (it is then released; terminated at the hard stop otherwise)`
                  : `[runner:session] ${this.sessionId} max session age reached (${r}ms) \u2014 waiting up to ${this.maxLifetimeGraceMs}ms for in-flight turn to finish before terminating`,
            ),
            (this.maxLifetimeGraceTimer = setTimeout(
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
            )));
        },
        maxLifetimeMs,
        maxLifetimeMs,
      );
    }
  }
  noteTurnStart() {
    this.turnInFlight = !0;
  }
  noteTurnEnd() {
    if (((this.turnInFlight = !1), this.maxLifetimeDeferred && !this.stopped && !this.terminating)) {
      if (this.maxLifetimeDecidedByHook) return;
      (this.onStatus(
        `[runner:session] ${this.sessionId} in-flight turn finished after max session age \u2014 aborting child pid=${this.child.pid}`,
      ),
        this.terminate());
    }
  }
  signalGroup(e) {
    let pid = this.child.pid;
    if (pid === void 0) {
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
    if (treeSnapshot === void 0) return;
    this.treeSnapshot = void 0;
    let pid = this.child.pid,
      s = (async () => {
        let a = await treeSnapshot;
        if (a === void 0) {
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
          let { live: live, incomplete: incomplete } = await countLiveProcesses(a);
          if (live > 0 || incomplete) (await sleep(e), (o = await killProcessTree(a, "SIGKILL")));
        } else o = await killProcessTree(a, "SIGKILL");
        if (o?.incomplete) {
          this.onStatus(
            `[runner:session] ${this.sessionId} process-tree identity check did not complete \u2014 ${a.pinned.size - o.proven} of ${a.pinned.size} descendant(s) unverified and not signalled; they may survive`,
          );
          return;
        }
        let l = o?.pids ?? 0,
          u = o?.groups ?? 0;
        if (a.degraded || a.truncated || a.unpinned > 0) {
          this.onStatus(
            `[runner:session] ${this.sessionId} process-tree listing incomplete (partial=${a.degraded} truncated=${a.truncated}) \u2014 SIGKILLed ${l} of ${a.pinned.size} identified descendant(s) and ${u} group(s); ${a.unpinned} descendant(s) could not be identified and were not signalled; they, and any unlisted tool trees, may survive`,
          );
          return;
        }
        this.onDebug(
          o === void 0
            ? `[runner:session] process tree pid=${pid}: ${a.pinned.size} descendant(s) at SIGTERM (${a.unpinned} unidentifiable), none outlived the child`
            : `[runner:session] process tree pid=${pid}: ${a.pinned.size} descendant(s) at SIGTERM (${a.unpinned} unidentifiable); ${l} outlived the child and were SIGKILLed, with ${u} tool-tree group(s)`,
        );
      })().catch(() => {});
    this.reap = withDeadline(s, e + Yc).then(() => {});
  }
  get descendantsReaped() {
    return this.reap;
  }
  terminate() {
    if (this.terminating) return;
    if (this.stopped) return;
    ((this.terminating = !0), (this.terminatedAt = Date.now()));
    try {
      this.onTerminating?.();
    } catch {}
    {
      let pid = this.child.pid;
      if (pid !== void 0)
        this.treeSnapshot = snapshotProcessTree(
          {
            pid: pid,
            alive: this.child.exitCode === null && this.child.signalCode === null,
            token: this.startTokenStale?.() ? void 0 : this.rootToken,
          },
          Kc,
        );
      (this.onDebug(
        `[runner:session] Abort signal received, sending SIGTERM to process group pgid=${this.child.pid}`,
      ),
        this.signalGroup("SIGTERM"),
        (this.sigkillTimer = setTimeout(
          (n) => {
            if (!this.stopped)
              (this.onDebug(
                `[runner:session] Child still running after ${n}ms, sending SIGKILL to process group pgid=${this.child.pid} and reaping its process tree`,
              ),
                this.signalGroup("SIGKILL"),
                this.reapDescendants(0),
                (this.sigkillGraceTimer = setTimeout(() => {
                  if (!this.stopped)
                    (this.onDebug(
                      `[runner:stuck] Session ${this.sessionId} did not exit after SIGKILL within ${this.sigkillGraceMs}ms (likely D-state). Forcing process exit.`,
                    ),
                      process.exit(this.stuckExitCode?.() ?? 1));
                }, this.sigkillGraceMs)));
          },
          this.sigkillTimeoutMs,
          this.sigkillTimeoutMs,
        )));
    }
  }
  stop() {
    if (
      ((this.stopped = !0),
      this.reapDescendants(Math.max(1, Math.min(Vc, this.terminatedAt + this.sigkillTimeoutMs - Date.now()))),
      this.sigkillTimer)
    )
      clearTimeout(this.sigkillTimer);
    if (this.sigkillGraceTimer) clearTimeout(this.sigkillGraceTimer);
    if (this.maxLifetimeTimer) clearTimeout(this.maxLifetimeTimer);
    if (this.maxLifetimeGraceTimer) clearTimeout(this.maxLifetimeGraceTimer);
  }
  get terminationRequested() {
    return this.terminating;
  }
}
/**
 * 带抖动的指数退避重试，可设最大次数、是否重试判断、重试回调与中止信号。
 */
//@ chunk-hm0ce8vc.js:166298-166615 placement
async function retryWithBackoff(fn, options) {
  let initialDelayMs = options.initialDelayMs,
    s = 0;
  for (;;) {
    if (options.signal?.aborted) return;
    s++;
    try {
      return await fn();
    } catch (error) {
      if (options.shouldRetry && !options.shouldRetry(error)) throw error;
      if (options.maxAttempts !== void 0 && s >= options.maxAttempts) throw error;
      options.onRetry?.(s, error);
      let o = initialDelayMs * (0.75 + Math.random() * 0.5);
      (await sleep(o, options.signal), (initialDelayMs = Math.min(initialDelayMs * 2, options.maxDelayMs)));
    }
  }
}
//@ chunk-hm0ce8vc.js:166615-166657 placement
class du {
  last = 0;
  next() {
    return ++this.last;
  }
}
//@ chunk-hm0ce8vc.js:166657-166682 placement
var qc = new HostScoped(() => new du());
//@ chunk-hm0ce8vc.js:166682-166719 placement
function Jc() {
  return qc.of(getRootSession().host);
}
/**
 * 把刷新的会话令牌写入子进程 stdin（未接好时记录未投递）。
 */
//@ chunk-hm0ce8vc.js:166719-167351 placement
function deliverRefreshedToken(e) {
  let n = e.expiresInSeconds !== void 0 ? ` (expires_in=${e.expiresInSeconds}s)` : "";
  if (!e.write) {
    e.onStatus(
      `[runner:session] ${e.label} refreshed for ${e.sessionId} but child stdin is not wired yet \u2014 token NOT delivered; next interval will retry${n}`,
    );
    return;
  }
  let r;
  if (e.pendingAcks)
    ((r = `shr-token-${e.label}-${Jc().next()}`),
      e.pendingAcks.set(r, { label: e.label, sentAtMs: e.nowMs ?? Date.now() }));
  (e.write(
    jsonStringify({
      type: "update_environment_variables",
      variables: { [e.envVar]: e.token },
      ...(r && { request_id: r }),
    }) +
      `
`,
  ),
    e.onStatus(
      `[runner:session] ${e.label} refreshed for ${e.sessionId} \u2014 pushed to child via stdin${n}${r ? ` [${r}]` : ""}`,
    ));
}
//@ chunk-hm0ce8vc.js:167351-167833 placement
function warnTokenUpdateNotAcked(e) {
  let n = e.nowMs ?? Date.now(),
    r = e.graceMs ?? 90000;
  for (let [s, a] of e.pendingAcks)
    if (n - a.sentAtMs >= r)
      (e.onStatus(
        `[runner:session] WARNING: ${a.label} update ${s} for ${e.sessionId} was never acked by the child \u2014 the stdin control channel may be severed (wrapper backgrounding without <&0?). Token rotation is NOT reaching the child; it will 401 at token TTL. See docs/self-hosted-runners-guide.md \xA7 "The child must keep the runner's stdin".`,
      ),
        e.pendingAcks.delete(s));
}
//@ chunk-hm0ce8vc.js:167833-169415 placement
function createDebouncedSender(e) {
  let n = e.errorRetryMs ?? 30000,
    max = Math.max(n, e.errorRetryMaxMs ?? 0),
    s = e.jitter ?? 0,
    a = e.expiryMarginMs ?? 60000,
    o = e.expiredRetryMs ?? { minMs: 30000, maxMs: 60000 },
    l = e.minRefreshGapMs ?? 30000,
    u = e.now ?? Date.now,
    h = e.random ?? Math.random,
    p,
    S = !1,
    T = !1,
    { intervalMs: intervalMs, ttlMs: ttlMs } = e,
    w = ttlMs === void 0 ? void 0 : u() + ttlMs,
    E,
    A = 0,
    G = !1,
    K = () => L();
  e.signal.addEventListener("abort", K, { once: !0 });
  function L() {
    if (((S = !0), p)) clearTimeout(p);
    e.signal.removeEventListener("abort", K);
  }
  function D(Ne) {
    let me = w !== void 0 && u() >= w - a;
    if (!Ne) return { delayMs: intervalMs, expired: me, transient: Ne };
    let Te;
    if (me) {
      let { minMs: minMs, maxMs: maxMs } = o;
      Te = Math.round(minMs + h() * Math.max(0, maxMs - minMs));
    } else {
      let min = Math.min(max, n * 2 ** A);
      Te = Math.round(min * (1 - s + 2 * s * h()));
    }
    return { delayMs: Math.min(Te, intervalMs), expired: me, transient: Ne };
  }
  function oe() {
    if (S || e.signal.aborted || T) return;
    T = !0;
    let Ne = u();
    E = Ne;
    let me, Te;
    Promise.resolve()
      .then(() => e.refresh())
      .then((Ye) => {
        A = 0;
        let He = typeof Ye === "number" ? { intervalMs: Ye } : (Ye ?? {});
        if (He.intervalMs !== void 0 && He.intervalMs > 0) intervalMs = He.intervalMs;
        if (He.ttlMs !== void 0 && He.ttlMs > 0) ttlMs = He.ttlMs;
        if (ttlMs !== void 0) w = Ne + ttlMs;
        if (He.nextInMs !== void 0 && He.nextInMs > 0) Te = He.nextInMs;
      })
      .catch((Ye) => {
        if (S || e.signal.aborted) return;
        if (((me = D(e.isTransient?.(Ye) ?? !0)), G)) me = { ...me, delayMs: 0 };
        (A++, e.onError(Ye, me));
      })
      .finally(() => {
        if (((T = !1), S || e.signal.aborted)) return;
        if (G) {
          ((G = !1), oe());
          return;
        }
        p = setTimeout(oe, me?.delayMs ?? Te ?? intervalMs);
      });
  }
  function ge({ force: Ne } = { force: !1 }) {
    if (S || e.signal.aborted) return "cancelled";
    if (T) return ((G ||= Ne), "in_flight");
    if (!Ne && E !== void 0 && u() - E < l) return "debounced";
    if (p) (clearTimeout(p), (p = void 0));
    return (oe(), "fired");
  }
  return ((p = setTimeout(oe, intervalMs)), { cancel: L, refreshNow: ge });
}
//@ chunk-hm0ce8vc.js:169415-169529 placement
function tokenRefreshIntervalMs(e) {
  if (!e || e <= 0) return 1440000;
  let floored = Math.floor(e * 1000 * 0.8);
  return Math.max(30000, Math.min(1440000, floored));
}
//@ chunk-hm0ce8vc.js:169529-169573 placement
function Kd(e) {
  return e && e > 0 ? e * 1000 : 1800000;
}
//@ chunk-hm0ce8vc.js:169573-169726 placement
var SESSION_POLL_MS = 30000,
  TOKEN_REFRESH_TIMING = {
    errorRetryMs: 5000,
    errorRetryMaxMs: 60000,
    jitter: 0.2,
    expiryMarginMs: 60000,
    expiredRetryMs: { minMs: 30000, maxMs: 60000 },
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
function Qc(e) {
  let n = getHttpStatus(e);
  return (
    !(e instanceof RemoteConfigWithoutInferenceAuthError) &&
    (isRetryableRunnerError(e) || n === 401 || n === 403)
  );
}
//@ chunk-hm0ce8vc.js:169967-170087 placement
function normalizeGovernedHost(e) {
  if (typeof e !== "string") return;
  let n = normalizeHost(e);
  if (n === "" || n.length > 255 || !Nut.test(n)) return;
  return isGithubDotCom(n) ? GITHUB_HOST : n;
}

export {
  normalizeGovernedHost,
  Us,
  Ss,
  Es,
  wo,
  Ls,
  Lr,
  Ti,
  retryWithBackoff,
  getCheckoutHookTimeoutMs,
  handleSelfHostedSession,
};
