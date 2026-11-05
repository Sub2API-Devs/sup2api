/**
 * skills/bundled/skillTemplateResources.ts
 *
 * 2.1.316 新增。skill 模板资源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tv5dgwz5.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/SKILL-e3d212e9.md.zst" with { type: "file" };
import __cc_resource_1 from "../../../assets/template-eg8004mh.md" with { type: "text" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-tv5dgwz5.js:415-437 placement
var skillPath = __cc_resource_0;
//@ chunk-tv5dgwz5.js:437-469 placement
var skill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-tv5dgwz5.js:469-491 placement
var templateText = __cc_resource_1;
//@ chunk-tv5dgwz5.js:491-503 placement
/**
 * skill 模板资源导出：SKILL.md 与模板 markdown 的文本。
 */
var SKILL_MD = skill;
var TEMPLATE_MD = templateText;
export { SKILL_MD, TEMPLATE_MD };
