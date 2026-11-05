/**
 * commands/stickers/stickers.ts
 *
 * /stickers 实现：打开贴纸订购页
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/stickers/stickers.ts
 * pieces: chunk-pbh62sn5.js (1)
 * attribution: fingerprint 1
 */
import { openValidatedUrlSucceeded } from "../../utils/browser.js";

//@ chunk-pbh62sn5.js:1123-1365 fingerprint (2.1.88 match: call, 0.8)
/**
 * /stickers 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call() {
  if (await openValidatedUrlSucceeded("https://www.stickermule.com/claudecode"))
    return {
      type: "text",
      value: "Opening sticker page in browser\u2026",
    };
  else
    return {
      type: "text",
      value: "Failed to open browser. Visit: https://www.stickermule.com/claudecode",
    };
}
export { call };
