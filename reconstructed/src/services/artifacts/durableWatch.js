/**
 * services/artifacts/durableWatch.ts
 *
 * Artifact 持久唤醒订阅（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (10), chunk-jeazk6wn.js (54), chunk-r3568h5y.js (1)
 * attribution: placement 65
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { env } from "../../utils/env.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  readCommentMonitorRegistry,
  publishDurableWatchRegistry,
  applyRemoteStops,
  setRegistrySink,
  resetRegistryPublished,
  runCommentMonitorWithIntent,
} from "./commentMonitor.js";
import { trackDurableClaudeDocSlug } from "./artifactPresence.js";
import { getEnsureConnectedClient } from "../../bootstrap/state.js";
import {
  frameVerbRelayActive,
  SUBSCRIPTIONS_RELAY_FAMILY,
  frameRelayActive,
  frameApi,
  threwOnRelayLeg,
  relayFamily,
  relayHopFailed,
} from "./frameRelay.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { isServiceAgentSession } from "../ccrAgentProxy/agentProxy.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { truncateToLength, printableText } from "../../utils/stringUtils.js";
import { callMcpTool } from "../mcp/mcpWireUtils.js";
import { buildFrameHeaders } from "./frameApi.js";
import { registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isArtifactsAvailable } from "./artifactAvailability.js";
import { denyPolicyBody } from "./publishErrors.js";
import {
  MISSED_WATCH_RELAUNCH_ADVICE,
  setWithLimit,
  MAX_CRON_OWNERSHIP_ENTRIES,
  removeCronOwnedKeys,
} from "../../utils/cronTasks.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { isCcrOriginUrl } from "../mcp/ccrMcpUrls.js";

//@ chunk-jeazk6wn.js:1024-1062 placement
function durableRows() {
  return getLiveState().durable.rows;
}
//@ chunk-jeazk6wn.js:1062-1256 placement
/**
 * 按 slug 串行执行异步操作：排在该 slug 上一个操作之后（无论成败），结束时若自己仍是队尾则清除。
 */
async function runSerializedForSlug(slug, n) {
  let slugOps = getLiveState().durable.slugOps;
  let o = (slugOps.get(slug) ?? Promise.resolve()).then(n, n);
  let u = o.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  slugOps.set(slug, u);
  try {
    return await o;
  } finally {
    if (slugOps.get(slug) === u) slugOps.delete(slug);
  }
}
//@ chunk-jeazk6wn.js:1256-1295 placement
/**
 * 导出函数 `durableRowList`：返回 [...R().values()]。
 */
function durableRowList() {
  return [...durableRows().values()];
}
//@ chunk-jeazk6wn.js:1295-1329 placement
/**
 * 导出函数 `durableRowFor`：参数 e，返回 R().get(e)。
 */
function durableRowFor(slug) {
  return durableRows().get(slug);
}
//@ chunk-jeazk6wn.js:1329-1358 placement
var WORKER_STATE_REREAD_DELAYS_MS = [30000, 120000, 600000];
//@ chunk-jeazk6wn.js:1358-1536 placement
/**
 * 远程环境下用 worker 状态恢复持久评论监听；状态读取失败时打点并按退避重读。
 */
function restoreDurableWatches(workerState, options) {
  if (!env.CLAUDE_CODE_REMOTE || workerState === null) return;
  if (workerState.readFailed) {
    logFeatureSad("artifact_durable_subscribe", "registry_unread");
    if (options.reread !== undefined) rereadWorkerState(options.reread, options);
    return;
  }
  applyRestoredRegistry(workerState, options);
}
//@ chunk-jeazk6wn.js:1536-1952 placement
/**
 * 按退避间隔重读 worker 状态以恢复持久监听：登记表通道已建立则停止；读到有效状态后恢复并打点；全部失败时打点放弃。
 */
async function rereadWorkerState(reread, options, r = WORKER_STATE_REREAD_DELAYS_MS) {
  for (let a of r) {
    await sleep(a, undefined, {
      unref: true,
    });
    if (getLiveState().durable.registrySink !== null) return true;
    let workerState;
    try {
      workerState = await reread();
    } catch (error) {
      logForDebugging(`[artifact] worker-state re-read threw: ${String(error)}`);
      continue;
    }
    if (workerState === null || workerState.readFailed) continue;
    try {
      applyRestoredRegistry(workerState, options);
    } catch (error) {
      logError(error);
      return false;
    }
    logFeatureOk("artifact_durable_subscribe", {
      registry_reread: true,
    });
    return true;
  }
  logFeatureSad("artifact_durable_subscribe", "registry_reread_failed");
  return false;
}
//@ chunk-jeazk6wn.js:1952-2773 placement
/**
 * 把上一 worker 纪元保存的持久监听登记表恢复到内存：孤立触发器、各 slug 行（已取消监听的转为孤立；有在途操作的延后恢复）、停止记录；已停止的行退役；随后重新发布登记表并打点。
 */
function applyRestoredRegistry(workerState, options) {
  let registry = readCommentMonitorRegistry(workerState.internal?.artifact_durable_watches);
  let { durable } = getLiveState();
  for (let o of registry?.orphans ?? []) durable.orphanTriggers.add(o);
  for (let o of registry?.rows ?? []) {
    if (durable.unwatchedSlugs.has(o.slug) && !durable.rows.has(o.slug)) {
      restoreRow(o);
      continue;
    }
    if (durable.slugOps.has(o.slug)) {
      durable.pendingRestoredRows.set(o.slug, o);
      trackPendingOp(
        runSerializedForSlug(o.slug, async () => {
          durable.pendingRestoredRows.delete(o.slug);
          restoreRow(o);
          publishDurableWatchRegistry();
        }),
      );
      continue;
    }
    restoreRow(o);
  }
  applyRemoteStops(registry?.stopped ?? new Map(), options);
  for (let o of new Set([
    ...durable.rows.keys(),
    ...durable.pendingRestoredRows.keys(),
    ...durable.slugOps.keys(),
  ]))
    if (durable.stopLatches.isStopped(o)) retireStoppedRow(o);
  setRegistrySink(options.sink);
  if (registry !== null) resetRegistryPublished();
  publishDurableWatchRegistry();
  if (registry !== null && registry.rows.length + registry.stopped.size > 0) {
    logFeatureOk("artifact_durable_subscribe", {
      restored_rows: registry.rows.length,
      restored_stops: registry.stopped.size,
    });
    logForDebugging(
      `[artifact] restored ${registry.rows.length} durable watch row(s) and ${registry.stopped.size} stop(s) from prior worker epoch`,
    );
  }
}
//@ chunk-jeazk6wn.js:2773-3118 placement
/**
 * 退役已停止的持久监视行：删除该行、标记为未监视并把相关触发器加入孤儿列表；若该 slug 有进行中的操作则排队执行。
 */
