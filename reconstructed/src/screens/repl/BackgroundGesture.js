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
import { writeSync, writeSync as writeSync_2 } from "fs";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { rm, rm as rm_2, rename, unlink, unlink as unlink_2 } from "fs/promises";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { disposeLiveState, resetNoticeBudgets } from "../../services/liveReplica/liveReplica.js";
import { teardownFrameLiveForProcessHandoff } from "../../services/artifacts/frameLive.js";
import {
  kb,
  Oq,
  bVe,
  Up,
  REt,
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
import { q8o } from "../../utils/sandbox/userNamespace.js";
import { fBn, pBn, mBn } from "../../utils/background/envCarry.js";
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
  xLe,
  isHumanPromptCommand,
  isCannotOpenAgentsMessage,
} from "./promptQueue.js";
import { settleSeedName, T0n, tce, sendDetachRequest } from "./backgroundConfirm.js";
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
import { xZn, iyn } from "../../services/daemon/relaunchArgs.js";
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
import { Hci, KXo } from "../../services/api/sessionFlags.js";
import { buildDispatchArgs } from "../../cli/bg/bgSpawnEnv.js";
import { getScreenReaderEnv } from "../../utils/accessibility/screenReader.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { createStore } from "../../state/store.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { y, j } from "../../../vendor/react/cjs/react.production.js";
import {
  TURN_STOPPED_BLOCK,
  UNSENT_INPUT_BLOCK,
  aUt,
  OKn,
  countHeldQueuedCommands,
  createHeldScreeningCheck,
  streamingTextLength,
  streamingTextSoFar,
  lastSettledMessageUuid,
  RKn,
  waitingForSubagentsMessage,
  WAITING_FOR_ANSWER_MESSAGE,
  isAtResumePoint,
} from "../../utils/backgroundHandoff.js";
import { oQe } from "../../utils/attachStamp.js";
import { parseSwitchTarget } from "../../daemon/attach/attachJob.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { createSystemMessage, regExp_4 as regExp_4_2 } from "../../utils/messages.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { waitForStoreState } from "../../context/voice.js";
import { getPermissionModeCycle } from "../../utils/permissions/permissions.js";
import { jye } from "../../utils/proactivityLevel.js";
import { HUMAN_CADENCE_MS, LEFT_ARROW_BACK_HINT } from "../../hooks/useTextInput.js";
import { topBlockingDialog, LEFT_ARROW_CONFIRM_DIALOG } from "../replDialogState.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
import { u6 } from "../../utils/systemPrompt.js";
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
  (disposeLiveState(), teardownFrameLiveForProcessHandoff(), kb(Oq), resetNoticeBudgets());
  let L = listJobs(void 0, D?.storageV5).catch(() => []);
  await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
  let ee = rootOf(process.stdout),
    ke = D?.abortLiveTurn?.();
  if (ee) showScreen(ee, null);
  (ke?.then(D?.dropLateQueued).catch((It) => {
    logError(It);
  }),
    (process.env.CLAUDE_AGENTS_SELECT = h));
  let [
    { createRoot: Re },
    { seedHostJobs: Be },
    { applyFleetViewHostWindowsEnv: He },
    { mountFleetViewWithComposerBack: We },
    { createFleetViewHost: ze },
  ] = await (x ?? preloadBackgroundChunks());
  He();
  let Xe = ee ?? (await Re(getBaseRenderOptions(!1))),
    rt = ze();
  rt.fleetNudgeStore = D?.fleetNudgeStore ?? null;
  let kt = await withTimeout(L, 50, "listJobs seed").catch(() => null);
  if (kt !== null) Be(rt, kt, D?.storageV5);
  (logForDebugging("[PERF:bg-leftarrow-mounted]"),
    await We(Xe, {
      ...Uo(D, "abortLiveTurn", "dropLateQueued"),
      host: rt,
      entryChannel: "repl_back",
      originJobId: h,
    }));
  let At = D?.originSpawn;
  if (At?.resumeHintRequested && At.transcriptMaterialized) {
    cleanupTerminalModes();
    try {
      writeSync(
        2,
        `
Your conversation was backgrounded \u2014 resume it with: claude --resume ${At.forkSessionId}
`,
      );
    } catch {}
  }
  (await gracefulShutdown(0, "other", {
    suppressResumeHint: !(At?.resumeHintRequested && !At.transcriptMaterialized),
  }),
    process.exit(0));
}
//@ chunk-18hwfzwa.js:83646-83778 placement
function demoteInheritedPermissionMode(h) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_agentview_inherit_mode_demote", !0)
    ? { permissionMode: h, permissionModeInherited: !0 }
    : { permissionMode: h };
}
//@ chunk-18hwfzwa.js:83778-84339 placement
async function carryTaskListToFork(h, x, D) {
  let L = getSessionId();
  if (env.CLAUDE_CODE_TASK_LIST_ID || getTaskListId() !== L) return;
  if (isStorageV5Enabled() && D) {
    await copyTaskListEntries(D, L, h, x);
    return;
  }
  let ee = getFileReader(),
    ke = getTaskOutputDir_2(L),
    Re = getTaskOutputDir_2(h),
    Be = await ee.listEntries(ke).catch((He) => {
      if (!isENOENT(He)) logForDebugging(`[tasks] carry to fork failed: ${He}`, { level: "warn" });
      return null;
    });
  if (Be === null) return;
  await ensureTaskListDir(h, D);
  for (let He of Be) {
    if (x?.aborted) {
      logForDebugging("[tasks] carry to fork stopped at the cap", { level: "warn" });
      return;
    }
    if (!He.isFile) continue;
    try {
      await ee.copy(join(ke, He.name), join(Re, He.name));
    } catch (error) {
      logForDebugging(`[tasks] carry to fork skipped ${He.name}: ${error}`, { level: "warn" });
    }
  }
}
//@ chunk-18hwfzwa.js:84339-84349 placement
var GMt = 8;
//@ chunk-18hwfzwa.js:84349-85537 placement
async function copyTaskListEntries(h, x, D, L) {
  let ee = sanitizePathComponent(x),
    ke = sanitizePathComponent(D),
    Re = [],
    Be;
  do {
    let listEntries = await h.listEntries(
      { namespace: "task", listId: ee },
      Be === void 0 ? void 0 : { cursor: Be },
    );
    if (!listEntries.ok) {
      logForDebugging(`[tasks] carry to fork failed: ${listEntries.error.code}`, { level: "warn" });
      return;
    }
    for (let item of listEntries.value.items)
      if (item.kind === "key" && item.key.namespace === "task" && "taskId" in item.key)
        Re.push(item.key.taskId);
    Be = listEntries.value.cursor;
  } while (Be !== void 0);
  let He = async (Xe, rt, kt) => {
    let read = await h.read([Xe]);
    if (!read.ok) {
      logForDebugging(`[tasks] carry to fork skipped ${kt}: ${read.error.code}`, { level: "warn" });
      return;
    }
    let It = read.value.items[0];
    if (!It || !It.found) return;
    let write = await h.write(rt, It.value, {
      precondition: { type: "ifAbsent" },
      mode: 438 & ~process.umask(),
    });
    if (!write.ok)
      logForDebugging(`[tasks] carry to fork skipped ${kt}: ${write.error.code}`, { level: "warn" });
  };
  if (L?.aborted) {
    logForDebugging("[tasks] carry to fork stopped at the cap", { level: "warn" });
    return;
  }
  await He(
    STORAGE_SPACES.taskListHighWaterMark(ee),
    STORAGE_SPACES.taskListHighWaterMark(ke),
    HIGH_WATER_MARK_FILE,
  );
  let We = 0,
    ze = async () => {
      while (We < Re.length && !L?.aborted) {
        let Xe = Re[We++];
        await He(STORAGE_SPACES.task(ee, Xe), STORAGE_SPACES.task(ke, Xe), Xe);
      }
    };
  if ((await Promise.all(Array.from({ length: Math.min(GMt, Re.length) }, ze)), L?.aborted && We < Re.length))
    logForDebugging("[tasks] carry to fork stopped at the cap", { level: "warn" });
}
//@ chunk-18hwfzwa.js:85537-85699 placement
async function removeJobScope(h, x, D) {
  if (D && h === getJobDir(x)) {
    await D.deleteScope({ namespace: "job", jobId: x }).catch(() => {});
    return;
  }
  await rm(h, { recursive: !0, force: !0 }).catch(() => {});
}
//@ chunk-18hwfzwa.js:85699-85744 placement
function YMt(h) {
  return rename(h, `${h}.expired`);
}
//@ chunk-18hwfzwa.js:85744-85807 placement
function JMt(h) {
  return unlink(`${h}.expired`).then(
    () => {},
    () => {},
  );
}
//@ chunk-18hwfzwa.js:85807-86103 placement
async function pingDaemon() {
  let h = await controlRequest({ proto: BG_PROTO, op: "ping" }, { timeoutMs: 2000 });
  if (!h.ok) return h.code === "ENOCONN" && h.connected === !1 && q8o(h.errno) ? "reads" : "unreachable";
  if (h.op !== "ping" || typeof h.carriedPromptsFormat !== "number") return "silent";
  return h.carriedPromptsFormat >= fBn ? "reads" : "lower-format";
}
/**
 * 输入框为空时按 ← 的处理：检查会话持久化/--project 等前提，统计在途读取与排队提示，决定是否需要后台化确认，然后 fork 当前会话并切到 agents 视图；被阻止时给出原因。
 */
