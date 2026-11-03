/**
 * remote/tools/callResults.ts
 *
 * 2.1.316 新增：远程工具调用结果的清洗、内容块转换与同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (20)
 * attribution: placement 20
 */
import {
  ANTHROPIC_REMOTETOOLEXECUTION,
  parseResultEnvelope,
  clipTarget,
  MAX_ACCEPT_NOTES,
  clipText,
  MAX_TOOL_NAME_CHARS,
  MAX_SUGGESTIONS,
  MAX_SUGGESTION_CHARS,
  autoModeField,
  sanitizeDeep,
  MAX_REFUSAL_NOTES,
  MAX_LIST_FIELD_LENGTH,
  REMOTE_TOOL_FIELD_LIMITS,
} from "./protocolSchemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { MAX_INT32, REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { MAX_INPUT_SCHEMA_DEPTH } from "./toolDescriptors.js";
import { resolveSchemaRef, SCHEMA_COMBINATOR_KEYS } from "./inputSchemaFlatten.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, string, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { isSupportedResourceMimeType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { setSkillsSyncVetoed, setAccountSkillsSyncEnabled, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-g54kbxqw.js:29325-29379 placement
function envelopeOf(e) {
  let n = asPlainRecord(e);
  return n && ANTHROPIC_REMOTETOOLEXECUTION in n ? n : undefined;
}
//@ chunk-g54kbxqw.js:29379-29500 placement
function readResultEnvelope(e) {
  if (!e)
    return {
      status: "absent",
    };
  let resultEnvelope = parseResultEnvelope(e[ANTHROPIC_REMOTETOOLEXECUTION]);
  return resultEnvelope
    ? {
        status: "present",
        envelope: resultEnvelope,
      }
    : {
        status: "malformed",
      };
}
//@ chunk-g54kbxqw.js:29500-29822 placement = isMalformedBase64Image (1)
/**
 * 把远程工具返回的内容块转成 MCP 内容（文本保留、base64 图片保留，其余 JSON 化为文本）。
 */
function toRemoteToolContentBlocks(content) {
  if (typeof content === "string") return content;
  return content.map((n) => {
    switch (n.type) {
      case "text":
        return {
          type: "text",
          text: n.text,
        };
      case "image":
        return n.source.type === "base64"
          ? {
              type: "image",
              source: {
                type: "base64",
                media_type: n.source.media_type,
                data: n.source.data,
              },
            }
          : {
              type: "text",
              text: jsonStringify(n),
            };
      default:
        return {
          type: "text",
          text: jsonStringify(n),
        };
    }
  });
}
//@ chunk-g54kbxqw.js:29822-30040 placement
/**
 * 由远程工具执行信封构造 MCP CallTool 结果（refused/failed/is_error 时 isError，信封放进 structuredContent/_meta）。
 */
function buildRemoteToolCallResult({ envelope, content }) {
  let s =
    envelope.outcome === "refused" ||
    envelope.outcome === "failed" ||
    (envelope.outcome === "completed" && envelope.is_error);
  let r = sanitizeRemoteToolEnvelope(envelope);
  return {
    content: toMcpContentBlocks(toRemoteToolContentBlocks(content)),
    structuredContent: {
      [ANTHROPIC_REMOTETOOLEXECUTION]: r,
    },
    isError: s,
    ...(s && {
      _meta: {
        [ANTHROPIC_REMOTETOOLEXECUTION]: r,
      },
    }),
  };
}
//@ chunk-g54kbxqw.js:30040-30789 placement
/**
 * 清洗远程工具执行信封（按 outcome：completed/refused/failed/needs_approval/acknowledged/in_progress 截断与过滤字段）。
 */
