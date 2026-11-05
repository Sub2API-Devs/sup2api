/**
 * utils/bundledText.ts
 *
 * 2.1.316 新增：内置文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "./debug.js";
import { errorMessage, getErrnoPath as getErrnoPath_2 } from "./errors.js";

//@ chunk-5xgkngpb.js:2379343-2379674 placement
/**
 * 读取内置文本资源（兼容 default 导出），不是字符串时抛错；读取失败时记录错误日志（资源路径与原因）后重新抛出。
 */
function loadBundledText(load) {
  try {
    let loaded = load();
    let text = typeof loaded === "object" && loaded !== null && "default" in loaded ? loaded.default : loaded;
    if (typeof text !== "string") throw Error("a bundled text did not load as a string");
    return text;
  } catch (error) {
    let cause = error instanceof Error ? error.cause : undefined;
    logForDebugging(
      `A bundled text could not be read: ${errorMessage(error)}; asset: ${getErrnoPath_2(error)}; cause: ${errorMessage(cause)}`,
      {
        level: "error",
      },
    );
    throw error;
  }
}
export { loadBundledText };
