/**
 * services/artifacts/artifactDb.ts
 *
 * 2.1.316 新增：Artifact 数据库（/api/frame/db/agent）：集合/文档读写、str_replace 编辑、版本冲突、批量写入与限额错误
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jkpnfdxp.js (69)
 * attribution: placement 69
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { MARKREADS } from "./textSanitize.js";
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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-jkpnfdxp.js:963-1015 placement
function isArtifactDbEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_DB ?? true;
}
//@ chunk-jkpnfdxp.js:1015-1116 placement
function isArtifactDbStrReplaceEnabled() {
  return (
    isArtifactDbEnabled() &&
    (env.CLAUDE_CODE_ARTIFACT_DB_STR_REPLACE ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_stile", false)) === true
  );
}
//@ chunk-jkpnfdxp.js:1116-1153 placement
var ARTIFACT_DB_API_PATH = "/api/frame/db/agent";
var DB_REQUEST_TIMEOUT_MS = 5000;
//@ chunk-jkpnfdxp.js:1153-1173 placement
let DbAbortError; // deferred: uses AbortError (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-jkpnfdxp.js:1153", () => {
  DbAbortError = class DbAbortError extends AbortError {};
});
//@ chunk-jkpnfdxp.js:1173-1301 placement
var DB_SEGMENT_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
var regExp_2;
deferInit("chunk-jkpnfdxp.js:1173", () => {
  DB_SEGMENT_PATTERN = String.raw`(?!\.\.?(?:/|$))[A-Za-z0-9_\-.~:@+]{1,200}`;
  regExp = new RegExp(`^${DB_SEGMENT_PATTERN}$`);
  regExp_2 = new RegExp(`^${DB_SEGMENT_PATTERN}(?:/${DB_SEGMENT_PATTERN}){0,14}$`);
});
//@ chunk-jkpnfdxp.js:1301-1343 placement
function isCollectionPath(collection) {
  return (countCharInString(collection, "/") + 1) % 2 === 1;
}
//@ chunk-jkpnfdxp.js:1343-2034 placement
function describeCollectionPathError(collection) {
  let pathPart = (part) => (part.length > 120 ? `${part.slice(0, 60)}\u2026${part.slice(-40)}` : part);
  let parts = collection.split("/");
  let count = parts.length;
  let parent = pathPart(parts.slice(0, -1).join("/"));
  let leaf = pathPart(parts[count - 1]);
  return `collection '${pathPart(collection)}' has ${count} segments, which makes it a document path, not a collection: collection paths have an odd number of segments (collection/document/collection/\u2026) and the document is collection + doc_id. For that document use collection '${parent}' with doc_id '${leaf}'; for a collection inside it, add one more segment. Per-user data follows the same rule \u2014 collection 'data/users/<id>' (3 segments) holds that user's documents, so 'data/users/<id>/decks' is one document and 'data/users/<id>/decks/cards' a collection.`;
}
//@ chunk-jkpnfdxp.js:2034-2167 placement
/**
 * 数据库工具的操作分类：读（get/list/query）、写（set/update/delete/str_replace）、作用域（view/interact/admin），及列表上限 1000。
 */
var DB_LIST_LIMIT = 1000;
var READ_DB_OPERATIONS = ["get", "list", "query"];
var WRITE_DB_OPERATIONS = ["set", "update", "delete"];
var STR_REPLACE = "str_replace";
var MUTATING_DB_OPERATIONS = [...WRITE_DB_OPERATIONS, STR_REPLACE];
var DB_SCOPES = ["view", "interact", "admin"];
//@ chunk-jkpnfdxp.js:2167-2218 placement
/**
 * 导出函数 `randomBatchId`：返回 randomBytes(16).toString("base64url")。
 */
function randomBatchId() {
  return randomBytes(16).toString("base64url");
}
//@ chunk-jkpnfdxp.js:2218-2469 placement
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
//@ chunk-jkpnfdxp.js:2469-2511 placement
function isEditErrorCode(errorCode) {
  return EDIT_ERROR_CODES.some((known) => known === errorCode);
}
//@ chunk-jkpnfdxp.js:2511-3270 placement
/**
 * 数据库错误码映射表：服务端各种错误码统一到 not_found/invalid_argument/quota_or_rate/busy/upstream_auth/store_unavailable 等，及需要用户级 OAuth 错误的文案集合。
 */
var DB_ERROR_CODES; // deferred: uses MAX_EDITS_PER_CALL of its import cycle while loading; runs once the cycle is complete
var USER_SCOPED_TOKEN_ERRORS;
deferInit("chunk-jkpnfdxp.js:2511", () => {
  DB_ERROR_CODES = new Map([
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
    ...EDIT_ERROR_CODES.map((name) => [name, name]),
  ]);
  USER_SCOPED_TOKEN_ERRORS = new Set([
    "an OAuth access token is required",
    "a directly presented OAuth access token is required",
    "db verbs require a user-scoped OAuth token, not an org service key",
  ]);
});
//@ chunk-jkpnfdxp.js:3270-3502 placement
function classifyCredential403(error, status) {
  if (error !== 403 || typeof status !== "string") return;
  let trimmed = status.trim();
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
//@ chunk-jkpnfdxp.js:3502-3754 placement
function classifyDbHttpStatus(status) {
  if (status === 404 || status === 403) return "not_found";
  if (status === 400 || status === 422) return "invalid_argument";
  if (status === 413) return "too_large";
  if (status === 429) return "quota_or_rate";
  if (status === 409 || status === 412) return "busy";
  if (status === 401) return "upstream_auth";
  return "store_unavailable";
}
//@ chunk-jkpnfdxp.js:3754-4238 placement
/**
 * 把内部数据库错误码归并成对模型公开的错误码（invalid_argument/resource_exhausted/quota_exceeded/unavailable，编辑类与版本冲突原样保留）。
 */
function toPublicDbErrorCode(result) {
  switch (result) {
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
      return result;
  }
}
//@ chunk-jkpnfdxp.js:4238-4410 placement
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
//@ chunk-jkpnfdxp.js:4410-4452 placement
function isComparisonSymbol(op) {
  return Object.hasOwn(SYMBOL_TO_DB_OPERATOR, op);
}
//@ chunk-jkpnfdxp.js:4452-4488 placement
function toDbOperator(op) {
  return isComparisonSymbol(op) ? SYMBOL_TO_DB_OPERATOR[op] : op;
}
//@ chunk-jkpnfdxp.js:4488-5055 placement
/**
 * 数据库响应的 schema 集合：单文档读取、文档列表、用量（文档数/上限），以及可选布尔字段 authoredByOthers/outside_writer。
 */
var optionalTrueSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var optionalBooleanSchema;
var DB_GET_RESPONSE_SCHEMA;
var DB_LIST_RESPONSE_SCHEMA;
var DB_USAGE_SCHEMA;
deferInit("chunk-jkpnfdxp.js:4488", () => {
  optionalTrueSchema = DoctorLazy(() => create_25(true).optional().catch(undefined));
  optionalBooleanSchema = DoctorLazy(() => create_6().optional().catch(undefined));
  DB_GET_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      exists: create_6(),
      data: create_20(create_2(), create_12()).optional(),
      version: create_3().int().optional(),
      updatedAt: create_2().optional(),
      authoredByOthers: optionalTrueSchema(),
      [MARKREADS]: optionalTrueSchema(),
      outside_writer: optionalBooleanSchema(),
    }),
  );
  DB_LIST_RESPONSE_SCHEMA = DoctorLazy(() =>
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
      [MARKREADS]: optionalTrueSchema(),
      outside_writer: optionalBooleanSchema(),
    }),
  );
  DB_USAGE_SCHEMA = DoctorLazy(() =>
    create({
      documents: create_3().int().safe().nonnegative(),
      maxDocuments: create_3().int().safe().positive(),
    })
      .optional()
      .catch(undefined),
  );
});
//@ chunk-jkpnfdxp.js:5055-5176 placement
function checkWriteUsageShape(usage, usage_2) {
  if (usage_2 === undefined && typeof usage === "object" && usage !== null && usage.usage !== undefined)
    logFeatureSad("artifact_db_write", "malformed_usage");
}
//@ chunk-jkpnfdxp.js:5176-5192 placement
var RETRY_ATTEMPTS = 4;
var RETRY_BASE_MS = 600;
//@ chunk-jkpnfdxp.js:5192-5419 placement
function getResponseWarnings(result) {
  let warnings = result !== null && typeof result === "object" ? result.warnings : undefined;
  if (!Array.isArray(warnings)) return [];
  let warningList = [];
  for (let warning of warnings) {
    if (warningList.length >= RETRY_ATTEMPTS) break;
    if (typeof warning !== "string") continue;
    let rawWarning = sanitizeDisplayTextOrUndefined(warning, RETRY_BASE_MS);
    if (rawWarning !== undefined) warningList.push(rawWarning);
  }
  return warningList;
}
//@ chunk-jkpnfdxp.js:5419-5664 placement
var DB_WRITE_RESPONSE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DB_BATCH_RESPONSE_SCHEMA;
var DB_INVALID_ARGUMENT_SCHEMA;
deferInit("chunk-jkpnfdxp.js:5419", () => {
  DB_WRITE_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      version: create_3().int().optional(),
      usage: DB_USAGE_SCHEMA(),
    }),
  );
  DB_BATCH_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      results: create_15(
        create({
          version: create_3().int().optional(),
        }),
      ),
      usage: DB_USAGE_SCHEMA(),
    }),
  );
  DB_INVALID_ARGUMENT_SCHEMA = DoctorLazy(() =>
    create({
      error: create({
        code: create_25("invalid_argument"),
        message: create_25("invalid argument"),
        verb: create_9().optional(),
      }),
    }),
  );
});
//@ chunk-jkpnfdxp.js:5664-5722 placement
function isInvalidArgumentBody(status, error) {
  return status === 400 && DB_INVALID_ARGUMENT_SCHEMA().safeParse(error).success;
}
//@ chunk-jkpnfdxp.js:5722-5827 placement
class RefusalCooldown {
  refusedAt = undefined;
  get unsupported() {
    return this.refusedAt !== undefined && Date.now() - this.refusedAt < ME_ID_TTL_MS;
  }
}
//@ chunk-jkpnfdxp.js:5827-5903 placement
/**
 * 导出函数 `ME_ID_TTL_MS`。
 */
