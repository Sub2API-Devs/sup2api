/**
 * tools/AgentTool/UI.tsx
 *
 * Agent 工具的终端渲染：调用摘要、进度增量汇总、结果统计、拒绝/错误、分组显示与模型标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/UI.tsx
 * pieces: chunk-p5q1xrhb.js (1), chunk-tmsx2mh0.js (3), chunk-wjygkcr4.js (39)
 * attribution: fingerprint 9, placement 2, layout 15, file-local 3, affinity 4, facade-exports 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { COORDINATOR_WORKER_AGENT_TYPE } from "../../coordinator/workerAgent.js";
import { resolveAgentOverrides, compareAgentsByName, hasSubagentOverride } from "./agentDisplay.js";
import { FETCH } from "../WebFetchTool/prompt.js";
import { getAgentColor } from "./agentColorManager.js";
import { getSlackChannelLink } from "../MCPTool/slackSend.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { memo, useRef } from "../../../vendor/react/cjs/react.production.js";
import { MessageImpl, areMessagePropsEqual } from "../../components/Message.js";
import { getSearchOrReadFromContent, getSearchReadSummaryText } from "../../utils/collapseReadSearch.js";
import { logError } from "../../utils/log.js";
import { hasSearchOrReadActivity } from "../WebSearchTool/UI.js";
import {
  collectResolvedToolUseIds,
  markServerToolUseResolved,
  EMPTY_LOOKUPS,
  buildSubagentLookups as buildSubagentLookups_2,
  createAssistantMessage,
} from "../../utils/messages.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { finalContextTokensFromLastResponse } from "../../cli/print.js";
import { totalTokensOf } from "../../utils/messages/usageAndStopReason.js";
import { MarkdownText_2 } from "../../components/pluginUi/render/MarkdownBlock.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { hasAutoModeBlockedToolResult } from "../../components/messages/teamMemCollapsed.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../components/ConfigurableShortcutHint.js";
import { splitHarnessNotes } from "../WebFetchTool/harnessNotes.js";
import { renderToolUseProgressMessage as renderToolUseProgressMessage_6 } from "../WebFetchTool/UI.js";
import { formatNumber, formatDuration } from "../../utils/format.js";
import { SubAgentProvider, CtrlOToExpand, OverflowHint } from "../../components/CtrlOToExpand.js";
import { firstUrlInText } from "../../services/oauth/oauthErrors.js";
import { WebFetchTool } from "../WebFetchTool/WebFetchTool.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { parseUserSpecifiedModel, renderModelName } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { FallbackToolUseRejectedMessage } from "../../components/FallbackToolUseRejectedMessage.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { RejectedToolUseMessage } from "../../components/messages/UserToolResultMessage/RejectedToolUseMessage.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { countWhere } from "../../utils/collections.js";
import { getAgentInputSchema } from "./agentInputSchema.js";
import { dropRelativeEffortInput } from "./agentEffort.js";
import { ToolUseLoader } from "../../components/ToolUseLoader.js";
import { AgentProgressLine } from "../../components/AgentProgressLine.js";
import { findToolByName, safeParseToolInput } from "../../Tool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tmsx2mh0.js:19434-19591 placement (2.1.88 match: updateAgentFile, 1)
function updateAgentFile(subagentType, activeAgents) {
  if (!subagentType || subagentType === GENERAL_PURPOSE_AGENT.agentType) return;
  if (subagentType !== COORDINATOR_WORKER_AGENT_TYPE) return subagentType;
  let found = activeAgents?.find((agent) => agent.agentType === COORDINATOR_WORKER_AGENT_TYPE);
  return found !== undefined && found.source !== "built-in" ? subagentType : undefined;
}
//@ chunk-tmsx2mh0.js:19591-19733 fingerprint (2.1.88 match: userFacingName, 0.557)
/**
 * Agent 工具的 userFacingName：web-fetch 代理显示为 Fetch，否则显示代理显示名或 "Agent"。
 */
function userFacingName(input, { activeAgents, webFetchByAgentType = false } = {}) {
  if (!webFetchByAgentType && resolveAgentOverrides(input?.subagent_type, activeAgents)) return FETCH;
  return updateAgentFile(input?.subagent_type, activeAgents) ?? "Agent";
}
//@ chunk-tmsx2mh0.js:19733-19848 fingerprint (2.1.88 match: userFacingNameBackgroundColor, 0.701)
/**
 * Agent 工具名徽标背景色：按 subagent_type 取代理颜色（web-fetch 代理无色）。
 */
function userFacingNameBackgroundColor(input, { activeAgents } = {}) {
  if (!input?.subagent_type || resolveAgentOverrides(input.subagent_type, activeAgents)) return;
  return getAgentColor(input.subagent_type);
}
//@ chunk-p5q1xrhb.js:17835-17866 fingerprint (2.1.88 match: INITIALIZING_TEXT, 1)
/**
 * 另一个块中的 "Initializing…" 文本与常量 3。
 */
var MAX_TAIL_ITEMS = 3;
var INITIALIZING_TEXT = "Initializing\u2026";
//@ chunk-wjygkcr4.js:14910-15071 fingerprint (2.1.88 match: renderToolUseTag, 0.845)
/**
 * Agent 工具调用行后的标签（如模型/链接），支持超链接。
 */
function renderToolUseTag_2(input) {
  let agentModel = getSlackChannelLink(input);
  if (agentModel === null) return null;
  return jsxProd_default(Box, {
    flexWrap: "nowrap",
    marginLeft: 1,
    children: jsxProd_default(Ansi, {
      children:
        agentModel.url && supportsHyperlinks()
          ? createHyperlink(agentModel.url, agentModel.label)
          : agentModel.label,
    }),
  });
}
//@ chunk-wjygkcr4.js:249107-249124 placement
/**
 * AgentTool UI 的进度选择器与消息类型判断。
 */
