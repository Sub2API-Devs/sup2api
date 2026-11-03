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
var MAX_NOTICE_BACKLOG = 50;
//@ chunk-b272vy9d.js:236-501 placement
function createNoticeBacklog() {
  let signal = createSignal();
  let t = [];
  let n = 0;
  return {
    publish(line, level, r) {
      let u =
        r === undefined
          ? {
              line,
              level,
            }
          : {
              line,
              level,
              notice: r,
            };
      if (n === 0) {
        t = [...t, u].slice(-MAX_NOTICE_BACKLOG);
        return;
      }
      signal.emit(u);
    },
    takeBacklog() {
      let e = t;
      t = [];
      return e;
    },
    subscribe(e) {
      n += 1;
      let i = signal.subscribe(e);
      return () => {
        n -= 1;
        i();
      };
    },
  };
}
export { createNoticeBacklog };
