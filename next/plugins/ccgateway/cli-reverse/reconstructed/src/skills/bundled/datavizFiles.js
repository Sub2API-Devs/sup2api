/**
 * skills/bundled/datavizFiles.ts
 *
 * 2.1.316 新增：dataviz 技能的参考文件表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2fan6wbz.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/anti-patterns-evn314kn.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/choosing-a-form-tgtb06w1.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/color-formula-22636152.md.zst" with { type: "file" };
import __cc_resource_3 from "../../../assets/components-yjv8r4qd.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/interaction-d4xwjtb3.md" with { type: "text" };
import __cc_resource_5 from "../../../assets/marks-and-anatomy-183sms53.md" with { type: "text" };
import __cc_resource_6 from "../../../assets/palette-f0ae74f9.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../assets/SKILL-6rrqfkf8.md" with { type: "text" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-2fan6wbz.js:905-927 placement
var referencesAntiPatterns = __cc_resource_0;
//@ chunk-2fan6wbz.js:927-949 placement
var referencesChoosingAForm = __cc_resource_1;
//@ chunk-2fan6wbz.js:949-971 placement
var colorFormulaPath = __cc_resource_2;
//@ chunk-2fan6wbz.js:971-1003 placement
var referencesColorFormula = readEmbeddedTextSync(colorFormulaPath, import.meta.dirname);
//@ chunk-2fan6wbz.js:1003-1025 placement
var referencesComponents = __cc_resource_3;
//@ chunk-2fan6wbz.js:1025-1047 placement
var referencesInteraction = __cc_resource_4;
//@ chunk-2fan6wbz.js:1047-1069 placement
var referencesMarksAndAnatomy = __cc_resource_5;
//@ chunk-2fan6wbz.js:1069-1091 placement
var palettePath = __cc_resource_6;
//@ chunk-2fan6wbz.js:1091-1123 placement
var referencesPalette = readEmbeddedTextSync(palettePath, import.meta.dirname);
//@ chunk-2fan6wbz.js:1123-1145 placement
var skillText = __cc_resource_7;
//@ chunk-2fan6wbz.js:1145-1551 placement
/**
 * dataviz 技能的参考文件表。
 */
var DATAVIZ_SKILL_FILES = (moduleValue) =>
  typeof moduleValue === "string" ? moduleValue : moduleValue.default;
var datavizValidatePaletteJsModule = require("./dataviz/default.lazy.js");
var datavizValidatePalettePyModule = require("./default.lazy.js");
var datavizPaletteFileContent = skillText;
var DATAVIZ_SKILL_FILE_MAP = {
  "references/anti-patterns.md": referencesAntiPatterns,
  "references/choosing-a-form.md": referencesChoosingAForm,
  "references/color-formula.md": referencesColorFormula,
  "references/components.md": referencesComponents,
  "references/interaction.md": referencesInteraction,
  "references/marks-and-anatomy.md": referencesMarksAndAnatomy,
  "references/palette.md": referencesPalette,
  "scripts/validate_palette.js": DATAVIZ_SKILL_FILES(datavizValidatePaletteJsModule),
  "scripts/validate_palette.py": DATAVIZ_SKILL_FILES(datavizValidatePalettePyModule),
};
export { DATAVIZ_SKILL_FILE_MAP, datavizPaletteFileContent };
