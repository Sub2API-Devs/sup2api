/**
 * services/artifacts/artifactDb.ts
 *
 * 2.1.316 新增：Artifact 数据库（/api/frame/db/agent）：集合/文档读写、str_replace 编辑、版本冲突、批量写入与限额错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0zqb2m0b.js (69)
 * attribution: placement 69
 */
import { randomBytes } from "crypto";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { AbortError } from "../../utils/errors.js";
import { countCharInString } from "../../utils/stringUtils.js";
import {
  CCR_CREDENTIAL_REFUSED_PREFIX,
  relayIsOnlyRoute,
  plannedRoute,
  frameApi,
  threwOnRelayLeg,
} from "./frameRelay.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  create_25,
  create_6,
  create,
  create_20,
  create_2,
  create_12,
  create_3,
  create_15,
  create_9,
} from "../../../vendor/zod/lib/index.mjs";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sanitizeDisplayTextOrUndefined } from "./capabilityDeclaration.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { formatBytesDecimal } from "../../utils/format.js";
import { getGatewayAccountInfoAsync } from "../../utils/gatewayCredential.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { getAuthHeaders } from "../../utils/http.js";
import { hashCredential, hasApiClient } from "../routines/routinesApi.js";
import { checkAndRefreshOAuthTokenIfNeeded } from "../../utils/auth.js";
import {
  getSessionHintHeaders,
  findRejectedHintFields,
  mentionsSessionHintField,
  noteSessionHintsRefused,
  SESSION_HINT_FIELDS,
} from "./requestMeta.js";
import { requestIdMeta, buildFrameHeaders } from "./frameApi.js";
import { sleep } from "../../utils/sleep.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-0zqb2m0b.js:959-1011 placement
function isArtifactDbEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_DB ?? true;
}
//@ chunk-0zqb2m0b.js:1011-1112 placement
function isArtifactDbStrReplaceEnabled() {
  return (
    isArtifactDbEnabled() &&
    (env.CLAUDE_CODE_ARTIFACT_DB_STR_REPLACE ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_stile", false)) === true
  );
}
//@ chunk-0zqb2m0b.js:1112-1149 placement
var ARTIFACT_DB_API_PATH = "/api/frame/db/agent";
var DB_REQUEST_TIMEOUT_MS = 5000;
//@ chunk-0zqb2m0b.js:1149-1169 placement
class DbAbortError extends AbortError {}
//@ chunk-0zqb2m0b.js:1169-1293 placement
var DB_SEGMENT_PATTERN = String.raw`(?!\.\.?(?:/|$))[A-Za-z0-9_\-.~:@+]{1,200}`;
var regExp = new RegExp(`^${DB_SEGMENT_PATTERN}$`);
var regExp_2 = new RegExp(`^${DB_SEGMENT_PATTERN}(?:/${DB_SEGMENT_PATTERN}){0,14}$`);
//@ chunk-0zqb2m0b.js:1293-1335 placement
function isCollectionPath(collection) {
  return (countCharInString(collection, "/") + 1) % 2 === 1;
}
//@ chunk-0zqb2m0b.js:1335-2026 placement
function describeCollectionPathError(collection) {
  let t = (o) => (o.length > 120 ? `${o.slice(0, 60)}\u2026${o.slice(-40)}` : o);
  let parts = collection.split("/");
  let c = parts.length;
  let s = t(parts.slice(0, -1).join("/"));
  let l = t(parts[c - 1]);
  return `collection '${t(collection)}' has ${c} segments, which makes it a document path, not a collection: collection paths have an odd number of segments (collection/document/collection/\u2026) and the document is collection + doc_id. For that document use collection '${s}' with doc_id '${l}'; for a collection inside it, add one more segment. Per-user data follows the same rule \u2014 collection 'data/users/<id>' (3 segments) holds that user's documents, so 'data/users/<id>/decks' is one document and 'data/users/<id>/decks/cards' a collection.`;
}
//@ chunk-0zqb2m0b.js:2026-2159 placement
/**
 * 数据库工具的操作分类：读（get/list/query）、写（set/update/delete/str_replace）、作用域（view/interact/admin），及列表上限 1000。
 */
var DB_LIST_LIMIT = 1000;
var READ_DB_OPERATIONS = ["get", "list", "query"];
var WRITE_DB_OPERATIONS = ["set", "update", "delete"];
var STR_REPLACE = "str_replace";
var MUTATING_DB_OPERATIONS = [...WRITE_DB_OPERATIONS, STR_REPLACE];
var DB_SCOPES = ["view", "interact", "admin"];
//@ chunk-0zqb2m0b.js:2159-2210 placement
/**
 * 导出函数 `randomBatchId`：返回 randomBytes(16).toString("base64url")。
 */
function randomBatchId() {
  return randomBytes(16).toString("base64url");
}
//@ chunk-0zqb2m0b.js:2210-2461 placement
/**
 * 数据库工具的大小与编辑限额：单字段 256 KB、文档 1 MB、请求体 4 MB、最多 200 处编辑、查询 1000 条、批量写 50、写入体 1 MB，及编辑错误码表。
 */
var MAX_EDITS_PER_CALL = 200;
var SAFE_FIELD_NAME_RE = /^(?!__.*__$)[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}"\\./[\]]{1,200}$/u;
var MAX_FIELD_VALUE_BYTES = 262144;
var MAX_DOCUMENT_BYTES = 4 * MAX_FIELD_VALUE_BYTES;
var MAX_DB_BODY_BYTES = 4194304;
var STALE_PIN_NOTICE_CHARS = 16384;
var MAX_QUERY_RESULTS = 1000;
var MAX_QUERY_LIMIT = 100;
var MAX_BATCH_WRITES = 50;
var MAX_WRITE_BODY_BYTES = 1048576;
var EDIT_ERROR_CODES = [
  "edit_no_match",
  "edit_ambiguous",
  "edit_field_missing",
  "edit_field_not_string",
  "version_mismatch",
];
//@ chunk-0zqb2m0b.js:2461-2503 placement
function isEditErrorCode(code) {
  return EDIT_ERROR_CODES.some((t) => t === code);
}
//@ chunk-0zqb2m0b.js:2503-3262 placement
/**
 * 数据库错误码映射表：服务端各种错误码统一到 not_found/invalid_argument/quota_or_rate/busy/upstream_auth/store_unavailable 等，及需要用户级 OAuth 错误的文案集合。
 */
var DB_ERROR_CODES = new Map([
  ["not_found", "not_found"],
  ["invalid_argument", "invalid_argument"],
  ["quota_or_rate", "quota_or_rate"],
  ["busy", "busy"],
  ["upstream_auth", "upstream_auth"],
  ["store_unavailable", "store_unavailable"],
  ["not_declared", "not_declared"],
  ["too_large", "too_large"],
  ["quota_exceeded", "quota_exceeded"],
  ["invalid-argument", "invalid_argument"],
  ["not-found", "not_found"],
  ["resource-exhausted", "quota_or_rate"],
  ["resource_exhausted", "quota_or_rate"],
  ["data-unavailable", "store_unavailable"],
  ["unavailable", "store_unavailable"],
  ["upstream-error", "store_unavailable"],
  ...EDIT_ERROR_CODES.map((e) => [e, e]),
]);
var USER_SCOPED_TOKEN_ERRORS = new Set([
  "an OAuth access token is required",
  "a directly presented OAuth access token is required",
  "db verbs require a user-scoped OAuth token, not an org service key",
]);
//@ chunk-0zqb2m0b.js:3262-3494 placement
function classifyCredential403(e, t) {
  if (e !== 403 || typeof t !== "string") return;
  let trimmed = t.trim();
  if (USER_SCOPED_TOKEN_ERRORS.has(trimmed))
    return {
      code: "credential_rejected",
      reason: "custody_403",
    };
  if (trimmed.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
    return {
      code: "cloud_unavailable",
      reason: "ccr_credential_refused",
    };
  return;
}
//@ chunk-0zqb2m0b.js:3494-3746 placement
function classifyDbHttpStatus(e) {
  if (e === 404 || e === 403) return "not_found";
  if (e === 400 || e === 422) return "invalid_argument";
  if (e === 413) return "too_large";
  if (e === 429) return "quota_or_rate";
  if (e === 409 || e === 412) return "busy";
  if (e === 401) return "upstream_auth";
  return "store_unavailable";
}
//@ chunk-0zqb2m0b.js:3746-4230 placement
/**
 * 把内部数据库错误码归并成对模型公开的错误码（invalid_argument/resource_exhausted/quota_exceeded/unavailable，编辑类与版本冲突原样保留）。
 */
function toPublicDbErrorCode(e) {
  switch (e) {
    case "not_found":
    case "invalid_argument":
    case "too_large":
    case "not_declared":
      return "invalid_argument";
    case "quota_or_rate":
      return "resource_exhausted";
    case "quota_exceeded":
      return "quota_exceeded";
    case "busy":
    case "upstream_auth":
    case "store_unavailable":
    case "credential_rejected":
    case "cloud_unavailable":
    case "network_off":
      return "unavailable";
    case "edit_no_match":
    case "edit_ambiguous":
    case "edit_field_missing":
    case "edit_field_not_string":
    case "version_mismatch":
      return e;
  }
}
//@ chunk-0zqb2m0b.js:4230-4402 placement
/**
 * artifact 数据库查询支持的比较运算符：英文名列表、符号写法，以及符号到英文名的映射。
 */
var DB_QUERY_OPERATORS = ["eq", "ne", "in", "not-in", "lt", "lte", "gt", "gte", "array-contains"];
var DB_SYMBOL_OPERATORS = ["==", "!=", "<", "<=", ">", ">="];
var SYMBOL_TO_DB_OPERATOR = {
  "==": "eq",
  "!=": "ne",
  "<": "lt",
  "<=": "lte",
  ">": "gt",
  ">=": "gte",
};
//@ chunk-0zqb2m0b.js:4402-4444 placement
function isComparisonSymbol(e) {
  return Object.hasOwn(SYMBOL_TO_DB_OPERATOR, e);
}
//@ chunk-0zqb2m0b.js:4444-4480 placement
function toDbOperator(e) {
  return isComparisonSymbol(e) ? SYMBOL_TO_DB_OPERATOR[e] : e;
}
//@ chunk-0zqb2m0b.js:4480-5030 placement
/**
 * 数据库响应的 schema 集合：单文档读取、文档列表、用量（文档数/上限），以及可选布尔字段 authoredByOthers/outside_writer。
 */
var optionalTrueSchema = DoctorLazy(() => create_25(true).optional().catch(undefined));
var optionalBooleanSchema = DoctorLazy(() => create_6().optional().catch(undefined));
var DB_GET_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    exists: create_6(),
    data: create_20(create_2(), create_12()).optional(),
    version: create_3().int().optional(),
    updatedAt: create_2().optional(),
    authoredByOthers: optionalTrueSchema(),
    outside_writer: optionalBooleanSchema(),
  }),
);
var DB_LIST_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    docs: create_15(
      create({
        id: create_2(),
        data: create_20(create_2(), create_12()),
        version: create_3().int().optional(),
        updatedAt: create_2().optional(),
      }),
    ),
    nextCursor: create_2().optional(),
    authoredByOthers: optionalTrueSchema(),
    outside_writer: optionalBooleanSchema(),
  }),
);
var DB_USAGE_SCHEMA = DoctorLazy(() =>
  create({
    documents: create_3().int().safe().nonnegative(),
    maxDocuments: create_3().int().safe().positive(),
  })
    .optional()
    .catch(undefined),
);
//@ chunk-0zqb2m0b.js:5030-5151 placement
function checkWriteUsageShape(e, usage) {
  if (usage === undefined && typeof e === "object" && e !== null && e.usage !== undefined)
    logFeatureSad("artifact_db_write", "malformed_usage");
}
//@ chunk-0zqb2m0b.js:5151-5167 placement
var RETRY_ATTEMPTS = 4;
var RETRY_BASE_MS = 600;
//@ chunk-0zqb2m0b.js:5167-5394 placement
function getResponseWarnings(e) {
  let warnings = e !== null && typeof e === "object" ? e.warnings : undefined;
  if (!Array.isArray(warnings)) return [];
  let r = [];
  for (let warning of warnings) {
    if (r.length >= RETRY_ATTEMPTS) break;
    if (typeof warning !== "string") continue;
    let s = sanitizeDisplayTextOrUndefined(warning, RETRY_BASE_MS);
    if (s !== undefined) r.push(s);
  }
  return r;
}
//@ chunk-0zqb2m0b.js:5394-5639 placement
var DB_WRITE_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    version: create_3().int().optional(),
    usage: DB_USAGE_SCHEMA(),
  }),
);
var DB_BATCH_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    results: create_15(
      create({
        version: create_3().int().optional(),
      }),
    ),
    usage: DB_USAGE_SCHEMA(),
  }),
);
var DB_INVALID_ARGUMENT_SCHEMA = DoctorLazy(() =>
  create({
    error: create({
      code: create_25("invalid_argument"),
      message: create_25("invalid argument"),
      verb: create_9().optional(),
    }),
  }),
);
//@ chunk-0zqb2m0b.js:5639-5697 placement
function isInvalidArgumentBody(status, t) {
  return status === 400 && DB_INVALID_ARGUMENT_SCHEMA().safeParse(t).success;
}
//@ chunk-0zqb2m0b.js:5697-5802 placement
class RefusalCooldown {
  refusedAt = undefined;
  get unsupported() {
    return this.refusedAt !== undefined && Date.now() - this.refusedAt < ME_ID_TTL_MS;
  }
}
//@ chunk-0zqb2m0b.js:5802-5878 placement
/**
 * 导出函数 `ME_ID_TTL_MS`。
 */
