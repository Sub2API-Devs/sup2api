/**
 * plugins/functionHooks/sites/toolSites.ts
 *
 * 钩子站点规则：tool.call/check/describe 与 requestMeta（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (36)
 * attribution: placement 36
 */
import { randomUUID } from "crypto";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import {
  checkPinnedKeys,
  restoreMissingKeys_2,
  checkResultObject,
  differsFromAnswer,
  asStringList,
  as,
  checkValueOrDeny,
  stripErrorFlag,
  checkPinnedKeysWith,
} from "./siteRules.js";
import { wi } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { stableStringifySafe } from "../../../utils/hooks/hookSerialization.js";
import {
  contextMeasureFor,
  maxNewTextLength,
  addsOnlyKey,
  textLengthIfNotIn,
  firstLongerText,
  valueOnlySite,
} from "./promptContextSites.js";
import { withCeiling, isPermissionDecisionValue } from "./agentSites.js";
import { DECISION_ORDER } from "../builtinHooksModule.js";

//@ chunk-4121qate.js:207816-207856 placement
/**
 * tool/tool_use_id/agentId
 */
var TOOL_CALL_PINNED_KEYS = ["tool", "tool_use_id", "agentId"];
//@ chunk-4121qate.js:207856-207875 placement
/**
 * "$shadowed"
 */
var SHADOWED_KEY = "$shadowed";
//@ chunk-4121qate.js:207875-207897 placement
var REQUESTMETA = "requestMeta";
//@ chunk-4121qate.js:207897-207950 placement
/**
 * tool.check 固定键
 */
var TOOL_CHECK_PINNED_KEYS = ["tool", "tool_use_id", "agentId", "consent", SHADOWED_KEY];
//@ chunk-4121qate.js:207950-208072 placement
function pickShadowedToolFields(e) {
  let o = {};
  for (let r of [...TOOL_CHECK_PINNED_KEYS, REQUESTMETA]) if (Object.hasOwn(e, r)) o[r] = e[r];
  return Object.keys(o).length === 0 ? undefined : o;
}
//@ chunk-4121qate.js:208072-208204 placement
/**
 * 把工具输入整理成 tool.call 事件：放入 tool 与 tool_use_id，consent/agentId/requestMeta 等宿主字段收进隐藏字段。
 */
function toToolCallEvent(tool, toolUseId, r) {
  let n = pickShadowedToolFields(r);
  let { consent, agentId, requestMeta, ...f } = r;
  return {
    ...f,
    tool,
    tool_use_id: toolUseId,
    ...(n !== undefined && {
      [SHADOWED_KEY]: n,
    }),
  };
}
//@ chunk-4121qate.js:208204-208249 placement
/**
 * 附上 agentId
 */
var withAgentId = (e, agentId) =>
  agentId === undefined
    ? e
    : {
        ...e,
        agentId,
      };
//@ chunk-4121qate.js:208249-208271 placement
/**
 * agentId/$shadowed
 */
var AGENT_ID_KEYS = ["agentId", SHADOWED_KEY];
//@ chunk-4121qate.js:208271-208401 placement
/**
 * 把内容块数组中的文本块用分隔符拼接（非数组返回空串）。
 */
var joinTextBlocks = (e, o) =>
  Array.isArray(e)
    ? e
        .flatMap((r) =>
          typeof r === "object" && r !== null && r.type === "text" ? [String(r.text ?? "")] : [],
        )
        .join(o)
    : "";
//@ chunk-4121qate.js:208401-208516 placement
/**
 * 从 tool.call 事件还原工具输入：去掉 tool、tool_use_id、agentId、consent、requestMeta，并合回隐藏字段。
 */
function toolInputOf(e) {
  let { tool, tool_use_id: toolUseId, agentId, consent, requestMeta, [SHADOWED_KEY]: p, ...f } = e;
  return isPlainObject(p)
    ? {
        ...f,
        ...p,
      }
    : f;
}
//@ chunk-4121qate.js:208516-208546 placement
/**
 * 无 agentId 的工具事件
 */
var toolCallEventNoAgent = (tool, o) => toToolCallEvent(tool, undefined, o);
//@ chunk-4121qate.js:208546-208573 placement
/**
 * 工具调用事件
 */
var toolCallEvent = (tool, toolUseId, r) => toToolCallEvent(tool, toolUseId, r);
//@ chunk-4121qate.js:208573-208629 placement
/**
 * 工具输入转文本
 */