var agentProgressSelector; // deferred: uses MessageImpl (../../components/Message.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wjygkcr4.js:249107", () => {
  agentProgressSelector = memo(MessageImpl, areMessagePropsEqual);
});
//@ chunk-wjygkcr4.js:249124-249232 layout (2.1.88 match: hasProgressMessage, 1)
/**
 * 进度 data 是否带 message 对象。
 */
function hasProgressMessage(data) {
  if (!("message" in data)) return false;
  let msg = data.message;
  return msg != null && typeof msg === "object" && "type" in msg;
}
//@ chunk-wjygkcr4.js:249232-249265 file-local
/**
 * 进度项的 data 是否带 message。
 */
function isProgressWithMessage(pm_0) {
  return hasProgressMessage(pm_0.data);
}
//@ chunk-wjygkcr4.js:249265-249373 layout
function startsWithToolBlock(args) {
  let firstBlock = args.data.message.message.content[0];
  return firstBlock?.type === "tool_use" || firstBlock?.type === "tool_result";
}
//@ chunk-wjygkcr4.js:249373-249635 file-local
function getProgressMessageToolUseInfo(progressMessage, tools, toolUseByID) {
  if (!hasProgressMessage(progressMessage.data)) return null;
  let message = progressMessage.data.message;
  if (message.type === "assistant") return getSearchOrReadFromContent(message.message.content[0], tools);
  if (message.type === "user") {
    let content = message.message.content[0];
    if (content?.type === "tool_result") {
      let toolUse = toolUseByID.get(content.tool_use_id);
      if (toolUse) return getSearchOrReadFromContent(toolUse, tools);
    }
  }
  return null;
}
//@ chunk-wjygkcr4.js:249635-249996 affinity
/**
 * 创建代理进度分组的增量状态：已处理源消息数、稳定行、当前打开的分组、tool_use 索引、已解决/出错/进行中的 tool_use 集合等。
 */
function createProgressGroupingState() {
  return {
    processedSourceCount: 0,
    lastSourceUuid: undefined,
    tools: undefined,
    stable: [],
    stableCountableCount: 0,
    openGroup: null,
    toolUseByID: new Map(),
    toolUseCount: 0,
    latestAssistantUsage: undefined,
    resolvedToolUseIDs: new Set(),
    erroredToolUseIDs: new Set(),
    toolResultByToolUseID: new Map(),
    inProgressToolUseIDs: new Set(),
    pendingServerToolUses: [],
    lastRowAssistantMessageId: undefined,
  };
}
//@ chunk-wjygkcr4.js:249996-250335 affinity
/**
 * 增量更新代理进度分组状态：工具列表变化或源消息被改写时整体重置，否则只处理新增的进度消息（逐条 EW 归组，异常只记录）。
 */
function updateProgressGroupingState(state, progressMessages, tools) {
  if (!(
    tools === state.tools &&
    progressMessages.length >= state.processedSourceCount &&
    (state.processedSourceCount === 0 ||
      progressMessages[state.processedSourceCount - 1]?.uuid === state.lastSourceUuid)
  )) {
    Object.assign(state, createProgressGroupingState());
    state.tools = tools;
  }
  for (
    let processedSourceCount = state.processedSourceCount;
    processedSourceCount < progressMessages.length;
    processedSourceCount++
  ) {
    let progressMessage = progressMessages[processedSourceCount];
    if (isProgressWithMessage(progressMessage)) {
      state.processedSourceCount = processedSourceCount + 1;
      state.lastSourceUuid = progressMessage.uuid;
      try {
        accumulateAgentProgress(state, progressMessage, tools);
      } catch (error) {
        logError(error);
      }
    }
  }
}
//@ chunk-wjygkcr4.js:250335-250403 affinity
function pushStableRow(state, row) {
  state.stable.push(row);
  if (isCountableProgressRow(row)) state.stableCountableCount++;
}
//@ chunk-wjygkcr4.js:250403-250526 affinity
function isCountableProgressRow(row) {
  if (row.type === "summary") return true;
  return row.message.data.message.message.content.some((block) => block.type === "tool_use");
}
//@ chunk-wjygkcr4.js:250579-250708 fingerprint (2.1.88 match: processProgressMessages, 0.651)
function processProgressMessages(openGroup, isActive) {
  return {
    type: "summary",
    searchCount: openGroup.searchCount,
    readCount: openGroup.readCount,
    uuid: `summary-${openGroup.startUuid}`,
    isActive,
  };
}
//@ chunk-wjygkcr4.js:250708-250797 layout
/**
 * 把打开的搜索/读取分组定稿并入稳定行。
 */
function finalizeOpenGroup(state) {
  if (state.openGroup && hasSearchOrReadActivity(state.openGroup))
    pushStableRow(state, processProgressMessages(state.openGroup, false));
  state.openGroup = null;
}
//@ chunk-wjygkcr4.js:250797-252148 layout
/**
 * 把一条子代理进度消息并入增量渲染状态：记录 tool_use、已解决/出错的 tool_result、服务端工具调用与最新 usage。
 */
