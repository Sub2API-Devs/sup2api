/**
 * services/artifacts/comments/commentFormatting.ts
 *
 * 2.1.316 新增：评论线程解析与锚点区域读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (27)
 * attribution: placement 27
 */
import { create, create_2, create_12, create_6, create_15 } from "../../../../vendor/zod/lib/index.mjs";
import {
  nullableStringField,
  gateFallback,
  be,
  Re,
  countGate,
  containsBlockedChars,
  stripControlChars,
} from "./commentMentions.js";
import { PRINCIPAL_TOKEN_RE, Gor, hasAuthorAccount } from "./commentAuthorship.js";
import { parseTimestamp, getCommentAuthorKind, normalizeCommentAccess } from "./commentState.js";
import {
  isWellFormedString,
  normalizeFullWidthSpace,
  truncateCodePoints,
} from "../../../utils/stringUtils.js";
import { normalizePresence, MAX_PRESENCE_BYTES } from "./presence.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { extractPageText } from "../audience.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  INVISIBLE_BLANKS,
  characterReferencesAsBrackets,
  ANGLE_BRACKET_RUN_RE,
  DECISION_SURFACE_BRACKETS_RE,
} from "../../../tools/ArtifactTool/artifactUrls.js";
import { bv } from "../../../utils/confusables.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { logFeatureSad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { fromEnumArr } from "../../analytics/safeMetadata.js";

//@ chunk-b0a246e7.js:9212-10500 placement
function commentsPayloadSchema(e) {
  let t = create({
      id: create_2(),
      author: create({
        account: create_2().nullable().optional(),
        role: nullableStringField(e, "role", "degraded"),
        access: create_12().optional(),
        outside: create_12().optional(),
      }),
      text: create_2(),
      created_at: nullableStringField(e, "created_at", void 0),
      to_claude_at: nullableStringField(e, "to_claude_at", "degraded"),
      source: create_12().optional(),
      presence: create_12().optional(),
      sent_by_viewer: create_6()
        .nullable()
        .optional()
        .catch(gateFallback(e, "sent_by_viewer", void 0))
        .transform((o) => o ?? void 0),
    }),
    n = create({
      id: create_2(),
      created_at: nullableStringField(e, "thread_created_at", void 0),
      comments: create_15(create_12())
        .readonly()
        .nullable()
        .catch(gateFallback(e, "comments_list", be)),
      resolved_at: nullableStringField(e, "resolved_at", "degraded"),
      resolved_by: create_12().optional(),
      claude_activated_at: nullableStringField(e, "claude_activated_at", "degraded"),
      claude_activated_by: nullableStringField(e, "claude_activated_by", void 0),
      claude_capability: create_12().optional(),
      carried: create_6()
        .nullable()
        .optional()
        .catch(gateFallback(e, "carried", void 0))
        .transform((o) => o ?? void 0),
      anchor: create({
        path: create_12().optional(),
        span: create_12().optional(),
        path_unreadable: create_12().optional(),
        file: create_12().optional(),
        file_sha: create_12().optional(),
        moved_at: create_12().optional(),
        moved_comment_id: create_12().optional(),
        label: create_12().optional(),
        detail: create_12().optional(),
        region: create_12().optional(),
      })
        .nullable()
        .optional()
        .catch(gateFallback(e, "anchor", { file: Ee }))
        .transform((o) => o ?? void 0),
    }),
    r = create({
      threads: create_15(create_12())
        .readonly()
        .nullable()
        .catch(gateFallback(e, "threads_list", Re)),
    });
  return { comment: t, thread: n, payload: r };
}
//@ chunk-b0a246e7.js:10500-10559 placement
var COMMENT_ID_RE = /^[0-9a-fA-F-]{1,64}$/,
  RZe = /^[0-9T:.\-+Z ]{1,40}$/;
