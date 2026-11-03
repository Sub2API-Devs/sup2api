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
import { pe, o, oe, u, A, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  withinDepth,
  Jt,
  dropUndefined,
  clipText,
  sanitizeDeep,
  REMOTE_TOOL_FIELD_LIMITS,
  qvn,
  Se,
  lt,
  REMOTE_TOOL_CALL_META,
  parseRemoteToolRequest,
} from "./protocolSchemas.js";
import {
  iv,
  be,
  collectToolNames,
  includesWord,
  AJ,
  toContentBlocks,
  readResultEnvelope,
  envelopeOf,
} from "./callResults.js";
import { Io } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { uniq } from "../../utils/collections.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { recursivelySanitizeUnicode } from "../../utils/sanitization.js";
import { joinDescription } from "./inputSchemaFlatten.js";
import { Tle } from "../../constants/outputLimits.js";
import { SAFE_ID_PATTERN, Ie, SERVER_VERDICT_KEY } from "./protocolConstants.js";

//@ chunk-g54kbxqw.js:24641-25605 placement
var TOOL_DESCRIPTOR_LIMITS = 16,
  FXr = 256,
  yi = 4 * FXr,
  i7o = 107,
  Clr = 1048576,
  Ho = 2048,
  Rlr = 4096,
  Zt = 256,
  _i = 65536,
  xlr = 16,
  Uo = DoctorLazy(() => pe(o(), oe()).refine((e) => withinDepth(e, xlr) && iv(e) <= _i)),
  bi = DoctorLazy(() =>
    u({
      name: o().min(1).max(Jt),
      refused_input_fields: A(o().max(64)).max(32),
      protocol_versions: A(E().int().positive()).max(16),
      description: o().max(Ho).optional(),
      input_schema: Uo().optional(),
    }),
  ),
  jo = 512,
  zo = 256,
  Si = DoctorLazy(() =>
    u({
      name: o().min(1).max(Zt),
      local_name: o().min(1).max(Zt),
      description: o().max(Rlr).optional(),
      input_schema: Uo(),
      annotations: u({
        title: o()
          .max(4 * zo)
          .optional(),
        readOnlyHint: M().optional(),
        destructiveHint: M().optional(),
        openWorldHint: M().optional(),
      }).optional(),
      hints: u({
        search_hint: o()
          .max(4 * jo)
          .optional(),
        always_load: M().optional(),
        max_result_size_chars: E().positive().optional(),
        requires_user_interaction: M().optional(),
      }).optional(),
    }),
  ),
  Ti = DoctorLazy(() => Io().required({ epoch: !0 }).transform(dropUndefined)),
  Ci = DoctorLazy(() =>
    u({
      host: Ti(),
      tools: A(oe()).max(TOOL_DESCRIPTOR_LIMITS),
      passthrough: A(oe()).max(yi),
      plumbing: A(o().min(1).max(64)).max(8),
    }),
  );
