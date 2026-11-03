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
import {
  mkdir,
  mkdir as mkdir_2,
  writeFile,
  rm,
  rm as rm_2,
  readdir,
  readdir as readdir_2,
  lstat,
} from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
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
import { jwn, ePe, $A } from "../../utils/sandbox/userNamespace.js";
import {
  checkWorkspaceTrust,
  formatWorkspaceUntrusted,
  trackBgDispatch,
  St,
  defaultShellForPlatform,
  dispatchViaDaemon,
  Nt,
  WXe,
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
  hyn,
  FORWARDED_VALUE_FLAGS,
  lqr,
  G2t,
  Evt,
} from "../forwardedFlags.js";
import { isWindowsDevicePath } from "../../utils/windowsUncPaths.js";
import { findAgentExcludingWebFetch } from "../../tools/WebFetchTool/harnessNotes.js";
import { getAgentDefinitionsWithOverrides } from "../../tools/AgentTool/loadAgentsDir.js";
import { logForDebugging } from "../../utils/debug.js";
import { isEnvTruthy, isRestrictedMode } from "../../utils/envUtils.js";
import { withHostEnvRestored, withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
import {
  isPersonalConfigRestricted,
  getPersonalConfigFixHint,
} from "../../utils/personalConfigRestriction.js";
import { collectProviderPassthroughEnv, Ot, getSecureStorageConfigDir } from "./bgSpawnEnv.js";
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
import { Vt } from "../../utils/agentId.js";
import { isTranscriptFileResumeArg } from "../../utils/sessionStoragePortable.js";
import { CLAUDE_BG_GATEWAY_WITHHELD } from "../../services/api/errors.js";
import { E5s } from "../../utils/conversationRecovery.js";
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
import { Pke } from "../../utils/fsJunctions.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { setIsInteractive, getProjectConfigRoot } from "../../bootstrap/state.js";
import { drainConfigWrites, getGlobalConfig } from "../../utils/config.js";
import { queuePromptForJob, imt } from "../../services/daemon/spawnLauncher.js";
import { respawnBgSession } from "./bgSpare.js";
import { uniq } from "../../utils/collections.js";
import { sanitizeSessionTitle, plural, Dr, stripFormatChars } from "../../utils/stringUtils.js";
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
  IHt,
} from "../../daemon/jobs/attachErrors.js";
import { ye } from "../../utils/startupMarks.js";
import { getPlatform } from "../../utils/platform.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { relaunchClaudeCode } from "../../utils/processRelaunch.js";
import { earlyArgsToArgv } from "../earlyArgs.js";
import { appliedSettingSourcesFlagValue, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { writePendingWakeup } from "../../utils/scheduledWakeup.js";
import { markJobStoppedOnRow } from "../../services/daemon/jobRow.js";
import { isValidGitSha } from "../../utils/git/gitFilesystem.js";
import { printableLabel } from "../../utils/printableName.js";
import { Xse } from "../../services/daemon/processLiveness.js";
import { looksLikeAgentsJson } from "../agentsArg.js";
import { hasSkipDangerousModePermissionPrompt, hasAutoModeOptIn } from "../../utils/settings/settings.js";

//@ chunk-bg51yd13.js:27567-27615 placement
function gateCauseExtra(e) {
  return e ? [{ gate_cause: fromEnum(e) }] : [];
}
//@ chunk-bg51yd13.js:27615-27700 placement
function workspaceGateCause(e) {
  return e.unresolvable ? "workspace_unresolvable" : "workspace_untrusted";
}
//@ chunk-bg51yd13.js:27700-28705 placement
async function preSeedReplBgJob(e, n, o) {
  let sliced = e.slice(0, 8),
    s = getJobDir(sliced);
  await ensureJobTmpFolder(sliced, o);
  let l = n.intent ?? "",
    y = {
      ...makeInitialState({
        template: { name: "bg", description: "" },
        intent: l,
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
        interactiveLineage: !0,
        providerEnv: callerProviderEnv(),
        sessionPermissionRules: n.sessionPermissionRules,
        memoryToggledOff: n.memoryToggledOff,
        autoMemoryOffThisSession: n.autoMemoryOffThisSession,
        linkScanPath: n.linkScanPath,
        inFlight: n.inFlight,
        respawnFlags: n.respawnFlags,
      }),
      ...(n.keptBy !== void 0 && { keptBy: n.keptBy }),
      ...(n.createdAt !== void 0 && { createdAt: n.createdAt }),
    };
  if ((await writeStateAtomic(s, y, o), env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST))
    if (isStorageV5Enabled() && o !== void 0 && isValidKeySegment(sliced))
      (await ensureTombstoneScope(o), await writeHostTombstone(o, sliced, encodeHostLineage(y.providerEnv)));
    else
      (await mkdir(jwn(), { recursive: !0, mode: 448 }),
        await writeFile(ePe(sliced), encodeHostLineage(y.providerEnv)));
  return { short: sliced, jobDir: s, state: y };
}
//@ chunk-bg51yd13.js:28705-29384 placement
async function spawnBgSession(e, n, o = "shell", r, s, l, u, y) {
  let p = validateBgLaunchFlags(e);
  if (p) return { ok: !1, error: p, reason: "gate_blocked", gateCause: "disclaimer" };
  let w = checkWorkspaceTrust(r ?? getCwd());
  if (w.verdict === "untrusted")
    return {
      ok: !1,
      error: formatWorkspaceUntrusted(w),
      reason: "gate_blocked",
      gateCause: workspaceGateCause(w),
    };
  let A = r === void 0 ? void 0 : w.cwd,
    R = n ?? randomUUID_2(),
    h = u ?? R.slice(0, 8),
    D = getJobDir(h);
  return trackBgDispatch(
    h,
    (async () => {
      try {
        return (
          await ensureJobTmpFolder(h, y),
          await spawnBgSession_2(
            e,
            o,
            A,
            s,
            l,
            { sessionId: R, short: h, jobDir: D, freshDir: n === void 0 },
            w.verdict === "session",
            y,
          )
        );
      } catch (error) {
        if (o !== "fleet" && o !== "spare")
          if (y) await removeJobStorage(y, h);
          else await rm_2(D, { recursive: !0, force: !0 }).catch(() => {});
        return {
          ok: !1,
          error: `Couldn't start the session \u2014 ${errorMessage(error)}`,
          reason: `spawn_failed_${sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error) ?? "unknown"}`,
        };
      }
    })(),
  );
}
/**
 * 解析 --bg 启动参数（--agent、--name、--fork-session、恢复参数）并通过守护进程或回退路径启动后台会话（约 7 KB）。
 */
//@ chunk-bg51yd13.js:29384-36584 placement
async function spawnBgSession_2(argv, launchMode, cwd, launchOptions, s, jobIdentity, u, storage) {
  let { sessionId: sessionId, short: short, jobDir: jobDir, freshDir: freshDir } = jobIdentity,
    dashDashIndex = De(argv),
    argsBeforeDashDash = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv,
    agentName = getFlagValue(argsBeforeDashDash, "--agent"),
    E = void 0,
    nameFlag = getFlagValue(argsBeforeDashDash, "--name", "-n"),
    sessionName = nameFlag ?? launchOptions?.name,
    resumeArg = getResumeArg(argsBeforeDashDash),
    positionalPrompt =
      dashDashIndex >= 0 ? argv.slice(dashDashIndex + 1).join(" ") : findLastPositionalArg(argv, resumeArg),
    flagValueIndices = getFlagValueIndices(argsBeforeDashDash),
    hasResumeFlag = hasResumeOrContinueFlag(argsBeforeDashDash),
    hasForkSessionFlag = Ht(argsBeforeDashDash, "--fork-session"),
    argsWithoutResume = stripResumeFlags(argsBeforeDashDash),
    bgIsolation =
      launchOptions?.bgIsolation === "default"
        ? void 0
        : launchMode === "repl"
          ? "none"
          : launchOptions?.bgIsolation,
    providerEnv = launchOptions?.providerEnv ?? callerProviderEnv(),
    ke = launchOptions?.sessionPermissionRules,
    Te = launchOptions?.memoryToggledOff,
    Qe = launchOptions?.autoMemoryOffThisSession,
    te = launchOptions?.forkSourceAlive,
    $e = launchOptions?.forkBoundaryAt,
    oe = launchOptions?.forkSessionId,
    Ce = launchOptions?.forkParentSessionId,
    respawnFlags = moveSkipPermissionsLast(
      splitForwardableArgs(dashDashIndex >= 0 ? argsWithoutResume : keepFlagArgsOnly(argsWithoutResume)),
    );
  if (launchMode === "shell") {
    let G = cwd ?? getCwd(),
      q = stripForwardedFlags(argsWithoutResume),
      Be = [
        ...argsWithoutResume.filter((it, Ze) => q[Ze] !== it),
        ...(isWindowsDevicePath(G) ? [G] : []),
        ...(launchOptions?.exec && isWindowsDevicePath(launchOptions.exec) ? [launchOptions.exec] : []),
        ...(resumeArg !== void 0 && isWindowsDevicePath(resumeArg) ? [resumeArg] : []),
      ];
    if (Be.length > 0)
      process.stderr
        .write(`warning: background sessions do not support Windows network (UNC) paths; the following will be neutralized: ${Be.join(", ")}
`);
  }
  let re = resumeArg !== void 0 && resumeArg === sessionId,
    Je = hasResumeFlag && !hasForkSessionFlag ? ["--fork-session"] : [],
    xe = re ? [] : ["--session-id", sessionId, ...Je];
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
    : void 0;
  if (agentName && !agentDefinition && launchMode === "shell")
    process.stderr.write(`warning: no agent named '${agentName}' \u2014 spawning with default template
`);
  let Z = void 0,
    intent = launchOptions?.intent ?? positionalPrompt ?? "",
    isIdleLaunch =
      !agentDefinition?.initialPrompt &&
      !launchOptions?.exec &&
      !positionalPrompt &&
      !argsBeforeDashDash.some((G, q) => !flagValueIndices.has(q) && G === "--reply-on-resume"),
    Ye = !1,
    qe;
  if (launchMode !== "fleet" && launchMode !== "spare") {
    let G = freshDir ? null : await readJobState(jobDir, storage);
    if (G === null)
      qe = writeStateAtomic(
        jobDir,
        makeInitialState({
          template: {
            name: launchOptions?.exec ? "exec" : (agentName ?? void 0 ?? "bg"),
            description: agentDefinition?.whenToUse ?? Z?.description ?? "",
            initialPrompt: agentDefinition?.initialPrompt,
            color: agentDefinition?.color,
          },
          routine: void 0,
          respawnFlags: respawnFlags,
          intent: intent,
          name: sessionName,
          nameSource: nameFlag
            ? nameFlag === launchOptions?.name && launchOptions.nameSource
              ? launchOptions.nameSource
              : "user"
            : launchOptions?.nameSource,
          color: launchOptions?.color,
          detail:
            launchOptions?.detail ??
            (isIdleLaunch ? (Z ? `(idle \u2014 waiting for ${St(Z.triggers)})` : IDLE_DETAIL) : void 0),
          tempo: isIdleLaunch ? (Z ? "idle" : "blocked") : void 0,
          needs: isIdleLaunch && !Z ? IDLE_NEEDS : void 0,
          sessionId: sessionId,
          cwd: cwd ?? getCwd(),
          worktreePath: launchOptions?.worktree?.path,
          worktreeBranch: launchOptions?.worktree?.branch,
          worktreeHookBased: launchOptions?.worktree?.hookBased,
          originCwd: launchOptions?.worktree?.originCwd,
          bgIsolation: bgIsolation,
          interactiveLineage: launchMode === "repl" ? !0 : void 0,
          inFlight: launchOptions?.inFlight,
          providerEnv: providerEnv,
          sessionPermissionRules: ke,
          memoryToggledOff: Te,
          autoMemoryOffThisSession: Qe,
          forkSourceAlive: te,
          forkBoundaryAt: $e,
          forkSessionId: launchOptions?.forkSessionId,
          forkParentSessionId: Ce,
        }),
        storage,
      )
        .then(() => {
          Ye = !0;
        })
        .catch((q) => logForDebugging(`bg seed state write failed: ${errorMessage(q)}`, { level: "warn" }));
    else if (respawnFlags.length > 0 && G.respawnFlags.length === 0)
      qe = writeStateAtomic(jobDir, { ...G, respawnFlags: respawnFlags }, storage).catch((q) =>
        logForDebugging(`bg respawnFlags patch failed: ${errorMessage(q)}`, { level: "warn" }),
      );
  }
  let Ee =
      isEnvTruthy(providerEnv.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST) &&
      isEnvTruthy(env.CLAUDE_CODE_AUTO_MODE_SERVER)
        ? (withHostEnvRestored(() => env.CLAUDE_CODE_AUTO_MODE_SERVER) ?? "")
        : env.CLAUDE_CODE_AUTO_MODE_SERVER,
    Ie = isPersonalConfigRestricted(),
    we = Ie ? getPersonalConfigFixHint() : void 0,
    ce =
      !launchOptions?.exec &&
      (launchMode === "repl" || (!launchOptions?.providerEnv && !cwd) || cwd === getCwd()),
    Ke =
      !launchOptions?.exec && !ce && cwd
        ? withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv)).ANTHROPIC_BASE_URL
        : void 0,
    Ne = Ke !== void 0 && !isFirstPartyAnthropicHost(Ke) ? cwd : void 0;
  if (Ne)
    logForDebugging("bg: this session's ANTHROPIC_BASE_URL is not passed to a session in another folder");
  let Ae = {
      proto: BG_PROTO,
      short: short,
      sessionId: sessionId,
      createdAt: Date.now(),
      source: launchMode === "repl" ? "slash" : launchMode,
      cwd: cwd ?? getCwd(),
      launch: launchOptions?.exec
        ? { mode: "exec", ...defaultShellForPlatform(launchOptions.exec) }
        : hasResumeFlag && resumeArg !== void 0
          ? {
              mode: "resume",
              sessionId: resumeArg,
              transcriptPath: launchOptions?.resumeTranscriptPath,
              restoresTranscript:
                Vt(resumeArg) !== null ||
                isTranscriptFileResumeArg(resumeArg) ||
                launchOptions?.resumeTranscriptPath !== void 0,
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
        ...(env.CLAUDE_CODE_EXTRA_BODY && { CLAUDE_CODE_EXTRA_BODY: env.CLAUDE_CODE_EXTRA_BODY }),
        ...(env.CLAUDE_CODE_DISABLE_PROACTIVITY ? { CLAUDE_CODE_DISABLE_PROACTIVITY: "1" } : {}),
        ...(Ie && { CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG: "1" }),
        ...(we !== void 0 && { CLAUDE_CODE_PERSONAL_CONFIG_FIX: we }),
        ...(Ee !== void 0 && { CLAUDE_CODE_AUTO_MODE_SERVER: Ee }),
        ...(env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS && { CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: "1" }),
        ...(env.CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS && { CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS: "1" }),
        ...(env.CLAUDE_CODE_DISABLE_FILE_MENTIONS && { CLAUDE_CODE_DISABLE_FILE_MENTIONS: "1" }),
        ...(env.CLAUDE_CODE_AUTO_MODE_TIER !== void 0 && {
          CLAUDE_CODE_AUTO_MODE_TIER: env.CLAUDE_CODE_AUTO_MODE_TIER,
        }),
        ...(env.CLAUDE_CODE_AUTO_MODE_MODEL && {
          CLAUDE_CODE_AUTO_MODE_MODEL: env.CLAUDE_CODE_AUTO_MODE_MODEL,
        }),
        ...(env.PATH && { PATH: env.PATH }),
        ...(env.CLAUDE_CODE_PLUGIN_DIRS && { CLAUDE_CODE_PLUGIN_DIRS: env.CLAUDE_CODE_PLUGIN_DIRS }),
        ...(ce && withHostOwnedEnv(() => collectProviderPassthroughEnv(providerEnv))),
        ...(Ne && { [CLAUDE_BG_GATEWAY_WITHHELD]: Ne }),
        ...(bgIsolation && { CLAUDE_BG_ISOLATION: bgIsolation }),
        ...(ke && { CLAUDE_BG_SESSION_PERMISSION_RULES: JSON.stringify(ke) }),
        ...(Te && { CLAUDE_BG_MEMORY_TOGGLED_OFF: "1" }),
        ...(Qe && { CLAUDE_BG_AUTO_MEMORY_OFF: "1" }),
        ...(te && { CLAUDE_CODE_RESUME_SOURCE_ALIVE: oe ? E5s(oe, $e || "1", Ce) : $e || "1" }),
      },
      reattachEnv: {
        ...s,
        ...(!launchOptions?.exec && {
          ...buildBgDispatcherEnv(ownStoredLoginPlanAttributes()),
          ...(u && { CLAUDE_BG_WORKSPACE_TRUSTED: "1" }),
        }),
      },
      worktree: launchOptions?.worktree
        ? { path: launchOptions.worktree.path, ownershipToken: sessionId }
        : void 0,
      isolation:
        agentDefinition?.isolation === "worktree" && agentDefinition.source !== "built-in"
          ? "worktree"
          : "none",
      agent: agentName,
      routine: void 0,
      seed: { intent: intent, name: sessionName },
      cols: process.stdout.columns || void 0,
      rows: process.stdout.rows || void 0,
    },
    [, U] = await Promise.all([qe ?? Promise.resolve(), dispatchViaDaemon(Ae, !1, Date.now(), storage)]);
  if (U.ok) {
    if (U.reattachEnvDropped !== void 0) warnHomeTrustFallback(Ae, launchMode);
    return { ok: !0, short: short, sessionId: sessionId, idle: isIdleLaunch, name: sessionName };
  }
  let Re = U.reason === "cwd-gone" ? U.detail : void 0;
  if (U.reason === "ack-timeout" || U.reason === "enoconn" || U.reason === "estarting") {
    let G = await controlRequest({ proto: BG_PROTO, op: "list" });
    if (
      G.ok &&
      G.op === "list" &&
      G.jobs.some((job) => job.short === short && job.nonce === U.nonce && !job.outcome)
    )
      return (
        logForDebugging(`bg: daemon dispatch ${U.reason} but worker is live`, { level: "warn" }),
        warnHomeTrustFallback(Ae, launchMode),
        await logEventAsync("tengu_bg_dispatch_rescued", {
          reason_ack_timeout: U.reason === "ack-timeout",
          reason_enoconn: U.reason === "enoconn",
          reason_estarting: U.reason === "estarting",
        }),
        { ok: !0, short: short, sessionId: sessionId, idle: isIdleLaunch, name: sessionName, rescued: !0 }
      );
    if (U.reason === "ack-timeout" && G.ok && G.op === "list" && !G.jobs.some((job) => job.short === short)) {
      let q = await controlRequest(
        {
          proto: BG_PROTO,
          op: "dispatch",
          d: { ...Ae, nonce: U.nonce },
          timeoutMs: 5000,
          auth: await readDaemonToken(),
        },
        { timeoutMs: 6000 },
      );
      if (q.ok && q.op === "dispatch")
        return (
          logForDebugging(`bg: ack-timeout recovered via redispatch (${short})`, { level: "warn" }),
          await logEventAsync("tengu_bg_dispatch_rescued", {
            reason_ack_timeout: !0,
            reason_enoconn: !1,
            reason_estarting: !1,
            via_redispatch: !0,
          }),
          { ok: !0, short: short, sessionId: sessionId, idle: isIdleLaunch, name: sessionName, rescued: !0 }
        );
      if (!q.ok && "code" in q && q.code === "ECWDGONE") Re = q.error;
    }
  }
  if (Ye)
    if (storage) await removeJobStorage(storage, short);
    else await rm_2(jobDir, { recursive: !0, force: !0 }).catch(() => {});
  if (U.reason === "short-alive")
    return {
      ok: !1,
      alive: !0,
      short: short,
      error: `Session ${short} is already running \u2014 \`claude attach ${short}\` to join it`,
      reason: "short_alive",
    };
  if (U.reason === "stale-short")
    return {
      ok: !1,
      error: "Previous session is still shutting down \u2014 try again in a moment",
      reason: "stale_short",
    };
  if (U.reason === "cwd-gone" || Re !== void 0)
    return { ok: !1, error: `Couldn't start a background session (${Re ?? U.detail})`, reason: "cwd_gone" };
  let Le = U.reason === "daemon-unreachable" && U.detail ? U.detail : describeDispatchFailure(U.reason);
  return {
    ok: !1,
    error: `Couldn't reach the ${bgSupervisorNoun()} (${Le})${daemonHint("status")}`,
    reason:
      U.reason === "daemon-unreachable"
        ? `daemon_unavailable_${classifyDaemonError(U.detail)}`
        : U.reason.replace(/-/g, "_"),
  };
}
/**
 * 会话记录了 CLAUDE_BG_WORKSPACE_TRUSTED（守护进程只能走回退派发路径、没继承本终端的主目录信任）时写调试日志警告；shell 模式下同时打印到 stderr。
 */
