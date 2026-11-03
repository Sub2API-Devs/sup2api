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
  HXr,
  clipText,
  Jt,
  Mo,
  Po,
  autoModeField,
  sanitizeDeep,
  xo,
  Wr,
  REMOTE_TOOL_FIELD_LIMITS,
} from "./protocolSchemas.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Ie, REMOTE_TOOL_PROTOCOL_VERSION } from "./protocolConstants.js";
import { xlr } from "./toolDescriptors.js";
import { resolveSchemaRef, SCHEMA_COMBINATOR_KEYS } from "./inputSchemaFlatten.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { Lo } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { setSkillsSyncVetoed, setAccountSkillsSyncEnabled, getRootSession } from "../../bootstrap/state.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-g54kbxqw.js:29325-29379 placement
function envelopeOf(e) {
  let n = be(e);
  return n && ANTHROPIC_REMOTETOOLEXECUTION in n ? n : void 0;
}
//@ chunk-g54kbxqw.js:29379-29500 placement
function readResultEnvelope(e) {
  if (!e) return { status: "absent" };
  let n = parseResultEnvelope(e[ANTHROPIC_REMOTETOOLEXECUTION]);
  return n ? { status: "present", envelope: n } : { status: "malformed" };
}
/**
 * 把远程工具返回的内容块转成 MCP 内容（文本保留、base64 图片保留，其余 JSON 化为文本）。
 */
//@ chunk-g54kbxqw.js:29500-29822 placement = isMalformedBase64Image (1)
function toRemoteToolContentBlocks(content) {
  if (typeof content === "string") return content;
  return content.map((n) => {
    switch (n.type) {
      case "text":
        return { type: "text", text: n.text };
      case "image":
        return n.source.type === "base64"
          ? {
              type: "image",
              source: { type: "base64", media_type: n.source.media_type, data: n.source.data },
            }
          : { type: "text", text: jsonStringify(n) };
      default:
        return { type: "text", text: jsonStringify(n) };
    }
  });
}
/**
 * 由远程工具执行信封构造 MCP CallTool 结果（refused/failed/is_error 时 isError，信封放进 structuredContent/_meta）。
 */
//@ chunk-g54kbxqw.js:29822-30040 placement
function buildRemoteToolCallResult({ envelope: envelope, content: content }) {
  let s =
      envelope.outcome === "refused" ||
      envelope.outcome === "failed" ||
      (envelope.outcome === "completed" && envelope.is_error),
    r = sanitizeRemoteToolEnvelope(envelope);
  return {
    content: toMcpContentBlocks(toRemoteToolContentBlocks(content)),
    structuredContent: { [ANTHROPIC_REMOTETOOLEXECUTION]: r },
    isError: s,
    ...(s && { _meta: { [ANTHROPIC_REMOTETOOLEXECUTION]: r } }),
  };
}
/**
 * 清洗远程工具执行信封（按 outcome：completed/refused/failed/needs_approval/acknowledged/in_progress 截断与过滤字段）。
 */
