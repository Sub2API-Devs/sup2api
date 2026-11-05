/**
 * plugins/functionHooks/sites/sessionSites.ts
 *
 * 钩子站点规则：session.compact/receive/send/append（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (38)
 * attribution: placement 38
 */
import {
  createSimpleSite,
  isNonNegativeInt,
  checkPinnedKeys,
  checkDenyResult,
  findFirstProblem,
  restoreMissingKeys_2,
  restoreField,
  checkResultObject,
  hasClientId,
  pinnedSite,
  hasSessionId,
  hasChangedList,
  checkValueOrDeny,
  restoreMissingKeys,
} from "./siteRules.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { everyIndex, valueOnlySite, checkValueOrDenyAfterNext } from "./promptContextSites.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:177988-178070 placement
/**
 * ui.scroll 固定键
 */
var UI_SCROLL_PINNED_KEYS = ["component", "requestId", "by", "bodyRows", "contentRows", "origin", "pointer"];
//@ chunk-j8f885h1.js:178070-178248 placement
/**
 * ui.scroll 站点规则：固定站点字段，offset 必须是非负整数行号。
 */
var UI_SCROLL_SITE; // deferred: uses createSimpleSite (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:178070", () => {
  UI_SCROLL_SITE = createSimpleSite({
    event: "ui.scroll",
    restored: UI_SCROLL_PINNED_KEYS,
    checkArgument: (passed, received) => {
      let isOffsetValid = isNonNegativeInt(passed.offset);
      return (
        checkPinnedKeys(UI_SCROLL_PINNED_KEYS, passed, received) ??
        (isOffsetValid ? undefined : "an offset that is not a whole row number (0 or more)")
      );
    },
    check: checkDenyResult,
  });
});
//@ chunk-j8f885h1.js:178248-178949 placement
function checkSessionMessage(message) {
  if (!isPlainObject(message)) return "is not an object";
  let { role, text, toolUses, toolResults, handle } = message;
  if (!(role === "user" || role === "assistant")) return "has a role that is neither user nor assistant";
  if (typeof text !== "string") return "has no text (a string)";
  if (!(handle === undefined || typeof handle === "string")) return "has a handle that is not a string";
  if (!(
    Array.isArray(toolUses) &&
    everyIndex(
      toolUses,
      (toolUse) =>
        isPlainObject(toolUse) &&
        typeof toolUse.tool_use_id === "string" &&
        typeof toolUse.tool === "string" &&
        isPlainObject(toolUse.input),
    )
  ))
    return "has toolUses that are not a list of { tool_use_id, tool, input }";
  return toolResults === undefined ||
    (Array.isArray(toolResults) &&
      everyIndex(
        toolResults,
        (toolResult) =>
          isPlainObject(toolResult) &&
          typeof toolResult.tool_use_id === "string" &&
          typeof toolResult.text === "string",
      ))
    ? undefined
    : "has toolResults that are not a list of { tool_use_id, text, isError }";
}
//@ chunk-j8f885h1.js:178949-179163 placement
/**
 * 校验 session.compact 的消息列表非空且形状正确。
 */
function checkCompactMessages(list) {
  if (!Array.isArray(list)) return "messages that are not a list";
  let length = checkedListLength(list);
  if (length === 0) return "an empty messages (a compaction leaves at least one)";
  let firstProblem = findFirstProblem(list, checkSessionMessage, length);
  return firstProblem && `messages[${firstProblem[0]}] that ${firstProblem[1]}`;
}
//@ chunk-j8f885h1.js:179163-179213 placement
/**
 * 非负数
 */
var isNonNegativeFiniteNumber = (value) => value === undefined || (typeof value === "number" && value >= 0);
//@ chunk-j8f885h1.js:179213-179370 placement (2.1.88 match: getTokenCountFromUsage, 1)
var getTokenCountFromUsage = (usage) =>
  usage === undefined ||
  (isPlainObject(usage) &&
    [
      usage.input_tokens,
      usage.output_tokens,
      usage.cache_read_input_tokens,
      usage.cache_creation_input_tokens,
    ].every((count) => typeof count === "number" && count >= 0));
//@ chunk-j8f885h1.js:179370-179426 placement
/**
 * 有 toJSON 方法
 */
var hasToJSON = (value) => typeof Reflect.get(value, "toJSON") === "function";
//@ chunk-j8f885h1.js:179426-179527 placement
var sameKeySet = (a, b) =>
  a.length === b.length &&
  (a.every((key, index) => key === b[index]) || a.every(Set.prototype.has, new Set(b)));
