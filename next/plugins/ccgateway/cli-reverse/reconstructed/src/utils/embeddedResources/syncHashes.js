/**
 * utils/embeddedResources/syncHashes.ts
 *
 * 2.1.316 新增：内嵌资源：同步哈希脚本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cqe8z9fk.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../assets/sync-hashes.mjs-a0844915.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../embeddedAssets.js";

//@ chunk-cqe8z9fk.js:314-336 placement
/**
 * 同步哈希的内嵌资源名。
 */
var SYNC_HASHES_RESOURCE = __cc_resource_0;
//@ chunk-cqe8z9fk.js:336-368 placement
/**
 * 读出的同步哈希文本。
 */
var syncHashesText = readEmbeddedTextSync(SYNC_HASHES_RESOURCE, import.meta.dirname);
export { syncHashesText };
