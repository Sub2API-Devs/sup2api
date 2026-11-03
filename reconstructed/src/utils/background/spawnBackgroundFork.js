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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { mkdir, copyFile, appendFile, rm, rm as rm_2 } from "fs/promises";
import { isBgSession, clearResumeHintWorktree, getRegisteredSessionName } from "../concurrentSessions.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  sendDetachRequest,
  tce,
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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { mg, Oq } from "../messageQueueManager.js";
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
import { truncateToLength, Dr, plural } from "../stringUtils.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { YO } from "../permissions/autoModeRulesPrompt.js";
import {
  getRelaunchModel,
  xZn,
  MKo,
  _7s,
  stripChannelsArgs,
  xT,
  syn,
} from "../../services/daemon/relaunchArgs.js";
import { effortLevelValue } from "../effort.js";
import { Xse } from "../../services/daemon/processLiveness.js";
import {
  getCurrentWorktreeSession,
  isOwnedWorktreeSession,
  releaseOwnWorktreeLock,
  G8t,
} from "../worktree.js";
import { isLinkedWorktree, findCanonicalGitRoot, findGitRoot } from "../git.js";
import { getInitialSettings_2 } from "../settings/settings.js";
import { getQueuedCommandAttachments } from "../attachments.js";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { buildCronCarryAttachment } from "../../services/daemon/sessionCron.js";
import { Ozt } from "../../cost-tracker.js";
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
import { Vt } from "../agentId.js";
import { OB, getAssistantMessageText, isToolResultMessage, getUserMessageText } from "../messages.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { stripWatchArtifactArgs } from "../../cli/watchArtifactArgs.js";
import { spawnBgSession, stripResumeFlags, formatBgHints } from "../../cli/bg/bgCommands.js";
import { getJobDir, readJobState, syncJobName, writeStateAtomic } from "../../services/daemon/jobState.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { generateSessionName } from "../../commands/rename/generateSessionName.js";
import { Us } from "../../services/projects/threadRows.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { createContinuedInEntry } from "../backgroundSessionResume.js";
import { las } from "../../services/analytics/metadata.js";
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
import { fze } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { isAgentsFleetEnabled } from "../fleetGates.js";
import { NLe, backgroundWorkSummary } from "../../tasks/backgroundTaskLabels.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cr, useAppStateSession, useAppState } from "../../state/AppState.js";
import { useSetVoiceState } from "../../context/voice.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { Nu } from "../../context/QueuedMessageContext.js";
import { R, P, y } from "../../../vendor/react/cjs/react.production.js";
import { gracefulShutdown } from "../gracefulShutdown.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getPermissionModeCycle, getAlwaysAllowRules } from "../permissions/permissions.js";
import { jye } from "../proactivityLevel.js";
import { WXe } from "../../cli/bg/bgDispatch.js";
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
function selectTasks_3(Zn) {
  return Zn.tasks;
}
//@ chunk-18hwfzwa.js:64037-64599 placement
var call = async (onDone, context, args) => {
    if (isBgSession())
      return (
        logEvent("tengu_background_already_bg", {}),
        onDone(),
        sendDetachRequest({ message: tce({ kind: "leave", running: !0 }) }),
        null
      );
    if (isTranscriptPersistenceDisabled())
      return (
        onDone(
          "Cannot background \u2014 session persistence is disabled, so the forked job would have nothing to resume.",
        ),
        null
      );
    let trimmed = (args ?? "").trim(),
      ee = deriveBackgroundSeed(context.messages, trimmed);
    if (ee === null) return (onDone("Nothing to background yet \u2014 send a message first."), null);
    return e(BackgroundForkFlow, {
      onDone: onDone,
      prompt: trimmed,
      seed: ee,
      messages: context.messages,
      isMidTurn: context.isMidTurn ?? !1,
    });
  },
  bMt = 3000,
  COORDINATOR_FORK_REFUSAL = "Forking is not available in coordinator sessions. Use /branch instead.";
/**
 * 派生后台分叉会话：从当前会话（或指定叶节点）复制转录、起名，并在新的后台会话中继续；协调者模式与分叉点丢失时拒绝。
 */
