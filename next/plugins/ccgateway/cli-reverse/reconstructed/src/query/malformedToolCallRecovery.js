/**
 * query/malformedToolCallRecovery.ts
 *
 * 2.1.316 新增：检测模型输出中伪造的用户回合/工具调用片段；上报 tengu_fabricated_turn_candidate等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (19)
 * attribution: placement 19
 */
import { resetStreamingToolExecutor } from "./outputLimitRecovery.js";
import { isAbortError } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import {
  MALFORMED_TOOL_CALL_RETRY,
  isToolResultMessage,
  isInterruptionOnlyMessage,
} from "../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isHumanOrUnset } from "../utils/messageProvenance.js";
import { logEvent } from "../services/analytics/index.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { shortHash } from "../utils/shortHash.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:149839-149909 placement
/**
 * 中止并重置流式执行器
 */
function blockAndResetStream(attemptState) {
  attemptState.needsFollowUp = false;
  return resetStreamingToolExecutor(attemptState, "safety_monitor_block");
}
//@ chunk-ha3km179.js:149909-150081 placement
/**
 * 包装流式回调：中止后不再转发（中止前已开始输出时补发一次 null），回调抛错时记录日志（忽略中止错误）。
 */
function guardedStreamCallback(onRetryStatus, signal) {
  if (!onRetryStatus) return;
  let finished = false;
  let sawStatus = false;
  return (status) => {
    if (finished) return;
    let aborted = signal.aborted;
    if (aborted) {
      finished = true;
      if (!sawStatus) return;
    } else sawStatus = status !== null;
    try {
      onRetryStatus(aborted ? null : status);
    } catch (error) {
      if (isAbortError(error)) return;
      logError(error);
    }
  };
}
//@ chunk-ha3km179.js:150081-150231 placement
var ANTML; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_2;
var regExp_3;
deferInit("chunk-ha3km179.js:150081", () => {
  ANTML = "antml:";
  regExp_2 = new RegExp("<" + ANTML + "invoke\\b");
  regExp_3 = new RegExp(
    `<(?:${ANTML})?(?:function_calls>|invoke name=)|</(?:${ANTML})?(?:function_calls|invoke)>`,
  );
});
//@ chunk-ha3km179.js:150231-150345 placement
/**
 * 判断助手最后一段文本是否以伪造的回合内容结尾（匹配特定正则）。
 */
function endsWithFabricatedTurn(assistantMessages) {
  let text =
    assistantMessages.flatMap((message) => message.message.content).findLast((block) => block.type === "text")
      ?.text ?? "";
  return regExp_2.test(text);
}
//@ chunk-ha3km179.js:150345-150379 placement
/**
 * 命中伪造标记
 */
function matchesFabricatedMarker(text) {
  return regExp_3.test(text);
}
//@ chunk-ha3km179.js:150379-150388 placement
/**
 * 2
 */
var MAX_RECOVERY_ATTEMPTS = 2;
//@ chunk-ha3km179.js:150388-150415 placement
/**
 * 还能再重试
 */
function canRecoverAgain(attempt) {
  return attempt < MAX_RECOVERY_ATTEMPTS;
}
//@ chunk-ha3km179.js:150415-150505 placement
/**
 * 最近的格式错误重试
 */
function recentMalformedRetries(messagesForQuery, malformedToolUseRetryCount) {
  return messagesForQuery
    .filter((message) => message.type === "user" && message.message.content === MALFORMED_TOOL_CALL_RETRY)
    .slice(-malformedToolUseRetryCount);
}
//@ chunk-ha3km179.js:150505-150663 placement
/**
 * 判定格式错误工具调用恢复的结果：成功、再次格式错误、放弃、正常结束或其他。
 */
function recoveryOutcome(toolUseCount, stopReason, isApiErrorMessage, attempt) {
  if (toolUseCount > 0) return "succeeded";
  if (stopReason === "tool_use" && !isApiErrorMessage)
    return canRecoverAgain(attempt) ? "malformed_again" : "gave_up";
  if (stopReason === "end_turn") return "end_turn";
  return "other";
}
//@ chunk-ha3km179.js:150663-150747 placement
/**
 * 是否尝试恢复
 */
function shouldTryRecovery(messages) {
  try {
    return isLastTurnFromHuman(messages) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_waffle", false);
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:150747-151050 placement
/**
 * 最后一个用户回合是否来自真人输入。
 */
function isLastTurnFromHuman(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type === "assistant") return false;
    if (message.type !== "user") continue;
    if (isToolResultMessage(message)) return false;
    if (message.turnCompanion) continue;
    return (
      !message.isMeta &&
      !message.isCompactSummary &&
      !isInterruptionOnlyMessage(message) &&
      isHumanOrUnset(message.origin) &&
      (message.turnOrigin === undefined || message.turnOrigin === "human" || message.turnOrigin === "sdk")
    );
  }
  return false;
}
//@ chunk-ha3km179.js:151050-151331 placement
var FAKE_TURN_SPEAKERS = [
  "um",
  "user",
  "Hmm",
  "User",
  "Benutzer",
  "Human",
  "usr",
  "usem",
  "Mensch",
  "usuario",
];
var FABRICATED_MARKERS = ["Human:", "Assistant:", "<dm ", "<system", "<tool_", "<function_"];
var FABRICATED_TAG_MARKERS = ["<dm ", "<system", "<tool_", "<function_"];
var SPEAKER_LINE_RE = /\n\n(\p{L}{1,12})(?=[< ])/u;
var DOT_USER_RE = /\u00B7 ?(\r?\n\r?\nuser)(?![\p{L}\p{N}])/u;
var FRAGMENT_TAIL_CHARS = 200;
//@ chunk-ha3km179.js:151331-151402 placement
/**
 * 尖括号分类
 */
