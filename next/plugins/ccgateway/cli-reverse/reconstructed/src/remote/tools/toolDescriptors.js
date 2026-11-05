/**
 * remote/tools/toolDescriptors.ts
 *
 * 2.1.316 新增：通告工具描述的解析与清洗、服务调用请求构建
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (7), chunk-k0v80sg8.js (13)
 * attribution: sole-consumer 6, placement 13, layout 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  record,
  stringSchema,
  unknown,
  objectSchema,
  array,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
  parseRemoteToolRequest,
  REMOTE_TOOL_CALL_META,
  MAX_RESULT_BYTES,
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
import { toolHostSchema } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { CLAUDEAI_SERVER_PREFIX } from "../../services/mcp/normalization.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { joinDescription } from "./inputSchemaFlatten.js";
import { MAX_MCP_RESULT_CHARS } from "../../constants/outputLimits.js";
import { SAFE_ID_PATTERN, MAX_INT32, SERVER_VERDICT_KEY } from "./protocolConstants.js";
import { isPlainObject } from "../../utils/objectUtils.js";
import { judgeCallClaim } from "../../services/mcpServe/callClaims.js";
import { buildRemoteCallEnvelope, REQUEST_REAUTHORED } from "./reauthoredRequest.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-k0v80sg8.js:23390-24353 placement
/**
 * 远程工具描述符的上限与 schema：最多 16 个工具、passthrough 名 256、描述 2048/4096、schema 64 KB 且深度 16，以及 served/passthrough 两种描述符的字段定义。
 */
