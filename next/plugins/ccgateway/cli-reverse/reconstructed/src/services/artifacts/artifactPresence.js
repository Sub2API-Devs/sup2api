/**
 * services/artifacts/artifactPresence.ts
 *
 * Artifact 在线状态（presence）启停（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (35)
 * attribution: placement 35
 */
import { addWithLimit, MAX_CRON_OWNERSHIP_KEYS } from "../../utils/cronTasks.js";
import { getLiveState, currentPresence } from "../liveReplica/liveReplica.js";
import { createStore } from "../../state/store.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  numberSchema,
  objectSchema,
  stringSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { safeParseJSON } from "../../utils/json.js";
import { isForegroundBusy, foregroundEdgeAt } from "../../utils/plugins/hooksModulesLoadGate.js";
import { getLastInteractionTime, getLastApiCompletionTimestamp } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  getPresenceSkipReason,
  scheduleReconnect,
  bootPresenceSocket,
  isTerminalPresenceFailure,
  connectPresenceSocket,
  DEFAULT_CLOSE_EVENT,
  nextPresenceAction,
  closePresence,
  PRESENCE_EVENT_SCHEMA,
  handlePresenceControl,
  DECLINE_REASON_SCHEMA,
  JOIN_DENIED_REASON_DENIED,
  JOIN_DENIED_REASON_CAP_INVALID,
} from "./presenceSocket.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  pickMonitorContext,
  parseUpgradeRejection,
  MonitorWsPreconditionError,
} from "../../tools/MonitorTool/websocketMonitor.js";
import {
  setArtifactPresenceStopObserver,
  stopMonitorWsTasks,
} from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { jsonStringify, jsonParseRaw } from "../../utils/slowOperations.js";
import { ROUTE_ABSENT_4403, ROUTE_ABSENT_4503 } from "./artifactNotices.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { findHumanMessagesContaining } from "./presenceTranscript.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aqdf5t3e.js:7806-7861 placement
/**
 * 导出函数 `trackDurableClaudeDocSlug`：参数 e。
 */
function trackDurableClaudeDocSlug(slug) {
  addWithLimit(getLiveState().durable.claudeDocSlugs, slug, MAX_CRON_OWNERSHIP_KEYS);
}
//@ chunk-aqdf5t3e.js:7861-8240 placement
/**
 * 列出持久监听的布防状态：在途的标为 arming，已失败的标为 failed（附原因、详情、服务端消息与时间），可按 slug 过滤。
 */
function listDurableArmStates(options) {
  let durable = getLiveState().durable;
  let slugs = [];
  let seen = new Set();
  for (let key of durable.armsInFlight.keys()) {
    if (!canStartDurableWatch(durable, key, options)) continue;
    slugs.push({
      slug: key,
      state: "arming",
    });
    seen.add(key);
  }
  for (let [key, outcome] of durable.armOutcomes) {
    if (!canStartDurableWatch(durable, key, options) || seen.has(key)) continue;
    slugs.push({
      slug: key,
      state: "failed",
      reason: outcome.reason,
      ...(outcome.detail !== undefined && {
        detail: outcome.detail,
      }),
      ...(outcome.serverMessage !== undefined && {
        serverMessage: outcome.serverMessage,
      }),
      at: outcome.at,
    });
  }
  return slugs;
}
//@ chunk-aqdf5t3e.js:8240-8330 placement
function canStartDurableWatch(durable, durableState, options) {
  return (
    (options === undefined || durableState === options) &&
    !durable.rows.has(durableState) &&
    !durable.stopLatches.isStopped(durableState)
  );
}
//@ chunk-aqdf5t3e.js:8330-8399 placement
class PresenceStores {
  working = createStore({
    working: false,
  });
  userPrompt = createStore({
    waitingFor: undefined,
  });
}
//@ chunk-aqdf5t3e.js:8399-8425 placement
var presenceStores; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aqdf5t3e.js:8399", () => {
  presenceStores = new SessionRootSlot(() => new PresenceStores());
});
//@ chunk-aqdf5t3e.js:8425-8503 placement
/**
 * 导出函数 `setWorking`：参数 e, n。
 */
function setWorking(connection, workingValue) {
  presenceStores.of(connection).working.setState((working) =>
    working.working === workingValue
      ? working
      : {
          working: workingValue,
        },
  );
}
//@ chunk-aqdf5t3e.js:8503-8562 placement
/**
 * 导出函数 `isWorking`：参数 e，返回 ve.of(e).working.getState().working。
 */
