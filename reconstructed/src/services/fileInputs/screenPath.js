/**
 * services/fileInputs/screenPath.ts
 *
 * 2.1.316 新增：附件路径筛查与失败说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5rtc26v0.js (11)
 * attribution: placement 11
 */
import {
  validateUploadPath,
  isRestrictedReadBlocked,
  CredentialPathError,
} from "../../utils/claudeInChrome/fileUpload.js";
import { expandPath } from "../../utils/path.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { getStageFileRoot } from "../../utils/stageFileRoots.js";

//@ chunk-5rtc26v0.js:342-381 placement
var BIDI_CONTROL_PATTERN = /[\u202a-\u202e\u2066-\u2069]/;
//@ chunk-5rtc26v0.js:381-484 placement
function isSafeFileName(e) {
  return (
    e !== "" &&
    e !== "." &&
    e !== ".." &&
    e.length <= 255 &&
    !/[/\\\p{Cc}]/u.test(e) &&
    !BIDI_CONTROL_PATTERN.test(e)
  );
}
//@ chunk-5rtc26v0.js:484-518 placement
function screenUploadPath(e, r) {
  return validateUploadPath(e, r);
}
//@ chunk-5rtc26v0.js:518-952 placement
function assertPathNotBlocked(e, r, o) {
  let t = [expandPath(e), r.realPath];
  if (t.some((a) => isRestrictedReadBlocked(a, o)))
    throw t.some((s) =>
      isRestrictedReadBlocked(s, {
        ...o,
        blockReadsOutsideWorkingDirectories: false,
      }),
    )
      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed under --restricted: ${e}`,
          "fileInputs/screenPath: restricted mode refused a file the upload screen passed",
        )
      : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed under permissions.blockReadsOutsideWorkingDirectories: ${e}`,
          "fileInputs/screenPath: read block refused a file the upload screen passed",
        );
}
//@ chunk-5rtc26v0.js:952-1026 placement
function pathRejectionKind(error) {
  return error instanceof CredentialPathError ? "credential_name" : "path_rejected";
}
//@ chunk-5rtc26v0.js:1026-1366 placement
function credentialFileRefusalMessage(e, r, nothingDone) {
  let t =
    getIsRemoteMode(r) === undefined
      ? "Tell the user it was not attached."
      : "If the user wants it sent, ask them to attach it to the chat themselves.";
  return `Cannot attach "${e}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not sent on Claude's word alone. ${t} ${nothingDone}`;
}
//@ chunk-5rtc26v0.js:1366-1761 placement
function fileNotSharedMessage(e, r, nothingDone) {
  let isRemoteMode = getIsRemoteMode(r);
  let a =
    isRemoteMode === undefined
      ? "Ask the user to share the file with this session, or to add its folder with /add-dir."
      : `Files the user attached to this chat are usually in ${isRemoteMode}; give the full path of one of those. If the file is not there, ask the user to attach it to the chat.`;
  return `Cannot attach "${e}": only files this session is allowed to read can be attached. ${a} ${nothingDone}`;
}
//@ chunk-5rtc26v0.js:1761-1837 placement = getIsRemoteMode (1)
function getIsRemoteMode(e) {
  if (e.isRemoteMode !== true) return;
  try {
    return getStageFileRoot();
  } catch {
    return;
  }
}
//@ chunk-5rtc26v0.js:1837-1936 placement
var ATTACH_FAILURE_KINDS = {
  too_large: true,
  hard_links: true,
  not_regular: true,
  moved: true,
  grew: true,
  open_failed: true,
  read_failed: true,
};
//@ chunk-5rtc26v0.js:1936-1980 placement
function isAttachFailureKind(e) {
  return Object.hasOwn(ATTACH_FAILURE_KINDS, e);
}
//@ chunk-5rtc26v0.js:1980-2615 placement
function attachFailureMessage(e, r, o, nothingDone) {
  switch (r) {
    case "too_large":
      return {
        error: `Cannot attach "${e}": files over ${o / 1048576} MiB cannot be attached. ${nothingDone}`,
        code: "too_large",
      };
    case "hard_links":
      return {
        error: `Cannot attach "${e}": the file has more than one hard link, which can point at a file outside the folders this session may read. Copy the file and attach the copy. ${nothingDone}`,
        code: "hard_links",
      };
    case "not_regular":
      return {
        error: `Cannot attach "${e}": it is not a regular file. Attach files one at a time, not a folder. ${nothingDone}`,
        code: "not_regular",
      };
    case "moved":
    case "grew":
    case "open_failed":
    case "read_failed":
      return {
        error: `Could not read "${e}". ${nothingDone}`,
        code: r,
      };
  }
}
export {
  BIDI_CONTROL_PATTERN,
  screenUploadPath,
  assertPathNotBlocked,
  pathRejectionKind,
  isSafeFileName,
  isAttachFailureKind,
  attachFailureMessage,
  credentialFileRefusalMessage,
  fileNotSharedMessage,
  getIsRemoteMode,
  ATTACH_FAILURE_KINDS,
};
