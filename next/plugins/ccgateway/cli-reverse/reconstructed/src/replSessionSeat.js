/**
 * replSessionSeat.ts
 *
 * REPL 会话席位（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4t1wykw2.js (1)
 * attribution: placement 1
 */
import { noticeQueue } from "./plugins/functionHooks/hooksWorkerHost.js";
import {
  enqueuePendingNotification,
  installProcessQueue,
  createMessageQueue,
  getProcessQueue,
} from "./utils/messageQueueManager.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { createQueueRecorder } from "./utils/messageQueue/queueRecords.js";
import { recordQueueOperation } from "./utils/sessionStorage.js";

//@ chunk-4t1wykw2.js:285-404 placement
/**
 * 占用 REPL 会话席位并创建消息队列：启用 v5 存储且有会话时用记录队列操作的持久队列管理器，否则用内存队列。
 */
function createReplMessageQueue(storageV5) {
  noticeQueue.seat(enqueuePendingNotification);
  return isStorageV5Enabled() && storageV5 !== undefined
    ? installProcessQueue((adopt) =>
        createMessageQueue({
          recordOperation: createQueueRecorder((operation) => {
            recordQueueOperation(operation, storageV5);
          }),
          adopt,
        }),
      )
    : getProcessQueue();
}
export { createReplMessageQueue };
