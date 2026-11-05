/**
 * skills/bundled/assets/docsScript.ts
 *
 * 2.1.316 新增：内置技能附带的文档脚本资源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6wpc4r15.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../../assets/docs.mjs-0d218ce7.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-6wpc4r15.js:307-329 placement
var docsPath = __cc_resource_0;
//@ chunk-6wpc4r15.js:329-361 placement
/**
 * docs 技能附带的脚本资源文本。
 */
var docs = readEmbeddedTextSync(docsPath, import.meta.dirname);
export { docs };
