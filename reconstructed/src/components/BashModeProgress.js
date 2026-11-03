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
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UserBashInputMessage } from "./messages/UserBashInputMessage.js";
import { ShellProgressMessage } from "./shell/ShellProgressMessage.js";
import { mcpRenderOverrideFor } from "./Message.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { Zmt, Box } from "../ink/components/Text.js";

//@ chunk-18hwfzwa.js:1667009-1667036 affinity
function negate_2(po) {
  return !po;
}
//@ chunk-18hwfzwa.js:1667036-1668638 fingerprint = BashModeProgress (0.63)
function BashModeProgress(t0) {
  let $ = w(29),
    { input: input, progress: progress, verbose: verbose } = t0,
    { columns: columns } = useTerminalSize(),
    [ke, Re] = y(!1),
    [Be, He] = y(!1),
    ze;
  if ($[0] !== columns || $[1] !== ke || $[2] !== progress || $[3] !== verbose)
    ((ze = !verbose && progress !== null && (ke || isShellOutputClipped(progress, columns))),
      ($[0] = columns),
      ($[1] = ke),
      ($[2] = progress),
      ($[3] = verbose),
      ($[4] = ze));
  else ze = $[4];
  let Xe = ze;
  const rt = ke ? "userMessageBackgroundHover" : void 0;
  let kt;
  if ($[5] !== Xe || $[6] !== ke)
    ((kt = Xe
      ? (At) => {
          if (At.hyperlinkUrl) {
            return At.allowDefault();
          }
          if (ke || !At.cellIsBlank) Re(negate_2);
        }
      : void 0),
      ($[5] = Xe),
      ($[6] = ke),
      ($[7] = kt));
  else kt = $[7];
  let It;
  if ($[8] !== Xe) ((It = Xe ? () => He(!0) : void 0), ($[8] = Xe), ($[9] = It));
  else It = $[9];
  let Ot;
  if ($[10] !== Xe) ((Ot = Xe ? () => He(!1) : void 0), ($[10] = Xe), ($[11] = Ot));
  else Ot = $[11];
  const Et = !ke,
    Dt = Xe && Be && !ke,
    t1 = `<bash-input>${input}</bash-input>`;
  let oo;
  if ($[12] !== t1)
    ((oo = e(UserBashInputMessage, { addMargin: !1, param: { text: t1, type: "text" } })),
      ($[12] = t1),
      ($[13] = oo));
  else oo = $[13];
  let Xt;
  if ($[14] !== ke || $[15] !== progress || $[16] !== verbose)
    ((Xt = progress
      ? e(ShellProgressMessage, {
          fullOutput: progress.fullOutput,
          output: progress.output,
          elapsedTimeSeconds: progress.elapsedTimeSeconds,
          totalLines: progress.totalLines,
          verbose: verbose || ke,
        })
      : mcpRenderOverrideFor(BashTool, "renderToolUseProgressMessage")?.([], {
          verbose: verbose,
          tools: [],
          terminalSize: void 0,
        })),
      ($[14] = ke),
      ($[15] = progress),
      ($[16] = verbose),
      ($[17] = Xt));
  else Xt = $[17];
  let io;
  if ($[18] !== Xt || $[19] !== Dt || $[20] !== oo)
    ((io = r(Zmt.Provider, { value: Dt, children: [oo, Xt] })),
      ($[18] = Xt),
      ($[19] = Dt),
      ($[20] = oo),
      ($[21] = io));
  else io = $[21];
  let so;
  if ($[22] !== io || $[23] !== rt || $[24] !== kt || $[25] !== It || $[26] !== Ot || $[27] !== Et)
    ((so = e(Box, {
      flexDirection: "column",
      marginTop: 1,
      backgroundColor: rt,
      onClick: kt,
      onMouseEnter: It,
      onMouseLeave: Ot,
      hoverIgnoresBlankCells: Et,
      children: io,
    })),
      ($[22] = io),
      ($[23] = rt),
      ($[24] = kt),
      ($[25] = It),
      ($[26] = Ot),
      ($[27] = Et),
      ($[28] = so));
  else so = $[28];
  return so;
}

export { BashModeProgress };
