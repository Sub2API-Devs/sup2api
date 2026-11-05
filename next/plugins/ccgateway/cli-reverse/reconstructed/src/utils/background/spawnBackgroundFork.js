/**
 * utils/background/spawnBackgroundFork.ts
 *
 * 2.1.316 新增。派生后台分叉会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { isAccepted } from "../codeMode/accepted.js";
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { codeModeBackgroundNotice } from "../foresightStatus.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getProcessQueue, isPassiveMainThreadCommand } from "../messageQueueManager.js";
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
import { CIRCLE_MARK_GLYPH } from "../../constants/figures.js";
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
import { getInitialSettings } from "../settings/settings.js";
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
import {
  getJobDir,
  readJobState,
  syncJobName,
  JOB_PARENT_TRANSCRIPT_FILE,
  writeStateAtomic,
} from "../../services/daemon/jobState.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { generateSessionName } from "../../commands/rename/generateSessionName.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { createContinuedInEntry } from "../backgroundSessionResume.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppStoreDirect, useAppStateSession, useAppState } from "../../state/AppState.js";
import { useTaskFramework } from "../../context/voice.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { useRef, useEffect, useState } from "../../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../gracefulShutdown.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getPermissionModeCycle, getAlwaysAllowRules } from "../permissions/permissions.js";
import { promptProactivityLevel } from "../proactivityLevel.js";
import { placeholderJobNameScore } from "../../cli/bg/bgDispatch.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { isLocalCommandMarkup } from "../messages/localCommandTags.js";
import { COMMAND_MESSAGE, BASH_STDOUT, BASH_STDERR } from "../../constants/xml.js";
import { isAgentColorName } from "../../tools/AgentTool/agentColorManager.js";
import { additionalWorkingDirectoriesOf } from "../permissions/filesystem.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-czq1j3j2.js:64483-64548 placement
function selectToolPermissionContextAlwaysDenyRules(appState) {
  return appState.toolPermissionContext.alwaysDenyRules;
}
//@ chunk-czq1j3j2.js:64548-64581 placement
function selectTasks_5(appState) {
  return appState.tasks;
}
//@ chunk-czq1j3j2.js:64581-65197 placement
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
  if (isAccepted() && isCodeModeEnabled()) {
    onDone(codeModeBackgroundNotice(), {
      display: "system",
    });
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
//@ chunk-czq1j3j2.js:65197-71887 placement
/**
 * 派生后台分叉会话：从当前会话（或指定叶节点）复制转录、起名，并在新的后台会话中继续；协调者模式与分叉点丢失时拒绝。
 */
