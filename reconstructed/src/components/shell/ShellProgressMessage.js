/**
 * components/shell/ShellProgressMessage.tsx
 *
 * Shell 命令运行中的进度（"Running… N lines" 与尾部输出）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/shell/ShellProgressMessage.tsx
 * pieces: chunk-cqn8yadz.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { clipShellOutput, CLIP_HEAD_LINES } from "./shellOutputClip.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";
import { FreezeWhenOffscreen } from "../FreezeWhenOffscreen.js";
import { ShellTimeDisplay } from "./ShellTimeDisplay.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { formatFileSize } from "../../utils/format.js";

//@ chunk-cqn8yadz.js:606-1961 fingerprint = ShellProgressMessage (0.658)
function ShellProgressMessage(props) {
  let $ = w(27);
  let { output, fullOutput, elapsedTimeSeconds, totalLines, totalBytes, timeoutMs, verbose } = props;
  let { columns } = useTerminalSize();
  let z;
  if ($[0] !== columns || $[1] !== output || $[2] !== verbose) {
    z = verbose ? null : clipShellOutput(output, columns);
    $[0] = columns;
    $[1] = output;
    $[2] = verbose;
    $[3] = z;
  } else z = $[3];
  let g = z;
  let A;
  if ($[4] !== fullOutput || $[5] !== g) {
    A = g ? g.text : stripAnsiPerLine(fullOutput.trim());
    $[4] = fullOutput;
    $[5] = g;
    $[6] = A;
  } else A = $[6];
  let displayLines = A;
  if (!displayLines) {
    let t3;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      t3 = jsxProd_default(Text, {
        dimColor: true,
        children: "Running\u2026 ",
      });
      $[7] = t3;
    } else t3 = $[7];
    let t4;
    if ($[8] !== elapsedTimeSeconds || $[9] !== timeoutMs) {
      t4 = jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(FreezeWhenOffscreen, {
          children: [
            t3,
            jsxProd_default(ShellTimeDisplay, {
              elapsedTimeSeconds,
              timeoutMs,
            }),
          ],
        }),
      });
      $[8] = elapsedTimeSeconds;
      $[9] = timeoutMs;
      $[10] = t4;
    } else t4 = $[10];
    return t4;
  }
  let _ = g
    ? CLIP_HEAD_LINES
    : countCharInString(
        fullOutput,
        `
`,
      ) + 1;
  let E = (totalLines ? Math.max(0, totalLines - _) : 0) + (g?.dropped ?? 0);
  let lineStatus = "";
  if (totalBytes && totalLines) lineStatus = `~${totalLines} lines`;
  else if (E > 0) lineStatus = `+${E} lines`;
  let c;
  if ($[11] !== displayLines) {
    c = jsxProd_default(Text, {
      dimColor: true,
      children: displayLines,
    });
    $[11] = displayLines;
    $[12] = c;
  } else c = $[12];
  let f;
  if ($[13] !== lineStatus) {
    f = lineStatus
      ? jsxProd_default(Text, {
          dimColor: true,
          children: lineStatus,
        })
      : null;
    $[13] = lineStatus;
    $[14] = f;
  } else f = $[14];
  let t7;
  if ($[15] !== elapsedTimeSeconds || $[16] !== timeoutMs) {
    t7 = jsxProd_default(ShellTimeDisplay, {
      elapsedTimeSeconds,
      timeoutMs,
    });
    $[15] = elapsedTimeSeconds;
    $[16] = timeoutMs;
    $[17] = t7;
  } else t7 = $[17];
  let t8;
  if ($[18] !== totalBytes) {
    t8 = totalBytes
      ? jsxProd_default(Text, {
          dimColor: true,
          children: formatFileSize(totalBytes),
        })
      : null;
    $[18] = totalBytes;
    $[19] = t8;
  } else t8 = $[19];
  let t9;
  if ($[20] !== f || $[21] !== t7 || $[22] !== t8) {
    t9 = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [f, t7, t8],
    });
    $[20] = f;
    $[21] = t7;
    $[22] = t8;
    $[23] = t9;
  } else t9 = $[23];
  let t10;
  if ($[24] !== c || $[25] !== t9) {
    t10 = jsxProd_default(MessageResponse, {
      children: jsxProd_default(FreezeWhenOffscreen, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [c, t9],
        }),
      }),
    });
    $[24] = c;
    $[25] = t9;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
export { ShellProgressMessage };
