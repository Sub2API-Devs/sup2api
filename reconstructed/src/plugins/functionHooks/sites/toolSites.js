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
  restoreMissingKeys,
  M,
  $a,
  asStringList,
  freeze_7,
  checkValueOrDeny,
  _rs,
  checkPinnedKeysWith,
} from "./siteRules.js";
import { wi } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { Rs } from "../../../utils/hooks/hookSerialization.js";
import { contextMeasureFor, maxNewTextLength, uf, Ae, Jt, he } from "./promptContextSites.js";
import { pp, ap } from "./agentSites.js";
import { CSi } from "../builtinHooksModule.js";

//@ chunk-4121qate.js:207816-207856 placement
var kv = ["tool", "tool_use_id", "agentId"];
//@ chunk-4121qate.js:207856-207875 placement
var lt = "$shadowed";
//@ chunk-4121qate.js:207875-207897 placement
var REQUESTMETA = "requestMeta";
//@ chunk-4121qate.js:207897-207950 placement
var fp = ["tool", "tool_use_id", "agentId", "consent", lt];
//@ chunk-4121qate.js:207950-208072 placement
function pickShadowedToolFields(e) {
  let o = {};
  for (let r of [...fp, REQUESTMETA]) if (Object.hasOwn(e, r)) o[r] = e[r];
  return Object.keys(o).length === 0 ? void 0 : o;
}
/**
 * 把工具输入整理成 tool.call 事件：放入 tool 与 tool_use_id，consent/agentId/requestMeta 等宿主字段收进隐藏字段。
 */
//@ chunk-4121qate.js:208072-208204 placement
function toToolCallEvent(e, o, r) {
  let n = pickShadowedToolFields(r),
    { consent: consent, agentId: agentId, requestMeta: requestMeta, ...f } = r;
  return { ...f, tool: e, tool_use_id: o, ...(n !== void 0 && { [lt]: n }) };
}
//@ chunk-4121qate.js:208204-208249 placement
var nSi = (e, o) => (o === void 0 ? e : { ...e, agentId: o });
//@ chunk-4121qate.js:208249-208271 placement
var Rv = ["agentId", lt];
/**
 * 把内容块数组中的文本块用分隔符拼接（非数组返回空串）。
 */
//@ chunk-4121qate.js:208271-208401 placement
var joinTextBlocks = (e, o) =>
  Array.isArray(e)
    ? e
        .flatMap((r) =>
          typeof r === "object" && r !== null && r.type === "text" ? [String(r.text ?? "")] : [],
        )
        .join(o)
    : "";
/**
 * 从 tool.call 事件还原工具输入：去掉 tool、tool_use_id、agentId、consent、requestMeta，并合回隐藏字段。
 */
//@ chunk-4121qate.js:208401-208516 placement
function toolInputOf(e) {
  let {
    tool: tool,
    tool_use_id: tool_use_id,
    agentId: agentId,
    consent: consent,
    requestMeta: requestMeta,
    [lt]: p,
    ...f
  } = e;
  return isPlainObject(p) ? { ...f, ...p } : f;
}
//@ chunk-4121qate.js:208516-208546 placement
var LUi = (e, o) => toToolCallEvent(e, void 0, o);
//@ chunk-4121qate.js:208546-208573 placement
var m3t = (e, o, r) => toToolCallEvent(e, o, r);
//@ chunk-4121qate.js:208573-208629 placement
function Brs(e) {
  return typeof e === "string"
    ? e
    : joinTextBlocks(
        e,
        `
`,
      );
}
//@ chunk-4121qate.js:208629-208678 placement
var HUi = (e, o) => (o === void 0 ? e : { ...e, requestMeta: o });
//@ chunk-4121qate.js:208678-208702 placement
var Jo = (e, o) => checkPinnedKeys(fp, e, o);
//@ chunk-4121qate.js:208702-208779 placement
var mp = (e) =>
  isPlainObject(e) ? wi(e, (o, r) => o === !1 && (r === "deny" || r === "ask" || r === "allow")) : e;
//@ chunk-4121qate.js:208779-209194 placement
var CLASSIC_PRE_TOOL_USE_SITE = {
  event: "classic.PreToolUse",
  restoreArgument: (e, o) => restoreMissingKeys([lt], e, o),
  checkArgument: Jo,
  settle: mp,
  check: M(({ deny: deny, ask: ask, allow: allow }) => {
    let n = typeof deny === "string" || typeof ask === "string";
    return !n && (deny !== void 0 || ask !== void 0)
      ? "a deny or ask that is not a string"
      : !n && allow !== void 0 && allow !== !0
        ? "an allow that is not true"
        : void 0;
  }),
  carry: (e, o, r) =>
    e.updatedInput === void 0 && typeof e.deny !== "string" && $a(o, r)
      ? { ...e, updatedInput: toolInputOf(o) }
      : e,
};
/**
 * 保留下层结果中的只读标记（结果未变时）。
 */
