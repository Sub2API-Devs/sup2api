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
/**
 * 导出函数 `emptyText`：参数 e, n，返回 ""。
 */
function emptyText(origin, inlineThreshold) {
  return "";
}
//@ chunk-jv307fw4.js:22640-22693 placement
var CONTROL_CHARS_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u2028\u2029]+/g;
//@ chunk-jv307fw4.js:22693-22746 placement
/**
 * 导出函数 `sanitizeOriginNotes`：参数 e，返回 scrubArtifactEnvelopeTags(neutralizeConfusableTags(ARTIFACT_ORIGIN_NOTES, e.replace(Lt, " ")))。
 */
function sanitizeOriginNotes(e) {
  return scrubArtifactEnvelopeTags(
    neutralizeConfusableTags(ARTIFACT_ORIGIN_NOTES, e.replace(CONTROL_CHARS_RE, " ")),
  );
}
//@ chunk-jv307fw4.js:22746-22773 placement
/**
 * 去掉页面末尾 __frame_comments__ 脚本块时的大小上限（4 MB / 3 MB）。
 */
var MAX_FRAME_HTML_BYTES = 4194304;
var MAX_FRAME_HTML_MINUS_SCRIPT = 3149824;
//@ chunk-jv307fw4.js:22773-23336 placement
/**
 * 去掉页面 HTML 末尾由服务端注入的 __frame_comments__ JSON 脚本块（需是合法 JSON 且带 mac 与 payload），得到原始页面内容；不符合时原样返回。
 */
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
  let beforeClose = trimmed.slice(0, trimmed.length - 9);
  let scriptIndex = beforeClose.lastIndexOf('<script type="application/json" id="__frame_comments__">');
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
/**
 * 导出函数 `isOwnedExternally`：参数 e，返回 isNotSolelyOwned(e) || e.outsideOrg === !0。
 */
function isOwnedExternally(e) {
  return isNotSolelyOwned(e) || e.outsideOrg === true;
}
//@ chunk-jv307fw4.js:23385-23447 placement
/**
 * 导出函数 `mayHaveForeignWriters`：参数 e，返回 _Fr(e) || e.outsidersMayHaveWritten === !0。
 */
function mayHaveForeignWriters(e) {
  return isOwnedExternally(e) || e.outsidersMayHaveWritten === true;
}
//@ chunk-jv307fw4.js:23447-23510 placement
/**
 * 导出函数 `hasOnlyOutsideWriters`：参数 e，返回 e.outsidersMayHaveWritten === !0 && !_Fr(e)。
 */
function hasOnlyOutsideWriters(e) {
  return e.outsidersMayHaveWritten === true && !isOwnedExternally(e);
}
//@ chunk-jv307fw4.js:23510-23562 placement
/**
 * 导出函数 `isSharedOrNotOwned`：参数 e，返回 isNotSolelyOwned(e) || e.outsideWriter === !0。
 */
function isSharedOrNotOwned(e) {
  return isNotSolelyOwned(e) || e.outsideWriter === true;
}
//@ chunk-jv307fw4.js:23562-23668 placement
/**
 * 判断 artifact 不是由当前用户单独掌控：有他人编写、不是所有者、公开可读、协作写入或类型锁定。
 */
function isNotSolelyOwned(e) {
  return e.authoredByOthers === true || e.role !== "owner" || e.publicRead || e.cowritten || e.typeLocked;
}
export {
  mayHaveForeignWriters,
  hasOnlyOutsideWriters,
  isSharedOrNotOwned,
  isNotSolelyOwned,
  emptyText,
  isOwnedExternally,
  MAX_FRAME_HTML_BYTES,
  MAX_FRAME_HTML_MINUS_SCRIPT,
  stripFrameCommentsScript,
  sanitizeOriginNotes,
};
