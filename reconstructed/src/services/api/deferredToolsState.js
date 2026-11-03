/**
 * services/api/deferredToolsState.ts
 *
 * 2.1.316 新增：延迟加载工具（defer_loading / tool_reference）的会话状态：已发送的定义、剥离的引用、MCP 保留旧名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (43)
 * attribution: sole-consumer 1, placement 42
 */
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { getMessagePreview } from "../../components/Spinner/TeammateSpinnerLine.js";
import { executeCloudPersistence } from "../../utils/filePersistence/filePersistence.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  KPi,
  registerToolIdentities,
  noteSentWireNames,
  wireName,
  internalName,
} from "../mcp/serverIdentity.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { isStandardKeyActive, compareByName, mergeClients } from "../mcp/mcpStandardKeys.js";
import { _O } from "../../tools/REPLTool/constants.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { isFoamySpringEnabled } from "../analytics/growthbookGates.js";
import { env } from "../../utils/env.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { joinWithNewline, collectToolReferences } from "../../utils/toolSearch.js";
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { classifyQuerySource } from "./requestHeaders.js";
import { ye, TOOL_DEFINITION_FLAG_KEYS, isDeferredCustomToolDefinition, me } from "./toolDefinitionShape.js";
import { toolMatchesName, findToolByName } from "../../Tool.js";
import { fromEnumOpt } from "../analytics/safeMetadata.js";
import { count } from "../../utils/collections.js";
import { ihi } from "../../tools/AgentTool/constants.js";
import { normalizeNfkc, XDn, sanitizeLogLine } from "../../utils/sanitization.js";
import { MAX_ERROR_TEXT_CHARS, ERROR_TEXT_SLACK_CHARS, pVt } from "../mcp/redactMcpErrors.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-a76knw89.js:19845-19923 sole-consumer
function Kn(e) {
  return Array.isArray(e.content) ? { ...e, content: getMessagePreview(e.content) } : e;
}
//@ chunk-a76knw89.js:19923-20079 placement
function logStandardKeyOutcome() {
  let of = executeCloudPersistence.of(getRootSession());
  if (KPi() > 0 && !of.kept) ((of.kept = !0), logFeatureSad("mcp_standard_key", "kept_legacy_names"));
  else if (!of.ok && !of.kept) ((of.ok = !0), logFeatureOk("mcp_standard_key"));
}
//@ chunk-a76knw89.js:20079-20182 placement
function logStandardKeyFailure(e) {
  logError(e);
  let of = executeCloudPersistence.of(getRootSession());
  if (!of.failed) ((of.failed = !0), logFeatureBad("mcp_standard_key", "translate_failed"));
}
/**
 * 有 MCP 工具且开关打开时，登记 MCP 标准键并刷新，返回是否成功。
 */
