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
import { presenceStores, isWorking } from "./artifactPresence.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getRipgrepStatus } from "../../utils/ripgrep.js";
import { logError } from "../../utils/log.js";
import { undeclareSummon, dropSummonDeclaration } from "./summonArms.js";
import { getBaseApiUrl, isBaseApiCpOverride, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { PASSIVE } from "./pageScripts.js";
import {
  toWebSocketUrl,
  parseUpgradeRejection,
  HANDSHAKE_TIMEOUT,
  runWebSocketMonitor,
} from "../../tools/MonitorTool/websocketMonitor.js";
import { SESSION_ID_SHORT_RE } from "../../utils/cronTasks.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, unknown, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { wsEgressDenyReason } from "../../tools/MonitorTool/MonitorTool.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
import { isOtherOrg, isGone } from "./orgScope.js";
import {
  ROUTE_ABSENT_GRACE_MS,
  TOKEN_MIN_GRACE_MS,
  ROUTE_ABSENT_4403,
  ROUTE_ABSENT_4503,
  MAX_REALTIME_TOKEN_ATTEMPTS,
} from "./artifactNotices.js";
import { stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { isRetryableStatus } from "./liveSubscribe.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { getUserAgent } from "../../utils/http.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-aqdf5t3e.js:8617-8704 placement
/**
 * 导出函数 `setWaitingFor`：参数 e, n。
 */
function setWaitingFor(session, n) {
  presenceStores.of(session).userPrompt.setState((r) =>
    r.waitingFor === n
      ? r
      : {
          waitingFor: n,
        },
  );
}
//@ chunk-aqdf5t3e.js:8704-8743 placement
/**
 * 导出函数 `hasWaitingFor`：参数 e，返回 oRo(e) !== void 0。
 */
function hasWaitingFor(e) {
  return waitingFor(e) !== undefined;
}
//@ chunk-aqdf5t3e.js:8743-8808 placement
/**
 * 导出函数 `waitingFor`：参数 e，返回 ve.of(e).userPrompt.getState().waitingFor。
 */
function waitingFor(e) {
  return presenceStores.of(e).userPrompt.getState().waitingFor;
}
//@ chunk-aqdf5t3e.js:8808-8866 placement
/**
 * 导出函数 `subscribeWaiting`：参数 e, n，返回 ve.of(e).userPrompt.subscribe(n)。
 */
function subscribeWaiting(session, n) {
  return presenceStores.of(session).userPrompt.subscribe(n);
}
//@ chunk-aqdf5t3e.js:8866-8903 placement
var ACTIVITY_BUSY_SECONDS = 120;
var ACTIVITY_BUSY_PREFIX = `act:${ACTIVITY_BUSY_SECONDS}`;
var ACTIVITY_IDLE = "act:0";
//@ chunk-aqdf5t3e.js:8903-8995 placement
function noteActivityOk(e) {
  if (!e.activityOkReported) {
    e.activityOkReported = true;
    logFeatureOk("artifact_activity_emit");
  }
}
//@ chunk-aqdf5t3e.js:8995-9025 placement
function sendActivityFrame(e, n, r) {
  n(r);
  noteActivityOk(e);
}
//@ chunk-aqdf5t3e.js:9025-9055 placement
function sendAgentActivity(e, n, r) {
  n(r);
  noteActivityOk(e);
}
//@ chunk-aqdf5t3e.js:9055-9186 placement
function broadcastActivityState(e, n) {
  for (let activitySender of e.activitySenders.values())
    sendActivityFrame(e, activitySender, n ? ACTIVITY_BUSY_PREFIX : ACTIVITY_IDLE);
  for (let agentActivitySink of e.agentActivitySinks.values())
    sendAgentActivity(e, agentActivitySink, n ? ACTIVITY_BUSY_SECONDS : 0);
}
//@ chunk-aqdf5t3e.js:9186-9257 placement
function activitySinkCount(e) {
  return e.activitySenders.size + e.agentActivitySinks.size;
}
//@ chunk-aqdf5t3e.js:9257-9439 placement
function startActivityRefresh(e) {
  if (activitySinkCount(e) === 0) return;
  if (e.activityRefreshTimer !== undefined) return;
  e.activityRefreshTimer = setInterval((n) => broadcastActivityState(n, true), e.activityRefreshMs, e);
  e.activityRefreshTimer.unref?.();
}
//@ chunk-aqdf5t3e.js:9439-9568 placement
function stopActivityRefreshIfIdle(e) {
  if (activitySinkCount(e) === 0 && e.activityRefreshTimer !== undefined) {
    clearInterval(e.activityRefreshTimer);
    e.activityRefreshTimer = undefined;
  }
}
//@ chunk-aqdf5t3e.js:9568-10188 placement
/**
 * 本地忙碌状态变化的防抖处理：变忙时（取消待清除）延时广播"活动中"并启动定期刷新；变闲时（取消待开始）延时停止刷新并广播"空闲"。
 */
function onActivityEdge(presence, isActive) {
  if (isActive) {
    if (presence.activityClearTimer !== undefined) {
      clearTimeout(presence.activityClearTimer);
      presence.activityClearTimer = undefined;
      return;
    }
    presence.activityOnsetTimer ??= setTimeout(
      (r) => {
        r.activityOnsetTimer = undefined;
        broadcastActivityState(r, true);
        startActivityRefresh(r);
      },
      presence.activityEdgeDebounceMs,
      presence,
    );
    presence.activityOnsetTimer.unref?.();
  } else {
    if (presence.activityOnsetTimer !== undefined) {
      clearTimeout(presence.activityOnsetTimer);
      presence.activityOnsetTimer = undefined;
      return;
    }
    presence.activityClearTimer ??= setTimeout(
      (r) => {
        r.activityClearTimer = undefined;
        if (r.activityRefreshTimer !== undefined) {
          clearInterval(r.activityRefreshTimer);
          r.activityRefreshTimer = undefined;
        }
        broadcastActivityState(r, false);
      },
      presence.activityEdgeDebounceMs,
      presence,
    );
    presence.activityClearTimer.unref?.();
  }
}
//@ chunk-aqdf5t3e.js:10188-10213 placement
function rootSession() {
  return getRootSession();
}
//@ chunk-aqdf5t3e.js:10213-10347 placement
function subscribeActivity(presence) {
  if (presence.activityUnsubscribe !== undefined) return;
  let n = rootSession();
  presence.activityUnsubscribe = getRipgrepStatus(n, () => {
    try {
      onActivityEdge(presence, isWorking(n));
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-aqdf5t3e.js:10347-10441 placement
function shouldSendActivityNow(e) {
  return (
    (isWorking(rootSession()) && e.activityOnsetTimer === undefined) || e.activityClearTimer !== undefined
  );
}
//@ chunk-aqdf5t3e.js:10441-10549 placement
/**
 * 为 presence 连接登记一个活动状态发送端（并撤销该 slug 的召唤声明），当前活动中时立即发送并启动刷新。
 */
function addActivitySender(e, slug, r) {
  if (e.disposed) return;
  subscribeActivity(e);
  e.activitySenders.set(slug, r);
  undeclareSummon(e, slug);
  if (shouldSendActivityNow(e)) {
    sendActivityFrame(e, r, ACTIVITY_BUSY_PREFIX);
    startActivityRefresh(e);
  }
}
//@ chunk-aqdf5t3e.js:10549-10643 placement
function removeActivitySender(e, slug, r) {
  if (e.activitySenders.get(slug) === r) {
    e.activitySenders.delete(slug);
    dropSummonDeclaration(e, slug);
    stopActivityRefreshIfIdle(e);
  }
}
//@ chunk-aqdf5t3e.js:10643-10745 placement
/**
 * 为 presence 连接登记一个代理活动接收端，当前活动中时立即发送并启动刷新。
 */
function addAgentActivitySink(e, n, r) {
  if (e.disposed) return;
  subscribeActivity(e);
  e.agentActivitySinks.set(n, r);
  if (shouldSendActivityNow(e)) {
    sendAgentActivity(e, r, ACTIVITY_BUSY_SECONDS);
    startActivityRefresh(e);
  }
}
//@ chunk-aqdf5t3e.js:10745-10836 placement
function removeAgentActivitySink(e, n, r) {
  if (e.agentActivitySinks.get(n) === r) {
    e.agentActivitySinks.delete(n);
    stopActivityRefreshIfIdle(e);
  }
}
//@ chunk-aqdf5t3e.js:10836-10859 placement
var FRAME_SYNC_V1 = "frame-sync.v1";
//@ chunk-aqdf5t3e.js:10859-11075 placement
/**
 * 构造 artifact 同步 WebSocket 地址 /api/frame/sync?slug=…，可加评论提示与版本通知参数。
 */
function getSyncSocketUrl(slug, n) {
  let r = new URL("/api/frame/sync", getBaseApiUrl());
  r.searchParams.set("slug", slug);
  if (n?.commentHint === true) r.searchParams.set("comment_hint", "1");
  if (n?.versionNotices === true) r.searchParams.set("vn", PASSIVE);
  return toWebSocketUrl(r);
}
//@ chunk-aqdf5t3e.js:11075-11138 placement
var CAP_TOKEN_RE = /^(?=.{1,1024}$)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){5}$/;
//@ chunk-aqdf5t3e.js:11138-11250 placement
/**
 * 判断能力令牌是否属于 agent 角色（第三段解码后的角色以 _agent 结尾）。
 */
function isAgentCapToken(e) {
  if (!CAP_TOKEN_RE.test(e)) return false;
  let n = e.split(".", 4)[2];
  return n !== undefined && parseRoleWithId(n).role.endsWith("_agent");
}
//@ chunk-aqdf5t3e.js:11250-11260 placement
var CAP_TOKEN_ROLE_TAIL_CHARS = 28;
//@ chunk-aqdf5t3e.js:11260-11414 placement
function parseRoleWithId(e) {
  let n = e.length - CAP_TOKEN_ROLE_TAIL_CHARS;
  if (n <= 0 || e.slice(n, n + 4) !== "_id_")
    return {
      role: e,
    };
  let sliced = e.slice(n + 4);
  return SESSION_ID_SHORT_RE.test(sliced)
    ? {
        role: e.slice(0, n),
        id: sliced,
      }
    : {
        role: "",
      };
}
//@ chunk-aqdf5t3e.js:11414-11561 placement
/**
 * 从能力令牌第五段取出序号（1–12 位正整数），非法返回 undefined。
 */
function getCapTokenSeq(e) {
  let n = e.split(".", 6)[4];
  if (n === undefined || !/^[0-9]{1,12}$/.test(n)) return;
  let r = Number(n);
  return Number.isSafeInteger(r) && r > 0 ? r : undefined;
}
//@ chunk-aqdf5t3e.js:11561-11633 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-aqdf5t3e.js:11633-11875 placement
/**
 * 从能力令牌前两段解析所有者：base64url 编码的账号 uuid（需规范往返一致）与组织 uuid。
 */
function parseCapTokenOwner(e) {
  let [n, r] = e.split(".", 3);
  if (n === undefined || r === undefined || r === "") return;
  let str = Buffer.from(n, "base64url").toString("utf8");
  if (!UUID_RE.test(str) || Buffer.from(str, "utf8").toString("base64url") !== n) return;
  return {
    accountUuid: str,
    organizationUuid: r,
  };
}
//@ chunk-aqdf5t3e.js:11875-12236 placement
/**
 * presence 协议常量与控制消息 schema：boot 请求错误码、令牌刷新被拒（谱系过期）与加入被拒原因、默认关闭事件、事件信封、令牌刷新与拒绝原因。
 */
var PRESENCE_TOKEN_MIN_TTL_MS = 60000;
var BOOT_REQUEST_ERROR = "boot_request_error";
var TOKEN_LINEAGE_EXPIRED = "TOKEN_REFRESH_DECLINED_REASON_LINEAGE_EXPIRED";
var JOIN_DENIED_REASON_DENIED = "JOIN_DENIED_REASON_DENIED";
var JOIN_DENIED_REASON_CAP_INVALID = "JOIN_DENIED_REASON_CAP_INVALID";
var DEFAULT_CLOSE_EVENT = {
  on: "socket",
  detail: "4503",
  opened: true,
  uptimeMs: 0,
  ageMs: 0,
};
var PRESENCE_EVENT_SCHEMA = DoctorLazy(() =>
  u({
    kind: string(),
    slug: string().optional(),
    actor: string().optional(),
    payload: unknown().optional(),
  }),
);
var TOKEN_REFRESH_SCHEMA = DoctorLazy(() =>
  u({
    cap: string(),
    exp: E(),
  }),
);
var DECLINE_REASON_SCHEMA = DoctorLazy(() =>
  u({
    reason: string(),
  }),
);
//@ chunk-aqdf5t3e.js:12236-12306 placement
function activityFrame(slug, busyS) {
  return jsonStringify({
    kind: "activity",
    slug,
    payload: {
      busyS,
    },
  });
}
//@ chunk-aqdf5t3e.js:12306-12444 placement
/**
 * 判断是否跳过 artifact 在线状态连接：远程会话、控制面覆盖或 WebSocket 出站被拒时返回原因。
 */
function getPresenceSkipReason(e) {
  if (env.CLAUDE_CODE_REMOTE) return "remote";
  if (isBaseApiCpOverride()) return "cp_override";
  if (wsEgressDenyReason(getSyncSocketUrl(e)) !== null) return "egress_denied";
  return null;
}
//@ chunk-aqdf5t3e.js:12444-13644 placement
async function bootPresenceSocket(e, n) {
  let storedCap = e.storedCap;
  if (
    !e.rebootNeeded &&
    storedCap !== undefined &&
    storedCap.exp * 1000 - Date.now() > PRESENCE_TOKEN_MIN_TTL_MS
  ) {
    let w = await readFreshOauthAccountFromDisk(e.context.storageV5).catch(() => {
      return;
    });
    if (!n.isCurrent())
      return {
        outcome: "stale",
      };
    if (sameOwnerAccount(e.owner, w))
      return {
        outcome: "token",
        token: storedCap.cap,
        boot: undefined,
      };
  }
  let s;
  let now = Date.now();
  try {
    s = await fetchArtifactBootWithProbe(
      {
        slug: e.slug,
        env: claudeAiEnvironment(),
      },
      n.feature,
      e.abort.signal,
      {
        agentPeer: true,
        ...(e.bootedVersion !== undefined && {
          lean: {
            version: e.bootedVersion,
            mustCarry: (w) => "syncToken" in w,
          },
        }),
        speculative: true,
        credentials: e.context.credentials,
      },
    );
  } catch {
    s = {
      err: "boot threw",
      errorCode: BOOT_REQUEST_ERROR,
    };
  }
  if (!n.isCurrent())
    return {
      outcome: "stale",
    };
  if (s.err !== null) {
    if (isOtherOrg(s))
      return {
        outcome: "other_org",
      };
    if (isGone(s))
      return {
        outcome: "not_found",
      };
    return {
      outcome: "boot_failed",
      status: s.status,
      noAnswer: s.errorCode === BOOT_REQUEST_ERROR,
      elapsedMs: Date.now() - now,
    };
  }
  if (s.assetToken === undefined)
    return {
      outcome: "public_outside_org",
    };
  let syncToken = s.data.syncToken;
  let d =
    typeof syncToken === "string" && CAP_TOKEN_RE.test(syncToken) ? parseCapTokenOwner(syncToken) : undefined;
  if (e.owner !== undefined && d !== undefined && !sameOwnerAccount(e.owner, d))
    return {
      outcome: "owner_changed",
    };
  let b = typeof syncToken === "string" && isAgentCapToken(syncToken) ? d : undefined;
  if (typeof syncToken !== "string" || b === undefined)
    return {
      outcome: "not_admitted",
    };
  e.owner = b;
  e.rebootNeeded = false;
  e.bootedVersion = s.ver;
  storeCapToken(e, capTokenRecord(syncToken));
  return {
    outcome: "token",
    token: syncToken,
    boot: s.data,
  };
}
//@ chunk-aqdf5t3e.js:13644-13718 placement
function capTokenRecord(syncToken) {
  return {
    cap: syncToken,
    exp: getCapTokenSeq(syncToken) ?? Math.floor((Date.now() + ROUTE_ABSENT_GRACE_MS) / 1000),
  };
}
//@ chunk-aqdf5t3e.js:13718-13859 placement
function storeCapToken(e, n) {
  let now = Date.now();
  let min = Math.min(now + ROUTE_ABSENT_GRACE_MS, Math.max(now + TOKEN_MIN_GRACE_MS, n.exp * 1000));
  e.storedCap = {
    cap: n.cap,
    exp: Math.floor(min / 1000),
  };
  e.capStrikes = 0;
}
//@ chunk-aqdf5t3e.js:13859-14198 placement
/**
 * 处理 presence 控制消息：token_refresh 时校验是代理令牌且属于同一账号后保存；token_refresh_declined 且原因为谱系过期时要求重新 boot 并清除令牌。返回是否已处理。
 */
function handlePresenceControl(e, kind, payload) {
  switch (kind) {
    case "ctrl:token_refresh": {
      let s = TOKEN_REFRESH_SCHEMA().safeParse(payload);
      if (
        s.success &&
        isAgentCapToken(s.data.cap) &&
        sameOwnerAccount(e.owner, parseCapTokenOwner(s.data.cap))
      )
        storeCapToken(e, {
          cap: s.data.cap,
          exp: s.data.exp,
        });
      return true;
    }
    case "ctrl:token_refresh_declined": {
      let s = DECLINE_REASON_SCHEMA().safeParse(payload);
      if (s.success && s.data.reason === TOKEN_LINEAGE_EXPIRED) {
        e.rebootNeeded = true;
        e.storedCap = undefined;
      }
      return true;
    }
    default:
      return false;
  }
}
//@ chunk-aqdf5t3e.js:14198-14321 placement
function stopPresenceOnError(e, n, r) {
  if (n()) return;
  if (e.taskId !== undefined)
    try {
      stopMonitorWsTasks(e.taskId, e.context.taskRegistry, {
        quiet: true,
      });
    } catch {}
  r("error");
}
//@ chunk-aqdf5t3e.js:14321-14605 placement
/**
 * 关闭 presence 连接：标记停止、清除令牌、中止请求、取消重连定时器、置为 closed，并停掉对应的监听任务。
 */
function closePresence(conn) {
  conn.stopped = true;
  conn.storedCap = undefined;
  conn.abort.abort();
  if (conn.reconnectTimer !== undefined) {
    clearTimeout(conn.reconnectTimer);
    conn.reconnectTimer = undefined;
  }
  conn.send = undefined;
  conn.state = "closed";
  if (conn.taskId !== undefined) {
    let taskId = conn.taskId;
    conn.taskId = undefined;
    try {
      stopMonitorWsTasks(taskId, conn.context.taskRegistry, {
        quiet: true,
      });
    } catch {}
  }
}
//@ chunk-aqdf5t3e.js:14605-14616 placement
var SERVICE_UNAVAILABLE_STATUS = 404;
//@ chunk-aqdf5t3e.js:14616-14681 placement
function isRefusalCloseCode(detail) {
  let n = Number(detail);
  return n === 1008 || (n >= 4000 && n <= 4999);
}
//@ chunk-aqdf5t3e.js:14681-15302 placement
/**
 * 把 presence 连接失败归类：revoked（吊销）、refused（被拒）、unavailable（服务不可用/停顿）、dropped（普通断开），依据拨号错误、boot 状态与 socket 关闭码/运行时长。
 */
function classifyPresenceFailure(conn, event, timing) {
  switch (event.on) {
    case "dial_error":
      return event.deterministic ? "refused" : "dropped";
    case "boot":
      if (isRetryableStatus(event.status)) return "unavailable";
      if (event.noAnswer) return event.elapsedMs >= timing.stallThresholdMs ? "unavailable" : "dropped";
      return "refused";
    case "socket": {
      if (event.detail === ROUTE_ABSENT_4403) return "revoked";
      if (event.opened) {
        if (event.uptimeMs >= timing.stallThresholdMs) return "dropped";
        if (event.detail === ROUTE_ABSENT_4503 && !conn.rebootNeeded) return "unavailable";
        return isRefusalCloseCode(event.detail) ? "refused" : "dropped";
      }
      let upgradeRejection = parseUpgradeRejection(event.detail);
      if (upgradeRejection !== null)
        return isRetryableStatus(upgradeRejection.status) ||
          upgradeRejection.cfMitigated ||
          upgradeRejection.status === SERVICE_UNAVAILABLE_STATUS
          ? "unavailable"
          : "refused";
      return event.detail === HANDSHAKE_TIMEOUT || event.ageMs >= timing.stallThresholdMs
        ? "unavailable"
        : "dropped";
    }
  }
}
//@ chunk-aqdf5t3e.js:15302-15373 placement
function isTerminalPresenceFailure(conn, event, timing) {
  let s = classifyPresenceFailure(conn, event, timing);
  return s === "refused" || s === "revoked";
}
//@ chunk-aqdf5t3e.js:15373-16392 placement
/**
 * 根据失败类别决定 presence 下一步：吊销或连续被拒过多则结束；不可用时进入停顿退避；否则按指数退避（带抖动）重拨；同时维护令牌失效计数、拒绝计数与退避等级。
 */
function nextPresenceAction(conn, timing, event) {
  let kind = classifyPresenceFailure(conn, event, timing);
  if (kind === "revoked" || kind === "refused") conn.storedCap = undefined;
  else if (kind === "dropped" && event.on !== "boot" && conn.storedCap !== undefined) {
    let a = event.on === "socket" && event.opened && event.uptimeMs >= timing.minUptimeMs;
    conn.capStrikes = a ? 0 : conn.capStrikes + 1;
    if (conn.capStrikes >= MAX_REALTIME_TOKEN_ATTEMPTS) conn.storedCap = undefined;
  }
  if (kind === "revoked")
    return {
      next: "end",
      reason: "revoked",
    };
  if (kind === "unavailable") {
    let a = conn.stalledSince === undefined;
    if (a) {
      conn.stalledSince = Date.now();
      conn.stalls = 0;
    }
    let min = Math.min(timing.stallMinMs * 2 ** conn.stalls, timing.stallMaxMs / 2);
    let min_2 = Math.min(min * 2, timing.stallMaxMs);
    conn.stalls++;
    return {
      next: "redial",
      delayMs: Math.round(min + Math.random() * (min_2 - min)),
      stalled: true,
      stallRunStarted: a,
    };
  }
  conn.stalledSince = undefined;
  if (kind === "refused") {
    conn.refusals++;
    if (conn.refusals > timing.maxConsecutiveRefusals)
      return {
        next: "end",
        reason: "refused",
      };
  }
  if (event.on === "socket" && event.opened) {
    if (event.uptimeMs >= timing.stallThresholdMs) conn.refusals = 0;
    if (event.uptimeMs >= timing.minUptimeMs) conn.backoff = 0;
  }
  let min = Math.min(timing.capMs, timing.baseMs * 2 ** Math.min(conn.backoff, 5));
  conn.backoff++;
  return {
    next: "redial",
    delayMs: Math.round(Math.random() * min),
    stalled: false,
    stallRunStarted: false,
  };
}
//@ chunk-aqdf5t3e.js:16392-16553 placement
/**
 * 关闭在线状态连接并安排重连定时器（清除旧定时器，不阻止进程退出）。
 */
function scheduleReconnect(e, n, reconnectPresence) {
  if (e.reconnectTimer !== undefined) clearTimeout(e.reconnectTimer);
  e.state = "closed";
  e.reconnectTimer = setTimeout(reconnectSoon, n, e, reconnectPresence);
  e.reconnectTimer.unref?.();
}
//@ chunk-aqdf5t3e.js:16553-16599 placement
function reconnectSoon(e, n) {
  e.reconnectTimer = undefined;
  n(e);
}
//@ chunk-aqdf5t3e.js:16599-18022 placement
async function connectPresenceSocket(e, n, r, s) {
  let { slug } = e;
  let { live } = getLiveState();
  let d = false;
  let b = false;
  let w;
  let S;
  let R = () => b || !s();
  let now = Date.now();
  let G = () => (d && e.openedAt > 0 ? Date.now() - e.openedAt : 0);
  let L = (y) => {
    if (R()) return;
    b = true;
    let uptimeMs = G();
    let ageMs = Date.now() - now;
    if (e.send === w) {
      e.send = undefined;
      e.state = "closed";
      e.openedAt = 0;
    }
    r.onEnded(y, {
      opened: d,
      uptimeMs,
      ageMs,
    });
  };
  try {
    let y = await runWebSocketMonitor(
      {
        ws: {
          url: getSyncSocketUrl(slug, {
            versionNotices: true,
          }),
          protocols: [FRAME_SYNC_V1, n],
        },
        headers: {
          "User-Agent": getUserAgent(),
        },
        description: r.description,
        timeout_ms: 0,
        persistent: true,
        quietLifecycle: true,
        ambient: true,
        handshakeDeadlineMs: r.handshakeDeadlineMs,
        ...(e.taskId !== undefined && {
          reuseTaskId: e.taskId,
        }),
        transform: (T) => {
          r.onFrame(T);
          return null;
        },
        keepalive: r.keepalive,
        onSender: (T) => {
          if (R()) return;
          w = T;
          e.send = T;
          e.state = "open";
          S = (busyS) => T(activityFrame(slug, busyS));
          addAgentActivitySink(live, r.activitySinkKey, S);
        },
        onSenderClosed: () => {
          if (S !== undefined) removeAgentActivitySink(live, r.activitySinkKey, S);
          if (w !== undefined && e.send === w) {
            e.send = undefined;
            if (e.state === "open") e.state = "closed";
          }
          if (R()) return;
          let taskId = e.taskId;
          let P = taskId === undefined ? undefined : e.context.taskRegistry.all()[taskId];
          if (taskId !== undefined && P?.status !== "running") {
            L("task_ended");
            return;
          }
          setTimeout(stopPresenceOnError, 0, e, R, L).unref?.();
        },
        onLifecycle: (T, P) => {
          if (R()) return;
          if (T === "open") {
            d = true;
            e.everOpened = true;
            e.openedAt = Date.now();
            r.onOpen();
            return;
          }
          L(P);
        },
      },
      e.context,
    );
    e.taskId = y.data.taskId;
    if (!s()) {
      stopMonitorWsTasks(y.data.taskId, e.context.taskRegistry, {
        quiet: true,
      });
      return {
        outcome: "stale",
      };
    }
    return {
      outcome: "armed",
    };
  } catch (error) {
    logForDebugging(
      `[${r.label}] connect failed slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
    );
    return {
      outcome: "error",
      error,
    };
  }
}
export {
  hasWaitingFor,
  setWaitingFor,
  waitingFor,
  subscribeWaiting,
  PRESENCE_EVENT_SCHEMA,
  TOKEN_REFRESH_SCHEMA,
  isAgentCapToken,
  DECLINE_REASON_SCHEMA,
  TOKEN_LINEAGE_EXPIRED,
  parseCapTokenOwner,
  getCapTokenSeq,
  getSyncSocketUrl,
  FRAME_SYNC_V1,
  activityFrame,
  addAgentActivitySink,
  addActivitySender,
  removeAgentActivitySink,
  removeActivitySender,
  getPresenceSkipReason,
  scheduleReconnect,
  bootPresenceSocket,
  isTerminalPresenceFailure,
  connectPresenceSocket,
  DEFAULT_CLOSE_EVENT,
  nextPresenceAction,
  closePresence,
  handlePresenceControl,
  JOIN_DENIED_REASON_DENIED,
  JOIN_DENIED_REASON_CAP_INVALID,
};
