/**
 * tools/ProjectsTool/projectRead.ts
 *
 * 2.1.316 新增：Projects 工具读取（project_read、info、下载）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (28)
 * attribution: placement 28
 */
import { join } from "path";
import { cutProjectText } from "../../services/projectTexts.js";
import { builtProjectBlocks, safeInline } from "../../services/projects/projectContext.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  dy,
  saveResultSafely,
  getOriginalCwd as getOriginalCwd_2,
  ensureToolResultsDir,
  writeToolResultFile,
  toolResultsKey,
} from "../../utils/toolResultStorage.js";
import { poolCanRead } from "../../utils/permissions/filesystem.js";
import {
  OQe,
  IMr,
  downloadProjectFile as downloadProjectFile_2,
  ProjectsApiError,
  updateProjectDoc,
  CAo,
  createProjectDoc,
  deleteProjectDoc,
} from "../../services/projects/projectMemory.js";
import { tbn } from "../../services/projects/projectReadRecords.js";
import { truncateUtf8Bytes } from "../../utils/stringUtils.js";
import { getPastePath } from "../../utils/pasteStore.js";
import { getDefaultFileReadingLimits } from "../FileReadTool/limits.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  sanitizeErrnoForTelemetry,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { getLocalUploadsRoot, isDiskless } from "../../bootstrap/state.js";
import { getProjectDocsRoot } from "../../utils/stageFileRoots.js";
import { openOwnedDirChain } from "../../utils/safeMkdir.js";
import { writeFileAtomic } from "../../utils/atomicPublishWrite.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { ProjectsPreconditionError } from "./projectsAuth.js";
import { Vt } from "../../utils/agentId.js";
import { ge } from "../../utils/identity.js";
import { Ft, ze, ProjectSaveError, it } from "./projectWrite.js";
import { f7o } from "./prompt.js";

//@ chunk-eg496hkq.js:39443-39454 placement
var MAX_LINE_CHUNK = 450;
//@ chunk-eg496hkq.js:39454-39683 placement = needsSegmentation (0.713)
function splitLongLines(text) {
  let n = [];
  for (let r of text.split(`
`)) {
    let s = 0;
    while (r.length - s > MAX_LINE_CHUNK) {
      let l = s + MAX_LINE_CHUNK,
        index = r.slice(s, l).lastIndexOf(" "),
        w = index > 0 ? s + index + 1 : r.codePointAt(l - 1) > 65535 ? l - 1 : l;
      (n.push(r.slice(s, w)), (s = w));
    }
    n.push(r.slice(s));
  }
  return n.join(`
`);
}
//@ chunk-eg496hkq.js:39683-41113 placement
async function getProjectInfoForTool(e, n, r) {
  let s = e.description ?? "",
    l = e.prompt_template ?? "",
    h = cutProjectText(e, r.model(), r.autoCompactWindow());
  if (h === void 0 || (h.description === s && h.prompt_template === l))
    return { name: h?.name ?? e.name, description: s, instructions: l };
  let w = (builtProjectBlocks.peek(r.session)?.size ?? 0) > 0,
    m = {
      notice:
        "description and instructions are too long to return together, and this session has no file that holds them. What this answer and the rest of this conversation show of them is all that can be read: ignore a note that says project_info can give a file. If the task depends on the rest, tell the user that the project's description and instructions are too long to read in full here.",
      name: h.name,
      description: w ? "" : h.description,
      instructions: w ? "" : h.prompt_template,
    };
  if (!canWriteToolFile(r)) return (logFeatureSad("projects_tool_info_to_file", "no_reader"), m);
  let y = splitLongLines(`# Project description

${s}

# Project instructions

${l}
`),
    j = await downloadToToolFile(
      y,
      Buffer.byteLength(y, "utf8"),
      `instructions-${n}`,
      r.session,
      r.storageV5,
      !0,
    );
  if ("failure" in j) return (logFeatureSad("projects_tool_info_to_file", j.failure), m);
  return (
    logFeatureOk("projects_tool_info_to_file"),
    {
      notice:
        "description and instructions are left out here, because together they are too long to return. local_file holds both in full, with long lines split, and is for reading only: edits to it do not change the project. Read only the parts you need, with an offset and a limit, or search it.",
      local_file: j.local_file,
      name: h.name,
      description: "",
      instructions: "",
    }
  );
}
//@ chunk-eg496hkq.js:41113-41177 placement
function canWriteToolFile(e) {
  let n = dy();
  return n === void 0 ? poolCanRead(e) : n.maxBytes > 0;
}
//@ chunk-eg496hkq.js:41177-41738 placement
var DOC_TOO_LARGE_WRITE_REFUSAL = `Write refused; nothing in the project was changed. The doc at this path holds more than ${OQe} bytes, more than project_read shows inline, so a rewrite typed from what it showed you would drop the rest. Do not delete the doc to write it again unless the user asks: a delete cannot be undone here. If you have the whole new text in a file that this session accepts as \`local_path\`, pass that file, but not a file made from only part of the doc. Otherwise write the new text to a new path, and tell the user that this doc is too large to rewrite here.`;
//@ chunk-eg496hkq.js:41738-42093 placement
async function readProjectDocContent(e, n, r, s, l, h, w, m, y, j) {
  let x = y(!1),
    b = await projectTextOrDownload(n, "project-doc", r, s, h, w, m, x !== void 0, () => y(!0));
  if ("content" in b)
    w?.claim?.(estimateDocTokens(Buffer.byteLength(b.content, "utf8"), w, b.content === n ? m : null));
  return tbn(
    e,
    j,
    {
      ...b,
      ...(w !== void 0 && "local_file" in b && { size_bytes: Buffer.byteLength(n, "utf8") }),
      ...(x !== void 0 && "local_file" in b && { notice: b.notice ?? x }),
    },
    l,
  );
}
/**
 * 项目文档在大小限制内直接返回文本，超限时改为下载到本地并返回路径说明。
 */
