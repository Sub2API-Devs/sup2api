/**
 * utils/requestReplay.ts
 *
 * 2.1.316 新增。请求重放。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (17)
 * attribution: placement 17
 */
import { setMarkerSnapshotCapturer, ReplayMisalignmentError } from "./transcriptRequestBlobs.js";
import { removeLaptopMemoryText } from "./transcriptWithholding.js";
import { jsonStringify } from "./slowOperations.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getBuiltinPlugin, getBuiltinPlugins } from "../plugins/builtinPlugins.js";
import { CC_PLUGIN_TIPS } from "../services/tips/orgTips.js";
import { isBundledModLive } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";

//@ chunk-czq1j3j2.js:1510225-1510364 placement
var MEMORY_SNAPSHOT_PLACEHOLDER =
  "[Request-replay record: an account-memory snapshot was sent here. It is never saved, so it is not in this record.]";
var MIN_PROBE_LINE_LENGTH = 24;
var MAX_PROBE_LINES = 32;
//@ chunk-czq1j3j2.js:1510364-1510388 placement
/**
 * replayWithoutLaptopMemory：重放时去掉笔记本记忆段。
 */
function replayWithoutLaptopMemory() {
  setMarkerSnapshotCapturer(withoutLaptopMemoryText);
}
//@ chunk-czq1j3j2.js:1510388-1511720 placement
function withoutLaptopMemoryText(
  memorySnapshotLines,
  messages,
  findToolResult = () => {
    return;
  },
) {
  let memorySnapshotLines_2 = memorySnapshotLines
    .filter((line) => line.trim() !== "")
    .sort((a, b) => b.trim().length - a.trim().length);
  if (memorySnapshotLines_2.length === 0) return;
  let removed = removeLaptopMemoryText(memorySnapshotLines_2, messages);
  if (removed.keys === 0)
    throw new ReplayMisalignmentError(
      "request-replay: withoutLaptopMemoryText made no search text for the account-memory snapshots shown; this request is not recorded",
    );
  if (removed.hits === 0) {
    assertMemoryRemoved(memorySnapshotLines_2, messages, MAX_PROBE_LINES, findToolResult);
    return;
  }
  let findMemory = (content) => {
    let removed = removeLaptopMemoryText(memorySnapshotLines_2, [
      {
        role: "user",
        content,
      },
    ]);
    return {
      remains: removed.messages[0]?.content,
      hits: removed.hits,
    };
  };
  let state = {
    placeholders: 0,
  };
  let placeholderIndices = [];
  let aligned = removed.messages.length === messages.length;
  let messages_2 = messages.map((message, index) => {
    if (message.role !== "user") return message;
    let stripped;
    if (aligned) stripped = removed.messages[index].content;
    else {
      let removed = findMemory(message.content);
      if (removed.hits === 0) return message;
      stripped = removed.remains;
    }
    let placeholders = state.placeholders;
    let content = replaceMemoryInContent(message.content, stripped, findMemory, state);
    if (state.placeholders === placeholders) return message;
    placeholderIndices.push(index);
    return {
      ...message,
      content,
    };
  });
  if (removeLaptopMemoryText(memorySnapshotLines_2, messages_2).hits !== 0)
    throw new ReplayMisalignmentError(
      "request-replay: withoutLaptopMemoryText still finds account-memory snapshot text after the cut; this request is not recorded",
    );
  assertMemoryRemoved(memorySnapshotLines_2, messages_2, MAX_PROBE_LINES, findToolResult);
  assertMemoryRemoved(
    memorySnapshotLines_2,
    placeholderIndices.map((index) => messages_2[index]),
    Number.POSITIVE_INFINITY,
    findToolResult,
  );
  if (state.placeholders === 0 || state.placeholders > removed.hits)
    throw new ReplayMisalignmentError(
      "request-replay: the placeholders do not match the cuts withoutLaptopMemoryText reported; this request is not recorded",
    );
  return {
    messages: messages_2,
    cut: {
      kind: "laptop-account-memory",
      cuts: removed.hits,
      placeholders: state.placeholders,
      messages: placeholderIndices,
    },
  };
}
//@ chunk-czq1j3j2.js:1511720-1512356 placement
/**
 * 把请求内容中的账号记忆快照替换为占位说明：字符串直接对齐；数组按块处理，文本块与工具结果内容分别与去除记忆后的版本对齐，没有变化时保持原块。
 */
