/**
 * components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx
 *
 * 工具成功结果：调用工具的 renderToolResultMessage，"Allowed by auto mode" 标记与 PostToolUse hook 进度。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx
 * pieces: chunk-ah34pb7m.js (4)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1
 */
import { j, y, P } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../../context/session.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { useFrameRegistry, parseRenderModeValue } from "../../../ink/renderModeContext.js";
import { useAppState, Cr } from "../../../state/AppState.js";
import {
  hUo,
  deleteClassifierApproval,
  makeClassifierApprovalsSetter,
} from "../../../utils/permissions/permissions.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { filterToolProgressMessages } from "../../../Tool.js";
import { guardPrimitiveToolResult } from "../toolResultRendering.js";
import { AGENT } from "../../../tools/AgentTool/constants.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../MessageResponse.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { SentryErrorBoundary } from "../../SentryErrorBoundary.js";
import { HookProgressMessage } from "../HookProgressMessage.js";

//@ chunk-ah34pb7m.js:218291-218295 sole-consumer
j();
//@ chunk-ah34pb7m.js:218295-218333 sole-consumer
function selectIsBriefOnly(ve) {
  return ve.isBriefOnly;
}
//@ chunk-ah34pb7m.js:218333-218389 affinity
function selectActiveAgents_2(Ue) {
  return Ue.agentDefinitions.activeAgents;
}
/**
 * 工具成功结果：调用 tool.renderToolResultMessage(output, progress, {verbose, theme, …})，auto 模式放行时附 "Allowed by auto mode"，并显示 PostToolUse hook 进度。
 */
//@ chunk-ah34pb7m.js:218389-220401 fingerprint = UserToolSuccessMessage (0.657)
function UserToolSuccessMessage(m) {
  let $ = w(40),
    {
      message: message,
      lookups: lookups,
      toolUseID: toolUseID,
      progressMessagesForMessage: progressMessagesForMessage,
      style: style,
      tool: tool,
      tools: tools,
      verbose: verbose,
      width: width,
      isTranscriptMode: isTranscriptMode,
    } = m,
    E = useHost(),
    [B] = useTheme(),
    L = useFrameRegistry(),
    isBriefOnly = useAppState(selectIsBriefOnly),
    activeAgents = useAppState(selectActiveAgents_2),
    U = Cr(),
    V;
  if ($[0] !== U || $[1] !== toolUseID)
    ((V = () => hUo(U.getState(), toolUseID)), ($[0] = U), ($[1] = toolUseID), ($[2] = V));
  else V = $[2];
  let [Y] = y(V),
    X;
  if ($[3] !== U.setState || $[4] !== toolUseID)
    ((X = () => {
      deleteClassifierApproval(makeClassifierApprovalsSetter(U.setState), toolUseID);
    }),
      ($[3] = U.setState),
      ($[4] = toolUseID),
      ($[5] = X));
  else X = $[5];
  let z;
  if ($[6] !== U || $[7] !== toolUseID) ((z = [U, toolUseID]), ($[6] = U), ($[7] = toolUseID), ($[8] = z));
  else z = $[8];
  if ((P(X, z), !message.toolUseResult || !tool)) {
    return null;
  }
  if (tool.isTransparentWrapper?.()) {
    return null;
  }
  let ee, le, ge;
  if (
    $[9] !== activeAgents ||
    $[10] !== E ||
    $[11] !== isBriefOnly ||
    $[12] !== isTranscriptMode ||
    $[13] !== lookups ||
    $[14] !== message.toolUseResult ||
    $[15] !== progressMessagesForMessage ||
    $[16] !== L ||
    $[17] !== style ||
    $[18] !== B ||
    $[19] !== tool ||
    $[20] !== toolUseID ||
    $[21] !== tools ||
    $[22] !== verbose
  ) {
    ge = EARLY_RETURN_SENTINEL;
    pe: {
      let ae = parseRenderModeValue(L, tool.outputSchema, message.toolUseResult);
      if (ae && !ae.success) {
        ge = null;
        break pe;
      }
      let te = ae ? ae.data : message.toolUseResult;
      let de = te;
      let ue =
        mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(
          de,
          filterToolProgressMessages(progressMessagesForMessage),
          {
            style: style,
            theme: B,
            tools: tools,
            verbose: verbose,
            isTranscriptMode: isTranscriptMode,
            isBriefOnly: isBriefOnly,
            input: lookups.toolUseByToolUseID.get(toolUseID)?.input,
            activeAgents: activeAgents,
          },
        ) ?? null;
      if (ue === null) {
        ge = null;
        break pe;
      }
      ee = tool.userFacingName(void 0) === "";
      le = guardPrimitiveToolResult(E, ue, tool);
    }
    (($[9] = activeAgents),
      ($[10] = E),
      ($[11] = isBriefOnly),
      ($[12] = isTranscriptMode),
      ($[13] = lookups),
      ($[14] = message.toolUseResult),
      ($[15] = progressMessagesForMessage),
      ($[16] = L),
      ($[17] = style),
      ($[18] = B),
      ($[19] = tool),
      ($[20] = toolUseID),
      ($[21] = tools),
      ($[22] = verbose),
      ($[23] = ee),
      ($[24] = le),
      ($[25] = ge));
  } else ((ee = $[23]), (le = $[24]), (ge = $[25]));
  if (ge !== EARLY_RETURN_SENTINEL) return ge;
  let J = le;
  const se = ee ? void 0 : width;
  let ye;
  if ($[26] !== tool.name || $[27] !== Y)
    ((ye =
      Y &&
      tool.name !== AGENT &&
      e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: "Allowed by auto mode" }),
      })),
      ($[26] = tool.name),
      ($[27] = Y),
      ($[28] = ye));
  else ye = $[28];
  let Te;
  if ($[29] !== J || $[30] !== se || $[31] !== ye)
    ((Te = r(Box, { flexDirection: "column", width: se, children: [J, ye] })),
      ($[29] = J),
      ($[30] = se),
      ($[31] = ye),
      ($[32] = Te));
  else Te = $[32];
  let Me;
  if ($[33] !== isTranscriptMode || $[34] !== lookups || $[35] !== toolUseID)
    ((Me = e(SentryErrorBoundary, {
      children: e(HookProgressMessage, {
        hookEvent: "PostToolUse",
        lookups: lookups,
        toolUseID: toolUseID,
        isTranscriptMode: isTranscriptMode,
      }),
    })),
      ($[33] = isTranscriptMode),
      ($[34] = lookups),
      ($[35] = toolUseID),
      ($[36] = Me));
  else Me = $[36];
  let be;
  if ($[37] !== Te || $[38] !== Me)
    ((be = r(Box, { flexDirection: "column", children: [Te, Me] })),
      ($[37] = Te),
      ($[38] = Me),
      ($[39] = be));
  else be = $[39];
  return be;
}

export { UserToolSuccessMessage };