function isWorking(session) {
  return presenceStores.of(session).working.getState().working;
}
//@ chunk-aqdf5t3e.js:18022-18178 placement
/**
 * presence 空闲参数开关 tengu_slate_lantern_hush 的 schema 与取值范围（空闲判定 600–86400 s、保活 25–600 s、默认 50 s）。
 */
var TENGU_SLATE_LANTERN_HUSH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var IDLE_AFTER_RANGE_S;
var IDLE_KEEPALIVE_RANGE_S;
var DEFAULT_IDLE_KEEPALIVE_S;
var idleConfigSchema;
deferInit("chunk-aqdf5t3e.js:18022", () => {
  TENGU_SLATE_LANTERN_HUSH = "tengu_slate_lantern_hush";
  IDLE_AFTER_RANGE_S = [600, 86400];
  IDLE_KEEPALIVE_RANGE_S = [25, 600];
  DEFAULT_IDLE_KEEPALIVE_S = 50;
  idleConfigSchema = DoctorLazy(() => {
    let cached = numberSchema().optional().catch(undefined);
    return objectSchema({
      idleAfterS: cached,
      idleKeepaliveS: cached,
    });
  });
});
//@ chunk-aqdf5t3e.js:18178-18244 placement
function clamp(value, [min, max]) {
  return Math.min(Math.max(Math.round(value), min), max);
}
//@ chunk-aqdf5t3e.js:18244-18525 placement
/**
 * 读 tengu_slate_lantern_hush 配置得出 presence 空闲参数：多久没交互算空闲（0 为关闭）与空闲时的保活间隔，均限制在上限内。
 */
function getPresenceIdleConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SLATE_LANTERN_HUSH, null);
  if (typeof featureValue_CACHED_MAY_BE_STALE === "string")
    featureValue_CACHED_MAY_BE_STALE = safeParseJSON(featureValue_CACHED_MAY_BE_STALE, false);
  let parsed = idleConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let config = parsed.success ? parsed.data : {};
  let idleAfterMs =
    config.idleAfterS === undefined || config.idleAfterS <= 0
      ? 0
      : clamp(config.idleAfterS, IDLE_AFTER_RANGE_S) * 1000;
  let idleKeepaliveMs =
    (config.idleKeepaliveS === undefined
      ? DEFAULT_IDLE_KEEPALIVE_S
      : clamp(config.idleKeepaliveS, IDLE_KEEPALIVE_RANGE_S)) * 1000;
  return {
    idleAfterMs,
    idleKeepaliveMs,
  };
}
//@ chunk-aqdf5t3e.js:18525-18643 placement
function getIdleMs(durable, config) {
  if (isForegroundBusy()) return 0;
  let max = Math.max(
    foregroundEdgeAt(),
    getLastInteractionTime(),
    getLastApiCompletionTimestamp() ?? 0,
    durable.lastArtifactToolCallAt,
  );
  return Math.max(0, config - max);
}
//@ chunk-aqdf5t3e.js:18643-18775 placement
/**
 * 空闲超过阈值后把 artifact 在线状态的保活间隔放宽到空闲保活值。
 */
function adjustKeepaliveForIdle(durable, keepaliveMs, nowMs = Date.now()) {
  let presenceIdleConfig = getPresenceIdleConfig();
  if (presenceIdleConfig.idleAfterMs <= 0) return keepaliveMs;
  return getIdleMs(durable, nowMs) >= presenceIdleConfig.idleAfterMs
    ? Math.max(presenceIdleConfig.idleKeepaliveMs, keepaliveMs)
    : keepaliveMs;
}
//@ chunk-aqdf5t3e.js:18775-18994 placement
/**
 * 实时失效事件的 schema（tag/ver/replay）、三种失效标签名，以及评论已读状态（commentsEmpty/readAtMs）的 schema。
 */