function toolInputText(content) {
  return typeof content === "string"
    ? content
    : joinTextBlocks(
        content,
        `
`,
      );
}
//@ chunk-4121qate.js:208629-208678 placement
/**
 * 附请求元信息
 */
var withRequestMeta = (e, requestMeta) =>
  requestMeta === undefined
    ? e
    : {
        ...e,
        requestMeta,
      };
//@ chunk-4121qate.js:208678-208702 placement
/**
 * 校验 tool.check 固定键
 */
var checkToolCheckPinned = (e, o) => checkPinnedKeys(TOOL_CHECK_PINNED_KEYS, e, o);
//@ chunk-4121qate.js:208702-208779 placement
/**
 * 归一权限决定表
 */
var normalizePermissionDecisionMap = (e) =>
  isPlainObject(e) ? wi(e, (o, r) => o === false && (r === "deny" || r === "ask" || r === "allow")) : e;
//@ chunk-4121qate.js:208779-209194 placement
var CLASSIC_PRE_TOOL_USE_SITE = {
  event: "classic.PreToolUse",
  restoreArgument: (e, o) => restoreMissingKeys_2([SHADOWED_KEY], e, o),
  checkArgument: checkToolCheckPinned,
  settle: normalizePermissionDecisionMap,
  check: checkResultObject(({ deny, ask, allow }) => {
    let n = typeof deny === "string" || typeof ask === "string";
    return !n && (deny !== undefined || ask !== undefined)
      ? "a deny or ask that is not a string"
      : !n && allow !== undefined && allow !== true
        ? "an allow that is not true"
        : undefined;
  }),
  carry: (e, o, r) =>
    e.updatedInput === undefined && typeof e.deny !== "string" && differsFromAnswer(o, r)
      ? {
          ...e,
          updatedInput: toolInputOf(o),
        }
      : e,
};
//@ chunk-4121qate.js:209194-209464 placement
/**
 * 保留下层结果中的只读标记（结果未变时）。
 */
function keepReadOnlyMark(e, o) {
  let { isReadOnly, ...n } = e;
  if (n.deny !== undefined || n.ref === undefined) return n;
  let last = o.findLast((f) => f.ref === n.ref);
  let i = stableStringifySafe(n.result);
  return last !== undefined &&
    last.isReadOnly === true &&
    (n.result === undefined ||
      n.result === last.result ||
      (i !== undefined && i === stableStringifySafe(last.result)))
    ? {
        ...n,
        isReadOnly: true,
      }
    : n;
}
//@ chunk-4121qate.js:209464-209578 placement
/**
 * 校验工具名未改动。
 */
function checkToolNameUnchanged(e, o) {
  return e.name !== o.name ? "a changed name (the tool being registered; next(e) passes it on)" : undefined;
}
//@ chunk-4121qate.js:209615-209790 placement
/**
 * 工具站点用到的来源种类常量组：anthropic/sources、claude/plugins、sources-relay 等，以及请求元信息的字节上限。
 */
var ANTHROPIC_SOURCES = "anthropic/sources";
var EDIT_SOURCE_KINDS = ["claude/plugins", ANTHROPIC_SOURCES];
var SOURCE_KINDS = [ANTHROPIC_SOURCES];
var COM_ANTHROPIC_SOURCES_RELAY = "com.anthropic/sources-relay";
var RANDOM_PLUGIN_META_ID = randomUUID();
var COM_ANTHROPIC_PLUGIN_META_CUT = "com.anthropic/plugin-meta-cut";
var MAX_REQUEST_META_BYTES = 262144;
var CLAUDE_OMITTED = "claude/omitted";
//@ chunk-4121qate.js:209790-209848 placement
/**
 * UTF-8 字节数
 */
function utf8Length(e) {
  return new TextEncoder().encode(e).length;
}
//@ chunk-4121qate.js:209848-210240 placement
function checkRequestMeta(e) {
  if (e === undefined) return;
  if (!isPlainObject(e)) return "a requestMeta that is not an object";
  let o = 0;
  for (let [key, value] of Object.entries(e)) {
    if (!SOURCE_KINDS.includes(key))
      return `a requestMeta key a hook may not set (it may set ${SOURCE_KINDS.join(", ")})`;
    if (typeof value !== "string") return `a requestMeta value that is not a string (under ${key})`;
    o += utf8Length(value);
  }
  return o > MAX_REQUEST_META_BYTES
    ? `a requestMeta of ${o} bytes (the most is ${MAX_REQUEST_META_BYTES})`
    : undefined;
}
//@ chunk-4121qate.js:210240-210391 placement
/**
 * 去掉对象中宿主专用的元数据键（没有时原样返回）。
 */
