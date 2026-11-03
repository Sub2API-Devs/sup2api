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
  EMPTY_MENTION_LIST_B,
  EMPTY_MENTION_LIST,
  countGate,
  containsBlockedChars,
  stripControlChars,
} from "./commentMentions.js";
import { PRINCIPAL_TOKEN_RE, ORIGINAL_ROLE_RE, hasAuthorAccount } from "./commentAuthorship.js";
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
import { foldLookalikeChars } from "../../../utils/confusables.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { logFeatureSad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { fromEnumArr } from "../../analytics/safeMetadata.js";

//@ chunk-b0a246e7.js:9212-10500 placement
function commentsPayloadSchema(e) {
  let comment = create({
    id: create_2(),
    author: create({
      account: create_2().nullable().optional(),
      role: nullableStringField(e, "role", "degraded"),
      access: create_12().optional(),
      outside: create_12().optional(),
    }),
    text: create_2(),
    created_at: nullableStringField(e, "created_at", undefined),
    to_claude_at: nullableStringField(e, "to_claude_at", "degraded"),
    source: create_12().optional(),
    presence: create_12().optional(),
    sent_by_viewer: create_6()
      .nullable()
      .optional()
      .catch(gateFallback(e, "sent_by_viewer", undefined))
      .transform((o) => o ?? undefined),
  });
  let thread = create({
    id: create_2(),
    created_at: nullableStringField(e, "thread_created_at", undefined),
    comments: create_15(create_12())
      .readonly()
      .nullable()
      .catch(gateFallback(e, "comments_list", EMPTY_MENTION_LIST_B)),
    resolved_at: nullableStringField(e, "resolved_at", "degraded"),
    resolved_by: create_12().optional(),
    claude_activated_at: nullableStringField(e, "claude_activated_at", "degraded"),
    claude_activated_by: nullableStringField(e, "claude_activated_by", undefined),
    claude_capability: create_12().optional(),
    carried: create_6()
      .nullable()
      .optional()
      .catch(gateFallback(e, "carried", undefined))
      .transform((o) => o ?? undefined),
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
      .catch(
        gateFallback(e, "anchor", {
          file: DEGRADED_ANCHOR_FILE,
        }),
      )
      .transform((o) => o ?? undefined),
  });
  let payload = create({
    threads: create_15(create_12())
      .readonly()
      .nullable()
      .catch(gateFallback(e, "threads_list", EMPTY_MENTION_LIST)),
  });
  return {
    comment,
    thread,
    payload,
  };
}
//@ chunk-b0a246e7.js:10500-10559 placement
/**
 * 评论 id 与时间戳文本的正则（id 64 位 hex/横线、时间戳 40 字符）。
 */
var COMMENT_ID_RE = /^[0-9a-fA-F-]{1,64}$/;
var TIMESTAMP_TEXT_RE = /^[0-9T:.\-+Z ]{1,40}$/;
//@ chunk-b0a246e7.js:10559-10607 placement
function isCommentId(e) {
  return COMMENT_ID_RE.test(e) || PRINCIPAL_TOKEN_RE.test(e);
}
//@ chunk-b0a246e7.js:10607-10669 placement
function boundedAccountId(e, t, n) {
  if (isCommentId(n)) return n;
  countGate(e, t);
  return "unknown";
}
//@ chunk-b0a246e7.js:10669-10751 placement
function authorAccount(e, account) {
  if (account === null || account === undefined) return "unknown";
  return boundedAccountId(e, "account", account);
}
//@ chunk-b0a246e7.js:10751-10834 placement
function boundedRole(e, role) {
  if (role === undefined || ORIGINAL_ROLE_RE.test(role)) return role;
  countGate(e, "role");
  return "degraded";
}
//@ chunk-b0a246e7.js:10834-10943 placement
function parseCommentCapability(e, claudeCapability) {
  if (claudeCapability === "edit") return true;
  if (claudeCapability !== undefined && claudeCapability !== null && claudeCapability !== "reply")
    countGate(e, "claude_capability");
  return;
}
//@ chunk-b0a246e7.js:10943-11019 placement
function hasAuthorAccountSource(e, source, n) {
  if (!hasAuthorAccount(source, n)) return;
  if (source !== "page") countGate(e, "source");
  return true;
}
//@ chunk-b0a246e7.js:11019-11167 placement
function parseResolvedAt(e, resolvedAt) {
  if (resolvedAt === undefined || resolvedAt === "") return;
  if (parseTimestamp(resolvedAt) !== null)
    return {
      resolvedAt,
    };
  if (resolvedAt !== "degraded") countGate(e, "resolved_at");
  return {
    resolvedDegraded: true,
  };
}
//@ chunk-b0a246e7.js:11167-11259 placement
function resolvedByClaudeFlag(e, resolvedBy) {
  if (resolvedBy === "claude") return true;
  if (resolvedBy !== undefined && resolvedBy !== null) countGate(e, "resolved_by");
  return;
}
//@ chunk-b0a246e7.js:11259-11667 placement
/**
 * 锚点提示标签（[anchored at]、[on page]、[region of] 等）与 CSS 选择器片段正则，及 128 字节的锚点文本上限。
 */
