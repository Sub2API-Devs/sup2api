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
import { E, u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-aqdf5t3e.js:7806-7861 placement
/**
 * 导出函数 `trackDurableClaudeDocSlug`：参数 e。
 */
function trackDurableClaudeDocSlug(e) {
  addWithLimit(getLiveState().durable.claudeDocSlugs, e, MAX_CRON_OWNERSHIP_KEYS);
}
//@ chunk-aqdf5t3e.js:7861-8240 placement
/**
 * 列出持久监听的布防状态：在途的标为 arming，已失败的标为 failed（附原因、详情、服务端消息与时间），可按 slug 过滤。
 */
function listDurableArmStates(sessionId) {
  let durable = getLiveState().durable;
  let r = [];
  let s = new Set();
  for (let key of durable.armsInFlight.keys()) {
    if (!canStartDurableWatch(durable, key, sessionId)) continue;
    r.push({
      slug: key,
      state: "arming",
    });
    s.add(key);
  }
  for (let [h, a] of durable.armOutcomes) {
    if (!canStartDurableWatch(durable, h, sessionId) || s.has(h)) continue;
    r.push({
      slug: h,
      state: "failed",
      reason: a.reason,
      ...(a.detail !== undefined && {
        detail: a.detail,
      }),
      ...(a.serverMessage !== undefined && {
        serverMessage: a.serverMessage,
      }),
      at: a.at,
    });
  }
  return r;
}
//@ chunk-aqdf5t3e.js:8240-8330 placement
function canStartDurableWatch(durable, n, r) {
  return (r === undefined || n === r) && !durable.rows.has(n) && !durable.stopLatches.isStopped(n);
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
var presenceStores = new SessionRootSlot(() => new PresenceStores());
//@ chunk-aqdf5t3e.js:8425-8503 placement
/**
 * 导出函数 `setWorking`：参数 e, n。
 */
function setWorking(session, n) {
  presenceStores.of(session).working.setState((r) =>
    r.working === n
      ? r
      : {
          working: n,
        },
  );
}
//@ chunk-aqdf5t3e.js:8503-8562 placement
/**
 * 导出函数 `isWorking`：参数 e，返回 ve.of(e).working.getState().working。
 */
function isWorking(e) {
  return presenceStores.of(e).working.getState().working;
}
//@ chunk-aqdf5t3e.js:18022-18178 placement
/**
 * presence 空闲参数开关 tengu_slate_lantern_hush 的 schema 与取值范围（空闲判定 600–86400 s、保活 25–600 s、默认 50 s）。
 */
var TENGU_SLATE_LANTERN_HUSH = "tengu_slate_lantern_hush";
var IDLE_AFTER_RANGE_S = [600, 86400];
var IDLE_KEEPALIVE_RANGE_S = [25, 600];
var DEFAULT_IDLE_KEEPALIVE_S = 50;
var idleConfigSchema = DoctorLazy(() => {
  let e = E().optional().catch(undefined);
  return u({
    idleAfterS: e,
    idleKeepaliveS: e,
  });
});
//@ chunk-aqdf5t3e.js:18178-18244 placement
function clamp(e, [n, r]) {
  return Math.min(Math.max(Math.round(e), n), r);
}
//@ chunk-aqdf5t3e.js:18244-18525 placement
/**
 * 读 tengu_slate_lantern_hush 配置得出 presence 空闲参数：多久没交互算空闲（0 为关闭）与空闲时的保活间隔，均限制在上限内。
 */
function getPresenceIdleConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SLATE_LANTERN_HUSH, null);
  if (typeof featureValue_CACHED_MAY_BE_STALE === "string")
    featureValue_CACHED_MAY_BE_STALE = safeParseJSON(featureValue_CACHED_MAY_BE_STALE, false);
  let n = idleConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let r = n.success ? n.data : {};
  let idleAfterMs =
    r.idleAfterS === undefined || r.idleAfterS <= 0 ? 0 : clamp(r.idleAfterS, IDLE_AFTER_RANGE_S) * 1000;
  let idleKeepaliveMs =
    (r.idleKeepaliveS === undefined
      ? DEFAULT_IDLE_KEEPALIVE_S
      : clamp(r.idleKeepaliveS, IDLE_KEEPALIVE_RANGE_S)) * 1000;
  return {
    idleAfterMs,
    idleKeepaliveMs,
  };
}
//@ chunk-aqdf5t3e.js:18525-18643 placement
function getIdleMs(e, n) {
  if (isForegroundBusy()) return 0;
  let max = Math.max(
    foregroundEdgeAt(),
    getLastInteractionTime(),
    getLastApiCompletionTimestamp() ?? 0,
    e.lastArtifactToolCallAt,
  );
  return Math.max(0, n - max);
}
//@ chunk-aqdf5t3e.js:18643-18775 placement
/**
 * 空闲超过阈值后把 artifact 在线状态的保活间隔放宽到空闲保活值。
 */
