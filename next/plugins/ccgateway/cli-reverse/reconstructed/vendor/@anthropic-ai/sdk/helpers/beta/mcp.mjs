/**
 * @anthropic-ai/sdk/helpers/beta/mcp.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-38x90rmj.js (1), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (1), chunk-fe6rs39h.js (1), chunk-g54kbxqw.js (1), chunk-p8kytbnw.js (1), chunk-z1n5m6nf.js (1)
 * attribution: esm-fingerprint 7
 */
import { DoctorLazy } from "../../../../../src/cli/handlers/util.js";
import {
  objectSchema,
  array,
  stringSchema,
  booleanSchema,
  _enum,
  unknown,
  literal,
  numberSchema,
  union,
  zodStrictObject,
  preprocess,
} from "../../../../zod/v4/classic/schemas.js";
import {
  TOOL_HOST_ID_RE,
  MAX_INVENTORY_TOOLS,
  MAX_INVENTORY_JSON_BYTES,
  CAPABILITY_NAME_RE,
  MAX_CAPABILITIES,
  CURRENT_PROTOCOL_VERSION,
} from "../../../../../src/remote/tools/protocolConstants.js";
import {
  optionalByteCount,
  SAFE_NAME_SCHEMA,
  MAX_TRUNCATED_LINES,
  SERVING_LIMITS_SCHEMA,
  REMOTE_TOOL_LIMITS,
  hostEpochSchema,
  SAFE_ID_WITH_DASH_RE,
  dropUndefined,
  intList,
  MAX_LINE_CHARS,
  MAX_TAIL_LINES,
  MAX_MESSAGE_CHARS,
  ANTHROPIC_REMOTETOOLEXECUTION,
  askIdSchema,
  callIdSchema,
} from "../../../../../src/remote/tools/protocolSchemas.js";
import { jsonStringify } from "../../../../../src/utils/slowOperations.js";
import { toolHostInterfaceSchema } from "../../../../../src/remote/tools/protocolNegotiation.js";
import { uniq } from "../../../../../src/utils/collections.js";
import { coercedNumberSchema } from "../../../../../src/tools/ArtifactTool/publishEdits.js";
import { MAX_PDF_PAGES_PER_READ as MAX_PDF_PAGES_PER_READ_2 } from "../../../../../src/utils/mediaLimits.js";
import { ALLOW_LARGE_PARAM } from "../../../../../src/tools/FileReadTool/constants.js";
import { booleanishSchema } from "../../../../../src/utils/spellcheck.js";
import { attachedMachineInputField } from "../../../../../src/bridge/deviceRegistration.js";
import { deferInit } from "../../../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:16031-18433 esm-fingerprint
var deviceInventorySchema; // deferred: uses DoctorLazy (../../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var toolHostSchema;
var toolHostTargetSchema;
var toolInvocationRequestSchema;
var filePolicyListSchema;
var filePolicySchema;
var askRequestSchema;
var isSupportedResourceMimeType;
var MAX_PDF_PAGES_PER_READ;
var PDF_READ_MARKER_PREFIX;
var APPLICATION_PDF_TYPES;
var pdfPageSchema;
var pdfPagesSchema;
var toolResultContentSchema;
deferInit("chunk-g54kbxqw.js:16031", () => {
  deviceInventorySchema = DoctorLazy(() =>
    objectSchema({
      tools: array(stringSchema().regex(TOOL_HOST_ID_RE)).max(MAX_INVENTORY_TOOLS),
      incomplete: booleanSchema().optional(),
      cpus: optionalByteCount(),
      memory_gb: optionalByteCount(),
      disk_free_gb: optionalByteCount(),
    }).refine((inventory) => jsonStringify(inventory).length <= MAX_INVENTORY_JSON_BYTES),
  );
  toolHostSchema = DoctorLazy(() =>
    objectSchema({
      name: SAFE_NAME_SCHEMA(),
      kind: _enum(["personal_machine", "sandbox"]),
      platform: stringSchema().max(64),
      os_version: stringSchema().max(64).optional(),
      arch: stringSchema().max(64).optional(),
      shell: stringSchema().max(MAX_TRUNCATED_LINES).optional(),
      home_dir: stringSchema().max(1024).optional(),
      working_dir: stringSchema().max(1024),
      project_sync: _enum(["two_way", "upload_only", "off", "unknown"]).optional(),
      sync_root: stringSchema().max(1024).optional(),
      folder_relation: unknown()
        .transform((relation) => (relation === "separate_copy" ? relation : undefined))
        .optional(),
      copy_of: objectSchema({
        platform: stringSchema().max(64),
        dir: stringSchema().max(1024),
        home_dir: stringSchema().max(1024).optional(),
      })
        .optional()
        .catch({
          platform: "",
          dir: "",
        }),
      limits: SERVING_LIMITS_SCHEMA(),
      claude_code_version: stringSchema().max(64).optional(),
      tool_host_interface: toolHostInterfaceSchema().optional().catch(undefined),
      notes: stringSchema().max(REMOTE_TOOL_LIMITS).optional(),
      epoch: hostEpochSchema().optional(),
      device_id: unknown()
        .transform((deviceId) =>
          typeof deviceId === "string" && SAFE_ID_WITH_DASH_RE.test(deviceId) ? deviceId : undefined,
        )
        .optional(),
      inventory: deviceInventorySchema().optional().catch(undefined),
      capabilities: unknown()
        .transform((capabilities) =>
          Array.isArray(capabilities)
            ? uniq(
                capabilities.filter(
                  (capability) => typeof capability === "string" && CAPABILITY_NAME_RE.test(capability),
                ),
              ).slice(0, MAX_CAPABILITIES)
            : undefined,
        )
        .optional(),
    }),
  );
  toolHostTargetSchema = DoctorLazy(() => toolHostSchema().transform(dropUndefined));
  toolInvocationRequestSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(CURRENT_PROTOCOL_VERSION),
      tool: stringSchema().min(1).max(128),
      refused_input_fields: array(stringSchema().max(64)).max(32),
      target: toolHostTargetSchema(),
      protocol_versions: unknown()
        .transform((protocolVersions) =>
          protocolVersions === undefined ? undefined : intList(protocolVersions),
        )
        .optional(),
    }),
  );
  filePolicyListSchema = DoctorLazy(() =>
    array(stringSchema().min(1).max(MAX_LINE_CHARS)).max(MAX_TAIL_LINES).optional(),
  );
  filePolicySchema = DoctorLazy(() =>
    objectSchema({
      allow: filePolicyListSchema(),
      soft_deny: filePolicyListSchema(),
      hard_deny: filePolicyListSchema(),
      environment: filePolicyListSchema(),
    }),
  );
  askRequestSchema = DoctorLazy(() =>
    objectSchema({
      mode: literal("form").optional(),
      message: stringSchema().max(MAX_MESSAGE_CHARS),
      requestedSchema: objectSchema({
        type: literal("object"),
        properties: objectSchema({
          decision: objectSchema({
            type: literal("string"),
            enum: array(stringSchema().max(64)).max(8),
            description: stringSchema().max(256).optional(),
          }),
          feedback: objectSchema({
            type: literal("string"),
            description: stringSchema().max(256).optional(),
          }),
        }),
        required: array(stringSchema().max(64)).max(8).optional(),
      }),
      _meta: objectSchema({
        [ANTHROPIC_REMOTETOOLEXECUTION]: objectSchema({
          ask_id: askIdSchema(),
          call_id: callIdSchema().optional(),
          input_fingerprint: stringSchema().regex(/^[a-f0-9]{64}$/),
          classifier_eligible: booleanSchema().optional(),
          prior_answer_ok: booleanSchema().optional(),
        }),
      }),
    }),
  );
  isSupportedResourceMimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  MAX_PDF_PAGES_PER_READ = 4;
  PDF_READ_MARKER_PREFIX = "(a PDF read on ";
  APPLICATION_PDF_TYPES = ["application/pdf"];
  pdfPageSchema = DoctorLazy(() =>
    objectSchema({
      at: numberSchema().int().nonnegative(),
      media_type: _enum(APPLICATION_PDF_TYPES),
      data: stringSchema().regex(/^[A-Za-z0-9+/]+={0,2}$/),
    }),
  );
  pdfPagesSchema = DoctorLazy(() =>
    unknown().transform((pages) =>
      Array.isArray(pages)
        ? pages.slice(0, MAX_PDF_PAGES_PER_READ).flatMap((page) => {
            let parsed = pdfPageSchema().safeParse(page);
            return parsed.success ? [parsed.data] : [];
          })
        : [],
    ),
  );
  toolResultContentSchema = DoctorLazy(() =>
    union([
      stringSchema(),
      array(
        union([
          objectSchema({
            type: literal("text"),
            text: stringSchema(),
          }),
          objectSchema({
            type: literal("image"),
            source: objectSchema({
              type: literal("base64"),
              media_type: _enum(isSupportedResourceMimeType),
              data: stringSchema(),
            }),
          }),
        ]),
      ),
    ]),
  );
});
//@ chunk-p8kytbnw.js:276-688 esm-fingerprint
function sniffImageMediaType(bytes) {
  if (bytes.length < 4) return null;
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (
    bytes.length >= 6 &&
    bytes[0] === 71 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 56 &&
    (bytes[4] === 55 || bytes[4] === 57) &&
    bytes[5] === 97
  )
    return "image/gif";
  if (
    bytes[0] === 82 &&
    bytes[1] === 73 &&
    bytes[2] === 70 &&
    bytes[3] === 70 &&
    bytes.length >= 12 &&
    bytes[8] === 87 &&
    bytes[9] === 69 &&
    bytes[10] === 66 &&
    bytes[11] === 80
  )
    return "image/webp";
  return null;
}
//@ chunk-e6aww6q8.js:3160592-3161562 esm-fingerprint
var fileReadInputSchema; // deferred: uses DoctorLazy (../../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var imageMediaTypeSchema;
deferInit("chunk-e6aww6q8.js:3160592", () => {
  fileReadInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: stringSchema().describe("The absolute path to the file to read"),
      offset: coercedNumberSchema(numberSchema().int().nonnegative().optional()).describe(
        "The line number to start reading from. Only provide if the file is too large to read at once",
      ),
      limit: coercedNumberSchema(numberSchema().int().positive().optional()).describe(
        "The number of lines to read. Only provide if the file is too large to read at once.",
      ),
      pages: preprocess(
        (pageRef) => (typeof pageRef === "string" && pageRef.trim() === "" ? undefined : pageRef),
        stringSchema().optional(),
      ).describe(
        `Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files. Maximum ${MAX_PDF_PAGES_PER_READ_2} pages per request.`,
      ),
      [ALLOW_LARGE_PARAM]: booleanishSchema(booleanSchema().optional()).describe(
        "Set to true to read a text file, or a line range of one, that is over the usual size limits, up to what still fits in your context. Only use this when you genuinely need all of it or the user asked for the whole file; otherwise read it in parts with offset and limit, or search it.",
      ),
      ...attachedMachineInputField(),
    }),
  );
  imageMediaTypeSchema = DoctorLazy(() => _enum(["image/jpeg", "image/png", "image/gif", "image/webp"]));
});
//@ chunk-8t8n4kdh.js:69716-69784 esm-fingerprint
var SUPPORTED_IMAGE_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8t8n4kdh.js:69716", () => {
  SUPPORTED_IMAGE_TYPES_2 = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
});
//@ chunk-z1n5m6nf.js:59606-59674 esm-fingerprint
var SUPPORTED_IMAGE_TYPES_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z1n5m6nf.js:59606", () => {
  SUPPORTED_IMAGE_TYPES_3 = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
});
//@ chunk-fe6rs39h.js:56627-56983 esm-fingerprint
var OMITTED_UNSUPPORTED_CONTENT; // deferred: uses DoctorLazy (../../../../../src/cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var OMITTED_DOCUMENT_PLACEHOLDER;
var SUPPORTED_IMAGE_MIME_TYPES;
var documentBlockSchema;
var textBlockSchema;
deferInit("chunk-fe6rs39h.js:56627", () => {
  OMITTED_UNSUPPORTED_CONTENT = "[unsupported content from another client omitted]";
  OMITTED_DOCUMENT_PLACEHOLDER = "[document from another client]";
  SUPPORTED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  documentBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("document"),
      title: stringSchema().nullish(),
      context: stringSchema().nullish(),
      source: union([
        objectSchema({
          type: literal("text"),
          data: stringSchema(),
        }),
        objectSchema({
          type: literal("content"),
          content: union([stringSchema(), array(unknown())]),
        }),
      ]),
    }),
  );
  textBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("text"),
      text: stringSchema(),
    }),
  );
});
//@ chunk-38x90rmj.js:7457-7525 esm-fingerprint
var SUPPORTED_IMAGE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-38x90rmj.js:7457", () => {
  SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
});
export {
  SUPPORTED_IMAGE_TYPES_2,
  sniffImageMediaType,
  SUPPORTED_IMAGE_TYPES_3,
  SUPPORTED_IMAGE_TYPES,
  imageMediaTypeSchema,
  fileReadInputSchema,
  MAX_PDF_PAGES_PER_READ,
  PDF_READ_MARKER_PREFIX,
  OMITTED_UNSUPPORTED_CONTENT,
  documentBlockSchema,
  textBlockSchema,
  OMITTED_DOCUMENT_PLACEHOLDER,
  SUPPORTED_IMAGE_MIME_TYPES,
  toolResultContentSchema,
  pdfPagesSchema,
  filePolicySchema,
  askRequestSchema,
  toolHostTargetSchema,
  toolInvocationRequestSchema,
  toolHostSchema,
  isSupportedResourceMimeType,
};
