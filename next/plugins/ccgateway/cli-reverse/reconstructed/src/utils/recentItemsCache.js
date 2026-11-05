/**
 * utils/recentItemsCache.ts
 *
 * 2.1.316 新增：按 id 记住最近项目的 LRU（512）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3xhr2e4v.js (1)
 * attribution: placement 1
 */

//@ chunk-3xhr2e4v.js:191-409 placement
/**
 * 按 id 记住最近条目的 LRU 缓存，最多保留 512 条。
 */
class RecentItemsCache {
  #e = new Map();
  remember(items) {
    for (let item of items) {
      this.#e.delete(item.id);
      this.#e.set(item.id, item);
    }
    for (let key of this.#e.keys()) {
      if (this.#e.size <= 512) break;
      this.#e.delete(key);
    }
  }
  get(id) {
    return this.#e.get(id);
  }
  clear() {
    this.#e.clear();
  }
}
export { RecentItemsCache };
