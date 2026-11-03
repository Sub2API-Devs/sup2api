/**
 * services/artifacts/frameComments.ts
 *
 * 2.1.316 新增：frame 评论 API 辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (10)
 * attribution: placement 10
 */
import { scrubArtifactEnvelopeTags } from "../../tools/ArtifactTool/artifactUrls.js";
import { neutralizeConfusableTags } from "../../utils/confusables.js";
import { ARTIFACT_ORIGIN_NOTES } from "../../constants/xml.js";

//@ chunk-jv307fw4.js:22613-22640 placement
function h0o(e, n) {
  return "";
}
//@ chunk-jv307fw4.js:22640-22693 placement
var Lt = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u2028\u2029]+/g;
//@ chunk-jv307fw4.js:22693-22746 placement
function y0o(e) {
  return scrubArtifactEnvelopeTags(neutralizeConfusableTags(ARTIFACT_ORIGIN_NOTES, e.replace(Lt, " ")));
}
//@ chunk-jv307fw4.js:22746-22773 placement
var _0o = 4194304,
  Ye = 3149824;
/**
 * 去掉页面 HTML 末尾由服务端注入的 __frame_comments__ JSON 脚本块（需是合法 JSON 且带 mac 与 payload），得到原始页面内容；不符合时原样返回。
 */
//@ chunk-jv307fw4.js:22773-23336 placement
function stripFrameCommentsScript(e) {
  let end = e.length;
  while (
    end > 0 &&
    ` 	\r
`.includes(e[end - 1])
  )
    end--;
  let trimmed = e.slice(0, end);
  if (!trimmed.endsWith("</script>")) return e;
  let beforeClose = trimmed.slice(0, trimmed.length - 9),
    scriptIndex = beforeClose.lastIndexOf('<script type="application/json" id="__frame_comments__">');
  if (scriptIndex === -1) return e;
  let sliced = beforeClose.slice(scriptIndex + 56);
  if (sliced.includes("<")) return e;
  let parsed;
  try {
    parsed = JSON.parse(sliced);
  } catch {
    return e;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return e;
  let h = parsed;
  if (typeof h.mac !== "string" || h.mac.length === 0) return e;
  if (!Object.hasOwn(parsed, "payload")) return e;
  let content = beforeClose.slice(0, scriptIndex);
  if (
    content.endsWith(`
`)
  )
    content = content.slice(0, -1);
  return content;
}
//@ chunk-jv307fw4.js:23336-23385 placement
function _Fr(e) {
  return isNotSolelyOwned(e) || e.outsideOrg === !0;
}
//@ chunk-jv307fw4.js:23385-23447 placement
function v_e(e) {
  return _Fr(e) || e.outsidersMayHaveWritten === !0;
}
//@ chunk-jv307fw4.js:23447-23510 placement
function dbt(e) {
  return e.outsidersMayHaveWritten === !0 && !_Fr(e);
}
//@ chunk-jv307fw4.js:23510-23562 placement
function x5n(e) {
  return isNotSolelyOwned(e) || e.outsideWriter === !0;
}
/**
 * 判断 artifact 不是由当前用户单独掌控：有他人编写、不是所有者、公开可读、协作写入或类型锁定。
 */
//@ chunk-jv307fw4.js:23562-23668 placement
function isNotSolelyOwned(e) {
  return e.authoredByOthers === !0 || e.role !== "owner" || e.publicRead || e.cowritten || e.typeLocked;
}

export { v_e, dbt, x5n, isNotSolelyOwned, h0o, _Fr, _0o, Ye, stripFrameCommentsScript, y0o };
