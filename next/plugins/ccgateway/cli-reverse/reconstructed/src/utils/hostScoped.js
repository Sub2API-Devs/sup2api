/**
 * utils/hostScoped.ts
 *
 * 2.1.316 新增：按宿主划分的值
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0qffyy27.js (8), chunk-ma77xh6y.js (2)
 * attribution: placement 10
 */

//@ chunk-0qffyy27.js:191-335 placement
/**
 * 按宿主对象惰性创建并缓存一个值（WeakMap 键为宿主）；of(host) 首次调用时用工厂函数创建。全局状态按会话宿主隔离的基础设施，被 400 多处使用。
 */
class HostScoped {
  #o;
  #r = new WeakMap();
  constructor(create) {
    this.#o = create;
  }
  of(host) {
    let existing = this.#r.get(host);
    if (existing !== undefined) return existing;
    let value = this.#o();
    this.#r.set(host, value);
    return value;
  }
}
//@ chunk-0qffyy27.js:335-405 placement
var disklessHooks = {
  isDiskless: () => false,
  isDisklessProcess: () => false,
  reportBuilt: () => {},
};
//@ chunk-0qffyy27.js:405-425 placement
/**
 * 安装无盘模式的钩子实现。
 */
function setDisklessHooks(hooks) {
  disklessHooks = hooks;
}
//@ chunk-0qffyy27.js:425-462 placement
/**
 * 判断当前是否处于无盘模式。
 */
function isDiskless() {
  return disklessHooks.isDiskless();
}
//@ chunk-0qffyy27.js:462-506 placement
/**
 * 判断当前进程是否按无盘方式运行。
 */
function isDisklessProcess() {
  return disklessHooks.isDisklessProcess();
}
//@ chunk-0qffyy27.js:506-530 placement
/**
 * 进程级共享的空对象宿主作用域存储。
 */
var processScopedEmptyValues = new HostScoped(() => ({}));
//@ chunk-0qffyy27.js:530-556 placement
var NOCONFIGHOMEERROR = "NoConfigHomeError";
//@ chunk-0qffyy27.js:556-653 placement (2.1.88 match: mergeClients, 1)
function mergeClients(client) {
  try {
    return (
      typeof client === "object" && client !== null && "name" in client && client.name === NOCONFIGHOMEERROR
    );
  } catch {
    return false;
  }
}
//@ chunk-ma77xh6y.js:226-336 placement
class FalseOnceResolver {
  cached = undefined;
  resolve() {
    if (this.cached !== undefined) return this.cached;
    this.cached = false;
    return this.cached;
  }
}
//@ chunk-ma77xh6y.js:336-359 placement
var falseOnceResolver = new HostScoped(() => new FalseOnceResolver());
export {
  HostScoped,
  mergeClients,
  isDiskless,
  setDisklessHooks,
  processScopedEmptyValues,
  isDisklessProcess,
};