//@ chunk-4121qate.js:209194-209464 placement
function keepReadOnlyMark(e, o) {
  let { isReadOnly: isReadOnly, ...n } = e;
  if (n.deny !== void 0 || n.ref === void 0) return n;
  let last = o.findLast((f) => f.ref === n.ref),
    i = Rs(n.result);
  return last !== void 0 &&
    last.isReadOnly === !0 &&
    (n.result === void 0 || n.result === last.result || (i !== void 0 && i === Rs(last.result)))
    ? { ...n, isReadOnly: !0 }
    : n;
}
/**
 * 校验工具名未改动。
 */
//@ chunk-4121qate.js:209464-209578 placement
function checkToolNameUnchanged(e, o) {
  return e.name !== o.name ? "a changed name (the tool being registered; next(e) passes it on)" : void 0;
}
//@ chunk-4121qate.js:209615-209790 placement
var ANTHROPIC_SOURCES = "anthropic/sources",
  beo = ["claude/plugins", ANTHROPIC_SOURCES],
  Tn = [ANTHROPIC_SOURCES],
  COM_ANTHROPIC_SOURCES_RELAY = "com.anthropic/sources-relay",
  Ffr = randomUUID(),
  COM_ANTHROPIC_PLUGIN_META_CUT = "com.anthropic/plugin-meta-cut",
  oxt = 262144,
  CLAUDE_OMITTED = "claude/omitted";
//@ chunk-4121qate.js:209790-209848 placement
function jrs(e) {
  return new TextEncoder().encode(e).length;
}
//@ chunk-4121qate.js:209848-210240 placement
function checkRequestMeta(e) {
  if (e === void 0) return;
  if (!isPlainObject(e)) return "a requestMeta that is not an object";
  let o = 0;
  for (let [r, n] of Object.entries(e)) {
    if (!Tn.includes(r)) return `a requestMeta key a hook may not set (it may set ${Tn.join(", ")})`;
    if (typeof n !== "string") return `a requestMeta value that is not a string (under ${r})`;
    o += jrs(n);
  }
  return o > oxt ? `a requestMeta of ${o} bytes (the most is ${oxt})` : void 0;
}
/**
 * 去掉对象中宿主专用的元数据键（没有时原样返回）。
 */
//@ chunk-4121qate.js:210240-210391 placement
function stripHostToolMeta(e) {
  if (e === void 0 || !Tn.some((r) => Object.hasOwn(e, r))) return e;
  let o = {};
  for (let [r, n] of Object.entries(e)) if (!Tn.includes(r)) o[r] = n;
  return o;
}
//@ chunk-4121qate.js:210391-210426 placement
var dp = (e, o) => Jo(e, o) ?? checkRequestMeta(e[REQUESTMETA]);
//@ chunk-4121qate.js:210426-210515 placement
function lp(e) {
  let o = { ...e };
  return o.context === void 0 ? o : { ...o, context: asStringList(o.context) ?? freeze_7 };
}
//@ chunk-4121qate.js:210515-210525 placement
var bn = "";
/**
 * 从权限结果中挑出决定、原因、规则、钩子、设置与插件等字段。
 */
//@ chunk-4121qate.js:210525-210788 placement
function pickToolDecision(e) {
  let { decision: decision, reason: reason, rule: rule, hook: hook, setting: setting, plugin: plugin } = e,
    { decider: decider } = e,
    a = { decision: decision };
  if (reason !== void 0) a.reason = reason;
  if (rule !== void 0) a.rule = rule;
  if (hook !== void 0) a.hook = hook;
  if (setting !== void 0) a.setting = setting;
  if (plugin !== void 0) a.plugin = plugin;
  if (decider === "person") a.plugin = bn;
  return a;
}
/**
 * tool.call 站点规则：固定 tool/tool_use_id/agentId，恢复隐藏字段，结果须为 {result} 或 {deny}，校验 context 保留下层条目。
 */