var INVALIDATION_EVENT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var INVALIDATE_TAG_LIVE;
var INVALIDATE_TAG_SHARED;
var INVALIDATE_TAG_HEAD;
var COMMENTS_READ_STATE_SCHEMA;
deferInit("chunk-aqdf5t3e.js:18775", () => {
  INVALIDATION_EVENT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      tag: stringSchema(),
      ver: stringSchema(),
      replay: booleanSchema().optional(),
    }),
  );
  INVALIDATE_TAG_LIVE = "INVALIDATE_TAG_LIVE";
  INVALIDATE_TAG_SHARED = "INVALIDATE_TAG_SHARED";
  INVALIDATE_TAG_HEAD = "INVALIDATE_TAG_HEAD";
  COMMENTS_READ_STATE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      commentsEmpty: booleanSchema(),
      readAtMs: numberSchema().int().positive().max(8640000000000000),
    }),
  );
});
//@ chunk-aqdf5t3e.js:18994-19025 placement
function keepaliveDeadline(keepaliveMs) {
  return keepaliveMs * 3 + 5000;
}
//@ chunk-aqdf5t3e.js:19025-19106 placement
function isPresenceEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_PRESENCE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_brass_plover", false)
  );
}
//@ chunk-aqdf5t3e.js:19106-19160 placement
function presenceSkipReason(session) {
  if (!isPresenceEnabled()) return "flag_off";
  return getPresenceSkipReason(session);
}
//@ chunk-aqdf5t3e.js:19160-19195 placement
function liveState() {
  return getLiveState().presence;
}
//@ chunk-aqdf5t3e.js:19195-19255 placement
function isCurrentConnection(conn) {
  return !conn.stopped && liveState().conns.get(conn.slug) === conn;
}
//@ chunk-aqdf5t3e.js:19255-19792 placement
function armArtifactPresence(options) {
  let { slug, url } = options;
  try {
    let skipReason = presenceSkipReason(slug);
    if (skipReason !== null) {
      if (skipReason !== "flag_off")
        logForDebugging(`[artifactPresence] not arming slug=${slug}: ${skipReason}`);
      return;
    }
    let live = liveState();
    if (live.declined.has(slug)) return;
    let context = pickMonitorContext(options.context);
    live.dispose = disposeAllPresence;
    live.accountChanged = closeForeignOwnerConnections;
    live.disposeSlug = rearmSlug;
    live.retireSlug = retireSlug;
    let existing = live.conns.get(slug);
    if (existing !== undefined && !existing.stopped) {
      existing.url = url;
      if (existing.stalledSince !== undefined && existing.reconnectTimer !== undefined)
        scheduleReconnect(existing, Math.round(Math.random() * live.timing.capMs), reconnectPresence);
      return;
    }
    connectArtifactPresence(live, slug, url, context);
  } catch (error) {
    logForDebugging(
      `[artifactPresence] arm threw slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
  }
}
//@ chunk-aqdf5t3e.js:19792-20305 placement
function connectArtifactPresence(host, slug, url, context) {
  let conn = {
    slug,
    url,
    context,
    send: undefined,
    state: "connecting",
    storedCap: undefined,
    capStrikes: 0,
    owner: undefined,
    rebootNeeded: false,
    bootedVersion: undefined,
    backoff: 0,
    refusals: 0,
    stalledSince: undefined,
    stalls: 0,
    openedAt: 0,
    everOpened: false,
    reconnectTimer: undefined,
    taskId: undefined,
    refusedAdmission: false,
    stopped: false,
    abort: new AbortController(),
  };
  host.conns.set(slug, conn);
  setArtifactPresenceStopObserver(presenceCloseHook);
  closeArtifactPresence(conn, "initial").catch((error) => {
    logForDebugging(
      `[artifactPresence] connect threw slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
    schedulePresenceReconnect(conn, {
      on: "dial_error",
      deterministic: false,
    });
  });
}
//@ chunk-aqdf5t3e.js:20305-20339 placement
var presenceCloseHook = {
  closeByTaskId: (taskId) => declinePresenceForTask(taskId),
};
//@ chunk-aqdf5t3e.js:20339-20509 placement
function declinePresenceForTask(taskId) {
  let conn = currentPresence();
  if (conn === undefined) return false;
  for (let conn_2 of conn.conns.values()) {
    if (conn_2.taskId !== taskId) continue;
    conn_2.taskId = undefined;
    conn.declined.add(conn_2.slug);
    closeAndForget(conn_2);
    return true;
  }
  return false;
}
//@ chunk-aqdf5t3e.js:20509-21341 placement
async function closeArtifactPresence(options, reason) {
  let skipReason = presenceSkipReason(options.slug);
  if (skipReason !== null) {
    logForDebugging(`[artifactPresence] closing slug=${options.slug}: ${skipReason}`);
    closeAndForget(options);
    return;
  }
  options.state = "connecting";
  let conn = await bootPresenceSocket(options, {
    feature: "artifact_presence",
    isCurrent: () => isCurrentConnection(options),
  });
  switch (conn.outcome) {
    case "stale":
      return;
    case "not_found":
      closeAndForget(options);
      return;
    case "other_org":
    case "public_outside_org":
      logFeatureSad("artifact_presence", conn.outcome);
      closeAndForget(options);
      return;
    case "boot_failed": {
      let out = {
        on: "boot",
        status: conn.status,
        noAnswer: conn.noAnswer,
        elapsedMs: conn.elapsedMs,
      };
      if (reason === "initial" && isTerminalPresenceFailure(options, out, liveState().timing)) {
        logForDebugging(`[artifactPresence] boot failed for slug=${options.slug}; no presence connection`);
        closeAndForget(options);
      } else schedulePresenceReconnect(options, out);
      return;
    }
    case "not_admitted":
      logForDebugging(
        `[artifactPresence] no agent token minted for slug=${options.slug}; no presence connection`,
      );
      closeAndForget(options);
      return;
    case "owner_changed":
      logFeatureSad("artifact_presence", "owner_changed");
      closeAndForget(options);
      return;
    case "token":
      await runArtifactPresence(options, conn.token);
      return;
  }
}
//@ chunk-aqdf5t3e.js:21341-22478 placement
async function runArtifactPresence(options, handlers) {
  let { timing } = liveState();
  let { slug } = options;
  let neverOpened = !options.everOpened;
  options.refusedAdmission = false;
  let presenceSocket = await connectPresenceSocket(
    options,
    handlers,
    {
      description: `presence on artifact ${options.url}`,
      keepalive: {
        openFrames: [],
        frame: jsonStringify({
          kind: "ping",
          slug,
        }),
        intervalMs: timing.keepaliveMs,
        sendEveryMs: () => adjustKeepaliveForIdle(getLiveState().live, timing.keepaliveMs),
        deadlineMs: timing.keepaliveDeadlineMs ?? keepaliveDeadline(timing.keepaliveMs),
      },
      onFrame: (frame) => handlePresenceFrame(options, frame),
      onOpen: () => {
        if (neverOpened)
          logFeatureOk("artifact_presence", {
            connected: true,
          });
      },
      onEnded: (reason, closeInfo) => {
        let refusedAdmission = options.refusedAdmission;
        options.refusedAdmission = false;
        if (refusedAdmission && reason !== ROUTE_ABSENT_4403) {
          schedulePresenceReconnect(options, DEFAULT_CLOSE_EVENT);
          return;
        }
        if (closeInfo.opened) {
          if (reason !== ROUTE_ABSENT_4503 && reason !== ROUTE_ABSENT_4403)
            logFeatureSad("artifact_presence", `closed_${reason ?? "unknown"}`);
        } else {
          let upgradeRejection = parseUpgradeRejection(reason);
          logFeatureBad(
            "artifact_presence",
            "connect_failed",
            upgradeRejection === null
              ? undefined
              : {
                  http_status: upgradeRejection.status,
                  cf_mitigated: upgradeRejection.cfMitigated,
                },
          );
        }
        schedulePresenceReconnect(options, {
          on: "socket",
          detail: reason,
          ...closeInfo,
        });
      },
      handshakeDeadlineMs: timing.handshakeDeadlineMs,
      activitySinkKey: `presence:${slug}`,
      label: "artifactPresence",
    },
    () => isCurrentConnection(options),
  );
  if (presenceSocket.outcome !== "error") return;
  let result =
    presenceSocket.error instanceof MonitorWsPreconditionError &&
    !presenceSocket.error.message.startsWith("could not resolve");
  if (!isCurrentConnection(options)) return;
  if (neverOpened && result) {
    logFeatureBad("artifact_presence", "ws_open_error");
    closeAndForget(options);
    return;
  }
  logFeatureSad("artifact_presence", "ws_open_error");
  options.state = "closed";
  schedulePresenceReconnect(options, {
    on: "dial_error",
    deterministic: result,
  });
}
//@ chunk-aqdf5t3e.js:22478-22856 placement
/**
 * 按失败情况决定 presence 连接的下一步：放弃（吊销或多次被拒）时打点并关闭；开始停顿时打点；否则按退避时间安排重连。
 */
