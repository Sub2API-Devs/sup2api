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
  toolResultStoreOrNull,
  saveResultSafely,
  getOriginalCwd as getOriginalCwd_2,
  ensureToolResultsDir,
  writeToolResultFile,
  toolResultsKey,
} from "../../utils/toolResultStorage.js";
import { poolCanRead } from "../../utils/permissions/filesystem.js";
import {
  MAX_PROJECT_FILE_CHUNK_BYTES,
  MAX_PROJECT_FILE_BYTES,
  downloadProjectFile as downloadProjectFile_2,
  ProjectsApiError,
  updateProjectDoc,
  isUnknownOpError,
  createProjectDoc,
  deleteProjectDoc,
} from "../../services/projects/projectMemory.js";
import { projectReadInput } from "../../services/projects/projectReadRecords.js";
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
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { identity } from "../../utils/identity.js";
import {
  PROJECT_CAPACITY_TEXT,
  PROJECT_VERSION_MISMATCH_TEXT,
  ProjectSaveError,
  PROJECT_WRITE_RECOVERY_TEXT,
} from "./projectWrite.js";
import { PROJECTS_MEMORY_NOTE } from "./prompt.js";

//@ chunk-eg496hkq.js:39443-39454 placement
var MAX_LINE_CHUNK = 450;
//@ chunk-eg496hkq.js:39454-39683 placement = needsSegmentation (0.713)
function splitLongLines(text) {
  let n = [];
  for (let line of text.split(`
`)) {
    let s = 0;
    while (line.length - s > MAX_LINE_CHUNK) {
      let l = s + MAX_LINE_CHUNK;
      let index = line.slice(s, l).lastIndexOf(" ");
      let w = index > 0 ? s + index + 1 : line.codePointAt(l - 1) > 65535 ? l - 1 : l;
      n.push(line.slice(s, w));
      s = w;
    }
    n.push(line.slice(s));
  }
  return n.join(`
`);
}
//@ chunk-eg496hkq.js:39683-41113 placement
async function getProjectInfoForTool(e, attachedProjectUuid, r) {
  let description = e.description ?? "";
  let promptTemplate = e.prompt_template ?? "";
  let h = cutProjectText(e, r.model(), r.autoCompactWindow());
  if (h === undefined || (h.description === description && h.prompt_template === promptTemplate))
    return {
      name: h?.name ?? e.name,
      description,
      instructions: promptTemplate,
    };
  let w = (builtProjectBlocks.peek(r.session)?.size ?? 0) > 0;
  let m = {
    notice:
      "description and instructions are too long to return together, and this session has no file that holds them. What this answer and the rest of this conversation show of them is all that can be read: ignore a note that says project_info can give a file. If the task depends on the rest, tell the user that the project's description and instructions are too long to read in full here.",
    name: h.name,
    description: w ? "" : h.description,
    instructions: w ? "" : h.prompt_template,
  };
  if (!canWriteToolFile(r)) {
    logFeatureSad("projects_tool_info_to_file", "no_reader");
    return m;
  }
  let y = splitLongLines(`# Project description

${description}

# Project instructions

${promptTemplate}
`);
  let j = await downloadToToolFile(
    y,
    Buffer.byteLength(y, "utf8"),
    `instructions-${attachedProjectUuid}`,
    r.session,
    r.storageV5,
    true,
  );
  if ("failure" in j) {
    logFeatureSad("projects_tool_info_to_file", j.failure);
    return m;
  }
  logFeatureOk("projects_tool_info_to_file");
  return {
    notice:
      "description and instructions are left out here, because together they are too long to return. local_file holds both in full, with long lines split, and is for reading only: edits to it do not change the project. Read only the parts you need, with an offset and a limit, or search it.",
    local_file: j.local_file,
    name: h.name,
    description: "",
    instructions: "",
  };
}
//@ chunk-eg496hkq.js:41113-41177 placement
function canWriteToolFile(e) {
  let n = toolResultStoreOrNull();
  return n === undefined ? poolCanRead(e) : n.maxBytes > 0;
}
//@ chunk-eg496hkq.js:41177-41738 placement
var DOC_TOO_LARGE_WRITE_REFUSAL = `Write refused; nothing in the project was changed. The doc at this path holds more than ${MAX_PROJECT_FILE_CHUNK_BYTES} bytes, more than project_read shows inline, so a rewrite typed from what it showed you would drop the rest. Do not delete the doc to write it again unless the user asks: a delete cannot be undone here. If you have the whole new text in a file that this session accepts as \`local_path\`, pass that file, but not a file made from only part of the doc. Otherwise write the new text to a new path, and tell the user that this doc is too large to rewrite here.`;
//@ chunk-eg496hkq.js:41738-42093 placement
async function readProjectDocContent(path, content, r, s, l, h, w, m, y, j) {
  let x = y(false);
  let b = await projectTextOrDownload(content, "project-doc", r, s, h, w, m, x !== undefined, () => y(true));
  if ("content" in b)
    w?.claim?.(estimateDocTokens(Buffer.byteLength(b.content, "utf8"), w, b.content === content ? m : null));
  return projectReadInput(
    path,
    j,
    {
      ...b,
      ...(w !== undefined &&
        "local_file" in b && {
          size_bytes: Buffer.byteLength(content, "utf8"),
        }),
      ...(x !== undefined &&
        "local_file" in b && {
          notice: b.notice ?? x,
        }),
    },
    l,
  );
}
//@ chunk-eg496hkq.js:42093-43304 placement
/**
 * 项目文档在大小限制内直接返回文本，超限时改为下载到本地并返回路径说明。
 */
