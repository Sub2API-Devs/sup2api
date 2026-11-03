/**
 * services/taskFiles/startTaskFiles.ts
 *
 * 2.1.316 新增。为 start_task/update_task 上传附件文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pcnabvxx.js (29)
 * attribution: placement 29
 */
import { posix } from "path";
import {
  FILES_API_MAX_FILE_BYTES,
  uploadFile,
  assertFilesApiAvailable,
  deleteFile,
} from "../api/filesApi.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import {
  bootHeldServers,
  isBootHeldServer,
  matchesToolboxServer,
  findInFlightTaskFiles,
  registerPendingTaskFiles,
  discardTaskFiles,
  FILE_ID_RE,
} from "../mcp/agentTaskFiles.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { isSameOriginAsCcr } from "../mcp/ccrMcpUrls.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { escapeNonAscii, filesApiUnavailableReason } from "../fileInputs/attachmentText.js";
import { env } from "../../utils/env.js";
import { startSessionActivity, endActivity } from "../../utils/sessionActivity.js";
import { isPolicyLimitsCacheMissing } from "../policyLimits/policyVerdicts.js";
import {
  getIsRemoteMode,
  pathRejectionKind,
  isSafeFileName,
  BIDI_CONTROL_PATTERN,
  ATTACH_FAILURE_KINDS,
  isAttachFailureKind,
  attachFailureMessage,
  fileNotSharedMessage,
  credentialFileRefusalMessage,
} from "../fileInputs/screenPath.js";
import { validateFileEntries, describeSchemaViolation } from "../mcp/inputSchemaCheck.js";
import { getAccessTokenWithCcrFallback } from "../../utils/teleport/api.js";
import {
  validateUploadPath,
  uploadDisplayName,
  readValidatedFileWithin,
} from "../../utils/claudeInChrome/fileUpload.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../../utils/auth.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { withTimeout } from "../../utils/sleep.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";

//@ chunk-pcnabvxx.js:1079-1983 placement
/**
 * 任务附件上限与各动作文案
 */
var START_TASK_FILE_LIMITS = 20;
var MAX_TASK_FILE_BYTES = FILES_API_MAX_FILE_BYTES;
var FILE_EXPIRY_SECONDS = 3600;
var MUST_START_WITHIN_MS = 2700000;
var MAX_UPLOAD_ELAPSED_MS = 600000;
var TASK_FILE_TERMS = {
  arg: "files",
  feature: "managed_agents_task_file_upload",
  local: "path",
  ref: "file_id",
  refWord: "id",
  maxFiles: START_TASK_FILE_LIMITS,
};
var TASK_TOOL_WORDS = {
  start_task: {
    words: {
      ...TASK_FILE_TERMS,
      tool: "start_task",
      nothingDone: "No task was started.",
    },
    withoutFiles: "Start the task without files.",
    offerWithoutFiles: "start the task without files",
    offerWithoutTheFiles: "start the task without the files",
    withoutThisFile: "Start the task without this file",
    offerWithoutThisFile: "start the task without this file",
    wordsArg: "task_description",
  },
  update_task: {
    words: {
      ...TASK_FILE_TERMS,
      tool: "update_task",
      nothingDone: "Nothing was sent to the task.",
    },
    withoutFiles: "Send the update without files.",
    offerWithoutFiles: "send the update without files",
    offerWithoutTheFiles: "send the update without the files",
    withoutThisFile: "Send the update without this file",
    offerWithoutThisFile: "send the update without this file",
    wordsArg: "update_instructions",
  },
};
//@ chunk-pcnabvxx.js:1983-2129 placement
/**
 * 判断是否可为该 MCP 服务器上传任务文件（工具箱服务器且开关开启），返回宿主信息。
 */
