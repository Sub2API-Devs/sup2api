/**
 * remote/tools/toolDescriptors.ts
 *
 * 2.1.316 新增：通告工具描述的解析与清洗、服务调用请求构建
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (13)
 * attribution: placement 13
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { record, string, unknown, u, array, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  withinDepth,
  MAX_TOOL_NAME_CHARS,
  dropUndefined,
  clipText,
  sanitizeDeep,
  REMOTE_TOOL_FIELD_LIMITS,
  CALLER_FIELDS,
  callIdSchema,
  MAX_SINCE_MS,
  REMOTE_TOOL_CALL_META,
  parseRemoteToolRequest,
} from "./protocolSchemas.js";
import {
  byteLengthOf,
  asPlainRecord,
  collectToolNames,
  includesWord,
  clampToMaxPageSize,
  toContentBlocks,
  readResultEnvelope,
  envelopeOf,
} from "./callResults.js";
import { Io } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { uniq } from "../../utils/collections.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { joinDescription } from "./inputSchemaFlatten.js";
import { MAX_MCP_RESULT_CHARS } from "../../constants/outputLimits.js";
import { SAFE_ID_PATTERN, MAX_INT32, SERVER_VERDICT_KEY } from "./protocolConstants.js";

//@ chunk-g54kbxqw.js:24641-25605 placement
/**
 * 远程工具描述符的上限与 schema：最多 16 个工具、passthrough 名 256、描述 2048/4096、schema 64 KB 且深度 16，以及 served/passthrough 两种描述符的字段定义。
 */
