/**
 * components/BashModeProgress.tsx
 *
 * ! bash 模式命令执行中的进度：回显 <bash-input> 与工具进度消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BashModeProgress.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { isShellOutputClipped } from "./shell/shellOutputClip.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UserBashInputMessage } from "./messages/UserBashInputMessage.js";
import { ShellProgressMessage } from "./shell/ShellProgressMessage.js";
import { mcpRenderOverrideFor } from "./Message.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { textSignal, Box } from "../ink/components/Text.js";

//@ chunk-18hwfzwa.js:1667009-1667036 affinity
function negate_2(po) {
  return !po;
}
//@ chunk-18hwfzwa.js:1667036-1668638 fingerprint = BashModeProgress (0.63)
function BashModeProgress(props) {
  let $ = w(29);
  let { input, progress, verbose } = props;
  let { columns } = useTerminalSize();
  let [ke, Re] = y(false);
  let [Be, He] = y(false);
  let ze;
  if ($[0] !== columns || $[1] !== ke || $[2] !== progress || $[3] !== verbose) {
    ze = !verbose && progress !== null && (ke || isShellOutputClipped(progress, columns));
    $[0] = columns;
    $[1] = ke;
    $[2] = progress;
    $[3] = verbose;
    $[4] = ze;
  } else ze = $[4];
  let Xe = ze;
  const backgroundColor = ke ? "userMessageBackgroundHover" : undefined;
  let onClick;
  if ($[5] !== Xe || $[6] !== ke) {
    onClick = Xe
      ? (At) => {
          if (At.hyperlinkUrl) {
            return At.allowDefault();
          }
          if (ke || !At.cellIsBlank) Re(negate_2);
        }
      : undefined;
    $[5] = Xe;
    $[6] = ke;
    $[7] = onClick;
  } else onClick = $[7];
  let onMouseEnter;
  if ($[8] !== Xe) {
    onMouseEnter = Xe ? () => He(true) : undefined;
    $[8] = Xe;
    $[9] = onMouseEnter;
  } else onMouseEnter = $[9];
  let onMouseLeave;
  if ($[10] !== Xe) {
    onMouseLeave = Xe ? () => He(false) : undefined;
    $[10] = Xe;
    $[11] = onMouseLeave;
  } else onMouseLeave = $[11];
  const hoverIgnoresBlankCells = !ke;
  const value = Xe && Be && !ke;
  const text = `<bash-input>${input}</bash-input>`;
  let oo;
  if ($[12] !== text) {
    oo = jsxProd_default(UserBashInputMessage, {
      addMargin: false,
      param: {
        text,
        type: "text",
      },
    });
    $[12] = text;
    $[13] = oo;
  } else oo = $[13];
  let Xt;
  if ($[14] !== ke || $[15] !== progress || $[16] !== verbose) {
    Xt = progress
      ? jsxProd_default(ShellProgressMessage, {
          fullOutput: progress.fullOutput,
          output: progress.output,
          elapsedTimeSeconds: progress.elapsedTimeSeconds,
          totalLines: progress.totalLines,
          verbose: verbose || ke,
        })
      : mcpRenderOverrideFor(BashTool, "renderToolUseProgressMessage")?.([], {
          verbose,
          tools: [],
          terminalSize: undefined,
        });
    $[14] = ke;
    $[15] = progress;
    $[16] = verbose;
    $[17] = Xt;
  } else Xt = $[17];
  let children;
  if ($[18] !== Xt || $[19] !== value || $[20] !== oo) {
    children = jsxProd_default_2(textSignal.Provider, {
      value,
      children: [oo, Xt],
    });
    $[18] = Xt;
    $[19] = value;
    $[20] = oo;
    $[21] = children;
  } else children = $[21];
  let so;
  if (
    $[22] !== children ||
    $[23] !== backgroundColor ||
    $[24] !== onClick ||
    $[25] !== onMouseEnter ||
    $[26] !== onMouseLeave ||
    $[27] !== hoverIgnoresBlankCells
  ) {
    so = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      backgroundColor,
      onClick,
      onMouseEnter,
      onMouseLeave,
      hoverIgnoresBlankCells,
      children,
    });
    $[22] = children;
    $[23] = backgroundColor;
    $[24] = onClick;
    $[25] = onMouseEnter;
    $[26] = onMouseLeave;
    $[27] = hoverIgnoresBlankCells;
    $[28] = so;
  } else so = $[28];
  return so;
}
export { BashModeProgress };
