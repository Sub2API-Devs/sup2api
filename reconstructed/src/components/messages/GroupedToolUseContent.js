/**
 * components/messages/GroupedToolUseContent.tsx
 *
 * 同类工具调用分组显示（工具的 renderGroupedToolUse）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/GroupedToolUseContent.tsx
 * pieces: chunk-ah34pb7m.js (18)
 * attribution: placement 15, sole-consumer 1, affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  isToolDenial,
  isUserInterruptMessage,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  getUserMessageText,
} from "../../utils/messages.js";
import { INTERRUPTED_TOOL_STATUSES, USER_REJECTED_KIND } from "../../entrypoints/sdk/coreSchemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { UserToolErrorMessage } from "./UserToolResultMessage/UserToolErrorMessage.js";
import { VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import {
  useState,
  init_react_production,
  createContext,
} from "../../../vendor/react/cjs/react.production.js";
import { hasNoErrorOrInterrupt, hasContentAfterIndex } from "./toolResultRendering.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { CollapsedReadSearchContent, selectViewingAgentTaskId_2 } from "./CollapsedReadSearchContent.js";
import { useAppState, useAppStateSlice } from "../../state/AppState.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { useThinkingStartedAt } from "../Spinner/spinnerStatus.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MAX_LOGGED_THOUGHT_MS } from "../../utils/collapseReadSearch.js";
import { formatDuration } from "../../utils/format.js";
import { Text } from "../../ink/components/Text.js";
import { stripMemoryTags } from "../../services/orgMemory/promptIndex.js";
import { wrapText } from "../../ink/wrap-text.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { hasStringUuid } from "../../bridge/inboundMessages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ah34pb7m.js:162030-163885 placement
/**
 * 分组工具调用中的一行（输入、结果、进度）。
 */