//@ chunk-j8f885h1.js:179527-179632 placement
var isJsonScalar = (value) =>
  value === null ||
  typeof value === "string" ||
  typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));
//@ chunk-j8f885h1.js:179632-180262 placement
/**
 * 有预算（深度与字符量）的纯数据深比较：超出预算或遇到不可比较值返回 undefined。
 */
function boundedDeepEqual(left, right, budget) {
  let aIsObject = typeof left === "object" && left !== null;
  let bIsObject = typeof right === "object" && right !== null;
  let aIsJson = aIsObject ? !hasToJSON(left) : isJsonScalar(left);
  let bIsJson = bIsObject ? !hasToJSON(right) : isJsonScalar(right);
  budget.room -= typeof left === "string" ? left.length + 1 : 1;
  if (budget.room < 0) return;
  if (left === undefined && right === undefined) return true;
  if (!aIsJson || !bIsJson) return;
  if (!aIsObject || !bIsObject) return left === right;
  if (budget.depth === 0) return;
  budget.depth -= 1;
  if (Array.isArray(left) && Array.isArray(right)) {
    let length = checkedListLength(left);
    if (length !== checkedListLength(right)) return false;
    for (let index = 0; index < length; index += 1) {
      let result = boundedDeepEqual(left[index], right[index], budget);
      if (result !== true) return result;
    }
  } else if (isPlainObject(left) && isPlainObject(right)) {
    let keys = Object.keys(left);
    if (!sameKeySet(keys, Object.keys(right))) return;
    budget.room -= keys.reduce((acc, key) => acc + key.length + 1, 0);
    for (let key of keys) {
      let result = boundedDeepEqual(left[key], right[key], budget);
      if (result !== true) return result;
    }
  } else return false;
  budget.depth += 1;
  return true;
}
//@ chunk-j8f885h1.js:180262-180272 placement
/**
 * 64
 */
var MAX_DEEP_EQUAL_DEPTH = 64;
//@ chunk-j8f885h1.js:180272-180287 placement
/**
 * 8388608
 */
var MAX_DEEP_EQUAL_CHARS = 8388608;
//@ chunk-j8f885h1.js:180287-180358 placement
/**
 * 有上限的深比较
 */
function boundedDeepEqualSafe(a, b) {
  try {
    return boundedDeepEqual(a, b, {
      depth: MAX_DEEP_EQUAL_DEPTH,
      room: MAX_DEEP_EQUAL_CHARS,
    });
  } catch {
    return false;
  }
}
//@ chunk-j8f885h1.js:180358-180406 placement
/**
 * 消息相同或不改
 */
var sameMessageOrShape = (answer, row, inputKey = () => stableStringifySafe(answer)) =>
  boundedDeepEqualSafe(answer, row) ?? inputKey() === stableStringifySafe(row);
//@ chunk-j8f885h1.js:180406-180563 placement
/**
 * session.append 的消息必须是对象且 content 为块数组。
 */
function checkAppendMessage(message) {
  let isObject = isPlainObject(message);
  return isObject && Array.isArray(message.content)
    ? undefined
    : isObject
      ? "a message whose content is not an array of blocks"
      : "a message that is not an object";
}
//@ chunk-j8f885h1.js:180563-180618 placement
/**
 * 插件备注拒答
 */
var isPluginNoteRefusal = (request) => request.door === "note" && request.origin.kind === "plugin";
//@ chunk-j8f885h1.js:180618-180804 placement
/**
 * 校验 session.append 的拒绝：需有原因，且只能拒绝插件追加的行。
 */
function checkAppendDeny(deny, request) {
  let isPluginNote = isPluginNoteRefusal(request);
  let reasonProblem = typeof deny === "string" && deny.trim() !== "" ? undefined : "a deny with no reason";
  return isPluginNote
    ? reasonProblem
    : "a deny of a row the engine appends (only a plugin's own append is refused)";
}
//@ chunk-j8f885h1.js:180804-180968 placement
/**
 * 校验拒绝时机：next 已存储行后不能再拒绝。
 */