//@ chunk-bg51yd13.js:36584-36954 placement
function warnHomeTrustFallback(e, n) {
  if (e.reattachEnv?.CLAUDE_BG_WORKSPACE_TRUSTED === void 0) return;
  let o = `warning: session ${e.short} started without this terminal's home-directory trust (the ${bgSupervisorNoun()} could only take its fallback dispatch path), so hooks and project settings from your home directory stay off in it`;
  if ((logForDebugging(`bg: ${o}`, { level: "warn" }), n === "shell"))
    process.stderr.write(`${o}
`);
}
/**
 * 判定 --bg 带 --resume/--continue 时怎么处理：plain（没有恢复）、copy（另起副本，带原因：unresolved/running/open-elsewhere/handle-taken/unreadable/restricted/own-options）、continue（原地唤醒同 id 的后台会话，附带要投递的提示词）。
 */
//@ chunk-bg51yd13.js:36954-38133 placement
async function resolveBgResumeTarget(argv, options) {
  let o = options?.storageV5,
    dashDashIndex = De(argv),
    args = dashDashIndex >= 0 ? argv.slice(0, dashDashIndex) : argv.slice();
  if (!hasResumeOrContinueFlag(args) || Ht(args, "--fork-session")) return { kind: "plain" };
  let resumeArg = getResumeArg(args),
    sessionId =
      resumeArg !== void 0 && Vt(resumeArg) !== null && resumeArg === resumeArg.toLowerCase()
        ? resumeArg
        : null;
  if (sessionId === null) return { kind: "copy", reason: "unresolved", original: void 0 };
  let sliced = sessionId.slice(0, 8),
    p = await checkSessionOpenElsewhere(sessionId);
  if (p !== null) return { kind: "copy", reason: p, original: sliced };
  let existingJob = null,
    wakePrompt,
    R = await readJobState(getJobDir(sliced), o);
  if (R === null) {
    if (await jobStateExists(sliced, o)) return { kind: "copy", reason: "unreadable", original: sliced };
  } else existingJob = { jobId: sliced, state: R };
  if (existingJob !== null) {
    let { state: state } = existingJob;
    if (state.sessionId !== sessionId || isExecLaunch(state))
      return { kind: "copy", reason: "handle-taken", original: sliced };
    if (state.resumeSessionId && state.resumeSessionId !== sessionId) {
      let D = await checkSessionOpenElsewhere(state.resumeSessionId);
      if (D !== null) return { kind: "copy", reason: D, original: sliced };
    }
  }
  for (let h of new Set([sliced, existingJob?.state.daemonShort ?? sliced])) {
    let D = await probeDaemonJob(h, o);
    if (D.alive || D.present) return { kind: "copy", reason: "running", original: sliced };
  }
  if (existingJob !== null) {
    if (options?.restricted) return { kind: "copy", reason: "restricted", original: sliced };
    let h = stripResumeFlags(args),
      D = dashDashIndex >= 0 ? -1 : findPromptArgIndex(h);
    if (h.length > (D >= 0 ? 1 : 0)) return { kind: "copy", reason: "own-options", original: sliced };
    wakePrompt = (dashDashIndex >= 0 ? argv.slice(dashDashIndex + 1).join(" ") : h[D]) || void 0;
  }
  return {
    kind: "continue",
    sessionId: sessionId,
    wakeRow: existingJob === null ? null : { ...existingJob, prompt: wakePrompt },
  };
}
//@ chunk-bg51yd13.js:38133-38341 placement
async function checkSessionOpenElsewhere(e) {
  let n;
  try {
    n = await listLiveSessionHolders(e, { rejectUnreadable: !0 });
  } catch {
    return "unverified";
  }
  if (n.length === 0) return null;
  return n.some((o) => o.kind === "bg" || o.kind === "daemon-worker") ? "running" : "open-elsewhere";
}
//@ chunk-bg51yd13.js:38341-38513 placement
async function jobStateExists(e, n) {
  if (n) {
    let statMeta = await n.statMeta(jobStateKey(e));
    return statMeta.ok || statMeta.error.code !== "NotFound";
  }
  try {
    return (await readdir_2(getJobDir(e))).includes("state.json");
  } catch (error) {
    return !isENOENT(error);
  }
}
/**
 * 按 resolveBgResumeTarget 给出的 copy 原因生成 "note: …started a copy as <short>" 提示文字。
 */
