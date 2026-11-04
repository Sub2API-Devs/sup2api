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
import { objectSchema, literal, stringSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { isSupportedResourceMimeType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { setSkillsSyncVetoed, setAccountSkillsSyncEnabled, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g54kbxqw.js:29325-29379 placement
function envelopeOf(value) {
  let record = asPlainRecord(value);
  return record && ANTHROPIC_REMOTETOOLEXECUTION in record ? record : undefined;
}
//@ chunk-g54kbxqw.js:29379-29500 placement
function readResultEnvelope(value) {
  if (!value)
    return {
      status: "absent",
    };
  let resultEnvelope = parseResultEnvelope(value[ANTHROPIC_REMOTETOOLEXECUTION]);
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
  return content.map((block) => {
    switch (block.type) {
      case "text":
        return {
          type: "text",
          text: block.text,
        };
      case "image":
        return block.source.type === "base64"
          ? {
              type: "image",
              source: {
                type: "base64",
                media_type: block.source.media_type,
                data: block.source.data,
              },
            }
          : {
              type: "text",
              text: jsonStringify(block),
            };
      default:
        return {
          type: "text",
          text: jsonStringify(block),
        };
    }
  });
}
//@ chunk-g54kbxqw.js:29822-30040 placement
/**
 * 由远程工具执行信封构造 MCP CallTool 结果（refused/failed/is_error 时 isError，信封放进 structuredContent/_meta）。
 */
function buildRemoteToolCallResult({ envelope, content }) {
  let isError =
    envelope.outcome === "refused" ||
    envelope.outcome === "failed" ||
    (envelope.outcome === "completed" && envelope.is_error);
  let sanitized = sanitizeRemoteToolEnvelope(envelope);
  return {
    content: toMcpContentBlocks(toRemoteToolContentBlocks(content)),
    structuredContent: {
      [ANTHROPIC_REMOTETOOLEXECUTION]: sanitized,
    },
    isError,
    ...(isError && {
      _meta: {
        [ANTHROPIC_REMOTETOOLEXECUTION]: sanitized,
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
  let notesField = "notes" in envelope &&
    envelope.notes !== undefined && {
      notes: envelope.notes.slice(0, MAX_ACCEPT_NOTES).map((note) => clipText(note)),
    };
  switch (envelope.outcome) {
    case "completed":
      return {
        ...envelope,
        target,
        ...notesField,
      };
    case "refused":
    case "failed":
      return {
        ...envelope,
        target,
        message: clipText(envelope.message),
        ...notesField,
      };
    case "needs_approval": {
      let { auto_mode: autoMode, ...rest } = envelope;
      return {
        ...rest,
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
function byteLengthOf(value) {
  return Buffer.byteLength(jsonStringify(value), "utf8");
}
//@ chunk-g54kbxqw.js:30924-30989 placement
function hasDifferentProtocolVersion(value) {
  let version = asPlainRecord(value)?.v;
  return typeof version === "number" && version !== REMOTE_TOOL_PROTOCOL_VERSION;
}
//@ chunk-g54kbxqw.js:30989-31060 placement
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-g54kbxqw.js:31060-31097 placement
function asPlainRecord(value) {
  return isPlainRecord(value) ? value : undefined;
}
//@ chunk-g54kbxqw.js:31097-31109 placement
var MAX_COLLECTED_TOOL_NAMES = 2048;
//@ chunk-g54kbxqw.js:31109-31631 placement
function collectToolNames(inputSchema) {
  let names = new Set();
  let requiredNames = (required) =>
    Array.isArray(required) ? required.filter((name) => typeof name === "string") : [];
  let walk = (schema, depth) => {
    if (names.has(schema)) return [];
    if (depth > MAX_INPUT_SCHEMA_DEPTH || names.size >= MAX_COLLECTED_TOOL_NAMES) return;
    names.add(schema);
    let schemaRef = resolveSchemaRef(schema, inputSchema);
    let flattened = [schema.dependentRequired, schema.dependentSchemas, schema.dependencies]
      .filter(isPlainRecord)
      .flatMap((map) => Object.values(map));
    let mapped = [
      ...(schemaRef !== schema ? [schemaRef] : []),
      ...SCHEMA_COMBINATOR_KEYS.flatMap((key) => {
        let value = schema[key];
        return Array.isArray(value) ? value : [];
      }),
      schema.if,
      schema.then,
      schema.else,
      ...flattened,
    ]
      .filter(isPlainRecord)
      .map((child) => walk(child, depth + 1));
    return mapped.some((childNames) => childNames === undefined)
      ? undefined
      : [
          ...requiredNames(schema.required),
          ...flattened.flatMap(requiredNames),
          ...mapped.flatMap((childNames) => childNames ?? []),
        ];
  };
  return walk(inputSchema, 0);
}
//@ chunk-g54kbxqw.js:31631-31695 placement
function includesWord(note, word) {
  return note.split(/[^A-Za-z0-9_.-]+/).includes(word);
}
//@ chunk-g54kbxqw.js:31695-31793 placement
var textBlockSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var imageBlockSchema;
deferInit("chunk-g54kbxqw.js:31695", () => {
  textBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("text"),
      text: stringSchema(),
    }),
  );
  imageBlockSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("image"),
      data: stringSchema(),
      mimeType: _enum(isSupportedResourceMimeType),
    }),
  );
});
//@ chunk-g54kbxqw.js:31793-32218 placement
function toContentBlocks(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return [];
  return content.map((block) => {
    let parsedText = textBlockSchema().safeParse(block);
    if (parsedText.success)
      return {
        type: "text",
        text: parsedText.data.text,
      };
    let parsedImage = imageBlockSchema().safeParse(block);
    if (parsedImage.success)
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: parsedImage.data.mimeType,
          data: parsedImage.data.data,
        },
      };
    let blockType = asPlainRecord(block)?.type;
    return {
      type: "text",
      text: `[${typeof blockType === "string" ? clipText(sanitizeDeep(blockType), REMOTE_TOOL_FIELD_LIMITS) : blockType === undefined ? "unknown" : typeof blockType} content omitted]`,
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
  return remoteToolContentBlocks.map((block) =>
    block.type === "text"
      ? {
          type: "text",
          text: block.text,
        }
      : {
          type: "image",
          data: block.source.data,
          mimeType: block.source.media_type,
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
var remoteToolsSyncSlot; // deferred: uses RemoteToolsSync of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g54kbxqw.js:33987", () => {
  remoteToolsSyncSlot = new HostScoped(() => new RemoteToolsSync());
});
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
