/**
 * services/tools/batchTools.ts
 *
 * 2.1.316 新增：batch_tools 批量工具调用的拆分与结果重组
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a76knw89.js (14)
 * attribution: placement 14
 */
import { findToolByName } from "../../Tool.js";
import { isMultiEntryAliasTool } from "./permissionCheckGuard.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { Ce, toolCategoryForTelemetry, FYr, Tqe, An, $e } from "../api/toolDefinitionShape.js";
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { languageErrorNameOf } from "../../utils/errors.js";
import { getRootSession } from "../../bootstrap/state.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

/**
 * 把一次 batch_tools 调用拆成多个 tool_use（解析失败时记录）。
 */
//@ chunk-a76knw89.js:11390-12492 placement
function expandBatchToolsCall(e, n, o) {
  let r = findToolByName(n, e.name);
  if (r === void 0 || !isMultiEntryAliasTool(r)) return null;
  let c = (s) => (
    logFeatureSad("batch_tools", s, { tool_name: sanitizeToolNameForAnalytics(r.name), isMcp: !1 }),
    [
      {
        type: "tool_use",
        id: Ce(e.id, 0),
        name: r.name,
        input: e.input,
        ...(e.caller !== void 0 && { caller: e.caller }),
      },
    ]
  );
  try {
    let safeParse = r.inputSchema.safeParse(e.input);
    if (!safeParse.success) return { synthetics: c("parse_failed"), decomposed: !1 };
    let { v1Tool: v1Tool, entries: entries } = r.perEntryHookInputs(safeParse.data);
    if (entries.length === 0) return { synthetics: c("zero_entries"), decomposed: !1 };
    return {
      decomposed: !0,
      synthetics: entries.map((h, T) => {
        let y = h;
        try {
          y = o(v1Tool, h);
        } catch (error) {
          if (error instanceof Error && error.name === "ZodError") {
            let k = error instanceof kR ? uniq(error.issues.map((issue) => issue.code)).join(",") : "unknown";
            logForDebugging(
              `Normalizing a batch entry's input for tool=${toolCategoryForTelemetry(v1Tool)} was rejected: issues ${k}; the error text (${error.message.length} characters) is not logged`,
              { level: "error" },
            );
          } else
            logError(
              Error(
                `Normalizing a batch entry's input for tool=${FYr(v1Tool)} failed: ${languageErrorNameOf(error)} was thrown; its text is not logged`,
              ),
            );
        }
        return {
          type: "tool_use",
          id: Ce(e.id, T),
          name: v1Tool.name,
          input: y,
          ...(e.caller !== void 0 && { caller: e.caller }),
        };
      }),
    };
  } catch {
    return { synthetics: c("per_entry_threw"), decomposed: !1 };
  }
}
/**
 * 有多入口别名工具时，从工具列表中去掉其底层 v1 工具。
 */
//@ chunk-a76knw89.js:12492-12640 placement
function hideAliasedV1Tools(e) {
  let n;
  for (let o of e) if (isMultiEntryAliasTool(o)) ((n ??= new Set()), n.add(o.underlyingV1ToolName));
  if (n === void 0) return e;
  return e.filter((o) => !n.has(o.name));
}
//@ chunk-a76knw89.js:12640-12976 placement
function isBatchToolsUse(e, n, o) {
  let r,
    c = [];
  for (let s = 0; s < e.length; s++) {
    let u = e[s];
    if (u.type !== "tool_use") {
      r?.push(u);
      continue;
    }
    let p = expandBatchToolsCall(u, n, o);
    if (p === null) {
      r?.push(u);
      continue;
    }
    if (((r ??= e.slice(0, s)), r.push(...p.synthetics), p.decomposed))
      (c.push({ id: u.id, name: u.name }),
        logFeatureOk("batch_tools", { tool_name: sanitizeToolNameForAnalytics(u.name), isMcp: !1 }));
  }
  return { content: r ?? e, batchToolUses: c };
}
/**
 * 把拆开调用的结果按原 batch 重新组合成一个 tool_result。
 */
