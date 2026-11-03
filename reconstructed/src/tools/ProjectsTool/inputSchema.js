/**
 * tools/ProjectsTool/inputSchema.ts
 *
 * 2.1.316 新增：Projects 工具输入结构
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (11)
 * attribution: placement 11
 */
import { resolve, isAbsolute } from "path";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { SessionRootSlot, isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { getRootSession, getOriginalCwdOrNull } from "../../bootstrap/state.js";
import { Us } from "../../services/projects/threadRows.js";
import { isBareModeAttachmentDropped } from "../../utils/messages/apiNormalization.js";
import { trackedProjectReads } from "./readTracking.js";
import { safeParseJSON } from "../../utils/json.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { zodStrictObject, U, o, M, E, u, Ir, T, A, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { dy } from "../../utils/toolResultStorage.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";

//@ chunk-eg496hkq.js:12864-13067 placement
var ORIGINAL_UNAVAILABLE_NOTE = "Note: `original` is not available in this session and was ignored.",
  IF_VERSION_UNAVAILABLE_NOTE =
    "Note: `if_version` is not available in this session and was ignored: this call did not check whether the doc had changed.";
//@ chunk-eg496hkq.js:13067-13546 placement
function validateProjectWriteFlags(
  e,
  { originalOffered: originalOffered, docVersionsOffered: docVersionsOffered },
) {
  if (!isPlainObject(e)) return null;
  let s = typeof e.force === "boolean",
    l = !originalOffered && "original" in e,
    h = !docVersionsOffered && "if_version" in e;
  if (!s && !l && !h) return null;
  let w = { ...e },
    m = [];
  if (s) (delete w.force, m.push("legacy_force"));
  if (l) (delete w.original, m.push("original_while_off"));
  if (h) (delete w.if_version, m.push("if_version_while_off"));
  let y = [
    ...(l && e.original === !0 ? [ORIGINAL_UNAVAILABLE_NOTE] : []),
    ...(h ? [IF_VERSION_UNAVAILABLE_NOTE] : []),
  ];
  return {
    input: w,
    shapeClass: m.join("+"),
    ...(y.length > 0 && {
      resultNote: y.join(`
`),
    }),
  };
}
//@ chunk-eg496hkq.js:13546-13570 placement
var PROJECT_HOST_STATE = new SessionRootSlot(() => ({}));
//@ chunk-eg496hkq.js:13570-13619 placement
function hasProjectHost() {
  return PROJECT_HOST_STATE.peek(getRootSession())?.host !== void 0;
}
//@ chunk-eg496hkq.js:13619-14834 placement
function findProjectDocInView(e, n, r, s) {
  if (n === "") return { inView: !0, foundIn: "none" };
  let l = Us(e),
    h;
  if (s !== void 0) {
    for (let m of l)
      if (
        m.type === "assistant" &&
        Array.isArray(m.message.content) &&
        m.message.content.some((y) => y.type === "tool_use" && y.id === s)
      ) {
        h = m.message.id;
        break;
      }
  }
  let w = new Set();
  for (let m of l) {
    if (isNonConversationMessage(m)) continue;
    if (
      m.type === "attachment" &&
      m.attachment.type === "project_doc_reads" &&
      !isBareModeAttachmentDropped(m) &&
      trackedProjectReads(m.attachment)?.some((y) => y.read.content === n)
    )
      return { inView: !0, foundIn: "attached_read" };
    if (m.type === "assistant" && Array.isArray(m.message.content)) {
      if (h !== void 0 && m.message.id === h) break;
      for (let y of m.message.content) {
        if (y.type !== "tool_use" || !r.includes(y.name)) continue;
        w.add(y.id);
        let input = y.input;
        if (
          typeof input === "object" &&
          input !== null &&
          "method" in input &&
          input.method === "project_write" &&
          "content" in input &&
          input.content === n
        )
          return { inView: !0, foundIn: "own_write" };
      }
    }
    if (m.type === "user" && Array.isArray(m.message.content))
      for (let y of m.message.content) {
        if (
          y.type !== "tool_result" ||
          !w.has(y.tool_use_id) ||
          y.is_error === !0 ||
          typeof y.content !== "string"
        )
          continue;
        let j = safeParseJSON(
          firstLineOf(
            y.content,
            `

`,
          ),
          !1,
        );
        if (
          typeof j === "object" &&
          j !== null &&
          "method" in j &&
          j.method === "project_read" &&
          "content" in j &&
          j.content === n
        )
          return { inView: !0, foundIn: "read_result" };
      }
  }
  return { inView: !1, foundIn: "none" };
}
//@ chunk-eg496hkq.js:14834-16242 placement
var projectsInputSchemaFor = (e, n) =>
  zodStrictObject({
    method: U([
      "project_info",
      "project_read",
      "project_search",
      "project_write",
      "project_delete",
      "project_memory_list",
      "project_memory_read",
    ]),
    path: o()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'project_read/project_write/project_delete: doc path. project_write: an existing path is replaced in place; a new bare filename (no "/") is namespaced to "claude/<name>". project_memory_read: memory file path as listed by project_memory_list.',
      ),
    content: o().optional().describe(e),
    local_path: o().min(1).optional().describe(n),
    present_to_user: M()
      .optional()
      .describe(
        "project_write: true marks this doc as the file the user needs to " +
          "see \u2014 the deliverable they asked for or must act on. Defaults to " +
          "false; leave it unset for routine saves, notes, and bulk writes.",
      ),
    if_version: o()
      .optional()
      .describe(
        "project_write to an existing doc: the `version` that came with the copy you worked from (from project_read or project_write). The write is refused if the doc has changed since. Omit for a new doc.",
      ),
    query: o().min(1).optional().describe("project_search: knowledge-base query"),
    n: E().int().min(1).max(15).optional().describe("project_search: number of hits (default 5)"),
    original: M()
      .optional()
      .describe(
        "project_read: true saves the original file of a document-kind upload (PDF, docx) to a local file and returns its path, in place of its extracted text. Ignored for text docs and other uploads.",
      ),
  });
