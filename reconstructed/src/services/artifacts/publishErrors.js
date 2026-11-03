/**
 * services/artifacts/publishErrors.ts
 *
 * 2.1.316 新增：发布失败的描述与拒绝信息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (35)
 * attribution: placement 35
 */
import { publishError, strandedSlugFrom } from "./publishConflicts.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_VERSION_SAFE_RE } from "../../tools/ArtifactTool/constants.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE } from "./frameApi.js";
import { scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { rateLimitedMessage, retryAfterSeconds, CONTRACT_ROLLOUT_TEXT } from "./contentTypes.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { artifactViewerUrl, PATCH_ERROR_PATTERNS, Pc } from "./publishInstanceFiles.js";
import { dailyCapNotice } from "./publishArtifact.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { uniq } from "../../utils/collections.js";
import { isCredentialRefusalBody, isFrameNotFoundBody } from "./frameRelay.js";
import { regExp as regExp_6, Dyi } from "./textSanitize.js";

//@ chunk-06y4szbn.js:163613-163838 placement
function publishErrorResult(e, n, r = "") {
  return {
    ...publishError((e.msg ?? n) + r),
    ...(e.code === "slug_gone" && { gone: !0 }),
    ...(e.code === "thumbnail_rejected" && { thumbnailRejected: e.msg ?? n }),
    ...((e.code === "rate_limited" || e.code === "contract_rollout") && { transient: e.code }),
  };
}
//@ chunk-06y4szbn.js:163838-163886 placement
function liveConflictOf(e) {
  return refusalReasonOf(e) === void 0 ? readLiveConflict(e) : null;
}
//@ chunk-06y4szbn.js:163886-164182 placement
function preconditionConflictOf(e, n) {
  if (refusalReasonOf(e) !== "precondition_failed") return null;
  let r = readLiveConflict(e);
  if (r === null) return null;
  let s = typeof e === "object" && e !== null && "paths" in e ? e.paths : void 0,
    h = [];
  for (let b of Array.isArray(s) ? s : []) {
    let safeParse = HASH_MISMATCH_SCHEMA().safeParse(b);
    if (safeParse.success && n.has(safeParse.data.path)) h.push(safeParse.data);
  }
  return { ...r, paths: h };
}
//@ chunk-06y4szbn.js:164182-164304 placement
var HASH_MISMATCH_SCHEMA = DoctorLazy(() =>
  u({
    path: o(),
    expected: o()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    actual: o()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
  }),
);
//@ chunk-06y4szbn.js:164304-164720 placement
function readLiveConflict(e) {
  if (
    !e ||
    typeof e !== "object" ||
    !("conflict" in e) ||
    e.conflict !== !0 ||
    !("live" in e) ||
    typeof e.live !== "string" ||
    !ARTIFACT_VERSION_SAFE_RE.test(e.live)
  )
    return null;
  let n = e;
  return {
    live: e.live,
    ...(typeof n.createdAt === "string" &&
      /^[\w:.+ -]{1,40}$/.test(n.createdAt) && { createdAt: n.createdAt }),
    ...((n.liveEntry === "editor" || n.liveEntry === "page" || n.liveEntry === "publish") && {
      liveEntry: n.liveEntry,
    }),
    ...(n.forceRefused === !0 && { forceRefused: !0 }),
  };
}
//@ chunk-06y4szbn.js:164720-164894 placement = REASON_TAG (1)
function denyPolicyBody(e) {
  if (
    e &&
    typeof e === "object" &&
    "error" in e &&
    typeof e.error === "string" &&
    "reason" in e &&
    typeof e.reason === "string"
  )
    return { error: e.error, reason: e.reason };
  return null;
}
//@ chunk-06y4szbn.js:164894-166190 placement
var PUBLISH_DENIED_FRAME = "publish denied: ",
  Vc = [
    "compliance_restricted",
    "org_mismatch",
    "org_toggle_disabled",
    "summon_foreign_sender",
    "user_entitlement_denied",
    "write_gate_disabled",
  ],
  Wc = [
    "acl_unsupported",
    "artifact_limit_reached",
    "audience_conflict",
    "auto_edit_refused",
    "bad_json",
    "capability_refused",
    "cas_link_refused",
    "cmek_key_disabled",
    "content_pending",
    "content_refused",
    "content_too_large",
    "contract_refused",
    "credential_required",
    "database_org_cap",
    "database_too_large",
    "embeds_too_large",
    "external_sharing_disabled",
    "group_grant_forbidden",
    "instance_dup_unavailable",
    "instance_locked",
    "invalid_request",
    "invalid_slug",
    "live_doc",
    "live_over_budget",
    "live_path_cap",
    "live_path_delete",
    "live_refused",
    "multi_file_unavailable",
    "never_published",
    "not_found",
    "not_owner",
    "one_live_path",
    "origin_required",
    "owner_mode_only",
    "patch_no_base",
    "path_is_live",
    "pin_unsupported",
    "provision_conflict",
    "public_mode_disabled",
    "publish_settling",
    "rate_limited",
    "read_mode_refused",
    "read_timeout",
    "render_busy",
    "render_embeds_container",
    "render_over_budget",
    "render_unavailable",
    "soft_deleted",
    "soft_deleted_swept",
    "source_refused",
    "title_invalid",
    "too_many_concurrent",
    "type_cap_unavailable",
    "type_cross_org",
    "type_instances_off",
    "type_is_instance",
    "type_no_release",
    "type_single_file",
    "unknown_version",
    "write_conflict",
  ];
//@ chunk-06y4szbn.js:166190-166273 placement
function refusalReasonField(e) {
  let n = refusalReasonOf(e),
    found = Wc.find((s) => s === n);
  return found ? { refusal_reason: fromEnum(found) } : {};
}
//@ chunk-06y4szbn.js:166273-166379 placement
function publishDeniedReason(e, n) {
  let r =
    typeof e === "string"
      ? e.trimEnd().replace(regExp_5, "")
      : (denyPolicyBody(e)?.error ?? formatFrameErrorBody(e));
  return scrubServerLine(r, n);
}
//@ chunk-06y4szbn.js:166379-166430 placement
var Ua = /^capabilities\.([a-z][a-z0-9_]*)(?=[:. ])/;
//@ chunk-06y4szbn.js:166430-166475 placement
function Ds(e) {
  return /^contract[ :]/.test(e);
}
//@ chunk-06y4szbn.js:166475-166596 placement
var PUBLISH_ERROR_PATTERNS = / is newer than the preferred /,
  Ha = /the artifact's type|built from an artifact type/,
  Gc = { capNames: [], hostDecl: !1 };
//@ chunk-06y4szbn.js:166596-166707 placement
function rateLimitedResult(e) {
  return rateLimitedMessage(
    retryAfterSeconds(parseRetryAfterMs(e.retryAfter)),
    e.reservedSlug !== void 0 ? artifactViewerUrl(e.reservedSlug) : void 0,
    e.refusedStep,
  );
}
//@ chunk-06y4szbn.js:166707-166816 placement
function isRateLimitedResponse(e, n) {
  let r = refusalReasonOf(n);
  return e === 429 && dailyCapNotice(n) === void 0 && (r === "rate_limited" || r === "too_many_concurrent");
}
//@ chunk-06y4szbn.js:166816-166881 placement
function cn(e, n) {
  return /[.!?]$/.test(e) ? `${e} ${n}` : `${e}. ${n}`;
}
//@ chunk-06y4szbn.js:166881-167983 placement
function declarationRejectedMessage(e, n) {
  let r = Ua.exec(e)?.[1];
  if (r === void 0) return "Nothing was published; correct the declaration as described and publish again.";
  if (/: unavailable$/.test(e)) {
    if (!n.capNames.includes(r))
      return `Nothing was published; an earlier version declares capabilities.${r}, it is not available to this account now, and a declaration that drops it cannot be stored \u2014 publish without a capabilities block to keep the stored set, or tell the user.`;
    return r === "mcp" && n.hostDecl
      ? "Nothing was published; the connectors declaration names locally-configured (host:) MCP servers, which this session cannot publish \u2014 declare only claude.ai connectors, or publish a version that does not call them."
      : `Nothing was published; capabilities.${r} is not available to this account here \u2014 publish a version that does not use it instead of retrying the same declaration.`;
  }
  if (e.includes("part of the runtime"))
    return `Nothing was published; drop capabilities.${r} \u2014 the runtime provides it without a declaration.`;
  return `Nothing was published; correct capabilities.${r} as described and publish again.`;
}
//@ chunk-06y4szbn.js:167983-168331 placement
var SHARE_CHANGE_REFUSED_TEXT =
    "Nothing was published. Only the artifact's owner can change who it is shared with (in its share settings on claude.ai), not this session \u2014 if the page can do without what the message names, publish a version without it; otherwise tell the user.",
  SLUG_GONE_MSG = "the artifact you're updating was deleted, or you no longer have write access to it";
//@ chunk-06y4szbn.js:168331-168375 placement
function relayHttpUnknown(e) {
  return outcomeUnknownMessage(`relay HTTP ${e}`);
}
//@ chunk-06y4szbn.js:168375-168411 placement
var PUBLISH_OUTCOME_UNKNOWN_FRAME = "publish outcome unknown (";
//@ chunk-06y4szbn.js:168411-168524 placement
function outcomeUnknownMessage(e) {
  return `${PUBLISH_OUTCOME_UNKNOWN_FRAME}${e}) \u2014 it may have published; check the artifact list before publishing again`;
}
//@ chunk-06y4szbn.js:168524-168601 placement
var TYPE_FILE_WRITE_REFUSAL = "this file belongs to the artifact's type and can't be changed here";
//@ chunk-06y4szbn.js:168601-168643 placement
function isTypeFileRefusal(e) {
  return formatFrameErrorBody(e).includes(TYPE_FILE_WRITE_REFUSAL);
}
//@ chunk-06y4szbn.js:168643-169650 placement
var TYPE_INSTANCE_REFUSAL_TEXT =
    " \u2014 this Artifact was created from an Artifact type: its page (index.html) and the type's other files can't be changed on it. Publish only its own files (`file_path` naming one, more in `files`, with this `url`); to change the page, publish a new Artifact instead.",
  Wa =
    "Nothing was published and the Artifact is unchanged; retrying cannot help, so tell the user it can't be changed from this session",
  Kc = ` \u2014 this Artifact was created from an Artifact type and nothing can be published to it from this session: its page (index.html) and the type's other files can't be changed on it, and publishing its own files is not available. ${Wa}.`,
  TYPE_INSTANCE_FILES_UNAVAILABLE = `this file can't be published: the Artifact being updated was created from an Artifact type, and no file or page can be published to it from this session. ${Wa}`,
  TYPE_INSTANCE_POSSIBLE_TAIL =
    "If the Artifact being updated was created from an Artifact type, that will be refused too, because nothing can be published to it from this session; in that case tell the user so.";
/**
 * 把部署失败响应（状态码 + 正文）映射为发布结果：冲突、日上限、被拒、类型锁定、限流等。
 */
//@ chunk-06y4szbn.js:169650-169784 placement
function classifyPublishResponse(e, n, r, s, h = !1, b = Gc, y = {}) {
  let x = describePublishFailure(e, n, r, s, h, b, y),
    w = refusalReasonField(n);
  return w.refusal_reason === void 0 ? x : { ...x, extra: { ...x.extra, ...w } };
}
//@ chunk-06y4szbn.js:169784-173145 placement
function describePublishFailure(e, n, r, s, h, b, y) {
  let x = classifyDeployError(e, n, h);
  if (x !== void 0) return x;
  let w = refusalReasonOf(n);
  if (e === 400) {
    let C = formatFrameErrorBody(n);
    if (
      /^thumbnail/i.test(C.trimStart()) ||
      (UNKNOWN_FIELD_ERROR_RE.test(C) && /["']thumbnail(?:_dark)?["']/.test(C))
    )
      return { code: "thumbnail_rejected", msg: `deploy 400: ${errBody(n)}` };
  }
  if (strandedSlugFrom(e, n)) return { code: "publish_stranded" };
  if (e === 409 && w === "publish_settling")
    return {
      code: "publish_settling",
      msg: outcomeUnknownMessage("the first attempt reached claude.ai and its content is still being stored"),
    };
  if (e === 422 && refusalReasonOf(n) === "deadline_invalid") return { code: "deadline_invalid" };
  let R = e === 422 ? publishDeniedReason(n, 300) : "";
  if (e === 422 && (w === "instance_locked" || isTypeFileRefusal(n) || Ha.test(R))) {
    let C = isTypeFileRefusal(n) || R.includes("publish its files with a manifest"),
      k = getLiveState().frozenArtifactTypes?.typesOn;
    return {
      code: "type_locked",
      msg: `deploy 422: ${R}${!C || k === void 0 ? "" : k ? TYPE_INSTANCE_REFUSAL_TEXT : Kc}`,
    };
  }
  if (e === 422 && w === "audience_conflict")
    return { code: "audience_conflict", msg: `deploy 422: ${cn(R, SHARE_CHANGE_REFUSED_TEXT)}` };
  if (e === 422 && w === "capability_refused") {
    let filtered = publishDeniedReason(n, 1500)
        .split(/; (?=capabilities[.: ]|\d+ more\b)/)
        .filter(Boolean),
      k = filtered.length > 1 && /^\d+ more\b/.test(filtered.at(-1)) ? filtered.pop() : void 0;
    if (filtered.length <= 1 && k === void 0)
      return { code: "capability_refused", msg: `deploy 422: ${cn(R, declarationRejectedMessage(R, b))}` };
    let V = "",
      L = 0;
    for (let G of filtered) {
      let P = V === "" ? G : `${V}; ${G}`;
      if (P.length > 600 && L > 0) break;
      ((V = P), L++);
    }
    let filtered_2 = [filtered.length > L ? `${filtered.length - L} more not shown` : "", k ?? ""].filter(
        Boolean,
      ),
      W = uniq(
        filtered
          .filter(
            (G) =>
              (/: unavailable$/.test(G) && !b.capNames.includes(Ua.exec(G)?.[1] ?? "")) ||
              (G.startsWith("capabilities.mcp: unavailable") && b.hostDecl),
          )
          .map((G) => declarationRejectedMessage(G, b).replace(/^Nothing was published; /, "")),
      );
    return {
      code: "capability_refused",
      msg: `deploy 422: ${cn([V, ...filtered_2].join("; "), ["Nothing was published; fix each capabilities entry named \u2014 drop the unavailable ones, correct the others as described \u2014 and publish again.", ...W].join(" Also: "))}`,
    };
  }
  if (
    e === 422 &&
    s === void 0 &&
    b.latestContract === !0 &&
    (w === "contract_refused" || (w === void 0 && Ds(R))) &&
    PUBLISH_ERROR_PATTERNS.test(R)
  )
    return { code: "contract_rollout", msg: `deploy 422: ${cn(R, CONTRACT_ROLLOUT_TEXT)}` };
  if (e === 422 && s !== void 0 && (w === "contract_refused" || (w === void 0 && Ds(R))))
    return {
      code: "contract_echo_rejected",
      extra: { echo_declared_caps: s.declaredCaps },
      msg:
        `deploy ${e}: ${publishDeniedReason(n, 200)} \u2014 this republish echoed the artifact's stored ` +
        `contract pin (${s.pin}) and nothing was published. If the reason above says the pin was yanked, pass contract: 'latest' to move the artifact to the current contract (this changes the page's runtime semantics); otherwise tell the user what the service said.`,
    };
  if (e === 403 && w === "not_owner")
    return {
      code: "publish_denied",
      msg: `${PUBLISH_DENIED_FRAME}this account can open the artifact but is not allowed to publish to it \u2014 nothing was published; ask its owner for edit access, or publish it as a new artifact (omit \`url\`).`,
    };
  if (e === 403 && isCredentialRefusalBody(formatFrameErrorBody(n)))
    return { code: "ccr_credential_refused" };
  if (e === 403 && w !== "credential_required") {
    let C = denyPolicyBody(n);
    if (C) {
      let found = Vc.find((L) => L === C.reason),
        V = found ? fromEnum(found) : void 0;
      return {
        code: "publish_denied",
        ...(V && { extra: { deny_reason: V } }),
        msg: PUBLISH_DENIED_FRAME + scrubServerLine(C.error, 300),
      };
    }
  }
  if (e === 404 && r && isFrameNotFoundBody(n)) return { code: "slug_gone", msg: SLUG_GONE_MSG };
  if (e === 429) {
    let C = dailyCapNotice(n);
    if (C)
      return {
        code: "publish_cap_reached",
        extra: { cap_type: fromEnum(C.capType) },
        msg: `${C.message} \u2014 try again after the reset.`,
      };
    if (isRateLimitedResponse(e, n) && y.created !== !0)
      return { code: "rate_limited", msg: rateLimitedResult(y) };
  }
  if (e === 408 && w === "read_timeout")
    return {
      msg: `deploy 408: ${cn(publishDeniedReason(n, 200), "Nothing was published; the server stopped waiting for the upload \u2014 retry once.")}`,
    };
  return {};
}
//@ chunk-06y4szbn.js:173145-173337 placement
function refusalReasonOf(e) {
  if (typeof e === "string") return regExp_5.exec(e.trimEnd())?.[1];
  if (e === null || typeof e !== "object" || !("reason" in e)) return;
  let reason = e.reason;
  return typeof reason === "string" && regExp_6.test(reason) ? reason : void 0;
}
//@ chunk-06y4szbn.js:173337-173375 placement
var regExp_5 = new RegExp(` \\[(${Dyi})\\]$`);
/**
 * 对象的 max 字段为正安全整数时返回。旧版名 getRequestTooLargeErrorMessage 为错配。疑似归错文件（部署/live-path 错误解析）。
 */
//@ chunk-06y4szbn.js:173506-173653 placement = getRequestTooLargeErrorMessage (0.789)
function readPositiveMax(e) {
  if (e === null || typeof e !== "object" || !("max" in e)) return;
  let max = e.max;
  return typeof max === "number" && Number.isSafeInteger(max) && max > 0 ? max : void 0;
}
/**
 * 部署接口 409/422 错误码（path_is_live/one_live_path/live_path_cap/live-editing budget）映射成 {code,msg}。疑似归错文件。
 */
//@ chunk-06y4szbn.js:173653-174615 placement
function classifyDeployError(e, n, r) {
  let s = refusalReasonOf(n);
  if (e === 409 && s === "path_is_live") return { code: "path_is_live", msg: `deploy 409: ${errBody(n)}` };
  if (e === 422 && s === "one_live_path") return { code: "one_live_path", msg: `deploy 422: ${errBody(n)}` };
  if (e === 422 && s === "live_path_cap") {
    let h = readPositiveMax(n);
    return { code: "live_path_cap", msg: `deploy 422: ${errBody(n)}` };
  }
  if (e === 422 && s === "live_path_delete")
    return { code: "live_path_delete", msg: `deploy 422: ${errBody(n)}` };
  if (e === 422 && s === "render_over_budget")
    return { code: "live_over_budget", msg: `deploy 422: ${errBody(n)}` };
  if (e === 422 && s === "render_unavailable")
    return { code: "render_unavailable", msg: `deploy 422: ${errBody(n)}` };
  if (e === 422 && s === "live_over_budget")
    return {
      code: "live_over_budget",
      msg:
        typeof n === "string"
          ? `deploy 422: ${scrubServerLine(n.trimEnd().replace(regExp_5, ""), 500)}`
          : `deploy 422: ${publishDeniedReason(n, 500)}`,
    };
  if (e === 422 && typeof n === "string" && LIVE_EDITING_BUDGET_REGEX.test(n))
    return { code: "live_over_budget", msg: `deploy 422: ${scrubServerLine(n, 500)}` };
  if (e === 503 && s === "render_busy") return { code: "render_busy", msg: `deploy 503: ${errBody(n)}` };
  return;
}
/**
 * "exceeds the live-editing budget"。
 */
//@ chunk-06y4szbn.js:174615-174656 placement
var LIVE_EDITING_BUDGET_REGEX = /exceeds the live-editing budget/;
//@ chunk-06y4szbn.js:174656-174706 placement
function deploy400Message(e, n) {
  return `deploy 400: ${scrubServerLine(e, 200)}`;
}
//@ chunk-06y4szbn.js:174706-174754 placement
function deploy400Fallback(e) {
  return `deploy 400: ${scrubServerLine(e, 200)}`;
}
//@ chunk-06y4szbn.js:174754-174780 placement
function isIgnorable400(e, n) {
  return !1;
}
//@ chunk-06y4szbn.js:174780-174852 placement
function isUnknownLiveFieldError(e, n) {
  return (n.liveKey && PATCH_ERROR_PATTERNS.test(e)) || (n.emptyPatch && Pc.test(e));
}
//@ chunk-06y4szbn.js:174852-174888 placement
function errBody(e) {
  return scrubServerLine(formatFrameErrorBody(e), 200);
}

export {
  errBody,
  refusalReasonOf,
  outcomeUnknownMessage,
  relayHttpUnknown,
  liveConflictOf,
  isIgnorable400,
  deploy400Fallback,
  classifyPublishResponse,
  publishErrorResult,
  isRateLimitedResponse,
  refusalReasonField,
  rateLimitedResult,
  isTypeFileRefusal,
  Ha,
  publishDeniedReason,
  isUnknownLiveFieldError,
  deploy400Message,
  preconditionConflictOf,
  TYPE_FILE_WRITE_REFUSAL,
  SLUG_GONE_MSG,
  TYPE_INSTANCE_FILES_UNAVAILABLE,
  TYPE_INSTANCE_POSSIBLE_TAIL,
  PUBLISH_OUTCOME_UNKNOWN_FRAME,
  PUBLISH_DENIED_FRAME,
  denyPolicyBody,
};
