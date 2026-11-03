/**
 * utils/abortReasons.ts
 *
 * 2.1.316 新增：中止原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { unwrapAbortReason } from "./abortController.js";

//@ chunk-e6aww6q8.js:186494-186593 placement
var z6n = (e, n) => {
  if (n !== "turn") return !1;
  let r = unwrapAbortReason(e);
  return r === "turn-abort" || r === "permission-stop";
};
/**
 * 给中止信号注册一次性监听，返回可 dispose 的对象以便在作用域结束时移除。
 */
//@ chunk-e6aww6q8.js:186593-186713 placement
function onAbortDisposable(e, n) {
  return (
    e.addEventListener("abort", n, { once: !0 }),
    {
      [Symbol.dispose]() {
        e.removeEventListener("abort", n);
      },
    }
  );
}
//@ chunk-e6aww6q8.js:186713-186807 placement
function Vun(e) {
  let n = e.innerCall === !0,
    r = e.agentId === void 0;
  return n ? "inner" : r ? "turn" : "agent";
}

export { Vun, z6n, onAbortDisposable };
