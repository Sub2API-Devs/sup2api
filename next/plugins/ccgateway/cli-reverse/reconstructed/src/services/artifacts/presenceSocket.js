/**
 * services/artifacts/presenceSocket.ts
 *
 * Artifact presence 连接（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsrpnscb.js (46)
 * attribution: placement 46
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { presenceStores, isWorking } from "./artifactPresence.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getRipgrepStatus_2 } from "../../utils/ripgrep.js";
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
import { objectSchema, stringSchema, unknown, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { wsEgressDenyReason } from "../../tools/MonitorTool/MonitorTool.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { sameOwnerAccount } from "../../utils/auth.js";
import { fetchBoot } from "./boot.js";
import { isArtifactInOtherOrg, isArtifactGone } from "./orgScope.js";
import {
  ROUTE_ABSENT_GRACE_MS,
  TOKEN_MIN_GRACE_MS,
  ROUTE_ABSENT_4403,
  ROUTE_ABSENT_4503,
  MAX_REALTIME_TOKEN_ATTEMPTS,
} from "./artifactNotices.js";
import { stopMonitorWsTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { isUnavailableStatus } from "./liveSubscribe.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { getUserAgent } from "../../utils/http.js";
import { logForDebugging } from "../../utils/debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tsrpnscb.js:8657-8744 placement
/**
 * 导出函数 `setWaitingFor`：参数 e, n。
 */
function setWaitingFor(session, waitingFor) {
  presenceStores.of(session).userPrompt.setState((state) =>
    state.waitingFor === waitingFor
      ? state
      : {
          waitingFor,
        },
  );
}
//@ chunk-tsrpnscb.js:8744-8783 placement
/**
 * 导出函数 `hasWaitingFor`：参数 e，返回 oRo(e) !== void 0。
 */
function hasWaitingFor(session) {
  return waitingFor(session) !== undefined;
}
//@ chunk-tsrpnscb.js:8783-8848 placement
/**
 * 导出函数 `waitingFor`：参数 e，返回 ve.of(e).userPrompt.getState().waitingFor。
 */
function waitingFor(session) {
  return presenceStores.of(session).userPrompt.getState().waitingFor;
}
//@ chunk-tsrpnscb.js:8848-8906 placement
/**
 * 导出函数 `subscribeWaiting`：参数 e, n，返回 ve.of(e).userPrompt.subscribe(n)。
 */