//@ chunk-bg51yd13.js:38513-39829 placement
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
/**
 * 处理命令行中的 --bg：判断是标志还是文本，校验与 --print 等冲突，转入后台启动。
 */
//@ chunk-bg51yd13.js:39829-42089 placement
async function handleBgFlag(e, n) {
  if (stripBgOnlyFlags(e).length === e.length) {
    let D = e.find((S) => Nt.includes(S)) ?? "--bg";
    (process.stderr
      .write(`Couldn't tell whether ${D} is a flag or text here, so nothing was started. To start a background session put it first: claude --bg <prompt>
`),
      await logFeatureSadAsync("cli_bg_dispatch", "flag_not_stripped"),
      (process.exitCode = 1));
    return;
  }
  let o = De(e),
    r = o >= 0 ? e.slice(0, o) : e,
    s = getFlagValueIndices(r),
    index = r.findIndex((D, S) => !s.has(S) && (D === "--exec" || D.startsWith("--exec=")));
  if (index !== -1) {
    let D = e[index].includes("=") ? e[index].slice(e[index].indexOf("=") + 1) : void 0,
      S = D ?? e.slice(index + 1).join(" ");
    if (!S.trim()) {
      (process.stderr.write(`--exec requires a command.
`),
        (process.exitCode = 1));
      return;
    }
    let E = stripBgOnlyFlags([...e.slice(0, index), ...(D !== void 0 ? e.slice(index + 1) : [])]),
      x = getFlagValue(E, "--name", "-n"),
      P = getFlagValueIndices(E),
      T = De(E),
      N = T >= 0 ? E.slice(0, T) : E,
      filtered = N.filter((K, ne) => !P.has(ne));
    if (hasRemoteBackendFlags(filtered)) {
      (process.stderr.write(`${rejectBgWithEnvironmentFlags(E)}
`),
        (process.exitCode = 1));
      return;
    }
    let filtered_2 = N.filter(
      (K, ne) => !P.has(ne) && le(K) && !/^(-n|--name)(=|$)/.test(K) && !/^-n./.test(K),
    );
    if (filtered_2.length > 0)
      process.stderr.write(`warning: --exec ignores ${filtered_2.join(" ")} (only --name composes)
`);
    await promptBgWorkspaceTrust(getCwd(), n);
    let j = await spawnBgSession(
      [],
      void 0,
      "shell",
      void 0,
      { intent: S, exec: S, ...(x && { name: x, nameSource: "user" }) },
      void 0,
      void 0,
      n,
    );
    if (!j.ok) {
      if (j.reason === "cwd_gone") await logFeatureSadAsync("cli_bg_dispatch_exec", "cwd_gone");
      else await logFeatureBadAsync("cli_bg_dispatch_exec", j.reason ?? "spawn_failed");
      (process.stderr.write(`${j.error}
`),
        (process.exitCode = 1));
      return;
    }
    (await logFeatureOkAsync("cli_bg_dispatch_exec"),
      process.stdout.write(
        formatBgHints(j.short, void 0, x || S) +
          `
`,
      ),
      await WXe(n));
    return;
  }
  let u = isRestrictedMode(),
    y = stripBgOnlyFlags(u ? ["--restricted", ...e] : e),
    p = await readBgStdin(),
    w = p ? appendPromptToArgs(y, p) : y,
    A = p ? appendPromptToArgs(stripBgOnlyFlags(e), p) : stripBgOnlyFlags(e),
    R = await resolveBgResumeTarget(A, { restricted: u, storageV5: n });
  if (R.kind === "continue" && R.wakeRow !== null) {
    (await promptBgWorkspaceTrust(R.wakeRow.state.cwd, n), await wakeExistingBgSession(R.wakeRow, A, u, n));
    return;
  }
  await promptBgWorkspaceTrust(getCwd(), n);
  let h = await spawnBgSession(
    w,
    R.kind === "continue" ? R.sessionId : void 0,
    "shell",
    void 0,
    void 0,
    void 0,
    void 0,
    n,
  );
  if (!h.ok) {
    (await (h.reason === "gate_blocked" || h.reason === "cwd_gone" ? logFeatureSadAsync : logFeatureBadAsync)(
      "cli_bg_dispatch",
      h.reason ?? "spawn_failed",
      ...gateCauseExtra(h.gateCause),
    ),
      process.stderr.write(`${h.error}
`),
      (process.exitCode = 1));
    return;
  }
  if (h.rescued) await logFeatureSadAsync("cli_bg_dispatch", "rescued");
  else await logFeatureOkAsync("cli_bg_dispatch");
  if (R.kind === "copy")
    process.stderr.write(`${formatResumeCopyNote(R, h.short)}
`);
  (process.stdout.write(
    formatBgHints(h.short, h.idle ? IDLE_DETAIL : void 0, h.name) +
      `
`,
  ),
    await WXe(n));
}
/**
 * 交互终端且工作区未受信任时，动态加载 Ink 渲染 agents 工作区信任对话框并等待用户决定；结束后卸载并刷新配置写入。
 */
//@ chunk-bg51yd13.js:42089-42577 placement
async function promptBgWorkspaceTrust(e, n) {
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    checkWorkspaceTrust(e).verdict !== "untrusted" ||
    !Pke(e, getCwd())
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
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_sable_orrery", !0)) setIsInteractive(!0);
  let u = await o(r(!1));
  try {
    await l(u, "ask", n);
  } finally {
    (u.render(null), u.unmount());
  }
  (setIsInteractive(!1), await drainConfigWrites());
}
/**
 * 后台会话启动的守护进程派发路径（受限模式、闸门检查、确保守护进程）。
 */