//@ chunk-eg496hkq.js:42093-43304 placement
async function projectTextOrDownload(e, n, r, s, l, h, w = null, m = !1, y) {
  let byteLength = Buffer.byteLength(e, "utf8");
  if (byteLength <= OQe) {
    let b = h === void 0 ? "within" : classifyReadSize(e, byteLength, h, w);
    if (b === "within") return { content: e };
    let L = b === "over_with_long_line" ? y?.() : void 0;
    if (b === "over_with_long_line" && L === void 0)
      return (logFeatureSad("projects_tool_read_to_file", "long_line"), { content: e });
    let W = await downloadToToolFile(e, byteLength, r, s, l, m);
    if ("failure" in W) return (logFeatureSad("projects_tool_read_to_file", W.failure), { content: e });
    if (b === "over") return (logFeatureOk("projects_tool_read_to_file"), W);
    return (logFeatureSad("projects_tool_read_to_file", "long_line_file"), { ...W, notice: L });
  }
  let x = dy();
  if (x !== void 0) {
    let b = n === "project-doc" ? " project_search still covers the whole doc." : "",
      L = truncateUtf8Bytes(e, x.maxBytes),
      buffer = Buffer.from(L, "utf8"),
      V =
        buffer.byteLength === 0
          ? null
          : await saveResultSafely(x, { leafName: getPastePath(n, r), data: buffer });
    if (V !== null)
      return L === e
        ? { local_file: V.path }
        : {
            local_file: V.path,
            notice: `Only the first ${buffer.byteLength} of ${byteLength} bytes were saved to local_file, the most this session keeps in one file.${b}`,
          };
    let R =
      x.maxBytes === 0
        ? ": this session does not keep larger results as files."
        : "; the rest could not be saved to a file this session can open.";
    return {
      content: truncateUtf8Bytes(e, OQe),
      notice: `Only the first ${OQe} of ${byteLength} bytes are shown${R}${b}`,
    };
  }
  return { local_file: await downloadToPastePath(n, r, e, s, l, m) };
}
//@ chunk-eg496hkq.js:43304-43429 placement
function estimateDocTokens(e, n, r) {
  let ceil = Math.ceil(e / n.bytesPerToken);
  return n.claim !== void 0 ? Math.max(r ?? 0, ceil) : Math.min(r !== null && r > 0 ? r : ceil, e);
}
//@ chunk-eg496hkq.js:43429-43635 placement
function classifyReadSize(e, n, r, s) {
  let l = estimateDocTokens(n, r, s);
  if (l <= r.maxTokens) return "within";
  let h = 0;
  for (let w of e.split(`
`))
    h = Math.max(h, Buffer.byteLength(w));
  if ((h / n) * l > getDefaultFileReadingLimits().maxTokens / 2) return "over_with_long_line";
  return "over";
}
//@ chunk-eg496hkq.js:43635-44035 placement
async function downloadToToolFile(e, n, r, s, l, h) {
  let w = dy();
  if (w !== void 0) {
    let m =
      n > w.maxBytes
        ? null
        : await saveResultSafely(w, {
            leafName: getPastePath("project-doc", r),
            data: Buffer.from(e, "utf8"),
          });
    return m === null ? { failure: "not_stored" } : { local_file: m.path };
  }
  try {
    return { local_file: await downloadToPastePath("project-doc", r, e, s, l, h) };
  } catch (error) {
    return (
      logForDebugging(
        `Projects tool: could not save a text of ${n} bytes to a file: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      { failure: "write_failed" }
    );
  }
}
//@ chunk-eg496hkq.js:44104-44757 placement
async function downloadToPastePath(e, n, r, s, l, h) {
  let w = getPastePath(e, n);
  if (h && getLocalUploadsRoot() !== null) {
    let j;
    try {
      let x = join(getProjectDocsRoot(), s.root.id),
        b = await openOwnedDirChain(x, 2);
      if (typeof b !== "string") {
        try {
          await writeFileAtomic(join(b.at, w), r, 384);
        } finally {
          await b.release();
        }
        return (logFeatureOk("projects_tool_doc_outside_config_home"), join(x, w));
      }
      j = b;
    } catch (error) {
      j = sanitizeErrnoForTelemetry(error) ?? "unknown";
    }
    (logFeatureSad("projects_tool_doc_outside_config_home", j),
      logForDebugging(
        `Projects tool: could not save a text in the project-docs folder (${j}), so it is saved under the session's tool-results folder`,
        { level: "warn" },
      ));
  }
  let m = getOriginalCwd_2(s),
    y = join(m, w);
  if (
    (await ensureToolResultsDir(m, l),
    await writeThroughStore(l, m, w, r, e === "project-memory" ? "project_memory_read" : "project_read"))
  )
    return y;
  return (await writeToolResultFile(y, Buffer.from(r, "utf8"), 384), y);
}
//@ chunk-eg496hkq.js:44757-45095 placement
async function writeThroughStore(e, n, r, s, l) {
  if (isStorageV5Enabled() && e !== void 0) {
    let h = toolResultsKey(n, r);
    if (h !== void 0) {
      let write = await e.write(h, s, { publishDiscipline: "inPlace", mode: 384 });
      if (!write.ok)
        throw l === "project_read"
          ? Error("project_read: spill to tool-results failed", { cause: write.error })
          : Error("project_memory_read: spill to tool-results failed", { cause: write.error });
      return !0;
    }
  }
  return !1;
}
//@ chunk-eg496hkq.js:45095-45269 placement
var ORIGINAL_UNREADABLE_HINT =
  "only its extracted text, if it has any, can be read here (project_read without `original`). If that is not enough, tell the user the original cannot be opened here.";
