/**
 * assets/embeddedResource.ts
 *
 * 2.1.316 新增：内嵌资源模块。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r4f248e9.js (2), chunk-zgfxb7w4.js (2)
 * attribution: placement 4
 */
import __cc_resource_0_10 from "../../assets/package-build.mjs-5c9a3b66.txt.zst" with { type: "file" };
import __cc_resource_0 from "../../assets/capture.mjs-9e2f2f8b.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../utils/embeddedAssets.js";

//@ chunk-r4f248e9.js:316-338 placement
var packageBuildMjsResourceFile = __cc_resource_0_10;
//@ chunk-r4f248e9.js:338-370 placement
var packageBuildMjsTextContent = readEmbeddedTextSync(packageBuildMjsResourceFile, import.meta.dirname);
//@ chunk-zgfxb7w4.js:310-332 placement
var captureMjsResourceFile = __cc_resource_0;
//@ chunk-zgfxb7w4.js:332-364 placement
var captureMjsTextContent = readEmbeddedTextSync(captureMjsResourceFile, import.meta.dirname);
export { packageBuildMjsTextContent, captureMjsTextContent };
