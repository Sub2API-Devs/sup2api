/**
 * components/messages/AssistantToolUseMessage.tsx
 *
 * 助手工具调用：工具名 + renderToolUseMessage 参数摘要 + 状态圆点，排队/进度/等待权限状态；MCP 工具显示服务器名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantToolUseMessage.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-ah34pb7m.js (9)
 * attribution: fingerprint 5, affinity 1, callgraph-fingerprint 1, layout 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { x6 } from "../../plugins/functionHooks/ui/index.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useHost, iP } from "../../context/session.js";
import { Se, P } from "../../../vendor/react/cjs/react.production.js";
import { a0t } from "../../utils/staticRender.js";
import { kT } from "../../services/tools/detachedToolCalls.js";
import { a5 } from "../FreezeWhenOffscreen.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { rs, gM } from "../../state/AppState.js";
import { kp, Rp } from "./_new/AssistantToolUseMessage.helpers-ah34.js";
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
import { _O } from "../../tools/REPLTool/constants.js";
import { RETIRED_TOOL_NAMES } from "../../tools/retiredTools.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { hwt } from "../../utils/toolUseDisplay.js";
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
import { vFn } from "../../hooks/useWorkspaceDiff.js";
import { MessageResponse } from "../MessageResponse.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { FallbackToolUseErrorMessage } from "../FallbackToolUseErrorMessage.js";
import { describeUnparsedInput } from "../../utils/json.js";
import { renderToolUseMessageFor } from "./toolUseRenderers.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { HookProgressMessage } from "./HookProgressMessage.js";

//@ chunk-ah34pb7m.js:66292-66339 affinity = _temp (1)
function selectPendingWorkerRequest_2(state) {
  return state.pendingWorkerRequest;
}
//@ chunk-ah34pb7m.js:66339-66392 callgraph-fingerprint = _temp2 (1)
function selectPermissionMode(state_0) {
  return state_0.toolPermissionContext.mode;
}
//@ chunk-ah34pb7m.js:66392-66448 layout
function selectActiveAgents(Zm) {
  return Zm.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:66448-67780 layout
function ToolUseStatusDot(m) {
  let $ = w(29),
    { param: param, inProgressToolUseIDs: inProgressToolUseIDs, lookups: lookups } = m,
    h;
  if ($[0] !== inProgressToolUseIDs || $[1] !== param.id)
    ((h = inProgressToolUseIDs.has(param.id)), ($[0] = inProgressToolUseIDs), ($[1] = param.id), ($[2] = h));
  else h = $[2];
  let M = h,
    T;
  if ($[3] !== lookups.erroredToolUseIDs || $[4] !== param.id)
    ((T = lookups.erroredToolUseIDs.has(param.id)),
      ($[3] = lookups.erroredToolUseIDs),
      ($[4] = param.id),
      ($[5] = T));
  else T = $[5];
  let x = T,
    k,
    b;
  if ($[6] !== lookups.toolResultByToolUseID || $[7] !== param.id)
    ((k = lookups.toolResultByToolUseID.get(param.id)),
      (b = x6.isInterruptedCall(k)),
      ($[6] = lookups.toolResultByToolUseID),
      ($[7] = param.id),
      ($[8] = k),
      ($[9] = b));
  else ((k = $[8]), (b = $[9]));
  let E = b,
    B = k?.type === "user" ? k.toolUseResult : void 0,
    L = m.verbose || m.isTranscriptMode === !0,
    N;
  if (
    $[10] !== x ||
    $[11] !== E ||
    $[12] !== L ||
    $[13] !== B ||
    $[14] !== param.id ||
    $[15] !== param.input ||
    $[16] !== param.name ||
    $[17] !== M
  )
    ((N = () => ({
      requestId: param.id,
      props: {
        tool_use_id: param.id,
        tool: param.name,
        input: param.input,
        isRunning: M,
        isErrored: x,
        isInterrupted: E,
        isExpanded: L,
        output: B,
      },
    })),
      ($[10] = x),
      ($[11] = E),
      ($[12] = L),
      ($[13] = B),
      ($[14] = param.id),
      ($[15] = param.input),
      ($[16] = param.name),
      ($[17] = M),
      ($[18] = N));
  else N = $[18];
  let W;
  if ($[19] !== x || $[20] !== E || $[21] !== L || $[22] !== B || $[23] !== param || $[24] !== M)
    ((W = [param, M, x, E, L, B]),
      ($[19] = x),
      ($[20] = E),
      ($[21] = L),
      ($[22] = B),
      ($[23] = param),
      ($[24] = M),
      ($[25] = W));
  else W = $[25];
  let useRenderInput = actionKeysNamespace.useRenderInput("ToolUse", N, W),
    K;
  if ($[26] !== param || $[27] !== m)
    ((K = (V) =>
      e(AssistantToolUseMessage, {
        ...m,
        param: V.props.input === param.input ? param : { ...param, input: V.props.input },
        toolLabel: V.props.tool === param.name ? void 0 : V.props.tool,
      })),
      ($[26] = param),
      ($[27] = m),
      ($[28] = K));
  else K = $[28];
  return actionKeysNamespace.useRenderHook(useRenderInput, K);
}
/**
 * 工具调用消息：根据 lookups 判定状态（排队/运行/等待权限/已完成/失败/已停止），显示 ToolUseLoader 圆点 + userFacingName + renderToolUseMessage(input)；运行中显示进度消息，排队时显示 renderToolUseQueuedMessage；MCP 工具名 mcp__server__tool 拆开显示。
 */
