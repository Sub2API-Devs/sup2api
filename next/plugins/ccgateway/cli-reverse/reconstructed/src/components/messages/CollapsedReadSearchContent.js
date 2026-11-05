/**
 * components/messages/CollapsedReadSearchContent.tsx
 *
 * 折叠的读取/搜索类工具组："Read N files, searched M patterns"，verbose 下逐个展开。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/CollapsedReadSearchContent.tsx
 * pieces: chunk-wjygkcr4.js (11)
 * attribution: sole-consumer 1, placement 6, layout 2, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import { stripPrefix, firstLineOf, getFirstLine, capitalize, plural } from "../../utils/stringUtils.js";
import { getEffectiveCwd } from "../../utils/cwd.js";
import { logError } from "../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { renderToolUseMessageFor } from "./toolUseRenderers.js";
import {
  formatCollapsedLabel,
  findToolByNameWithFallback,
  toolName,
} from "../../utils/collapseReadSearch.js";
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
  isReplToolCallProgress,
  toolResultId,
  isHookToolResult,
  toolUseId,
  toolUseId_2,
  toolCallId,
  isErroredPhase,
  runningCallId,
  liveCallId,
  isErrorPhase,
  erroredCallId,
  renderHookDurationLine,
  commitSha,
  gitBranch,
} from "./toolResultRendering.js";
import { useFrameRegistry, parseRenderModeValue, useIsFullscreen } from "../../ink/renderModeContext.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { isEvalToolCallName, isEvalToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { remoteMachineRefForDisplay } from "../../utils/toolUseDisplay.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import {
  GroupedToolUseRow,
  toolCallOf_2,
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
import { POLL } from "../../tools/PollTool/prompt.js";
import { isCodeModeExperimentEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  UserToolErrorMessage,
  isAutoModeUnavailableKind,
  NotRunLine,
} from "./UserToolResultMessage/UserToolErrorMessage.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isValidPrUrl } from "../../tools/shared/gitOperationTracking.js";
import { isGitLabMergeRequestUrl } from "../../utils/detectRepository.js";
import { MEMORY } from "../../services/mcp/firstPartyServerIds.js";
import { inflectStatusText } from "../../utils/verbInflection.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { unwrapToolUseErrorText } from "../../utils/toolUseErrorText.js";
import { PRE_TOOL_HOOK_ERROR_PREFIX_RE } from "../../utils/hooks.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:159280-159323 sole-consumer
/**
 * CLAUDEAI_SERVER_PREFIX（实为判断）：名字是否以 "claude.ai " 开头。
 */