var ME_ID_TTL_MS; // deferred: uses RefusalCooldown of its import cycle while loading; runs once the cycle is complete
var meIdCooldown;
var meAliasCooldown;
var meRawCooldown;
deferInit("chunk-jkpnfdxp.js:5827", () => {
  ME_ID_TTL_MS = 3600000;
  meIdCooldown = new HostScoped(() => new RefusalCooldown());
  meAliasCooldown = new HostScoped(() => new RefusalCooldown());
  meRawCooldown = new HostScoped(() => new RefusalCooldown());
});
//@ chunk-jkpnfdxp.js:5903-5996 placement
function isBadJsonInvalidArgument(status, error) {
  if (!isInvalidArgumentBody(status, error)) return false;
  let { reason } = error.error;
  return reason === undefined || reason === "bad_json";
}
//@ chunk-jkpnfdxp.js:5996-6273 placement
/**
 * 数据库错误响应体 schema（code/reason/kind/limit/version/index/required）与配额原因集合。
 */
var DbErrorBodySchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var QUOTA_REASONS;
deferInit("chunk-jkpnfdxp.js:5996", () => {
  DbErrorBodySchema = DoctorLazy(() =>
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
  QUOTA_REASONS = new Set(["docs_per_collection", "docs_per_database", "databases_per_org"]);
});
//@ chunk-jkpnfdxp.js:6273-6306 placement
/**
 * 导出函数 `isQuotaReason`：参数 e，返回 ve.has(e)。
 */
function isQuotaReason(reason) {
  return QUOTA_REASONS.has(reason);
}
//@ chunk-jkpnfdxp.js:6306-6473 placement
var QUOTA_REASONS_BY_CODE; // deferred: uses DbErrorBodySchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-jkpnfdxp.js:6306", () => {
  QUOTA_REASONS_BY_CODE = {
    quota_exceeded: new Set([...QUOTA_REASONS, "bytes_per_database"]),
    quota_or_rate: new Set([
      "active_leases",
      "rate_limited",
      "write_capacity",
      "scan_budget",
      "response_budget",
    ]),
  };
});
//@ chunk-jkpnfdxp.js:6473-6530 placement
function hasQuotaReasonForCode(code, kind) {
  let reasons = QUOTA_REASONS_BY_CODE[code];
  return reasons !== undefined && reasons.has(kind);
}
//@ chunk-jkpnfdxp.js:6530-6611 placement
function positiveIntOrUndefined(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
//@ chunk-jkpnfdxp.js:6611-6693 placement
function nonNegativeIntOrUndefined(index) {
  return typeof index === "number" && Number.isSafeInteger(index) && index >= 0 ? index : undefined;
}
//@ chunk-jkpnfdxp.js:6693-6723 placement
var SAFE_COLLECTION_NAME_RE = /^[a-z][a-z_-]{0,63}$/;
//@ chunk-jkpnfdxp.js:6723-7291 placement
function checkVersionPrecondition(status, body) {
  let credentialKind = classifyCredential403(status, body);
  if (credentialKind !== undefined) return credentialKind;
  let parsed = DbErrorBodySchema().safeParse(body);
  let error = parsed.success ? parsed.data.error : undefined;
  let code = error?.code;
  let codeInfo = code !== undefined ? DB_ERROR_CODES.get(code) : undefined;
  if (code !== undefined && codeInfo !== undefined) {
    let kind = error?.kind;
    if (hasQuotaReasonForCode(codeInfo, kind))
      return {
        code: codeInfo,
        reason: kind,
        kind,
        limit: positiveIntOrUndefined(error?.limit),
      };
    let isVersionMismatch = codeInfo === "version_mismatch" && error?.required === true;
    let reason =
      typeof error?.reason === "string" && SAFE_COLLECTION_NAME_RE.test(error.reason)
        ? error.reason
        : undefined;
    return {
      code: codeInfo,
      reason: isVersionMismatch ? "version_required" : code.replace(/-/g, "_"),
      ...(isEditErrorCode(codeInfo) && {
        version: positiveIntOrUndefined(error?.version),
        index: nonNegativeIntOrUndefined(error?.index),
        ...(isVersionMismatch && {
          required: true,
        }),
      }),
      ...(reason !== undefined && {
        serverReason: reason,
      }),
    };
  }
  let httpStatus = classifyDbHttpStatus(status);
  return {
    code: httpStatus,
    reason: httpStatus,
  };
}
//@ chunk-jkpnfdxp.js:7291-7602 placement
/**
 * 版本冲突错误的提示前缀与写入/删除时“需先读最新版本”的文案。
 */
var VERSION_MISMATCH_PREFIXES; // deferred: uses toPublicDbErrorCode of its import cycle while loading; runs once the cycle is complete
var VERSION_MISMATCH_TEXTS;
deferInit("chunk-jkpnfdxp.js:7291", () => {
  VERSION_MISMATCH_PREFIXES = [
    `db write failed (${toPublicDbErrorCode("version_mismatch")}): `,
    `db batch write failed (${toPublicDbErrorCode("version_mismatch")}): `,
  ];
  VERSION_MISMATCH_TEXTS = {
    write: "Not saved: Claude needs to read the latest version of this document before changing it.",
    delete: "Not deleted: Claude needs to read the latest version of this document before deleting it.",
  };
});
//@ chunk-jkpnfdxp.js:7602-12841 placement
/**
 * 生成文档写入错误说明（字段、版本冲突、编辑未匹配/不唯一等，约 5 KB）。
 */
function formatDbWriteError(errorCode, operation, kind, limit, field, versionInfo, serverReason) {
  let fieldText = `field '${field ?? "?"}'`;
  let versionText =
    versionInfo?.current !== undefined ? ` The document is at version ${versionInfo.current}.` : "";
  let pinnedAtCurrent = versionInfo?.pinned !== undefined && versionInfo.current === versionInfo.pinned;
  let headline = `db ${operation} failed (${toPublicDbErrorCode(errorCode)})`;
  switch (errorCode) {
    case "not_found":
      return `${headline}: no such artifact, collection, or document (or no access \u2014 the two are deliberately indistinguishable)`;
    case "invalid_argument":
      return `${headline}: the server could not accept the request as shaped${serverReason !== undefined ? ` (reason: ${serverReason})` : ""}`;
    case "too_large":
      return `${headline}: the request body exceeds the server's size limit \u2014 send less per call`;
    case "quota_or_rate":
      return `${headline}: ${formatDbLimitError(kind, limit) ?? "over a rate or storage limit \u2014 retry later or write less"}`;
    case "quota_exceeded":
      return `${headline}: ${formatDbLimitError(kind, limit) ?? "a storage limit on this artifact's database has been reached \u2014 delete documents; retrying won't help"}`;
    case "busy":
      return `${headline}: lost to a concurrent change \u2014 re-read and retry deliberately`;
    case "upstream_auth":
      return `${headline}: could not authenticate \u2014 the session's credential may need a refresh; try again`;
    case "store_unavailable":
      return `${headline}: the store is unavailable right now \u2014 try again`;
    case "not_declared":
      return `${headline}: this artifact's current published version does not declare the database capability \u2014 republish it with the db capability declared, then retry`;
    case "credential_rejected":
      return `${headline}: the server refused this session's credential at the artifact-db door \u2014 not an artifact-access or existence answer; report this as a client/server integration fault`;
    case "cloud_unavailable":
      return `${headline}: reading and editing artifact data isn't available in this cloud session right now; this says nothing about the artifact or its data, and if the user has access, Claude Code on their own machine can still read and edit it`;
    case "network_off":
      return operation === "read"
        ? `${headline}: this cloud session's network access is turned off (or could not be confirmed), so it cannot read artifact data${relayIsOnlyRoute() ? "" : " \u2014 writes still work"}; do not retry the read here`
        : `${headline}: this cloud session's network access is turned off (or could not be confirmed), and the gateway did not accept this call as a write it allows \u2014 do not retry it here`;
    case "edit_no_match":
      return pinnedAtCurrent
        ? `${headline}: old_str does not occur in ${fieldText} of that document, so nothing was written by this call. The document is still at version ${versionInfo?.current}, the one this edit was pinned to, so nothing changed under you: old_str itself does not match the stored text \u2014 copy it exactly as it appears in the field's value (the decoded string, not JSON-escaped source)`
        : `${headline}: old_str does not occur in ${fieldText} of that document, so nothing was written by this call.${versionText} Copy the text exactly as it appears in the field's value (the decoded string, not JSON-escaped source). If you were retrying after a call whose outcome you did not see, that earlier call may already have applied \u2014 read the document back before trying again. If someone else changed that text, re-read and re-plan the edit`;
    case "edit_ambiguous":
      return `${headline}: old_str occurs more than once in ${fieldText} of that document; nothing was written.${versionText} Include more surrounding text so it is unique, or pass replace_all to change every occurrence`;
    case "edit_field_missing":
      return `${headline}: the document has no top-level ${fieldText}; nothing was written.${versionText} str_replace edits an existing top-level string field \u2014 read the document to see its fields, or use update to add one`;
    case "edit_field_not_string":
      return `${headline}: ${fieldText} is not a string (str_replace edits top-level string fields only); nothing was written \u2014 use update for structured fields.${versionText}`;
    case "version_mismatch":
      if (versionInfo?.required === true) {
        let path = versionInfo.path ?? "that document";
        let unknown =
          "Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns";
        switch (versionInfo.op) {
          case "delete":
            return `${headline}: ${path} is an existing document and this delete carried no if_version \u2014 nothing was deleted. Read it back and, if it should still be deleted, resend the delete with if_version set to the version that read returns`;
          case "update":
            return `${headline}: ${path} is an existing document and this update carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
          default:
            return `${headline}: ${path} already exists and this write carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
        }
      }
      return versionInfo?.current !== undefined
        ? `${headline}: the document is no longer at version ${versionInfo.pinned ?? "?"}, the one this write was pinned to \u2014 it is now at version ${versionInfo.current}; nothing was written. Read it back, re-plan the write against what it holds now, and pin to that version`
        : `${headline}: the document is no longer at version ${versionInfo?.pinned ?? "?"}, the one this write was pinned to \u2014 it has changed or may have been deleted; nothing was written. Read it back: if it still exists, re-plan the write against what it holds now and pin to its version; if it is gone, ${versionInfo?.op === "delete" ? "a delete has nothing left to do" : 're-create it with a "set" and no if_version only if it should exist again'}`;
  }
}
//@ chunk-jkpnfdxp.js:12841-14152 placement
function formatDbLimitError(kind, limit) {
  let docPart = limit === undefined ? "document limit" : `limit of ${limit} documents`;
  let storagePart = limit === undefined ? "storage limit" : `storage limit of ${formatBytesDecimal(limit)}`;
  switch (kind) {
    case "docs_per_collection":
      return `this collection has reached its ${docPart} \u2014 delete documents; retrying won't help`;
    case "docs_per_database":
      return `this artifact's database has reached its ${docPart} \u2014 delete documents before adding more; retrying won't help`;
    case "bytes_per_database":
      return `this artifact's database has reached its ${storagePart} (the total size of its documents, not their count) \u2014 delete documents or make them smaller; a write that makes an existing document larger can be refused too, and retrying won't help`;
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
//@ chunk-jkpnfdxp.js:14152-14217 placement
/**
 * 数据库读取自身身份（data/users/me、whoami）的路径常量与 schema。
 */
var DATA_USERS_ME; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var WHOAMI_PATH;
var whoAmIResponseSchema;
deferInit("chunk-jkpnfdxp.js:14152", () => {
  DATA_USERS_ME = "data/users/me";
  WHOAMI_PATH = "whoami";
  whoAmIResponseSchema = DoctorLazy(() =>
    create({
      id: create_2().min(1),
    }),
  );
});
//@ chunk-jkpnfdxp.js:14217-14252 placement
function meKey(accountUuid, prefix) {
  return `${accountUuid}:${prefix}`;
}
//@ chunk-jkpnfdxp.js:14252-14305 placement
function isDbViaRelay() {
  return plannedRoute("POST", ARTIFACT_DB_API_PATH, "bound") === "relay";
}
//@ chunk-jkpnfdxp.js:14305-14403 placement
async function meKeyFromGateway(accountUuid, credentials) {
  if (isDbViaRelay()) return null;
  let accountUuid_2 = (await getGatewayAccountInfoAsync(credentials))?.accountUuid;
  return accountUuid_2 ? meKey(accountUuid_2, accountUuid) : null;
}
//@ chunk-jkpnfdxp.js:14403-14502 placement
async function isSameAccountUuid(a, b, credentials) {
  let freshOauthAccountFromDisk = await readFreshOauthAccountFromDisk(credentials);
  return (
    freshOauthAccountFromDisk?.accountUuid !== undefined &&
    meKey(freshOauthAccountFromDisk.accountUuid, a) === b
  );
}
//@ chunk-jkpnfdxp.js:14502-14579 placement
function currentAuthorizationHash() {
  let Authorization = getAuthHeaders().headers.Authorization;
  return Authorization === undefined ? null : hashCredential(Authorization);
}
//@ chunk-jkpnfdxp.js:14579-14675 placement
async function refreshOAuthTwice(credentials) {
  if (!hasApiClient()) return;
  for (let k = 0; k < 2; k++)
    try {
      await checkAndRefreshOAuthTokenIfNeeded({
        credentials,
      });
    } catch {}
}
//@ chunk-jkpnfdxp.js:14675-14757 placement
/**
 * 导出函数 `clearMeIdCache`：参数 e。
 */
function clearMeIdCache(host) {
  let { resolvedMeIds, inFlightMeIds } = meIdCache.of(host);
  resolvedMeIds.clear();
  inFlightMeIds.clear();
}
//@ chunk-jkpnfdxp.js:14757-14884 placement
function makeUsersMeRewriter(collection, docId) {
  if (collection === DATA_USERS_ME || collection.startsWith(DATA_USERS_ME + "/"))
    return (result) => ({
      collection: "data/users/" + result + collection.slice(DATA_USERS_ME.length),
      docId,
    });
  return null;
}
//@ chunk-jkpnfdxp.js:14884-14917 placement
var CONTESTED_ME_KEY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jkpnfdxp.js:14884", () => {
  CONTESTED_ME_KEY = Symbol("contested-me-key");
});
//@ chunk-jkpnfdxp.js:14917-14970 placement
class MeIdCache {
  resolvedMeIds = new Map();
  inFlightMeIds = new Map();
}
//@ chunk-jkpnfdxp.js:14970-14995 placement
var meIdCache; // deferred: uses MeIdCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-jkpnfdxp.js:14970", () => {
  meIdCache = new HostScoped(() => new MeIdCache());
});
//@ chunk-jkpnfdxp.js:14995-15431 placement
function resolveWhoamiKey(token, host, kind, kind_2, limit) {
  if (host === "malformed_whoami_echo")
    return `db ${kind} failed (unavailable): resolving 'me' returned an unreadable response \u2014 the artifact db service may need an update`;
  if (token === "not_declared")
    return `db ${kind} failed (${toPublicDbErrorCode(token)}): resolving 'me' needs this artifact's published version to declare the db and user capabilities \u2014 republish with both declared, then retry`;
  return (
    formatDbWriteError(token, kind, kind_2, limit) +
    (kind === "write" && NO_RETRY_WRITE_CODES.has(token) ? NOTHING_WRITTEN_SUFFIX : "")
  );
}
//@ chunk-jkpnfdxp.js:15431-15543 placement
var NOTHING_WRITTEN_SUFFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NO_RETRY_WRITE_CODES;
deferInit("chunk-jkpnfdxp.js:15431", () => {
  NOTHING_WRITTEN_SUFFIX = "; nothing was written";
  NO_RETRY_WRITE_CODES = new Set(["too_large", "credential_rejected", "cloud_unavailable", "network_off"]);
});
//@ chunk-jkpnfdxp.js:15543-16402 placement
async function composeMeKey(host, operation, slug, scope, storageV5, credentials) {
  let cache = meIdCache.of(host);
  let { resolvedMeIds, inFlightMeIds } = cache;
  let gatewayMeKey = await meKeyFromGateway(slug, credentials);
  let meKey = null;
  if (gatewayMeKey !== null && (resolvedMeIds.has(gatewayMeKey) || inFlightMeIds.has(gatewayMeKey))) {
    if (await isSameAccountUuid(slug, gatewayMeKey, storageV5)) {
      if (resolvedMeIds.has(gatewayMeKey)) await refreshOAuthTwice(credentials);
      meKey = gatewayMeKey;
    }
  }
  let resolved = meKey === null ? undefined : resolvedMeIds.get(meKey);
  if (meKey !== null && resolved !== undefined && !isDbViaRelay()) {
    if (resolved.fingerprint === currentAuthorizationHash())
      return {
        ok: true,
        id: resolved.id,
      };
    if (resolvedMeIds.get(meKey) === resolved) resolvedMeIds.delete(meKey);
  }
  let result;
  if (gatewayMeKey === null)
    result = await describeWhoamiFailure(cache, operation, slug, scope, gatewayMeKey, storageV5, credentials);
  else {
    let pending = meKey === null ? undefined : inFlightMeIds.get(meKey);
    if (!pending) {
      pending = (async () => {
        if (!(await isSameAccountUuid(slug, gatewayMeKey, storageV5))) {
          logFeatureSad(operation, "contested_me_key");
          return CONTESTED_ME_KEY;
        }
        return describeWhoamiFailure(cache, operation, slug, scope, gatewayMeKey, storageV5, credentials);
      })();
      inFlightMeIds.set(gatewayMeKey, pending);
      pending
        .finally(() => {
          if (inFlightMeIds.get(gatewayMeKey) === pending) inFlightMeIds.delete(gatewayMeKey);
        })
        .catch(() => {});
    }
    let failure = await pending;
    result =
      failure === CONTESTED_ME_KEY
        ? await describeWhoamiFailure(cache, operation, slug, scope, null, storageV5, credentials)
        : failure;
  }
  if (result.ok) return result;
  if ("composed" in result)
    return {
      ok: false,
      result: result.composed,
    };
  let kind = operation === "artifact_db_read" ? "read" : "write";
  logFeatureBad(operation, result.reason);
  return {
    ok: false,
    result: {
      kind: "error",
      code: result.code,
      message: resolveWhoamiKey(result.code, result.reason, kind, result.kind, result.limit),
      reason: result.reason,
    },
  };
}
//@ chunk-jkpnfdxp.js:16402-17122 placement
async function describeWhoamiFailure(cache, operation, slug, scope, cachedMeKey, storageV5, credentials) {
  let authHash = null;
  if (cachedMeKey !== null) {
    await refreshOAuthTwice(credentials);
    authHash = currentAuthorizationHash();
    if (authHash === null || isDbViaRelay()) return CONTESTED_ME_KEY;
  }
  let response = await callArtifactDb(
    operation,
    slug,
    WHOAMI_PATH,
    {},
    {
      timeout: 15000,
      maxContentLength: STALE_PIN_NOTICE_CHARS,
      credentials,
      reportSentAuth: cachedMeKey !== null,
    },
    scope,
  );
  if (!response.ok)
    return {
      ok: false,
      composed: response.result,
    };
  if (response.status !== 200) {
    let { code, reason, kind, limit } = checkVersionPrecondition(response.status, response.data);
    return {
      ok: false,
      code,
      reason: `whoami_${reason}`,
      kind,
      limit,
    };
  }
  let parsed = whoAmIResponseSchema().safeParse(response.data);
  if (!parsed.success || !regExp.test(parsed.data.id))
    return {
      ok: false,
      code: "store_unavailable",
      reason: "malformed_whoami_echo",
    };
  if (cachedMeKey !== null) {
    if (
      authHash === null ||
      authHash !== response.sentAuthFingerprint ||
      authHash !== currentAuthorizationHash() ||
      !(await isSameAccountUuid(slug, cachedMeKey, storageV5))
    ) {
      logFeatureSad(operation, "auth_unstable_me_key");
      return CONTESTED_ME_KEY;
    }
    if (isDbViaRelay()) return CONTESTED_ME_KEY;
    cache.resolvedMeIds.set(cachedMeKey, {
      id: parsed.data.id,
      fingerprint: authHash,
    });
  }
  return {
    ok: true,
    id: parsed.data.id,
  };
}
//@ chunk-jkpnfdxp.js:17122-21143 placement
/**
 * 调用 Artifact DB 接口（读/写/批量），处理中继、作用域、错误分类（约 4 KB）。
 */
