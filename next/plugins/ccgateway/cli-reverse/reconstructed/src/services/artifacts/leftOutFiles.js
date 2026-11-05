/**
 * services/artifacts/leftOutFiles.ts
 *
 * 2.1.316 新增：发布时被略过文件的说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (13)
 * attribution: placement 13
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { SESSION_HINT_COOLDOWN_MS } from "./requestMeta.js";
import { formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE, mentionsField } from "./frameApi.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-51jy8ztq.js:37798-37863 placement
/**
 * 未纳入发布的文件提示常量：no_file 标记、文件类型正则、未命名上限 16 与路径 160 字符。
 */
var NO_FILE = "no_file";
var FILE_KIND_RE = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
var MAX_UNNAMED_FILES = 16;
var MAX_FILE_PATH_CHARS = 160;
//@ chunk-51jy8ztq.js:37863-37975 placement
function leaveOutMissingField() {
  let leaveOutMissingRefusedAt = getLiveState().leaveOutMissingRefusedAt;
  return leaveOutMissingRefusedAt !== undefined &&
    Date.now() - leaveOutMissingRefusedAt < SESSION_HINT_COOLDOWN_MS
    ? {}
    : {
        leave_out_missing: true,
      };
}
//@ chunk-51jy8ztq.js:37975-38030 placement
function markLeaveOutMissingRefused() {
  getLiveState().leaveOutMissingRefusedAt = Date.now();
}
//@ chunk-51jy8ztq.js:38030-38215 placement
function leaveOutMissingRefusal(body, missingPaths) {
  let text = formatFrameErrorBody(body);
  if (!UNKNOWN_FIELD_ERROR_RE.test(text)) return;
  if (mentionsField(text, "leave_out_missing")) return "named";
  return /unknown field ["']/i.test(text) || Object.keys(missingPaths).some((key) => mentionsField(text, key))
    ? undefined
    : "unnamed";
}
//@ chunk-51jy8ztq.js:38215-38301 placement
function isClientRefusalStatus(status, body) {
  return (
    status < 500 &&
    status !== 401 &&
    status !== 403 &&
    status !== 429 &&
    !(status === 400 && UNKNOWN_FIELD_ERROR_RE.test(formatFrameErrorBody(body)))
  );
}
//@ chunk-51jy8ztq.js:38301-38386 placement
function isAddOnlyPublish({ mode, isFirstPublish, removedCount }) {
  return removedCount === 0 && (mode === "patch" || isFirstPublish);
}
//@ chunk-51jy8ztq.js:38386-38760 placement
function copiedFilesLeftOutNote(files) {
  let count = files.length;
  let fileNoun = plural(count, "file");
  let verb = count === 1 ? "was" : "were";
  return `${count} copied ${fileNoun} ${verb} left out of this version; the other files in this publish were saved. Tell the user which ${fileNoun} ${verb} left out${unnamedFilesSuffix(files)}. At each left-out path the artifact keeps the file it had before; if it had none, the path is empty, so change or remove any reference to it. Left out: ${describeLeftOutFiles(files)}.`;
}
//@ chunk-51jy8ztq.js:38760-39745 placement
function allFilesLeftOutMessage(files, extra) {
  let count = files.length;
  let fileNoun = plural(count, "file");
  let verb = count === 1 ? "was" : "were";
  let head = `Nothing was published, and the artifact is unchanged: the server left out ${count} copied ${fileNoun}`;
  let advice = `Tell the user which ${fileNoun} ${verb} left out${unnamedFilesSuffix(files)}.`;
  let detail = `Left out: ${describeLeftOutFiles(files)}.`;
  switch (extra) {
    case "removes_files":
      return `${head}, and this publish also removes files, so publishing without the copies could remove a file one of them was meant to replace. ${advice} To save the rest, publish again without the left-out copies, and keep any file one of them was meant to replace. ${detail}`;
    case "replaces_files":
      return `${head}, and this publish replaces every file in the artifact, so publishing without the copies could delete a file it has. ${advice} To save the rest, read the artifact to see which files it has, then publish again without the left-out copies. ${detail}`;
    case "no_other_file":
      return `${head}, and nothing else in this publish would have changed the artifact. ${advice} Send a copy again only when the reason it was left out no longer applies. ${detail}`;
  }
}
//@ chunk-51jy8ztq.js:39745-39826 placement
function unnamedFilesSuffix(files) {
  let hiddenCount = files.length - MAX_UNNAMED_FILES;
  return hiddenCount > 0 ? ` (${hiddenCount} more are not named here)` : "";
}
//@ chunk-51jy8ztq.js:39826-39886 placement
function jsonQuotedTruncated(path) {
  let shownPath = truncateToLength(path, MAX_FILE_PATH_CHARS);
  return jsonStringify(shownPath === path ? path : `${shownPath}\u2026`);
}
//@ chunk-51jy8ztq.js:39886-40167 placement
function describeLeftOutFiles(files) {
  return files
    .slice(0, MAX_UNNAMED_FILES)
    .map(({ file, why }) => {
      let lines =
        why === NO_FILE
          ? "which has no file there"
          : FILE_KIND_RE.test(why)
            ? `left out by the server for the reason ${jsonStringify(why)}`
            : "left out by the server";
      return `${jsonQuotedTruncated(file.path)} (a copy of ${jsonQuotedTruncated(file.from.path)} in artifact ${file.from.slug}, ${lines})`;
    })
    .join("; ");
}
//@ chunk-51jy8ztq.js:40167-40216 placement
var SHARE_ROLES = ["editor", "commenter", "reader", "viewer"];
//@ chunk-51jy8ztq.js:40216-40304 placement
function shareRoleVerb(role) {
  return role === "editor" ? "can edit" : role === "commenter" ? "can comment" : "can view";
}
export {
  SHARE_ROLES,
  leaveOutMissingField,
  leaveOutMissingRefusal,
  markLeaveOutMissingRefused,
  isClientRefusalStatus,
  isAddOnlyPublish,
  allFilesLeftOutMessage,
  copiedFilesLeftOutNote,
  shareRoleVerb,
};