//@ chunk-bg51yd13.js:42577-44096 placement
async function wakeExistingBgSession(
  { jobId: job, state: state, prompt: prompt },
  respawnArgs,
  restricted,
  storage,
) {
  let u = validateBgLaunchFlags(restricted ? ["--restricted", ...respawnArgs] : respawnArgs.slice());
  if (u) {
    (process.stderr.write(`${u}
`),
      await logFeatureSadAsync("cli_bg_dispatch", "gate_blocked", ...gateCauseExtra("disclaimer")),
      (process.exitCode = 1));
    return;
  }
  let daemonResult = await ensureDaemonForDispatch(void 0, storage);
  if (!daemonResult.ok) {
    let R = getJobDir(job);
    invalidateJobStateCache(R);
    let h = prompt !== void 0 ? await readJobState(R, storage) : null,
      D = prompt !== void 0 && h !== null && (await queuePromptForJob(R, h, prompt, storage, !0));
    (process.stderr
      .write(`Couldn't reach the ${bgSupervisorNoun()} (${daemonResult.reason})${daemonHint("status")}${D ? ` Your message is saved and will be delivered when session ${job} next starts.` : ""}
`),
      await (D ? logFeatureSadAsync : logFeatureBadAsync)("cli_bg_dispatch", "daemon_unavailable"),
      (process.exitCode = 1));
    return;
  }
  let respawnResult = await respawnBgSession(
    job,
    prompt !== void 0 ? { initialPrompt: prompt, keepQueuedPrompt: !0 } : void 0,
    storage,
  );
  if (!respawnResult.ok) {
    if (
      (process.stderr.write(
        respawnResult.alive
          ? `Session ${job} is already running \u2014 \`claude attach ${job}\` to join it
`
          : `${respawnResult.error}${respawnResult.queued ? ` Your message is saved and will be delivered when session ${job} next starts.` : ""}
`,
      ),
      respawnResult.queued)
    )
      await logFeatureSadAsync("cli_bg_dispatch", "wake_refused_prompt_queued");
    else
      await logFeatureBadAsync(
        "cli_bg_dispatch",
        respawnResult.alive ? "short_alive" : (respawnResult.errorCode ?? "wake_failed"),
      );
    process.exitCode = 1;
    return;
  }
  await logFeatureOkAsync("cli_bg_dispatch");
  let w = getFlagValueIndices(state.respawnFlags),
    A = uniq(
      state.respawnFlags
        .map((respawnFlag, h) =>
          w.has(h) ? void 0 : /^(--?[A-Za-z][A-Za-z0-9-]{0,40})(?:=|$)/.exec(respawnFlag)?.[1],
        )
        .filter((R) => R !== void 0 && (hyn.has(R) || FORWARDED_VALUE_FLAGS.has(R))),
    );
  if (A.length > 0)
    process.stderr.write(`note: woke session ${job} with its saved options (${A.join(", ")}).
`);
  (process.stdout.write(
    formatBgHints(
      respawnResult.short,
      prompt === void 0 && !imt(state) ? IDLE_DETAIL : void 0,
      respawnResult.state.name ? sanitizeSessionTitle(respawnResult.state.name) || void 0 : void 0,
    ) +
      `
`,
  ),
    await WXe(storage));
}
/**
 * 读取管道 stdin 作为后台任务输入（TTY 返回空串），超过上限截断并警告；stdin 不可读时打点并返回空串；去掉末尾换行。
 */
//@ chunk-bg51yd13.js:44096-44739 placement
async function readBgStdin(stdin = process.stdin) {
  if (stdin.isTTY) return "";
  let buffer = "",
    truncated = !1,
    onData = (l) => {
      if (truncated) return;
      if (buffer.length + l.length > at) {
        ((buffer += l.slice(0, at - buffer.length)), (truncated = !0));
        return;
      }
      buffer += l;
    };
  try {
    (stdin.setEncoding("utf8"), stdin.on("data", onData));
  } catch (error) {
    if ((stdin.off("data", onData), !isStdinUnusableError(error))) throw error;
    return (
      logForDebugging(`readBgStdin: stdin unreadable: ${errorMessage(error)}`, { level: "error" }),
      await logEventAsync("tengu_bg_stdin_unreadable", {
        error_code: sanitizedErrCodeForTelemetry(error) ?? lit("none"),
      }),
      process.stderr
        .write(`warning: stdin is unreadable (${getErrnoCode(error)}), proceeding without piped input
`),
      ""
    );
  }
  let s = await peekForStdinData(stdin, 3000);
  if ((stdin.off("data", onData), s)) return "";
  if (truncated)
    process.stderr.write(`warning: piped stdin exceeds ${at} bytes, truncated
`);
  return buffer.replace(/\r?\n$/, "");
}
//@ chunk-bg51yd13.js:44739-44754 placement
var at = 1048576;
//@ chunk-bg51yd13.js:44754-44949 placement
function appendPromptToArgs(e, n) {
  let o = De(e);
  if (o >= 0) {
    let joined = e.slice(o + 1).join(" ");
    return [
      ...e.slice(0, o),
      "--",
      joined
        ? `${joined}
${n}`
        : n,
    ];
  }
  let r = findPromptArgIndex(e);
  if (r >= 0) {
    let s = [...e];
    return (
      (s[r] = `${e[r]}
${n}`),
      s
    );
  }
  return [...e, "--", n];
}
/**
 * 在参数里找最后一个位置参数（提示词）的下标：跳过 flag 及其取值、--resume 的可选 id；找不到返回 -1。
 */
//@ chunk-bg51yd13.js:44949-45368 placement
function findPromptArgIndex(e) {
  let n = getFlagValueIndices(e),
    o = -1;
  for (let r = 0; r < e.length; r++) {
    if (n.has(r)) continue;
    let s = e[r];
    if (le(s)) {
      if (s.includes("=")) continue;
      let l = e[r + 1];
      if (l === void 0) continue;
      let { rest: rest } = peelCombinedShortFlags(s);
      if (s === "--resume" || rest === "-r") {
        if (!le(l)) r++;
        continue;
      }
      if (rest.length > 2 && (/^-r./.test(rest) || FORWARDED_VALUE_FLAGS.has(rest.slice(0, 2)))) continue;
      if ((hyn.has(s) && s !== "--remote-control" && s !== "--rc") || lqr.has(rest)) continue;
      if (!n.has(r + 1) && !le(l)) r++;
      continue;
    }
    o = r;
  }
  return o;
}
//@ chunk-bg51yd13.js:45368-45402 placement
var regExp = new RegExp(`${DAEMON_UNREACHABLE_TIMEOUT_PHRASE} \\d+s`);
//@ chunk-bg51yd13.js:45402-45517 placement
function classifyDaemonError(e) {
  let n = extractErrnoTokens(e)[0];
  if (n) return n;
  if (regExp.test(e)) return "timeout";
  return e.includes(DAEMON_EXITED_BEFORE_REACHABLE_PHRASE) ? "exited" : "other";
}
/**
 * 把派发失败码（daemon-unreachable、ack-timeout、dispatch-write 等）翻译成给用户看的短语。
 */