async function projectTextOrDownload(e, hash, r, s, l, h, w = null, m = false, y) {
  let j = Buffer.byteLength(e, "utf8");
  if (j <= MAX_PROJECT_FILE_CHUNK_BYTES) {
    let b = h === undefined ? "within" : classifyReadSize(e, j, h, w);
    if (b === "within")
      return {
        content: e,
      };
    let L = b === "over_with_long_line" ? y?.() : undefined;
    if (b === "over_with_long_line" && L === undefined) {
      logFeatureSad("projects_tool_read_to_file", "long_line");
      return {
        content: e,
      };
    }
    let W = await downloadToToolFile(e, j, r, s, l, m);
    if ("failure" in W) {
      logFeatureSad("projects_tool_read_to_file", W.failure);
      return {
        content: e,
      };
    }
    if (b === "over") {
      logFeatureOk("projects_tool_read_to_file");
      return W;
    }
    logFeatureSad("projects_tool_read_to_file", "long_line_file");
    return {
      ...W,
      notice: L,
    };
  }
  let x = toolResultStoreOrNull();
  if (x !== undefined) {
    let b = hash === "project-doc" ? " project_search still covers the whole doc." : "";
    let L = truncateUtf8Bytes(e, x.maxBytes);
    let buffer = Buffer.from(L, "utf8");
    let V =
      buffer.byteLength === 0
        ? null
        : await saveResultSafely(x, {
            leafName: getPastePath(hash, r),
            data: buffer,
          });
    if (V !== null)
      return L === e
        ? {
            local_file: V.path,
          }
        : {
            local_file: V.path,
            notice: `Only the first ${buffer.byteLength} of ${j} bytes were saved to local_file, the most this session keeps in one file.${b}`,
          };
    let R =
      x.maxBytes === 0
        ? ": this session does not keep larger results as files."
        : "; the rest could not be saved to a file this session can open.";
    return {
      content: truncateUtf8Bytes(e, MAX_PROJECT_FILE_CHUNK_BYTES),
      notice: `Only the first ${MAX_PROJECT_FILE_CHUNK_BYTES} of ${j} bytes are shown${R}${b}`,
    };
  }
  return {
    local_file: await downloadToPastePath(hash, r, e, s, l, m),
  };
}
//@ chunk-eg496hkq.js:43304-43429 placement
function estimateDocTokens(e, n, r) {
  let s = Math.ceil(e / n.bytesPerToken);
  return n.claim !== undefined ? Math.max(r ?? 0, s) : Math.min(r !== null && r > 0 ? r : s, e);
}
//@ chunk-eg496hkq.js:43429-43635 placement
function classifyReadSize(e, n, r, s) {
  let l = estimateDocTokens(n, r, s);
  if (l <= r.maxTokens) return "within";
  let h = 0;
  for (let line of e.split(`
`))
    h = Math.max(h, Buffer.byteLength(line));
  if ((h / n) * l > getDefaultFileReadingLimits().maxTokens / 2) return "over_with_long_line";
  return "over";
}
//@ chunk-eg496hkq.js:43635-44035 placement
async function downloadToToolFile(e, n, r, s, l, h) {
  let w = toolResultStoreOrNull();
  if (w !== undefined) {
    let m =
      n > w.maxBytes
        ? null
        : await saveResultSafely(w, {
            leafName: getPastePath("project-doc", r),
            data: Buffer.from(e, "utf8"),
          });
    return m === null
      ? {
          failure: "not_stored",
        }
      : {
          local_file: m.path,
        };
  }
  try {
    return {
      local_file: await downloadToPastePath("project-doc", r, e, s, l, h),
    };
  } catch (error) {
    logForDebugging(`Projects tool: could not save a text of ${n} bytes to a file: ${errorMessage(error)}`, {
      level: "warn",
    });
    return {
      failure: "write_failed",
    };
  }
}
//@ chunk-eg496hkq.js:44104-44757 placement
async function downloadToPastePath(hash, n, r, s, l, h) {
  let pastePath = getPastePath(hash, n);
  if (h && getLocalUploadsRoot() !== null) {
    let j;
    try {
      let x = join(getProjectDocsRoot(), s.root.id);
      let ownedDirChain = await openOwnedDirChain(x, 2);
      if (typeof ownedDirChain !== "string") {
        try {
          await writeFileAtomic(join(ownedDirChain.at, pastePath), r, 384);
        } finally {
          await ownedDirChain.release();
        }
        logFeatureOk("projects_tool_doc_outside_config_home");
        return join(x, pastePath);
      }
      j = ownedDirChain;
    } catch (error) {
      j = sanitizeErrnoForTelemetry(error) ?? "unknown";
    }
    logFeatureSad("projects_tool_doc_outside_config_home", j);
    logForDebugging(
      `Projects tool: could not save a text in the project-docs folder (${j}), so it is saved under the session's tool-results folder`,
      {
        level: "warn",
      },
    );
  }
  let originalCwd = getOriginalCwd_2(s);
  let y = join(originalCwd, pastePath);
  await ensureToolResultsDir(originalCwd, l);
  if (
    await writeThroughStore(
      l,
      originalCwd,
      pastePath,
      r,
      hash === "project-memory" ? "project_memory_read" : "project_read",
    )
  )
    return y;
  await writeToolResultFile(y, Buffer.from(r, "utf8"), 384);
  return y;
}
//@ chunk-eg496hkq.js:44757-45095 placement
async function writeThroughStore(e, originalCwd, r, s, l) {
  if (isStorageV5Enabled() && e !== undefined) {
    let h = toolResultsKey(originalCwd, r);
    if (h !== undefined) {
      let w = await e.write(h, s, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!w.ok)
        throw l === "project_read"
          ? Error("project_read: spill to tool-results failed", {
              cause: w.error,
            })
          : Error("project_memory_read: spill to tool-results failed", {
              cause: w.error,
            });
      return true;
    }
  }
  return false;
}
//@ chunk-eg496hkq.js:45095-45269 placement
var ORIGINAL_UNREADABLE_HINT =
  "only its extracted text, if it has any, can be read here (project_read without `original`). If that is not enough, tell the user the original cannot be opened here.";
