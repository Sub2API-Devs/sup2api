/**
 * tools/ProjectsTool/projectSearch.ts
 *
 * 2.1.316 新增：Projects 工具方法分派与搜索结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (2)
 * attribution: placement 2
 */
import { createHash } from "crypto";
import {
  isSessionJwtAuth,
  getProjectDetail,
  readProjectFileText,
  readProjectDoc,
  searchProjectKnowledge,
  ProjectsApiError,
  MAX_PROJECT_FILE_CHUNK_BYTES,
  createProjectDoc,
  deleteProjectDoc,
  getProjectMemory,
} from "../../services/projects/projectMemory.js";
import {
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
} from "./projectRead.js";
import { matchUnicodeName, resolveListedPath, resolveRespelledName } from "./ProjectsTool.js";
import { isLocalUploadsEnabled, resolveLocalPath } from "./inputSchema.js";
import {
  docVersionsOffered,
  forgetKeptProjectDetail,
  safeInline,
} from "../../services/projects/projectContext.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import {
  readLocalPathForWrite,
  writeFromLocalUploads,
  preconditionError,
  assertKnowledgeCapacity,
  PROJECT_UNCERTAIN_WRITE_TEXT,
  ProjectSaveError,
  logWriteByLocalPath,
  PROJECT_DELETE_REFUSED_TEXT,
} from "./projectWrite.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  AbortError,
} from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ProjectsPreconditionError } from "./projectsAuth.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";

//@ chunk-eg496hkq.js:51502-56595 placement
/**
 * Projects 工具按 method 分派到 info/read/search/write/delete/memory 等具体实现。
 */