function retireStoppedRow(e) {
  let { durable } = getLiveState();
  let r = () => {
    let a = durable.rows.get(e);
    if (a === undefined || !durable.stopLatches.isStopped(e)) return;
    durable.rows.delete(e);
    durable.unwatchedSlugs.add(e);
    for (let o of [a.triggerId, ...(a.unreleased ?? [])]) durable.orphanTriggers.add(o);
    logFeatureSad("artifact_durable_subscribe", "restored_stop_retired_row");
  };
  if (durable.slugOps.has(e)) {
    trackPendingOp(
      runSerializedForSlug(e, async () => {
        r();
        publishDurableWatchRegistry();
      }),
    );
    return;
  }
  r();
}
//@ chunk-jeazk6wn.js:3118-3483 placement
/**
 * 恢复一条持久监听行：已有行、已取消或已停止时把其触发器记为孤立（必要时补 claudeDoc 标记），否则以 restored 写入。
 */
function restoreRow(e) {
  let { durable } = getLiveState();
  if (e.claudeDoc) trackDurableClaudeDocSlug(e.slug);
  let r = durable.rows.get(e.slug);
  if (r !== undefined || durable.unwatchedSlugs.has(e.slug) || durable.stopLatches.isStopped(e.slug)) {
    for (let a of [e.triggerId, ...(e.unreleased ?? [])])
      if (a !== r?.triggerId) durable.orphanTriggers.add(a);
    if (r !== undefined && e.claudeDoc)
      durable.rows.set(e.slug, {
        ...r,
        claudeDoc: true,
      });
    return;
  }
  durable.rows.set(e.slug, {
    ...e,
    restored: true,
  });
}
//@ chunk-jeazk6wn.js:3483-3581 placement
function connectorForUrl(config) {
  let serverUrl = getServerUrl(config);
  if (!serverUrl) return null;
  let ensureConnectedClient = getEnsureConnectedClient();
  if (!ensureConnectedClient) return null;
  return {
    found: serverUrl,
    dial: ensureConnectedClient,
  };
}
//@ chunk-jeazk6wn.js:3581-3617 placement
/**
 * 导出函数 `hasConnectorForUrl`：参数 e，返回 se(e) !== null。
 */
function hasConnectorForUrl(clients) {
  return connectorForUrl(clients) !== null;
}
//@ chunk-jeazk6wn.js:3617-3773 placement
async function dialWatchServer(clients, signal, r) {
  let a = connectorForUrl(clients);
  if (!a) return null;
  try {
    return await a.dial(
      a.found,
      r?.detachedFromUser
        ? {
            timeoutMs: 15000,
          }
        : {
            signal,
          },
    );
  } catch {
    return null;
  }
}
//@ chunk-jeazk6wn.js:3773-3863 placement
function headerFieldOf(e, n) {
  let match = new RegExp(`^${n}:\\s*(\\S+)`, "m").exec(e);
  return match && match[1] ? match[1] : null;
}
//@ chunk-jeazk6wn.js:3863-4005 placement
function parseTriggerResponse(text) {
  let n = headerFieldOf(text, "url");
  let r = headerFieldOf(text, "trigger_id");
  let a = headerFieldOf(text, "sealed_secret");
  if (!n || !r || !a) return null;
  return {
    url: n,
    triggerId: r,
    sealedSecret: a,
  };
}
//@ chunk-jeazk6wn.js:4005-4045 placement
function triggerIdOf(text) {
  return headerFieldOf(text, "trigger_id");
}
//@ chunk-jeazk6wn.js:4045-4148 placement
/**
 * 会话 webhook 触发器路径前后缀与持久监听的事件类型（全部 / 仅 published）。
 */
var WEBHOOK_TRIGGER_PATH_PREFIX = "/integrations/v1/code/webhook-triggers/";
var WEBHOOK_FIRE_SUFFIX = "/fire";
var ALL_WATCH_EVENTS = ["published", "comment"];
var PUBLISH_ONLY_EVENTS = ["published"];
//@ chunk-jeazk6wn.js:4148-4209 placement
/**
 * 导出函数 `localDurableWatchRefusal`：返回 env.CLAUDE_CODE_REMOTE ? null : "not_remote"。
 */
function localDurableWatchRefusal() {
  return env.CLAUDE_CODE_REMOTE ? null : "not_remote";
}
//@ chunk-jeazk6wn.js:4209-4449 placement
/**
 * 返回持久监听被锁存阻止的原因：订阅被禁止（中继已可用时先解除）或中继不可用；否则 null。
 */
function getSubscribeBlock() {
  let durable = getLiveState().durable;
  let subscribeForbidden = durable.subscribeForbidden;
  if (subscribeForbidden)
    if (!subscribeForbidden.relayActive && frameVerbRelayActive(SUBSCRIPTIONS_RELAY_FAMILY))
      clearSubscribeForbidden();
    else
      return {
        reason: "subscribe_forbidden",
        serverMessage: subscribeForbidden.serverMessage,
      };
  let subscribeUnrelayed = durable.subscribeUnrelayed;
  return subscribeUnrelayed
    ? {
        reason: "relay_unavailable",
        ...subscribeUnrelayed,
      }
    : null;
}
//@ chunk-jeazk6wn.js:4449-4572 placement
function clearSubscribeForbidden() {
  let durable = getLiveState().durable;
  if (durable.subscribeForbidden === null) return;
  durable.subscribeForbidden = null;
  clearArmFailuresFor("subscribe_forbidden");
}
//@ chunk-jeazk6wn.js:4572-4694 placement
function clearSubscribeUnrelayed() {
  let durable = getLiveState().durable;
  if (durable.subscribeUnrelayed === null) return;
  durable.subscribeUnrelayed = null;
  clearArmFailuresFor("relay_unavailable");
}
//@ chunk-jeazk6wn.js:4694-4713 placement
var WATCH_URL = "watch_url";
//@ chunk-jeazk6wn.js:4713-4851 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tools, name) {
  let r = false;
  for (let a of tools) {
    if (a.mcpInfo?.serverName !== name) continue;
    if (a.mcpInfo.toolName === WATCH_URL) return true;
    r = true;
  }
  return r ? false : null;
}
//@ chunk-jeazk6wn.js:4851-4903 placement
/**
 * 导出函数 `isSubscriptionRelayBlocked`：返回 ( mn() && frameRelayActive() && !frameVerbRelayActive(SUBSCRIPTIONS_RELAY_FAMILY) && !isServiceAgentSession() …。
 */