function taskFileUploadTarget(r, e) {
  let n = isDiskless();
  let host = n ? bootHeldServers.peek(e)?.host : undefined;
  if (
    !(n ? host !== undefined && isBootHeldServer(host, r) : matchesToolboxServer(r)) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_cosmos", false)
  )
    return;
  return {
    host,
  };
}
//@ chunk-pcnabvxx.js:2129-2659 placement
async function prepareStartTaskFileInputs(r, e, n, s, o, c) {
  let files = n.files;
  if (!Array.isArray(files) || files.length === 0) return {};
  let h = TASK_TOOL_WORDS[e];
  let u;
  try {
    let k = taskFileUploadTarget(r, c);
    if (k === undefined) return {};
    let { host } = k;
    u =
      host === undefined
        ? await deleteStartTaskFiles(files, h, s, o)
        : await uploadStartTaskFiles(files, h, host, s, o);
  } catch (error) {
    logError(error);
    u = {
      error: `The files could not be attached. ${h.words.nothingDone} ${h.withoutFiles}`,
      code: "unexpected",
    };
  }
  if ("error" in u) {
    if (u.code !== "canceled" && u.code !== "upload_canceled")
      logFeatureBad("managed_agents_task_file_upload", u.code);
    return {
      error: u.error,
    };
  }
  logFeatureOk("managed_agents_task_file_upload");
  return {
    input: {
      ...n,
      files: u.files,
    },
  };
}
//@ chunk-pcnabvxx.js:2659-2735 placement
/**
 * 先上传再询问的时限与标记，以及上传总字节与租约时长。
 */
var UPLOAD_MUST_START_WITHIN_MS = 600000;
var START_TASK_UPLOAD_BEFORE_ASK = "start-task-upload-before-ask";
var UPLOAD_BEFORE_ASK_MARK = MAX_TASK_FILE_BYTES;
var UPLOAD_MAX_TOTAL_BYTES = 300000;
var weakMap = new WeakMap();
//@ chunk-pcnabvxx.js:2735-3464 placement
function startTaskAskInputPreparer(r, e, n, s, o, c, a) {
  let files = n.files;
  if (
    a === "" ||
    !Array.isArray(files) ||
    files.length === 0 ||
    !files.every(
      (file) => isPlainObject(file) && typeof file.path === "string" && file.file_id === undefined,
    ) ||
    r.config.type !== "http" ||
    !isSameOriginAsCcr(r.config.url)
  )
    return;
  let u = taskFileUploadTarget(r, c);
  if (u === undefined) return;
  let { host } = u;
  let T = files;
  let F = jsonStringify(n);
  return {
    prepare: () => {
      let inFlightTaskFiles = findInFlightTaskFiles(c, a, F);
      let w = inFlightTaskFiles && weakMap.get(inFlightTaskFiles);
      if (w !== undefined) return w;
      let S = {
        toolUseId: a,
        pathFormKey: F,
        files: [],
        uploadStartedAt: Date.now(),
        state: "uploading",
        remove: (y) => deleteUploadedTaskFiles(y, host),
      };
      registerPendingTaskFiles(c, S);
      let E = runStartTaskUploads(S, TASK_TOOL_WORDS[e], T, host, s, o, c).then((y) => {
        if ("error" in y) return y;
        let files = S.files;
        return {
          input: {
            ...n,
            files,
          },
          description: `Attaches ${T.map((ee, W) => `${escapeNonAscii(String(ee.path))} as ${escapeNonAscii(files[W]?.name ?? "")} (${sanitizedFileId(files[W]?.file_id)})`).join("; ")}`,
          release: () => discardTaskFiles(c, S),
        };
      });
      weakMap.set(S, E);
      return E;
    },
  };
}
//@ chunk-pcnabvxx.js:3464-4192 placement
/**
 * 执行任务附件上传并维持 keepalive
 */
async function runStartTaskUploads(r, e, n, host, o, c, a) {
  let h = {
    mustStartWithinMs: UPLOAD_MUST_START_WITHIN_MS,
    maxTotalBytes: host === undefined ? UPLOAD_BEFORE_ASK_MARK : undefined,
    onUploaded: (T) => {
      if (r.state === "deleted") r.remove([T.file_id]);
      else r.files.push(T);
    },
  };
  let u;
  let k = !!env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES;
  if (k) startSessionActivity("tool_exec", START_TASK_UPLOAD_BEFORE_ASK);
  try {
    u =
      host === undefined
        ? await deleteStartTaskFiles(n, e, o, c, h)
        : await uploadStartTaskFiles(n, e, host, o, c, h);
  } catch (error) {
    logError(error);
    u = {
      error: `The files could not be attached. ${e.words.nothingDone} ${e.withoutFiles}`,
      code: "unexpected",
    };
  } finally {
    if (k) endActivity("tool_exec", START_TASK_UPLOAD_BEFORE_ASK);
  }
  if (!("error" in u) && r.state === "deleted") u = interruptedUploadRefusal("canceled", e);
  if ("error" in u) {
    await discardTaskFiles(a, r);
    if (u.code !== "canceled" && u.code !== "upload_canceled")
      logFeatureBad("managed_agents_task_file_upload", u.code);
    return {
      error: u.error,
    };
  }
  logFeatureOk("managed_agents_task_file_upload");
  r.state = "pending";
  return {
    ok: true,
  };
}
//@ chunk-pcnabvxx.js:4192-4294 placement
/**
 * 删除已上传的任务文件（本地或经宿主）。
 */
