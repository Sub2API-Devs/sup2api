/**
 * tools/TaskStopTool/UI.tsx
 *
 * TaskStop 结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskStopTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { truncateFindingSummary } from "../ReportFindingsTool/UI.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";

/**
 * TaskStop 结果渲染："<命令> · stopped"。
 */
//@ chunk-ah34pb7m.js:29236-29385 fingerprint = renderToolResultMessage (0.756)
function renderToolResultMessage_8(output, _progressMessagesForMessage, { verbose: verbose }) {
  let rawCommand = output.command ?? "",
    f = verbose ? rawCommand : truncateFindingSummary(rawCommand);
  return e(MessageResponse, {
    children: r(Text, { children: [f, f !== rawCommand ? "\u2026 \xB7 stopped" : " \xB7 stopped"] }),
  });
}

export { renderToolResultMessage_8 };
