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
import { getSessionHintHeaders, findRejectedHintFields, yun, q5n, YFr } from "./requestMeta.js";
import { Kxe, buildFrameHeaders } from "./frameApi.js";
import { sleep } from "../../utils/sleep.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { describeArtifactAuthFailure } from "./frameFlags.js";
import { ARTIFACT_SLUG_RE } from "../../tools/ArtifactTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-0zqb2m0b.js:959-1011 placement
function isArtifactDbEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_DB ?? !0;
}
//@ chunk-0zqb2m0b.js:1011-1112 placement
function isArtifactDbStrReplaceEnabled() {
  return (
    isArtifactDbEnabled() &&
    (env.CLAUDE_CODE_ARTIFACT_DB_STR_REPLACE ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_stile", !1)) === !0
  );
}
//@ chunk-0zqb2m0b.js:1112-1149 placement
var ARTIFACT_DB_API_PATH = "/api/frame/db/agent",
  Le = 5000;
//@ chunk-0zqb2m0b.js:1149-1169 placement
class j extends AbortError {}
//@ chunk-0zqb2m0b.js:1169-1293 placement
var DB_SEGMENT_PATTERN = String.raw`(?!\.\.?(?:/|$))[A-Za-z0-9_\-.~:@+]{1,200}`,
  regExp = new RegExp(`^${DB_SEGMENT_PATTERN}$`),
  regExp_2 = new RegExp(`^${DB_SEGMENT_PATTERN}(?:/${DB_SEGMENT_PATTERN}){0,14}$`);
//@ chunk-0zqb2m0b.js:1293-1335 placement
function isCollectionPath(e) {
  return (countCharInString(e, "/") + 1) % 2 === 1;
}
//@ chunk-0zqb2m0b.js:1335-2026 placement
function describeCollectionPathError(e) {
  let t = (o) => (o.length > 120 ? `${o.slice(0, 60)}\u2026${o.slice(-40)}` : o),
    parts = e.split("/"),
    c = parts.length,
    s = t(parts.slice(0, -1).join("/")),
    l = t(parts[c - 1]);
  return `collection '${t(e)}' has ${c} segments, which makes it a document path, not a collection: collection paths have an odd number of segments (collection/document/collection/\u2026) and the document is collection + doc_id. For that document use collection '${s}' with doc_id '${l}'; for a collection inside it, add one more segment. Per-user data follows the same rule \u2014 collection 'data/users/<id>' (3 segments) holds that user's documents, so 'data/users/<id>/decks' is one document and 'data/users/<id>/decks/cards' a collection.`;
}
//@ chunk-0zqb2m0b.js:2026-2159 placement
var DB_LIST_LIMIT = 1000,
  jZe = ["get", "list", "query"],
  C_e = ["set", "update", "delete"],
  STR_REPLACE = "str_replace",
  Ht = [...C_e, STR_REPLACE],
  WZe = ["view", "interact", "admin"];
//@ chunk-0zqb2m0b.js:2159-2210 placement
function U2s() {
  return randomBytes(16).toString("base64url");
}
//@ chunk-0zqb2m0b.js:2210-2461 placement
var MAX_EDITS_PER_CALL = 200,
  L5n = /^(?!__.*__$)[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}"\\./[\]]{1,200}$/u,
  X9 = 262144,
  mbt = 4 * X9,
  Pe = 4194304,
  re = 16384,
  Zcn = 1000,
  T0o = 100,
  hF = 50,
  H5n = 1048576,
  le = ["edit_no_match", "edit_ambiguous", "edit_field_missing", "edit_field_not_string", "version_mismatch"];
//@ chunk-0zqb2m0b.js:2461-2503 placement
function ne(e) {
  return le.some((t) => t === e);
}
//@ chunk-0zqb2m0b.js:2503-3262 placement
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
    ...le.map((e) => [e, e]),
  ]),
  He = new Set([
    "an OAuth access token is required",
    "a directly presented OAuth access token is required",
    "db verbs require a user-scoped OAuth token, not an org service key",
  ]);
//@ chunk-0zqb2m0b.js:3262-3494 placement
function classifyCredential403(e, t) {
  if (e !== 403 || typeof t !== "string") return;
  let trimmed = t.trim();
  if (He.has(trimmed)) return { code: "credential_rejected", reason: "custody_403" };
  if (trimmed.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX))
    return { code: "cloud_unavailable", reason: "ccr_credential_refused" };
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
/**
 * 把内部数据库错误码归并成对模型公开的错误码（invalid_argument/resource_exhausted/quota_exceeded/unavailable，编辑类与版本冲突原样保留）。
 */
//@ chunk-0zqb2m0b.js:3746-4230 placement
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
/**
 * artifact 数据库查询支持的比较运算符：英文名列表、符号写法，以及符号到英文名的映射。
 */
//@ chunk-0zqb2m0b.js:4230-4402 placement
var DB_QUERY_OPERATORS = ["eq", "ne", "in", "not-in", "lt", "lte", "gt", "gte", "array-contains"],
  DB_SYMBOL_OPERATORS = ["==", "!=", "<", "<=", ">", ">="],
  SYMBOL_TO_DB_OPERATOR = { "==": "eq", "!=": "ne", "<": "lt", "<=": "lte", ">": "gt", ">=": "gte" };
//@ chunk-0zqb2m0b.js:4402-4444 placement
function Ue(e) {
  return Object.hasOwn(SYMBOL_TO_DB_OPERATOR, e);
}
//@ chunk-0zqb2m0b.js:4444-4480 placement
function Ke(e) {
  return Ue(e) ? SYMBOL_TO_DB_OPERATOR[e] : e;
}
/**
 * 数据库响应的 schema 集合：单文档读取、文档列表、用量（文档数/上限），以及可选布尔字段 authoredByOthers/outside_writer。
 */
//@ chunk-0zqb2m0b.js:4480-5030 placement
var optionalTrueSchema = DoctorLazy(() =>
    create_25(!0)
      .optional()
      .catch(void 0),
  ),
  optionalBooleanSchema = DoctorLazy(() =>
    create_6()
      .optional()
      .catch(void 0),
  ),
  DB_GET_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      exists: create_6(),
      data: create_20(create_2(), create_12()).optional(),
      version: create_3().int().optional(),
      updatedAt: create_2().optional(),
      authoredByOthers: optionalTrueSchema(),
      outside_writer: optionalBooleanSchema(),
    }),
  ),
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
      outside_writer: optionalBooleanSchema(),
    }),
  ),
  DB_USAGE_SCHEMA = DoctorLazy(() =>
    create({
      documents: create_3().int().safe().nonnegative(),
      maxDocuments: create_3().int().safe().positive(),
    })
      .optional()
      .catch(void 0),
  );