function accumulateAgentProgress(state, progressMessage, tools) {
  if (!isProgressWithMessage(progressMessage)) return;
  let entry = progressMessage;
  let message = entry.data.message;
  if (message.type === "assistant") {
    if (message.isUnmetered !== true) state.latestAssistantUsage = message.message.usage;
    state.lastRowAssistantMessageId = message.message.id;
    let sawToolUse = false;
    for (let block of message.message.content) {
      if (block.type === "tool_use") {
        sawToolUse = true;
        state.toolUseByID.set(block.id, block);
        if (!state.resolvedToolUseIDs.has(block.id)) state.inProgressToolUseIDs.add(block.id);
      } else if (block.type === "server_tool_use" || block.type === "mcp_tool_use")
        state.pendingServerToolUses.push({
          block,
          messageId: message.message.id,
        });
      collectResolvedToolUseIds(block, state.resolvedToolUseIDs, state.erroredToolUseIDs);
      if ("tool_use_id" in block && typeof block.tool_use_id === "string")
        state.inProgressToolUseIDs.delete(block.tool_use_id);
    }
    if (sawToolUse) state.toolUseCount++;
  } else if (message.type === "user") {
    state.lastRowAssistantMessageId = undefined;
    for (let block of message.message.content)
      if (block.type === "tool_result") {
        state.resolvedToolUseIDs.add(block.tool_use_id);
        state.toolResultByToolUseID.set(block.tool_use_id, message);
        state.inProgressToolUseIDs.delete(block.tool_use_id);
        if (block.is_error) state.erroredToolUseIDs.add(block.tool_use_id);
      }
  }
  if (!codeModeAccepted()) {
    if (message.type !== "user")
      pushStableRow(state, {
        type: "original",
        message: entry,
      });
    return;
  }
  if (!startsWithToolBlock(entry)) return;
  let progressMessageToolUseInfo = getProgressMessageToolUseInfo(entry, tools, state.toolUseByID);
  if (
    progressMessageToolUseInfo &&
    (progressMessageToolUseInfo.isSearch ||
      progressMessageToolUseInfo.isRead ||
      progressMessageToolUseInfo.isREPL)
  ) {
    if (!state.openGroup)
      state.openGroup = {
        searchCount: 0,
        readCount: 0,
        startUuid: entry.uuid,
      };
    if (message.type === "user") {
      if (progressMessageToolUseInfo.isSearch) state.openGroup.searchCount++;
      else if (!progressMessageToolUseInfo.isREPL && progressMessageToolUseInfo.isRead)
        state.openGroup.readCount++;
    }
  } else {
    finalizeOpenGroup(state);
    if (message.type !== "user")
      pushStableRow(state, {
        type: "original",
        message: entry,
      });
  }
}
//@ chunk-wjygkcr4.js:252148-252245 layout
/**
 * 稳定行加上未定稿分组（按参数包含明细）。
 */
function stableRowsIncludingOpenGroup(state, isActive) {
  let openGroup = state.openGroup;
  if (!openGroup || !hasSearchOrReadActivity(openGroup)) return state.stable;
  return state.stable.concat(processProgressMessages(openGroup, isActive));
}
//@ chunk-wjygkcr4.js:252245-252413 layout
function countStableCountableRows(state, processedMessages, openGroupCount) {
  if (openGroupCount <= 0) return 0;
  let stableCountableCount = state.stableCountableCount;
  if (processedMessages.length > state.stable.length) stableCountableCount++;
  for (let min = Math.min(openGroupCount, processedMessages.length); min < processedMessages.length; min++)
    if (isCountableProgressRow(processedMessages[min])) stableCountableCount--;
  return stableCountableCount;
}
//@ chunk-wjygkcr4.js:252413-252511 layout
function getLatestContextTokens(state) {
  let tokens = state.latestAssistantUsage
    ? finalContextTokensFromLastResponse(state.latestAssistantUsage)
    : undefined;
  return tokens ? totalTokensOf(tokens) : null;
}
//@ chunk-wjygkcr4.js:252511-252980 layout
/**
 * 为子代理界面构建查找表：待完成的服务端工具调用等。
 */
function buildSubagentLookups(state) {
  if (state.pendingServerToolUses.length > 0) {
    let stillPending = [];
    for (let pendingServerToolUse of state.pendingServerToolUses) {
      if (pendingServerToolUse.messageId === state.lastRowAssistantMessageId) {
        stillPending.push(pendingServerToolUse);
        continue;
      }
      markServerToolUseResolved(
        pendingServerToolUse.block,
        state.resolvedToolUseIDs,
        state.erroredToolUseIDs,
      );
    }
    state.pendingServerToolUses = stillPending;
  }
  return {
    lookups: {
      ...EMPTY_LOOKUPS,
      toolUseByToolUseID: state.toolUseByID,
      resolvedToolUseIDs: state.resolvedToolUseIDs,
      erroredToolUseIDs: state.erroredToolUseIDs,
      toolResultByToolUseID: state.toolResultByToolUseID,
    },
    inProgressToolUseIDs: state.inProgressToolUseIDs,
  };
}
//@ chunk-wjygkcr4.js:252980-253080 fingerprint (2.1.88 match: _temp, 1)
function renderResponseTextBlock(block, index) {
  return jsxProd_default(
    Box,
    {
      paddingLeft: 2,
      marginTop: index === 0 ? 0 : 1,
      children: jsxProd_default(MarkdownText_2, {
        children: block.text,
      }),
    },
    index,
  );
}
//@ chunk-wjygkcr4.js:253080-253113 file-local
/**
 * 判断该行数据是否是进度消息。
 */
function isProgressRow(pm) {
  return hasProgressMessage(pm.data);
}
//@ chunk-wjygkcr4.js:253113-253142 layout
/**
 * 取行数据本身。
 */
