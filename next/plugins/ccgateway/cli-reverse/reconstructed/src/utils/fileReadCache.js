/**
 * utils/fileReadCache.ts
 *
 * 按 mtime 校验的文件内容 LRU 缓存（1000 条、16MB）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileReadCache.ts
 * pieces: chunk-cec8js9j.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { getFsImplementation } from "./fsOperations.js";
import { assertReadableFile } from "./fileRead.js";
import { detectFileEncoding } from "./file.js";

//@ chunk-cec8js9j.js:834-856 affinity
var DEFAULT_MAX_CACHE_ENTRIES = 1000;
var DEFAULT_MAX_CACHE_BYTES = 16777216;
//@ chunk-cec8js9j.js:856-1515 fingerprint (2.1.88 match: FileReadCache, 0.757)
/**
 * 按 mtime 校验的文件内容 LRU 缓存（默认 1000 条、16MB）。
 */
class FileReadCache {
  cache;
  constructor(max = DEFAULT_MAX_CACHE_ENTRIES, maxSize = DEFAULT_MAX_CACHE_BYTES) {
    this.cache = new LRUCache({
      max,
      maxSize,
      sizeCalculation: (entry) => Math.max(1, entry.content.length),
    });
  }
  readFile(filePath) {
    let fsImplementation = getFsImplementation();
    let stats;
    try {
      stats = fsImplementation.statSync(filePath);
    } catch (error) {
      this.cache.delete(filePath);
      throw error;
    }
    if (!stats.isFile()) {
      this.cache.delete(filePath);
      assertReadableFile(stats, filePath, undefined);
    }
    let cachedData = this.cache.get(filePath);
    if (cachedData && cachedData.mtime === stats.mtimeMs)
      return {
        content: cachedData.content,
        encoding: cachedData.encoding,
      };
    let encoding = detectFileEncoding(filePath);
    let content = fsImplementation
      .readFileSync(filePath, {
        encoding,
      })
      .replaceAll(
        `\r
`,
        `
`,
      );
    this.cache.set(filePath, {
      content,
      encoding,
      mtime: stats.mtimeMs,
    });
    return {
      content,
      encoding,
    };
  }
  invalidate(filePath) {
    this.cache.delete(filePath);
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
