/**
 * tools/ArtifactTool/permissions/approvalText.ts
 *
 * 2.1.316 新增：Artifact 写入批准文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nfkwcnxd.js (11)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-nfkwcnxd.js:13410-13560 placement
function approvalPayloadExcerpt(payload) {
  if (payload === undefined) return "";
  try {
    let json = jsonStringify(payload);
    return `${sanitizeDisplayText(json, {
      max: 300,
    }).replace(DECISION_SURFACE_BRACKETS_RE, " ")}${truncatedSuffix(json, 300)}`;
  } catch {
    return "(unserializable payload)";
  }
}
//@ chunk-nfkwcnxd.js:13560-13698 placement
function truncatedSuffix(text, maxChars) {
  return Array.from(text.slice(0, 2 * maxChars + 2)).length <= maxChars
    ? ""
    : `\u2026 [truncated \u2014 ${Buffer.byteLength(text, "utf8")} bytes total]`;
}
//@ chunk-nfkwcnxd.js:13698-13980 placement
function strReplaceApprovalText({ field, oldStr, newStr, replaceAll }) {
  let label = (value, max) => {
    if (value === undefined) return "(missing)";
    let json = jsonStringify(value);
    return `${sanitizeDisplayText(json, {
      max,
    })
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(QUOTE_HOMOGLYPHS, "'")
      .replace(SINGLE_QUOTE_RUNS, "'")}${truncatedSuffix(json, max)}`;
  };
  return `field ${label(field, MAX_EDITS_PER_CALL)}: replace ${replaceAll === true ? "every " : ""}${label(oldStr, 200)} with ${label(newStr, 200)}`;
}
//@ chunk-nfkwcnxd.js:13980-14073 placement
function isLiveOffOnly(value) {
  return (
    value !== null && typeof value === "object" && value.live === false && Object.keys(value).length === 1
  );
}
//@ chunk-nfkwcnxd.js:14073-14104 placement
/**
 * 可当作文本处理的 media type 集合。
 */
var TEXTUAL_MEDIA_TYPES; // deferred: uses MARKUP_CONTENT_TYPES (../../../services/artifacts/contentTypes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nfkwcnxd.js:14073", () => {
  TEXTUAL_MEDIA_TYPES = new Set([...WWW_CONTENT_TYPES, ...SCRIPT_CONTENT_TYPES]);
});
//@ chunk-nfkwcnxd.js:14104-14208 placement
function isTextualMediaType(filePath, contentType) {
  if (typeof contentType === "string") return TEXTUAL_MEDIA_TYPES.has(baseMediaType(contentType));
  return typeof filePath === "string" && TEXTUAL_MEDIA_TYPES.has(contentTypeForPath(filePath) ?? "");
}
//@ chunk-nfkwcnxd.js:14208-14647 placement
function countApprovedFiles(input) {
  if (typeof input !== "object" || input === null) return 0;
  let { file_path: filePath, files } = input;
  let count = isTextualMediaType(filePath) ? 1 : 0;
  let untrustedArray = readUntrustedArray(files);
  if (untrustedArray === UNREADABLE_ARRAY) return UNREADABLE_ARRAY;
  if (untrustedArray !== undefined)
    for (let untrusted of untrustedArray)
      count += isTextualMediaType(
        typeof untrusted === "string" ? untrusted : untrusted?.path,
        untrusted?.contentType,
      )
        ? 1
        : 0;
  else if (files !== null && typeof files === "object")
    for (let [key, value] of Object.entries(files)) {
      if (value === null || isLiveOffOnly(value)) continue;
      let path = typeof value === "object" && typeof value.artifact === "string" ? value.path : undefined;
      count += (
        path !== undefined
          ? isTextualMediaType(key) || isTextualMediaType(path)
          : isTextualMediaType(key, value?.contentType)
      )
        ? 1
        : 0;
    }
  return count;
}
//@ chunk-nfkwcnxd.js:14647-14678 placement
var APPROVABLE_CONTENT_TYPES; // deferred: uses MARKUP_CONTENT_TYPES (../../../services/artifacts/contentTypes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nfkwcnxd.js:14647", () => {
  APPROVABLE_CONTENT_TYPES = new Set([...SERVABLE_CONTENT_TYPES, ...MARKUP_CONTENT_TYPES]);
});
//@ chunk-nfkwcnxd.js:14678-14831 placement
function isApprovableFile(filePath, contentType, allowedTypes) {
  if (typeof filePath !== "string") return false;
  let pathContentType = contentTypeForPath(filePath);
  if (pathContentType === undefined || !allowedTypes.has(baseMediaType(pathContentType))) return false;
  return (
    contentType === undefined ||
    (typeof contentType === "string" && allowedTypes.has(baseMediaType(contentType)))
  );
}
//@ chunk-nfkwcnxd.js:14831-14885 placement
function areBothApprovable(filePath, path, allowedTypes) {
  return (
    isApprovableFile(filePath, undefined, allowedTypes) && isApprovableFile(path, undefined, allowedTypes)
  );
}
//@ chunk-nfkwcnxd.js:14885-14941 placement
function isLiveOrReseed(value) {
  return value.live !== undefined || value.reseed !== undefined;
}
export {
  approvalPayloadExcerpt,
  truncatedSuffix,
  countApprovedFiles,
  isLiveOffOnly,
  strReplaceApprovalText,
  APPROVABLE_CONTENT_TYPES,
  isLiveOrReseed,
  isApprovableFile,
  areBothApprovable,
};