//@ chunk-bg51yd13.js:45517-45822 placement
function describeDispatchFailure(e) {
  switch (e) {
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
function formatBgHints(e, n, o) {
  let r = (s, l) => sequential.dim("  " + s.padEnd(26) + l);
  return [
    `backgrounded \xB7 ${sequential.cyan(e)}${o ? ` \xB7 ${o}` : ""}${n ? sequential.dim(` ${n}`) : ""}`,
    r("claude agents", "list sessions"),
    r(`claude attach ${e}`, "open in this terminal"),
    r(`claude logs ${e}`, "show recent output"),
    r(`claude stop ${e}`, "stop this session"),
  ].join(`
`);
}
//@ chunk-bg51yd13.js:46146-46178 placement
function Bn(e) {
  return Bt(getBgVerbArgsWithoutDebug(e));
}
//@ chunk-bg51yd13.js:46178-46270 placement
function Bt(e) {
  return e.length === 0
    ? null
    : `warning: extra arguments ignored: ${e.join(" ")}
`;
}
/**
 * 取后台子命令动词之后的参数，去掉 --debug/-d/--debug-file 等调试参数和 --setting-sources 的取值。
 */
//@ chunk-bg51yd13.js:46270-46631 placement
function getBgVerbArgsWithoutDebug(e) {
  let n = backgroundSessionVerbIndex(e);
  if (n === -1 || e.length <= n + 2) return [];
  let o = eagerCliFlagHonoredIndices("--setting-sources", e),
    r = [];
  for (let s = n + 2; s < e.length; s++) {
    let l = e[s];
    if (o.has(s)) continue;
    if (
      l === "--debug" ||
      l === "-d" ||
      l === "--debug-to-stderr" ||
      l === "-d2e" ||
      l.startsWith("--debug=") ||
      l.startsWith("--debug-file=")
    )
      continue;
    if (l === "--debug-file" && s + 1 < e.length) {
      s++;
      continue;
    }
    r.push(l);
  }
  return r;
}
//@ chunk-bg51yd13.js:46631-46722 placement
function Mt() {
  let e = Bn(process.argv.slice(2));
  if (e) process.stderr.write(e);
  return e !== null;
}
//@ chunk-bg51yd13.js:46722-46733 placement
var xt = 1e4;
/**
 * 分页列出 v5 存储里 namespace=job 的全部 jobId；失败、游标不前进或超过页数上限时返回 undefined。
 */
//@ chunk-bg51yd13.js:46733-47310 placement
async function listStorageJobIds(storage) {
  let jobIds = new Set(),
    cursor,
    pages = 0;
  do {
    let page = await storage
      .listEntries({ namespace: "job" }, { cursor: cursor, skipScopeStats: !0 })
      .catch(() => {
        return;
      });
    if (page === void 0 || !page.ok) {
      logForDebugging(`[bg] v5 jobs listing failed: ${page === void 0 ? "rejected" : page.error.code}`);
      return;
    }
    for (let item of page.value.items)
      if (item.kind === "scope" && item.scope.namespace === "job" && item.scope.jobId !== void 0)
        jobIds.add(item.scope.jobId);
    if (page.value.cursor && page.value.cursor === cursor) {
      logForDebugging("[bg] v5 jobs listing failed: cursor did not advance");
      return;
    }
    cursor = page.value.cursor;
  } while (cursor && ++pages < xt);
  if (cursor) {
    logForDebugging(`[bg] v5 jobs listing failed: more than ${xt} pages`);
    return;
  }
  return [...jobIds];
}
//@ chunk-bg51yd13.js:47310-47530 placement
async function removeJobStorage(e, n) {
  let o = getJobDir(n),
    r = await lstat(o).catch(() => {
      return;
    });
  if (r === void 0 || !r.isDirectory()) {
    await rm_2(o, { recursive: !0, force: !0 }).catch(() => {});
    return;
  }
  await e.deleteScope({ namespace: "job", jobId: n }).catch(() => {});
}
/**
 * 后台会话子命令的通用参数解析：--help、未知选项、按 id/名称查找作业。
 */
//@ chunk-bg51yd13.js:47530-49783 placement
async function resolveJobArgument(query, usage, helpText, allowNameMatch, storage) {
  let l = Mt();
  if (query === "--help" || query === "-h")
    (process.stdout.write(`Usage: ${usage}

  ${helpText}
`),
      process.exit(0));
  if (query?.startsWith("-"))
    (process.stderr.write(`unknown option '${query}'
Usage: ${usage}
`),
      process.exit(1));
  if (!query)
    (process.stderr.write(`Usage: ${usage}
`),
      process.exit(1));
  let filtered = (
    storage ? ((await listStorageJobIds(storage)) ?? []) : await readdir_2(getJobsDir()).catch(() => [])
  )
    .filter((R) => SHORT_RE.test(R))
    .filter((R) => R.startsWith(query));
  if (filtered.length === 1) return { short: filtered[0], byName: !1, nameLines: "" };
  let lower = query.trim().toLowerCase(),
    w = allowNameMatch && !Fn.test(lower);
  if (w && !l) {
    let filtered = (await listJobs(void 0, storage))
        .filter((E) => SHORT_RE.test(E.id))
        .map((E) => ({ ...E, rank: rankJobNameMatch(E.state, lower) }))
        .filter((E) => E.rank !== 0),
      any = filtered.some((E) => E.rank === 2 || E.rank === 3),
      filtered_2 = filtered.filter((E) => E.rank !== 1 || !isDoneJob(E.state));
    if (filtered_2.length === 1 && any) {
      let { id: id, state: state } = filtered_2[0],
        sorted = filtered
          .filter((j) => j.id !== id)
          .sort((j, K) => {
            let ne = j.state.lastTerminalAt ?? "",
              ie = K.state.lastTerminalAt ?? "";
            if (ne !== ie) return ne < ie ? 1 : -1;
            return j.id < K.id ? -1 : 1;
          }),
        mapped = sorted.slice(0, jn).map(
          (j) => `  ${j.id}  ${sanitizeJobLabel(j.state.name || j.state.displayIntent || j.state.intent)}
`,
        ),
        N = sorted.length - mapped.length,
        L =
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
      return (process.stderr.write(F), { short: id, byName: !0, nameLines: F });
    }
    if (filtered.length > 0) {
      let mapped = filtered
          .sort((T, N) => Number(T.rank === 1) - Number(N.rank === 1) || (T.id < N.id ? -1 : 1))
          .slice(0, Mn)
          .map(
            ({
              id: id,
              state: state,
              rank: rank,
            }) => `  ${id}  ${sanitizeJobLabel(state.name || state.displayIntent || state.intent)}${any && rank === 1 ? "  (task text)" : ""}
`,
          ),
        x = filtered.length - mapped.length,
        P = sanitizeJobLabel(query);
      (process.stderr.write(`${
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
`),
        process.exit(1));
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
  (process.stderr.write(
    filtered.length === 0
      ? `No job matching '${query}'. Run 'claude agents' to list running sessions.
${A}`
      : `Ambiguous prefix '${query}', matches: ${filtered.join(", ")}
`,
  ),
    process.exit(1));
}
//@ chunk-bg51yd13.js:49783-49842 placement
var Fn = /^[a-f0-9]{1,8}$/,
  Mn = 20,
  jn = 3,
  Wn = 4096,
  Gn = 65536,
  Hn = 32;
//@ chunk-bg51yd13.js:49842-49948 placement
function sanitizeJobLabel(e) {
  if (e.length > Gn) return "\u2026";
  let n = Dr(stripFormatChars(Dr(e)));
  return n.length > Wn ? "\u2026" : truncateWithEllipsis(redactSecrets(n), Hn);
}
//@ chunk-bg51yd13.js:49948-50042 placement
var jt = "Part of the session name works in place of the id. Put a name with spaces in quotes.";
//@ chunk-bg51yd13.js:50042-50722 placement
async function logsHandler(e, n) {
  let { short: short, nameLines: nameLines } = await resolveJobArgument(
      e,
      "claude logs <id|name>",
      `Print the background session's recent terminal output. ${jt}`,
      !0,
      n,
    ),
    promise = await new Promise((w) => {
      let A = subscribeControl(
        short,
        500,
        (R) => {
          if (R.type === "snapshot") (A(), w(R.streamTail));
        },
        (R) => {
          (A(), w(R));
        },
      );
    });
  if (typeof promise === "string")
    return (
      await logFeatureBadAsync("cli_bg_logs", "read_failed"),
      process.stderr.write(`Couldn't read logs for ${short} \u2014 ${$A(promise)}
`),
      exitAfterAnalyticsFlush(1)
    );
  let { replay: replay, cursorAddressed: cursorAddressed } = waitForDaemonReady(promise.join("")),
    y = process.stdout.rows || 9999,
    p = process.stdout.isTTY
      ? "\x1B[0m" +
        (cursorAddressed
          ? cursorPosition(y, 1) +
            `
`
          : "")
      : "";
  if ((await writeStdoutAndDrain(replay + p), nameLines && process.stdout.isTTY && process.stderr.isTTY))
    process.stderr.write(
      (cursorAddressed
        ? ""
        : `
`) +
        csi("J") +
        nameLines,
    );
  return (await logFeatureOkAsync("cli_bg_logs"), exitAfterAnalyticsFlush(0));
}
//@ chunk-bg51yd13.js:50722-50743 placement
var Jn = 60000,
  Yn = 2000;
/**
 * 根据 attach 失败消息给出等待提示：会话正在升级/卡住重启/迁移 PTY，或守护进程正在启动/重启。
 */
//@ chunk-bg51yd13.js:50743-51148 placement
function describeAttachRetryStatus(e) {
  if (e.includes(RESPAWNING_ATTACH_CODE)) {
    if (e.includes(RESPAWN_REASON_UPGRADE) || /upgrad/i.test(e))
      return "Agent is updating to the new Claude Code\u2026";
    if (e.includes(RESPAWN_REASON_STALL)) return "Session not responding \u2014 restarting it\u2026";
    if (e.includes(RESPAWN_REASON_LEGACY)) return "Migrating job to attachable PTY\u2026";
    return "Session is restarting\u2026";
  }
  if (e.includes("ESTARTING")) return `${bgSupervisorNounCap()} is starting\u2026`;
  return `${bgSupervisorNounCap()} is restarting\u2026`;
}
/**
 * 连接后台会话（attachToJob），遇到短暂错误或套接字竞态时指数退避重试（必要时重新拉起守护进程），在 stderr 显示等待状态；可在按下分离键时中止。返回最终结果与等待时长。
 */
//@ chunk-bg51yd13.js:51148-52196 placement
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
      ),
    isTty = process.stderr.isTTY === !0,
    l = !1,
    u = "",
    showStatus = (R, h) => {
      let rounded = Math.round(h / 1000),
        S = rounded >= 5 ? `${R} (${rounded}s)` : R;
      if (isTty) (process.stderr.write(`\r${ERASE_LINE}${S}`), (l = !0));
      else if (R !== u)
        process.stderr.write(`${S}
`);
      u = R;
    },
    clearStatus = () => {
      if (l) (process.stderr.write(`\r${ERASE_LINE}`), (l = !1));
    },
    result = await attemptAttach(),
    waitedMs = 0;
  try {
    for (let R = 0; waitedMs < Jn; R++) {
      let msg = result.msg,
        D = msg !== void 0 && TRANSIENT_ATTACH_CODE.test(msg),
        S =
          !D &&
          result.outcome === "error" &&
          msg !== void 0 &&
          RACED_SOCKET_GAP.test(msg) &&
          !SUPERVISOR_DETACH_CODE.test(msg);
      if (msg === void 0 || (!D && !S)) break;
      if (S) {
        let x = await ensureDaemon(
          { forceTransient: !0, onStarting: () => options.gesture?.markDaemonBooted?.() },
          storage,
        );
        if (!x.ok) return { r: result, waitedMs: waitedMs, unavailableReason: x.reason };
      }
      let min = Math.min(2000, 250 * 2 ** R);
      if (msg.includes(RESPAWNING_ATTACH_CODE) || waitedMs + min > Yn)
        showStatus(describeAttachRetryStatus(msg), waitedMs);
      if ((await sleep(min), (waitedMs += min), options.abortOnDetachKey)) {
        let x = drainStdin();
        if (x && containsInterruptKey(x)) return { r: result, waitedMs: waitedMs, detachKeyAborted: !0 };
      }
      (clearStatus(), (result = await attemptAttach()));
    }
  } finally {
    clearStatus();
  }
  return { r: result, waitedMs: waitedMs };
}
//@ chunk-bg51yd13.js:52196-52268 placement
var Kn = "ENOJOB: probe found no handle \u2014 worker retired or settled";
/**
 * claude attach <id|name>：在当前终端打开后台会话（必要时重启/迁移到可附着 PTY），← 返回代理视图（约 6.6 KB）。
 */
//@ chunk-bg51yd13.js:52268-58892 placement
async function attachHandler(e, n) {
  let startTime = performance.now(),
    r = !1,
    s = await resolveJobArgument(
      e,
      "claude attach <id|name>",
      `Open the background session in this terminal. \u2190 returns to agent view, Ctrl+Z drops back to your shell. The session keeps running either way. ${jt}`,
      !0,
      n,
    ),
    short = s.short,
    u = 0,
    y = randomUUID_2(),
    p = {
      gestureId: y,
      attempt: 0,
      t0: startTime,
      surface: "bg_cli",
      interactive: {},
      get daemonBooted() {
        return r;
      },
      markDaemonBooted: () => {
        ((r = !0), updateAttachBeacon(y, { daemonBooted: !0 }, n));
      },
    };
  startAttachBeacon(p.gestureId, "bg_cli", n).catch(() => {});
  let w = () =>
      u > 0 || s.byName
        ? { ...(u > 0 && { waited_transient_ms: u }), ...(s.byName && { by_name: !0 }) }
        : void 0,
    A = async (E, x) => (
      reportAttachTelemetry(p, "error"),
      await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
      await logFeatureBadAsync("cli_bg_attach", "daemon_unavailable", w()),
      process.stderr.write(`${E} \u2014 ${bgSupervisorNoun()} is unavailable (${x})${daemonHint("status")}
`),
      exitAfterAnalyticsFlush(1)
    ),
    R = await ensureDaemonForDispatch(
      {
        onStarting: () => {
          ((r = !0), updateAttachBeacon(y, { daemonBooted: !0 }, n));
        },
      },
      n,
    );
  if (!R.ok) return A("Couldn't attach", R.reason);
  let h;
  if (await isBackgroundSessionGone(short)) h = { outcome: "error", msg: Kn };
  else {
    let E = await attachWithRetry(short, { gesture: p }, n);
    if (((h = E.r), (u += E.waitedMs), E.unavailableReason !== void 0))
      return A("Couldn't attach", E.unavailableReason);
  }
  if (h.outcome === "error" && h.msg?.includes("ENOJOB")) {
    let E = await readJobState(getJobDir(short), n).catch(() => null),
      x =
        E?.state === "failed" &&
        !isExecLaunch(E) &&
        (E.reapedMidWorkAt !== void 0 || E.reapedUnsettledAt !== void 0),
      P = E?.state === "failed" && !isExecLaunch(E) && E.detail === HOST_DIED_DETAIL,
      T = E?.sessionId !== void 0 && Vt(E.sessionId) !== null ? ye(E.sessionId) : void 0,
      N = T ? { target_session_id: T } : {};
    if (E?.state === "failed" && !x && !P)
      return (
        await logFeatureBadAsync("cli_bg_attach", "wake_failed_state", { ...w(), ...N }),
        process.stderr.write(`Session ${short} can't start \u2014 ${Ot(E.detail) || "it crashed repeatedly"}
`),
        reportAttachTelemetry(p, "error", "worker_crash_loop"),
        await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
        exitAfterAnalyticsFlush(1)
      );
    if (s.byName)
      return (
        await logFeatureSadAsync("cli_bg_attach", "wake_needs_id", { ...w(), ...N }),
        process.stderr.write(`The background service has no process for session ${short}.
A name opens only a running session. Use the id: \`claude attach ${short}\`
`),
        reportAttachTelemetry(p, "detached"),
        await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
        exitAfterAnalyticsFlush(1)
      );
    if (x)
      (await logEventAsync("tengu_bg_attach_wake_after_reap", N),
        process.stderr.write(`Session ${short} was interrupted while unattended \u2014 resuming it\u2026
`));
    else if (P)
      process.stderr.write(`Session ${short}'s terminal host died \u2014 restarting it on a fresh one\u2026
`);
    else if (E?.deadEpochReapedAt !== void 0 && !isExecLaunch(E))
      process.stderr
        .write(`Session ${short} ended while the background service was off; looking for its saved conversation to resume\u2026
`);
    else
      process.stderr.write(`Waking session ${short}\u2026
`);
    if (E !== null) await promptBgWorkspaceTrust(E.cwd, n);
    let L = await respawnBgSession(short, void 0, n).catch((F) => ({
      ok: !1,
      alive: !1,
      short: void 0,
      error: errorMessage(F),
    }));
    if (L.ok || L.alive) {
      if (L.short && L.short !== short)
        (process.stderr.write(`Session moved to ${L.short}
`),
          (short = L.short));
      let F = await attachWithRetry(short, { gesture: p }, n);
      if (((h = F.r), (u += F.waitedMs), F.unavailableReason !== void 0))
        return A("Couldn't attach", F.unavailableReason);
    } else if ("errorCode" in L && L.errorCode === "dead_epoch_transcript_gone")
      return (
        await logFeatureSadAsync("cli_bg_attach", "dead_epoch_transcript_gone", { ...w(), ...N }),
        process.stderr.write(`${L.error}
`),
        reportAttachTelemetry(p, "error", "respawn_failed"),
        await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
        exitAfterAnalyticsFlush(1)
      );
    else
      return (
        await logFeatureBadAsync("cli_bg_attach", x ? "wake_after_reap_failed" : "wake_failed", {
          ...w(),
          ...N,
        }),
        process.stderr.write(
          x
            ? `Couldn't resume ${short} after the interruption \u2014 ${L.error}
`
            : `Couldn't wake ${short} \u2014 ${L.error}
`,
        ),
        reportAttachTelemetry(p, "error", "respawn_failed"),
        await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
        exitAfterAnalyticsFlush(1)
      );
  }
  let D = () => {
      if (getPlatform() === "windows" && process.stdin.isTTY) setRawModeSafe(process.stdin, !1);
    },
    S = async () => {
      let E = await readJobStateAfterSettle(getJobDir(short), n);
      if (E === null || E.state === "done" || E.state === "stopped" || E.state === "blocked")
        reportAttachTelemetry(p, "detached");
    };
  while (h.outcome === "disconnected") {
    let E = await ensureDaemon(
      {
        forceTransient: !0,
        onStarting: () => {
          ((r = !0), updateAttachBeacon(y, { daemonBooted: !0 }, n));
        },
      },
      n,
    );
    if (!E.ok) return A(`Couldn't reconnect to ${short}`, E.reason);
    if (await isBackgroundSessionGone(short)) {
      (D(), await S());
      break;
    }
    if (
      (process.stderr.write(`Reconnecting to ${short}\u2026
`),
      getPlatform() === "windows" && process.stdin.isTTY)
    )
      (setRawModeSafe(process.stdin, !0), process.stdin.ref());
    let x = drainStdin();
    if (x && containsInterruptKey(x)) {
      (D(), reportAttachTelemetry(p, "detached"), (h = { outcome: "detached" }));
      break;
    }
    let P = await attachWithRetry(short, { abortOnDetachKey: !0, gesture: p }, n);
    if (((h = P.r), (u += P.waitedMs), P.detachKeyAborted)) {
      (D(), reportAttachTelemetry(p, "detached"), (h = { outcome: "detached" }));
      break;
    }
    if (P.unavailableReason !== void 0)
      return (D(), A(`Couldn't reconnect to ${short}`, P.unavailableReason));
    if (h.outcome === "error" && h.msg?.includes("ENOJOB")) {
      (D(), await S(), (h = { outcome: "disconnected" }));
      break;
    }
  }
  if (
    (await Promise.race([clearAttachBeacon(p.gestureId, n).catch(() => {}), sleep(750)]),
    h.outcome === "detached" && h.msg && (FATAL_ATTACH_CODE.test(h.msg) || TRANSIENT_ATTACH_CODE.test(h.msg)))
  )
    return (
      await logFeatureBadAsync(
        "cli_bg_attach",
        FATAL_ATTACH_CODE.test(h.msg) ? "stalled" : "transient_exhausted",
        w(),
      ),
      process.stderr.write(`${h.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, "")}
`),
      exitAfterAnalyticsFlush(1)
    );
  if (isUserApcDetach(h, process.stdout.isTTY, process.stdin.isTTY))
    return (
      await logFeatureOkAsync("cli_bg_attach", w()),
      relaunchClaudeCode({
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
        env: { CLAUDE_AGENTS_SELECT: short },
      })
    );
  if (h.outcome === "detached" && h.msg)
    process.stderr.write(`${h.msg.replace(KICKED_ATTACH_CODE, "")}
`);
  if (h.outcome === "disconnected") {
    let E = await readJobState(getJobDir(short), n).catch(() => null);
    if (E?.state === "failed" && E.detail === HOST_DIED_DETAIL)
      process.stderr
        .write(`Session ${short}'s terminal host died \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.
`);
    else {
      let x = E?.state === "failed" && E.detail ? ` (${Ot(E.detail)})` : "";
      process.stderr.write(
        E?.state === "done" && (await hasConversationToResume(E, n))
          ? `Session ${short} has exited \u2014 run \`claude attach ${short}\` to resume it.
`
          : `Session ${short} has exited${x}.
`,
      );
    }
  }
  if (h.outcome === "error") {
    let E = h.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`) ?? !1,
      x = h.msg?.startsWith(`${ENORESPONSE}:`) ?? !1,
      P = E || x ? await readJobState(getJobDir(short), n).catch(() => null) : null,
      T = P !== null && isExecLaunch(P),
      N = E
        ? T
          ? `${HOST_DIED_EXEC_ATTACH_MESSAGE}.`
          : `${HOST_DIED_ATTACH_MESSAGE} \u2014 run \`claude attach ${short}\` again to restart it on a fresh host.`
        : x
          ? T
            ? `${IHt} \u2014 \`claude stop ${short}\` stops it (it runs a shell command, which is not run again for you).`
            : `${IHt} \u2014 \`claude stop ${short}\`, then \`claude attach ${short}\` restarts it (the conversation is saved).`
          : h.msg?.includes(RESPAWNING_ATTACH_CODE)
            ? "Job is respawning after an upgrade \u2014 try attach again in a moment."
            : h.msg && (RACED_SOCKET_GAP.test(h.msg) || /ESTARTING/.test(h.msg))
              ? `${bgSupervisorNounCap()} is restarting \u2014 try again in a moment.`
              : (h.msg ?? "unknown");
    (process.stderr.write(`Couldn't attach to ${short} \u2014 ${N}
`),
      await logFeatureBadAsync(
        "cli_bg_attach",
        E ? "host_dead" : x ? "no_response" : "transient_exhausted",
        w(),
      ));
  } else await logFeatureOkAsync("cli_bg_attach", w());
  return exitAfterAnalyticsFlush(h.outcome === "error" ? 1 : 0);
}
//@ chunk-bg51yd13.js:58892-59008 placement
function isUserApcDetach(e, n, o) {
  return (
    e.outcome === "detached" &&
    e.viaApc === !0 &&
    (e.msg === void 0 || !SUPERVISOR_DETACH_CODE.test(e.msg)) &&
    n === !0 &&
    o === !0
  );
}
/**
 * claude respawn <id>|--all：重启后台会话以使用当前 Claude 二进制。
 */
//@ chunk-bg51yd13.js:59008-61338 placement
async function respawnHandler(e, n) {
  if ((Mt(), e === "--help" || e === "-h")) {
    process.stdout.write(`Usage: claude respawn <id>|--all

  Restart a background session (or all of them) so it picks up the current Claude binary.
`);
    return;
  }
  if (e?.startsWith("-") && e !== "--all") {
    (process.stderr.write(`unknown option '${e}'
Usage: claude respawn <id>|--all
`),
      (process.exitCode = 1));
    return;
  }
  if (!e) {
    (process.stderr.write(`usage: claude respawn <id>|--all
`),
      (process.exitCode = 1));
    return;
  }
  let o = [];
  if (e !== "--all") {
    if (
      ((o = (n ? ((await listStorageJobIds(n)) ?? []) : await readdir_2(getJobsDir()).catch(() => []))
        .filter((y) => SHORT_RE.test(y))
        .filter((y) => y.startsWith(e))),
      o.length !== 1)
    ) {
      (process.stderr.write(
        o.length === 0
          ? `No job matching '${e}'
`
          : `Ambiguous prefix '${e}', matches: ${o.join(", ")}
`,
      ),
        await logFeatureBadAsync("cli_bg_respawn", o.length === 0 ? "no_match" : "ambiguous"),
        (process.exitCode = 1));
      return;
    }
  }
  let r = await ensureDaemonForDispatch(void 0, n);
  if (!r.ok) {
    (process.stderr
      .write(`Couldn't respawn \u2014 ${bgSupervisorNoun()} is unavailable (${r.reason})${daemonHint("status")}
`),
      await logFeatureBadAsync("cli_bg_respawn", "daemon_unavailable"),
      (process.exitCode = 1));
    return;
  }
  if (e === "--all") {
    let filtered = (await listJobs(void 0, n)).filter((A) => !isTerminal(A.state.state));
    if (filtered.length === 0) {
      process.stdout.write(`no live jobs to respawn
`);
      return;
    }
    let p = 0,
      w = 0;
    for (let A of filtered) {
      await promptBgWorkspaceTrust(A.state.cwd, n);
      let R = await respawnBgSession(A.id, { force: !0, knownState: A.state }, n);
      if (R.ok)
        (p++,
          process.stdout.write(`respawned ${A.id}${R.short !== A.id ? ` \u2192 ${R.short}` : ""}
`));
      else if (R.alive)
        (w++,
          (process.exitCode = 1),
          process.stderr.write(`${A.id}: still running \u2014 couldn't confirm restart, retry in a moment
`));
      else
        ((process.exitCode = 1),
          process.stderr.write(`${A.id}: ${R.error}
`));
    }
    if (p === filtered.length) await logFeatureOkAsync("cli_bg_respawn");
    else if (p > 0 || w > 0) await logFeatureSadAsync("cli_bg_respawn", w > 0 ? "still_alive" : "partial");
    else await logFeatureBadAsync("cli_bg_respawn", "spawn_failed");
    return;
  }
  let s = o[0],
    l = await respawnBgSession(s, { force: !0 }, n);
  if (!l.ok && l.errorCode === "workspace_untrusted" && l.state !== void 0) {
    if (
      (await promptBgWorkspaceTrust(l.state.cwd, n), checkWorkspaceTrust(l.state.cwd).verdict !== "untrusted")
    )
      l = await respawnBgSession(s, { force: !0 }, n);
  }
  if (!l.ok && l.alive) {
    (process.stderr.write(`${s}: still running \u2014 couldn't confirm restart, retry in a moment
`),
      await logFeatureSadAsync("cli_bg_respawn", "still_alive"),
      (process.exitCode = 1));
    return;
  }
  if (!l.ok) {
    (process.stderr.write(`${l.error}
`),
      await logFeatureBadAsync("cli_bg_respawn", "spawn_failed"),
      (process.exitCode = 1));
    return;
  }
  (await logFeatureOkAsync("cli_bg_respawn"),
    process.stdout.write(`respawned ${s}${l.short !== s ? ` \u2192 ${l.short}` : ""}
`));
}
//@ chunk-bg51yd13.js:61338-62534 placement
async function stopHandler(e, n, o = !1) {
  let r = e,
    { short: short } = await resolveJobArgument(
      r,
      "claude stop <id>",
      [
        "Stop a background session. Its conversation is kept; resume it later with `claude attach <id>`.",
        ...[],
      ].join(`
  `),
      !1,
      n,
    ),
    l = await readJobState(getJobDir(short), n),
    { confirmed: confirmed, error: error } = await killJob(short, l ?? void 0, void 0, n);
  if (!confirmed) {
    (await logFeatureBadAsync("cli_bg_stop", "kill_unconfirmed"),
      process.stderr.write(
        error
          ? `couldn't confirm ${short} was stopped \u2014 ${error}
`
          : `couldn't confirm ${short} was stopped \u2014 the background service may be restarting. Try again in a moment.
`,
      ),
      (process.exitCode = 1));
    return;
  }
  (await logFeatureOkAsync("cli_bg_stop"),
    process.stdout.write(`stopped ${short}
`));
  let p = getJobDir(short);
  await writePendingWakeup(p, void 0);
  let w = await readJobState(p, n);
  if (w && !isSettled(w)) {
    let iso = new Date().toISOString();
    await writeStateAtomic(
      p,
      {
        ...w,
        state: "stopped",
        detail: "stopped",
        tempo: "idle",
        needs: void 0,
        block: void 0,
        inFlight: void 0,
        updatedAt: iso,
        firstTerminalAt: w.firstTerminalAt ?? iso,
      },
      n,
    ).catch((R) => logForDebugging(`bg stop terminal write failed: ${errorMessage(R)}`, { level: "warn" }));
  } else await markJobStoppedOnRow(p, n);
  if (
    (await logEventAsync("tengu_bg_agent_action", {
      action: lit("stop"),
      source: lit("cli"),
      jobSessionId: ye(w?.sessionId) ?? lit(""),
    }),
    w?.worktreePath)
  )
    process.stdout.write(
      sequential.dim(`  worktree retained at ${w.worktreePath}
  run 'claude rm ${short}' to remove worktree and job state
`),
    );
}
/**
 * claude rm 的用法行（RM_USAGE）与完整帮助（RM_HELP，说明 --discard-unpushed 与 --force-remove-worktree）。
 */
//@ chunk-bg51yd13.js:62534-63376 placement
var RM_USAGE = `Usage: claude rm <id> [--discard-unpushed <commit>@<worktree-id>] [--force-remove-worktree <worktree-id>]
`,
  RM_HELP =
    `${RM_USAGE}
  Delete a background session and its worktree. Unlike \`stop\`, works on already-exited sessions.
` +
    `  --discard-unpushed <commit>@<worktree-id>  also discard the worktree's unpushed commits (and any uncommitted changes) while it is still the same worktree at that commit \u2014 pass the value a previous 'claude rm <id>' reported
` +
    `  --force-remove-worktree <worktree-id>      delete the worktree directory even though the WorktreeRemove hook or git couldn't remove it (its repository must list it as a worktree, or have dropped it in a removal that couldn't delete it; no uncommitted changes to tracked files, submodules included; the branch is kept) \u2014 pass the value a previous 'claude rm <id>' reported
`;
/**
 * claude rm：删除后台会话及其工作树（--discard-unpushed、--force-remove-worktree）。
 */
//@ chunk-bg51yd13.js:63376-66128 placement
async function rmHandler(e, n, o = getBgVerbArgsWithoutDebug(process.argv.slice(2)), r = !1) {
  let s,
    l,
    u,
    y,
    p = [],
    w = e === void 0 ? o : [e, ...o];
  for (let T = 0; T < w.length; T++) {
    let N = w[T];
    if (N === "--help" || N === "-h") (process.stdout.write(RM_HELP), process.exit(0));
    if (N === "--discard-unpushed" || N.startsWith("--discard-unpushed=")) {
      let [L, F, ...j] = ((N === "--discard-unpushed" ? w[++T] : N.slice(19)) ?? "").toLowerCase().split("@");
      if (
        j.length > 0 ||
        L === void 0 ||
        !isValidGitSha(L) ||
        F === void 0 ||
        !WORKTREE_DIGEST_PATTERN.test(F)
      ) {
        y = `option '--discard-unpushed' takes the <commit>@<worktree-id> value shown by a previous 'claude rm <id>' refusal
`;
        break;
      }
      l = { headSha: L, worktreeDigest: F };
    } else if (N === "--force-remove-worktree" || N.startsWith("--force-remove-worktree=")) {
      let lower = ((N === "--force-remove-worktree" ? w[++T] : N.slice(24)) ?? "").toLowerCase();
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
    } else if (s === void 0) s = N;
    else p.push(N);
  }
  if (y !== void 0 || !s) (process.stderr.write(`${y ?? ""}${RM_USAGE}`), process.exit(1));
  let A = Bt(p);
  if (A) process.stderr.write(A);
  let filtered = (n ? ((await listStorageJobIds(n)) ?? []) : await readdir_2(getJobsDir()).catch(() => []))
    .filter((T) => SHORT_RE.test(T))
    .filter((T) => T.startsWith(s));
  if (filtered.length !== 1)
    (process.stderr.write(
      filtered.length === 0
        ? `No job matching '${s}'
`
        : `Ambiguous prefix '${s}', matches: ${filtered.join(", ")}
`,
    ),
      process.exit(1));
  let D = filtered[0],
    S = await readJobState(getJobDir(D), n),
    E = await deleteJob(
      D,
      { ...(l !== void 0 && { discardUnpushed: l }), ...(u !== void 0 && { forceRemoveWorktree: u }) },
      n,
    );
  if (!E.removed) {
    let { error: error, errorCode: errorCode, keptWorktree: keptWorktree } = E;
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
        { worktree: keptWorktree, jobId: D },
      );
      (process.stdout.write(
        `kept ${D} \u2014 its worktree is still at ${keptWorktree}
` +
          F.cli
            .map(
              (j) => `  ${j}
`,
            )
            .join(""),
      ),
        (process.exitCode = 1));
      return;
    }
    (await logFeatureBadAsync("cli_bg_rm", errorCode ?? "kill_unconfirmed"),
      process.stderr
        .write(`couldn't remove ${D} \u2014 ${error ?? "the background service may be restarting. Try again in a moment."}
`),
      (process.exitCode = 1));
    return;
  }
  await logEventAsync("tengu_bg_agent_action", {
    action: lit("delete"),
    source: lit("cli"),
    jobSessionId: ye(S?.sessionId) ?? lit(""),
  });
  let { leftWorktreeDir: leftWorktreeDir, forcedWorktreeRemoval: forcedWorktreeRemoval } = E;
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
          : S?.worktreePath
            ? `
  worktree: ${printableLabel(S.worktreePath)}`
            : "") +
      `
`,
  );
}
/**
 * （误归 computerUse）把 -abc 形式拆出已知短选项，返回 {peeled, rest}。
 */
