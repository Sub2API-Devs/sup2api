/**
 * utils/transcript/deserialize.ts
 *
 * 2.1.316 新增：转录反序列化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (82)
 * attribution: placement 82
 */
import { randomUUID } from "crypto";
import { isFirstPartyApiBackend } from "../model/providers.js";
import { logForDebugging } from "../debug.js";
import { plural } from "../stringUtils.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { MAX_WIRE_TOOL_NAME_CHARS, isOverlongToolName, clippedToolName } from "../taggedId.js";
import { errorMessage } from "../errors.js";
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
import { REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS } from "../../tools/REPLTool/constants.js";
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
  isContextAppendMessage,
  isSyntheticApiErrorMessage,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  isValidTurnPosition,
  regroupSplitResponsesOnResume,
  normalizeMessagesForResume,
  filterThinkingOnlyUntilStable,
  isNullRenderingAttachment_2,
  normalizeMessages,
  createUserMessage,
  createAssistantMessage,
  isContinuationPrompt,
  INTERRUPT_MESSAGE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  isTurnNotEndedNotice,
  withRenderedAttachment,
  UUID_PREFIX_LENGTH,
} from "../messages.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_3 } from "../shell/shellToolUtils.js";
import { isPlainObject as isPlainObject_4 } from "../objectUtils.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getMcpPrefix as getMcpPrefix_2 } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { INSTRUCTION_WITHHELD_REASONS } from "../instructionFileAccess.js";
import { isBareTaskNotificationOrigin } from "../backgroundSessionResume.js";
import { filterUuidList } from "../../cli/queuedCommands.js";
import { env } from "../env.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { CONNECTGITHUB } from "../../components/ConnectGitHub/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { OFFER_CHROME_SETUP_TOOL_NAME } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { SHOWONBOARDINGROLEPICKER } from "../../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { SYNTHETIC_MODEL, NO_RESPONSE_REQUESTED } from "../../constants/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_MIGHTY_FLASK } from "../../services/api/withRetry.js";
import { filterStopHookSummariesOnResume } from "./transcriptRepair.js";
import { extractPluginPrompt } from "../messages/nonUserMessages.js";
import { countToolCallsSince_2, restoreWireInputStamps } from "../wireToolInputEcho.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { PROMPT_ORIGIN_KINDS } from "../promptSource.js";
import { isRemoteToolsForwardEnabled } from "../../bridge/deviceRegistration.js";
import {
  isUnattendedStartUnconfirmed,
  apiErrorKind,
  isApiErrorWithoutRefusal,
  refusalKind,
} from "./turnClassification.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { count } from "../collections.js";
import { CCS_NO_REQUEST_TOKEN } from "../../services/api/errors.js";
import { logError } from "../log.js";
import {
  isVirtualConversationMessage,
  isSyntheticModelApiErrorMessage,
  isSystemLocalCommandMessage,
} from "../../bootstrap/sessionSlices.js";
import { bashCommandTagKindOf, localCommandTagKindOf } from "../messages/localCommandTags.js";
import { looksLikeSlashInput } from "../../commands.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { getToolEndsTurnKind } from "../../services/tools/mcpResultMeta.js";
import { isBriefEnabled } from "../../tools/BriefTool/BriefTool.js";
import { addInvokedSkill } from "../../bootstrap/state.js";
import { isSoftSparkEnabled } from "../../services/compact/compactSettings.js";
import { PERSISTED_OUTPUT_TAG } from "../toolResultStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1817232-1818138 placement
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
//@ chunk-e6aww6q8.js:1818138-1818531 placement
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
//@ chunk-e6aww6q8.js:1818725-1819330 placement
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
//@ chunk-e6aww6q8.js:1819330-1819730 placement
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
//@ chunk-e6aww6q8.js:1819730-1820482 placement
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
//@ chunk-e6aww6q8.js:1820482-1820534 placement
function isPlainObjectMessage(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-e6aww6q8.js:1820534-1820635 placement
function hasToolResultBlock_3(message) {
  return (
    message.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some(isToolResultBlock)
  );
}
//@ chunk-e6aww6q8.js:1820635-1820687 placement
function isToolResultBlock(block) {
  return isPlainObjectMessage(block) && block.type === "tool_result";
}
//@ chunk-e6aww6q8.js:1820687-1820781 placement
function isToolUseLikeBlock(block) {
  let type = block.type;
  return type === "tool_use" || type === "server_tool_use" || type === "mcp_tool_use";
}
//@ chunk-e6aww6q8.js:1820781-1820863 placement = hasThinkingContent (1)
function isThinkingBlockObject(m) {
  return isPlainObjectMessage(m) && (m.type === "thinking" || m.type === "redacted_thinking");
}
//@ chunk-e6aww6q8.js:1820863-1820957 placement
var BRIEF_TOOL_NAMES; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var PUBLISH_PLUGIN_TOOL_NAMES;
var RESUMABLE_TOOL_NAMES;
deferInit("chunk-e6aww6q8.js:1820863", () => {
  BRIEF_TOOL_NAMES = new Set([BRIEF_TOOL_NAME_2, LEGACY_BRIEF_TOOL_NAME_2, SEND_USER_FILE_TOOL_NAME]);
  PUBLISH_PLUGIN_TOOL_NAMES = new Set([PUBLISH_PLUGIN_TOOL_NAME, ...[], ...[]]);
  RESUMABLE_TOOL_NAMES = new Set([
    AGENT,
    TASK,
    SKILL,
    REPL_TOOL_NAME,
    REPL_TOOL_NAME_ALIAS,
    WORKFLOW_TOOL_NAME,
  ]);
});
//@ chunk-e6aww6q8.js:1820957-1820995 placement
/**
 * 是否是 Agent/Task 工具（可恢复）。
 */
function isAgentOrTaskTool(toolName) {
  return toolName === AGENT || toolName === TASK;
}
//@ chunk-e6aww6q8.js:1820995-1821127 placement
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
//@ chunk-e6aww6q8.js:1821127-1821366 placement
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
//@ chunk-e6aww6q8.js:1821366-1821516 placement
function toolResultIds(row) {
  return row.type === "user" && Array.isArray(row.message.content)
    ? row.message.content.flatMap((block) => (block.type === "tool_result" ? [block.tool_use_id] : []))
    : [];
}
//@ chunk-e6aww6q8.js:1821516-1821563 placement
function isShutdownInterruptedUserRow(row) {
  return row.type === "user" && isShutdownInterrupted(row);
}
//@ chunk-e6aww6q8.js:1821563-1821742 placement
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
//@ chunk-e6aww6q8.js:1821742-1822379 placement
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
                SHELL_TOOL_NAMES_3.includes(block.name) &&
                isPlainObject_4(block.input) &&
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
//@ chunk-e6aww6q8.js:1822379-1822668 placement
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
//@ chunk-e6aww6q8.js:1822668-1822683 placement
var REMOTE_DEVICE_MCP_PREFIX; // deferred: uses getMcpPrefix (../../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1822668", () => {
  REMOTE_DEVICE_MCP_PREFIX = getMcpPrefix_2(REMOTE_DEVICES);
});
//@ chunk-e6aww6q8.js:1822683-1822771 placement
function fullySettledToolUseIds(groups, options) {
  return new Set(
    groups
      .map(unresolvedToolUseIds)
      .filter((ids) => ids.every((id) => options.has(id)))
      .flat(),
  );
}
//@ chunk-e6aww6q8.js:1822771-1823453 placement
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
//@ chunk-e6aww6q8.js:1823453-1823515 placement
function isRemoteDeviceToolName(name) {
  return typeof name === "string" && name.startsWith(REMOTE_DEVICE_MCP_PREFIX);
}
//@ chunk-e6aww6q8.js:1823515-1823727 placement
function unresolvedToolUseIds(row) {
  if (row.type !== "assistant" || row.handedOff === true || !Array.isArray(row.message.content)) return [];
  let filtered = row.message.content.filter((block) => block.type === "tool_use");
  return filtered.every((block) => isRemoteDeviceToolName(block.name))
    ? filtered.map((block) => block.id)
    : [];
}
//@ chunk-e6aww6q8.js:1823727-1824796 placement
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
        attachment.content.every(isPlainObject_5)
      );
    case "file":
    case "already_read_file":
      return "content" in attachment && isPlainObject_5(attachment.content);
    case "withheld_memory":
      return (
        "by" in attachment &&
        typeof attachment.by === "string" &&
        attachment.by !== "" &&
        "entries" in attachment &&
        Array.isArray(attachment.entries) &&
        attachment.entries.every(
          (entry) =>
            isPlainObject_5(entry) &&
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
//@ chunk-e6aww6q8.js:1824796-1824817 placement
var MAX_ATTACHMENT_NAMES = 4096;
var MAX_ATTACHMENT_NAME_CHARS = 512;
//@ chunk-e6aww6q8.js:1824817-1825136 placement
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
//@ chunk-e6aww6q8.js:1825136-1825469 placement
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
//@ chunk-e6aww6q8.js:1825469-1825544 placement
/**
 * 取 user 行的压缩摘要提示 uuid 列表。
 */
function summarizedPromptUuids(row) {
  return row.type === "user" ? filterUuidList(row.summarizedTurnPromptUuids) : [];
}
//@ chunk-e6aww6q8.js:1825544-1825660 placement
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
//@ chunk-e6aww6q8.js:1825660-1826100 placement = hasSuccessfulToolCall (0.85)
function hasSuccessfulToolCall_2(messages) {
  let terminalMcpTools = getTerminalMcpTools();
  if (terminalMcpTools.size === 0) return false;
  let answeredIds = new Set();
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg.type === "user") {
      if (msg.isMeta) continue;
      let content = msg.message.content;
      if (!Array.isArray(content)) return false;
      let sawToolResult = false;
      for (let block of content)
        if (block.type === "tool_result") {
          sawToolResult = true;
          if (!block.is_error) answeredIds.add(block.tool_use_id);
        }
      if (!sawToolResult) return false;
    } else if (msg.type === "assistant") {
      for (let block of msg.message.content)
        if (block.type === "tool_use" && answeredIds.has(block.id) && terminalMcpTools.has(block.name))
          return true;
    }
  }
  return false;
}
//@ chunk-e6aww6q8.js:1826100-1826179 placement
class ResumeRefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResumeRefusedError";
  }
}
//@ chunk-e6aww6q8.js:1826179-1826241 placement
/**
 * 恢复被拒时抛出 ResumeRefusedError。
 */
