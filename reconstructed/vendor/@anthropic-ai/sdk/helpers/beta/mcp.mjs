/**
 * @anthropic-ai/sdk/helpers/beta/mcp.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-38x90rmj.js (1), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (1), chunk-fe6rs39h.js (1), chunk-g54kbxqw.js (1), chunk-p8kytbnw.js (1), chunk-z1n5m6nf.js (1)
 * attribution: esm-fingerprint 7
 */
import { DoctorLazy } from "../../../../../src/cli/handlers/util.js";
import {
  zodStrictObject,
  string,
  E,
  preprocess,
  M,
  _enum,
  u,
  literal,
  union,
  array,
  unknown,
} from "../../../../zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../../../../../src/tools/ArtifactTool/publishEdits.js";
import { MAX_PDF_PAGES_PER_READ } from "../../../../../src/utils/truncateGraphemes.js";
import { ALLOW_LARGE_PARAM } from "../../../../../src/tools/FileReadTool/constants.js";
import { booleanishSchema } from "../../../../../src/utils/spellcheck.js";
import { attachedMachineInputField } from "../../../../../src/bridge/deviceRegistration.js";
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

//@ chunk-38x90rmj.js:7457-7525 esm-fingerprint
var ce = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
//@ chunk-8t8n4kdh.js:69716-69784 esm-fingerprint
var SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
//@ chunk-e6aww6q8.js:3160592-3161562 esm-fingerprint
var fileReadInputSchema = DoctorLazy(() =>
  zodStrictObject({
    file_path: string().describe("The absolute path to the file to read"),
    offset: coercedNumberSchema(E().int().nonnegative().optional()).describe(
      "The line number to start reading from. Only provide if the file is too large to read at once",
    ),
    limit: coercedNumberSchema(E().int().positive().optional()).describe(
      "The number of lines to read. Only provide if the file is too large to read at once.",
    ),
    pages: preprocess(
      (e) => (typeof e === "string" && e.trim() === "" ? undefined : e),
      string().optional(),
    ).describe(
      `Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files. Maximum ${MAX_PDF_PAGES_PER_READ} pages per request.`,
    ),
    [ALLOW_LARGE_PARAM]: booleanishSchema(M().optional()).describe(
      "Set to true to read a text file, or a line range of one, that is over the usual size limits, up to what still fits in your context. Only use this when you genuinely need all of it or the user asked for the whole file; otherwise read it in parts with offset and limit, or search it.",
    ),
    ...attachedMachineInputField(),
  }),
);
var imageMediaTypeSchema = DoctorLazy(() => _enum(["image/jpeg", "image/png", "image/gif", "image/webp"]));
//@ chunk-fe6rs39h.js:56627-56983 esm-fingerprint
var qt = "[unsupported content from another client omitted]";
var xo = "[document from another client]";
var No = ["image/jpeg", "image/png", "image/gif", "image/webp"];
var Uo = DoctorLazy(() =>
  u({
    type: literal("document"),
    title: string().nullish(),
    context: string().nullish(),
    source: union([
      u({
        type: literal("text"),
        data: string(),
      }),
      u({
        type: literal("content"),
        content: union([string(), array(unknown())]),
      }),
    ]),
  }),
);
var Bo = DoctorLazy(() =>
  u({
    type: literal("text"),
    text: string(),
  }),
);
//@ chunk-g54kbxqw.js:16031-18433 esm-fingerprint
var Jr = DoctorLazy(() =>
  u({
    tools: array(string().regex(TOOL_HOST_ID_RE)).max(MAX_INVENTORY_TOOLS),
    incomplete: M().optional(),
    cpus: optionalByteCount(),
    memory_gb: optionalByteCount(),
    disk_free_gb: optionalByteCount(),
  }).refine((e) => jsonStringify(e).length <= MAX_INVENTORY_JSON_BYTES),
);
var Io = DoctorLazy(() =>
  u({
    name: SAFE_NAME_SCHEMA(),
    kind: _enum(["personal_machine", "sandbox"]),
    platform: string().max(64),
    os_version: string().max(64).optional(),
    arch: string().max(64).optional(),
    shell: string().max(MAX_TRUNCATED_LINES).optional(),
    home_dir: string().max(1024).optional(),
    working_dir: string().max(1024),
    project_sync: _enum(["two_way", "upload_only", "off", "unknown"]).optional(),
    sync_root: string().max(1024).optional(),
    folder_relation: unknown()
      .transform((e) => (e === "separate_copy" ? e : undefined))
      .optional(),
    copy_of: u({
      platform: string().max(64),
      dir: string().max(1024),
      home_dir: string().max(1024).optional(),
    })
      .optional()
      .catch({
        platform: "",
        dir: "",
      }),
    limits: SERVING_LIMITS_SCHEMA(),
    claude_code_version: string().max(64).optional(),
    tool_host_interface: toolHostInterfaceSchema().optional().catch(undefined),
    notes: string().max(REMOTE_TOOL_LIMITS).optional(),
    epoch: hostEpochSchema().optional(),
    device_id: unknown()
      .transform((e) => (typeof e === "string" && SAFE_ID_WITH_DASH_RE.test(e) ? e : undefined))
      .optional(),
    inventory: Jr().optional().catch(undefined),
    capabilities: unknown()
      .transform((e) =>
        Array.isArray(e)
          ? uniq(e.filter((n) => typeof n === "string" && CAPABILITY_NAME_RE.test(n))).slice(
              0,
              MAX_CAPABILITIES,
            )
          : undefined,
      )
      .optional(),
  }),
);
var No_g54k = DoctorLazy(() => Io().transform(dropUndefined));
var ei = DoctorLazy(() =>
  u({
    v: literal(CURRENT_PROTOCOL_VERSION),
    tool: string().min(1).max(128),
    refused_input_fields: array(string().max(64)).max(32),
    target: No_g54k(),
    protocol_versions: unknown()
      .transform((e) => (e === undefined ? undefined : intList(e)))
      .optional(),
  }),
);
var st = DoctorLazy(() => array(string().min(1).max(MAX_LINE_CHARS)).max(MAX_TAIL_LINES).optional());
var ti = DoctorLazy(() =>
  u({
    allow: st(),
    soft_deny: st(),
    hard_deny: st(),
    environment: st(),
  }),
);
var ni = DoctorLazy(() =>
  u({
    mode: literal("form").optional(),
    message: string().max(MAX_MESSAGE_CHARS),
    requestedSchema: u({
      type: literal("object"),
      properties: u({
        decision: u({
          type: literal("string"),
          enum: array(string().max(64)).max(8),
          description: string().max(256).optional(),
        }),
        feedback: u({
          type: literal("string"),
          description: string().max(256).optional(),
        }),
      }),
      required: array(string().max(64)).max(8).optional(),
    }),
    _meta: u({
      [ANTHROPIC_REMOTETOOLEXECUTION]: u({
        ask_id: askIdSchema(),
        call_id: callIdSchema().optional(),
        input_fingerprint: string().regex(/^[a-f0-9]{64}$/),
        classifier_eligible: M().optional(),
        prior_answer_ok: M().optional(),
      }),
    }),
  }),
);
var isSupportedResourceMimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"];
var n7o = 4;
var vlr = "(a PDF read on ";
var oi = ["application/pdf"];
var si = DoctorLazy(() =>
  u({
    at: E().int().nonnegative(),
    media_type: _enum(oi),
    data: string().regex(/^[A-Za-z0-9+/]+={0,2}$/),
  }),
);
var ri = DoctorLazy(() =>
  unknown().transform((e) =>
    Array.isArray(e)
      ? e.slice(0, n7o).flatMap((n) => {
          let s = si().safeParse(n);
          return s.success ? [s.data] : [];
        })
      : [],
  ),
);
var Eo = DoctorLazy(() =>
  union([
    string(),
    array(
      union([
        u({
          type: literal("text"),
          text: string(),
        }),
        u({
          type: literal("image"),
          source: u({
            type: literal("base64"),
            media_type: _enum(isSupportedResourceMimeType),
            data: string(),
          }),
        }),
      ]),
    ),
  ]),
);
//@ chunk-p8kytbnw.js:276-688 esm-fingerprint
function Ph(n) {
  if (n.length < 4) return null;
  if (n[0] === 137 && n[1] === 80 && n[2] === 78 && n[3] === 71) return "image/png";
  if (n[0] === 255 && n[1] === 216 && n[2] === 255) return "image/jpeg";
  if (
    n.length >= 6 &&
    n[0] === 71 &&
    n[1] === 73 &&
    n[2] === 70 &&
    n[3] === 56 &&
    (n[4] === 55 || n[4] === 57) &&
    n[5] === 97
  )
    return "image/gif";
  if (
    n[0] === 82 &&
    n[1] === 73 &&
    n[2] === 70 &&
    n[3] === 70 &&
    n.length >= 12 &&
    n[8] === 87 &&
    n[9] === 69 &&
    n[10] === 66 &&
    n[11] === 80
  )
    return "image/webp";
  return null;
}
//@ chunk-z1n5m6nf.js:59606-59674 esm-fingerprint
var SUPPORTED_IMAGE_TYPES_2 = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
export {
  SUPPORTED_IMAGE_TYPES,
  Ph,
  SUPPORTED_IMAGE_TYPES_2,
  ce,
  imageMediaTypeSchema,
  fileReadInputSchema,
  n7o,
  vlr,
  qt,
  Uo,
  Bo,
  xo,
  No,
  Eo,
  ri,
  ti,
  ni,
  No_g54k,
  ei,
  Io,
  isSupportedResourceMimeType,
};
