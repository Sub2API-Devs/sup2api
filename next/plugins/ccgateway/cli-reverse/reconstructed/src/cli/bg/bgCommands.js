/**
 * cli/bg/bgCommands.ts
 *
 * 后台会话命令：--bg 启动、claude attach/logs/stop/rm/respawn 处理器，以及恢复/会话 id 等参数改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bg51yd13.js (60)
 * attribution: placement 60
 */
import { mkdir, writeFile, rm, readdir, lstat } from "fs/promises";
import { randomUUID } from "crypto";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import {
  getJobDir,
  makeInitialState,
  IDLE_DETAIL,
  IDLE_NEEDS,
  writeStateAtomic,
  readJobState,
  isExecLaunch,
  jobStateKey,
  invalidateJobStateCache,
  getJobsDir,
  listJobs,
  readJobStateAfterSettle,
  isTerminal,
  isSettled,
} from "../../services/daemon/jobState.js";
import { ensureJobTmpFolder } from "../../services/daemon/jobFolder.js";
import { env } from "../../utils/env.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import {
  ensureTombstoneScope,
  writeHostTombstone,
  encodeHostLineage,
  ensureDaemon,
} from "../../services/daemon/ensureDaemon.js";
import {
  hostManagedDir,
  hostManagedEntry,
  readDaemonToken,
  redactDaemonPipeKey,
} from "../../services/daemon/paths.js";
import {
  checkWorkspaceTrust,
  formatWorkspaceUntrusted,
  trackBgDispatch,
  describeRoutineTriggers,
  defaultShellForPlatform,
  dispatchViaDaemon,
  BG_FLAG_NAMES,
  placeholderJobNameScore,
  ensureDaemonForDispatch,
  rankJobNameMatch,
  waitForDaemonReady,
  formatRmOutcome,
} from "./bgDispatch.js";
import { getCwd } from "../../utils/cwd.js";
import {
  errorMessage,
  sanitizeErrnoForTelemetry,
  sanitizeErrorName,
  isENOENT,
  sanitizedErrCodeForTelemetry,
  getErrnoCode,
  DAEMON_UNREACHABLE_TIMEOUT_PHRASE,
  extractErrnoTokens,
  DAEMON_EXITED_BEFORE_REACHABLE_PHRASE,
} from "../../utils/errors.js";
import {
  moveSkipPermissionsLast,
  splitForwardableArgs,
  stripForwardedFlags,
  BOOLEAN_FORWARDED_FLAGS,
  FORWARDED_VALUE_FLAGS,
  SINGLE_LETTER_FLAGS,
  BACKGROUND_FORWARDED_VALUE_FLAGS,
  VARIADIC_FORWARDED_FLAGS,
} from "../forwardedFlags.js";
import { isWindowsDevicePath } from "../../utils/windowsUncPaths.js";
import { findAgentExcludingWebFetch } from "../../tools/WebFetchTool/harnessNotes.js";
import { getAgentDefinitionsWithOverrides } from "../../tools/AgentTool/loadAgentsDir.js";
import { logForDebugging } from "../../utils/debug.js";
import { isEnvTruthy, isRestrictedMode } from "../../utils/envUtils.js";
import { withHostEnvRestored_2, withHostOwnedEnv } from "../../utils/settings/hostEnvWrites.js";
import {
  isPersonalConfigRestricted,
  getPersonalConfigFixHint,
} from "../../utils/personalConfigRestriction.js";
import { collectProviderPassthroughEnv, sanitizeLogLine, getSecureStorageConfigDir } from "./bgSpawnEnv.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import {
  BG_PROTO,
  SHORT_RE,
  RESPAWNING_ATTACH_CODE,
  RESPAWN_REASON_UPGRADE,
  RESPAWN_REASON_STALL,
  RESPAWN_REASON_LEGACY,
  TRANSIENT_ATTACH_CODE,
  RACED_SOCKET_GAP,
  SUPERVISOR_DETACH_CODE,
  HOST_DIED_DETAIL,
  FATAL_ATTACH_CODE,
  KICKED_ATTACH_CODE,
  HOST_DEAD_ATTACH_CODE,
  HOST_DIED_EXEC_ATTACH_MESSAGE,
  HOST_DIED_ATTACH_MESSAGE,
} from "../../services/daemon/leaseProtocol.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { isTranscriptFileResumeArg } from "../../utils/sessionStoragePortable.js";
import { CLAUDE_BG_GATEWAY_WITHHELD } from "../../services/api/errors.js";
import { formatForkMarker } from "../../utils/conversationRecovery.js";
import { buildBgDispatcherEnv } from "../../utils/subprocessEnv.js";
import { ownStoredLoginPlanAttributes } from "../../utils/auth.js";
import { controlRequest, subscribeControl } from "../../services/daemon/controlClient.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { bgSupervisorNoun, daemonHint, bgSupervisorNounCap } from "../../utils/fleetGates.js";
import {
  probeDaemonJob,
  hasConversationToResume,
  killJob,
  WORKTREE_DIGEST_PATTERN,
  deleteJob,
} from "../../daemon/jobs/killJob.js";
import { listLiveSessionHolders } from "../../utils/sessionAttach.js";
import {
  logFeatureSadAsync,
  logFeatureBadAsync,
  logFeatureOkAsync,
} from "../../services/analytics/featureTelemetry.js";
import { hasRemoteBackendFlags, rejectBgWithEnvironmentFlags } from "../cloudSessionArgs.js";
import { isSameRealPath } from "../../utils/fsJunctions.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { setIsInteractive, getProjectConfigRoot } from "../../bootstrap/state.js";
import { drainConfigWrites, getGlobalConfig } from "../../utils/config.js";
import { queuePromptForJob, queuedPromptOrUndefined } from "../../services/daemon/spawnLauncher.js";
import { respawnBgSession } from "./bgSpare.js";
import { uniq } from "../../utils/collections.js";
import {
  sanitizeSessionTitle,
  plural,
  collapseWhitespace,
  stripFormatChars,
} from "../../utils/stringUtils.js";
import { isStdinUnusableError, peekForStdinData, handleStreamGoneErrors } from "../../utils/process.js";
import { sequential } from "../../utils/sequential.js";
import {
  backgroundSessionVerbIndex,
  eagerCliFlagHonoredIndices,
  eagerParseCliFlag,
  eagerParseCliFlagAll,
  eagerHasCliFlag,
} from "../../utils/cliArgs.js";
import { isDoneJob } from "../../components/fleet/FleetNudgeStore.js";
import { truncateWithEllipsis } from "../../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { exitAfterAnalyticsFlush, writeStdoutAndDrain } from "../exit.js";
import { cursorPosition, csi, ERASE_LINE } from "../../ink/termio/csi.js";
import { attachToJob, containsInterruptKey } from "../../daemon/attach/attachJob.js";
import { sleep } from "../../utils/sleep.js";
import { drainStdin } from "../../ink/ink.js";
import { updateAttachBeacon, startAttachBeacon, clearAttachBeacon } from "../../daemon/jobs/attachBeacon.js";
import {
  reportAttachTelemetry,
  isBackgroundSessionGone,
  ENORESPONSE,
  SESSION_NOT_RESPONDING_TEXT,
} from "../../daemon/jobs/attachErrors.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { getPlatform } from "../../utils/platform.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { earlyArgsToArgv } from "../earlyArgs.js";
import { appliedSettingSourcesFlagValue, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { writePendingWakeup } from "../../utils/scheduledWakeup.js";
import { markJobStoppedOnRow } from "../../services/daemon/jobRow.js";
import { isValidGitSha } from "../../utils/git/gitFilesystem.js";
import { printableLabel } from "../../utils/printableName.js";
import { isAcceptableModelArg } from "../../services/daemon/processLiveness.js";
import { looksLikeAgentsJson } from "../agentsArg.js";
import { hasSkipDangerousModePermissionPrompt, hasAutoModeOptIn } from "../../utils/settings/settings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bg51yd13.js:27567-27615 placement
function gateCauseExtra(gateCause) {
  return gateCause
    ? [
        {
          gate_cause: fromEnum(gateCause),
        },
      ]
    : [];
}
//@ chunk-bg51yd13.js:27615-27700 placement
function workspaceGateCause(verdict) {
  return verdict.unresolvable ? "workspace_unresolvable" : "workspace_untrusted";
}
//@ chunk-bg51yd13.js:27700-28705 placement
async function preSeedReplBgJob(sessionId, options, storage) {
  let hostKey = sessionId.slice(0, 8);
  let jobDir = getJobDir(hostKey);
  await ensureJobTmpFolder(hostKey, storage);
  let intent = options.intent ?? "";
  let state = {
    ...makeInitialState({
      template: {
        name: "bg",
        description: "",
      },
      intent,
      name: options.name,
      nameSource: options.nameSource,
      color: options.color,
      detail: options.detail ?? IDLE_DETAIL,
      tempo: "blocked",
      needs: IDLE_NEEDS,
      sessionId,
      cwd: options.cwd,
      worktreePath: options.worktree?.path,
      worktreeBranch: options.worktree?.branch,
      worktreeHookBased: options.worktree?.hookBased,
      originCwd: options.worktree?.originCwd,
      bgIsolation: "none",
      interactiveLineage: true,
      providerEnv: callerProviderEnv(),
      sessionPermissionRules: options.sessionPermissionRules,
      memoryToggledOff: options.memoryToggledOff,
      autoMemoryOffThisSession: options.autoMemoryOffThisSession,
      linkScanPath: options.linkScanPath,
      inFlight: options.inFlight,
      respawnFlags: options.respawnFlags,
    }),
    ...(options.keptBy !== undefined && {
      keptBy: options.keptBy,
    }),
    ...(options.createdAt !== undefined && {
      createdAt: options.createdAt,
    }),
  };
  await writeStateAtomic(jobDir, state, storage);
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)
    if (isStorageV5Enabled() && storage !== undefined && isValidKeySegment(hostKey)) {
      await ensureTombstoneScope(storage);
      await writeHostTombstone(storage, hostKey, encodeHostLineage(state.providerEnv));
    } else {
      await mkdir(hostManagedDir(), {
        recursive: true,
        mode: 448,
      });
      await writeFile(hostManagedEntry(hostKey), encodeHostLineage(state.providerEnv));
    }
  return {
    short: hostKey,
    jobDir,
    state,
  };
}
//@ chunk-bg51yd13.js:28705-29384 placement
async function spawnBgSession(
  argv,
  requestedSessionId,
  launchMode = "shell",
  requestedCwd,
  launchOptions,
  options,
  requestedShort,
  storage,
) {
  let flagError = validateBgLaunchFlags(argv);
  if (flagError)
    return {
      ok: false,
      error: flagError,
      reason: "gate_blocked",
      gateCause: "disclaimer",
    };
  let trust = checkWorkspaceTrust(requestedCwd ?? getCwd());
  if (trust.verdict === "untrusted")
    return {
      ok: false,
      error: formatWorkspaceUntrusted(trust),
      reason: "gate_blocked",
      gateCause: workspaceGateCause(trust),
    };
  let cwd = requestedCwd === undefined ? undefined : trust.cwd;
  let sessionId = requestedSessionId ?? randomUUID();
  let short = requestedShort ?? sessionId.slice(0, 8);
  let jobDir = getJobDir(short);
  return trackBgDispatch(
    short,
    (async () => {
      try {
        await ensureJobTmpFolder(short, storage);
        return await spawnBgSession_2(
          argv,
          launchMode,
          cwd,
          launchOptions,
          options,
          {
            sessionId,
            short,
            jobDir,
            freshDir: requestedSessionId === undefined,
          },
          trust.verdict === "session",
          storage,
        );
      } catch (error) {
        if (launchMode !== "fleet" && launchMode !== "spare")
          if (storage) await removeJobStorage(storage, short);
          else
            await rm(jobDir, {
              recursive: true,
              force: true,
            }).catch(() => {});
        return {
          ok: false,
          error: `Couldn't start the session \u2014 ${errorMessage(error)}`,
          reason: `spawn_failed_${sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error) ?? "unknown"}`,
        };
      }
    })(),
  );
}
//@ chunk-bg51yd13.js:29384-36584 placement
/**
 * 解析 --bg 启动参数（--agent、--name、--fork-session、恢复参数）并通过守护进程或回退路径启动后台会话（约 7 KB）。
 */
