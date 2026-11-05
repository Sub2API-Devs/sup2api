/**
 * tasks/LocalWorkflowTask/workflowTranscript.ts
 *
 * 2.1.316 新增。工作流代理转录读取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n6w10qzg.js (12)
 * attribution: placement 10, layout 1, sole-consumer 1
 */
import { join } from "path";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { subagentWorkflowDir } from "../../services/workflow/snapshots.js";
import { readJSONLFile } from "../../utils/json.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTranscriptMessage } from "../../utils/sessionStorage.js";
import {
  stripHarnessFraming,
  emptyWorkflowToolUseTracker,
  settleWorkflowToolUse,
  noteWorkflowToolUse,
  describeWorkflowStep,
} from "../../services/workflows/harnessFraming.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { NEWLINE_2 } from "../../ink/log-update.js";
import {
  resolvePendingTaskCreate,
  trackTaskToolUse,
  getAllTrackedTasks,
  parseTodoWriteTodos,
} from "../../utils/task/framework.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getAgentMissState, isAgentFlagged, agentContract } from "../../tools/AgentTool/handbackReport.js";
import { countWhere } from "../../utils/collections.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { INTERRUPT_MESSAGE_FOR_TOOL_USE } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n6w10qzg.js:2509-2513 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-n6w10qzg.js:2509", () => {
  init_react_production();
});
//@ chunk-n6w10qzg.js:2542-2590 placement
/**
 * 转录提示词/输出字段字符上限与保留的工具结果条数、任务工具名列表。
 */
