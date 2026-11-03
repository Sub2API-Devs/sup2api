/**
 * screens/_new/InlineProgressList.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: sole-consumer-new 6
 */
import { DEFAULT_PROGRESS_DISPLAY } from "../../components/Stats.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BackgroundHint } from "../../tools/BashTool/UI.js";
import { BashModeProgress } from "../../components/BashModeProgress.js";
import { renderToolUseProgressMessage } from "../../tools/AgentTool/UI.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Kc, j } from "../../../vendor/react/cjs/react.production.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:1668823-1668908 sole-consumer-new
function tEe(h) {
  for (let x of h.values()) if (DEFAULT_PROGRESS_DISPLAY[x.kind] !== "nothing") return !0;
  return !1;
}
//@ chunk-18hwfzwa.js:1668908-1669077 sole-consumer-new
function dedupeBackgroundHints(h) {
  let x = [],
    D = !1,
    L = !1;
  for (let ee of h.values()) {
    if (ee.kind === "background_hint") {
      if (ee.keyOnly ? L : D) continue;
      if (ee.keyOnly) L = !0;
      else D = !0;
    }
    x.push(ee);
  }
  return x;
}
//@ chunk-18hwfzwa.js:1669077-1669334 sole-consumer-new
var PROGRESS_RENDERERS = {
  background_hint: (h) => e(BackgroundHint, { toolUseId: h.toolUseId, keyOnly: h.keyOnly }),
  bash_mode_progress: (h) =>
    e(BashModeProgress, { input: h.input, progress: h.progress, verbose: h.verbose }),
  agent_progress: (h, { tools: tools }) =>
    renderToolUseProgressMessage(h.progressMessages, { tools: tools, verbose: !1 }),
  own_row: () => null,
};
//@ chunk-18hwfzwa.js:1669334-1669602 sole-consumer-new
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
/**
 * 渲染进行中的工具进度列表（每个工具一行），无进度时不渲染。
 */
//@ chunk-18hwfzwa.js:1669602-1669995 sole-consumer-new
function InlineProgressList(h) {
  let L = w(7),
    { progress: progress, tools: tools } = h;
  if (progress.size === 0) {
    return null;
  }
  let ee;
  if (L[0] !== progress || L[1] !== tools) {
    const ke = dedupeBackgroundHints(progress);
    let Re;
    if (L[3] !== tools)
      ((Re = (Be) => e(Kc, { children: renderProgressEntry(Be, { tools: tools }) }, Be.toolUseId)),
        (L[3] = tools),
        (L[4] = Re));
    else Re = L[4];
    ee = ke.map(Re);
    ((L[0] = progress), (L[1] = tools), (L[2] = ee));
  } else ee = L[2];
  let ke;
  if (L[5] !== ee)
    ((ke = e(Box, { flexDirection: "column", width: "100%", children: ee })), (L[5] = ee), (L[6] = ke));
  else ke = L[6];
  return ke;
}
//@ chunk-18hwfzwa.js:1669995-1669999 sole-consumer-new
j();

export { tEe, InlineProgressList };
