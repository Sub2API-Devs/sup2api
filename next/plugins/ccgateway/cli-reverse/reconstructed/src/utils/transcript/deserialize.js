/**
 * utils/transcript/deserialize.ts
 *
 * 2.1.316 新增：转录反序列化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (84), chunk-pzvrh90y.js (3)
 * attribution: placement 81, layout 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { env } from "../env.js";
import { NO_REPLY_SUFFIX } from "../../bridge/projectsReplyEvaluation.js";
import { isFirstPartyApiBackend } from "../model/providers.js";
import { logForDebugging } from "../debug.js";
import { plural } from "../stringUtils.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, fromEnumOpt, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { MAX_WIRE_TOOL_NAME_CHARS, isOverlongToolName, clippedToolName } from "../taggedId.js";
import { errorMessage, withTelemetryMessage, toError } from "../errors.js";
import {
  isServerToolType,
  UNSUPPORTED_TOOL_CONTENT_TEXT,
  WORKER_RESTARTED_PROMPT_2,
  resumePromptOverride,
  deserializeMessagesWithInterruptDetection,
  WORKER_RESTARTED_PROMPT,
  isCutOffPreviewEnabled,
  degradeRestoredMessages,
  migrateLegacyAttachmentTypes,
  dropMalformedTextBlocks,
  isTailMessage,
  interruptedTurnResumePolicy,
  isResumeTooOld,
  showsCutOffCalls,
  lastMessageAgeMs,
  newerMessage,
  refusalRetryMaxAge,
  isOlderThan,
  recordTailDiagnostics,
} from "../conversationRecovery.js";
import { assistantTurnKeys } from "../../cli/print.js";
import {
  BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2,
  LEGACY_BRIEF_TOOL_NAME as LEGACY_BRIEF_TOOL_NAME_2,
} from "../../tools/BriefTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../tools/PublishPluginTool/prompt.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { REPL_TOOL_NAME, EVAL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import {
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  isShutdownInterrupted,
  singleTextContent,
  isTurnCompanion,
  isToolUseResultMessage,
  isInterruptionOnlyMessage,
  isToolUseRequestMessage,
  SYNTHETIC_MODEL,
  isContextAppendMessage,
  isNoResponseRequestedMessage,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  isValidTurnPosition,
  regroupSplitResponsesOnResume,
  normalizeMessagesForResume,
  filterThinkingOnlyUntilStable,
  normalizeMessages,
  createUserMessage,
  createAssistantMessage,
  NO_RESPONSE_REQUESTED,
  isContinuationPrompt,
  INTERRUPT_MESSAGE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  isTurnNotEndedNotice,
  withRenderedAttachment,
  UUID_PREFIX_LENGTH,
} from "../messages.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_2 } from "../shell/shellToolUtils.js";
import { isPlainObject as isPlainObject_5 } from "../objectUtils.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getMcpPrefix as getMcpPrefix_4 } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import { INSTRUCTION_WITHHELD_REASONS } from "../instructionFileAccess.js";
import { isBareTaskNotificationOrigin } from "../backgroundSessionResume.js";
import { filterUuidList } from "../../cli/queuedCommands.js";
import { logEvent } from "../../services/analytics/index.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { CONNECTGITHUB } from "../../components/ConnectGitHub/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { OFFERCHROMESETUP } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { SHOWONBOARDINGROLEPICKER } from "../../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import {
  isVirtualConversationMessage,
  isSyntheticModelApiErrorMessage,
  isSystemLocalCommandMessage,
} from "../../bootstrap/sessionSlices.js";
import {
  isUnattendedStartUnconfirmed,
  apiErrorKind,
  isApiErrorWithoutRefusal,
  refusalKind,
} from "./turnClassification.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_MIGHTY_FLASK, TENGU_PLUMB_MARTEN } from "../../services/api/withRetry.js";
import { filterStopHookSummariesOnResume } from "./transcriptRepair.js";
import { extractPluginPrompt } from "../messages/nonUserMessages.js";
import { wireToolInputsForContent, restoreWireInputStamps } from "../wireToolInputEcho.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { PROMPT_ORIGIN_KINDS } from "../promptSource.js";
import { isRemoteToolsForwardEnabled } from "../../bridge/deviceRegistration.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { isRemoteSessionChangeAttachment } from "../contextAttachments/remoteSession.js";
import { countWhere } from "../collections.js";
import { CCS_NO_REQUEST_TOKEN } from "../../services/api/errors.js";
import { logError } from "../log.js";
import { isCcsTenant, addInvokedSkill } from "../../bootstrap/state.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
import { bashCommandTagKindOf, localCommandTagKindOf } from "../messages/localCommandTags.js";
import { looksLikeSlashInput } from "../../commands.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { getToolEndsTurnKind } from "../../services/tools/mcpResultMeta.js";
import { isBriefEnabled } from "../../tools/BriefTool/BriefTool.js";
import { isSoftSparkEnabled } from "../../services/compact/compactSettings.js";
import { PERSISTED_OUTPUT_TAG as PERSISTED_OUTPUT_TAG_2 } from "../toolResultStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pzvrh90y.js:254-370 placement
/**
 * CLAUDE_CODE_TERMINAL_MCP_TOOLS 列出的会结束回合的 MCP 工具。
 */
function getTerminalMcpTools() {
  return new Set(
    (env.CLAUDE_CODE_TERMINAL_MCP_TOOLS || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}
//@ chunk-pzvrh90y.js:370-434 layout
function hasNoReplyTerminalTool() {
  return getTerminalMcpTools()
    .values()
    .some((toolName) => toolName.endsWith(NO_REPLY_SUFFIX));
}
//@ chunk-pzvrh90y.js:434-874 placement
function endedOnAnsweredNoReplyTool(messages) {
  let terminalMcpTools = getTerminalMcpTools();
  if (terminalMcpTools.size === 0) return false;
  let answeredIds = new Set();
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type === "user") {
      if (message.isMeta) continue;
      let content = message.message.content;
      if (!Array.isArray(content)) return false;
      let sawToolResult = false;
      for (let block of content)
        if (block.type === "tool_result") {
          sawToolResult = true;
          if (!block.is_error) answeredIds.add(block.tool_use_id);
        }
      if (!sawToolResult) return false;
    } else if (message.type === "assistant") {
      for (let block of message.message.content)
        if (block.type === "tool_use" && answeredIds.has(block.id) && terminalMcpTools.has(block.name))
          return true;
    }
  }
  return false;
}
//@ chunk-5xgkngpb.js:1894143-1895049 placement
/**
 * 移除 Anthropic API 不接受的助手内容块。
 */
function dropApiInvalidAssistantBlocks(messages, { site }) {
  try {
    let scan = scanForeignBlocks(messages);
    let stripForeign = scan.foreignBlocks && isFirstPartyApiBackend();
    if (!stripForeign && !scan.overlongToolNames) return messages;
    let { result: updated, removed, spacers, truncated } = stripForeignToolBlocks(messages, stripForeign);
    if (removed === 0 && truncated === 0) return messages;
    if (removed > 0) {
      logForDebugging(
        `dropApiInvalidAssistantBlocks: removed ${removed} assistant content ${plural(removed, "block")} that the Anthropic API does not produce or accept (${spacers} ${plural(spacers, "spacer")} kept)`,
        {
          level: "warn",
        },
      );
      logFeatureSad("transcript_api_invalid_blocks", "blocks_dropped", {
        site: fromEnum(site),
        removed,
        spacers,
      });
    }
    if (truncated > 0) {
      logForDebugging(
        `dropApiInvalidAssistantBlocks: cut ${truncated} overlong tool_use ${plural(truncated, "name")} to the Anthropic API's ${MAX_WIRE_TOOL_NAME_CHARS}-character request limit`,
        {
          level: "warn",
        },
      );
      logFeatureSad("transcript_api_invalid_blocks", "tool_name_truncated", {
        site: fromEnum(site),
        truncated,
      });
    }
    return updated;
  } catch (error) {
    logForDebugging(
      `dropApiInvalidAssistantBlocks: left the history unchanged after an unexpected transcript shape (${errorMessage(error)})`,
      {
        level: "error",
      },
    );
    logFeatureBad("transcript_api_invalid_blocks", "unexpected_shape", {
      site: fromEnum(site),
    });
    return messages;
  }
}
//@ chunk-5xgkngpb.js:1895049-1895442 placement
/**
 * 是否有外来服务端工具块或过长工具名。
 */
function scanForeignBlocks(messages) {
  let sawForeign = false;
  let sawLocal = false;
  for (let message of messages) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      let typedBlock = block;
      if (
        isToolResultBlock(typedBlock) ||
        (isPlainObjectMessage(typedBlock) &&
          typedBlock.type === "server_tool_use" &&
          !isServerToolType(typedBlock.name))
      )
        sawForeign = true;
      else if (
        isPlainObjectMessage(typedBlock) &&
        typedBlock.type === "tool_use" &&
        typeof typedBlock.name === "string" &&
        isOverlongToolName(typedBlock.name)
      )
        sawLocal = true;
      if (sawForeign && sawLocal)
        return {
          foreignBlocks: sawForeign,
          overlongToolNames: sawLocal,
        };
    }
  }
  return {
    foreignBlocks: sawForeign,
    overlongToolNames: sawLocal,
  };
}
//@ chunk-5xgkngpb.js:1895636-1896241 placement
/**
 * 按回合收集工具结果出现在助手侧还是用户侧。
 */
function indexToolResultSides(messages, turnKeys) {
  let resultLeft = new Set();
  let resultRight = new Set();
  let resultBoth = new Set();
  let messageIds = new Set();
  messages.forEach((message, index) => {
    if (message.type === "user") {
      if (!Array.isArray(message.message.content)) return;
      for (let block of message.message.content)
        if (isPlainObjectMessage(block) && isToolResultBlock(block)) messageIds.add(block.tool_use_id);
      return;
    }
    let turnKey = turnKeys[index];
    if (turnKey === undefined || message.type !== "assistant" || !Array.isArray(message.message.content))
      return;
    for (let block of message.message.content) {
      if (isPlainObjectMessage(block) && isToolResultBlock(block)) resultBoth.add(block.tool_use_id);
      if (!isPlainObjectMessage(block) || typeof block.tool_use_id !== "string") continue;
      if (isToolResultBlock(block))
        resultRight.add(`${turnKey}
${block.tool_use_id}`);
      else if (!isToolUseLikeBlock(block))
        resultLeft.add(`${turnKey}
${block.tool_use_id}`);
    }
  });
  return {
    byServerResult: resultLeft,
    byClientResult: resultRight,
    byAssistantSideResult: resultBoth,
    byUserSideResult: messageIds,
  };
}
//@ chunk-5xgkngpb.js:1896241-1896641 placement
/**
 * 助手内容块是否为应剥离的外来工具块。
 */
function isForeignToolBlock(block, message, resultSides) {
  if (isToolResultBlock(block)) return true;
  if (!isPlainObjectMessage(block)) return false;
  if (block.type === "tool_use")
    return resultSides.byAssistantSideResult.has(block.id) && !resultSides.byUserSideResult.has(block.id);
  if (block.type !== "server_tool_use" && block.type !== "mcp_tool_use") return false;
  let resultKey =
    typeof block.id === "string"
      ? `${message}
${block.id}`
      : undefined;
  if (resultKey !== undefined && resultSides.byServerResult.has(resultKey)) return false;
  return (
    (resultKey !== undefined && resultSides.byClientResult.has(resultKey)) ||
    (block.type === "server_tool_use" && !isServerToolType(block.name))
  );
}
//@ chunk-5xgkngpb.js:1896641-1897398 placement
/**
 * 遍历助手消息内容：移除外来服务端工具调用/结果块（被删后紧跟思考块时插入占位文本以保持思考块合法）， 并把过长或旧的工具名改为规范名；返回结果与移除/插入/改名计数。
 */
