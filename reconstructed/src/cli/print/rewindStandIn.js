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
import { isVerifiedSlackHumanTurn } from "../../bridge/inboundMessageOrigin.js";
import { isProjectsRelay, isLegacyHearthRelayMessage } from "../../utils/messageProvenance.js";
import {
  getLastAssistantMessage,
  UUID_PREFIX_LENGTH,
  isSyntheticApiErrorMessage,
} from "../../utils/messages.js";
import { limitAppliesToModelOrCanonical } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { submitMarks } from "../../plugins/functionHooks/promptSubmit.js";
import {
  isTranscriptRelocationInProgress,
  flushSessionStorage,
  getTranscriptWriteFailureSeq,
} from "../../utils/sessionStorage.js";
import { isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { getMessageIdentityUuids, getDroppedPromptUuids } from "../queuedCommands.js";
import {
  findSingleToolCallPromptIndex,
  machineOriginPromptAt,
  textContentOf,
  notificationAnchorSchema,
} from "./rateLimitForwarding.js";
import { summarizedPromptUuids, isNonPromptUserRow } from "../../utils/transcript/deserialize.js";
import { isInterruptMarkerMessage } from "./resumeTurnBoundaries.js";
import { parseCommandMessage } from "../../utils/messages/apiNormalization.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";

//@ chunk-0sfjpx19.js:16045-16120 placement
/**
 * 队列里是否有 Slack later 通知（头部或在途排空命令命中）。
 */
function hasSlackLaterNotification(messageQueue) {
  return (
    messageQueue.peek(isSlackLaterNotification) !== undefined ||
    messageQueue.someInFlightDrainCommand(isSlackLaterNotification)
  );
}
//@ chunk-0sfjpx19.js:16120-16197 placement
/**
 * 队列里是否有已核验的 Slack 人类回合（头部或在途命令命中）。
 */
function hasVerifiedSlackHumanTurn(messageQueue) {
  return (
    messageQueue.peek(isVerifiedSlackHumanTurn) !== undefined ||
    messageQueue.someInFlightDrainCommand(isVerifiedSlackHumanTurn)
  );
}
//@ chunk-0sfjpx19.js:16197-16325 placement
/**
 * 查看队列下一条：优先级为 now 或普通来源时直接返回，否则优先返回满足条件的可替代项。
 */
function peekNextQueued(e, n) {
  let r = e.peek(n);
  if (!r || r.priority === "now" || (isProjectsRelay(r.origin) && !isLegacyHearthRelayMessage(r))) return r;
  return e.peek((s) => n(s) && isVerifiedSlackHumanTurn(s)) ?? r;
}
//@ chunk-0sfjpx19.js:16325-16408 placement
/**
 * 从队列取出下一条可处理的排队消息（按 peekNextQueued 结果精确 dequeue）。
 */
function dequeueQueuedMessage(messageQueue, n) {
  let r = peekNextQueued(messageQueue, n);
  if (r === undefined) return;
  return messageQueue.dequeue((s) => s === r);
}
//@ chunk-0sfjpx19.js:16408-16483 placement
var USAGE_LIMIT_FIELDS = ["rateLimitType", "resetsAt", "overageDisabledReason", "overageScope"];
//@ chunk-0sfjpx19.js:16483-16865 placement
function isUsageLimitDenialStale(e, n, r) {
  let usageLimitDenial = e.usageLimitDenial;
  if (usageLimitDenial === undefined) return false;
  try {
    let quotaLimits = getLastAssistantMessage(n)?.quotaLimits;
    return (
      quotaLimits !== undefined &&
      USAGE_LIMIT_FIELDS.every((y) => quotaLimits[y] === usageLimitDenial.limits[y]) &&
      (quotaLimits.resetsAt === undefined || quotaLimits.resetsAt * 1000 > Date.now()) &&
      limitAppliesToModelOrCanonical(
        {
          model: usageLimitDenial.model,
          rateLimitType: usageLimitDenial.limits.rateLimitType,
        },
        r(),
      ) &&
      getAPIProvider() !== "gateway" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_still_heron", true)
    );
  } catch (error) {
    logError(error);
    logFeatureSad("usage_limit_denied_notice", "decision_threw");
    return false;
  }
}
//@ chunk-0sfjpx19.js:16865-16959 placement
/**
 * 构造用量限额越限后的替代消息：不查询、重复提醒、清掉线程标记。
 */
function usageLimitStandInMessage(e) {
  return {
    ...e,
    shouldQuery: false,
    repeatsUsageLimitAlert: true,
    stampThreadState: undefined,
  };
}
//@ chunk-0sfjpx19.js:16959-16983 placement
/**
 * 判断名字是否在分析事件名集合（V_e）里。
 */
var isAnalyticsEventName = (uuid) => submitMarks.has(uuid);
//@ chunk-0sfjpx19.js:16983-17317 placement
function createDependencyWatcher(e, n, r) {
  let s = false;
  let h = false;
  let y = n();
  let _ = undefined;
  let b = () => {
    h = false;
    if (s) return;
    let T = n();
    if (T.every((D, E) => Object.is(D, y[E]))) return;
    y = T;
    _?.();
    _ = undefined;
    _ = r(...T);
  };
  let k = () => {
    if (h || s) return;
    h = true;
    queueMicrotask(b);
  };
  let mapped = e.map((T) => T.subscribe(k));
  let S = () => {
    if (s) return;
    s = true;
    for (let T of mapped) T();
    _?.();
    _ = undefined;
  };
  try {
    _ = r(...y);
  } catch (error) {
    S();
    throw error;
  }
  return S;
}
//@ chunk-0sfjpx19.js:17317-17443 placement
/**
 * 创建转录保存器：冲刷会话存储，若期间发生转录迁移则计为丢失；可查询累计丢失次数。
 */
function createTranscriptSaver() {
  let e = 0;
  return {
    save: async () => {
      let n = isTranscriptRelocationInProgress();
      await flushSessionStorage();
      if (n || isTranscriptRelocationInProgress()) {
        e++;
        return false;
      }
      return true;
    },
    lostSoFar: () => getTranscriptWriteFailureSeq() + e,
  };
}
//@ chunk-0sfjpx19.js:17443-17661 placement
/**
 * 按 uuid 前缀在消息中定位回退目标（用户消息、带 submitUuid 的本地命令、排队命令附件）。
 */
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
//@ chunk-0sfjpx19.js:17661-18689 placement
/**
 * 在消息里定位回退目标（按 uuid 前缀、允许助手消息），返回索引与预填文本。
 */
function findRewindTarget(messages, targetMessageUuid, { allowAssistantTarget: r = false } = {}) {
  let sliced = targetMessageUuid.slice(0, UUID_PREFIX_LENGTH);
  let rewindTargetIndex = findRewindTargetIndex(messages, targetMessageUuid);
  if (rewindTargetIndex < 0) {
    rewindTargetIndex = findSingleToolCallPromptIndex(messages, targetMessageUuid);
    if (rewindTargetIndex >= 0)
      return {
        index: rewindTargetIndex,
        uuid: messages[rewindTargetIndex].uuid,
        prefillText: null,
      };
    if (messages.some((_) => summarizedPromptUuids(_).some((b) => b.slice(0, UUID_PREFIX_LENGTH) === sliced)))
      return null;
    for (let [_, b] of messages.entries()) {
      let found = getDroppedPromptUuids(b).find((w) => w.slice(0, UUID_PREFIX_LENGTH) === sliced);
      if (found !== undefined)
        return messages.some(
          (S, T) =>
            T > _ &&
            ((S.type === "assistant" && !isSyntheticApiErrorMessage(S)) ||
              (machineOriginPromptAt(messages, T) && !(S.type === "user" && isInterruptMarkerMessage(S)))),
        )
          ? null
          : {
              index: _,
              uuid: found,
              prefillText: null,
              wordsNotKept: true,
            };
    }
    if (r) return findAssistantRewindTarget(messages, sliced);
  }
  let y = messages[rewindTargetIndex];
  if (y?.type === "user" && y.stackedExpansion)
    for (let j = rewindTargetIndex - 1; j >= 0; j--) {
      let b = messages[j];
      if (b?.type === "user" && !b.isMeta && !b.stackedExpansion) {
        rewindTargetIndex = j;
        y = b;
        break;
      }
    }
  if (y?.type === "user")
    return {
      index: rewindTargetIndex,
      uuid: y.uuid,
      prefillText: y.stackedOriginalInput || textContentOf(y.message.content),
    };
  if (y !== undefined && isSystemLocalCommandMessage(y) && typeof y.submitUuid === "string")
    return {
      index: rewindTargetIndex,
      uuid: y.submitUuid,
      prefillText: parseCommandMessage(y.content)?.line ?? y.content,
    };
  if (y?.type === "attachment" && y.attachment.type === "queued_command")
    return {
      index: rewindTargetIndex,
      uuid: y.attachment.source_uuid ?? y.uuid,
      prefillText: textContentOf(y.attachment.prompt),
    };
  return null;
}
//@ chunk-0sfjpx19.js:18689-18931 placement
function findAssistantRewindTarget(e, n) {
  let index = e.findIndex((h) => h.type === "assistant" && h.uuid.slice(0, UUID_PREFIX_LENGTH) === n);
  let s = e[index];
  return s?.type === "assistant" &&
    !e.slice(0, index).some((h) => h.type === "assistant" && h.message.id === s.message.id)
    ? {
        index,
        uuid: s.uuid,
        prefillText: null,
      }
    : null;
}
//@ chunk-0sfjpx19.js:18931-19058 placement
/**
 * 若消息是 rewind_stand_in 系统消息，返回其 source_uuid。
 */
function standInSourceUuid(e) {
  return e?.type === "system" && e.subtype === "rewind_stand_in" && typeof e.source_uuid === "string"
    ? e.source_uuid
    : undefined;
}
//@ chunk-0sfjpx19.js:19058-19209 placement
/**
 * 按 uuid 前缀找到对应的回退替身消息，返回其索引与源 uuid。
 */
function findStandInTarget(e, n) {
  let sliced = n.slice(0, UUID_PREFIX_LENGTH);
  let index = e.findIndex((y) => standInSourceUuid(y)?.slice(0, UUID_PREFIX_LENGTH) === sliced);
  let h = standInSourceUuid(e[index]);
  return h === undefined
    ? null
    : {
        index,
        uuid: h,
        prefillText: null,
      };
}
//@ chunk-0sfjpx19.js:19209-19329 placement
/**
 * 判断最后一条压缩摘要之后是否还有新的用户回合。
 */
function hasTurnAfterLastSummary(e) {
  let lastIndex = e.findLastIndex((r) => r.type === "user" && r.isCompactSummary === true);
  return e.some((r, s) => s > lastIndex && machineOriginPromptAt(e, s));
}
//@ chunk-0sfjpx19.js:19329-20551 placement
/**
 * 回退后保留行的一致性检查（摘要未列出、移动、开启新轮等）。
 */
function checkRewindKeptRows(e, n) {
  let lastIndex = e.findLastIndex(isCompactBoundaryMessage);
  let s = e[lastIndex];
  let lastIndex_2 = e.findLastIndex((N) => N.type === "user" && N.isCompactSummary === true);
  let y = e[lastIndex_2];
  let sliced = n.slice(0, UUID_PREFIX_LENGTH);
  let b =
    y !== undefined && lastIndex_2 > lastIndex
      ? summarizedPromptUuids(y).find((N) => N.slice(0, UUID_PREFIX_LENGTH) === sliced)
      : undefined;
  if (y === undefined || b === undefined || s === undefined || !isCompactBoundaryMessage(s))
    return {
      miss: "no_summary_names_target",
    };
  let compactMetadata = s.compactMetadata;
  let w = new Set([y.uuid]);
  let S = lastIndex_2 + 1;
  if (compactMetadata?.preservedMessages !== undefined || compactMetadata?.preservedSegment !== undefined) {
    let N = notificationAnchorSchema().safeParse(compactMetadata.preservedMessages);
    if (!N.success || N.data.anchorUuid !== y.uuid)
      return {
        miss: "kept_rows_not_listed",
      };
    let G = new Set([...N.data.uuids, ...(N.data.allUuids ?? [])]);
    let index = e.findIndex((L, oe) => oe > lastIndex_2 && !G.has(L.uuid));
    S = index < 0 ? e.length : index;
    let sliced = e.slice(lastIndex_2 + 1, S);
    let U = new Set(sliced.map((L) => L.uuid));
    if (!N.data.uuids.every((uuid) => U.has(uuid)) || e.some((L, oe) => oe >= S && G.has(L.uuid)))
      return {
        miss: "kept_rows_moved",
      };
    if (sliced.some((L) => L.type === "user" && !isNonPromptUserRow(L)))
      return {
        miss: "kept_row_opens_turn",
      };
    for (let uuid of N.data.uuids) w.add(uuid);
  }
  if (hasTurnAfterLastSummary(e))
    return {
      miss: "later_input",
    };
  let index = e.findIndex((N, G) => G >= S && (N.type === "user" || N.type === "assistant"));
  let D = index < 0 ? e.length : index;
  let last = e.findLast((N, G) => G < D && (N.type === "user" || N.type === "assistant"));
  if (last === undefined || !w.has(last.uuid))
    return {
      miss: "kept_anchor_not_on_disk",
    };
  return {
    index: D,
    uuid: b,
    anchorUuid: last.uuid,
    keptRows: S - lastIndex_2 - 1,
  };
}
export {
  createDependencyWatcher,
  isUsageLimitDenialStale,
  hasVerifiedSlackHumanTurn,
  hasSlackLaterNotification,
  usageLimitStandInMessage,
  findRewindTarget,
  createTranscriptSaver,
  peekNextQueued,
  dequeueQueuedMessage,
  isAnalyticsEventName,
  findStandInTarget,
  hasTurnAfterLastSummary,
  findRewindTargetIndex,
  checkRewindKeptRows,
  standInSourceUuid,
};
