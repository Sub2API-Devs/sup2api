/**
 * services/api/tether.ts
 *
 * 2.1.316 新增：线程续接（tether）：只发增量请求、判断能否续接并记录决策
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (88)
 * attribution: placement 88
 */
import {
  isFoamySpringEnabled,
  isInlineToolsAllowed,
  isInlineToolsEnabled,
} from "../analytics/growthbookGates.js";
import { hasContextBeta, LO, Lb, tb } from "../../utils/betas.js";
import { isMidConvSystemForced, notifyPerTurnEffortInactive, isRealApiResponse } from "./claude.js";
import { dropWireShapeSeed, Obs } from "../../bootstrap/stateSlices.js";
import { strip1mTagWhereBuiltIn, getMainLoopModel } from "../../utils/model/model.js";
import {
  getStickyBetas,
  getSessionId,
  getUnsupportedThreadKeys,
  isThreadsHeldForServerClassifier,
  getClientTruncatedAssistantIds,
  getHeldStatelessReplyIds,
  getRootSession,
  hasRefusalFallbackOccurred,
  hasRefusalFallbackHeaderArmed,
} from "../../bootstrap/state.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { u, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Ws, ROOT as ROOT_2, formatZodErrors } from "./streamFallbackWarning.js";
import {
  getTrackingKey,
  getPendingChangeSummary,
  isUncachedSystemBlock,
  computeHash,
  EPHEMERAL_MESSAGE_MARK,
} from "./promptCacheBreakDetection.js";
import { classifyQuerySource, isAutoModeQuerySource } from "./requestHeaders.js";
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { ye } from "../../utils/startupMarks.js";
import { lit as lit_2, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE, getClientDataAtis, atisPin } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import { Lt, Bn } from "../../utils/model/modelIds.js";
import { ite, findModelKeyedEntry } from "../../utils/attachments/totalTokensReminder.js";
import { dyr, isTetherLive, keptReminderModeSafe, vEe } from "./keptReminder.js";
import { eKt, iye } from "../../utils/permissions/serverClassifier/arbiter.js";
import { bl } from "../../utils/toolResultStorage.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isPromptTooLongError, isCreditBalanceTooLow, isTetherBetaRejected } from "./errors.js";
import { initFingerprint } from "./dumpPrompts.js";
import { addWithLimit } from "../../utils/cronTasks.js";
import { env } from "../../utils/env.js";
import { takePendingConversationEdits } from "../../utils/shell/shellToolUtils.js";
import { Tqe } from "./toolDefinitionShape.js";
import { k5r } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { POLL as POLL_2 } from "../../utils/pollEvents.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { sleep } from "../../utils/sleep.js";

/**
 * 从 transcript 记录的请求形状恢复 beta 锁定：按记录启用/拒绝中途 system 消息、工具变更头与内联工具 beta，并记 tengu_wire_shape_seeded。
 */
