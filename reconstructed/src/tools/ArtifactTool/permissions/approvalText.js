/**
 * tools/ArtifactTool/permissions/approvalText.ts
 *
 * 2.1.316 新增：Artifact 写入批准文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (11)
 * attribution: placement 11
 */
import { jsonStringify } from "../../../utils/slowOperations.js";
import { sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";
import { DECISION_SURFACE_BRACKETS_RE, QUOTE_HOMOGLYPHS, SINGLE_QUOTE_RUNS } from "../artifactUrls.js";
import { MAX_EDITS_PER_CALL } from "../../../services/artifacts/artifactDb.js";
import {
  WWW_CONTENT_TYPES,
  SCRIPT_CONTENT_TYPES,
  baseMediaType,
  contentTypeForPath,
  SERVABLE_CONTENT_TYPES,
  MARKUP_CONTENT_TYPES,
} from "../../../services/artifacts/contentTypes.js";
import { readUntrustedArray, UNREADABLE_ARRAY } from "../../../utils/untrustedArray.js";

//@ chunk-qxvqcab6.js:13435-13585 placement
function approvalPayloadExcerpt(e) {
  if (e === undefined) return "";
  try {
    let n = jsonStringify(e);
    return `${sanitizeDisplayText(n, {
      max: 300,
    }).replace(DECISION_SURFACE_BRACKETS_RE, " ")}${truncatedSuffix(n, 300)}`;
  } catch {
    return "(unserializable payload)";
  }
}
//@ chunk-qxvqcab6.js:13585-13723 placement
function truncatedSuffix(e, n) {
  return Array.from(e.slice(0, 2 * n + 2)).length <= n
    ? ""
    : `\u2026 [truncated \u2014 ${Buffer.byteLength(e, "utf8")} bytes total]`;
}
//@ chunk-qxvqcab6.js:13723-14005 placement
function strReplaceApprovalText({ field, oldStr, newStr, replaceAll }) {
  let s = (u, a) => {
    if (u === undefined) return "(missing)";
    let l = jsonStringify(u);
    return `${sanitizeDisplayText(l, {
      max: a,
    })
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(QUOTE_HOMOGLYPHS, "'")
      .replace(SINGLE_QUOTE_RUNS, "'")}${truncatedSuffix(l, a)}`;
  };
  return `field ${s(field, MAX_EDITS_PER_CALL)}: replace ${replaceAll === true ? "every " : ""}${s(oldStr, 200)} with ${s(newStr, 200)}`;
}
//@ chunk-qxvqcab6.js:14005-14098 placement
function isLiveOffOnly(e) {
  return e !== null && typeof e === "object" && e.live === false && Object.keys(e).length === 1;
}
//@ chunk-qxvqcab6.js:14098-14129 placement
/**
 * 可当作文本处理的 media type 集合。
 */
var TEXTUAL_MEDIA_TYPES = new Set([...WWW_CONTENT_TYPES, ...SCRIPT_CONTENT_TYPES]);
//@ chunk-qxvqcab6.js:14129-14233 placement
function isTextualMediaType(e, contentType) {
  if (typeof contentType === "string") return TEXTUAL_MEDIA_TYPES.has(baseMediaType(contentType));
  return typeof e === "string" && TEXTUAL_MEDIA_TYPES.has(contentTypeForPath(e) ?? "");
}
//@ chunk-qxvqcab6.js:14233-14672 placement
function countApprovedFiles(e) {
  if (typeof e !== "object" || e === null) return 0;
  let { file_path: filePath, files } = e;
  let o = isTextualMediaType(filePath) ? 1 : 0;
  let untrustedArray = readUntrustedArray(files);
  if (untrustedArray === UNREADABLE_ARRAY) return UNREADABLE_ARRAY;
  if (untrustedArray !== undefined)
    for (let untrusted of untrustedArray)
      o += isTextualMediaType(
        typeof untrusted === "string" ? untrusted : untrusted?.path,
        untrusted?.contentType,
      )
        ? 1
        : 0;
  else if (files !== null && typeof files === "object")
    for (let [key, value] of Object.entries(files)) {
      if (value === null || isLiveOffOnly(value)) continue;
      let path = typeof value === "object" && typeof value.artifact === "string" ? value.path : undefined;
      o += (
        path !== undefined
          ? isTextualMediaType(key) || isTextualMediaType(path)
          : isTextualMediaType(key, value?.contentType)
      )
        ? 1
        : 0;
    }
  return o;
}
//@ chunk-qxvqcab6.js:14672-14703 placement
var APPROVABLE_CONTENT_TYPES = new Set([...SERVABLE_CONTENT_TYPES, ...MARKUP_CONTENT_TYPES]);
//@ chunk-qxvqcab6.js:14703-14856 placement
function isApprovableFile(e, n, r) {
  if (typeof e !== "string") return false;
  let o = contentTypeForPath(e);
  if (o === undefined || !r.has(baseMediaType(o))) return false;
  return n === undefined || (typeof n === "string" && r.has(baseMediaType(n)));
}
//@ chunk-qxvqcab6.js:14856-14910 placement
function areBothApprovable(e, path, r) {
  return isApprovableFile(e, undefined, r) && isApprovableFile(path, undefined, r);
}
//@ chunk-qxvqcab6.js:14910-14966 placement
function isLiveOrReseed(e) {
  return e.live !== undefined || e.reseed !== undefined;
}
export {
  approvalPayloadExcerpt,
  truncatedSuffix,
  countApprovedFiles,
  isLiveOffOnly,
  APPROVABLE_CONTENT_TYPES,
  isLiveOrReseed,
  isApprovableFile,
  areBothApprovable,
  strReplaceApprovalText,
};