function rowData(pm_0) {
  return pm_0.data;
}
//@ chunk-wjygkcr4.js:253142-253267 layout
function isRenderableProgressMessage(pm_1) {
  if (!hasProgressMessage(pm_1.data)) {
    return false;
  }
  let msg = pm_1.data.message;
  if (msg.type === "user" && msg.toolUseResult === undefined) {
    return false;
  }
  return true;
}
//@ chunk-wjygkcr4.js:253267-253286 layout
var MAX_COLLAPSED_PROGRESS_ROWS = 3;
var ROWS_PER_AGENT = 9;
var AGENT_ROWS_OVERHEAD = 7;
//@ chunk-wjygkcr4.js:253286-253558 facade-exports (2.1.88 match: AgentPromptDisplay, 0.454)
/**
 * "Prompt:" 区块。
 */
function AgentPromptDisplay(props) {
  let $ = useMemoCache(3);
  let { prompt } = props;
  let t2;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      color: "success",
      bold: true,
      children: "Prompt:",
    });
    $[0] = t2;
  } else t2 = $[0];
  let t3;
  if ($[1] !== prompt) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        t2,
        jsxProd_default(Box, {
          paddingLeft: 2,
          children: jsxProd_default(MarkdownText_2, {
            children: prompt,
          }),
        }),
      ],
    });
    $[1] = prompt;
    $[2] = t3;
  } else t3 = $[2];
  return t3;
}
//@ chunk-wjygkcr4.js:253558-253842 facade-exports (2.1.88 match: AgentResponseDisplay, 0.4)
/**
 * "Response:" 区块。
 */
function AgentResponseDisplay(props) {
  let $ = useMemoCache(5);
  let { content } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      color: "success",
      bold: true,
      children: "Response:",
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== content) {
    t2 = content.map(renderResponseTextBlock);
    $[1] = content;
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== t2) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t1, t2],
    });
    $[3] = t2;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
//@ chunk-wjygkcr4.js:253842-254606 fingerprint (2.1.88 match: VerboseAgentTranscript, 1)
/**
 * verbose 下的子代理完整转录。
 */
function VerboseAgentTranscript(props) {
  let $ = useMemoCache(15);
  let { progressMessages, tools, verbose } = props;
  let t1;
  if ($[0] !== progressMessages) {
    t1 = buildSubagentLookups_2(progressMessages.filter(isProgressRow).map(rowData));
    $[0] = progressMessages;
    $[1] = t1;
  } else t1 = $[1];
  let { lookups: agentLookups, inProgressToolUseIDs } = t1;
  let children;
  if (
    $[2] !== agentLookups ||
    $[3] !== inProgressToolUseIDs ||
    $[4] !== progressMessages ||
    $[5] !== tools ||
    $[6] !== verbose
  ) {
    let filteredMessages = progressMessages.filter(isRenderableProgressMessage);
    let t3;
    if ($[8] !== agentLookups || $[9] !== inProgressToolUseIDs || $[10] !== tools || $[11] !== verbose) {
      t3 = (progressMessage) =>
        jsxProd_default(
          MessageResponse,
          {
            height: hasAutoModeBlockedToolResult(progressMessage.data.message) ? undefined : 1,
            children: jsxProd_default(agentProgressSelector, {
              message: progressMessage.data.message,
              lookups: agentLookups,
              addMargin: false,
              tools,
              commands: [],
              verbose,
              inProgressToolUseIDs,
              progressMessagesForMessage: [],
              shouldAnimate: false,
              shouldShowDot: false,
              isTranscriptMode: false,
              isStatic: true,
            }),
          },
          progressMessage.uuid,
        );
      $[8] = agentLookups;
      $[9] = inProgressToolUseIDs;
      $[10] = tools;
      $[11] = verbose;
      $[12] = t3;
    } else t3 = $[12];
    children = filteredMessages.map(t3);
    $[2] = agentLookups;
    $[3] = inProgressToolUseIDs;
    $[4] = progressMessages;
    $[5] = tools;
    $[6] = verbose;
    $[7] = children;
  } else children = $[7];
  let t3;
  if ($[13] !== children) {
    t3 = jsxProd_default(Fragment, {
      children,
    });
    $[13] = children;
    $[14] = t3;
  } else t3 = $[14];
  return t3;
}
//@ chunk-wjygkcr4.js:254606-256688 facade-exports (2.1.88 match: renderToolResultMessage, 0.761)
/**
 * Agent 工具结果渲染：remote_launched/async_launched/teammate_spawned 显示启动行，completed 显示统计（工具次数、token、耗时）、可选 Prompt/Response 与 verbose 转录。
 */