function replaceMemoryInContent(content, stripped, findMemory, state) {
  if (typeof content === "string")
    return alignStrippedText(content, typeof stripped === "string" ? stripped : "", state);
  let alignedArrays = Array.isArray(stripped) && stripped.length === content.length;
  return content.map((block, index) => {
    let strippedBlock;
    if (alignedArrays) strippedBlock = stripped[index];
    else {
      let memory = findMemory([block]);
      if (memory.hits === 0) return block;
      strippedBlock = firstOrUndefined(memory.remains);
    }
    if (isTextBlock(block)) {
      let alignedText = alignStrippedText(
        block.text,
        strippedBlock !== undefined && isTextBlock(strippedBlock) ? strippedBlock.text : "",
        state,
      );
      if (alignedText === block.text) return block;
      return {
        ...block,
        text: alignedText,
      };
    }
    if (isToolResultBlock(block) && block.content !== undefined) {
      let content =
        strippedBlock !== undefined && isToolResultBlock(strippedBlock) ? strippedBlock.content : undefined;
      if (content === undefined || content === "") {
        let memory = findMemory(block.content);
        if (memory.hits === 0) return block;
        content = memory.remains;
      }
      let placeholders = state.placeholders;
      let content_2 = replaceMemoryInContent(block.content, content, findMemory, state);
      if (state.placeholders === placeholders) return block;
      return {
        ...block,
        content: content_2,
      };
    }
    return block;
  });
}
//@ chunk-czq1j3j2.js:1512356-1512408 placement
function firstOrUndefined(remains) {
  return Array.isArray(remains) ? remains[0] : undefined;
}
//@ chunk-czq1j3j2.js:1512408-1512914 placement
/**
 * 逐段对齐原文与去除记忆后的文本，在被删除处插入占位说明并计数；无法对齐时抛错（该请求不记录）。
 */
function alignStrippedText(original, stripped, state) {
  if (original === stripped) return original;
  let parts = [];
  let originalIndex = 0;
  let strippedIndex = 0;
  while (originalIndex < original.length) {
    let segmentStart = strippedIndex;
    while (
      originalIndex < original.length &&
      strippedIndex < stripped.length &&
      original[originalIndex] === stripped[strippedIndex]
    ) {
      originalIndex++;
      strippedIndex++;
    }
    if (
      strippedIndex > segmentStart &&
      originalIndex < original.length &&
      isHighSurrogate(original.charCodeAt(originalIndex - 1)) &&
      isLowSurrogate(original.charCodeAt(originalIndex))
    ) {
      originalIndex--;
      strippedIndex--;
    }
    parts.push(stripped.slice(segmentStart, strippedIndex));
    if (originalIndex >= original.length) break;
    parts.push(MEMORY_SNAPSHOT_PLACEHOLDER);
    state.placeholders++;
    if (strippedIndex >= stripped.length) break;
    let sliced = stripped.slice(strippedIndex);
    let tailStart = original.length - sliced.length;
    let nextIndex =
      sliced.length < 32 && tailStart > originalIndex && original.endsWith(sliced)
        ? tailStart
        : original.indexOf(sliced.slice(0, 32), originalIndex + 1);
    if (nextIndex === -1) throw misalignedReplayError();
    originalIndex = nextIndex;
  }
  if (strippedIndex < stripped.length) throw misalignedReplayError();
  return parts.join("");
}
//@ chunk-czq1j3j2.js:1512914-1512956 placement
function isHighSurrogate(code) {
  return code >= 55296 && code <= 56319;
}
//@ chunk-czq1j3j2.js:1512956-1512998 placement
function isLowSurrogate(code) {
  return code >= 56320 && code <= 57343;
}
//@ chunk-czq1j3j2.js:1512998-1513149 placement
function misalignedReplayError() {
  return new ReplayMisalignmentError(
    "request-replay: the text withoutLaptopMemoryText left does not line up with the request; this request is not recorded",
  );
}
//@ chunk-czq1j3j2.js:1513149-1513621 placement
/**
 * 确认账号记忆快照的行没有残留在模型轮次之外（除允许的工具结果），否则抛错使该请求不被记录。
 */
