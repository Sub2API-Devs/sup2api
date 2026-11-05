/**
 * components/messages/AssistantToolUseMessage.tsx
 *
 * 助手工具调用：工具名 + renderToolUseMessage 参数摘要 + 状态圆点，排队/进度/等待权限状态；MCP 工具显示服务器名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantToolUseMessage.tsx
 * pieces: chunk-czq1j3j2.js (1), chunk-wjygkcr4.js (12)
 * attribution: fingerprint 5, placement 3, affinity 1, callgraph-fingerprint 1, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useAppStateSlice, appStoreContext } from "../../state/AppState.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { VALIDATE_TREE_NAMESPACE } from "../../plugins/functionHooks/ui/index.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useHost, useSessionOrUndefined } from "../../context/session.js";
import { useContext, useEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { staticRenderStorageSlot } from "../../utils/staticRender.js";
import { detachedCallSlots } from "../../services/tools/detachedToolCalls.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  findToolByName,
  getAllBaseToolsFromRegistry,
  safeParseToolInput,
  filterToolProgressMessages,
} from "../../Tool.js";
import {
  STRUCTUREDOUTPUT,
  structuredOutputText,
} from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import { isEvalToolName, isEvalToolCallName } from "../../tools/REPLTool/constants.js";
import { RETIRED_TOOL_NAMES } from "../../tools/retiredTools.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { remoteMachineRefForDisplay } from "../../utils/toolUseDisplay.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { ThinkingMessage } from "./SystemTextMessage.js";
import { Box, Text } from "../../ink/components/Text.js";
import { getTeammateAuthor } from "../../services/tips/teamArtifactTips.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { ToolUseLoader } from "../ToolUseLoader.js";
import { TagTabs } from "../TagTabs.js";
import { diffDialogSlot } from "../../hooks/useWorkspaceDiff.js";
import { MessageResponse } from "../MessageResponse.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { FallbackToolUseErrorMessage } from "../FallbackToolUseErrorMessage.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { renderToolUseMessageFor } from "./toolUseRenderers.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { HookProgressMessage } from "./HookProgressMessage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:64798-64825 placement
function useClassifierChecking(host) {
  return null;
}
//@ chunk-wjygkcr4.js:64825-64898 placement
function isClassifierChecking(id) {
  return useAppStateSlice((state) => state.classifierApprovals.checking.has(id)) ?? false;
}
//@ chunk-wjygkcr4.js:66910-66957 affinity (2.1.88 match: _temp, 1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-wjygkcr4.js:66957-67010 callgraph-fingerprint (2.1.88 match: _temp2, 1)
function selectPermissionMode(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-wjygkcr4.js:67010-67066 layout
function selectActiveAgents(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-wjygkcr4.js:67066-68398 layout
function ToolUseStatusDot(props) {
  let $ = useMemoCache(29);
  let { param, inProgressToolUseIDs, lookups } = props;
  let inProgress;
  if ($[0] !== inProgressToolUseIDs || $[1] !== param.id) {
    inProgress = inProgressToolUseIDs.has(param.id);
    $[0] = inProgressToolUseIDs;
    $[1] = param.id;
    $[2] = inProgress;
  } else inProgress = $[2];
  let isInProgress = inProgress;
  let isErrored;
  if ($[3] !== lookups.erroredToolUseIDs || $[4] !== param.id) {
    isErrored = lookups.erroredToolUseIDs.has(param.id);
    $[3] = lookups.erroredToolUseIDs;
    $[4] = param.id;
    $[5] = isErrored;
  } else isErrored = $[5];
  let erroredFlag = isErrored;
  let dotElement;
  let color;
  if ($[6] !== lookups.toolResultByToolUseID || $[7] !== param.id) {
    dotElement = lookups.toolResultByToolUseID.get(param.id);
    color = VALIDATE_TREE_NAMESPACE.isInterruptedCall(dotElement);
    $[6] = lookups.toolResultByToolUseID;
    $[7] = param.id;
    $[8] = dotElement;
    $[9] = color;
  } else {
    dotElement = $[8];
    color = $[9];
  }
  let dotBox = color;
  let toolUseResult = dotElement?.type === "user" ? dotElement.toolUseResult : undefined;
  let dotText = props.verbose || props.isTranscriptMode === true;
  let resultElement;
  if (
    $[10] !== erroredFlag ||
    $[11] !== dotBox ||
    $[12] !== dotText ||
    $[13] !== toolUseResult ||
    $[14] !== param.id ||
    $[15] !== param.input ||
    $[16] !== param.name ||
    $[17] !== isInProgress
  ) {
    resultElement = () => ({
      requestId: param.id,
      props: {
        tool_use_id: param.id,
        tool: param.name,
        input: param.input,
        isRunning: isInProgress,
        isErrored: erroredFlag,
        isInterrupted: dotBox,
        isExpanded: dotText,
        output: toolUseResult,
      },
    });
    $[10] = erroredFlag;
    $[11] = dotBox;
    $[12] = dotText;
    $[13] = toolUseResult;
    $[14] = param.id;
    $[15] = param.input;
    $[16] = param.name;
    $[17] = isInProgress;
    $[18] = resultElement;
  } else resultElement = $[18];
  let statusDot;
  if (
    $[19] !== erroredFlag ||
    $[20] !== dotBox ||
    $[21] !== dotText ||
    $[22] !== toolUseResult ||
    $[23] !== param ||
    $[24] !== isInProgress
  ) {
    statusDot = [param, isInProgress, erroredFlag, dotBox, dotText, toolUseResult];
    $[19] = erroredFlag;
    $[20] = dotBox;
    $[21] = dotText;
    $[22] = toolUseResult;
    $[23] = param;
    $[24] = isInProgress;
    $[25] = statusDot;
  } else statusDot = $[25];
  let rowElement = actionKeysNamespace.useRenderInput("ToolUse", resultElement, statusDot);
  let containerElement;
  if ($[26] !== param || $[27] !== props) {
    containerElement = (outerElement) =>
      jsxProd_default(AssistantToolUseMessage, {
        ...props,
        param:
          outerElement.props.input === param.input
            ? param
            : {
                ...param,
                input: outerElement.props.input,
              },
        toolLabel: outerElement.props.tool === param.name ? undefined : outerElement.props.tool,
      });
    $[26] = param;
    $[27] = props;
    $[28] = containerElement;
  } else containerElement = $[28];
  return actionKeysNamespace.useRenderHook(rowElement, containerElement);
}
//@ chunk-wjygkcr4.js:68398-78282 fingerprint (2.1.88 match: AssistantToolUseMessage, 0.509)
/**
 * 工具调用消息：根据 lookups 判定状态（排队/运行/等待权限/已完成/失败/已停止），显示 ToolUseLoader 圆点 + userFacingName + renderToolUseMessage(input)；运行中显示进度消息，排队时显示 renderToolUseQueuedMessage；MCP 工具名 mcp__server__tool 拆开显示。
 */