function stripForeignToolBlocks(messages, stripForeign) {
  let turnKeys = assistantTurnKeys(messages);
  let resultSides = indexToolResultSides(messages, turnKeys);
  let turnState = new Map();
  let removed = 0;
  let spacers = 0;
  let truncated = 0;
  return {
    result: messages.flatMap((message, index) => {
      let turnKey = turnKeys[index];
      if (turnKey === undefined || message.type !== "assistant" || !Array.isArray(message.message.content))
        return [message];
      let keptContent = [];
      let { lastKeptIsThinking, removedSince } = turnState.get(turnKey) ?? {
        lastKeptIsThinking: false,
        removedSince: false,
      };
      let didAlter = false;
      for (let block of message.message.content) {
        if (stripForeign && isForeignToolBlock(block, turnKey, resultSides)) {
          removed += 1;
          removedSince = true;
          didAlter = true;
          continue;
        }
        if (removedSince && lastKeptIsThinking && isThinkingBlockObject(block)) {
          keptContent.push({
            type: "text",
            text: UNSUPPORTED_TOOL_CONTENT_TEXT,
            citations: [],
          });
          spacers += 1;
          didAlter = true;
        }
        let keptBlock = block;
        if (isPlainObjectMessage(block) && block.type === "tool_use") {
          let clippedName = clippedToolName(block.name);
          if (clippedName !== undefined) {
            keptBlock = {
              ...block,
              name: clippedName,
            };
            truncated += 1;
            didAlter = true;
          }
        }
        keptContent.push(keptBlock);
        lastKeptIsThinking = isThinkingBlockObject(block);
        removedSince = false;
      }
      turnState.set(turnKey, {
        lastKeptIsThinking,
        removedSince,
      });
      if (!didAlter) return [message];
      return keptContent.length === 0
        ? []
        : [
            {
              ...message,
              message: {
                ...message.message,
                content: keptContent,
              },
            },
          ];
    }),
    removed,
    spacers,
    truncated,
  };
}
//@ chunk-5xgkngpb.js:1897398-1897450 placement
function isPlainObjectMessage(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-5xgkngpb.js:1897450-1897551 placement
function hasToolResultBlock_2(message) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some(isToolResultBlock)
  );
}
//@ chunk-5xgkngpb.js:1897551-1897603 placement
function isToolResultBlock(block) {
  return isPlainObjectMessage(block) && block.type === "tool_result";
}
//@ chunk-5xgkngpb.js:1897603-1897697 placement
function isToolUseLikeBlock(block) {
  let type = block.type;
  return type === "tool_use" || type === "server_tool_use" || type === "mcp_tool_use";
}
//@ chunk-5xgkngpb.js:1897697-1897779 placement (2.1.88 match: hasThinkingContent, 1)
function isThinkingBlockObject(m) {
  return isPlainObjectMessage(m) && (m.type === "thinking" || m.type === "redacted_thinking");
}
//@ chunk-5xgkngpb.js:1897779-1897872 placement
var BRIEF_TOOL_NAMES; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var PUBLISH_PLUGIN_TOOL_NAMES;
var RESUMABLE_TOOL_NAMES;
deferInit("chunk-5xgkngpb.js:1897779", () => {
  BRIEF_TOOL_NAMES = new Set([BRIEF_TOOL_NAME_2, LEGACY_BRIEF_TOOL_NAME_2, SEND_USER_FILE_TOOL_NAME]);
  PUBLISH_PLUGIN_TOOL_NAMES = new Set([PUBLISH_PLUGIN_TOOL_NAME, ...[], ...[]]);
  RESUMABLE_TOOL_NAMES = new Set([AGENT, TASK, SKILL, REPL_TOOL_NAME, EVAL_TOOL_NAME, WORKFLOW_TOOL_NAME]);
});
//@ chunk-5xgkngpb.js:1897872-1897910 placement
/**
 * 是否是 Agent/Task 工具（可恢复）。
 */
function isAgentOrTaskTool(toolName) {
  return toolName === AGENT || toolName === TASK;
}
//@ chunk-5xgkngpb.js:1897910-1898042 placement
function isResumableToolName(name, excluded, extra = false) {
  return (
    typeof name === "string" &&
    !excluded.has(name) &&
    !PUBLISH_PLUGIN_TOOL_NAMES.has(name) &&
    !BRIEF_TOOL_NAMES.has(name) &&
    (!RESUMABLE_TOOL_NAMES.has(name) || (extra && isAgentOrTaskTool(name))) &&
    !name.startsWith(SKILL_2)
  );
}
//@ chunk-5xgkngpb.js:1898042-1898281 placement
/**
 * 中断产生的 tool_result 行（会话结束/未复制/进程停止）。
 */
function isStopInterruptionRow(row) {
  return (
    row.type === "user" &&
    row.toolDenialKind === "interrupted" &&
    Array.isArray(row.message.content) &&
    row.message.content.length > 0 &&
    row.message.content.every(
      (block) =>
        block.type === "tool_result" &&
        (block.content === TOOL_CALL_SESSION_ENDED ||
          block.content === TOOL_RESULT_NOT_IN_COPY ||
          block.content === AGENT_CALL_PROCESS_STOPPED),
    )
  );
}
//@ chunk-5xgkngpb.js:1898281-1898431 placement
function toolResultIds(row) {
  return row.type === "user" && Array.isArray(row.message.content)
    ? row.message.content.flatMap((block) => (block.type === "tool_result" ? [block.tool_use_id] : []))
    : [];
}
//@ chunk-5xgkngpb.js:1898431-1898478 placement
function isShutdownInterruptedUserRow(row) {
  return row.type === "user" && isShutdownInterrupted(row);
}
//@ chunk-5xgkngpb.js:1898478-1898657 placement
function dropRedundantShutdownRows(rows) {
  if (!rows.some(isShutdownInterruptedUserRow)) return rows;
  let keptResultIds = new Set(
    rows.filter((row) => !isShutdownInterruptedUserRow(row)).flatMap(toolResultIds),
  );
  let filtered = rows.filter(
    (row) =>
      !(
        isShutdownInterruptedUserRow(row) &&
        toolResultIds(row).every((toolUseId) => keptResultIds.has(toolUseId))
      ),
  );
  return filtered.length === rows.length ? rows : filtered;
}
//@ chunk-5xgkngpb.js:1898657-1899294 placement
/**
 * 统计本回合被中断的工具步数及是否与上回合重复。
 */
function summarizeInterruptedSteps(messages, options) {
  let stepsById = new Map();
  let steps = [];
  let lastWasInterrupted = false;
  for (let message of messages) {
    if (message.type !== "user" && message.type !== "assistant") continue;
    if (!isStopInterruptionRow(message)) {
      lastWasInterrupted = false;
      if (message.type === "assistant") {
        for (let block of message.message.content)
          if (block.type === "tool_use")
            stepsById.set(block.id, {
              name: block.name,
              step:
                SHELL_TOOL_NAMES_2.includes(block.name) &&
                isPlainObject_5(block.input) &&
                typeof block.input.command === "string"
                  ? block.input.command
                  : block.input,
            });
      }
      continue;
    }
    if (!lastWasInterrupted) steps.push([]);
    lastWasInterrupted = true;
    for (let block of message.message.content) {
      let step =
        typeof block !== "string" && block.type === "tool_result"
          ? stepsById.get(block.tool_use_id)
          : undefined;
      if (step !== undefined) steps.at(-1).push(step);
    }
  }
  let previousSteps = steps.at(-2) ?? [];
  return {
    inTurn: steps.reduce((acc, step_2) => acc + step_2.length, 0),
    repeatsPrevious:
      options.size > 0 &&
      (steps.at(-1) ?? []).some((step_3) =>
        previousSteps.some((step_4) => import_sortedIndex_2(step_3, step_4)),
      ),
  };
}
//@ chunk-5xgkngpb.js:1899294-1899583 placement
function collectResumableToolUseIds(messages, options, extraToolNames, ownedToolNames) {
  let ids = new Set();
  for (let row of messages) {
    if (row.type !== "assistant" || row.handedOff === true || !Array.isArray(row.message.content)) continue;
    let filtered = row.message.content
      .filter((block) => block.type === "tool_use")
      .filter((block) => options.has(block.id));
    if (filtered.every((block_2) => isResumableToolName(block_2.name, extraToolNames, ownedToolNames)))
      for (let block_3 of filtered) ids.add(block_3.id);
  }
  return ids;
}
//@ chunk-5xgkngpb.js:1899583-1899598 placement
var REMOTE_DEVICE_MCP_PREFIX; // deferred: uses getMcpPrefix (../../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1899583", () => {
  REMOTE_DEVICE_MCP_PREFIX = getMcpPrefix_4(REMOTE_DEVICES);
});
//@ chunk-5xgkngpb.js:1899598-1899686 placement
function fullySettledToolUseIds(groups, options) {
  return new Set(
    groups
      .map(unresolvedToolUseIds)
      .filter((ids) => ids.every((id) => options.has(id)))
      .flat(),
  );
}
//@ chunk-5xgkngpb.js:1899686-1900368 placement
/**
 * 把关机中断的工具结果改写为指定的中断内容。
 */
function rewriteShutdownInterrupts(messages, options, rewrittenIds, resolvedIds) {
  let ids = new Set(resolvedIds);
  for (let row of messages)
    if (row.type === "user" && Array.isArray(row.message.content) && !isShutdownInterrupted(row)) {
      for (let block of row.message.content) if (block.type === "tool_result") ids.add(block.tool_use_id);
    }
  let unresolvedIds = new Set();
  return messages.map((row) => {
    for (let toolUseId of unresolvedToolUseIds(row)) if (!ids.has(toolUseId)) unresolvedIds.add(toolUseId);
    if (row.type !== "user" || !Array.isArray(row.message.content) || !isShutdownInterrupted(row)) return row;
    let { content } = row.message;
    if (!content.every((block) => block.type !== "tool_result" || unresolvedIds.has(block.tool_use_id)))
      return row;
    for (let block of content) if (block.type === "tool_result") rewrittenIds.add(block.tool_use_id);
    let { interruptedByShutdown, ...rest } = row;
    return {
      ...rest,
      toolUseResult: options,
      toolDenialKind: "interrupted",
      message: {
        ...row.message,
        content: content.map((block) =>
          block.type === "tool_result"
            ? {
                ...block,
                content: options,
              }
            : block,
        ),
      },
    };
  });
}
//@ chunk-5xgkngpb.js:1900368-1900430 placement
function isRemoteDeviceToolName(name) {
  return typeof name === "string" && name.startsWith(REMOTE_DEVICE_MCP_PREFIX);
}
//@ chunk-5xgkngpb.js:1900430-1900642 placement
function unresolvedToolUseIds(row) {
  if (row.type !== "assistant" || row.handedOff === true || !Array.isArray(row.message.content)) return [];
  let filtered = row.message.content.filter((block) => block.type === "tool_use");
  return filtered.every((block) => isRemoteDeviceToolName(block.name))
    ? filtered.map((block) => block.id)
    : [];
}
//@ chunk-5xgkngpb.js:1900642-1901711 placement
/**
 * 按类型校验附件负载（技能、钩子、文件、提醒等）。
 */
