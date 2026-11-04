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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { formatDuration } from "../../utils/format.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-dnj0hze9.js:809-1425 fingerprint (2.1.88 match: ShellTimeDisplay, 1)
function ShellTimeDisplay(props) {
  let $ = useMemoCache(10);
  let { elapsedTimeSeconds, timeoutMs } = props;
  if (elapsedTimeSeconds === undefined && !timeoutMs) {
    return null;
  }
  let t1;
  if ($[0] !== timeoutMs) {
    t1 = timeoutMs
      ? formatDuration(timeoutMs, {
          hideTrailingZeros: true,
        })
      : undefined;
    $[0] = timeoutMs;
    $[1] = t1;
  } else t1 = $[1];
  let timeout = t1;
  if (elapsedTimeSeconds === undefined) {
    const children = `(timeout ${timeout})`;
    let t3;
    if ($[2] !== children) {
      t3 = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[2] = children;
      $[3] = t3;
    } else t3 = $[3];
    return t3;
  }
  const t2 = elapsedTimeSeconds * 1000;
  let t3;
  if ($[4] !== t2) {
    t3 = formatDuration(t2);
    $[4] = t2;
    $[5] = t3;
  } else t3 = $[5];
  let elapsed = t3;
  if (timeout) {
    const children = `(${elapsed} \xB7 timeout ${timeout})`;
    let t5;
    if ($[6] !== children) {
      t5 = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[6] = children;
      $[7] = t5;
    } else t5 = $[7];
    return t5;
  }
  const children = `(${elapsed})`;
  let t5;
  if ($[8] !== children) {
    t5 = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[8] = children;
    $[9] = t5;
  } else t5 = $[9];
  return t5;
}
export { ShellTimeDisplay };