function subscribeWaiting(session, listener) {
  return presenceStores.of(session).userPrompt.subscribe(listener);
}
//@ chunk-tsrpnscb.js:8906-8943 placement
var ACTIVITY_BUSY_SECONDS = 120;
var ACTIVITY_BUSY_PREFIX = `act:${ACTIVITY_BUSY_SECONDS}`;
var ACTIVITY_IDLE = "act:0";
//@ chunk-tsrpnscb.js:8943-9035 placement
function noteActivityOk(session) {
  if (!session.activityOkReported) {
    session.activityOkReported = true;
    logFeatureOk("artifact_activity_emit");
  }
}
//@ chunk-tsrpnscb.js:9035-9065 placement
function sendActivityFrame(session, send, frame) {
  send(frame);
  noteActivityOk(session);
}
//@ chunk-tsrpnscb.js:9065-9095 placement
function sendAgentActivity(session, send, frame) {
  send(frame);
  noteActivityOk(session);
}
//@ chunk-tsrpnscb.js:9095-9226 placement
function broadcastActivityState(session, busy) {
  for (let activitySender of session.activitySenders.values())
    sendActivityFrame(session, activitySender, busy ? ACTIVITY_BUSY_PREFIX : ACTIVITY_IDLE);
  for (let agentActivitySink of session.agentActivitySinks.values())
    sendAgentActivity(session, agentActivitySink, busy ? ACTIVITY_BUSY_SECONDS : 0);
}
//@ chunk-tsrpnscb.js:9226-9297 placement
function activitySinkCount(session) {
  return session.activitySenders.size + session.agentActivitySinks.size;
}
//@ chunk-tsrpnscb.js:9297-9479 placement
function startActivityRefresh(session) {
  if (activitySinkCount(session) === 0) return;
  if (session.activityRefreshTimer !== undefined) return;
  session.activityRefreshTimer = setInterval(
    (session) => broadcastActivityState(session, true),
    session.activityRefreshMs,
    session,
  );
  session.activityRefreshTimer.unref?.();
}
//@ chunk-tsrpnscb.js:9479-9608 placement
function stopActivityRefreshIfIdle(session) {
  if (activitySinkCount(session) === 0 && session.activityRefreshTimer !== undefined) {
    clearInterval(session.activityRefreshTimer);
    session.activityRefreshTimer = undefined;
  }
}
//@ chunk-tsrpnscb.js:9608-10228 placement
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
      (session) => {
        session.activityOnsetTimer = undefined;
        broadcastActivityState(session, true);
        startActivityRefresh(session);
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
      (session) => {
        session.activityClearTimer = undefined;
        if (session.activityRefreshTimer !== undefined) {
          clearInterval(session.activityRefreshTimer);
          session.activityRefreshTimer = undefined;
        }
        broadcastActivityState(session, false);
      },
      presence.activityEdgeDebounceMs,
      presence,
    );
    presence.activityClearTimer.unref?.();
  }
}
//@ chunk-tsrpnscb.js:10228-10253 placement
function rootSession() {
  return getRootSession();
}
//@ chunk-tsrpnscb.js:10253-10387 placement
function subscribeActivity(presence) {
  if (presence.activityUnsubscribe !== undefined) return;
  let root = rootSession();
  presence.activityUnsubscribe = getRipgrepStatus_2(root, () => {
    try {
      onActivityEdge(presence, isWorking(root));
    } catch (error) {
      logError(error);
    }
  });
}
//@ chunk-tsrpnscb.js:10387-10481 placement
function shouldSendActivityNow(session) {
  return (
    (isWorking(rootSession()) && session.activityOnsetTimer === undefined) ||
    session.activityClearTimer !== undefined
  );
}
//@ chunk-tsrpnscb.js:10481-10589 placement
/**
 * 为 presence 连接登记一个活动状态发送端（并撤销该 slug 的召唤声明），当前活动中时立即发送并启动刷新。
 */
function addActivitySender(session, slug, sender) {
  if (session.disposed) return;
  subscribeActivity(session);
  session.activitySenders.set(slug, sender);
  undeclareSummon(session, slug);
  if (shouldSendActivityNow(session)) {
    sendActivityFrame(session, sender, ACTIVITY_BUSY_PREFIX);
    startActivityRefresh(session);
  }
}
//@ chunk-tsrpnscb.js:10589-10683 placement
function removeActivitySender(session, slug, sender) {
  if (session.activitySenders.get(slug) === sender) {
    session.activitySenders.delete(slug);
    dropSummonDeclaration(session, slug);
    stopActivityRefreshIfIdle(session);
  }
}
//@ chunk-tsrpnscb.js:10683-10785 placement
/**
 * 为 presence 连接登记一个代理活动接收端，当前活动中时立即发送并启动刷新。
 */
function addAgentActivitySink(session, sinkId, sink) {
  if (session.disposed) return;
  subscribeActivity(session);
  session.agentActivitySinks.set(sinkId, sink);
  if (shouldSendActivityNow(session)) {
    sendAgentActivity(session, sink, ACTIVITY_BUSY_SECONDS);
    startActivityRefresh(session);
  }
}
//@ chunk-tsrpnscb.js:10785-10876 placement
function removeAgentActivitySink(session, sinkId, sink) {
  if (session.agentActivitySinks.get(sinkId) === sink) {
    session.agentActivitySinks.delete(sinkId);
    stopActivityRefreshIfIdle(session);
  }
}
//@ chunk-tsrpnscb.js:10876-10899 placement
var FRAME_SYNC_V1 = "frame-sync.v1";
//@ chunk-tsrpnscb.js:10899-11115 placement
/**
 * 构造 artifact 同步 WebSocket 地址 /api/frame/sync?slug=…，可加评论提示与版本通知参数。
 */