function isValidAttachmentPayload(attachment) {
  if (
    typeof attachment !== "object" ||
    attachment === null ||
    !("type" in attachment) ||
    typeof attachment.type !== "string"
  )
    return false;
  switch (attachment.type) {
    case "invoked_skills":
      return (
        "skills" in attachment &&
        Array.isArray(attachment.skills) &&
        attachment.skills.every((skill) => typeof skill === "object" && skill !== null)
      );
    case "hook_success":
      return "content" in attachment && typeof attachment.content === "string";
    case "skill_listing":
      return (
        !("names" in attachment) ||
        attachment.names === undefined ||
        (Array.isArray(attachment.names) &&
          attachment.names.length <= MAX_ATTACHMENT_NAMES &&
          attachment.names.every(
            (name) => typeof name === "string" && name.length <= MAX_ATTACHMENT_NAME_CHARS,
          ))
      );
    case "hook_additional_context":
      return (
        "content" in attachment &&
        Array.isArray(attachment.content) &&
        attachment.content.every((content) => typeof content === "string")
      );
    case "task_reminder":
    case "todo_reminder":
      return (
        "content" in attachment &&
        Array.isArray(attachment.content) &&
        attachment.content.every(isPlainObject_6)
      );
    case "file":
    case "already_read_file":
      return "content" in attachment && isPlainObject_6(attachment.content);
    case "withheld_memory":
      return (
        "by" in attachment &&
        typeof attachment.by === "string" &&
        attachment.by !== "" &&
        "entries" in attachment &&
        Array.isArray(attachment.entries) &&
        attachment.entries.every(
          (entry) =>
            isPlainObject_6(entry) &&
            "path" in entry &&
            typeof entry.path === "string" &&
            "why" in entry &&
            typeof entry.why === "string" &&
            Object.hasOwn(INSTRUCTION_WITHHELD_REASONS, entry.why) &&
            "displayPath" in entry &&
            typeof entry.displayPath === "string",
        )
      );
    default:
      return true;
  }
}
//@ chunk-5xgkngpb.js:1901711-1901732 placement
var MAX_ATTACHMENT_NAMES = 4096;
var MAX_ATTACHMENT_NAME_CHARS = 512;
//@ chunk-5xgkngpb.js:1901732-1902051 placement
/**
 * 过滤 type 为 attachment 但负载校验失败的条目，有丢弃时记录“转录部分损坏”的错误日志；无丢弃时原样返回。
 */
function dropMalformedAttachments(messages) {
  let dropped = 0;
  let filtered = messages.filter((message) => {
    if (message.type === "attachment" && !isValidAttachmentPayload(message.attachment)) {
      dropped += 1;
      return false;
    }
    return true;
  });
  if (dropped === 0) return messages;
  logForDebugging(
    `transcript load: dropped ${dropped} attachment ${plural(dropped, "entry", "entries")} with a missing or malformed payload \u2014 the session transcript appears partially corrupt`,
    {
      level: "error",
    },
  );
  return filtered;
}
//@ chunk-5xgkngpb.js:1902051-1902384 placement
/**
 * 提示来源不是人、自动续写或未分类（含排队命令）。
 */
function isMachineOriginPrompt(row) {
  let origin =
    row.type === "user"
      ? row.origin
      : row.type === "attachment" && row.attachment.type === "queued_command"
        ? row.attachment.origin
        : undefined;
  let resolvedOrigin = origin;
  if (typeof resolvedOrigin !== "object" || resolvedOrigin === null) return false;
  let kind = "kind" in resolvedOrigin ? resolvedOrigin.kind : undefined;
  return (
    kind !== "human" &&
    !isBareTaskNotificationOrigin(origin) &&
    kind !== "auto-continuation" &&
    kind !== "unclassified" &&
    !("senderTaskId" in resolvedOrigin && resolvedOrigin.senderTaskId !== undefined)
  );
}
//@ chunk-5xgkngpb.js:1902384-1902459 placement
/**
 * 取 user 行的压缩摘要提示 uuid 列表。
 */
function summarizedPromptUuids(row) {
  return row.type === "user" ? filterUuidList(row.summarizedTurnPromptUuids) : [];
}
//@ chunk-5xgkngpb.js:1902459-1902538 placement
class ResumeRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResumeRefusedError";
  }
}
//@ chunk-5xgkngpb.js:1902538-1902659 placement
/**
 * 恢复被拒时抛出 ResumeRefusedError。
 */
function assertResumeNotRefused(result) {
  if (result.refused !== undefined) {
    logEvent("tengu_repl_mode_resume_refused", {
      why: fromEnumOpt(result.refusedWhy),
    });
    throw new ResumeRefusedError(result.refused);
  }
}
//@ chunk-5xgkngpb.js:1902659-1902960 placement
/**
 * 交互类工具名与已废弃附件类型。
 */
var INTERACTIVE_TOOL_NAMES; // deferred: loads other modules while loading; runs once its import cycle is complete
var OBSOLETE_ATTACHMENT_TYPES;
deferInit("chunk-5xgkngpb.js:1902659", () => {
  INTERACTIVE_TOOL_NAMES = new Set([
    ASKUSERQUESTION,
    CONNECTGITHUB,
    EXITPLANMODE,
    OFFERCHROMESETUP,
    SHOWONBOARDINGROLEPICKER,
    require("../../services/projects/contextFile.js").CONTINUE_IN_PROJECTS_TOOL_NAME,
  ]);
  OBSOLETE_ATTACHMENT_TYPES = new Set([
    "compaction_reminder",
    "companion_intro",
    "echo_activities",
    "pen_mode_enter",
    "pen_mode_exit",
    "verify_plan_reminder",
    "fold_nudge",
    "context_tip",
    "audio_transcript",
    "new_file",
    "new_directory",
  ]);
});
//@ chunk-5xgkngpb.js:1907947-1908058 placement
/**
 * meta 用户行内容是中断标记。
 */
function isInterruptMarkerRow(row) {
  if (row.type !== "user" || row.isMeta !== true) return false;
  let text = singleTextContent(row.message.content);
  return isInterruptMarkerText_2(text) || text === WORKER_RESTARTED_PROMPT_2;
}
//@ chunk-5xgkngpb.js:1908058-1908165 placement
function isInterruptMarkerText_2(value) {
  if (value === undefined) return false;
  let override = resumePromptOverride();
  return (
    value === override ||
    value === deserializeMessagesWithInterruptDetection ||
    (WORKER_RESTARTED_PROMPT.includes(override) && WORKER_RESTARTED_PROMPT.includes(value))
  );
}
//@ chunk-5xgkngpb.js:1908165-1908242 placement
/**
 * 是否是无需当作真实提示的 user 行（伴随行、摘要、工具结果、中断）。
 */
function isNonPromptUserRow(row) {
  return (
    isTurnCompanion(row) ||
    row.isCompactSummary === true ||
    isToolUseResultMessage(row) ||
    isInterruptionOnlyMessage(row) ||
    isInterruptMarkerRow(row)
  );
}
//@ chunk-5xgkngpb.js:1908242-1908513 placement
/**
 * 最后一条真实用户提示的 uuid（可用压缩摘要中的提示）。
 */
function findLastUserPromptUuid(messages, { orSummarizedPrompt: options = false } = {}) {
  let uuid;
  let index = options;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let row = messages[idx];
    if (row.type !== "user") {
      index &&= !isCompactBoundaryMessage_3(row);
      continue;
    }
    if (!isRealPromptAt(messages, idx)) {
      if (index && row.isCompactSummary === true) {
        uuid = summarizedPromptUuids(row)[0];
        index = false;
      }
      continue;
    }
    return localCommandKind(row) !== undefined || row.isMeta || processQueuedCommands(row)
      ? undefined
      : row.uuid;
  }
  return uuid;
}
//@ chunk-5xgkngpb.js:1908513-1908613 placement
/**
 * 指定位置的 user 行是否是真实提示。
 */
