/**
 * plugins/functionHooks/sites/toolSites.ts
 *
 * 钩子站点规则：tool.call/check/describe 与 requestMeta（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-j8f885h1.js (36)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import {
  checkPinnedKeys,
  restoreMissingKeys_2,
  checkResultObject,
  differsFromAnswer,
  asStringList,
  EMPTY_CONTEXT,
  checkValueOrDeny,
  stripErrorFlag,
  checkPinnedKeysWith,
} from "./siteRules.js";
import { import_reject } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:189001-189041 placement
/**
 * tool/tool_use_id/agentId
 */
var TOOL_CALL_PINNED_KEYS = ["tool", "tool_use_id", "agentId"];
//@ chunk-j8f885h1.js:189041-189060 placement
/**
 * "$shadowed"
 */
var SHADOWED_KEY = "$shadowed";
//@ chunk-j8f885h1.js:189060-189082 placement
var REQUESTMETA = "requestMeta";
//@ chunk-j8f885h1.js:189082-189135 placement
/**
 * tool.check 固定键
 */
var TOOL_CHECK_PINNED_KEYS = ["tool", "tool_use_id", "agentId", "consent", SHADOWED_KEY];
//@ chunk-j8f885h1.js:189135-189257 placement
function pickShadowedToolFields(input) {
  let shadowed = {};
  for (let key of [...TOOL_CHECK_PINNED_KEYS, REQUESTMETA])
    if (Object.hasOwn(input, key)) shadowed[key] = input[key];
  return Object.keys(shadowed).length === 0 ? undefined : shadowed;
}
//@ chunk-j8f885h1.js:189257-189389 placement
/**
 * 把工具输入整理成 tool.call 事件：放入 tool 与 tool_use_id，consent/agentId/requestMeta 等宿主字段收进隐藏字段。
 */
function toToolCallEvent(tool, toolUseId, input) {
  let shadowed = pickShadowedToolFields(input);
  let { consent, agentId, requestMeta, ...rest } = input;
  return {
    ...rest,
    tool,
    tool_use_id: toolUseId,
    ...(shadowed !== undefined && {
      [SHADOWED_KEY]: shadowed,
    }),
  };
}
//@ chunk-j8f885h1.js:189389-189434 placement
/**
 * 附上 agentId
 */
var withAgentId = (event, agentId) =>
  agentId === undefined
    ? event
    : {
        ...event,
        agentId,
      };
//@ chunk-j8f885h1.js:189434-189456 placement
/**
 * agentId/$shadowed
 */
var AGENT_ID_KEYS = ["agentId", SHADOWED_KEY];
//@ chunk-j8f885h1.js:189456-189586 placement
/**
 * 把内容块数组中的文本块用分隔符拼接（非数组返回空串）。
 */
var joinTextBlocks = (content, separator) =>
  Array.isArray(content)
    ? content
        .flatMap((block) =>
          typeof block === "object" && block !== null && block.type === "text"
            ? [String(block.text ?? "")]
            : [],
        )
        .join(separator)
    : "";
//@ chunk-j8f885h1.js:189586-189701 placement
/**
 * 从 tool.call 事件还原工具输入：去掉 tool、tool_use_id、agentId、consent、requestMeta，并合回隐藏字段。
 */
function toolInputOf(input) {
  let {
    tool,
    tool_use_id: toolUseId,
    agentId,
    consent,
    requestMeta,
    [SHADOWED_KEY]: shadowed,
    ...rest
  } = input;
  return isPlainObject(shadowed)
    ? {
        ...rest,
        ...shadowed,
      }
    : rest;
}
//@ chunk-j8f885h1.js:189701-189731 placement
/**
 * 无 agentId 的工具事件
 */
var toolCallEventNoAgent = (tool, input) => toToolCallEvent(tool, undefined, input);
//@ chunk-j8f885h1.js:189731-189758 placement
/**
 * 工具调用事件
 */
var toolCallEvent = (tool, toolUseId, input) => toToolCallEvent(tool, toolUseId, input);
//@ chunk-j8f885h1.js:189758-189814 placement
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
//@ chunk-j8f885h1.js:189814-189863 placement
/**
 * 附请求元信息
 */
var withRequestMeta = (input, requestMeta) =>
  requestMeta === undefined
    ? input
    : {
        ...input,
        requestMeta,
      };
//@ chunk-j8f885h1.js:189863-189887 placement
/**
 * 校验 tool.check 固定键
 */
