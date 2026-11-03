/**
 * plugins/functionHooks/sites/sessionSites.ts
 *
 * 钩子站点规则：session.compact/receive/send/append（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (38)
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

//@ chunk-4121qate.js:196803-196885 placement
/**
 * ui.scroll 固定键
 */
var UI_SCROLL_PINNED_KEYS = ["component", "requestId", "by", "bodyRows", "contentRows", "origin", "pointer"];
//@ chunk-4121qate.js:196885-197063 placement
/**
 * ui.scroll 站点规则：固定站点字段，offset 必须是非负整数行号。
 */
var UI_SCROLL_SITE = createSimpleSite({
  event: "ui.scroll",
  restored: UI_SCROLL_PINNED_KEYS,
  checkArgument: (e, o) => {
    let r = isNonNegativeInt(e.offset);
    return (
      checkPinnedKeys(UI_SCROLL_PINNED_KEYS, e, o) ??
      (r ? undefined : "an offset that is not a whole row number (0 or more)")
    );
  },
  check: checkDenyResult,
});
//@ chunk-4121qate.js:197063-197764 placement
function checkSessionMessage(e) {
  if (!isPlainObject(e)) return "is not an object";
  let { role, text, toolUses, toolResults, handle } = e;
  if (!(role === "user" || role === "assistant")) return "has a role that is neither user nor assistant";
  if (typeof text !== "string") return "has no text (a string)";
  if (!(handle === undefined || typeof handle === "string")) return "has a handle that is not a string";
  if (!(
    Array.isArray(toolUses) &&
    everyIndex(
      toolUses,
      (c) =>
        isPlainObject(c) &&
        typeof c.tool_use_id === "string" &&
        typeof c.tool === "string" &&
        isPlainObject(c.input),
    )
  ))
    return "has toolUses that are not a list of { tool_use_id, tool, input }";
  return toolResults === undefined ||
    (Array.isArray(toolResults) &&
      everyIndex(
        toolResults,
        (c) => isPlainObject(c) && typeof c.tool_use_id === "string" && typeof c.text === "string",
      ))
    ? undefined
    : "has toolResults that are not a list of { tool_use_id, text, isError }";
}
//@ chunk-4121qate.js:197764-197978 placement
/**
 * 校验 session.compact 的消息列表非空且形状正确。
 */
function checkCompactMessages(messages) {
  if (!Array.isArray(messages)) return "messages that are not a list";
  let o = checkedListLength(messages);
  if (o === 0) return "an empty messages (a compaction leaves at least one)";
  let firstProblem = findFirstProblem(messages, checkSessionMessage, o);
  return firstProblem && `messages[${firstProblem[0]}] that ${firstProblem[1]}`;
}
//@ chunk-4121qate.js:197978-198028 placement
/**
 * 非负数
 */
var isNonNegativeFiniteNumber = (e) => e === undefined || (typeof e === "number" && e >= 0);
//@ chunk-4121qate.js:198028-198185 placement = getTokenCountFromUsage (1)
var getTokenCountFromUsage = (usage) =>
  usage === undefined ||
  (isPlainObject(usage) &&
    [
      usage.input_tokens,
      usage.output_tokens,
      usage.cache_read_input_tokens,
      usage.cache_creation_input_tokens,
    ].every((o) => typeof o === "number" && o >= 0));
//@ chunk-4121qate.js:198185-198241 placement
/**
 * 有 toJSON 方法
 */
var hasToJSON = (e) => typeof Reflect.get(e, "toJSON") === "function";
//@ chunk-4121qate.js:198241-198342 placement
var sameKeySet = (e, o) =>
  e.length === o.length && (e.every((r, n) => r === o[n]) || e.every(Set.prototype.has, new Set(o)));
//@ chunk-4121qate.js:198342-198447 placement
var isJsonScalar = (e) =>
  e === null ||
  typeof e === "string" ||
  typeof e === "boolean" ||
  (typeof e === "number" && Number.isFinite(e));
//@ chunk-4121qate.js:198447-199077 placement
/**
 * 有预算（深度与字符量）的纯数据深比较：超出预算或遇到不可比较值返回 undefined。
 */
