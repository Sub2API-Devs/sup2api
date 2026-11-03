/**
 * utils/instanceRegistry.ts
 *
 * 2.1.316 新增：按类懒创建并缓存单例实例的注册表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (1)
 * attribution: placement 1
 */

//@ chunk-s61vbvea.js:603648-603762 placement
/**
 * 按类懒创建并缓存单例实例的注册表。
 */
class InstanceRegistry {
  #e = new Map();
  get(e) {
    let n = this.#e.get(e);
    if (n instanceof e) return n;
    let r = new e();
    this.#e.set(e, r);
    return r;
  }
}
export { InstanceRegistry };