async function deleteUploadedTaskFiles(r, host) {
  if (host === undefined) {
    await deleteStartTaskFilesHere(r);
    return;
  }
  await Promise.all(r.map((n) => host.delete?.(n)));
}
//@ chunk-pcnabvxx.js:4294-4346 placement
/**
 * 合法的 file_id 原样返回，否则用 ? 占位。
 */
function sanitizedFileId(fileId) {
  return fileId !== undefined && FILE_ID_RE.test(fileId) ? fileId : "?";
}
//@ chunk-pcnabvxx.js:4346-4515 placement
async function removeStartTaskUploadsFor(r, e, n) {
  let s = taskFileUploadTarget(r, e);
  if (s === undefined || !Array.isArray(n)) return;
  let flattened = n.flatMap((c) => (isPlainObject(c) && typeof c.file_id === "string" ? [c.file_id] : []));
  await deleteUploadedTaskFiles(flattened, s.host);
}
//@ chunk-pcnabvxx.js:4515-4851 placement
function startTaskSendRefusal(r, e) {
  let n = TASK_TOOL_WORDS[e];
  if (Date.now() > r + FILE_EXPIRY_SECONDS * 1000 - UPLOAD_MAX_TOTAL_BYTES)
    return `The files for this task were uploaded about an hour before this approval and have expired or are about to. Call ${e} again to upload them afresh. ${n.words.nothingDone}`;
  let s = isPolicyLimitsCacheMissing();
  let o = filesApiUnavailableReason();
  if (o !== undefined)
    return (o === "egress_blocked" ? egressBlockedRefusal(n) : essentialTrafficRefusal(n)).error;
  return s ? policyPendingRefusal(n).error : undefined;
}
//@ chunk-pcnabvxx.js:4851-5213 placement
function startTaskFilesPromptNote(r, e, n) {
  let isRemoteMode = getIsRemoteMode(n);
  if (
    isRemoteMode === undefined ||
    isDiskless() ||
    !matchesToolboxServer(r) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_cosmos", false)
  )
    return;
  return `In this session, files the user attached to the chat are usually in ${isRemoteMode}. To give one to the task, put its full path in files as an object, such as files: [{"path": "${isRemoteMode}/report.csv"}]. Do that rather than copying the file's text into ${TASK_TOOL_WORDS[e].wordsArg}.`;
}
//@ chunk-pcnabvxx.js:5213-5902 placement
function startTaskInputRefusal(r, e, n, s, o) {
  let files = n.files;
  if (
    files === undefined ||
    files === null ||
    (Array.isArray(files) && files.length === 0) ||
    taskFileUploadTarget(r, o) === undefined
  )
    return;
  let { words } = TASK_TOOL_WORDS[e];
  let h = validateFileEntries(files, words);
  let u = Array.isArray(h) ? undefined : h;
  let { files: files_2, ...T } = n;
  let F = Array.isArray(h)
    ? {
        ...T,
        files: h.map((E, y) => ({
          file_id: `file_${y}`,
          name: `file_${y}`,
        })),
      }
    : T;
  let p = describeSchemaViolation(F, s, {
    ...words,
    ignoreInside: words.arg,
  });
  if (u === undefined && p === undefined) return;
  if (u === undefined) logFeatureSad("managed_agents_task_file_upload", "input_schema");
  else logFeatureBad("managed_agents_task_file_upload", u.code);
  if (p === undefined) return u.error;
  let w = ` ${words.nothingDone}`;
  let S = u === undefined ? "" : ` ${u.error.endsWith(w) ? u.error.slice(0, -w.length) : u.error}`;
  return `Cannot call ${e} with these arguments: ${p.listed}.${S}${p.takes} ${words.nothingDone}`;
}
//@ chunk-pcnabvxx.js:5902-5931 placement
/**
 * 删除上传文件时的时间参数（必须在多久内开始）。
 */