function adjustKeepaliveForIdle(e, keepaliveMs, r = Date.now()) {
  let presenceIdleConfig = getPresenceIdleConfig();
  if (presenceIdleConfig.idleAfterMs <= 0) return keepaliveMs;
  return getIdleMs(e, r) >= presenceIdleConfig.idleAfterMs
    ? Math.max(presenceIdleConfig.idleKeepaliveMs, keepaliveMs)
    : keepaliveMs;
}
//@ chunk-aqdf5t3e.js:18775-18994 placement
/**
 * 实时失效事件的 schema（tag/ver/replay）、三种失效标签名，以及评论已读状态（commentsEmpty/readAtMs）的 schema。
 */
var INVALIDATION_EVENT_SCHEMA = DoctorLazy(() =>
  u({
    tag: string(),
    ver: string(),
    replay: M().optional(),
  }),
);
var INVALIDATE_TAG_LIVE = "INVALIDATE_TAG_LIVE";
var INVALIDATE_TAG_SHARED = "INVALIDATE_TAG_SHARED";
var INVALIDATE_TAG_HEAD = "INVALIDATE_TAG_HEAD";
var COMMENTS_READ_STATE_SCHEMA = DoctorLazy(() =>
  u({
    commentsEmpty: M(),
    readAtMs: E().int().positive().max(8640000000000000),
  }),
);
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
function presenceSkipReason(slug) {
  if (!isPresenceEnabled()) return "flag_off";
  return getPresenceSkipReason(slug);
}
//@ chunk-aqdf5t3e.js:19160-19195 placement
function liveState() {
  return getLiveState().presence;
}
//@ chunk-aqdf5t3e.js:19195-19255 placement
function isCurrentConnection(e) {
  return !e.stopped && liveState().conns.get(e.slug) === e;
}
//@ chunk-aqdf5t3e.js:19255-19792 placement
function armArtifactPresence(e) {
  let { slug, url } = e;
  try {
    let s = presenceSkipReason(slug);
    if (s !== null) {
      if (s !== "flag_off") logForDebugging(`[artifactPresence] not arming slug=${slug}: ${s}`);
      return;
    }
    let h = liveState();
    if (h.declined.has(slug)) return;
    let context = pickMonitorContext(e.context);
    h.dispose = disposeAllPresence;
    h.accountChanged = closeForeignOwnerConnections;
    h.disposeSlug = rearmSlug;
    h.retireSlug = retireSlug;
    let d = h.conns.get(slug);
    if (d !== undefined && !d.stopped) {
      d.url = url;
      if (d.stalledSince !== undefined && d.reconnectTimer !== undefined)
        scheduleReconnect(d, Math.round(Math.random() * h.timing.capMs), reconnectPresence);
      return;
    }
    connectArtifactPresence(h, slug, url, context);
  } catch (error) {
    logForDebugging(
      `[artifactPresence] arm threw slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
  }
}
//@ chunk-aqdf5t3e.js:19792-20305 placement
function connectArtifactPresence(e, slug, url, context) {
  let h = {
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
  e.conns.set(slug, h);
  setArtifactPresenceStopObserver(presenceCloseHook);
  closeArtifactPresence(h, "initial").catch((error) => {
    logForDebugging(
      `[artifactPresence] connect threw slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
    schedulePresenceReconnect(h, {
      on: "dial_error",
      deterministic: false,
    });
  });
}
//@ chunk-aqdf5t3e.js:20305-20339 placement
var presenceCloseHook = {
  closeByTaskId: (e) => declinePresenceForTask(e),
};
//@ chunk-aqdf5t3e.js:20339-20509 placement
function declinePresenceForTask(e) {
  let n = currentPresence();
  if (n === undefined) return false;
  for (let conn of n.conns.values()) {
    if (conn.taskId !== e) continue;
    conn.taskId = undefined;
    n.declined.add(conn.slug);
    closeAndForget(conn);
    return true;
  }
  return false;
}
//@ chunk-aqdf5t3e.js:20509-21341 placement
async function closeArtifactPresence(e, n) {
  let r = presenceSkipReason(e.slug);
  if (r !== null) {
    logForDebugging(`[artifactPresence] closing slug=${e.slug}: ${r}`);
    closeAndForget(e);
    return;
  }
  e.state = "connecting";
  let s = await bootPresenceSocket(e, {
    feature: "artifact_presence",
    isCurrent: () => isCurrentConnection(e),
  });
  switch (s.outcome) {
    case "stale":
      return;
    case "not_found":
      closeAndForget(e);
      return;
    case "other_org":
    case "public_outside_org":
      logFeatureSad("artifact_presence", s.outcome);
      closeAndForget(e);
      return;
    case "boot_failed": {
      let h = {
        on: "boot",
        status: s.status,
        noAnswer: s.noAnswer,
        elapsedMs: s.elapsedMs,
      };
      if (n === "initial" && isTerminalPresenceFailure(e, h, liveState().timing)) {
        logForDebugging(`[artifactPresence] boot failed for slug=${e.slug}; no presence connection`);
        closeAndForget(e);
      } else schedulePresenceReconnect(e, h);
      return;
    }
    case "not_admitted":
      logForDebugging(`[artifactPresence] no agent token minted for slug=${e.slug}; no presence connection`);
      closeAndForget(e);
      return;
    case "owner_changed":
      logFeatureSad("artifact_presence", "owner_changed");
      closeAndForget(e);
      return;
    case "token":
      await runArtifactPresence(e, s.token);
      return;
  }
}
//@ chunk-aqdf5t3e.js:21341-22478 placement
async function runArtifactPresence(e, token) {
  let { timing } = liveState();
  let { slug } = e;
  let h = !e.everOpened;
  e.refusedAdmission = false;
  let presenceSocket = await connectPresenceSocket(
    e,
    token,
    {
      description: `presence on artifact ${e.url}`,
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
      onFrame: (b) => handlePresenceFrame(e, b),
      onOpen: () => {
        if (h)
          logFeatureOk("artifact_presence", {
            connected: true,
          });
      },
      onEnded: (b, w) => {
        let refusedAdmission = e.refusedAdmission;
        e.refusedAdmission = false;
        if (refusedAdmission && b !== ROUTE_ABSENT_4403) {
          schedulePresenceReconnect(e, DEFAULT_CLOSE_EVENT);
          return;
        }
        if (w.opened) {
          if (b !== ROUTE_ABSENT_4503 && b !== ROUTE_ABSENT_4403)
            logFeatureSad("artifact_presence", `closed_${b ?? "unknown"}`);
        } else {
          let upgradeRejection = parseUpgradeRejection(b);
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
        schedulePresenceReconnect(e, {
          on: "socket",
          detail: b,
          ...w,
        });
      },
      handshakeDeadlineMs: timing.handshakeDeadlineMs,
      activitySinkKey: `presence:${slug}`,
      label: "artifactPresence",
    },
    () => isCurrentConnection(e),
  );
  if (presenceSocket.outcome !== "error") return;
  let d =
    presenceSocket.error instanceof MonitorWsPreconditionError &&
    !presenceSocket.error.message.startsWith("could not resolve");
  if (!isCurrentConnection(e)) return;
  if (h && d) {
    logFeatureBad("artifact_presence", "ws_open_error");
    closeAndForget(e);
    return;
  }
  logFeatureSad("artifact_presence", "ws_open_error");
  e.state = "closed";
  schedulePresenceReconnect(e, {
    on: "dial_error",
    deterministic: d,
  });
}
//@ chunk-aqdf5t3e.js:22478-22856 placement
/**
 * 按失败情况决定 presence 连接的下一步：放弃（吊销或多次被拒）时打点并关闭；开始停顿时打点；否则按退避时间安排重连。
 */
function schedulePresenceReconnect(conn, event) {
  if (!isCurrentConnection(conn)) return;
  let r = nextPresenceAction(conn, liveState().timing, event);
  if (r.next === "end") {
    logFeatureSad("artifact_presence", r.reason === "revoked" ? "closed_4403" : "refused_gave_up");
    closeAndForget(conn);
    return;
  }
  if (r.stallRunStarted) {
    let s =
      event.on === "boot"
        ? event.status
        : event.on === "socket"
          ? parseUpgradeRejection(event.detail)?.status
          : undefined;
    logFeatureSad("artifact_presence", "stall_run_started", {
      boot: event.on === "boot",
      ...(s !== undefined && {
        http_status: s,
      }),
    });
  }
  scheduleReconnect(conn, r.delayMs, reconnectPresence);
}
//@ chunk-aqdf5t3e.js:22856-23054 placement
function reconnectPresence(e) {
  if (!isCurrentConnection(e)) return;
  closeArtifactPresence(e, "reconnect").catch((error) => {
    logForDebugging(
      `[artifactPresence] reconnect threw slug=${e.slug}: ${error instanceof Error ? error.name : "error"}`,
    );
    schedulePresenceReconnect(e, {
      on: "dial_error",
      deterministic: false,
    });
  });
}
//@ chunk-aqdf5t3e.js:23054-23136 placement
function closeAndForget(e) {
  closePresence(e);
  let n = liveState();
  if (n.conns.get(e.slug) === e) n.conns.delete(e.slug);
}
//@ chunk-aqdf5t3e.js:23136-23884 placement
function handlePresenceFrame(e, n) {
  if (e.stopped || n.charCodeAt(0) !== 123) return;
  let r;
  try {
    r = jsonParseRaw(n);
  } catch {
    return;
  }
  let s = PRESENCE_EVENT_SCHEMA().safeParse(r);
  if (!s.success) return;
  let { kind, slug, actor, payload } = s.data;
  if (actor !== undefined || (slug !== undefined && slug !== e.slug)) return;
  if (handlePresenceControl(e, kind, payload)) return;
  switch (kind) {
    case "join_denied": {
      let reason = DECLINE_REASON_SCHEMA().safeParse(payload).data?.reason;
      if (reason === JOIN_DENIED_REASON_DENIED) {
        logFeatureBad("artifact_presence", "join_denied");
        closeAndForget(e);
        return;
      }
      logFeatureSad("artifact_presence", "join_denied");
      if (reason === JOIN_DENIED_REASON_CAP_INVALID) e.storedCap = undefined;
      e.refusedAdmission = true;
      if (e.taskId !== undefined)
        try {
          stopMonitorWsTasks(e.taskId, e.context.taskRegistry, {
            quiet: true,
          });
        } catch {}
      return;
    }
    case "ctrl:comment":
      supervisorWake(e.slug)?.comment();
      return;
    case "ctrl:invalidate": {
      let w = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
      if (w.success && (w.data.tag === INVALIDATE_TAG_LIVE || w.data.tag === INVALIDATE_TAG_SHARED))
        supervisorWake(e.slug)?.ver(w.data.ver, "sync");
      return;
    }
    default:
      return;
  }
}
//@ chunk-aqdf5t3e.js:23884-23978 placement
function supervisorWake(slug) {
  let n = getLiveState().live.supervisors.get(slug);
  return n !== undefined && !n.stopped ? n.wake : undefined;
}
//@ chunk-aqdf5t3e.js:23978-24024 placement
function rearmSlug(e, n) {
  e.declined.delete(n);
  retireSlug(e, n);
}
//@ chunk-aqdf5t3e.js:24024-24082 placement
function retireSlug(e, n) {
  let r = e.conns.get(n);
  if (r !== undefined) closeAndForget(r);
}
//@ chunk-aqdf5t3e.js:24082-24172 placement
function disposeAllPresence(e) {
  e.declined.clear();
  for (let conn of [...e.conns.values()]) closePresence(conn);
  e.conns.clear();
}
//@ chunk-aqdf5t3e.js:24172-24307 placement
function closeForeignOwnerConnections(e, n) {
  for (let conn of [...e.conns.values()]) {
    if (sameOwnerAccount(conn.owner, n)) continue;
    closePresence(conn);
    if (e.conns.get(conn.slug) === conn) e.conns.delete(conn.slug);
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