//@ chunk-eg496hkq.js:45269-45619 placement
function tooLargeForDownloadText(e, n, r) {
  let s = `above the ${MAX_PROJECT_FILE_BYTES}-byte limit for in-session downloads`;
  let l = r === undefined ? `is ${s}` : `is ${r} bytes, ${s}`;
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
async function downloadProjectFile({ projectUuid, path, fileUuid, signal, credentials, originalAsked }) {
  try {
    return await downloadProjectFile_2(projectUuid, fileUuid, signal, credentials);
  } catch (error) {
    if (error instanceof ProjectsApiError && error.errorCode === "file_read_too_large")
      throw tooLargeForDownloadText(path, originalAsked);
    throw error;
  }
}
//@ chunk-eg496hkq.js:45829-47769 placement
/**
 * 执行 project_read：读取项目文档或文件，必要时下载到会话可访问的位置。
 */
async function projectReadMethod(projectUuid, n, projectFile, s, signal, h, credentials, m) {
  let y = toolResultStoreOrNull();
  if (y?.maxBytes === 0)
    return {
      method: "project_read",
      path: n,
      file_kind: projectFile.file_kind,
      created_at: projectFile.created_at ?? null,
      notice: `"${safeInline(n)}" is a ${safeInline(projectFile.file_kind)} upload with no text extract, and this session does not keep files, so it was not downloaded; tell the user this file cannot be opened here.`,
    };
  let j = (fileSizeBytes) => {
    if (fileSizeBytes > MAX_PROJECT_FILE_BYTES) throw tooLargeForDownloadText(n, m, fileSizeBytes);
  };
  let x = {
    projectUuid,
    path: n,
    fileUuid: projectFile.file_uuid,
    signal,
    credentials,
    originalAsked: m,
  };
  let b = await downloadProjectFile(x);
  j(b.file_size_bytes);
  let buffer = Buffer.from(b.content_base64, "base64");
  if (buffer.byteLength !== b.file_size_bytes) {
    b = await downloadProjectFile(x);
    j(b.file_size_bytes);
    buffer = Buffer.from(b.content_base64, "base64");
    if (buffer.byteLength !== b.file_size_bytes)
      throw Error(
        "project_read: downloaded bytes do not match the reported file size (corrupt response, or the file is being modified " +
          "concurrently \u2014 retry if a save was just issued).",
      );
  }
  if (b.uuid !== projectFile.file_uuid) throw Error("project_read: server returned a different file.");
  if (normalizeUuidOrNull(b.uuid) === null) throw Error("project_read: server returned a malformed file id.");
  let W =
    (b.file_name.split(/[/\\]/).pop() ?? "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-64)
      .replace(/^\.+/, "") || "file";
  let V = `project-file-${b.uuid}-${W}`;
  let R = `"${safeInline(n)}" is a ${safeInline(b.file_kind)} upload${m ? "" : " with no text extract"}; its original bytes (${b.file_size_bytes}) `;
  let S;
  let O = `${R}could not be saved to a file this session can open; ${m ? ORIGINAL_UNREADABLE_HINT : "tell the user this file could not be opened."}`;
  if (y === undefined) S = await saveProjectReadResult(V, buffer, s, h);
  else if (buffer.byteLength > y.maxBytes) {
    S = null;
    O = `${R}are more than this session keeps in one file (${y.maxBytes} bytes), so they were not saved; ${m ? ORIGINAL_UNREADABLE_HINT : "tell the user this file cannot be opened here."}`;
  } else {
    let z = await saveResultSafely(y, {
      leafName: V,
      data: buffer,
    });
    S = z === null ? null : z.path;
  }
  return {
    method: "project_read",
    path: n,
    file_kind: b.file_kind,
    ...(S !== null && {
      local_file: S,
    }),
    created_at: b.created_at ?? null,
    notice: S !== null ? `${R}were saved to local_file. Open it with file-appropriate tooling.` : O,
  };
}
//@ chunk-eg496hkq.js:47769-47905 placement
async function saveProjectReadResult(e, n, r, s) {
  let originalCwd = getOriginalCwd_2(r);
  let h = join(originalCwd, e);
  await ensureToolResultsDir(originalCwd, s);
  if (await writeThroughStore(s, originalCwd, e, n, "project_read")) return h;
  await writeToolResultFile(h, n, 384);
  return h;
}
//@ chunk-eg496hkq.js:47905-48017 placement
var PROJECT_REFRESH_MS = 600000;
var projectLackState = identity(
  {
    lackedUpdateAt: Number.NEGATIVE_INFINITY,
  },
  (e) => {
    e.lackedUpdateAt = Number.NEGATIVE_INFINITY;
  },
);
//@ chunk-eg496hkq.js:48017-49486 placement
async function fetchProjectWithFallback(e, uuid, fileName, content, l, h, w, ifVersion, y) {
  if (!h || Date.now() - projectLackState.lackedUpdateAt >= PROJECT_REFRESH_MS)
    try {
      return await updateProjectDoc(e, uuid, content, l, w, ifVersion, y);
    } catch (error) {
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_stale")
        throw new ProjectsPreconditionError(PROJECT_CAPACITY_TEXT, "project_doc_stale");
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_too_large_to_replace")
        throw new ProjectsPreconditionError(DOC_TOO_LARGE_WRITE_REFUSAL, "project_doc_too_large_to_replace");
      if (
        h &&
        ifVersion !== undefined &&
        error instanceof ProjectsApiError &&
        error.status === 400 &&
        error.errorCode === undefined &&
        !isUnknownOpError(error)
      )
        throw new ProjectsPreconditionError(PROJECT_VERSION_MISMATCH_TEXT, "if_version_not_served");
      if (!h || !isUnknownOpError(error)) throw new ProjectSaveError(error, "doc_updated");
      projectLackState.lackedUpdateAt = Date.now();
    }
  if (l.aborted) throw new AbortError();
  if (ifVersion !== undefined)
    throw new ProjectsPreconditionError(PROJECT_VERSION_MISMATCH_TEXT, "if_version_not_served");
  let j = await createProjectDoc(e, fileName, content, undefined, w).catch((error) => {
    throw new ProjectSaveError(error, "doc_beside_new");
  });
  if (typeof j?.uuid !== "string" || j.uuid === uuid)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `project_write: could not confirm that the new content was saved. Nothing was removed, so the project may now list this path twice. ${PROJECT_WRITE_RECOVERY_TEXT}`,
      "project_write could not confirm that the new content was saved",
    );
  try {
    await deleteProjectDoc(e, uuid, undefined, w);
  } catch (error) {
    logForDebugging(`Projects: the replaced doc ${uuid} could not be removed: ${errorMessage(error)}`, {
      level: "error",
    });
    throw Error(
      "project_write: the new content was saved, but the earlier copy of this doc may not have been removed, so the project may now list this path twice. project_read returns the new content. Do not repeat this write, and do not call project_delete: it would remove the new content, not the earlier copy. Tell the user that the earlier copy may need removing from the project in claude.ai.",
    );
  }
  return j;
}
//@ chunk-eg496hkq.js:49486-49608 placement
function findProjectDoc(projectDetail, n) {
  let found = projectDetail.documents.find((s) => s.file_name === n);
  return found
    ? {
        uuid: found.uuid,
        created_at: found.created_at ?? null,
      }
    : undefined;
}
//@ chunk-eg496hkq.js:49608-49672 placement
function findProjectFile(projectDetail, n) {
  return (projectDetail.files ?? []).find((r) => r.file_name === n);
}
//@ chunk-eg496hkq.js:49672-49761 placement
function projectDocNames(projectDetail) {
  return projectDetail.documents.map((n) => n.file_name).filter((n) => typeof n === "string");
}
//@ chunk-eg496hkq.js:49761-49851 placement
function projectFileNames(projectDetail) {
  return (projectDetail.files ?? []).map((n) => n.file_name).filter((n) => typeof n === "string");
}
//@ chunk-eg496hkq.js:49851-50417 placement
function notFoundInProjectText(projectDetail, n, method) {
  let mapped = [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)].map(safeInline);
  let l =
    mapped.length > 0
      ? ` Available: ${mapped.slice(0, 30).join(", ")}${mapped.length > 30 ? `, \u2026 and ${mapped.length - 30} more` : ""}`
      : " The project has no docs or files.";
  if (method === "project_read" && (projectDetail.sync_sources ?? []).length > 0)
    l =
      mapped.length > 0
        ? `${l}. Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.`
        : " Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.";
  return new ProjectsPreconditionError(`No doc or file at "${safeInline(n)}".${l}`);
}
//@ chunk-eg496hkq.js:50417-50662 placement
function notFoundInFilesText(e, n) {
  let mapped = e.files.map((file) => safeInline(file.path));
  let s =
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
        ? `This tool does not serve project memory in this session: it runs through the remote-session bridge, which has no memory route. ${PROJECTS_MEMORY_NOTE} The project's docs are still available through the other methods.`
        : "Project memory is not available in this session: it runs through the remote-session bridge, which has no memory access. The project's docs are still available through the other methods.",
    );
}
//@ chunk-eg496hkq.js:51089-51424 placement
/**
 * 本会话拿不到项目记忆时的说明文本。
 */
var PROJECT_MEMORY_LIST_LIMIT = 500;
var PROJECT_MEMORY_UNAVAILABLE_TEXT =
  "No project memory is available in this session. It may be turned off, or this server may not serve it yet. It is checked again when this session's context is next rebuilt (for example after /clear or a compaction) and in a new session.";
var PROJECT_MEMORY_STALENESS_NOTE =
  "Memory as read at this session's start or its last context refresh; not live.";
//@ chunk-eg496hkq.js:51424-51502 placement
function requireField(e, n, method) {
  if (e === undefined) throw new ProjectsPreconditionError(`${method} requires "${n}"`);
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
  PROJECT_MEMORY_UNAVAILABLE_TEXT,
  PROJECT_MEMORY_LIST_LIMIT,
  PROJECT_MEMORY_STALENESS_NOTE,
  notFoundInFilesText,
  projectTextOrDownload,
};
