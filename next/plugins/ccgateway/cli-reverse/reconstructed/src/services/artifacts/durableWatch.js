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
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { isCcrOriginUrl } from "../mcp/ccrMcpUrls.js";
import {
  MISSED_WATCH_RELAUNCH_ADVICE,
  setWithLimit,
  MAX_CRON_OWNERSHIP_ENTRIES,
  removeCronOwnedKeys,
} from "../../utils/cronTasks.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-r3568h5y.js:264-472 placement (2.1.88 match: getServerUrl, 1)
/**
 * 在已连接的 claude.ai 连接器中找唯一一个 URL 满足条件的连接器。
 */
function getServerUrl(config) {
  let ccrServers = [];
  for (let server of config) {
    if (!isConnectedOrCached(server)) continue;
    let { config } = server;
    let url =
      config && typeof config === "object" && "url" in config && typeof config.url === "string"
        ? config.url
        : null;
    if (url !== null && isCcrOriginUrl(url)) ccrServers.push(server);
  }
  return ccrServers.length === 1 ? ccrServers[0] : null;
}
//@ chunk-aqdf5t3e.js:2072-5524 placement
/**
 * 持久唤醒订阅失败的提示文本表
 */
var DURABLE_WATCH_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DURABLE_WATCH_ERROR_TEXTS;
var DURABLE_WATCH_ERROR_ALIAS;
deferInit("chunk-aqdf5t3e.js:2072", () => {
  DURABLE_WATCH_ERRORS = "Could not register a durable wake subscription; publishing and reading still work.";
  DURABLE_WATCH_ERROR_TEXTS = {
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
  DURABLE_WATCH_ERROR_ALIAS = new Map(Object.entries(DURABLE_WATCH_ERROR_TEXTS));
});
//@ chunk-aqdf5t3e.js:5524-5660 placement
/**
 * 生成持久监视错误的说明，附上服务端返回的消息（必要时补句号）。
 */
function describeWatchError(reason, serverMessage) {
  let baseMessage = DURABLE_WATCH_ERROR_ALIAS.get(reason) ?? DURABLE_WATCH_ERRORS;
  if (serverMessage === undefined) return baseMessage;
  let period = /[.!?]['")\]]*$/.test(serverMessage) ? "" : ".";
  return `${baseMessage} Server said: "${serverMessage}"${period}`;
}
//@ chunk-aqdf5t3e.js:5660-6213 placement
/**
 * 描述监听请求失败的 HTTP 来源：经会话网关（是否归因到 artifact 服务）、直连，或在网关未应答/拒绝后直连。
 */
function describeWatchHttpStatus(outcome) {
  if (outcome.status === undefined) return;
  if (outcome.relayed)
    return outcome.fromGateway
      ? `HTTP ${outcome.status} via the session gateway, not attributed to the artifact service`
      : `HTTP ${outcome.status} from the artifact service via the session gateway`;
  if (outcome.gatewayDeclined === undefined) return `HTTP ${outcome.status} from the artifact service`;
  return outcome.gatewayDeclined === 0
    ? `HTTP ${outcome.status} direct from the artifact service, after the session gateway did not answer`
    : `HTTP ${outcome.status} direct from the artifact service, after the session gateway declined with HTTP ${outcome.gatewayDeclined}`;
}
//@ chunk-aqdf5t3e.js:6213-6298 placement
/**
 * 导出函数 `isMissingSessionSubscribe`：参数 e，返回 e.reason === "subscribe_failed" && e.status === 404 && !e.fromGateway。
 */
function isMissingSessionSubscribe(result) {
  return result.reason === "subscribe_failed" && result.status === 404 && !result.fromGateway;
}
//@ chunk-aqdf5t3e.js:6298-6542 placement
var EXPECTED_WATCH_FAILURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aqdf5t3e.js:6298", () => {
  EXPECTED_WATCH_FAILURES = new Set([
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
});
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
function registerDurableWatch(slug, outcome) {
  let durable = getLiveState().durable;
  let inFlight = (durable.armsInFlight.get(slug) ?? 1) - 1;
  if (inFlight > 0) durable.armsInFlight.set(slug, inFlight);
  else durable.armsInFlight.delete(slug);
  if (outcome?.outcome === "subscribed" || outcome?.outcome === "already_watching") {
    forgetArmOutcome(slug);
    return {
      settled: "registered",
    };
  }
  let reason = outcome === undefined ? "arm_threw" : outcome.reason;
  if (reason === "stop_latched" || durable.stopLatches.isStopped(slug))
    return {
      settled: "stopped",
    };
  let previous = durable.armOutcomes.get(slug);
  let prior =
    outcome?.outcome === "failed" && outcome.latched && previous?.reason === reason ? previous : undefined;
  let detail =
    (outcome?.outcome === "failed" ? describeWatchHttpStatus(outcome) : undefined) ?? prior?.detail;
  let serverMessage =
    (outcome?.outcome === "failed" ? outcome.serverMessage : undefined) ?? prior?.serverMessage;
  let outcomeEntry = {
    reason,
    ...(detail !== undefined && {
      detail,
    }),
    ...(serverMessage !== undefined && {
      serverMessage,
    }),
  };
  setWithLimit(
    durable.armOutcomes,
    slug,
    {
      ...outcomeEntry,
      at: Date.now(),
    },
    MAX_CRON_OWNERSHIP_ENTRIES,
  );
  return inFlight > 0
    ? {
        settled: "pending",
        ...outcomeEntry,
      }
    : {
        settled: "unregistered",
        ...outcomeEntry,
        ...(outcome?.outcome === "failed" &&
          isMissingSessionSubscribe(outcome) && {
            refusedByFrame: true,
          }),
      };
}
//@ chunk-aqdf5t3e.js:7442-7638 placement
function clearArmFailuresFor(reason) {
  let durable = getLiveState().durable;
  for (let [slug, outcome] of durable.armOutcomes)
    if (outcome.reason === reason) durable.armOutcomes.delete(slug);
  for (let announcedArmFailure of durable.announcedArmFailures)
    if (announcedArmFailure.endsWith(`:${reason}`)) durable.announcedArmFailures.delete(announcedArmFailure);
}
//@ chunk-aqdf5t3e.js:7638-7727 placement
/**
 * 导出函数 `forgetArmOutcome`：参数 e。
 */
function forgetArmOutcome(slug) {
  let durable = getLiveState().durable;
  durable.armOutcomes.delete(slug);
  removeCronOwnedKeys(durable.announcedArmFailures, slug);
}
//@ chunk-jeazk6wn.js:1024-1062 placement
function durableRows() {
  return getLiveState().durable.rows;
}
//@ chunk-jeazk6wn.js:1062-1256 placement
/**
 * 按 slug 串行执行异步操作：排在该 slug 上一个操作之后（无论成败），结束时若自己仍是队尾则清除。
 */
async function runSerializedForSlug(slug, operation) {
  let slugOps = getLiveState().durable.slugOps;
  let run = (slugOps.get(slug) ?? Promise.resolve()).then(operation, operation);
  let settled = run.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  slugOps.set(slug, settled);
  try {
    return await run;
  } finally {
    if (slugOps.get(slug) === settled) slugOps.delete(slug);
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
async function rereadWorkerState(reread, options, delays = WORKER_STATE_REREAD_DELAYS_MS) {
  for (let delayMs of delays) {
    await sleep(delayMs, undefined, {
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
  for (let triggerId of registry?.orphans ?? []) durable.orphanTriggers.add(triggerId);
  for (let row of registry?.rows ?? []) {
    if (durable.unwatchedSlugs.has(row.slug) && !durable.rows.has(row.slug)) {
      restoreRow(row);
      continue;
    }
    if (durable.slugOps.has(row.slug)) {
      durable.pendingRestoredRows.set(row.slug, row);
      trackPendingOp(
        runSerializedForSlug(row.slug, async () => {
          durable.pendingRestoredRows.delete(row.slug);
          restoreRow(row);
          publishDurableWatchRegistry();
        }),
      );
      continue;
    }
    restoreRow(row);
  }
  applyRemoteStops(registry?.stopped ?? new Map(), options);
  for (let slug of new Set([
    ...durable.rows.keys(),
    ...durable.pendingRestoredRows.keys(),
    ...durable.slugOps.keys(),
  ]))
    if (durable.stopLatches.isStopped(slug)) retireStoppedRow(slug);
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
function retireStoppedRow(slug) {
  let { durable } = getLiveState();
  let stopFlat = () => {
    let row = durable.rows.get(slug);
    if (row === undefined || !durable.stopLatches.isStopped(slug)) return;
    durable.rows.delete(slug);
    durable.unwatchedSlugs.add(slug);
    for (let triggerId of [row.triggerId, ...(row.unreleased ?? [])]) durable.orphanTriggers.add(triggerId);
    logFeatureSad("artifact_durable_subscribe", "restored_stop_retired_row");
  };
  if (durable.slugOps.has(slug)) {
    trackPendingOp(
      runSerializedForSlug(slug, async () => {
        stopFlat();
        publishDurableWatchRegistry();
      }),
    );
    return;
  }
  stopFlat();
}
//@ chunk-jeazk6wn.js:3118-3483 placement
/**
 * 恢复一条持久监听行：已有行、已取消或已停止时把其触发器记为孤立（必要时补 claudeDoc 标记），否则以 restored 写入。
 */
function restoreRow(row) {
  let { durable } = getLiveState();
  if (row.claudeDoc) trackDurableClaudeDocSlug(row.slug);
  let existing = durable.rows.get(row.slug);
  if (
    existing !== undefined ||
    durable.unwatchedSlugs.has(row.slug) ||
    durable.stopLatches.isStopped(row.slug)
  ) {
    for (let triggerId of [row.triggerId, ...(row.unreleased ?? [])])
      if (triggerId !== existing?.triggerId) durable.orphanTriggers.add(triggerId);
    if (existing !== undefined && row.claudeDoc)
      durable.rows.set(row.slug, {
        ...existing,
        claudeDoc: true,
      });
    return;
  }
  durable.rows.set(row.slug, {
    ...row,
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
async function dialWatchServer(clients, signal, options) {
  let connector = connectorForUrl(clients);
  if (!connector) return null;
  try {
    return await connector.dial(
      connector.found,
      options?.detachedFromUser
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
function headerFieldOf(text, field) {
  let match = new RegExp(`^${field}:\\s*(\\S+)`, "m").exec(text);
  return match && match[1] ? match[1] : null;
}
//@ chunk-jeazk6wn.js:3863-4005 placement
function parseTriggerResponse(text) {
  let url = headerFieldOf(text, "url");
  let triggerId = headerFieldOf(text, "trigger_id");
  let sealedSecret = headerFieldOf(text, "sealed_secret");
  if (!url || !triggerId || !sealedSecret) return null;
  return {
    url,
    triggerId,
    sealedSecret,
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
//@ chunk-jeazk6wn.js:4713-4851 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(tools, name) {
  let found = false;
  for (let tool of tools) {
    if (tool.mcpInfo?.serverName !== name) continue;
    if (tool.mcpInfo.toolName === WATCH_URL) return true;
    found = true;
  }
  return found ? false : null;
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
function getWatchUrlWithheldReason(context) {
  if (!env.CLAUDE_CODE_REMOTE) return null;
  let { watchUrlWithheld, watchUrlGranted } = getLiveState().durable;
  if (watchUrlWithheld) return watchUrlWithheld;
  if (watchUrlGranted) return null;
  let serverUrl = getServerUrl(context.clients);
  return (serverUrl?.type === "connected" ||
    (serverUrl?.type === "cached" && serverUrl.listedByHost === true)) &&
    getToolNameForPermissionCheck(context.tools, serverUrl.name) === false
    ? "tool_not_offered"
    : null;
}
//@ chunk-jeazk6wn.js:5183-5376 placement
function isWebhookTriggerUrl(url, triggerId) {
  if (normalizeUuidOrNull(triggerId) === null) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.pathname === WEBHOOK_TRIGGER_PATH_PREFIX + triggerId + WEBHOOK_FIRE_SUFFIX
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
  for (let [phrase, reason] of TRIGGER_ERROR_PHRASES) if (text.includes(phrase)) return reason;
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
function isPlainWord(word) {
  return word.length <= MAX_PLAIN_WORD_LENGTH && WORD_TOKEN_RE.test(word);
}
//@ chunk-jeazk6wn.js:6460-6513 placement
function isDisplayableToken(token) {
  return token === undefined || (token !== URL_PLACEHOLDER && token !== REDACTED && isPlainWord(token));
}
//@ chunk-jeazk6wn.js:6513-6581 placement
function isAllowableServerToken(word, prev, next) {
  return (
    isPlainWord(word) ||
    PUNCT_TOKEN_RE.test(word) ||
    (NUMBER_TOKEN_RE.test(word) && isDisplayableToken(prev) && isDisplayableToken(next))
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
  let raw = truncateToLength(message, MAX_RAW_MESSAGE);
  let lines = raw
    .split(LINE_BREAK_RE)
    .map((line) => printableText(line.replaceAll("\t", " ")).replace(INVISIBLE_RE, ""));
  if (lines.some((line) => SERVER_MESSAGE_SECRET_RE.test(line))) return;
  let lineIndex = lines.findIndex((line) => line.trim() !== "");
  if (lineIndex === -1) return;
  let firstLine = lines[lineIndex] ?? "";
  let tailTruncated = lineIndex === lines.length - 1 && raw.length < message.length;
  let tokens = firstLine
    .replace(/["`]/g, "'")
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, ` ${URL_PLACEHOLDER} `)
    .split(/\s+/)
    .filter((token) => token !== "");
  if (tailTruncated && tokens.length > 0) tokens[tokens.length - 1] = REDACTED;
  let filtered = tokens
    .map((token, index) =>
      token === URL_PLACEHOLDER || isAllowableServerToken(token, tokens[index - 1], tokens[index + 1])
        ? token
        : REDACTED,
    )
    .filter((token, index, all) => token !== REDACTED || all[index - 1] !== REDACTED);
  if (
    !filtered.some((token) => token !== REDACTED && token !== URL_PLACEHOLDER && !PUNCT_TOKEN_RE.test(token))
  )
    return;
  let joined = filtered.join(" ");
  return joined.length > MAX_SERVER_MESSAGE
    ? `${truncateToLength(joined, MAX_SERVER_MESSAGE - 3)}...`
    : joined;
}
//@ chunk-jeazk6wn.js:7233-7473 placement (2.1.88 match: isToolResultBlockWithContent, 1)
function extractMcpTextContent(obj) {
  let content = "content" in obj ? obj.content : undefined;
  if (!Array.isArray(content)) return "";
  let texts = [];
  for (let item of content)
    if (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      item.type === "text" &&
      "text" in item &&
      typeof item.text === "string"
    )
      texts.push(item.text);
  return texts.join(`
`);
}
//@ chunk-jeazk6wn.js:7473-7633 placement
async function callMcpToolForText(client, name, args) {
  try {
    let result = await callMcpTool(
      client,
      {
        name,
        arguments: args,
      },
      {
        timeout: 15000,
      },
    );
    return {
      isError: "isError" in result && result.isError === true,
      text: extractMcpTextContent(result),
    };
  } catch {
    return null;
  }
}
//@ chunk-jeazk6wn.js:7633-7730 placement
async function unwatchUrlTrigger(client, triggerId) {
  let result = await callMcpToolForText(client, "unwatch_url", {
    trigger_id: triggerId,
  });
  return result !== null && !result.isError;
}
//@ chunk-jeazk6wn.js:7730-8007 placement
async function releaseOrphanTriggers(client) {
  let { durable } = getLiveState();
  let triggerIds = [...durable.orphanTriggers];
  if (triggerIds.length === 0) return;
  let results = await Promise.all(triggerIds.map((triggerId) => unwatchUrlTrigger(client, triggerId)));
  let released = 0;
  triggerIds.forEach((triggerId, index) => {
    if (results[index]) durable.orphanTriggers.delete(triggerId);
    else released++;
  });
  if (released > 0) logFeatureSad("artifact_durable_subscribe", "orphan_trigger_release_failed");
  publishDurableWatchRegistry();
}
//@ chunk-jeazk6wn.js:8007-8232 placement
async function postFrameRelay(url, body, signal, credentials) {
  try {
    let res = await frameApi.postRelayBound(url, body, {
      headers: buildFrameHeaders(),
      timeout: 15000,
      refreshOAuth: true,
      credentials,
      ...(signal && {
        signal,
      }),
    });
    return {
      res,
      relayed: res.route === "relay",
    };
  } catch (error) {
    return {
      res: undefined,
      relayed: threwOnRelayLeg(error),
    };
  }
}
//@ chunk-jeazk6wn.js:8232-8280 placement
function relayedFlag(response) {
  return response.relayed
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
async function watchArtifactDurably(request) {
  let { slug, context, detachedFromUser } = request;
  noteArmInFlight(slug);
  let outcome;
  try {
    let armResult = armOrRefreshWatch(slug, context, detachedFromUser);
    trackPendingOp(armResult);
    outcome = await armResult;
    logWatchOutcome(outcome, getLiveState().durable.claudeDocSlugs.has(slug) || undefined);
    return outcome;
  } finally {
    let registered = registerDurableWatch(slug, outcome);
    try {
      request.onSettled?.(registered);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-jeazk6wn.js:8558-8658 placement
function trackPendingOp(opKey) {
  let { pendingOps } = getLiveState().durable;
  pendingOps.add(opKey);
  let finish = () => void pendingOps.delete(opKey);
  opKey.then(finish, finish);
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
    let existingRow = durableRows().get(slug);
    if (existingRow?.restored && !detachedFromUser) {
      let armResult = await armDurableArtifactWatch(slug, context, false, existingRow);
      if (armResult.outcome === "subscribed") return armResult;
      let result =
        armResult.outcome === "already_watching"
          ? armResult.outcome
          : armResult.outcome === "failed" && armResult.kept
            ? "outcome_unknown"
            : armResult.reason;
      logFeatureSad("artifact_durable_subscribe", `refresh_${result}`);
      logForDebugging(`[artifact] restored durable watch not refreshed: reason=${result}`);
      return alreadyWatchingResult(durableRows().get(slug) ?? existingRow);
    }
    return armDurableArtifactWatch(slug, context, detachedFromUser);
  });
}
//@ chunk-jeazk6wn.js:9146-10017 placement
/**
 * 按持久监听结果打点：subscribed（含评论事件不支持的降级）、already_watching、skipped、failed（区分可预期原因与真正错误，并写调试日志）。
 */
function logWatchOutcome(outcome, context) {
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
      let expected = classifyExpectedWatchFailure(outcome, context);
      let [relayed] = relayedList(outcome);
      let extra = {
        ...(outcome.status !== undefined && {
          status: outcome.status,
        }),
        ...(outcome.gatewayDeclined !== undefined && {
          gateway_declined: outcome.gatewayDeclined,
        }),
        ...relayed,
      };
      let extraList = Object.keys(extra).length > 0 ? [extra] : [];
      if (expected !== undefined) logFeatureSad("artifact_durable_subscribe", expected, ...extraList);
      else logFeatureBad("artifact_durable_subscribe", outcome.reason, extraList[0]);
      let statusText = outcome.status !== undefined ? ` status=${outcome.status}` : "";
      let serverText = outcome.serverMessage !== undefined ? ` server="${outcome.serverMessage}"` : "";
      logForDebugging(`[artifact] durable watch failed: reason=${outcome.reason}${statusText}${serverText}`, {
        level: expected !== undefined ? "debug" : "warn",
      });
      break;
    }
  }
}
//@ chunk-jeazk6wn.js:10017-10422 placement
/**
 * 把预期内的持久监视失败（中断、无发起者、订阅被禁、中继不可用、文档未被接纳）映射为打点原因，非预期返回 undefined。
 */
function classifyExpectedWatchFailure(result, context) {
  switch (result.reason) {
    case "aborted":
      return "aborted";
    case "no_originator":
      return result.latched ? "no_originator_latched" : undefined;
    case "subscribe_forbidden":
      return result.latched ? "subscribe_forbidden_latched" : "subscribe_forbidden";
    case "relay_unavailable":
      return result.latched ? "relay_unavailable_latched" : "relay_unavailable";
    case "subscribe_failed":
      return context && isMissingSessionSubscribe(result) ? "claude_doc_not_admitted" : undefined;
    default:
      return;
  }
}
//@ chunk-jeazk6wn.js:10422-10553 placement
function alreadyWatchingResult(existingRow) {
  return {
    outcome: "already_watching",
    triggerId: existingRow.triggerId,
    since: existingRow.since,
    events: existingRow.events,
    ...(existingRow.restored && {
      restored: true,
    }),
  };
}
//@ chunk-jeazk6wn.js:10553-15052 placement
/**
 * 为 artifact 建立持久关注（durable wake）：校验 slug、去重已有关注、写入存储并启动订阅。
 */
async function armDurableArtifactWatch(slug, context, detachedFromUser, refreshRow) {
  if (!ARTIFACT_SLUG_RE.test(slug))
    return {
      outcome: "failed",
      reason: "invalid_slug",
    };
  let existingRow = durableRows().get(slug);
  if (existingRow && existingRow !== refreshRow) return alreadyWatchingResult(existingRow);
  runCommentMonitorWithIntent({
    storageV5: context.storageV5,
  });
  if (getLiveState().durable.stopLatches.isStopped(slug))
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
  if (detachedFromUser && getLiveState().durable.originatorRefused)
    return {
      outcome: "failed",
      reason: "no_originator",
      latched: true,
    };
  let subscribeBlock = getSubscribeBlock();
  if (detachedFromUser && subscribeBlock)
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
  let withheldReason = detachedFromUser ? getWatchUrlWithheldReason(context.getMcp()) : null;
  if (withheldReason)
    return {
      outcome: "skipped",
      reason: withheldReason,
    };
  let client = await dialWatchServer(
    context.getMcp().clients,
    context.abortController.signal,
    detachedFromUser
      ? {
          detachedFromUser,
        }
      : undefined,
  );
  if (!client) {
    if (!detachedFromUser && context.abortController.signal.aborted)
      return {
        outcome: "failed",
        reason: "aborted",
      };
    return {
      outcome: "skipped",
      reason: "no_wake_minter",
    };
  }
  await releaseOrphanTriggers(client);
  let mintResult = await callMcpToolForText(client, WATCH_URL, {});
  if (!mintResult || mintResult.isError) {
    let serverMessage = mintResult ? sanitizeServerMessage(mintResult.text) : undefined;
    let serverFields =
      serverMessage !== undefined
        ? {
            serverMessage,
          }
        : {};
    if (mintResult && isTriggerLimitMessage(mintResult.text))
      return {
        outcome: "failed",
        reason: "trigger_limit",
        ...serverFields,
      };
    if (mintResult && isNoOriginatorError(mintResult.text)) {
      let durable = getLiveState().durable;
      let originatorRefused = durable.originatorRefused;
      durable.originatorRefused = true;
      return originatorRefused
        ? {
            outcome: "failed",
            reason: "no_originator",
            latched: true,
            ...serverFields,
          }
        : {
            outcome: "failed",
            reason: "no_originator",
            ...serverFields,
          };
    }
    let withheldKind = mintResult ? classifyTriggerError(mintResult.text) : null;
    if (withheldKind) {
      getLiveState().durable.watchUrlWithheld = withheldKind;
      return {
        outcome: "skipped",
        reason: withheldKind,
      };
    }
    return {
      outcome: "failed",
      reason: (mintResult ? classifyTriggerErrorDurable(mintResult.text) : null) ?? "mint_failed",
      ...serverFields,
    };
  }
  let durable = getLiveState().durable;
  durable.originatorRefused = false;
  durable.watchUrlWithheld = null;
  durable.watchUrlGranted = true;
  let triggerResponse = parseTriggerResponse(mintResult.text);
  if (!triggerResponse) {
    let orphanTriggerId = triggerIdOf(mintResult.text);
    if (orphanTriggerId) await unwatchUrlTrigger(client, orphanTriggerId);
    return {
      outcome: "failed",
      reason: "mint_failed",
    };
  }
  if (!isWebhookTriggerUrl(triggerResponse.url, triggerResponse.triggerId)) {
    await unwatchUrlTrigger(client, triggerResponse.triggerId);
    return {
      outcome: "failed",
      reason: "mint_failed",
    };
  }
  if (!detachedFromUser && context.abortController.signal.aborted)
    return {
      outcome: "failed",
      reason: (await unwatchUrlTrigger(client, triggerResponse.triggerId))
        ? "aborted"
        : "watch_trigger_release_failed",
    };
  let status;
  let ok = false;
  let extraFields = {};
  let subscribeForbidden = false;
  let forbiddenLatched = false;
  let failureReason;
  let aborted = false;
  let events = isArtifactsAvailable() ? ALL_WATCH_EVENTS : PUBLISH_ONLY_EVENTS;
  let downgraded = false;
  let subscribePath = `/api/frame/subscribe/${slug}`;
  let relayFamilyKey = frameRelayActive() ? relayFamily("POST", subscribePath) : null;
  let relayActive = frameVerbRelayActive(relayFamilyKey);
  let relayHopFailedBefore = relayFamilyKey !== null && relayHopFailed(relayFamilyKey);
  let postSubscribe = () =>
    postFrameRelay(
      subscribePath,
      {
        url: triggerResponse.url,
        sealed_secret: triggerResponse.sealedSecret,
        events,
      },
      detachedFromUser ? undefined : context.abortController.signal,
      context.credentials,
    );
  let subscribeResult = await postSubscribe();
  if (
    subscribeResult.res?.ok &&
    subscribeResult.res.fromFrame &&
    subscribeResult.res.status === 400 &&
    events.includes("comment")
  ) {
    events = PUBLISH_ONLY_EVENTS;
    downgraded = true;
    subscribeResult = await postSubscribe();
  }
  let relayedFields = relayedFlag(subscribeResult);
  let { res } = subscribeResult;
  if (!res) aborted = !detachedFromUser && context.abortController.signal.aborted;
  else if (res.ok) {
    status = res.status;
    ok = res.status >= 200 && res.status < 300;
    if (!ok) {
      let bodyText = typeof res.data === "string" ? res.data.trim() : undefined;
      let contentType = res.response?.headers?.["content-type"];
      let plainTextBody =
        bodyText !== undefined &&
        bodyText !== "" &&
        !LINE_BREAK_RE.test(bodyText) &&
        !/[<>]/.test(bodyText) &&
        typeof contentType === "string" &&
        contentType.toLowerCase().startsWith("text/plain");
      let denyBody = denyPolicyBody(res.data);
      let hasServerMessage = res.fromFrame && (denyBody !== null || plainTextBody);
      let serverMessage = hasServerMessage
        ? sanitizeServerMessage(denyBody?.error ?? bodyText ?? "")
        : undefined;
      extraFields = {
        ...(!res.fromFrame && {
          fromGateway: true,
        }),
        ...(res.gatewayDeclined !== undefined && {
          gatewayDeclined: res.gatewayDeclined,
        }),
        ...(serverMessage !== undefined && {
          serverMessage,
        }),
      };
      let relayLikely = res.route === "relay" || !(relayHopFailedBefore || res.gatewayDeclined === 0);
      if (
        res.status === 403 &&
        plainTextBody &&
        serverMessage !== undefined &&
        relayLikely &&
        refreshRow === undefined
      ) {
        subscribeForbidden = true;
        forbiddenLatched = durable.subscribeForbidden !== null;
        durable.subscribeForbidden = {
          serverMessage,
          relayActive,
        };
      } else if (
        hasServerMessage &&
        res.status >= 400 &&
        res.status < 500 &&
        res.status !== 401 &&
        res.status !== 403
      )
        clearSubscribeForbidden();
    } else if (res.fromFrame) clearSubscribeForbidden();
    if (res.fromFrame) clearSubscribeUnrelayed();
  } else if (res.reason === "relay-unavailable" || res.reason === "relay-not-served") {
    if (res.status !== 0) {
      failureReason = "relay_unavailable";
      status = res.status;
      extraFields = {
        fromGateway: true,
      };
      if (refreshRow === undefined) {
        forbiddenLatched = durable.subscribeUnrelayed !== null;
        durable.subscribeUnrelayed = {
          status,
        };
      }
    }
  } else failureReason = res.reason === "no-auth" ? "no_auth" : "client_policy";
  if (!ok) {
    let outcomeUnknown = !res || (res.ok && (!res.fromFrame || res.status >= 500));
    if (refreshRow !== undefined && outcomeUnknown) {
      durableRows().set(slug, {
        ...refreshRow,
        unreleased: [...(refreshRow.unreleased ?? []), triggerResponse.triggerId],
      });
      publishDurableWatchRegistry();
      logForDebugging(
        `[artifact] refresh subscribe outcome unknown; keeping trigger ${triggerResponse.triggerId} beside ${refreshRow.triggerId}`,
      );
      return {
        outcome: "failed",
        reason: aborted ? "aborted" : "subscribe_failed",
        status,
        kept: true,
        ...relayedFields,
        ...extraFields,
      };
    }
    let released = await unwatchUrlTrigger(client, triggerResponse.triggerId);
    if (aborted)
      return {
        outcome: "failed",
        reason: released ? "aborted" : "watch_trigger_release_failed",
        ...relayedFields,
      };
    return {
      outcome: "failed",
      reason: failureReason ?? (subscribeForbidden ? "subscribe_forbidden" : "subscribe_failed"),
      status,
      ...relayedFields,
      ...extraFields,
      ...(forbiddenLatched && {
        latched: true,
      }),
    };
  }
  let since = new Date().toISOString();
  durableRows().set(slug, {
    slug,
    triggerId: triggerResponse.triggerId,
    since,
    events,
    ...((durable.claudeDocSlugs.has(slug) || refreshRow?.claudeDoc) && {
      claudeDoc: true,
    }),
  });
  publishDurableWatchRegistry();
  let oldTriggerIds = refreshRow
    ? [refreshRow.triggerId, ...(refreshRow.unreleased ?? [])].filter(
        (triggerId) => triggerId !== triggerResponse.triggerId,
      )
    : [];
  if (
    (await Promise.all(oldTriggerIds.map((triggerId) => unwatchUrlTrigger(client, triggerId)))).includes(
      false,
    )
  )
    logFeatureSad("artifact_durable_subscribe", "superseded_trigger_release_failed");
  return {
    outcome: "subscribed",
    triggerId: triggerResponse.triggerId,
    since,
    events,
    ...(downgraded && {
      downgraded: true,
    }),
    ...relayedFields,
  };
}
//@ chunk-jeazk6wn.js:15052-15277 placement
/**
 * 取消某 artifact 的持久监听：本地没有记录且非远程或 slug 非法时直接返回；否则在串行队列里执行取消。
 */
async function unwatchArtifactDurably(request) {
  let { slug, context } = request;
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
  let unwatchOp = runSerializedForSlug(slug, () => performUnwatch(slug, context));
  trackPendingOp(unwatchOp);
  return unwatchOp;
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
  let aborted = false;
  let relayStatus;
  let statusZero = false;
  let unsubscribeResult = await postFrameRelay(
    `/api/frame/unsubscribe/${slug}`,
    {},
    context.abortController.signal,
    context.credentials,
  );
  let relayedFields = relayedList(relayedFlag(unsubscribeResult));
  let { res } = unsubscribeResult;
  if (!res) aborted = context.abortController.signal.aborted;
  else if (res.ok) {
    unsubscribed = res.status >= 200 && res.status < 300;
    if (res.fromFrame) clearSubscribeUnrelayed();
  } else {
    teardown = "refused";
    if (res.reason === "relay-unavailable" || res.reason === "relay-not-served")
      if (res.status !== 0) relayStatus = res.status;
      else statusZero = true;
  }
  let triggersReleased = true;
  if (row || getLiveState().durable.orphanTriggers.size > 0) {
    let client = await dialWatchServer(context.getMcp().clients, context.abortController.signal, {
      detachedFromUser: true,
    });
    if (row) {
      let triggerIds = [row.triggerId, ...(row.unreleased ?? [])];
      let releaseResults =
        client === null
          ? triggerIds.map(() => false)
          : await Promise.all(triggerIds.map((triggerId) => unwatchUrlTrigger(client, triggerId)));
      triggersReleased = !releaseResults.includes(false);
      let { durable } = getLiveState();
      triggerIds.forEach((triggerId, index) => {
        if (!releaseResults[index]) durable.orphanTriggers.add(triggerId);
      });
      durableRows().delete(slug);
      publishDurableWatchRegistry();
    }
    if (client !== null) await releaseOrphanTriggers(client);
  }
  if (unsubscribed && triggersReleased)
    logFeatureOk("artifact_durable_subscribe", {
      unwatch: true,
      ...relayedFields[0],
    });
  else if (aborted && triggersReleased)
    logFeatureSad("artifact_durable_subscribe", "unwatch_aborted", ...relayedFields);
  else if (relayStatus !== undefined && triggersReleased)
    logFeatureSad("artifact_durable_subscribe", "unwatch_relay_unavailable", {
      status: relayStatus,
      ...relayedFields[0],
    });
  else {
    let leftover =
      res?.ok && !unsubscribed
        ? {
            status: res.status,
            ...relayedFields[0],
          }
        : relayStatus !== undefined
          ? {
              status: relayStatus,
              ...relayedFields[0],
              trigger_release_failed: true,
            }
          : relayedFields[0];
    logFeatureBad(
      "artifact_durable_subscribe",
      unsubscribed
        ? "unwatch_trigger_release_failed"
        : relayStatus !== undefined
          ? "unwatch_relay_unavailable"
          : teardown === "refused" && !statusZero
            ? "unwatch_client_policy"
            : "unwatch_failed",
      ...(leftover ? [leftover] : []),
    );
  }
  return {
    wasWatching: row !== undefined,
    teardown,
  };
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
