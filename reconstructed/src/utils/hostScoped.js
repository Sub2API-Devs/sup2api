/**
 * utils/hostScoped.ts
 *
 * 2.1.316 新增：按宿主划分的值
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2nmyq07e.js (2), chunk-x7vma94a.js (8)
 * attribution: placement 10
 */

//@ chunk-x7vma94a.js:191-335 placement
/**
 * 按宿主对象惰性创建并缓存一个值（WeakMap 键为宿主）；of(host) 首次调用时用工厂函数创建。全局状态按会话宿主隔离的基础设施，被 400 多处使用。
 */
class HostScoped {
  #o;
  #r = new WeakMap();
  constructor(o) {
    this.#o = o;
  }
  of(o) {
    let e = this.#r.get(o);
    if (e !== undefined) return e;
    let s = this.#o();
    this.#r.set(o, s);
    return s;
  }
}
//@ chunk-x7vma94a.js:335-405 placement
var disklessHooks = {
  isDiskless: () => false,
  isDisklessProcess: () => false,
  reportBuilt: () => {},
};
//@ chunk-x7vma94a.js:405-425 placement
/**
 * 安装无盘模式的钩子实现。
 */
function setDisklessHooks(o) {
  disklessHooks = o;
}
//@ chunk-x7vma94a.js:425-462 placement
/**
 * 判断当前是否处于无盘模式。
 */
function isDiskless() {
  return disklessHooks.isDiskless();
}
//@ chunk-x7vma94a.js:462-506 placement
/**
 * 判断当前进程是否按无盘方式运行。
 */
function isDisklessProcess() {
  return disklessHooks.isDisklessProcess();
}
//@ chunk-x7vma94a.js:506-530 placement
/**
 * 进程级共享的空对象宿主作用域存储。
 */
var processScopedEmptyValues = new HostScoped(() => ({}));
//@ chunk-x7vma94a.js:530-556 placement
var NOCONFIGHOMEERROR = "NoConfigHomeError";
//@ chunk-x7vma94a.js:556-653 placement = mergeClients (1)
function mergeClients(o) {
  try {
    return typeof o === "object" && o !== null && "name" in o && o.name === NOCONFIGHOMEERROR;
  } catch {
    return false;
  }
}
//@ chunk-2nmyq07e.js:226-336 placement
class FalseOnceResolver {
  cached = undefined;
  resolve() {
    if (this.cached !== undefined) return this.cached;
    this.cached = false;
    return this.cached;
  }
}
//@ chunk-2nmyq07e.js:336-359 placement
var falseOnceResolver = new HostScoped(() => new FalseOnceResolver());
export {
  isDiskless,
  HostScoped,
  mergeClients,
  isDisklessProcess,
  setDisklessHooks,
  processScopedEmptyValues,
};
