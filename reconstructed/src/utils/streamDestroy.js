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
var MAX_LINE_CHARS = 1048576;
//@ chunk-fd68q4sd.js:252-643 placement
/**
 * 按行读取流（UTF-8 解码），逐行回调。
 */
function readStreamLines(o, r) {
  let d = new StringDecoder("utf8");
  let e = "";
  let t = false;
  let l = (i) => {
    if (t) return;
    e += typeof i === "string" ? i : d.write(i);
    let f;
    while (
      (f = e.indexOf(`
`)) >= 0
    ) {
      let sliced = e.slice(0, f);
      e = e.slice(f + 1);
      if (sliced) r(sliced);
    }
    if (e.length > MAX_LINE_CHARS) {
      t = true;
      e = "";
      if ("destroy" in o) o.destroy();
    }
  };
  let n = () => {
    if (t) return;
    e += d.end();
    if (e) {
      r(e);
      e = "";
    }
  };
  o.on("data", l);
  o.on("end", n);
  o.on("close", n);
  return () => {
    o.off("data", l);
    o.off("end", n);
    o.off("close", n);
  };
}
export { readStreamLines };
