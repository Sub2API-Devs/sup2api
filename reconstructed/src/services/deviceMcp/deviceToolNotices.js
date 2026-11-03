/**
 * services/deviceMcp/deviceToolNotices.ts
 *
 * 2.1.316 新增。设备工具通知的发射器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n3mhm88b.js (3)
 * attribution: placement 3
 */
import { createSignal } from "../../utils/signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-n3mhm88b.js:298-516 placement
/**
 * 无订阅者时缓存最后事件的发射器
 */
function createBufferedEmitter() {
  let signal = createSignal();
  let e = new Map();
  let o = 0;
  return {
    emit(i, s) {
      if (o === 0) {
        e.set(i, s);
        return;
      }
      signal.emit(i, s);
    },
    subscribe(i) {
      o++;
      let s = [...e];
      e.clear();
      for (let [g, l] of s) i(g, l);
      let c = signal.subscribe(i);
      let n = true;
      return () => {
        if (n) {
          n = false;
          o--;
          c();
        }
      };
    },
  };
}
//@ chunk-n3mhm88b.js:516-559 placement
var deviceToolNotices = new SessionRootSlot(createBufferedEmitter);
var DEVICE_MCP_NOT_NOW_NOTICE_KEY = "device-mcp-not-now";
//@ chunk-n3mhm88b.js:559-641 placement
/**
 * 设备工具通知的发射器。
 */
function deviceToolNoticesTo(r) {
  return (e, o) => {
    logForDebugging(`[remote-tools] ${e}: ${o}`);
    deviceToolNotices.of(r).emit(e, o);
  };
}
export { deviceToolNotices, DEVICE_MCP_NOT_NOW_NOTICE_KEY, deviceToolNoticesTo };