var ANCHOR_LABELS = "[anchor detail]";
var ANCHOR_LABEL_ANCHORED_AT = "[anchored at]";
var ANCHOR_LABEL_ELEMENT = "[anchored element]";
var ANCHOR_LABEL_REGION = "[inside region]";
var ANCHOR_LABEL_LOCATION = "[location]";
var ANCHOR_LABEL_NAMES = "[names]";
var ANCHOR_LABEL_ON_TEXT = "[on text]";
var ANCHOR_LABEL_ON_PAGE = "[on page]";
var ANCHOR_LABEL_PRESENCE = "[presence when sent]";
var ANCHOR_LABEL_REGION_OF = "[region of]";
var ANCHOR_ID_SELECTOR_RE = /^#[A-Za-z_-][A-Za-z0-9_-]{0,31}$/;
var ANCHOR_DATA_ID_SELECTOR_RE = /^\[data-id="([A-Za-z0-9_-]{1,64})"\]$/;
var ANCHOR_NTH_OF_TYPE_RE = /^[a-z][a-z0-9-]{0,23}:nth-of-type\([1-9][0-9]{0,3}\)$/;
var MAX_ANCHOR_TEXT_BYTES = 128;
var INVISIBLE_CHAR_RE = /^[\p{Cc}\p{Cf}\p{Variation_Selector}\u2028\u2029]$/u;
//@ chunk-b0a246e7.js:11667-11905 placement
function isUnsafeCodePoint(e, t) {
  if (INVISIBLE_CHAR_RE.test(t)) return true;
  switch (e) {
    case 847:
    case 4447:
    case 4448:
    case 6068:
    case 6069:
    case 8293:
    case 12644:
    case 65440:
      return true;
  }
  if ((e & 65534) === 65534 || (e >= 64976 && e <= 65007)) return true;
  return (e >= 65520 && e <= 65528) || (e >= 917504 && e <= 921599);
}
//@ chunk-b0a246e7.js:11905-12065 placement
/**
 * 判断文本可作为安全标识展示：不超长（字符与 UTF-8 字节）、是良构字符串、无控制字符和不可见/私用/非字符码点。
 */
function isSafeIdentifierText(e) {
  if (
    e.length > MAX_ANCHOR_TEXT_BYTES ||
    !isWellFormedString(e) ||
    new TextEncoder().encode(e).length > MAX_ANCHOR_TEXT_BYTES
  )
    return false;
  for (let t of e) {
    let codePoint = t.codePointAt(0);
    if (codePoint < 32 || isUnsafeCodePoint(codePoint, t)) return false;
  }
  return true;
}
//@ chunk-b0a246e7.js:12065-12350 placement
function readAnchorPath(e, path) {
  if (path === undefined || path === null || path === "") return;
  if (typeof path !== "string") {
    countGate(e, "anchor_path");
    return;
  }
  let parts = path.split(" > ");
  if (
    path.length <= 1024 &&
    parts.length <= 10 &&
    parts.every(
      (r, o) =>
        ANCHOR_NTH_OF_TYPE_RE.test(r) ||
        (o === 0 && (ANCHOR_ID_SELECTOR_RE.test(r) || ANCHOR_DATA_ID_SELECTOR_RE.test(r))),
    )
  )
    return path;
  countGate(e, isSafeIdentifierText(path) ? "anchor_path_opaque" : "anchor_path");
  return;
}
//@ chunk-b0a246e7.js:12350-12460 placement
/**
 * 锚点上限：位置 2^24、标签 128、详情 512、子节点 8 个且索引 <4096、文件 sha256 正则与降级标记。
 */
