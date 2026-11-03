/**
 * replSessionSeat.ts
 *
 * REPL 会话席位（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-atva6bc2.js (1)
 * attribution: placement 1
 */
import { m2r } from "./plugins/functionHooks/hooksWorkerHost.js";
import {
  enqueuePendingNotification,
  installCommandQueue,
  createMessageQueueManager,
  mg,
} from "./utils/messageQueueManager.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { createQueueRecorder } from "./utils/messageQueue/queueRecords.js";
import { recordQueueOperation } from "./utils/sessionStorage.js";

/**
 * 占用 REPL 会话席位并创建消息队列：启用 v5 存储且有会话时用记录队列操作的持久队列管理器，否则用内存队列。
 */
//@ chunk-atva6bc2.js:285-404 placement
function createReplMessageQueue(e) {
  return (
    m2r.seat(enqueuePendingNotification),
    isStorageV5Enabled() && e !== void 0
      ? installCommandQueue((o) =>
          createMessageQueueManager({
            recordOperation: createQueueRecorder((r) => {
              recordQueueOperation(r, e);
            }),
            adopt: o,
          }),
        )
      : mg()
  );
}

export { createReplMessageQueue };
