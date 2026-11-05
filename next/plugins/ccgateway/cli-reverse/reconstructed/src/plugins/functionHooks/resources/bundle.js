/**
 * plugins/functionHooks/resources/bundle.ts
 *
 * 函数钩子资源包加载器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhkyxh70.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../../assets/bundle.mjs-c7466167.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-mhkyxh70.js:309-331 placement
/**
 * 内嵌资源
 */
var BUNDLE_RESOURCE = __cc_resource_0;
//@ chunk-mhkyxh70.js:331-363 placement
/**
 * 读取资源文本
 */
var bundleResourceText = readEmbeddedTextSync(BUNDLE_RESOURCE, import.meta.dirname);
export { bundleResourceText };