var MAX_TRANSCRIPT_PROMPT_CHARS; // deferred: uses structuredOutputInputSchema (../../tools/SyntheticOutputTool/SyntheticOutputTool.js) of its import cycle while loading; runs once the cycle is complete
var MAX_TRANSCRIPT_OUTPUT_CHARS;
var MAX_TRANSCRIPT_TOOL_RESULTS;
var TASK_TODO_TOOL_NAMES;
deferInit("chunk-n6w10qzg.js:2542", () => {
  MAX_TRANSCRIPT_PROMPT_CHARS = 4000;
  MAX_TRANSCRIPT_OUTPUT_CHARS = 2000;
  MAX_TRANSCRIPT_TOOL_RESULTS = 3;
  TASK_TODO_TOOL_NAMES = [
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    STRUCTUREDOUTPUT,
  ];
});
//@ chunk-n6w10qzg.js:2590-5339 placement
async function readWorkflowAgentTranscript(workflowRunId, agentIndex, { promptFramed } = {}) {
  let filePath = join(subagentWorkflowDir(workflowRunId), `agent-${agentIndex}.jsonl`);
  let rows;
  try {
    rows = await readJSONLFile(filePath);
  } catch (error) {
    logForDebugging(
      `readWorkflowAgentTranscript: ${filePath} not readable (${error instanceof Error ? error.message : String(error)})`,
    );
    return null;
  }
  let filtered = rows.filter(isTranscriptMessage);
  let index = filtered.findIndex((message) => message.type === "user");
  let lastUserMessage = index === -1 ? undefined : filtered[index];
  for (let idx = index + 1; index !== -1 && idx < filtered.length; idx++) {
    let message = filtered[idx];
    if (message === undefined || message.type !== "user" || message.isMeta === true) break;
    lastUserMessage = message;
  }
  let content = lastUserMessage?.type === "user" ? lastUserMessage.message?.content : undefined;
  let promptText = typeof content === "string" ? content : textOfBlocks(content).trim();
  let prompt = promptFramed ? stripHarnessFraming(promptText) : promptText;
  let toolUseEntries = [];
  let toolUseTracker = emptyWorkflowToolUseTracker();
  let virtualToolUseIds = new Map();
  let pendingResponseId;
  let resultByToolUseId = new Map();
  let taskTracker = {
    pendingCreates: new Map(),
    tasks: new Map(),
  };
  let todoWriteInput = undefined;
  let finalText = "";
  let handbackMessages = [];
  let lastResponseId = "";
  for (let [rowIndex, message] of filtered.entries()) {
    if (message.type === "user") {
      let content = message.message?.content;
      if (Array.isArray(content))
        for (let block of content) {
          if (!isContentBlock(block) || block.type !== "tool_result" || typeof block.tool_use_id !== "string")
            continue;
          let isError = block.is_error === true;
          settleWorkflowToolUse(toolUseTracker, block.tool_use_id, message.isVirtual === true, isError);
          if (message.isVirtual !== true && toolUseTracker.uses.has(block.tool_use_id))
            pendingResponseId = block.tool_use_id;
          let progress = contentToText(block.content);
          let headSource =
            codeModeAccepted() && message.isVirtual !== true && toolUseTracker.uses.has(block.tool_use_id)
              ? resultHeadText(block.content, message.toolDenialKind, isError)
              : codeModeAccepted() && progress === "" && message.isVirtual === true
                ? NEWLINE_2(message.toolUseResult)
                : progress;
          resultByToolUseId.set(block.tool_use_id, {
            ...textHead(headSource, MAX_TRANSCRIPT_OUTPUT_CHARS),
            isError,
          });
          resolvePendingTaskCreate(taskTracker, {
            tool_use_id: block.tool_use_id,
            is_error: isError,
            content: progress,
          });
        }
      continue;
    }
    if (message.type !== "assistant" || !Array.isArray(message.message?.content)) continue;
    let responseId = message.message.id || `entry-${rowIndex}`;
    if (!(codeModeAccepted() && message.isVirtual === true)) {
      lastResponseId = responseId;
      pendingResponseId = undefined;
    }
    let responseText = "";
    for (let block of message.message.content) {
      if (!isContentBlock(block)) continue;
      if (block.type === "tool_use" && typeof block.name === "string") {
        if (codeModeAccepted() && message.scriptErrorCopy === true) continue;
        noteWorkflowToolUse(
          toolUseTracker,
          {
            id: block.id,
            name: block.name,
          },
          message.isVirtual === true,
        );
        if (message.isVirtual === true && typeof block.id === "string" && pendingResponseId !== undefined)
          virtualToolUseIds.set(block.id, pendingResponseId);
        toolUseEntries.push({
          id: typeof block.id === "string" ? block.id : "",
          name: block.name,
          input: block.input,
          responseKey: responseId,
        });
        if (typeof block.id === "string" && block.id !== "") trackTaskToolUse(taskTracker, block);
        if (block.name === TODO_WRITE_TOOL_NAME) todoWriteInput = block.input;
        if (
          block.name === SUBAGENTHANDBACK &&
          typeof block.id === "string" &&
          isPlainObject(block.input) &&
          typeof block.input.message === "string"
        )
          handbackMessages.push({
            id: block.id,
            message: block.input.message,
          });
        if (block.name === STRUCTUREDOUTPUT && block.input !== undefined)
          try {
            responseText = jsonStringify(block.input, null, 2);
          } catch {
            responseText = String(block.input);
          }
      } else if (block.type === "text" && typeof block.text === "string") responseText += block.text;
    }
    if (responseText) finalText = responseText;
  }
  let agentMissState = getAgentMissState(agentIndex);
  let found = handbackMessages.find((handback) => handback.id === agentMissState);
  if (found !== undefined)
    finalText = isAgentFlagged(agentIndex)
      ? `Auto mode's check flagged this report or could not review it. Read it with care.

${found.message}`
      : found.message;
  else if (
    agentContract(agentIndex) === undefined &&
    handbackMessages.some((handback) => {
      let result = resultByToolUseId.get(handback.id);
      return result !== undefined && !result.isError && result.head.startsWith('{"success":true');
    })
  )
    finalText = "";
  let allToolEntries = codeModeAccepted()
    ? pickToolUsesToEmit(toolUseEntries, toolUseTracker, resultByToolUseId, virtualToolUseIds)
    : toolUseEntries;
  let isHidden = (entry) => codeModeAccepted() && toolUseTracker.uses.has(entry.id);
  let visibleBudget = countWhere(allToolEntries, (entry) => !isHidden(entry));
  let toolCalls = allToolEntries.map((entry) => {
    let isLastResponse = entry.responseKey === lastResponseId;
    let hidden = isHidden(entry);
    if (!hidden) visibleBudget--;
    let includeFields =
      hidden ||
      ((visibleBudget < MAX_TRANSCRIPT_TOOL_RESULTS || isLastResponse) &&
        !TASK_TODO_TOOL_NAMES.includes(entry.name));
    return {
      name: entry.name,
      summary: hidden ? "" : describeWorkflowStep(entry.input, entry.name),
      fromLastResponse: isLastResponse,
      fields: includeFields && !hidden ? inputFieldsPreview(entry.input) : [],
      result: textHeadOrError(entry.id ? resultByToolUseId.get(entry.id) : undefined, includeFields),
    };
  });
  let allTrackedTasks = getAllTrackedTasks(taskTracker);
  let tasks = allTrackedTasks.length > 0 ? allTrackedTasks : parseTodoWriteTodos(todoWriteInput);
  return {
    prompt,
    toolCalls,
    finalText,
    tasks,
  };
}
//@ chunk-n6w10qzg.js:5339-5743 layout
function pickToolUsesToEmit(toolUseEntries, toolUseTracker, resultByToolUseId, virtualToolUseIds) {
  let entry = new Map();
  for (let indexByKey of toolUseEntries) {
    let progressEntry = virtualToolUseIds.get(indexByKey.id);
    if (progressEntry !== undefined && !toolUseTracker.helperCalls.has(indexByKey.id))
      entry.set(progressEntry, indexByKey.id);
  }
  let newEntry = new Map();
  let entryKey = [];
  for (let progressEntry of toolUseEntries) {
    if (toolUseTracker.helperCalls.has(progressEntry.id)) continue;
    if (toolUseTracker.uses.has(progressEntry.id)) {
      let existingIndex = resultByToolUseId.get(progressEntry.id);
      if (existingIndex === undefined) entryKey.push(progressEntry);
      else if (existingIndex.isError) {
        let kept = entry.get(progressEntry.id);
        if (kept === undefined) entryKey.push(progressEntry);
        else newEntry.set(kept, progressEntry);
      }
      continue;
    }
    entryKey.push(progressEntry);
    let logEntry = newEntry.get(progressEntry.id);
    if (logEntry !== undefined) entryKey.push(logEntry);
  }
  return entryKey;
}
//@ chunk-n6w10qzg.js:5743-5789 placement
/**
 * 文本头的空值（head 为空、行数 0）。
 */