function GroupedToolUseRow(props) {
  let $ = useMemoCache(24);
  let { toolUseID, input, resultMsg, tool, tools, progressMessagesForMessage } = props;
  let { columns } = useTerminalSize();
  let [theme] = useTheme();
  if (resultMsg?.type !== "user") {
    return null;
  }
  let row;
  let earlyResult;
  if (
    $[0] !== columns ||
    $[1] !== input ||
    $[2] !== progressMessagesForMessage ||
    $[3] !== resultMsg ||
    $[4] !== theme ||
    $[5] !== tool ||
    $[6] !== toolUseID ||
    $[7] !== tools
  ) {
    earlyResult = EARLY_RETURN_SENTINEL;
    N: {
      let resultElement;
      if ($[10] !== toolUseID) {
        resultElement = (state) => state.type === "tool_result" && state.tool_use_id === toolUseID;
        $[10] = toolUseID;
        $[11] = resultElement;
      } else resultElement = $[11];
      row = resultMsg.message.content.find(resultElement);
      if (row?.type !== "tool_result") {
        earlyResult = null;
        break N;
      }
      let isInterrupted = isToolDenial(row.content, resultMsg, INTERRUPTED_TOOL_STATUSES);
      let isRejected = isToolDenial(row.content, resultMsg, USER_REJECTED_KIND);
      if (isInterrupted && typeof row.content === "string" && isUserInterruptMessage(row.content)) {
        let toolName;
        if ($[12] === MEMO_CACHE_SENTINEL) {
          toolName = jsxProd_default(RejectedToolUseMessage, {});
          $[12] = toolName;
        } else toolName = $[12];
        earlyResult = toolName;
        break N;
      }
      if (
        (isRejected &&
          typeof row.content === "string" &&
          (row.content.startsWith(REJECT_MESSAGE) ||
            (row.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX) &&
              mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage") !== undefined))) ||
        (isInterrupted &&
          (row.content === INTERRUPT_MESSAGE_FOR_TOOL_USE ||
            row.content === TOOL_CALL_ENDED_FOR_DELIVERY ||
            row.content === TOOL_CALL_SESSION_ENDED ||
            row.content === TOOL_RESULT_NOT_IN_COPY ||
            row.content === AGENT_CALL_PROCESS_STOPPED))
      ) {
        let resultBlock = mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage");
        if (!resultBlock) {
          let isError;
          if ($[13] === MEMO_CACHE_SENTINEL) {
            isError = jsxProd_default(RejectedToolUseMessage, {});
            $[13] = isError;
          } else isError = $[13];
          earlyResult = isError;
          break N;
        }
        let rowElement = safeParseToolInput(tool, input);
        if (!rowElement.success) {
          let rejectedElement;
          if ($[14] === MEMO_CACHE_SENTINEL) {
            rejectedElement = jsxProd_default(RejectedToolUseMessage, {});
            $[14] = rejectedElement;
          } else rejectedElement = $[14];
          earlyResult = rejectedElement;
          break N;
        }
        earlyResult =
          resultBlock(rowElement.data, {
            columns,
            messages: [],
            tools,
            verbose: true,
            progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
            isInterrupted:
              typeof row.content !== "string" ||
              !(
                row.content.startsWith(REJECT_MESSAGE) ||
                row.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)
              ),
            theme,
            isTranscriptMode: true,
          }) ?? jsxProd_default(RejectedToolUseMessage, {});
        break N;
      }
    }
    $[0] = columns;
    $[1] = input;
    $[2] = progressMessagesForMessage;
    $[3] = resultMsg;
    $[4] = theme;
    $[5] = tool;
    $[6] = toolUseID;
    $[7] = tools;
    $[8] = row;
    $[9] = earlyResult;
  } else {
    row = $[8];
    earlyResult = $[9];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let userToolErrorMessageElement;
  if (
    $[15] !== row ||
    $[16] !== input ||
    $[17] !== progressMessagesForMessage ||
    $[18] !== resultMsg.remoteToolDenialKind ||
    $[19] !== resultMsg.toolDenialKind ||
    $[20] !== resultMsg.toolUseResult ||
    $[21] !== tool ||
    $[22] !== tools
  ) {
    userToolErrorMessageElement = jsxProd_default(UserToolErrorMessage, {
      param: row,
      tool,
      tools,
      input,
      output: resultMsg.toolUseResult,
      toolDenialKind: resultMsg.toolDenialKind,
      remoteToolDenialKind: resultMsg.remoteToolDenialKind,
      verbose: true,
      progressMessagesForMessage,
      isTranscriptMode: true,
    });
    $[15] = row;
    $[16] = input;
    $[17] = progressMessagesForMessage;
    $[18] = resultMsg.remoteToolDenialKind;
    $[19] = resultMsg.toolDenialKind;
    $[20] = resultMsg.toolUseResult;
    $[21] = tool;
    $[22] = tools;
    $[23] = userToolErrorMessageElement;
  } else userToolErrorMessageElement = $[23];
  return userToolErrorMessageElement;
}
//@ chunk-ah34pb7m.js:163885-163909 placement
var MEMO_KEY_FIELD_SEP = "\x00";
var MEMO_KEY_ROW_SEP = "\x01";
//@ chunk-ah34pb7m.js:163909-165874 placement
/**
 * 渲染一组同类工具调用（进行中、出错、活跃组）。
 */
function GroupedToolUseContent(props) {
  let $ = useMemoCache(34);
  let { message, inProgressToolUseIDs, lookups, verbose, isActiveGroup } = props;
  let memoKey;
  if ($[0] !== inProgressToolUseIDs || $[1] !== lookups || $[2] !== message) {
    const calls = toolCallOf(message);
    let callKey;
    if ($[4] !== inProgressToolUseIDs || $[5] !== lookups) {
      callKey = (call) =>
        [
          call.id,
          lookups.toolResultByToolUseID.get(call.id)?.uuid ?? "",
          inProgressToolUseIDs.has(call.id) ? "running" : "",
          lookups.erroredToolUseIDs.has(call.id) ? "errored" : "",
        ].join(MEMO_KEY_FIELD_SEP);
      $[4] = inProgressToolUseIDs;
      $[5] = lookups;
      $[6] = callKey;
    } else callKey = $[6];
    memoKey = calls.map(callKey).join(MEMO_KEY_ROW_SEP);
    $[0] = inProgressToolUseIDs;
    $[1] = lookups;
    $[2] = message;
    $[3] = memoKey;
  } else memoKey = $[3];
  let memoKey_2 = memoKey;
  let buildValue;
  if ($[7] !== inProgressToolUseIDs || $[8] !== lookups || $[9] !== message) {
    buildValue = (key) => ({
      key,
      calls: toolCallOf(message).map((call) => {
        let resultMsg = lookups.toolResultByToolUseID.get(call.id);
        return {
          tool_use_id: call.id,
          tool: call.name,
          input: call.input,
          isRunning: inProgressToolUseIDs.has(call.id),
          isErrored: lookups.erroredToolUseIDs.has(call.id),
          isInterrupted: VALIDATE_TREE_NAMESPACE.isInterruptedCall(resultMsg),
          output: resultMsg?.type === "user" ? resultMsg.toolUseResult : undefined,
        };
      }),
    });
    $[7] = inProgressToolUseIDs;
    $[8] = lookups;
    $[9] = message;
    $[10] = buildValue;
  } else buildValue = $[10];
  let buildValue_2 = buildValue;
  let computeValue;
  if ($[11] !== memoKey_2 || $[12] !== buildValue_2) {
    computeValue = () => buildValue_2(memoKey_2);
    $[11] = memoKey_2;
    $[12] = buildValue_2;
    $[13] = computeValue;
  } else computeValue = $[13];
  let [state, setState] = useState(computeValue);
  let value = state;
  if (state.key !== memoKey_2) {
    if ($[14] !== memoKey_2 || $[15] !== buildValue_2) {
      value = buildValue_2(memoKey_2);
      setState(value);
      $[14] = memoKey_2;
      $[15] = buildValue_2;
      $[16] = value;
    } else value = $[16];
  }
  let { calls } = value;
  let isCallsOnly;
  if (
    $[17] !== calls ||
    $[18] !== message.accountMemoryRecalls?.length ||
    $[19] !== message.hookCount ||
    $[20] !== message.hookInfos?.length ||
    $[21] !== message.hookTotalMs ||
    $[22] !== message.messages ||
    $[23] !== message.relevantMemories?.length
  ) {
    isCallsOnly =
      calls.every(hasNoErrorOrInterrupt) &&
      (message.relevantMemories?.length ?? 0) === 0 &&
      (message.accountMemoryRecalls?.length ?? 0) === 0 &&
      (message.hookCount ?? 0) === 0 &&
      (message.hookTotalMs ?? 0) === 0 &&
      (message.hookInfos?.length ?? 0) === 0 &&
      message.messages.every(hasContentAfterIndex);
    $[17] = calls;
    $[18] = message.accountMemoryRecalls?.length;
    $[19] = message.hookCount;
    $[20] = message.hookInfos?.length;
    $[21] = message.hookTotalMs;
    $[22] = message.messages;
    $[23] = message.relevantMemories?.length;
    $[24] = isCallsOnly;
  } else isCallsOnly = $[24];
  let isCallsOnly_2 = isCallsOnly;
  let renderInput;
  let renderDeps;
  if (
    $[25] !== calls ||
    $[26] !== isActiveGroup ||
    $[27] !== isCallsOnly_2 ||
    $[28] !== message.uuid ||
    $[29] !== verbose
  ) {
    renderInput = () => ({
      requestId: message.uuid,
      props: {
        calls,
        isActive: isActiveGroup === true,
        isExpanded: verbose,
        isCallsOnly: isCallsOnly_2,
      },
    });
    renderDeps = [message.uuid, calls, isActiveGroup, verbose, isCallsOnly_2];
    $[25] = calls;
    $[26] = isActiveGroup;
    $[27] = isCallsOnly_2;
    $[28] = message.uuid;
    $[29] = verbose;
    $[30] = renderInput;
    $[31] = renderDeps;
  } else {
    renderInput = $[30];
    renderDeps = $[31];
  }
  let renderKey = actionKeysNamespace.useRenderInput("ToolGroup", renderInput, renderDeps);
  let renderHook;
  if ($[32] !== props) {
    renderHook = (draw) =>
      jsxProd_default(CollapsedReadSearchContent, {
        ...props,
        verbose: draw.props.isExpanded,
      });
    $[32] = props;
    $[33] = renderHook;
  } else renderHook = $[33];
  return actionKeysNamespace.useRenderHook(renderKey, renderHook);
}
//@ chunk-ah34pb7m.js:165874-166083 placement = toolCallOf (1)
function toolCallOf(msg) {
  let content = [];
  for (let message of msg.messages) {
    let lookups =
      message.type === "assistant" ? [message] : message.type === "grouped_tool_use" ? message.messages : [];
    for (let lookup of lookups) {
      let block = lookup.message.content[0];
      if (block?.type === "tool_use") content.push(block);
    }
  }
  return content;
}
//@ chunk-ah34pb7m.js:185246-185626 placement
/**
 * 思考已用时间计时显示。
 */
function ThinkingElapsed(props) {
  let $ = useMemoCache(6);
  let { baseMs, lastThinkingAtMs } = props;
  let appState = useAppState(selectViewingAgentTaskId_2);
  let viewedTaskId;
  if ($[0] !== appState) {
    viewedTaskId = appState ?? mainAgentId();
    $[0] = appState;
    $[1] = viewedTaskId;
  } else viewedTaskId = $[1];
  let thinkingStartedAt = useThinkingStartedAt(viewedTaskId);
  useAnimationFrame(thinkingStartedAt !== null ? 1000 : null);
  let elapsedMs =
    thinkingStartedAt !== null
      ? baseMs +
        Math.min(
          MAX_LOGGED_THOUGHT_MS,
          Math.max(0, Date.now() - Math.max(thinkingStartedAt, lastThinkingAtMs)),
        )
      : baseMs;
  const max = Math.max(1000, elapsedMs);
  let children;
  if ($[2] !== max) {
    children = formatDuration(max);
    $[2] = max;
    $[3] = children;
  } else children = $[3];
  let labelElement;
  if ($[4] !== children) {
    labelElement = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[4] = children;
    $[5] = labelElement;
  } else labelElement = $[5];
  return labelElement;
}
//@ chunk-ah34pb7m.js:185626-185889 placement
/**
 * 从 anchorMs 起计时，超过 2 秒后显示" · 耗时"，动画时每秒刷新。
 */
function ElapsedSinceAnchor(props) {
  let $ = useMemoCache(4);
  let { anchorMs, shouldAnimate } = props;
  useAnimationFrame(shouldAnimate ? 1000 : null);
  let elapsedMs = Date.now() - anchorMs;
  if (elapsedMs < 2000) {
    return null;
  }
  let durationText;
  if ($[0] !== elapsedMs) {
    durationText = formatDuration(elapsedMs);
    $[0] = elapsedMs;
    $[1] = durationText;
  } else durationText = $[1];
  let durationElement;
  if ($[2] !== durationText) {
    durationElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", durationText],
    });
    $[2] = durationText;
    $[3] = durationElement;
  } else durationElement = $[3];
  return durationElement;
}
//@ chunk-ah34pb7m.js:185889-186222 placement
/**
 * 把文本按宽度折行截到指定行数并加省略号。
 */