//@ chunk-bg51yd13.js:66128-66271 placement = filterAppsForDescription (0.354)
function peelCombinedShortFlags(e) {
  let peeled = [],
    rest = e;
  while (/^-[a-zA-Z]./.test(rest) && lqr.has(rest.slice(0, 2)))
    (peeled.push(rest.slice(0, 2)), (rest = `-${rest.slice(2)}`));
  return { peeled: peeled, rest: rest };
}
//@ chunk-bg51yd13.js:66271-66323 placement
function le(e) {
  return e.length > 1 && e.startsWith("-");
}
//@ chunk-bg51yd13.js:66323-66420 placement
function De(e) {
  let n = getFlagValueIndices(e);
  for (let o = 0; o < e.length; o++) if (e[o] === "--" && !n.has(o)) return o;
  return -1;
}
//@ chunk-bg51yd13.js:66420-66556 placement
function stripBgOnlyFlags(e) {
  let n = De(e),
    o = n >= 0 ? e.slice(0, n) : e,
    r = getFlagValueIndices(o),
    filtered = o.filter((l, u) => r.has(u) || !Nt.includes(l));
  return n >= 0 ? [...filtered, ...e.slice(n)] : filtered;
}
/**
 * 取某个 flag 的值：支持 `--x v`、`--x=v`、组合短参数 `-abv`/`-a v`；遇到 `--` 停止；多次出现取最后一个。
 */
