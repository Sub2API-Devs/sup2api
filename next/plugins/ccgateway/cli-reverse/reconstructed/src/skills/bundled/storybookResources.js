/**
 * skills/bundled/storybookResources.ts
 *
 * 2.1.316 新增：Storybook 资源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4gtx349s.js (2), chunk-5a4djsnw.js (2), chunk-6hqkes0x.js (7), chunk-ecm5y1kv.js (2)
 * attribution: placement 9, layout 4
 */
import __cc_resource_0_4 from "../../../assets/validate_palette.py-f97163c4.txt.zst" with { type: "file" };
import __cc_resource_0 from "../../../assets/common.mjs-21a45017.txt.zst" with { type: "file" };
import __cc_resource_0_5 from "../../../assets/css.mjs-0d869c37.txt.zst" with { type: "file" };
import __cc_resource_6 from "../../../assets/SKILL-a98d25a2.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../assets/SKILL-0b6883bd.md.zst" with { type: "file" };
import __cc_resource_8 from "../../../assets/SKILL-9846fcff.md.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";
import {
  detectScript,
  sourceKitScript,
  cssFallbackScript,
  previewGenStorybookScript,
  httpServeScript,
  probeScript,
} from "../../../vendor/bun-resource/index.js";

//@ chunk-ecm5y1kv.js:318-340 placement
var validatePalettePath = __cc_resource_0_4;
//@ chunk-ecm5y1kv.js:340-372 placement
/**
 * storybook 技能附带的调色板校验脚本文本。
 */
var validatePalette = readEmbeddedTextSync(validatePalettePath, import.meta.dirname);
//@ chunk-4gtx349s.js:309-331 placement
var commonPath = __cc_resource_0;
//@ chunk-4gtx349s.js:331-363 placement
/**
 * storybook 技能附带的 common 示例资源文本。
 */
var common = readEmbeddedTextSync(commonPath, import.meta.dirname);
//@ chunk-5a4djsnw.js:306-328 placement
var cssPath = __cc_resource_0_5;
//@ chunk-5a4djsnw.js:328-360 placement
/**
 * storybook 技能附带的 css 示例资源文本。
 */
var css = readEmbeddedTextSync(cssPath, import.meta.dirname);
//@ chunk-6hqkes0x.js:1303-1325 placement
var skillPath = __cc_resource_6;
//@ chunk-6hqkes0x.js:1325-1357 placement
var nonStorybookSkill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-6hqkes0x.js:1357-1379 layout
var storybookSkillResource = __cc_resource_7;
//@ chunk-6hqkes0x.js:1379-1411 layout
var SKILL_MD = readEmbeddedTextSync(storybookSkillResource, import.meta.dirname);
//@ chunk-6hqkes0x.js:1411-1433 layout
var nonStorybookSkillResource = __cc_resource_8;
//@ chunk-6hqkes0x.js:1433-1465 layout
var nonStorybookSkillText = readEmbeddedTextSync(nonStorybookSkillResource, import.meta.dirname);
//@ chunk-6hqkes0x.js:1465-2769 placement
/**
 * 取模块默认导出（字符串直接返回），以及 storybook 技能资源文件的加载声明。
 */
var unwrapDefaultExport = (moduleValue) =>
  typeof moduleValue === "string" ? moduleValue : moduleValue.default;
var packageBuildModule = require("../../assets/default.lazy.js");
var packageValidateModule = require("./designSystemPackage/default.lazy.js");
var commonLibModule = require("./default_2.lazy.js");
var LIB_DETECT_SCRIPT = detectScript();
var bundleLibModule = require("../../plugins/functionHooks/resources/default.lazy.js");
var dtsLibModule = require("../../plugins/functionHooks/resources/default_2.lazy.js");
var cssLibModule = require("./default_3.lazy.js");
var sourceStorybookLibModule = require("./assets/default.lazy.js");
var LIB_SOURCE_KIT_SCRIPT = sourceKitScript();
var sourceKitLibModule = require("../../plugins/functionHooks/resources/default_3.lazy.js");
var LIB_CSS_FALLBACK_SCRIPT = cssFallbackScript();
var storyImportsLibModule = require("./designSystemPackage/default_2.lazy.js");
var previewsLibModule = require("./default_4.lazy.js");
var LIB_PREVIEW_GEN_STORYBOOK_SCRIPT = previewGenStorybookScript();
var docsLibModule = require("./assets/default_2.lazy.js");
var previewRebuildLibModule = require("../../utils/embeddedResources/default.lazy.js");
var STORYBOOK_HTTP_SERVE_SCRIPT = httpServeScript();
var STORYBOOK_PROBE_SCRIPT = probeScript();
var storybookProbeModule = require("./assets/default_3.lazy.js");
var packageCaptureModule = require("../../assets/default_2.lazy.js");
var syncHashesLibModule = require("../../utils/embeddedResources/default_2.lazy.js");
var remoteDiffLibModule = require("./assets/default_4.lazy.js");
var resyncModule = require("./designSystemPackage/default_3.lazy.js");
var SKILL_MD_TEXT = SKILL_MD;
var SKILL_FILES = {
  "SKILL.md": SKILL_MD,
  "storybook/SKILL.md": nonStorybookSkillText,
  "non-storybook/SKILL.md": nonStorybookSkill,
  "package-build.mjs": unwrapDefaultExport(packageBuildModule),
  "package-validate.mjs": unwrapDefaultExport(packageValidateModule),
  "lib/common.mjs": unwrapDefaultExport(commonLibModule),
  "lib/detect.mjs": unwrapDefaultExport(LIB_DETECT_SCRIPT),
  "lib/bundle.mjs": unwrapDefaultExport(bundleLibModule),
  "lib/dts.mjs": unwrapDefaultExport(dtsLibModule),
  "lib/css.mjs": unwrapDefaultExport(cssLibModule),
  "lib/source-storybook.mjs": unwrapDefaultExport(sourceStorybookLibModule),
  "lib/source-kit.mjs": unwrapDefaultExport(LIB_SOURCE_KIT_SCRIPT),
  "lib/story-imports.mjs": unwrapDefaultExport(sourceKitLibModule),
  "lib/css-fallback.mjs": unwrapDefaultExport(LIB_CSS_FALLBACK_SCRIPT),
  "lib/emit.mjs": unwrapDefaultExport(storyImportsLibModule),
  "lib/previews.mjs": unwrapDefaultExport(previewsLibModule),
  "lib/preview-gen-storybook.mjs": unwrapDefaultExport(LIB_PREVIEW_GEN_STORYBOOK_SCRIPT),
  "lib/docs.mjs": unwrapDefaultExport(docsLibModule),
  "lib/preview-rebuild.mjs": unwrapDefaultExport(previewRebuildLibModule),
  "storybook/http-serve.mjs": unwrapDefaultExport(STORYBOOK_HTTP_SERVE_SCRIPT),
  "storybook/probe.mjs": unwrapDefaultExport(STORYBOOK_PROBE_SCRIPT),
  "storybook/compare.mjs": unwrapDefaultExport(storybookProbeModule),
  "package-capture.mjs": unwrapDefaultExport(packageCaptureModule),
  "lib/sync-hashes.mjs": unwrapDefaultExport(syncHashesLibModule),
  "lib/remote-diff.mjs": unwrapDefaultExport(remoteDiffLibModule),
  "resync.mjs": unwrapDefaultExport(resyncModule),
};
export { validatePalette, common, css, SKILL_FILES, SKILL_MD_TEXT };
