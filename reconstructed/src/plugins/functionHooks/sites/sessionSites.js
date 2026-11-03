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
  hK,
  checkPinnedKeys,
  checkDenyResult,
  findFirstProblem,
  restoreMissingKeys,
  Tr,
  M,
  _s,
  Er,
  Tf,
  wf,
  checkValueOrDeny,
  Ie,
} from "./siteRules.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { ct, he, ws } from "./promptContextSites.js";
import { checkedListLength } from "../dispatch/valueSizing.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";

//@ chunk-4121qate.js:196803-196885 placement
var gn = ["component", "requestId", "by", "bodyRows", "contentRows", "origin", "pointer"];
/**
 * ui.scroll 站点规则：固定站点字段，offset 必须是非负整数行号。
 */
//@ chunk-4121qate.js:196885-197063 placement
var UI_SCROLL_SITE = createSimpleSite({
  event: "ui.scroll",
  restored: gn,
  checkArgument: (e, o) => {
    let r = hK(e.offset);
    return checkPinnedKeys(gn, e, o) ?? (r ? void 0 : "an offset that is not a whole row number (0 or more)");
  },
  check: checkDenyResult,
});
//@ chunk-4121qate.js:197063-197764 placement
function checkSessionMessage(e) {
  if (!isPlainObject(e)) return "is not an object";
  let { role: role, text: text, toolUses: toolUses, toolResults: toolResults, handle: handle } = e;
  if (!(role === "user" || role === "assistant")) return "has a role that is neither user nor assistant";
  if (typeof text !== "string") return "has no text (a string)";
  if (!(handle === void 0 || typeof handle === "string")) return "has a handle that is not a string";
  if (!(
    Array.isArray(toolUses) &&
    ct(
      toolUses,
      (c) =>
        isPlainObject(c) &&
        typeof c.tool_use_id === "string" &&
        typeof c.tool === "string" &&
        isPlainObject(c.input),
    )
  ))
    return "has toolUses that are not a list of { tool_use_id, tool, input }";
  return toolResults === void 0 ||
    (Array.isArray(toolResults) &&
      ct(
        toolResults,
        (c) => isPlainObject(c) && typeof c.tool_use_id === "string" && typeof c.text === "string",
      ))
    ? void 0
    : "has toolResults that are not a list of { tool_use_id, text, isError }";
}
/**
 * 校验 session.compact 的消息列表非空且形状正确。
 */
//@ chunk-4121qate.js:197764-197978 placement
function checkCompactMessages(e) {
  if (!Array.isArray(e)) return "messages that are not a list";
  let o = checkedListLength(e);
  if (o === 0) return "an empty messages (a compaction leaves at least one)";
  let r = findFirstProblem(e, checkSessionMessage, o);
  return r && `messages[${r[0]}] that ${r[1]}`;
}
//@ chunk-4121qate.js:197978-198028 placement
var hn = (e) => e === void 0 || (typeof e === "number" && e >= 0);
//@ chunk-4121qate.js:198028-198185 placement = getTokenCountFromUsage (1)
var getTokenCountFromUsage = (usage) =>
  usage === void 0 ||
  (isPlainObject(usage) &&
    [
      usage.input_tokens,
      usage.output_tokens,
      usage.cache_read_input_tokens,
      usage.cache_creation_input_tokens,
    ].every((o) => typeof o === "number" && o >= 0));
//@ chunk-4121qate.js:198185-198241 placement
var Gi = (e) => typeof Reflect.get(e, "toJSON") === "function";
//@ chunk-4121qate.js:198241-198342 placement
var sameKeySet = (e, o) =>
  e.length === o.length && (e.every((r, n) => r === o[n]) || e.every(Set.prototype.has, new Set(o)));
//@ chunk-4121qate.js:198342-198447 placement
var isJsonScalar = (e) =>
  e === null ||
  typeof e === "string" ||
  typeof e === "boolean" ||
  (typeof e === "number" && Number.isFinite(e));
/**
 * 有预算（深度与字符量）的纯数据深比较：超出预算或遇到不可比较值返回 undefined。
 */