var checkToolCheckPinned = (passed, received) => checkPinnedKeys(TOOL_CHECK_PINNED_KEYS, passed, received);
//@ chunk-j8f885h1.js:189887-189964 placement
/**
 * 归一权限决定表
 */
var normalizePermissionDecisionMap = (map) =>
  isPlainObject(map)
    ? import_reject(
        map,
        (value, decision) =>
          value === false && (decision === "deny" || decision === "ask" || decision === "allow"),
      )
    : map;
//@ chunk-j8f885h1.js:189964-190379 placement
var CLASSIC_PRE_TOOL_USE_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:189964", () => {
  CLASSIC_PRE_TOOL_USE_SITE = {
    event: "classic.PreToolUse",
    restoreArgument: (passed, received) => restoreMissingKeys_2([SHADOWED_KEY], passed, received),
    checkArgument: checkToolCheckPinned,
    settle: normalizePermissionDecisionMap,
    check: checkResultObject(({ deny, ask, allow }) => {
      let hasStringDecision = typeof deny === "string" || typeof ask === "string";
      return !hasStringDecision && (deny !== undefined || ask !== undefined)
        ? "a deny or ask that is not a string"
        : !hasStringDecision && allow !== undefined && allow !== true
          ? "an allow that is not true"
          : undefined;
    }),
    carry: (answer, request, next) =>
      answer.updatedInput === undefined && typeof answer.deny !== "string" && differsFromAnswer(request, next)
        ? {
            ...answer,
            updatedInput: toolInputOf(request),
          }
        : answer,
  };
});
//@ chunk-j8f885h1.js:190379-190649 placement
/**
 * 保留下层结果中的只读标记（结果未变时）。
 */
function keepReadOnlyMark(answer, answers) {
  let { isReadOnly, ...rest } = answer;
  if (rest.deny !== undefined || rest.ref === undefined) return rest;
  let last = answers.findLast((prior) => prior.ref === rest.ref);
  let resultText = stableStringifySafe(rest.result);
  return last !== undefined &&
    last.isReadOnly === true &&
    (rest.result === undefined ||
      rest.result === last.result ||
      (resultText !== undefined && resultText === stableStringifySafe(last.result)))
    ? {
        ...rest,
        isReadOnly: true,
      }
    : rest;
}
//@ chunk-j8f885h1.js:190649-190763 placement
/**
 * 校验工具名未改动。
 */
function checkToolNameUnchanged(passed, received) {
  return passed.name !== received.name
    ? "a changed name (the tool being registered; next(e) passes it on)"
    : undefined;
}
//@ chunk-j8f885h1.js:190800-190975 placement
/**
 * 工具站点用到的来源种类常量组：anthropic/sources、claude/plugins、sources-relay 等，以及请求元信息的字节上限。
 */
var ANTHROPIC_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EDIT_SOURCE_KINDS;
var SOURCE_KINDS;
var COM_ANTHROPIC_SOURCES_RELAY;
var RANDOM_PLUGIN_META_ID;
var COM_ANTHROPIC_PLUGIN_META_CUT;
var MAX_REQUEST_META_BYTES;
var CLAUDE_OMITTED;
deferInit("chunk-j8f885h1.js:190800", () => {
  ANTHROPIC_SOURCES = "anthropic/sources";
  EDIT_SOURCE_KINDS = ["claude/plugins", ANTHROPIC_SOURCES];
  SOURCE_KINDS = [ANTHROPIC_SOURCES];
  COM_ANTHROPIC_SOURCES_RELAY = "com.anthropic/sources-relay";
  RANDOM_PLUGIN_META_ID = randomUUID();
  COM_ANTHROPIC_PLUGIN_META_CUT = "com.anthropic/plugin-meta-cut";
  MAX_REQUEST_META_BYTES = 262144;
  CLAUDE_OMITTED = "claude/omitted";
});
//@ chunk-j8f885h1.js:190975-191033 placement
/**
 * UTF-8 字节数
 */
function utf8Length(text) {
  return new TextEncoder().encode(text).length;
}
//@ chunk-j8f885h1.js:191033-191425 placement
function checkRequestMeta(requestMeta) {
  if (requestMeta === undefined) return;
  if (!isPlainObject(requestMeta)) return "a requestMeta that is not an object";
  let totalBytes = 0;
  for (let [key, value] of Object.entries(requestMeta)) {
    if (!SOURCE_KINDS.includes(key))
      return `a requestMeta key a hook may not set (it may set ${SOURCE_KINDS.join(", ")})`;
    if (typeof value !== "string") return `a requestMeta value that is not a string (under ${key})`;
    totalBytes += utf8Length(value);
  }
  return totalBytes > MAX_REQUEST_META_BYTES
    ? `a requestMeta of ${totalBytes} bytes (the most is ${MAX_REQUEST_META_BYTES})`
    : undefined;
}
//@ chunk-j8f885h1.js:191425-191576 placement
/**
 * 去掉对象中宿主专用的元数据键（没有时原样返回）。
 */
