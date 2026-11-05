/**
 * utils/streamDestroy.ts
 *
 * 2.1.316 新增：流销毁
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yjn0j1bs.js (2)
 * attribution: placement 2
 */
import { StringDecoder } from "string_decoder";

//@ chunk-yjn0j1bs.js:238-252 placement
var MAX_LINE_CHARS = 1048576;
//@ chunk-yjn0j1bs.js:252-643 placement
/**
 * 按行读取流（UTF-8 解码），逐行回调。
 */
function readStreamLines(stream, onLine) {
  let decoder = new StringDecoder("utf8");
  let pending = "";
  let stopped = false;
  let onData = (chunk) => {
    if (stopped) return;
    pending += typeof chunk === "string" ? chunk : decoder.write(chunk);
    let newlineIndex;
    while (
      (newlineIndex = pending.indexOf(`
`)) >= 0
    ) {
      let sliced = pending.slice(0, newlineIndex);
      pending = pending.slice(newlineIndex + 1);
      if (sliced) onLine(sliced);
    }
    if (pending.length > MAX_LINE_CHARS) {
      stopped = true;
      pending = "";
      if ("destroy" in stream) stream.destroy();
    }
  };
  let flush = () => {
    if (stopped) return;
    pending += decoder.end();
    if (pending) {
      onLine(pending);
      pending = "";
    }
  };
  stream.on("data", onData);
  stream.on("end", flush);
  stream.on("close", flush);
  return () => {
    stream.off("data", onData);
    stream.off("end", flush);
    stream.off("close", flush);
  };
}
export { readStreamLines };