//@ chunk-b0a246e7.js:10559-10607 placement
function isCommentId(e) {
  return COMMENT_ID_RE.test(e) || PRINCIPAL_TOKEN_RE.test(e);
}
//@ chunk-b0a246e7.js:10607-10669 placement
function ke(e, t, n) {
  if (isCommentId(n)) return n;
  return (countGate(e, t), "unknown");
}
//@ chunk-b0a246e7.js:10669-10751 placement
function We(e, t) {
  if (t === null || t === void 0) return "unknown";
  return ke(e, "account", t);
}
//@ chunk-b0a246e7.js:10751-10834 placement
function ze(e, t) {
  if (t === void 0 || Gor.test(t)) return t;
  return (countGate(e, "role"), "degraded");
}
//@ chunk-b0a246e7.js:10834-10943 placement
function parseCommentCapability(e, t) {
  if (t === "edit") return !0;
  if (t !== void 0 && t !== null && t !== "reply") countGate(e, "claude_capability");
  return;
}
//@ chunk-b0a246e7.js:10943-11019 placement
function Ze(e, t, n) {
  if (!hasAuthorAccount(t, n)) return;
  if (t !== "page") countGate(e, "source");
  return !0;
}
//@ chunk-b0a246e7.js:11019-11167 placement
function parseResolvedAt(e, t) {
  if (t === void 0 || t === "") return;
  if (parseTimestamp(t) !== null) return { resolvedAt: t };
  if (t !== "degraded") countGate(e, "resolved_at");
  return { resolvedDegraded: !0 };
}
//@ chunk-b0a246e7.js:11167-11259 placement
function et(e, t) {
  if (t === "claude") return !0;
  if (t !== void 0 && t !== null) countGate(e, "resolved_by");
  return;
}
//@ chunk-b0a246e7.js:11259-11667 placement
var ANCHOR_LABELS = "[anchor detail]",
  qze = "[anchored at]",
  q_t = "[anchored element]",
  Y_t = "[inside region]",
  e1t = "[location]",
  ULo = "[names]",
  w$r = "[on text]",
  t1t = "[on page]",
  BLo = "[presence when sent]",
  y_e = "[region of]",
  jLo = /^#[A-Za-z_-][A-Za-z0-9_-]{0,31}$/,
  WLo = /^\[data-id="([A-Za-z0-9_-]{1,64})"\]$/,
  GLo = /^[a-z][a-z0-9-]{0,23}:nth-of-type\([1-9][0-9]{0,3}\)$/,
  ue = 128,
  tt = /^[\p{Cc}\p{Cf}\p{Variation_Selector}\u2028\u2029]$/u;
//@ chunk-b0a246e7.js:11667-11905 placement
function isUnsafeCodePoint(e, t) {
  if (tt.test(t)) return !0;
  switch (e) {
    case 847:
    case 4447:
    case 4448:
    case 6068:
    case 6069:
    case 8293:
    case 12644:
    case 65440:
      return !0;
  }
  if ((e & 65534) === 65534 || (e >= 64976 && e <= 65007)) return !0;
  return (e >= 65520 && e <= 65528) || (e >= 917504 && e <= 921599);
}
/**
 * 判断文本可作为安全标识展示：不超长（字符与 UTF-8 字节）、是良构字符串、无控制字符和不可见/私用/非字符码点。
 */
//@ chunk-b0a246e7.js:11905-12065 placement
function isSafeIdentifierText(e) {
  if (e.length > ue || !isWellFormedString(e) || new TextEncoder().encode(e).length > ue) return !1;
  for (let t of e) {
    let codePoint = t.codePointAt(0);
    if (codePoint < 32 || isUnsafeCodePoint(codePoint, t)) return !1;
  }
  return !0;
}
//@ chunk-b0a246e7.js:12065-12350 placement
function readAnchorPath(e, t) {
  if (t === void 0 || t === null || t === "") return;
  if (typeof t !== "string") {
    countGate(e, "anchor_path");
    return;
  }
  let parts = t.split(" > ");
  if (
    t.length <= 1024 &&
    parts.length <= 10 &&
    parts.every((r, o) => GLo.test(r) || (o === 0 && (jLo.test(r) || WLo.test(r))))
  )
    return t;
  countGate(e, isSafeIdentifierText(t) ? "anchor_path_opaque" : "anchor_path");
  return;
}
//@ chunk-b0a246e7.js:12350-12460 placement
var ANCHOR_LIMITS = 512,
  st = 16777216,
  it = 128,
  dt = 512,
  E$r = 8,
  ut = 4096,
  ct = /^[a-f0-9]{64}$/,
  Ee = Symbol("degraded-wire-anchor-file");