//@ chunk-4121qate.js:198447-199077 placement
function boundedDeepEqual(e, o, r) {
  let n = typeof e === "object" && e !== null,
    s = typeof o === "object" && o !== null,
    i = n ? !Gi(e) : isJsonScalar(e),
    p = s ? !Gi(o) : isJsonScalar(o);
  if (((r.room -= typeof e === "string" ? e.length + 1 : 1), r.room < 0)) return;
  if (e === void 0 && o === void 0) return !0;
  if (!i || !p) return;
  if (!n || !s) return e === o;
  if (r.depth === 0) return;
  if (((r.depth -= 1), Array.isArray(e) && Array.isArray(o))) {
    let f = checkedListLength(e);
    if (f !== checkedListLength(o)) return !1;
    for (let a = 0; a < f; a += 1) {
      let m = boundedDeepEqual(e[a], o[a], r);
      if (m !== !0) return m;
    }
  } else if (isPlainObject(e) && isPlainObject(o)) {
    let keys = Object.keys(e);
    if (!sameKeySet(keys, Object.keys(o))) return;
    r.room -= keys.reduce((a, m) => a + m.length + 1, 0);
    for (let a of keys) {
      let m = boundedDeepEqual(e[a], o[a], r);
      if (m !== !0) return m;
    }
  } else return !1;
  return ((r.depth += 1), !0);
}
//@ chunk-4121qate.js:199077-199087 placement
var Lu = 64;
//@ chunk-4121qate.js:199087-199102 placement
var ju = 8388608;
//@ chunk-4121qate.js:199102-199173 placement
function $u(e, o) {
  try {
    return boundedDeepEqual(e, o, { depth: Lu, room: ju });
  } catch {
    return !1;
  }
}
//@ chunk-4121qate.js:199173-199221 placement
var XAn = (e, o, r = () => Rs(e)) => $u(e, o) ?? r() === Rs(o);
/**
 * session.append 的消息必须是对象且 content 为块数组。
 */
//@ chunk-4121qate.js:199221-199378 placement
function checkAppendMessage(e) {
  let o = isPlainObject(e);
  return o && Array.isArray(e.content)
    ? void 0
    : o
      ? "a message whose content is not an array of blocks"
      : "a message that is not an object";
}
//@ chunk-4121qate.js:199378-199433 placement
var rxt = (e) => e.door === "note" && e.origin.kind === "plugin";
/**
 * 校验 session.append 的拒绝：需有原因，且只能拒绝插件追加的行。
 */
//@ chunk-4121qate.js:199433-199619 placement
function checkAppendDeny(e, o) {
  let r = rxt(o),
    s = typeof e === "string" && e.trim() !== "" ? void 0 : "a deny with no reason";
  return r ? s : "a deny of a row the engine appends (only a plugin's own append is refused)";
}
/**
 * 校验拒绝时机：next 已存储行后不能再拒绝。
 */
//@ chunk-4121qate.js:199619-199783 placement
function checkAppendDenyTiming(e, o, r) {
  if (r.some((i) => i.deny === void 0)) return "a deny after next stored the row (refuse in place of next)";
  return r.some((i) => i.deny === e) ? void 0 : checkAppendDeny(e, o);
}
//@ chunk-4121qate.js:199783-200223 placement
function checkAppendAnswer(e, o, r) {
  let last = r.findLast((p) => p.deny === void 0);
  if (e.deny !== void 0) return checkAppendDenyTiming(e.deny, o, r);
  if (r.length === 0) return "an answer without next (the row is kept; next(e) keeps it)";
  if (last === void 0) return "a row after next refused it (nothing was stored)";
  if (e.uuid !== o.uuid) return "a uuid other than the row it answers for";
  return XAn(e.message, last.message)
    ? checkAppendMessage(e.message)
    : "a row other than what next answered (the answer is the row as stored)";
}
//@ chunk-4121qate.js:200223-200262 placement
var Go = ["type", "name", "role", "isMeta"];
/**
 * 校验消息身份字段未被改动。
 */
//@ chunk-4121qate.js:200262-200405 placement
function checkMessageIdentity(e, o) {
  let r = isPlainObject(e) ? e : {},
    n = isPlainObject(o) ? o : {},
    found = Go.find((i) => Object.hasOwn(r, i) && r[i] !== n[i]);
  return found === void 0 ? void 0 : `a changed message.${found}`;
}
/**
 * 恢复 session.append 消息的身份字段。
 */
//@ chunk-4121qate.js:200405-200534 placement
function restoreAppendIdentity(e, o) {
  let r = restoreMissingKeys(["agentId"], e, o),
    { message: message } = r,
    { message: message_2 } = o,
    p =
      isPlainObject(message) && isPlainObject(message_2)
        ? restoreMissingKeys(Go, message, message_2)
        : message;
  return p === message ? r : { ...r, message: p };
}
/**
 * session.append 站点规则：固定 door、origin、agentId、uuid，校验消息。
 */
