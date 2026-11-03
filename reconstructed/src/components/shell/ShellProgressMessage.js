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
import { qa } from "../../utils/stripAnsi.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";
import { FreezeWhenOffscreen } from "../FreezeWhenOffscreen.js";
import { ShellTimeDisplay } from "./ShellTimeDisplay.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { formatFileSize } from "../../utils/format.js";

//@ chunk-cqn8yadz.js:606-1961 fingerprint = ShellProgressMessage (0.658)
function ShellProgressMessage(t0) {
  let $ = w(27),
    {
      output: output,
      fullOutput: fullOutput,
      elapsedTimeSeconds: elapsedTimeSeconds,
      totalLines: totalLines,
      totalBytes: totalBytes,
      timeoutMs: timeoutMs,
      verbose: verbose,
    } = t0,
    { columns: columns } = useTerminalSize(),
    z;
  if ($[0] !== columns || $[1] !== output || $[2] !== verbose)
    ((z = verbose ? null : clipShellOutput(output, columns)),
      ($[0] = columns),
      ($[1] = output),
      ($[2] = verbose),
      ($[3] = z));
  else z = $[3];
  let g = z,
    A;
  if ($[4] !== fullOutput || $[5] !== g)
    ((A = g ? g.text : qa(fullOutput.trim())), ($[4] = fullOutput), ($[5] = g), ($[6] = A));
  else A = $[6];
  let M = A;
  if (!M) {
    let c;
    if ($[7] === MEMO_CACHE_SENTINEL)
      ((c = e(Text, { dimColor: !0, children: "Running\u2026 " })), ($[7] = c));
    else c = $[7];
    let f;
    if ($[8] !== elapsedTimeSeconds || $[9] !== timeoutMs)
      ((f = e(MessageResponse, {
        children: r(FreezeWhenOffscreen, {
          children: [
            c,
            e(ShellTimeDisplay, { elapsedTimeSeconds: elapsedTimeSeconds, timeoutMs: timeoutMs }),
          ],
        }),
      })),
        ($[8] = elapsedTimeSeconds),
        ($[9] = timeoutMs),
        ($[10] = f));
    else f = $[10];
    return f;
  }
  let _ = g
      ? CLIP_HEAD_LINES
      : countCharInString(
          fullOutput,
          `
`,
        ) + 1,
    E = (totalLines ? Math.max(0, totalLines - _) : 0) + (g?.dropped ?? 0),
    lineStatus = "";
  if (totalBytes && totalLines) lineStatus = `~${totalLines} lines`;
  else if (E > 0) lineStatus = `+${E} lines`;
  let c;
  if ($[11] !== M) ((c = e(Text, { dimColor: !0, children: M })), ($[11] = M), ($[12] = c));
  else c = $[12];
  let f;
  if ($[13] !== lineStatus)
    ((f = lineStatus ? e(Text, { dimColor: !0, children: lineStatus }) : null),
      ($[13] = lineStatus),
      ($[14] = f));
  else f = $[14];
  let B;
  if ($[15] !== elapsedTimeSeconds || $[16] !== timeoutMs)
    ((B = e(ShellTimeDisplay, { elapsedTimeSeconds: elapsedTimeSeconds, timeoutMs: timeoutMs })),
      ($[15] = elapsedTimeSeconds),
      ($[16] = timeoutMs),
      ($[17] = B));
  else B = $[17];
  let O;
  if ($[18] !== totalBytes)
    ((O = totalBytes ? e(Text, { dimColor: !0, children: formatFileSize(totalBytes) }) : null),
      ($[18] = totalBytes),
      ($[19] = O));
  else O = $[19];
  let R;
  if ($[20] !== f || $[21] !== B || $[22] !== O)
    ((R = r(Box, { flexDirection: "row", gap: 1, children: [f, B, O] })),
      ($[20] = f),
      ($[21] = B),
      ($[22] = O),
      ($[23] = R));
  else R = $[23];
  let F;
  if ($[24] !== c || $[25] !== R)
    ((F = e(MessageResponse, {
      children: e(FreezeWhenOffscreen, { children: r(Box, { flexDirection: "column", children: [c, R] }) }),
    })),
      ($[24] = c),
      ($[25] = R),
      ($[26] = F));
  else F = $[26];
  return F;
}

export { ShellProgressMessage };
