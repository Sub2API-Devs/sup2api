/**
 * commands/bridge/c4eUpsellRegistry.ts
 *
 * 2.1.316 新增：远程控制相关升级提示的登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8k8yqdkq.js (3)
 * attribution: placement 3
 */

//@ chunk-8k8yqdkq.js:191-341 placement
class C4EUpsellRegistry {
  implementation = null;
  isC4EUpsellCommandEnabled() {
    return this.implementation === null ? !1 : this.implementation();
  }
  register(e) {
    this.implementation = e;
  }
}
//@ chunk-8k8yqdkq.js:341-355 placement
var wYo = new C4EUpsellRegistry();
//@ chunk-8k8yqdkq.js:355-413 placement
function Pri(e) {
  wYo.register(e.isC4EUpsellCommandEnabled);
}

export { wYo, Pri };
