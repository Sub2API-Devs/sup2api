/**
 * utils/streamDestroy.ts
 *
 * 2.1.316 新增：流销毁
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fd68q4sd.js (2)
 * attribution: placement 2
 */
import { StringDecoder } from "string_decoder";

//@ chunk-fd68q4sd.js:238-252 placement
var p = 1048576;
/**
 * 按行读取流（UTF-8 解码），逐行回调。
 */
//@ chunk-fd68q4sd.js:252-643 placement
function readStreamLines(o, r) {
  let d = new StringDecoder("utf8"),
    e = "",
    t = !1,
    l = (i) => {
      if (t) return;
      e += typeof i === "string" ? i : d.write(i);
      let f;
      while (
        (f = e.indexOf(`
`)) >= 0
      ) {
        let sliced = e.slice(0, f);
        if (((e = e.slice(f + 1)), sliced)) r(sliced);
      }
      if (e.length > p) {
        if (((t = !0), (e = ""), "destroy" in o)) o.destroy();
      }
    },
    n = () => {
      if (t) return;
      if (((e += d.end()), e)) (r(e), (e = ""));
    };
  return (
    o.on("data", l),
    o.on("end", n),
    o.on("close", n),
    () => {
      (o.off("data", l), o.off("end", n), o.off("close", n));
    }
  );
}

export { readStreamLines };
