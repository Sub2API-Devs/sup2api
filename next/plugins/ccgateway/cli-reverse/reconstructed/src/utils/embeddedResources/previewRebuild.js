/**
 * utils/embeddedResources/previewRebuild.ts
 *
 * 2.1.316 新增：内嵌资源：预览重建脚本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e76rnvgz.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/preview-rebuild.mjs-88e389b0.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../embeddedAssets.js";

//@ chunk-e76rnvgz.js:318-340 placement
/**
 * 预览重建脚本的内嵌资源名。
 */
var PREVIEW_REBUILD_RESOURCE = __cc_resource_0;
//@ chunk-e76rnvgz.js:340-372 placement
/**
 * 读出的预览重建脚本文本（内嵌资源解压后转文本）。
 */
var previewRebuildSource = readEmbeddedTextSync(PREVIEW_REBUILD_RESOURCE, import.meta.dirname);
export { previewRebuildSource };
