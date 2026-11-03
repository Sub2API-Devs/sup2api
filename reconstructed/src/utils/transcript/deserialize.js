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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-e6aww6q8.js:1817232-1818138 placement
/**
 * 移除 Anthropic API 不接受的助手内容块。
 */
function dropApiInvalidAssistantBlocks(messages, { site }) {
  try {
    let r = scanForeignBlocks(messages);
    let stripForeign = r.foreignBlocks && isFirstPartyApiBackend();
    if (!stripForeign && !r.overlongToolNames) return messages;
    let { result: h, removed, spacers, truncated } = stripForeignToolBlocks(messages, stripForeign);
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
    return h;
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
function scanForeignBlocks(e) {
  let n = false;
  let r = false;
  for (let s of e) {
    if (s.type !== "assistant" || !Array.isArray(s.message.content)) continue;
    for (let h of s.message.content) {
      let y = h;
      if (
        isToolResultBlock(y) ||
        (isPlainObjectMessage(y) && y.type === "server_tool_use" && !isServerToolType(y.name))
      )
        n = true;
      else if (
        isPlainObjectMessage(y) &&
        y.type === "tool_use" &&
        typeof y.name === "string" &&
        isOverlongToolName(y.name)
      )
        r = true;
      if (n && r)
        return {
          foreignBlocks: n,
          overlongToolNames: r,
        };
    }
  }
  return {
    foreignBlocks: n,
    overlongToolNames: r,
  };
}
//@ chunk-e6aww6q8.js:1818725-1819330 placement
/**
 * 按回合收集工具结果出现在助手侧还是用户侧。
 */
function indexToolResultSides(messages, turnKeys) {
  let r = new Set();
  let s = new Set();
  let h = new Set();
  let y = new Set();
  messages.forEach((S, w) => {
    if (S.type === "user") {
      if (!Array.isArray(S.message.content)) return;
      for (let G of S.message.content)
        if (isPlainObjectMessage(G) && isToolResultBlock(G)) y.add(G.tool_use_id);
      return;
    }
    let L = turnKeys[w];
    if (L === undefined || S.type !== "assistant" || !Array.isArray(S.message.content)) return;
    for (let G of S.message.content) {
      if (isPlainObjectMessage(G) && isToolResultBlock(G)) h.add(G.tool_use_id);
      if (!isPlainObjectMessage(G) || typeof G.tool_use_id !== "string") continue;
      if (isToolResultBlock(G))
        s.add(`${L}
${G.tool_use_id}`);
      else if (!isToolUseLikeBlock(G))
        r.add(`${L}
${G.tool_use_id}`);
    }
  });
  return {
    byServerResult: r,
    byClientResult: s,
    byAssistantSideResult: h,
    byUserSideResult: y,
  };
}
//@ chunk-e6aww6q8.js:1819330-1819730 placement
/**
 * 助手内容块是否为应剥离的外来工具块。
 */
function isForeignToolBlock(e, n, resultSides) {
  if (isToolResultBlock(e)) return true;
  if (!isPlainObjectMessage(e)) return false;
  if (e.type === "tool_use")
    return resultSides.byAssistantSideResult.has(e.id) && !resultSides.byUserSideResult.has(e.id);
  if (e.type !== "server_tool_use" && e.type !== "mcp_tool_use") return false;
  let s =
    typeof e.id === "string"
      ? `${n}
${e.id}`
      : undefined;
  if (s !== undefined && resultSides.byServerResult.has(s)) return false;
  return (
    (s !== undefined && resultSides.byClientResult.has(s)) ||
    (e.type === "server_tool_use" && !isServerToolType(e.name))
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
    result: messages.flatMap((message, q) => {
      let Z = turnKeys[q];
      if (Z === undefined || message.type !== "assistant" || !Array.isArray(message.message.content))
        return [message];
      let Se = [];
      let { lastKeptIsThinking, removedSince } = turnState.get(Z) ?? {
        lastKeptIsThinking: false,
        removedSince: false,
      };
      let Ee = false;
      for (let Ae of message.message.content) {
        if (stripForeign && isForeignToolBlock(Ae, Z, resultSides)) {
          removed += 1;
          removedSince = true;
          Ee = true;
          continue;
        }
        if (removedSince && lastKeptIsThinking && isThinkingBlockObject(Ae)) {
          Se.push({
            type: "text",
            text: UNSUPPORTED_TOOL_CONTENT_TEXT,
            citations: [],
          });
          spacers += 1;
          Ee = true;
        }
        let Ie = Ae;
        if (isPlainObjectMessage(Ae) && Ae.type === "tool_use") {
          let Me = clippedToolName(Ae.name);
          if (Me !== undefined) {
            Ie = {
              ...Ae,
              name: Me,
            };
            truncated += 1;
            Ee = true;
          }
        }
        Se.push(Ie);
        lastKeptIsThinking = isThinkingBlockObject(Ae);
        removedSince = false;
      }
      turnState.set(Z, {
        lastKeptIsThinking,
        removedSince,
      });
      if (!Ee) return [message];
      return Se.length === 0
        ? []
        : [
            {
              ...message,
              message: {
                ...message.message,
                content: Se,
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
function isPlainObjectMessage(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:1820534-1820635 placement
function hasToolResultBlock_3(e) {
  return e.type === "user" && Array.isArray(e.message.content) && e.message.content.some(isToolResultBlock);
}
//@ chunk-e6aww6q8.js:1820635-1820687 placement
function isToolResultBlock(e) {
  return isPlainObjectMessage(e) && e.type === "tool_result";
}
//@ chunk-e6aww6q8.js:1820687-1820781 placement
function isToolUseLikeBlock(e) {
  let n = e.type;
  return n === "tool_use" || n === "server_tool_use" || n === "mcp_tool_use";
}
//@ chunk-e6aww6q8.js:1820781-1820863 placement = hasThinkingContent (1)
function isThinkingBlockObject(m) {
  return isPlainObjectMessage(m) && (m.type === "thinking" || m.type === "redacted_thinking");
}
//@ chunk-e6aww6q8.js:1820863-1820957 placement
var BRIEF_TOOL_NAMES = new Set([BRIEF_TOOL_NAME_2, LEGACY_BRIEF_TOOL_NAME_2, SEND_USER_FILE_TOOL_NAME]);
var PUBLISH_PLUGIN_TOOL_NAMES = new Set([PUBLISH_PLUGIN_TOOL_NAME, ...[], ...[]]);
var RESUMABLE_TOOL_NAMES = new Set([
  AGENT,
  TASK,
  SKILL,
  REPL_TOOL_NAME,
  REPL_TOOL_NAME_ALIAS,
  WORKFLOW_TOOL_NAME,
]);
//@ chunk-e6aww6q8.js:1820957-1820995 placement
/**
 * 是否是 Agent/Task 工具（可恢复）。
 */
function isAgentOrTaskTool(e) {
  return e === AGENT || e === TASK;
}
//@ chunk-e6aww6q8.js:1820995-1821127 placement
function isResumableToolName(name, n, r = false) {
  return (
    typeof name === "string" &&
    !n.has(name) &&
    !PUBLISH_PLUGIN_TOOL_NAMES.has(name) &&
    !BRIEF_TOOL_NAMES.has(name) &&
    (!RESUMABLE_TOOL_NAMES.has(name) || (r && isAgentOrTaskTool(name))) &&
    !name.startsWith(SKILL_2)
  );
}
//@ chunk-e6aww6q8.js:1821127-1821366 placement
/**
 * 中断产生的 tool_result 行（会话结束/未复制/进程停止）。
 */
function isStopInterruptionRow(e) {
  return (
    e.type === "user" &&
    e.toolDenialKind === "interrupted" &&
    Array.isArray(e.message.content) &&
    e.message.content.length > 0 &&
    e.message.content.every(
      (n) =>
        n.type === "tool_result" &&
        (n.content === TOOL_CALL_SESSION_ENDED ||
          n.content === TOOL_RESULT_NOT_IN_COPY ||
          n.content === AGENT_CALL_PROCESS_STOPPED),
    )
  );
}
//@ chunk-e6aww6q8.js:1821366-1821516 placement
function toolResultIds(e) {
  return e.type === "user" && Array.isArray(e.message.content)
    ? e.message.content.flatMap((n) => (n.type === "tool_result" ? [n.tool_use_id] : []))
    : [];
}
//@ chunk-e6aww6q8.js:1821516-1821563 placement
function isShutdownInterruptedUserRow(e) {
  return e.type === "user" && isShutdownInterrupted(e);
}
//@ chunk-e6aww6q8.js:1821563-1821742 placement
function dropRedundantShutdownRows(e) {
  if (!e.some(isShutdownInterruptedUserRow)) return e;
  let n = new Set(e.filter((s) => !isShutdownInterruptedUserRow(s)).flatMap(toolResultIds));
  let filtered = e.filter(
    (s) => !(isShutdownInterruptedUserRow(s) && toolResultIds(s).every((h) => n.has(h))),
  );
  return filtered.length === e.length ? e : filtered;
}
//@ chunk-e6aww6q8.js:1821742-1822379 placement
/**
 * 统计本回合被中断的工具步数及是否与上回合重复。
 */
function summarizeInterruptedSteps(e, n) {
  let r = new Map();
  let s = [];
  let h = false;
  for (let S of e) {
    if (S.type !== "user" && S.type !== "assistant") continue;
    if (!isStopInterruptionRow(S)) {
      h = false;
      if (S.type === "assistant") {
        for (let w of S.message.content)
          if (w.type === "tool_use")
            r.set(w.id, {
              name: w.name,
              step:
                SHELL_TOOL_NAMES_3.includes(w.name) &&
                isPlainObject_4(w.input) &&
                typeof w.input.command === "string"
                  ? w.input.command
                  : w.input,
            });
      }
      continue;
    }
    if (!h) s.push([]);
    h = true;
    for (let w of S.message.content) {
      let L = typeof w !== "string" && w.type === "tool_result" ? r.get(w.tool_use_id) : undefined;
      if (L !== undefined) s.at(-1).push(L);
    }
  }
  let y = s.at(-2) ?? [];
  return {
    inTurn: s.reduce((acc, w) => acc + w.length, 0),
    repeatsPrevious: n.size > 0 && (s.at(-1) ?? []).some((S) => y.some((w) => En(S, w))),
  };
}
//@ chunk-e6aww6q8.js:1822379-1822668 placement
function collectResumableToolUseIds(e, n, r, s) {
  let h = new Set();
  for (let y of e) {
    if (y.type !== "assistant" || y.handedOff === true || !Array.isArray(y.message.content)) continue;
    let filtered = y.message.content.filter((w) => w.type === "tool_use").filter((w) => n.has(w.id));
    if (filtered.every((w) => isResumableToolName(w.name, r, s))) for (let w of filtered) h.add(w.id);
  }
  return h;
}
//@ chunk-e6aww6q8.js:1822668-1822683 placement
var REMOTE_DEVICE_MCP_PREFIX = getMcpPrefix_2(REMOTE_DEVICES);
//@ chunk-e6aww6q8.js:1822683-1822771 placement
function fullySettledToolUseIds(e, n) {
  return new Set(
    e
      .map(unresolvedToolUseIds)
      .filter((r) => r.every((s) => n.has(s)))
      .flat(),
  );
}
//@ chunk-e6aww6q8.js:1822771-1823453 placement
/**
 * 把关机中断的工具结果改写为指定的中断内容。
 */
function rewriteShutdownInterrupts(e, n, r, s) {
  let h = new Set(s);
  for (let S of e)
    if (S.type === "user" && Array.isArray(S.message.content) && !isShutdownInterrupted(S)) {
      for (let w of S.message.content) if (w.type === "tool_result") h.add(w.tool_use_id);
    }
  let y = new Set();
  return e.map((S) => {
    for (let q of unresolvedToolUseIds(S)) if (!h.has(q)) y.add(q);
    if (S.type !== "user" || !Array.isArray(S.message.content) || !isShutdownInterrupted(S)) return S;
    let { content } = S.message;
    if (!content.every((q) => q.type !== "tool_result" || y.has(q.tool_use_id))) return S;
    for (let q of content) if (q.type === "tool_result") r.add(q.tool_use_id);
    let { interruptedByShutdown, ...G } = S;
    return {
      ...G,
      toolUseResult: n,
      toolDenialKind: "interrupted",
      message: {
        ...S.message,
        content: content.map((q) =>
          q.type === "tool_result"
            ? {
                ...q,
                content: n,
              }
            : q,
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
function unresolvedToolUseIds(e) {
  if (e.type !== "assistant" || e.handedOff === true || !Array.isArray(e.message.content)) return [];
  let filtered = e.message.content.filter((r) => r.type === "tool_use");
  return filtered.every((r) => isRemoteDeviceToolName(r.name)) ? filtered.map((r) => r.id) : [];
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
          attachment.names.every((n) => typeof n === "string" && n.length <= MAX_ATTACHMENT_NAME_CHARS))
      );
    case "hook_additional_context":
      return (
        "content" in attachment &&
        Array.isArray(attachment.content) &&
        attachment.content.every((n) => typeof n === "string")
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
  let n = 0;
  let filtered = messages.filter((s) => {
    if (s.type === "attachment" && !isValidAttachmentPayload(s.attachment)) {
      n += 1;
      return false;
    }
    return true;
  });
  if (n === 0) return messages;
  logForDebugging(
    `transcript load: dropped ${n} attachment ${plural(n, "entry", "entries")} with a missing or malformed payload \u2014 the session transcript appears partially corrupt`,
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
function isMachineOriginPrompt(e) {
  let n =
    e.type === "user"
      ? e.origin
      : e.type === "attachment" && e.attachment.type === "queued_command"
        ? e.attachment.origin
        : undefined;
  let r = n;
  if (typeof r !== "object" || r === null) return false;
  let kind = "kind" in r ? r.kind : undefined;
  return (
    kind !== "human" &&
    !isBareTaskNotificationOrigin(n) &&
    kind !== "auto-continuation" &&
    kind !== "unclassified" &&
    !("senderTaskId" in r && r.senderTaskId !== undefined)
  );
}
//@ chunk-e6aww6q8.js:1825469-1825544 placement
/**
 * 取 user 行的压缩摘要提示 uuid 列表。
 */
function summarizedPromptUuids(e) {
  return e.type === "user" ? filterUuidList(e.summarizedTurnPromptUuids) : [];
}
//@ chunk-e6aww6q8.js:1825544-1825660 placement
/**
 * CLAUDE_CODE_TERMINAL_MCP_TOOLS 列出的会结束回合的 MCP 工具。
 */
function getTerminalMcpTools() {
  return new Set(
    (env.CLAUDE_CODE_TERMINAL_MCP_TOOLS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
}
//@ chunk-e6aww6q8.js:1825660-1826100 placement = hasSuccessfulToolCall (0.85)
function hasSuccessfulToolCall_2(messages) {
  let terminalMcpTools = getTerminalMcpTools();
  if (terminalMcpTools.size === 0) return false;
  let r = new Set();
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg.type === "user") {
      if (msg.isMeta) continue;
      let content = msg.message.content;
      if (!Array.isArray(content)) return false;
      let S = false;
      for (let w of content)
        if (w.type === "tool_result") {
          S = true;
          if (!w.is_error) r.add(w.tool_use_id);
        }
      if (!S) return false;
    } else if (msg.type === "assistant") {
      for (let y of msg.message.content)
        if (y.type === "tool_use" && r.has(y.id) && terminalMcpTools.has(y.name)) return true;
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
function assertResumeNotRefused(e) {
  if (e.refused !== undefined) throw new ResumeRefusedError(e.refused);
}
//@ chunk-e6aww6q8.js:1826241-1826542 placement
/**
 * 交互类工具名与已废弃附件类型。
 */
var INTERACTIVE_TOOL_NAMES = new Set([
  ASKUSERQUESTION,
  CONNECTGITHUB,
  EXITPLANMODE,
  OFFER_CHROME_SETUP_TOOL_NAME,
  SHOWONBOARDINGROLEPICKER,
  require("./chunk-kmvx6c21.js").CONTINUE_IN_PROJECTS_TOOL_NAME,
]);
var OBSOLETE_ATTACHMENT_TYPES = new Set([
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
//@ chunk-e6aww6q8.js:1831380-1831491 placement
/**
 * meta 用户行内容是中断标记。
 */
function isInterruptMarkerRow(e) {
  if (e.type !== "user" || e.isMeta !== true) return false;
  let n = singleTextContent(e.message.content);
  return isInterruptMarkerText_2(n) || n === WORKER_RESTARTED_PROMPT_2;
}
//@ chunk-e6aww6q8.js:1831491-1831598 placement
function isInterruptMarkerText_2(e) {
  if (e === undefined) return false;
  let n = resumePromptOverride();
  return (
    e === n ||
    e === deserializeMessagesWithInterruptDetection ||
    (WORKER_RESTARTED_PROMPT.includes(n) && WORKER_RESTARTED_PROMPT.includes(e))
  );
}
//@ chunk-e6aww6q8.js:1831598-1831675 placement
/**
 * 是否是无需当作真实提示的 user 行（伴随行、摘要、工具结果、中断）。
 */
function isNonPromptUserRow(e) {
  return (
    isTurnCompanion(e) ||
    e.isCompactSummary === true ||
    isToolUseResultMessage(e) ||
    isInterruptionOnlyMessage(e) ||
    isInterruptMarkerRow(e)
  );
}
//@ chunk-e6aww6q8.js:1831675-1831946 placement
/**
 * 最后一条真实用户提示的 uuid（可用压缩摘要中的提示）。
 */
function findLastUserPromptUuid(e, { orSummarizedPrompt: n = false } = {}) {
  let r;
  let s = n;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let y = e[idx];
    if (y.type !== "user") {
      s &&= !isCompactBoundaryMessage_3(y);
      continue;
    }
    if (!isRealPromptAt(e, idx)) {
      if (s && y.isCompactSummary === true) {
        r = summarizedPromptUuids(y)[0];
        s = false;
      }
      continue;
    }
    return localCommandKind(y) !== undefined || y.isMeta || processQueuedCommands_2(y) ? undefined : y.uuid;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1831946-1832045 placement
/**
 * 指定位置的 user 行是否是真实提示。
 */
function isRealPromptAt(e, n) {
  let r = e[n];
  if (r?.type !== "user" || isNonPromptUserRow(r)) return false;
  return localCommandKind(r) === undefined || !isLocalCommandRecordTail(e, n);
}
//@ chunk-e6aww6q8.js:1832045-1832115 placement
function hasTurnOriginFields(e) {
  return e.turnOrigin !== undefined || e.promptSource !== undefined;
}
//@ chunk-e6aww6q8.js:1832115-1832347 placement
function isPromptKeptAfter(e, n) {
  for (let idx = n + 1; idx < e.length; idx++) {
    let s = e[idx];
    if (s.type === "system") {
      if (s.subtype === "informational" && s.promptSubmitEnding?.promptKept === true) return true;
    } else if (s.type === "assistant" || (s.type === "user" && hasTurnOriginFields(s))) return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1832347-1832633 placement
function hasOwnTurnInSession(e, ownSessionId) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (!("sessionId" in s && s.sessionId === ownSessionId)) return false;
    if (
      s.type === "assistant"
        ? s.message.model !== SYNTHETIC_MODEL
        : hasTurnOriginFields(s) &&
          s.queueTranscriptOnly !== true &&
          !isContextAppendMessage(s) &&
          !isInterruptMarkerRow(s) &&
          !isPromptKeptAfter(e, idx)
    )
      return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1832633-1833053 placement
/**
 * 开启 CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS 时去掉夹在用户行后的合成 API 错误。
 */
function dropContextAppendErrors(e, n) {
  if (!env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS) return e;
  let r;
  for (let idx = 0; idx < e.length; idx++) {
    let h = e[idx];
    let y = e[idx - 1];
    if (
      y?.type === "user" &&
      isSyntheticApiErrorMessage(h) &&
      h.uuid !== n &&
      !(
        Array.isArray(y.message.content) &&
        y.message.content.length > 0 &&
        y.message.content.every(
          (S) =>
            S.type === "tool_result" &&
            (S.content === TOOL_CALL_SESSION_ENDED ||
              S.content === TOOL_RESULT_NOT_IN_COPY ||
              S.content === AGENT_CALL_PROCESS_STOPPED),
        )
      )
    ) {
      r ??= e.slice(0, idx);
      if (isPlainInterruptMarker(y) && y.uuid !== n) r.pop();
      continue;
    }
    r?.push(h);
  }
  return r ?? e;
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
function isLegacyInterruptMarker(e) {
  return (
    isPlainInterruptMarker(e) &&
    e.type === "user" &&
    (singleTextContent(e.message.content) === deserializeMessagesWithInterruptDetection ||
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MIGHTY_FLASK, false) === true)
  );
}
//@ chunk-e6aww6q8.js:1833267-1833338 placement
/**
 * 反序列化远程会话日志为消息数组。
 */
function deserializeToMessages(e, n) {
  return deserializeMessagesImpl(e, undefined, undefined, undefined, undefined, n).messages;
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
  e,
  n,
  r,
  s,
  h,
  y,
  hostAnswerableToolUseIds,
  restoredCardToolUseId,
  hostLogsFinishedTail = false,
  restoredPromptWaits = false,
  q,
  showsCutOffAgentCalls = false,
) {
  try {
    let Se = h ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN;
    let ke = isCutOffPreviewEnabled();
    let we =
      q &&
      e.findLast(
        (jo) =>
          jo.type === "assistant" &&
          Array.isArray(jo.message.content) &&
          jo.message.content.some((Qr) => Qr.type === "tool_use"),
      );
    let Ee = !!we && !("sessionId" in we && we.sessionId === q.ownSessionId);
    let Ae = !ke
      ? INTERRUPT_MESSAGE_FOR_TOOL_USE
      : y || Ee
        ? TOOL_RESULT_NOT_IN_COPY
        : TOOL_CALL_SESSION_ENDED;
    degradeRestoredMessages(e);
    let Ie = filterStopHookSummariesOnResume(e);
    let Me = dropRetractedMessages_2(Ie);
    let We = dropMalformedAttachments(Me);
    let ze = dropContextAppendErrors(We, s);
    let lt = 0;
    let mapped = ze.map((jo) => {
      if (jo.type === "assistant" && !jo.message.id && jo.requestId === undefined) {
        lt += 1;
        return {
          ...jo,
          message: {
            ...jo.message,
            id: randomUUID(),
          },
        };
      }
      if (jo.type === "user" && jo.pluginPrompt === undefined) {
        let pluginPrompt = extractPluginPrompt(jo);
        if (pluginPrompt !== undefined)
          return {
            ...jo,
            pluginPrompt,
          };
      }
      return jo;
    });
    if (lt > 0)
      logForDebugging(
        `deserializeMessages: stamped a message.id on ${lt} id-less assistant entr${lt === 1 ? "y" : "ies"} (pre-#61940 stream-json injection)`,
      );
    let nt = 0;
    let flattened = mapped
      .map(migrateLegacyAttachmentTypes)
      .filter((jo) => jo !== null)
      .flatMap((jo) => {
        let Qr = dropMalformedTextBlocks(jo);
        if (Qr === null) return [jo];
        nt += 1;
        let content = Qr.message.content;
        if (Array.isArray(content) && content.length === 0) return [];
        return [Qr];
      });
    if (nt > 0)
      logForDebugging(
        `deserializeMessages: dropped non-string text block(s) from ${nt} message(s) \u2014 interrupted-stream artifact`,
        {
          level: "warn",
        },
      );
    let Et = dropApiInvalidAssistantBlocks(flattened, {
      site: "resume",
    });
    for (let jo of Et) {
      if (jo.type === "assistant" && jo.wireToolInputs !== undefined) {
        let Qr = countToolCallsSince_2(jo.wireToolInputs, jo.message?.content, jo.batchToolUses);
        if (Qr === undefined) delete jo.wireToolInputs;
        else jo.wireToolInputs = Qr;
      }
      if (
        jo.type === "assistant" &&
        (jo.wireToolInputs !== undefined || jo.wireIngestContext !== undefined)
      ) {
        let Qr = restoreWireInputStamps(jo.wireIngestContext, jo.wireToolInputs, jo.message?.content);
        if (Qr === undefined) delete jo.wireIngestContext;
        else jo.wireIngestContext = Qr;
      }
    }
    let yt = new Set(PERMISSION_MODES);
    let gt = new Set(PROMPT_ORIGIN_KINDS);
    for (let jo of Et) {
      if (jo.type === "user" && jo.permissionMode !== undefined && !yt.has(jo.permissionMode))
        jo.permissionMode = undefined;
      if (jo.type === "user" && jo.promptId !== undefined) delete jo.promptId;
      if (jo.type === "user" && jo.turnOrigin !== undefined && !gt.has(jo.turnOrigin)) delete jo.turnOrigin;
      if (jo.type === "user" && jo.turnPosition !== undefined && !isValidTurnPosition(jo.turnPosition))
        delete jo.turnPosition;
      if (jo.type === "user") {
        delete jo.joinedNoticeOwn;
        for (let Qr of ["origin", "queueOrigin"]) {
          let fi = jo[Qr];
          if (fi?.kind === "task-notification" && fi.producer !== undefined) {
            let { producer, ...Ja } = fi;
            jo[Qr] = Ja;
          }
        }
      }
      if (
        jo.type === "attachment" &&
        jo.attachment?.type === "queued_command" &&
        jo.attachment.origin?.kind === "task-notification" &&
        jo.attachment.origin.producer !== undefined
      ) {
        let { producer, ...fi } = jo.attachment.origin;
        jo.attachment = {
          ...jo.attachment,
          origin: fi,
        };
      }
    }
    let At = dropRedundantShutdownRows(regroupSplitResponsesOnResume(Et));
    let It = ke && !isRemoteToolsForwardEnabled();
    let Yt = new Set();
    let qt = It
      ? rewriteShutdownInterrupts(At, Ae, Yt, [restoredCardToolUseId, ...(hostAnswerableToolUseIds ?? [])])
      : At;
    let Zt = new Set();
    let rn = new Map();
    let pn = new Map();
    let no = new Set();
    let hn = isTailMessage(Et, s);
    let ownSessionId = q?.ownSessionId;
    let yn = Se === true && ownSessionId !== undefined && !hasOwnTurnInSession(Et, ownSessionId);
    let Kn = interruptedTurnResumePolicy(restoredPromptWaits);
    let maxAgeMs = Kn?.maxAgeMs ?? 0;
    let fo = isResumeTooOld(Et, maxAgeMs);
    let To = Se && !n?.size && !r;
    let bo = To && !fo;
    let vn = bo && restoredCardToolUseId === undefined && showsCutOffCalls();
    let co = normalizeMessagesForResume(
      qt,
      n,
      bo
        ? {
            dropSiblingBlocks: true,
            outTrailingUnresolvedToolUseIds: Zt,
            outSupersededToolNames: rn,
            outTrailingUnresolvedCallsByResponse: pn,
            shutdownUnwindResultsDoNotResolve: true,
          }
        : {
            outTrailingUnresolvedToolUseIds: no,
          },
    );
    let So =
      It && restoredCardToolUseId === undefined && ![...Zt].some((jo) => hostAnswerableToolUseIds?.has(jo))
        ? findUnresolvedToolUses_2(qt, fullySettledToolUseIds(qt, Zt), true)
        : new Set();
    for (let jo of So) {
      Zt.delete(jo);
      rn.delete(jo);
    }
    let ko =
      So.size === 0
        ? co
        : appendInterruptedToolResults(qt, n, So, So, Ae, {
            dropSiblingBlocks: true,
            shutdownUnwindResultsDoNotResolve: true,
          });
    let un = filterThinkingOnlyUntilStable(ko);
    let last = ko.findLast(
      (jo) =>
        (jo.type === "assistant" && !isUnattendedStartUnconfirmed(jo)) ||
        (jo.type === "user" && !isContextAppendMessage(jo) && !isQueueTranscriptOnlyUserMessage(jo)),
    );
    let $o =
      Zt.size === 0 &&
      last?.type === "assistant" &&
      last.message.stop_reason === "end_turn" &&
      un.lastIndexOf(last) === -1 &&
      last.message.content.some((jo) => jo.type === "text" && jo.text.trim().length > 0);
    let yo = last?.type === "assistant" && !last.isApiErrorMessage && un.lastIndexOf(last) === -1;
    let Ho =
      yo &&
      last.message.stop_reason === "end_turn" &&
      Zt.size === 0 &&
      no.size === 0 &&
      !ko
        .slice(ko.lastIndexOf(last))
        .some(
          (jo) =>
            jo.type === "attachment" &&
            (jo.attachment.type === "hook_additional_context" ||
              jo.attachment.type === "hook_blocking_error") &&
            jo.attachment.hookEvent === "Stop",
        ) &&
      hasSuccessfulToolCall_2(ko.slice(0, ko.lastIndexOf(last)));
    let rr =
      restoredCardToolUseId !== undefined && isFoamySpringEnabled() && Zt.has(restoredCardToolUseId)
        ? "restored_card"
        : turnsWithInteractiveTools(pn, rn, hostAnswerableToolUseIds);
    let br = So.size === 0 ? undefined : filterThinkingOnlyUntilStable(co);
    let Hr = br && classifyTurnState(br, true, rr);
    let Fr =
      n?.size || r
        ? {
            state: {
              kind: "none",
              because: "not_judged",
            },
            skippedApiErrorRow: undefined,
          }
        : Hr?.state.kind === "none"
          ? Hr
          : classifyTurnState(un, Zt.size > 0, rr, $o, last);
    let cs = yn || hn || isTailMessage(un, s) || (br !== undefined && isTailMessage(br, s));
    let _r = false;
    if (
      Se &&
      Fr.state.kind === "interrupted_turn" &&
      Fr.state.tail === "context_rows" &&
      Zt.size === 0 &&
      no.size === 0 &&
      So.size === 0 &&
      restoredCardToolUseId === undefined &&
      !hostAnswerableToolUseIds?.size &&
      !restoredPromptWaits &&
      !fo &&
      !isResumeTooOld(un, maxAgeMs) &&
      !cs &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_partitioned_finch", true)
    ) {
      let jo = false;
      let Qr = false;
      let fi = -1;
      for (let idx = We.length - 1; idx >= 0 && fi < 0; idx--) {
        let msg = We[idx];
        if (
          msg.type === "system" ||
          msg.type === "progress" ||
          (msg.type === "attachment" &&
            "hookEvent" in msg.attachment &&
            (msg.attachment.hookEvent === "SessionStart" ||
              (msg.attachment.hookEvent === "Stop" &&
                jo &&
                (msg.attachment.type === "hook_success" ||
                  msg.attachment.type === "hook_non_blocking_error"))))
        )
          continue;
        if (
          msg.type === "attachment" &&
          (isNullRenderingAttachment_2(msg) || FILE_ATTACHMENT_TYPES.includes(msg.attachment.type))
        )
          Qr = true;
        else if (msg.type === "user" && msg.isMeta === true && msg.queueTranscriptOnly === true) {
          jo = true;
          Qr = false;
        } else fi = idx;
      }
      let Ri = We[fi];
      let Ja = Ri?.uuid === undefined ? -1 : un.findLastIndex((yr) => yr.uuid === Ri.uuid);
      let Di = un[Ja];
      _r =
        jo &&
        !Qr &&
        (Ri === undefined ||
          (Di?.type === "assistant" && !Di.isApiErrorMessage && Di.message.stop_reason === "end_turn") ||
          (Di?.type === "user" &&
            isToolUseResultMessage(Di) &&
            findToolOnlyResponseId(un, Ja, Di) !== undefined));
    }
    let Cr =
      Ho && Fr.state.kind === "interrupted_turn" && Fr.state.tail === "tool_result"
        ? {
            state: {
              kind: "none",
              because: "silent_reply_after_terminal_tool",
            },
            skippedApiErrorRow: Fr.skippedApiErrorRow,
          }
        : _r
          ? {
              state: {
                kind: "none",
                because: "no_reply_note",
              },
              skippedApiErrorRow: Fr.skippedApiErrorRow,
            }
          : Fr;
    let Vr = To && fo && Cr.state.kind === "none";
    let { state, skippedApiErrorRow } = Vr ? classifyTrailingToolUse(qt) : Cr;
    let Or = Cr.endedAtMaxTurns === true && state.kind === "none";
    if (Or)
      logEvent("tengu_max_turns_turn_classified_complete", {
        auto_resume: Se === true,
      });
    let Io = state.kind !== "none" && cs;
    let zo = !Io && state.kind !== "none" && (Zt.size > 0 || Vr ? fo : isResumeTooOld(un, maxAgeMs));
    let rs = lastMessageAgeMs(Et);
    let Es = rs === undefined ? undefined : Math.floor(rs / 60000);
    if (zo && Se)
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        ...(Es !== undefined && {
          age_min: Es,
        }),
        ...(Kn !== undefined && {
          bound_source: fromEnum(Kn.source),
          bound_min: Math.floor(Kn.maxAgeMs / 60000),
        }),
      });
    let Nr =
      state.kind === "none" && !Or
        ? skippedApiErrorRow
        : newerMessage(skippedApiErrorRow, classifyTurnState(qt, Zt.size > 0, rr).skippedApiErrorRow);
    let Is = refusalRetryMaxAge();
    let fs = !Io && !zo && state.kind !== "none" && Nr !== undefined && isOlderThan(Nr, Is.maxAgeMs);
    if (fs && Se) {
      let jo = Date.now() - Date.parse(Nr.timestamp ?? "");
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        tail: lit_2("api_error"),
        error_kind: fromEnum(apiErrorKind(Nr)),
        ...(Number.isFinite(jo) && {
          age_min: Math.floor(jo / 60000),
        }),
        bound_source: fromEnum(Is.source),
        bound_min: Math.floor(Is.maxAgeMs / 60000),
      });
    }
    let as = Or && (cs || isResumeTooOld(un, maxAgeMs) || (Nr !== undefined && isOlderThan(Nr, Is.maxAgeMs)));
    let Vi = {
      apiErrorSteppedOver: Nr !== undefined,
      invisibleReplyDropped: yo,
    };
    let last_2 = Et.findLast(
      (jo) =>
        (jo.type === "user" || jo.type === "assistant") && !("isSidechain" in jo && jo.isSidechain === true),
    );
    let Wi = {
      ageMinutes: Es,
      shutdownStamped: last_2?.type === "user" && last_2.interruptedByShutdown === true,
    };
    let ii =
      vn && Zt.size > 0 && !cs && ![...Zt].some((jo) => hostAnswerableToolUseIds?.has(jo))
        ? findUnresolvedToolUses_2(
            qt,
            collectResumableToolUseIds(
              qt,
              Zt,
              INTERACTIVE_TOOL_NAMES,
              showsCutOffAgentCalls && state.kind === "interrupted_turn" && !fs && !y,
            ),
            true,
          )
        : new Set();
    let wa = count([...ii], (jo) => isAgentOrTaskTool(rn.get(jo)));
    let hr;
    let mi = So;
    let Ha = false;
    if (ii.size > 0) {
      mi = new Set([...So, ...ii]);
      un = appendInterruptedToolResults(
        qt,
        n,
        mi,
        mi,
        Ae,
        {
          dropSiblingBlocks: true,
          shutdownUnwindResultsDoNotResolve: true,
        },
        state.kind === "none" || fs,
        AGENT_CALL_PROCESS_STOPPED,
      );
    }
    if (Io || zo || fs)
      hr = {
        kind: "none",
      };
    else if (state.kind === "interrupted_turn" || (state.kind === "interrupted_prompt" && ii.size > 0)) {
      if (no.size > 0) {
        un = appendInterruptedToolResults(qt, n, no, ke ? findUnresolvedToolUses_2(qt, no, false) : no, Ae);
        mi = no;
      }
      let [jo] = normalizeMessages([
        createUserMessage({
          content: resumePromptOverride(),
          isMeta: true,
        }),
      ]);
      if (Se || !ke) un.push(jo);
      else Ha = true;
      let Qr = Zt.size === 0 && no.size === 0 ? Nr : undefined;
      let fi =
        Qr?.apiErrorCode === CCS_NO_REQUEST_TOKEN
          ? "no_request_token"
          : Qr?.error === "rate_limit" || Qr?.error === "model_not_found"
            ? Qr.error
            : (Qr?.apiErrorStatus ?? 0) >= 500
              ? "server_error"
              : undefined;
      let lastUserPromptUuid = findLastUserPromptUuid(qt, {
        orSummarizedPrompt: fi === "rate_limit" || fi === "no_request_token",
      });
      hr = {
        kind: "interrupted_prompt",
        message: jo,
        ...(lastUserPromptUuid !== undefined && {
          interruptedTurnUserMessageUuid: lastUserPromptUuid,
        }),
        tail: {
          kind: state.kind === "interrupted_turn" ? state.tail : "cut_off_call_after_prompt",
          ...Vi,
          ...Wi,
          ...(vn && {
            cutOffCalls: {
              shown: ii.size,
              ...(wa > 0 && {
                shownAgentCalls: wa,
              }),
              hidden: Zt.size - ii.size,
              ...summarizeInterruptedSteps(
                un.slice(un.findLastIndex((Ja) => findLastUserPromptUuid([Ja]) === Ja.uuid) + 1),
                ii,
              ),
            },
          }),
        },
        ...(Se &&
          fi !== undefined && {
            endedOnApiError: fi,
          }),
      };
    } else if (state.kind === "interrupted_prompt")
      hr = {
        ...state,
        tail: {
          kind: "unanswered_prompt",
          ...Vi,
          ...Wi,
        },
      };
    else
      hr = {
        kind: state.kind,
      };
    let $a = Io
      ? yn
        ? "not_continued_copied_tail"
        : "not_continued_rewind_anchor"
      : zo
        ? "not_continued_too_old"
        : fs
          ? "not_continued_api_error_too_old"
          : Cr.state.kind === "none"
            ? Cr.state.because
            : undefined;
    if (hr.kind === "none" && $a !== undefined)
      recordTailDiagnostics(
        hr,
        Et,
        (jo) => {
          let lastUserPromptUuid = findLastUserPromptUuid([jo]);
          return lastUserPromptUuid !== undefined && lastUserPromptUuid === jo.uuid;
        },
        (jo) => jo.type === "user" && isNonPromptUserRow(jo),
        {
          because: $a,
          callsWithoutResult: Zt.size + no.size + So.size,
          ...Vi,
          ...(Nr !== undefined &&
            apiErrorKind(Nr) === "rate_limit" && {
              rateLimitRowSteppedOver: true,
            }),
        },
        hostLogsFinishedTail,
      );
    let any = [...no].some((jo) => hostAnswerableToolUseIds?.has(jo) ?? false);
    let Ti =
      ke && !Se && mi.size === 0 && no.size > 0 && !n?.size && !r && !any && !hn && !isTailMessage(un, s)
        ? findUnresolvedToolUses_2(qt, no, true)
        : new Set();
    if (Ti.size > 0) {
      un = appendInterruptedToolResults(qt, n, Ti, Ti, Ae);
      mi = Ti;
    }
    let lastIndex = un.findLastIndex((jo) => jo.type !== "system" && jo.type !== "progress");
    let _i = un[lastIndex]?.type;
    if (
      !r &&
      lastIndex !== -1 &&
      (_i === "user" || (Ha && _i === "attachment")) &&
      !isLocalCommandRecordTail(un, lastIndex) &&
      !(hr.kind === "none" && isSyntheticMessage_2(un, lastIndex)) &&
      !(state.kind === "none" && isQueueTranscriptOnlyUserMessage(un[lastIndex]))
    )
      un.splice(
        lastIndex + 1,
        0,
        createAssistantMessage({
          content: NO_RESPONSE_REQUESTED,
        }),
      );
    for (let jo of ii) {
      Zt.delete(jo);
      rn.delete(jo);
    }
    return {
      messages: un,
      turnInterruptionState: hr,
      supersededToolUseIds: Zt,
      supersededToolNames: rn,
      answeredToolUseIds: new Set([...mi, ...Yt]),
      rescueSuppressed: Io || zo || fs || as,
    };
  } catch (error) {
    logError(error);
    throw error;
  }
}
//@ chunk-e6aww6q8.js:1842520-1842770 placement
function classifyTrailingToolUse(e) {
  let n = new Set();
  let r = normalizeMessagesForResume(e, undefined, {
    dropSiblingBlocks: true,
    outTrailingUnresolvedToolUseIds: n,
    shutdownUnwindResultsDoNotResolve: true,
  });
  if (n.size === 0)
    return {
      state: {
        kind: "none",
        because: "other",
      },
      skippedApiErrorRow: undefined,
    };
  return classifyTurnState(filterThinkingOnlyUntilStable(r), true, NO_INTERACTIVE_TOOLS);
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
function findUnresolvedToolUses_2(e, sinceUuid, r) {
  let s = filterThinkingOnlyUntilStable(e);
  let h = (Z) => isVirtualConversationMessage(Z) || (!r && isSyntheticModelApiErrorMessage(Z));
  let y = (Z) =>
    Z.type === "user" &&
    Array.isArray(Z.message.content) &&
    Z.message.content.some((Se) => Se.type === "tool_result");
  let S = new Set();
  let w = Symbol("ended");
  let L = w;
  let G = new Set();
  let q = {
    toolResult: false,
    classified: false,
  };
  for (let Z of s) {
    if (Z.type === "assistant" && !h(Z)) {
      if (r && isSyntheticModelApiErrorMessage(Z)) {
        L = w;
        G = new Set();
        continue;
      }
      if (q && !q.classified) {
        if (!q.toolResult) S.clear();
        q.classified = true;
      }
      if (S.has(Z.message.id)) {
        if (Z.message.id === L) for (let Se of messageHasToolUse(Z, sinceUuid)) G.add(Se);
        continue;
      }
      S.add(Z.message.id);
      L = Z.message.id;
      G = new Set(messageHasToolUse(Z, sinceUuid));
      q = undefined;
      continue;
    }
    if ((Z.type === "user" && !isVirtualConversationMessage(Z)) || isSystemLocalCommandMessage(Z)) {
      q ??= {
        toolResult: false,
        classified: false,
      };
      if (y(Z)) q.toolResult = true;
      continue;
    }
    if (r && Z.type === "system" && Z.subtype === "model_refusal_fallback") {
      L = w;
      G = new Set();
    }
  }
  return G;
}
//@ chunk-e6aww6q8.js:1843667-1844160 placement
/**
 * 为未完成的工具调用补上中断的 tool_result。
 */
function appendInterruptedToolResults(e, n, r, s, h, y, S = false, w = h) {
  let sliced = filterThinkingOnlyUntilStable(
    normalizeMessagesForResume(e, new Set([...(n ?? []), ...r]), y),
  ).slice();
  let G = [];
  for (let q of sliced) {
    if (q.type !== "assistant" || !Array.isArray(q.message.content)) continue;
    for (let Z of q.message.content) {
      if (Z.type !== "tool_use" || !s.has(Z.id)) continue;
      let Se = isAgentOrTaskTool(Z.name) ? w : h;
      G.push(
        createUserMessage({
          content: [
            {
              type: "tool_result",
              content: Se,
              is_error: true,
              tool_use_id: Z.id,
            },
          ],
          toolUseResult: Se,
          toolDenialKind: "interrupted",
          ...(S && {
            toolDenialEndsTurn: true,
          }),
          sourceToolAssistantUUID: q.uuid,
        }),
      );
    }
  }
  sliced.push(...G);
  return sliced;
}
//@ chunk-e6aww6q8.js:1844160-1844372 placement
function classifyTurnState(e, n, r, s = false, h) {
  let y = [];
  let S = classifyRefusalTurn(e, n, r, y, s, h);
  let skippedApiErrorRow = y[0];
  return S.kind === "ended_at_max_turns"
    ? {
        state: {
          kind: "none",
          because: "max_turns",
        },
        skippedApiErrorRow,
        endedAtMaxTurns: true,
      }
    : {
        state: S,
        skippedApiErrorRow,
      };
}
//@ chunk-e6aww6q8.js:1844372-1847225 placement
/**
 * 分类转录中的拒绝回合（无回合行、已完成等）。
 */
function classifyRefusalTurn(e, n, r, s, h, y) {
  if (e.length === 0) return interruptedTail(n, "no_turn_rows");
  let S = -1;
  let w = false;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let Z = e[idx];
    if (Z.type === "system" || Z.type === "progress") continue;
    if (isQueueTranscriptOnlyUserMessage(Z)) {
      w = true;
      continue;
    }
    if (Z.type === "assistant" && isApiErrorWithoutRefusal(Z)) {
      if (!isUnattendedStartUnconfirmed(Z)) s.push(Z);
      continue;
    }
    S = idx;
    break;
  }
  let L = S !== -1 ? e[S] : undefined;
  if (!L) return interruptedTail(n, "no_turn_rows");
  if (L.type === "assistant") {
    if (L.isApiErrorMessage) {
      logEvent("tengu_refusal_turn_classified_complete", {
        verdict: fromEnum(refusalKind(L)),
      });
      return {
        kind: "none",
        because: "terminal_api_error",
      };
    }
    return refusalTailState(r, n);
  }
  let G = L.type === "attachment" || isContextAppendMessage(L);
  if (L.type === "user" && !G) {
    if (isLocalCommandRecordTail(e, S)) return interruptedTail(n, "local_command");
    if (
      isContinuationPrompt(L) &&
      L === y &&
      !isOlderThan(L, refusalRetryMaxAge().maxAgeMs) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_plover", true)
    )
      return {
        kind: "interrupted_turn",
        tail: "cut_reply_nudge",
      };
    if (isEndTurnNudgeRow(L, y))
      return {
        kind: "interrupted_turn",
        tail: "end_turn_overridden_nudge",
      };
    if (L.isMeta || L.isCompactSummary)
      return interruptedTail(n, L.isCompactSummary ? "compact_summary" : "hidden_row");
    if (isInterruptMarkerText(L)) return stopMarkerState(L);
    if (isToolUseResultMessage(L)) {
      let Z = classifyToolResultEnding(L, e, S, h);
      if (Z?.endsTurn) return terminalToolResultState(Z.responseId, r, n);
      if (isEndedForDeliveryRow(L))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      if (hasTurnEndingDenial(e, S))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      if (isBackgroundedByAbort(L))
        return {
          kind: "none",
          because: "deliberate_stop_result",
        };
      let toolOnlyResponseId = findToolOnlyResponseId(e, S, y);
      if (toolOnlyResponseId !== undefined) return terminalToolResultState(toolOnlyResponseId, r, n);
      return {
        kind: "interrupted_turn",
        tail: toolResultTailKind(Z),
      };
    }
    if (processQueuedCommands_2(L))
      return {
        kind: "interrupted_turn",
        tail: "task_notification",
      };
    let q = userPromptSourceKind(L);
    if (q !== undefined)
      return q === "input" || isAfterCaveatInput(e, S)
        ? interruptedTail(n, "local_command")
        : {
            kind: "interrupted_turn",
            tail: "bash_command",
          };
    if (w)
      return {
        kind: "interrupted_turn",
        tail: "note_after_prompt",
      };
    return {
      kind: "interrupted_prompt",
      message: L,
    };
  }
  if (G) {
    let q = false;
    let Z = false;
    for (let Se = S; Se >= 0; Se--) {
      let ke = e[Se];
      if (
        ke.type === "system" ||
        ke.type === "progress" ||
        ke.type === "attachment" ||
        isContextAppendMessage(ke)
      ) {
        q ||= ke.type === "user";
        Z ||=
          ke.type === "attachment" &&
          ke.attachment.type === "max_turns_reached" &&
          ke.attachment.exitCommitted === false;
        continue;
      }
      if (isQueueTranscriptOnlyUserMessage(ke)) {
        w = true;
        continue;
      }
      if (ke.type === "assistant") {
        if (isApiErrorWithoutRefusal(ke)) {
          if (!isUnattendedStartUnconfirmed(ke)) s.push(ke);
          continue;
        }
        if (ke.isApiErrorMessage) {
          logEvent("tengu_refusal_turn_classified_complete", {
            verdict: fromEnum(refusalKind(ke)),
          });
          return {
            kind: "none",
            because: "terminal_api_error",
          };
        }
        if (q) return interruptedTail(n, "reply_then_reminder");
        return refusalTailState(r, n);
      }
      if (ke.type === "user" && ke.isCompactSummary) return interruptedTail(n, "compact_summary");
      if (ke.type === "user" && isInterruptMarkerText(ke)) return stopMarkerState(ke);
      if (ke.type === "user" && isLocalCommandRecordTail(e, Se)) return interruptedTail(n, "local_command");
      let we = "context_rows";
      if (ke.type === "user" && isToolUseResultMessage(ke)) {
        let Ae = classifyToolResultEnding(ke, e, Se, h);
        if (Ae?.endsTurn) return terminalToolResultState(Ae.responseId, r, n);
        we = toolResultTailKind(Ae);
        if (isEndedForDeliveryRow(ke) || isBackgroundedByAbort(ke) || hasTurnEndingDenial(e, Se))
          return {
            kind: "none",
            because: "deliberate_stop_result",
          };
      }
      let toolOnlyResponseId = findToolOnlyResponseId(e, Se, y);
      if (toolOnlyResponseId !== undefined) return terminalToolResultState(toolOnlyResponseId, r, n);
      if (Z && !n)
        return {
          kind: "ended_at_max_turns",
        };
      return {
        kind: "interrupted_turn",
        tail: Z ? "unresolved_call" : we,
      };
    }
    return q || (w && env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS)
      ? interruptedTail(n, "no_turn_rows")
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
function isLocalCommandRecordTail(e, n) {
  if (localCommandOrSlashKind(e[n]) === undefined) return false;
  let r = false;
  let s;
  let h = true;
  for (let y = n; y >= 0; y--) {
    let S = e[y];
    if (S.type === "system" || S.type === "progress" || S.type === "attachment") continue;
    let w = localCommandOrSlashKind(S);
    if (w === "caveat") return s === undefined || Date.parse(S.timestamp) >= s;
    if (w === undefined || r) break;
    r = w === "record" || w === "bareRecord";
    if (w === "bareRecord") s = Date.parse(S.timestamp);
    h &&= S.type === "user" && S.isMeta === true;
  }
  return h;
}
//@ chunk-e6aww6q8.js:1847617-1847829 placement
function isAfterCaveatInput(e, n) {
  let r = false;
  for (let idx = n - 1; idx >= 0; idx--) {
    let h = e[idx];
    if (h.type === "system" || h.type === "progress" || h.type === "attachment") continue;
    if (!r && userPromptSourceKind(h) === "input") {
      r = true;
      continue;
    }
    return r && localCommandKind(h) === "caveat";
  }
  return false;
}
//@ chunk-e6aww6q8.js:1847829-1847907 placement
function userPromptSourceKind(e) {
  return e.type === "user" && e.promptSource === undefined ? bashCommandTagKindOf(e) : undefined;
}
//@ chunk-e6aww6q8.js:1847907-1848104 placement = isSyntheticMessage (1)
function isSyntheticMessage_2(e, n) {
  if (!isContextAppendMessage(e[n])) return false;
  for (let idx = n - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s.type === "system" || s.type === "progress" || s.type === "attachment" || isContextAppendMessage(s))
      continue;
    return s.type === "user" && isLocalCommandRecordTail(e, idx);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1848104-1848228 placement
function localCommandKind(e) {
  if (e.type !== "user" || e.promptSource !== undefined) return;
  let n = localCommandTagKindOf(e);
  return n === "caveat" && e.isMeta !== true ? undefined : n;
}
//@ chunk-e6aww6q8.js:1848228-1848360 placement
function localCommandOrSlashKind(e) {
  return (
    localCommandKind(e) ??
    (e.type === "user" &&
    e.promptSource === undefined &&
    e.isMeta !== true &&
    looksLikeSlashInput(e.message.content)
      ? "bareRecord"
      : undefined)
  );
}
//@ chunk-e6aww6q8.js:1848360-1848459 placement
function interruptedTail(e, because) {
  return e
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
function terminalToolResultState(responseId, n, r) {
  return n === "restored_card" || (responseId !== undefined && n.has(responseId))
    ? interruptedTail(r, "terminal_tool_result")
    : {
        kind: "none",
        because: "terminal_tool_result",
      };
}
//@ chunk-e6aww6q8.js:1848602-1848691 placement
function refusalTailState(e, n) {
  return e === "restored_card"
    ? interruptedTail(n, "reply")
    : {
        kind: "none",
        because: "reply",
      };
}
//@ chunk-e6aww6q8.js:1848691-1848707 placement
var NO_INTERACTIVE_TOOLS = new Set();
//@ chunk-e6aww6q8.js:1848707-1848856 placement
function turnsWithInteractiveTools(e, n, r) {
  let s = new Set();
  for (let [h, y] of e)
    if (
      y.some((S) => {
        let w = n.get(S);
        return w !== undefined && INTERACTIVE_TOOL_NAMES.has(w) && (r?.has(S) ?? false);
      })
    )
      s.add(h);
  return s;
}
//@ chunk-e6aww6q8.js:1848856-1848988 placement
function stopMarkerState(e) {
  return e.interruptedByShutdown
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
function isInterruptMarkerText(e) {
  let n = singleTextContent(e.message.content);
  return n === INTERRUPT_MESSAGE || n === INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-e6aww6q8.js:1849055-1849177 placement = processQueuedCommands (1)
function processQueuedCommands_2(queuedCommands) {
  if (queuedCommands.origin?.kind !== "task-notification") return false;
  return singleTextContent(queuedCommands.message.content)?.startsWith(`<${TASK_NOTIFICATION}>`) ?? false;
}
//@ chunk-e6aww6q8.js:1849177-1849353 placement
function isQueueTranscriptOnlyUserMessage(e) {
  return (
    e.type === "user" &&
    e.queueTranscriptOnly === true &&
    (processQueuedCommands_2(e) ||
      (env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS &&
        e.origin?.kind === "task-notification" &&
        e.isMeta !== true))
  );
}
//@ chunk-e6aww6q8.js:1849353-1849483 placement
function isEndedForDeliveryRow(e) {
  let content = e.message.content;
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((r) => r.type === "tool_result" && r.content === TOOL_CALL_ENDED_FOR_DELIVERY)
  );
}
//@ chunk-e6aww6q8.js:1849483-1849736 placement
function findToolOnlyResponseId(e, n, r) {
  let s;
  let h = false;
  for (let y = n; y >= 0; y--) {
    let S = e[y];
    if (isEndTurnNudgeRow(S, r)) return;
    if (S.type === "assistant") {
      let { id } = S.message;
      if (!id || (s !== undefined && id !== s)) return;
      if (h) return id;
      s = id;
    } else if (S.type === "user" && !isTurnCompanion(S)) {
      if (!isToolUseResultMessage(S)) return;
      h ||= getToolEndsTurnKind(S) !== false;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:1849736-1849798 placement
function isEndTurnNudgeRow(e, n) {
  return e === n && isTurnNotEndedNotice(e) && !isOlderThan(e, refusalRetryMaxAge().maxAgeMs);
}
//@ chunk-e6aww6q8.js:1849798-1849953 placement
function hasTurnEndingDenial(e, n) {
  for (let r = n; r >= 0; r--) {
    let s = e[r];
    if (s.type === "assistant") return false;
    if (s.type === "user" && isToolUseResultMessage(s) && s.toolDenialEndsTurn === true) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1849953-1850091 placement
function isBackgroundedByAbort(e) {
  let toolUseResult = e.toolUseResult;
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "backgroundedByTurnAbort" in toolUseResult &&
    toolUseResult.backgroundedByTurnAbort === true
  );
}
//@ chunk-e6aww6q8.js:1850091-1850180 placement
function toolResultTailKind(e) {
  return e?.endsTurn === false && e.toUser ? "message_to_user_result" : "tool_result";
}
//@ chunk-e6aww6q8.js:1850180-1850695 placement
/**
 * tool_result 是否结束回合（brief 类、终止 MCP 工具）。
 */
function classifyToolResultEnding(e, n, r, s) {
  let content = e.message.content;
  if (!Array.isArray(content)) return;
  let y = content[0];
  if (y?.type !== "tool_result") return;
  let toolUseId = y.tool_use_id;
  for (let idx = r - 1; idx >= 0; idx--) {
    let L = n[idx];
    if (L.type !== "assistant") continue;
    for (let G of L.message.content)
      if (G.type === "tool_use" && G.id === toolUseId) {
        let q =
          env.CLAUDE_CODE_PEWTER_OWL_TOOL === true &&
          !isBriefEnabled() &&
          !s &&
          !isOlderThan(e, refusalRetryMaxAge().maxAgeMs) &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_witty_hearth", true);
        let Z = BRIEF_TOOL_NAMES.has(G.name);
        return (Z && !q) || (getTerminalMcpTools().has(G.name) && !y.is_error)
          ? {
              endsTurn: true,
              responseId: L.message.id || undefined,
            }
          : {
              endsTurn: false,
              toUser: Z,
            };
      }
  }
  return;
}
//@ chunk-e6aww6q8.js:1850695-1850963 placement
function restoreInvokedSkills(messages) {
  for (let n of messages) {
    if (n.type !== "attachment") continue;
    if (n.attachment.type === "invoked_skills") {
      for (let skill of n.attachment.skills)
        if (skill.name && skill.path && skill.content)
          addInvokedSkill(
            skill.name,
            skill.path,
            skill.content,
            null,
            skill.mcpSkill !== undefined,
            (isSoftSparkEnabled() && Date.parse(n.timestamp)) || Date.now(),
          );
    }
  }
}
//@ chunk-e6aww6q8.js:1850963-1851479 placement
/**
 * 比较已有消息中的 SessionStart 钩子输出（规范化持久化路径），过滤新行中重复的；hook_additional_context 逐条过滤； 没有新内容时返回空数组。
 */
function dedupeSessionStartRows(e, n) {
  if (n.length === 0) return [];
  let r = new Set();
  for (let y of e) for (let S of sessionStartRowKeys(y)) r.add(S);
  if (r.size === 0) return [...n];
  let s = false;
  let h = [];
  for (let y of n) {
    let S = sessionStartRowKeys(y);
    if (S.length === 0 || y.type !== "attachment") {
      h.push(y);
      continue;
    }
    let attachment = y.attachment;
    if (attachment.type === "hook_additional_context" && attachment.content.length > 1) {
      let filtered = attachment.content.filter((G) => !r.has(normalizePersistedOutputPath(G)));
      if (filtered.length === 0) continue;
      s = true;
      h.push(
        filtered.length === attachment.content.length
          ? y
          : withRenderedAttachment(y, {
              ...attachment,
              content: filtered,
            }),
      );
      continue;
    }
    if (r.has(S[0])) continue;
    s = true;
    h.push(y);
  }
  if (!s) return [];
  return h;
}
//@ chunk-e6aww6q8.js:1851479-1851592 placement
/**
 * 等待 SessionStart 钩子并追加去重后的行。
 */
async function appendSessionStartRows(e) {
  let promise = await e.sessionStartHooks.promise;
  let r = dedupeSessionStartRows(e.messages, promise);
  e.messages.push(...r);
  return r;
}
//@ chunk-e6aww6q8.js:1851592-1851958 placement
/**
 * SessionStart 钩子附件的比较键。
 */
function sessionStartRowKeys(e) {
  if (e.type !== "attachment") return [];
  let attachment = e.attachment;
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
function normalizePersistedOutputPath(e) {
  if (!e.startsWith(PERSISTED_OUTPUT_TAG)) return e;
  return e.replace(/(saved to: ).*$/m, "$1<persisted>");
}
//@ chunk-e6aww6q8.js:1852058-1852560 placement
/**
 * 去掉被 retractedMessageUuids 撤回的消息并记遥测。
 */
function dropRetractedMessages_2(messages) {
  let n = new Set(
    messages.flatMap((s) =>
      (s.type === "user" ||
        s.type === "assistant" ||
        (s.type === "system" && s.subtype === "model_refusal_fallback")) &&
      Array.isArray(s.retractedMessageUuids)
        ? s.retractedMessageUuids
            .filter((retractedMessageUuid) => typeof retractedMessageUuid === "string")
            .map((retractedMessageUuid) => retractedMessageUuid.slice(0, UUID_PREFIX_LENGTH))
        : [],
    ),
  );
  if (n.size === 0) return messages;
  let filtered = messages.filter(
    (s) => s.type === "system" || typeof s.uuid !== "string" || !n.has(s.uuid.slice(0, UUID_PREFIX_LENGTH)),
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
  isPlainInterruptMarker,
  appendSessionStartRows,
  hasToolResultBlock_3,
  isLegacyInterruptMarker,
  isStopInterruptionRow,
  hasSuccessfulToolCall_2,
  isRealPromptAt,
  isAgentOrTaskTool,
};
