/**
 * utils/background/spawnBackgroundFork.ts
 *
 * 2.1.316 新增。派生后台分叉会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: placement 19
 */
import { randomUUID } from "crypto";
import { join, dirname } from "path";
import { mkdir, copyFile, appendFile, rm } from "fs/promises";
import { isBgSession, clearResumeHintWorktree, getRegisteredSessionName } from "../concurrentSessions.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  sendDetachRequest,
  noopBackgroundConfirm,
  artifactRepliesStopNotice,
  settleSeedName,
  describeCarriedTasks,
  selectSessionEffort,
  backgroundAnywayLabel,
} from "../../screens/repl/backgroundConfirm.js";
import {
  isTranscriptPersistenceDisabled,
  recordTranscript,
  getCurrentSessionFile,
  flushSessionStorage,
  isLoggableMessage,
  transcriptStamp,
  appendEntryToFileAsync,
  getTranscriptStorageKey,
  getCurrentSessionTitle,
  getCurrentSessionAiTitle,
  getCurrentSessionAgentColor,
} from "../sessionStorage.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { commandQueueManager, isPassiveMainAgentCommand } from "../messageQueueManager.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import {
  getReplConfigArgv,
  getOriginalCwd,
  getCaps,
  getSessionId,
  getForkReplayLaunchConfig,
  getMemoryToggledOff,
  getAutoMemoryOffThisSession,
} from "../../bootstrap/state.js";
import { truncateToLength, collapseWhitespace, plural } from "../stringUtils.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { CIRCLE_MARK_GLYPH } from "../permissions/autoModeRulesPrompt.js";
import {
  getRelaunchModel,
  sessionAddDirs,
  isCarriableRule,
  replaceAddDirArgs,
  stripChannelsArgs,
  flagArgs,
  onOffFlagValue,
} from "../../services/daemon/relaunchArgs.js";
import { effortLevelValue } from "../effort.js";
import { isAcceptableModelArg } from "../../services/daemon/processLiveness.js";
import {
  getCurrentWorktreeSession,
  isOwnedWorktreeSession,
  releaseOwnWorktreeLock,
  setCurrentWorktreeSession,
} from "../worktree.js";
import { isLinkedWorktree, findCanonicalGitRoot, findGitRoot } from "../git.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { getQueuedCommandAttachments } from "../attachments.js";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { buildCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { flushAndSaveCosts } from "../../cost-tracker.js";
import {
  saveResumePoint,
  lastResumableMessage,
  confirmRelaunch,
  withRelaunchHint,
  withResumeFlag,
} from "../processRelaunch.js";
import { withTimeout } from "../sleep.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../../tools/EnterWorktreeTool/constants.js";
import { normalizeUuidOrNull } from "../agentId.js";
import {
  isReorderedRow,
  getAssistantMessageText,
  isToolResultMessage,
  getUserMessageText,
} from "../messages.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { stripWatchArtifactArgs } from "../../cli/watchArtifactArgs.js";
import { spawnBgSession, stripResumeFlags, formatBgHints } from "../../cli/bg/bgCommands.js";
import { getJobDir, readJobState, syncJobName, writeStateAtomic } from "../../services/daemon/jobState.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { generateSessionName } from "../../commands/rename/generateSessionName.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { createContinuedInEntry } from "../backgroundSessionResume.js";
import { JOB_PARENT_TRANSCRIPT_FILE } from "../../services/analytics/metadata.js";
import { isValidKeySegment, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { jsonStringify } from "../slowOperations.js";
import { splitForwardableArgs } from "../../cli/forwardedFlags.js";
import { logError } from "../log.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  writeAdoptJson,
  serializeAdoptable,
  carriesTasks,
  adoptedCounts,
  computeAdoptability,
  countLiveWorkflowAgents,
  isAdoptableTask,
  isCarriedFrameLiveWatch,
  isAdoptableCron,
  carriedFrameLiveSlugs,
  countAdoptable,
} from "./adopt.js";
import { clearHandoffInProgress } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { isAgentsFleetEnabled } from "../fleetGates.js";
import { isAdoptEnabled, backgroundWorkSummary } from "../../tasks/backgroundTaskLabels.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppStateSession, useAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { R, P, y } from "../../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../gracefulShutdown.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getPermissionModeCycle, getAlwaysAllowRules } from "../permissions/permissions.js";
import { promptProactivityLevel } from "../proactivityLevel.js";
import { placeholderJobNameScore } from "../../cli/bg/bgDispatch.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { isLocalCommandMarkup } from "../messages/localCommandTags.js";
import { COMMAND_MESSAGE, BASH_STDOUT, BASH_STDERR } from "../../constants/xml.js";
import { isAgentColorName } from "../../tools/AgentTool/agentColorManager.js";
import { allWorkingDirectories_2 } from "../permissions/filesystem.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-18hwfzwa.js:63939-64004 placement
function selectToolPermissionContextAlwaysDenyRules(Fr) {
  return Fr.toolPermissionContext.alwaysDenyRules;
}
//@ chunk-18hwfzwa.js:64004-64037 placement
function selectTasks_4(Zn) {
  return Zn.tasks;
}
//@ chunk-18hwfzwa.js:64037-64599 placement
/**
 * 生成后台会话名时的超时时间。
 */
var call = async (onDone, context, args) => {
  if (isBgSession()) {
    logEvent("tengu_background_already_bg", {});
    onDone();
    sendDetachRequest({
      message: noopBackgroundConfirm({
        kind: "leave",
        running: true,
      }),
    });
    return null;
  }
  if (isTranscriptPersistenceDisabled()) {
    onDone(
      "Cannot background \u2014 session persistence is disabled, so the forked job would have nothing to resume.",
    );
    return null;
  }
  let trimmed = (args ?? "").trim();
  let backgroundSeed = deriveBackgroundSeed(context.messages, trimmed);
  if (backgroundSeed === null) {
    onDone("Nothing to background yet \u2014 send a message first.");
    return null;
  }
  return jsxProd_default(BackgroundForkFlow, {
    onDone,
    prompt: trimmed,
    seed: backgroundSeed,
    messages: context.messages,
    isMidTurn: context.isMidTurn ?? false,
  });
};
var SESSION_NAME_TIMEOUT_MS = 3000;
var COORDINATOR_FORK_REFUSAL = "Forking is not available in coordinator sessions. Use /branch instead.";
//@ chunk-18hwfzwa.js:64599-71221 placement
/**
 * 派生后台分叉会话：从当前会话（或指定叶节点）复制转录、起名，并在新的后台会话中继续；协调者模式与分叉点丢失时拒绝。
 */
