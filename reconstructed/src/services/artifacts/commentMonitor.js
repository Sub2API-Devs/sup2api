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
import {
  u,
  literal,
  record,
  string,
  unknown,
  E,
  _enum,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
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

//@ chunk-w4p2kd11.js:876-1711 placement
/**
 * 持久评论监听登记表的常量与 schema：事件类型（published/comment）、行数与孤立触发器上限、时间格式、行/停止/孤立触发器信封。
 */
var MONITOR_EVENT_KINDS = {
  published: "published",
  comment: "comment",
};
var MAX_REGISTRY_ROWS = 64;
var MAX_ORPHAN_TRIGGERS = 16;
var ISO_MS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
var REGISTRY_UNPUBLISHED = "";
var DURABLE_REGISTRY_SCHEMAS = DoctorLazy(() => {
  let rowsEnvelope = u({
    v: literal(1),
    rows: record(string(), unknown()),
  });
  let newerEnvelope = u({
    v: E().gt(1),
  });
  let stopsEnvelope = u({
    stopped: record(string(), unknown()),
  });
  let s = _enum(MONITOR_EVENT_KINDS);
  let r = string().refine((g) => normalizeUuidOrNull(g) !== null);
  let orphansEnvelope = u({
    orphans: array(unknown()).transform((g) =>
      g.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((m) => {
        let c = r.safeParse(m);
        return c.success ? [c.data] : [];
      }),
    ),
  });
  let row = u({
    trigger_id: r,
    since: string().regex(ISO_MS_RE),
    events: array(string())
      .max(16)
      .transform((g) =>
        uniq(g).flatMap((m) => {
          let c = s.safeParse(m);
          return c.success ? [c.data] : [];
        }),
      )
      .refine((g) => g.length > 0),
    unreleased: array(unknown())
      .catch([])
      .transform((g) =>
        g.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((m) => {
          let c = r.safeParse(m);
          return c.success ? [c.data] : [];
        }),
      ),
    claude_doc: literal(true).optional().catch(undefined),
  });
  let stop = u({
    at_ms: E().refine(Number.isFinite),
  });
  return {
    rowsEnvelope,
    newerEnvelope,
    stopsEnvelope,
    orphansEnvelope,
    row,
    stop,
  };
});
//@ chunk-w4p2kd11.js:1711-1755 placement
/**
 * 导出函数 `setRegistrySink`：参数 e。
 */
function setRegistrySink(registrySink) {
  getLiveState().durable.registrySink = registrySink;
}
//@ chunk-w4p2kd11.js:1755-1804 placement
/**
 * 导出函数 `resetRegistryPublished`。
 */
function resetRegistryPublished() {
  getLiveState().durable.registryPublished = REGISTRY_UNPUBLISHED;
}
//@ chunk-w4p2kd11.js:1804-2880 placement
/**
 * 远程环境下把持久评论监听登记表（各 slug 的触发器、起始时间、事件、未释放触发器；已停止的 slug；孤立触发器）序列化后经 registrySink 上报；与上次相同则跳过。
 */
function publishDurableWatchRegistry() {
  if (!env.CLAUDE_CODE_REMOTE) return;
  let liveState = getLiveState();
  let { durable } = liveState;
  if (durable.registrySink === null) return;
  let rows = {};
  let restoredOnly = [];
  let orphanCandidates = new Set();
  for (let c of durable.pendingRestoredRows.values()) {
    let h = durable.rows.get(c.slug);
    if (h === undefined && !durable.unwatchedSlugs.has(c.slug)) {
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
      ...(c.unreleased !== undefined &&
        c.unreleased.length > 0 && {
          unreleased: [...c.unreleased],
        }),
      ...((c.claudeDoc || durable.pendingRestoredRows.get(c.slug)?.claudeDoc) && {
        claude_doc: true,
      }),
    };
  let stopped = {};
  let sliced = [...liveState.commentMonitorIntent.bySlug.entries()]
    .filter(([, c]) => c.state === "stopped")
    .sort(([, c], [, h]) => h.writtenAtMs - c.writtenAtMs)
    .slice(0, MAX_REGISTRY_ROWS);
  for (let [c, h] of sliced)
    stopped[c] = {
      at_ms: h.writtenAtMs,
    };
  let sliced_2 = uniq([...durable.orphanTriggers, ...orphanCandidates]).slice(0, MAX_ORPHAN_TRIGGERS);
  let g =
    durable.rows.size + restoredOnly.length === 0 && sliced.length === 0 && sliced_2.length === 0
      ? null
      : {
          v: 1,
          rows,
          stopped,
          ...(sliced_2.length > 0 && {
            orphans: sliced_2,
          }),
        };
  let m = jsonStringify(g);
  if (m === durable.registryPublished) return;
  durable.registryPublished = m;
  durable.registrySink({
    artifact_durable_watches: g,
  });
}
//@ chunk-w4p2kd11.js:2880-3805 placement
function readCommentMonitorRegistry(artifactDurableWatches) {
  if (artifactDurableWatches === undefined || artifactDurableWatches === null) return null;
  let t = DURABLE_REGISTRY_SCHEMAS();
  let n = 0;
  let s = [];
  let r = t.rowsEnvelope.safeParse(artifactDurableWatches);
  if (r.success)
    for (let [m, c] of boundedRegistryRows(r.data.rows)) {
      let h = t.row.safeParse(c);
      if (!ARTIFACT_SLUG_RE.test(m) || !h.success) {
        n++;
        continue;
      }
      s.push({
        slug: m,
        triggerId: h.data.trigger_id,
        since: h.data.since,
        events: h.data.events,
        ...(h.data.unreleased.length > 0 && {
          unreleased: h.data.unreleased,
        }),
        ...(h.data.claude_doc && {
          claudeDoc: true,
        }),
      });
    }
  let d = new Map();
  let a = t.stopsEnvelope.safeParse(artifactDurableWatches);
  if (a.success)
    for (let [m, c] of boundedRegistryRows(a.data.stopped)) {
      if (!ARTIFACT_SLUG_RE.test(m)) {
        n++;
        continue;
      }
      let h = t.stop.safeParse(c);
      d.set(m, h.success ? h.data.at_ms : Date.now());
      if (!h.success) n++;
    }
  if (!r.success || !a.success)
    logFeatureSad(
      "artifact_durable_subscribe",
      a.success && t.newerEnvelope.safeParse(artifactDurableWatches).success
        ? "registry_newer_version"
        : "registry_invalid",
    );
  else if (n > 0) logFeatureSad("artifact_durable_subscribe", "registry_entry_invalid");
  let l = t.orphansEnvelope.safeParse(artifactDurableWatches);
  let orphans = l.success ? l.data.orphans : [];
  return {
    rows: s,
    stopped: d,
    orphans,
  };
}
//@ chunk-w4p2kd11.js:3805-3871 placement
function boundedRegistryRows(e) {
  return Object.keys(e)
    .slice(0, MAX_REGISTRY_ROWS)
    .map((key) => [key, e[key]]);
}
//@ chunk-w4p2kd11.js:3871-4015 placement
/**
 * 判断某个 slug 是否有接上自动回复的活跃监听（或正在建立）。
 */
function isAutoReactWired(e) {
  let { live } = getLiveState();
  let n = live.supervisors.get(e);
  return (
    (n !== undefined && !n.stopped && n.autoReactWiring !== undefined) || live.inFlightWiredIntent.has(e)
  );
}
//@ chunk-w4p2kd11.js:4015-4746 placement
/**
 * 会话记录里评论监听意图（artifact-comment-monitor）的标记与 schema：标题/持有者字段上限、单条记录（armed/stopped、写入时间、标题、后台持有者进程身份）与整行信封。
 */
var UNWRITTEN_MARKER = "\x00unwritten";
var MAX_TITLE_LENGTH = 256;
var MAX_PARKED_INTENTS = 32;
var MAX_INTENT_ENTRIES = 64;
var MONITOR_INTENT_SCHEMAS = DoctorLazy(() => {
  let writtenAtMs = E().refine(Number.isFinite);
  let record_2 = u({
    state: _enum(["armed", "stopped"]),
    writtenAtMs,
    title: string().min(1).max(MAX_TITLE_LENGTH).optional(),
    holder: string()
      .optional()
      .transform((s) => (s === undefined ? undefined : "bg")),
    holderPid: E().int().positive().optional().catch(undefined),
    holderProcStart: string().min(1).max(64).optional().catch(undefined),
    holderProcStartFt: string().min(1).max(64).optional().catch(undefined),
    holderJob: string()
      .regex(/^[0-9a-f]{8}$/)
      .optional()
      .catch(undefined),
    holderPidSpace: string().min(1).max(160).optional().catch(undefined),
  });
  let envelope = u({
    type: literal("artifact-comment-monitor"),
    v: literal(1),
    sessionId: string(),
    artifacts: record(string(), unknown()),
    crossLineMerged: literal(true).optional().catch(undefined),
    tailTorn: literal(true).optional().catch(undefined),
  });
  return {
    record: record_2,
    envelope,
  };
});
//@ chunk-w4p2kd11.js:4746-5124 placement
/**
 * 从评论监控记录中取出持有者身份字段（pid、任务、启动时间、pid 命名空间）；字段不完整时返回空对象。
 */
function pickHolderIdentity(e) {
  if (
    e.holderPid === undefined ||
    e.holderJob === undefined ||
    e.holderPidSpace === undefined ||
    (e.holderProcStart === undefined && e.holderProcStartFt === undefined)
  )
    return {};
  return {
    holderPid: e.holderPid,
    holderJob: e.holderJob,
    ...(e.holderProcStart !== undefined && {
      holderProcStart: e.holderProcStart,
    }),
    ...(e.holderProcStartFt !== undefined && {
      holderProcStartFt: e.holderProcStartFt,
    }),
    holderPidSpace: e.holderPidSpace,
  };
}
//@ chunk-w4p2kd11.js:5124-5403 placement
/**
 * 当前进程是后台任务时，返回写进监听意图的持有者身份（pid、任务短 id、进程启动标识、pid 命名空间）；身份还没就绪时先异步计算并返回空。
 */
function getOwnHolderIdentity() {
  let token = ownProcStartMemo.token;
  if (token === undefined) {
    ownProcStartAsync();
    return {};
  }
  let bgJobDir = getBgJobDir();
  if (bgJobDir === undefined || !/^[0-9a-f]{8}$/.test(basename(bgJobDir))) return {};
  let { procStart, procStartFt } = procIdentityFields(token);
  return pickHolderIdentity({
    holderPid: process.pid,
    holderJob: basename(bgJobDir),
    holderProcStart: procStart,
    holderProcStartFt: procStartFt,
    holderPidSpace: ownPidSpace().slice(0, 160),
  });
}
//@ chunk-w4p2kd11.js:5403-5430 placement
/**
 * 导出函数 `ownProcStart`：返回 ownProcStartAsync()。
 */
function ownProcStart() {
  return ownProcStartAsync();
}
//@ chunk-w4p2kd11.js:5430-6570 placement
function readCommentMonitorIntent(e, t) {
  let n = MONITOR_INTENT_SCHEMAS();
  let s = n.envelope.safeParse(e);
  if (!s.success) {
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_invalid");
    return null;
  }
  if (s.data.sessionId !== getSessionId()) {
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_foreign");
    return null;
  }
  if (s.data.crossLineMerged === true) t?.onLossy?.();
  let r = s.data.tailTorn === true;
  if (r) t?.onLossy?.();
  let d = new Map();
  let a = 0;
  let l = 0;
  let g = 0;
  for (let [key, value] of Object.entries(s.data.artifacts)) {
    if (l++ >= 2 * MAX_INTENT_ENTRIES) {
      t?.onLossy?.();
      break;
    }
    let h = n.record.safeParse(value);
    if (!ARTIFACT_SLUG_RE.test(key)) {
      a++;
      t?.onLossy?.();
      continue;
    }
    if (!h.success) {
      a++;
      t?.onLossy?.();
      if (typeof value === "object" && value !== null && value.state === "stopped")
        d.set(key, {
          state: "stopped",
          writtenAtMs: Date.now(),
        });
      continue;
    }
    if (r && h.data.state === "armed" && h.data.holder === undefined) {
      d.set(key, {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(h.data.title !== undefined && {
          title: h.data.title,
        }),
      });
      t?.onTornStop?.(key);
      continue;
    }
    if (h.data.state === "armed" && g++ >= MAX_INTENT_ENTRIES) {
      t?.onLossy?.();
      continue;
    }
    let { state, writtenAtMs, title, holder } = h.data;
    d.set(key, {
      state,
      writtenAtMs,
      ...(title !== undefined && {
        title,
      }),
      ...(holder !== undefined && {
        holder,
        ...(r ? {} : pickHolderIdentity(h.data)),
      }),
    });
  }
  if (a > 0) logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_record_invalid");
  return d;
}
//@ chunk-w4p2kd11.js:6570-6738 placement
/**
 * 取出所有监听意图（待恢复的 + 当前的），清空待恢复表，可排除某个 slug；同时刷新记录。
 */
function takeRestoredMonitorIntents(e) {
  let t = runCommentMonitor(e.storageV5);
  let n = new Map([...(t.pendingRestore ?? []), ...t.bySlug]);
  t.pendingRestore = null;
  let { excludeSlug } = e;
  if (excludeSlug !== undefined) n.delete(excludeSlug);
  persistCommentMonitorIntent();
  return n;
}
//@ chunk-w4p2kd11.js:6738-6796 placement
/**
 * 导出函数 `tornStopIntents`：返回 getLiveState().commentMonitorIntent.tornStops。
 */
function tornStopIntents() {
  return getLiveState().commentMonitorIntent.tornStops;
}
//@ chunk-w4p2kd11.js:6796-6854 placement
/**
 * 导出函数 `monitorStorage`：返回 getLiveState().commentMonitorIntent.storageV5。
 */
function monitorStorage() {
  return getLiveState().commentMonitorIntent.storageV5;
}
//@ chunk-w4p2kd11.js:6854-6885 placement
/**
 * 导出函数 `runCommentMonitorWithIntent`：参数 e。
 */
function runCommentMonitorWithIntent(e) {
  runCommentMonitor(e?.storageV5);
}
//@ chunk-w4p2kd11.js:6885-7015 placement
/**
 * 预置评论监控意图（早期种子与待领取会话），然后启动评论监控。
 */
function seedCommentMonitorIntent(artifactCommentMonitor, t) {
  if (artifactCommentMonitor === undefined && !hasLiveState()) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  commentMonitorIntent.earlySeed = artifactCommentMonitor;
  commentMonitorIntent.adoptPendingFor = getSessionId();
  runCommentMonitor(t?.storageV5);
}
//@ chunk-w4p2kd11.js:7015-7402 placement
/**
 * 记录某 slug 的评论监听为 armed（保留/更新标题，后台任务记持有者身份），标记需要随会话迁移，并写入会话记录；持有者身份尚未就绪时稍后补写。
 */
function armCommentMonitorIntent(e, t) {
  let n = runCommentMonitor(t?.storageV5);
  if (getLiveState().durable.stopLatches.isStopped(e)) return;
  let title = t?.title;
  let r = title !== undefined && title.length >= 1 && title.length <= MAX_TITLE_LENGTH;
  let title_2 = n.bySlug.get(e)?.title;
  n.forgottenAt.delete(e);
  let now = Date.now();
  let l = isActingAsBgJob()
    ? {
        holder: "bg",
        ...getOwnHolderIdentity(),
      }
    : undefined;
  n.bySlug.set(e, {
    state: "armed",
    writtenAtMs: now,
    ...(r
      ? {
          title,
        }
      : title_2 !== undefined && {
          title: title_2,
        }),
    ...l,
  });
  markTravelling(n, e);
  persistCommentMonitorIntent();
  if (l !== undefined && l.holderPid === undefined) backfillHolderIdentity(e, now);
}
//@ chunk-w4p2kd11.js:7402-7702 placement
/**
 * 异步取得本进程启动时间后，为后台任务持有的已布防评论监控记录补写持有者身份（记录未变时才写）。
 */
function backfillHolderIdentity(e, t) {
  ownProcStartAsync()
    .then(() => {
      if (!hasLiveState() || !isActingAsBgJob()) return;
      let commentMonitorIntent = getLiveState().commentMonitorIntent;
      let s = commentMonitorIntent.bySlug.get(e);
      if (
        commentMonitorIntent.sid !== getSessionId() ||
        s?.state !== "armed" ||
        s.holder !== "bg" ||
        s.holderPid !== undefined ||
        s.writtenAtMs !== t
      )
        return;
      let ownHolderIdentity = getOwnHolderIdentity();
      if (ownHolderIdentity.holderPid === undefined) return;
      commentMonitorIntent.bySlug.set(e, {
        ...s,
        ...ownHolderIdentity,
      });
      persistCommentMonitorIntent();
    })
    .catch(() => {
      return;
    });
}
//@ chunk-w4p2kd11.js:7702-8061 placement
/**
 * 把某 slug 的监听意图标为 stopped 并立即持久写入；其他会话（parked）里仍 armed 的同一 slug 也改为 stopped 并写回。
 */
function stopCommentMonitorIntent(e, t) {
  let n = runCommentMonitor(t?.storageV5);
  let s = n.bySlug.get(e);
  n.bySlug.set(e, {
    state: "stopped",
    writtenAtMs: Date.now(),
    ...(s?.title !== undefined && {
      title: s.title,
    }),
  });
  persistCommentMonitorIntent({
    durableNow: true,
  });
  for (let [r, d] of n.parked) {
    let a = d.line[e];
    if (a?.state === "armed") {
      d.line[e] = {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(a.title !== undefined && {
          title: a.title,
        }),
      };
      writeCommentMonitorIntent(r, d.path, d.line, {
        durableNow: true,
      });
    }
  }
}
//@ chunk-w4p2kd11.js:8061-8123 placement
/**
 * 导出函数 `forgetSlugIntent`：参数 e, t，返回 runCommentMonitor(t?.storageV5).bySlug.get(e)?.state。
 */
function forgetSlugIntent(slug, t) {
  return runCommentMonitor(t?.storageV5).bySlug.get(slug)?.state;
}
//@ chunk-w4p2kd11.js:8123-8695 placement
/**
 * 忘掉一个或多个 slug 的监听意图（记录遗忘时间，表有上限），并从其他会话的迁移行里移除这些 armed 项；有变化时持久写入。
 */
function forgetCommentMonitorIntents(slugs, t) {
  let intent = runCommentMonitor(t?.storageV5);
  let s = false;
  let slugSet = new Set(typeof slugs === "string" ? [slugs] : slugs);
  let now = Date.now();
  for (let slug of slugSet) {
    s = intent.bySlug.delete(slug) || s;
    intent.forgottenAt.delete(slug);
    if (intent.forgottenAt.size >= MAX_FORGOTTEN_SLUGS) {
      let l = intent.forgottenAt.keys().next().value;
      if (l !== undefined) intent.forgottenAt.delete(l);
    }
    intent.forgottenAt.set(slug, now);
  }
  if (s)
    persistCommentMonitorIntent({
      durableNow: true,
    });
  for (let [a, l] of intent.parked) {
    let g = false;
    for (let slug of slugSet)
      if (l.traveling?.has(slug) && l.line[slug]?.state === "armed") {
        delete l.line[slug];
        l.traveling.delete(slug);
        g = true;
      }
    if (g) {
      writeCommentMonitorIntent(a, l.path, l.line, {
        durableNow: true,
      });
      if (!Object.values(l.line).some((m) => m.state === "armed")) intent.parked.delete(a);
    }
  }
}
//@ chunk-w4p2kd11.js:8695-9000 placement
/**
 * 按远端给出的停止时间把对应 slug 的意图标为 stopped（被重新监听清除过的跳过），并确认停止锁存。
 */
function applyRemoteStops(e, t) {
  let n = runCommentMonitor(t?.storageV5);
  let { stopLatches } = getLiveState().durable;
  for (let [r, d] of e) {
    if (stopLatches.wasClearedByRewatch(r)) continue;
    let a = n.bySlug.get(r);
    if (a === undefined || a.state === "armed" || a.writtenAtMs <= d)
      n.bySlug.set(r, {
        state: "stopped",
        writtenAtMs: d,
        ...(a?.title !== undefined && {
          title: a.title,
        }),
      });
    stopLatches.reaffirmStop(r);
  }
  persistCommentMonitorIntent();
}
//@ chunk-w4p2kd11.js:9000-9472 placement
/**
 * 把所有 armed 且未让出的监听意图标为 stopped，并同样处理其他会话迁移行里的 armed 项，持久写入。
 */
function stopAllCommentMonitorIntents(e) {
  let t = runCommentMonitor(e?.storageV5);
  let { yieldedSlugs } = getLiveState().wakes;
  let writtenAtMs = Date.now();
  let r = false;
  for (let [d, a] of t.bySlug)
    if (a.state === "armed" && !yieldedSlugs.has(d)) {
      t.bySlug.set(d, {
        state: "stopped",
        writtenAtMs,
        ...(a.title !== undefined && {
          title: a.title,
        }),
      });
      r = true;
    }
  if (r)
    persistCommentMonitorIntent({
      durableNow: true,
    });
  for (let [d, a] of t.parked) {
    let l = false;
    for (let [key, value] of Object.entries(a.line))
      if (value.state === "armed") {
        a.line[key] = {
          state: "stopped",
          writtenAtMs,
          ...(value.title !== undefined && {
            title: value.title,
          }),
        };
        l = true;
      }
    if (l)
      writeCommentMonitorIntent(d, a.path, a.line, {
        durableNow: true,
      });
  }
}
//@ chunk-w4p2kd11.js:9472-9637 placement
function isSessionChangeCarrying(e) {
  switch (e) {
    case "clear":
    case "resume":
    case "fork":
    case "remote_attach":
      return true;
    case "cd":
    case "spare_claim":
    case "hydrate":
    case "startup_custom_id":
      return false;
  }
}
//@ chunk-w4p2kd11.js:9637-9926 placement
/**
 * 切换会话时记下离开的会话：会随会话迁移的 armed slug、该会话的记录是否尚未写出、是否在接管窗口内。
 */
function rememberLeavingSession() {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let sid = commentMonitorIntent.sid;
  if (sid === null || sid === getSessionId()) {
    commentMonitorIntent.leftWith = null;
    return;
  }
  let n = new Set();
  for (let [s, r] of commentMonitorIntent.bySlug) if (r.state === "armed" && isAutoReactWired(s)) n.add(s);
  commentMonitorIntent.leftWith = {
    sid,
    traveling: n,
    unwritten:
      !commentMonitorIntent.onFile &&
      !currentSessionFileIsFor(sid) &&
      commentMonitorIntent.adoptPendingFor !== sid,
    inWindow: commentMonitorIntent.adoptPendingFor === sid,
  };
}
//@ chunk-w4p2kd11.js:9926-10262 placement
/**
 * 清理随会话迁移而已"带走"的停放监控条目：删除其中已布防的行并写回，整组都没有布防条目时移出停放表。
 */
function dropTravelledFromParked() {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  if (!currentSessionFileIsFor(getSessionId())) return;
  for (let [t, n] of commentMonitorIntent.parked) {
    if (n.traveling === undefined || t === getSessionId()) continue;
    let s = false;
    for (let r of n.traveling)
      if (n.line[r]?.state === "armed") {
        delete n.line[r];
        s = true;
      }
    n.traveling = undefined;
    if (s) writeCommentMonitorIntent(t, n.path, n.line);
    if (!Object.values(n.line).some((r) => r.state === "armed")) commentMonitorIntent.parked.delete(t);
  }
}
//@ chunk-w4p2kd11.js:10262-10388 placement
function isDeferredSessionFile(e, sessionId) {
  if (currentSessionFileIsFor(sessionId)) {
    if (e.adoptPendingFor === sessionId) e.adoptPendingFor = null;
    return false;
  }
  return e.adoptPendingFor === sessionId || getMaterializedSessionFile() !== null;
}
//@ chunk-w4p2kd11.js:10388-10781 placement
/**
 * 排队写一条其他会话的监听意图行：先等会话存储刷盘，确认仍是最新、未在退出时盖章，且之前写失败过或是强制写，才写入对应会话记录。
 */
function queueParkedIntentWrite(e, transcriptPath, intentsToWrite, s, failureSeqAtWrite) {
  if (transcriptPath === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let a = {
    path: transcriptPath,
    line: filterParkedLine(e, intentsToWrite),
  };
  commentMonitorIntent.pendingLines.set(e, a);
  registerForeignTranscriptExitReStamp(collectExitIntentEntries);
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.then(async () => {
    await flushSessionStorage().catch(() => {});
    if (commentMonitorIntent.pendingLines.get(e) !== a) return;
    if (commentMonitorIntent.exitStamped) return;
    commentMonitorIntent.pendingLines.delete(e);
    if (!s && getTranscriptWriteFailureSeq() === failureSeqAtWrite) return;
    if (e === commentMonitorIntent.sid) {
      commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      persistCommentMonitorIntent();
      return;
    }
    writeCommentMonitorIntent(e, transcriptPath, intentsToWrite);
  });
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.catch(() => {});
}
//@ chunk-w4p2kd11.js:10781-10793 placement
/**
 * 评论监控意图里“已遗忘 slug”表的上限 1024。
 */
var MAX_FORGOTTEN_SLUGS = 1024;
//@ chunk-w4p2kd11.js:10793-11078 placement
function filterParkedLine(e, t) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let s = commentMonitorIntent.parked.get(e);
  if (s?.unwritten === true) {
    let { traveling } = s;
    return traveling === undefined ? t : wi(t, (d, a) => d.state === "armed" && traveling.has(a));
  }
  if (s?.leftInWindow === true)
    return dropTravellingFromEntry(commentMonitorIntent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId: e,
      artifacts: t,
    }).artifacts;
  return t;
}
//@ chunk-w4p2kd11.js:11078-11992 placement
function writeCommentMonitorIntent(e, path, line, s) {
  if (path === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let { storageV5 } = commentMonitorIntent;
  let a = filterParkedLine(e, {
    ...line,
  });
  let l = {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId: e,
    artifacts: a,
  };
  commentMonitorIntent.owedLines.delete(e);
  let g = {
    path,
    line: a,
  };
  commentMonitorIntent.pendingLines.set(e, g);
  registerForeignTranscriptExitReStamp(collectExitIntentEntries);
  if (s?.durableNow === true) appendEntryToCurrentTranscriptNow(l, path, toTornTailEntry(l));
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain
    .then(async () => {
      await flushSessionStorage().catch(() => {});
      if (commentMonitorIntent.exitStamped) return;
      if (e === commentMonitorIntent.sid) {
        if (commentMonitorIntent.pendingLines.get(e) === g) commentMonitorIntent.pendingLines.delete(e);
        commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
        persistCommentMonitorIntent();
        return;
      }
      await appendEntryToFileAsync(path, l, storageV5, {
        onlyIfExists: true,
        tornTailEntry: toTornTailEntry(l),
      });
      if (commentMonitorIntent.pendingLines.get(e) === g) commentMonitorIntent.pendingLines.delete(e);
    })
    .catch(() => {
      if (commentMonitorIntent.pendingLines.get(e) !== g) {
        logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
        return;
      }
      commentMonitorIntent.pendingLines.delete(e);
      if (commentMonitorIntent.owedLines.size >= 2 * MAX_PARKED_INTENTS) {
        let m = commentMonitorIntent.owedLines.keys().next().value;
        if (m !== undefined) commentMonitorIntent.owedLines.delete(m);
      }
      commentMonitorIntent.owedLines.set(e, {
        path,
        line: a,
      });
      logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
    });
}
//@ chunk-w4p2kd11.js:11992-12032 placement
/**
 * 导出函数 `markSlugTravelling`：参数 e, t。
 */
function markSlugTravelling(e, t) {
  markTravelling(runCommentMonitor(t?.storageV5), e);
}
//@ chunk-w4p2kd11.js:12032-12176 placement
function markTravelling(e, t) {
  let n = false;
  for (let [s, r] of e.parked) {
    if (s === getSessionId() || r.line[t]?.state !== "armed") continue;
    (r.traveling ??= new Set()).add(t);
    n = true;
  }
  if (n) dropTravelledFromParked();
}
//@ chunk-w4p2kd11.js:12176-12451 placement
function flushOwedIntentLines(commentMonitorIntent) {
  if (commentMonitorIntent.owedLines.size === 0) return;
  let t = [...commentMonitorIntent.owedLines.entries()];
  commentMonitorIntent.owedLines.clear();
  let n = false;
  for (let [s, { path: r, line: d }] of t) {
    if (s === commentMonitorIntent.sid) {
      commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      n = true;
      continue;
    }
    if (commentMonitorIntent.pendingLines.has(s)) continue;
    let a = commentMonitorIntent.parked.get(s);
    writeCommentMonitorIntent(s, a?.path ?? r, a?.line ?? d);
  }
  if (n) persistCommentMonitorIntent();
}
//@ chunk-w4p2kd11.js:12451-15513 placement
/**
 * Artifact 评论监视器主循环（armed/stopped/clear 状态）
 */
function runCommentMonitor(storageV5) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  if (storageV5 !== undefined) commentMonitorIntent.storageV5 = storageV5;
  let sessionId = getSessionId();
  let s = false;
  let r = false;
  if (commentMonitorIntent.sid !== sessionId) {
    let leftWith =
      commentMonitorIntent.leftWith !== null && commentMonitorIntent.leftWith.sid === commentMonitorIntent.sid
        ? commentMonitorIntent.leftWith
        : null;
    let l = (S) => (leftWith !== null ? leftWith.traveling.has(S) : isAutoReactWired(S));
    commentMonitorIntent.leftWith = null;
    let intentsToWrite = selectIntentsToWrite(commentMonitorIntent);
    let m = new Set();
    let c = 0;
    for (let [S, w] of commentMonitorIntent.bySlug) {
      if (w.state !== "armed") continue;
      if (l(S)) m.add(S);
      else {
        commentMonitorIntent.bySlug.delete(S);
        c++;
      }
    }
    let { stopLatches } = getLiveState().durable;
    for (let [key, value] of Object.entries(commentMonitorIntent.parked.get(sessionId)?.line ?? {})) {
      let y = commentMonitorIntent.forgottenAt.get(key);
      if (value.state === "armed" && y !== undefined && value.writtenAtMs <= y && !isAutoReactWired(key)) {
        r = true;
        continue;
      }
      let b = newerIntent(commentMonitorIntent.bySlug.get(key), value);
      if (b.state === "armed" && stopLatches.isStopped(key))
        b = {
          state: "stopped",
          writtenAtMs: Date.now(),
          ...(b.title !== undefined && {
            title: b.title,
          }),
        };
      commentMonitorIntent.bySlug.set(key, b);
      if (b.state === "stopped") stopLatches.confirmStop(key);
    }
    commentMonitorIntent.parked.delete(sessionId);
    for (let S of [
      commentMonitorIntent.owedLines.get(sessionId),
      commentMonitorIntent.pendingLines.get(sessionId),
    ])
      for (let [key, value] of Object.entries(S?.line ?? {})) {
        if (value.state !== "stopped") continue;
        let b = newerIntent(commentMonitorIntent.bySlug.get(key), value);
        commentMonitorIntent.bySlug.set(key, b);
        if (b.state === "stopped") stopLatches.confirmStop(key);
      }
    if (commentMonitorIntent.sid !== null && (c > 0 || m.size > 0)) {
      commentMonitorIntent.parked.set(commentMonitorIntent.sid, {
        path: commentMonitorIntent.transcriptPath,
        line: intentsToWrite,
        ...(m.size > 0 && {
          traveling: m,
        }),
        ...(leftWith?.unwritten === true && {
          unwritten: true,
        }),
        ...(leftWith?.inWindow === true && {
          leftInWindow: true,
        }),
      });
      while (commentMonitorIntent.parked.size > MAX_PARKED_INTENTS) {
        let [S, w] = commentMonitorIntent.parked.entries().next().value;
        commentMonitorIntent.parked.delete(S);
        let writtenAtMs = Date.now();
        writeCommentMonitorIntent(
          S,
          w.path,
          Object.fromEntries(
            Object.entries(w.line).flatMap(([key, value]) =>
              value.state !== "armed"
                ? [[key, value]]
                : w.traveling?.has(key)
                  ? []
                  : [
                      [
                        key,
                        {
                          state: "stopped",
                          writtenAtMs,
                          ...(value.title !== undefined && {
                            title: value.title,
                          }),
                        },
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
        intentsToWrite,
        commentMonitorIntent.lastWritten === UNWRITTEN_MARKER,
        commentMonitorIntent.failureSeqAtWrite,
      );
    else if (
      commentMonitorIntent.sid !== null &&
      leftWith?.inWindow === true &&
      isIntentChanged(commentMonitorIntent, intentsToWrite)
    )
      queueParkedIntentWrite(
        commentMonitorIntent.sid,
        commentMonitorIntent.transcriptPath,
        intentsToWrite,
        true,
        commentMonitorIntent.failureSeqAtWrite,
      );
    dropTravelledFromParked();
    s = [...commentMonitorIntent.bySlug.values()].some((S) => S.state === "armed");
    commentMonitorIntent.sid = sessionId;
    if (commentMonitorIntent.adoptPendingFor !== sessionId) commentMonitorIntent.adoptPendingFor = null;
    commentMonitorIntent.lastWritten = r ? UNWRITTEN_MARKER : null;
    commentMonitorIntent.wroteCurrentLine = false;
    commentMonitorIntent.pendingRestore = null;
    commentMonitorIntent.transcriptPath = null;
    commentMonitorIntent.tornStops.clear();
    commentMonitorIntent.onFile = false;
  }
  if (!commentMonitorIntent.onFile && currentSessionFileIsFor(sessionId)) commentMonitorIntent.onFile = true;
  commentMonitorIntent.transcriptPath = isDeferredSessionFile(commentMonitorIntent, sessionId)
    ? getTranscriptPath()
    : getTranscriptPathForSession(sessionId);
  if (commentMonitorIntent.unsubscribeMaterialized === undefined)
    commentMonitorIntent.unsubscribeMaterialized = onSessionFileMaterialized(() => {
      if (commentMonitorIntent.sid !== null && currentSessionFileIsFor(commentMonitorIntent.sid))
        commentMonitorIntent.onFile = true;
      dropTravelledFromParked();
    });
  if (commentMonitorIntent.unsubscribeSwitch === undefined) {
    commentMonitorIntent.unregisterExitDrain = registerTranscriptExitDrain(() => {
      flushOwedIntentLines(commentMonitorIntent);
      return commentMonitorIntent.writeChain;
    });
    registerForeignTranscriptExitReStamp(collectExitIntentEntries);
    commentMonitorIntent.unsubscribeSwitch = onSessionSwitch((a, l) => {
      if (l === "cd" && commentMonitorIntent.sid === a)
        commentMonitorIntent.transcriptPath = getTranscriptPathForSession(a);
      if (isSessionChangeCarrying(l)) rememberLeavingSession();
      if (l === "clear") queueMicrotask(persistCommentMonitorIntent);
    });
  }
  let d = commentMonitorIntent.earlySeed ?? takeResumedArtifactCommentMonitor();
  commentMonitorIntent.earlySeed = undefined;
  if (d !== undefined) {
    let a = false;
    let commentMonitorIntent_2 = readCommentMonitorIntent(d, {
      onLossy: () => {
        a = true;
      },
      onTornStop: (g) => {
        commentMonitorIntent.tornStops.add(g);
      },
    });
    if (commentMonitorIntent_2 !== null) {
      if (d.tailTorn === true) sealTornTranscriptTail(commentMonitorIntent.transcriptPath ?? undefined);
      let { stopLatches } = getLiveState().durable;
      let m = new Map();
      for (let [c, h] of commentMonitorIntent_2) {
        let S = commentMonitorIntent.forgottenAt.get(c);
        if (h.state === "armed" && S !== undefined && h.writtenAtMs <= S && !isAutoReactWired(c)) {
          a = true;
          continue;
        }
        let w = commentMonitorIntent.bySlug.get(c);
        if (commentMonitorIntent.tornStops.has(c) && w?.state === "armed" && isAutoReactWired(c)) {
          commentMonitorIntent.tornStops.delete(c);
          m.set(c, w);
          a = true;
          continue;
        }
        let y = newerIntent(w, h);
        commentMonitorIntent.bySlug.set(c, y);
        m.set(c, y);
        if (y.state === "stopped") stopLatches.confirmStop(c);
      }
      commentMonitorIntent.pendingRestore = m;
      if (!a && commentMonitorIntent.lastWritten === null) {
        commentMonitorIntent.lastWritten = intentFingerprint(Object.fromEntries(commentMonitorIntent_2));
        commentMonitorIntent.failureSeqAtWrite = getTranscriptWriteFailureSeq();
      } else if (a && commentMonitorIntent.lastWritten === null)
        commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      publishDurableWatchRegistry();
    }
  }
  flushOwedIntentLines(commentMonitorIntent);
  if (s || r) persistCommentMonitorIntent();
  return commentMonitorIntent;
}
//@ chunk-w4p2kd11.js:15513-15722 placement
function newerIntent(e, t) {
  if (e === undefined) return t;
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
  let { commentMonitorIntent, wakes } = getLiveState();
  if (
    !commentMonitorIntent.wroteCurrentLine ||
    commentMonitorIntent.sid !== getSessionId() ||
    [...commentMonitorIntent.bySlug.keys()].some((key) => wakes.yieldedSlugs.has(key))
  )
    return;
  return {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId: getSessionId(),
    artifacts: selectIntentsToWrite(commentMonitorIntent),
  };
}
//@ chunk-w4p2kd11.js:16128-16829 placement
/**
 * 进程退出时收集要补写进会话记录的监听意图行：当前会话（必要时）、欠写与待写的其他会话行；每行附带一个把无持有者的 armed 改为 stopped 的"尾部撕裂"备份行。
 */
function collectExitIntentEntries() {
  let intent = getLiveState().commentMonitorIntent;
  let sessionId = getSessionId();
  let currentEntry;
  let s = () => isIntentChanged(intent, selectIntentsToWrite(intent));
  let r = !intent.exitStamped && intent.sid === sessionId;
  if (r && currentSessionFileIsFor(sessionId)) {
    if (
      intent.wroteCurrentLine ||
      s() ||
      intent.owedLines.has(sessionId) ||
      intent.pendingLines.has(sessionId)
    ) {
      dropTravelledFromParked();
      intent.wroteCurrentLine = true;
      registerTranscriptExitReStamp(buildExitIntentEntry);
    }
  } else if (r && isDeferredSessionFile(intent, sessionId) && intent.transcriptPath !== null && s()) {
    let a = dropTravellingFromEntry(intent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId,
      artifacts: selectIntentsToWrite(intent),
    });
    currentEntry = {
      path: intent.transcriptPath,
      entry: a,
      tornTailEntry: toTornTailEntry(a),
    };
    for (let l of [intent.owedLines, intent.pendingLines])
      if (l.get(sessionId)?.path === currentEntry.path) l.delete(sessionId);
  }
  intent.exitStamped = true;
  let mapped = [...intent.owedLines, ...intent.pendingLines].map(([a, { path: l, line: g }]) => {
    let m = {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId: a,
      artifacts: g,
    };
    return {
      path: l,
      entry: m,
      tornTailEntry: toTornTailEntry(m),
    };
  });
  return currentEntry === undefined ? mapped : [...mapped, currentEntry];
}
//@ chunk-w4p2kd11.js:16829-17012 placement
function toTornTailEntry(e) {
  let writtenAtMs = Date.now();
  return {
    ...e,
    artifacts: xr(e.artifacts, (n) =>
      n.state === "armed" && n.holder === undefined
        ? {
            state: "stopped",
            writtenAtMs,
            ...(n.title !== undefined && {
              title: n.title,
            }),
          }
        : n,
    ),
  };
}
//@ chunk-w4p2kd11.js:17012-17286 placement
function dropTravellingFromEntry(e, t) {
  let sessionId = getSessionId();
  let s = new Set();
  for (let [r, d] of e.parked) {
    if (r === sessionId || r === t.sessionId || d.unwritten) continue;
    for (let a of d.traveling ?? []) if (d.line[a]?.state === "armed") s.add(a);
  }
  if (s.size === 0) return t;
  return {
    ...t,
    artifacts: wi(t.artifacts, (r, d) => r.state === "armed" && s.has(d)),
  };
}
//@ chunk-w4p2kd11.js:17286-17383 placement
function isIntentChanged(e, intentsToWrite) {
  return (
    e.lastWritten !== intentFingerprint(intentsToWrite) &&
    !(e.lastWritten === null && Object.keys(intentsToWrite).length === 0)
  );
}
//@ chunk-w4p2kd11.js:17383-17605 placement
function intentFingerprint(e) {
  return jsonStringify(
    Object.entries(e)
      .map(([key, value]) => [
        key,
        value.state,
        value.writtenAtMs,
        value.title ?? null,
        value.holder ?? null,
        value.holderPid ?? null,
        value.holderProcStart ?? value.holderProcStartFt ?? null,
        value.holderJob ?? null,
        value.holderPidSpace ?? null,
      ])
      .sort(),
  );
}
//@ chunk-w4p2kd11.js:17605-18212 placement
/**
 * 把当前会话的评论监听意图写入会话记录：与上次指纹相同且没有新写失败则跳过；会话文件尚未落盘时延后（durableNow 时直接追加）；写失败时打点并允许重写。
 */
function persistCommentMonitorIntent(options) {
  let intent = runCommentMonitor();
  dropTravelledFromParked();
  publishDurableWatchRegistry();
  let intentsToWrite = selectIntentsToWrite(intent);
  let fingerprint = intentFingerprint(intentsToWrite);
  if (fingerprint === intent.lastWritten && getTranscriptWriteFailureSeq() === intent.failureSeqAtWrite)
    return;
  intent.failureSeqAtWrite = getTranscriptWriteFailureSeq();
  if (intent.lastWritten === null && intent.bySlug.size === 0) {
    intent.lastWritten = fingerprint;
    return;
  }
  let entry = {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId: getSessionId(),
    artifacts: intentsToWrite,
  };
  if (isDeferredSessionFile(intent, getSessionId())) {
    intent.lastWritten = UNWRITTEN_MARKER;
    if (options?.durableNow === true && intent.transcriptPath !== null) {
      let d = dropTravellingFromEntry(intent, entry);
      appendEntryToCurrentTranscriptNow(d, intent.transcriptPath, toTornTailEntry(d));
    }
    return;
  }
  intent.lastWritten = fingerprint;
  intent.wroteCurrentLine = true;
  registerTranscriptExitReStamp(buildExitIntentEntry);
  if (options?.durableNow === true) appendEntryToCurrentTranscriptNow(entry);
  recordArtifactCommentMonitor(entry, intent.storageV5).catch(() => {
    if (intent.lastWritten === fingerprint) intent.lastWritten = UNWRITTEN_MARKER;
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
  });
}
export {
  readCommentMonitorIntent,
  takeRestoredMonitorIntents,
  tornStopIntents,
  applyRemoteStops,
  seedCommentMonitorIntent,
  isAutoReactWired,
  stopCommentMonitorIntent,
  forgetCommentMonitorIntents,
  runCommentMonitorWithIntent,
  forgetSlugIntent,
  stopAllCommentMonitorIntents,
  readCommentMonitorRegistry,
  publishDurableWatchRegistry,
  setRegistrySink,
  resetRegistryPublished,
  monitorStorage,
  ownProcStart,
  markSlugTravelling,
  armCommentMonitorIntent,
};
