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
function isSafeFileName(name) {
  return (
    name !== "" &&
    name !== "." &&
    name !== ".." &&
    name.length <= 255 &&
    !/[/\\\p{Cc}]/u.test(name) &&
    !BIDI_CONTROL_PATTERN.test(name)
  );
}
//@ chunk-5rtc26v0.js:484-518 placement
function screenUploadPath(filePath, context) {
  return validateUploadPath(filePath, context);
}
//@ chunk-5rtc26v0.js:518-952 placement
function assertPathNotBlocked(path, resolved, permissionContext) {
  let candidates = [expandPath(path), resolved.realPath];
  if (candidates.some((candidate) => isRestrictedReadBlocked(candidate, permissionContext)))
    throw candidates.some((candidate) =>
      isRestrictedReadBlocked(candidate, {
        ...permissionContext,
        blockReadsOutsideWorkingDirectories: false,
      }),
    )
      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed under --restricted: ${path}`,
          "fileInputs/screenPath: restricted mode refused a file the upload screen passed",
        )
      : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `read not allowed under permissions.blockReadsOutsideWorkingDirectories: ${path}`,
          "fileInputs/screenPath: read block refused a file the upload screen passed",
        );
}
//@ chunk-5rtc26v0.js:952-1026 placement
function pathRejectionKind(error) {
  return error instanceof CredentialPathError ? "credential_name" : "path_rejected";
}
//@ chunk-5rtc26v0.js:1026-1366 placement
function credentialFileRefusalMessage(path, context, nothingDone) {
  let advice =
    getIsRemoteMode(context) === undefined
      ? "Tell the user it was not attached."
      : "If the user wants it sent, ask them to attach it to the chat themselves.";
  return `Cannot attach "${path}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not sent on Claude's word alone. ${advice} ${nothingDone}`;
}
//@ chunk-5rtc26v0.js:1366-1761 placement
function fileNotSharedMessage(path, context, nothingDone) {
  let isRemoteMode = getIsRemoteMode(context);
  let advice =
    isRemoteMode === undefined
      ? "Ask the user to share the file with this session, or to add its folder with /add-dir."
      : `Files the user attached to this chat are usually in ${isRemoteMode}; give the full path of one of those. If the file is not there, ask the user to attach it to the chat.`;
  return `Cannot attach "${path}": only files this session is allowed to read can be attached. ${advice} ${nothingDone}`;
}
//@ chunk-5rtc26v0.js:1761-1837 placement (2.1.88 match: getIsRemoteMode, 1)
function getIsRemoteMode(context) {
  if (context.isRemoteMode !== true) return;
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
function isAttachFailureKind(kind) {
  return Object.hasOwn(ATTACH_FAILURE_KINDS, kind);
}
//@ chunk-5rtc26v0.js:1980-2615 placement
function attachFailureMessage(path, kind, maxBytes, nothingDone) {
  switch (kind) {
    case "too_large":
      return {
        error: `Cannot attach "${path}": files over ${maxBytes / 1048576} MiB cannot be attached. ${nothingDone}`,
        code: "too_large",
      };
    case "hard_links":
      return {
        error: `Cannot attach "${path}": the file has more than one hard link, which can point at a file outside the folders this session may read. Copy the file and attach the copy. ${nothingDone}`,
        code: "hard_links",
      };
    case "not_regular":
      return {
        error: `Cannot attach "${path}": it is not a regular file. Attach files one at a time, not a folder. ${nothingDone}`,
        code: "not_regular",
      };
    case "moved":
    case "grew":
    case "open_failed":
    case "read_failed":
      return {
        error: `Could not read "${path}". ${nothingDone}`,
        code: kind,
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