var ME_ID_TTL_MS = 3600000;
var meIdCooldown = new HostScoped(() => new RefusalCooldown());
var meAliasCooldown = new HostScoped(() => new RefusalCooldown());
var meRawCooldown = new HostScoped(() => new RefusalCooldown());
//@ chunk-0zqb2m0b.js:5878-5971 placement
function isBadJsonInvalidArgument(status, t) {
  if (!isInvalidArgumentBody(status, t)) return false;
  let { reason } = t.error;
  return reason === undefined || reason === "bad_json";
}
//@ chunk-0zqb2m0b.js:5971-6248 placement
/**
 * 数据库错误响应体 schema（code/reason/kind/limit/version/index/required）与配额原因集合。
 */
var DbErrorBodySchema = DoctorLazy(() =>
  create({
    error: create({
      code: create_2().optional(),
      reason: create_12().optional(),
      kind: create_12().optional(),
      limit: create_12().optional(),
      version: create_12().optional(),
      index: create_12().optional(),
      required: create_12().optional(),
    }).optional(),
  }),
);
var QUOTA_REASONS = new Set(["docs_per_collection", "docs_per_database", "databases_per_org"]);
//@ chunk-0zqb2m0b.js:6248-6281 placement
/**
 * 导出函数 `isQuotaReason`：参数 e，返回 ve.has(e)。
 */
function isQuotaReason(e) {
  return QUOTA_REASONS.has(e);
}
//@ chunk-0zqb2m0b.js:6281-6448 placement
var QUOTA_REASONS_BY_CODE = {
  quota_exceeded: new Set([...QUOTA_REASONS, "bytes_per_database"]),
  quota_or_rate: new Set([
    "active_leases",
    "rate_limited",
    "write_capacity",
    "scan_budget",
    "response_budget",
  ]),
};
//@ chunk-0zqb2m0b.js:6448-6505 placement
function hasQuotaReasonForCode(e, kind) {
  let r = QUOTA_REASONS_BY_CODE[e];
  return r !== undefined && r.has(kind);
}
//@ chunk-0zqb2m0b.js:6505-6586 placement
function positiveIntOrUndefined(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e > 0 ? e : undefined;
}
//@ chunk-0zqb2m0b.js:6586-6668 placement
function nonNegativeIntOrUndefined(index) {
  return typeof index === "number" && Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}