function isRealPromptAt(messages, index) {
  let row = messages[index];
  if (row?.type !== "user" || isNonPromptUserRow(row)) return false;
  return localCommandKind(row) === undefined || !isLocalCommandRecordTail(messages, index);
}
//@ chunk-5xgkngpb.js:1908613-1908932 layout
function endedMidToolUse(baseMessages) {
  for (let idx = baseMessages.length - 1; idx >= 0; idx--) {
    let message = baseMessages[idx];
    if (isVirtualConversationMessage(message) || isQueueTranscriptOnlyUserMessage(message)) continue;
    if (
      isCompactBoundaryMessage_3(message) ||
      isRealPromptAt(baseMessages, idx) ||
      (message.type === "attachment" && message.attachment.type === "hook_deferred_tool")
    )
      return false;
    if (message.type !== "assistant" || isUnattendedStartUnconfirmed(message)) continue;
    if (isToolUseRequestMessage(message)) return true;
    if (message.isApiErrorMessage === true || message.message.stop_reason === "end_turn") return false;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1908932-1909002 placement
function hasTurnOriginFields(row) {
  return row.turnOrigin !== undefined || row.promptSource !== undefined;
}
//@ chunk-5xgkngpb.js:1909002-1909234 placement
function isPromptKeptAfter(messages, index) {
  for (let idx = index + 1; idx < messages.length; idx++) {
    let row = messages[idx];
    if (row.type === "system") {
      if (row.subtype === "informational" && row.promptSubmitEnding?.promptKept === true) return true;
    } else if (row.type === "assistant" || (row.type === "user" && hasTurnOriginFields(row))) return false;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1909234-1909520 placement
function hasOwnTurnInSession(messages, ownSessionId) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let row = messages[idx];
    if (row.type !== "user" && row.type !== "assistant") continue;
    if (!("sessionId" in row && row.sessionId === ownSessionId)) return false;
    if (
      row.type === "assistant"
        ? row.message.model !== SYNTHETIC_MODEL
        : hasTurnOriginFields(row) &&
          row.queueTranscriptOnly !== true &&
          !isContextAppendMessage(row) &&
          !isInterruptMarkerRow(row) &&
          !isPromptKeptAfter(messages, idx)
    )
      return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1909520-1909940 placement
/**
 * 开启 CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS 时去掉夹在用户行后的合成 API 错误。
 */
function dropContextAppendErrors(messages, options) {
  if (!env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS) return messages;
  let kept;
  for (let idx = 0; idx < messages.length; idx++) {
    let row = messages[idx];
    let previousRow = messages[idx - 1];
    if (
      previousRow?.type === "user" &&
      isNoResponseRequestedMessage(row) &&
      row.uuid !== options &&
      !(
        Array.isArray(previousRow.message.content) &&
        previousRow.message.content.length > 0 &&
        previousRow.message.content.every(
          (block) =>
            block.type === "tool_result" &&
            (block.content === TOOL_CALL_SESSION_ENDED ||
              block.content === TOOL_RESULT_NOT_IN_COPY ||
              block.content === AGENT_CALL_PROCESS_STOPPED),
        )
      )
    ) {
      kept ??= messages.slice(0, idx);
      if (isPlainInterruptMarker(previousRow) && previousRow.uuid !== options) kept.pop();
      continue;
    }
    kept?.push(row);
  }
  return kept ?? messages;
}
//@ chunk-5xgkngpb.js:1909940-1910059 placement
/**
 * 无 promptSource 的 meta 中断标记行。
 */
function isPlainInterruptMarker(message) {
  if (message.type !== "user" || message.isMeta !== true || message.promptSource !== undefined) return false;
  return isInterruptMarkerText_2(singleTextContent(message.message.content));
}
//@ chunk-5xgkngpb.js:1910059-1910154 placement
function isLegacyInterruptMarker(row) {
  return (
    isPlainInterruptMarker(row) &&
    row.type === "user" &&
    (singleTextContent(row.message.content) === deserializeMessagesWithInterruptDetection ||
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MIGHTY_FLASK, false) === true)
  );
}
//@ chunk-5xgkngpb.js:1910154-1910225 placement
/**
 * 反序列化远程会话日志为消息数组。
 */
function deserializeToMessages(entries, options) {
  return deserializeMessagesImpl(entries, undefined, undefined, undefined, undefined, options).messages;
}
//@ chunk-5xgkngpb.js:1910225-1910331 placement
var FILE_ATTACHMENT_TYPES = [
  "file",
  "directory",
  "pdf_reference",
  "compact_file_reference",
  "already_read_file",
  "nested_memory",
];
//@ chunk-5xgkngpb.js:1910418-1919817 placement
/**
 * 反序列化会话转录为消息列表，并为缺 id 的消息补上 id。
 */
function deserializeMessagesImpl(
  messages,
  requestedToolUseIds,
  fromOtherSession,
  resumeOptions,
  resumeInterrupted,
  showsCutOffCallsArg,
  hostAnswerableIds,
  restoredCardToolUseId,
  force = false,
  isRemote = false,
  turnContext,
  showsCutOffAgentCalls = false,
) {
  try {
    let resumeInterrupted_2 = resumeInterrupted ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN;
    let cutOffPreview = isCutOffPreviewEnabled();
    let lastToolUseMessage =
      turnContext &&
      messages.findLast(
        (message) =>
          message.type === "assistant" &&
          Array.isArray(message.message.content) &&
          message.message.content.some((block) => block.type === "tool_use"),
      );
    let fromOtherSession_2 =
      !!lastToolUseMessage &&
      !("sessionId" in lastToolUseMessage && lastToolUseMessage.sessionId === turnContext.ownSessionId);
    let interruptMessage = !cutOffPreview
      ? INTERRUPT_MESSAGE_FOR_TOOL_USE
      : showsCutOffCallsArg || fromOtherSession_2
        ? TOOL_RESULT_NOT_IN_COPY
        : TOOL_CALL_SESSION_ENDED;
    degradeRestoredMessages(messages);
    let afterStopHookFilter = filterStopHookSummariesOnResume(messages);
    let afterRetractedDrop = dropRetractedMessages_2(afterStopHookFilter);
    let cleanedMessages = dropMalformedAttachments(afterRetractedDrop);
    let anchorMessages = dropContextAppendErrors(cleanedMessages, resumeOptions);
    let stampedIdCount = 0;
    let mapped = anchorMessages.map((message) => {
      if (message.type === "assistant" && !message.message.id && message.requestId === undefined) {
        stampedIdCount += 1;
        return {
          ...message,
          message: {
            ...message.message,
            id: randomUUID(),
          },
        };
      }
      if (message.type === "user" && message.pluginPrompt === undefined) {
        let pluginPrompt = extractPluginPrompt(message);
        if (pluginPrompt !== undefined)
          return {
            ...message,
            pluginPrompt,
          };
      }
      return message;
    });
    if (stampedIdCount > 0)
      logForDebugging(
        `deserializeMessages: stamped a message.id on ${stampedIdCount} id-less assistant entr${stampedIdCount === 1 ? "y" : "ies"} (pre-#61940 stream-json injection)`,
      );
    let droppedTextCount = 0;
    let flattened = mapped
      .map(migrateLegacyAttachmentTypes)
      .filter((message) => message !== null)
      .flatMap((message) => {
        let repairedMessage = dropMalformedTextBlocks(message);
        if (repairedMessage === null) return [message];
        droppedTextCount += 1;
        let content = repairedMessage.message.content;
        if (Array.isArray(content) && content.length === 0) return [];
        return [repairedMessage];
      });
    if (droppedTextCount > 0)
      logForDebugging(
        `deserializeMessages: dropped non-string text block(s) from ${droppedTextCount} message(s) \u2014 interrupted-stream artifact`,
        {
          level: "warn",
        },
      );
    let sanitized = dropApiInvalidAssistantBlocks(flattened, {
      site: "resume",
    });
    for (let message of sanitized) {
      if (message.type === "assistant" && message.wireToolInputs !== undefined) {
        let recountedInputs = wireToolInputsForContent(
          message.wireToolInputs,
          message.message?.content,
          message.batchToolUses,
        );
        if (recountedInputs === undefined) delete message.wireToolInputs;
        else message.wireToolInputs = recountedInputs;
      }
      if (
        message.type === "assistant" &&
        (message.wireToolInputs !== undefined || message.wireIngestContext !== undefined)
      ) {
        let restoredStamps = restoreWireInputStamps(
          message.wireIngestContext,
          message.wireToolInputs,
          message.message?.content,
        );
        if (restoredStamps === undefined) delete message.wireIngestContext;
        else message.wireIngestContext = restoredStamps;
      }
    }
    let permissionModes = new Set(PERMISSION_MODES);
    let promptOrigins = new Set(PROMPT_ORIGIN_KINDS);
    for (let message of sanitized) {
      if (
        message.type === "user" &&
        message.permissionMode !== undefined &&
        !permissionModes.has(message.permissionMode)
      )
        message.permissionMode = undefined;
      if (message.type === "user" && message.promptId !== undefined) delete message.promptId;
      if (
        message.type === "user" &&
        message.turnOrigin !== undefined &&
        !promptOrigins.has(message.turnOrigin)
      )
        delete message.turnOrigin;
      if (
        message.type === "user" &&
        message.turnPosition !== undefined &&
        !isValidTurnPosition(message.turnPosition)
      )
        delete message.turnPosition;
      if (message.type === "user") {
        delete message.joinedNoticeOwn;
        for (let originField of ["origin", "queueOrigin"]) {
          let origin = message[originField];
          if (origin?.kind === "task-notification" && origin.producer !== undefined) {
            let { producer, ...withoutProducer } = origin;
            message[originField] = withoutProducer;
          }
        }
      }
      if (
        message.type === "attachment" &&
        message.attachment?.type === "queued_command" &&
        message.attachment.origin?.kind === "task-notification" &&
        message.attachment.origin.producer !== undefined
      ) {
        let { producer, ...withoutProducer } = message.attachment.origin;
        message.attachment = {
          ...message.attachment,
          origin: withoutProducer,
        };
      }
    }
    let regrouped = dropRedundantShutdownRows(regroupSplitResponsesOnResume(sanitized));
    let rewriteShutdown = cutOffPreview && !isRemoteToolsForwardEnabled();
    let cardAnsweredIds = new Set();
    let baseMessages = rewriteShutdown
      ? rewriteShutdownInterrupts(regrouped, interruptMessage, cardAnsweredIds, [
          restoredCardToolUseId,
          ...(hostAnswerableIds ?? []),
        ])
      : regrouped;
    let unresolvedCallIds = new Set();
    let unresolvedToolNames = new Map();
    let unresolvedCallsByResponse = new Map();
    let trailingUnresolvedIds = new Set();
    let isTail = isTailMessage(sanitized, resumeOptions);
    let ownSessionId = turnContext?.ownSessionId;
    let hasOwnTurn =
      resumeInterrupted_2 === true &&
      ownSessionId !== undefined &&
      !hasOwnTurnInSession(sanitized, ownSessionId);
    let resumePolicy = interruptedTurnResumePolicy(isRemote);
    let maxAgeMs = resumePolicy?.maxAgeMs ?? 0;
    let tooOld = isResumeTooOld(sanitized, maxAgeMs);
    let noRequestedAnchors = resumeInterrupted_2 && !requestedToolUseIds?.size && !fromOtherSession;
    let dropSiblings = noRequestedAnchors && !tooOld;
    let hasCutOffCalls = noRequestedAnchors && restoredCardToolUseId === undefined && showsCutOffCalls();
    let shouldDetailCutOffCalls = hasCutOffCalls && !tooOld;
    let normalizedMessages = normalizeMessagesForResume(
      baseMessages,
      requestedToolUseIds,
      dropSiblings
        ? {
            dropSiblingBlocks: true,
            outTrailingUnresolvedToolUseIds: unresolvedCallIds,
            outSupersededToolNames: unresolvedToolNames,
            outTrailingUnresolvedCallsByResponse: unresolvedCallsByResponse,
            shutdownUnwindResultsDoNotResolve: true,
          }
        : {
            outTrailingUnresolvedToolUseIds: trailingUnresolvedIds,
          },
    );
    let cutOffCallIds =
      rewriteShutdown &&
      restoredCardToolUseId === undefined &&
      ![...unresolvedCallIds].some((id) => hostAnswerableIds?.has(id))
        ? findUnresolvedToolUses_2(
            baseMessages,
            fullySettledToolUseIds(baseMessages, unresolvedCallIds),
            true,
          )
        : new Set();
    for (let id of cutOffCallIds) {
      unresolvedCallIds.delete(id);
      unresolvedToolNames.delete(id);
    }
    let withToolResults =
      cutOffCallIds.size === 0
        ? normalizedMessages
        : applyResumeNormalization(
            baseMessages,
            requestedToolUseIds,
            cutOffCallIds,
            cutOffCallIds,
            interruptMessage,
            {
              dropSiblingBlocks: true,
              shutdownUnwindResultsDoNotResolve: true,
            },
          );
    let messages_2 = filterThinkingOnlyUntilStable(withToolResults);
    let last = withToolResults.findLast(
      (message) =>
        (message.type === "assistant" && !isUnattendedStartUnconfirmed(message)) ||
        (message.type === "user" &&
          !isContextAppendMessage(message) &&
          !isQueueTranscriptOnlyUserMessage(message)),
    );
    let endsWithVisibleText =
      unresolvedCallIds.size === 0 &&
      last?.type === "assistant" &&
      last.message.stop_reason === "end_turn" &&
      messages_2.lastIndexOf(last) === -1 &&
      last.message.content.some((block) => block.type === "text" && block.text.trim().length > 0);
    let invisibleReplyLast =
      last?.type === "assistant" && !last.isApiErrorMessage && messages_2.lastIndexOf(last) === -1;
    let silentReplyAfterTool =
      invisibleReplyLast &&
      last.message.stop_reason === "end_turn" &&
      unresolvedCallIds.size === 0 &&
      trailingUnresolvedIds.size === 0 &&
      !withToolResults
        .slice(withToolResults.lastIndexOf(last))
        .some(
          (message) =>
            message.type === "attachment" &&
            (message.attachment.type === "hook_additional_context" ||
              message.attachment.type === "hook_blocking_error") &&
            message.attachment.hookEvent === "Stop",
        ) &&
      endedOnAnsweredNoReplyTool(withToolResults.slice(0, withToolResults.lastIndexOf(last)));
    let turnKinds =
      restoredCardToolUseId !== undefined &&
      isFoamySpringEnabled() &&
      unresolvedCallIds.has(restoredCardToolUseId)
        ? "restored_card"
        : turnsWithInteractiveTools(unresolvedCallsByResponse, unresolvedToolNames, hostAnswerableIds);
    let withoutCutOff =
      cutOffCallIds.size === 0 ? undefined : filterThinkingOnlyUntilStable(normalizedMessages);
    let cutOffState = withoutCutOff && classifyTurnState(withoutCutOff, true, turnKinds);
    let turnState =
      requestedToolUseIds?.size || fromOtherSession
        ? {
            state: {
              kind: "none",
              because: "not_judged",
            },
            skippedApiErrorRow: undefined,
          }
        : cutOffState?.state.kind === "none"
          ? cutOffState
          : classifyTurnState(messages_2, unresolvedCallIds.size > 0, turnKinds, endsWithVisibleText, last);
    let tailAfterTurn =
      hasOwnTurn ||
      isTail ||
      isTailMessage(messages_2, resumeOptions) ||
      (withoutCutOff !== undefined && isTailMessage(withoutCutOff, resumeOptions));
    let noReplyNote = false;
    if (
      resumeInterrupted_2 &&
      turnState.state.kind === "interrupted_turn" &&
      turnState.state.tail === "context_rows" &&
      unresolvedCallIds.size === 0 &&
      trailingUnresolvedIds.size === 0 &&
      cutOffCallIds.size === 0 &&
      restoredCardToolUseId === undefined &&
      !hostAnswerableIds?.size &&
      !isRemote &&
      !tooOld &&
      !isResumeTooOld(messages_2, maxAgeMs) &&
      !tailAfterTurn &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_partitioned_finch", true)
    ) {
      let sawQueuedNotice = false;
      let sawFileAttachment = false;
      let anchorIndex = -1;
      for (let idx = cleanedMessages.length - 1; idx >= 0 && anchorIndex < 0; idx--) {
        let attachment = cleanedMessages[idx];
        if (
          attachment.type === "system" ||
          attachment.type === "progress" ||
          (attachment.type === "attachment" &&
            "hookEvent" in attachment.attachment &&
            (attachment.attachment.hookEvent === "SessionStart" ||
              (attachment.attachment.hookEvent === "Stop" &&
                sawQueuedNotice &&
                (attachment.attachment.type === "hook_success" ||
                  attachment.attachment.type === "hook_non_blocking_error"))))
        )
          continue;
        if (isRemoteSessionChangeAttachment(attachment)) sawFileAttachment = true;
        else if (
          attachment.type === "user" &&
          attachment.isMeta === true &&
          attachment.queueTranscriptOnly === true
        ) {
          sawQueuedNotice = true;
          sawFileAttachment = false;
        } else anchorIndex = idx;
      }
      let anchorMessage = cleanedMessages[anchorIndex];
      let anchorPosition =
        anchorMessage?.uuid === undefined
          ? -1
          : messages_2.findLastIndex((message) => message.uuid === anchorMessage.uuid);
      let anchorProcessed = messages_2[anchorPosition];
      noReplyNote =
        sawQueuedNotice &&
        !sawFileAttachment &&
        (anchorMessage === undefined ||
          (anchorProcessed?.type === "assistant" &&
            !anchorProcessed.isApiErrorMessage &&
            anchorProcessed.message.stop_reason === "end_turn") ||
          (anchorProcessed?.type === "user" &&
            isToolUseResultMessage(anchorProcessed) &&
            findToolOnlyResponseId(messages_2, anchorPosition, anchorProcessed) !== undefined) ||
          isToolOnlyResponse(messages_2, anchorPosition));
    }
    let resolvedState =
      silentReplyAfterTool &&
      turnState.state.kind === "interrupted_turn" &&
      turnState.state.tail === "tool_result"
        ? {
            state: {
              kind: "none",
              because: "silent_reply_after_terminal_tool",
            },
            skippedApiErrorRow: turnState.skippedApiErrorRow,
          }
        : noReplyNote
          ? {
              state: {
                kind: "none",
                because: "no_reply_note",
              },
              skippedApiErrorRow: turnState.skippedApiErrorRow,
            }
          : turnState;
    let classifyTrailing = noRequestedAnchors && tooOld && resolvedState.state.kind === "none";
    let { state, skippedApiErrorRow } = classifyTrailing
      ? classifyTrailingToolUse(baseMessages)
      : resolvedState;
    let endedAtMaxTurns = resolvedState.endedAtMaxTurns === true && state.kind === "none";
    if (endedAtMaxTurns)
      logEvent("tengu_max_turns_turn_classified_complete", {
        auto_resume: resumeInterrupted_2 === true,
      });
    let tailSkipped = state.kind !== "none" && tailAfterTurn;
    let staleTurn =
      !tailSkipped &&
      state.kind !== "none" &&
      (unresolvedCallIds.size > 0 || classifyTrailing ? tooOld : isResumeTooOld(messages_2, maxAgeMs));
    let messageAgeMs = lastMessageAgeMs(sanitized);
    let ageMinutes = messageAgeMs === undefined ? undefined : Math.floor(messageAgeMs / 60000);
    if (staleTurn && resumeInterrupted_2)
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        ...(ageMinutes !== undefined && {
          age_min: ageMinutes,
        }),
        ...(resumePolicy !== undefined && {
          bound_source: fromEnum(resumePolicy.source),
          bound_min: Math.floor(resumePolicy.maxAgeMs / 60000),
        }),
      });
    let apiErrorRow =
      state.kind === "none" && !endedAtMaxTurns
        ? skippedApiErrorRow
        : newerMessage(
            skippedApiErrorRow,
            classifyTurnState(baseMessages, unresolvedCallIds.size > 0, turnKinds).skippedApiErrorRow,
          );
    let retryBound = refusalRetryMaxAge();
    let staleApiError =
      !tailSkipped &&
      !staleTurn &&
      state.kind !== "none" &&
      apiErrorRow !== undefined &&
      isOlderThan(apiErrorRow, retryBound.maxAgeMs);
    if (staleApiError && resumeInterrupted_2) {
      let ageMs = Date.now() - Date.parse(apiErrorRow.timestamp ?? "");
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        tail: lit_2("api_error"),
        error_kind: fromEnum(apiErrorKind(apiErrorRow)),
        ...(Number.isFinite(ageMs) && {
          age_min: Math.floor(ageMs / 60000),
        }),
        bound_source: fromEnum(retryBound.source),
        bound_min: Math.floor(retryBound.maxAgeMs / 60000),
      });
    }
    let maxTurnsStale =
      endedAtMaxTurns &&
      (tailAfterTurn ||
        isResumeTooOld(messages_2, maxAgeMs) ||
        (apiErrorRow !== undefined && isOlderThan(apiErrorRow, retryBound.maxAgeMs)));
    let tailFacts = {
      apiErrorSteppedOver: apiErrorRow !== undefined,
      invisibleReplyDropped: invisibleReplyLast,
    };
    let last_2 = sanitized.findLast(
      (message) =>
        (message.type === "user" || message.type === "assistant") &&
        !("isSidechain" in message && message.isSidechain === true),
    );
    let ageFacts = {
      ageMinutes,
      shutdownStamped: last_2?.type === "user" && last_2.interruptedByShutdown === true,
    };
    let reportableCutOffIds =
      shouldDetailCutOffCalls &&
      unresolvedCallIds.size > 0 &&
      !tailAfterTurn &&
      ![...unresolvedCallIds].some((id) => hostAnswerableIds?.has(id))
        ? findUnresolvedToolUses_2(
            baseMessages,
            collectResumableToolUseIds(
              baseMessages,
              unresolvedCallIds,
              INTERACTIVE_TOOL_NAMES,
              showsCutOffAgentCalls &&
                state.kind === "interrupted_turn" &&
                !staleApiError &&
                !showsCutOffCallsArg,
            ),
            true,
          )
        : new Set();
    let agentCallCount = countWhere([...reportableCutOffIds], (id) =>
      isAgentOrTaskTool(unresolvedToolNames.get(id)),
    );
    let interruption;
    let allCutOffIds = cutOffCallIds;
    let deferPrompt = false;
    if (reportableCutOffIds.size > 0) {
      allCutOffIds = new Set([...cutOffCallIds, ...reportableCutOffIds]);
      messages_2 = applyResumeNormalization(
        baseMessages,
        requestedToolUseIds,
        allCutOffIds,
        allCutOffIds,
        interruptMessage,
        {
          dropSiblingBlocks: true,
          shutdownUnwindResultsDoNotResolve: true,
        },
        state.kind === "none" || staleApiError,
        AGENT_CALL_PROCESS_STOPPED,
      );
    }
    if (tailSkipped || staleTurn || staleApiError)
      interruption = {
        kind: "none",
      };
    else if (
      state.kind === "interrupted_turn" ||
      (state.kind === "interrupted_prompt" && reportableCutOffIds.size > 0)
    ) {
      if (trailingUnresolvedIds.size > 0) {
        messages_2 = applyResumeNormalization(
          baseMessages,
          requestedToolUseIds,
          trailingUnresolvedIds,
          cutOffPreview
            ? findUnresolvedToolUses_2(baseMessages, trailingUnresolvedIds, false)
            : trailingUnresolvedIds,
          interruptMessage,
        );
        allCutOffIds = trailingUnresolvedIds;
      }
      let [resumePromptMessage] = normalizeMessages([
        createUserMessage({
          content: resumePromptOverride(),
          isMeta: true,
        }),
      ]);
      if (resumeInterrupted_2 || !cutOffPreview) messages_2.push(resumePromptMessage);
      else deferPrompt = true;
      let apiErrorBeforePrompt =
        unresolvedCallIds.size === 0 && trailingUnresolvedIds.size === 0 ? apiErrorRow : undefined;
      let apiErrorKindForPrompt =
        apiErrorBeforePrompt?.apiErrorCode === CCS_NO_REQUEST_TOKEN
          ? "no_request_token"
          : apiErrorBeforePrompt?.error === "rate_limit" || apiErrorBeforePrompt?.error === "model_not_found"
            ? apiErrorBeforePrompt.error
            : (apiErrorBeforePrompt?.apiErrorStatus ?? 0) >= 500
              ? "server_error"
              : apiErrorBeforePrompt?.failedResponseHadNoToolCall
                ? "other"
                : undefined;
      let lastUserPromptUuid = findLastUserPromptUuid(baseMessages, {
        orSummarizedPrompt:
          apiErrorKindForPrompt === "rate_limit" || apiErrorKindForPrompt === "no_request_token",
      });
      let cutOffMidWork;
      if (resumeInterrupted_2 && !showsCutOffCallsArg)
        try {
          cutOffMidWork = apiErrorRow === undefined && endedMidToolUse(baseMessages);
        } catch (error) {
          logError(withTelemetryMessage(toError(error), "wasPastItsFirstRequest failed"));
        }
      interruption = {
        kind: "interrupted_prompt",
        message: resumePromptMessage,
        ...(lastUserPromptUuid !== undefined && {
          interruptedTurnUserMessageUuid: lastUserPromptUuid,
        }),
        ...(cutOffMidWork !== undefined && {
          cutOffMidWork,
        }),
        tail: {
          kind: state.kind === "interrupted_turn" ? state.tail : "cut_off_call_after_prompt",
          ...tailFacts,
          ...ageFacts,
          ...(shouldDetailCutOffCalls && {
            cutOffCalls: {
              shown: reportableCutOffIds.size,
              ...(agentCallCount > 0 && {
                shownAgentCalls: agentCallCount,
              }),
              hidden: unresolvedCallIds.size - reportableCutOffIds.size,
              ...summarizeInterruptedSteps(
                messages_2.slice(
                  messages_2.findLastIndex((message) => findLastUserPromptUuid([message]) === message.uuid) +
                    1,
                ),
                reportableCutOffIds,
              ),
            },
          }),
        },
        ...(resumeInterrupted_2 &&
          apiErrorKindForPrompt !== undefined && {
            endedOnApiError: apiErrorKindForPrompt,
          }),
      };
    } else if (state.kind === "interrupted_prompt")
      interruption = {
        ...state,
        tail: {
          kind: "unanswered_prompt",
          ...tailFacts,
          ...ageFacts,
        },
      };
    else
      interruption = {
        kind: state.kind,
      };
    let notContinuedReason = tailSkipped
      ? hasOwnTurn
        ? "not_continued_copied_tail"
        : "not_continued_rewind_anchor"
      : staleTurn
        ? "not_continued_too_old"
        : staleApiError
          ? "not_continued_api_error_too_old"
          : resolvedState.state.kind === "none"
            ? resolvedState.state.because
            : undefined;
    if (interruption.kind === "none" && notContinuedReason !== undefined)
      recordTailDiagnostics(
        interruption,
        sanitized,
        (message) => {
          let lastUserPromptUuid = findLastUserPromptUuid([message]);
          return lastUserPromptUuid !== undefined && lastUserPromptUuid === message.uuid;
        },
        (message) => message.type === "user" && isNonPromptUserRow(message),
        {
          because: notContinuedReason,
          callsWithoutResult: unresolvedCallIds.size + trailingUnresolvedIds.size + cutOffCallIds.size,
          ...tailFacts,
          ...(apiErrorRow !== undefined &&
            apiErrorKind(apiErrorRow) === "rate_limit" && {
              rateLimitRowSteppedOver: true,
            }),
        },
        force,
      );
    let any = [...trailingUnresolvedIds].some((id) => hostAnswerableIds?.has(id) ?? false);
    let resumeCutOffOlderTurn =
      hasCutOffCalls && tooOld && !isRemote && !hostAnswerableIds?.size && interruption.kind === "none";
    let options = new Set();
    if (resumeCutOffOlderTurn)
      normalizeMessagesForResume(baseMessages, requestedToolUseIds, {
        outTrailingUnresolvedToolUseIds: options,
        shutdownUnwindResultsDoNotResolve: true,
      });
    let cutOffCallIdsToResume = resumeCutOffOlderTurn
      ? collectResumableToolUseIds(baseMessages, options, INTERACTIVE_TOOL_NAMES, false)
      : trailingUnresolvedIds;
    let hostCutOffIds =
      cutOffPreview &&
      (!resumeInterrupted_2 || resumeCutOffOlderTurn) &&
      allCutOffIds.size === 0 &&
      cutOffCallIdsToResume.size > 0 &&
      !requestedToolUseIds?.size &&
      !fromOtherSession &&
      !any &&
      !tailAfterTurn
        ? findUnresolvedToolUses_2(baseMessages, cutOffCallIdsToResume, true)
        : new Set();
    if (hostCutOffIds.size > 0) {
      messages_2 = dropRedundantShutdownRows(
        applyResumeNormalization(
          baseMessages,
          requestedToolUseIds,
          hostCutOffIds,
          hostCutOffIds,
          interruptMessage,
          undefined,
          resumeCutOffOlderTurn,
        ),
      );
      allCutOffIds = hostCutOffIds;
    }
    let startIndex = messages_2.findLastIndex(
      (message) => message.type !== "system" && message.type !== "progress",
    );
    let lastType = messages_2[startIndex]?.type;
    if (
      !fromOtherSession &&
      startIndex !== -1 &&
      (lastType === "user" || (deferPrompt && lastType === "attachment")) &&
      !isLocalCommandRecordTail(messages_2, startIndex) &&
      !(interruption.kind === "none" && isSyntheticMessage_2(messages_2, startIndex)) &&
      !(state.kind === "none" && isQueueTranscriptOnlyUserMessage(messages_2[startIndex]))
    )
      messages_2.splice(
        startIndex + 1,
        0,
        createAssistantMessage({
          content: NO_RESPONSE_REQUESTED,
        }),
      );
    for (let id of reportableCutOffIds) {
      unresolvedCallIds.delete(id);
      unresolvedToolNames.delete(id);
    }
    return {
      messages: messages_2,
      turnInterruptionState: interruption,
      supersededToolUseIds: unresolvedCallIds,
      supersededToolNames: unresolvedToolNames,
      answeredToolUseIds: new Set([...allCutOffIds, ...cardAnsweredIds]),
      rescueSuppressed: tailSkipped || staleTurn || staleApiError || maxTurnsStale,
    };
  } catch (error) {
    logError(error);
    throw error;
  }
}
//@ chunk-5xgkngpb.js:1919817-1920067 placement
function classifyTrailingToolUse(messages) {
  let unresolvedIds = new Set();
  let normalizedMessages = normalizeMessagesForResume(messages, undefined, {
    dropSiblingBlocks: true,
    outTrailingUnresolvedToolUseIds: unresolvedIds,
    shutdownUnwindResultsDoNotResolve: true,
  });
  if (unresolvedIds.size === 0)
    return {
      state: {
        kind: "none",
        because: "other",
      },
      skippedApiErrorRow: undefined,
    };
  return classifyTurnState(filterThinkingOnlyUntilStable(normalizedMessages), true, NO_INTERACTIVE_TOOLS);
}
//@ chunk-5xgkngpb.js:1920067-1920225 placement
function messageHasToolUse(message, wantedIds) {
  return message.type === "assistant" && Array.isArray(message.message.content)
    ? message.message.content.flatMap((block) =>
        block.type === "tool_use" && wantedIds.has(block.id) ? [block.id] : [],
      )
    : [];
}
//@ chunk-5xgkngpb.js:1920225-1920985 placement
/**
 * 找出最后一组助手消息中未得到结果的工具调用。
 */
