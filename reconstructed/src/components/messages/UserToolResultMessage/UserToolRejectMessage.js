/**
 * components/messages/UserToolResultMessage/UserToolRejectMessage.tsx
 *
 * 工具拒绝结果：调用工具的 renderToolUseRejectedMessage。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/UserToolRejectMessage.tsx
 * pieces: chunk-ah34pb7m.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { useAppStateSlice } from "../../../state/AppState.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { jsxProd_default } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { safeParseToolInput, filterToolProgressMessages } from "../../../Tool.js";

//@ chunk-ah34pb7m.js:217416-217470 affinity
function selectActiveAgents_4_2(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:217470-218291 fingerprint = UserToolRejectMessage (0.451)
function UserToolRejectMessage(props) {
  let $ = useMemoCache(15);
  let { input, progressMessagesForMessage, isInterrupted, style, tool, tools, verbose, isTranscriptMode } =
    props;
  let { columns } = useTerminalSize();
  let [theme] = useTheme();
  let activeAgents = useAppStateSlice(selectActiveAgents_4_2);
  let children;
  let rejectedElement;
  if (
    $[0] !== activeAgents ||
    $[1] !== columns ||
    $[2] !== input ||
    $[3] !== isInterrupted ||
    $[4] !== isTranscriptMode ||
    $[5] !== progressMessagesForMessage ||
    $[6] !== style ||
    $[7] !== theme ||
    $[8] !== tool ||
    $[9] !== tools ||
    $[10] !== verbose
  ) {
    rejectedElement = EARLY_RETURN_SENTINEL;
    K: {
      let override = tool ? mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage") : undefined;
      if (!tool || !override) {
        let rejectedToolUseMessageElement;
        if ($[13] === MEMO_CACHE_SENTINEL) {
          rejectedToolUseMessageElement = jsxProd_default(RejectedToolUseMessage, {});
          $[13] = rejectedToolUseMessageElement;
        } else rejectedToolUseMessageElement = $[13];
        rejectedElement = rejectedToolUseMessageElement;
        break K;
      }
      let parsedInput = safeParseToolInput(tool, input);
      if (!parsedInput.success) {
        let t4;
        if ($[14] === MEMO_CACHE_SENTINEL) {
          t4 = jsxProd_default(RejectedToolUseMessage, {});
          $[14] = t4;
        } else t4 = $[14];
        rejectedElement = t4;
        break K;
      }
      children =
        override(parsedInput.data, {
          columns,
          messages: [],
          tools,
          verbose,
          progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
          isInterrupted,
          style,
          theme,
          isTranscriptMode,
          activeAgents,
        }) ?? jsxProd_default(RejectedToolUseMessage, {});
    }
    $[0] = activeAgents;
    $[1] = columns;
    $[2] = input;
    $[3] = isInterrupted;
    $[4] = isTranscriptMode;
    $[5] = progressMessagesForMessage;
    $[6] = style;
    $[7] = theme;
    $[8] = tool;
    $[9] = tools;
    $[10] = verbose;
    $[11] = children;
    $[12] = rejectedElement;
  } else {
    children = $[11];
    rejectedElement = $[12];
  }
  if (rejectedElement !== EARLY_RETURN_SENTINEL) return rejectedElement;
  return children;
}
export { UserToolRejectMessage };