//@ chunk-g54kbxqw.js:25605-26273 placement
function parseAnnouncedTools(e, n) {
  let safeParse = Ci().safeParse(e);
  if (!safeParse.success) return;
  let r = [],
    h = new Set(),
    y = (R, S, w, P) =>
      S.reduce((L, j, Q) => {
        let q = L.length < w ? P(j) : void 0,
          G = q?.name ?? be(j)?.name,
          se = typeof G === "string" ? clipText(sanitizeDeep(G), REMOTE_TOOL_FIELD_LIMITS) : "",
          N = se !== "" ? se : `${R}[${Q}]`;
        if (q === void 0 || q.name === "" || h.has(q.name)) return (r.push(N), L);
        return (h.add(q.name), L.push(q), L);
      }, []),
    k = y("tools", safeParse.data.tools, TOOL_DESCRIPTOR_LIMITS, (R) => {
      let safeParse = bi().safeParse(R);
      return safeParse.success ? sanitizeAnnouncedTool(safeParse.data) : void 0;
    }),
    C = y("passthrough", safeParse.data.passthrough, FXr, (R) => {
      let safeParse = Si().safeParse(R);
      return safeParse.success && isValidAnnouncedToolName(safeParse.data.name, n)
        ? toDeclaredTool(sanitizeToolAnnotations(safeParse.data), n)
        : void 0;
    });
  return {
    host: sanitizeDeep(safeParse.data.host),
    tools: k,
    passthrough: C,
    plumbing: uniq(sanitizeDeep(safeParse.data.plumbing)).filter((R) => R !== ""),
    ignored: r,
  };
}
//@ chunk-g54kbxqw.js:26273-26380 placement
function isValidAnnouncedToolName(e, n) {
  let index = e.indexOf("__");
  return (
    normalizeNameForMCP(e) === e && e.length <= i7o && index > 0 && index + 2 < e.length && n.admitsName(e)
  );
}
//@ chunk-g54kbxqw.js:26380-26876 placement
function toDeclaredTool(e, n) {
  let s = { ...e, input_schema: recursivelySanitizeUnicode(e.input_schema) };
  if (s.input_schema.type !== "object") return;
  let judgeSchema = n.judgeSchema(s.input_schema);
  if (judgeSchema.verdict === "drop") return;
  let h = judgeSchema.normalized?.schema ?? s.input_schema,
    y = collectToolNames(s.input_schema);
  if (y === void 0) return;
  let k = [...Object.keys(be(h.properties) ?? {}), ...y],
    C = judgeSchema.normalized?.note ?? "";
  if (qvn.some((R) => k.includes(R) || includesWord(C, R))) return;
  return judgeSchema.normalized === void 0
    ? s
    : {
        ...s,
        input_schema: judgeSchema.normalized.schema,
        description: joinDescription(judgeSchema.normalized.note, s.description),
      };
}
//@ chunk-g54kbxqw.js:26876-27122 placement
function sanitizeAnnouncedTool(e) {
  return {
    name: sanitizeDeep(e.name),
    refused_input_fields: sanitizeDeep(e.refused_input_fields),
    protocol_versions: e.protocol_versions,
    ...(e.description !== void 0 && { description: clipText(e.description, Ho) }),
    ...(e.input_schema !== void 0 && { input_schema: sanitizeDeep(e.input_schema) }),
  };
}
//@ chunk-g54kbxqw.js:27122-27783 placement
function sanitizeToolAnnotations(e) {
  let n = e.annotations?.title !== void 0 ? clipText(sanitizeDeep(e.annotations.title), zo) : void 0,
    s = e.annotations === void 0 ? void 0 : { ...e.annotations, ...(n !== void 0 && { title: n }) },
    r = e.hints?.search_hint !== void 0 ? clipText(sanitizeDeep(e.hints.search_hint), jo) : void 0,
    h =
      e.hints?.max_result_size_chars !== void 0
        ? Math.min(Math.max(1, Math.floor(e.hints.max_result_size_chars)), Tle)
        : void 0,
    y =
      e.hints === void 0
        ? void 0
        : {
            ...e.hints,
            ...(r !== void 0 && { search_hint: r }),
            ...(h !== void 0 && { max_result_size_chars: h }),
          };
  return {
    name: sanitizeDeep(e.name),
    local_name: sanitizeDeep(e.local_name),
    ...(e.description !== void 0 && { description: clipText(e.description, Rlr) }),
    input_schema: sanitizeDeep(e.input_schema),
    ...(s !== void 0 && { annotations: s }),
    ...(y !== void 0 && { hints: y }),
  };
}
//@ chunk-g54kbxqw.js:27783-28014 placement
var servedCallRequestSchema = DoctorLazy(() =>
  u({
    instance_id: o().regex(SAFE_ID_PATTERN),
    host: o().max(REMOTE_TOOL_FIELD_LIMITS),
    name: o().min(1).max(Zt),
    input: pe(o(), oe()),
    envelope: oe().optional(),
    tool_use_id: Se(),
    issued_at: E().int().nonnegative().max(lt),
    deadline_ms: E().int().positive().max(Ie),
  }),
);
//@ chunk-g54kbxqw.js:28014-28292 placement
function parseServedCallRequest(e) {
  let safeParse = servedCallRequestSchema().safeParse(e);
  if (!safeParse.success) return;
  let { envelope: envelope, input: input, host: host, name: y, ...k } = safeParse.data,
    { [REMOTE_TOOL_CALL_META]: C, ...R } = input,
    S = sanitizeDeep(y);
  if (S === "") return;
  let w = parseRemoteToolRequest(envelope);
  return {
    ...k,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: S,
    input: R,
    request: w.ok && w.value.call_id !== k.tool_use_id ? { ok: !1, why: "malformed" } : w,
  };
}
//@ chunk-g54kbxqw.js:28292-28618 placement
function buildServedCallRequest({
  instanceId: instanceId,
  host: host,
  name: s,
  input: input,
  envelope: envelope,
  toolUseId: toolUseId,
  issuedAt: issuedAt,
  deadlineMs: deadlineMs,
}) {
  let { [REMOTE_TOOL_CALL_META]: R, ...S } = input,
    w = envelope;
  if (!("op" in envelope) && "caller" in envelope) {
    let { [SERVER_VERDICT_KEY]: P, ...L } = envelope.caller;
    w = { ...envelope, caller: L };
  }
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: s,
    input: S,
    envelope: w,
    tool_use_id: toolUseId,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: AJ(deadlineMs),
  };
}
//@ chunk-g54kbxqw.js:28618-28806 placement
var plumbingRequestSchema = DoctorLazy(() =>
  u({
    instance_id: o().regex(SAFE_ID_PATTERN),
    host: o().max(REMOTE_TOOL_FIELD_LIMITS),
    name: o().min(1).max(64),
    args: pe(o(), oe()),
    issued_at: E().int().nonnegative().max(lt),
    deadline_ms: E().int().positive().max(Ie),
  }),
);
//@ chunk-g54kbxqw.js:28806-28951 placement
function parseMachineAdvert(e) {
  let safeParse = plumbingRequestSchema().safeParse(e),
    s = safeParse.success ? sanitizeDeep(safeParse.data.name) : "";
  return safeParse.success && s !== ""
    ? { ...safeParse.data, host: clipText(safeParse.data.host, REMOTE_TOOL_FIELD_LIMITS), name: s }
    : void 0;
}
//@ chunk-g54kbxqw.js:28951-29129 placement
function buildPlumbingRequest({
  instanceId: instanceId,
  host: host,
  name: s,
  args: args,
  issuedAt: issuedAt,
  deadlineMs: deadlineMs,
}) {
  return {
    instance_id: instanceId,
    host: clipText(host, REMOTE_TOOL_FIELD_LIMITS),
    name: s,
    args: args,
    issued_at: Math.max(0, Math.trunc(issuedAt)),
    deadline_ms: AJ(deadlineMs),
  };
}
//@ chunk-g54kbxqw.js:29129-29325 placement
function readCallResult(e) {
  let n = be(e);
  if (!n) return { content: [], isError: !0, envelope: { status: "malformed" } };
  return {
    content: toContentBlocks(n.content),
    isError: n.isError === !0,
    envelope: readResultEnvelope(envelopeOf(n.structuredContent) ?? envelopeOf(n._meta)),
  };
}

export {
  readCallResult,
  buildPlumbingRequest,
  buildServedCallRequest,
  xlr,
  parseServedCallRequest,
  parseMachineAdvert,
  Clr,
  parseAnnouncedTools,
  i7o,
  FXr,
  Rlr,
};