function findUnresolvedToolUses_2(messages, wantedIds, isResumingTurn) {
  let stableMessages = filterThinkingOnlyUntilStable(messages);
  let isSkippableAssistant = (row) =>
    isVirtualConversationMessage(row) || (!isResumingTurn && isSyntheticModelApiErrorMessage(row));
  let isToolResultUserRow = (message) =>
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((block) => block.type === "tool_result");
  let seenIds = new Set();
  let endedSentinel = Symbol("ended");
  let lastId = endedSentinel;
  let unresolvedIds = new Set();
  let turnSoFar = {
    toolResult: false,
    classified: false,
  };
  for (let message of stableMessages) {
    if (message.type === "assistant" && !isSkippableAssistant(message)) {
      if (isResumingTurn && isSyntheticModelApiErrorMessage(message)) {
        lastId = endedSentinel;
        unresolvedIds = new Set();
        continue;
      }
      if (turnSoFar && !turnSoFar.classified) {
        if (!turnSoFar.toolResult) seenIds.clear();
        turnSoFar.classified = true;
      }
      if (seenIds.has(message.message.id)) {
        if (message.message.id === lastId)
          for (let id of messageHasToolUse(message, wantedIds)) unresolvedIds.add(id);
        continue;
      }
      seenIds.add(message.message.id);
      lastId = message.message.id;
      unresolvedIds = new Set(messageHasToolUse(message, wantedIds));
      turnSoFar = undefined;
      continue;
    }
    if (
      (message.type === "user" && !isVirtualConversationMessage(message)) ||
      isSystemLocalCommandMessage(message)
    ) {
      turnSoFar ??= {
        toolResult: false,
        classified: false,
      };
      if (isToolResultUserRow(message)) turnSoFar.toolResult = true;
      continue;
    }
    if (isResumingTurn && message.type === "system" && message.subtype === "model_refusal_fallback") {
      lastId = endedSentinel;
      unresolvedIds = new Set();
    }
  }
  return unresolvedIds;
}
//@ chunk-5xgkngpb.js:1920985-1921515 layout
function applyResumeNormalization(
  baseMessages,
  requestedToolUseIds,
  cutOffCallIds,
  idsToClose,
  interruptMessage,
  resumeOptions,
  endsTurn = false,
  agentInterruptMessage = interruptMessage,
) {
  let sliced = filterThinkingOnlyUntilStable(
    normalizeMessagesForResume(
      baseMessages,
      new Set([...(requestedToolUseIds ?? []), ...cutOffCallIds]),
      resumeOptions,
    ),
  ).slice();
  let usesSourceUuid = isCcsTenant() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLUMB_MARTEN, false);
  let closingRows = [];
  for (let message of sliced) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || !idsToClose.has(block.id)) continue;
      let closeContent = isAgentOrTaskTool(block.name) ? agentInterruptMessage : interruptMessage;
      closingRows.push(
        createUserMessage({
          content: [
            {
              type: "tool_result",
              content: closeContent,
              is_error: true,
              tool_use_id: block.id,
            },
          ],
          toolUseResult: closeContent,
          toolDenialKind: "interrupted",
          ...(endsTurn && {
            toolDenialEndsTurn: true,
          }),
          ...(!usesSourceUuid && {
            sourceToolAssistantUUID: message.uuid,
          }),
        }),
      );
    }
  }
  sliced.push(...closingRows);
  return sliced;
}
//@ chunk-5xgkngpb.js:1921515-1921727 placement
function classifyTurnState(
  messages,
  isResumingTurn,
  interactiveToolNames,
  shutdownUnwindResultsDoNotResolve = false,
  retryMaxAge,
) {
  let skippedApiErrorRows = [];
  let refusalState = classifyRefusalTurn(
    messages,
    isResumingTurn,
    interactiveToolNames,
    skippedApiErrorRows,
    shutdownUnwindResultsDoNotResolve,
    retryMaxAge,
  );
  let skippedApiErrorRow = skippedApiErrorRows[0];
  return refusalState.kind === "ended_at_max_turns"
    ? {
        state: {
          kind: "none",
          because: "max_turns",
        },
        skippedApiErrorRow,
        endedAtMaxTurns: true,
      }
    : {
        state: refusalState,
        skippedApiErrorRow,
      };
}
//@ chunk-5xgkngpb.js:1921727-1924984 placement
/**
 * 分类转录中的拒绝回合（无回合行、已完成等）。
 */