async function spawnBgSession_2(
  argv,
  launchMode,
  cwd,
  launchOptions,
  extraEnv,
  jobIdentity,
  isWorkspaceTrusted,
  storage,
) {
  let { sessionId, short, jobDir, freshDir } = jobIdentity;
  let dashDashIndex = findDashDashIndex(argv);
  let argsBeforeDashDash = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv;
  let agentName = getFlagValue(argsBeforeDashDash, "--agent");
  let routine = undefined;
  let nameFlag = getFlagValue(argsBeforeDashDash, "--name", "-n");
  let sessionName = nameFlag ?? launchOptions?.name;
  let resumeArg = getResumeArg(argsBeforeDashDash);
  let positionalPrompt =
    dashDashIndex >= 0 ? argv.slice(dashDashIndex + 1).join(" ") : findLastPositionalArg(argv, resumeArg);
  let flagValueIndices = getFlagValueIndices(argsBeforeDashDash);
  let hasResumeFlag = hasResumeOrContinueFlag(argsBeforeDashDash);
  let hasForkSessionFlag = hasBareFlag(argsBeforeDashDash, "--fork-session");
  let argsWithoutResume = stripResumeFlags(argsBeforeDashDash);
  let bgIsolation =
    launchOptions?.bgIsolation === "default"
      ? undefined
      : launchMode === "repl"
        ? "none"
        : launchOptions?.bgIsolation;
  let providerEnv = launchOptions?.providerEnv ?? callerProviderEnv();
  let sessionPermissionRules = launchOptions?.sessionPermissionRules;
  let memoryToggledOff = launchOptions?.memoryToggledOff;
  let autoMemoryOffThisSession = launchOptions?.autoMemoryOffThisSession;
  let forkSourceAlive = launchOptions?.forkSourceAlive;
  let forkBoundaryAt = launchOptions?.forkBoundaryAt;
  let forkSessionId = launchOptions?.forkSessionId;
  let forkParentSessionId = launchOptions?.forkParentSessionId;
  let respawnFlags = moveSkipPermissionsLast(
    splitForwardableArgs(dashDashIndex >= 0 ? argsWithoutResume : keepFlagArgsOnly(argsWithoutResume)),
  );
  if (launchMode === "shell") {
    let baseCwd = cwd ?? getCwd();
    let keptArgs = stripForwardedFlags(argsWithoutResume);
    let uncPaths = [
      ...argsWithoutResume.filter((arg, index) => keptArgs[index] !== arg),
      ...(isWindowsDevicePath(baseCwd) ? [baseCwd] : []),
      ...(launchOptions?.exec && isWindowsDevicePath(launchOptions.exec) ? [launchOptions.exec] : []),
      ...(resumeArg !== undefined && isWindowsDevicePath(resumeArg) ? [resumeArg] : []),
    ];
    if (uncPaths.length > 0)
      process.stderr
        .write(`warning: background sessions do not support Windows network (UNC) paths; the following will be neutralized: ${uncPaths.join(", ")}
`);
  }
  let isResumeSameSession = resumeArg !== undefined && resumeArg === sessionId;
  let forkArgs = hasResumeFlag && !hasForkSessionFlag ? ["--fork-session"] : [];
  let sessionIdArgs = isResumeSameSession ? [] : ["--session-id", sessionId, ...forkArgs];
  if (
    launchMode === "shell" &&
    argsBeforeDashDash.some(
      (arg, index) =>
        !flagValueIndices.has(index) && (arg === "--session-id" || arg.startsWith("--session-id=")),
    )
  )
    process.stderr
      .write(`warning: --bg manages the session id; ignoring --session-id (use --resume <id> to continue an existing session)
`);
  let agentDefinition = agentName
    ? findAgentExcludingWebFetch(
        (await getAgentDefinitionsWithOverrides(cwd ?? getCwd(), storage)).activeAgents,
        agentName,
      )
    : undefined;
  if (agentName && !agentDefinition && launchMode === "shell")
    process.stderr.write(`warning: no agent named '${agentName}' \u2014 spawning with default template
`);
  let routineDef = undefined;
  let intent = launchOptions?.intent ?? positionalPrompt ?? "";
  let isIdleLaunch =
    !agentDefinition?.initialPrompt &&
    !launchOptions?.exec &&
    !positionalPrompt &&
    !argsBeforeDashDash.some((arg, index) => !flagValueIndices.has(index) && arg === "--reply-on-resume");
  let didSeedState = false;
  let seedWrite;
  if (launchMode !== "fleet" && launchMode !== "spare") {
    let existingState = freshDir ? null : await readJobState(jobDir, storage);
    if (existingState === null)
      seedWrite = writeStateAtomic(
        jobDir,
        makeInitialState({
          template: {
            name: launchOptions?.exec ? "exec" : (agentName ?? undefined ?? "bg"),
            description: agentDefinition?.whenToUse ?? routineDef?.description ?? "",
            initialPrompt: agentDefinition?.initialPrompt,
            color: agentDefinition?.color,
          },
          routine: undefined,
          respawnFlags,
          intent,
          name: sessionName,
          nameSource: nameFlag
            ? nameFlag === launchOptions?.name && launchOptions.nameSource
              ? launchOptions.nameSource
              : "user"
            : launchOptions?.nameSource,
          color: launchOptions?.color,
          detail:
            launchOptions?.detail ??
            (isIdleLaunch
              ? routineDef
                ? `(idle \u2014 waiting for ${describeRoutineTriggers(routineDef.triggers)})`
                : IDLE_DETAIL
              : undefined),
          tempo: isIdleLaunch ? (routineDef ? "idle" : "blocked") : undefined,
          needs: isIdleLaunch && !routineDef ? IDLE_NEEDS : undefined,
          sessionId,
          cwd: cwd ?? getCwd(),
          worktreePath: launchOptions?.worktree?.path,
          worktreeBranch: launchOptions?.worktree?.branch,
          worktreeHookBased: launchOptions?.worktree?.hookBased,
          originCwd: launchOptions?.worktree?.originCwd,
          bgIsolation,
          interactiveLineage: launchMode === "repl" ? true : undefined,
          inFlight: launchOptions?.inFlight,
          providerEnv,
          sessionPermissionRules,
          memoryToggledOff,
          autoMemoryOffThisSession,
          forkSourceAlive,
          forkBoundaryAt,
          forkSessionId: launchOptions?.forkSessionId,
          forkParentSessionId,
        }),
        storage,
      )
        .then(() => {
          didSeedState = true;
        })
        .catch((error) =>
          logForDebugging(`bg seed state write failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
    else if (respawnFlags.length > 0 && existingState.respawnFlags.length === 0)
      seedWrite = writeStateAtomic(
        jobDir,
        {
          ...existingState,
          respawnFlags,
        },
        storage,
      ).catch((error) =>
        logForDebugging(`bg respawnFlags patch failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
  }
  let autoModeServer =
    isEnvTruthy(providerEnv.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) &&
    isEnvTruthy(env.CLAUDE_CODE_AUTO_MODE_SERVER)
      ? (withHostEnvRestored_2(() => env.CLAUDE_CODE_AUTO_MODE_SERVER) ?? "")
      : env.CLAUDE_CODE_AUTO_MODE_SERVER;
  let restrictsPersonalConfig = isPersonalConfigRestricted();
  let personalConfigFixHint = restrictsPersonalConfig ? getPersonalConfigFixHint() : undefined;
  let isInheritingEnv =
    !launchOptions?.exec &&
    (launchMode === "repl" || (!launchOptions?.providerEnv && !cwd) || cwd === getCwd());
  let ANTHROPIC_BASE_URL =
    !launchOptions?.exec && !isInheritingEnv && cwd
      ? withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv)).ANTHROPIC_BASE_URL
      : undefined;
  let withheldCwd =
    ANTHROPIC_BASE_URL !== undefined && !isFirstPartyAnthropicHost(ANTHROPIC_BASE_URL) ? cwd : undefined;
  if (withheldCwd)
    logForDebugging("bg: this session's ANTHROPIC_BASE_URL is not passed to a session in another folder");
  let descriptor = {
    proto: BG_PROTO,
    short,
    sessionId,
    createdAt: Date.now(),
    source: launchMode === "repl" ? "slash" : launchMode,
    cwd: cwd ?? getCwd(),
    launch: launchOptions?.exec
      ? {
          mode: "exec",
          ...defaultShellForPlatform(launchOptions.exec),
        }
      : hasResumeFlag && resumeArg !== undefined
        ? {
            mode: "resume",
            sessionId: resumeArg,
            transcriptPath: launchOptions?.resumeTranscriptPath,
            restoresTranscript:
              normalizeUuidOrNull(resumeArg) !== null ||
              isTranscriptFileResumeArg(resumeArg) ||
              launchOptions?.resumeTranscriptPath !== undefined,
            fork: !isResumeSameSession && (hasForkSessionFlag || forkArgs.length > 0),
            flagArgs: [...argsWithoutResume, ...(dashDashIndex >= 0 ? argv.slice(dashDashIndex) : [])],
          }
        : {
            mode: "prompt",
            args: [...sessionIdArgs, ...stripSessionIdFlag(argv)],
            restoresTranscript: hasContinueOrResumeId(argv),
          },
    respawnFlags: argsWithoutResume,
    env: {
      ...providerEnv,
      ...(isEnvTruthy(providerEnv.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) &&
        env.CLAUDE_CODE_HOST_CREDS_FILE && {
          CLAUDE_CODE_HOST_CREDS_FILE: env.CLAUDE_CODE_HOST_CREDS_FILE,
        }),
      ...(env.CLAUDE_CODE_EXTRA_BODY && {
        CLAUDE_CODE_EXTRA_BODY: env.CLAUDE_CODE_EXTRA_BODY,
      }),
      ...(env.CLAUDE_CODE_DISABLE_PROACTIVITY
        ? {
            CLAUDE_CODE_DISABLE_PROACTIVITY: "1",
          }
        : {}),
      ...(restrictsPersonalConfig && {
        CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG: "1",
      }),
      ...(personalConfigFixHint !== undefined && {
        CLAUDE_CODE_PERSONAL_CONFIG_FIX: personalConfigFixHint,
      }),
      ...(autoModeServer !== undefined && {
        CLAUDE_CODE_AUTO_MODE_SERVER: autoModeServer,
      }),
      ...(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && {
        CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: "1",
      }),
      ...(env.CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS && {
        CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS: "1",
      }),
      ...(env.CLAUDE_CODE_DISABLE_FILE_MENTIONS && {
        CLAUDE_CODE_DISABLE_FILE_MENTIONS: "1",
      }),
      ...(env.CLAUDE_CODE_AUTO_MODE_TIER !== undefined && {
        CLAUDE_CODE_AUTO_MODE_TIER: env.CLAUDE_CODE_AUTO_MODE_TIER,
      }),
      ...(env.CLAUDE_CODE_AUTO_MODE_MODEL && {
        CLAUDE_CODE_AUTO_MODE_MODEL: env.CLAUDE_CODE_AUTO_MODE_MODEL,
      }),
      ...(env.PATH && {
        PATH: env.PATH,
      }),
      ...(env.CLAUDE_CODE_PLUGIN_DIRS && {
        CLAUDE_CODE_PLUGIN_DIRS: env.CLAUDE_CODE_PLUGIN_DIRS,
      }),
      ...(isInheritingEnv && withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv))),
      ...(withheldCwd && {
        [CLAUDE_BG_GATEWAY_WITHHELD]: withheldCwd,
      }),
      ...(bgIsolation && {
        CLAUDE_BG_ISOLATION: bgIsolation,
      }),
      ...(sessionPermissionRules && {
        CLAUDE_BG_SESSION_PERMISSION_RULES: JSON.stringify(sessionPermissionRules),
      }),
      ...(memoryToggledOff && {
        CLAUDE_BG_MEMORY_TOGGLED_OFF: "1",
      }),
      ...(autoMemoryOffThisSession && {
        CLAUDE_BG_AUTO_MEMORY_OFF: "1",
      }),
      ...(forkSourceAlive && {
        CLAUDE_CODE_RESUME_SOURCE_ALIVE: forkSessionId
          ? formatForkMarker(forkSessionId, forkBoundaryAt || "1", forkParentSessionId)
          : forkBoundaryAt || "1",
      }),
    },
    reattachEnv: {
      ...extraEnv,
      ...(!launchOptions?.exec && {
        ...buildBgDispatcherEnv(ownStoredLoginPlanAttributes()),
        ...(isWorkspaceTrusted && {
          CLAUDE_BG_WORKSPACE_TRUSTED: "1",
        }),
      }),
    },
    worktree: launchOptions?.worktree
      ? {
          path: launchOptions.worktree.path,
          ownershipToken: sessionId,
        }
      : undefined,
    isolation:
      agentDefinition?.isolation === "worktree" && agentDefinition.source !== "built-in"
        ? "worktree"
        : "none",
    agent: agentName,
    routine: undefined,
    seed: {
      intent,
      name: sessionName,
    },
    cols: process.stdout.columns || undefined,
    rows: process.stdout.rows || undefined,
  };
  let [, dispatchResult] = await Promise.all([
    seedWrite ?? Promise.resolve(),
    dispatchViaDaemon(descriptor, false, Date.now(), storage),
  ]);
  if (dispatchResult.ok) {
    if (dispatchResult.reattachEnvDropped !== undefined) warnHomeTrustFallback(descriptor, launchMode);
    return {
      ok: true,
      short,
      sessionId,
      idle: isIdleLaunch,
      name: sessionName,
    };
  }
  let detail = dispatchResult.reason === "cwd-gone" ? dispatchResult.detail : undefined;
  if (
    dispatchResult.reason === "ack-timeout" ||
    dispatchResult.reason === "enoconn" ||
    dispatchResult.reason === "estarting"
  ) {
    let listResult = await controlRequest({
      proto: BG_PROTO,
      op: "list",
    });
    if (
      listResult.ok &&
      listResult.op === "list" &&
      listResult.jobs.some((job) => job.short === short && job.nonce === dispatchResult.nonce && !job.outcome)
    ) {
      logForDebugging(`bg: daemon dispatch ${dispatchResult.reason} but worker is live`, {
        level: "warn",
      });
      warnHomeTrustFallback(descriptor, launchMode);
      await logEventAsync("tengu_bg_dispatch_rescued", {
        reason_ack_timeout: dispatchResult.reason === "ack-timeout",
        reason_enoconn: dispatchResult.reason === "enoconn",
        reason_estarting: dispatchResult.reason === "estarting",
      });
      return {
        ok: true,
        short,
        sessionId,
        idle: isIdleLaunch,
        name: sessionName,
        rescued: true,
      };
    }
    if (
      dispatchResult.reason === "ack-timeout" &&
      listResult.ok &&
      listResult.op === "list" &&
      !listResult.jobs.some((job) => job.short === short)
    ) {
      let redispatchResult = await controlRequest(
        {
          proto: BG_PROTO,
          op: "dispatch",
          d: {
            ...descriptor,
            nonce: dispatchResult.nonce,
          },
          timeoutMs: 5000,
          auth: await readDaemonToken(),
        },
        {
          timeoutMs: 6000,
        },
      );
      if (redispatchResult.ok && redispatchResult.op === "dispatch") {
        logForDebugging(`bg: ack-timeout recovered via redispatch (${short})`, {
          level: "warn",
        });
        await logEventAsync("tengu_bg_dispatch_rescued", {
          reason_ack_timeout: true,
          reason_enoconn: false,
          reason_estarting: false,
          via_redispatch: true,
        });
        return {
          ok: true,
          short,
          sessionId,
          idle: isIdleLaunch,
          name: sessionName,
          rescued: true,
        };
      }
      if (!redispatchResult.ok && "code" in redispatchResult && redispatchResult.code === "ECWDGONE")
        detail = redispatchResult.error;
    }
  }
  if (didSeedState)
    if (storage) await removeJobStorage(storage, short);
    else
      await rm(jobDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  if (dispatchResult.reason === "short-alive")
    return {
      ok: false,
      alive: true,
      short,
      error: `Session ${short} is already running \u2014 \`claude attach ${short}\` to join it`,
      reason: "short_alive",
    };
  if (dispatchResult.reason === "stale-short")
    return {
      ok: false,
      error: "Previous session is still shutting down \u2014 try again in a moment",
      reason: "stale_short",
    };
  if (dispatchResult.reason === "cwd-gone" || detail !== undefined)
    return {
      ok: false,
      error: `Couldn't start a background session (${detail ?? dispatchResult.detail})`,
      reason: "cwd_gone",
    };
  let dispatchDetail =
    dispatchResult.reason === "daemon-unreachable" && dispatchResult.detail
      ? dispatchResult.detail
      : describeDispatchFailure(dispatchResult.reason);
  return {
    ok: false,
    error: `Couldn't reach the ${bgSupervisorNoun()} (${dispatchDetail})${daemonHint("status")}`,
    reason:
      dispatchResult.reason === "daemon-unreachable"
        ? `daemon_unavailable_${classifyDaemonError(dispatchResult.detail)}`
        : dispatchResult.reason.replace(/-/g, "_"),
  };
}
//@ chunk-bg51yd13.js:36584-36954 placement
/**
 * 会话记录了 CLAUDE_BG_WORKSPACE_TRUSTED（守护进程只能走回退派发路径、没继承本终端的主目录信任）时写调试日志警告；shell 模式下同时打印到 stderr。
 */
