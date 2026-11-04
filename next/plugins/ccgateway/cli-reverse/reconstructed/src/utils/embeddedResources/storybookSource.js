/**
 * utils/embeddedResources/storybookSource.ts
 *
 * 2.1.316 新增：内嵌资源：storybook 源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0shjtwgf.js (2)
 * attribution: placement 2
 */
import __cc_resource_0 from "../../../assets/source-storybook.mjs-125aecbd.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../embeddedAssets.js";

//@ chunk-0shjtwgf.js:319-341 placement
/**
 * storybook 源码的内嵌资源名。
 */
var STORYBOOK_SOURCE_RESOURCE = __cc_resource_0;
//@ chunk-0shjtwgf.js:341-373 placement
/**
 * 读出的 storybook 源码文本。
 */
var storybookSourceText = readEmbeddedTextSync(STORYBOOK_SOURCE_RESOURCE, import.meta.dirname);
export { storybookSourceText };
