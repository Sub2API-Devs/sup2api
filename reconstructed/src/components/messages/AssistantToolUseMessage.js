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
import { init_react_production, Se, P } from "../../../vendor/react/cjs/react.production.js";
import { useAppStateSlice, appStoreContext } from "../../state/AppState.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
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

//@ chunk-ah34pb7m.js:64176-64180 placement
init_react_production();
//@ chunk-ah34pb7m.js:64180-64207 placement
function useClassifierChecking(m) {
  return null;
}
//@ chunk-ah34pb7m.js:64207-64280 placement
function isClassifierChecking(id) {
  return useAppStateSlice((d) => d.classifierApprovals.checking.has(id)) ?? false;
}
//@ chunk-ah34pb7m.js:66292-66339 affinity = _temp (1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-ah34pb7m.js:66339-66392 callgraph-fingerprint = _temp2 (1)
function selectPermissionMode(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-ah34pb7m.js:66392-66448 layout
function selectActiveAgents(Zm) {
  return Zm.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:66448-67780 layout
function ToolUseStatusDot(props) {
  let $ = w(29);
  let { param, inProgressToolUseIDs, lookups } = props;
  let h;
  if ($[0] !== inProgressToolUseIDs || $[1] !== param.id) {
    h = inProgressToolUseIDs.has(param.id);
    $[0] = inProgressToolUseIDs;
    $[1] = param.id;
    $[2] = h;
  } else h = $[2];
  let M = h;
  let T;
  if ($[3] !== lookups.erroredToolUseIDs || $[4] !== param.id) {
    T = lookups.erroredToolUseIDs.has(param.id);
    $[3] = lookups.erroredToolUseIDs;
    $[4] = param.id;
    $[5] = T;
  } else T = $[5];
  let x = T;
  let k;
  let b;
  if ($[6] !== lookups.toolResultByToolUseID || $[7] !== param.id) {
    k = lookups.toolResultByToolUseID.get(param.id);
    b = VALIDATE_TREE_NAMESPACE.isInterruptedCall(k);
    $[6] = lookups.toolResultByToolUseID;
    $[7] = param.id;
    $[8] = k;
    $[9] = b;
  } else {
    k = $[8];
    b = $[9];
  }
  let E = b;
  let toolUseResult = k?.type === "user" ? k.toolUseResult : undefined;
  let L = props.verbose || props.isTranscriptMode === true;
  let N;
  if (
    $[10] !== x ||
    $[11] !== E ||
    $[12] !== L ||
    $[13] !== toolUseResult ||
    $[14] !== param.id ||
    $[15] !== param.input ||
    $[16] !== param.name ||
    $[17] !== M
  ) {
    N = () => ({
      requestId: param.id,
      props: {
        tool_use_id: param.id,
        tool: param.name,
        input: param.input,
        isRunning: M,
        isErrored: x,
        isInterrupted: E,
        isExpanded: L,
        output: toolUseResult,
      },
    });
    $[10] = x;
    $[11] = E;
    $[12] = L;
    $[13] = toolUseResult;
    $[14] = param.id;
    $[15] = param.input;
    $[16] = param.name;
    $[17] = M;
    $[18] = N;
  } else N = $[18];
  let W;
  if (
    $[19] !== x ||
    $[20] !== E ||
    $[21] !== L ||
    $[22] !== toolUseResult ||
    $[23] !== param ||
    $[24] !== M
  ) {
    W = [param, M, x, E, L, toolUseResult];
    $[19] = x;
    $[20] = E;
    $[21] = L;
    $[22] = toolUseResult;
    $[23] = param;
    $[24] = M;
    $[25] = W;
  } else W = $[25];
  let U = actionKeysNamespace.useRenderInput("ToolUse", N, W);
  let K;
  if ($[26] !== param || $[27] !== props) {
    K = (V) =>
      jsxProd_default(AssistantToolUseMessage, {
        ...props,
        param:
          V.props.input === param.input
            ? param
            : {
                ...param,
                input: V.props.input,
              },
        toolLabel: V.props.tool === param.name ? undefined : V.props.tool,
      });
    $[26] = param;
    $[27] = props;
    $[28] = K;
  } else K = $[28];
  return actionKeysNamespace.useRenderHook(U, K);
}
//@ chunk-ah34pb7m.js:67780-76484 fingerprint = AssistantToolUseMessage (0.537)
/**
 * 工具调用消息：根据 lookups 判定状态（排队/运行/等待权限/已完成/失败/已停止），显示 ToolUseLoader 圆点 + userFacingName + renderToolUseMessage(input)；运行中显示进度消息，排队时显示 renderToolUseQueuedMessage；MCP 工具名 mcp__server__tool 拆开显示。
 */
function AssistantToolUseMessage(props) {
  let $ = w(209);
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
  let [U] = useTheme();
  let bg = useHost();
  let sessionOrUndefined = useSessionOrUndefined();
  let pendingWorkerRequest = Se(staticRenderStorageSlot);
  let z;
  if ($[0] !== sessionOrUndefined) {
    z = sessionOrUndefined ? detachedCallSlots.of(sessionOrUndefined) : null;
    $[0] = sessionOrUndefined;
    $[1] = z;
  } else z = $[1];
  let ee;
  if ($[2] !== param.id) {
    ee = (le) => le.get(param.id);
    $[2] = param.id;
    $[3] = ee;
  } else ee = $[3];
  let [ge, ae] = useFrozenValue(useStoreSelector(z, ee));
  let pe = ae?.status === "running";
  let te = ae?.status === "failed" || ae?.status === "stopped";
  let isClassifierCheckingRaw = useAppStateSlice(selectPendingWorkerRequest_2);
  isClassifierChecking(param.id);
  Se(appStoreContext);
  useAppStateSlice(selectPermissionMode);
  let permissionMode = useAppStateSlice(selectActiveAgents);
  const J = isCloudMemoryCall === true && !verbose;
  let se;
  if ($[4] !== bg || $[5] !== param.name || $[6] !== J) {
    se = displayOnlyMcpTool(param.name, bg, J);
    $[4] = bg;
    $[5] = param.name;
    $[6] = J;
    $[7] = se;
  } else se = $[7];
  let ye = se;
  let Te = undefined?.type === "user" && undefined.isVirtual === true;
  let Me;
  if (
    $[8] !== permissionMode ||
    $[9] !== ye ||
    $[10] !== param.input ||
    $[11] !== param.name ||
    $[12] !== toolLabel ||
    $[13] !== tools
  ) {
    ve: {
      if (!tools) {
        let be;
        if ($[15] === MEMO_CACHE_SENTINEL) {
          be = {
            notFound: "no-tools",
          };
          $[15] = be;
        } else be = $[15];
        Me = be;
        break ve;
      }
      let Ue = findToolByName(tools, param.name) ?? ye;
      if (!Ue) {
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
        let we;
        if ($[16] !== notFound) {
          we = {
            notFound,
          };
          $[16] = notFound;
          $[17] = we;
        } else we = $[17];
        Me = we;
        break ve;
      }
      let tool = safeParseToolInput(Ue, param.input);
      let De = tool.success ? tool.data : undefined;
      Me = {
        tool: Ue,
        input: tool,
        remoteHost: remoteMachineRefForDisplay(Ue, De),
        userFacingToolName:
          toolLabel ??
          Ue.userFacingName(De, {
            activeAgents: permissionMode,
          }),
        userFacingToolNameBackgroundColor: mcpRenderOverrideFor(Ue, "userFacingNameBackgroundColor")?.(De, {
          activeAgents: permissionMode,
        }),
        isTransparentWrapper: Ue.isTransparentWrapper?.() ?? false,
      };
    }
    $[8] = permissionMode;
    $[9] = ye;
    $[10] = param.input;
    $[11] = param.name;
    $[12] = toolLabel;
    $[13] = tools;
    $[14] = Me;
  } else Me = $[14];
  let xe = Me;
  let notFound = "notFound" in xe ? xe.notFound : null;
  let be;
  let we;
  if ($[18] !== notFound || $[19] !== param.name) {
    be = () => {
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
    we = [param.name, notFound];
    $[18] = notFound;
    $[19] = param.name;
    $[20] = be;
    $[21] = we;
  } else {
    be = $[20];
    we = $[21];
  }
  P(be, we);
  let co;
  if ($[22] !== lookups.erroredToolUseIDs || $[23] !== param) {
    co = countToolCallsSince_2(param, lookups.erroredToolUseIDs);
    $[22] = lookups.erroredToolUseIDs;
    $[23] = param;
    $[24] = co;
  } else co = $[24];
  let qe = co;
  const Ke = qe !== null;
  let Ro;
  let Uo;
  let go;
  let Xe;
  let Ge;
  let ao;
  let flexDirection;
  let flexWrap;
  let minWidth;
  let Ao;
  let ht;
  let Go;
  let Tt;
  let flexDirection_2;
  let ref;
  let flexDirection_3;
  let justifyContent;
  let marginTop;
  let width;
  let So;
  let tool;
  if (
    $[25] !== permissionMode ||
    $[26] !== addMargin ||
    $[27] !== commands ||
    $[28] !== ge ||
    $[29] !== inProgressToolCallCount ||
    $[30] !== inProgressToolUseIDs ||
    $[31] !== te ||
    $[32] !== pe ||
    $[33] !== pendingWorkerRequest ||
    $[34] !== isTranscriptMode ||
    $[35] !== lookups ||
    $[36] !== param ||
    $[37] !== xe ||
    $[38] !== isClassifierCheckingRaw?.toolUseId ||
    $[39] !== progressMessagesForMessage ||
    $[40] !== qe ||
    $[41] !== sessionOrUndefined ||
    $[42] !== shouldAnimate ||
    $[43] !== shouldShowDot ||
    $[44] !== Ke ||
    $[45] !== terminalSize ||
    $[46] !== U ||
    $[47] !== tools ||
    $[48] !== verbose
  ) {
    So = EARLY_RETURN_SENTINEL;
    xr: {
      if (Ke) {
        So = jsxProd_default(ThinkingMessage, {
          content: qe,
          addMargin,
        });
        break xr;
      }
      const Je = "notFound" in xe;
      if (
        $[70] !== permissionMode ||
        $[71] !== addMargin ||
        $[72] !== commands ||
        $[73] !== ge ||
        $[74] !== inProgressToolCallCount ||
        $[75] !== inProgressToolUseIDs ||
        $[76] !== te ||
        $[77] !== pe ||
        $[78] !== pendingWorkerRequest ||
        $[79] !== isTranscriptMode ||
        $[80] !== lookups ||
        $[81] !== param ||
        $[82] !== xe ||
        $[83] !== isClassifierCheckingRaw?.toolUseId ||
        $[84] !== progressMessagesForMessage ||
        $[85] !== sessionOrUndefined ||
        $[86] !== shouldAnimate ||
        $[87] !== shouldShowDot ||
        $[88] !== Je ||
        $[89] !== terminalSize ||
        $[90] !== U ||
        $[91] !== tools ||
        $[92] !== verbose
      ) {
        if (Je) {
          So = null;
          break xr;
        }
        let {
          tool: tool_2,
          input,
          remoteHost,
          userFacingToolName,
          userFacingToolNameBackgroundColor,
          isTransparentWrapper,
        } = xe;
        tool = tool_2;
        if (
          $[113] !== permissionMode ||
          $[114] !== addMargin ||
          $[115] !== commands ||
          $[116] !== ge ||
          $[117] !== inProgressToolCallCount ||
          $[118] !== inProgressToolUseIDs ||
          $[119] !== input ||
          $[120] !== te ||
          $[121] !== pe ||
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
          $[134] !== U ||
          $[135] !== tool ||
          $[136] !== tools ||
          $[137] !== userFacingToolName ||
          $[138] !== userFacingToolNameBackgroundColor ||
          $[139] !== verbose
        ) {
          Ge = lookups.resolvedToolUseIDs.has(param.id) && !pe;
          Xe = !inProgressToolUseIDs.has(param.id) && !Ge && !pe;
          ao = isClassifierCheckingRaw?.toolUseId === param.id;
          let qo = lookups.toolResultByToolUseID.get(param.id);
          let toolUseResult = qo?.type === "user" ? qo.toolUseResult : undefined;
          if (isTransparentWrapper) {
            let classifierChecking = useClassifierChecking({
              param,
              isQueued: Xe,
              isResolved: Ge,
              isError: lookups.erroredToolUseIDs.has(param.id),
              shouldAnimate,
              shouldShowDot,
              addMargin,
              progressMessagesForMessage,
              resultMsg: qo,
            });
            if (classifierChecking !== null) {
              So = classifierChecking;
              break xr;
            }
            if (Ge) {
              So = null;
              break xr;
            }
            let kt;
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
              kt = renderToolUseProgressMessage_3(
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
              $[169] = kt;
            } else kt = $[169];
            So = jsxProd_default_2(Box, {
              flexDirection: "column",
              width: "100%",
              children: [null, kt],
            });
            break xr;
          }
          if (userFacingToolName === "") {
            So = null;
            break xr;
          }
          let as = input.success
            ? renderToolUseMessage_2(tool, input.data, {
                theme: U,
                verbose,
                isTranscriptMode,
                activeAgents: permissionMode,
                commands,
                teammateAuthorOf: (Ms, Xm) =>
                  sessionOrUndefined ? getTeammateAuthor(sessionOrUndefined, Ms, Xm) : null,
                toolUseResult,
              })
            : null;
          if (as === null) {
            So = null;
            break xr;
          }
          let max = Math.max(
            terminalSize.columns - (shouldShowDot ? 2 : 0) - bunStringWidth(userFacingToolName) - 2,
            20,
          );
          go = Box;
          ref = ge;
          flexDirection_3 = "row";
          justifyContent = "space-between";
          marginTop = addMargin ? 1 : 0;
          width = "100%";
          Uo = Box;
          flexDirection_2 = "column";
          Ro = Box;
          flexDirection = "row";
          flexWrap = "nowrap";
          minWidth = bunStringWidth(userFacingToolName) + (shouldShowDot ? 2 : 0);
          Ao =
            shouldShowDot &&
            (Xe
              ? jsxProd_default(Box, {
                  minWidth: 2,
                  children: jsxProd_default(Text, {
                    "aria-label": "tool:",
                    dimColor: Xe,
                    children: BLACK_CIRCLE,
                  }),
                })
              : jsxProd_default(ToolUseLoader, {
                  shouldAnimate: shouldAnimate || pe,
                  isUnresolved: !Ge,
                  isError: lookups.erroredToolUseIDs.has(param.id) || te,
                  isNeutral:
                    qo?.type === "user" &&
                    mcpRenderOverrideFor(
                      tool,
                      "endedByChoice",
                    )?.({
                      toolDenialKind: qo.toolDenialKind,
                      output: toolUseResult,
                      hasProgress: filterToolProgressMessages(progressMessagesForMessage).length > 0,
                    }),
                }));
          if ($[170] !== userFacingToolName || $[171] !== userFacingToolNameBackgroundColor) {
            ht = jsxProd_default(Box, {
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
            $[172] = ht;
          } else ht = $[172];
          Go =
            as !== "" &&
            jsxProd_default(diffDialogSlot.Provider, {
              value: verbose || pendingWorkerRequest ? null : max,
              children: jsxProd_default(Box, {
                flexWrap: "nowrap",
                children: jsxProd_default_2(Text, {
                  children: [
                    "(",
                    as,
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
          Tt =
            input.success &&
            mcpRenderOverrideFor(tool, "renderToolUseTag")?.(input.data, {
              toolUseId: param.id,
              toolUseResult,
              progressMessages: lookups.progressMessagesByToolUseID.get(param.id),
            });
          $[113] = permissionMode;
          $[114] = addMargin;
          $[115] = commands;
          $[116] = ge;
          $[117] = inProgressToolCallCount;
          $[118] = inProgressToolUseIDs;
          $[119] = input;
          $[120] = te;
          $[121] = pe;
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
          $[134] = U;
          $[135] = tool;
          $[136] = tools;
          $[137] = userFacingToolName;
          $[138] = userFacingToolNameBackgroundColor;
          $[139] = verbose;
          $[140] = Ro;
          $[141] = Uo;
          $[142] = go;
          $[143] = Xe;
          $[144] = Ge;
          $[145] = ao;
          $[146] = flexDirection;
          $[147] = flexWrap;
          $[148] = minWidth;
          $[149] = Ao;
          $[150] = ht;
          $[151] = Go;
          $[152] = Tt;
          $[153] = flexDirection_2;
          $[154] = ref;
          $[155] = flexDirection_3;
          $[156] = justifyContent;
          $[157] = marginTop;
          $[158] = width;
        } else {
          Ro = $[140];
          Uo = $[141];
          go = $[142];
          Xe = $[143];
          Ge = $[144];
          ao = $[145];
          flexDirection = $[146];
          flexWrap = $[147];
          minWidth = $[148];
          Ao = $[149];
          ht = $[150];
          Go = $[151];
          Tt = $[152];
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
        $[73] = ge;
        $[74] = inProgressToolCallCount;
        $[75] = inProgressToolUseIDs;
        $[76] = te;
        $[77] = pe;
        $[78] = pendingWorkerRequest;
        $[79] = isTranscriptMode;
        $[80] = lookups;
        $[81] = param;
        $[82] = xe;
        $[83] = isClassifierCheckingRaw?.toolUseId;
        $[84] = progressMessagesForMessage;
        $[85] = sessionOrUndefined;
        $[86] = shouldAnimate;
        $[87] = shouldShowDot;
        $[88] = Je;
        $[89] = terminalSize;
        $[90] = U;
        $[91] = tools;
        $[92] = verbose;
        $[93] = Ro;
        $[94] = Uo;
        $[95] = go;
        $[96] = Xe;
        $[97] = Ge;
        $[98] = ao;
        $[99] = flexDirection;
        $[100] = flexWrap;
        $[101] = minWidth;
        $[102] = Ao;
        $[103] = ht;
        $[104] = Go;
        $[105] = Tt;
        $[106] = flexDirection_2;
        $[107] = ref;
        $[108] = flexDirection_3;
        $[109] = justifyContent;
        $[110] = marginTop;
        $[111] = width;
        $[112] = tool;
      } else {
        Ro = $[93];
        Uo = $[94];
        go = $[95];
        Xe = $[96];
        Ge = $[97];
        ao = $[98];
        flexDirection = $[99];
        flexWrap = $[100];
        minWidth = $[101];
        Ao = $[102];
        ht = $[103];
        Go = $[104];
        Tt = $[105];
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
    $[28] = ge;
    $[29] = inProgressToolCallCount;
    $[30] = inProgressToolUseIDs;
    $[31] = te;
    $[32] = pe;
    $[33] = pendingWorkerRequest;
    $[34] = isTranscriptMode;
    $[35] = lookups;
    $[36] = param;
    $[37] = xe;
    $[38] = isClassifierCheckingRaw?.toolUseId;
    $[39] = progressMessagesForMessage;
    $[40] = qe;
    $[41] = sessionOrUndefined;
    $[42] = shouldAnimate;
    $[43] = shouldShowDot;
    $[44] = Ke;
    $[45] = terminalSize;
    $[46] = U;
    $[47] = tools;
    $[48] = verbose;
    $[49] = Ro;
    $[50] = Uo;
    $[51] = go;
    $[52] = Xe;
    $[53] = Ge;
    $[54] = ao;
    $[55] = flexDirection;
    $[56] = flexWrap;
    $[57] = minWidth;
    $[58] = Ao;
    $[59] = ht;
    $[60] = Go;
    $[61] = Tt;
    $[62] = flexDirection_2;
    $[63] = ref;
    $[64] = flexDirection_3;
    $[65] = justifyContent;
    $[66] = marginTop;
    $[67] = width;
    $[68] = So;
    $[69] = tool;
  } else {
    Ro = $[49];
    Uo = $[50];
    go = $[51];
    Xe = $[52];
    Ge = $[53];
    ao = $[54];
    flexDirection = $[55];
    flexWrap = $[56];
    minWidth = $[57];
    Ao = $[58];
    ht = $[59];
    Go = $[60];
    Tt = $[61];
    flexDirection_2 = $[62];
    ref = $[63];
    flexDirection_3 = $[64];
    justifyContent = $[65];
    marginTop = $[66];
    width = $[67];
    So = $[68];
    tool = $[69];
  }
  if (So !== EARLY_RETURN_SENTINEL) return So;
  let Je;
  if (
    $[173] !== Ro ||
    $[174] !== flexDirection ||
    $[175] !== flexWrap ||
    $[176] !== minWidth ||
    $[177] !== Ao ||
    $[178] !== ht ||
    $[179] !== Go ||
    $[180] !== Tt
  ) {
    Je = jsxProd_default_2(Ro, {
      flexDirection,
      flexWrap,
      minWidth,
      children: [Ao, ht, Go, Tt],
    });
    $[173] = Ro;
    $[174] = flexDirection;
    $[175] = flexWrap;
    $[176] = minWidth;
    $[177] = Ao;
    $[178] = ht;
    $[179] = Go;
    $[180] = Tt;
    $[181] = Je;
  } else Je = $[181];
  let No;
  if (
    $[182] !== permissionMode ||
    $[183] !== inProgressToolCallCount ||
    $[184] !== Xe ||
    $[185] !== Ge ||
    $[186] !== isTranscriptMode ||
    $[187] !== ao ||
    $[188] !== lookups ||
    $[189] !== param.id ||
    $[190] !== progressMessagesForMessage ||
    $[191] !== terminalSize ||
    $[192] !== tool ||
    $[193] !== tools ||
    $[194] !== verbose
  ) {
    No =
      !Ge &&
      (ao
        ? jsxProd_default(MessageResponse, {
            height: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: "Waiting for permission\u2026",
            }),
          })
        : Xe
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
    $[184] = Xe;
    $[185] = Ge;
    $[186] = isTranscriptMode;
    $[187] = ao;
    $[188] = lookups;
    $[189] = param.id;
    $[190] = progressMessagesForMessage;
    $[191] = terminalSize;
    $[192] = tool;
    $[193] = tools;
    $[194] = verbose;
    $[195] = No;
  } else No = $[195];
  let children;
  if ($[196] !== Uo || $[197] !== flexDirection_2 || $[198] !== Je || $[199] !== No) {
    children = jsxProd_default_2(Uo, {
      flexDirection: flexDirection_2,
      children: [Je, No],
    });
    $[196] = Uo;
    $[197] = flexDirection_2;
    $[198] = Je;
    $[199] = No;
    $[200] = children;
  } else children = $[200];
  let ni;
  if (
    $[201] !== go ||
    $[202] !== ref ||
    $[203] !== flexDirection_3 ||
    $[204] !== justifyContent ||
    $[205] !== marginTop ||
    $[206] !== width ||
    $[207] !== children
  ) {
    ni = jsxProd_default(go, {
      ref,
      flexDirection: flexDirection_3,
      justifyContent,
      marginTop,
      width,
      children,
    });
    $[201] = go;
    $[202] = ref;
    $[203] = flexDirection_3;
    $[204] = justifyContent;
    $[205] = marginTop;
    $[206] = width;
    $[207] = children;
    $[208] = ni;
  } else ni = $[208];
  return ni;
}
//@ chunk-ah34pb7m.js:76484-78187 layout
function ToolResultInline(props) {
  let $ = w(46);
  let { addMargin, call: c, verbose } = props;
  let [f] = useTheme();
  let { tool } = c;
  let T;
  let x;
  let k;
  let b;
  let bold;
  let children;
  let flexDirection;
  let flexWrap;
  let W;
  let flexDirection_2;
  let marginTop;
  if (
    $[0] !== addMargin ||
    $[1] !== c.input ||
    $[2] !== c.status ||
    $[3] !== f ||
    $[4] !== tool ||
    $[5] !== verbose
  ) {
    let V = safeParseToolInput(tool, c.input);
    let Y = V.success ? V.data : undefined;
    b =
      Y === undefined
        ? null
        : renderToolUseMessage_2(tool, Y, {
            theme: f,
            verbose,
          });
    k = Box;
    flexDirection_2 = "column";
    marginTop = addMargin ? 1 : 0;
    x = Box;
    flexDirection = "row";
    flexWrap = "nowrap";
    const isError = c.status !== "completed";
    if ($[17] !== isError) {
      W = jsxProd_default(ToolUseLoader, {
        shouldAnimate: false,
        isUnresolved: false,
        isError,
      });
      $[17] = isError;
      $[18] = W;
    } else W = $[18];
    T = Text;
    bold = true;
    children = tool.userFacingName(Y);
    $[0] = addMargin;
    $[1] = c.input;
    $[2] = c.status;
    $[3] = f;
    $[4] = tool;
    $[5] = verbose;
    $[6] = T;
    $[7] = x;
    $[8] = k;
    $[9] = b;
    $[10] = bold;
    $[11] = children;
    $[12] = flexDirection;
    $[13] = flexWrap;
    $[14] = W;
    $[15] = flexDirection_2;
    $[16] = marginTop;
  } else {
    T = $[6];
    x = $[7];
    k = $[8];
    b = $[9];
    bold = $[10];
    children = $[11];
    flexDirection = $[12];
    flexWrap = $[13];
    W = $[14];
    flexDirection_2 = $[15];
    marginTop = $[16];
  }
  let X;
  if ($[19] !== T || $[20] !== bold || $[21] !== children) {
    X = jsxProd_default(T, {
      bold,
      children,
    });
    $[19] = T;
    $[20] = bold;
    $[21] = children;
    $[22] = X;
  } else X = $[22];
  let z;
  if ($[23] !== b) {
    z =
      b !== null &&
      b !== "" &&
      jsxProd_default_2(Text, {
        children: ["(", b, ")"],
      });
    $[23] = b;
    $[24] = z;
  } else z = $[24];
  let ee;
  if (
    $[25] !== x ||
    $[26] !== flexDirection ||
    $[27] !== flexWrap ||
    $[28] !== W ||
    $[29] !== X ||
    $[30] !== z
  ) {
    ee = jsxProd_default_2(x, {
      flexDirection,
      flexWrap,
      children: [W, X, z],
    });
    $[25] = x;
    $[26] = flexDirection;
    $[27] = flexWrap;
    $[28] = W;
    $[29] = X;
    $[30] = z;
    $[31] = ee;
  } else ee = $[31];
  let le;
  if (
    $[32] !== c.data ||
    $[33] !== c.input ||
    $[34] !== c.status ||
    $[35] !== c.text ||
    $[36] !== f ||
    $[37] !== tool ||
    $[38] !== verbose
  ) {
    le =
      c.status === "completed"
        ? (mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(c.data, [], {
            theme: f,
            tools: [],
            verbose,
            input: c.input,
          }) ?? null)
        : c.status === "stopped"
          ? jsxProd_default(RejectedToolUseMessage, {})
          : jsxProd_default(FallbackToolUseErrorMessage, {
              result: c.text,
              verbose,
            });
    $[32] = c.data;
    $[33] = c.input;
    $[34] = c.status;
    $[35] = c.text;
    $[36] = f;
    $[37] = tool;
    $[38] = verbose;
    $[39] = le;
  } else le = $[39];
  let ge;
  if ($[40] !== k || $[41] !== ee || $[42] !== le || $[43] !== flexDirection_2 || $[44] !== marginTop) {
    ge = jsxProd_default_2(k, {
      flexDirection: flexDirection_2,
      marginTop,
      children: [ee, le],
    });
    $[40] = k;
    $[41] = ee;
    $[42] = le;
    $[43] = flexDirection_2;
    $[44] = marginTop;
    $[45] = ge;
  } else ge = $[45];
  return ge;
}
//@ chunk-ah34pb7m.js:78187-78421 fingerprint = renderToolUseMessage (0.389)
/**
 * 安全调用 tool.renderToolUseMessage，异常时记录 "Error rendering tool use message for <tool>"（MCP 名脱敏）。
 */
function renderToolUseMessage_2(tool, input, c) {
  let g = describeUnparsedInput(input);
  if (g !== null) return g;
  try {
    return renderToolUseMessageFor(tool, input, c);
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
//@ chunk-ah34pb7m.js:78421-79021 fingerprint = renderToolUseProgressMessage (0.741)
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
//@ chunk-ah34pb7m.js:79021-79262 fingerprint = renderToolUseQueuedMessage (0.388)
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
//@ chunk-18hwfzwa.js:433138-433186 fingerprint = _temp (1)
function selectPendingWorkerRequest(state) {
  return state.pendingWorkerRequest;
}
export { selectPendingWorkerRequest, ToolResultInline, ToolUseStatusDot };
