/**
 * tools/BashTool/UI.tsx
 *
 * Bash 工具的渲染函数：Ctrl+B 转后台提示、进度消息、结果与错误消息
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/UI.tsx
 * pieces: chunk-4hpb3crc.js (1), chunk-p5q1xrhb.js (2), chunk-sac13h7c.js (8)
 * attribution: fingerprint 1, placement 2, affinity 1, facade-exports 7
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTaskFramework } from "../../context/voice.js";
import { backgroundAll } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { BackgroundTaskHint, ToolProgressHintNamespace } from "../../components/ToolProgressHint.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { env } from "../../utils/env.js";
import { isBackgroundTasksOff } from "../AgentTool/backgroundGates.js";
import { formatShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { bashCommentTitle } from "../../utils/toolUseDisplay.js";
import { Text } from "../../ink/components/Text.js";
import { RunningLabel, WaitingLabel } from "../../components/ToolStatusLabels.js";
import { ShellProgressMessage } from "../../components/shell/ShellProgressMessage.js";
import { BashToolResultMessage } from "./BashToolResultMessage.js";
import {
  FallbackToolUseErrorMessage,
  stripSandboxViolations,
} from "../../components/FallbackToolUseErrorMessage.js";
import { exceedsLineLimit } from "../../utils/terminal.js";
import { CWD_RESET_WARNING_RE } from "./utils.js";
import { renderToolUseProgressMessage_3 } from "../SkillTool/UI.js";
import { RejectedToolUseMessage } from "../../components/messages/UserToolResultMessage/RejectedToolUseMessage.js";

//@ chunk-sac13h7c.js:2147-2161 affinity
var MAX_PREVIEW_LINES = 2;
var MAX_PREVIEW_CHARS = 160;
//@ chunk-sac13h7c.js:2161-2876 facade-exports (2.1.88 match: BackgroundHint, 0.626)
/**
 * Bash 运行中的"按 Ctrl+B 转后台"提示（tmux 下显示 ctrl+b ctrl+b）；非交互或后台任务禁用时不显示；按键触发 onBackground。
 */