function getSyncSocketUrl(slug, options) {
  let url = new URL("/api/frame/sync", getBaseApiUrl());
  url.searchParams.set("slug", slug);
  if (options?.commentHint === true) url.searchParams.set("comment_hint", "1");
  if (options?.versionNotices === true) url.searchParams.set("vn", PASSIVE);
  return toWebSocketUrl(url);
}
//@ chunk-tsrpnscb.js:11115-11178 placement
var CAP_TOKEN_RE = /^(?=.{1,1024}$)[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){5}$/;
//@ chunk-tsrpnscb.js:11178-11290 placement
/**
 * 判断能力令牌是否属于 agent 角色（第三段解码后的角色以 _agent 结尾）。
 */
function isAgentCapToken(token) {
  if (!CAP_TOKEN_RE.test(token)) return false;
  let rolePart = token.split(".", 4)[2];
  return rolePart !== undefined && parseRoleWithId(rolePart).role.endsWith("_agent");
}
//@ chunk-tsrpnscb.js:11290-11300 placement
var CAP_TOKEN_ROLE_TAIL_CHARS = 28;
//@ chunk-tsrpnscb.js:11300-11454 placement
function parseRoleWithId(role) {
  let tailStart = role.length - CAP_TOKEN_ROLE_TAIL_CHARS;
  if (tailStart <= 0 || role.slice(tailStart, tailStart + 4) !== "_id_")
    return {
      role,
    };
  let sliced = role.slice(tailStart + 4);
  return SESSION_ID_SHORT_RE.test(sliced)
    ? {
        role: role.slice(0, tailStart),
        id: sliced,
      }
    : {
        role: "",
      };
}
//@ chunk-tsrpnscb.js:11454-11601 placement
/**
 * 从能力令牌第五段取出序号（1–12 位正整数），非法返回 undefined。
 */
function getCapTokenSeq(token) {
  let seqPart = token.split(".", 6)[4];
  if (seqPart === undefined || !/^[0-9]{1,12}$/.test(seqPart)) return;
  let seq = Number(seqPart);
  return Number.isSafeInteger(seq) && seq > 0 ? seq : undefined;
}
//@ chunk-tsrpnscb.js:11601-11673 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-tsrpnscb.js:11673-11915 placement
/**
 * 从能力令牌前两段解析所有者：base64url 编码的账号 uuid（需规范往返一致）与组织 uuid。
 */
function parseCapTokenOwner(token) {
  let [owner, id] = token.split(".", 3);
  if (owner === undefined || id === undefined || id === "") return;
  let str = Buffer.from(owner, "base64url").toString("utf8");
  if (!UUID_RE.test(str) || Buffer.from(str, "utf8").toString("base64url") !== owner) return;
  return {
    accountUuid: str,
    organizationUuid: id,
  };
}
//@ chunk-tsrpnscb.js:11915-12276 placement
/**
 * presence 协议常量与控制消息 schema：boot 请求错误码、令牌刷新被拒（谱系过期）与加入被拒原因、默认关闭事件、事件信封、令牌刷新与拒绝原因。
 */
var PRESENCE_TOKEN_MIN_TTL_MS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BOOT_REQUEST_ERROR;
var TOKEN_LINEAGE_EXPIRED;
var JOIN_DENIED_REASON_DENIED;
var JOIN_DENIED_REASON_CAP_INVALID;
var DEFAULT_CLOSE_EVENT;
var PRESENCE_EVENT_SCHEMA;
var TOKEN_REFRESH_SCHEMA;
var DECLINE_REASON_SCHEMA;
deferInit("chunk-tsrpnscb.js:11915", () => {
  PRESENCE_TOKEN_MIN_TTL_MS = 60000;
  BOOT_REQUEST_ERROR = "boot_request_error";
  TOKEN_LINEAGE_EXPIRED = "TOKEN_REFRESH_DECLINED_REASON_LINEAGE_EXPIRED";
  JOIN_DENIED_REASON_DENIED = "JOIN_DENIED_REASON_DENIED";
  JOIN_DENIED_REASON_CAP_INVALID = "JOIN_DENIED_REASON_CAP_INVALID";
  DEFAULT_CLOSE_EVENT = {
    on: "socket",
    detail: "4503",
    opened: true,
    uptimeMs: 0,
    ageMs: 0,
  };
  PRESENCE_EVENT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      kind: stringSchema(),
      slug: stringSchema().optional(),
      actor: stringSchema().optional(),
      payload: unknown().optional(),
    }),
  );
  TOKEN_REFRESH_SCHEMA = DoctorLazy(() =>
    objectSchema({
      cap: stringSchema(),
      exp: numberSchema(),
    }),
  );
  DECLINE_REASON_SCHEMA = DoctorLazy(() =>
    objectSchema({
      reason: stringSchema(),
    }),
  );
});
//@ chunk-tsrpnscb.js:12276-12346 placement
function activityFrame(slug, busyS) {
  return jsonStringify({
    kind: "activity",
    slug,
    payload: {
      busyS,
    },
  });
}
//@ chunk-tsrpnscb.js:12346-12484 placement
/**
 * 判断是否跳过 artifact 在线状态连接：远程会话、控制面覆盖或 WebSocket 出站被拒时返回原因。
 */
