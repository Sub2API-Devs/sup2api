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
  objectSchema,
  literal,
  record,
  stringSchema,
  unknown,
  numberSchema,
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
import { import_reject, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w4p2kd11.js:876-1711 placement
/**
 * 持久评论监听登记表的常量与 schema：事件类型（published/comment）、行数与孤立触发器上限、时间格式、行/停止/孤立触发器信封。
 */
var MONITOR_EVENT_KINDS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REGISTRY_ROWS;
var MAX_ORPHAN_TRIGGERS;
var ISO_MS_RE;
var REGISTRY_UNPUBLISHED;
var DURABLE_REGISTRY_SCHEMAS;
deferInit("chunk-w4p2kd11.js:876", () => {
  MONITOR_EVENT_KINDS = {
    published: "published",
    comment: "comment",
  };
  MAX_REGISTRY_ROWS = 64;
  MAX_ORPHAN_TRIGGERS = 16;
  ISO_MS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  REGISTRY_UNPUBLISHED = "";
  DURABLE_REGISTRY_SCHEMAS = DoctorLazy(() => {
    let rowsEnvelope = objectSchema({
      v: literal(1),
      rows: record(stringSchema(), unknown()),
    });
    let newerEnvelope = objectSchema({
      v: numberSchema().gt(1),
    });
    let stopsEnvelope = objectSchema({
      stopped: record(stringSchema(), unknown()),
    });
    let eventKindSchema = _enum(MONITOR_EVENT_KINDS);
    let uuidSchema = stringSchema().refine((value) => normalizeUuidOrNull(value) !== null);
    let orphansEnvelope = objectSchema({
      orphans: array(unknown()).transform((orphans) =>
        orphans.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((raw) => {
          let parsed = uuidSchema.safeParse(raw);
          return parsed.success ? [parsed.data] : [];
        }),
      ),
    });
    let row = objectSchema({
      trigger_id: uuidSchema,
      since: stringSchema().regex(ISO_MS_RE),
      events: array(stringSchema())
        .max(16)
        .transform((values) =>
          uniq(values).flatMap((value) => {
            let parsed = eventKindSchema.safeParse(value);
            return parsed.success ? [parsed.data] : [];
          }),
        )
        .refine((list) => list.length > 0),
      unreleased: array(unknown())
        .catch([])
        .transform((rows) =>
          rows.slice(0, MAX_ORPHAN_TRIGGERS).flatMap((raw) => {
            let parsed = uuidSchema.safeParse(raw);
            return parsed.success ? [parsed.data] : [];
          }),
        ),
      claude_doc: literal(true).optional().catch(undefined),
    });
    let stop = objectSchema({
      at_ms: numberSchema().refine(Number.isFinite),
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
  for (let pendingRow of durable.pendingRestoredRows.values()) {
    let row = durable.rows.get(pendingRow.slug);
    if (row === undefined && !durable.unwatchedSlugs.has(pendingRow.slug)) {
      restoredOnly.push(pendingRow);
      continue;
    }
    for (let triggerId of [pendingRow.triggerId, ...(pendingRow.unreleased ?? [])])
      if (triggerId !== row?.triggerId) orphanCandidates.add(triggerId);
  }
  for (let row of [...durable.rows.values(), ...restoredOnly].slice(0, MAX_REGISTRY_ROWS))
    rows[row.slug] = {
      trigger_id: row.triggerId,
      since: row.since,
      events: [...row.events],
      ...(row.unreleased !== undefined &&
        row.unreleased.length > 0 && {
          unreleased: [...row.unreleased],
        }),
      ...((row.claudeDoc || durable.pendingRestoredRows.get(row.slug)?.claudeDoc) && {
        claude_doc: true,
      }),
    };
  let stopped = {};
  let sliced = [...liveState.commentMonitorIntent.bySlug.entries()]
    .filter(([, stop]) => stop.state === "stopped")
    .sort(([, stopA], [, stopB]) => stopB.writtenAtMs - stopA.writtenAtMs)
    .slice(0, MAX_REGISTRY_ROWS);
  for (let [slug, stop] of sliced)
    stopped[slug] = {
      at_ms: stop.writtenAtMs,
    };
  let sliced_2 = uniq([...durable.orphanTriggers, ...orphanCandidates]).slice(0, MAX_ORPHAN_TRIGGERS);
  let stoppedRows =
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
  let text = jsonStringify(stoppedRows);
  if (text === durable.registryPublished) return;
  durable.registryPublished = text;
  durable.registrySink({
    artifact_durable_watches: stoppedRows,
  });
}
//@ chunk-w4p2kd11.js:2880-3805 placement
function readCommentMonitorRegistry(artifactDurableWatches) {
  if (artifactDurableWatches === undefined || artifactDurableWatches === null) return null;
  let schemas = DURABLE_REGISTRY_SCHEMAS();
  let loaded = 0;
  let rows = [];
  let envelope = schemas.rowsEnvelope.safeParse(artifactDurableWatches);
  if (envelope.success)
    for (let [slug, raw] of boundedRegistryRows(envelope.data.rows)) {
      let parsed = schemas.row.safeParse(raw);
      if (!ARTIFACT_SLUG_RE.test(slug) || !parsed.success) {
        loaded++;
        continue;
      }
      rows.push({
        slug,
        triggerId: parsed.data.trigger_id,
        since: parsed.data.since,
        events: parsed.data.events,
        ...(parsed.data.unreleased.length > 0 && {
          unreleased: parsed.data.unreleased,
        }),
        ...(parsed.data.claude_doc && {
          claudeDoc: true,
        }),
      });
    }
  let stops = new Map();
  let stopsEnvelope = schemas.stopsEnvelope.safeParse(artifactDurableWatches);
  if (stopsEnvelope.success)
    for (let [slug, raw] of boundedRegistryRows(stopsEnvelope.data.stopped)) {
      if (!ARTIFACT_SLUG_RE.test(slug)) {
        loaded++;
        continue;
      }
      let parsed = schemas.stop.safeParse(raw);
      stops.set(slug, parsed.success ? parsed.data.at_ms : Date.now());
      if (!parsed.success) loaded++;
    }
  if (!envelope.success || !stopsEnvelope.success)
    logFeatureSad(
      "artifact_durable_subscribe",
      stopsEnvelope.success && schemas.newerEnvelope.safeParse(artifactDurableWatches).success
        ? "registry_newer_version"
        : "registry_invalid",
    );
  else if (loaded > 0) logFeatureSad("artifact_durable_subscribe", "registry_entry_invalid");
  let orphansEnvelope = schemas.orphansEnvelope.safeParse(artifactDurableWatches);
  let orphans = orphansEnvelope.success ? orphansEnvelope.data.orphans : [];
  return {
    rows,
    stopped: stops,
    orphans,
  };
}
//@ chunk-w4p2kd11.js:3805-3871 placement
function boundedRegistryRows(rows) {
  return Object.keys(rows)
    .slice(0, MAX_REGISTRY_ROWS)
    .map((key) => [key, rows[key]]);
}
//@ chunk-w4p2kd11.js:3871-4015 placement
/**
 * 判断某个 slug 是否有接上自动回复的活跃监听（或正在建立）。
 */
function isAutoReactWired(slug) {
  let { live } = getLiveState();
  let supervisor = live.supervisors.get(slug);
  return (
    (supervisor !== undefined && !supervisor.stopped && supervisor.autoReactWiring !== undefined) ||
    live.inFlightWiredIntent.has(slug)
  );
}
//@ chunk-w4p2kd11.js:4015-4746 placement
/**
 * 会话记录里评论监听意图（artifact-comment-monitor）的标记与 schema：标题/持有者字段上限、单条记录（armed/stopped、写入时间、标题、后台持有者进程身份）与整行信封。
 */
var UNWRITTEN_MARKER; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TITLE_LENGTH;
var MAX_PARKED_INTENTS;
var MAX_INTENT_ENTRIES;
var MONITOR_INTENT_SCHEMAS;
deferInit("chunk-w4p2kd11.js:4015", () => {
  UNWRITTEN_MARKER = "\x00unwritten";
  MAX_TITLE_LENGTH = 256;
  MAX_PARKED_INTENTS = 32;
  MAX_INTENT_ENTRIES = 64;
  MONITOR_INTENT_SCHEMAS = DoctorLazy(() => {
    let writtenAtMs = numberSchema().refine(Number.isFinite);
    let record_2 = objectSchema({
      state: _enum(["armed", "stopped"]),
      writtenAtMs,
      title: stringSchema().min(1).max(MAX_TITLE_LENGTH).optional(),
      holder: stringSchema()
        .optional()
        .transform((source) => (source === undefined ? undefined : "bg")),
      holderPid: numberSchema().int().positive().optional().catch(undefined),
      holderProcStart: stringSchema().min(1).max(64).optional().catch(undefined),
      holderProcStartFt: stringSchema().min(1).max(64).optional().catch(undefined),
      holderJob: stringSchema()
        .regex(/^[0-9a-f]{8}$/)
        .optional()
        .catch(undefined),
      holderPidSpace: stringSchema().min(1).max(160).optional().catch(undefined),
    });
    let envelope = objectSchema({
      type: literal("artifact-comment-monitor"),
      v: literal(1),
      sessionId: stringSchema(),
      artifacts: record(stringSchema(), unknown()),
      crossLineMerged: literal(true).optional().catch(undefined),
      tailTorn: literal(true).optional().catch(undefined),
    });
    return {
      record: record_2,
      envelope,
    };
  });
});
//@ chunk-w4p2kd11.js:4746-5124 placement
/**
 * 从评论监控记录中取出持有者身份字段（pid、任务、启动时间、pid 命名空间）；字段不完整时返回空对象。
 */
function pickHolderIdentity(holder) {
  if (
    holder.holderPid === undefined ||
    holder.holderJob === undefined ||
    holder.holderPidSpace === undefined ||
    (holder.holderProcStart === undefined && holder.holderProcStartFt === undefined)
  )
    return {};
  return {
    holderPid: holder.holderPid,
    holderJob: holder.holderJob,
    ...(holder.holderProcStart !== undefined && {
      holderProcStart: holder.holderProcStart,
    }),
    ...(holder.holderProcStartFt !== undefined && {
      holderProcStartFt: holder.holderProcStartFt,
    }),
    holderPidSpace: holder.holderPidSpace,
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
function readCommentMonitorIntent(intent, options) {
  let schemas = MONITOR_INTENT_SCHEMAS();
  let envelope = schemas.envelope.safeParse(intent);
  if (!envelope.success) {
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_invalid");
    return null;
  }
  if (envelope.data.sessionId !== getSessionId()) {
    logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_foreign");
    return null;
  }
  if (envelope.data.crossLineMerged === true) options?.onLossy?.();
  let tailTorn = envelope.data.tailTorn === true;
  if (tailTorn) options?.onLossy?.();
  let bySlug = new Map();
  let armed = 0;
  let parked = 0;
  let dropped = 0;
  for (let [key, value] of Object.entries(envelope.data.artifacts)) {
    if (parked++ >= 2 * MAX_INTENT_ENTRIES) {
      options?.onLossy?.();
      break;
    }
    let parsed = schemas.record.safeParse(value);
    if (!ARTIFACT_SLUG_RE.test(key)) {
      armed++;
      options?.onLossy?.();
      continue;
    }
    if (!parsed.success) {
      armed++;
      options?.onLossy?.();
      if (typeof value === "object" && value !== null && value.state === "stopped")
        bySlug.set(key, {
          state: "stopped",
          writtenAtMs: Date.now(),
        });
      continue;
    }
    if (tailTorn && parsed.data.state === "armed" && parsed.data.holder === undefined) {
      bySlug.set(key, {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(parsed.data.title !== undefined && {
          title: parsed.data.title,
        }),
      });
      options?.onTornStop?.(key);
      continue;
    }
    if (parsed.data.state === "armed" && dropped++ >= MAX_INTENT_ENTRIES) {
      options?.onLossy?.();
      continue;
    }
    let { state, writtenAtMs, title, holder } = parsed.data;
    bySlug.set(key, {
      state,
      writtenAtMs,
      ...(title !== undefined && {
        title,
      }),
      ...(holder !== undefined && {
        holder,
        ...(tailTorn ? {} : pickHolderIdentity(parsed.data)),
      }),
    });
  }
  if (armed > 0) logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_record_invalid");
  return bySlug;
}
//@ chunk-w4p2kd11.js:6570-6738 placement
/**
 * 取出所有监听意图（待恢复的 + 当前的），清空待恢复表，可排除某个 slug；同时刷新记录。
 */
function takeRestoredMonitorIntents(options) {
  let monitor = runCommentMonitor(options.storageV5);
  let restored = new Map([...(monitor.pendingRestore ?? []), ...monitor.bySlug]);
  monitor.pendingRestore = null;
  let { excludeSlug } = options;
  if (excludeSlug !== undefined) restored.delete(excludeSlug);
  persistCommentMonitorIntent();
  return restored;
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
function runCommentMonitorWithIntent(options) {
  runCommentMonitor(options?.storageV5);
}
//@ chunk-w4p2kd11.js:6885-7015 placement
/**
 * 预置评论监控意图（早期种子与待领取会话），然后启动评论监控。
 */
function seedCommentMonitorIntent(artifactCommentMonitor, intent) {
  if (artifactCommentMonitor === undefined && !hasLiveState()) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  commentMonitorIntent.earlySeed = artifactCommentMonitor;
  commentMonitorIntent.adoptPendingFor = getSessionId();
  runCommentMonitor(intent?.storageV5);
}
//@ chunk-w4p2kd11.js:7015-7402 placement
/**
 * 记录某 slug 的评论监听为 armed（保留/更新标题，后台任务记持有者身份），标记需要随会话迁移，并写入会话记录；持有者身份尚未就绪时稍后补写。
 */
function armCommentMonitorIntent(slug, options) {
  let monitor = runCommentMonitor(options?.storageV5);
  if (getLiveState().durable.stopLatches.isStopped(slug)) return;
  let title = options?.title;
  let titleOk = title !== undefined && title.length >= 1 && title.length <= MAX_TITLE_LENGTH;
  let title_2 = monitor.bySlug.get(slug)?.title;
  monitor.forgottenAt.delete(slug);
  let now = Date.now();
  let holder = isActingAsBgJob()
    ? {
        holder: "bg",
        ...getOwnHolderIdentity(),
      }
    : undefined;
  monitor.bySlug.set(slug, {
    state: "armed",
    writtenAtMs: now,
    ...(titleOk
      ? {
          title,
        }
      : title_2 !== undefined && {
          title: title_2,
        }),
    ...holder,
  });
  markTravelling(monitor, slug);
  persistCommentMonitorIntent();
  if (holder !== undefined && holder.holderPid === undefined) backfillHolderIdentity(slug, now);
}
//@ chunk-w4p2kd11.js:7402-7702 placement
/**
 * 异步取得本进程启动时间后，为后台任务持有的已布防评论监控记录补写持有者身份（记录未变时才写）。
 */
function backfillHolderIdentity(intent, options) {
  ownProcStartAsync()
    .then(() => {
      if (!hasLiveState() || !isActingAsBgJob()) return;
      let commentMonitorIntent = getLiveState().commentMonitorIntent;
      let entry = commentMonitorIntent.bySlug.get(intent);
      if (
        commentMonitorIntent.sid !== getSessionId() ||
        entry?.state !== "armed" ||
        entry.holder !== "bg" ||
        entry.holderPid !== undefined ||
        entry.writtenAtMs !== options
      )
        return;
      let ownHolderIdentity = getOwnHolderIdentity();
      if (ownHolderIdentity.holderPid === undefined) return;
      commentMonitorIntent.bySlug.set(intent, {
        ...entry,
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
function stopCommentMonitorIntent(slug, options) {
  let monitor = runCommentMonitor(options?.storageV5);
  let entry = monitor.bySlug.get(slug);
  monitor.bySlug.set(slug, {
    state: "stopped",
    writtenAtMs: Date.now(),
    ...(entry?.title !== undefined && {
      title: entry.title,
    }),
  });
  persistCommentMonitorIntent({
    durableNow: true,
  });
  for (let [path, parked] of monitor.parked) {
    let line = parked.line[slug];
    if (line?.state === "armed") {
      parked.line[slug] = {
        state: "stopped",
        writtenAtMs: Date.now(),
        ...(line.title !== undefined && {
          title: line.title,
        }),
      };
      writeCommentMonitorIntent(path, parked.path, parked.line, {
        durableNow: true,
      });
    }
  }
}
//@ chunk-w4p2kd11.js:8061-8123 placement
/**
 * 导出函数 `forgetSlugIntent`：参数 e, t，返回 runCommentMonitor(t?.storageV5).bySlug.get(e)?.state。
 */
function forgetSlugIntent(slug, intentSlug) {
  return runCommentMonitor(intentSlug?.storageV5).bySlug.get(slug)?.state;
}
//@ chunk-w4p2kd11.js:8123-8695 placement
/**
 * 忘掉一个或多个 slug 的监听意图（记录遗忘时间，表有上限），并从其他会话的迁移行里移除这些 armed 项；有变化时持久写入。
 */
function forgetCommentMonitorIntents(slugs, slugList) {
  let intent = runCommentMonitor(slugList?.storageV5);
  let changed = false;
  let slugSet = new Set(typeof slugs === "string" ? [slugs] : slugs);
  let now = Date.now();
  for (let slug of slugSet) {
    changed = intent.bySlug.delete(slug) || changed;
    intent.forgottenAt.delete(slug);
    if (intent.forgottenAt.size >= MAX_FORGOTTEN_SLUGS) {
      let oldest = intent.forgottenAt.keys().next().value;
      if (oldest !== undefined) intent.forgottenAt.delete(oldest);
    }
    intent.forgottenAt.set(slug, now);
  }
  if (changed)
    persistCommentMonitorIntent({
      durableNow: true,
    });
  for (let [path, parked] of intent.parked) {
    let changed = false;
    for (let slug of slugSet)
      if (parked.traveling?.has(slug) && parked.line[slug]?.state === "armed") {
        delete parked.line[slug];
        parked.traveling.delete(slug);
        changed = true;
      }
    if (changed) {
      writeCommentMonitorIntent(path, parked.path, parked.line, {
        durableNow: true,
      });
      if (!Object.values(parked.line).some((record) => record.state === "armed")) intent.parked.delete(path);
    }
  }
}
//@ chunk-w4p2kd11.js:8695-9000 placement
/**
 * 按远端给出的停止时间把对应 slug 的意图标为 stopped（被重新监听清除过的跳过），并确认停止锁存。
 */
function applyRemoteStops(stops, options) {
  let monitor = runCommentMonitor(options?.storageV5);
  let { stopLatches } = getLiveState().durable;
  for (let [slug, at] of stops) {
    if (stopLatches.wasClearedByRewatch(slug)) continue;
    let record = monitor.bySlug.get(slug);
    if (record === undefined || record.state === "armed" || record.writtenAtMs <= at)
      monitor.bySlug.set(slug, {
        state: "stopped",
        writtenAtMs: at,
        ...(record?.title !== undefined && {
          title: record.title,
        }),
      });
    stopLatches.reaffirmStop(slug);
  }
  persistCommentMonitorIntent();
}
//@ chunk-w4p2kd11.js:9000-9472 placement
/**
 * 把所有 armed 且未让出的监听意图标为 stopped，并同样处理其他会话迁移行里的 armed 项，持久写入。
 */
function stopAllCommentMonitorIntents(options) {
  let monitor = runCommentMonitor(options?.storageV5);
  let { yieldedSlugs } = getLiveState().wakes;
  let writtenAtMs = Date.now();
  let changed = false;
  for (let [slug, record] of monitor.bySlug)
    if (record.state === "armed" && !yieldedSlugs.has(slug)) {
      monitor.bySlug.set(slug, {
        state: "stopped",
        writtenAtMs,
        ...(record.title !== undefined && {
          title: record.title,
        }),
      });
      changed = true;
    }
  if (changed)
    persistCommentMonitorIntent({
      durableNow: true,
    });
  for (let [path, parked] of monitor.parked) {
    let changed = false;
    for (let [key, value] of Object.entries(parked.line))
      if (value.state === "armed") {
        parked.line[key] = {
          state: "stopped",
          writtenAtMs,
          ...(value.title !== undefined && {
            title: value.title,
          }),
        };
        changed = true;
      }
    if (changed)
      writeCommentMonitorIntent(path, parked.path, parked.line, {
        durableNow: true,
      });
  }
}
//@ chunk-w4p2kd11.js:9472-9637 placement
function isSessionChangeCarrying(change) {
  switch (change) {
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
  let seen = new Set();
  for (let [slug, line] of commentMonitorIntent.bySlug)
    if (line.state === "armed" && isAutoReactWired(slug)) seen.add(slug);
  commentMonitorIntent.leftWith = {
    sid,
    traveling: seen,
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
  for (let [path, entry] of commentMonitorIntent.parked) {
    if (entry.traveling === undefined || path === getSessionId()) continue;
    let traveling = false;
    for (let travelling of entry.traveling)
      if (entry.line[travelling]?.state === "armed") {
        delete entry.line[travelling];
        traveling = true;
      }
    entry.traveling = undefined;
    if (traveling) writeCommentMonitorIntent(path, entry.path, entry.line);
    if (!Object.values(entry.line).some((record) => record.state === "armed"))
      commentMonitorIntent.parked.delete(path);
  }
}
//@ chunk-w4p2kd11.js:10262-10388 placement
function isDeferredSessionFile(file, sessionId) {
  if (currentSessionFileIsFor(sessionId)) {
    if (file.adoptPendingFor === sessionId) file.adoptPendingFor = null;
    return false;
  }
  return file.adoptPendingFor === sessionId || getMaterializedSessionFile() !== null;
}
//@ chunk-w4p2kd11.js:10388-10781 placement
/**
 * 排队写一条其他会话的监听意图行：先等会话存储刷盘，确认仍是最新、未在退出时盖章，且之前写失败过或是强制写，才写入对应会话记录。
 */
function queueParkedIntentWrite(sessionId, transcriptPath, line, seq, failureSeqAtWrite) {
  if (transcriptPath === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let entry = {
    path: transcriptPath,
    line: filterParkedLine(sessionId, line),
  };
  commentMonitorIntent.pendingLines.set(sessionId, entry);
  registerForeignTranscriptExitReStamp(collectExitIntentEntries);
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.then(async () => {
    await flushSessionStorage().catch(() => {});
    if (commentMonitorIntent.pendingLines.get(sessionId) !== entry) return;
    if (commentMonitorIntent.exitStamped) return;
    commentMonitorIntent.pendingLines.delete(sessionId);
    if (!seq && getTranscriptWriteFailureSeq() === failureSeqAtWrite) return;
    if (sessionId === commentMonitorIntent.sid) {
      commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      persistCommentMonitorIntent();
      return;
    }
    writeCommentMonitorIntent(sessionId, transcriptPath, line);
  });
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain.catch(() => {});
}
//@ chunk-w4p2kd11.js:10781-10793 placement
/**
 * 评论监控意图里“已遗忘 slug”表的上限 1024。
 */
var MAX_FORGOTTEN_SLUGS = 1024;
//@ chunk-w4p2kd11.js:10793-11078 placement
function filterParkedLine(sessionId, line) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let entry = commentMonitorIntent.parked.get(sessionId);
  if (entry?.unwritten === true) {
    let { traveling } = entry;
    return traveling === undefined
      ? line
      : import_reject(line, (record, slug) => record.state === "armed" && traveling.has(slug));
  }
  if (entry?.leftInWindow === true)
    return dropTravellingFromEntry(commentMonitorIntent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId,
      artifacts: line,
    }).artifacts;
  return line;
}
//@ chunk-w4p2kd11.js:11078-11992 placement
function writeCommentMonitorIntent(sessionId, path, line, seq) {
  if (path === null) return;
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  let { storageV5 } = commentMonitorIntent;
  let artifacts = filterParkedLine(sessionId, {
    ...line,
  });
  let ledger = {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId,
    artifacts,
  };
  commentMonitorIntent.owedLines.delete(sessionId);
  let owed = {
    path,
    line: artifacts,
  };
  commentMonitorIntent.pendingLines.set(sessionId, owed);
  registerForeignTranscriptExitReStamp(collectExitIntentEntries);
  if (seq?.durableNow === true) appendEntryToCurrentTranscriptNow(ledger, path, toTornTailEntry(ledger));
  commentMonitorIntent.writeChain = commentMonitorIntent.writeChain
    .then(async () => {
      await flushSessionStorage().catch(() => {});
      if (commentMonitorIntent.exitStamped) return;
      if (sessionId === commentMonitorIntent.sid) {
        if (commentMonitorIntent.pendingLines.get(sessionId) === owed)
          commentMonitorIntent.pendingLines.delete(sessionId);
        commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
        persistCommentMonitorIntent();
        return;
      }
      await appendEntryToFileAsync(path, ledger, storageV5, {
        onlyIfExists: true,
        tornTailEntry: toTornTailEntry(ledger),
      });
      if (commentMonitorIntent.pendingLines.get(sessionId) === owed)
        commentMonitorIntent.pendingLines.delete(sessionId);
    })
    .catch(() => {
      if (commentMonitorIntent.pendingLines.get(sessionId) !== owed) {
        logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
        return;
      }
      commentMonitorIntent.pendingLines.delete(sessionId);
      if (commentMonitorIntent.owedLines.size >= 2 * MAX_PARKED_INTENTS) {
        let oldest = commentMonitorIntent.owedLines.keys().next().value;
        if (oldest !== undefined) commentMonitorIntent.owedLines.delete(oldest);
      }
      commentMonitorIntent.owedLines.set(sessionId, {
        path,
        line: artifacts,
      });
      logFeatureSad("artifact_live_subscribe", "comment_monitor_intent_write_failed");
    });
}
//@ chunk-w4p2kd11.js:11992-12032 placement
/**
 * 导出函数 `markSlugTravelling`：参数 e, t。
 */
function markSlugTravelling(slug, opts) {
  markTravelling(runCommentMonitor(opts?.storageV5), slug);
}
//@ chunk-w4p2kd11.js:12032-12176 placement
function markTravelling(entry, slug) {
  let changed = false;
  for (let [entrySlug, record] of entry.parked) {
    if (entrySlug === getSessionId() || record.line[slug]?.state !== "armed") continue;
    (record.traveling ??= new Set()).add(slug);
    changed = true;
  }
  if (changed) dropTravelledFromParked();
}
//@ chunk-w4p2kd11.js:12176-12451 placement
function flushOwedIntentLines(commentMonitorIntent) {
  if (commentMonitorIntent.owedLines.size === 0) return;
  let owed = [...commentMonitorIntent.owedLines.entries()];
  commentMonitorIntent.owedLines.clear();
  let changed = false;
  for (let [slug, { path, line }] of owed) {
    if (slug === commentMonitorIntent.sid) {
      commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      changed = true;
      continue;
    }
    if (commentMonitorIntent.pendingLines.has(slug)) continue;
    let entry = commentMonitorIntent.parked.get(slug);
    writeCommentMonitorIntent(slug, entry?.path ?? path, entry?.line ?? line);
  }
  if (changed) persistCommentMonitorIntent();
}
//@ chunk-w4p2kd11.js:12451-15513 placement
/**
 * Artifact 评论监视器主循环（armed/stopped/clear 状态）
 */
function runCommentMonitor(storageV5) {
  let commentMonitorIntent = getLiveState().commentMonitorIntent;
  if (storageV5 !== undefined) commentMonitorIntent.storageV5 = storageV5;
  let sessionId = getSessionId();
  let anyArmed = false;
  let carriedUnwired = false;
  if (commentMonitorIntent.sid !== sessionId) {
    let leftWith =
      commentMonitorIntent.leftWith !== null && commentMonitorIntent.leftWith.sid === commentMonitorIntent.sid
        ? commentMonitorIntent.leftWith
        : null;
    let isCarried = (slug) => (leftWith !== null ? leftWith.traveling.has(slug) : isAutoReactWired(slug));
    commentMonitorIntent.leftWith = null;
    let intentsToWrite = selectIntentsToWrite(commentMonitorIntent);
    let traveling = new Set();
    let droppedCount = 0;
    for (let [slug, intent] of commentMonitorIntent.bySlug) {
      if (intent.state !== "armed") continue;
      if (isCarried(slug)) traveling.add(slug);
      else {
        commentMonitorIntent.bySlug.delete(slug);
        droppedCount++;
      }
    }
    let { stopLatches } = getLiveState().durable;
    for (let [key, value] of Object.entries(commentMonitorIntent.parked.get(sessionId)?.line ?? {})) {
      let forgottenAt = commentMonitorIntent.forgottenAt.get(key);
      if (
        value.state === "armed" &&
        forgottenAt !== undefined &&
        value.writtenAtMs <= forgottenAt &&
        !isAutoReactWired(key)
      ) {
        carriedUnwired = true;
        continue;
      }
      let merged = newerIntent(commentMonitorIntent.bySlug.get(key), value);
      if (merged.state === "armed" && stopLatches.isStopped(key))
        merged = {
          state: "stopped",
          writtenAtMs: Date.now(),
          ...(merged.title !== undefined && {
            title: merged.title,
          }),
        };
      commentMonitorIntent.bySlug.set(key, merged);
      if (merged.state === "stopped") stopLatches.confirmStop(key);
    }
    commentMonitorIntent.parked.delete(sessionId);
    for (let line of [
      commentMonitorIntent.owedLines.get(sessionId),
      commentMonitorIntent.pendingLines.get(sessionId),
    ])
      for (let [key, value] of Object.entries(line?.line ?? {})) {
        if (value.state !== "stopped") continue;
        let merged = newerIntent(commentMonitorIntent.bySlug.get(key), value);
        commentMonitorIntent.bySlug.set(key, merged);
        if (merged.state === "stopped") stopLatches.confirmStop(key);
      }
    if (commentMonitorIntent.sid !== null && (droppedCount > 0 || traveling.size > 0)) {
      commentMonitorIntent.parked.set(commentMonitorIntent.sid, {
        path: commentMonitorIntent.transcriptPath,
        line: intentsToWrite,
        ...(traveling.size > 0 && {
          traveling,
        }),
        ...(leftWith?.unwritten === true && {
          unwritten: true,
        }),
        ...(leftWith?.inWindow === true && {
          leftInWindow: true,
        }),
      });
      while (commentMonitorIntent.parked.size > MAX_PARKED_INTENTS) {
        let [oldestSlug, oldest] = commentMonitorIntent.parked.entries().next().value;
        commentMonitorIntent.parked.delete(oldestSlug);
        let writtenAtMs = Date.now();
        writeCommentMonitorIntent(
          oldestSlug,
          oldest.path,
          Object.fromEntries(
            Object.entries(oldest.line).flatMap(([key, value]) =>
              value.state !== "armed"
                ? [[key, value]]
                : oldest.traveling?.has(key)
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
    anyArmed = [...commentMonitorIntent.bySlug.values()].some((intent) => intent.state === "armed");
    commentMonitorIntent.sid = sessionId;
    if (commentMonitorIntent.adoptPendingFor !== sessionId) commentMonitorIntent.adoptPendingFor = null;
    commentMonitorIntent.lastWritten = carriedUnwired ? UNWRITTEN_MARKER : null;
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
    commentMonitorIntent.unsubscribeSwitch = onSessionSwitch((previous, next) => {
      if (next === "cd" && commentMonitorIntent.sid === previous)
        commentMonitorIntent.transcriptPath = getTranscriptPathForSession(previous);
      if (isSessionChangeCarrying(next)) rememberLeavingSession();
      if (next === "clear") queueMicrotask(persistCommentMonitorIntent);
    });
  }
  let seed = commentMonitorIntent.earlySeed ?? takeResumedArtifactCommentMonitor();
  commentMonitorIntent.earlySeed = undefined;
  if (seed !== undefined) {
    let sawStop = false;
    let commentMonitorIntent_2 = readCommentMonitorIntent(seed, {
      onLossy: () => {
        sawStop = true;
      },
      onTornStop: (stop) => {
        commentMonitorIntent.tornStops.add(stop);
      },
    });
    if (commentMonitorIntent_2 !== null) {
      if (seed.tailTorn === true) sealTornTranscriptTail(commentMonitorIntent.transcriptPath ?? undefined);
      let { stopLatches } = getLiveState().durable;
      let bySlug = new Map();
      for (let [slug, intent] of commentMonitorIntent_2) {
        let forgottenAt = commentMonitorIntent.forgottenAt.get(slug);
        if (
          intent.state === "armed" &&
          forgottenAt !== undefined &&
          intent.writtenAtMs <= forgottenAt &&
          !isAutoReactWired(slug)
        ) {
          sawStop = true;
          continue;
        }
        let existing = commentMonitorIntent.bySlug.get(slug);
        if (
          commentMonitorIntent.tornStops.has(slug) &&
          existing?.state === "armed" &&
          isAutoReactWired(slug)
        ) {
          commentMonitorIntent.tornStops.delete(slug);
          bySlug.set(slug, existing);
          sawStop = true;
          continue;
        }
        let merged = newerIntent(existing, intent);
        commentMonitorIntent.bySlug.set(slug, merged);
        bySlug.set(slug, merged);
        if (merged.state === "stopped") stopLatches.confirmStop(slug);
      }
      commentMonitorIntent.pendingRestore = bySlug;
      if (!sawStop && commentMonitorIntent.lastWritten === null) {
        commentMonitorIntent.lastWritten = intentFingerprint(Object.fromEntries(commentMonitorIntent_2));
        commentMonitorIntent.failureSeqAtWrite = getTranscriptWriteFailureSeq();
      } else if (sawStop && commentMonitorIntent.lastWritten === null)
        commentMonitorIntent.lastWritten = UNWRITTEN_MARKER;
      publishDurableWatchRegistry();
    }
  }
  flushOwedIntentLines(commentMonitorIntent);
  if (anyArmed || carriedUnwired) persistCommentMonitorIntent();
  return commentMonitorIntent;
}
//@ chunk-w4p2kd11.js:15513-15722 placement
function newerIntent(entry, candidate) {
  if (entry === undefined) return candidate;
  if (
    candidate.state === "stopped" &&
    entry.state !== "stopped" &&
    candidate.writtenAtMs >= entry.writtenAtMs
  )
    return candidate;
  if (candidate.state === "armed" && entry.state === "armed" && candidate.writtenAtMs > entry.writtenAtMs)
    return candidate;
  return entry;
}
//@ chunk-w4p2kd11.js:15722-15902 placement
function selectIntentsToWrite(state) {
  return Object.fromEntries(
    [...state.bySlug.entries()]
      .sort(
        ([, a], [, b]) =>
          Number(b.state === "stopped") - Number(a.state === "stopped") || b.writtenAtMs - a.writtenAtMs,
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
  let changed = () => isIntentChanged(intent, selectIntentsToWrite(intent));
  let live = !intent.exitStamped && intent.sid === sessionId;
  if (live && currentSessionFileIsFor(sessionId)) {
    if (
      intent.wroteCurrentLine ||
      changed() ||
      intent.owedLines.has(sessionId) ||
      intent.pendingLines.has(sessionId)
    ) {
      dropTravelledFromParked();
      intent.wroteCurrentLine = true;
      registerTranscriptExitReStamp(buildExitIntentEntry);
    }
  } else if (
    live &&
    isDeferredSessionFile(intent, sessionId) &&
    intent.transcriptPath !== null &&
    changed()
  ) {
    let dropped = dropTravellingFromEntry(intent, {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId,
      artifacts: selectIntentsToWrite(intent),
    });
    currentEntry = {
      path: intent.transcriptPath,
      entry: dropped,
      tornTailEntry: toTornTailEntry(dropped),
    };
    for (let map of [intent.owedLines, intent.pendingLines])
      if (map.get(sessionId)?.path === currentEntry.path) map.delete(sessionId);
  }
  intent.exitStamped = true;
  let mapped = [...intent.owedLines, ...intent.pendingLines].map(([sessionId, { path, line }]) => {
    let ledger = {
      type: "artifact-comment-monitor",
      v: 1,
      sessionId,
      artifacts: line,
    };
    return {
      path,
      entry: ledger,
      tornTailEntry: toTornTailEntry(ledger),
    };
  });
  return currentEntry === undefined ? mapped : [...mapped, currentEntry];
}
//@ chunk-w4p2kd11.js:16829-17012 placement
function toTornTailEntry(entry) {
  let writtenAtMs = Date.now();
  return {
    ...entry,
    artifacts: import_mapValues(entry.artifacts, (artifacts) =>
      artifacts.state === "armed" && artifacts.holder === undefined
        ? {
            state: "stopped",
            writtenAtMs,
            ...(artifacts.title !== undefined && {
              title: artifacts.title,
            }),
          }
        : artifacts,
    ),
  };
}
//@ chunk-w4p2kd11.js:17012-17286 placement
function dropTravellingFromEntry(intent, entry) {
  let sessionId = getSessionId();
  let travelling = new Set();
  for (let [path, parked] of intent.parked) {
    if (path === sessionId || path === entry.sessionId || parked.unwritten) continue;
    for (let slug of parked.traveling ?? []) if (parked.line[slug]?.state === "armed") travelling.add(slug);
  }
  if (travelling.size === 0) return entry;
  return {
    ...entry,
    artifacts: import_reject(
      entry.artifacts,
      (record, slug) => record.state === "armed" && travelling.has(slug),
    ),
  };
}
//@ chunk-w4p2kd11.js:17286-17383 placement
function isIntentChanged(intent, intent_2) {
  return (
    intent.lastWritten !== intentFingerprint(intent_2) &&
    !(intent.lastWritten === null && Object.keys(intent_2).length === 0)
  );
}
//@ chunk-w4p2kd11.js:17383-17605 placement
function intentFingerprint(intent) {
  return jsonStringify(
    Object.entries(intent)
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
  let intent_2 = selectIntentsToWrite(intent);
  let fingerprint = intentFingerprint(intent_2);
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
    artifacts: intent_2,
  };
  if (isDeferredSessionFile(intent, getSessionId())) {
    intent.lastWritten = UNWRITTEN_MARKER;
    if (options?.durableNow === true && intent.transcriptPath !== null) {
      let drop = dropTravellingFromEntry(intent, entry);
      appendEntryToCurrentTranscriptNow(drop, intent.transcriptPath, toTornTailEntry(drop));
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