var TOOL_DESCRIPTOR_LIMITS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PASSTHROUGH_TOOLS;
var MAX_PASSTHROUGH_NAME_CHARS;
var MAX_PREFIXED_TOOL_NAME_CHARS;
var MAX_RESULT_SIZE_HINT;
var MAX_HOST_DESCRIPTION_CHARS;
var MAX_TOOL_DESCRIPTION_CHARS;
var MAX_SERVED_TOOL_NAME_CHARS;
var MAX_INPUT_SCHEMA_BYTES;
var MAX_INPUT_SCHEMA_DEPTH;
var inputSchemaValue;
var passthroughToolDescriptorSchema;
var MAX_SEARCH_HINT_CHARS;
var MAX_ANNOTATION_TITLE_CHARS;
var servedToolDescriptorSchema;
var hostEpochRequiredSchema;
var toolHostAdvertSchema;
deferInit("chunk-k0v80sg8.js:23390", () => {
  TOOL_DESCRIPTOR_LIMITS = 16;
  MAX_PASSTHROUGH_TOOLS = 256;
  MAX_PASSTHROUGH_NAME_CHARS = 4 * MAX_PASSTHROUGH_TOOLS;
  MAX_PREFIXED_TOOL_NAME_CHARS = 107;
  MAX_RESULT_SIZE_HINT = 1048576;
  MAX_HOST_DESCRIPTION_CHARS = 2048;
  MAX_TOOL_DESCRIPTION_CHARS = 4096;
  MAX_SERVED_TOOL_NAME_CHARS = 256;
  MAX_INPUT_SCHEMA_BYTES = 65536;
  MAX_INPUT_SCHEMA_DEPTH = 16;
  inputSchemaValue = DoctorLazy(() =>
    record(stringSchema(), unknown()).refine(
      (schema) =>
        withinDepth(schema, MAX_INPUT_SCHEMA_DEPTH) && byteLengthOf(schema) <= MAX_INPUT_SCHEMA_BYTES,
    ),
  );
  passthroughToolDescriptorSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(MAX_TOOL_NAME_CHARS),
      refused_input_fields: array(stringSchema().max(64)).max(32),
      protocol_versions: array(numberSchema().int().positive()).max(16),
      description: stringSchema().max(MAX_HOST_DESCRIPTION_CHARS).optional(),
      input_schema: inputSchemaValue().optional(),
    }),
  );
  MAX_SEARCH_HINT_CHARS = 512;
  MAX_ANNOTATION_TITLE_CHARS = 256;
  servedToolDescriptorSchema = DoctorLazy(() =>
    objectSchema({
      name: stringSchema().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
      local_name: stringSchema().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
      description: stringSchema().max(MAX_TOOL_DESCRIPTION_CHARS).optional(),
      input_schema: inputSchemaValue(),
      annotations: objectSchema({
        title: stringSchema()
          .max(4 * MAX_ANNOTATION_TITLE_CHARS)
          .optional(),
        readOnlyHint: booleanSchema().optional(),
        destructiveHint: booleanSchema().optional(),
        openWorldHint: booleanSchema().optional(),
      }).optional(),
      hints: objectSchema({
        search_hint: stringSchema()
          .max(4 * MAX_SEARCH_HINT_CHARS)
          .optional(),
        always_load: booleanSchema().optional(),
        max_result_size_chars: numberSchema().positive().optional(),
        requires_user_interaction: booleanSchema().optional(),
      }).optional(),
    }),
  );
  hostEpochRequiredSchema = DoctorLazy(() =>
    toolHostSchema()
      .required({
        epoch: true,
      })
      .transform(dropUndefined),
  );
  toolHostAdvertSchema = DoctorLazy(() =>
    objectSchema({
      host: hostEpochRequiredSchema(),
      tools: array(unknown()).max(TOOL_DESCRIPTOR_LIMITS),
      passthrough: array(unknown()).max(MAX_PASSTHROUGH_NAME_CHARS),
      plumbing: array(stringSchema().min(1).max(64)).max(8),
    }),
  );
});
//@ chunk-k0v80sg8.js:24353-25029 placement
function parseAnnouncedTools(value, limits) {
  let parsed = toolHostAdvertSchema().safeParse(value);
  if (!parsed.success) return;
  let tools = [];
  let seenNames = new Set();
  let adoptAll = (acc, items, maxCount, adopt) =>
    items.reduce((acc_2, item, index) => {
      let adopted = acc_2.length < maxCount ? adopt(item) : undefined;
      let name = adopted?.name ?? asPlainRecord(item)?.name;
      let displayName =
        typeof name === "string" ? clipText(sanitizeDeep(name), REMOTE_TOOL_FIELD_LIMITS) : "";
      let fallbackName = displayName !== "" ? displayName : `${acc}[${index}]`;
      if (adopted === undefined || adopted.name === "" || seenNames.has(adopted.name)) {
        tools.push(fallbackName);
        return acc_2;
      }
      seenNames.add(adopted.name);
      acc_2.push(adopted);
      return acc_2;
    }, []);
  let tools_2 = adoptAll("tools", parsed.data.tools, TOOL_DESCRIPTOR_LIMITS, (item) => {
    let parsed = passthroughToolDescriptorSchema().safeParse(item);
    return parsed.success ? sanitizeAnnouncedTool(parsed.data) : undefined;
  });
  let passthrough = adoptAll("passthrough", parsed.data.passthrough, MAX_PASSTHROUGH_TOOLS, (item) => {
    let parsed = servedToolDescriptorSchema().safeParse(item);
    return parsed.success && isValidAnnouncedToolName(parsed.data.name, limits)
      ? toDeclaredTool(sanitizeToolAnnotations(parsed.data), limits)
      : undefined;
  });
  return {
    host: sanitizeDeep(parsed.data.host),
    tools: tools_2,
    passthrough,
    plumbing: normalizeCaseForComparison_2(sanitizeDeep(parsed.data.plumbing)).filter((line) => line !== ""),
    ignored: tools,
  };
}
//@ chunk-k0v80sg8.js:25029-25136 placement
function isValidAnnouncedToolName(name, limits) {
  let index = name.indexOf("__");
  return (
    CLAUDEAI_SERVER_PREFIX(name) === name &&
    name.length <= MAX_PREFIXED_TOOL_NAME_CHARS &&
    index > 0 &&
    index + 2 < name.length &&
    limits.admitsName(name)
  );
}
//@ chunk-k0v80sg8.js:25136-25631 placement
function toDeclaredTool(tool, limits) {
  let copy = {
    ...tool,
    input_schema: recursivelySanitizeUnicode(tool.input_schema),
  };
  if (copy.input_schema.type !== "object") return;
  let judged = limits.judgeSchema(copy.input_schema);
  if (judged.verdict === "drop") return;
  let schema = judged.normalized?.schema ?? copy.input_schema;
  let toolNames = collectToolNames(copy.input_schema);
  if (toolNames === undefined) return;
  let names = [...Object.keys(asPlainRecord(schema.properties) ?? {}), ...toolNames];
  let note = judged.normalized?.note ?? "";
  if (CALLER_FIELDS.some((field) => names.includes(field) || includesWord(note, field))) return;
  return judged.normalized === undefined
    ? copy
    : {
        ...copy,
        input_schema: judged.normalized.schema,
        description: joinDescription(judged.normalized.note, copy.description),
      };
}
//@ chunk-k0v80sg8.js:25631-25877 placement
function sanitizeAnnouncedTool(tool) {
  return {
    name: sanitizeDeep(tool.name),
    refused_input_fields: sanitizeDeep(tool.refused_input_fields),
    protocol_versions: tool.protocol_versions,
    ...(tool.description !== undefined && {
      description: clipText(tool.description, MAX_HOST_DESCRIPTION_CHARS),
    }),
    ...(tool.input_schema !== undefined && {
      input_schema: sanitizeDeep(tool.input_schema),
    }),
  };
}
//@ chunk-k0v80sg8.js:25877-26537 placement
function sanitizeToolAnnotations(tool) {
  let title =
    tool.annotations?.title !== undefined
      ? clipText(sanitizeDeep(tool.annotations.title), MAX_ANNOTATION_TITLE_CHARS)
      : undefined;
  let annotations =
    tool.annotations === undefined
      ? undefined
      : {
          ...tool.annotations,
          ...(title !== undefined && {
            title,
          }),
        };
  let searchHint =
    tool.hints?.search_hint !== undefined
      ? clipText(sanitizeDeep(tool.hints.search_hint), MAX_SEARCH_HINT_CHARS)
      : undefined;
  let maxResultSize =
    tool.hints?.max_result_size_chars !== undefined
      ? Math.min(Math.max(1, Math.floor(tool.hints.max_result_size_chars)), MAX_MCP_RESULT_CHARS)
      : undefined;
  let hints =
    tool.hints === undefined
      ? undefined
      : {
          ...tool.hints,
          ...(searchHint !== undefined && {
            search_hint: searchHint,
          }),
          ...(maxResultSize !== undefined && {
            max_result_size_chars: maxResultSize,
          }),
        };
  return {
    name: sanitizeDeep(tool.name),
    local_name: sanitizeDeep(tool.local_name),
    ...(tool.description !== undefined && {
      description: clipText(tool.description, MAX_TOOL_DESCRIPTION_CHARS),
    }),
    input_schema: sanitizeDeep(tool.input_schema),
    ...(annotations !== undefined && {
      annotations,
    }),
    ...(hints !== undefined && {
      hints,
    }),
  };
}
//@ chunk-k0v80sg8.js:26537-26764 placement
var servedCallRequestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k0v80sg8.js:26537", () => {
  servedCallRequestSchema = DoctorLazy(() =>
    objectSchema({
      instance_id: stringSchema().regex(SAFE_ID_PATTERN),
      host: stringSchema().max(REMOTE_TOOL_FIELD_LIMITS),
      name: stringSchema().min(1).max(MAX_SERVED_TOOL_NAME_CHARS),
      input: record(stringSchema(), unknown()),
      envelope: unknown().optional(),
      tool_use_id: callIdSchema(),
      issued_at: numberSchema().int().nonnegative().max(MAX_SINCE_MS),
      deadline_ms: numberSchema().int().positive().max(MAX_INT32),
    }),
  );
});
//@ chunk-k0v80sg8.js:26764-27047 layout
function sanitizeServedCall(request, parseRequest = parseRemoteToolRequest) {
  let parsed = servedCallRequestSchema().safeParse(request);
  if (!parsed.success) return;
  let { envelope, input, host, name, ...rest } = parsed.data;
  let { [REMOTE_TOOL_CALL_META]: remoteMeta, ...toolInput } = input;
  let sanitizedName = sanitizeDeep(name);
  if (sanitizedName === "") return;
  let requestParse = parseRequest(envelope, rest);
  return {
    ...rest,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: sanitizedName,
    input: toolInput,
    request:
      requestParse.ok && requestParse.value.call_id !== rest.tool_use_id
        ? {
            ok: false,
            why: "malformed",
          }
        : requestParse,
  };
}
//@ chunk-k0v80sg8.js:27047-27373 placement
function buildServedCallRequest({
  instanceId,
  host,
  name,
  input,
  envelope,
  toolUseId,
  issuedAt,
  deadlineMs,
}) {
  let { [REMOTE_TOOL_CALL_META]: callMeta, ...rest } = input;
  let envelope_2 = envelope;
  if (!("op" in envelope) && "caller" in envelope) {
    let { [SERVER_VERDICT_KEY]: serverVerdict, ...callerRest } = envelope.caller;
    envelope_2 = {
      ...envelope,
      caller: callerRest,
    };
  }
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name,
    input: rest,
    envelope: envelope_2,
    tool_use_id: toolUseId,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: clampToMaxPageSize(deadlineMs),
  };
}
//@ chunk-k0v80sg8.js:27373-27558 placement
var plumbingRequestSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-k0v80sg8.js:27373", () => {
  plumbingRequestSchema = DoctorLazy(() =>
    objectSchema({
      instance_id: stringSchema().regex(SAFE_ID_PATTERN),
      host: stringSchema().max(REMOTE_TOOL_FIELD_LIMITS),
      name: stringSchema().min(1).max(64),
      args: record(stringSchema(), unknown()),
      issued_at: numberSchema().int().nonnegative().max(MAX_SINCE_MS),
      deadline_ms: numberSchema().int().positive().max(MAX_INT32),
    }),
  );
});
//@ chunk-k0v80sg8.js:27558-27702 placement
function parseMachineAdvert(request) {
  let parsed = plumbingRequestSchema().safeParse(request);
  let name = parsed.success ? sanitizeDeep(parsed.data.name) : "";
  return parsed.success && name !== ""
    ? {
        ...parsed.data,
        host: clipText(parsed.data.host, REMOTE_TOOL_FIELD_LIMITS),
        name,
      }
    : undefined;
}
//@ chunk-k0v80sg8.js:27702-27879 placement
function buildPlumbingRequest({ instanceId, host, name, args, issuedAt, deadlineMs }) {
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name,
    args,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: clampToMaxPageSize(deadlineMs),
  };
}
//@ chunk-k0v80sg8.js:27879-28074 placement
function readCallResult(result) {
  let record = asPlainRecord(result);
  if (!record)
    return {
      content: [],
      isError: true,
      envelope: {
        status: "malformed",
      },
    };
  return {
    content: toContentBlocks(record.content),
    isError: record.isError === true,
    envelope: readResultEnvelope(envelopeOf(record.structuredContent) ?? envelopeOf(record._meta)),
  };
}
//@ chunk-4z1ntdgk.js:160931-161008 sole-consumer
var ENVELOPE_FIELDS = ["v", "op", "call_id", "expires_in_ms", "caller", "read_baseline"];
var MAX_METRICS_DEPTH = 1000;
//@ chunk-4z1ntdgk.js:161008-161076 sole-consumer
function refuseSharedRequest(sharedRequestRefusal) {
  return {
    ok: false,
    why: "malformed",
    sharedRequestRefusal,
  };
}
//@ chunk-4z1ntdgk.js:161076-161129 sole-consumer
function isEnvelopeShaped(value) {
  return isPlainObject(value) && Object.hasOwn(value, "step");
}
//@ chunk-4z1ntdgk.js:161129-161238 sole-consumer
function measureSharedRequest(request) {
  let jsonText = {
    toolInput: request.input,
    envelope: request.envelope,
  };
  return withinDepth(jsonText, MAX_METRICS_DEPTH) ? byteLengthOf(jsonText) : Number.POSITIVE_INFINITY;
}
//@ chunk-4z1ntdgk.js:161238-161675 sole-consumer
function resolveClaim(claim, rest) {
  let claimKind = judgeCallClaim(claim, "compared_elsewhere", "attached_computer");
  switch (claimKind.kind) {
    case "requested":
    case "declined": {
      let parsedCall = buildRemoteCallEnvelope(claimKind.request, rest);
      return parsedCall.ok
        ? {
            ...parsedCall,
            kind: "call",
          }
        : refuseSharedRequest({
            what: "malformed",
          });
    }
    case "not_honoured":
      return refuseSharedRequest({
        what: "not_honoured",
        part: claimKind.part,
      });
    case "too_large":
    case "malformed":
      return refuseSharedRequest({
        what: claimKind.kind,
      });
    case "session_too_old":
    case "daemon_too_old":
    case "unlisted_restriction_on":
      return refuseSharedRequest({
        what: "malformed",
      });
    default:
      return claimKind;
  }
}
//@ chunk-4z1ntdgk.js:161675-161873 placement
function parseServedCallRequest(request, modeStamp) {
  let isRerequested = modeStamp === REQUEST_REAUTHORED;
  if (!isPlainObject(request)) return isRerequested ? undefined : sanitizeServedCall(request);
  if (!isRerequested && !isEnvelopeShaped(request.envelope)) return sanitizeServedCall(request);
  let arrivedBytes = isRerequested ? measureSharedRequest(request) : undefined;
  let rest = sanitizeServedCall(request, (envelope, which) =>
    resolveSharedRequest(envelope, which, modeStamp, arrivedBytes),
  );
  return (
    rest && {
      ...rest,
      sharedRequest: {
        arrivedBytes,
      },
    }
  );
}
//@ chunk-4z1ntdgk.js:161873-162247 sole-consumer
function resolveSharedRequest(claim, rest, modeStamp, arrivedBytes) {
  if (!isEnvelopeShaped(claim))
    return refuseSharedRequest({
      what: "no_step",
    });
  if (ENVELOPE_FIELDS.some((field) => Object.hasOwn(claim, field)))
    return refuseSharedRequest({
      what: "both_formats",
    });
  if (modeStamp !== REQUEST_REAUTHORED)
    return refuseSharedRequest({
      what: "unmarked",
    });
  if (arrivedBytes === undefined || arrivedBytes > MAX_RESULT_BYTES)
    return refuseSharedRequest({
      what: "too_large",
    });
  try {
    return resolveClaim(claim, {
      ...rest,
      gate_mark: modeStamp,
    });
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "reading a ToolHost permission request from a cloud session threw",
      ),
    );
    return refuseSharedRequest({
      what: "malformed",
    });
  }
}
export {
  readCallResult,
  MAX_INPUT_SCHEMA_DEPTH,
  MAX_RESULT_SIZE_HINT,
  parseAnnouncedTools,
  parseServedCallRequest,
  parseMachineAdvert,
  MAX_PREFIXED_TOOL_NAME_CHARS,
  MAX_PASSTHROUGH_TOOLS,
  MAX_TOOL_DESCRIPTION_CHARS,
  buildPlumbingRequest,
  buildServedCallRequest,
};
