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
import { j$e, mqt, isInClaudeConfigDir, Ope } from "../../utils/permissions/sensitivePaths.js";
import { isNotebookPath } from "../../utils/path.js";
import { Gie, aFe, __, Bir } from "../../utils/remoteFileState.js";
import { isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { S1 } from "../../utils/userDataRoots.js";
import { env } from "../../utils/env.js";
import { getChatFileRoots } from "../../utils/stageFileRoots.js";
import { layeredReadVerdictForPaths } from "../../utils/permissions/filesystem.js";

//@ chunk-eg496hkq.js:26949-27106 placement
function unicodeNameMatcher(e, n, r) {
  return (s, l) => {
    let h = projectsPermissionContext(e, l, n, r);
    return (
      logEvent("tengu_projects_unicode_name_match", {
        method: fromEnum(e.method),
        form: fromEnum(l),
        blocked_by: fromEnumOpt(h),
      }),
      h === void 0
    );
  };
}
//@ chunk-eg496hkq.js:27106-29123 placement
var BYTES_PER_KNOWLEDGE_TOKEN = 4,
  nt =
    "Write refused; nothing in the project was changed. This write would put the project over its maximum size. Any doc already at this path still holds its old content; do not delete it to retry, because the retry can be refused too, and the content would then be lost. Do not delete other docs to make room unless the user asks. Tell the user the project is out of room: they can remove docs or files they no longer need, or ask you to write less.",
  Ft =
    "Write refused; nothing in the project was changed. The doc at this path is no longer the version in if_version: someone else, another session, or an earlier save of yours has changed it. Call project_read on this path, make your change in the text that it returns, and write again with the version that it returns as if_version, up to two retries in total. If it is still refused, tell the user that the new content was not saved, and offer it to them another way. Do not drop if_version to force the write, and do not delete the doc.",
  ze =
    "Write refused; nothing in the project was changed. This session cannot check if_version. Call project_read on this path, make your change in the text that it returns, and write again without if_version.",
  Lt =
    "Write refused; nothing in the project was changed. A doc is already at this path, and this tool cannot find its current text in your context: the doc as shown to you in this conversation, a project_read of it, or your own earlier write of that text. Call project_read on this path, make your change in the text that it returns, and write again. Do not delete the doc to write it afresh: a delete cannot be undone here, and the new doc would hold only what you remember of the old one. If project_read cannot return the doc's whole text inline, do not repeat this write: follow what that result tells you, or tell the user that this doc could not be rewritten from here.",
  Bt =
    "This tool cannot undo a delete. To change a doc, do not delete it first: project_write to its path replaces the content in place.";
//@ chunk-eg496hkq.js:29123-29226 placement
class ProjectSaveError extends Error {
  cause;
  at;
  constructor(e, n) {
    super("a project save failed");
    this.cause = e;
    this.at = n;
  }
}
//@ chunk-eg496hkq.js:29226-29651 placement
var RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]),
  Ut = new Set(["EAI_AGAIN", "ECONNABORTED", "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT"]),
  it =
    "Call project_read on this path before any other write or delete: if it returns the new content, stop and tell the user that an earlier copy may need removing from the project in claude.ai; if not, you may retry the write once, and only once in total unless the user asks you to try again.";
/**
 * 把项目保存失败归类为可能已成功/确定失败等，并生成给模型的说明。
 */
