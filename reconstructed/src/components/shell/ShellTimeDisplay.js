/**
 * components/shell/ShellTimeDisplay.tsx
 *
 * Shell 运行时长与超时显示（"(timeout Ns)"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/shell/ShellTimeDisplay.tsx
 * pieces: chunk-dnj0hze9.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { formatDuration } from "../../utils/format.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-dnj0hze9.js:809-1425 fingerprint = ShellTimeDisplay (1)
function ShellTimeDisplay(t0) {
  let $ = w(10),
    { elapsedTimeSeconds: elapsedTimeSeconds, timeoutMs: timeoutMs } = t0;
  if (elapsedTimeSeconds === void 0 && !timeoutMs) {
    return null;
  }
  let l;
  if ($[0] !== timeoutMs)
    ((l = timeoutMs ? formatDuration(timeoutMs, { hideTrailingZeros: !0 }) : void 0),
      ($[0] = timeoutMs),
      ($[1] = l));
  else l = $[1];
  let f = l;
  if (elapsedTimeSeconds === void 0) {
    const t2 = `(timeout ${f})`;
    let u;
    if ($[2] !== t2) ((u = e(Text, { dimColor: !0, children: t2 })), ($[2] = t2), ($[3] = u));
    else u = $[3];
    return u;
  }
  const t2 = elapsedTimeSeconds * 1000;
  let u;
  if ($[4] !== t2) ((u = formatDuration(t2)), ($[4] = t2), ($[5] = u));
  else u = $[5];
  let a = u;
  if (f) {
    const t4 = `(${a} \xB7 timeout ${f})`;
    let d;
    if ($[6] !== t4) ((d = e(Text, { dimColor: !0, children: t4 })), ($[6] = t4), ($[7] = d));
    else d = $[7];
    return d;
  }
  const t4 = `(${a})`;
  let d;
  if ($[8] !== t4) ((d = e(Text, { dimColor: !0, children: t4 })), ($[8] = t4), ($[9] = d));
  else d = $[9];
  return d;
}

export { ShellTimeDisplay };