function classifyRefusalTurn(
  messages,
  isResumingTurn,
  interactiveToolNames,
  skippedApiErrorRows,
  shutdownUnwindResultsDoNotResolve,
  retryMaxAge,
) {
  if (messages.length === 0) return interruptedTail(isResumingTurn, "no_turn_rows");
  let lastIndex = -1;
  let sawQueuedNote = false;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message.type === "system" || message.type === "progress") continue;
    if (isQueueTranscriptOnlyUserMessage(message)) {
      sawQueuedNote = true;
      continue;
    }
    if (message.type === "assistant" && isApiErrorWithoutRefusal(message)) {
      if (!isUnattendedStartUnconfirmed(message)) skippedApiErrorRows.push(message);
      continue;
    }
    lastIndex = idx;
    break;
  }
  let lastMessage = lastIndex !== -1 ? messages[lastIndex] : undefined;
  if (!lastMessage) return interruptedTail(isResumingTurn, "no_turn_rows");
  if (lastMessage.type === "assistant") {
    if (lastMessage.isApiErrorMessage) {
      logEvent("tengu_refusal_turn_classified_complete", {
        verdict: fromEnum(refusalKind(lastMessage)),
      });
      return {
        kind: "none",
        because: "terminal_api_error",
      };
    }
    return refusalTailState(interactiveToolNames, isResumingTurn);
  }
  let isContextRow = lastMessage.type === "attachment" || isContextAppendMessage(lastMessage);
  if (lastMessage.type === "user" && !isContextRow) {
    if (isLocalCommandRecordTail(messages, lastIndex))
      return interruptedTail(isResumingTurn, "local_command");
    if (
      isContinuationPrompt(lastMessage) &&
      lastMessage === retryMaxAge &&
      !isOlderThan(lastMessage, refusalRetryMaxAge().maxAgeMs) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_plover", true)
    )
      return {
        kind: "interrupted_turn",
        tail: "cut_reply_nudge",
      };
    if (isEndTurnNudgeRow(lastMessage, retryMaxAge))
      return {
        kind: "interrupted_turn",
        tail: "end_turn_overridden_nudge",
      };
    let toolResultIndex = findLastToolResultIndex(messages, lastIndex);
    if (
      toolResultIndex !== -1 &&
      !isResumingTurn &&
      !isContinuationPrompt(lastMessage) &&
      lastMessage === retryMaxAge &&
      !isOlderThan(lastMessage, refusalRetryMaxAge().maxAgeMs) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_candid_heron", true)
    )
      return classifyRefusalTurn(
        messages.slice(0, toolResultIndex + 1),
        isResumingTurn,
        interactiveToolNames,
        skippedApiErrorRows,
        shutdownUnwindResultsDoNotResolve,
        retryMaxAge,
      );
    if (lastMessage.isMeta || lastMessage.isCompactSummary)
      return interruptedTail(isResumingTurn, lastMessage.isCompactSummary ? "compact_summary" : "hidden_row");
    if (isInterruptMarkerText(lastMessage)) return stopMarkerState(lastMessage);
    if (isToolUseResultMessage(lastMessage)) {
      let toolEnding = classifyToolResultEnding(
        lastMessage,
        messages,
        lastIndex,
        shutdownUnwindResultsDoNotResolve,
      );
      if (toolEnding?.endsTurn)
        return terminalToolResultState(toolEnding.responseId, interactiveToolNames, isResumingTurn);
      if (isEndedForDeliveryRow(lastMessage))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      if (hasTurnEndingDenial(messages, lastIndex))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      if (isBackgroundedByAbort(lastMessage))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      if (codeModeAccepted() && isAsyncDispatchedKeptResult(lastMessage))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      let toolOnlyResponseId = findToolOnlyResponseId(messages, lastIndex, retryMaxAge);
      if (toolOnlyResponseId !== undefined)
        return terminalToolResultState(toolOnlyResponseId, interactiveToolNames, isResumingTurn);
      if (isToolOnlyResponse(messages, lastIndex))
        return interruptedTail(isResumingTurn, "deliberate_stop_result");
      return {
        kind: "interrupted_turn",
        tail: toolResultTailKind(toolEnding),
      };
    }
    if (processQueuedCommands(lastMessage))
      return {
        kind: "interrupted_turn",
        tail: "task_notification",
      };
    let promptSource = userPromptSourceKind(lastMessage);
    if (promptSource !== undefined)
      return promptSource === "input" || isAfterCaveatInput(messages, lastIndex)
        ? interruptedTail(isResumingTurn, "local_command")
        : {
            kind: "interrupted_turn",
            tail: "bash_command",
          };
    if (sawQueuedNote)
      return {
        kind: "interrupted_turn",
        tail: "note_after_prompt",
      };
    if (skippedApiErrorRows.length > 0)
      return {
        kind: "interrupted_turn",
        tail: "context_rows",
      };
    return {
      kind: "interrupted_prompt",
      message: lastMessage,
    };
  }
  if (isContextRow) {
    let sawUserRow = false;
    let maxTurnsRow = false;
    for (let index = lastIndex; index >= 0; index--) {
      let message = messages[index];
      if (
        message.type === "system" ||
        message.type === "progress" ||
        message.type === "attachment" ||
        isContextAppendMessage(message)
      ) {
        sawUserRow ||= message.type === "user";
        maxTurnsRow ||=
          message.type === "attachment" &&
          message.attachment.type === "max_turns_reached" &&
          message.attachment.exitCommitted === false;
        continue;
      }
      if (isQueueTranscriptOnlyUserMessage(message)) {
        sawQueuedNote = true;
        continue;
      }
      if (message.type === "assistant") {
        if (isApiErrorWithoutRefusal(message)) {
          if (!isUnattendedStartUnconfirmed(message)) skippedApiErrorRows.push(message);
          continue;
        }
        if (message.isApiErrorMessage) {
          logEvent("tengu_refusal_turn_classified_complete", {
            verdict: fromEnum(refusalKind(message)),
          });
          return {
            kind: "none",
            because: "terminal_api_error",
          };
        }
        if (sawUserRow) return interruptedTail(isResumingTurn, "reply_then_reminder");
        return refusalTailState(interactiveToolNames, isResumingTurn);
      }
      if (message.type === "user" && message.isCompactSummary)
        return interruptedTail(isResumingTurn, "compact_summary");
      if (message.type === "user" && isInterruptMarkerText(message)) return stopMarkerState(message);
      if (message.type === "user" && isLocalCommandRecordTail(messages, index))
        return interruptedTail(isResumingTurn, "local_command");
      let tailKind = "context_rows";
      if (message.type === "user" && isToolUseResultMessage(message)) {
        let toolEnding = classifyToolResultEnding(
          message,
          messages,
          index,
          shutdownUnwindResultsDoNotResolve,
        );
        if (toolEnding?.endsTurn)
          return terminalToolResultState(toolEnding.responseId, interactiveToolNames, isResumingTurn);
        tailKind = toolResultTailKind(toolEnding);
        if (
          isEndedForDeliveryRow(message) ||
          isBackgroundedByAbort(message) ||
          hasTurnEndingDenial(messages, index) ||
          (codeModeAccepted() && isAsyncDispatchedKeptResult(message))
        )
          return {
            kind: "none",
            because: "deliberate_stop_result",
          };
      }
      let toolOnlyResponseId = findToolOnlyResponseId(messages, index, retryMaxAge);
      if (toolOnlyResponseId !== undefined)
        return terminalToolResultState(toolOnlyResponseId, interactiveToolNames, isResumingTurn);
      if (maxTurnsRow && !isResumingTurn)
        return {
          kind: "ended_at_max_turns",
        };
      if (isToolOnlyResponse(messages, lastIndex))
        return interruptedTail(isResumingTurn, "deliberate_stop_result");
      return {
        kind: "interrupted_turn",
        tail: maxTurnsRow ? "unresolved_call" : tailKind,
      };
    }
    return sawUserRow || (sawQueuedNote && env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS)
      ? interruptedTail(isResumingTurn, "no_turn_rows")
      : {
          kind: "interrupted_turn",
          tail: "context_rows",
        };
  }
  return {
    kind: "none",
    because: "other",
  };
}
//@ chunk-5xgkngpb.js:1924984-1925377 placement
/**
 * 末尾是否本地命令记录（带 caveat）。
 */