function BackgroundHint(props) {
  let $ = useMemoCache(10);
  let { toolUseId, keyOnly, onBackground } = props;
  let isKeyOnly = keyOnly === undefined ? false : keyOnly;
  let store = useTaskFramework();
  let onBackgroundClick;
  if ($[0] !== onBackground || $[1] !== store) {
    onBackgroundClick = () => {
      backgroundAll(store);
      onBackground?.();
    };
    $[0] = onBackground;
    $[1] = store;
    $[2] = onBackgroundClick;
  } else onBackgroundClick = $[2];
  let handler = onBackgroundClick;
  let hintArgs;
  if ($[3] !== handler) {
    hintArgs = {
      handler,
      isActive: true,
    };
    $[3] = handler;
    $[4] = hintArgs;
  } else hintArgs = $[4];
  let { cohesionFixes, gateOnShortcut } = BackgroundTaskHint(hintArgs);
  let baseShortcut = useShortcutDisplay("task:background", "Task", "ctrl+b");
  let shortcut = cohesionFixes
    ? gateOnShortcut
    : env.terminal === "tmux" && baseShortcut === "ctrl+b"
      ? "ctrl+b ctrl+b (twice)"
      : baseShortcut;
  if (isKeyOnly) {
    return null;
  }
  if (isBackgroundTasksOff() || (cohesionFixes && shortcut === "")) {
    return null;
  }
  let formattedHint;
  if ($[5] !== shortcut) {
    formattedHint = formatShortcutHint({
      chord: shortcut,
      action: "run in background",
      parens: true,
      format: {
        keyCase: "lower",
      },
    });
    $[5] = shortcut;
    $[6] = formattedHint;
  } else formattedHint = $[6];
  let hintText = formattedHint;
  if (hintText === "") {
    return null;
  }
  let element;
  if ($[7] !== hintText || $[8] !== toolUseId) {
    element = jsxProd_default(ToolProgressHintNamespace.ToolProgressHint, {
      toolUseId,
      hint: hintText,
    });
    $[7] = hintText;
    $[8] = toolUseId;
    $[9] = element;
  } else element = $[9];
  return element;
}
//@ chunk-sac13h7c.js:2876-3201 facade-exports (2.1.88 match: renderToolUseMessage, 1)
function renderToolUseMessage(input, { verbose, theme: _theme }) {
  let { command } = input;
  if (!command) return null;
  if (!verbose) {
    let lines = command.split(`
`);
    if (isFullscreenEnvEnabled()) {
      let commentTitle = bashCommentTitle(command);
      if (commentTitle)
        return commentTitle.length > MAX_PREVIEW_CHARS
          ? commentTitle.slice(0, MAX_PREVIEW_CHARS) + "\u2026"
          : commentTitle;
    }
    let hasTooManyLines = lines.length > MAX_PREVIEW_LINES;
    let needsCharTruncation = command.length > MAX_PREVIEW_CHARS;
    if (hasTooManyLines || needsCharTruncation) {
      let truncated = command;
      if (hasTooManyLines)
        truncated = lines.slice(0, MAX_PREVIEW_LINES).join(`
`);
      if (truncated.length > MAX_PREVIEW_CHARS) truncated = truncated.slice(0, MAX_PREVIEW_CHARS);
      return jsxProd_default_2(Text, {
        children: [truncated.trim(), "\u2026"],
      });
    }
  }
  return command;
}
//@ chunk-sac13h7c.js:3201-3510 facade-exports (2.1.88 match: renderToolUseProgressMessage, 0.922)
function renderToolUseProgressMessage(
  progressMessagesForMessage,
  { verbose, tools: _tools, terminalSize: _terminalSize, inProgressToolCallCount: _inProgressToolCallCount },
) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress || !lastProgress.data) return RunningLabel();
  let data = lastProgress.data;
  return jsxProd_default(ShellProgressMessage, {
    fullOutput: data.fullOutput,
    output: data.output,
    elapsedTimeSeconds: data.elapsedTimeSeconds,
    totalLines: data.totalLines,
    totalBytes: data.totalBytes,
    timeoutMs: data.timeoutMs,
    verbose,
  });
}
//@ chunk-sac13h7c.js:3510-3538 facade-exports
function renderToolUseQueuedMessage() {
  return WaitingLabel();
}
//@ chunk-sac13h7c.js:3538-3791 facade-exports (2.1.88 match: renderToolResultMessage, 0.83)
function renderToolResultMessage(
  content,
  progressMessagesForMessage,
  { verbose, theme: _theme, tools: _tools, style, input },
) {
  let timeoutMs = progressMessagesForMessage.at(-1)?.data?.timeoutMs;
  let command =
    typeof input === "object" && input !== null && "command" in input && typeof input.command === "string"
      ? input.command
      : undefined;
  return jsxProd_default(BashToolResultMessage, {
    content,
    verbose,
    timeoutMs,
    style,
    command,
  });
}
//@ chunk-sac13h7c.js:3791-3890 facade-exports (2.1.88 match: renderToolUseErrorMessage, 1)
function renderToolUseErrorMessage(
  result,
  { verbose, progressMessagesForMessage: _progressMessagesForMessage, tools: _tools },
) {
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-sac13h7c.js:3890-4042 facade-exports
function isResultTruncated(result, { columns }) {
  if (result.isImage) return false;
  return (
    exceedsLineLimit(result.stdout, columns) ||
    exceedsLineLimit(
      typeof result.stderr === "string"
        ? stripSandboxViolations(result.stderr).trim().replace(CWD_RESET_WARNING_RE, "")
        : result.stderr,
      columns,
    )
  );
}
//@ chunk-4hpb3crc.js:5650-5957 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.922)
function renderToolUseProgressMessage_2(
  progressMessagesForMessage,
  { verbose, tools: _tools, terminalSize: _terminalSize, inProgressToolCallCount: _inProgressToolCallCount },
) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress || !lastProgress.data) return RunningLabel();
  let data = lastProgress.data;
  return jsxProd_default(ShellProgressMessage, {
    fullOutput: data.fullOutput,
    output: data.output,
    elapsedTimeSeconds: data.elapsedTimeSeconds,
    totalLines: data.totalLines,
    totalBytes: data.totalBytes,
    timeoutMs: data.timeoutMs,
    verbose,
  });
}
//@ chunk-p5q1xrhb.js:19068-19191 placement (2.1.88 match: renderToolUseErrorMessage, 1)
function renderToolUseErrorMessage_2(result, { progressMessagesForMessage, tools, verbose }) {
  return jsxProd_default_2(Fragment, {
    children: [
      renderToolUseProgressMessage_3(progressMessagesForMessage, {
        tools,
        verbose,
      }),
      jsxProd_default(RejectedToolUseMessage, {}),
    ],
  });
}
//@ chunk-p5q1xrhb.js:19191-19332 placement (2.1.88 match: renderToolUseErrorMessage, 1)
function renderToolUseErrorMessage_3(result, { progressMessagesForMessage, tools, verbose }) {
  return jsxProd_default_2(Fragment, {
    children: [
      renderToolUseProgressMessage_3(progressMessagesForMessage, {
        tools,
        verbose,
      }),
      jsxProd_default(FallbackToolUseErrorMessage, {
        result,
        verbose,
      }),
    ],
  });
}
export {
  BackgroundHint,
  isResultTruncated,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseMessage,
  renderToolUseProgressMessage,
  renderToolUseQueuedMessage,
  renderToolUseProgressMessage_2,
  renderToolUseErrorMessage_3,
  renderToolUseErrorMessage_2,
};