//@ chunk-eg496hkq.js:45269-45619 placement
function tooLargeForDownloadText(e, n, r) {
  let s = `above the ${IMr}-byte limit for in-session downloads`,
    l = r === void 0 ? `is ${s}` : `is ${r} bytes, ${s}`;
  return n
    ? new ProjectsPreconditionError(
        `project_read: "${safeInline(e)}" ${l}. So ${ORIGINAL_UNREADABLE_HINT}`,
        "project_original_too_large",
      )
    : new ProjectsPreconditionError(
        `project_read: "${safeInline(e)}" has no text extract and ${l}; tell the user this file cannot be opened here.`,
        "project_upload_too_large",
      );
}
//@ chunk-eg496hkq.js:45619-45829 placement
async function downloadProjectFile({
  projectUuid: projectUuid,
  path: path,
  fileUuid: fileUuid,
  signal: signal,
  credentials: credentials,
  originalAsked: originalAsked,
}) {
  try {
    return await downloadProjectFile_2(projectUuid, fileUuid, signal, credentials);
  } catch (error) {
    if (error instanceof ProjectsApiError && error.errorCode === "file_read_too_large")
      throw tooLargeForDownloadText(path, originalAsked);
    throw error;
  }
}
/**
 * 执行 project_read：读取项目文档或文件，必要时下载到会话可访问的位置。
 */