function warnHomeTrustFallback(descriptor, launchMode) {
  if (descriptor.reattachEnv?.CLAUDE_BG_WORKSPACE_TRUSTED === undefined) return;
  let message = `warning: session ${descriptor.short} started without this terminal's home-directory trust (the ${bgSupervisorNoun()} could only take its fallback dispatch path), so hooks and project settings from your home directory stay off in it`;
  logForDebugging(`bg: ${message}`, {
    level: "warn",
  });
  if (launchMode === "shell")
    process.stderr.write(`${message}
`);
}
//@ chunk-bg51yd13.js:36954-38133 placement
/**
 * 判定 --bg 带 --resume/--continue 时怎么处理：plain（没有恢复）、copy（另起副本，带原因：unresolved/running/open-elsewhere/handle-taken/unreadable/restricted/own-options）、continue（原地唤醒同 id 的后台会话，附带要投递的提示词）。
 */
async function resolveBgResumeTarget(argv, options) {
  let storageV5 = options?.storageV5;
  let dashDashIndex = findDashDashIndex(argv);
  let args = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv.slice();
  if (!hasResumeOrContinueFlag(args) || hasBareFlag(args, "--fork-session"))
    return {
      kind: "plain",
    };
  let resumeArg = getResumeArg(args);
  let sessionId =
    resumeArg !== undefined &&
    normalizeUuidOrNull(resumeArg) !== null &&
    resumeArg === resumeArg.toLowerCase()
      ? resumeArg
      : null;
  if (sessionId === null)
    return {
      kind: "copy",
      reason: "unresolved",
      original: undefined,
    };
  let short = sessionId.slice(0, 8);
  let openReason = await checkSessionOpenElsewhere(sessionId);
  if (openReason !== null)
    return {
      kind: "copy",
      reason: openReason,
      original: short,
    };
  let existingJob = null;
  let wakePrompt;
  let jobState = await readJobState(getJobDir(short), storageV5);
  if (jobState === null) {
    if (await jobStateExists(short, storageV5))
      return {
        kind: "copy",
        reason: "unreadable",
        original: short,
      };
  } else
    existingJob = {
      jobId: short,
      state: jobState,
    };
  if (existingJob !== null) {
    let { state } = existingJob;
    if (state.sessionId !== sessionId || isExecLaunch(state))
      return {
        kind: "copy",
        reason: "handle-taken",
        original: short,
      };
    if (state.resumeSessionId && state.resumeSessionId !== sessionId) {
      let openReason = await checkSessionOpenElsewhere(state.resumeSessionId);
      if (openReason !== null)
        return {
          kind: "copy",
          reason: openReason,
          original: short,
        };
    }
  }
  for (let daemonShort of new Set([short, existingJob?.state.daemonShort ?? short])) {
    let probe = await probeDaemonJob(daemonShort, storageV5);
    if (probe.alive || probe.present)
      return {
        kind: "copy",
        reason: "running",
        original: short,
      };
  }
  if (existingJob !== null) {
    if (options?.restricted)
      return {
        kind: "copy",
        reason: "restricted",
        original: short,
      };
    let strippedArgs = stripResumeFlags(args);
    let promptIndex = dashDashIndex >= 0 ? -1 : findPromptArgIndex(strippedArgs);
    if (strippedArgs.length > (promptIndex >= 0 ? 1 : 0))
      return {
        kind: "copy",
        reason: "own-options",
        original: short,
      };
    wakePrompt =
      (dashDashIndex >= 0 ? argv.slice(dashDashIndex + 1).join(" ") : strippedArgs[promptIndex]) || undefined;
  }
  return {
    kind: "continue",
    sessionId,
    wakeRow:
      existingJob === null
        ? null
        : {
            ...existingJob,
            prompt: wakePrompt,
          },
  };
}
//@ chunk-bg51yd13.js:38133-38341 placement
async function checkSessionOpenElsewhere(sessionId) {
  let holders;
  try {
    holders = await listLiveSessionHolders(sessionId, {
      rejectUnreadable: true,
    });
  } catch {
    return "unverified";
  }
  if (holders.length === 0) return null;
  return holders.some((holder) => holder.kind === "bg" || holder.kind === "daemon-worker")
    ? "running"
    : "open-elsewhere";
}
//@ chunk-bg51yd13.js:38341-38513 placement
async function jobStateExists(short, storageV5) {
  if (storageV5) {
    let meta = await storageV5.statMeta(jobStateKey(short));
    return meta.ok || meta.error.code !== "NotFound";
  }
  try {
    return (await readdir(getJobDir(short))).includes("state.json");
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-bg51yd13.js:38513-39829 placement
/**
 * 按 resolveBgResumeTarget 给出的 copy 原因生成 "note: …started a copy as <short>" 提示文字。
 */
function formatResumeCopyNote(resumeResult, copyShort) {
  switch (resumeResult.reason) {
    case "running":
      return `note: session ${resumeResult.original} is already running in the background, so this started a copy as ${copyShort}. \`claude attach ${resumeResult.original}\` opens the original.`;
    case "open-elsewhere":
      return `note: session ${resumeResult.original} is open in another Claude Code process, so this started a copy as ${copyShort}. The original conversation is unchanged.`;
    case "handle-taken":
      return `note: another background session already uses the id ${resumeResult.original}, so this started a copy as ${copyShort}.`;
    case "unresolved":
      return `note: started a copy of that conversation as ${copyShort}. To continue a session under its own id, pass its full session id (lowercase, as \`claude agents --json\` prints it) to --resume.`;
    case "unverified":
      return `note: could not check whether session ${resumeResult.original} is running, so this started a copy as ${copyShort}.`;
    case "unreadable":
      return `note: could not read the saved state of background session ${resumeResult.original}, so this started a copy as ${copyShort}.`;
    case "own-options":
      return `note: background session ${resumeResult.original} keeps its own saved options, so the flags you passed started a copy as ${copyShort}. Without flags, the same command continues ${resumeResult.original} itself.`;
    case "restricted":
      return `note: a restricted shell does not wake background session ${resumeResult.original} in place, so this started a restricted copy as ${copyShort}.`;
  }
}
//@ chunk-bg51yd13.js:39829-42089 placement
/**
 * 处理命令行中的 --bg：判断是标志还是文本，校验与 --print 等冲突，转入后台启动。
 */
async function handleBgFlag(argv, storage) {
  if (stripBgOnlyFlags(argv).length === argv.length) {
    let bgFlag = argv.find((arg) => BG_FLAG_NAMES.includes(arg)) ?? "--bg";
    process.stderr
      .write(`Couldn't tell whether ${bgFlag} is a flag or text here, so nothing was started. To start a background session put it first: claude --bg <prompt>
`);
    await logFeatureSadAsync("cli_bg_dispatch", "flag_not_stripped");
    process.exitCode = 1;
    return;
  }
  let dashDashIndex = findDashDashIndex(argv);
  let headArgs = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv;
  let flagValueIndices = getFlagValueIndices(headArgs);
  let index = headArgs.findIndex(
    (arg, argIndex) => !flagValueIndices.has(argIndex) && (arg === "--exec" || arg.startsWith("--exec=")),
  );
  if (index !== -1) {
    let inlineExec = argv[index].includes("=") ? argv[index].slice(argv[index].indexOf("=") + 1) : undefined;
    let execCommand = inlineExec ?? argv.slice(index + 1).join(" ");
    if (!execCommand.trim()) {
      process.stderr.write(`--exec requires a command.
`);
      process.exitCode = 1;
      return;
    }
    let restArgs = stripBgOnlyFlags([
      ...argv.slice(0, index),
      ...(inlineExec !== undefined ? argv.slice(index + 1) : []),
    ]);
    let flagValue = getFlagValue(restArgs, "--name", "-n");
    let flagValueIndices = getFlagValueIndices(restArgs);
    let dashDashIndex = findDashDashIndex(restArgs);
    let argsBeforeDashDash = dashDashIndex >= 0 ? restArgs.slice(0, dashDashIndex) : restArgs;
    let filtered = argsBeforeDashDash.filter((arg, argIndex) => !flagValueIndices.has(argIndex));
    if (hasRemoteBackendFlags(filtered)) {
      process.stderr.write(`${rejectBgWithEnvironmentFlags(restArgs)}
`);
      process.exitCode = 1;
      return;
    }
    let filtered_2 = argsBeforeDashDash.filter(
      (arg, argIndex) =>
        !flagValueIndices.has(argIndex) &&
        looksLikeFlag(arg) &&
        !/^(-n|--name)(=|$)/.test(arg) &&
        !/^-n./.test(arg),
    );
    if (filtered_2.length > 0)
      process.stderr.write(`warning: --exec ignores ${filtered_2.join(" ")} (only --name composes)
`);
    await promptBgWorkspaceTrust(getCwd(), storage);
    let bgSession = await spawnBgSession(
      [],
      undefined,
      "shell",
      undefined,
      {
        intent: execCommand,
        exec: execCommand,
        ...(flagValue && {
          name: flagValue,
          nameSource: "user",
        }),
      },
      undefined,
      undefined,
      storage,
    );
    if (!bgSession.ok) {
      if (bgSession.reason === "cwd_gone") await logFeatureSadAsync("cli_bg_dispatch_exec", "cwd_gone");
      else await logFeatureBadAsync("cli_bg_dispatch_exec", bgSession.reason ?? "spawn_failed");
      process.stderr.write(`${bgSession.error}
`);
      process.exitCode = 1;
      return;
    }
    await logFeatureOkAsync("cli_bg_dispatch_exec");
    process.stdout.write(
      formatBgHints(bgSession.short, undefined, flagValue || execCommand) +
        `
`,
    );
    await placeholderJobNameScore(storage);
    return;
  }
  let restricted = isRestrictedMode();
  let argsWithRestricted = stripBgOnlyFlags(restricted ? ["--restricted", ...argv] : argv);
  let bgStdin = await readBgStdin();
  let argsWithStdin = bgStdin ? appendPromptToArgs(argsWithRestricted, bgStdin) : argsWithRestricted;
  let resumeArgs = bgStdin ? appendPromptToArgs(stripBgOnlyFlags(argv), bgStdin) : stripBgOnlyFlags(argv);
  let resumeResult = await resolveBgResumeTarget(resumeArgs, {
    restricted,
    storageV5: storage,
  });
  if (resumeResult.kind === "continue" && resumeResult.wakeRow !== null) {
    await promptBgWorkspaceTrust(resumeResult.wakeRow.state.cwd, storage);
    await wakeExistingBgSession(resumeResult.wakeRow, resumeArgs, restricted, storage);
    return;
  }
  await promptBgWorkspaceTrust(getCwd(), storage);
  let bgSession = await spawnBgSession(
    argsWithStdin,
    resumeResult.kind === "continue" ? resumeResult.sessionId : undefined,
    "shell",
    undefined,
    undefined,
    undefined,
    undefined,
    storage,
  );
  if (!bgSession.ok) {
    await (
      bgSession.reason === "gate_blocked" || bgSession.reason === "cwd_gone"
        ? logFeatureSadAsync
        : logFeatureBadAsync
    )("cli_bg_dispatch", bgSession.reason ?? "spawn_failed", ...gateCauseExtra(bgSession.gateCause));
    process.stderr.write(`${bgSession.error}
`);
    process.exitCode = 1;
    return;
  }
  if (bgSession.rescued) await logFeatureSadAsync("cli_bg_dispatch", "rescued");
  else await logFeatureOkAsync("cli_bg_dispatch");
  if (resumeResult.kind === "copy")
    process.stderr.write(`${formatResumeCopyNote(resumeResult, bgSession.short)}
`);
  process.stdout.write(
    formatBgHints(bgSession.short, bgSession.idle ? IDLE_DETAIL : undefined, bgSession.name) +
      `
`,
  );
  await placeholderJobNameScore(storage);
}
//@ chunk-bg51yd13.js:42089-42577 placement
/**
 * 交互终端且工作区未受信任时，动态加载 Ink 渲染 agents 工作区信任对话框并等待用户决定；结束后卸载并刷新配置写入。
 */
async function promptBgWorkspaceTrust(cwd, storage) {
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    checkWorkspaceTrust(cwd).verdict !== "untrusted" ||
    !isSameRealPath(cwd, getCwd())
  )
    return;
  let [{ createRoot }, { getBaseRenderOptions }, { agentsTrustDecision, ensureAgentsWorkspaceTrust }] =
    await Promise.all([
      import("../../ink/components/Ansi.lazy.js"),
      import("../../utils/renderOptions.js"),
      import("../../utils/agentsWorkspaceTrust.js"),
    ]);
  if (agentsTrustDecision() !== "ask") return;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", true)) setIsInteractive(true);
  let root = await createRoot(getBaseRenderOptions(false));
  try {
    await ensureAgentsWorkspaceTrust(root, "ask", storage);
  } finally {
    root.render(null);
    root.unmount();
  }
  setIsInteractive(false);
  await drainConfigWrites();
}
//@ chunk-bg51yd13.js:42577-44096 placement
/**
 * 后台会话启动的守护进程派发路径（受限模式、闸门检查、确保守护进程）。
 */
async function wakeExistingBgSession({ jobId: job, state, prompt }, respawnArgs, restricted, storage) {
  let flagError = validateBgLaunchFlags(restricted ? ["--restricted", ...respawnArgs] : respawnArgs.slice());
  if (flagError) {
    process.stderr.write(`${flagError}
`);
    await logFeatureSadAsync("cli_bg_dispatch", "gate_blocked", ...gateCauseExtra("disclaimer"));
    process.exitCode = 1;
    return;
  }
  let daemonResult = await ensureDaemonForDispatch(undefined, storage);
  if (!daemonResult.ok) {
    let jobDir = getJobDir(job);
    invalidateJobStateCache(jobDir);
    let latestState = prompt !== undefined ? await readJobState(jobDir, storage) : null;
    let didQueue =
      prompt !== undefined &&
      latestState !== null &&
      (await queuePromptForJob(jobDir, latestState, prompt, storage, true));
    process.stderr
      .write(`Couldn't reach the ${bgSupervisorNoun()} (${daemonResult.reason})${daemonHint("status")}${didQueue ? ` Your message is saved and will be delivered when session ${job} next starts.` : ""}
`);
    await (didQueue ? logFeatureSadAsync : logFeatureBadAsync)("cli_bg_dispatch", "daemon_unavailable");
    process.exitCode = 1;
    return;
  }
  let respawnResult = await respawnBgSession(
    job,
    prompt !== undefined
      ? {
          initialPrompt: prompt,
          keepQueuedPrompt: true,
        }
      : undefined,
    storage,
  );
  if (!respawnResult.ok) {
    process.stderr.write(
      respawnResult.alive
        ? `Session ${job} is already running \u2014 \`claude attach ${job}\` to join it
`
        : `${respawnResult.error}${respawnResult.queued ? ` Your message is saved and will be delivered when session ${job} next starts.` : ""}
`,
    );
    if (respawnResult.queued) await logFeatureSadAsync("cli_bg_dispatch", "wake_refused_prompt_queued");
    else
      await logFeatureBadAsync(
        "cli_bg_dispatch",
        respawnResult.alive ? "short_alive" : (respawnResult.errorCode ?? "wake_failed"),
      );
    process.exitCode = 1;
    return;
  }
  await logFeatureOkAsync("cli_bg_dispatch");
  let flagValueIndices = getFlagValueIndices(state.respawnFlags);
  let wokeWithFlags = uniq(
    state.respawnFlags
      .map((respawnFlag, index) =>
        flagValueIndices.has(index)
          ? undefined
          : /^(--?[A-Za-z][A-Za-z0-9-]{0,40})(?:=|$)/.exec(respawnFlag)?.[1],
      )
      .filter(
        (flagName) =>
          flagName !== undefined &&
          (BOOLEAN_FORWARDED_FLAGS.has(flagName) || FORWARDED_VALUE_FLAGS.has(flagName)),
      ),
  );
  if (wokeWithFlags.length > 0)
    process.stderr.write(`note: woke session ${job} with its saved options (${wokeWithFlags.join(", ")}).
`);
  process.stdout.write(
    formatBgHints(
      respawnResult.short,
      prompt === undefined && !queuedPromptOrUndefined(state) ? IDLE_DETAIL : undefined,
      respawnResult.state.name ? sanitizeSessionTitle(respawnResult.state.name) || undefined : undefined,
    ) +
      `
`,
  );
  await placeholderJobNameScore(storage);
}
//@ chunk-bg51yd13.js:44096-44739 placement
/**
 * 读取管道 stdin 作为后台任务输入（TTY 返回空串），超过上限截断并警告；stdin 不可读时打点并返回空串；去掉末尾换行。
 */
async function readBgStdin(stdin = process.stdin) {
  if (stdin.isTTY) return "";
  let buffer = "";
  let truncated = false;
  let onData = (chunk) => {
    if (truncated) return;
    if (buffer.length + chunk.length > MAX_PIPED_STDIN_BYTES) {
      buffer += chunk.slice(0, MAX_PIPED_STDIN_BYTES - buffer.length);
      truncated = true;
      return;
    }
    buffer += chunk;
  };
  try {
    stdin.setEncoding("utf8");
    stdin.on("data", onData);
  } catch (error) {
    stdin.off("data", onData);
    if (!isStdinUnusableError(error)) throw error;
    logForDebugging(`readBgStdin: stdin unreadable: ${errorMessage(error)}`, {
      level: "error",
    });
    await logEventAsync("tengu_bg_stdin_unreadable", {
      error_code: sanitizedErrCodeForTelemetry(error) ?? lit("none"),
    });
    process.stderr
      .write(`warning: stdin is unreadable (${getErrnoCode(error)}), proceeding without piped input
`);
    return "";
  }
  let hasData = await peekForStdinData(stdin, 3000);
  stdin.off("data", onData);
  if (hasData) return "";
  if (truncated)
    process.stderr.write(`warning: piped stdin exceeds ${MAX_PIPED_STDIN_BYTES} bytes, truncated
`);
  return buffer.replace(/\r?\n$/, "");
}
//@ chunk-bg51yd13.js:44739-44754 placement
var MAX_PIPED_STDIN_BYTES = 1048576;
//@ chunk-bg51yd13.js:44754-44949 placement
function appendPromptToArgs(args, bgStdin) {
  let dashDashIndex = findDashDashIndex(args);
  if (dashDashIndex >= 0) {
    let joined = args.slice(dashDashIndex + 1).join(" ");
    return [
      ...args.slice(0, dashDashIndex),
      "--",
      joined
        ? `${joined}
${bgStdin}`
        : bgStdin,
    ];
  }
  let promptArgIndex = findPromptArgIndex(args);
  if (promptArgIndex >= 0) {
    let next = [...args];
    next[promptArgIndex] = `${args[promptArgIndex]}
${bgStdin}`;
    return next;
  }
  return [...args, "--", bgStdin];
}
//@ chunk-bg51yd13.js:44949-45368 placement
/**
 * 在参数里找最后一个位置参数（提示词）的下标：跳过 flag 及其取值、--resume 的可选 id；找不到返回 -1。
 */
function findPromptArgIndex(args) {
  let flagValueIndices = getFlagValueIndices(args);
  let promptIndex = -1;
  for (let j = 0; j < args.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = args[j];
    if (looksLikeFlag(arg)) {
      if (arg.includes("=")) continue;
      let nextArg = args[j + 1];
      if (nextArg === undefined) continue;
      let { rest } = peelCombinedShortFlags(arg);
      if (arg === "--resume" || rest === "-r") {
        if (!looksLikeFlag(nextArg)) j++;
        continue;
      }
      if (rest.length > 2 && (/^-r./.test(rest) || FORWARDED_VALUE_FLAGS.has(rest.slice(0, 2)))) continue;
      if (
        (BOOLEAN_FORWARDED_FLAGS.has(arg) && arg !== "--remote-control" && arg !== "--rc") ||
        SINGLE_LETTER_FLAGS.has(rest)
      )
        continue;
      if (!flagValueIndices.has(j + 1) && !looksLikeFlag(nextArg)) j++;
      continue;
    }
    promptIndex = j;
  }
  return promptIndex;
}
//@ chunk-bg51yd13.js:45368-45402 placement
var regExp; // deferred: uses DAEMON_UNREACHABLE_TIMEOUT_PHRASE (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bg51yd13.js:45368", () => {
  regExp = new RegExp(`${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} \\d+s`);
});
//@ chunk-bg51yd13.js:45402-45517 placement
function classifyDaemonError(text) {
  let errnoToken = extractErrnoTokens(text)[0];
  if (errnoToken) return errnoToken;
  if (regExp.test(text)) return "timeout";
  return text.includes(DAEMON_EXITED_BEFORE_REACHABLE_PHRASE) ? "exited" : "other";
}
//@ chunk-bg51yd13.js:45517-45822 placement
/**
 * 把派发失败码（daemon-unreachable、ack-timeout、dispatch-write 等）翻译成给用户看的短语。
 */
