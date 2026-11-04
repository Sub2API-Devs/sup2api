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
//@ chunk-eg496hkq.js:39454-39683 placement (2.1.88 match: needsSegmentation, 0.713)
function splitLongLines(text) {
  let rebuiltLines = [];
  for (let line of text.split(`
`)) {
    let lineStart = 0;
    while (line.length - lineStart > MAX_LINE_CHUNK) {
      let chunkEnd = lineStart + MAX_LINE_CHUNK;
      let index = line.slice(lineStart, chunkEnd).lastIndexOf(" ");
      let cutIndex =
        index > 0 ? lineStart + index + 1 : line.codePointAt(chunkEnd - 1) > 65535 ? chunkEnd - 1 : chunkEnd;
      rebuiltLines.push(line.slice(lineStart, cutIndex));
      lineStart = cutIndex;
    }
    rebuiltLines.push(line.slice(lineStart));
  }
  return rebuiltLines.join(`
`);
}
//@ chunk-eg496hkq.js:39683-41113 placement
async function getProjectInfoForTool(project, attachedProjectUuid, toolContext) {
  let description = project.description ?? "";
  let promptTemplate = project.prompt_template ?? "";
  let cutProject = cutProjectText(project, toolContext.model(), toolContext.autoCompactWindow());
  if (
    cutProject === undefined ||
    (cutProject.description === description && cutProject.prompt_template === promptTemplate)
  )
    return {
      name: cutProject?.name ?? project.name,
      description,
      instructions: promptTemplate,
    };
  let hasProjectBlocks = (builtProjectBlocks.peek(toolContext.session)?.size ?? 0) > 0;
  let noticeResult = {
    notice:
      "description and instructions are too long to return together, and this session has no file that holds them. What this answer and the rest of this conversation show of them is all that can be read: ignore a note that says project_info can give a file. If the task depends on the rest, tell the user that the project's description and instructions are too long to read in full here.",
    name: cutProject.name,
    description: hasProjectBlocks ? "" : cutProject.description,
    instructions: hasProjectBlocks ? "" : cutProject.prompt_template,
  };
  if (!canWriteToolFile(toolContext)) {
    logFeatureSad("projects_tool_info_to_file", "no_reader");
    return noticeResult;
  }
  let combinedText = splitLongLines(`# Project description

${description}

# Project instructions

${promptTemplate}
`);
  let savedFile = await downloadToToolFile(
    combinedText,
    Buffer.byteLength(combinedText, "utf8"),
    `instructions-${attachedProjectUuid}`,
    toolContext.session,
    toolContext.storageV5,
    true,
  );
  if ("failure" in savedFile) {
    logFeatureSad("projects_tool_info_to_file", savedFile.failure);
    return noticeResult;
  }
  logFeatureOk("projects_tool_info_to_file");
  return {
    notice:
      "description and instructions are left out here, because together they are too long to return. local_file holds both in full, with long lines split, and is for reading only: edits to it do not change the project. Read only the parts you need, with an offset and a limit, or search it.",
    local_file: savedFile.local_file,
    name: cutProject.name,
    description: "",
    instructions: "",
  };
}
//@ chunk-eg496hkq.js:41113-41177 placement
function canWriteToolFile(toolContext) {
  let store = toolResultStoreOrNull();
  return store === undefined ? poolCanRead(toolContext) : store.maxBytes > 0;
}
//@ chunk-eg496hkq.js:41177-41738 placement
var DOC_TOO_LARGE_WRITE_REFUSAL = `Write refused; nothing in the project was changed. The doc at this path holds more than ${MAX_PROJECT_FILE_CHUNK_BYTES} bytes, more than project_read shows inline, so a rewrite typed from what it showed you would drop the rest. Do not delete the doc to write it again unless the user asks: a delete cannot be undone here. If you have the whole new text in a file that this session accepts as \`local_path\`, pass that file, but not a file made from only part of the doc. Otherwise write the new text to a new path, and tell the user that this doc is too large to rewrite here.`;
//@ chunk-eg496hkq.js:41738-42093 placement
async function readProjectDocContent(
  path,
  text,
  fileUuid,
  session,
  fileMeta,
  storageV5,
  tokenBudget,
  estimatedTokens,
  longLineNotice,
  methodName,
) {
  let longLineNoticeText = longLineNotice(false);
  let result = await projectTextOrDownload(
    text,
    "project-doc",
    fileUuid,
    session,
    storageV5,
    tokenBudget,
    estimatedTokens,
    longLineNoticeText !== undefined,
    () => longLineNotice(true),
  );
  if ("content" in result)
    tokenBudget?.claim?.(
      estimateDocTokens(
        Buffer.byteLength(result.content, "utf8"),
        tokenBudget,
        result.content === text ? estimatedTokens : null,
      ),
    );
  return projectReadInput(
    path,
    methodName,
    {
      ...result,
      ...(tokenBudget !== undefined &&
        "local_file" in result && {
          size_bytes: Buffer.byteLength(text, "utf8"),
        }),
      ...(longLineNoticeText !== undefined &&
        "local_file" in result && {
          notice: result.notice ?? longLineNoticeText,
        }),
    },
    fileMeta,
  );
}
//@ chunk-eg496hkq.js:42093-43304 placement
/**
 * 项目文档在大小限制内直接返回文本，超限时改为下载到本地并返回路径说明。
 */
