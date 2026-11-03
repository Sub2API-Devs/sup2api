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

/**
 * 无订阅者时缓存最后事件的发射器
 */
//@ chunk-n3mhm88b.js:298-516 placement
function createBufferedEmitter() {
  let r = createSignal(),
    e = new Map(),
    o = 0;
  return {
    emit(i, s) {
      if (o === 0) {
        e.set(i, s);
        return;
      }
      r.emit(i, s);
    },
    subscribe(i) {
      o++;
      let s = [...e];
      e.clear();
      for (let [g, l] of s) i(g, l);
      let subscribe = r.subscribe(i),
        n = !0;
      return () => {
        if (n) ((n = !1), o--, subscribe());
      };
    },
  };
}
//@ chunk-n3mhm88b.js:516-559 placement
var deviceToolNotices = new SessionRootSlot(createBufferedEmitter),
  DEVICE_MCP_NOT_NOW_NOTICE_KEY = "device-mcp-not-now";
/**
 * 设备工具通知的发射器。
 */
//@ chunk-n3mhm88b.js:559-641 placement
function deviceToolNoticesTo(r) {
  return (e, o) => {
    (logForDebugging(`[remote-tools] ${e}: ${o}`), deviceToolNotices.of(r).emit(e, o));
  };
}

export { deviceToolNotices, DEVICE_MCP_NOT_NOW_NOTICE_KEY, deviceToolNoticesTo };
