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
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-b0a246e7.js:9212-10500 placement
function commentsPayloadSchema(counter) {
  let comment = create({
    id: create_2(),
    author: create({
      account: create_2().nullable().optional(),
      role: nullableStringField(counter, "role", "degraded"),
      access: create_12().optional(),
      outside: create_12().optional(),
    }),
    text: create_2(),
    created_at: nullableStringField(counter, "created_at", undefined),
    to_claude_at: nullableStringField(counter, "to_claude_at", "degraded"),
    source: create_12().optional(),
    presence: create_12().optional(),
    sent_by_viewer: create_6()
      .nullable()
      .optional()
      .catch(gateFallback(counter, "sent_by_viewer", undefined))
      .transform((value) => value ?? undefined),
  });
  let thread = create({
    id: create_2(),
    created_at: nullableStringField(counter, "thread_created_at", undefined),
    comments: create_15(create_12())
      .readonly()
      .nullable()
      .catch(gateFallback(counter, "comments_list", EMPTY_MENTION_LIST_B)),
    resolved_at: nullableStringField(counter, "resolved_at", "degraded"),
    resolved_by: create_12().optional(),
    claude_activated_at: nullableStringField(counter, "claude_activated_at", "degraded"),
    claude_activated_by: nullableStringField(counter, "claude_activated_by", undefined),
    claude_capability: create_12().optional(),
    carried: create_6()
      .nullable()
      .optional()
      .catch(gateFallback(counter, "carried", undefined))
      .transform((value) => value ?? undefined),
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
        gateFallback(counter, "anchor", {
          file: DEGRADED_ANCHOR_FILE,
        }),
      )
      .transform((value) => value ?? undefined),
  });
  let payload = create({
    threads: create_15(create_12())
      .readonly()
      .nullable()
      .catch(gateFallback(counter, "threads_list", EMPTY_MENTION_LIST)),
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
function isCommentId(value) {
  return COMMENT_ID_RE.test(value) || PRINCIPAL_TOKEN_RE.test(value);
}
//@ chunk-b0a246e7.js:10607-10669 placement
function boundedAccountId(counter, field, account) {
  if (isCommentId(account)) return account;
  countGate(counter, field);
  return "unknown";
}
//@ chunk-b0a246e7.js:10669-10751 placement
function authorAccount(counter, account) {
  if (account === null || account === undefined) return "unknown";
  return boundedAccountId(counter, "account", account);
}
//@ chunk-b0a246e7.js:10751-10834 placement
function boundedRole(counter, role) {
  if (role === undefined || ORIGINAL_ROLE_RE.test(role)) return role;
  countGate(counter, "role");
  return "degraded";
}
//@ chunk-b0a246e7.js:10834-10943 placement
function parseCommentCapability(counter, claudeCapability) {
  if (claudeCapability === "edit") return true;
  if (claudeCapability !== undefined && claudeCapability !== null && claudeCapability !== "reply")
    countGate(counter, "claude_capability");
  return;
}
//@ chunk-b0a246e7.js:10943-11019 placement
function hasAuthorAccountSource(counter, account, account_2) {
  if (!hasAuthorAccount(account, account_2)) return;
  if (account !== "page") countGate(counter, "source");
  return true;
}
//@ chunk-b0a246e7.js:11019-11167 placement
function parseResolvedAt(counter, resolvedAt) {
  if (resolvedAt === undefined || resolvedAt === "") return;
  if (parseTimestamp(resolvedAt) !== null)
    return {
      resolvedAt,
    };
  if (resolvedAt !== "degraded") countGate(counter, "resolved_at");
  return {
    resolvedDegraded: true,
  };
}
//@ chunk-b0a246e7.js:11167-11259 placement
function resolvedByClaudeFlag(counter, resolvedBy) {
  if (resolvedBy === "claude") return true;
  if (resolvedBy !== undefined && resolvedBy !== null) countGate(counter, "resolved_by");
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
function isUnsafeCodePoint(codePoint, char) {
  if (INVISIBLE_CHAR_RE.test(char)) return true;
  switch (codePoint) {
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
  if ((codePoint & 65534) === 65534 || (codePoint >= 64976 && codePoint <= 65007)) return true;
  return (codePoint >= 65520 && codePoint <= 65528) || (codePoint >= 917504 && codePoint <= 921599);
}
//@ chunk-b0a246e7.js:11905-12065 placement
/**
 * 判断文本可作为安全标识展示：不超长（字符与 UTF-8 字节）、是良构字符串、无控制字符和不可见/私用/非字符码点。
 */
function isSafeIdentifierText(text) {
  if (
    text.length > MAX_ANCHOR_TEXT_BYTES ||
    !isWellFormedString(text) ||
    new TextEncoder().encode(text).length > MAX_ANCHOR_TEXT_BYTES
  )
    return false;
  for (let char of text) {
    let codePoint = char.codePointAt(0);
    if (codePoint < 32 || isUnsafeCodePoint(codePoint, char)) return false;
  }
  return true;
}
//@ chunk-b0a246e7.js:12065-12350 placement
function readAnchorPath(counter, text) {
  if (text === undefined || text === null || text === "") return;
  if (typeof text !== "string") {
    countGate(counter, "anchor_path");
    return;
  }
  let parts = text.split(" > ");
  if (
    text.length <= 1024 &&
    parts.length <= 10 &&
    parts.every(
      (part, partIndex) =>
        ANCHOR_NTH_OF_TYPE_RE.test(part) ||
        (partIndex === 0 && (ANCHOR_ID_SELECTOR_RE.test(part) || ANCHOR_DATA_ID_SELECTOR_RE.test(part))),
    )
  )
    return text;
  countGate(counter, isSafeIdentifierText(text) ? "anchor_path_opaque" : "anchor_path");
  return;
}
//@ chunk-b0a246e7.js:12350-12460 placement
/**
 * 锚点上限：位置 2^24、标签 128、详情 512、子节点 8 个且索引 <4096、文件 sha256 正则与降级标记。
 */
var MAX_ANCHOR_QUOTE_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_ANCHOR_POSITION;
var MAX_ANCHOR_LABEL_CHARS;
var MAX_ANCHOR_DETAIL_CHARS;
var MAX_ANCHOR_CHILDREN;
var MAX_ANCHOR_CHILD_INDEX;
var ANCHOR_FILE_SHA_RE;
var DEGRADED_ANCHOR_FILE;
deferInit("chunk-b0a246e7.js:12350", () => {
  MAX_ANCHOR_QUOTE_BYTES = 512;
  MAX_ANCHOR_POSITION = 16777216;
  MAX_ANCHOR_LABEL_CHARS = 128;
  MAX_ANCHOR_DETAIL_CHARS = 512;
  MAX_ANCHOR_CHILDREN = 8;
  MAX_ANCHOR_CHILD_INDEX = 4096;
  ANCHOR_FILE_SHA_RE = /^[a-f0-9]{64}$/;
  DEGRADED_ANCHOR_FILE = Symbol("degraded-wire-anchor-file");
});
//@ chunk-b0a246e7.js:12460-13204 placement
function readAnchorFile(counter, anchor) {
  let file = anchor?.file;
  if (file === undefined || file === null || file === "") return;
  if (file === DEGRADED_ANCHOR_FILE)
    return {
      anchorFileDegraded: true,
    };
  let degradedFile = () => {
    countGate(counter, "anchor_file");
    return {
      anchorFileDegraded: true,
    };
  };
  if (typeof file !== "string") return degradedFile();
  if (!isWellFormedString(file)) return degradedFile();
  if (new TextEncoder().encode(file).length > 512) return degradedFile();
  for (let char of file) {
    let codePoint = char.codePointAt(0);
    if (codePoint < 32 || codePoint === 127 || char === "%" || char === ";" || char === "\\")
      return degradedFile();
  }
  if (file.endsWith(".cmekshadow") || file.startsWith("/")) return degradedFile();
  let parts = file.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return degradedFile();
  if (parts[0].startsWith("_")) return degradedFile();
  if (containsBlockedChars(file)) return degradedFile();
  let fileSha = anchor?.file_sha;
  if (fileSha === undefined || fileSha === null || fileSha === "")
    return {
      anchorFile: file,
    };
  if (typeof fileSha !== "string" || !ANCHOR_FILE_SHA_RE.test(fileSha)) {
    countGate(counter, "anchor_file_sha");
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
function parseAnchorMovedAt(counter, movedAt) {
  if (movedAt === undefined || movedAt === null || movedAt === "") return;
  if (typeof movedAt === "string" && TIMESTAMP_TEXT_RE.test(movedAt)) return movedAt;
  countGate(counter, "anchor_moved_at");
  return;
}
//@ chunk-b0a246e7.js:13335-13474 placement
function parseAnchorMovedCommentId(counter, movedCommentId) {
  if (movedCommentId === undefined || movedCommentId === null || movedCommentId === "") return;
  if (typeof movedCommentId === "string" && COMMENT_ID_RE.test(movedCommentId)) return movedCommentId;
  countGate(counter, "anchor_moved_comment_id");
  return;
}
//@ chunk-b0a246e7.js:13474-13788 placement
function readAnchorSpan(counter, span) {
  if (span === undefined || span === null) return;
  if (typeof span !== "object") {
    countGate(counter, "anchor_span");
    return;
  }
  let value = span;
  if (
    typeof value.start !== "number" ||
    !Number.isInteger(value.start) ||
    value.start < 0 ||
    value.start > MAX_ANCHOR_POSITION ||
    typeof value.quote !== "string" ||
    value.quote === "" ||
    new TextEncoder().encode(value.quote).length > MAX_ANCHOR_QUOTE_BYTES
  ) {
    countGate(counter, "anchor_span");
    return;
  }
  return value.quote;
}
//@ chunk-b0a246e7.js:13788-14019 placement
/**
 * 只对人类作者的评论规范化 presence 数据，把其中字符串转成页面纯文本后序列化；无效、未变化或超出字节上限时计入 gate 统计并丢弃。
 */
function serializeCommentPresence(counter, presence, role) {
  if (presence === undefined || presence === null) return;
  let presenceValue =
    getCommentAuthorKind({
      role,
    }) === "human"
      ? normalizePresence(presence)
      : null;
  if (presenceValue === null || presenceValue === "unchanged") {
    countGate(counter, "presence");
    return;
  }
  let text = jsonStringify(toPlainTextDeep(presenceValue.data));
  if (Buffer.byteLength(text, "utf8") > MAX_PRESENCE_BYTES) {
    countGate(counter, "presence");
    return;
  }
  return text;
}
//@ chunk-b0a246e7.js:14019-14162 placement
function toPlainTextDeep(value) {
  if (typeof value === "string") return extractPageText(value);
  if (Array.isArray(value)) return value.map(toPlainTextDeep);
  if (value !== null && typeof value === "object") return import_mapValues(value, toPlainTextDeep);
  return value;
}
//@ chunk-b0a246e7.js:14162-14377 placement
function cleanBoundedText(counter, field, value, maxBytes) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string" || new TextEncoder().encode(value).length > maxBytes) {
    countGate(counter, field);
    return;
  }
  let trimmed = stripControlChars(value).replace(INVISIBLE_BLANKS, " ").replace(/\s+/g, " ").trim();
  return trimmed === "" ? undefined : trimmed;
}
//@ chunk-b0a246e7.js:14377-14387 placement
var MAX_DEGRADED_TEXT_CHARS = 40;
//@ chunk-b0a246e7.js:14387-14588 placement
function cleanAnchorText(text) {
  if (typeof text !== "string") return;
  let trimmed = characterReferencesAsBrackets(
    stripControlChars(foldLookalikeChars(normalizeFullWidthSpace(truncateCodePoints(text, 1024)))),
  )
    .replace(INVISIBLE_BLANKS, " ")
    .replace(ANGLE_BRACKET_RUN_RE, " ")
    .replace(DECISION_SURFACE_BRACKETS_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  let bounded = truncateCodePoints(trimmed, MAX_DEGRADED_TEXT_CHARS).trimEnd();
  return bounded === "" ? undefined : bounded;
}
//@ chunk-b0a246e7.js:14588-15093 placement
function readAnchorRegion(counter, region) {
  if (region === undefined || region === null) return;
  if (typeof region !== "object") {
    countGate(counter, "anchor_region");
    return;
  }
  let value = region;
  let isUnitFraction = (n) => typeof n === "number" && n >= 0 && n <= 1;
  let round3 = (value) => Math.round(value * 1000) / 1000;
  if (
    !isUnitFraction(value.x0) ||
    !isUnitFraction(value.y0) ||
    !isUnitFraction(value.x1) ||
    !isUnitFraction(value.y1) ||
    round3(value.x0) >= round3(value.x1) ||
    round3(value.y0) >= round3(value.y1)
  ) {
    countGate(counter, "anchor_region");
    return;
  }
  if (value.kids === undefined || value.kids === null)
    return {
      kids: [],
    };
  let kids = value.kids;
  if (
    !Array.isArray(kids) ||
    kids.length > MAX_ANCHOR_CHILDREN ||
    !kids.every(
      (kid, kidIndex) =>
        Number.isInteger(kid) &&
        kid >= 0 &&
        kid < MAX_ANCHOR_CHILD_INDEX &&
        (kidIndex === 0 || kid > kids[kidIndex - 1]),
    )
  ) {
    countGate(counter, "anchor_region");
    return {
      kids: [],
    };
  }
  return {
    kids,
  };
}
//@ chunk-b0a246e7.js:15093-15176 placement
function boundedTimestamp(counter, field, createdAt) {
  if (createdAt === undefined) return false;
  if (TIMESTAMP_TEXT_RE.test(createdAt)) return true;
  countGate(counter, field);
  return false;
}
//@ chunk-b0a246e7.js:15176-18315 placement
/**
 * 解析 /api/frame/comments 返回的线程：作者/角色/锚点（路径、文件、文本区间、区域）等，降级字段计数。
 */
function parseCommentThreads(payload, featureName = "artifact_comments_read") {
  let gateState = {
    gates: new Map(),
  };
  let schemas = commentsPayloadSchema(gateState);
  let parsedPayload = schemas.payload.safeParse(payload);
  if (!parsedPayload.success) return null;
  let threadsDegraded = parsedPayload.data.threads === EMPTY_MENTION_LIST;
  let threads = [];
  let seenThreadIds = new Set();
  let threadsDropped = 0;
  let commentCount = 0;
  for (let rawThread of parsedPayload.data.threads ?? []) {
    let parsedThread = schemas.thread.safeParse(rawThread);
    if (!parsedThread.success) {
      threadsDropped++;
      continue;
    }
    let thread = parsedThread.data;
    if (seenThreadIds.has(thread.id)) {
      threadsDropped++;
      continue;
    }
    seenThreadIds.add(thread.id);
    if (!ARTIFACT_SLUG_RE.test(thread.id)) {
      threadsDropped++;
      continue;
    }
    let comments = [];
    let commentsStartCount = commentCount;
    let anchorPath = readAnchorPath(gateState, thread.anchor?.path);
    let anchorSpan = readAnchorSpan(gateState, thread.anchor?.span);
    let spanQuote = anchorSpan !== undefined ? stripControlChars(anchorSpan) : undefined;
    let anchorLabel = cleanBoundedText(
      gateState,
      "anchor_label",
      thread.anchor?.label,
      MAX_ANCHOR_LABEL_CHARS,
    );
    let anchorDetail = cleanBoundedText(
      gateState,
      "anchor_detail",
      thread.anchor?.detail,
      MAX_ANCHOR_DETAIL_CHARS,
    );
    let pathUnreadable = thread.anchor?.path_unreadable;
    let anchorPathUnreadableFlag =
      anchorPath !== undefined &&
      pathUnreadable === true &&
      (anchorLabel !== undefined || anchorDetail !== undefined);
    if (pathUnreadable !== undefined && pathUnreadable !== null && typeof pathUnreadable !== "boolean")
      countGate(gateState, "anchor_path_unreadable");
    let anchorMovedAt = parseAnchorMovedAt(gateState, thread.anchor?.moved_at);
    let anchorMovedCommentId = parseAnchorMovedCommentId(gateState, thread.anchor?.moved_comment_id);
    let hasSpan = thread.anchor?.span !== undefined && thread.anchor?.span !== null;
    let region =
      anchorPath !== undefined && !hasSpan ? readAnchorRegion(gateState, thread.anchor?.region) : undefined;
    let seenCommentIds = new Set();
    for (let rawComment of thread.comments ?? []) {
      let parsedComment = schemas.comment.safeParse(rawComment);
      if (!parsedComment.success) {
        commentCount++;
        continue;
      }
      let comment = parsedComment.data;
      if (!COMMENT_ID_RE.test(comment.id)) {
        commentCount++;
        continue;
      }
      if (seenCommentIds.has(comment.id)) {
        commentCount++;
        continue;
      }
      seenCommentIds.add(comment.id);
      let authorRole = boundedRole(gateState, comment.author.role);
      let presenceValue = serializeCommentPresence(gateState, comment.presence, authorRole);
      let account = authorAccount(gateState, comment.author.account);
      let isHumanAuthor =
        getCommentAuthorKind({
          role: authorRole,
        }) === "human" && isCommentId(account);
      let access = isHumanAuthor ? normalizeCommentAccess(comment.author.access) : undefined;
      let isOutside = isHumanAuthor && comment.author.outside === true;
      comments.push({
        id: comment.id,
        account,
        ...(authorRole !== undefined && {
          role: authorRole,
        }),
        text: stripControlChars(comment.text),
        ...(boundedTimestamp(gateState, "created_at", comment.created_at) && {
          createdAt: comment.created_at,
        }),
        ...(comment.to_claude_at !== undefined &&
          comment.to_claude_at !== "" &&
          comment.to_claude_at !== "degraded" && {
            toClaudeAt: comment.to_claude_at,
          }),
        ...(comment.to_claude_at === "degraded" && {
          toClaudeAtDegraded: true,
        }),
        ...(hasAuthorAccountSource(gateState, comment.source, authorRole) === true && {
          postedByArtifact: true,
        }),
        ...(comment.sent_by_viewer !== undefined && {
          sentByViewer: comment.sent_by_viewer,
        }),
        ...(presenceValue !== undefined && {
          presence: presenceValue,
        }),
        ...(access !== undefined && {
          access,
        }),
        ...(isOutside && {
          outside: true,
        }),
      });
    }
    let resolvedAt = parseResolvedAt(gateState, thread.resolved_at);
    threads.push({
      id: thread.id,
      ...(boundedTimestamp(gateState, "thread_created_at", thread.created_at) && {
        createdAt: thread.created_at,
      }),
      resolved: resolvedAt !== undefined,
      ...(resolvedByClaudeFlag(gateState, thread.resolved_by) === true && {
        resolvedByClaude: true,
      }),
      ...resolvedAt,
      claudeActivated:
        thread.claude_activated_at !== undefined &&
        thread.claude_activated_at !== "" &&
        thread.claude_activated_at !== "degraded",
      ...(thread.claude_activated_at !== undefined &&
        thread.claude_activated_at !== "" &&
        thread.claude_activated_at !== "degraded" && {
          activatedAt: thread.claude_activated_at,
        }),
      ...(thread.claude_activated_at === "degraded" && {
        activatedAtDegraded: true,
      }),
      ...(thread.claude_activated_by !== undefined &&
        thread.claude_activated_by !== "" &&
        boundedAccountId(gateState, "claude_activated_by", thread.claude_activated_by) !== "unknown" && {
          activatedBy: thread.claude_activated_by,
        }),
      ...((thread.comments === EMPTY_MENTION_LIST_B || commentCount > commentsStartCount) && {
        commentsDegraded: true,
      }),
      carried: thread.carried === true,
      ...(anchorPath !== undefined && {
        anchorPath,
      }),
      ...readAnchorFile(gateState, thread.anchor),
      ...(spanQuote !== undefined &&
        spanQuote.trim() !== "" && {
          spanQuote,
        }),
      ...(anchorPathUnreadableFlag && {
        anchorPathUnreadable: true,
      }),
      ...(anchorMovedAt !== undefined && {
        anchorMovedAt,
      }),
      ...(anchorMovedCommentId !== undefined && {
        anchorMovedCommentId,
      }),
      ...(anchorLabel !== undefined && {
        anchorLabel,
      }),
      ...(anchorDetail !== undefined && {
        anchorDetail,
      }),
      ...(region !== undefined && {
        region: true,
        ...(region.kids.length > 0 && {
          regionKids: region.kids,
        }),
      }),
      ...(parseCommentCapability(gateState, thread.claude_capability) === true && {
        editCapable: true,
      }),
      comments,
    });
  }
  if (threadsDropped > 0 || commentCount > 0 || gateState.gates.size > 0) {
    let gates = [...gateState.gates];
    logFeatureSad(featureName, "rows_degraded", {
      ...Object.fromEntries(gates.map(([gateName, gateCount]) => [`degraded_${gateName}`, gateCount])),
      dropped_threads: threadsDropped,
      dropped_comments: commentCount,
      degraded_fields: gates.reduce((acc, [, gateCount]) => acc + gateCount, 0),
      ...(gates.length > 0 && {
        degraded_gates: fromEnumArr(gates.map(([gateName]) => gateName)),
      }),
    });
  } else logFeatureOk(featureName);
  return {
    threads,
    ...(threadsDegraded && {
      threadsDegraded: true,
    }),
    ...(threadsDropped > 0 && {
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