async function spawnBackgroundFork(
  currentAgent,
  promptText,
  effortLevel,
  permissionMode,
  addedDirs,
  allowRules,
  denyRules,
  spawnVia,
  messages,
  options,
) {
  let queuedCommands = options?.keepParent
    ? []
    : (options?.handoffRecord?.revivals ?? pendingResumeNotices(getProcessQueue()));
  if (options?.keepParent && isCoordinatorMode_2())
    return {
      ok: false,
      error: COORDINATOR_FORK_REFUSAL,
      queued: false,
      reason: "coordinator_mode",
    };
  if (isAccepted() && isCodeModeEnabled())
    return {
      ok: false,
      error: codeModeBackgroundNotice(),
      queued: false,
      reason: "repl_mode",
    };
  let resumeAtLeaf = options?.keepParent ? options.resumeAtLeaf : undefined;
  let forkPointIndex =
    resumeAtLeaf === undefined || resumeAtLeaf === null
      ? -1
      : messages.findIndex((message) => message.uuid === resumeAtLeaf);
  if (resumeAtLeaf !== undefined && resumeAtLeaf !== null && forkPointIndex < 0)
    return {
      ok: false,
      error: "Couldn't fork \u2014 the conversation no longer contains the fork point.",
      queued: false,
      reason: "fork_point_missing",
    };
  let replConfigArgv = getReplConfigArgv();
  let promptSummary = options?.keepParent
    ? truncateToLength(redactSecrets(collapseWhitespace(promptText ?? "")), 60)
    : "";
  let displayName = currentAgent.name
    ? `${currentAgent.name} ${CIRCLE_MARK_GLYPH}${promptSummary ? ` ${promptSummary}` : ""}`
    : promptSummary
      ? `${CIRCLE_MARK_GLYPH} ${promptSummary}`
      : undefined;
  let agentInfo = options?.keepParent
    ? {
        ...currentAgent,
        name: displayName,
        nameSource: displayName ? "auto" : undefined,
      }
    : currentAgent;
  let relaunchModel = getRelaunchModel();
  let effortValue = effortLevelValue(effortLevel);
  let sessionDirs = sessionAddDirs(addedDirs);
  let session = allowRules.session ?? [];
  let session_2 = denyRules.session ?? [];
  let sessionPermissionRules =
    session.length > 0 || session_2.length > 0 || sessionDirs.length > 0
      ? {
          allow: [...session],
          deny: [...session_2],
          ...(sessionDirs.length > 0 && {
            addDirs: sessionDirs,
          }),
        }
      : undefined;
  let filtered = (allowRules.cliArg ?? []).filter(isCarriableRule);
  let filtered_2 = (denyRules.cliArg ?? []).filter(isAcceptableModelArg);
  let currentWorktreeSession = getCurrentWorktreeSession();
  let handOffWorktree =
    !options?.keepParent && Boolean(currentWorktreeSession && !currentWorktreeSession.enteredExisting);
  let ownsWorktree =
    !options?.keepParent && Boolean(currentWorktreeSession && isOwnedWorktreeSession(currentWorktreeSession));
  let relocation = (() => {
    if (!options?.keepParent) return null;
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
  let to = relocation?.to;
  let bgIsolationNone = getInitialSettings().worktree?.bgIsolation === "none";
  let editsIn = (() => {
    if (!options?.keepParent || relocation !== null) return;
    if (findGitRoot(getOriginalCwd()) === null) return;
    return isLinkedWorktree(getOriginalCwd()) || bgIsolationNone ? "this-tree" : "own-worktree";
  })();
  if (messages.length > 0 && getCaps().transcriptSource !== "ccr-api") {
    let isTurnLive = options?.isTurnLive !== true;
    let pendingAttachments =
      queuedCommands.length === 0 || !isTurnLive
        ? []
        : (await getQueuedCommandAttachments(queuedCommands, imageLimitsForModel(undefined))).map(
            (attachment) => createAttachmentMessage(attachment),
          );
    let cronCarryMessages =
      options?.keepParent || !isTurnLive
        ? []
        : [options?.handoffRecord?.cronCarryNote ?? buildCronCarryAttachment(messages)];
    await recordTranscript(
      [...messages, ...pendingAttachments, ...cronCarryMessages],
      undefined,
      undefined,
      messages,
      options?.storageV5,
    );
  }
  let currentSessionFile = getCurrentSessionFile();
  let sessionId = getSessionId();
  flushAndSaveCosts(undefined, options?.storageV5);
  let flushed = false;
  try {
    if (options?.keepParent) await saveResumePoint(messages, options.storageV5);
    await withTimeout(flushSessionStorage(), 1e4, "flush timeout");
    flushed = true;
  } catch {
    if (options?.keepParent) {
      logEvent("tengu_background_spawn_failed", {
        via: fromEnum(spawnVia),
      });
      return {
        ok: false,
        error: "Couldn't fork \u2014 this conversation is still being saved. Try again in a moment.",
        queued: false,
        reason: "flush_incomplete",
      };
    }
  }
  let forkBriefing =
    options?.keepParent && relocation
      ? `This conversation was forked out of ${currentWorktreeSession?.worktreePath ?? getOriginalCwd()}${currentWorktreeSession?.worktreeBranch ? ` (branch ${currentWorktreeSession.worktreeBranch})` : ""}, a linked worktree the original session is still working in \u2014 never edit files, run commands, or enter that worktree with ${ENTER_WORKTREE_TOOL_NAME}. You are in ${relocation.to}${bgIsolationNone ? "" : `; before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} instead of reusing the original's${currentWorktreeSession?.worktreeBranch ? `, and if the task builds on the original's work, base your new branch on ${currentWorktreeSession.worktreeBranch} rather than checking that branch out (it stays checked out in the original's worktree)` : ""}`}.`
      : editsIn === "own-worktree"
        ? `This conversation was forked from a session that is still working in this checkout (${getOriginalCwd()}). Before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} so your edits don't land where the original session is editing.`
        : undefined;
  let forkMessages = resumeAtLeaf === undefined ? messages : messages.slice(0, forkPointIndex + 1);
  let sessionUuid = normalizeUuidOrNull(sessionId);
  let forkPointRecord =
    resumeAtLeaf !== undefined && sessionUuid !== null
      ? {
          type: "last-prompt",
          sessionId: sessionUuid,
          leafUuid: resumeAtLeaf,
          explicit: true,
        }
      : undefined;
  if (resumeAtLeaf !== undefined && forkPointRecord === undefined) {
    logEvent("tengu_background_spawn_failed", {
      via: fromEnum(spawnVia),
    });
    return {
      ok: false,
      error: "Couldn't fork \u2014 this session's id cannot record the fork point.",
      queued: false,
      reason: "session_id_invalid",
    };
  }
  let last = forkMessages.findLast((message) => isLoggableMessage(message) && !isReorderedRow(message.uuid));
  let forkBriefingEntry =
    forkBriefing !== undefined && lastResumableMessage(forkMessages) !== undefined && last !== undefined
      ? {
          parentUuid: last.uuid,
          isSidechain: false,
          ...createAttachmentMessage({
            type: "fork_briefing",
            text: forkBriefing,
          }),
          ...transcriptStamp(sessionId),
        }
      : undefined;
  let resumeFile = currentSessionFile;
  let providedSessionId = options?.providedSessionId;
  let jobShortId;
  if (options?.keepParent && currentSessionFile !== null) {
    providedSessionId ??= randomUUID();
    jobShortId = providedSessionId.slice(0, 8);
    try {
      resumeFile = await snapshotParentTranscript(currentSessionFile, jobShortId, options.storageV5, {
        required: forkPointRecord ? [forkPointRecord] : [],
        optional: forkBriefingEntry ? [forkBriefingEntry] : [],
      });
    } catch (error) {
      await removeSnapshotJobDir(jobShortId, options.storageV5);
      logEvent("tengu_background_spawn_failed", {
        via: fromEnum(spawnVia),
      });
      return {
        ok: false,
        error: `Couldn't fork \u2014 ${errorMessage(error)}`,
        queued: false,
        reason: "snapshot_copy_failed",
      };
    }
  }
  let replayLaunchConfig = options?.keepParent ? getForkReplayLaunchConfig() : {};
  let extraSystemPrompt =
    forkBriefing !== undefined &&
    (forkBriefingEntry === undefined || currentSessionFile === null) &&
    !(replayLaunchConfig.appendSystemPrompt ?? "").includes(forkBriefing)
      ? forkBriefing
      : undefined;
  let launchArgs = [
    ...(resumeFile !== null ? ["--resume", resumeFile, "--fork-session"] : []),
    ...(options?.replyOnResume ? ["--reply-on-resume"] : []),
    ...replaceAddDirArgs(
      options?.keepParent ? stripChannelsArgs(stripWatchArtifactArgs(replConfigArgv)) : replConfigArgv,
      addedDirs,
    ),
    ...filtered.flatMap((rule) => ["--allowed-tools", rule]),
    ...filtered_2.flatMap((rule) => ["--disallowed-tools", rule]),
    ...(relaunchModel ? ["--model", relaunchModel] : []),
    ...(effortValue !== undefined ? ["--effort", effortValue] : []),
    "--permission-mode",
    permissionMode,
    ...(options?.proactivityLevel !== undefined ? ["--proactivity", options.proactivityLevel] : []),
    ...flagArgs("--agent", replayLaunchConfig.agent),
    ...flagArgs("--agents", replayLaunchConfig.agents),
    ...flagArgs("--name", options?.keepParent ? undefined : options?.workerName),
    ...flagArgs(
      "--append-system-prompt",
      [replayLaunchConfig.appendSystemPrompt, extraSystemPrompt].filter(Boolean).join(`

`) || undefined,
    ),
    ...flagArgs("--system-prompt-snapshot", onOffFlagValue(replayLaunchConfig.systemPromptSnapshot)),
    ...(promptText ? ["--", promptText] : []),
  ];
  let timestamp = messages.at(-1)?.timestamp;
  let spawnResult = await spawnBgSession(
    launchArgs,
    providedSessionId,
    "repl",
    to ?? currentWorktreeSession?.worktreePath ?? getOriginalCwd(),
    {
      ...agentInfo,
      ...(options?.keepParent && {
        bgIsolation: "default",
      }),
      ...(options?.keepParent &&
        timestamp !== undefined && {
          forkSourceAlive: true,
          forkBoundaryAt: timestamp,
          forkSessionId: providedSessionId,
          forkParentSessionId: getSessionId(),
        }),
      worktree: handOffWorktree
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
      inFlight: options?.taskFreeInFlight,
    },
    options?.extraEnv,
    undefined,
    options?.storageV5,
  ).catch((error) => ({
    ok: false,
    error: `Couldn't ${options?.keepParent ? "fork" : "background"} \u2014 ${errorMessage(error)}`,
    reason: undefined,
  }));
  if (!spawnResult.ok) {
    logEvent("tengu_background_spawn_failed", {
      via: fromEnum(spawnVia),
    });
    if (jobShortId !== undefined && !spawnResult.alive) removeSnapshotJobDir(jobShortId, options?.storageV5);
    let queuedRescue = false;
    if (
      spawnVia === "left_arrow" &&
      options?.providedSessionId !== undefined &&
      currentSessionFile !== null &&
      !spawnResult.alive
    ) {
      let jobDir = getJobDir(options.providedSessionId.slice(0, 8));
      let jobState = await readJobState(jobDir, options.storageV5);
      if (jobState)
        queuedRescue = await queueRescueRow({
          sessionFile: currentSessionFile,
          forkSessionId: options.providedSessionId,
          jobDir,
          prev: jobState,
          forkArgs: launchArgs,
          storageV5: options.storageV5,
        });
      if (queuedRescue && flushed)
        await appendContinuedInRecord(
          currentSessionFile,
          sessionId,
          options.providedSessionId,
          options.storageV5,
        );
      if (queuedRescue && currentWorktreeSession) {
        if (ownsWorktree)
          await releaseOwnWorktreeLock(
            currentWorktreeSession.worktreePath,
            currentWorktreeSession.originalCwd,
          );
        setCurrentWorktreeSession(null);
        clearResumeHintWorktree();
      }
    }
    if (spawnVia === "left_arrow")
      if (queuedRescue) logFeatureSad("repl_background_fork", "queued_for_later");
      else logFeatureBad("repl_background_fork", "spawn_failed");
    return {
      ok: false,
      error: spawnResult.error,
      queued: queuedRescue,
      reason: spawnResult.reason,
      alive: spawnResult.alive,
    };
  }
  logEvent("tengu_background", {
    via_flag: false,
    via: fromEnum(spawnVia),
  });
  if (spawnVia === "left_arrow") logFeatureOk("repl_background_fork");
  let sessionId_2 = spawnResult.sessionId ?? providedSessionId;
  if (!options?.keepParent && currentSessionFile !== null && sessionId_2 !== undefined)
    await appendContinuedInRecord(currentSessionFile, sessionId, sessionId_2, options?.storageV5);
  if (currentWorktreeSession && !options?.keepParent) {
    if (ownsWorktree)
      await releaseOwnWorktreeLock(currentWorktreeSession.worktreePath, currentWorktreeSession.originalCwd);
    setCurrentWorktreeSession(null);
    clearResumeHintWorktree();
  }
  if (agentInfo.name === undefined && spawnResult.sessionId && !options?.keepParent) {
    let short = spawnResult.short;
    let nameSync = generateSessionName(
      messagesSinceCompactBoundary([...messages]),
      AbortSignal.timeout(SESSION_NAME_TIMEOUT_MS),
      {
        credentials: options?.credentials,
      },
    )
      .then((sessionName) =>
        sessionName ? syncJobName(short, sessionName, "auto", options?.storageV5) : undefined,
      )
      .catch(() => {});
    if (spawnVia === "command") registerCleanup(() => nameSync);
  }
  return {
    ok: true,
    short: spawnResult.short,
    sessionId: spawnResult.sessionId ?? providedSessionId,
    handedOff: handOffWorktree,
    hadWorktree: currentWorktreeSession !== null,
    relocatedTo: to,
    relocatedFrom: relocation?.from,
    name: agentInfo.name,
    rosterName: agentInfo.name || agentInfo.intent || spawnResult.short,
    editsIn,
  };
}
//@ chunk-czq1j3j2.js:71887-72093 placement
async function appendContinuedInRecord(currentSessionFile, sessionId, continuedSessionId, storageV5) {
  let sessionId_2 = normalizeUuidOrNull(sessionId);
  let continuedInSessionId = normalizeUuidOrNull(continuedSessionId);
  if (sessionId_2 === null || continuedInSessionId === null) return;
  await appendEntryToFileAsync(
    currentSessionFile,
    createContinuedInEntry(sessionId_2, continuedInSessionId),
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
//@ chunk-czq1j3j2.js:72093-73202 placement
async function snapshotParentTranscript(
  currentSessionFile,
  jobShortId,
  storageV5,
  trailerEntries = {
    required: [],
    optional: [],
  },
) {
  let snapshotPath = join(getJobDir(jobShortId), ...JOB_PARENT_TRANSCRIPT_FILE);
  let transcriptStorageKey = getTranscriptStorageKey(currentSessionFile, storageV5);
  let appendLines;
  if (transcriptStorageKey !== undefined && isValidKeySegment(jobShortId)) {
    let storageKey = STORAGE_SPACES.job(jobShortId, [...JOB_PARENT_TRANSCRIPT_FILE]);
    let copyResult = await transcriptStorageKey.backend.copy(transcriptStorageKey.key, storageKey);
    if (!copyResult.ok) {
      let code = copyResult.error.code;
      let telemetryCode = "telemetryCode" in copyResult.error ? copyResult.error.telemetryCode : undefined;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `snapshot copy failed: ${code}${telemetryCode === undefined ? "" : ` ${telemetryCode}`}`,
        "snapshot copy failed",
      );
    }
    appendLines = async (suffix) => {
      let updateResult = await transcriptStorageKey.backend.updateText(storageKey, (current) =>
        current === undefined
          ? {
              skip: true,
            }
          : {
              write: current.value + suffix,
            },
      );
      if (!updateResult.ok) return formatStorageError(updateResult.error);
      return updateResult.value.written ? undefined : "snapshot gone";
    };
  } else {
    await mkdir(dirname(snapshotPath), {
      recursive: true,
      mode: 448,
    });
    await copyFile(currentSessionFile, snapshotPath);
    appendLines = (suffix) =>
      appendFile(snapshotPath, suffix, {
        mode: 384,
      }).then(
        () => {
          return;
        },
        (error) => errorMessage(error),
      );
  }
  let toTrailer = (entries) =>
    `
` +
    entries.map((entry) => jsonStringify(entry)).join(`
`) +
    `
`;
  if (trailerEntries.required.length > 0) {
    let failure = await appendLines(toTrailer(trailerEntries.required));
    if (failure !== undefined) {
      logForDebugging(`[bg] fork point not written to snapshot: ${failure}`, {
        level: "error",
      });
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "the fork point could not be written to the snapshot",
        "snapshot trailer append failed",
      );
    }
  }
  if (trailerEntries.optional.length > 0) {
    let failure = await appendLines(toTrailer(trailerEntries.optional));
    if (failure !== undefined)
      logForDebugging(`[bg] fork briefing not written to snapshot: ${failure}`, {
        level: "warn",
      });
  }
  return snapshotPath;
}
//@ chunk-czq1j3j2.js:73202-73371 placement
async function removeSnapshotJobDir(jobShortId, storageV5) {
  if (storageV5 !== undefined && isValidKeySegment(jobShortId)) {
    await storageV5
      .deleteScope({
        namespace: "job",
        jobId: jobShortId,
      })
      .catch(() => {});
    return;
  }
  await rm(getJobDir(jobShortId), {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-czq1j3j2.js:73371-73840 placement
async function queueRescueRow(options) {
  let { sessionFile, forkSessionId, jobDir, prev, forkArgs, storageV5 } = options;
  let forkSessionFile = join(dirname(sessionFile), `${forkSessionId}.jsonl`);
  return copyTranscriptForRescue(sessionFile, forkSessionFile, storageV5)
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
          linkScanPath: forkSessionFile,
          respawnFlags: splitForwardableArgs(stripResumeFlags(forkArgs)),
          updatedAt: new Date().toISOString(),
        },
        storageV5,
      ).catch(async (error) => {
        await deleteFileOrStoreEntry(forkSessionFile, storageV5);
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
//@ chunk-czq1j3j2.js:73840-74209 placement
/**
 * 把会话记录复制到救援会话的存储键下，失败时清理目标。
 */
async function copyTranscriptForRescue(sessionFile, targetFile, storageV5) {
  let transcriptStorageKey = getTranscriptStorageKey(sessionFile, storageV5);
  let transcriptStorageKey_2 = getTranscriptStorageKey(targetFile, storageV5);
  if (transcriptStorageKey !== undefined && transcriptStorageKey_2 !== undefined) {
    let copyResult = await transcriptStorageKey.backend.copy(
      transcriptStorageKey.key,
      transcriptStorageKey_2.key,
    );
    if (!copyResult.ok) {
      await transcriptStorageKey_2.backend.delete(transcriptStorageKey_2.key).catch(() => {});
      let code = copyResult.error.code;
      let telemetryCode = "telemetryCode" in copyResult.error ? copyResult.error.telemetryCode : undefined;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `rescue copy failed: ${code}${telemetryCode === undefined ? "" : ` ${telemetryCode}`}`,
        "rescue copy failed",
      );
    }
    return;
  }
  await copyFile(sessionFile, targetFile);
}
//@ chunk-czq1j3j2.js:74209-74351 placement (2.1.88 match: getPaneBackendExecutor, 0.689)
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
//@ chunk-czq1j3j2.js:74351-74505 placement
async function writeAdoptHandoff(jobShortId, payload, storageV5) {
  let jobDir = getJobDir(jobShortId);
  let storage = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  if (storage === undefined)
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
    storage,
  );
}
//@ chunk-czq1j3j2.js:74505-74871 placement
/**
 * 生成 Artifact 评论监视器未能转到后台会话时的提示。
 */
function frameLiveTransferNote(result) {
  let lostNote =
    result.frameLiveLost > 0
      ? `
Couldn't move ${result.frameLiveLost} ${plural(result.frameLiveLost, "Artifact comment monitor")} to the background session, so automatic replies stopped. Publish ${result.frameLiveLost === 1 ? "the Artifact" : "each Artifact"} again to turn them back on.`
      : "";
  let adoptedNote =
    result.ok && result.adopted.adopted_frame_live > 0
      ? `
${artifactRepliesStopNotice(result.adopted.adopted_frame_live)}`
      : "";
  return lostNote + adoptedNote;
}
//@ chunk-czq1j3j2.js:74871-76206 placement
async function forkSessionToBackground(options) {
  let handoffRecord = takeHandoffRecord(options.messages, options.queue);
  let adoptable = await serializeAdoptable(options.tasks, options.queue);
  let jobSessionId;
  if (adoptable) {
    jobSessionId = randomUUID();
    let handoffWritten = false;
    try {
      await writeAdoptHandoff(jobSessionId.slice(0, 8), adoptable.payload, options.storageV5);
      handoffWritten = true;
      await adoptable.checkpointAgents(options.taskRegistry);
    } catch {
      jobSessionId = undefined;
      if (adoptable.payload.frameLive !== undefined)
        logFeatureSad(
          "artifact_live_subscribe",
          handoffWritten ? "consent_carry_checkpoint_failed" : "consent_carry_write_failed",
        );
    }
  }
  let relaunchConfirmation = await confirmRelaunch(
    options.messages,
    "background_handoff",
    {
      responseStreaming: options.responseStreaming ?? options.isMidTurn,
    },
    options.storageV5,
  );
  let seed = await settleSeedName(options.seed, options.storageV5);
  let workerName = seed.name !== options.seed.name ? seed.name : undefined;
  let spawnResult = await spawnBackgroundFork(
    seed,
    options.prompt,
    options.sessionEffort,
    options.permissionMode,
    options.additionalWorkingDirectories,
    options.alwaysAllowRules,
    options.alwaysDenyRules,
    "command",
    options.messages,
    {
      proactivityLevel: options.proactivityLevel,
      replyOnResume: options.isMidTurn,
      providedSessionId: jobSessionId,
      handoffRecord,
      workerName,
      taskFreeInFlight:
        adoptable && jobSessionId && carriesTasks(adoptable.payload)
          ? undefined
          : {
              tasks: 0,
              queued: 0,
              kinds: [],
            },
      storageV5: options.storageV5,
      credentials: options.credentials,
    },
  ).catch((error) => {
    clearHandoffInProgress();
    throw error;
  });
  if (spawnResult.ok) {
    if (adoptable && jobSessionId) adoptable.disown(options.taskRegistry);
    return {
      ...spawnResult,
      adopted: adoptedCounts(jobSessionId ? adoptable?.payload : null),
      frameLiveLost: jobSessionId === undefined ? (adoptable?.payload.frameLive?.length ?? 0) : 0,
    };
  }
  if (jobSessionId) adoptable?.abandon();
  let frameLiveCount = adoptable?.payload.frameLive?.length ?? 0;
  if (options.exitsAfterward && jobSessionId && frameLiveCount > 0)
    logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
  return {
    ok: false,
    error: withRelaunchHint(spawnResult.error, relaunchConfirmation, {
      exitsAfterward: options.exitsAfterward,
    }),
    frameLiveLost: options.exitsAfterward ? frameLiveCount : 0,
  };
}
//@ chunk-czq1j3j2.js:76206-76296 placement
function canBackgroundSession(messages) {
  if (isAccepted() && isCodeModeEnabled()) return false;
  return (
    isAgentsFleetEnabled() &&
    !isBgSession() &&
    !isTranscriptPersistenceDisabled() &&
    isAdoptEnabled() &&
    deriveBackgroundSeed(messages, "") !== null
  );
}
//@ chunk-czq1j3j2.js:76296-78048 placement
function BackgroundAndExit(props) {
  let $ = useMemoCache(11);
  let { messages, isMidTurn, responseStreaming } = props;
  let appStoreDirect = useAppStoreDirect();
  let storageV5 = useTaskFramework();
  let { storageV5: storageV5_2, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let startedRef = useRef(false);
  let onEffect;
  let deps;
  if (
    $[0] !== credentials ||
    $[1] !== isMidTurn ||
    $[2] !== messages ||
    $[3] !== commandQueueOrDefault ||
    $[4] !== responseStreaming ||
    $[5] !== storageV5_2 ||
    $[6] !== appStoreDirect ||
    $[7] !== storageV5
  ) {
    onEffect = () => {
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
      let backgroundSeed = deriveBackgroundSeed(messages, "");
      if (backgroundSeed === null) {
        logFeatureBad("bg_exit_dialog_background", "no_seed");
        gracefulShutdown(0, "prompt_input_exit", {
          finalMessage: "Nothing to background \u2014 exiting.",
        });
        return;
      }
      (async () => {
        let context = appStoreDirect.getState();
        let adoptability = computeAdoptability(context.tasks);
        let workflowAgents = countLiveWorkflowAgents(context.tasks, adoptability);
        let summary = backgroundWorkSummary(
          import_reject(
            context.tasks,
            (task) => isAdoptableTask(task, adoptability) || isCarriedFrameLiveWatch(task),
          ),
          {
            cronFilter: (cronTask) => !isAdoptableCron(cronTask, adoptability),
          },
        );
        let result = await forkSessionToBackground({
          seed: backgroundSeed,
          prompt: null,
          messages,
          exitsAfterward: true,
          isMidTurn,
          responseStreaming,
          sessionEffort: context.sessionEffort,
          permissionMode: getPermissionModeCycle(context),
          proactivityLevel: promptProactivityLevel(context),
          additionalWorkingDirectories: context.toolPermissionContext.additionalWorkingDirectories,
          alwaysAllowRules: context.toolPermissionContext.alwaysAllowRules,
          alwaysDenyRules: context.toolPermissionContext.alwaysDenyRules,
          tasks: context.tasks,
          taskRegistry: storageV5,
          queue: commandQueueOrDefault,
          storageV5: storageV5_2,
          credentials,
        });
        if (result.ok) {
          logFeatureOk("bg_exit_dialog_background");
          let stoppedNote =
            summary.count > 0
              ? `
${summary.summary} couldn't be moved and ${summary.count === 1 ? "was" : "were"} stopped.`
              : "";
          let carriedNote = describeCarriedTasks(workflowAgents);
          placeholderJobNameScore(storageV5_2, true);
          await gracefulShutdown(0, "prompt_input_exit", {
            suppressResumeHint: true,
            finalMessage:
              formatBgHints(result.short, result.handedOff ? "(worktree handed off)" : undefined) +
              stoppedNote +
              (carriedNote
                ? `
${carriedNote}`
                : "") +
              frameLiveTransferNote(result),
          });
        } else {
          logFeatureBad("bg_exit_dialog_background", "spawn_failed");
          await gracefulShutdown(0, "prompt_input_exit", {
            finalMessage: result.error + frameLiveTransferNote(result),
          });
        }
      })();
    };
    deps = [
      messages,
      isMidTurn,
      responseStreaming,
      appStoreDirect,
      storageV5,
      storageV5_2,
      credentials,
      commandQueueOrDefault,
    ];
    $[0] = credentials;
    $[1] = isMidTurn;
    $[2] = messages;
    $[3] = commandQueueOrDefault;
    $[4] = responseStreaming;
    $[5] = storageV5_2;
    $[6] = appStoreDirect;
    $[7] = storageV5;
    $[8] = onEffect;
    $[9] = deps;
  } else {
    onEffect = $[8];
    deps = $[9];
  }
  useEffect(onEffect, deps);
  let label;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    label = jsxProd_default(Text, {
      dimColor: true,
      children: "Moving to background\u2026",
    });
    $[10] = label;
  } else label = $[10];
  return label;
}
//@ chunk-czq1j3j2.js:78048-78707 placement
function deriveBackgroundSeed(messages, fallbackIntent, defaultIntent = "(backgrounded)") {
  let intent = fallbackIntent;
  let sawUserTurn = false;
  let assistantDetail;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type === "assistant" && assistantDetail === undefined) {
      let assistantMessageText = getAssistantMessageText(message);
      if (assistantMessageText)
        assistantDetail = truncateToLength(assistantMessageText.replace(/\s+/g, " ").trim(), 120);
    }
    if (message.type === "user" && !message.isMeta && !isToolResultMessage(message)) {
      let trimmed = getUserMessageText(message)?.trim();
      if (trimmed && isLocalCommandMarkup(trimmed)) {
        if (trimmed.startsWith(`<${COMMAND_MESSAGE}>`)) sawUserTurn = true;
        if (trimmed.startsWith(`<${BASH_STDOUT}>`) || trimmed.startsWith(`<${BASH_STDERR}>`))
          sawUserTurn = true;
        continue;
      }
      sawUserTurn = true;
      if (!intent && trimmed) intent = trimmed;
    }
    if (sawUserTurn && intent && assistantDetail !== undefined) break;
  }
  if (!sawUserTurn && !fallbackIntent) return null;
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  let currentSessionAiTitle = getCurrentSessionAiTitle(getSessionId());
  let registeredSessionName = getRegisteredSessionName();
  let currentSessionAgentColor = getCurrentSessionAgentColor();
  return {
    intent: truncateToLength(intent || defaultIntent, 200),
    name: currentSessionTitle ?? currentSessionAiTitle,
    nameSource: currentSessionTitle
      ? registeredSessionName?.source === "collision" && registeredSessionName.name === currentSessionTitle
        ? "collision"
        : "user"
      : currentSessionAiTitle
        ? "auto"
        : undefined,
    color: isAgentColorName(currentSessionAgentColor) ? currentSessionAgentColor : undefined,
    detail: assistantDetail,
  };
}
//@ chunk-czq1j3j2.js:78707-82894 placement
/**
 * /background 与退出时“移到后台”的完整流程组件：确认、生成种子名、调用 spawnBackgroundFork 把当前对话 fork 成后台作业，处理拒绝(tengu_background_declined)与失败提示。
 */
function BackgroundForkFlow(props) {
  let $ = useMemoCache(81);
  let { onDone, prompt, seed, messages, isMidTurn } = props;
  let appStateSession = useAppStateSession();
  let appState = useAppState(selectSessionEffort);
  let appState_2 = useAppState(getPermissionModeCycle);
  let appState_3 = useAppState(promptProactivityLevel);
  let appState_4 = useAppState(additionalWorkingDirectoriesOf);
  let appState_5 = useAppState(getAlwaysAllowRules);
  let appState_6 = useAppState(selectToolPermissionContextAlwaysDenyRules);
  let tasks = useAppState(selectTasks_5);
  let seedInfo = useTaskFramework();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let summary;
  if ($[0] !== tasks) {
    summary = backgroundWorkSummary(tasks);
    $[0] = tasks;
    $[1] = summary;
  } else summary = $[1];
  let summary_2 = summary;
  let carryOverCount;
  let monitorParkCount;
  let workflowAgents;
  let abandonable;
  if ($[2] !== tasks) {
    let adoptability = computeAdoptability(tasks);
    let size = carriedFrameLiveSlugs(tasks).size;
    carryOverCount = countAdoptable(tasks, adoptability) - size;
    monitorParkCount = size;
    workflowAgents = countLiveWorkflowAgents(tasks, adoptability);
    abandonable = backgroundWorkSummary(
      import_reject(tasks, (task) => isAdoptableTask(task, adoptability) || isCarriedFrameLiveWatch(task)),
      {
        cronFilter: (cronTask) => !isAdoptableCron(cronTask, adoptability),
      },
    );
    $[2] = tasks;
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
  let counts;
  if (
    $[7] !== carryOverCount ||
    $[8] !== monitorParkCount ||
    $[9] !== workflowAgents ||
    $[10] !== abandonable
  ) {
    counts = {
      carryOverCount,
      monitorParkCount,
      workflowAgents,
      abandonable,
    };
    $[7] = carryOverCount;
    $[8] = monitorParkCount;
    $[9] = workflowAgents;
    $[10] = abandonable;
    $[11] = counts;
  } else counts = $[11];
  let {
    carryOverCount: carryOverCount_2,
    monitorParkCount: monitorParkCount_2,
    workflowAgents: workflowAgents_2,
    abandonable: abandonable_2,
  } = counts;
  let [confirmed, setConfirmed] = useState(abandonable_2.count === 0 && workflowAgents_2.running === 0);
  let startedRef = useRef(false);
  let onEffect;
  if (
    $[12] !== abandonable_2.count ||
    $[13] !== appState_4 ||
    $[14] !== appState_5 ||
    $[15] !== appState_6 ||
    $[16] !== appStateSession ||
    $[17] !== carryOverCount_2 ||
    $[18] !== confirmed ||
    $[19] !== credentials ||
    $[20] !== summary_2.count ||
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
    $[31] !== seedInfo ||
    $[32] !== tasks ||
    $[33] !== workflowAgents_2
  ) {
    onEffect = () => {
      if (!confirmed || startedRef.current) {
        return;
      }
      startedRef.current = true;
      (async () => {
        let result = await forkSessionToBackground({
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
          tasks,
          taskRegistry: seedInfo,
          queue: commandQueueOrDefault,
          storageV5,
          credentials,
        });
        if (result.ok) {
          logEvent("tengu_background_fork", {
            confirmed: abandonable_2.count > 0 || workflowAgents_2.running > 0,
            inflight_count: summary_2.count,
            carryover_count: carryOverCount_2,
            workflow_agent_count: workflowAgents_2.running,
            mid_turn: isMidTurn,
            had_prompt: prompt.length > 0,
            had_worktree: result.hadWorktree,
            worktree_handed_off: result.handedOff,
            ...result.adopted,
          });
          onDone();
          placeholderJobNameScore(storageV5, true);
          await gracefulShutdown(0, "prompt_input_exit", {
            suppressResumeHint: true,
            finalMessage:
              formatBgHints(result.short, result.handedOff ? "(worktree handed off)" : undefined) +
              frameLiveTransferNote(result),
          });
        } else
          onDone(
            isBridgeOrTransport(appStateSession)
              ? withResumeFlag(
                  "Couldn't start the background session (detail withheld on this connection).",
                  result.error,
                )
              : result.error,
          );
      })();
    };
    $[12] = abandonable_2.count;
    $[13] = appState_4;
    $[14] = appState_5;
    $[15] = appState_6;
    $[16] = appStateSession;
    $[17] = carryOverCount_2;
    $[18] = confirmed;
    $[19] = credentials;
    $[20] = summary_2.count;
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
    $[31] = seedInfo;
    $[32] = tasks;
    $[33] = workflowAgents_2;
    $[34] = onEffect;
  } else onEffect = $[34];
  let deps;
  if (
    $[35] !== appState_4 ||
    $[36] !== appState_5 ||
    $[37] !== appState_6 ||
    $[38] !== appStateSession ||
    $[39] !== confirmed ||
    $[40] !== credentials ||
    $[41] !== summary_2.count ||
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
    $[52] !== seedInfo ||
    $[53] !== tasks
  ) {
    deps = [
      confirmed,
      appState,
      appState_2,
      appState_3,
      appState_4,
      appState_5,
      appState_6,
      summary_2.count,
      isMidTurn,
      seed,
      onDone,
      prompt,
      messages,
      tasks,
      seedInfo,
      storageV5,
      credentials,
      commandQueueOrDefault,
      appStateSession,
    ];
    $[35] = appState_4;
    $[36] = appState_5;
    $[37] = appState_6;
    $[38] = appStateSession;
    $[39] = confirmed;
    $[40] = credentials;
    $[41] = summary_2.count;
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
    $[52] = seedInfo;
    $[53] = tasks;
    $[54] = deps;
  } else deps = $[54];
  useEffect(onEffect, deps);
  if (confirmed) {
    let backgroundingLabel;
    if ($[55] === MEMO_CACHE_SENTINEL) {
      backgroundingLabel = jsxProd_default(Text, {
        dimColor: true,
        children: "Backgrounding\u2026",
      });
      $[55] = backgroundingLabel;
    } else backgroundingLabel = $[55];
    return backgroundingLabel;
  }
  let onCancel;
  if ($[56] !== summary_2.count || $[57] !== onDone) {
    onCancel = () => {
      logEvent("tengu_background_declined", {
        inflight_count: summary_2.count,
      });
      onDone();
    };
    $[56] = summary_2.count;
    $[57] = onDone;
    $[58] = onCancel;
  } else onCancel = $[58];
  let onCancel_2 = onCancel;
  const abandonNote = abandonable_2.count > 0 ? `${abandonable_2.summary} will be stopped.` : "";
  let monitorNote;
  if ($[59] !== monitorParkCount_2) {
    monitorNote = artifactRepliesStopNotice(monitorParkCount_2);
    $[59] = monitorParkCount_2;
    $[60] = monitorNote;
  } else monitorNote = $[60];
  let carryNote;
  if ($[61] !== carryOverCount_2) {
    carryNote =
      carryOverCount_2 > 0
        ? `${carryOverCount_2} ${plural(carryOverCount_2, "task")} will carry over to the background session.`
        : "";
    $[61] = carryOverCount_2;
    $[62] = carryNote;
  } else carryNote = $[62];
  let workflowNote;
  if ($[63] !== workflowAgents_2) {
    workflowNote = describeCarriedTasks(workflowAgents_2);
    $[63] = workflowAgents_2;
    $[64] = workflowNote;
  } else workflowNote = $[64];
  let notes;
  if ($[65] !== abandonNote || $[66] !== monitorNote || $[67] !== carryNote || $[68] !== workflowNote) {
    notes = [abandonNote, monitorNote, carryNote, workflowNote].filter(Boolean);
    $[65] = abandonNote;
    $[66] = monitorNote;
    $[67] = carryNote;
    $[68] = workflowNote;
    $[69] = notes;
  } else notes = $[69];
  const subtitle = notes.join(" ");
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
    onConfirm = () => setConfirmed(true);
    $[73] = onConfirm;
  } else onConfirm = $[73];
  let children;
  if ($[74] !== onCancel_2 || $[75] !== confirmLabel) {
    children = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "Stay",
      onConfirm,
      onCancel: onCancel_2,
    });
    $[74] = onCancel_2;
    $[75] = confirmLabel;
    $[76] = children;
  } else children = $[76];
  let dialog;
  if ($[77] !== onCancel_2 || $[78] !== subtitle || $[79] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Background this session?",
      subtitle,
      onCancel: onCancel_2,
      children,
    });
    $[77] = onCancel_2;
    $[78] = subtitle;
    $[79] = children;
    $[80] = dialog;
  } else dialog = $[80];
  return dialog;
}
//@ chunk-czq1j3j2.js:82894-82957 placement
function takeHandoffRecord(messages, queue) {
  return {
    revivals: pendingResumeNotices(queue),
    cronCarryNote: buildCronCarryAttachment(messages),
  };
}
//@ chunk-czq1j3j2.js:82957-83044 placement
/**
 * 取出命令队列里带 userResumeNotice 标记的待恢复项。
 */
function pendingResumeNotices(commandQueueManager) {
  return commandQueueManager
    .getCommandQueue()
    .filter((command) => command.userResumeNotice === true && isPassiveMainThreadCommand(command));
}
export {
  COORDINATOR_FORK_REFUSAL,
  deriveBackgroundSeed,
  spawnBackgroundFork,
  takeHandoffRecord,
  BackgroundAndExit,
  canBackgroundSession,
  call,
  forkSessionToBackground,
  queueRescueRow,
  removeSnapshotJobDir,
  snapshotParentTranscript,
  writeAdoptHandoff,
};
