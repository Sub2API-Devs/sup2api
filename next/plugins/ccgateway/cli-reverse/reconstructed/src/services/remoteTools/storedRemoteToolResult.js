/**
 * services/remoteTools/storedRemoteToolResult.ts
 *
 * 给脚本工具调用裁出可发给 Remote Control 的结果文本与结构化结果，超限时换成说明，并改写会话帧（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2s9zwbhq.js (25)
 * attribution: placement 25
 */
import { isHostError } from "../../utils/errors/hostError.js";
import { formatFileSize } from "../../utils/format.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  processToolResultBlock,
  getPersistenceThreshold,
  oversizeOutputNotice,
} from "../../utils/toolResultStorage.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { findToolByName, getExtraToolsFromProvider, getAllBaseToolsFromRegistry } from "../../Tool.js";

//@ chunk-2s9zwbhq.js:529-628 placement
function errorMessageOrNote(error) {
  return isHostError(error) ? error.message : "a value that is not a Claude Code error, so it is not shown";
}
//@ chunk-2s9zwbhq.js:628-638 placement
var MAX_WALK_STEPS = 1e4;
//@ chunk-2s9zwbhq.js:638-715 placement
function looksLikeBase64(text) {
  return text.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(text.slice(0, 256));
}
//@ chunk-2s9zwbhq.js:715-996 placement
function measureChars(value) {
  let chars = 0;
  let steps = 0;
  let stack = [value];
  while (stack.length > 0) {
    if (++steps > MAX_WALK_STEPS) return 1 / 0;
    let item = stack.pop();
    if (typeof item === "string") {
      if (!looksLikeBase64(item)) chars += item.length;
    } else if (item !== null && typeof item === "object") {
      let children = Array.isArray(item) ? item : Object.values(item);
      if (steps + stack.length + children.length > MAX_WALK_STEPS) return 1 / 0;
      for (let child of children) stack.push(child);
    }
  }
  return chars;
}
//@ chunk-2s9zwbhq.js:996-1168 placement
function tooLargeNote(size) {
  return `Output too large to show here${Number.isFinite(size) ? ` (about ${formatFileSize(size)})` : ""}. The whole output is in the Claude Code session on the computer running it.`;
}
//@ chunk-2s9zwbhq.js:1630-1768 placement (2.1.88 match: _temp, 1)
function servedTextOf(toolName, result) {
  if (toolName === BASH_TOOL_NAME || toolName === POWERSHELL_TOOL_NAME) return;
  return result !== null &&
    typeof result === "object" &&
    "result" in result &&
    typeof result.result === "string"
    ? result.result
    : undefined;
}
//@ chunk-2s9zwbhq.js:1768-2038 placement
function persistedOutputSizeOf(toolName, result) {
  if (
    (toolName !== BASH_TOOL_NAME && toolName !== POWERSHELL_TOOL_NAME) ||
    result === null ||
    typeof result !== "object" ||
    !("persistedOutputPath" in result) ||
    typeof result.persistedOutputPath !== "string" ||
    result.persistedOutputPath === ""
  )
    return;
  return "persistedOutputSize" in result && typeof result.persistedOutputSize === "number"
    ? result.persistedOutputSize
    : 1 / 0;
}
//@ chunk-2s9zwbhq.js:2038-2408 placement
/**
 * 给脚本调用结果登记 Remote Control 的来源标签：有 servedText 直接取自该来源，否则按工具与 mcpContent 走存储文本。
 */