async function projectTextOrDownload(
  text,
  hash,
  fileUuid,
  session,
  storageV5,
  tokenBudget,
  estimatedTokens = null,
  preferProjectDocs = false,
  longLineNotice,
) {
  let byteSize = Buffer.byteLength(text, "utf8");
  if (byteSize <= MAX_PROJECT_FILE_CHUNK_BYTES) {
    let sizeClass =
      tokenBudget === undefined ? "within" : classifyReadSize(text, byteSize, tokenBudget, estimatedTokens);
    if (sizeClass === "within")
      return {
        content: text,
      };
    let longLineNoticeText = sizeClass === "over_with_long_line" ? longLineNotice?.() : undefined;
    if (sizeClass === "over_with_long_line" && longLineNoticeText === undefined) {
      logFeatureSad("projects_tool_read_to_file", "long_line");
      return {
        content: text,
      };
    }
    let savedFile = await downloadToToolFile(text, byteSize, fileUuid, session, storageV5, preferProjectDocs);
    if ("failure" in savedFile) {
      logFeatureSad("projects_tool_read_to_file", savedFile.failure);
      return {
        content: text,
      };
    }
    if (sizeClass === "over") {
      logFeatureOk("projects_tool_read_to_file");
      return savedFile;
    }
    logFeatureSad("projects_tool_read_to_file", "long_line_file");
    return {
      ...savedFile,
      notice: longLineNoticeText,
    };
  }
  let store = toolResultStoreOrNull();
  if (store !== undefined) {
    let searchHint = hash === "project-doc" ? " project_search still covers the whole doc." : "";
    let truncated = truncateUtf8Bytes(text, store.maxBytes);
    let buffer = Buffer.from(truncated, "utf8");
    let saved =
      buffer.byteLength === 0
        ? null
        : await saveResultSafely(store, {
            leafName: getPastePath(hash, fileUuid),
            data: buffer,
          });
    if (saved !== null)
      return truncated === text
        ? {
            local_file: saved.path,
          }
        : {
            local_file: saved.path,
            notice: `Only the first ${buffer.byteLength} of ${byteSize} bytes were saved to local_file, the most this session keeps in one file.${searchHint}`,
          };
    let storeNote =
      store.maxBytes === 0
        ? ": this session does not keep larger results as files."
        : "; the rest could not be saved to a file this session can open.";
    return {
      content: truncateUtf8Bytes(text, MAX_PROJECT_FILE_CHUNK_BYTES),
      notice: `Only the first ${MAX_PROJECT_FILE_CHUNK_BYTES} of ${byteSize} bytes are shown${storeNote}${searchHint}`,
    };
  }
  return {
    local_file: await downloadToPastePath(hash, fileUuid, text, session, storageV5, preferProjectDocs),
  };
}
//@ chunk-eg496hkq.js:43304-43429 placement
function estimateDocTokens(byteSize, tokenBudget, estimatedTokens) {
  let estimated = Math.ceil(byteSize / tokenBudget.bytesPerToken);
  return tokenBudget.claim !== undefined
    ? Math.max(estimatedTokens ?? 0, estimated)
    : Math.min(estimatedTokens !== null && estimatedTokens > 0 ? estimatedTokens : estimated, byteSize);
}
//@ chunk-eg496hkq.js:43429-43635 placement
function classifyReadSize(text, byteSize, tokenBudget, estimatedTokens) {
  let tokens = estimateDocTokens(byteSize, tokenBudget, estimatedTokens);
  if (tokens <= tokenBudget.maxTokens) return "within";
  let longestLineBytes = 0;
  for (let line of text.split(`
`))
    longestLineBytes = Math.max(longestLineBytes, Buffer.byteLength(line));
  if ((longestLineBytes / byteSize) * tokens > getDefaultFileReadingLimits().maxTokens / 2)
    return "over_with_long_line";
  return "over";
}
//@ chunk-eg496hkq.js:43635-44035 placement
async function downloadToToolFile(text, byteSize, fileUuid, session, storageV5, preferProjectDocs) {
  let store = toolResultStoreOrNull();
  if (store !== undefined) {
    let saved =
      byteSize > store.maxBytes
        ? null
        : await saveResultSafely(store, {
            leafName: getPastePath("project-doc", fileUuid),
            data: Buffer.from(text, "utf8"),
          });
    return saved === null
      ? {
          failure: "not_stored",
        }
      : {
          local_file: saved.path,
        };
  }
  try {
    return {
      local_file: await downloadToPastePath(
        "project-doc",
        fileUuid,
        text,
        session,
        storageV5,
        preferProjectDocs,
      ),
    };
  } catch (error) {
    logForDebugging(
      `Projects tool: could not save a text of ${byteSize} bytes to a file: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return {
      failure: "write_failed",
    };
  }
}
//@ chunk-eg496hkq.js:44104-44757 placement
async function downloadToPastePath(hash, fileUuid, text, session, storageV5, preferProjectDocs) {
  let cwdBeforeSwitch = getPastePath(hash, fileUuid);
  if (preferProjectDocs && getLocalUploadsRoot() !== null) {
    let failureCode;
    try {
      let docsDir = join(getProjectDocsRoot(), session.root.id);
      let ownedDirChain = await openOwnedDirChain(docsDir, 2);
      if (typeof ownedDirChain !== "string") {
        try {
          await writeFileAtomic(join(ownedDirChain.at, cwdBeforeSwitch), text, 384);
        } finally {
          await ownedDirChain.release();
        }
        logFeatureOk("projects_tool_doc_outside_config_home");
        return join(docsDir, cwdBeforeSwitch);
      }
      failureCode = ownedDirChain;
    } catch (error) {
      failureCode = sanitizeErrnoForTelemetry(error) ?? "unknown";
    }
    logFeatureSad("projects_tool_doc_outside_config_home", failureCode);
    logForDebugging(
      `Projects tool: could not save a text in the project-docs folder (${failureCode}), so it is saved under the session's tool-results folder`,
      {
        level: "warn",
      },
    );
  }
  let originalCwd = getOriginalCwd_2(session);
  let toolResultsPath = join(originalCwd, cwdBeforeSwitch);
  await ensureToolResultsDir(originalCwd, storageV5);
  if (
    await writeThroughStore(
      storageV5,
      originalCwd,
      cwdBeforeSwitch,
      text,
      hash === "project-memory" ? "project_memory_read" : "project_read",
    )
  )
    return toolResultsPath;
  await writeToolResultFile(toolResultsPath, Buffer.from(text, "utf8"), 384);
  return toolResultsPath;
}
//@ chunk-eg496hkq.js:44757-45095 placement
async function writeThroughStore(storageV5, originalCwd, cwdBeforeSwitch, text, kind) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let key = toolResultsKey(originalCwd, cwdBeforeSwitch);
    if (key !== undefined) {
      let writeResult = await storageV5.write(key, text, {
        publishDiscipline: "inPlace",
        mode: 384,
      });
      if (!writeResult.ok)
        throw kind === "project_read"
          ? Error("project_read: spill to tool-results failed", {
              cause: writeResult.error,
            })
          : Error("project_memory_read: spill to tool-results failed", {
              cause: writeResult.error,
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
function tooLargeForDownloadText(docPath, originalAsked, fileSizeBytes) {
  let limitText = `above the ${MAX_PROJECT_FILE_BYTES}-byte limit for in-session downloads`;
  let sizeText = fileSizeBytes === undefined ? `is ${limitText}` : `is ${fileSizeBytes} bytes, ${limitText}`;
  return originalAsked
    ? new ProjectsPreconditionError(
        `project_read: "${safeInline(docPath)}" ${sizeText}. So ${ORIGINAL_UNREADABLE_HINT}`,
        "project_original_too_large",
      )
    : new ProjectsPreconditionError(
        `project_read: "${safeInline(docPath)}" has no text extract and ${sizeText}; tell the user this file cannot be opened here.`,
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
async function projectReadMethod(
  projectUuid,
  docPath,
  projectFile,
  session,
  signal,
  storageV5,
  credentials,
  originalAsked,
) {
  let store = toolResultStoreOrNull();
  if (store?.maxBytes === 0)
    return {
      method: "project_read",
      path: docPath,
      file_kind: projectFile.file_kind,
      created_at: projectFile.created_at ?? null,
      notice: `"${safeInline(docPath)}" is a ${safeInline(projectFile.file_kind)} upload with no text extract, and this session does not keep files, so it was not downloaded; tell the user this file cannot be opened here.`,
    };
  let assertSizeOk = (fileSizeBytes) => {
    if (fileSizeBytes > MAX_PROJECT_FILE_BYTES)
      throw tooLargeForDownloadText(docPath, originalAsked, fileSizeBytes);
  };
  let downloadRequest = {
    projectUuid,
    path: docPath,
    fileUuid: projectFile.file_uuid,
    signal,
    credentials,
    originalAsked,
  };
  let download = await downloadProjectFile(downloadRequest);
  assertSizeOk(download.file_size_bytes);
  let buffer = Buffer.from(download.content_base64, "base64");
  if (buffer.byteLength !== download.file_size_bytes) {
    download = await downloadProjectFile(downloadRequest);
    assertSizeOk(download.file_size_bytes);
    buffer = Buffer.from(download.content_base64, "base64");
    if (buffer.byteLength !== download.file_size_bytes)
      throw Error(
        "project_read: downloaded bytes do not match the reported file size (corrupt response, or the file is being modified " +
          "concurrently \u2014 retry if a save was just issued).",
      );
  }
  if (download.uuid !== projectFile.file_uuid) throw Error("project_read: server returned a different file.");
  if (normalizeUuidOrNull(download.uuid) === null)
    throw Error("project_read: server returned a malformed file id.");
  let safeFileName =
    (download.file_name.split(/[/\\]/).pop() ?? "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-64)
      .replace(/^\.+/, "") || "file";
  let leafName = `project-file-${download.uuid}-${safeFileName}`;
  let describePrefix = `"${safeInline(docPath)}" is a ${safeInline(download.file_kind)} upload${originalAsked ? "" : " with no text extract"}; its original bytes (${download.file_size_bytes}) `;
  let savedPath;
  let unsavedNotice = `${describePrefix}could not be saved to a file this session can open; ${originalAsked ? ORIGINAL_UNREADABLE_HINT : "tell the user this file could not be opened."}`;
  if (store === undefined) savedPath = await saveProjectReadResult(leafName, buffer, session, storageV5);
  else if (buffer.byteLength > store.maxBytes) {
    savedPath = null;
    unsavedNotice = `${describePrefix}are more than this session keeps in one file (${store.maxBytes} bytes), so they were not saved; ${originalAsked ? ORIGINAL_UNREADABLE_HINT : "tell the user this file cannot be opened here."}`;
  } else {
    let saved = await saveResultSafely(store, {
      leafName,
      data: buffer,
    });
    savedPath = saved === null ? null : saved.path;
  }
  return {
    method: "project_read",
    path: docPath,
    file_kind: download.file_kind,
    ...(savedPath !== null && {
      local_file: savedPath,
    }),
    created_at: download.created_at ?? null,
    notice:
      savedPath !== null
        ? `${describePrefix}were saved to local_file. Open it with file-appropriate tooling.`
        : unsavedNotice,
  };
}
//@ chunk-eg496hkq.js:47769-47905 placement
async function saveProjectReadResult(leafName, buffer, session, storageV5) {
  let originalCwd = getOriginalCwd_2(session);
  let toolResultsPath = join(originalCwd, leafName);
  await ensureToolResultsDir(originalCwd, storageV5);
  if (await writeThroughStore(storageV5, originalCwd, leafName, buffer, "project_read"))
    return toolResultsPath;
  await writeToolResultFile(toolResultsPath, buffer, 384);
  return toolResultsPath;
}
//@ chunk-eg496hkq.js:47905-48017 placement
var PROJECT_REFRESH_MS = 600000;
var projectLackState = identity(
  {
    lackedUpdateAt: Number.NEGATIVE_INFINITY,
  },
  (state) => {
    state.lackedUpdateAt = Number.NEGATIVE_INFINITY;
  },
);
//@ chunk-eg496hkq.js:48017-49486 placement
async function fetchProjectWithFallback(
  projectUuid,
  docUuid,
  fileName,
  content,
  signal,
  supportsUpdate,
  credentials,
  ifVersion,
  useOriginal,
) {
  if (!supportsUpdate || Date.now() - projectLackState.lackedUpdateAt >= PROJECT_REFRESH_MS)
    try {
      return await updateProjectDoc(
        projectUuid,
        docUuid,
        content,
        signal,
        credentials,
        ifVersion,
        useOriginal,
      );
    } catch (error) {
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_stale")
        throw new ProjectsPreconditionError(PROJECT_CAPACITY_TEXT, "project_doc_stale");
      if (error instanceof ProjectsApiError && error.errorCode === "project_doc_too_large_to_replace")
        throw new ProjectsPreconditionError(DOC_TOO_LARGE_WRITE_REFUSAL, "project_doc_too_large_to_replace");
      if (
        supportsUpdate &&
        ifVersion !== undefined &&
        error instanceof ProjectsApiError &&
        error.status === 400 &&
        error.errorCode === undefined &&
        !isUnknownOpError(error)
      )
        throw new ProjectsPreconditionError(PROJECT_VERSION_MISMATCH_TEXT, "if_version_not_served");
      if (!supportsUpdate || !isUnknownOpError(error)) throw new ProjectSaveError(error, "doc_updated");
      projectLackState.lackedUpdateAt = Date.now();
    }
  if (signal.aborted) throw new AbortError();
  if (ifVersion !== undefined)
    throw new ProjectsPreconditionError(PROJECT_VERSION_MISMATCH_TEXT, "if_version_not_served");
  let newDoc = await createProjectDoc(projectUuid, fileName, content, undefined, credentials).catch(
    (error) => {
      throw new ProjectSaveError(error, "doc_beside_new");
    },
  );
  if (typeof newDoc?.uuid !== "string" || newDoc.uuid === docUuid)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `project_write: could not confirm that the new content was saved. Nothing was removed, so the project may now list this path twice. ${PROJECT_WRITE_RECOVERY_TEXT}`,
      "project_write could not confirm that the new content was saved",
    );
  try {
    await deleteProjectDoc(projectUuid, docUuid, undefined, credentials);
  } catch (error) {
    logForDebugging(`Projects: the replaced doc ${docUuid} could not be removed: ${errorMessage(error)}`, {
      level: "error",
    });
    throw Error(
      "project_write: the new content was saved, but the earlier copy of this doc may not have been removed, so the project may now list this path twice. project_read returns the new content. Do not repeat this write, and do not call project_delete: it would remove the new content, not the earlier copy. Tell the user that the earlier copy may need removing from the project in claude.ai.",
    );
  }
  return newDoc;
}
//@ chunk-eg496hkq.js:49486-49608 placement
function findProjectDoc(projectDetail, fileName) {
  let found = projectDetail.documents.find((doc) => doc.file_name === fileName);
  return found
    ? {
        uuid: found.uuid,
        created_at: found.created_at ?? null,
      }
    : undefined;
}
//@ chunk-eg496hkq.js:49608-49672 placement
function findProjectFile(projectDetail, fileName) {
  return (projectDetail.files ?? []).find((file) => file.file_name === fileName);
}
//@ chunk-eg496hkq.js:49672-49761 placement
function projectDocNames(projectDetail) {
  return projectDetail.documents.map((doc) => doc.file_name).filter((name) => typeof name === "string");
}
//@ chunk-eg496hkq.js:49761-49851 placement
function projectFileNames(projectDetail) {
  return (projectDetail.files ?? []).map((file) => file.file_name).filter((name) => typeof name === "string");
}
//@ chunk-eg496hkq.js:49851-50417 placement
function notFoundInProjectText(projectDetail, docPath, method) {
  let mapped = [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)].map(safeInline);
  let availableText =
    mapped.length > 0
      ? ` Available: ${mapped.slice(0, 30).join(", ")}${mapped.length > 30 ? `, \u2026 and ${mapped.length - 30} more` : ""}`
      : " The project has no docs or files.";
  if (method === "project_read" && (projectDetail.sync_sources ?? []).length > 0)
    availableText =
      mapped.length > 0
        ? `${availableText}. Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.`
        : " Files from the project's synced sources, such as GitHub or Google Drive, are not listed and cannot be read by name here.";
  return new ProjectsPreconditionError(`No doc or file at "${safeInline(docPath)}".${availableText}`);
}
//@ chunk-eg496hkq.js:50417-50662 placement
function notFoundInFilesText(memory, docPath) {
  let mapped = memory.files.map((file) => safeInline(file.path));
  let availableText =
    mapped.length > 0
      ? ` Available: ${mapped.slice(0, 30).join(", ")}${mapped.length > 30 ? `, \u2026 and ${mapped.length - 30} more` : ""}`
      : " The project has no memory files.";
  return new ProjectsPreconditionError(`No memory file at "${safeInline(docPath)}".${availableText}`);
}
//@ chunk-eg496hkq.js:50662-51089 placement
function assertProjectMemoryAvailable(isBridgeSession) {
  if (isBridgeSession)
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
function requireField(value, fieldName, method) {
  if (value === undefined) throw new ProjectsPreconditionError(`${method} requires "${fieldName}"`);
  return value;
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