function sanitizeRemoteToolEnvelope(envelope) {
  let target = clipTarget(envelope.target);
  let s = "notes" in envelope &&
    envelope.notes !== undefined && {
      notes: envelope.notes.slice(0, MAX_ACCEPT_NOTES).map((note) => clipText(note)),
    };
  switch (envelope.outcome) {
    case "completed":
      return {
        ...envelope,
        target,
        ...s,
      };
    case "refused":
    case "failed":
      return {
        ...envelope,
        target,
        message: clipText(envelope.message),
        ...s,
      };
    case "needs_approval": {
      let { auto_mode: autoMode, ...h } = envelope;
      return {
        ...h,
        target,
        tool: clipText(envelope.tool, MAX_TOOL_NAME_CHARS),
        message: clipText(envelope.message),
        ...(envelope.decision_reason !== undefined && {
          decision_reason: clipText(envelope.decision_reason),
        }),
        ...(envelope.suggestions !== undefined && {
          suggestions: envelope.suggestions
            .slice(0, MAX_SUGGESTIONS)
            .map((suggestion) => clipText(suggestion, MAX_SUGGESTION_CHARS)),
        }),
        ...autoModeField(autoMode),
        ...(envelope.elicitation !== undefined && {
          elicitation: sanitizeDeep({
            ...envelope.elicitation,
            message: clipText(envelope.elicitation.message),
          }),
        }),
        ...(envelope.notes !== undefined && {
          notes: envelope.notes
            .slice(0, MAX_REFUSAL_NOTES)
            .map((note) => clipText(note, MAX_LIST_FIELD_LENGTH)),
        }),
      };
    }
    case "acknowledged":
    case "in_progress":
      return {
        ...envelope,
        target,
      };
  }
}
//@ chunk-g54kbxqw.js:30789-30871 placement
/**
 * 导出函数 `clampToMaxPageSize`：参数 e，返回 1; return Math.min(Math.floor(e), Ie)。
 */
function clampToMaxPageSize(deadlineMs) {
  if (Number.isNaN(deadlineMs) || deadlineMs < 1) return 1;
  return Math.min(Math.floor(deadlineMs), MAX_INT32);
}
//@ chunk-g54kbxqw.js:30871-30924 placement
/**
 * 导出函数 `byteLengthOf`：参数 e，返回 Buffer.byteLength(jsonStringify(e), "utf8")。
 */
