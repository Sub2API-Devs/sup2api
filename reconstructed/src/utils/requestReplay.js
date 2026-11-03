/**
 * utils/requestReplay.ts
 *
 * 2.1.316 新增。请求重放。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (17)
 * attribution: placement 17
 */
import { setMarkerSnapshotCapturer, ReplayMisalignmentError } from "./transcriptRequestBlobs.js";
import { removeLaptopMemoryText } from "./transcriptWithholding.js";
import { jsonStringify } from "./slowOperations.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getBuiltinPlugin, getBuiltinPlugins } from "../plugins/builtinPlugins.js";
import { CC_PLUGIN_TIPS } from "../services/tips/orgTips.js";
import { isBundledModLive } from "../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";

//@ chunk-18hwfzwa.js:1468823-1468962 placement
var MEMORY_SNAPSHOT_PLACEHOLDER =
  "[Request-replay record: an account-memory snapshot was sent here. It is never saved, so it is not in this record.]";
var MIN_PROBE_LINE_LENGTH = 24;
var MAX_PROBE_LINES = 32;
//@ chunk-18hwfzwa.js:1468962-1468986 placement
/**
 * replayWithoutLaptopMemory：重放时去掉笔记本记忆段。
 */
function replayWithoutLaptopMemory() {
  setMarkerSnapshotCapturer(withoutLaptopMemoryText);
}
//@ chunk-18hwfzwa.js:1468986-1470318 placement
function withoutLaptopMemoryText(
  h,
  x,
  D = () => {
    return;
  },
) {
  let sorted = h.filter((ze) => ze.trim() !== "").sort((ze, Xe) => Xe.trim().length - ze.trim().length);
  if (sorted.length === 0) return;
  let ee = removeLaptopMemoryText(sorted, x);
  if (ee.keys === 0)
    throw new ReplayMisalignmentError(
      "request-replay: withoutLaptopMemoryText made no search text for the account-memory snapshots shown; this request is not recorded",
    );
  if (ee.hits === 0) {
    assertMemoryRemoved(sorted, x, MAX_PROBE_LINES, D);
    return;
  }
  let findMemory = (content) => {
    let Xe = removeLaptopMemoryText(sorted, [
      {
        role: "user",
        content,
      },
    ]);
    return {
      remains: Xe.messages[0]?.content,
      hits: Xe.hits,
    };
  };
  let state = {
    placeholders: 0,
  };
  let Be = [];
  let He = ee.messages.length === x.length;
  let mapped = x.map((ze, Xe) => {
    if (ze.role !== "user") return ze;
    let stripped;
    if (He) stripped = ee.messages[Xe].content;
    else {
      let It = findMemory(ze.content);
      if (It.hits === 0) return ze;
      stripped = It.remains;
    }
    let placeholders = state.placeholders;
    let content = replaceMemoryInContent(ze.content, stripped, findMemory, state);
    if (state.placeholders === placeholders) return ze;
    Be.push(Xe);
    return {
      ...ze,
      content,
    };
  });
  if (removeLaptopMemoryText(sorted, mapped).hits !== 0)
    throw new ReplayMisalignmentError(
      "request-replay: withoutLaptopMemoryText still finds account-memory snapshot text after the cut; this request is not recorded",
    );
  assertMemoryRemoved(sorted, mapped, MAX_PROBE_LINES, D);
  assertMemoryRemoved(
    sorted,
    Be.map((ze) => mapped[ze]),
    Number.POSITIVE_INFINITY,
    D,
  );
  if (state.placeholders === 0 || state.placeholders > ee.hits)
    throw new ReplayMisalignmentError(
      "request-replay: the placeholders do not match the cuts withoutLaptopMemoryText reported; this request is not recorded",
    );
  return {
    messages: mapped,
    cut: {
      kind: "laptop-account-memory",
      cuts: ee.hits,
      placeholders: state.placeholders,
      messages: Be,
    },
  };
}
//@ chunk-18hwfzwa.js:1470318-1470954 placement
/**
 * 把请求内容中的账号记忆快照替换为占位说明：字符串直接对齐；数组按块处理，文本块与工具结果内容分别与去除记忆后的版本对齐，没有变化时保持原块。
 */