//@ chunk-0zqb2m0b.js:5030-5151 placement
function checkWriteUsageShape(e, t) {
  if (t === void 0 && typeof e === "object" && e !== null && e.usage !== void 0)
    logFeatureSad("artifact_db_write", "malformed_usage");
}
//@ chunk-0zqb2m0b.js:5151-5167 placement
var pe = 4,
  Ge = 600;
//@ chunk-0zqb2m0b.js:5167-5394 placement
function getResponseWarnings(e) {
  let t = e !== null && typeof e === "object" ? e.warnings : void 0;
  if (!Array.isArray(t)) return [];
  let r = [];
  for (let c of t) {
    if (r.length >= pe) break;
    if (typeof c !== "string") continue;
    let s = sanitizeDisplayTextOrUndefined(c, Ge);
    if (s !== void 0) r.push(s);
  }
  return r;
}
//@ chunk-0zqb2m0b.js:5394-5639 placement
var DB_WRITE_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({ version: create_3().int().optional(), usage: DB_USAGE_SCHEMA() }),
  ),
  DB_BATCH_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      results: create_15(create({ version: create_3().int().optional() })),
      usage: DB_USAGE_SCHEMA(),
    }),
  ),
  DB_INVALID_ARGUMENT_SCHEMA = DoctorLazy(() =>
    create({
      error: create({
        code: create_25("invalid_argument"),
        message: create_25("invalid argument"),
        verb: create_9().optional(),
      }),
    }),
  );
//@ chunk-0zqb2m0b.js:5639-5697 placement
function U(e, t) {
  return e === 400 && DB_INVALID_ARGUMENT_SCHEMA().safeParse(t).success;
}
//@ chunk-0zqb2m0b.js:5697-5802 placement
class RefusalCooldown {
  refusedAt = void 0;
  get unsupported() {
    return this.refusedAt !== void 0 && Date.now() - this.refusedAt < Ze;
  }
}
//@ chunk-0zqb2m0b.js:5802-5878 placement
var Ze = 3600000,
  A0o = new HostScoped(() => new RefusalCooldown()),
  we = new HostScoped(() => new RefusalCooldown()),
  Qe = new HostScoped(() => new RefusalCooldown());
//@ chunk-0zqb2m0b.js:5878-5971 placement
function et(e, t) {
  if (!U(e, t)) return !1;
  let { reason: reason } = t.error;
  return reason === void 0 || reason === "bad_json";
}
//@ chunk-0zqb2m0b.js:5971-6248 placement
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
  ),
  ve = new Set(["docs_per_collection", "docs_per_database", "databases_per_org"]);
//@ chunk-0zqb2m0b.js:6248-6281 placement
function W2s(e) {
  return ve.has(e);
}
//@ chunk-0zqb2m0b.js:6281-6448 placement
var QUOTA_REASONS_BY_CODE = {
  quota_exceeded: new Set([...ve, "bytes_per_database"]),
  quota_or_rate: new Set([
    "active_leases",
    "rate_limited",
    "write_capacity",
    "scan_budget",
    "response_budget",
  ]),
};
//@ chunk-0zqb2m0b.js:6448-6505 placement
function nt(e, t) {
  let r = QUOTA_REASONS_BY_CODE[e];
  return r !== void 0 && r.has(t);
}
//@ chunk-0zqb2m0b.js:6505-6586 placement
function ie(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e > 0 ? e : void 0;
}
//@ chunk-0zqb2m0b.js:6586-6668 placement
function at(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0 ? e : void 0;
}
//@ chunk-0zqb2m0b.js:6668-6698 placement
var ot = /^[a-z][a-z_-]{0,63}$/;
//@ chunk-0zqb2m0b.js:6698-7266 placement
function checkVersionPrecondition(e, t) {
  let r = classifyCredential403(e, t);
  if (r !== void 0) return r;
  let safeParse = DbErrorBodySchema().safeParse(t),
    s = safeParse.success ? safeParse.data.error : void 0,
    l = s?.code,
    o = l !== void 0 ? DB_ERROR_CODES.get(l) : void 0;
  if (l !== void 0 && o !== void 0) {
    let d = s?.kind;
    if (nt(o, d)) return { code: o, reason: d, kind: d, limit: ie(s?.limit) };
    let h = o === "version_mismatch" && s?.required === !0,
      u = typeof s?.reason === "string" && ot.test(s.reason) ? s.reason : void 0;
    return {
      code: o,
      reason: h ? "version_required" : l.replace(/-/g, "_"),
      ...(ne(o) && { version: ie(s?.version), index: at(s?.index), ...(h && { required: !0 }) }),
      ...(u !== void 0 && { serverReason: u }),
    };
  }
  let n = classifyDbHttpStatus(e);
  return { code: n, reason: n };
}
//@ chunk-0zqb2m0b.js:7266-7577 placement
var VERSION_MISMATCH_PREFIXES = [
    `db write failed (${toPublicDbErrorCode("version_mismatch")}): `,
    `db batch write failed (${toPublicDbErrorCode("version_mismatch")}): `,
  ],
  C0o = {
    write: "Not saved: Claude needs to read the latest version of this document before changing it.",
    delete: "Not deleted: Claude needs to read the latest version of this document before deleting it.",
  };
/**
 * 生成文档写入错误说明（字段、版本冲突、编辑未匹配/不唯一等，约 5 KB）。
 */
