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
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_VERSION_SAFE_RE } from "../../tools/ArtifactTool/constants.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { formatFrameErrorBody, UNKNOWN_FIELD_ERROR_RE } from "./frameApi.js";
import { scrubServerLine } from "../../tools/ArtifactTool/artifactUrls.js";
import { rateLimitedMessage, retryAfterSeconds, CONTRACT_ROLLOUT_TEXT } from "./contentTypes.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { artifactViewerUrl, PATCH_ERROR_PATTERNS, EMPTY_MANIFEST_RE } from "./publishInstanceFiles.js";
import { dailyCapNotice } from "./publishArtifact.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { uniq } from "../../utils/collections.js";
import { isCredentialRefusalBody, isFrameNotFoundBody } from "./frameRelay.js";
import { SAFE_LABEL_RE, SAFE_LABEL_TEXT } from "./textSanitize.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:163613-163838 placement
function publishErrorResult(status, body, detail = "") {
  return {
    ...publishError((status.msg ?? body) + detail),
    ...(status.code === "slug_gone" && {
      gone: true,
    }),
    ...(status.code === "thumbnail_rejected" && {
      thumbnailRejected: status.msg ?? body,
    }),
    ...((status.code === "rate_limited" || status.code === "contract_rollout") && {
      transient: status.code,
    }),
  };
}
//@ chunk-06y4szbn.js:163838-163886 placement
function liveConflictOf(result) {
  return refusalReasonOf(result) === undefined ? readLiveConflict(result) : null;
}
//@ chunk-06y4szbn.js:163886-164182 placement
function preconditionConflictOf(response, extra) {
  if (refusalReasonOf(response) !== "precondition_failed") return null;
  let liveConflict = readLiveConflict(response);
  if (liveConflict === null) return null;
  let paths =
    typeof response === "object" && response !== null && "paths" in response ? response.paths : undefined;
  let conflictPaths = [];
  for (let entry of Array.isArray(paths) ? paths : []) {
    let parsed = HASH_MISMATCH_SCHEMA().safeParse(entry);
    if (parsed.success && extra.has(parsed.data.path)) conflictPaths.push(parsed.data);
  }
  return {
    ...liveConflict,
    paths: conflictPaths,
  };
}
//@ chunk-06y4szbn.js:164182-164304 placement
var HASH_MISMATCH_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:164182", () => {
  HASH_MISMATCH_SCHEMA = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      expected: stringSchema()
        .regex(/^[0-9a-f]{64}$/)
        .nullable(),
      actual: stringSchema()
        .regex(/^[0-9a-f]{64}$/)
        .nullable(),
    }),
  );
});
//@ chunk-06y4szbn.js:164304-164720 placement
function readLiveConflict(res) {
  if (
    !res ||
    typeof res !== "object" ||
    !("conflict" in res) ||
    res.conflict !== true ||
    !("live" in res) ||
    typeof res.live !== "string" ||
    !ARTIFACT_VERSION_SAFE_RE.test(res.live)
  )
    return null;
  let data = res;
  return {
    live: res.live,
    ...(typeof data.createdAt === "string" &&
      /^[\w:.+ -]{1,40}$/.test(data.createdAt) && {
        createdAt: data.createdAt,
      }),
    ...((data.liveEntry === "editor" || data.liveEntry === "page" || data.liveEntry === "publish") && {
      liveEntry: data.liveEntry,
    }),
    ...(data.forceRefused === true && {
      forceRefused: true,
    }),
  };
}
//@ chunk-06y4szbn.js:164720-164894 placement = REASON_TAG (1)
function denyPolicyBody(data) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string" &&
    "reason" in data &&
    typeof data.reason === "string"
  )
    return {
      error: data.error,
      reason: data.reason,
    };
  return null;
}
//@ chunk-06y4szbn.js:164894-166190 placement
/**
 * 发布被拒的原因码表：denied 与 refused 两组（合规、组织、限额、渲染、版本冲突等），以及 "publish denied: " 前缀。
 */