function isLocalCommandRecordTail(messages, startIndex) {
  if (localCommandOrSlashKind(messages[startIndex]) === undefined) return false;
  let sawRecord = false;
  let recordTimestamp;
  let allMeta = true;
  for (let index = startIndex; index >= 0; index--) {
    let row = messages[index];
    if (row.type === "system" || row.type === "progress" || row.type === "attachment") continue;
    let kind = localCommandOrSlashKind(row);
    if (kind === "caveat")
      return recordTimestamp === undefined || Date.parse(row.timestamp) >= recordTimestamp;
    if (kind === undefined || sawRecord) break;
    sawRecord = kind === "record" || kind === "bareRecord";
    if (kind === "bareRecord") recordTimestamp = Date.parse(row.timestamp);
    allMeta &&= row.type === "user" && row.isMeta === true;
  }
  return allMeta;
}
//@ chunk-5xgkngpb.js:1925377-1925589 placement
function isAfterCaveatInput(messages, startIndex) {
  let sawInput = false;
  for (let idx = startIndex - 1; idx >= 0; idx--) {
    let row = messages[idx];
    if (row.type === "system" || row.type === "progress" || row.type === "attachment") continue;
    if (!sawInput && userPromptSourceKind(row) === "input") {
      sawInput = true;
      continue;
    }
    return sawInput && localCommandKind(row) === "caveat";
  }
  return false;
}
//@ chunk-5xgkngpb.js:1925589-1925667 placement
function userPromptSourceKind(row) {
  return row.type === "user" && row.promptSource === undefined ? bashCommandTagKindOf(row) : undefined;
}
//@ chunk-5xgkngpb.js:1925667-1925865 placement (2.1.88 match: isSyntheticMessage, 1)
function isSyntheticMessage_2(messages, startIndex) {
  if (!isContextAppendMessage(messages[startIndex])) return false;
  for (let idx = startIndex - 1; idx >= 0; idx--) {
    let row = messages[idx];
    if (
      row.type === "system" ||
      row.type === "progress" ||
      row.type === "attachment" ||
      isContextAppendMessage(row)
    )
      continue;
    return row.type === "user" && isLocalCommandRecordTail(messages, idx);
  }
  return false;
}
//@ chunk-5xgkngpb.js:1925865-1925989 placement
function localCommandKind(message) {
  if (message.type !== "user" || message.promptSource !== undefined) return;
  let tagKind = localCommandTagKindOf(message);
  return tagKind === "caveat" && message.isMeta !== true ? undefined : tagKind;
}
//@ chunk-5xgkngpb.js:1925989-1926121 placement
function localCommandOrSlashKind(row) {
  return (
    localCommandKind(row) ??
    (row.type === "user" &&
    row.promptSource === undefined &&
    row.isMeta !== true &&
    looksLikeSlashInput(row.message.content)
      ? "bareRecord"
      : undefined)
  );
}
//@ chunk-5xgkngpb.js:1926121-1926220 placement
function interruptedTail(flag, because) {
  return flag
    ? {
        kind: "interrupted_turn",
        tail: "unresolved_call",
      }
    : {
        kind: "none",
        because,
      };
}
//@ chunk-5xgkngpb.js:1926220-1926363 placement
function terminalToolResultState(responseId, resolvedIds, isResumingTurn) {
  return resolvedIds === "restored_card" || (responseId !== undefined && resolvedIds.has(responseId))
    ? interruptedTail(isResumingTurn, "terminal_tool_result")
    : {
        kind: "none",
        because: "terminal_tool_result",
      };
}
//@ chunk-5xgkngpb.js:1926363-1926452 placement
function refusalTailState(restoredCardState, isResumingTurn) {
  return restoredCardState === "restored_card"
    ? interruptedTail(isResumingTurn, "reply")
    : {
        kind: "none",
        because: "reply",
      };
}
//@ chunk-5xgkngpb.js:1926452-1926468 placement
var NO_INTERACTIVE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1926452", () => {
  NO_INTERACTIVE_TOOLS = new Set();
});
//@ chunk-5xgkngpb.js:1926468-1926617 placement
function turnsWithInteractiveTools(callsByResponse, toolNamesById, hostAnswerableIds) {
  let turns = new Set();
  for (let [responseId, toolUseIds] of callsByResponse)
    if (
      toolUseIds.some((toolUseId) => {
        let toolName = toolNamesById.get(toolUseId);
        return (
          toolName !== undefined &&
          INTERACTIVE_TOOL_NAMES.has(toolName) &&
          (hostAnswerableIds?.has(toolUseId) ?? false)
        );
      })
    )
      turns.add(responseId);
  return turns;
}
//@ chunk-5xgkngpb.js:1926617-1926749 placement
function stopMarkerState(row) {
  return row.interruptedByShutdown
    ? {
        kind: "interrupted_turn",
        tail: "shutdown_marker",
      }
    : {
        kind: "none",
        because: "stop_marker",
      };
}
//@ chunk-5xgkngpb.js:1926749-1926816 placement
function isInterruptMarkerText(message) {
  let text = singleTextContent(message.message.content);
  return text === INTERRUPT_MESSAGE || text === INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-5xgkngpb.js:1926816-1926938 placement (2.1.88 match: processQueuedCommands, 1)
function processQueuedCommands(queuedCommands) {
  if (queuedCommands.origin?.kind !== "task-notification") return false;
  return singleTextContent(queuedCommands.message.content)?.startsWith(`<${TASK_NOTIFICATION}>`) ?? false;
}
//@ chunk-5xgkngpb.js:1926938-1927114 placement
function isQueueTranscriptOnlyUserMessage(message) {
  return (
    message.type === "user" &&
    message.queueTranscriptOnly === true &&
    (processQueuedCommands(message) ||
      (env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS &&
        message.origin?.kind === "task-notification" &&
        message.isMeta !== true))
  );
}
//@ chunk-5xgkngpb.js:1927114-1927244 placement
function isEndedForDeliveryRow(message) {
  let content = message.message.content;
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((block) => block.type === "tool_result" && block.content === TOOL_CALL_ENDED_FOR_DELIVERY)
  );
}
//@ chunk-5xgkngpb.js:1927244-1927497 placement
function findToolOnlyResponseId(messages, startIndex, lastMessage) {
  let assistantId;
  let sawToolResult = false;
  for (let index = startIndex; index >= 0; index--) {
    let message = messages[index];
    if (isEndTurnNudgeRow(message, lastMessage)) return;
    if (message.type === "assistant") {
      let { id } = message.message;
      if (!id || (assistantId !== undefined && id !== assistantId)) return;
      if (sawToolResult) return id;
      assistantId = id;
    } else if (message.type === "user" && !isTurnCompanion(message)) {
      if (!isToolUseResultMessage(message)) return;
      sawToolResult ||= getToolEndsTurnKind(message) !== false;
    }
  }
  return;
}
//@ chunk-5xgkngpb.js:1927497-1927790 layout
function findLastToolResultIndex(messages, lastIndex) {
  for (let index = lastIndex; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "user" && isToolUseResultMessage(message)) return index < lastIndex ? index : -1;
    if (
      message.type === "assistant" ||
      (message.type === "user" && !(message.isMeta === true && isTurnCompanion(message))) ||
      (message.type === "attachment" &&
        (message.attachment.type === "hook_stopped_continuation" ||
          message.attachment.type === "max_turns_reached"))
    )
      return -1;
  }
  return -1;
}
//@ chunk-5xgkngpb.js:1927790-1927852 placement
function isEndTurnNudgeRow(message, lastMessage) {
  return (
    message === lastMessage &&
    isTurnNotEndedNotice(message) &&
    !isOlderThan(message, refusalRetryMaxAge().maxAgeMs)
  );
}
//@ chunk-5xgkngpb.js:1927852-1928007 placement
function hasTurnEndingDenial(messages, lastIndex) {
  for (let index = lastIndex; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant") return false;
    if (message.type === "user" && isToolUseResultMessage(message) && message.toolDenialEndsTurn === true)
      return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:1928007-1928436 layout
function isToolOnlyResponse(messages, lastIndex) {
  let sawHookStop = false;
  for (let index = lastIndex; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "user" && isToolUseResultMessage(message)) {
      if (sawHookStop) {
        logEvent("tengu_resume_hook_stopped_batch", {});
        return true;
      }
    } else if (
      message.type === "assistant" ||
      (message.type === "user" && !isTurnCompanion(message)) ||
      (!sawHookStop &&
        (isContextAppendMessage(message) ||
          (message.type === "attachment" &&
            (message.attachment.type === "queued_command" || message.attachment.type === "poll_events"))))
    )
      return false;
    sawHookStop ||=
      message.type === "attachment" &&
      message.attachment.type === "hook_stopped_continuation" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_blanket", false);
  }
  return false;
}
//@ chunk-5xgkngpb.js:1928436-1928574 placement
function isBackgroundedByAbort(message) {
  let toolUseResult = message.toolUseResult;
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "backgroundedByTurnAbort" in toolUseResult &&
    toolUseResult.backgroundedByTurnAbort === true
  );
}
//@ chunk-5xgkngpb.js:1928574-1928749 layout
function isAsyncDispatchedKeptResult(message) {
  let toolUseResult = message.toolUseResult;
  return (
    codeModeAccepted() &&
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "asyncDispatched" in toolUseResult &&
    toolUseResult.asyncDispatched === true &&
    "keptByTurnAbort" in toolUseResult &&
    toolUseResult.keptByTurnAbort === true
  );
}
//@ chunk-5xgkngpb.js:1928749-1928838 placement
function toolResultTailKind(toolEnding) {
  return toolEnding?.endsTurn === false && toolEnding.toUser ? "message_to_user_result" : "tool_result";
}
//@ chunk-5xgkngpb.js:1928838-1929356 placement
/**
 * tool_result 是否结束回合（brief 类、终止 MCP 工具）。
 */