function schedulePresenceReconnect(connection, event) {
  if (!isCurrentConnection(connection)) return;
  let action = nextPresenceAction(connection, liveState().timing, event);
  if (action.next === "end") {
    logFeatureSad("artifact_presence", action.reason === "revoked" ? "closed_4403" : "refused_gave_up");
    closeAndForget(connection);
    return;
  }
  if (action.stallRunStarted) {
    let decision =
      event.on === "boot"
        ? event.status
        : event.on === "socket"
          ? parseUpgradeRejection(event.detail)?.status
          : undefined;
    logFeatureSad("artifact_presence", "stall_run_started", {
      boot: event.on === "boot",
      ...(decision !== undefined && {
        http_status: decision,
      }),
    });
  }
  scheduleReconnect(connection, action.delayMs, reconnectPresence);
}
//@ chunk-aqdf5t3e.js:22856-23054 placement
function reconnectPresence(slug) {
  if (!isCurrentConnection(slug)) return;
  closeArtifactPresence(slug, "reconnect").catch((error) => {
    logForDebugging(
      `[artifactPresence] reconnect threw slug=${slug.slug}: ${error instanceof Error ? error.name : "error"}`,
    );
    schedulePresenceReconnect(slug, {
      on: "dial_error",
      deterministic: false,
    });
  });
}
//@ chunk-aqdf5t3e.js:23054-23136 placement
function closeAndForget(conn) {
  closePresence(conn);
  let live = liveState();
  if (live.conns.get(conn.slug) === conn) live.conns.delete(conn.slug);
}
//@ chunk-aqdf5t3e.js:23136-23884 placement
function handlePresenceFrame(conn, frame) {
  if (conn.stopped || frame.charCodeAt(0) !== 123) return;
  let event;
  try {
    event = jsonParseRaw(frame);
  } catch {
    return;
  }
  let parsed = PRESENCE_EVENT_SCHEMA().safeParse(event);
  if (!parsed.success) return;
  let { kind, slug, actor, payload } = parsed.data;
  if (actor !== undefined || (slug !== undefined && slug !== conn.slug)) return;
  if (handlePresenceControl(conn, kind, payload)) return;
  switch (kind) {
    case "join_denied": {
      let reason = DECLINE_REASON_SCHEMA().safeParse(payload).data?.reason;
      if (reason === JOIN_DENIED_REASON_DENIED) {
        logFeatureBad("artifact_presence", "join_denied");
        closeAndForget(conn);
        return;
      }
      logFeatureSad("artifact_presence", "join_denied");
      if (reason === JOIN_DENIED_REASON_CAP_INVALID) conn.storedCap = undefined;
      conn.refusedAdmission = true;
      if (conn.taskId !== undefined)
        try {
          stopMonitorWsTasks(conn.taskId, conn.context.taskRegistry, {
            quiet: true,
          });
        } catch {}
      return;
    }
    case "ctrl:comment":
      supervisorWake(conn.slug)?.comment();
      return;
    case "ctrl:invalidate": {
      let invalidation = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
      if (
        invalidation.success &&
        (invalidation.data.tag === INVALIDATE_TAG_LIVE || invalidation.data.tag === INVALIDATE_TAG_SHARED)
      )
        supervisorWake(conn.slug)?.ver(invalidation.data.ver, "sync");
      return;
    }
    default:
      return;
  }
}
//@ chunk-aqdf5t3e.js:23884-23978 placement
function supervisorWake(slug) {
  let supervisor = getLiveState().live.supervisors.get(slug);
  return supervisor !== undefined && !supervisor.stopped ? supervisor.wake : undefined;
}
//@ chunk-aqdf5t3e.js:23978-24024 placement
function rearmSlug(slug, options) {
  slug.declined.delete(options);
  retireSlug(slug, options);
}
//@ chunk-aqdf5t3e.js:24024-24082 placement
function retireSlug(state, slug) {
  let conn = state.conns.get(slug);
  if (conn !== undefined) closeAndForget(conn);
}
//@ chunk-aqdf5t3e.js:24082-24172 placement
function disposeAllPresence(all) {
  all.declined.clear();
  for (let conn of [...all.conns.values()]) closePresence(conn);
  all.conns.clear();
}
//@ chunk-aqdf5t3e.js:24172-24307 placement
function closeForeignOwnerConnections(owner, conn) {
  for (let conn_2 of [...owner.conns.values()]) {
    if (sameOwnerAccount(conn_2.owner, conn)) continue;
    closePresence(conn_2);
    if (owner.conns.get(conn_2.slug) === conn_2) owner.conns.delete(conn_2.slug);
  }
}
//@ chunk-aqdf5t3e.js:24307-24343 placement
function hasHumanMessageContaining(messages, text) {
  return lastHumanMessageIndexContaining(messages, text) >= 0;
}
//@ chunk-aqdf5t3e.js:24343-24386 placement
function lastHumanMessageIndexContaining(messages, text) {
  return findHumanMessagesContaining(messages, text).at(-1) ?? -1;
}
export {
  setWorking,
  isWorking,
  listDurableArmStates,
  hasHumanMessageContaining,
  trackDurableClaudeDocSlug,
  INVALIDATION_EVENT_SCHEMA,
  INVALIDATE_TAG_LIVE,
  INVALIDATE_TAG_SHARED,
  INVALIDATE_TAG_HEAD,
  COMMENTS_READ_STATE_SCHEMA,
  presenceSkipReason,
  adjustKeepaliveForIdle,
  keepaliveDeadline,
  armArtifactPresence,
  presenceStores,
  lastHumanMessageIndexContaining,
};
