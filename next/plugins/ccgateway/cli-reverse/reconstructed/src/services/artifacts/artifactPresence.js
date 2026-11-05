/**
 * services/artifacts/artifactPresence.ts
 *
 * Artifact 在线状态（presence）启停（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsrpnscb.js (35)
 * attribution: placement 35
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-tsrpnscb.js:7846-7901 placement
/**
 * 导出函数 `trackDurableClaudeDocSlug`：参数 e。
 */
function trackDurableClaudeDocSlug(slug) {
  addWithLimit(getLiveState().durable.claudeDocSlugs, slug, MAX_CRON_OWNERSHIP_KEYS);
}
//@ chunk-tsrpnscb.js:7901-8280 placement
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
//@ chunk-tsrpnscb.js:8280-8370 placement
function canStartDurableWatch(durable, durableState, options) {
  return (
    (options === undefined || durableState === options) &&
    !durable.rows.has(durableState) &&
    !durable.stopLatches.isStopped(durableState)
  );
}
//@ chunk-tsrpnscb.js:8370-8439 placement
class PresenceStores {
  working = createStore({
    working: false,
  });
  userPrompt = createStore({
    waitingFor: undefined,
  });
}
//@ chunk-tsrpnscb.js:8439-8465 placement
var presenceStores; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tsrpnscb.js:8439", () => {
  presenceStores = new SessionRootSlot(() => new PresenceStores());
});
//@ chunk-tsrpnscb.js:8465-8543 placement
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
//@ chunk-tsrpnscb.js:8543-8602 placement
/**
 * 导出函数 `isWorking`：参数 e，返回 ve.of(e).working.getState().working。
 */
function isWorking(session) {
  return presenceStores.of(session).working.getState().working;
}
//@ chunk-tsrpnscb.js:18062-18218 placement
/**
 * presence 空闲参数开关 tengu_slate_lantern_hush 的 schema 与取值范围（空闲判定 600–86400 s、保活 25–600 s、默认 50 s）。
 */
var TENGU_SLATE_LANTERN_HUSH; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var IDLE_AFTER_RANGE_S;
var IDLE_KEEPALIVE_RANGE_S;
var DEFAULT_IDLE_KEEPALIVE_S;
var idleConfigSchema;
deferInit("chunk-tsrpnscb.js:18062", () => {
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
//@ chunk-tsrpnscb.js:18218-18284 placement
function clamp(value, [min, max]) {
  return Math.min(Math.max(Math.round(value), min), max);
}
//@ chunk-tsrpnscb.js:18284-18565 placement
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
//@ chunk-tsrpnscb.js:18565-18684 placement
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
//@ chunk-tsrpnscb.js:18684-18816 placement
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
//@ chunk-tsrpnscb.js:18816-19035 placement
/**
 * 实时失效事件的 schema（tag/ver/replay）、三种失效标签名，以及评论已读状态（commentsEmpty/readAtMs）的 schema。
 */
var INVALIDATION_EVENT_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var INVALIDATE_TAG_LIVE;
var INVALIDATE_TAG_SHARED;
var INVALIDATE_TAG_HEAD;
var COMMENTS_READ_STATE_SCHEMA;
deferInit("chunk-tsrpnscb.js:18816", () => {
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
//@ chunk-tsrpnscb.js:19035-19066 placement
function keepaliveDeadline(keepaliveMs) {
  return keepaliveMs * 3 + 5000;
}
//@ chunk-tsrpnscb.js:19066-19147 placement
function isPresenceEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_PRESENCE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_brass_plover", false)
  );
}
//@ chunk-tsrpnscb.js:19147-19201 placement
function presenceSkipReason(session) {
  if (!isPresenceEnabled()) return "flag_off";
  return getPresenceSkipReason(session);
}
//@ chunk-tsrpnscb.js:19201-19236 placement
function liveState() {
  return getLiveState().presence;
}
//@ chunk-tsrpnscb.js:19236-19296 placement
function isCurrentConnection(conn) {
  return !conn.stopped && liveState().conns.get(conn.slug) === conn;
}
//@ chunk-tsrpnscb.js:19296-19833 placement
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
//@ chunk-tsrpnscb.js:19833-20346 placement
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
//@ chunk-tsrpnscb.js:20346-20380 placement
var presenceCloseHook = {
  closeByTaskId: (taskId) => declinePresenceForTask(taskId),
};
//@ chunk-tsrpnscb.js:20380-20550 placement
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
//@ chunk-tsrpnscb.js:20550-21382 placement
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
//@ chunk-tsrpnscb.js:21382-22519 placement
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
//@ chunk-tsrpnscb.js:22519-22897 placement
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
//@ chunk-tsrpnscb.js:22897-23095 placement
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
//@ chunk-tsrpnscb.js:23095-23177 placement
function closeAndForget(conn) {
  closePresence(conn);
  let live = liveState();
  if (live.conns.get(conn.slug) === conn) live.conns.delete(conn.slug);
}
//@ chunk-tsrpnscb.js:23177-23925 placement
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
//@ chunk-tsrpnscb.js:23925-24019 placement
function supervisorWake(slug) {
  let supervisor = getLiveState().live.supervisors.get(slug);
  return supervisor !== undefined && !supervisor.stopped ? supervisor.wake : undefined;
}
//@ chunk-tsrpnscb.js:24019-24065 placement
function rearmSlug(slug, options) {
  slug.declined.delete(options);
  retireSlug(slug, options);
}
//@ chunk-tsrpnscb.js:24065-24123 placement
function retireSlug(state, slug) {
  let conn = state.conns.get(slug);
  if (conn !== undefined) closeAndForget(conn);
}
//@ chunk-tsrpnscb.js:24123-24213 placement
function disposeAllPresence(all) {
  all.declined.clear();
  for (let conn of [...all.conns.values()]) closePresence(conn);
  all.conns.clear();
}
//@ chunk-tsrpnscb.js:24213-24348 placement
function closeForeignOwnerConnections(owner, conn) {
  for (let conn_2 of [...owner.conns.values()]) {
    if (sameOwnerAccount(conn_2.owner, conn)) continue;
    closePresence(conn_2);
    if (owner.conns.get(conn_2.slug) === conn_2) owner.conns.delete(conn_2.slug);
  }
}
//@ chunk-tsrpnscb.js:24348-24384 placement
function hasHumanMessageContaining(messages, text) {
  return lastHumanMessageIndexContaining(messages, text) >= 0;
}
//@ chunk-tsrpnscb.js:24384-24427 placement
function lastHumanMessageIndexContaining(messages, text) {
  return findHumanMessagesContaining(messages, text).at(-1) ?? -1;
}
export {
  setWorking,
  trackDurableClaudeDocSlug,
  isWorking,
  presenceStores,
  INVALIDATION_EVENT_SCHEMA,
  INVALIDATE_TAG_LIVE,
  INVALIDATE_TAG_SHARED,
  INVALIDATE_TAG_HEAD,
  COMMENTS_READ_STATE_SCHEMA,
  hasHumanMessageContaining,
  presenceSkipReason,
  adjustKeepaliveForIdle,
  keepaliveDeadline,
  armArtifactPresence,
  lastHumanMessageIndexContaining,
  listDurableArmStates,
};
