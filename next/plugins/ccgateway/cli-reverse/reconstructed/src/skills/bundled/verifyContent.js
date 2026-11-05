/**
 * skills/bundled/verifyContent.ts
 *
 * 某内置 skill 的打包资源：SKILL.md 与 examples/*.md（zst 压缩）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/verifyContent.ts
 * pieces: chunk-ate506mc.js (5)
 * attribution: sole-consumer 4, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import __cc_resource_0 from "../../../assets/cli-f091jpwx.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/server-6cyhjq09.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/SKILL-cf37e4b8.md.zst" with { type: "file" };
import { readEmbeddedTextSync } from "../../utils/embeddedAssets.js";

//@ chunk-ate506mc.js:484-506 sole-consumer
var examplesCli = __cc_resource_0;
//@ chunk-ate506mc.js:506-528 sole-consumer
var examplesServer = __cc_resource_1;
//@ chunk-ate506mc.js:528-550 sole-consumer
var skillPath = __cc_resource_2;
//@ chunk-ate506mc.js:550-582 sole-consumer
var skill = readEmbeddedTextSync(skillPath, import.meta.dirname);
//@ chunk-ate506mc.js:582-637 fingerprint (2.1.88 match: SKILL_FILES, 1)
/**
 * 内置 skill 资源：SKILL.md 与附带示例文件（examples/cli.md、examples/server.md），zst 压缩资源解码。
 */
var SKILL_MD = skill;
var SKILL_FILES = {
  "examples/cli.md": examplesCli,
  "examples/server.md": examplesServer,
};
export { SKILL_FILES, SKILL_MD };
