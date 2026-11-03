/**
 * skills/bundled/datavizFiles.ts
 *
 * 2.1.316 新增：dataviz 技能的参考文件表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a4mpfcn7.js (11)
 * attribution: placement 11
 */
import __cc_resource_0 from "../../../assets/anti-patterns-evn314kn.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/choosing-a-form-tgtb06w1.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/color-formula-22636152.md.zst" with { type: "file" };
import __cc_resource_3 from "../../../assets/components-yjv8r4qd.md" with { type: "text" };
import __cc_resource_4 from "../../../assets/interaction-d4xwjtb3.md" with { type: "text" };
import __cc_resource_5 from "../../../assets/marks-and-anatomy-183sms53.md" with { type: "text" };
import __cc_resource_6 from "../../../assets/palette-f0ae74f9.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../assets/SKILL-6rrqfkf8.md" with { type: "text" };
import { Et } from "../../utils/embeddedAssets.js";

//@ chunk-a4mpfcn7.js:905-927 placement
var t = __cc_resource_0;
//@ chunk-a4mpfcn7.js:927-949 placement
var a = __cc_resource_1;
//@ chunk-a4mpfcn7.js:949-971 placement
var r = __cc_resource_2;
//@ chunk-a4mpfcn7.js:971-1003 placement
var s = Et(r, import.meta.dirname);
//@ chunk-a4mpfcn7.js:1003-1025 placement
var o = __cc_resource_3;
//@ chunk-a4mpfcn7.js:1025-1047 placement
var i = __cc_resource_4;
//@ chunk-a4mpfcn7.js:1047-1069 placement
var n = __cc_resource_5;
//@ chunk-a4mpfcn7.js:1069-1091 placement
var l = __cc_resource_6;
//@ chunk-a4mpfcn7.js:1091-1123 placement
var h = Et(l, import.meta.dirname);
//@ chunk-a4mpfcn7.js:1123-1145 placement
var d = __cc_resource_7;
/**
 * dataviz 技能的参考文件表。
 */
//@ chunk-a4mpfcn7.js:1145-1551 placement
var DATAVIZ_SKILL_FILES = (e) => (typeof e === "string" ? e : e.default),
  w = require("./chunk-dwkc63e7.js"),
  k = require("./chunk-559xbt4k.js"),
  P = d,
  J = {
    "references/anti-patterns.md": t,
    "references/choosing-a-form.md": a,
    "references/color-formula.md": s,
    "references/components.md": o,
    "references/interaction.md": i,
    "references/marks-and-anatomy.md": n,
    "references/palette.md": h,
    "scripts/validate_palette.js": DATAVIZ_SKILL_FILES(w),
    "scripts/validate_palette.py": DATAVIZ_SKILL_FILES(k),
  };
