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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-n3mhm88b.js:298-516 placement
/**
 * 无订阅者时缓存最后事件的发射器
 */
function createBufferedEmitter() {
  let signal = createSignal();
  let buffered = new Map();
  let subscriberCount = 0;
  return {
    emit(key, payload) {
      if (subscriberCount === 0) {
        buffered.set(key, payload);
        return;
      }
      signal.emit(key, payload);
    },
    subscribe(listener) {
      subscriberCount++;
      let replayed = [...buffered];
      buffered.clear();
      for (let [key, payload] of replayed) listener(key, payload);
      let unsubscribe = signal.subscribe(listener);
      let active = true;
      return () => {
        if (active) {
          active = false;
          subscriberCount--;
          unsubscribe();
        }
      };
    },
  };
}
//@ chunk-n3mhm88b.js:516-559 placement
var deviceToolNotices; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var DEVICE_MCP_NOT_NOW_NOTICE_KEY;
deferInit("chunk-n3mhm88b.js:516", () => {
  deviceToolNotices = new SessionRootSlot(createBufferedEmitter);
  DEVICE_MCP_NOT_NOW_NOTICE_KEY = "device-mcp-not-now";
});
//@ chunk-n3mhm88b.js:559-641 placement
/**
 * 设备工具通知的发射器。
 */
function deviceToolNoticesTo(host) {
  return (key, message) => {
    logForDebugging(`[remote-tools] ${key}: ${message}`);
    deviceToolNotices.of(host).emit(key, message);
  };
}
export { deviceToolNotices, DEVICE_MCP_NOT_NOW_NOTICE_KEY, deviceToolNoticesTo };