function getPresenceSkipReason(session) {
  if (env.CLAUDE_CODE_REMOTE) return "remote";
  if (isBaseApiCpOverride()) return "cp_override";
  if (wsEgressDenyReason(getSyncSocketUrl(session)) !== null) return "egress_denied";
  return null;
}
//@ chunk-tsrpnscb.js:12484-13684 placement
async function bootPresenceSocket(session, guard) {
  let storedCap = session.storedCap;
  if (
    !session.rebootNeeded &&
    storedCap !== undefined &&
    storedCap.exp * 1000 - Date.now() > PRESENCE_TOKEN_MIN_TTL_MS
  ) {
    let storedAccount = await readFreshOauthAccountFromDisk(session.context.storageV5).catch(() => {
      return;
    });
    if (!guard.isCurrent())
      return {
        outcome: "stale",
      };
    if (sameOwnerAccount(session.owner, storedAccount))
      return {
        outcome: "token",
        token: storedCap.cap,
        boot: undefined,
      };
  }
  let booted;
  let now = Date.now();
  try {
    booted = await fetchBoot(
      {
        slug: session.slug,
        env: claudeAiEnvironment(),
      },
      guard.feature,
      session.abort.signal,
      {
        agentPeer: true,
        ...(session.bootedVersion !== undefined && {
          lean: {
            version: session.bootedVersion,
            mustCarry: (msg) => "syncToken" in msg,
          },
        }),
        speculative: true,
        credentials: session.context.credentials,
      },
    );
  } catch {
    booted = {
      err: "boot threw",
      errorCode: BOOT_REQUEST_ERROR,
    };
  }
  if (!guard.isCurrent())
    return {
      outcome: "stale",
    };
  if (booted.err !== null) {
    if (isArtifactInOtherOrg(booted))
      return {
        outcome: "other_org",
      };
    if (isArtifactGone(booted))
      return {
        outcome: "not_found",
      };
    return {
      outcome: "boot_failed",
      status: booted.status,
      noAnswer: booted.errorCode === BOOT_REQUEST_ERROR,
      elapsedMs: Date.now() - now,
    };
  }
  if (booted.assetToken === undefined)
    return {
      outcome: "public_outside_org",
    };
  let syncToken = booted.data.syncToken;
  let syncCap =
    typeof syncToken === "string" && CAP_TOKEN_RE.test(syncToken) ? parseCapTokenOwner(syncToken) : undefined;
  if (session.owner !== undefined && syncCap !== undefined && !sameOwnerAccount(session.owner, syncCap))
    return {
      outcome: "owner_changed",
    };
  let cap = typeof syncToken === "string" && isAgentCapToken(syncToken) ? syncCap : undefined;
  if (typeof syncToken !== "string" || cap === undefined)
    return {
      outcome: "not_admitted",
    };
  session.owner = cap;
  session.rebootNeeded = false;
  session.bootedVersion = booted.ver;
  storeCapToken(session, capTokenRecord(syncToken));
  return {
    outcome: "token",
    token: syncToken,
    boot: booted.data,
  };
}
//@ chunk-tsrpnscb.js:13684-13758 placement
function capTokenRecord(token) {
  return {
    cap: token,
    exp: getCapTokenSeq(token) ?? Math.floor((Date.now() + ROUTE_ABSENT_GRACE_MS) / 1000),
  };
}
//@ chunk-tsrpnscb.js:13758-13899 placement
function storeCapToken(session, token) {
  let now = Date.now();
  let min = Math.min(now + ROUTE_ABSENT_GRACE_MS, Math.max(now + TOKEN_MIN_GRACE_MS, token.exp * 1000));
  session.storedCap = {
    cap: token.cap,
    exp: Math.floor(min / 1000),
  };
  session.capStrikes = 0;
}
//@ chunk-tsrpnscb.js:13899-14238 placement
/**
 * 处理 presence 控制消息：token_refresh 时校验是代理令牌且属于同一账号后保存；token_refresh_declined 且原因为谱系过期时要求重新 boot 并清除令牌。返回是否已处理。
 */
