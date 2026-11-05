/**
 * utils/transcriptWithholding.ts
 *
 * 转录行隐藏（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q93abe8z.js (1), chunk-t3ztrybq.js (15)
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { coworkMemoryTexts, unwrapSystemReminder } from "./messages.js";

//@ chunk-q93abe8z.js:228-262 placement
/**
 * 该宿主是否记录了需扣留的文本。
 */
function hasRecordedTextForHost(host) {
  return hasRecordedText(host) || false;
}
//@ chunk-t3ztrybq.js:542-613 placement
var WITHHELD_SUMMARY_PLACEHOLDER = "[conversation summary withheld: it may include account memory]";
//@ chunk-t3ztrybq.js:613-767 placement
/**
 * 导出转录：去掉账号记忆与不持久化的消息，隐藏压缩摘要。
 */
function withholdForExport(messages, withholdOptions) {
  let filtered = messagesWithoutAccountMemory([...messages]).filter(
    (keptMessage) =>
      !isLaptopMemoryAttachment(keptMessage) &&
      !(keptMessage.type === "system" && "persist" in keptMessage && keptMessage.persist === false),
  );
  let shouldWithhold = shouldWithholdTranscript(messages, withholdOptions);
  return filtered.map((message) =>
    isCompactSummaryLike(message, shouldWithhold) ? withheldPlaceholder(message) : message,
  );
}
//@ chunk-t3ztrybq.js:767-817 placement
function shouldWithholdTranscript(messages, { host }) {
  return hasRecordedTextForHost(host) || messages.some(isLaptopMemoryAttachment);
}
//@ chunk-t3ztrybq.js:817-959 placement
/**
 * 是否为压缩摘要或压缩后钩子内容。
 */
function isCompactSummaryLike(msg, withholdOptions) {
  if (!withholdOptions || msg.type !== "user") return false;
  let message = msg.message;
  return (
    msg.isCompactSummary === true ||
    msg.repeatsCompactSummary === true ||
    isPostCompactHookContent(message?.content)
  );
}
//@ chunk-t3ztrybq.js:959-1263 placement
/**
 * 把消息内容替换为隐藏占位并去掉额外字段。
 */
function withheldPlaceholder(msg) {
  let placeholderText =
    msg.isCompactSummary === true
      ? WITHHELD_SUMMARY_PLACEHOLDER
      : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_SUMMARY_PLACEHOLDER}</${LOCAL_COMMAND_STDOUT}>`;
  let { modelOnlyText, ...restFields } = msg;
  let cleaned = {
    ...restFields,
  };
  for (let field of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
    if (field !== "summarizeMetadata") delete cleaned[field];
  return {
    ...cleaned,
    message: {
      ...msg.message,
      role: msg.message?.role ?? "user",
      content:
        typeof msg.message?.content === "string"
          ? placeholderText
          : [
              {
                type: "text",
                text: placeholderText,
              },
            ],
    },
  };
}
//@ chunk-t3ztrybq.js:1263-2102 placement
function withholdTranscriptLine(jsonl, withholdOptions) {
  if (!shouldWithholdTranscript([], withholdOptions))
    return {
      jsonl,
      hits: 0,
    };
  let hitCount = 0;
  return {
    jsonl: jsonl
      .split(
        `
`,
      )
      .map((line) => {
        let start = 0;
        while (line.charCodeAt(start) === 0 || line.charCodeAt(start) === 65279) start++;
        let strippedLine = start > 0 ? line.slice(start) : line;
        if (strippedLine.trim() === "") return line;
        let any = WITHHOLD_MARKERS.some((marker) => strippedLine.includes(marker));
        let parsed;
        try {
          parsed = jsonParseRaw(strippedLine);
        } catch {
          parsed = undefined;
        }
        if (!isPlainObject(parsed)) {
          hitCount++;
          return jsonStringify({
            type: "line-withheld",
            bytes: Buffer.byteLength(line),
          });
        }
        if (any && parsed.type === API_REQUEST_BLOB) {
          let withheldPreamble = withholdContinuationPreamble(parsed);
          if (withheldPreamble !== undefined) {
            hitCount++;
            return jsonStringify(withheldPreamble);
          }
          return line;
        }
        if (!any || parsed.type !== "user") return line;
        let message = isPlainObject(parsed.message) ? parsed.message : undefined;
        let content = message?.content;
        if (
          parsed.isCompactSummary !== true &&
          parsed.repeatsCompactSummary !== true &&
          !isPostCompactHookContent(content)
        )
          return line;
        hitCount++;
        let placeholderText =
          parsed.isCompactSummary === true
            ? WITHHELD_SUMMARY_PLACEHOLDER
            : `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_SUMMARY_PLACEHOLDER}</${LOCAL_COMMAND_STDOUT}>`;
        let cleaned = {
          ...parsed,
        };
        delete cleaned.modelOnlyText;
        for (let field of [...REMOTE_RESULT_FIELDS, ...CLASSIFIER_CONTEXT_FIELDS])
          if (field !== "summarizeMetadata") delete cleaned[field];
        cleaned.message = {
          role: "user",
          ...message,
          content:
            typeof content === "string"
              ? placeholderText
              : [
                  {
                    type: "text",
                    text: placeholderText,
                  },
                ],
        };
        return jsonStringify(cleaned);
      }).join(`
