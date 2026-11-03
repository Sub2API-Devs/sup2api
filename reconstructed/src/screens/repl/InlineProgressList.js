/**
 * screens/repl/InlineProgressList.tsx
 *
 * 2.1.316 新增：REPL 的进行中工具进度列表（去重后台提示、每个工具一行），无进度时不渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 6
 */
import { DEFAULT_PROGRESS_DISPLAY } from "../../_unattributed/chunk-18hwfzwa/part-001.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BackgroundHint } from "../../tools/BashTool/UI.js";
import { BashModeProgress } from "../../components/BashModeProgress.js";
import { renderToolUseProgressMessage } from "../../tools/AgentTool/UI.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Kc, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:1668823-1668908 placement
function hasVisibleProgress(toolProgress) {
  for (let x of toolProgress.values()) if (DEFAULT_PROGRESS_DISPLAY[x.kind] !== "nothing") return true;
  return false;
}
//@ chunk-18hwfzwa.js:1668908-1669077 placement
function dedupeBackgroundHints(progress) {
  let x = [];
  let D = false;
  let L = false;
  for (let ee of progress.values()) {
    if (ee.kind === "background_hint") {
      if (ee.keyOnly ? L : D) continue;
      if (ee.keyOnly) L = true;
      else D = true;
    }
    x.push(ee);
  }
  return x;
}
//@ chunk-18hwfzwa.js:1669077-1669334 placement
var PROGRESS_RENDERERS = {
  background_hint: (h) =>
    jsxProd_default(BackgroundHint, {
      toolUseId: h.toolUseId,
      keyOnly: h.keyOnly,
    }),
  bash_mode_progress: (h) =>
    jsxProd_default(BashModeProgress, {
      input: h.input,
      progress: h.progress,
      verbose: h.verbose,
    }),
  agent_progress: (h, { tools }) =>
    renderToolUseProgressMessage(h.progressMessages, {
      tools,
      verbose: false,
    }),
  own_row: () => null,
};
//@ chunk-18hwfzwa.js:1669334-1669602 placement
function renderProgressEntry(h, x) {
  switch (h.kind) {
    case "background_hint":
      return PROGRESS_RENDERERS.background_hint(h, x);
    case "bash_mode_progress":
      return PROGRESS_RENDERERS.bash_mode_progress(h, x);
    case "agent_progress":
      return PROGRESS_RENDERERS.agent_progress(h, x);
    case "own_row":
      return PROGRESS_RENDERERS.own_row(h, x);
    default: {
      let D = h;
      return null;
    }
  }
}
//@ chunk-18hwfzwa.js:1669602-1669995 placement
/**
 * 渲染进行中的工具进度列表（每个工具一行），无进度时不渲染。
 */
function InlineProgressList(props) {
  let L = w(7);
  let { progress, tools } = props;
  if (progress.size === 0) {
    return null;
  }
  let children;
  if (L[0] !== progress || L[1] !== tools) {
    const ke = dedupeBackgroundHints(progress);
    let Re;
    if (L[3] !== tools) {
      Re = (Be) =>
        jsxProd_default(
          Kc,
          {
            children: renderProgressEntry(Be, {
              tools,
            }),
          },
          Be.toolUseId,
        );
      L[3] = tools;
      L[4] = Re;
    } else Re = L[4];
    children = ke.map(Re);
    L[0] = progress;
    L[1] = tools;
    L[2] = children;
  } else children = L[2];
  let ke;
  if (L[5] !== children) {
    ke = jsxProd_default(Box, {
      flexDirection: "column",
      width: "100%",
      children,
    });
    L[5] = children;
    L[6] = ke;
  } else ke = L[6];
  return ke;
}
//@ chunk-18hwfzwa.js:1669995-1669999 placement
init_react_production();
export { hasVisibleProgress, InlineProgressList };
