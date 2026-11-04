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
function taskFileUploadTarget(server, sessionCtx) {
  let isDisklessMode = isDiskless();
  let host = isDisklessMode ? bootHeldServers.peek(sessionCtx)?.host : undefined;
  if (
    !(isDisklessMode ? host !== undefined && isBootHeldServer(host, server) : matchesToolboxServer(server)) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_cosmos", false)
  )
    return;
  return {
    host,
  };
}
//@ chunk-pcnabvxx.js:2129-2659 placement
async function prepareStartTaskFileInputs(toolConfig, taskKind, input, signal, onProgress, sessionCtx) {
  let files = input.files;
  if (!Array.isArray(files) || files.length === 0) return {};
  let words = TASK_TOOL_WORDS[taskKind];
  let uploadResult;
  try {
    let target = taskFileUploadTarget(toolConfig, sessionCtx);
    if (target === undefined) return {};
    let { host } = target;
    uploadResult =
      host === undefined
        ? await deleteStartTaskFiles(files, words, signal, onProgress)
        : await uploadStartTaskFiles(files, words, host, signal, onProgress);
  } catch (error) {
    logError(error);
    uploadResult = {
      error: `The files could not be attached. ${words.words.nothingDone} ${words.withoutFiles}`,
      code: "unexpected",
    };
  }
  if ("error" in uploadResult) {
    if (uploadResult.code !== "canceled" && uploadResult.code !== "upload_canceled")
      logFeatureBad("managed_agents_task_file_upload", uploadResult.code);
    return {
      error: uploadResult.error,
    };
  }
  logFeatureOk("managed_agents_task_file_upload");
  return {
    input: {
      ...input,
      files: uploadResult.files,
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
function startTaskAskInputPreparer(tool, taskKind, input, signal, onProgress, sessionCtx, toolUseId) {
  let files = input.files;
  if (
    toolUseId === "" ||
    !Array.isArray(files) ||
    files.length === 0 ||
    !files.every(
      (file) => isPlainObject(file) && typeof file.path === "string" && file.file_id === undefined,
    ) ||
    tool.config.type !== "http" ||
    !isSameOriginAsCcr(tool.config.url)
  )
    return;
  let target = taskFileUploadTarget(tool, sessionCtx);
  if (target === undefined) return;
  let { host } = target;
  let fileList = files;
  let pathFormKey = jsonStringify(input);
  return {
    prepare: () => {
      let inFlightTaskFiles = findInFlightTaskFiles(sessionCtx, toolUseId, pathFormKey);
      let existingPromise = inFlightTaskFiles && weakMap.get(inFlightTaskFiles);
      if (existingPromise !== undefined) return existingPromise;
      let pendingEntry = {
        toolUseId,
        pathFormKey,
        files: [],
        uploadStartedAt: Date.now(),
        state: "uploading",
        remove: (fileIds) => deleteUploadedTaskFiles(fileIds, host),
      };
      registerPendingTaskFiles(sessionCtx, pendingEntry);
      let uploadPromise = runStartTaskUploads(
        pendingEntry,
        TASK_TOOL_WORDS[taskKind],
        fileList,
        host,
        signal,
        onProgress,
        sessionCtx,
      ).then((uploadResult) => {
        if ("error" in uploadResult) return uploadResult;
        let files = pendingEntry.files;
        return {
          input: {
            ...input,
            files,
          },
          description: `Attaches ${fileList.map((file, index) => `${escapeNonAscii(String(file.path))} as ${escapeNonAscii(files[index]?.name ?? "")} (${sanitizedFileId(files[index]?.file_id)})`).join("; ")}`,
          release: () => discardTaskFiles(sessionCtx, pendingEntry),
        };
      });
      weakMap.set(pendingEntry, uploadPromise);
      return uploadPromise;
    },
  };
}
//@ chunk-pcnabvxx.js:3464-4192 placement
/**
 * 执行任务附件上传并维持 keepalive
 */
async function runStartTaskUploads(pendingEntry, words, files, host, signal, onProgress, sessionCtx) {
  let hooks = {
    mustStartWithinMs: UPLOAD_MUST_START_WITHIN_MS,
    maxTotalBytes: host === undefined ? UPLOAD_BEFORE_ASK_MARK : undefined,
    onUploaded: (uploadedFile) => {
      if (pendingEntry.state === "deleted") pendingEntry.remove([uploadedFile.file_id]);
      else pendingEntry.files.push(uploadedFile);
    },
  };
  let uploadResult;
  let sendsKeepalives = !!env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES;
  if (sendsKeepalives) startSessionActivity("tool_exec", START_TASK_UPLOAD_BEFORE_ASK);
  try {
    uploadResult =
      host === undefined
        ? await deleteStartTaskFiles(files, words, signal, onProgress, hooks)
        : await uploadStartTaskFiles(files, words, host, signal, onProgress, hooks);
  } catch (error) {
    logError(error);
    uploadResult = {
      error: `The files could not be attached. ${words.words.nothingDone} ${words.withoutFiles}`,
      code: "unexpected",
    };
  } finally {
    if (sendsKeepalives) endActivity("tool_exec", START_TASK_UPLOAD_BEFORE_ASK);
  }
  if (!("error" in uploadResult) && pendingEntry.state === "deleted")
    uploadResult = interruptedUploadRefusal("canceled", words);
  if ("error" in uploadResult) {
    await discardTaskFiles(sessionCtx, pendingEntry);
    if (uploadResult.code !== "canceled" && uploadResult.code !== "upload_canceled")
      logFeatureBad("managed_agents_task_file_upload", uploadResult.code);
    return {
      error: uploadResult.error,
    };
  }
  logFeatureOk("managed_agents_task_file_upload");
  pendingEntry.state = "pending";
  return {
    ok: true,
  };
}
//@ chunk-pcnabvxx.js:4192-4294 placement
/**
 * 删除已上传的任务文件（本地或经宿主）。
 */
async function deleteUploadedTaskFiles(fileIds, host) {
  if (host === undefined) {
    await deleteStartTaskFilesHere(fileIds);
    return;
  }
  await Promise.all(fileIds.map((fileId) => host.delete?.(fileId)));
}
//@ chunk-pcnabvxx.js:4294-4346 placement
/**
 * 合法的 file_id 原样返回，否则用 ? 占位。
 */
function sanitizedFileId(fileId) {
  return fileId !== undefined && FILE_ID_RE.test(fileId) ? fileId : "?";
}
//@ chunk-pcnabvxx.js:4346-4515 placement
async function removeStartTaskUploadsFor(toolConfig, sessionCtx, files) {
  let target = taskFileUploadTarget(toolConfig, sessionCtx);
  if (target === undefined || !Array.isArray(files)) return;
  let fileIds = files.flatMap((file) =>
    isPlainObject(file) && typeof file.file_id === "string" ? [file.file_id] : [],
  );
  await deleteUploadedTaskFiles(fileIds, target.host);
}
//@ chunk-pcnabvxx.js:4515-4851 placement
function startTaskSendRefusal(uploadedAtMs, taskKind) {
  let words = TASK_TOOL_WORDS[taskKind];
  if (Date.now() > uploadedAtMs + FILE_EXPIRY_SECONDS * 1000 - UPLOAD_MAX_TOTAL_BYTES)
    return `The files for this task were uploaded about an hour before this approval and have expired or are about to. Call ${taskKind} again to upload them afresh. ${words.words.nothingDone}`;
  let isPolicyMissing = isPolicyLimitsCacheMissing();
  let unavailableReason = filesApiUnavailableReason();
  if (unavailableReason !== undefined)
    return (
      unavailableReason === "egress_blocked" ? egressBlockedRefusal(words) : essentialTrafficRefusal(words)
    ).error;
  return isPolicyMissing ? policyPendingRefusal(words).error : undefined;
}
//@ chunk-pcnabvxx.js:4851-5213 placement
function startTaskFilesPromptNote(toolConfig, taskKind, sessionCtx) {
  let isRemoteMode = getIsRemoteMode(sessionCtx);
  if (
    isRemoteMode === undefined ||
    isDiskless() ||
    !matchesToolboxServer(toolConfig) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_twinkling_cosmos", false)
  )
    return;
  return `In this session, files the user attached to the chat are usually in ${isRemoteMode}. To give one to the task, put its full path in files as an object, such as files: [{"path": "${isRemoteMode}/report.csv"}]. Do that rather than copying the file's text into ${TASK_TOOL_WORDS[taskKind].wordsArg}.`;
}
//@ chunk-pcnabvxx.js:5213-5902 placement
function startTaskInputRefusal(toolConfig, taskKind, input, schema, sessionCtx) {
  let files = input.files;
  if (
    files === undefined ||
    files === null ||
    (Array.isArray(files) && files.length === 0) ||
    taskFileUploadTarget(toolConfig, sessionCtx) === undefined
  )
    return;
  let { words } = TASK_TOOL_WORDS[taskKind];
  let validation = validateFileEntries(files, words);
  let fileRefusal = Array.isArray(validation) ? undefined : validation;
  let { files: files_2, ...rest } = input;
  let inputForSchema = Array.isArray(validation)
    ? {
        ...rest,
        files: validation.map((file, index) => ({
          file_id: `file_${index}`,
          name: `file_${index}`,
        })),
      }
    : rest;
  let schemaViolation = describeSchemaViolation(inputForSchema, schema, {
    ...words,
    ignoreInside: words.arg,
  });
  if (fileRefusal === undefined && schemaViolation === undefined) return;
  if (fileRefusal === undefined) logFeatureSad("managed_agents_task_file_upload", "input_schema");
  else logFeatureBad("managed_agents_task_file_upload", fileRefusal.code);
  if (schemaViolation === undefined) return fileRefusal.error;
  let nothingDoneSuffix = ` ${words.nothingDone}`;
  let fileErrorPrefix =
    fileRefusal === undefined
      ? ""
      : ` ${fileRefusal.error.endsWith(nothingDoneSuffix) ? fileRefusal.error.slice(0, -nothingDoneSuffix.length) : fileRefusal.error}`;
  return `Cannot call ${taskKind} with these arguments: ${schemaViolation.listed}.${fileErrorPrefix}${schemaViolation.takes} ${words.nothingDone}`;
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
async function deleteStartTaskFiles(files, words, sessionCtx, signal, timings = DELETE_UPLOAD_TIMINGS) {
  let validatedPaths = validateFileEntries(files, words.words);
  if (!Array.isArray(validatedPaths)) return validatedPaths;
  let isPolicyMissing = isPolicyLimitsCacheMissing();
  let unavailableReason = filesApiUnavailableReason();
  if (unavailableReason !== undefined)
    return unavailableReason === "egress_blocked"
      ? egressBlockedRefusal(words)
      : essentialTrafficRefusal(words);
  if (isPolicyMissing) return policyPendingRefusal(words);
  if (!getAccessTokenWithCcrFallback()) return signInRequiredRefusal(words);
  for (let filePath of validatedPaths)
    try {
      await validateUploadPath(filePath, sessionCtx);
    } catch (error) {
      logForDebugging(`[task files] rejected path: ${filePath} (${errorMessage(error)})`);
      return fileRefusalFor(filePath, pathRejectionKind(error), "here", sessionCtx, words);
    }
  let uploaded = [];
  let deadlineMs = Date.now() + timings.mustStartWithinMs;
  let totalBudget =
    timings.maxTotalBytes === undefined
      ? undefined
      : {
          remainingBytes: timings.maxTotalBytes,
        };
  for (let filePath of validatedPaths) {
    if (signal.aborted) return interruptedUploadRefusal("canceled", words);
    if (Date.now() > deadlineMs) return uploadsTooSlowRefusal(words);
    let realPath;
    let requiredDigest;
    try {
      ({ realPath, requiredDigest } = await validateUploadPath(filePath, sessionCtx));
    } catch (error) {
      logForDebugging(`[task files] rejected path: ${filePath} (${errorMessage(error)})`);
      return fileRefusalFor(filePath, pathRejectionKind(error), "here", sessionCtx, words);
    }
    let uploadResult = await uploadStartTaskFileAt(realPath, requiredDigest, signal, totalBudget);
    if (!uploadResult.ok) {
      logForDebugging(`[task files] not uploaded: ${filePath} (${uploadResult.code})`);
      return fileRefusalFor(filePath, uploadResult.code, "here", sessionCtx, words);
    }
    let uploadedFile = {
      file_id: uploadResult.file_id,
      name: uploadResult.name,
    };
    uploaded.push(uploadedFile);
    timings.onUploaded?.(uploadedFile);
  }
  if (signal.aborted) return interruptedUploadRefusal("canceled", words);
  if (Date.now() > deadlineMs + MAX_UPLOAD_ELAPSED_MS) return uploadsTooSlowRefusal(words);
  return {
    files: uploaded,
  };
}
//@ chunk-pcnabvxx.js:6837-7983 placement
/**
 * 上传 start_task/update_task 的附件
 */
async function uploadStartTaskFiles(files, words, host, sessionCtx, signal, timings = DELETE_UPLOAD_TIMINGS) {
  let validatedPaths = validateFileEntries(files, words.words);
  if (!Array.isArray(validatedPaths)) return validatedPaths;
  let isPolicyMissing = isPolicyLimitsCacheMissing();
  let unavailableReason = filesApiUnavailableReason();
  if (unavailableReason !== undefined)
    return unavailableReason === "egress_blocked"
      ? egressBlockedRefusal(words)
      : essentialTrafficRefusal(words);
  if (isPolicyMissing) return policyPendingRefusal(words);
  let location = "elsewhere";
  let uploaded = [];
  let deadlineMs = Date.now() + timings.mustStartWithinMs;
  for (let filePath of validatedPaths) {
    if (signal.aborted) return interruptedUploadRefusal("canceled", words);
    if (Date.now() > deadlineMs) return uploadsTooSlowRefusal(words);
    if (host.ruleItCannotApply(sessionCtx) !== undefined)
      return {
        error: `Cannot attach files: this session's limits on reading files cannot be applied in its cloud environment, where the upload would happen. ${words.words.nothingDone} ${words.withoutFiles}`,
        code: "rule_not_applicable",
      };
    if (!isSafeFileName(posix.basename(filePath)))
      return {
        error: `Cannot attach "${filePath}": a file handed to a task from this session's cloud environment needs a plain name, without a backslash, a control character or a character that changes text direction. Copy or rename it and attach that. ${words.words.nothingDone}`,
        code: "name_not_plain",
      };
    let uploadResult = await host.upload(filePath, signal);
    if (!uploadResult.ok) return fileRefusalFor(filePath, uploadResult.code, location, sessionCtx, words);
    if (!FILE_ID_RE.test(uploadResult.file_id) || !isSafeFileName(uploadResult.name))
      return fileRefusalFor(filePath, "bad_answer", location, sessionCtx, words);
    let uploadedFile = {
      file_id: uploadResult.file_id,
      name: uploadResult.name,
    };
    uploaded.push(uploadedFile);
    timings.onUploaded?.(uploadedFile);
  }
  if (signal.aborted) return interruptedUploadRefusal("canceled", words);
  if (Date.now() > deadlineMs + MAX_UPLOAD_ELAPSED_MS) return uploadsTooSlowRefusal(words);
  return {
    files: uploaded,
  };
}
//@ chunk-pcnabvxx.js:7983-8782 placement
/**
 * 为 start_task/update_task 上传附件文件。
 */
async function uploadStartTaskFileAt(realPath, requiredDigest, signal, totalBudget) {
  let relativePath = await uploadDisplayName(realPath);
  if (BIDI_CONTROL_PATTERN.test(relativePath))
    return {
      ok: false,
      code: "name_direction",
    };
  let validatedFileWithin = await readValidatedFileWithin(realPath, MAX_TASK_FILE_BYTES);
  if (!("buf" in validatedFileWithin))
    return {
      ok: false,
      code: validatedFileWithin.refusal,
    };
  if (totalBudget !== undefined) {
    if (validatedFileWithin.buf.length > totalBudget.remainingBytes)
      return {
        ok: false,
        code: "too_large_total",
      };
    totalBudget.remainingBytes -= validatedFileWithin.buf.length;
  }
  if (requiredDigest !== undefined && computeContentHash(validatedFileWithin.buf) !== requiredDigest)
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
  let failureReason;
  try {
    let uploadResult = await uploadFile(
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
    if (uploadResult.success)
      return {
        ok: true,
        file_id: uploadResult.fileId,
        name: relativePath,
      };
    failureReason = uploadResult.reason;
  } catch (error) {
    if (error instanceof StoredLoginHeldBackError)
      return {
        ok: false,
        code: "egress_blocked",
      };
    logForDebugging(`[task files] upload threw: ${errorMessage(error)}`, {
      level: "error",
    });
    failureReason = "network";
  }
  return {
    ok: false,
    code: `upload_${failureReason}`,
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
async function deleteStartTaskFilesHere(fileIds) {
  if (fileIds.length === 0) return;
  let failureKind;
  try {
    failureKind = await withTimeout(deleteUploadedFiles(fileIds), DELETE_TIMEOUT_MS, DELETE_TIMEOUT_MESSAGE);
  } catch (error) {
    if (error instanceof Error && error.message === DELETE_TIMEOUT_MESSAGE) failureKind = "timeout";
    else {
      logError(error);
      failureKind = "unexpected";
    }
  }
  if (failureKind === undefined) logFeatureOk("managed_agents_task_file_cleanup");
  else logFeatureSad("managed_agents_task_file_cleanup", failureKind);
  return failureKind;
}
//@ chunk-pcnabvxx.js:9363-9727 placement
/**
 * 删除已上传的文件
 */
async function deleteUploadedFiles(fileIds) {
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
  let uploadOptions = {
    oauthToken: accessTokenWithCcrFallback,
    isStoredLogin: true,
    sessionId: getSessionId(),
    baseUrl: BASE_API_URL,
  };
  let found = (
    await Promise.all(
      fileIds.map((fileId) =>
        deleteFile(fileId, uploadOptions, {
          timeoutMs: DELETE_TIMEOUT_MS,
        }),
      ),
    )
  ).find((result) => !result.success);
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
function fileRefusalFor(filePath, code, location, sessionCtx, words) {
  let { tool, nothingDone } = words.words;
  if (location === "elsewhere" && code === "too_large")
    return {
      error: `Cannot attach "${filePath}": it is larger than this session's cloud environment can attach. ${nothingDone}`,
      code,
    };
  if (isAttachFailureKind(code))
    return attachFailureMessage(filePath, code, MAX_TASK_FILE_BYTES, nothingDone);
  if (location === "elsewhere" && code === "upload_auth")
    return {
      error: `The sign-in of this session's cloud environment was not accepted while uploading "${filePath}". ${nothingDone} ${words.withoutFiles}`,
      code,
    };
  let uploadReason = code.startsWith("upload_") ? code.slice(7) : undefined;
  if (uploadReason !== undefined && isRetryableUploadCode(uploadReason))
    return uploadFailureRefusal(filePath, uploadReason, words);
  switch (code) {
    case "egress_blocked":
      return egressBlockedRefusal(words);
    case "path_rejected":
      return {
        error:
          location === "here"
            ? fileNotSharedMessage(filePath, sessionCtx, nothingDone)
            : `Cannot attach "${filePath}": only files in this session's working folder (unless that is the home folder) or in its uploads or outputs folder can be attached, by the absolute path of a regular file there. ${nothingDone}`,
        code,
      };
    case "credential_name":
      return {
        error: credentialFileRefusalMessage(
          filePath,
          location === "here"
            ? sessionCtx
            : {
                isRemoteMode: true,
              },
          nothingDone,
        ),
        code,
      };
    case "too_large_total":
      return {
        error: `Cannot attach "${filePath}": with the files before it, the files named to ${tool} add up to more than ${MAX_TASK_FILE_BYTES / 1048576} MiB, the most one call may attach. Attach fewer or smaller files. ${nothingDone}`,
        code,
      };
    case "name_direction":
      return {
        error: `Cannot attach "${filePath}": its name contains a character that changes text direction, so the task could show it under a different name. Rename it, or copy it under a name without that character, and attach that. ${nothingDone}`,
        code,
      };
    case "no_token":
      return location === "here"
        ? signInRequiredRefusal(words)
        : {
            error: `This session's cloud environment has no sign-in to upload files with. ${nothingDone} ${words.withoutFiles}`,
            code,
          };
    case "canceled":
      return interruptedUploadRefusal("canceled", words);
    case "egress_blocked":
      return egressBlockedRefusal(words);
    case "essential_traffic":
      return essentialTrafficRefusal(words);
    case "policy_pending":
      return {
        error: `This session's cloud environment has not yet loaded its organization's policy, so it cannot tell whether files may be uploaded. ${nothingDone} Try again in a moment, or ${words.offerWithoutFiles}.`,
        code,
      };
    case "repo_rules_unread":
      return {
        error: `This session's cloud environment could not read the repository's permission rules, so the files were not attached. ${nothingDone} Retrying won't help: tell the user that .claude/settings.json or .claude/settings.local.json may have to be fixed or removed.`,
        code,
      };
    case "container_too_old":
      return {
        error: `This session's cloud environment runs an older version of Claude Code, which cannot attach files to a task. ${nothingDone} ${words.withoutFiles}`,
        code,
      };
    case "no_answer":
      return {
        ...uploadFailureRefusal(filePath, "network", words),
        code,
      };
    case "no_container":
    case "container_unreachable":
      return {
        error: `This session's cloud environment could not be reached, so the files were not attached. ${nothingDone} Try again, or ${words.offerWithoutFiles}.`,
        code,
      };
    default:
      return {
        error: `The files could not be attached. ${nothingDone} ${words.withoutFiles}`,
        code: "unexpected",
      };
  }
}
//@ chunk-pcnabvxx.js:12528-12569 placement
/**
 * 判断上传错误码是否可重试。
 */
function isRetryableUploadCode(code) {
  return Object.hasOwn(RETRYABLE_UPLOAD_CODES, code);
}
//@ chunk-pcnabvxx.js:12569-12807 placement
/**
 * 上传太慢的拒绝说明
 */
function uploadsTooSlowRefusal(words) {
  return {
    error: `Attaching these files is taking too long: the first ones would expire before the task could copy them. ${words.words.nothingDone} Attach fewer or smaller files, or ${words.offerWithoutFiles}.`,
    code: "uploads_too_slow",
  };
}
//@ chunk-pcnabvxx.js:12807-12991 placement
/**
 * 非必要流量关闭时的拒绝说明
 */
function essentialTrafficRefusal(words) {
  return {
    error: `Uploading files to Anthropic is turned off by CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC. ${words.words.nothingDone} ${words.withoutFiles}`,
    code: "essential_traffic",
  };
}
//@ chunk-pcnabvxx.js:12991-13253 placement
/**
 * 策略未加载时的拒绝说明
 */
function policyPendingRefusal(words) {
  return {
    error: `This organization's policy has not loaded yet, so files cannot be attached right now. ${words.words.nothingDone} Try again in a minute; if it is refused again, tell the user and offer to ${words.offerWithoutTheFiles}.`,
    code: "policy_pending",
  };
}
//@ chunk-pcnabvxx.js:13253-13415 placement
/**
 * 出口被阻断时的拒绝说明
 */
function egressBlockedRefusal(words) {
  return {
    error: `Uploading files to Anthropic is not available in this configuration. ${words.words.nothingDone} ${words.withoutFiles}`,
    code: "egress_blocked",
  };
}
//@ chunk-pcnabvxx.js:13415-13540 placement
/**
 * 附加文件需要 claude.ai 登录的拒绝结果。
 */
function signInRequiredRefusal(words) {
  return {
    error: `Attaching files needs a claude.ai sign-in (run /login). ${words.words.nothingDone}`,
    code: "no_token",
  };
}
//@ chunk-pcnabvxx.js:13540-13635 placement
/**
 * 生成「附件上传被中断」的拒绝结果（附错误码）。
 */
function interruptedUploadRefusal(code, words) {
  return {
    error: `Attaching files was interrupted. ${words.words.nothingDone}`,
    code,
  };
}
//@ chunk-pcnabvxx.js:13635-14379 placement
/**
 * 上传失败的拒绝说明
 */
function uploadFailureRefusal(filePath, reason, words) {
  let code = `upload_${reason}`;
  let { nothingDone } = words.words;
  switch (reason) {
    case "auth":
      return {
        error: `The session's sign-in was not accepted while uploading "${filePath}". The person may need to sign in again, or restart the session. ${nothingDone}`,
        code,
      };
    case "forbidden":
      return {
        error: `This session's sign-in may not upload files, so "${filePath}" was not attached. ${nothingDone} ${words.withoutFiles}`,
        code,
      };
    case "too_large":
      return {
        error: `The Files API refused "${filePath}" as too large. ${nothingDone}`,
        code,
      };
    case "canceled":
      return interruptedUploadRefusal(code, words);
    case "server":
      return {
        error: `The Files API did not accept "${filePath}". ${nothingDone} ${words.withoutThisFile}, or tell the user.`,
        code,
      };
    case "file_read":
    case "network":
      return {
        error: `The upload of "${filePath}" did not complete. ${nothingDone} Try again, or ${words.offerWithoutThisFile}.`,
        code,
      };
  }
}
export {
  START_TASK_FILE_UPLOAD_WORDS,
  START_TASK_FILE_DELETE_WORDS,
  deleteStartTaskFilesHere,
  uploadStartTaskFileAt,
  prepareStartTaskFileInputs,
  removeStartTaskUploadsFor,
  startTaskAskInputPreparer,
  startTaskFilesPromptNote,
  startTaskInputRefusal,
  startTaskSendRefusal,
};