function checkAppendDenyTiming(deny, request, answers) {
  if (answers.some((answer) => answer.deny === undefined))
    return "a deny after next stored the row (refuse in place of next)";
  return answers.some((answer) => answer.deny === deny) ? undefined : checkAppendDeny(deny, request);
}
//@ chunk-j8f885h1.js:180968-181408 placement
function checkAppendAnswer(answer, request, answers) {
  let last = answers.findLast((answer) => answer.deny === undefined);
  if (answer.deny !== undefined) return checkAppendDenyTiming(answer.deny, request, answers);
  if (answers.length === 0) return "an answer without next (the row is kept; next(e) keeps it)";
  if (last === undefined) return "a row after next refused it (nothing was stored)";
  if (answer.uuid !== request.uuid) return "a uuid other than the row it answers for";
  return sameMessageOrShape(answer.message, last.message)
    ? checkAppendMessage(answer.message)
    : "a row other than what next answered (the answer is the row as stored)";
}
//@ chunk-j8f885h1.js:181408-181447 placement
/**
 * type/name/role/isMeta
 */
var MESSAGE_IDENTITY_KEYS = ["type", "name", "role", "isMeta"];
//@ chunk-j8f885h1.js:181447-181590 placement
/**
 * 校验消息身份字段未被改动。
 */
function checkMessageIdentity(message, message_2) {
  let left = isPlainObject(message) ? message : {};
  let right = isPlainObject(message_2) ? message_2 : {};
  let found = MESSAGE_IDENTITY_KEYS.find((key) => Object.hasOwn(left, key) && left[key] !== right[key]);
  return found === undefined ? undefined : `a changed message.${found}`;
}
//@ chunk-j8f885h1.js:181590-181719 placement
/**
 * 恢复 session.append 消息的身份字段。
 */
function restoreAppendIdentity(passed, received) {
  let restored = restoreMissingKeys_2(["agentId"], passed, received);
  let { message } = restored;
  let { message: message_2 } = received;
  let restoredMessage =
    isPlainObject(message) && isPlainObject(message_2)
      ? restoreMissingKeys_2(MESSAGE_IDENTITY_KEYS, message, message_2)
      : message;
  return restoredMessage === message
    ? restored
    : {
        ...restored,
        message: restoredMessage,
      };
}
//@ chunk-j8f885h1.js:181719-181980 placement
/**
 * session.append 站点规则：固定 door、origin、agentId、uuid，校验消息。
 */
var SESSION_APPEND_SITE; // deferred: uses restoreField (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:181719", () => {
  SESSION_APPEND_SITE = {
    event: "session.append",
    pinnedKeys: ["door", "origin", "agentId", "uuid"],
    adoptArgument: restoreField("message"),
    restoreArgument: restoreAppendIdentity,
    checkArgument: (passed, received) =>
      checkPinnedKeys(["door", "origin", "agentId", "uuid"], passed, received) ??
      checkAppendMessage(passed.message) ??
      checkMessageIdentity(passed.message, received.message),
    check: checkResultObject((result, next, answers) => checkAppendAnswer(result, next, answers ?? [])),
  };
});
//@ chunk-j8f885h1.js:181980-182130 placement
/**
 * session.attach 站点规则：固定界面、客户端与视口。
 */
var SESSION_ATTACH_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:181980", () => {
  SESSION_ATTACH_SITE = {
    event: "session.attach",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["viewport"], passed, received),
    checkArgument: (passed, received) =>
      checkPinnedKeys(["surface", "clientId", "viewport"], passed, received),
    check: checkResultObject(hasClientId),
  };
});
//@ chunk-j8f885h1.js:182130-183149 placement
var SESSION_COMPACT_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:182130", () => {
  SESSION_COMPACT_SITE = {
    event: "session.compact",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["trigger", "agentId"], passed, received),
    checkArgument: (passed, received) => {
      if (passed.trigger !== received.trigger)
        return "a changed trigger (the compaction is what it is; next(e) passes it on)";
      if (passed.agentId !== received.agentId) return "a changed agentId (the loop compacting is pinned)";
      let { instructions } = passed;
      return instructions === undefined || typeof instructions === "string"
        ? checkCompactMessages(passed.messages)
        : "instructions that are not a string";
    },
    check: checkResultObject((result, request, answers) => {
      let { skip, messages, tokensBefore, tokensAfter, usage } = result;
      if (skip !== undefined) {
        if (!(typeof skip === "string" && skip !== ""))
          return "a skip that is not a reason (a non-empty string)";
        if (messages !== undefined) return "a skip beside messages";
        return request.trigger !== "precompute" &&
          (answers ?? []).some((answer) => answer.messages !== undefined)
          ? "a skip after next() compacted (the compaction happened beneath it; veto before calling next, or hand its result up)"
          : undefined;
      }
      if (messages === undefined) return "neither { messages } nor { skip }";
      if (!(isNonNegativeFiniteNumber(tokensBefore) && isNonNegativeFiniteNumber(tokensAfter)))
        return "token counts that are not numbers";
      return getTokenCountFromUsage(usage)
        ? checkCompactMessages(messages)
        : "a usage that is not the four token counts";
    }),
  };
});
//@ chunk-j8f885h1.js:183149-183253 placement
/**
 * session.detach 站点规则：固定界面、客户端与原因。
 */
