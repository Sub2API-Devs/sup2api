/**
 * tools/ProjectsTool/projectWrite.ts
 *
 * 2.1.316 新增：Projects 工具写入（本地路径读取、本地上传写入、保存失败分类、容量检查）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (16)
 * attribution: placement 16
 */
import { isAbsolute, resolve, sep } from "path";
import { realpath, open, stat } from "fs/promises";
import { constants } from "fs";
import { projectsPermissionContext } from "./ProjectsTool.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { ProjectsApiError, isSessionJwtAuth } from "../../services/projects/projectMemory.js";
import { getErrnoCode } from "../../utils/errors.js";
import { ProjectsPreconditionError } from "./projectsAuth.js";
import { isDiskless, getOriginalCwd } from "../../bootstrap/state.js";
import { hasProjectHost } from "./inputSchema.js";
import {
  MAX_SENSITIVE_PATH_LENGTH,
  isUnderSandboxPath,
  isInClaudeConfigDir,
  isCredentialPath,
} from "../../utils/permissions/sensitivePaths.js";
import { isNotebookPath } from "../../utils/path.js";
import {
  hasFullFileContent,
  matchesContentDigest,
  stripBomAndCarriageReturn,
  matchesNormalizedContent,
} from "../../utils/remoteFileState.js";
import { isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { isFirstPartyRemoteSession } from "../../utils/userDataRoots.js";
import { env } from "../../utils/env.js";
import { getChatFileRoots } from "../../utils/stageFileRoots.js";
import { layeredReadVerdictForPaths } from "../../utils/permissions/filesystem.js";

//@ chunk-eg496hkq.js:26949-27106 placement
function unicodeNameMatcher(input, callOptions, toolContext) {
  return (foundName, form) => {
    let permissionKind = projectsPermissionContext(input, form, callOptions, toolContext);
    logEvent("tengu_projects_unicode_name_match", {
      method: fromEnum(input.method),
      form: fromEnum(form),
      blocked_by: fromEnumOpt(permissionKind),
    });
    return permissionKind === undefined;
  };
}
//@ chunk-eg496hkq.js:27106-29123 placement
/**
 * 写入会让项目超出大小上限时的拒绝说明。
 */
var BYTES_PER_KNOWLEDGE_TOKEN = 4;
var PROJECT_SIZE_LIMIT_TEXT =
  "Write refused; nothing in the project was changed. This write would put the project over its maximum size. Any doc already at this path still holds its old content; do not delete it to retry, because the retry can be refused too, and the content would then be lost. Do not delete other docs to make room unless the user asks. Tell the user the project is out of room: they can remove docs or files they no longer need, or ask you to write less.";
var PROJECT_CAPACITY_TEXT =
  "Write refused; nothing in the project was changed. The doc at this path is no longer the version in if_version: someone else, another session, or an earlier save of yours has changed it. Call project_read on this path, make your change in the text that it returns, and write again with the version that it returns as if_version, up to two retries in total. If it is still refused, tell the user that the new content was not saved, and offer it to them another way. Do not drop if_version to force the write, and do not delete the doc.";
var PROJECT_VERSION_MISMATCH_TEXT =
  "Write refused; nothing in the project was changed. This session cannot check if_version. Call project_read on this path, make your change in the text that it returns, and write again without if_version.";
var PROJECT_UNCERTAIN_WRITE_TEXT =
  "Write refused; nothing in the project was changed. A doc is already at this path, and this tool cannot find its current text in your context: the doc as shown to you in this conversation, a project_read of it, or your own earlier write of that text. Call project_read on this path, make your change in the text that it returns, and write again. Do not delete the doc to write it afresh: a delete cannot be undone here, and the new doc would hold only what you remember of the old one. If project_read cannot return the doc's whole text inline, do not repeat this write: follow what that result tells you, or tell the user that this doc could not be rewritten from here.";
var PROJECT_DELETE_REFUSED_TEXT =
  "This tool cannot undo a delete. To change a doc, do not delete it first: project_write to its path replaces the content in place.";
//@ chunk-eg496hkq.js:29123-29226 placement
class ProjectSaveError extends Error {
  cause;
  at;
  constructor(cause, at) {
    super("a project save failed");
    this.cause = cause;
    this.at = at;
  }
}
//@ chunk-eg496hkq.js:29226-29651 placement
/**
 * 可重试的网络 errno 集合。
 */
var RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
var RETRYABLE_ERRNO_CODES = new Set([
  "EAI_AGAIN",
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);
var PROJECT_WRITE_RECOVERY_TEXT =
  "Call project_read on this path before any other write or delete: if it returns the new content, stop and tell the user that an earlier copy may need removing from the project in claude.ai; if not, you may retry the write once, and only once in total unless the user asks you to try again.";
//@ chunk-eg496hkq.js:29651-31539 placement
/**
 * 把项目保存失败归类为可能已成功/确定失败等，并生成给模型的说明。
 */
function classifySaveFailure({ cause, at }) {
  let status = cause instanceof ProjectsApiError ? cause.status : undefined;
  let failureKind =
    status === undefined
      ? RETRYABLE_ERRNO_CODES.has(getErrnoCode(cause) ?? "")
        ? "may_pass"
        : "unknown"
      : status === 404 || status === 410
        ? "gone"
        : RETRYABLE_HTTP_STATUSES.has(status)
          ? "may_pass"
          : status === 0 || (status >= 400 && status < 500)
            ? "refused"
            : "unknown";
  let fallbackOffer = "and offer it to them another way.";
  if (failureKind === "gone" || (failureKind === "refused" && at === "no_doc"))
    return " Tell the user that the content was not saved, and offer it to them another way.";
  let maybeSavedNote =
    "Tell the user that the new content may not have been saved, and offer it to them another way.";
  if (at === "no_doc")
    return failureKind === "may_pass"
      ? " The content may not be in the project. Call project_read on this path: if it returns the content, the save went through late; if not, try the same project_write again, up to two retries in total. If it still fails, tell the user that it was not saved, and offer it to them another way."
      : " The content may not be in the project. Tell the user that it may not have been saved, and offer it to them another way.";
  let noDeleteNote =
    "Do not delete it to retry: this tool cannot undo a delete, and if the retry failed too, the doc would be lost.";
  if (failureKind === "refused")
    return ` This call changed nothing: the doc at this path is still there. ${noDeleteNote} Tell the user that this save did not go through, and offer the new content to them another way.`;
  if (at === "doc_beside_new") {
    let oldDocNote = `The old doc at this path was not removed. ${noDeleteNote} The new content may have been saved late as a second doc at this path.`;
    return failureKind === "may_pass"
      ? ` ${oldDocNote} ${PROJECT_WRITE_RECOVERY_TEXT} If that fails too, tell the user that the new content may not have been saved, and offer it to them another way.`
      : ` ${oldDocNote} ${maybeSavedNote}`;
  }
  let staleDocNote =
    "The doc at this path was not removed: it holds its old content, or the new content if the save went through late.";
  return failureKind === "may_pass"
    ? ` ${staleDocNote} ${noDeleteNote} Try the same project_write again, up to two retries in total. If it still fails, tell the user that the new content was not saved, and offer it to them another way.`
    : ` ${staleDocNote} ${noDeleteNote} ${maybeSavedNote}`;
}
//@ chunk-eg496hkq.js:31539-31711 placement
function assertKnowledgeCapacity(knowledgeStats, byteSize) {
  if (knowledgeStats.max_knowledge_size <= 0) return;
  let writeTokens = Math.ceil(byteSize / BYTES_PER_KNOWLEDGE_TOKEN);
  if (knowledgeStats.knowledge_size + writeTokens > knowledgeStats.max_knowledge_size)
    throw new ProjectsPreconditionError(PROJECT_SIZE_LIMIT_TEXT, "write_would_exceed_project_size_limit");
}
//@ chunk-eg496hkq.js:31711-31829 placement
var MAX_LOCAL_UPLOAD_BYTES = 26214400;
var LOCAL_PATH_UNAVAILABLE_TEXT =
  "project_write: local_path is not available in this session; pass the text as content.";
var LOCAL_READ_CHUNK_BYTES = 1048576;
//@ chunk-eg496hkq.js:31829-31885 placement
function localPathAvailability() {
  return !isDiskless() ? "here" : hasProjectHost() ? "elsewhere" : "none";
}
//@ chunk-eg496hkq.js:31885-32468 placement
var LOCAL_PATH_REASONS = [
  "local_path_not_available",
  "local_path_not_absolute",
  "local_path_too_long",
  "local_path_outside_cwd",
  "local_path_no_file",
  "local_path_os_permission_denied",
  "local_path_not_regular_file",
  "local_path_protected_file",
  "local_path_read_needs_permission",
  "local_path_file_not_read_yet",
  "local_path_file_differs_from_read",
  "local_path_notebook",
  "local_path_hard_link",
  "local_path_file_too_large",
  "local_path_container_unreachable",
  "local_path_repo_rules_unread",
  "local_path_other_container_refusal",
  "content_has_nul",
  "write_would_exceed_project_size_limit",
  "project_knowledge_full",
];
//@ chunk-eg496hkq.js:32468-32502 placement
function preconditionError(message, reasonCode) {
  return new ProjectsPreconditionError(message, reasonCode);
}
//@ chunk-eg496hkq.js:32502-32758 placement
function logWriteByLocalPath(outcome, host, details = {}) {
  logEvent("tengu_projects_write_by_local_path", {
    outcome: fromEnum(outcome),
    reason: fromEnumOpt(details.reason),
    failed_step: fromEnumOpt(details.failedStep),
    read_from: fromEnum(host !== undefined ? "tool_container" : isDiskless() ? "none" : "local_disk"),
    replaced: details.replaced,
    saved_bytes: details.savedBytes,
    via_ccr_bridge: isSessionJwtAuth(),
  });
}
//@ chunk-eg496hkq.js:32758-33095 placement
function logWriteFailure(error, signal, host) {
  let cause = error instanceof ProjectSaveError ? error.cause : error;
  if (signal.aborted) logWriteByLocalPath("cancelled", host);
  else if (cause instanceof ProjectsPreconditionError)
    logWriteByLocalPath("refused", host, {
      reason: LOCAL_PATH_REASONS.find((reason) => reason === cause.reasonCode),
    });
  else if (cause instanceof ProjectsApiError && cause.errorCode === "project_knowledge_full")
    logWriteByLocalPath("refused", host, {
      reason: "project_knowledge_full",
    });
  else
    logWriteByLocalPath("failed", host, {
      failedStep: error instanceof ProjectSaveError ? "save" : "other",
    });
}
//@ chunk-eg496hkq.js:33095-35369 placement
/**
 * 校验并读取 project_write 的 local_path（绝对路径、长度、在 cwd 内、大小限制等）。
 */
async function readLocalPathForWrite(localPath, host, toolContext, signal) {
  if (!isAbsolute(localPath) || localPath.length > MAX_SENSITIVE_PATH_LENGTH)
    throw preconditionError(
      `project_write: local_path must be an absolute path of at most ${MAX_SENSITIVE_PATH_LENGTH} characters in this session.`,
      isAbsolute(localPath) ? "local_path_too_long" : "local_path_not_absolute",
    );
  if (host.ruleItCannotApply(toolContext) !== undefined)
    throw preconditionError(LOCAL_PATH_UNAVAILABLE_TEXT, "local_path_not_available");
  if (isNotebookPath(resolve(localPath.trim())))
    throw preconditionError(
      "project_write: a notebook is not uploaded by local_path in this session. Pass its text as content.",
      "local_path_notebook",
    );
  let readResult = await host.read(localPath, signal);
  if (readResult.ok && readResult.text.length <= LOCAL_READ_CHUNK_BYTES) return readResult.text;
  switch (readResult.ok ? "over_the_cap" : readResult.code) {
    case "read_it_first":
      throw preconditionError(
        "project_write: Read the whole file at local_path first (again, if you read, wrote or edited it earlier in this chat), or pass its text as content.",
        "local_path_file_not_read_yet",
      );
    case "not_as_read":
      throw preconditionError(
        "project_write: the file at local_path has changed since you read or wrote it. Read it again, or pass its text as content.",
        "local_path_file_differs_from_read",
      );
    case "over_the_cap":
      throw preconditionError(
        "project_write: the file at local_path is over 1 MiB, too long to upload by path in this session and too long to type as content. Nothing was written. Tell the user that this file is too large to save from here.",
        "local_path_file_too_large",
      );
    case "repo_rules_unread":
      throw preconditionError(
        "project_write: this session's cloud environment could not read the repository's permission rules, so the file at local_path was not read and nothing was written. Retrying won't help: tell the user that .claude/settings.json or .claude/settings.local.json may have to be fixed or removed, or pass the text as content if it is fit to share.",
        "local_path_repo_rules_unread",
      );
    case "container_unreachable":
    case "no_answer":
      throw preconditionError(
        "project_write: this session's cloud environment could not be reached, so the file at local_path was not read and nothing was written. Try again, or pass its text as content.",
        "local_path_container_unreachable",
      );
    case "refused":
      throw preconditionError(
        "project_write: the file at local_path cannot be uploaded by path: it is missing or unreadable, or its location, name or type is not allowed. If its text is fit to share, pass it as content.",
        "local_path_other_container_refusal",
      );
    default:
      throw preconditionError(
        "project_write: the file at local_path cannot be uploaded by path; pass its text as content.",
        "local_path_other_container_refusal",
      );
  }
}
//@ chunk-eg496hkq.js:35369-35433 placement
/**
 * 本地路径是否受保护（配置文件或敏感目录），受保护则拒绝上传。
 */
async function isProtectedLocalPath(localPath, resolvedPath, fromChatRoot) {
  return fromChatRoot
    ? isUnderSandboxPath(resolvedPath) || (await isInClaudeConfigDir(resolvedPath))
    : isCredentialPath(localPath, resolvedPath);
}
//@ chunk-eg496hkq.js:35433-35579 placement
function anyTrackedReadMatches(paths, readFileState, currentText) {
  return paths.some((path) => {
    let readState = readFileState.get(path);
    return (
      hasFullFileContent(readState) &&
      (currentText === undefined ||
        (readState.readBaseline !== undefined
          ? matchesContentDigest(readState.readBaseline, stripBomAndCarriageReturn(currentText))
          : matchesNormalizedContent(readState, currentText)))
    );
  });
}
//@ chunk-eg496hkq.js:35579-39443 placement
async function writeFromLocalUploads(localPath, permissions, readFileState) {
  if (isDiskless()) throw preconditionError(LOCAL_PATH_UNAVAILABLE_TEXT, "local_path_not_available");
  let withSep = (path) => (path.endsWith(sep) ? path : path + sep);
  let cwd = resolve(getOriginalCwd());
  let absolutePath = resolve(cwd, localPath);
  let chatFileRoots =
    readFileState !== undefined &&
    isClaudeAiChatOrigin() &&
    isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
      ? getChatFileRoots()
      : [];
  let found = [cwd, ...chatFileRoots].find(
    (root) => absolutePath === root || absolutePath.startsWith(withSep(root)),
  );
  if (found === undefined)
    throw preconditionError(
      "project_write: local_path must be inside the working directory.",
      "local_path_outside_cwd",
    );
  if (absolutePath.length > MAX_SENSITIVE_PATH_LENGTH)
    throw preconditionError("project_write: no file exists at local_path.", "local_path_too_long");
  let protectedRefusal =
    "project_write: local_path must not name a credential file, a device, or a file that Claude Code keeps for itself (its config and token folders).";
  let assertReadable = (path) => {
    let verdict = layeredReadVerdictForPaths([path], permissions(), {
      refuseAutomounterShapes: true,
    });
    if (
      verdict.layer !== "allow" &&
      !(verdict.layer === "path-mode-ask" && verdict.decision.decisionReason?.type === "workingDir")
    )
      throw preconditionError(
        "project_write: this session may not read the file at local_path without asking (a permission rule or setting, a network path, or links that cannot be followed), so it cannot be uploaded by path.",
        "local_path_read_needs_permission",
      );
  };
  let outsideCwd = found !== cwd && found === chatFileRoots[0];
  if (await isProtectedLocalPath(absolutePath, absolutePath, outsideCwd))
    throw preconditionError(protectedRefusal, "local_path_protected_file");
  assertReadable(absolutePath);
  let realPath;
  let realRoot;
  try {
    [realPath, realRoot] = await Promise.all([
      realpath(absolutePath),
      found !== cwd ? found : realpath(found),
    ]);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ENAMETOOLONG")
      throw preconditionError("project_write: no file exists at local_path.", "local_path_no_file");
    if (errnoCode === "EACCES" || errnoCode === "EPERM")
      throw preconditionError(
        "project_write: local_path is not readable.",
        "local_path_os_permission_denied",
      );
    throw error;
  }
  if (realPath !== realRoot && !realPath.startsWith(withSep(realRoot)))
    throw Error("project_write: local_path resolves outside the working directory.");
  if (await isProtectedLocalPath(absolutePath, realPath, outsideCwd))
    throw preconditionError(protectedRefusal, "local_path_protected_file");
  assertReadable(realPath);
  let readFirstRefusal =
    "project_write: Read the whole file at local_path first, or pass its text as content. Outside the working directory, a file is uploaded by path only when this session has read all of it and it has not changed since.";
  let trackedPaths = [absolutePath, realPath];
  if (found !== cwd && trackedPaths.some(isNotebookPath))
    throw preconditionError(
      "project_write: a notebook outside the working directory is not uploaded by local_path. Pass its text as content.",
      "local_path_notebook",
    );
  if (found !== cwd && !(readFileState && anyTrackedReadMatches(trackedPaths, readFileState)))
    throw preconditionError(readFirstRefusal, "local_path_file_not_read_yet");
  let O_NOFOLLOW = constants.O_NOFOLLOW;
  let O_NONBLOCK = constants.O_NONBLOCK ?? 0;
  let extraOpenFlags = 0;
  let handle;
  try {
    handle = await open(realPath, constants.O_RDONLY | O_NOFOLLOW | extraOpenFlags | O_NONBLOCK);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT")
      throw preconditionError("project_write: no file exists at local_path.", "local_path_no_file");
    if (errnoCode === "EACCES" || errnoCode === "EPERM")
      throw preconditionError(
        "project_write: local_path is not readable.",
        "local_path_os_permission_denied",
      );
    if (errnoCode === "EISDIR" || errnoCode === "ENXIO" || errnoCode === "EOPNOTSUPP")
      throw preconditionError(
        "project_write: local_path must be a regular file.",
        "local_path_not_regular_file",
      );
    if (errnoCode === "ELOOP") throw Error("project_write: local_path was replaced during the upload.");
    throw error;
  }
  try {
    let stats = await handle.stat({
      bigint: true,
    });
    let replacedMessage = "project_write: local_path was replaced during the upload.";
    {
      let fdTarget = await realpath(`/proc/self/fd/${handle.fd}`).catch(() => null);
      if (fdTarget !== null && fdTarget !== realPath)
        throw Error("project_write: local_path was replaced during the upload.");
    }
    let recheckPath;
    let recheckStats;
    try {
      recheckPath = await realpath(absolutePath);
      recheckStats = await stat(recheckPath, {
        bigint: true,
      });
    } catch {
      throw Error("project_write: local_path was replaced during the upload.");
    }
    if (recheckPath !== realPath) throw Error("project_write: local_path was replaced during the upload.");
    if (recheckStats.dev !== stats.dev)
      throw Error("project_write: local_path was replaced during the upload.");
    if (stats.ino !== 0n && recheckStats.ino !== stats.ino)
      throw Error("project_write: local_path was replaced during the upload.");
    if (!stats.isFile())
      throw preconditionError(
        "project_write: local_path must be a regular file.",
        "local_path_not_regular_file",
      );
    if (stats.nlink > 1n)
      throw preconditionError(
        "project_write: the file at local_path has a second name (a hard link), so its name does not say what it is. Pass its text as content instead.",
        "local_path_hard_link",
      );
    if (stats.size > BigInt(MAX_LOCAL_UPLOAD_BYTES))
      throw preconditionError(
        `project_write: file at local_path exceeds the ${MAX_LOCAL_UPLOAD_BYTES}-byte limit.`,
        "local_path_file_too_large",
      );
    let currentText = (await handle.readFile()).toString("utf8");
    if (found === cwd) return currentText;
    if (!(readFileState && anyTrackedReadMatches(trackedPaths, readFileState, currentText)))
      throw preconditionError(readFirstRefusal, "local_path_file_differs_from_read");
    return stripBomAndCarriageReturn(currentText);
  } finally {
    await handle.close();
  }
}
export {
  localPathAvailability,
  unicodeNameMatcher,
  logWriteFailure,
  ProjectSaveError,
  PROJECT_SIZE_LIMIT_TEXT,
  classifySaveFailure,
  PROJECT_CAPACITY_TEXT,
  PROJECT_VERSION_MISMATCH_TEXT,
  PROJECT_WRITE_RECOVERY_TEXT,
  readLocalPathForWrite,
  writeFromLocalUploads,
  preconditionError,
  assertKnowledgeCapacity,
  PROJECT_UNCERTAIN_WRITE_TEXT,
  logWriteByLocalPath,
  PROJECT_DELETE_REFUSED_TEXT,
};
