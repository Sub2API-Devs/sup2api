/**
 * utils/transcriptWithholding.ts
 *
 * 转录行隐藏（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z8ysw2qd.js (16)
 * attribution: placement 16
 */
import { hasRecordedText } from "./telemetry/thirdPartyEventRecords.js";
import { messagesWithoutAccountMemory } from "./messages/accountMemory.js";
import { isLaptopMemoryAttachment } from "./transcript/entryTypes.js";
import {
  isPostCompactHookContent,
  POST_COMPACT_HOOK_MARKER,
  COMPACT_CONTINUATION_PREAMBLE,
} from "../services/compact/prompt.js";
import { LOCAL_COMMAND_STDOUT } from "../constants/xml.js";
import {
  REMOTE_RESULT_FIELDS,
  CLASSIFIER_CONTEXT_FIELDS,
} from "../services/remoteTools/classifierContext.js";
import { jsonParseRaw, jsonStringify } from "./slowOperations.js";
import { isTextBlock } from "./messages/textLineCount.js";
import { uniq } from "./collections.js";
import { coworkMemoryTexts, unwrapSystemReminder } from "./messages.js";

//@ chunk-z8ysw2qd.js:542-576 placement
function qHt(e) {
  return hasRecordedText(e) || !1;
}
//@ chunk-z8ysw2qd.js:576-647 placement
var a = "[conversation summary withheld: it may include account memory]";
/**
 * 导出转录：去掉账号记忆与不持久化的消息，隐藏压缩摘要。
 */
//@ chunk-z8ysw2qd.js:647-800 placement
function withholdForExport(e, o) {
  let filtered = messagesWithoutAccountMemory([...e]).filter(
      (n) => !isLaptopMemoryAttachment(n) && !(n.type === "system" && "persist" in n && n.persist === !1),
    ),
    r = h(e, o);
  return filtered.map((n) => (isCompactSummaryLike(n, r) ? withheldPlaceholder(n) : n));
}
//@ chunk-z8ysw2qd.js:800-850 placement
function h(e, { host: host }) {
  return qHt(host) || e.some(isLaptopMemoryAttachment);
}
/**
 * 是否为压缩摘要或压缩后钩子内容。
 */
//@ chunk-z8ysw2qd.js:850-992 placement
function isCompactSummaryLike(e, o) {
  if (!o || e.type !== "user") return !1;
  let message = e.message;
  return (
    e.isCompactSummary === !0 || e.repeatsCompactSummary === !0 || isPostCompactHookContent(message?.content)
  );
}
/**
 * 把消息内容替换为隐藏占位并去掉额外字段。
 */