function byteLengthOf(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8");
}
//@ chunk-g54kbxqw.js:30924-30989 placement
function hasDifferentProtocolVersion(e) {
  let n = asPlainRecord(e)?.v;
  return typeof n === "number" && n !== REMOTE_TOOL_PROTOCOL_VERSION;
}
//@ chunk-g54kbxqw.js:30989-31060 placement
function isPlainRecord(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-g54kbxqw.js:31060-31097 placement
function asPlainRecord(e) {
  return isPlainRecord(e) ? e : undefined;
}
//@ chunk-g54kbxqw.js:31097-31109 placement
var MAX_COLLECTED_TOOL_NAMES = 2048;
//@ chunk-g54kbxqw.js:31109-31631 placement
function collectToolNames(inputSchema) {
  let n = new Set();
  let s = (required) => (Array.isArray(required) ? required.filter((y) => typeof y === "string") : []);
  let r = (h, y) => {
    if (n.has(h)) return [];
    if (y > MAX_INPUT_SCHEMA_DEPTH || n.size >= MAX_COLLECTED_TOOL_NAMES) return;
    n.add(h);
    let schemaRef = resolveSchemaRef(h, inputSchema);
    let flattened = [h.dependentRequired, h.dependentSchemas, h.dependencies]
      .filter(isPlainRecord)
      .flatMap((w) => Object.values(w));
    let mapped = [
      ...(schemaRef !== h ? [schemaRef] : []),
      ...SCHEMA_COMBINATOR_KEYS.flatMap((w) => {
        let P = h[w];
        return Array.isArray(P) ? P : [];
      }),
      h.if,
      h.then,
      h.else,
      ...flattened,
    ]
      .filter(isPlainRecord)
      .map((w) => r(w, y + 1));
    return mapped.some((w) => w === undefined)
      ? undefined
      : [...s(h.required), ...flattened.flatMap(s), ...mapped.flatMap((w) => w ?? [])];
  };
  return r(inputSchema, 0);
}
//@ chunk-g54kbxqw.js:31631-31695 placement
function includesWord(note, n) {
  return note.split(/[^A-Za-z0-9_.-]+/).includes(n);
}
//@ chunk-g54kbxqw.js:31695-31793 placement
var textBlockSchema = DoctorLazy(() =>
  u({
    type: literal("text"),
    text: string(),
  }),
);
var imageBlockSchema = DoctorLazy(() =>
  u({
    type: literal("image"),
    data: string(),
    mimeType: _enum(isSupportedResourceMimeType),
  }),
);
//@ chunk-g54kbxqw.js:31793-32218 placement
function toContentBlocks(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return [];
  return content.map((n) => {
    let s = textBlockSchema().safeParse(n);
    if (s.success)
      return {
        type: "text",
        text: s.data.text,
      };
    let r = imageBlockSchema().safeParse(n);
    if (r.success)
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: r.data.mimeType,
          data: r.data.data,
        },
      };
    let h = asPlainRecord(n)?.type;
    return {
      type: "text",
      text: `[${typeof h === "string" ? clipText(sanitizeDeep(h), REMOTE_TOOL_FIELD_LIMITS) : h === undefined ? "unknown" : typeof h} content omitted]`,
    };
  });
}
//@ chunk-g54kbxqw.js:32218-32409 placement
function toMcpContentBlocks(remoteToolContentBlocks) {
  if (typeof remoteToolContentBlocks === "string")
    return [
      {
        type: "text",
        text: remoteToolContentBlocks,
      },
    ];
  return remoteToolContentBlocks.map((n) =>
    n.type === "text"
      ? {
          type: "text",
          text: n.text,
        }
      : {
          type: "image",
          data: n.source.data,
          mimeType: n.source.media_type,
        },
  );
}
//@ chunk-g54kbxqw.js:32409-32497 placement
class HostCatalog {
  texts = new Map();
  readingForCalls = new Map();
  lastReadForCalls = Promise.resolve(undefined);
}
//@ chunk-g54kbxqw.js:32497-33987 placement
class RemoteToolsSync {
  syncPromise = null;
  firstSyncPromise = null;
  firstListDeferred = null;
  firstRoundSettled = false;
  firstRoundEmitted = false;
  resyncTimer = null;
  resyncRunRound = null;
  resyncArmed = null;
  stopAwaitingActivity = null;
  consecutiveFailedRounds = 0;
  lostRowsRecheckMs = 100;
  bucketGeneration = null;
  hidingFoldersGone = new Set();
  pendingDownloads = new Map();
  placeholders = new Map();
  listedSkills = new Map();
  textAlone = false;
  listedOwnerships = new Map();
  listedSkillsAnswer = "none_yet";
  listNeverStarted = false;
  lastRoundCouldNotAsk = false;
  hostMountKinds = new Map();
  hostMountWorkOutstanding = null;
  hostMountWorkStartedAt = 0;
  hostMountWorkIsCatalogs = false;
  hostCatalog = new HostCatalog();
  missingSkillResyncAt = -1 / 0;
  missingSkillResync = null;
  reset() {
    this.syncPromise = null;
    this.firstSyncPromise = null;
    this.firstListDeferred = null;
    this.firstRoundEmitted = false;
    this.firstRoundSettled = false;
    setSkillsSyncVetoed(false);
    setAccountSkillsSyncEnabled(false);
    if (this.resyncTimer) {
      clearTimeout(this.resyncTimer);
      this.resyncTimer = null;
    }
    this.resyncRunRound = null;
    this.resyncArmed = null;
    this.stopAwaitingActivity?.();
    this.consecutiveFailedRounds = 0;
    this.hidingFoldersGone = new Set();
    this.lostRowsRecheckMs = 100;
    this.bucketGeneration = null;
    this.listedSkills.clear();
    this.textAlone = false;
    this.listedOwnerships.clear();
    this.listedSkillsAnswer = "none_yet";
    this.listNeverStarted = false;
    this.lastRoundCouldNotAsk = false;
    this.hostMountKinds.clear();
    this.hostMountWorkOutstanding = null;
    this.hostMountWorkStartedAt = 0;
    this.hostMountWorkIsCatalogs = false;
    this.hostCatalog = new HostCatalog();
    this.pendingDownloads.clear();
    this.placeholders.clear();
    this.missingSkillResyncAt = -1 / 0;
    this.missingSkillResync = null;
  }
}
//@ chunk-g54kbxqw.js:33987-34012 placement
var remoteToolsSyncSlot = new HostScoped(() => new RemoteToolsSync());
//@ chunk-g54kbxqw.js:34012-34049 placement
function remoteToolsState() {
  return remoteToolsSyncSlot.of(getRootSession().host);
}
export {
  byteLengthOf,
  buildRemoteToolCallResult,
  clampToMaxPageSize,
  toRemoteToolContentBlocks,
  remoteToolsState,
  isPlainRecord,
  asPlainRecord,
  hasDifferentProtocolVersion,
  sanitizeRemoteToolEnvelope,
  collectToolNames,
  includesWord,
  toContentBlocks,
  readResultEnvelope,
  envelopeOf,
};