`),
    hits: hitCount,
  };
}
//@ chunk-t3ztrybq.js:2102-2186 placement
var WITHHOLD_MARKERS = [
  '"isCompactSummary"',
  '"repeatsCompactSummary"',
  POST_COMPACT_HOOK_MARKER,
  COMPACT_CONTINUATION_PREAMBLE,
];
var API_REQUEST_BLOB = "api-request-blob";
//@ chunk-t3ztrybq.js:2186-2533 placement
/**
 * 替换含压缩续接前言的用户消息内容。
 */
function withholdContinuationPreamble(msg) {
  let message = isPlainObject(msg.message) ? msg.message : undefined;
  if (message?.role !== "user") return;
  let { content } = message;
  if (typeof content === "string")
    return content.includes(COMPACT_CONTINUATION_PREAMBLE)
      ? {
          ...msg,
          message: {
            ...message,
            content: WITHHELD_SUMMARY_PLACEHOLDER,
          },
        }
      : undefined;
  if (!Array.isArray(content)) return;
  let replaced = false;
  let content_2 = content.map((block) => {
    if (isTextBlock_2(block) && block.text.includes(COMPACT_CONTINUATION_PREAMBLE)) {
      replaced = true;
      return {
        ...block,
        text: WITHHELD_SUMMARY_PLACEHOLDER,
      };
    }
    return block;
  });
  return replaced
    ? {
        ...msg,
        message: {
          ...message,
          content: content_2,
        },
      }
    : undefined;
}
//@ chunk-t3ztrybq.js:2533-2603 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-t3ztrybq.js:2603-3067 placement
/**
 * 从请求消息中去掉笔记本记忆文本，统计替换次数。
 */
function removeLaptopMemoryText(a, messages, replacedTexts = []) {
  let scrubState = {
    keys: normalizeCaseForComparison_2(
      a
        .filter((memoryText) => memoryText.trim() !== "")
        .flatMap(coworkMemoryTexts)
        .filter((memoryText) => !WITHHELD_SUMMARY_PLACEHOLDER.includes(memoryText)),
    ).sort((firstText, secondText) => secondText.length - firstText.length),
    replaced: normalizeCaseForComparison_2(
      replacedTexts
        .map((replacedText) => replacedText.trim())
        .filter(
          (replacedText) => replacedText !== "" && !WITHHELD_SUMMARY_PLACEHOLDER.includes(replacedText),
        ),
    ).sort((firstText, secondText) => secondText.length - firstText.length),
    hits: 0,
  };
  return {
    messages:
      scrubState.keys.length === 0 && scrubState.replaced.length === 0
        ? messages
        : messages.flatMap((message) => {
            if (message.role !== "user") return [message];
            let scrubbed = scrubContent(message.content, scrubState);
            return scrubbed === undefined
              ? []
              : [
                  {
                    ...message,
                    content: scrubbed,
                  },
                ];
          }),
    keys: scrubState.keys.length + scrubState.replaced.length,
    hits: scrubState.hits,
  };
}
//@ chunk-t3ztrybq.js:3067-3332 placement
/**
 * 去掉内容中的记忆文本（空则删除）。
 */
function scrubContent(text, scrubState) {
  if (typeof text === "string") {
    let scrubbed = scrubText(text, scrubState);
    return isBlankReminder(scrubbed) ? undefined : scrubbed;
  }
  let flattened = text.flatMap((block) => {
    if (isTextBlock(block)) {
      let blockText = scrubText(block.text, scrubState);
      return isBlankReminder(blockText)
        ? []
        : [
            {
              ...block,
              text: blockText,
            },
          ];
    }
    if (isToolResultBlock(block) && block.content !== undefined)
      return [
        {
          ...block,
          content: scrubContent(block.content, scrubState) ?? "",
        },
      ];
    return [block];
  });
  return flattened.length === 0 ? undefined : flattened;
}
//@ chunk-t3ztrybq.js:3332-3407 placement
function isTextBlock(block) {
  return block.type === "text" && "text" in block && typeof block.text === "string";
}
//@ chunk-t3ztrybq.js:3407-3451 placement
function isToolResultBlock(block) {
  return block.type === "tool_result";
}
//@ chunk-t3ztrybq.js:3451-3724 placement
/**
 * 反复删除文本中的记忆片段或替换为占位。
 */
function scrubText(text, scrubState) {
  let current = text;
  for (let j = 0; ; j++) {
    if (j > text.length) return WITHHELD_SUMMARY_PLACEHOLDER;
    let found = scrubState.replaced.find((replacedText) => current.includes(replacedText));
    let found_2 = scrubState.keys.find((key) => current.includes(key));
    let matchedText =
      found !== undefined && (found_2 === undefined || found.length >= found_2.length) ? found : found_2;
    if (matchedText === undefined) return current;
    let parts = current.split(matchedText);
    scrubState.hits += parts.length - 1;
    current = parts.join(matchedText === found ? WITHHELD_SUMMARY_PLACEHOLDER : "");
  }
}
//@ chunk-t3ztrybq.js:3724-3764 placement
function isBlankReminder(text) {
  return unwrapSystemReminder(text).trim() === "";
}
export { withholdForExport, withholdTranscriptLine, hasRecordedTextForHost, removeLaptopMemoryText };