function classifyToolResultEnding(message, messages, messageIndex, isSidechain) {
  let content = message.message.content;
  if (!Array.isArray(content)) return;
  let block = content[0];
  if (block?.type !== "tool_result") return;
  let toolUseId = block.tool_use_id;
  for (let idx = messageIndex - 1; idx >= 0; idx--) {
    let candidate = messages[idx];
    if (candidate.type !== "assistant") continue;
    for (let useBlock of candidate.message.content)
      if (useBlock.type === "tool_use" && useBlock.id === toolUseId) {
        let briefEnabled =
          env.CLAUDE_CODE_PEWTER_OWL_TOOL === true &&
          !isBriefEnabled() &&
          !isSidechain &&
          !isOlderThan(message, refusalRetryMaxAge().maxAgeMs) &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_witty_hearth", true);
        let isBriefTool = BRIEF_TOOL_NAMES.has(useBlock.name);
        return (isBriefTool && !briefEnabled) || (getTerminalMcpTools().has(useBlock.name) && !block.is_error)
          ? {
              endsTurn: true,
              responseId: candidate.message.id || undefined,
            }
          : {
              endsTurn: false,
              toUser: isBriefTool,
            };
      }
  }
  return;
}
//@ chunk-5xgkngpb.js:1929356-1929624 placement
function restoreInvokedSkills(messages) {
  for (let message of messages) {
    if (message.type !== "attachment") continue;
    if (message.attachment.type === "invoked_skills") {
      for (let skill of message.attachment.skills)
        if (skill.name && skill.path && skill.content)
          addInvokedSkill(
            skill.name,
            skill.path,
            skill.content,
            null,
            skill.mcpSkill !== undefined,
            (isSoftSparkEnabled() && Date.parse(message.timestamp)) || Date.now(),
          );
    }
  }
}
//@ chunk-5xgkngpb.js:1929624-1930140 placement
/**
 * 比较已有消息中的 SessionStart 钩子输出（规范化持久化路径），过滤新行中重复的；hook_additional_context 逐条过滤； 没有新内容时返回空数组。
 */
function dedupeSessionStartRows(messages, rows) {
  if (rows.length === 0) return [];
  let seenKeys = new Set();
  for (let message of messages) for (let key of sessionStartRowKeys(message)) seenKeys.add(key);
  if (seenKeys.size === 0) return [...rows];
  let dropped = false;
  let kept = [];
  for (let row of rows) {
    let keys = sessionStartRowKeys(row);
    if (keys.length === 0 || row.type !== "attachment") {
      kept.push(row);
      continue;
    }
    let attachment = row.attachment;
    if (attachment.type === "hook_additional_context" && attachment.content.length > 1) {
      let filtered = attachment.content.filter((entry) => !seenKeys.has(normalizePersistedOutputPath(entry)));
      if (filtered.length === 0) continue;
      dropped = true;
      kept.push(
        filtered.length === attachment.content.length
          ? row
          : withRenderedAttachment(row, {
              ...attachment,
              content: filtered,
            }),
      );
      continue;
    }
    if (seenKeys.has(keys[0])) continue;
    dropped = true;
    kept.push(row);
  }
  if (!dropped) return [];
  return kept;
}
//@ chunk-5xgkngpb.js:1930140-1930253 placement
/**
 * 等待 SessionStart 钩子并追加去重后的行。
 */
async function appendSessionStartRows(ctx) {
  let promise = await ctx.sessionStartHooks.promise;
  let deduped = dedupeSessionStartRows(ctx.messages, promise);
  ctx.messages.push(...deduped);
  return deduped;
}
//@ chunk-5xgkngpb.js:1930253-1930619 placement
/**
 * SessionStart 钩子附件的比较键。
 */
function sessionStartRowKeys(message) {
  if (message.type !== "attachment") return [];
  let attachment = message.attachment;
  if (!("hookEvent" in attachment) || attachment.hookEvent !== "SessionStart") return [];
  if (attachment.type === "hook_additional_context")
    return attachment.content.map(normalizePersistedOutputPath);
  if (attachment.type === "hook_success" && attachment.content !== "")
    return [normalizePersistedOutputPath(attachment.content)];
  if (attachment.type === "hook_non_blocking_error")
    return [`${attachment.command ?? ""}\x00${attachment.exitCode}\x00${attachment.stderr}`];
  return [];
}
//@ chunk-5xgkngpb.js:1930619-1930719 placement
function normalizePersistedOutputPath(content) {
  if (!content.startsWith(PERSISTED_OUTPUT_TAG_2)) return content;
  return content.replace(/(saved to: ).*$/m, "$1<persisted>");
}
//@ chunk-5xgkngpb.js:1930719-1931221 placement
/**
 * 去掉被 retractedMessageUuids 撤回的消息并记遥测。
 */
function dropRetractedMessages_2(messages) {
  let retractedPrefixes = new Set(
    messages.flatMap((message) =>
      (message.type === "user" ||
        message.type === "assistant" ||
        (message.type === "system" && message.subtype === "model_refusal_fallback")) &&
      Array.isArray(message.retractedMessageUuids)
        ? message.retractedMessageUuids
            .filter((retractedMessageUuid) => typeof retractedMessageUuid === "string")
            .map((retractedMessageUuid) => retractedMessageUuid.slice(0, UUID_PREFIX_LENGTH))
        : [],
    ),
  );
  if (retractedPrefixes.size === 0) return messages;
  let filtered = messages.filter(
    (message) =>
      message.type === "system" ||
      typeof message.uuid !== "string" ||
      !retractedPrefixes.has(message.uuid.slice(0, UUID_PREFIX_LENGTH)),
  );
  if (filtered.length !== messages.length)
    logEvent("tengu_resume_retracted_dropped", {
      dropped: messages.length - filtered.length,
      chain_length: messages.length,
    });
  return filtered;
}
export {
  hasToolResultBlock_2,
  isPlainInterruptMarker,
  isLegacyInterruptMarker,
  isInterruptMarkerRow,
  findLastUserPromptUuid,
  appendSessionStartRows,
  ResumeRefusedError,
  dedupeSessionStartRows,
  isAgentOrTaskTool,
  isNonPromptUserRow,
  isRealPromptAt,
  isStopInterruptionRow,
  isQueueTranscriptOnlyUserMessage,
  OBSOLETE_ATTACHMENT_TYPES,
  dropRetractedMessages_2,
  dropMalformedAttachments,
  restoreInvokedSkills,
  deserializeMessagesImpl,
  hasNoReplyTerminalTool,
  getTerminalMcpTools,
  assertResumeNotRefused,
  FILE_ATTACHMENT_TYPES,
  dropApiInvalidAssistantBlocks,
  deserializeToMessages,
  summarizedPromptUuids,
  isMachineOriginPrompt,
  processQueuedCommands,
  endedOnAnsweredNoReplyTool,
};