function renderToolResultMessage(
  data,
  progressMessagesForMessage,
  { tools, verbose, isTranscriptMode = false, input, activeAgents },
) {
  let internal = data;
  if (internal.status === "remote_launched")
    return jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          children: [
            "Cloud agent launched",
            " ",
            jsxProd_default_2(Text, {
              dimColor: true,
              children: ["\xB7 ", internal.taskId, " \xB7 ", internal.sessionUrl],
            }),
          ],
        }),
      }),
    });
  if (data.status === "async_launched") {
    let { prompt } = data;
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default_2(Text, {
            children: [
              !isTranscriptMode &&
              compareAgentsByName(
                progressMessagesForMessage,
                activeAgents,
                hasSubagentOverride(input, activeAgents),
              )
                ? "Fetching in background"
                : "Backgrounded agent",
              !isTranscriptMode &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    " (",
                    jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "down",
                          action: "manage",
                        }),
                        prompt &&
                          jsxProd_default(ConfigurableShortcutHint, {
                            action: "app:toggleTranscript",
                            context: "Global",
                            fallback: "ctrl+o",
                            description: "expand",
                          }),
                      ],
                    }),
                    ")",
                  ],
                }),
            ],
          }),
        }),
        isTranscriptMode &&
          prompt &&
          jsxProd_default(MessageResponse, {
            children: jsxProd_default(AgentPromptDisplay, {
              prompt,
            }),
          }),
      ],
    });
  }
  if (data.status !== "completed") return null;
  if (
    !isTranscriptMode &&
    compareAgentsByName(
      progressMessagesForMessage,
      activeAgents,
      resolveAgentOverrides(data.agentType, activeAgents),
    )
  ) {
    let { report } = splitHarnessNotes(data.content);
    let bytes = report.reduce((acc, section) => acc + Buffer.byteLength(section.text), 0);
    let bytesHint = jsxProd_default(renderToolUseProgressMessage_6, {
      bytes,
    });
    return verbose
      ? jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            bytesHint,
            jsxProd_default(Box, {
              flexDirection: "column",
              children: jsxProd_default(Text, {
                children: report.map((section) => section.text).join(`
`),
              }),
            }),
          ],
        })
      : bytesHint;
  }
  let { totalDurationMs, totalToolUseCount, totalTokens, usage, content, prompt } = data;
  let completionMessage = `Done (${[totalToolUseCount === 1 ? "1 tool use" : `${totalToolUseCount} tool uses`, formatNumber(totalTokens) + " tokens", formatDuration(totalDurationMs)].join(" \xB7 ")})`;
  let finalAssistantMessage = createAssistantMessage({
    content: completionMessage,
    usage: {
      ...usage,
      output_tokens_details:
        typeof usage.output_tokens_details?.thinking_tokens === "number"
          ? {
              thinking_tokens: usage.output_tokens_details.thinking_tokens,
            }
          : null,
      inference_geo: null,
      iterations: null,
      speed: null,
      fallback_credit: null,
      service_tier:
        usage.service_tier === "standard" ||
        usage.service_tier === "priority" ||
        usage.service_tier === "batch"
          ? usage.service_tier
          : null,
    },
  });
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      isTranscriptMode &&
        prompt &&
        jsxProd_default(MessageResponse, {
          children: jsxProd_default(AgentPromptDisplay, {
            prompt,
          }),
        }),
      isTranscriptMode
        ? jsxProd_default(SubAgentProvider, {
            children: jsxProd_default(VerboseAgentTranscript, {
              progressMessages: progressMessagesForMessage,
              tools,
              verbose,
            }),
          })
        : null,
      isTranscriptMode &&
        content &&
        content.length > 0 &&
        jsxProd_default(MessageResponse, {
          children: jsxProd_default(AgentResponseDisplay, {
            content,
          }),
        }),
      jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(agentProgressSelector, {
          message: finalAssistantMessage,
          lookups: EMPTY_LOOKUPS,
          addMargin: false,
          tools,
          commands: [],
          verbose,
          inProgressToolUseIDs: new Set(),
          progressMessagesForMessage: [],
          shouldAnimate: false,
          shouldShowDot: false,
          isTranscriptMode: false,
          isStatic: true,
        }),
      }),
      !isTranscriptMode &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", jsxProd_default(CtrlOToExpand, {})],
        }),
    ],
  });
}
//@ chunk-wjygkcr4.js:256688-256933 facade-exports
/**
 * Agent 调用摘要：description；web-fetch 代理改为显示 URL。
 */
function renderToolUseMessage(input, options) {
  let { description, prompt, subagent_type: subagentType } = input;
  if (!description || !prompt) return null;
  if (!options.isTranscriptMode && resolveAgentOverrides(subagentType, options.activeAgents)) {
    let url = firstUrlInText(prompt) ?? firstUrlInText(description);
    if (url !== undefined)
      return WebFetchTool.renderToolUseMessage(
        {
          url,
        },
        options,
      );
  }
  return description.replace(/\s+/g, " ").trim();
}
//@ chunk-wjygkcr4.js:256933-257053 layout
var ModelsUsedSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wjygkcr4.js:256933", () => {
  ModelsUsedSchema = DoctorLazy(() =>
    objectSchema({
      modelsUsed: array(stringSchema()).optional(),
      resolvedModel: stringSchema().optional(),
      status: stringSchema().optional(),
      model: stringSchema().optional(),
    }),
  );
});
//@ chunk-wjygkcr4.js:257053-257266 layout
function getModelsUsedFromResult(toolUseResult) {
  let parsed = ModelsUsedSchema().safeParse(toolUseResult);
  if (!parsed.success) return [];
  let { modelsUsed, resolvedModel, status, model } = parsed.data;
  if (modelsUsed && modelsUsed.length > 0) return modelsUsed;
  if (resolvedModel) return [resolvedModel];
  if (status === "teammate_spawned" && model) return [parseUserSpecifiedModel(model)];
  return [];
}
//@ chunk-wjygkcr4.js:257266-257437 layout
function getModelsUsed(toolUse) {
  let reduced = (toolUse?.progressMessages ?? []).reduce(
    (acc, progressMessage) =>
      progressMessage.data.type === "agent_progress" ? (progressMessage.data.modelsUsed ?? acc) : acc,
    [],
  );
  let modelsUsedFromResult = getModelsUsedFromResult(toolUse?.toolUseResult);
  return modelsUsedFromResult.length > reduced.length ? modelsUsedFromResult : reduced;
}
//@ chunk-wjygkcr4.js:257437-257852 facade-exports
/**
 * 模型标签：子代理换过模型时显示 a → b，非默认模型时显示模型名。
 */
