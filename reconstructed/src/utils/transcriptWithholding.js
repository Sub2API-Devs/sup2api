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
import { isTextBlock as isTextBlock_2 } from "./messages/textLineCount.js";
import { uniq } from "./collections.js";
import { coworkMemoryTexts, unwrapSystemReminder } from "./messages.js";

//@ chunk-z8ysw2qd.js:542-576 placement
/**
 * 该宿主是否记录了需扣留的文本。
 */
function hasRecordedTextForHost(host) {
  return hasRecordedText(host) || false;
}
//@ chunk-z8ysw2qd.js:576-647 placement
var WITHHELD_SUMMARY_PLACEHOLDER = "[conversation summary withheld: it may include account memory]";
//@ chunk-z8ysw2qd.js:647-800 placement
/**
 * 导出转录：去掉账号记忆与不持久化的消息，隐藏压缩摘要。
 */
function withholdForExport(e, o) {
  let filtered = messagesWithoutAccountMemory([...e]).filter(
    (n) => !isLaptopMemoryAttachment(n) && !(n.type === "system" && "persist" in n && n.persist === false),
  );
  let r = shouldWithholdTranscript(e, o);
  return filtered.map((n) => (isCompactSummaryLike(n, r) ? withheldPlaceholder(n) : n));
}
//@ chunk-z8ysw2qd.js:800-850 placement
function shouldWithholdTranscript(e, { host }) {
  return hasRecordedTextForHost(host) || e.some(isLaptopMemoryAttachment);
}
//@ chunk-z8ysw2qd.js:850-992 placement
/**
 * 是否为压缩摘要或压缩后钩子内容。
 */
function isCompactSummaryLike(e, o) {
  if (!o || e.type !== "user") return false;
  let message = e.message;
  return (
    e.isCompactSummary === true ||
    e.repeatsCompactSummary === true ||
    isPostCompactHookContent(message?.content)
  );
}
//@ chunk-z8ysw2qd.js:992-1296 placement
/**
 * 把消息内容替换为隐藏占位并去掉额外字段。
 */
function withheldPlaceholder(e) {
  let o =
    e.isCompactSummary === true
      ? WITHHELD_SUMMARY_PLACEHOLDER
      : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_SUMMARY_PLACEHOLDER}</${LOCAL_COMMAND_STDOUT}>`;
  let { modelOnlyText, ...r } = e;
  let n = {
    ...r,
  };
  for (let t of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
    if (t !== "summarizeMetadata") delete n[t];
  return {
    ...n,
    message: {
      ...e.message,
      role: e.message?.role ?? "user",
      content:
        typeof e.message?.content === "string"
          ? o
          : [
              {
                type: "text",
                text: o,
              },
            ],
    },
  };
}
//@ chunk-z8ysw2qd.js:1296-2135 placement
function withholdTranscriptLine(e, o) {
  if (!shouldWithholdTranscript([], o))
    return {
      jsonl: e,
      hits: 0,
    };
  let s = 0;
  return {
    jsonl: e
      .split(
        `
`,
      )
      .map((line) => {
        let t = 0;
        while (line.charCodeAt(t) === 0 || line.charCodeAt(t) === 65279) t++;
        let u = t > 0 ? line.slice(t) : line;
        if (u.trim() === "") return line;
        let any = WITHHOLD_MARKERS.some((c) => u.includes(c));
        let i;
        try {
          i = jsonParseRaw(u);
        } catch {
          i = undefined;
        }
        if (!isPlainObject(i)) {
          s++;
          return jsonStringify({
            type: "line-withheld",
            bytes: Buffer.byteLength(line),
          });
        }
        if (any && i.type === API_REQUEST_BLOB) {
          let c = withholdContinuationPreamble(i);
          if (c !== undefined) {
            s++;
            return jsonStringify(c);
          }
          return line;
        }
        if (!any || i.type !== "user") return line;
        let message = isPlainObject(i.message) ? i.message : undefined;
        let content = message?.content;
        if (
          i.isCompactSummary !== true &&
          i.repeatsCompactSummary !== true &&
          !isPostCompactHookContent(content)
        )
          return line;
        s++;
        let d =
          i.isCompactSummary === true
            ? WITHHELD_SUMMARY_PLACEHOLDER
            : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_SUMMARY_PLACEHOLDER}</${LOCAL_COMMAND_STDOUT}>`;
        let p = {
          ...i,
        };
        delete p.modelOnlyText;
        for (let c of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
          if (c !== "summarizeMetadata") delete p[c];
        p.message = {
          role: "user",
          ...message,
          content:
            typeof content === "string"
              ? d
              : [
                  {
                    type: "text",
                    text: d,
                  },
                ],
        };
        return jsonStringify(p);
      }).join(`
`),
    hits: s,
  };
}
//@ chunk-z8ysw2qd.js:2135-2219 placement
var WITHHOLD_MARKERS = [
  '"isCompactSummary"',
  '"repeatsCompactSummary"',
  POST_COMPACT_HOOK_MARKER,
  COMPACT_CONTINUATION_PREAMBLE,
];
var API_REQUEST_BLOB = "api-request-blob";
//@ chunk-z8ysw2qd.js:2219-2566 placement
/**
 * 替换含压缩续接前言的用户消息内容。
 */