//@ chunk-18hwfzwa.js:64599-71221 placement
async function spawnBackgroundFork(h, x, D, L, ee, ke, Re, Be, He, We) {
  let ze = We?.keepParent ? [] : (We?.handoffRecord?.revivals ?? vFe(mg()));
  if (We?.keepParent && isCoordinatorMode_2())
    return { ok: !1, error: COORDINATOR_FORK_REFUSAL, queued: !1, reason: "coordinator_mode" };
  let Xe = We?.keepParent ? We.resumeAtLeaf : void 0,
    rt = Xe === void 0 || Xe === null ? -1 : He.findIndex((cn) => cn.uuid === Xe);
  if (Xe !== void 0 && Xe !== null && rt < 0)
    return {
      ok: !1,
      error: "Couldn't fork \u2014 the conversation no longer contains the fork point.",
      queued: !1,
      reason: "fork_point_missing",
    };
  let kt = getReplConfigArgv(),
    At = We?.keepParent ? truncateToLength(redactSecrets(Dr(x ?? "")), 60) : "",
    It = h.name ? `${h.name} ${YO}${At ? ` ${At}` : ""}` : At ? `${YO} ${At}` : void 0,
    Ot = We?.keepParent ? { ...h, name: It, nameSource: It ? "auto" : void 0 } : h,
    Et = getRelaunchModel(),
    Dt = effortLevelValue(D),
    Lt = xZn(ee),
    oo = ke.session ?? [],
    Xt = Re.session ?? [],
    io =
      oo.length > 0 || Xt.length > 0 || Lt.length > 0
        ? { allow: [...oo], deny: [...Xt], ...(Lt.length > 0 && { addDirs: Lt }) }
        : void 0,
    filtered = (ke.cliArg ?? []).filter(MKo),
    filtered_2 = (Re.cliArg ?? []).filter(Xse),
    ao = getCurrentWorktreeSession(),
    co = !We?.keepParent && Boolean(ao && !ao.enteredExisting),
    bo = !We?.keepParent && Boolean(ao && isOwnedWorktreeSession(ao)),
    Ao = (() => {
      if (!We?.keepParent) return null;
      if (ao) return { to: ao.originalCwd, from: ao.enteredExisting ? "entered" : "owned" };
      if (!isLinkedWorktree(getOriginalCwd())) return null;
      let cn = findCanonicalGitRoot(getOriginalCwd());
      return cn && findGitRoot(cn) === cn ? { to: cn, from: "launched" } : null;
    })(),
    Bo = Ao?.to,
    Ro = getInitialSettings_2().worktree?.bgIsolation === "none",
    Ho = (() => {
      if (!We?.keepParent || Ao !== null) return;
      if (findGitRoot(getOriginalCwd()) === null) return;
      return isLinkedWorktree(getOriginalCwd()) || Ro ? "this-tree" : "own-worktree";
    })();
  if (He.length > 0 && getCaps().transcriptSource !== "ccr-api") {
    let cn = We?.isTurnLive !== !0,
      Dn =
        ze.length === 0 || !cn
          ? []
          : (await getQueuedCommandAttachments(ze, imageLimitsForModel(void 0))).map((mr) =>
              createAttachmentMessage(mr),
            ),
      wn = We?.keepParent || !cn ? [] : [We?.handoffRecord?.cronCarryNote ?? buildCronCarryAttachment(He)];
    await recordTranscript([...He, ...Dn, ...wn], void 0, void 0, He, We?.storageV5);
  }
  let Io = getCurrentSessionFile(),
    Wo = getSessionId();
  Ozt(void 0, We?.storageV5);
  let mn = !1;
  try {
    if (We?.keepParent) await saveResumePoint(He, We.storageV5);
    (await withTimeout(flushSessionStorage(), 1e4, "flush timeout"), (mn = !0));
  } catch {
    if (We?.keepParent)
      return (
        logEvent("tengu_background_spawn_failed", { via: fromEnum(Be) }),
        {
          ok: !1,
          error: "Couldn't fork \u2014 this conversation is still being saved. Try again in a moment.",
          queued: !1,
          reason: "flush_incomplete",
        }
      );
  }
  let Cn =
      We?.keepParent && Ao
        ? `This conversation was forked out of ${ao?.worktreePath ?? getOriginalCwd()}${ao?.worktreeBranch ? ` (branch ${ao.worktreeBranch})` : ""}, a linked worktree the original session is still working in \u2014 never edit files, run commands, or enter that worktree with ${ENTER_WORKTREE_TOOL_NAME}. You are in ${Ao.to}${Ro ? "" : `; before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} instead of reusing the original's${ao?.worktreeBranch ? `, and if the task builds on the original's work, base your new branch on ${ao.worktreeBranch} rather than checking that branch out (it stays checked out in the original's worktree)` : ""}`}.`
        : Ho === "own-worktree"
          ? `This conversation was forked from a session that is still working in this checkout (${getOriginalCwd()}). Before making code changes, create a new worktree of your own with ${ENTER_WORKTREE_TOOL_NAME} so your edits don't land where the original session is editing.`
          : void 0,
    No = Xe === void 0 ? He : He.slice(0, rt + 1),
    vo = Vt(Wo),
    Yo =
      Xe !== void 0 && vo !== null
        ? { type: "last-prompt", sessionId: vo, leafUuid: Xe, explicit: !0 }
        : void 0;
  if (Xe !== void 0 && Yo === void 0)
    return (
      logEvent("tengu_background_spawn_failed", { via: fromEnum(Be) }),
      {
        ok: !1,
        error: "Couldn't fork \u2014 this session's id cannot record the fork point.",
        queued: !1,
        reason: "session_id_invalid",
      }
    );
  let last = No.findLast((cn) => isLoggableMessage(cn) && !OB(cn.uuid)),
    Fn =
      Cn !== void 0 && lastResumableMessage(No) !== void 0 && last !== void 0
        ? {
            parentUuid: last.uuid,
            isSidechain: !1,
            ...createAttachmentMessage({ type: "fork_briefing", text: Cn }),
            ...transcriptStamp(Wo),
          }
        : void 0,
    bn = Io,
    Go = We?.providedSessionId,
    hn;
  if (We?.keepParent && Io !== null) {
    ((Go ??= randomUUID_2()), (hn = Go.slice(0, 8)));
    try {
      bn = await snapshotParentTranscript(Io, hn, We.storageV5, {
        required: Yo ? [Yo] : [],
        optional: Fn ? [Fn] : [],
      });
    } catch (error) {
      return (
        await removeSnapshotJobDir(hn, We.storageV5),
        logEvent("tengu_background_spawn_failed", { via: fromEnum(Be) }),
        {
          ok: !1,
          error: `Couldn't fork \u2014 ${errorMessage(error)}`,
          queued: !1,
          reason: "snapshot_copy_failed",
        }
      );
    }
  }
  let Mn = We?.keepParent ? getForkReplayLaunchConfig() : {},
    Xo =
      Cn !== void 0 && (Fn === void 0 || Io === null) && !(Mn.appendSystemPrompt ?? "").includes(Cn)
        ? Cn
        : void 0,
    Sn = [
      ...(bn !== null ? ["--resume", bn, "--fork-session"] : []),
      ...(We?.replyOnResume ? ["--reply-on-resume"] : []),
      ..._7s(We?.keepParent ? stripChannelsArgs(stripWatchArtifactArgs(kt)) : kt, ee),
      ...filtered.flatMap((cn) => ["--allowed-tools", cn]),
      ...filtered_2.flatMap((cn) => ["--disallowed-tools", cn]),
      ...(Et ? ["--model", Et] : []),
      ...(Dt !== void 0 ? ["--effort", Dt] : []),
      "--permission-mode",
      L,
      ...(We?.proactivityLevel !== void 0 ? ["--proactivity", We.proactivityLevel] : []),
      ...xT("--agent", Mn.agent),
      ...xT("--agents", Mn.agents),
      ...xT("--name", We?.keepParent ? void 0 : We?.workerName),
      ...xT(
        "--append-system-prompt",
        [Mn.appendSystemPrompt, Xo].filter(Boolean).join(`

`) || void 0,
      ),
      ...xT("--system-prompt-snapshot", syn(Mn.systemPromptSnapshot)),
      ...(x ? ["--", x] : []),
    ],
    $n = He.at(-1)?.timestamp,
    on = await spawnBgSession(
      Sn,
      Go,
      "repl",
      Bo ?? ao?.worktreePath ?? getOriginalCwd(),
      {
        ...Ot,
        ...(We?.keepParent && { bgIsolation: "default" }),
        ...(We?.keepParent &&
          $n !== void 0 && {
            forkSourceAlive: !0,
            forkBoundaryAt: $n,
            forkSessionId: Go,
            forkParentSessionId: getSessionId(),
          }),
        worktree: co
          ? {
              path: ao.worktreePath,
              branch: ao.worktreeBranch,
              hookBased: ao.hookBased ?? !1,
              originCwd: ao.originalCwd,
            }
          : void 0,
        sessionPermissionRules: io,
        memoryToggledOff: getMemoryToggledOff() || void 0,
        autoMemoryOffThisSession: getAutoMemoryOffThisSession() || void 0,
        inFlight: We?.taskFreeInFlight,
      },
      We?.extraEnv,
      void 0,
      We?.storageV5,
    ).catch((cn) => ({
      ok: !1,
      error: `Couldn't ${We?.keepParent ? "fork" : "background"} \u2014 ${errorMessage(cn)}`,
      reason: void 0,
    }));
  if (!on.ok) {
    if ((logEvent("tengu_background_spawn_failed", { via: fromEnum(Be) }), hn !== void 0 && !on.alive))
      removeSnapshotJobDir(hn, We?.storageV5);
    let cn = !1;
    if (Be === "left_arrow" && We?.providedSessionId !== void 0 && Io !== null && !on.alive) {
      let Dn = getJobDir(We.providedSessionId.slice(0, 8)),
        wn = await readJobState(Dn, We.storageV5);
      if (wn)
        cn = await queueRescueRow({
          sessionFile: Io,
          forkSessionId: We.providedSessionId,
          jobDir: Dn,
          prev: wn,
          forkArgs: Sn,
          storageV5: We.storageV5,
        });
      if (cn && mn) await appendContinuedInRecord(Io, Wo, We.providedSessionId, We.storageV5);
      if (cn && ao) {
        if (bo) await releaseOwnWorktreeLock(ao.worktreePath, ao.originalCwd);
        (G8t(null), clearResumeHintWorktree());
      }
    }
    if (Be === "left_arrow")
      if (cn) logFeatureSad("repl_background_fork", "queued_for_later");
      else logFeatureBad("repl_background_fork", "spawn_failed");
    return { ok: !1, error: on.error, queued: cn, reason: on.reason, alive: on.alive };
  }
  if ((logEvent("tengu_background", { via_flag: !1, via: fromEnum(Be) }), Be === "left_arrow"))
    logFeatureOk("repl_background_fork");
  let _o = on.sessionId ?? Go;
  if (!We?.keepParent && Io !== null && _o !== void 0)
    await appendContinuedInRecord(Io, Wo, _o, We?.storageV5);
  if (ao && !We?.keepParent) {
    if (bo) await releaseOwnWorktreeLock(ao.worktreePath, ao.originalCwd);
    (G8t(null), clearResumeHintWorktree());
  }
  if (Ot.name === void 0 && on.sessionId && !We?.keepParent) {
    let short = on.short,
      Dn = generateSessionName(Us([...He]), AbortSignal.timeout(bMt), { credentials: We?.credentials })
        .then((wn) => (wn ? syncJobName(short, wn, "auto", We?.storageV5) : void 0))
        .catch(() => {});
    if (Be === "command") registerCleanup(() => Dn);
  }
  return {
    ok: !0,
    short: on.short,
    sessionId: on.sessionId ?? Go,
    handedOff: co,
    hadWorktree: ao !== null,
    relocatedTo: Bo,
    relocatedFrom: Ao?.from,
    name: Ot.name,
    rosterName: Ot.name || Ot.intent || on.short,
    editsIn: Ho,
  };
}
//@ chunk-18hwfzwa.js:71221-71427 placement
async function appendContinuedInRecord(h, x, D, L) {
  let ee = Vt(x),
    ke = Vt(D);
  if (ee === null || ke === null) return;
  await appendEntryToFileAsync(h, createContinuedInEntry(ee, ke), L, { onlyIfExists: !0 }).catch((Re) => {
    logForDebugging(`[bg] continued-in record not written: ${errorMessage(Re)}`, { level: "warn" });
  });
}
//@ chunk-18hwfzwa.js:71427-72536 placement
async function snapshotParentTranscript(h, x, D, L = { required: [], optional: [] }) {
  let ee = join_3(getJobDir(x), ...las),
    ke = getTranscriptStorageKey(h, D),
    Re;
  if (ke !== void 0 && isValidKeySegment(x)) {
    let job = STORAGE_SPACES.job(x, [...las]),
      copy = await ke.backend.copy(ke.key, job);
    if (!copy.ok) {
      let code = copy.error.code,
        Xe = "telemetryCode" in copy.error ? copy.error.telemetryCode : void 0;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `snapshot copy failed: ${code}${Xe === void 0 ? "" : ` ${Xe}`}`,
        "snapshot copy failed",
      );
    }
    Re = async (ze) => {
      let updateText = await ke.backend.updateText(job, (rt) =>
        rt === void 0 ? { skip: !0 } : { write: rt.value + ze },
      );
      if (!updateText.ok) return formatStorageError(updateText.error);
      return updateText.value.written ? void 0 : "snapshot gone";
    };
  } else
    (await mkdir(dirname(ee), { recursive: !0, mode: 448 }),
      await copyFile(h, ee),
      (Re = (He) =>
        appendFile(ee, He, { mode: 384 }).then(
          () => {
            return;
          },
          (We) => errorMessage(We),
        )));
  let Be = (He) =>
    `
` +
    He.map((We) => jsonStringify(We)).join(`
`) +
    `
`;
  if (L.required.length > 0) {
    let He = await Re(Be(L.required));
    if (He !== void 0)
      throw (
        logForDebugging(`[bg] fork point not written to snapshot: ${He}`, { level: "error" }),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "the fork point could not be written to the snapshot",
          "snapshot trailer append failed",
        )
      );
  }
  if (L.optional.length > 0) {
    let He = await Re(Be(L.optional));
    if (He !== void 0)
      logForDebugging(`[bg] fork briefing not written to snapshot: ${He}`, { level: "warn" });
  }
  return ee;
}
//@ chunk-18hwfzwa.js:72536-72705 placement
async function removeSnapshotJobDir(h, x) {
  if (x !== void 0 && isValidKeySegment(h)) {
    await x.deleteScope({ namespace: "job", jobId: h }).catch(() => {});
    return;
  }
  await rm_2(getJobDir(h), { recursive: !0, force: !0 }).catch(() => {});
}
//@ chunk-18hwfzwa.js:72705-73174 placement
async function queueRescueRow(h) {
  let {
      sessionFile: sessionFile,
      forkSessionId: forkSessionId,
      jobDir: jobDir,
      prev: prev,
      forkArgs: forkArgs,
      storageV5: storageV5,
    } = h,
    Be = join_3(dirname(sessionFile), `${forkSessionId}.jsonl`);
  return copyTranscriptForRescue(sessionFile, Be, storageV5)
    .then(() =>
      writeStateAtomic(
        jobDir,
        {
          ...prev,
          state: "failed",
          tempo: "idle",
          needs: void 0,
          block: void 0,
          inFlight: void 0,
          detail: "couldn't start in the background \u2014 press Enter to retry",
          linkScanPath: Be,
          respawnFlags: splitForwardableArgs(stripResumeFlags(forkArgs)),
          updatedAt: new Date().toISOString(),
        },
        storageV5,
      ).catch(async (He) => {
        throw (await deleteFileOrStoreEntry(Be, storageV5), He);
      }),
    )
    .then(
      () => !0,
      (He) => (logError(He), !1),
    );
}
/**
 * 把会话记录复制到救援会话的存储键下，失败时清理目标。
 */