//@ chunk-bg51yd13.js:66556-66951 placement
function getFlagValue(e, n, o) {
  let r = getFlagValueIndices(e),
    s;
  for (let l = 0; l < e.length; l++) {
    if (r.has(l)) continue;
    let u = e[l];
    if (u === "--") break;
    if (u === n || (o !== void 0 && u === o)) {
      if (e[l + 1] !== void 0) ((s = e[l + 1]), l++);
      continue;
    }
    if (u.startsWith(`${n}=`)) {
      s = u.slice(n.length + 1);
      continue;
    }
    if (o !== void 0) {
      let { peeled: peeled, rest: rest } = peelCombinedShortFlags(u);
      if (rest.length > 2 && rest.slice(0, 2) === o) {
        s = rest.slice(2);
        continue;
      }
      if (peeled.length > 0 && rest === o && e[l + 1] !== void 0) ((s = e[l + 1]), l++);
    }
  }
  return s;
}
//@ chunk-bg51yd13.js:66951-67678 placement
function rewriteDispatchFlagValue(e, n, o, r) {
  let s = getFlagValueIndices(e),
    l = [...e],
    u = !1;
  for (let p = 0; p < e.length; p++) {
    if (s.has(p)) continue;
    let w = e[p];
    if (w === "--") break;
    if (w === n || (o !== void 0 && w === o)) {
      if (e[p + 1] !== void 0) {
        if (!Xse(r)) ((l[p] = `${n}=${r}`), (l[p + 1] = null), (u = !0));
        else if (e[p + 1] !== r) ((l[p + 1] = r), (u = !0));
        p++;
      }
      continue;
    }
    if (w.startsWith(`${n}=`)) {
      if (w.slice(n.length + 1) !== r) ((l[p] = `${n}=${r}`), (u = !0));
      continue;
    }
    if (o !== void 0) {
      let { peeled: peeled, rest: rest } = peelCombinedShortFlags(w);
      if (rest.length > 2 && rest.slice(0, 2) === o) {
        if (rest.slice(2) !== r) ((l[p] = `${w.slice(0, w.length - (rest.length - 2))}${r}`), (u = !0));
        continue;
      }
      if (peeled.length > 0 && rest === o && e[p + 1] !== void 0) {
        if (!Xse(r))
          ((l[p] = `-${peeled.map((h) => h.slice(1)).join("")}`), (l[p + 1] = `${n}=${r}`), (u = !0));
        else if (e[p + 1] !== r) ((l[p + 1] = r), (u = !0));
        p++;
      }
    }
  }
  if (!u) return;
  let y = [];
  for (let p of l) if (p !== null) y.push(p);
  return y;
}
/**
 * 返回参数数组里"作为 flag 取值"的下标集合（如 --rc 的名字、多值 flag 的后续值），供其他扫描函数跳过。
 */
