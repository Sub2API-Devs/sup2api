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
/**
 * zstd 压缩流的魔数字节。
 */
var ZSTD_MAGIC_BYTES = [40, 181, 47, 253];
//@ chunk-sgzeept5.js:330-389 placement
/**
 * 判断数据是否以 zstd 魔数开头。
 */
function isZstdCompressed(file) {
  return file.length >= 4 && ZSTD_MAGIC_BYTES.every((t, e) => file[e] === t);
}
//@ chunk-sgzeept5.js:389-426 placement
/**
 * 内嵌资源路径解析（相对路径拼上基准目录）。
 */
function resolveResourcePath(r, t) {
  return isAbsolute(r) ? r : join(t, r);
}
//@ chunk-sgzeept5.js:426-532 placement
/**
 * 读取内嵌资源（zstd 压缩时解压）为文本。
 */
async function readEmbeddedText(r, dirname) {
  let file = await readFile(resolveResourcePath(r, dirname));
  return (isZstdCompressed(file) ? await Bun.zstdDecompress(file) : file).toString("utf8");
}
//@ chunk-sgzeept5.js:532-582 placement
/**
 * 同步读取内嵌资源并转成文本。
 */
function readEmbeddedTextSync(r, dirname) {
  return readEmbeddedSync(r, dirname).toString("utf8");
}
//@ chunk-sgzeept5.js:582-764 placement
/**
 * 同步读取内嵌资源（必要时解压），缺失时抛错。
 */
function readEmbeddedSync(r, t) {
  let resourcePath = resolveResourcePath(r, t);
  try {
    let file = readFileSync(resourcePath);
    return isZstdCompressed(file) ? Bun.zstdDecompressSync(file) : file;
  } catch (error) {
    throw Object.assign(
      Error("embedded asset is missing or corrupt", {
        cause: error,
      }),
      {
        path: resourcePath,
      },
    );
  }
}
export { readEmbeddedTextSync, readEmbeddedText, readEmbeddedSync };