//@ chunk-eg496hkq.js:29651-31539 placement
function classifySaveFailure({ cause: cause, at: at }) {
  let r = cause instanceof ProjectsApiError ? cause.status : void 0,
    s =
      r === void 0
        ? Ut.has(getErrnoCode(cause) ?? "")
          ? "may_pass"
          : "unknown"
        : r === 404 || r === 410
          ? "gone"
          : RETRYABLE_HTTP_STATUSES.has(r)
            ? "may_pass"
            : r === 0 || (r >= 400 && r < 500)
              ? "refused"
              : "unknown",
    l = "and offer it to them another way.";
  if (s === "gone" || (s === "refused" && at === "no_doc"))
    return " Tell the user that the content was not saved, and offer it to them another way.";
  let h = "Tell the user that the new content may not have been saved, and offer it to them another way.";
  if (at === "no_doc")
    return s === "may_pass"
      ? " The content may not be in the project. Call project_read on this path: if it returns the content, the save went through late; if not, try the same project_write again, up to two retries in total. If it still fails, tell the user that it was not saved, and offer it to them another way."
      : " The content may not be in the project. Tell the user that it may not have been saved, and offer it to them another way.";
  let w =
    "Do not delete it to retry: this tool cannot undo a delete, and if the retry failed too, the doc would be lost.";
  if (s === "refused")
    return ` This call changed nothing: the doc at this path is still there. ${w} Tell the user that this save did not go through, and offer the new content to them another way.`;
  if (at === "doc_beside_new") {
    let y = `The old doc at this path was not removed. ${w} The new content may have been saved late as a second doc at this path.`;
    return s === "may_pass"
      ? ` ${y} ${it} If that fails too, tell the user that the new content may not have been saved, and offer it to them another way.`
      : ` ${y} ${h}`;
  }
  let m =
    "The doc at this path was not removed: it holds its old content, or the new content if the save went through late.";
  return s === "may_pass"
    ? ` ${m} ${w} Try the same project_write again, up to two retries in total. If it still fails, tell the user that the new content was not saved, and offer it to them another way.`
    : ` ${m} ${w} ${h}`;
}
//@ chunk-eg496hkq.js:31539-31711 placement
function assertKnowledgeCapacity(e, n) {
  if (e.max_knowledge_size <= 0) return;
  let ceil = Math.ceil(n / BYTES_PER_KNOWLEDGE_TOKEN);
  if (e.knowledge_size + ceil > e.max_knowledge_size)
    throw new ProjectsPreconditionError(nt, "write_would_exceed_project_size_limit");
}
//@ chunk-eg496hkq.js:31711-31829 placement
var MAX_LOCAL_UPLOAD_BYTES = 26214400,
  LOCAL_PATH_UNAVAILABLE_TEXT =
    "project_write: local_path is not available in this session; pass the text as content.",
  LOCAL_READ_CHUNK_BYTES = 1048576;
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
function preconditionError(e, n) {
  return new ProjectsPreconditionError(e, n);
}
//@ chunk-eg496hkq.js:32502-32758 placement
function logWriteByLocalPath(e, n, r = {}) {
  logEvent("tengu_projects_write_by_local_path", {
    outcome: fromEnum(e),
    reason: fromEnumOpt(r.reason),
    failed_step: fromEnumOpt(r.failedStep),
    read_from: fromEnum(n !== void 0 ? "tool_container" : isDiskless() ? "none" : "local_disk"),
    replaced: r.replaced,
    saved_bytes: r.savedBytes,
    via_ccr_bridge: isSessionJwtAuth(),
  });
}
//@ chunk-eg496hkq.js:32758-33095 placement
function logWriteFailure(e, n, r) {
  let s = e instanceof ProjectSaveError ? e.cause : e;
  if (n.aborted) logWriteByLocalPath("cancelled", r);
  else if (s instanceof ProjectsPreconditionError)
    logWriteByLocalPath("refused", r, { reason: LOCAL_PATH_REASONS.find((l) => l === s.reasonCode) });
  else if (s instanceof ProjectsApiError && s.errorCode === "project_knowledge_full")
    logWriteByLocalPath("refused", r, { reason: "project_knowledge_full" });
  else logWriteByLocalPath("failed", r, { failedStep: e instanceof ProjectSaveError ? "save" : "other" });
}
/**
 * 校验并读取 project_write 的 local_path（绝对路径、长度、在 cwd 内、大小限制等）。
 */
