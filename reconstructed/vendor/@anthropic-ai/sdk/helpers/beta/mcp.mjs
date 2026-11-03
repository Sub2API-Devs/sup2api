/**
 * @anthropic-ai/sdk/helpers/beta/mcp.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-38x90rmj.js (1), chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (1), chunk-fe6rs39h.js (1), chunk-g54kbxqw.js (1), chunk-p8kytbnw.js (1), chunk-z1n5m6nf.js (1)
 * attribution: esm-fingerprint 7
 */
import { DoctorLazy } from "../../../../../src/cli/handlers/util.js";
import { zodStrictObject, o, E, Ka, M, U, u, T, Ue, A, oe } from "../../../../zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../../../../../src/tools/ArtifactTool/publishEdits.js";
import { H8 } from "../../../../../src/utils/truncateGraphemes.js";
import { ALLOW_LARGE_PARAM } from "../../../../../src/tools/FileReadTool/constants.js";
import { booleanishSchema } from "../../../../../src/utils/spellcheck.js";
import { attachedMachineInputField } from "../../../../../src/bridge/deviceRegistration.js";
import { TOOL_HOST_ID_RE, xXr, IXr, ko, So, zvn } from "../../../../../src/remote/tools/protocolConstants.js";
import {
  optionalByteCount,
  SAFE_NAME_SCHEMA,
  t7o,
  SERVING_LIMITS_SCHEMA,
  REMOTE_TOOL_LIMITS,
  it,
  Kr,
  dropUndefined,
  intList,
  NXr,
  Qt,
  NPe,
  ANTHROPIC_REMOTETOOLEXECUTION,
  rt,
  Se,
} from "../../../../../src/remote/tools/protocolSchemas.js";
import { jsonStringify } from "../../../../../src/utils/slowOperations.js";
import { zYt } from "../../../../../src/remote/tools/protocolNegotiation.js";
import { uniq } from "../../../../../src/utils/collections.js";

//@ chunk-38x90rmj.js:7457-7525 esm-fingerprint
var ce = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
//@ chunk-8t8n4kdh.js:69716-69784 esm-fingerprint
var Yc = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
//@ chunk-e6aww6q8.js:3160592-3161562 esm-fingerprint
var fileReadInputSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: o().describe("The absolute path to the file to read"),
      offset: coercedNumberSchema(E().int().nonnegative().optional()).describe(
        "The line number to start reading from. Only provide if the file is too large to read at once",
      ),
      limit: coercedNumberSchema(E().int().positive().optional()).describe(
        "The number of lines to read. Only provide if the file is too large to read at once.",
      ),
      pages: Ka((e) => (typeof e === "string" && e.trim() === "" ? void 0 : e), o().optional()).describe(
        `Page range for PDF files (e.g., "1-5", "3", "10-20"). Only applicable to PDF files. Maximum ${H8} pages per request.`,
      ),
      [ALLOW_LARGE_PARAM]: booleanishSchema(M().optional()).describe(
        "Set to true to read a text file, or a line range of one, that is over the usual size limits, up to what still fits in your context. Only use this when you genuinely need all of it or the user asked for the whole file; otherwise read it in parts with offset and limit, or search it.",
      ),
      ...attachedMachineInputField(),
    }),
  ),
  imageMediaTypeSchema = DoctorLazy(() => U(["image/jpeg", "image/png", "image/gif", "image/webp"]));
//@ chunk-fe6rs39h.js:56627-56983 esm-fingerprint
var qt = "[unsupported content from another client omitted]",
  xo = "[document from another client]",
  No = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  Uo = DoctorLazy(() =>
    u({
      type: T("document"),
      title: o().nullish(),
      context: o().nullish(),
      source: Ue([u({ type: T("text"), data: o() }), u({ type: T("content"), content: Ue([o(), A(oe())]) })]),
    }),
  ),
  Bo = DoctorLazy(() => u({ type: T("text"), text: o() }));
