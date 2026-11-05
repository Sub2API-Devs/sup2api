/**
 * utils/secureStorage/preservedTmpNotice.ts
 *
 * 登录没写进去、但新凭证被留在临时文件时的提示与清理（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0m0r151k.js (1)
 * attribution: placement 1
 */
import { unlink } from "fs/promises";
import { logForDebugging } from "../debug.js";

//@ chunk-0m0r151k.js:263-580 placement
/**
 * 登录凭证没能写进去时的处理：目标文件未被改动就删掉保存新凭证的临时文件，否则提示临时文件位置。
 */
async function preservedTmpOf(error) {
  if (!(error instanceof Error) || !("preservedTmp" in error) || typeof error.preservedTmp !== "string")
    return;
  if ("targetOutcome" in error && error.targetOutcome === "untouched")
    try {
      await unlink(error.preservedTmp);
      return;
    } catch {}
  logForDebugging(
    `The login was not saved: a temp file that holds the new one is left at ${error.preservedTmp}`,
    {
      level: "error",
    },
  );
}
export { preservedTmpOf };