function assertMemoryRemoved(memorySnapshotLines, messages, maxProbeLines, findToolResult) {
  let messages_2 = messages.filter((message) => message.role !== "assistant");
  let serialized = messages_2.map((message) => jsonStringify(message));
  for (let snapshot of memorySnapshotLines) {
    let sliced = snapshot
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter((line) => line.length >= MIN_PROBE_LINE_LENGTH)
      .sort((a, b) => b.length - a.length)
      .slice(0, maxProbeLines);
    for (let probeLine of sliced) {
      let escapedLine = jsonStringify(probeLine).slice(1, -1);
      if (
        serialized.some((serializedMessage) => serializedMessage.includes(escapedLine)) &&
        !isOnlyInToolResults(messages_2, serialized, probeLine, escapedLine, findToolResult)
      )
        throw new ReplayMisalignmentError(
          "request-replay: a line of a shown account-memory snapshot is still present outside the model's turns; this request is not recorded",
        );
    }
  }
}
//@ chunk-czq1j3j2.js:1513621-1514213 placement
/**
 * 判断记忆行的出现是否全部来自对应工具结果的原文（数量一致、未被改写），用于放行。
 */
function isOnlyInToolResults(messages, serialized, line, escapedLine, findToolResult) {
  let seenToolUseIds = new Set();
  for (let [index, message] of messages.entries()) {
    let messageCount = countOccurrences(serialized[index], escapedLine);
    if (messageCount === 0) continue;
    if (!Array.isArray(message.content)) return false;
    let countedInMessage = 0;
    for (let block of message.content) {
      let blockCount = countOccurrences(jsonStringify(block), escapedLine);
      if (blockCount === 0) continue;
      if (
        !isToolResultBlock(block) ||
        typeof block.tool_use_id !== "string" ||
        seenToolUseIds.has(block.tool_use_id)
      )
        return false;
      seenToolUseIds.add(block.tool_use_id);
      let serializedContent = jsonStringify(block.content ?? "");
      if (serializedContent.includes(MEMORY_SNAPSHOT_PLACEHOLDER)) return false;
      let toolResult = findToolResult(block.tool_use_id);
      let blockText = plainTextOf(block.content);
      let toolResultText = toolResult && plainTextOf(toolResult.content);
      if (
        toolResult === undefined ||
        blockText === undefined ||
        toolResultText === undefined ||
        blockCount !== countOccurrences(serializedContent, escapedLine) ||
        blockCount > countOccurrences(jsonStringify(toolResult.content ?? ""), escapedLine) ||
        countOccurrences(blockText, line) > countOccurrences(toolResultText, line)
      )
        return false;
      countedInMessage += blockCount;
    }
    if (countedInMessage !== messageCount) return false;
  }
  return true;
}
//@ chunk-czq1j3j2.js:1514213-1514514 placement
/**
 * 取出纯文本内容块的文本（只含 text 块且无其他字段），否则返回 undefined。
 */
function plainTextOf(content) {
  if (content === undefined || typeof content === "string") return content ?? "";
  if (!Array.isArray(content)) return;
  let texts = [];
  for (let block of content) {
    if (typeof block !== "object" || block === null) return;
    let { type, text, cache_control: cacheControl, ...rest } = block;
    if (type !== "text" || typeof text !== "string" || Object.keys(rest).length > 0) return;
    texts.push(text);
  }
  return texts.join(`
`);
}
//@ chunk-czq1j3j2.js:1514514-1514608 placement
function countOccurrences(haystack, needle) {
  let count = 0;
  for (
    let index = haystack.indexOf(needle);
    index !== -1;
    index = haystack.indexOf(needle, index + needle.length)
  )
    count++;
  return count;
}
//@ chunk-czq1j3j2.js:1514608-1514685 placement
function isTextBlock(block) {
  return block.type === "text" && "text" in block && typeof block.text === "string";
}
//@ chunk-czq1j3j2.js:1514685-1514731 placement
function isToolResultBlock(block) {
  return block.type === "tool_result";
}
//@ chunk-czq1j3j2.js:1514731-1514828 placement
/**
 * laptopMemoryTipsPluginEnabled：CC 插件技巧是否可用。
 */
var laptopMemoryTipsPluginEnabled = () =>
  !isRemoteSessionAvailable() &&
  getBuiltinPlugin(CC_PLUGIN_TIPS)?.isAvailable?.() === true &&
  getBuiltinPlugins().enabled.some((plugin) => plugin.name === CC_PLUGIN_TIPS) &&
  isBundledModLive(CC_PLUGIN_TIPS);
//@ chunk-czq1j3j2.js:1514828-1514875 placement
/**
 * ZERO_UUID：全零 UUID。
 */
var ZERO_UUID = "00000000-0000-0000-0000-000000000000";
export { laptopMemoryTipsPluginEnabled, replayWithoutLaptopMemory, ZERO_UUID };
