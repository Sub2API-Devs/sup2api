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
import { gn } from "../utils/shortHash.js";
import { ye } from "../utils/startupMarks.js";

//@ chunk-ha3km179.js:149839-149909 placement
function sc(e) {
  return ((e.needsFollowUp = !1), resetStreamingToolExecutor(e, "safety_monitor_block"));
}
/**
 * 包装流式回调：中止后不再转发（中止前已开始输出时补发一次 null），回调抛错时记录日志（忽略中止错误）。
 */
//@ chunk-ha3km179.js:149909-150081 placement
function guardedStreamCallback(e, n) {
  if (!e) return;
  let r = !1,
    s = !1;
  return (h) => {
    if (r) return;
    let aborted = n.aborted;
    if (aborted) {
      if (((r = !0), !s)) return;
    } else s = h !== null;
    try {
      e(aborted ? null : h);
    } catch (error) {
      if (isAbortError(error)) return;
      logError(error);
    }
  };
}
//@ chunk-ha3km179.js:150081-150231 placement
var ANTML = "antml:",
  regExp_2 = new RegExp("<" + ANTML + "invoke\\b"),
  regExp_3 = new RegExp(
    `<(?:${ANTML})?(?:function_calls>|invoke name=)|</(?:${ANTML})?(?:function_calls|invoke)>`,
  );
/**
 * 判断助手最后一段文本是否以伪造的回合内容结尾（匹配特定正则）。
 */
//@ chunk-ha3km179.js:150231-150345 placement
function endsWithFabricatedTurn(e) {
  let n = e.flatMap((r) => r.message.content).findLast((r) => r.type === "text")?.text ?? "";
  return regExp_2.test(n);
}
//@ chunk-ha3km179.js:150345-150379 placement
function sSo(e) {
  return regExp_3.test(e);
}
//@ chunk-ha3km179.js:150379-150388 placement
var Gg = 2;
//@ chunk-ha3km179.js:150388-150415 placement
function Mi(e) {
  return e < Gg;
}
//@ chunk-ha3km179.js:150415-150505 placement
function lc(e, n) {
  return e.filter((r) => r.type === "user" && r.message.content === MALFORMED_TOOL_CALL_RETRY).slice(-n);
}
/**
 * 判定格式错误工具调用恢复的结果：成功、再次格式错误、放弃、正常结束或其他。
 */
//@ chunk-ha3km179.js:150505-150663 placement
function recoveryOutcome(e, n, r, s) {
  if (e > 0) return "succeeded";
  if (n === "tool_use" && !r) return Mi(s) ? "malformed_again" : "gave_up";
  if (n === "end_turn") return "end_turn";
  return "other";
}
//@ chunk-ha3km179.js:150663-150747 placement
function uc(e) {
  try {
    return isLastTurnFromHuman(e) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_waffle", !1);
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 最后一个用户回合是否来自真人输入。
 */
//@ chunk-ha3km179.js:150747-151050 placement
function isLastTurnFromHuman(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r.type === "assistant") return !1;
    if (r.type !== "user") continue;
    if (isToolResultMessage(r)) return !1;
    if (r.turnCompanion) continue;
    return (
      !r.isMeta &&
      !r.isCompactSummary &&
      !isInterruptionOnlyMessage(r) &&
      isHumanOrUnset(r.origin) &&
      (r.turnOrigin === void 0 || r.turnOrigin === "human" || r.turnOrigin === "sdk")
    );
  }
  return !1;
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
  ],
  FABRICATED_MARKERS = ["Human:", "Assistant:", "<dm ", "<system", "<tool_", "<function_"],
  FABRICATED_TAG_MARKERS = ["<dm ", "<system", "<tool_", "<function_"],
  SPEAKER_LINE_RE = /\n\n(\p{L}{1,12})(?=[< ])/u,
  DOT_USER_RE = /\u00B7 ?(\r?\n\r?\nuser)(?![\p{L}\p{N}])/u,
  FRAGMENT_TAIL_CHARS = 200;
//@ chunk-ha3km179.js:151331-151402 placement
function gc(e) {
  if (e === "<") return "<";
  if (e === " ") return " ";
  return "other";
}
//@ chunk-ha3km179.js:151402-151471 placement
function yc(e) {
  for (let n of FABRICATED_MARKERS) if (e.includes(n)) return n;
  return null;
}
/**
 * 检测模型输出中伪造的用户回合/工具调用片段。
 */
