/**
 * utils/recentItemsCache.ts
 *
 * 2.1.316 新增：按 id 记住最近项目的 LRU（512）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tm91gg77.js (1)
 * attribution: placement 1
 */

//@ chunk-tm91gg77.js:191-409 placement
/**
 * 按 id 记住最近条目的 LRU 缓存，最多保留 512 条。
 */
class RecentItemsCache {
  #e = new Map();
  remember(i) {
    for (let e of i) {
      this.#e.delete(e.id);
      this.#e.set(e.id, e);
    }
    for (let key of this.#e.keys()) {
      if (this.#e.size <= 512) break;
      this.#e.delete(key);
    }
  }
  get(i) {
    return this.#e.get(i);
  }
  clear() {
    this.#e.clear();
  }
}
export { RecentItemsCache };
