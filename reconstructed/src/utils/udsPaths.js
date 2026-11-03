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
import { Eh } from "./pathClassification.js";

/**
 * 规范化 socket 路径：命名管道转为小写管道路径，否则解析为绝对路径（特殊地址为 undefined）。
 */
//@ chunk-e7z1g8a9.js:4216-4318 placement
function canonicalSocketPath(e) {
  let n = parseNamedPipeName(e);
  if (n !== void 0) return `\\\\.\\pipe\\${asciiLowerCase(n)}`;
  if (Eh(e)) return;
  return resolve(e);
}
//@ chunk-e7z1g8a9.js:4318-4406 placement
function hashCanonicalSocketPath(e) {
  let n = canonicalSocketPath(e);
  return n === void 0 ? void 0 : createHash("sha256").update(n).digest("hex");
}

export { canonicalSocketPath, hashCanonicalSocketPath };