function replaceMemoryInContent(content, stripped, findMemory, state) {
  if (typeof content === "string")
    return alignStrippedText(content, typeof stripped === "string" ? stripped : "", state);
  let alignedArrays = Array.isArray(stripped) && stripped.length === content.length;
  return content.map((ke, Re) => {
    let Be;
    if (alignedArrays) Be = stripped[Re];
    else {
      let memory = findMemory([ke]);
      if (memory.hits === 0) return ke;
      Be = firstOrUndefined(memory.remains);
    }
    if (isTextBlock(ke)) {
      let He = alignStrippedText(ke.text, Be !== undefined && isTextBlock(Be) ? Be.text : "", state);
      if (He === ke.text) return ke;
      return {
        ...ke,
        text: He,
      };
    }
    if (isToolResultBlock(ke) && ke.content !== undefined) {
      let content = Be !== undefined && isToolResultBlock(Be) ? Be.content : undefined;
      if (content === undefined || content === "") {
        let memory = findMemory(ke.content);
        if (memory.hits === 0) return ke;
        content = memory.remains;
      }
      let placeholders = state.placeholders;
      let content_2 = replaceMemoryInContent(ke.content, content, findMemory, state);
      if (state.placeholders === placeholders) return ke;
      return {
        ...ke,
        content: content_2,
      };
    }
    return ke;
  });
}
//@ chunk-18hwfzwa.js:1470954-1471006 placement
function firstOrUndefined(remains) {
  return Array.isArray(remains) ? remains[0] : undefined;
}
//@ chunk-18hwfzwa.js:1471006-1471512 placement
/**
 * 逐段对齐原文与去除记忆后的文本，在被删除处插入占位说明并计数；无法对齐时抛错（该请求不记录）。
 */
function alignStrippedText(original, stripped, state) {
  if (original === stripped) return original;
  let parts = [];
  let originalIndex = 0;
  let strippedIndex = 0;
  while (originalIndex < original.length) {
    let Re = strippedIndex;
    while (
      originalIndex < original.length &&
      strippedIndex < stripped.length &&
      original[originalIndex] === stripped[strippedIndex]
    ) {
      originalIndex++;
      strippedIndex++;
    }
    if (
      strippedIndex > Re &&
      originalIndex < original.length &&
      isHighSurrogate(original.charCodeAt(originalIndex - 1)) &&
      isLowSurrogate(original.charCodeAt(originalIndex))
    ) {
      originalIndex--;
      strippedIndex--;
    }
    parts.push(stripped.slice(Re, strippedIndex));
    if (originalIndex >= original.length) break;
    parts.push(MEMORY_SNAPSHOT_PLACEHOLDER);
    state.placeholders++;
    if (strippedIndex >= stripped.length) break;
    let sliced = stripped.slice(strippedIndex);
    let He = original.length - sliced.length;
    let We =
      sliced.length < 32 && He > originalIndex && original.endsWith(sliced)
        ? He
        : original.indexOf(sliced.slice(0, 32), originalIndex + 1);
    if (We === -1) throw misalignedReplayError();
    originalIndex = We;
  }
  if (strippedIndex < stripped.length) throw misalignedReplayError();
  return parts.join("");
}
//@ chunk-18hwfzwa.js:1471512-1471554 placement
function isHighSurrogate(h) {
  return h >= 55296 && h <= 56319;
}
//@ chunk-18hwfzwa.js:1471554-1471596 placement
function isLowSurrogate(h) {
  return h >= 56320 && h <= 57343;
}
//@ chunk-18hwfzwa.js:1471596-1471747 placement
function misalignedReplayError() {
  return new ReplayMisalignmentError(
    "request-replay: the text withoutLaptopMemoryText left does not line up with the request; this request is not recorded",
  );
}
//@ chunk-18hwfzwa.js:1471747-1472219 placement
/**
 * 确认账号记忆快照的行没有残留在模型轮次之外（除允许的工具结果），否则抛错使该请求不被记录。
 */
