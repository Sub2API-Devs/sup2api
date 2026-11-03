/**
 * screens/repl/BackgroundGesture.ts
 *
 * 2.1.316 新增。REPL 控制器：转入后台的手势处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 16
 */
import { writeSync } from "fs";
import { join } from "path";
import { rm, rename, unlink } from "fs/promises";
import { randomUUID } from "crypto";
import { disposeLiveState, resetNoticeBudgets } from "../../services/liveReplica/liveReplica.js";
import { teardownFrameLiveForProcessHandoff } from "../../services/artifacts/frameLive.js";
import {
  removeQueuedByFilter,
  isPassiveMainAgentCommand,
  commandsDiscardedSignal,
  isRefillableInput,
  inputDisplayText,
  isCheckinNotification,
  processQueuedCommands as processQueuedCommands_3,
  isSlashCommand_2,
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
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { count } from "../../utils/collections.js";
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
import { string, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createStore } from "../../state/store.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { createSystemMessage, regExp_4 as regExp_4_2 } from "../../utils/messages.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { waitForStoreState } from "../../context/voice.js";
import { getPermissionModeCycle } from "../../utils/permissions/permissions.js";
import { promptProactivityLevel } from "../../utils/proactivityLevel.js";
import { HUMAN_CADENCE_MS, LEFT_ARROW_BACK_HINT } from "../../hooks/useTextInput.js";
import { topBlockingDialog, LEFT_ARROW_CONFIRM_DIALOG } from "../replDialogState.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import { getQueuedCommandAttachments } from "../../utils/attachments.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { cloneStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { startBackgroundSession } from "../../tasks/LocalMainSessionTask.js";
import { getQuerySourceForREPL } from "../../utils/promptCategory.js";

//@ chunk-18hwfzwa.js:82387-82574 placement
function preloadBackgroundChunks() {
  return Promise.all([
    import("./chunk-1m6xc21j.js"),
    import("./chunk-jsc6qjj6.js"),
    import("./chunk-7gry1hef.js"),
    import("./chunk-ygxzcsa5.js"),
    import("./chunk-sqs18vyt.js"),
  ]);
}
//@ chunk-18hwfzwa.js:82574-83646 placement
async function detachToBackground(h, x, D) {
  disposeLiveState();
  teardownFrameLiveForProcessHandoff();
  removeQueuedByFilter(isPassiveMainAgentCommand);
  resetNoticeBudgets();
  let L = listJobs(undefined, D?.storageV5).catch(() => []);
  await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
  let ee = rootOf(process.stdout);
  let ke = D?.abortLiveTurn?.();
  if (ee) showScreen(ee, null);
  ke?.then(D?.dropLateQueued).catch((error) => {
    logError(error);
  });
  process.env.CLAUDE_AGENTS_SELECT = h;
  let [
    { createRoot: Re },
    { seedHostJobs: Be },
    { applyFleetViewHostWindowsEnv: He },
    { mountFleetViewWithComposerBack: We },
    { createFleetViewHost: ze },
  ] = await (x ?? preloadBackgroundChunks());
  He();
  let Xe = ee ?? (await Re(getBaseRenderOptions(false)));
  let rt = ze();
  rt.fleetNudgeStore = D?.fleetNudgeStore ?? null;
  let kt = await withTimeout(L, 50, "listJobs seed").catch(() => null);
  if (kt !== null) Be(rt, kt, D?.storageV5);
  logForDebugging("[PERF:bg-leftarrow-mounted]");
  await We(Xe, {
    ...Uo(D, "abortLiveTurn", "dropLateQueued"),
    host: rt,
    entryChannel: "repl_back",
    originJobId: h,
  });
  let originSpawn = D?.originSpawn;
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
//@ chunk-18hwfzwa.js:83646-83778 placement
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
//@ chunk-18hwfzwa.js:83778-84339 placement
async function carryTaskListToFork(taskListId, signal, store) {
  let sessionId = getSessionId();
  if (env.CLAUDE_CODE_TASK_LIST_ID || getTaskListId() !== sessionId) return;
  if (isStorageV5Enabled() && store) {
    await copyTaskListEntries(store, sessionId, taskListId, signal);
    return;
  }
  let fileReader = getFileReader();
  let taskOutputDir = getTaskOutputDir_2(sessionId);
  let taskOutputDir_2 = getTaskOutputDir_2(taskListId);
  let Be = await fileReader.listEntries(taskOutputDir).catch((error) => {
    if (!isENOENT(error))
      logForDebugging(`[tasks] carry to fork failed: ${error}`, {
        level: "warn",
      });
    return null;
  });
  if (Be === null) return;
  await ensureTaskListDir(taskListId, store);
  for (let He of Be) {
    if (signal?.aborted) {
      logForDebugging("[tasks] carry to fork stopped at the cap", {
        level: "warn",
      });
      return;
    }
    if (!He.isFile) continue;
    try {
      await fileReader.copy(join(taskOutputDir, He.name), join(taskOutputDir_2, He.name));
    } catch (error) {
      logForDebugging(`[tasks] carry to fork skipped ${He.name}: ${error}`, {
        level: "warn",
      });
    }
  }
}
//@ chunk-18hwfzwa.js:84339-84349 placement
var MAX_PARALLEL_EXPIRY_WRITES = 8;
//@ chunk-18hwfzwa.js:84349-85537 placement
async function copyTaskListEntries(h, sessionId, D, L) {
  let ee = sanitizePathComponent(sessionId);
  let ke = sanitizePathComponent(D);
  let Re = [];
  let Be;
  do {
    let Xe = await h.listEntries(
      {
        namespace: "task",
        listId: ee,
      },
      Be === undefined
        ? undefined
        : {
            cursor: Be,
          },
    );
    if (!Xe.ok) {
      logForDebugging(`[tasks] carry to fork failed: ${Xe.error.code}`, {
        level: "warn",
      });
      return;
    }
    for (let item of Xe.value.items)
      if (item.kind === "key" && item.key.namespace === "task" && "taskId" in item.key)
        Re.push(item.key.taskId);
    Be = Xe.value.cursor;
  } while (Be !== undefined);
  let He = async (Xe, rt, kt) => {
    let At = await h.read([Xe]);
    if (!At.ok) {
      logForDebugging(`[tasks] carry to fork skipped ${kt}: ${At.error.code}`, {
        level: "warn",
      });
      return;
    }
    let It = At.value.items[0];
    if (!It || !It.found) return;
    let Ot = await h.write(rt, It.value, {
      precondition: {
        type: "ifAbsent",
      },
      mode: 438 & ~process.umask(),
    });
    if (!Ot.ok)
      logForDebugging(`[tasks] carry to fork skipped ${kt}: ${Ot.error.code}`, {
        level: "warn",
      });
  };
  if (L?.aborted) {
    logForDebugging("[tasks] carry to fork stopped at the cap", {
      level: "warn",
    });
    return;
  }
  await He(
    STORAGE_SPACES.taskListHighWaterMark(ee),
    STORAGE_SPACES.taskListHighWaterMark(ke),
    HIGH_WATER_MARK_FILE,
  );
  let We = 0;
  let ze = async () => {
    while (We < Re.length && !L?.aborted) {
      let Xe = Re[We++];
      await He(STORAGE_SPACES.task(ee, Xe), STORAGE_SPACES.task(ke, Xe), Xe);
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(MAX_PARALLEL_EXPIRY_WRITES, Re.length),
      },
      ze,
    ),
  );
  if (L?.aborted && We < Re.length)
    logForDebugging("[tasks] carry to fork stopped at the cap", {
      level: "warn",
    });
}
//@ chunk-18hwfzwa.js:85537-85699 placement
async function removeJobScope(h, x, D) {
  if (D && h === getJobDir(x)) {
    await D.deleteScope({
      namespace: "job",
      jobId: x,
    }).catch(() => {});
    return;
  }
  await rm(h, {
    recursive: true,
    force: true,
  }).catch(() => {});
}
//@ chunk-18hwfzwa.js:85699-85744 placement
function markExpired(h) {
  return rename(h, `${h}.expired`);
}
//@ chunk-18hwfzwa.js:85744-85807 placement
function removeExpired(h) {
  return unlink(`${h}.expired`).then(
    () => {},
    () => {},
  );
}
//@ chunk-18hwfzwa.js:85807-86103 placement
async function pingDaemon() {
  let h = await controlRequest(
    {
      proto: BG_PROTO,
      op: "ping",
    },
    {
      timeoutMs: 2000,
    },
  );
  if (!h.ok)
    return h.code === "ENOCONN" && h.connected === false && isDaemonSocketGoneError(h.errno)
      ? "reads"
      : "unreachable";
  if (h.op !== "ping" || typeof h.carriedPromptsFormat !== "number") return "silent";
  return h.carriedPromptsFormat >= MAX_CARRIED_PROMPTS_VARIANT ? "reads" : "lower-format";
}
//@ chunk-18hwfzwa.js:86103-94334 placement
/**
 * 输入框为空时按 ← 的处理：检查会话持久化/--project 等前提，统计在途读取与排队提示，决定是否需要后台化确认，然后 fork 当前会话并切到 agents 视图；被阻止时给出原因。
 */
async function openAgentsViaLeftArrow(
  snapshot,
  sessionEffort,
  permissionMode,
  additionalWorkingDirectories,
  alwaysAllowRules,
  alwaysDenyRules,
  messageQueue,
  Be,
  He,
  storageV5,
  credentials,
) {
  let handoffRecord = takeHandoffRecord(snapshot, messageQueue);
  let rt = false;
  try {
    let kt = await (async () => {
      logForDebugging("[PERF:bg-leftarrow-start]");
      let backgroundSeed = deriveBackgroundSeed(snapshot, "");
      if (backgroundSeed !== null && isTranscriptPersistenceDisabled()) {
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("persistence"),
          inflight_count: He?.inflightCount ?? 0,
          inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
        });
        return "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded.";
      }
      let It = isLeftArrowCarriesQueuedOn();
      let Ot = (Qn) =>
        It
          ? collectCarriablePrompts(messageQueue, Qn)
          : {
              leftEarlier: [],
              beingRead: [],
              carriable: [],
              stranded: [],
              fileContents: "",
            };
      let Et = Ot();
      let Dt = new Set();
      let Lt = [];
      let oo = () => {
        let Qn = new Set([...Et.carriable, ...Et.beingRead]);
        for (let ur of He?.replyOnResume ? messageQueue.getCommandQueue() : []) if (Qn.has(ur)) Dt.add(ur);
      };
      oo();
      let Xt =
        Dt.size > 0
          ? commandsDiscardedSignal.subscribe((Qn) => {
              for (let ur of Qn) if (Dt.delete(ur)) Lt.push(ur);
            })
          : () => {};
      using io = {
        [Symbol.dispose]: Xt,
      };
      let so = "reads";
      if (Dt.size > 0) {
        so = await pingDaemon();
        Et = Ot();
        oo();
      }
      let po =
        Et.stranded.length > 0
          ? "queued-uncarriable"
          : so !== "reads" && Dt.size > 0
            ? `queued-${so}-service`
            : Et.carriable.length > 0 && !He?.replyOnResume
              ? "queued-fork-idles"
              : undefined;
      if (po !== undefined) {
        let Qn =
          po === "queued-uncarriable"
            ? Et.stranded.length
            : po === "queued-fork-idles"
              ? Et.carriable.length
              : Dt.size;
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(po),
          inflight_count: Qn,
          inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
        });
        return cannotOpenAgentsQueuedMessage(Qn);
      }
      if (backgroundSeed && !backgroundSeed.name && Be) {
        backgroundSeed.name = Be;
        backgroundSeed.nameSource = "auto";
      }
      let ao = preloadBackgroundChunks();
      let co = backgroundSeed
        ? await settleSeedName(backgroundSeed, storageV5)
        : {
            intent: "",
          };
      let workerName = backgroundSeed && co.name !== backgroundSeed.name ? co.name : undefined;
      let Ao = randomUUID();
      let currentWorktreeSession = getCurrentWorktreeSession();
      let Ro = Boolean(currentWorktreeSession && !currentWorktreeSession.enteredExisting);
      let Ho = He?.taskRegistry?.all();
      let Io = Ho ? summarizeBackgroundWork(Ho) : undefined;
      let Wo = Ho ? carriedFrameLiveSlugs(Ho) : undefined;
      let mn = Io
        ? Io.count - Io.carriedMonitors === 0 && Io.restartableCount === 0
        : He?.inflightCount === 0 && He?.restartableCount === 0;
      let parkedJobId;
      let No;
      try {
        ({ short: parkedJobId, jobDir: No } = await preSeedReplBgJob(
          Ao,
          {
            ...co,
            cwd: currentWorktreeSession?.worktreePath ?? getOriginalCwd(),
            inFlight: mn
              ? {
                  tasks: 0,
                  queued: 0,
                  kinds: [],
                }
              : undefined,
            worktree: Ro
              ? {
                  path: currentWorktreeSession.worktreePath,
                  branch: currentWorktreeSession.worktreeBranch,
                  hookBased: currentWorktreeSession.hookBased ?? false,
                  originCwd: currentWorktreeSession.originalCwd,
                }
              : undefined,
            sessionPermissionRules: (() => {
              let Qn = sessionAddDirs(additionalWorkingDirectories);
              return (alwaysAllowRules.session?.length ?? 0) > 0 ||
                (alwaysDenyRules.session?.length ?? 0) > 0 ||
                Qn.length > 0
                ? {
                    allow: [...(alwaysAllowRules.session ?? [])],
                    deny: [...(alwaysDenyRules.session ?? [])],
                    ...(Qn.length > 0 && {
                      addDirs: Qn,
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
      rt = await confirmRelaunch(
        snapshot,
        "background_handoff",
        {
          responseStreaming: He?.abortAfterFlush !== undefined,
        },
        storageV5,
      );
      let vo = null;
      if (He?.taskRegistry) vo = await serializeAdoptable(He.taskRegistry.all(), messageQueue);
      let Yo = Wo === undefined ? 0 : count(vo?.payload.frameLive ?? [], (Qn) => !Wo.has(Qn.slug));
      let replBridgeHandle = getReplBridgeHandle();
      let Fn = 16384;
      let bn = He?.partialText?.trimEnd() ?? "";
      let Go = bn.length > Fn ? bn.slice(-Fn) : bn;
      let hn =
        He?.via === "abort-then-fork" && Go.length > 0 && !replBridgeHandle && !vo?.payload?.agents?.length
          ? {
              text: Go,
              boundaryUuid: He?.boundaryUuid,
            }
          : undefined;
      let Mn = false;
      let Xo = false;
      let Sn;
      if (vo || hn)
        try {
          await writeAdoptJson(
            No,
            {
              ...(vo?.payload ?? {
                writtenAtMs: Date.now(),
                shells: [],
                cron: [],
              }),
              ...(hn && {
                prefill: hn,
              }),
            },
            {},
            storageV5,
          );
          Xo = true;
          Mn = hn !== undefined;
          if (vo && He?.taskRegistry) {
            vo.stopCarriedWatches(He.taskRegistry);
            await vo.checkpointAgents(He.taskRegistry);
            vo.disown(He.taskRegistry);
          }
        } catch (error) {
          Sn = vo?.payload.frameLive?.length ?? 0;
          if (Sn > 0 && !Xo) {
            logFeatureSad("artifact_live_subscribe", "consent_carry_write_failed");
            Sn = 0;
          }
          logForDebugging(`[adopt] hand-off step failed (written=${Xo}): ${error}`, {
            level: "warn",
          });
          vo = null;
        }
      let $n = He?.fleetNudgeStore?.recordOpenViaLeft();
      logEvent("tengu_open_agents_via_left", {
        was_empty: backgroundSeed === null,
        nudge_active: $n !== undefined && $n.needsInput > 0,
        nudge_needs_input_count: $n?.needsInput ?? 0,
        via: fromEnum(He?.via ?? "idle-fork"),
        confirmed_interstitial: He?.confirmedInterstitial ?? false,
        inflight_count: He?.inflightCount ?? 0,
        inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
        restartable_count: He?.restartableCount ?? 0,
        partial_chars: He?.partialChars ?? 0,
        has_prefill: Mn,
        has_boundary_uuid: Mn && He?.boundaryUuid !== undefined,
        prefill_truncated: bn.length > Fn,
        defer_wait_ms: He?.deferWaitMs ?? 0,
        defer_cap_fired: He?.deferCapFired ?? false,
        ...adoptedCounts(vo?.payload),
        ...(Sn !== undefined && {
          adopted_frame_live: Sn,
        }),
        undisclosed_frame_live: Sn === 0 ? 0 : Yo,
      });
      if (replBridgeHandle) {
        let Qn = He?.replyOnResume ? 5000 : 2000;
        await withTimeout(replBridgeHandle.flush(), Qn, "bridge flush").catch(() => {
          logEvent("tengu_bg_bridge_flush_truncated", {
            via: fromEnum(He?.via ?? "idle-fork"),
            cap_ms: Qn,
          });
        });
        replBridgeHandle.teardown({
          skipArchive: true,
        });
      }
      if (He?.abortAfterFlush)
        await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
      let on = 2000;
      let abortController = new AbortController();
      await withTimeout(
        carryTaskListToFork(Ao, abortController.signal, storageV5),
        on,
        "task-list carry",
      ).catch(() => abortController.abort());
      Xt();
      let cn = new Set(messageQueue.getCommandQueue());
      let Dn = Ot([...Dt].filter((Qn) => !cn.has(Qn)));
      Dt.clear();
      let carriable = He?.replyOnResume ? Dn.carriable : [];
      let mr = He?.replyOnResume ? Dn.stranded : [...Dn.carriable, ...Dn.stranded];
      let beingRead = He?.replyOnResume ? Dn.beingRead : [];
      let Wn = Dn.leftEarlier.length + beingRead.length;
      let Fr = (Qn) =>
        recordSubmittedPrompts(
          Qn.map((ur) =>
            ur.historyEntry || !isRefillableInput(ur)
              ? ur
              : {
                  ...ur,
                  historyEntry: {
                    display: inputDisplayText(ur),
                    pastedContents: ur.pastedContents ?? {},
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
      if (carriable.length > 0 || mr.length > 0 || Wn > 0 || Lt.length > 0) {
        let Qn = new Set([...carriable, ...beingRead, ...mr]);
        Fr(
          messageQueue
            .getCommandQueue()
            .filter((Ir) => Qn.has(Ir))
            .concat(Lt),
        );
        for (let Ir of beingRead) Ir.historyEntry = undefined;
        for (let Ir of [
          () =>
            messageQueue.remove(mr, {
              reason: "not_carried_to_background",
            }),
          () =>
            messageQueue.consume([...carriable, ...beingRead], {
              reason: "carried_to_background",
            }),
        ])
          try {
            Ir();
          } catch (error) {
            logError(error);
          }
        let written =
          carriable.length + Wn > 0
            ? await withTimeout(writeCarriedPrompts(No, Dn.fileContents), 2000, "carried prompts write").then(
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
          via: fromEnum(He?.via ?? "idle-fork"),
          count: carriable.length,
          written,
          dropped: mr.length,
          perhaps_delivered: Wn,
          taken_back: Lt.length,
        });
        Lt.length = 0;
      }
      let dropLateQueued = (Qn) => {
        try {
          let ur = It ? messageQueue.getCommandQueue().filter(isHumanPromptCommand) : [];
          if (ur.length > 0) {
            Fr(ur);
            messageQueue.remove(ur, {
              reason: "not_carried_to_background",
            });
            logForDebugging(
              `[carried-prompts] ${ur.length} ${plural(ur.length, "message")} still queued when \u2190 closed this screen: not sent, typed text is in \u2191 history`,
              {
                level: "warn",
              },
            );
          }
          if (Qn.cutLive || Qn.timedOut || ur.length > 0)
            logEvent("tengu_left_arrow_cut_or_dropped", {
              via: fromEnum(He?.via ?? "idle-fork"),
              turn_cut: Qn.cutLive,
              turn_state: fromEnum(Qn.guard),
              wait_timed_out: Qn.timedOut,
              late_dropped: ur.length,
            });
        } catch (error) {
          logError(error);
        }
      };
      let Un = {
        settled: false,
        ok: false,
        forkSessionId: Ao,
      };
      trackBgDispatch(
        parkedJobId,
        spawnBackgroundFork(
          co,
          null,
          sessionEffort,
          permissionMode,
          additionalWorkingDirectories,
          alwaysAllowRules,
          alwaysDenyRules,
          "left_arrow",
          snapshot,
          {
            proactivityLevel: He?.proactivityLevel,
            providedSessionId: Ao,
            replyOnResume: He?.replyOnResume,
            handoffRecord,
            isTurnLive: He?.abortAfterFlush !== undefined,
            workerName,
            storageV5,
            credentials,
            extraEnv: attachCarriedPromptHash(
              No,
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
          if (backgroundFork.ok || !backgroundFork.queued) dropCarriedPromptHash(No);
          if (!backgroundFork.ok && !backgroundFork.queued && !backgroundFork.alive) {
            vo?.abandon();
            if (carriable.length + Wn > 0)
              logEvent("tengu_left_arrow_carried_prompts_lost", {
                count: carriable.length,
                perhaps_delivered: Wn,
              });
            await removeJobScope(No, parkedJobId, storageV5);
          }
          return backgroundFork;
        }),
      )
        .then((Qn) => {
          Un.settled = true;
          let ur = Qn.ok || Qn.alive === true;
          Un.ok = ur;
          Un.transcriptMaterialized = ur || Qn.queued === true;
          if (!ur && !Qn.queued) clearSessionParked(storageV5).catch(() => {});
          if (!Qn.ok) {
            if (Qn.queued && vo) {
              let Ir = join(No, "adopt.json");
              let Pr = () =>
                markExpired(Ir).then(
                  () => {
                    vo?.abandon();
                    return removeExpired(Ir);
                  },
                  () => {},
                );
              let max = Math.max(0, STALE_THRESHOLD_MS - 5000 - (Date.now() - vo.payload.writtenAtMs));
              let Gn = registerCleanup(Pr);
              setTimeout(
                (Ur, Zr) => {
                  Ur();
                  Zr();
                },
                max,
                Gn,
                Pr,
              ).unref();
            }
            if (
              Qn.reason === undefined ||
              Qn.reason === "spawn_failed_unknown" ||
              Qn.reason.startsWith("spawn_failed_ERR_")
            )
              logError(
                withTelemetryMessage(
                  Error(`background spawn failed: ${Qn.error}`),
                  `background spawn failed: ${Qn.reason ?? "unclassified"}`,
                ),
              );
            else
              logForDebugging(`background spawn failed: ${Qn.error}`, {
                level: "warn",
              });
          }
        })
        .catch((error) => {
          if (!Un.settled) {
            Un.settled = true;
            Un.ok = false;
          }
          logError(error);
        });
      He?.abortAfterFlush?.abort(userAbortReason("background"));
      if (He?.sessionScratch) {
        clearPendingGoalIdleCheckin(He.sessionScratch);
        clearPendingGoalReprompt(He.sessionScratch);
        disarmWorkerCheckin(He.sessionScratch);
      }
      messageQueue.removeByFilter(isCheckinNotification);
      forgetMainChainOnHandOff();
      markSessionParked(parkedJobId, storageV5).catch(() => {});
      let dr = demoteInheritedPermissionMode(permissionMode);
      let or = earlyArgsArgv(additionalWorkingDirectories);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_leftarrow_inprocess", true)) {
        let Qn = noopSyncPermissionMode();
        let sessionId = getSessionId();
        noopMergeSessionFlags(undefined);
        try {
          return await detachToBackground(parkedJobId, ao, {
            dispatchDefaults: dr,
            dispatchExtraArgs: or,
            ...(He?.autoOpenJobId !== undefined && {
              autoOpenJobId: He.autoOpenJobId,
            }),
            originSpawn: Un,
            storageV5,
            credentials,
            fleetNudgeStore: He?.fleetNudgeStore,
            ...(He?.abortLiveTurn && {
              abortLiveTurn: He.abortLiveTurn,
              dropLateQueued,
            }),
          });
        } catch (error) {
          if (getSessionId() === sessionId) noopMergeSessionFlags(Qn);
          logError(error);
        }
      }
      let pr = await relaunchClaudeCode({
        args: ["agents", ...or, ...buildDispatchArgs(dr)],
        env: {
          CLAUDE_AGENTS_SELECT:
            He?.autoOpenJobId !== undefined && SHORT_RE.test(He.autoOpenJobId)
              ? He.autoOpenJobId
              : parkedJobId,
          ...getScreenReaderEnv(),
          ...(isRestrictedSession() && {
            CLAUDE_CODE_RESTRICTED: "1",
          }),
        },
      });
      clearSessionParked(storageV5).catch(() => {});
      return pr;
    })();
    return withRelaunchHint(kt, rt);
  } catch (error) {
    logError(error);
    clearSessionParked(storageV5).catch(() => {});
    return withRelaunchHint("Couldn't background this session (an internal error was logged)", rt);
  }
}
//@ chunk-18hwfzwa.js:94334-94356 placement
var BACKGROUND_GESTURE_HOLD_MS = 1000;
var BACKGROUND_GESTURE_DOUBLE_MS = 1000;
//@ chunk-18hwfzwa.js:94356-106953 placement
/**
 * 后台手势控制器（←/后台化）：处理“按 ← 打开 agents / 移到后台”的两段式手势、上限计时、对已停止回合的取消，以及各种不能后台化的原因提示。
 */
class BackgroundGesture {
  #e;
  #t = null;
  #o = null;
  #n = null;
  #s = null;
  #r = false;
  #c = createStore(false);
  #i = undefined;
  #a = false;
  #l = undefined;
  #d = undefined;
  #m = 0;
  constructor(h) {
    this.#e = h;
  }
  bindHost(h) {
    this.#t = h;
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
    let h = this.#n;
    try {
      if (
        h !== null &&
        this.#e.getInputValue().trim() !== "" &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_sloth", true)
      ) {
        this.clearPending();
        this.#y(UNSENT_INPUT_BLOCK);
        logEvent("tengu_defer_boundary_cancelled_draft", {
          site: lit_2("loop_top"),
          wait_ms: this.#e.now() - h.armedAtMs,
        });
      }
    } catch (error) {
      logError(error);
    }
    return this.#n !== null;
  }
  markForkInFlight() {
    this.#r = true;
  }
  markIdleForkMidTurn() {
    let snapshot = this.#e.transcript.getSnapshot();
    let last = snapshot.at(-1);
    this.#s = last
      ? {
          length: snapshot.length,
          uuid: last.uuid,
        }
      : null;
  }
  isParkInFlight = () => this.#r || this.#n !== null || this.#o !== null;
  handOverInFlight = this.#c;
  onBgDetach = () => {
    if (alwaysFalseBackgroundConfirm()) return;
    this.#u();
  };
  #u(h) {
    let x = noopBackgroundConfirm(h);
    if (h !== undefined && x === undefined) return false;
    let D = this.#e.now();
    if (D - this.#m < BACKGROUND_GESTURE_DOUBLE_MS && getAttachStampMs() <= this.#m) return false;
    this.#m = D;
    sendDetachRequest({
      message: x,
    });
    return true;
  }
  requestAttach(h) {
    return !CLOUD_SESSION_ID_RE.test(h) && this.#f(h);
  }
  requestCloudTab(h) {
    return CLOUD_SESSION_ID_RE.test(h) && this.#f(h);
  }
  #f(h) {
    if (alwaysFalseBackgroundConfirm()) return this.#u(parseSwitchTarget(h));
    if (this.#l !== undefined || isBgSession() || this.#S()) return false;
    this.#l = h;
    let x = () => {
      queueMicrotask(() => {
        let ee = this.#l;
        this.#l = undefined;
        if (ee !== undefined) this.onAttachRequest(ee);
      });
    };
    let { guard } = this.#e.turn;
    if (!guard.isActive || guard.isRunning) {
      x();
      return true;
    }
    let L = guard.subscribe(() => {
      if (!guard.isActive) this.#d?.fire();
    });
    this.#d = {
      release: L,
      fire: () => {
        L();
        this.#d = undefined;
        x();
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
    this.#l = undefined;
  }
  #S() {
    if (getBgTakeover() !== null) return true;
    let h = summarizeBackgroundWork(this.#e.store.getState().tasks);
    let x = backgroundEligibilityForSession({
      isBg: false,
      isLoading: false,
      isExternalLoading: false,
      betweenCalls: true,
      inFlight: h,
    });
    if (!needsDetachBeforeBackground(x)) {
      if (!x.ok)
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(x.reason),
          inflight_count: h.count,
          inflight_kinds: fromEnumArr(h.kinds),
        });
      return true;
    }
    return this.#h(h);
  }
  #h(h) {
    let { store, transcript, turn, messageQueue, getInputValue } = this.#e;
    if (isTranscriptPersistenceDisabled()) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("persistence"),
        inflight_count: h.count,
        inflight_kinds: fromEnumArr(h.kinds),
      });
      this.#y(
        "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded.",
      );
      return true;
    }
    if (getProjectConfigRoot() !== null) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("project-config-root"),
        inflight_count: h.count,
        inflight_kinds: fromEnumArr(h.kinds),
      });
      this.#y(
        "Can't move this session to the background. It was started with --project-config-root. A background copy would not get that flag, so it would run the hooks and settings in the working folder. Keep working in this session.",
      );
      return true;
    }
    if (store.getState().endedByModel) {
      this.#y(withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue."));
      return true;
    }
    let Re = countHeldQueuedCommands(
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
    if (Re > 0) {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("queued-commands"),
        inflight_count: Re,
        inflight_kinds: fromEnumArr(h.kinds),
      });
      this.#y(
        `Cannot open agents \u2014 ${Re} queued ${plural(Re, "command")} would be lost. Run or clear ${Re === 1 ? "it" : "them"} first.`,
      );
      return true;
    }
    if (getInputValue().trim() !== "") {
      logEvent("tengu_left_arrow_blocked", {
        reason: lit_2("draft"),
        inflight_count: h.count,
        inflight_kinds: fromEnumArr(h.kinds),
      });
      this.#y(
        "Cannot open agents \u2014 you have unsent text in the input. Send it or clear it first (double-tap esc clears).",
      );
      return true;
    }
    return false;
  }
  #y = (h) => {
    this.#e.transcript.replace((x) => {
      let last = x.at(-1);
      if (last?.type === "system" && last.subtype === "informational" && last.content === h) return x;
      return [...x, createSystemMessage(h, "warning")];
    });
  };
  get isAttachPending() {
    return this.#l !== undefined;
  }
  onAttachRequest(h) {
    if (isBgSession()) return;
    this.#i = h;
    this.#a = true;
    this.onLeftArrow();
  }
  confirm = () => {
    let h = this.#o;
    if (h === null) return;
    logEvent("tengu_left_arrow_confirm", {
      accepted: true,
      count: h.inFlight.count,
      kinds: fromEnumArr(h.inFlight.kinds),
      carryover_count: h.carryOverCount,
      workflow_agent_count: h.workflowAgents.running,
    });
    try {
      h.proceed();
    } finally {
      this.#o = null;
    }
  };
  cancelConfirm = () => {
    let h = this.#o;
    if (h === null) return;
    logEvent("tengu_left_arrow_confirm", {
      accepted: false,
      count: h.inFlight.count,
      kinds: fromEnumArr(h.inFlight.kinds),
      carryover_count: h.carryOverCount,
      workflow_agent_count: h.workflowAgents.running,
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
  #b(h, x) {
    if (isCannotOpenAgentsMessage(h) || !isBridgeOrTransport(this.#e.session)) return h;
    logForDebugging(
      `leftArrowGesture: \u2190 failed; withheld from the screen because rows may be stored off this machine: ${h}`,
      {
        level: "warn",
      },
    );
    return withResumeFlag(x, h);
  }
  #g(h) {
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
    this.#r = true;
    let state = store.getState();
    let { sessionEffort, toolPermissionContext } = state;
    let Ot = this.#i;
    this.#i = undefined;
    let abortController = h.via === "defer-then-fork" ? turn.abortController : null;
    let abortLiveTurn = async () => {
      let abortController_2 = turn.abortController;
      let cutLive =
        abortController_2 !== null &&
        !abortController_2.signal.aborted &&
        abortController_2 !== abortController;
      let guard = !turn.guard.isActive ? "idle" : turn.guard.isRunning ? "running" : "dispatching";
      abortController_2?.abort(userAbortReason("background"));
      let so = await waitForStoreState(
        {
          getState: () => turn.guard,
          subscribe: (po) => turn.guard.subscribe(po),
        },
        (po) => !po.isActive || po.isRunning,
        {
          timeoutMs: 2000,
        },
      );
      return {
        cutLive,
        guard,
        timedOut: !so,
      };
    };
    let agentsViaLeftArrow = openAgentsViaLeftArrow(
      transcript.getSnapshot(),
      sessionEffort,
      getPermissionModeCycle(state),
      toolPermissionContext.additionalWorkingDirectories,
      toolPermissionContext.alwaysAllowRules,
      toolPermissionContext.alwaysDenyRules,
      messageQueue,
      agentTitle ?? haikuTitle,
      {
        ...h,
        proactivityLevel: promptProactivityLevel(state),
        taskRegistry,
        ...(Ot !== undefined && {
          autoOpenJobId: Ot,
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
      let oo = () => this.#c.setState(() => false);
      agentsViaLeftArrow.then(oo, oo);
      this.#c.setState(() => true);
    }
    return agentsViaLeftArrow;
  }
  onLeftArrow = (h) => {
    let { store, transcript, turn, messageQueue, clock, now, getInputValue, dialogStore } = this.#e;
    let guard = turn.guard;
    let ze = this.#a;
    if (this.#a) this.#a = false;
    else this.#i = undefined;
    {
      if (this.#r || this.#o !== null) return;
      let { tasks } = store.getState();
      let rt = summarizeBackgroundWork(tasks);
      let adoptability = computeAdoptability(tasks);
      let At = carriedFrameLiveSlugs(tasks);
      let It = this.#y;
      if (this.#h(rt)) return;
      let Ot = (oo) => this.#b(oo, "Couldn't open the agents view (detail withheld on this connection).");
      let Et = (oo) => {
        this.#r = false;
        It(Ot(oo));
      };
      if (this.#n) {
        let oo = this.#n;
        let Xt = now();
        let io = Xt - oo.absorbAnchorMs;
        let so = !ze && Xt - oo.lastPressMs < HUMAN_CADENCE_MS;
        if (so) oo.absorbAnchorMs = Xt;
        oo.lastPressMs = Xt;
        let po = h !== undefined && h < BACKGROUND_GESTURE_HOLD_MS;
        if (po)
          logForDebugging(
            `leftArrowGesture: \u2190 answered the hint with a defer pending, still waiting for the tool (confirm_gap_ms=${h})`,
            {
              level: "debug",
            },
          );
        if (io < BACKGROUND_GESTURE_HOLD_MS || so || po) return;
        oo.absorbAnchorMs = Xt;
        let abortController = turn.abortController;
        let co = turn.stream.peekStreamingText();
        let partialChars = (co?.length ?? 0) + streamingTextLength(transcript.getSnapshot());
        let partialText = streamingTextSoFar(transcript.getSnapshot(), co);
        let boundaryUuid = lastSettledMessageUuid(transcript.getSnapshot());
        let Ro = countAbandonable(tasks);
        if (!oo.confirmedInterstitial && Ro > 0) {
          It(
            `Still backgrounding after the current tool \u2014 ${Ro} background ${plural(Ro, "task")} would be abandoned by skipping ahead.`,
          );
          return;
        }
        let Ho = countCarriedSince(tasks, oo.carriedAtPress);
        if (Ho > 0) {
          this.clearPending();
          It(
            `Backgrounding cancelled \u2014 ${Ho} Artifact comment ${plural(Ho, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
          );
          return;
        }
        if (abortController && !abortController.signal.aborted && guard.isActive) {
          this.clearPending();
          this.#g({
            via: "abort-then-fork",
            replyOnResume: true,
            confirmedInterstitial: oo.confirmedInterstitial,
            inflightCount: rt.count,
            inflightKinds: rt.kinds,
            restartableCount: rt.restartableCount,
            partialChars,
            partialText,
            boundaryUuid,
            deferWaitMs: now() - oo.armedAtMs,
            abortAfterFlush: abortController,
          }).then(Et);
        } else if (!guard.isActive) {
          this.clearPending();
          oo.proceed().then((Io) => It(Io));
        }
        return;
      }
      let Dt = backgroundEligibilityForSession({
        isBg: false,
        isLoading: guard.isActive,
        isExternalLoading: turn.isExternalLoading,
        betweenCalls: isIdleForBackground(transcript.getSnapshot(), turn.stream.peekStreamingText() !== null),
        inFlight: rt,
      });
      if (!Dt.ok) {
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(Dt.reason),
          inflight_count: Dt.inFlight.count,
          inflight_kinds: fromEnumArr(Dt.inFlight.kinds),
        });
        return;
      }
      let Lt = (confirmedInterstitial) => {
        let Xt = summarizeBackgroundWork(store.getState().tasks);
        let io = turn.stream.peekStreamingText();
        let partialChars = (io?.length ?? 0) + streamingTextLength(transcript.getSnapshot());
        let partialText = streamingTextSoFar(transcript.getSnapshot(), io);
        let boundaryUuid = lastSettledMessageUuid(transcript.getSnapshot());
        let co = backgroundEligibilityForSession({
          isBg: false,
          isLoading: guard.isActive,
          isExternalLoading: turn.isExternalLoading,
          betweenCalls: isIdleForBackground(
            transcript.getSnapshot(),
            turn.stream.peekStreamingText() !== null,
          ),
          inFlight: Xt,
        });
        if (!co.ok) {
          logEvent("tengu_left_arrow_blocked", {
            reason: fromEnum(co.reason),
            inflight_count: Xt.count,
            inflight_kinds: fromEnumArr(Xt.kinds),
          });
          It("Cannot open agents \u2014 a foregrounded task is running.");
          return;
        }
        let bo = countCarriedSince(store.getState().tasks, At);
        if (bo > 0) {
          It(
            `Backgrounding cancelled \u2014 ${bo} Artifact comment ${plural(bo, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
          );
          return;
        }
        let abortController = turn.abortController;
        let via = co.via === "abort-then-fork" && !abortController ? "defer-then-fork" : co.via;
        let Ro = {
          via,
          confirmedInterstitial,
          inflightCount: Xt.count,
          inflightKinds: Xt.kinds,
          restartableCount: Xt.restartableCount,
          partialChars,
          deferWaitMs: 0,
        };
        if (via === "defer-then-fork") {
          let Ho = now();
          let Io = getFeatureValue_CACHED_MAY_BE_STALE("tengu_defer_cap_ms", 1e4) ?? 1e4;
          let clearCapTimer = clock.setTimeout(() => {
            let mn = this.#n;
            if (!mn || mn.armedAtMs !== Ho) return;
            let tasks = store.getState().tasks;
            let No = count(messageQueue.getCommandQueue(), (Fn) => !isCheckinNotification(Fn));
            if (
              No > 0 ||
              (!mn.confirmedInterstitial && countAbandonable(tasks) > 0) ||
              countCarriedSince(tasks, mn.carriedAtPress) > 0
            ) {
              if (No > 0)
                logEvent("tengu_defer_cap_refused_queued", {
                  queue_len: No,
                  wait_ms: now() - Ho,
                });
              return;
            }
            let vo = summarizeBackgroundWork(tasks);
            let restartableCount = vo.restartableCount;
            if (restartableCount > 0) {
              logEvent("tengu_defer_cap_refused_restartable", {
                restartable_count: restartableCount,
                wait_ms: now() - Ho,
              });
              It(waitingForSubagentsMessage(restartableCount));
              return;
            }
            let abortController = turn.abortController;
            if (abortController && !abortController.signal.aborted && guard.isActive) {
              if (getInputValue().trim() !== "") {
                logEvent("tengu_defer_cap_cancelled_draft", {
                  wait_ms: now() - Ho,
                });
                this.clearPending();
                It(UNSENT_INPUT_BLOCK);
                return;
              }
              if (topBlockingDialog(dialogStore.getState()) !== null) {
                logEvent("tengu_defer_cap_refused_ask", {
                  wait_ms: now() - Ho,
                });
                It(WAITING_FOR_ANSWER_MESSAGE);
                return;
              }
              let Fn = turn.stream.peekStreamingText();
              this.#n = null;
              this.#g({
                via: "abort-then-fork",
                replyOnResume: true,
                confirmedInterstitial: mn.confirmedInterstitial,
                inflightCount: vo.count,
                inflightKinds: vo.kinds,
                restartableCount: vo.restartableCount,
                partialChars: (Fn?.length ?? 0) + streamingTextLength(transcript.getSnapshot()),
                partialText: streamingTextSoFar(transcript.getSnapshot(), Fn),
                boundaryUuid: lastSettledMessageUuid(transcript.getSnapshot()),
                deferWaitMs: now() - Ho,
                deferCapFired: true,
                abortAfterFlush: abortController,
              }).then(Et);
            }
          }, Io);
          this.#n = {
            confirmedInterstitial,
            armedAtMs: Ho,
            absorbAnchorMs: Ho,
            lastPressMs: Ho,
            clearCapTimer,
            carriedAtPress: At,
            proceed: () =>
              this.#g({
                ...Ro,
                replyOnResume: true,
                deferWaitMs: now() - Ho,
              }).then((mn) => {
                this.#r = false;
                return Ot(mn);
              }),
          };
          It("Backgrounding after the current tool finishes\u2026");
          return;
        }
        if (via === "abort-then-fork") {
          this.#g({
            ...Ro,
            replyOnResume: true,
            partialText,
            boundaryUuid,
            abortAfterFlush: abortController ?? undefined,
          }).then(Et);
          return;
        }
        this.#g({
          ...Ro,
          replyOnResume: isAtResumePoint(this.#s, transcript.getSnapshot()),
        }).then(Et);
      };
      if (leftArrowNeedsInterstitial(tasks, adoptability)) {
        let oo = wi(tasks, (co) => isAdoptableTask(co, adoptability) || isCarriedFrameLiveWatch(co));
        let summary = backgroundWorkSummary(oo, {
          cronFilter: (co) => !isAdoptableCron(co, adoptability),
        }).summary;
        let confirmedInterstitial = summary !== "";
        let size = At.size;
        let carryOverCount = countAdoptable(tasks, adoptability) - size;
        let workflowAgents = countLiveWorkflowAgents(tasks, adoptability);
        this.#o = {
          inFlight: rt,
          carryOverCount,
          workflowAgents,
          proceed: () => Lt(confirmedInterstitial),
        };
        this.#e
          .requestDialog(LEFT_ARROW_CONFIRM_DIALOG, {
            summary,
            carryOverCount,
            monitorParkCount: size,
            workflowAgents,
          })
          .then((co) => {
            switch (co) {
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
      Lt(false);
    }
  };
  backgroundQuery = () => {
    let { store, setAppState, transcript, turn, messageQueue, taskRegistry, scope, titles } = this.#e;
    let { mainLoopModel, customSystemPrompt, appendSystemPrompt, canUseTool, fallbackModel } = this.#p();
    let { terminalTitle } = titles.getSnapshot();
    let { mainThreadAgentDefinition } = scope;
    let { toolPermissionContext } = store.getState();
    turn.abortController?.abort(userAbortReason("background"));
    let Ot = messageQueue.removeByFilter(
      (queuedCommands) => processQueuedCommands_3(queuedCommands) && !isSlashCommand_2(queuedCommands),
    );
    (async () => {
      let toolUseContext = turn.buildToolUseContext(
        transcript.getSnapshot(),
        [],
        new AbortController(),
        mainLoopModel,
      );
      let [systemPrompt, Lt, cachedSystemContext] = await Promise.all([
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
      let Xt = effectiveSystemPromptText({
        mainThreadAgentDefinition,
        toolUseContext,
        customSystemPrompt,
        defaultSystemPrompt: systemPrompt,
        appendSystemPrompt,
      });
      toolUseContext.renderedSystemPrompt = Xt;
      let mapped = (
        await getQueuedCommandAttachments(Ot, imageLimitsForModel(mainLoopModel)).catch(() => [])
      ).map((Ao) => createAttachmentMessage(Ao));
      let po = new Set();
      let ao = (prompt) => prompt.replace(regExp_4_2, "");
      for (let Ao of transcript.getSnapshot())
        if (
          Ao.type === "attachment" &&
          Ao.attachment.type === "queued_command" &&
          Ao.attachment.commandMode === "task-notification" &&
          typeof Ao.attachment.prompt === "string"
        )
          po.add(ao(Ao.attachment.prompt));
      let filtered = mapped.filter(
        (Ao) =>
          Ao.attachment.type === "queued_command" &&
          (typeof Ao.attachment.prompt !== "string" || !po.has(ao(Ao.attachment.prompt))),
      );
      let stickyBetas = cloneStickyBetaLatches(getStickyBetas());
      toolUseContext.stickyBetas = stickyBetas;
      toolUseContext.onRetryStatus = undefined;
      startBackgroundSession({
        messages: [...transcript.getSnapshot(), ...filtered],
        queryParams: {
          systemPrompt: Xt,
          userContext: Lt,
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
    this.#l = undefined;
  }
}
//@ chunk-18hwfzwa.js:106953-107461 placement
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
    let Be = backgroundEligibilityForSession({
      isBg: isBgSession(),
      isLoading,
      isExternalLoading,
      betweenCalls,
      inFlight: {
        count: 0,
        kinds: [],
      },
    });
    if (Be.ok && Be.via === "detach")
      return {
        handler: gesture.onBgDetach,
        confirmHint: LEFT_ARROW_BACK_HINT,
      };
    if (needsDetachBeforeBackground(Be) && leftArrowOpensAgents)
      return {
        handler: gesture.onLeftArrow,
        confirmHint: "Press \u2190 again to open agents",
      };
  }
  return;
}
//@ chunk-18hwfzwa.js:107461-107465 placement
init_react_production();
//@ chunk-18hwfzwa.js:107465-107469 placement
init_react_production();
export { BackgroundGesture, leftArrowHintText };
