/**
 * tools/BashTool/UI.tsx
 *
 * Bash 工具的渲染函数：Ctrl+B 转后台提示、进度消息、结果与错误消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/UI.tsx
 * pieces: chunk-8ndmcarc.js (2), chunk-hkh7sq9y.js (1), chunk-s06523pk.js (8)
 * attribution: fingerprint 2, shared-adjacent 1, affinity 1, facade-exports 7
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSetVoiceState } from "../../context/voice.js";
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

//@ chunk-s06523pk.js:2147-2161 affinity
var MAX_PREVIEW_LINES = 2;
var MAX_PREVIEW_CHARS = 160;
//@ chunk-s06523pk.js:2161-2876 facade-exports = BackgroundHint (0.617)
/**
 * Bash 运行中的"按 Ctrl+B 转后台"提示（tmux 下显示 ctrl+b ctrl+b）；非交互或后台任务禁用时不显示；按键触发 onBackground。
 */
function BackgroundHint(props) {
  let t = w(10);
  let { toolUseId, keyOnly, onBackground } = props;
  let d = keyOnly === undefined ? false : keyOnly;
  let store = useSetVoiceState();
  let u;
  if (t[0] !== onBackground || t[1] !== store) {
    u = () => {
      backgroundAll(store);
      onBackground?.();
    };
    t[0] = onBackground;
    t[1] = store;
    t[2] = u;
  } else u = t[2];
  let handler = u;
  let f;
  if (t[3] !== handler) {
    f = {
      handler,
      isActive: true,
    };
    t[3] = handler;
    t[4] = f;
  } else f = t[4];
  let { cohesionFixes, gateOnShortcut } = BackgroundTaskHint(f);
  let baseShortcut = useShortcutDisplay("task:background", "Task", "ctrl+b");
  let y = cohesionFixes
    ? gateOnShortcut
    : env.terminal === "tmux" && baseShortcut === "ctrl+b"
      ? "ctrl+b ctrl+b (twice)"
      : baseShortcut;
  if (d) {
    return null;
  }
  if (isBackgroundTasksOff() || (cohesionFixes && y === "")) {
    return null;
  }
  let F;
  if (t[5] !== y) {
    F = formatShortcutHint({
      chord: y,
      action: "run in background",
      parens: true,
      format: {
        keyCase: "lower",
      },
    });
    t[5] = y;
    t[6] = F;
  } else F = t[6];
  let R = F;
  if (R === "") {
    return null;
  }
  let A;
  if (t[7] !== R || t[8] !== toolUseId) {
    A = jsxProd_default(ToolProgressHintNamespace.ToolProgressHint, {
      toolUseId,
      hint: R,
    });
    t[7] = R;
    t[8] = toolUseId;
    t[9] = A;
  } else A = t[9];
  return A;
}
//@ chunk-s06523pk.js:2876-3201 facade-exports = renderToolUseMessage (1)
function renderToolUseMessage(input, { verbose, theme: _theme }) {
  let { command } = input;
  if (!command) return null;
  if (!verbose) {
    let lines = command.split(`
`);
    if (isFullscreenEnvEnabled()) {
      let u = bashCommentTitle(command);
      if (u) return u.length > MAX_PREVIEW_CHARS ? u.slice(0, MAX_PREVIEW_CHARS) + "\u2026" : u;
    }
    let c = lines.length > MAX_PREVIEW_LINES;
    let needsCharTruncation = command.length > MAX_PREVIEW_CHARS;
    if (c || needsCharTruncation) {
      let truncated = command;
      if (c)
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
//@ chunk-s06523pk.js:3201-3526 facade-exports = renderToolUseProgressMessage (0.963)
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
    taskId: data.taskId,
    verbose,
  });
}
//@ chunk-s06523pk.js:3526-3554 facade-exports
function renderToolUseQueuedMessage() {
  return WaitingLabel();
}
//@ chunk-s06523pk.js:3554-3807 facade-exports = renderToolResultMessage (0.829)
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
//@ chunk-s06523pk.js:3807-3906 facade-exports = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage(
  result,
  { verbose, progressMessagesForMessage: _progressMessagesForMessage, tools: _tools },
) {
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-s06523pk.js:3906-4058 facade-exports
function isResultTruncated(a, { columns }) {
  if (a.isImage) return false;
  return (
    exceedsLineLimit(a.stdout, columns) ||
    exceedsLineLimit(
      typeof a.stderr === "string"
        ? stripSandboxViolations(a.stderr).trim().replace(CWD_RESET_WARNING_RE, "")
        : a.stderr,
      columns,
    )
  );
}
//@ chunk-8ndmcarc.js:17835-17957 fingerprint = renderToolUseErrorMessage (1)
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
//@ chunk-8ndmcarc.js:17957-18097 shared-adjacent = renderToolUseErrorMessage (1)
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
//@ chunk-hkh7sq9y.js:5285-5608 fingerprint = renderToolUseProgressMessage (0.963)
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
    taskId: data.taskId,
    verbose,
  });
}
export { BackgroundHint };