//@ chunk-0zqb2m0b.js:6668-6698 placement
var SAFE_COLLECTION_NAME_RE = /^[a-z][a-z_-]{0,63}$/;
//@ chunk-0zqb2m0b.js:6698-7266 placement
function checkVersionPrecondition(status, t) {
  let r = classifyCredential403(status, t);
  if (r !== undefined) return r;
  let c = DbErrorBodySchema().safeParse(t);
  let error = c.success ? c.data.error : undefined;
  let code = error?.code;
  let o = code !== undefined ? DB_ERROR_CODES.get(code) : undefined;
  if (code !== undefined && o !== undefined) {
    let kind = error?.kind;
    if (hasQuotaReasonForCode(o, kind))
      return {
        code: o,
        reason: kind,
        kind,
        limit: positiveIntOrUndefined(error?.limit),
      };
    let h = o === "version_mismatch" && error?.required === true;
    let reason =
      typeof error?.reason === "string" && SAFE_COLLECTION_NAME_RE.test(error.reason)
        ? error.reason
        : undefined;
    return {
      code: o,
      reason: h ? "version_required" : code.replace(/-/g, "_"),
      ...(isEditErrorCode(o) && {
        version: positiveIntOrUndefined(error?.version),
        index: nonNegativeIntOrUndefined(error?.index),
        ...(h && {
          required: true,
        }),
      }),
      ...(reason !== undefined && {
        serverReason: reason,
      }),
    };
  }
  let n = classifyDbHttpStatus(status);
  return {
    code: n,
    reason: n,
  };
}
//@ chunk-0zqb2m0b.js:7266-7577 placement
/**
 * 版本冲突错误的提示前缀与写入/删除时“需先读最新版本”的文案。
 */
var VERSION_MISMATCH_PREFIXES = [
  `db write failed (${toPublicDbErrorCode("version_mismatch")}): `,
  `db batch write failed (${toPublicDbErrorCode("version_mismatch")}): `,
];
var VERSION_MISMATCH_TEXTS = {
  write: "Not saved: Claude needs to read the latest version of this document before changing it.",
  delete: "Not deleted: Claude needs to read the latest version of this document before deleting it.",
};
//@ chunk-0zqb2m0b.js:7577-12816 placement
/**
 * 生成文档写入错误说明（字段、版本冲突、编辑未匹配/不唯一等，约 5 KB）。
 */
function formatDbWriteError(e, t, kind, limit, s, l, serverReason) {
  let n = `field '${s ?? "?"}'`;
  let d = l?.current !== undefined ? ` The document is at version ${l.current}.` : "";
  let h = l?.pinned !== undefined && l.current === l.pinned;
  let u = `db ${t} failed (${toPublicDbErrorCode(e)})`;
  switch (e) {
    case "not_found":
      return `${u}: no such artifact, collection, or document (or no access \u2014 the two are deliberately indistinguishable)`;
    case "invalid_argument":
      return `${u}: the server could not accept the request as shaped${serverReason !== undefined ? ` (reason: ${serverReason})` : ""}`;
    case "too_large":
      return `${u}: the request body exceeds the server's size limit \u2014 send less per call`;
    case "quota_or_rate":
      return `${u}: ${formatDbLimitError(kind, limit) ?? "over a rate or storage limit \u2014 retry later or write less"}`;
    case "quota_exceeded":
      return `${u}: ${formatDbLimitError(kind, limit) ?? "a storage limit on this artifact's database has been reached \u2014 delete documents; retrying won't help"}`;
    case "busy":
      return `${u}: lost to a concurrent change \u2014 re-read and retry deliberately`;
    case "upstream_auth":
      return `${u}: could not authenticate \u2014 the session's credential may need a refresh; try again`;
    case "store_unavailable":
      return `${u}: the store is unavailable right now \u2014 try again`;
    case "not_declared":
      return `${u}: this artifact's current published version does not declare the database capability \u2014 republish it with the db capability declared, then retry`;
    case "credential_rejected":
      return `${u}: the server refused this session's credential at the artifact-db door \u2014 not an artifact-access or existence answer; report this as a client/server integration fault`;
    case "cloud_unavailable":
      return `${u}: reading and editing artifact data isn't available in this cloud session right now; this says nothing about the artifact or its data, and if the user has access, Claude Code on their own machine can still read and edit it`;
    case "network_off":
      return t === "read"
        ? `${u}: this cloud session's network access is turned off (or could not be confirmed), so it cannot read artifact data${relayIsOnlyRoute() ? "" : " \u2014 writes still work"}; do not retry the read here`
        : `${u}: this cloud session's network access is turned off (or could not be confirmed), and the gateway did not accept this call as a write it allows \u2014 do not retry it here`;
    case "edit_no_match":
      return h
        ? `${u}: old_str does not occur in ${n} of that document, so nothing was written by this call. The document is still at version ${l?.current}, the one this edit was pinned to, so nothing changed under you: old_str itself does not match the stored text \u2014 copy it exactly as it appears in the field's value (the decoded string, not JSON-escaped source)`
        : `${u}: old_str does not occur in ${n} of that document, so nothing was written by this call.${d} Copy the text exactly as it appears in the field's value (the decoded string, not JSON-escaped source). If you were retrying after a call whose outcome you did not see, that earlier call may already have applied \u2014 read the document back before trying again. If someone else changed that text, re-read and re-plan the edit`;
    case "edit_ambiguous":
      return `${u}: old_str occurs more than once in ${n} of that document; nothing was written.${d} Include more surrounding text so it is unique, or pass replace_all to change every occurrence`;
    case "edit_field_missing":
      return `${u}: the document has no top-level ${n}; nothing was written.${d} str_replace edits an existing top-level string field \u2014 read the document to see its fields, or use update to add one`;
    case "edit_field_not_string":
      return `${u}: ${n} is not a string (str_replace edits top-level string fields only); nothing was written \u2014 use update for structured fields.${d}`;
    case "version_mismatch":
      if (l?.required === true) {
        let path = l.path ?? "that document";
        let k =
          "Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns";
        switch (l.op) {
          case "delete":
            return `${u}: ${path} is an existing document and this delete carried no if_version \u2014 nothing was deleted. Read it back and, if it should still be deleted, resend the delete with if_version set to the version that read returns`;
          case "update":
            return `${u}: ${path} is an existing document and this update carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
          default:
            return `${u}: ${path} already exists and this write carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
        }
      }
      return l?.current !== undefined
        ? `${u}: the document is no longer at version ${l.pinned ?? "?"}, the one this write was pinned to \u2014 it is now at version ${l.current}; nothing was written. Read it back, re-plan the write against what it holds now, and pin to that version`
        : `${u}: the document is no longer at version ${l?.pinned ?? "?"}, the one this write was pinned to \u2014 it has changed or may have been deleted; nothing was written. Read it back: if it still exists, re-plan the write against what it holds now and pin to its version; if it is gone, ${l?.op === "delete" ? "a delete has nothing left to do" : 're-create it with a "set" and no if_version only if it should exist again'}`;
  }
}
//@ chunk-0zqb2m0b.js:12816-14127 placement
function formatDbLimitError(e, t) {
  let r = t === undefined ? "document limit" : `limit of ${t} documents`;
  let c = t === undefined ? "storage limit" : `storage limit of ${formatBytesDecimal(t)}`;
  switch (e) {
    case "docs_per_collection":
      return `this collection has reached its ${r} \u2014 delete documents; retrying won't help`;
    case "docs_per_database":
      return `this artifact's database has reached its ${r} \u2014 delete documents before adding more; retrying won't help`;
    case "bytes_per_database":
      return `this artifact's database has reached its ${c} (the total size of its documents, not their count) \u2014 delete documents or make them smaller; a write that makes an existing document larger can be refused too, and retrying won't help`;
    case "databases_per_org":
      return "this organization has reached its limit on artifact databases; retrying won't help";
    case "active_leases":
      return "this database has too many active leases \u2014 retry after some expire or are released";
    case "rate_limited":
      return "rate-limited \u2014 retry shortly";
    case "write_capacity":
      return "too many concurrent writes to this database \u2014 retry shortly";
    case "scan_budget":
      return "the query scans too many documents \u2014 narrow the query or add filters; retrying won't help";
    case "response_budget":
      return "the query's result is too large \u2014 request fewer documents; retrying won't help";
    case undefined:
      return;
  }
}
//@ chunk-0zqb2m0b.js:14127-14192 placement
/**
 * 数据库读取自身身份（data/users/me、whoami）的路径常量与 schema。
 */
