/**
 * services/taskFiles/taskFileUpload.ts
 *
 * 2.1.316 新增。上传本地文件为任务文件；本模块还提供删除与下载。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-edh48dyx.js (19)
 * attribution: placement 19
 */
import { posix, normalize, sep } from "path";
import { REPO_RULES_UNREAD } from "../mcpServe/uploadRules.js";
import {
  START_TASK_FILE_UPLOAD_WORDS,
  START_TASK_FILE_DELETE_WORDS,
  deleteStartTaskFilesHere,
  uploadStartTaskFileAt,
} from "./startTaskFiles.js";
import {
  keys,
  validateTaskFileEntry,
  safeDownloadName,
  TASK_FILE_CONSTANTS,
  hasFreeSpace,
  streamDownload,
  MAX_DOWNLOAD_RETRIES,
  numberedName,
} from "./taskFileDownload.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  union,
  objectSchema,
  literal,
  numberSchema,
  guidSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_FILE_PATH_CHARS } from "../mcp/inputSchemaCheck.js";
import { FILE_ID_RE } from "../mcp/agentTaskFiles.js";
import { FILES_API_MAX_FILE_BYTES } from "../api/filesApi.js";
import { settleStoredLoginRefusal } from "../../utils/auth/storedLoginRefused.js";
import { getAccessTokenWithCcrFallback } from "../../utils/teleport/api.js";
import {
  TOOL_CONTAINER_RESULTS_ROOT,
  DEFAULT_STAGE_FILE_ROOT,
  FIXED_USER_DATA_ROOTS,
} from "../../utils/stageFileRoots.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { isPolicyLimitsCacheMissing } from "../policyLimits/policyVerdicts.js";
import { filesApiUnavailableReason } from "../fileInputs/attachmentText.js";
import {
  classifyCredentialPath,
  isUnderSandboxPath,
  isInClaudeConfigDir,
} from "../../utils/permissions/sensitivePaths.js";
import { env } from "../../utils/env.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import {
  getDenyRuleForTool,
  getDenyRules,
  getAskRuleForTool,
  getAskRules,
} from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE, matchingRuleForInput } from "../../utils/permissions/filesystem.js";
import { walkPermissionCheckPaths } from "../../utils/fsOperations.js";
import { REPO_DIR_SETTING_SOURCE_LIST } from "../../utils/settings/constants.js";
import { defaultOutputRoots, isSyncedAttachPath } from "../../utils/readFileInRange.js";

//@ chunk-edh48dyx.js:1201-1326 placement
/**
 * 上传失败码集合。
 */
var UPLOAD_FAILURE_CODES = new Set([
  "canceled",
  "policy_pending",
  "egress_blocked",
  "essential_traffic",
  "unexpected",
  "credential_name",
  REPO_RULES_UNREAD,
  ...START_TASK_FILE_UPLOAD_WORDS,
]);
//@ chunk-edh48dyx.js:1326-1371 placement
/**
 * 含 not_uploaded_here 的失败码集合。
 */
var NOT_UPLOADED_HERE_CODES = new Set(["not_uploaded_here", ...START_TASK_FILE_DELETE_WORDS]);
//@ chunk-edh48dyx.js:1371-1622 placement
/**
 * 上传错误码集合与输入输出 schema
 */
var taskFileUploadSchemas = new Set(["canceled", "no_token", "bad_name", "unexpected", ...keys]);
var taskFileUploadSessionSlot = new SessionRootSlot(() => ({
  last: Promise.resolve(),
  uploaded: new Set(),
}));
var uploadInputSchema = DoctorLazy(() =>
  zodStrictObject({
    path: stringSchema().min(1).max(MAX_FILE_PATH_CHARS),
  }),
);
var uploadOutputSchema = DoctorLazy(() =>
  union([
    objectSchema({
      ok: literal(true),
      file_id: stringSchema(),
      name: stringSchema(),
    }),
    objectSchema({
      ok: literal(false),
      code: stringSchema().max(64),
    }),
  ]),
);
//@ chunk-edh48dyx.js:1622-1923 placement
/**
 * 上传本地文件为任务文件；本模块还提供删除与下载。
 */