//@ chunk-0zqb2m0b.js:7577-12816 placement
function formatDbWriteError(e, t, r, c, s, l, o) {
  let n = `field '${s ?? "?"}'`,
    d = l?.current !== void 0 ? ` The document is at version ${l.current}.` : "",
    h = l?.pinned !== void 0 && l.current === l.pinned,
    u = `db ${t} failed (${toPublicDbErrorCode(e)})`;
  switch (e) {
    case "not_found":
      return `${u}: no such artifact, collection, or document (or no access \u2014 the two are deliberately indistinguishable)`;
    case "invalid_argument":
      return `${u}: the server could not accept the request as shaped${o !== void 0 ? ` (reason: ${o})` : ""}`;
    case "too_large":
      return `${u}: the request body exceeds the server's size limit \u2014 send less per call`;
    case "quota_or_rate":
      return `${u}: ${formatDbLimitError(r, c) ?? "over a rate or storage limit \u2014 retry later or write less"}`;
    case "quota_exceeded":
      return `${u}: ${formatDbLimitError(r, c) ?? "a storage limit on this artifact's database has been reached \u2014 delete documents; retrying won't help"}`;
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
      if (l?.required === !0) {
        let R = l.path ?? "that document",
          k =
            "Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns";
        switch (l.op) {
          case "delete":
            return `${u}: ${R} is an existing document and this delete carried no if_version \u2014 nothing was deleted. Read it back and, if it should still be deleted, resend the delete with if_version set to the version that read returns`;
          case "update":
            return `${u}: ${R} is an existing document and this update carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
          default:
            return `${u}: ${R} already exists and this write carried no if_version \u2014 nothing was written. ${"Read it back with read_db, base the change on what it holds now, and resend with if_version set to the version that read returns"}`;
        }
      }
      return l?.current !== void 0
        ? `${u}: the document is no longer at version ${l.pinned ?? "?"}, the one this write was pinned to \u2014 it is now at version ${l.current}; nothing was written. Read it back, re-plan the write against what it holds now, and pin to that version`
        : `${u}: the document is no longer at version ${l?.pinned ?? "?"}, the one this write was pinned to \u2014 it has changed or may have been deleted; nothing was written. Read it back: if it still exists, re-plan the write against what it holds now and pin to its version; if it is gone, ${l?.op === "delete" ? "a delete has nothing left to do" : 're-create it with a "set" and no if_version only if it should exist again'}`;
  }
}
//@ chunk-0zqb2m0b.js:12816-14127 placement
function formatDbLimitError(e, t) {
  let r = t === void 0 ? "document limit" : `limit of ${t} documents`,
    c = t === void 0 ? "storage limit" : `storage limit of ${formatBytesDecimal(t)}`;
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
    case void 0:
      return;
  }
}
//@ chunk-0zqb2m0b.js:14127-14192 placement
var DATA_USERS_ME = "data/users/me",
  WHOAMI = "whoami",
  it = DoctorLazy(() => create({ id: create_2().min(1) }));
//@ chunk-0zqb2m0b.js:14192-14227 placement
function ke(e, t) {
  return `${e}:${t}`;
}
//@ chunk-0zqb2m0b.js:14227-14280 placement
function K() {
  return plannedRoute("POST", ARTIFACT_DB_API_PATH, "bound") === "relay";
}
//@ chunk-0zqb2m0b.js:14280-14378 placement
async function st(e, t) {
  if (K()) return null;
  let r = (await getGatewayAccountInfoAsync(t))?.accountUuid;
  return r ? ke(r, e) : null;
}
//@ chunk-0zqb2m0b.js:14378-14477 placement
async function ee(e, t, r) {
  let c = await readFreshOauthAccountFromDisk(r);
  return c?.accountUuid !== void 0 && ke(c.accountUuid, e) === t;
}
//@ chunk-0zqb2m0b.js:14477-14554 placement
function te() {
  let Authorization = getAuthHeaders().headers.Authorization;
  return Authorization === void 0 ? null : hashCredential(Authorization);
}
//@ chunk-0zqb2m0b.js:14554-14650 placement
async function Re(e) {
  if (!hasApiClient()) return;
  for (let t = 0; t < 2; t++)
    try {
      await checkAndRefreshOAuthTokenIfNeeded({ credentials: e });
    } catch {}
}
//@ chunk-0zqb2m0b.js:14650-14732 placement
function z2s(e) {
  let { resolvedMeIds: resolvedMeIds, inFlightMeIds: inFlightMeIds } = Ae.of(e);
  (resolvedMeIds.clear(), inFlightMeIds.clear());
}
//@ chunk-0zqb2m0b.js:14732-14859 placement
function makeUsersMeRewriter(e, t) {
  if (e === DATA_USERS_ME || e.startsWith(DATA_USERS_ME + "/"))
    return (r) => ({ collection: "data/users/" + r + e.slice(DATA_USERS_ME.length), docId: t });
  return null;
}
//@ chunk-0zqb2m0b.js:14859-14892 placement
var P = Symbol("contested-me-key");
//@ chunk-0zqb2m0b.js:14892-14945 placement
class Ee {
  resolvedMeIds = new Map();
  inFlightMeIds = new Map();
}
//@ chunk-0zqb2m0b.js:14945-14970 placement
var Ae = new HostScoped(() => new Ee());
//@ chunk-0zqb2m0b.js:14970-15406 placement
function resolveWhoamiKey(e, t, r, c, s) {
  if (t === "malformed_whoami_echo")
    return `db ${r} failed (unavailable): resolving 'me' returned an unreadable response \u2014 the artifact db service may need an update`;
  if (e === "not_declared")
    return `db ${r} failed (${toPublicDbErrorCode(e)}): resolving 'me' needs this artifact's published version to declare the db and user capabilities \u2014 republish with both declared, then retry`;
  return (
    formatDbWriteError(e, r, c, s) +
    (r === "write" && NO_RETRY_WRITE_CODES.has(e) ? NOTHING_WRITTEN_SUFFIX : "")
  );
}
//@ chunk-0zqb2m0b.js:15406-15518 placement
var NOTHING_WRITTEN_SUFFIX = "; nothing was written",
  NO_RETRY_WRITE_CODES = new Set(["too_large", "credential_rejected", "cloud_unavailable", "network_off"]);
//@ chunk-0zqb2m0b.js:15518-16377 placement
async function composeMeKey(e, t, r, c, s, l) {
  let of = Ae.of(e),
    { resolvedMeIds: resolvedMeIds, inFlightMeIds: inFlightMeIds } = of,
    h = await st(r, l),
    u = null;
  if (h !== null && (resolvedMeIds.has(h) || inFlightMeIds.has(h))) {
    if (await ee(r, h, s)) {
      if (resolvedMeIds.has(h)) await Re(l);
      u = h;
    }
  }
  let R = u === null ? void 0 : resolvedMeIds.get(u);
  if (u !== null && R !== void 0 && !K()) {
    if (R.fingerprint === te()) return { ok: !0, id: R.id };
    if (resolvedMeIds.get(u) === R) resolvedMeIds.delete(u);
  }
  let k;
  if (h === null) k = await describeWhoamiFailure(of, t, r, c, h, s, l);
  else {
    let a = u === null ? void 0 : inFlightMeIds.get(u);
    if (!a)
      ((a = (async () => {
        if (!(await ee(r, h, s))) return (logFeatureSad(t, "contested_me_key"), P);
        return describeWhoamiFailure(of, t, r, c, h, s, l);
      })()),
        inFlightMeIds.set(h, a),
        a
          .finally(() => {
            if (inFlightMeIds.get(h) === a) inFlightMeIds.delete(h);
          })
          .catch(() => {}));
    let w = await a;
    k = w === P ? await describeWhoamiFailure(of, t, r, c, null, s, l) : w;
  }
  if (k.ok) return k;
  if ("composed" in k) return { ok: !1, result: k.composed };
  let y = t === "artifact_db_read" ? "read" : "write";
  return (
    logFeatureBad(t, k.reason),
    {
      ok: !1,
      result: {
        kind: "error",
        code: k.code,
        message: resolveWhoamiKey(k.code, k.reason, y, k.kind, k.limit),
        reason: k.reason,
      },
    }
  );
}
//@ chunk-0zqb2m0b.js:16377-17097 placement
async function describeWhoamiFailure(e, t, r, c, s, l, o) {
  let n = null;
  if (s !== null) {
    if ((await Re(o), (n = te()), n === null || K())) return P;
  }
  let d = await callArtifactDb(
    t,
    r,
    WHOAMI,
    {},
    { timeout: 15000, maxContentLength: re, credentials: o, reportSentAuth: s !== null },
    c,
  );
  if (!d.ok) return { ok: !1, composed: d.result };
  if (d.status !== 200) {
    let { code: code, reason: reason, kind: kind, limit: limit } = checkVersionPrecondition(d.status, d.data);
    return { ok: !1, code: code, reason: `whoami_${reason}`, kind: kind, limit: limit };
  }
  let safeParse = it().safeParse(d.data);
  if (!safeParse.success || !regExp.test(safeParse.data.id))
    return { ok: !1, code: "store_unavailable", reason: "malformed_whoami_echo" };
  if (s !== null) {
    if (n === null || n !== d.sentAuthFingerprint || n !== te() || !(await ee(r, s, l)))
      return (logFeatureSad(t, "auth_unstable_me_key"), P);
    if (K()) return P;
    e.resolvedMeIds.set(s, { id: safeParse.data.id, fingerprint: n });
  }
  return { ok: !0, id: safeParse.data.id };
}
/**
 * 调用 Artifact DB 接口（读/写/批量），处理中继、作用域、错误分类（约 4 KB）。
 */
//@ chunk-0zqb2m0b.js:17097-21118 placement
async function callArtifactDb(e, t, r, c, s, l) {
  let o = r === "batch" ? "batch_" : "",
    n = r === WHOAMI,
    d = e === "artifact_db_read" ? "read" : "write",
    h = s.requestId !== void 0 ? Qe.of(s.requestId.host) : void 0,
    u = {
      slug: t,
      verb: r,
      args: c,
      ...(s.asLevel !== void 0 && { asLevel: s.asLevel }),
      ...(s.requireVersion === !0 && { requireVersion: !0 }),
      ...(e === "artifact_db_write" && !n && getSessionHintHeaders()),
      ...(e === "artifact_db_write" &&
        !n &&
        s.requestId !== void 0 &&
        h !== void 0 &&
        !h.unsupported &&
        Kxe(s.requestId.id)),
    },
    R = () =>
      frameApi.postRelayBound(ARTIFACT_DB_API_PATH, u, {
        refreshOAuth: !0,
        credentials: s.credentials,
        headers: buildFrameHeaders(),
        timeout: s.timeout,
        maxContentLength: s.maxContentLength,
        signal: l,
        reportSentAuth: s.reportSentAuth,
      }),
    k = !1,
    y = async () => {
      let w = await R();
      if (w.ok && w.gatewayRetryAfterMs !== void 0 && !k) {
        if (
          ((k = !0),
          await sleep(Math.min(w.gatewayRetryAfterMs, Le), l, { abortError: () => new j() }),
          (w = await R()),
          w.ok && w.route === "relay" && w.fromFrame)
        )
          logFeatureSad(e, `${o}${n ? "whoami_" : ""}relay_busy_recovered`);
      }
      return w;
    },
    a;
  try {
    a = await y();
    let w = a.ok && a.fromFrame ? findRejectedHintFields(a.status, a.data, u) : [];
    if (w.length > 0) {
      if (w.includes("request_id") && h !== void 0)
        (logFeatureSad(e, `${o}request_id_rejected`), (h.refusedAt = Date.now()));
      if (yun(w)) (logFeatureSad(e, `${o}session_hints_rejected`), q5n());
      ((u = Uo(u, yun(w) ? YFr : w)), (a = await y()));
    }
    if (h !== void 0 && u.request_id !== void 0 && a.ok && a.fromFrame && et(a.status, a.data)) {
      let { request_id: request_id, ...S } = u;
      if (((u = S), (a = await y()), a.ok && a.fromFrame && a.status >= 200 && a.status < 300))
        ((h.refusedAt = Date.now()), logFeatureSad(e, `${o}request_id_unsupported`));
    }
  } catch (error) {
    if (isCancel(error) || error instanceof j) throw error;
    let D = e !== "artifact_db_read" && !n && threwOnRelayLeg(error);
    return (
      logFeatureBad(e, `${o}${D ? "relay_request_error" : "request_error"}`),
      {
        ok: !1,
        result: {
          kind: "error",
          code: "store_unavailable",
          message: D
            ? "db write outcome unknown (relay request failed) \u2014 it may have applied; read back before retrying"
            : `db ${d} failed (network error)`,
          reason: D ? "relay_request_error" : "request_error",
        },
      }
    );
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable" || a.reason === "relay-not-served") {
      let w = `${n ? "whoami_" : ""}${a.reason.replace(/-/g, "_")}`;
      return (
        logFeatureBad(e, `${o}${w}`, { status: a.status }),
        {
          ok: !1,
          result: {
            kind: "error",
            code: "store_unavailable",
            message: `db ${d} failed (${toPublicDbErrorCode("store_unavailable")}): ${n ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection did not carry the request${a.status ? ` (HTTP ${a.status})` : ""}, so nothing ran; this says nothing about the artifact or its data, and if the user has access, Claude Code on their own machine can still read and edit it${d === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`,
            reason: w,
          },
        }
      );
    }
    return (
      logFeatureBad(e, `${o}${a.reason.replace(/-/g, "_")}`),
      {
        ok: !1,
        result: {
          kind: "error",
          code: "store_unavailable",
          message:
            a.reason === "no-auth"
              ? describeArtifactAuthFailure(a.detail)
              : `db ${d} unavailable: ${a.reason}`,
          reason: "transport",
        },
      }
    );
  }
  if (a.gatewayPolicy === "network-off") {
    let w = n ? "whoami_network_off" : "network_off";
    return (
      logFeatureSad(e, `${o}${w}`),
      {
        ok: !1,
        result: {
          kind: "error",
          code: "network_off",
          message: n
            ? resolveWhoamiKey("network_off", w, d)
            : formatDbWriteError("network_off", d) + (d === "write" ? NOTHING_WRITTEN_SUFFIX : ""),
          reason: w,
        },
      }
    );
  }
  if (a.gatewayRetryAfterMs !== void 0) {
    let w = `${n ? "whoami_" : ""}relay_busy_retried`,
      D = r === STR_REPLACE;
    return (
      logFeatureBad(e, `${o}${w}`, { status: a.status }),
      {
        ok: !1,
        result: {
          kind: "error",
          code: "store_unavailable",
          message: `db ${d} failed (${toPublicDbErrorCode("store_unavailable")}): ${n ? "resolving 'me' failed \u2014 " : ""}this cloud session's artifact connection was temporarily unavailable (HTTP ${a.status}, after one retry); ${D ? "the edit may or may not have applied \u2014 read it back before retrying" : `this is transient and nothing ran \u2014 retry shortly${d === "write" ? NOTHING_WRITTEN_SUFFIX : ""}`}`,
          reason: w,
        },
      }
    );
  }
  if (!a.fromFrame)
    return (
      logFeatureBad(e, `${o}${n ? "whoami_relay_error" : "relay_error"}`, { status: a.status }),
      {
        ok: !1,
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
      }
    );
  return {
    ok: !0,
    status: a.status,
    data: a.data,
    sentAuthFingerprint: a.sentAuthFingerprint,
    ...(a.route === "relay" &&
      a.response.headers?.[X_FRAME_RELAY_READ_SCOPE_APPLIED] === "session" && { sessionScoped: !0 }),
    ...(s.asLevel !== void 0 && { levelConfirmed: getAsLevel(a.data) === s.asLevel }),
  };
}
//@ chunk-0zqb2m0b.js:21118-21464 placement
var X_FRAME_RELAY_READ_SCOPE_APPLIED = "x-frame-relay-read-scope-applied",
  ut = `db read failed (${toPublicDbErrorCode("not_found")}): nothing this session can read at that address \u2014 with the organization's cloud network access turned off, this session can read the data only of artifacts it published itself (or there is no such artifact, collection, or document); do not retry the read here`;
//@ chunk-0zqb2m0b.js:21464-21711 placement
function getAsLevel(e) {
  if (e === null || typeof e !== "object") return;
  let t = Reflect.get(e, "asLevel");
  if (typeof t === "string") return t;
  let r = Reflect.get(e, "error"),
    c = r !== null && typeof r === "object" ? Reflect.get(r, "asLevel") : void 0;
  return typeof c === "string" ? c : void 0;
}
/**
 * 执行 read_db 动作：get/list/query 文档。
 */
//@ chunk-0zqb2m0b.js:21711-25152 placement
async function readArtifactDb(e, t, r, c, s) {
  let { slug: slug, op: op, query: query } = t,
    { collection: collection, docId: docId } = t;
  if (!ARTIFACT_SLUG_RE.test(slug))
    return (
      logFeatureBad("artifact_db_read", "invalid_slug"),
      { kind: "error", code: "invalid_argument", message: "not a valid artifact id", reason: "invalid_slug" }
    );
  if (!regExp_2.test(collection) || (docId !== void 0 && !regExp.test(docId)))
    return (
      logFeatureBad("artifact_db_read", "invalid_segment"),
      {
        kind: "error",
        code: "invalid_argument",
        message:
          'collection must be a path of 1-15 "/"-separated segments and doc_id one segment (letters, digits, _ - . ~ : @ + per segment; "." and ".." reserved)',
        reason: "invalid_segment",
      }
    );
  if (!isCollectionPath(collection))
    return (
      logFeatureBad("artifact_db_read", "parity"),
      {
        kind: "error",
        code: "invalid_argument",
        message: describeCollectionPathError(collection),
        reason: "parity",
      }
    );
  if (op === "get" && docId === void 0)
    return (
      logFeatureBad("artifact_db_read", "missing_doc_id"),
      {
        kind: "error",
        code: "invalid_argument",
        message: "doc_id is required for a get",
        reason: "missing_doc_id",
      }
    );
  let u = makeUsersMeRewriter(collection, docId),
    R;
  if (u !== null) {
    let b = await composeMeKey(e, "artifact_db_read", slug, r, c, s);
    if (!b.ok) return b.result;
    ((R = b.id), ({ collection: collection, docId: docId } = u(b.id)));
  }
  let k = docId !== void 0 ? `${collection}/${docId}` : collection;
  if (k.length > DB_LIST_LIMIT)
    return (
      logFeatureBad("artifact_db_read", "path_too_long"),
      {
        kind: "error",
        code: "invalid_argument",
        message: `the composed document path is ${k.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
        reason: "path_too_long",
      }
    );
  let y =
      op === "get"
        ? { path: k }
        : {
            collection: collection,
            ...(query?.limit !== void 0 && { limit: query.limit }),
            ...(query?.cursor !== void 0 && { cursor: query.cursor }),
            ...(op === "query" &&
              query?.where !== void 0 && {
                where: query.where.map(([b, E, B]) => ({ field: b, op: Ke(E), value: B })),
              }),
            ...(op === "query" &&
              query?.order_by !== void 0 && {
                orderBy: {
                  field: query.order_by.field,
                  ...(query.order_by.direction !== void 0 && { direction: query.order_by.direction }),
                },
              }),
          },
    a = await callArtifactDb(
      "artifact_db_read",
      slug,
      op,
      y,
      {
        timeout: 15000,
        maxContentLength: Pe,
        credentials: s,
        ...(t.asLevel !== void 0 && { asLevel: t.asLevel }),
      },
      r,
    );
  if (!a.ok) return a.result;
  if (a.status === 200) {
    if (op === "get") {
      let safeParse = DB_GET_RESPONSE_SCHEMA().safeParse(a.data);
      if (!safeParse.success)
        return (
          logFeatureBad("artifact_db_read", "malformed_echo"),
          {
            kind: "error",
            code: "store_unavailable",
            message: "db read returned an unreadable response \u2014 try again",
            reason: "malformed_echo",
          }
        );
      let B = {
        ...(a.levelConfirmed !== void 0 && { levelConfirmed: a.levelConfirmed }),
        ...(R !== void 0 && { meId: R }),
      };
      if (!safeParse.data.exists)
        return (logFeatureSad("artifact_db_read", "not_found"), { kind: "not_found", ...B });
      return (
        logFeatureOk("artifact_db_read"),
        {
          kind: "ok",
          ...B,
          docs: [
            {
              id: docId ?? "",
              data: safeParse.data.data ?? {},
              ...(safeParse.data.version !== void 0 && { version: safeParse.data.version }),
              ...(safeParse.data.updatedAt !== void 0 && { updatedAt: safeParse.data.updatedAt }),
            },
          ],
          ...(safeParse.data.version !== void 0 && { version: safeParse.data.version }),
          ...(safeParse.data.authoredByOthers && { authoredByOthers: !0 }),
          ...(safeParse.data.outside_writer !== void 0 && { outsideWriter: safeParse.data.outside_writer }),
        }
      );
    }
    let safeParse = DB_LIST_RESPONSE_SCHEMA().safeParse(a.data);
    if (!safeParse.success)
      return (
        logFeatureBad("artifact_db_read", "malformed_echo"),
        {
          kind: "error",
          code: "store_unavailable",
          message: "db read returned an unreadable response \u2014 try again",
          reason: "malformed_echo",
        }
      );
    return (
      logFeatureOk("artifact_db_read"),
      {
        kind: "ok",
        ...(a.levelConfirmed !== void 0 && { levelConfirmed: a.levelConfirmed }),
        ...(R !== void 0 && { meId: R }),
        docs: safeParse.data.docs,
        ...(safeParse.data.nextCursor !== void 0 &&
          safeParse.data.nextCursor !== "" && { nextCursor: safeParse.data.nextCursor }),
        ...(safeParse.data.authoredByOthers && { authoredByOthers: !0 }),
        ...(safeParse.data.outside_writer !== void 0 && { outsideWriter: safeParse.data.outside_writer }),
      }
    );
  }
  let {
      code: code,
      reason: reason,
      kind: kind,
      limit: limit,
      serverReason: serverReason,
    } = checkVersionPrecondition(a.status, a.data),
    A = code === "not_found" && a.sessionScoped === !0;
  return (
    logFeatureBad("artifact_db_read", A ? "not_found_session_scoped" : reason),
    {
      kind: "error",
      code: code,
      ...(a.levelConfirmed !== void 0 && { levelConfirmed: a.levelConfirmed }),
      message: A ? ut : formatDbWriteError(code, "read", kind, limit, void 0, void 0, serverReason),
      reason: A ? "not_found_session_scoped" : reason,
    }
  );
}
//@ chunk-0zqb2m0b.js:25152-25272 placement
function invalidDbWrite(e, t, r = "") {
  return (
    logFeatureBad("artifact_db_write", `${r}${e}`),
    { kind: "error", code: "invalid_argument", message: t, reason: e }
  );
}
//@ chunk-0zqb2m0b.js:25272-25869 placement
async function validateCollectionPath(e, t, r = "") {
  let { collection: collection, docId: docId } = e;
  if (!regExp_2.test(collection) || !regExp.test(docId))
    return {
      ok: !1,
      result: invalidDbWrite(
        "invalid_segment",
        'collection must be a path of 1-15 "/"-separated segments and doc_id one segment (letters, digits, _ - . ~ : @ + per segment; "." and ".." reserved)',
        r,
      ),
    };
  if (!isCollectionPath(collection))
    return { ok: !1, result: invalidDbWrite("parity", describeCollectionPathError(collection), r) };
  let l = makeUsersMeRewriter(collection, docId);
  if (l !== null) {
    let n = await t();
    if (!n.ok) return n;
    ({ collection: collection, docId: docId } = l(n.id));
  }
  let o = `${collection}/${docId}`;
  if (o.length > DB_LIST_LIMIT)
    return {
      ok: !1,
      result: invalidDbWrite(
        "path_too_long",
        `the composed document path is ${o.length} bytes \u2014 the limit is ${DB_LIST_LIMIT}`,
        r,
      ),
    };
  return { ok: !0, path: o };
}
/**
 * 把一次写操作（delete/set/update/str_replace）转成请求体：路径、数据、replace 标志、str_replace 字段与 idem，可带 ifVersion 乐观锁。
 */
//@ chunk-0zqb2m0b.js:25869-26198 placement
function buildDbWriteOp(e, t, r, c, s) {
  let l = s !== void 0 && { ifVersion: s };
  switch (e) {
    case "delete":
      return { path: t, ...l };
    case "set":
      return { path: t, data: r, replace: !0, ...l };
    case "update":
      return { path: t, data: r, ...l };
    case "str_replace":
      return {
        path: t,
        field: c?.field,
        old_str: c?.oldStr,
        new_str: c?.newStr,
        ...(c?.replaceAll === !0 && { replace_all: !0 }),
        idem: c?.idem,
        ...l,
      };
  }
}
//@ chunk-0zqb2m0b.js:26198-26606 placement
async function validateWriteRequest(e, t, r, c, s) {
  let { slug: slug, op: op, data: n, edit: edit } = t;
  if (!ARTIFACT_SLUG_RE.test(slug)) return invalidDbWrite("invalid_slug", "not a valid artifact id");
  let h = await validateCollectionPath(t, () => composeMeKey(e, "artifact_db_write", slug, r, c, s));
  if (!h.ok) return h.result;
  return writeArtifactDocument(
    slug,
    op,
    h.path,
    n,
    r,
    s,
    t.asLevel,
    edit,
    t.ifVersion,
    t.requireVersion === !0 && op !== "str_replace"
      ? { host: e, address: `${t.collection}/${t.docId}` }
      : void 0,
    t.requestId !== void 0 ? { host: e, id: t.requestId } : void 0,
  );
}
/**
 * 写单个文档（set/update/delete/str_replace），支持版本要求。
 */
//@ chunk-0zqb2m0b.js:26606-28145 placement
async function writeArtifactDocument(e, t, r, c, s, l, o, n, d, h, u) {
  let R = h !== void 0 ? we.of(h.host) : void 0,
    k = R !== void 0 && !R.unsupported,
    y = await callArtifactDb(
      "artifact_db_write",
      e,
      t,
      buildDbWriteOp(t, r, c, n, d),
      {
        timeout: 30000,
        ...(o !== void 0 && { asLevel: o }),
        ...(k && { requireVersion: !0 }),
        ...(u !== void 0 && { requestId: u }),
        maxContentLength: re,
        credentials: l,
      },
      s,
    );
  if (!y.ok) return y.result;
  if (k && R !== void 0 && U(y.status, y.data)) {
    let b = await writeArtifactDocument(e, t, r, c, s, l, o, n, d, void 0, u);
    if (isRetryableDbResult(b))
      ((R.refusedAt = Date.now()), logFeatureSad("artifact_db_write", "require_version_unsupported"));
    return b;
  }
  if (y.status === 200) {
    let b = y.levelConfirmed !== void 0 && { levelConfirmed: y.levelConfirmed },
      safeParse = DB_WRITE_RESPONSE_SCHEMA().safeParse(y.data);
    if (!safeParse.success)
      return (logFeatureSad("artifact_db_write", "malformed_echo"), { kind: "ok", ...b });
    (logFeatureOk("artifact_db_write"), checkWriteUsageShape(y.data, safeParse.data.usage));
    let B = getResponseWarnings(y.data);
    return {
      kind: "ok",
      ...b,
      ...(safeParse.data.version !== void 0 && { version: safeParse.data.version }),
      ...(safeParse.data.usage !== void 0 && { usage: safeParse.data.usage }),
      ...(B.length > 0 && { warnings: B }),
    };
  }
  let {
    code: code,
    reason: reason,
    kind: kind,
    limit: limit,
    version: version,
    required: required,
    serverReason: serverReason,
  } = checkVersionPrecondition(y.status, y.data);
  return (
    (ne(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", reason),
    {
      kind: "error",
      code: code,
      ...(y.levelConfirmed !== void 0 && { levelConfirmed: y.levelConfirmed }),
      message:
        formatDbWriteError(
          code,
          "write",
          kind,
          limit,
          n?.field,
          { pinned: d, current: version, op: t, required: required, path: h?.address },
          serverReason,
        ) +
        (NO_RETRY_WRITE_CODES.has(code) ? NOTHING_WRITTEN_SUFFIX : "") +
        (code === "invalid_argument" && (d !== void 0 || n?.replaceAll === !0)
          ? `. If this server does not yet accept \`${d !== void 0 ? "if_version" : "replace_all"}\`, that alone explains the refusal \u2014 nothing was written; retry without it only if an unconditional ${d !== void 0 ? "write" : "single replacement"} is acceptable here`
          : ""),
      reason: reason,
    }
  );
}
//@ chunk-0zqb2m0b.js:28145-28407 placement
function isRetryableDbResult(e) {
  if (e.kind !== "error") return !0;
  switch (e.code) {
    case "invalid_argument":
    case "store_unavailable":
    case "quota_or_rate":
    case "quota_exceeded":
    case "upstream_auth":
    case "credential_rejected":
    case "cloud_unavailable":
    case "network_off":
      return !1;
    default:
      return !0;
  }
}
/**
 * 执行 write_db 的 batch：校验、发送、按需降级为逐条写入。
 */
//@ chunk-0zqb2m0b.js:28407-31306 placement
async function writeArtifactDbBatch(e, t, r, c, s) {
  let { slug: slug, ops: ops, asLevel: asLevel } = t;
  if (!ARTIFACT_SLUG_RE.test(slug))
    return invalidDbWrite("invalid_slug", "not a valid artifact id", "batch_");
  if (ops.length === 0 || ops.length > hF)
    return invalidDbWrite(
      "batch_size",
      `a batch takes 1-${hF} writes \u2014 ${ops.length} were given`,
      "batch_",
    );
  let d,
    h = () => (d ??= composeMeKey(e, "artifact_db_write", slug, r, c, s)),
    u = [],
    R = new Set();
  for (let [x, F] of ops.entries()) {
    let C = await validateCollectionPath(F, h, "batch_");
    if (!C.ok) return { ...C.result, message: `write ${x + 1} of ${ops.length}: ${C.result.message}` };
    if (R.has(C.path))
      return invalidDbWrite(
        "duplicate_path",
        `write ${x + 1} of ${ops.length} addresses ${C.path}, which an earlier write in this batch already addresses \u2014 a batch writes each document at most once`,
        "batch_",
      );
    (R.add(C.path),
      u.push({
        op: F.op,
        path: C.path,
        ...(F.data !== void 0 && { data: F.data }),
        ...(F.ifVersion !== void 0 && { ifVersion: F.ifVersion }),
      }));
  }
  let any = u.some((x) => x.ifVersion !== void 0),
    y = {
      ops: u.map(({ op: op, path: path, data: C, ifVersion: ifVersion }) => ({
        op: op,
        ...buildDbWriteOp(op, path, C, void 0, ifVersion),
      })),
    },
    a;
  try {
    a = Buffer.byteLength(jsonStringify({ slug: slug, verb: "batch", args: y }), "utf8");
  } catch {
    return invalidDbWrite(
      "data_invalid",
      "every document in the batch must be a JSON-serializable object",
      "batch_",
    );
  }
  if (a > H5n)
    return invalidDbWrite(
      "batch_too_large",
      `the batch serializes to ${a} bytes \u2014 the limit for one request is ${H5n}; split it into smaller batches`,
      "batch_",
    );
  let of = A0o.of(e),
    D = t.requireVersion === !0 ? e : void 0,
    S = t.requestId !== void 0 ? { host: e, id: t.requestId } : void 0;
  if (of.unsupported && !any) return writeBatchSequentialFallback(slug, u, r, s, asLevel, D, S);
  let of_2 = we.of(e),
    I = t.requireVersion === !0 && !of_2.unsupported,
    A = (x) =>
      callArtifactDb(
        "artifact_db_write",
        slug,
        "batch",
        y,
        {
          timeout: 60000,
          maxContentLength: re,
          credentials: s,
          ...(asLevel !== void 0 && { asLevel: asLevel }),
          ...(x && { requireVersion: !0 }),
          ...(S !== void 0 && { requestId: S }),
        },
        r,
      ),
    b = await A(I);
  if (!b.ok) return b.result;
  if (I && U(b.status, b.data)) {
    if (((b = await A(!1)), !b.ok)) return b.result;
    if (asLevel === void 0)
      ((of_2.refusedAt = Date.now()),
        logFeatureSad("artifact_db_write", "batch_require_version_unsupported"));
  }
  if (asLevel === void 0 && U(b.status, b.data))
    return (
      (of.refusedAt = Date.now()),
      any ? describeBatchPinnedUnsupported() : writeBatchSequentialFallback(slug, u, r, s, void 0, D, S)
    );
  if (b.status === 200) {
    let x = b.levelConfirmed !== void 0 && { levelConfirmed: b.levelConfirmed },
      safeParse = DB_BATCH_RESPONSE_SCHEMA().safeParse(b.data);
    if (!safeParse.success || safeParse.data.results.length !== ops.length)
      return (
        logFeatureSad("artifact_db_write", "malformed_batch_echo"),
        { kind: "ok", ...x, results: ops.map(() => ({})) }
      );
    (logFeatureOk("artifact_db_write"), checkWriteUsageShape(b.data, safeParse.data.usage));
    let C = getResponseWarnings(b.data);
    return {
      kind: "ok",
      ...x,
      results: safeParse.data.results.map((N) => (N.version !== void 0 ? { version: N.version } : {})),
      ...(safeParse.data.usage !== void 0 && { usage: safeParse.data.usage }),
      ...(C.length > 0 && { warnings: C }),
    };
  }
  let {
    code: code,
    reason: reason,
    kind: kind,
    limit: limit,
    version: version,
    index: index,
    required: required,
    serverReason: serverReason,
  } = checkVersionPrecondition(b.status, b.data);
  (ne(code) ? logFeatureSad : logFeatureBad)("artifact_db_write", `batch_${reason}`);
  let T = index !== void 0 && index < u.length ? index : void 0;
  return {
    kind: "error",
    code: code,
    ...(b.levelConfirmed !== void 0 && { levelConfirmed: b.levelConfirmed }),
    message: splitOversizedBatch(code, kind, limit, {
      pinned: any,
      stale:
        T !== void 0
          ? {
              index: T,
              path: `${ops[T].collection}/${ops[T].docId}`,
              op: ops[T].op,
              ifVersion: ops[T].ifVersion,
              total: ops.length,
            }
          : void 0,
      version: version,
      required: required,
      serverReason: serverReason,
    }),
    reason: reason,
  };
}
//@ chunk-0zqb2m0b.js:31306-31767 placement
function describeBatchPinnedUnsupported() {
  return (
    logFeatureSad("artifact_db_write", "batch_pinned_unsupported"),
    {
      kind: "error",
      code: "invalid_argument",
      reason: "batch_pinned_unsupported",
      message: `db batch write failed (${toPublicDbErrorCode("invalid_argument")}): this server does not take batch writes yet (nor, most likely, \`if_version\`), and a batch with \`if_version\` pins is never applied one write at a time \u2014 nothing was written. Resend it without the pins only if unconditional writes are acceptable here`,
    }
  );
}
/**
 * 批量写入失败说明（超过 1 MiB、部分失败等）。
 */
//@ chunk-0zqb2m0b.js:31767-34752 placement
function splitOversizedBatch(e, t, r, c) {
  if (e === "too_large")
    return `db batch write failed (${toPublicDbErrorCode(e)}): the batch body exceeds the server's 1 MiB request limit \u2014 nothing was written; split it into smaller write_db calls`;
  if (e === "version_mismatch" && c?.required === !0) {
    let o = `db batch write failed (${toPublicDbErrorCode(e)})`,
      n =
        "Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending",
      stale = c.stale;
    return stale !== void 0
      ? `${o}: writes[${stale.index}] (write ${stale.index + 1} of ${stale.total}) targets ${stale.path}, which already exists, and carried no if_version \u2014 the whole batch wrote nothing. Read that document back, re-plan its ${stale.op === "delete" ? "delete (if it should still be deleted)" : "write on what it holds now"} with if_version set to the version the read returns, then resend the batch. ${"Other unpinned entries that write existing documents would be refused the same way \u2014 read and pin those too before resending"}`
      : `${o}: one of the writes targets a document that already exists and carried no if_version \u2014 the whole batch wrote nothing. Read the existing documents this batch writes, re-plan those entries on what they hold now with if_version set to the versions the reads return, then resend the batch`;
  }
  if (e === "version_mismatch") {
    let o = `db batch write failed (${toPublicDbErrorCode(e)}): the batch is atomic, so nothing was written \u2014 none of the writes applied`,
      n = c?.stale;
    if (n === void 0 || n.ifVersion === void 0)
      return `${o}. A document one of the writes was pinned to with if_version is no longer at that version (or no longer exists). Re-read the pinned documents, re-plan those writes against what they hold now with fresh pins, then resend the batch`;
    let d = `writes[${n.index}] (write ${n.index + 1} of ${n.total}, ${jsonStringify(n.path)})`,
      h =
        "It is the first stale pin the server met; later pinned entries were not checked, so re-read any pinned document you are unsure of too, then resend the batch";
    return c?.version !== void 0
      ? `${o}. ${d} was pinned to version ${n.ifVersion} and that document is now at version ${c.version}: read it back, re-plan its write against what it holds now and pin to that version. ${h}`
      : `${o}. ${d} was pinned to version ${n.ifVersion} and that document has changed or may have been deleted (the server named no current version): read it back \u2014 if it still exists, re-plan its write against what it holds now and pin to its version; if it is gone, drop that entry, or re-create it with a "set" entry and no if_version only if it should exist again. ${h}`;
  }
  let s = formatDbWriteError(e, "batch write", t, r, void 0, void 0, c?.serverReason),
    l =
      e === "invalid_argument" && c?.pinned === !0
        ? ". If this server does not yet accept `if_version` on batch writes, that alone explains the refusal \u2014 resend without the pins only if unconditional writes are acceptable here"
        : "";
  return AFr(e)
    ? `${s}; the batch is atomic, so nothing was written${l}`
    : `${s}; the batch's outcome is unknown \u2014 it applies all-or-nothing and may have committed; read back before retrying`;
}
//@ chunk-0zqb2m0b.js:34752-34799 placement
function AFr(e) {
  return e !== "store_unavailable";
}
/**
 * 批量写入不被支持时逐条顺序写入的回退。
 */
//@ chunk-0zqb2m0b.js:34799-36393 placement
async function writeBatchSequentialFallback(e, t, r, c, s, l, o) {
  logFeatureSad("artifact_db_write", "batch_fallback_sequential");
  let n = [],
    d,
    h = [],
    u,
    R = (y) =>
      s !== void 0 && y > 0 && u !== !0
        ? ` (as_level '${s}' unconfirmed for them \u2014 they may have run at your own level)`
        : "",
    k =
      "this server does not take batch writes yet, so the batch was applied one write at a time and is NOT atomic";
  for (let [y, { op: a, path: w, data: D }] of t.entries()) {
    let S = `${y} ${y === 1 ? "entry" : "entries"} before it already committed`,
      q = t.length - y - 1,
      I = (b) => ({
        kind: "error",
        code: "store_unavailable",
        reason: "batch_fallback_aborted",
        message: `${k}: interrupted at writes[${y}] (write ${y + 1} of ${t.length}). The ${S}${R(y)}; writes[${y}] itself ${b ? "may or may not have applied" : "did not run"}; the ${q} after it did not run.`,
        fallback: "sequential",
        results: n,
        failedIndex: y,
      });
    if (r.aborted) return I(!1);
    let A;
    try {
      A = await writeArtifactDocument(e, a, w, D, r, c, s, void 0, void 0, l && { host: l, address: w }, o);
    } catch (error) {
      if (isCancel(error)) return I(!0);
      if (error instanceof j) return I(!1);
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
    (n.push(A.version !== void 0 ? { version: A.version } : {}),
      (d = A.usage ?? (a === "delete" ? void 0 : d)));
    for (let b of A.warnings ?? []) if (h.length < pe && !h.includes(b)) h.push(b);
    if (A.levelConfirmed !== void 0) u = (u ?? !0) && A.levelConfirmed;
  }
  return {
    kind: "ok",
    results: n,
    ...(d !== void 0 && { usage: d }),
    ...(h.length > 0 && { warnings: h }),
    fallback: "sequential",
    ...(u !== void 0 && { levelConfirmed: u }),
  };
}

export {
  DB_LIST_LIMIT,
  MAX_EDITS_PER_CALL,
  A0o,
  regExp,
  jZe,
  WZe,
  AFr,
  C_e,
  isArtifactDbStrReplaceEnabled,
  STR_REPLACE,
  mbt,
  X9,
  hF,
  regExp_2,
  isCollectionPath,
  writeArtifactDbBatch,
  W2s,
  L5n,
  describeCollectionPathError,
  H5n,
  readArtifactDb,
  T0o,
  U2s,
  validateWriteRequest,
  Zcn,
  z2s,
  isArtifactDbEnabled,
  DB_QUERY_OPERATORS,
  DB_SYMBOL_OPERATORS,
  VERSION_MISMATCH_PREFIXES,
  C0o,
};
