/**
 * utils/udsPaths.ts
 *
 * UDS/命名管道路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e7z1g8a9.js (2)
 * attribution: placement 2
 */
import { resolve } from "path";
import { createHash } from "crypto";
import { parseNamedPipeName, asciiLowerCase } from "./peerAddress.js";
import { hasDotDotSegment } from "./pathClassification.js";

//@ chunk-e7z1g8a9.js:4216-4318 placement
/**
 * 规范化 socket 路径：命名管道转为小写管道路径，否则解析为绝对路径（特殊地址为 undefined）。
 */
function canonicalSocketPath(path) {
  let namedPipeName = parseNamedPipeName(path);
  if (namedPipeName !== undefined) return `\\\\.\\pipe\\${asciiLowerCase(namedPipeName)}`;
  if (hasDotDotSegment(path)) return;
  return resolve(path);
}
//@ chunk-e7z1g8a9.js:4318-4406 placement
function hashCanonicalSocketPath(path) {
  let canonical = canonicalSocketPath(path);
  return canonical === undefined ? undefined : createHash("sha256").update(canonical).digest("hex");
}
export { canonicalSocketPath, hashCanonicalSocketPath };
