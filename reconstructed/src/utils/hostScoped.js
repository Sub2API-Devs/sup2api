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

/**
 * 按宿主对象惰性创建并缓存一个值（WeakMap 键为宿主）；of(host) 首次调用时用工厂函数创建。全局状态按会话宿主隔离的基础设施，被 400 多处使用。
 */
//@ chunk-x7vma94a.js:191-335 placement
class HostScoped {
  #o;
  #r = new WeakMap();
  constructor(o) {
    this.#o = o;
  }
  of(o) {
    let e = this.#r.get(o);
    if (e !== void 0) return e;
    let s = this.#o();
    return (this.#r.set(o, s), s);
  }
}
//@ chunk-x7vma94a.js:335-405 placement
var r = { isDiskless: () => !1, isDisklessProcess: () => !1, reportBuilt: () => {} };
//@ chunk-x7vma94a.js:405-425 placement
function vLi(o) {
  r = o;
}
//@ chunk-x7vma94a.js:425-462 placement
function Wre() {
  return r.isDiskless();
}
//@ chunk-x7vma94a.js:462-506 placement
function kLi() {
  return r.isDisklessProcess();
}
//@ chunk-x7vma94a.js:506-530 placement
var TLi = new HostScoped(() => ({}));
//@ chunk-x7vma94a.js:530-556 placement
var NOCONFIGHOMEERROR = "NoConfigHomeError";
//@ chunk-x7vma94a.js:556-653 placement = mergeClients (1)
function mergeClients(o) {
  try {
    return typeof o === "object" && o !== null && "name" in o && o.name === NOCONFIGHOMEERROR;
  } catch {
    return !1;
  }
}
//@ chunk-2nmyq07e.js:226-336 placement
class FalseOnceResolver {
  cached = void 0;
  resolve() {
    if (this.cached !== void 0) return this.cached;
    return ((this.cached = !1), this.cached);
  }
}
//@ chunk-2nmyq07e.js:336-359 placement
var falseOnceResolver = new HostScoped(() => new FalseOnceResolver());

export { Wre, HostScoped, mergeClients, kLi, vLi, TLi };
