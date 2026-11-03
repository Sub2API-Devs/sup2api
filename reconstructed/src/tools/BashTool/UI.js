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
import { uf } from "../AgentTool/backgroundGates.js";
import { formatShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { bashCommentTitle } from "../../utils/toolUseDisplay.js";
import { Text } from "../../ink/components/Text.js";
import { bmt, _mt } from "../../components/ToolStatusLabels.js";
import { ShellProgressMessage } from "../../components/shell/ShellProgressMessage.js";
import { BashToolResultMessage } from "./BashToolResultMessage.js";
import { FallbackToolUseErrorMessage, wmt } from "../../components/FallbackToolUseErrorMessage.js";
import { exceedsLineLimit } from "../../utils/terminal.js";
import { CWD_RESET_WARNING_RE } from "./utils.js";
import { renderToolUseProgressMessage_3 } from "../SkillTool/UI.js";
import { RejectedToolUseMessage } from "../../components/messages/UserToolResultMessage/RejectedToolUseMessage.js";

//@ chunk-s06523pk.js:2147-2161 affinity
var MAX_PREVIEW_LINES = 2,
  MAX_PREVIEW_CHARS = 160;
/**
 * Bash 运行中的"按 Ctrl+B 转后台"提示（tmux 下显示 ctrl+b ctrl+b）；非交互或后台任务禁用时不显示；按键触发 onBackground。
 */
//@ chunk-s06523pk.js:2161-2876 facade-exports = BackgroundHint (0.617)
function BackgroundHint(t0) {
  let t = w(10),
    { toolUseId: toolUseId, keyOnly: keyOnly, onBackground: onBackground } = t0,
    d = keyOnly === void 0 ? !1 : keyOnly,
    store = useSetVoiceState(),
    u;
  if (t[0] !== onBackground || t[1] !== store)
    ((u = () => {
      (backgroundAll(store), onBackground?.());
    }),
      (t[0] = onBackground),
      (t[1] = store),
      (t[2] = u));
  else u = t[2];
  let p = u,
    f;
  if (t[3] !== p) ((f = { handler: p, isActive: !0 }), (t[3] = p), (t[4] = f));
  else f = t[4];
  let { cohesionFixes: cohesionFixes, gateOnShortcut: gateOnShortcut } = BackgroundTaskHint(f),
    baseShortcut = useShortcutDisplay("task:background", "Task", "ctrl+b"),
    y = cohesionFixes
      ? gateOnShortcut
      : env.terminal === "tmux" && baseShortcut === "ctrl+b"
        ? "ctrl+b ctrl+b (twice)"
        : baseShortcut;
  if (d) {
    return null;
  }
  if (uf() || (cohesionFixes && y === "")) {
    return null;
  }
  let F;
  if (t[5] !== y)
    ((F = formatShortcutHint({
      chord: y,
      action: "run in background",
      parens: !0,
      format: { keyCase: "lower" },
    })),
      (t[5] = y),
      (t[6] = F));
  else F = t[6];
  let R = F;
  if (R === "") {
    return null;
  }
  let A;
  if (t[7] !== R || t[8] !== toolUseId)
    ((A = e(ToolProgressHintNamespace.ToolProgressHint, { toolUseId: toolUseId, hint: R })),
      (t[7] = R),
      (t[8] = toolUseId),
      (t[9] = A));
  else A = t[9];
  return A;
}
//@ chunk-s06523pk.js:2876-3201 facade-exports = renderToolUseMessage (1)
function renderToolUseMessage(input, { verbose: verbose, theme: theme }) {
  let { command: command } = input;
  if (!command) return null;
  if (!verbose) {
    let parts = command.split(`
`);
    if (isFullscreenEnvEnabled()) {
      let u = bashCommentTitle(command);
      if (u) return u.length > MAX_PREVIEW_CHARS ? u.slice(0, MAX_PREVIEW_CHARS) + "\u2026" : u;
    }
    let c = parts.length > MAX_PREVIEW_LINES,
      t = command.length > MAX_PREVIEW_CHARS;
    if (c || t) {
      let u = command;
      if (c)
        u = parts.slice(0, MAX_PREVIEW_LINES).join(`
`);
      if (u.length > MAX_PREVIEW_CHARS) u = u.slice(0, MAX_PREVIEW_CHARS);
      return r(Text, { children: [u.trim(), "\u2026"] });
    }
  }
  return command;
}
//@ chunk-s06523pk.js:3201-3526 facade-exports = renderToolUseProgressMessage (0.963)
function renderToolUseProgressMessage(
  progressMessagesForMessage,
  {
    verbose: verbose,
    tools: tools,
    terminalSize: terminalSize,
    inProgressToolCallCount: inProgressToolCallCount,
  },
) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress || !lastProgress.data) return bmt();
  let data = lastProgress.data;
  return e(ShellProgressMessage, {
    fullOutput: data.fullOutput,
    output: data.output,
    elapsedTimeSeconds: data.elapsedTimeSeconds,
    totalLines: data.totalLines,
    totalBytes: data.totalBytes,
    timeoutMs: data.timeoutMs,
    taskId: data.taskId,
    verbose: verbose,
  });
}
//@ chunk-s06523pk.js:3526-3554 facade-exports
function renderToolUseQueuedMessage() {
  return _mt();
}
//@ chunk-s06523pk.js:3554-3807 facade-exports = renderToolResultMessage (0.829)
function renderToolResultMessage(
  content,
  progressMessagesForMessage,
  { verbose: verbose, theme: theme, tools: tools, style: style, input: input },
) {
  let timeoutMs = progressMessagesForMessage.at(-1)?.data?.timeoutMs,
    f =
      typeof input === "object" && input !== null && "command" in input && typeof input.command === "string"
        ? input.command
        : void 0;
  return e(BashToolResultMessage, {
    content: content,
    verbose: verbose,
    timeoutMs: timeoutMs,
    style: style,
    command: f,
  });
}
//@ chunk-s06523pk.js:3807-3906 facade-exports = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage(
  result,
  { verbose: verbose, progressMessagesForMessage: progressMessagesForMessage, tools: tools },
) {
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
//@ chunk-s06523pk.js:3906-4058 facade-exports
function isResultTruncated(a, { columns: columns }) {
  if (a.isImage) return !1;
  return (
    exceedsLineLimit(a.stdout, columns) ||
    exceedsLineLimit(
      typeof a.stderr === "string" ? wmt(a.stderr).trim().replace(CWD_RESET_WARNING_RE, "") : a.stderr,
      columns,
    )
  );
}
//@ chunk-8ndmcarc.js:17835-17957 fingerprint = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage_2(
  result,
  { progressMessagesForMessage: progressMessagesForMessage, tools: tools, verbose: verbose },
) {
  return r(Fragment, {
    children: [
      renderToolUseProgressMessage_3(progressMessagesForMessage, { tools: tools, verbose: verbose }),
      e(RejectedToolUseMessage, {}),
    ],
  });
}
//@ chunk-8ndmcarc.js:17957-18097 shared-adjacent = renderToolUseErrorMessage (1)
function renderToolUseErrorMessage_3(
  result,
  { progressMessagesForMessage: progressMessagesForMessage, tools: tools, verbose: verbose },
) {
  return r(Fragment, {
    children: [
      renderToolUseProgressMessage_3(progressMessagesForMessage, { tools: tools, verbose: verbose }),
      e(FallbackToolUseErrorMessage, { result: result, verbose: verbose }),
    ],
  });
}
//@ chunk-hkh7sq9y.js:5285-5608 fingerprint = renderToolUseProgressMessage (0.963)
function renderToolUseProgressMessage_2(
  progressMessagesForMessage,
  {
    verbose: verbose,
    tools: tools,
    terminalSize: terminalSize,
    inProgressToolCallCount: inProgressToolCallCount,
  },
) {
  let lastProgress = progressMessagesForMessage.at(-1);
  if (!lastProgress || !lastProgress.data) return bmt();
  let data = lastProgress.data;
  return e(ShellProgressMessage, {
    fullOutput: data.fullOutput,
    output: data.output,
    elapsedTimeSeconds: data.elapsedTimeSeconds,
    totalLines: data.totalLines,
    totalBytes: data.totalBytes,
    timeoutMs: data.timeoutMs,
    taskId: data.taskId,
    verbose: verbose,
  });
}

export { BackgroundHint };
