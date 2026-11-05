/**
 * tools/REPLTool/virtualMessages.ts
 *
 * 把内层调用记录还原成虚拟消息与结果块（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (9)
 * attribution: placement 9
 */
import { findToolByName } from "../../Tool.js";
import { shrinkInlineBase64 } from "./resultContent.js";
import {
  builtResultSource,
  measureValue,
  storedRemoteToolResult,
} from "../../services/remoteTools/storedRemoteToolResult.js";
import { createAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { stripUndefinedProps } from "./resultValue.js";
import { MAX_MCP_RESULT_CHARS } from "../../constants/outputLimits.js";
import { getMaxMcpOutputChars } from "../../utils/mcpValidation.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { READ as READ_2 } from "../FileReadTool/constants.js";
import { getDefaultFileReadingLimits } from "../FileReadTool/limits.js";
import { stripStoredRemoteResult } from "./mcpTools.js";
import { NEVER_RAN_LINE, scriptResultErrorLine } from "../../utils/codeMode/scriptErrors.js";
import { replErrorMessages } from "../../utils/codeMode/scriptErrorMessages.js";
import { SKILL_2 } from "../SkillTool/skillToolNames.js";

//@ chunk-n51jggtb.js:173217-174130 placement
/**
 * 把内层调用记录还原成虚拟的 tool_use / tool_result 消息，供界面展示。
 */
function callsToMessages(calls, tools, forRemote) {
  let messages = [];
  for (let call of calls.values()) {
    if (call.phase === "start" || call.phase === "executing") continue;
    let tool = findToolByName(tools, call.toolName);
    let remoteFlag = forRemote &&
      tool !== undefined && {
        visibleToRemoteClients: true,
      };
    let toolUseResult = shrinkInlineBase64(
      call,
      call.resultBeforeReadBack !== undefined ? call.resultBeforeReadBack : call.result,
    );
    let remoteToolResult =
      forRemote && tool !== undefined && call.phase !== "error"
        ? builtResultSource(tool, call, toolUseResult)
        : undefined;
    messages.push({
      ...createAssistantMessage({
        content: [
          {
            type: "tool_use",
            id: call.toolUseId,
            name: call.toolName,
            input: stripUndefinedProps(call.toolInput),
          },
        ],
        isVirtual: true,
      }),
      ...remoteFlag,
    });
    let userMessage = {
      ...createUserMessage({
        content: [
          {
            type: "tool_result",
            tool_use_id: call.toolUseId,
            content: call.phase === "error" ? (call.error ?? "") : "",
            is_error: call.phase === "error",
          },
        ],
        toolUseResult,
        permissionDecision: call.permissionDecision,
        toolDenialKind: call.toolDenialKind,
        toolDenialAfterRun: call.toolDenialKind === "permission-rule" ? call.executed : undefined,
        sandboxViolations: call.sandboxViolations,
        sandboxed: call.sandboxed,
        isVirtual: true,
      }),
      ...remoteFlag,
      ...(remoteToolResult !== undefined && {
        remoteToolResult,
      }),
      ...(forRemote &&
        tool === undefined && {
          hiddenToolUseIds: [call.toolUseId],
        }),
    };
    messages.push(stripOversizedResult(userMessage, call, tool, tools));
  }
  return messages;
}
//@ chunk-n51jggtb.js:174130-174792 placement
/**
 * 结果过大时把 toolUseResult 换成“未保留”占位并标记已剥离。
 */
function stripOversizedResult(message, call, content, tools) {
  if (call.phase === "error" || content === undefined) return message;
  if (content.isMcp === true) {
    let maxChars =
      content.persistenceThresholdCeiling !== undefined ? MAX_MCP_RESULT_CHARS : getMaxMcpOutputChars();
    let measure = measureValue(message.toolUseResult, maxChars, maxChars);
    let fits = false;
    if (measure.chars + measure.values <= maxChars)
      try {
        fits = jsonStringify(message.toolUseResult ?? null).length <= maxChars;
      } catch {}
    if (fits) return message;
    let remoteToolResult = storedRemoteToolResult(message, tools, false);
    return {
      ...message,
      toolUseResult: `[Result not kept here: it is over the ${maxChars.toLocaleString()} characters kept for one call.]`,
      toolUseResultStripped: true,
      ...(remoteToolResult !== undefined && {
        remoteToolResult,
      }),
    };
  }
  if (
    call.toolName !== READ_2 ||
    content.stripForStorage === undefined ||
    resultByteLength(message.toolUseResult) <= getDefaultFileReadingLimits().maxSizeBytes
  )
    return message;
  let stripped = content.stripForStorage(message.toolUseResult, false);
  if (stripped === message.toolUseResult) return message;
  return {
    ...message,
    toolUseResult: stripped,
    ...stripStoredRemoteResult(message, content),
  };
}
//@ chunk-n51jggtb.js:174792-175082 placement
/**
 * 按 file.content 或 cells 计算结果字节数。
 */
function resultByteLength(toolUseResult) {
  if (typeof toolUseResult !== "object" || toolUseResult === null || !("file" in toolUseResult)) return 0;
  let file = toolUseResult.file;
  if (typeof file !== "object" || file === null) return 0;
  if ("content" in file && typeof file.content === "string") return Buffer.byteLength(file.content, "utf8");
  return "cells" in file && Array.isArray(file.cells) ? Buffer.byteLength(jsonStringify(file.cells)) : 0;
}
//@ chunk-n51jggtb.js:175082-175203 placement
/**
 * 把结果里的 error 转成展示用虚拟消息。
 */
function errorRowsForOutput(output, clientsDrawCalls) {
  if (typeof output.error !== "string") return [];
  if (output.stoppedBy !== undefined) return clientsDrawCalls ? personOrLine(output, true, true) : [];
  return personOrLine(output, clientsDrawCalls, false);
}
//@ chunk-n51jggtb.js:175203-175335 placement
/**
 * 按停止发起方（人/其他）生成虚拟消息。
 */
function neverRanMessage(mark, error, stoppedBy) {
  if (mark === "person")
    return error
      ? personOrLine(
          {
            error: "Interrupted",
            stoppedBy: "user",
          },
          true,
          true,
        )
      : [];
  return stoppedBy && !error
    ? []
    : personOrLine(
        {
          error: NEVER_RAN_LINE,
        },
        error,
        stoppedBy,
      );
}
//@ chunk-n51jggtb.js:175335-175466 placement
/**
 * 构造“已停止”的虚拟 tool_result 消息。
 */
function personOrLine(output, clientsDrawCalls, shownOnCall) {
  return replErrorMessages(scriptResultErrorLine(output) ?? "Error", {
    clientsDrawCalls,
    shownOnCall,
    ...(output.stoppedBy !== undefined && {
      stoppedBy: output.stoppedBy,
    }),
  });
}
//@ chunk-n51jggtb.js:175466-175553 placement
/**
 * 当结果带 error 时生成单条虚拟消息。
 */
function errorRows(output) {
  let source = output;
  return typeof source?.error === "string" && scriptResultErrorLine(source) !== null
    ? personOrLine(source, true, true)
    : [];
}
//@ chunk-n51jggtb.js:175584-175753 placement
/**
 * 给工具名做展示分类（MCP/skill/tool）。
 */
function displayToolName(tool, baseTools) {
  if (baseTools.has(tool) && tool.isMcp !== true && tool.mcpInfo === undefined) return tool.name;
  if (tool.isMcp === true || tool.mcpInfo !== undefined) return "MCP";
  return tool.name.startsWith(SKILL_2) ? "skill" : "tool";
}
//@ chunk-n51jggtb.js:175753-175966 placement
/**
 * 列出仍在等待的调用及其等待时长。
 */
function startingCalls(calls, tools, startedAt, now, baseTools) {
  let rows = [];
  for (let call of calls.values()) {
    let tool = call.phase === "start" ? findToolByName(tools, call.toolName) : undefined;
    if (tool !== undefined)
      rows.push({
        toolUseId: call.toolUseId,
        toolName: displayToolName(tool, baseTools),
        waitingMs: now - (startedAt.get(call.toolUseId) ?? now),
      });
  }
  return rows;
}
export { errorRowsForOutput, neverRanMessage, errorRows, startingCalls, callsToMessages };