var SESSION_DETACH_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:183149", () => {
  SESSION_DETACH_SITE = {
    event: "session.detach",
    checkArgument: (passed, received) => checkPinnedKeys(["surface", "clientId", "reason"], passed, received),
    check: checkResultObject(hasClientId),
  };
});
//@ chunk-j8f885h1.js:183253-183313 placement
/**
 * session.end 站点规则
 */
var SESSION_END_SITE; // deferred: uses pinnedSite (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:183253", () => {
  SESSION_END_SITE = pinnedSite("session.end", ["reason", "sessionId", "resume"], hasSessionId);
});
//@ chunk-j8f885h1.js:183313-183387 placement
/**
 * session.measure 站点规则
 */
var SESSION_MEASURE_SITE; // deferred: uses pinnedSite (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:183313", () => {
  SESSION_MEASURE_SITE = pinnedSite(
    "session.measure",
    ["context", "rateLimits", "cost", "changed"],
    hasChangedList,
  );
});
//@ chunk-j8f885h1.js:183387-184046 placement
var SESSION_RECEIVE_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:183387", () => {
  SESSION_RECEIVE_SITE = {
    event: "session.receive",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["agentId"], passed, received),
    checkArgument: (passed, received) => {
      if (checkPinnedKeys(["origin"], passed, received) !== undefined)
        return "a changed origin (the bridge set it; next(e) passes it on)";
      if (checkPinnedKeys(["event"], passed, received) !== undefined)
        return "a changed event (parsed from the delivery; next(e) passes it on)";
      if (passed.agentId !== received.agentId)
        return "a changed agentId (the loop the delivery is for; next(e) passes it on)";
      return typeof passed.text === "string" ? undefined : "no { text } (a string)";
    },
    check: checkResultObject((answer) => {
      let { consumed, text } = answer;
      if (consumed === undefined)
        return typeof text === "string" ? undefined : "neither { text } nor { consumed }";
      return typeof consumed === "string" ? undefined : "a consumed that is not a string";
    }),
  };
});
//@ chunk-j8f885h1.js:184046-184727 placement
var SESSION_SEND_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:184046", () => {
  SESSION_SEND_SITE = {
    event: "session.send",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["agentId"], passed, received),
    checkArgument: (passed, received) => {
      if (checkPinnedKeys(["origin"], passed, received) !== undefined)
        return "a changed origin (the engine set it; next(e) passes it on)";
      if (passed.agentId !== received.agentId)
        return "a changed agentId (the loop sending; next(e) passes it on)";
      if (!(typeof passed.to === "string" && passed.to.trim() !== ""))
        return "no { to } (a non-empty string)";
      return typeof passed.text === "string" && passed.text.trim() !== ""
        ? undefined
        : "no { text } (a non-empty string)";
    },
    check: checkResultObject((answer) => {
      let { isDelivered, reason } = answer;
      if (isDelivered === true) return;
      if (isDelivered !== false) return "no { isDelivered } (true or false)";
      return typeof reason === "string" && reason !== ""
        ? undefined
        : "isDelivered false without a reason (a non-empty string)";
    }),
  };
});
//@ chunk-j8f885h1.js:184727-185018 placement
/**
 * settings.read 结果只保留原有设置键。
 */
function keepSettingsKeys(answer, request, answers) {
  let value = answer.value;
  if (value === undefined) return;
  let filtered = Object.keys(
    answers.at(-1)?.value ??
      Object.fromEntries(request.layers.flatMap((layer) => Object.entries(layer.settings))),
  ).filter((key) => !Object.hasOwn(value, key));
  return filtered.length === 0
    ? undefined
    : {
        kept: answer,
        why: `an answer without ${filtered.join(", ")}: unset for the reader`,
      };
}
//@ chunk-j8f885h1.js:185018-185384 placement
/**
 * settings.read 站点规则：固定来源，恢复层信息，校验值。
 */
