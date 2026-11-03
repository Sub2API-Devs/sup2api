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
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { _mt } from "../../components/ToolStatusLabels.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { OutputLine } from "../../components/shell/OutputLine.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { ShellTimeDisplay } from "../../components/shell/ShellTimeDisplay.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { exceedsLineLimit } from "../../utils/terminal.js";

//@ chunk-hkh7sq9y.js:5013-5027 affinity
var MAX_COMMAND_DISPLAY_LINES = 2,
  MAX_COMMAND_DISPLAY_CHARS = 160;
/**
 * PowerShell 工具调用的显示：非 verbose 时命令超过 2 行或 160 字符则截断加省略号。
 */
//@ chunk-hkh7sq9y.js:5027-5285 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage(input, { verbose: verbose, theme: theme }) {
  let { command: command } = input;
  if (!command) return null;
  let m = command;
  if (!verbose) {
    let parts = m.split(`
`),
      t = parts.length > MAX_COMMAND_DISPLAY_LINES,
      d = m.length > MAX_COMMAND_DISPLAY_CHARS;
    if (t || d) {
      let a = m;
      if (t)
        a = parts.slice(0, MAX_COMMAND_DISPLAY_LINES).join(`
`);
      if (a.length > MAX_COMMAND_DISPLAY_CHARS) a = a.slice(0, MAX_COMMAND_DISPLAY_CHARS);
      return r(Text, { children: [a.trim(), "\u2026"] });
    }
  }
  return m;
}
//@ chunk-hkh7sq9y.js:5608-5634 placement
function w() {
  return _mt();
}
/**
 * PowerShell 结果渲染：图片提示、stdout/stderr、后台运行/Interrupted/返回码解释/(No output)、超时显示。
 */
//@ chunk-hkh7sq9y.js:5634-6325 fingerprint = renderToolResultMessage (0.799)
function renderToolResultMessage(
  content,
  progressMessagesForMessage,
  { verbose: verbose, theme: theme, tools: tools, style: style },
) {
  let timeoutMs = progressMessagesForMessage.at(-1)?.data?.timeoutMs,
    {
      stdout: stdout,
      stderr: stderr,
      interrupted: interrupted,
      returnCodeInterpretation: returnCodeInterpretation,
      isImage: isImage,
      backgroundTaskId: backgroundTaskId,
    } = content;
  if (isImage)
    return e(MessageResponse, {
      height: 1,
      children: e(Text, { dimColor: !0, children: "[Image data detected and sent to Claude]" }),
    });
  return r(Box, {
    flexDirection: "column",
    children: [
      stdout !== "" ? e(OutputLine, { content: stdout, verbose: verbose }) : null,
      stderr.trim() !== "" ? e(OutputLine, { content: stderr, verbose: verbose, isError: !0 }) : null,
      backgroundTaskId || (stdout === "" && stderr.trim() === "")
        ? e(MessageResponse, {
            height: 1,
            children: e(Text, {
              dimColor: !0,
              children: backgroundTaskId
                ? r(Fragment, {
                    children: [
                      "Running in the background",
                      " ",
                      e(KeyboardShortcutHint, { chord: "down", action: "manage", parens: !0 }),
                    ],
                  })
                : interrupted
                  ? "Interrupted"
                  : returnCodeInterpretation || "(No output)",
            }),
          })
        : null,
      timeoutMs ? e(MessageResponse, { children: e(ShellTimeDisplay, { timeoutMs: timeoutMs }) }) : null,
    ],
  });
}
//@ chunk-hkh7sq9y.js:6325-6422 placement = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage(
  result,
  { verbose: verbose, progressMessagesForMessage: progressMessagesForMessage, tools: tools },
) {
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
//@ chunk-hkh7sq9y.js:6422-6508 placement
function A(o, { columns: columns }) {
  if (o.isImage) return !1;
  return exceedsLineLimit(o.stdout, columns) || exceedsLineLimit(o.stderr, columns);
}