//@ chunk-b0a246e7.js:12460-13204 placement
function readAnchorFile(e, t) {
  let n = t?.file;
  if (n === void 0 || n === null || n === "") return;
  if (n === Ee) return { anchorFileDegraded: !0 };
  let r = () => (countGate(e, "anchor_file"), { anchorFileDegraded: !0 });
  if (typeof n !== "string") return r();
  if (!isWellFormedString(n)) return r();
  if (new TextEncoder().encode(n).length > 512) return r();
  for (let c of n) {
    let codePoint = c.codePointAt(0);
    if (codePoint < 32 || codePoint === 127 || c === "%" || c === ";" || c === "\\") return r();
  }
  if (n.endsWith(".cmekshadow") || n.startsWith("/")) return r();
  let parts = n.split("/");
  if (parts.some((c) => c === "" || c === "." || c === "..")) return r();
  if (parts[0].startsWith("_")) return r();
  if (containsBlockedChars(n)) return r();
  let u = t?.file_sha;
  if (u === void 0 || u === null || u === "") return { anchorFile: n };
  if (typeof u !== "string" || !ct.test(u)) return (countGate(e, "anchor_file_sha"), { anchorFile: n });
  return { anchorFile: n, anchorFileSha: u };
}
//@ chunk-b0a246e7.js:13204-13335 placement
function parseAnchorMovedAt(e, t) {
  if (t === void 0 || t === null || t === "") return;
  if (typeof t === "string" && RZe.test(t)) return t;
  countGate(e, "anchor_moved_at");
  return;
}
//@ chunk-b0a246e7.js:13335-13474 placement
function parseAnchorMovedCommentId(e, t) {
  if (t === void 0 || t === null || t === "") return;
  if (typeof t === "string" && COMMENT_ID_RE.test(t)) return t;
  countGate(e, "anchor_moved_comment_id");
  return;
}
//@ chunk-b0a246e7.js:13474-13788 placement
function readAnchorSpan(e, t) {
  if (t === void 0 || t === null) return;
  if (typeof t !== "object") {
    countGate(e, "anchor_span");
    return;
  }
  let n = t;
  if (
    typeof n.start !== "number" ||
    !Number.isInteger(n.start) ||
    n.start < 0 ||
    n.start > st ||
    typeof n.quote !== "string" ||
    n.quote === "" ||
    new TextEncoder().encode(n.quote).length > ANCHOR_LIMITS
  ) {
    countGate(e, "anchor_span");
    return;
  }
  return n.quote;
}
/**
 * 只对人类作者的评论规范化 presence 数据，把其中字符串转成页面纯文本后序列化；无效、未变化或超出字节上限时计入 gate 统计并丢弃。
 */