var DELETE_UPLOAD_TIMINGS = {
  mustStartWithinMs: MUST_START_WITHIN_MS,
};
//@ chunk-pcnabvxx.js:5931-6837 placement
/**
 * 删除 start_task 上传的文件
 */
async function deleteStartTaskFiles(r, e, n, signal, o = DELETE_UPLOAD_TIMINGS) {
  let c = validateFileEntries(r, e.words);
  if (!Array.isArray(c)) return c;
  let a = isPolicyLimitsCacheMissing();
  let h = filesApiUnavailableReason();
  if (h !== undefined) return h === "egress_blocked" ? egressBlockedRefusal(e) : essentialTrafficRefusal(e);
  if (a) return policyPendingRefusal(e);
  if (!getAccessTokenWithCcrFallback()) return signInRequiredRefusal(e);
  for (let F of c)
    try {
      await validateUploadPath(F, n);
    } catch (error) {
      logForDebugging(`[task files] rejected path: ${F} (${errorMessage(error)})`);
      return fileRefusalFor(F, pathRejectionKind(error), "here", n, e);
    }
  let u = [];
  let k = Date.now() + o.mustStartWithinMs;
  let T =
    o.maxTotalBytes === undefined
      ? undefined
      : {
          remainingBytes: o.maxTotalBytes,
        };
  for (let F of c) {
    if (signal.aborted) return interruptedUploadRefusal("canceled", e);
    if (Date.now() > k) return uploadsTooSlowRefusal(e);
    let p;
    let w;
    try {
      ({ realPath: p, requiredDigest: w } = await validateUploadPath(F, n));
    } catch (error) {
      logForDebugging(`[task files] rejected path: ${F} (${errorMessage(error)})`);
      return fileRefusalFor(F, pathRejectionKind(error), "here", n, e);
    }
    let S = await uploadStartTaskFileAt(p, w, signal, T);
    if (!S.ok) {
      logForDebugging(`[task files] not uploaded: ${F} (${S.code})`);
      return fileRefusalFor(F, S.code, "here", n, e);
    }
    let E = {
      file_id: S.file_id,
      name: S.name,
    };
    u.push(E);
    o.onUploaded?.(E);
  }
  if (signal.aborted) return interruptedUploadRefusal("canceled", e);
  if (Date.now() > k + MAX_UPLOAD_ELAPSED_MS) return uploadsTooSlowRefusal(e);
  return {
    files: u,
  };
}
//@ chunk-pcnabvxx.js:6837-7983 placement
/**
 * 上传 start_task/update_task 的附件
 */
async function uploadStartTaskFiles(r, e, n, s, o, c = DELETE_UPLOAD_TIMINGS) {
  let a = validateFileEntries(r, e.words);
  if (!Array.isArray(a)) return a;
  let h = isPolicyLimitsCacheMissing();
  let u = filesApiUnavailableReason();
  if (u !== undefined) return u === "egress_blocked" ? egressBlockedRefusal(e) : essentialTrafficRefusal(e);
  if (h) return policyPendingRefusal(e);
  let k = "elsewhere";
  let T = [];
  let F = Date.now() + c.mustStartWithinMs;
  for (let p of a) {
    if (o.aborted) return interruptedUploadRefusal("canceled", e);
    if (Date.now() > F) return uploadsTooSlowRefusal(e);
    if (n.ruleItCannotApply(s) !== undefined)
      return {
        error: `Cannot attach files: this session's limits on reading files cannot be applied in its cloud environment, where the upload would happen. ${e.words.nothingDone} ${e.withoutFiles}`,
        code: "rule_not_applicable",
      };
    if (!isSafeFileName(posix.basename(p)))
      return {
        error: `Cannot attach "${p}": a file handed to a task from this session's cloud environment needs a plain name, without a backslash, a control character or a character that changes text direction. Copy or rename it and attach that. ${e.words.nothingDone}`,
        code: "name_not_plain",
      };
    let w = await n.upload(p, o);
    if (!w.ok) return fileRefusalFor(p, w.code, k, s, e);
    if (!FILE_ID_RE.test(w.file_id) || !isSafeFileName(w.name))
      return fileRefusalFor(p, "bad_answer", k, s, e);
    let S = {
      file_id: w.file_id,
      name: w.name,
    };
    T.push(S);
    c.onUploaded?.(S);
  }
  if (o.aborted) return interruptedUploadRefusal("canceled", e);
  if (Date.now() > F + MAX_UPLOAD_ELAPSED_MS) return uploadsTooSlowRefusal(e);
  return {
    files: T,
  };
}
//@ chunk-pcnabvxx.js:7983-8782 placement
/**
 * 为 start_task/update_task 上传附件文件。
 */
