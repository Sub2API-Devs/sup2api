/**
 * utils/idHolder.ts
 *
 * 2.1.316 新增：保存一个 id 的小容器。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1k5b7dt6.js (1)
 * attribution: placement 1
 */

//@ chunk-1k5b7dt6.js:191-235 placement
/**
 * 只保存一个 id 的小容器，可 clear。
 */
class IdHolder {
  id = undefined;
  clear() {
    this.id = undefined;
  }
}
export { IdHolder };
