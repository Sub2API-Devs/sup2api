/**
 * @anthropic-ai/sdk/internal/utils/path.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */
import { pr } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:44319-44406 esm-fingerprint
function Au(e) {
  return e.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
//@ chunk-hwmsct5x.js:44406-45437 esm-fingerprint
var freeze = Object.freeze(Object.create(null)),
  Qh = (e = Au) =>
    function (r, ...s) {
      if (r.length === 1) return r[0];
      let h = !1,
        y = [],
        reduced = r.reduce((L, O, M) => {
          if (/[?#]/.test(O)) h = !0;
          let P = s[M],
            H = (h ? encodeURIComponent : e)("" + P);
          if (
            M !== s.length &&
            (P == null ||
              (typeof P === "object" &&
                P.toString ===
                  Object.getPrototypeOf(Object.getPrototypeOf(P.hasOwnProperty ?? freeze) ?? freeze)
                    ?.toString))
          )
            ((H = P + ""),
              y.push({
                start: L.length + O.length,
                length: H.length,
                error: `Value of type ${Object.prototype.toString.call(P).slice(8, -1)} is not a valid path parameter`,
              }));
          return L + O + (M === s.length ? "" : H);
        }, ""),
        S = reduced.split(/[?#]/, 1)[0],
        E = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi,
        R;
      while ((R = E.exec(S)) !== null)
        y.push({
          start: R.index,
          length: R[0].length,
          error: `Value "${R[0]}" can't be safely passed as a path parameter`,
        });
      if ((y.sort((L, O) => L.start - O.start), y.length > 0)) {
        let L = 0,
          reduced_2 = y.reduce((M, P) => {
            let repeat = " ".repeat(P.start - L),
              repeat_2 = "^".repeat(P.length);
            return ((L = P.start + P.length), M + repeat + repeat_2);
          }, "");
        throw new pr(`Path parameters result in path with invalid segments:
${y.map((M) => M.error).join(`
`)}
${reduced}
${reduced_2}`);
      }
      return reduced;
    },
  I = Qh(Au);

export { I };