var TOOL_DESCRIPTOR_LIMITS = 16;
var MAX_PASSTHROUGH_TOOLS = 256;
var MAX_PASSTHROUGH_NAME_CHARS = 4 * MAX_PASSTHROUGH_TOOLS;
var MAX_PREFIXED_TOOL_NAME = 107;
var MAX_RESULT_SIZE_HINT = 1048576;
var MAX_HOST_DESCRIPTION_CHARS = 2048;
var MAX_TOOL_DESCRIPTION_CHARS = 4096;
var MAX_SERVED_TOOL_NAME_CHARS = 256;
var MAX_INPUT_SCHEMA_BYTES = 65536;
var MAX_INPUT_SCHEMA_DEPTH = 16;
var inputSchemaValue = DoctorLazy(() =>
  record(string(), unknown()).refine(
    (e) => withinDepth(e, MAX_INPUT_SCHEMA_DEPTH) && byteLengthOf(e) <= MAX_INPUT_SCHEMA_BYTES,
  ),
);
var passthroughToolDescriptorSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(MAX_TOOL_NAME_CHARS),
    refused_input_fields: array(string().max(64)).max(32),
    protocol_versions: array(E().int().positive()).max(16),
    description: string().max(MAX_HOST_DESCRIPTION_CHARS).optional(),
    input_schema: inputSchemaValue().optional(),
  }),
);
var MAX_SEARCH_HINT_CHARS = 512;
var MAX_ANNOTATION_TITLE_CHARS = 256;
var servedToolDescriptorSchema = DoctorLazy(() =>
  u({
    name: string().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
    local_name: string().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
    description: string().max(MAX_TOOL_DESCRIPTION_CHARS).optional(),
    input_schema: inputSchemaValue(),
    annotations: u({
      title: string()
        .max(4 * MAX_ANNOTATION_TITLE_CHARS)
        .optional(),
      readOnlyHint: M().optional(),
      destructiveHint: M().optional(),
      openWorldHint: M().optional(),
    }).optional(),
    hints: u({
      search_hint: string()
        .max(4 * MAX_SEARCH_HINT_CHARS)
        .optional(),
      always_load: M().optional(),
      max_result_size_chars: E().positive().optional(),
      requires_user_interaction: M().optional(),
    }).optional(),
  }),
);
var hostEpochRequiredSchema = DoctorLazy(() =>
  Io()
    .required({
      epoch: true,
    })
    .transform(dropUndefined),
);
var toolHostAdvertSchema = DoctorLazy(() =>
  u({
    host: hostEpochRequiredSchema(),
    tools: array(unknown()).max(TOOL_DESCRIPTOR_LIMITS),
    passthrough: array(unknown()).max(MAX_PASSTHROUGH_NAME_CHARS),
    plumbing: array(string().min(1).max(64)).max(8),
  }),
);
//@ chunk-g54kbxqw.js:25605-26273 placement
function parseAnnouncedTools(e, n) {
  let s = toolHostAdvertSchema().safeParse(e);
  if (!s.success) return;
  let r = [];
  let h = new Set();
  let y = (R, S, w, P) =>
    S.reduce((acc, j, Q) => {
      let q = acc.length < w ? P(j) : undefined;
      let G = q?.name ?? asPlainRecord(j)?.name;
      let se = typeof G === "string" ? clipText(sanitizeDeep(G), REMOTE_TOOL_FIELD_LIMITS) : "";
      let N = se !== "" ? se : `${R}[${Q}]`;
      if (q === undefined || q.name === "" || h.has(q.name)) {
        r.push(N);
        return acc;
      }
      h.add(q.name);
      acc.push(q);
      return acc;
    }, []);
  let tools = y("tools", s.data.tools, TOOL_DESCRIPTOR_LIMITS, (R) => {
    let S = passthroughToolDescriptorSchema().safeParse(R);
    return S.success ? sanitizeAnnouncedTool(S.data) : undefined;
  });
  let passthrough = y("passthrough", s.data.passthrough, MAX_PASSTHROUGH_TOOLS, (R) => {
    let S = servedToolDescriptorSchema().safeParse(R);
    return S.success && isValidAnnouncedToolName(S.data.name, n)
      ? toDeclaredTool(sanitizeToolAnnotations(S.data), n)
      : undefined;
  });
  return {
    host: sanitizeDeep(s.data.host),
    tools,
    passthrough,
    plumbing: uniq(sanitizeDeep(s.data.plumbing)).filter((R) => R !== ""),
    ignored: r,
  };
}
//@ chunk-g54kbxqw.js:26273-26380 placement
function isValidAnnouncedToolName(name, n) {
  let index = name.indexOf("__");
  return (
    normalizeNameForMCP(name) === name &&
    name.length <= MAX_PREFIXED_TOOL_NAME &&
    index > 0 &&
    index + 2 < name.length &&
    n.admitsName(name)
  );
}
//@ chunk-g54kbxqw.js:26380-26876 placement
function toDeclaredTool(e, n) {
  let s = {
    ...e,
    input_schema: recursivelySanitizeUnicode(e.input_schema),
  };
  if (s.input_schema.type !== "object") return;
  let r = n.judgeSchema(s.input_schema);
  if (r.verdict === "drop") return;
  let h = r.normalized?.schema ?? s.input_schema;
  let toolNames = collectToolNames(s.input_schema);
  if (toolNames === undefined) return;
  let k = [...Object.keys(asPlainRecord(h.properties) ?? {}), ...toolNames];
  let note = r.normalized?.note ?? "";
  if (CALLER_FIELDS.some((R) => k.includes(R) || includesWord(note, R))) return;
  return r.normalized === undefined
    ? s
    : {
        ...s,
        input_schema: r.normalized.schema,
        description: joinDescription(r.normalized.note, s.description),
      };
}
//@ chunk-g54kbxqw.js:26876-27122 placement
function sanitizeAnnouncedTool(e) {
  return {
    name: sanitizeDeep(e.name),
    refused_input_fields: sanitizeDeep(e.refused_input_fields),
    protocol_versions: e.protocol_versions,
    ...(e.description !== undefined && {
      description: clipText(e.description, MAX_HOST_DESCRIPTION_CHARS),
    }),
    ...(e.input_schema !== undefined && {
      input_schema: sanitizeDeep(e.input_schema),
    }),
  };
}
//@ chunk-g54kbxqw.js:27122-27783 placement
function sanitizeToolAnnotations(e) {
  let n =
    e.annotations?.title !== undefined
      ? clipText(sanitizeDeep(e.annotations.title), MAX_ANNOTATION_TITLE_CHARS)
      : undefined;
  let s =
    e.annotations === undefined
      ? undefined
      : {
          ...e.annotations,
          ...(n !== undefined && {
            title: n,
          }),
        };
  let r =
    e.hints?.search_hint !== undefined
      ? clipText(sanitizeDeep(e.hints.search_hint), MAX_SEARCH_HINT_CHARS)
      : undefined;
  let h =
    e.hints?.max_result_size_chars !== undefined
      ? Math.min(Math.max(1, Math.floor(e.hints.max_result_size_chars)), MAX_MCP_RESULT_CHARS)
      : undefined;
  let y =
    e.hints === undefined
      ? undefined
      : {
          ...e.hints,
          ...(r !== undefined && {
            search_hint: r,
          }),
          ...(h !== undefined && {
            max_result_size_chars: h,
          }),
        };
  return {
    name: sanitizeDeep(e.name),
    local_name: sanitizeDeep(e.local_name),
    ...(e.description !== undefined && {
      description: clipText(e.description, MAX_TOOL_DESCRIPTION_CHARS),
    }),
    input_schema: sanitizeDeep(e.input_schema),
    ...(s !== undefined && {
      annotations: s,
    }),
    ...(y !== undefined && {
      hints: y,
    }),
  };
}
//@ chunk-g54kbxqw.js:27783-28014 placement
var servedCallRequestSchema = DoctorLazy(() =>
  u({
    instance_id: string().regex(SAFE_ID_PATTERN),
    host: string().max(REMOTE_TOOL_FIELD_LIMITS),
    name: string().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
    input: record(string(), unknown()),
    envelope: unknown().optional(),
    tool_use_id: callIdSchema(),
    issued_at: E().int().nonnegative().max(MAX_SINCE_MS),
    deadline_ms: E().int().positive().max(MAX_INT32),
  }),
);
//@ chunk-g54kbxqw.js:28014-28292 placement
function parseServedCallRequest(request) {
  let n = servedCallRequestSchema().safeParse(request);
  if (!n.success) return;
  let { envelope, input, host, name: y, ...k } = n.data;
  let { [REMOTE_TOOL_CALL_META]: C, ...R } = input;
  let S = sanitizeDeep(y);
  if (S === "") return;
  let remoteToolRequest = parseRemoteToolRequest(envelope);
  return {
    ...k,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: S,
    input: R,
    request:
      remoteToolRequest.ok && remoteToolRequest.value.call_id !== k.tool_use_id
        ? {
            ok: false,
            why: "malformed",
          }
        : remoteToolRequest,
  };
}
//@ chunk-g54kbxqw.js:28292-28618 placement
function buildServedCallRequest({
  instanceId,
  host,
  name: s,
  input,
  envelope,
  toolUseId,
  issuedAt,
  deadlineMs,
}) {
  let { [REMOTE_TOOL_CALL_META]: R, ...S } = input;
  let envelope_2 = envelope;
  if (!("op" in envelope) && "caller" in envelope) {
    let { [SERVER_VERDICT_KEY]: P, ...L } = envelope.caller;
    envelope_2 = {
      ...envelope,
      caller: L,
    };
  }
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: s,
    input: S,
    envelope: envelope_2,
    tool_use_id: toolUseId,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: clampToMaxPageSize(deadlineMs),
  };
}
//@ chunk-g54kbxqw.js:28618-28806 placement
var plumbingRequestSchema = DoctorLazy(() =>
  u({
    instance_id: string().regex(SAFE_ID_PATTERN),
    host: string().max(REMOTE_TOOL_FIELD_LIMITS),
    name: string().min(1).max(64),
    args: record(string(), unknown()),
    issued_at: E().int().nonnegative().max(MAX_SINCE_MS),
    deadline_ms: E().int().positive().max(MAX_INT32),
  }),
);
//@ chunk-g54kbxqw.js:28806-28951 placement
function parseMachineAdvert(request) {
  let n = plumbingRequestSchema().safeParse(request);
  let s = n.success ? sanitizeDeep(n.data.name) : "";
  return n.success && s !== ""
    ? {
        ...n.data,
        host: clipText(n.data.host, REMOTE_TOOL_FIELD_LIMITS),
        name: s,
      }
    : undefined;
}
//@ chunk-g54kbxqw.js:28951-29129 placement
function buildPlumbingRequest({ instanceId, host, name: s, args, issuedAt, deadlineMs }) {
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: s,
    args,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: clampToMaxPageSize(deadlineMs),
  };
}
//@ chunk-g54kbxqw.js:29129-29325 placement
function readCallResult(e) {
  let n = asPlainRecord(e);
  if (!n)
    return {
      content: [],
      isError: true,
      envelope: {
        status: "malformed",
      },
    };
  return {
    content: toContentBlocks(n.content),
    isError: n.isError === true,
    envelope: readResultEnvelope(envelopeOf(n.structuredContent) ?? envelopeOf(n._meta)),
  };
}
export {
  readCallResult,
  buildPlumbingRequest,
  buildServedCallRequest,
  MAX_INPUT_SCHEMA_DEPTH,
  parseServedCallRequest,
  parseMachineAdvert,
  MAX_RESULT_SIZE_HINT,
  parseAnnouncedTools,
  MAX_PREFIXED_TOOL_NAME,
  MAX_PASSTHROUGH_TOOLS,
  MAX_TOOL_DESCRIPTION_CHARS,
};
