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
  I0o,
  B5n,
  baseMediaType,
  contentTypeForPath,
  O0o,
  MARKUP_CONTENT_TYPES,
} from "../../../services/artifacts/contentTypes.js";
import { readUntrustedArray, Uf } from "../../../utils/untrustedArray.js";

//@ chunk-qxvqcab6.js:13435-13585 placement
function approvalPayloadExcerpt(e) {
  if (e === void 0) return "";
  try {
    let n = jsonStringify(e);
    return `${sanitizeDisplayText(n, { max: 300 }).replace(DECISION_SURFACE_BRACKETS_RE, " ")}${truncatedSuffix(n, 300)}`;
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
function strReplaceApprovalText({ field: field, oldStr: oldStr, newStr: newStr, replaceAll: replaceAll }) {
  let s = (u, a) => {
    if (u === void 0) return "(missing)";
    let l = jsonStringify(u);
    return `${sanitizeDisplayText(l, { max: a }).replace(DECISION_SURFACE_BRACKETS_RE, " ").replace(QUOTE_HOMOGLYPHS, "'").replace(SINGLE_QUOTE_RUNS, "'")}${truncatedSuffix(l, a)}`;
  };
  return `field ${s(field, MAX_EDITS_PER_CALL)}: replace ${replaceAll === !0 ? "every " : ""}${s(oldStr, 200)} with ${s(newStr, 200)}`;
}
//@ chunk-qxvqcab6.js:14005-14098 placement
function isLiveOffOnly(e) {
  return e !== null && typeof e === "object" && e.live === !1 && Object.keys(e).length === 1;
}
//@ chunk-qxvqcab6.js:14098-14129 placement
var P = new Set([...I0o, ...B5n]);
//@ chunk-qxvqcab6.js:14129-14233 placement
function isTextualMediaType(e, n) {
  if (typeof n === "string") return P.has(baseMediaType(n));
  return typeof e === "string" && P.has(contentTypeForPath(e) ?? "");
}
//@ chunk-qxvqcab6.js:14233-14672 placement
function countApprovedFiles(e) {
  if (typeof e !== "object" || e === null) return 0;
  let { file_path: file_path, files: files } = e,
    o = isTextualMediaType(file_path) ? 1 : 0,
    s = readUntrustedArray(files);
  if (s === Uf) return Uf;
  if (s !== void 0)
    for (let u of s) o += isTextualMediaType(typeof u === "string" ? u : u?.path, u?.contentType) ? 1 : 0;
  else if (files !== null && typeof files === "object")
    for (let [u, a] of Object.entries(files)) {
      if (a === null || isLiveOffOnly(a)) continue;
      let l = typeof a === "object" && typeof a.artifact === "string" ? a.path : void 0;
      o += (
        l !== void 0 ? isTextualMediaType(u) || isTextualMediaType(l) : isTextualMediaType(u, a?.contentType)
      )
        ? 1
        : 0;
    }
  return o;
}
//@ chunk-qxvqcab6.js:14672-14703 placement
var APPROVABLE_CONTENT_TYPES = new Set([...O0o, ...MARKUP_CONTENT_TYPES]);
//@ chunk-qxvqcab6.js:14703-14856 placement
function isApprovableFile(e, n, r) {
  if (typeof e !== "string") return !1;
  let o = contentTypeForPath(e);
  if (o === void 0 || !r.has(baseMediaType(o))) return !1;
  return n === void 0 || (typeof n === "string" && r.has(baseMediaType(n)));
}
//@ chunk-qxvqcab6.js:14856-14910 placement
function areBothApprovable(e, n, r) {
  return isApprovableFile(e, void 0, r) && isApprovableFile(n, void 0, r);
}
//@ chunk-qxvqcab6.js:14910-14966 placement
function isLiveOrReseed(e) {
  return e.live !== void 0 || e.reseed !== void 0;
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