function isSubscriptionRelayBlocked() {
  return (
    isRemoteManagedEnvironment() &&
    frameRelayActive() &&
    !frameVerbRelayActive(SUBSCRIPTIONS_RELAY_FAMILY) &&
    !isServiceAgentSession()
  );
}
//@ chunk-jeazk6wn.js:4903-5183 placement
/**
 * 远程环境下判断监听 URL 是否不可用：已记录的原因，或会话服务器已连接但没有提供监听工具（tool_not_offered）。
 */
function getWatchUrlWithheldReason(e) {
  if (!env.CLAUDE_CODE_REMOTE) return null;
  let { watchUrlWithheld, watchUrlGranted } = getLiveState().durable;
  if (watchUrlWithheld) return watchUrlWithheld;
  if (watchUrlGranted) return null;
  let serverUrl = getServerUrl(e.clients);
  return (serverUrl?.type === "connected" ||
    (serverUrl?.type === "cached" && serverUrl.listedByHost === true)) &&
    getToolNameForPermissionCheck(e.tools, serverUrl.name) === false
    ? "tool_not_offered"
    : null;
}
//@ chunk-jeazk6wn.js:5183-5376 placement
function isWebhookTriggerUrl(url, triggerId) {
  if (normalizeUuidOrNull(triggerId) === null) return false;
  let r;
  try {
    r = new URL(url);
  } catch {
    return false;
  }
  return (
    r.protocol === "https:" &&
    r.username === "" &&
    r.password === "" &&
    r.search === "" &&
    r.hash === "" &&
    r.pathname === WEBHOOK_TRIGGER_PATH_PREFIX + triggerId + WEBHOOK_FIRE_SUFFIX
  );
}
//@ chunk-jeazk6wn.js:5376-5484 placement
function isTriggerLimitMessage(text) {
  return text.includes("trigger limit reached") || text.includes("maximum number of webhook triggers");
}
//@ chunk-jeazk6wn.js:5484-5557 placement
function isNoOriginatorError(text) {
  return text.includes("a session with an originator account");
}
//@ chunk-jeazk6wn.js:5557-5889 placement
/**
 * 把创建触发器的错误文本归类为工具不可用、会话绑定桌面设备或组织未开启，未知返回 null。
 */
function classifyTriggerError(text) {
  if (text.includes("tool is not available to this session")) return "tool_not_offered";
  if (text.includes("bound to a desktop device")) return "session_device_bound";
  if (
    text.includes("tool is not enabled for this organization") ||
    text.includes("Session webhooks are not enabled for this organization")
  )
    return "org_not_enabled";
  return null;
}
//@ chunk-jeazk6wn.js:5889-6026 placement
var TRIGGER_ERROR_PHRASES = [
  ["cannot be found or is no longer active", "session_not_found"],
  ["not available in this deployment", "unavailable_in_deployment"],
];
//@ chunk-jeazk6wn.js:6026-6097 placement
function classifyTriggerErrorDurable(text) {
  for (let [n, r] of TRIGGER_ERROR_PHRASES) if (text.includes(n)) return r;
  return null;
}
//@ chunk-jeazk6wn.js:6097-6413 placement
/**
 * 服务端消息清洗用的常量：长度上限、可保留的英文词/数字/标点正则、不可见字符正则、换行正则与 [redacted]/[url] 占位。
 */