function AssistantToolUseMessage(props) {
  let $ = useMemoCache(219);
  let {
    param,
    addMargin,
    tools,
    commands,
    verbose,
    inProgressToolUseIDs,
    progressMessagesForMessage,
    shouldAnimate,
    shouldShowDot,
    inProgressToolCallCount,
    lookups,
    isTranscriptMode,
    isCloudMemoryCall,
    toolLabel,
  } = props;
  let terminalSize = useTerminalSize();
  let [theme] = useTheme();
  let bg = useHost();
  let sessionOrUndefined = useSessionOrUndefined();
  let pendingWorkerRequest = useContext(staticRenderStorageSlot);
  let detachedSlot;
  if ($[0] !== sessionOrUndefined) {
    detachedSlot = sessionOrUndefined ? detachedCallSlots.of(sessionOrUndefined) : null;
    $[0] = sessionOrUndefined;
    $[1] = detachedSlot;
  } else detachedSlot = $[1];
  let selectCall;
  if ($[2] !== param.id) {
    selectCall = (slotMap) => slotMap.get(param.id);
    $[2] = param.id;
    $[3] = selectCall;
  } else selectCall = $[3];
  let [callEntry, callState] = useFrozenValue(useStoreSelector(detachedSlot, selectCall));
  let isRunning = callState?.status === "running";
  let isFailedOrStopped = callState?.status === "failed" || callState?.status === "stopped";
  let isClassifierCheckingRaw = useAppStateSlice(selectPendingWorkerRequest_2);
  isClassifierChecking(param.id);
  useContext(appStoreContext);
  useAppStateSlice(selectPermissionMode);
  let permissionMode = useAppStateSlice(selectActiveAgents);
  const isQuietCloudMemory = isCloudMemoryCall === true && !verbose;
  let displayTool;
  if ($[4] !== bg || $[5] !== param.name || $[6] !== isQuietCloudMemory) {
    displayTool = displayOnlyMcpTool(param.name, bg, isQuietCloudMemory);
    $[4] = bg;
    $[5] = param.name;
    $[6] = isQuietCloudMemory;
    $[7] = displayTool;
  } else displayTool = $[7];
  let displayToolValue = displayTool;
  let unusedFlag;
  if ($[8] !== lookups.toolResultByToolUseID || $[9] !== param.id) {
    unusedFlag = codeModeAccepted() ? lookups.toolResultByToolUseID.get(param.id) : undefined;
    $[8] = lookups.toolResultByToolUseID;
    $[9] = param.id;
    $[10] = unusedFlag;
  } else unusedFlag = $[10];
  let resultMsg = unusedFlag;
  let isVirtual = resultMsg?.type === "user" && resultMsg.isVirtual === true;
  let toolInfo;
  if (
    $[11] !== permissionMode ||
    $[12] !== displayToolValue ||
    $[13] !== isVirtual ||
    $[14] !== param.input ||
    $[15] !== param.name ||
    $[16] !== toolLabel ||
    $[17] !== tools
  ) {
    Ue: {
      if (!tools) {
        let noToolsInfo;
        if ($[19] === MEMO_CACHE_SENTINEL) {
          noToolsInfo = {
            notFound: "no-tools",
          };
          $[19] = noToolsInfo;
        } else noToolsInfo = $[19];
        toolInfo = noToolsInfo;
        break Ue;
      }
      let resolvedTool = findToolByName(tools, param.name) ?? displayToolValue;
      if (!resolvedTool) {
        const notFound =
          param.name.startsWith("mcp__") ||
          param.name.startsWith("skill__") ||
          param.name === STRUCTUREDOUTPUT ||
          param.name === SUBAGENTHANDBACK ||
          isEvalToolName(param.name) ||
          (codeModeAccepted() &&
            isVirtual &&
            require("../../utils/codeMode/isReplScriptHelperCall.lazy.js").isReplScriptHelperCall(
              param.name,
            )) ||
          param.name === "WebBrowser" ||
          RETIRED_TOOL_NAMES.has(param.name) ||
          getShadowedSearchToolNames().has(param.name) ||
          findToolByName(getAllBaseToolsFromRegistry() ?? [], param.name) !== undefined
            ? "expected-absent"
            : "unknown";
        let notFoundInfo;
        if ($[20] !== notFound) {
          notFoundInfo = {
            notFound,
          };
          $[20] = notFound;
          $[21] = notFoundInfo;
        } else notFoundInfo = $[21];
        toolInfo = notFoundInfo;
        break Ue;
      }
      let tool = safeParseToolInput(resolvedTool, param.input);
      let parsedData = tool.success ? tool.data : undefined;
      toolInfo = {
        tool: resolvedTool,
        input: tool,
        remoteHost: remoteMachineRefForDisplay(resolvedTool, parsedData),
        userFacingToolName:
          toolLabel ??
          resolvedTool.userFacingName(parsedData, {
            activeAgents: permissionMode,
          }),
        userFacingToolNameBackgroundColor: mcpRenderOverrideFor(
          resolvedTool,
          "userFacingNameBackgroundColor",
        )?.(parsedData, {
          activeAgents: permissionMode,
        }),
        isTransparentWrapper: resolvedTool.isTransparentWrapper?.() ?? false,
      };
    }
    $[11] = permissionMode;
    $[12] = displayToolValue;
    $[13] = isVirtual;
    $[14] = param.input;
    $[15] = param.name;
    $[16] = toolLabel;
    $[17] = tools;
    $[18] = toolInfo;
  } else toolInfo = $[18];
  let toolInfo_2 = toolInfo;
  let notFound = "notFound" in toolInfo_2 ? toolInfo_2.notFound : null;
  let logMissingToolEffect;
  let logMissingToolDeps;
  if ($[22] !== notFound || $[23] !== param.name) {
    logMissingToolEffect = () => {
      if (notFound === "no-tools")
        logError(
          withTelemetryMessage(
            Error(`Tools array is undefined for tool ${param.name}`),
            `Tools array is undefined (mcp=${param.name.startsWith("mcp__")})`,
          ),
        );
      else if (notFound === "expected-absent")
        logForDebugging(`Tool ${param.name} not found in render-time tools`, {
          level: "error",
        });
      else if (notFound === "unknown")
        logError(withTelemetryMessage(Error(`Tool ${param.name} not found`), "Tool not found"));
    };
    logMissingToolDeps = [param.name, notFound];
    $[22] = notFound;
    $[23] = param.name;
    $[24] = logMissingToolEffect;
    $[25] = logMissingToolDeps;
  } else {
    logMissingToolEffect = $[24];
    logMissingToolDeps = $[25];
  }
  useEffect(logMissingToolEffect, logMissingToolDeps);
  let thinkingContent;
  if ($[26] !== lookups.erroredToolUseIDs || $[27] !== param) {
    thinkingContent = structuredOutputText(param, lookups.erroredToolUseIDs);
    $[26] = lookups.erroredToolUseIDs;
    $[27] = param;
    $[28] = thinkingContent;
  } else thinkingContent = $[28];
  let thinkingContent_2 = thinkingContent;
  const isThinking = thinkingContent_2 !== null;
  let innerRow;
  let contentColumn;
  let outerBox;
  let isQueued;
  let isResolved;
  let isPendingClassifier;
  let flexDirection;
  let flexWrap;
  let minWidth;
  let statusDot;
  let toolNameTag;
  let paramText;
  let renderTag;
  let flexDirection_2;
  let ref;
  let flexDirection_3;
  let justifyContent;
  let marginTop;
  let width;
  let earlyResult;
  let tool;
  if (
    $[29] !== permissionMode ||
    $[30] !== addMargin ||
    $[31] !== commands ||
    $[32] !== callEntry ||
    $[33] !== inProgressToolCallCount ||
    $[34] !== inProgressToolUseIDs ||
    $[35] !== isFailedOrStopped ||
    $[36] !== isRunning ||
    $[37] !== pendingWorkerRequest ||
    $[38] !== isTranscriptMode ||
    $[39] !== lookups ||
    $[40] !== param ||
    $[41] !== toolInfo_2 ||
    $[42] !== isClassifierCheckingRaw?.toolUseId ||
    $[43] !== progressMessagesForMessage ||
    $[44] !== thinkingContent_2 ||
    $[45] !== sessionOrUndefined ||
    $[46] !== shouldAnimate ||
    $[47] !== shouldShowDot ||
    $[48] !== isThinking ||
    $[49] !== terminalSize ||
    $[50] !== theme ||
    $[51] !== toolLabel ||
    $[52] !== tools ||
    $[53] !== verbose
  ) {
    earlyResult = EARLY_RETURN_SENTINEL;
    Pt: {
      if (isThinking) {
        earlyResult = jsxProd_default(ThinkingMessage, {
          content: thinkingContent_2,
          addMargin,
        });
        break Pt;
      }
      const hasNotFound = "notFound" in toolInfo_2;
      if (
        $[75] !== permissionMode ||
        $[76] !== addMargin ||
        $[77] !== commands ||
        $[78] !== callEntry ||
        $[79] !== inProgressToolCallCount ||
        $[80] !== inProgressToolUseIDs ||
        $[81] !== isFailedOrStopped ||
        $[82] !== isRunning ||
        $[83] !== pendingWorkerRequest ||
        $[84] !== isTranscriptMode ||
        $[85] !== lookups ||
        $[86] !== param ||
        $[87] !== toolInfo_2 ||
        $[88] !== isClassifierCheckingRaw?.toolUseId ||
        $[89] !== progressMessagesForMessage ||
        $[90] !== sessionOrUndefined ||
        $[91] !== shouldAnimate ||
        $[92] !== shouldShowDot ||
        $[93] !== hasNotFound ||
        $[94] !== terminalSize ||
        $[95] !== theme ||
        $[96] !== toolLabel ||
        $[97] !== tools ||
        $[98] !== verbose
      ) {
        if (hasNotFound) {
          earlyResult = null;
          break Pt;
        }
        let {
          tool: tool_2,
          input,
          remoteHost,
          userFacingToolName,
          userFacingToolNameBackgroundColor,
          isTransparentWrapper,
        } = toolInfo_2;
        tool = tool_2;
        if (
          $[119] !== permissionMode ||
          $[120] !== addMargin ||
          $[121] !== commands ||
          $[122] !== callEntry ||
          $[123] !== inProgressToolCallCount ||
          $[124] !== inProgressToolUseIDs ||
          $[125] !== input ||
          $[126] !== isFailedOrStopped ||
          $[127] !== isRunning ||
          $[128] !== pendingWorkerRequest ||
          $[129] !== isTranscriptMode ||
          $[130] !== isTransparentWrapper ||
          $[131] !== lookups ||
          $[132] !== param ||
          $[133] !== isClassifierCheckingRaw?.toolUseId ||
          $[134] !== progressMessagesForMessage ||
          $[135] !== remoteHost ||
          $[136] !== sessionOrUndefined ||
          $[137] !== shouldAnimate ||
          $[138] !== shouldShowDot ||
          $[139] !== terminalSize ||
          $[140] !== theme ||
          $[141] !== toolLabel ||
          $[142] !== tool ||
          $[143] !== tools ||
          $[144] !== userFacingToolName ||
          $[145] !== userFacingToolNameBackgroundColor ||
          $[146] !== verbose
        ) {
          isResolved = lookups.resolvedToolUseIDs.has(param.id) && !isRunning;
          isQueued = !inProgressToolUseIDs.has(param.id) && !isResolved && !isRunning;
          isPendingClassifier = isClassifierCheckingRaw?.toolUseId === param.id;
          let resultMsg = lookups.toolResultByToolUseID.get(param.id);
          let toolUseResult = resultMsg?.type === "user" ? resultMsg.toolUseResult : undefined;
          if (isTransparentWrapper) {
            let classifierChecking = useClassifierChecking({
              param,
              isQueued,
              isResolved,
              isError: lookups.erroredToolUseIDs.has(param.id),
              shouldAnimate,
              shouldShowDot,
              addMargin,
              progressMessagesForMessage,
              resultMsg,
            });
            if (classifierChecking !== null) {
              earlyResult = classifierChecking;
              break Pt;
            }
            let scriptSourceRow = null;
            if (codeModeAccepted() && isTranscriptMode === true && isEvalToolCallName(param.name)) {
              let { ScriptSourceRow } = require("./ScriptSourceRow.lazy.js");
              const toolUseId = param.id;
              const input = param.input;
              const isUnresolved = !isResolved;
              let isError;
              if ($[166] !== lookups.erroredToolUseIDs || $[167] !== param.id) {
                isError = lookups.erroredToolUseIDs.has(param.id);
                $[166] = lookups.erroredToolUseIDs;
                $[167] = param.id;
                $[168] = isError;
              } else isError = $[168];
              scriptSourceRow = jsxProd_default(ScriptSourceRow, {
                tool,
                toolUseId,
                input,
                toolLabel,
                output: toolUseResult,
                shouldAnimate,
                isUnresolved,
                isError,
                addMargin,
              });
            }
            if (isResolved) {
              earlyResult = scriptSourceRow;
              break Pt;
            }
            const scriptSourceRowElement = scriptSourceRow;
            let progressMessage;
            if (
              $[169] !== permissionMode ||
              $[170] !== inProgressToolCallCount ||
              $[171] !== isTranscriptMode ||
              $[172] !== lookups ||
              $[173] !== param.id ||
              $[174] !== progressMessagesForMessage ||
              $[175] !== terminalSize ||
              $[176] !== tool ||
              $[177] !== tools ||
              $[178] !== verbose
            ) {
              progressMessage = renderToolUseProgressMessage_3(
                tool,
                tools,
                lookups,
                param.id,
                progressMessagesForMessage,
                {
                  verbose,
                  inProgressToolCallCount,
                  isTranscriptMode,
                  activeAgents: permissionMode,
                },
                terminalSize,
              );
              $[169] = permissionMode;
              $[170] = inProgressToolCallCount;
              $[171] = isTranscriptMode;
              $[172] = lookups;
              $[173] = param.id;
              $[174] = progressMessagesForMessage;
              $[175] = terminalSize;
              $[176] = tool;
              $[177] = tools;
              $[178] = verbose;
              $[179] = progressMessage;
            } else progressMessage = $[179];
            earlyResult = jsxProd_default_2(Box, {
              flexDirection: "column",
              width: "100%",
              children: [scriptSourceRowElement, progressMessage],
            });
            break Pt;
          }
          if (userFacingToolName === "") {
            earlyResult = null;
            break Pt;
          }
          let renderedParam = input.success
            ? renderToolUseMessage_2(tool, input.data, {
                theme,
                verbose,
                isTranscriptMode,
                activeAgents: permissionMode,
                commands,
                teammateAuthorOf: (authorId, authorName) =>
                  sessionOrUndefined ? getTeammateAuthor(sessionOrUndefined, authorId, authorName) : null,
                toolUseResult,
              })
            : null;
          if (renderedParam === null) {
            earlyResult = null;
            break Pt;
          }
          let max = Math.max(
            terminalSize.columns - (shouldShowDot ? 2 : 0) - bunStringWidth(userFacingToolName) - 2,
            20,
          );
          outerBox = Box;
          ref = callEntry;
          flexDirection_3 = "row";
          justifyContent = "space-between";
          marginTop = addMargin ? 1 : 0;
          width = "100%";
          contentColumn = Box;
          flexDirection_2 = "column";
          innerRow = Box;
          flexDirection = "row";
          flexWrap = "nowrap";
          minWidth = bunStringWidth(userFacingToolName) + (shouldShowDot ? 2 : 0);
          statusDot =
            shouldShowDot &&
            (isQueued
              ? jsxProd_default(Box, {
                  minWidth: 2,
                  children: jsxProd_default(Text, {
                    "aria-label": "tool:",
                    dimColor: isQueued,
                    children: BLACK_CIRCLE,
                  }),
                })
              : jsxProd_default(ToolUseLoader, {
                  shouldAnimate: shouldAnimate || isRunning,
                  isUnresolved: !isResolved,
                  isError: lookups.erroredToolUseIDs.has(param.id) || isFailedOrStopped,
                  isNeutral:
                    resultMsg?.type === "user" &&
                    mcpRenderOverrideFor(
                      tool,
                      "endedByChoice",
                    )?.({
                      toolDenialKind: resultMsg.toolDenialKind,
                      output: toolUseResult,
                      hasProgress: filterToolProgressMessages(progressMessagesForMessage).length > 0,
                    }),
                }));
          if ($[180] !== userFacingToolName || $[181] !== userFacingToolNameBackgroundColor) {
            toolNameTag = jsxProd_default(Box, {
              flexShrink: 0,
              children: jsxProd_default(TagTabs, {
                color: userFacingToolNameBackgroundColor,
                bold: true,
                wrap: "truncate-end",
                children: userFacingToolName,
              }),
            });
            $[180] = userFacingToolName;
            $[181] = userFacingToolNameBackgroundColor;
            $[182] = toolNameTag;
          } else toolNameTag = $[182];
          paramText =
            renderedParam !== "" &&
            jsxProd_default(diffDialogSlot.Provider, {
              value: verbose || pendingWorkerRequest ? null : max,
              children: jsxProd_default(Box, {
                flexWrap: "nowrap",
                children: jsxProd_default_2(Text, {
                  children: [
                    "(",
                    renderedParam,
                    ")",
                    remoteHost !== undefined &&
                      jsxProd_default_2(Text, {
                        dimColor: true,
                        children: [" \xB7 on ", remoteHost],
                      }),
                  ],
                }),
              }),
            });
          renderTag =
            input.success &&
            mcpRenderOverrideFor(tool, "renderToolUseTag")?.(input.data, {
              toolUseId: param.id,
              toolUseResult,
              progressMessages: lookups.progressMessagesByToolUseID.get(param.id),
            });
          $[119] = permissionMode;
          $[120] = addMargin;
          $[121] = commands;
          $[122] = callEntry;
          $[123] = inProgressToolCallCount;
          $[124] = inProgressToolUseIDs;
          $[125] = input;
          $[126] = isFailedOrStopped;
          $[127] = isRunning;
          $[128] = pendingWorkerRequest;
          $[129] = isTranscriptMode;
          $[130] = isTransparentWrapper;
          $[131] = lookups;
          $[132] = param;
          $[133] = isClassifierCheckingRaw?.toolUseId;
          $[134] = progressMessagesForMessage;
          $[135] = remoteHost;
          $[136] = sessionOrUndefined;
          $[137] = shouldAnimate;
          $[138] = shouldShowDot;
          $[139] = terminalSize;
          $[140] = theme;
          $[141] = toolLabel;
          $[142] = tool;
          $[143] = tools;
          $[144] = userFacingToolName;
          $[145] = userFacingToolNameBackgroundColor;
          $[146] = verbose;
          $[147] = innerRow;
          $[148] = contentColumn;
          $[149] = outerBox;
          $[150] = isQueued;
          $[151] = isResolved;
          $[152] = isPendingClassifier;
          $[153] = flexDirection;
          $[154] = flexWrap;
          $[155] = minWidth;
          $[156] = statusDot;
          $[157] = toolNameTag;
          $[158] = paramText;
          $[159] = renderTag;
          $[160] = flexDirection_2;
          $[161] = ref;
          $[162] = flexDirection_3;
          $[163] = justifyContent;
          $[164] = marginTop;
          $[165] = width;
        } else {
          innerRow = $[147];
          contentColumn = $[148];
          outerBox = $[149];
          isQueued = $[150];
          isResolved = $[151];
          isPendingClassifier = $[152];
          flexDirection = $[153];
          flexWrap = $[154];
          minWidth = $[155];
          statusDot = $[156];
          toolNameTag = $[157];
          paramText = $[158];
          renderTag = $[159];
          flexDirection_2 = $[160];
          ref = $[161];
          flexDirection_3 = $[162];
          justifyContent = $[163];
          marginTop = $[164];
          width = $[165];
        }
        $[75] = permissionMode;
        $[76] = addMargin;
        $[77] = commands;
        $[78] = callEntry;
        $[79] = inProgressToolCallCount;
        $[80] = inProgressToolUseIDs;
        $[81] = isFailedOrStopped;
        $[82] = isRunning;
        $[83] = pendingWorkerRequest;
        $[84] = isTranscriptMode;
        $[85] = lookups;
        $[86] = param;
        $[87] = toolInfo_2;
        $[88] = isClassifierCheckingRaw?.toolUseId;
        $[89] = progressMessagesForMessage;
        $[90] = sessionOrUndefined;
        $[91] = shouldAnimate;
        $[92] = shouldShowDot;
        $[93] = hasNotFound;
        $[94] = terminalSize;
        $[95] = theme;
        $[96] = toolLabel;
        $[97] = tools;
        $[98] = verbose;
        $[99] = innerRow;
        $[100] = contentColumn;
        $[101] = outerBox;
        $[102] = isQueued;
        $[103] = isResolved;
        $[104] = isPendingClassifier;
        $[105] = flexDirection;
        $[106] = flexWrap;
        $[107] = minWidth;
        $[108] = statusDot;
        $[109] = toolNameTag;
        $[110] = paramText;
        $[111] = renderTag;
        $[112] = flexDirection_2;
        $[113] = ref;
        $[114] = flexDirection_3;
        $[115] = justifyContent;
        $[116] = marginTop;
        $[117] = width;
        $[118] = tool;
      } else {
        innerRow = $[99];
        contentColumn = $[100];
        outerBox = $[101];
        isQueued = $[102];
        isResolved = $[103];
        isPendingClassifier = $[104];
        flexDirection = $[105];
        flexWrap = $[106];
        minWidth = $[107];
        statusDot = $[108];
        toolNameTag = $[109];
        paramText = $[110];
        renderTag = $[111];
        flexDirection_2 = $[112];
        ref = $[113];
        flexDirection_3 = $[114];
        justifyContent = $[115];
        marginTop = $[116];
        width = $[117];
        tool = $[118];
      }
    }
    $[29] = permissionMode;
    $[30] = addMargin;
    $[31] = commands;
    $[32] = callEntry;
    $[33] = inProgressToolCallCount;
    $[34] = inProgressToolUseIDs;
    $[35] = isFailedOrStopped;
    $[36] = isRunning;
    $[37] = pendingWorkerRequest;
    $[38] = isTranscriptMode;
    $[39] = lookups;
    $[40] = param;
    $[41] = toolInfo_2;
    $[42] = isClassifierCheckingRaw?.toolUseId;
    $[43] = progressMessagesForMessage;
    $[44] = thinkingContent_2;
    $[45] = sessionOrUndefined;
    $[46] = shouldAnimate;
    $[47] = shouldShowDot;
    $[48] = isThinking;
    $[49] = terminalSize;
    $[50] = theme;
    $[51] = toolLabel;
    $[52] = tools;
    $[53] = verbose;
    $[54] = innerRow;
    $[55] = contentColumn;
    $[56] = outerBox;
    $[57] = isQueued;
    $[58] = isResolved;
    $[59] = isPendingClassifier;
    $[60] = flexDirection;
    $[61] = flexWrap;
    $[62] = minWidth;
    $[63] = statusDot;
    $[64] = toolNameTag;
    $[65] = paramText;
    $[66] = renderTag;
    $[67] = flexDirection_2;
    $[68] = ref;
    $[69] = flexDirection_3;
    $[70] = justifyContent;
    $[71] = marginTop;
    $[72] = width;
    $[73] = earlyResult;
    $[74] = tool;
  } else {
    innerRow = $[54];
    contentColumn = $[55];
    outerBox = $[56];
    isQueued = $[57];
    isResolved = $[58];
    isPendingClassifier = $[59];
    flexDirection = $[60];
    flexWrap = $[61];
    minWidth = $[62];
    statusDot = $[63];
    toolNameTag = $[64];
    paramText = $[65];
    renderTag = $[66];
    flexDirection_2 = $[67];
    ref = $[68];
    flexDirection_3 = $[69];
    justifyContent = $[70];
    marginTop = $[71];
    width = $[72];
    earlyResult = $[73];
    tool = $[74];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let headerRow;
  if (
    $[183] !== innerRow ||
    $[184] !== flexDirection ||
    $[185] !== flexWrap ||
    $[186] !== minWidth ||
    $[187] !== statusDot ||
    $[188] !== toolNameTag ||
    $[189] !== paramText ||
    $[190] !== renderTag
  ) {
    headerRow = jsxProd_default_2(innerRow, {
      flexDirection,
      flexWrap,
      minWidth,
      children: [statusDot, toolNameTag, paramText, renderTag],
    });
    $[183] = innerRow;
    $[184] = flexDirection;
    $[185] = flexWrap;
    $[186] = minWidth;
    $[187] = statusDot;
    $[188] = toolNameTag;
    $[189] = paramText;
    $[190] = renderTag;
    $[191] = headerRow;
  } else headerRow = $[191];
  let statusLine;
  if (
    $[192] !== permissionMode ||
    $[193] !== inProgressToolCallCount ||
    $[194] !== isQueued ||
    $[195] !== isResolved ||
    $[196] !== isTranscriptMode ||
    $[197] !== isPendingClassifier ||
    $[198] !== lookups ||
    $[199] !== param.id ||
    $[200] !== progressMessagesForMessage ||
    $[201] !== terminalSize ||
    $[202] !== tool ||
    $[203] !== tools ||
    $[204] !== verbose
  ) {
    statusLine =
      !isResolved &&
      (isPendingClassifier
        ? jsxProd_default(MessageResponse, {
            height: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: "Waiting for permission\u2026",
            }),
          })
        : isQueued
          ? renderToolUseQueuedMessage(tool)
          : renderToolUseProgressMessage_3(
              tool,
              tools,
              lookups,
              param.id,
              progressMessagesForMessage,
              {
                verbose,
                inProgressToolCallCount,
                isTranscriptMode,
                activeAgents: permissionMode,
              },
              terminalSize,
            ));
    $[192] = permissionMode;
    $[193] = inProgressToolCallCount;
    $[194] = isQueued;
    $[195] = isResolved;
    $[196] = isTranscriptMode;
    $[197] = isPendingClassifier;
    $[198] = lookups;
    $[199] = param.id;
    $[200] = progressMessagesForMessage;
    $[201] = terminalSize;
    $[202] = tool;
    $[203] = tools;
    $[204] = verbose;
    $[205] = statusLine;
  } else statusLine = $[205];
  let children;
  if (
    $[206] !== contentColumn ||
    $[207] !== flexDirection_2 ||
    $[208] !== headerRow ||
    $[209] !== statusLine
  ) {
    children = jsxProd_default_2(contentColumn, {
      flexDirection: flexDirection_2,
      children: [headerRow, statusLine],
    });
    $[206] = contentColumn;
    $[207] = flexDirection_2;
    $[208] = headerRow;
    $[209] = statusLine;
    $[210] = children;
  } else children = $[210];
  let row;
  if (
    $[211] !== outerBox ||
    $[212] !== ref ||
    $[213] !== flexDirection_3 ||
    $[214] !== justifyContent ||
    $[215] !== marginTop ||
    $[216] !== width ||
    $[217] !== children
  ) {
    row = jsxProd_default(outerBox, {
      ref,
      flexDirection: flexDirection_3,
      justifyContent,
      marginTop,
      width,
      children,
    });
    $[211] = outerBox;
    $[212] = ref;
    $[213] = flexDirection_3;
    $[214] = justifyContent;
    $[215] = marginTop;
    $[216] = width;
    $[217] = children;
    $[218] = row;
  } else row = $[218];
  return row;
}
//@ chunk-wjygkcr4.js:78282-79989 layout
function ToolResultInline(props) {
  let $ = useMemoCache(46);
  let { addMargin, call, verbose } = props;
  let [theme] = useTheme();
  let { tool } = call;
  let inputElements;
  let statusElement;
  let resultElement;
  let rowElement;
  let bold;
  let children;
  let flexDirection;
  let flexWrap;
  let toolUseLoaderElement;
  let flexDirection_2;
  let marginTop;
  if (
    $[0] !== addMargin ||
    $[1] !== call.input ||
    $[2] !== call.status ||
    $[3] !== theme ||
    $[4] !== tool ||
    $[5] !== verbose
  ) {
    let parsedInput = safeParseToolInput(tool, call.input);
    let inputData = parsedInput.success ? parsedInput.data : undefined;
    rowElement =
      inputData === undefined
        ? null
        : renderToolUseMessage_2(tool, inputData, {
            theme,
            verbose,
          });
    resultElement = Box;
    flexDirection_2 = "column";
    marginTop = addMargin ? 1 : 0;
    statusElement = Box;
    flexDirection = "row";
    flexWrap = "nowrap";
    const isError = call.status !== "completed";
    if ($[17] !== isError) {
      toolUseLoaderElement = jsxProd_default(ToolUseLoader, {
        shouldAnimate: false,
        isUnresolved: false,
        isError,
      });
      $[17] = isError;
      $[18] = toolUseLoaderElement;
    } else toolUseLoaderElement = $[18];
    inputElements = Text;
    bold = true;
    children = tool.userFacingName(inputData);
    $[0] = addMargin;
    $[1] = call.input;
    $[2] = call.status;
    $[3] = theme;
    $[4] = tool;
    $[5] = verbose;
    $[6] = inputElements;
    $[7] = statusElement;
    $[8] = resultElement;
    $[9] = rowElement;
    $[10] = bold;
    $[11] = children;
    $[12] = flexDirection;
    $[13] = flexWrap;
    $[14] = toolUseLoaderElement;
    $[15] = flexDirection_2;
    $[16] = marginTop;
  } else {
    inputElements = $[6];
    statusElement = $[7];
    resultElement = $[8];
    rowElement = $[9];
    bold = $[10];
    children = $[11];
    flexDirection = $[12];
    flexWrap = $[13];
    toolUseLoaderElement = $[14];
    flexDirection_2 = $[15];
    marginTop = $[16];
  }
  let inputElementsElement;
  if ($[19] !== inputElements || $[20] !== bold || $[21] !== children) {
    inputElementsElement = jsxProd_default(inputElements, {
      bold,
      children,
    });
    $[19] = inputElements;
    $[20] = bold;
    $[21] = children;
    $[22] = inputElementsElement;
  } else inputElementsElement = $[22];
  let parenthetical;
  if ($[23] !== rowElement) {
    parenthetical =
      rowElement !== null &&
      rowElement !== "" &&
      jsxProd_default_2(Text, {
        children: ["(", rowElement, ")"],
      });
    $[23] = rowElement;
    $[24] = parenthetical;
  } else parenthetical = $[24];
  let statusElementElement;
  if (
    $[25] !== statusElement ||
    $[26] !== flexDirection ||
    $[27] !== flexWrap ||
    $[28] !== toolUseLoaderElement ||
    $[29] !== inputElementsElement ||
    $[30] !== parenthetical
  ) {
    statusElementElement = jsxProd_default_2(statusElement, {
      flexDirection,
      flexWrap,
      children: [toolUseLoaderElement, inputElementsElement, parenthetical],
    });
    $[25] = statusElement;
    $[26] = flexDirection;
    $[27] = flexWrap;
    $[28] = toolUseLoaderElement;
    $[29] = inputElementsElement;
    $[30] = parenthetical;
    $[31] = statusElementElement;
  } else statusElementElement = $[31];
  let parentheticalRow;
  if (
    $[32] !== call.data ||
    $[33] !== call.input ||
    $[34] !== call.status ||
    $[35] !== call.text ||
    $[36] !== theme ||
    $[37] !== tool ||
    $[38] !== verbose
  ) {
    parentheticalRow =
      call.status === "completed"
        ? (mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(call.data, [], {
            theme,
            tools: [],
            verbose,
            input: call.input,
          }) ?? null)
        : call.status === "stopped"
          ? jsxProd_default(RejectedToolUseMessage, {})
          : jsxProd_default(FallbackToolUseErrorMessage, {
              result: call.text,
              verbose,
            });
    $[32] = call.data;
    $[33] = call.input;
    $[34] = call.status;
    $[35] = call.text;
    $[36] = theme;
    $[37] = tool;
    $[38] = verbose;
    $[39] = parentheticalRow;
  } else parentheticalRow = $[39];
  let resultElementElement;
  if (
    $[40] !== resultElement ||
    $[41] !== statusElementElement ||
    $[42] !== parentheticalRow ||
    $[43] !== flexDirection_2 ||
    $[44] !== marginTop
  ) {
    resultElementElement = jsxProd_default_2(resultElement, {
      flexDirection: flexDirection_2,
      marginTop,
      children: [statusElementElement, parentheticalRow],
    });
    $[40] = resultElement;
    $[41] = statusElementElement;
    $[42] = parentheticalRow;
    $[43] = flexDirection_2;
    $[44] = marginTop;
    $[45] = resultElementElement;
  } else resultElementElement = $[45];
  return resultElementElement;
}
//@ chunk-wjygkcr4.js:79989-80224 fingerprint (2.1.88 match: renderToolUseMessage, 0.39)
/**
 * 安全调用 tool.renderToolUseMessage，异常时记录 "Error rendering tool use message for <tool>"（MCP 名脱敏）。
 */