var SETTINGS_READ_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:185018", () => {
  SETTINGS_READ_SITE = {
    event: "settings.read",
    pinnedKeys: ["source"],
    restoreArgument: (passed, received) => {
      let hasNoSource = received.source !== undefined && passed.source === undefined;
      return {
        ...passed,
        ...(hasNoSource && {
          source: received.source,
        }),
        layers: received.layers,
      };
    },
    checkArgument: (passed, received) =>
      passed.source === received.source ? undefined : "a changed source (pinned: the layers are that read's)",
    check: checkResultObject((answer) =>
      checkValueOrDeny(answer, "{ value } holding a settings object", (value) => isPlainObject(value.value)),
    ),
    keptResult: keepSettingsKeys,
  };
});
//@ chunk-j8f885h1.js:185384-185546 placement
/**
 * 校验状态引用（插件、键、id）未改动。
 */
function checkStateRefUnchanged(passed, received) {
  return passed.plugin !== received.plugin || passed.key !== received.key || passed.id !== received.id
    ? "a changed reference (plugin, key and id say which value; next(e) passes them on)"
    : undefined;
}
//@ chunk-j8f885h1.js:185546-185761 placement
/**
 * 校验 state.set 参数：引用与 ifVersion、previous 未改动。
 */
function checkStateSetArgument(passed, received) {
  let hasChangedVersion = passed.ifVersion !== received.ifVersion;
  let hasChangedPrevious = checkPinnedKeys(["previous"], passed, received) !== undefined;
  return (
    checkStateRefUnchanged(passed, received) ??
    (hasChangedVersion ? "a changed ifVersion (the condition is the caller's)" : undefined) ??
    (hasChangedPrevious ? "a changed previous (the host stamps it)" : undefined)
  );
}
//@ chunk-j8f885h1.js:185761-185833 placement
/**
 * state.get 站点规则
 */
var STATE_GET_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:185761", () => {
  STATE_GET_SITE = {
    event: "state.get",
    check: valueOnlySite("state.get").check,
    checkArgument: checkStateRefUnchanged,
  };
});
//@ chunk-j8f885h1.js:185833-185931 placement
/**
 * state.set 站点规则
 */
var STATE_SET_SITE; // deferred: uses checkValueOrDenyAfterNext (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:185833", () => {
  STATE_SET_SITE = {
    event: "state.set",
    check: checkValueOrDenyAfterNext,
    restoreArgument: restoreMissingKeys(["previous", "ifVersion"]),
    checkArgument: checkStateSetArgument,
  };
});
//@ chunk-j8f885h1.js:185931-186133 placement
/**
 * telemetry.log 站点规则：固定 to，校验条目。
 */
var TELEMETRY_LOG_SITE; // deferred: uses restoreMissingKeys (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:185931", () => {
  TELEMETRY_LOG_SITE = {
    event: "telemetry.log",
    pinnedKeys: ["to"],
    restoreArgument: restoreMissingKeys(["to"]),
    checkArgument: (passed, received) => (passed.to === received.to ? undefined : "a changed to (pinned)"),
    check: checkResultObject((answer) =>
      checkValueOrDeny(answer, "{ value }", (value) => Object.hasOwn(value, "value")),
    ),
  };
});
//@ chunk-j8f885h1.js:186133-186227 placement
/**
 * telemetry.mark 站点规则
 */
var TELEMETRY_MARK_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:186133", () => {
  TELEMETRY_MARK_SITE = {
    event: "telemetry.mark",
    check: checkResultObject((answer) =>
      checkValueOrDeny(answer, "{ value }", (value) => Object.hasOwn(value, "value")),
    ),
  };
});
export {
  sameMessageOrShape,
  isPluginNoteRefusal,
  checkAppendMessage,
  MESSAGE_IDENTITY_KEYS,
  UI_SCROLL_PINNED_KEYS,
  SESSION_APPEND_SITE,
  SESSION_ATTACH_SITE,
  SESSION_COMPACT_SITE,
  SESSION_DETACH_SITE,
  SESSION_END_SITE,
  SESSION_MEASURE_SITE,
  SESSION_RECEIVE_SITE,
  SESSION_SEND_SITE,
  SETTINGS_READ_SITE,
  STATE_GET_SITE,
  STATE_SET_SITE,
  TELEMETRY_LOG_SITE,
  TELEMETRY_MARK_SITE,
  UI_SCROLL_SITE,
  checkAppendAnswer,
  checkAppendDeny,
  checkMessageIdentity,
  restoreAppendIdentity,
  checkStateSetArgument,
  checkSessionMessage,
  checkCompactMessages,
  keepSettingsKeys,
  isNonNegativeFiniteNumber,
  getTokenCountFromUsage,
  checkStateRefUnchanged,
  checkAppendDenyTiming,
};