async function spawnBackgroundFork(h, x, D, L, ee, ke, Re, Be, messages, We) {
  let ze = We?.keepParent ? [] : (We?.handoffRecord?.revivals ?? pendingResumeNotices(commandQueueManager()));
  if (We?.keepParent && isCoordinatorMode_2())
    return {
      ok: false,
      error: COORDINATOR_FORK_REFUSAL,
      queued: false,
      reason: "coordinator_mode",
    };
  let resumeAtLeaf = We?.keepParent ? We.resumeAtLeaf : undefined;
  let rt =
    resumeAtLeaf === undefined || resumeAtLeaf === null
      ? -1
      : messages.findIndex((cn) => cn.uuid === resumeAtLeaf);
  if (resumeAtLeaf !== undefined && resumeAtLeaf !== null && rt < 0)
    return {
      ok: false,
      error: "Couldn't fork \u2014 the conversation no longer contains the fork point.",
      queued: false,
      reason: "fork_point_missing",
    };
  let replConfigArgv = getReplConfigArgv();
  let At = We?.keepParent ? truncateToLength(redactSecrets(collapseWhitespace(x ?? "")), 60) : "";
  let It = h.name
    ? `${h.name} ${CIRCLE_MARK_GLYPH}${At ? ` ${At}` : ""}`
    : At
      ? `${CIRCLE_MARK_GLYPH} ${At}`
      : undefined;
  let Ot = We?.keepParent
    ? {
        ...h,
        name: It,
        nameSource: It ? "auto" : undefined,
      }
    : h;
  let relaunchModel = getRelaunchModel();
  let Dt = effortLevelValue(D);
  let Lt = sessionAddDirs(ee);
  let session = ke.session ?? [];
  let session_2 = Re.session ?? [];
  let sessionPermissionRules =
    session.length > 0 || session_2.length > 0 || Lt.length > 0
      ? {
          allow: [...session],
          deny: [...session_2],
          ...(Lt.length > 0 && {
            addDirs: Lt,
          }),
        }
      : undefined;
  let filtered = (ke.cliArg ?? []).filter(isCarriableRule);
  let filtered_2 = (Re.cliArg ?? []).filter(isAcceptableModelArg);
  let currentWorktreeSession = getCurrentWorktreeSession();
  let co = !We?.keepParent && Boolean(currentWorktreeSession && !currentWorktreeSession.enteredExisting);
  let bo =
    !We?.keepParent && Boolean(currentWorktreeSession && isOwnedWorktreeSession(currentWorktreeSession));
  let Ao = (() => {
    if (!We?.keepParent) return null;
    if (currentWorktreeSession)
      return {
        to: currentWorktreeSession.originalCwd,
        from: currentWorktreeSession.enteredExisting ? "entered" : "owned",
      };
    if (!isLinkedWorktree(getOriginalCwd())) return null;
    let canonicalGitRoot = findCanonicalGitRoot(getOriginalCwd());
    return canonicalGitRoot && findGitRoot(canonicalGitRoot) === canonicalGitRoot
      ? {
          to: canonicalGitRoot,
          from: "launched",
        }
      : null;
  })();
  let to = Ao?.to;
  let Ro = getInitialSettings_2().worktree?.bgIsolation === "none";
  let Ho = (() => {
    if (!We?.keepParent || Ao !== null) return;
    if (findGitRoot(getOriginalCwd()) === null) return;
    return isLinkedWorktree(getOriginalCwd()) || Ro ? "this-tree" : "own-worktree";
  })();
  if (messages.length > 0 && getCaps().transcriptSource !== "ccr-api") {
    let cn = We?.isTurnLive !== true;
    let Dn =
      ze.length === 0 || !cn
        ? []
        : (await getQueuedCommandAttachments(ze, imageLimitsForModel(undefined))).map((mr) =>
            createAttachmentMessage(mr),
          );
    let wn =
      We?.keepParent || !cn ? [] : [We?.handoffRecord?.cronCarryNote ?? buildCronCarryAttachment(messages)];
    await recordTranscript([...messages, ...Dn, ...wn], undefined, undefined, messages, We?.storageV5);
  }
  let currentSessionFile = getCurrentSessionFile();
  let sessionId = getSessionId();
  flushAndSaveCosts(undefined, We?.storageV5);
  let mn = false;
  try {
    if (We?.keepParent) await saveResumePoint(messages, We.storageV5);
    await withTimeout(flushSessionStorage(), 1e4, "flush timeout");
    mn = true;
  } catch {
    if (We?.keepParent) {
      logEvent("tengu_background_spawn_failed", {
        via: fromEnum(Be),
      });
      return {
        ok: false,
        error: "Couldn't fork \u2014 this conversation is still being saved. Try again in a moment.",
        queued: false,
        reason: "flush_incomplete",
      };
    }
  }
  let Cn =
    We?.keepParent && Ao
      ? `This conversation was forked out of ${currentWorktreeSession?.worktreePath ?? getOriginalCwd()}${currentWorktreeSession?.worktreeBranch ? ` (branch ${currentWorktreeSession.worktreeBranch})` : ""}, a linked worktree the original session is still working in \u2014 never edit files, run commands, or enter that worktree with ${ENTER_WORKTREE_TOOL_NAME}. You are in ${Ao.to}${Ro ? "" : `; before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} instead of reusing the original's${currentWorktreeSession?.worktreeBranch ? `, and if the task builds on the original's work, base your new branch on ${currentWorktreeSession.worktreeBranch} rather than checking that branch out (it stays checked out in the original's worktree)` : ""}`}.`
      : Ho === "own-worktree"
        ? `This conversation was forked from a session that is still working in this checkout (${getOriginalCwd()}). Before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} so your edits don't land where the original session is editing.`
        : undefined;
  let No = resumeAtLeaf === undefined ? messages : messages.slice(0, rt + 1);
  let vo = normalizeUuidOrNull(sessionId);
  let Yo =
    resumeAtLeaf !== undefined && vo !== null
      ? {
          type: "last-prompt",
          sessionId: vo,
          leafUuid: resumeAtLeaf,
          explicit: true,
        }
      : undefined;
  if (resumeAtLeaf !== undefined && Yo === undefined) {
    logEvent("tengu_background_spawn_failed", {
      via: fromEnum(Be),
    });
    return {
      ok: false,
      error: "Couldn't fork \u2014 this session's id cannot record the fork point.",
      queued: false,
      reason: "session_id_invalid",
    };
  }
  let last = No.findLast((cn) => isLoggableMessage(cn) && !isReorderedRow(cn.uuid));
  let Fn =
    Cn !== undefined && lastResumableMessage(No) !== undefined && last !== undefined
      ? {
          parentUuid: last.uuid,
          isSidechain: false,
          ...createAttachmentMessage({
            type: "fork_briefing",
            text: Cn,
          }),
          ...transcriptStamp(sessionId),
        }
      : undefined;
  let bn = currentSessionFile;
  let providedSessionId = We?.providedSessionId;
  let hn;
  if (We?.keepParent && currentSessionFile !== null) {
    providedSessionId ??= randomUUID();
    hn = providedSessionId.slice(0, 8);
    try {
      bn = await snapshotParentTranscript(currentSessionFile, hn, We.storageV5, {
        required: Yo ? [Yo] : [],
        optional: Fn ? [Fn] : [],
      });
    } catch (error) {
      await removeSnapshotJobDir(hn, We.storageV5);
      logEvent("tengu_background_spawn_failed", {
        via: fromEnum(Be),
      });
      return {
        ok: false,
        error: `Couldn't fork \u2014 ${errorMessage(error)}`,
        queued: false,
        reason: "snapshot_copy_failed",
      };
    }
  }
  let Mn = We?.keepParent ? getForkReplayLaunchConfig() : {};
  let Xo =
    Cn !== undefined &&
    (Fn === undefined || currentSessionFile === null) &&
    !(Mn.appendSystemPrompt ?? "").includes(Cn)
      ? Cn
      : undefined;
  let Sn = [
    ...(bn !== null ? ["--resume", bn, "--fork-session"] : []),
    ...(We?.replyOnResume ? ["--reply-on-resume"] : []),
    ...replaceAddDirArgs(
      We?.keepParent ? stripChannelsArgs(stripWatchArtifactArgs(replConfigArgv)) : replConfigArgv,
      ee,
    ),
    ...filtered.flatMap((cn) => ["--allowed-tools", cn]),
    ...filtered_2.flatMap((cn) => ["--disallowed-tools", cn]),
    ...(relaunchModel ? ["--model", relaunchModel] : []),
    ...(Dt !== undefined ? ["--effort", Dt] : []),
    "--permission-mode",
    L,
    ...(We?.proactivityLevel !== undefined ? ["--proactivity", We.proactivityLevel] : []),
    ...flagArgs("--agent", Mn.agent),
    ...flagArgs("--agents", Mn.agents),
    ...flagArgs("--name", We?.keepParent ? undefined : We?.workerName),
    ...flagArgs(
      "--append-system-prompt",
      [Mn.appendSystemPrompt, Xo].filter(Boolean).join(`

`) || undefined,
    ),
    ...flagArgs("--system-prompt-snapshot", onOffFlagValue(Mn.systemPromptSnapshot)),
    ...(x ? ["--", x] : []),
  ];
  let timestamp = messages.at(-1)?.timestamp;
  let on = await spawnBgSession(
    Sn,
    providedSessionId,
    "repl",
    to ?? currentWorktreeSession?.worktreePath ?? getOriginalCwd(),
    {
      ...Ot,
      ...(We?.keepParent && {
        bgIsolation: "default",
      }),
      ...(We?.keepParent &&
        timestamp !== undefined && {
          forkSourceAlive: true,
          forkBoundaryAt: timestamp,
          forkSessionId: providedSessionId,
          forkParentSessionId: getSessionId(),
        }),
      worktree: co
        ? {
            path: currentWorktreeSession.worktreePath,
            branch: currentWorktreeSession.worktreeBranch,
            hookBased: currentWorktreeSession.hookBased ?? false,
            originCwd: currentWorktreeSession.originalCwd,
          }
        : undefined,
      sessionPermissionRules,
      memoryToggledOff: getMemoryToggledOff() || undefined,
      autoMemoryOffThisSession: getAutoMemoryOffThisSession() || undefined,
      inFlight: We?.taskFreeInFlight,
    },
    We?.extraEnv,
    undefined,
    We?.storageV5,
  ).catch((error) => ({
    ok: false,
    error: `Couldn't ${We?.keepParent ? "fork" : "background"} \u2014 ${errorMessage(error)}`,
    reason: undefined,
  }));
  if (!on.ok) {
    logEvent("tengu_background_spawn_failed", {
      via: fromEnum(Be),
    });
    if (hn !== undefined && !on.alive) removeSnapshotJobDir(hn, We?.storageV5);
    let cn = false;
    if (
      Be === "left_arrow" &&
      We?.providedSessionId !== undefined &&
      currentSessionFile !== null &&
      !on.alive
    ) {
      let jobDir = getJobDir(We.providedSessionId.slice(0, 8));
      let jobState = await readJobState(jobDir, We.storageV5);
      if (jobState)
        cn = await queueRescueRow({
          sessionFile: currentSessionFile,
          forkSessionId: We.providedSessionId,
          jobDir,
          prev: jobState,
          forkArgs: Sn,
          storageV5: We.storageV5,
        });
      if (cn && mn)
        await appendContinuedInRecord(currentSessionFile, sessionId, We.providedSessionId, We.storageV5);
      if (cn && currentWorktreeSession) {
        if (bo)
          await releaseOwnWorktreeLock(
            currentWorktreeSession.worktreePath,
            currentWorktreeSession.originalCwd,
          );
        setCurrentWorktreeSession(null);
        clearResumeHintWorktree();
      }
    }
    if (Be === "left_arrow")
      if (cn) logFeatureSad("repl_background_fork", "queued_for_later");
      else logFeatureBad("repl_background_fork", "spawn_failed");
    return {
      ok: false,
      error: on.error,
      queued: cn,
      reason: on.reason,
      alive: on.alive,
    };
  }
  logEvent("tengu_background", {
    via_flag: false,
    via: fromEnum(Be),
  });
  if (Be === "left_arrow") logFeatureOk("repl_background_fork");
  let sessionId_2 = on.sessionId ?? providedSessionId;
  if (!We?.keepParent && currentSessionFile !== null && sessionId_2 !== undefined)
    await appendContinuedInRecord(currentSessionFile, sessionId, sessionId_2, We?.storageV5);
  if (currentWorktreeSession && !We?.keepParent) {
    if (bo)
      await releaseOwnWorktreeLock(currentWorktreeSession.worktreePath, currentWorktreeSession.originalCwd);
    setCurrentWorktreeSession(null);
    clearResumeHintWorktree();
  }
  if (Ot.name === undefined && on.sessionId && !We?.keepParent) {
    let short = on.short;
    let Dn = generateSessionName(
      messagesSinceCompactBoundary([...messages]),
      AbortSignal.timeout(SESSION_NAME_TIMEOUT_MS),
      {
        credentials: We?.credentials,
      },
    )
      .then((sessionName) =>
        sessionName ? syncJobName(short, sessionName, "auto", We?.storageV5) : undefined,
      )
      .catch(() => {});
    if (Be === "command") registerCleanup(() => Dn);
  }
  return {
    ok: true,
    short: on.short,
    sessionId: on.sessionId ?? providedSessionId,
    handedOff: co,
    hadWorktree: currentWorktreeSession !== null,
    relocatedTo: to,
    relocatedFrom: Ao?.from,
    name: Ot.name,
    rosterName: Ot.name || Ot.intent || on.short,
    editsIn: Ho,
  };
}
//@ chunk-18hwfzwa.js:71221-71427 placement
async function appendContinuedInRecord(currentSessionFile, x, D, storageV5) {
  let sessionId = normalizeUuidOrNull(x);
  let continuedInSessionId = normalizeUuidOrNull(D);
  if (sessionId === null || continuedInSessionId === null) return;
  await appendEntryToFileAsync(
    currentSessionFile,
    createContinuedInEntry(sessionId, continuedInSessionId),
    storageV5,
    {
      onlyIfExists: true,
    },
  ).catch((error) => {
    logForDebugging(`[bg] continued-in record not written: ${errorMessage(error)}`, {
      level: "warn",
    });
  });
}
//@ chunk-18hwfzwa.js:71427-72536 placement
async function snapshotParentTranscript(
  currentSessionFile,
  x,
  storageV5,
  L = {
    required: [],
    optional: [],
  },
) {
  let ee = join(getJobDir(x), ...JOB_PARENT_TRANSCRIPT_FILE);
  let transcriptStorageKey = getTranscriptStorageKey(currentSessionFile, storageV5);
  let Re;
  if (transcriptStorageKey !== undefined && isValidKeySegment(x)) {
    let He = STORAGE_SPACES.job(x, [...JOB_PARENT_TRANSCRIPT_FILE]);
    let We = await transcriptStorageKey.backend.copy(transcriptStorageKey.key, He);
    if (!We.ok) {
      let code = We.error.code;
      let telemetryCode = "telemetryCode" in We.error ? We.error.telemetryCode : undefined;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `snapshot copy failed: ${code}${telemetryCode === undefined ? "" : ` ${telemetryCode}`}`,
        "snapshot copy failed",
      );
    }
    Re = async (ze) => {
      let Xe = await transcriptStorageKey.backend.updateText(He, (rt) =>
        rt === undefined
          ? {
              skip: true,
            }
          : {
              write: rt.value + ze,
            },
      );
      if (!Xe.ok) return formatStorageError(Xe.error);
      return Xe.value.written ? undefined : "snapshot gone";
    };
  } else {
    await mkdir(dirname(ee), {
      recursive: true,
      mode: 448,
    });
    await copyFile(currentSessionFile, ee);
    Re = (He) =>
      appendFile(ee, He, {
        mode: 384,
      }).then(
        () => {
          return;
        },
        (error) => errorMessage(error),
      );
  }
  let Be = (He) =>
    `
` +
    He.map((We) => jsonStringify(We)).join(`
`) +
    `
`;
  if (L.required.length > 0) {
    let He = await Re(Be(L.required));
    if (He !== undefined) {
      logForDebugging(`[bg] fork point not written to snapshot: ${He}`, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the fork point could not be written to the snapshot",
        "snapshot trailer append failed",
      );
    }
  }
  if (L.optional.length > 0) {
    let He = await Re(Be(L.optional));
    if (He !== undefined)
      logForDebugging(`[bg] fork briefing not written to snapshot: ${He}`, {
        level: "warn",
      });
  }
  return ee;
}
//@ chunk-18hwfzwa.js:72536-72705 placement
async function removeSnapshotJobDir(h, storageV5) {
  if (storageV5 !== undefined && isValidKeySegment(h)) {
    await storageV5
      .deleteScope({
        namespace: "job",
        jobId: h,
      })
      .catch(() => {});
    return;
  }
  await rm(getJobDir(h), {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-18hwfzwa.js:72705-73174 placement
async function queueRescueRow(h) {
  let { sessionFile, forkSessionId, jobDir, prev, forkArgs, storageV5 } = h;
  let filePath = join(dirname(sessionFile), `${forkSessionId}.jsonl`);
  return copyTranscriptForRescue(sessionFile, filePath, storageV5)
    .then(() =>
      writeStateAtomic(
        jobDir,
        {
          ...prev,
          state: "failed",
          tempo: "idle",
          needs: undefined,
          block: undefined,
          inFlight: undefined,
          detail: "couldn't start in the background \u2014 press Enter to retry",
          linkScanPath: filePath,
          respawnFlags: splitForwardableArgs(stripResumeFlags(forkArgs)),
          updatedAt: new Date().toISOString(),
        },
        storageV5,
      ).catch(async (error) => {
        await deleteFileOrStoreEntry(filePath, storageV5);
        throw error;
      }),
    )
    .then(
      () => true,
      (error) => {
        logError(error);
        return false;
      },
    );
}
//@ chunk-18hwfzwa.js:73174-73543 placement
/**
 * 把会话记录复制到救援会话的存储键下，失败时清理目标。
 */
async function copyTranscriptForRescue(sessionFile, x, storageV5) {
  let transcriptStorageKey = getTranscriptStorageKey(sessionFile, storageV5);
  let transcriptStorageKey_2 = getTranscriptStorageKey(x, storageV5);
  if (transcriptStorageKey !== undefined && transcriptStorageKey_2 !== undefined) {
    let ke = await transcriptStorageKey.backend.copy(transcriptStorageKey.key, transcriptStorageKey_2.key);
    if (!ke.ok) {
      await transcriptStorageKey_2.backend.delete(transcriptStorageKey_2.key).catch(() => {});
      let code = ke.error.code;
      let telemetryCode = "telemetryCode" in ke.error ? ke.error.telemetryCode : undefined;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `rescue copy failed: ${code}${telemetryCode === undefined ? "" : ` ${telemetryCode}`}`,
        "rescue copy failed",
      );
    }
    return;
  }
  await copyFile(sessionFile, x);
}
//@ chunk-18hwfzwa.js:73543-73685 placement = getPaneBackendExecutor (0.689)
/**
 * 删除一个文件：若路径映射到存储后端则删后端键，否则 rm -f。与 pane 后端无关。
 */
async function deleteFileOrStoreEntry(filePath, storageV5) {
  let transcriptStorageKey = getTranscriptStorageKey(filePath, storageV5);
  if (transcriptStorageKey !== undefined) {
    await transcriptStorageKey.backend.delete(transcriptStorageKey.key).catch(() => {});
    return;
  }
  await rm(filePath, {
    force: true,
  }).catch(() => {});
}
//@ chunk-18hwfzwa.js:73685-73839 placement
async function writeAdoptHandoff(h, payload, storageV5) {
  let jobDir = getJobDir(h);
  let ee = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  if (ee === undefined)
    await mkdir(jobDir, {
      recursive: true,
      mode: 448,
    });
  await writeAdoptJson(
    jobDir,
    payload,
    {
      parent: "create",
    },
    ee,
  );
}
//@ chunk-18hwfzwa.js:73839-74205 placement
/**
 * 生成 Artifact 评论监视器未能转到后台会话时的提示。
 */
function frameLiveTransferNote(h) {
  let x =
    h.frameLiveLost > 0
      ? `
Couldn't move ${h.frameLiveLost} ${plural(h.frameLiveLost, "Artifact comment monitor")} to the background session, so automatic replies stopped. Publish ${h.frameLiveLost === 1 ? "the Artifact" : "each Artifact"} again to turn them back on.`
      : "";
  let D =
    h.ok && h.adopted.adopted_frame_live > 0
      ? `
${artifactRepliesStopNotice(h.adopted.adopted_frame_live)}`
      : "";
  return x + D;
}
//@ chunk-18hwfzwa.js:74205-75541 placement
async function forkSessionToBackground(h) {
  let handoffRecord = takeHandoffRecord(h.messages, h.queue);
  let D = await serializeAdoptable(h.tasks, h.queue);
  let L;
  if (D) {
    L = randomUUID();
    let We = false;
    try {
      await writeAdoptHandoff(L.slice(0, 8), D.payload, h.storageV5);
      We = true;
      await D.checkpointAgents(h.taskRegistry);
    } catch {
      L = undefined;
      if (D.payload.frameLive !== undefined)
        logFeatureSad(
          "artifact_live_subscribe",
          We ? "consent_carry_checkpoint_failed" : "consent_carry_write_failed",
        );
    }
  }
  let ee = await confirmRelaunch(
    h.messages,
    "background_handoff",
    {
      responseStreaming: h.responseStreaming ?? h.isMidTurn,
    },
    h.storageV5,
  );
  let ke = await settleSeedName(h.seed, h.storageV5);
  let workerName = ke.name !== h.seed.name ? ke.name : undefined;
  let Be = await spawnBackgroundFork(
    ke,
    h.prompt,
    h.sessionEffort,
    h.permissionMode,
    h.additionalWorkingDirectories,
    h.alwaysAllowRules,
    h.alwaysDenyRules,
    "command",
    h.messages,
    {
      proactivityLevel: h.proactivityLevel,
      replyOnResume: h.isMidTurn,
      providedSessionId: L,
      handoffRecord,
      workerName,
      taskFreeInFlight:
        D && L && carriesTasks(D.payload)
          ? undefined
          : {
              tasks: 0,
              queued: 0,
              kinds: [],
            },
      storageV5: h.storageV5,
      credentials: h.credentials,
    },
  ).catch((error) => {
    clearHandoffInProgress();
    throw error;
  });
  if (Be.ok) {
    if (D && L) D.disown(h.taskRegistry);
    return {
      ...Be,
      adopted: adoptedCounts(L ? D?.payload : null),
      frameLiveLost: L === undefined ? (D?.payload.frameLive?.length ?? 0) : 0,
    };
  }
  if (L) D?.abandon();
  let He = D?.payload.frameLive?.length ?? 0;
  if (h.exitsAfterward && L && He > 0) logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
  return {
    ok: false,
    error: withRelaunchHint(Be.error, ee, {
      exitsAfterward: h.exitsAfterward,
    }),
    frameLiveLost: h.exitsAfterward ? He : 0,
  };
}
//@ chunk-18hwfzwa.js:75541-75608 placement
function canBackgroundSession(h) {
  return (
    isAgentsFleetEnabled() &&
    !isBgSession() &&
    !isTranscriptPersistenceDisabled() &&
    isAdoptEnabled() &&
    deriveBackgroundSeed(h, "") !== null
  );
}
//@ chunk-18hwfzwa.js:75608-77358 placement
function BackgroundAndExit(props) {
  let $ = w(11);
  let { messages, isMidTurn, responseStreaming } = props;
  let appStoreDirect = useAppStoreDirect();
  let setVoiceState = useSetVoiceState();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let We = R(false);
  let Xe;
  let rt;
  if (
    $[0] !== credentials ||
    $[1] !== isMidTurn ||
    $[2] !== messages ||
    $[3] !== commandQueueOrDefault ||
    $[4] !== responseStreaming ||
    $[5] !== storageV5 ||
    $[6] !== appStoreDirect ||
    $[7] !== setVoiceState
  ) {
    Xe = () => {
      if (We.current) {
        return;
      }
      We.current = true;
      let backgroundSeed = deriveBackgroundSeed(messages, "");
      if (backgroundSeed === null) {
        logFeatureBad("bg_exit_dialog_background", "no_seed");
        gracefulShutdown(0, "prompt_input_exit", {
          finalMessage: "Nothing to background \u2014 exiting.",
        });
        return;
      }
      (async () => {
        let state = appStoreDirect.getState();
        let adoptability = computeAdoptability(state.tasks);
        let Ot = countLiveWorkflowAgents(state.tasks, adoptability);
        let Lt = backgroundWorkSummary(
          wi(state.tasks, (Et) => isAdoptableTask(Et, adoptability) || isCarriedFrameLiveWatch(Et)),
          {
            cronFilter: (Dt) => !isAdoptableCron(Dt, adoptability),
          },
        );
        let oo = await forkSessionToBackground({
          seed: backgroundSeed,
          prompt: null,
          messages,
          exitsAfterward: true,
          isMidTurn,
          responseStreaming,
          sessionEffort: state.sessionEffort,
          permissionMode: getPermissionModeCycle(state),
          proactivityLevel: promptProactivityLevel(state),
          additionalWorkingDirectories: state.toolPermissionContext.additionalWorkingDirectories,
          alwaysAllowRules: state.toolPermissionContext.alwaysAllowRules,
          alwaysDenyRules: state.toolPermissionContext.alwaysDenyRules,
          tasks: state.tasks,
          taskRegistry: setVoiceState,
          queue: commandQueueOrDefault,
          storageV5,
          credentials,
        });
        if (oo.ok) {
          logFeatureOk("bg_exit_dialog_background");
          let Xt =
            Lt.count > 0
              ? `
${Lt.summary} couldn't be moved and ${Lt.count === 1 ? "was" : "were"} stopped.`
              : "";
          let io = describeCarriedTasks(Ot);
          placeholderJobNameScore(storageV5, true);
          await gracefulShutdown(0, "prompt_input_exit", {
            suppressResumeHint: true,
            finalMessage:
              formatBgHints(oo.short, oo.handedOff ? "(worktree handed off)" : undefined) +
              Xt +
              (io
                ? `
${io}`
                : "") +
              frameLiveTransferNote(oo),
          });
        } else {
          logFeatureBad("bg_exit_dialog_background", "spawn_failed");
          await gracefulShutdown(0, "prompt_input_exit", {
            finalMessage: oo.error + frameLiveTransferNote(oo),
          });
        }
      })();
    };
    rt = [
      messages,
      isMidTurn,
      responseStreaming,
      appStoreDirect,
      setVoiceState,
      storageV5,
      credentials,
      commandQueueOrDefault,
    ];
    $[0] = credentials;
    $[1] = isMidTurn;
    $[2] = messages;
    $[3] = commandQueueOrDefault;
    $[4] = responseStreaming;
    $[5] = storageV5;
    $[6] = appStoreDirect;
    $[7] = setVoiceState;
    $[8] = Xe;
    $[9] = rt;
  } else {
    Xe = $[8];
    rt = $[9];
  }
  P(Xe, rt);
  let so;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    so = jsxProd_default(Text, {
      dimColor: true,
      children: "Moving to background\u2026",
    });
    $[10] = so;
  } else so = $[10];
  return so;
}
//@ chunk-18hwfzwa.js:77358-78019 placement
function deriveBackgroundSeed(messages, x, D = "(backgrounded)") {
  let L = x;
  let ee = false;
  let ke;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let Xe = messages[idx];
    if (Xe.type === "assistant" && ke === undefined) {
      let assistantMessageText = getAssistantMessageText(Xe);
      if (assistantMessageText) ke = truncateToLength(assistantMessageText.replace(/\s+/g, " ").trim(), 120);
    }
    if (Xe.type === "user" && !Xe.isMeta && !isToolResultMessage(Xe)) {
      let trimmed = getUserMessageText(Xe)?.trim();
      if (trimmed && isLocalCommandMarkup(trimmed)) {
        if (trimmed.startsWith(`<${COMMAND_MESSAGE}>`)) ee = true;
        if (trimmed.startsWith(`<${BASH_STDOUT}>`) || trimmed.startsWith(`<${BASH_STDERR}>`)) ee = true;
        continue;
      }
      ee = true;
      if (!L && trimmed) L = trimmed;
    }
    if (ee && L && ke !== undefined) break;
  }
  if (!ee && !x) return null;
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  let currentSessionAiTitle = getCurrentSessionAiTitle(getSessionId());
  let registeredSessionName = getRegisteredSessionName();
  let currentSessionAgentColor = getCurrentSessionAgentColor();
  return {
    intent: truncateToLength(L || D, 200),
    name: currentSessionTitle ?? currentSessionAiTitle,
    nameSource: currentSessionTitle
      ? registeredSessionName?.source === "collision" && registeredSessionName.name === currentSessionTitle
        ? "collision"
        : "user"
      : currentSessionAiTitle
        ? "auto"
        : undefined,
    color: isAgentColorName(currentSessionAgentColor) ? currentSessionAgentColor : undefined,
    detail: ke,
  };
}
//@ chunk-18hwfzwa.js:78019-82204 placement
/**
 * /background 与退出时“移到后台”的完整流程组件：确认、生成种子名、调用 spawnBackgroundFork 把当前对话 fork 成后台作业，处理拒绝(tengu_background_declined)与失败提示。
 */
