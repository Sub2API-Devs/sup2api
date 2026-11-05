/**
 * utils/nativeInstaller/nativeBinaryMissing.ts
 *
 * 2.1.316 新增：原生二进制缺失判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-22e5gbfj.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-22e5gbfj.js:191-246 placement
/**
 * 探测原生二进制时的最大读取字节数，以及"未安装"提示文本。
 */
var MAX_BINARY_PROBE_BYTES = 65536;
var NATIVE_BINARY_MISSING_TEXT = "claude native binary not installed";
export { NATIVE_BINARY_MISSING_TEXT, MAX_BINARY_PROBE_BYTES };