//@ chunk-eg496hkq.js:33095-35369 placement
async function readLocalPathForWrite(e, n, r, s) {
  if (!isAbsolute(e) || e.length > j$e)
    throw preconditionError(
      `project_write: local_path must be an absolute path of at most ${j$e} characters in this session.`,
      isAbsolute(e) ? "local_path_too_long" : "local_path_not_absolute",
    );
  if (n.ruleItCannotApply(r) !== void 0)
    throw preconditionError(LOCAL_PATH_UNAVAILABLE_TEXT, "local_path_not_available");
  if (isNotebookPath(resolve(e.trim())))
    throw preconditionError(
      "project_write: a notebook is not uploaded by local_path in this session. Pass its text as content.",
      "local_path_notebook",
    );
  let read = await n.read(e, s);
  if (read.ok && read.text.length <= LOCAL_READ_CHUNK_BYTES) return read.text;
  switch (read.ok ? "over_the_cap" : read.code) {
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
async function $e(e, n, r) {
  return r ? mqt(n) || (await isInClaudeConfigDir(n)) : Ope(e, n);
}
//@ chunk-eg496hkq.js:35433-35579 placement
function anyTrackedReadMatches(e, n, r) {
  return e.some((s) => {
    let l = n.get(s);
    return Gie(l) && (r === void 0 || (l.readBaseline !== void 0 ? aFe(l.readBaseline, __(r)) : Bir(l, r)));
  });
}
//@ chunk-eg496hkq.js:35579-39443 placement
async function writeFromLocalUploads(e, n, r) {
  if (isDiskless()) throw preconditionError(LOCAL_PATH_UNAVAILABLE_TEXT, "local_path_not_available");
  let s = (P) => (P.endsWith(sep) ? P : P + sep),
    l = resolve(getOriginalCwd()),
    h = resolve(l, e),
    w =
      r !== void 0 &&
      isClaudeAiChatOrigin() &&
      S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND)
        ? getChatFileRoots()
        : [],
    found = [l, ...w].find((P) => h === P || h.startsWith(s(P)));
  if (found === void 0)
    throw preconditionError(
      "project_write: local_path must be inside the working directory.",
      "local_path_outside_cwd",
    );
  if (h.length > j$e)
    throw preconditionError("project_write: no file exists at local_path.", "local_path_too_long");
  let y =
      "project_write: local_path must not name a credential file, a device, or a file that Claude Code keeps for itself (its config and token folders).",
    j = (P) => {
      let I = layeredReadVerdictForPaths([P], n(), { refuseAutomounterShapes: !0 });
      if (
        I.layer !== "allow" &&
        !(I.layer === "path-mode-ask" && I.decision.decisionReason?.type === "workingDir")
      )
        throw preconditionError(
          "project_write: this session may not read the file at local_path without asking (a permission rule or setting, a network path, or links that cannot be followed), so it cannot be uploaded by path.",
          "local_path_read_needs_permission",
        );
    },
    x = found !== l && found === w[0];
  if (await $e(h, h, x)) throw preconditionError(y, "local_path_protected_file");
  j(h);
  let b, L;
  try {
    [b, L] = await Promise.all([realpath(h), found !== l ? found : realpath(found)]);
  } catch (error) {
    let I = getErrnoCode(error);
    if (I === "ENOENT" || I === "ENOTDIR" || I === "ENAMETOOLONG")
      throw preconditionError("project_write: no file exists at local_path.", "local_path_no_file");
    if (I === "EACCES" || I === "EPERM")
      throw preconditionError(
        "project_write: local_path is not readable.",
        "local_path_os_permission_denied",
      );
    throw error;
  }
  if (b !== L && !b.startsWith(s(L)))
    throw Error("project_write: local_path resolves outside the working directory.");
  if (await $e(h, b, x)) throw preconditionError(y, "local_path_protected_file");
  j(b);
  let W =
      "project_write: Read the whole file at local_path first, or pass its text as content. Outside the working directory, a file is uploaded by path only when this session has read all of it and it has not changed since.",
    V = [h, b];
  if (found !== l && V.some(isNotebookPath))
    throw preconditionError(
      "project_write: a notebook outside the working directory is not uploaded by local_path. Pass its text as content.",
      "local_path_notebook",
    );
  if (found !== l && !(r && anyTrackedReadMatches(V, r)))
    throw preconditionError(W, "local_path_file_not_read_yet");
  let O_NOFOLLOW = constants.O_NOFOLLOW,
    S = constants.O_NONBLOCK ?? 0,
    O = 0,
    z;
  try {
    z = await open(b, constants.O_RDONLY | O_NOFOLLOW | O | S);
  } catch (error) {
    let I = getErrnoCode(error);
    if (I === "ENOENT")
      throw preconditionError("project_write: no file exists at local_path.", "local_path_no_file");
    if (I === "EACCES" || I === "EPERM")
      throw preconditionError(
        "project_write: local_path is not readable.",
        "local_path_os_permission_denied",
      );
    if (I === "EISDIR" || I === "ENXIO" || I === "EOPNOTSUPP")
      throw preconditionError(
        "project_write: local_path must be a regular file.",
        "local_path_not_regular_file",
      );
    if (I === "ELOOP") throw Error("project_write: local_path was replaced during the upload.");
    throw error;
  }
  try {
    let stats = await z.stat({ bigint: !0 }),
      I = "project_write: local_path was replaced during the upload.";
    {
      let ne = await realpath(`/proc/self/fd/${z.fd}`).catch(() => null);
      if (ne !== null && ne !== b) throw Error("project_write: local_path was replaced during the upload.");
    }
    let q, G;
    try {
      ((q = await realpath(h)), (G = await stat(q, { bigint: !0 })));
    } catch {
      throw Error("project_write: local_path was replaced during the upload.");
    }
    if (q !== b) throw Error("project_write: local_path was replaced during the upload.");
    if (G.dev !== stats.dev) throw Error("project_write: local_path was replaced during the upload.");
    if (stats.ino !== 0n && G.ino !== stats.ino)
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
    let str = (await z.readFile()).toString("utf8");
    if (found === l) return str;
    if (!(r && anyTrackedReadMatches(V, r, str)))
      throw preconditionError(W, "local_path_file_differs_from_read");
    return __(str);
  } finally {
    await z.close();
  }
}

export {
  localPathAvailability,
  unicodeNameMatcher,
  logWriteFailure,
  ProjectSaveError,
  nt,
  classifySaveFailure,
  Ft,
  ze,
  it,
  readLocalPathForWrite,
  writeFromLocalUploads,
  preconditionError,
  assertKnowledgeCapacity,
  Lt,
  logWriteByLocalPath,
  Bt,
};
