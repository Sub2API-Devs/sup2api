/**
 * skills/bundled/storybookResources.ts
 *
 * 2.1.316 新增：Storybook 资源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-559xbt4k.js (2), chunk-dx6xs6zp.js (7), chunk-pvha902d.js (2), chunk-xt50y10f.js (2)
 * attribution: placement 13
 */
import __cc_resource_6 from "../../../assets/SKILL-a98d25a2.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../assets/SKILL-b6859017.md.zst" with { type: "file" };
import __cc_resource_8 from "../../../assets/SKILL-76b8b2a9.md.zst" with { type: "file" };
import __cc_resource_0_2 from "../../../assets/validate_palette.py-f97163c4.txt.zst" with { type: "file" };
import __cc_resource_0 from "../../../assets/common.mjs-21a45017.txt.zst" with { type: "file" };
import __cc_resource_0_3 from "../../../assets/css.mjs-0d869c37.txt.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";
import { c, l, p, d, m, f } from "../../../vendor/bun-resource/index.js";

//@ chunk-dx6xs6zp.js:1303-1325 placement
var skillPath = __cc_resource_6;
//@ chunk-dx6xs6zp.js:1325-1357 placement
var nonStorybookSkill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-dx6xs6zp.js:1357-1379 placement
var skillPath2 = __cc_resource_7;
//@ chunk-dx6xs6zp.js:1379-1411 placement
var skill = readEmbeddedTextSync(skillPath2, import.meta.dirname);
//@ chunk-dx6xs6zp.js:1411-1433 placement
var skillPath3 = __cc_resource_8;
//@ chunk-dx6xs6zp.js:1433-1465 placement
var storybookSkill = readEmbeddedTextSync(skillPath3, import.meta.dirname);
//@ chunk-dx6xs6zp.js:1465-2756 placement
/**
 * 取模块默认导出（字符串直接返回），以及 storybook 技能资源文件的加载声明。
 */