async function uploadTaskFile(input, signal, sessionCtx, host, repoRulesUnread) {
  let { path } = uploadInputSchema().parse(input);
  if (repoRulesUnread === REPO_RULES_UNREAD)
    return {
      summary: `not uploaded: ${repoRulesUnread}`,
      output: {
        ok: false,
        code: repoRulesUnread,
      },
    };
  let slot = taskFileUploadSessionSlot.of(sessionCtx);
  let upload = () => uploadTaskFileUnchecked(path, signal, sessionCtx, host, repoRulesUnread);
  let queued = slot.last.then(upload, upload);
  slot.last = queued;
  let result = await queued;
  if (result.ok) slot.uploaded.add(result.file_id);
  return {
    summary: result.ok ? "uploaded" : `not uploaded: ${result.code}`,
    output: result,
  };
}
//@ chunk-edh48dyx.js:1923-2031 placement
/**
 * 删除任务文件的输入/输出 schema。
 */
var DELETE_INPUT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    file_id: stringSchema().min(1).max(256),
  }),
);
var DELETE_OUTPUT_SCHEMA = DoctorLazy(() =>
  union([
    objectSchema({
      ok: literal(true),
    }),
    objectSchema({
      ok: literal(false),
      code: stringSchema().max(64),
    }),
  ]),
);
//@ chunk-edh48dyx.js:2031-2329 placement
async function deleteTaskFile(input, sessionCtx) {
  let { file_id: fileId } = DELETE_INPUT_SCHEMA().parse(input);
  if (!taskFileUploadSessionSlot.of(sessionCtx).uploaded.delete(fileId))
    return {
      summary: "not deleted: not_uploaded_here",
      output: {
        ok: false,
        code: "not_uploaded_here",
      },
    };
  let failureKind = await deleteStartTaskFilesHere([fileId]);
  return failureKind === undefined
    ? {
        summary: "deleted",
        output: {
          ok: true,
        },
      }
    : {
        summary: `not deleted: ${failureKind}`,
        output: {
          ok: false,
          code: failureKind,
        },
      };
}
//@ chunk-edh48dyx.js:2329-2600 placement
/**
 * 下载输入输出 schema
 */
var taskFileDownloadSchemas = DoctorLazy(() =>
  zodStrictObject({
    file_id: stringSchema().regex(FILE_ID_RE),
    save_as: stringSchema().min(1).max(255),
    bytes: numberSchema().int().min(0).max(FILES_API_MAX_FILE_BYTES),
    session_folder: guidSchema(),
  }),
);
var downloadOutputSchema = DoctorLazy(() =>
  union([
    objectSchema({
      ok: literal(true),
      path: stringSchema().max(MAX_FILE_PATH_CHARS),
      bytes: numberSchema().int().min(0),
    }),
    objectSchema({
      ok: literal(false),
      code: stringSchema().max(64),
      status: numberSchema().int().min(100).max(599).optional(),
    }),
  ]),
);
//@ chunk-edh48dyx.js:2600-2775 placement
async function downloadTaskFile(input, signal, sessionCtx, host) {
  let parsed = taskFileDownloadSchemas().parse(input);
  let slot = taskFileUploadSessionSlot.of(sessionCtx);
  let download = () => downloadTaskFileUnchecked(parsed, signal, host);
  let queued = slot.last.then(download, download);
  slot.last = queued;
  let result = await queued;
  return {
    summary: result.ok ? "saved" : `not saved: ${result.code}`,
    output: result,
  };
}
//@ chunk-edh48dyx.js:2775-3765 placement
/**
 * 下载任务文件到会话目录
 */
