/**
 * cli/print/rewindStandIn.ts
 *
 * 2.1.316 新增：SDK 会话回退（rewind）时在转录中找目标消息、生成替身与预填文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (17)
 * attribution: placement 17
 */
import { isSlackLaterNotification } from "../../utils/messageQueueManager.js";
import { ist } from "../../bridge/inboundMessageOrigin.js";
import { isProjectsRelay, isLegacyHearthRelayMessage } from "../../utils/messageProvenance.js";
import {
  getLastAssistantMessage,
  UUID_PREFIX_LENGTH,
  isSyntheticApiErrorMessage,
} from "../../utils/messages.js";
import { JKn } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { V_e } from "../../plugins/functionHooks/promptSubmit.js";
import {
  isTranscriptRelocationInProgress,
  flushSessionStorage,
  getTranscriptWriteFailureSeq,
} from "../../utils/sessionStorage.js";
import { isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { getMessageIdentityUuids, getDroppedPromptUuids } from "../queuedCommands.js";
import {
  findSingleToolCallPromptIndex,
  Gn,
  textContentOf,
  notificationAnchorSchema,
} from "./rateLimitForwarding.js";
import { YSt, tRe } from "../../utils/transcript/deserialize.js";
import { isInterruptMarkerMessage } from "./resumeTurnBoundaries.js";
import { parseCommandMessage } from "../../utils/messages/apiNormalization.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";

//@ chunk-0sfjpx19.js:16045-16120 placement
function $Lt(e) {
  return e.peek(isSlackLaterNotification) !== void 0 || e.someInFlightDrainCommand(isSlackLaterNotification);
}
//@ chunk-0sfjpx19.js:16120-16197 placement
function den(e) {
  return e.peek(ist) !== void 0 || e.someInFlightDrainCommand(ist);
}
/**
 * 查看队列下一条：优先级为 now 或普通来源时直接返回，否则优先返回满足条件的可替代项。
 */
//@ chunk-0sfjpx19.js:16197-16325 placement
function peekNextQueued(e, n) {
  let peek = e.peek(n);
  if (!peek || peek.priority === "now" || (isProjectsRelay(peek.origin) && !isLegacyHearthRelayMessage(peek)))
    return peek;
  return e.peek((s) => n(s) && ist(s)) ?? peek;
}
//@ chunk-0sfjpx19.js:16325-16408 placement
function UAs(e, n) {
  let r = peekNextQueued(e, n);
  if (r === void 0) return;
  return e.dequeue((s) => s === r);
}
//@ chunk-0sfjpx19.js:16408-16483 placement
var ti = ["rateLimitType", "resetsAt", "overageDisabledReason", "overageScope"];
//@ chunk-0sfjpx19.js:16483-16865 placement
function isUsageLimitDenialStale(e, n, r) {
  let usageLimitDenial = e.usageLimitDenial;
  if (usageLimitDenial === void 0) return !1;
  try {
    let h = getLastAssistantMessage(n)?.quotaLimits;
    return (
      h !== void 0 &&
      ti.every((y) => h[y] === usageLimitDenial.limits[y]) &&
      (h.resetsAt === void 0 || h.resetsAt * 1000 > Date.now()) &&
      JKn({ model: usageLimitDenial.model, rateLimitType: usageLimitDenial.limits.rateLimitType }, r()) &&
      getAPIProvider() !== "gateway" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_still_heron", !0)
    );
  } catch (error) {
    return (logError(error), logFeatureSad("usage_limit_denied_notice", "decision_threw"), !1);
  }
}
//@ chunk-0sfjpx19.js:16865-16959 placement
function rNn(e) {
  return { ...e, shouldQuery: !1, repeatsUsageLimitAlert: !0, stampThreadState: void 0 };
}
//@ chunk-0sfjpx19.js:16959-16983 placement
var NAs = (e) => V_e.has(e);
//@ chunk-0sfjpx19.js:16983-17317 placement
function createDependencyWatcher(e, n, r) {
  let s = !1,
    h = !1,
    y = n(),
    _ = void 0,
    b = () => {
      if (((h = !1), s)) return;
      let T = n();
      if (T.every((D, E) => Object.is(D, y[E]))) return;
      ((y = T), _?.(), (_ = void 0), (_ = r(...T)));
    },
    k = () => {
      if (h || s) return;
      ((h = !0), queueMicrotask(b));
    },
    mapped = e.map((T) => T.subscribe(k)),
    S = () => {
      if (s) return;
      s = !0;
      for (let T of mapped) T();
      (_?.(), (_ = void 0));
    };
  try {
    _ = r(...y);
  } catch (error) {
    throw (S(), error);
  }
  return S;
}
/**
 * 创建转录保存器：冲刷会话存储，若期间发生转录迁移则计为丢失；可查询累计丢失次数。
 */
//@ chunk-0sfjpx19.js:17317-17443 placement
function createTranscriptSaver() {
  let e = 0;
  return {
    save: async () => {
      let n = isTranscriptRelocationInProgress();
      if ((await flushSessionStorage(), n || isTranscriptRelocationInProgress())) return (e++, !1);
      return !0;
    },
    lostSoFar: () => getTranscriptWriteFailureSeq() + e,
  };
}
/**
 * 按 uuid 前缀在消息中定位回退目标（用户消息、带 submitUuid 的本地命令、排队命令附件）。
 */
//@ chunk-0sfjpx19.js:17443-17661 placement
function findRewindTargetIndex(e, n) {
  let sliced = n.slice(0, UUID_PREFIX_LENGTH);
  return e.findIndex(
    (s) =>
      (s.type === "user" ||
        (isSystemLocalCommandMessage(s) && typeof s.submitUuid === "string") ||
        (s.type === "attachment" && s.attachment.type === "queued_command")) &&
      getMessageIdentityUuids(s).some((h) => h.slice(0, UUID_PREFIX_LENGTH) === sliced),
  );
}
/**
 * 在消息里定位回退目标（按 uuid 前缀、允许助手消息），返回索引与预填文本。
 */
//@ chunk-0sfjpx19.js:17661-18689 placement
function findRewindTarget(e, n, { allowAssistantTarget: r = !1 } = {}) {
  let sliced = n.slice(0, UUID_PREFIX_LENGTH),
    h = findRewindTargetIndex(e, n);
  if (h < 0) {
    if (((h = findSingleToolCallPromptIndex(e, n)), h >= 0))
      return { index: h, uuid: e[h].uuid, prefillText: null };
    if (e.some((_) => YSt(_).some((b) => b.slice(0, UUID_PREFIX_LENGTH) === sliced))) return null;
    for (let [_, b] of e.entries()) {
      let found = getDroppedPromptUuids(b).find((w) => w.slice(0, UUID_PREFIX_LENGTH) === sliced);
      if (found !== void 0)
        return e.some(
          (S, T) =>
            T > _ &&
            ((S.type === "assistant" && !isSyntheticApiErrorMessage(S)) ||
              (Gn(e, T) && !(S.type === "user" && isInterruptMarkerMessage(S)))),
        )
          ? null
          : { index: _, uuid: found, prefillText: null, wordsNotKept: !0 };
    }
    if (r) return findAssistantRewindTarget(e, sliced);
  }
  let y = e[h];
  if (y?.type === "user" && y.stackedExpansion)
    for (let _ = h - 1; _ >= 0; _--) {
      let b = e[_];
      if (b?.type === "user" && !b.isMeta && !b.stackedExpansion) {
        ((h = _), (y = b));
        break;
      }
    }
  if (y?.type === "user")
    return {
      index: h,
      uuid: y.uuid,
      prefillText: y.stackedOriginalInput || textContentOf(y.message.content),
    };
  if (y !== void 0 && isSystemLocalCommandMessage(y) && typeof y.submitUuid === "string")
    return { index: h, uuid: y.submitUuid, prefillText: parseCommandMessage(y.content)?.line ?? y.content };
  if (y?.type === "attachment" && y.attachment.type === "queued_command")
    return {
      index: h,
      uuid: y.attachment.source_uuid ?? y.uuid,
      prefillText: textContentOf(y.attachment.prompt),
    };
  return null;
}
//@ chunk-0sfjpx19.js:18689-18931 placement
function findAssistantRewindTarget(e, n) {
  let index = e.findIndex((h) => h.type === "assistant" && h.uuid.slice(0, UUID_PREFIX_LENGTH) === n),
    s = e[index];
  return s?.type === "assistant" &&
    !e.slice(0, index).some((h) => h.type === "assistant" && h.message.id === s.message.id)
    ? { index: index, uuid: s.uuid, prefillText: null }
    : null;
}
/**
 * 若消息是 rewind_stand_in 系统消息，返回其 source_uuid。
 */
//@ chunk-0sfjpx19.js:18931-19058 placement
function standInSourceUuid(e) {
  return e?.type === "system" && e.subtype === "rewind_stand_in" && typeof e.source_uuid === "string"
    ? e.source_uuid
    : void 0;
}
/**
 * 按 uuid 前缀找到对应的回退替身消息，返回其索引与源 uuid。
 */
//@ chunk-0sfjpx19.js:19058-19209 placement
function findStandInTarget(e, n) {
  let sliced = n.slice(0, UUID_PREFIX_LENGTH),
    index = e.findIndex((y) => standInSourceUuid(y)?.slice(0, UUID_PREFIX_LENGTH) === sliced),
    h = standInSourceUuid(e[index]);
  return h === void 0 ? null : { index: index, uuid: h, prefillText: null };
}
/**
 * 判断最后一条压缩摘要之后是否还有新的用户回合。
 */
//@ chunk-0sfjpx19.js:19209-19329 placement
function hasTurnAfterLastSummary(e) {
  let lastIndex = e.findLastIndex((r) => r.type === "user" && r.isCompactSummary === !0);
  return e.some((r, s) => s > lastIndex && Gn(e, s));
}
/**
 * 回退后保留行的一致性检查（摘要未列出、移动、开启新轮等）。
 */
//@ chunk-0sfjpx19.js:19329-20551 placement
function checkRewindKeptRows(e, n) {
  let lastIndex = e.findLastIndex(isCompactBoundaryMessage),
    s = e[lastIndex],
    lastIndex_2 = e.findLastIndex((N) => N.type === "user" && N.isCompactSummary === !0),
    y = e[lastIndex_2],
    sliced = n.slice(0, UUID_PREFIX_LENGTH),
    b =
      y !== void 0 && lastIndex_2 > lastIndex
        ? YSt(y).find((N) => N.slice(0, UUID_PREFIX_LENGTH) === sliced)
        : void 0;
  if (y === void 0 || b === void 0 || s === void 0 || !isCompactBoundaryMessage(s))
    return { miss: "no_summary_names_target" };
  let compactMetadata = s.compactMetadata,
    w = new Set([y.uuid]),
    S = lastIndex_2 + 1;
  if (compactMetadata?.preservedMessages !== void 0 || compactMetadata?.preservedSegment !== void 0) {
    let safeParse = notificationAnchorSchema().safeParse(compactMetadata.preservedMessages);
    if (!safeParse.success || safeParse.data.anchorUuid !== y.uuid) return { miss: "kept_rows_not_listed" };
    let G = new Set([...safeParse.data.uuids, ...(safeParse.data.allUuids ?? [])]),
      index = e.findIndex((L, oe) => oe > lastIndex_2 && !G.has(L.uuid));
    S = index < 0 ? e.length : index;
    let sliced = e.slice(lastIndex_2 + 1, S),
      U = new Set(sliced.map((L) => L.uuid));
    if (!safeParse.data.uuids.every((uuid) => U.has(uuid)) || e.some((L, oe) => oe >= S && G.has(L.uuid)))
      return { miss: "kept_rows_moved" };
    if (sliced.some((L) => L.type === "user" && !tRe(L))) return { miss: "kept_row_opens_turn" };
    for (let uuid of safeParse.data.uuids) w.add(uuid);
  }
  if (hasTurnAfterLastSummary(e)) return { miss: "later_input" };
  let index = e.findIndex((N, G) => G >= S && (N.type === "user" || N.type === "assistant")),
    D = index < 0 ? e.length : index,
    last = e.findLast((N, G) => G < D && (N.type === "user" || N.type === "assistant"));
  if (last === void 0 || !w.has(last.uuid)) return { miss: "kept_anchor_not_on_disk" };
  return { index: D, uuid: b, anchorUuid: last.uuid, keptRows: S - lastIndex_2 - 1 };
}

export {
  createDependencyWatcher,
  isUsageLimitDenialStale,
  den,
  $Lt,
  rNn,
  findRewindTarget,
  createTranscriptSaver,
  peekNextQueued,
  UAs,
  NAs,
  findStandInTarget,
  hasTurnAfterLastSummary,
  findRewindTargetIndex,
  checkRewindKeptRows,
  standInSourceUuid,
};
