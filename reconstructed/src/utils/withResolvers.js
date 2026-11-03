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
import { w } from "../../vendor/react/compiler-runtime.js";
import { Qr } from "../../vendor/react/cjs/react.production.js";
import { RenderOnceAndExit } from "./staticRender.js";
import { Text } from "../ink/components/Text.js";
import { formatMessageLines } from "../cli/handlers/plugins.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-d4eg9at2.js:30961-31326 fingerprint = withResolvers (0.517)
function ResultMessages(props) {
  let p = w(11);
  let { promise } = props;
  let { messages, summary } = Qr(promise);
  let g;
  let P;
  let children;
  if (p[0] !== messages || p[1] !== summary) {
    let I = [...messages, summary];
    P = RenderOnceAndExit;
    g = Text;
    children = formatMessageLines(I);
    p[0] = messages;
    p[1] = summary;
    p[2] = g;
    p[3] = P;
    p[4] = children;
  } else {
    g = p[2];
    P = p[3];
    children = p[4];
  }
  let children_2;
  if (p[5] !== g || p[6] !== children) {
    children_2 = jsxProd_default(g, {
      children,
    });
    p[5] = g;
    p[6] = children;
    p[7] = children_2;
  } else children_2 = p[7];
  let m;
  if (p[8] !== P || p[9] !== children_2) {
    m = jsxProd_default(P, {
      children: children_2,
    });
    p[8] = P;
    p[9] = children_2;
    p[10] = m;
  } else m = p[10];
  return m;
}
export { ResultMessages };