var DATA_USERS_ME = "data/users/me";
var WHOAMI_PATH = "whoami";
var whoAmIResponseSchema = DoctorLazy(() =>
  create({
    id: create_2().min(1),
  }),
);
//@ chunk-0zqb2m0b.js:14192-14227 placement
function meKey(accountUuid, t) {
  return `${accountUuid}:${t}`;
}
//@ chunk-0zqb2m0b.js:14227-14280 placement
function isDbViaRelay() {
  return plannedRoute("POST", ARTIFACT_DB_API_PATH, "bound") === "relay";
}
//@ chunk-0zqb2m0b.js:14280-14378 placement
async function meKeyFromGateway(e, t) {
  if (isDbViaRelay()) return null;
  let accountUuid = (await getGatewayAccountInfoAsync(t))?.accountUuid;
  return accountUuid ? meKey(accountUuid, e) : null;
}
//@ chunk-0zqb2m0b.js:14378-14477 placement
async function isSameAccountUuid(e, t, r) {
  let freshOauthAccountFromDisk = await readFreshOauthAccountFromDisk(r);
  return (
    freshOauthAccountFromDisk?.accountUuid !== undefined &&
    meKey(freshOauthAccountFromDisk.accountUuid, e) === t
  );
}
//@ chunk-0zqb2m0b.js:14477-14554 placement
function currentAuthorizationHash() {
  let Authorization = getAuthHeaders().headers.Authorization;
  return Authorization === undefined ? null : hashCredential(Authorization);
}
//@ chunk-0zqb2m0b.js:14554-14650 placement
async function refreshOAuthTwice(credentials) {
  if (!hasApiClient()) return;
  for (let k = 0; k < 2; k++)
    try {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
      });
    } catch {}
}
//@ chunk-0zqb2m0b.js:14650-14732 placement
/**
 * 导出函数 `clearMeIdCache`：参数 e。
 */
function clearMeIdCache(host) {
  let { resolvedMeIds, inFlightMeIds } = meIdCache.of(host);
  resolvedMeIds.clear();
  inFlightMeIds.clear();
}
//@ chunk-0zqb2m0b.js:14732-14859 placement
function makeUsersMeRewriter(collection, docId) {
  if (collection === DATA_USERS_ME || collection.startsWith(DATA_USERS_ME + "/"))
    return (r) => ({
      collection: "data/users/" + r + collection.slice(DATA_USERS_ME.length),
      docId,
    });
  return null;
}
//@ chunk-0zqb2m0b.js:14859-14892 placement
var CONTESTED_ME_KEY = Symbol("contested-me-key");
//@ chunk-0zqb2m0b.js:14892-14945 placement
class MeIdCache {
  resolvedMeIds = new Map();
  inFlightMeIds = new Map();
}
//@ chunk-0zqb2m0b.js:14945-14970 placement
var meIdCache = new HostScoped(() => new MeIdCache());
//@ chunk-0zqb2m0b.js:14970-15406 placement
function resolveWhoamiKey(e, t, r, kind, limit) {
  if (t === "malformed_whoami_echo")
    return `db ${r} failed (unavailable): resolving 'me' returned an unreadable response \u2014 the artifact db service may need an update`;
  if (e === "not_declared")
    return `db ${r} failed (${toPublicDbErrorCode(e)}): resolving 'me' needs this artifact's published version to declare the db and user capabilities \u2014 republish with both declared, then retry`;
  return (
    formatDbWriteError(e, r, kind, limit) +
    (r === "write" && NO_RETRY_WRITE_CODES.has(e) ? NOTHING_WRITTEN_SUFFIX : "")
  );
}
//@ chunk-0zqb2m0b.js:15406-15518 placement
var NOTHING_WRITTEN_SUFFIX = "; nothing was written";
var NO_RETRY_WRITE_CODES = new Set(["too_large", "credential_rejected", "cloud_unavailable", "network_off"]);
//@ chunk-0zqb2m0b.js:15518-16377 placement
async function composeMeKey(e, t, slug, c, s, credentials) {
  let o = meIdCache.of(e);
  let { resolvedMeIds, inFlightMeIds } = o;
  let h = await meKeyFromGateway(slug, credentials);
  let u = null;
  if (h !== null && (resolvedMeIds.has(h) || inFlightMeIds.has(h))) {
    if (await isSameAccountUuid(slug, h, s)) {
      if (resolvedMeIds.has(h)) await refreshOAuthTwice(credentials);
      u = h;
    }
  }
  let R = u === null ? undefined : resolvedMeIds.get(u);
  if (u !== null && R !== undefined && !isDbViaRelay()) {
    if (R.fingerprint === currentAuthorizationHash())
      return {
        ok: true,
        id: R.id,
      };
    if (resolvedMeIds.get(u) === R) resolvedMeIds.delete(u);
  }
  let k;
  if (h === null) k = await describeWhoamiFailure(o, t, slug, c, h, s, credentials);
  else {
    let a = u === null ? undefined : inFlightMeIds.get(u);
    if (!a) {
      a = (async () => {
        if (!(await isSameAccountUuid(slug, h, s))) {
          logFeatureSad(t, "contested_me_key");
          return CONTESTED_ME_KEY;
        }
        return describeWhoamiFailure(o, t, slug, c, h, s, credentials);
      })();
      inFlightMeIds.set(h, a);
      a.finally(() => {
        if (inFlightMeIds.get(h) === a) inFlightMeIds.delete(h);
      }).catch(() => {});
    }
    let w = await a;
    k = w === CONTESTED_ME_KEY ? await describeWhoamiFailure(o, t, slug, c, null, s, credentials) : w;
  }
  if (k.ok) return k;
  if ("composed" in k)
    return {
      ok: false,
      result: k.composed,
    };
  let y = t === "artifact_db_read" ? "read" : "write";
  logFeatureBad(t, k.reason);
  return {
    ok: false,
    result: {
      kind: "error",
      code: k.code,
      message: resolveWhoamiKey(k.code, k.reason, y, k.kind, k.limit),
      reason: k.reason,
    },
  };
}
//@ chunk-0zqb2m0b.js:16377-17097 placement
async function describeWhoamiFailure(e, t, r, c, s, l, credentials) {
  let n = null;
  if (s !== null) {
    await refreshOAuthTwice(credentials);
    n = currentAuthorizationHash();
    if (n === null || isDbViaRelay()) return CONTESTED_ME_KEY;
  }
  let d = await callArtifactDb(
    t,
    r,
    WHOAMI_PATH,
    {},
    {
      timeout: 15000,
      maxContentLength: STALE_PIN_NOTICE_CHARS,
      credentials,
      reportSentAuth: s !== null,
    },
    c,
  );
  if (!d.ok)
    return {
      ok: false,
      composed: d.result,
    };
  if (d.status !== 200) {
    let { code, reason, kind, limit } = checkVersionPrecondition(d.status, d.data);
    return {
      ok: false,
      code,
      reason: `whoami_${reason}`,
      kind,
      limit,
    };
  }
  let h = whoAmIResponseSchema().safeParse(d.data);
  if (!h.success || !regExp.test(h.data.id))
    return {
      ok: false,
      code: "store_unavailable",
      reason: "malformed_whoami_echo",
    };
  if (s !== null) {
    if (
      n === null ||
      n !== d.sentAuthFingerprint ||
      n !== currentAuthorizationHash() ||
      !(await isSameAccountUuid(r, s, l))
    ) {
      logFeatureSad(t, "auth_unstable_me_key");
      return CONTESTED_ME_KEY;
    }
    if (isDbViaRelay()) return CONTESTED_ME_KEY;
    e.resolvedMeIds.set(s, {
      id: h.data.id,
      fingerprint: n,
    });
  }
  return {
    ok: true,
    id: h.data.id,
  };
}
//@ chunk-0zqb2m0b.js:17097-21118 placement
/**
 * 调用 Artifact DB 接口（读/写/批量），处理中继、作用域、错误分类（约 4 KB）。
 */
