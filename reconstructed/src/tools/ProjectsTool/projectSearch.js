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
  OQe,
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
  Ge,
  PROJECT_MEMORY_LIST_LIMIT,
  Ye,
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
  Lt,
  ProjectSaveError,
  logWriteByLocalPath,
  Bt,
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

/**
 * Projects 工具按 method 分派到 info/read/search/write/delete/memory 等具体实现。
 */
//@ chunk-eg496hkq.js:51502-56595 placement
async function runProjectsMethod(e, n, r, s, l, h, w, m, y, j, x, b, L, W) {
  let V = isSessionJwtAuth();
  switch (e.method) {
    case "project_info": {
      let R = await getProjectDetail(n, s, h);
      return {
        method: "project_info",
        ...(await W(R)),
        docs: R.documents.flatMap((S) =>
          S.file_name !== null ? [{ path: S.file_name, created_at: S.created_at ?? null }] : [],
        ),
        files: (R.files ?? []).flatMap((S) =>
          S.file_name !== null
            ? [{ path: S.file_name, file_kind: S.file_kind, created_at: S.created_at ?? null }]
            : [],
        ),
        sync_sources: (R.sync_sources ?? []).map((S) => ({ type: S.type, config: S.config })),
        knowledge: {
          knowledge_size: R.knowledge_stats.knowledge_size,
          max_knowledge_size: R.knowledge_stats.max_knowledge_size,
        },
      };
    }
    case "project_read": {
      let R = requireField(e.path, "path", e.method),
        S = await getProjectDetail(n, s, h),
        O = matchUnicodeName(R, [...projectDocNames(S), ...projectFileNames(S)], w),
        z = findProjectDoc(S, O);
      if (!z) {
        let I = findProjectFile(S, O);
        if (!I) throw notFoundInProjectText(S, O, e.method);
        let q = I.file_kind === "document" && e.original === !0 && isLocalUploadsEnabled();
        if (I.file_kind === "document" && !q) {
          let G = await readProjectFileText(n, I.file_uuid, s, h);
          if (G.file_kind === "document" && G.content.trim() !== "")
            return readProjectDocContent(
              O,
              G.content,
              I.file_uuid,
              r,
              { file_kind: G.file_kind, created_at: G.created_at ?? null },
              l,
              m(),
              null,
              y,
            );
        }
        return projectReadMethod(n, O, I, r, s, l, h, q);
      }
      let P = await readProjectDoc(n, z.uuid, s, h);
      return readProjectDocContent(
        O,
        P.content,
        z.uuid,
        r,
        { created_at: P.created_at ?? null },
        l,
        m(),
        P.estimated_token_count,
        y,
        docVersionsOffered() ? computeContentHash(P.content) : void 0,
      );
    }
    case "project_search": {
      let R = requireField(e.query, "query", e.method),
        S = e.n ?? 5;
      try {
        let O = await searchProjectKnowledge(n, R, S, s, h);
        return { method: "project_search", rag: !0, hits: extractSearchResults(O) };
      } catch (error) {
        if (error instanceof ProjectsApiError && error.status === 403) {
          let z = await getProjectDetail(n, s, h);
          return { method: "project_search", rag: !1, docs: projectDocNames(z) };
        }
        throw error;
      }
    }
    case "project_write": {
      let R = requireField(e.path, "path", e.method),
        S =
          e.local_path !== void 0
            ? x !== void 0
              ? await readLocalPathForWrite(e.local_path, x, j(), s)
              : await writeFromLocalUploads(e.local_path, j, b)
            : requireField(e.content, "content", e.method);
      if (S.includes("\x00"))
        throw preconditionError(
          "Write refused; nothing in the project was changed. The content contains NUL bytes, which project docs cannot store (usually a binary or UTF-16 file). Convert it to UTF-8 text (re-encode UTF-16, extract the text from a binary, or remove the NUL bytes), then write again.",
          "content_has_nul",
        );
      let O = await getProjectDetail(n, s, h),
        { path: path, listed: listed } = resolveListedPath(R, projectDocNames(O), projectFileNames(O), w),
        I = findProjectDoc(O, listed);
      if (!I) assertKnowledgeCapacity(O.knowledge_stats, Buffer.byteLength(S, "utf8"));
      if (
        I &&
        e.local_path === void 0 &&
        L !== void 0 &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_lovely_rain", !1)
      ) {
        let te = await readProjectDoc(n, I.uuid, s, h).catch((pt) => {
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Write not done; nothing in the project was changed. Before it replaces a doc, this tool reads the doc's current text, and that read failed: ${errorMessage(pt).replace(/[.\s]*$/, "")}. Try the same write once more. Do not delete the doc to retry: this tool cannot undo a delete. If it fails again, tell the user that the content was not saved, and offer it to them another way.`,
              "project_write could not read the doc it would replace",
            );
          }),
          Z = L(te.content),
          byteLength = Buffer.byteLength(te.content, "utf8"),
          byteLength_2 = Buffer.byteLength(S, "utf8");
        if (
          (logEvent("tengu_projects_write_text_in_view", {
            outcome: fromEnum(Z.inView ? "in_view" : "not_in_view"),
            found_in: fromEnum(Z.foundIn),
            shrank: 4 * byteLength_2 < 3 * byteLength,
            old_bytes: byteLength,
            new_bytes: byteLength_2,
            via_ccr_bridge: V,
          }),
          !Z.inView)
        )
          throw new ProjectsPreconditionError(Lt, "write_over_a_doc_not_in_view");
      }
      let q = await (
          I
            ? fetchProjectWithFallback(
                n,
                I.uuid,
                listed,
                S,
                s,
                V,
                h,
                e.if_version,
                e.local_path === void 0 && getFeatureValue_CACHED_MAY_BE_STALE("tengu_toasty_owl", !1)
                  ? OQe
                  : void 0,
              )
            : createProjectDoc(n, path, S, s, h).catch((te) => {
                throw new ProjectSaveError(te, "no_doc");
              })
        ).finally(forgetKeptProjectDetail),
        G = {
          method: "project_write",
          path: path,
          doc_uuid: q.uuid,
          ...(docVersionsOffered() && { version: computeContentHash(S) }),
          replaced: I !== void 0,
          present_to_user: e.present_to_user ?? !1,
          ...(e.local_path !== void 0 ? { local_path: resolveLocalPath(e.local_path) } : {}),
        };
      if (I && docVersionsOffered())
        logFeatureOk("projects_tool_if_version", { sent: e.if_version !== void 0 });
      if (e.local_path !== void 0)
        logWriteByLocalPath("saved", x, { replaced: I !== void 0, savedBytes: Buffer.byteLength(S, "utf8") });
      return G;
    }
    case "project_delete": {
      let R = requireField(e.path, "path", e.method),
        S = await getProjectDetail(n, s, h),
        O = resolveRespelledName(R, [...projectDocNames(S), ...projectFileNames(S)], ["NFD"], w),
        z = findProjectDoc(S, O);
      if (!z) {
        if (findProjectFile(S, O))
          throw Error(
            `"${safeInline(R)}" is a file upload; project_delete only removes text docs. File uploads can be removed from the project in claude.ai.`,
          );
        throw notFoundInProjectText(S, R, e.method);
      }
      return (
        await deleteProjectDoc(n, z.uuid, s, h).finally(forgetKeptProjectDetail),
        { method: "project_delete", path: R, deleted: !0, notice: Bt }
      );
    }
    case "project_memory_list": {
      assertProjectMemoryAvailable(V);
      let R = await raceWithAbortSignal(getProjectMemory(n, h), s, () => new AbortError());
      if (R === null) return { method: "project_memory_list", files: [], truncated: !1, notice: Ge };
      let sliced = R.files.slice(0, PROJECT_MEMORY_LIST_LIMIT),
        O = R.files.length - sliced.length;
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
          Ye,
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
      let R = requireField(e.path, "path", e.method),
        S = await raceWithAbortSignal(getProjectMemory(n, h), s, () => new AbortError());
      if (S === null) throw new ProjectsPreconditionError(Ge);
      let found = S.files.find((file) => file.path === R);
      if (found === void 0) throw notFoundInFilesText(S, R);
      let digest = createHash("sha256").update(R).digest("hex"),
        P = await projectTextOrDownload(found.content, "project-memory", digest, r, l);
      return {
        method: "project_memory_read",
        path: found.path,
        ...P,
        size_bytes: found.size_bytes,
        updated_at: found.updated_at,
        truncated: found.truncated,
        notice: [
          Ye,
          ...("notice" in P && P.notice !== void 0 ? [P.notice] : []),
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
  let n = e,
    r = [];
  for (let s of ["text_results", "rich_content_results"]) {
    let l = n[s];
    if (!Array.isArray(l)) continue;
    for (let h of l) {
      if (h === null || typeof h !== "object") continue;
      let w = h,
        m = w.chunk !== null && typeof w.chunk === "object" ? w.chunk : void 0;
      r.push({
        name: typeof w.name === "string" ? w.name : void 0,
        doc_uuid: typeof w.doc_uuid === "string" ? w.doc_uuid : void 0,
        text: m && typeof m.text === "string" ? m.text : void 0,
      });
    }
  }
  return r;
}

export { runProjectsMethod };
