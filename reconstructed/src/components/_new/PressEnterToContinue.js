/**
 * components/_new/PressEnterToContinue.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p8fze0jh.js (4)
 * attribution: sole-consumer-new 4
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-p8fze0jh.js:19010-19177 sole-consumer-new
function PressEnterToContinue() {
  let f = w(1),
    o;
  if (f[0] === MEMO_CACHE_SENTINEL)
    ((o = r(Text, {
      color: "permission",
      children: ["Press ", e(Text, { bold: !0, children: "Enter" }), " to continue\u2026"],
    })),
      (f[0] = o));
  else o = f[0];
  return o;
}
//@ chunk-p8fze0jh.js:19177-19181 sole-consumer-new
j();
//@ chunk-p8fze0jh.js:19181-19185 sole-consumer-new
j();
//@ chunk-p8fze0jh.js:19185-19189 sole-consumer-new
j();

export { PressEnterToContinue };
