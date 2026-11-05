/**
 * components/BashModeProgress.tsx
 *
 * ! bash 模式命令执行中的进度：回显 <bash-input> 与工具进度消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BashModeProgress.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useState } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-czq1j3j2.js:1713046-1713073 affinity
function negate_2(value) {
  return !value;
}
//@ chunk-czq1j3j2.js:1713073-1714675 fingerprint (2.1.88 match: BashModeProgress, 0.629)
function BashModeProgress(props) {
  let $ = useMemoCache(29);
  let { input, progress, verbose } = props;
  let { columns } = useTerminalSize();
  let [expanded, setExpanded] = useState(false);
  let [hovered, setHovered] = useState(false);
  let isClipped;
  if ($[0] !== columns || $[1] !== expanded || $[2] !== progress || $[3] !== verbose) {
    isClipped = !verbose && progress !== null && (expanded || isShellOutputClipped(progress, columns));
    $[0] = columns;
    $[1] = expanded;
    $[2] = progress;
    $[3] = verbose;
    $[4] = isClipped;
  } else isClipped = $[4];
  let clippable = isClipped;
  const backgroundColor = expanded ? "userMessageBackgroundHover" : undefined;
  let onClick;
  if ($[5] !== clippable || $[6] !== expanded) {
    onClick = clippable
      ? (mouseEvent) => {
          if (mouseEvent.hyperlinkUrl) {
            return mouseEvent.allowDefault();
          }
          if (expanded || !mouseEvent.cellIsBlank) setExpanded(negate_2);
        }
      : undefined;
    $[5] = clippable;
    $[6] = expanded;
    $[7] = onClick;
  } else onClick = $[7];
  let onMouseEnter;
  if ($[8] !== clippable) {
    onMouseEnter = clippable ? () => setHovered(true) : undefined;
    $[8] = clippable;
    $[9] = onMouseEnter;
  } else onMouseEnter = $[9];
  let onMouseLeave;
  if ($[10] !== clippable) {
    onMouseLeave = clippable ? () => setHovered(false) : undefined;
    $[10] = clippable;
    $[11] = onMouseLeave;
  } else onMouseLeave = $[11];
  const hoverIgnoresBlankCells = !expanded;
  const value = clippable && hovered && !expanded;
  const text = `<bash-input>${input}</bash-input>`;
  let inputMessage;
  if ($[12] !== text) {
    inputMessage = jsxProd_default(UserBashInputMessage, {
      addMargin: false,
      param: {
        text,
        type: "text",
      },
    });
    $[12] = text;
    $[13] = inputMessage;
  } else inputMessage = $[13];
  let progressMessage;
  if ($[14] !== expanded || $[15] !== progress || $[16] !== verbose) {
    progressMessage = progress
      ? jsxProd_default(ShellProgressMessage, {
          fullOutput: progress.fullOutput,
          output: progress.output,
          elapsedTimeSeconds: progress.elapsedTimeSeconds,
          totalLines: progress.totalLines,
          verbose: verbose || expanded,
        })
      : mcpRenderOverrideFor(BashTool, "renderToolUseProgressMessage")?.([], {
          verbose,
          tools: [],
          terminalSize: undefined,
        });
    $[14] = expanded;
    $[15] = progress;
    $[16] = verbose;
    $[17] = progressMessage;
  } else progressMessage = $[17];
  let children;
  if ($[18] !== progressMessage || $[19] !== value || $[20] !== inputMessage) {
    children = jsxProd_default_2(textSignal.Provider, {
      value,
      children: [inputMessage, progressMessage],
    });
    $[18] = progressMessage;
    $[19] = value;
    $[20] = inputMessage;
    $[21] = children;
  } else children = $[21];
  let container;
  if (
    $[22] !== children ||
    $[23] !== backgroundColor ||
    $[24] !== onClick ||
    $[25] !== onMouseEnter ||
    $[26] !== onMouseLeave ||
    $[27] !== hoverIgnoresBlankCells
  ) {
    container = jsxProd_default(Box, {
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
    $[28] = container;
  } else container = $[28];
  return container;
}
export { BashModeProgress };
