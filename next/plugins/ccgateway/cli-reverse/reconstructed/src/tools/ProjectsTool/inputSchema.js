/**
 * tools/ProjectsTool/inputSchema.ts
 *
 * 2.1.316 新增：Projects 工具输入结构
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y2k9w57g.js (11)
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
  stringSchema,
  booleanSchema,
  numberSchema,
  objectSchema,
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
import { isCcsCoworkSurface } from "../../utils/entrypointKinds.js";

//@ chunk-y2k9w57g.js:14070-14273 placement
var ORIGINAL_UNAVAILABLE_NOTE = "Note: `original` is not available in this session and was ignored.";
var IF_VERSION_UNAVAILABLE_NOTE =
  "Note: `if_version` is not available in this session and was ignored: this call did not check whether the doc had changed.";
//@ chunk-y2k9w57g.js:14273-14752 placement
function validateProjectWriteFlags(input, { originalOffered, docVersionsOffered }) {
  if (!isPlainObject(input)) return null;
  let hasForce = typeof input.force === "boolean";
  let hasOriginal = !originalOffered && "original" in input;
  let hasIfVersion = !docVersionsOffered && "if_version" in input;
  if (!hasForce && !hasOriginal && !hasIfVersion) return null;
  let cleanedInput = {
    ...input,
  };
  let changedFields = [];
  if (hasForce) {
    delete cleanedInput.force;
    changedFields.push("legacy_force");
  }
  if (hasOriginal) {
    delete cleanedInput.original;
    changedFields.push("original_while_off");
  }
  if (hasIfVersion) {
    delete cleanedInput.if_version;
    changedFields.push("if_version_while_off");
  }
  let notes = [
    ...(hasOriginal && input.original === true ? [ORIGINAL_UNAVAILABLE_NOTE] : []),
    ...(hasIfVersion ? [IF_VERSION_UNAVAILABLE_NOTE] : []),
  ];
  return {
    input: cleanedInput,
    shapeClass: changedFields.join("+"),
    ...(notes.length > 0 && {
      resultNote: notes.join(`
`),
    }),
  };
}
//@ chunk-y2k9w57g.js:14752-14776 placement
var PROJECT_HOST_STATE = new SessionRootSlot(() => ({}));
//@ chunk-y2k9w57g.js:14776-14825 placement
function hasProjectHost() {
  return PROJECT_HOST_STATE.peek(getRootSession())?.host !== undefined;
}
//@ chunk-y2k9w57g.js:14825-16040 placement
function findProjectDocInView(messages, content, projectsToolAliases, toolUseId) {
  if (content === "")
    return {
      inView: true,
      foundIn: "none",
    };
  let visibleMessages = messagesSinceCompactBoundary(messages);
  let writeMessageId;
  if (toolUseId !== undefined) {
    for (let message of visibleMessages)
      if (
        message.type === "assistant" &&
        Array.isArray(message.message.content) &&
        message.message.content.some((block) => block.type === "tool_use" && block.id === toolUseId)
      ) {
        writeMessageId = message.message.id;
        break;
      }
  }
  let pendingToolUseIds = new Set();
  for (let message of visibleMessages) {
    if (isNonConversationMessage(message)) continue;
    if (
      message.type === "attachment" &&
      message.attachment.type === "project_doc_reads" &&
      !isBareModeAttachmentDropped(message) &&
      trackedProjectReads(message.attachment)?.some((read) => read.read.content === content)
    )
      return {
        inView: true,
        foundIn: "attached_read",
      };
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      if (writeMessageId !== undefined && message.message.id === writeMessageId) break;
      for (let block of message.message.content) {
        if (block.type !== "tool_use" || !projectsToolAliases.includes(block.name)) continue;
        pendingToolUseIds.add(block.id);
        let input = block.input;
        if (
          typeof input === "object" &&
          input !== null &&
          "method" in input &&
          input.method === "project_write" &&
          "content" in input &&
          input.content === content
        )
          return {
            inView: true,
            foundIn: "own_write",
          };
      }
    }
    if (message.type === "user" && Array.isArray(message.message.content))
      for (let block of message.message.content) {
        if (
          block.type !== "tool_result" ||
          !pendingToolUseIds.has(block.tool_use_id) ||
          block.is_error === true ||
          typeof block.content !== "string"
        )
          continue;
        let parsed = safeParseJSON(
          firstLineOf(
            block.content,
            `

`,
          ),
          false,
        );
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "method" in parsed &&
          parsed.method === "project_read" &&
          "content" in parsed &&
          parsed.content === content
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
//@ chunk-y2k9w57g.js:16040-17448 placement
var projectsInputSchemaFor = (contentHint, localPathHint) =>
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
    path: stringSchema()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'project_read/project_write/project_delete: doc path. project_write: an existing path is replaced in place; a new bare filename (no "/") is namespaced to "claude/<name>". project_memory_read: memory file path as listed by project_memory_list.',
      ),
    content: stringSchema().optional().describe(contentHint),
    local_path: stringSchema().min(1).optional().describe(localPathHint),
    present_to_user: booleanSchema()
      .optional()
      .describe(
        "project_write: true marks this doc as the file the user needs to " +
          "see \u2014 the deliverable they asked for or must act on. Defaults to " +
          "false; leave it unset for routine saves, notes, and bulk writes.",
      ),
    if_version: stringSchema()
      .optional()
      .describe(
        "project_write to an existing doc: the `version` that came with the copy you worked from (from project_read or project_write). The write is refused if the doc has changed since. Omit for a new doc.",
      ),
    query: stringSchema().min(1).optional().describe("project_search: knowledge-base query"),
    n: numberSchema().int().min(1).max(15).optional().describe("project_search: number of hits (default 5)"),
    original: booleanSchema()
      .optional()
      .describe(
        "project_read: true saves the original file of a document-kind upload (PDF, docx) to a local file and returns its path, in place of its extracted text. Ignored for text docs and other uploads.",
      ),
  });
//@ chunk-y2k9w57g.js:17448-17515 placement
function isLocalUploadsEnabled() {
  return (
    toolResultStoreOrNull()?.maxBytes !== 0 && getFeatureValue_SESSION_PINNED("tengu_mossy_wirth", false)
  );
}
//@ chunk-y2k9w57g.js:17515-20016 placement
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
  notice: stringSchema().optional(),
};
var projectsReadOnlyMethods = {
  version: stringSchema()
    .optional()
    .describe(
      "@internal Lowercase hex SHA-256 of the UTF-8 bytes of a text doc's whole text. Set only where docVersionsOffered.",
    ),
};
var projectsPermissionContext_2 = DoctorLazy(() =>
  objectSchema({
    knowledge_size: numberSchema(),
    max_knowledge_size: numberSchema(),
  }),
);
var projectToolOutputSchema = DoctorLazy(() =>
  discriminatedUnion("method", [
    objectSchema({
      method: literal("project_info"),
      ...NOTICE_FIELD_SCHEMA,
      local_file: stringSchema().optional(),
      name: stringSchema(),
      description: stringSchema(),
      instructions: stringSchema(),
      docs: array(
        objectSchema({
          path: stringSchema(),
          created_at: stringSchema().nullable(),
        }),
      ),
      files: array(
        objectSchema({
          path: stringSchema(),
          file_kind: stringSchema(),
          created_at: stringSchema().nullable(),
        }),
      ).optional(),
      sync_sources: array(
        objectSchema({
          type: stringSchema().nullable(),
          config: record(stringSchema(), unknown()),
        }),
      ).optional(),
      knowledge: projectsPermissionContext_2(),
    }),
    objectSchema({
      method: literal("project_read"),
      ...NOTICE_FIELD_SCHEMA,
      path: stringSchema(),
      ...projectsReadOnlyMethods,
      file_kind: stringSchema().optional(),
      content: stringSchema().optional(),
      local_file: stringSchema().optional(),
      size_bytes: numberSchema()
        .optional()
        .describe(
          "@internal Size in UTF-8 bytes of the document's whole text. Set only when the text is in local_file and project_read had a token limit on inline text.",
        ),
      created_at: stringSchema().nullable(),
    }),
    objectSchema({
      method: literal("project_search"),
      ...NOTICE_FIELD_SCHEMA,
      rag: booleanSchema(),
      hits: array(
        objectSchema({
          name: stringSchema().optional(),
          doc_uuid: stringSchema().optional(),
          text: stringSchema().optional(),
        }),
      ).optional(),
      docs: array(stringSchema()).optional(),
    }),
    objectSchema({
      method: literal("project_write"),
      ...NOTICE_FIELD_SCHEMA,
      path: stringSchema(),
      doc_uuid: stringSchema(),
      ...projectsReadOnlyMethods,
      replaced: booleanSchema(),
      present_to_user: booleanSchema().optional(),
      local_path: stringSchema().optional(),
    }),
    objectSchema({
      method: literal("project_delete"),
      ...NOTICE_FIELD_SCHEMA,
      path: stringSchema(),
      deleted: booleanSchema(),
    }),
    objectSchema({
      method: literal("project_memory_list"),
      ...NOTICE_FIELD_SCHEMA,
      files: array(
        objectSchema({
          path: stringSchema(),
          size_bytes: numberSchema(),
          updated_at: stringSchema().nullable(),
          truncated: booleanSchema(),
        }),
      ),
      truncated: booleanSchema(),
    }),
    objectSchema({
      method: literal("project_memory_read"),
      ...NOTICE_FIELD_SCHEMA,
      path: stringSchema(),
      content: stringSchema().optional(),
      local_file: stringSchema().optional(),
      size_bytes: numberSchema(),
      updated_at: stringSchema().nullable(),
      truncated: booleanSchema(),
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
//@ chunk-y2k9w57g.js:20016-20153 placement
function isReadOnlyProjectMethod(method) {
  return (
    method === "project_info" ||
    method === "project_read" ||
    method === "project_search" ||
    method === "project_memory_list" ||
    method === "project_memory_read"
  );
}
//@ chunk-y2k9w57g.js:20153-20211 placement
function isConfirmableProjectWrite(method) {
  return (
    !isReadOnlyProjectMethod(method) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_serene_curry", isCcsCoworkSurface())
  );
}
//@ chunk-y2k9w57g.js:20211-20285 placement
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
