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
function startEventLoopLagMonitor(o) {
  let r = performance.now() + o;
  let e = 0;
  let interval = setInterval(() => {
    let startTime = performance.now();
    e = Math.max(e, startTime - r);
    r = startTime + o;
  }, o);
  interval.unref();
  return {
    takeMaxMs() {
      let t = e;
      e = 0;
      return t;
    },
    stop() {
      clearInterval(interval);
      return Math.max(e, performance.now() - r);
    },
  };
}
export { startEventLoopLagMonitor, LAG_SAMPLE_INTERVAL_MS };