//@ chunk-e6aww6q8.js:2584360-2585122 placement
function seedWireShapeFromRecord(betas, record, model) {
  if (record === void 0 || betas.wireShapeSeed?.record === record || !isFoamySpringEnabled()) return;
  try {
    let { systemTurns: systemTurns, toolChangeHeader: toolChangeHeader, inlineTools: inlineTools } = record,
      S = void 0;
    if (systemTurns === void 0 && toolChangeHeader === void 0 && inlineTools === void 0) return;
    let w = hasContextBeta(betas),
      L = [],
      G = [],
      q = isInlineToolsAllowed(),
      Z = systemTurns === !1 && isMidConvSystemForced(model);
    if (systemTurns === !0) L.push(LO);
    else if (systemTurns === !1 && !Z) G.push(LO);
    if (toolChangeHeader === !0) {
      if ((L.push(Lb), inlineTools === !0 && q)) L.push(tb);
    } else if (toolChangeHeader === !1) G.push(Lb);
    if (inlineTools === !1) G.push(tb);
    if (
      (dropWireShapeSeed(betas),
      Obs(betas, { record: record, sent: L, rejected: G }),
      record.systemTurnsAnsweredBy !== void 0)
    )
      betas.systemMessagesAcceptedBy.add(strip1mTagWhereBuiltIn(record.systemTurnsAnsweredBy));
    if (betas === getStickyBetas()) notifyPerTurnEffortInactive(betas, w);
    logEvent("tengu_wire_shape_seeded", {
      ...(systemTurns !== void 0 && { systemTurns: systemTurns, systemTurnsForced: Z }),
      ...(toolChangeHeader !== void 0 && { toolChangeHeader: toolChangeHeader }),
      ...(inlineTools !== void 0 && {
        inlineTools: inlineTools,
        inlineToolsOffered: isInlineToolsEnabled(),
        inlineToolsPermitted: q,
      }),
      ...!1,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2585122-2585168 placement
function MQe(e) {
  let n = readInputTransformations(e);
  return n && parseThinkingDrops(n);
}
//@ chunk-e6aww6q8.js:2585168-2585321 placement
function readInputTransformations(e) {
  return typeof e === "object" &&
    e !== null &&
    "input_transformations" in e &&
    Array.isArray(e.input_transformations)
    ? e.input_transformations
    : void 0;
}
/**
 * 从服务端警告中解析 thinking_dropped 条目，得到消息/块位置与原因类别。
 */
//@ chunk-e6aww6q8.js:2585321-2585782 placement
function parseThinkingDrops(transformations) {
  let n = u({ type: T("thinking_dropped"), path: o(), reason: o() }),
    r = [];
  for (let s of transformations) {
    let safeParse = n.safeParse(s);
    if (!safeParse.success) continue;
    let { path: path, reason: reason } = safeParse.data,
      match = /^messages\.(\d{1,6})\.content\.(\d{1,6})$/.exec(path),
      L = match ?? /^messages\.(\d{1,6})(?:\.|$)/.exec(path);
    r.push({
      messageIndex: L ? Number(L[1]) : void 0,
      blockIndex: match ? Number(match[2]) : void 0,
      reason:
        reason === "prefix_binding_mismatch"
          ? "prefix_mismatch"
          : reason === "model_binding_mismatch"
            ? "model_mismatch"
            : "other",
    });
  }
  return r;
}
//@ chunk-e6aww6q8.js:2585782-2585839 placement
function Xhr(e) {
  return Bun.hash.xxHash64(e).toString(36);
}
//@ chunk-e6aww6q8.js:2585839-2585892 placement
var Icn = { other: 0, model_mismatch: 1, prefix_mismatch: 2 };
/**
 * 汇总被丢弃的思考块：去重已报告的块，统计块数、轮数、原因与首末位置。
 */
//@ chunk-e6aww6q8.js:2585892-2586534 placement
function summarizeThinkingDrops(drops, blockKeyAt, isMain, seen) {
  let h,
    y = new Set(),
    S = [],
    w = {},
    L = new Set();
  for (let { messageIndex: messageIndex, blockIndex: blockIndex, reason: reason } of drops) {
    if (messageIndex === void 0 || blockIndex === void 0) continue;
    let Se = { messageIndex: messageIndex, blockIndex: blockIndex },
      ke = blockKeyAt(Se);
    if (ke === void 0) continue;
    let we = Xhr(ke),
      Ee = `*:${we}`,
      Ae = isMain ? `main:${we}` : Ee;
    if (L.has(Ae) || seen.get(Ae)) continue;
    if (
      (L.add(Ae).add(Ee), S.push(we), y.add(messageIndex), (w[reason] = (w[reason] ?? 0) + 1), h === void 0)
    ) {
      h = { blockCount: 1, turnCount: 1, reason: reason, first: Se, last: Se };
      continue;
    }
    if ((h.blockCount++, Icn[reason] > Icn[h.reason])) h.reason = reason;
    if (isBeforeBlock(Se, h.first)) h.first = Se;
    if (isBeforeBlock(h.last, Se)) h.last = Se;
  }
  if (h === void 0) return;
  return ((h.turnCount = y.size), (h.reasonCounts = w), { drops: h, blockHashes: S, seenKeys: [...L] });
}
/**
 * 记录线程思考块被服务端丢弃的情况。
 */
//@ chunk-e6aww6q8.js:2586534-2587915 placement
function reportThinkingDrop({
  body: body,
  blockKeyAt: blockKeyAt,
  carriedBlockHashes: carriedBlockHashes,
  countThinkingSent: countThinkingSent,
  querySource: querySource,
  agentId: agentId,
  model: model,
  requestId: requestId,
  solicited: solicited,
  contextCompactedKind: contextCompactedKind,
}) {
  try {
    let q = readInputTransformations(body);
    if (q === void 0) return;
    let bindingDrops = Ws().bindingDrops,
      Se = getTrackingKey(querySource, agentId),
      ke = `${getSessionId()}:${Se ?? "*"}`,
      we = bindingDrops.threadsRead.get(ke) !== !0,
      Ee = agentId === void 0 && classifyQuerySource(querySource) === "main",
      Ae = we ? [...carriedBlockHashes()] : [],
      Ie = q.length > 0 || Ae.length > 0 ? (bindingDrops.seenBlocks ??= new Dc({ max: 40000 })) : void 0;
    for (let ze of Ae) {
      if (Ee) Ie?.set(`main:${ze}`, !0);
      Ie?.set(`*:${ze}`, !0);
    }
    let Me = Ie && summarizeThinkingDrops(parseThinkingDrops(q), blockKeyAt, Ee, Ie),
      We;
    if (Ie && Me) {
      let { drops: drops, blockHashes: blockHashes, seenKeys: seenKeys } = Me,
        nt = countThinkingSent(),
        pt = getPendingChangeSummary(querySource, agentId);
      logEvent("tengu_thinking_drop", {
        query_source: agentTypeForTelemetry(querySource),
        model: telemetrySafeModelName(model),
        request_id: ye(requestId) ?? lit_2("unknown"),
        solicited: solicited,
        thinking_blocks_sent: nt.blocksSent,
        thinking_turns_sent: nt.turnsSent,
        dropped_reason: fromEnum(drops.reason),
        newly_dropped_block_count: drops.blockCount,
        newly_dropped_turn_count: drops.turnCount,
        failing_message_index: drops.first.messageIndex,
        failing_block_index: drops.first.blockIndex,
        last_failing_message_index: drops.last.messageIndex,
        last_failing_block_index: drops.last.blockIndex,
        first_report_for_thread_in_process: we,
        client_change_kinds: pt.kinds,
        first_changed_message_index: pt.firstChangedMessageIndex,
        client_baseline: pt.baseline,
        call_number: pt.callNumber,
        context_compacted: fromEnumOpt(contextCompactedKind),
      });
      for (let Et of seenKeys) Ie.set(Et, !0);
      We = { drops: drops, blockHashes: blockHashes, sent: nt, firstReport: we, change: pt };
    }
    return (bindingDrops.threadsRead.set(ke, !0), We);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2587915-2588030 placement
function isBeforeBlock(e, n) {
  return (
    e.messageIndex < n.messageIndex || (e.messageIndex === n.messageIndex && e.blockIndex < n.blockIndex)
  );
}
//@ chunk-e6aww6q8.js:2588030-2588056 placement
var Jhr = 256,
  Zhr = 128,
  eyr = 3;
//@ chunk-e6aww6q8.js:2588056-2588225 placement
function tetherHealConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_wondrous_acorn", null),
    n = e?.min_continues;
  return {
    enabled: e?.enabled === !0,
    minContinues: typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : eyr,
  };
}
//@ chunk-e6aww6q8.js:2588225-2588261 placement
function yEe() {
  return tetherHealConfig().enabled;
}
//@ chunk-e6aww6q8.js:2588261-2588306 placement
function qA() {
  return Ws().threadDropRecreate;
}
//@ chunk-e6aww6q8.js:2588306-2588597 placement
function touchThreadHealState(e) {
  let n = qA(),
    r = n.get(e);
  if (r === void 0) {
    if (n.size >= Zhr) {
      for (let s of n.keys())
        if (s !== ROOT_2) {
          n.delete(s);
          break;
        }
    }
    r = {
      mintedOnContinue: new Map(),
      continuesServed: 0,
      createdForDrop: !1,
      armed: !1,
      heldStateless: !1,
      reportUnmatched: !1,
      lastDispatchHealed: !1,
    };
  } else n.delete(e);
  return (n.set(e, r), r);
}
/**
 * 记录线程分派：新建线程时重置状态，续用时累加次数并记下每条消息续用时的序号。
 */
//@ chunk-e6aww6q8.js:2588597-2588990 placement
function recordThreadDispatch(threadKey, dispatch) {
  if (!yEe()) {
    qA().delete(formatZodErrors(threadKey));
    return;
  }
  let r = touchThreadHealState(formatZodErrors(threadKey));
  if (dispatch.thread === "create") {
    if ((r.mintedOnContinue.clear(), (r.armed = !1), dispatch.forDrop))
      ((r.createdForDrop = !0), (r.continuesServed = 0));
    return;
  }
  if ((r.continuesServed++, dispatch.messageId !== void 0)) {
    let mintedOnContinue = r.mintedOnContinue;
    if (!mintedOnContinue.has(dispatch.messageId) && mintedOnContinue.size >= Jhr) {
      let h = mintedOnContinue.keys().next().value;
      if (h !== void 0) mintedOnContinue.delete(h);
    }
    mintedOnContinue.set(dispatch.messageId, r.continuesServed);
  }
}
//@ chunk-e6aww6q8.js:2588990-2589096 placement
function resetThreadHealState(e) {
  let n = qA().get(formatZodErrors(e));
  if (n === void 0) return;
  (n.mintedOnContinue.clear(), (n.createdForDrop = !1));
}
//@ chunk-e6aww6q8.js:2589096-2589173 placement
function Ucn(e, n) {
  let r = qA().get(formatZodErrors(e));
  if (r !== void 0) r.lastDispatchHealed = n;
}
//@ chunk-e6aww6q8.js:2589173-2589263 placement
function jcn(e) {
  try {
    return qA().get(formatZodErrors(e))?.armed === !0 && yEe();
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e6aww6q8.js:2589263-2589361 placement
function bEe(e) {
  try {
    return qA().get(formatZodErrors(e))?.heldStateless === !0 && yEe();
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-e6aww6q8.js:2589361-2589556 placement
function takeThreadHealFacts(e) {
  let n = qA().get(formatZodErrors(e)),
    r = {
      continuesSinceDropCreate: n?.createdForDrop === !0 ? n.continuesServed : -1,
      reportUnmatched: n?.reportUnmatched === !0,
    };
  if (n !== void 0) n.reportUnmatched = !1;
  return r;
}
//@ chunk-e6aww6q8.js:2589556-2589692 placement
function hasPendingMintedReplies() {
  if (!yEe()) return !1;
  for (let e of qA().values()) if (!e.heldStateless && !e.armed && e.mintedOnContinue.size > 0) return !0;
  return !1;
}
/**
 * 当服务端报告线程前缀不一致时给出警告（重发了旧字节、没发线程前缀等）。
 */
//@ chunk-e6aww6q8.js:2589692-2591079 placement
function warnTetherPrefixMismatch(e, n, r) {
  let s = tetherHealConfig();
  if (!s.enabled || e.length === 0) return;
  for (let [h, y] of qA()) {
    if (y.heldStateless || y.armed) continue;
    let sorted = e
      .filter((q) => y.mintedOnContinue.has(q.messageId))
      .sort((q, Z) => y.mintedOnContinue.get(q.messageId) - y.mintedOnContinue.get(Z.messageId));
    if (sorted.length === 0) continue;
    let w = y.lastDispatchHealed && h !== n.key,
      L = w ? void 0 : sorted.find((q) => r(h, q.messageIndex));
    if (L === void 0) {
      ((y.reportUnmatched = !0),
        logForDebugging(
          `[tether] thread '${h}': a request (${n.querySource}) reported this thread's thinking dropped, but ${w ? "this thread's own requests re-send earlier bytes (sent-prefix ledger, enforce mode) that other requests do not" : "did not send this thread's prefix (system, tools, model, thinking or an earlier message differ)"}; ignored`,
        ));
      continue;
    }
    let G = y.mintedOnContinue.get(L.messageId);
    if (y.createdForDrop && G < s.minContinues) {
      ((y.heldStateless = !0),
        logFeatureSad("tether_drop_recreate", "held_stateless"),
        logForDebugging(
          `[tether] thread '${h}': the server dropped thinking produced on continue #${G} after the thread was re-created for a drop (reported by ${n.querySource}; held because it came before continue #${s.minContinues}); sending without \`thread\` for the rest of this conversation`,
          { level: "warn" },
        ));
      continue;
    }
    ((y.armed = !0),
      logForDebugging(
        `[tether] thread '${h}': the server dropped thinking this thread produced on a continue (prefix mismatch, reported by ${n.querySource}); re-creating the thread on its next request`,
      ));
  }
}
/**
 * 线程续接请求返回 prefix_mismatch 的 thinking 丢弃时，找出这些块属于哪条回复，并发出前缀不一致告警。
 */
//@ chunk-e6aww6q8.js:2591079-2591583 placement
function checkTetherPrefixMismatch({
  body: body,
  blockKeyAt: blockKeyAt,
  replyHolding: replyHolding,
  carrier: carrier,
  sentThreadPrefix: sentThreadPrefix,
}) {
  if (!hasPendingMintedReplies()) return;
  let cacheBreaks = MQe(body);
  if (cacheBreaks === void 0) return;
  let earliestByMessage = new Map();
  for (let { reason: reason, messageIndex: messageIndex, blockIndex: blockIndex } of cacheBreaks) {
    if (reason !== "prefix_mismatch" || messageIndex === void 0 || blockIndex === void 0) continue;
    let blockKey = blockKeyAt({ messageIndex: messageIndex, blockIndex: blockIndex }),
      holding = blockKey === void 0 ? void 0 : replyHolding(messageIndex, blockKey);
    if (holding === void 0) continue;
    earliestByMessage.set(
      holding.messageId,
      Math.min(holding.messageIndex, earliestByMessage.get(holding.messageId) ?? holding.messageIndex),
    );
  }
  if (earliestByMessage.size === 0) return;
  warnTetherPrefixMismatch(
    [...earliestByMessage].map(([w, L]) => ({ messageId: w, messageIndex: L })),
    carrier,
    sentThreadPrefix,
  );
}
//@ chunk-e6aww6q8.js:2591583-2591618 placement
function zcn(e) {
  qA().delete(formatZodErrors(e));
}
//@ chunk-e6aww6q8.js:2591618-2591647 placement
var ryr = 128,
  syr = 300,
  iyr = 3600;
//@ chunk-e6aww6q8.js:2591647-2591736 placement
function qcn(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= syr && e <= iyr ? e : void 0;
}
//@ chunk-e6aww6q8.js:2591736-2591928 placement
function threadLifetimeMs(e) {
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jaunty_charm", null),
    r = qcn(n?.ttl_seconds),
    s = n?.cc_closed_turn_ttl_seconds ?? void 0,
    h = s === void 0 ? r : qcn(s);
  if (r === void 0 || h === void 0 || h < r) return;
  return (e ? r : h) * 1000;
}
//@ chunk-e6aww6q8.js:2591928-2591973 placement
function OQe() {
  return Ws().threadRequestEnds;
}
//@ chunk-e6aww6q8.js:2591973-2592171 placement
function touchThreadLastUse(e, n) {
  try {
    let r = OQe(),
      s = formatZodErrors(e);
    if (!r.delete(s) && r.size >= ryr) {
      for (let h of r.keys())
        if (h !== ROOT_2) {
          r.delete(h);
          break;
        }
    }
    r.set(s, { wallMs: n.now(), monotonicMs: n.monotonicNow() });
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 计算线程空闲时长（墙钟与单调时钟取大）、生命周期以及是否已过期。
 */
//@ chunk-e6aww6q8.js:2592171-2592544 placement
function threadIdleState(threadKey, closedTurn, clock) {
  try {
    let s = threadLifetimeMs(closedTurn),
      h = OQe().get(formatZodErrors(threadKey));
    if (h === void 0) return { idleMs: void 0, monotonicIdleMs: void 0, lifetimeMs: s, expired: !1 };
    let y = clock.monotonicNow() - h.monotonicMs,
      max = Math.max(clock.now() - h.wallMs, y);
    return { idleMs: max, monotonicIdleMs: y, lifetimeMs: s, expired: s !== void 0 && max >= s };
  } catch (error) {
    return (
      logError(toError(error)),
      { idleMs: void 0, monotonicIdleMs: void 0, lifetimeMs: void 0, expired: !1 }
    );
  }
}
//@ chunk-e6aww6q8.js:2592544-2592580 placement
function Ycn(e) {
  OQe().delete(formatZodErrors(e));
}
/**
 * 代理类型为 subagent 或未给出上下文。
 */
//@ chunk-e6aww6q8.js:2595772-2595824 placement = isSubagentContext (0.815)
function isSubagentOrUnknown(agentType, agentContext) {
  return agentType === "subagent" || agentContext === void 0;
}
//@ chunk-e6aww6q8.js:2595824-2595839 placement
var ROOT = "root";
//@ chunk-e6aww6q8.js:2595839-2595877 placement
function hyr(e, n) {
  getUnsupportedThreadKeys().add(Ahn(e, n));
}
//@ chunk-e6aww6q8.js:2595877-2595922 placement
function CEe(e, n) {
  return getUnsupportedThreadKeys().has(Ahn(e, n));
}
//@ chunk-e6aww6q8.js:2595922-2595970 placement
function Ahn(e, n) {
  return `${e ?? ROOT}\x00${strippedCanonicalName(n)}`;
}
//@ chunk-e6aww6q8.js:2595970-2596197 placement
function isStatelessTetherModel(e) {
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_curious_tower_stateless_models", "");
  if (typeof n !== "string" || n.trim().length === 0) return !1;
  let r = {};
  for (let s of n.split(",")) {
    let h = Lt(s.trim());
    if (h !== "" && h !== ite) r[h] = !0;
  }
  return findModelKeyedEntry(r, e) !== void 0;
}
//@ chunk-e6aww6q8.js:2596197-2596251 placement
function Syr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucid_anchor", !1) === !0;
}
//@ chunk-e6aww6q8.js:2596251-2596347 placement
function kyr() {
  return (
    !Ws().threadInheritedFields.breakerTripped &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_heron", !1) === !0
  );
}
//@ chunk-e6aww6q8.js:2596347-2596391 placement
function wyr(e) {
  return e.filter((n) => isUncachedSystemBlock(n));
}
//@ chunk-e6aww6q8.js:2596391-2596403 placement
var Tyr = 128;
//@ chunk-e6aww6q8.js:2596403-2596485 placement
function NQe(e) {
  return e === void 0 && dyr?.getTeleportCacheState().status === "active";
}
//@ chunk-e6aww6q8.js:2596485-2596529 placement
function FQe() {
  return isThreadsHeldForServerClassifier() && (eKt() || iye());
}
//@ chunk-e6aww6q8.js:2596529-2596605 placement
function Mhn(e, n) {
  return isTetherLive() && !CEe(e, n) && !isStatelessTetherModel(n) && !NQe(e) && !FQe() && !bEe(e);
}
//@ chunk-e6aww6q8.js:2596605-2596719 placement
function hasServerToolUse(e) {
  return e.some((n) => n.type === "assistant" && n.message.content.some((r) => r.type === "server_tool_use"));
}
//@ chunk-e6aww6q8.js:2596719-2596739 placement
var Eyr = 256,
  Ryr = 256;
/**
 * 构造 tether 增量：只把上次之后新增的助手与工具结果消息发给服务端。
 */
//@ chunk-e6aww6q8.js:2596739-2603522 placement
function buildTetherDelta({
  engine: engine,
  previousMessageId: previousMessageId,
  anchorRewritten: anchorRewritten,
  messages: messages,
  agentId: agentId,
  model: model,
  modelHeldStateless: modelHeldStateless,
  relayHeldStateless: relayHeldStateless,
  classifierHeldStateless: classifierHeldStateless,
  creditRetryStateless: creditRetryStateless,
  dropHeldStateless: dropHeldStateless,
  toolResultClearingHeldStateless: toolResultClearingHeldStateless = !1,
  clock: clock,
}) {
  let ke = messages.length,
    we =
      previousMessageId === void 0
        ? -1
        : messages.findLastIndex((yo) => yo.type === "assistant" && yo.message.id === previousMessageId),
    Ee = we >= 0 ? messages[we] : void 0,
    Ae =
      Ee?.type === "assistant" &&
      Ee.message.stop_reason != null &&
      !getClientTruncatedAssistantIds().has(Ee.message.id) &&
      !getHeldStatelessReplyIds().has(Ee.message.id),
    Ie = Ee?.type === "assistant" && Ee.message.content.some((yo) => yo.type === "tool_use"),
    Me = threadIdleState(agentId, Ie, clock),
    We = engine === null ? "no_engine_result" : null,
    ze = null,
    lt = null,
    Je = !1,
    nt = null,
    pt = CEe(agentId, model),
    Et = hasServerToolUse(messages),
    any = messages.some(
      (yo) =>
        yo.type === "user" &&
        Array.isArray(yo.message.content) &&
        yo.message.content.some(
          (Ho) =>
            Ho.type === "tool_result" &&
            Array.isArray(Ho.content) &&
            Ho.content.some((rr) => bl(rr) && rr.type === "search_result"),
        ),
    ),
    gt = !1,
    At = !1,
    It = !1,
    Yt = !1,
    qt = !1,
    Zt = !1,
    rn = !1,
    pn,
    no = !1,
    hn = !1,
    ho = 0,
    yn = !1,
    Kn,
    Xn,
    fo = (yo) => {
      if (Kn === void 0 || Kn.ref !== yo) {
        let Ho = jsonStringify(yo);
        Kn = { ref: yo, json: Ho, hash: computeContentHash(Ho) };
      }
      return Kn;
    },
    To = (yo) => {
      if (Xn?.ref !== yo)
        Xn = { ref: yo, bytes: jsonStringify(yo.filter((Ho) => !isUncachedSystemBlock(Ho))).length };
      return Xn.bytes;
    };
  function bo(yo, Ho = !1) {
    if (
      ((At = !1),
      (Zt = !1),
      (It = yo.some((Hr) => Hr.type === "api_system" && (Hr.toolAdditions?.length ?? 0) > 0)),
      (Yt = yo.some((Hr) => Hr.type === "api_system" && (Hr.toolRemovals?.length ?? 0) > 0)),
      (qt = (It || Yt) && !Syr()),
      pt ||
        modelHeldStateless ||
        relayHeldStateless ||
        classifierHeldStateless ||
        creditRetryStateless ||
        dropHeldStateless ||
        toolResultClearingHeldStateless ||
        nt !== null ||
        Et ||
        any ||
        qt)
    )
      return ((ze = null), null);
    if (
      yo.some(
        (Hr) =>
          (Hr.type === "user" && Hr.ephemeral) ||
          (!Ho && Hr.type === "api_system" && (Hr.ephemeral || Hr.ephemeralSuffix !== void 0)),
      )
    )
      return ((ze = null), (gt = !0), null);
    Zt = jcn(agentId);
    let rr;
    if (We !== null || engine === null)
      rr = { thread: { type: "create" }, sliceFrom: 0, reason: We ?? "no_engine_result" };
    else if (engine.decision !== "continue")
      rr = { thread: { type: "create" }, sliceFrom: 0, reason: engine.reason };
    else if (previousMessageId === void 0 || we < 0)
      rr = { thread: { type: "create" }, sliceFrom: 0, reason: "anchor_missing" };
    else if (we + 1 >= ke) rr = { thread: { type: "create" }, sliceFrom: 0, reason: "anchor_is_tail" };
    else if (!Ae) rr = { thread: { type: "create" }, sliceFrom: 0, reason: "anchor_incomplete" };
    else if (anchorRewritten) rr = { thread: { type: "create" }, sliceFrom: 0, reason: "anchor_rewritten" };
    else if (yo !== messages || yo.length !== ke)
      rr = { thread: { type: "create" }, sliceFrom: 0, reason: "transcript_drift" };
    else if (Zt) rr = { thread: { type: "create" }, sliceFrom: 0, reason: "thread_minted_drop" };
    else if (Me.expired) {
      if (ze?.reason !== "thread_presumed_expired")
        logForDebugging(
          `[tether] thread idle for ${Math.round((Me.idleMs ?? 0) / 1000)} s, at or past its ${(Me.lifetimeMs ?? 0) / 1000} s lifetime on the server: sending a create, not a continue`,
        );
      rr = { thread: { type: "create" }, sliceFrom: 0, reason: "thread_presumed_expired" };
    } else
      rr = {
        thread: { type: "continue", previous_message_id: previousMessageId },
        sliceFrom: we + 1,
        reason: engine.reason,
      };
    ze = rr;
    let at = yo.at(-1);
    return (
      (At = Ho && at?.type === "api_system" && (at.ephemeral === !0 || at.ephemeralSuffix !== void 0)),
      rr
    );
  }
  function vn(yo, Ho) {
    ((no = !1), (hn = !1), (ho = 0), (pn = void 0));
    try {
      if (yo === null) return { system: Ho.system, tools: Ho.tools };
      if (!kyr()) return (Qcn(agentId), { system: Ho.system, tools: Ho.tools });
      let { json: json, hash: hash } = fo(Ho.tools);
      if (yo.thread.type !== "continue") return ((pn = hash), { system: Ho.system, tools: Ho.tools });
      let Hr = wyr(Ho.system),
        Fr = Hr.length > 0 && Hr.length < Ho.system.length ? Hr : Ho.system;
      if (Fr !== Ho.system) ((no = !0), (ho += To(Ho.system)));
      if (Ws().threadInheritedFields.storedToolsHashByThread.get(formatZodErrors(agentId)) === hash)
        return ((hn = !0), (ho += json.length), { system: Fr, tools: void 0 });
      return ((pn = hash), { system: Fr, tools: Ho.tools });
    } catch (error) {
      return (
        logError(error),
        (no = !1),
        (hn = !1),
        (ho = 0),
        (pn = void 0),
        Qcn(agentId),
        { system: Ho.system, tools: Ho.tools }
      );
    }
  }
  function co(yo) {
    if (We === null) ((We = yo), logForDebugging(`[tether] forcing create for retry: ${yo}`));
  }
  function So(yo) {
    try {
      let Ho = classifyThreadError(yo);
      if (Ho !== null && lt === null) lt = Ho;
      if (Ho === "unsupported_request" || (Ho === "other_thread_400" && ze?.thread.type === "create")) {
        if (nt !== null || ze === null) return;
        return (
          (nt = ze.thread.type),
          hyr(agentId, model),
          logForDebugging(
            `[tether] ${Ho}: resending this turn stateless; this thread stays stateless on this model for the session`,
            { level: "warn" },
          ),
          "retry:tether-stateless"
        );
      }
      if (ze?.thread.type !== "continue") return;
      if (!(yo instanceof Ot)) return;
      if (yo.status !== 400 && yo.status !== 404) return;
      if (yo.status === 404 && Ho !== "not_found") return;
      if (Ho === null && (isPromptTooLongError(yo) || isCreditBalanceTooLow(yo))) return;
      switch (Ho) {
        case "not_found":
          return ((Je = !0), co("replay_not_found"), "retry:tether-replay");
        case "fingerprint_mismatch":
          if (((Je = !0), initFingerprint(yo, { system: no, tools: hn }))) $o();
          return (co("replay_fingerprint"), "retry:tether-replay");
        case "already_continued":
        case "other_thread_400":
        case null:
          return ((Je = !0), co("replay_other_400"), "retry:tether-replay");
      }
    } catch (error) {
      logError(error);
      return;
    }
  }
  function ko() {
    try {
      if (nt !== null || ze === null) return;
      return (
        (nt = ze.thread.type),
        (lt ??= "unrecognised_400"),
        logForDebugging(
          `[tether] unrecognised HTTP 400 on a ${nt} that carried the message-threads header: resending this turn stateless without the header`,
          { level: "warn" },
        ),
        "retry:tether-stateless"
      );
    } catch (error) {
      logError(error);
      return;
    }
  }
  function un(yo) {
    Jcn(getClientTruncatedAssistantIds(), Eyr, yo);
  }
  function ao(yo, Ho, rr) {
    if (rn) return;
    if (
      ((rn = !0),
      gt ||
        modelHeldStateless ||
        relayHeldStateless ||
        classifierHeldStateless ||
        creditRetryStateless ||
        dropHeldStateless ||
        toolResultClearingHeldStateless ||
        any ||
        qt ||
        nt !== null)
    )
      Jcn(getHeldStatelessReplyIds(), Ryr, rr);
    if (ze !== null) touchThreadLastUse(agentId, clock);
    if (yo.kind === "ok" && ze !== null)
      try {
        let br = ze.thread.type === "create" && ze.reason === "thread_minted_drop";
        if (
          (recordThreadDispatch(
            agentId,
            ze.thread.type === "continue"
              ? { thread: "continue", messageId: rr }
              : { thread: "create", forDrop: br },
          ),
          br)
        )
          logFeatureOk("tether_drop_recreate");
      } catch (error) {
        logError(toError(error));
      }
    if (yo.kind === "ok" && ze !== null && pn !== void 0) storeThreadToolsHash(agentId, pn);
    try {
      let br = yo.kind === "error" ? (classifyThreadError(yo.error) ?? "error_non_thread") : yo.kind,
        Hr = takeThreadHealFacts(agentId);
      logEvent("tengu_tether_live_outcome", {
        requestId: ye(Ho),
        sentThreadType: fromEnum(ze?.thread.type ?? "none"),
        sourceCategory: fromEnum(engine?.sourceCategory ?? "none"),
        planReason: fromEnum(ze?.reason ?? "none"),
        engineDecision: fromEnum(engine?.decision ?? "none"),
        engineReason: fromEnum(engine?.reason ?? "none"),
        firstThreadError: fromEnum(lt ?? "none"),
        finalOutcome: fromEnum(br),
        replayed: Je,
        droppedFrom: fromEnum(nt ?? "none"),
        threadUnsupported: pt,
        modelHeldStateless: modelHeldStateless,
        relayHeldStateless: relayHeldStateless,
        classifierHeldStateless: classifierHeldStateless,
        creditRetryStateless: creditRetryStateless,
        toolResultClearingHeldStateless: toolResultClearingHeldStateless,
        serverToolHistory: Et,
        searchResultHistory: any,
        toolAdditionHistory: It,
        toolRemovalHistory: Yt,
        toolChangeHistory: qt,
        requestScopedStateless: gt,
        keptReminderClearAt: At,
        keptReminderScope: fromEnum(keptReminderModeSafe(model)),
        deltaMessageCount: we >= 0 ? ke - we - 1 : 0,
        messageCount: ke,
        turnsInThread: engine?.turnsInThread ?? 0,
        omittedSystem: no,
        omittedTools: hn,
        omittedBytes: ho,
        inheritBreakerTripped: yn,
        dropArmed: Zt,
        dropHeldStateless: dropHeldStateless,
        continuesSinceDropCreate: Hr.continuesSinceDropCreate,
        dropReportUnmatched: Hr.reportUnmatched,
        threadIdleMs: Math.round(Me.idleMs ?? -1),
        threadIdleMonotonicMs: Math.round(Me.monotonicIdleMs ?? -1),
        threadLifetimeMs: Me.lifetimeMs ?? -1,
        anchorHasToolCall: Ie,
      });
    } catch (error) {
      logError(error);
    }
  }
  function $o() {
    let threadInheritedFields = Ws().threadInheritedFields;
    if (threadInheritedFields.breakerTripped) return;
    ((threadInheritedFields.breakerTripped = !0),
      (yn = !0),
      logForDebugging(
        "[tether] a continue that left system/tools to the thread was refused (fingerprint); sending full fields for the rest of the session",
        { level: "warn" },
      ),
      logFeatureSad("tether_inherited_fields", "fingerprint_mismatch"));
  }
  return {
    plan: bo,
    shapeInheritedFields: vn,
    forceCreate: co,
    resolveRetry: So,
    dropForUnrecognised400: ko,
    noteClientTruncated: un,
    settle: ao,
  };
}
//@ chunk-e6aww6q8.js:2603807-2603888 placement
function Qcn(e) {
  Ws().threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(e));
}
//@ chunk-e6aww6q8.js:2603888-2604064 placement
function storeThreadToolsHash(e, n) {
  let storedToolsHashByThread = Ws().threadInheritedFields.storedToolsHashByThread,
    s = formatZodErrors(e);
  if ((storedToolsHashByThread.delete(s), storedToolsHashByThread.size >= Tyr)) {
    let h = storedToolsHashByThread.keys().next().value;
    if (h !== void 0) storedToolsHashByThread.delete(h);
  }
  storedToolsHashByThread.set(s, n);
}
//@ chunk-e6aww6q8.js:2604064-2604135 placement
function Jcn(e, n, r) {
  if (r === void 0) return;
  try {
    addWithLimit(e, r, n);
  } catch (error) {
    logError(error);
  }
}
/**
 * 把线程续接接口的错误（线程不存在、请求不支持、指纹不一致）归类。
 */
//@ chunk-e6aww6q8.js:2604135-2604788 placement
function classifyThreadError(e) {
  if (!(e instanceof Ot)) return null;
  let n = e.message ?? "";
  if (e.status === 404)
    return n.includes("thread_not_found") || readErrorCode(e) === "thread_not_found" ? "not_found" : null;
  if (e.status !== 400) return null;
  let r = readErrorCode(e);
  if (r === "thread_unsupported_request" || isTetherBetaRejected(e)) return "unsupported_request";
  if (r === "thread_fingerprint_mismatch" || n.includes("differing field")) return "fingerprint_mismatch";
  if (r === "thread_already_continued" || n.includes("already been continued")) return "already_continued";
  if (
    /(?<!diagnostics\.)previous_message_id/.test(n) ||
    /\bthread\b.{0,3}(param|field|request|type|:)/i.test(n) ||
    r?.startsWith("thread_")
  )
    return "other_thread_400";
  return null;
}
//@ chunk-e6aww6q8.js:2604788-2605055 placement
function readErrorCode(e) {
  let error = e.error;
  if (typeof error !== "object" || error === null) return;
  let r = "error" in error ? error.error : error;
  if (typeof r !== "object" || r === null || !("details" in r)) return;
  let details = r.details;
  if (typeof details !== "object" || details === null) return;
  let error_code = details.error_code;
  return typeof error_code === "string" ? error_code : void 0;
}
//@ chunk-e6aww6q8.js:2605055-2605160 placement
var THREAD_INHERITED_FIELDS = [
  "model",
  "system",
  "tools",
  "betas",
  "latchedHeaders",
  "thinking",
  "toolChoice",
  "effort",
  "extraBody",
];
/**
 * 判断能否不发送临时提醒：子代理或未知来源、模型条件满足、未模拟代理。
 */
//@ chunk-e6aww6q8.js:2605160-2605274 placement
function canUseNoTransientReminders(e, n, r, s = !1) {
  let h = threadSourceKind(e);
  return h !== null && !s && Mhn(n, r) && isSubagentOrUnknown(h, n) && !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE;
}
/**
 * 决定提醒的投递方式：保留（kept）、不发（none）或临时（transient）。
 */
//@ chunk-e6aww6q8.js:2605274-2605410 placement
function reminderDeliveryMode(querySource, betas, model, s = model, h = !1, y) {
  if (
    !isAutoModeQuerySource(querySource) &&
    vEe(s, classifyQuerySource(querySource) === "main" ? { recorded: y } : void 0)
  )
    return "kept";
  return canUseNoTransientReminders(querySource, betas, model, h) ? "none" : "transient";
}
//@ chunk-e6aww6q8.js:2605410-2605510 placement
function threadSourceKind(e) {
  if (e === "hook_agent") return null;
  let n = classifyQuerySource(e);
  return n === "main" || n === "subagent" ? n : null;
}
//@ chunk-e6aww6q8.js:2605510-2605522 placement
var Myr = 128;
//@ chunk-e6aww6q8.js:2605522-2605675 placement
function threadPrefixHashes(e) {
  return {
    model: computeHash(e.model),
    system: computeHash(e.system.filter((n) => !isUncachedSystemBlock(n)).map((n) => n.text)),
    tools: computeHash(e.toolSchemas),
    thinking: computeHash(e.thinkingConfig),
  };
}
/**
 * 决定本次请求能否作为线程续接（tether）发送：首个请求、无续接指针、配置变化、历史被改写都不能续接。
 */
//@ chunk-e6aww6q8.js:2605675-2607563 placement
function decideTetherContinuation() {
  let e = new Map();
  function n(h) {
    let y = threadSourceKind(h.querySource);
    if (y === null) return null;
    let S = formatZodErrors(h.agentId),
      w = y === "main" ? takePendingConversationEdits() : [],
      L = threadPrefixHashes(h),
      G = {
        model: L.model,
        system: computeHash([
          L.system,
          h.system.filter((We) => !isUncachedSystemBlock(We)).map((We) => We.cache_control ?? null),
        ]),
        tools: L.tools,
        thinking: L.thinking,
        betas: computeHash([...h.betas].sort()),
        latchedHeaders: computeHash(h.latchedHeaders),
        toolChoice: computeHash(h.toolChoice ?? null),
        effort: computeHash(h.effortValue ?? null),
        extraBody: computeHash(h.extraBodyParams ?? null),
      },
      messageHashes = h.getMessageHashes(),
      Z = e.get(S),
      Se = Z?.messageHashes.length ?? 0,
      ke = Z ? THREAD_INHERITED_FIELDS.filter((We) => G[We] !== Z.configHashes[We]) : [],
      we,
      Ee = -1;
    if (!Z) we = "first_request";
    else if (h.previousMessageId === void 0) we = "no_continue_pointer";
    else if (ke.length > 0) we = "config_changed";
    else if (
      ((Ee = Z.messageHashes.findIndex(
        (messageHashe, ze) =>
          messageHashe !== EPHEMERAL_MESSAGE_MARK &&
          ze < messageHashes.length &&
          messageHashes[ze] !== messageHashe,
      )),
      Ee !== -1)
    )
      we = "history_reshaped";
    else if (messageHashes.length <= Z.messageHashes.length) we = "history_rewound";
    else we = "append";
    let Ae = we === "append" ? "continue" : "create",
      Ie = Ae === "continue" && Z ? Z.turnsInThread + 1 : 1,
      Me = !1;
    if (e.has(S)) e.delete(S);
    else if (e.size >= Myr) {
      for (let We of e.keys())
        if (We !== ROOT_2) {
          (e.delete(We), (Me = !0));
          break;
        }
    }
    return (
      e.set(S, {
        configHashes: G,
        boundSystemHash: L.system,
        messageHashes: messageHashes,
        turnsInThread: Ie,
      }),
      {
        decision: Ae,
        reason: we,
        sourceCategory: y,
        evictedOther: Me,
        changedConfigFields: ke,
        turnsInThread: Ie,
        messageCount: messageHashes.length,
        prevMessageCount: Se,
        firstChangedIndex: Ee,
        deltaMessageCount: Ae === "continue" ? messageHashes.length - Se : 0,
        historyEditClaims: Z ? w : [],
      }
    );
  }
  function r(h, y, S, w) {
    let L = e.get(h);
    if (
      L === void 0 ||
      w > L.messageHashes.length ||
      y.model !== L.configHashes.model ||
      y.system !== L.boundSystemHash ||
      y.tools !== L.configHashes.tools ||
      y.thinking !== L.configHashes.thinking
    )
      return !1;
    let G = S();
    if (w > G.length) return !1;
    if (w < L.messageHashes.length && G[w] !== L.messageHashes[w]) return !1;
    for (let q = 0; q < w; q++) {
      let Z = L.messageHashes[q];
      if (Z !== EPHEMERAL_MESSAGE_MARK && G[q] !== Z) return !1;
    }
    return !0;
  }
  function s(h) {
    e.delete(formatZodErrors(h));
  }
  return { evaluate: n, sentThreadPrefix: r, forget: s };
}
//@ chunk-e6aww6q8.js:2607563-2607628 placement
function Dyr() {
  let e = Ws();
  return (e.threadDecisionTracker ??= decideTetherContinuation());
}
/**
 * 子代理结束时清除其线程决策、工具哈希等线程状态。
 */
//@ chunk-e6aww6q8.js:2607628-2607766 placement
function forgetAgentThread(e) {
  let n = Ws();
  (n.threadDecisionTracker?.forget(e),
    n.threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(e)),
    zcn(e),
    Ycn(e));
}
//@ chunk-e6aww6q8.js:2607766-2607941 placement
function createSentPrefixChecker(e) {
  let n;
  return (r, s) => {
    try {
      let threadDecisionTracker = Ws().threadDecisionTracker;
      return (
        threadDecisionTracker !== void 0 &&
        threadDecisionTracker.sentThreadPrefix(r, (n ??= threadPrefixHashes(e)), e.getMessageHashes, s)
      );
    } catch (error) {
      return (logError(toError(error)), !1);
    }
  };
}
//@ chunk-e6aww6q8.js:2607941-2608002 placement
function Nhn(e) {
  try {
    return logTetherDecision(e);
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 记录 tether 续接决策遥测。
 */
//@ chunk-e6aww6q8.js:2608002-2609515 placement
function logTetherDecision(e) {
  if (!isTetherLive()) return null;
  let evaluate = Dyr().evaluate(e);
  if (!evaluate) return null;
  if (evaluate.decision !== "continue") resetThreadHealState(e.agentId);
  let r = {
    model: !1,
    system: !1,
    tools: !1,
    betas: !1,
    latchedHeaders: !1,
    thinking: !1,
    toolChoice: !1,
    effort: !1,
    extraBody: !1,
  };
  for (let changedConfigField of evaluate.changedConfigFields) r[changedConfigField] = !0;
  let s = { compact: !1, snip: !1, tool_result_clear: !1, rewind: !1, clear: !1, abort_strip: !1 };
  for (let historyEditClaim of evaluate.historyEditClaims) s[historyEditClaim] = !0;
  let h = evaluate.reason === "history_reshaped" || evaluate.reason === "history_rewound";
  return (
    logEvent("tengu_tether_decision", {
      decision: fromEnum(evaluate.decision),
      reason: fromEnum(evaluate.reason),
      sourceCategory: fromEnum(evaluate.sourceCategory),
      threadUnsupported: CEe(e.agentId, e.model),
      modelHeldStateless: e.modelHeldStateless,
      relayHeldStateless: e.relayHeldStateless,
      classifierHeldStateless: e.classifierHeldStateless,
      creditRetryStateless: e.creditRetryStateless,
      dropHeldStateless: e.dropHeldStateless,
      evictedOther: evaluate.evictedOther,
      changedModel: r.model,
      changedSystem: r.system,
      changedTools: r.tools,
      changedBetas: r.betas,
      changedLatchedHeaders: r.latchedHeaders,
      changedThinking: r.thinking,
      changedToolChoice: r.toolChoice,
      changedEffort: r.effort,
      changedExtraBody: r.extraBody,
      turnsInThread: evaluate.turnsInThread,
      messageCount: evaluate.messageCount,
      prevMessageCount: evaluate.prevMessageCount,
      firstChangedIndex: evaluate.firstChangedIndex,
      deltaMessageCount: evaluate.deltaMessageCount,
      claimedCompact: s.compact,
      claimedSnip: s.snip,
      claimedToolResultClear: s.tool_result_clear,
      claimedRewind: s.rewind,
      claimedClear: s.clear,
      claimedAbortStrip: s.abort_strip,
      unclaimedHistoryChange:
        evaluate.sourceCategory === "main" && h && evaluate.historyEditClaims.length === 0,
    }),
    evaluate
  );
}
//@ chunk-e6aww6q8.js:2609515-2609768 placement
function emptyEchoDiffs() {
  return {
    reordered: 0,
    turn_split: 0,
    turn_dropped: 0,
    added_tool_use_gettask: 0,
    added_tool_use_poll: 0,
    added_tool_use_other: 0,
    added_other: 0,
    dropped_tool_use: 0,
    dropped_thinking: 0,
    dropped_text: 0,
    dropped_other: 0,
    tool_name_changed: 0,
    caller_dropped: 0,
  };
}
//@ chunk-e6aww6q8.js:2609768-2609895 placement
var STRUCTURAL_ECHO_DIFFS = [
  "added_tool_use_gettask",
  "added_tool_use_poll",
  "added_tool_use_other",
  "dropped_tool_use",
  "turn_split",
  "turn_dropped",
];
//@ chunk-e6aww6q8.js:2609895-2610017 placement
function hasStructuralEchoDiff(e, n) {
  if (n === void 0) return !1;
  let r = e.classesById.get(n);
  if (r === void 0) return !1;
  return STRUCTURAL_ECHO_DIFFS.some((s) => r.has(s));
}
//@ chunk-e6aww6q8.js:2610017-2610262 placement
function blockShape(e) {
  let n = e.type === "tool_use" || e.type === "server_tool_use" || e.type === "mcp_tool_use";
  return {
    type: e.type,
    id: n && typeof e.id === "string" ? e.id : void 0,
    name: n && typeof e.name === "string" ? e.name : void 0,
    hasCaller: "caller" in e && e.caller !== void 0,
  };
}
//@ chunk-e6aww6q8.js:2610262-2610354 placement
function Uhn(e) {
  if (typeof e === "string") return [{ type: "text", hasCaller: !1 }];
  return e.map(blockShape);
}
/**
 * 把助手消息内容转成块形状列表，批量工具调用按原始调用合并去重。
 */
//@ chunk-e6aww6q8.js:2610354-2610705 placement
function assistantBlockShapes(e) {
  let n = Uhn(e.message.content),
    batchToolUses = e.batchToolUses;
  if (!batchToolUses || batchToolUses.length === 0) return n;
  let s = new Map(batchToolUses.map((S) => [S.id, S])),
    h = [],
    y = new Set();
  for (let S of n) {
    let w = S.id === void 0 ? void 0 : Tqe(S.id),
      L = w === void 0 ? void 0 : s.get(w);
    if (!L) h.push(S);
    else if (!y.has(L.id))
      (y.add(L.id), h.push({ type: "tool_use", id: L.id, name: L.name, hasCaller: S.hasCaller }));
  }
  return h;
}
//@ chunk-e6aww6q8.js:2610705-2610769 placement
function AEe(e) {
  return e.id !== void 0 ? `${e.type}#${e.id}` : e.type;
}
//@ chunk-e6aww6q8.js:2610769-2610862 placement
function Fhn(e) {
  let n = new Map();
  for (let r of e) {
    let s = AEe(r);
    n.set(s, (n.get(s) ?? 0) + 1);
  }
  return n;
}
//@ chunk-e6aww6q8.js:2610862-2610984 placement
function matchedBlockKeys(e, n) {
  let r = new Map(n),
    s = [];
  for (let h of e) {
    let y = AEe(h),
      S = r.get(y) ?? 0;
    if (S > 0) (s.push(y), r.set(y, S - 1));
  }
  return s;
}
/**
 * 对比两次请求，分类新增的内容（工具调用、轮询、其他），供 tether 判断。
 */
//@ chunk-e6aww6q8.js:2610984-2612031 placement
function classifyAddedContent(e, n) {
  let r = new Set(),
    s = Fhn(e),
    h = Fhn(n);
  for (let G of n) {
    let q = AEe(G);
    if ((h.get(q) ?? 0) > (s.get(q) ?? 0))
      if (G.id === void 0) r.add("added_other");
      else if (k5r(G.id)) r.add("added_tool_use_gettask");
      else if (G.id.startsWith(POLL_2)) r.add("added_tool_use_poll");
      else r.add("added_tool_use_other");
  }
  for (let G of e) {
    let q = AEe(G);
    if ((s.get(q) ?? 0) > (h.get(q) ?? 0))
      switch (G.type) {
        case "tool_use":
        case "server_tool_use":
        case "mcp_tool_use":
          r.add("dropped_tool_use");
          break;
        case "thinking":
        case "redacted_thinking":
          r.add("dropped_thinking");
          break;
        case "text":
          r.add("dropped_text");
          break;
        default:
          r.add("dropped_other");
      }
  }
  let y = new Map();
  for (let [G, q] of s) {
    let Z = h.get(G) ?? 0;
    if (Z > 0) y.set(G, Math.min(q, Z));
  }
  let S = matchedBlockKeys(e, y),
    w = matchedBlockKeys(n, y);
  for (let G = 0; G < S.length; G++)
    if (S[G] !== w[G]) {
      r.add("reordered");
      break;
    }
  let L = new Map();
  for (let G of e) if (G.id !== void 0) L.set(G.id, G);
  for (let G of n) {
    if (G.id === void 0) continue;
    let q = L.get(G.id);
    if (!q) continue;
    if (q.name !== void 0 && G.name !== void 0 && q.name !== G.name) r.add("tool_name_changed");
    if (q.hasCaller && !G.hasCaller) r.add("caller_dropped");
  }
  return r;
}
/**
 * 对比本地发送的 assistant 回合与服务端线程回显的内容：按消息 id 聚合块形状，统计重排、拆分、丢失、增删工具调用、thinking/文本丢失等差异类别。
 */
//@ chunk-e6aww6q8.js:2612031-2612836 placement
function auditTetherEcho(sent, echoed) {
  let r = new Map(),
    s = [];
  for (let G of sent) {
    if (G.type !== "assistant" || G.isVirtual || !isRealApiResponse(G)) continue;
    let id = G.message.id;
    if (typeof id !== "string" || id.length === 0) continue;
    let Z = r.get(id);
    if (!Z) ((Z = []), r.set(id, Z), s.push(id));
    Z.push(...assistantBlockShapes(G));
  }
  let h = new Map();
  for (let G of echoed) {
    if (G.type !== "assistant") continue;
    let id = G.message.id;
    if (typeof id !== "string" || !r.has(id)) continue;
    let Z = h.get(id);
    if (!Z) ((Z = { shapes: [], messages: 0 }), h.set(id, Z));
    (Z.messages++, Z.shapes.push(...Uhn(G.message.content)));
  }
  let y = emptyEchoDiffs(),
    S = 0,
    w = [],
    L = new Map();
  for (let G of s) {
    let q = r.get(G) ?? [],
      Z = h.get(G),
      Se = Z ? classifyAddedContent(q, Z.shapes) : new Set(["turn_dropped"]);
    if (Z && Z.messages > 1) Se.add("turn_split");
    if (Se.size === 0) {
      S++;
      continue;
    }
    (w.push(G), L.set(G, Se));
    for (let ke of Se) y[ke]++;
  }
  return { turnsReceived: s.length, turnsIdentical: S, diffs: y, divergedMessageIds: w, classesById: L };
}
//@ chunk-e6aww6q8.js:2612836-2612901 placement
function jhn(e, n) {
  try {
    return auditTetherEcho(e, n);
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 记录 tether 回声审计遥测：收到/一致/分歧的轮数及各类差异计数。
 */
//@ chunk-e6aww6q8.js:2612901-2613755 placement
function logTetherEchoAudit(audit, context) {
  try {
    if (audit.turnsReceived === 0) return;
    logEvent("tengu_tether_echo_audit", {
      sourceCategory: fromEnum(context.sourceCategory),
      messageCount: context.messageCount,
      anchorDiverged:
        context.anchorMessageId !== void 0 && audit.divergedMessageIds.includes(context.anchorMessageId),
      turnsReceived: audit.turnsReceived,
      turnsIdentical: audit.turnsIdentical,
      turnsDiverged: audit.turnsReceived - audit.turnsIdentical,
      reordered: audit.diffs.reordered,
      turnSplit: audit.diffs.turn_split,
      turnDropped: audit.diffs.turn_dropped,
      addedToolUseGettask: audit.diffs.added_tool_use_gettask,
      addedToolUsePoll: audit.diffs.added_tool_use_poll,
      addedToolUseOther: audit.diffs.added_tool_use_other,
      addedOther: audit.diffs.added_other,
      droppedToolUse: audit.diffs.dropped_tool_use,
      droppedThinking: audit.diffs.dropped_thinking,
      droppedText: audit.diffs.dropped_text,
      droppedOther: audit.diffs.dropped_other,
      toolNameChanged: audit.diffs.tool_name_changed,
      callerDropped: audit.diffs.caller_dropped,
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 把 api_system 消息中的临时提醒拆出：返回去掉临时内容的消息副本、需在下一条用户消息时清除的提醒位置与需整体丢弃的空消息。
 */
//@ chunk-e6aww6q8.js:2613755-2614300 placement
function liftEphemeralReminders(messages, clearAtNextUser) {
  let r = messages.length - 1,
    s = new Map(),
    h = new Set(),
    y;
  return (
    messages.forEach((S, w) => {
      if (S.type !== "api_system") return;
      let L = S.ephemeral ? S.message.content : S.ephemeralSuffix;
      if (L === void 0 || !(clearAtNextUser || (S.reminderFromRecords && w !== r))) return;
      if (clearAtNextUser && L.trim() !== "") s.set(w, L);
      let G = S.ephemeral ? "" : S.message.content;
      if (G === "" && !S.toolAdditions?.length && !S.toolRemovals?.length && S.outputConfig === void 0)
        h.add(w);
      ((y ??= [...messages]),
        (y[w] = { ...S, message: { ...S.message, content: G }, ephemeral: void 0, ephemeralSuffix: void 0 }));
    }),
    y === void 0 ? void 0 : { messages: y, clearAtAfter: s, dropBase: h }
  );
}
//@ chunk-e6aww6q8.js:2614300-2614553 placement
function buildWireWithClearAt(e, n) {
  let r = [],
    s = [];
  return (
    e.forEach((h, y) => {
      if ((s.push(r.length), !n.dropBase.has(y))) r.push(h);
      let S = n.clearAtAfter.get(y);
      if (S !== void 0) r.push({ role: "system", content: S, clear_at: "next_user_message" });
    }),
    s.push(r.length),
    { wire: r, wireIndexOf: s }
  );
}
//@ chunk-e6aww6q8.js:2614553-2614712 placement
var X_CC_ATIS_CURRENT = "x-cc-atis-current",
  Wyr = 300,
  Gyr = { min: 30, max: 86400 },
  qyr = 180,
  Kyr = { min: 0, max: 3600 },
  TENGU_EXPRESSIVE_WHISTLE_CONFIG = "tengu_expressive_whistle_config",
  Yyr = new HostScoped(() => ({ nextFetchAt: 0 }));
//@ chunk-e6aww6q8.js:2614712-2614751 placement
function Qyr() {
  return Yyr.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2614751-2614806 placement
function Jyr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_expressive_whistle", !1);
}
/**
 * 主线程请求的响应头里服务端 ATIS 标记与本地 client_data 不一致时，按最小间隔加抖动重新拉取 bootstrap，并记 tengu_client_data_stale_refetch。
 */
//@ chunk-e6aww6q8.js:2614806-2615701 placement
async function refetchStaleClientData(headers, request, fallbackActive) {
  try {
    if (!Jyr()) return;
    let s = headers.get(X_CC_ATIS_CURRENT);
    if (!s) return;
    let h = getClientDataAtis();
    if (h === void 0) return;
    if (
      classifyQuerySource(request.querySource) !== "main" ||
      !isFirstPartyApiBackend() ||
      isEssentialTrafficOnly() ||
      Bn(request.model) !== Bn(getMainLoopModel()) ||
      fallbackActive ||
      hasRefusalFallbackOccurred() ||
      hasRefusalFallbackHeaderArmed()
    )
      return;
    let y = atisPin(s);
    if (y === atisPin(h)) return;
    let S = Qyr(),
      now = Date.now();
    if (now < S.nextFetchAt) return;
    let { minIntervalMs: minIntervalMs, maxJitterMs: maxJitterMs } = staleRefetchTiming(),
      q = Math.random() * maxJitterMs;
    S.nextFetchAt = now + q + minIntervalMs;
    let {
      bootstrapFetchCanConvergeSlot: bootstrapFetchCanConvergeSlot,
      refreshBootstrapData: refreshBootstrapData,
    } = await import("./chunk-1qx2v2vg.js");
    if (!bootstrapFetchCanConvergeSlot()) return;
    (logForDebugging("[Bootstrap] Server ATIS pin differs from cached clientData; refetching"),
      await sleep(q, void 0, { unref: !0 }));
    let ke = lit_2("skipped_converged");
    if (Khn() !== y)
      ke = !(await refreshBootstrapData(request.storageV5, request.credentials, { keepRenderCaches: !0 }))
        ? lit_2("fetch_failed")
        : Khn() === y
          ? lit_2("fetched_converged")
          : lit_2("fetched_pins_differ");
    logEvent("tengu_client_data_stale_refetch", {
      outcome: ke,
      server_has_pin: y !== "none",
      min_interval_ms: minIntervalMs,
      jitter_ms: Math.round(q),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2615701-2615760 placement
function Khn() {
  let e = getClientDataAtis();
  return e === void 0 ? "none" : atisPin(e);
}
//@ chunk-e6aww6q8.js:2615760-2615903 placement
function staleRefetchTiming() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_EXPRESSIVE_WHISTLE_CONFIG, {});
  return {
    minIntervalMs: 1000 * clampNumber(e?.minIntervalSeconds, Wyr, Gyr),
    maxJitterMs: 1000 * clampNumber(e?.maxJitterSeconds, qyr, Kyr),
  };
}
//@ chunk-e6aww6q8.js:2615903-2616006 placement
function clampNumber(e, n, r) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(e, r.min), r.max) : n;
}
//@ chunk-e6aww6q8.js:2616006-2616063 placement
class Jhn {
  handlers = void 0;
  spent = void 0;
  lapsedAtMs = void 0;
}
//@ chunk-e6aww6q8.js:2616063-2616090 placement
var $td = new HostScoped(() => new Jhn());

export {
  seedWireShapeFromRecord,
  forgetAgentThread,
  threadSourceKind,
  Ucn,
  isStatelessTetherModel,
  NQe,
  FQe,
  bEe,
  canUseNoTransientReminders,
  classifyThreadError,
  Nhn,
  isSubagentOrUnknown,
  jhn,
  buildTetherDelta,
  hasStructuralEchoDiff,
  logTetherEchoAudit,
  checkTetherPrefixMismatch,
  createSentPrefixChecker,
  reportThinkingDrop,
  refetchStaleClientData,
  liftEphemeralReminders,
  buildWireWithClearAt,
  reminderDeliveryMode,
};