var MAX_SERVER_MESSAGE = 160;
var WORD_TOKEN_RE = /^[('\[]?[A-Za-z_]+(?:[-'][A-Za-z_]+)?[\])'.,;:!?]*$/;
var MAX_PLAIN_WORD_LENGTH = 40;
var NUMBER_TOKEN_RE = /^[(']?\d{1,5}[)'.,;:!?%]*$/;
var PUNCT_TOKEN_RE = /^[-\u2013\u2014.,;:!?()]{1,3}$/;
var INVISIBLE_RE =
  /(?!\u0020)\p{Zs}|[\p{M}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/gu;
var LINE_BREAK_RE = /\r\n|[\n\v\f\r\u0085\u2028\u2029]/;
var REDACTED = "[redacted]";
var URL_PLACEHOLDER = "[url]";
var MAX_RAW_MESSAGE = 2048;
//@ chunk-jeazk6wn.js:6413-6460 placement
function isPlainWord(e) {
  return e.length <= MAX_PLAIN_WORD_LENGTH && WORD_TOKEN_RE.test(e);
}
//@ chunk-jeazk6wn.js:6460-6513 placement
function isDisplayableToken(e) {
  return e === undefined || (e !== URL_PLACEHOLDER && e !== REDACTED && isPlainWord(e));
}
//@ chunk-jeazk6wn.js:6513-6581 placement
function isAllowableServerToken(token, n, r) {
  return (
    isPlainWord(token) ||
    PUNCT_TOKEN_RE.test(token) ||
    (NUMBER_TOKEN_RE.test(token) && isDisplayableToken(n) && isDisplayableToken(r))
  );
}
//@ chunk-jeazk6wn.js:6581-6645 placement
var SERVER_MESSAGE_SECRET_RE = /(?:^|[^A-Za-z_])(url|trigger_id)[ \t]*:|sealed_secret/i;
//@ chunk-jeazk6wn.js:6645-7233 placement
/**
 * 把服务端错误消息清洗成可展示的一行：只取第一个非空行，URL 换成 [url]，不像普通词/数字/标点的词换成 [redacted]（合并连续），没有实质内容时返回 undefined，超长截断。
 */
function sanitizeServerMessage(message) {
  if (SERVER_MESSAGE_SECRET_RE.test(message)) return;
  let n = truncateToLength(message, MAX_RAW_MESSAGE);
  let lines = n
    .split(LINE_BREAK_RE)
    .map((s) => printableText(s.replaceAll("\t", " ")).replace(INVISIBLE_RE, ""));
  if (lines.some((line) => SERVER_MESSAGE_SECRET_RE.test(line))) return;
  let lineIndex = lines.findIndex((line) => line.trim() !== "");
  if (lineIndex === -1) return;
  let o = lines[lineIndex] ?? "";
  let u = lineIndex === lines.length - 1 && n.length < message.length;
  let tokens = o
    .replace(/["`]/g, "'")
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, ` ${URL_PLACEHOLDER} `)
    .split(/\s+/)
    .filter((s) => s !== "");
  if (u && tokens.length > 0) tokens[tokens.length - 1] = REDACTED;
  let filtered = tokens
    .map((token, c) =>
      token === URL_PLACEHOLDER || isAllowableServerToken(token, tokens[c - 1], tokens[c + 1])
        ? token
        : REDACTED,
    )
    .filter((s, c, y) => s !== REDACTED || y[c - 1] !== REDACTED);
  if (!filtered.some((s) => s !== REDACTED && s !== URL_PLACEHOLDER && !PUNCT_TOKEN_RE.test(s))) return;
  let joined = filtered.join(" ");
  return joined.length > MAX_SERVER_MESSAGE
    ? `${truncateToLength(joined, MAX_SERVER_MESSAGE - 3)}...`
    : joined;
}
//@ chunk-jeazk6wn.js:7233-7473 placement = isToolResultBlockWithContent (1)
function extractMcpTextContent(obj) {
  let content = "content" in obj ? obj.content : undefined;
  if (!Array.isArray(content)) return "";
  let r = [];
  for (let a of content)
    if (
      typeof a === "object" &&
      a !== null &&
      "type" in a &&
      a.type === "text" &&
      "text" in a &&
      typeof a.text === "string"
    )
      r.push(a.text);
  return r.join(`
`);
}
//@ chunk-jeazk6wn.js:7473-7633 placement
async function callMcpToolForText(e, name, r) {
  try {
    let a = await callMcpTool(
      e,
      {
        name,
        arguments: r,
      },
      {
        timeout: 15000,
      },
    );
    return {
      isError: "isError" in a && a.isError === true,
      text: extractMcpTextContent(a),
    };
  } catch {
    return null;
  }
}
//@ chunk-jeazk6wn.js:7633-7730 placement
async function unwatchUrlTrigger(e, triggerId) {
  let r = await callMcpToolForText(e, "unwatch_url", {
    trigger_id: triggerId,
  });
  return r !== null && !r.isError;
}
//@ chunk-jeazk6wn.js:7730-8007 placement
async function releaseOrphanTriggers(e) {
  let { durable } = getLiveState();
  let r = [...durable.orphanTriggers];
  if (r.length === 0) return;
  let results = await Promise.all(r.map((u) => unwatchUrlTrigger(e, u)));
  let o = 0;
  r.forEach((u, b) => {
    if (results[b]) durable.orphanTriggers.delete(u);
    else o++;
  });
  if (o > 0) logFeatureSad("artifact_durable_subscribe", "orphan_trigger_release_failed");
  publishDurableWatchRegistry();
}
//@ chunk-jeazk6wn.js:8007-8232 placement
async function postFrameRelay(e, n, r, credentials) {
  try {
    let o = await frameApi.postRelayBound(e, n, {
      headers: buildFrameHeaders(),
      timeout: 15000,
      refreshOAuth: true,
      credentials,
      ...(r && {
        signal: r,
      }),
    });
    return {
      res: o,
      relayed: o.route === "relay",
    };
  } catch (error) {
    return {
      res: undefined,
      relayed: threwOnRelayLeg(error),
    };
  }
}
//@ chunk-jeazk6wn.js:8232-8280 placement
function relayedFlag(e) {
  return e.relayed
    ? {
        relayed: true,
      }
    : {};
}
//@ chunk-jeazk6wn.js:8280-8327 placement
function relayedList(outcome) {
  return outcome.relayed
    ? [
        {
          relay: true,
        },
      ]
    : [];
}
//@ chunk-jeazk6wn.js:8327-8558 placement
/**
 * 为 artifact 建立持久评论监听（串行、登记为在途操作），按结果打点，结束时登记监听并回调 onSettled。
 */
async function watchArtifactDurably(e) {
  let { slug, context, detachedFromUser } = e;
  noteArmInFlight(slug);
  let outcome;
  try {
    let u = armOrRefreshWatch(slug, context, detachedFromUser);
    trackPendingOp(u);
    outcome = await u;
    logWatchOutcome(outcome, getLiveState().durable.claudeDocSlugs.has(slug) || undefined);
    return outcome;
  } finally {
    let u = registerDurableWatch(slug, outcome);
    try {
      e.onSettled?.(u);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-jeazk6wn.js:8558-8658 placement
function trackPendingOp(e) {
  let { pendingOps } = getLiveState().durable;
  pendingOps.add(e);
  let r = () => void pendingOps.delete(e);
  e.then(r, r);
  registerPreExitFlush(awaitPendingDurableOps);
}
//@ chunk-jeazk6wn.js:8658-8741 placement
async function awaitPendingDurableOps() {
  await withDeadline(Promise.allSettled([...getLiveState().durable.pendingOps]), 1e4);
}
//@ chunk-jeazk6wn.js:8741-9146 placement
/**
 * 在 slug 串行队列里建立持久监听；已从旧纪元恢复的行先尝试刷新，失败时打点并保持已有监听。
 */
async function armOrRefreshWatch(slug, context, detachedFromUser) {
  return runSerializedForSlug(slug, async () => {
    let a = durableRows().get(slug);
    if (a?.restored && !detachedFromUser) {
      let o = await armDurableArtifactWatch(slug, context, false, a);
      if (o.outcome === "subscribed") return o;
      let u =
        o.outcome === "already_watching"
          ? o.outcome
          : o.outcome === "failed" && o.kept
            ? "outcome_unknown"
            : o.reason;
      logFeatureSad("artifact_durable_subscribe", `refresh_${u}`);
      logForDebugging(`[artifact] restored durable watch not refreshed: reason=${u}`);
      return alreadyWatchingResult(durableRows().get(slug) ?? a);
    }
    return armDurableArtifactWatch(slug, context, detachedFromUser);
  });
}
//@ chunk-jeazk6wn.js:9146-10017 placement
/**
 * 按持久监听结果打点：subscribed（含评论事件不支持的降级）、already_watching、skipped、failed（区分可预期原因与真正错误，并写调试日志）。
 */
function logWatchOutcome(outcome, n) {
  switch (outcome.outcome) {
    case "subscribed":
      if (outcome.downgraded) {
        logFeatureSad("artifact_durable_subscribe", "comment_events_unsupported", ...relayedList(outcome));
        break;
      }
      logFeatureOk("artifact_durable_subscribe", ...relayedList(outcome));
      break;
    case "already_watching":
      logFeatureOk("artifact_durable_subscribe", {
        already_watching: true,
        ...(outcome.restored && {
          restored: true,
        }),
      });
      break;
    case "skipped":
      logFeatureSad("artifact_durable_subscribe", outcome.reason);
      break;
    case "failed": {
      let r = classifyExpectedWatchFailure(outcome, n);
      let [a] = relayedList(outcome);
      let o = {
        ...(outcome.status !== undefined && {
          status: outcome.status,
        }),
        ...(outcome.gatewayDeclined !== undefined && {
          gateway_declined: outcome.gatewayDeclined,
        }),
        ...a,
      };
      let u = Object.keys(o).length > 0 ? [o] : [];
      if (r !== undefined) logFeatureSad("artifact_durable_subscribe", r, ...u);
      else logFeatureBad("artifact_durable_subscribe", outcome.reason, u[0]);
      let b = outcome.status !== undefined ? ` status=${outcome.status}` : "";
      let h = outcome.serverMessage !== undefined ? ` server="${outcome.serverMessage}"` : "";
      logForDebugging(`[artifact] durable watch failed: reason=${outcome.reason}${b}${h}`, {
        level: r !== undefined ? "debug" : "warn",
      });
      break;
    }
  }
}
//@ chunk-jeazk6wn.js:10017-10422 placement
/**
 * 把预期内的持久监视失败（中断、无发起者、订阅被禁、中继不可用、文档未被接纳）映射为打点原因，非预期返回 undefined。
 */
function classifyExpectedWatchFailure(outcome, n) {
  switch (outcome.reason) {
    case "aborted":
      return "aborted";
    case "no_originator":
      return outcome.latched ? "no_originator_latched" : undefined;
    case "subscribe_forbidden":
      return outcome.latched ? "subscribe_forbidden_latched" : "subscribe_forbidden";
    case "relay_unavailable":
      return outcome.latched ? "relay_unavailable_latched" : "relay_unavailable";
    case "subscribe_failed":
      return n && isMissingSessionSubscribe(outcome) ? "claude_doc_not_admitted" : undefined;
    default:
      return;
  }
}
//@ chunk-jeazk6wn.js:10422-10553 placement
function alreadyWatchingResult(e) {
  return {
    outcome: "already_watching",
    triggerId: e.triggerId,
    since: e.since,
    events: e.events,
    ...(e.restored && {
      restored: true,
    }),
  };
}
//@ chunk-jeazk6wn.js:10553-15052 placement
/**
 * 为 artifact 建立持久关注（durable wake）：校验 slug、去重已有关注、写入存储并启动订阅。
 */
async function armDurableArtifactWatch(e, n, r, a) {
  if (!ARTIFACT_SLUG_RE.test(e))
    return {
      outcome: "failed",
      reason: "invalid_slug",
    };
  let o = durableRows().get(e);
  if (o && o !== a) return alreadyWatchingResult(o);
  runCommentMonitorWithIntent({
    storageV5: n.storageV5,
  });
  if (getLiveState().durable.stopLatches.isStopped(e))
    return {
      outcome: "skipped",
      reason: "stop_latched",
    };
  if (isEssentialTrafficOnly() || getAPIProvider() !== "firstParty")
    return {
      outcome: "failed",
      reason: "client_policy",
    };
  if (isSubscriptionRelayBlocked())
    return {
      outcome: "skipped",
      reason: "relay_not_served",
    };
  if (r && getLiveState().durable.originatorRefused)
    return {
      outcome: "failed",
      reason: "no_originator",
      latched: true,
    };
  let subscribeBlock = getSubscribeBlock();
  if (r && subscribeBlock)
    return subscribeBlock.reason === "subscribe_forbidden"
      ? {
          outcome: "failed",
          reason: "subscribe_forbidden",
          latched: true,
          serverMessage: subscribeBlock.serverMessage,
        }
      : {
          outcome: "failed",
          reason: "relay_unavailable",
          latched: true,
          status: subscribeBlock.status,
          relayed: true,
          fromGateway: true,
        };
  let b = r ? getWatchUrlWithheldReason(n.getMcp()) : null;
  if (b)
    return {
      outcome: "skipped",
      reason: b,
    };
  let h = await dialWatchServer(
    n.getMcp().clients,
    n.abortController.signal,
    r
      ? {
          detachedFromUser: r,
        }
      : undefined,
  );
  if (!h) {
    if (!r && n.abortController.signal.aborted)
      return {
        outcome: "failed",
        reason: "aborted",
      };
    return {
      outcome: "skipped",
      reason: "no_wake_minter",
    };
  }
  await releaseOrphanTriggers(h);
  let p = await callMcpToolForText(h, WATCH_URL, {});
  if (!p || p.isError) {
    let _ = p ? sanitizeServerMessage(p.text) : undefined;
    let v =
      _ !== undefined
        ? {
            serverMessage: _,
          }
        : {};
    if (p && isTriggerLimitMessage(p.text))
      return {
        outcome: "failed",
        reason: "trigger_limit",
        ...v,
      };
    if (p && isNoOriginatorError(p.text)) {
      let durable = getLiveState().durable;
      let originatorRefused = durable.originatorRefused;
      durable.originatorRefused = true;
      return originatorRefused
        ? {
            outcome: "failed",
            reason: "no_originator",
            latched: true,
            ...v,
          }
        : {
            outcome: "failed",
            reason: "no_originator",
            ...v,
          };
    }
    let E = p ? classifyTriggerError(p.text) : null;
    if (E) {
      getLiveState().durable.watchUrlWithheld = E;
      return {
        outcome: "skipped",
        reason: E,
      };
    }
    return {
      outcome: "failed",
      reason: (p ? classifyTriggerErrorDurable(p.text) : null) ?? "mint_failed",
      ...v,
    };
  }
  let durable = getLiveState().durable;
  durable.originatorRefused = false;
  durable.watchUrlWithheld = null;
  durable.watchUrlGranted = true;
  let triggerResponse = parseTriggerResponse(p.text);
  if (!triggerResponse) {
    let _ = triggerIdOf(p.text);
    if (_) await unwatchUrlTrigger(h, _);
    return {
      outcome: "failed",
      reason: "mint_failed",
    };
  }
  if (!isWebhookTriggerUrl(triggerResponse.url, triggerResponse.triggerId)) {
    await unwatchUrlTrigger(h, triggerResponse.triggerId);
    return {
      outcome: "failed",
      reason: "mint_failed",
    };
  }
  if (!r && n.abortController.signal.aborted)
    return {
      outcome: "failed",
      reason: (await unwatchUrlTrigger(h, triggerResponse.triggerId))
        ? "aborted"
        : "watch_trigger_release_failed",
    };
  let y;
  let w = false;
  let S = {};
  let A = false;
  let P = false;
  let D;
  let T = false;
  let I = isArtifactsAvailable() ? ALL_WATCH_EVENTS : PUBLISH_ONLY_EVENTS;
  let V = false;
  let K = `/api/frame/subscribe/${e}`;
  let B = frameRelayActive() ? relayFamily("POST", K) : null;
  let relayActive = frameVerbRelayActive(B);
  let ye = B !== null && relayHopFailed(B);
  let Y = () =>
    postFrameRelay(
      K,
      {
        url: triggerResponse.url,
        sealed_secret: triggerResponse.sealedSecret,
        events: I,
      },
      r ? undefined : n.abortController.signal,
      n.credentials,
    );
  let M = await Y();
  if (M.res?.ok && M.res.fromFrame && M.res.status === 400 && I.includes("comment")) {
    I = PUBLISH_ONLY_EVENTS;
    V = true;
    M = await Y();
  }
  let O = relayedFlag(M);
  let { res } = M;
  if (!res) T = !r && n.abortController.signal.aborted;
  else if (res.ok) {
    y = res.status;
    w = res.status >= 200 && res.status < 300;
    if (!w) {
      let _ = typeof res.data === "string" ? res.data.trim() : undefined;
      let v = res.response?.headers?.["content-type"];
      let E =
        _ !== undefined &&
        _ !== "" &&
        !LINE_BREAK_RE.test(_) &&
        !/[<>]/.test(_) &&
        typeof v === "string" &&
        v.toLowerCase().startsWith("text/plain");
      let z = denyPolicyBody(res.data);
      let F = res.fromFrame && (z !== null || E);
      let W = F ? sanitizeServerMessage(z?.error ?? _ ?? "") : undefined;
      S = {
        ...(!res.fromFrame && {
          fromGateway: true,
        }),
        ...(res.gatewayDeclined !== undefined && {
          gatewayDeclined: res.gatewayDeclined,
        }),
        ...(W !== undefined && {
          serverMessage: W,
        }),
      };
      let Re = res.route === "relay" || !(ye || res.gatewayDeclined === 0);
      if (res.status === 403 && E && W !== undefined && Re && a === undefined) {
        A = true;
        P = durable.subscribeForbidden !== null;
        durable.subscribeForbidden = {
          serverMessage: W,
          relayActive,
        };
      } else if (F && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)
        clearSubscribeForbidden();
    } else if (res.fromFrame) clearSubscribeForbidden();
    if (res.fromFrame) clearSubscribeUnrelayed();
  } else if (res.reason === "relay-unavailable" || res.reason === "relay-not-served") {
    if (res.status !== 0) {
      D = "relay_unavailable";
      y = res.status;
      S = {
        fromGateway: true,
      };
      if (a === undefined) {
        P = durable.subscribeUnrelayed !== null;
        durable.subscribeUnrelayed = {
          status: y,
        };
      }
    }
  } else D = res.reason === "no-auth" ? "no_auth" : "client_policy";
  if (!w) {
    let _ = !res || (res.ok && (!res.fromFrame || res.status >= 500));
    if (a !== undefined && _) {
      durableRows().set(e, {
        ...a,
        unreleased: [...(a.unreleased ?? []), triggerResponse.triggerId],
      });
      publishDurableWatchRegistry();
      logForDebugging(
        `[artifact] refresh subscribe outcome unknown; keeping trigger ${triggerResponse.triggerId} beside ${a.triggerId}`,
      );
      return {
        outcome: "failed",
        reason: T ? "aborted" : "subscribe_failed",
        status: y,
        kept: true,
        ...O,
        ...S,
      };
    }
    let v = await unwatchUrlTrigger(h, triggerResponse.triggerId);
    if (T)
      return {
        outcome: "failed",
        reason: v ? "aborted" : "watch_trigger_release_failed",
        ...O,
      };
    return {
      outcome: "failed",
      reason: D ?? (A ? "subscribe_forbidden" : "subscribe_failed"),
      status: y,
      ...O,
      ...S,
      ...(P && {
        latched: true,
      }),
    };
  }
  let since = new Date().toISOString();
  durableRows().set(e, {
    slug: e,
    triggerId: triggerResponse.triggerId,
    since,
    events: I,
    ...((durable.claudeDocSlugs.has(e) || a?.claudeDoc) && {
      claudeDoc: true,
    }),
  });
  publishDurableWatchRegistry();
  let we = a ? [a.triggerId, ...(a.unreleased ?? [])].filter((_) => _ !== triggerResponse.triggerId) : [];
  if ((await Promise.all(we.map((_) => unwatchUrlTrigger(h, _)))).includes(false))
    logFeatureSad("artifact_durable_subscribe", "superseded_trigger_release_failed");
  return {
    outcome: "subscribed",
    triggerId: triggerResponse.triggerId,
    since,
    events: I,
    ...(V && {
      downgraded: true,
    }),
    ...O,
  };
}
//@ chunk-jeazk6wn.js:15052-15277 placement
/**
 * 取消某 artifact 的持久监听：本地没有记录且非远程或 slug 非法时直接返回；否则在串行队列里执行取消。
 */
async function unwatchArtifactDurably(e) {
  let { slug, context } = e;
  forgetArmOutcome(slug);
  if (!durableRows().has(slug) && !env.CLAUDE_CODE_REMOTE)
    return {
      wasWatching: false,
      teardown: "unsent",
    };
  if (!ARTIFACT_SLUG_RE.test(slug))
    return {
      wasWatching: false,
      teardown: "unsent",
    };
  let a = runSerializedForSlug(slug, () => performUnwatch(slug, context));
  trackPendingOp(a);
  return a;
}
//@ chunk-jeazk6wn.js:15277-16651 placement
/**
 * 执行取消持久监听：调用 unsubscribe 接口，释放该 slug 的 webhook 触发器（失败的记为孤立）并释放其他孤立触发器，更新登记表，按结果打点；返回之前是否在监听与请求是否发出。
 */
async function performUnwatch(slug, context) {
  let row = durableRows().get(slug);
  getLiveState().durable.unwatchedSlugs.add(slug);
  let unsubscribed = false;
  let teardown = "dispatched";
  let u = false;
  let relayStatus;
  let h = false;
  let p = await postFrameRelay(
    `/api/frame/unsubscribe/${slug}`,
    {},
    context.abortController.signal,
    context.credentials,
  );
  let s = relayedList(relayedFlag(p));
  let { res } = p;
  if (!res) u = context.abortController.signal.aborted;
  else if (res.ok) {
    unsubscribed = res.status >= 200 && res.status < 300;
    if (res.fromFrame) clearSubscribeUnrelayed();
  } else {
    teardown = "refused";
    if (res.reason === "relay-unavailable" || res.reason === "relay-not-served")
      if (res.status !== 0) relayStatus = res.status;
      else h = true;
  }
  let triggersReleased = true;
  if (row || getLiveState().durable.orphanTriggers.size > 0) {
    let w = await dialWatchServer(context.getMcp().clients, context.abortController.signal, {
      detachedFromUser: true,
    });
    if (row) {
      let S = [row.triggerId, ...(row.unreleased ?? [])];
      let A = w === null ? S.map(() => false) : await Promise.all(S.map((D) => unwatchUrlTrigger(w, D)));
      triggersReleased = !A.includes(false);
      let { durable } = getLiveState();
      S.forEach((D, T) => {
        if (!A[T]) durable.orphanTriggers.add(D);
      });
      durableRows().delete(slug);
      publishDurableWatchRegistry();
    }
    if (w !== null) await releaseOrphanTriggers(w);
  }
  if (unsubscribed && triggersReleased)
    logFeatureOk("artifact_durable_subscribe", {
      unwatch: true,
      ...s[0],
    });
  else if (u && triggersReleased) logFeatureSad("artifact_durable_subscribe", "unwatch_aborted", ...s);
  else if (relayStatus !== undefined && triggersReleased)
    logFeatureSad("artifact_durable_subscribe", "unwatch_relay_unavailable", {
      status: relayStatus,
      ...s[0],
    });
  else {
    let w =
      res?.ok && !unsubscribed
        ? {
            status: res.status,
            ...s[0],
          }
        : relayStatus !== undefined
          ? {
              status: relayStatus,
              ...s[0],
              trigger_release_failed: true,
            }
          : s[0];
    logFeatureBad(
      "artifact_durable_subscribe",
      unsubscribed
        ? "unwatch_trigger_release_failed"
        : relayStatus !== undefined
          ? "unwatch_relay_unavailable"
          : teardown === "refused" && !h
            ? "unwatch_client_policy"
            : "unwatch_failed",
      ...(w ? [w] : []),
    );
  }
  return {
    wasWatching: row !== undefined,
    teardown,
  };
}
//@ chunk-aqdf5t3e.js:2072-5524 placement
/**
 * 持久唤醒订阅失败的提示文本表
 */
var DURABLE_WATCH_ERRORS =
  "Could not register a durable wake subscription; publishing and reading still work.";
var DURABLE_WATCH_ERROR_TEXTS = {
  invalid_slug:
    "That address is not an artifact this session can name, so nothing was registered; retrying with the same address will not help.",
  trigger_limit:
    "This session already holds the maximum number of webhook triggers (10); unwatch an artifact to free one.",
  no_originator:
    "This session currently has no linked human originator, so it cannot hold wake subscriptions. Common causes: the session was started by a background event, or the connection between the chat platform and the Claude account needs re-linking. After the user addresses that (re-link and/or restart the session) \u2014 or if the server-side policy changes \u2014 a deliberate watch retry will re-check; automatic retries while the session stays originator-less are answered locally without contacting the server.",
  client_policy:
    "This environment's network policy disables artifact subscriptions; no request was sent, and retrying will not help while the policy is active.",
  no_auth:
    "No credential is available for the artifact service, so the subscription could not be registered; retrying will not help until the session has credentials.",
  session_not_found:
    "The server no longer has an active record of this remote session, so it cannot hold a wake subscription; retrying in this session will not help.",
  unavailable_in_deployment:
    "Wake subscriptions are not provisioned in this deployment; retrying will not help.",
  no_wake_minter:
    "No wake-webhook minter is reachable (the session's own MCP mount was not found or did not connect), so the subscription could not be registered.",
  tool_not_offered:
    "The server does not offer wake subscriptions to this session, so none was registered; retrying will not help while that holds.",
  org_not_enabled:
    "Wake subscriptions are not enabled for the user's organization, so none was registered; retrying will not help while that holds.",
  relay_not_served:
    "This cloud session cannot register wake subscriptions, so none was registered; retrying will not help while that holds.",
  subscribe_forbidden:
    "The artifact service refuses wake subscriptions from this session, for any artifact until the session ends, so retrying will not help. Later publishes in this session are not armed; only an explicit watch re-checks with the service.",
  relay_unavailable:
    "This cloud session reaches the artifact service only through its session gateway, and the gateway refused to carry the wake subscription (commonly because wake subscriptions are not enabled there for the user's organization), so none was registered and retrying will not help while that holds. Later publishes in this session are not armed; only an explicit watch re-checks with the gateway.",
  session_device_bound:
    "This cloud session is bound to the desktop it was started from (Cowork or `claude --cloud`), and that device's trusted-device check means activity on the artifact can't wake it, so no wake subscription was registered. Publishing and reading still work; retrying won't help in this session.",
  aborted:
    "The request was cancelled before the registration finished (the turn was interrupted); nothing is wrong with the artifact or the session.",
  watch_trigger_release_failed:
    "The request was cancelled before the registration finished, and the webhook trigger minted for it could not be released \u2014 it counts against this session until the session ends.",
};
var DURABLE_WATCH_ERROR_ALIAS = new Map(Object.entries(DURABLE_WATCH_ERROR_TEXTS));
//@ chunk-aqdf5t3e.js:5524-5660 placement
/**
 * 生成持久监视错误的说明，附上服务端返回的消息（必要时补句号）。
 */
function describeWatchError(reason, serverMessage) {
  let r = DURABLE_WATCH_ERROR_ALIAS.get(reason) ?? DURABLE_WATCH_ERRORS;
  if (serverMessage === undefined) return r;
  let s = /[.!?]['")\]]*$/.test(serverMessage) ? "" : ".";
  return `${r} Server said: "${serverMessage}"${s}`;
}
//@ chunk-aqdf5t3e.js:5660-6213 placement
/**
 * 描述监听请求失败的 HTTP 来源：经会话网关（是否归因到 artifact 服务）、直连，或在网关未应答/拒绝后直连。
 */
function describeWatchHttpStatus(e) {
  if (e.status === undefined) return;
  if (e.relayed)
    return e.fromGateway
      ? `HTTP ${e.status} via the session gateway, not attributed to the artifact service`
      : `HTTP ${e.status} from the artifact service via the session gateway`;
  if (e.gatewayDeclined === undefined) return `HTTP ${e.status} from the artifact service`;
  return e.gatewayDeclined === 0
    ? `HTTP ${e.status} direct from the artifact service, after the session gateway did not answer`
    : `HTTP ${e.status} direct from the artifact service, after the session gateway declined with HTTP ${e.gatewayDeclined}`;
}
//@ chunk-aqdf5t3e.js:6213-6298 placement
/**
 * 导出函数 `isMissingSessionSubscribe`：参数 e，返回 e.reason === "subscribe_failed" && e.status === 404 && !e.fromGateway。
 */
function isMissingSessionSubscribe(e) {
  return e.reason === "subscribe_failed" && e.status === 404 && !e.fromGateway;
}
//@ chunk-aqdf5t3e.js:6298-6542 placement
var EXPECTED_WATCH_FAILURES = new Set([
  "no_originator",
  "client_policy",
  "no_auth",
  "session_not_found",
  "unavailable_in_deployment",
  "tool_not_offered",
  "org_not_enabled",
  "relay_not_served",
  "subscribe_forbidden",
  "relay_unavailable",
  "session_device_bound",
  "invalid_slug",
]);
//@ chunk-aqdf5t3e.js:6542-6584 placement
/**
 * 导出函数 `unexpectedWatchFailure`：参数 e，返回 EXPECTED_WATCH_FAILURES.has(e) ? null : NGr。
 */
function unexpectedWatchFailure(reason) {
  return EXPECTED_WATCH_FAILURES.has(reason) ? null : MISSED_WATCH_RELAUNCH_ADVICE;
}
//@ chunk-aqdf5t3e.js:6584-6658 placement
/**
 * 导出函数 `noteArmInFlight`：参数 e。
 */
function noteArmInFlight(slug) {
  let { armsInFlight } = getLiveState().durable;
  armsInFlight.set(slug, (armsInFlight.get(slug) ?? 0) + 1);
}
//@ chunk-aqdf5t3e.js:6658-7442 placement
function registerDurableWatch(slug, n) {
  let durable = getLiveState().durable;
  let s = (durable.armsInFlight.get(slug) ?? 1) - 1;
  if (s > 0) durable.armsInFlight.set(slug, s);
  else durable.armsInFlight.delete(slug);
  if (n?.outcome === "subscribed" || n?.outcome === "already_watching") {
    forgetArmOutcome(slug);
    return {
      settled: "registered",
    };
  }
  let reason = n === undefined ? "arm_threw" : n.reason;
  if (reason === "stop_latched" || durable.stopLatches.isStopped(slug))
    return {
      settled: "stopped",
    };
  let a = durable.armOutcomes.get(slug);
  let d = n?.outcome === "failed" && n.latched && a?.reason === reason ? a : undefined;
  let b = (n?.outcome === "failed" ? describeWatchHttpStatus(n) : undefined) ?? d?.detail;
  let w = (n?.outcome === "failed" ? n.serverMessage : undefined) ?? d?.serverMessage;
  let S = {
    reason,
    ...(b !== undefined && {
      detail: b,
    }),
    ...(w !== undefined && {
      serverMessage: w,
    }),
  };
  setWithLimit(
    durable.armOutcomes,
    slug,
    {
      ...S,
      at: Date.now(),
    },
    MAX_CRON_OWNERSHIP_ENTRIES,
  );
  return s > 0
    ? {
        settled: "pending",
        ...S,
      }
    : {
        settled: "unregistered",
        ...S,
        ...(n?.outcome === "failed" &&
          isMissingSessionSubscribe(n) && {
            refusedByFrame: true,
          }),
      };
}
//@ chunk-aqdf5t3e.js:7442-7638 placement
function clearArmFailuresFor(e) {
  let durable = getLiveState().durable;
  for (let [r, s] of durable.armOutcomes) if (s.reason === e) durable.armOutcomes.delete(r);
  for (let announcedArmFailure of durable.announcedArmFailures)
    if (announcedArmFailure.endsWith(`:${e}`)) durable.announcedArmFailures.delete(announcedArmFailure);
}
//@ chunk-aqdf5t3e.js:7638-7727 placement
/**
 * 导出函数 `forgetArmOutcome`：参数 e。
 */
function forgetArmOutcome(e) {
  let durable = getLiveState().durable;
  durable.armOutcomes.delete(e);
  removeCronOwnedKeys(durable.announcedArmFailures, e);
}
//@ chunk-r3568h5y.js:264-472 placement = getServerUrl (1)
/**
 * 在已连接的 claude.ai 连接器中找唯一一个 URL 满足条件的连接器。
 */
function getServerUrl(config) {
  let r = [];
  for (let o of config) {
    if (!isConnectedOrCached(o)) continue;
    let { config } = o;
    let url =
      config && typeof config === "object" && "url" in config && typeof config.url === "string"
        ? config.url
        : null;
    if (url !== null && isCcrOriginUrl(url)) r.push(o);
  }
  return r.length === 1 ? r[0] : null;
}
export {
  restoreDurableWatches,
  getServerUrl,
  unexpectedWatchFailure,
  describeWatchError,
  describeWatchHttpStatus,
  durableRowFor,
  durableRowList,
  unwatchArtifactDurably,
  watchArtifactDurably,
  localDurableWatchRefusal,
  hasConnectorForUrl,
  isSubscriptionRelayBlocked,
  getWatchUrlWithheldReason,
  getSubscribeBlock,
};
