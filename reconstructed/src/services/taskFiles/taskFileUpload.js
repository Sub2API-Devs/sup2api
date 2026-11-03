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
  RGn,
  numberedName,
} from "./taskFileDownload.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, Ue, u, T, E, bIi } from "../../../vendor/zod/v4/classic/schemas.js";
import { XHe } from "../mcp/inputSchemaCheck.js";
import { m_e } from "../mcp/agentTaskFiles.js";
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
import { classifyCredentialPath, mqt, isInClaudeConfigDir } from "../../utils/permissions/sensitivePaths.js";
import { env } from "../../utils/env.js";
import { mn } from "../../utils/remoteEnvironment.js";
import {
  getDenyRuleForTool,
  getDenyRules,
  getAskRuleForTool,
  getAskRules,
} from "../../utils/permissions/permissions.js";
import { READ_PATH_PROBE, matchingRuleForInput } from "../../utils/permissions/filesystem.js";
import { walkPermissionCheckPaths } from "../../utils/fsOperations.js";
import { REPO_DIR_SETTING_SOURCE_LIST } from "../../utils/settings/constants.js";
import { mor, isSyncedAttachPath } from "../../utils/readFileInRange.js";

/**
 * 上传失败码集合。
 */
//@ chunk-edh48dyx.js:1201-1326 placement
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
var me = new Set(["not_uploaded_here", ...START_TASK_FILE_DELETE_WORDS]);
/**
 * 上传错误码集合与输入输出 schema
 */
//@ chunk-edh48dyx.js:1371-1622 placement
var taskFileUploadSchemas = new Set(["canceled", "no_token", "bad_name", "unexpected", ...keys]),
  S = new SessionRootSlot(() => ({ last: Promise.resolve(), uploaded: new Set() })),
  h = DoctorLazy(() => zodStrictObject({ path: o().min(1).max(XHe) })),
  _e = DoctorLazy(() => Ue([u({ ok: T(!0), file_id: o(), name: o() }), u({ ok: T(!1), code: o().max(64) })]));
/**
 * 上传本地文件为任务文件；本模块还提供删除与下载。
 */
//@ chunk-edh48dyx.js:1622-1923 placement
async function uploadTaskFile(e, t, n, s, r) {
  let { path: path } = h().parse(e);
  if (r === REPO_RULES_UNREAD) return { summary: `not uploaded: ${r}`, output: { ok: !1, code: r } };
  let of = S.of(n),
    c = () => uploadTaskFileUnchecked(path, t, n, s, r),
    f = of.last.then(c, c);
  of.last = f;
  let m = await f;
  if (m.ok) of.uploaded.add(m.file_id);
  return { summary: m.ok ? "uploaded" : `not uploaded: ${m.code}`, output: m };
}
/**
 * 删除任务文件的输入/输出 schema。
 */
//@ chunk-edh48dyx.js:1923-2031 placement
var DELETE_INPUT_SCHEMA = DoctorLazy(() => zodStrictObject({ file_id: o().min(1).max(256) })),
  DELETE_OUTPUT_SCHEMA = DoctorLazy(() => Ue([u({ ok: T(!0) }), u({ ok: T(!1), code: o().max(64) })]));
//@ chunk-edh48dyx.js:2031-2329 placement
async function deleteTaskFile(e, t) {
  let { file_id: file_id } = DELETE_INPUT_SCHEMA().parse(e);
  if (!S.of(t).uploaded.delete(file_id))
    return { summary: "not deleted: not_uploaded_here", output: { ok: !1, code: "not_uploaded_here" } };
  let s = await deleteStartTaskFilesHere([file_id]);
  return s === void 0
    ? { summary: "deleted", output: { ok: !0 } }
    : { summary: `not deleted: ${s}`, output: { ok: !1, code: s } };
}
/**
 * 下载输入输出 schema
 */