//@ chunk-ha3km179.js:151471-152236 placement
function detectFabricatedTurn(e) {
  let match = DOT_USER_RE.exec(e);
  if (match !== null) {
    let y = match.index + match[0].length - match[1].length,
      sliced = e.slice(y, y + FRAGMENT_TAIL_CHARS);
    return {
      shape: "tui_user_turn",
      fragment: "user",
      suffix: gc(e[match.index + match[0].length]),
      looksFabricated: !0,
      tailMarker: yc(sliced),
      matchIndex: y,
      tail: sliced,
    };
  }
  let r = null;
  for (let y of FAKE_TURN_SPEAKERS) {
    let index = e.indexOf(`

${y}`);
    if (index !== -1 && (r === null || index < r.index)) r = { index: index, fragment: y };
  }
  let s = null;
  for (let y of FABRICATED_TAG_MARKERS) {
    let index = e.indexOf(`

${y}`);
    if (index !== -1 && (s === null || index < s.index)) s = { index: index, marker: y };
  }
  if (r !== null && (s === null || r.index <= s.index)) return junkFragmentReport(e, r.index, r.fragment);
  if (s !== null) {
    let sliced = e.slice(s.index, s.index + FRAGMENT_TAIL_CHARS);
    return {
      shape: "artifact_free",
      fragment: "",
      suffix: "other",
      looksFabricated: !0,
      tailMarker: s.marker,
      matchIndex: s.index,
      tail: sliced,
    };
  }
  let match_2 = SPEAKER_LINE_RE.exec(e);
  if (match_2 !== null) return junkFragmentReport(e, match_2.index, match_2[1]);
  return null;
}
//@ chunk-ha3km179.js:152236-152415 placement
function junkFragmentReport(e, n, r) {
  let s = n + 2 + r.length,
    sliced = e.slice(n, n + FRAGMENT_TAIL_CHARS),
    y = yc(sliced);
  return {
    shape: "junk_fragment",
    fragment: r,
    suffix: gc(e[s]),
    looksFabricated: y !== null,
    tailMarker: y,
    matchIndex: n,
    tail: sliced,
  };
}
//@ chunk-ha3km179.js:152415-152505 placement
function hc(e) {
  if (e === "") return "none";
  for (let n of FAKE_TURN_SPEAKERS) if (n === e) return n;
  return "catch_all";
}
/**
 * 遍历助手消息的文本与思考块，产出疑似伪造回合。
 */
//@ chunk-ha3km179.js:152505-152826 placement
function* findFabricatedTurns(e) {
  for (let n of e)
    for (let r of n.message.content) {
      let s, h;
      if (r.type === "text") ((s = "text"), (h = r.text));
      else if (r.type === "thinking") ((s = "thinking"), (h = r.thinking));
      else continue;
      let y = detectFabricatedTurn(h);
      if (y === null) continue;
      if (hc(y.fragment) === "catch_all" && y.suffix !== "<" && !y.looksFabricated) continue;
      yield { hit: y, blockType: s, message: n };
    }
}
/**
 * 上报 tengu_fabricated_turn_candidate。
 */
//@ chunk-ha3km179.js:152826-153194 placement
function reportFabricatedTurns(e, n) {
  for (let { hit: hit, blockType: blockType, message: message } of findFabricatedTurns(e))
    logEvent("tengu_fabricated_turn_candidate", {
      model: telemetrySafeModelName(n),
      shape: fromEnum(hit.shape),
      matched_fragment: fromEnum(hc(hit.fragment)),
      suffix: fromEnum(hit.suffix),
      looks_fabricated: hit.looksFabricated,
      tail_marker: hit.tailMarker !== null ? fromEnum(hit.tailMarker) : void 0,
      block_type: fromEnum(blockType),
      tail_sha256: gn(hit.tail),
      request_id: ye(message.requestId),
      message_id: ye(message.message.id),
    });
}

export {
  sc,
  recoveryOutcome,
  guardedStreamCallback,
  reportFabricatedTurns,
  Mi,
  endsWithFabricatedTurn,
  lc,
  uc,
  sSo,
};