//@ chunk-b0a246e7.js:13788-14019 placement
function serializeCommentPresence(e, t, n) {
  if (t === void 0 || t === null) return;
  let r = getCommentAuthorKind({ role: n }) === "human" ? normalizePresence(t) : null;
  if (r === null || r === "unchanged") {
    countGate(e, "presence");
    return;
  }
  let o = jsonStringify(toPlainTextDeep(r.data));
  if (Buffer.byteLength(o, "utf8") > MAX_PRESENCE_BYTES) {
    countGate(e, "presence");
    return;
  }
  return o;
}
//@ chunk-b0a246e7.js:14019-14162 placement
function toPlainTextDeep(e) {
  if (typeof e === "string") return extractPageText(e);
  if (Array.isArray(e)) return e.map(toPlainTextDeep);
  if (e !== null && typeof e === "object") return xr(e, toPlainTextDeep);
  return e;
}
//@ chunk-b0a246e7.js:14162-14377 placement
function cleanBoundedText(e, t, n, r) {
  if (n === void 0 || n === null || n === "") return;
  if (typeof n !== "string" || new TextEncoder().encode(n).length > r) {
    countGate(e, t);
    return;
  }
  let trimmed = stripControlChars(n).replace(INVISIBLE_BLANKS, " ").replace(/\s+/g, " ").trim();
  return trimmed === "" ? void 0 : trimmed;
}
//@ chunk-b0a246e7.js:14377-14387 placement
var gt = 40;
//@ chunk-b0a246e7.js:14387-14588 placement
function cleanAnchorText(e) {
  if (typeof e !== "string") return;
  let trimmed = characterReferencesAsBrackets(
      stripControlChars(bv(normalizeFullWidthSpace(truncateCodePoints(e, 1024)))),
    )
      .replace(INVISIBLE_BLANKS, " ")
      .replace(ANGLE_BRACKET_RUN_RE, " ")
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/\s+/g, " ")
      .trim(),
    trimEnd = truncateCodePoints(trimmed, gt).trimEnd();
  return trimEnd === "" ? void 0 : trimEnd;
}
//@ chunk-b0a246e7.js:14588-15093 placement
function readAnchorRegion(e, t) {
  if (t === void 0 || t === null) return;
  if (typeof t !== "object") {
    countGate(e, "anchor_region");
    return;
  }
  let n = t,
    r = (c) => typeof c === "number" && c >= 0 && c <= 1,
    o = (c) => Math.round(c * 1000) / 1000;
  if (!r(n.x0) || !r(n.y0) || !r(n.x1) || !r(n.y1) || o(n.x0) >= o(n.x1) || o(n.y0) >= o(n.y1)) {
    countGate(e, "anchor_region");
    return;
  }
  if (n.kids === void 0 || n.kids === null) return { kids: [] };
  let kids = n.kids;
  if (
    !Array.isArray(kids) ||
    kids.length > E$r ||
    !kids.every((c, a) => Number.isInteger(c) && c >= 0 && c < ut && (a === 0 || c > kids[a - 1]))
  )
    return (countGate(e, "anchor_region"), { kids: [] });
  return { kids: kids };
}
//@ chunk-b0a246e7.js:15093-15176 placement
function le(e, t, n) {
  if (n === void 0) return !1;
  if (RZe.test(n)) return !0;
  return (countGate(e, t), !1);
}
/**
 * 解析 /api/frame/comments 返回的线程：作者/角色/锚点（路径、文件、文本区间、区域）等，降级字段计数。
 */