//@ chunk-z8ysw2qd.js:992-1296 placement
function withheldPlaceholder(e) {
  let o = e.isCompactSummary === !0 ? a : `<${LOCAL_COMMAND_STDOUT}>${a}</${LOCAL_COMMAND_STDOUT}>`,
    { modelOnlyText: modelOnlyText, ...r } = e,
    n = { ...r };
  for (let t of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
    if (t !== "summarizeMetadata") delete n[t];
  return {
    ...n,
    message: {
      ...e.message,
      role: e.message?.role ?? "user",
      content: typeof e.message?.content === "string" ? o : [{ type: "text", text: o }],
    },
  };
}
//@ chunk-z8ysw2qd.js:1296-2135 placement
function withholdTranscriptLine(e, o) {
  if (!h([], o)) return { jsonl: e, hits: 0 };
  let s = 0;
  return {
    jsonl: e
      .split(
        `
`,
      )
      .map((n) => {
        let t = 0;
        while (n.charCodeAt(t) === 0 || n.charCodeAt(t) === 65279) t++;
        let u = t > 0 ? n.slice(t) : n;
        if (u.trim() === "") return n;
        let any = S.some((c) => u.includes(c)),
          i;
        try {
          i = jsonParseRaw(u);
        } catch {
          i = void 0;
        }
        if (!y(i)) return (s++, jsonStringify({ type: "line-withheld", bytes: Buffer.byteLength(n) }));
        if (any && i.type === API_REQUEST_BLOB) {
          let c = withholdContinuationPreamble(i);
          if (c !== void 0) return (s++, jsonStringify(c));
          return n;
        }
        if (!any || i.type !== "user") return n;
        let l = y(i.message) ? i.message : void 0,
          f = l?.content;
        if (i.isCompactSummary !== !0 && i.repeatsCompactSummary !== !0 && !isPostCompactHookContent(f))
          return n;
        s++;
        let d = i.isCompactSummary === !0 ? a : `<${LOCAL_COMMAND_STDOUT}>${a}</${LOCAL_COMMAND_STDOUT}>`,
          p = { ...i };
        delete p.modelOnlyText;
        for (let c of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
          if (c !== "summarizeMetadata") delete p[c];
        return (
          (p.message = {
            role: "user",
            ...l,
            content: typeof f === "string" ? d : [{ type: "text", text: d }],
          }),
          jsonStringify(p)
        );
      }).join(`
`),
    hits: s,
  };
}
//@ chunk-z8ysw2qd.js:2135-2219 placement
var S = [
    '"isCompactSummary"',
    '"repeatsCompactSummary"',
    POST_COMPACT_HOOK_MARKER,
    COMPACT_CONTINUATION_PREAMBLE,
  ],
  API_REQUEST_BLOB = "api-request-blob";
/**
 * 替换含压缩续接前言的用户消息内容。
 */
//@ chunk-z8ysw2qd.js:2219-2566 placement
function withholdContinuationPreamble(e) {
  let o = y(e.message) ? e.message : void 0;
  if (o?.role !== "user") return;
  let { content: content } = o;
  if (typeof content === "string")
    return content.includes(COMPACT_CONTINUATION_PREAMBLE) ? { ...e, message: { ...o, content: a } } : void 0;
  if (!Array.isArray(content)) return;
  let r = !1,
    mapped = content.map((t) => {
      if (isTextBlock(t) && t.text.includes(COMPACT_CONTINUATION_PREAMBLE))
        return ((r = !0), { ...t, text: a });
      return t;
    });
  return r ? { ...e, message: { ...o, content: mapped } } : void 0;
}
//@ chunk-z8ysw2qd.js:2566-2636 placement
function y(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
/**
 * 从请求消息中去掉笔记本记忆文本，统计替换次数。
 */
//@ chunk-z8ysw2qd.js:2636-3100 placement
function removeLaptopMemoryText(e, o, s = []) {
  let r = {
    keys: uniq(
      e
        .filter((t) => t.trim() !== "")
        .flatMap(coworkMemoryTexts)
        .filter((t) => !a.includes(t)),
    ).sort((t, u) => u.length - t.length),
    replaced: uniq(s.map((t) => t.trim()).filter((t) => t !== "" && !a.includes(t))).sort(
      (t, u) => u.length - t.length,
    ),
    hits: 0,
  };
  return {
    messages:
      r.keys.length === 0 && r.replaced.length === 0
        ? o
        : o.flatMap((t) => {
            if (t.role !== "user") return [t];
            let u = scrubContent(t.content, r);
            return u === void 0 ? [] : [{ ...t, content: u }];
          }),
    keys: r.keys.length + r.replaced.length,
    hits: r.hits,
  };
}
/**
 * 去掉内容中的记忆文本（空则删除）。
 */
//@ chunk-z8ysw2qd.js:3100-3365 placement
function scrubContent(e, o) {
  if (typeof e === "string") {
    let r = scrubText(e, o);
    return M(r) ? void 0 : r;
  }
  let flattened = e.flatMap((r) => {
    if (k(r)) {
      let n = scrubText(r.text, o);
      return M(n) ? [] : [{ ...r, text: n }];
    }
    if (w(r) && r.content !== void 0) return [{ ...r, content: scrubContent(r.content, o) ?? "" }];
    return [r];
  });
  return flattened.length === 0 ? void 0 : flattened;
}
//@ chunk-z8ysw2qd.js:3365-3440 placement
function k(e) {
  return e.type === "text" && "text" in e && typeof e.text === "string";
}
//@ chunk-z8ysw2qd.js:3440-3484 placement
function w(e) {
  return e.type === "tool_result";
}
/**
 * 反复删除文本中的记忆片段或替换为占位。
 */
//@ chunk-z8ysw2qd.js:3484-3757 placement
function scrubText(e, o) {
  let s = e;
  for (let r = 0; ; r++) {
    if (r > e.length) return a;
    let found = o.replaced.find((i) => s.includes(i)),
      found_2 = o.keys.find((key) => s.includes(key)),
      u = found !== void 0 && (found_2 === void 0 || found.length >= found_2.length) ? found : found_2;
    if (u === void 0) return s;
    let parts = s.split(u);
    ((o.hits += parts.length - 1), (s = parts.join(u === found ? a : "")));
  }
}
//@ chunk-z8ysw2qd.js:3757-3797 placement
function M(e) {
  return unwrapSystemReminder(e).trim() === "";
}

export { withholdForExport, withholdTranscriptLine, removeLaptopMemoryText, qHt };