//@ chunk-g54kbxqw.js:30040-30789 placement
function sanitizeRemoteToolEnvelope(envelope) {
  let n = clipTarget(envelope.target),
    s = "notes" in envelope &&
      envelope.notes !== void 0 && { notes: envelope.notes.slice(0, HXr).map((r) => clipText(r)) };
  switch (envelope.outcome) {
    case "completed":
      return { ...envelope, target: n, ...s };
    case "refused":
    case "failed":
      return { ...envelope, target: n, message: clipText(envelope.message), ...s };
    case "needs_approval": {
      let { auto_mode: auto_mode, ...h } = envelope;
      return {
        ...h,
        target: n,
        tool: clipText(envelope.tool, Jt),
        message: clipText(envelope.message),
        ...(envelope.decision_reason !== void 0 && { decision_reason: clipText(envelope.decision_reason) }),
        ...(envelope.suggestions !== void 0 && {
          suggestions: envelope.suggestions.slice(0, Mo).map((y) => clipText(y, Po)),
        }),
        ...autoModeField(auto_mode),
        ...(envelope.elicitation !== void 0 && {
          elicitation: sanitizeDeep({
            ...envelope.elicitation,
            message: clipText(envelope.elicitation.message),
          }),
        }),
        ...(envelope.notes !== void 0 && { notes: envelope.notes.slice(0, xo).map((y) => clipText(y, Wr)) }),
      };
    }
    case "acknowledged":
    case "in_progress":
      return { ...envelope, target: n };
  }
}
//@ chunk-g54kbxqw.js:30789-30871 placement
function AJ(e) {
  if (Number.isNaN(e) || e < 1) return 1;
  return Math.min(Math.floor(e), Ie);
}
//@ chunk-g54kbxqw.js:30871-30924 placement
function iv(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8");
}
//@ chunk-g54kbxqw.js:30924-30989 placement
function $o(e) {
  let n = be(e)?.v;
  return typeof n === "number" && n !== REMOTE_TOOL_PROTOCOL_VERSION;
}
//@ chunk-g54kbxqw.js:30989-31060 placement
function $e(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-g54kbxqw.js:31060-31097 placement
function be(e) {
  return $e(e) ? e : void 0;
}
//@ chunk-g54kbxqw.js:31097-31109 placement
var Oi = 2048;
//@ chunk-g54kbxqw.js:31109-31631 placement
function collectToolNames(e) {
  let n = new Set(),
    s = (h) => (Array.isArray(h) ? h.filter((y) => typeof y === "string") : []),
    r = (h, y) => {
      if (n.has(h)) return [];
      if (y > xlr || n.size >= Oi) return;
      n.add(h);
      let k = resolveSchemaRef(h, e),
        flattened = [h.dependentRequired, h.dependentSchemas, h.dependencies]
          .filter($e)
          .flatMap((w) => Object.values(w)),
        mapped = [
          ...(k !== h ? [k] : []),
          ...SCHEMA_COMBINATOR_KEYS.flatMap((w) => {
            let P = h[w];
            return Array.isArray(P) ? P : [];
          }),
          h.if,
          h.then,
          h.else,
          ...flattened,
        ]
          .filter($e)
          .map((w) => r(w, y + 1));
      return mapped.some((w) => w === void 0)
        ? void 0
        : [...s(h.required), ...flattened.flatMap(s), ...mapped.flatMap((w) => w ?? [])];
    };
  return r(e, 0);
}
//@ chunk-g54kbxqw.js:31631-31695 placement
function includesWord(e, n) {
  return e.split(/[^A-Za-z0-9_.-]+/).includes(n);
}
//@ chunk-g54kbxqw.js:31695-31793 placement
var Li = DoctorLazy(() => u({ type: T("text"), text: o() })),
  Di = DoctorLazy(() => u({ type: T("image"), data: o(), mimeType: U(Lo) }));
//@ chunk-g54kbxqw.js:31793-32218 placement
function toContentBlocks(e) {
  if (typeof e === "string") return e;
  if (!Array.isArray(e)) return [];
  return e.map((n) => {
    let safeParse = Li().safeParse(n);
    if (safeParse.success) return { type: "text", text: safeParse.data.text };
    let safeParse_2 = Di().safeParse(n);
    if (safeParse_2.success)
      return {
        type: "image",
        source: { type: "base64", media_type: safeParse_2.data.mimeType, data: safeParse_2.data.data },
      };
    let h = be(n)?.type;
    return {
      type: "text",
      text: `[${typeof h === "string" ? clipText(sanitizeDeep(h), REMOTE_TOOL_FIELD_LIMITS) : h === void 0 ? "unknown" : typeof h} content omitted]`,
    };
  });
}
//@ chunk-g54kbxqw.js:32218-32409 placement
function toMcpContentBlocks(e) {
  if (typeof e === "string") return [{ type: "text", text: e }];
  return e.map((n) =>
    n.type === "text"
      ? { type: "text", text: n.text }
      : { type: "image", data: n.source.data, mimeType: n.source.media_type },
  );
}
//@ chunk-g54kbxqw.js:32409-32497 placement
class ut {
  texts = new Map();
  readingForCalls = new Map();
  lastReadForCalls = Promise.resolve(void 0);
}
//@ chunk-g54kbxqw.js:32497-33987 placement
class RemoteToolsSync {
  syncPromise = null;
  firstSyncPromise = null;
  firstListDeferred = null;
  firstRoundSettled = !1;
  firstRoundEmitted = !1;
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
  textAlone = !1;
  listedOwnerships = new Map();
  listedSkillsAnswer = "none_yet";
  listNeverStarted = !1;
  lastRoundCouldNotAsk = !1;
  hostMountKinds = new Map();
  hostMountWorkOutstanding = null;
  hostMountWorkStartedAt = 0;
  hostMountWorkIsCatalogs = !1;
  hostCatalog = new ut();
  missingSkillResyncAt = -1 / 0;
  missingSkillResync = null;
  reset() {
    if (
      ((this.syncPromise = null),
      (this.firstSyncPromise = null),
      (this.firstListDeferred = null),
      (this.firstRoundEmitted = !1),
      (this.firstRoundSettled = !1),
      setSkillsSyncVetoed(!1),
      setAccountSkillsSyncEnabled(!1),
      this.resyncTimer)
    )
      (clearTimeout(this.resyncTimer), (this.resyncTimer = null));
    ((this.resyncRunRound = null),
      (this.resyncArmed = null),
      this.stopAwaitingActivity?.(),
      (this.consecutiveFailedRounds = 0),
      (this.hidingFoldersGone = new Set()),
      (this.lostRowsRecheckMs = 100),
      (this.bucketGeneration = null),
      this.listedSkills.clear(),
      (this.textAlone = !1),
      this.listedOwnerships.clear(),
      (this.listedSkillsAnswer = "none_yet"),
      (this.listNeverStarted = !1),
      (this.lastRoundCouldNotAsk = !1),
      this.hostMountKinds.clear(),
      (this.hostMountWorkOutstanding = null),
      (this.hostMountWorkStartedAt = 0),
      (this.hostMountWorkIsCatalogs = !1),
      (this.hostCatalog = new ut()),
      this.pendingDownloads.clear(),
      this.placeholders.clear(),
      (this.missingSkillResyncAt = -1 / 0),
      (this.missingSkillResync = null));
  }
}
//@ chunk-g54kbxqw.js:33987-34012 placement
var Hi = new HostScoped(() => new RemoteToolsSync());
//@ chunk-g54kbxqw.js:34012-34049 placement
function remoteToolsState() {
  return Hi.of(getRootSession().host);
}

export {
  iv,
  buildRemoteToolCallResult,
  AJ,
  toRemoteToolContentBlocks,
  remoteToolsState,
  $e,
  be,
  $o,
  sanitizeRemoteToolEnvelope,
  collectToolNames,
  includesWord,
  toContentBlocks,
  readResultEnvelope,
  envelopeOf,
};
