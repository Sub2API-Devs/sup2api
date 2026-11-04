/**
 * skills/bundled/assets/remoteDiffScript.ts
 *
 * 2.1.316 新增：内置技能附带的远程 diff 脚本资源。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6m8bf9y.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../../assets/remote-diff.mjs-a2ecedbc.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-e6m8bf9y.js:314-336 placement
var remoteDiffPath = __cc_resource_0;
//@ chunk-e6m8bf9y.js:336-368 placement
/**
 * remote-diff 技能附带的脚本资源文本。
 */
var remoteDiff = readEmbeddedTextSync(remoteDiffPath, import.meta.dirname);
export { remoteDiff };