function describeDispatchFailure(reason) {
  switch (reason) {
    case "daemon-unreachable":
      return "not running";
    case "ack-timeout":
      return "timed out";
    case "dispatch-write":
      return "couldn't write dispatch file";
    case "enoconn":
      return "socket missing";
    case "estarting":
      return "service still starting";
    case "stale-short":
      return "id collision with a prior job";
  }
}
//@ chunk-bg51yd13.js:45822-46146 placement
function formatBgHints(short, detail, name) {
  let hint = (command, description) => sequential.dim("  " + command.padEnd(26) + description);
  return [
    `backgrounded \xB7 ${sequential.cyan(short)}${name ? ` \xB7 ${name}` : ""}${detail ? sequential.dim(` ${detail}`) : ""}`,
    hint("claude agents", "list sessions"),
    hint(`claude attach ${short}`, "open in this terminal"),
    hint(`claude logs ${short}`, "show recent output"),
    hint(`claude stop ${short}`, "stop this session"),
  ].join(`
`);
}
//@ chunk-bg51yd13.js:46146-46178 placement
function extraArgsWarningForArgv(argv) {
  return extraArgsWarning(getBgVerbArgsWithoutDebug(argv));
}
//@ chunk-bg51yd13.js:46178-46270 placement
function extraArgsWarning(extraArgs) {
  return extraArgs.length === 0
    ? null
    : `warning: extra arguments ignored: ${extraArgs.join(" ")}
`;
}
//@ chunk-bg51yd13.js:46270-46631 placement
/**
 * 取后台子命令动词之后的参数，去掉 --debug/-d/--debug-file 等调试参数和 --setting-sources 的取值。
 */
function getBgVerbArgsWithoutDebug(argv) {
  let verbIndex = backgroundSessionVerbIndex(argv);
  if (verbIndex === -1 || argv.length <= verbIndex + 2) return [];
  let honoredIndices = eagerCliFlagHonoredIndices("--setting-sources", argv);
  let kept = [];
  for (let j = verbIndex + 2; j < argv.length; j++) {
    let arg = argv[j];
    if (honoredIndices.has(j)) continue;
    if (
      arg === "--debug" ||
      arg === "-d" ||
      arg === "--debug-to-stderr" ||
      arg === "-d2e" ||
      arg.startsWith("--debug=") ||
      arg.startsWith("--debug-file=")
    )
      continue;
    if (arg === "--debug-file" && j + 1 < argv.length) {
      j++;
      continue;
    }
    kept.push(arg);
  }
  return kept;
}
//@ chunk-bg51yd13.js:46631-46722 placement
function warnOnExtraArgs() {
  let warning = extraArgsWarningForArgv(process.argv.slice(2));
  if (warning) process.stderr.write(warning);
  return warning !== null;
}
//@ chunk-bg51yd13.js:46722-46733 placement
var MAX_JOB_LIST_PAGES = 1e4;
//@ chunk-bg51yd13.js:46733-47310 placement
/**
 * 分页列出 v5 存储里 namespace=job 的全部 jobId；失败、游标不前进或超过页数上限时返回 undefined。
 */