//@ chunk-ah34pb7m.js:67780-76484 fingerprint = AssistantToolUseMessage (0.537)
function AssistantToolUseMessage(t0) {
  let $ = w(209),
    {
      param: param,
      addMargin: addMargin,
      tools: tools,
      commands: commands,
      verbose: verbose,
      inProgressToolUseIDs: inProgressToolUseIDs,
      progressMessagesForMessage: progressMessagesForMessage,
      shouldAnimate: shouldAnimate,
      shouldShowDot: shouldShowDot,
      inProgressToolCallCount: inProgressToolCallCount,
      lookups: lookups,
      isTranscriptMode: isTranscriptMode,
      isCloudMemoryCall: isCloudMemoryCall,
      toolLabel: toolLabel,
    } = t0,
    terminalSize = useTerminalSize(),
    [U] = useTheme(),
    bg = useHost(),
    V = iP(),
    pendingWorkerRequest = Se(a0t),
    z;
  if ($[0] !== V) ((z = V ? kT.of(V) : null), ($[0] = V), ($[1] = z));
  else z = $[1];
  let ee;
  if ($[2] !== param.id) ((ee = (le) => le.get(param.id)), ($[2] = param.id), ($[3] = ee));
  else ee = $[3];
  let [ge, ae] = a5(useStoreSelector(z, ee)),
    pe = ae?.status === "running",
    te = ae?.status === "failed" || ae?.status === "stopped",
    isClassifierCheckingRaw = rs(selectPendingWorkerRequest_2);
  (kp(param.id), Se(gM), rs(selectPermissionMode));
  let permissionMode = rs(selectActiveAgents);
  const J = isCloudMemoryCall === !0 && !verbose;
  let se;
  if ($[4] !== bg || $[5] !== param.name || $[6] !== J)
    ((se = displayOnlyMcpTool(param.name, bg, J)), ($[4] = bg), ($[5] = param.name), ($[6] = J), ($[7] = se));
  else se = $[7];
  let ye = se,
    Te = (void 0)?.type === "user" && (void 0).isVirtual === !0,
    Me;
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
        if ($[15] === MEMO_CACHE_SENTINEL) ((be = { notFound: "no-tools" }), ($[15] = be));
        else be = $[15];
        Me = be;
        break ve;
      }
      let Ue = findToolByName(tools, param.name) ?? ye;
      if (!Ue) {
        const be =
          param.name.startsWith("mcp__") ||
          param.name.startsWith("skill__") ||
          param.name === STRUCTUREDOUTPUT ||
          param.name === SUBAGENTHANDBACK ||
          _O(param.name) ||
          !1 ||
          param.name === "WebBrowser" ||
          RETIRED_TOOL_NAMES.has(param.name) ||
          getShadowedSearchToolNames().has(param.name) ||
          findToolByName(getAllBaseToolsFromRegistry() ?? [], param.name) !== void 0
            ? "expected-absent"
            : "unknown";
        let we;
        if ($[16] !== be) ((we = { notFound: be }), ($[16] = be), ($[17] = we));
        else we = $[17];
        Me = we;
        break ve;
      }
      let tool = safeParseToolInput(Ue, param.input);
      let De = tool.success ? tool.data : void 0;
      Me = {
        tool: Ue,
        input: tool,
        remoteHost: hwt(Ue, De),
        userFacingToolName: toolLabel ?? Ue.userFacingName(De, { activeAgents: permissionMode }),
        userFacingToolNameBackgroundColor: mcpRenderOverrideFor(Ue, "userFacingNameBackgroundColor")?.(De, {
          activeAgents: permissionMode,
        }),
        isTransparentWrapper: Ue.isTransparentWrapper?.() ?? !1,
      };
    }
    (($[8] = permissionMode),
      ($[9] = ye),
      ($[10] = param.input),
      ($[11] = param.name),
      ($[12] = toolLabel),
      ($[13] = tools),
      ($[14] = Me));
  } else Me = $[14];
  let xe = Me,
    Pe = "notFound" in xe ? xe.notFound : null,
    be,
    we;
  if ($[18] !== Pe || $[19] !== param.name)
    ((be = () => {
      if (Pe === "no-tools")
        logError(
          withTelemetryMessage(
            Error(`Tools array is undefined for tool ${param.name}`),
            `Tools array is undefined (mcp=${param.name.startsWith("mcp__")})`,
          ),
        );
      else if (Pe === "expected-absent")
        logForDebugging(`Tool ${param.name} not found in render-time tools`, { level: "error" });
      else if (Pe === "unknown")
        logError(withTelemetryMessage(Error(`Tool ${param.name} not found`), "Tool not found"));
    }),
      (we = [param.name, Pe]),
      ($[18] = Pe),
      ($[19] = param.name),
      ($[20] = be),
      ($[21] = we));
  else ((be = $[20]), (we = $[21]));
  P(be, we);
  let co;
  if ($[22] !== lookups.erroredToolUseIDs || $[23] !== param)
    ((co = countToolCallsSince_2(param, lookups.erroredToolUseIDs)),
      ($[22] = lookups.erroredToolUseIDs),
      ($[23] = param),
      ($[24] = co));
  else co = $[24];
  let qe = co;
  const Ke = qe !== null;
  let Ro, Uo, go, Xe, Ge, ao, uo, Eo, It, Ao, ht, Go, Tt, ss, Io, Mt, ho, bt, Do, So, Qe;
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
    $[41] !== V ||
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
        So = e(ThinkingMessage, { content: qe, addMargin: addMargin });
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
        $[85] !== V ||
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
          tool: tool,
          input: input,
          remoteHost: remoteHost,
          userFacingToolName: userFacingToolName,
          userFacingToolNameBackgroundColor: userFacingToolNameBackgroundColor,
          isTransparentWrapper: isTransparentWrapper,
        } = xe;
        Qe = tool;
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
          $[130] !== V ||
          $[131] !== shouldAnimate ||
          $[132] !== shouldShowDot ||
          $[133] !== terminalSize ||
          $[134] !== U ||
          $[135] !== Qe ||
          $[136] !== tools ||
          $[137] !== userFacingToolName ||
          $[138] !== userFacingToolNameBackgroundColor ||
          $[139] !== verbose
        ) {
          Ge = lookups.resolvedToolUseIDs.has(param.id) && !pe;
          Xe = !inProgressToolUseIDs.has(param.id) && !Ge && !pe;
          ao = isClassifierCheckingRaw?.toolUseId === param.id;
          let qo = lookups.toolResultByToolUseID.get(param.id);
          let ns = qo?.type === "user" ? qo.toolUseResult : void 0;
          if (isTransparentWrapper) {
            let Gs = Rp({
              param: param,
              isQueued: Xe,
              isResolved: Ge,
              isError: lookups.erroredToolUseIDs.has(param.id),
              shouldAnimate: shouldAnimate,
              shouldShowDot: shouldShowDot,
              addMargin: addMargin,
              progressMessagesForMessage: progressMessagesForMessage,
              resultMsg: qo,
            });
            if (Gs !== null) {
              So = Gs;
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
              $[166] !== Qe ||
              $[167] !== tools ||
              $[168] !== verbose
            )
              ((kt = renderToolUseProgressMessage_3(
                Qe,
                tools,
                lookups,
                param.id,
                progressMessagesForMessage,
                {
                  verbose: verbose,
                  inProgressToolCallCount: inProgressToolCallCount,
                  isTranscriptMode: isTranscriptMode,
                  activeAgents: permissionMode,
                },
                terminalSize,
              )),
                ($[159] = permissionMode),
                ($[160] = inProgressToolCallCount),
                ($[161] = isTranscriptMode),
                ($[162] = lookups),
                ($[163] = param.id),
                ($[164] = progressMessagesForMessage),
                ($[165] = terminalSize),
                ($[166] = Qe),
                ($[167] = tools),
                ($[168] = verbose),
                ($[169] = kt));
            else kt = $[169];
            So = r(Box, { flexDirection: "column", width: "100%", children: [null, kt] });
            break xr;
          }
          if (userFacingToolName === "") {
            So = null;
            break xr;
          }
          let as = input.success
            ? renderToolUseMessage_2(Qe, input.data, {
                theme: U,
                verbose: verbose,
                isTranscriptMode: isTranscriptMode,
                activeAgents: permissionMode,
                commands: commands,
                teammateAuthorOf: (Ms, Xm) => (V ? getTeammateAuthor(V, Ms, Xm) : null),
                toolUseResult: ns,
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
          Io = ge;
          Mt = "row";
          ho = "space-between";
          bt = addMargin ? 1 : 0;
          Do = "100%";
          Uo = Box;
          ss = "column";
          Ro = Box;
          uo = "row";
          Eo = "nowrap";
          It = bunStringWidth(userFacingToolName) + (shouldShowDot ? 2 : 0);
          Ao =
            shouldShowDot &&
            (Xe
              ? e(Box, {
                  minWidth: 2,
                  children: e(Text, { "aria-label": "tool:", dimColor: Xe, children: BLACK_CIRCLE }),
                })
              : e(ToolUseLoader, {
                  shouldAnimate: shouldAnimate || pe,
                  isUnresolved: !Ge,
                  isError: lookups.erroredToolUseIDs.has(param.id) || te,
                  isNeutral:
                    qo?.type === "user" &&
                    mcpRenderOverrideFor(
                      Qe,
                      "endedByChoice",
                    )?.({
                      toolDenialKind: qo.toolDenialKind,
                      output: ns,
                      hasProgress: filterToolProgressMessages(progressMessagesForMessage).length > 0,
                    }),
                }));
          if ($[170] !== userFacingToolName || $[171] !== userFacingToolNameBackgroundColor)
            ((ht = e(Box, {
              flexShrink: 0,
              children: e(TagTabs, {
                color: userFacingToolNameBackgroundColor,
                bold: !0,
                wrap: "truncate-end",
                children: userFacingToolName,
              }),
            })),
              ($[170] = userFacingToolName),
              ($[171] = userFacingToolNameBackgroundColor),
              ($[172] = ht));
          else ht = $[172];
          Go =
            as !== "" &&
            e(vFn.Provider, {
              value: verbose || pendingWorkerRequest ? null : max,
              children: e(Box, {
                flexWrap: "nowrap",
                children: r(Text, {
                  children: [
                    "(",
                    as,
                    ")",
                    remoteHost !== void 0 && r(Text, { dimColor: !0, children: [" \xB7 on ", remoteHost] }),
                  ],
                }),
              }),
            });
          Tt =
            input.success &&
            mcpRenderOverrideFor(Qe, "renderToolUseTag")?.(input.data, {
              toolUseId: param.id,
              toolUseResult: ns,
              progressMessages: lookups.progressMessagesByToolUseID.get(param.id),
            });
          (($[113] = permissionMode),
            ($[114] = addMargin),
            ($[115] = commands),
            ($[116] = ge),
            ($[117] = inProgressToolCallCount),
            ($[118] = inProgressToolUseIDs),
            ($[119] = input),
            ($[120] = te),
            ($[121] = pe),
            ($[122] = pendingWorkerRequest),
            ($[123] = isTranscriptMode),
            ($[124] = isTransparentWrapper),
            ($[125] = lookups),
            ($[126] = param),
            ($[127] = isClassifierCheckingRaw?.toolUseId),
            ($[128] = progressMessagesForMessage),
            ($[129] = remoteHost),
            ($[130] = V),
            ($[131] = shouldAnimate),
            ($[132] = shouldShowDot),
            ($[133] = terminalSize),
            ($[134] = U),
            ($[135] = Qe),
            ($[136] = tools),
            ($[137] = userFacingToolName),
            ($[138] = userFacingToolNameBackgroundColor),
            ($[139] = verbose),
            ($[140] = Ro),
            ($[141] = Uo),
            ($[142] = go),
            ($[143] = Xe),
            ($[144] = Ge),
            ($[145] = ao),
            ($[146] = uo),
            ($[147] = Eo),
            ($[148] = It),
            ($[149] = Ao),
            ($[150] = ht),
            ($[151] = Go),
            ($[152] = Tt),
            ($[153] = ss),
            ($[154] = Io),
            ($[155] = Mt),
            ($[156] = ho),
            ($[157] = bt),
            ($[158] = Do));
        } else
          ((Ro = $[140]),
            (Uo = $[141]),
            (go = $[142]),
            (Xe = $[143]),
            (Ge = $[144]),
            (ao = $[145]),
            (uo = $[146]),
            (Eo = $[147]),
            (It = $[148]),
            (Ao = $[149]),
            (ht = $[150]),
            (Go = $[151]),
            (Tt = $[152]),
            (ss = $[153]),
            (Io = $[154]),
            (Mt = $[155]),
            (ho = $[156]),
            (bt = $[157]),
            (Do = $[158]));
        (($[70] = permissionMode),
          ($[71] = addMargin),
          ($[72] = commands),
          ($[73] = ge),
          ($[74] = inProgressToolCallCount),
          ($[75] = inProgressToolUseIDs),
          ($[76] = te),
          ($[77] = pe),
          ($[78] = pendingWorkerRequest),
          ($[79] = isTranscriptMode),
          ($[80] = lookups),
          ($[81] = param),
          ($[82] = xe),
          ($[83] = isClassifierCheckingRaw?.toolUseId),
          ($[84] = progressMessagesForMessage),
          ($[85] = V),
          ($[86] = shouldAnimate),
          ($[87] = shouldShowDot),
          ($[88] = Je),
          ($[89] = terminalSize),
          ($[90] = U),
          ($[91] = tools),
          ($[92] = verbose),
          ($[93] = Ro),
          ($[94] = Uo),
          ($[95] = go),
          ($[96] = Xe),
          ($[97] = Ge),
          ($[98] = ao),
          ($[99] = uo),
          ($[100] = Eo),
          ($[101] = It),
          ($[102] = Ao),
          ($[103] = ht),
          ($[104] = Go),
          ($[105] = Tt),
          ($[106] = ss),
          ($[107] = Io),
          ($[108] = Mt),
          ($[109] = ho),
          ($[110] = bt),
          ($[111] = Do),
          ($[112] = Qe));
      } else
        ((Ro = $[93]),
          (Uo = $[94]),
          (go = $[95]),
          (Xe = $[96]),
          (Ge = $[97]),
          (ao = $[98]),
          (uo = $[99]),
          (Eo = $[100]),
          (It = $[101]),
          (Ao = $[102]),
          (ht = $[103]),
          (Go = $[104]),
          (Tt = $[105]),
          (ss = $[106]),
          (Io = $[107]),
          (Mt = $[108]),
          (ho = $[109]),
          (bt = $[110]),
          (Do = $[111]),
          (Qe = $[112]));
    }
    (($[25] = permissionMode),
      ($[26] = addMargin),
      ($[27] = commands),
      ($[28] = ge),
      ($[29] = inProgressToolCallCount),
      ($[30] = inProgressToolUseIDs),
      ($[31] = te),
      ($[32] = pe),
      ($[33] = pendingWorkerRequest),
      ($[34] = isTranscriptMode),
      ($[35] = lookups),
      ($[36] = param),
      ($[37] = xe),
      ($[38] = isClassifierCheckingRaw?.toolUseId),
      ($[39] = progressMessagesForMessage),
      ($[40] = qe),
      ($[41] = V),
      ($[42] = shouldAnimate),
      ($[43] = shouldShowDot),
      ($[44] = Ke),
      ($[45] = terminalSize),
      ($[46] = U),
      ($[47] = tools),
      ($[48] = verbose),
      ($[49] = Ro),
      ($[50] = Uo),
      ($[51] = go),
      ($[52] = Xe),
      ($[53] = Ge),
      ($[54] = ao),
      ($[55] = uo),
      ($[56] = Eo),
      ($[57] = It),
      ($[58] = Ao),
      ($[59] = ht),
      ($[60] = Go),
      ($[61] = Tt),
      ($[62] = ss),
      ($[63] = Io),
      ($[64] = Mt),
      ($[65] = ho),
      ($[66] = bt),
      ($[67] = Do),
      ($[68] = So),
      ($[69] = Qe));
  } else
    ((Ro = $[49]),
      (Uo = $[50]),
      (go = $[51]),
      (Xe = $[52]),
      (Ge = $[53]),
      (ao = $[54]),
      (uo = $[55]),
      (Eo = $[56]),
      (It = $[57]),
      (Ao = $[58]),
      (ht = $[59]),
      (Go = $[60]),
      (Tt = $[61]),
      (ss = $[62]),
      (Io = $[63]),
      (Mt = $[64]),
      (ho = $[65]),
      (bt = $[66]),
      (Do = $[67]),
      (So = $[68]),
      (Qe = $[69]));
  if (So !== EARLY_RETURN_SENTINEL) return So;
  let Je;
  if (
    $[173] !== Ro ||
    $[174] !== uo ||
    $[175] !== Eo ||
    $[176] !== It ||
    $[177] !== Ao ||
    $[178] !== ht ||
    $[179] !== Go ||
    $[180] !== Tt
  )
    ((Je = r(Ro, { flexDirection: uo, flexWrap: Eo, minWidth: It, children: [Ao, ht, Go, Tt] })),
      ($[173] = Ro),
      ($[174] = uo),
      ($[175] = Eo),
      ($[176] = It),
      ($[177] = Ao),
      ($[178] = ht),
      ($[179] = Go),
      ($[180] = Tt),
      ($[181] = Je));
  else Je = $[181];
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
    $[192] !== Qe ||
    $[193] !== tools ||
    $[194] !== verbose
  )
    ((No =
      !Ge &&
      (ao
        ? e(MessageResponse, {
            height: 1,
            children: e(Text, { dimColor: !0, children: "Waiting for permission\u2026" }),
          })
        : Xe
          ? renderToolUseQueuedMessage(Qe)
          : renderToolUseProgressMessage_3(
              Qe,
              tools,
              lookups,
              param.id,
              progressMessagesForMessage,
              {
                verbose: verbose,
                inProgressToolCallCount: inProgressToolCallCount,
                isTranscriptMode: isTranscriptMode,
                activeAgents: permissionMode,
              },
              terminalSize,
            ))),
      ($[182] = permissionMode),
      ($[183] = inProgressToolCallCount),
      ($[184] = Xe),
      ($[185] = Ge),
      ($[186] = isTranscriptMode),
      ($[187] = ao),
      ($[188] = lookups),
      ($[189] = param.id),
      ($[190] = progressMessagesForMessage),
      ($[191] = terminalSize),
      ($[192] = Qe),
      ($[193] = tools),
      ($[194] = verbose),
      ($[195] = No));
  else No = $[195];
  let kt;
  if ($[196] !== Uo || $[197] !== ss || $[198] !== Je || $[199] !== No)
    ((kt = r(Uo, { flexDirection: ss, children: [Je, No] })),
      ($[196] = Uo),
      ($[197] = ss),
      ($[198] = Je),
      ($[199] = No),
      ($[200] = kt));
  else kt = $[200];
  let ni;
  if (
    $[201] !== go ||
    $[202] !== Io ||
    $[203] !== Mt ||
    $[204] !== ho ||
    $[205] !== bt ||
    $[206] !== Do ||
    $[207] !== kt
  )
    ((ni = e(go, { ref: Io, flexDirection: Mt, justifyContent: ho, marginTop: bt, width: Do, children: kt })),
      ($[201] = go),
      ($[202] = Io),
      ($[203] = Mt),
      ($[204] = ho),
      ($[205] = bt),
      ($[206] = Do),
      ($[207] = kt),
      ($[208] = ni));
  else ni = $[208];
  return ni;
}
//@ chunk-ah34pb7m.js:76484-78187 layout
function ToolResultInline(m) {
  let $ = w(46),
    { addMargin: addMargin, call: c, verbose: verbose } = m,
    [f] = useTheme(),
    { tool: tool } = c,
    T,
    x,
    k,
    b,
    E,
    B,
    L,
    N,
    W,
    U,
    K;
  if (
    $[0] !== addMargin ||
    $[1] !== c.input ||
    $[2] !== c.status ||
    $[3] !== f ||
    $[4] !== tool ||
    $[5] !== verbose
  ) {
    let V = safeParseToolInput(tool, c.input);
    let Y = V.success ? V.data : void 0;
    b = Y === void 0 ? null : renderToolUseMessage_2(tool, Y, { theme: f, verbose: verbose });
    k = Box;
    U = "column";
    K = addMargin ? 1 : 0;
    x = Box;
    L = "row";
    N = "nowrap";
    const X = c.status !== "completed";
    if ($[17] !== X)
      ((W = e(ToolUseLoader, { shouldAnimate: !1, isUnresolved: !1, isError: X })), ($[17] = X), ($[18] = W));
    else W = $[18];
    T = Text;
    E = !0;
    B = tool.userFacingName(Y);
    (($[0] = addMargin),
      ($[1] = c.input),
      ($[2] = c.status),
      ($[3] = f),
      ($[4] = tool),
      ($[5] = verbose),
      ($[6] = T),
      ($[7] = x),
      ($[8] = k),
      ($[9] = b),
      ($[10] = E),
      ($[11] = B),
      ($[12] = L),
      ($[13] = N),
      ($[14] = W),
      ($[15] = U),
      ($[16] = K));
  } else
    ((T = $[6]),
      (x = $[7]),
      (k = $[8]),
      (b = $[9]),
      (E = $[10]),
      (B = $[11]),
      (L = $[12]),
      (N = $[13]),
      (W = $[14]),
      (U = $[15]),
      (K = $[16]));
  let X;
  if ($[19] !== T || $[20] !== E || $[21] !== B)
    ((X = e(T, { bold: E, children: B })), ($[19] = T), ($[20] = E), ($[21] = B), ($[22] = X));
  else X = $[22];
  let z;
  if ($[23] !== b)
    ((z = b !== null && b !== "" && r(Text, { children: ["(", b, ")"] })), ($[23] = b), ($[24] = z));
  else z = $[24];
  let ee;
  if ($[25] !== x || $[26] !== L || $[27] !== N || $[28] !== W || $[29] !== X || $[30] !== z)
    ((ee = r(x, { flexDirection: L, flexWrap: N, children: [W, X, z] })),
      ($[25] = x),
      ($[26] = L),
      ($[27] = N),
      ($[28] = W),
      ($[29] = X),
      ($[30] = z),
      ($[31] = ee));
  else ee = $[31];
  let le;
  if (
    $[32] !== c.data ||
    $[33] !== c.input ||
    $[34] !== c.status ||
    $[35] !== c.text ||
    $[36] !== f ||
    $[37] !== tool ||
    $[38] !== verbose
  )
    ((le =
      c.status === "completed"
        ? (mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(c.data, [], {
            theme: f,
            tools: [],
            verbose: verbose,
            input: c.input,
          }) ?? null)
        : c.status === "stopped"
          ? e(RejectedToolUseMessage, {})
          : e(FallbackToolUseErrorMessage, { result: c.text, verbose: verbose })),
      ($[32] = c.data),
      ($[33] = c.input),
      ($[34] = c.status),
      ($[35] = c.text),
      ($[36] = f),
      ($[37] = tool),
      ($[38] = verbose),
      ($[39] = le));
  else le = $[39];
  let ge;
  if ($[40] !== k || $[41] !== ee || $[42] !== le || $[43] !== U || $[44] !== K)
    ((ge = r(k, { flexDirection: U, marginTop: K, children: [ee, le] })),
      ($[40] = k),
      ($[41] = ee),
      ($[42] = le),
      ($[43] = U),
      ($[44] = K),
      ($[45] = ge));
  else ge = $[45];
  return ge;
}
/**
 * 安全调用 tool.renderToolUseMessage，异常时记录 "Error rendering tool use message for <tool>"（MCP 名脱敏）。
 */