function boundedDeepEqual(e, o, r) {
  let n = typeof e === "object" && e !== null;
  let s = typeof o === "object" && o !== null;
  let i = n ? !hasToJSON(e) : isJsonScalar(e);
  let p = s ? !hasToJSON(o) : isJsonScalar(o);
  r.room -= typeof e === "string" ? e.length + 1 : 1;
  if (r.room < 0) return;
  if (e === undefined && o === undefined) return true;
  if (!i || !p) return;
  if (!n || !s) return e === o;
  if (r.depth === 0) return;
  r.depth -= 1;
  if (Array.isArray(e) && Array.isArray(o)) {
    let f = checkedListLength(e);
    if (f !== checkedListLength(o)) return false;
    for (let a = 0; a < f; a += 1) {
      let m = boundedDeepEqual(e[a], o[a], r);
      if (m !== true) return m;
    }
  } else if (isPlainObject(e) && isPlainObject(o)) {
    let keys = Object.keys(e);
    if (!sameKeySet(keys, Object.keys(o))) return;
    r.room -= keys.reduce((acc, m) => acc + m.length + 1, 0);
    for (let a of keys) {
      let m = boundedDeepEqual(e[a], o[a], r);
      if (m !== true) return m;
    }
  } else return false;
  r.depth += 1;
  return true;
}
//@ chunk-4121qate.js:199077-199087 placement
/**
 * 64
 */
var MAX_DEEP_EQUAL_DEPTH = 64;
//@ chunk-4121qate.js:199087-199102 placement
/**
 * 8388608
 */
var MAX_DEEP_EQUAL_CHARS = 8388608;
//@ chunk-4121qate.js:199102-199173 placement
/**
 * 有上限的深比较
 */
function boundedDeepEqualSafe(e, o) {
  try {
    return boundedDeepEqual(e, o, {
      depth: MAX_DEEP_EQUAL_DEPTH,
      room: MAX_DEEP_EQUAL_CHARS,
    });
  } catch {
    return false;
  }
}
//@ chunk-4121qate.js:199173-199221 placement
/**
 * 消息相同或不改
 */
var sameMessageOrShape = (e, o, inputKey = () => stableStringifySafe(e)) =>
  boundedDeepEqualSafe(e, o) ?? inputKey() === stableStringifySafe(o);
//@ chunk-4121qate.js:199221-199378 placement
/**
 * session.append 的消息必须是对象且 content 为块数组。
 */
function checkAppendMessage(message) {
  let o = isPlainObject(message);
  return o && Array.isArray(message.content)
    ? undefined
    : o
      ? "a message whose content is not an array of blocks"
      : "a message that is not an object";
}
//@ chunk-4121qate.js:199378-199433 placement
/**
 * 插件备注拒答
 */
var isPluginNoteRefusal = (e) => e.door === "note" && e.origin.kind === "plugin";
//@ chunk-4121qate.js:199433-199619 placement
/**
 * 校验 session.append 的拒绝：需有原因，且只能拒绝插件追加的行。
 */
function checkAppendDeny(e, o) {
  let r = isPluginNoteRefusal(o);
  let s = typeof e === "string" && e.trim() !== "" ? undefined : "a deny with no reason";
  return r ? s : "a deny of a row the engine appends (only a plugin's own append is refused)";
}
//@ chunk-4121qate.js:199619-199783 placement
/**
 * 校验拒绝时机：next 已存储行后不能再拒绝。
 */
function checkAppendDenyTiming(deny, o, r) {
  if (r.some((i) => i.deny === undefined))
    return "a deny after next stored the row (refuse in place of next)";
  return r.some((i) => i.deny === deny) ? undefined : checkAppendDeny(deny, o);
}
//@ chunk-4121qate.js:199783-200223 placement
function checkAppendAnswer(e, o, r) {
  let last = r.findLast((p) => p.deny === undefined);
  if (e.deny !== undefined) return checkAppendDenyTiming(e.deny, o, r);
  if (r.length === 0) return "an answer without next (the row is kept; next(e) keeps it)";
  if (last === undefined) return "a row after next refused it (nothing was stored)";
  if (e.uuid !== o.uuid) return "a uuid other than the row it answers for";
  return sameMessageOrShape(e.message, last.message)
    ? checkAppendMessage(e.message)
    : "a row other than what next answered (the answer is the row as stored)";
}
//@ chunk-4121qate.js:200223-200262 placement
/**
 * type/name/role/isMeta
 */
var MESSAGE_IDENTITY_KEYS = ["type", "name", "role", "isMeta"];
//@ chunk-4121qate.js:200262-200405 placement
/**
 * 校验消息身份字段未被改动。
 */
function checkMessageIdentity(message, message_2) {
  let r = isPlainObject(message) ? message : {};
  let n = isPlainObject(message_2) ? message_2 : {};
  let found = MESSAGE_IDENTITY_KEYS.find((i) => Object.hasOwn(r, i) && r[i] !== n[i]);
  return found === undefined ? undefined : `a changed message.${found}`;
}
//@ chunk-4121qate.js:200405-200534 placement
/**
 * 恢复 session.append 消息的身份字段。
 */
