/**
 * tasks/resumeOrphanedTasks.ts
 *
 * 2.1.316 新增：恢复会话时处理上个进程遗留的后台任务（代理、shell、workflow）：重启、补发完成通知或标记孤儿
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (22)
 * attribution: placement 22
 */
import { lstat, stat } from "fs/promises";
import { t7n, enqueuePendingNotification } from "../utils/messageQueueManager.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import {
  relinkAdoptedAgentSymlinks,
  ADOPT_ID_PATTERN,
  ADOPT_ID_MAX_CHARS,
  noticeDescriptionOf,
  noticeFieldOf,
  WORKFLOW_RUN_ID_MAX_CHARS,
} from "../utils/background/adopt.js";
import { parseForkMarker } from "../utils/conversationRecovery.js";
import { env } from "../utils/env.js";
import { getSessionId, isDiskless, getMainThreadAgentType, mainAgentId } from "../bootstrap/state.js";
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { appendForkSourceNote } from "../utils/forkSourceNote.js";
import { logError } from "../utils/log.js";
import {
  logResurrectedCrons,
  handleMissedLoopWakeups,
  isOlderVersion,
  ds,
  Jt,
  cs,
  cronOwnership,
  ho,
  Zt,
  RELAUNCH_ADVICE,
} from "../utils/cronResume.js";
import { syncLiveInFlightSnapshot } from "../services/daemon/jobState.js";
import { summarizeBackgroundWork } from "./backgroundTaskLabels.js";
import { TASK_ID, TASK_NOTIFICATION, STATUS, NOTE, SUMMARY } from "../constants/xml.js";
import { regExp as regExp_11, formatTaskNotification } from "../utils/xmlTags.js";
import { TASKSTOP, TASK_STOP_ALIASES } from "../tools/TaskStopTool/prompt.js";
import { SENDMESSAGE, hasSendMessageTool } from "../tools/SendMessageTool/constants.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { isAgentLaunchToolUse } from "../tools/AgentTool/agentLaunch.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { isBareTaskNotificationOrigin, k2t, zfe } from "../utils/backgroundSessionResume.js";
import { nss, emitTaskNotification } from "../utils/task/taskNotifications.js";
import { unescapeHtmlEntities, escapeXml_2 as escapeXml } from "../utils/confusables.js";
import { o6s } from "./LocalAgentTask/agentHandback.js";
import { Um } from "../utils/agentId.js";
import { CRON_CREATE_TOOL_NAME, CRON_DELETE_TOOL_NAME } from "../tools/ScheduleCronTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { B6e } from "../utils/messageKinds.js";
import { convertToolProgressMessage } from "../remote/sdkMessageAdapter.js";
import { parseForkedSkillLaunches } from "../utils/xmlTagText.js";
import { readCarriedCrons, readEndedCronIds, HM } from "../services/compact/compactCarry.js";
import {
  getAgentTranscriptPath,
  getAgentTranscriptStorageKey,
  readAgentMetadata,
  canFetchAgentTranscriptsOnDemand,
} from "../utils/sessionStorage.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { enqueueOrphanedTasksNotification } from "./RemoteAgentTask/RemoteAgentTask.js";
import { makeSidecarReadFallback } from "../utils/agentMetadata.js";
import { WORKFLOW_RUN_ID_PATTERN } from "../tools/WorkflowTool/constants.js";

