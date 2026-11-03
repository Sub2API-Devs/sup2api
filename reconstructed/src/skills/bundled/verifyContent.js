/**
 * skills/bundled/verifyContent.ts
 *
 * 某内置 skill 的打包资源：SKILL.md 与 examples/*.md（zst 压缩）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/verifyContent.ts
 * pieces: chunk-t40rc4mm.js (5)
 * attribution: sole-consumer 4, fingerprint 1
 */
import __cc_resource_0 from "../../../assets/cli-f091jpwx.md" with { type: "text" };
import __cc_resource_1 from "../../../assets/server-6cyhjq09.md" with { type: "text" };
import __cc_resource_2 from "../../../assets/SKILL-cf37e4b8.md.zst" with { type: "file" };
import { Et } from "../../utils/embeddedAssets.js";

//@ chunk-t40rc4mm.js:484-506 sole-consumer
var e = __cc_resource_0;
//@ chunk-t40rc4mm.js:506-528 sole-consumer
var t = __cc_resource_1;
//@ chunk-t40rc4mm.js:528-550 sole-consumer
var s = __cc_resource_2;
//@ chunk-t40rc4mm.js:550-582 sole-consumer
var i = Et(s, import.meta.dirname);
/**
 * 内置 skill 资源：SKILL.md 与附带示例文件（examples/cli.md、examples/server.md），zst 压缩资源解码。
 */
//@ chunk-t40rc4mm.js:582-637 fingerprint = SKILL_FILES (1)
var SKILL_MD = i,
  SKILL_FILES = { "examples/cli.md": e, "examples/server.md": t };
