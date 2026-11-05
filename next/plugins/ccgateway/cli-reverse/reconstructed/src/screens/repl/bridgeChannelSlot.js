/**
 * screens/repl/bridgeChannelSlot.ts
 *
 * 2.1.316 新增：REPL 的可替换桥/频道槽位（当前桥接与频道实现可热插拔）与空槽位常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pse52p6n.js (2)
 * attribution: placement 2
 */

//@ chunk-pse52p6n.js:1586-1640 placement
var NO_BRIDGE_CONSENT = Object.freeze({
  bridge: undefined,
  channel: undefined,
});
//@ chunk-pse52p6n.js:1640-1813 placement
/**
 * 保存当前桥接对象与频道（connectBridge/disconnectBridge/setChannel）。
 */
class BridgeChannelSlot {
  #e = undefined;
  #r = undefined;
  get bridge() {
    return this.#e;
  }
  get channel() {
    return this.#r;
  }
  connectBridge(bridge) {
    this.#e = bridge;
  }
  disconnectBridge() {
    this.#e = undefined;
  }
  setChannel(channel) {
    this.#r = channel;
  }
}
export { NO_BRIDGE_CONSENT, BridgeChannelSlot };