var EMPTY_TEXT_HEAD = {
  head: "",
  lineCount: 0,
  truncatedChars: 0,
};
//@ chunk-n6w10qzg.js:5789-5861 placement
/**
 * 无文本时返回空文本头（保留 isError）。
 */
function textHeadOrError(result, includeBody) {
  if (!result) return null;
  return includeBody
    ? result
    : {
        ...EMPTY_TEXT_HEAD,
        isError: result.isError,
      };
}
//@ chunk-n6w10qzg.js:5861-5988 placement
function textHead(text, maxChars) {
  let trimmed = text.trimEnd();
  let head = trimmed.length > maxChars ? truncateToLength(trimmed, maxChars) : trimmed;
  return {
    head,
    lineCount:
      countCharInString(
        trimmed,
        `
`,
      ) + 1,
    truncatedChars: trimmed.length - head.length,
  };
}
//@ chunk-n6w10qzg.js:5988-6066 placement
/**
 * 判断值是否是带 type 字符串的内容块。
 */
function isContentBlock(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string";
}
//@ chunk-n6w10qzg.js:6066-6207 placement
function textOfBlocks(blocks) {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter(isContentBlock)
    .flatMap((block) => (block.type === "text" && typeof block.text === "string" ? block.text : [])).join(`
`);
}
//@ chunk-n6w10qzg.js:6207-6386 placement
function contentToText(blocks) {
  if (typeof blocks === "string") return blocks;
  let text = textOfBlocks(blocks);
  if (text || !Array.isArray(blocks)) return text;
  let filtered = blocks.filter(isContentBlock);
  return filtered.length === 0 ? "" : `(${filtered.map((block) => block.type).join(", ")} content)`;
}
//@ chunk-n6w10qzg.js:6386-6866 sole-consumer
function resultHeadText(content, toolDenialKind, isError) {
  if (codeModeAccepted()) {
    let entry =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content.filter(isContentBlock).find((denialKind) => denialKind.type === "text")?.text
          : undefined;
    let progressEntry = typeof entry === "string" ? entry : "";
    let outputEnvelope = require("../../utils/codeMode/parseOutputEnvelope.lazy.js").parseOutputEnvelope(
      progressEntry,
    );
    if (outputEnvelope === null) return toolDenialKind !== undefined ? progressEntry : isError ? "Error" : "";
    if (toolDenialKind === "user-rejected") {
      let { REFUSAL_SENTENCE } = require("../../tools/REPLTool/stopReport.js");
      return outputEnvelope.error?.startsWith(REFUSAL_SENTENCE)
        ? REFUSAL_SENTENCE
        : INTERRUPT_MESSAGE_FOR_TOOL_USE;
    }
    if (outputEnvelope.error !== undefined)
      return require("../../utils/codeMode/scriptErrors.js").scriptErrorLine(outputEnvelope.error);
    return isError ? "Error" : "";
  }
  return "";
}
//@ chunk-n6w10qzg.js:7074-7321 placement (2.1.88 match: _temp7, 1)
function inputFieldsPreview(opt) {
  if (opt === undefined || opt === null) return [];
  return (typeof opt === "object" && !Array.isArray(opt) ? Object.entries(opt) : [["input", opt]]).map(
    ([key, value]) => {
      let text;
      if (typeof value === "string") text = value;
      else
        try {
          text = jsonStringify(value) ?? String(value);
        } catch {
          text = String(value);
        }
      return {
        key,
        ...textHead(text, MAX_TRANSCRIPT_PROMPT_CHARS),
      };
    },
  );
}
export { TASK_TODO_TOOL_NAMES, MAX_TRANSCRIPT_TOOL_RESULTS, readWorkflowAgentTranscript };
