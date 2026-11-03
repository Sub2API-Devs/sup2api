/**
 * components/_new/filterModelOptions.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: sole-consumer-new 2
 */
import { Yn } from "../../utils/stripAnsi.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:675889-676080 sole-consumer-new
function filterModelOptions(h, x) {
  if (!x) return h;
  let lower = x.toLowerCase();
  return h.filter(
    (L) =>
      (typeof L.label === "string" ? L.label : "").toLowerCase().includes(lower) ||
      Yn(L.description ?? "")
        .toLowerCase()
        .includes(lower),
  );
}
//@ chunk-18hwfzwa.js:676080-676084 sole-consumer-new
j();

export { filterModelOptions };