//@ chunk-0sfjpx19.js:51318-51404 placement
function mo(e) {
  return t7n().some((n) => typeof n.value === "string" && n.value.includes(e));
}
//@ chunk-0sfjpx19.js:51404-52114 placement
async function formatOrphanSummary(e, n, r, s, h, y, _, b) {
  if (isStorageV5Enabled() && h !== void 0) await relinkAdoptedAgentSymlinks({ storageV5: h });
  let k = parseForkMarker(env.CLAUDE_CODE_RESUME_SOURCE_ALIVE),
    w = e;
  if (k !== null) {
    if (k.parentSessionId !== void 0 && k.parentSessionId === getSessionId()) return;
    if (k.sessionId === void 0 || k.sessionId === getSessionId()) {
      let S = /^\d{4}-\d{2}-\d{2}T/.test(k.boundaryAt) ? Date.parse(k.boundaryAt) : Number.NaN;
      if (Number.isNaN(S)) return;
      if (
        ((w = e.filter((T) => Date.parse(T.timestamp) > S)),
        isCrossSessionMessagingEnabled() && k.sessionId !== void 0 && k.parentSessionId !== void 0)
      )
        appendForkSourceNote(w, k.parentSessionId, k.boundaryAt).catch(logError);
    }
  }
  if (y !== void 0) w = w.filter((S) => !y.has(S.uuid));
  try {
    let S = planResumeOfBackgroundTasks(w, { carriedCrons: !0 });
    if ((logResurrectedCrons(S), r !== void 0))
      try {
        await handleMissedLoopWakeups(S);
      } catch (error) {
        logError(error);
      }
    (await resumeAsyncAgents(S, n, r, s, h, _),
      resumeLocalShellTasks(S, n),
      resumeLocalWorkflows(S, n, b),
      syncLiveInFlightSnapshot(summarizeBackgroundWork(n.all()), h));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0sfjpx19.js:52114-52301 placement
var TASK_NOTIFICATION_KILLED_PATTERN = new RegExp(`<${TASK_ID}>([^<]+)</${TASK_ID}>`, "g"),
  Ki = `<${TASK_NOTIFICATION}>`,
  Qi = `<${STATUS}>`,
  regExp = new RegExp(`${regExp_11.source}killed</`),
  at = 20,
  Yi = 172800000,
  ut = "__orphan_summary",
  Xt = `${ut}__:`,
  Yt = `${ut}_live__:`;
//@ chunk-0sfjpx19.js:52301-52340 placement
function Oe(e) {
  return e.startsWith(ut);
}
//@ chunk-0sfjpx19.js:52340-52523 placement
var ORPHAN_SUMMARY_NOTE =
    "Orphaned by a previous Claude Code process exit and reported in an aggregate summary.",
  bo = "stopped or paused (for example via the UI \u2014 this leaves no transcript marker)";
//@ chunk-0sfjpx19.js:52523-52599 placement
function Ve(e) {
  return `${e} didn't finish before the previous session ended`;
}
//@ chunk-0sfjpx19.js:52599-52627 placement
var Zi = new Set([TASKSTOP, ...TASK_STOP_ALIASES]);
/**
 * 恢复时清点上个进程的后台任务与 cron，规划重启、补通知、标记孤儿（约 7 KB）。
 */
//@ chunk-0sfjpx19.js:52627-59889 placement
function planResumeOfBackgroundTasks(e, { carriedCrons: n = !1 } = {}) {
  let r = !isDiskless(),
    s = [],
    h = new Map(),
    y = new Set(),
    _ = [],
    b = 0,
    k = new Map(),
    w = new Set(),
    S = new Set(),
    T = new Map(),
    D = (M) => {
      (w.add(M), S.add(M));
    },
    E = new Map(),
    N = new Map(),
    G = new Set(),
    R = new Set(),
    P = new Map(),
    U = new Set(),
    L = new Set(),
    oe = new Map(),
    te = new Map(),
    Q = new Set(),
    ne = new Set(),
    z = new Set(),
    V = new Set(),
    j = new Map();
  for (let M of e) {
    if (M.type !== "assistant" || !Array.isArray(M.message.content)) continue;
    for (let q of M.message.content) {
      if (q.type !== "tool_use") continue;
      if (Zi.has(q.name)) V.add(q.id);
      else if (q.name === SENDMESSAGE) j.set(q.id, Kt(M));
      else if (q.name === AGENT || q.name === TASK) {
        if ((Q.add(q.id), isAgentLaunchToolUse(q))) ne.add(q.id);
      } else if (q.name === SKILL) z.add(q.id);
    }
  }
  let pe = [],
    me = (M) => {
      for (let summarizedKind of M.summarizedKinds) {
        let le = summarizedKind === "agent" ? k : summarizedKind === "shell" ? E : N;
        for (let be of le.keys()) if (!M.liveExclusions.has(be)) G.add(be);
      }
    },
    ce = !1,
    Fe = (M, q) =>
      !ce && isOlderVersion(M, ds) && (q === void 0 || q === null || isBareTaskNotificationOrigin(q)),
    Ne = (M, q, le, { isOwn: isOwn, isRewritten: isRewritten, runId: runId }) => {
      let re = !isRewritten && (isOwn || Fe(M, le));
      ce ||= isOwn;
      let x = new Set();
      me(taskKindLabel(q, x));
      for (let Z of x) G.add(Z);
      let se = re ? regExp.exec(q)?.[1] : void 0;
      if (se !== void 0) {
        let Z = runId === void 0 ? void 0 : nss(runId),
          ue = unescapeHtmlEntities(se),
          ae = te.get(ue);
        if (!(Z !== void 0 && ae !== void 0 && Number.isFinite(ae) && Z < ae))
          (L.add(ue), oe.set(ue, Math.min(Z ?? Number.POSITIVE_INFINITY, Kt(M))));
      }
    },
    ke = (M) => {
      (w.add(M), U.delete(M), L.delete(M), oe.delete(M));
    },
    Pe = (M, q) => {
      let le = q === "none" ? void 0 : o6s(M);
      if (le === void 0 || Um(le) === null) return;
      if (q === "own") {
        ke(le);
        return;
      }
      (U.delete(le), L.delete(le), oe.delete(le));
    },
    Ie = (M, q) => {
      let le = regExp_11.exec(M)?.[1];
      if (le !== void 0 && !Oe(unescapeHtmlEntities(le)))
        (R.add(unescapeHtmlEntities(le)),
          P.set(unescapeHtmlEntities(le), [...(P.get(unescapeHtmlEntities(le)) ?? []), q]));
    };
  for (let M of e) {
    if (M.type === "system" && M.subtype === "scheduled_task_fire" && M.taskKind === "loop") b = _.length;
    if (M.type === "assistant") {
      let content = M.message.content;
      if (!Array.isArray(content)) continue;
      let parse = Date.parse(M.timestamp);
      for (let be of content) {
        if (be.type !== "tool_use") continue;
        let Se = Jt(be.input) ? be.input : {};
        if (be.name === CRON_CREATE_TOOL_NAME) s.push({ toolUseId: be.id, input: Se, createdAt: parse });
        else if (be.name === CRON_DELETE_TOOL_NAME) {
          if (typeof Se.id === "string") y.add(Se.id);
        } else if (be.name === SCHEDULE_WAKEUP_TOOL_NAME)
          _.push({ toolUseId: be.id, input: Se, createdAt: parse });
      }
    } else if (M.type === "user") {
      let q = messageContentToText(M.message.content),
        le = cs(q, M.joinedNoticeLengths),
        all = le.every((ae, he) => ae.length === M.joinedNoticeLengths?.[he]),
        Se = all && M.joinedNoticeOwn?.length === le.length ? M.joinedNoticeOwn : [],
        ve = all && M.joinedNoticeRunIds?.length === le.length ? M.joinedNoticeRunIds : [];
      for (let [ae, he] of le.entries()) {
        let we = k2t(M.origin, M[B6e]) || Se[ae] === !0;
        if (
          (Ne(M, he, M.origin, {
            isOwn: we,
            isRewritten: M.promptRewritten === !0,
            runId: ve[ae] ?? (M.origin?.kind === "task-notification" ? M.origin.runId : void 0),
          }),
          zfe(M.origin))
        )
          Ie(he, M.uuid);
        Pe(
          he,
          cronOwnership({
            isOwn: we,
            isBare: isBareTaskNotificationOrigin(M.origin) && isOlderVersion(M, ho),
            isRewritten: M.promptRewritten === !0,
          }),
        );
      }
      let content = M.message.content;
      if (!Array.isArray(content)) continue;
      let toolUseResult = M.toolUseResult;
      if (!Jt(toolUseResult)) continue;
      let se = !1,
        Z = !1,
        ue = !1;
      for (let ae of content)
        if (ae.type === "tool_result" && !ae.is_error) {
          if ((h.set(ae.tool_use_id, toolUseResult), Q.has(ae.tool_use_id)))
            ((se = !0), (Z ||= ne.has(ae.tool_use_id)));
          if (z.has(ae.tool_use_id)) ue = !0;
          if (
            toolUseResult.success === !0 &&
            typeof toolUseResult.message === "string" &&
            typeof toolUseResult.resumedAgentId === "string" &&
            Um(toolUseResult.resumedAgentId) !== null
          ) {
            (G.delete(toolUseResult.resumedAgentId),
              R.delete(toolUseResult.resumedAgentId),
              P.delete(toolUseResult.resumedAgentId));
            let Je = j.get(ae.tool_use_id);
            if (Je !== void 0) (ke(toolUseResult.resumedAgentId), te.set(toolUseResult.resumedAgentId, Je));
            let $e = k.get(toolUseResult.resumedAgentId);
            if ($e) (($e.redispatched = !0), ($e.canContinueAgent = !0));
            else
              k.set(toolUseResult.resumedAgentId, {
                agentId: toolUseResult.resumedAgentId,
                description: toolUseResult.message,
                isWebFetchLaunch: !1,
                canReadOutputFile: r,
                canContinueAgent: !0,
                redispatched: !0,
              });
          }
          let he = j.get(ae.tool_use_id);
          if (
            toolUseResult.success === !0 &&
            typeof toolUseResult.revivedAgentId === "string" &&
            Um(toolUseResult.revivedAgentId) !== null &&
            he !== void 0
          )
            (ke(toolUseResult.revivedAgentId), te.set(toolUseResult.revivedAgentId, he));
          let we =
            typeof toolUseResult.backgroundTaskId === "string" && typeof toolUseResult.stdout === "string"
              ? toolUseResult.backgroundTaskId
              : typeof toolUseResult.taskId === "string" && typeof toolUseResult.timeoutMs === "number"
                ? toolUseResult.taskId
                : void 0;
          if (we !== void 0 && !Oe(we)) E.set(we, { taskId: we, toolUseId: ae.tool_use_id });
          if (
            V.has(ae.tool_use_id) &&
            typeof toolUseResult.task_id === "string" &&
            typeof toolUseResult.task_type === "string"
          )
            (U.add(toolUseResult.task_id), oe.set(toolUseResult.task_id, Kt(M)));
          if (
            toolUseResult.status === "async_launched" &&
            toolUseResult.taskType === "local_workflow" &&
            typeof toolUseResult.taskId === "string" &&
            ADOPT_ID_PATTERN.test(toolUseResult.taskId) &&
            toolUseResult.taskId.length <= ADOPT_ID_MAX_CHARS &&
            !Oe(toolUseResult.taskId) &&
            typeof toolUseResult.error !== "string"
          )
            N.set(toolUseResult.taskId, {
              taskId: toolUseResult.taskId,
              toolUseId: ae.tool_use_id,
              workflowName:
                typeof toolUseResult.workflowName === "string" ? toolUseResult.workflowName : void 0,
              runId: typeof toolUseResult.runId === "string" ? toolUseResult.runId : void 0,
            });
        }
      if (
        typeof toolUseResult.agentId === "string" &&
        (se || (ue && toolUseResult.status === "forked" && toolUseResult.background === !0))
      )
        D(toolUseResult.agentId);
      if (
        typeof toolUseResult.agentId === "string" &&
        typeof toolUseResult.commandName === "string" &&
        ue &&
        toolUseResult.status === "forked"
      )
        T.set(toolUseResult.agentId, toolUseResult.commandName);
      if (
        toolUseResult.status === "async_launched" &&
        typeof toolUseResult.agentId === "string" &&
        !Oe(toolUseResult.agentId) &&
        typeof toolUseResult.description === "string"
      )
        k.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description: toolUseResult.description,
          outputFile: typeof toolUseResult.outputFile === "string" ? toolUseResult.outputFile : void 0,
          isWebFetchLaunch: Z,
          canReadOutputFile: r && toolUseResult.canReadOutputFile !== !1,
          canContinueAgent: toolUseResult.canContinueAgent !== !1,
          launchedByAgentTool: se,
        });
      if (
        toolUseResult.status === "forked" &&
        toolUseResult.background === !0 &&
        typeof toolUseResult.agentId === "string" &&
        !Oe(toolUseResult.agentId) &&
        !k.has(toolUseResult.agentId)
      )
        k.set(toolUseResult.agentId, {
          agentId: toolUseResult.agentId,
          description:
            typeof toolUseResult.commandName === "string" ? toolUseResult.commandName : toolUseResult.agentId,
          isWebFetchLaunch: !1,
          canReadOutputFile: r,
          canContinueAgent: !0,
          launchedByForkedSkill: ue,
        });
    } else if (M.type === "system" && M.subtype === "informational") {
      let q = convertToolProgressMessage(M);
      if (q !== void 0) D(q);
    } else if (M.type === "system" && M.subtype === "local_command" && typeof M.content === "string") {
      for (let q of parseForkedSkillLaunches(M.content))
        if ((D(q.agentId), !Oe(q.agentId) && !k.has(q.agentId)))
          k.set(q.agentId, {
            agentId: q.agentId,
            description: q.description,
            isWebFetchLaunch: !1,
            canReadOutputFile: r,
            canContinueAgent: !0,
            launchedByForkedSkill: !0,
          });
    } else if (
      M.type === "attachment" &&
      M.attachment.type === "task_status" &&
      M.attachment.taskType === "local_bash" &&
      M.attachment.status === "running" &&
      M.attachment.shell !== void 0 &&
      !Oe(M.attachment.taskId)
    )
      E.set(M.attachment.taskId, { taskId: M.attachment.taskId, toolUseId: M.attachment.shell.toolUseId });
    else if (
      M.type === "attachment" &&
      M.attachment.type === "task_status" &&
      M.attachment.taskType === "local_agent" &&
      M.attachment.status === "running"
    )
      w.add(M.attachment.taskId);
    else if (
      M.type === "attachment" &&
      M.attachment.type === "queued_command" &&
      typeof M.attachment.prompt === "string"
    ) {
      if (
        (Ne(M, M.attachment.prompt, M.attachment.origin, {
          isOwn: k2t(M.attachment.origin, M.attachment[B6e]),
          isRewritten: M.attachment.promptRewritten === !0,
          runId:
            M.attachment.runId ??
            (M.attachment.origin?.kind === "task-notification" ? M.attachment.origin.runId : void 0),
        }),
        zfe(M.attachment.origin))
      )
        Ie(M.attachment.prompt, M.uuid);
      Pe(
        M.attachment.prompt,
        M.attachment.commandMode === "task-notification"
          ? cronOwnership({
              isOwn: k2t(M.attachment.origin, M.attachment[B6e]),
              isBare:
                (M.attachment.origin === void 0 || isBareTaskNotificationOrigin(M.attachment.origin)) &&
                isOlderVersion(M, ho),
              isRewritten: M.attachment.promptRewritten === !0,
            })
          : "none",
      );
    } else if (n) {
      pe = readCarriedCrons(M) ?? pe;
      for (let q of readEndedCronIds(M)) y.add(q);
    }
  }
  for (let M of pe) {
    let q = `carried:${M.id}`;
    (s.push({ toolUseId: q, input: { cron: M.cron, prompt: M.prompt }, createdAt: M.createdAt }),
      h.set(q, {
        id: M.id,
        recurring: M.recurring,
        durable: !1,
        ...(M.plugin !== void 0 && { plugin: M.plugin }),
      }));
  }
  return {
    calls: s,
    results: h,
    deletedCronIds: y,
    wakeupCalls: _,
    wakeupCallsAtLastLoopFire: b,
    asyncAgents: k,
    launchedAgentIds: w,
    launchedHereAgentIds: S,
    forkedSkillAgentIds: T,
    bgShells: E,
    workflows: N,
    notifiedTaskIds: G,
    ownNotifiedTaskIds: R,
    ownNoticeRowUuids: P,
    stoppedTaskIds: U,
    endedTaskIds: L,
    stoppedAt: oe,
  };
}
//@ chunk-0sfjpx19.js:59889-59984 placement
function Kt(e) {
  let parse = Date.parse(e.timestamp);
  return Number.isNaN(parse) ? Number.POSITIVE_INFINITY : parse;
}
//@ chunk-0sfjpx19.js:59984-60368 placement
function taskKindLabel(e, n) {
  let r = { summarizedKinds: new Set(), liveExclusions: new Set() };
  if (!e.includes(Ki) || !e.includes(Qi)) return r;
  for (let s of e.matchAll(TASK_NOTIFICATION_KILLED_PATTERN)) {
    if (!s[1]) continue;
    let h = unescapeHtmlEntities(s[1]);
    if (h.startsWith(Yt)) {
      r.liveExclusions.add(h.slice(Yt.length));
      continue;
    }
    if ((n.add(h), h.startsWith(Xt))) {
      let sliced = h.slice(Xt.length);
      if (sliced === "agent" || sliced === "shell" || sliced === "workflow") r.summarizedKinds.add(sliced);
    }
  }
  return r;
}
//@ chunk-0sfjpx19.js:60368-60486 placement
function messageContentToText(e) {
  if (typeof e === "string") return e;
  return e.map((n) => (Jt(n) && typeof n.text === "string" ? n.text : "")).join(`
`);
}
//@ chunk-0sfjpx19.js:60486-60785 placement
async function getAgentTranscriptMtime(e, n, r) {
  let s = getAgentTranscriptPath(e);
  if (isStorageV5Enabled() && n !== void 0)
    try {
      let y = getAgentTranscriptStorageKey(s, n);
      if (y !== void 0) {
        let statMeta = await y.backend.statMeta(y.key);
        if (statMeta.ok && statMeta.value.size > 0) return statMeta.value.mtimeMs;
      }
    } catch {}
  if (r) {
    let y = await lstat(s);
    return y.isFile() && y.size > 0 ? y.mtimeMs : null;
  }
  let h = await stat(s);
  return h.size > 0 ? h.mtimeMs : null;
}
/**
 * 恢复后台代理：无完成记录的标记为 orphaned_on_resume 或重启。
 */
