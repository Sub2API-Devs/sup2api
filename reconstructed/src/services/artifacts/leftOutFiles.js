/**
 * services/artifacts/leftOutFiles.ts
 *
 * 2.1.316 新增：发布时被略过文件的说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (13)
 * attribution: placement 13
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { lNo } from "./requestMeta.js";
import { formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE, STt } from "./frameApi.js";
import { plural, truncateToLength } from "../../utils/stringUtils.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-06y4szbn.js:37798-37863 placement
var NO_FILE = "no_file",
  Go = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/,
  fs = 16,
  qo = 160;
//@ chunk-06y4szbn.js:37863-37975 placement
function leaveOutMissingField() {
  let leaveOutMissingRefusedAt = getLiveState().leaveOutMissingRefusedAt;
  return leaveOutMissingRefusedAt !== void 0 && Date.now() - leaveOutMissingRefusedAt < lNo
    ? {}
    : { leave_out_missing: !0 };
}
//@ chunk-06y4szbn.js:37975-38030 placement
function markLeaveOutMissingRefused() {
  getLiveState().leaveOutMissingRefusedAt = Date.now();
}
//@ chunk-06y4szbn.js:38030-38215 placement
function leaveOutMissingRefusal(e, n) {
  let r = formatFrameErrorBody(e);
  if (!UNKNOWN_FIELD_ERROR_RE.test(r)) return;
  if (STt(r, "leave_out_missing")) return "named";
  return /unknown field ["']/i.test(r) || Object.keys(n).some((h) => STt(r, h)) ? void 0 : "unnamed";
}
//@ chunk-06y4szbn.js:38215-38301 placement
function isClientRefusalStatus(e, n) {
  return (
    e < 500 &&
    e !== 401 &&
    e !== 403 &&
    e !== 429 &&
    !(e === 400 && UNKNOWN_FIELD_ERROR_RE.test(formatFrameErrorBody(n)))
  );
}
//@ chunk-06y4szbn.js:38301-38386 placement
function isAddOnlyPublish({ mode: mode, isFirstPublish: isFirstPublish, removedCount: removedCount }) {
  return removedCount === 0 && (mode === "patch" || isFirstPublish);
}
//@ chunk-06y4szbn.js:38386-38760 placement
function copiedFilesLeftOutNote(e) {
  let n = e.length,
    r = plural(n, "file"),
    s = n === 1 ? "was" : "were";
  return `${n} copied ${r} ${s} left out of this version; the other files in this publish were saved. Tell the user which ${r} ${s} left out${ys(e)}. At each left-out path the artifact keeps the file it had before; if it had none, the path is empty, so change or remove any reference to it. Left out: ${describeLeftOutFiles(e)}.`;
}
//@ chunk-06y4szbn.js:38760-39745 placement
function allFilesLeftOutMessage(e, n) {
  let r = e.length,
    s = plural(r, "file"),
    h = r === 1 ? "was" : "were",
    b = `Nothing was published, and the artifact is unchanged: the server left out ${r} copied ${s}`,
    y = `Tell the user which ${s} ${h} left out${ys(e)}.`,
    x = `Left out: ${describeLeftOutFiles(e)}.`;
  switch (n) {
    case "removes_files":
      return `${b}, and this publish also removes files, so publishing without the copies could remove a file one of them was meant to replace. ${y} To save the rest, publish again without the left-out copies, and keep any file one of them was meant to replace. ${x}`;
    case "replaces_files":
      return `${b}, and this publish replaces every file in the artifact, so publishing without the copies could delete a file it has. ${y} To save the rest, read the artifact to see which files it has, then publish again without the left-out copies. ${x}`;
    case "no_other_file":
      return `${b}, and nothing else in this publish would have changed the artifact. ${y} Send a copy again only when the reason it was left out no longer applies. ${x}`;
  }
}
//@ chunk-06y4szbn.js:39745-39826 placement
function ys(e) {
  let n = e.length - fs;
  return n > 0 ? ` (${n} more are not named here)` : "";
}
//@ chunk-06y4szbn.js:39826-39887 placement
function us(e) {
  let n = truncateToLength(e, qo);
  return jsonStringify(n === e ? e : `${n}\u2026`);
}
//@ chunk-06y4szbn.js:39887-40168 placement
function describeLeftOutFiles(e) {
  return e
    .slice(0, fs)
    .map(({ file: file, why: why }) => {
      let s =
        why === NO_FILE
          ? "which has no file there"
          : Go.test(why)
            ? `left out by the server for the reason ${jsonStringify(why)}`
            : "left out by the server";
      return `${us(file.path)} (a copy of ${us(file.from.path)} in artifact ${file.from.slug}, ${s})`;
    })
    .join("; ");
}
//@ chunk-06y4szbn.js:40168-40217 placement
var SHARE_ROLES = ["editor", "commenter", "reader", "viewer"];
//@ chunk-06y4szbn.js:40217-40305 placement
function shareRoleVerb(e) {
  return e === "editor" ? "can edit" : e === "commenter" ? "can comment" : "can view";
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
