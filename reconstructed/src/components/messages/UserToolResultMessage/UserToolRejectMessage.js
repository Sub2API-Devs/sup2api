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
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { rs } from "../../../state/AppState.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { mcpRenderOverrideFor } from "../../Message.js";
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./RejectedToolUseMessage.js";
import { safeParseToolInput, filterToolProgressMessages } from "../../../Tool.js";

//@ chunk-ah34pb7m.js:217416-217470 affinity
function mj(Y) {
  return Y.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:217470-218291 fingerprint = UserToolRejectMessage (0.451)
function UserToolRejectMessage(t0) {
  let $ = w(15),
    {
      input: input,
      progressMessagesForMessage: progressMessagesForMessage,
      isInterrupted: isInterrupted,
      style: style,
      tool: tool,
      tools: tools,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
    } = t0,
    { columns: columns } = useTerminalSize(),
    [b] = useTheme(),
    E = rs(mj),
    L,
    N;
  if (
    $[0] !== E ||
    $[1] !== columns ||
    $[2] !== input ||
    $[3] !== isInterrupted ||
    $[4] !== isTranscriptMode ||
    $[5] !== progressMessagesForMessage ||
    $[6] !== style ||
    $[7] !== b ||
    $[8] !== tool ||
    $[9] !== tools ||
    $[10] !== verbose
  ) {
    N = EARLY_RETURN_SENTINEL;
    K: {
      let W = tool ? mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage") : void 0;
      if (!tool || !W) {
        let U;
        if ($[13] === MEMO_CACHE_SENTINEL) ((U = e(RejectedToolUseMessage, {})), ($[13] = U));
        else U = $[13];
        N = U;
        break K;
      }
      let V = safeParseToolInput(tool, input);
      if (!V.success) {
        let U;
        if ($[14] === MEMO_CACHE_SENTINEL) ((U = e(RejectedToolUseMessage, {})), ($[14] = U));
        else U = $[14];
        N = U;
        break K;
      }
      L =
        W(V.data, {
          columns: columns,
          messages: [],
          tools: tools,
          verbose: verbose,
          progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
          isInterrupted: isInterrupted,
          style: style,
          theme: b,
          isTranscriptMode: isTranscriptMode,
          activeAgents: E,
        }) ?? e(RejectedToolUseMessage, {});
    }
    (($[0] = E),
      ($[1] = columns),
      ($[2] = input),
      ($[3] = isInterrupted),
      ($[4] = isTranscriptMode),
      ($[5] = progressMessagesForMessage),
      ($[6] = style),
      ($[7] = b),
      ($[8] = tool),
      ($[9] = tools),
      ($[10] = verbose),
      ($[11] = L),
      ($[12] = N));
  } else ((L = $[11]), (N = $[12]));
  if (N !== EARLY_RETURN_SENTINEL) return N;
  return L;
}

export { UserToolRejectMessage };