async function uploadStartTaskFileAt(r, e, signal, s) {
  let relativePath = await uploadDisplayName(r);
  if (BIDI_CONTROL_PATTERN.test(relativePath))
    return {
      ok: false,
      code: "name_direction",
    };
  let validatedFileWithin = await readValidatedFileWithin(r, MAX_TASK_FILE_BYTES);
  if (!("buf" in validatedFileWithin))
    return {
      ok: false,
      code: validatedFileWithin.refusal,
    };
  if (s !== undefined) {
    if (validatedFileWithin.buf.length > s.remainingBytes)
      return {
        ok: false,
        code: "too_large_total",
      };
    s.remainingBytes -= validatedFileWithin.buf.length;
  }
  if (e !== undefined && computeContentHash(validatedFileWithin.buf) !== e)
    return {
      ok: false,
      code: "path_rejected",
    };
  await checkAndRefreshOAuthTokenIfNeeded();
  let accessTokenWithCcrFallback = getAccessTokenWithCcrFallback();
  if (!accessTokenWithCcrFallback)
    return {
      ok: false,
      code: "no_token",
    };
  let h;
  try {
    let u = await uploadFile(
      validatedFileWithin.buf,
      relativePath,
      {
        oauthToken: accessTokenWithCcrFallback,
        isStoredLogin: true,
        sessionId: getSessionId(),
        baseUrl: getOauthConfig().BASE_API_URL,
      },
      {
        signal,
        expiresInSeconds: FILE_EXPIRY_SECONDS,
        timeoutMs: MAX_UPLOAD_ELAPSED_MS,
        retryAfterTimeout: false,
      },
    );
    if (u.success)
      return {
        ok: true,
        file_id: u.fileId,
        name: relativePath,
      };
    h = u.reason;
  } catch (error) {
    if (error instanceof StoredLoginHeldBackError)
      return {
        ok: false,
        code: "egress_blocked",
      };
    logForDebugging(`[task files] upload threw: ${errorMessage(error)}`, {
      level: "error",
    });
    h = "network";
  }
  return {
    ok: false,
    code: `upload_${h}`,
  };
}
//@ chunk-pcnabvxx.js:8782-9097 placement
/**
 * 上传/删除错误码分类
 */
var RETRYABLE_UPLOAD_CODES = {
  file_read: true,
  too_large: true,
  auth: true,
  forbidden: true,
  canceled: true,
  server: true,
  network: true,
};
var DELETE_RETRYABLE_CODES = {
  auth: true,
  forbidden: true,
  not_found: true,
  server: true,
  network: true,
};
var START_TASK_FILE_DELETE_WORDS = [
  "egress_blocked",
  "essential_traffic",
  "no_token",
  "timeout",
  "unexpected",
  ...Object.keys(DELETE_RETRYABLE_CODES).map((key) => `delete_${key}`),
];
var DELETE_TIMEOUT_MS = 5000;
var DELETE_TIMEOUT_MESSAGE = "start_task upload cleanup timed out";
//@ chunk-pcnabvxx.js:9097-9363 placement
async function deleteStartTaskFilesHere(r) {
  if (r.length === 0) return;
  let e;
  try {
    e = await withTimeout(deleteUploadedFiles(r), DELETE_TIMEOUT_MS, DELETE_TIMEOUT_MESSAGE);
  } catch (error) {
    if (error instanceof Error && error.message === DELETE_TIMEOUT_MESSAGE) e = "timeout";
    else {
      logError(error);
      e = "unexpected";
    }
  }
  if (e === undefined) logFeatureOk("managed_agents_task_file_cleanup");
  else logFeatureSad("managed_agents_task_file_cleanup", e);
  return e;
}
//@ chunk-pcnabvxx.js:9363-9727 placement
/**
 * 删除已上传的文件
 */