//@ chunk-18hwfzwa.js:86103-94334 placement
async function openAgentsViaLeftArrow(h, x, D, L, ee, ke, Re, Be, He, We, ze) {
  let Xe = takeHandoffRecord(h, Re),
    rt = !1;
  try {
    let kt = await (async () => {
      logForDebugging("[PERF:bg-leftarrow-start]");
      let At = deriveBackgroundSeed(h, "");
      if (At !== null && isTranscriptPersistenceDisabled())
        return (
          logEvent("tengu_left_arrow_blocked", {
            reason: lit_2("persistence"),
            inflight_count: He?.inflightCount ?? 0,
            inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
          }),
          "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded."
        );
      let It = isLeftArrowCarriesQueuedOn(),
        Ot = (Qn) =>
          It
            ? collectCarriablePrompts(Re, Qn)
            : { leftEarlier: [], beingRead: [], carriable: [], stranded: [], fileContents: "" },
        Et = Ot(),
        Dt = new Set(),
        Lt = [],
        oo = () => {
          let Qn = new Set([...Et.carriable, ...Et.beingRead]);
          for (let ur of He?.replyOnResume ? Re.getCommandQueue() : []) if (Qn.has(ur)) Dt.add(ur);
        };
      oo();
      let Xt =
        Dt.size > 0
          ? bVe.subscribe((Qn) => {
              for (let ur of Qn) if (Dt.delete(ur)) Lt.push(ur);
            })
          : () => {};
      using io = { [Symbol.dispose]: Xt };
      let so = "reads";
      if (Dt.size > 0) ((so = await pingDaemon()), (Et = Ot()), oo());
      let po =
        Et.stranded.length > 0
          ? "queued-uncarriable"
          : so !== "reads" && Dt.size > 0
            ? `queued-${so}-service`
            : Et.carriable.length > 0 && !He?.replyOnResume
              ? "queued-fork-idles"
              : void 0;
      if (po !== void 0) {
        let Qn =
          po === "queued-uncarriable"
            ? Et.stranded.length
            : po === "queued-fork-idles"
              ? Et.carriable.length
              : Dt.size;
        return (
          logEvent("tengu_left_arrow_blocked", {
            reason: fromEnum(po),
            inflight_count: Qn,
            inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
          }),
          cannotOpenAgentsQueuedMessage(Qn)
        );
      }
      if (At && !At.name && Be) ((At.name = Be), (At.nameSource = "auto"));
      let ao = preloadBackgroundChunks(),
        co = At ? await settleSeedName(At, We) : { intent: "" },
        bo = At && co.name !== At.name ? co.name : void 0,
        Ao = randomUUID(),
        Bo = getCurrentWorktreeSession(),
        Ro = Boolean(Bo && !Bo.enteredExisting),
        Ho = He?.taskRegistry?.all(),
        Io = Ho ? summarizeBackgroundWork(Ho) : void 0,
        Wo = Ho ? carriedFrameLiveSlugs(Ho) : void 0,
        mn = Io
          ? Io.count - Io.carriedMonitors === 0 && Io.restartableCount === 0
          : He?.inflightCount === 0 && He?.restartableCount === 0,
        Cn,
        No;
      try {
        ({ short: Cn, jobDir: No } = await preSeedReplBgJob(
          Ao,
          {
            ...co,
            cwd: Bo?.worktreePath ?? getOriginalCwd(),
            inFlight: mn ? { tasks: 0, queued: 0, kinds: [] } : void 0,
            worktree: Ro
              ? {
                  path: Bo.worktreePath,
                  branch: Bo.worktreeBranch,
                  hookBased: Bo.hookBased ?? !1,
                  originCwd: Bo.originalCwd,
                }
              : void 0,
            sessionPermissionRules: (() => {
              let Qn = xZn(L);
              return (ee.session?.length ?? 0) > 0 || (ke.session?.length ?? 0) > 0 || Qn.length > 0
                ? {
                    allow: [...(ee.session ?? [])],
                    deny: [...(ke.session ?? [])],
                    ...(Qn.length > 0 && { addDirs: Qn }),
                  }
                : void 0;
            })(),
            memoryToggledOff: getMemoryToggledOff() || void 0,
            autoMemoryOffThisSession: getAutoMemoryOffThisSession() || void 0,
          },
          We,
        ));
      } catch (error) {
        return `Cannot open agents \u2014 ${error instanceof Error ? error.message : String(error)}`;
      }
      rt = await confirmRelaunch(
        h,
        "background_handoff",
        { responseStreaming: He?.abortAfterFlush !== void 0 },
        We,
      );
      let vo = null;
      if (He?.taskRegistry) vo = await serializeAdoptable(He.taskRegistry.all(), Re);
      let Yo = Wo === void 0 ? 0 : count(vo?.payload.frameLive ?? [], (Qn) => !Wo.has(Qn.slug)),
        kn = getReplBridgeHandle(),
        Fn = 16384,
        bn = He?.partialText?.trimEnd() ?? "",
        Go = bn.length > Fn ? bn.slice(-Fn) : bn,
        hn =
          He?.via === "abort-then-fork" && Go.length > 0 && !kn && !vo?.payload?.agents?.length
            ? { text: Go, boundaryUuid: He?.boundaryUuid }
            : void 0,
        Mn = !1,
        Xo = !1,
        Sn;
      if (vo || hn)
        try {
          if (
            (await writeAdoptJson(
              No,
              {
                ...(vo?.payload ?? { writtenAtMs: Date.now(), shells: [], cron: [] }),
                ...(hn && { prefill: hn }),
              },
              {},
              We,
            ),
            (Xo = !0),
            (Mn = hn !== void 0),
            vo && He?.taskRegistry)
          )
            (vo.stopCarriedWatches(He.taskRegistry),
              await vo.checkpointAgents(He.taskRegistry),
              vo.disown(He.taskRegistry));
        } catch (error) {
          if (((Sn = vo?.payload.frameLive?.length ?? 0), Sn > 0 && !Xo))
            (logFeatureSad("artifact_live_subscribe", "consent_carry_write_failed"), (Sn = 0));
          (logForDebugging(`[adopt] hand-off step failed (written=${Xo}): ${error}`, { level: "warn" }),
            (vo = null));
        }
      let $n = He?.fleetNudgeStore?.recordOpenViaLeft();
      if (
        (logEvent("tengu_open_agents_via_left", {
          was_empty: At === null,
          nudge_active: $n !== void 0 && $n.needsInput > 0,
          nudge_needs_input_count: $n?.needsInput ?? 0,
          via: fromEnum(He?.via ?? "idle-fork"),
          confirmed_interstitial: He?.confirmedInterstitial ?? !1,
          inflight_count: He?.inflightCount ?? 0,
          inflight_kinds: fromEnumArr(He?.inflightKinds ?? []),
          restartable_count: He?.restartableCount ?? 0,
          partial_chars: He?.partialChars ?? 0,
          has_prefill: Mn,
          has_boundary_uuid: Mn && He?.boundaryUuid !== void 0,
          prefill_truncated: bn.length > Fn,
          defer_wait_ms: He?.deferWaitMs ?? 0,
          defer_cap_fired: He?.deferCapFired ?? !1,
          ...adoptedCounts(vo?.payload),
          ...(Sn !== void 0 && { adopted_frame_live: Sn }),
          undisclosed_frame_live: Sn === 0 ? 0 : Yo,
        }),
        kn)
      ) {
        let Qn = He?.replyOnResume ? 5000 : 2000;
        (await withTimeout(kn.flush(), Qn, "bridge flush").catch(() => {
          logEvent("tengu_bg_bridge_flush_truncated", { via: fromEnum(He?.via ?? "idle-fork"), cap_ms: Qn });
        }),
          kn.teardown({ skipArchive: !0 }));
      }
      if (He?.abortAfterFlush)
        await withTimeout(flushSessionStorage(), 2000, "flush timeout").catch(() => {});
      let on = 2000,
        abortController = new AbortController();
      (await withTimeout(carryTaskListToFork(Ao, abortController.signal, We), on, "task-list carry").catch(
        () => abortController.abort(),
      ),
        Xt());
      let cn = new Set(Re.getCommandQueue()),
        Dn = Ot([...Dt].filter((Qn) => !cn.has(Qn)));
      Dt.clear();
      let wn = He?.replyOnResume ? Dn.carriable : [],
        mr = He?.replyOnResume ? Dn.stranded : [...Dn.carriable, ...Dn.stranded],
        Kn = He?.replyOnResume ? Dn.beingRead : [],
        Wn = Dn.leftEarlier.length + Kn.length,
        Fr = (Qn) =>
          recordSubmittedPrompts(
            Qn.map((ur) =>
              ur.historyEntry || !Up(ur)
                ? ur
                : { ...ur, historyEntry: { display: REt(ur), pastedContents: ur.pastedContents ?? {} } },
            ),
            We,
            { armUndo: !1, placed: withExpandedPastes, unanswered: "typed" },
          );
      if (wn.length > 0 || mr.length > 0 || Wn > 0 || Lt.length > 0) {
        let Qn = new Set([...wn, ...Kn, ...mr]);
        Fr(
          Re.getCommandQueue()
            .filter((Ir) => Qn.has(Ir))
            .concat(Lt),
        );
        for (let Ir of Kn) Ir.historyEntry = void 0;
        for (let Ir of [
          () => Re.remove(mr, { reason: "not_carried_to_background" }),
          () => Re.consume([...wn, ...Kn], { reason: "carried_to_background" }),
        ])
          try {
            Ir();
          } catch (error) {
            logError(error);
          }
        let ur =
          wn.length + Wn > 0
            ? await withTimeout(xLe(No, Dn.fileContents), 2000, "carried prompts write").then(
                () => !0,
                (Ir) => (logForDebugging(`[carried-prompts] write failed: ${Ir}`, { level: "warn" }), !1),
              )
            : void 0;
        (logEvent("tengu_left_arrow_prompts_carried", {
          via: fromEnum(He?.via ?? "idle-fork"),
          count: wn.length,
          written: ur,
          dropped: mr.length,
          perhaps_delivered: Wn,
          taken_back: Lt.length,
        }),
          (Lt.length = 0));
      }
      let Zn = (Qn) => {
          try {
            let ur = It ? Re.getCommandQueue().filter(isHumanPromptCommand) : [];
            if (ur.length > 0)
              (Fr(ur),
                Re.remove(ur, { reason: "not_carried_to_background" }),
                logForDebugging(
                  `[carried-prompts] ${ur.length} ${plural(ur.length, "message")} still queued when \u2190 closed this screen: not sent, typed text is in \u2191 history`,
                  { level: "warn" },
                ));
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
        },
        Un = { settled: !1, ok: !1, forkSessionId: Ao };
      if (
        (trackBgDispatch(
          Cn,
          spawnBackgroundFork(co, null, x, D, L, ee, ke, "left_arrow", h, {
            proactivityLevel: He?.proactivityLevel,
            providedSessionId: Ao,
            replyOnResume: He?.replyOnResume,
            handoffRecord: Xe,
            isTurnLive: He?.abortAfterFlush !== void 0,
            workerName: bo,
            storageV5: We,
            credentials: ze,
            extraEnv: pBn(
              No,
              buildBridgeReattachEnv(
                kn?.bridgeSessionId,
                kn?.getLastSequenceNum(),
                kn?.outboundOnly,
                kn?.sessionGroupingId,
                resolveBridgeHandoffIdentity(kn, getCurrentSessionBridge()),
              ),
            ),
          }).then(async (Qn) => {
            if (Qn.ok || !Qn.queued) mBn(No);
            if (!Qn.ok && !Qn.queued && !Qn.alive) {
              if ((vo?.abandon(), wn.length + Wn > 0))
                logEvent("tengu_left_arrow_carried_prompts_lost", {
                  count: wn.length,
                  perhaps_delivered: Wn,
                });
              await removeJobScope(No, Cn, We);
            }
            return Qn;
          }),
        )
          .then((Qn) => {
            Un.settled = !0;
            let ur = Qn.ok || Qn.alive === !0;
            if (((Un.ok = ur), (Un.transcriptMaterialized = ur || Qn.queued === !0), !ur && !Qn.queued))
              clearSessionParked(We).catch(() => {});
            if (!Qn.ok) {
              if (Qn.queued && vo) {
                let Ir = join(No, "adopt.json"),
                  Pr = () =>
                    YMt(Ir).then(
                      () => (vo?.abandon(), JMt(Ir)),
                      () => {},
                    ),
                  max = Math.max(0, STALE_THRESHOLD_MS - 5000 - (Date.now() - vo.payload.writtenAtMs)),
                  Gn = registerCleanup(Pr);
                setTimeout(
                  (Ur, Zr) => {
                    (Ur(), Zr());
                  },
                  max,
                  Gn,
                  Pr,
                ).unref();
              }
              if (
                Qn.reason === void 0 ||
                Qn.reason === "spawn_failed_unknown" ||
                Qn.reason.startsWith("spawn_failed_ERR_")
              )
                logError(
                  withTelemetryMessage(
                    Error(`background spawn failed: ${Qn.error}`),
                    `background spawn failed: ${Qn.reason ?? "unclassified"}`,
                  ),
                );
              else logForDebugging(`background spawn failed: ${Qn.error}`, { level: "warn" });
            }
          })
          .catch((Qn) => {
            if (!Un.settled) ((Un.settled = !0), (Un.ok = !1));
            logError(Qn);
          }),
        He?.abortAfterFlush?.abort(userAbortReason("background")),
        He?.sessionScratch)
      )
        (clearPendingGoalIdleCheckin(He.sessionScratch),
          clearPendingGoalReprompt(He.sessionScratch),
          disarmWorkerCheckin(He.sessionScratch));
      (Re.removeByFilter(isCheckinNotification),
        forgetMainChainOnHandOff(),
        markSessionParked(Cn, We).catch(() => {}));
      let dr = demoteInheritedPermissionMode(D),
        or = iyn(L);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_leftarrow_inprocess", !0)) {
        let Qn = Hci(),
          ur = getSessionId();
        KXo(void 0);
        try {
          return await detachToBackground(Cn, ao, {
            dispatchDefaults: dr,
            dispatchExtraArgs: or,
            ...(He?.autoOpenJobId !== void 0 && { autoOpenJobId: He.autoOpenJobId }),
            originSpawn: Un,
            storageV5: We,
            credentials: ze,
            fleetNudgeStore: He?.fleetNudgeStore,
            ...(He?.abortLiveTurn && { abortLiveTurn: He.abortLiveTurn, dropLateQueued: Zn }),
          });
        } catch (error) {
          if (getSessionId() === ur) KXo(Qn);
          logError(error);
        }
      }
      let pr = await relaunchClaudeCode({
        args: ["agents", ...or, ...buildDispatchArgs(dr)],
        env: {
          CLAUDE_AGENTS_SELECT:
            He?.autoOpenJobId !== void 0 && SHORT_RE.test(He.autoOpenJobId) ? He.autoOpenJobId : Cn,
          ...getScreenReaderEnv(),
          ...(isRestrictedSession() && { CLAUDE_CODE_RESTRICTED: "1" }),
        },
      });
      return (clearSessionParked(We).catch(() => {}), pr);
    })();
    return withRelaunchHint(kt, rt);
  } catch (error) {
    return (
      logError(error),
      clearSessionParked(We).catch(() => {}),
      withRelaunchHint("Couldn't background this session (an internal error was logged)", rt)
    );
  }
}
//@ chunk-18hwfzwa.js:94334-94356 placement
var TFe = 1000,
  eIt = 1000;