//@ chunk-ah34pb7m.js:78187-78421 fingerprint = renderToolUseMessage (0.389)
function renderToolUseMessage_2(tool, input, c) {
  let g = describeUnparsedInput(input);
  if (g !== null) return g;
  try {
    return renderToolUseMessageFor(tool, input, c);
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          Error(`Error rendering tool use message for ${tool.name}: ${error}`),
          `Error rendering tool use message (mcp=${tool.name.startsWith("mcp__")})`,
        ),
      ),
      ""
    );
  }
}
//@ chunk-ah34pb7m.js:78421-79021 fingerprint = renderToolUseProgressMessage (0.741)
function renderToolUseProgressMessage_3(
  tool,
  tools,
  lookups,
  toolUseID,
  progressMessagesForMessage,
  {
    verbose: verbose,
    inProgressToolCallCount: inProgressToolCallCount,
    isTranscriptMode: isTranscriptMode,
    activeAgents: activeAgents,
  },
  terminalSize,
) {
  let toolProgressMessages = progressMessagesForMessage.filter((msg) => msg.data.type !== "hook_progress");
  try {
    let toolMessages =
      mcpRenderOverrideFor(tool, "renderToolUseProgressMessage")?.(toolProgressMessages, {
        tools: tools,
        verbose: verbose,
        terminalSize: terminalSize,
        inProgressToolCallCount: inProgressToolCallCount ?? 1,
        isTranscriptMode: isTranscriptMode,
        activeAgents: activeAgents,
      }) ?? null;
    return r(Fragment, {
      children: [
        e(SentryErrorBoundary, {
          children: e(HookProgressMessage, {
            hookEvent: "PreToolUse",
            lookups: lookups,
            toolUseID: toolUseID,
            isTranscriptMode: isTranscriptMode,
          }),
        }),
        toolMessages,
      ],
    });
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          Error(`Error rendering tool use progress message for ${tool.name}: ${error}`),
          `Error rendering tool use progress message (mcp=${tool.name.startsWith("mcp__")})`,
        ),
      ),
      null
    );
  }
}
//@ chunk-ah34pb7m.js:79021-79262 fingerprint = renderToolUseQueuedMessage (0.388)
function renderToolUseQueuedMessage(tool) {
  try {
    return mcpRenderOverrideFor(tool, "renderToolUseQueuedMessage")?.();
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          Error(`Error rendering tool use queued message for ${tool.name}: ${error}`),
          `Error rendering tool use queued message (mcp=${tool.name.startsWith("mcp__")})`,
        ),
      ),
      null
    );
  }
}
//@ chunk-18hwfzwa.js:433138-433186 fingerprint = _temp (1)
function selectPendingWorkerRequest(state) {
  return state.pendingWorkerRequest;
}

export { selectPendingWorkerRequest, ToolResultInline, ToolUseStatusDot };