//@ chunk-eg496hkq.js:45829-47769 placement
async function projectReadMethod(e, n, r, s, l, h, w, m) {
  let y = dy();
  if (y?.maxBytes === 0)
    return {
      method: "project_read",
      path: n,
      file_kind: r.file_kind,
      created_at: r.created_at ?? null,
      notice: `"${safeInline(n)}" is a ${safeInline(r.file_kind)} upload with no text extract, and this session does not keep files, so it was not downloaded; tell the user this file cannot be opened here.`,
    };
  let j = (z) => {
      if (z > IMr) throw tooLargeForDownloadText(n, m, z);
    },
    x = { projectUuid: e, path: n, fileUuid: r.file_uuid, signal: l, credentials: w, originalAsked: m },
    b = await downloadProjectFile(x);
  j(b.file_size_bytes);
  let buffer = Buffer.from(b.content_base64, "base64");
  if (buffer.byteLength !== b.file_size_bytes) {
    if (
      ((b = await downloadProjectFile(x)),
      j(b.file_size_bytes),
      (buffer = Buffer.from(b.content_base64, "base64")),
      buffer.byteLength !== b.file_size_bytes)
    )
      throw Error(
        "project_read: downloaded bytes do not match the reported file size (corrupt response, or the file is being modified " +
          "concurrently \u2014 retry if a save was just issued).",
      );
  }
  if (b.uuid !== r.file_uuid) throw Error("project_read: server returned a different file.");
  if (Vt(b.uuid) === null) throw Error("project_read: server returned a malformed file id.");
  let W =
      (b.file_name.split(/[/\\]/).pop() ?? "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(-64)
        .replace(/^\.+/, "") || "file",
    V = `project-file-${b.uuid}-${W}`,
    R = `"${safeInline(n)}" is a ${safeInline(b.file_kind)} upload${m ? "" : " with no text extract"}; its original bytes (${b.file_size_bytes}) `,
    S,
    O = `${R}could not be saved to a file this session can open; ${m ? ORIGINAL_UNREADABLE_HINT : "tell the user this file could not be opened."}`;
  if (y === void 0) S = await saveProjectReadResult(V, buffer, s, h);
  else if (buffer.byteLength > y.maxBytes)
    ((S = null),
      (O = `${R}are more than this session keeps in one file (${y.maxBytes} bytes), so they were not saved; ${m ? ORIGINAL_UNREADABLE_HINT : "tell the user this file cannot be opened here."}`));
  else {
    let z = await saveResultSafely(y, { leafName: V, data: buffer });
    S = z === null ? null : z.path;
  }
  return {
    method: "project_read",
    path: n,
    file_kind: b.file_kind,
    ...(S !== null && { local_file: S }),
    created_at: b.created_at ?? null,
    notice: S !== null ? `${R}were saved to local_file. Open it with file-appropriate tooling.` : O,
  };
}
//@ chunk-eg496hkq.js:47769-47905 placement
async function saveProjectReadResult(e, n, r, s) {
  let l = getOriginalCwd_2(r),
    h = join(l, e);
  if ((await ensureToolResultsDir(l, s), await writeThroughStore(s, l, e, n, "project_read"))) return h;
  return (await writeToolResultFile(h, n, 384), h);
}
//@ chunk-eg496hkq.js:47905-48017 placement
var PROJECT_REFRESH_MS = 600000,
  projectLackState = ge({ lackedUpdateAt: Number.NEGATIVE_INFINITY }, (e) => {
    e.lackedUpdateAt = Number.NEGATIVE_INFINITY;
  });
//@ chunk-eg496hkq.js:48017-49486 placement
async function fetchProjectWithFallback(e, n, r, s, l, h, w, m, y) {
  if (!h || Date.now() - projectLackState.lackedUpdateAt >= PROJECT_REFRESH_MS)
    try {
      return await updateProjectDoc(e, n, s, l, w, m, y);
    } catch (error) {
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_stale")
        throw new ProjectsPreconditionError(Ft, "project_doc_stale");
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_too_large_to_replace")
        throw new ProjectsPreconditionError(DOC_TOO_LARGE_WRITE_REFUSAL, "project_doc_too_large_to_replace");
      if (
        h &&
        m !== void 0 &&
        error instanceof ProjectsApiError &&
        error.status === 400 &&
        error.errorCode === void 0 &&
        !CAo(error)
      )
        throw new ProjectsPreconditionError(ze, "if_version_not_served");
      if (!h || !CAo(error)) throw new ProjectSaveError(error, "doc_updated");
      projectLackState.lackedUpdateAt = Date.now();
    }
  if (l.aborted) throw new AbortError();
  if (m !== void 0) throw new ProjectsPreconditionError(ze, "if_version_not_served");
  let j = await createProjectDoc(e, r, s, void 0, w).catch((x) => {
    throw new ProjectSaveError(x, "doc_beside_new");
  });
  if (typeof j?.uuid !== "string" || j.uuid === n)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `project_write: could not confirm that the new content was saved. Nothing was removed, so the project may now list this path twice. ${it}`,
      "project_write could not confirm that the new content was saved",
    );
  try {
    await deleteProjectDoc(e, n, void 0, w);
  } catch (error) {
    throw (
      logForDebugging(`Projects: the replaced doc ${n} could not be removed: ${errorMessage(error)}`, {
        level: "error",
      }),
      Error(
        "project_write: the new content was saved, but the earlier copy of this doc may not have been removed, so the project may now list this path twice. project_read returns the new content. Do not repeat this write, and do not call project_delete: it would remove the new content, not the earlier copy. Tell the user that the earlier copy may need removing from the project in claude.ai.",
      )
    );
  }
  return j;
}
//@ chunk-eg496hkq.js:49486-49608 placement
function findProjectDoc(e, n) {
  let found = e.documents.find((s) => s.file_name === n);
  return found ? { uuid: found.uuid, created_at: found.created_at ?? null } : void 0;
}
//@ chunk-eg496hkq.js:49608-49672 placement
function findProjectFile(e, n) {
  return (e.files ?? []).find((r) => r.file_name === n);
}
//@ chunk-eg496hkq.js:49672-49761 placement
function projectDocNames(e) {
  return e.documents.map((n) => n.file_name).filter((n) => typeof n === "string");
}
//@ chunk-eg496hkq.js:49761-49851 placement
function projectFileNames(e) {
  return (e.files ?? []).map((n) => n.file_name).filter((n) => typeof n === "string");
}
//@ chunk-eg496hkq.js:49851-50417 placement
function notFoundInProjectText(e, n, r) {
  let mapped = [...projectDocNames(e), ...projectFileNames(e)].map(safeInline),
    l =
      mapped.length > 0
        ? ` Available: ${mapped.slice(0, 30).join(", ")}${mapped.length > 30 ? `, \u2026 and ${mapped.length - 30} more` : ""}`
        : " The project has no docs or files.";
  if (r === "project_read" && (e.sync_sources ?? []).length > 0)
    l =
      mapped.length > 0
        ? `${l}. Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.`
        : " Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.";
  return new ProjectsPreconditionError(`No doc or file at "${safeInline(n)}".${l}`);
}
//@ chunk-eg496hkq.js:50417-50662 placement
function notFoundInFilesText(e, n) {
  let mapped = e.files.map((file) => safeInline(file.path)),
    s =
      mapped.length > 0
        ? ` Available: ${mapped.slice(0, 30).join(", ")}${mapped.length > 30 ? `, \u2026 and ${mapped.length - 30} more` : ""}`
        : " The project has no memory files.";
  return new ProjectsPreconditionError(`No memory file at "${safeInline(n)}".${s}`);
}
//@ chunk-eg496hkq.js:50662-51089 placement
function assertProjectMemoryAvailable(e) {
  if (e)
    throw new ProjectsPreconditionError(
      isDiskless()
        ? `This tool does not serve project memory in this session: it runs through the remote-session bridge, which has no memory route. ${f7o} The project's docs are still available through the other methods.`
        : "Project memory is not available in this session: it runs through the remote-session bridge, which has no memory access. The project's docs are still available through the other methods.",
    );
}
//@ chunk-eg496hkq.js:51089-51424 placement
var PROJECT_MEMORY_LIST_LIMIT = 500,
  Ge =
    "No project memory is available in this session. It may be turned off, or this server may not serve it yet. It is checked again when this session's context is next rebuilt (for example after /clear or a compaction) and in a new session.",
  Ye = "Memory as read at this session's start or its last context refresh; not live.";
//@ chunk-eg496hkq.js:51424-51502 placement
function requireField(e, n, r) {
  if (e === void 0) throw new ProjectsPreconditionError(`${r} requires "${n}"`);
  return e;
}

export {
  canWriteToolFile,
  getProjectInfoForTool,
  requireField,
  projectDocNames,
  projectFileNames,
  findProjectDoc,
  findProjectFile,
  notFoundInProjectText,
  readProjectDocContent,
  projectReadMethod,
  fetchProjectWithFallback,
  assertProjectMemoryAvailable,
  Ge,
  PROJECT_MEMORY_LIST_LIMIT,
  Ye,
  notFoundInFilesText,
  projectTextOrDownload,
};