function restoreAppendIdentity(e, o) {
  let r = restoreMissingKeys_2(["agentId"], e, o);
  let { message } = r;
  let { message: message_2 } = o;
  let p =
    isPlainObject(message) && isPlainObject(message_2)
      ? restoreMissingKeys_2(MESSAGE_IDENTITY_KEYS, message, message_2)
      : message;
  return p === message
    ? r
    : {
        ...r,
        message: p,
      };
}
//@ chunk-4121qate.js:200534-200795 placement
/**
 * session.append 站点规则：固定 door、origin、agentId、uuid，校验消息。
 */
var SESSION_APPEND_SITE = {
  event: "session.append",
  pinnedKeys: ["door", "origin", "agentId", "uuid"],
  adoptArgument: restoreField("message"),
  restoreArgument: restoreAppendIdentity,
  checkArgument: (e, o) =>
    checkPinnedKeys(["door", "origin", "agentId", "uuid"], e, o) ??
    checkAppendMessage(e.message) ??
    checkMessageIdentity(e.message, o.message),
  check: checkResultObject((e, o, r) => checkAppendAnswer(e, o, r ?? [])),
};
//@ chunk-4121qate.js:200795-200945 placement
/**
 * session.attach 站点规则：固定界面、客户端与视口。
 */
var SESSION_ATTACH_SITE = {
  event: "session.attach",
  restoreArgument: (e, o) => restoreMissingKeys_2(["viewport"], e, o),
  checkArgument: (e, o) => checkPinnedKeys(["surface", "clientId", "viewport"], e, o),
  check: checkResultObject(hasClientId),
};
//@ chunk-4121qate.js:200945-201964 placement
var SESSION_COMPACT_SITE = {
  event: "session.compact",
  restoreArgument: (e, o) => restoreMissingKeys_2(["trigger", "agentId"], e, o),
  checkArgument: (e, o) => {
    if (e.trigger !== o.trigger)
      return "a changed trigger (the compaction is what it is; next(e) passes it on)";
    if (e.agentId !== o.agentId) return "a changed agentId (the loop compacting is pinned)";
    let { instructions } = e;
    return instructions === undefined || typeof instructions === "string"
      ? checkCompactMessages(e.messages)
      : "instructions that are not a string";
  },
  check: checkResultObject((e, o, r) => {
    let { skip, messages, tokensBefore, tokensAfter, usage } = e;
    if (skip !== undefined) {
      if (!(typeof skip === "string" && skip !== ""))
        return "a skip that is not a reason (a non-empty string)";
      if (messages !== undefined) return "a skip beside messages";
      return o.trigger !== "precompute" && (r ?? []).some((u) => u.messages !== undefined)
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
//@ chunk-4121qate.js:201964-202068 placement
/**
 * session.detach 站点规则：固定界面、客户端与原因。
 */
var SESSION_DETACH_SITE = {
  event: "session.detach",
  checkArgument: (e, o) => checkPinnedKeys(["surface", "clientId", "reason"], e, o),
  check: checkResultObject(hasClientId),
};
//@ chunk-4121qate.js:202068-202128 placement
/**
 * session.end 站点规则
 */
var SESSION_END_SITE = pinnedSite("session.end", ["reason", "sessionId", "resume"], hasSessionId);
//@ chunk-4121qate.js:202128-202202 placement
/**
 * session.measure 站点规则
 */
var SESSION_MEASURE_SITE = pinnedSite(
  "session.measure",
  ["context", "rateLimits", "cost", "changed"],
  hasChangedList,
);
//@ chunk-4121qate.js:202202-202861 placement
var SESSION_RECEIVE_SITE = {
  event: "session.receive",
  restoreArgument: (e, o) => restoreMissingKeys_2(["agentId"], e, o),
  checkArgument: (e, o) => {
    if (checkPinnedKeys(["origin"], e, o) !== undefined)
      return "a changed origin (the bridge set it; next(e) passes it on)";
    if (checkPinnedKeys(["event"], e, o) !== undefined)
      return "a changed event (parsed from the delivery; next(e) passes it on)";
    if (e.agentId !== o.agentId)
      return "a changed agentId (the loop the delivery is for; next(e) passes it on)";
    return typeof e.text === "string" ? undefined : "no { text } (a string)";
  },
  check: checkResultObject((e) => {
    let { consumed, text } = e;
    if (consumed === undefined)
      return typeof text === "string" ? undefined : "neither { text } nor { consumed }";
    return typeof consumed === "string" ? undefined : "a consumed that is not a string";
  }),
};
//@ chunk-4121qate.js:202861-203542 placement
var SESSION_SEND_SITE = {
  event: "session.send",
  restoreArgument: (e, o) => restoreMissingKeys_2(["agentId"], e, o),
  checkArgument: (e, o) => {
    if (checkPinnedKeys(["origin"], e, o) !== undefined)
      return "a changed origin (the engine set it; next(e) passes it on)";
    if (e.agentId !== o.agentId) return "a changed agentId (the loop sending; next(e) passes it on)";
    if (!(typeof e.to === "string" && e.to.trim() !== "")) return "no { to } (a non-empty string)";
    return typeof e.text === "string" && e.text.trim() !== ""
      ? undefined
      : "no { text } (a non-empty string)";
  },
  check: checkResultObject((e) => {
    let { isDelivered, reason } = e;
    if (isDelivered === true) return;
    if (isDelivered !== false) return "no { isDelivered } (true or false)";
    return typeof reason === "string" && reason !== ""
      ? undefined
      : "isDelivered false without a reason (a non-empty string)";
  }),
};
//@ chunk-4121qate.js:203542-203833 placement
/**
 * settings.read 结果只保留原有设置键。
 */
function keepSettingsKeys(e, o, r) {
  let n = e.value;
  if (n === undefined) return;
  let filtered = Object.keys(
    r.at(-1)?.value ?? Object.fromEntries(o.layers.flatMap((layer) => Object.entries(layer.settings))),
  ).filter((key) => !Object.hasOwn(n, key));
  return filtered.length === 0
    ? undefined
    : {
        kept: e,
        why: `an answer without ${filtered.join(", ")}: unset for the reader`,
      };
}
//@ chunk-4121qate.js:203833-204199 placement
/**
 * settings.read 站点规则：固定来源，恢复层信息，校验值。
 */
var SETTINGS_READ_SITE = {
  event: "settings.read",
  pinnedKeys: ["source"],
  restoreArgument: (e, o) => {
    let r = o.source !== undefined && e.source === undefined;
    return {
      ...e,
      ...(r && {
        source: o.source,
      }),
      layers: o.layers,
    };
  },
  checkArgument: (e, o) =>
    e.source === o.source ? undefined : "a changed source (pinned: the layers are that read's)",
  check: checkResultObject((e) =>
    checkValueOrDeny(e, "{ value } holding a settings object", (o) => isPlainObject(o.value)),
  ),
  keptResult: keepSettingsKeys,
};
//@ chunk-4121qate.js:204199-204361 placement
/**
 * 校验状态引用（插件、键、id）未改动。
 */
function checkStateRefUnchanged(e, o) {
  return e.plugin !== o.plugin || e.key !== o.key || e.id !== o.id
    ? "a changed reference (plugin, key and id say which value; next(e) passes them on)"
    : undefined;
}
//@ chunk-4121qate.js:204361-204576 placement
/**
 * 校验 state.set 参数：引用与 ifVersion、previous 未改动。
 */
function checkStateSetArgument(e, o) {
  let r = e.ifVersion !== o.ifVersion;
  let n = checkPinnedKeys(["previous"], e, o) !== undefined;
  return (
    checkStateRefUnchanged(e, o) ??
    (r ? "a changed ifVersion (the condition is the caller's)" : undefined) ??
    (n ? "a changed previous (the host stamps it)" : undefined)
  );
}
//@ chunk-4121qate.js:204576-204648 placement
/**
 * state.get 站点规则
 */
var STATE_GET_SITE = {
  event: "state.get",
  check: valueOnlySite("state.get").check,
  checkArgument: checkStateRefUnchanged,
};
//@ chunk-4121qate.js:204648-204746 placement
/**
 * state.set 站点规则
 */
var STATE_SET_SITE = {
  event: "state.set",
  check: checkValueOrDenyAfterNext,
  restoreArgument: restoreMissingKeys(["previous", "ifVersion"]),
  checkArgument: checkStateSetArgument,
};
//@ chunk-4121qate.js:204746-204948 placement
/**
 * telemetry.log 站点规则：固定 to，校验条目。
 */
var TELEMETRY_LOG_SITE = {
  event: "telemetry.log",
  pinnedKeys: ["to"],
  restoreArgument: restoreMissingKeys(["to"]),
  checkArgument: (e, o) => (e.to === o.to ? undefined : "a changed to (pinned)"),
  check: checkResultObject((e) => checkValueOrDeny(e, "{ value }", (o) => Object.hasOwn(o, "value"))),
};
//@ chunk-4121qate.js:204948-205042 placement
/**
 * telemetry.mark 站点规则
 */
var TELEMETRY_MARK_SITE = {
  event: "telemetry.mark",
  check: checkResultObject((e) => checkValueOrDeny(e, "{ value }", (o) => Object.hasOwn(o, "value"))),
};
export {
  checkAppendMessage,
  isPluginNoteRefusal,
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
  sameMessageOrShape,
};
