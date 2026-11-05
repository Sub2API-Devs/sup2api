/**
 * services/artifacts/frameComments.ts
 *
 * 2.1.316 新增：frame 评论 API 辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (10)
 * attribution: placement 10
 */
import { scrubArtifactEnvelopeTags } from "../../tools/ArtifactTool/artifactUrls.js";
import { neutralizeConfusableTags } from "../../utils/confusables.js";
import { ARTIFACT_ORIGIN_NOTES } from "../../constants/xml.js";

//@ chunk-m0ks5273.js:22630-22657 placement
/**
 * 导出函数 `emptyText`：参数 e, n，返回 ""。
 */
function emptyText(origin, inlineThreshold) {
  return "";
}
//@ chunk-m0ks5273.js:22657-22710 placement
var CONTROL_CHARS_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u2028\u2029]+/g;
//@ chunk-m0ks5273.js:22710-22763 placement
/**
 * 导出函数 `sanitizeOriginNotes`：参数 e，返回 scrubArtifactEnvelopeTags(neutralizeConfusableTags(ARTIFACT_ORIGIN_NOTES, e.replace(Lt, " ")))。
 */
function sanitizeOriginNotes(notes) {
  return scrubArtifactEnvelopeTags(
    neutralizeConfusableTags(ARTIFACT_ORIGIN_NOTES, notes.replace(CONTROL_CHARS_RE, " ")),
  );
}
//@ chunk-m0ks5273.js:22763-22790 placement
/**
 * 去掉页面末尾 __frame_comments__ 脚本块时的大小上限（4 MB / 3 MB）。
 */
var MAX_FRAME_HTML_BYTES = 4194304;
var MAX_FRAME_HTML_MINUS_SCRIPT = 3149824;
//@ chunk-m0ks5273.js:22790-23353 placement
/**
 * 去掉页面 HTML 末尾由服务端注入的 __frame_comments__ JSON 脚本块（需是合法 JSON 且带 mac 与 payload），得到原始页面内容；不符合时原样返回。
 */
function stripFrameCommentsScript(html) {
  let end = html.length;
  while (
    end > 0 &&
    ` 	\r
`.includes(html[end - 1])
  )
    end--;
  let trimmed = html.slice(0, end);
  if (!trimmed.endsWith("</script>")) return html;
  let beforeClose = trimmed.slice(0, trimmed.length - 9);
  let scriptIndex = beforeClose.lastIndexOf('<script type="application/json" id="__frame_comments__">');
  if (scriptIndex === -1) return html;
  let sliced = beforeClose.slice(scriptIndex + 56);
  if (sliced.includes("<")) return html;
  let parsed;
  try {
    parsed = JSON.parse(sliced);
  } catch {
    return html;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return html;
  let parsedDoc = parsed;
  if (typeof parsedDoc.mac !== "string" || parsedDoc.mac.length === 0) return html;
  if (!Object.hasOwn(parsed, "payload")) return html;
  let content = beforeClose.slice(0, scriptIndex);
  if (
    content.endsWith(`
`)
  )
    content = content.slice(0, -1);
  return content;
}
//@ chunk-m0ks5273.js:23353-23402 placement
/**
 * 导出函数 `isOwnedExternally`：参数 e，返回 isNotSolelyOwned(e) || e.outsideOrg === !0。
 */
function readIsForeign(artifact) {
  return readByOthers(artifact) || artifact.outsideOrg === true;
}
//@ chunk-m0ks5273.js:23402-23464 placement
/**
 * 导出函数 `mayHaveForeignWriters`：参数 e，返回 _Fr(e) || e.outsidersMayHaveWritten === !0。
 */
function readMarkedForeign(artifact) {
  return readIsForeign(artifact) || artifact.outsidersMayHaveWritten === true;
}
//@ chunk-m0ks5273.js:23464-23527 placement
/**
 * 导出函数 `hasOnlyOutsideWriters`：参数 e，返回 e.outsidersMayHaveWritten === !0 && !_Fr(e)。
 */
function readOutsidersOnly(artifact) {
  return artifact.outsidersMayHaveWritten === true && !readIsForeign(artifact);
}
//@ chunk-m0ks5273.js:23527-23579 placement
/**
 * 导出函数 `isSharedOrNotOwned`：参数 e，返回 isNotSolelyOwned(e) || e.outsideWriter === !0。
 */
function readKnownForeign(artifact) {
  return readByOthers(artifact) || artifact.outsideWriter === true;
}
//@ chunk-m0ks5273.js:23579-23685 placement
/**
 * 判断 artifact 不是由当前用户单独掌控：有他人编写、不是所有者、公开可读、协作写入或类型锁定。
 */
function readByOthers(artifact) {
  return (
    artifact.authoredByOthers === true ||
    artifact.role !== "owner" ||
    artifact.publicRead ||
    artifact.cowritten ||
    artifact.typeLocked
  );
}
export {
  readOutsidersOnly,
  readMarkedForeign,
  MAX_FRAME_HTML_BYTES,
  sanitizeOriginNotes,
  MAX_FRAME_HTML_MINUS_SCRIPT,
  stripFrameCommentsScript,
  readKnownForeign,
  readByOthers,
  emptyText,
  readIsForeign,
};