//@ chunk-a76knw89.js:20182-20294 placement
function registerMcpStandardKeys(e) {
  try {
    if (e.some((n) => n.mcpInfo !== void 0) && isStandardKeyActive())
      (registerToolIdentities(compareByName(e)), logStandardKeyOutcome());
    return !0;
  } catch (error) {
    return (logStandardKeyFailure(error), !1);
  }
}
//@ chunk-a76knw89.js:20294-20716 placement
function deferredToolNameOf(e) {
  try {
    if (!isStandardKeyActive()) return e;
    let tool_choice = e.tool_choice;
    return (
      noteSentWireNames(
        (e.tools ?? []).flatMap((o) => ("name" in o && typeof o.name === "string" ? [o.name] : [])),
      ),
      {
        ...e,
        messages: e.messages.map(Kn),
        ...(e.context_management != null && { context_management: getMessagePreview(e.context_management) }),
        ...(e.tools !== void 0 && { tools: e.tools.map(mergeClients) }),
        ...(tool_choice !== void 0 &&
          "name" in tool_choice &&
          typeof tool_choice.name === "string" && {
            tool_choice: { ...tool_choice, name: wireName(tool_choice.name) },
          }),
      }
    );
  } catch (error) {
    return (logStandardKeyFailure(error), e);
  }
}
//@ chunk-a76knw89.js:20716-20814 placement = countToolCallsSince (1)
function countToolCallsSince_2(e) {
  for (let n of e.content) if (n.type === "tool_use" && n.name !== void 0) n.name = internalName(n.name);
}
//@ chunk-a76knw89.js:20814-20866 placement
var Je = Symbol.for("claude-code.hostOnlyNativeTool");
//@ chunk-a76knw89.js:20866-20944 placement
function Vri(e) {
  return (Object.defineProperty(e, Je, { value: !0, enumerable: !0 }), e);
}
//@ chunk-a76knw89.js:20944-20974 placement
function _2(e) {
  return Je in e;
}
//@ chunk-a76knw89.js:21016-21060 placement
function re(e, n) {
  return _O(e) && n(e) ? e : canonicalToolName(e);
}
//@ chunk-a76knw89.js:21060-21157 placement
function on() {
  if (!isFoamySpringEnabled()) return !1;
  return !(env.CLAUDE_CODE_SIMPLE || env.CLAUDE_CODE_DISABLE_ATTACHMENTS);
}
//@ chunk-a76knw89.js:21157-21251 placement
function l$e() {
  let e = Ao();
  return ((e.keptDeferredToolsEnabled ??= on()), e.keptDeferredToolsEnabled);
}
//@ chunk-a76knw89.js:21251-21309 placement
function bbn() {
  return Ao().keptDeferredToolsEnabled ?? on();
}
//@ chunk-a76knw89.js:21309-21321 placement
var Wn = 5000;
//@ chunk-a76knw89.js:21321-21370 placement
function J(e) {
  return joinWithNewline(e.toolUseId, e.toolName);
}
/**
 * 记录已向 API 发送过的延迟工具定义（LRU），用于判断是否需要再次声明。
 */