function stripHostToolMeta(requestMeta) {
  if (requestMeta === undefined || !SOURCE_KINDS.some((kind) => Object.hasOwn(requestMeta, kind)))
    return requestMeta;
  let kept = {};
  for (let [key, value] of Object.entries(requestMeta)) if (!SOURCE_KINDS.includes(key)) kept[key] = value;
  return kept;
}
//@ chunk-j8f885h1.js:191576-191611 placement
/**
 * 固定键 + 元信息校验
 */
var checkToolCallPinnedAndMeta = (passed, received) =>
  checkToolCheckPinned(passed, received) ?? checkRequestMeta(passed[REQUESTMETA]);
//@ chunk-j8f885h1.js:191611-191700 placement
/**
 * context 归一为字符串列表
 */
function withContextList(answer) {
  let copy = {
    ...answer,
  };
  return copy.context === undefined
    ? copy
    : {
        ...copy,
        context: asStringList(copy.context) ?? EMPTY_CONTEXT,
      };
}
//@ chunk-j8f885h1.js:191700-191710 placement
/**
 * 空串
 */
var EMPTY_STRING = "";
//@ chunk-j8f885h1.js:191710-191973 placement
/**
 * 从权限结果中挑出决定、原因、规则、钩子、设置与插件等字段。
 */
function pickToolDecision(answer) {
  let { decision, reason, rule, hook, setting, plugin } = answer;
  let { decider } = answer;
  let picked = {
    decision,
  };
  if (reason !== undefined) picked.reason = reason;
  if (rule !== undefined) picked.rule = rule;
  if (hook !== undefined) picked.hook = hook;
  if (setting !== undefined) picked.setting = setting;
  if (plugin !== undefined) picked.plugin = plugin;
  if (decider === "person") picked.plugin = EMPTY_STRING;
  return picked;
}
//@ chunk-j8f885h1.js:191973-192361 placement
/**
 * tool.call 站点规则：固定 tool/tool_use_id/agentId，恢复隐藏字段，结果须为 {result} 或 {deny}，校验 context 保留下层条目。
 */
var TOOL_CALL_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:191973", () => {
  TOOL_CALL_SITE = {
    event: "tool.call",
    restoreArgument: (passed, received) =>
      restoreMissingKeys_2([...AGENT_ID_KEYS, REQUESTMETA], passed, received),
    checkArgument: checkToolCallPinnedAndMeta,
    pinnedKeys: TOOL_CALL_PINNED_KEYS,
    settle: withContextList,
    stripResult: keepReadOnlyMark,
    check: checkResultObject((answer, request, answers) => {
      let isNotDenied = answer.deny === undefined;
      return (
        checkValueOrDeny(answer, "{ result }", (value) => Object.hasOwn(value, "result")) ??
        (isNotDenied
          ? contextMeasureFor(
              answer.context,
              answer.result,
              (answers ?? []).filter((answer) => answer.deny === undefined),
            )
          : undefined)
      );
    }),
    measure: (result, request, answers) =>
      maxNewTextLength(result.context, ...answers.map((answer) => answer.context)),
    isLateRefusal: addsOnlyKey("deny"),
    carry: stripErrorFlag,
  };
});
//@ chunk-j8f885h1.js:192361-192455 placement
/**
 * 决定名归属插件
 */
function pluginDecisionName(decision, plugin) {
  let ownsPlugin = decision.plugins?.some((plugin_2) => plugin_2 === plugin) === true;
  return decision.isHop !== true ? decision.name : ownsPlugin ? plugin : undefined;
}
//@ chunk-j8f885h1.js:192455-192508 placement
/**
 * 决定相关字段
 */
