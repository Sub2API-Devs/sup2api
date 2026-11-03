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
/**
 * dataviz 标注用的 HTML 注释标记。
 */
var DATAVIZ_CALLOUT_MARKER = "<!-- dataviz-callout -->";
var pageContractHeaderProvider = () => "";
var datavizSkillCache;
//@ chunk-1wz354he.js:308-328 placement
/**
 * 设置页面契约头提供函数。
 */
function setPageContractHeaderProvider(getDatavizDesignAddendum) {
  pageContractHeaderProvider = getDatavizDesignAddendum;
}
//@ chunk-1wz354he.js:328-462 placement
async function loadDatavizSkillContent() {
  let { SKILL_MD } = await import("./chunk-9kwj0cf7.js");
  datavizSkillCache = withPageContractHeader(
    parseFrontmatter(SKILL_MD)
      .content.trimStart()
      .replace(DATAVIZ_CALLOUT_MARKER, () => pageContractHeaderProvider()),
  );
  return datavizSkillCache;
}
//@ chunk-1wz354he.js:462-486 placement
/**
 * 取已加载的 dataviz 技能内容。
 */
function getDatavizSkillCache() {
  return datavizSkillCache;
}
export { loadDatavizSkillContent, getDatavizSkillCache, setPageContractHeaderProvider };