//@ chunk-18hwfzwa.js:73174-73543 placement
async function copyTranscriptForRescue(h, x, D) {
  let L = getTranscriptStorageKey(h, D),
    ee = getTranscriptStorageKey(x, D);
  if (L !== void 0 && ee !== void 0) {
    let copy = await L.backend.copy(L.key, ee.key);
    if (!copy.ok) {
      await ee.backend.delete(ee.key).catch(() => {});
      let code = copy.error.code,
        Be = "telemetryCode" in copy.error ? copy.error.telemetryCode : void 0;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `rescue copy failed: ${code}${Be === void 0 ? "" : ` ${Be}`}`,
        "rescue copy failed",
      );
    }
    return;
  }
  await copyFile(h, x);
}
/**
 * 删除一个文件：若路径映射到存储后端则删后端键，否则 rm -f。与 pane 后端无关。
 */
//@ chunk-18hwfzwa.js:73543-73685 placement = getPaneBackendExecutor (0.689)
async function deleteFileOrStoreEntry(filePath, x) {
  let D = getTranscriptStorageKey(filePath, x);
  if (D !== void 0) {
    await D.backend.delete(D.key).catch(() => {});
    return;
  }
  await rm_2(filePath, { force: !0 }).catch(() => {});
}
//@ chunk-18hwfzwa.js:73685-73839 placement
async function writeAdoptHandoff(h, x, D) {
  let L = getJobDir(h),
    ee = isStorageV5Enabled() && D !== void 0 ? D : void 0;
  if (ee === void 0) await mkdir(L, { recursive: !0, mode: 448 });
  await writeAdoptJson(L, x, { parent: "create" }, ee);
}
/**
 * 生成 Artifact 评论监视器未能转到后台会话时的提示。
 */