async function callArtifactDb(e, slug, r, args, s, l) {
  let o = r === "batch" ? "batch_" : "";
  let n = r === WHOAMI_PATH;
  let d = e === "artifact_db_read" ? "read" : "write";
  let h = s.requestId !== undefined ? meRawCooldown.of(s.requestId.host) : undefined;
  let u = {
    slug,
    verb: r,
    args,
    ...(s.asLevel !== undefined && {
      asLevel: s.asLevel,
    }),
    ...(s.requireVersion === true && {
      requireVersion: true,
    }),
    ...(e === "artifact_db_write" && !n && getSessionHintHeaders()),
    ...(e === "artifact_db_write" &&
      !n &&
      s.requestId !== undefined &&
      h !== undefined &&
      !h.unsupported &&
      requestIdMeta(s.requestId.id)),
  };
  let R = () =>
    frameApi.postRelayBound(ARTIFACT_DB_API_PATH, u, {
      refreshOAuth: true,
      credentials: s.credentials,
      headers: buildFrameHeaders(),
      timeout: s.timeout,
      maxContentLength: s.maxContentLength,
      signal: l,
      reportSentAuth: s.reportSentAuth,
    });
  let k = false;
  let y = async () => {
    let w = await R();
    if (w.ok && w.gatewayRetryAfterMs !== undefined && !k) {
      k = true;
      await sleep(Math.min(w.gatewayRetryAfterMs, DB_REQUEST_TIMEOUT_MS), l, {
        abortError: () => new DbAbortError(),
      });
      w = await R();
      if (w.ok && w.route === "relay" && w.fromFrame)
        logFeatureSad(e, `${o}${n ? "whoami_" : ""}relay_busy_recovered`);
    }
    return w;
  };
  let a;
  try {
    a = await y();
    let w = a.ok && a.fromFrame ? findRejectedHintFields(a.status, a.data, u) : [];
    if (w.length > 0) {
      if (w.includes("request_id") && h !== undefined) {
        logFeatureSad(e, `${o}request_id_rejected`);
        h.refusedAt = Date.now();
      }
      if (mentionsSessionHintField(w)) {
        logFeatureSad(e, `${o}session_hints_rejected`);
        noteSessionHintsRefused();
      }
      u = Uo(u, mentionsSessionHintField(w) ? SESSION_HINT_FIELDS : w);
      a = await y();
    }
    if (
      h !== undefined &&
      u.request_id !== undefined &&
      a.ok &&
      a.fromFrame &&
      isBadJsonInvalidArgument(a.status, a.data)
    ) {
      let { request_id: requestId, ...S } = u;
      u = S;
      a = await y();
      if (a.ok && a.fromFrame && a.status >= 200 && a.status < 300) {
        h.refusedAt = Date.now();
        logFeatureSad(e, `${o}request_id_unsupported`);
      }
    }
  } catch (error) {
    if (isCancel(error) || error instanceof DbAbortError) throw error;
    let D = e !== "artifact_db_read" && !n && threwOnRelayLeg(error);
    logFeatureBad(e, `${o}${D ? "relay_request_error" : "request_error"}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: D
          ? "db write outcome unknown (relay request failed) \u2014 it may have applied; read back before retrying"
          : `db ${d} failed (network error)`,
        reason: D ? "relay_request_error" : "request_error",
      },
    };
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable" || a.reason === "relay-not-served") {
      let w = `${n ? "whoami_" : ""}${a.reason.replace(/-/g, "_")}`;
      logFeatureBad(e, `${o}${w}`, {
        status: a.status,
      });
      return {
        ok: false,
        result: {
          kind: "error",
          code: "store_unavailable",
          message: `db ${d} failed (${toPublicDbErrorCode("store_unavailable")}): ${n ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection did not carry the request${a.status ? ` (HTTP ${a.status})` : ""}, so nothing ran; this says nothing about the artifact or its data, and if the user has access, Claude Code on their own machine can still read and edit it${d === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`,
          reason: w,
        },
      };
    }
    logFeatureBad(e, `${o}${a.reason.replace(/-/g, "_")}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message:
          a.reason === "no-auth" ? describeArtifactAuthFailure(a.detail) : `db ${d} unavailable: ${a.reason}`,
        reason: "transport",
      },
    };
  }
  if (a.gatewayPolicy === "network-off") {
    let w = n ? "whoami_network_off" : "network_off";
    logFeatureSad(e, `${o}${w}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "network_off",
        message: n
          ? resolveWhoamiKey("network_off", w, d)
          : formatDbWriteError("network_off", d) + (d === "write" ? NOTHING_WRITTEN_SUFFIX : ""),
        reason: w,
      },
    };
  }
  if (a.gatewayRetryAfterMs !== undefined) {
    let w = `${n ? "whoami_" : ""}relay_busy_retried`;
    let D = r === STR_REPLACE;
    logFeatureBad(e, `${o}${w}`, {
      status: a.status,
    });
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: `db ${d} failed (${toPublicDbErrorCode("store_unavailable")}): ${n ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection was temporarily unavailable (HTTP ${a.status}, after one retry); ${D ? "the edit may or may not have applied \u2014 read it back before retrying" : `this is transient and nothing ran \u2014 retry shortly${d === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`}`,
        reason: w,
      },
    };
  }
  if (!a.fromFrame) {
    logFeatureBad(e, `${o}${n ? "whoami_relay_error" : "relay_error"}`, {
      status: a.status,
    });
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: n
          ? `db ${d} failed: resolving 'me' failed (relay HTTP ${a.status}) \u2014 try again`
          : e === "artifact_db_read"
            ? `db read failed (relay HTTP ${a.status}) \u2014 try again`
            : `db write outcome unknown (relay HTTP ${a.status}) \u2014 it may have applied; read back before retrying`,
        reason: n ? "whoami_relay_error" : "relay_error",
      },
    };
  }
  return {
    ok: true,
    status: a.status,
    data: a.data,
    sentAuthFingerprint: a.sentAuthFingerprint,
    ...(a.route === "relay" &&
      a.response.headers?.[X_FRAME_RELAY_READ_SCOPE_APPLIED] === "session" && {
        sessionScoped: true,
      }),
    ...(s.asLevel !== undefined && {
      levelConfirmed: getAsLevel(a.data) === s.asLevel,
    }),
  };
}
//@ chunk-0zqb2m0b.js:21118-21464 placement
/**
 * 关闭云端网络访问时数据库读取失败的说明文案（只能读自己发布的 artifact）与读取范围头。
 */
var X_FRAME_RELAY_READ_SCOPE_APPLIED = "x-frame-relay-read-scope-applied";
var READ_SCOPE_NOT_FOUND_TEXT = `db read failed (${toPublicDbErrorCode("not_found")}): nothing this session can read at that address \u2014 with the organization's cloud network access turned off, this session can read the data only of artifacts it published itself (or there is no such artifact, collection, or document); do not retry the read here`;
//@ chunk-0zqb2m0b.js:21464-21711 placement
function getAsLevel(e) {
  if (e === null || typeof e !== "object") return;
  let t = Reflect.get(e, "asLevel");
  if (typeof t === "string") return t;
  let r = Reflect.get(e, "error");
  let c = r !== null && typeof r === "object" ? Reflect.get(r, "asLevel") : undefined;
  return typeof c === "string" ? c : undefined;
}
//@ chunk-0zqb2m0b.js:21711-25152 placement
/**
 * 执行 read_db 动作：get/list/query 文档。
 */
async function readArtifactDb(host, t, r, storageV5, credentials) {
  let { slug, op, query } = t;
  let { collection, docId } = t;
  if (!ARTIFACT_SLUG_RE.test(slug)) {
    logFeatureBad("artifact_db_read", "invalid_slug");
    return {
      kind: "error",
      code: "invalid_argument",
      message: "not a valid artifact id",
      reason: "invalid_slug",
    };
  }
  if (!regExp_2.test(collection) || (docId !== undefined && !regExp.test(docId))) {
    logFeatureBad("artifact_db_read", "invalid_segment");
    return {
      kind: "error",
      code: "invalid_argument",
      message:
        'collection must be a path of 1-15 "/"-separated segments and doc_id one segment (letters, digits, _ - . ~ : @ + per segment; "." and ".." reserved)',
      reason: "invalid_segment",
    };
  }
  if (!isCollectionPath(collection)) {
    logFeatureBad("artifact_db_read", "parity");
    return {
      kind: "error",
      code: "invalid_argument",
      message: describeCollectionPathError(collection),
      reason: "parity",
    };
  }
  if (op === "get" && docId === undefined) {
    logFeatureBad("artifact_db_read", "missing_doc_id");
    return {
      kind: "error",
      code: "invalid_argument",
      message: "doc_id is required for a get",
      reason: "missing_doc_id",
    };
  }
  let usersMeRewriter = makeUsersMeRewriter(collection, docId);
  let R;
  if (usersMeRewriter !== null) {
    let b = await composeMeKey(host, "artifact_db_read", slug, r, storageV5, credentials);
    if (!b.ok) return b.result;
    R = b.id;
    ({ collection, docId } = usersMeRewriter(b.id));
  }
  let k = docId !== undefined ? `${collection}/${docId}` : collection;
  if (k.length > DB_LIST_LIMIT) {
    logFeatureBad("artifact_db_read", "path_too_long");
    return {
      kind: "error",
      code: "invalid_argument",
      message: `the composed document path is ${k.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
      reason: "path_too_long",
    };
  }
  let y =
    op === "get"
      ? {
          path: k,
        }
      : {
          collection,
          ...(query?.limit !== undefined && {
            limit: query.limit,
          }),
          ...(query?.cursor !== undefined && {
            cursor: query.cursor,
          }),
          ...(op === "query" &&
            query?.where !== undefined && {
              where: query.where.map(([b, E, B]) => ({
                field: b,
                op: toDbOperator(E),
                value: B,
              })),
            }),
          ...(op === "query" &&
            query?.order_by !== undefined && {
              orderBy: {
                field: query.order_by.field,
                ...(query.order_by.direction !== undefined && {
                  direction: query.order_by.direction,
                }),
              },
            }),
        };
  let a = await callArtifactDb(
    "artifact_db_read",
    slug,
    op,
    y,
    {
      timeout: 15000,
      maxContentLength: MAX_DB_BODY_BYTES,
      credentials,
      ...(t.asLevel !== undefined && {
        asLevel: t.asLevel,
      }),
    },
    r,
  );
  if (!a.ok) return a.result;
  if (a.status === 200) {
    if (op === "get") {
      let E = DB_GET_RESPONSE_SCHEMA().safeParse(a.data);
      if (!E.success) {
        logFeatureBad("artifact_db_read", "malformed_echo");
        return {
          kind: "error",
          code: "store_unavailable",
          message: "db read returned an unreadable response \u2014 try again",
          reason: "malformed_echo",
        };
      }
      let B = {
        ...(a.levelConfirmed !== undefined && {
          levelConfirmed: a.levelConfirmed,
        }),
        ...(R !== undefined && {
          meId: R,
        }),
      };
      if (!E.data.exists) {
        logFeatureSad("artifact_db_read", "not_found");
        return {
          kind: "not_found",
          ...B,
        };
      }
      logFeatureOk("artifact_db_read");
      return {
        kind: "ok",
        ...B,
        docs: [
          {
            id: docId ?? "",
            data: E.data.data ?? {},
            ...(E.data.version !== undefined && {
              version: E.data.version,
            }),
            ...(E.data.updatedAt !== undefined && {
              updatedAt: E.data.updatedAt,
            }),
          },
        ],
        ...(E.data.version !== undefined && {
          version: E.data.version,
        }),
        ...(E.data.authoredByOthers && {
          authoredByOthers: true,
        }),
        ...(E.data.outside_writer !== undefined && {
          outsideWriter: E.data.outside_writer,
        }),
      };
    }
    let b = DB_LIST_RESPONSE_SCHEMA().safeParse(a.data);
    if (!b.success) {
      logFeatureBad("artifact_db_read", "malformed_echo");
      return {
        kind: "error",
        code: "store_unavailable",
        message: "db read returned an unreadable response \u2014 try again",
        reason: "malformed_echo",
      };
    }
    logFeatureOk("artifact_db_read");
    return {
      kind: "ok",
      ...(a.levelConfirmed !== undefined && {
        levelConfirmed: a.levelConfirmed,
      }),
      ...(R !== undefined && {
        meId: R,
      }),
      docs: b.data.docs,
      ...(b.data.nextCursor !== undefined &&
        b.data.nextCursor !== "" && {
          nextCursor: b.data.nextCursor,
        }),
      ...(b.data.authoredByOthers && {
        authoredByOthers: true,
      }),
      ...(b.data.outside_writer !== undefined && {
        outsideWriter: b.data.outside_writer,
      }),
    };
  }
  let { code, reason, kind, limit, serverReason } = checkVersionPrecondition(a.status, a.data);
  let A = code === "not_found" && a.sessionScoped === true;
  logFeatureBad("artifact_db_read", A ? "not_found_session_scoped" : reason);
  return {
    kind: "error",
    code,
    ...(a.levelConfirmed !== undefined && {
      levelConfirmed: a.levelConfirmed,
    }),
    message: A
      ? READ_SCOPE_NOT_FOUND_TEXT
      : formatDbWriteError(code, "read", kind, limit, undefined, undefined, serverReason),
    reason: A ? "not_found_session_scoped" : reason,
  };
}
//@ chunk-0zqb2m0b.js:25152-25272 placement
function invalidDbWrite(e, message, r = "") {
  logFeatureBad("artifact_db_write", `${r}${e}`);
  return {
    kind: "error",
    code: "invalid_argument",
    message,
    reason: e,
  };
}
//@ chunk-0zqb2m0b.js:25272-25869 placement
async function validateCollectionPath(e, t, r = "") {
  let { collection, docId } = e;
  if (!regExp_2.test(collection) || !regExp.test(docId))
    return {
      ok: false,
      result: invalidDbWrite(
        "invalid_segment",
        'collection must be a path of 1-15 "/"-separated segments and doc_id one segment (letters, digits, _ - . ~ : @ + per segment; "." and ".." reserved)',
        r,
      ),
    };
  if (!isCollectionPath(collection))
    return {
      ok: false,
      result: invalidDbWrite("parity", describeCollectionPathError(collection), r),
    };
  let usersMeRewriter = makeUsersMeRewriter(collection, docId);
  if (usersMeRewriter !== null) {
    let n = await t();
    if (!n.ok) return n;
    ({ collection, docId } = usersMeRewriter(n.id));
  }
  let o = `${collection}/${docId}`;
  if (o.length > DB_LIST_LIMIT)
    return {
      ok: false,
      result: invalidDbWrite(
        "path_too_long",
        `the composed document path is ${o.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
        r,
      ),
    };
  return {
    ok: true,
    path: o,
  };
}
//@ chunk-0zqb2m0b.js:25869-26198 placement
/**
 * 把一次写操作（delete/set/update/str_replace）转成请求体：路径、数据、replace 标志、str_replace 字段与 idem，可带 ifVersion 乐观锁。
 */
function buildDbWriteOp(e, path, data, c, s) {
  let l = s !== undefined && {
    ifVersion: s,
  };
  switch (e) {
    case "delete":
      return {
        path,
        ...l,
      };
    case "set":
      return {
        path,
        data,
        replace: true,
        ...l,
      };
    case "update":
      return {
        path,
        data,
        ...l,
      };
    case "str_replace":
      return {
        path,
        field: c?.field,
        old_str: c?.oldStr,
        new_str: c?.newStr,
        ...(c?.replaceAll === true && {
          replace_all: true,
        }),
        idem: c?.idem,
        ...l,
      };
  }
}
//@ chunk-0zqb2m0b.js:26198-26606 placement
async function validateWriteRequest(host, t, signal, storageV5, credentials) {
  let { slug, op, data: n, edit } = t;
  if (!ARTIFACT_SLUG_RE.test(slug)) return invalidDbWrite("invalid_slug", "not a valid artifact id");
  let h = await validateCollectionPath(t, () =>
    composeMeKey(host, "artifact_db_write", slug, signal, storageV5, credentials),
  );
  if (!h.ok) return h.result;
  return writeArtifactDocument(
    slug,
    op,
    h.path,
    n,
    signal,
    credentials,
    t.asLevel,
    edit,
    t.ifVersion,
    t.requireVersion === true && op !== "str_replace"
      ? {
          host,
          address: `${t.collection}/${t.docId}`,
        }
      : undefined,
    t.requestId !== undefined
      ? {
          host,
          id: t.requestId,
        }
      : undefined,
  );
}
//@ chunk-0zqb2m0b.js:26606-28145 placement
/**
 * 写单个文档（set/update/delete/str_replace），支持版本要求。
 */
async function writeArtifactDocument(e, t, path, c, s, l, o, n, d, h, u) {
  let R = h !== undefined ? meAliasCooldown.of(h.host) : undefined;
  let k = R !== undefined && !R.unsupported;
  let y = await callArtifactDb(
    "artifact_db_write",
    e,
    t,
    buildDbWriteOp(t, path, c, n, d),
    {
      timeout: 30000,
      ...(o !== undefined && {
        asLevel: o,
      }),
      ...(k && {
        requireVersion: true,
      }),
      ...(u !== undefined && {
        requestId: u,
      }),
      maxContentLength: STALE_PIN_NOTICE_CHARS,
      credentials: l,
    },
    s,
  );
  if (!y.ok) return y.result;
  if (k && R !== undefined && isInvalidArgumentBody(y.status, y.data)) {
    let b = await writeArtifactDocument(e, t, path, c, s, l, o, n, d, undefined, u);
    if (isRetryableDbResult(b)) {
      R.refusedAt = Date.now();
      logFeatureSad("artifact_db_write", "require_version_unsupported");
    }
    return b;
  }
  if (y.status === 200) {
    let b = y.levelConfirmed !== undefined && {
      levelConfirmed: y.levelConfirmed,
    };
    let E = DB_WRITE_RESPONSE_SCHEMA().safeParse(y.data);
    if (!E.success) {
      logFeatureSad("artifact_db_write", "malformed_echo");
      return {
        kind: "ok",
        ...b,
      };
    }
    logFeatureOk("artifact_db_write");
    checkWriteUsageShape(y.data, E.data.usage);
    let responseWarnings = getResponseWarnings(y.data);
    return {
      kind: "ok",
      ...b,
      ...(E.data.version !== undefined && {
        version: E.data.version,
      }),
      ...(E.data.usage !== undefined && {
        usage: E.data.usage,
      }),
      ...(responseWarnings.length > 0 && {
        warnings: responseWarnings,
      }),
    };
  }
  let { code, reason, kind, limit, version, required, serverReason } = checkVersionPrecondition(
    y.status,
    y.data,
  );
  (isEditErrorCode(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", reason);
  return {
    kind: "error",
    code,
    ...(y.levelConfirmed !== undefined && {
      levelConfirmed: y.levelConfirmed,
    }),
    message:
      formatDbWriteError(
        code,
        "write",
        kind,
        limit,
        n?.field,
        {
          pinned: d,
          current: version,
          op: t,
          required,
          path: h?.address,
        },
        serverReason,
      ) +
      (NO_RETRY_WRITE_CODES.has(code) ? NOTHING_WRITTEN_SUFFIX : "") +
      (code === "invalid_argument" && (d !== undefined || n?.replaceAll === true)
        ? `. If this server does not yet accept \`${d !== undefined ? "if_version" : "replace_all"}\`, that alone explains the refusal \u2014 nothing was written; retry without it only if an unconditional ${d !== undefined ? "write" : "single replacement"} is acceptable here`
        : ""),
    reason,
  };
}
//@ chunk-0zqb2m0b.js:28145-28407 placement
function isRetryableDbResult(e) {
  if (e.kind !== "error") return true;
  switch (e.code) {
    case "invalid_argument":
    case "store_unavailable":
    case "quota_or_rate":
    case "quota_exceeded":
    case "upstream_auth":
    case "credential_rejected":
    case "cloud_unavailable":
    case "network_off":
      return false;
    default:
      return true;
  }
}
//@ chunk-0zqb2m0b.js:28407-31306 placement
/**
 * 执行 write_db 的 batch：校验、发送、按需降级为逐条写入。
 */
async function writeArtifactDbBatch(host, t, signal, storageV5, credentials) {
  let { slug, ops, asLevel } = t;
  if (!ARTIFACT_SLUG_RE.test(slug))
    return invalidDbWrite("invalid_slug", "not a valid artifact id", "batch_");
  if (ops.length === 0 || ops.length > MAX_BATCH_WRITES)
    return invalidDbWrite(
      "batch_size",
      `a batch takes 1-${MAX_BATCH_WRITES} writes \u2014 ${ops.length} were given`,
      "batch_",
    );
  let d;
  let h = () => (d ??= composeMeKey(host, "artifact_db_write", slug, signal, storageV5, credentials));
  let u = [];
  let R = new Set();
  for (let [x, F] of ops.entries()) {
    let C = await validateCollectionPath(F, h, "batch_");
    if (!C.ok)
      return {
        ...C.result,
        message: `write ${x + 1} of ${ops.length}: ${C.result.message}`,
      };
    if (R.has(C.path))
      return invalidDbWrite(
        "duplicate_path",
        `write ${x + 1} of ${ops.length} addresses ${C.path}, which an earlier write in this batch already addresses \u2014 a batch writes each document at most once`,
        "batch_",
      );
    R.add(C.path);
    u.push({
      op: F.op,
      path: C.path,
      ...(F.data !== undefined && {
        data: F.data,
      }),
      ...(F.ifVersion !== undefined && {
        ifVersion: F.ifVersion,
      }),
    });
  }
  let any = u.some((x) => x.ifVersion !== undefined);
  let y = {
    ops: u.map(({ op, path, data: C, ifVersion }) => ({
      op,
      ...buildDbWriteOp(op, path, C, undefined, ifVersion),
    })),
  };
  let a;
  try {
    a = Buffer.byteLength(
      jsonStringify({
        slug,
        verb: "batch",
        args: y,
      }),
      "utf8",
    );
  } catch {
    return invalidDbWrite(
      "data_invalid",
      "every document in the batch must be a JSON-serializable object",
      "batch_",
    );
  }
  if (a > MAX_WRITE_BODY_BYTES)
    return invalidDbWrite(
      "batch_too_large",
      `the batch serializes to ${a} bytes \u2014 the limit for one request is ${MAX_WRITE_BODY_BYTES}; split it into smaller batches`,
      "batch_",
    );
  let w = meIdCooldown.of(host);
  let D = t.requireVersion === true ? host : undefined;
  let S =
    t.requestId !== undefined
      ? {
          host,
          id: t.requestId,
        }
      : undefined;
  if (w.unsupported && !any) return writeBatchSequentialFallback(slug, u, signal, credentials, asLevel, D, S);
  let q = meAliasCooldown.of(host);
  let I = t.requireVersion === true && !q.unsupported;
  let A = (x) =>
    callArtifactDb(
      "artifact_db_write",
      slug,
      "batch",
      y,
      {
        timeout: 60000,
        maxContentLength: STALE_PIN_NOTICE_CHARS,
        credentials,
        ...(asLevel !== undefined && {
          asLevel,
        }),
        ...(x && {
          requireVersion: true,
        }),
        ...(S !== undefined && {
          requestId: S,
        }),
      },
      signal,
    );
  let b = await A(I);
  if (!b.ok) return b.result;
  if (I && isInvalidArgumentBody(b.status, b.data)) {
    b = await A(false);
    if (!b.ok) return b.result;
    if (asLevel === undefined) {
      q.refusedAt = Date.now();
      logFeatureSad("artifact_db_write", "batch_require_version_unsupported");
    }
  }
  if (asLevel === undefined && isInvalidArgumentBody(b.status, b.data)) {
    w.refusedAt = Date.now();
    return any
      ? describeBatchPinnedUnsupported()
      : writeBatchSequentialFallback(slug, u, signal, credentials, undefined, D, S);
  }
  if (b.status === 200) {
    let x = b.levelConfirmed !== undefined && {
      levelConfirmed: b.levelConfirmed,
    };
    let F = DB_BATCH_RESPONSE_SCHEMA().safeParse(b.data);
    if (!F.success || F.data.results.length !== ops.length) {
      logFeatureSad("artifact_db_write", "malformed_batch_echo");
      return {
        kind: "ok",
        ...x,
        results: ops.map(() => ({})),
      };
    }
    logFeatureOk("artifact_db_write");
    checkWriteUsageShape(b.data, F.data.usage);
    let responseWarnings = getResponseWarnings(b.data);
    return {
      kind: "ok",
      ...x,
      results: F.data.results.map((N) =>
        N.version !== undefined
          ? {
              version: N.version,
            }
          : {},
      ),
      ...(F.data.usage !== undefined && {
        usage: F.data.usage,
      }),
      ...(responseWarnings.length > 0 && {
        warnings: responseWarnings,
      }),
    };
  }
  let { code, reason, kind, limit, version, index, required, serverReason } = checkVersionPrecondition(
    b.status,
    b.data,
  );
  (isEditErrorCode(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", `batch_${reason}`);
  let T = index !== undefined && index < u.length ? index : undefined;
  return {
    kind: "error",
    code,
    ...(b.levelConfirmed !== undefined && {
      levelConfirmed: b.levelConfirmed,
    }),
    message: splitOversizedBatch(code, kind, limit, {
      pinned: any,
      stale:
        T !== undefined
          ? {
              index: T,
              path: `${ops[T].collection}/${ops[T].docId}`,
              op: ops[T].op,
              ifVersion: ops[T].ifVersion,
              total: ops.length,
            }
          : undefined,
      version,
      required,
      serverReason,
    }),
    reason,
  };
}
//@ chunk-0zqb2m0b.js:31306-31767 placement
function describeBatchPinnedUnsupported() {
  logFeatureSad("artifact_db_write", "batch_pinned_unsupported");
  return {
    kind: "error",
    code: "invalid_argument",
    reason: "batch_pinned_unsupported",
    message: `db batch write failed (${toPublicDbErrorCode("invalid_argument")}): this server does not take batch writes yet (nor, most likely, \`if_version\`), and a batch with \`if_version\` pins is never applied one write at a time \u2014 nothing was written. Resend it without the pins only if unconditional writes are acceptable here`,
  };
}
//@ chunk-0zqb2m0b.js:31767-34752 placement
/**
 * 批量写入失败说明（超过 1 MiB、部分失败等）。
 */
function splitOversizedBatch(code, kind, limit, c) {
  if (code === "too_large")
    return `db batch write failed (${toPublicDbErrorCode(code)}): the batch body exceeds the server's 1 MiB request limit \u2014 nothing was written; split it into smaller write_db calls`;
  if (code === "version_mismatch" && c?.required === true) {
    let o = `db batch write failed (${toPublicDbErrorCode(code)})`;
    let n =
      "Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending";
    let stale = c.stale;
    return stale !== undefined
      ? `${o}: writes[${stale.index}] (write ${stale.index + 1} of ${stale.total}) targets ${stale.path}, which already exists, and carried no if_version \u2014 the whole batch wrote nothing. Read that document back, re-plan its ${stale.op === "delete" ? "delete (if it should still be deleted)" : "write on what it holds now"} with if_version set to the version the read returns, then resend the batch. ${"Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending"}`
      : `${o}: one of the writes targets a document that already exists and carried no if_version \u2014 the whole batch wrote nothing. Read the existing documents this batch writes, re-plan those entries on what they hold now with if_version set to the versions the reads return, then resend the batch`;
  }
  if (code === "version_mismatch") {
    let o = `db batch write failed (${toPublicDbErrorCode(code)}): the batch is atomic, so nothing was written \u2014 none of the writes applied`;
    let stale = c?.stale;
    if (stale === undefined || stale.ifVersion === undefined)
      return `${o}. A document one of the writes was pinned to with if_version is no longer at that version (or no longer exists). Re-read the pinned documents, re-plan those writes against what they hold now with fresh pins, then resend the batch`;
    let d = `writes[${stale.index}] (write ${stale.index + 1} of ${stale.total}, ${jsonStringify(stale.path)})`;
    let h =
      "It is the first stale pin the server met; later pinned entries were not checked, so re-read any pinned document you are unsure of too, then resend the batch";
    return c?.version !== undefined
      ? `${o}. ${d} was pinned to version ${stale.ifVersion} and that document is now at version ${c.version}: read it back, re-plan its write against what it holds now and pin to that version. ${h}`
      : `${o}. ${d} was pinned to version ${stale.ifVersion} and that document has changed or may have been deleted (the server named no current version): read it back \u2014 if it still exists, re-plan its write against what it holds now and pin to its version; if it is gone, drop that entry, or re-create it with a "set" entry and no if_version only if it should exist again. ${h}`;
  }
  let s = formatDbWriteError(code, "batch write", kind, limit, undefined, undefined, c?.serverReason);
  let l =
    code === "invalid_argument" && c?.pinned === true
      ? ". If this server does not yet accept `if_version` on batch writes, that alone explains the refusal \u2014 resend without the pins only if unconditional writes are acceptable here"
      : "";
  return isRecoverableStoreError(code)
    ? `${s}; the batch is atomic, so nothing was written${l}`
    : `${s}; the batch's outcome is unknown \u2014 it applies all-or-nothing and may have committed; read back before retrying`;
}
//@ chunk-0zqb2m0b.js:34752-34799 placement
/**
 * 导出函数 `isRecoverableStoreError`：参数 e，返回 e !== "store_unavailable"。
 */
function isRecoverableStoreError(e) {
  return e !== "store_unavailable";
}
//@ chunk-0zqb2m0b.js:34799-36393 placement
/**
 * 批量写入不被支持时逐条顺序写入的回退。
 */
async function writeBatchSequentialFallback(slug, t, r, c, s, l, o) {
  logFeatureSad("artifact_db_write", "batch_fallback_sequential");
  let n = [];
  let d;
  let h = [];
  let u;
  let R = (y) =>
    s !== undefined && y > 0 && u !== true
      ? ` (as_level '${s}' unconfirmed for them \u2014 they may have run at your own level)`
      : "";
  let k =
    "this server does not take batch writes yet, so the batch was applied one write at a time and is NOT atomic";
  for (let [y, { op: a, path: w, data: D }] of t.entries()) {
    let S = `${y} ${y === 1 ? "entry" : "entries"} before it already committed`;
    let q = t.length - y - 1;
    let I = (b) => ({
      kind: "error",
      code: "store_unavailable",
      reason: "batch_fallback_aborted",
      message: `${k}: interrupted at writes[${y}] (write ${y + 1} of ${t.length}). The ${S}${R(y)}; writes[${y}] itself ${b ? "may or may not have applied" : "did not run"}; the ${q} after it did not run.`,
      fallback: "sequential",
      results: n,
      failedIndex: y,
    });
    if (r.aborted) return I(false);
    let A;
    try {
      A = await writeArtifactDocument(
        slug,
        a,
        w,
        D,
        r,
        c,
        s,
        undefined,
        undefined,
        l && {
          host: l,
          address: w,
        },
        o,
      );
    } catch (error) {
      if (isCancel(error)) return I(true);
      if (error instanceof DbAbortError) return I(false);
      throw error;
    }
    if (A.kind === "error")
      return {
        kind: "error",
        code: A.code,
        reason: A.reason,
        message: `${k}: writes[${y}] (write ${y + 1} of ${t.length}) failed \u2014 ${A.message.replace(NOTHING_WRITTEN_SUFFIX, `; writes[${y}] was not applied`)}. The ${S}${R(y)}; the ${q} after it did not run.`,
        fallback: "sequential",
        results: n,
        failedIndex: y,
      };
    n.push(
      A.version !== undefined
        ? {
            version: A.version,
          }
        : {},
    );
    d = A.usage ?? (a === "delete" ? undefined : d);
    for (let b of A.warnings ?? []) if (h.length < RETRY_ATTEMPTS && !h.includes(b)) h.push(b);
    if (A.levelConfirmed !== undefined) u = (u ?? true) && A.levelConfirmed;
  }
  return {
    kind: "ok",
    results: n,
    ...(d !== undefined && {
      usage: d,
    }),
    ...(h.length > 0 && {
      warnings: h,
    }),
    fallback: "sequential",
    ...(u !== undefined && {
      levelConfirmed: u,
    }),
  };
}
export {
  DB_LIST_LIMIT,
  MAX_EDITS_PER_CALL,
  meIdCooldown,
  regExp,
  READ_DB_OPERATIONS,
  DB_SCOPES,
  isRecoverableStoreError,
  WRITE_DB_OPERATIONS,
  isArtifactDbStrReplaceEnabled,
  STR_REPLACE,
  MAX_DOCUMENT_BYTES,
  MAX_FIELD_VALUE_BYTES,
  MAX_BATCH_WRITES,
  regExp_2,
  isCollectionPath,
  writeArtifactDbBatch,
  isQuotaReason,
  SAFE_FIELD_NAME_RE,
  describeCollectionPathError,
  MAX_WRITE_BODY_BYTES,
  readArtifactDb,
  MAX_QUERY_LIMIT,
  randomBatchId,
  validateWriteRequest,
  MAX_QUERY_RESULTS,
  clearMeIdCache,
  isArtifactDbEnabled,
  DB_QUERY_OPERATORS,
  DB_SYMBOL_OPERATORS,
  VERSION_MISMATCH_PREFIXES,
  VERSION_MISMATCH_TEXTS,
};