function handlePresenceControl(session, kind, payload) {
  switch (kind) {
    case "ctrl:token_refresh": {
      let refresh = TOKEN_REFRESH_SCHEMA().safeParse(payload);
      if (
        refresh.success &&
        isAgentCapToken(refresh.data.cap) &&
        sameOwnerAccount(session.owner, parseCapTokenOwner(refresh.data.cap))
      )
        storeCapToken(session, {
          cap: refresh.data.cap,
          exp: refresh.data.exp,
        });
      return true;
    }
    case "ctrl:token_refresh_declined": {
      let decline = DECLINE_REASON_SCHEMA().safeParse(payload);
      if (decline.success && decline.data.reason === TOKEN_LINEAGE_EXPIRED) {
        session.rebootNeeded = true;
        session.storedCap = undefined;
      }
      return true;
    }
    default:
      return false;
  }
}
//@ chunk-tsrpnscb.js:14238-14361 placement
function stopPresenceOnError(session, shouldIgnore, error) {
  if (shouldIgnore()) return;
  if (session.taskId !== undefined)
    try {
      stopMonitorWsTasks(session.taskId, session.context.taskRegistry, {
        quiet: true,
      });
    } catch {}
  error("error");
}
//@ chunk-tsrpnscb.js:14361-14645 placement
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
//@ chunk-tsrpnscb.js:14645-14656 placement
var SERVICE_UNAVAILABLE_STATUS = 404;
//@ chunk-tsrpnscb.js:14656-14721 placement
function isRefusalCloseCode(detail) {
  let code = Number(detail);
  return code === 1008 || (code >= 4000 && code <= 4999);
}
//@ chunk-tsrpnscb.js:14721-15342 placement
/**
 * 把 presence 连接失败归类：revoked（吊销）、refused（被拒）、unavailable（服务不可用/停顿）、dropped（普通断开），依据拨号错误、boot 状态与 socket 关闭码/运行时长。
 */
