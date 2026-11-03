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
import { hostManagedDir, hostManagedEntry, redactDaemonPipeKey } from "../../utils/sandbox/userNamespace.js";
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
import { withHostEnvRestored_2, withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
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
import { readDaemonToken } from "../../services/daemon/paths.js";
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
function workspaceGateCause(e) {
  return e.unresolvable ? "workspace_unresolvable" : "workspace_untrusted";
}
//@ chunk-bg51yd13.js:27700-28705 placement
async function preSeedReplBgJob(e, n, o) {
  let sliced = e.slice(0, 8);
  let jobDir = getJobDir(sliced);
  await ensureJobTmpFolder(sliced, o);
  let intent = n.intent ?? "";
  let y = {
    ...makeInitialState({
      template: {
        name: "bg",
        description: "",
      },
      intent,
      name: n.name,
      nameSource: n.nameSource,
      color: n.color,
      detail: n.detail ?? IDLE_DETAIL,
      tempo: "blocked",
      needs: IDLE_NEEDS,
      sessionId: e,
      cwd: n.cwd,
      worktreePath: n.worktree?.path,
      worktreeBranch: n.worktree?.branch,
      worktreeHookBased: n.worktree?.hookBased,
      originCwd: n.worktree?.originCwd,
      bgIsolation: "none",
      interactiveLineage: true,
      providerEnv: callerProviderEnv(),
      sessionPermissionRules: n.sessionPermissionRules,
      memoryToggledOff: n.memoryToggledOff,
      autoMemoryOffThisSession: n.autoMemoryOffThisSession,
      linkScanPath: n.linkScanPath,
      inFlight: n.inFlight,
      respawnFlags: n.respawnFlags,
    }),
    ...(n.keptBy !== undefined && {
      keptBy: n.keptBy,
    }),
    ...(n.createdAt !== undefined && {
      createdAt: n.createdAt,
    }),
  };
  await writeStateAtomic(jobDir, y, o);
  if (env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)
    if (isStorageV5Enabled() && o !== undefined && isValidKeySegment(sliced)) {
      await ensureTombstoneScope(o);
      await writeHostTombstone(o, sliced, encodeHostLineage(y.providerEnv));
    } else {
      await mkdir(hostManagedDir(), {
        recursive: true,
        mode: 448,
      });
      await writeFile(hostManagedEntry(sliced), encodeHostLineage(y.providerEnv));
    }
  return {
    short: sliced,
    jobDir,
    state: y,
  };
}
//@ chunk-bg51yd13.js:28705-29384 placement
async function spawnBgSession(argv, n, launchMode = "shell", r, launchOptions, l, u, storage) {
  let p = validateBgLaunchFlags(argv);
  if (p)
    return {
      ok: false,
      error: p,
      reason: "gate_blocked",
      gateCause: "disclaimer",
    };
  let w = checkWorkspaceTrust(r ?? getCwd());
  if (w.verdict === "untrusted")
    return {
      ok: false,
      error: formatWorkspaceUntrusted(w),
      reason: "gate_blocked",
      gateCause: workspaceGateCause(w),
    };
  let cwd = r === undefined ? undefined : w.cwd;
  let R = n ?? randomUUID();
  let h = u ?? R.slice(0, 8);
  let jobDir = getJobDir(h);
  return trackBgDispatch(
    h,
    (async () => {
      try {
        await ensureJobTmpFolder(h, storage);
        return await spawnBgSession_2(
          argv,
          launchMode,
          cwd,
          launchOptions,
          l,
          {
            sessionId: R,
            short: h,
            jobDir,
            freshDir: n === undefined,
          },
          w.verdict === "session",
          storage,
        );
      } catch (error) {
        if (launchMode !== "fleet" && launchMode !== "spare")
          if (storage) await removeJobStorage(storage, h);
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
async function spawnBgSession_2(argv, launchMode, cwd, launchOptions, s, jobIdentity, u, storage) {
  let { sessionId, short, jobDir, freshDir } = jobIdentity;
  let dashDashIndex = findDashDashIndex(argv);
  let argsBeforeDashDash = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv;
  let agentName = getFlagValue(argsBeforeDashDash, "--agent");
  let E = undefined;
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
    let G = cwd ?? getCwd();
    let q = stripForwardedFlags(argsWithoutResume);
    let Be = [
      ...argsWithoutResume.filter((it, Ze) => q[Ze] !== it),
      ...(isWindowsDevicePath(G) ? [G] : []),
      ...(launchOptions?.exec && isWindowsDevicePath(launchOptions.exec) ? [launchOptions.exec] : []),
      ...(resumeArg !== undefined && isWindowsDevicePath(resumeArg) ? [resumeArg] : []),
    ];
    if (Be.length > 0)
      process.stderr
        .write(`warning: background sessions do not support Windows network (UNC) paths; the following will be neutralized: ${Be.join(", ")}
`);
  }
  let re = resumeArg !== undefined && resumeArg === sessionId;
  let Je = hasResumeFlag && !hasForkSessionFlag ? ["--fork-session"] : [];
  let xe = re ? [] : ["--session-id", sessionId, ...Je];
  if (
    launchMode === "shell" &&
    argsBeforeDashDash.some(
      (G, q) => !flagValueIndices.has(q) && (G === "--session-id" || G.startsWith("--session-id=")),
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
  let Z = undefined;
  let intent = launchOptions?.intent ?? positionalPrompt ?? "";
  let isIdleLaunch =
    !agentDefinition?.initialPrompt &&
    !launchOptions?.exec &&
    !positionalPrompt &&
    !argsBeforeDashDash.some((G, q) => !flagValueIndices.has(q) && G === "--reply-on-resume");
  let Ye = false;
  let qe;
  if (launchMode !== "fleet" && launchMode !== "spare") {
    let G = freshDir ? null : await readJobState(jobDir, storage);
    if (G === null)
      qe = writeStateAtomic(
        jobDir,
        makeInitialState({
          template: {
            name: launchOptions?.exec ? "exec" : (agentName ?? undefined ?? "bg"),
            description: agentDefinition?.whenToUse ?? Z?.description ?? "",
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
              ? Z
                ? `(idle \u2014 waiting for ${describeRoutineTriggers(Z.triggers)})`
                : IDLE_DETAIL
              : undefined),
          tempo: isIdleLaunch ? (Z ? "idle" : "blocked") : undefined,
          needs: isIdleLaunch && !Z ? IDLE_NEEDS : undefined,
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
          Ye = true;
        })
        .catch((error) =>
          logForDebugging(`bg seed state write failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
    else if (respawnFlags.length > 0 && G.respawnFlags.length === 0)
      qe = writeStateAtomic(
        jobDir,
        {
          ...G,
          respawnFlags,
        },
        storage,
      ).catch((error) =>
        logForDebugging(`bg respawnFlags patch failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      );
  }
  let Ee =
    isEnvTruthy(providerEnv.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) &&
    isEnvTruthy(env.CLAUDE_CODE_AUTO_MODE_SERVER)
      ? (withHostEnvRestored_2(() => env.CLAUDE_CODE_AUTO_MODE_SERVER) ?? "")
      : env.CLAUDE_CODE_AUTO_MODE_SERVER;
  let Ie = isPersonalConfigRestricted();
  let we = Ie ? getPersonalConfigFixHint() : undefined;
  let ce =
    !launchOptions?.exec &&
    (launchMode === "repl" || (!launchOptions?.providerEnv && !cwd) || cwd === getCwd());
  let ANTHROPIC_BASE_URL =
    !launchOptions?.exec && !ce && cwd
      ? withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv)).ANTHROPIC_BASE_URL
      : undefined;
  let Ne =
    ANTHROPIC_BASE_URL !== undefined && !isFirstPartyAnthropicHost(ANTHROPIC_BASE_URL) ? cwd : undefined;
  if (Ne)
    logForDebugging("bg: this session's ANTHROPIC_BASE_URL is not passed to a session in another folder");
  let Ae = {
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
            fork: !re && (hasForkSessionFlag || Je.length > 0),
            flagArgs: [...argsWithoutResume, ...(dashDashIndex >= 0 ? argv.slice(dashDashIndex) : [])],
          }
        : {
            mode: "prompt",
            args: [...xe, ...stripSessionIdFlag(argv)],
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
      ...(Ie && {
        CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG: "1",
      }),
      ...(we !== undefined && {
        CLAUDE_CODE_PERSONAL_CONFIG_FIX: we,
      }),
      ...(Ee !== undefined && {
        CLAUDE_CODE_AUTO_MODE_SERVER: Ee,
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
      ...(ce && withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv))),
      ...(Ne && {
        [CLAUDE_BG_GATEWAY_WITHHELD]: Ne,
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
      ...s,
      ...(!launchOptions?.exec && {
        ...buildBgDispatcherEnv(ownStoredLoginPlanAttributes()),
        ...(u && {
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
  let [, U] = await Promise.all([qe ?? Promise.resolve(), dispatchViaDaemon(Ae, false, Date.now(), storage)]);
  if (U.ok) {
    if (U.reattachEnvDropped !== undefined) warnHomeTrustFallback(Ae, launchMode);
    return {
      ok: true,
      short,
      sessionId,
      idle: isIdleLaunch,
      name: sessionName,
    };
  }
  let detail = U.reason === "cwd-gone" ? U.detail : undefined;
  if (U.reason === "ack-timeout" || U.reason === "enoconn" || U.reason === "estarting") {
    let G = await controlRequest({
      proto: BG_PROTO,
      op: "list",
    });
    if (
      G.ok &&
      G.op === "list" &&
      G.jobs.some((job) => job.short === short && job.nonce === U.nonce && !job.outcome)
    ) {
      logForDebugging(`bg: daemon dispatch ${U.reason} but worker is live`, {
        level: "warn",
      });
      warnHomeTrustFallback(Ae, launchMode);
      await logEventAsync("tengu_bg_dispatch_rescued", {
        reason_ack_timeout: U.reason === "ack-timeout",
        reason_enoconn: U.reason === "enoconn",
        reason_estarting: U.reason === "estarting",
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
    if (U.reason === "ack-timeout" && G.ok && G.op === "list" && !G.jobs.some((job) => job.short === short)) {
      let q = await controlRequest(
        {
          proto: BG_PROTO,
          op: "dispatch",
          d: {
            ...Ae,
            nonce: U.nonce,
          },
          timeoutMs: 5000,
          auth: await readDaemonToken(),
        },
        {
          timeoutMs: 6000,
        },
      );
      if (q.ok && q.op === "dispatch") {
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
      if (!q.ok && "code" in q && q.code === "ECWDGONE") detail = q.error;
    }
  }
  if (Ye)
    if (storage) await removeJobStorage(storage, short);
    else
      await rm(jobDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  if (U.reason === "short-alive")
    return {
      ok: false,
      alive: true,
      short,
      error: `Session ${short} is already running \u2014 \`claude attach ${short}\` to join it`,
      reason: "short_alive",
    };
  if (U.reason === "stale-short")
    return {
      ok: false,
      error: "Previous session is still shutting down \u2014 try again in a moment",
      reason: "stale_short",
    };
  if (U.reason === "cwd-gone" || detail !== undefined)
    return {
      ok: false,
      error: `Couldn't start a background session (${detail ?? U.detail})`,
      reason: "cwd_gone",
    };
  let Le = U.reason === "daemon-unreachable" && U.detail ? U.detail : describeDispatchFailure(U.reason);
  return {
    ok: false,
    error: `Couldn't reach the ${bgSupervisorNoun()} (${Le})${daemonHint("status")}`,
    reason:
      U.reason === "daemon-unreachable"
        ? `daemon_unavailable_${classifyDaemonError(U.detail)}`
        : U.reason.replace(/-/g, "_"),
  };
}
//@ chunk-bg51yd13.js:36584-36954 placement
/**
 * 会话记录了 CLAUDE_BG_WORKSPACE_TRUSTED（守护进程只能走回退派发路径、没继承本终端的主目录信任）时写调试日志警告；shell 模式下同时打印到 stderr。
 */
function warnHomeTrustFallback(e, launchMode) {
  if (e.reattachEnv?.CLAUDE_BG_WORKSPACE_TRUSTED === undefined) return;
  let o = `warning: session ${e.short} started without this terminal's home-directory trust (the ${bgSupervisorNoun()} could only take its fallback dispatch path), so hooks and project settings from your home directory stay off in it`;
  logForDebugging(`bg: ${o}`, {
    level: "warn",
  });
  if (launchMode === "shell")
    process.stderr.write(`${o}
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
  let sliced = sessionId.slice(0, 8);
  let p = await checkSessionOpenElsewhere(sessionId);
  if (p !== null)
    return {
      kind: "copy",
      reason: p,
      original: sliced,
    };
  let existingJob = null;
  let wakePrompt;
  let jobState = await readJobState(getJobDir(sliced), storageV5);
  if (jobState === null) {
    if (await jobStateExists(sliced, storageV5))
      return {
        kind: "copy",
        reason: "unreadable",
        original: sliced,
      };
  } else
    existingJob = {
      jobId: sliced,
      state: jobState,
    };
  if (existingJob !== null) {
    let { state } = existingJob;
    if (state.sessionId !== sessionId || isExecLaunch(state))
      return {
        kind: "copy",
        reason: "handle-taken",
        original: sliced,
      };
    if (state.resumeSessionId && state.resumeSessionId !== sessionId) {
      let D = await checkSessionOpenElsewhere(state.resumeSessionId);
      if (D !== null)
        return {
          kind: "copy",
          reason: D,
          original: sliced,
        };
    }
  }
  for (let h of new Set([sliced, existingJob?.state.daemonShort ?? sliced])) {
    let D = await probeDaemonJob(h, storageV5);
    if (D.alive || D.present)
      return {
        kind: "copy",
        reason: "running",
        original: sliced,
      };
  }
  if (existingJob !== null) {
    if (options?.restricted)
      return {
        kind: "copy",
        reason: "restricted",
        original: sliced,
      };
    let h = stripResumeFlags(args);
    let D = dashDashIndex >= 0 ? -1 : findPromptArgIndex(h);
    if (h.length > (D >= 0 ? 1 : 0))
      return {
        kind: "copy",
        reason: "own-options",
        original: sliced,
      };
    wakePrompt = (dashDashIndex >= 0 ? argv.slice(dashDashIndex + 1).join(" ") : h[D]) || undefined;
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
async function checkSessionOpenElsewhere(e) {
  let n;
  try {
    n = await listLiveSessionHolders(e, {
      rejectUnreadable: true,
    });
  } catch {
    return "unverified";
  }
  if (n.length === 0) return null;
  return n.some((o) => o.kind === "bg" || o.kind === "daemon-worker") ? "running" : "open-elsewhere";
}
//@ chunk-bg51yd13.js:38341-38513 placement
async function jobStateExists(e, storageV5) {
  if (storageV5) {
    let o = await storageV5.statMeta(jobStateKey(e));
    return o.ok || o.error.code !== "NotFound";
  }
  try {
    return (await readdir(getJobDir(e))).includes("state.json");
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
async function handleBgFlag(e, storage) {
  if (stripBgOnlyFlags(e).length === e.length) {
    let D = e.find((S) => BG_FLAG_NAMES.includes(S)) ?? "--bg";
    process.stderr
      .write(`Couldn't tell whether ${D} is a flag or text here, so nothing was started. To start a background session put it first: claude --bg <prompt>
`);
    await logFeatureSadAsync("cli_bg_dispatch", "flag_not_stripped");
    process.exitCode = 1;
    return;
  }
  let dashDashIndex = findDashDashIndex(e);
  let r = dashDashIndex >= 0 ? e.slice(0, dashDashIndex) : e;
  let flagValueIndices = getFlagValueIndices(r);
  let index = r.findIndex((D, S) => !flagValueIndices.has(S) && (D === "--exec" || D.startsWith("--exec=")));
  if (index !== -1) {
    let D = e[index].includes("=") ? e[index].slice(e[index].indexOf("=") + 1) : undefined;
    let S = D ?? e.slice(index + 1).join(" ");
    if (!S.trim()) {
      process.stderr.write(`--exec requires a command.
`);
      process.exitCode = 1;
      return;
    }
    let E = stripBgOnlyFlags([...e.slice(0, index), ...(D !== undefined ? e.slice(index + 1) : [])]);
    let flagValue = getFlagValue(E, "--name", "-n");
    let flagValueIndices = getFlagValueIndices(E);
    let dashDashIndex = findDashDashIndex(E);
    let N = dashDashIndex >= 0 ? E.slice(0, dashDashIndex) : E;
    let filtered = N.filter((K, ne) => !flagValueIndices.has(ne));
    if (hasRemoteBackendFlags(filtered)) {
      process.stderr.write(`${rejectBgWithEnvironmentFlags(E)}
`);
      process.exitCode = 1;
      return;
    }
    let filtered_2 = N.filter(
      (K, ne) =>
        !flagValueIndices.has(ne) && looksLikeFlag(K) && !/^(-n|--name)(=|$)/.test(K) && !/^-n./.test(K),
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
        intent: S,
        exec: S,
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
      formatBgHints(bgSession.short, undefined, flagValue || S) +
        `
`,
    );
    await placeholderJobNameScore(storage);
    return;
  }
  let restricted = isRestrictedMode();
  let y = stripBgOnlyFlags(restricted ? ["--restricted", ...e] : e);
  let bgStdin = await readBgStdin();
  let w = bgStdin ? appendPromptToArgs(y, bgStdin) : y;
  let A = bgStdin ? appendPromptToArgs(stripBgOnlyFlags(e), bgStdin) : stripBgOnlyFlags(e);
  let resumeResult = await resolveBgResumeTarget(A, {
    restricted,
    storageV5: storage,
  });
  if (resumeResult.kind === "continue" && resumeResult.wakeRow !== null) {
    await promptBgWorkspaceTrust(resumeResult.wakeRow.state.cwd, storage);
    await wakeExistingBgSession(resumeResult.wakeRow, A, restricted, storage);
    return;
  }
  await promptBgWorkspaceTrust(getCwd(), storage);
  let bgSession = await spawnBgSession(
    w,
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
async function promptBgWorkspaceTrust(cwd, n) {
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    checkWorkspaceTrust(cwd).verdict !== "untrusted" ||
    !isSameRealPath(cwd, getCwd())
  )
    return;
  let [
    { createRoot: o },
    { getBaseRenderOptions: r },
    { agentsTrustDecision: s, ensureAgentsWorkspaceTrust: l },
  ] = await Promise.all([
    import("./chunk-1m6xc21j.js"),
    import("./chunk-92g44ry1.js"),
    import("./chunk-pn8x1715.js"),
  ]);
  if (s() !== "ask") return;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", true)) setIsInteractive(true);
  let u = await o(r(false));
  try {
    await l(u, "ask", n);
  } finally {
    u.render(null);
    u.unmount();
  }
  setIsInteractive(false);
  await drainConfigWrites();
}
//@ chunk-bg51yd13.js:42577-44096 placement
/**
 * 后台会话启动的守护进程派发路径（受限模式、闸门检查、确保守护进程）。
 */
async function wakeExistingBgSession({ jobId: job, state, prompt }, respawnArgs, restricted, storage) {
  let u = validateBgLaunchFlags(restricted ? ["--restricted", ...respawnArgs] : respawnArgs.slice());
  if (u) {
    process.stderr.write(`${u}
`);
    await logFeatureSadAsync("cli_bg_dispatch", "gate_blocked", ...gateCauseExtra("disclaimer"));
    process.exitCode = 1;
    return;
  }
  let daemonResult = await ensureDaemonForDispatch(undefined, storage);
  if (!daemonResult.ok) {
    let jobDir = getJobDir(job);
    invalidateJobStateCache(jobDir);
    let h = prompt !== undefined ? await readJobState(jobDir, storage) : null;
    let D = prompt !== undefined && h !== null && (await queuePromptForJob(jobDir, h, prompt, storage, true));
    process.stderr
      .write(`Couldn't reach the ${bgSupervisorNoun()} (${daemonResult.reason})${daemonHint("status")}${D ? ` Your message is saved and will be delivered when session ${job} next starts.` : ""}
`);
    await (D ? logFeatureSadAsync : logFeatureBadAsync)("cli_bg_dispatch", "daemon_unavailable");
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
  let A = uniq(
    state.respawnFlags
      .map((respawnFlag, h) =>
        flagValueIndices.has(h)
          ? undefined
          : /^(--?[A-Za-z][A-Za-z0-9-]{0,40})(?:=|$)/.exec(respawnFlag)?.[1],
      )
      .filter((R) => R !== undefined && (BOOLEAN_FORWARDED_FLAGS.has(R) || FORWARDED_VALUE_FLAGS.has(R))),
  );
  if (A.length > 0)
    process.stderr.write(`note: woke session ${job} with its saved options (${A.join(", ")}).
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
  let onData = (l) => {
    if (truncated) return;
    if (buffer.length + l.length > MAX_PIPED_STDIN_BYTES) {
      buffer += l.slice(0, MAX_PIPED_STDIN_BYTES - buffer.length);
      truncated = true;
      return;
    }
    buffer += l;
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
  let s = await peekForStdinData(stdin, 3000);
  stdin.off("data", onData);
  if (s) return "";
  if (truncated)
    process.stderr.write(`warning: piped stdin exceeds ${MAX_PIPED_STDIN_BYTES} bytes, truncated
`);
  return buffer.replace(/\r?\n$/, "");
}
//@ chunk-bg51yd13.js:44739-44754 placement
var MAX_PIPED_STDIN_BYTES = 1048576;
//@ chunk-bg51yd13.js:44754-44949 placement
function appendPromptToArgs(e, bgStdin) {
  let dashDashIndex = findDashDashIndex(e);
  if (dashDashIndex >= 0) {
    let joined = e.slice(dashDashIndex + 1).join(" ");
    return [
      ...e.slice(0, dashDashIndex),
      "--",
      joined
        ? `${joined}
${bgStdin}`
        : bgStdin,
    ];
  }
  let promptArgIndex = findPromptArgIndex(e);
  if (promptArgIndex >= 0) {
    let s = [...e];
    s[promptArgIndex] = `${e[promptArgIndex]}
${bgStdin}`;
    return s;
  }
  return [...e, "--", bgStdin];
}
//@ chunk-bg51yd13.js:44949-45368 placement
/**
 * 在参数里找最后一个位置参数（提示词）的下标：跳过 flag 及其取值、--resume 的可选 id；找不到返回 -1。
 */
function findPromptArgIndex(e) {
  let flagValueIndices = getFlagValueIndices(e);
  let o = -1;
  for (let j = 0; j < e.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let s = e[j];
    if (looksLikeFlag(s)) {
      if (s.includes("=")) continue;
      let l = e[j + 1];
      if (l === undefined) continue;
      let { rest } = peelCombinedShortFlags(s);
      if (s === "--resume" || rest === "-r") {
        if (!looksLikeFlag(l)) j++;
        continue;
      }
      if (rest.length > 2 && (/^-r./.test(rest) || FORWARDED_VALUE_FLAGS.has(rest.slice(0, 2)))) continue;
      if (
        (BOOLEAN_FORWARDED_FLAGS.has(s) && s !== "--remote-control" && s !== "--rc") ||
        SINGLE_LETTER_FLAGS.has(rest)
      )
        continue;
      if (!flagValueIndices.has(j + 1) && !looksLikeFlag(l)) j++;
      continue;
    }
    o = j;
  }
  return o;
}
//@ chunk-bg51yd13.js:45368-45402 placement
var regExp = new RegExp(`${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} \\d+s`);
//@ chunk-bg51yd13.js:45402-45517 placement
function classifyDaemonError(detail) {
  let n = extractErrnoTokens(detail)[0];
  if (n) return n;
  if (regExp.test(detail)) return "timeout";
  return detail.includes(DAEMON_EXITED_BEFORE_REACHABLE_PHRASE) ? "exited" : "other";
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
function formatBgHints(short, n, o) {
  let r = (s, l) => sequential.dim("  " + s.padEnd(26) + l);
  return [
    `backgrounded \xB7 ${sequential.cyan(short)}${o ? ` \xB7 ${o}` : ""}${n ? sequential.dim(` ${n}`) : ""}`,
    r("claude agents", "list sessions"),
    r(`claude attach ${short}`, "open in this terminal"),
    r(`claude logs ${short}`, "show recent output"),
    r(`claude stop ${short}`, "stop this session"),
  ].join(`
`);
}
//@ chunk-bg51yd13.js:46146-46178 placement
function extraArgsWarningForArgv(e) {
  return extraArgsWarning(getBgVerbArgsWithoutDebug(e));
}
//@ chunk-bg51yd13.js:46178-46270 placement
function extraArgsWarning(e) {
  return e.length === 0
    ? null
    : `warning: extra arguments ignored: ${e.join(" ")}
`;
}
//@ chunk-bg51yd13.js:46270-46631 placement
/**
 * 取后台子命令动词之后的参数，去掉 --debug/-d/--debug-file 等调试参数和 --setting-sources 的取值。
 */
function getBgVerbArgsWithoutDebug(e) {
  let n = backgroundSessionVerbIndex(e);
  if (n === -1 || e.length <= n + 2) return [];
  let o = eagerCliFlagHonoredIndices("--setting-sources", e);
  let r = [];
  for (let j = n + 2; j < e.length; j++) {
    let l = e[j];
    if (o.has(j)) continue;
    if (
      l === "--debug" ||
      l === "-d" ||
      l === "--debug-to-stderr" ||
      l === "-d2e" ||
      l.startsWith("--debug=") ||
      l.startsWith("--debug-file=")
    )
      continue;
    if (l === "--debug-file" && j + 1 < e.length) {
      j++;
      continue;
    }
    r.push(l);
  }
  return r;
}
//@ chunk-bg51yd13.js:46631-46722 placement
function warnOnExtraArgs() {
  let e = extraArgsWarningForArgv(process.argv.slice(2));
  if (e) process.stderr.write(e);
  return e !== null;
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
async function removeJobStorage(e, n) {
  let jobDir = getJobDir(n);
  let r = await lstat(jobDir).catch(() => {
    return;
  });
  if (r === undefined || !r.isDirectory()) {
    await rm(jobDir, {
      recursive: true,
      force: true,
    }).catch(() => {});
    return;
  }
  await e
    .deleteScope({
      namespace: "job",
      jobId: n,
    })
    .catch(() => {});
}
//@ chunk-bg51yd13.js:47530-49783 placement
/**
 * 后台会话子命令的通用参数解析：--help、未知选项、按 id/名称查找作业。
 */
async function resolveJobArgument(query, usage, helpText, allowNameMatch, storage) {
  let l = warnOnExtraArgs();
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
    .filter((R) => SHORT_RE.test(R))
    .filter((R) => R.startsWith(query));
  if (filtered.length === 1)
    return {
      short: filtered[0],
      byName: false,
      nameLines: "",
    };
  let lower = query.trim().toLowerCase();
  let w = allowNameMatch && !SHORT_HEX_ID_PATTERN.test(lower);
  if (w && !l) {
    let filtered = (await listJobs(undefined, storage))
      .filter((E) => SHORT_RE.test(E.id))
      .map((E) => ({
        ...E,
        rank: rankJobNameMatch(E.state, lower),
      }))
      .filter((E) => E.rank !== 0);
    let any = filtered.some((E) => E.rank === 2 || E.rank === 3);
    let filtered_2 = filtered.filter((E) => E.rank !== 1 || !isDoneJob(E.state));
    if (filtered_2.length === 1 && any) {
      let { id, state } = filtered_2[0];
      let sorted = filtered
        .filter((j) => j.id !== id)
        .sort((j, K) => {
          let lastTerminalAt = j.state.lastTerminalAt ?? "";
          let lastTerminalAt_2 = K.state.lastTerminalAt ?? "";
          if (lastTerminalAt !== lastTerminalAt_2) return lastTerminalAt < lastTerminalAt_2 ? 1 : -1;
          return j.id < K.id ? -1 : 1;
        });
      let mapped = sorted.slice(0, MAX_MATCHED_JOBS).map(
        (j) => `  ${j.id}  ${sanitizeJobLabel(j.state.name || j.state.displayIntent || j.state.intent)}
`,
      );
      let N = sorted.length - mapped.length;
      let L =
        sorted.length > 0
          ? `The task text of ${sorted.length} finished ${plural(sorted.length, "session")} has '${sanitizeJobLabel(query)}' too:
${mapped.join("")}${
              N > 0
                ? `  \u2026 and ${N} more
`
                : ""
            }`
          : "";
      handleStreamGoneErrors(process.stderr);
      let F = `Session ${id} \xB7 ${sanitizeJobLabel(state.name ?? "")}
${L}`;
      process.stderr.write(F);
      return {
        short: id,
        byName: true,
        nameLines: F,
      };
    }
    if (filtered.length > 0) {
      let mapped = filtered
        .sort((T, N) => Number(T.rank === 1) - Number(N.rank === 1) || (T.id < N.id ? -1 : 1))
        .slice(0, MAX_LISTED_JOBS)
        .map(
          ({
            id,
            state,
            rank,
          }) => `  ${id}  ${sanitizeJobLabel(state.name || state.displayIntent || state.intent)}${any && rank === 1 ? "  (task text)" : ""}
`,
        );
      let x = filtered.length - mapped.length;
      let P = sanitizeJobLabel(query);
      process.stderr.write(`${
        any
          ? `${filtered.length} sessions match '${P}'`
          : `No session name matches '${P}'.
The task text of ${filtered.length} ${plural(filtered.length, "session")} has it`
      }:
${mapped.join("")}${
        x > 0
          ? `  \u2026 and ${x} more
`
          : ""
      }${!any ? "Use the id, or a session name." : filtered.some((T) => T.rank === 2) ? "Use more of the name, or the id." : "Use the id."}
`);
      process.exit(1);
    }
  }
  let A =
    !allowNameMatch || SHORT_RE.test(lower)
      ? ""
      : l
        ? `A name must be the only argument. Put a name with spaces in quotes.
`
        : w
          ? ""
          : `Text that can be the start of an id is not read as a name. Use more of the name.
`;
  process.stderr.write(
    filtered.length === 0
      ? `No job matching '${query}'. Run 'claude agents' to list running sessions.
${A}`
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
  let n = collapseWhitespace(stripFormatChars(collapseWhitespace(query)));
  return n.length > MAX_JOB_TEXT_CHARS
    ? "\u2026"
    : truncateWithEllipsis(redactSecrets(n), MAX_JOB_TEXT_SNIPPET_CHARS);
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
    let A = subscribeControl(
      short,
      500,
      (R) => {
        if (R.type === "snapshot") {
          A();
          resolve(R.streamTail);
        }
      },
      (R) => {
        A();
        resolve(R);
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
  let p = process.stdout.isTTY
    ? "\x1B[0m" +
      (cursorAddressed
        ? cursorPosition(rows, 1) +
          `
`
        : "")
    : "";
  await writeStdoutAndDrain(replay + p);
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
  let l = false;
  let u = "";
  let showStatus = (R, waitedMs) => {
    let rounded = Math.round(waitedMs / 1000);
    let S = rounded >= 5 ? `${R} (${rounded}s)` : R;
    if (isTty) {
      process.stderr.write(`\r${ERASE_LINE}${S}`);
      l = true;
    } else if (R !== u)
      process.stderr.write(`${S}
`);
    u = R;
  };
  let clearStatus = () => {
    if (l) {
      process.stderr.write(`\r${ERASE_LINE}`);
      l = false;
    }
  };
  let result = await attemptAttach();
  let waitedMs = 0;
  try {
    for (let j = 0; waitedMs < ATTACH_WAIT_TOTAL_MS; j++) {
      let msg = result.msg;
      let D = msg !== undefined && TRANSIENT_ATTACH_CODE.test(msg);
      let S =
        !D &&
        result.outcome === "error" &&
        msg !== undefined &&
        RACED_SOCKET_GAP.test(msg) &&
        !SUPERVISOR_DETACH_CODE.test(msg);
      if (msg === undefined || (!D && !S)) break;
      if (S) {
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
        let x = drainStdin();
        if (x && containsInterruptKey(x))
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
  let r = false;
  let jobArgument = await resolveJobArgument(
    query,
    "claude attach <id|name>",
    `Open the background session in this terminal. \u2190 returns to agent view, Ctrl+Z drops back to your shell. The session keeps running either way. ${NAME_IN_PLACE_OF_ID_HINT}`,
    true,
    storage,
  );
  let short = jobArgument.short;
  let u = 0;
  let y = randomUUID();
  let p = {
    gestureId: y,
    attempt: 0,
    t0,
    surface: "bg_cli",
    interactive: {},
    get daemonBooted() {
      return r;
    },
    markDaemonBooted: () => {
      r = true;
      updateAttachBeacon(
        y,
        {
          daemonBooted: true,
        },
        storage,
      );
    },
  };
  startAttachBeacon(p.gestureId, "bg_cli", storage).catch(() => {});
  let w = () =>
    u > 0 || jobArgument.byName
      ? {
          ...(u > 0 && {
            waited_transient_ms: u,
          }),
          ...(jobArgument.byName && {
            by_name: true,
          }),
        }
      : undefined;
  let A = async (E, x) => {
    reportAttachTelemetry(p, "error");
    await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
    await logFeatureBadAsync("cli_bg_attach", "daemon_unavailable", w());
    process.stderr.write(`${E} \u2014 ${bgSupervisorNoun()} is unavailable (${x})${daemonHint("status")}
`);
    return exitAfterAnalyticsFlush(1);
  };
  let daemonForDispatch = await ensureDaemonForDispatch(
    {
      onStarting: () => {
        r = true;
        updateAttachBeacon(
          y,
          {
            daemonBooted: true,
          },
          storage,
        );
      },
    },
    storage,
  );
  if (!daemonForDispatch.ok) return A("Couldn't attach", daemonForDispatch.reason);
  let h;
  if (await isBackgroundSessionGone(short))
    h = {
      outcome: "error",
      msg: ENOJOB_PROBE_FAILED_MESSAGE,
    };
  else {
    let E = await attachWithRetry(
      short,
      {
        gesture: p,
      },
      storage,
    );
    h = E.r;
    u += E.waitedMs;
    if (E.unavailableReason !== undefined) return A("Couldn't attach", E.unavailableReason);
  }
  if (h.outcome === "error" && h.msg?.includes("ENOJOB")) {
    let E = await readJobState(getJobDir(short), storage).catch(() => null);
    let x =
      E?.state === "failed" &&
      !isExecLaunch(E) &&
      (E.reapedMidWorkAt !== undefined || E.reapedUnsettledAt !== undefined);
    let P = E?.state === "failed" && !isExecLaunch(E) && E.detail === HOST_DIED_DETAIL;
    let T =
      E?.sessionId !== undefined && normalizeUuidOrNull(E.sessionId) !== null
        ? sanitizeMarkName(E.sessionId)
        : undefined;
    let metadata = T
      ? {
          target_session_id: T,
        }
      : {};
    if (E?.state === "failed" && !x && !P) {
      await logFeatureBadAsync("cli_bg_attach", "wake_failed_state", {
        ...w(),
        ...metadata,
      });
      process.stderr
        .write(`Session ${short} can't start \u2014 ${sanitizeLogLine(E.detail) || "it crashed repeatedly"}
`);
      reportAttachTelemetry(p, "error", "worker_crash_loop");
      await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
    if (jobArgument.byName) {
      await logFeatureSadAsync("cli_bg_attach", "wake_needs_id", {
        ...w(),
        ...metadata,
      });
      process.stderr.write(`The background service has no process for session ${short}.
A name opens only a running session. Use the id: \`claude attach ${short}\`
`);
      reportAttachTelemetry(p, "detached");
      await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
    if (x) {
      await logEventAsync("tengu_bg_attach_wake_after_reap", metadata);
      process.stderr.write(`Session ${short} was interrupted while unattended \u2014 resuming it\u2026
`);
    } else if (P)
      process.stderr.write(`Session ${short}'s terminal host died \u2014 restarting it on a fresh one\u2026
`);
    else if (E?.deadEpochReapedAt !== undefined && !isExecLaunch(E))
      process.stderr
        .write(`Session ${short} ended while the background service was off; looking for its saved conversation to resume\u2026
`);
    else
      process.stderr.write(`Waking session ${short}\u2026
`);
    if (E !== null) await promptBgWorkspaceTrust(E.cwd, storage);
    let L = await respawnBgSession(short, undefined, storage).catch((error) => ({
      ok: false,
      alive: false,
      short: undefined,
      error: errorMessage(error),
    }));
    if (L.ok || L.alive) {
      if (L.short && L.short !== short) {
        process.stderr.write(`Session moved to ${L.short}
`);
        short = L.short;
      }
      let F = await attachWithRetry(
        short,
        {
          gesture: p,
        },
        storage,
      );
      h = F.r;
      u += F.waitedMs;
      if (F.unavailableReason !== undefined) return A("Couldn't attach", F.unavailableReason);
    } else if ("errorCode" in L && L.errorCode === "dead_epoch_transcript_gone") {
      await logFeatureSadAsync("cli_bg_attach", "dead_epoch_transcript_gone", {
        ...w(),
        ...metadata,
      });
      process.stderr.write(`${L.error}
`);
      reportAttachTelemetry(p, "error", "respawn_failed");
      await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    } else {
      await logFeatureBadAsync("cli_bg_attach", x ? "wake_after_reap_failed" : "wake_failed", {
        ...w(),
        ...metadata,
      });
      process.stderr.write(
        x
          ? `Couldn't resume ${short} after the interruption \u2014 ${L.error}
`
          : `Couldn't wake ${short} \u2014 ${L.error}
`,
      );
      reportAttachTelemetry(p, "error", "respawn_failed");
      await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
      return exitAfterAnalyticsFlush(1);
    }
  }
  let D = () => {
    if (getPlatform() === "windows" && process.stdin.isTTY) setRawModeSafe(process.stdin, false);
  };
  let S = async () => {
    let jobStateAfterSettle = await readJobStateAfterSettle(getJobDir(short), storage);
    if (
      jobStateAfterSettle === null ||
      jobStateAfterSettle.state === "done" ||
      jobStateAfterSettle.state === "stopped" ||
      jobStateAfterSettle.state === "blocked"
    )
      reportAttachTelemetry(p, "detached");
  };
  while (h.outcome === "disconnected") {
    let daemon = await ensureDaemon(
      {
        forceTransient: true,
        onStarting: () => {
          r = true;
          updateAttachBeacon(
            y,
            {
              daemonBooted: true,
            },
            storage,
          );
        },
      },
      storage,
    );
    if (!daemon.ok) return A(`Couldn't reconnect to ${short}`, daemon.reason);
    if (await isBackgroundSessionGone(short)) {
      D();
      await S();
      break;
    }
    process.stderr.write(`Reconnecting to ${short}\u2026
`);
    if (getPlatform() === "windows" && process.stdin.isTTY) {
      setRawModeSafe(process.stdin, true);
      process.stdin.ref();
    }
    let x = drainStdin();
    if (x && containsInterruptKey(x)) {
      D();
      reportAttachTelemetry(p, "detached");
      h = {
        outcome: "detached",
      };
      break;
    }
    let P = await attachWithRetry(
      short,
      {
        abortOnDetachKey: true,
        gesture: p,
      },
      storage,
    );
    h = P.r;
    u += P.waitedMs;
    if (P.detachKeyAborted) {
      D();
      reportAttachTelemetry(p, "detached");
      h = {
        outcome: "detached",
      };
      break;
    }
    if (P.unavailableReason !== undefined) {
      D();
      return A(`Couldn't reconnect to ${short}`, P.unavailableReason);
    }
    if (h.outcome === "error" && h.msg?.includes("ENOJOB")) {
      D();
      await S();
      h = {
        outcome: "disconnected",
      };
      break;
    }
  }
  await Promise.race([clearAttachBeacon(p.gestureId, storage).catch(() => {}), sleep(750)]);
  if (
    h.outcome === "detached" &&
    h.msg &&
    (FATAL_ATTACH_CODE.test(h.msg) || TRANSIENT_ATTACH_CODE.test(h.msg))
  ) {
    await logFeatureBadAsync(
      "cli_bg_attach",
      FATAL_ATTACH_CODE.test(h.msg) ? "stalled" : "transient_exhausted",
      w(),
    );
    process.stderr.write(`${h.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, "")}
`);
    return exitAfterAnalyticsFlush(1);
  }
  if (isUserApcDetach(h, process.stdout.isTTY, process.stdin.isTTY)) {
    await logFeatureOkAsync("cli_bg_attach", w());
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
  if (h.outcome === "detached" && h.msg)
    process.stderr.write(`${h.msg.replace(KICKED_ATTACH_CODE, "")}
`);
  if (h.outcome === "disconnected") {
    let E = await readJobState(getJobDir(short), storage).catch(() => null);
    if (E?.state === "failed" && E.detail === HOST_DIED_DETAIL)
      process.stderr
        .write(`Session ${short}'s terminal host died \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.
`);
    else {
      let x = E?.state === "failed" && E.detail ? ` (${sanitizeLogLine(E.detail)})` : "";
      process.stderr.write(
        E?.state === "done" && (await hasConversationToResume(E, storage))
          ? `Session ${short} has exited \u2014 run \`claude attach ${short}\` to resume it.
`
          : `Session ${short} has exited${x}.
`,
      );
    }
  }
  if (h.outcome === "error") {
    let E = h.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`) ?? false;
    let x = h.msg?.startsWith(`${ENORESPONSE}:`) ?? false;
    let P = E || x ? await readJobState(getJobDir(short), storage).catch(() => null) : null;
    let T = P !== null && isExecLaunch(P);
    let N = E
      ? T
        ? `${HOST_DIED_EXEC_ATTACH_MESSAGE}.`
        : `${HOST_DIED_ATTACH_MESSAGE} \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.`
      : x
        ? T
          ? `${SESSION_NOT_RESPONDING_TEXT} \u2014 \`claude stop ${short}\` stops it (it runs a shell command, which is not run again for you).`
          : `${SESSION_NOT_RESPONDING_TEXT} \u2014 \`claude stop ${short}\`, then \`claude attach ${short}\` restarts it (the conversation is saved).`
        : h.msg?.includes(RESPAWNING_ATTACH_CODE)
          ? "Job is respawning after an upgrade \u2014 try attach again in a moment."
          : h.msg && (RACED_SOCKET_GAP.test(h.msg) || /ESTARTING/.test(h.msg))
            ? `${bgSupervisorNounCap()} is restarting \u2014 try again in a moment.`
            : (h.msg ?? "unknown");
    process.stderr.write(`Couldn't attach to ${short} \u2014 ${N}
`);
    await logFeatureBadAsync(
      "cli_bg_attach",
      E ? "host_dead" : x ? "no_response" : "transient_exhausted",
      w(),
    );
  } else await logFeatureOkAsync("cli_bg_attach", w());
  return exitAfterAnalyticsFlush(h.outcome === "error" ? 1 : 0);
}
//@ chunk-bg51yd13.js:58892-59008 placement
function isUserApcDetach(e, isTTY, isTTY_2) {
  return (
    e.outcome === "detached" &&
    e.viaApc === true &&
    (e.msg === undefined || !SUPERVISOR_DETACH_CODE.test(e.msg)) &&
    isTTY === true &&
    isTTY_2 === true
  );
}
//@ chunk-bg51yd13.js:59008-61338 placement
/**
 * claude respawn <id>|--all：重启后台会话以使用当前 Claude 二进制。
 */
async function respawnHandler(e, storage) {
  warnOnExtraArgs();
  if (e === "--help" || e === "-h") {
    process.stdout.write(`Usage: claude respawn <id>|--all

  Restart a background session (or all of them) so it picks up the current Claude binary.
`);
    return;
  }
  if (e?.startsWith("-") && e !== "--all") {
    process.stderr.write(`unknown option '${e}'
Usage: claude respawn <id>|--all
`);
    process.exitCode = 1;
    return;
  }
  if (!e) {
    process.stderr.write(`usage: claude respawn <id>|--all
`);
    process.exitCode = 1;
    return;
  }
  let o = [];
  if (e !== "--all") {
    o = (storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir(getJobsDir()).catch(() => []))
      .filter((y) => SHORT_RE.test(y))
      .filter((y) => y.startsWith(e));
    if (o.length !== 1) {
      process.stderr.write(
        o.length === 0
          ? `No job matching '${e}'
`
          : `Ambiguous prefix '${e}', matches: ${o.join(", ")}
`,
      );
      await logFeatureBadAsync("cli_bg_respawn", o.length === 0 ? "no_match" : "ambiguous");
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
  if (e === "--all") {
    let filtered = (await listJobs(undefined, storage)).filter((A) => !isTerminal(A.state.state));
    if (filtered.length === 0) {
      process.stdout.write(`no live jobs to respawn
`);
      return;
    }
    let p = 0;
    let w = 0;
    for (let A of filtered) {
      await promptBgWorkspaceTrust(A.state.cwd, storage);
      let R = await respawnBgSession(
        A.id,
        {
          force: true,
          knownState: A.state,
        },
        storage,
      );
      if (R.ok) {
        p++;
        process.stdout.write(`respawned ${A.id}${R.short !== A.id ? ` \u2192 ${R.short}` : ""}
`);
      } else if (R.alive) {
        w++;
        process.exitCode = 1;
        process.stderr.write(`${A.id}: still running \u2014 couldn't confirm restart, retry in a moment
`);
      } else {
        process.exitCode = 1;
        process.stderr.write(`${A.id}: ${R.error}
`);
      }
    }
    if (p === filtered.length) await logFeatureOkAsync("cli_bg_respawn");
    else if (p > 0 || w > 0) await logFeatureSadAsync("cli_bg_respawn", w > 0 ? "still_alive" : "partial");
    else await logFeatureBadAsync("cli_bg_respawn", "spawn_failed");
    return;
  }
  let s = o[0];
  let l = await respawnBgSession(
    s,
    {
      force: true,
    },
    storage,
  );
  if (!l.ok && l.errorCode === "workspace_untrusted" && l.state !== undefined) {
    await promptBgWorkspaceTrust(l.state.cwd, storage);
    if (checkWorkspaceTrust(l.state.cwd).verdict !== "untrusted")
      l = await respawnBgSession(
        s,
        {
          force: true,
        },
        storage,
      );
  }
  if (!l.ok && l.alive) {
    process.stderr.write(`${s}: still running \u2014 couldn't confirm restart, retry in a moment
`);
    await logFeatureSadAsync("cli_bg_respawn", "still_alive");
    process.exitCode = 1;
    return;
  }
  if (!l.ok) {
    process.stderr.write(`${l.error}
`);
    await logFeatureBadAsync("cli_bg_respawn", "spawn_failed");
    process.exitCode = 1;
    return;
  }
  await logFeatureOkAsync("cli_bg_respawn");
  process.stdout.write(`respawned ${s}${l.short !== s ? ` \u2192 ${l.short}` : ""}
`);
}
//@ chunk-bg51yd13.js:61338-62534 placement
async function stopHandler(e, storage, o = false) {
  let query = e;
  let { short } = await resolveJobArgument(
    query,
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
async function rmHandler(e, storage, o = getBgVerbArgsWithoutDebug(process.argv.slice(2)), r = false) {
  let s;
  let l;
  let u;
  let y;
  let p = [];
  let w = e === undefined ? o : [e, ...o];
  for (let idx = 0; idx < w.length; idx++) {
    let N = w[idx];
    if (N === "--help" || N === "-h") {
      process.stdout.write(RM_HELP);
      process.exit(0);
    }
    if (N === "--discard-unpushed" || N.startsWith("--discard-unpushed=")) {
      let [L, F, ...j] = ((N === "--discard-unpushed" ? w[++idx] : N.slice(19)) ?? "")
        .toLowerCase()
        .split("@");
      if (
        j.length > 0 ||
        L === undefined ||
        !isValidGitSha(L) ||
        F === undefined ||
        !WORKTREE_DIGEST_PATTERN.test(F)
      ) {
        y = `option '--discard-unpushed' takes the <commit>@<worktree-id> value shown by a previous 'claude rm <id>' refusal
`;
        break;
      }
      l = {
        headSha: L,
        worktreeDigest: F,
      };
    } else if (N === "--force-remove-worktree" || N.startsWith("--force-remove-worktree=")) {
      let lower = ((N === "--force-remove-worktree" ? w[++idx] : N.slice(24)) ?? "").toLowerCase();
      if (!WORKTREE_DIGEST_PATTERN.test(lower)) {
        y = `option '--force-remove-worktree' takes the <worktree-id> value shown by a previous 'claude rm <id>' refusal
`;
        break;
      }
      u = lower;
    } else if (N.startsWith("-")) {
      y = `unknown option '${N}'
`;
      break;
    } else if (s === undefined) s = N;
    else p.push(N);
  }
  if (y !== undefined || !s) {
    process.stderr.write(`${y ?? ""}${RM_USAGE}`);
    process.exit(1);
  }
  let A = extraArgsWarning(p);
  if (A) process.stderr.write(A);
  let filtered = (
    storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir(getJobsDir()).catch(() => [])
  )
    .filter((T) => SHORT_RE.test(T))
    .filter((T) => T.startsWith(s));
  if (filtered.length !== 1) {
    process.stderr.write(
      filtered.length === 0
        ? `No job matching '${s}'
`
        : `Ambiguous prefix '${s}', matches: ${filtered.join(", ")}
`,
    );
    process.exit(1);
  }
  let D = filtered[0];
  let jobState = await readJobState(getJobDir(D), storage);
  let E = await deleteJob(
    D,
    {
      ...(l !== undefined && {
        discardUnpushed: l,
      }),
      ...(u !== undefined && {
        forceRemoveWorktree: u,
      }),
    },
    storage,
  );
  if (!E.removed) {
    let { error, errorCode, keptWorktree } = E;
    if (keptWorktree) {
      await logFeatureSadAsync("cli_bg_rm", "kept_worktree");
      let F = formatRmOutcome(
        {
          reason: E.keptReason ?? "remove_failed",
          errorSummary: E.keptErrorSummary,
          unpushed: E.keptUnpushed,
          discardUnpushed: E.discardUnpushed,
          forceRemove: E.forceRemoveWorktree,
          forceRemoveWithheld: E.forceRemoveWithheld,
          submoduleWork: E.submoduleWork,
        },
        {
          worktree: keptWorktree,
          jobId: D,
        },
      );
      process.stdout.write(
        `kept ${D} \u2014 its worktree is still at ${keptWorktree}
` +
          F.cli
            .map(
              (j) => `  ${j}
`,
            )
            .join(""),
      );
      process.exitCode = 1;
      return;
    }
    await logFeatureBadAsync("cli_bg_rm", errorCode ?? "kill_unconfirmed");
    process.stderr
      .write(`couldn't remove ${D} \u2014 ${error ?? "the background service may be restarting. Try again in a moment."}
`);
    process.exitCode = 1;
    return;
  }
  await logEventAsync("tengu_bg_agent_action", {
    action: lit("delete"),
    source: lit("cli"),
    jobSessionId: sanitizeMarkName(jobState?.sessionId) ?? lit(""),
  });
  let { leftWorktreeDir, forcedWorktreeRemoval } = E;
  if (leftWorktreeDir) await logFeatureSadAsync("cli_bg_rm", "worktree_left_in_place");
  else if (forcedWorktreeRemoval) await logFeatureSadAsync("cli_bg_rm", "worktree_force_removed");
  else await logFeatureOkAsync("cli_bg_rm");
  process.stdout.write(
    `removed ${D}` +
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
//@ chunk-bg51yd13.js:66128-66271 placement = filterAppsForDescription (0.354)
/**
 * （误归 computerUse）把 -abc 形式拆出已知短选项，返回 {peeled, rest}。
 */
function peelCombinedShortFlags(e) {
  let peeled = [];
  let rest = e;
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
function looksLikeFlag(e) {
  return e.length > 1 && e.startsWith("-");
}
//@ chunk-bg51yd13.js:66323-66420 placement
function findDashDashIndex(e) {
  let flagValueIndices = getFlagValueIndices(e);
  for (let j = 0; j < e.length; j++) if (e[j] === "--" && !flagValueIndices.has(j)) return j;
  return -1;
}
//@ chunk-bg51yd13.js:66420-66556 placement
function stripBgOnlyFlags(e) {
  let dashDashIndex = findDashDashIndex(e);
  let o = dashDashIndex >= 0 ? e.slice(0, dashDashIndex) : e;
  let flagValueIndices = getFlagValueIndices(o);
  let filtered = o.filter((l, u) => flagValueIndices.has(u) || !BG_FLAG_NAMES.includes(l));
  return dashDashIndex >= 0 ? [...filtered, ...e.slice(dashDashIndex)] : filtered;
}
//@ chunk-bg51yd13.js:66556-66951 placement
/**
 * 取某个 flag 的值：支持 `--x v`、`--x=v`、组合短参数 `-abv`/`-a v`；遇到 `--` 停止；多次出现取最后一个。
 */
function getFlagValue(e, n, o) {
  let flagValueIndices = getFlagValueIndices(e);
  let s;
  for (let j = 0; j < e.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let u = e[j];
    if (u === "--") break;
    if (u === n || (o !== undefined && u === o)) {
      if (e[j + 1] !== undefined) {
        s = e[j + 1];
        j++;
      }
      continue;
    }
    if (u.startsWith(`${n}=`)) {
      s = u.slice(n.length + 1);
      continue;
    }
    if (o !== undefined) {
      let { peeled, rest } = peelCombinedShortFlags(u);
      if (rest.length > 2 && rest.slice(0, 2) === o) {
        s = rest.slice(2);
        continue;
      }
      if (peeled.length > 0 && rest === o && e[j + 1] !== undefined) {
        s = e[j + 1];
        j++;
      }
    }
  }
  return s;
}
//@ chunk-bg51yd13.js:66951-67678 placement
function rewriteDispatchFlagValue(respawnFlags, n, o, name) {
  let flagValueIndices = getFlagValueIndices(respawnFlags);
  let l = [...respawnFlags];
  let u = false;
  for (let j = 0; j < respawnFlags.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let w = respawnFlags[j];
    if (w === "--") break;
    if (w === n || (o !== undefined && w === o)) {
      if (respawnFlags[j + 1] !== undefined) {
        if (!isAcceptableModelArg(name)) {
          l[j] = `${n}=${name}`;
          l[j + 1] = null;
          u = true;
        } else if (respawnFlags[j + 1] !== name) {
          l[j + 1] = name;
          u = true;
        }
        j++;
      }
      continue;
    }
    if (w.startsWith(`${n}=`)) {
      if (w.slice(n.length + 1) !== name) {
        l[j] = `${n}=${name}`;
        u = true;
      }
      continue;
    }
    if (o !== undefined) {
      let { peeled, rest } = peelCombinedShortFlags(w);
      if (rest.length > 2 && rest.slice(0, 2) === o) {
        if (rest.slice(2) !== name) {
          l[j] = `${w.slice(0, w.length - (rest.length - 2))}${name}`;
          u = true;
        }
        continue;
      }
      if (peeled.length > 0 && rest === o && respawnFlags[j + 1] !== undefined) {
        if (!isAcceptableModelArg(name)) {
          l[j] = `-${peeled.map((h) => h.slice(1)).join("")}`;
          l[j + 1] = `${n}=${name}`;
          u = true;
        } else if (respawnFlags[j + 1] !== name) {
          l[j + 1] = name;
          u = true;
        }
        j++;
      }
    }
  }
  if (!u) return;
  let y = [];
  for (let p of l) if (p !== null) y.push(p);
  return y;
}
//@ chunk-bg51yd13.js:67678-68131 placement
/**
 * 返回参数数组里"作为 flag 取值"的下标集合（如 --rc 的名字、多值 flag 的后续值），供其他扫描函数跳过。
 */
function getFlagValueIndices(e) {
  let n = new Set();
  for (let j = 0; j < e.length; j++) {
    if (n.has(j)) continue;
    let r = e[j];
    if (r === "--") break;
    let { rest } = peelCombinedShortFlags(r);
    if (r === "--resume" || rest === "-r") continue;
    if (
      (r === "--remote-control" || r === "--rc") &&
      e[j + 1] !== undefined &&
      !(e[j + 1].length > 1 && e[j + 1].startsWith("-"))
    ) {
      n.add(j + 1);
      continue;
    }
    if (!rest.includes("=") && BACKGROUND_FORWARDED_VALUE_FLAGS.has(rest) && e[j + 1] !== undefined) {
      n.add(j + 1);
      if (VARIADIC_FORWARDED_FLAGS.has(rest)) {
        let l = j + 2;
        while (e[l] !== undefined && !(e[l].length > 1 && e[l].startsWith("-"))) {
          n.add(l);
          l++;
        }
      }
    }
  }
  return n;
}
//@ chunk-bg51yd13.js:68131-68471 placement
/**
 * 参数里有 --continue/-c 返回 true；有 --resume/-r 时只有带了会话 id 才返回 true。
 */
function hasContinueOrResumeId(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let o = false;
  let r = false;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let l = argv[j];
    if (l === "--") break;
    if (l === "--continue") {
      r = true;
      continue;
    }
    if (l === "--resume" || l.startsWith("--resume=")) {
      o = true;
      continue;
    }
    let { peeled, rest } = peelCombinedShortFlags(l);
    if (peeled.includes("-c") || rest === "-c") r = true;
    if (rest === "-r" || /^-r./.test(rest)) o = true;
  }
  if (o) return getResumeArg(argv) !== undefined;
  return r;
}
//@ chunk-bg51yd13.js:68471-68792 placement
/**
 * 取 --resume/-r 的参数值（--resume=、-rXXX、或下一个非 flag 参数），没有值返回 undefined。
 */
function getResumeArg(e) {
  let flagValueIndices = getFlagValueIndices(e);
  let o;
  for (let j = 0; j < e.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let s = e[j];
    if (s === "--") break;
    if (s.startsWith("--resume=")) {
      o = s.slice(9) || undefined;
      continue;
    }
    let { rest } = peelCombinedShortFlags(s);
    if (/^-r./.test(rest)) {
      o = rest.slice(2);
      continue;
    }
    if (s === "--resume" || rest === "-r") {
      let u = e[j + 1];
      if (u !== undefined && !looksLikeFlag(u)) {
        o = u;
        j++;
      } else o = undefined;
    }
  }
  return o;
}
//@ chunk-bg51yd13.js:68792-69022 placement
function hasResumeOrContinueFlag(e) {
  let flagValueIndices = getFlagValueIndices(e);
  return e.some((o, r) => {
    if (flagValueIndices.has(r)) return false;
    if (o === "--continue" || o === "--resume" || o.startsWith("--resume=")) return true;
    let { peeled, rest } = peelCombinedShortFlags(o);
    return peeled.includes("-c") || rest === "-c" || rest === "-r" || /^-r./.test(rest);
  });
}
//@ chunk-bg51yd13.js:69022-69089 placement
function hasBareFlag(e, n) {
  let flagValueIndices = getFlagValueIndices(e);
  return e.some((r, s) => !flagValueIndices.has(s) && r === n);
}
//@ chunk-bg51yd13.js:69089-69768 placement
function stripResumeFlags(e) {
  let flagValueIndices = getFlagValueIndices(e);
  let o = [];
  for (let j = 0; j < e.length; j++) {
    let s = e[j];
    if (flagValueIndices.has(j)) {
      o.push(s);
      continue;
    }
    if (s === "--") {
      for (let y = j; y < e.length; y++) o.push(e[y]);
      break;
    }
    if (
      s === "--fork-session" ||
      s === "--continue" ||
      s.startsWith("--resume=") ||
      s.startsWith("--session-id=")
    )
      continue;
    let { peeled, rest } = peelCombinedShortFlags(s);
    if (peeled.length > 0 || rest === "-c" || rest.startsWith("-r")) {
      let mapped = peeled.filter((R) => R !== "-c").map((R) => R[1]);
      let p = rest === "-c" || /^-r./.test(rest);
      let w = rest === "-r";
      let A = p || w ? "" : rest.slice(1);
      if (mapped.length > 0 || A) o.push(`-${mapped.join("")}${A}`);
      if (w && e[j + 1] !== undefined && !looksLikeFlag(e[j + 1])) j++;
      continue;
    }
    if (s === "--session-id") {
      if (e[j + 1] !== undefined) j++;
      continue;
    }
    if (s === "--resume") {
      if (e[j + 1] !== undefined && !looksLikeFlag(e[j + 1])) j++;
      continue;
    }
    o.push(s);
  }
  return o;
}
//@ chunk-bg51yd13.js:69768-70045 placement
function stripSessionIdFlag(argv) {
  let flagValueIndices = getFlagValueIndices(argv);
  let o = [];
  for (let j = 0; j < argv.length; j++) {
    let s = argv[j];
    if (flagValueIndices.has(j)) {
      o.push(s);
      continue;
    }
    if (s === "--") {
      for (let l = j; l < argv.length; l++) o.push(argv[l]);
      break;
    }
    if (s.startsWith("--session-id=")) continue;
    if (s === "--session-id") {
      if (argv[j + 1] !== undefined) j++;
      continue;
    }
    o.push(s);
  }
  return o;
}
//@ chunk-bg51yd13.js:70045-71769 placement
/**
 * 检查后台会话不支持的参数组合（--project-config-root、--print、从文件读 --agents、bypassPermissions 未接受免责声明等），返回拒绝说明。
 */
function validateBgLaunchFlags(args) {
  let separatorIndex = findDashDashIndex(args);
  let launchArgs = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
  let valueIndexes = getFlagValueIndices(launchArgs);
  let flagArgs = launchArgs.filter((launchArg, p) => !valueIndexes.has(p));
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
  let r;
  for (let j = 0; j < argv.length; j++) {
    if (flagValueIndices.has(j)) continue;
    let l = argv[j];
    if (looksLikeFlag(l)) {
      let { rest } = peelCombinedShortFlags(l);
      if ((l === "--resume" || rest === "-r") && argv[j + 1] !== undefined && !looksLikeFlag(argv[j + 1]))
        j++;
      continue;
    }
    if (l.length > 0 && l !== resumeArg) r = l;
  }
  return r;
}
//@ chunk-bg51yd13.js:71994-72321 placement
/**
 * 去掉位置参数，只保留 flag 及其取值（用于把参数转成可重放的 respawnFlags）。
 */
function keepFlagArgsOnly(argsWithoutResume) {
  let flagValueIndices = getFlagValueIndices(argsWithoutResume);
  let o = [];
  for (let j = 0; j < argsWithoutResume.length; j++) {
    let s = argsWithoutResume[j];
    if (flagValueIndices.has(j)) {
      o.push(s);
      continue;
    }
    if (!looksLikeFlag(s)) continue;
    if (s.includes("=")) {
      o.push(s);
      continue;
    }
    let { rest } = peelCombinedShortFlags(s);
    if (FORWARDED_VALUE_FLAGS.has(rest)) {
      o.push(s);
      continue;
    }
    if (BOOLEAN_FORWARDED_FLAGS.has(s)) {
      o.push(s);
      continue;
    }
    let u = argsWithoutResume[j + 1];
    if (u !== undefined && !looksLikeFlag(u) && !flagValueIndices.has(j + 1)) {
      j++;
      continue;
    }
    o.push(s);
  }
  return o;
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
};
