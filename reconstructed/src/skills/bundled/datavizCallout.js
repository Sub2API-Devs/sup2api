/**
 * skills/bundled/datavizCallout.ts
 *
 * 2.1.316 新增：dataviz 技能提示块（dataviz-callout 标记）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wz354he.js (4)
 * attribution: placement 4
 */
import { withPageContractHeader } from "../../tools/ArtifactTool/pagePrompt.js";
import { parseFrontmatter } from "../../utils/frontmatterParser.js";

//@ chunk-1wz354he.js:264-308 placement
var n = "<!-- dataviz-callout -->",
  i = () => "",
  r;
//@ chunk-1wz354he.js:308-328 placement
function uNs(t) {
  i = t;
}
//@ chunk-1wz354he.js:328-462 placement
async function loadDatavizSkillContent() {
  let { SKILL_MD: SKILL_MD } = await import("./chunk-9kwj0cf7.js");
  return (
    (r = withPageContractHeader(
      parseFrontmatter(SKILL_MD)
        .content.trimStart()
        .replace(n, () => i()),
    )),
    r
  );
}
//@ chunk-1wz354he.js:462-486 placement
function fNs() {
  return r;
}

export { loadDatavizSkillContent, fNs, uNs };