function truncateToLines(text, columns, maxLines) {
  let stripped = stripMemoryTags(text);
  if (columns < 1) return stripped;
  let lines = wrapText(stripped, columns, "wrap").split(`
`);
  if (lines.length <= maxLines) return stripped;
  let trimmed = lines.slice(0, maxLines).join("").replace(/\s+/g, " ").trim();
  while (
    trimmed.length > 0 &&
    countCharInString(
      wrapText(`${trimmed}\u2026`, columns, "wrap"),
      `
`,
    ) +
      1 >
      maxLines
  ) {
    let trimmedChar = trimmed.length > 1 ? trimmed.codePointAt(trimmed.length - 2) : undefined;
    trimmed = trimmed.slice(0, trimmedChar !== undefined && trimmedChar > 65535 ? -2 : -1);
  }
  return `${trimmed.trimEnd()}\u2026`;
}
//@ chunk-ah34pb7m.js:186222-186312 placement
function lowerFirstUnlessAcronym(text, keepCase) {
  return keepCase || /^\S\S*\p{Lu}/u.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}
//@ chunk-ah34pb7m.js:186312-186984 placement
/**
 * 收集消息中以后台方式运行的 Bash/Agent 工具调用 id。
 */
function collectBackgroundToolUseIds(messages) {
  let toolUseIds = new Set();
  let backgroundIds = new Set();
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content)
      if (block.type === "tool_use" && (block.name === AGENT || block.name === TASK)) {
        toolUseIds.add(block.id);
        if (block.input?.run_in_background !== false) backgroundIds.add(block.id);
      }
  }
  if (toolUseIds.size === 0) return false;
  let completedIds = new Set();
  let hasPending = false;
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    let hasToolResult = false;
    for (let block of message.message.content)
      if (block.type === "tool_result" && toolUseIds.has(block.tool_use_id)) {
        hasToolResult = true;
        completedIds.add(block.tool_use_id);
        if (block.is_error === true) hasPending = true;
      }
    if (!hasToolResult) continue;
    let status = message.toolUseResult?.status;
    if (status === "async_launched" || status === "remote_launched" || status === "teammate_spawned")
      hasPending = true;
  }
  if (hasPending) return true;
  for (let backgroundId of backgroundIds) if (!completedIds.has(backgroundId)) return true;
  return false;
}
//@ chunk-ah34pb7m.js:186984-186988 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:186984", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:186988-186992 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:186988", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:186992-187166 placement
var COMPACTED_TRANSCRIPT_HINT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CompactSummaryContext;
deferInit("chunk-ah34pb7m.js:186992", () => {
  COMPACTED_TRANSCRIPT_HINT =
    "If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: ";
  CompactSummaryContext = createContext(null);
});
//@ chunk-ah34pb7m.js:187166-187682 placement
/**
 * 找到消息列表开头的压缩边界及其摘要消息。
 */
