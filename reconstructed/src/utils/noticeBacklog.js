/**
 * utils/noticeBacklog.ts
 *
 * 2.1.316 新增：提示积压队列
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b272vy9d.js (2)
 * attribution: placement 2
 */
import { createSignal } from "./signal.js";

//@ chunk-b272vy9d.js:227-236 placement
var a = 50;
//@ chunk-b272vy9d.js:236-501 placement
function createNoticeBacklog() {
  let s = createSignal(),
    t = [],
    n = 0;
  return {
    publish(e, i, r) {
      let u = r === void 0 ? { line: e, level: i } : { line: e, level: i, notice: r };
      if (n === 0) {
        t = [...t, u].slice(-a);
        return;
      }
      s.emit(u);
    },
    takeBacklog() {
      let e = t;
      return ((t = []), e);
    },
    subscribe(e) {
      n += 1;
      let subscribe = s.subscribe(e);
      return () => {
        ((n -= 1), subscribe());
      };
    },
  };
}

export { createNoticeBacklog };