//@ chunk-a76knw89.js:21370-22039 placement
class DeferredToolDefinitionCache {
  #e = new Map();
  #n = new Set();
  #o = new Map();
  #t = new Map();
  #r = !1;
  #i = 0;
  get(e) {
    return this.#e.get(J(e));
  }
  set(e, n) {
    let o = J(e);
    if (!this.#e.delete(o) && this.#e.size >= Wn) {
      let r = this.#e.keys().next().value;
      if (r !== void 0) this.#e.delete(r);
    }
    (this.#e.set(o, n), this.#n.add(e.toolName));
  }
  hasTool(e) {
    return this.#n.has(e);
  }
  get size() {
    return this.#e.size;
  }
  noteSpliced(e, n) {
    this.#t.set(e, n);
  }
  splicedInputSchema(e) {
    return this.#t.get(e);
  }
  telemetrySignatureChanged(e, n) {
    if (n === this.#o.get(e)) return !1;
    return (this.#o.set(e, n), !0);
  }
  get generation() {
    return this.#i;
  }
  noteRetractionFailure() {
    let e = !this.#r;
    return ((this.#r = !0), e);
  }
  clear() {
    (this.#e.clear(), this.#n.clear(), this.#o.clear(), this.#t.clear(), this.#i++);
  }
}
//@ chunk-a76knw89.js:22039-22066 placement
var Sbn = new SessionRootSlot(() => new DeferredToolDefinitionCache());
//@ chunk-a76knw89.js:22066-22099 placement
function jW() {
  return Sbn.of(getRootSession());
}
//@ chunk-a76knw89.js:22099-22735 placement
function planDeferredToolDeclarations(e, n, o, r = !0, c) {
  let s = new Set(o.map((y) => y.name)),
    u = new Map();
  for (let y of n) {
    let b = e.get(y),
      k = b?.kind === "sent" && "name" in b.entry.schema ? b.entry.schema.name : void 0,
      S = re(y.toolName, (x) => s.has(x) || x === k);
    if (u.has(S)) continue;
    if (b?.kind === "sent" && (r || !b.entry.isMcp)) u.set(S, b.entry);
  }
  let p = new Set(),
    h = [],
    T = [];
  for (let y of n) {
    let b = e.get(y);
    if (b?.kind === "stripped") {
      p.add(J(y));
      continue;
    }
    if (b?.kind === "sent") continue;
    let k = re(y.toolName, (x) => s.has(x) || u.has(x)),
      S = u.get(k);
    if (S) h.push({ reference: y, entry: S });
    else if (!s.has(k) && !c?.keeps(k)) T.push(y);
  }
  return { kept: u, strippedReferenceKeys: p, resolvedAgainstKept: h, unrecordedDepartures: T };
}
//@ chunk-a76knw89.js:22735-23295 placement
function logKeptDeferredTools(e, n, o, { keepMcp: r = !0, surfacedOnWire: c, declaredInline: s } = {}) {
  try {
    if (!l$e()) return;
    let u = collectToolReferences(e, { surfacedOnWire: c });
    if (u.length === 0) return;
    let p = jW(),
      generation = p.generation,
      T = classifyQuerySource(o),
      y = xe(T, o),
      {
        kept: kept,
        strippedReferenceKeys: strippedReferenceKeys,
        resolvedAgainstKept: resolvedAgainstKept,
        unrecordedDepartures: unrecordedDepartures,
      } = planDeferredToolDeclarations(p, u, n, r, s);
    if (y) {
      for (let { reference: reference, entry: entry } of resolvedAgainstKept)
        p.set(reference, { kind: "sent", entry: entry });
      for (let w of unrecordedDepartures) p.set(w, { kind: "stripped" });
    }
    return {
      references: u,
      kept: kept,
      strippedReferenceKeys: strippedReferenceKeys,
      writes: y,
      category: T,
      querySource: o,
      generation: generation,
    };
  } catch (error) {
    (logError(error), logFeatureBad("mcp_kept_deferred_tools", "plan_failed"));
    return;
  }
}
/**
 * 计算保留的延迟工具名中不在当前工具列表里的那些（可选择不保留 MCP）。
 */
//@ chunk-a76knw89.js:23295-23525 placement
function keptDeferredToolNames(e, n, { keepMcp: o = !0, surfacedOnWire: r } = {}) {
  try {
    let c = jW();
    if (!l$e()) return;
    let { kept: kept } = planDeferredToolDeclarations(
        c,
        collectToolReferences(e, { surfacedOnWire: r }),
        n,
        o,
      ),
      u = new Set(n.map((p) => p.name));
    return [...kept.keys()].filter((p) => !u.has(p));
  } catch (error) {
    logRetractionFailure(error);
    return;
  }
}
//@ chunk-a76knw89.js:23525-23722 placement
function stripToolReferencesBeforeCompaction(e) {
  let n = jW(),
    lastIndex = e.findLastIndex((r) => r.type === "system" && r.subtype === "compact_boundary");
  return new Set(
    collectToolReferences(e.slice(lastIndex + 1))
      .filter((r) => n.get(r)?.kind !== "stripped")
      .map((r) => r.toolName),
  );
}
/**
 * 列出被剥离（stripped）的工具引用名。
 */
//@ chunk-a76knw89.js:23722-23842 placement
function strippedToolReferences(e) {
  let n = jW(),
    o = new Set();
  for (let r of e?.references ?? []) if (n.get(r)?.kind === "stripped") o.add(J(r));
  return o;
}
/**
 * 记录工具撤回失败，并在首次失败时记特性遥测。
 */
//@ chunk-a76knw89.js:23842-23944 placement
function logRetractionFailure(e) {
  if ((logError(e), jW().noteRetractionFailure()))
    logFeatureBad("mcp_kept_deferred_tools", "retraction_failed");
}
/**
 * 为本次请求决定延迟工具的声明方式（全量、引用、剥离），兼顾结构化输出与搜索引用（约 1.5 KB）。
 */
//@ chunk-a76knw89.js:23944-25468 placement
function buildDeferredToolsForRequest(
  e,
  n,
  o,
  {
    requestCarriesStructuredOutputs: requestCarriesStructuredOutputs,
    requestDeclaresSearchCitations: requestDeclaresSearchCitations,
  },
) {
  try {
    let max = Math.max(n.length - 1, 0),
      u = jW(),
      p = u.generation !== e.generation,
      h = {
        strict: requestCarriesStructuredOutputs,
        eager: ye(n),
        citations: requestDeclaresSearchCitations,
      },
      T = [],
      y = [];
    for (let [S, x] of e.kept) {
      let index = n.findIndex((M) => "name" in M && toolMatchesName(M, S)),
        O = n[index];
      if (O !== void 0) {
        if ("defer_loading" in O && O.defer_loading && !p) n[index] = TOOL_DEFINITION_FLAG_KEYS(x.schema, h);
        continue;
      }
      (y.push([S, x]), T.push(TOOL_DEFINITION_FLAG_KEYS(x.schema, h)));
    }
    if ((n.splice(max, 0, ...T), !p)) {
      for (let [S, { schema: x, isMcp: w }] of y)
        if (!w && "input_schema" in x) u.noteSpliced(S, x.input_schema);
    }
    if (!e.writes || p) return;
    let b = e.querySource ?? "";
    if (y.length === 0 && e.strippedReferenceKeys.size === 0) u.telemetrySignatureChanged(b, "");
    else {
      logForDebugging(
        `Dynamic tool loading: keeping ${y.length} departed deferred tool(s) declared; ${e.strippedReferenceKeys.size} reference(s) held stripped`,
      );
      let S = `${y
        .map(([x]) => x)
        .sort()
        .join(",")}|${e.strippedReferenceKeys.size}`;
      if (u.telemetrySignatureChanged(b, S)) {
        let x = fromEnumOpt(e.category);
        logFeatureOk("mcp_kept_deferred_tools", {
          kept_count: y.length,
          kept_mcp_count: count(y, ([, w]) => w.isMcp),
          stripped_reference_count: e.strippedReferenceKeys.size,
          ...(x !== void 0 && { query_source_category: x }),
        });
      }
    }
    let k = new Map();
    for (let reference of e.references) {
      if (e.strippedReferenceKeys.has(J(reference))) continue;
      let x = re(reference.toolName, (M) => o.has(M) || e.kept.has(M)),
        w = o.get(x);
      if (e.kept.has(x) || !w || !("defer_loading" in w.schema) || w.schema.defer_loading !== !0) continue;
      let O = k.get(x);
      if (O === void 0) ((O = { schema: w.schema, isMcp: w.isMcp }), k.set(x, O));
      u.set(reference, { kind: "sent", entry: O });
    }
  } catch (error) {
    (logError(error), logFeatureBad("mcp_kept_deferred_tools", "record_failed"));
  }
}
/**
 * 从附件中的 deferred_tools_delta 预置已知工具引用。
 */
//@ chunk-a76knw89.js:25468-26539 placement
function seedDeferredToolReferences(e, n, o) {
  try {
    let r = o?.strippedReferences ?? new Set();
    if ((n.length === 0 && r.size === 0) || !bbn()) return 0;
    let c = jW(),
      s = new Map();
    for (let T of n)
      if (isDeferredCustomToolDefinition(T) && !s.has(T.name))
        s.set(T.name, { schema: T, isMcp: T.name.startsWith("mcp__") });
    let u;
    if (o?.surfacedCarrier !== void 0) {
      u = new Set();
      for (let T of e) {
        if (
          T.type !== "attachment" ||
          T.attachment.type !== "deferred_tools_delta" ||
          o.surfacedCarrier.nameOnlyAnnouncements.has(T.uuid)
        )
          continue;
        let surfacedNames = T.attachment.surfacedNames;
        for (let b of Array.isArray(surfacedNames) ? surfacedNames : [])
          if (typeof b === "string" && s.has(b)) u.add(b);
      }
      for (let T of u) o.surfacedCarrier.surfacedOnWire.add(T);
    }
    let p = 0,
      h = new Set();
    for (let T of collectToolReferences(e, { surfacedOnWire: u })) {
      let y = c.get(T);
      if (r.has(J(T))) {
        if (y?.kind !== "stripped") (c.set(T, { kind: "stripped" }), p++);
        continue;
      }
      if (y !== void 0) continue;
      let b = re(T.toolName, (S) => s.has(S)),
        k = s.get(b);
      if (k === void 0) continue;
      (c.set(T, { kind: "sent", entry: k }), h.add(b), p++);
    }
    if (p > 0)
      logForDebugging(
        `Dynamic tool loading: seeded ${p} tool reference(s) to ${h.size} deferred tool(s) the previous process sent`,
      );
    return p;
  } catch (error) {
    return (logError(error), logFeatureBad("mcp_kept_deferred_tools", "seed_failed"), 0);
  }
}
//@ chunk-a76knw89.js:26539-26645 placement
function sameDefinitionIgnoringOptional(e, n) {
  if (isDeepStrictEqual_2(e, n)) return !0;
  let o = { ...e };
  for (let r of me) if (!(r in n)) delete o[r];
  return isDeepStrictEqual_2(o, n);
}
//@ chunk-a76knw89.js:26645-27173 placement
function keepDepartedDeferredTools(e, n, o, r, c, s) {
  try {
    if (n.size === 0 || !l$e()) return;
    let u = jW();
    if (u.generation !== s) return;
    if (!xe(classifyQuerySource(c), c)) return;
    let p = new Map();
    for (let h of collectToolReferences(e, { surfacedOnWire: n })) {
      if (u.get(h) !== void 0) continue;
      let T = re(h.toolName, (k) => r?.kept.has(k) === !0 || o.has(k)),
        y = r?.kept.get(T) ?? o.get(T);
      if (!y || !("defer_loading" in y.schema) || y.schema.defer_loading !== !0) continue;
      let b = p.get(T);
      if (b === void 0) ((b = { schema: y.schema, isMcp: y.isMcp }), p.set(T, b));
      u.set(h, { kind: "sent", entry: b });
    }
  } catch (error) {
    (logError(error), logFeatureBad("mcp_kept_deferred_tools", "record_failed"));
  }
}
/**
 * 把工具列表中的定义替换为延迟加载的自定义定义（若存在）。
 */
//@ chunk-a76knw89.js:27173-27303 placement
function restoreDeferredDefinitions(e, n) {
  try {
    let o = isDeferredDefinition(n);
    for (let r = 0; r < e.length; r++) {
      let c = o.get(e[r].name);
      if (c !== void 0 && isDeferredCustomToolDefinition(c)) e[r] = c;
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-a76knw89.js:27303-27765 placement
function recordDeferredToolsSent(e, n) {
  try {
    let o = jW();
    if (!e.writes || o.generation !== e.generation) return;
    let r = isDeferredDefinition(n),
      c = new Map();
    for (let reference of e.references) {
      if (e.strippedReferenceKeys.has(J(reference))) continue;
      let u = re(reference.toolName, (y) => r.has(y)),
        p = r.get(u),
        h = o.get(reference);
      if (p === void 0 || h?.kind !== "sent" || sameDefinitionIgnoringOptional(h.entry.schema, p)) continue;
      let T = c.get(u);
      if (T === void 0) ((T = { schema: p, isMcp: h.entry.isMcp }), c.set(u, T));
      o.set(reference, { kind: "sent", entry: T });
    }
  } catch (error) {
    (logError(error), logFeatureBad("mcp_kept_deferred_tools", "record_failed"));
  }
}
//@ chunk-a76knw89.js:27765-27825 placement
function xe(e, n) {
  return e === "main" || (e === "subagent" && n !== ihi);
}
//@ chunk-a76knw89.js:27825-27860 placement
function PYo(e) {
  return xe(classifyQuerySource(e), e);
}
//@ chunk-a76knw89.js:27860-28085 placement
function isDeferredDefinition(e) {
  let n = new Map();
  for (let o of e)
    if ("defer_loading" in o && o.defer_loading === !0 && "name" in o && typeof o.name === "string")
      if ("cache_control" in o) {
        let { cache_control: cache_control, ...c } = o;
        n.set(o.name, c);
      } else n.set(o.name, o);
  return n;
}
//@ chunk-a76knw89.js:28085-28121 placement
function qS(e, n, o) {
  return findToolByName(e, n, o);
}
//@ chunk-a76knw89.js:28121-28174 placement
var AUTHENTICATE = "authenticate",
  COMPLETE_AUTHENTICATION = "complete_authentication";
//@ chunk-a76knw89.js:28174-28374 placement
function normalizeToolReference(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = e;
  return (
    typeof n.name === "string" &&
    (n.errorCode === void 0 || typeof n.errorCode === "string") &&
    (n.error === void 0 || typeof n.error === "string")
  );
}
//@ chunk-a76knw89.js:28374-28385 placement
var Hn = 200;
//@ chunk-a76knw89.js:28385-28484 placement
function uo(e, n = 64) {
  if (typeof e !== "string") return "";
  return normalizeMcpServerName(normalizeNfkc(e).replace(/['`]/g, " "), n, "none");
}
//@ chunk-a76knw89.js:28484-28600 placement
var regExp = new RegExp(
  `[<>";\\u2018\\u2019\\u201A\\u201C\\u201D\\u201E\\u00AB\\u00BB${[...XDn.keys()].join("")}]`,
  "gu",
);
//@ chunk-a76knw89.js:28600-28638 placement
function Gri(e, n = 1024) {
  return normalizeMcpServerName(e, n);
}
//@ chunk-a76knw89.js:28638-28860 placement
function normalizeMcpServerName(e, n = Hn, o = "all") {
  if (typeof e !== "string") return "";
  let trimmed = sanitizeLogLine(normalizeNfkc(e)).replaceAll(regExp, " ").replaceAll(/\s+/g, " ").trim(),
    max = Math.max(MAX_ERROR_TEXT_CHARS, n + ERROR_TEXT_SLACK_CHARS),
    s = trimmed.length > max,
    u = pVt(s ? truncateToLength(trimmed, max) : trimmed, o);
  return s || u.length > n ? `${truncateToLength(u, n)}\u2026` : u;
}
//@ chunk-a76knw89.js:28860-28871 placement
var an = 500;
/**
 * 清洗错误详情文本：去控制字符、压缩空白、截断到上限。
 */
//@ chunk-a76knw89.js:28871-29000 placement
function sanitizeErrorDetail(e) {
  let trimmed = sanitizeLogLine(e).replaceAll(/\s+/g, " ").trim(),
    o = pVt(
      trimmed.length > MAX_ERROR_TEXT_CHARS ? truncateToLength(trimmed, MAX_ERROR_TEXT_CHARS) : trimmed,
    );
  return o.length > an ? `${truncateToLength(o, an)}\u2026` : o;
}

export {
  normalizeToolReference,
  qS,
  _2,
  sanitizeErrorDetail,
  normalizeMcpServerName,
  bbn,
  uo,
  jW,
  deferredToolNameOf,
  countToolCallsSince_2,
  registerMcpStandardKeys,
  seedDeferredToolReferences,
  PYo,
  logKeptDeferredTools,
  buildDeferredToolsForRequest,
  recordDeferredToolsSent,
  restoreDeferredDefinitions,
  l$e,
  strippedToolReferences,
  keepDepartedDeferredTools,
  stripToolReferencesBeforeCompaction,
  Sbn,
  AUTHENTICATE,
  COMPLETE_AUTHENTICATION,
  Vri,
  keptDeferredToolNames,
  logRetractionFailure,
  Gri,
};
