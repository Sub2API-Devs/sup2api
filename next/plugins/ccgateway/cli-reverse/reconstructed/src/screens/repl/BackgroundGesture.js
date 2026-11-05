/**
 * screens/repl/BackgroundGesture.ts
 *
 * 2.1.316 新增。REPL 控制器：转入后台的手势处理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (16)
 * attribution: placement 16
 */
import { writeSync } from "fs";
import { join } from "path";
import { rm, rename, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { disposeLiveState, resetNoticeBudgets } from "../../services/liveReplica/liveReplica.js";
import { teardownFrameLiveForProcessHandoff } from "../../services/artifacts/frameLive.js";
import {
  removeByFilter,
  isPassiveMainThreadCommand,
  commandsDiscarded,
  isQueuedCommandEditable,
  restoreTextForPop,
  isCheckinNotification,
  processQueuedCommands as processQueuedCommands_4,
  isSlashCommand as isSlashCommand_2,
} from "../../utils/messageQueueManager.js";
import {
  listJobs,
  getJobDir,
  buildBridgeReattachEnv,
  resolveBridgeHandoffIdentity,
} from "../../services/daemon/jobState.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  flushSessionStorage,
  isTranscriptPersistenceDisabled,
  getCurrentSessionBridge,
} from "../../utils/sessionStorage.js";
import { rootOf } from "../../ink/hooks/useTerminalHooks.js";
import { showScreen } from "../../utils/runSteps.js";
import { logError } from "../../utils/log.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { cleanupTerminalModes, gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  getSessionId,
  getOriginalCwd,
  getMemoryToggledOff,
  getAutoMemoryOffThisSession,
  forgetMainChainOnHandOff,
  isRestrictedSession,
  getProjectConfigRoot,
  getStickyBetas,
} from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  getTaskListId,
  getTaskOutputDir as getTaskOutputDir_2,
  ensureTaskListDir,
  sanitizePathComponent,
} from "../../utils/tasks.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFileReader } from "../../utils/fileStore.js";
import { isENOENT, withTelemetryMessage, errorMessage } from "../../utils/errors.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { HIGH_WATER_MARK_FILE } from "../../tools/TaskListTool/TaskListTool.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { BG_PROTO, SHORT_RE, CLOUD_SESSION_ID_RE } from "../../services/daemon/leaseProtocol.js";
import { isDaemonSocketGoneError } from "../../utils/sandbox/userNamespace.js";
import {
  MAX_CARRIED_PROMPTS_VARIANT,
  attachCarriedPromptHash,
  dropCarriedPromptHash,
} from "../../utils/background/envCarry.js";
import {
  takeHandoffRecord,
  deriveBackgroundSeed,
  spawnBackgroundFork,
} from "../../utils/background/spawnBackgroundFork.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnumArr, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isAccepted } from "../../utils/codeMode/accepted.js";
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { codeModeBackgroundNotice } from "../../utils/foresightStatus.js";
import {
  isLeftArrowCarriesQueuedOn,
  collectCarriablePrompts,
  cannotOpenAgentsQueuedMessage,
  writeCarriedPrompts,
  isHumanPromptCommand,
  isCannotOpenAgentsMessage,
} from "./promptQueue.js";
import {
  settleSeedName,
  alwaysFalseBackgroundConfirm,
  noopBackgroundConfirm,
  sendDetachRequest,
} from "./backgroundConfirm.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { summarizeBackgroundWork, backgroundWorkSummary } from "../../tasks/backgroundTaskLabels.js";
import {
  carriedFrameLiveSlugs,
  serializeAdoptable,
  writeAdoptJson,
  adoptedCounts,
  STALE_THRESHOLD_MS,
  computeAdoptability,
  countAbandonable,
  countCarriedSince,
  leftArrowNeedsInterstitial,
  isAdoptableTask,
  isCarriedFrameLiveWatch,
  isAdoptableCron,
  countAdoptable,
  countLiveWorkflowAgents,
} from "../../utils/background/adopt.js";
import { preSeedReplBgJob } from "../../cli/bg/bgCommands.js";
import { sessionAddDirs, earlyArgsArgv } from "../../services/daemon/relaunchArgs.js";
import {
  confirmRelaunch,
  relaunchClaudeCode,
  withRelaunchHint,
  withResumeFlag,
} from "../../utils/processRelaunch.js";
import { countWhere } from "../../utils/collections.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { recordSubmittedPrompts } from "../../history.js";
import { withExpandedPastes } from "../../utils/hooks/postSamplingHooks.js";
import { plural } from "../../utils/stringUtils.js";
import { trackBgDispatch } from "../../cli/bg/bgDispatch.js";
import {
  clearSessionParked,
  markSessionParked,
  isBgSession,
  getBgTakeover,
} from "../../utils/concurrentSessions.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { userAbortReason } from "../../utils/abortController.js";
import { clearPendingGoalIdleCheckin, clearPendingGoalReprompt } from "../../query/goalCheckIn.js";
import { disarmWorkerCheckin } from "../../tasks/LocalAgentTask/workerCheckin.js";
import { noopSyncPermissionMode, noopMergeSessionFlags } from "../../services/api/sessionFlags.js";
import { buildDispatchArgs } from "../../cli/bg/bgSpawnEnv.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createStore } from "../../state/store.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { useState, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  TURN_STOPPED_BLOCK,
  UNSENT_INPUT_BLOCK,
  backgroundEligibilityForSession,
  needsDetachBeforeBackground,
  countHeldQueuedCommands,
  createHeldScreeningCheck,
  streamingTextLength,
  streamingTextSoFar,
  lastSettledMessageUuid,
  isIdleForBackground,
  waitingForSubagentsMessage,
  WAITING_FOR_ANSWER_MESSAGE,
  isAtResumePoint,
} from "../../utils/backgroundHandoff.js";
import { getAttachStampMs } from "../../utils/attachStamp.js";
import { parseSwitchTarget } from "../../daemon/attach/attachJob.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { createSystemMessage, regExp_4 as regExp_4_2 } from "../../utils/messages.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { waitForStoreState } from "../../context/voice.js";
import { getPermissionModeCycle } from "../../utils/permissions/permissions.js";
import { promptProactivityLevel } from "../../utils/proactivityLevel.js";
import { HUMAN_CADENCE_MS, LEFT_ARROW_BACK_HINT } from "../../hooks/useTextInput.js";
import { topBlockingDialog, LEFT_ARROW_CONFIRM_DIALOG } from "../replDialogState.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import { getQueuedCommandAttachments } from "../../utils/attachments.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { cloneStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { startBackgroundSession } from "../../tasks/LocalMainSessionTask.js";
import { getQuerySourceForREPL } from "../../utils/promptCategory.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:83077-83264 placement
function preloadBackgroundChunks() {
  return Promise.all([
    import("../../ink/components/Ansi.lazy.js"),
    import("../../components/fleet/FleetView.js"),
    import("../FleetView/FleetViewScreen.js"),
    import("../../components/fleet/mountFleetView.js"),
    import("../../components/fleet/useAttachFleetOwners.js"),
  ]);
}
//@ chunk-czq1j3j2.js:83264-84336 placement
async function detachToBackground(jobId, preloadBackgroundChunks_2, host) {
  disposeLiveState();
  teardownFrameLiveForProcessHandoff();
  removeByFilter(isPassiveMainThreadCommand);
  resetNoticeBudgets();
  let jobsPromise = listJobs(undefined, host?.storageV5).catch(() => []);
  await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
  let existingRoot = rootOf(process.stdout);
  let abortLiveTurnResult = host?.abortLiveTurn?.();
  if (existingRoot) showScreen(existingRoot, null);
  abortLiveTurnResult?.then(host?.dropLateQueued).catch((error) => {
    logError(error);
  });
  process.env.CLAUDE_AGENTS_SELECT = jobId;
  let [
    { createRoot },
    { seedHostJobs },
    { applyFleetViewHostWindowsEnv },
    { mountFleetViewWithComposerBack },
    { createFleetViewHost },
  ] = await (preloadBackgroundChunks_2 ?? preloadBackgroundChunks());
  applyFleetViewHostWindowsEnv();
  let root = existingRoot ?? (await createRoot(getBaseRenderOptions(false)));
  let fleetHost = createFleetViewHost();
  fleetHost.fleetNudgeStore = host?.fleetNudgeStore ?? null;
  let jobs = await withTimeout(jobsPromise, 50, "listJobs seed").catch(() => null);
  if (jobs !== null) seedHostJobs(fleetHost, jobs, host?.storageV5);
  logForDebugging("[PERF:bg-leftarrow-mounted]");
  await mountFleetViewWithComposerBack(root, {
    ...omitAlias(host, "abortLiveTurn", "dropLateQueued"),
    host: fleetHost,
    entryChannel: "repl_back",
    originJobId: jobId,
  });
  let originSpawn = host?.originSpawn;
  if (originSpawn?.resumeHintRequested && originSpawn.transcriptMaterialized) {
    cleanupTerminalModes();
    try {
      writeSync(
        2,
        `
Your conversation was backgrounded \u2014 resume it with: claude --resume ${originSpawn.forkSessionId}
`,
      );
    } catch {}
  }
  await gracefulShutdown(0, "other", {
    suppressResumeHint: !(originSpawn?.resumeHintRequested && !originSpawn.transcriptMaterialized),
  });
  process.exit(0);
}
//@ chunk-czq1j3j2.js:84336-84468 placement
function demoteInheritedPermissionMode(permissionMode) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_agentview_inherit_mode_demote", true)
    ? {
        permissionMode,
        permissionModeInherited: true,
      }
    : {
        permissionMode,
      };
}
//@ chunk-czq1j3j2.js:84468-85029 placement
async function carryTaskListToFork(forkSessionId, signal, storageV5) {
  let sessionId = getSessionId();
  if (env.CLAUDE_CODE_TASK_LIST_ID || getTaskListId() !== sessionId) return;
  if (isStorageV5Enabled() && storageV5) {
    await copyTaskListEntries(storageV5, sessionId, forkSessionId, signal);
    return;
  }
  let fileReader = getFileReader();
  let taskOutputDir = getTaskOutputDir_2(sessionId);
  let taskOutputDir_2 = getTaskOutputDir_2(forkSessionId);
  let entries = await fileReader.listEntries(taskOutputDir).catch((error) => {
    if (!isENOENT(error))
      logForDebugging(`[tasks] carry to fork failed: ${error}`, {
        level: "warn",
      });
    return null;
  });
  if (entries === null) return;
  await ensureTaskListDir(forkSessionId, storageV5);
  for (let entry of entries) {
    if (signal?.aborted) {
      logForDebugging("[tasks] carry to fork stopped at the cap", {
        level: "warn",
      });
      return;
    }
    if (!entry.isFile) continue;
    try {
      await fileReader.copy(join(taskOutputDir, entry.name), join(taskOutputDir_2, entry.name));
    } catch (error) {
      logForDebugging(`[tasks] carry to fork skipped ${entry.name}: ${error}`, {
        level: "warn",
      });
    }
  }
}
//@ chunk-czq1j3j2.js:85029-85039 placement
var MAX_PARALLEL_EXPIRY_WRITES = 8;
//@ chunk-czq1j3j2.js:85039-86227 placement
async function copyTaskListEntries(storage, sessionId, forkSessionId, signal) {
  let sourceListId = sanitizePathComponent(sessionId);
  let targetListId = sanitizePathComponent(forkSessionId);
  let taskIds = [];
  let cursor;
  do {
    let page = await storage.listEntries(
      {
        namespace: "task",
        listId: sourceListId,
      },
      cursor === undefined
        ? undefined
        : {
            cursor,
          },
    );
    if (!page.ok) {
      logForDebugging(`[tasks] carry to fork failed: ${page.error.code}`, {
        level: "warn",
      });
      return;
    }
    for (let item of page.value.items)
      if (item.kind === "key" && item.key.namespace === "task" && "taskId" in item.key)
        taskIds.push(item.key.taskId);
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  let carryEntry = async (sourceKey, targetKey, taskId) => {
    let readResult = await storage.read([sourceKey]);
    if (!readResult.ok) {
      logForDebugging(`[tasks] carry to fork skipped ${taskId}: ${readResult.error.code}`, {
        level: "warn",
      });
      return;
    }
    let item = readResult.value.items[0];
    if (!item || !item.found) return;
    let writeResult = await storage.write(targetKey, item.value, {
      precondition: {
        type: "ifAbsent",
      },
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok)
      logForDebugging(`[tasks] carry to fork skipped ${taskId}: ${writeResult.error.code}`, {
        level: "warn",
      });
  };
  if (signal?.aborted) {
    logForDebugging("[tasks] carry to fork stopped at the cap", {
      level: "warn",
    });
    return;
  }
  await carryEntry(
    STORAGE_SPACES.taskListHighWaterMark(sourceListId),
    STORAGE_SPACES.taskListHighWaterMark(targetListId),
    HIGH_WATER_MARK_FILE,
  );
  let nextIndex = 0;
  let worker = async () => {
    while (nextIndex < taskIds.length && !signal?.aborted) {
      let taskId = taskIds[nextIndex++];
      await carryEntry(
        STORAGE_SPACES.task(sourceListId, taskId),
        STORAGE_SPACES.task(targetListId, taskId),
        taskId,
      );
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(MAX_PARALLEL_EXPIRY_WRITES, taskIds.length),
      },
      worker,
    ),
  );
  if (signal?.aborted && nextIndex < taskIds.length)
    logForDebugging("[tasks] carry to fork stopped at the cap", {
      level: "warn",
    });
}
//@ chunk-czq1j3j2.js:86227-86389 placement
async function removeJobScope(dir, jobId, scopeStore) {
  if (scopeStore && dir === getJobDir(jobId)) {
    await scopeStore
      .deleteScope({
        namespace: "job",
        jobId,
      })
      .catch(() => {});
    return;
  }
  await rm(dir, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-czq1j3j2.js:86389-86434 placement
function markExpired(path) {
  return rename(path, `${path}.expired`);
}
//@ chunk-czq1j3j2.js:86434-86497 placement
function removeExpired(path) {
  return unlink(`${path}.expired`).then(
    () => {},
    () => {},
  );
}
//@ chunk-czq1j3j2.js:86497-86793 placement
async function pingDaemon() {
  let response = await controlRequest(
    {
      proto: BG_PROTO,
      op: "ping",
    },
    {
      timeoutMs: 2000,
    },
  );
  if (!response.ok)
    return response.code === "ENOCONN" &&
      response.connected === false &&
      isDaemonSocketGoneError(response.errno)
      ? "reads"
      : "unreachable";
  if (response.op !== "ping" || typeof response.carriedPromptsFormat !== "number") return "silent";
  return response.carriedPromptsFormat >= MAX_CARRIED_PROMPTS_VARIANT ? "reads" : "lower-format";
}
//@ chunk-czq1j3j2.js:86793-95190 placement
/**
 * 输入框为空时按 ← 的处理：检查会话持久化/--project 等前提，统计在途读取与排队提示，决定是否需要后台化确认，然后 fork 当前会话并切到 agents 视图；被阻止时给出原因。
 */
async function openAgentsViaLeftArrow(
  messages,
  effortLevel,
  permissionMode,
  additionalWorkingDirectories,
  allowRules,
  denyRules,
  messageQueue,
  autoJobName,
  dispatchInfo,
  storageV5,
  credentials,
) {
  let handoffRecord = takeHandoffRecord(messages, messageQueue);
  let didRelaunch = false;
  try {
    let handoffResult = await (async () => {
      logForDebugging("[PERF:bg-leftarrow-start]");
      let seed = deriveBackgroundSeed(messages, "");
      if (seed !== null && isTranscriptPersistenceDisabled()) {
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("persistence"),
          inflight_count: dispatchInfo?.inflightCount ?? 0,
          inflight_kinds: fromEnumArr(dispatchInfo?.inflightKinds ?? []),
        });
        return "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded.";
      }
      if (seed !== null && isAccepted() && isCodeModeEnabled()) {
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("repl-mode"),
          inflight_count: dispatchInfo?.inflightCount ?? 0,
          inflight_kinds: fromEnumArr(dispatchInfo?.inflightKinds ?? []),
        });
        return codeModeBackgroundNotice();
      }
      let carriesQueued = isLeftArrowCarriesQueuedOn();
      let collectPrompts = (queue) =>
        carriesQueued
          ? collectCarriablePrompts(messageQueue, queue)
          : {
              leftEarlier: [],
              beingRead: [],
              carriable: [],
              stranded: [],
              fileContents: "",
            };
      let collected = collectPrompts();
      let carriedCommands = new Set();
      let takenBackCommands = [];
      let collectDiscarded = () => {
        let collectedSet = new Set([...collected.carriable, ...collected.beingRead]);
        for (let command of dispatchInfo?.replyOnResume ? messageQueue.getCommandQueue() : [])
          if (collectedSet.has(command)) carriedCommands.add(command);
      };
      collectDiscarded();
      let unsubscribe =
        carriedCommands.size > 0
          ? commandsDiscarded.subscribe((discardedCommands) => {
              for (let command of discardedCommands)
                if (carriedCommands.delete(command)) takenBackCommands.push(command);
            })
          : () => {};
      using subscription = {
        [Symbol.dispose]: unsubscribe,
      };
      let daemonState = "reads";
      if (carriedCommands.size > 0) {
        daemonState = await pingDaemon();
        collected = collectPrompts();
        collectDiscarded();
      }
      let blockReason =
        collected.stranded.length > 0
          ? "queued-uncarriable"
          : daemonState !== "reads" && carriedCommands.size > 0
            ? `queued-${daemonState}-service`
            : collected.carriable.length > 0 && !dispatchInfo?.replyOnResume
              ? "queued-fork-idles"
              : undefined;
      if (blockReason !== undefined) {
        let blockedCount =
          blockReason === "queued-uncarriable"
            ? collected.stranded.length
            : blockReason === "queued-fork-idles"
              ? collected.carriable.length
              : carriedCommands.size;
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(blockReason),
          inflight_count: blockedCount,
          inflight_kinds: fromEnumArr(dispatchInfo?.inflightKinds ?? []),
        });
        return cannotOpenAgentsQueuedMessage(blockedCount);
      }
      if (seed && !seed.name && autoJobName) {
        seed.name = autoJobName;
        seed.nameSource = "auto";
      }
      let preloadedChunks = preloadBackgroundChunks();
      let settledSeed = seed
        ? await settleSeedName(seed, storageV5)
        : {
            intent: "",
          };
      let workerName = seed && settledSeed.name !== seed.name ? settledSeed.name : undefined;
      let forkSessionId = randomUUID();
      let currentWorktreeSession = getCurrentWorktreeSession();
      let isNewWorktree = Boolean(currentWorktreeSession && !currentWorktreeSession.enteredExisting);
      let registeredTasks = dispatchInfo?.taskRegistry?.all();
      let backgroundWorkSummary = registeredTasks ? summarizeBackgroundWork(registeredTasks) : undefined;
      let frameLiveSlugs = registeredTasks ? carriedFrameLiveSlugs(registeredTasks) : undefined;
      let hasNothingInFlight = backgroundWorkSummary
        ? backgroundWorkSummary.count - backgroundWorkSummary.carriedMonitors === 0 &&
          backgroundWorkSummary.restartableCount === 0
        : dispatchInfo?.inflightCount === 0 && dispatchInfo?.restartableCount === 0;
      let jobShortId;
      let jobDir;
      try {
        ({ short: jobShortId, jobDir } = await preSeedReplBgJob(
          forkSessionId,
          {
            ...settledSeed,
            cwd: currentWorktreeSession?.worktreePath ?? getOriginalCwd(),
            inFlight: hasNothingInFlight
              ? {
                  tasks: 0,
                  queued: 0,
                  kinds: [],
                }
              : undefined,
            worktree: isNewWorktree
              ? {
                  path: currentWorktreeSession.worktreePath,
                  branch: currentWorktreeSession.worktreeBranch,
                  hookBased: currentWorktreeSession.hookBased ?? false,
                  originCwd: currentWorktreeSession.originalCwd,
                }
              : undefined,
            sessionPermissionRules: (() => {
              let sessionAddDirs_2 = sessionAddDirs(additionalWorkingDirectories);
              return (allowRules.session?.length ?? 0) > 0 ||
                (denyRules.session?.length ?? 0) > 0 ||
                sessionAddDirs_2.length > 0
                ? {
                    allow: [...(allowRules.session ?? [])],
                    deny: [...(denyRules.session ?? [])],
                    ...(sessionAddDirs_2.length > 0 && {
                      addDirs: sessionAddDirs_2,
                    }),
                  }
                : undefined;
            })(),
            memoryToggledOff: getMemoryToggledOff() || undefined,
            autoMemoryOffThisSession: getAutoMemoryOffThisSession() || undefined,
          },
          storageV5,
        ));
      } catch (error) {
        return `Cannot open agents \u2014 ${error instanceof Error ? error.message : String(error)}`;
      }
      didRelaunch = await confirmRelaunch(
        messages,
        "background_handoff",
        {
          responseStreaming: dispatchInfo?.abortAfterFlush !== undefined,
        },
        storageV5,
      );
      let adoptable = null;
      if (dispatchInfo?.taskRegistry)
        adoptable = await serializeAdoptable(dispatchInfo.taskRegistry.all(), messageQueue);
      let undisclosedFrameCount =
        frameLiveSlugs === undefined
          ? 0
          : countWhere(
              adoptable?.payload.frameLive ?? [],
              (frameEntry) => !frameLiveSlugs.has(frameEntry.slug),
            );
      let replBridgeHandle = getReplBridgeHandle();
      let maxPrefillChars = 16384;
      let partialText = dispatchInfo?.partialText?.trimEnd() ?? "";
      let prefillText =
        partialText.length > maxPrefillChars ? partialText.slice(-maxPrefillChars) : partialText;
      let prefill =
        dispatchInfo?.via === "abort-then-fork" &&
        prefillText.length > 0 &&
        !replBridgeHandle &&
        !adoptable?.payload?.agents?.length
          ? {
              text: prefillText,
              boundaryUuid: dispatchInfo?.boundaryUuid,
            }
          : undefined;
      let hasPrefill = false;
      let consentCarryWritten = false;
      let adoptedFrameCount;
      if (adoptable || prefill)
        try {
          await writeAdoptJson(
            jobDir,
            {
              ...(adoptable?.payload ?? {
                writtenAtMs: Date.now(),
                shells: [],
                cron: [],
              }),
              ...(prefill && {
                prefill,
              }),
            },
            {},
            storageV5,
          );
          consentCarryWritten = true;
          hasPrefill = prefill !== undefined;
          if (adoptable && dispatchInfo?.taskRegistry) {
            adoptable.stopCarriedWatches(dispatchInfo.taskRegistry);
            await adoptable.checkpointAgents(dispatchInfo.taskRegistry);
            adoptable.disown(dispatchInfo.taskRegistry);
          }
        } catch (error) {
          adoptedFrameCount = adoptable?.payload.frameLive?.length ?? 0;
          if (adoptedFrameCount > 0 && !consentCarryWritten) {
            logFeatureSad("artifact_live_subscribe", "consent_carry_write_failed");
            adoptedFrameCount = 0;
          }
          logForDebugging(`[adopt] hand-off step failed (written=${consentCarryWritten}): ${error}`, {
            level: "warn",
          });
          adoptable = null;
        }
      let nudgeState = dispatchInfo?.fleetNudgeStore?.recordOpenViaLeft();
      logEvent("tengu_open_agents_via_left", {
        was_empty: seed === null,
        nudge_active: nudgeState !== undefined && nudgeState.needsInput > 0,
        nudge_needs_input_count: nudgeState?.needsInput ?? 0,
        via: fromEnum(dispatchInfo?.via ?? "idle-fork"),
        confirmed_interstitial: dispatchInfo?.confirmedInterstitial ?? false,
        inflight_count: dispatchInfo?.inflightCount ?? 0,
        inflight_kinds: fromEnumArr(dispatchInfo?.inflightKinds ?? []),
        restartable_count: dispatchInfo?.restartableCount ?? 0,
        partial_chars: dispatchInfo?.partialChars ?? 0,
        has_prefill: hasPrefill,
        has_boundary_uuid: hasPrefill && dispatchInfo?.boundaryUuid !== undefined,
        prefill_truncated: partialText.length > maxPrefillChars,
        defer_wait_ms: dispatchInfo?.deferWaitMs ?? 0,
        defer_cap_fired: dispatchInfo?.deferCapFired ?? false,
        ...adoptedCounts(adoptable?.payload),
        ...(adoptedFrameCount !== undefined && {
          adopted_frame_live: adoptedFrameCount,
        }),
        undisclosed_frame_live: adoptedFrameCount === 0 ? 0 : undisclosedFrameCount,
      });
      if (replBridgeHandle) {
        let flushCapMs = dispatchInfo?.replyOnResume ? 5000 : 2000;
        await withTimeout(replBridgeHandle.flush(), flushCapMs, "bridge flush").catch(() => {
          logEvent("tengu_bg_bridge_flush_truncated", {
            via: fromEnum(dispatchInfo?.via ?? "idle-fork"),
            cap_ms: flushCapMs,
          });
        });
        replBridgeHandle.teardown({
          skipArchive: true,
        });
      }
      if (dispatchInfo?.abortAfterFlush)
        await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
      let carryCapMs = 2000;
      let abortController = new AbortController();
      await withTimeout(
        carryTaskListToFork(forkSessionId, abortController.signal, storageV5),
        carryCapMs,
        "task-list carry",
      ).catch(() => abortController.abort());
      unsubscribe();
      let stillQueued = new Set(messageQueue.getCommandQueue());
      let recollected = collectPrompts([...carriedCommands].filter((command) => !stillQueued.has(command)));
      carriedCommands.clear();
      let carriable = dispatchInfo?.replyOnResume ? recollected.carriable : [];
      let droppedPrompts = dispatchInfo?.replyOnResume
        ? recollected.stranded
        : [...recollected.carriable, ...recollected.stranded];
      let beingRead = dispatchInfo?.replyOnResume ? recollected.beingRead : [];
      let perhapsDeliveredCount = recollected.leftEarlier.length + beingRead.length;
      let recordPrompts = (prompts) =>
        recordSubmittedPrompts(
          prompts.map((prompt) =>
            prompt.historyEntry || !isQueuedCommandEditable(prompt)
              ? prompt
              : {
                  ...prompt,
                  historyEntry: {
                    display: restoreTextForPop(prompt),
                    pastedContents: prompt.pastedContents ?? {},
                  },
                },
          ),
          storageV5,
          {
            armUndo: false,
            placed: withExpandedPastes,
            unanswered: "typed",
          },
        );
      if (
        carriable.length > 0 ||
        droppedPrompts.length > 0 ||
        perhapsDeliveredCount > 0 ||
        takenBackCommands.length > 0
      ) {
        let keptSet = new Set([...carriable, ...beingRead, ...droppedPrompts]);
        recordPrompts(
          messageQueue
            .getCommandQueue()
            .filter((command) => keptSet.has(command))
            .concat(takenBackCommands),
        );
        for (let command of beingRead) command.historyEntry = undefined;
        for (let cleanup of [
          () =>
            messageQueue.remove(droppedPrompts, {
              reason: "not_carried_to_background",
            }),
          () =>
            messageQueue.consume([...carriable, ...beingRead], {
              reason: "carried_to_background",
            }),
        ])
          try {
            cleanup();
          } catch (error) {
            logError(error);
          }
        let written =
          carriable.length + perhapsDeliveredCount > 0
            ? await withTimeout(
                writeCarriedPrompts(jobDir, recollected.fileContents),
                2000,
                "carried prompts write",
              ).then(
                () => true,
                (error) => {
                  logForDebugging(`[carried-prompts] write failed: ${error}`, {
                    level: "warn",
                  });
                  return false;
                },
              )
            : undefined;
        logEvent("tengu_left_arrow_prompts_carried", {
          via: fromEnum(dispatchInfo?.via ?? "idle-fork"),
          count: carriable.length,
          written,
          dropped: droppedPrompts.length,
          perhaps_delivered: perhapsDeliveredCount,
          taken_back: takenBackCommands.length,
        });
        takenBackCommands.length = 0;
      }
      let dropLateQueued = (turnOutcome) => {
        try {
          let lateQueued = carriesQueued ? messageQueue.getCommandQueue().filter(isHumanPromptCommand) : [];
          if (lateQueued.length > 0) {
            recordPrompts(lateQueued);
            messageQueue.remove(lateQueued, {
              reason: "not_carried_to_background",
            });
            logForDebugging(
              `[carried-prompts] ${lateQueued.length} ${plural(lateQueued.length, "message")} still queued when \u2190 closed this screen: not sent, typed text is in \u2191 history`,
              {
                level: "warn",
              },
            );
          }
          if (turnOutcome.cutLive || turnOutcome.timedOut || lateQueued.length > 0)
            logEvent("tengu_left_arrow_cut_or_dropped", {
              via: fromEnum(dispatchInfo?.via ?? "idle-fork"),
              turn_cut: turnOutcome.cutLive,
              turn_state: fromEnum(turnOutcome.guard),
              wait_timed_out: turnOutcome.timedOut,
              late_dropped: lateQueued.length,
            });
        } catch (error) {
          logError(error);
        }
      };
      let spawnState = {
        settled: false,
        ok: false,
        forkSessionId,
      };
      trackBgDispatch(
        jobShortId,
        spawnBackgroundFork(
          settledSeed,
          null,
          effortLevel,
          permissionMode,
          additionalWorkingDirectories,
          allowRules,
          denyRules,
          "left_arrow",
          messages,
          {
            proactivityLevel: dispatchInfo?.proactivityLevel,
            providedSessionId: forkSessionId,
            replyOnResume: dispatchInfo?.replyOnResume,
            handoffRecord,
            isTurnLive: dispatchInfo?.abortAfterFlush !== undefined,
            workerName,
            storageV5,
            credentials,
            extraEnv: attachCarriedPromptHash(
              jobDir,
              buildBridgeReattachEnv(
                replBridgeHandle?.bridgeSessionId,
                replBridgeHandle?.getLastSequenceNum(),
                replBridgeHandle?.outboundOnly,
                replBridgeHandle?.sessionGroupingId,
                resolveBridgeHandoffIdentity(replBridgeHandle, getCurrentSessionBridge()),
              ),
            ),
          },
        ).then(async (backgroundFork) => {
          if (backgroundFork.ok || !backgroundFork.queued) dropCarriedPromptHash(jobDir);
          if (!backgroundFork.ok && !backgroundFork.queued && !backgroundFork.alive) {
            adoptable?.abandon();
            if (carriable.length + perhapsDeliveredCount > 0)
              logEvent("tengu_left_arrow_carried_prompts_lost", {
                count: carriable.length,
                perhaps_delivered: perhapsDeliveredCount,
              });
            await removeJobScope(jobDir, jobShortId, storageV5);
          }
          return backgroundFork;
        }),
      )
        .then((spawnResult) => {
          spawnState.settled = true;
          let spawnedOk = spawnResult.ok || spawnResult.alive === true;
          spawnState.ok = spawnedOk;
          spawnState.transcriptMaterialized = spawnedOk || spawnResult.queued === true;
          if (!spawnedOk && !spawnResult.queued) clearSessionParked(storageV5).catch(() => {});
          if (!spawnResult.ok) {
            if (spawnResult.queued && adoptable) {
              let adoptJsonPath = join(jobDir, "adopt.json");
              let expireAdoptRecord = () =>
                markExpired(adoptJsonPath).then(
                  () => {
                    adoptable?.abandon();
                    return removeExpired(adoptJsonPath);
                  },
                  () => {},
                );
              let max = Math.max(0, STALE_THRESHOLD_MS - 5000 - (Date.now() - adoptable.payload.writtenAtMs));
              let unregisterCleanup = registerCleanup(expireAdoptRecord);
              setTimeout(
                (unregister, expire) => {
                  unregister();
                  expire();
                },
                max,
                unregisterCleanup,
                expireAdoptRecord,
              ).unref();
            }
            if (
              spawnResult.reason === undefined ||
              spawnResult.reason === "spawn_failed_unknown" ||
              spawnResult.reason.startsWith("spawn_failed_ERR_")
            )
              logError(
                withTelemetryMessage(
                  Error(`background spawn failed: ${spawnResult.error}`),
                  `background spawn failed: ${spawnResult.reason ?? "unclassified"}`,
                ),
              );
            else
              logForDebugging(`background spawn failed: ${spawnResult.error}`, {
                level: "warn",
              });
          }
        })
        .catch((error) => {
          if (!spawnState.settled) {
            spawnState.settled = true;
            spawnState.ok = false;
          }
          logError(error);
        });
      dispatchInfo?.abortAfterFlush?.abort(userAbortReason("background"));
      if (dispatchInfo?.sessionScratch) {
        clearPendingGoalIdleCheckin(dispatchInfo.sessionScratch);
        clearPendingGoalReprompt(dispatchInfo.sessionScratch);
        disarmWorkerCheckin(dispatchInfo.sessionScratch);
      }
      messageQueue.removeByFilter(isCheckinNotification);
      forgetMainChainOnHandOff();
      markSessionParked(jobShortId, storageV5).catch(() => {});
      let dispatchDefaults = demoteInheritedPermissionMode(permissionMode);
      let dispatchExtraArgs = earlyArgsArgv(additionalWorkingDirectories);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_leftarrow_inprocess", true)) {
        let savedPermissionMode = noopSyncPermissionMode();
        let sessionId = getSessionId();
        noopMergeSessionFlags(undefined);
        try {
          return await detachToBackground(jobShortId, preloadedChunks, {
            dispatchDefaults,
            dispatchExtraArgs,
            ...(dispatchInfo?.autoOpenJobId !== undefined && {
              autoOpenJobId: dispatchInfo.autoOpenJobId,
            }),
            originSpawn: spawnState,
            storageV5,
            credentials,
            fleetNudgeStore: dispatchInfo?.fleetNudgeStore,
            ...(dispatchInfo?.abortLiveTurn && {
              abortLiveTurn: dispatchInfo.abortLiveTurn,
              dropLateQueued,
            }),
          });
        } catch (error) {
          if (getSessionId() === sessionId) noopMergeSessionFlags(savedPermissionMode);
          logError(error);
        }
      }
      let relaunchResult = await relaunchClaudeCode({
        args: ["agents", ...dispatchExtraArgs, ...buildDispatchArgs(dispatchDefaults)],
        env: {
          CLAUDE_AGENTS_SELECT:
            dispatchInfo?.autoOpenJobId !== undefined && SHORT_RE.test(dispatchInfo.autoOpenJobId)
              ? dispatchInfo.autoOpenJobId
              : jobShortId,
          ...getScreenReaderEnv(),
          ...(isRestrictedSession() && {
            CLAUDE_CODE_RESTRICTED: "1",
          }),
        },
      });
      clearSessionParked(storageV5).catch(() => {});
      return relaunchResult;
    })();
    return withRelaunchHint(handoffResult, didRelaunch);
  } catch (error) {
    logError(error);
    clearSessionParked(storageV5).catch(() => {});
    return withRelaunchHint("Couldn't background this session (an internal error was logged)", didRelaunch);
  }
}
//@ chunk-czq1j3j2.js:95190-95212 placement
var BACKGROUND_GESTURE_HOLD_MS = 1000;
var BACKGROUND_GESTURE_DOUBLE_MS = 1000;
//@ chunk-czq1j3j2.js:95212-107954 placement
/**
 * 后台手势控制器（←/后台化）：处理“按 ← 打开 agents / 移到后台”的两段式手势、上限计时、对已停止回合的取消，以及各种不能后台化的原因提示。
 */