function assertResumeNotRefused(result) {
  if (result.refused !== undefined) throw new ResumeRefusedError(result.refused);
}
//@ chunk-e6aww6q8.js:1826241-1826542 placement
/**
 * 交互类工具名与已废弃附件类型。
 */
var INTERACTIVE_TOOL_NAMES; // deferred: loads other modules while loading; runs once its import cycle is complete
var OBSOLETE_ATTACHMENT_TYPES;
deferInit("chunk-e6aww6q8.js:1826241", () => {
  INTERACTIVE_TOOL_NAMES = new Set([
    ASKUSERQUESTION,
    CONNECTGITHUB,
    EXITPLANMODE,
    OFFER_CHROME_SETUP_TOOL_NAME,
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
//@ chunk-e6aww6q8.js:1831380-1831491 placement
/**
 * meta 用户行内容是中断标记。
 */
function isInterruptMarkerRow(row) {
  if (row.type !== "user" || row.isMeta !== true) return false;
  let text = singleTextContent(row.message.content);
  return isInterruptMarkerText_2(text) || text === WORKER_RESTARTED_PROMPT_2;
}
//@ chunk-e6aww6q8.js:1831491-1831598 placement
function isInterruptMarkerText_2(value) {
  if (value === undefined) return false;
  let override = resumePromptOverride();
  return (
    value === override ||
    value === deserializeMessagesWithInterruptDetection ||
    (WORKER_RESTARTED_PROMPT.includes(override) && WORKER_RESTARTED_PROMPT.includes(value))
  );
}
//@ chunk-e6aww6q8.js:1831598-1831675 placement
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
//@ chunk-e6aww6q8.js:1831675-1831946 placement
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
    return localCommandKind(row) !== undefined || row.isMeta || processQueuedCommands_2(row)
      ? undefined
      : row.uuid;
  }
  return uuid;
}
//@ chunk-e6aww6q8.js:1831946-1832045 placement
/**
 * 指定位置的 user 行是否是真实提示。
 */
function isRealPromptAt(messages, index) {
  let row = messages[index];
  if (row?.type !== "user" || isNonPromptUserRow(row)) return false;
  return localCommandKind(row) === undefined || !isLocalCommandRecordTail(messages, index);
}
//@ chunk-e6aww6q8.js:1832045-1832115 placement
function hasTurnOriginFields(row) {
  return row.turnOrigin !== undefined || row.promptSource !== undefined;
}
//@ chunk-e6aww6q8.js:1832115-1832347 placement
function isPromptKeptAfter(messages, index) {
  for (let idx = index + 1; idx < messages.length; idx++) {
    let row = messages[idx];
    if (row.type === "system") {
      if (row.subtype === "informational" && row.promptSubmitEnding?.promptKept === true) return true;
    } else if (row.type === "assistant" || (row.type === "user" && hasTurnOriginFields(row))) return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1832347-1832633 placement
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
//@ chunk-e6aww6q8.js:1832633-1833053 placement
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
      isSyntheticApiErrorMessage(row) &&
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
//@ chunk-e6aww6q8.js:1833053-1833172 placement
/**
 * 无 promptSource 的 meta 中断标记行。
 */
function isPlainInterruptMarker(message) {
  if (message.type !== "user" || message.isMeta !== true || message.promptSource !== undefined) return false;
  return isInterruptMarkerText_2(singleTextContent(message.message.content));
}
//@ chunk-e6aww6q8.js:1833172-1833267 placement
function isLegacyInterruptMarker(row) {
  return (
    isPlainInterruptMarker(row) &&
    row.type === "user" &&
    (singleTextContent(row.message.content) === deserializeMessagesWithInterruptDetection ||
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MIGHTY_FLASK, false) === true)
  );
}
//@ chunk-e6aww6q8.js:1833267-1833338 placement
/**
 * 反序列化远程会话日志为消息数组。
 */
function deserializeToMessages(entries, options) {
  return deserializeMessagesImpl(entries, undefined, undefined, undefined, undefined, options).messages;
}
//@ chunk-e6aww6q8.js:1833338-1833444 placement
var FILE_ATTACHMENT_TYPES = [
  "file",
  "directory",
  "pdf_reference",
  "compact_file_reference",
  "already_read_file",
  "nested_memory",
];
//@ chunk-e6aww6q8.js:1833444-1842520 placement
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
        let recountedInputs = countToolCallsSince_2(
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
    let tailIsMessage = isTailMessage(sanitized, resumeOptions);
    let ownSessionId = turnContext?.ownSessionId;
    let hasOwnTurn =
      resumeInterrupted_2 === true &&
      ownSessionId !== undefined &&
      !hasOwnTurnInSession(sanitized, ownSessionId);
    let resumePolicy = interruptedTurnResumePolicy(isRemote);
    let maxAgeMs = resumePolicy?.maxAgeMs ?? 0;
    let tooOld = isResumeTooOld(sanitized, maxAgeMs);
    let noRequestedAnchors = resumeInterrupted_2 && !requestedToolUseIds?.size && !fromOtherSession;
    let canDropSiblings = noRequestedAnchors && !tooOld;
    let canShowCutOffCalls = canDropSiblings && restoredCardToolUseId === undefined && showsCutOffCalls();
    let normalizedMessages = normalizeMessagesForResume(
      baseMessages,
      requestedToolUseIds,
      canDropSiblings
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
        : appendInterruptedToolResults(
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
      hasSuccessfulToolCall_2(withToolResults.slice(0, withToolResults.lastIndexOf(last)));
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
      tailIsMessage ||
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
        let msg = cleanedMessages[idx];
        if (
          msg.type === "system" ||
          msg.type === "progress" ||
          (msg.type === "attachment" &&
            "hookEvent" in msg.attachment &&
            (msg.attachment.hookEvent === "SessionStart" ||
              (msg.attachment.hookEvent === "Stop" &&
                sawQueuedNotice &&
                (msg.attachment.type === "hook_success" ||
                  msg.attachment.type === "hook_non_blocking_error"))))
        )
          continue;
        if (
          msg.type === "attachment" &&
          (isNullRenderingAttachment_2(msg) || FILE_ATTACHMENT_TYPES.includes(msg.attachment.type))
        )
          sawFileAttachment = true;
        else if (msg.type === "user" && msg.isMeta === true && msg.queueTranscriptOnly === true) {
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
            findToolOnlyResponseId(messages_2, anchorPosition, anchorProcessed) !== undefined));
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
      canShowCutOffCalls &&
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
    let agentCallCount = count([...reportableCutOffIds], (id) =>
      isAgentOrTaskTool(unresolvedToolNames.get(id)),
    );
    let interruption;
    let allCutOffIds = cutOffCallIds;
    let deferPrompt = false;
    if (reportableCutOffIds.size > 0) {
      allCutOffIds = new Set([...cutOffCallIds, ...reportableCutOffIds]);
      messages_2 = appendInterruptedToolResults(
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
        messages_2 = appendInterruptedToolResults(
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
              : undefined;
      let lastUserPromptUuid = findLastUserPromptUuid(baseMessages, {
        orSummarizedPrompt:
          apiErrorKindForPrompt === "rate_limit" || apiErrorKindForPrompt === "no_request_token",
      });
      interruption = {
        kind: "interrupted_prompt",
        message: resumePromptMessage,
        ...(lastUserPromptUuid !== undefined && {
          interruptedTurnUserMessageUuid: lastUserPromptUuid,
        }),
        tail: {
          kind: state.kind === "interrupted_turn" ? state.tail : "cut_off_call_after_prompt",
          ...tailFacts,
          ...ageFacts,
          ...(canShowCutOffCalls && {
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
    let hostCutOffIds =
      cutOffPreview &&
      !resumeInterrupted_2 &&
      allCutOffIds.size === 0 &&
      trailingUnresolvedIds.size > 0 &&
      !requestedToolUseIds?.size &&
      !fromOtherSession &&
      !any &&
      !tailIsMessage &&
      !isTailMessage(messages_2, resumeOptions)
        ? findUnresolvedToolUses_2(baseMessages, trailingUnresolvedIds, true)
        : new Set();
    if (hostCutOffIds.size > 0) {
      messages_2 = appendInterruptedToolResults(
        baseMessages,
        requestedToolUseIds,
        hostCutOffIds,
        hostCutOffIds,
        interruptMessage,
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
//@ chunk-e6aww6q8.js:1842520-1842770 placement
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
//@ chunk-e6aww6q8.js:1842770-1842928 placement = countToolCallsSince (1)
function messageHasToolUse(messages, sinceUuid) {
  return messages.type === "assistant" && Array.isArray(messages.message.content)
    ? messages.message.content.flatMap((block) =>
        block.type === "tool_use" && sinceUuid.has(block.id) ? [block.id] : [],
      )
    : [];
}
//@ chunk-e6aww6q8.js:1842928-1843667 placement
/**
 * 找出最后一组助手消息中未得到结果的工具调用。
 */
function findUnresolvedToolUses_2(messages, sinceUuid, isResumingTurn) {
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
          for (let id of messageHasToolUse(message, sinceUuid)) unresolvedIds.add(id);
        continue;
      }
      seenIds.add(message.message.id);
      lastId = message.message.id;
      unresolvedIds = new Set(messageHasToolUse(message, sinceUuid));
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
//@ chunk-e6aww6q8.js:1843667-1844160 placement
/**
 * 为未完成的工具调用补上中断的 tool_result。
 */
function appendInterruptedToolResults(
  messages,
  requestedToolUseIds,
  trailingUnresolvedIds,
  cutOffIds,
  resultText,
  resumeOptions,
  endsTurn = false,
  agentResultText = resultText,
) {
  let sliced = filterThinkingOnlyUntilStable(
    normalizeMessagesForResume(
      messages,
      new Set([...(requestedToolUseIds ?? []), ...trailingUnresolvedIds]),
      resumeOptions,
    ),
  ).slice();
  let results = [];
  for (let message of sliced) {
    if (message.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || !cutOffIds.has(block.id)) continue;
      let resultText_2 = isAgentOrTaskTool(block.name) ? agentResultText : resultText;
      results.push(
        createUserMessage({
          content: [
            {
              type: "tool_result",
              content: resultText_2,
              is_error: true,
              tool_use_id: block.id,
            },
          ],
          toolUseResult: resultText_2,
          toolDenialKind: "interrupted",
          ...(endsTurn && {
            toolDenialEndsTurn: true,
          }),
          sourceToolAssistantUUID: message.uuid,
        }),
      );
    }
  }
  sliced.push(...results);
  return sliced;
}
//@ chunk-e6aww6q8.js:1844160-1844372 placement
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
//@ chunk-e6aww6q8.js:1844372-1847225 placement
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
      let toolOnlyResponseId = findToolOnlyResponseId(messages, lastIndex, retryMaxAge);
      if (toolOnlyResponseId !== undefined)
        return terminalToolResultState(toolOnlyResponseId, interactiveToolNames, isResumingTurn);
      return {
        kind: "interrupted_turn",
        tail: toolResultTailKind(toolEnding),
      };
    }
    if (processQueuedCommands_2(lastMessage))
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
          hasTurnEndingDenial(messages, index)
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
//@ chunk-e6aww6q8.js:1847225-1847617 placement
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
//@ chunk-e6aww6q8.js:1847617-1847829 placement
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
//@ chunk-e6aww6q8.js:1847829-1847907 placement
function userPromptSourceKind(row) {
  return row.type === "user" && row.promptSource === undefined ? bashCommandTagKindOf(row) : undefined;
}
//@ chunk-e6aww6q8.js:1847907-1848104 placement = isSyntheticMessage (1)
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
//@ chunk-e6aww6q8.js:1848104-1848228 placement
function localCommandKind(message) {
  if (message.type !== "user" || message.promptSource !== undefined) return;
  let tagKind = localCommandTagKindOf(message);
  return tagKind === "caveat" && message.isMeta !== true ? undefined : tagKind;
}
//@ chunk-e6aww6q8.js:1848228-1848360 placement
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
//@ chunk-e6aww6q8.js:1848360-1848459 placement
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
//@ chunk-e6aww6q8.js:1848459-1848602 placement
function terminalToolResultState(responseId, resolvedIds, isResumingTurn) {
  return resolvedIds === "restored_card" || (responseId !== undefined && resolvedIds.has(responseId))
    ? interruptedTail(isResumingTurn, "terminal_tool_result")
    : {
        kind: "none",
        because: "terminal_tool_result",
      };
}
//@ chunk-e6aww6q8.js:1848602-1848691 placement
function refusalTailState(restoredCardState, isResumingTurn) {
  return restoredCardState === "restored_card"
    ? interruptedTail(isResumingTurn, "reply")
    : {
        kind: "none",
        because: "reply",
      };
}
//@ chunk-e6aww6q8.js:1848691-1848707 placement
var NO_INTERACTIVE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1848691", () => {
  NO_INTERACTIVE_TOOLS = new Set();
});
//@ chunk-e6aww6q8.js:1848707-1848856 placement
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
//@ chunk-e6aww6q8.js:1848856-1848988 placement
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
//@ chunk-e6aww6q8.js:1848988-1849055 placement
function isInterruptMarkerText(message) {
  let text = singleTextContent(message.message.content);
  return text === INTERRUPT_MESSAGE || text === INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-e6aww6q8.js:1849055-1849177 placement = processQueuedCommands (1)
function processQueuedCommands_2(queuedCommands) {
  if (queuedCommands.origin?.kind !== "task-notification") return false;
  return singleTextContent(queuedCommands.message.content)?.startsWith(`<${TASK_NOTIFICATION}>`) ?? false;
}
//@ chunk-e6aww6q8.js:1849177-1849353 placement
function isQueueTranscriptOnlyUserMessage(message) {
  return (
    message.type === "user" &&
    message.queueTranscriptOnly === true &&
    (processQueuedCommands_2(message) ||
      (env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS &&
        message.origin?.kind === "task-notification" &&
        message.isMeta !== true))
  );
}
//@ chunk-e6aww6q8.js:1849353-1849483 placement
function isEndedForDeliveryRow(message) {
  let content = message.message.content;
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((block) => block.type === "tool_result" && block.content === TOOL_CALL_ENDED_FOR_DELIVERY)
  );
}
//@ chunk-e6aww6q8.js:1849483-1849736 placement
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
//@ chunk-e6aww6q8.js:1849736-1849798 placement
function isEndTurnNudgeRow(message, lastMessage) {
  return (
    message === lastMessage &&
    isTurnNotEndedNotice(message) &&
    !isOlderThan(message, refusalRetryMaxAge().maxAgeMs)
  );
}
//@ chunk-e6aww6q8.js:1849798-1849953 placement
function hasTurnEndingDenial(messages, lastIndex) {
  for (let index = lastIndex; index >= 0; index--) {
    let message = messages[index];
    if (message.type === "assistant") return false;
    if (message.type === "user" && isToolUseResultMessage(message) && message.toolDenialEndsTurn === true)
      return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1849953-1850091 placement
function isBackgroundedByAbort(message) {
  let toolUseResult = message.toolUseResult;
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "backgroundedByTurnAbort" in toolUseResult &&
    toolUseResult.backgroundedByTurnAbort === true
  );
}
//@ chunk-e6aww6q8.js:1850091-1850180 placement
function toolResultTailKind(toolEnding) {
  return toolEnding?.endsTurn === false && toolEnding.toUser ? "message_to_user_result" : "tool_result";
}
//@ chunk-e6aww6q8.js:1850180-1850695 placement
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
//@ chunk-e6aww6q8.js:1850695-1850963 placement
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
//@ chunk-e6aww6q8.js:1850963-1851479 placement
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
//@ chunk-e6aww6q8.js:1851479-1851592 placement
/**
 * 等待 SessionStart 钩子并追加去重后的行。
 */
async function appendSessionStartRows(ctx) {
  let promise = await ctx.sessionStartHooks.promise;
  let deduped = dedupeSessionStartRows(ctx.messages, promise);
  ctx.messages.push(...deduped);
  return deduped;
}
//@ chunk-e6aww6q8.js:1851592-1851958 placement
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
//@ chunk-e6aww6q8.js:1851958-1852058 placement
function normalizePersistedOutputPath(content) {
  if (!content.startsWith(PERSISTED_OUTPUT_TAG)) return content;
  return content.replace(/(saved to: ).*$/m, "$1<persisted>");
}
//@ chunk-e6aww6q8.js:1852058-1852560 placement
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
  OBSOLETE_ATTACHMENT_TYPES,
  isQueueTranscriptOnlyUserMessage,
  dropRetractedMessages_2,
  dropMalformedAttachments,
  restoreInvokedSkills,
  deserializeMessagesImpl,
  findLastUserPromptUuid,
  ResumeRefusedError,
  isInterruptMarkerRow,
  assertResumeNotRefused,
  dropApiInvalidAssistantBlocks,
  getTerminalMcpTools,
  summarizedPromptUuids,
  isNonPromptUserRow,
  processQueuedCommands_2,
  isMachineOriginPrompt,
  deserializeToMessages,
  dedupeSessionStartRows,
  hasToolResultBlock_3,
  isPlainInterruptMarker,
  isLegacyInterruptMarker,
  appendSessionStartRows,
  isStopInterruptionRow,
  hasSuccessfulToolCall_2,
  isRealPromptAt,
  isAgentOrTaskTool,
};