//@ chunk-a76knw89.js:12976-13680 placement
function reassembleBatchResults(e, n, o) {
  if (n === void 0 || n.length === 0) return e;
  let r = new Map();
  for (let p of n) if (!r.has(p.id)) r.set(p.id, p);
  let c = new Map();
  for (let p of r.values()) {
    let h = findToolByName(o, p.name);
    if (h === void 0 || !isMultiEntryAliasTool(h)) continue;
    let T = [],
      y;
    for (let b of e) if (b.type === "tool_use" && Tqe(b.id) === p.id) ((y ??= b), T.push(b.input));
    try {
      c.set(p.id, {
        type: "tool_use",
        id: p.id,
        name: p.name,
        input: h.reassemble(T),
        ...(y?.caller !== void 0 && { caller: y.caller }),
      });
    } catch {
      let of = An.of(getRootSession().host);
      if (!of.has(p.id))
        (of.add(p.id),
          logFeatureSad("batch_tools", "reassemble_threw", {
            tool_name: sanitizeToolNameForAnalytics(p.name),
            isMcp: !1,
          }));
    }
  }
  let s = new Set(),
    u = [];
  for (let p of e) {
    if (p.type === "tool_use") {
      let h = Tqe(p.id);
      if (h !== void 0 && c.has(h)) {
        if (!s.has(h)) (s.add(h), u.push(c.get(h)));
        continue;
      }
    }
    u.push(p);
  }
  return u;
}
//@ chunk-a76knw89.js:13680-14996 placement = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let o = !1;
  for (let u of messages) {
    if (u.type === "assistant") {
      for (let p of u.message.content)
        if (p.type === "tool_use") {
          let h = findToolByName(sinceUuid, p.name);
          if (h !== void 0 && isMultiEntryAliasTool(h)) o = !0;
        }
    }
    if (u.type === "user" && !o) {
      if (
        Array.isArray(u.message.content) &&
        u.message.content.some((p) => p.type === "tool_result" && Tqe(p.tool_use_id) !== void 0)
      )
        o = !0;
    }
  }
  if (!o) return messages;
  let r = new Map();
  for (let u of messages) {
    if (u.type !== "assistant") continue;
    for (let p of u.message.content) if (p.type === "tool_use") r.set(p.id, p);
  }
  let c = new Map();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let p of message.message.content) {
      if (p.type !== "tool_result") continue;
      let h = Tqe(p.tool_use_id);
      if (h === void 0 || !r.has(h)) continue;
      let T = c.get(h);
      if (T === void 0) ((T = new Map()), c.set(h, T));
      if (!T.has(p.tool_use_id)) T.set(p.tool_use_id, p);
    }
  }
  if (c.size === 0) return messages;
  let s = new Set();
  return messages.flatMap((block) => {
    if (block.type !== "user" || !Array.isArray(block.message.content)) return [block];
    let p = !1,
      h = [];
    for (let T of block.message.content) {
      if (T.type !== "tool_result") {
        h.push(T);
        continue;
      }
      let y = Tqe(T.tool_use_id),
        b = y !== void 0 ? c.get(y) : void 0;
      if (y === void 0 || b === void 0) {
        h.push(T);
        continue;
      }
      if (((p = !0), s.has(y))) continue;
      s.add(y);
      let k = r.get(y),
        S = findToolByName(sinceUuid, k.name),
        x = S !== void 0 && isMultiEntryAliasTool(S) ? S : void 0;
      h.push(formatBatchResultEntries(x, y, NO_RESULT_TEXT(x, k.input, y, b)));
    }
    if (!p) return [block];
    if (h.length === 0) return [];
    return [{ ...block, message: { ...block.message, content: h } }];
  });
}
//@ chunk-a76knw89.js:14996-15391 placement
function NO_RESULT_TEXT(e, n, o, r) {
  let c;
  if (e !== void 0)
    try {
      let safeParse = e.inputSchema.safeParse(n);
      if (safeParse.success) c = e.perEntryHookInputs(safeParse.data).entries;
    } catch {}
  let s = c?.length ?? 0;
  for (let u of r.keys()) {
    let match = $e.exec(u);
    if (match) s = Math.max(s, Number(match[1]) + 1);
  }
  if (s > 1000) s = c?.length ?? r.size;
  return Array.from({ length: s }, (u, p) => {
    let h = r.get(Ce(o, p));
    return h !== void 0 ? { input: c?.[p], result: h } : { input: c?.[p], error: "no result" };
  });
}
//@ chunk-a76knw89.js:15391-16297 placement
function formatBatchResultEntries(e, n, o) {
  let r = [],
    c = "",
    s = !1,
    u = (h) => {
      if (h.length > 0)
        c =
          c === ""
            ? h
            : `${c}
${h}`;
    },
    p = () => {
      if (c !== "") (r.push({ type: "text", text: c }), (c = ""));
    };
  for (let [h, T] of o.entries()) {
    let y = T.result === void 0 || T.result.is_error === !0;
    if (y) s = !0;
    if ((u(`--- entry ${h + 1}${y ? " (error)" : ""} ---`), T.result !== void 0)) {
      let content = T.result.content;
      if (typeof content === "string") u(content);
      else if (Array.isArray(content))
        for (let k of content)
          if (k.type === "text") u(k.text);
          else (p(), r.push(k));
    } else u(`[entry ${h + 1} error: ${T.error ?? "no result"}]`);
  }
  if (o.length === 1 && e !== void 0)
    u(
      `<system-reminder>Tip: ${e.name} accepts multiple entries in one call (\`${e.entryFieldName}: [{...}, {...}]\`). Batching related operations into a single call is faster than issuing them as separate or parallel calls. No action needed for this result.</system-reminder>`,
    );
  return (
    p(),
    {
      type: "tool_result",
      tool_use_id: n,
      content: r.length === 1 && r[0]?.type === "text" ? r[0].text : r,
      ...(s && { is_error: !0 }),
    }
  );
}
//@ chunk-a76knw89.js:16297-16312 placement
var He = new Map();
//@ chunk-a76knw89.js:16312-16345 placement
function i$e(e) {
  return He.get(e);
}
//@ chunk-a76knw89.js:16345-16430 placement
function pnr(e) {
  return e
    .map(i$e)
    .filter((n) => n !== void 0)
    .filter((n) => n.isEnabled());
}
//@ chunk-a76knw89.js:16430-16504 placement
function Bri(e, n) {
  return n.find((o) => o.underlyingV1ToolName === e)?.name ?? e;
}
//@ chunk-a76knw89.js:16504-16568 placement
function Aqe(e) {
  for (let [n, o] of He) if (o.name === e) return n;
  return;
}
//@ chunk-a76knw89.js:16568-16634 placement
var TENGU_MARLIN_THICKET = "tengu_marlin_thicket",
  IDE = "ide",
  Ln = new SessionRootSlot(() => ({ read: !1 }));
//@ chunk-a76knw89.js:16634-16692 placement
function Ye(e, n) {
  return e && Object.hasOwn(e, n) ? e[n] : void 0;
}

export {
  reassembleBatchResults,
  countToolCallsSince,
  isBatchToolsUse,
  i$e,
  Aqe,
  hideAliasedV1Tools,
  pnr,
  Ye,
  Ln,
  TENGU_MARLIN_THICKET,
  IDE,
  Bri,
};