var PUBLISH_DENIED_FRAME = "publish denied: ";
var PUBLISH_DENIED_REASONS = [
  "compliance_restricted",
  "org_mismatch",
  "org_toggle_disabled",
  "summon_foreign_sender",
  "user_entitlement_denied",
  "write_gate_disabled",
];
var PUBLISH_REFUSAL_REASONS = [
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
function refusalReasonField(body) {
  let reason = refusalReasonOf(body);
  let found = PUBLISH_REFUSAL_REASONS.find((known) => known === reason);
  return found
    ? {
        refusal_reason: fromEnum(found),
      }
    : {};
}
//@ chunk-06y4szbn.js:166273-166379 placement
function publishDeniedReason(status, body) {
  let why =
    typeof status === "string"
      ? status.trimEnd().replace(regExp_2, "")
      : (denyPolicyBody(status)?.error ?? formatFrameErrorBody(status));
  return scrubServerLine(why, body);
}
//@ chunk-06y4szbn.js:166379-166430 placement
var CAPABILITY_REFUSAL_RE = /^capabilities\.([a-z][a-z0-9_]*)(?=[:. ])/;
//@ chunk-06y4szbn.js:166430-166475 placement
function isContractRefusalText(text) {
  return /^contract[ :]/.test(text);
}
//@ chunk-06y4szbn.js:166475-166596 placement
var PUBLISH_ERROR_PATTERNS = / is newer than the preferred /;
var TYPE_INSTANCE_TEXT_RE = /the artifact's type|built from an artifact type/;
var EMPTY_CAPABILITY_CONTEXT = {
  capNames: [],
  hostDecl: false,
};
//@ chunk-06y4szbn.js:166596-166707 placement
function rateLimitedResult(body) {
  return rateLimitedMessage(
    retryAfterSeconds(parseRetryAfterMs(body.retryAfter)),
    body.reservedSlug !== undefined ? artifactViewerUrl(body.reservedSlug) : undefined,
    body.refusedStep,
  );
}
//@ chunk-06y4szbn.js:166707-166816 placement
function isRateLimitedResponse(status, body) {
  let reason = refusalReasonOf(body);
  return (
    status === 429 &&
    dailyCapNotice(body) === undefined &&
    (reason === "rate_limited" || reason === "too_many_concurrent")
  );
}
//@ chunk-06y4szbn.js:166816-166881 placement
function ensureSentence(text, punctuation) {
  return /[.!?]$/.test(text) ? `${text} ${punctuation}` : `${text}. ${punctuation}`;
}
//@ chunk-06y4szbn.js:166881-167983 placement
function declarationRejectedMessage(body, extra) {
  let capability = CAPABILITY_REFUSAL_RE.exec(body)?.[1];
  if (capability === undefined)
    return "Nothing was published; correct the declaration as described and publish again.";
  if (/: unavailable$/.test(body)) {
    if (!extra.capNames.includes(capability))
      return `Nothing was published; an earlier version declares capabilities.${capability}, it is not available to this account now, and a declaration that drops it cannot be stored \u2014 publish without a capabilities block to keep the stored set, or tell the user.`;
    return capability === "mcp" && extra.hostDecl
      ? "Nothing was published; the connectors declaration names locally-configured (host:) MCP servers, which this session cannot publish \u2014 declare only claude.ai connectors, or publish a version that does not call them."
      : `Nothing was published; capabilities.${capability} is not available to this account here \u2014 publish a version that does not use it instead of retrying the same declaration.`;
  }
  if (body.includes("part of the runtime"))
    return `Nothing was published; drop capabilities.${capability} \u2014 the runtime provides it without a declaration.`;
  return `Nothing was published; correct capabilities.${capability} as described and publish again.`;
}
//@ chunk-06y4szbn.js:167983-168331 placement
var SHARE_CHANGE_REFUSED_TEXT =
  "Nothing was published. Only the artifact's owner can change who it is shared with (in its share settings on claude.ai), not this session \u2014 if the page can do without what the message names, publish a version without it; otherwise tell the user.";
var SLUG_GONE_MSG = "the artifact you're updating was deleted, or you no longer have write access to it";
//@ chunk-06y4szbn.js:168331-168375 placement
function relayHttpUnknown(status) {
  return outcomeUnknownMessage(`relay HTTP ${status}`);
}
//@ chunk-06y4szbn.js:168375-168411 placement
var PUBLISH_OUTCOME_UNKNOWN_FRAME = "publish outcome unknown (";
//@ chunk-06y4szbn.js:168411-168524 placement
function outcomeUnknownMessage(cause) {
  return `${PUBLISH_OUTCOME_UNKNOWN_FRAME}${cause}) \u2014 it may have published; check the artifact list before publishing again`;
}
//@ chunk-06y4szbn.js:168524-168601 placement
var TYPE_FILE_WRITE_REFUSAL = "this file belongs to the artifact's type and can't be changed here";
//@ chunk-06y4szbn.js:168601-168643 placement
function isTypeFileRefusal(body) {
  return formatFrameErrorBody(body).includes(TYPE_FILE_WRITE_REFUSAL);
}
//@ chunk-06y4szbn.js:168643-169650 placement
/**
 * 从类型创建的 artifact 不允许改页面的说明文案（无法发布自身文件、重试无用等）。
 */
var TYPE_INSTANCE_REFUSAL_TEXT =
  " \u2014 this Artifact was created from an Artifact type: its page (index.html) and the type's other files can't be changed on it. Publish only its own files (`file_path` naming one, more in `files`, with this `url`); to change the page, publish a new Artifact instead.";
var TYPE_INSTANCE_NO_RETRY_TEXT =
  "Nothing was published and the Artifact is unchanged; retrying cannot help, so tell the user it can't be changed from this session";
var TYPE_INSTANCE_NO_PUBLISH_TEXT = ` \u2014 this Artifact was created from an Artifact type and nothing can be published to it from this session: its page (index.html) and the type's other files can't be changed on it, and publishing its own files is not available. ${TYPE_INSTANCE_NO_RETRY_TEXT}.`;
var TYPE_INSTANCE_FILES_UNAVAILABLE = `this file can't be published: the Artifact being updated was created from an Artifact type, and no file or page can be published to it from this session. ${TYPE_INSTANCE_NO_RETRY_TEXT}`;
var TYPE_INSTANCE_POSSIBLE_TAIL =
  "If the Artifact being updated was created from an Artifact type, that will be refused too, because nothing can be published to it from this session; in that case tell the user so.";
//@ chunk-06y4szbn.js:169650-169784 placement
/**
 * 把部署失败响应（状态码 + 正文）映射为发布结果：冲突、日上限、被拒、类型锁定、限流等。
 */
function classifyPublishResponse(
  status,
  body,
  isRedeploy,
  detail,
  isRetry = false,
  sent = EMPTY_CAPABILITY_CONTEXT,
  extra = {},
) {
  let failure = describePublishFailure(status, body, isRedeploy, detail, isRetry, sent, extra);
  let reasonFields = refusalReasonField(body);
  return reasonFields.refusal_reason === undefined
    ? failure
    : {
        ...failure,
        extra: {
          ...failure.extra,
          ...reasonFields,
        },
      };
}
//@ chunk-06y4szbn.js:169784-173145 placement
function describePublishFailure(status, body, isRedeploy, detail, isRetry, sent, extra) {
  let classified = classifyDeployError(status, body, isRetry);
  if (classified !== undefined) return classified;
  let reason = refusalReasonOf(body);
  if (status === 400) {
    let text = formatFrameErrorBody(body);
    if (
      /^thumbnail/i.test(text.trimStart()) ||
      (UNKNOWN_FIELD_ERROR_RE.test(text) && /["']thumbnail(?:_dark)?["']/.test(text))
    )
      return {
        code: "thumbnail_rejected",
        msg: `deploy 400: ${errBody(body)}`,
      };
  }
  if (strandedSlugFrom(status, body))
    return {
      code: "publish_stranded",
    };
  if (status === 409 && reason === "publish_settling")
    return {
      code: "publish_settling",
      msg: outcomeUnknownMessage("the first attempt reached claude.ai and its content is still being stored"),
    };
  if (status === 422 && refusalReasonOf(body) === "deadline_invalid")
    return {
      code: "deadline_invalid",
    };
  let deniedReason = status === 422 ? publishDeniedReason(body, 300) : "";
  if (
    status === 422 &&
    (reason === "instance_locked" || isTypeFileRefusal(body) || TYPE_INSTANCE_TEXT_RE.test(deniedReason))
  ) {
    let isTypeFile = isTypeFileRefusal(body) || deniedReason.includes("publish its files with a manifest");
    let typesOn = getLiveState().frozenArtifactTypes?.typesOn;
    return {
      code: "type_locked",
      msg: `deploy 422: ${deniedReason}${!isTypeFile || typesOn === undefined ? "" : typesOn ? TYPE_INSTANCE_REFUSAL_TEXT : TYPE_INSTANCE_NO_PUBLISH_TEXT}`,
    };
  }
  if (status === 422 && reason === "audience_conflict")
    return {
      code: "audience_conflict",
      msg: `deploy 422: ${ensureSentence(deniedReason, SHARE_CHANGE_REFUSED_TEXT)}`,
    };
  if (status === 422 && reason === "capability_refused") {
    let filtered = publishDeniedReason(body, 1500)
      .split(/; (?=capabilities[.: ]|\d+ more\b)/)
      .filter(Boolean);
    let overflow = filtered.length > 1 && /^\d+ more\b/.test(filtered.at(-1)) ? filtered.pop() : undefined;
    if (filtered.length <= 1 && overflow === undefined)
      return {
        code: "capability_refused",
        msg: `deploy 422: ${ensureSentence(deniedReason, declarationRejectedMessage(deniedReason, sent))}`,
      };
    let joined = "";
    let index = 0;
    for (let line of filtered) {
      let next = joined === "" ? line : `${joined}; ${line}`;
      if (next.length > 600 && index > 0) break;
      joined = next;
      index++;
    }
    let filtered_2 = [
      filtered.length > index ? `${filtered.length - index} more not shown` : "",
      overflow ?? "",
    ].filter(Boolean);
    let uniqLines = uniq(
      filtered
        .filter(
          (item) =>
            (/: unavailable$/.test(item) &&
              !sent.capNames.includes(CAPABILITY_REFUSAL_RE.exec(item)?.[1] ?? "")) ||
            (item.startsWith("capabilities.mcp: unavailable") && sent.hostDecl),
        )
        .map((tail) => declarationRejectedMessage(tail, sent).replace(/^Nothing was published; /, "")),
    );
    return {
      code: "capability_refused",
      msg: `deploy 422: ${ensureSentence([joined, ...filtered_2].join("; "), ["Nothing was published; fix each capabilities entry named \u2014 drop the unavailable ones, correct the others as described \u2014 and publish again.", ...uniqLines].join(" Also: "))}`,
    };
  }
  if (
    status === 422 &&
    detail === undefined &&
    sent.latestContract === true &&
    (reason === "contract_refused" || (reason === undefined && isContractRefusalText(deniedReason))) &&
    PUBLISH_ERROR_PATTERNS.test(deniedReason)
  )
    return {
      code: "contract_rollout",
      msg: `deploy 422: ${ensureSentence(deniedReason, CONTRACT_ROLLOUT_TEXT)}`,
    };
  if (
    status === 422 &&
    detail !== undefined &&
    (reason === "contract_refused" || (reason === undefined && isContractRefusalText(deniedReason)))
  )
    return {
      code: "contract_echo_rejected",
      extra: {
        echo_declared_caps: detail.declaredCaps,
      },
      msg:
        `deploy ${status}: ${publishDeniedReason(body, 200)} \u2014 this republish echoed the artifact's stored ` +
        `contract pin (${detail.pin}) and nothing was published. If the reason above says the pin was yanked, pass contract: 'latest' to move the artifact to the current contract (this changes the page's runtime semantics); otherwise tell the user what the service said.`,
    };
  if (status === 403 && reason === "not_owner")
    return {
      code: "publish_denied",
      msg: `${PUBLISH_DENIED_FRAME}this account can open the artifact but is not allowed to publish to it \u2014 nothing was published; ask its owner for edit access, or publish it as a new artifact (omit \`url\`).`,
    };
  if (status === 403 && isCredentialRefusalBody(formatFrameErrorBody(body)))
    return {
      code: "ccr_credential_refused",
    };
  if (status === 403 && reason !== "credential_required") {
    let denyBody = denyPolicyBody(body);
    if (denyBody) {
      let found = PUBLISH_DENIED_REASONS.find((reason) => reason === denyBody.reason);
      let matchedReason = found ? fromEnum(found) : undefined;
      return {
        code: "publish_denied",
        ...(matchedReason && {
          extra: {
            deny_reason: matchedReason,
          },
        }),
        msg: PUBLISH_DENIED_FRAME + scrubServerLine(denyBody.error, 300),
      };
    }
  }
  if (status === 404 && isRedeploy && isFrameNotFoundBody(body))
    return {
      code: "slug_gone",
      msg: SLUG_GONE_MSG,
    };
  if (status === 429) {
    let cap = dailyCapNotice(body);
    if (cap)
      return {
        code: "publish_cap_reached",
        extra: {
          cap_type: fromEnum(cap.capType),
        },
        msg: `${cap.message} \u2014 try again after the reset.`,
      };
    if (isRateLimitedResponse(status, body) && extra.created !== true)
      return {
        code: "rate_limited",
        msg: rateLimitedResult(extra),
      };
  }
  if (status === 408 && reason === "read_timeout")
    return {
      msg: `deploy 408: ${ensureSentence(publishDeniedReason(body, 200), "Nothing was published; the server stopped waiting for the upload \u2014 retry once.")}`,
    };
  return {};
}
//@ chunk-06y4szbn.js:173145-173337 placement
function refusalReasonOf(body) {
  if (typeof body === "string") return regExp_2.exec(body.trimEnd())?.[1];
  if (body === null || typeof body !== "object" || !("reason" in body)) return;
  let reason = body.reason;
  return typeof reason === "string" && SAFE_LABEL_RE.test(reason) ? reason : undefined;
}
//@ chunk-06y4szbn.js:173337-173375 placement
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-06y4szbn.js:173337", () => {
  regExp_2 = new RegExp(` \\[(${SAFE_LABEL_TEXT})\\]$`);
});
//@ chunk-06y4szbn.js:173506-173653 placement = getRequestTooLargeErrorMessage (0.789)
/**
 * 对象的 max 字段为正安全整数时返回。旧版名 getRequestTooLargeErrorMessage 为错配。疑似归错文件（部署/live-path 错误解析）。
 */
function readPositiveMax(value) {
  if (value === null || typeof value !== "object" || !("max" in value)) return;
  let max = value.max;
  return typeof max === "number" && Number.isSafeInteger(max) && max > 0 ? max : undefined;
}
//@ chunk-06y4szbn.js:173653-174615 placement
/**
 * 部署接口 409/422 错误码（path_is_live/one_live_path/live_path_cap/live-editing budget）映射成 {code,msg}。疑似归错文件。
 */
function classifyDeployError(status, body, isRetry) {
  let reason = refusalReasonOf(body);
  if (status === 409 && reason === "path_is_live")
    return {
      code: "path_is_live",
      msg: `deploy 409: ${errBody(body)}`,
    };
  if (status === 422 && reason === "one_live_path")
    return {
      code: "one_live_path",
      msg: `deploy 422: ${errBody(body)}`,
    };
  if (status === 422 && reason === "live_path_cap") {
    let positiveMax = readPositiveMax(body);
    return {
      code: "live_path_cap",
      msg: `deploy 422: ${errBody(body)}`,
    };
  }
  if (status === 422 && reason === "live_path_delete")
    return {
      code: "live_path_delete",
      msg: `deploy 422: ${errBody(body)}`,
    };
  if (status === 422 && reason === "render_over_budget")
    return {
      code: "live_over_budget",
      msg: `deploy 422: ${errBody(body)}`,
    };
  if (status === 422 && reason === "render_unavailable")
    return {
      code: "render_unavailable",
      msg: `deploy 422: ${errBody(body)}`,
    };
  if (status === 422 && reason === "live_over_budget")
    return {
      code: "live_over_budget",
      msg:
        typeof body === "string"
          ? `deploy 422: ${scrubServerLine(body.trimEnd().replace(regExp_2, ""), 500)}`
          : `deploy 422: ${publishDeniedReason(body, 500)}`,
    };
  if (status === 422 && typeof body === "string" && LIVE_EDITING_BUDGET_REGEX.test(body))
    return {
      code: "live_over_budget",
      msg: `deploy 422: ${scrubServerLine(body, 500)}`,
    };
  if (status === 503 && reason === "render_busy")
    return {
      code: "render_busy",
      msg: `deploy 503: ${errBody(body)}`,
    };
  return;
}
//@ chunk-06y4szbn.js:174615-174656 placement
/**
 * "exceeds the live-editing budget"。
 */
var LIVE_EDITING_BUDGET_REGEX = /exceeds the live-editing budget/;
//@ chunk-06y4szbn.js:174656-174706 placement
function deploy400Message(status, emptyPatch) {
  return `deploy 400: ${scrubServerLine(status, 200)}`;
}
//@ chunk-06y4szbn.js:174706-174754 placement
function deploy400Fallback(body) {
  return `deploy 400: ${scrubServerLine(body, 200)}`;
}
//@ chunk-06y4szbn.js:174754-174780 placement
function isIgnorable400(status, body) {
  return false;
}
//@ chunk-06y4szbn.js:174780-174852 placement
function isUnknownLiveFieldError(status, body) {
  return (
    (body.liveKey && PATCH_ERROR_PATTERNS.test(status)) || (body.emptyPatch && EMPTY_MANIFEST_RE.test(status))
  );
}
//@ chunk-06y4szbn.js:174852-174888 placement
function errBody(data) {
  return scrubServerLine(formatFrameErrorBody(data), 200);
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
  TYPE_INSTANCE_TEXT_RE,
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