/**
 * 后台手势控制器（←/后台化）：处理“按 ← 打开 agents / 移到后台”的两段式手势、上限计时、对已停止回合的取消，以及各种不能后台化的原因提示。
 */
//@ chunk-18hwfzwa.js:94356-106953 placement
class BackgroundGesture {
  #e;
  #t = null;
  #o = null;
  #n = null;
  #s = null;
  #r = !1;
  #c = createStore(!1);
  #i = void 0;
  #a = !1;
  #l = void 0;
  #d = void 0;
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
    (this.#n?.clearCapTimer(), (this.#n = null));
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
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_sloth", !0)
      )
        (this.clearPending(),
          this.#y(UNSENT_INPUT_BLOCK),
          logEvent("tengu_defer_boundary_cancelled_draft", {
            site: lit_2("loop_top"),
            wait_ms: this.#e.now() - h.armedAtMs,
          }));
    } catch (error) {
      logError(error);
    }
    return this.#n !== null;
  }
  markForkInFlight() {
    this.#r = !0;
  }
  markIdleForkMidTurn() {
    let snapshot = this.#e.transcript.getSnapshot(),
      at = snapshot.at(-1);
    this.#s = at ? { length: snapshot.length, uuid: at.uuid } : null;
  }
  isParkInFlight = () => this.#r || this.#n !== null || this.#o !== null;
  handOverInFlight = this.#c;
  onBgDetach = () => {
    if (T0n()) return;
    this.#u();
  };
  #u(h) {
    let x = tce(h);
    if (h !== void 0 && x === void 0) return !1;
    let now = this.#e.now();
    if (now - this.#m < eIt && oQe() <= this.#m) return !1;
    return ((this.#m = now), sendDetachRequest({ message: x }), !0);
  }
  requestAttach(h) {
    return !CLOUD_SESSION_ID_RE.test(h) && this.#f(h);
  }
  requestCloudTab(h) {
    return CLOUD_SESSION_ID_RE.test(h) && this.#f(h);
  }
  #f(h) {
    if (T0n()) return this.#u(parseSwitchTarget(h));
    if (this.#l !== void 0 || isBgSession() || this.#S()) return !1;
    this.#l = h;
    let x = () => {
        queueMicrotask(() => {
          let ee = this.#l;
          if (((this.#l = void 0), ee !== void 0)) this.onAttachRequest(ee);
        });
      },
      { guard: guard } = this.#e.turn;
    if (!guard.isActive || guard.isRunning) return (x(), !0);
    let subscribe = guard.subscribe(() => {
      if (!guard.isActive) this.#d?.fire();
    });
    return (
      (this.#d = {
        release: subscribe,
        fire: () => {
          (subscribe(), (this.#d = void 0), x());
        },
      }),
      !0
    );
  }
  markQueryLoopStarted() {
    this.#d?.fire();
  }
  cancelHeldAttach() {
    if (this.#d === void 0) return;
    (this.#d.release(), (this.#d = void 0), (this.#l = void 0));
  }
  #S() {
    if (getBgTakeover() !== null) return !0;
    let h = summarizeBackgroundWork(this.#e.store.getState().tasks),
      x = aUt({ isBg: !1, isLoading: !1, isExternalLoading: !1, betweenCalls: !0, inFlight: h });
    if (!OKn(x)) {
      if (!x.ok)
        logEvent("tengu_left_arrow_blocked", {
          reason: fromEnum(x.reason),
          inflight_count: h.count,
          inflight_kinds: fromEnumArr(h.kinds),
        });
      return !0;
    }
    return this.#h(h);
  }
  #h(h) {
    let {
      store: store,
      transcript: transcript,
      turn: turn,
      messageQueue: messageQueue,
      getInputValue: getInputValue,
    } = this.#e;
    if (isTranscriptPersistenceDisabled())
      return (
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("persistence"),
          inflight_count: h.count,
          inflight_kinds: fromEnumArr(h.kinds),
        }),
        this.#y(
          "Cannot open agents \u2014 session persistence is disabled, so this conversation cannot be backgrounded.",
        ),
        !0
      );
    if (getProjectConfigRoot() !== null)
      return (
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("project-config-root"),
          inflight_count: h.count,
          inflight_kinds: fromEnumArr(h.kinds),
        }),
        this.#y(
          "Can't move this session to the background. It was started with --project-config-root. A background copy would not get that flag, so it would run the hooks and settings in the working folder. Keep working in this session.",
        ),
        !0
      );
    if (store.getState().endedByModel)
      return (
        this.#y(
          withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue."),
        ),
        !0
      );
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
    if (Re > 0)
      return (
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("queued-commands"),
          inflight_count: Re,
          inflight_kinds: fromEnumArr(h.kinds),
        }),
        this.#y(
          `Cannot open agents \u2014 ${Re} queued ${plural(Re, "command")} would be lost. Run or clear ${Re === 1 ? "it" : "them"} first.`,
        ),
        !0
      );
    if (getInputValue().trim() !== "")
      return (
        logEvent("tengu_left_arrow_blocked", {
          reason: lit_2("draft"),
          inflight_count: h.count,
          inflight_kinds: fromEnumArr(h.kinds),
        }),
        this.#y(
          "Cannot open agents \u2014 you have unsent text in the input. Send it or clear it first (double-tap esc clears).",
        ),
        !0
      );
    return !1;
  }
  #y = (h) => {
    this.#e.transcript.replace((x) => {
      let at = x.at(-1);
      if (at?.type === "system" && at.subtype === "informational" && at.content === h) return x;
      return [...x, createSystemMessage(h, "warning")];
    });
  };
  get isAttachPending() {
    return this.#l !== void 0;
  }
  onAttachRequest(h) {
    if (isBgSession()) return;
    ((this.#i = h), (this.#a = !0), this.onLeftArrow());
  }
  confirm = () => {
    let h = this.#o;
    if (h === null) return;
    logEvent("tengu_left_arrow_confirm", {
      accepted: !0,
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
    (logEvent("tengu_left_arrow_confirm", {
      accepted: !1,
      count: h.inFlight.count,
      kinds: fromEnumArr(h.inFlight.kinds),
      carryover_count: h.carryOverCount,
      workflow_agent_count: h.workflowAgents.running,
    }),
      (this.#o = null),
      (this.#i = void 0));
  };
  get leaveEndsProcess() {
    return this.#e.leaveEndsProcess;
  }
  cloudSessionRoute() {
    return;
  }
  #b(h, x) {
    if (isCannotOpenAgentsMessage(h) || !isBridgeOrTransport(this.#e.session)) return h;
    return (
      logForDebugging(
        `leftArrowGesture: \u2190 failed; withheld from the screen because rows may be stored off this machine: ${h}`,
        { level: "warn" },
      ),
      withResumeFlag(x, h)
    );
  }
  #g(h) {
    let {
        store: store,
        transcript: transcript,
        turn: turn,
        messageQueue: messageQueue,
        session: session,
        taskRegistry: taskRegistry,
        fleetNudgeStore: fleetNudgeStore,
        storageV5: storageV5,
        credentials: credentials,
        titles: titles,
      } = this.#e,
      { agentTitle: agentTitle, haikuTitle: haikuTitle } = titles.getSnapshot();
    this.#r = !0;
    let state = store.getState(),
      { sessionEffort: sessionEffort, toolPermissionContext: toolPermissionContext } = state,
      Ot = this.#i;
    this.#i = void 0;
    let Et = h.via === "defer-then-fork" ? turn.abortController : null,
      Dt = async () => {
        let abortController = turn.abortController,
          Xt = abortController !== null && !abortController.signal.aborted && abortController !== Et,
          io = !turn.guard.isActive ? "idle" : turn.guard.isRunning ? "running" : "dispatching";
        abortController?.abort(userAbortReason("background"));
        let so = await waitForStoreState(
          { getState: () => turn.guard, subscribe: (po) => turn.guard.subscribe(po) },
          (po) => !po.isActive || po.isRunning,
          { timeoutMs: 2000 },
        );
        return { cutLive: Xt, guard: io, timedOut: !so };
      },
      Lt = openAgentsViaLeftArrow(
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
          proactivityLevel: jye(state),
          taskRegistry: taskRegistry,
          ...(Ot !== void 0 && { autoOpenJobId: Ot }),
          fleetNudgeStore: fleetNudgeStore,
          sessionScratch: session.sessionScratch,
          ...(isLeftArrowCarriesQueuedOn() && { abortLiveTurn: Dt }),
        },
        storageV5,
        credentials,
      );
    if (isLeftArrowCarriesQueuedOn()) {
      let oo = () => this.#c.setState(() => !1);
      (Lt.then(oo, oo), this.#c.setState(() => !0));
    }
    return Lt;
  }
  onLeftArrow = (h) => {
    let {
        store: store,
        transcript: transcript,
        turn: turn,
        messageQueue: messageQueue,
        clock: clock,
        now: now,
        getInputValue: getInputValue,
        dialogStore: dialogStore,
      } = this.#e,
      guard = turn.guard,
      ze = this.#a;
    if (this.#a) this.#a = !1;
    else this.#i = void 0;
    {
      if (this.#r || this.#o !== null) return;
      let { tasks: tasks } = store.getState(),
        rt = summarizeBackgroundWork(tasks),
        kt = computeAdoptability(tasks),
        At = carriedFrameLiveSlugs(tasks),
        It = this.#y;
      if (this.#h(rt)) return;
      let Ot = (oo) => this.#b(oo, "Couldn't open the agents view (detail withheld on this connection)."),
        Et = (oo) => {
          ((this.#r = !1), It(Ot(oo)));
        };
      if (this.#n) {
        let oo = this.#n,
          Xt = now(),
          io = Xt - oo.absorbAnchorMs,
          so = !ze && Xt - oo.lastPressMs < HUMAN_CADENCE_MS;
        if (so) oo.absorbAnchorMs = Xt;
        oo.lastPressMs = Xt;
        let po = h !== void 0 && h < TFe;
        if (po)
          logForDebugging(
            `leftArrowGesture: \u2190 answered the hint with a defer pending, still waiting for the tool (confirm_gap_ms=${h})`,
            { level: "debug" },
          );
        if (io < TFe || so || po) return;
        oo.absorbAnchorMs = Xt;
        let abortController = turn.abortController,
          peekStreamingText = turn.stream.peekStreamingText(),
          bo = (peekStreamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot()),
          Ao = streamingTextSoFar(transcript.getSnapshot(), peekStreamingText),
          Bo = lastSettledMessageUuid(transcript.getSnapshot()),
          Ro = countAbandonable(tasks);
        if (!oo.confirmedInterstitial && Ro > 0) {
          It(
            `Still backgrounding after the current tool \u2014 ${Ro} background ${plural(Ro, "task")} would be abandoned by skipping ahead.`,
          );
          return;
        }
        let Ho = countCarriedSince(tasks, oo.carriedAtPress);
        if (Ho > 0) {
          (this.clearPending(),
            It(
              `Backgrounding cancelled \u2014 ${Ho} Artifact comment ${plural(Ho, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
            ));
          return;
        }
        if (abortController && !abortController.signal.aborted && guard.isActive)
          (this.clearPending(),
            this.#g({
              via: "abort-then-fork",
              replyOnResume: !0,
              confirmedInterstitial: oo.confirmedInterstitial,
              inflightCount: rt.count,
              inflightKinds: rt.kinds,
              restartableCount: rt.restartableCount,
              partialChars: bo,
              partialText: Ao,
              boundaryUuid: Bo,
              deferWaitMs: now() - oo.armedAtMs,
              abortAfterFlush: abortController,
            }).then(Et));
        else if (!guard.isActive) (this.clearPending(), oo.proceed().then((Io) => It(Io)));
        return;
      }
      let Dt = aUt({
        isBg: !1,
        isLoading: guard.isActive,
        isExternalLoading: turn.isExternalLoading,
        betweenCalls: RKn(transcript.getSnapshot(), turn.stream.peekStreamingText() !== null),
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
      let Lt = (oo) => {
        let Xt = summarizeBackgroundWork(store.getState().tasks),
          peekStreamingText = turn.stream.peekStreamingText(),
          so = (peekStreamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot()),
          po = streamingTextSoFar(transcript.getSnapshot(), peekStreamingText),
          ao = lastSettledMessageUuid(transcript.getSnapshot()),
          co = aUt({
            isBg: !1,
            isLoading: guard.isActive,
            isExternalLoading: turn.isExternalLoading,
            betweenCalls: RKn(transcript.getSnapshot(), turn.stream.peekStreamingText() !== null),
            inFlight: Xt,
          });
        if (!co.ok) {
          (logEvent("tengu_left_arrow_blocked", {
            reason: fromEnum(co.reason),
            inflight_count: Xt.count,
            inflight_kinds: fromEnumArr(Xt.kinds),
          }),
            It("Cannot open agents \u2014 a foregrounded task is running."));
          return;
        }
        let bo = countCarriedSince(store.getState().tasks, At);
        if (bo > 0) {
          It(
            `Backgrounding cancelled \u2014 ${bo} Artifact comment ${plural(bo, "monitor")} started after you pressed \u2190. Press \u2190 again to review and confirm.`,
          );
          return;
        }
        let abortController = turn.abortController,
          Bo = co.via === "abort-then-fork" && !abortController ? "defer-then-fork" : co.via,
          Ro = {
            via: Bo,
            confirmedInterstitial: oo,
            inflightCount: Xt.count,
            inflightKinds: Xt.kinds,
            restartableCount: Xt.restartableCount,
            partialChars: so,
            deferWaitMs: 0,
          };
        if (Bo === "defer-then-fork") {
          let Ho = now(),
            Io = getFeatureValue_CACHED_MAY_BE_STALE("tengu_defer_cap_ms", 1e4) ?? 1e4,
            Wo = clock.setTimeout(() => {
              let mn = this.#n;
              if (!mn || mn.armedAtMs !== Ho) return;
              let tasks = store.getState().tasks,
                No = count(messageQueue.getCommandQueue(), (Fn) => !isCheckinNotification(Fn));
              if (
                No > 0 ||
                (!mn.confirmedInterstitial && countAbandonable(tasks) > 0) ||
                countCarriedSince(tasks, mn.carriedAtPress) > 0
              ) {
                if (No > 0)
                  logEvent("tengu_defer_cap_refused_queued", { queue_len: No, wait_ms: now() - Ho });
                return;
              }
              let vo = summarizeBackgroundWork(tasks),
                restartableCount = vo.restartableCount;
              if (restartableCount > 0) {
                (logEvent("tengu_defer_cap_refused_restartable", {
                  restartable_count: restartableCount,
                  wait_ms: now() - Ho,
                }),
                  It(waitingForSubagentsMessage(restartableCount)));
                return;
              }
              let abortController = turn.abortController;
              if (abortController && !abortController.signal.aborted && guard.isActive) {
                if (getInputValue().trim() !== "") {
                  (logEvent("tengu_defer_cap_cancelled_draft", { wait_ms: now() - Ho }),
                    this.clearPending(),
                    It(UNSENT_INPUT_BLOCK));
                  return;
                }
                if (topBlockingDialog(dialogStore.getState()) !== null) {
                  (logEvent("tengu_defer_cap_refused_ask", { wait_ms: now() - Ho }),
                    It(WAITING_FOR_ANSWER_MESSAGE));
                  return;
                }
                let peekStreamingText = turn.stream.peekStreamingText();
                ((this.#n = null),
                  this.#g({
                    via: "abort-then-fork",
                    replyOnResume: !0,
                    confirmedInterstitial: mn.confirmedInterstitial,
                    inflightCount: vo.count,
                    inflightKinds: vo.kinds,
                    restartableCount: vo.restartableCount,
                    partialChars:
                      (peekStreamingText?.length ?? 0) + streamingTextLength(transcript.getSnapshot()),
                    partialText: streamingTextSoFar(transcript.getSnapshot(), peekStreamingText),
                    boundaryUuid: lastSettledMessageUuid(transcript.getSnapshot()),
                    deferWaitMs: now() - Ho,
                    deferCapFired: !0,
                    abortAfterFlush: abortController,
                  }).then(Et));
              }
            }, Io);
          ((this.#n = {
            confirmedInterstitial: oo,
            armedAtMs: Ho,
            absorbAnchorMs: Ho,
            lastPressMs: Ho,
            clearCapTimer: Wo,
            carriedAtPress: At,
            proceed: () =>
              this.#g({ ...Ro, replyOnResume: !0, deferWaitMs: now() - Ho }).then(
                (mn) => ((this.#r = !1), Ot(mn)),
              ),
          }),
            It("Backgrounding after the current tool finishes\u2026"));
          return;
        }
        if (Bo === "abort-then-fork") {
          this.#g({
            ...Ro,
            replyOnResume: !0,
            partialText: po,
            boundaryUuid: ao,
            abortAfterFlush: abortController ?? void 0,
          }).then(Et);
          return;
        }
        this.#g({ ...Ro, replyOnResume: isAtResumePoint(this.#s, transcript.getSnapshot()) }).then(Et);
      };
      if (leftArrowNeedsInterstitial(tasks, kt)) {
        let oo = wi(tasks, (co) => isAdoptableTask(co, kt) || isCarriedFrameLiveWatch(co)),
          summary = backgroundWorkSummary(oo, { cronFilter: (co) => !isAdoptableCron(co, kt) }).summary,
          io = summary !== "",
          size = At.size,
          po = countAdoptable(tasks, kt) - size,
          ao = countLiveWorkflowAgents(tasks, kt);
        ((this.#o = { inFlight: rt, carryOverCount: po, workflowAgents: ao, proceed: () => Lt(io) }),
          this.#e
            .requestDialog(LEFT_ARROW_CONFIRM_DIALOG, {
              summary: summary,
              carryOverCount: po,
              monitorParkCount: size,
              workflowAgents: ao,
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
                  ((this.#o = null), (this.#i = void 0));
                  return;
              }
            })
            .catch(logError));
        return;
      }
      Lt(!1);
    }
  };
  backgroundQuery = () => {
    let {
        store: store,
        setAppState: setAppState,
        transcript: transcript,
        turn: turn,
        messageQueue: messageQueue,
        taskRegistry: taskRegistry,
        scope: scope,
        titles: titles,
      } = this.#e,
      {
        mainLoopModel: mainLoopModel,
        customSystemPrompt: customSystemPrompt,
        appendSystemPrompt: appendSystemPrompt,
        canUseTool: canUseTool,
        fallbackModel: fallbackModel,
      } = this.#p(),
      { terminalTitle: terminalTitle } = titles.getSnapshot(),
      { mainThreadAgentDefinition: mainThreadAgentDefinition } = scope,
      { toolPermissionContext: toolPermissionContext } = store.getState();
    turn.abortController?.abort(userAbortReason("background"));
    let removeByFilter = messageQueue.removeByFilter(
      (Et) => processQueuedCommands_3(Et) && !isSlashCommand_2(Et),
    );
    (async () => {
      let toolUseContext = turn.buildToolUseContext(
          transcript.getSnapshot(),
          [],
          new AbortController(),
          mainLoopModel,
        ),
        [Dt, Lt, oo] = await Promise.all([
          getSystemPrompt(
            toolUseContext.options.tools,
            getRuntimeMainLoopModel({
              permissionMode: toolPermissionContext.mode,
              mainLoopModel: mainLoopModel,
            }),
          ),
          getOrBuildUserContext(toolUseContext.session, toolUseContext.storageV5, toolUseContext.credentials),
          getCachedSystemContext(toolUseContext.session, toolUseContext.options.cacheBreakerPhrase),
        ]),
        Xt = u6({
          mainThreadAgentDefinition: mainThreadAgentDefinition,
          toolUseContext: toolUseContext,
          customSystemPrompt: customSystemPrompt,
          defaultSystemPrompt: Dt,
          appendSystemPrompt: appendSystemPrompt,
        });
      toolUseContext.renderedSystemPrompt = Xt;
      let mapped = (
          await getQueuedCommandAttachments(removeByFilter, imageLimitsForModel(mainLoopModel)).catch(
            () => [],
          )
        ).map((Ao) => createAttachmentMessage(Ao)),
        po = new Set(),
        ao = (Ao) => Ao.replace(regExp_4_2, "");
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
        ),
        bo = cloneStickyBetaLatches(getStickyBetas());
      ((toolUseContext.stickyBetas = bo),
        (toolUseContext.onRetryStatus = void 0),
        startBackgroundSession({
          messages: [...transcript.getSnapshot(), ...filtered],
          queryParams: {
            systemPrompt: Xt,
            userContext: Lt,
            systemContext: oo,
            canUseTool: canUseTool,
            toolUseContext: toolUseContext,
            querySource: getQuerySourceForREPL(),
            fallbackModel: fallbackModel,
            stickyBetas: bo,
          },
          description: terminalTitle,
          taskRegistry: taskRegistry,
          agentDefinition: mainThreadAgentDefinition,
          setAppState: setAppState,
        }));
    })().catch(logError);
  };
  dispose() {
    (this.clearPending(), this.cancelHeldAttach(), (this.#l = void 0));
  }
}
//@ chunk-18hwfzwa.js:106953-107461 placement
function leftArrowHintText(
  h,
  {
    onDetachToCaller: onDetachToCaller,
    isLoading: isLoading,
    isExternalLoading: isExternalLoading,
    betweenCalls: betweenCalls,
    leftArrowOpensAgents: leftArrowOpensAgents,
    tabsStandIn: tabsStandIn,
  },
) {
  if (onDetachToCaller) {
    if (h.leaveEndsProcess) return;
    return { handler: onDetachToCaller, confirmHint: "Press \u2190 again to go back" };
  }
  {
    if (tabsStandIn) return;
    let Be = aUt({
      isBg: isBgSession(),
      isLoading: isLoading,
      isExternalLoading: isExternalLoading,
      betweenCalls: betweenCalls,
      inFlight: { count: 0, kinds: [] },
    });
    if (Be.ok && Be.via === "detach") return { handler: h.onBgDetach, confirmHint: LEFT_ARROW_BACK_HINT };
    if (OKn(Be) && leftArrowOpensAgents)
      return { handler: h.onLeftArrow, confirmHint: "Press \u2190 again to open agents" };
  }
  return;
}
//@ chunk-18hwfzwa.js:107461-107465 placement
j();
//@ chunk-18hwfzwa.js:107465-107469 placement
j();

export { BackgroundGesture, leftArrowHintText };