async function listStorageJobIds(storage) {
  let jobIds = new Set();
  let cursor;
  let pages = 0;
  do {
    let page = await storage
      .listEntries(
        {
          namespace: "job",
        },
        {
          cursor,
          skipScopeStats: true,
        },
      )
      .catch(() => {
        return;
      });
    if (page === undefined || !page.ok) {
      logForDebugging(`[bg] v5 jobs listing failed: ${page === undefined ? "rejected" : page.error.code}`);
      return;
    }
    for (let item of page.value.items)
      if (item.kind === "scope" && item.scope.namespace === "job" && item.scope.jobId !== undefined)
        jobIds.add(item.scope.jobId);
    if (page.value.cursor && page.value.cursor === cursor) {
      logForDebugging("[bg] v5 jobs listing failed: cursor did not advance");
      return;
    }
    cursor = page.value.cursor;
  } while (cursor && ++pages < MAX_JOB_LIST_PAGES);
  if (cursor) {
    logForDebugging(`[bg] v5 jobs listing failed: more than ${MAX_JOB_LIST_PAGES} pages`);
    return;
  }
  return [...jobIds];
}
//@ chunk-bg51yd13.js:47310-47530 placement
async function removeJobStorage(storage, short) {
  let jobDir = getJobDir(short);
  let stats = await lstat(jobDir).catch(() => {
    return;
  });
  if (stats === undefined || !stats.isDirectory()) {
    await rm(jobDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    return;
  }
  await storage
    .deleteScope({
      namespace: "job",
      jobId: short,
    })
    .catch(() => {});
}
//@ chunk-bg51yd13.js:47530-49783 placement
/**
 * 后台会话子命令的通用参数解析：--help、未知选项、按 id/名称查找作业。
 */
async function resolveJobArgument(query, usage, helpText, allowNameMatch, storage) {
  let hasExtraArgs = warnOnExtraArgs();
  if (query === "--help" || query === "-h") {
    process.stdout.write(`Usage: ${usage}

  ${helpText}
`);
    process.exit(0);
  }
  if (query?.startsWith("-")) {
    process.stderr.write(`unknown option '${query}'
Usage: ${usage}
`);
    process.exit(1);
  }
  if (!query) {
    process.stderr.write(`Usage: ${usage}
`);
    process.exit(1);
  }
  let filtered = (
    storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir(getJobsDir()).catch(() => [])
  )
    .filter((id) => SHORT_RE.test(id))
    .filter((id) => id.startsWith(query));
  if (filtered.length === 1)
    return {
      short: filtered[0],
      byName: false,
      nameLines: "",
    };
  let needle = query.trim().toLowerCase();
  let canMatchName = allowNameMatch && !SHORT_HEX_ID_PATTERN.test(needle);
  if (canMatchName && !hasExtraArgs) {
    let filtered = (await listJobs(undefined, storage))
      .filter((job) => SHORT_RE.test(job.id))
      .map((job) => ({
        ...job,
        rank: rankJobNameMatch(job.state, needle),
      }))
      .filter((candidate) => candidate.rank !== 0);
    let any = filtered.some((namedJob) => namedJob.rank === 2 || namedJob.rank === 3);
    let filtered_2 = filtered.filter(
      (liveCandidate) => liveCandidate.rank !== 1 || !isDoneJob(liveCandidate.state),
    );
    if (filtered_2.length === 1 && any) {
      let { id, state } = filtered_2[0];
      let sorted = filtered
        .filter((job) => job.id !== id)
        .sort((a, b) => {
          let lastTerminalAt = a.state.lastTerminalAt ?? "";
          let lastTerminalAt_2 = b.state.lastTerminalAt ?? "";
          if (lastTerminalAt !== lastTerminalAt_2) return lastTerminalAt < lastTerminalAt_2 ? 1 : -1;
          return a.id < b.id ? -1 : 1;
        });
      let mapped = sorted.slice(0, MAX_MATCHED_JOBS).map(
        (
          job,
        ) => `  ${job.id}  ${sanitizeJobLabel(job.state.name || job.state.displayIntent || job.state.intent)}
`,
      );
      let omittedCount = sorted.length - mapped.length;
      let header =
        sorted.length > 0
          ? `The task text of ${sorted.length} finished ${plural(sorted.length, "session")} has '${sanitizeJobLabel(query)}' too:
${mapped.join("")}${
              omittedCount > 0
                ? `  \u2026 and ${omittedCount} more
`
                : ""
            }`
          : "";
      handleStreamGoneErrors(process.stderr);
      let nameHeader = `Session ${id} \xB7 ${sanitizeJobLabel(state.name ?? "")}
${header}`;
      process.stderr.write(nameHeader);
      return {
        short: id,
        byName: true,
        nameLines: nameHeader,
      };
    }
    if (filtered.length > 0) {
      let mapped = filtered
        .sort((a, b) => Number(a.rank === 1) - Number(b.rank === 1) || (a.id < b.id ? -1 : 1))
        .slice(0, MAX_LISTED_JOBS)
        .map(
          ({
            id,
            state,
            rank,
          }) => `  ${id}  ${sanitizeJobLabel(state.name || state.displayIntent || state.intent)}${any && rank === 1 ? "  (task text)" : ""}
`,
        );
      let omittedCount = filtered.length - mapped.length;
      let safeQuery = sanitizeJobLabel(query);
      process.stderr.write(`${
        any
          ? `${filtered.length} sessions match '${safeQuery}'`
          : `No session name matches '${safeQuery}'.
The task text of ${filtered.length} ${plural(filtered.length, "session")} has it`
      }:
${mapped.join("")}${
        omittedCount > 0
          ? `  \u2026 and ${omittedCount} more
`
          : ""
      }${!any ? "Use the id, or a session name." : filtered.some((candidate) => candidate.rank === 2) ? "Use more of the name, or the id." : "Use the id."}
`);
      process.exit(1);
    }
  }
  let nameHint =
    !allowNameMatch || SHORT_RE.test(needle)
      ? ""
      : hasExtraArgs
        ? `A name must be the only argument. Put a name with spaces in quotes.
`
        : canMatchName
          ? ""
          : `Text that can be the start of an id is not read as a name. Use more of the name.
`;
  process.stderr.write(
    filtered.length === 0
      ? `No job matching '${query}'. Run 'claude agents' to list running sessions.
${nameHint}`
      : `Ambiguous prefix '${query}', matches: ${filtered.join(", ")}
`,
  );
  process.exit(1);
}
//@ chunk-bg51yd13.js:49783-49842 placement
var SHORT_HEX_ID_PATTERN = /^[a-f0-9]{1,8}$/;
var MAX_LISTED_JOBS = 20;
var MAX_MATCHED_JOBS = 3;
var MAX_JOB_TEXT_CHARS = 4096;
var MAX_JOB_RAW_TEXT_CHARS = 65536;
var MAX_JOB_TEXT_SNIPPET_CHARS = 32;
//@ chunk-bg51yd13.js:49842-49948 placement
function sanitizeJobLabel(query) {
  if (query.length > MAX_JOB_RAW_TEXT_CHARS) return "\u2026";
  let collapsed = collapseWhitespace(stripFormatChars(collapseWhitespace(query)));
  return collapsed.length > MAX_JOB_TEXT_CHARS
    ? "\u2026"
    : truncateWithEllipsis(redactSecrets(collapsed), MAX_JOB_TEXT_SNIPPET_CHARS);
}
//@ chunk-bg51yd13.js:49948-50042 placement
var NAME_IN_PLACE_OF_ID_HINT =
  "Part of the session name works in place of the id. Put a name with spaces in quotes.";
//@ chunk-bg51yd13.js:50042-50722 placement
async function logsHandler(query, storage) {
  let { short, nameLines } = await resolveJobArgument(
    query,
    "claude logs <id|name>",
    `Print the background session's recent terminal output. ${NAME_IN_PLACE_OF_ID_HINT}`,
    true,
    storage,
  );
  let promise = await new Promise((resolve) => {
    let unsubscribe = subscribeControl(
      short,
      500,
      (frame) => {
        if (frame.type === "snapshot") {
          unsubscribe();
          resolve(frame.streamTail);
        }
      },
      (error) => {
        unsubscribe();
        resolve(error);
      },
    );
  });
  if (typeof promise === "string") {
    await logFeatureBadAsync("cli_bg_logs", "read_failed");
    process.stderr.write(`Couldn't read logs for ${short} \u2014 ${redactDaemonPipeKey(promise)}
`);
    return exitAfterAnalyticsFlush(1);
  }
  let { replay, cursorAddressed } = waitForDaemonReady(promise.join(""));
  let rows = process.stdout.rows || 9999;
  let restoreCursor = process.stdout.isTTY
    ? "\x1B[0m" +
      (cursorAddressed
        ? cursorPosition(rows, 1) +
          `
`
        : "")
    : "";
  await writeStdoutAndDrain(replay + restoreCursor);
  if (nameLines && process.stdout.isTTY && process.stderr.isTTY)
    process.stderr.write(
      (cursorAddressed
        ? ""
        : `
`) +
        csi("J") +
        nameLines,
    );
  await logFeatureOkAsync("cli_bg_logs");
  return exitAfterAnalyticsFlush(0);
}
//@ chunk-bg51yd13.js:50722-50743 placement
var ATTACH_WAIT_TOTAL_MS = 60000;
var ATTACH_WAIT_STEP_MS = 2000;
//@ chunk-bg51yd13.js:50743-51148 placement
/**
 * 根据 attach 失败消息给出等待提示：会话正在升级/卡住重启/迁移 PTY，或守护进程正在启动/重启。
 */
function describeAttachRetryStatus(msg) {
  if (msg.includes(RESPAWNING_ATTACH_CODE)) {
    if (msg.includes(RESPAWN_REASON_UPGRADE) || /upgrad/i.test(msg))
      return "Agent is updating to the new Claude Code\u2026";
    if (msg.includes(RESPAWN_REASON_STALL)) return "Session not responding \u2014 restarting it\u2026";
    if (msg.includes(RESPAWN_REASON_LEGACY)) return "Migrating job to attachable PTY\u2026";
    return "Session is restarting\u2026";
  }
  if (msg.includes("ESTARTING")) return `${bgSupervisorNounCap()} is starting\u2026`;
  return `${bgSupervisorNounCap()} is restarting\u2026`;
}
//@ chunk-bg51yd13.js:51148-52196 placement
/**
 * 连接后台会话（attachToJob），遇到短暂错误或套接字竞态时指数退避重试（必要时重新拉起守护进程），在 stderr 显示等待状态；可在按下分离键时中止。返回最终结果与等待时长。
 */
async function attachWithRetry(short, options = {}, storage) {
  let attemptAttach = () =>
    attachToJob(
      short,
      options.gesture
        ? {
            telemetry: {
              gestureId: options.gesture.gestureId,
              attempt: ++options.gesture.attempt,
              t0: options.gesture.t0,
              surface: options.gesture.surface,
              daemonBooted: options.gesture.daemonBooted,
              interactive: options.gesture.interactive,
              storageV5: storage,
            },
          }
        : {},
    );
  let isTty = process.stderr.isTTY === true;
  let isStatusDrawn = false;
  let lastMessage = "";
  let showStatus = (message, waitedMs) => {
    let rounded = Math.round(waitedMs / 1000);
    let line = rounded >= 5 ? `${message} (${rounded}s)` : message;
    if (isTty) {
      process.stderr.write(`\r${ERASE_LINE}${line}`);
      isStatusDrawn = true;
    } else if (message !== lastMessage)
      process.stderr.write(`${line}
`);
    lastMessage = message;
  };
  let clearStatus = () => {
    if (isStatusDrawn) {
      process.stderr.write(`\r${ERASE_LINE}`);
      isStatusDrawn = false;
    }
  };
  let result = await attemptAttach();
  let waitedMs = 0;
  try {
    for (let j = 0; waitedMs < ATTACH_WAIT_TOTAL_MS; j++) {
      let msg = result.msg;
      let isTransient = msg !== undefined && TRANSIENT_ATTACH_CODE.test(msg);
      let isSocketRace =
        !isTransient &&
        result.outcome === "error" &&
        msg !== undefined &&
        RACED_SOCKET_GAP.test(msg) &&
        !SUPERVISOR_DETACH_CODE.test(msg);
      if (msg === undefined || (!isTransient && !isSocketRace)) break;
      if (isSocketRace) {
        let daemon = await ensureDaemon(
          {
            forceTransient: true,
            onStarting: () => options.gesture?.markDaemonBooted?.(),
          },
          storage,
        );
        if (!daemon.ok)
          return {
            r: result,
            waitedMs,
            unavailableReason: daemon.reason,
          };
      }
      let min = Math.min(2000, 250 * 2 ** j);
      if (msg.includes(RESPAWNING_ATTACH_CODE) || waitedMs + min > ATTACH_WAIT_STEP_MS)
        showStatus(describeAttachRetryStatus(msg), waitedMs);
      await sleep(min);
      waitedMs += min;
      if (options.abortOnDetachKey) {
        let typed = drainStdin();
        if (typed && containsInterruptKey(typed))
          return {
            r: result,
            waitedMs,
            detachKeyAborted: true,
          };
      }
      clearStatus();
      result = await attemptAttach();
    }
  } finally {
    clearStatus();
  }
  return {
    r: result,
    waitedMs,
  };
}
//@ chunk-bg51yd13.js:52196-52268 placement
var ENOJOB_PROBE_FAILED_MESSAGE = "ENOJOB: probe found no handle \u2014 worker retired or settled";
//@ chunk-bg51yd13.js:52268-58892 placement
/**
 * claude attach <id|name>：在当前终端打开后台会话（必要时重启/迁移到可附着 PTY），← 返回代理视图（约 6.6 KB）。
 */
async function attachHandler(query, storage) {
  let t0 = performance.now();
  let isDaemonBooted = false;
  let jobArgument = await resolveJobArgument(
    query,
    "claude attach <id|name>",
    `Open the background session in this terminal. \u2190 returns to agent view, Ctrl+Z drops back to your shell. The session keeps running either way. ${NAME_IN_PLACE_OF_ID_HINT}`,
    true,
    storage,
  );
  let short = jobArgument.short;
  let waitedTransientMs = 0;
  let gestureId = randomUUID();
  let gesture = {
    gestureId,
    attempt: 0,
    t0,
    surface: "bg_cli",
    interactive: {},
    get daemonBooted() {
      return isDaemonBooted;
    },
    markDaemonBooted: () => {
      isDaemonBooted = true;
      updateAttachBeacon(
        gestureId,
        {
          daemonBooted: true,
        },
        storage,
      );
    },
  };
  startAttachBeacon(gesture.gestureId, "bg_cli", storage).catch(() => {});
  let extraFields = () =>
    waitedTransientMs > 0 || jobArgument.byName
      ? {
          ...(waitedTransientMs > 0 && {
            waited_transient_ms: waitedTransientMs,
          }),
          ...(jobArgument.byName && {
            by_name: true,
          }),
        }
      : undefined;
  let failDaemonUnavailable = async (prefix, reason) => {
    reportAttachTelemetry(gesture, "error");
    await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
    await logFeatureBadAsync("cli_bg_attach", "daemon_unavailable", extraFields());
    process.stderr
      .write(`${prefix} \u2014 ${bgSupervisorNoun()} is unavailable (${reason})${daemonHint("status")}
`);
    return exitAfterAnalyticsFlush(1);
  };
  let daemonForDispatch = await ensureDaemonForDispatch(
    {
      onStarting: () => {
        isDaemonBooted = true;
        updateAttachBeacon(
          gestureId,
          {
            daemonBooted: true,
          },
          storage,
        );
      },
    },
    storage,
  );
  if (!daemonForDispatch.ok) return failDaemonUnavailable("Couldn't attach", daemonForDispatch.reason);
  let attachResult;
  if (await isBackgroundSessionGone(short))
    attachResult = {
      outcome: "error",
      msg: ENOJOB_PROBE_FAILED_MESSAGE,
    };
  else {
    let firstTry = await attachWithRetry(
      short,
      {
        gesture,
      },
      storage,
    );
    attachResult = firstTry.r;
    waitedTransientMs += firstTry.waitedMs;
    if (firstTry.unavailableReason !== undefined)
      return failDaemonUnavailable("Couldn't attach", firstTry.unavailableReason);
  }
  if (attachResult.outcome === "error" && attachResult.msg?.includes("ENOJOB")) {
    let jobState = await readJobState(getJobDir(short), storage).catch(() => null);
    let wasReaped =
      jobState?.state === "failed" &&
      !isExecLaunch(jobState) &&
      (jobState.reapedMidWorkAt !== undefined || jobState.reapedUnsettledAt !== undefined);
    let didHostDie =
      jobState?.state === "failed" && !isExecLaunch(jobState) && jobState.detail === HOST_DIED_DETAIL;
    let targetSessionId =
      jobState?.sessionId !== undefined && normalizeUuidOrNull(jobState.sessionId) !== null
        ? sanitizeMarkName(jobState.sessionId)
        : undefined;
    let metadata = targetSessionId
      ? {
          target_session_id: targetSessionId,
        }
      : {};
    if (jobState?.state === "failed" && !wasReaped && !didHostDie) {
      await logFeatureBadAsync("cli_bg_attach", "wake_failed_state", {
        ...extraFields(),
        ...metadata,
      });
      process.stderr
        .write(`Session ${short} can't start \u2014 ${sanitizeLogLine(jobState.detail) || "it crashed repeatedly"}
`);
      reportAttachTelemetry(gesture, "error", "worker_crash_loop");
      await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
    if (jobArgument.byName) {
      await logFeatureSadAsync("cli_bg_attach", "wake_needs_id", {
        ...extraFields(),
        ...metadata,
      });
      process.stderr.write(`The background service has no process for session ${short}.
A name opens only a running session. Use the id: \`claude attach ${short}\`
`);
      reportAttachTelemetry(gesture, "detached");
      await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
    if (wasReaped) {
      await logEventAsync("tengu_bg_attach_wake_after_reap", metadata);
      process.stderr.write(`Session ${short} was interrupted while unattended \u2014 resuming it\u2026
`);
    } else if (didHostDie)
      process.stderr.write(`Session ${short}'s terminal host died \u2014 restarting it on a fresh one\u2026
`);
    else if (jobState?.deadEpochReapedAt !== undefined && !isExecLaunch(jobState))
      process.stderr
        .write(`Session ${short} ended while the background service was off; looking for its saved conversation to resume\u2026
`);
    else
      process.stderr.write(`Waking session ${short}\u2026
`);
    if (jobState !== null) await promptBgWorkspaceTrust(jobState.cwd, storage);
    let respawn = await respawnBgSession(short, undefined, storage).catch((error) => ({
      ok: false,
      alive: false,
      short: undefined,
      error: errorMessage(error),
    }));
    if (respawn.ok || respawn.alive) {
      if (respawn.short && respawn.short !== short) {
        process.stderr.write(`Session moved to ${respawn.short}
`);
        short = respawn.short;
      }
      let retry = await attachWithRetry(
        short,
        {
          gesture,
        },
        storage,
      );
      attachResult = retry.r;
      waitedTransientMs += retry.waitedMs;
      if (retry.unavailableReason !== undefined)
        return failDaemonUnavailable("Couldn't attach", retry.unavailableReason);
    } else if ("errorCode" in respawn && respawn.errorCode === "dead_epoch_transcript_gone") {
      await logFeatureSadAsync("cli_bg_attach", "dead_epoch_transcript_gone", {
        ...extraFields(),
        ...metadata,
      });
      process.stderr.write(`${respawn.error}
`);
      reportAttachTelemetry(gesture, "error", "respawn_failed");
      await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    } else {
      await logFeatureBadAsync("cli_bg_attach", wasReaped ? "wake_after_reap_failed" : "wake_failed", {
        ...extraFields(),
        ...metadata,
      });
      process.stderr.write(
        wasReaped
          ? `Couldn't resume ${short} after the interruption \u2014 ${respawn.error}
`
          : `Couldn't wake ${short} \u2014 ${respawn.error}
`,
      );
      reportAttachTelemetry(gesture, "error", "respawn_failed");
      await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
  }
  let restoreStdin = () => {
    if (getPlatform() === "windows" && process.stdin.isTTY) setRawModeSafe(process.stdin, false);
  };
  let reportDetachIfSettled = async () => {
    let jobStateAfterSettle = await readJobStateAfterSettle(getJobDir(short), storage);
    if (
      jobStateAfterSettle === null ||
      jobStateAfterSettle.state === "done" ||
      jobStateAfterSettle.state === "stopped" ||
      jobStateAfterSettle.state === "blocked"
    )
      reportAttachTelemetry(gesture, "detached");
  };
  while (attachResult.outcome === "disconnected") {
    let daemon = await ensureDaemon(
      {
        forceTransient: true,
        onStarting: () => {
          isDaemonBooted = true;
          updateAttachBeacon(
            gestureId,
            {
              daemonBooted: true,
            },
            storage,
          );
        },
      },
      storage,
    );
    if (!daemon.ok) return failDaemonUnavailable(`Couldn't reconnect to ${short}`, daemon.reason);
    if (await isBackgroundSessionGone(short)) {
      restoreStdin();
      await reportDetachIfSettled();
      break;
    }
    process.stderr.write(`Reconnecting to ${short}\u2026
`);
    if (getPlatform() === "windows" && process.stdin.isTTY) {
      setRawModeSafe(process.stdin, true);
      process.stdin.ref();
    }
    let typed = drainStdin();
    if (typed && containsInterruptKey(typed)) {
      restoreStdin();
      reportAttachTelemetry(gesture, "detached");
      attachResult = {
        outcome: "detached",
      };
      break;
    }
    let retry = await attachWithRetry(
      short,
      {
        abortOnDetachKey: true,
        gesture,
      },
      storage,
    );
    attachResult = retry.r;
    waitedTransientMs += retry.waitedMs;
    if (retry.detachKeyAborted) {
      restoreStdin();
      reportAttachTelemetry(gesture, "detached");
      attachResult = {
        outcome: "detached",
      };
      break;
    }
    if (retry.unavailableReason !== undefined) {
      restoreStdin();
      return failDaemonUnavailable(`Couldn't reconnect to ${short}`, retry.unavailableReason);
    }
    if (attachResult.outcome === "error" && attachResult.msg?.includes("ENOJOB")) {
      restoreStdin();
      await reportDetachIfSettled();
      attachResult = {
        outcome: "disconnected",
      };
      break;
    }
  }
  await Promise.race([clearAttachBeacon(gesture.gestureId, storage).catch(() => {}), sleep(750)]);
  if (
    attachResult.outcome === "detached" &&
    attachResult.msg &&
    (FATAL_ATTACH_CODE.test(attachResult.msg) || TRANSIENT_ATTACH_CODE.test(attachResult.msg))
  ) {
    await logFeatureBadAsync(
      "cli_bg_attach",
      FATAL_ATTACH_CODE.test(attachResult.msg) ? "stalled" : "transient_exhausted",
      extraFields(),
    );
    process.stderr.write(`${attachResult.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, "")}
`);
    return exitAfterAnalyticsFlush(1);
  }
  if (isUserApcDetach(attachResult, process.stdout.isTTY, process.stdin.isTTY)) {
    await logFeatureOkAsync("cli_bg_attach", extraFields());
    return relaunchClaudeCode({
      args: [
        "agents",
        ...earlyArgsToArgv({
          settings: eagerParseCliFlag("--settings"),
          managedSettings: eagerParseCliFlag("--managed-settings"),
          pluginDir: eagerParseCliFlagAll("--plugin-dir"),
          pluginDirNoMcp: eagerParseCliFlagAll("--plugin-dir-no-mcp"),
          addDir: eagerParseCliFlagAll("--add-dir"),
          mcpConfig: eagerParseCliFlagAll("--mcp-config"),
          strictMcpConfig: eagerHasCliFlag("--strict-mcp-config"),
          restricted: eagerHasCliFlag("--restricted") || isRestrictedMode(),
          settingSources: appliedSettingSourcesFlagValue(),
        }),
      ],
      env: {
        CLAUDE_AGENTS_SELECT: short,
      },
    });
  }
  if (attachResult.outcome === "detached" && attachResult.msg)
    process.stderr.write(`${attachResult.msg.replace(KICKED_ATTACH_CODE, "")}
`);
  if (attachResult.outcome === "disconnected") {
    let jobState = await readJobState(getJobDir(short), storage).catch(() => null);
    if (jobState?.state === "failed" && jobState.detail === HOST_DIED_DETAIL)
      process.stderr
        .write(`Session ${short}'s terminal host died \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.
`);
    else {
      let detailSuffix =
        jobState?.state === "failed" && jobState.detail ? ` (${sanitizeLogLine(jobState.detail)})` : "";
      process.stderr.write(
        jobState?.state === "done" && (await hasConversationToResume(jobState, storage))
          ? `Session ${short} has exited \u2014 run \`claude attach ${short}\` to resume it.
`
          : `Session ${short} has exited${detailSuffix}.
`,
      );
    }
  }
  if (attachResult.outcome === "error") {
    let isHostDead = attachResult.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`) ?? false;
    let isNoResponse = attachResult.msg?.startsWith(`${ENORESPONSE}:`) ?? false;
    let jobState =
      isHostDead || isNoResponse ? await readJobState(getJobDir(short), storage).catch(() => null) : null;
    let isExec = jobState !== null && isExecLaunch(jobState);
    let reason = isHostDead
      ? isExec
        ? `${HOST_DIED_EXEC_ATTACH_MESSAGE}.`
        : `${HOST_DIED_ATTACH_MESSAGE} \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.`
      : isNoResponse
        ? isExec
          ? `${SESSION_NOT_RESPONDING_TEXT} \u2014 \`claude stop ${short}\` stops it (it runs a shell command, which is not run again for you).`
          : `${SESSION_NOT_RESPONDING_TEXT} \u2014 \`claude stop ${short}\`, then \`claude attach ${short}\` restarts it (the conversation is saved).`
        : attachResult.msg?.includes(RESPAWNING_ATTACH_CODE)
          ? "Job is respawning after an upgrade \u2014 try attach again in a moment."
          : attachResult.msg &&
              (RACED_SOCKET_GAP.test(attachResult.msg) || /ESTARTING/.test(attachResult.msg))
            ? `${bgSupervisorNounCap()} is restarting \u2014 try again in a moment.`
            : (attachResult.msg ?? "unknown");
    process.stderr.write(`Couldn't attach to ${short} \u2014 ${reason}
`);
    await logFeatureBadAsync(
      "cli_bg_attach",
      isHostDead ? "host_dead" : isNoResponse ? "no_response" : "transient_exhausted",
      extraFields(),
    );
  } else await logFeatureOkAsync("cli_bg_attach", extraFields());
  return exitAfterAnalyticsFlush(attachResult.outcome === "error" ? 1 : 0);
}
//@ chunk-bg51yd13.js:58892-59008 placement
function isUserApcDetach(result, isTTY, isTTY_2) {
  return (
    result.outcome === "detached" &&
    result.viaApc === true &&
    (result.msg === undefined || !SUPERVISOR_DETACH_CODE.test(result.msg)) &&
    isTTY === true &&
    isTTY_2 === true
  );
}
//@ chunk-bg51yd13.js:59008-61338 placement
/**
 * claude respawn <id>|--all：重启后台会话以使用当前 Claude 二进制。
 */
async function respawnHandler(query, storage) {
  warnOnExtraArgs();
  if (query === "--help" || query === "-h") {
    process.stdout.write(`Usage: claude respawn <id>|--all

  Restart a background session (or all of them) so it picks up the current Claude binary.
`);
    return;
  }
  if (query?.startsWith("-") && query !== "--all") {
    process.stderr.write(`unknown option '${query}'
Usage: claude respawn <id>|--all
`);
    process.exitCode = 1;
    return;
  }
  if (!query) {
    process.stderr.write(`usage: claude respawn <id>|--all
`);
    process.exitCode = 1;
    return;
  }
  let matches = [];
  if (query !== "--all") {
    matches = (
      storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir(getJobsDir()).catch(() => [])
    )
      .filter((id) => SHORT_RE.test(id))
      .filter((id) => id.startsWith(query));
    if (matches.length !== 1) {
      process.stderr.write(
        matches.length === 0
          ? `No job matching '${query}'
`
          : `Ambiguous prefix '${query}', matches: ${matches.join(", ")}
`,
      );
      await logFeatureBadAsync("cli_bg_respawn", matches.length === 0 ? "no_match" : "ambiguous");
      process.exitCode = 1;
      return;
    }
  }
  let daemonForDispatch = await ensureDaemonForDispatch(undefined, storage);
  if (!daemonForDispatch.ok) {
    process.stderr
      .write(`Couldn't respawn \u2014 ${bgSupervisorNoun()} is unavailable (${daemonForDispatch.reason})${daemonHint("status")}
`);
    await logFeatureBadAsync("cli_bg_respawn", "daemon_unavailable");
    process.exitCode = 1;
    return;
  }
  if (query === "--all") {
    let filtered = (await listJobs(undefined, storage)).filter((job) => !isTerminal(job.state.state));
    if (filtered.length === 0) {
      process.stdout.write(`no live jobs to respawn
`);
      return;
    }
    let respawnedCount = 0;
    let stillAliveCount = 0;
    for (let job of filtered) {
      await promptBgWorkspaceTrust(job.state.cwd, storage);
      let result = await respawnBgSession(
        job.id,
        {
          force: true,
          knownState: job.state,
        },
        storage,
      );
      if (result.ok) {
        respawnedCount++;
        process.stdout.write(`respawned ${job.id}${result.short !== job.id ? ` \u2192 ${result.short}` : ""}
`);
      } else if (result.alive) {
        stillAliveCount++;
        process.exitCode = 1;
        process.stderr.write(`${job.id}: still running \u2014 couldn't confirm restart, retry in a moment
`);
      } else {
        process.exitCode = 1;
        process.stderr.write(`${job.id}: ${result.error}
`);
      }
    }
    if (respawnedCount === filtered.length) await logFeatureOkAsync("cli_bg_respawn");
    else if (respawnedCount > 0 || stillAliveCount > 0)
      await logFeatureSadAsync("cli_bg_respawn", stillAliveCount > 0 ? "still_alive" : "partial");
    else await logFeatureBadAsync("cli_bg_respawn", "spawn_failed");
    return;
  }
  let short = matches[0];
  let result = await respawnBgSession(
    short,
    {
      force: true,
    },
    storage,
  );
  if (!result.ok && result.errorCode === "workspace_untrusted" && result.state !== undefined) {
    await promptBgWorkspaceTrust(result.state.cwd, storage);
    if (checkWorkspaceTrust(result.state.cwd).verdict !== "untrusted")
      result = await respawnBgSession(
        short,
        {
          force: true,
        },
        storage,
      );
  }
  if (!result.ok && result.alive) {
    process.stderr.write(`${short}: still running \u2014 couldn't confirm restart, retry in a moment
`);
    await logFeatureSadAsync("cli_bg_respawn", "still_alive");
    process.exitCode = 1;
    return;
  }
  if (!result.ok) {
    process.stderr.write(`${result.error}
`);
    await logFeatureBadAsync("cli_bg_respawn", "spawn_failed");
    process.exitCode = 1;
    return;
  }
  await logFeatureOkAsync("cli_bg_respawn");
  process.stdout.write(`respawned ${short}${result.short !== short ? ` \u2192 ${result.short}` : ""}
`);
}
//@ chunk-bg51yd13.js:61338-62534 placement
async function stopHandler(query, storage, isVerbose = false) {
  let query_2 = query;
  let { short } = await resolveJobArgument(
    query_2,
    "claude stop <id>",
    ["Stop a background session. Its conversation is kept; resume it later with `claude attach <id>`.", ...[]]
      .join(`
  `),
    false,
    storage,
  );
  let jobState = await readJobState(getJobDir(short), storage);
  let { confirmed, error } = await killJob(short, jobState ?? undefined, undefined, storage);
  if (!confirmed) {
    await logFeatureBadAsync("cli_bg_stop", "kill_unconfirmed");
    process.stderr.write(
      error
        ? `couldn't confirm ${short} was stopped \u2014 ${error}
`
        : `couldn't confirm ${short} was stopped \u2014 the background service may be restarting. Try again in a moment.
`,
    );
    process.exitCode = 1;
    return;
  }
  await logFeatureOkAsync("cli_bg_stop");
  process.stdout.write(`stopped ${short}
`);
  let jobDir = getJobDir(short);
  await writePendingWakeup(jobDir, undefined);
  let jobState_2 = await readJobState(jobDir, storage);
  if (jobState_2 && !isSettled(jobState_2)) {
    let iso = new Date().toISOString();
    await writeStateAtomic(
      jobDir,
      {
        ...jobState_2,
        state: "stopped",
        detail: "stopped",
        tempo: "idle",
        needs: undefined,
        block: undefined,
        inFlight: undefined,
        updatedAt: iso,
        firstTerminalAt: jobState_2.firstTerminalAt ?? iso,
      },
      storage,
    ).catch((error) =>
      logForDebugging(`bg stop terminal write failed: ${errorMessage(error)}`, {
        level: "warn",
      }),
    );
  } else await markJobStoppedOnRow(jobDir, storage);
  await logEventAsync("tengu_bg_agent_action", {
    action: lit("stop"),
    source: lit("cli"),
    jobSessionId: sanitizeMarkName(jobState_2?.sessionId) ?? lit(""),
  });
  if (jobState_2?.worktreePath)
    process.stdout.write(
      sequential.dim(`  worktree retained at ${jobState_2.worktreePath}
  run 'claude rm ${short}' to remove worktree and job state
`),
    );
}
//@ chunk-bg51yd13.js:62534-63376 placement
/**
 * claude rm 的用法行（RM_USAGE）与完整帮助（RM_HELP，说明 --discard-unpushed 与 --force-remove-worktree）。
 */
var RM_USAGE = `Usage: claude rm <id> [--discard-unpushed <commit>@<worktree-id>] [--force-remove-worktree <worktree-id>]
`;
var RM_HELP =
  `${RM_USAGE}
  Delete a background session and its worktree. Unlike \`stop\`, works on already-exited sessions.
` +
  `  --discard-unpushed <commit>@<worktree-id>  also discard the worktree's unpushed commits (and any uncommitted changes) while it is still the same worktree at that commit \u2014 pass the value a previous 'claude rm <id>' reported
` +
  `  --force-remove-worktree <worktree-id>      delete the worktree directory even though the WorktreeRemove hook or git couldn't remove it (its repository must list it as a worktree, or have dropped it in a removal that couldn't delete it; no uncommitted changes to tracked files, submodules included; the branch is kept) \u2014 pass the value a previous 'claude rm <id>' reported
`;
//@ chunk-bg51yd13.js:63376-66128 placement
/**
 * claude rm：删除后台会话及其工作树（--discard-unpushed、--force-remove-worktree）。
 */
async function rmHandler(
  firstArg,
  storage,
  restArgs = getBgVerbArgsWithoutDebug(process.argv.slice(2)),
  recurse = false,
) {
  let query;
  let discardUnpushed;
  let forceRemoveWorktree;
  let error;
  let extraArgs = [];
  let args = firstArg === undefined ? restArgs : [firstArg, ...restArgs];
  for (let idx = 0; idx < args.length; idx++) {
    let arg = args[idx];
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(RM_HELP);
      process.exit(0);
    }
    if (arg === "--discard-unpushed" || arg.startsWith("--discard-unpushed=")) {
      let [headSha, worktreeDigest, ...extraParts] = (
        (arg === "--discard-unpushed" ? args[++idx] : arg.slice(19)) ?? ""
      )
        .toLowerCase()
        .split("@");
      if (
        extraParts.length > 0 ||
        headSha === undefined ||
        !isValidGitSha(headSha) ||
        worktreeDigest === undefined ||
        !WORKTREE_DIGEST_PATTERN.test(worktreeDigest)
      ) {
        error = `option '--discard-unpushed' takes the <commit>@<worktree-id> value shown by a previous 'claude rm <id>' refusal
`;
        break;
      }
      discardUnpushed = {
        headSha,
        worktreeDigest,
      };
    } else if (arg === "--force-remove-worktree" || arg.startsWith("--force-remove-worktree=")) {
      let lower = ((arg === "--force-remove-worktree" ? args[++idx] : arg.slice(24)) ?? "").toLowerCase();
      if (!WORKTREE_DIGEST_PATTERN.test(lower)) {
        error = `option '--force-remove-worktree' takes the <worktree-id> value shown by a previous 'claude rm <id>' refusal
`;
        break;
      }
      forceRemoveWorktree = lower;
    } else if (arg.startsWith("-")) {
      error = `unknown option '${arg}'
`;
      break;
    } else if (query === undefined) query = arg;
    else extraArgs.push(arg);
  }
  if (error !== undefined || !query) {
    process.stderr.write(`${error ?? ""}${RM_USAGE}`);
    process.exit(1);
  }
  let warning = extraArgsWarning(extraArgs);
  if (warning) process.stderr.write(warning);
  let filtered = (
    storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir(getJobsDir()).catch(() => [])
  )
    .filter((id) => SHORT_RE.test(id))
    .filter((id) => id.startsWith(query));
  if (filtered.length !== 1) {
    process.stderr.write(
      filtered.length === 0
        ? `No job matching '${query}'
`
        : `Ambiguous prefix '${query}', matches: ${filtered.join(", ")}
`,
    );
    process.exit(1);
  }
  let short = filtered[0];
  let jobState = await readJobState(getJobDir(short), storage);
  let outcome = await deleteJob(
    short,
    {
      ...(discardUnpushed !== undefined && {
        discardUnpushed,
      }),
      ...(forceRemoveWorktree !== undefined && {
        forceRemoveWorktree,
      }),
    },
    storage,
  );
  if (!outcome.removed) {
    let { error, errorCode, keptWorktree } = outcome;
    if (keptWorktree) {
      await logFeatureSadAsync("cli_bg_rm", "kept_worktree");
      let explained = formatRmOutcome(
        {
          reason: outcome.keptReason ?? "remove_failed",
          errorSummary: outcome.keptErrorSummary,
          unpushed: outcome.keptUnpushed,
          discardUnpushed: outcome.discardUnpushed,
          forceRemove: outcome.forceRemoveWorktree,
          forceRemoveWithheld: outcome.forceRemoveWithheld,
          submoduleWork: outcome.submoduleWork,
        },
        {
          worktree: keptWorktree,
          jobId: short,
        },
      );
      process.stdout.write(
        `kept ${short} \u2014 its worktree is still at ${keptWorktree}
` +
          explained.cli
            .map(
              (line) => `  ${line}
`,
            )
            .join(""),
      );
      process.exitCode = 1;
      return;
    }
    await logFeatureBadAsync("cli_bg_rm", errorCode ?? "kill_unconfirmed");
    process.stderr
      .write(`couldn't remove ${short} \u2014 ${error ?? "the background service may be restarting. Try again in a moment."}
`);
    process.exitCode = 1;
    return;
  }
  await logEventAsync("tengu_bg_agent_action", {
    action: lit("delete"),
    source: lit("cli"),
    jobSessionId: sanitizeMarkName(jobState?.sessionId) ?? lit(""),
  });
  let { leftWorktreeDir, forcedWorktreeRemoval } = outcome;
  if (leftWorktreeDir) await logFeatureSadAsync("cli_bg_rm", "worktree_left_in_place");
  else if (forcedWorktreeRemoval) await logFeatureSadAsync("cli_bg_rm", "worktree_force_removed");
  else await logFeatureOkAsync("cli_bg_rm");
  process.stdout.write(
    `removed ${short}` +
      (leftWorktreeDir
        ? `
  worktree directory left at ${leftWorktreeDir} (git no longer recognized it)`
        : forcedWorktreeRemoval
          ? `
  worktree directory deleted by force: ${forcedWorktreeRemoval.worktree}` +
            (forcedWorktreeRemoval.keptBranch
              ? `
  branch ${forcedWorktreeRemoval.keptBranch} was left in the repository`
              : "")
          : jobState?.worktreePath
            ? `
  worktree: ${printableLabel(jobState.worktreePath)}`
            : "") +
      `
`,
  );
}
//@ chunk-bg51yd13.js:66128-66271 placement (2.1.88 match: filterAppsForDescription, 0.354)
/**
 * （误归 computerUse）把 -abc 形式拆出已知短选项，返回 {peeled, rest}。
 */
function peelCombinedShortFlags(arg) {
  let peeled = [];
  let rest = arg;
  while (/^-[a-zA-Z]./.test(rest) && SINGLE_LETTER_FLAGS.has(rest.slice(0, 2))) {
    peeled.push(rest.slice(0, 2));
    rest = `-${rest.slice(2)}`;
  }
  return {
    peeled,
    rest,
  };
}
//@ chunk-bg51yd13.js:66271-66323 placement
function looksLikeFlag(arg) {
  return arg.length > 1 && arg.startsWith("-");
}
//@ chunk-bg51yd13.js:66323-66420 placement
function findDashDashIndex(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  for (let j = 0; j < argv.length; j++) if (argv[j] === "--" && !flagValueIndices.has(j)) return j;
  return -1;
}
//@ chunk-bg51yd13.js:66420-66556 placement
function stripBgOnlyFlags(argv) {
  let dashDashIndex = findDashDashIndex(argv);
  let headArgs = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv;
  let flagValueIndices = getFlagValueIndices(headArgs);
  let filtered = headArgs.filter(
    (arg, argIndex) => flagValueIndices.has(argIndex) || !BG_FLAG_NAMES.includes(arg),
  );
  return dashDashIndex >= 0 ? [...filtered, ...argv.slice(dashDashIndex)] : filtered;
}
//@ chunk-bg51yd13.js:66556-66951 placement
/**
 * 取某个 flag 的值：支持 `--x v`、`--x=v`、组合短参数 `-abv`/`-a v`；遇到 `--` 停止；多次出现取最后一个。
 */
function getFlagValue(argv, longFlag, shortFlag) {
  let flagValueIndices = getFlagValueIndices(argv);
  let value;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = argv[j];
    if (arg === "--") break;
    if (arg === longFlag || (shortFlag !== undefined && arg === shortFlag)) {
      if (argv[j + 1] !== undefined) {
        value = argv[j + 1];
        j++;
      }
      continue;
    }
    if (arg.startsWith(`${longFlag}=`)) {
      value = arg.slice(longFlag.length + 1);
      continue;
    }
    if (shortFlag !== undefined) {
      let { peeled, rest } = peelCombinedShortFlags(arg);
      if (rest.length > 2 && rest.slice(0, 2) === shortFlag) {
        value = rest.slice(2);
        continue;
      }
      if (peeled.length > 0 && rest === shortFlag && argv[j + 1] !== undefined) {
        value = argv[j + 1];
        j++;
      }
    }
  }
  return value;
}
//@ chunk-bg51yd13.js:66951-67678 placement
function rewriteDispatchFlagValue(respawnFlags, longFlag, shortFlag, name) {
  let flagValueIndices = getFlagValueIndices(respawnFlags);
  let rewritten = [...respawnFlags];
  let didChange = false;
  for (let j = 0; j < respawnFlags.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = respawnFlags[j];
    if (arg === "--") break;
    if (arg === longFlag || (shortFlag !== undefined && arg === shortFlag)) {
      if (respawnFlags[j + 1] !== undefined) {
        if (!isAcceptableModelArg(name)) {
          rewritten[j] = `${longFlag}=${name}`;
          rewritten[j + 1] = null;
          didChange = true;
        } else if (respawnFlags[j + 1] !== name) {
          rewritten[j + 1] = name;
          didChange = true;
        }
        j++;
      }
      continue;
    }
    if (arg.startsWith(`${longFlag}=`)) {
      if (arg.slice(longFlag.length + 1) !== name) {
        rewritten[j] = `${longFlag}=${name}`;
        didChange = true;
      }
      continue;
    }
    if (shortFlag !== undefined) {
      let { peeled, rest } = peelCombinedShortFlags(arg);
      if (rest.length > 2 && rest.slice(0, 2) === shortFlag) {
        if (rest.slice(2) !== name) {
          rewritten[j] = `${arg.slice(0, arg.length - (rest.length - 2))}${name}`;
          didChange = true;
        }
        continue;
      }
      if (peeled.length > 0 && rest === shortFlag && respawnFlags[j + 1] !== undefined) {
        if (!isAcceptableModelArg(name)) {
          rewritten[j] = `-${peeled.map((peeledFlag) => peeledFlag.slice(1)).join("")}`;
          rewritten[j + 1] = `${longFlag}=${name}`;
          didChange = true;
        } else if (respawnFlags[j + 1] !== name) {
          rewritten[j + 1] = name;
          didChange = true;
        }
        j++;
      }
    }
  }
  if (!didChange) return;
  let compacted = [];
  for (let arg of rewritten) if (arg !== null) compacted.push(arg);
  return compacted;
}
//@ chunk-bg51yd13.js:67678-68131 placement
/**
 * 返回参数数组里"作为 flag 取值"的下标集合（如 --rc 的名字、多值 flag 的后续值），供其他扫描函数跳过。
 */
function getFlagValueIndices(argv) {
  let indices = new Set();
  for (let j = 0; j < argv.length; j++) {
    if (indices.has(j)) continue;
    let arg = argv[j];
    if (arg === "--") break;
    let { rest } = peelCombinedShortFlags(arg);
    if (arg === "--resume" || rest === "-r") continue;
    if (
      (arg === "--remote-control" || arg === "--rc") &&
      argv[j + 1] !== undefined &&
      !(argv[j + 1].length > 1 && argv[j + 1].startsWith("-"))
    ) {
      indices.add(j + 1);
      continue;
    }
    if (!rest.includes("=") && BACKGROUND_FORWARDED_VALUE_FLAGS.has(rest) && argv[j + 1] !== undefined) {
      indices.add(j + 1);
      if (VARIADIC_FORWARDED_FLAGS.has(rest)) {
        let next = j + 2;
        while (argv[next] !== undefined && !(argv[next].length > 1 && argv[next].startsWith("-"))) {
          indices.add(next);
          next++;
        }
      }
    }
  }
  return indices;
}
//@ chunk-bg51yd13.js:68131-68471 placement
/**
 * 参数里有 --continue/-c 返回 true；有 --resume/-r 时只有带了会话 id 才返回 true。
 */
function hasContinueOrResumeId(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let hasResume = false;
  let hasContinue = false;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = argv[j];
    if (arg === "--") break;
    if (arg === "--continue") {
      hasContinue = true;
      continue;
    }
    if (arg === "--resume" || arg.startsWith("--resume=")) {
      hasResume = true;
      continue;
    }
    let { peeled, rest } = peelCombinedShortFlags(arg);
    if (peeled.includes("-c") || rest === "-c") hasContinue = true;
    if (rest === "-r" || /^-r./.test(rest)) hasResume = true;
  }
  if (hasResume) return getResumeArg(argv) !== undefined;
  return hasContinue;
}
//@ chunk-bg51yd13.js:68471-68792 placement
/**
 * 取 --resume/-r 的参数值（--resume=、-rXXX、或下一个非 flag 参数），没有值返回 undefined。
 */
function getResumeArg(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let resumeArg;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = argv[j];
    if (arg === "--") break;
    if (arg.startsWith("--resume=")) {
      resumeArg = arg.slice(9) || undefined;
      continue;
    }
    let { rest } = peelCombinedShortFlags(arg);
    if (/^-r./.test(rest)) {
      resumeArg = rest.slice(2);
      continue;
    }
    if (arg === "--resume" || rest === "-r") {
      let nextArg = argv[j + 1];
      if (nextArg !== undefined && !looksLikeFlag(nextArg)) {
        resumeArg = nextArg;
        j++;
      } else resumeArg = undefined;
    }
  }
  return resumeArg;
}
//@ chunk-bg51yd13.js:68792-69022 placement
function hasResumeOrContinueFlag(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  return argv.some((arg, index) => {
    if (flagValueIndices.has(index)) return false;
    if (arg === "--continue" || arg === "--resume" || arg.startsWith("--resume=")) return true;
    let { peeled, rest } = peelCombinedShortFlags(arg);
    return peeled.includes("-c") || rest === "-c" || rest === "-r" || /^-r./.test(rest);
  });
}
//@ chunk-bg51yd13.js:69022-69089 placement
function hasBareFlag(argv, flag) {
  let flagValueIndices = getFlagValueIndices(argv);
  return argv.some((arg, index) => !flagValueIndices.has(index) && arg === flag);
}
//@ chunk-bg51yd13.js:69089-69768 placement
function stripResumeFlags(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let kept = [];
  for (let j = 0; j < argv.length; j++) {
    let arg = argv[j];
    if (flagValueIndices.has(j)) {
      kept.push(arg);
      continue;
    }
    if (arg === "--") {
      for (let index = j; index < argv.length; index++) kept.push(argv[index]);
      break;
    }
    if (
      arg === "--fork-session" ||
      arg === "--continue" ||
      arg.startsWith("--resume=") ||
      arg.startsWith("--session-id=")
    )
      continue;
    let { peeled, rest } = peelCombinedShortFlags(arg);
    if (peeled.length > 0 || rest === "-c" || rest.startsWith("-r")) {
      let mapped = peeled.filter((peeledFlag) => peeledFlag !== "-c").map((peeledFlag) => peeledFlag[1]);
      let dropsResumeArg = rest === "-c" || /^-r./.test(rest);
      let isBareResume = rest === "-r";
      let otherLetters = dropsResumeArg || isBareResume ? "" : rest.slice(1);
      if (mapped.length > 0 || otherLetters) kept.push(`-${mapped.join("")}${otherLetters}`);
      if (isBareResume && argv[j + 1] !== undefined && !looksLikeFlag(argv[j + 1])) j++;
      continue;
    }
    if (arg === "--session-id") {
      if (argv[j + 1] !== undefined) j++;
      continue;
    }
    if (arg === "--resume") {
      if (argv[j + 1] !== undefined && !looksLikeFlag(argv[j + 1])) j++;
      continue;
    }
    kept.push(arg);
  }
  return kept;
}
//@ chunk-bg51yd13.js:69768-70045 placement
function stripSessionIdFlag(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let kept = [];
  for (let j = 0; j < argv.length; j++) {
    let arg = argv[j];
    if (flagValueIndices.has(j)) {
      kept.push(arg);
      continue;
    }
    if (arg === "--") {
      for (let index = j; index < argv.length; index++) kept.push(argv[index]);
      break;
    }
    if (arg.startsWith("--session-id=")) continue;
    if (arg === "--session-id") {
      if (argv[j + 1] !== undefined) j++;
      continue;
    }
    kept.push(arg);
  }
  return kept;
}
//@ chunk-bg51yd13.js:70045-71769 placement
/**
 * 检查后台会话不支持的参数组合（--project-config-root、--print、从文件读 --agents、bypassPermissions 未接受免责声明等），返回拒绝说明。
 */