function builtResultSource(tool, result, toolUseId) {
  if (result.servedText !== undefined)
    return {
      kind: "built",
      toolName: tool.name,
      from: "servedText",
    };
  let persistedSize = persistedOutputSizeOf(tool.name, toolUseId);
  if (persistedSize === undefined)
    return {
      kind: "built",
      toolName: tool.name,
      from: result.mcpContent === true ? "mcpContent" : "toolOutput",
    };
  let from =
    result.resultBeforeReadBack === undefined
      ? tooLargeNote(persistedSize)
      : mappedTextOf(tool, result.resultBeforeReadBack, result.toolUseId, result.mcpContent === true, true);
  return from === undefined
    ? undefined
    : {
        kind: "stored",
        text: from,
      };
}
//@ chunk-2s9zwbhq.js:2408-2584 placement
function resultTextFor(tool, format, toolUseId, stripped, tools) {
  if (format === "servedText") {
    let servedText = servedTextOf(tool.name, toolUseId);
    return servedText === undefined ? undefined : processToolResultBlock(tool, servedText, tools);
  }
  let toolEnum = persistedOutputSizeOf(tool.name, toolUseId);
  if (toolEnum !== undefined) return tooLargeNote(toolEnum);
  return mappedTextOf(tool, toolUseId, stripped, format === "mcpContent", tools);
}
//@ chunk-2s9zwbhq.js:2584-3241 placement
/**
 * 把脚本调用的 toolOutput 结果渲染成发给 Remote Control 的文本，失败时记日志并返回空。
 */
