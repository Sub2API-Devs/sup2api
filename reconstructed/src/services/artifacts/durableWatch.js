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
  pUs,
  mUs,
  v5,
} from "./commentMonitor.js";
import { gzn } from "./artifactPresence.js";
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
import { mn } from "../../utils/remoteEnvironment.js";
import { isServiceAgentSession } from "../ccrAgentProxy/agentProxy.js";
import { Vt } from "../../utils/agentId.js";
import { truncateToLength, wh } from "../../utils/stringUtils.js";
import { callMcpTool } from "../mcp/mcpWireUtils.js";
import { buildFrameHeaders } from "./frameApi.js";
import { registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { Xb } from "./artifactAvailability.js";
import { denyPolicyBody } from "./publishErrors.js";
import { NGr, setWithLimit, HGr, FGr } from "../../utils/cronTasks.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { isCcrOriginUrl } from "../mcp/ccrMcpUrls.js";

//@ chunk-jeazk6wn.js:1024-1062 placement
function R() {
  return getLiveState().durable.rows;
}
/**
 * 按 slug 串行执行异步操作：排在该 slug 上一个操作之后（无论成败），结束时若自己仍是队尾则清除。
 */
//@ chunk-jeazk6wn.js:1062-1256 placement
async function runSerializedForSlug(e, n) {
  let slugOps = getLiveState().durable.slugOps,
    o = (slugOps.get(e) ?? Promise.resolve()).then(n, n),
    u = o.then(
      () => {
        return;
      },
      () => {
        return;
      },
    );
  slugOps.set(e, u);
  try {
    return await o;
  } finally {
    if (slugOps.get(e) === u) slugOps.delete(e);
  }
}
//@ chunk-jeazk6wn.js:1256-1295 placement
function nWn() {
  return [...R().values()];
}
//@ chunk-jeazk6wn.js:1295-1329 placement
function Hye(e) {
  return R().get(e);
}
//@ chunk-jeazk6wn.js:1329-1358 placement
var ve = [30000, 120000, 600000];
/**
 * 远程环境下用 worker 状态恢复持久评论监听；状态读取失败时打点并按退避重读。
 */
//@ chunk-jeazk6wn.js:1358-1536 placement
function restoreDurableWatches(e, n) {
  if (!env.CLAUDE_CODE_REMOTE || e === null) return;
  if (e.readFailed) {
    if ((logFeatureSad("artifact_durable_subscribe", "registry_unread"), n.reread !== void 0))
      rereadWorkerState(n.reread, n);
    return;
  }
  applyRestoredRegistry(e, n);
}
/**
 * 按退避间隔重读 worker 状态以恢复持久监听：登记表通道已建立则停止；读到有效状态后恢复并打点；全部失败时打点放弃。
 */
//@ chunk-jeazk6wn.js:1536-1952 placement
async function rereadWorkerState(e, n, r = ve) {
  for (let a of r) {
    if ((await sleep(a, void 0, { unref: !0 }), getLiveState().durable.registrySink !== null)) return !0;
    let o;
    try {
      o = await e();
    } catch (error) {
      logForDebugging(`[artifact] worker-state re-read threw: ${String(error)}`);
      continue;
    }
    if (o === null || o.readFailed) continue;
    try {
      applyRestoredRegistry(o, n);
    } catch (error) {
      return (logError(error), !1);
    }
    return (logFeatureOk("artifact_durable_subscribe", { registry_reread: !0 }), !0);
  }
  return (logFeatureSad("artifact_durable_subscribe", "registry_reread_failed"), !1);
}
/**
 * 把上一 worker 纪元保存的持久监听登记表恢复到内存：孤立触发器、各 slug 行（已取消监听的转为孤立；有在途操作的延后恢复）、停止记录；已停止的行退役；随后重新发布登记表并打点。
 */
//@ chunk-jeazk6wn.js:1952-2773 placement
function applyRestoredRegistry(workerState, options) {
  let registry = readCommentMonitorRegistry(workerState.internal?.artifact_durable_watches),
    { durable: durable } = getLiveState();
  for (let o of registry?.orphans ?? []) durable.orphanTriggers.add(o);
  for (let o of registry?.rows ?? []) {
    if (durable.unwatchedSlugs.has(o.slug) && !durable.rows.has(o.slug)) {
      restoreRow(o);
      continue;
    }
    if (durable.slugOps.has(o.slug)) {
      (durable.pendingRestoredRows.set(o.slug, o),
        trackPendingOp(
          runSerializedForSlug(o.slug, async () => {
            (durable.pendingRestoredRows.delete(o.slug), restoreRow(o), publishDurableWatchRegistry());
          }),
        ));
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
  if ((pUs(options.sink), registry !== null)) mUs();
  if ((publishDurableWatchRegistry(), registry !== null && registry.rows.length + registry.stopped.size > 0))
    (logFeatureOk("artifact_durable_subscribe", {
      restored_rows: registry.rows.length,
      restored_stops: registry.stopped.size,
    }),
      logForDebugging(
        `[artifact] restored ${registry.rows.length} durable watch row(s) and ${registry.stopped.size} stop(s) from prior worker epoch`,
      ));
}
/**
 * 退役已停止的持久监视行：删除该行、标记为未监视并把相关触发器加入孤儿列表；若该 slug 有进行中的操作则排队执行。
 */
//@ chunk-jeazk6wn.js:2773-3118 placement
function retireStoppedRow(e) {
  let { durable: durable } = getLiveState(),
    r = () => {
      let a = durable.rows.get(e);
      if (a === void 0 || !durable.stopLatches.isStopped(e)) return;
      (durable.rows.delete(e), durable.unwatchedSlugs.add(e));
      for (let o of [a.triggerId, ...(a.unreleased ?? [])]) durable.orphanTriggers.add(o);
      logFeatureSad("artifact_durable_subscribe", "restored_stop_retired_row");
    };
  if (durable.slugOps.has(e)) {
    trackPendingOp(
      runSerializedForSlug(e, async () => {
        (r(), publishDurableWatchRegistry());
      }),
    );
    return;
  }
  r();
}
/**
 * 恢复一条持久监听行：已有行、已取消或已停止时把其触发器记为孤立（必要时补 claudeDoc 标记），否则以 restored 写入。
 */
//@ chunk-jeazk6wn.js:3118-3483 placement
function restoreRow(e) {
  let { durable: durable } = getLiveState();
  if (e.claudeDoc) gzn(e.slug);
  let r = durable.rows.get(e.slug);
  if (r !== void 0 || durable.unwatchedSlugs.has(e.slug) || durable.stopLatches.isStopped(e.slug)) {
    for (let a of [e.triggerId, ...(e.unreleased ?? [])])
      if (a !== r?.triggerId) durable.orphanTriggers.add(a);
    if (r !== void 0 && e.claudeDoc) durable.rows.set(e.slug, { ...r, claudeDoc: !0 });
    return;
  }
  durable.rows.set(e.slug, { ...e, restored: !0 });
}
//@ chunk-jeazk6wn.js:3483-3581 placement
function se(e) {
  let n = getServerUrl(e);
  if (!n) return null;
  let r = getEnsureConnectedClient();
  if (!r) return null;
  return { found: n, dial: r };
}
//@ chunk-jeazk6wn.js:3581-3617 placement
function _0s(e) {
  return se(e) !== null;
}
//@ chunk-jeazk6wn.js:3617-3773 placement
async function dialWatchServer(e, n, r) {
  let a = se(e);
  if (!a) return null;
  try {
    return await a.dial(a.found, r?.detachedFromUser ? { timeoutMs: 15000 } : { signal: n });
  } catch {
    return null;
  }
}
//@ chunk-jeazk6wn.js:3773-3863 placement
function x(e, n) {
  let match = new RegExp(`^${n}:\\s*(\\S+)`, "m").exec(e);
  return match && match[1] ? match[1] : null;
}
//@ chunk-jeazk6wn.js:3863-4005 placement
function parseTriggerResponse(e) {
  let n = x(e, "url"),
    r = x(e, "trigger_id"),
    a = x(e, "sealed_secret");
  if (!n || !r || !a) return null;
  return { url: n, triggerId: r, sealedSecret: a };
}
//@ chunk-jeazk6wn.js:4005-4045 placement
function Ee(e) {
  return x(e, "trigger_id");
}
/**
 * 会话 webhook 触发器路径前后缀与持久监听的事件类型（全部 / 仅 published）。
 */
//@ chunk-jeazk6wn.js:4045-4148 placement
var WEBHOOK_TRIGGER_PATH_PREFIX = "/integrations/v1/code/webhook-triggers/",
  WEBHOOK_FIRE_SUFFIX = "/fire",
  ALL_WATCH_EVENTS = ["published", "comment"],
  PUBLISH_ONLY_EVENTS = ["published"];
//@ chunk-jeazk6wn.js:4148-4209 placement
function b0s() {
  return env.CLAUDE_CODE_REMOTE ? null : "not_remote";
}
/**
 * 返回持久监听被锁存阻止的原因：订阅被禁止（中继已可用时先解除）或中继不可用；否则 null。
 */
//@ chunk-jeazk6wn.js:4209-4449 placement
function getSubscribeBlock() {
  let durable = getLiveState().durable,
    subscribeForbidden = durable.subscribeForbidden;
  if (subscribeForbidden)
    if (!subscribeForbidden.relayActive && frameVerbRelayActive(SUBSCRIPTIONS_RELAY_FAMILY))
      clearSubscribeForbidden();
    else return { reason: "subscribe_forbidden", serverMessage: subscribeForbidden.serverMessage };
  let subscribeUnrelayed = durable.subscribeUnrelayed;
  return subscribeUnrelayed ? { reason: "relay_unavailable", ...subscribeUnrelayed } : null;
}
//@ chunk-jeazk6wn.js:4449-4572 placement
function clearSubscribeForbidden() {
  let durable = getLiveState().durable;
  if (durable.subscribeForbidden === null) return;
  ((durable.subscribeForbidden = null), clearArmFailuresFor("subscribe_forbidden"));
}
//@ chunk-jeazk6wn.js:4572-4694 placement
function clearSubscribeUnrelayed() {
  let durable = getLiveState().durable;
  if (durable.subscribeUnrelayed === null) return;
  ((durable.subscribeUnrelayed = null), clearArmFailuresFor("relay_unavailable"));
}
//@ chunk-jeazk6wn.js:4694-4713 placement
var WATCH_URL = "watch_url";
//@ chunk-jeazk6wn.js:4713-4851 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(e, n) {
  let r = !1;
  for (let a of e) {
    if (a.mcpInfo?.serverName !== n) continue;
    if (a.mcpInfo.toolName === WATCH_URL) return !0;
    r = !0;
  }
  return r ? !1 : null;
}
//@ chunk-jeazk6wn.js:4851-4903 placement
function Gko() {
  return (
    mn() &&
    frameRelayActive() &&
    !frameVerbRelayActive(SUBSCRIPTIONS_RELAY_FAMILY) &&
    !isServiceAgentSession()
  );
}
/**
 * 远程环境下判断监听 URL 是否不可用：已记录的原因，或会话服务器已连接但没有提供监听工具（tool_not_offered）。
 */
//@ chunk-jeazk6wn.js:4903-5183 placement
function getWatchUrlWithheldReason(e) {
  if (!env.CLAUDE_CODE_REMOTE) return null;
  let { watchUrlWithheld: watchUrlWithheld, watchUrlGranted: watchUrlGranted } = getLiveState().durable;
  if (watchUrlWithheld) return watchUrlWithheld;
  if (watchUrlGranted) return null;
  let a = getServerUrl(e.clients);
  return (a?.type === "connected" || (a?.type === "cached" && a.listedByHost === !0)) &&
    getToolNameForPermissionCheck(e.tools, a.name) === !1
    ? "tool_not_offered"
    : null;
}
//@ chunk-jeazk6wn.js:5183-5376 placement
function isWebhookTriggerUrl(e, n) {
  if (Vt(n) === null) return !1;
  let r;
  try {
    r = new URL(e);
  } catch {
    return !1;
  }
  return (
    r.protocol === "https:" &&
    r.username === "" &&
    r.password === "" &&
    r.search === "" &&
    r.hash === "" &&
    r.pathname === WEBHOOK_TRIGGER_PATH_PREFIX + n + WEBHOOK_FIRE_SUFFIX
  );
}
//@ chunk-jeazk6wn.js:5376-5484 placement
function isTriggerLimitMessage(e) {
  return e.includes("trigger limit reached") || e.includes("maximum number of webhook triggers");
}
//@ chunk-jeazk6wn.js:5484-5557 placement
function Oe(e) {
  return e.includes("a session with an originator account");
}
/**
 * 把创建触发器的错误文本归类为工具不可用、会话绑定桌面设备或组织未开启，未知返回 null。
 */
//@ chunk-jeazk6wn.js:5557-5889 placement
function classifyTriggerError(e) {
  if (e.includes("tool is not available to this session")) return "tool_not_offered";
  if (e.includes("bound to a desktop device")) return "session_device_bound";
  if (
    e.includes("tool is not enabled for this organization") ||
    e.includes("Session webhooks are not enabled for this organization")
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
function Ue(e) {
  for (let [n, r] of TRIGGER_ERROR_PHRASES) if (e.includes(n)) return r;
  return null;
}
/**
 * 服务端消息清洗用的常量：长度上限、可保留的英文词/数字/标点正则、不可见字符正则、换行正则与 [redacted]/[url] 占位。
 */
//@ chunk-jeazk6wn.js:6097-6413 placement
var MAX_SERVER_MESSAGE = 160,
  WORD_TOKEN_RE = /^[('\[]?[A-Za-z_]+(?:[-'][A-Za-z_]+)?[\])'.,;:!?]*$/,
  MAX_PLAIN_WORD_LENGTH = 40,
  NUMBER_TOKEN_RE = /^[(']?\d{1,5}[)'.,;:!?%]*$/,
  PUNCT_TOKEN_RE = /^[-\u2013\u2014.,;:!?()]{1,3}$/,
  INVISIBLE_RE =
    /(?!\u0020)\p{Zs}|[\p{M}\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/gu,
  LINE_BREAK_RE = /\r\n|[\n\v\f\r\u0085\u2028\u2029]/,
  REDACTED = "[redacted]",
  URL_PLACEHOLDER = "[url]",
  MAX_RAW_MESSAGE = 2048;
//@ chunk-jeazk6wn.js:6413-6460 placement
function fe(e) {
  return e.length <= MAX_PLAIN_WORD_LENGTH && WORD_TOKEN_RE.test(e);
}
//@ chunk-jeazk6wn.js:6460-6513 placement
function Q(e) {
  return e === void 0 || (e !== URL_PLACEHOLDER && e !== REDACTED && fe(e));
}
//@ chunk-jeazk6wn.js:6513-6581 placement
function Ge(e, n, r) {
  return fe(e) || PUNCT_TOKEN_RE.test(e) || (NUMBER_TOKEN_RE.test(e) && Q(n) && Q(r));
}
//@ chunk-jeazk6wn.js:6581-6645 placement
var te = /(?:^|[^A-Za-z_])(url|trigger_id)[ \t]*:|sealed_secret/i;
/**
 * 把服务端错误消息清洗成可展示的一行：只取第一个非空行，URL 换成 [url]，不像普通词/数字/标点的词换成 [redacted]（合并连续），没有实质内容时返回 undefined，超长截断。
 */
//@ chunk-jeazk6wn.js:6645-7233 placement
function sanitizeServerMessage(message) {
  if (te.test(message)) return;
  let n = truncateToLength(message, MAX_RAW_MESSAGE),
    lines = n.split(LINE_BREAK_RE).map((s) => wh(s.replaceAll("\t", " ")).replace(INVISIBLE_RE, ""));
  if (lines.some((s) => te.test(s))) return;
  let lineIndex = lines.findIndex((s) => s.trim() !== "");
  if (lineIndex === -1) return;
  let o = lines[lineIndex] ?? "",
    u = lineIndex === lines.length - 1 && n.length < message.length,
    tokens = o
      .replace(/["`]/g, "'")
      .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, ` ${URL_PLACEHOLDER} `)
      .split(/\s+/)
      .filter((s) => s !== "");
  if (u && tokens.length > 0) tokens[tokens.length - 1] = REDACTED;
  let filtered = tokens
    .map((s, c) => (s === URL_PLACEHOLDER || Ge(s, tokens[c - 1], tokens[c + 1]) ? s : REDACTED))
    .filter((s, c, y) => s !== REDACTED || y[c - 1] !== REDACTED);
  if (!filtered.some((s) => s !== REDACTED && s !== URL_PLACEHOLDER && !PUNCT_TOKEN_RE.test(s))) return;
  let joined = filtered.join(" ");
  return joined.length > MAX_SERVER_MESSAGE
    ? `${truncateToLength(joined, MAX_SERVER_MESSAGE - 3)}...`
    : joined;
}
//@ chunk-jeazk6wn.js:7233-7473 placement = isToolResultBlockWithContent (1)
function extractMcpTextContent(obj) {
  let n = "content" in obj ? obj.content : void 0;
  if (!Array.isArray(n)) return "";
  let r = [];
  for (let a of n)
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
async function callMcpToolForText(e, n, r) {
  try {
    let a = await callMcpTool(e, { name: n, arguments: r }, { timeout: 15000 });
    return { isError: "isError" in a && a.isError === !0, text: extractMcpTextContent(a) };
  } catch {
    return null;
  }
}
//@ chunk-jeazk6wn.js:7633-7730 placement
async function unwatchUrlTrigger(e, n) {
  let r = await callMcpToolForText(e, "unwatch_url", { trigger_id: n });
  return r !== null && !r.isError;
}
//@ chunk-jeazk6wn.js:7730-8007 placement
async function releaseOrphanTriggers(e) {
  let { durable: durable } = getLiveState(),
    r = [...durable.orphanTriggers];
  if (r.length === 0) return;
  let results = await Promise.all(r.map((u) => unwatchUrlTrigger(e, u))),
    o = 0;
  if (
    (r.forEach((u, b) => {
      if (results[b]) durable.orphanTriggers.delete(u);
      else o++;
    }),
    o > 0)
  )
    logFeatureSad("artifact_durable_subscribe", "orphan_trigger_release_failed");
  publishDurableWatchRegistry();
}
//@ chunk-jeazk6wn.js:8007-8232 placement
async function postFrameRelay(e, n, r, a) {
  try {
    let postRelayBound = await frameApi.postRelayBound(e, n, {
      headers: buildFrameHeaders(),
      timeout: 15000,
      refreshOAuth: !0,
      credentials: a,
      ...(r && { signal: r }),
    });
    return { res: postRelayBound, relayed: postRelayBound.route === "relay" };
  } catch (error) {
    return { res: void 0, relayed: threwOnRelayLeg(error) };
  }
}
//@ chunk-jeazk6wn.js:8232-8280 placement
function pe(e) {
  return e.relayed ? { relayed: !0 } : {};
}
//@ chunk-jeazk6wn.js:8280-8327 placement
function U(e) {
  return e.relayed ? [{ relay: !0 }] : [];
}
/**
 * 为 artifact 建立持久评论监听（串行、登记为在途操作），按结果打点，结束时登记监听并回调 onSettled。
 */
//@ chunk-jeazk6wn.js:8327-8558 placement
async function watchArtifactDurably(e) {
  let { slug: slug, context: context, detachedFromUser: detachedFromUser } = e;
  FFs(slug);
  let o;
  try {
    let u = armOrRefreshWatch(slug, context, detachedFromUser);
    return (
      trackPendingOp(u),
      (o = await u),
      logWatchOutcome(o, getLiveState().durable.claudeDocSlugs.has(slug) || void 0),
      o
    );
  } finally {
    let u = registerDurableWatch(slug, o);
    try {
      e.onSettled?.(u);
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-jeazk6wn.js:8558-8658 placement
function trackPendingOp(e) {
  let { pendingOps: pendingOps } = getLiveState().durable;
  pendingOps.add(e);
  let r = () => void pendingOps.delete(e);
  (e.then(r, r), registerPreExitFlush(Ve));
}
//@ chunk-jeazk6wn.js:8658-8741 placement
async function Ve() {
  await withDeadline(Promise.allSettled([...getLiveState().durable.pendingOps]), 1e4);
}
/**
 * 在 slug 串行队列里建立持久监听；已从旧纪元恢复的行先尝试刷新，失败时打点并保持已有监听。
 */
//@ chunk-jeazk6wn.js:8741-9146 placement
async function armOrRefreshWatch(e, n, r) {
  return runSerializedForSlug(e, async () => {
    let a = R().get(e);
    if (a?.restored && !r) {
      let o = await armDurableArtifactWatch(e, n, !1, a);
      if (o.outcome === "subscribed") return o;
      let u =
        o.outcome === "already_watching"
          ? o.outcome
          : o.outcome === "failed" && o.kept
            ? "outcome_unknown"
            : o.reason;
      return (
        logFeatureSad("artifact_durable_subscribe", `refresh_${u}`),
        logForDebugging(`[artifact] restored durable watch not refreshed: reason=${u}`),
        alreadyWatchingResult(R().get(e) ?? a)
      );
    }
    return armDurableArtifactWatch(e, n, r);
  });
}
/**
 * 按持久监听结果打点：subscribed（含评论事件不支持的降级）、already_watching、skipped、failed（区分可预期原因与真正错误，并写调试日志）。
 */
//@ chunk-jeazk6wn.js:9146-10017 placement
function logWatchOutcome(outcome, n) {
  switch (outcome.outcome) {
    case "subscribed":
      if (outcome.downgraded) {
        logFeatureSad("artifact_durable_subscribe", "comment_events_unsupported", ...U(outcome));
        break;
      }
      logFeatureOk("artifact_durable_subscribe", ...U(outcome));
      break;
    case "already_watching":
      logFeatureOk("artifact_durable_subscribe", {
        already_watching: !0,
        ...(outcome.restored && { restored: !0 }),
      });
      break;
    case "skipped":
      logFeatureSad("artifact_durable_subscribe", outcome.reason);
      break;
    case "failed": {
      let r = classifyExpectedWatchFailure(outcome, n),
        [a] = U(outcome),
        o = {
          ...(outcome.status !== void 0 && { status: outcome.status }),
          ...(outcome.gatewayDeclined !== void 0 && { gateway_declined: outcome.gatewayDeclined }),
          ...a,
        },
        u = Object.keys(o).length > 0 ? [o] : [];
      if (r !== void 0) logFeatureSad("artifact_durable_subscribe", r, ...u);
      else logFeatureBad("artifact_durable_subscribe", outcome.reason, u[0]);
      let b = outcome.status !== void 0 ? ` status=${outcome.status}` : "",
        h = outcome.serverMessage !== void 0 ? ` server="${outcome.serverMessage}"` : "";
      logForDebugging(`[artifact] durable watch failed: reason=${outcome.reason}${b}${h}`, {
        level: r !== void 0 ? "debug" : "warn",
      });
      break;
    }
  }
}
/**
 * 把预期内的持久监视失败（中断、无发起者、订阅被禁、中继不可用、文档未被接纳）映射为打点原因，非预期返回 undefined。
 */
//@ chunk-jeazk6wn.js:10017-10422 placement
function classifyExpectedWatchFailure(e, n) {
  switch (e.reason) {
    case "aborted":
      return "aborted";
    case "no_originator":
      return e.latched ? "no_originator_latched" : void 0;
    case "subscribe_forbidden":
      return e.latched ? "subscribe_forbidden_latched" : "subscribe_forbidden";
    case "relay_unavailable":
      return e.latched ? "relay_unavailable_latched" : "relay_unavailable";
    case "subscribe_failed":
      return n && iRo(e) ? "claude_doc_not_admitted" : void 0;
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
    ...(e.restored && { restored: !0 }),
  };
}
/**
 * 为 artifact 建立持久关注（durable wake）：校验 slug、去重已有关注、写入存储并启动订阅。
 */
//@ chunk-jeazk6wn.js:10553-15052 placement
async function armDurableArtifactWatch(e, n, r, a) {
  if (!ARTIFACT_SLUG_RE.test(e)) return { outcome: "failed", reason: "invalid_slug" };
  let o = R().get(e);
  if (o && o !== a) return alreadyWatchingResult(o);
  if ((v5({ storageV5: n.storageV5 }), getLiveState().durable.stopLatches.isStopped(e)))
    return { outcome: "skipped", reason: "stop_latched" };
  if (isEssentialTrafficOnly() || getAPIProvider() !== "firstParty")
    return { outcome: "failed", reason: "client_policy" };
  if (Gko()) return { outcome: "skipped", reason: "relay_not_served" };
  if (r && getLiveState().durable.originatorRefused)
    return { outcome: "failed", reason: "no_originator", latched: !0 };
  let u = getSubscribeBlock();
  if (r && u)
    return u.reason === "subscribe_forbidden"
      ? { outcome: "failed", reason: "subscribe_forbidden", latched: !0, serverMessage: u.serverMessage }
      : {
          outcome: "failed",
          reason: "relay_unavailable",
          latched: !0,
          status: u.status,
          relayed: !0,
          fromGateway: !0,
        };
  let b = r ? getWatchUrlWithheldReason(n.getMcp()) : null;
  if (b) return { outcome: "skipped", reason: b };
  let h = await dialWatchServer(
    n.getMcp().clients,
    n.abortController.signal,
    r ? { detachedFromUser: r } : void 0,
  );
  if (!h) {
    if (!r && n.abortController.signal.aborted) return { outcome: "failed", reason: "aborted" };
    return { outcome: "skipped", reason: "no_wake_minter" };
  }
  await releaseOrphanTriggers(h);
  let p = await callMcpToolForText(h, WATCH_URL, {});
  if (!p || p.isError) {
    let _ = p ? sanitizeServerMessage(p.text) : void 0,
      v = _ !== void 0 ? { serverMessage: _ } : {};
    if (p && isTriggerLimitMessage(p.text)) return { outcome: "failed", reason: "trigger_limit", ...v };
    if (p && Oe(p.text)) {
      let durable = getLiveState().durable,
        originatorRefused = durable.originatorRefused;
      return (
        (durable.originatorRefused = !0),
        originatorRefused
          ? { outcome: "failed", reason: "no_originator", latched: !0, ...v }
          : { outcome: "failed", reason: "no_originator", ...v }
      );
    }
    let E = p ? classifyTriggerError(p.text) : null;
    if (E) return ((getLiveState().durable.watchUrlWithheld = E), { outcome: "skipped", reason: E });
    return { outcome: "failed", reason: (p ? Ue(p.text) : null) ?? "mint_failed", ...v };
  }
  let durable = getLiveState().durable;
  ((durable.originatorRefused = !1), (durable.watchUrlWithheld = null), (durable.watchUrlGranted = !0));
  let c = parseTriggerResponse(p.text);
  if (!c) {
    let _ = Ee(p.text);
    if (_) await unwatchUrlTrigger(h, _);
    return { outcome: "failed", reason: "mint_failed" };
  }
  if (!isWebhookTriggerUrl(c.url, c.triggerId))
    return (await unwatchUrlTrigger(h, c.triggerId), { outcome: "failed", reason: "mint_failed" });
  if (!r && n.abortController.signal.aborted)
    return {
      outcome: "failed",
      reason: (await unwatchUrlTrigger(h, c.triggerId)) ? "aborted" : "watch_trigger_release_failed",
    };
  let y,
    w = !1,
    S = {},
    A = !1,
    P = !1,
    D,
    T = !1,
    I = Xb() ? ALL_WATCH_EVENTS : PUBLISH_ONLY_EVENTS,
    V = !1,
    K = `/api/frame/subscribe/${e}`,
    B = frameRelayActive() ? relayFamily("POST", K) : null,
    he = frameVerbRelayActive(B),
    ye = B !== null && relayHopFailed(B),
    Y = () =>
      postFrameRelay(
        K,
        { url: c.url, sealed_secret: c.sealedSecret, events: I },
        r ? void 0 : n.abortController.signal,
        n.credentials,
      ),
    M = await Y();
  if (M.res?.ok && M.res.fromFrame && M.res.status === 400 && I.includes("comment"))
    ((I = PUBLISH_ONLY_EVENTS), (V = !0), (M = await Y()));
  let O = pe(M),
    { res: res } = M;
  if (!res) T = !r && n.abortController.signal.aborted;
  else if (res.ok) {
    if (((y = res.status), (w = res.status >= 200 && res.status < 300), !w)) {
      let _ = typeof res.data === "string" ? res.data.trim() : void 0,
        v = res.response?.headers?.["content-type"],
        E =
          _ !== void 0 &&
          _ !== "" &&
          !LINE_BREAK_RE.test(_) &&
          !/[<>]/.test(_) &&
          typeof v === "string" &&
          v.toLowerCase().startsWith("text/plain"),
        z = denyPolicyBody(res.data),
        F = res.fromFrame && (z !== null || E),
        W = F ? sanitizeServerMessage(z?.error ?? _ ?? "") : void 0;
      S = {
        ...(!res.fromFrame && { fromGateway: !0 }),
        ...(res.gatewayDeclined !== void 0 && { gatewayDeclined: res.gatewayDeclined }),
        ...(W !== void 0 && { serverMessage: W }),
      };
      let Re = res.route === "relay" || !(ye || res.gatewayDeclined === 0);
      if (res.status === 403 && E && W !== void 0 && Re && a === void 0)
        ((A = !0),
          (P = durable.subscribeForbidden !== null),
          (durable.subscribeForbidden = { serverMessage: W, relayActive: he }));
      else if (F && res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)
        clearSubscribeForbidden();
    } else if (res.fromFrame) clearSubscribeForbidden();
    if (res.fromFrame) clearSubscribeUnrelayed();
  } else if (res.reason === "relay-unavailable" || res.reason === "relay-not-served") {
    if (res.status !== 0) {
      if (((D = "relay_unavailable"), (y = res.status), (S = { fromGateway: !0 }), a === void 0))
        ((P = durable.subscribeUnrelayed !== null), (durable.subscribeUnrelayed = { status: y }));
    }
  } else D = res.reason === "no-auth" ? "no_auth" : "client_policy";
  if (!w) {
    let _ = !res || (res.ok && (!res.fromFrame || res.status >= 500));
    if (a !== void 0 && _)
      return (
        R().set(e, { ...a, unreleased: [...(a.unreleased ?? []), c.triggerId] }),
        publishDurableWatchRegistry(),
        logForDebugging(
          `[artifact] refresh subscribe outcome unknown; keeping trigger ${c.triggerId} beside ${a.triggerId}`,
        ),
        { outcome: "failed", reason: T ? "aborted" : "subscribe_failed", status: y, kept: !0, ...O, ...S }
      );
    let v = await unwatchUrlTrigger(h, c.triggerId);
    if (T) return { outcome: "failed", reason: v ? "aborted" : "watch_trigger_release_failed", ...O };
    return {
      outcome: "failed",
      reason: D ?? (A ? "subscribe_forbidden" : "subscribe_failed"),
      status: y,
      ...O,
      ...S,
      ...(P && { latched: !0 }),
    };
  }
  let iso = new Date().toISOString();
  (R().set(e, {
    slug: e,
    triggerId: c.triggerId,
    since: iso,
    events: I,
    ...((durable.claudeDocSlugs.has(e) || a?.claudeDoc) && { claudeDoc: !0 }),
  }),
    publishDurableWatchRegistry());
  let we = a ? [a.triggerId, ...(a.unreleased ?? [])].filter((_) => _ !== c.triggerId) : [];
  if ((await Promise.all(we.map((_) => unwatchUrlTrigger(h, _)))).includes(!1))
    logFeatureSad("artifact_durable_subscribe", "superseded_trigger_release_failed");
  return {
    outcome: "subscribed",
    triggerId: c.triggerId,
    since: iso,
    events: I,
    ...(V && { downgraded: !0 }),
    ...O,
  };
}
/**
 * 取消某 artifact 的持久监听：本地没有记录且非远程或 slug 非法时直接返回；否则在串行队列里执行取消。
 */
//@ chunk-jeazk6wn.js:15052-15277 placement
async function unwatchArtifactDurably(e) {
  let { slug: slug, context: context } = e;
  if ((lRo(slug), !R().has(slug) && !env.CLAUDE_CODE_REMOTE)) return { wasWatching: !1, teardown: "unsent" };
  if (!ARTIFACT_SLUG_RE.test(slug)) return { wasWatching: !1, teardown: "unsent" };
  let a = runSerializedForSlug(slug, () => performUnwatch(slug, context));
  return (trackPendingOp(a), a);
}
/**
 * 执行取消持久监听：调用 unsubscribe 接口，释放该 slug 的 webhook 触发器（失败的记为孤立）并释放其他孤立触发器，更新登记表，按结果打点；返回之前是否在监听与请求是否发出。
 */
//@ chunk-jeazk6wn.js:15277-16651 placement
async function performUnwatch(slug, context) {
  let row = R().get(slug);
  getLiveState().durable.unwatchedSlugs.add(slug);
  let unsubscribed = !1,
    teardown = "dispatched",
    u = !1,
    relayStatus,
    h = !1,
    p = await postFrameRelay(
      `/api/frame/unsubscribe/${slug}`,
      {},
      context.abortController.signal,
      context.credentials,
    ),
    s = U(pe(p)),
    { res: res } = p;
  if (!res) u = context.abortController.signal.aborted;
  else if (res.ok) {
    if (((unsubscribed = res.status >= 200 && res.status < 300), res.fromFrame)) clearSubscribeUnrelayed();
  } else if (
    ((teardown = "refused"), res.reason === "relay-unavailable" || res.reason === "relay-not-served")
  )
    if (res.status !== 0) relayStatus = res.status;
    else h = !0;
  let triggersReleased = !0;
  if (row || getLiveState().durable.orphanTriggers.size > 0) {
    let w = await dialWatchServer(context.getMcp().clients, context.abortController.signal, {
      detachedFromUser: !0,
    });
    if (row) {
      let S = [row.triggerId, ...(row.unreleased ?? [])],
        A = w === null ? S.map(() => !1) : await Promise.all(S.map((D) => unwatchUrlTrigger(w, D)));
      triggersReleased = !A.includes(!1);
      let { durable: durable } = getLiveState();
      (S.forEach((D, T) => {
        if (!A[T]) durable.orphanTriggers.add(D);
      }),
        R().delete(slug),
        publishDurableWatchRegistry());
    }
    if (w !== null) await releaseOrphanTriggers(w);
  }
  if (unsubscribed && triggersReleased) logFeatureOk("artifact_durable_subscribe", { unwatch: !0, ...s[0] });
  else if (u && triggersReleased) logFeatureSad("artifact_durable_subscribe", "unwatch_aborted", ...s);
  else if (relayStatus !== void 0 && triggersReleased)
    logFeatureSad("artifact_durable_subscribe", "unwatch_relay_unavailable", {
      status: relayStatus,
      ...s[0],
    });
  else {
    let w =
      res?.ok && !unsubscribed
        ? { status: res.status, ...s[0] }
        : relayStatus !== void 0
          ? { status: relayStatus, ...s[0], trigger_release_failed: !0 }
          : s[0];
    logFeatureBad(
      "artifact_durable_subscribe",
      unsubscribed
        ? "unwatch_trigger_release_failed"
        : relayStatus !== void 0
          ? "unwatch_relay_unavailable"
          : teardown === "refused" && !h
            ? "unwatch_client_policy"
            : "unwatch_failed",
      ...(w ? [w] : []),
    );
  }
  return { wasWatching: row !== void 0, teardown: teardown };
}
/**
 * 持久唤醒订阅失败的提示文本表
 */
//@ chunk-aqdf5t3e.js:2072-5524 placement
var DURABLE_WATCH_ERRORS =
    "Could not register a durable wake subscription; publishing and reading still work.",
  ai = {
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
  },
  ui = new Map(Object.entries(ai));
/**
 * 生成持久监视错误的说明，附上服务端返回的消息（必要时补句号）。
 */
//@ chunk-aqdf5t3e.js:5524-5660 placement
function describeWatchError(e, n) {
  let r = ui.get(e) ?? DURABLE_WATCH_ERRORS;
  if (n === void 0) return r;
  let s = /[.!?]['")\]]*$/.test(n) ? "" : ".";
  return `${r} Server said: "${n}"${s}`;
}
/**
 * 描述监听请求失败的 HTTP 来源：经会话网关（是否归因到 artifact 服务）、直连，或在网关未应答/拒绝后直连。
 */
//@ chunk-aqdf5t3e.js:5660-6213 placement
function describeWatchHttpStatus(e) {
  if (e.status === void 0) return;
  if (e.relayed)
    return e.fromGateway
      ? `HTTP ${e.status} via the session gateway, not attributed to the artifact service`
      : `HTTP ${e.status} from the artifact service via the session gateway`;
  if (e.gatewayDeclined === void 0) return `HTTP ${e.status} from the artifact service`;
  return e.gatewayDeclined === 0
    ? `HTTP ${e.status} direct from the artifact service, after the session gateway did not answer`
    : `HTTP ${e.status} direct from the artifact service, after the session gateway declined with HTTP ${e.gatewayDeclined}`;
}
//@ chunk-aqdf5t3e.js:6213-6298 placement
function iRo(e) {
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
function bDr(e) {
  return EXPECTED_WATCH_FAILURES.has(e) ? null : NGr;
}
//@ chunk-aqdf5t3e.js:6584-6658 placement
function FFs(e) {
  let { armsInFlight: armsInFlight } = getLiveState().durable;
  armsInFlight.set(e, (armsInFlight.get(e) ?? 0) + 1);
}
//@ chunk-aqdf5t3e.js:6658-7442 placement
function registerDurableWatch(e, n) {
  let durable = getLiveState().durable,
    s = (durable.armsInFlight.get(e) ?? 1) - 1;
  if (s > 0) durable.armsInFlight.set(e, s);
  else durable.armsInFlight.delete(e);
  if (n?.outcome === "subscribed" || n?.outcome === "already_watching")
    return (lRo(e), { settled: "registered" });
  let h = n === void 0 ? "arm_threw" : n.reason;
  if (h === "stop_latched" || durable.stopLatches.isStopped(e)) return { settled: "stopped" };
  let a = durable.armOutcomes.get(e),
    d = n?.outcome === "failed" && n.latched && a?.reason === h ? a : void 0,
    b = (n?.outcome === "failed" ? describeWatchHttpStatus(n) : void 0) ?? d?.detail,
    w = (n?.outcome === "failed" ? n.serverMessage : void 0) ?? d?.serverMessage,
    S = { reason: h, ...(b !== void 0 && { detail: b }), ...(w !== void 0 && { serverMessage: w }) };
  return (
    setWithLimit(durable.armOutcomes, e, { ...S, at: Date.now() }, HGr),
    s > 0
      ? { settled: "pending", ...S }
      : { settled: "unregistered", ...S, ...(n?.outcome === "failed" && iRo(n) && { refusedByFrame: !0 }) }
  );
}
//@ chunk-aqdf5t3e.js:7442-7638 placement
function clearArmFailuresFor(e) {
  let durable = getLiveState().durable;
  for (let [r, s] of durable.armOutcomes) if (s.reason === e) durable.armOutcomes.delete(r);
  for (let announcedArmFailure of durable.announcedArmFailures)
    if (announcedArmFailure.endsWith(`:${e}`)) durable.announcedArmFailures.delete(announcedArmFailure);
}
//@ chunk-aqdf5t3e.js:7638-7727 placement
function lRo(e) {
  let durable = getLiveState().durable;
  (durable.armOutcomes.delete(e), FGr(durable.announcedArmFailures, e));
}
/**
 * 在已连接的 claude.ai 连接器中找唯一一个 URL 满足条件的连接器。
 */
//@ chunk-r3568h5y.js:264-472 placement = getServerUrl (1)
function getServerUrl(config) {
  let r = [];
  for (let o of config) {
    if (!isConnectedOrCached(o)) continue;
    let { config: config } = o,
      n =
        config && typeof config === "object" && "url" in config && typeof config.url === "string"
          ? config.url
          : null;
    if (n !== null && isCcrOriginUrl(n)) r.push(o);
  }
  return r.length === 1 ? r[0] : null;
}

export {
  restoreDurableWatches,
  bDr,
  describeWatchError,
  describeWatchHttpStatus,
  Hye,
  nWn,
  unwatchArtifactDurably,
  watchArtifactDurably,
  b0s,
  _0s,
  Gko,
  getWatchUrlWithheldReason,
  getSubscribeBlock,
  getServerUrl,
};