var ANCHOR_LIMITS = 512;
var MAX_ANCHOR_POSITION = 16777216;
var MAX_ANCHOR_LABEL_CHARS = 128;
var MAX_ANCHOR_DETAIL_CHARS = 512;
var MAX_ANCHOR_CHILDREN = 8;
var MAX_ANCHOR_CHILD_INDEX = 4096;
var ANCHOR_FILE_SHA_RE = /^[a-f0-9]{64}$/;
var DEGRADED_ANCHOR_FILE = Symbol("degraded-wire-anchor-file");
//@ chunk-b0a246e7.js:12460-13204 placement
function readAnchorFile(e, anchor) {
  let file = anchor?.file;
  if (file === undefined || file === null || file === "") return;
  if (file === DEGRADED_ANCHOR_FILE)
    return {
      anchorFileDegraded: true,
    };
  let r = () => {
    countGate(e, "anchor_file");
    return {
      anchorFileDegraded: true,
    };
  };
  if (typeof file !== "string") return r();
  if (!isWellFormedString(file)) return r();
  if (new TextEncoder().encode(file).length > 512) return r();
  for (let c of file) {
    let codePoint = c.codePointAt(0);
    if (codePoint < 32 || codePoint === 127 || c === "%" || c === ";" || c === "\\") return r();
  }
  if (file.endsWith(".cmekshadow") || file.startsWith("/")) return r();
  let parts = file.split("/");
  if (parts.some((c) => c === "" || c === "." || c === "..")) return r();
  if (parts[0].startsWith("_")) return r();
  if (containsBlockedChars(file)) return r();
  let fileSha = anchor?.file_sha;
  if (fileSha === undefined || fileSha === null || fileSha === "")
    return {
      anchorFile: file,
    };
  if (typeof fileSha !== "string" || !ANCHOR_FILE_SHA_RE.test(fileSha)) {
    countGate(e, "anchor_file_sha");
    return {
      anchorFile: file,
    };
  }
  return {
    anchorFile: file,
    anchorFileSha: fileSha,
  };
}
//@ chunk-b0a246e7.js:13204-13335 placement
function parseAnchorMovedAt(e, movedAt) {
  if (movedAt === undefined || movedAt === null || movedAt === "") return;
  if (typeof movedAt === "string" && TIMESTAMP_TEXT_RE.test(movedAt)) return movedAt;
  countGate(e, "anchor_moved_at");
  return;
}
//@ chunk-b0a246e7.js:13335-13474 placement
function parseAnchorMovedCommentId(e, movedCommentId) {
  if (movedCommentId === undefined || movedCommentId === null || movedCommentId === "") return;
  if (typeof movedCommentId === "string" && COMMENT_ID_RE.test(movedCommentId)) return movedCommentId;
  countGate(e, "anchor_moved_comment_id");
  return;
}
//@ chunk-b0a246e7.js:13474-13788 placement
function readAnchorSpan(e, span) {
  if (span === undefined || span === null) return;
  if (typeof span !== "object") {
    countGate(e, "anchor_span");
    return;
  }
  let n = span;
  if (
    typeof n.start !== "number" ||
    !Number.isInteger(n.start) ||
    n.start < 0 ||
    n.start > MAX_ANCHOR_POSITION ||
    typeof n.quote !== "string" ||
    n.quote === "" ||
    new TextEncoder().encode(n.quote).length > ANCHOR_LIMITS
  ) {
    countGate(e, "anchor_span");
    return;
  }
  return n.quote;
}
//@ chunk-b0a246e7.js:13788-14019 placement
/**
 * 只对人类作者的评论规范化 presence 数据，把其中字符串转成页面纯文本后序列化；无效、未变化或超出字节上限时计入 gate 统计并丢弃。
 */
