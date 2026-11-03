/**
 * @anthropic-ai/bedrock-sdk/internal/utils/path.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (2)
 * attribution: esm-fingerprint 2
 */
import { pr } from "../../../sdk/core/error.mjs";

//@ chunk-h87x8cg3.js:9374-9460 esm-fingerprint
function Y(e) {
  return e.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
//@ chunk-h87x8cg3.js:9460-10486 esm-fingerprint
var freeze = Object.freeze(Object.create(null)),
  Be = (e = Y) =>
    function (r, ...n) {
      if (r.length === 1) return r[0];
      let s = !1,
        o = [],
        reduced = r.reduce((u, p, m) => {
          if (/[?#]/.test(p)) s = !0;
          let h = n[m],
            y = (s ? encodeURIComponent : e)("" + h);
          if (
            m !== n.length &&
            (h == null ||
              (typeof h === "object" &&
                h.toString ===
                  Object.getPrototypeOf(Object.getPrototypeOf(h.hasOwnProperty ?? freeze) ?? freeze)
                    ?.toString))
          )
            ((y = h + ""),
              o.push({
                start: u.length + p.length,
                length: y.length,
                error: `Value of type ${Object.prototype.toString.call(h).slice(8, -1)} is not a valid path parameter`,
              }));
          return u + p + (m === n.length ? "" : y);
        }, ""),
        a = reduced.split(/[?#]/, 1)[0],
        d = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi,
        l;
      while ((l = d.exec(a)) !== null)
        o.push({
          start: l.index,
          length: l[0].length,
          error: `Value "${l[0]}" can't be safely passed as a path parameter`,
        });
      if ((o.sort((u, p) => u.start - p.start), o.length > 0)) {
        let u = 0,
          reduced_2 = o.reduce((m, h) => {
            let repeat = " ".repeat(h.start - u),
              repeat_2 = "^".repeat(h.length);
            return ((u = h.start + h.length), m + repeat + repeat_2);
          }, "");
        throw new pr(`Path parameters result in path with invalid segments:
${o.map((m) => m.error).join(`
`)}
${reduced}
${reduced_2}`);
      }
      return reduced;
    },
  L = Be(Y);

export { L };