//@ chunk-0sfjpx19.js:60785-64727 placement
async function resumeAsyncAgents(
  { asyncAgents: asyncAgents, notifiedTaskIds: notifiedTaskIds },
  r,
  s,
  h,
  y,
  _,
) {
  let b = [],
    k = [];
  for (let P of asyncAgents.values()) {
    if (notifiedTaskIds.has(P.agentId)) continue;
    if (h?.has(P.agentId)) continue;
    if (r.get(P.agentId)) {
      k.push(P.agentId);
      continue;
    }
    b.push(P);
  }
  if (b.length === 0) return;
  if (
    (logFeatureSad("task_local_agent", "orphaned_on_resume"),
    logForDebugging(`resume: ${b.length} background agent(s) orphaned by previous process exit`),
    b.length > at)
  ) {
    for (let P of b)
      emitTaskNotification(P.agentId, "failed", { summary: ORPHAN_SUMMARY_NOTE, outputFile: Zt(P) });
    enqueueOrphanedTasksNotification("failed", "agent", "agent", b, (P) => escapeXml(P.agentId), k);
    return;
  }
  let results = await Promise.all(
      b.map(async (P) => {
        let U = P.redispatched ? null : Um(P.agentId);
        if (U === null) return { mtimeMs: null, hasMeta: !1, fetchable: !1 };
        let L;
        try {
          L = await getAgentTranscriptMtime(U, y, !1);
        } catch {
          L = null;
        }
        let oe =
          s !== void 0 &&
          (P.launchedByAgentTool === !0 || P.launchedByForkedSkill === !0) &&
          L !== null &&
          (await readAgentMetadata(U, y).catch(makeSidecarReadFallback("resume orphan probe"))) !== null;
        return { mtimeMs: L, hasMeta: oe, fetchable: L === null && canFetchAgentTranscriptsOnDemand() };
      }),
    ),
    S = [],
    T = { stopped: [], failed: [] },
    now = Date.now(),
    E = b;
  try {
    let P = _?.();
    if (P) E = b.map((U) => withResumeCapabilities(U, P));
  } catch (error) {
    logError(Error("restoreBackgroundTasksFromMessages: resuming-session verdicts threw", { cause: error }));
  }
  for (let [P, U] of E.entries()) {
    let {
      mtimeMs: mtimeMs,
      hasMeta: hasMeta,
      fetchable: fetchable,
    } = results[P] ?? { mtimeMs: null, hasMeta: !1, fetchable: !1 };
    if (
      s !== void 0 &&
      (U.launchedByAgentTool === !0 || U.launchedByForkedSkill === !0) &&
      hasMeta &&
      mtimeMs !== null &&
      now - mtimeMs < Yi
    ) {
      S.push({
        agentId: U.agentId,
        description: U.description,
        outputFile: U.outputFile,
        isWebFetchLaunch: U.isWebFetchLaunch,
        canReadOutputFile: U.canReadOutputFile,
        canContinueAgent: U.canContinueAgent,
      });
      continue;
    }
    let Q = mtimeMs !== null || fetchable,
      ne = U.redispatched || Q ? "stopped" : "failed",
      z = Ve(`Background agent "${escapeXml(U.description)}"`),
      V = RELAUNCH_ADVICE(U),
      j = U.redispatched
        ? `No completion record was found for it after it was ${U.canContinueAgent ? `re-dispatched via ${SENDMESSAGE}` : "sent a follow-up message"} in the previous session. It may have been stopped (via the UI, an SDK interrupt, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited. ${U.canContinueAgent ? (U.isWebFetchLaunch ? `Send it another message with ${SENDMESSAGE} to resume it and get its report before assuming the fetch landed.` : U.canReadOutputFile ? `Send it another message with ${SENDMESSAGE} to resume it, or check its worktree/output for partial work before assuming the task landed.` : `Send it another message with ${SENDMESSAGE} to resume it and ask for a status report before assuming the task landed.`) : V}`
        : Q
          ? `No completion record was found for it in the previous session. It may have been stopped, or it may have been running when the previous Claude Code process exited${U.canContinueAgent ? " \u2014 either way its transcript is saved, so its progress is not lost" : ""}. ${U.canContinueAgent ? (U.isWebFetchLaunch ? `Resume it by sending it a message with ${SENDMESSAGE} to get its report.` : U.canReadOutputFile ? `Resume it by sending it a message with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.` : `Resume it by sending it a message with ${SENDMESSAGE} and ask for a status report before assuming the task landed.`) : V}`
          : `It was running when the previous Claude Code process exited and did not complete. Its in-process state was lost. ${V}`;
    if (U.redispatched) enqueueTaskNotification(U, ne, z, j);
    else T[ne].push({ agent: U, summary: z, note: j });
    emitTaskNotification(U.agentId, ne, { summary: unescapeHtmlEntities(z), outputFile: Zt(U) });
  }
  let filtered = T.stopped.filter((P) => !P.agent.canContinueAgent),
    any = filtered.some((P) => !P.agent.isWebFetchLaunch && P.agent.canReadOutputFile),
    R = [
      { status: "stopped", members: T.stopped.filter((P) => P.agent.canContinueAgent) },
      {
        status: "stopped",
        members: any
          ? filtered.filter((P) => P.agent.isWebFetchLaunch || P.agent.canReadOutputFile)
          : filtered,
      },
      {
        status: "stopped",
        members: any ? filtered.filter((P) => !P.agent.isWebFetchLaunch && !P.agent.canReadOutputFile) : [],
      },
      { status: "failed", members: T.failed },
    ];
  for (let { status: status, members: members } of R) {
    let L = members[0];
    if (members.length === 1 && L) enqueueTaskNotification(L.agent, status, L.summary, L.note);
    else if (members.length > 1)
      formatStoppedAgentsNotice(
        status,
        members.map((oe) => oe.agent),
      );
  }
  if (S.length > 0 && s !== void 0)
    (logForDebugging(
      `resume: handing ${S.length} disk-resumable orphaned agent(s) to the bg auto-resume path`,
    ),
      s(S));
}
//@ chunk-0sfjpx19.js:64727-65076 placement
function formatAgentRestartedNotice(e) {
  enqueueTaskNotification(
    e,
    void 0,
    `Background agent "${escapeXml(e.description)}" was restarted after the previous session ended`,
    "It had no completion record after the previous Claude Code process exited, and was automatically restarted from its saved transcript. It is running in the background again; its result will arrive as a separate task notification.",
  );
}
//@ chunk-0sfjpx19.js:65076-65175 placement
function _As(e) {
  return getMainThreadAgentType() === void 0 && !env.CLAUDE_CODE_SIMPLE
    ? { kind: "startupStandIn", tools: e }
    : void 0;
}
//@ chunk-0sfjpx19.js:65175-65391 placement
function withResumeCapabilities(e, n) {
  let r = e.canReadOutputFile && !e.isWebFetchLaunch,
    s;
  switch (n.kind) {
    case "startupStandIn":
      s = r;
      break;
    case "runningPool":
      s = r && HM(n.tools);
      break;
  }
  return { ...e, canContinueAgent: hasSendMessageTool(n.tools), canReadOutputFile: s };
}
//@ chunk-0sfjpx19.js:65391-66568 placement
function formatOrphanedAgentNotification(e, n, r) {
  let s = n.get(e.agentId),
    h = e.isWebFetchLaunch || (s?.type === "local_agent" && s.webFetchSavedFiles !== void 0),
    y =
      !h && e.canReadOutputFile
        ? "Read its output file (and check its worktree, if any) for the result."
        : e.canContinueAgent
          ? `Send it a message with ${SENDMESSAGE} to get its report.`
          : h
            ? "Its report cannot be retrieved from this session. If it only fetched web pages, launch it again if the report is still needed; otherwise launching it again could repeat work it already did: do so only if that is safe."
            : "Its report cannot be retrieved from this session. Its last turn had ended, so its work may already be done and launching it again could repeat it: do so only if its result is still needed and repeating the work is safe; otherwise tell your user its report could not be retrieved from this session.";
  enqueueTaskNotification(
    h ? { ...e, isWebFetchLaunch: !0 } : e,
    "completed",
    `Background agent "${escapeXml(e.description)}" finished before the previous session ended, but its result was never reported`,
    `It had already completed before the previous Claude Code process exited \u2014 only its completion notification was lost, so it was not restarted and no further task notification will arrive. ${y}`,
    r,
  );
}
//@ chunk-0sfjpx19.js:66568-67210 placement
function formatAgentRestartFailedNotice(e, n, r) {
  enqueueTaskNotification(
    e,
    "stopped",
    `Background agent "${escapeXml(e.description)}" from the previous session couldn't be restarted: ${escapeXml(n)}`,
    e.canContinueAgent
      ? `It could not be automatically restarted. Its transcript may still be resumable by sending it a message with ${SENDMESSAGE}${e.isWebFetchLaunch ? ", which is the only way to get its report." : e.canReadOutputFile ? "; check its worktree/output for partial work before assuming the task landed." : " and asking for a status report before assuming the task landed."}`
      : e.canReadOutputFile && !e.isWebFetchLaunch
        ? `It could not be automatically restarted. ${RELAUNCH_ADVICE(e)}`
        : "It could not be automatically restarted.",
    r,
  );
}
//@ chunk-0sfjpx19.js:67210-67494 placement
function enqueueTaskNotification(e, n, r, s, h) {
  let y = e.canReadOutputFile ? Zt(e) : void 0,
    _ = "";
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: escapeXml(e.agentId),
      outputFile: y ? escapeXml(y) : void 0,
      status: n,
      summary: r,
      body: `
<${NOTE}>${s}</${NOTE}>`,
    }),
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    ...(h === void 0 && { shouldQuery: !1 }),
  });
}
//@ chunk-0sfjpx19.js:67494-69465 placement
function formatStoppedAgentsNotice(e, n) {
  let joined = n.map((D) => `<${TASK_ID}>${escapeXml(D.agentId)}</${TASK_ID}>`).join(`
`),
    joined_2 = n.map((D) => `"${escapeXml(D.description)}" (${escapeXml(D.agentId)})`).join(", "),
    mapped = n.filter((D) => D.isWebFetchLaunch).map((D) => escapeXml(D.agentId)),
    y = mapped.length === n.length,
    all = n.every((D) => D.isWebFetchLaunch || !D.canReadOutputFile),
    all_2 = n.every((D) => D.canContinueAgent),
    k =
      mapped.length === 0 || y
        ? ""
        : e === "stopped" && all_2
          ? ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} no worktree or output to check \u2014 resume ${mapped.length === 1 ? "it" : "them"} with ${SENDMESSAGE} only.`
          : ` ${mapped.length === 1 ? "Agent" : "Agents"} ${mapped.join(", ")} fetched web content and ${mapped.length === 1 ? "has" : "have"} nothing to check \u2014 launch ${mapped.length === 1 ? "it" : "them"} again if still needed.`,
    w = y
      ? "Launch them again if their reports are still needed."
      : all
        ? "Do not assume the tasks landed; launch them again if their results are still needed."
        : "Check each agent's worktree/output for partial work before assuming the tasks landed.",
    S =
      e === "stopped"
        ? `No completion record was found for them in the previous session. They may have been stopped, or they may have been running when the previous Claude Code process exited${all_2 ? " \u2014 either way their transcripts are saved, so their progress is not lost" : ""}. ${all_2 ? (y ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} to get its report.` : all ? `Resume any of them by sending a message to its id with ${SENDMESSAGE} and ask for a status report before assuming the task landed.` : `Resume any of them by sending a message to its id with ${SENDMESSAGE}, or check its worktree/output for partial work before assuming the task landed.`) : w}`
        : `They were running when the previous Claude Code process exited and did not complete. Their in-process state was lost. ${w}`,
    T = "";
  enqueuePendingNotification({
    value: `<${TASK_NOTIFICATION}>
${joined}
<${STATUS}>${e}</${STATUS}>
<${SUMMARY}>${Ve(`${n.length} background agents`)}: ${joined_2}.${k}</${SUMMARY}>
<${NOTE}>${S}</${NOTE}>
</${TASK_NOTIFICATION}>`,
    agentId: mainAgentId(),
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
    shouldQuery: !1,
  });
}
//@ chunk-0sfjpx19.js:69465-70634 placement
function resumeLocalShellTasks(
  { bgShells: bgShells, notifiedTaskIds: notifiedTaskIds, stoppedTaskIds: stoppedTaskIds },
  s,
) {
  let h = [],
    y = [];
  for (let _ of bgShells.values()) {
    if (notifiedTaskIds.has(_.taskId) || stoppedTaskIds.has(_.taskId)) continue;
    if (s.get(_.taskId)) {
      y.push(_.taskId);
      continue;
    }
    h.push(_);
  }
  if (h.length === 0) return;
  if (
    (logFeatureSad("task_local_shell", "orphaned_on_resume"),
    logForDebugging(`resume: ${h.length} background shell command(s) orphaned by previous process exit`),
    h.length > 1)
  ) {
    for (let _ of h)
      emitTaskNotification(_.taskId, "stopped", { toolUseId: _.toolUseId, summary: ORPHAN_SUMMARY_NOTE });
    enqueueOrphanedTasksNotification("stopped", "shell", "shell command", h, (_) => escapeXml(_.taskId), y);
    return;
  }
  for (let _ of h) {
    let b = Ve("Background shell command"),
      k = `No completion record was found for it in the previous session. It may have been stopped (via the UI, Monitor timeout, or agent teardown \u2014 these leave no transcript marker), or it may have been running when the previous Claude Code process exited.${isDiskless() ? "" : " Check the output file for partial results before assuming it completed."}`;
    (enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(_.taskId),
        toolUseId: escapeXml(_.toolUseId),
        status: "stopped",
        summary: b,
        body: `
<${NOTE}>${k}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: !0,
      priority: "next",
      shouldQuery: !1,
    }),
      emitTaskNotification(_.taskId, "stopped", { toolUseId: _.toolUseId, summary: b }));
  }
}
//@ chunk-0sfjpx19.js:70634-71972 placement
function resumeLocalWorkflows(
  { workflows: workflows, notifiedTaskIds: notifiedTaskIds, stoppedTaskIds: stoppedTaskIds },
  s,
  h,
) {
  let y = [],
    _ = [];
  for (let b of workflows.values()) {
    if (notifiedTaskIds.has(b.taskId) || stoppedTaskIds.has(b.taskId) || h?.has(b.taskId)) continue;
    if (s.get(b.taskId)) {
      _.push(b.taskId);
      continue;
    }
    y.push(b);
  }
  if (y.length === 0) return;
  if (
    (logFeatureSad("task_local_workflow", "orphaned_on_resume"),
    logForDebugging(`resume: ${y.length} background workflow(s) orphaned by previous process exit`),
    y.length > at)
  ) {
    for (let b of y)
      emitTaskNotification(b.taskId, "stopped", { toolUseId: b.toolUseId, summary: ORPHAN_SUMMARY_NOTE });
    enqueueOrphanedTasksNotification("stopped", "workflow", "workflow", y, (b) => escapeXml(b.taskId), _);
    return;
  }
  for (let b of y) {
    let k = b.workflowName ? ` "${noticeDescriptionOf(b.workflowName)}"` : "",
      w =
        b.runId !== void 0 && WORKFLOW_RUN_ID_PATTERN.test(b.runId)
          ? noticeFieldOf(b.runId, WORKFLOW_RUN_ID_MAX_CHARS)
          : void 0,
      S = w ? ` (run ${w})` : "",
      T = !w
        ? ""
        : " To pick up where it left off, relaunch with Workflow({scriptPath, resumeFromRunId}) using the run id from the summary \u2014 completed agent() calls return cached.",
      D = "",
      E = Ve(`Background workflow${k}${S}`),
      N = `No completion record was found for it in the previous session. It may have been ${bo}, or it may have been running when the previous Claude Code process exited.${T}`;
    (enqueuePendingNotification({
      value: formatTaskNotification({
        taskId: escapeXml(b.taskId),
        toolUseId: escapeXml(b.toolUseId),
        status: "stopped",
        summary: E,
        body: `
<${NOTE}>${escapeXml(N)}</${NOTE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: !0,
      priority: "next",
      shouldQuery: !1,
    }),
      emitTaskNotification(b.taskId, "stopped", {
        toolUseId: b.toolUseId,
        summary: unescapeHtmlEntities(E),
      }));
  }
}

export {
  mo,
  at,
  Xt,
  Yt,
  bo,
  Ve,
  ut,
  planResumeOfBackgroundTasks,
  formatOrphanSummary,
  formatAgentRestartFailedNotice,
  formatOrphanedAgentNotification,
  formatAgentRestartedNotice,
  withResumeCapabilities,
  _As,
};