async function runProjectsMethod(
  input,
  projectUuid,
  session,
  signal,
  storageV5,
  credentials,
  nameMatcher,
  getTokenBudget,
  formatLongLineNote,
  permissions,
  host,
  readFileState,
  findDocInView,
  getProjectInfo,
) {
  let isBridge = isSessionJwtAuth();
  switch (input.method) {
    case "project_info": {
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      return {
        method: "project_info",
        ...(await getProjectInfo(projectDetail)),
        docs: projectDetail.documents.flatMap((doc) =>
          doc.file_name !== null
            ? [
                {
                  path: doc.file_name,
                  created_at: doc.created_at ?? null,
                },
              ]
            : [],
        ),
        files: (projectDetail.files ?? []).flatMap((file) =>
          file.file_name !== null
            ? [
                {
                  path: file.file_name,
                  file_kind: file.file_kind,
                  created_at: file.created_at ?? null,
                },
              ]
            : [],
        ),
        sync_sources: (projectDetail.sync_sources ?? []).map((source) => ({
          type: source.type,
          config: source.config,
        })),
        knowledge: {
          knowledge_size: projectDetail.knowledge_stats.knowledge_size,
          max_knowledge_size: projectDetail.knowledge_stats.max_knowledge_size,
        },
      };
    }
    case "project_read": {
      let docPath = requireField(input.path, "path", input.method);
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let resolvedName = matchUnicodeName(
        docPath,
        [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)],
        nameMatcher,
      );
      let projectDoc = findProjectDoc(projectDetail, resolvedName);
      if (!projectDoc) {
        let projectFile = findProjectFile(projectDetail, resolvedName);
        if (!projectFile) throw notFoundInProjectText(projectDetail, resolvedName, input.method);
        let wantOriginal =
          projectFile.file_kind === "document" && input.original === true && isLocalUploadsEnabled();
        if (projectFile.file_kind === "document" && !wantOriginal) {
          let projectFileText = await readProjectFileText(
            projectUuid,
            projectFile.file_uuid,
            signal,
            credentials,
          );
          if (projectFileText.file_kind === "document" && projectFileText.content.trim() !== "")
            return readProjectDocContent(
              resolvedName,
              projectFileText.content,
              projectFile.file_uuid,
              session,
              {
                file_kind: projectFileText.file_kind,
                created_at: projectFileText.created_at ?? null,
              },
              storageV5,
              getTokenBudget(),
              null,
              formatLongLineNote,
            );
        }
        return projectReadMethod(
          projectUuid,
          resolvedName,
          projectFile,
          session,
          signal,
          storageV5,
          credentials,
          wantOriginal,
        );
      }
      let projectDoc_2 = await readProjectDoc(projectUuid, projectDoc.uuid, signal, credentials);
      return readProjectDocContent(
        resolvedName,
        projectDoc_2.content,
        projectDoc.uuid,
        session,
        {
          created_at: projectDoc_2.created_at ?? null,
        },
        storageV5,
        getTokenBudget(),
        projectDoc_2.estimated_token_count,
        formatLongLineNote,
        docVersionsOffered() ? computeContentHash(projectDoc_2.content) : undefined,
      );
    }
    case "project_search": {
      let query = requireField(input.query, "query", input.method);
      let maxResults = input.n ?? 5;
      try {
        let searchResponse = await searchProjectKnowledge(
          projectUuid,
          query,
          maxResults,
          signal,
          credentials,
        );
        return {
          method: "project_search",
          rag: true,
          hits: extractSearchResults(searchResponse),
        };
      } catch (error) {
        if (error instanceof ProjectsApiError && error.status === 403) {
          let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
          return {
            method: "project_search",
            rag: false,
            docs: projectDocNames(projectDetail),
          };
        }
        throw error;
      }
    }
    case "project_write": {
      let docPath = requireField(input.path, "path", input.method);
      let content =
        input.local_path !== undefined
          ? host !== undefined
            ? await readLocalPathForWrite(input.local_path, host, permissions(), signal)
            : await writeFromLocalUploads(input.local_path, permissions, readFileState)
          : requireField(input.content, "content", input.method);
      if (content.includes("\x00"))
        throw preconditionError(
          "Write refused; nothing in the project was changed. The content contains NUL bytes, which project docs cannot store (usually a binary or UTF-16 file). Convert it to UTF-8 text (re-encode UTF-16, extract the text from a binary, or remove the NUL bytes), then write again.",
          "content_has_nul",
        );
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let { path, listed } = resolveListedPath(
        docPath,
        projectDocNames(projectDetail),
        projectFileNames(projectDetail),
        nameMatcher,
      );
      let projectDoc = findProjectDoc(projectDetail, listed);
      if (!projectDoc)
        assertKnowledgeCapacity(projectDetail.knowledge_stats, Buffer.byteLength(content, "utf8"));
      if (
        projectDoc &&
        input.local_path === undefined &&
        findDocInView !== undefined &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_lovely_rain", false)
      ) {
        let existingDoc = await readProjectDoc(projectUuid, projectDoc.uuid, signal, credentials).catch(
          (error) => {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Write not done; nothing in the project was changed. Before it replaces a doc, this tool reads the doc's current text, and that read failed: ${errorMessage(error).replace(/[.\s]*$/, "")}. Try the same write once more. Do not delete the doc to retry: this tool cannot undo a delete. If it fails again, tell the user that the content was not saved, and offer it to them another way.`,
              "project_write could not read the doc it would replace",
            );
          },
        );
        let viewCheck = findDocInView(existingDoc.content);
        let oldBytes = Buffer.byteLength(existingDoc.content, "utf8");
        let newBytes = Buffer.byteLength(content, "utf8");
        logEvent("tengu_projects_write_text_in_view", {
          outcome: fromEnum(viewCheck.inView ? "in_view" : "not_in_view"),
          found_in: fromEnum(viewCheck.foundIn),
          shrank: 4 * newBytes < 3 * oldBytes,
          old_bytes: oldBytes,
          new_bytes: newBytes,
          via_ccr_bridge: isBridge,
        });
        if (!viewCheck.inView)
          throw new ProjectsPreconditionError(PROJECT_UNCERTAIN_WRITE_TEXT, "write_over_a_doc_not_in_view");
      }
      let savedDoc = await (
        projectDoc
          ? fetchProjectWithFallback(
              projectUuid,
              projectDoc.uuid,
              listed,
              content,
              signal,
              isBridge,
              credentials,
              input.if_version,
              input.local_path === undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_toasty_owl", false)
                ? MAX_PROJECT_FILE_CHUNK_BYTES
                : undefined,
            )
          : createProjectDoc(projectUuid, path, content, signal, credentials).catch((error) => {
              throw new ProjectSaveError(error, "no_doc");
            })
      ).finally(forgetKeptProjectDetail);
      let writeResult = {
        method: "project_write",
        path,
        doc_uuid: savedDoc.uuid,
        ...(docVersionsOffered() && {
          version: computeContentHash(content),
        }),
        replaced: projectDoc !== undefined,
        present_to_user: input.present_to_user ?? false,
        ...(input.local_path !== undefined
          ? {
              local_path: resolveLocalPath(input.local_path),
            }
          : {}),
      };
      if (projectDoc && docVersionsOffered())
        logFeatureOk("projects_tool_if_version", {
          sent: input.if_version !== undefined,
        });
      if (input.local_path !== undefined)
        logWriteByLocalPath("saved", host, {
          replaced: projectDoc !== undefined,
          savedBytes: Buffer.byteLength(content, "utf8"),
        });
      return writeResult;
    }
    case "project_delete": {
      let docPath = requireField(input.path, "path", input.method);
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let fileName = resolveRespelledName(
        docPath,
        [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)],
        ["NFD"],
        nameMatcher,
      );
      let projectDoc = findProjectDoc(projectDetail, fileName);
      if (!projectDoc) {
        if (findProjectFile(projectDetail, fileName))
          throw Error(
            `"${safeInline(docPath)}" is a file upload; project_delete only removes text docs. File uploads can be removed from the project in claude.ai.`,
          );
        throw notFoundInProjectText(projectDetail, docPath, input.method);
      }
      await deleteProjectDoc(projectUuid, projectDoc.uuid, signal, credentials).finally(
        forgetKeptProjectDetail,
      );
      return {
        method: "project_delete",
        path: docPath,
        deleted: true,
        notice: PROJECT_DELETE_REFUSED_TEXT,
      };
    }
    case "project_memory_list": {
      assertProjectMemoryAvailable(isBridge);
      let memory = await raceWithAbortSignal(
        getProjectMemory(projectUuid, credentials),
        signal,
        () => new AbortError(),
      );
      if (memory === null)
        return {
          method: "project_memory_list",
          files: [],
          truncated: false,
          notice: PROJECT_MEMORY_UNAVAILABLE_TEXT,
        };
      let sliced = memory.files.slice(0, PROJECT_MEMORY_LIST_LIMIT);
      let hiddenCount = memory.files.length - sliced.length;
      return {
        method: "project_memory_list",
        files: sliced.map((file) => ({
          path: file.path,
          size_bytes: file.size_bytes,
          updated_at: file.updated_at,
          truncated: file.truncated,
        })),
        truncated: hiddenCount > 0 || memory.truncated,
        notice: [
          PROJECT_MEMORY_STALENESS_NOTE,
          ...(hiddenCount > 0
            ? [
                `Showing the first ${sliced.length} of ${memory.files.length} memory files; there is no way to list the rest in this session.`,
              ]
            : memory.truncated
              ? ["More memory files exist than the server returned."]
              : []),
        ].join(" "),
      };
    }
    case "project_memory_read": {
      assertProjectMemoryAvailable(isBridge);
      let docPath = requireField(input.path, "path", input.method);
      let memory = await raceWithAbortSignal(
        getProjectMemory(projectUuid, credentials),
        signal,
        () => new AbortError(),
      );
      if (memory === null) throw new ProjectsPreconditionError(PROJECT_MEMORY_UNAVAILABLE_TEXT);
      let found = memory.files.find((file) => file.path === docPath);
      if (found === undefined) throw notFoundInFilesText(memory, docPath);
      let pathHash = createHash("sha256").update(docPath).digest("hex");
      let textResult = await projectTextOrDownload(
        found.content,
        "project-memory",
        pathHash,
        session,
        storageV5,
      );
      return {
        method: "project_memory_read",
        path: found.path,
        ...textResult,
        size_bytes: found.size_bytes,
        updated_at: found.updated_at,
        truncated: found.truncated,
        notice: [
          PROJECT_MEMORY_STALENESS_NOTE,
          ...("notice" in textResult && textResult.notice !== undefined ? [textResult.notice] : []),
          ...(found.truncated
            ? ["Only the first part of this file is returned: the server cut it at its size cap."]
            : []),
        ].join(" "),
      };
    }
  }
}
//@ chunk-eg496hkq.js:56595-57051 placement
function extractSearchResults(response) {
  if (response === null || typeof response !== "object") return [];
  let body = response;
  let hits = [];
  for (let listKey of ["text_results", "rich_content_results"]) {
    let results = body[listKey];
    if (!Array.isArray(results)) continue;
    for (let entry of results) {
      if (entry === null || typeof entry !== "object") continue;
      let entryObject = entry;
      let chunk =
        entryObject.chunk !== null && typeof entryObject.chunk === "object" ? entryObject.chunk : undefined;
      hits.push({
        name: typeof entryObject.name === "string" ? entryObject.name : undefined,
        doc_uuid: typeof entryObject.doc_uuid === "string" ? entryObject.doc_uuid : undefined,
        text: chunk && typeof chunk.text === "string" ? chunk.text : undefined,
      });
    }
  }
  return hits;
}
export { runProjectsMethod };
