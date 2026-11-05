/**
 * utils/noticeBacklog.ts
 *
 * 2.1.316 新增：提示积压队列
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-va9bpgvm.js (2)
 * attribution: placement 2
 */
import { createSignal } from "./signal.js";

//@ chunk-va9bpgvm.js:227-236 placement
var MAX_NOTICE_BACKLOG = 50;
//@ chunk-va9bpgvm.js:236-501 placement
function createNoticeBacklog() {
  let signal = createSignal();
  let backlog = [];
  let subscriberCount = 0;
  return {
    publish(line, level, notice) {
      let entry =
        notice === undefined
          ? {
              line,
              level,
            }
          : {
              line,
              level,
              notice,
            };
      if (subscriberCount === 0) {
        backlog = [...backlog, entry].slice(-MAX_NOTICE_BACKLOG);
        return;
      }
      signal.emit(entry);
    },
    takeBacklog() {
      let pending = backlog;
      backlog = [];
      return pending;
    },
    subscribe(listener) {
      subscriberCount += 1;
      let unsubscribe = signal.subscribe(listener);
      return () => {
        subscriberCount -= 1;
        unsubscribe();
      };
    },
  };
}
export { createNoticeBacklog };