var unwrapDefaultExport = (t) => (typeof t === "string" ? t : t.default);
var PACKAGE_BUILD_SCRIPT = require("./chunk-f7aq15sv.js");
var PACKAGE_VALIDATE_SCRIPT = require("./chunk-4yryjne9.js");
var LIB_COMMON_SCRIPT = require("./chunk-pvha902d.js");
var LIB_DETECT_SCRIPT = c();
var LIB_BUNDLE_SCRIPT = require("./chunk-kpkakvzd.js");
var LIB_DTS_SCRIPT = require("./chunk-xcj8pcqy.js");
var LIB_CSS_SCRIPT = require("./chunk-xt50y10f.js");
var LIB_SOURCE_STORYBOOK_SCRIPT = require("./chunk-0shjtwgf.js");
var LIB_SOURCE_KIT_SCRIPT = l();
var LIB_STORY_IMPORTS_SCRIPT = require("./chunk-5265f3tr.js");
var LIB_CSS_FALLBACK_SCRIPT = p();
var LIB_EMIT_SCRIPT = require("./chunk-w24rpgt4.js");
var LIB_PREVIEWS_SCRIPT = require("./chunk-qe856w7f.js");
var LIB_PREVIEW_GEN_STORYBOOK_SCRIPT = d();
var LIB_DOCS_SCRIPT = require("./chunk-sc0k3q3c.js");
var LIB_PREVIEW_REBUILD_SCRIPT = require("./chunk-f3v430vj.js");
var STORYBOOK_HTTP_SERVE_SCRIPT = m();
var STORYBOOK_PROBE_SCRIPT = f();
var STORYBOOK_COMPARE_SCRIPT = require("./chunk-4rvgg7se.js");
var PACKAGE_CAPTURE_SCRIPT = require("./chunk-vfcx2fay.js");
var LIB_SYNC_HASHES_SCRIPT = require("./chunk-sd0b2vx1.js");
var LIB_REMOTE_DIFF_SCRIPT = require("./chunk-e6m8bf9y.js");
var RESYNC_SCRIPT = require("./chunk-g16b0bhz.js");
var STORYBOOK_SKILL_PROMPT = skill;
var STORYBOOK_SKILL_FILES = {
  "storybook/SKILL.md": storybookSkill,
  "non-storybook/SKILL.md": nonStorybookSkill,
  "package-build.mjs": unwrapDefaultExport(PACKAGE_BUILD_SCRIPT),
  "package-validate.mjs": unwrapDefaultExport(PACKAGE_VALIDATE_SCRIPT),
  "lib/common.mjs": unwrapDefaultExport(LIB_COMMON_SCRIPT),
  "lib/detect.mjs": unwrapDefaultExport(LIB_DETECT_SCRIPT),
  "lib/bundle.mjs": unwrapDefaultExport(LIB_BUNDLE_SCRIPT),
  "lib/dts.mjs": unwrapDefaultExport(LIB_DTS_SCRIPT),
  "lib/css.mjs": unwrapDefaultExport(LIB_CSS_SCRIPT),
  "lib/source-storybook.mjs": unwrapDefaultExport(LIB_SOURCE_STORYBOOK_SCRIPT),
  "lib/source-kit.mjs": unwrapDefaultExport(LIB_SOURCE_KIT_SCRIPT),
  "lib/story-imports.mjs": unwrapDefaultExport(LIB_STORY_IMPORTS_SCRIPT),
  "lib/css-fallback.mjs": unwrapDefaultExport(LIB_CSS_FALLBACK_SCRIPT),
  "lib/emit.mjs": unwrapDefaultExport(LIB_EMIT_SCRIPT),
  "lib/previews.mjs": unwrapDefaultExport(LIB_PREVIEWS_SCRIPT),
  "lib/preview-gen-storybook.mjs": unwrapDefaultExport(LIB_PREVIEW_GEN_STORYBOOK_SCRIPT),
  "lib/docs.mjs": unwrapDefaultExport(LIB_DOCS_SCRIPT),
  "lib/preview-rebuild.mjs": unwrapDefaultExport(LIB_PREVIEW_REBUILD_SCRIPT),
  "storybook/http-serve.mjs": unwrapDefaultExport(STORYBOOK_HTTP_SERVE_SCRIPT),
  "storybook/probe.mjs": unwrapDefaultExport(STORYBOOK_PROBE_SCRIPT),
  "storybook/compare.mjs": unwrapDefaultExport(STORYBOOK_COMPARE_SCRIPT),
  "package-capture.mjs": unwrapDefaultExport(PACKAGE_CAPTURE_SCRIPT),
  "lib/sync-hashes.mjs": unwrapDefaultExport(LIB_SYNC_HASHES_SCRIPT),
  "lib/remote-diff.mjs": unwrapDefaultExport(LIB_REMOTE_DIFF_SCRIPT),
  "resync.mjs": unwrapDefaultExport(RESYNC_SCRIPT),
};
//@ chunk-559xbt4k.js:318-340 placement
var validatePalettePath = __cc_resource_0_2;
//@ chunk-559xbt4k.js:340-372 placement
/**
 * storybook 技能附带的调色板校验脚本文本。
 */
var validatePalette = readEmbeddedTextSync(validatePalettePath, import.meta.dirname);
//@ chunk-pvha902d.js:309-331 placement
var commonPath = __cc_resource_0;
//@ chunk-pvha902d.js:331-363 placement
/**
 * storybook 技能附带的 common 示例资源文本。
 */
var common = readEmbeddedTextSync(commonPath, import.meta.dirname);
//@ chunk-xt50y10f.js:306-328 placement
var cssPath = __cc_resource_0_3;
//@ chunk-xt50y10f.js:328-360 placement
/**
 * storybook 技能附带的 css 示例资源文本。
 */
var css = readEmbeddedTextSync(cssPath, import.meta.dirname);