function stripAiPrefix(name) {
  return stripPrefix(name, "claude.ai ");
}
//@ chunk-wjygkcr4.js:159323-159411 placement (2.1.88 match: toolCallOf, 0.815)
function toolCallOf(m) {
  return m.type === "grouped_tool_use" ? m.results : m.type === "user" ? [m] : [];
}
//@ chunk-wjygkcr4.js:159411-159458 placement
function isToolResultBlock(block) {
  return block.type === "tool_result";
}
//@ chunk-wjygkcr4.js:159458-159501 placement (2.1.88 match: _temp2, 1)
function selectViewingAgentTaskId_2(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-wjygkcr4.js:159501-159513 placement
var memorySavesQuietApi = null;
//@ chunk-wjygkcr4.js:159513-159568 placement
var HINT_THROTTLE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STYLE_SEPARATOR;
var HINT_LINGER_MS;
var HINT_COLUMN_RESERVE;
var HINT_MAX_LINES;
var weakMap;
deferInit("chunk-wjygkcr4.js:159513", () => {
  HINT_THROTTLE_MS = 700;
  STYLE_SEPARATOR = "\x00";
  HINT_LINGER_MS = 3000;
  HINT_COLUMN_RESERVE = 5;
  HINT_MAX_LINES = 10;
  weakMap = new WeakMap();
});
//@ chunk-wjygkcr4.js:159568-159702 layout
function renderCollapsedPart(part, input, theme, activeAgents) {
  switch (part.kind) {
    case "hint":
      return part.text;
    case "keep":
      return;
    case "ownRow":
      return renderRunningCallHint(part.tool, input, theme, activeAgents);
    default:
      return part;
  }
}
//@ chunk-wjygkcr4.js:159702-160369 layout
function renderRunningCallHint(tool, input, theme, activeAgents) {
  let effectiveCwd = getEffectiveCwd();
  let cached = weakMap.get(input);
  if (
    cached?.tool === tool &&
    cached.theme === theme &&
    cached.cwd === effectiveCwd &&
    cached.activeAgents === activeAgents
  )
    return cached.hint;
  let logHintError = (error) =>
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Error rendering a running call's hint for ${tool.name}: ${error}`,
        "Error rendering a running call's hint",
      ),
    );
  let hint;
  let parsedInput;
  try {
    parsedInput = safeParseToolInput(tool, input);
    let parsedData = parsedInput.success ? parsedInput.data : undefined;
    let renderedHint = parsedData
      ? renderToolUseMessageFor(tool, parsedData, {
          theme,
          verbose: false,
          activeAgents,
        })
      : null;
    let hintSource =
      typeof renderedHint === "string"
        ? renderedHint
        : (parsedData && tool.getToolUseSummary?.(parsedData)) || "";
    let collapsedHint = formatCollapsedLabel(hintSource);
    let toolName = collapsedHint
      ? tool.userFacingName(parsedData, {
          activeAgents,
        })
      : "";
    hint = toolName && collapsedHint ? formatCollapsedLabel(`${toolName}(${collapsedHint})`) : undefined;
  } catch (error) {
    logHintError(error);
  }
  if (hint === undefined)
    try {
      hint =
        formatCollapsedLabel(
          tool.userFacingName(parsedInput?.success ? parsedInput.data : undefined, {
            activeAgents,
          }),
        ) || undefined;
    } catch (error) {
      logHintError(error);
    }
  weakMap.set(input, {
    tool,
    theme,
    cwd: effectiveCwd,
    activeAgents,
    hint,
  });
  return hint;
}
//@ chunk-wjygkcr4.js:160369-161712 placement
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
//@ chunk-wjygkcr4.js:161712-165574 fingerprint (2.1.88 match: VerboseToolUse, 0.475)
function VerboseToolUse(props) {
  let $ = useMemoCache(67);
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
    ge: {
      tool = findToolByNameWithFallback(tools, content.name) ?? displayOnlyMcpTool(content.name, bg);
      if (!tool) {
        earlyReturn = null;
        break ge;
      }
      if (tool.isTransparentWrapper?.()) {
        if (codeModeAccepted() && isEvalToolCallName(content.name)) {
          let { ScriptSourceRow } = require("./ScriptSourceRow.lazy.js");
          let resultMsg;
          if ($[26] !== content.id || $[27] !== lookups.toolResultByToolUseID) {
            resultMsg = lookups.toolResultByToolUseID.get(content.id);
            $[26] = content.id;
            $[27] = lookups.toolResultByToolUseID;
            $[28] = resultMsg;
          } else resultMsg = $[28];
          let resultMsgStable = resultMsg;
          const toolUseId = content.id;
          const input = content.input;
          const output = resultMsgStable?.type === "user" ? resultMsgStable.toolUseResult : undefined;
          let shouldAnimate_2;
          if ($[29] !== content.id || $[30] !== inProgressToolUseIDs || $[31] !== shouldAnimate) {
            shouldAnimate_2 = shouldAnimate && inProgressToolUseIDs.has(content.id);
            $[29] = content.id;
            $[30] = inProgressToolUseIDs;
            $[31] = shouldAnimate;
            $[32] = shouldAnimate_2;
          } else shouldAnimate_2 = $[32];
          let isResolved;
          if ($[33] !== content.id || $[34] !== lookups.resolvedToolUseIDs) {
            isResolved = lookups.resolvedToolUseIDs.has(content.id);
            $[33] = content.id;
            $[34] = lookups.resolvedToolUseIDs;
            $[35] = isResolved;
          } else isResolved = $[35];
          const isUnresolved = !isResolved;
          let isError;
          if ($[36] !== content.id || $[37] !== lookups.erroredToolUseIDs) {
            isError = lookups.erroredToolUseIDs.has(content.id);
            $[36] = content.id;
            $[37] = lookups.erroredToolUseIDs;
            $[38] = isError;
          } else isError = $[38];
          earlyReturn = jsxProd_default(ScriptSourceRow, {
            tool,
            toolUseId,
            input,
            toolLabel,
            output,
            shouldAnimate: shouldAnimate_2,
            isUnresolved,
            isError,
            addMargin: true,
          });
          break ge;
        }
        earlyReturn = null;
        break ge;
      }
      let justResolved;
      if ($[39] !== content.id || $[40] !== lookups.resolvedToolUseIDs) {
        justResolved = lookups.resolvedToolUseIDs.has(content.id);
        $[39] = content.id;
        $[40] = lookups.resolvedToolUseIDs;
        $[41] = justResolved;
      } else justResolved = $[41];
      isResolved = justResolved;
      let isErrored;
      if ($[42] !== content.id || $[43] !== lookups.erroredToolUseIDs) {
        isErrored = lookups.erroredToolUseIDs.has(content.id);
        $[42] = content.id;
        $[43] = lookups.erroredToolUseIDs;
        $[44] = isErrored;
      } else isErrored = $[44];
      let isErrored_2 = isErrored;
      isQuietlyErrored = isErrored_2 && quietWords === undefined;
      let isInProgress;
      if ($[45] !== content.id || $[46] !== inProgressToolUseIDs) {
        isInProgress = inProgressToolUseIDs.has(content.id);
        $[45] = content.id;
        $[46] = inProgressToolUseIDs;
        $[47] = isInProgress;
      } else isInProgress = $[47];
      let isInProgress_2 = isInProgress;
      resultMsg = lookups.toolResultByToolUseID.get(content.id);
      let output =
        outputOverride !== undefined
          ? outputOverride.value
          : resultMsg?.type === "user"
            ? resultMsg.toolUseResult
            : undefined;
      let renderModeValue = parseRenderModeValue(frameRegistry, tool.outputSchema, output);
      let parsedData = renderModeValue?.success ? renderModeValue.data : undefined;
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
      if ($[48] !== content.input) {
        parseFailure = describeUnparsedInput(content.input);
        $[48] = content.input;
        $[49] = parseFailure;
      } else parseFailure = $[49];
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
        break ge;
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
    $[50] !== content.id ||
    $[51] !== content.input ||
    $[52] !== isQuietlyErrored ||
    $[53] !== isResolved ||
    $[54] !== progressMessages ||
    $[55] !== resultMsg ||
    $[56] !== tool ||
    $[57] !== tools
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
    $[50] = content.id;
    $[51] = content.input;
    $[52] = isQuietlyErrored;
    $[53] = isResolved;
    $[54] = progressMessages;
    $[55] = resultMsg;
    $[56] = tool;
    $[57] = tools;
    $[58] = errorRow;
  } else errorRow = $[58];
  let boxContent;
  if (
    $[59] !== BoxComponent ||
    $[60] !== key ||
    $[61] !== flexDirection ||
    $[62] !== marginTop ||
    $[63] !== headerRow ||
    $[64] !== outputBox ||
    $[65] !== errorRow
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
    $[59] = BoxComponent;
    $[60] = key;
    $[61] = flexDirection;
    $[62] = marginTop;
    $[63] = headerRow;
    $[64] = outputBox;
    $[65] = errorRow;
    $[66] = boxContent;
  } else boxContent = $[66];
  return boxContent;
}
//@ chunk-wjygkcr4.js:169627-192477 fingerprint (2.1.88 match: CollapsedReadSearchContent, 0.554)
/**
 * 折叠读/搜索组：统计 Read/Grep/Glob 等调用次数显示一行摘要（进行中显示当前目标），verbose 或 transcript 下逐个渲染 VerboseToolUse；含权限规则命中/本地错误等标记。
 */
