/**
 * components/design-system/HintText.tsx
 *
 * 2.1.316 新增：暗色文本，可附带提示（hint）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j2fh7g5w.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-j2fh7g5w.js:300-709 placement
/**
 * 暗色文本，可附带提示（hint）。
 */
function HintText(props) {
  let c = w(9);
  let { children, hint } = props;
  if (!hint) {
    let o;
    if (c[0] !== children) {
      o = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      c[0] = children;
      c[1] = o;
    } else o = c[1];
    return o;
  }
  let o;
  if (c[2] !== children) {
    o = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    c[2] = children;
    c[3] = o;
  } else o = c[3];
  let d;
  if (c[4] !== hint) {
    d = jsxProd_default(Text, {
      dimColor: true,
      children: hint,
    });
    c[4] = hint;
    c[5] = d;
  } else d = c[5];
  let a;
  if (c[6] !== o || c[7] !== d) {
    a = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [o, d],
    });
    c[6] = o;
    c[7] = d;
    c[8] = a;
  } else a = c[8];
  return a;
}
export { HintText };