async function deleteUploadedFiles(r) {
  let BASE_API_URL = getOauthConfig().BASE_API_URL;
  try {
    assertFilesApiAvailable(BASE_API_URL);
  } catch {
    return "egress_blocked";
  }
  if (isEssentialTrafficOnly()) return "essential_traffic";
  await checkAndRefreshOAuthTokenIfNeeded();
  let accessTokenWithCcrFallback = getAccessTokenWithCcrFallback();
  if (!accessTokenWithCcrFallback) return "no_token";
  let s = {
    oauthToken: accessTokenWithCcrFallback,
    isStoredLogin: true,
    sessionId: getSessionId(),
    baseUrl: BASE_API_URL,
  };
  let found = (
    await Promise.all(
      r.map((a) =>
        deleteFile(a, s, {
          timeoutMs: DELETE_TIMEOUT_MS,
        }),
      ),
    )
  ).find((a) => !a.success);
  return found !== undefined && !found.success ? `delete_${found.reason}` : undefined;
}
//@ chunk-pcnabvxx.js:9727-9861 placement
var START_TASK_FILE_UPLOAD_WORDS = [
  ...Object.keys(ATTACH_FAILURE_KINDS),
  ...Object.keys(RETRYABLE_UPLOAD_CODES).map((key) => `upload_${key}`),
  "path_rejected",
  "no_token",
  "name_direction",
  "too_large_total",
];
//@ chunk-pcnabvxx.js:9861-12528 placement
/**
 * 单个文件不能附加的说明
 */
function fileRefusalFor(r, e, n, s, o) {
  let { tool, nothingDone } = o.words;
  if (n === "elsewhere" && e === "too_large")
    return {
      error: `Cannot attach "${r}": it is larger than this session's cloud environment can attach. ${nothingDone}`,
      code: e,
    };
  if (isAttachFailureKind(e)) return attachFailureMessage(r, e, MAX_TASK_FILE_BYTES, nothingDone);
  if (n === "elsewhere" && e === "upload_auth")
    return {
      error: `The sign-in of this session's cloud environment was not accepted while uploading "${r}". ${nothingDone} ${o.withoutFiles}`,
      code: e,
    };
  let h = e.startsWith("upload_") ? e.slice(7) : undefined;
  if (h !== undefined && isRetryableUploadCode(h)) return uploadFailureRefusal(r, h, o);
  switch (e) {
    case "egress_blocked":
      return egressBlockedRefusal(o);
    case "path_rejected":
      return {
        error:
          n === "here"
            ? fileNotSharedMessage(r, s, nothingDone)
            : `Cannot attach "${r}": only files in this session's working folder (unless that is the home folder) or in its uploads or outputs folder can be attached, by the absolute path of a regular file there. ${nothingDone}`,
        code: e,
      };
    case "credential_name":
      return {
        error: credentialFileRefusalMessage(
          r,
          n === "here"
            ? s
            : {
                isRemoteMode: true,
              },
          nothingDone,
        ),
        code: e,
      };
    case "too_large_total":
      return {
        error: `Cannot attach "${r}": with the files before it, the files named to ${tool} add up to more than ${MAX_TASK_FILE_BYTES / 1048576} MiB, the most one call may attach. Attach fewer or smaller files. ${nothingDone}`,
        code: e,
      };
    case "name_direction":
      return {
        error: `Cannot attach "${r}": its name contains a character that changes text direction, so the task could show it under a different name. Rename it, or copy it under a name without that character, and attach that. ${nothingDone}`,
        code: e,
      };
    case "no_token":
      return n === "here"
        ? signInRequiredRefusal(o)
        : {
            error: `This session's cloud environment has no sign-in to upload files with. ${nothingDone} ${o.withoutFiles}`,
            code: e,
          };
    case "canceled":
      return interruptedUploadRefusal("canceled", o);
    case "egress_blocked":
      return egressBlockedRefusal(o);
    case "essential_traffic":
      return essentialTrafficRefusal(o);
    case "policy_pending":
      return {
        error: `This session's cloud environment has not yet loaded its organization's policy, so it cannot tell whether files may be uploaded. ${nothingDone} Try again in a moment, or ${o.offerWithoutFiles}.`,
        code: e,
      };
    case "repo_rules_unread":
      return {
        error: `This session's cloud environment could not read the repository's permission rules, so the files were not attached. ${nothingDone} Retrying won't help: tell the user that .claude/settings.json or .claude/settings.local.json may have to be fixed or removed.`,
        code: e,
      };
    case "container_too_old":
      return {
        error: `This session's cloud environment runs an older version of Claude Code, which cannot attach files to a task. ${nothingDone} ${o.withoutFiles}`,
        code: e,
      };
    case "no_answer":
      return {
        ...uploadFailureRefusal(r, "network", o),
        code: e,
      };
    case "no_container":
    case "container_unreachable":
      return {
        error: `This session's cloud environment could not be reached, so the files were not attached. ${nothingDone} Try again, or ${o.offerWithoutFiles}.`,
        code: e,
      };
    default:
      return {
        error: `The files could not be attached. ${nothingDone} ${o.withoutFiles}`,
        code: "unexpected",
      };
  }
}
//@ chunk-pcnabvxx.js:12528-12569 placement
/**
 * 判断上传错误码是否可重试。
 */