async function callArtifactDb(operation, slug, path, args, options, scope) {
  let batchPrefix = path === "batch" ? "batch_" : "";
  let isWhoami = path === WHOAMI_PATH;
  let lane = operation === "artifact_db_read" ? "read" : "write";
  let cooldown = options.requestId !== undefined ? meRawCooldown.of(options.requestId.host) : undefined;
  let requestOptions = {
    slug,
    verb: path,
    args,
    ...(options.asLevel !== undefined && {
      asLevel: options.asLevel,
    }),
    ...(options.requireVersion === true && {
      requireVersion: true,
    }),
    ...(operation === "artifact_db_write" && !isWhoami && getSessionHintHeaders()),
    ...(operation === "artifact_db_write" &&
      !isWhoami &&
      options.requestId !== undefined &&
      cooldown !== undefined &&
      !cooldown.unsupported &&
      requestIdMeta(options.requestId.id)),
  };
  let sendOnce = () =>
    frameApi.postRelayBound(ARTIFACT_DB_API_PATH, requestOptions, {
      refreshOAuth: true,
      credentials: options.credentials,
      headers: buildFrameHeaders(),
      timeout: options.timeout,
      maxContentLength: options.maxContentLength,
      signal: scope,
      reportSentAuth: options.reportSentAuth,
    });
  let retried = false;
  let sendWithRetry = async () => {
    let res = await sendOnce();
    if (res.ok && res.gatewayRetryAfterMs !== undefined && !retried) {
      retried = true;
      await sleep(Math.min(res.gatewayRetryAfterMs, DB_REQUEST_TIMEOUT_MS), scope, {
        abortError: () => new DbAbortError(),
      });
      res = await sendOnce();
      if (res.ok && res.route === "relay" && res.fromFrame)
        logFeatureSad(operation, `${batchPrefix}${isWhoami ? "whoami_" : ""}relay_busy_recovered`);
    }
    return res;
  };
  let refusal;
  try {
    refusal = await sendWithRetry();
    let text =
      refusal.ok && refusal.fromFrame
        ? findRejectedHintFields(refusal.status, refusal.data, requestOptions)
        : [];
    if (text.length > 0) {
      if (text.includes("request_id") && cooldown !== undefined) {
        logFeatureSad(operation, `${batchPrefix}request_id_rejected`);
        cooldown.refusedAt = Date.now();
      }
      if (mentionsSessionHintField(text)) {
        logFeatureSad(operation, `${batchPrefix}session_hints_rejected`);
        noteSessionHintsRefused();
      }
      requestOptions = omitAlias(requestOptions, mentionsSessionHintField(text) ? SESSION_HINT_FIELDS : text);
      refusal = await sendWithRetry();
    }
    if (
      cooldown !== undefined &&
      requestOptions.request_id !== undefined &&
      refusal.ok &&
      refusal.fromFrame &&
      isBadJsonInvalidArgument(refusal.status, refusal.data)
    ) {
      let { request_id: requestId, ...bodyWithoutRequestId } = requestOptions;
      requestOptions = bodyWithoutRequestId;
      refusal = await sendWithRetry();
      if (refusal.ok && refusal.fromFrame && refusal.status >= 200 && refusal.status < 300) {
        cooldown.refusedAt = Date.now();
        logFeatureSad(operation, `${batchPrefix}request_id_unsupported`);
      }
    }
  } catch (error) {
    if (isCancel(error) || error instanceof DbAbortError) throw error;
    let relayThrew = operation !== "artifact_db_read" && !isWhoami && threwOnRelayLeg(error);
    logFeatureBad(operation, `${batchPrefix}${relayThrew ? "relay_request_error" : "request_error"}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: relayThrew
          ? "db write outcome unknown (relay request failed) \u2014 it may have applied; read back before retrying"
          : `db ${lane} failed (network error)`,
        reason: relayThrew ? "relay_request_error" : "request_error",
      },
    };
  }
  if (!refusal.ok) {
    if (refusal.reason === "relay-unavailable" || refusal.reason === "relay-not-served") {
      let featureName = `${isWhoami ? "whoami_" : ""}${refusal.reason.replace(/-/g, "_")}`;
      logFeatureBad(operation, `${batchPrefix}${featureName}`, {
        status: refusal.status,
      });
      return {
        ok: false,
        result: {
          kind: "error",
          code: "store_unavailable",
          message: `db ${lane} failed (${toPublicDbErrorCode("store_unavailable")}): ${isWhoami ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection did not carry the request${refusal.status ? ` (HTTP ${refusal.status})` : ""}, so nothing ran; this says nothing about the artifact or its data, and if the user has access, Claude Code on their own machine can still read and edit it${lane === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`,
          reason: featureName,
        },
      };
    }
    logFeatureBad(operation, `${batchPrefix}${refusal.reason.replace(/-/g, "_")}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message:
          refusal.reason === "no-auth"
            ? describeArtifactAuthFailure(refusal.detail)
            : `db ${lane} unavailable: ${refusal.reason}`,
        reason: "transport",
      },
    };
  }
  if (refusal.gatewayPolicy === "network-off") {
    let networkOffFeature = isWhoami ? "whoami_network_off" : "network_off";
    logFeatureSad(operation, `${batchPrefix}${networkOffFeature}`);
    return {
      ok: false,
      result: {
        kind: "error",
        code: "network_off",
        message: isWhoami
          ? resolveWhoamiKey("network_off", networkOffFeature, lane)
          : formatDbWriteError("network_off", lane) + (lane === "write" ? NOTHING_WRITTEN_SUFFIX : ""),
        reason: networkOffFeature,
      },
    };
  }
  if (refusal.gatewayRetryAfterMs !== undefined) {
    let busyFeature = `${isWhoami ? "whoami_" : ""}relay_busy_retried`;
    let isStrReplace = path === STR_REPLACE;
    logFeatureBad(operation, `${batchPrefix}${busyFeature}`, {
      status: refusal.status,
    });
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: `db ${lane} failed (${toPublicDbErrorCode("store_unavailable")}): ${isWhoami ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection was temporarily unavailable (HTTP ${refusal.status}, after one retry); ${isStrReplace ? "the edit may or may not have applied \u2014 read it back before retrying" : `this is transient and nothing ran \u2014 retry shortly${lane === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`}`,
        reason: busyFeature,
      },
    };
  }
  if (!refusal.fromFrame) {
    logFeatureBad(operation, `${batchPrefix}${isWhoami ? "whoami_relay_error" : "relay_error"}`, {
      status: refusal.status,
    });
    return {
      ok: false,
      result: {
        kind: "error",
        code: "store_unavailable",
        message: isWhoami
          ? `db ${lane} failed: resolving 'me' failed (relay HTTP ${refusal.status}) \u2014 try again`
          : operation === "artifact_db_read"
            ? `db read failed (relay HTTP ${refusal.status}) \u2014 try again`
            : `db write outcome unknown (relay HTTP ${refusal.status}) \u2014 it may have applied; read back before retrying`,
        reason: isWhoami ? "whoami_relay_error" : "relay_error",
      },
    };
  }
  return {
    ok: true,
    status: refusal.status,
    data: refusal.data,
    sentAuthFingerprint: refusal.sentAuthFingerprint,
    ...(refusal.route === "relay" &&
      refusal.response.headers?.[X_FRAME_RELAY_READ_SCOPE_APPLIED] === "session" && {
        sessionScoped: true,
      }),
    ...(options.asLevel !== undefined && {
      levelConfirmed: getAsLevel(refusal.data) === options.asLevel,
    }),
  };
}
//@ chunk-jkpnfdxp.js:21143-21489 placement
/**
 * 关闭云端网络访问时数据库读取失败的说明文案（只能读自己发布的 artifact）与读取范围头。
 */
