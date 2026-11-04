/**
 * components/messages/CollapsedReadSearchContent.tsx
 *
 * 折叠的读取/搜索类工具组："Read N files, searched M patterns"，verbose 下逐个展开。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/CollapsedReadSearchContent.tsx
 * pieces: chunk-ah34pb7m.js (9)
 * attribution: placement 7, fingerprint 2
 */
import { basename } from "path";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useHost } from "../../context/session.js";
import { useAppStateSlice } from "../../state/AppState.js";
import {
  selectActiveAgents_2,
  guardPrimitiveToolResult,
  isNoAgentViewInAutoMode,
  toolResultId,
  isHookToolResult,
  toolUseId,
  toolUseId_2,
  noopRenderHook,
  returnFalseHook,
  renderHookDurationLine,
  commitSha,
  gitBranch,
} from "./toolResultRendering.js";
import { useFrameRegistry, parseRenderModeValue, useIsFullscreen } from "../../ink/renderModeContext.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { findToolByNameWithFallback } from "../../utils/collapseReadSearch.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { remoteMachineRefForDisplay } from "../../utils/toolUseDisplay.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { renderToolUseMessageFor } from "./toolUseRenderers.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import {
  GroupedToolUseRow,
  toolCallOf,
  ThinkingElapsed,
  collectBackgroundToolUseIds,
  lowerFirstUnlessAcronym,
  ElapsedSinceAnchor,
  truncateToLines,
} from "./GroupedToolUseContent.js";
import { useContext, useState } from "../../../vendor/react/cjs/react.production.js";
import { BRIDGE_PLACED_KEYS_CONTEXT } from "../../bridge/inboundMessages.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { collectToolUseIds } from "../messageActions.js";
import { alwaysFalseMemCtx } from "../../services/accountMemory/memoryContext.js";
import {
  checkHasTeamMemOps,
  isAutoModeBlockedResult,
  useThrottledValue,
  useLingeringValue,
  isModelUnavailableDenial,
  TeamMemCountParts,
  DenialReasonQuote,
} from "./teamMemCollapsed.js";
import { isReplToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import {
  isToolDenial,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  extractClassifierDenialReason,
  PERMISSION_DENIED_FOR_PATTERN,
  NON_INTERACTIVE_DENIAL_PREFIXES,
  SAFETY_CHECK_DENIAL_PREFIX,
  DENIAL_STOP_AND_EXPLAIN_GUIDANCE,
  AUTO_MODE_PREFIX,
} from "../../utils/messages.js";
import { USER_REJECTED_KIND, toolRejectionKind } from "../../entrypoints/sdk/coreSchemas.js";
import { MessageResponse } from "../MessageResponse.js";
import { Byline } from "../design-system/Byline.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import {
  UserToolErrorMessage,
  isAutoModeUnavailableKind,
  NotRunLine,
} from "./UserToolResultMessage/UserToolErrorMessage.js";
import { getDisplayPath } from "../../utils/file.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { useHasAutoModeDenialFor } from "../Spinner/spinnerStatus.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { renderToolUseErrorMessage_5 } from "./UserTaskNotificationMessage.js";
import { AssistantThinkingMessage } from "./AssistantThinkingMessage.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { formatSecondsShort, formatDuration } from "../../utils/format.js";
import { Ansi } from "../../ink/components/AnsiText.js";
import { DiffStatCounts, PrBadge } from "../PrBadge.js";
import { uniq } from "../../utils/collections.js";
import { isValidPrUrl } from "../../tools/shared/gitOperationTracking.js";
import { isGitLabMergeRequestUrl } from "../../utils/detectRepository.js";
import { MEMORY } from "../../services/mcp/firstPartyServerIds.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { inflectStatusText } from "../../utils/verbInflection.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { unwrapToolUseErrorText } from "../../utils/toolUseErrorText.js";
import { PRE_TOOL_HOOK_ERROR_PREFIX_RE } from "../../utils/hooks.js";
import { firstLineOf, getFirstLine, capitalize, plural } from "../../utils/stringUtils.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";

//@ chunk-ah34pb7m.js:157480-157568 placement (2.1.88 match: countToolUses, 0.815)
function countToolUses(msg) {
  return msg.type === "grouped_tool_use" ? msg.results : msg.type === "user" ? [msg] : [];
}
//@ chunk-ah34pb7m.js:157568-157615 placement
function isToolResultBlock(block) {
  return block.type === "tool_result";
}
//@ chunk-ah34pb7m.js:157615-157658 placement (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-ah34pb7m.js:157658-157670 placement
var memorySavesQuietApi = null;
//@ chunk-ah34pb7m.js:157670-157681 placement
var HINT_THROTTLE_MS = 700;
//@ chunk-ah34pb7m.js:157681-157704 placement
var HINT_LINGER_MS = 3000;
var HINT_COLUMN_RESERVE = 5;
var HINT_MAX_LINES = 10;
//@ chunk-ah34pb7m.js:157704-159047 placement
/**
 * 折叠的读取/搜索工具组（进行中、出错状态）。
 */
