/**
 * components/messages/AssistantToolUseMessage.tsx
 *
 * 助手工具调用：工具名 + renderToolUseMessage 参数摘要 + 状态圆点，排队/进度/等待权限状态；MCP 工具显示服务器名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantToolUseMessage.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-ah34pb7m.js (12)
 * attribution: fingerprint 5, placement 3, affinity 1, callgraph-fingerprint 1, layout 3
 */
import { init_react_production, useContext, useEffect } from "../../../vendor/react/cjs/react.production.js";
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
import { staticRenderStorageSlot } from "../../utils/staticRender.js";
import { detachedCallSlots } from "../../services/tools/detachedToolCalls.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { displayOnlyMcpTool } from "../../tools/MCPTool/displayOnlyTool.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  findToolByName,
  getAllBaseToolsFromRegistry,
  safeParseToolInput,
  filterToolProgressMessages,
} from "../../Tool.js";
import {
  STRUCTUREDOUTPUT,
  countToolCallsSince_2,
} from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import { isReplToolName } from "../../tools/REPLTool/constants.js";
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

//@ chunk-ah34pb7m.js:64176-64180 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:64176", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:64180-64207 placement
function useClassifierChecking(host) {
  return null;
}
//@ chunk-ah34pb7m.js:64207-64280 placement
function isClassifierChecking(id) {
  return useAppStateSlice((state) => state.classifierApprovals.checking.has(id)) ?? false;
}
//@ chunk-ah34pb7m.js:66292-66339 affinity (2.1.88 match: _temp, 1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-ah34pb7m.js:66339-66392 callgraph-fingerprint (2.1.88 match: _temp2, 1)
function selectPermissionMode(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-ah34pb7m.js:66392-66448 layout
function selectActiveAgents(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:66448-67780 layout
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
//@ chunk-ah34pb7m.js:67780-76484 fingerprint (2.1.88 match: AssistantToolUseMessage, 0.537)
/**
 * 工具调用消息：根据 lookups 判定状态（排队/运行/等待权限/已完成/失败/已停止），显示 ToolUseLoader 圆点 + userFacingName + renderToolUseMessage(input)；运行中显示进度消息，排队时显示 renderToolUseQueuedMessage；MCP 工具名 mcp__server__tool 拆开显示。
 */
function AssistantToolUseMessage(props) {
  let $ = useMemoCache(209);
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
  let unusedFlag = undefined?.type === "user" && undefined.isVirtual === true;
  let toolInfo;
  if (
    $[8] !== permissionMode ||
    $[9] !== displayToolValue ||
    $[10] !== param.input ||
    $[11] !== param.name ||
    $[12] !== toolLabel ||
    $[13] !== tools
  ) {
    ve: {
      if (!tools) {
        let noToolsInfo;
        if ($[15] === MEMO_CACHE_SENTINEL) {
          noToolsInfo = {
            notFound: "no-tools",
          };
          $[15] = noToolsInfo;
        } else noToolsInfo = $[15];
        toolInfo = noToolsInfo;
        break ve;
      }
      let resolvedTool = findToolByName(tools, param.name) ?? displayToolValue;
      if (!resolvedTool) {
        const notFound =
          param.name.startsWith("mcp__") ||
          param.name.startsWith("skill__") ||
          param.name === STRUCTUREDOUTPUT ||
          param.name === SUBAGENTHANDBACK ||
          isReplToolName(param.name) ||
          false ||
          param.name === "WebBrowser" ||
          RETIRED_TOOL_NAMES.has(param.name) ||
          getShadowedSearchToolNames().has(param.name) ||
          findToolByName(getAllBaseToolsFromRegistry() ?? [], param.name) !== undefined
            ? "expected-absent"
            : "unknown";
        let notFoundInfo;
        if ($[16] !== notFound) {
          notFoundInfo = {
            notFound,
          };
          $[16] = notFound;
          $[17] = notFoundInfo;
        } else notFoundInfo = $[17];
        toolInfo = notFoundInfo;
        break ve;
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
    $[8] = permissionMode;
    $[9] = displayToolValue;
    $[10] = param.input;
    $[11] = param.name;
    $[12] = toolLabel;
    $[13] = tools;
    $[14] = toolInfo;
  } else toolInfo = $[14];
  let toolInfo_2 = toolInfo;
  let notFound = "notFound" in toolInfo_2 ? toolInfo_2.notFound : null;
  let logMissingToolEffect;
  let logMissingToolDeps;
  if ($[18] !== notFound || $[19] !== param.name) {
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
    $[18] = notFound;
    $[19] = param.name;
    $[20] = logMissingToolEffect;
    $[21] = logMissingToolDeps;
  } else {
    logMissingToolEffect = $[20];
    logMissingToolDeps = $[21];
  }
  useEffect(logMissingToolEffect, logMissingToolDeps);
  let thinkingContent;
  if ($[22] !== lookups.erroredToolUseIDs || $[23] !== param) {
    thinkingContent = countToolCallsSince_2(param, lookups.erroredToolUseIDs);
    $[22] = lookups.erroredToolUseIDs;
    $[23] = param;
    $[24] = thinkingContent;
  } else thinkingContent = $[24];
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
    $[25] !== permissionMode ||
    $[26] !== addMargin ||
    $[27] !== commands ||
    $[28] !== callEntry ||
    $[29] !== inProgressToolCallCount ||
    $[30] !== inProgressToolUseIDs ||
    $[31] !== isFailedOrStopped ||
    $[32] !== isRunning ||
    $[33] !== pendingWorkerRequest ||
    $[34] !== isTranscriptMode ||
    $[35] !== lookups ||
    $[36] !== param ||
    $[37] !== toolInfo_2 ||
    $[38] !== isClassifierCheckingRaw?.toolUseId ||
    $[39] !== progressMessagesForMessage ||
    $[40] !== thinkingContent_2 ||
    $[41] !== sessionOrUndefined ||
    $[42] !== shouldAnimate ||
    $[43] !== shouldShowDot ||
    $[44] !== isThinking ||
    $[45] !== terminalSize ||
    $[46] !== theme ||
    $[47] !== tools ||
    $[48] !== verbose
  ) {
    earlyResult = EARLY_RETURN_SENTINEL;
    xr: {
      if (isThinking) {
        earlyResult = jsxProd_default(ThinkingMessage, {
          content: thinkingContent_2,
          addMargin,
        });
        break xr;
      }
      const hasNotFound = "notFound" in toolInfo_2;
      if (
        $[70] !== permissionMode ||
        $[71] !== addMargin ||
        $[72] !== commands ||
        $[73] !== callEntry ||
        $[74] !== inProgressToolCallCount ||
        $[75] !== inProgressToolUseIDs ||
        $[76] !== isFailedOrStopped ||
        $[77] !== isRunning ||
        $[78] !== pendingWorkerRequest ||
        $[79] !== isTranscriptMode ||
        $[80] !== lookups ||
        $[81] !== param ||
        $[82] !== toolInfo_2 ||
        $[83] !== isClassifierCheckingRaw?.toolUseId ||
        $[84] !== progressMessagesForMessage ||
        $[85] !== sessionOrUndefined ||
        $[86] !== shouldAnimate ||
        $[87] !== shouldShowDot ||
        $[88] !== hasNotFound ||
        $[89] !== terminalSize ||
        $[90] !== theme ||
        $[91] !== tools ||
        $[92] !== verbose
      ) {
        if (hasNotFound) {
          earlyResult = null;
          break xr;
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
          $[113] !== permissionMode ||
          $[114] !== addMargin ||
          $[115] !== commands ||
          $[116] !== callEntry ||
          $[117] !== inProgressToolCallCount ||
          $[118] !== inProgressToolUseIDs ||
          $[119] !== input ||
          $[120] !== isFailedOrStopped ||
          $[121] !== isRunning ||
          $[122] !== pendingWorkerRequest ||
          $[123] !== isTranscriptMode ||
          $[124] !== isTransparentWrapper ||
          $[125] !== lookups ||
          $[126] !== param ||
          $[127] !== isClassifierCheckingRaw?.toolUseId ||
          $[128] !== progressMessagesForMessage ||
          $[129] !== remoteHost ||
          $[130] !== sessionOrUndefined ||
          $[131] !== shouldAnimate ||
          $[132] !== shouldShowDot ||
          $[133] !== terminalSize ||
          $[134] !== theme ||
          $[135] !== tool ||
          $[136] !== tools ||
          $[137] !== userFacingToolName ||
          $[138] !== userFacingToolNameBackgroundColor ||
          $[139] !== verbose
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
              break xr;
            }
            if (isResolved) {
              earlyResult = null;
              break xr;
            }
            let progressMessage;
            if (
              $[159] !== permissionMode ||
              $[160] !== inProgressToolCallCount ||
              $[161] !== isTranscriptMode ||
              $[162] !== lookups ||
              $[163] !== param.id ||
              $[164] !== progressMessagesForMessage ||
              $[165] !== terminalSize ||
              $[166] !== tool ||
              $[167] !== tools ||
              $[168] !== verbose
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
              $[159] = permissionMode;
              $[160] = inProgressToolCallCount;
              $[161] = isTranscriptMode;
              $[162] = lookups;
              $[163] = param.id;
              $[164] = progressMessagesForMessage;
              $[165] = terminalSize;
              $[166] = tool;
              $[167] = tools;
              $[168] = verbose;
              $[169] = progressMessage;
            } else progressMessage = $[169];
            earlyResult = jsxProd_default_2(Box, {
              flexDirection: "column",
              width: "100%",
              children: [null, progressMessage],
            });
            break xr;
          }
          if (userFacingToolName === "") {
            earlyResult = null;
            break xr;
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
            break xr;
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
          if ($[170] !== userFacingToolName || $[171] !== userFacingToolNameBackgroundColor) {
            toolNameTag = jsxProd_default(Box, {
              flexShrink: 0,
              children: jsxProd_default(TagTabs, {
                color: userFacingToolNameBackgroundColor,
                bold: true,
                wrap: "truncate-end",
                children: userFacingToolName,
              }),
            });
            $[170] = userFacingToolName;
            $[171] = userFacingToolNameBackgroundColor;
            $[172] = toolNameTag;
          } else toolNameTag = $[172];
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
          $[113] = permissionMode;
          $[114] = addMargin;
          $[115] = commands;
          $[116] = callEntry;
          $[117] = inProgressToolCallCount;
          $[118] = inProgressToolUseIDs;
          $[119] = input;
          $[120] = isFailedOrStopped;
          $[121] = isRunning;
          $[122] = pendingWorkerRequest;
          $[123] = isTranscriptMode;
          $[124] = isTransparentWrapper;
          $[125] = lookups;
          $[126] = param;
          $[127] = isClassifierCheckingRaw?.toolUseId;
          $[128] = progressMessagesForMessage;
          $[129] = remoteHost;
          $[130] = sessionOrUndefined;
          $[131] = shouldAnimate;
          $[132] = shouldShowDot;
          $[133] = terminalSize;
          $[134] = theme;
          $[135] = tool;
          $[136] = tools;
          $[137] = userFacingToolName;
          $[138] = userFacingToolNameBackgroundColor;
          $[139] = verbose;
          $[140] = innerRow;
          $[141] = contentColumn;
          $[142] = outerBox;
          $[143] = isQueued;
          $[144] = isResolved;
          $[145] = isPendingClassifier;
          $[146] = flexDirection;
          $[147] = flexWrap;
          $[148] = minWidth;
          $[149] = statusDot;
          $[150] = toolNameTag;
          $[151] = paramText;
          $[152] = renderTag;
          $[153] = flexDirection_2;
          $[154] = ref;
          $[155] = flexDirection_3;
          $[156] = justifyContent;
          $[157] = marginTop;
          $[158] = width;
        } else {
          innerRow = $[140];
          contentColumn = $[141];
          outerBox = $[142];
          isQueued = $[143];
          isResolved = $[144];
          isPendingClassifier = $[145];
          flexDirection = $[146];
          flexWrap = $[147];
          minWidth = $[148];
          statusDot = $[149];
          toolNameTag = $[150];
          paramText = $[151];
          renderTag = $[152];
          flexDirection_2 = $[153];
          ref = $[154];
          flexDirection_3 = $[155];
          justifyContent = $[156];
          marginTop = $[157];
          width = $[158];
        }
        $[70] = permissionMode;
        $[71] = addMargin;
        $[72] = commands;
        $[73] = callEntry;
        $[74] = inProgressToolCallCount;
        $[75] = inProgressToolUseIDs;
        $[76] = isFailedOrStopped;
        $[77] = isRunning;
        $[78] = pendingWorkerRequest;
        $[79] = isTranscriptMode;
        $[80] = lookups;
        $[81] = param;
        $[82] = toolInfo_2;
        $[83] = isClassifierCheckingRaw?.toolUseId;
        $[84] = progressMessagesForMessage;
        $[85] = sessionOrUndefined;
        $[86] = shouldAnimate;
        $[87] = shouldShowDot;
        $[88] = hasNotFound;
        $[89] = terminalSize;
        $[90] = theme;
        $[91] = tools;
        $[92] = verbose;
        $[93] = innerRow;
        $[94] = contentColumn;
        $[95] = outerBox;
        $[96] = isQueued;
        $[97] = isResolved;
        $[98] = isPendingClassifier;
        $[99] = flexDirection;
        $[100] = flexWrap;
        $[101] = minWidth;
        $[102] = statusDot;
        $[103] = toolNameTag;
        $[104] = paramText;
        $[105] = renderTag;
        $[106] = flexDirection_2;
        $[107] = ref;
        $[108] = flexDirection_3;
        $[109] = justifyContent;
        $[110] = marginTop;
        $[111] = width;
        $[112] = tool;
      } else {
        innerRow = $[93];
        contentColumn = $[94];
        outerBox = $[95];
        isQueued = $[96];
        isResolved = $[97];
        isPendingClassifier = $[98];
        flexDirection = $[99];
        flexWrap = $[100];
        minWidth = $[101];
        statusDot = $[102];
        toolNameTag = $[103];
        paramText = $[104];
        renderTag = $[105];
        flexDirection_2 = $[106];
        ref = $[107];
        flexDirection_3 = $[108];
        justifyContent = $[109];
        marginTop = $[110];
        width = $[111];
        tool = $[112];
      }
    }
    $[25] = permissionMode;
    $[26] = addMargin;
    $[27] = commands;
    $[28] = callEntry;
    $[29] = inProgressToolCallCount;
    $[30] = inProgressToolUseIDs;
    $[31] = isFailedOrStopped;
    $[32] = isRunning;
    $[33] = pendingWorkerRequest;
    $[34] = isTranscriptMode;
    $[35] = lookups;
    $[36] = param;
    $[37] = toolInfo_2;
    $[38] = isClassifierCheckingRaw?.toolUseId;
    $[39] = progressMessagesForMessage;
    $[40] = thinkingContent_2;
    $[41] = sessionOrUndefined;
    $[42] = shouldAnimate;
    $[43] = shouldShowDot;
    $[44] = isThinking;
    $[45] = terminalSize;
    $[46] = theme;
    $[47] = tools;
    $[48] = verbose;
    $[49] = innerRow;
    $[50] = contentColumn;
    $[51] = outerBox;
    $[52] = isQueued;
    $[53] = isResolved;
    $[54] = isPendingClassifier;
    $[55] = flexDirection;
    $[56] = flexWrap;
    $[57] = minWidth;
    $[58] = statusDot;
    $[59] = toolNameTag;
    $[60] = paramText;
    $[61] = renderTag;
    $[62] = flexDirection_2;
    $[63] = ref;
    $[64] = flexDirection_3;
    $[65] = justifyContent;
    $[66] = marginTop;
    $[67] = width;
    $[68] = earlyResult;
    $[69] = tool;
  } else {
    innerRow = $[49];
    contentColumn = $[50];
    outerBox = $[51];
    isQueued = $[52];
    isResolved = $[53];
    isPendingClassifier = $[54];
    flexDirection = $[55];
    flexWrap = $[56];
    minWidth = $[57];
    statusDot = $[58];
    toolNameTag = $[59];
    paramText = $[60];
    renderTag = $[61];
    flexDirection_2 = $[62];
    ref = $[63];
    flexDirection_3 = $[64];
    justifyContent = $[65];
    marginTop = $[66];
    width = $[67];
    earlyResult = $[68];
    tool = $[69];
  }
  if (earlyResult !== EARLY_RETURN_SENTINEL) return earlyResult;
  let headerRow;
  if (
    $[173] !== innerRow ||
    $[174] !== flexDirection ||
    $[175] !== flexWrap ||
    $[176] !== minWidth ||
    $[177] !== statusDot ||
    $[178] !== toolNameTag ||
    $[179] !== paramText ||
    $[180] !== renderTag
  ) {
    headerRow = jsxProd_default_2(innerRow, {
      flexDirection,
      flexWrap,
      minWidth,
      children: [statusDot, toolNameTag, paramText, renderTag],
    });
    $[173] = innerRow;
    $[174] = flexDirection;
    $[175] = flexWrap;
    $[176] = minWidth;
    $[177] = statusDot;
    $[178] = toolNameTag;
    $[179] = paramText;
    $[180] = renderTag;
    $[181] = headerRow;
  } else headerRow = $[181];
  let statusLine;
  if (
    $[182] !== permissionMode ||
    $[183] !== inProgressToolCallCount ||
    $[184] !== isQueued ||
    $[185] !== isResolved ||
    $[186] !== isTranscriptMode ||
    $[187] !== isPendingClassifier ||
    $[188] !== lookups ||
    $[189] !== param.id ||
    $[190] !== progressMessagesForMessage ||
    $[191] !== terminalSize ||
    $[192] !== tool ||
    $[193] !== tools ||
    $[194] !== verbose
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
    $[182] = permissionMode;
    $[183] = inProgressToolCallCount;
    $[184] = isQueued;
    $[185] = isResolved;
    $[186] = isTranscriptMode;
    $[187] = isPendingClassifier;
    $[188] = lookups;
    $[189] = param.id;
    $[190] = progressMessagesForMessage;
    $[191] = terminalSize;
    $[192] = tool;
    $[193] = tools;
    $[194] = verbose;
    $[195] = statusLine;
  } else statusLine = $[195];
  let children;
  if (
    $[196] !== contentColumn ||
    $[197] !== flexDirection_2 ||
    $[198] !== headerRow ||
    $[199] !== statusLine
  ) {
    children = jsxProd_default_2(contentColumn, {
      flexDirection: flexDirection_2,
      children: [headerRow, statusLine],
    });
    $[196] = contentColumn;
    $[197] = flexDirection_2;
    $[198] = headerRow;
    $[199] = statusLine;
    $[200] = children;
  } else children = $[200];
  let row;
  if (
    $[201] !== outerBox ||
    $[202] !== ref ||
    $[203] !== flexDirection_3 ||
    $[204] !== justifyContent ||
    $[205] !== marginTop ||
    $[206] !== width ||
    $[207] !== children
  ) {
    row = jsxProd_default(outerBox, {
      ref,
      flexDirection: flexDirection_3,
      justifyContent,
      marginTop,
      width,
      children,
    });
    $[201] = outerBox;
    $[202] = ref;
    $[203] = flexDirection_3;
    $[204] = justifyContent;
    $[205] = marginTop;
    $[206] = width;
    $[207] = children;
    $[208] = row;
  } else row = $[208];
  return row;
}
//@ chunk-ah34pb7m.js:76484-78187 layout
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
//@ chunk-ah34pb7m.js:78187-78421 fingerprint (2.1.88 match: renderToolUseMessage, 0.389)
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
//@ chunk-ah34pb7m.js:78421-79021 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.741)
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
//@ chunk-ah34pb7m.js:79021-79262 fingerprint (2.1.88 match: renderToolUseQueuedMessage, 0.388)
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
//@ chunk-18hwfzwa.js:433138-433186 fingerprint (2.1.88 match: _temp, 1)
function selectPendingWorkerRequest(state) {
  return state.pendingWorkerRequest;
}
export { selectPendingWorkerRequest, ToolResultInline, ToolUseStatusDot };