function validateBgLaunchFlags(args) {
  let separatorIndex = findDashDashIndex(args);
  let launchArgs = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
  let valueIndexes = getFlagValueIndices(launchArgs);
  let flagArgs = launchArgs.filter((launchArg, index) => !valueIndexes.has(index));
  if (hasRemoteBackendFlags(flagArgs)) return rejectBgWithEnvironmentFlags(launchArgs);
  if (
    getProjectConfigRoot() !== null ||
    flagArgs.some(
      (flagArg) => flagArg === "--project-config-root" || flagArg.startsWith("--project-config-root="),
    )
  )
    return "Background sessions are unavailable with --project-config-root. A background session can lose that flag, and then it runs the hooks and settings in its working folder. Run the task in a foreground session instead.";
  if (
    flagArgs.some((flagArg) => {
      let { peeled, rest } = peelCombinedShortFlags(flagArg);
      return (
        flagArg === "--print" || flagArg.startsWith("--print=") || peeled.includes("-p") || rest === "-p"
      );
    })
  )
    return "--bg and --print conflict: --print never starts the interactive session that `claude agents` attaches to, so the job would be unattachable. The prompt is the positional \u2014 drop --print: `claude --bg '<task>'`.";
  let agentsValue = getFlagValue(launchArgs, "--agents");
  if (agentsValue !== undefined && agentsValue !== "" && !looksLikeAgentsJson(agentsValue))
    return "--bg can't read --agents from a file: a background session is interactive, and the file form works only with --print. Pass the agents as inline JSON.";
  let permissionModes = [
    getFlagValue(launchArgs, "--permission-mode"),
    getFlagValue(launchArgs, "--inherit-permission-mode"),
  ];
  if (
    (permissionModes.includes("bypassPermissions") ||
      flagArgs.includes("--dangerously-skip-permissions") ||
      flagArgs.includes("--allow-dangerously-skip-permissions")) &&
    !hasSkipDangerousModePermissionPrompt() &&
    !getGlobalConfig().bypassPermissionsModeAccepted
  )
    return isSettingSourceEnabled("userSettings")
      ? "--bg with bypassPermissions requires accepting the disclaimer first. Run `claude --dangerously-skip-permissions` once interactively."
      : "--bg with bypassPermissions requires accepting the disclaimer first. Acceptance is kept in your user settings, which this launch does not read. Launch again with user settings on.";
  if (permissionModes.includes("auto") && !hasAutoModeOptIn())
    return "--bg with auto mode requires opting in first. Run `claude --permission-mode auto` once interactively.";
  return null;
}
//@ chunk-bg51yd13.js:71769-71994 placement
function findLastPositionalArg(argv, resumeArg) {
  let flagValueIndices = getFlagValueIndices(argv);
  let lastPositional;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let arg = argv[j];
    if (looksLikeFlag(arg)) {
      let { rest } = peelCombinedShortFlags(arg);
      if ((arg === "--resume" || rest === "-r") && argv[j + 1] !== undefined && !looksLikeFlag(argv[j + 1]))
        j++;
      continue;
    }
    if (arg.length > 0 && arg !== resumeArg) lastPositional = arg;
  }
  return lastPositional;
}
//@ chunk-bg51yd13.js:71994-72321 placement
/**
 * 去掉位置参数，只保留 flag 及其取值（用于把参数转成可重放的 respawnFlags）。
 */
