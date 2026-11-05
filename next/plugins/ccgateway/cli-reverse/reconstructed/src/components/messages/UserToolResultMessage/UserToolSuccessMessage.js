/**
 * components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx
 *
 * 工具成功结果：调用工具的 renderToolResultMessage，"Allowed by auto mode" 标记与 PostToolUse hook 进度。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolSuccessMessage.tsx
 * pieces: chunk-6gyvmn2t.js (1), chunk-wjygkcr4.js (3)
 * attribution: placement 1, sole-consumer 1, affinity 1, fingerprint 1
 */
import { init_react_production, useState, useEffect } from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useHost } from "../../../context/session.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { useFrameRegistry, parseRenderModeValue } from "../../../ink/renderModeContext.js";
import { useAppState, useAppStoreDirect } from "../../../state/AppState.js";
import {
  classifierApprovalFor,
  deleteClassifierApproval,
  makeClassifierApprovalsSetter,
} from "../../../utils/permissions/permissions.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { filterToolProgressMessages } from "../../../Tool.js";
import { guardPrimitiveToolResult } from "../toolResultRendering.js";
import { AGENT } from "../../../tools/AgentTool/constants.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../MessageResponse.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { SentryErrorBoundary } from "../../SentryErrorBoundary.js";
import { HookProgressMessage } from "../HookProgressMessage.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-6gyvmn2t.js:527-531 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6gyvmn2t.js:527", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:225236-225274 sole-consumer
function selectIsBriefOnly(state) {
  return state.isBriefOnly;
}
//@ chunk-wjygkcr4.js:225274-225330 affinity
function selectActiveAgents_5(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-wjygkcr4.js:225330-227346 fingerprint (2.1.88 match: UserToolSuccessMessage, 0.657)
/**
 * 工具成功结果：调用 tool.renderToolResultMessage(output, progress, {verbose, theme, …})，auto 模式放行时附 "Allowed by auto mode"，并显示 PostToolUse hook 进度。
 */
function UserToolSuccessMessage(props) {
  let $ = useMemoCache(40);
  let {
    message,
    lookups,
    toolUseID,
    progressMessagesForMessage,
    style,
    tool,
    tools,
    verbose,
    width,
    isTranscriptMode,
  } = props;
  let host = useHost();
  let [theme] = useTheme();
  let frameRegistry = useFrameRegistry();
  let isBriefOnly = useAppState(selectIsBriefOnly);
  let activeAgents = useAppState(selectActiveAgents_5);
  let appStoreDirect = useAppStoreDirect();
  let approvalSelector;
  if ($[0] !== appStoreDirect || $[1] !== toolUseID) {
    approvalSelector = () => classifierApprovalFor(appStoreDirect.getState(), toolUseID);
    $[0] = appStoreDirect;
    $[1] = toolUseID;
    $[2] = approvalSelector;
  } else approvalSelector = $[2];
  let [approval] = useState(approvalSelector);
  let statusText;
  if ($[3] !== appStoreDirect.setState || $[4] !== toolUseID) {
    statusText = () => {
      deleteClassifierApproval(makeClassifierApprovalsSetter(appStoreDirect.setState), toolUseID);
    };
    $[3] = appStoreDirect.setState;
    $[4] = toolUseID;
    $[5] = statusText;
  } else statusText = $[5];
  let resultElement;
  if ($[6] !== appStoreDirect || $[7] !== toolUseID) {
    resultElement = [appStoreDirect, toolUseID];
    $[6] = appStoreDirect;
    $[7] = toolUseID;
    $[8] = resultElement;
  } else resultElement = $[8];
  useEffect(statusText, resultElement);
  if (!message.toolUseResult || !tool) {
    return null;
  }
  if (tool.isTransparentWrapper?.()) {
    return null;
  }
  let headerElement;
  let bodyElement;
  let hintElement;
  if (
    $[9] !== activeAgents ||
    $[10] !== host ||
    $[11] !== isBriefOnly ||
    $[12] !== isTranscriptMode ||
    $[13] !== lookups ||
    $[14] !== message.toolUseResult ||
    $[15] !== progressMessagesForMessage ||
    $[16] !== frameRegistry ||
    $[17] !== style ||
    $[18] !== theme ||
    $[19] !== tool ||
    $[20] !== toolUseID ||
    $[21] !== tools ||
    $[22] !== verbose
  ) {
    hintElement = EARLY_RETURN_SENTINEL;
    ge: {
      let renderModeValue = parseRenderModeValue(frameRegistry, tool.outputSchema, message.toolUseResult);
      if (renderModeValue && !renderModeValue.success) {
        hintElement = null;
        break ge;
      }
      let containerElement = renderModeValue ? renderModeValue.data : message.toolUseResult;
      let rowElement = containerElement;
      let columnElement =
        mcpRenderOverrideFor(tool, "renderToolResultMessage")?.(
          rowElement,
          filterToolProgressMessages(progressMessagesForMessage),
          {
            style,
            theme,
            tools,
            verbose,
            isTranscriptMode,
            isBriefOnly,
            input: lookups.toolUseByToolUseID.get(toolUseID)?.input,
            activeAgents,
          },
        ) ?? null;
      if (columnElement === null) {
        hintElement = null;
        break ge;
      }
      headerElement = tool.userFacingName(undefined) === "";
      bodyElement = guardPrimitiveToolResult(host, columnElement, tool);
    }
    $[9] = activeAgents;
    $[10] = host;
    $[11] = isBriefOnly;
    $[12] = isTranscriptMode;
    $[13] = lookups;
    $[14] = message.toolUseResult;
    $[15] = progressMessagesForMessage;
    $[16] = frameRegistry;
    $[17] = style;
    $[18] = theme;
    $[19] = tool;
    $[20] = toolUseID;
    $[21] = tools;
    $[22] = verbose;
    $[23] = headerElement;
    $[24] = bodyElement;
    $[25] = hintElement;
  } else {
    headerElement = $[23];
    bodyElement = $[24];
    hintElement = $[25];
  }
  if (hintElement !== EARLY_RETURN_SENTINEL) return hintElement;
  let outerElement = bodyElement;
  const width_2 = headerElement ? undefined : width;
  let autoModeNote;
  if ($[26] !== tool.name || $[27] !== approval) {
    autoModeNote =
      approval &&
      tool.name !== AGENT &&
      jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Allowed by auto mode",
        }),
      });
    $[26] = tool.name;
    $[27] = approval;
    $[28] = autoModeNote;
  } else autoModeNote = $[28];
  let successColumn;
  if ($[29] !== outerElement || $[30] !== width_2 || $[31] !== autoModeNote) {
    successColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: width_2,
      children: [outerElement, autoModeNote],
    });
    $[29] = outerElement;
    $[30] = width_2;
    $[31] = autoModeNote;
    $[32] = successColumn;
  } else successColumn = $[32];
  let sentryErrorBoundaryElement;
  if ($[33] !== isTranscriptMode || $[34] !== lookups || $[35] !== toolUseID) {
    sentryErrorBoundaryElement = jsxProd_default(SentryErrorBoundary, {
      children: jsxProd_default(HookProgressMessage, {
        hookEvent: "PostToolUse",
        lookups,
        toolUseID,
        isTranscriptMode,
      }),
    });
    $[33] = isTranscriptMode;
    $[34] = lookups;
    $[35] = toolUseID;
    $[36] = sentryErrorBoundaryElement;
  } else sentryErrorBoundaryElement = $[36];
  let successOuter;
  if ($[37] !== successColumn || $[38] !== sentryErrorBoundaryElement) {
    successOuter = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [successColumn, sentryErrorBoundaryElement],
    });
    $[37] = successColumn;
    $[38] = sentryErrorBoundaryElement;
    $[39] = successOuter;
  } else successOuter = $[39];
  return successOuter;
}
export { UserToolSuccessMessage };