function CollapsedReadSearchGroup(props) {
  let $ = useMemoCache(28);
  let { content, inProgressToolUseIDs, lookups } = props;
  let inProgress;
  if ($[0] !== content.id || $[1] !== inProgressToolUseIDs) {
    inProgress = inProgressToolUseIDs.has(content.id);
    $[0] = content.id;
    $[1] = inProgressToolUseIDs;
    $[2] = inProgress;
  } else inProgress = $[2];
  let isInProgress = inProgress;
  let isErrored;
  if ($[3] !== content.id || $[4] !== lookups.erroredToolUseIDs) {
    isErrored = lookups.erroredToolUseIDs.has(content.id);
    $[3] = content.id;
    $[4] = lookups.erroredToolUseIDs;
    $[5] = isErrored;
  } else isErrored = $[5];
  let erroredFlag = isErrored;
  let dotElement;
  let color;
  if ($[6] !== content.id || $[7] !== lookups.toolResultByToolUseID) {
    dotElement = lookups.toolResultByToolUseID.get(content.id);
    color = VALIDATE_TREE_NAMESPACE.isInterruptedCall(dotElement);
    $[6] = content.id;
    $[7] = lookups.toolResultByToolUseID;
    $[8] = dotElement;
    $[9] = color;
  } else {
    dotElement = $[8];
    color = $[9];
  }
  let dotBox = color;
  let toolUseResult = dotElement?.type === "user" ? dotElement.toolUseResult : undefined;
  let dotText;
  if (
    $[10] !== content.id ||
    $[11] !== content.input ||
    $[12] !== content.name ||
    $[13] !== erroredFlag ||
    $[14] !== dotBox ||
    $[15] !== toolUseResult ||
    $[16] !== isInProgress
  ) {
    dotText = () => ({
      requestId: content.id,
      props: {
        tool_use_id: content.id,
        tool: content.name,
        input: content.input,
        isRunning: isInProgress,
        isErrored: erroredFlag,
        isInterrupted: dotBox,
        isExpanded: true,
        output: toolUseResult,
      },
    });
    $[10] = content.id;
    $[11] = content.input;
    $[12] = content.name;
    $[13] = erroredFlag;
    $[14] = dotBox;
    $[15] = toolUseResult;
    $[16] = isInProgress;
    $[17] = dotText;
  } else dotText = $[17];
  let resultElement;
  if (
    $[18] !== content ||
    $[19] !== erroredFlag ||
    $[20] !== dotBox ||
    $[21] !== toolUseResult ||
    $[22] !== isInProgress
  ) {
    resultElement = [content, isInProgress, erroredFlag, dotBox, toolUseResult];
    $[18] = content;
    $[19] = erroredFlag;
    $[20] = dotBox;
    $[21] = toolUseResult;
    $[22] = isInProgress;
    $[23] = resultElement;
  } else resultElement = $[23];
  let summaryElement = actionKeysNamespace.useRenderInput("ToolUse", dotText, resultElement);
  let containerElement;
  if ($[24] !== content || $[25] !== toolUseResult || $[26] !== props) {
    containerElement = (outerElement) =>
      jsxProd_default(VerboseToolUse, {
        ...props,
        content:
          outerElement.props.input === content.input
            ? content
            : {
                ...content,
                input: outerElement.props.input,
              },
        toolLabel: outerElement.props.tool === content.name ? undefined : outerElement.props.tool,
        outputOverride:
          outerElement.props.output === toolUseResult
            ? undefined
            : {
                value: outerElement.props.output,
              },
      });
    $[24] = content;
    $[25] = toolUseResult;
    $[26] = props;
    $[27] = containerElement;
  } else containerElement = $[27];
  return actionKeysNamespace.useRenderHook(summaryElement, containerElement);
}
//@ chunk-ah34pb7m.js:159047-162030 fingerprint (2.1.88 match: VerboseToolUse, 0.513)
function VerboseToolUse(props) {
  let $ = useMemoCache(54);
  let {
    content,
    tools,
    lookups,
    inProgressToolUseIDs,
    shouldAnimate,
    theme,
    outputOverride,
    toolLabel,
    quietWords,
  } = props;
  let bg = useHost();
  let activeAgents = useAppStateSlice(selectActiveAgents_2);
  let frameRegistry = useFrameRegistry();
  let BoxComponent;
  let isQuietlyErrored;
  let isResolved;
  let progressMessages;
  let resultMsg;
  let key;
  let flexDirection;
  let marginTop;
  let headerRow;
  let outputBox;
  let earlyReturn;
  let tool;
  if (
    $[0] !== activeAgents ||
    $[1] !== content.id ||
    $[2] !== content.input ||
    $[3] !== content.name ||
    $[4] !== bg ||
    $[5] !== inProgressToolUseIDs ||
    $[6] !== lookups ||
    $[7] !== outputOverride ||
    $[8] !== quietWords ||
    $[9] !== frameRegistry ||
    $[10] !== shouldAnimate ||
    $[11] !== theme ||
    $[12] !== toolLabel ||
    $[13] !== tools
  ) {
    earlyReturn = EARLY_RETURN_SENTINEL;
    pe: {
      tool = findToolByNameWithFallback(tools, content.name) ?? displayOnlyMcpTool(content.name, bg);
      if (!tool) {
        earlyReturn = null;
        break pe;
      }
      if (tool.isTransparentWrapper?.()) {
        earlyReturn = null;
        break pe;
      }
      let justResolved;
      if ($[26] !== content.id || $[27] !== lookups.resolvedToolUseIDs) {
        justResolved = lookups.resolvedToolUseIDs.has(content.id);
        $[26] = content.id;
        $[27] = lookups.resolvedToolUseIDs;
        $[28] = justResolved;
      } else justResolved = $[28];
      isResolved = justResolved;
      let isErrored;
      if ($[29] !== content.id || $[30] !== lookups.erroredToolUseIDs) {
        isErrored = lookups.erroredToolUseIDs.has(content.id);
        $[29] = content.id;
        $[30] = lookups.erroredToolUseIDs;
        $[31] = isErrored;
      } else isErrored = $[31];
      let isErrored_2 = isErrored;
      isQuietlyErrored = isErrored_2 && quietWords === undefined;
      let isInProgress;
      if ($[32] !== content.id || $[33] !== inProgressToolUseIDs) {
        isInProgress = inProgressToolUseIDs.has(content.id);
        $[32] = content.id;
        $[33] = inProgressToolUseIDs;
        $[34] = isInProgress;
      } else isInProgress = $[34];
      let isInProgress_2 = isInProgress;
      resultMsg = lookups.toolResultByToolUseID.get(content.id);
      let output =
        outputOverride !== undefined
          ? outputOverride.value
          : resultMsg?.type === "user"
            ? resultMsg.toolUseResult
            : undefined;
      let parsedOutput = parseRenderModeValue(frameRegistry, tool.outputSchema, output);
      let parsedData = parsedOutput?.success ? parsedOutput.data : undefined;
      let parsedData_2 = parsedData;
      let parsedInput = safeParseToolInput(tool, content.input);
      let parsedInputData = parsedInput.success ? parsedInput.data : undefined;
      let remoteHost = remoteMachineRefForDisplay(tool, parsedInputData);
      let displayedName =
        toolLabel ??
        tool.userFacingName(parsedInputData, {
          activeAgents,
        });
      let parseFailure;
      if ($[35] !== content.input) {
        parseFailure = describeUnparsedInput(content.input);
        $[35] = content.input;
        $[36] = parseFailure;
      } else parseFailure = $[36];
      let parseFailure_2 = parseFailure;
      let paramText =
        parseFailure_2 !== null
          ? parseFailure_2
          : parsedInputData
            ? renderToolUseMessageFor(tool, parsedInputData, {
                theme,
                verbose: true,
                isTranscriptMode: true,
                activeAgents,
              })
            : null;
      progressMessages = lookups.progressMessagesByToolUseID.get(content.id) ?? [];
      let renderedOutput =
        isResolved && !isErrored_2 && parsedData_2 !== undefined
          ? mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(
              parsedData_2,
              filterToolProgressMessages(progressMessages),
              {
                verbose: true,
                tools,
                theme,
                isTranscriptMode: true,
                input: content.input,
                activeAgents,
              },
            )
          : undefined;
      let hasName = displayedName !== "";
      if (!hasName && renderedOutput == null && !(isResolved && isErrored_2 && resultMsg !== undefined)) {
        earlyReturn = null;
        break pe;
      }
      BoxComponent = Box;
      key = content.id;
      flexDirection = "column";
      marginTop = hasName ? 1 : 0;
      headerRow =
        hasName &&
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(ToolUseLoader, {
              shouldAnimate: shouldAnimate && isInProgress_2,
              isUnresolved: !isResolved,
              isError: isQuietlyErrored,
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: displayedName,
                }),
                paramText &&
                  jsxProd_default_2(Text, {
                    children: ["(", paramText, ")"],
                  }),
                remoteHost !== undefined &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [" \xB7 on ", remoteHost],
                  }),
              ],
            }),
            parsedInputData &&
              mcpRenderOverrideFor(tool, "renderToolUseTag")?.(parsedInputData, {
                toolUseId: content.id,
                toolUseResult: output,
                progressMessages: lookups.progressMessagesByToolUseID.get(content.id),
              }),
          ],
        });
      outputBox =
        renderedOutput != null &&
        jsxProd_default(Box, {
          children: guardPrimitiveToolResult(bg, renderedOutput, tool),
        });
    }
    $[0] = activeAgents;
    $[1] = content.id;
    $[2] = content.input;
    $[3] = content.name;
    $[4] = bg;
    $[5] = inProgressToolUseIDs;
    $[6] = lookups;
    $[7] = outputOverride;
    $[8] = quietWords;
    $[9] = frameRegistry;
    $[10] = shouldAnimate;
    $[11] = theme;
    $[12] = toolLabel;
    $[13] = tools;
    $[14] = BoxComponent;
    $[15] = isQuietlyErrored;
    $[16] = isResolved;
    $[17] = progressMessages;
    $[18] = resultMsg;
    $[19] = key;
    $[20] = flexDirection;
    $[21] = marginTop;
    $[22] = headerRow;
    $[23] = outputBox;
    $[24] = earlyReturn;
    $[25] = tool;
  } else {
    BoxComponent = $[14];
    isQuietlyErrored = $[15];
    isResolved = $[16];
    progressMessages = $[17];
    resultMsg = $[18];
    key = $[19];
    flexDirection = $[20];
    marginTop = $[21];
    headerRow = $[22];
    outputBox = $[23];
    earlyReturn = $[24];
    tool = $[25];
  }
  if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
  let errorRow;
  if (
    $[37] !== content.id ||
    $[38] !== content.input ||
    $[39] !== isQuietlyErrored ||
    $[40] !== isResolved ||
    $[41] !== progressMessages ||
    $[42] !== resultMsg ||
    $[43] !== tool ||
    $[44] !== tools
  ) {
    errorRow =
      isResolved &&
      isQuietlyErrored &&
      jsxProd_default(GroupedToolUseRow, {
        toolUseID: content.id,
        input: content.input,
        resultMsg,
        tool,
        tools,
        progressMessagesForMessage: progressMessages,
      });
    $[37] = content.id;
    $[38] = content.input;
    $[39] = isQuietlyErrored;
    $[40] = isResolved;
    $[41] = progressMessages;
    $[42] = resultMsg;
    $[43] = tool;
    $[44] = tools;
    $[45] = errorRow;
  } else errorRow = $[45];
  let boxContent;
  if (
    $[46] !== BoxComponent ||
    $[47] !== key ||
    $[48] !== flexDirection ||
    $[49] !== marginTop ||
    $[50] !== headerRow ||
    $[51] !== outputBox ||
    $[52] !== errorRow
  ) {
    boxContent = jsxProd_default_2(
      BoxComponent,
      {
        flexDirection,
        marginTop,
        children: [headerRow, outputBox, false, errorRow],
      },
      key,
    );
    $[46] = BoxComponent;
    $[47] = key;
    $[48] = flexDirection;
    $[49] = marginTop;
    $[50] = headerRow;
    $[51] = outputBox;
    $[52] = errorRow;
    $[53] = boxContent;
  } else boxContent = $[53];
  return boxContent;
}
//@ chunk-ah34pb7m.js:166083-185246 fingerprint (2.1.88 match: CollapsedReadSearchContent, 0.58)
/**
 * 折叠读/搜索组：统计 Read/Grep/Glob 等调用次数显示一行摘要（进行中显示当前目标），verbose 或 transcript 下逐个渲染 VerboseToolUse；含权限规则命中/本地错误等标记。
 */