function isRetryableUploadCode(r) {
  return Object.hasOwn(RETRYABLE_UPLOAD_CODES, r);
}
//@ chunk-pcnabvxx.js:12569-12807 placement
/**
 * 上传太慢的拒绝说明
 */
function uploadsTooSlowRefusal(r) {
  return {
    error: `Attaching these files is taking too long: the first ones would expire before the task could copy them. ${r.words.nothingDone} Attach fewer or smaller files, or ${r.offerWithoutFiles}.`,
    code: "uploads_too_slow",
  };
}
//@ chunk-pcnabvxx.js:12807-12991 placement
/**
 * 非必要流量关闭时的拒绝说明
 */
function essentialTrafficRefusal(r) {
  return {
    error: `Uploading files to Anthropic is turned off by CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC. ${r.words.nothingDone} ${r.withoutFiles}`,
    code: "essential_traffic",
  };
}
//@ chunk-pcnabvxx.js:12991-13253 placement
/**
 * 策略未加载时的拒绝说明
 */
function policyPendingRefusal(r) {
  return {
    error: `This organization's policy has not loaded yet, so files cannot be attached right now. ${r.words.nothingDone} Try again in a minute; if it is refused again, tell the user and offer to ${r.offerWithoutTheFiles}.`,
    code: "policy_pending",
  };
}
//@ chunk-pcnabvxx.js:13253-13415 placement
/**
 * 出口被阻断时的拒绝说明
 */
function egressBlockedRefusal(r) {
  return {
    error: `Uploading files to Anthropic is not available in this configuration. ${r.words.nothingDone} ${r.withoutFiles}`,
    code: "egress_blocked",
  };
}
//@ chunk-pcnabvxx.js:13415-13540 placement
/**
 * 附加文件需要 claude.ai 登录的拒绝结果。
 */
function signInRequiredRefusal(r) {
  return {
    error: `Attaching files needs a claude.ai sign-in (run /login). ${r.words.nothingDone}`,
    code: "no_token",
  };
}
//@ chunk-pcnabvxx.js:13540-13635 placement
/**
 * 生成「附件上传被中断」的拒绝结果（附错误码）。
 */
function interruptedUploadRefusal(code, e) {
  return {
    error: `Attaching files was interrupted. ${e.words.nothingDone}`,
    code,
  };
}
//@ chunk-pcnabvxx.js:13635-14379 placement
/**
 * 上传失败的拒绝说明
 */
function uploadFailureRefusal(r, e, n) {
  let s = `upload_${e}`;
  let { nothingDone } = n.words;
  switch (e) {
    case "auth":
      return {
        error: `The session's sign-in was not accepted while uploading "${r}". The person may need to sign in again, or restart the session. ${nothingDone}`,
        code: s,
      };
    case "forbidden":
      return {
        error: `This session's sign-in may not upload files, so "${r}" was not attached. ${nothingDone} ${n.withoutFiles}`,
        code: s,
      };
    case "too_large":
      return {
        error: `The Files API refused "${r}" as too large. ${nothingDone}`,
        code: s,
      };
    case "canceled":
      return interruptedUploadRefusal(s, n);
    case "server":
      return {
        error: `The Files API did not accept "${r}". ${nothingDone} ${n.withoutThisFile}, or tell the user.`,
        code: s,
      };
    case "file_read":
    case "network":
      return {
        error: `The upload of "${r}" did not complete. ${nothingDone} Try again, or ${n.offerWithoutThisFile}.`,
        code: s,
      };
  }
}
export {
  START_TASK_FILE_UPLOAD_WORDS,
  START_TASK_FILE_DELETE_WORDS,
  deleteStartTaskFilesHere,
  uploadStartTaskFileAt,
};
