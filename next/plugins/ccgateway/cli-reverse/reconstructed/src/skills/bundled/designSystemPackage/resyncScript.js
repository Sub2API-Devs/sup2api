/**
 * skills/bundled/designSystemPackage/resyncScript.ts
 *
 * 2.1.316 新增：设计系统包技能的 resync 脚本资源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cfy51d83.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../../assets/resync.mjs-4ec2827e.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-cfy51d83.js:309-331 placement
var resyncPath = __cc_resource_0;
//@ chunk-cfy51d83.js:331-363 placement
/**
 * design-system 打包技能附带的 resync 脚本文本。
 */
var resync = readEmbeddedTextSync(resyncPath, import.meta.dirname);
export { resync };