function stripHostToolMeta(e) {
  if (e === undefined || !SOURCE_KINDS.some((r) => Object.hasOwn(e, r))) return e;
  let o = {};
  for (let [key, value] of Object.entries(e)) if (!SOURCE_KINDS.includes(key)) o[key] = value;
  return o;
}
//@ chunk-4121qate.js:210391-210426 placement
/**
 * 固定键 + 元信息校验
 */
var checkToolCallPinnedAndMeta = (e, o) => checkToolCheckPinned(e, o) ?? checkRequestMeta(e[REQUESTMETA]);
//@ chunk-4121qate.js:210426-210515 placement
/**
 * context 归一为字符串列表
 */
function withContextList(e) {
  let o = {
    ...e,
  };
  return o.context === undefined
    ? o
    : {
        ...o,
        context: asStringList(o.context) ?? as,
      };
}
//@ chunk-4121qate.js:210515-210525 placement
/**
 * 空串
 */
var EMPTY_STRING = "";
//@ chunk-4121qate.js:210525-210788 placement
/**
 * 从权限结果中挑出决定、原因、规则、钩子、设置与插件等字段。
 */
function pickToolDecision(e) {
  let { decision, reason, rule, hook, setting, plugin } = e;
  let { decider } = e;
  let a = {
    decision,
  };
  if (reason !== undefined) a.reason = reason;
  if (rule !== undefined) a.rule = rule;
  if (hook !== undefined) a.hook = hook;
  if (setting !== undefined) a.setting = setting;
  if (plugin !== undefined) a.plugin = plugin;
  if (decider === "person") a.plugin = EMPTY_STRING;
  return a;
}
//@ chunk-4121qate.js:210788-211176 placement
/**
 * tool.call 站点规则：固定 tool/tool_use_id/agentId，恢复隐藏字段，结果须为 {result} 或 {deny}，校验 context 保留下层条目。
 */
var TOOL_CALL_SITE = {
  event: "tool.call",
  restoreArgument: (e, o) => restoreMissingKeys_2([...AGENT_ID_KEYS, REQUESTMETA], e, o),
  checkArgument: checkToolCallPinnedAndMeta,
  pinnedKeys: TOOL_CALL_PINNED_KEYS,
  settle: withContextList,
  stripResult: keepReadOnlyMark,
  check: checkResultObject((e, o, r) => {
    let n = e.deny === undefined;
    return (
      checkValueOrDeny(e, "{ result }", (s) => Object.hasOwn(s, "result")) ??
      (n
        ? contextMeasureFor(
            e.context,
            e.result,
            (r ?? []).filter((s) => s.deny === undefined),
          )
        : undefined)
    );
  }),
  measure: (e, o, r) => maxNewTextLength(e.context, ...r.map((n) => n.context)),
  isLateRefusal: addsOnlyKey("deny"),
  carry: stripErrorFlag,
};
//@ chunk-4121qate.js:211176-211270 placement
/**
 * 决定名归属插件
 */
function pluginDecisionName(e, plugin) {
  let r = e.plugins?.some((plugin_2) => plugin_2 === plugin) === true;
  return e.isHop !== true ? e.name : r ? plugin : undefined;
}
//@ chunk-4121qate.js:211270-211323 placement
/**
 * 决定相关字段
 */
var DECISION_FIELDS = ["decision", "reason", "rule", "hook", "setting"];
//@ chunk-4121qate.js:211323-211613 placement
function attributeAskDecision(e, o, r) {
  let { plugin, ...s } = e;
  if (s.decision !== "ask") return s;
  let filtered = o.filter((u) => DECISION_FIELDS.every((l) => u[l] === s[l]));
  let p = filtered.find((u) => u.plugin === plugin) ?? filtered[0];
  let f = pluginDecisionName(r, plugin);
  let a = r.isHop === true && f !== undefined && filtered.every((u) => u.plugin !== plugin);
  let c = p !== undefined && plugin !== EMPTY_STRING && !a ? p.plugin : f;
  return c === undefined
    ? s
    : {
        ...s,
        plugin: c,
      };
}
//@ chunk-4121qate.js:211613-211695 placement
/**
 * tool.call 字段
 */