class BackgroundGesture {
  #e;
  #t = null;
  #o = null;
  #n = null;
  #r = null;
  #s = false;
  #l = createStore(false);
  #i = undefined;
  #a = false;
  #c = undefined;
  #d = undefined;
  #u = 0;
  constructor(options) {
    this.#e = options;
  }
  bindHost(host) {
    this.#t = host;
  }
  #p() {
    if (this.#t === null) throw Error("BackgroundGesture: used before its screen bound a host");
    return this.#t;
  }
  get pending() {
    return this.#n;
  }
  clearPending() {
    this.#n?.clearCapTimer();
    this.#n = null;
  }
  cancelPendingForStoppedTurn() {
    if (this.#n === null) return;
    this.clearPending();
    try {
      this.#y(TURN_STOPPED_BLOCK);
    } catch (error) {
      logError(error);
    }
  }
  stopsLoopForPending() {
    let pending = this.#n;
    try {
      if (
        pending !== null &&
        this.#e.getInputValue().trim() !== "" &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_sloth", true)
      ) {
        this.clearPending();
        this.#y(UNSENT_INPUT_BLOCK);
        logEvent("tengu_defer_boundary_cancelled_draft", {
          site: lit_2("loop_top"),
          wait_ms: this.#e.now() - pending.armedAtMs,
        });
      }
    } catch (error) {
      logError(error);
    }
    return this.#n !== null;
  }
  markForkInFlight() {
    this.#s = true;
  }
  markIdleForkMidTurn() {
    let snapshot = this.#e.transcript.getSnapshot();
    let last = snapshot.at(-1);
    this.#r = last
      ? {
          length: snapshot.length,
          uuid: last.uuid,
        }
      : null;
  }
  isParkInFlight = () => this.#s || this.#n !== null || this.#o !== null;
  handOverInFlight = this.#l;
  onBgDetach = () => {
    if (alwaysFalseBackgroundConfirm()) return;
    this.#m();
  };
  #m(input) {
    let message = noopBackgroundConfirm(input);
    if (input !== undefined && message === undefined) return false;
    let nowMs = this.#e.now();
    if (nowMs - this.#u < BACKGROUND_GESTURE_DOUBLE_MS && getAttachStampMs() <= this.#u) return false;
    this.#u = nowMs;
    sendDetachRequest({
      message,
    });
    return true;
  }
  requestAttach(sessionId) {
    return !CLOUD_SESSION_ID_RE.test(sessionId) && this.#f(sessionId);
  }
  requestCloudTab(sessionId) {
    return CLOUD_SESSION_ID_RE.test(sessionId) && this.#f(sessionId);
  }
  #f(target) {
    if (alwaysFalseBackgroundConfirm()) return this.#m(parseSwitchTarget(target));
    if (this.#c !== undefined || isBgSession() || this.#S()) return false;
    this.#c = target;
    let flushAttach = () => {
      queueMicrotask(() => {
        let heldTarget = this.#c;
        this.#c = undefined;
        if (heldTarget !== undefined) this.onAttachRequest(heldTarget);
      });
    };
    let { guard } = this.#e.turn;
    if (!guard.isActive || guard.isRunning) {
      flushAttach();
      return true;
    }
    let unsubscribe = guard.subscribe(() => {
      if (!guard.isActive) this.#d?.fire();
    });
    this.#d = {
      release: unsubscribe,
      fire: () => {
        unsubscribe();
        this.#d = undefined;
        flushAttach();
      },
    };
    return true;
  }
  markQueryLoopStarted() {
    this.#d?.fire();
  }
  cancelHeldAttach() {
    if (this.#d === undefined) return;
    this.#d.release();
    this.#d = undefined;
    this.#c = undefined;
  }
  #S() {
    if (getBgTakeover() !== null) return true;
    let workSummary = summarizeBackgroundWork(this.#e.store.getState().tasks);
    let eligibility = backgroundEligibilityForSession({
      isBg: false,
      isLoading: false,
      isExternalLoading: false,
      betweenCalls: true,
      inFlight: workSummary,
    });
    if (!needsDetachBeforeBackground(eligibility)) {
      if (!eligibility.ok)
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(eligibility.reason),
          inflight_count: workSummary.count,
          inflight_kinds: fromEnumArr(workSummary.kinds),
        });
      return true;
    }
    return this.#h(workSummary);
  }
  #h(workSummary) {
    let { store, transcript, turn, messageQueue, getInputValue } = this.#e;
    if (isTranscriptPersistenceDisabled()) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("persistence"),
        inflight_count: workSummary.count,
        inflight_kinds: fromEnumArr(workSummary.kinds),
      });
      this.#y(
        "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded.",
      );
      return true;
    }
    if (getProjectConfigRoot() !== null) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("project-config-root"),
        inflight_count: workSummary.count,
        inflight_kinds: fromEnumArr(workSummary.kinds),
      });
      this.#y(
        "Can't move this session to the background. It was started with --project-config-root. A background copy would not get that flag, so it would run the hooks and settings in the working folder. Keep working in this session.",
      );
      return true;
    }
    if (isAccepted() && isCodeModeEnabled()) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("repl-mode"),
        inflight_count: workSummary.count,
        inflight_kinds: fromEnumArr(workSummary.kinds),
      });
      this.#y(codeModeBackgroundNotice());
      return true;
    }
    if (store.getState().endedByModel) {
      this.#y(withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue."));
      return true;
    }
    let heldCommandCount = countHeldQueuedCommands(
      messageQueue.getCommandQueue(),
      createHeldScreeningCheck(() =>
        turn.buildToolUseContext(
          transcript.getSnapshot(),
          [],
          new AbortController(),
          this.#p().mainLoopModel,
        ),
      ),
    );
    if (heldCommandCount > 0) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("queued-commands"),
        inflight_count: heldCommandCount,
        inflight_kinds: fromEnumArr(workSummary.kinds),
      });
      this.#y(
        `Cannot open agents \u2014 ${heldCommandCount} queued ${plural(heldCommandCount, "command")} would be lost. Run or clear ${heldCommandCount === 1 ? "it" : "them"} first.`,
      );
      return true;
    }
    if (getInputValue().trim() !== "") {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("draft"),
        inflight_count: workSummary.count,
        inflight_kinds: fromEnumArr(workSummary.kinds),
      });
      this.#y(
        "Cannot open agents \u2014 you have unsent text in the input. Send it or clear it first (double-tap esc clears).",
      );
      return true;
    }
    return false;
  }
  #y = (text) => {
    this.#e.transcript.replace((messages) => {
      let last = messages.at(-1);
      if (last?.type === "system" && last.subtype === "informational" && last.content === text)
        return messages;
      return [...messages, createSystemMessage(text, "warning")];
    });
  };
  get isAttachPending() {
    return this.#c !== undefined;
  }
  onAttachRequest(tabId) {
    if (isBgSession()) return;
    this.#i = tabId;
    this.#a = true;
    this.onLeftArrow();
  }
  confirm = () => {
    let pendingConfirm = this.#o;
    if (pendingConfirm === null) return;
    logEvent("tengu_left_arrow_confirm", {
      accepted: true,
      count: pendingConfirm.inFlight.count,
      kinds: fromEnumArr(pendingConfirm.inFlight.kinds),
      carryover_count: pendingConfirm.carryOverCount,
      workflow_agent_count: pendingConfirm.workflowAgents.running,
    });
    try {
      pendingConfirm.proceed();
    } finally {
      this.#o = null;
    }
  };
  cancelConfirm = () => {
    let pendingConfirm = this.#o;
    if (pendingConfirm === null) return;
    logEvent("tengu_left_arrow_confirm", {
      accepted: false,
      count: pendingConfirm.inFlight.count,
      kinds: fromEnumArr(pendingConfirm.inFlight.kinds),
      carryover_count: pendingConfirm.carryOverCount,
      workflow_agent_count: pendingConfirm.workflowAgents.running,
    });
    this.#o = null;
    this.#i = undefined;
  };
  get leaveEndsProcess() {
    return this.#e.leaveEndsProcess;
  }
  cloudSessionRoute() {
    return;
  }
  #b(message, fallbackMessage) {
    if (isCannotOpenAgentsMessage(message) || !isBridgeOrTransport(this.#e.session)) return message;
    logForDebugging(
      `leftArrowGesture: \u2190 failed; withheld from the screen because rows may be stored off this machine: ${message}`,
      {
        level: "warn",
      },
    );
    return withResumeFlag(fallbackMessage, message);
  }
  #g(request) {
    let {
      store,
      transcript,
      turn,
      messageQueue,
      session,
      taskRegistry,
      fleetNudgeStore,
      storageV5,
      credentials,
      titles,
    } = this.#e;
    let { agentTitle, haikuTitle } = titles.getSnapshot();
    this.#s = true;
    let context = store.getState();
    let { sessionEffort, toolPermissionContext } = context;
    let autoOpenJobId = this.#i;
    this.#i = undefined;
    let abortController = request.via === "defer-then-fork" ? turn.abortController : null;
    let abortLiveTurn = async () => {
      let abortController_2 = turn.abortController;
      let cutLive =
        abortController_2 !== null &&
        !abortController_2.signal.aborted &&
        abortController_2 !== abortController;
      let guard = !turn.guard.isActive ? "idle" : turn.guard.isRunning ? "running" : "dispatching";
      abortController_2?.abort(userAbortReason("background"));
      let idleReached = await waitForStoreState(
        {
          getState: () => turn.guard,
          subscribe: (listener) => turn.guard.subscribe(listener),
        },
        (guardState) => !guardState.isActive || guardState.isRunning,
        {
          timeoutMs: 2000,
        },
      );
      return {
        cutLive,
        guard,
        timedOut: !idleReached,
      };
    };
    let agentsViaLeftArrow = openAgentsViaLeftArrow(
      transcript.getSnapshot(),
      sessionEffort,
      getPermissionModeCycle(context),
      toolPermissionContext.additionalWorkingDirectories,
      toolPermissionContext.alwaysAllowRules,
      toolPermissionContext.alwaysDenyRules,
      messageQueue,
      agentTitle ?? haikuTitle,
      {
        ...request,
        proactivityLevel: promptProactivityLevel(context),
        taskRegistry,
        ...(autoOpenJobId !== undefined && {
          autoOpenJobId,
        }),
        fleetNudgeStore,
        sessionScratch: session.sessionScratch,
        ...(isLeftArrowCarriesQueuedOn() && {
          abortLiveTurn,
        }),
      },
      storageV5,
      credentials,
    );
    if (isLeftArrowCarriesQueuedOn()) {
      let clearHandingOver = () => this.#l.setState(() => false);
      agentsViaLeftArrow.then(clearHandingOver, clearHandingOver);
      this.#l.setState(() => true);
    }
    return agentsViaLeftArrow;
  }
  onLeftArrow = (confirmGapMs) => {
    let { store, transcript, turn, messageQueue, clock, now, getInputValue, dialogStore } = this.#e;
    let guard = turn.guard;
    let fromAttachRequest = this.#a;
    if (this.#a) this.#a = false;
    else this.#i = undefined;
    {
      if (this.#s || this.#o !== null) return;
      let { tasks } = store.getState();
      let workSummary = summarizeBackgroundWork(tasks);
      let adoptability = computeAdoptability(tasks);
      let carriedSlugsAtPress = carriedFrameLiveSlugs(tasks);
      let showNotice = this.#y;
      if (this.#h(workSummary)) return;
      let withholdMessage = (message) =>
        this.#b(message, "Couldn't open the agents view (detail withheld on this connection).");
      let onHandoffDone = (result) => {
        this.#s = false;
        showNotice(withholdMessage(result));
      };
      if (this.#n) {
        let pending = this.#n;
        let nowMs = now();
        let elapsedMs = nowMs - pending.absorbAnchorMs;
        let isHumanCadence = !fromAttachRequest && nowMs - pending.lastPressMs < HUMAN_CADENCE_MS;
        if (isHumanCadence) pending.absorbAnchorMs = nowMs;
        pending.lastPressMs = nowMs;
        let answeredHint = confirmGapMs !== undefined && confirmGapMs < BACKGROUND_GESTURE_HOLD_MS;
        if (answeredHint)
          logForDebugging(
            `leftArrowGesture: \u2190 answered the hint with a defer pending, still waiting for the tool (confirm_gap_ms=${confirmGapMs})`,
            {
              level: "debug",
            },
          );
        if (elapsedMs < BACKGROUND_GESTURE_HOLD_MS || isHumanCadence || answeredHint) return;
        pending.absorbAnchorMs = nowMs;
        let abortController = turn.abortController;
        let streamingText = turn.stream.peekStreamingText();
        let partialChars = (streamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot());
        let partialText = streamingTextSoFar(transcript.getSnapshot(), streamingText);
        let boundaryUuid = lastSettledMessageUuid(transcript.getSnapshot());
        let abandonableCount = countAbandonable(tasks);
        if (!pending.confirmedInterstitial && abandonableCount > 0) {
          showNotice(
            `Still backgrounding after the current tool \u2014 ${abandonableCount} background ${plural(abandonableCount, "task")} would be abandoned by skipping ahead.`,
          );
          return;
        }
        let carriedSincePress = countCarriedSince(tasks, pending.carriedAtPress);
        if (carriedSincePress > 0) {
          this.clearPending();
          showNotice(
            `Backgrounding cancelled \u2014 ${carriedSincePress} Artifact comment ${plural(carriedSincePress, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
          );
          return;
        }
        if (abortController && !abortController.signal.aborted && guard.isActive) {
          this.clearPending();
          this.#g({
            via: "abort-then-fork",
            replyOnResume: true,
            confirmedInterstitial: pending.confirmedInterstitial,
            inflightCount: workSummary.count,
            inflightKinds: workSummary.kinds,
            restartableCount: workSummary.restartableCount,
            partialChars,
            partialText,
            boundaryUuid,
            deferWaitMs: now() - pending.armedAtMs,
            abortAfterFlush: abortController,
          }).then(onHandoffDone);
        } else if (!guard.isActive) {
          this.clearPending();
          pending.proceed().then((notice) => showNotice(notice));
        }
        return;
      }
      let eligibility = backgroundEligibilityForSession({
        isBg: false,
        isLoading: guard.isActive,
        isExternalLoading: turn.isExternalLoading,
        betweenCalls: isIdleForBackground(transcript.getSnapshot(), turn.stream.peekStreamingText() !== null),
        inFlight: workSummary,
      });
      if (!eligibility.ok) {
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(eligibility.reason),
          inflight_count: eligibility.inFlight.count,
          inflight_kinds: fromEnumArr(eligibility.inFlight.kinds),
        });
        return;
      }
      let proceedHandoff = (confirmedInterstitial) => {
        let workSummary = summarizeBackgroundWork(store.getState().tasks);
        let streamingText = turn.stream.peekStreamingText();
        let partialChars = (streamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot());
        let partialText = streamingTextSoFar(transcript.getSnapshot(), streamingText);
        let boundaryUuid = lastSettledMessageUuid(transcript.getSnapshot());
        let eligibility = backgroundEligibilityForSession({
          isBg: false,
          isLoading: guard.isActive,
          isExternalLoading: turn.isExternalLoading,
          betweenCalls: isIdleForBackground(
            transcript.getSnapshot(),
            turn.stream.peekStreamingText() !== null,
          ),
          inFlight: workSummary,
        });
        if (!eligibility.ok) {
          logEvent("tengu_left_arrow_blocked", {
            reason: fromEnum(eligibility.reason),
            inflight_count: workSummary.count,
            inflight_kinds: fromEnumArr(workSummary.kinds),
          });
          showNotice("Cannot open agents \u2014 a foregrounded task is running.");
          return;
        }
        let carriedSincePress = countCarriedSince(store.getState().tasks, carriedSlugsAtPress);
        if (carriedSincePress > 0) {
          showNotice(
            `Backgrounding cancelled \u2014 ${carriedSincePress} Artifact comment ${plural(carriedSincePress, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
          );
          return;
        }
        let abortController = turn.abortController;
        let via =
          eligibility.via === "abort-then-fork" && !abortController ? "defer-then-fork" : eligibility.via;
        let request = {
          via,
          confirmedInterstitial,
          inflightCount: workSummary.count,
          inflightKinds: workSummary.kinds,
          restartableCount: workSummary.restartableCount,
          partialChars,
          deferWaitMs: 0,
        };
        if (via === "defer-then-fork") {
          let armedAtMs = now();
          let deferCapMs = getFeatureValue_CACHED_MAY_BE_STALE("tengu_defer_cap_ms", 1e4) ?? 1e4;
          let clearCapTimer = clock.setTimeout(() => {
            let pendingAtFire = this.#n;
            if (!pendingAtFire || pendingAtFire.armedAtMs !== armedAtMs) return;
            let tasks = store.getState().tasks;
            let queuedCount = countWhere(
              messageQueue.getCommandQueue(),
              (command) => !isCheckinNotification(command),
            );
            if (
              queuedCount > 0 ||
              (!pendingAtFire.confirmedInterstitial && countAbandonable(tasks) > 0) ||
              countCarriedSince(tasks, pendingAtFire.carriedAtPress) > 0
            ) {
              if (queuedCount > 0)
                logEvent("tengu_defer_cap_refused_queued", {
                  queue_len: queuedCount,
                  wait_ms: now() - armedAtMs,
                });
              return;
            }
            let workSummary = summarizeBackgroundWork(tasks);
            let restartableCount = workSummary.restartableCount;
            if (restartableCount > 0) {
              logEvent("tengu_defer_cap_refused_restartable", {
                restartable_count: restartableCount,
                wait_ms: now() - armedAtMs,
              });
              showNotice(waitingForSubagentsMessage(restartableCount));
              return;
            }
            let abortController = turn.abortController;
            if (abortController && !abortController.signal.aborted && guard.isActive) {
              if (getInputValue().trim() !== "") {
                logEvent("tengu_defer_cap_cancelled_draft", {
                  wait_ms: now() - armedAtMs,
                });
                this.clearPending();
                showNotice(UNSENT_INPUT_BLOCK);
                return;
              }
              if (topBlockingDialog(dialogStore.getState()) !== null) {
                logEvent("tengu_defer_cap_refused_ask", {
                  wait_ms: now() - armedAtMs,
                });
                showNotice(WAITING_FOR_ANSWER_MESSAGE);
                return;
              }
              let streamingText = turn.stream.peekStreamingText();
              this.#n = null;
              this.#g({
                via: "abort-then-fork",
                replyOnResume: true,
                confirmedInterstitial: pendingAtFire.confirmedInterstitial,
                inflightCount: workSummary.count,
                inflightKinds: workSummary.kinds,
                restartableCount: workSummary.restartableCount,
                partialChars: (streamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot()),
                partialText: streamingTextSoFar(transcript.getSnapshot(), streamingText),
                boundaryUuid: lastSettledMessageUuid(transcript.getSnapshot()),
                deferWaitMs: now() - armedAtMs,
                deferCapFired: true,
                abortAfterFlush: abortController,
              }).then(onHandoffDone);
            }
          }, deferCapMs);
          this.#n = {
            confirmedInterstitial,
            armedAtMs,
            absorbAnchorMs: armedAtMs,
            lastPressMs: armedAtMs,
            clearCapTimer,
            carriedAtPress: carriedSlugsAtPress,
            proceed: () =>
              this.#g({
                ...request,
                replyOnResume: true,
                deferWaitMs: now() - armedAtMs,
              }).then((result) => {
                this.#s = false;
                return withholdMessage(result);
              }),
          };
          showNotice("Backgrounding after the current tool finishes\u2026");
          return;
        }
        if (via === "abort-then-fork") {
          this.#g({
            ...request,
            replyOnResume: true,
            partialText,
            boundaryUuid,
            abortAfterFlush: abortController ?? undefined,
          }).then(onHandoffDone);
          return;
        }
        this.#g({
          ...request,
          replyOnResume: isAtResumePoint(this.#r, transcript.getSnapshot()),
        }).then(onHandoffDone);
      };
      if (leftArrowNeedsInterstitial(tasks, adoptability)) {
        let relevantTasks = import_reject(
          tasks,
          (task) => isAdoptableTask(task, adoptability) || isCarriedFrameLiveWatch(task),
        );
        let summary = backgroundWorkSummary(relevantTasks, {
          cronFilter: (cron) => !isAdoptableCron(cron, adoptability),
        }).summary;
        let confirmedInterstitial = summary !== "";
        let size = carriedSlugsAtPress.size;
        let carryOverCount = countAdoptable(tasks, adoptability) - size;
        let workflowAgents = countLiveWorkflowAgents(tasks, adoptability);
        this.#o = {
          inFlight: workSummary,
          carryOverCount,
          workflowAgents,
          proceed: () => proceedHandoff(confirmedInterstitial),
        };
        this.#e
          .requestDialog(LEFT_ARROW_CONFIRM_DIALOG, {
            summary,
            carryOverCount,
            monitorParkCount: size,
            workflowAgents,
          })
          .then((answer) => {
            switch (answer) {
              case "confirm":
                this.confirm();
                return;
              case "stay":
                this.cancelConfirm();
                return;
              case "cancelled":
                this.#o = null;
                this.#i = undefined;
                return;
            }
          })
          .catch(logError);
        return;
      }
      proceedHandoff(false);
    }
  };
  backgroundQuery = () => {
    let { store, setAppState, transcript, turn, messageQueue, taskRegistry, scope, titles } = this.#e;
    let { mainLoopModel, customSystemPrompt, appendSystemPrompt, canUseTool, fallbackModel } = this.#p();
    let { terminalTitle } = titles.getSnapshot();
    let { mainThreadAgentDefinition } = scope;
    let { toolPermissionContext } = store.getState();
    turn.abortController?.abort(userAbortReason("background"));
    let pendingCommands = messageQueue.removeByFilter(
      (queuedCommands) => processQueuedCommands_4(queuedCommands) && !isSlashCommand_2(queuedCommands),
    );
    (async () => {
      let toolUseContext = turn.buildToolUseContext(
        transcript.getSnapshot(),
        [],
        new AbortController(),
        mainLoopModel,
      );
      let [systemPrompt, userContext, cachedSystemContext] = await Promise.all([
        getSystemPrompt(
          toolUseContext.options.tools,
          getRuntimeMainLoopModel({
            permissionMode: toolPermissionContext.mode,
            mainLoopModel,
          }),
        ),
        getOrBuildUserContext(toolUseContext.session, toolUseContext.storageV5, toolUseContext.credentials),
        getCachedSystemContext(toolUseContext.session, toolUseContext.options.cacheBreakerPhrase),
      ]);
      let systemPromptText = effectiveSystemPromptText({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt,
        defaultSystemPrompt: systemPrompt,
        appendSystemPrompt,
      });
      toolUseContext.renderedSystemPrompt = systemPromptText;
      let mapped = (
        await getQueuedCommandAttachments(pendingCommands, imageLimitsForModel(mainLoopModel)).catch(() => [])
      ).map((attachment) => createAttachmentMessage(attachment));
      let seenPrompts = new Set();
      let stripTags = (prompt) => prompt.replace(regExp_4_2, "");
      for (let message of transcript.getSnapshot())
        if (
          message.type === "attachment" &&
          message.attachment.type === "queued_command" &&
          message.attachment.commandMode === "task-notification" &&
          typeof message.attachment.prompt === "string"
        )
          seenPrompts.add(stripTags(message.attachment.prompt));
      let filtered = mapped.filter(
        (message) =>
          message.attachment.type === "queued_command" &&
          (typeof message.attachment.prompt !== "string" ||
            !seenPrompts.has(stripTags(message.attachment.prompt))),
      );
      let stickyBetas = cloneStickyBetaLatches(getStickyBetas());
      toolUseContext.stickyBetas = stickyBetas;
      toolUseContext.onRetryStatus = undefined;
      startBackgroundSession({
        messages: [...transcript.getSnapshot(), ...filtered],
        queryParams: {
          systemPrompt: systemPromptText,
          userContext,
          systemContext: cachedSystemContext,
          canUseTool,
          toolUseContext,
          querySource: getQuerySourceForREPL(),
          fallbackModel,
          stickyBetas,
        },
        description: terminalTitle,
        taskRegistry,
        agentDefinition: mainThreadAgentDefinition,
        setAppState,
      });
    })().catch(logError);
  };
  dispose() {
    this.clearPending();
    this.cancelHeldAttach();
    this.#c = undefined;
  }
}
//@ chunk-czq1j3j2.js:107954-108462 placement
function leftArrowHintText(
  gesture,
  { onDetachToCaller, isLoading, isExternalLoading, betweenCalls, leftArrowOpensAgents, tabsStandIn },
) {
  if (onDetachToCaller) {
    if (gesture.leaveEndsProcess) return;
    return {
      handler: onDetachToCaller,
      confirmHint: "Press \u2190 again to go back",
    };
  }
  {
    if (tabsStandIn) return;
    let eligibility = backgroundEligibilityForSession({
      isBg: isBgSession(),
      isLoading,
      isExternalLoading,
      betweenCalls,
      inFlight: {
        count: 0,
        kinds: [],
      },
    });
    if (eligibility.ok && eligibility.via === "detach")
      return {
        handler: gesture.onBgDetach,
        confirmHint: LEFT_ARROW_BACK_HINT,
      };
    if (needsDetachBeforeBackground(eligibility) && leftArrowOpensAgents)
      return {
        handler: gesture.onLeftArrow,
        confirmHint: "Press \u2190 again to open agents",
      };
  }
  return;
}
//@ chunk-czq1j3j2.js:108462-108466 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:108462", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:108466-108470 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:108466", () => {
  init_react_production();
});
export { BackgroundGesture, leftArrowHintText };
