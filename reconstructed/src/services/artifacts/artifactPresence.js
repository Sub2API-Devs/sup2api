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
import { addWithLimit, jXn } from "../../utils/cronTasks.js";
import { getLiveState, Vyi } from "../liveReplica/liveReplica.js";
import { createStore } from "../../state/store.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { E, u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { safeParseJSON } from "../../utils/json.js";
import { hqe, _ni } from "../../utils/plugins/hooksModulesLoadGate.js";
import { getLastInteractionTime, getLastApiCompletionTimestamp } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import {
  getPresenceSkipReason,
  scheduleReconnect,
  bootPresenceSocket,
  tr,
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
import { KBs, stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { jsonStringify, jsonParseRaw } from "../../utils/slowOperations.js";
import { MFt, OFt } from "./artifactNotices.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { findHumanMessagesContaining } from "./presenceTranscript.js";

//@ chunk-aqdf5t3e.js:7806-7861 placement
function gzn(e) {
  addWithLimit(getLiveState().durable.claudeDocSlugs, e, jXn);
}
/**
 * 列出持久监听的布防状态：在途的标为 arming，已失败的标为 failed（附原因、详情、服务端消息与时间），可按 slug 过滤。
 */
//@ chunk-aqdf5t3e.js:7861-8240 placement
function listDurableArmStates(e) {
  let durable = getLiveState().durable,
    r = [],
    s = new Set();
  for (let h of durable.armsInFlight.keys()) {
    if (!In(durable, h, e)) continue;
    (r.push({ slug: h, state: "arming" }), s.add(h));
  }
  for (let [h, a] of durable.armOutcomes) {
    if (!In(durable, h, e) || s.has(h)) continue;
    r.push({
      slug: h,
      state: "failed",
      reason: a.reason,
      ...(a.detail !== void 0 && { detail: a.detail }),
      ...(a.serverMessage !== void 0 && { serverMessage: a.serverMessage }),
      at: a.at,
    });
  }
  return r;
}
//@ chunk-aqdf5t3e.js:8240-8330 placement
function In(e, n, r) {
  return (r === void 0 || n === r) && !e.rows.has(n) && !e.stopLatches.isStopped(n);
}
//@ chunk-aqdf5t3e.js:8330-8399 placement
class On {
  working = createStore({ working: !1 });
  userPrompt = createStore({ waitingFor: void 0 });
}
//@ chunk-aqdf5t3e.js:8399-8425 placement
var ve = new SessionRootSlot(() => new On());
//@ chunk-aqdf5t3e.js:8425-8503 placement
function eyt(e, n) {
  ve.of(e).working.setState((r) => (r.working === n ? r : { working: n }));
}
//@ chunk-aqdf5t3e.js:8503-8562 placement
function fzn(e) {
  return ve.of(e).working.getState().working;
}
//@ chunk-aqdf5t3e.js:18022-18178 placement
var TENGU_SLATE_LANTERN_HUSH = "tengu_slate_lantern_hush",
  Ri = [600, 86400],
  yi = [25, 600],
  ki = 50,
  Ei = DoctorLazy(() => {
    let e = E()
      .optional()
      .catch(void 0);
    return u({ idleAfterS: e, idleKeepaliveS: e });
  });
//@ chunk-aqdf5t3e.js:18178-18244 placement
function ir(e, [n, r]) {
  return Math.min(Math.max(Math.round(e), n), r);
}
/**
 * 读 tengu_slate_lantern_hush 配置得出 presence 空闲参数：多久没交互算空闲（0 为关闭）与空闲时的保活间隔，均限制在上限内。
 */
//@ chunk-aqdf5t3e.js:18244-18525 placement
function getPresenceIdleConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SLATE_LANTERN_HUSH, null);
  if (typeof e === "string") e = safeParseJSON(e, !1);
  let safeParse = Ei().safeParse(e),
    r = safeParse.success ? safeParse.data : {},
    s = r.idleAfterS === void 0 || r.idleAfterS <= 0 ? 0 : ir(r.idleAfterS, Ri) * 1000,
    h = (r.idleKeepaliveS === void 0 ? ki : ir(r.idleKeepaliveS, yi)) * 1000;
  return { idleAfterMs: s, idleKeepaliveMs: h };
}
//@ chunk-aqdf5t3e.js:18525-18643 placement
function getIdleMs(e, n) {
  if (hqe()) return 0;
  let max = Math.max(
    _ni(),
    getLastInteractionTime(),
    getLastApiCompletionTimestamp() ?? 0,
    e.lastArtifactToolCallAt,
  );
  return Math.max(0, n - max);
}
/**
 * 空闲超过阈值后把 artifact 在线状态的保活间隔放宽到空闲保活值。
 */
