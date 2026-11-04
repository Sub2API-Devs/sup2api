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
function peekNextQueued(queue, predicate) {
  let head = queue.peek(predicate);
  if (!head || head.priority === "now" || (isProjectsRelay(head.origin) && !isLegacyHearthRelayMessage(head)))
    return head;
  return queue.peek((queued) => predicate(queued) && isVerifiedSlackHumanTurn(queued)) ?? head;
}
//@ chunk-0sfjpx19.js:16325-16408 placement
/**
 * 从队列取出下一条可处理的排队消息（按 peekNextQueued 结果精确 dequeue）。
 */
function dequeueQueuedMessage(queue, predicate) {
  let head = peekNextQueued(queue, predicate);
  if (head === undefined) return;
  return queue.dequeue((queued) => queued === head);
}
//@ chunk-0sfjpx19.js:16408-16483 placement
var USAGE_LIMIT_FIELDS = ["rateLimitType", "resetsAt", "overageDisabledReason", "overageScope"];
//@ chunk-0sfjpx19.js:16483-16865 placement
function isUsageLimitDenialStale(message, messages, resolveModel) {
  let usageLimitDenial = message.usageLimitDenial;
  if (usageLimitDenial === undefined) return false;
  try {
    let quotaLimits = getLastAssistantMessage(messages)?.quotaLimits;
    return (
      quotaLimits !== undefined &&
      USAGE_LIMIT_FIELDS.every((field) => quotaLimits[field] === usageLimitDenial.limits[field]) &&
      (quotaLimits.resetsAt === undefined || quotaLimits.resetsAt * 1000 > Date.now()) &&
      limitAppliesToModelOrCanonical(
        {
          model: usageLimitDenial.model,
          rateLimitType: usageLimitDenial.limits.rateLimitType,
        },
        resolveModel(),
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
function usageLimitStandInMessage(message) {
  return {
    ...message,
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
function createDependencyWatcher(sources, read, run) {
  let disposed = false;
  let queued = false;
  let prev = read();
  let stop = undefined;
  let flush = () => {
    queued = false;
    if (disposed) return;
    let next = read();
    if (next.every((value, index) => Object.is(value, prev[index]))) return;
    prev = next;
    stop?.();
    stop = undefined;
    stop = run(...next);
  };
  let schedule = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(flush);
  };
  let mapped = sources.map((source) => source.subscribe(schedule));
  let teardown = () => {
    if (disposed) return;
    disposed = true;
    for (let unsubscribe of mapped) unsubscribe();
    stop?.();
    stop = undefined;
  };
  try {
    stop = run(...prev);
  } catch (error) {
    teardown();
    throw error;
  }
  return teardown;
}
//@ chunk-0sfjpx19.js:17317-17443 placement
/**
 * 创建转录保存器：冲刷会话存储，若期间发生转录迁移则计为丢失；可查询累计丢失次数。
 */
function createTranscriptSaver() {
  let lostCount = 0;
  return {
    save: async () => {
      let relocating = isTranscriptRelocationInProgress();
      await flushSessionStorage();
      if (relocating || isTranscriptRelocationInProgress()) {
        lostCount++;
        return false;
      }
      return true;
    },
    lostSoFar: () => getTranscriptWriteFailureSeq() + lostCount,
  };
}
//@ chunk-0sfjpx19.js:17443-17661 placement
/**
 * 按 uuid 前缀在消息中定位回退目标（用户消息、带 submitUuid 的本地命令、排队命令附件）。
 */
function findRewindTargetIndex(messages, targetUuid) {
  let sliced = targetUuid.slice(0, UUID_PREFIX_LENGTH);
  return messages.findIndex(
    (message) =>
      (message.type === "user" ||
        (isSystemLocalCommandMessage(message) && typeof message.submitUuid === "string") ||
        (message.type === "attachment" && message.attachment.type === "queued_command")) &&
      getMessageIdentityUuids(message).some((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === sliced),
  );
}
//@ chunk-0sfjpx19.js:17661-18689 placement
/**
 * 在消息里定位回退目标（按 uuid 前缀、允许助手消息），返回索引与预填文本。
 */
function findRewindTarget(messages, targetMessageUuid, { allowAssistantTarget = false } = {}) {
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
    if (
      messages.some((message) =>
        summarizedPromptUuids(message).some((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === sliced),
      )
    )
      return null;
    for (let [index, message] of messages.entries()) {
      let found = getDroppedPromptUuids(message).find((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === sliced);
      if (found !== undefined)
        return messages.some(
          (message, entryIndex) =>
            entryIndex > index &&
            ((message.type === "assistant" && !isSyntheticApiErrorMessage(message)) ||
              (machineOriginPromptAt(messages, entryIndex) &&
                !(message.type === "user" && isInterruptMarkerMessage(message)))),
        )
          ? null
          : {
              index,
              uuid: found,
              prefillText: null,
              wordsNotKept: true,
            };
    }
    if (allowAssistantTarget) return findAssistantRewindTarget(messages, sliced);
  }
  let target = messages[rewindTargetIndex];
  if (target?.type === "user" && target.stackedExpansion)
    for (let j = rewindTargetIndex - 1; j >= 0; j--) {
      let message = messages[j];
      if (message?.type === "user" && !message.isMeta && !message.stackedExpansion) {
        rewindTargetIndex = j;
        target = message;
        break;
      }
    }
  if (target?.type === "user")
    return {
      index: rewindTargetIndex,
      uuid: target.uuid,
      prefillText: target.stackedOriginalInput || textContentOf(target.message.content),
    };
  if (target !== undefined && isSystemLocalCommandMessage(target) && typeof target.submitUuid === "string")
    return {
      index: rewindTargetIndex,
      uuid: target.submitUuid,
      prefillText: parseCommandMessage(target.content)?.line ?? target.content,
    };
  if (target?.type === "attachment" && target.attachment.type === "queued_command")
    return {
      index: rewindTargetIndex,
      uuid: target.attachment.source_uuid ?? target.uuid,
      prefillText: textContentOf(target.attachment.prompt),
    };
  return null;
}
//@ chunk-0sfjpx19.js:18689-18931 placement
function findAssistantRewindTarget(messages, sliced) {
  let index = messages.findIndex(
    (message) => message.type === "assistant" && message.uuid.slice(0, UUID_PREFIX_LENGTH) === sliced,
  );
  let target = messages[index];
  return target?.type === "assistant" &&
    !messages
      .slice(0, index)
      .some((message) => message.type === "assistant" && message.message.id === target.message.id)
    ? {
        index,
        uuid: target.uuid,
        prefillText: null,
      }
    : null;
}
//@ chunk-0sfjpx19.js:18931-19058 placement
/**
 * 若消息是 rewind_stand_in 系统消息，返回其 source_uuid。
 */
function standInSourceUuid(message) {
  return message?.type === "system" &&
    message.subtype === "rewind_stand_in" &&
    typeof message.source_uuid === "string"
    ? message.source_uuid
    : undefined;
}
//@ chunk-0sfjpx19.js:19058-19209 placement
/**
 * 按 uuid 前缀找到对应的回退替身消息，返回其索引与源 uuid。
 */
function findStandInTarget(messages, targetUuid) {
  let sliced = targetUuid.slice(0, UUID_PREFIX_LENGTH);
  let index = messages.findIndex(
    (message) => standInSourceUuid(message)?.slice(0, UUID_PREFIX_LENGTH) === sliced,
  );
  let sourceUuid = standInSourceUuid(messages[index]);
  return sourceUuid === undefined
    ? null
    : {
        index,
        uuid: sourceUuid,
        prefillText: null,
      };
}
//@ chunk-0sfjpx19.js:19209-19329 placement
/**
 * 判断最后一条压缩摘要之后是否还有新的用户回合。
 */
function hasTurnAfterLastSummary(messages) {
  let lastIndex = messages.findLastIndex(
    (message) => message.type === "user" && message.isCompactSummary === true,
  );
  return messages.some((message, index) => index > lastIndex && machineOriginPromptAt(messages, index));
}
//@ chunk-0sfjpx19.js:19329-20551 placement
/**
 * 回退后保留行的一致性检查（摘要未列出、移动、开启新轮等）。
 */
function checkRewindKeptRows(messages, targetUuid) {
  let lastIndex = messages.findLastIndex(isCompactBoundaryMessage);
  let lastRow = messages[lastIndex];
  let lastIndex_2 = messages.findLastIndex(
    (message) => message.type === "user" && message.isCompactSummary === true,
  );
  let summary = messages[lastIndex_2];
  let sliced = targetUuid.slice(0, UUID_PREFIX_LENGTH);
  let found =
    summary !== undefined && lastIndex_2 > lastIndex
      ? summarizedPromptUuids(summary).find((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === sliced)
      : undefined;
  if (
    summary === undefined ||
    found === undefined ||
    lastRow === undefined ||
    !isCompactBoundaryMessage(lastRow)
  )
    return {
      miss: "no_summary_names_target",
    };
  let compactMetadata = lastRow.compactMetadata;
  let keptSet = new Set([summary.uuid]);
  let endIndex = lastIndex_2 + 1;
  if (compactMetadata?.preservedMessages !== undefined || compactMetadata?.preservedSegment !== undefined) {
    let parsed = notificationAnchorSchema().safeParse(compactMetadata.preservedMessages);
    if (!parsed.success || parsed.data.anchorUuid !== summary.uuid)
      return {
        miss: "kept_rows_not_listed",
      };
    let preservedUuids = new Set([...parsed.data.uuids, ...(parsed.data.allUuids ?? [])]);
    let index = messages.findIndex(
      (message, index) => index > lastIndex_2 && !preservedUuids.has(message.uuid),
    );
    endIndex = index < 0 ? messages.length : index;
    let sliced = messages.slice(lastIndex_2 + 1, endIndex);
    let onDisk = new Set(sliced.map((row) => row.uuid));
    if (
      !parsed.data.uuids.every((uuid) => onDisk.has(uuid)) ||
      messages.some((message, index) => index >= endIndex && preservedUuids.has(message.uuid))
    )
      return {
        miss: "kept_rows_moved",
      };
    if (sliced.some((row) => row.type === "user" && !isNonPromptUserRow(row)))
      return {
        miss: "kept_row_opens_turn",
      };
    for (let uuid of parsed.data.uuids) keptSet.add(uuid);
  }
  if (hasTurnAfterLastSummary(messages))
    return {
      miss: "later_input",
    };
  let index = messages.findIndex(
    (message, index) => index >= endIndex && (message.type === "user" || message.type === "assistant"),
  );
  let firstRowIndex = index < 0 ? messages.length : index;
  let last = messages.findLast(
    (message, index) => index < firstRowIndex && (message.type === "user" || message.type === "assistant"),
  );
  if (last === undefined || !keptSet.has(last.uuid))
    return {
      miss: "kept_anchor_not_on_disk",
    };
  return {
    index: firstRowIndex,
    uuid: found,
    anchorUuid: last.uuid,
    keptRows: endIndex - lastIndex_2 - 1,
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
