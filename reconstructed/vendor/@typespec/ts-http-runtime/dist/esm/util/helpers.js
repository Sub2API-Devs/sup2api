/**
 * @typespec/ts-http-runtime/dist/esm/util/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { AbortError_2 } from "../restError.js";

//@ chunk-mrx6y2r5.js:43325-43361 esm-fingerprint
var Dm = "The operation was aborted.";
//@ chunk-mrx6y2r5.js:43361-43887 esm-fingerprint
function yl(e, t, r) {
  return new Promise((n, o) => {
    let i = void 0,
      s = void 0,
      a = () =>
        o(
          new AbortError_2(
            (r === null || r === void 0 ? void 0 : r.abortErrorMsg)
              ? r === null || r === void 0
                ? void 0
                : r.abortErrorMsg
              : Dm,
          ),
        ),
      c = () => {
        if ((r === null || r === void 0 ? void 0 : r.abortSignal) && s)
          r.abortSignal.removeEventListener("abort", s);
      };
    if (
      ((s = () => {
        if (i) clearTimeout(i);
        return (c(), a());
      }),
      (r === null || r === void 0 ? void 0 : r.abortSignal) && r.abortSignal.aborted)
    )
      return a();
    if (
      ((i = setTimeout(() => {
        (c(), n(t));
      }, e)),
      r === null || r === void 0 ? void 0 : r.abortSignal)
    )
      r.abortSignal.addEventListener("abort", s);
  });
}
//@ chunk-mrx6y2r5.js:43887-43991 esm-fingerprint
function Tl(e, t) {
  let r = e.headers.get(t);
  if (!r) return;
  let n = Number(r);
  if (Number.isNaN(n)) return;
  return n;
}

export { Tl, yl };