var X_FRAME_RELAY_READ_SCOPE_APPLIED; // deferred: uses toPublicDbErrorCode of its import cycle while loading; runs once the cycle is complete
var READ_SCOPE_NOT_FOUND_TEXT;
deferInit("chunk-jkpnfdxp.js:21143", () => {
  X_FRAME_RELAY_READ_SCOPE_APPLIED = "x-frame-relay-read-scope-applied";
  READ_SCOPE_NOT_FOUND_TEXT = `db read failed (${toPublicDbErrorCode("not_found")}): nothing this session can read at that address \u2014 with the organization's cloud network access turned off, this session can read the data only of artifacts it published itself (or there is no such artifact, collection, or document); do not retry the read here`;
});
//@ chunk-jkpnfdxp.js:21489-21736 placement
function getAsLevel(node) {
  if (node === null || typeof node !== "object") return;
  let asLevel = Reflect.get(node, "asLevel");
  if (typeof asLevel === "string") return asLevel;
  let errorNode = Reflect.get(node, "error");
  let nestedAsLevel =
    errorNode !== null && typeof errorNode === "object" ? Reflect.get(errorNode, "asLevel") : undefined;
  return typeof nestedAsLevel === "string" ? nestedAsLevel : undefined;
}
//@ chunk-jkpnfdxp.js:21736-25231 placement
/**
 * 执行 read_db 动作：get/list/query 文档。
 */