//@ chunk-b0a246e7.js:15176-18315 placement
function parseCommentThreads(e, t = "artifact_comments_read") {
  let n = { gates: new Map() },
    r = commentsPayloadSchema(n),
    safeParse = r.payload.safeParse(e);
  if (!safeParse.success) return null;
  let u = safeParse.data.threads === Re,
    c = [],
    a = new Set(),
    d = 0,
    l = 0;
  for (let A of safeParse.data.threads ?? []) {
    let safeParse = r.thread.safeParse(A);
    if (!safeParse.success) {
      d++;
      continue;
    }
    let s = safeParse.data;
    if (a.has(s.id)) {
      d++;
      continue;
    }
    if ((a.add(s.id), !ARTIFACT_SLUG_RE.test(s.id))) {
      d++;
      continue;
    }
    let x = [],
      E = l,
      y = readAnchorPath(n, s.anchor?.path),
      S = readAnchorSpan(n, s.anchor?.span),
      T = S !== void 0 ? stripControlChars(S) : void 0,
      b = cleanBoundedText(n, "anchor_label", s.anchor?.label, it),
      M = cleanBoundedText(n, "anchor_detail", s.anchor?.detail, dt),
      P = s.anchor?.path_unreadable,
      R = y !== void 0 && P === !0 && (b !== void 0 || M !== void 0);
    if (P !== void 0 && P !== null && typeof P !== "boolean") countGate(n, "anchor_path_unreadable");
    let C = parseAnchorMovedAt(n, s.anchor?.moved_at),
      O = parseAnchorMovedCommentId(n, s.anchor?.moved_comment_id),
      N = s.anchor?.span !== void 0 && s.anchor?.span !== null,
      F = y !== void 0 && !N ? readAnchorRegion(n, s.anchor?.region) : void 0,
      Q = new Set();
    for (let Te of s.comments ?? []) {
      let safeParse = r.comment.safeParse(Te);
      if (!safeParse.success) {
        l++;
        continue;
      }
      let w = safeParse.data;
      if (!COMMENT_ID_RE.test(w.id)) {
        l++;
        continue;
      }
      if (Q.has(w.id)) {
        l++;
        continue;
      }
      Q.add(w.id);
      let H = ze(n, w.author.role),
        ne = serializeCommentPresence(n, w.presence, H),
        re = We(n, w.author.account),
        oe = getCommentAuthorKind({ role: H }) === "human" && isCommentId(re),
        ae = oe ? normalizeCommentAccess(w.author.access) : void 0,
        De = oe && w.author.outside === !0;
      x.push({
        id: w.id,
        account: re,
        ...(H !== void 0 && { role: H }),
        text: stripControlChars(w.text),
        ...(le(n, "created_at", w.created_at) && { createdAt: w.created_at }),
        ...(w.to_claude_at !== void 0 &&
          w.to_claude_at !== "" &&
          w.to_claude_at !== "degraded" && { toClaudeAt: w.to_claude_at }),
        ...(w.to_claude_at === "degraded" && { toClaudeAtDegraded: !0 }),
        ...(Ze(n, w.source, H) === !0 && { postedByArtifact: !0 }),
        ...(w.sent_by_viewer !== void 0 && { sentByViewer: w.sent_by_viewer }),
        ...(ne !== void 0 && { presence: ne }),
        ...(ae !== void 0 && { access: ae }),
        ...(De && { outside: !0 }),
      });
    }
    let Z = parseResolvedAt(n, s.resolved_at);
    c.push({
      id: s.id,
      ...(le(n, "thread_created_at", s.created_at) && { createdAt: s.created_at }),
      resolved: Z !== void 0,
      ...(et(n, s.resolved_by) === !0 && { resolvedByClaude: !0 }),
      ...Z,
      claudeActivated:
        s.claude_activated_at !== void 0 &&
        s.claude_activated_at !== "" &&
        s.claude_activated_at !== "degraded",
      ...(s.claude_activated_at !== void 0 &&
        s.claude_activated_at !== "" &&
        s.claude_activated_at !== "degraded" && { activatedAt: s.claude_activated_at }),
      ...(s.claude_activated_at === "degraded" && { activatedAtDegraded: !0 }),
      ...(s.claude_activated_by !== void 0 &&
        s.claude_activated_by !== "" &&
        ke(n, "claude_activated_by", s.claude_activated_by) !== "unknown" && {
          activatedBy: s.claude_activated_by,
        }),
      ...((s.comments === be || l > E) && { commentsDegraded: !0 }),
      carried: s.carried === !0,
      ...(y !== void 0 && { anchorPath: y }),
      ...readAnchorFile(n, s.anchor),
      ...(T !== void 0 && T.trim() !== "" && { spanQuote: T }),
      ...(R && { anchorPathUnreadable: !0 }),
      ...(C !== void 0 && { anchorMovedAt: C }),
      ...(O !== void 0 && { anchorMovedCommentId: O }),
      ...(b !== void 0 && { anchorLabel: b }),
      ...(M !== void 0 && { anchorDetail: M }),
      ...(F !== void 0 && { region: !0, ...(F.kids.length > 0 && { regionKids: F.kids }) }),
      ...(parseCommentCapability(n, s.claude_capability) === !0 && { editCapable: !0 }),
      comments: x,
    });
  }
  if (d > 0 || l > 0 || n.gates.size > 0) {
    let A = [...n.gates];
    logFeatureSad(t, "rows_degraded", {
      ...Object.fromEntries(A.map(([h, s]) => [`degraded_${h}`, s])),
      dropped_threads: d,
      dropped_comments: l,
      degraded_fields: A.reduce((h, [, s]) => h + s, 0),
      ...(A.length > 0 && { degraded_gates: fromEnumArr(A.map(([h]) => h)) }),
    });
  } else logFeatureOk(t);
  return { threads: c, ...(u && { threadsDegraded: !0 }), ...(d > 0 && { threadsDropped: !0 }) };
}

export {
  isCommentId,
  cleanAnchorText,
  ULo,
  w$r,
  y_e,
  qze,
  q_t,
  E$r,
  Y_t,
  e1t,
  ANCHOR_LABELS,
  RZe,
  t1t,
  BLo,
  COMMENT_ID_RE,
  jLo,
  WLo,
  GLo,
  parseCommentThreads,
};