//@ chunk-g54kbxqw.js:16031-18433 esm-fingerprint
var Jr = DoctorLazy(() =>
    u({
      tools: A(o().regex(TOOL_HOST_ID_RE)).max(xXr),
      incomplete: M().optional(),
      cpus: optionalByteCount(),
      memory_gb: optionalByteCount(),
      disk_free_gb: optionalByteCount(),
    }).refine((e) => jsonStringify(e).length <= IXr),
  ),
  Io = DoctorLazy(() =>
    u({
      name: SAFE_NAME_SCHEMA(),
      kind: U(["personal_machine", "sandbox"]),
      platform: o().max(64),
      os_version: o().max(64).optional(),
      arch: o().max(64).optional(),
      shell: o().max(t7o).optional(),
      home_dir: o().max(1024).optional(),
      working_dir: o().max(1024),
      project_sync: U(["two_way", "upload_only", "off", "unknown"]).optional(),
      sync_root: o().max(1024).optional(),
      folder_relation: oe()
        .transform((e) => (e === "separate_copy" ? e : void 0))
        .optional(),
      copy_of: u({ platform: o().max(64), dir: o().max(1024), home_dir: o().max(1024).optional() })
        .optional()
        .catch({ platform: "", dir: "" }),
      limits: SERVING_LIMITS_SCHEMA(),
      claude_code_version: o().max(64).optional(),
      tool_host_interface: zYt()
        .optional()
        .catch(void 0),
      notes: o().max(REMOTE_TOOL_LIMITS).optional(),
      epoch: it().optional(),
      device_id: oe()
        .transform((e) => (typeof e === "string" && Kr.test(e) ? e : void 0))
        .optional(),
      inventory: Jr()
        .optional()
        .catch(void 0),
      capabilities: oe()
        .transform((e) =>
          Array.isArray(e) ? uniq(e.filter((n) => typeof n === "string" && ko.test(n))).slice(0, So) : void 0,
        )
        .optional(),
    }),
  ),
  No_g54k = DoctorLazy(() => Io().transform(dropUndefined)),
  ei = DoctorLazy(() =>
    u({
      v: T(zvn),
      tool: o().min(1).max(128),
      refused_input_fields: A(o().max(64)).max(32),
      target: No_g54k(),
      protocol_versions: oe()
        .transform((e) => (e === void 0 ? void 0 : intList(e)))
        .optional(),
    }),
  ),
  st = DoctorLazy(() => A(o().min(1).max(NXr)).max(Qt).optional()),
  ti = DoctorLazy(() => u({ allow: st(), soft_deny: st(), hard_deny: st(), environment: st() })),
  ni = DoctorLazy(() =>
    u({
      mode: T("form").optional(),
      message: o().max(NPe),
      requestedSchema: u({
        type: T("object"),
        properties: u({
          decision: u({
            type: T("string"),
            enum: A(o().max(64)).max(8),
            description: o().max(256).optional(),
          }),
          feedback: u({ type: T("string"), description: o().max(256).optional() }),
        }),
        required: A(o().max(64)).max(8).optional(),
      }),
      _meta: u({
        [ANTHROPIC_REMOTETOOLEXECUTION]: u({
          ask_id: rt(),
          call_id: Se().optional(),
          input_fingerprint: o().regex(/^[a-f0-9]{64}$/),
          classifier_eligible: M().optional(),
          prior_answer_ok: M().optional(),
        }),
      }),
    }),
  ),
  Lo = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  n7o = 4,
  vlr = "(a PDF read on ",
  oi = ["application/pdf"],
  si = DoctorLazy(() =>
    u({ at: E().int().nonnegative(), media_type: U(oi), data: o().regex(/^[A-Za-z0-9+/]+={0,2}$/) }),
  ),
  ri = DoctorLazy(() =>
    oe().transform((e) =>
      Array.isArray(e)
        ? e.slice(0, n7o).flatMap((n) => {
            let safeParse = si().safeParse(n);
            return safeParse.success ? [safeParse.data] : [];
          })
        : [],
    ),
  ),
  Eo = DoctorLazy(() =>
    Ue([
      o(),
      A(
        Ue([
          u({ type: T("text"), text: o() }),
          u({ type: T("image"), source: u({ type: T("base64"), media_type: U(Lo), data: o() }) }),
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
var qn = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export {
  Yc,
  Ph,
  qn,
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
  Lo,
};
