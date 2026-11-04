/**
 * utils/eventLoopLag.ts
 *
 * 2.1.316 新增：事件循环延迟测量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q62qy39y.js (2)
 * attribution: placement 2
 */

//@ chunk-q62qy39y.js:191-202 placement
/**
 * 事件循环延迟采样间隔（毫秒）。
 */
var LAG_SAMPLE_INTERVAL_MS = 50;
//@ chunk-q62qy39y.js:202-436 placement
/**
 * 启动事件循环延迟监测：定时器检查实际触发时间与预期的差，可取出并重置最大延迟，停止时返回最终最大值。
 */
function startEventLoopLagMonitor(thresholdMs) {
  let deadline = performance.now() + thresholdMs;
  let lagCount = 0;
  let interval = setInterval(() => {
    let startTime = performance.now();
    lagCount = Math.max(lagCount, startTime - deadline);
    deadline = startTime + thresholdMs;
  }, thresholdMs);
  interval.unref();
  return {
    takeMaxMs() {
      let lagCount_2 = lagCount;
      lagCount = 0;
      return lagCount_2;
    },
    stop() {
      clearInterval(interval);
      return Math.max(lagCount, performance.now() - deadline);
    },
  };
}
export { startEventLoopLagMonitor, LAG_SAMPLE_INTERVAL_MS };
