/**
 * skills/bundled/mods/resources.ts
 *
 * mods 技能示例资源（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z88hz9c9.js (20)
 * attribution: placement 20
 */
import __cc_resource_0 from "../../../../assets/band.tsx-1v7nt0yx.txt" with { type: "text" };
import __cc_resource_1 from "../../../../assets/band-state.d.ts-jt01vrsc.txt" with { type: "text" };
import __cc_resource_2 from "../../../../assets/pane.tsx-mhv389ra.txt" with { type: "text" };
import __cc_resource_3 from "../../../../assets/pane-state.d.ts-11bz0njc.txt" with { type: "text" };
import __cc_resource_4 from "../../../../assets/pane.test.tsx-ee55mcxg.txt" with { type: "text" };
import __cc_resource_5 from "../../../../assets/tool-call.ts-tv29hdsd.txt" with { type: "text" };
import __cc_resource_6 from "../../../../assets/reference-d80c0885.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../../assets/SKILL-aa0d9c2d.md.zst" with { type: "file" };
import { __export } from "../../../../runtime/bun-runtime.js";
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-z88hz9c9.js:908-917 placement
/**
 * mods 技能示例资源的模块导出表。
 */
var modsExampleExports = {};
//@ chunk-z88hz9c9.js:917-1109 placement
__export(modsExampleExports, {
  EXAMPLE_BAND: () => band,
  EXAMPLE_BAND_STATE: () => bandState,
  EXAMPLE_PANE: () => pane,
  EXAMPLE_PANE_STATE: () => paneState,
  EXAMPLE_PANE_TEST: () => paneTest,
  EXAMPLE_TOOL_CALL: () => toolCall,
  REFERENCE_MD: () => reference2,
  SKILL_MD: () => skill2,
  default: () => modsExampleExports,
});
//@ chunk-z88hz9c9.js:1109-1131 placement
var bandText = __cc_resource_0;
//@ chunk-z88hz9c9.js:1131-1139 placement
/**
 * mod 技能附带的 band（状态条）示例资源文本。
 */
var band = bandText;
//@ chunk-z88hz9c9.js:1139-1161 placement
var bandStateText = __cc_resource_1;
//@ chunk-z88hz9c9.js:1161-1169 placement
/**
 * mod 技能附带的 band 状态示例资源文本。
 */
var bandState = bandStateText;
//@ chunk-z88hz9c9.js:1169-1191 placement
var paneText = __cc_resource_2;
//@ chunk-z88hz9c9.js:1191-1199 placement
/**
 * mod 技能附带的 pane（面板）示例资源文本。
 */
var pane = paneText;
//@ chunk-z88hz9c9.js:1199-1221 placement
var paneStateText = __cc_resource_3;
//@ chunk-z88hz9c9.js:1221-1229 placement
/**
 * mod 技能附带的 pane 状态示例资源文本。
 */
var paneState = paneStateText;
//@ chunk-z88hz9c9.js:1229-1251 placement
var paneTestText = __cc_resource_4;
//@ chunk-z88hz9c9.js:1251-1259 placement
/**
 * mod 技能附带的 pane 测试示例资源文本。
 */
var paneTest = paneTestText;
//@ chunk-z88hz9c9.js:1259-1281 placement
var toolCallText = __cc_resource_5;
//@ chunk-z88hz9c9.js:1281-1289 placement
/**
 * mod 技能附带的工具调用示例资源文本。
 */
var toolCall = toolCallText;
//@ chunk-z88hz9c9.js:1289-1311 placement
var referencePath = __cc_resource_6;
//@ chunk-z88hz9c9.js:1311-1343 placement
var reference = readEmbeddedTextSync(referencePath, import.meta.dirname);
//@ chunk-z88hz9c9.js:1343-1351 placement
/**
 * mod 技能附带的第二份参考文档资源。
 */
var reference2 = reference;
//@ chunk-z88hz9c9.js:1351-1373 placement
var skillPath = __cc_resource_7;
//@ chunk-z88hz9c9.js:1373-1405 placement
var skill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-z88hz9c9.js:1405-1413 placement
/**
 * mod 技能附带的第二份 SKILL.md 资源。
 */
var skill2 = skill;
export { band, bandState, pane, paneState, paneTest, toolCall, reference2, skill2, modsExampleExports };