function renderToolUseTag(input, toolUse) {
  let tags = [];
  let modelsUsed = getModelsUsed(toolUse);
  if (modelsUsed.length > 1)
    tags.push(
      jsxProd_default(
        Box,
        {
          flexWrap: "nowrap",
          marginLeft: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: modelsUsed.map(renderModelName).join(" \u2192 "),
          }),
        },
        "model",
      ),
    );
  else if (input.model && input.model !== "inherit") {
    let resolvedModel = modelsUsed[0];
    if (resolvedModel) {
      let mainLoopModel = getMainLoopModel();
      let userSpecifiedModel = parseUserSpecifiedModel(input.model);
      if (resolvedModel !== mainLoopModel || userSpecifiedModel !== resolvedModel)
        tags.push(
          jsxProd_default(
            Box,
            {
              flexWrap: "nowrap",
              marginLeft: 1,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: renderModelName(resolvedModel),
              }),
            },
            "model",
          ),
        );
    }
  }
  if (tags.length === 0) return null;
  return jsxProd_default(Fragment, {
    children: tags,
  });
}
//@ chunk-wjygkcr4.js:257852-257880 layout (2.1.88 match: INITIALIZING_TEXT, 1)
var INITIALIZING_TEXT_2 = "Initializing\u2026";
//@ chunk-wjygkcr4.js:257880-258135 facade-exports (2.1.88 match: renderToolUseRejectedMessage, 0.27)
/**
 * 用户拒绝 Agent 调用时，显示已产生的子代理进度。
 */
function renderToolUseProgressMessage(
  _input,
  { tools, verbose, terminalSize, inProgressToolCallCount, isTranscriptMode = false, activeAgents },
) {
  if (!isTranscriptMode && compareAgentsByName(_input, activeAgents)) return FallbackToolUseRejectedMessage();
  return jsxProd_default(renderToolUseProgressMessage_2, {
    progressMessages: _input,
    tools,
    verbose,
    terminalSize,
    inProgressToolCallCount,
    isTranscriptMode,
  });
}
//@ chunk-wjygkcr4.js:258135-259661 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.832)
/**
 * Agent 工具进行中的渲染：增量汇总子代理进度（搜索/读取分组摘要、最近工具调用、Initializing…）。
 */
function renderToolUseProgressMessage_2({
  progressMessages,
  tools,
  verbose,
  terminalSize,
  inProgressToolCallCount,
  isTranscriptMode,
}) {
  let progressGroupingStateRef = useRef(null);
  progressGroupingStateRef.current ??= createProgressGroupingState();
  let state = progressGroupingStateRef.current;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  try {
    updateProgressGroupingState(state, progressMessages, tools);
    if (!progressMessages.length)
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: INITIALIZING_TEXT_2,
        }),
      });
    let toolToolRenderLinesEstimate = (inProgressToolCallCount ?? 1) * ROWS_PER_AGENT + AGENT_ROWS_OVERHEAD;
    if (
      !isTranscriptMode &&
      terminalSize &&
      terminalSize.rows &&
      terminalSize.rows < toolToolRenderLinesEstimate
    ) {
      let latestContextTokens = getLatestContextTokens(state);
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "In progress\u2026 \xB7",
            " ",
            !isScreenReaderEnabled &&
              jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: state.toolUseCount,
                  }),
                  " tool",
                  " ",
                  state.toolUseCount === 1 ? "use" : "uses",
                  latestContextTokens && ` \xB7 ${formatNumber(latestContextTokens)} tokens`,
                  " \xB7",
                  " ",
                ],
              }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "app:toggleTranscript",
              context: "Global",
              fallback: "ctrl+o",
              description: "expand",
              parens: true,
            }),
          ],
        }),
      });
    }
    let processedMessages = stableRowsIncludingOpenGroup(state, true);
    let displayedMessages = isTranscriptMode
      ? processedMessages
      : processedMessages.slice(-MAX_COLLAPSED_PROGRESS_ROWS);
    let count = isTranscriptMode
      ? 0
      : countStableCountableRows(
          state,
          processedMessages,
          processedMessages.length - MAX_COLLAPSED_PROGRESS_ROWS,
        );
    let firstData = progressMessages[0]?.data;
    let prompt = firstData && hasProgressMessage(firstData) ? firstData.prompt : undefined;
    if (displayedMessages.length === 0 && !(isTranscriptMode && prompt))
      return jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: INITIALIZING_TEXT_2,
        }),
      });
    let { lookups: subagentLookups, inProgressToolUseIDs: collapsedInProgressIDs } =
      buildSubagentLookups(state);
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(SubAgentProvider, {
            children: [
              isTranscriptMode &&
                prompt &&
                jsxProd_default(Box, {
                  marginBottom: 1,
                  children: jsxProd_default(AgentPromptDisplay, {
                    prompt,
                  }),
                }),
              displayedMessages.map((processed) => {
                if (processed.type === "summary") {
                  let children = getSearchReadSummaryText(
                    processed.searchCount,
                    processed.readCount,
                    processed.isActive,
                  );
                  return jsxProd_default(
                    Box,
                    {
                      height: 1,
                      overflow: "hidden",
                      children: jsxProd_default(Text, {
                        dimColor: true,
                        children,
                      }),
                    },
                    processed.uuid,
                  );
                }
                return jsxProd_default(
                  agentProgressSelector,
                  {
                    message: processed.message.data.message,
                    lookups: subagentLookups,
                    addMargin: false,
                    tools,
                    commands: [],
                    verbose,
                    inProgressToolUseIDs: collapsedInProgressIDs,
                    progressMessagesForMessage: [],
                    shouldAnimate: false,
                    shouldShowDot: false,
                    style: "condensed",
                    isTranscriptMode: false,
                    isStatic: true,
                  },
                  processed.message.uuid,
                );
              }),
            ],
          }),
          jsxProd_default(OverflowHint, {
            count,
            unit: "tool use",
            expandable: true,
          }),
        ],
      }),
    });
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-wjygkcr4.js:259661-259903 facade-exports
/**
 * Agent 调用被拒的渲染（web-fetch 代理只显示拒绝行）。
 */