function CollapsedReadSearchContent(props) {
  let $ = useMemoCache(191);
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
  let replResultIds =
    isActiveGroup === true && !isBriefOnly
      ? toolCallOf_2(message)
          .filter(
            (call) =>
              (codeModeAccepted()
                ? isEvalToolName(call.name) ||
                  (call.name === POLL &&
                    inProgressToolUseIDs.has(call.id) &&
                    (lookups.progressMessagesByToolUseID.get(call.id) ?? []).some(isReplToolCallProgress))
                : isEvalToolName(call.name)) && !lookups.toolResultByToolUseID.has(call.id),
          )
          .map(toolResultId)
      : [];
  let needsLoading =
    replResultIds.length > 0 ||
    (isActiveGroup === true &&
      !isBriefOnly &&
      toolCallOf_2(message).some(
        (replResultId) => isEvalToolName(replResultId.name) && inProgressToolUseIDs.has(replResultId.id),
      ));
  let getToolResultOf;
  if ($[17] !== lookups.toolResultByToolUseID) {
    getToolResultOf = (toolUseId) => {
      let resultMsg = lookups.toolResultByToolUseID.get(toolUseId);
      return resultMsg?.type === "user" ? resultMsg.toolUseResult : undefined;
    };
    $[17] = lookups.toolResultByToolUseID;
    $[18] = getToolResultOf;
  } else getToolResultOf = $[18];
  let getToolResult = getToolResultOf;
  const maxReadCountRef = toolCallOf_2(message);
  let isReplCallWithoutResult;
  if ($[19] !== getToolResult) {
    isReplCallWithoutResult = (call) =>
      isEvalToolName(call.name) &&
      !(
        codeModeAccepted() &&
        require("../../utils/codeMode/scriptErrors.js").isErrorRowCopy(getToolResult(call.id))
      );
    $[19] = getToolResult;
    $[20] = isReplCallWithoutResult;
  } else isReplCallWithoutResult = $[20];
  let filtered = maxReadCountRef.filter(isReplCallWithoutResult);
  let replTool = filtered.length > 0 ? findToolByName(tools, REPL_TOOL_NAME) : undefined;
  let renderErrorMessage = replTool && mcpRenderOverrideFor(replTool, "renderToolUseErrorMessage");
  let hookToolCalls =
    codeModeAccepted() && isCodeModeExperimentEnabled() ? toolCallOf_2(message).filter(isHookToolResult) : [];
  let tool = hookToolCalls.length > 0 ? findToolByName(tools, POLL) : undefined;
  let hasInterruptedHookCall =
    codeModeAccepted() &&
    hookToolCalls.some((hookCall) =>
      VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(hookCall.id)),
    );
  let summarizedIds = new Set(
    codeModeAccepted()
      ? filtered
          .filter((call) => {
            let resultMsg = lookups.toolResultByToolUseID.get(call.id);
            return (
              resultMsg?.type === "user" &&
              require("../../tools/REPLTool/stopReport.js").drawsInterruptedRow(
                REPL_TOOL_NAME,
                resultMsg.toolUseResult,
              )
            );
          })
          .map(toolUseId)
      : [],
  );
  let hasSummary = renderErrorMessage !== undefined && summarizedIds.size > 0;
  let hookCallIds = new Set(hookToolCalls.map(toolUseId_2));
  let endedToolIds = new Set(filtered.map(toolCallId));
  let shouldShowInterrupted =
    codeModeAccepted() &&
    (message.stopShownAfter === true ||
      ((verbose || hasMemoryOps || hasTeamMemOps_2 || hasAnyOutput || needsLoading) &&
        toolUseIds.some(
          (toolUseId) =>
            !hookCallIds.has(toolUseId) &&
            !endedToolIds.has(toolUseId) &&
            VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(toolUseId)),
        )));
  let isInterruptedAny = hasInterruptedHookCall && !hasSummary && !shouldShowInterrupted;
  let endedCalls = shouldShowInterrupted ? filtered.filter((call) => !summarizedIds.has(call.id)) : filtered;
  let hasInterruptedCall =
    toolUseIds.some(
      (toolUseId) =>
        !hookCallIds.has(toolUseId) &&
        VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(toolUseId)),
    ) || isInterruptedAny;
  let renderErroredCall;
  if (
    $[21] !== lookups.erroredToolUseIDs ||
    $[22] !== lookups.toolResultByToolUseID ||
    $[23] !== tool ||
    $[24] !== tools
  ) {
    renderErroredCall = function renderErroredCallImpl(call, isVerbose) {
      let resultMsg = lookups.toolResultByToolUseID.get(call.id);
      if (
        resultMsg?.type !== "user" ||
        !lookups.erroredToolUseIDs.has(call.id) ||
        VALIDATE_TREE_NAMESPACE.isInterruptedCall(resultMsg)
      ) {
        return null;
      }
      let found = resultMsg.message.content.find(
        (block) => block.type === "tool_result" && block.tool_use_id === call.id,
      );
      if (found?.type !== "tool_result") {
        return null;
      }
      return jsxProd_default(UserToolErrorMessage, {
        param: found,
        tool,
        tools,
        input: call.input,
        output: resultMsg.toolUseResult,
        toolDenialKind: resultMsg.toolDenialKind,
        remoteToolDenialKind: resultMsg.remoteToolDenialKind,
        toolDenialMonitorBlocked: resultMsg.toolDenialMonitorBlocked,
        verbose: isVerbose,
        progressMessagesForMessage: [],
        isTranscriptMode: isVerbose,
      });
    };
    $[21] = lookups.erroredToolUseIDs;
    $[22] = lookups.toolResultByToolUseID;
    $[23] = tool;
    $[24] = tools;
    $[25] = renderErroredCall;
  } else renderErroredCall = $[25];
  let renderErroredCallStable = renderErroredCall;
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
    if ($[26] !== searchArgs) {
      lastSearchArg = searchArgs?.at(-1);
      $[26] = searchArgs;
      $[27] = lastSearchArg;
    } else lastSearchArg = $[27];
    let searchArg = lastSearchArg;
    let quotedSearchArg = searchArg !== undefined ? `"${searchArg}"` : undefined;
    let displayHint;
    if ($[28] !== quotedSearchArg || $[29] !== readFilePaths) {
      let lastRead = readFilePaths?.at(-1);
      displayHint = lastRead !== undefined ? getDisplayPath(lastRead) : quotedSearchArg;
      $[28] = quotedSearchArg;
      $[29] = readFilePaths;
      $[30] = displayHint;
    } else displayHint = $[30];
    latestDisplayHint = displayHint;
  }
  let activeAgentsForRepl = useAppStateSlice((appState) =>
    codeModeAccepted() && isActiveGroup && replResultIds.length > 0
      ? appState.agentDefinitions.activeAgents
      : undefined,
  );
  let [denialRef, hasAutoDenial] = useFrozenValue(useHasAutoModeDenialFor(toolUseIds));
  let viewingAgentTaskSelector;
  if ($[31] !== isActiveGroup) {
    viewingAgentTaskSelector = (appState) =>
      codeModeAccepted() && isActiveGroup && Boolean(appState.viewingAgentTaskId);
    $[31] = isActiveGroup;
    $[32] = viewingAgentTaskSelector;
  } else viewingAgentTaskSelector = $[32];
  let appStateSlice_2 = useAppStateSlice(viewingAgentTaskSelector);
  let hasLiveError = false;
  let hintCall;
  let hintText;
  if (isActiveGroup) {
    for (const id_0 of toolUseIds) {
      if (!inProgressToolUseIDs.has(id_0)) {
        continue;
      }
      let progressMessages = lookups.progressMessagesByToolUseID.get(id_0) ?? [];
      let latest = progressMessages.at(-1)?.data;
      let liveCalls = [];
      if (codeModeAccepted() && replResultIds.includes(id_0)) {
        let { liveCallsOf } = require("../../utils/codeMode/toolCallTicks.js");
        liveCalls = liveCallsOf(progressMessages);
        if (liveCalls.some(isErroredPhase)) hasLiveError = true;
      }
      if (codeModeAccepted() && liveCalls.length > 0) {
        for (let idx = liveCalls.length - 1; idx >= 0; idx--) {
          let liveCall = liveCalls[idx];
          let displayHintText = renderCollapsedPart(
            toolName(liveCall.name, liveCall.input, tools),
            liveCall.input,
            theme,
            activeAgentsForRepl,
          );
          if (displayHintText !== undefined) {
            latestDisplayHint = displayHintText;
            hintCall = liveCall;
            hintText = displayHintText;
            break;
          }
        }
      } else if (latest?.type === "mcp_progress") {
        let { progress, total, progressMessage } = latest;
        let progressText = cleanTaskDescription(progressMessage);
        if (progress !== undefined && total !== undefined && total > 0) {
          let rounded = Math.round(Math.min(1, Math.max(0, progress / total)) * 100);
          latestDisplayHint = progressText ? `${progressText} (${rounded}%)` : `${rounded}%`;
        } else if (progressText) latestDisplayHint = progressText;
        else if (progress !== undefined) latestDisplayHint = `Processing\u2026 ${progress}`;
      }
    }
  }
  let statusLine;
  if (
    codeModeAccepted() &&
    isCodeModeExperimentEnabled() &&
    bg &&
    !appStateSlice_2 &&
    hintCall !== undefined &&
    latestDisplayHint === hintText
  ) {
    let { disabledClassifierSurfaces } = require("../../services/classifierSummary.js");
    if (!disabledClassifierSurfaces().has("repl")) {
      let { activityLineOf } = require("../../utils/codeMode/toolCallTicks.js");
      let { toolUseStatusLine } = require("../../services/agentStatus/jobState.js");
      let pendingHintCall = hintCall;
      statusLine =
        toolUseStatusLine(pendingHintCall.input, () =>
          activityLineOf(findToolByNameWithFallback(tools, pendingHintCall.name), pendingHintCall.input),
        ) || undefined;
    }
  }
  let hintWithStyle;
  if ($[33] !== statusLine || $[34] !== latestDisplayHint) {
    hintWithStyle =
      codeModeAccepted() && statusLine !== undefined
        ? `${STYLE_SEPARATOR}${latestDisplayHint ?? ""}${STYLE_SEPARATOR}${statusLine}`
        : latestDisplayHint;
    $[33] = statusLine;
    $[34] = latestDisplayHint;
    $[35] = hintWithStyle;
  } else hintWithStyle = $[35];
  let throttledValue = useThrottledValue(hintWithStyle, HINT_THROTTLE_MS);
  let hintLine = throttledValue;
  let styleCache;
  if (
    codeModeAccepted() &&
    throttledValue?.startsWith(STYLE_SEPARATOR) &&
    throttledValue.includes(STYLE_SEPARATOR, STYLE_SEPARATOR.length)
  ) {
    if ($[36] !== throttledValue) {
      let sliced = throttledValue.slice(STYLE_SEPARATOR.length);
      hintLine = firstLineOf(sliced, STYLE_SEPARATOR) || undefined;
      styleCache = sliced.slice(sliced.indexOf(STYLE_SEPARATOR) + STYLE_SEPARATOR.length);
      $[36] = throttledValue;
      $[37] = hintLine;
      $[38] = styleCache;
    } else {
      hintLine = $[37];
      styleCache = $[38];
    }
  }
  let isLiveTurn = isActiveGroup && message.isLiveBriefTurn === true;
  let displayedHint = useLingeringValue(
    isActiveGroup && !isLiveTurn ? message.latestThinkingSummary : undefined,
    HINT_LINGER_MS,
  );
  let hasLingeringHint = isActiveGroup && displayedHint !== undefined;
  let hint = hasLingeringHint ? displayedHint : hintLine;
  let timestamp = Date.parse(message.timestamp);
  let taskSummarySelector;
  if ($[39] !== timestamp || $[40] !== isActiveGroup) {
    taskSummarySelector = (appState) =>
      isActiveGroup &&
      !appState.viewingAgentTaskId &&
      appState.taskSummary !== null &&
      !(appState.taskSummary.at < timestamp)
        ? appState.taskSummary.text
        : null;
    $[39] = timestamp;
    $[40] = isActiveGroup;
    $[41] = taskSummarySelector;
  } else taskSummarySelector = $[41];
  let appStateSlice_3 = useAppStateSlice(taskSummarySelector);
  if (verbose) {
    let assistantMessages = [];
    for (const msg of groupMessages) {
      if (msg.type === "assistant") assistantMessages.push(msg);
      else if (msg.type === "grouped_tool_use") assistantMessages.push(...msg.messages);
    }
    let liveCallsFromHistory = [];
    let runningCallIds = new Set();
    if (codeModeAccepted()) {
      let { isRunningPhase, liveCallsOf } = require("../../utils/codeMode/toolCallTicks.js");
      liveCallsFromHistory = liveCallsOf(
        replResultIds.flatMap((msg_0) => lookups.progressMessagesByToolUseID.get(msg_0) ?? []),
      );
      runningCallIds = new Set(
        liveCallsFromHistory.filter((liveCall) => isRunningPhase(liveCall.phase)).map(runningCallId),
      );
    }
    let lookups_2 =
      !codeModeAccepted() || liveCallsFromHistory.length === 0
        ? lookups
        : {
            ...lookups,
            resolvedToolUseIDs: new Set(
              liveCallsFromHistory.filter((liveCall) => !runningCallIds.has(liveCall.id)).map(liveCallId),
            ),
            erroredToolUseIDs: new Set(liveCallsFromHistory.filter(isErrorPhase).map(erroredCallId)),
          };
    let isErroredAssistant;
    if ($[42] !== lookups) {
      isErroredAssistant = (message) =>
        lookups.erroredToolUseIDs.has(message.id) &&
        lookups.toolResultByToolUseID.get(message.id)?.type === "user";
      $[42] = lookups;
      $[43] = isErroredAssistant;
    } else isErroredAssistant = $[43];
    let filtered = endedCalls.filter(isErroredAssistant);
    let thinkingRows;
    if ($[44] !== groupMessages || $[45] !== verbose) {
      let renderGroupedMessage;
      if ($[47] !== verbose) {
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
        $[47] = verbose;
        $[48] = renderGroupedMessage;
      } else renderGroupedMessage = $[48];
      thinkingRows = groupMessages.map(renderGroupedMessage);
      $[44] = groupMessages;
      $[45] = verbose;
      $[46] = thinkingRows;
    } else thinkingRows = $[46];
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
    const verboseLiveCallRows =
      codeModeAccepted() &&
      liveCallsFromHistory.map((liveCall) =>
        jsxProd_default(
          VerboseToolUse,
          {
            content: {
              type: "tool_use",
              id: liveCall.id,
              name: liveCall.name,
              input: liveCall.input,
            },
            tools,
            lookups: lookups_2,
            inProgressToolUseIDs: runningCallIds,
            shouldAnimate,
            theme,
          },
          liveCall.id,
        ),
      );
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
    const standaloneInterruptedRow =
      codeModeAccepted() &&
      isInterruptedAny &&
      !filtered.some((call) =>
        VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(call.id)),
      ) &&
      jsxProd_default(RejectedToolUseMessage, {});
    const hookErrorRows =
      codeModeAccepted() &&
      hookToolCalls.map((hookCall) => {
        let errorRow = renderErroredCallStable(hookCall, true);
        return errorRow === null
          ? null
          : jsxProd_default(
              Box,
              {
                children: errorRow,
              },
              `ended-${hookCall.id}`,
            );
      });
    let hooksRow;
    if ($[49] !== message.hookCount || $[50] !== message.hookInfos || $[51] !== message.hookTotalMs) {
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
      $[49] = message.hookCount;
      $[50] = message.hookInfos;
      $[51] = message.hookTotalMs;
      $[52] = hooksRow;
    } else hooksRow = $[52];
    let memoriesRow;
    if ($[53] !== localMemoryPrefix || $[54] !== message.relevantMemories) {
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
      $[53] = localMemoryPrefix;
      $[54] = message.relevantMemories;
      $[55] = memoriesRow;
    } else memoriesRow = $[55];
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        thinkingRows,
        mapped,
        verboseLiveCallRows,
        mapped_2,
        standaloneInterruptedRow,
        hookErrorRows,
        hooksRow,
        memoriesRow,
        false,
      ],
    });
  }
  let lastCall = codeModeAccepted() ? filtered.at(-1) : undefined;
  let nothing =
    lastCall !== undefined && endedCalls.includes(lastCall) ? renderResult(lastCall.id, false) : null;
  let isInterrupted;
  if ($[56] !== lookups) {
    isInterrupted = (call) =>
      VALIDATE_TREE_NAMESPACE.isInterruptedCall(lookups.toolResultByToolUseID.get(call.id));
    $[56] = lookups;
    $[57] = isInterrupted;
  } else isInterrupted = $[57];
  let any = filtered.some(isInterrupted);
  let extraRows = codeModeAccepted()
    ? hookToolCalls.flatMap((hookCall) => {
        let hookErrorRow = renderErroredCallStable(hookCall, false);
        return hookErrorRow === null
          ? []
          : [
              jsxProd_default(
                Box,
                {
                  children: hookErrorRow,
                },
                `error-${hookCall.id}`,
              ),
            ];
      })
    : [];
  if (!hasMemoryOps && !hasTeamMemOps_2 && !hasAnyOutput && !needsLoading) {
    let isInterrupted2 = any || isInterruptedAny;
    if (!isInterrupted2 && nothing === null && extraRows.length === 0) {
      return null;
    }
    let interruptedRow;
    if ($[58] !== isInterrupted2) {
      interruptedRow = isInterrupted2 && jsxProd_default(RejectedToolUseMessage, {});
      $[58] = isInterrupted2;
      $[59] = interruptedRow;
    } else interruptedRow = $[59];
    let simpleColumn;
    if ($[60] !== nothing || $[61] !== extraRows || $[62] !== interruptedRow) {
      simpleColumn = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [interruptedRow, extraRows, nothing],
      });
      $[60] = nothing;
      $[61] = extraRows;
      $[62] = interruptedRow;
      $[63] = simpleColumn;
    } else simpleColumn = $[63];
    return simpleColumn;
  }
  let elapsedSuffix = "";
  if (bg && isActiveGroup) {
    let maxElapsedSeconds;
    let lastTotalLines = 0;
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
    if (codeModeAccepted()) {
      let { liveCallsOf } = require("../../utils/codeMode/toolCallTicks.js");
      let progressMessagesOf;
      if ($[64] !== lookups) {
        progressMessagesOf = (toolUseId) => lookups.progressMessagesByToolUseID.get(toolUseId) ?? [];
        $[64] = lookups;
        $[65] = progressMessagesOf;
      } else progressMessagesOf = $[65];
      let time = liveCallsOf(replResultIds.flatMap(progressMessagesOf));
      for (const { shellProgress } of time) {
        if (
          shellProgress !== undefined &&
          (maxElapsedSeconds === undefined || shellProgress.elapsedTimeSeconds > maxElapsedSeconds)
        ) {
          maxElapsedSeconds = shellProgress.elapsedTimeSeconds;
          lastTotalLines = shellProgress.totalLines;
        }
      }
    }
    if (maxElapsedSeconds !== undefined && maxElapsedSeconds >= 2) {
      const elapsedMs = maxElapsedSeconds * 1000;
      let elapsedText;
      if ($[66] !== elapsedMs) {
        elapsedText = formatDuration(elapsedMs);
        $[66] = elapsedMs;
        $[67] = elapsedText;
      } else elapsedText = $[67];
      let elapsedTextStable = elapsedText;
      elapsedSuffix =
        lastTotalLines > 0
          ? ` (${elapsedTextStable} \xB7 ${lastTotalLines} ${lastTotalLines === 1 ? "line" : "lines"})`
          : ` (${elapsedTextStable})`;
    }
  }
  let lastToolStartMs = 0;
  if (isActiveGroup && bg) {
    if ($[68] !== groupMessages || $[69] !== inProgressToolUseIDs) {
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
      $[68] = groupMessages;
      $[69] = inProgressToolUseIDs;
      $[70] = lastToolStartMs;
    } else lastToolStartMs = $[70];
    if (codeModeAccepted()) {
      let { hintCallOf } = require("../../utils/codeMode/toolCallTicks.js");
      let scriptStartedAt;
      for (const replResultId of replResultIds) {
        let hintCall = hintCallOf(lookups.progressMessagesByToolUseID.get(replResultId) ?? []);
        if (hintCall !== undefined) scriptStartedAt = hintCall.scriptStartedAt;
      }
      if (scriptStartedAt !== undefined && (lastToolStartMs === 0 || scriptStartedAt < lastToolStartMs))
        lastToolStartMs = scriptStartedAt;
    }
  }
  let elapsedAnchorMs;
  let taskSummaryText;
  let textOnlyHooks;
  let parts;
  if (
    $[71] !== agentCount ||
    $[72] !== bashCount ||
    $[73] !== styleCache ||
    $[74] !== editFileCount ||
    $[75] !== frameCount ||
    $[76] !== bg ||
    $[77] !== groupMessages ||
    $[78] !== needsLoading ||
    $[79] !== hasTeamMemOps_2 ||
    $[80] !== hasThought ||
    $[81] !== lastToolStartMs ||
    $[82] !== isActiveGroup ||
    $[83] !== isLiveTurn ||
    $[84] !== added ||
    $[85] !== removed ||
    $[86] !== list_3 ||
    $[87] !== appStateSlice_3 ||
    $[88] !== localMemoryPrefix ||
    $[89] !== mcpTotal ||
    $[90] !== memoryReadCount ||
    $[91] !== memorySearchCount ||
    $[92] !== memoryWriteCount ||
    $[93] !== message ||
    $[94] !== otherToolCount ||
    $[95] !== read_3 ||
    $[96] !== quietCallCount ||
    $[97] !== added_2 ||
    $[98] !== removed_2 ||
    $[99] !== scratchpadWriteCount ||
    $[100] !== search_3 ||
    $[101] !== thoughtForMs
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
        if ($[106] !== groupMessages) {
          for (let idx = groupMessages.length - 1; idx >= 0; idx--) {
            let groupMessage = groupMessages[idx];
            if (groupMessage?.type === "assistant" && groupMessage.message.content[0]?.type === "thinking") {
              let timestamp = Date.parse(groupMessage.timestamp);
              if (Number.isFinite(timestamp)) lastThinkingAtMs = timestamp;
              break;
            }
          }
          $[106] = groupMessages;
          $[107] = lastThinkingAtMs;
        } else lastThinkingAtMs = $[107];
        let thinkingElapsed;
        if ($[108] !== lastThinkingAtMs || $[109] !== thoughtForMs) {
          thinkingElapsed = jsxProd_default(ThinkingElapsed, {
            baseMs: thoughtForMs,
            lastThinkingAtMs,
          });
          $[108] = lastThinkingAtMs;
          $[109] = thoughtForMs;
          $[110] = thinkingElapsed;
        } else thinkingElapsed = $[110];
        thoughtDuration = thinkingElapsed;
      } else {
        const max = Math.max(1000, thoughtForMs);
        let children;
        if ($[111] !== max) {
          children = formatDuration(max);
          $[111] = max;
          $[112] = children;
        } else children = $[112];
        let durationText;
        if ($[113] !== children) {
          durationText = jsxProd_default(Text, {
            bold: true,
            children,
          });
          $[113] = children;
          $[114] = durationText;
        } else durationText = $[114];
        thoughtDuration = durationText;
      }
      let thoughtPart;
      if ($[115] !== thoughtDuration || $[116] !== thoughtVerb) {
        thoughtPart = jsxProd_default_2(
          Text,
          {
            children: [thoughtVerb, " for ", thoughtDuration],
          },
          "thought",
        );
        $[115] = thoughtDuration;
        $[116] = thoughtVerb;
        $[117] = thoughtPart;
      } else thoughtPart = $[117];
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
      let branches = normalizeCaseForComparison_2(message.pushes.map(gitBranch));
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
        (quietCallCount > 0 ? normalizeCaseForComparison_2([...mcpCallLabels, MEMORY]) : mcpCallLabels)
          .map(stripAiPrefix)
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
          if ($[118] === MEMO_CACHE_SENTINEL) {
            commaAgent = jsxProd_default(
              Text,
              {
                children: ", ",
              },
              "comma-agent",
            );
            $[118] = commaAgent;
          } else commaAgent = $[118];
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
        if ($[119] !== children) {
          agentPart = jsxProd_default(
            Text,
            {
              children,
            },
            "agent",
          );
          $[119] = children;
          $[120] = agentPart;
        } else agentPart = $[120];
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
    let summaryOverride = !appStateSlice_3 && isWorking ? styleCache : undefined;
    taskSummaryText = appStateSlice_3 || summaryOverride;
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
    $[71] = agentCount;
    $[72] = bashCount;
    $[73] = styleCache;
    $[74] = editFileCount;
    $[75] = frameCount;
    $[76] = bg;
    $[77] = groupMessages;
    $[78] = needsLoading;
    $[79] = hasTeamMemOps_2;
    $[80] = hasThought;
    $[81] = lastToolStartMs;
    $[82] = isActiveGroup;
    $[83] = isLiveTurn;
    $[84] = added;
    $[85] = removed;
    $[86] = list_3;
    $[87] = appStateSlice_3;
    $[88] = localMemoryPrefix;
    $[89] = mcpTotal;
    $[90] = memoryReadCount;
    $[91] = memorySearchCount;
    $[92] = memoryWriteCount;
    $[93] = message;
    $[94] = otherToolCount;
    $[95] = read_3;
    $[96] = quietCallCount;
    $[97] = added_2;
    $[98] = removed_2;
    $[99] = scratchpadWriteCount;
    $[100] = search_3;
    $[101] = thoughtForMs;
    $[102] = elapsedAnchorMs;
    $[103] = taskSummaryText;
    $[104] = textOnlyHooks;
    $[105] = parts;
  } else {
    elapsedAnchorMs = $[102];
    taskSummaryText = $[103];
    textOnlyHooks = $[104];
    parts = $[105];
  }
  let autoModeBlockedCount = 0;
  let monitorBlockedCount = 0;
  let unavailableCount = 0;
  let permissionDeniedCount = 0;
  let autoModeBlockedContent;
  let permissionDeniedContent;
  let flattened = message.messages.flatMap(toolCallOf);
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
      !hookCallIds.has(found.tool_use_id)
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
  if ($[121] !== anyError || $[122] !== isActiveGroup || $[123] !== hasLiveError) {
    leadingIcon = isActiveGroup
      ? jsxProd_default(ToolUseLoader, {
          shouldAnimate: true,
          isUnresolved: true,
          isError: anyError || hasLiveError,
        })
      : jsxProd_default(Box, {
          minWidth: 2,
        });
    $[121] = anyError;
    $[122] = isActiveGroup;
    $[123] = hasLiveError;
    $[124] = leadingIcon;
  } else leadingIcon = $[124];
  const dimColor = !isActiveGroup;
  let summaryRow;
  if ($[125] !== taskSummaryText || $[126] !== parts) {
    summaryRow = taskSummaryText
      ? jsxProd_default(
          Text,
          {
            children: capitalize(taskSummaryText),
          },
          "task-summary",
        )
      : parts;
    $[125] = taskSummaryText;
    $[126] = parts;
    $[127] = summaryRow;
  } else summaryRow = $[127];
  let teamMemParts;
  if ($[128] !== taskSummaryText || $[129] !== isActiveGroup || $[130] !== message || $[131] !== parts) {
    teamMemParts =
      !taskSummaryText &&
      TeamMemCountParts({
        message,
        isActiveGroup,
        hasPrecedingParts: parts.length > 0,
      });
    $[128] = taskSummaryText;
    $[129] = isActiveGroup;
    $[130] = message;
    $[131] = parts;
    $[132] = teamMemParts;
  } else teamMemParts = $[132];
  let elapsedRow;
  if ($[133] !== elapsedAnchorMs || $[134] !== isLiveTurn || $[135] !== shouldAnimate) {
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
    $[133] = elapsedAnchorMs;
    $[134] = isLiveTurn;
    $[135] = shouldAnimate;
    $[136] = elapsedRow;
  } else elapsedRow = $[136];
  let ellipsisRow;
  if ($[137] !== taskSummaryText || $[138] !== isActiveGroup) {
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
    $[137] = taskSummaryText;
    $[138] = isActiveGroup;
    $[139] = ellipsisRow;
  } else ellipsisRow = $[139];
  let expandHint;
  if ($[140] === MEMO_CACHE_SENTINEL) {
    expandHint = jsxProd_default(CtrlOToExpand, {});
    $[140] = expandHint;
  } else expandHint = $[140];
  let partsRow;
  if (
    $[141] !== dimColor ||
    $[142] !== summaryRow ||
    $[143] !== teamMemParts ||
    $[144] !== elapsedRow ||
    $[145] !== ellipsisRow
  ) {
    partsRow = jsxProd_default_2(Text, {
      dimColor,
      children: [summaryRow, teamMemParts, elapsedRow, ellipsisRow, " ", expandHint],
    });
    $[141] = dimColor;
    $[142] = summaryRow;
    $[143] = teamMemParts;
    $[144] = elapsedRow;
    $[145] = ellipsisRow;
    $[146] = partsRow;
  } else partsRow = $[146];
  let headerRow;
  if ($[147] !== leadingIcon || $[148] !== partsRow) {
    headerRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [leadingIcon, partsRow],
    });
    $[147] = leadingIcon;
    $[148] = partsRow;
    $[149] = headerRow;
  } else headerRow = $[149];
  let interruptedNotice;
  if ($[150] !== hasInterruptedCall) {
    interruptedNotice = hasInterruptedCall && jsxProd_default(RejectedToolUseMessage, {});
    $[150] = hasInterruptedCall;
    $[151] = interruptedNotice;
  } else interruptedNotice = $[151];
  let autoBlockedNotice;
  if (
    $[152] !== autoModeReason ||
    $[153] !== autoModeBlockedCount ||
    $[154] !== monitorBlockedCount ||
    $[155] !== blockedCount ||
    $[156] !== hasAutoDenial ||
    $[157] !== isLiveTurn ||
    $[158] !== toolUseIds
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
    $[152] = autoModeReason;
    $[153] = autoModeBlockedCount;
    $[154] = monitorBlockedCount;
    $[155] = blockedCount;
    $[156] = hasAutoDenial;
    $[157] = isLiveTurn;
    $[158] = toolUseIds;
    $[159] = autoBlockedNotice;
  } else autoBlockedNotice = $[159];
  let deniedNotice;
  if (
    $[160] !== isLiveTurn ||
    $[161] !== permissionReason ||
    $[162] !== permissionDeniedCount ||
    $[163] !== toolUseIds
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
    $[160] = isLiveTurn;
    $[161] = permissionReason;
    $[162] = permissionDeniedCount;
    $[163] = toolUseIds;
    $[164] = deniedNotice;
  } else deniedNotice = $[164];
  let unavailableNotice;
  if ($[165] !== unavailableCount || $[166] !== isLiveTurn || $[167] !== toolUseIds) {
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
    $[165] = unavailableCount;
    $[166] = isLiveTurn;
    $[167] = toolUseIds;
    $[168] = unavailableNotice;
  } else unavailableNotice = $[168];
  let hintRow;
  if (
    $[169] !== columns ||
    $[170] !== hint ||
    $[171] !== isActiveGroup ||
    $[172] !== nothing ||
    $[173] !== elapsedSuffix ||
    $[174] !== hasLingeringHint
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
    $[169] = columns;
    $[170] = hint;
    $[171] = isActiveGroup;
    $[172] = nothing;
    $[173] = elapsedSuffix;
    $[174] = hasLingeringHint;
    $[175] = hintRow;
  } else hintRow = $[175];
  let hooksNotice;
  if ($[176] !== textOnlyHooks || $[177] !== message) {
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
    $[176] = textOnlyHooks;
    $[177] = message;
    $[178] = hooksNotice;
  } else hooksNotice = $[178];
  let content;
  if (
    $[179] !== nothing ||
    $[180] !== extraRows ||
    $[181] !== marginTop ||
    $[182] !== headerRow ||
    $[183] !== interruptedNotice ||
    $[184] !== autoBlockedNotice ||
    $[185] !== deniedNotice ||
    $[186] !== unavailableNotice ||
    $[187] !== hintRow ||
    $[188] !== hooksNotice ||
    $[189] !== denialRef
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
    $[179] = nothing;
    $[180] = extraRows;
    $[181] = marginTop;
    $[182] = headerRow;
    $[183] = interruptedNotice;
    $[184] = autoBlockedNotice;
    $[185] = deniedNotice;
    $[186] = unavailableNotice;
    $[187] = hintRow;
    $[188] = hooksNotice;
    $[189] = denialRef;
    $[190] = content;
  } else content = $[190];
  return content;
}
export { CollapsedReadSearchContent, selectViewingAgentTaskId_2 };