function renderToolUseMessage_2(tool, input, theme) {
  let unparsedNotice = describeUnparsedInput(input);
  if (unparsedNotice !== null) return unparsedNotice;
  try {
    return renderToolUseMessageFor(tool, input, theme);
  } catch (error) {
    logError(
      withTelemetryMessage(
        Error(`Error rendering tool use message for ${tool.name}: ${error}`),
        `Error rendering tool use message (mcp=${tool.name.startsWith("mcp__")})`,
      ),
    );
    return "";
  }
}
//@ chunk-wjygkcr4.js:80224-80825 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.742)
function renderToolUseProgressMessage_3(
  tool,
  tools,
  lookups,
  toolUseID,
  progressMessagesForMessage,
  { verbose, inProgressToolCallCount, isTranscriptMode, activeAgents },
  terminalSize,
) {
  let toolProgressMessages = progressMessagesForMessage.filter((msg) => msg.data.type !== "hook_progress");
  try {
    let toolMessages =
      mcpRenderOverrideFor(tool, "renderToolUseProgressMessage")?.(toolProgressMessages, {
        tools,
        verbose,
        terminalSize,
        inProgressToolCallCount: inProgressToolCallCount ?? 1,
        isTranscriptMode,
        activeAgents,
      }) ?? null;
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(SentryErrorBoundary, {
          children: jsxProd_default(HookProgressMessage, {
            hookEvent: "PreToolUse",
            lookups,
            toolUseID,
            isTranscriptMode,
          }),
        }),
        toolMessages,
      ],
    });
  } catch (error) {
    logError(
      withTelemetryMessage(
        Error(`Error rendering tool use progress message for ${tool.name}: ${error}`),
        `Error rendering tool use progress message (mcp=${tool.name.startsWith("mcp__")})`,
      ),
    );
    return null;
  }
}
//@ chunk-wjygkcr4.js:80825-81066 fingerprint (2.1.88 match: renderToolUseQueuedMessage, 0.388)
function renderToolUseQueuedMessage(tool) {
  try {
    return mcpRenderOverrideFor(tool, "renderToolUseQueuedMessage")?.();
  } catch (error) {
    logError(
      withTelemetryMessage(
        Error(`Error rendering tool use queued message for ${tool.name}: ${error}`),
        `Error rendering tool use queued message (mcp=${tool.name.startsWith("mcp__")})`,
      ),
    );
    return null;
  }
}
//@ chunk-wjygkcr4.js:82393-82397 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:82393", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:457970-458018 fingerprint (2.1.88 match: _temp, 1)
function selectPendingWorkerRequest(state) {
  return state.pendingWorkerRequest;
}
export { ToolUseStatusDot, selectPendingWorkerRequest, ToolResultInline };