var TOOL_CALL_FIELDS = ["tool", "input", "tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-4121qate.js:211695-211762 placement
/**
 * tool.check 字段
 */
var TOOL_CHECK_FIELDS = ["tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-4121qate.js:211762-212329 placement
var TOOL_CHECK_SITE = {
  event: "tool.check",
  restoreArgument: (e, o) => restoreMissingKeys_2(TOOL_CHECK_FIELDS, e, o),
  checkArgument: (passed, received) =>
    checkPinnedKeysWith({
      keys: TOOL_CALL_FIELDS,
      passed,
      received,
      explanation:
        "the tool, its input and the call are the question and are pinned; a hook answers { decision }, it does not ask about another call",
    }),
  settle: pickToolDecision,
  restoreResult: (e, o, r) => withCeiling(e, r),
  stripResult: attributeAskDecision,
  check: checkResultObject((e) => {
    let { decision, reason, rule, hook, setting } = e;
    if (!isPermissionDecisionValue(decision)) return `no { decision } (one of ${DECISION_ORDER.join(", ")})`;
    return [reason, rule, hook, setting].every((f) => f === undefined || typeof f === "string")
      ? undefined
      : "a reason, rule, hook or setting that is not a string";
  }),
};
//@ chunk-4121qate.js:212329-213249 placement
var TOOL_DESCRIBE_SITE = {
  event: "tool.describe",
  restoreArgument: (e, o) => restoreMissingKeys_2(["provider"], e, o),
  checkArgument: (e, o) => {
    if (typeof e.tool !== "string") return "no { tool }";
    if (e.tool !== o.tool) return "a changed tool (the engine caches the description by it)";
    if (checkPinnedKeys(["provider"], e, o) !== undefined)
      return "a changed provider (pinned: who provides the tool is a fact)";
    if (!(e.isDeferred === undefined || typeof e.isDeferred === "boolean"))
      return "an isDeferred that is not a boolean";
    return typeof e.description === "string" ? undefined : "no { description }";
  },
  measureArgument: (e, o) => textLengthIfNotIn(e.description, o.description),
  restoreResult: (e, o, r) => {
    if (e.isDeferred !== undefined) return e;
    let isDeferred = o.at(-1)?.isDeferred ?? r.isDeferred;
    return isDeferred === undefined
      ? e
      : {
          ...e,
          isDeferred,
        };
  },
  check: checkResultObject((e) => {
    if (typeof e.description !== "string") return "no { description } (a string)";
    return e.isDeferred === undefined || typeof e.isDeferred === "boolean"
      ? undefined
      : "an isDeferred that is not a boolean";
  }),
  measure: firstLongerText("description"),
};
//@ chunk-4121qate.js:213249-213329 placement
/**
 * tool.register 站点规则
 */
var TOOL_REGISTER_SITE = {
  event: "tool.register",
  check: valueOnlySite("tool.register").check,
  checkArgument: checkToolNameUnchanged,
};
export {
  toolInputOf,
  REQUESTMETA,
  toolCallEvent,
  CLASSIC_PRE_TOOL_USE_SITE,
  TOOL_CALL_SITE,
  TOOL_CHECK_SITE,
  TOOL_CALL_FIELDS,
  TOOL_CHECK_FIELDS,
  TOOL_DESCRIBE_SITE,
  TOOL_REGISTER_SITE,
  keepReadOnlyMark,
  checkToolNameUnchanged,
  checkToolCallPinnedAndMeta,
  checkToolCheckPinned,
  withContextList,
  pickToolDecision,
  normalizePermissionDecisionMap,
  EDIT_SOURCE_KINDS,
  MAX_REQUEST_META_BYTES,
  COM_ANTHROPIC_SOURCES_RELAY,
  COM_ANTHROPIC_PLUGIN_META_CUT,
  withAgentId,
  stripHostToolMeta,
  joinTextBlocks,
  toolInputText,
  ANTHROPIC_SOURCES,
  RANDOM_PLUGIN_META_ID,
  CLAUDE_OMITTED,
  utf8Length,
  checkRequestMeta,
  withRequestMeta,
  toolCallEventNoAgent,
};