function renderToolUseRejectedMessage(
  { subagent_type: subagentType },
  { progressMessagesForMessage, tools, verbose, isTranscriptMode, activeAgents },
) {
  if (!isTranscriptMode && resolveAgentOverrides(subagentType, activeAgents))
    return jsxProd_default(RejectedToolUseMessage, {});
  return jsxProd_default_2(Fragment, {
    children: [
      renderToolUseProgressMessage(progressMessagesForMessage, {
        tools,
        verbose,
        isTranscriptMode,
        activeAgents,
      }),
      jsxProd_default(RejectedToolUseMessage, {}),
    ],
  });
}
//@ chunk-wjygkcr4.js:259903-260183 facade-exports (2.1.88 match: renderToolUseErrorMessage, 0.864)
/**
 * Agent 调用出错时的渲染（附子代理进度）。
 */
function renderToolUseErrorMessage(
  result,
  { progressMessagesForMessage, tools, verbose, isTranscriptMode, input, activeAgents },
) {
  if (
    !isTranscriptMode &&
    compareAgentsByName(progressMessagesForMessage, activeAgents, hasSubagentOverride(input, activeAgents))
  )
    return jsxProd_default(FallbackToolUseErrorMessage, {
      result,
      verbose,
    });
  return jsxProd_default_2(Fragment, {
    children: [
      renderToolUseProgressMessage(progressMessagesForMessage, {
        tools,
        verbose,
        isTranscriptMode,
        activeAgents,
      }),
      jsxProd_default(FallbackToolUseErrorMessage, {
        result,
        verbose,
      }),
    ],
  });
}
//@ chunk-wjygkcr4.js:260183-260559 fingerprint (2.1.88 match: calculateAgentStats, 0.593)
/**
 * 从进度消息统计子代理工具结果次数与最新上下文 token 数。
 */
function calculateAgentStats(progressMessages) {
  let toolUseCount = countWhere(progressMessages, (msg) => {
    if (!hasProgressMessage(msg.data)) return false;
    let message = msg.data.message;
    return (
      message.type === "user" && message.message.content.some((content) => content.type === "tool_result")
    );
  });
  let latestAssistant = progressMessages.findLast(
    (msg) =>
      hasProgressMessage(msg.data) &&
      msg.data.message.type === "assistant" &&
      msg.data.message.isUnmetered !== true,
  );
  let contextTokens =
    latestAssistant?.data.message.type === "assistant"
      ? finalContextTokensFromLastResponse(latestAssistant.data.message.message.usage)
      : undefined;
  let tokens = contextTokens ? totalTokensOf(contextTokens) : null;
  return {
    toolUseCount,
    tokens,
  };
}
//@ chunk-wjygkcr4.js:260559-262606 facade-exports (2.1.88 match: renderGroupedAgentToolUse, 0.849)
/**
 * 同一条消息里多个 Agent 调用合并渲染为一组（每个子代理一行状态）。
 */
