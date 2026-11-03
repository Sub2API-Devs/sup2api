/**
 * services/artifacts/presenceSocket.ts
 *
 * Artifact presence 连接（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (46)
 * attribution: placement 46
 */
import { ve, fzn } from "./artifactPresence.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getRipgrepStatus } from "../../utils/ripgrep.js";
import { logError } from "../../utils/log.js";
import { undeclareSummon, dropSummonDeclaration } from "./summonArms.js";
import { dCi, cCi, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { PASSIVE } from "./pageScripts.js";
import {
  toWebSocketUrl,
  parseUpgradeRejection,
  HANDSHAKE_TIMEOUT,
  runWebSocketMonitor,
} from "../../tools/MonitorTool/websocketMonitor.js";
import { K_t } from "../../utils/cronTasks.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, oe, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { wsEgressDenyReason } from "../../tools/MonitorTool/MonitorTool.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { B5, k_e } from "./orgScope.js";
import { k2n, LBs, MFt, OFt, HBs } from "./artifactNotices.js";
import { stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { Y9 } from "./liveSubscribe.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { getUserAgent } from "../../utils/http.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-aqdf5t3e.js:8617-8704 placement
function pzn(e, n) {
  ve.of(e).userPrompt.setState((r) => (r.waitingFor === n ? r : { waitingFor: n }));
}
//@ chunk-aqdf5t3e.js:8704-8743 placement
function mzn(e) {
  return oRo(e) !== void 0;
}
//@ chunk-aqdf5t3e.js:8743-8808 placement
function oRo(e) {
  return ve.of(e).userPrompt.getState().waitingFor;
}
//@ chunk-aqdf5t3e.js:8808-8866 placement
function $Fs(e, n) {
  return ve.of(e).userPrompt.subscribe(n);
}
//@ chunk-aqdf5t3e.js:8866-8903 placement
var Dt = 120,
  Mn = `act:${Dt}`,
  ACT_0 = "act:0";
//@ chunk-aqdf5t3e.js:8903-8995 placement
function Pn(e) {
  if (!e.activityOkReported) ((e.activityOkReported = !0), logFeatureOk("artifact_activity_emit"));
}
//@ chunk-aqdf5t3e.js:8995-9025 placement
function Dn(e, n, r) {
  (n(r), Pn(e));
}
//@ chunk-aqdf5t3e.js:9025-9055 placement
function Fn(e, n, r) {
  (n(r), Pn(e));
}
//@ chunk-aqdf5t3e.js:9055-9186 placement
function broadcastActivityState(e, n) {
  for (let r of e.activitySenders.values()) Dn(e, r, n ? Mn : ACT_0);
  for (let r of e.agentActivitySinks.values()) Fn(e, r, n ? Dt : 0);
}
//@ chunk-aqdf5t3e.js:9186-9257 placement
function Vn(e) {
  return e.activitySenders.size + e.agentActivitySinks.size;
}
//@ chunk-aqdf5t3e.js:9257-9439 placement
function startActivityRefresh(e) {
  if (Vn(e) === 0) return;
  if (e.activityRefreshTimer !== void 0) return;
  ((e.activityRefreshTimer = setInterval((n) => broadcastActivityState(n, !0), e.activityRefreshMs, e)),
    e.activityRefreshTimer.unref?.());
}
//@ chunk-aqdf5t3e.js:9439-9568 placement
function stopActivityRefreshIfIdle(e) {
  if (Vn(e) === 0 && e.activityRefreshTimer !== void 0)
    (clearInterval(e.activityRefreshTimer), (e.activityRefreshTimer = void 0));
}
/**
 * 本地忙碌状态变化的防抖处理：变忙时（取消待清除）延时广播"活动中"并启动定期刷新；变闲时（取消待开始）延时停止刷新并广播"空闲"。
 */
//@ chunk-aqdf5t3e.js:9568-10188 placement
function onActivityEdge(presence, isActive) {
  if (isActive) {
    if (presence.activityClearTimer !== void 0) {
      (clearTimeout(presence.activityClearTimer), (presence.activityClearTimer = void 0));
      return;
    }
    ((presence.activityOnsetTimer ??= setTimeout(
      (r) => {
        ((r.activityOnsetTimer = void 0), broadcastActivityState(r, !0), startActivityRefresh(r));
      },
      presence.activityEdgeDebounceMs,
      presence,
    )),
      presence.activityOnsetTimer.unref?.());
  } else {
    if (presence.activityOnsetTimer !== void 0) {
      (clearTimeout(presence.activityOnsetTimer), (presence.activityOnsetTimer = void 0));
      return;
    }
    ((presence.activityClearTimer ??= setTimeout(
      (r) => {
        if (((r.activityClearTimer = void 0), r.activityRefreshTimer !== void 0))
          (clearInterval(r.activityRefreshTimer), (r.activityRefreshTimer = void 0));
        broadcastActivityState(r, !1);
      },
      presence.activityEdgeDebounceMs,
      presence,
    )),
      presence.activityClearTimer.unref?.());
  }
}
//@ chunk-aqdf5t3e.js:10188-10213 placement
function Un() {
  return getRootSession();
}
//@ chunk-aqdf5t3e.js:10213-10347 placement
function subscribeActivity(e) {
  if (e.activityUnsubscribe !== void 0) return;
  let n = Un();
  e.activityUnsubscribe = getRipgrepStatus(n, () => {
    try {
      onActivityEdge(e, fzn(n));
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-aqdf5t3e.js:10347-10441 placement
function Gn(e) {
  return (fzn(Un()) && e.activityOnsetTimer === void 0) || e.activityClearTimer !== void 0;
}
/**
 * 为 presence 连接登记一个活动状态发送端（并撤销该 slug 的召唤声明），当前活动中时立即发送并启动刷新。
 */
//@ chunk-aqdf5t3e.js:10441-10549 placement
function addActivitySender(e, n, r) {
  if (e.disposed) return;
  if ((subscribeActivity(e), e.activitySenders.set(n, r), undeclareSummon(e, n), Gn(e)))
    (Dn(e, r, Mn), startActivityRefresh(e));
}
//@ chunk-aqdf5t3e.js:10549-10643 placement
function Bn(e, n, r) {
  if (e.activitySenders.get(n) === r)
    (e.activitySenders.delete(n), dropSummonDeclaration(e, n), stopActivityRefreshIfIdle(e));
}
/**
 * 为 presence 连接登记一个代理活动接收端，当前活动中时立即发送并启动刷新。
 */
//@ chunk-aqdf5t3e.js:10643-10745 placement
function addAgentActivitySink(e, n, r) {
  if (e.disposed) return;
  if ((subscribeActivity(e), e.agentActivitySinks.set(n, r), Gn(e))) (Fn(e, r, Dt), startActivityRefresh(e));
}
//@ chunk-aqdf5t3e.js:10745-10836 placement
function Qe(e, n, r) {
  if (e.agentActivitySinks.get(n) === r) (e.agentActivitySinks.delete(n), stopActivityRefreshIfIdle(e));
}
//@ chunk-aqdf5t3e.js:10836-10859 placement
var FRAME_SYNC_V1 = "frame-sync.v1";
/**
 * 构造 artifact 同步 WebSocket 地址 /api/frame/sync?slug=…，可加评论提示与版本通知参数。
 */
//@ chunk-aqdf5t3e.js:10859-11075 placement
function getSyncSocketUrl(e, n) {
  let r = new URL("/api/frame/sync", dCi());
  if ((r.searchParams.set("slug", e), n?.commentHint === !0)) r.searchParams.set("comment_hint", "1");
  if (n?.versionNotices === !0) r.searchParams.set("vn", PASSIVE);
  return toWebSocketUrl(r);
}
//@ chunk-aqdf5t3e.js:11075-11138 placement
var Vt = /^(?=.{1,1024}$)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){5}$/;
/**
 * 判断能力令牌是否属于 agent 角色（第三段解码后的角色以 _agent 结尾）。
 */
//@ chunk-aqdf5t3e.js:11138-11250 placement
function isAgentCapToken(e) {
  if (!Vt.test(e)) return !1;
  let n = e.split(".", 4)[2];
  return n !== void 0 && parseRoleWithId(n).role.endsWith("_agent");
}
//@ chunk-aqdf5t3e.js:11250-11260 placement
var fi = 28;
//@ chunk-aqdf5t3e.js:11260-11414 placement
function parseRoleWithId(e) {
  let n = e.length - fi;
  if (n <= 0 || e.slice(n, n + 4) !== "_id_") return { role: e };
  let sliced = e.slice(n + 4);
  return K_t.test(sliced) ? { role: e.slice(0, n), id: sliced } : { role: "" };
}
/**
 * 从能力令牌第五段取出序号（1–12 位正整数），非法返回 undefined。
 */
//@ chunk-aqdf5t3e.js:11414-11561 placement
function getCapTokenSeq(e) {
  let n = e.split(".", 6)[4];
  if (n === void 0 || !/^[0-9]{1,12}$/.test(n)) return;
  let r = Number(n);
  return Number.isSafeInteger(r) && r > 0 ? r : void 0;
}
//@ chunk-aqdf5t3e.js:11561-11633 placement
var mi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/**
 * 从能力令牌前两段解析所有者：base64url 编码的账号 uuid（需规范往返一致）与组织 uuid。
 */
//@ chunk-aqdf5t3e.js:11633-11875 placement
function parseCapTokenOwner(e) {
  let [n, r] = e.split(".", 3);
  if (n === void 0 || r === void 0 || r === "") return;
  let str = Buffer.from(n, "base64url").toString("utf8");
  if (!mi.test(str) || Buffer.from(str, "utf8").toString("base64url") !== n) return;
  return { accountUuid: str, organizationUuid: r };
}
/**
 * presence 协议常量与控制消息 schema：boot 请求错误码、令牌刷新被拒（谱系过期）与加入被拒原因、默认关闭事件、事件信封、令牌刷新与拒绝原因。
 */
//@ chunk-aqdf5t3e.js:11875-12236 placement
var PRESENCE_TOKEN_MIN_TTL_MS = 60000,
  BOOT_REQUEST_ERROR = "boot_request_error",
  TOKEN_LINEAGE_EXPIRED = "TOKEN_REFRESH_DECLINED_REASON_LINEAGE_EXPIRED",
  JOIN_DENIED_REASON_DENIED = "JOIN_DENIED_REASON_DENIED",
  JOIN_DENIED_REASON_CAP_INVALID = "JOIN_DENIED_REASON_CAP_INVALID",
  DEFAULT_CLOSE_EVENT = { on: "socket", detail: "4503", opened: !0, uptimeMs: 0, ageMs: 0 },
  PRESENCE_EVENT_SCHEMA = DoctorLazy(() =>
    u({ kind: o(), slug: o().optional(), actor: o().optional(), payload: oe().optional() }),
  ),
  TOKEN_REFRESH_SCHEMA = DoctorLazy(() => u({ cap: o(), exp: E() })),
  DECLINE_REASON_SCHEMA = DoctorLazy(() => u({ reason: o() }));
//@ chunk-aqdf5t3e.js:12236-12306 placement
function $t(e, n) {
  return jsonStringify({ kind: "activity", slug: e, payload: { busyS: n } });
}
/**
 * 判断是否跳过 artifact 在线状态连接：远程会话、控制面覆盖或 WebSocket 出站被拒时返回原因。
 */
//@ chunk-aqdf5t3e.js:12306-12444 placement
function getPresenceSkipReason(e) {
  if (env.CLAUDE_CODE_REMOTE) return "remote";
  if (cCi()) return "cp_override";
  if (wsEgressDenyReason(getSyncSocketUrl(e)) !== null) return "egress_denied";
  return null;
}
//@ chunk-aqdf5t3e.js:12444-13644 placement
async function bootPresenceSocket(e, n) {
  let storedCap = e.storedCap;
  if (
    !e.rebootNeeded &&
    storedCap !== void 0 &&
    storedCap.exp * 1000 - Date.now() > PRESENCE_TOKEN_MIN_TTL_MS
  ) {
    let w = await readFreshOauthAccountFromDisk(e.context.storageV5).catch(() => {
      return;
    });
    if (!n.isCurrent()) return { outcome: "stale" };
    if (sameOwnerAccount(e.owner, w)) return { outcome: "token", token: storedCap.cap, boot: void 0 };
  }
  let s,
    now = Date.now();
  try {
    s = await fetchArtifactBootWithProbe(
      { slug: e.slug, env: claudeAiEnvironment() },
      n.feature,
      e.abort.signal,
      {
        agentPeer: !0,
        ...(e.bootedVersion !== void 0 && {
          lean: { version: e.bootedVersion, mustCarry: (w) => "syncToken" in w },
        }),
        speculative: !0,
        credentials: e.context.credentials,
      },
    );
  } catch {
    s = { err: "boot threw", errorCode: BOOT_REQUEST_ERROR };
  }
  if (!n.isCurrent()) return { outcome: "stale" };
  if (s.err !== null) {
    if (B5(s)) return { outcome: "other_org" };
    if (k_e(s)) return { outcome: "not_found" };
    return {
      outcome: "boot_failed",
      status: s.status,
      noAnswer: s.errorCode === BOOT_REQUEST_ERROR,
      elapsedMs: Date.now() - now,
    };
  }
  if (s.assetToken === void 0) return { outcome: "public_outside_org" };
  let syncToken = s.data.syncToken,
    d = typeof syncToken === "string" && Vt.test(syncToken) ? parseCapTokenOwner(syncToken) : void 0;
  if (e.owner !== void 0 && d !== void 0 && !sameOwnerAccount(e.owner, d))
    return { outcome: "owner_changed" };
  let b = typeof syncToken === "string" && isAgentCapToken(syncToken) ? d : void 0;
  if (typeof syncToken !== "string" || b === void 0) return { outcome: "not_admitted" };
  return (
    (e.owner = b),
    (e.rebootNeeded = !1),
    (e.bootedVersion = s.ver),
    storeCapToken(e, gi(syncToken)),
    { outcome: "token", token: syncToken, boot: s.data }
  );
}
//@ chunk-aqdf5t3e.js:13644-13718 placement
function gi(e) {
  return { cap: e, exp: getCapTokenSeq(e) ?? Math.floor((Date.now() + k2n) / 1000) };
}
//@ chunk-aqdf5t3e.js:13718-13859 placement
function storeCapToken(e, n) {
  let now = Date.now(),
    min = Math.min(now + k2n, Math.max(now + LBs, n.exp * 1000));
  ((e.storedCap = { cap: n.cap, exp: Math.floor(min / 1000) }), (e.capStrikes = 0));
}
/**
 * 处理 presence 控制消息：token_refresh 时校验是代理令牌且属于同一账号后保存；token_refresh_declined 且原因为谱系过期时要求重新 boot 并清除令牌。返回是否已处理。
 */
//@ chunk-aqdf5t3e.js:13859-14198 placement
function handlePresenceControl(e, n, r) {
  switch (n) {
    case "ctrl:token_refresh": {
      let safeParse = TOKEN_REFRESH_SCHEMA().safeParse(r);
      if (
        safeParse.success &&
        isAgentCapToken(safeParse.data.cap) &&
        sameOwnerAccount(e.owner, parseCapTokenOwner(safeParse.data.cap))
      )
        storeCapToken(e, { cap: safeParse.data.cap, exp: safeParse.data.exp });
      return !0;
    }
    case "ctrl:token_refresh_declined": {
      let safeParse = DECLINE_REASON_SCHEMA().safeParse(r);
      if (safeParse.success && safeParse.data.reason === TOKEN_LINEAGE_EXPIRED)
        ((e.rebootNeeded = !0), (e.storedCap = void 0));
      return !0;
    }
    default:
      return !1;
  }
}
//@ chunk-aqdf5t3e.js:14198-14321 placement
function stopPresenceOnError(e, n, r) {
  if (n()) return;
  if (e.taskId !== void 0)
    try {
      stopMonitorWsTasks(e.taskId, e.context.taskRegistry, { quiet: !0 });
    } catch {}
  r("error");
}
/**
 * 关闭 presence 连接：标记停止、清除令牌、中止请求、取消重连定时器、置为 closed，并停掉对应的监听任务。
 */
//@ chunk-aqdf5t3e.js:14321-14605 placement
function closePresence(e) {
  if (((e.stopped = !0), (e.storedCap = void 0), e.abort.abort(), e.reconnectTimer !== void 0))
    (clearTimeout(e.reconnectTimer), (e.reconnectTimer = void 0));
  if (((e.send = void 0), (e.state = "closed"), e.taskId !== void 0)) {
    let taskId = e.taskId;
    e.taskId = void 0;
    try {
      stopMonitorWsTasks(taskId, e.context.taskRegistry, { quiet: !0 });
    } catch {}
  }
}
//@ chunk-aqdf5t3e.js:14605-14616 placement
var Si = 404;
//@ chunk-aqdf5t3e.js:14616-14681 placement
function vi(e) {
  let n = Number(e);
  return n === 1008 || (n >= 4000 && n <= 4999);
}
/**
 * 把 presence 连接失败归类：revoked（吊销）、refused（被拒）、unavailable（服务不可用/停顿）、dropped（普通断开），依据拨号错误、boot 状态与 socket 关闭码/运行时长。
 */
//@ chunk-aqdf5t3e.js:14681-15302 placement
function classifyPresenceFailure(conn, event, timing) {
  switch (event.on) {
    case "dial_error":
      return event.deterministic ? "refused" : "dropped";
    case "boot":
      if (Y9(event.status)) return "unavailable";
      if (event.noAnswer) return event.elapsedMs >= timing.stallThresholdMs ? "unavailable" : "dropped";
      return "refused";
    case "socket": {
      if (event.detail === MFt) return "revoked";
      if (event.opened) {
        if (event.uptimeMs >= timing.stallThresholdMs) return "dropped";
        if (event.detail === OFt && !conn.rebootNeeded) return "unavailable";
        return vi(event.detail) ? "refused" : "dropped";
      }
      let s = parseUpgradeRejection(event.detail);
      if (s !== null) return Y9(s.status) || s.cfMitigated || s.status === Si ? "unavailable" : "refused";
      return event.detail === HANDSHAKE_TIMEOUT || event.ageMs >= timing.stallThresholdMs
        ? "unavailable"
        : "dropped";
    }
  }
}
//@ chunk-aqdf5t3e.js:15302-15373 placement
function tr(e, n, r) {
  let s = classifyPresenceFailure(e, n, r);
  return s === "refused" || s === "revoked";
}
/**
 * 根据失败类别决定 presence 下一步：吊销或连续被拒过多则结束；不可用时进入停顿退避；否则按指数退避（带抖动）重拨；同时维护令牌失效计数、拒绝计数与退避等级。
 */
//@ chunk-aqdf5t3e.js:15373-16392 placement
function nextPresenceAction(conn, timing, event) {
  let kind = classifyPresenceFailure(conn, event, timing);
  if (kind === "revoked" || kind === "refused") conn.storedCap = void 0;
  else if (kind === "dropped" && event.on !== "boot" && conn.storedCap !== void 0) {
    let a = event.on === "socket" && event.opened && event.uptimeMs >= timing.minUptimeMs;
    if (((conn.capStrikes = a ? 0 : conn.capStrikes + 1), conn.capStrikes >= HBs)) conn.storedCap = void 0;
  }
  if (kind === "revoked") return { next: "end", reason: "revoked" };
  if (kind === "unavailable") {
    let a = conn.stalledSince === void 0;
    if (a) ((conn.stalledSince = Date.now()), (conn.stalls = 0));
    let min = Math.min(timing.stallMinMs * 2 ** conn.stalls, timing.stallMaxMs / 2),
      min_2 = Math.min(min * 2, timing.stallMaxMs);
    return (
      conn.stalls++,
      {
        next: "redial",
        delayMs: Math.round(min + Math.random() * (min_2 - min)),
        stalled: !0,
        stallRunStarted: a,
      }
    );
  }
  if (((conn.stalledSince = void 0), kind === "refused")) {
    if ((conn.refusals++, conn.refusals > timing.maxConsecutiveRefusals))
      return { next: "end", reason: "refused" };
  }
  if (event.on === "socket" && event.opened) {
    if (event.uptimeMs >= timing.stallThresholdMs) conn.refusals = 0;
    if (event.uptimeMs >= timing.minUptimeMs) conn.backoff = 0;
  }
  let min = Math.min(timing.capMs, timing.baseMs * 2 ** Math.min(conn.backoff, 5));
  return (
    conn.backoff++,
    { next: "redial", delayMs: Math.round(Math.random() * min), stalled: !1, stallRunStarted: !1 }
  );
}
/**
 * 关闭在线状态连接并安排重连定时器（清除旧定时器，不阻止进程退出）。
 */
//@ chunk-aqdf5t3e.js:16392-16553 placement
function scheduleReconnect(e, n, r) {
  if (e.reconnectTimer !== void 0) clearTimeout(e.reconnectTimer);
  ((e.state = "closed"), (e.reconnectTimer = setTimeout(wi, n, e, r)), e.reconnectTimer.unref?.());
}
//@ chunk-aqdf5t3e.js:16553-16599 placement
function wi(e, n) {
  ((e.reconnectTimer = void 0), n(e));
}
//@ chunk-aqdf5t3e.js:16599-18022 placement
async function connectPresenceSocket(e, n, r, s) {
  let { slug: slug } = e,
    { live: live } = getLiveState(),
    d = !1,
    b = !1,
    w,
    S,
    R = () => b || !s(),
    now = Date.now(),
    G = () => (d && e.openedAt > 0 ? Date.now() - e.openedAt : 0),
    L = (y) => {
      if (R()) return;
      b = !0;
      let T = G(),
        P = Date.now() - now;
      if (e.send === w) ((e.send = void 0), (e.state = "closed"), (e.openedAt = 0));
      r.onEnded(y, { opened: d, uptimeMs: T, ageMs: P });
    };
  try {
    let y = await runWebSocketMonitor(
      {
        ws: { url: getSyncSocketUrl(slug, { versionNotices: !0 }), protocols: [FRAME_SYNC_V1, n] },
        headers: { "User-Agent": getUserAgent() },
        description: r.description,
        timeout_ms: 0,
        persistent: !0,
        quietLifecycle: !0,
        ambient: !0,
        handshakeDeadlineMs: r.handshakeDeadlineMs,
        ...(e.taskId !== void 0 && { reuseTaskId: e.taskId }),
        transform: (T) => (r.onFrame(T), null),
        keepalive: r.keepalive,
        onSender: (T) => {
          if (R()) return;
          ((w = T),
            (e.send = T),
            (e.state = "open"),
            (S = (P) => T($t(slug, P))),
            addAgentActivitySink(live, r.activitySinkKey, S));
        },
        onSenderClosed: () => {
          if (S !== void 0) Qe(live, r.activitySinkKey, S);
          if (w !== void 0 && e.send === w) {
            if (((e.send = void 0), e.state === "open")) e.state = "closed";
          }
          if (R()) return;
          let taskId = e.taskId,
            P = taskId === void 0 ? void 0 : e.context.taskRegistry.all()[taskId];
          if (taskId !== void 0 && P?.status !== "running") {
            L("task_ended");
            return;
          }
          setTimeout(stopPresenceOnError, 0, e, R, L).unref?.();
        },
        onLifecycle: (T, P) => {
          if (R()) return;
          if (T === "open") {
            ((d = !0), (e.everOpened = !0), (e.openedAt = Date.now()), r.onOpen());
            return;
          }
          L(P);
        },
      },
      e.context,
    );
    if (((e.taskId = y.data.taskId), !s()))
      return (stopMonitorWsTasks(y.data.taskId, e.context.taskRegistry, { quiet: !0 }), { outcome: "stale" });
    return { outcome: "armed" };
  } catch (error) {
    return (
      logForDebugging(
        `[${r.label}] connect failed slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
      ),
      { outcome: "error", error: error }
    );
  }
}

export {
  mzn,
  pzn,
  oRo,
  $Fs,
  PRESENCE_EVENT_SCHEMA,
  TOKEN_REFRESH_SCHEMA,
  isAgentCapToken,
  DECLINE_REASON_SCHEMA,
  TOKEN_LINEAGE_EXPIRED,
  parseCapTokenOwner,
  getCapTokenSeq,
  getSyncSocketUrl,
  FRAME_SYNC_V1,
  $t,
  addAgentActivitySink,
  addActivitySender,
  Qe,
  Bn,
  getPresenceSkipReason,
  scheduleReconnect,
  bootPresenceSocket,
  tr,
  connectPresenceSocket,
  DEFAULT_CLOSE_EVENT,
  nextPresenceAction,
  closePresence,
  handlePresenceControl,
  JOIN_DENIED_REASON_DENIED,
  JOIN_DENIED_REASON_CAP_INVALID,
};