//@ chunk-eg496hkq.js:16242-16309 placement
function isLocalUploadsEnabled() {
  return dy()?.maxBytes !== 0 && getFeatureValue_SESSION_PINNED("tengu_mossy_wirth", !1);
}
//@ chunk-eg496hkq.js:16309-18810 placement
var projectsInputSchema = DoctorLazy(() =>
    projectsInputSchemaFor(
      "project_write: inline doc text. Mutually exclusive with local_path. Use local_path for anything you have on disk.",
      "project_write: a file inside the working directory to upload. The " +
        "tool reads, encodes, and uploads directly \u2014 contents never enter " +
        "your context. Mutually exclusive with content.",
    ),
  ),
  _e = DoctorLazy(() =>
    projectsInputSchemaFor(
      "project_write: inline doc text. Mutually exclusive with local_path.",
      "project_write: the absolute path of a file that you have read or written in full in this session. Mutually exclusive with content.",
    ),
  ),
  bt = DoctorLazy(() => projectsInputSchema().omit({ original: !0 })),
  vt = DoctorLazy(() => _e().omit({ original: !0 })),
  Tt = DoctorLazy(() => projectsInputSchema().omit({ if_version: !0 })),
  St = DoctorLazy(() => _e().omit({ if_version: !0 })),
  Et = DoctorLazy(() => projectsInputSchema().omit({ original: !0, if_version: !0 })),
  kt = DoctorLazy(() => _e().omit({ original: !0, if_version: !0 })),
  Q = { notice: o().optional() },
  Ce = {
    version: o()
      .optional()
      .describe(
        "@internal Lowercase hex SHA-256 of the UTF-8 bytes of a text doc's whole text. Set only where docVersionsOffered.",
      ),
  },
  At = DoctorLazy(() => u({ knowledge_size: E(), max_knowledge_size: E() })),
  xt = DoctorLazy(() =>
    Ir("method", [
      u({
        method: T("project_info"),
        ...Q,
        local_file: o().optional(),
        name: o(),
        description: o(),
        instructions: o(),
        docs: A(u({ path: o(), created_at: o().nullable() })),
        files: A(u({ path: o(), file_kind: o(), created_at: o().nullable() })).optional(),
        sync_sources: A(u({ type: o().nullable(), config: pe(o(), oe()) })).optional(),
        knowledge: At(),
      }),
      u({
        method: T("project_read"),
        ...Q,
        path: o(),
        ...Ce,
        file_kind: o().optional(),
        content: o().optional(),
        local_file: o().optional(),
        size_bytes: E()
          .optional()
          .describe(
            "@internal Size in UTF-8 bytes of the document's whole text. Set only when the text is in local_file and project_read had a token limit on inline text.",
          ),
        created_at: o().nullable(),
      }),
      u({
        method: T("project_search"),
        ...Q,
        rag: M(),
        hits: A(u({ name: o().optional(), doc_uuid: o().optional(), text: o().optional() })).optional(),
        docs: A(o()).optional(),
      }),
      u({
        method: T("project_write"),
        ...Q,
        path: o(),
        doc_uuid: o(),
        ...Ce,
        replaced: M(),
        present_to_user: M().optional(),
        local_path: o().optional(),
      }),
      u({ method: T("project_delete"), ...Q, path: o(), deleted: M() }),
      u({
        method: T("project_memory_list"),
        ...Q,
        files: A(u({ path: o(), size_bytes: E(), updated_at: o().nullable(), truncated: M() })),
        truncated: M(),
      }),
      u({
        method: T("project_memory_read"),
        ...Q,
        path: o(),
        content: o().optional(),
        local_file: o().optional(),
        size_bytes: E(),
        updated_at: o().nullable(),
        truncated: M(),
      }),
    ]),
  ),
  Rt = {
    project_info: [],
    project_read: ["path"],
    project_search: ["query"],
    project_write: ["path"],
    project_delete: ["path"],
    project_memory_list: [],
    project_memory_read: ["path"],
  };
//@ chunk-eg496hkq.js:18810-18947 placement
function isReadOnlyProjectMethod(e) {
  return (
    e === "project_info" ||
    e === "project_read" ||
    e === "project_search" ||
    e === "project_memory_list" ||
    e === "project_memory_read"
  );
}
//@ chunk-eg496hkq.js:18947-19003 placement
function isConfirmableProjectWrite(e) {
  return !isReadOnlyProjectMethod(e) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_curry", !1);
}
//@ chunk-eg496hkq.js:19003-19077 placement
function resolveLocalPath(e) {
  let n = getOriginalCwdOrNull();
  if (n !== null) return resolve(n, e);
  return isAbsolute(e) ? resolve(e) : e;
}

export {
  resolveLocalPath,
  isLocalUploadsEnabled,
  St,
  kt,
  Tt,
  Et,
  _e,
  vt,
  projectsInputSchema,
  bt,
  xt,
  isReadOnlyProjectMethod,
  isConfirmableProjectWrite,
  validateProjectWriteFlags,
  Rt,
  PROJECT_HOST_STATE,
  findProjectDocInView,
  hasProjectHost,
};
