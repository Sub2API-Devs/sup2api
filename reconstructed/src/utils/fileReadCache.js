/**
 * utils/fileReadCache.ts
 *
 * 按 mtime 校验的文件内容 LRU 缓存（1000 条、16MB）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileReadCache.ts
 * pieces: chunk-9br8f9tm.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { getFsImplementation } from "./fsOperations.js";
import { assertReadableFile } from "./fileRead.js";
import { detectFileEncoding } from "./file.js";

//@ chunk-9br8f9tm.js:834-856 affinity
var DEFAULT_MAX_CACHE_ENTRIES = 1000,
  DEFAULT_MAX_CACHE_BYTES = 16777216;
/**
 * 按 mtime 校验的文件内容 LRU 缓存（默认 1000 条、16MB）。
 */
//@ chunk-9br8f9tm.js:856-1515 fingerprint = FileReadCache (0.758)
class FileReadCache {
  cache;
  constructor(e = DEFAULT_MAX_CACHE_ENTRIES, n = DEFAULT_MAX_CACHE_BYTES) {
    this.cache = new Dc({ max: e, maxSize: n, sizeCalculation: (r) => Math.max(1, r.content.length) });
  }
  readFile(e) {
    let n = getFsImplementation(),
      r;
    try {
      r = n.statSync(e);
    } catch (error) {
      throw (this.cache.delete(e), error);
    }
    if (!r.isFile()) (this.cache.delete(e), assertReadableFile(r, e, void 0));
    let s = this.cache.get(e);
    if (s && s.mtime === r.mtimeMs) return { content: s.content, encoding: s.encoding };
    let o = detectFileEncoding(e),
      replaced = n.readFileSync(e, { encoding: o }).replaceAll(
        `\r
`,
        `
`,
      );
    return (
      this.cache.set(e, { content: replaced, encoding: o, mtime: r.mtimeMs }),
      { content: replaced, encoding: o }
    );
  }
  invalidate(e) {
    this.cache.delete(e);
  }
  getStats() {
    return {
      size: this.cache.size,
      totalChars: this.cache.calculatedSize,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export { FileReadCache };