function keepFlagArgsOnly(argsWithoutResume) {
  let flagValueIndices = getFlagValueIndices(argsWithoutResume);
  let kept = [];
  for (let j = 0; j < argsWithoutResume.length; j++) {
    let arg = argsWithoutResume[j];
    if (flagValueIndices.has(j)) {
      kept.push(arg);
      continue;
    }
    if (!looksLikeFlag(arg)) continue;
    if (arg.includes("=")) {
      kept.push(arg);
      continue;
    }
    let { rest } = peelCombinedShortFlags(arg);
    if (FORWARDED_VALUE_FLAGS.has(rest)) {
      kept.push(arg);
      continue;
    }
    if (BOOLEAN_FORWARDED_FLAGS.has(arg)) {
      kept.push(arg);
      continue;
    }
    let nextArg = argsWithoutResume[j + 1];
    if (nextArg !== undefined && !looksLikeFlag(nextArg) && !flagValueIndices.has(j + 1)) {
      j++;
      continue;
    }
    kept.push(arg);
  }
  return kept;
}
//@ chunk-bg51yd13.js:72321-72350 placement
function callerProviderEnv() {
  return withHostOwnedEnv(getSecureStorageConfigDir);
}
export {
  spawnBgSession,
  stripResumeFlags,
  formatBgHints,
  preSeedReplBgJob,
  callerProviderEnv,
  gateCauseExtra,
  workspaceGateCause,
  rewriteDispatchFlagValue,
  attachHandler,
  handleBgFlag,
  logsHandler,
  respawnHandler,
  rmHandler,
  stopHandler,
};