function BackgroundForkFlow(props) {
  let $ = w(81);
  let { onDone, prompt, seed, messages, isMidTurn } = props;
  let appStateSession = useAppStateSession();
  let appState = useAppState(selectSessionEffort);
  let appState_2 = useAppState(getPermissionModeCycle);
  let appState_3 = useAppState(promptProactivityLevel);
  let appState_4 = useAppState(allWorkingDirectories_2);
  let appState_5 = useAppState(getAlwaysAllowRules);
  let appState_6 = useAppState(selectToolPermissionContextAlwaysDenyRules);
  let appState_7 = useAppState(selectTasks_4);
  let setVoiceState = useSetVoiceState();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let Lt;
  if ($[0] !== appState_7) {
    Lt = backgroundWorkSummary(appState_7);
    $[0] = appState_7;
    $[1] = Lt;
  } else Lt = $[1];
  let oo = Lt;
  let carryOverCount;
  let monitorParkCount;
  let workflowAgents;
  let abandonable;
  if ($[2] !== appState_7) {
    let adoptability = computeAdoptability(appState_7);
    let size = carriedFrameLiveSlugs(appState_7).size;
    carryOverCount = countAdoptable(appState_7, adoptability) - size;
    monitorParkCount = size;
    workflowAgents = countLiveWorkflowAgents(appState_7, adoptability);
    abandonable = backgroundWorkSummary(
      wi(appState_7, (bo) => isAdoptableTask(bo, adoptability) || isCarriedFrameLiveWatch(bo)),
      {
        cronFilter: (Ao) => !isAdoptableCron(Ao, adoptability),
      },
    );
    $[2] = appState_7;
    $[3] = carryOverCount;
    $[4] = monitorParkCount;
    $[5] = workflowAgents;
    $[6] = abandonable;
  } else {
    carryOverCount = $[3];
    monitorParkCount = $[4];
    workflowAgents = $[5];
    abandonable = $[6];
  }
  let Bo;
  if (
    $[7] !== carryOverCount ||
    $[8] !== monitorParkCount ||
    $[9] !== workflowAgents ||
    $[10] !== abandonable
  ) {
    Bo = {
      carryOverCount,
      monitorParkCount,
      workflowAgents,
      abandonable,
    };
    $[7] = carryOverCount;
    $[8] = monitorParkCount;
    $[9] = workflowAgents;
    $[10] = abandonable;
    $[11] = Bo;
  } else Bo = $[11];
  let {
    carryOverCount: carryOverCount_2,
    monitorParkCount: monitorParkCount_2,
    workflowAgents: workflowAgents_2,
    abandonable: abandonable_2,
  } = Bo;
  let [mn, Cn] = y(abandonable_2.count === 0 && workflowAgents_2.running === 0);
  let No = R(false);
  let vo;
  if (
    $[12] !== abandonable_2.count ||
    $[13] !== appState_4 ||
    $[14] !== appState_5 ||
    $[15] !== appState_6 ||
    $[16] !== appStateSession ||
    $[17] !== carryOverCount_2 ||
    $[18] !== mn ||
    $[19] !== credentials ||
    $[20] !== oo.count ||
    $[21] !== isMidTurn ||
    $[22] !== messages ||
    $[23] !== onDone ||
    $[24] !== appState_2 ||
    $[25] !== appState_3 ||
    $[26] !== prompt ||
    $[27] !== commandQueueOrDefault ||
    $[28] !== seed ||
    $[29] !== appState ||
    $[30] !== storageV5 ||
    $[31] !== setVoiceState ||
    $[32] !== appState_7 ||
    $[33] !== workflowAgents_2
  ) {
    vo = () => {
      if (!mn || No.current) {
        return;
      }
      No.current = true;
      (async () => {
        let Yo = await forkSessionToBackground({
          seed,
          prompt,
          messages,
          isMidTurn,
          sessionEffort: appState,
          permissionMode: appState_2,
          proactivityLevel: appState_3,
          additionalWorkingDirectories: appState_4,
          alwaysAllowRules: appState_5,
          alwaysDenyRules: appState_6,
          tasks: appState_7,
          taskRegistry: setVoiceState,
          queue: commandQueueOrDefault,
          storageV5,
          credentials,
        });
        if (Yo.ok) {
          logEvent("tengu_background_fork", {
            confirmed: abandonable_2.count > 0 || workflowAgents_2.running > 0,
            inflight_count: oo.count,
            carryover_count: carryOverCount_2,
            workflow_agent_count: workflowAgents_2.running,
            mid_turn: isMidTurn,
            had_prompt: prompt.length > 0,
            had_worktree: Yo.hadWorktree,
            worktree_handed_off: Yo.handedOff,
            ...Yo.adopted,
          });
          onDone();
          placeholderJobNameScore(storageV5, true);
          await gracefulShutdown(0, "prompt_input_exit", {
            suppressResumeHint: true,
            finalMessage:
              formatBgHints(Yo.short, Yo.handedOff ? "(worktree handed off)" : undefined) +
              frameLiveTransferNote(Yo),
          });
        } else
          onDone(
            isBridgeOrTransport(appStateSession)
              ? withResumeFlag(
                  "Couldn't start the background session (detail withheld on this connection).",
                  Yo.error,
                )
              : Yo.error,
          );
      })();
    };
    $[12] = abandonable_2.count;
    $[13] = appState_4;
    $[14] = appState_5;
    $[15] = appState_6;
    $[16] = appStateSession;
    $[17] = carryOverCount_2;
    $[18] = mn;
    $[19] = credentials;
    $[20] = oo.count;
    $[21] = isMidTurn;
    $[22] = messages;
    $[23] = onDone;
    $[24] = appState_2;
    $[25] = appState_3;
    $[26] = prompt;
    $[27] = commandQueueOrDefault;
    $[28] = seed;
    $[29] = appState;
    $[30] = storageV5;
    $[31] = setVoiceState;
    $[32] = appState_7;
    $[33] = workflowAgents_2;
    $[34] = vo;
  } else vo = $[34];
  let kn;
  if (
    $[35] !== appState_4 ||
    $[36] !== appState_5 ||
    $[37] !== appState_6 ||
    $[38] !== appStateSession ||
    $[39] !== mn ||
    $[40] !== credentials ||
    $[41] !== oo.count ||
    $[42] !== isMidTurn ||
    $[43] !== messages ||
    $[44] !== onDone ||
    $[45] !== appState_2 ||
    $[46] !== appState_3 ||
    $[47] !== prompt ||
    $[48] !== commandQueueOrDefault ||
    $[49] !== seed ||
    $[50] !== appState ||
    $[51] !== storageV5 ||
    $[52] !== setVoiceState ||
    $[53] !== appState_7
  ) {
    kn = [
      mn,
      appState,
      appState_2,
      appState_3,
      appState_4,
      appState_5,
      appState_6,
      oo.count,
      isMidTurn,
      seed,
      onDone,
      prompt,
      messages,
      appState_7,
      setVoiceState,
      storageV5,
      credentials,
      commandQueueOrDefault,
      appStateSession,
    ];
    $[35] = appState_4;
    $[36] = appState_5;
    $[37] = appState_6;
    $[38] = appStateSession;
    $[39] = mn;
    $[40] = credentials;
    $[41] = oo.count;
    $[42] = isMidTurn;
    $[43] = messages;
    $[44] = onDone;
    $[45] = appState_2;
    $[46] = appState_3;
    $[47] = prompt;
    $[48] = commandQueueOrDefault;
    $[49] = seed;
    $[50] = appState;
    $[51] = storageV5;
    $[52] = setVoiceState;
    $[53] = appState_7;
    $[54] = kn;
  } else kn = $[54];
  P(vo, kn);
  if (mn) {
    let Fn;
    if ($[55] === MEMO_CACHE_SENTINEL) {
      Fn = jsxProd_default(Text, {
        dimColor: true,
        children: "Backgrounding\u2026",
      });
      $[55] = Fn;
    } else Fn = $[55];
    return Fn;
  }
  let Fn;
  if ($[56] !== oo.count || $[57] !== onDone) {
    Fn = () => {
      logEvent("tengu_background_declined", {
        inflight_count: oo.count,
      });
      onDone();
    };
    $[56] = oo.count;
    $[57] = onDone;
    $[58] = Fn;
  } else Fn = $[58];
  let onCancel = Fn;
  const Go = abandonable_2.count > 0 ? `${abandonable_2.summary} will be stopped.` : "";
  let hn;
  if ($[59] !== monitorParkCount_2) {
    hn = artifactRepliesStopNotice(monitorParkCount_2);
    $[59] = monitorParkCount_2;
    $[60] = hn;
  } else hn = $[60];
  let Mn;
  if ($[61] !== carryOverCount_2) {
    Mn =
      carryOverCount_2 > 0
        ? `${carryOverCount_2} ${plural(carryOverCount_2, "task")} will carry over to the background session.`
        : "";
    $[61] = carryOverCount_2;
    $[62] = Mn;
  } else Mn = $[62];
  let Xo;
  if ($[63] !== workflowAgents_2) {
    Xo = describeCarriedTasks(workflowAgents_2);
    $[63] = workflowAgents_2;
    $[64] = Xo;
  } else Xo = $[64];
  let Sn;
  if ($[65] !== Go || $[66] !== hn || $[67] !== Mn || $[68] !== Xo) {
    Sn = [Go, hn, Mn, Xo].filter(Boolean);
    $[65] = Go;
    $[66] = hn;
    $[67] = Mn;
    $[68] = Xo;
    $[69] = Sn;
  } else Sn = $[69];
  const subtitle = Sn.join(" ");
  let confirmLabel;
  if ($[70] !== abandonable_2.count || $[71] !== workflowAgents_2) {
    confirmLabel =
      abandonable_2.count > 0
        ? `Background anyway (${abandonable_2.count} ${plural(abandonable_2.count, "task")} will be stopped)`
        : backgroundAnywayLabel(false, workflowAgents_2);
    $[70] = abandonable_2.count;
    $[71] = workflowAgents_2;
    $[72] = confirmLabel;
  } else confirmLabel = $[72];
  let onConfirm;
  if ($[73] === MEMO_CACHE_SENTINEL) {
    onConfirm = () => Cn(true);
    $[73] = onConfirm;
  } else onConfirm = $[73];
  let children;
  if ($[74] !== onCancel || $[75] !== confirmLabel) {
    children = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "Stay",
      onConfirm,
      onCancel,
    });
    $[74] = onCancel;
    $[75] = confirmLabel;
    $[76] = children;
  } else children = $[76];
  let wn;
  if ($[77] !== onCancel || $[78] !== subtitle || $[79] !== children) {
    wn = jsxProd_default(Dialog, {
      title: "Background this session?",
      subtitle,
      onCancel,
      children,
    });
    $[77] = onCancel;
    $[78] = subtitle;
    $[79] = children;
    $[80] = wn;
  } else wn = $[80];
  return wn;
}
//@ chunk-18hwfzwa.js:82204-82267 placement
function takeHandoffRecord(h, x) {
  return {
    revivals: pendingResumeNotices(x),
    cronCarryNote: buildCronCarryAttachment(h),
  };
}
//@ chunk-18hwfzwa.js:82267-82354 placement
/**
 * 取出命令队列里带 userResumeNotice 标记的待恢复项。
 */
function pendingResumeNotices(h) {
  return h.getCommandQueue().filter((x) => x.userResumeNotice === true && isPassiveMainAgentCommand(x));
}
export {
  takeHandoffRecord,
  deriveBackgroundSeed,
  spawnBackgroundFork,
  BackgroundAndExit,
  canBackgroundSession,
  COORDINATOR_FORK_REFUSAL,
};
