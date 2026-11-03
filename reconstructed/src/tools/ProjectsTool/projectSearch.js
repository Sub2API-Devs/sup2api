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
  e,
  projectUuid,
  session,
  signal,
  storageV5,
  credentials,
  w,
  m,
  y,
  permissions,
  x,
  b,
  L,
  W,
) {
  let V = isSessionJwtAuth();
  switch (e.method) {
    case "project_info": {
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      return {
        method: "project_info",
        ...(await W(projectDetail)),
        docs: projectDetail.documents.flatMap((S) =>
          S.file_name !== null
            ? [
                {
                  path: S.file_name,
                  created_at: S.created_at ?? null,
                },
              ]
            : [],
        ),
        files: (projectDetail.files ?? []).flatMap((S) =>
          S.file_name !== null
            ? [
                {
                  path: S.file_name,
                  file_kind: S.file_kind,
                  created_at: S.created_at ?? null,
                },
              ]
            : [],
        ),
        sync_sources: (projectDetail.sync_sources ?? []).map((S) => ({
          type: S.type,
          config: S.config,
        })),
        knowledge: {
          knowledge_size: projectDetail.knowledge_stats.knowledge_size,
          max_knowledge_size: projectDetail.knowledge_stats.max_knowledge_size,
        },
      };
    }
    case "project_read": {
      let R = requireField(e.path, "path", e.method);
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let O = matchUnicodeName(R, [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)], w);
      let projectDoc = findProjectDoc(projectDetail, O);
      if (!projectDoc) {
        let projectFile = findProjectFile(projectDetail, O);
        if (!projectFile) throw notFoundInProjectText(projectDetail, O, e.method);
        let q = projectFile.file_kind === "document" && e.original === true && isLocalUploadsEnabled();
        if (projectFile.file_kind === "document" && !q) {
          let projectFileText = await readProjectFileText(
            projectUuid,
            projectFile.file_uuid,
            signal,
            credentials,
          );
          if (projectFileText.file_kind === "document" && projectFileText.content.trim() !== "")
            return readProjectDocContent(
              O,
              projectFileText.content,
              projectFile.file_uuid,
              session,
              {
                file_kind: projectFileText.file_kind,
                created_at: projectFileText.created_at ?? null,
              },
              storageV5,
              m(),
              null,
              y,
            );
        }
        return projectReadMethod(projectUuid, O, projectFile, session, signal, storageV5, credentials, q);
      }
      let projectDoc_2 = await readProjectDoc(projectUuid, projectDoc.uuid, signal, credentials);
      return readProjectDocContent(
        O,
        projectDoc_2.content,
        projectDoc.uuid,
        session,
        {
          created_at: projectDoc_2.created_at ?? null,
        },
        storageV5,
        m(),
        projectDoc_2.estimated_token_count,
        y,
        docVersionsOffered() ? computeContentHash(projectDoc_2.content) : undefined,
      );
    }
    case "project_search": {
      let R = requireField(e.query, "query", e.method);
      let S = e.n ?? 5;
      try {
        let O = await searchProjectKnowledge(projectUuid, R, S, signal, credentials);
        return {
          method: "project_search",
          rag: true,
          hits: extractSearchResults(O),
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
      let R = requireField(e.path, "path", e.method);
      let content =
        e.local_path !== undefined
          ? x !== undefined
            ? await readLocalPathForWrite(e.local_path, x, permissions(), signal)
            : await writeFromLocalUploads(e.local_path, permissions, b)
          : requireField(e.content, "content", e.method);
      if (content.includes("\x00"))
        throw preconditionError(
          "Write refused; nothing in the project was changed. The content contains NUL bytes, which project docs cannot store (usually a binary or UTF-16 file). Convert it to UTF-8 text (re-encode UTF-16, extract the text from a binary, or remove the NUL bytes), then write again.",
          "content_has_nul",
        );
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let { path, listed } = resolveListedPath(
        R,
        projectDocNames(projectDetail),
        projectFileNames(projectDetail),
        w,
      );
      let projectDoc = findProjectDoc(projectDetail, listed);
      if (!projectDoc)
        assertKnowledgeCapacity(projectDetail.knowledge_stats, Buffer.byteLength(content, "utf8"));
      if (
        projectDoc &&
        e.local_path === undefined &&
        L !== undefined &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_lovely_rain", false)
      ) {
        let te = await readProjectDoc(projectUuid, projectDoc.uuid, signal, credentials).catch((error) => {
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Write not done; nothing in the project was changed. Before it replaces a doc, this tool reads the doc's current text, and that read failed: ${errorMessage(error).replace(/[.\s]*$/, "")}. Try the same write once more. Do not delete the doc to retry: this tool cannot undo a delete. If it fails again, tell the user that the content was not saved, and offer it to them another way.`,
            "project_write could not read the doc it would replace",
          );
        });
        let Z = L(te.content);
        let ne = Buffer.byteLength(te.content, "utf8");
        let ke = Buffer.byteLength(content, "utf8");
        logEvent("tengu_projects_write_text_in_view", {
          outcome: fromEnum(Z.inView ? "in_view" : "not_in_view"),
          found_in: fromEnum(Z.foundIn),
          shrank: 4 * ke < 3 * ne,
          old_bytes: ne,
          new_bytes: ke,
          via_ccr_bridge: V,
        });
        if (!Z.inView)
          throw new ProjectsPreconditionError(PROJECT_UNCERTAIN_WRITE_TEXT, "write_over_a_doc_not_in_view");
      }
      let q = await (
        projectDoc
          ? fetchProjectWithFallback(
              projectUuid,
              projectDoc.uuid,
              listed,
              content,
              signal,
              V,
              credentials,
              e.if_version,
              e.local_path === undefined && getFeatureValue_CACHED_MAY_BE_STALE("tengu_toasty_owl", false)
                ? MAX_PROJECT_FILE_CHUNK_BYTES
                : undefined,
            )
          : createProjectDoc(projectUuid, path, content, signal, credentials).catch((error) => {
              throw new ProjectSaveError(error, "no_doc");
            })
      ).finally(forgetKeptProjectDetail);
      let G = {
        method: "project_write",
        path,
        doc_uuid: q.uuid,
        ...(docVersionsOffered() && {
          version: computeContentHash(content),
        }),
        replaced: projectDoc !== undefined,
        present_to_user: e.present_to_user ?? false,
        ...(e.local_path !== undefined
          ? {
              local_path: resolveLocalPath(e.local_path),
            }
          : {}),
      };
      if (projectDoc && docVersionsOffered())
        logFeatureOk("projects_tool_if_version", {
          sent: e.if_version !== undefined,
        });
      if (e.local_path !== undefined)
        logWriteByLocalPath("saved", x, {
          replaced: projectDoc !== undefined,
          savedBytes: Buffer.byteLength(content, "utf8"),
        });
      return G;
    }
    case "project_delete": {
      let R = requireField(e.path, "path", e.method);
      let projectDetail = await getProjectDetail(projectUuid, signal, credentials);
      let respelledName = resolveRespelledName(
        R,
        [...projectDocNames(projectDetail), ...projectFileNames(projectDetail)],
        ["NFD"],
        w,
      );
      let projectDoc = findProjectDoc(projectDetail, respelledName);
      if (!projectDoc) {
        if (findProjectFile(projectDetail, respelledName))
          throw Error(
            `"${safeInline(R)}" is a file upload; project_delete only removes text docs. File uploads can be removed from the project in claude.ai.`,
          );
        throw notFoundInProjectText(projectDetail, R, e.method);
      }
      await deleteProjectDoc(projectUuid, projectDoc.uuid, signal, credentials).finally(
        forgetKeptProjectDetail,
      );
      return {
        method: "project_delete",
        path: R,
        deleted: true,
        notice: PROJECT_DELETE_REFUSED_TEXT,
      };
    }
    case "project_memory_list": {
      assertProjectMemoryAvailable(V);
      let R = await raceWithAbortSignal(
        getProjectMemory(projectUuid, credentials),
        signal,
        () => new AbortError(),
      );
      if (R === null)
        return {
          method: "project_memory_list",
          files: [],
          truncated: false,
          notice: PROJECT_MEMORY_UNAVAILABLE_TEXT,
        };
      let sliced = R.files.slice(0, PROJECT_MEMORY_LIST_LIMIT);
      let O = R.files.length - sliced.length;
      return {
        method: "project_memory_list",
        files: sliced.map((z) => ({
          path: z.path,
          size_bytes: z.size_bytes,
          updated_at: z.updated_at,
          truncated: z.truncated,
        })),
        truncated: O > 0 || R.truncated,
        notice: [
          PROJECT_MEMORY_STALENESS_NOTE,
          ...(O > 0
            ? [
                `Showing the first ${sliced.length} of ${R.files.length} memory files; there is no way to list the rest in this session.`,
              ]
            : R.truncated
              ? ["More memory files exist than the server returned."]
              : []),
        ].join(" "),
      };
    }
    case "project_memory_read": {
      assertProjectMemoryAvailable(V);
      let R = requireField(e.path, "path", e.method);
      let S = await raceWithAbortSignal(
        getProjectMemory(projectUuid, credentials),
        signal,
        () => new AbortError(),
      );
      if (S === null) throw new ProjectsPreconditionError(PROJECT_MEMORY_UNAVAILABLE_TEXT);
      let found = S.files.find((file) => file.path === R);
      if (found === undefined) throw notFoundInFilesText(S, R);
      let z = createHash("sha256").update(R).digest("hex");
      let P = await projectTextOrDownload(found.content, "project-memory", z, session, storageV5);
      return {
        method: "project_memory_read",
        path: found.path,
        ...P,
        size_bytes: found.size_bytes,
        updated_at: found.updated_at,
        truncated: found.truncated,
        notice: [
          PROJECT_MEMORY_STALENESS_NOTE,
          ...("notice" in P && P.notice !== undefined ? [P.notice] : []),
          ...(found.truncated
            ? ["Only the first part of this file is returned: the server cut it at its size cap."]
            : []),
        ].join(" "),
      };
    }
  }
}
//@ chunk-eg496hkq.js:56595-57051 placement
function extractSearchResults(e) {
  if (e === null || typeof e !== "object") return [];
  let n = e;
  let r = [];
  for (let s of ["text_results", "rich_content_results"]) {
    let l = n[s];
    if (!Array.isArray(l)) continue;
    for (let h of l) {
      if (h === null || typeof h !== "object") continue;
      let w = h;
      let chunk = w.chunk !== null && typeof w.chunk === "object" ? w.chunk : undefined;
      r.push({
        name: typeof w.name === "string" ? w.name : undefined,
        doc_uuid: typeof w.doc_uuid === "string" ? w.doc_uuid : undefined,
        text: chunk && typeof chunk.text === "string" ? chunk.text : undefined,
      });
    }
  }
  return r;
}
export { runProjectsMethod };
