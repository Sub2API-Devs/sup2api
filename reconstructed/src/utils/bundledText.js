/**
 * utils/bundledText.ts
 *
 * 2.1.316 新增：内置文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "./debug.js";
import { errorMessage, getErrnoPath as getErrnoPath_2 } from "./errors.js";

/**
 * 读取内置文本资源（兼容 default 导出），不是字符串时抛错；读取失败时记录错误日志（资源路径与原因）后重新抛出。
 */
//@ chunk-e6aww6q8.js:2323942-2324273 placement
function loadBundledText(e) {
  try {
    let n = e(),
      r = typeof n === "object" && n !== null && "default" in n ? n.default : n;
    if (typeof r !== "string") throw Error("a bundled text did not load as a string");
    return r;
  } catch (error) {
    let r = error instanceof Error ? error.cause : void 0;
    throw (
      logForDebugging(
        `A bundled text could not be read: ${errorMessage(error)}; asset: ${getErrnoPath_2(error)}; cause: ${errorMessage(r)}`,
        { level: "error" },
      ),
      error
    );
  }
}

export { loadBundledText };