async function readArtifactDb(host, operation, scope, storageV5, credentials) {
  let { slug, op, query } = operation;
  let { collection, docId } = operation;
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
  let meKey;
  if (usersMeRewriter !== null) {
    let composedMeKey = await composeMeKey(host, "artifact_db_read", slug, scope, storageV5, credentials);
    if (!composedMeKey.ok) return composedMeKey.result;
    meKey = composedMeKey.id;
    ({ collection, docId } = usersMeRewriter(composedMeKey.id));
  }
  let docPath = docId !== undefined ? `${collection}/${docId}` : collection;
  if (docPath.length > DB_LIST_LIMIT) {
    logFeatureBad("artifact_db_read", "path_too_long");
    return {
      kind: "error",
      code: "invalid_argument",
      message: `the composed document path is ${docPath.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
      reason: "path_too_long",
    };
  }
  let dbQuery =
    op === "get"
      ? {
          path: docPath,
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
              where: query.where.map(([field, op, value]) => ({
                field,
                op: toDbOperator(op),
                value,
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
  let response = await callArtifactDb(
    "artifact_db_read",
    slug,
    op,
    dbQuery,
    {
      timeout: 15000,
      maxContentLength: MAX_DB_BODY_BYTES,
      credentials,
      ...(operation.asLevel !== undefined && {
        asLevel: operation.asLevel,
      }),
    },
    scope,
  );
  if (!response.ok) return response.result;
  if (response.status === 200) {
    if (op === "get") {
      let parsed = DB_GET_RESPONSE_SCHEMA().safeParse(response.data);
      if (!parsed.success) {
        logFeatureBad("artifact_db_read", "malformed_echo");
        return {
          kind: "error",
          code: "store_unavailable",
          message: "db read returned an unreadable response \u2014 try again",
          reason: "malformed_echo",
        };
      }
      let extra = {
        ...(response.levelConfirmed !== undefined && {
          levelConfirmed: response.levelConfirmed,
        }),
        ...(meKey !== undefined && {
          meId: meKey,
        }),
      };
      if (!parsed.data.exists) {
        logFeatureSad("artifact_db_read", "not_found");
        return {
          kind: "not_found",
          ...extra,
        };
      }
      logFeatureOk("artifact_db_read");
      return {
        kind: "ok",
        ...extra,
        docs: [
          {
            id: docId ?? "",
            data: parsed.data.data ?? {},
            ...(parsed.data.version !== undefined && {
              version: parsed.data.version,
            }),
            ...(parsed.data.updatedAt !== undefined && {
              updatedAt: parsed.data.updatedAt,
            }),
          },
        ],
        ...(parsed.data.version !== undefined && {
          version: parsed.data.version,
        }),
        ...(parsed.data[MARKREADS]
          ? {
              markReads: true,
            }
          : parsed.data.authoredByOthers && {
              authoredByOthers: true,
            }),
        ...(parsed.data.outside_writer !== undefined && {
          outsideWriter: parsed.data.outside_writer,
        }),
      };
    }
    let parsed = DB_LIST_RESPONSE_SCHEMA().safeParse(response.data);
    if (!parsed.success) {
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
      ...(response.levelConfirmed !== undefined && {
        levelConfirmed: response.levelConfirmed,
      }),
      ...(meKey !== undefined && {
        meId: meKey,
      }),
      docs: parsed.data.docs,
      ...(parsed.data.nextCursor !== undefined &&
        parsed.data.nextCursor !== "" && {
          nextCursor: parsed.data.nextCursor,
        }),
      ...(parsed.data[MARKREADS]
        ? {
            markReads: true,
          }
        : parsed.data.authoredByOthers && {
            authoredByOthers: true,
          }),
      ...(parsed.data.outside_writer !== undefined && {
        outsideWriter: parsed.data.outside_writer,
      }),
    };
  }
  let { code, reason, kind, limit, serverReason } = checkVersionPrecondition(response.status, response.data);
  let sessionScoped = code === "not_found" && response.sessionScoped === true;
  logFeatureBad("artifact_db_read", sessionScoped ? "not_found_session_scoped" : reason);
  return {
    kind: "error",
    code,
    ...(response.levelConfirmed !== undefined && {
      levelConfirmed: response.levelConfirmed,
    }),
    message: sessionScoped
      ? READ_SCOPE_NOT_FOUND_TEXT
      : formatDbWriteError(code, "read", kind, limit, undefined, undefined, serverReason),
    reason: sessionScoped ? "not_found_session_scoped" : reason,
  };
}
//@ chunk-jkpnfdxp.js:25231-25351 placement
function invalidDbWrite(result, message, suffix = "") {
  logFeatureBad("artifact_db_write", `${suffix}${result}`);
  return {
    kind: "error",
    code: "invalid_argument",
    message,
    reason: result,
  };
}
//@ chunk-jkpnfdxp.js:25351-25948 placement
async function validateCollectionPath(path, readCollection, suffix = "") {
  let { collection, docId } = path;
  if (!regExp_2.test(collection) || !regExp.test(docId))
    return {
      ok: false,
      result: invalidDbWrite(
        "invalid_segment",
        'collection must be a path of 1-15 "/"-separated segments and doc_id one segment (letters, digits, _ - . ~ : @ + per segment; "." and ".." reserved)',
        suffix,
      ),
    };
  if (!isCollectionPath(collection))
    return {
      ok: false,
      result: invalidDbWrite("parity", describeCollectionPathError(collection), suffix),
    };
  let usersMeRewriter = makeUsersMeRewriter(collection, docId);
  if (usersMeRewriter !== null) {
    let existingCollection = await readCollection();
    if (!existingCollection.ok) return existingCollection;
    ({ collection, docId } = usersMeRewriter(existingCollection.id));
  }
  let docPath = `${collection}/${docId}`;
  if (docPath.length > DB_LIST_LIMIT)
    return {
      ok: false,
      result: invalidDbWrite(
        "path_too_long",
        `the composed document path is ${docPath.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
        suffix,
      ),
    };
  return {
    ok: true,
    path: docPath,
  };
}
//@ chunk-jkpnfdxp.js:25948-26277 placement
/**
 * 把一次写操作（delete/set/update/str_replace）转成请求体：路径、数据、replace 标志、str_replace 字段与 idem，可带 ifVersion 乐观锁。
 */
function buildDbWriteOp(op, path, data, version, ifVersion) {
  let guard = ifVersion !== undefined && {
    ifVersion,
  };
  switch (op) {
    case "delete":
      return {
        path,
        ...guard,
      };
    case "set":
      return {
        path,
        data,
        replace: true,
        ...guard,
      };
    case "update":
      return {
        path,
        data,
        ...guard,
      };
    case "str_replace":
      return {
        path,
        field: version?.field,
        old_str: version?.oldStr,
        new_str: version?.newStr,
        ...(version?.replaceAll === true && {
          replace_all: true,
        }),
        idem: version?.idem,
        ...guard,
      };
  }
}
//@ chunk-jkpnfdxp.js:26277-26685 placement
async function validateWriteRequest(host, request, signal, storageV5, options) {
  let { slug, op, data, edit } = request;
  if (!ARTIFACT_SLUG_RE.test(slug)) return invalidDbWrite("invalid_slug", "not a valid artifact id");
  let result = await validateCollectionPath(request, () =>
    composeMeKey(host, "artifact_db_write", slug, signal, storageV5, options),
  );
  if (!result.ok) return result.result;
  return writeArtifactDocument(
    slug,
    op,
    result.path,
    data,
    signal,
    options,
    request.asLevel,
    edit,
    request.ifVersion,
    request.requireVersion === true && op !== "str_replace"
      ? {
          host,
          address: `${request.collection}/${request.docId}`,
        }
      : undefined,
    request.requestId !== undefined
      ? {
          host,
          id: request.requestId,
        }
      : undefined,
  );
}
//@ chunk-jkpnfdxp.js:26685-28224 placement
/**
 * 写单个文档（set/update/delete/str_replace），支持版本要求。
 */
async function writeArtifactDocument(
  operation,
  path,
  path_2,
  data,
  ifVersion,
  options,
  scope,
  slug,
  requestIdInfo,
  storageV5,
  credentials,
) {
  let cooldown = storageV5 !== undefined ? meAliasCooldown.of(storageV5.host) : undefined;
  let aliasUsable = cooldown !== undefined && !cooldown.unsupported;
  let response = await callArtifactDb(
    "artifact_db_write",
    operation,
    path,
    buildDbWriteOp(path, path_2, data, slug, requestIdInfo),
    {
      timeout: 30000,
      ...(scope !== undefined && {
        asLevel: scope,
      }),
      ...(aliasUsable && {
        requireVersion: true,
      }),
      ...(credentials !== undefined && {
        requestId: credentials,
      }),
      maxContentLength: STALE_PIN_NOTICE_CHARS,
      credentials: options,
    },
    ifVersion,
  );
  if (!response.ok) return response.result;
  if (aliasUsable && cooldown !== undefined && isInvalidArgumentBody(response.status, response.data)) {
    let fallback = await writeArtifactDocument(
      operation,
      path,
      path_2,
      data,
      ifVersion,
      options,
      scope,
      slug,
      requestIdInfo,
      undefined,
      credentials,
    );
    if (isRetryableDbResult(fallback)) {
      cooldown.refusedAt = Date.now();
      logFeatureSad("artifact_db_write", "require_version_unsupported");
    }
    return fallback;
  }
  if (response.status === 200) {
    let levelConfirmed = response.levelConfirmed !== undefined && {
      levelConfirmed: response.levelConfirmed,
    };
    let parsed = DB_WRITE_RESPONSE_SCHEMA().safeParse(response.data);
    if (!parsed.success) {
      logFeatureSad("artifact_db_write", "malformed_echo");
      return {
        kind: "ok",
        ...levelConfirmed,
      };
    }
    logFeatureOk("artifact_db_write");
    checkWriteUsageShape(response.data, parsed.data.usage);
    let responseWarnings = getResponseWarnings(response.data);
    return {
      kind: "ok",
      ...levelConfirmed,
      ...(parsed.data.version !== undefined && {
        version: parsed.data.version,
      }),
      ...(parsed.data.usage !== undefined && {
        usage: parsed.data.usage,
      }),
      ...(responseWarnings.length > 0 && {
        warnings: responseWarnings,
      }),
    };
  }
  let { code, reason, kind, limit, version, required, serverReason } = checkVersionPrecondition(
    response.status,
    response.data,
  );
  (isEditErrorCode(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", reason);
  return {
    kind: "error",
    code,
    ...(response.levelConfirmed !== undefined && {
      levelConfirmed: response.levelConfirmed,
    }),
    message:
      formatDbWriteError(
        code,
        "write",
        kind,
        limit,
        slug?.field,
        {
          pinned: requestIdInfo,
          current: version,
          op: path,
          required,
          path: storageV5?.address,
        },
        serverReason,
      ) +
      (NO_RETRY_WRITE_CODES.has(code) ? NOTHING_WRITTEN_SUFFIX : "") +
      (code === "invalid_argument" && (requestIdInfo !== undefined || slug?.replaceAll === true)
        ? `. If this server does not yet accept \`${requestIdInfo !== undefined ? "if_version" : "replace_all"}\`, that alone explains the refusal \u2014 nothing was written; retry without it only if an unconditional ${requestIdInfo !== undefined ? "write" : "single replacement"} is acceptable here`
        : ""),
    reason,
  };
}
//@ chunk-jkpnfdxp.js:28224-28486 placement
function isRetryableDbResult(result) {
  if (result.kind !== "error") return true;
  switch (result.code) {
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
//@ chunk-jkpnfdxp.js:28486-31385 placement
/**
 * 执行 write_db 的 batch：校验、发送、按需降级为逐条写入。
 */
async function writeArtifactDbBatch(host, request, signal, storageV5, scope) {
  let { slug, ops, asLevel } = request;
  if (!ARTIFACT_SLUG_RE.test(slug))
    return invalidDbWrite("invalid_slug", "not a valid artifact id", "batch_");
  if (ops.length === 0 || ops.length > MAX_BATCH_WRITES)
    return invalidDbWrite(
      "batch_size",
      `a batch takes 1-${MAX_BATCH_WRITES} writes \u2014 ${ops.length} were given`,
      "batch_",
    );
  let ensureAlias;
  let getMeKey = () =>
    (ensureAlias ??= composeMeKey(host, "artifact_db_write", slug, signal, storageV5, scope));
  let validatedOps = [];
  let seenPaths = new Set();
  for (let [index, op] of ops.entries()) {
    let validatedPath = await validateCollectionPath(op, getMeKey, "batch_");
    if (!validatedPath.ok)
      return {
        ...validatedPath.result,
        message: `write ${index + 1} of ${ops.length}: ${validatedPath.result.message}`,
      };
    if (seenPaths.has(validatedPath.path))
      return invalidDbWrite(
        "duplicate_path",
        `write ${index + 1} of ${ops.length} addresses ${validatedPath.path}, which an earlier write in this batch already addresses \u2014 a batch writes each document at most once`,
        "batch_",
      );
    seenPaths.add(validatedPath.path);
    validatedOps.push({
      op: op.op,
      path: validatedPath.path,
      ...(op.data !== undefined && {
        data: op.data,
      }),
      ...(op.ifVersion !== undefined && {
        ifVersion: op.ifVersion,
      }),
    });
  }
  let any = validatedOps.some((op) => op.ifVersion !== undefined);
  let body = {
    ops: validatedOps.map(({ op, path, data, ifVersion }) => ({
      op,
      ...buildDbWriteOp(op, path, data, undefined, ifVersion),
    })),
  };
  let response;
  try {
    response = Buffer.byteLength(
      jsonStringify({
        slug,
        verb: "batch",
        args: body,
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
  if (response > MAX_WRITE_BODY_BYTES)
    return invalidDbWrite(
      "batch_too_large",
      `the batch serializes to ${response} bytes \u2014 the limit for one request is ${MAX_WRITE_BODY_BYTES}; split it into smaller batches`,
      "batch_",
    );
  let idCooldown = meIdCooldown.of(host);
  let versionHost = request.requireVersion === true ? host : undefined;
  let requestIdHint =
    request.requestId !== undefined
      ? {
          host,
          id: request.requestId,
        }
      : undefined;
  if (idCooldown.unsupported && !any)
    return writeBatchSequentialFallback(
      slug,
      validatedOps,
      signal,
      scope,
      asLevel,
      versionHost,
      requestIdHint,
    );
  let aliasCooldown = meAliasCooldown.of(host);
  let aliasUsable = request.requireVersion === true && !aliasCooldown.unsupported;
  let sendOnce = (useAlias) =>
    callArtifactDb(
      "artifact_db_write",
      slug,
      "batch",
      body,
      {
        timeout: 60000,
        maxContentLength: STALE_PIN_NOTICE_CHARS,
        credentials: scope,
        ...(asLevel !== undefined && {
          asLevel,
        }),
        ...(useAlias && {
          requireVersion: true,
        }),
        ...(requestIdHint !== undefined && {
          requestId: requestIdHint,
        }),
      },
      signal,
    );
  let res = await sendOnce(aliasUsable);
  if (!res.ok) return res.result;
  if (aliasUsable && isInvalidArgumentBody(res.status, res.data)) {
    res = await sendOnce(false);
    if (!res.ok) return res.result;
    if (asLevel === undefined) {
      aliasCooldown.refusedAt = Date.now();
      logFeatureSad("artifact_db_write", "batch_require_version_unsupported");
    }
  }
  if (asLevel === undefined && isInvalidArgumentBody(res.status, res.data)) {
    idCooldown.refusedAt = Date.now();
    return any
      ? describeBatchPinnedUnsupported()
      : writeBatchSequentialFallback(
          slug,
          validatedOps,
          signal,
          scope,
          undefined,
          versionHost,
          requestIdHint,
        );
  }
  if (res.status === 200) {
    let levelConfirmed = res.levelConfirmed !== undefined && {
      levelConfirmed: res.levelConfirmed,
    };
    let parsed = DB_BATCH_RESPONSE_SCHEMA().safeParse(res.data);
    if (!parsed.success || parsed.data.results.length !== ops.length) {
      logFeatureSad("artifact_db_write", "malformed_batch_echo");
      return {
        kind: "ok",
        ...levelConfirmed,
        results: ops.map(() => ({})),
      };
    }
    logFeatureOk("artifact_db_write");
    checkWriteUsageShape(res.data, parsed.data.usage);
    let responseWarnings = getResponseWarnings(res.data);
    return {
      kind: "ok",
      ...levelConfirmed,
      results: parsed.data.results.map((result) =>
        result.version !== undefined
          ? {
              version: result.version,
            }
          : {},
      ),
      ...(parsed.data.usage !== undefined && {
        usage: parsed.data.usage,
      }),
      ...(responseWarnings.length > 0 && {
        warnings: responseWarnings,
      }),
    };
  }
  let { code, reason, kind, limit, version, index, required, serverReason } = checkVersionPrecondition(
    res.status,
    res.data,
  );
  (isEditErrorCode(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", `batch_${reason}`);
  let failedIndex = index !== undefined && index < validatedOps.length ? index : undefined;
  return {
    kind: "error",
    code,
    ...(res.levelConfirmed !== undefined && {
      levelConfirmed: res.levelConfirmed,
    }),
    message: splitOversizedBatch(code, kind, limit, {
      pinned: any,
      stale:
        failedIndex !== undefined
          ? {
              index: failedIndex,
              path: `${ops[failedIndex].collection}/${ops[failedIndex].docId}`,
              op: ops[failedIndex].op,
              ifVersion: ops[failedIndex].ifVersion,
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
//@ chunk-jkpnfdxp.js:31385-31846 placement
function describeBatchPinnedUnsupported() {
  logFeatureSad("artifact_db_write", "batch_pinned_unsupported");
  return {
    kind: "error",
    code: "invalid_argument",
    reason: "batch_pinned_unsupported",
    message: `db batch write failed (${toPublicDbErrorCode("invalid_argument")}): this server does not take batch writes yet (nor, most likely, \`if_version\`), and a batch with \`if_version\` pins is never applied one write at a time \u2014 nothing was written. Resend it without the pins only if unconditional writes are acceptable here`,
  };
}
//@ chunk-jkpnfdxp.js:31846-34831 placement
/**
 * 批量写入失败说明（超过 1 MiB、部分失败等）。
 */
function splitOversizedBatch(error, kind, limit, context) {
  if (error === "too_large")
    return `db batch write failed (${toPublicDbErrorCode(error)}): the batch body exceeds the server's 1 MiB request limit \u2014 nothing was written; split it into smaller write_db calls`;
  if (error === "version_mismatch" && context?.required === true) {
    let message = `db batch write failed (${toPublicDbErrorCode(error)})`;
    let out =
      "Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending";
    let stale = context.stale;
    return stale !== undefined
      ? `${message}: writes[${stale.index}] (write ${stale.index + 1} of ${stale.total}) targets ${stale.path}, which already exists, and carried no if_version \u2014 the whole batch wrote nothing. Read that document back, re-plan its ${stale.op === "delete" ? "delete (if it should still be deleted)" : "write on what it holds now"} with if_version set to the version the read returns, then resend the batch. ${"Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending"}`
      : `${message}: one of the writes targets a document that already exists and carried no if_version \u2014 the whole batch wrote nothing. Read the existing documents this batch writes, re-plan those entries on what they hold now with if_version set to the versions the reads return, then resend the batch`;
  }
  if (error === "version_mismatch") {
    let nothingWritten = `db batch write failed (${toPublicDbErrorCode(error)}): the batch is atomic, so nothing was written \u2014 none of the writes applied`;
    let stale = context?.stale;
    if (stale === undefined || stale.ifVersion === undefined)
      return `${nothingWritten}. A document one of the writes was pinned to with if_version is no longer at that version (or no longer exists). Re-read the pinned documents, re-plan those writes against what they hold now with fresh pins, then resend the batch`;
    let writeDesc = `writes[${stale.index}] (write ${stale.index + 1} of ${stale.total}, ${jsonStringify(stale.path)})`;
    let out2 =
      "It is the first stale pin the server met; later pinned entries were not checked, so re-read any pinned document you are unsure of too, then resend the batch";
    return context?.version !== undefined
      ? `${nothingWritten}. ${writeDesc} was pinned to version ${stale.ifVersion} and that document is now at version ${context.version}: read it back, re-plan its write against what it holds now and pin to that version. ${out2}`
      : `${nothingWritten}. ${writeDesc} was pinned to version ${stale.ifVersion} and that document has changed or may have been deleted (the server named no current version): read it back \u2014 if it still exists, re-plan its write against what it holds now and pin to its version; if it is gone, drop that entry, or re-create it with a "set" entry and no if_version only if it should exist again. ${out2}`;
  }
  let formatted = formatDbWriteError(
    error,
    "batch write",
    kind,
    limit,
    undefined,
    undefined,
    context?.serverReason,
  );
  let hints =
    error === "invalid_argument" && context?.pinned === true
      ? ". If this server does not yet accept `if_version` on batch writes, that alone explains the refusal \u2014 resend without the pins only if unconditional writes are acceptable here"
      : "";
  return isRecoverableStoreError(error)
    ? `${formatted}; the batch is atomic, so nothing was written${hints}`
    : `${formatted}; the batch's outcome is unknown \u2014 it applies all-or-nothing and may have committed; read back before retrying`;
}
//@ chunk-jkpnfdxp.js:34831-34878 placement
/**
 * 导出函数 `isRecoverableStoreError`：参数 e，返回 e !== "store_unavailable"。
 */
function isRecoverableStoreError(error) {
  return error !== "store_unavailable";
}
//@ chunk-jkpnfdxp.js:34878-36472 placement
/**
 * 批量写入不被支持时逐条顺序写入的回退。
 */
async function writeBatchSequentialFallback(
  operation,
  ops,
  operation_2,
  scope,
  storageV5,
  batchSlug,
  credentials,
) {
  logFeatureSad("artifact_db_write", "batch_fallback_sequential");
  let results = [];
  let failure;
  let committed = [];
  let error;
  let fail = (reason) =>
    storageV5 !== undefined && reason > 0 && error !== true
      ? ` (as_level '${storageV5}' unconfirmed for them \u2014 they may have run at your own level)`
      : "";
  let request =
    "this server does not take batch writes yet, so the batch was applied one write at a time and is NOT atomic";
  for (let [index, { op, path, data }] of ops.entries()) {
    let committedNote = `${index} ${index === 1 ? "entry" : "entries"} before it already committed`;
    let afterCount = ops.length - index - 1;
    let formatResult = (result) => ({
      kind: "error",
      code: "store_unavailable",
      reason: "batch_fallback_aborted",
      message: `${request}: interrupted at writes[${index}] (write ${index + 1} of ${ops.length}). The ${committedNote}${fail(index)}; writes[${index}] itself ${result ? "may or may not have applied" : "did not run"}; the ${afterCount} after it did not run.`,
      fallback: "sequential",
      results,
      failedIndex: index,
    });
    if (operation_2.aborted) return formatResult(false);
    let response;
    try {
      response = await writeArtifactDocument(
        operation,
        op,
        path,
        data,
        operation_2,
        scope,
        storageV5,
        undefined,
        undefined,
        batchSlug && {
          host: batchSlug,
          address: path,
        },
        credentials,
      );
    } catch (error) {
      if (isCancel(error)) return formatResult(true);
      if (error instanceof DbAbortError) return formatResult(false);
      throw error;
    }
    if (response.kind === "error")
      return {
        kind: "error",
        code: response.code,
        reason: response.reason,
        message: `${request}: writes[${index}] (write ${index + 1} of ${ops.length}) failed \u2014 ${response.message.replace(NOTHING_WRITTEN_SUFFIX, `; writes[${index}] was not applied`)}. The ${committedNote}${fail(index)}; the ${afterCount} after it did not run.`,
        fallback: "sequential",
        results,
        failedIndex: index,
      };
    results.push(
      response.version !== undefined
        ? {
            version: response.version,
          }
        : {},
    );
    failure = response.usage ?? (op === "delete" ? undefined : failure);
    for (let warning of response.warnings ?? [])
      if (committed.length < RETRY_ATTEMPTS && !committed.includes(warning)) committed.push(warning);
    if (response.levelConfirmed !== undefined) error = (error ?? true) && response.levelConfirmed;
  }
  return {
    kind: "ok",
    results,
    ...(failure !== undefined && {
      usage: failure,
    }),
    ...(committed.length > 0 && {
      warnings: committed,
    }),
    fallback: "sequential",
    ...(error !== undefined && {
      levelConfirmed: error,
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
  VERSION_MISMATCH_PREFIXES,
  VERSION_MISMATCH_TEXTS,
  isArtifactDbEnabled,
  clearMeIdCache,
  DB_QUERY_OPERATORS,
  DB_SYMBOL_OPERATORS,
};
