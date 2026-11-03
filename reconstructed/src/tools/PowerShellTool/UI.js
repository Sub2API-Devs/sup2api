/**
 * tools/PowerShellTool/UI.tsx
 *
 * PowerShell 工具的调用与结果渲染
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/UI.tsx
 * pieces: chunk-hkh7sq9y.js (6)
 * attribution: affinity 1, fingerprint 2, placement 3
 */
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { WaitingLabel } from "../../components/ToolStatusLabels.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ShellTimeDisplay } from "../../components/shell/ShellTimeDisplay.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { exceedsLineLimit } from "../../utils/terminal.js";

//@ chunk-hkh7sq9y.js:5013-5027 affinity
var MAX_COMMAND_DISPLAY_LINES = 2;
var MAX_COMMAND_DISPLAY_CHARS = 160;
//@ chunk-hkh7sq9y.js:5027-5285 fingerprint = renderToolUseMessage (1)
/**
 * PowerShell 工具调用的显示：非 verbose 时命令超过 2 行或 160 字符则截断加省略号。
 */
function renderToolUseMessage(input, { verbose, theme: _theme }) {
  let { command } = input;
  if (!command) return null;
  let displayCommand = command;
  if (!verbose) {
    let lines = displayCommand.split(`
`);
    let needsLineTruncation = lines.length > MAX_COMMAND_DISPLAY_LINES;
    let needsCharTruncation = displayCommand.length > MAX_COMMAND_DISPLAY_CHARS;
    if (needsLineTruncation || needsCharTruncation) {
      let truncated = displayCommand;
      if (needsLineTruncation)
        truncated = lines.slice(0, MAX_COMMAND_DISPLAY_LINES).join(`
`);
      if (truncated.length > MAX_COMMAND_DISPLAY_CHARS)
        truncated = truncated.slice(0, MAX_COMMAND_DISPLAY_CHARS);
      return jsxProd_default_2(Text, {
        children: [truncated.trim(), "\u2026"],
      });
    }
  }
  return displayCommand;
}
//@ chunk-hkh7sq9y.js:5608-5634 placement
/**
 * 工具调用排队中的渲染入口（转给结果渲染组件）。
 */
function renderToolUseQueuedMessage() {
  return WaitingLabel();
}
//@ chunk-hkh7sq9y.js:5634-6325 fingerprint = renderToolResultMessage (0.799)
/**
 * PowerShell 结果渲染：图片提示、stdout/stderr、后台运行/Interrupted/返回码解释/(No output)、超时显示。
 */
function renderToolResultMessage(
  content,
  progressMessagesForMessage,
  { verbose, theme: _theme, tools: _tools, style: _style },
) {
  let timeoutMs = progressMessagesForMessage.at(-1)?.data?.timeoutMs;
  let { stdout, stderr, interrupted, returnCodeInterpretation, isImage, backgroundTaskId } = content;
  if (isImage)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "[Image data detected and sent to Claude]",
      }),
    });
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      stdout !== ""
        ? jsxProd_default(OutputLine, {
            content: stdout,
            verbose,
          })
        : null,
      stderr.trim() !== ""
        ? jsxProd_default(OutputLine, {
            content: stderr,
            verbose,
            isError: true,
          })
        : null,
      backgroundTaskId || (stdout === "" && stderr.trim() === "")
        ? jsxProd_default(MessageResponse, {
            height: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: backgroundTaskId
                ? jsxProd_default_2(Fragment, {
                    children: [
                      "Running in the background",
                      " ",
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "down",
                        action: "manage",
                        parens: true,
                      }),
                    ],
                  })
                : interrupted
                  ? "Interrupted"
                  : returnCodeInterpretation || "(No output)",
            }),
          })
        : null,
      timeoutMs
        ? jsxProd_default(MessageResponse, {
            children: jsxProd_default(ShellTimeDisplay, {
              timeoutMs,
            }),
          })
        : null,
    ],
  });
}
//@ chunk-hkh7sq9y.js:6325-6422 placement = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage(
  result,
  { verbose, progressMessagesForMessage: _progressMessagesForMessage, tools: _tools },
) {
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-hkh7sq9y.js:6422-6508 placement
/**
 * 非图片时，stdout 或 stderr 超出终端行数则返回 true。
 */
function isResultTruncated(o, { columns }) {
  if (o.isImage) return false;
  return exceedsLineLimit(o.stdout, columns) || exceedsLineLimit(o.stderr, columns);
}