function findLeadingCompactBoundary(messages) {
  let index = messages.findIndex(
    (state) => state.type === "user" || state.type === "assistant" || isCompactBoundaryMessage(state),
  );
  let candidate = messages[index];
  if (candidate === undefined || !isCompactBoundaryMessage(candidate) || !hasStringUuid(candidate))
    return null;
  let summary;
  for (let k = index + 1; k < messages.length; k++) {
    let next = messages[k];
    if (isCompactBoundaryMessage(next)) break;
    if (next.type === "user" && next.isCompactSummary) {
      summary = getUserMessageText(next);
      break;
    }
  }
  if (summary === undefined)
    return {
      uuid: candidate.uuid,
      summary: null,
    };
  let hintIndex =
    summary?.lastIndexOf(`
${COMPACTED_TRANSCRIPT_HINT}`) ?? -1;
  if (summary === null || hintIndex === -1)
    return {
      uuid: candidate.uuid,
      summary: {
        transcriptPath: undefined,
      },
    };
  let pathStart = hintIndex + 1 + COMPACTED_TRANSCRIPT_HINT.length;
  let index_2 = summary.indexOf(
    `
`,
    pathStart,
  );
  return {
    uuid: candidate.uuid,
    summary: {
      transcriptPath: summary.slice(pathStart, index_2 === -1 ? undefined : index_2),
    },
  };
}
//@ chunk-ah34pb7m.js:187682-187792 placement
/**
 * 工具组标题后的提示后缀：没有摘要信息时提示查看历史，有摘要时提示查看摘要。
 */
