/**
 * screens/repl/InlineProgressList.tsx
 *
 * 2.1.316 新增：REPL 的进行中工具进度列表（去重后台提示、每个工具一行），无进度时不渲染。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 7, layout 1
 */
import { init_react_production, fragmentTypeExport } from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BackgroundHint } from "../../tools/BashTool/UI.js";
import { BashModeProgress } from "../../components/BashModeProgress.js";
import { renderToolUseProgressMessage } from "../../tools/AgentTool/UI.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1711876-1711880 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1711876", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1714675-1714779 placement
var DEFAULT_PROGRESS_DISPLAY = {
  background_hint: "nothing",
  bash_mode_progress: "all",
  agent_progress: "nothing",
  own_row: "spinner",
};
//@ chunk-czq1j3j2.js:1714779-1714860 layout
function shouldPauseForToolProgress(toolProgress) {
  for (let toolProgressEntry of toolProgress.values())
    if (DEFAULT_PROGRESS_DISPLAY[toolProgressEntry.kind] === "all") return true;
  return false;
}
//@ chunk-czq1j3j2.js:1714860-1714945 placement
function hasVisibleProgress(toolProgress) {
  for (let hint of toolProgress.values()) if (DEFAULT_PROGRESS_DISPLAY[hint.kind] !== "nothing") return true;
  return false;
}
//@ chunk-czq1j3j2.js:1714945-1715114 placement
function dedupeBackgroundHints(progress) {
  let kept = [];
  let sawHint = false;
  let sawKeyOnly = false;
  for (let hint of progress.values()) {
    if (hint.kind === "background_hint") {
      if (hint.keyOnly ? sawKeyOnly : sawHint) continue;
      if (hint.keyOnly) sawKeyOnly = true;
      else sawHint = true;
    }
    kept.push(hint);
  }
  return kept;
}
//@ chunk-czq1j3j2.js:1715114-1715371 placement
var PROGRESS_RENDERERS = {
  background_hint: (hint) =>
    jsxProd_default(BackgroundHint, {
      toolUseId: hint.toolUseId,
      keyOnly: hint.keyOnly,
    }),
  bash_mode_progress: (hint) =>
    jsxProd_default(BashModeProgress, {
      input: hint.input,
      progress: hint.progress,
      verbose: hint.verbose,
    }),
  agent_progress: (hint, { tools }) =>
    renderToolUseProgressMessage(hint.progressMessages, {
      tools,
      verbose: false,
    }),
  own_row: () => null,
};
//@ chunk-czq1j3j2.js:1715371-1715639 placement
function renderProgressEntry(hint, context) {
  switch (hint.kind) {
    case "background_hint":
      return PROGRESS_RENDERERS.background_hint(hint, context);
    case "bash_mode_progress":
      return PROGRESS_RENDERERS.bash_mode_progress(hint, context);
    case "agent_progress":
      return PROGRESS_RENDERERS.agent_progress(hint, context);
    case "own_row":
      return PROGRESS_RENDERERS.own_row(hint, context);
    default: {
      let unhandled = hint;
      return null;
    }
  }
}
//@ chunk-czq1j3j2.js:1715639-1716032 placement
/**
 * 渲染进行中的工具进度列表（每个工具一行），无进度时不渲染。
 */
function InlineProgressList(props) {
  let $ = useMemoCache(7);
  let { progress, tools } = props;
  if (progress.size === 0) {
    return null;
  }
  let children;
  if ($[0] !== progress || $[1] !== tools) {
    const entries = dedupeBackgroundHints(progress);
    let renderEntry;
    if ($[3] !== tools) {
      renderEntry = (entry) =>
        jsxProd_default(
          fragmentTypeExport,
          {
            children: renderProgressEntry(entry, {
              tools,
            }),
          },
          entry.toolUseId,
        );
      $[3] = tools;
      $[4] = renderEntry;
    } else renderEntry = $[4];
    children = entries.map(renderEntry);
    $[0] = progress;
    $[1] = tools;
    $[2] = children;
  } else children = $[2];
  let listBox;
  if ($[5] !== children) {
    listBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: "100%",
      children,
    });
    $[5] = children;
    $[6] = listBox;
  } else listBox = $[6];
  return listBox;
}
export { shouldPauseForToolProgress, hasVisibleProgress, InlineProgressList };