function mappedTextOf(tool, result, toolUseId, stripped, tools) {
  try {
    let limit = getPersistenceThreshold(
      tool.name,
      tool.maxResultSizeChars,
      tool.persistenceThresholdCeiling,
      tool.skipAggregateToolResultBudget === true,
    );
    let hasLimit = Number.isFinite(limit);
    let cap = hasLimit ? limit : OUTPUT_SIZE_LIMITS;
    if (!hasLimit) {
      let size = measureChars(result);
      if (size > cap * 10) return tooLargeNote(size);
    }
    let content = tool.mapToolResultToToolResultBlockParam(result, toolUseId)?.content;
    let textOnly = Array.isArray(content) && (tool.isMcp !== true || stripped);
    let text =
      typeof content === "string"
        ? content
        : textOnly
          ? content
              .filter((block) => block?.type === "text" && typeof block.text === "string")
              .map((fallback) => fallback.text).join(`
`)
          : content !== undefined && content !== null
            ? jsonStringify(content)
            : "";
    if (text === "") return;
    return text.length <= cap ? text : oversizeOutputNotice(text, tools);
  } catch (error) {
    logForDebugging(
      `Could not build the Remote Control result text for a script's ${tool.name} call; the Remote Control apps will show an empty result: ${errorMessageOrNote(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-2s9zwbhq.js:3241-3265 placement
var MAX_STRING_CHARS = 1e4;
var MAX_TOTAL_CHARS = 50000;
var MAX_VALUES = 1e4;
//@ chunk-2s9zwbhq.js:3265-3679 placement
/**
 * 在字符数与值个数双重预算内遍历结果值，返回已计入的字符数/值个数；超预算时停止。
 */
function measureValue(value, maxChars, maxValues) {
  let chars = 0;
  let values = 0;
  let stack = [value];
  while (stack.length > 0 && chars <= maxChars && values <= maxValues) {
    let item = stack.pop();
    values++;
    if (typeof item === "string") chars += item.length;
    else if (Array.isArray(item)) {
      for (let element of item) {
        stack.push(element);
        if (values + stack.length > maxValues)
          return {
            chars,
            values: values + stack.length,
          };
      }
    } else if (item !== null && typeof item === "object")
      for (let key in item) {
        if (!Object.hasOwn(item, key)) continue;
        chars += key.length;
        stack.push(item[key]);
        if (values + stack.length > maxValues || chars > maxChars)
          return {
            chars,
            values: values + stack.length,
          };
      }
  }
  return {
    chars,
    values,
  };
}
//@ chunk-2s9zwbhq.js:3679-3916 placement
function strippedResult(tool, tools) {
  if (tool.isMcp === true || persistedOutputSizeOf(tool.name, tools) !== undefined) return;
  let stripped = tool.stripForCreation
    ? tool.stripForCreation(tools)
    : tool.stripToolUseResultAtCreation && tool.stripForStorage
      ? tool.stripForStorage(tools, false)
      : tools;
  let size = measureValue(stripped, MAX_TOTAL_CHARS, MAX_VALUES);
  return size.chars <= MAX_TOTAL_CHARS && size.values <= MAX_VALUES ? stripped : undefined;
}
//@ chunk-2s9zwbhq.js:3916-4798 placement
/**
 * 把发给 Remote Control 的输入裁到上限：字符串截断加“N 个字符未发送”的标记，数组/对象整体超限就整块换成一条说明，对象逐一裁剪超长字段并在超预算处写“还有 N 个字段”。
 */
function shortenForRemoteControl(value) {
  if (typeof value === "string") {
    if (value.length <= MAX_STRING_CHARS) return;
    let head = truncateToLength(value, MAX_STRING_CHARS);
    return `${head}
\u2026[${value.length - head.length} more characters, not sent to Remote Control]`;
  }
  if (Array.isArray(value)) {
    let size = measureValue(value, MAX_TOTAL_CHARS, MAX_VALUES);
    return size.chars > MAX_TOTAL_CHARS || size.values > MAX_VALUES
      ? "[too large to send to Remote Control]"
      : undefined;
  }
  if (value === null || typeof value !== "object") return;
  let input = value;
  let capped = false;
  let chars = 0;
  let values = 0;
  let cappedInput = {};
  let keys = Object.keys(input);
  for (let [keyIndex, keyName] of keys.entries()) {
    let original = input[keyName];
    let next = original;
    if (typeof original === "string" && original.length > MAX_STRING_CHARS) {
      let head = truncateToLength(original, MAX_STRING_CHARS);
      next = `${head}
\u2026[${original.length - head.length} more characters, not sent to Remote Control]`;
    } else if (original !== null && typeof original === "object") {
      let size = measureValue(original, MAX_STRING_CHARS, MAX_VALUES);
      if (size.chars > MAX_STRING_CHARS || size.values > MAX_VALUES)
        next = "[too large to send to Remote Control]";
    }
    let nextSize = measureValue(next, MAX_TOTAL_CHARS, MAX_VALUES);
    if (
      chars + nextSize.chars + keyName.length > MAX_TOTAL_CHARS ||
      values + nextSize.values + 1 > MAX_VALUES
    ) {
      let dropped = keys.length - keyIndex;
      cappedInput["[not sent to Remote Control]"] = `${dropped} more ${dropped === 1 ? "field" : "fields"}`;
      return cappedInput;
    }
    chars += nextSize.chars + keyName.length;
    values += nextSize.values + 1;
    if (next !== original) capped = true;
    cappedInput[keyName] = next;
  }
  return capped ? cappedInput : undefined;
}
//@ chunk-2s9zwbhq.js:4798-5244 placement
/**
 * 把会话消息改写成 Remote Control 客户端能看的帧：去掉 tool_use_result 原始值、补充结构化结果别名、隐藏扣留的工具调用 id、标出虚拟消息。
 */
function remoteClientUserFrames(entry, mapRow, tools) {
  let {
    visibleToRemoteClients,
    remoteToolResult,
    hiddenToolUseIds,
    isVirtual,
    detachedToolUseIds,
    withheldScriptToolUseId,
    ...rest
  } = entry;
  let visible = visibleToRemoteClients === true;
  let remoteResult = visible ? remoteToolResult : undefined;
  let structured = buildStructuredResult(
    remoteResult,
    rest.toolUseResultStripped === true,
    rest.toolUseResult,
    tools,
  );
  return mapRow(rest).map((row) => {
    if (row.type !== "user") return row;
    let base = visible ? withoutToolUseResult(row) : row;
    let hiddened = filteredHiddenIds(row, hiddenToolUseIds);
    return {
      ...base,
      ...(structured !== undefined && {
        tool_use_result: structured,
      }),
      ...(remoteResult !== undefined && withRemoteResultText(row, remoteResult, rest, tools)),
      ...(hiddened.length > 0 && {
        hidden_tool_use_ids: hiddened,
      }),
      ...(isVirtual === true && {
        is_virtual: true,
      }),
    };
  });
}
//@ chunk-2s9zwbhq.js:5244-5671 placement
/**
 * 从脚本调用的 stored 结果里按工具名找到工具定义，生成并可裁剪结构化结果；失败只记一条 error 日志。
 */
function buildStructuredResult(result, stripped, raw, tools) {
  if (
    stripped ||
    result === null ||
    typeof result !== "object" ||
    !("kind" in result) ||
    result.kind !== "built" ||
    !("toolName" in result) ||
    typeof result.toolName !== "string" ||
    !("from" in result) ||
    result.from !== "toolOutput"
  )
    return;
  try {
    let tool = findToolByName(tools ?? [], result.toolName);
    return tool === undefined ? undefined : strippedResult(tool, raw);
  } catch (error) {
    logForDebugging(
      `Could not build the structured result of a script's ${result.toolName} call for Remote Control; the Remote Control apps get its text alone: ${errorMessageOrNote(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-2s9zwbhq.js:5671-6244 placement
/**
 * 从脚本调用结果里取 Remote Control 文本：stored 直接返回文本，built 按 from（toolOutput/mcpContent/servedText）重新渲染。
 */
function buildResultText(result, stripped, raw, from, tools, withheldScriptToolUseId) {
  if (result === null || typeof result !== "object" || !("kind" in result)) return;
  if (result.kind === "stored")
    return "text" in result && typeof result.text === "string" ? result.text : undefined;
  if (
    result.kind !== "built" ||
    raw ||
    !("toolName" in result) ||
    typeof result.toolName !== "string" ||
    !("from" in result) ||
    (result.from !== "toolOutput" && result.from !== "mcpContent" && result.from !== "servedText")
  )
    return;
  try {
    let tool = findToolByName(tools ?? [], result.toolName);
    return tool === undefined
      ? undefined
      : resultTextFor(tool, result.from, stripped, from, withheldScriptToolUseId);
  } catch (error) {
    logForDebugging(
      `Could not build the Remote Control result text for a script's ${result.toolName} call; the Remote Control apps will show an empty result: ${errorMessageOrNote(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-2s9zwbhq.js:6244-6877 placement
/**
 * 结果文本因省空间被丢时补一条 kind=stored 的 Remote Control 文本，避免远程端看到空结果。
 */
function storedRemoteToolResult(row, tools, toolsources) {
  let built = row.remoteToolResult;
  if (row.visibleToRemoteClients !== true || built?.kind !== "built") return;
  try {
    let content = row.message.content;
    let toolResultBlock = Array.isArray(content)
      ? content.find((block) => block?.type === "tool_result")
      : undefined;
    if (toolResultBlock?.type !== "tool_result") return;
    let text = buildResultText(
      built,
      row.toolUseResult,
      row.toolUseResultStripped === true,
      toolResultBlock.tool_use_id,
      tools,
      toolsources,
    );
    return text === undefined
      ? undefined
      : {
          kind: "stored",
          text,
        };
  } catch (error) {
    logForDebugging(
      `Could not keep the Remote Control text of a script's ${typeof built.toolName === "string" ? built.toolName : "tool"} call when Claude Code dropped the call's result text to save space; the Remote Control apps will show an empty result for that call: ${errorMessageOrNote(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-2s9zwbhq.js:6877-7217 placement
/**
 * 给单条消息补 Remote Control 字段：结果文本、隐藏/分离的工具调用 id、被扣留的脚本调用 id。
 */
function headlessScriptCallFrame(row, strippedRow, tools) {
  let remoteResult = strippedRow.visibleToRemoteClients === true ? strippedRow.remoteToolResult : undefined;
  let hiddened = filteredHiddenIds(row, strippedRow.hiddenToolUseIds);
  let detached = stringIds(strippedRow.detachedToolUseIds);
  let withheldId = strippedRow.withheldScriptToolUseId;
  return {
    ...row,
    ...(remoteResult !== undefined && withRemoteResultText(row, remoteResult, strippedRow, toolList(tools))),
    ...(hiddened.length > 0 && {
      hidden_tool_use_ids: hiddened,
    }),
    ...(detached.length > 0 && {
      detached_tool_use_ids: detached,
    }),
    ...(typeof withheldId === "string" && {
      withheld_script_tool_use_id: withheldId,
    }),
  };
}
//@ chunk-2s9zwbhq.js:7217-7442 placement
function toolList(extraTools) {
  try {
    return [
      ...(extraTools ?? []),
      ...(getExtraToolsFromProvider() ?? []),
      ...(getAllBaseToolsFromRegistry() ?? []),
    ];
  } catch (error) {
    logForDebugging(
      `Could not list the tools for a script's calls; the VS Code extension will show an empty result for some of them: ${errorMessageOrNote(error)}`,
      {
        level: "error",
      },
    );
    return extraTools ?? [];
  }
}
//@ chunk-2s9zwbhq.js:7442-7620 placement
function filteredHiddenIds(row, hiddenIds) {
  let content = row.message.content;
  if (!Array.isArray(content)) return [];
  let presentIds = new Set(
    content.flatMap((block) => (block?.type === "tool_result" ? [block.tool_use_id] : [])),
  );
  return stringIds(hiddenIds).filter((id) => presentIds.has(id));
}
//@ chunk-2s9zwbhq.js:7620-7696 placement
function stringIds(ids) {
  return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
}
//@ chunk-2s9zwbhq.js:7696-7969 placement
function withRemoteResultText(row, tools, source, mapRow) {
  let content = row.message.content;
  if (!Array.isArray(content)) return;
  return {
    message: {
      ...row.message,
      content: content.map((block) => {
        if (block?.type !== "tool_result") return block;
        let text = buildResultText(
          tools,
          source.toolUseResult,
          source.toolUseResultStripped === true,
          block.tool_use_id,
          mapRow,
          true,
        );
        return text === undefined
          ? block
          : {
              ...block,
              content: text,
            };
      }),
    },
  };
}
//@ chunk-2s9zwbhq.js:7969-8059 placement
function withoutToolUseResult(row) {
  if (!("tool_use_result" in row)) return row;
  let { tool_use_result: toolUseResult, ...rest } = row;
  return rest;
}
//@ chunk-2s9zwbhq.js:8059-8626 placement
/**
 * 为 Remote Control 缩短 assistant 消息里 tool_use 的 input，超限或出错时换成一条“未发送”的标记。
 */
function remoteClientAssistantFrames(message, mapRow) {
  let { visibleToRemoteClients, ...rest } = message;
  return mapRow(rest).map((row) => {
    let content = row.type === "assistant" ? row.message.content : null;
    if (row.type !== "assistant" || !Array.isArray(content)) return row;
    return {
      ...row,
      message: {
        ...row.message,
        content: content.map((block) => {
          if (block.type !== "tool_use") return block;
          let inputText;
          try {
            inputText = shortenForRemoteControl(block.input);
          } catch (error) {
            logForDebugging(
              `Could not shorten the input of a script's ${typeof block.name === "string" ? block.name : "tool"} call for Remote Control; the Remote Control apps get a note in place of the input: ${errorMessageOrNote(error)}`,
              {
                level: "error",
              },
            );
            inputText = "[not sent to Remote Control]";
          }
          return inputText === undefined
            ? block
            : {
                ...block,
                input: inputText,
              };
        }),
      },
    };
  });
}
export {
  storedRemoteToolResult,
  servedTextOf,
  builtResultSource,
  measureValue,
  headlessScriptCallFrame,
  remoteClientAssistantFrames,
  remoteClientUserFrames,
};