function serializeCommentPresence(e, presence, role) {
  if (presence === undefined || presence === null) return;
  let r =
    getCommentAuthorKind({
      role,
    }) === "human"
      ? normalizePresence(presence)
      : null;
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
  if (n === undefined || n === null || n === "") return;
  if (typeof n !== "string" || new TextEncoder().encode(n).length > r) {
    countGate(e, t);
    return;
  }
  let trimmed = stripControlChars(n).replace(INVISIBLE_BLANKS, " ").replace(/\s+/g, " ").trim();
  return trimmed === "" ? undefined : trimmed;
}
//@ chunk-b0a246e7.js:14377-14387 placement
var MAX_DEGRADED_TEXT_CHARS = 40;
//@ chunk-b0a246e7.js:14387-14588 placement
function cleanAnchorText(e) {
  if (typeof e !== "string") return;
  let trimmed = characterReferencesAsBrackets(
    stripControlChars(foldLookalikeChars(normalizeFullWidthSpace(truncateCodePoints(e, 1024)))),
  )
    .replace(INVISIBLE_BLANKS, " ")
    .replace(ANGLE_BRACKET_RUN_RE, " ")
    .replace(DECISION_SURFACE_BRACKETS_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  let n = truncateCodePoints(trimmed, MAX_DEGRADED_TEXT_CHARS).trimEnd();
  return n === "" ? undefined : n;
}
//@ chunk-b0a246e7.js:14588-15093 placement
function readAnchorRegion(e, region) {
  if (region === undefined || region === null) return;
  if (typeof region !== "object") {
    countGate(e, "anchor_region");
    return;
  }
  let n = region;
  let r = (c) => typeof c === "number" && c >= 0 && c <= 1;
  let o = (c) => Math.round(c * 1000) / 1000;
  if (!r(n.x0) || !r(n.y0) || !r(n.x1) || !r(n.y1) || o(n.x0) >= o(n.x1) || o(n.y0) >= o(n.y1)) {
    countGate(e, "anchor_region");
    return;
  }
  if (n.kids === undefined || n.kids === null)
    return {
      kids: [],
    };
  let kids = n.kids;
  if (
    !Array.isArray(kids) ||
    kids.length > MAX_ANCHOR_CHILDREN ||
    !kids.every(
      (c, a) => Number.isInteger(c) && c >= 0 && c < MAX_ANCHOR_CHILD_INDEX && (a === 0 || c > kids[a - 1]),
    )
  ) {
    countGate(e, "anchor_region");
    return {
      kids: [],
    };
  }
  return {
    kids,
  };
}
//@ chunk-b0a246e7.js:15093-15176 placement
function boundedTimestamp(e, t, createdAt) {
  if (createdAt === undefined) return false;
  if (TIMESTAMP_TEXT_RE.test(createdAt)) return true;
  countGate(e, t);
  return false;
}
//@ chunk-b0a246e7.js:15176-18315 placement
/**
 * 解析 /api/frame/comments 返回的线程：作者/角色/锚点（路径、文件、文本区间、区域）等，降级字段计数。
 */
function parseCommentThreads(e, t = "artifact_comments_read") {
  let n = {
    gates: new Map(),
  };
  let r = commentsPayloadSchema(n);
  let o = r.payload.safeParse(e);
  if (!o.success) return null;
  let u = o.data.threads === EMPTY_MENTION_LIST;
  let c = [];
  let a = new Set();
  let d = 0;
  let l = 0;
  for (let A of o.data.threads ?? []) {
    let h = r.thread.safeParse(A);
    if (!h.success) {
      d++;
      continue;
    }
    let s = h.data;
    if (a.has(s.id)) {
      d++;
      continue;
    }
    a.add(s.id);
    if (!ARTIFACT_SLUG_RE.test(s.id)) {
      d++;
      continue;
    }
    let x = [];
    let E = l;
    let anchorPath = readAnchorPath(n, s.anchor?.path);
    let anchorSpan = readAnchorSpan(n, s.anchor?.span);
    let T = anchorSpan !== undefined ? stripControlChars(anchorSpan) : undefined;
    let b = cleanBoundedText(n, "anchor_label", s.anchor?.label, MAX_ANCHOR_LABEL_CHARS);
    let M = cleanBoundedText(n, "anchor_detail", s.anchor?.detail, MAX_ANCHOR_DETAIL_CHARS);
    let pathUnreadable = s.anchor?.path_unreadable;
    let R = anchorPath !== undefined && pathUnreadable === true && (b !== undefined || M !== undefined);
    if (pathUnreadable !== undefined && pathUnreadable !== null && typeof pathUnreadable !== "boolean")
      countGate(n, "anchor_path_unreadable");
    let anchorMovedAt = parseAnchorMovedAt(n, s.anchor?.moved_at);
    let anchorMovedCommentId = parseAnchorMovedCommentId(n, s.anchor?.moved_comment_id);
    let N = s.anchor?.span !== undefined && s.anchor?.span !== null;
    let F = anchorPath !== undefined && !N ? readAnchorRegion(n, s.anchor?.region) : undefined;
    let Q = new Set();
    for (let Te of s.comments ?? []) {
      let te = r.comment.safeParse(Te);
      if (!te.success) {
        l++;
        continue;
      }
      let w = te.data;
      if (!COMMENT_ID_RE.test(w.id)) {
        l++;
        continue;
      }
      if (Q.has(w.id)) {
        l++;
        continue;
      }
      Q.add(w.id);
      let role = boundedRole(n, w.author.role);
      let ne = serializeCommentPresence(n, w.presence, role);
      let re = authorAccount(n, w.author.account);
      let oe =
        getCommentAuthorKind({
          role,
        }) === "human" && isCommentId(re);
      let ae = oe ? normalizeCommentAccess(w.author.access) : undefined;
      let De = oe && w.author.outside === true;
      x.push({
        id: w.id,
        account: re,
        ...(role !== undefined && {
          role,
        }),
        text: stripControlChars(w.text),
        ...(boundedTimestamp(n, "created_at", w.created_at) && {
          createdAt: w.created_at,
        }),
        ...(w.to_claude_at !== undefined &&
          w.to_claude_at !== "" &&
          w.to_claude_at !== "degraded" && {
            toClaudeAt: w.to_claude_at,
          }),
        ...(w.to_claude_at === "degraded" && {
          toClaudeAtDegraded: true,
        }),
        ...(hasAuthorAccountSource(n, w.source, role) === true && {
          postedByArtifact: true,
        }),
        ...(w.sent_by_viewer !== undefined && {
          sentByViewer: w.sent_by_viewer,
        }),
        ...(ne !== undefined && {
          presence: ne,
        }),
        ...(ae !== undefined && {
          access: ae,
        }),
        ...(De && {
          outside: true,
        }),
      });
    }
    let resolvedAt = parseResolvedAt(n, s.resolved_at);
    c.push({
      id: s.id,
      ...(boundedTimestamp(n, "thread_created_at", s.created_at) && {
        createdAt: s.created_at,
      }),
      resolved: resolvedAt !== undefined,
      ...(resolvedByClaudeFlag(n, s.resolved_by) === true && {
        resolvedByClaude: true,
      }),
      ...resolvedAt,
      claudeActivated:
        s.claude_activated_at !== undefined &&
        s.claude_activated_at !== "" &&
        s.claude_activated_at !== "degraded",
      ...(s.claude_activated_at !== undefined &&
        s.claude_activated_at !== "" &&
        s.claude_activated_at !== "degraded" && {
          activatedAt: s.claude_activated_at,
        }),
      ...(s.claude_activated_at === "degraded" && {
        activatedAtDegraded: true,
      }),
      ...(s.claude_activated_by !== undefined &&
        s.claude_activated_by !== "" &&
        boundedAccountId(n, "claude_activated_by", s.claude_activated_by) !== "unknown" && {
          activatedBy: s.claude_activated_by,
        }),
      ...((s.comments === EMPTY_MENTION_LIST_B || l > E) && {
        commentsDegraded: true,
      }),
      carried: s.carried === true,
      ...(anchorPath !== undefined && {
        anchorPath,
      }),
      ...readAnchorFile(n, s.anchor),
      ...(T !== undefined &&
        T.trim() !== "" && {
          spanQuote: T,
        }),
      ...(R && {
        anchorPathUnreadable: true,
      }),
      ...(anchorMovedAt !== undefined && {
        anchorMovedAt,
      }),
      ...(anchorMovedCommentId !== undefined && {
        anchorMovedCommentId,
      }),
      ...(b !== undefined && {
        anchorLabel: b,
      }),
      ...(M !== undefined && {
        anchorDetail: M,
      }),
      ...(F !== undefined && {
        region: true,
        ...(F.kids.length > 0 && {
          regionKids: F.kids,
        }),
      }),
      ...(parseCommentCapability(n, s.claude_capability) === true && {
        editCapable: true,
      }),
      comments: x,
    });
  }
  if (d > 0 || l > 0 || n.gates.size > 0) {
    let A = [...n.gates];
    logFeatureSad(t, "rows_degraded", {
      ...Object.fromEntries(A.map(([h, s]) => [`degraded_${h}`, s])),
      dropped_threads: d,
      dropped_comments: l,
      degraded_fields: A.reduce((acc, [, s]) => acc + s, 0),
      ...(A.length > 0 && {
        degraded_gates: fromEnumArr(A.map(([h]) => h)),
      }),
    });
  } else logFeatureOk(t);
  return {
    threads: c,
    ...(u && {
      threadsDegraded: true,
    }),
    ...(d > 0 && {
      threadsDropped: true,
    }),
  };
}
export {
  isCommentId,
  cleanAnchorText,
  ANCHOR_LABEL_NAMES,
  ANCHOR_LABEL_ON_TEXT,
  ANCHOR_LABEL_REGION_OF,
  ANCHOR_LABEL_ANCHORED_AT,
  ANCHOR_LABEL_ELEMENT,
  MAX_ANCHOR_CHILDREN,
  ANCHOR_LABEL_REGION,
  ANCHOR_LABEL_LOCATION,
  ANCHOR_LABELS,
  TIMESTAMP_TEXT_RE,
  ANCHOR_LABEL_ON_PAGE,
  ANCHOR_LABEL_PRESENCE,
  COMMENT_ID_RE,
  ANCHOR_ID_SELECTOR_RE,
  ANCHOR_DATA_ID_SELECTOR_RE,
  ANCHOR_NTH_OF_TYPE_RE,
  parseCommentThreads,
};