//@ chunk-4121qate.js:200534-200795 placement
var SESSION_APPEND_SITE = {
  event: "session.append",
  pinnedKeys: ["door", "origin", "agentId", "uuid"],
  adoptArgument: Tr("message"),
  restoreArgument: restoreAppendIdentity,
  checkArgument: (e, o) =>
    checkPinnedKeys(["door", "origin", "agentId", "uuid"], e, o) ??
    checkAppendMessage(e.message) ??
    checkMessageIdentity(e.message, o.message),
  check: M((e, o, r) => checkAppendAnswer(e, o, r ?? [])),
};
/**
 * session.attach 站点规则：固定界面、客户端与视口。
 */
//@ chunk-4121qate.js:200795-200945 placement
var SESSION_ATTACH_SITE = {
  event: "session.attach",
  restoreArgument: (e, o) => restoreMissingKeys(["viewport"], e, o),
  checkArgument: (e, o) => checkPinnedKeys(["surface", "clientId", "viewport"], e, o),
  check: M(_s),
};
//@ chunk-4121qate.js:200945-201964 placement
var SESSION_COMPACT_SITE = {
  event: "session.compact",
  restoreArgument: (e, o) => restoreMissingKeys(["trigger", "agentId"], e, o),
  checkArgument: (e, o) => {
    if (e.trigger !== o.trigger)
      return "a changed trigger (the compaction is what it is; next(e) passes it on)";
    if (e.agentId !== o.agentId) return "a changed agentId (the loop compacting is pinned)";
    let { instructions: instructions } = e;
    return instructions === void 0 || typeof instructions === "string"
      ? checkCompactMessages(e.messages)
      : "instructions that are not a string";
  },
  check: M((e, o, r) => {
    let {
      skip: skip,
      messages: messages,
      tokensBefore: tokensBefore,
      tokensAfter: tokensAfter,
      usage: usage,
    } = e;
    if (skip !== void 0) {
      if (!(typeof skip === "string" && skip !== ""))
        return "a skip that is not a reason (a non-empty string)";
      if (messages !== void 0) return "a skip beside messages";
      return o.trigger !== "precompute" && (r ?? []).some((u) => u.messages !== void 0)
        ? "a skip after next() compacted (the compaction happened beneath it; veto before calling next, or hand its result up)"
        : void 0;
    }
    if (messages === void 0) return "neither { messages } nor { skip }";
    if (!(hn(tokensBefore) && hn(tokensAfter))) return "token counts that are not numbers";
    return getTokenCountFromUsage(usage)
      ? checkCompactMessages(messages)
      : "a usage that is not the four token counts";
  }),
};
/**
 * session.detach 站点规则：固定界面、客户端与原因。
 */
//@ chunk-4121qate.js:201964-202068 placement
var SESSION_DETACH_SITE = {
  event: "session.detach",
  checkArgument: (e, o) => checkPinnedKeys(["surface", "clientId", "reason"], e, o),
  check: M(_s),
};
//@ chunk-4121qate.js:202068-202128 placement
var Wu = Er("session.end", ["reason", "sessionId", "resume"], Tf);
//@ chunk-4121qate.js:202128-202202 placement
var Gu = Er("session.measure", ["context", "rateLimits", "cost", "changed"], wf);
//@ chunk-4121qate.js:202202-202861 placement
var SESSION_RECEIVE_SITE = {
  event: "session.receive",
  restoreArgument: (e, o) => restoreMissingKeys(["agentId"], e, o),
  checkArgument: (e, o) => {
    if (checkPinnedKeys(["origin"], e, o) !== void 0)
      return "a changed origin (the bridge set it; next(e) passes it on)";
    if (checkPinnedKeys(["event"], e, o) !== void 0)
      return "a changed event (parsed from the delivery; next(e) passes it on)";
    if (e.agentId !== o.agentId)
      return "a changed agentId (the loop the delivery is for; next(e) passes it on)";
    return typeof e.text === "string" ? void 0 : "no { text } (a string)";
  },
  check: M((e) => {
    let { consumed: consumed, text: text } = e;
    if (consumed === void 0) return typeof text === "string" ? void 0 : "neither { text } nor { consumed }";
    return typeof consumed === "string" ? void 0 : "a consumed that is not a string";
  }),
};
//@ chunk-4121qate.js:202861-203542 placement
var SESSION_SEND_SITE = {
  event: "session.send",
  restoreArgument: (e, o) => restoreMissingKeys(["agentId"], e, o),
  checkArgument: (e, o) => {
    if (checkPinnedKeys(["origin"], e, o) !== void 0)
      return "a changed origin (the engine set it; next(e) passes it on)";
    if (e.agentId !== o.agentId) return "a changed agentId (the loop sending; next(e) passes it on)";
    if (!(typeof e.to === "string" && e.to.trim() !== "")) return "no { to } (a non-empty string)";
    return typeof e.text === "string" && e.text.trim() !== "" ? void 0 : "no { text } (a non-empty string)";
  },
  check: M((e) => {
    let { isDelivered: isDelivered, reason: reason } = e;
    if (isDelivered === !0) return;
    if (isDelivered !== !1) return "no { isDelivered } (true or false)";
    return typeof reason === "string" && reason !== ""
      ? void 0
      : "isDelivered false without a reason (a non-empty string)";
  }),
};
/**
 * settings.read 结果只保留原有设置键。
 */
