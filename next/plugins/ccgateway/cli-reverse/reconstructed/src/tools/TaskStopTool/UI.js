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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:29236-29385 fingerprint (2.1.88 match: renderToolResultMessage, 0.756)
/**
 * TaskStop 结果渲染："<命令> · stopped"。
 */
function renderToolResultMessage_8(output, _progressMessagesForMessage, { verbose }) {
  let rawCommand = output.command ?? "";
  let command = verbose ? rawCommand : truncateFindingSummary(rawCommand);
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [command, command !== rawCommand ? "\u2026 \xB7 stopped" : " \xB7 stopped"],
    }),
  });
}
export { renderToolResultMessage_8 };
