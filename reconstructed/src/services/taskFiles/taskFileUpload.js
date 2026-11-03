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
  string,
  union,
  u,
  literal,
  E,
  bIi,
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
    path: string().min(1).max(MAX_FILE_PATH_CHARS),
  }),
);
var uploadOutputSchema = DoctorLazy(() =>
  union([
    u({
      ok: literal(true),
      file_id: string(),
      name: string(),
    }),
    u({
      ok: literal(false),
      code: string().max(64),
    }),
  ]),
);
//@ chunk-edh48dyx.js:1622-1923 placement
/**
 * 上传本地文件为任务文件；本模块还提供删除与下载。
 */
async function uploadTaskFile(e, t, n, s, r) {
  let { path } = uploadInputSchema().parse(e);
  if (r === REPO_RULES_UNREAD)
    return {
      summary: `not uploaded: ${r}`,
      output: {
        ok: false,
        code: r,
      },
    };
  let a = taskFileUploadSessionSlot.of(n);
  let c = () => uploadTaskFileUnchecked(path, t, n, s, r);
  let f = a.last.then(c, c);
  a.last = f;
  let m = await f;
  if (m.ok) a.uploaded.add(m.file_id);
  return {
    summary: m.ok ? "uploaded" : `not uploaded: ${m.code}`,
    output: m,
  };
}
//@ chunk-edh48dyx.js:1923-2031 placement
/**
 * 删除任务文件的输入/输出 schema。
 */
var DELETE_INPUT_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    file_id: string().min(1).max(256),
  }),
);
var DELETE_OUTPUT_SCHEMA = DoctorLazy(() =>
  union([
    u({
      ok: literal(true),
    }),
    u({
      ok: literal(false),
      code: string().max(64),
    }),
  ]),
);
//@ chunk-edh48dyx.js:2031-2329 placement
async function deleteTaskFile(e, t) {
  let { file_id: fileId } = DELETE_INPUT_SCHEMA().parse(e);
  if (!taskFileUploadSessionSlot.of(t).uploaded.delete(fileId))
    return {
      summary: "not deleted: not_uploaded_here",
      output: {
        ok: false,
        code: "not_uploaded_here",
      },
    };
  let s = await deleteStartTaskFilesHere([fileId]);
  return s === undefined
    ? {
        summary: "deleted",
        output: {
          ok: true,
        },
      }
    : {
        summary: `not deleted: ${s}`,
        output: {
          ok: false,
          code: s,
        },
      };
}
//@ chunk-edh48dyx.js:2329-2600 placement
/**
 * 下载输入输出 schema
 */
var taskFileDownloadSchemas = DoctorLazy(() =>
  zodStrictObject({
    file_id: string().regex(FILE_ID_RE),
    save_as: string().min(1).max(255),
    bytes: E().int().min(0).max(FILES_API_MAX_FILE_BYTES),
    session_folder: bIi(),
  }),
);
var downloadOutputSchema = DoctorLazy(() =>
  union([
    u({
      ok: literal(true),
      path: string().max(MAX_FILE_PATH_CHARS),
      bytes: E().int().min(0),
    }),
    u({
      ok: literal(false),
      code: string().max(64),
      status: E().int().min(100).max(599).optional(),
    }),
  ]),
);
//@ chunk-edh48dyx.js:2600-2775 placement
async function downloadTaskFile(e, t, n, s) {
  let r = taskFileDownloadSchemas().parse(e);
  let d = taskFileUploadSessionSlot.of(n);
  let a = () => downloadTaskFileUnchecked(r, t, s);
  let c = d.last.then(a, a);
  d.last = c;
  let f = await c;
  return {
    summary: f.ok ? "saved" : `not saved: ${f.code}`,
    output: f,
  };
}
//@ chunk-edh48dyx.js:2775-3765 placement
/**
 * 下载任务文件到会话目录
 */