function withholdContinuationPreamble(e) {
  let message = isPlainObject(e.message) ? e.message : undefined;
  if (message?.role !== "user") return;
  let { content } = message;
  if (typeof content === "string")
    return content.includes(COMPACT_CONTINUATION_PREAMBLE)
      ? {
          ...e,
          message: {
            ...message,
            content: WITHHELD_SUMMARY_PLACEHOLDER,
          },
        }
      : undefined;
  if (!Array.isArray(content)) return;
  let r = false;
  let content_2 = content.map((t) => {
    if (isTextBlock_2(t) && t.text.includes(COMPACT_CONTINUATION_PREAMBLE)) {
      r = true;
      return {
        ...t,
        text: WITHHELD_SUMMARY_PLACEHOLDER,
      };
    }
    return t;
  });
  return r
    ? {
        ...e,
        message: {
          ...message,
          content: content_2,
        },
      }
    : undefined;
}
//@ chunk-z8ysw2qd.js:2566-2636 placement
function isPlainObject(message) {
  return typeof message === "object" && message !== null && !Array.isArray(message);
}
//@ chunk-z8ysw2qd.js:2636-3100 placement
/**
 * 从请求消息中去掉笔记本记忆文本，统计替换次数。
 */
function removeLaptopMemoryText(e, o, s = []) {
  let r = {
    keys: uniq(
      e
        .filter((t) => t.trim() !== "")
        .flatMap(coworkMemoryTexts)
        .filter((t) => !WITHHELD_SUMMARY_PLACEHOLDER.includes(t)),
    ).sort((t, u) => u.length - t.length),
    replaced: uniq(
      s.map((t) => t.trim()).filter((t) => t !== "" && !WITHHELD_SUMMARY_PLACEHOLDER.includes(t)),
    ).sort((t, u) => u.length - t.length),
    hits: 0,
  };
  return {
    messages:
      r.keys.length === 0 && r.replaced.length === 0
        ? o
        : o.flatMap((t) => {
            if (t.role !== "user") return [t];
            let u = scrubContent(t.content, r);
            return u === undefined
              ? []
              : [
                  {
                    ...t,
                    content: u,
                  },
                ];
          }),
    keys: r.keys.length + r.replaced.length,
    hits: r.hits,
  };
}
//@ chunk-z8ysw2qd.js:3100-3365 placement
/**
 * 去掉内容中的记忆文本（空则删除）。
 */
function scrubContent(content, o) {
  if (typeof content === "string") {
    let r = scrubText(content, o);
    return isBlankReminder(r) ? undefined : r;
  }
  let flattened = content.flatMap((r) => {
    if (isTextBlock(r)) {
      let n = scrubText(r.text, o);
      return isBlankReminder(n)
        ? []
        : [
            {
              ...r,
              text: n,
            },
          ];
    }
    if (isToolResultBlock(r) && r.content !== undefined)
      return [
        {
          ...r,
          content: scrubContent(r.content, o) ?? "",
        },
      ];
    return [r];
  });
  return flattened.length === 0 ? undefined : flattened;
}
//@ chunk-z8ysw2qd.js:3365-3440 placement
function isTextBlock(e) {
  return e.type === "text" && "text" in e && typeof e.text === "string";
}
//@ chunk-z8ysw2qd.js:3440-3484 placement
function isToolResultBlock(e) {
  return e.type === "tool_result";
}
//@ chunk-z8ysw2qd.js:3484-3757 placement
/**
 * 反复删除文本中的记忆片段或替换为占位。
 */
function scrubText(e, o) {
  let s = e;
  for (let j = 0; ; j++) {
    if (j > e.length) return WITHHELD_SUMMARY_PLACEHOLDER;
    let found = o.replaced.find((i) => s.includes(i));
    let found_2 = o.keys.find((key) => s.includes(key));
    let u =
      found !== undefined && (found_2 === undefined || found.length >= found_2.length) ? found : found_2;
    if (u === undefined) return s;
    let parts = s.split(u);
    o.hits += parts.length - 1;
    s = parts.join(u === found ? WITHHELD_SUMMARY_PLACEHOLDER : "");
  }
}
//@ chunk-z8ysw2qd.js:3757-3797 placement
function isBlankReminder(e) {
  return unwrapSystemReminder(e).trim() === "";
}
export { withholdForExport, withholdTranscriptLine, removeLaptopMemoryText, hasRecordedTextForHost };
