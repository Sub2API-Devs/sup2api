/**
 * skills/bundled/mods/resources.ts
 *
 * mods 技能示例资源（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2hnqerf5.js (20)
 * attribution: sole-consumer 7, affinity 1, placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../../assets/band.tsx-1v7nt0yx.txt" with { type: "text" };
import __cc_resource_1 from "../../../../assets/band-state.d.ts-jt01vrsc.txt" with { type: "text" };
import __cc_resource_2 from "../../../../assets/pane.tsx-mhv389ra.txt" with { type: "text" };
import __cc_resource_3 from "../../../../assets/pane-state.d.ts-11bz0njc.txt" with { type: "text" };
import __cc_resource_4 from "../../../../assets/pane.test.tsx-ee55mcxg.txt" with { type: "text" };
import __cc_resource_5 from "../../../../assets/tool-call.ts-tv29hdsd.txt" with { type: "text" };
import __cc_resource_6 from "../../../../assets/reference-3e71f83b.md.zst" with { type: "file" };
import __cc_resource_7 from "../../../../assets/SKILL-2189bdbb.md.zst" with { type: "file" };
import { __export } from "../../../../runtime/bun-runtime.js";
import { readEmbeddedTextSync } from "../../../utils/embeddedAssets.js";

//@ chunk-2hnqerf5.js:908-917 sole-consumer
var moduleValue = {};
//@ chunk-2hnqerf5.js:917-1109 affinity
__export(moduleValue, {
  EXAMPLE_BAND: () => band,
  EXAMPLE_BAND_STATE: () => bandState,
  EXAMPLE_PANE: () => pane,
  EXAMPLE_PANE_STATE: () => paneState,
  EXAMPLE_PANE_TEST: () => paneTest,
  EXAMPLE_TOOL_CALL: () => toolCall,
  REFERENCE_MD: () => REFERENCE_MD,
  SKILL_MD: () => SKILL_MD,
  default: () => moduleValue,
});
//@ chunk-2hnqerf5.js:1109-1131 placement
var bandText = __cc_resource_0;
//@ chunk-2hnqerf5.js:1131-1139 placement
/**
 * mod 技能附带的 band（状态条）示例资源文本。
 */
var band = bandText;
//@ chunk-2hnqerf5.js:1139-1161 placement
var bandStateText = __cc_resource_1;
//@ chunk-2hnqerf5.js:1161-1169 placement
/**
 * mod 技能附带的 band 状态示例资源文本。
 */
var bandState = bandStateText;
//@ chunk-2hnqerf5.js:1169-1191 placement
var paneText = __cc_resource_2;
//@ chunk-2hnqerf5.js:1191-1199 placement
/**
 * mod 技能附带的 pane（面板）示例资源文本。
 */
var pane = paneText;
//@ chunk-2hnqerf5.js:1199-1221 placement
var paneStateText = __cc_resource_3;
//@ chunk-2hnqerf5.js:1221-1229 placement
/**
 * mod 技能附带的 pane 状态示例资源文本。
 */
var paneState = paneStateText;
//@ chunk-2hnqerf5.js:1229-1251 placement
var paneTestText = __cc_resource_4;
//@ chunk-2hnqerf5.js:1251-1259 placement
/**
 * mod 技能附带的 pane 测试示例资源文本。
 */
var paneTest = paneTestText;
//@ chunk-2hnqerf5.js:1259-1281 placement
var toolCallText = __cc_resource_5;
//@ chunk-2hnqerf5.js:1281-1289 placement
/**
 * mod 技能附带的工具调用示例资源文本。
 */
var toolCall = toolCallText;
//@ chunk-2hnqerf5.js:1289-1311 sole-consumer
var referenceResource = __cc_resource_6;
//@ chunk-2hnqerf5.js:1311-1343 sole-consumer
var referenceMarkdownText = readEmbeddedTextSync(referenceResource, import.meta.dirname);
//@ chunk-2hnqerf5.js:1343-1351 sole-consumer
var REFERENCE_MD = referenceMarkdownText;
//@ chunk-2hnqerf5.js:1351-1373 sole-consumer
var skillResource = __cc_resource_7;
//@ chunk-2hnqerf5.js:1373-1405 sole-consumer
var skillMarkdownText = readEmbeddedTextSync(skillResource, import.meta.dirname);
//@ chunk-2hnqerf5.js:1405-1413 sole-consumer
var SKILL_MD = skillMarkdownText;
export { band, bandState, pane, paneState, paneTest, toolCall, REFERENCE_MD, SKILL_MD, moduleValue };