//@ chunk-4121qate.js:210788-211176 placement
var TOOL_CALL_SITE = {
  event: "tool.call",
  restoreArgument: (e, o) => restoreMissingKeys([...Rv, REQUESTMETA], e, o),
  checkArgument: dp,
  pinnedKeys: kv,
  settle: lp,
  stripResult: keepReadOnlyMark,
  check: M((e, o, r) => {
    let n = e.deny === void 0;
    return (
      checkValueOrDeny(e, "{ result }", (s) => Object.hasOwn(s, "result")) ??
      (n
        ? contextMeasureFor(
            e.context,
            e.result,
            (r ?? []).filter((s) => s.deny === void 0),
          )
        : void 0)
    );
  }),
  measure: (e, o, r) => maxNewTextLength(e.context, ...r.map((n) => n.context)),
  isLateRefusal: uf("deny"),
  carry: _rs,
};
//@ chunk-4121qate.js:211176-211270 placement
function ac(e, o) {
  let r = e.plugins?.some((n) => n === o) === !0;
  return e.isHop !== !0 ? e.name : r ? o : void 0;
}
//@ chunk-4121qate.js:211270-211323 placement
var fc = ["decision", "reason", "rule", "hook", "setting"];
//@ chunk-4121qate.js:211323-211613 placement
function attributeAskDecision(e, o, r) {
  let { plugin: plugin, ...s } = e;
  if (s.decision !== "ask") return s;
  let filtered = o.filter((u) => fc.every((l) => u[l] === s[l])),
    p = filtered.find((u) => u.plugin === plugin) ?? filtered[0],
    f = ac(r, plugin),
    a = r.isHop === !0 && f !== void 0 && filtered.every((u) => u.plugin !== plugin),
    c = p !== void 0 && plugin !== bn && !a ? p.plugin : f;
  return c === void 0 ? s : { ...s, plugin: c };
}
//@ chunk-4121qate.js:211613-211695 placement
var gp = ["tool", "input", "tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-4121qate.js:211695-211762 placement
var xp = ["tool_use_id", "agentId", "ceiling", "approver", "isReadOnly"];
//@ chunk-4121qate.js:211762-212329 placement
var TOOL_CHECK_SITE = {
  event: "tool.check",
  restoreArgument: (e, o) => restoreMissingKeys(xp, e, o),
  checkArgument: (e, o) =>
    checkPinnedKeysWith({
      keys: gp,
      passed: e,
      received: o,
      explanation:
        "the tool, its input and the call are the question and are pinned; a hook answers { decision }, it does not ask about another call",
    }),
  settle: pickToolDecision,
  restoreResult: (e, o, r) => pp(e, r),
  stripResult: attributeAskDecision,
  check: M((e) => {
    let { decision: decision, reason: reason, rule: rule, hook: hook, setting: setting } = e;
    if (!ap(decision)) return `no { decision } (one of ${CSi.join(", ")})`;
    return [reason, rule, hook, setting].every((f) => f === void 0 || typeof f === "string")
      ? void 0
      : "a reason, rule, hook or setting that is not a string";
  }),
};
//@ chunk-4121qate.js:212329-213249 placement
var TOOL_DESCRIBE_SITE = {
  event: "tool.describe",
  restoreArgument: (e, o) => restoreMissingKeys(["provider"], e, o),
  checkArgument: (e, o) => {
    if (typeof e.tool !== "string") return "no { tool }";
    if (e.tool !== o.tool) return "a changed tool (the engine caches the description by it)";
    if (checkPinnedKeys(["provider"], e, o) !== void 0)
      return "a changed provider (pinned: who provides the tool is a fact)";
    if (!(e.isDeferred === void 0 || typeof e.isDeferred === "boolean"))
      return "an isDeferred that is not a boolean";
    return typeof e.description === "string" ? void 0 : "no { description }";
  },
  measureArgument: (e, o) => Ae(e.description, o.description),
  restoreResult: (e, o, r) => {
    if (e.isDeferred !== void 0) return e;
    let s = o.at(-1)?.isDeferred ?? r.isDeferred;
    return s === void 0 ? e : { ...e, isDeferred: s };
  },
  check: M((e) => {
    if (typeof e.description !== "string") return "no { description } (a string)";
    return e.isDeferred === void 0 || typeof e.isDeferred === "boolean"
      ? void 0
      : "an isDeferred that is not a boolean";
  }),
  measure: Jt("description"),
};
//@ chunk-4121qate.js:213249-213329 placement
var dc = { event: "tool.register", check: he("tool.register").check, checkArgument: checkToolNameUnchanged };

export {
  toolInputOf,
  REQUESTMETA,
  m3t,
  CLASSIC_PRE_TOOL_USE_SITE,
  TOOL_CALL_SITE,
  TOOL_CHECK_SITE,
  gp,
  xp,
  TOOL_DESCRIBE_SITE,
  dc,
  keepReadOnlyMark,
  checkToolNameUnchanged,
  dp,
  Jo,
  lp,
  pickToolDecision,
  mp,
  beo,
  oxt,
  COM_ANTHROPIC_SOURCES_RELAY,
  COM_ANTHROPIC_PLUGIN_META_CUT,
  nSi,
  stripHostToolMeta,
  joinTextBlocks,
  Brs,
  ANTHROPIC_SOURCES,
  Ffr,
  CLAUDE_OMITTED,
  jrs,
  checkRequestMeta,
  HUi,
  LUi,
};