//@ chunk-4121qate.js:203542-203833 placement
function keepSettingsKeys(e, o, r) {
  let n = e.value;
  if (n === void 0) return;
  let filtered = Object.keys(
    r.at(-1)?.value ?? Object.fromEntries(o.layers.flatMap((layer) => Object.entries(layer.settings))),
  ).filter((p) => !Object.hasOwn(n, p));
  return filtered.length === 0
    ? void 0
    : { kept: e, why: `an answer without ${filtered.join(", ")}: unset for the reader` };
}
/**
 * settings.read 站点规则：固定来源，恢复层信息，校验值。
 */
//@ chunk-4121qate.js:203833-204199 placement
var SETTINGS_READ_SITE = {
  event: "settings.read",
  pinnedKeys: ["source"],
  restoreArgument: (e, o) => {
    let r = o.source !== void 0 && e.source === void 0;
    return { ...e, ...(r && { source: o.source }), layers: o.layers };
  },
  checkArgument: (e, o) =>
    e.source === o.source ? void 0 : "a changed source (pinned: the layers are that read's)",
  check: M((e) => checkValueOrDeny(e, "{ value } holding a settings object", (o) => isPlainObject(o.value))),
  keptResult: keepSettingsKeys,
};
/**
 * 校验状态引用（插件、键、id）未改动。
 */
//@ chunk-4121qate.js:204199-204361 placement
function checkStateRefUnchanged(e, o) {
  return e.plugin !== o.plugin || e.key !== o.key || e.id !== o.id
    ? "a changed reference (plugin, key and id say which value; next(e) passes them on)"
    : void 0;
}
/**
 * 校验 state.set 参数：引用与 ifVersion、previous 未改动。
 */
//@ chunk-4121qate.js:204361-204576 placement
function checkStateSetArgument(e, o) {
  let r = e.ifVersion !== o.ifVersion,
    n = checkPinnedKeys(["previous"], e, o) !== void 0;
  return (
    checkStateRefUnchanged(e, o) ??
    (r ? "a changed ifVersion (the condition is the caller's)" : void 0) ??
    (n ? "a changed previous (the host stamps it)" : void 0)
  );
}
//@ chunk-4121qate.js:204576-204648 placement
var qu = { event: "state.get", check: he("state.get").check, checkArgument: checkStateRefUnchanged };
//@ chunk-4121qate.js:204648-204746 placement
var Qu = {
  event: "state.set",
  check: ws,
  restoreArgument: Ie(["previous", "ifVersion"]),
  checkArgument: checkStateSetArgument,
};
/**
 * telemetry.log 站点规则：固定 to，校验条目。
 */
//@ chunk-4121qate.js:204746-204948 placement
var TELEMETRY_LOG_SITE = {
  event: "telemetry.log",
  pinnedKeys: ["to"],
  restoreArgument: Ie(["to"]),
  checkArgument: (e, o) => (e.to === o.to ? void 0 : "a changed to (pinned)"),
  check: M((e) => checkValueOrDeny(e, "{ value }", (o) => Object.hasOwn(o, "value"))),
};
//@ chunk-4121qate.js:204948-205042 placement
var tc = {
  event: "telemetry.mark",
  check: M((e) => checkValueOrDeny(e, "{ value }", (o) => Object.hasOwn(o, "value"))),
};

export {
  checkAppendMessage,
  rxt,
  Go,
  gn,
  SESSION_APPEND_SITE,
  SESSION_ATTACH_SITE,
  SESSION_COMPACT_SITE,
  SESSION_DETACH_SITE,
  Wu,
  Gu,
  SESSION_RECEIVE_SITE,
  SESSION_SEND_SITE,
  SETTINGS_READ_SITE,
  qu,
  Qu,
  TELEMETRY_LOG_SITE,
  tc,
  UI_SCROLL_SITE,
  checkAppendAnswer,
  checkAppendDeny,
  checkMessageIdentity,
  restoreAppendIdentity,
  checkStateSetArgument,
  checkSessionMessage,
  checkCompactMessages,
  keepSettingsKeys,
  hn,
  getTokenCountFromUsage,
  checkStateRefUnchanged,
  checkAppendDenyTiming,
  XAn,
};