function classifyAngleChar(char) {
  if (char === "<") return "<";
  if (char === " ") return " ";
  return "other";
}
//@ chunk-ha3km179.js:151402-151471 placement
/**
 * 找伪造片段标记
 */
function findFabricatedMarker(text) {
  for (let marker of FABRICATED_MARKERS) if (text.includes(marker)) return marker;
  return null;
}
//@ chunk-ha3km179.js:151471-152236 placement
/**
 * 检测模型输出中伪造的用户回合/工具调用片段。
 */
function detectFabricatedTurn(text) {
  let match = DOT_USER_RE.exec(text);
  if (match !== null) {
    let markerStart = match.index + match[0].length - match[1].length;
    let text_2 = text.slice(markerStart, markerStart + FRAGMENT_TAIL_CHARS);
    return {
      shape: "tui_user_turn",
      fragment: "user",
      suffix: classifyAngleChar(text[match.index + match[0].length]),
      looksFabricated: true,
      tailMarker: findFabricatedMarker(text_2),
      matchIndex: markerStart,
      tail: text_2,
    };
  }
  let speakerHit = null;
  for (let speaker of FAKE_TURN_SPEAKERS) {
    let index = text.indexOf(`

${speaker}`);
    if (index !== -1 && (speakerHit === null || index < speakerHit.index))
      speakerHit = {
        index,
        fragment: speaker,
      };
  }
  let tagHit = null;
  for (let tag of FABRICATED_TAG_MARKERS) {
    let index = text.indexOf(`

${tag}`);
    if (index !== -1 && (tagHit === null || index < tagHit.index))
      tagHit = {
        index,
        marker: tag,
      };
  }
  if (speakerHit !== null && (tagHit === null || speakerHit.index <= tagHit.index))
    return junkFragmentReport(text, speakerHit.index, speakerHit.fragment);
  if (tagHit !== null) {
    let tail = text.slice(tagHit.index, tagHit.index + FRAGMENT_TAIL_CHARS);
    return {
      shape: "artifact_free",
      fragment: "",
      suffix: "other",
      looksFabricated: true,
      tailMarker: tagHit.marker,
      matchIndex: tagHit.index,
      tail,
    };
  }
  let match_2 = SPEAKER_LINE_RE.exec(text);
  if (match_2 !== null) return junkFragmentReport(text, match_2.index, match_2[1]);
  return null;
}
//@ chunk-ha3km179.js:152236-152415 placement
function junkFragmentReport(text, index, fragment) {
  let suffixIndex = index + 2 + fragment.length;
  let text_2 = text.slice(index, index + FRAGMENT_TAIL_CHARS);
  let fabricatedMarker = findFabricatedMarker(text_2);
  return {
    shape: "junk_fragment",
    fragment,
    suffix: classifyAngleChar(text[suffixIndex]),
    looksFabricated: fabricatedMarker !== null,
    tailMarker: fabricatedMarker,
    matchIndex: index,
    tail: text_2,
  };
}
//@ chunk-ha3km179.js:152415-152505 placement
/**
 * 伪造回合发言者分类
 */
function classifySpeaker(fragment) {
  if (fragment === "") return "none";
  for (let speaker of FAKE_TURN_SPEAKERS) if (speaker === fragment) return speaker;
  return "catch_all";
}
//@ chunk-ha3km179.js:152505-152826 placement
/**
 * 遍历助手消息的文本与思考块，产出疑似伪造回合。
 */
function* findFabricatedTurns(messages) {
  for (let message of messages)
    for (let block of message.message.content) {
      let blockType;
      let blockText;
      if (block.type === "text") {
        blockType = "text";
        blockText = block.text;
      } else if (block.type === "thinking") {
        blockType = "thinking";
        blockText = block.thinking;
      } else continue;
      let fabricatedTurn = detectFabricatedTurn(blockText);
      if (fabricatedTurn === null) continue;
      if (
        classifySpeaker(fabricatedTurn.fragment) === "catch_all" &&
        fabricatedTurn.suffix !== "<" &&
        !fabricatedTurn.looksFabricated
      )
        continue;
      yield {
        hit: fabricatedTurn,
        blockType,
        message,
      };
    }
}
//@ chunk-ha3km179.js:152826-153194 placement
/**
 * 上报 tengu_fabricated_turn_candidate。
 */
function reportFabricatedTurns(messages, attemptModel) {
  for (let { hit, blockType, message } of findFabricatedTurns(messages))
    logEvent("tengu_fabricated_turn_candidate", {
      model: telemetrySafeModelName(attemptModel),
      shape: fromEnum(hit.shape),
      matched_fragment: fromEnum(classifySpeaker(hit.fragment)),
      suffix: fromEnum(hit.suffix),
      looks_fabricated: hit.looksFabricated,
      tail_marker: hit.tailMarker !== null ? fromEnum(hit.tailMarker) : undefined,
      block_type: fromEnum(blockType),
      tail_sha256: shortHash(hit.tail),
      request_id: sanitizeMarkName(message.requestId),
      message_id: sanitizeMarkName(message.message.id),
    });
}
export {
  blockAndResetStream,
  recoveryOutcome,
  guardedStreamCallback,
  reportFabricatedTurns,
  canRecoverAgain,
  endsWithFabricatedTurn,
  recentMalformedRetries,
  shouldTryRecovery,
  matchesFabricatedMarker,
};