//@ chunk-18hwfzwa.js:73839-74205 placement
function frameLiveTransferNote(h) {
  let x =
      h.frameLiveLost > 0
        ? `
Couldn't move ${h.frameLiveLost} ${plural(h.frameLiveLost, "Artifact comment monitor")} to the background session, so automatic replies stopped. Publish ${h.frameLiveLost === 1 ? "the Artifact" : "each Artifact"} again to turn them back on.`
        : "",
    D =
      h.ok && h.adopted.adopted_frame_live > 0
        ? `
${artifactRepliesStopNotice(h.adopted.adopted_frame_live)}`
        : "";
  return x + D;
}
//@ chunk-18hwfzwa.js:74205-75541 placement
async function forkSessionToBackground(h) {
  let x = takeHandoffRecord(h.messages, h.queue),
    D = await serializeAdoptable(h.tasks, h.queue),
    L;
  if (D) {
    L = randomUUID_2();
    let We = !1;
    try {
      (await writeAdoptHandoff(L.slice(0, 8), D.payload, h.storageV5),
        (We = !0),
        await D.checkpointAgents(h.taskRegistry));
    } catch {
      if (((L = void 0), D.payload.frameLive !== void 0))
        logFeatureSad(
          "artifact_live_subscribe",
          We ? "consent_carry_checkpoint_failed" : "consent_carry_write_failed",
        );
    }
  }
  let ee = await confirmRelaunch(
      h.messages,
      "background_handoff",
      { responseStreaming: h.responseStreaming ?? h.isMidTurn },
      h.storageV5,
    ),
    ke = await settleSeedName(h.seed, h.storageV5),
    Re = ke.name !== h.seed.name ? ke.name : void 0,
    Be = await spawnBackgroundFork(
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
        handoffRecord: x,
        workerName: Re,
        taskFreeInFlight: D && L && carriesTasks(D.payload) ? void 0 : { tasks: 0, queued: 0, kinds: [] },
        storageV5: h.storageV5,
        credentials: h.credentials,
      },
    ).catch((We) => {
      throw (fze(), We);
    });
  if (Be.ok) {
    if (D && L) D.disown(h.taskRegistry);
    return {
      ...Be,
      adopted: adoptedCounts(L ? D?.payload : null),
      frameLiveLost: L === void 0 ? (D?.payload.frameLive?.length ?? 0) : 0,
    };
  }
  if (L) D?.abandon();
  let He = D?.payload.frameLive?.length ?? 0;
  if (h.exitsAfterward && L && He > 0) logFeatureSad("artifact_live_subscribe", "adopt_spawn_failed");
  return {
    ok: !1,
    error: withRelaunchHint(Be.error, ee, { exitsAfterward: h.exitsAfterward }),
    frameLiveLost: h.exitsAfterward ? He : 0,
  };
}
//@ chunk-18hwfzwa.js:75541-75608 placement
function canBackgroundSession(h) {
  return (
    isAgentsFleetEnabled() &&
    !isBgSession() &&
    !isTranscriptPersistenceDisabled() &&
    NLe() &&
    deriveBackgroundSeed(h, "") !== null
  );
}
//@ chunk-18hwfzwa.js:75608-77358 placement
function BackgroundAndExit(h) {
  let $ = w(11),
    { messages: messages, isMidTurn: isMidTurn, responseStreaming: responseStreaming } = h,
    ee = Cr(),
    ke = useSetVoiceState(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    He = Nu(),
    We = R(!1),
    Xe,
    rt;
  if (
    $[0] !== credentials ||
    $[1] !== isMidTurn ||
    $[2] !== messages ||
    $[3] !== He ||
    $[4] !== responseStreaming ||
    $[5] !== storageV5 ||
    $[6] !== ee ||
    $[7] !== ke
  )
    ((Xe = () => {
      if (We.current) {
        return;
      }
      We.current = !0;
      let kt = deriveBackgroundSeed(messages, "");
      if (kt === null) {
        (logFeatureBad("bg_exit_dialog_background", "no_seed"),
          gracefulShutdown(0, "prompt_input_exit", {
            finalMessage: "Nothing to background \u2014 exiting.",
          }));
        return;
      }
      (async () => {
        let state = ee.getState();
        let It = computeAdoptability(state.tasks);
        let Ot = countLiveWorkflowAgents(state.tasks, It);
        let Lt = backgroundWorkSummary(
          wi(state.tasks, (Et) => isAdoptableTask(Et, It) || isCarriedFrameLiveWatch(Et)),
          { cronFilter: (Dt) => !isAdoptableCron(Dt, It) },
        );
        let oo = await forkSessionToBackground({
          seed: kt,
          prompt: null,
          messages: messages,
          exitsAfterward: !0,
          isMidTurn: isMidTurn,
          responseStreaming: responseStreaming,
          sessionEffort: state.sessionEffort,
          permissionMode: getPermissionModeCycle(state),
          proactivityLevel: jye(state),
          additionalWorkingDirectories: state.toolPermissionContext.additionalWorkingDirectories,
          alwaysAllowRules: state.toolPermissionContext.alwaysAllowRules,
          alwaysDenyRules: state.toolPermissionContext.alwaysDenyRules,
          tasks: state.tasks,
          taskRegistry: ke,
          queue: He,
          storageV5: storageV5,
          credentials: credentials,
        });
        if (oo.ok) {
          logFeatureOk("bg_exit_dialog_background");
          let Xt =
            Lt.count > 0
              ? `
${Lt.summary} couldn't be moved and ${Lt.count === 1 ? "was" : "were"} stopped.`
              : "";
          let io = describeCarriedTasks(Ot);
          (WXe(storageV5, !0),
            await gracefulShutdown(0, "prompt_input_exit", {
              suppressResumeHint: !0,
              finalMessage:
                formatBgHints(oo.short, oo.handedOff ? "(worktree handed off)" : void 0) +
                Xt +
                (io
                  ? `
${io}`
                  : "") +
                frameLiveTransferNote(oo),
            }));
        } else
          (logFeatureBad("bg_exit_dialog_background", "spawn_failed"),
            await gracefulShutdown(0, "prompt_input_exit", {
              finalMessage: oo.error + frameLiveTransferNote(oo),
            }));
      })();
    }),
      (rt = [messages, isMidTurn, responseStreaming, ee, ke, storageV5, credentials, He]),
      ($[0] = credentials),
      ($[1] = isMidTurn),
      ($[2] = messages),
      ($[3] = He),
      ($[4] = responseStreaming),
      ($[5] = storageV5),
      ($[6] = ee),
      ($[7] = ke),
      ($[8] = Xe),
      ($[9] = rt));
  else ((Xe = $[8]), (rt = $[9]));
  P(Xe, rt);
  let so;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((so = e(Text, { dimColor: !0, children: "Moving to background\u2026" })), ($[10] = so));
  else so = $[10];
  return so;
}
//@ chunk-18hwfzwa.js:77358-78019 placement
function deriveBackgroundSeed(h, x, D = "(backgrounded)") {
  let L = x,
    ee = !1,
    ke;
  for (let ze = h.length - 1; ze >= 0; ze--) {
    let Xe = h[ze];
    if (Xe.type === "assistant" && ke === void 0) {
      let rt = getAssistantMessageText(Xe);
      if (rt) ke = truncateToLength(rt.replace(/\s+/g, " ").trim(), 120);
    }
    if (Xe.type === "user" && !Xe.isMeta && !isToolResultMessage(Xe)) {
      let rt = getUserMessageText(Xe)?.trim();
      if (rt && isLocalCommandMarkup(rt)) {
        if (rt.startsWith(`<${COMMAND_MESSAGE}>`)) ee = !0;
        if (rt.startsWith(`<${BASH_STDOUT}>`) || rt.startsWith(`<${BASH_STDERR}>`)) ee = !0;
        continue;
      }
      if (((ee = !0), !L && rt)) L = rt;
    }
    if (ee && L && ke !== void 0) break;
  }
  if (!ee && !x) return null;
  let Re = getCurrentSessionTitle(getSessionId()),
    Be = getCurrentSessionAiTitle(getSessionId()),
    He = getRegisteredSessionName(),
    We = getCurrentSessionAgentColor();
  return {
    intent: truncateToLength(L || D, 200),
    name: Re ?? Be,
    nameSource: Re
      ? He?.source === "collision" && He.name === Re
        ? "collision"
        : "user"
      : Be
        ? "auto"
        : void 0,
    color: isAgentColorName(We) ? We : void 0,
    detail: ke,
  };
}
/**
 * /background 与退出时“移到后台”的完整流程组件：确认、生成种子名、调用 spawnBackgroundFork 把当前对话 fork 成后台作业，处理拒绝(tengu_background_declined)与失败提示。
 */
//@ chunk-18hwfzwa.js:78019-82204 placement
function BackgroundForkFlow(h) {
  let $ = w(81),
    { onDone: onDone, prompt: prompt, seed: seed, messages: messages, isMidTurn: isMidTurn } = h,
    Re = useAppStateSession(),
    Be = useAppState(selectSessionEffort),
    He = useAppState(getPermissionModeCycle),
    We = useAppState(jye),
    ze = useAppState(allWorkingDirectories_2),
    Xe = useAppState(getAlwaysAllowRules),
    rt = useAppState(selectToolPermissionContextAlwaysDenyRules),
    kt = useAppState(selectTasks_3),
    At = useSetVoiceState(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Et = Nu(),
    Lt;
  if ($[0] !== kt) ((Lt = backgroundWorkSummary(kt)), ($[0] = kt), ($[1] = Lt));
  else Lt = $[1];
  let oo = Lt,
    Xt,
    io,
    so,
    po;
  if ($[2] !== kt) {
    let ao = computeAdoptability(kt);
    let size = carriedFrameLiveSlugs(kt).size;
    Xt = countAdoptable(kt, ao) - size;
    io = size;
    so = countLiveWorkflowAgents(kt, ao);
    po = backgroundWorkSummary(
      wi(kt, (bo) => isAdoptableTask(bo, ao) || isCarriedFrameLiveWatch(bo)),
      { cronFilter: (Ao) => !isAdoptableCron(Ao, ao) },
    );
    (($[2] = kt), ($[3] = Xt), ($[4] = io), ($[5] = so), ($[6] = po));
  } else ((Xt = $[3]), (io = $[4]), (so = $[5]), (po = $[6]));
  let Bo;
  if ($[7] !== Xt || $[8] !== io || $[9] !== so || $[10] !== po)
    ((Bo = { carryOverCount: Xt, monitorParkCount: io, workflowAgents: so, abandonable: po }),
      ($[7] = Xt),
      ($[8] = io),
      ($[9] = so),
      ($[10] = po),
      ($[11] = Bo));
  else Bo = $[11];
  let {
      carryOverCount: carryOverCount,
      monitorParkCount: monitorParkCount,
      workflowAgents: workflowAgents,
      abandonable: abandonable,
    } = Bo,
    [mn, Cn] = y(abandonable.count === 0 && workflowAgents.running === 0),
    No = R(!1),
    vo;
  if (
    $[12] !== abandonable.count ||
    $[13] !== ze ||
    $[14] !== Xe ||
    $[15] !== rt ||
    $[16] !== Re ||
    $[17] !== carryOverCount ||
    $[18] !== mn ||
    $[19] !== credentials ||
    $[20] !== oo.count ||
    $[21] !== isMidTurn ||
    $[22] !== messages ||
    $[23] !== onDone ||
    $[24] !== He ||
    $[25] !== We ||
    $[26] !== prompt ||
    $[27] !== Et ||
    $[28] !== seed ||
    $[29] !== Be ||
    $[30] !== storageV5 ||
    $[31] !== At ||
    $[32] !== kt ||
    $[33] !== workflowAgents
  )
    ((vo = () => {
      if (!mn || No.current) {
        return;
      }
      ((No.current = !0),
        (async () => {
          let Yo = await forkSessionToBackground({
            seed: seed,
            prompt: prompt,
            messages: messages,
            isMidTurn: isMidTurn,
            sessionEffort: Be,
            permissionMode: He,
            proactivityLevel: We,
            additionalWorkingDirectories: ze,
            alwaysAllowRules: Xe,
            alwaysDenyRules: rt,
            tasks: kt,
            taskRegistry: At,
            queue: Et,
            storageV5: storageV5,
            credentials: credentials,
          });
          if (Yo.ok)
            (logEvent("tengu_background_fork", {
              confirmed: abandonable.count > 0 || workflowAgents.running > 0,
              inflight_count: oo.count,
              carryover_count: carryOverCount,
              workflow_agent_count: workflowAgents.running,
              mid_turn: isMidTurn,
              had_prompt: prompt.length > 0,
              had_worktree: Yo.hadWorktree,
              worktree_handed_off: Yo.handedOff,
              ...Yo.adopted,
            }),
              onDone(),
              WXe(storageV5, !0),
              await gracefulShutdown(0, "prompt_input_exit", {
                suppressResumeHint: !0,
                finalMessage:
                  formatBgHints(Yo.short, Yo.handedOff ? "(worktree handed off)" : void 0) +
                  frameLiveTransferNote(Yo),
              }));
          else
            onDone(
              isBridgeOrTransport(Re)
                ? withResumeFlag(
                    "Couldn't start the background session (detail withheld on this connection).",
                    Yo.error,
                  )
                : Yo.error,
            );
        })());
    }),
      ($[12] = abandonable.count),
      ($[13] = ze),
      ($[14] = Xe),
      ($[15] = rt),
      ($[16] = Re),
      ($[17] = carryOverCount),
      ($[18] = mn),
      ($[19] = credentials),
      ($[20] = oo.count),
      ($[21] = isMidTurn),
      ($[22] = messages),
      ($[23] = onDone),
      ($[24] = He),
      ($[25] = We),
      ($[26] = prompt),
      ($[27] = Et),
      ($[28] = seed),
      ($[29] = Be),
      ($[30] = storageV5),
      ($[31] = At),
      ($[32] = kt),
      ($[33] = workflowAgents),
      ($[34] = vo));
  else vo = $[34];
  let kn;
  if (
    $[35] !== ze ||
    $[36] !== Xe ||
    $[37] !== rt ||
    $[38] !== Re ||
    $[39] !== mn ||
    $[40] !== credentials ||
    $[41] !== oo.count ||
    $[42] !== isMidTurn ||
    $[43] !== messages ||
    $[44] !== onDone ||
    $[45] !== He ||
    $[46] !== We ||
    $[47] !== prompt ||
    $[48] !== Et ||
    $[49] !== seed ||
    $[50] !== Be ||
    $[51] !== storageV5 ||
    $[52] !== At ||
    $[53] !== kt
  )
    ((kn = [
      mn,
      Be,
      He,
      We,
      ze,
      Xe,
      rt,
      oo.count,
      isMidTurn,
      seed,
      onDone,
      prompt,
      messages,
      kt,
      At,
      storageV5,
      credentials,
      Et,
      Re,
    ]),
      ($[35] = ze),
      ($[36] = Xe),
      ($[37] = rt),
      ($[38] = Re),
      ($[39] = mn),
      ($[40] = credentials),
      ($[41] = oo.count),
      ($[42] = isMidTurn),
      ($[43] = messages),
      ($[44] = onDone),
      ($[45] = He),
      ($[46] = We),
      ($[47] = prompt),
      ($[48] = Et),
      ($[49] = seed),
      ($[50] = Be),
      ($[51] = storageV5),
      ($[52] = At),
      ($[53] = kt),
      ($[54] = kn));
  else kn = $[54];
  if ((P(vo, kn), mn)) {
    let Fn;
    if ($[55] === MEMO_CACHE_SENTINEL)
      ((Fn = e(Text, { dimColor: !0, children: "Backgrounding\u2026" })), ($[55] = Fn));
    else Fn = $[55];
    return Fn;
  }
  let Fn;
  if ($[56] !== oo.count || $[57] !== onDone)
    ((Fn = () => {
      (logEvent("tengu_background_declined", { inflight_count: oo.count }), onDone());
    }),
      ($[56] = oo.count),
      ($[57] = onDone),
      ($[58] = Fn));
  else Fn = $[58];
  let bn = Fn;
  const Go = abandonable.count > 0 ? `${abandonable.summary} will be stopped.` : "";
  let hn;
  if ($[59] !== monitorParkCount)
    ((hn = artifactRepliesStopNotice(monitorParkCount)), ($[59] = monitorParkCount), ($[60] = hn));
  else hn = $[60];
  let Mn;
  if ($[61] !== carryOverCount)
    ((Mn =
      carryOverCount > 0
        ? `${carryOverCount} ${plural(carryOverCount, "task")} will carry over to the background session.`
        : ""),
      ($[61] = carryOverCount),
      ($[62] = Mn));
  else Mn = $[62];
  let Xo;
  if ($[63] !== workflowAgents)
    ((Xo = describeCarriedTasks(workflowAgents)), ($[63] = workflowAgents), ($[64] = Xo));
  else Xo = $[64];
  let Sn;
  if ($[65] !== Go || $[66] !== hn || $[67] !== Mn || $[68] !== Xo)
    ((Sn = [Go, hn, Mn, Xo].filter(Boolean)),
      ($[65] = Go),
      ($[66] = hn),
      ($[67] = Mn),
      ($[68] = Xo),
      ($[69] = Sn));
  else Sn = $[69];
  const joined = Sn.join(" ");
  let _o;
  if ($[70] !== abandonable.count || $[71] !== workflowAgents)
    ((_o =
      abandonable.count > 0
        ? `Background anyway (${abandonable.count} ${plural(abandonable.count, "task")} will be stopped)`
        : backgroundAnywayLabel(!1, workflowAgents)),
      ($[70] = abandonable.count),
      ($[71] = workflowAgents),
      ($[72] = _o));
  else _o = $[72];
  let cn;
  if ($[73] === MEMO_CACHE_SENTINEL) ((cn = () => Cn(!0)), ($[73] = cn));
  else cn = $[73];
  let Dn;
  if ($[74] !== bn || $[75] !== _o)
    ((Dn = e(ConfirmSelect, { confirmLabel: _o, cancelLabel: "Stay", onConfirm: cn, onCancel: bn })),
      ($[74] = bn),
      ($[75] = _o),
      ($[76] = Dn));
  else Dn = $[76];
  let wn;
  if ($[77] !== bn || $[78] !== joined || $[79] !== Dn)
    ((wn = e(Dialog, { title: "Background this session?", subtitle: joined, onCancel: bn, children: Dn })),
      ($[77] = bn),
      ($[78] = joined),
      ($[79] = Dn),
      ($[80] = wn));
  else wn = $[80];
  return wn;
}
//@ chunk-18hwfzwa.js:82204-82267 placement
function takeHandoffRecord(h, x) {
  return { revivals: vFe(x), cronCarryNote: buildCronCarryAttachment(h) };
}
//@ chunk-18hwfzwa.js:82267-82354 placement
function vFe(h) {
  return h.getCommandQueue().filter((x) => x.userResumeNotice === !0 && Oq(x));
}

export {
  takeHandoffRecord,
  deriveBackgroundSeed,
  spawnBackgroundFork,
  BackgroundAndExit,
  canBackgroundSession,
  COORDINATOR_FORK_REFUSAL,
};
