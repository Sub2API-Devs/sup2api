/**
 * services/fileInputs/screenPath.ts
 *
 * 2.1.316 新增：附件路径筛查与失败说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-r9fjrg7c.js (15)
 * attribution: placement 11, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { homedir, tmpdir as tmpdir_2 } from "os";
import { dirname } from "path";
import {
  validateUploadPath,
  isRestrictedReadBlocked,
  CredentialPathError,
  OutsideWorkingFoldersRefusal,
} from "../../utils/claudeInChrome/fileUpload.js";
import { expandPath, expandPathOrNull } from "../../utils/path.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isPathAbsent,
  getErrnoCode,
} from "../../utils/errors.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { getClaudeConfigDirOrNull } from "../../utils/envUtils.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import {
  DEFAULT_STAGE_FILE_ROOT,
  DEFAULT_OUTPUTS_ROOT,
  PROJECT_FILES_MOUNT_PATH,
  DEFAULT_HOME_FILES_ROOT,
  getStageFileRoot,
} from "../../utils/stageFileRoots.js";
import { allWorkingDirectories, pathInWorkingPath } from "../../utils/permissions/filesystem.js";
import { tmpdir } from "../../utils/tempDir.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-r9fjrg7c.js:627-666 placement
var BIDI_CONTROL_PATTERN = /[\u202a-\u202e\u2066-\u2069]/;
//@ chunk-r9fjrg7c.js:666-769 placement
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
//@ chunk-r9fjrg7c.js:769-803 placement
function screenUploadPath(filePath, context) {
  return validateUploadPath(filePath, context);
}
//@ chunk-r9fjrg7c.js:803-1237 placement
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
//@ chunk-r9fjrg7c.js:1237-1311 placement
function pathRejectionKind(error) {
  return error instanceof CredentialPathError ? "credential_name" : "path_rejected";
}
//@ chunk-r9fjrg7c.js:1311-2432 layout
var REJECTION_BY_SOURCE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-r9fjrg7c.js:1311", () => {
  REJECTION_BY_SOURCE = new Map([
    ["claudeInChrome/fileUpload: path read not allowed by session permissions", "read_not_allowed"],
    ["claudeInChrome/fileUpload: path matches a read deny rule", "read_deny_rule"],
    ["claudeInChrome/fileUpload: path matches a read ask rule", "read_ask_rule"],
    ["claudeInChrome/fileUpload: Read tool denied or ask-gated for this session", "read_tool_restricted"],
    ["claudeInChrome/fileUpload: path outside the working directories under the read block", "read_block"],
    ["claudeInChrome/fileUpload: restricted mode refused a file only an allow rule opens", "restricted_mode"],
    [
      "claudeInChrome/fileUpload: kernel or device path, or one of Claude Code's own credentials",
      "own_credential_or_device",
    ],
    ["claudeInChrome/fileUpload: network path rejected before filesystem access", "network_path"],
    ["claudeInChrome/fileUpload: network path rejected", "network_path"],
    ["claudeInChrome/fileUpload: over-long path rejected", "too_long"],
    ["claudeInChrome/fileUpload: suspicious Windows path pattern rejected", "odd_spelling"],
    [
      "claudeInChrome/fileUpload: unvettable path ancestry rejected before filesystem access",
      "unvettable_ancestry",
    ],
  ]);
});
//@ chunk-r9fjrg7c.js:2432-2663 layout
function pathRejectionReason(error) {
  if (isPathAbsent(error)) return "not_found";
  if (error instanceof CredentialPathError) return "credential_name";
  if (error instanceof OutsideWorkingFoldersRefusal) return "outside_working_folders";
  return (
    (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      ? REJECTION_BY_SOURCE.get(error.telemetryMessage)
      : undefined) ?? (getErrnoCode(error) === undefined ? "other" : "fs_error")
  );
}
//@ chunk-r9fjrg7c.js:2663-2730 layout
function isVmSessionsPath(path) {
  return path === "/sessions" || path.startsWith("/sessions/");
}
//@ chunk-r9fjrg7c.js:2730-3324 layout
function describeFileRefPath(path, source, toolPermissionContext) {
  let reason = {
    reason: fromEnum(source),
    fileRefPathKind: lit("other"),
  };
  if (isVmSessionsPath(path))
    return {
      ...reason,
      fileRefPathKind: lit("vm_sessions"),
    };
  if (expandPathOrNull(path) === null) return reason;
  try {
    let compareOptions = {
      caseFold: true,
      uncShapeParity: true,
    };
    let home = homedir();
    let claudeConfigDirOrNull = getClaudeConfigDirOrNull();
    let besideCwd = dirname(getOriginalCwd());
    let roots = [
      ["uploads", [DEFAULT_STAGE_FILE_ROOT]],
      ["outputs", [DEFAULT_OUTPUTS_ROOT]],
      ["project_files", [PROJECT_FILES_MOUNT_PATH]],
      ["claude_config", claudeConfigDirOrNull === null ? [] : [claudeConfigDirOrNull]],
      ["working_folder", [...allWorkingDirectories(toolPermissionContext)]],
      ["tmp", [tmpdir(), tmpdir_2()]],
      [
        "beside_working_folder",
        besideCwd === dirname(besideCwd) || pathInWorkingPath(home, besideCwd, compareOptions)
          ? []
          : [besideCwd],
      ],
      ["home", [home, DEFAULT_HOME_FILES_ROOT]],
    ].find(([, candidateRoots]) =>
      candidateRoots.some((root) => pathInWorkingPath(path, root, compareOptions)),
    )?.[0];
    return roots === undefined
      ? reason
      : {
          ...reason,
          fileRefPathKind: fromEnum(roots),
        };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ERR_SYSTEM_ERROR") logError(error);
    return reason;
  }
}
//@ chunk-r9fjrg7c.js:3324-3664 placement
function credentialFileRefusalMessage(path, context, nothingDone) {
  let advice =
    getIsRemoteMode(context) === undefined
      ? "Tell the user it was not attached."
      : "If the user wants it sent, ask them to attach it to the chat themselves.";
  return `Cannot attach "${path}": its name or folder is one that credentials are kept under (such as .env, a .pem or .key file, or .ssh), so it is not sent on Claude's word alone. ${advice} ${nothingDone}`;
}
//@ chunk-r9fjrg7c.js:3664-4059 placement
function fileNotSharedMessage(path, context, nothingDone) {
  let isRemoteMode = getIsRemoteMode(context);
  let advice =
    isRemoteMode === undefined
      ? "Ask the user to share the file with this session, or to add its folder with /add-dir."
      : `Files the user attached to this chat are usually in ${isRemoteMode}; give the full path of one of those. If the file is not there, ask the user to attach it to the chat.`;
  return `Cannot attach "${path}": only files this session is allowed to read can be attached. ${advice} ${nothingDone}`;
}
//@ chunk-r9fjrg7c.js:4059-4135 placement (2.1.88 match: getIsRemoteMode, 1)
function getIsRemoteMode(context) {
  if (context.isRemoteMode !== true) return;
  try {
    return getStageFileRoot();
  } catch {
    return;
  }
}
//@ chunk-r9fjrg7c.js:4135-4234 placement
var ATTACH_FAILURE_KINDS = {
  too_large: true,
  hard_links: true,
  not_regular: true,
  moved: true,
  grew: true,
  open_failed: true,
  read_failed: true,
};
//@ chunk-r9fjrg7c.js:4234-4278 placement
function isAttachFailureKind(kind) {
  return Object.hasOwn(ATTACH_FAILURE_KINDS, kind);
}
//@ chunk-r9fjrg7c.js:4278-4913 placement
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
  isSafeFileName,
  isAttachFailureKind,
  attachFailureMessage,
  credentialFileRefusalMessage,
  fileNotSharedMessage,
  screenUploadPath,
  describeFileRefPath,
  pathRejectionReason,
  assertPathNotBlocked,
  BIDI_CONTROL_PATTERN,
  isVmSessionsPath,
  pathRejectionKind,
  getIsRemoteMode,
  ATTACH_FAILURE_KINDS,
};