function classifyPresenceFailure(conn, event, timing) {
  switch (event.on) {
    case "dial_error":
      return event.deterministic ? "refused" : "dropped";
    case "boot":
      if (isUnavailableStatus(event.status)) return "unavailable";
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
        return isUnavailableStatus(upgradeRejection.status) ||
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
//@ chunk-tsrpnscb.js:15342-15413 placement
function isTerminalPresenceFailure(conn, event, timing) {
  let failure = classifyPresenceFailure(conn, event, timing);
  return failure === "refused" || failure === "revoked";
}
//@ chunk-tsrpnscb.js:15413-16432 placement
/**
 * 根据失败类别决定 presence 下一步：吊销或连续被拒过多则结束；不可用时进入停顿退避；否则按指数退避（带抖动）重拨；同时维护令牌失效计数、拒绝计数与退避等级。
 */
function nextPresenceAction(conn, timing, event) {
  let kind = classifyPresenceFailure(conn, event, timing);
  if (kind === "revoked" || kind === "refused") conn.storedCap = undefined;
  else if (kind === "dropped" && event.on !== "boot" && conn.storedCap !== undefined) {
    let openedOk = event.on === "socket" && event.opened && event.uptimeMs >= timing.minUptimeMs;
    conn.capStrikes = openedOk ? 0 : conn.capStrikes + 1;
    if (conn.capStrikes >= MAX_REALTIME_TOKEN_ATTEMPTS) conn.storedCap = undefined;
  }
  if (kind === "revoked")
    return {
      next: "end",
      reason: "revoked",
    };
  if (kind === "unavailable") {
    let notStalled = conn.stalledSince === undefined;
    if (notStalled) {
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
      stallRunStarted: notStalled,
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
//@ chunk-tsrpnscb.js:16432-16593 placement
/**
 * 关闭在线状态连接并安排重连定时器（清除旧定时器，不阻止进程退出）。
 */
function scheduleReconnect(session, timing, reconnectPresence) {
  if (session.reconnectTimer !== undefined) clearTimeout(session.reconnectTimer);
  session.state = "closed";
  session.reconnectTimer = setTimeout(reconnectSoon, timing, session, reconnectPresence);
  session.reconnectTimer.unref?.();
}
//@ chunk-tsrpnscb.js:16593-16639 placement
function reconnectSoon(session, timing) {
  session.reconnectTimer = undefined;
  timing(session);
}
//@ chunk-tsrpnscb.js:16639-18062 placement
async function connectPresenceSocket(options, handlers, socketHandlers, isStale) {
  let { slug } = options;
  let { live } = getLiveState();
  let everOpenedLocal = false;
  let ended = false;
  let currentSender;
  let activitySink;
  let isDone = () => ended || !isStale();
  let now = Date.now();
  let uptimeMs = () => (everOpenedLocal && options.openedAt > 0 ? Date.now() - options.openedAt : 0);
  let endOnce = (reason) => {
    if (isDone()) return;
    ended = true;
    let uptimeMs_2 = uptimeMs();
    let ageMs = Date.now() - now;
    if (options.send === currentSender) {
      options.send = undefined;
      options.state = "closed";
      options.openedAt = 0;
    }
    socketHandlers.onEnded(reason, {
      opened: everOpenedLocal,
      uptimeMs: uptimeMs_2,
      ageMs,
    });
  };
  try {
    let monitor = await runWebSocketMonitor(
      {
        ws: {
          url: getSyncSocketUrl(slug, {
            versionNotices: true,
          }),
          protocols: [FRAME_SYNC_V1, handlers],
        },
        headers: {
          "User-Agent": getUserAgent(),
        },
        description: socketHandlers.description,
        timeout_ms: 0,
        persistent: true,
        quietLifecycle: true,
        ambient: true,
        handshakeDeadlineMs: socketHandlers.handshakeDeadlineMs,
        ...(options.taskId !== undefined && {
          reuseTaskId: options.taskId,
        }),
        transform: (frame) => {
          socketHandlers.onFrame(frame);
          return null;
        },
        keepalive: socketHandlers.keepalive,
        onSender: (sender) => {
          if (isDone()) return;
          currentSender = sender;
          options.send = sender;
          options.state = "open";
          activitySink = (busyS) => sender(activityFrame(slug, busyS));
          addAgentActivitySink(live, socketHandlers.activitySinkKey, activitySink);
        },
        onSenderClosed: () => {
          if (activitySink !== undefined)
            removeAgentActivitySink(live, socketHandlers.activitySinkKey, activitySink);
          if (currentSender !== undefined && options.send === currentSender) {
            options.send = undefined;
            if (options.state === "open") options.state = "closed";
          }
          if (isDone()) return;
          let taskId = options.taskId;
          let task = taskId === undefined ? undefined : options.context.taskRegistry.all()[taskId];
          if (taskId !== undefined && task?.status !== "running") {
            endOnce("task_ended");
            return;
          }
          setTimeout(stopPresenceOnError, 0, options, isDone, endOnce).unref?.();
        },
        onLifecycle: (phase, detail) => {
          if (isDone()) return;
          if (phase === "open") {
            everOpenedLocal = true;
            options.everOpened = true;
            options.openedAt = Date.now();
            socketHandlers.onOpen();
            return;
          }
          endOnce(detail);
        },
      },
      options.context,
    );
    options.taskId = monitor.data.taskId;
    if (!isStale()) {
      stopMonitorWsTasks(monitor.data.taskId, options.context.taskRegistry, {
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
      `[${socketHandlers.label}] connect failed slug=${slug}: ${error instanceof Error ? error.name : "error"}`,
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