async function downloadTaskFileUnchecked(
  { file_id: fileId, save_as: saveAs, bytes, session_folder: sessionFolder },
  r,
  d,
) {
  if (r.aborted)
    return {
      ok: false,
      code: "canceled",
    };
  let a = {
    fileId,
    name: saveAs,
    sizeBytes: bytes,
  };
  let c = false;
  let f;
  try {
    await settleStoredLoginRefusal({
      isFilesDial: true,
      signal: r,
    });
    if (r.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    let m = validateTaskFileEntry(a, r);
    if (m !== undefined)
      return {
        ok: false,
        code: m.code,
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
    c = true;
    let joined = posix.join(TOOL_CONTAINER_RESULTS_ROOT, sessionFolder);
    let joined_2 = posix.join(joined, TASK_FILE_CONSTANTS);
    await d.makeFoldersAsWritten([TOOL_CONTAINER_RESULTS_ROOT, joined, joined_2]);
    if (!(await hasFreeSpace(joined_2, bytes)))
      return {
        ok: false,
        code: "no_room",
      };
    let _ = await streamDownload(a, undefined, r);
    if (!_.ok)
      return _.code === "refused"
        ? {
            ok: false,
            code: "refused",
            status: _.status,
          }
        : {
            ok: false,
            code: _.code,
          };
    f = _;
    let list = Array.from(
      {
        length: MAX_DOWNLOAD_RETRIES,
      },
      (W, L) => numberedName(saveAs, L + 1),
    );
    let A = await d.placeStreamedFile(joined_2, list, f.bytes, r);
    return A === undefined
      ? {
          ok: false,
          code: "name_taken",
        }
      : {
          ok: true,
          path: A,
          bytes: f.bytesRead(),
        };
  } catch (error) {
    if (f !== undefined)
      return {
        ok: false,
        code: f.codeOfFailure(error),
      };
    if (isAbortError(error) || r.aborted)
      return {
        ok: false,
        code: "canceled",
      };
    logError(error);
    return {
      ok: false,
      code: c ? "write_failed" : "unexpected",
    };
  } finally {
    f?.close();
  }
}
//@ chunk-edh48dyx.js:3765-4524 placement
/**
 * 上传本地文件为任务文件
 */
async function uploadTaskFileUnchecked(path, signal, n, s, r) {
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
  let d = isPolicyLimitsCacheMissing() ? "policy_pending" : filesApiUnavailableReason();
  if (d !== undefined)
    return {
      ok: false,
      code: d,
    };
  if (!getAccessTokenWithCcrFallback())
    return {
      ok: false,
      code: "no_token",
    };
  let a = normalize(path);
  let { realDirectory } = s;
  try {
    if (
      !isRemoteStagedPath(a) &&
      (await classifyCredentialPath(a, a, {
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
  let f = await attachableFileAt(path, n, s, r);
  if (f === undefined)
    return {
      ok: false,
      code: "path_rejected",
    };
  let m = await classifyCredentialPath(a, f, {
    attached: isRemoteStagedPath(a) && isRemoteStagedPath(f),
    realDirectory,
  });
  if (m !== undefined)
    return {
      ok: false,
      code: m === "credential_name" ? m : "path_rejected",
    };
  try {
    return await uploadStartTaskFileAt(f, undefined, signal);
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
function isRemoteStagedPath(e) {
  return Boolean(env.CLAUDE_CODE_REMOTE) && isWithinDir(e, DEFAULT_STAGE_FILE_ROOT);
}
//@ chunk-edh48dyx.js:4585-4810 placement
async function attachableFileAt(e, t, n, s, r = []) {
  let d;
  try {
    d = await n.localFileAt(e);
  } catch {
    return;
  }
  let a = normalize(e);
  let c =
    s !== undefined &&
    isRemoteManagedEnvironment() &&
    env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted"
      ? r
      : [];
  return isUnderSandboxPath(d) || hasReadDenyRule(a, d, s) || !(await isOutsideProjectRoot(a, d, t, n, c))
    ? undefined
    : d;
}
//@ chunk-edh48dyx.js:4810-5039 placement
/**
 * 路径是否在项目根之外
 */
async function isOutsideProjectRoot(e, t, n, { realDirectory, home }, d) {
  if (await isInClaudeConfigDir(t, realDirectory)) return false;
  if (isRemoteSyncedPath(e, t, d)) return true;
  let originalCwd = n.project?.originalCwd;
  if (originalCwd === undefined || originalCwd === "") return false;
  let c = await realDirectory(home);
  if (c === undefined) return false;
  return c !== originalCwd && !isWithinDir(c, originalCwd) && isWithinDir(t, originalCwd);
}
//@ chunk-edh48dyx.js:5039-5296 placement
/**
 * 路径是否命中 read 的 deny/ask 规则
 */
function hasReadDenyRule(e, t, n) {
  if (n === undefined) return false;
  if (
    getDenyRuleForTool(n, READ_PATH_PROBE, filterRulesForRemoteSynced(getDenyRules(n), e, t)) ||
    getAskRuleForTool(n, READ_PATH_PROBE, filterRulesForRemoteSynced(getAskRules(n), e, t))
  )
    return true;
  let s = [walkPermissionCheckPaths(e), walkPermissionCheckPaths(t)];
  if (s.some((r) => r.unresolved)) return true;
  return s.some((r) =>
    r.spellings.some(
      (spelling) =>
        matchingRuleForInput(spelling, n, "read", "deny") !== null ||
        matchingRuleForInput(spelling, n, "read", "ask") !== null,
    ),
  );
}
//@ chunk-edh48dyx.js:5296-5352 placement
function holdsWholeToolReadRule(e) {
  return getDenyRuleForTool(e, READ_PATH_PROBE) !== null || getAskRuleForTool(e, READ_PATH_PROBE) !== null;
}
//@ chunk-edh48dyx.js:5352-5398 placement
/**
 * 远程同步路径时过滤掉非用户/仓库来源的规则。
 */
function filterRulesForRemoteSynced(e, t, n) {
  return isRemoteSyncedPath(t, n) ? e.filter(isUserOrRepoSource) : e;
}
//@ chunk-edh48dyx.js:5398-5469 placement = _temp5 (1)
/**
 * 规则来源不是用户设置也不是仓库目录来源。
 */
function isUserOrRepoSource({ source }) {
  return source !== "userSettings" && !REPO_DIR_SETTING_SOURCE_LIST.some((t) => t === source);
}
//@ chunk-edh48dyx.js:5469-5645 placement
/**
 * 远程会话下路径是否在同步根
 */
function isRemoteSyncedPath(e, t, n = []) {
  if (!env.CLAUDE_CODE_REMOTE) return false;
  let s = defaultOutputRoots();
  return (
    [...FIXED_USER_DATA_ROOTS, ...n.map((r) => r.product)].some((r) => isWithinDir(t, r)) ||
    [...(s === undefined ? [] : [s]), ...n].some((r) => isSyncedAttachPath(e, t, r))
  );
}
//@ chunk-edh48dyx.js:5645-5686 placement
/**
 * 路径是否位于指定目录之下。
 */
function isWithinDir(e, originalCwd) {
  return e.startsWith(originalCwd + sep);
}
export { attachableFileAt, holdsWholeToolReadRule };