//@ chunk-aqdf5t3e.js:18643-18775 placement
function adjustKeepaliveForIdle(e, n, r = Date.now()) {
  let s = getPresenceIdleConfig();
  if (s.idleAfterMs <= 0) return n;
  return getIdleMs(e, r) >= s.idleAfterMs ? Math.max(s.idleKeepaliveMs, n) : n;
}
/**
 * 实时失效事件的 schema（tag/ver/replay）、三种失效标签名，以及评论已读状态（commentsEmpty/readAtMs）的 schema。
 */
//@ chunk-aqdf5t3e.js:18775-18994 placement
var INVALIDATION_EVENT_SCHEMA = DoctorLazy(() => u({ tag: o(), ver: o(), replay: M().optional() })),
  INVALIDATE_TAG_LIVE = "INVALIDATE_TAG_LIVE",
  INVALIDATE_TAG_SHARED = "INVALIDATE_TAG_SHARED",
  INVALIDATE_TAG_HEAD = "INVALIDATE_TAG_HEAD",
  COMMENTS_READ_STATE_SCHEMA = DoctorLazy(() =>
    u({ commentsEmpty: M(), readAtMs: E().int().positive().max(8640000000000000) }),
  );
//@ chunk-aqdf5t3e.js:18994-19025 placement
function jt(e) {
  return e * 3 + 5000;
}
//@ chunk-aqdf5t3e.js:19025-19106 placement
function xi() {
  return env.CLAUDE_CODE_ARTIFACT_PRESENCE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_brass_plover", !1);
}
//@ chunk-aqdf5t3e.js:19106-19160 placement
function at(e) {
  if (!xi()) return "flag_off";
  return getPresenceSkipReason(e);
}
//@ chunk-aqdf5t3e.js:19160-19195 placement
function Re() {
  return getLiveState().presence;
}
//@ chunk-aqdf5t3e.js:19195-19255 placement
function Fe(e) {
  return !e.stopped && Re().conns.get(e.slug) === e;
}
//@ chunk-aqdf5t3e.js:19255-19792 placement
function armArtifactPresence(e) {
  let { slug: slug, url: url } = e;
  try {
    let s = at(slug);
    if (s !== null) {
      if (s !== "flag_off") logForDebugging(`[artifactPresence] not arming slug=${slug}: ${s}`);
      return;
    }
    let h = Re();
    if (h.declined.has(slug)) return;
    let a = pickMonitorContext(e.context);
    ((h.dispose = Di),
      (h.accountChanged = closeForeignOwnerConnections),
      (h.disposeSlug = Pi),
      (h.retireSlug = lr));
    let d = h.conns.get(slug);
    if (d !== void 0 && !d.stopped) {
      if (((d.url = url), d.stalledSince !== void 0 && d.reconnectTimer !== void 0))
        scheduleReconnect(d, Math.round(Math.random() * h.timing.capMs), reconnectPresence);
      return;
    }
    connectArtifactPresence(h, slug, url, a);
  } catch (error) {
    logForDebugging(
      `[artifactPresence] arm threw slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
  }
}
//@ chunk-aqdf5t3e.js:19792-20305 placement
function connectArtifactPresence(e, n, r, s) {
  let h = {
    slug: n,
    url: r,
    context: s,
    send: void 0,
    state: "connecting",
    storedCap: void 0,
    capStrikes: 0,
    owner: void 0,
    rebootNeeded: !1,
    bootedVersion: void 0,
    backoff: 0,
    refusals: 0,
    stalledSince: void 0,
    stalls: 0,
    openedAt: 0,
    everOpened: !1,
    reconnectTimer: void 0,
    taskId: void 0,
    refusedAdmission: !1,
    stopped: !1,
    abort: new AbortController(),
  };
  (e.conns.set(n, h),
    KBs(Wi),
    closeArtifactPresence(h, "initial").catch((a) => {
      (logForDebugging(
        `[artifactPresence] connect threw slug=${n}: ${a instanceof Error ? a.name : "error"}`,
      ),
        schedulePresenceReconnect(h, { on: "dial_error", deterministic: !1 }));
    }));
}
//@ chunk-aqdf5t3e.js:20305-20339 placement
var Wi = { closeByTaskId: (e) => declinePresenceForTask(e) };
//@ chunk-aqdf5t3e.js:20339-20509 placement
function declinePresenceForTask(e) {
  let n = Vyi();
  if (n === void 0) return !1;
  for (let r of n.conns.values()) {
    if (r.taskId !== e) continue;
    return ((r.taskId = void 0), n.declined.add(r.slug), re(r), !0);
  }
  return !1;
}
//@ chunk-aqdf5t3e.js:20509-21341 placement
async function closeArtifactPresence(e, n) {
  let r = at(e.slug);
  if (r !== null) {
    (logForDebugging(`[artifactPresence] closing slug=${e.slug}: ${r}`), re(e));
    return;
  }
  e.state = "connecting";
  let s = await bootPresenceSocket(e, { feature: "artifact_presence", isCurrent: () => Fe(e) });
  switch (s.outcome) {
    case "stale":
      return;
    case "not_found":
      re(e);
      return;
    case "other_org":
    case "public_outside_org":
      (logFeatureSad("artifact_presence", s.outcome), re(e));
      return;
    case "boot_failed": {
      let h = { on: "boot", status: s.status, noAnswer: s.noAnswer, elapsedMs: s.elapsedMs };
      if (n === "initial" && tr(e, h, Re().timing))
        (logForDebugging(`[artifactPresence] boot failed for slug=${e.slug}; no presence connection`), re(e));
      else schedulePresenceReconnect(e, h);
      return;
    }
    case "not_admitted":
      (logForDebugging(`[artifactPresence] no agent token minted for slug=${e.slug}; no presence connection`),
        re(e));
      return;
    case "owner_changed":
      (logFeatureSad("artifact_presence", "owner_changed"), re(e));
      return;
    case "token":
      await runArtifactPresence(e, s.token);
      return;
  }
}
//@ chunk-aqdf5t3e.js:21341-22478 placement
async function runArtifactPresence(e, n) {
  let { timing: timing } = Re(),
    { slug: slug } = e,
    h = !e.everOpened;
  e.refusedAdmission = !1;
  let a = await connectPresenceSocket(
    e,
    n,
    {
      description: `presence on artifact ${e.url}`,
      keepalive: {
        openFrames: [],
        frame: jsonStringify({ kind: "ping", slug: slug }),
        intervalMs: timing.keepaliveMs,
        sendEveryMs: () => adjustKeepaliveForIdle(getLiveState().live, timing.keepaliveMs),
        deadlineMs: timing.keepaliveDeadlineMs ?? jt(timing.keepaliveMs),
      },
      onFrame: (b) => handlePresenceFrame(e, b),
      onOpen: () => {
        if (h) logFeatureOk("artifact_presence", { connected: !0 });
      },
      onEnded: (b, w) => {
        let refusedAdmission = e.refusedAdmission;
        if (((e.refusedAdmission = !1), refusedAdmission && b !== MFt)) {
          schedulePresenceReconnect(e, DEFAULT_CLOSE_EVENT);
          return;
        }
        if (w.opened) {
          if (b !== OFt && b !== MFt) logFeatureSad("artifact_presence", `closed_${b ?? "unknown"}`);
        } else {
          let R = parseUpgradeRejection(b);
          logFeatureBad(
            "artifact_presence",
            "connect_failed",
            R === null ? void 0 : { http_status: R.status, cf_mitigated: R.cfMitigated },
          );
        }
        schedulePresenceReconnect(e, { on: "socket", detail: b, ...w });
      },
      handshakeDeadlineMs: timing.handshakeDeadlineMs,
      activitySinkKey: `presence:${slug}`,
      label: "artifactPresence",
    },
    () => Fe(e),
  );
  if (a.outcome !== "error") return;
  let d = a.error instanceof MonitorWsPreconditionError && !a.error.message.startsWith("could not resolve");
  if (!Fe(e)) return;
  if (h && d) {
    (logFeatureBad("artifact_presence", "ws_open_error"), re(e));
    return;
  }
  (logFeatureSad("artifact_presence", "ws_open_error"),
    (e.state = "closed"),
    schedulePresenceReconnect(e, { on: "dial_error", deterministic: d }));
}
/**
 * 按失败情况决定 presence 连接的下一步：放弃（吊销或多次被拒）时打点并关闭；开始停顿时打点；否则按退避时间安排重连。
 */
//@ chunk-aqdf5t3e.js:22478-22856 placement
function schedulePresenceReconnect(e, n) {
  if (!Fe(e)) return;
  let r = nextPresenceAction(e, Re().timing, n);
  if (r.next === "end") {
    (logFeatureSad("artifact_presence", r.reason === "revoked" ? "closed_4403" : "refused_gave_up"), re(e));
    return;
  }
  if (r.stallRunStarted) {
    let s = n.on === "boot" ? n.status : n.on === "socket" ? parseUpgradeRejection(n.detail)?.status : void 0;
    logFeatureSad("artifact_presence", "stall_run_started", {
      boot: n.on === "boot",
      ...(s !== void 0 && { http_status: s }),
    });
  }
  scheduleReconnect(e, r.delayMs, reconnectPresence);
}
//@ chunk-aqdf5t3e.js:22856-23054 placement
function reconnectPresence(e) {
  if (!Fe(e)) return;
  closeArtifactPresence(e, "reconnect").catch((n) => {
    (logForDebugging(
      `[artifactPresence] reconnect threw slug=${e.slug}: ${n instanceof Error ? n.name : "error"}`,
    ),
      schedulePresenceReconnect(e, { on: "dial_error", deterministic: !1 }));
  });
}
//@ chunk-aqdf5t3e.js:23054-23136 placement
function re(e) {
  closePresence(e);
  let n = Re();
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
  let safeParse = PRESENCE_EVENT_SCHEMA().safeParse(r);
  if (!safeParse.success) return;
  let { kind: kind, slug: slug, actor: actor, payload: payload } = safeParse.data;
  if (actor !== void 0 || (slug !== void 0 && slug !== e.slug)) return;
  if (handlePresenceControl(e, kind, payload)) return;
  switch (kind) {
    case "join_denied": {
      let w = DECLINE_REASON_SCHEMA().safeParse(payload).data?.reason;
      if (w === JOIN_DENIED_REASON_DENIED) {
        (logFeatureBad("artifact_presence", "join_denied"), re(e));
        return;
      }
      if ((logFeatureSad("artifact_presence", "join_denied"), w === JOIN_DENIED_REASON_CAP_INVALID))
        e.storedCap = void 0;
      if (((e.refusedAdmission = !0), e.taskId !== void 0))
        try {
          stopMonitorWsTasks(e.taskId, e.context.taskRegistry, { quiet: !0 });
        } catch {}
      return;
    }
    case "ctrl:comment":
      or(e.slug)?.comment();
      return;
    case "ctrl:invalidate": {
      let safeParse = INVALIDATION_EVENT_SCHEMA().safeParse(payload);
      if (
        safeParse.success &&
        (safeParse.data.tag === INVALIDATE_TAG_LIVE || safeParse.data.tag === INVALIDATE_TAG_SHARED)
      )
        or(e.slug)?.ver(safeParse.data.ver, "sync");
      return;
    }
    default:
      return;
  }
}
//@ chunk-aqdf5t3e.js:23884-23978 placement
function or(e) {
  let n = getLiveState().live.supervisors.get(e);
  return n !== void 0 && !n.stopped ? n.wake : void 0;
}
//@ chunk-aqdf5t3e.js:23978-24024 placement
function Pi(e, n) {
  (e.declined.delete(n), lr(e, n));
}
//@ chunk-aqdf5t3e.js:24024-24082 placement
function lr(e, n) {
  let r = e.conns.get(n);
  if (r !== void 0) re(r);
}
//@ chunk-aqdf5t3e.js:24082-24172 placement
function Di(e) {
  e.declined.clear();
  for (let n of [...e.conns.values()]) closePresence(n);
  e.conns.clear();
}
//@ chunk-aqdf5t3e.js:24172-24307 placement
function closeForeignOwnerConnections(e, n) {
  for (let r of [...e.conns.values()]) {
    if (sameOwnerAccount(r.owner, n)) continue;
    if ((closePresence(r), e.conns.get(r.slug) === r)) e.conns.delete(r.slug);
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
  eyt,
  fzn,
  listDurableArmStates,
  hasHumanMessageContaining,
  gzn,
  INVALIDATION_EVENT_SCHEMA,
  INVALIDATE_TAG_LIVE,
  INVALIDATE_TAG_SHARED,
  INVALIDATE_TAG_HEAD,
  COMMENTS_READ_STATE_SCHEMA,
  at,
  adjustKeepaliveForIdle,
  jt,
  armArtifactPresence,
  ve,
  lastHumanMessageIndexContaining,
};