//@ chunk-bg51yd13.js:67678-68131 placement
function getFlagValueIndices(e) {
  let n = new Set();
  for (let o = 0; o < e.length; o++) {
    if (n.has(o)) continue;
    let r = e[o];
    if (r === "--") break;
    let { rest: rest } = peelCombinedShortFlags(r);
    if (r === "--resume" || rest === "-r") continue;
    if (
      (r === "--remote-control" || r === "--rc") &&
      e[o + 1] !== void 0 &&
      !(e[o + 1].length > 1 && e[o + 1].startsWith("-"))
    ) {
      n.add(o + 1);
      continue;
    }
    if (!rest.includes("=") && G2t.has(rest) && e[o + 1] !== void 0) {
      if ((n.add(o + 1), Evt.has(rest))) {
        let l = o + 2;
        while (e[l] !== void 0 && !(e[l].length > 1 && e[l].startsWith("-"))) (n.add(l), l++);
      }
    }
  }
  return n;
}
/**
 * 参数里有 --continue/-c 返回 true；有 --resume/-r 时只有带了会话 id 才返回 true。
 */
//@ chunk-bg51yd13.js:68131-68471 placement
function hasContinueOrResumeId(e) {
  let n = getFlagValueIndices(e),
    o = !1,
    r = !1;
  for (let s = 0; s < e.length; s++) {
    if (n.has(s)) continue;
    let l = e[s];
    if (l === "--") break;
    if (l === "--continue") {
      r = !0;
      continue;
    }
    if (l === "--resume" || l.startsWith("--resume=")) {
      o = !0;
      continue;
    }
    let { peeled: peeled, rest: rest } = peelCombinedShortFlags(l);
    if (peeled.includes("-c") || rest === "-c") r = !0;
    if (rest === "-r" || /^-r./.test(rest)) o = !0;
  }
  if (o) return getResumeArg(e) !== void 0;
  return r;
}
/**
 * 取 --resume/-r 的参数值（--resume=、-rXXX、或下一个非 flag 参数），没有值返回 undefined。
 */
//@ chunk-bg51yd13.js:68471-68792 placement
function getResumeArg(e) {
  let n = getFlagValueIndices(e),
    o;
  for (let r = 0; r < e.length; r++) {
    if (n.has(r)) continue;
    let s = e[r];
    if (s === "--") break;
    if (s.startsWith("--resume=")) {
      o = s.slice(9) || void 0;
      continue;
    }
    let { rest: rest } = peelCombinedShortFlags(s);
    if (/^-r./.test(rest)) {
      o = rest.slice(2);
      continue;
    }
    if (s === "--resume" || rest === "-r") {
      let u = e[r + 1];
      if (u !== void 0 && !le(u)) ((o = u), r++);
      else o = void 0;
    }
  }
  return o;
}
//@ chunk-bg51yd13.js:68792-69022 placement
function hasResumeOrContinueFlag(e) {
  let n = getFlagValueIndices(e);
  return e.some((o, r) => {
    if (n.has(r)) return !1;
    if (o === "--continue" || o === "--resume" || o.startsWith("--resume=")) return !0;
    let { peeled: peeled, rest: rest } = peelCombinedShortFlags(o);
    return peeled.includes("-c") || rest === "-c" || rest === "-r" || /^-r./.test(rest);
  });
}
//@ chunk-bg51yd13.js:69022-69089 placement
function Ht(e, n) {
  let o = getFlagValueIndices(e);
  return e.some((r, s) => !o.has(s) && r === n);
}
//@ chunk-bg51yd13.js:69089-69768 placement
function stripResumeFlags(e) {
  let n = getFlagValueIndices(e),
    o = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (n.has(r)) {
      o.push(s);
      continue;
    }
    if (s === "--") {
      for (let y = r; y < e.length; y++) o.push(e[y]);
      break;
    }
    if (
      s === "--fork-session" ||
      s === "--continue" ||
      s.startsWith("--resume=") ||
      s.startsWith("--session-id=")
    )
      continue;
    let { peeled: peeled, rest: rest } = peelCombinedShortFlags(s);
    if (peeled.length > 0 || rest === "-c" || rest.startsWith("-r")) {
      let mapped = peeled.filter((R) => R !== "-c").map((R) => R[1]),
        p = rest === "-c" || /^-r./.test(rest),
        w = rest === "-r",
        A = p || w ? "" : rest.slice(1);
      if (mapped.length > 0 || A) o.push(`-${mapped.join("")}${A}`);
      if (w && e[r + 1] !== void 0 && !le(e[r + 1])) r++;
      continue;
    }
    if (s === "--session-id") {
      if (e[r + 1] !== void 0) r++;
      continue;
    }
    if (s === "--resume") {
      if (e[r + 1] !== void 0 && !le(e[r + 1])) r++;
      continue;
    }
    o.push(s);
  }
  return o;
}
//@ chunk-bg51yd13.js:69768-70045 placement
function stripSessionIdFlag(e) {
  let n = getFlagValueIndices(e),
    o = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (n.has(r)) {
      o.push(s);
      continue;
    }
    if (s === "--") {
      for (let l = r; l < e.length; l++) o.push(e[l]);
      break;
    }
    if (s.startsWith("--session-id=")) continue;
    if (s === "--session-id") {
      if (e[r + 1] !== void 0) r++;
      continue;
    }
    o.push(s);
  }
  return o;
}
/**
 * 检查后台会话不支持的参数组合（--project-config-root、--print、从文件读 --agents、bypassPermissions 未接受免责声明等），返回拒绝说明。
 */
//@ chunk-bg51yd13.js:70045-71769 placement
function validateBgLaunchFlags(args) {
  let separatorIndex = De(args),
    launchArgs = separatorIndex >= 0 ? args.slice(0, separatorIndex) : args,
    valueIndexes = getFlagValueIndices(launchArgs),
    flagArgs = launchArgs.filter((y, p) => !valueIndexes.has(p));
  if (hasRemoteBackendFlags(flagArgs)) return rejectBgWithEnvironmentFlags(launchArgs);
  if (
    getProjectConfigRoot() !== null ||
    flagArgs.some((y) => y === "--project-config-root" || y.startsWith("--project-config-root="))
  )
    return "Background sessions are unavailable with --project-config-root. A background session can lose that flag, and then it runs the hooks and settings in its working folder. Run the task in a foreground session instead.";
  if (
    flagArgs.some((y) => {
      let { peeled: peeled, rest: rest } = peelCombinedShortFlags(y);
      return y === "--print" || y.startsWith("--print=") || peeled.includes("-p") || rest === "-p";
    })
  )
    return "--bg and --print conflict: --print never starts the interactive session that `claude agents` attaches to, so the job would be unattachable. The prompt is the positional \u2014 drop --print: `claude --bg '<task>'`.";
  let agentsValue = getFlagValue(launchArgs, "--agents");
  if (agentsValue !== void 0 && agentsValue !== "" && !looksLikeAgentsJson(agentsValue))
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
function findLastPositionalArg(e, n) {
  let o = getFlagValueIndices(e),
    r;
  for (let s = 0; s < e.length; s++) {
    if (o.has(s)) continue;
    let l = e[s];
    if (le(l)) {
      let { rest: rest } = peelCombinedShortFlags(l);
      if ((l === "--resume" || rest === "-r") && e[s + 1] !== void 0 && !le(e[s + 1])) s++;
      continue;
    }
    if (l.length > 0 && l !== n) r = l;
  }
  return r;
}
/**
 * 去掉位置参数，只保留 flag 及其取值（用于把参数转成可重放的 respawnFlags）。
 */
//@ chunk-bg51yd13.js:71994-72321 placement
function keepFlagArgsOnly(e) {
  let n = getFlagValueIndices(e),
    o = [];
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    if (n.has(r)) {
      o.push(s);
      continue;
    }
    if (!le(s)) continue;
    if (s.includes("=")) {
      o.push(s);
      continue;
    }
    let { rest: rest } = peelCombinedShortFlags(s);
    if (FORWARDED_VALUE_FLAGS.has(rest)) {
      o.push(s);
      continue;
    }
    if (hyn.has(s)) {
      o.push(s);
      continue;
    }
    let u = e[r + 1];
    if (u !== void 0 && !le(u) && !n.has(r + 1)) {
      r++;
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
