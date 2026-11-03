/**
 * services/artifacts/commentMonitor.ts
 *
 * Artifact 评论监视器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w4p2kd11.js (45)
 * attribution: placement 45
 */
import { basename } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, pe, o, oe, E, U, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { Vt } from "../../utils/agentId.js";
import { uniq } from "../../utils/collections.js";
import { getLiveState, hasLiveState } from "../liveReplica/liveReplica.js";
import { env } from "../../utils/env.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { ownProcStartMemo, ownProcStartAsync, procIdentityFields } from "../../utils/processIdentity.js";
import { getBgJobDir, isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { ownPidSpace } from "../../utils/pidSpace.js";
import { getSessionId, onSessionSwitch } from "../../bootstrap/state.js";
import {
  currentSessionFileIsFor,
  getMaterializedSessionFile,
  registerForeignTranscriptExitReStamp,
  flushSessionStorage,
  getTranscriptWriteFailureSeq,
  appendEntryToCurrentTranscriptNow,
  appendEntryToFileAsync,
  getTranscriptPath,
  getTranscriptPathForSession,
  onSessionFileMaterialized,
  registerTranscriptExitDrain,
  takeResumedArtifactCommentMonitor,
  sealTornTranscriptTail,
  registerTranscriptExitReStamp,
  recordArtifactCommentMonitor,
} from "../../utils/sessionStorage.js";
import { wi, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";

/**
 * 持久评论监听登记表的常量与 schema：事件类型（published/comment）、行数与孤立触发器上限、时间格式、行/停止/孤立触发器信封。
 */
//@ chunk-w4p2kd11.js:876-1711 placement
var MONITOR_EVENT_KINDS = { published: "published", comment: "comment" },
  MAX_REGISTRY_ROWS = 64,
  MAX_ORPHAN_TRIGGERS = 16,
  ISO_MS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  REGISTRY_UNPUBLISHED = "",
  DURABLE_REGISTRY_SCHEMAS = DoctorLazy(() => {
    let e = u({ v: T(1), rows: pe(o(), oe()) }),
      t = u({ v: E().gt(1) }),
      n = u({ stopped: pe(o(), oe()) }),
      s = U(MONITOR_EVENT_KINDS),
      refine = o().refine((g) => Vt(g) !== null),
      d = u({
        orphans: A(oe()).transform((g) =>
          g.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((m) => {
            let safeParse = refine.safeParse(m);
            return safeParse.success ? [safeParse.data] : [];
          }),
        ),
      }),
      a = u({
        trigger_id: refine,
        since: o().regex(ISO_MS_RE),
        events: A(o())
          .max(16)
          .transform((g) =>
            uniq(g).flatMap((m) => {
              let safeParse = s.safeParse(m);
              return safeParse.success ? [safeParse.data] : [];
            }),
          )
          .refine((g) => g.length > 0),
        unreleased: A(oe())
          .catch([])
          .transform((g) =>
            g.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((m) => {
              let safeParse = refine.safeParse(m);
              return safeParse.success ? [safeParse.data] : [];
            }),
          ),
        claude_doc: T(!0)
          .optional()
          .catch(void 0),
      }),
      l = u({ at_ms: E().refine(Number.isFinite) });
    return { rowsEnvelope: e, newerEnvelope: t, stopsEnvelope: n, orphansEnvelope: d, row: a, stop: l };
  });
//@ chunk-w4p2kd11.js:1711-1755 placement
function pUs(e) {
  getLiveState().durable.registrySink = e;
}
//@ chunk-w4p2kd11.js:1755-1804 placement
function mUs() {
  getLiveState().durable.registryPublished = REGISTRY_UNPUBLISHED;
}
/**
 * 远程环境下把持久评论监听登记表（各 slug 的触发器、起始时间、事件、未释放触发器；已停止的 slug；孤立触发器）序列化后经 registrySink 上报；与上次相同则跳过。
 */
//@ chunk-w4p2kd11.js:1804-2880 placement
function publishDurableWatchRegistry() {
  if (!env.CLAUDE_CODE_REMOTE) return;
  let e = getLiveState(),
    { durable: durable } = e;
  if (durable.registrySink === null) return;
  let rows = {},
    restoredOnly = [],
    orphanCandidates = new Set();
  for (let c of durable.pendingRestoredRows.values()) {
    let h = durable.rows.get(c.slug);
    if (h === void 0 && !durable.unwatchedSlugs.has(c.slug)) {
      restoredOnly.push(c);
      continue;
    }
    for (let S of [c.triggerId, ...(c.unreleased ?? [])]) if (S !== h?.triggerId) orphanCandidates.add(S);
  }
  for (let c of [...durable.rows.values(), ...restoredOnly].slice(0, MAX_REGISTRY_ROWS))
    rows[c.slug] = {
      trigger_id: c.triggerId,
      since: c.since,
      events: [...c.events],
      ...(c.unreleased !== void 0 && c.unreleased.length > 0 && { unreleased: [...c.unreleased] }),
      ...((c.claudeDoc || durable.pendingRestoredRows.get(c.slug)?.claudeDoc) && { claude_doc: !0 }),
    };
  let stopped = {},
    sliced = [...e.commentMonitorIntent.bySlug.entries()]
      .filter(([, c]) => c.state === "stopped")
      .sort(([, c], [, h]) => h.writtenAtMs - c.writtenAtMs)
      .slice(0, MAX_REGISTRY_ROWS);
  for (let [c, h] of sliced) stopped[c] = { at_ms: h.writtenAtMs };
  let sliced_2 = uniq([...durable.orphanTriggers, ...orphanCandidates]).slice(0, MAX_ORPHAN_TRIGGERS),
    g =
      durable.rows.size + restoredOnly.length === 0 && sliced.length === 0 && sliced_2.length === 0
        ? null
        : { v: 1, rows: rows, stopped: stopped, ...(sliced_2.length > 0 && { orphans: sliced_2 }) },
    m = jsonStringify(g);
  if (m === durable.registryPublished) return;
  ((durable.registryPublished = m), durable.registrySink({ artifact_durable_watches: g }));
}
//@ chunk-w4p2kd11.js:2880-3805 placement
function readCommentMonitorRegistry(e) {
  if (e === void 0 || e === null) return null;
  let t = DURABLE_REGISTRY_SCHEMAS(),
    n = 0,
    s = [],
    safeParse = t.rowsEnvelope.safeParse(e);
  if (safeParse.success)
    for (let [m, c] of j(safeParse.data.rows)) {
      let safeParse = t.row.safeParse(c);
      if (!ARTIFACT_SLUG_RE.test(m) || !safeParse.success) {
        n++;
        continue;
      }
      s.push({
        slug: m,
        triggerId: safeParse.data.trigger_id,
        since: safeParse.data.since,
        events: safeParse.data.events,
        ...(safeParse.data.unreleased.length > 0 && { unreleased: safeParse.data.unreleased }),
        ...(safeParse.data.claude_doc && { claudeDoc: !0 }),
      });
    }
  let d = new Map(),
    safeParse_2 = t.stopsEnvelope.safeParse(e);
  if (safeParse_2.success)
    for (let [m, c] of j(safeParse_2.data.stopped)) {
      if (!ARTIFACT_SLUG_RE.test(m)) {
        n++;
        continue;
      }
      let safeParse = t.stop.safeParse(c);
      if ((d.set(m, safeParse.success ? safeParse.data.at_ms : Date.now()), !safeParse.success)) n++;
    }
  if (!safeParse.success || !safeParse_2.success)
    logFeatureSad(
      "artifact_durable_subscribe",
      safeParse_2.success && t.newerEnvelope.safeParse(e).success
        ? "registry_newer_version"
        : "registry_invalid",
    );
  else if (n > 0) logFeatureSad("artifact_durable_subscribe", "registry_entry_invalid");
  let safeParse_3 = t.orphansEnvelope.safeParse(e),
    g = safeParse_3.success ? safeParse_3.data.orphans : [];
  return { rows: s, stopped: d, orphans: g };
}
//@ chunk-w4p2kd11.js:3805-3871 placement
function j(e) {
  return Object.keys(e)
    .slice(0, MAX_REGISTRY_ROWS)
    .map((n) => [n, e[n]]);
}
/**
 * 判断某个 slug 是否有接上自动回复的活跃监听（或正在建立）。
 */
//@ chunk-w4p2kd11.js:3871-4015 placement
function isAutoReactWired(e) {
  let { live: live } = getLiveState(),
    n = live.supervisors.get(e);
  return (n !== void 0 && !n.stopped && n.autoReactWiring !== void 0) || live.inFlightWiredIntent.has(e);
}
/**
 * 会话记录里评论监听意图（artifact-comment-monitor）的标记与 schema：标题/持有者字段上限、单条记录（armed/stopped、写入时间、标题、后台持有者进程身份）与整行信封。
 */
//@ chunk-w4p2kd11.js:4015-4746 placement
var UNWRITTEN_MARKER = "\x00unwritten",
  MAX_TITLE_LENGTH = 256,
  MAX_PARKED_INTENTS = 32,
  MAX_INTENT_ENTRIES = 64,
  MONITOR_INTENT_SCHEMAS = DoctorLazy(() => {
    let refine = E().refine(Number.isFinite),
      t = u({
        state: U(["armed", "stopped"]),
        writtenAtMs: refine,
        title: o().min(1).max(MAX_TITLE_LENGTH).optional(),
        holder: o()
          .optional()
          .transform((s) => (s === void 0 ? void 0 : "bg")),
        holderPid: E()
          .int()
          .positive()
          .optional()
          .catch(void 0),
        holderProcStart: o()
          .min(1)
          .max(64)
          .optional()
          .catch(void 0),
        holderProcStartFt: o()
          .min(1)
          .max(64)
          .optional()
          .catch(void 0),
        holderJob: o()
          .regex(/^[0-9a-f]{8}$/)
          .optional()
          .catch(void 0),
        holderPidSpace: o()
          .min(1)
          .max(160)
          .optional()
          .catch(void 0),
      }),
      n = u({
        type: T("artifact-comment-monitor"),
        v: T(1),
        sessionId: o(),
        artifacts: pe(o(), oe()),
        crossLineMerged: T(!0)
          .optional()
          .catch(void 0),
        tailTorn: T(!0)
          .optional()
          .catch(void 0),
      });
    return { record: t, envelope: n };
  });
/**
 * 从评论监控记录中取出持有者身份字段（pid、任务、启动时间、pid 命名空间）；字段不完整时返回空对象。
 */
//@ chunk-w4p2kd11.js:4746-5124 placement
function pickHolderIdentity(e) {
  if (
    e.holderPid === void 0 ||
    e.holderJob === void 0 ||
    e.holderPidSpace === void 0 ||
    (e.holderProcStart === void 0 && e.holderProcStartFt === void 0)
  )
    return {};
  return {
    holderPid: e.holderPid,
    holderJob: e.holderJob,
    ...(e.holderProcStart !== void 0 && { holderProcStart: e.holderProcStart }),
    ...(e.holderProcStartFt !== void 0 && { holderProcStartFt: e.holderProcStartFt }),
    holderPidSpace: e.holderPidSpace,
  };
}
/**
 * 当前进程是后台任务时，返回写进监听意图的持有者身份（pid、任务短 id、进程启动标识、pid 命名空间）；身份还没就绪时先异步计算并返回空。
 */
//@ chunk-w4p2kd11.js:5124-5403 placement
function getOwnHolderIdentity() {
  let token = ownProcStartMemo.token;
  if (token === void 0) return (ownProcStartAsync(), {});
  let t = getBgJobDir();
  if (t === void 0 || !/^[0-9a-f]{8}$/.test(basename(t))) return {};
  let { procStart: procStart, procStartFt: procStartFt } = procIdentityFields(token);
  return pickHolderIdentity({
    holderPid: process.pid,
    holderJob: basename(t),
    holderProcStart: procStart,
    holderProcStartFt: procStartFt,
    holderPidSpace: ownPidSpace().slice(0, 160),
  });
}
//@ chunk-w4p2kd11.js:5403-5430 placement
function DRo() {
  return ownProcStartAsync();
}
//@ chunk-w4p2kd11.js:5430-6570 placement
function readCommentMonitorIntent(e, t) {
  let n = MONITOR_INTENT_SCHEMAS(),
    safeParse = n.envelope.safeParse(e);
  if (!safeParse.success)
    return (logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_invalid"), null);
  if (safeParse.data.sessionId !== getSessionId())
    return (logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_foreign"), null);
  if (safeParse.data.crossLineMerged === !0) t?.onLossy?.();
  let r = safeParse.data.tailTorn === !0;
  if (r) t?.onLossy?.();
  let d = new Map(),
    a = 0,
    l = 0,
    g = 0;
  for (let [m, c] of Object.entries(safeParse.data.artifacts)) {
    if (l++ >= 2 * MAX_INTENT_ENTRIES) {
      t?.onLossy?.();
      break;
    }
    let safeParse = n.record.safeParse(c);
    if (!ARTIFACT_SLUG_RE.test(m)) {
      (a++, t?.onLossy?.());
      continue;
    }
    if (!safeParse.success) {
      if ((a++, t?.onLossy?.(), typeof c === "object" && c !== null && c.state === "stopped"))
        d.set(m, { state: "stopped", writtenAtMs: Date.now() });
      continue;
    }
    if (r && safeParse.data.state === "armed" && safeParse.data.holder === void 0) {
      (d.set(m, {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(safeParse.data.title !== void 0 && { title: safeParse.data.title }),
      }),
        t?.onTornStop?.(m));
      continue;
    }
    if (safeParse.data.state === "armed" && g++ >= MAX_INTENT_ENTRIES) {
      t?.onLossy?.();
      continue;
    }
    let { state: state, writtenAtMs: writtenAtMs, title: title, holder: holder } = safeParse.data;
    d.set(m, {
      state: state,
      writtenAtMs: writtenAtMs,
      ...(title !== void 0 && { title: title }),
      ...(holder !== void 0 && { holder: holder, ...(r ? {} : pickHolderIdentity(safeParse.data)) }),
    });
  }
  if (a > 0) logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_record_invalid");
  return d;
}
/**
 * 取出所有监听意图（待恢复的 + 当前的），清空待恢复表，可排除某个 slug；同时刷新记录。
 */
//@ chunk-w4p2kd11.js:6570-6738 placement
function takeRestoredMonitorIntents(e) {
  let t = runCommentMonitor(e.storageV5),
    n = new Map([...(t.pendingRestore ?? []), ...t.bySlug]);
  t.pendingRestore = null;
  let { excludeSlug: excludeSlug } = e;
  if (excludeSlug !== void 0) n.delete(excludeSlug);
  return (persistCommentMonitorIntent(), n);
}
//@ chunk-w4p2kd11.js:6738-6796 placement
function Ozn() {
  return getLiveState().commentMonitorIntent.tornStops;
}
//@ chunk-w4p2kd11.js:6796-6854 placement
function LRo() {
  return getLiveState().commentMonitorIntent.storageV5;
}
//@ chunk-w4p2kd11.js:6854-6885 placement
function v5(e) {
  runCommentMonitor(e?.storageV5);
}
/**
 * 预置评论监控意图（早期种子与待领取会话），然后启动评论监控。
 */
//@ chunk-w4p2kd11.js:6885-7015 placement
function seedCommentMonitorIntent(e, t) {
  if (e === void 0 && !hasLiveState()) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  ((commentMonitorIntent.earlySeed = e),
    (commentMonitorIntent.adoptPendingFor = getSessionId()),
    runCommentMonitor(t?.storageV5));
}
/**
 * 记录某 slug 的评论监听为 armed（保留/更新标题，后台任务记持有者身份），标记需要随会话迁移，并写入会话记录；持有者身份尚未就绪时稍后补写。
 */
//@ chunk-w4p2kd11.js:7015-7402 placement
function armCommentMonitorIntent(e, t) {
  let n = runCommentMonitor(t?.storageV5);
  if (getLiveState().durable.stopLatches.isStopped(e)) return;
  let s = t?.title,
    r = s !== void 0 && s.length >= 1 && s.length <= MAX_TITLE_LENGTH,
    d = n.bySlug.get(e)?.title;
  n.forgottenAt.delete(e);
  let now = Date.now(),
    l = isActingAsBgJob() ? { holder: "bg", ...getOwnHolderIdentity() } : void 0;
  if (
    (n.bySlug.set(e, {
      state: "armed",
      writtenAtMs: now,
      ...(r ? { title: s } : d !== void 0 && { title: d }),
      ...l,
    }),
    markTravelling(n, e),
    persistCommentMonitorIntent(),
    l !== void 0 && l.holderPid === void 0)
  )
    backfillHolderIdentity(e, now);
}
/**
 * 异步取得本进程启动时间后，为后台任务持有的已布防评论监控记录补写持有者身份（记录未变时才写）。
 */
//@ chunk-w4p2kd11.js:7402-7702 placement
function backfillHolderIdentity(e, t) {
  ownProcStartAsync()
    .then(() => {
      if (!hasLiveState() || !isActingAsBgJob()) return;
      let commentMonitorIntent = getLiveState().commentMonitorIntent,
        s = commentMonitorIntent.bySlug.get(e);
      if (
        commentMonitorIntent.sid !== getSessionId() ||
        s?.state !== "armed" ||
        s.holder !== "bg" ||
        s.holderPid !== void 0 ||
        s.writtenAtMs !== t
      )
        return;
      let r = getOwnHolderIdentity();
      if (r.holderPid === void 0) return;
      (commentMonitorIntent.bySlug.set(e, { ...s, ...r }), persistCommentMonitorIntent());
    })
    .catch(() => {
      return;
    });
}
/**
 * 把某 slug 的监听意图标为 stopped 并立即持久写入；其他会话（parked）里仍 armed 的同一 slug 也改为 stopped 并写回。
 */
//@ chunk-w4p2kd11.js:7702-8061 placement
function stopCommentMonitorIntent(e, t) {
  let n = runCommentMonitor(t?.storageV5),
    s = n.bySlug.get(e);
  (n.bySlug.set(e, {
    state: "stopped",
    writtenAtMs: Date.now(),
    ...(s?.title !== void 0 && { title: s.title }),
  }),
    persistCommentMonitorIntent({ durableNow: !0 }));
  for (let [r, d] of n.parked) {
    let a = d.line[e];
    if (a?.state === "armed")
      ((d.line[e] = {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(a.title !== void 0 && { title: a.title }),
      }),
        writeCommentMonitorIntent(r, d.path, d.line, { durableNow: !0 }));
  }
}
//@ chunk-w4p2kd11.js:8061-8123 placement
function _Us(e, t) {
  return runCommentMonitor(t?.storageV5).bySlug.get(e)?.state;
}
/**
 * 忘掉一个或多个 slug 的监听意图（记录遗忘时间，表有上限），并从其他会话的迁移行里移除这些 armed 项；有变化时持久写入。
 */
//@ chunk-w4p2kd11.js:8123-8695 placement
function forgetCommentMonitorIntents(slugs, t) {
  let intent = runCommentMonitor(t?.storageV5),
    s = !1,
    slugSet = new Set(typeof slugs === "string" ? [slugs] : slugs),
    now = Date.now();
  for (let a of slugSet) {
    if (((s = intent.bySlug.delete(a) || s), intent.forgottenAt.delete(a), intent.forgottenAt.size >= ft)) {
      let l = intent.forgottenAt.keys().next().value;
      if (l !== void 0) intent.forgottenAt.delete(l);
    }
    intent.forgottenAt.set(a, now);
  }
  if (s) persistCommentMonitorIntent({ durableNow: !0 });
  for (let [a, l] of intent.parked) {
    let g = !1;
    for (let m of slugSet)
      if (l.traveling?.has(m) && l.line[m]?.state === "armed")
        (delete l.line[m], l.traveling.delete(m), (g = !0));
    if (g) {
      if (
        (writeCommentMonitorIntent(a, l.path, l.line, { durableNow: !0 }),
        !Object.values(l.line).some((m) => m.state === "armed"))
      )
        intent.parked.delete(a);
    }
  }
}
/**
 * 按远端给出的停止时间把对应 slug 的意图标为 stopped（被重新监听清除过的跳过），并确认停止锁存。
 */
//@ chunk-w4p2kd11.js:8695-9000 placement
function applyRemoteStops(e, t) {
  let n = runCommentMonitor(t?.storageV5),
    { stopLatches: stopLatches } = getLiveState().durable;
  for (let [r, d] of e) {
    if (stopLatches.wasClearedByRewatch(r)) continue;
    let a = n.bySlug.get(r);
    if (a === void 0 || a.state === "armed" || a.writtenAtMs <= d)
      n.bySlug.set(r, { state: "stopped", writtenAtMs: d, ...(a?.title !== void 0 && { title: a.title }) });
    stopLatches.reaffirmStop(r);
  }
  persistCommentMonitorIntent();
}
/**
 * 把所有 armed 且未让出的监听意图标为 stopped，并同样处理其他会话迁移行里的 armed 项，持久写入。
 */
//@ chunk-w4p2kd11.js:9000-9472 placement
function stopAllCommentMonitorIntents(e) {
  let t = runCommentMonitor(e?.storageV5),
    { yieldedSlugs: yieldedSlugs } = getLiveState().wakes,
    now = Date.now(),
    r = !1;
  for (let [d, a] of t.bySlug)
    if (a.state === "armed" && !yieldedSlugs.has(d))
      (t.bySlug.set(d, { state: "stopped", writtenAtMs: now, ...(a.title !== void 0 && { title: a.title }) }),
        (r = !0));
  if (r) persistCommentMonitorIntent({ durableNow: !0 });
  for (let [d, a] of t.parked) {
    let l = !1;
    for (let [g, m] of Object.entries(a.line))
      if (m.state === "armed")
        ((a.line[g] = { state: "stopped", writtenAtMs: now, ...(m.title !== void 0 && { title: m.title }) }),
          (l = !0));
    if (l) writeCommentMonitorIntent(d, a.path, a.line, { durableNow: !0 });
  }
}
//@ chunk-w4p2kd11.js:9472-9637 placement
function isSessionChangeCarrying(e) {
  switch (e) {
    case "clear":
    case "resume":
    case "fork":
    case "remote_attach":
      return !0;
    case "cd":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return !1;
  }
}
/**
 * 切换会话时记下离开的会话：会随会话迁移的 armed slug、该会话的记录是否尚未写出、是否在接管窗口内。
 */
//@ chunk-w4p2kd11.js:9637-9926 placement
function rememberLeavingSession() {
  let commentMonitorIntent = getLiveState().commentMonitorIntent,
    sid = commentMonitorIntent.sid;
  if (sid === null || sid === getSessionId()) {
    commentMonitorIntent.leftWith = null;
    return;
  }
  let n = new Set();
  for (let [s, r] of commentMonitorIntent.bySlug) if (r.state === "armed" && isAutoReactWired(s)) n.add(s);
  commentMonitorIntent.leftWith = {
    sid: sid,
    traveling: n,
    unwritten:
      !commentMonitorIntent.onFile &&
      !currentSessionFileIsFor(sid) &&
      commentMonitorIntent.adoptPendingFor !== sid,
    inWindow: commentMonitorIntent.adoptPendingFor === sid,
  };
}
/**
 * 清理随会话迁移而已"带走"的停放监控条目：删除其中已布防的行并写回，整组都没有布防条目时移出停放表。
 */
//@ chunk-w4p2kd11.js:9926-10262 placement
function dropTravelledFromParked() {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  if (!currentSessionFileIsFor(getSessionId())) return;
  for (let [t, n] of commentMonitorIntent.parked) {
    if (n.traveling === void 0 || t === getSessionId()) continue;
    let s = !1;
    for (let r of n.traveling) if (n.line[r]?.state === "armed") (delete n.line[r], (s = !0));
    if (((n.traveling = void 0), s)) writeCommentMonitorIntent(t, n.path, n.line);
    if (!Object.values(n.line).some((r) => r.state === "armed")) commentMonitorIntent.parked.delete(t);
  }
}
//@ chunk-w4p2kd11.js:10262-10388 placement
function isDeferredSessionFile(e, t) {
  if (currentSessionFileIsFor(t)) {
    if (e.adoptPendingFor === t) e.adoptPendingFor = null;
    return !1;
  }
  return e.adoptPendingFor === t || getMaterializedSessionFile() !== null;
}
/**
 * 排队写一条其他会话的监听意图行：先等会话存储刷盘，确认仍是最新、未在退出时盖章，且之前写失败过或是强制写，才写入对应会话记录。
 */
//@ chunk-w4p2kd11.js:10388-10781 placement
function queueParkedIntentWrite(e, t, n, s, r) {
  if (t === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent,
    a = { path: t, line: filterParkedLine(e, n) };
  (commentMonitorIntent.pendingLines.set(e, a),
    registerForeignTranscriptExitReStamp(collectExitIntentEntries),
    (commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.then(async () => {
      if ((await flushSessionStorage().catch(() => {}), commentMonitorIntent.pendingLines.get(e) !== a))
        return;
      if (commentMonitorIntent.exitStamped) return;
      if ((commentMonitorIntent.pendingLines.delete(e), !s && getTranscriptWriteFailureSeq() === r)) return;
      if (e === commentMonitorIntent.sid) {
        ((commentMonitorIntent.lastWritten = UNWRITTEN_MARKER), persistCommentMonitorIntent());
        return;
      }
      writeCommentMonitorIntent(e, t, n);
    })),
    (commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.catch(() => {})));
}
//@ chunk-w4p2kd11.js:10781-10793 placement
var ft = 1024;
//@ chunk-w4p2kd11.js:10793-11078 placement
function filterParkedLine(e, t) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent,
    s = commentMonitorIntent.parked.get(e);
  if (s?.unwritten === !0) {
    let { traveling: traveling } = s;
    return traveling === void 0 ? t : wi(t, (d, a) => d.state === "armed" && traveling.has(a));
  }
  if (s?.leftInWindow === !0)
    return dropTravellingFromEntry(commentMonitorIntent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId: e,
      artifacts: t,
    }).artifacts;
  return t;
}
//@ chunk-w4p2kd11.js:11078-11992 placement
function writeCommentMonitorIntent(e, t, n, s) {
  if (t === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent,
    { storageV5: storageV5 } = commentMonitorIntent,
    a = filterParkedLine(e, { ...n }),
    l = { type: "artifact-comment-monitor", v: 1, sessionId: e, artifacts: a };
  commentMonitorIntent.owedLines.delete(e);
  let g = { path: t, line: a };
  if (
    (commentMonitorIntent.pendingLines.set(e, g),
    registerForeignTranscriptExitReStamp(collectExitIntentEntries),
    s?.durableNow === !0)
  )
    appendEntryToCurrentTranscriptNow(l, t, toTornTailEntry(l));
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain
    .then(async () => {
      if ((await flushSessionStorage().catch(() => {}), commentMonitorIntent.exitStamped)) return;
      if (e === commentMonitorIntent.sid) {
        if (commentMonitorIntent.pendingLines.get(e) === g) commentMonitorIntent.pendingLines.delete(e);
        ((commentMonitorIntent.lastWritten = UNWRITTEN_MARKER), persistCommentMonitorIntent());
        return;
      }
      if (
        (await appendEntryToFileAsync(t, l, storageV5, {
          onlyIfExists: !0,
          tornTailEntry: toTornTailEntry(l),
        }),
        commentMonitorIntent.pendingLines.get(e) === g)
      )
        commentMonitorIntent.pendingLines.delete(e);
    })
    .catch(() => {
      if (commentMonitorIntent.pendingLines.get(e) !== g) {
        logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
        return;
      }
      if (
        (commentMonitorIntent.pendingLines.delete(e),
        commentMonitorIntent.owedLines.size >= 2 * MAX_PARKED_INTENTS)
      ) {
        let m = commentMonitorIntent.owedLines.keys().next().value;
        if (m !== void 0) commentMonitorIntent.owedLines.delete(m);
      }
      (commentMonitorIntent.owedLines.set(e, { path: t, line: a }),
        logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed"));
    });
}
//@ chunk-w4p2kd11.js:11992-12032 placement
function HRo(e, t) {
  markTravelling(runCommentMonitor(t?.storageV5), e);
}
//@ chunk-w4p2kd11.js:12032-12176 placement
function markTravelling(e, t) {
  let n = !1;
  for (let [s, r] of e.parked) {
    if (s === getSessionId() || r.line[t]?.state !== "armed") continue;
    ((r.traveling ??= new Set()).add(t), (n = !0));
  }
  if (n) dropTravelledFromParked();
}
//@ chunk-w4p2kd11.js:12176-12451 placement
function flushOwedIntentLines(e) {
  if (e.owedLines.size === 0) return;
  let t = [...e.owedLines.entries()];
  e.owedLines.clear();
  let n = !1;
  for (let [s, { path: r, line: d }] of t) {
    if (s === e.sid) {
      ((e.lastWritten = UNWRITTEN_MARKER), (n = !0));
      continue;
    }
    if (e.pendingLines.has(s)) continue;
    let a = e.parked.get(s);
    writeCommentMonitorIntent(s, a?.path ?? r, a?.line ?? d);
  }
  if (n) persistCommentMonitorIntent();
}
/**
 * Artifact 评论监视器主循环（armed/stopped/clear 状态）
 */
//@ chunk-w4p2kd11.js:12451-15513 placement
function runCommentMonitor(e) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  if (e !== void 0) commentMonitorIntent.storageV5 = e;
  let n = getSessionId(),
    s = !1,
    r = !1;
  if (commentMonitorIntent.sid !== n) {
    let a =
        commentMonitorIntent.leftWith !== null &&
        commentMonitorIntent.leftWith.sid === commentMonitorIntent.sid
          ? commentMonitorIntent.leftWith
          : null,
      l = (S) => (a !== null ? a.traveling.has(S) : isAutoReactWired(S));
    commentMonitorIntent.leftWith = null;
    let g = selectIntentsToWrite(commentMonitorIntent),
      m = new Set(),
      c = 0;
    for (let [S, w] of commentMonitorIntent.bySlug) {
      if (w.state !== "armed") continue;
      if (l(S)) m.add(S);
      else (commentMonitorIntent.bySlug.delete(S), c++);
    }
    let { stopLatches: stopLatches } = getLiveState().durable;
    for (let [S, w] of Object.entries(commentMonitorIntent.parked.get(n)?.line ?? {})) {
      let y = commentMonitorIntent.forgottenAt.get(S);
      if (w.state === "armed" && y !== void 0 && w.writtenAtMs <= y && !isAutoReactWired(S)) {
        r = !0;
        continue;
      }
      let b = newerIntent(commentMonitorIntent.bySlug.get(S), w);
      if (b.state === "armed" && stopLatches.isStopped(S))
        b = { state: "stopped", writtenAtMs: Date.now(), ...(b.title !== void 0 && { title: b.title }) };
      if ((commentMonitorIntent.bySlug.set(S, b), b.state === "stopped")) stopLatches.confirmStop(S);
    }
    commentMonitorIntent.parked.delete(n);
    for (let S of [commentMonitorIntent.owedLines.get(n), commentMonitorIntent.pendingLines.get(n)])
      for (let [w, y] of Object.entries(S?.line ?? {})) {
        if (y.state !== "stopped") continue;
        let b = newerIntent(commentMonitorIntent.bySlug.get(w), y);
        if ((commentMonitorIntent.bySlug.set(w, b), b.state === "stopped")) stopLatches.confirmStop(w);
      }
    if (commentMonitorIntent.sid !== null && (c > 0 || m.size > 0)) {
      commentMonitorIntent.parked.set(commentMonitorIntent.sid, {
        path: commentMonitorIntent.transcriptPath,
        line: g,
        ...(m.size > 0 && { traveling: m }),
        ...(a?.unwritten === !0 && { unwritten: !0 }),
        ...(a?.inWindow === !0 && { leftInWindow: !0 }),
      });
      while (commentMonitorIntent.parked.size > MAX_PARKED_INTENTS) {
        let [S, w] = commentMonitorIntent.parked.entries().next().value;
        commentMonitorIntent.parked.delete(S);
        let now = Date.now();
        writeCommentMonitorIntent(
          S,
          w.path,
          Object.fromEntries(
            Object.entries(w.line).flatMap(([b, L]) =>
              L.state !== "armed"
                ? [[b, L]]
                : w.traveling?.has(b)
                  ? []
                  : [
                      [
                        b,
                        { state: "stopped", writtenAtMs: now, ...(L.title !== void 0 && { title: L.title }) },
                      ],
                    ],
            ),
          ),
        );
      }
    }
    if (commentMonitorIntent.sid !== null && commentMonitorIntent.wroteCurrentLine)
      queueParkedIntentWrite(
        commentMonitorIntent.sid,
        commentMonitorIntent.transcriptPath,
        g,
        commentMonitorIntent.lastWritten === UNWRITTEN_MARKER,
        commentMonitorIntent.failureSeqAtWrite,
      );
    else if (commentMonitorIntent.sid !== null && a?.inWindow === !0 && nt(commentMonitorIntent, g))
      queueParkedIntentWrite(
        commentMonitorIntent.sid,
        commentMonitorIntent.transcriptPath,
        g,
        !0,
        commentMonitorIntent.failureSeqAtWrite,
      );
    if (
      (dropTravelledFromParked(),
      (s = [...commentMonitorIntent.bySlug.values()].some((S) => S.state === "armed")),
      (commentMonitorIntent.sid = n),
      commentMonitorIntent.adoptPendingFor !== n)
    )
      commentMonitorIntent.adoptPendingFor = null;
    ((commentMonitorIntent.lastWritten = r ? UNWRITTEN_MARKER : null),
      (commentMonitorIntent.wroteCurrentLine = !1),
      (commentMonitorIntent.pendingRestore = null),
      (commentMonitorIntent.transcriptPath = null),
      commentMonitorIntent.tornStops.clear(),
      (commentMonitorIntent.onFile = !1));
  }
  if (!commentMonitorIntent.onFile && currentSessionFileIsFor(n)) commentMonitorIntent.onFile = !0;
  if (
    ((commentMonitorIntent.transcriptPath = isDeferredSessionFile(commentMonitorIntent, n)
      ? getTranscriptPath()
      : getTranscriptPathForSession(n)),
    commentMonitorIntent.unsubscribeMaterialized === void 0)
  )
    commentMonitorIntent.unsubscribeMaterialized = onSessionFileMaterialized(() => {
      if (commentMonitorIntent.sid !== null && currentSessionFileIsFor(commentMonitorIntent.sid))
        commentMonitorIntent.onFile = !0;
      dropTravelledFromParked();
    });
  if (commentMonitorIntent.unsubscribeSwitch === void 0)
    ((commentMonitorIntent.unregisterExitDrain = registerTranscriptExitDrain(
      () => (flushOwedIntentLines(commentMonitorIntent), commentMonitorIntent.writeChain),
    )),
      registerForeignTranscriptExitReStamp(collectExitIntentEntries),
      (commentMonitorIntent.unsubscribeSwitch = onSessionSwitch((a, l) => {
        if (l === "cd" && commentMonitorIntent.sid === a)
          commentMonitorIntent.transcriptPath = getTranscriptPathForSession(a);
        if (isSessionChangeCarrying(l)) rememberLeavingSession();
        if (l === "clear") queueMicrotask(persistCommentMonitorIntent);
      })));
  let d = commentMonitorIntent.earlySeed ?? takeResumedArtifactCommentMonitor();
  if (((commentMonitorIntent.earlySeed = void 0), d !== void 0)) {
    let a = !1,
      l = readCommentMonitorIntent(d, {
        onLossy: () => {
          a = !0;
        },
        onTornStop: (g) => {
          commentMonitorIntent.tornStops.add(g);
        },
      });
    if (l !== null) {
      if (d.tailTorn === !0) sealTornTranscriptTail(commentMonitorIntent.transcriptPath ?? void 0);
      let { stopLatches: stopLatches } = getLiveState().durable,
        m = new Map();
      for (let [c, h] of l) {
        let S = commentMonitorIntent.forgottenAt.get(c);
        if (h.state === "armed" && S !== void 0 && h.writtenAtMs <= S && !isAutoReactWired(c)) {
          a = !0;
          continue;
        }
        let w = commentMonitorIntent.bySlug.get(c);
        if (commentMonitorIntent.tornStops.has(c) && w?.state === "armed" && isAutoReactWired(c)) {
          (commentMonitorIntent.tornStops.delete(c), m.set(c, w), (a = !0));
          continue;
        }
        let y = newerIntent(w, h);
        if ((commentMonitorIntent.bySlug.set(c, y), m.set(c, y), y.state === "stopped"))
          stopLatches.confirmStop(c);
      }
      if (((commentMonitorIntent.pendingRestore = m), !a && commentMonitorIntent.lastWritten === null))
        ((commentMonitorIntent.lastWritten = intentFingerprint(Object.fromEntries(l))),
          (commentMonitorIntent.failureSeqAtWrite = getTranscriptWriteFailureSeq()));
      else if (a && commentMonitorIntent.lastWritten === null)
        commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      publishDurableWatchRegistry();
    }
  }
  if ((flushOwedIntentLines(commentMonitorIntent), s || r)) persistCommentMonitorIntent();
  return commentMonitorIntent;
}
//@ chunk-w4p2kd11.js:15513-15722 placement
function newerIntent(e, t) {
  if (e === void 0) return t;
  if (t.state === "stopped" && e.state !== "stopped" && t.writtenAtMs >= e.writtenAtMs) return t;
  if (t.state === "armed" && e.state === "armed" && t.writtenAtMs > e.writtenAtMs) return t;
  return e;
}
//@ chunk-w4p2kd11.js:15722-15902 placement
function selectIntentsToWrite(e) {
  return Object.fromEntries(
    [...e.bySlug.entries()]
      .sort(
        ([, t], [, n]) =>
          Number(n.state === "stopped") - Number(t.state === "stopped") || n.writtenAtMs - t.writtenAtMs,
      )
      .slice(0, MAX_INTENT_ENTRIES),
  );
}
//@ chunk-w4p2kd11.js:15902-16128 placement
function buildExitIntentEntry() {
  let { commentMonitorIntent: commentMonitorIntent, wakes: wakes } = getLiveState();
  if (
    !commentMonitorIntent.wroteCurrentLine ||
    commentMonitorIntent.sid !== getSessionId() ||
    [...commentMonitorIntent.bySlug.keys()].some((n) => wakes.yieldedSlugs.has(n))
  )
    return;
  return {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId: getSessionId(),
    artifacts: selectIntentsToWrite(commentMonitorIntent),
  };
}
/**
 * 进程退出时收集要补写进会话记录的监听意图行：当前会话（必要时）、欠写与待写的其他会话行；每行附带一个把无持有者的 armed 改为 stopped 的"尾部撕裂"备份行。
 */
//@ chunk-w4p2kd11.js:16128-16829 placement
function collectExitIntentEntries() {
  let intent = getLiveState().commentMonitorIntent,
    sessionId = getSessionId(),
    currentEntry,
    s = () => nt(intent, selectIntentsToWrite(intent)),
    r = !intent.exitStamped && intent.sid === sessionId;
  if (r && currentSessionFileIsFor(sessionId)) {
    if (
      intent.wroteCurrentLine ||
      s() ||
      intent.owedLines.has(sessionId) ||
      intent.pendingLines.has(sessionId)
    )
      (dropTravelledFromParked(),
        (intent.wroteCurrentLine = !0),
        registerTranscriptExitReStamp(buildExitIntentEntry));
  } else if (r && isDeferredSessionFile(intent, sessionId) && intent.transcriptPath !== null && s()) {
    let a = dropTravellingFromEntry(intent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId: sessionId,
      artifacts: selectIntentsToWrite(intent),
    });
    currentEntry = { path: intent.transcriptPath, entry: a, tornTailEntry: toTornTailEntry(a) };
    for (let l of [intent.owedLines, intent.pendingLines])
      if (l.get(sessionId)?.path === currentEntry.path) l.delete(sessionId);
  }
  intent.exitStamped = !0;
  let mapped = [...intent.owedLines, ...intent.pendingLines].map(([a, { path: l, line: g }]) => {
    let m = { type: "artifact-comment-monitor", v: 1, sessionId: a, artifacts: g };
    return { path: l, entry: m, tornTailEntry: toTornTailEntry(m) };
  });
  return currentEntry === void 0 ? mapped : [...mapped, currentEntry];
}
//@ chunk-w4p2kd11.js:16829-17012 placement
function toTornTailEntry(e) {
  let now = Date.now();
  return {
    ...e,
    artifacts: xr(e.artifacts, (n) =>
      n.state === "armed" && n.holder === void 0
        ? { state: "stopped", writtenAtMs: now, ...(n.title !== void 0 && { title: n.title }) }
        : n,
    ),
  };
}
//@ chunk-w4p2kd11.js:17012-17286 placement
function dropTravellingFromEntry(e, t) {
  let n = getSessionId(),
    s = new Set();
  for (let [r, d] of e.parked) {
    if (r === n || r === t.sessionId || d.unwritten) continue;
    for (let a of d.traveling ?? []) if (d.line[a]?.state === "armed") s.add(a);
  }
  if (s.size === 0) return t;
  return { ...t, artifacts: wi(t.artifacts, (r, d) => r.state === "armed" && s.has(d)) };
}
//@ chunk-w4p2kd11.js:17286-17383 placement
function nt(e, t) {
  return e.lastWritten !== intentFingerprint(t) && !(e.lastWritten === null && Object.keys(t).length === 0);
}
//@ chunk-w4p2kd11.js:17383-17605 placement
function intentFingerprint(e) {
  return jsonStringify(
    Object.entries(e)
      .map(([t, n]) => [
        t,
        n.state,
        n.writtenAtMs,
        n.title ?? null,
        n.holder ?? null,
        n.holderPid ?? null,
        n.holderProcStart ?? n.holderProcStartFt ?? null,
        n.holderJob ?? null,
        n.holderPidSpace ?? null,
      ])
      .sort(),
  );
}
/**
 * 把当前会话的评论监听意图写入会话记录：与上次指纹相同且没有新写失败则跳过；会话文件尚未落盘时延后（durableNow 时直接追加）；写失败时打点并允许重写。
 */
//@ chunk-w4p2kd11.js:17605-18212 placement
function persistCommentMonitorIntent(options) {
  let intent = runCommentMonitor();
  (dropTravelledFromParked(), publishDurableWatchRegistry());
  let n = selectIntentsToWrite(intent),
    fingerprint = intentFingerprint(n);
  if (fingerprint === intent.lastWritten && getTranscriptWriteFailureSeq() === intent.failureSeqAtWrite)
    return;
  if (
    ((intent.failureSeqAtWrite = getTranscriptWriteFailureSeq()),
    intent.lastWritten === null && intent.bySlug.size === 0)
  ) {
    intent.lastWritten = fingerprint;
    return;
  }
  let entry = { type: "artifact-comment-monitor", v: 1, sessionId: getSessionId(), artifacts: n };
  if (isDeferredSessionFile(intent, getSessionId())) {
    if (
      ((intent.lastWritten = UNWRITTEN_MARKER), options?.durableNow === !0 && intent.transcriptPath !== null)
    ) {
      let d = dropTravellingFromEntry(intent, entry);
      appendEntryToCurrentTranscriptNow(d, intent.transcriptPath, toTornTailEntry(d));
    }
    return;
  }
  if (
    ((intent.lastWritten = fingerprint),
    (intent.wroteCurrentLine = !0),
    registerTranscriptExitReStamp(buildExitIntentEntry),
    options?.durableNow === !0)
  )
    appendEntryToCurrentTranscriptNow(entry);
  recordArtifactCommentMonitor(entry, intent.storageV5).catch(() => {
    if (intent.lastWritten === fingerprint) intent.lastWritten = UNWRITTEN_MARKER;
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
  });
}

export {
  readCommentMonitorIntent,
  takeRestoredMonitorIntents,
  Ozn,
  applyRemoteStops,
  seedCommentMonitorIntent,
  isAutoReactWired,
  stopCommentMonitorIntent,
  forgetCommentMonitorIntents,
  v5,
  _Us,
  stopAllCommentMonitorIntents,
  readCommentMonitorRegistry,
  publishDurableWatchRegistry,
  pUs,
  mUs,
  LRo,
  DRo,
  HRo,
  armCommentMonitorIntent,
};
