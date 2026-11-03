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
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { isBareModeAttachmentDropped } from "../../utils/messages/apiNormalization.js";
import { trackedProjectReads } from "./readTracking.js";
import { safeParseJSON } from "../../utils/json.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  zodStrictObject,
  _enum,
  string,
  M,
  E,
  u,
  discriminatedUnion,
  literal,
  array,
  record,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { toolResultStoreOrNull } from "../../utils/toolResultStorage.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";

//@ chunk-eg496hkq.js:12864-13067 placement
var ORIGINAL_UNAVAILABLE_NOTE = "Note: `original` is not available in this session and was ignored.";
var IF_VERSION_UNAVAILABLE_NOTE =
  "Note: `if_version` is not available in this session and was ignored: this call did not check whether the doc had changed.";
//@ chunk-eg496hkq.js:13067-13546 placement
function validateProjectWriteFlags(e, { originalOffered, docVersionsOffered }) {
  if (!isPlainObject(e)) return null;
  let s = typeof e.force === "boolean";
  let l = !originalOffered && "original" in e;
  let h = !docVersionsOffered && "if_version" in e;
  if (!s && !l && !h) return null;
  let w = {
    ...e,
  };
  let m = [];
  if (s) {
    delete w.force;
    m.push("legacy_force");
  }
  if (l) {
    delete w.original;
    m.push("original_while_off");
  }
  if (h) {
    delete w.if_version;
    m.push("if_version_while_off");
  }
  let y = [
    ...(l && e.original === true ? [ORIGINAL_UNAVAILABLE_NOTE] : []),
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
  return PROJECT_HOST_STATE.peek(getRootSession())?.host !== undefined;
}
//@ chunk-eg496hkq.js:13619-14834 placement
function findProjectDocInView(e, n, projectsToolAliases, toolUseId) {
  if (n === "")
    return {
      inView: true,
      foundIn: "none",
    };
  let l = messagesSinceCompactBoundary(e);
  let h;
  if (toolUseId !== undefined) {
    for (let m of l)
      if (
        m.type === "assistant" &&
        Array.isArray(m.message.content) &&
        m.message.content.some((y) => y.type === "tool_use" && y.id === toolUseId)
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
      return {
        inView: true,
        foundIn: "attached_read",
      };
    if (m.type === "assistant" && Array.isArray(m.message.content)) {
      if (h !== undefined && m.message.id === h) break;
      for (let y of m.message.content) {
        if (y.type !== "tool_use" || !projectsToolAliases.includes(y.name)) continue;
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
          return {
            inView: true,
            foundIn: "own_write",
          };
      }
    }
    if (m.type === "user" && Array.isArray(m.message.content))
      for (let y of m.message.content) {
        if (
          y.type !== "tool_result" ||
          !w.has(y.tool_use_id) ||
          y.is_error === true ||
          typeof y.content !== "string"
        )
          continue;
        let j = safeParseJSON(
          firstLineOf(
            y.content,
            `

`,
          ),
          false,
        );
        if (
          typeof j === "object" &&
          j !== null &&
          "method" in j &&
          j.method === "project_read" &&
          "content" in j &&
          j.content === n
        )
          return {
            inView: true,
            foundIn: "read_result",
          };
      }
  }
  return {
    inView: false,
    foundIn: "none",
  };
}
//@ chunk-eg496hkq.js:14834-16242 placement
var projectsInputSchemaFor = (e, n) =>
  zodStrictObject({
    method: _enum([
      "project_info",
      "project_read",
      "project_search",
      "project_write",
      "project_delete",
      "project_memory_list",
      "project_memory_read",
    ]),
    path: string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'project_read/project_write/project_delete: doc path. project_write: an existing path is replaced in place; a new bare filename (no "/") is namespaced to "claude/<name>". project_memory_read: memory file path as listed by project_memory_list.',
      ),
    content: string().optional().describe(e),
    local_path: string().min(1).optional().describe(n),
    present_to_user: M()
      .optional()
      .describe(
        "project_write: true marks this doc as the file the user needs to " +
          "see \u2014 the deliverable they asked for or must act on. Defaults to " +
          "false; leave it unset for routine saves, notes, and bulk writes.",
      ),
    if_version: string()
      .optional()
      .describe(
        "project_write to an existing doc: the `version` that came with the copy you worked from (from project_read or project_write). The write is refused if the doc has changed since. Omit for a new doc.",
      ),
    query: string().min(1).optional().describe("project_search: knowledge-base query"),
    n: E().int().min(1).max(15).optional().describe("project_search: number of hits (default 5)"),
    original: M()
      .optional()
      .describe(
        "project_read: true saves the original file of a document-kind upload (PDF, docx) to a local file and returns its path, in place of its extracted text. Ignored for text docs and other uploads.",
      ),
  });
//@ chunk-eg496hkq.js:16242-16309 placement
function isLocalUploadsEnabled() {
  return (
    toolResultStoreOrNull()?.maxBytes !== 0 && getFeatureValue_SESSION_PINNED("tengu_mossy_wirth", false)
  );
}
//@ chunk-eg496hkq.js:16309-18810 placement
/**
 * Projects 的 schema 组：各方法的输入/输出 schema、共用的 notice 字段、各方法的必填字段表，以及 Unicode 规范化比对用的放大系数与长度上限。
 */
var projectsInputSchema = DoctorLazy(() =>
  projectsInputSchemaFor(
    "project_write: inline doc text. Mutually exclusive with local_path. Use local_path for anything you have on disk.",
    "project_write: a file inside the working directory to upload. The " +
      "tool reads, encodes, and uploads directly \u2014 contents never enter " +
      "your context. Mutually exclusive with content.",
  ),
);
var projectMethodOutputSchema = DoctorLazy(() =>
  projectsInputSchemaFor(
    "project_write: inline doc text. Mutually exclusive with local_path.",
    "project_write: the absolute path of a file that you have read or written in full in this session. Mutually exclusive with content.",
  ),
);
var projectReadInputSchema = DoctorLazy(() =>
  projectsInputSchema().omit({
    original: true,
  }),
);
var projectSearchInputSchema = DoctorLazy(() =>
  projectMethodOutputSchema().omit({
    original: true,
  }),
);
var projectDeleteInputSchema = DoctorLazy(() =>
  projectsInputSchema().omit({
    if_version: true,
  }),
);
var projectListInputSchema = DoctorLazy(() =>
  projectMethodOutputSchema().omit({
    if_version: true,
  }),
);
var projectWriteInputSchema = DoctorLazy(() =>
  projectsInputSchema().omit({
    original: true,
    if_version: true,
  }),
);
var projectMemoryListInputSchema = DoctorLazy(() =>
  projectMethodOutputSchema().omit({
    original: true,
    if_version: true,
  }),
);
var NOTICE_FIELD_SCHEMA = {
  notice: string().optional(),
};
var projectsReadOnlyMethods = {
  version: string()
    .optional()
    .describe(
      "@internal Lowercase hex SHA-256 of the UTF-8 bytes of a text doc's whole text. Set only where docVersionsOffered.",
    ),
};
var projectsPermissionContext_2 = DoctorLazy(() =>
  u({
    knowledge_size: E(),
    max_knowledge_size: E(),
  }),
);
var projectToolOutputSchema = DoctorLazy(() =>
  discriminatedUnion("method", [
    u({
      method: literal("project_info"),
      ...NOTICE_FIELD_SCHEMA,
      local_file: string().optional(),
      name: string(),
      description: string(),
      instructions: string(),
      docs: array(
        u({
          path: string(),
          created_at: string().nullable(),
        }),
      ),
      files: array(
        u({
          path: string(),
          file_kind: string(),
          created_at: string().nullable(),
        }),
      ).optional(),
      sync_sources: array(
        u({
          type: string().nullable(),
          config: record(string(), unknown()),
        }),
      ).optional(),
      knowledge: projectsPermissionContext_2(),
    }),
    u({
      method: literal("project_read"),
      ...NOTICE_FIELD_SCHEMA,
      path: string(),
      ...projectsReadOnlyMethods,
      file_kind: string().optional(),
      content: string().optional(),
      local_file: string().optional(),
      size_bytes: E()
        .optional()
        .describe(
          "@internal Size in UTF-8 bytes of the document's whole text. Set only when the text is in local_file and project_read had a token limit on inline text.",
        ),
      created_at: string().nullable(),
    }),
    u({
      method: literal("project_search"),
      ...NOTICE_FIELD_SCHEMA,
      rag: M(),
      hits: array(
        u({
          name: string().optional(),
          doc_uuid: string().optional(),
          text: string().optional(),
        }),
      ).optional(),
      docs: array(string()).optional(),
    }),
    u({
      method: literal("project_write"),
      ...NOTICE_FIELD_SCHEMA,
      path: string(),
      doc_uuid: string(),
      ...projectsReadOnlyMethods,
      replaced: M(),
      present_to_user: M().optional(),
      local_path: string().optional(),
    }),
    u({
      method: literal("project_delete"),
      ...NOTICE_FIELD_SCHEMA,
      path: string(),
      deleted: M(),
    }),
    u({
      method: literal("project_memory_list"),
      ...NOTICE_FIELD_SCHEMA,
      files: array(
        u({
          path: string(),
          size_bytes: E(),
          updated_at: string().nullable(),
          truncated: M(),
        }),
      ),
      truncated: M(),
    }),
    u({
      method: literal("project_memory_read"),
      ...NOTICE_FIELD_SCHEMA,
      path: string(),
      content: string().optional(),
      local_file: string().optional(),
      size_bytes: E(),
      updated_at: string().nullable(),
      truncated: M(),
    }),
  ]),
);
var REQUIRED_FIELDS_BY_METHOD = {
  project_info: [],
  project_read: ["path"],
  project_search: ["query"],
  project_write: ["path"],
  project_delete: ["path"],
  project_memory_list: [],
  project_memory_read: ["path"],
};
//@ chunk-eg496hkq.js:18810-18947 placement
function isReadOnlyProjectMethod(method) {
  return (
    method === "project_info" ||
    method === "project_read" ||
    method === "project_search" ||
    method === "project_memory_list" ||
    method === "project_memory_read"
  );
}
//@ chunk-eg496hkq.js:18947-19003 placement
function isConfirmableProjectWrite(method) {
  return !isReadOnlyProjectMethod(method) && getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_curry", false);
}
//@ chunk-eg496hkq.js:19003-19077 placement
function resolveLocalPath(localPath) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull !== null) return resolve(originalCwdOrNull, localPath);
  return isAbsolute(localPath) ? resolve(localPath) : localPath;
}
export {
  resolveLocalPath,
  isLocalUploadsEnabled,
  projectListInputSchema,
  projectMemoryListInputSchema,
  projectDeleteInputSchema,
  projectWriteInputSchema,
  projectMethodOutputSchema,
  projectSearchInputSchema,
  projectsInputSchema,
  projectReadInputSchema,
  projectToolOutputSchema,
  isReadOnlyProjectMethod,
  isConfirmableProjectWrite,
  validateProjectWriteFlags,
  REQUIRED_FIELDS_BY_METHOD,
  PROJECT_HOST_STATE,
  findProjectDocInView,
  hasProjectHost,
};