function CollapsedReadSearchContent(props) {
  let $ = useMemoCache(201);
  let { message, inProgressToolUseIDs, shouldAnimate, verbose, tools, lookups, isActiveGroup, addMargin } =
    props;
  let margin = addMargin === undefined ? true : addMargin;
  let bg = useIsFullscreen();
  useHost();
  let appStateSlice = useAppStateSlice(isNoAgentViewInAutoMode);
  let isBriefOnly = useContext(BRIDGE_PLACED_KEYS_CONTEXT) !== null && appStateSlice === true;
  let {
    searchCount: rawSearchCount,
    readCount: rawReadCount,
    listCount: rawListCount,
    memorySearchCount,
    memoryReadCount,
    memoryWriteCount,
    messages: groupMessages,
  } = message;
  let [theme] = useTheme();
  let { columns } = useTerminalSize();
  let toolUseIds = collectToolUseIds(message);
  let quietSaves = memorySavesQuietApi?.quietMemorySaves(message.memorySaves ?? []);
  let anyError = toolUseIds.some((id) => lookups.erroredToolUseIDs.has(id) && quietSaves?.has(id) !== true);
  let accountMemoryReadCount = message.accountMemoryReadKeys?.length ?? 0;
  let accountMemorySearchCount = message.accountMemorySearchCount ?? 0;
  let localMemoryPrefix =
    alwaysFalseMemCtx() || accountMemoryReadCount > 0 || accountMemorySearchCount > 0 ? "local " : "";
  let hasMemoryOps =
    memorySearchCount > 0 ||
    memoryReadCount > 0 ||
    memoryWriteCount > 0 ||
    accountMemoryReadCount > 0 ||
    accountMemorySearchCount > 0 ||
    (message.memorySaves?.length ?? 0) > 0;
  let hasTeamMemOps;
  if ($[0] !== message) {
    hasTeamMemOps = checkHasTeamMemOps(message);
    $[0] = message;
    $[1] = hasTeamMemOps;
  } else hasTeamMemOps = $[1];
  let hasTeamMemOps_2 = hasTeamMemOps;
  let quietMemoryCalls;
  if ($[2] !== isActiveGroup || $[3] !== message.memorySaves) {
    quietMemoryCalls =
      memorySavesQuietApi?.memorySavesToldAsCalls(message.memorySaves ?? [], isActiveGroup === true) ?? 0;
    $[2] = isActiveGroup;
    $[3] = message.memorySaves;
    $[4] = quietMemoryCalls;
  } else quietMemoryCalls = $[4];
  let quietCallCount = quietMemoryCalls;
  const read = rawReadCount ?? 0;
  const search = rawSearchCount ?? 0;
  const list = rawListCount ?? 0;
  const mcp = message.mcpCallCount ?? 0;
  const bash = message.bashCount ?? 0;
  let countsRaw;
  if ($[5] !== read || $[6] !== search || $[7] !== list || $[8] !== mcp || $[9] !== bash) {
    countsRaw = {
      read,
      search,
      list,
      mcp,
      bash,
    };
    $[5] = read;
    $[6] = search;
    $[7] = list;
    $[8] = mcp;
    $[9] = bash;
    $[10] = countsRaw;
  } else countsRaw = $[10];
  let counts = countsRaw;
  let [prevCounts, setPrevCounts] = useState(counts);
  const read_2 = Math.max(prevCounts.read, counts.read);
  const search_2 = Math.max(prevCounts.search, counts.search);
  const list_2 = Math.max(prevCounts.list, counts.list);
  const mcp_2 = Math.max(prevCounts.mcp, counts.mcp);
  const bash_2 = Math.max(prevCounts.bash, counts.bash);
  let countsNext;
  if ($[11] !== read_2 || $[12] !== search_2 || $[13] !== list_2 || $[14] !== mcp_2 || $[15] !== bash_2) {
    countsNext = {
      read: read_2,
      search: search_2,
      list: list_2,
      mcp: mcp_2,
      bash: bash_2,
    };
    $[11] = read_2;
    $[12] = search_2;
    $[13] = list_2;
    $[14] = mcp_2;
    $[15] = bash_2;
    $[16] = countsNext;
  } else countsNext = $[16];
  let maxCounts = countsNext;
  if (
    maxCounts.read !== prevCounts.read ||
    maxCounts.search !== prevCounts.search ||
    maxCounts.list !== prevCounts.list ||
    maxCounts.mcp !== prevCounts.mcp ||
    maxCounts.bash !== prevCounts.bash
  )
    setPrevCounts(maxCounts);
  let otherToolCount = message.otherToolCount ?? 0;
  let agentCount = message.agentCount ?? 0;
  let editFileCount = message.editFileCount ?? 0;
  let frameCount = message.frameCount ?? 0;
  let added = message.linesAdded ?? 0;
  let removed = message.linesRemoved ?? 0;
  let scratchpadWriteCount = message.scratchpadWriteCount ?? 0;
  let added_2 = message.scratchpadLinesAdded ?? 0;
  let removed_2 = message.scratchpadLinesRemoved ?? 0;
  let { read: read_3, search: search_3, list: list_3 } = maxCounts;
  let mcpTotal = maxCounts.mcp + quietCallCount;
  let gitOpBashCount = message.gitOpBashCount ?? 0;
  let bashCount = bg ? Math.max(0, maxCounts.bash - gitOpBashCount) : 0;
  let thoughtForMs = message.thoughtForMs ?? 0;
  let hasThought = thoughtForMs > 0 || message.latestThinkingSummary !== undefined;
  let hasAnyOutput =
    search_3 > 0 ||
    read_3 > 0 ||
    list_3 > 0 ||
    mcpTotal > 0 ||
    bashCount > 0 ||
    gitOpBashCount > 0 ||
    otherToolCount > 0 ||
    agentCount > 0 ||
    editFileCount > 0 ||
    scratchpadWriteCount > 0 ||
    frameCount > 0 ||
    (message.hookTotalMs ?? 0) > 0 ||
    hasThought;
  let replResultIds;
  if (
    $[17] !== isActiveGroup ||
    $[18] !== lookups.toolResultByToolUseID ||
    $[19] !== message ||
    $[20] !== isBriefOnly
  ) {
    replResultIds =
      isActiveGroup === true && !isBriefOnly
        ? toolCallOf(message)
            .filter((call) => isReplToolName(call.name) && !lookups.toolResultByToolUseID.has(call.id))
            .map(toolResultId)
        : [];
    $[17] = isActiveGroup;
    $[18] = lookups.toolResultByToolUseID;
    $[19] = message;
    $[20] = isBriefOnly;
    $[21] = replResultIds;
  } else replResultIds = $[21];
  let replResultIds_2 = replResultIds;
  let hasReplActivity;
  if (
    $[22] !== inProgressToolUseIDs ||
    $[23] !== isActiveGroup ||
    $[24] !== message ||
    $[25] !== replResultIds_2.length ||
    $[26] !== isBriefOnly
  ) {
    hasReplActivity =
      replResultIds_2.length > 0 ||
      (isActiveGroup === true &&
        !isBriefOnly &&
        toolCallOf(message).some((call) => isReplToolName(call.name) && inProgressToolUseIDs.has(call.id)));
    $[22] = inProgressToolUseIDs;
    $[23] = isActiveGroup;
    $[24] = message;
    $[25] = replResultIds_2.length;
    $[26] = isBriefOnly;
    $[27] = hasReplActivity;
  } else hasReplActivity = $[27];
  let needsLoading = hasReplActivity;
  let filtered = toolCallOf(message).filter(isHookToolResult);
  let replTool = filtered.length > 0 ? findToolByName(tools, REPL_TOOL_NAME) : undefined;
  let renderErrorMessage = replTool && mcpRenderOverrideFor(replTool, "renderToolUseErrorMessage");
  let emptyRows;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    emptyRows = [];
    $[28] = emptyRows;
  } else emptyRows = $[28];
  let summaryToolUses = emptyRows;
  if (summaryToolUses.length > 0) findToolByName(tools, POLL);
  else undefined;
  let emptyIdSet;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    emptyIdSet = new Set([]);
    $[29] = emptyIdSet;
  } else emptyIdSet = $[29];
  let summarizedIds = emptyIdSet;
  let hasSummary = renderErrorMessage !== undefined && summarizedIds.size > 0;
  let summarizedIdSet;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    summarizedIdSet = new Set(summaryToolUses.map(toolUseId));
    $[30] = summarizedIdSet;
  } else summarizedIdSet = $[30];
  let summarizedIds_2 = summarizedIdSet;
  let endedToolIds = new Set(filtered.map(toolUseId_2));
  let isInterruptedAny = false && !hasSummary && true;
  let endedCalls = false ? filtered.filter((call) => !summarizedIds.has(call.id)) : filtered;
  let hasInterruptedCall =
    toolUseIds.some(
      (toolUseId) =>
        !summarizedIds_2.has(toolUseId) &&
        VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(toolUseId)),
    ) || isInterruptedAny;
  let renderResult = function renderResultImpl(id, isVerbose) {
    let resultMessage = lookups.toolResultByToolUseID.get(id);
    if (
      !renderErrorMessage ||
      resultMessage?.type !== "user" ||
      !lookups.erroredToolUseIDs.has(id) ||
      VALIDATE_TREE_NAMESPACE.isInterruptedCall(resultMessage)
    ) {
      return null;
    }
    let found = resultMessage.message.content.find(
      (block) => block.type === "tool_result" && block.tool_use_id === id,
    );
    if (
      found?.type !== "tool_result" ||
      (isToolDenial(found.content, resultMessage, USER_REJECTED_KIND) &&
        typeof found.content === "string" &&
        (found.content.startsWith(REJECT_MESSAGE) ||
          found.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)))
    ) {
      return null;
    }
    if (resultMessage.toolDenialKind === "permission-rule" && !isVerbose) {
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          wrap: "wrap",
          children: [
            jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(Text, {
                  children: "Not run",
                }),
                jsxProd_default(Text, {
                  children: "permission denied",
                }),
              ],
            }),
            " ",
            jsxProd_default(CtrlOToExpand, {}),
          ],
        }),
      });
    }
    if (
      typeof found.content === "string" &&
      (toolRejectionKind(resultMessage.toolDenialKind) ||
        resultMessage.toolDenialKind === "permission-rule" ||
        isAutoModeBlockedResult(found.content, resultMessage))
    ) {
      return jsxProd_default(UserToolErrorMessage, {
        param: found,
        tool: replTool,
        tools,
        input: filtered.find((call) => call.id === id)?.input,
        output: resultMessage.toolUseResult,
        toolDenialKind: resultMessage.toolDenialKind,
        remoteToolDenialKind: resultMessage.remoteToolDenialKind,
        toolDenialMonitorBlocked: resultMessage.toolDenialMonitorBlocked,
        verbose: isVerbose,
        progressMessagesForMessage: [],
        isTranscriptMode: isVerbose,
      });
    }
    return (
      renderErrorMessage(found.content, {
        progressMessagesForMessage: [],
        tools,
        verbose: isVerbose,
        output: resultMessage.toolUseResult,
      }) ?? null
    );
  };
  let { readFilePaths, searchArgs, latestDisplayHint } = message;
  if (latestDisplayHint === undefined) {
    let lastSearchArg;
    if ($[31] !== searchArgs) {
      lastSearchArg = searchArgs?.at(-1);
      $[31] = searchArgs;
      $[32] = lastSearchArg;
    } else lastSearchArg = $[32];
    let searchArg = lastSearchArg;
    let quotedSearchArg = searchArg !== undefined ? `"${searchArg}"` : undefined;
    let displayHint;
    if ($[33] !== quotedSearchArg || $[34] !== readFilePaths) {
      let lastRead = readFilePaths?.at(-1);
      displayHint = lastRead !== undefined ? getDisplayPath(lastRead) : quotedSearchArg;
      $[33] = quotedSearchArg;
      $[34] = readFilePaths;
      $[35] = displayHint;
    } else displayHint = $[35];
    latestDisplayHint = displayHint;
  }
  useAppStateSlice(noopRenderHook);
  let [denialRef, hasAutoDenial] = useFrozenValue(useHasAutoModeDenialFor(toolUseIds));
  useAppStateSlice(returnFalseHook);
  if (isActiveGroup) {
    if (
      $[36] !== inProgressToolUseIDs ||
      $[37] !== latestDisplayHint ||
      $[39] !== lookups.progressMessagesByToolUseID ||
      $[40] !== toolUseIds
    ) {
      $[38] = latestDisplayHint;
      for (const id_0 of toolUseIds) {
        if (!inProgressToolUseIDs.has(id_0)) {
          continue;
        }
        let latest = (lookups.progressMessagesByToolUseID.get(id_0) ?? []).at(-1)?.data;
        if (latest?.type === "mcp_progress") {
          let { progress, total, progressMessage } = latest;
          let progressText = cleanTaskDescription(progressMessage);
          if (progress !== undefined && total !== undefined && total > 0) {
            let rounded = Math.round(Math.min(1, Math.max(0, progress / total)) * 100);
            latestDisplayHint = progressText ? `${progressText} (${rounded}%)` : `${rounded}%`;
          } else if (progressText) latestDisplayHint = progressText;
          else if (progress !== undefined) latestDisplayHint = `Processing\u2026 ${progress}`;
        }
      }
      $[36] = inProgressToolUseIDs;
      $[37] = $[38];
      $[39] = lookups.progressMessagesByToolUseID;
      $[40] = toolUseIds;
      $[41] = latestDisplayHint;
    } else latestDisplayHint = $[41];
  }
  let throttledValue = useThrottledValue(latestDisplayHint, HINT_THROTTLE_MS);
  let styleCache;
  let isLiveTurn = isActiveGroup && message.isLiveBriefTurn === true;
  let displayedHint = useLingeringValue(
    isActiveGroup && !isLiveTurn ? message.latestThinkingSummary : undefined,
    HINT_LINGER_MS,
  );
  let hasLingeringHint = isActiveGroup && displayedHint !== undefined;
  let hint = hasLingeringHint ? displayedHint : throttledValue;
  let timestamp = Date.parse(message.timestamp);
  let taskSummarySelector;
  if ($[42] !== timestamp || $[43] !== isActiveGroup) {
    taskSummarySelector = (appState) =>
      isActiveGroup &&
      !appState.viewingAgentTaskId &&
      appState.taskSummary !== null &&
      !(appState.taskSummary.at < timestamp)
        ? appState.taskSummary.text
        : null;
    $[42] = timestamp;
    $[43] = isActiveGroup;
    $[44] = taskSummarySelector;
  } else taskSummarySelector = $[44];
  let appStateSlice_2 = useAppStateSlice(taskSummarySelector);
  if (verbose) {
    let assistantMessages = [];
    for (const msg of groupMessages) {
      if (msg.type === "assistant") assistantMessages.push(msg);
      else if (msg.type === "grouped_tool_use") assistantMessages.push(...msg.messages);
    }
    new Set();
    let isErroredAssistant;
    if ($[45] !== lookups) {
      isErroredAssistant = (msg_0) =>
        lookups.erroredToolUseIDs.has(msg_0.id) &&
        lookups.toolResultByToolUseID.get(msg_0.id)?.type === "user";
      $[45] = lookups;
      $[46] = isErroredAssistant;
    } else isErroredAssistant = $[46];
    let filtered = endedCalls.filter(isErroredAssistant);
    let thinkingRows;
    if ($[47] !== groupMessages || $[48] !== verbose) {
      let renderGroupedMessage;
      if ($[50] !== verbose) {
        renderGroupedMessage = (groupMessage) => {
          let contentBlock = groupMessage.type === "user" ? groupMessage.message.content[0] : null;
          if (contentBlock?.type !== "text" || !contentBlock.text.includes(`<${TASK_NOTIFICATION}`)) {
            return null;
          }
          return jsxProd_default(
            Box,
            {
              marginTop: 1,
              children: jsxProd_default(renderToolUseErrorMessage_5, {
                addMargin: false,
                param: {
                  type: "text",
                  text: contentBlock.text,
                },
                messageId: groupMessage.uuid,
                origin: groupMessage.type === "user" ? groupMessage.origin : undefined,
                verbose,
              }),
            },
            groupMessage.uuid,
          );
        };
        $[50] = verbose;
        $[51] = renderGroupedMessage;
      } else renderGroupedMessage = $[51];
      thinkingRows = groupMessages.map(renderGroupedMessage);
      $[47] = groupMessages;
      $[48] = verbose;
      $[49] = thinkingRows;
    } else thinkingRows = $[49];
    const mapped = assistantMessages.map((assistantMessage) => {
      let contentBlock = assistantMessage.message.content[0];
      if (contentBlock?.type === "thinking" && contentBlock.thinking) {
        return jsxProd_default(
          Box,
          {
            marginTop: 1,
            children: jsxProd_default(AssistantThinkingMessage, {
              param: contentBlock,
              addMargin: false,
              isTranscriptMode: true,
              verbose: true,
            }),
          },
          assistantMessage.uuid,
        );
      }
      if (contentBlock?.type !== "tool_use") {
        return null;
      }
      return jsxProd_default(
        CollapsedReadSearchGroup,
        {
          content: contentBlock,
          tools,
          lookups,
          inProgressToolUseIDs,
          shouldAnimate,
          theme,
          quietWords: quietSaves?.get(contentBlock.id),
        },
        contentBlock.id,
      );
    });
    const mapped_2 = filtered.map((call) => {
      let resultMessage = lookups.toolResultByToolUseID.get(call.id);
      let row;
      if (VALIDATE_TREE_NAMESPACE.isInterruptedCall(resultMessage))
        row = jsxProd_default(RejectedToolUseMessage, {});
      else {
        row = renderResult(call.id, true);
        if (row === null && replTool !== undefined)
          row = jsxProd_default(GroupedToolUseRow, {
            toolUseID: call.id,
            input: call.input,
            resultMsg: resultMessage,
            tool: replTool,
            tools,
            progressMessagesForMessage: [],
          });
      }
      return row === null
        ? null
        : jsxProd_default(
            Box,
            {
              children: row,
            },
            `ended-${call.id}`,
          );
    });
    let hooksRow;
    if ($[52] !== message.hookCount || $[53] !== message.hookInfos || $[54] !== message.hookTotalMs) {
      hooksRow =
        message.hookInfos &&
        message.hookInfos.length > 0 &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                jsxProd_default(Text, {
                  "aria-hidden": true,
                  children: "  \u23BF  ",
                }),
                "Ran ",
                message.hookCount,
                " ",
                "PreToolUse ",
                message.hookCount === 1 ? "hook" : "hooks",
                " (",
                formatSecondsShort(message.hookTotalMs ?? 0),
                ")",
              ],
            }),
            message.hookInfos.map(renderHookDurationLine),
          ],
        });
      $[52] = message.hookCount;
      $[53] = message.hookInfos;
      $[54] = message.hookTotalMs;
      $[55] = hooksRow;
    } else hooksRow = $[55];
    let memoriesRow;
    if ($[56] !== localMemoryPrefix || $[57] !== message.relevantMemories) {
      memoriesRow = message.relevantMemories?.map((m, idx) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            marginTop: idx > 0 ? 1 : 0,
            children: [
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  jsxProd_default(Text, {
                    "aria-hidden": true,
                    children: "  \u23BF  ",
                  }),
                  "Recalled ",
                  basename(m.path),
                  localMemoryPrefix ? " \xB7 local" : "",
                ],
              }),
              jsxProd_default(Box, {
                paddingLeft: 5,
                children: jsxProd_default(Text, {
                  children: jsxProd_default(Ansi, {
                    children: m.content,
                  }),
                }),
              }),
            ],
          },
          m.path,
        ),
      );
      $[56] = localMemoryPrefix;
      $[57] = message.relevantMemories;
      $[58] = memoriesRow;
    } else memoriesRow = $[58];
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [thinkingRows, mapped, false, mapped_2, false, false, hooksRow, memoriesRow, false],
    });
  }
  let nothing =
    undefined !== undefined && endedCalls.includes(undefined) ? renderResult(undefined.id, false) : null;
  let isInterrupted;
  if ($[59] !== lookups) {
    isInterrupted = (call) =>
      VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(call.id));
    $[59] = lookups;
    $[60] = isInterrupted;
  } else isInterrupted = $[60];
  let any = filtered.some(isInterrupted);
  let emptyRowList;
  if ($[61] === MEMO_CACHE_SENTINEL) {
    emptyRowList = [];
    $[61] = emptyRowList;
  } else emptyRowList = $[61];
  let extraRows = emptyRowList;
  if (!hasMemoryOps && !hasTeamMemOps_2 && !hasAnyOutput && !needsLoading) {
    let isInterrupted2 = any || isInterruptedAny;
    if (!isInterrupted2 && nothing === null && extraRows.length === 0) {
      return null;
    }
    let interruptedRow;
    if ($[62] !== isInterrupted2) {
      interruptedRow = isInterrupted2 && jsxProd_default(RejectedToolUseMessage, {});
      $[62] = isInterrupted2;
      $[63] = interruptedRow;
    } else interruptedRow = $[63];
    let simpleColumn;
    if ($[64] !== nothing || $[65] !== interruptedRow) {
      simpleColumn = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [interruptedRow, extraRows, nothing],
      });
      $[64] = nothing;
      $[65] = interruptedRow;
      $[66] = simpleColumn;
    } else simpleColumn = $[66];
    return simpleColumn;
  }
  let elapsedSuffix;
  if (
    $[67] !== bg ||
    $[68] !== inProgressToolUseIDs ||
    $[69] !== isActiveGroup ||
    $[70] !== lookups ||
    $[71] !== toolUseIds
  ) {
    elapsedSuffix = "";
    if (bg && isActiveGroup) {
      let maxElapsedSeconds;
      let lastTotalLines = 0;
      if ($[73] !== inProgressToolUseIDs || $[74] !== lookups || $[75] !== toolUseIds) {
        for (const id_1 of toolUseIds) {
          if (!inProgressToolUseIDs.has(id_1)) {
            continue;
          }
          let data = lookups.progressMessagesByToolUseID.get(id_1)?.at(-1)?.data;
          if (data?.type !== "bash_progress" && data?.type !== "powershell_progress") {
            continue;
          }
          if (maxElapsedSeconds === undefined || data.elapsedTimeSeconds > maxElapsedSeconds) {
            maxElapsedSeconds = data.elapsedTimeSeconds;
            lastTotalLines = data.totalLines;
          }
        }
        $[73] = inProgressToolUseIDs;
        $[74] = lookups;
        $[75] = toolUseIds;
        $[76] = maxElapsedSeconds;
        $[77] = lastTotalLines;
      } else {
        maxElapsedSeconds = $[76];
        lastTotalLines = $[77];
      }
      if (maxElapsedSeconds !== undefined && maxElapsedSeconds >= 2) {
        const elapsedMs = maxElapsedSeconds * 1000;
        let elapsedText;
        if ($[78] !== elapsedMs) {
          elapsedText = formatDuration(elapsedMs);
          $[78] = elapsedMs;
          $[79] = elapsedText;
        } else elapsedText = $[79];
        let elapsedTextStable = elapsedText;
        elapsedSuffix =
          lastTotalLines > 0
            ? ` (${elapsedTextStable} \xB7 ${lastTotalLines} ${lastTotalLines === 1 ? "line" : "lines"})`
            : ` (${elapsedTextStable})`;
      }
    }
    $[67] = bg;
    $[68] = inProgressToolUseIDs;
    $[69] = isActiveGroup;
    $[70] = lookups;
    $[71] = toolUseIds;
    $[72] = elapsedSuffix;
  } else elapsedSuffix = $[72];
  let lastToolStartMs = 0;
  if (isActiveGroup && bg) {
    if ($[80] !== groupMessages || $[81] !== inProgressToolUseIDs) {
      for (let idx = groupMessages.length - 1; idx >= 0 && !lastToolStartMs; idx--) {
        let inProgressToolUseIds = groupMessages[idx];
        let lookups =
          inProgressToolUseIds.type === "grouped_tool_use"
            ? inProgressToolUseIds.messages
            : inProgressToolUseIds.type === "assistant"
              ? [inProgressToolUseIds]
              : [];
        for (const lookup of lookups) {
          if (
            lookup.message.content.some(
              (state) => state.type === "tool_use" && inProgressToolUseIDs.has(state.id),
            )
          ) {
            let timestamp = Date.parse(lookup.timestamp);
            if (Number.isFinite(timestamp)) lastToolStartMs = timestamp;
            break;
          }
        }
      }
      $[80] = groupMessages;
      $[81] = inProgressToolUseIDs;
      $[82] = lastToolStartMs;
    } else lastToolStartMs = $[82];
  }
  let elapsedAnchorMs;
  let taskSummaryText;
  let textOnlyHooks;
  let parts;
  if (
    $[83] !== agentCount ||
    $[84] !== bashCount ||
    $[85] !== styleCache ||
    $[86] !== editFileCount ||
    $[87] !== frameCount ||
    $[88] !== bg ||
    $[89] !== groupMessages ||
    $[90] !== needsLoading ||
    $[91] !== hasTeamMemOps_2 ||
    $[92] !== hasThought ||
    $[93] !== lastToolStartMs ||
    $[94] !== isActiveGroup ||
    $[95] !== isLiveTurn ||
    $[96] !== added ||
    $[97] !== removed ||
    $[98] !== list_3 ||
    $[99] !== appStateSlice_2 ||
    $[100] !== localMemoryPrefix ||
    $[101] !== mcpTotal ||
    $[102] !== memoryReadCount ||
    $[103] !== memorySearchCount ||
    $[104] !== memoryWriteCount ||
    $[105] !== message ||
    $[106] !== otherToolCount ||
    $[107] !== read_3 ||
    $[108] !== quietCallCount ||
    $[109] !== added_2 ||
    $[110] !== removed_2 ||
    $[111] !== scratchpadWriteCount ||
    $[112] !== search_3 ||
    $[113] !== thoughtForMs
  ) {
    parts = [];
    let pushPart = function pushPart(key, verb, body) {
      let isFirst = parts.length === 0;
      if (!isFirst)
        parts.push(
          jsxProd_default(
            Text,
            {
              children: ", ",
            },
            `comma-${key}`,
          ),
        );
      parts.push(
        jsxProd_default_2(
          Text,
          {
            children: [
              isFirst ? verb[0].toUpperCase() + verb.slice(1) : verb,
              body != null &&
                jsxProd_default_2(Fragment, {
                  children: [" ", body],
                }),
            ],
          },
          key,
        ),
      );
    };
    if (hasThought) {
      let thoughtVerb = isActiveGroup ? "Thinking" : "Thought";
      let thoughtDuration;
      if (isActiveGroup && bg && !isLiveTurn) {
        let lastThinkingAtMs = 0;
        if ($[118] !== groupMessages) {
          for (let idx = groupMessages.length - 1; idx >= 0; idx--) {
            let groupMessage = groupMessages[idx];
            if (groupMessage?.type === "assistant" && groupMessage.message.content[0]?.type === "thinking") {
              let timestamp = Date.parse(groupMessage.timestamp);
              if (Number.isFinite(timestamp)) lastThinkingAtMs = timestamp;
              break;
            }
          }
          $[118] = groupMessages;
          $[119] = lastThinkingAtMs;
        } else lastThinkingAtMs = $[119];
        let thinkingElapsed;
        if ($[120] !== lastThinkingAtMs || $[121] !== thoughtForMs) {
          thinkingElapsed = jsxProd_default(ThinkingElapsed, {
            baseMs: thoughtForMs,
            lastThinkingAtMs,
          });
          $[120] = lastThinkingAtMs;
          $[121] = thoughtForMs;
          $[122] = thinkingElapsed;
        } else thinkingElapsed = $[122];
        thoughtDuration = thinkingElapsed;
      } else {
        const max = Math.max(1000, thoughtForMs);
        let children;
        if ($[123] !== max) {
          children = formatDuration(max);
          $[123] = max;
          $[124] = children;
        } else children = $[124];
        let durationText;
        if ($[125] !== children) {
          durationText = jsxProd_default(Text, {
            bold: true,
            children,
          });
          $[125] = children;
          $[126] = durationText;
        } else durationText = $[126];
        thoughtDuration = durationText;
      }
      let thoughtPart;
      if ($[127] !== thoughtDuration || $[128] !== thoughtVerb) {
        thoughtPart = jsxProd_default_2(
          Text,
          {
            children: [thoughtVerb, " for ", thoughtDuration],
          },
          "thought",
        );
        $[127] = thoughtDuration;
        $[128] = thoughtVerb;
        $[129] = thoughtPart;
      } else thoughtPart = $[129];
      parts.push(thoughtPart);
    }
    let partCountBefore = parts.length;
    if (editFileCount > 0)
      pushPart(
        "edit",
        isActiveGroup ? "editing" : "edited",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: editFileCount,
            }),
            " ",
            editFileCount === 1 ? "file" : "files",
            " ",
            jsxProd_default(DiffStatCounts, {
              added,
              removed,
            }),
          ],
        }),
      );
    if (scratchpadWriteCount > 0)
      pushPart(
        "scratchpad",
        isActiveGroup ? "making" : "made",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: scratchpadWriteCount,
            }),
            " scratchpad",
            " ",
            scratchpadWriteCount === 1 ? "edit" : "edits",
            " ",
            jsxProd_default(DiffStatCounts, {
              added: added_2,
              removed: removed_2,
            }),
          ],
        }),
      );
    if (bg && message.commits?.length) {
      let byKind = {
        committed: "committed",
        amended: "amended commit",
        "cherry-picked": "cherry-picked",
      };
      for (const commitKind of ["committed", "amended", "cherry-picked"]) {
        let shas = message.commits.filter((commit) => commit.kind === commitKind).map(commitSha);
        if (shas.length)
          pushPart(
            commitKind,
            byKind[commitKind],
            jsxProd_default(Text, {
              bold: true,
              children: shas.join(", "),
            }),
          );
      }
    }
    if (bg && message.pushes?.length) {
      let branches = uniq(message.pushes.map(gitBranch));
      pushPart(
        "push",
        "pushed to",
        jsxProd_default(Text, {
          bold: true,
          children: branches.join(", "),
        }),
      );
    }
    if (bg && message.branches?.length) {
      let byAction = {
        merged: "merged",
        rebased: "rebased onto",
      };
      for (const branch of message.branches)
        pushPart(
          `br-${branch.action}-${branch.ref}`,
          byAction[branch.action],
          jsxProd_default(Text, {
            bold: true,
            children: branch.ref,
          }),
        );
    }
    if (bg && message.prs?.length) {
      let prLabels = {
        created: "created",
        edited: "edited",
        merged: "merged",
        commented: "commented on",
        closed: "closed",
        reopened: "reopened",
        ready: "marked ready",
        draft: "marked draft",
        "auto-merge-enabled": "enabled auto-merge on",
        "auto-merge-disabled": "disabled auto-merge on",
      };
      for (const pr of message.prs)
        pushPart(
          `pr-${pr.action}-${pr.number}`,
          prLabels[pr.action],
          pr.url && isValidPrUrl(pr.url)
            ? jsxProd_default(PrBadge, {
                number: pr.number,
                url: pr.url,
                bold: true,
                kind: isGitLabMergeRequestUrl(pr.url) ? "mr" : undefined,
              })
            : jsxProd_default_2(Text, {
                bold: true,
                children: [pr.url && isGitLabMergeRequestUrl(pr.url) ? "MR !" : "PR #", pr.number],
              }),
        );
    }
    if (frameCount > 0) pushPart("frame", isActiveGroup ? "publishing" : "published", null);
    if (search_3 > 0)
      pushPart(
        "search",
        isActiveGroup ? "searching for" : "searched for",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: search_3,
            }),
            " ",
            search_3 === 1 ? "pattern" : "patterns",
          ],
        }),
      );
    if (read_3 > 0)
      pushPart(
        "read",
        isActiveGroup ? "reading" : "read",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: read_3,
            }),
            " ",
            read_3 === 1 ? "file" : "files",
          ],
        }),
      );
    if (list_3 > 0)
      pushPart(
        "list",
        isActiveGroup ? "listing" : "listed",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: list_3,
            }),
            " ",
            list_3 === 1 ? "directory" : "directories",
          ],
        }),
      );
    if (mcpTotal > 0) {
      let mcpCallLabels = message.mcpCallLabels ?? [];
      let mcpLabel =
        (quietCallCount > 0 ? uniq([...mcpCallLabels, MEMORY]) : mcpCallLabels)
          .map(CLAUDEAI_SERVER_PREFIX)
          .join(", ") || "MCP";
      pushPart(
        "mcp",
        isActiveGroup ? "calling" : "called",
        jsxProd_default_2(Text, {
          children: [
            mcpLabel,
            mcpTotal > 1 &&
              jsxProd_default_2(Text, {
                children: [
                  " ",
                  jsxProd_default(Text, {
                    bold: true,
                    children: mcpTotal,
                  }),
                  " times",
                ],
              }),
          ],
        }),
      );
    }
    if (agentCount > 0) {
      let backgroundToolUseIds = collectBackgroundToolUseIds(message.messages);
      let text = agentCount === 1 && !backgroundToolUseIds ? message.agentDescriptions?.[0] : undefined;
      let statusText = text !== undefined ? inflectStatusText(text) : undefined;
      let agentVerb = isActiveGroup ? "running" : "ran";
      if (statusText !== undefined) {
        let isFirstPart = parts.length === 0;
        if (!isFirstPart) {
          let commaAgent;
          if ($[130] === MEMO_CACHE_SENTINEL) {
            commaAgent = jsxProd_default(
              Text,
              {
                children: ", ",
              },
              "comma-agent",
            );
            $[130] = commaAgent;
          } else commaAgent = $[130];
          parts.push(commaAgent);
        }
        const children = jsxProd_default(Text, {
          bold: true,
          children: lowerFirstUnlessAcronym(
            isActiveGroup ? statusText.running : statusText.done,
            isFirstPart,
          ),
        });
        let agentPart;
        if ($[131] !== children) {
          agentPart = jsxProd_default(
            Text,
            {
              children,
            },
            "agent",
          );
          $[131] = children;
          $[132] = agentPart;
        } else agentPart = $[132];
        parts.push(agentPart);
      } else if (text !== undefined)
        pushPart(
          "agent",
          agentVerb,
          jsxProd_default_2(Text, {
            children: [
              "agent \xB7 ",
              jsxProd_default(Text, {
                bold: true,
                children: text,
              }),
            ],
          }),
        );
      else
        pushPart(
          "agent",
          agentVerb,
          jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: agentCount,
              }),
              " ",
              agentCount === 1 ? "agent" : "agents",
            ],
          }),
        );
    }
    if (otherToolCount > 0)
      pushPart(
        "other",
        isActiveGroup ? "calling" : "called",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: otherToolCount,
            }),
            " ",
            otherToolCount === 1 ? "tool" : "tools",
          ],
        }),
      );
    if (bg && bashCount > 0)
      pushPart(
        "bash",
        isActiveGroup ? "running" : "ran",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: bashCount,
            }),
            " shell",
            " ",
            bashCount === 1 ? "command" : "commands",
          ],
        }),
      );
    if (memoryReadCount > 0)
      pushPart(
        "mem-read",
        isActiveGroup ? "recalling" : "recalled",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: memoryReadCount,
            }),
            " ",
            localMemoryPrefix,
            memoryReadCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    if (memorySearchCount > 0) pushPart("mem-search", isActiveGroup ? "searching" : "searched", "memories");
    for (const savePart of memorySavesQuietApi?.memorySaveParts(
      message.memorySaves ?? [],
      isActiveGroup === true,
    ) ?? [])
      pushPart(savePart.key, savePart.verb, savePart.object);
    if (memoryWriteCount > 0)
      pushPart(
        "mem-write",
        isActiveGroup ? "writing" : "wrote",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: memoryWriteCount,
            }),
            " ",
            memoryWriteCount === 1 ? "memory" : "memories",
          ],
        }),
      );
    let isWorking = needsLoading && !hasTeamMemOps_2 && parts.length === partCountBefore;
    if (isWorking) pushPart("script", "working", null);
    let summaryOverride = !appStateSlice_2 && isWorking ? styleCache : undefined;
    taskSummaryText = appStateSlice_2 || summaryOverride;
    elapsedAnchorMs = summaryOverride === undefined ? lastToolStartMs : 0;
    textOnlyHooks = parts.length === 0 && (message.hookTotalMs ?? 0) > 0;
    if (textOnlyHooks)
      pushPart(
        "hooks",
        "ran",
        jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: message.hookCount,
            }),
            " PreToolUse",
            " ",
            message.hookCount === 1 ? "hook" : "hooks",
            " (",
            formatSecondsShort(message.hookTotalMs ?? 0),
            ")",
          ],
        }),
      );
    $[83] = agentCount;
    $[84] = bashCount;
    $[85] = styleCache;
    $[86] = editFileCount;
    $[87] = frameCount;
    $[88] = bg;
    $[89] = groupMessages;
    $[90] = needsLoading;
    $[91] = hasTeamMemOps_2;
    $[92] = hasThought;
    $[93] = lastToolStartMs;
    $[94] = isActiveGroup;
    $[95] = isLiveTurn;
    $[96] = added;
    $[97] = removed;
    $[98] = list_3;
    $[99] = appStateSlice_2;
    $[100] = localMemoryPrefix;
    $[101] = mcpTotal;
    $[102] = memoryReadCount;
    $[103] = memorySearchCount;
    $[104] = memoryWriteCount;
    $[105] = message;
    $[106] = otherToolCount;
    $[107] = read_3;
    $[108] = quietCallCount;
    $[109] = added_2;
    $[110] = removed_2;
    $[111] = scratchpadWriteCount;
    $[112] = search_3;
    $[113] = thoughtForMs;
    $[114] = elapsedAnchorMs;
    $[115] = taskSummaryText;
    $[116] = textOnlyHooks;
    $[117] = parts;
  } else {
    elapsedAnchorMs = $[114];
    taskSummaryText = $[115];
    textOnlyHooks = $[116];
    parts = $[117];
  }
  let autoModeBlockedCount = 0;
  let monitorBlockedCount = 0;
  let unavailableCount = 0;
  let permissionDeniedCount = 0;
  let autoModeBlockedContent;
  let permissionDeniedContent;
  let flattened = message.messages.flatMap(countToolUses);
  for (const toolResultMessage of flattened) {
    let found = toolResultMessage.message.content.find(isToolResultBlock);
    if (
      found?.type !== "tool_result" ||
      (renderErrorMessage !== undefined && endedToolIds.has(found.tool_use_id))
    ) {
      continue;
    }
    if (
      isAutoModeUnavailableKind(toolResultMessage.toolDenialKind, toolResultMessage.toolDenialMonitorBlocked)
    )
      unavailableCount++;
    else if (toolResultMessage.toolDenialKind === "automode-blocked") {
      autoModeBlockedCount++;
      autoModeBlockedContent = typeof found.content === "string" ? found.content : undefined;
    } else if (toolResultMessage.toolDenialMonitorBlocked === true) monitorBlockedCount++;
    else if (
      toolResultMessage.toolDenialKind === "permission-rule" &&
      found.is_error === true &&
      toolResultMessage.toolDenialAfterRun !== true &&
      toolResultMessage.toolDenialFromHost !== true &&
      !summarizedIds_2.has(found.tool_use_id)
    ) {
      permissionDeniedCount++;
      permissionDeniedContent = typeof found.content === "string" ? found.content : undefined;
    }
  }
  let blockedCount = autoModeBlockedCount + monitorBlockedCount;
  let autoModeReason =
    blockedCount === 1 && autoModeBlockedContent !== undefined
      ? cleanTaskDescription(
          extractClassifierDenialReason(stripAnsiPerLine(autoModeBlockedContent)) ?? undefined,
        )
      : undefined;
  let denialText =
    permissionDeniedCount === 1 && permissionDeniedContent !== undefined
      ? stripAnsiPerLine(permissionDeniedContent)
      : undefined;
  let cleanedDenial =
    denialText === undefined
      ? undefined
      : (unwrapToolUseErrorText(denialText) ?? denialText)
          .trim()
          .replace(PERMISSION_DENIED_FOR_PATTERN, "")
          .replace(PRE_TOOL_HOOK_ERROR_PREFIX_RE, "$1");
  let permissionReason =
    cleanedDenial === undefined ||
    NON_INTERACTIVE_DENIAL_PREFIXES.some((prefix) => cleanedDenial.startsWith(prefix)) ||
    isModelUnavailableDenial(cleanedDenial)
      ? undefined
      : cleanTaskDescription(
          cleanedDenial.startsWith(SAFETY_CHECK_DENIAL_PREFIX)
            ? SAFETY_CHECK_DENIAL_PREFIX
            : firstLineOf(getFirstLine(cleanedDenial), DENIAL_STOP_AND_EXPLAIN_GUIDANCE),
        );
  const marginTop = margin ? 1 : 0;
  let leadingIcon;
  if ($[133] !== anyError || $[134] !== isActiveGroup) {
    leadingIcon = isActiveGroup
      ? jsxProd_default(ToolUseLoader, {
          shouldAnimate: true,
          isUnresolved: true,
          isError: anyError || false,
        })
      : jsxProd_default(Box, {
          minWidth: 2,
        });
    $[133] = anyError;
    $[134] = isActiveGroup;
    $[135] = leadingIcon;
  } else leadingIcon = $[135];
  const dimColor = !isActiveGroup;
  let summaryRow;
  if ($[136] !== taskSummaryText || $[137] !== parts) {
    summaryRow = taskSummaryText
      ? jsxProd_default(
          Text,
          {
            children: capitalize(taskSummaryText),
          },
          "task-summary",
        )
      : parts;
    $[136] = taskSummaryText;
    $[137] = parts;
    $[138] = summaryRow;
  } else summaryRow = $[138];
  let teamMemParts;
  if ($[139] !== taskSummaryText || $[140] !== isActiveGroup || $[141] !== message || $[142] !== parts) {
    teamMemParts =
      !taskSummaryText &&
      TeamMemCountParts({
        message,
        isActiveGroup,
        hasPrecedingParts: parts.length > 0,
      });
    $[139] = taskSummaryText;
    $[140] = isActiveGroup;
    $[141] = message;
    $[142] = parts;
    $[143] = teamMemParts;
  } else teamMemParts = $[143];
  let elapsedRow;
  if ($[144] !== elapsedAnchorMs || $[145] !== isLiveTurn || $[146] !== shouldAnimate) {
    elapsedRow =
      elapsedAnchorMs > 0 &&
      !isLiveTurn &&
      jsxProd_default(
        ElapsedSinceAnchor,
        {
          anchorMs: elapsedAnchorMs,
          shouldAnimate,
        },
        "tool-elapsed",
      );
    $[144] = elapsedAnchorMs;
    $[145] = isLiveTurn;
    $[146] = shouldAnimate;
    $[147] = elapsedRow;
  } else elapsedRow = $[147];
  let ellipsisRow;
  if ($[148] !== taskSummaryText || $[149] !== isActiveGroup) {
    ellipsisRow =
      isActiveGroup &&
      !taskSummaryText &&
      jsxProd_default(
        Text,
        {
          children: "\u2026",
        },
        "ellipsis",
      );
    $[148] = taskSummaryText;
    $[149] = isActiveGroup;
    $[150] = ellipsisRow;
  } else ellipsisRow = $[150];
  let expandHint;
  if ($[151] === MEMO_CACHE_SENTINEL) {
    expandHint = jsxProd_default(CtrlOToExpand, {});
    $[151] = expandHint;
  } else expandHint = $[151];
  let partsRow;
  if (
    $[152] !== dimColor ||
    $[153] !== summaryRow ||
    $[154] !== teamMemParts ||
    $[155] !== elapsedRow ||
    $[156] !== ellipsisRow
  ) {
    partsRow = jsxProd_default_2(Text, {
      dimColor,
      children: [summaryRow, teamMemParts, elapsedRow, ellipsisRow, " ", expandHint],
    });
    $[152] = dimColor;
    $[153] = summaryRow;
    $[154] = teamMemParts;
    $[155] = elapsedRow;
    $[156] = ellipsisRow;
    $[157] = partsRow;
  } else partsRow = $[157];
  let headerRow;
  if ($[158] !== leadingIcon || $[159] !== partsRow) {
    headerRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [leadingIcon, partsRow],
    });
    $[158] = leadingIcon;
    $[159] = partsRow;
    $[160] = headerRow;
  } else headerRow = $[160];
  let interruptedNotice;
  if ($[161] !== hasInterruptedCall) {
    interruptedNotice = hasInterruptedCall && jsxProd_default(RejectedToolUseMessage, {});
    $[161] = hasInterruptedCall;
    $[162] = interruptedNotice;
  } else interruptedNotice = $[162];
  let autoBlockedNotice;
  if (
    $[163] !== autoModeReason ||
    $[164] !== autoModeBlockedCount ||
    $[165] !== monitorBlockedCount ||
    $[166] !== blockedCount ||
    $[167] !== hasAutoDenial ||
    $[168] !== isLiveTurn ||
    $[169] !== toolUseIds
  ) {
    autoBlockedNotice =
      blockedCount > 0 &&
      !isLiveTurn &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              dimColor: monitorBlockedCount === 0,
              wrap: "wrap",
              children: jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(Text, {
                    color: monitorBlockedCount > 0 ? "error" : undefined,
                    children:
                      toolUseIds.length === 1
                        ? "Blocked by auto mode"
                        : `${blockedCount} ${plural(blockedCount, "action")} blocked by auto mode`,
                  }),
                  autoModeBlockedCount > 0 &&
                    hasAutoDenial &&
                    !isRemoteSessionAvailable() &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "/permissions to review",
                    }),
                ],
              }),
            }),
            autoModeReason !== undefined &&
              jsxProd_default(DenialReasonQuote, {
                label: AUTO_MODE_PREFIX,
                reason: autoModeReason,
              }),
          ],
        }),
      });
    $[163] = autoModeReason;
    $[164] = autoModeBlockedCount;
    $[165] = monitorBlockedCount;
    $[166] = blockedCount;
    $[167] = hasAutoDenial;
    $[168] = isLiveTurn;
    $[169] = toolUseIds;
    $[170] = autoBlockedNotice;
  } else autoBlockedNotice = $[170];
  let deniedNotice;
  if (
    $[171] !== isLiveTurn ||
    $[172] !== permissionReason ||
    $[173] !== permissionDeniedCount ||
    $[174] !== toolUseIds
  ) {
    deniedNotice =
      permissionDeniedCount > 0 &&
      !isLiveTurn &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              wrap: "wrap",
              children: jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(Text, {
                    children:
                      toolUseIds.length === 1
                        ? "Not run"
                        : `${permissionDeniedCount} ${plural(permissionDeniedCount, "action")} not run`,
                  }),
                  jsxProd_default(Text, {
                    children: "permission denied",
                  }),
                ],
              }),
            }),
            permissionReason !== undefined &&
              jsxProd_default(DenialReasonQuote, {
                label: "Reason: ",
                reason: permissionReason,
              }),
          ],
        }),
      });
    $[171] = isLiveTurn;
    $[172] = permissionReason;
    $[173] = permissionDeniedCount;
    $[174] = toolUseIds;
    $[175] = deniedNotice;
  } else deniedNotice = $[175];
  let unavailableNotice;
  if ($[176] !== unavailableCount || $[177] !== isLiveTurn || $[178] !== toolUseIds) {
    unavailableNotice =
      unavailableCount > 0 &&
      !isLiveTurn &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children: jsxProd_default(NotRunLine, {
            callCount: toolUseIds.length === 1 ? undefined : unavailableCount,
          }),
        }),
      });
    $[176] = unavailableCount;
    $[177] = isLiveTurn;
    $[178] = toolUseIds;
    $[179] = unavailableNotice;
  } else unavailableNotice = $[179];
  let hintRow;
  if (
    $[180] !== columns ||
    $[181] !== hint ||
    $[182] !== isActiveGroup ||
    $[183] !== nothing ||
    $[184] !== elapsedSuffix ||
    $[185] !== hasLingeringHint
  ) {
    hintRow =
      isActiveGroup &&
      nothing === null &&
      hint !== undefined &&
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default(Box, {
            width: 5,
            flexShrink: 0,
            children: jsxProd_default(Text, {
              "aria-hidden": true,
              dimColor: true,
              children: "  \u23BF  ",
            }),
          }),
          jsxProd_default(Box, {
            flexDirection: "column",
            flexGrow: 1,
            children: hasLingeringHint
              ? jsxProd_default(MarkdownText_2, {
                  dimColor: true,
                  italic: true,
                  children: truncateToLines(hint, columns - HINT_COLUMN_RESERVE, HINT_MAX_LINES),
                })
              : hint
                  .split(
                    `
`,
                  )
                  .map((line, i, arr) =>
                    jsxProd_default_2(
                      Text,
                      {
                        dimColor: true,
                        children: [line, i === arr.length - 1 && elapsedSuffix],
                      },
                      `hint-${i}`,
                    ),
                  ),
          }),
        ],
      });
    $[180] = columns;
    $[181] = hint;
    $[182] = isActiveGroup;
    $[183] = nothing;
    $[184] = elapsedSuffix;
    $[185] = hasLingeringHint;
    $[186] = hintRow;
  } else hintRow = $[186];
  let hooksNotice;
  if ($[187] !== textOnlyHooks || $[188] !== message) {
    hooksNotice =
      !textOnlyHooks &&
      message.hookTotalMs !== undefined &&
      message.hookTotalMs > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          jsxProd_default(Text, {
            "aria-hidden": true,
            children: "  \u23BF  ",
          }),
          "Ran ",
          message.hookCount,
          " PreToolUse",
          " ",
          message.hookCount === 1 ? "hook" : "hooks",
          " (",
          formatSecondsShort(message.hookTotalMs),
          ")",
        ],
      });
    $[187] = textOnlyHooks;
    $[188] = message;
    $[189] = hooksNotice;
  } else hooksNotice = $[189];
  let content;
  if (
    $[190] !== nothing ||
    $[191] !== marginTop ||
    $[192] !== headerRow ||
    $[193] !== interruptedNotice ||
    $[194] !== autoBlockedNotice ||
    $[195] !== deniedNotice ||
    $[196] !== unavailableNotice ||
    $[197] !== hintRow ||
    $[198] !== hooksNotice ||
    $[199] !== denialRef
  ) {
    content = jsxProd_default_2(Box, {
      ref: denialRef,
      flexDirection: "column",
      marginTop,
      children: [
        headerRow,
        interruptedNotice,
        autoBlockedNotice,
        deniedNotice,
        unavailableNotice,
        extraRows,
        nothing,
        hintRow,
        hooksNotice,
      ],
    });
    $[190] = nothing;
    $[191] = marginTop;
    $[192] = headerRow;
    $[193] = interruptedNotice;
    $[194] = autoBlockedNotice;
    $[195] = deniedNotice;
    $[196] = unavailableNotice;
    $[197] = hintRow;
    $[198] = hooksNotice;
    $[199] = denialRef;
    $[200] = content;
  } else content = $[200];
  return content;
}
export { CollapsedReadSearchContent, selectViewingAgentTaskId_2 };