function assertMemoryRemoved(h, x, D, findToolResult) {
  let messages = x.filter((Re) => Re.role !== "assistant");
  let serialized = messages.map((Re) => jsonStringify(Re));
  for (let Re of h) {
    let sliced = Re.split(
      `
`,
    )
      .map((line) => line.trim())
      .filter((He) => He.length >= MIN_PROBE_LINE_LENGTH)
      .sort((He, We) => We.length - He.length)
      .slice(0, D);
    for (let He of sliced) {
      let escapedLine = jsonStringify(He).slice(1, -1);
      if (
        serialized.some((ze) => ze.includes(escapedLine)) &&
        !isOnlyInToolResults(messages, serialized, He, escapedLine, findToolResult)
      )
        throw new ReplayMisalignmentError(
          "request-replay: a line of a shown account-memory snapshot is still present outside the model's turns; this request is not recorded",
        );
    }
  }
}
//@ chunk-18hwfzwa.js:1472219-1472811 placement
/**
 * 判断记忆行的出现是否全部来自对应工具结果的原文（数量一致、未被改写），用于放行。
 */
function isOnlyInToolResults(messages, serialized, line, escapedLine, findToolResult) {
  let seenToolUseIds = new Set();
  for (let [Re, Be] of messages.entries()) {
    let He = countOccurrences(serialized[Re], escapedLine);
    if (He === 0) continue;
    if (!Array.isArray(Be.content)) return false;
    let We = 0;
    for (let ze of Be.content) {
      let Xe = countOccurrences(jsonStringify(ze), escapedLine);
      if (Xe === 0) continue;
      if (!isToolResultBlock(ze) || typeof ze.tool_use_id !== "string" || seenToolUseIds.has(ze.tool_use_id))
        return false;
      seenToolUseIds.add(ze.tool_use_id);
      let rt = jsonStringify(ze.content ?? "");
      if (rt.includes(MEMORY_SNAPSHOT_PLACEHOLDER)) return false;
      let toolResult = findToolResult(ze.tool_use_id);
      let At = plainTextOf(ze.content);
      let It = toolResult && plainTextOf(toolResult.content);
      if (
        toolResult === undefined ||
        At === undefined ||
        It === undefined ||
        Xe !== countOccurrences(rt, escapedLine) ||
        Xe > countOccurrences(jsonStringify(toolResult.content ?? ""), escapedLine) ||
        countOccurrences(At, line) > countOccurrences(It, line)
      )
        return false;
      We += Xe;
    }
    if (We !== He) return false;
  }
  return true;
}
//@ chunk-18hwfzwa.js:1472811-1473112 placement
/**
 * 取出纯文本内容块的文本（只含 text 块且无其他字段），否则返回 undefined。
 */
function plainTextOf(content) {
  if (content === undefined || typeof content === "string") return content ?? "";
  if (!Array.isArray(content)) return;
  let x = [];
  for (let D of content) {
    if (typeof D !== "object" || D === null) return;
    let { type: L, text, cache_control: cacheControl, ...Re } = D;
    if (L !== "text" || typeof text !== "string" || Object.keys(Re).length > 0) return;
    x.push(text);
  }
  return x.join(`
`);
}
//@ chunk-18hwfzwa.js:1473112-1473206 placement
function countOccurrences(h, x) {
  let D = 0;
  for (let index = h.indexOf(x); index !== -1; index = h.indexOf(x, index + x.length)) D++;
  return D;
}
//@ chunk-18hwfzwa.js:1473206-1473283 placement
function isTextBlock(h) {
  return h.type === "text" && "text" in h && typeof h.text === "string";
}
//@ chunk-18hwfzwa.js:1473283-1473329 placement
function isToolResultBlock(h) {
  return h.type === "tool_result";
}
//@ chunk-18hwfzwa.js:1473329-1473426 placement
/**
 * laptopMemoryTipsPluginEnabled：CC 插件技巧是否可用。
 */
var laptopMemoryTipsPluginEnabled = () =>
  !isRemoteSessionAvailable() &&
  getBuiltinPlugin(CC_PLUGIN_TIPS)?.isAvailable?.() === true &&
  getBuiltinPlugins().enabled.some((h) => h.name === CC_PLUGIN_TIPS) &&
  isBundledModLive(CC_PLUGIN_TIPS);
//@ chunk-18hwfzwa.js:1473426-1473473 placement
/**
 * ZERO_UUID：全零 UUID。
 */
var ZERO_UUID = "00000000-0000-0000-0000-000000000000";
export { ZERO_UUID, laptopMemoryTipsPluginEnabled, replayWithoutLaptopMemory };