function historyHintSuffix(summary, shortcut) {
  if (summary === null) return ` (${shortcut} for history)`;
  return summary.summary === null ? "" : ` (${shortcut} for the summary)`;
}
//@ chunk-ah34pb7m.js:187792-187857 placement
/**
 * 函数 leadingCompactHint（取以压缩边界开头的历史提示后缀）；位于「同类工具调用分组显示（工具的 renderGroupedToolUse）」模块。
 */
function leadingCompactHint(messages, uuid, shortcut) {
  let leadingCompactBoundary = findLeadingCompactBoundary(messages);
  return historyHintSuffix(leadingCompactBoundary?.uuid === uuid ? leadingCompactBoundary : null, shortcut);
}
//@ chunk-ah34pb7m.js:189153-189209 sole-consumer
function selectActiveAgents_4(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:189209-189248 affinity
function isToolUseInProgress(toolUse) {
  return toolUse.isInProgress;
}
//@ chunk-ah34pb7m.js:189248-190237 fingerprint = GroupedToolUseContent (0.834)
function GroupedToolUseContent_2(props) {
  let $ = useMemoCache(11);
  let { message, tools, lookups, inProgressToolUseIDs, shouldAnimate, addMargin } = props;
  let activeAgents = useAppStateSlice(selectActiveAgents_4);
  let children;
  let deps;
  if (
    $[0] !== activeAgents ||
    $[1] !== addMargin ||
    $[2] !== inProgressToolUseIDs ||
    $[3] !== lookups ||
    $[4] !== message.messages ||
    $[5] !== message.results ||
    $[6] !== message.toolName ||
    $[7] !== shouldAnimate ||
    $[8] !== tools
  ) {
    deps = EARLY_RETURN_SENTINEL;
    L: {
      let tool = findToolByName(tools, message.toolName);
      let override = tool && mcpRenderOverrideFor(tool, "renderGroupedToolUse");
      if (!override) {
        deps = null;
        break L;
      }
      let resultsByToolUseId = new Map();
      for (const resultMsg of message.results) {
        for (const content of resultMsg.message.content) {
          if (content.type === "tool_result")
            resultsByToolUseId.set(content.tool_use_id, {
              param: content,
              output: resultMsg.toolUseResult,
            });
        }
      }
      let toolUsesData = message.messages.map((msg) => {
        let content = msg.message.content[0];
        let result = resultsByToolUseId.get(content.id);
        return {
          param: content,
          isResolved: lookups.resolvedToolUseIDs.has(content.id),
          isError: lookups.erroredToolUseIDs.has(content.id),
          isInProgress: inProgressToolUseIDs.has(content.id),
          progressMessages: filterToolProgressMessages(
            lookups.progressMessagesByToolUseID.get(content.id) ?? [],
          ),
          result,
        };
      });
      let anyInProgress = toolUsesData.some(isToolUseInProgress);
      children = override(toolUsesData, {
        shouldAnimate: shouldAnimate && anyInProgress,
        tools,
        addMargin,
        activeAgents,
      });
    }
    $[0] = activeAgents;
    $[1] = addMargin;
    $[2] = inProgressToolUseIDs;
    $[3] = lookups;
    $[4] = message.messages;
    $[5] = message.results;
    $[6] = message.toolName;
    $[7] = shouldAnimate;
    $[8] = tools;
    $[9] = children;
    $[10] = deps;
  } else {
    children = $[9];
    deps = $[10];
  }
  if (deps !== EARLY_RETURN_SENTINEL) return deps;
  return children;
}
export {
  findLeadingCompactBoundary,
  CompactSummaryContext,
  leadingCompactHint,
  historyHintSuffix,
  GroupedToolUseRow,
  toolCallOf,
  ThinkingElapsed,
  collectBackgroundToolUseIds,
  lowerFirstUnlessAcronym,
  ElapsedSinceAnchor,
  truncateToLines,
  GroupedToolUseContent_2,
  GroupedToolUseContent,
};