//@ chunk-edh48dyx.js:2329-2600 placement
var taskFileDownloadSchemas = DoctorLazy(() =>
    zodStrictObject({
      file_id: o().regex(m_e),
      save_as: o().min(1).max(255),
      bytes: E().int().min(0).max(FILES_API_MAX_FILE_BYTES),
      session_folder: bIi(),
    }),
  ),
  Fe = DoctorLazy(() =>
    Ue([
      u({ ok: T(!0), path: o().max(XHe), bytes: E().int().min(0) }),
      u({ ok: T(!1), code: o().max(64), status: E().int().min(100).max(599).optional() }),
    ]),
  );
//@ chunk-edh48dyx.js:2600-2775 placement
async function downloadTaskFile(e, t, n, s) {
  let parse = taskFileDownloadSchemas().parse(e),
    of = S.of(n),
    a = () => downloadTaskFileUnchecked(parse, t, s),
    c = of.last.then(a, a);
  of.last = c;
  let f = await c;
  return { summary: f.ok ? "saved" : `not saved: ${f.code}`, output: f };
}
/**
 * 下载任务文件到会话目录
 */
//@ chunk-edh48dyx.js:2775-3765 placement
async function downloadTaskFileUnchecked(
  { file_id: file_id, save_as: save_as, bytes: bytes, session_folder: session_folder },
  r,
  d,
) {
  if (r.aborted) return { ok: !1, code: "canceled" };
  let a = { fileId: file_id, name: save_as, sizeBytes: bytes },
    c = !1,
    f;
  try {
    if ((await settleStoredLoginRefusal({ isFilesDial: !0, signal: r }), r.aborted))
      return { ok: !1, code: "canceled" };
    let m = validateTaskFileEntry(a, r);
    if (m !== void 0) return { ok: !1, code: m.code };
    if (!getAccessTokenWithCcrFallback()) return { ok: !1, code: "no_token" };
    if (save_as !== safeDownloadName(save_as, file_id)) return { ok: !1, code: "bad_name" };
    c = !0;
    let joined = posix.join(TOOL_CONTAINER_RESULTS_ROOT, session_folder),
      joined_2 = posix.join(joined, TASK_FILE_CONSTANTS);
    if (
      (await d.makeFoldersAsWritten([TOOL_CONTAINER_RESULTS_ROOT, joined, joined_2]),
      !(await hasFreeSpace(joined_2, bytes)))
    )
      return { ok: !1, code: "no_room" };
    let _ = await streamDownload(a, void 0, r);
    if (!_.ok)
      return _.code === "refused" ? { ok: !1, code: "refused", status: _.status } : { ok: !1, code: _.code };
    f = _;
    let list = Array.from({ length: RGn }, (W, L) => numberedName(save_as, L + 1)),
      placeStreamedFile = await d.placeStreamedFile(joined_2, list, f.bytes, r);
    return placeStreamedFile === void 0
      ? { ok: !1, code: "name_taken" }
      : { ok: !0, path: placeStreamedFile, bytes: f.bytesRead() };
  } catch (error) {
    if (f !== void 0) return { ok: !1, code: f.codeOfFailure(error) };
    if (isAbortError(error) || r.aborted) return { ok: !1, code: "canceled" };
    return (logError(error), { ok: !1, code: c ? "write_failed" : "unexpected" });
  } finally {
    f?.close();
  }
}
/**
 * 上传本地文件为任务文件
 */
