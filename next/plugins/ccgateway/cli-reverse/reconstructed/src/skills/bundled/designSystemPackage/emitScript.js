/**
 * skills/bundled/designSystemPackage/emitScript.ts
 *
 * 2.1.316 新增：设计系统包技能的 emit 脚本资源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b13er50m.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../../assets/emit.mjs-7951914b.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-b13er50m.js:307-329 placement
var emitPath = __cc_resource_0;
//@ chunk-b13er50m.js:329-361 placement
/**
 * design-system 打包技能附带的 emit 脚本文本。
 */
var emit = readEmbeddedTextSync(emitPath, import.meta.dirname);
export { emit };
