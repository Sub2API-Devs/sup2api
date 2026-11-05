/**
 * utils/udsPaths.ts
 *
 * UDS/命名管道路径（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-p21mddyh.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve } from "path";
import { createHash } from "crypto";
import { parseNamedPipeName, asciiLowerCase } from "./peerAddress.js";
import { hasDotDotSegment } from "./pathClassification.js";

//@ chunk-p21mddyh.js:4218-4320 placement
/**
 * 规范化 socket 路径：命名管道转为小写管道路径，否则解析为绝对路径（特殊地址为 undefined）。
 */
function canonicalSocketPath(path) {
  let namedPipeName = parseNamedPipeName(path);
  if (namedPipeName !== undefined) return `\\\\.\\pipe\\${asciiLowerCase(namedPipeName)}`;
  if (hasDotDotSegment(path)) return;
  return resolve(path);
}
//@ chunk-p21mddyh.js:4320-4408 placement
function hashCanonicalSocketPath(path) {
  let canonical = canonicalSocketPath(path);
  return canonical === undefined ? undefined : createHash("sha256").update(canonical).digest("hex");
}
export { canonicalSocketPath, hashCanonicalSocketPath };