//@ chunk-edh48dyx.js:3765-4524 placement
async function uploadTaskFileUnchecked(e, t, n, s, r) {
  if (t.aborted) return { ok: !1, code: "canceled" };
  if ((await settleStoredLoginRefusal({ isFilesDial: !0, signal: t }), t.aborted))
    return { ok: !1, code: "canceled" };
  let d = isPolicyLimitsCacheMissing() ? "policy_pending" : filesApiUnavailableReason();
  if (d !== void 0) return { ok: !1, code: d };
  if (!getAccessTokenWithCcrFallback()) return { ok: !1, code: "no_token" };
  let a = normalize(e),
    { realDirectory: realDirectory } = s;
  try {
    if (!y(a) && (await classifyCredentialPath(a, a, { realDirectory: realDirectory })) === "credential_name")
      return { ok: !1, code: "credential_name" };
  } catch {
    return { ok: !1, code: "path_rejected" };
  }
  let f = await attachableFileAt(e, n, s, r);
  if (f === void 0) return { ok: !1, code: "path_rejected" };
  let m = await classifyCredentialPath(a, f, { attached: y(a) && y(f), realDirectory: realDirectory });
  if (m !== void 0) return { ok: !1, code: m === "credential_name" ? m : "path_rejected" };
  try {
    return await uploadStartTaskFileAt(f, void 0, t);
  } catch (error) {
    if (isAbortError(error)) return { ok: !1, code: "canceled" };
    return (logError(error), { ok: !1, code: "unexpected" });
  }
}
//@ chunk-edh48dyx.js:4524-4585 placement
function y(e) {
  return Boolean(env.CLAUDE_CODE_REMOTE) && F(e, DEFAULT_STAGE_FILE_ROOT);
}
//@ chunk-edh48dyx.js:4585-4810 placement
async function attachableFileAt(e, t, n, s, r = []) {
  let d;
  try {
    d = await n.localFileAt(e);
  } catch {
    return;
  }
  let a = normalize(e),
    c = s !== void 0 && mn() && env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE !== "self_hosted" ? r : [];
  return mqt(d) || hasReadDenyRule(a, d, s) || !(await isOutsideProjectRoot(a, d, t, n, c)) ? void 0 : d;
}
/**
 * 路径是否在项目根之外
 */
//@ chunk-edh48dyx.js:4810-5039 placement
async function isOutsideProjectRoot(e, t, n, { realDirectory: realDirectory, home: home }, d) {
  if (await isInClaudeConfigDir(t, realDirectory)) return !1;
  if (isRemoteSyncedPath(e, t, d)) return !0;
  let a = n.project?.originalCwd;
  if (a === void 0 || a === "") return !1;
  let c = await realDirectory(home);
  if (c === void 0) return !1;
  return c !== a && !F(c, a) && F(t, a);
}
/**
 * 路径是否命中 read 的 deny/ask 规则
 */
//@ chunk-edh48dyx.js:5039-5296 placement
function hasReadDenyRule(e, t, n) {
  if (n === void 0) return !1;
  if (
    getDenyRuleForTool(n, READ_PATH_PROBE, D(getDenyRules(n), e, t)) ||
    getAskRuleForTool(n, READ_PATH_PROBE, D(getAskRules(n), e, t))
  )
    return !0;
  let s = [walkPermissionCheckPaths(e), walkPermissionCheckPaths(t)];
  if (s.some((r) => r.unresolved)) return !0;
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
function D(e, t, n) {
  return isRemoteSyncedPath(t, n) ? e.filter(N) : e;
}
//@ chunk-edh48dyx.js:5398-5469 placement = _temp5 (1)
function N({ source: source }) {
  return source !== "userSettings" && !REPO_DIR_SETTING_SOURCE_LIST.some((t) => t === source);
}
/**
 * 远程会话下路径是否在同步根
 */
//@ chunk-edh48dyx.js:5469-5645 placement
function isRemoteSyncedPath(e, t, n = []) {
  if (!env.CLAUDE_CODE_REMOTE) return !1;
  let s = mor();
  return (
    [...FIXED_USER_DATA_ROOTS, ...n.map((r) => r.product)].some((r) => F(t, r)) ||
    [...(s === void 0 ? [] : [s]), ...n].some((r) => isSyncedAttachPath(e, t, r))
  );
}
//@ chunk-edh48dyx.js:5645-5686 placement
function F(e, t) {
  return e.startsWith(t + sep);
}

export { attachableFileAt, holdsWholeToolReadRule };
