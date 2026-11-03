/**
 * utils/withResolvers.ts
 *
 * Promise.withResolvers 兼容实现
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/withResolvers.ts
 * pieces: chunk-d4eg9at2.js (1)
 * attribution: fingerprint 1
 */
import { w as w_2 } from "../../vendor/react/compiler-runtime.js";
import { Qr } from "../../vendor/react/cjs/react.production.js";
import { RenderOnceAndExit } from "./staticRender.js";
import { Text } from "../ink/components/Text.js";
import { formatMessageLines } from "../cli/handlers/plugins.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-d4eg9at2.js:30961-31326 fingerprint = withResolvers (0.517)
function ResultMessages(s) {
  let p = w_2(11),
    { promise: promise } = s,
    { messages: messages, summary: summary } = Qr(promise),
    g,
    P,
    y;
  if (p[0] !== messages || p[1] !== summary) {
    let I = [...messages, summary];
    P = RenderOnceAndExit;
    g = Text;
    y = formatMessageLines(I);
    ((p[0] = messages), (p[1] = summary), (p[2] = g), (p[3] = P), (p[4] = y));
  } else ((g = p[2]), (P = p[3]), (y = p[4]));
  let v;
  if (p[5] !== g || p[6] !== y) ((v = e(g, { children: y })), (p[5] = g), (p[6] = y), (p[7] = v));
  else v = p[7];
  let m;
  if (p[8] !== P || p[9] !== v) ((m = e(P, { children: v })), (p[8] = P), (p[9] = v), (p[10] = m));
  else m = p[10];
  return m;
}

export { ResultMessages };