var DECISION_FIELDS = ["decision", "reason", "rule", "hook", "setting"];
//@ chunk-j8f885h1.js:192508-192798 placement
function attributeAskDecision(decision, answers, facts) {
  let { plugin, ...rest } = decision;
  if (rest.decision !== "ask") return rest;
  let filtered = answers.filter((candidate) =>
    DECISION_FIELDS.every((field) => candidate[field] === rest[field]),
  );
  let ownAsk = filtered.find((answer) => answer.plugin === plugin) ?? filtered[0];
  let factPlugin = pluginDecisionName(facts, plugin);
  let isForeignHop =
    facts.isHop === true && factPlugin !== undefined && filtered.every((answer) => answer.plugin !== plugin);
  let attributed =
    ownAsk !== undefined && plugin !== EMPTY_STRING && !isForeignHop ? ownAsk.plugin : factPlugin;
  return attributed === undefined
    ? rest
    : {
        ...rest,
        plugin: attributed,
      };
}
//@ chunk-j8f885h1.js:192798-192880 placement
/**
 * tool.call 字段
 */
var TOOL_CALL_FIELDS = ["tool", "input", "tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-j8f885h1.js:192880-192947 placement
/**
 * tool.check 字段
 */
var TOOL_CHECK_FIELDS = ["tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-j8f885h1.js:192947-193514 placement
var TOOL_CHECK_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:192947", () => {
  TOOL_CHECK_SITE = {
    event: "tool.check",
    restoreArgument: (passed, received) => restoreMissingKeys_2(TOOL_CHECK_FIELDS, passed, received),
    checkArgument: (passed, received) =>
      checkPinnedKeysWith({
        keys: TOOL_CALL_FIELDS,
        passed,
        received,
        explanation:
          "the tool, its input and the call are the question and are pinned; a hook answers { decision }, it does not ask about another call",
      }),
    settle: pickToolDecision,
    restoreResult: (answer, request, answers) => withCeiling(answer, answers),
    stripResult: attributeAskDecision,
    check: checkResultObject((answer) => {
      let { decision, reason, rule, hook, setting } = answer;
      if (!isPermissionDecisionValue(decision))
        return `no { decision } (one of ${DECISION_ORDER.join(", ")})`;
      return [reason, rule, hook, setting].every((field) => field === undefined || typeof field === "string")
        ? undefined
        : "a reason, rule, hook or setting that is not a string";
    }),
  };
});
//@ chunk-j8f885h1.js:193514-194434 placement
var TOOL_DESCRIBE_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:193514", () => {
  TOOL_DESCRIBE_SITE = {
    event: "tool.describe",
    restoreArgument: (passed, received) => restoreMissingKeys_2(["provider"], passed, received),
    checkArgument: (passed, received) => {
      if (typeof passed.tool !== "string") return "no { tool }";
      if (passed.tool !== received.tool) return "a changed tool (the engine caches the description by it)";
      if (checkPinnedKeys(["provider"], passed, received) !== undefined)
        return "a changed provider (pinned: who provides the tool is a fact)";
      if (!(passed.isDeferred === undefined || typeof passed.isDeferred === "boolean"))
        return "an isDeferred that is not a boolean";
      return typeof passed.description === "string" ? undefined : "no { description }";
    },
    measureArgument: (passed, received) => textLengthIfNotIn(passed.description, received.description),
    restoreResult: (answer, answers, request) => {
      if (answer.isDeferred !== undefined) return answer;
      let isDeferred = answers.at(-1)?.isDeferred ?? request.isDeferred;
      return isDeferred === undefined
        ? answer
        : {
            ...answer,
            isDeferred,
          };
    },
    check: checkResultObject((answer) => {
      if (typeof answer.description !== "string") return "no { description } (a string)";
      return answer.isDeferred === undefined || typeof answer.isDeferred === "boolean"
        ? undefined
        : "an isDeferred that is not a boolean";
    }),
    measure: firstLongerText("description"),
  };
});
//@ chunk-j8f885h1.js:194434-194514 placement
/**
 * tool.register 站点规则
 */
var TOOL_REGISTER_SITE; // deferred: uses valueOnlySite (./promptContextSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:194434", () => {
  TOOL_REGISTER_SITE = {
    event: "tool.register",
    check: valueOnlySite("tool.register").check,
    checkArgument: checkToolNameUnchanged,
  };
});
export {
  joinTextBlocks,
  toolInputOf,
  toolInputText,
  toolCallEvent,
  COM_ANTHROPIC_PLUGIN_META_CUT,
  EDIT_SOURCE_KINDS,
  ANTHROPIC_SOURCES,
  COM_ANTHROPIC_SOURCES_RELAY,
  RANDOM_PLUGIN_META_ID,
  CLAUDE_OMITTED,
  utf8Length,
  MAX_REQUEST_META_BYTES,
  checkRequestMeta,
  stripHostToolMeta,
  withAgentId,
  withRequestMeta,
  toolCallEventNoAgent,
  REQUESTMETA,
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
};