async function downloadTaskFileUnchecked(
  { file_id: fileId, save_as: saveAs, bytes, session_folder: sessionFolder },
  signal,
  host,
) {
  if (signal.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  let file = {
    fileId,
    name: saveAs,
    sizeBytes: bytes,
  };
  let startedWriting = false;
  let download;
  try {
    await settleStoredLoginRefusal({
      isFilesDial: true,
      signal,
    });
    if (signal.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    let validationRefusal = validateTaskFileEntry(file, signal);
    if (validationRefusal !== undefined)
      return {
        ok: false,
        code: validationRefusal.code,
      };
    if (!getAccessTokenWithCcrFallback())
      return {
        ok: false,
        code: "no_token",
      };
    if (saveAs !== safeDownloadName(saveAs, fileId))
      return {
        ok: false,
        code: "bad_name",
      };
    startedWriting = true;
    let joined = posix.join(TOOL_CONTAINER_RESULTS_ROOT, sessionFolder);
    let dir = posix.join(joined, TASK_FILE_CONSTANTS);
    await host.makeFoldersAsWritten([TOOL_CONTAINER_RESULTS_ROOT, joined, dir]);
    if (!(await hasFreeSpace(dir, bytes)))
      return {
        ok: false,
        code: "no_room",
      };
    let streamResult = await streamDownload(file, undefined, signal);
    if (!streamResult.ok)
      return streamResult.code === "refused"
        ? {
            ok: false,
            code: "refused",
            status: streamResult.status,
          }
        : {
            ok: false,
            code: streamResult.code,
          };
    download = streamResult;
    let list = Array.from(
      {
        length: MAX_DOWNLOAD_RETRIES,
      },
      (unused, index) => numberedName(saveAs, index + 1),
    );
    let savedPath = await host.placeStreamedFile(dir, list, download.bytes, signal);
    return savedPath === undefined
      ? {
          ok: false,
          code: "name_taken",
        }
      : {
          ok: true,
          path: savedPath,
          bytes: download.bytesRead(),
        };
  } catch (error) {
    if (download !== undefined)
      return {
        ok: false,
        code: download.codeOfFailure(error),
      };
    if (isAbortError(error) || signal.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    logError(error);
    return {
      ok: false,
      code: startedWriting ? "write_failed" : "unexpected",
    };
  } finally {
    download?.close();
  }
}
//@ chunk-edh48dyx.js:3765-4524 placement
/**
 * 上传本地文件为任务文件
 */
async function uploadTaskFileUnchecked(requestedPath, signal, sessionCtx, host, sandboxPaths) {
  if (signal.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  await settleStoredLoginRefusal({
    isFilesDial: true,
    signal,
  });
  if (signal.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  let unavailableReason = isPolicyLimitsCacheMissing() ? "policy_pending" : filesApiUnavailableReason();
  if (unavailableReason !== undefined)
    return {
      ok: false,
      code: unavailableReason,
    };
  if (!getAccessTokenWithCcrFallback())
    return {
      ok: false,
      code: "no_token",
    };
  let normalizedPath = normalize(requestedPath);
  let { realDirectory } = host;
  try {
    if (
      !isRemoteStagedPath(normalizedPath) &&
      (await classifyCredentialPath(normalizedPath, normalizedPath, {
        realDirectory,
      })) === "credential_name"
    )
      return {
        ok: false,
        code: "credential_name",
      };
  } catch {
    return {
      ok: false,
      code: "path_rejected",
    };
  }
  let attachedPath = await attachableFileAt(requestedPath, sessionCtx, host, sandboxPaths);
  if (attachedPath === undefined)
    return {
      ok: false,
      code: "path_rejected",
    };
  let credentialKind = await classifyCredentialPath(normalizedPath, attachedPath, {
    attached: isRemoteStagedPath(normalizedPath) && isRemoteStagedPath(attachedPath),
    realDirectory,
  });
  if (credentialKind !== undefined)
    return {
      ok: false,
      code: credentialKind === "credential_name" ? credentialKind : "path_rejected",
    };
  try {
    return await uploadStartTaskFileAt(attachedPath, undefined, signal);
  } catch (error) {
    if (isAbortError(error))
      return {
        ok: false,
        code: "canceled",
      };
    logError(error);
    return {
      ok: false,
      code: "unexpected",
    };
  }
}
//@ chunk-edh48dyx.js:4524-4585 placement
/**
 * 远程会话下且位于默认暂存根下。
 */
function isRemoteStagedPath(filePath) {
  return Boolean(env.CLAUDE_CODE_REMOTE) && isWithinDir(filePath, DEFAULT_STAGE_FILE_ROOT);
}
//@ chunk-edh48dyx.js:4585-4810 placement
async function attachableFileAt(requestedPath, sessionCtx, host, permissionCtx, sandboxPaths = []) {
  let realPath;
  try {
    realPath = await host.localFileAt(requestedPath);
  } catch {
    return;
  }
  let normalizedPath = normalize(requestedPath);
  let remoteSyncedPaths =
    permissionCtx !== undefined &&
    isRemoteManagedEnvironment() &&
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted"
      ? sandboxPaths
      : [];
  return isUnderSandboxPath(realPath) ||
    hasReadDenyRule(normalizedPath, realPath, permissionCtx) ||
    !(await isOutsideProjectRoot(normalizedPath, realPath, sessionCtx, host, remoteSyncedPaths))
    ? undefined
    : realPath;
}
//@ chunk-edh48dyx.js:4810-5039 placement
/**
 * 路径是否在项目根之外
 */
async function isOutsideProjectRoot(
  requestedPath,
  realPath,
  sessionCtx,
  { realDirectory, home },
  remoteSyncedPaths,
) {
  if (await isInClaudeConfigDir(realPath, realDirectory)) return false;
  if (isRemoteSyncedPath(requestedPath, realPath, remoteSyncedPaths)) return true;
  let originalCwd = sessionCtx.project?.originalCwd;
  if (originalCwd === undefined || originalCwd === "") return false;
  let realHome = await realDirectory(home);
  if (realHome === undefined) return false;
  return (
    realHome !== originalCwd && !isWithinDir(realHome, originalCwd) && isWithinDir(realPath, originalCwd)
  );
}
//@ chunk-edh48dyx.js:5039-5296 placement
/**
 * 路径是否命中 read 的 deny/ask 规则
 */
function hasReadDenyRule(requestedPath, realPath, permissionCtx) {
  if (permissionCtx === undefined) return false;
  if (
    getDenyRuleForTool(
      permissionCtx,
      READ_PATH_PROBE,
      filterRulesForRemoteSynced(getDenyRules(permissionCtx), requestedPath, realPath),
    ) ||
    getAskRuleForTool(
      permissionCtx,
      READ_PATH_PROBE,
      filterRulesForRemoteSynced(getAskRules(permissionCtx), requestedPath, realPath),
    )
  )
    return true;
  let probes = [walkPermissionCheckPaths(requestedPath), walkPermissionCheckPaths(realPath)];
  if (probes.some((probe) => probe.unresolved)) return true;
  return probes.some((probe) =>
    probe.spellings.some(
      (spelling) =>
        matchingRuleForInput(spelling, permissionCtx, "read", "deny") !== null ||
        matchingRuleForInput(spelling, permissionCtx, "read", "ask") !== null,
    ),
  );
}
//@ chunk-edh48dyx.js:5296-5352 placement
function holdsWholeToolReadRule(permissionCtx) {
  return (
    getDenyRuleForTool(permissionCtx, READ_PATH_PROBE) !== null ||
    getAskRuleForTool(permissionCtx, READ_PATH_PROBE) !== null
  );
}
//@ chunk-edh48dyx.js:5352-5398 placement
/**
 * 远程同步路径时过滤掉非用户/仓库来源的规则。
 */
function filterRulesForRemoteSynced(rules, requestedPath, realPath) {
  return isRemoteSyncedPath(requestedPath, realPath) ? rules.filter(isUserOrRepoSource) : rules;
}
//@ chunk-edh48dyx.js:5398-5469 placement (2.1.88 match: _temp5, 1)
/**
 * 规则来源不是用户设置也不是仓库目录来源。
 */
function isUserOrRepoSource({ source }) {
  return (
    source !== "userSettings" && !REPO_DIR_SETTING_SOURCE_LIST.some((repoSource) => repoSource === source)
  );
}
//@ chunk-edh48dyx.js:5469-5645 placement
/**
 * 远程会话下路径是否在同步根
 */
function isRemoteSyncedPath(requestedPath, realPath, syncedPaths = []) {
  if (!env.CLAUDE_CODE_REMOTE) return false;
  let outputRoot = defaultOutputRoots();
  return (
    [...FIXED_USER_DATA_ROOTS, ...syncedPaths.map((syncedPath) => syncedPath.product)].some((root) =>
      isWithinDir(realPath, root),
    ) ||
    [...(outputRoot === undefined ? [] : [outputRoot]), ...syncedPaths].some((syncedPath) =>
      isSyncedAttachPath(requestedPath, realPath, syncedPath),
    )
  );
}
//@ chunk-edh48dyx.js:5645-5686 placement
/**
 * 路径是否位于指定目录之下。
 */
function isWithinDir(childPath, parentDir) {
  return childPath.startsWith(parentDir + sep);
}
export { attachableFileAt, holdsWholeToolReadRule, deleteTaskFile, downloadTaskFile, uploadTaskFile };
