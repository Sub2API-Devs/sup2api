/**
 * utils/embeddedAssets.ts
 *
 * 2.1.316 新增：内嵌资源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sgzeept5.js (6)
 * attribution: placement 6
 */
import { isAbsolute, join } from "path";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";

//@ chunk-sgzeept5.js:308-330 placement
var g = [40, 181, 47, 253];
//@ chunk-sgzeept5.js:330-389 placement
function s(r) {
  return r.length >= 4 && g.every((t, e) => r[e] === t);
}
//@ chunk-sgzeept5.js:389-426 placement
function o(r, t) {
  return isAbsolute(r) ? r : join(t, r);
}
/**
 * 读取内嵌资源（zstd 压缩时解压）为文本。
 */
//@ chunk-sgzeept5.js:426-532 placement
async function readEmbeddedText(r, t) {
  let e = await readFile(o(r, t));
  return (s(e) ? await Bun.zstdDecompress(e) : e).toString("utf8");
}
//@ chunk-sgzeept5.js:532-582 placement
function Et(r, t) {
  return readEmbeddedSync(r, t).toString("utf8");
}
/**
 * 同步读取内嵌资源（必要时解压），缺失时抛错。
 */
//@ chunk-sgzeept5.js:582-764 placement
function readEmbeddedSync(r, t) {
  let e = o(r, t);
  try {
    let n = readFileSync(e);
    return s(n) ? Bun.zstdDecompressSync(n) : n;
  } catch (error) {
    throw Object.assign(Error("embedded asset is missing or corrupt", { cause: error }), { path: e });
  }
}

export { Et, readEmbeddedText, readEmbeddedSync };
