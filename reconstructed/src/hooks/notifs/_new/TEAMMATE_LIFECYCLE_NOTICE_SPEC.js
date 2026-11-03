/**
 * hooks/notifs/_new/TEAMMATE_LIFECYCLE_NOTICE_SPEC.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: sole-consumer-new 1
 */
import { Jn } from "../../../remote/remoteMode.js";
import { isInProcessTeammateTask } from "../../../tasks/InProcessTeammateTask/types.js";
import { makeSpawnNotif, makeShutdownNotif } from "../useTeammateShutdownNotification.js";

/**
 * 启动通知规格：进程内队友任务开始运行或完成时各提示一次。
 */
//@ chunk-18hwfzwa.js:1788457-1788831 sole-consumer-new
var TEAMMATE_LIFECYCLE_NOTICE_SPEC = {
  id: "teammate-lifecycle",
  deps: (h) => [h.teammateStatusSignature, h.addNotification],
  setup() {
    let h = new Set(),
      x = new Set();
    return ({ addNotification: addNotification, store: store }) => {
      if (Jn() !== null) return;
      for (let [ee, ke] of Object.entries(store.getState().tasks)) {
        if (!isInProcessTeammateTask(ke)) continue;
        if (ke.status === "running" && !h.has(ee)) (h.add(ee), addNotification(makeSpawnNotif(1)));
        if (ke.status === "completed" && !x.has(ee)) (x.add(ee), addNotification(makeShutdownNotif(1)));
      }
    };
  },
};

export { TEAMMATE_LIFECYCLE_NOTICE_SPEC };
