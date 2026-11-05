/**
 * utils/cliArgvReader.ts
 *
 * 2.1.316 新增。注入式命令行参数读取器（避免循环依赖）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ajqq8a9j.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "./identity.js";

//@ chunk-ajqq8a9j.js:227-272 placement
/**
 * 可注入的原始 argv 读取器状态（启动时设置）。
 */
var cliArgvReaderState = identity(
  {
    read: undefined,
  },
  (state) => {
    state.read = undefined;
  },
);
//@ chunk-ajqq8a9j.js:272-297 placement
function installCliArgvReader(read) {
  cliArgvReaderState.read = read;
}
//@ chunk-ajqq8a9j.js:297-326 placement
/**
 * 注入式命令行参数读取器（避免循环依赖）。
 */
function cliArgvReader() {
  return cliArgvReaderState.read;
}
export { cliArgvReader, installCliArgvReader };