function renderGroupedAgentToolUse(toolUses, options) {
  let { shouldAnimate, tools, addMargin = true, activeAgents } = options;
  let agentStats = toolUses.map(({ param, isResolved, progressMessages, result }) => {
    let stats = calculateAgentStats(progressMessages);
    let lastToolInfo = extractLastToolInfo(progressMessages, tools, activeAgents);
    let parsedInput = getAgentInputSchema().safeParse(
      dropRelativeEffortInput(param.input)?.input ?? param.input,
    );
    let isTeammateSpawn = result?.output?.status === "teammate_spawned";
    let agentType;
    let agentName;
    let color;
    let descriptionColor;
    let taskDescription;
    if (isTeammateSpawn && parsedInput.success && parsedInput.data.name) {
      agentType = `@${parsedInput.data.name}`;
      agentName = updateAgentFile(parsedInput.data.subagent_type, activeAgents);
      taskDescription = parsedInput.data.description?.replace(/\s+/g, " ").trim() || undefined;
      descriptionColor = agentName ? getAgentColor(agentName) : undefined;
    } else {
      agentType = parsedInput.success
        ? userFacingName(parsedInput.data, {
            activeAgents,
          })
        : "Agent";
      agentName = parsedInput.success
        ? parsedInput.data.description?.replace(/\s+/g, " ").trim() || undefined
        : undefined;
      color = parsedInput.success
        ? userFacingNameBackgroundColor(parsedInput.data, {
            activeAgents,
          })
        : undefined;
      taskDescription = undefined;
    }
    let wantsBackground =
      parsedInput.success &&
      "run_in_background" in parsedInput.data &&
      parsedInput.data.run_in_background === true;
    let outputStatus = result?.output?.status;
    let isAsync =
      wantsBackground ||
      outputStatus === "async_launched" ||
      outputStatus === "remote_launched" ||
      isTeammateSpawn;
    let name = parsedInput.success ? parsedInput.data.name : undefined;
    return {
      id: param.id,
      agentType,
      description: agentName,
      toolUseCount: stats.toolUseCount,
      tokens: stats.tokens,
      isResolved,
      isAsync,
      color,
      descriptionColor,
      lastToolInfo,
      taskDescription,
      name,
    };
  });
  let anyUnresolved = toolUses.some((t) => !t.isResolved);
  let anyError = toolUses.some((t) => t.isError);
  let allComplete = !anyUnresolved;
  let allSameType =
    agentStats.length > 0 && agentStats.every((stat) => stat.agentType === agentStats[0]?.agentType);
  let commonType = allSameType && agentStats[0]?.agentType !== "Agent" ? agentStats[0]?.agentType : null;
  let allAsync = agentStats.every((stat) => stat.isAsync);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: addMargin ? 1 : 0,
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(ToolUseLoader, {
            shouldAnimate: shouldAnimate && anyUnresolved,
            isUnresolved: anyUnresolved,
            isError: anyError,
          }),
          jsxProd_default_2(Text, {
            children: [
              allComplete
                ? allAsync
                  ? jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Text, {
                          bold: true,
                          children: toolUses.length,
                        }),
                        " background agents launched",
                        " ",
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: jsxProd_default(KeyboardShortcutHint, {
                            chord: "down",
                            action: "manage",
                            parens: true,
                          }),
                        }),
                      ],
                    })
                  : jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Text, {
                          bold: true,
                          children: toolUses.length,
                        }),
                        " ",
                        commonType ? `${commonType} agents` : "agents",
                        " finished",
                      ],
                    })
                : jsxProd_default_2(Fragment, {
                    children: [
                      "Running ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: toolUses.length,
                      }),
                      " ",
                      commonType ? `${commonType} agents` : "agents",
                      "\u2026",
                    ],
                  }),
              " ",
            ],
          }),
          !allAsync && jsxProd_default(CtrlOToExpand, {}),
        ],
      }),
      agentStats.map((stat, index) =>
        jsxProd_default(
          AgentProgressLine,
          {
            agentType: stat.agentType,
            description: stat.description,
            descriptionColor: stat.descriptionColor,
            taskDescription: stat.taskDescription,
            toolUseCount: stat.toolUseCount,
            tokens: stat.tokens,
            color: stat.color,
            isLast: index === agentStats.length - 1,
            isResolved: stat.isResolved,
            isAsync: stat.isAsync,
            lastToolInfo: stat.lastToolInfo,
            hideType: allSameType,
            name: stat.name,
          },
          stat.id,
        ),
      ),
    ],
  });
}
//@ chunk-wjygkcr4.js:262606-263701 facade-exports (2.1.88 match: extractLastToolInfo, 0.765)
/**
 * 从进度消息中取最后一次工具调用的信息与计数。
 */
function extractLastToolInfo(progressMessages, tools, activeAgents) {
  let toolUseByID = new Map();
  for (let pm of progressMessages) {
    if (!hasProgressMessage(pm.data)) continue;
    if (pm.data.message.type === "assistant") {
      for (let block of pm.data.message.message.content)
        if (block.type === "tool_use") toolUseByID.set(block.id, block);
    }
  }
  let searchCount = 0;
  let readCount = 0;
  for (let i = progressMessages.length - 1; i >= 0; i--) {
    let msg = progressMessages[i];
    if (!isProgressWithMessage(msg)) continue;
    if (!startsWithToolBlock(msg)) continue;
    let info = getProgressMessageToolUseInfo(msg, tools, toolUseByID);
    if (info && (info.isSearch || info.isRead)) {
      if (msg.data.message.type === "user") {
        if (info.isSearch) searchCount++;
        else if (info.isRead) readCount++;
      }
    } else if (!info?.isREPL) break;
  }
  if (searchCount + readCount >= 2) return getSearchReadSummaryText(searchCount, readCount, true);
  let lastToolResult = progressMessages.findLast((msg) => {
    if (!hasProgressMessage(msg.data)) return false;
    let message = msg.data.message;
    if (message.type !== "user") return false;
    let found = message.message.content.find((block) => block.type === "tool_result");
    if (found?.type !== "tool_result") return false;
    let toolUseBlock = toolUseByID.get(found.tool_use_id);
    return getSearchOrReadFromContent(toolUseBlock, tools)?.isREPL !== true;
  });
  if (lastToolResult?.data.message.type === "user") {
    let toolResultBlock = lastToolResult.data.message.message.content.find(
      (block) => block.type === "tool_result",
    );
    if (toolResultBlock?.type === "tool_result") {
      let toolUseBlock = toolUseByID.get(toolResultBlock.tool_use_id);
      if (toolUseBlock) {
        let tool = findToolByName(tools, toolUseBlock.name);
        if (!tool) return toolUseBlock.name;
        let input = toolUseBlock.input;
        let parsedInput = safeParseToolInput(tool, input);
        let parsedInput_2 = parsedInput.success ? parsedInput.data : undefined;
        try {
          let toolName = tool.userFacingName(parsedInput_2, {
            activeAgents,
          });
          let summary = tool.getToolUseSummary?.(parsedInput_2);
          return summary ? `${toolName}: ${summary}` : toolName;
        } catch {
          return toolUseBlock.name;
        }
      }
    }
  }
  return null;
}
export {
  INITIALIZING_TEXT,
  MAX_TAIL_ITEMS,
  agentProgressSelector,
  renderToolUseProgressMessage,
  userFacingName,
  renderGroupedAgentToolUse,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseRejectedMessage,
  renderToolUseTag,
  userFacingNameBackgroundColor,
  renderToolUseTag_2,
  AgentPromptDisplay,
  AgentResponseDisplay,
  extractLastToolInfo,
  renderToolUseMessage,
};
