/**
 * commands/review/ultrareviewPost.ts
 *
 * 2.1.316 新增：ultrareview 结果回贴：拉取云端审查结论并发布到 PR，处理结论未就绪/不可用等情况
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { isUltrareviewPostEnabled } from "./ultrareviewPreconditions.js";
import { raceWithAbortSignal, sleep } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { parseRetryAfterMs as parseRetryAfterMs_2 } from "../../bridge/debugUtils.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { connectGithubUrl } from "../../services/cloudSessions/webSetup.js";

//@ chunk-e6aww6q8.js:1767764-1768324 placement
/**
 * 调用 /v1/code/github/post-review-comment 发布审查评论，网络错误单独归类。
 */
var postReviewComment = "/v1/code/github/post-review-comment";
var POST_REVIEW_COMMENT_TIMEOUT_MS = 60000;
var ULTRAVIEW_POST_TOTAL_BUDGET_MS = 90000;
var DEFAULT_RETRY_AFTER_MS = 5000;
var MAX_RETRY_AFTER_MS = 1e4;
var RETRY_OVERHEAD_RESERVE_MS = 20000;
var RETRYABLE_NETWORK_ERROR_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ETIMEDOUT",
]);
var postCommentReplySchema = DoctorLazy(() =>
  u({
    comment_url: string().min(1),
    already_posted: M().optional(),
  }),
);
var postCommentErrorSchema = DoctorLazy(() =>
  u({
    error: u({
      message: string().optional(),
      reason: string().optional(),
      details: string().optional(),
      resource_type: string().optional(),
    }),
  }),
);
var FINDINGS_MANUAL_POST_HINT = "The findings are above if you want to post them by hand.";
var CHECK_CONNECTION_HINT =
  "Check the pull request before posting by hand \u2014 if the request got through, the comment may still appear.";
//@ chunk-e6aww6q8.js:1768324-1768965 placement
async function waitForUltrareviewPost(sessionId, credentials) {
  if (!isUltrareviewPostEnabled())
    return notPostedResult({
      posted: false,
      kind: "disabled",
    });
  let r = AbortSignal.timeout(ULTRAVIEW_POST_TOTAL_BUDGET_MS);
  let s;
  try {
    s = await raceWithAbortSignal(classifyUltrareviewAuthFailure(sessionId, r, credentials), r, () =>
      Error("ultrareview post deadline"),
    );
  } catch (error) {
    if (r.aborted)
      return notPostedResult({
        posted: false,
        kind: "deadline",
      });
    logForDebugging(`ultrareview post did not complete: ${errorMessage(error)}`);
    let y =
      !isAxiosError(error) ||
      (error.response === undefined && RETRYABLE_NETWORK_ERROR_CODES.has(error.code ?? ""));
    return notPostedResult({
      posted: false,
      kind: y ? "not_sent" : "no_answer",
    });
  }
  if (!s.posted) return notPostedResult(s);
  logEvent("tengu_ultrareview_post", {
    outcome: s.alreadyPosted ? lit_2("already_posted") : lit_2("posted"),
  });
  logFeatureOk("ultrareview_post", {
    already_posted: s.alreadyPosted,
  });
  return {
    status: "posted",
    commentUrl: s.commentUrl,
    alreadyPosted: s.alreadyPosted,
  };
}
//@ chunk-e6aww6q8.js:1768965-1769969 placement
/**
 * 把 ultrareview 回贴时的认证失败（未登录、登录被拒、数据驻留限制）归类为原因码。
 */
async function classifyUltrareviewAuthFailure(sessionId, n, credentials) {
  let now = Date.now();
  for (;;) {
    let h = await apiClient.post(
      postReviewComment,
      {
        session_id: sessionId,
      },
      {
        auth: "teleport-org",
        isRouteOwned401: (q) =>
          describeUltrareviewPostOutcome(401, postErrorOfBody(q)) !== "sign_in_rejected",
        timeout: POST_REVIEW_COMMENT_TIMEOUT_MS,
        signal: n,
        validateStatus: () => true,
        credentials,
      },
    );
    if (!h.ok)
      return h.reason === "no-auth"
        ? {
            posted: false,
            kind: "not_logged_in",
            serverMessage: h.detail,
          }
        : {
            posted: false,
            kind: h.reason === "data-residency" ? "data_residency" : "essential_traffic_only",
          };
    if (h.status >= 200 && h.status < 300) {
      let q = postCommentReplySchema().safeParse(h.data);
      return q.success
        ? {
            posted: true,
            commentUrl: q.data.comment_url,
            alreadyPosted: q.data.already_posted === true,
          }
        : {
            posted: false,
            kind: "unconfirmed",
            status: h.status,
          };
    }
    let y = postErrorOfBody(h.data);
    let S = describeUltrareviewPostOutcome(h.status, y);
    logForDebugging(`ultrareview post refused: ${h.status} ${S}${y?.message ? ` \u2014 ${y.message}` : ""}`);
    let w = {
      posted: false,
      kind: S,
      status: h.status,
      serverMessage: y?.message,
    };
    if (S !== "findings_pending") return w;
    let L = h.response.headers?.["retry-after"];
    let min = Math.min(
      parseRetryAfterMs_2(typeof L === "string" ? L : undefined) || DEFAULT_RETRY_AFTER_MS,
      MAX_RETRY_AFTER_MS,
    );
    if (Date.now() - now + min + RETRY_OVERHEAD_RESERVE_MS > ULTRAVIEW_POST_TOTAL_BUDGET_MS) return w;
    await sleep(min, n, {
      throwOnAbort: true,
    });
  }
}
//@ chunk-e6aww6q8.js:1769969-1770047 placement
function postErrorOfBody(e) {
  let n = postCommentErrorSchema().safeParse(e);
  return n.success ? n.data.error : undefined;
}
//@ chunk-e6aww6q8.js:1770047-1770859 placement
/**
 * 把 ultrareview 回贴结果码转成给用户的说明。
 */
function describeUltrareviewPostOutcome(e, n) {
  switch (e) {
    case 400:
      switch (n?.reason) {
        case "findings_unavailable":
        case "no_pull_request":
        case "unsupported_host":
        case "review_failed":
        case "withheld_by_screen":
        case "github_rejected":
          return n.reason;
        default:
          return "unexpected_response";
      }
    case 401:
      switch (n?.reason) {
        case "github_not_connected":
        case "github_token_rejected":
          return n.reason;
        default:
          return n?.reason?.startsWith("github_") ? "github_not_connected" : "sign_in_rejected";
      }
    case 403:
      return "permission_denied";
    case 404:
      switch (n?.resource_type) {
        case "review_session":
          return "session_not_found";
        case "github_pull_request":
          return "pull_request_not_found";
        default:
          return "route_unavailable";
      }
    case 409:
      return n?.details === "findings_pending" ? "findings_pending" : "check_the_pr";
    case 429:
      return "rate_limited";
    default:
      return e >= 500 ? "unavailable" : "unexpected_response";
  }
}
//@ chunk-e6aww6q8.js:1770859-1771288 placement
/**
 * 结果未发布到 PR 时上报并返回原因。
 */
function notPostedResult({ kind, status, serverMessage }) {
  logEvent("tengu_ultrareview_post", {
    outcome: fromEnum(kind),
    http_status: status,
  });
  if (kind === "disabled") logFeatureSad("ultrareview_post", "ultrareview_post_disabled");
  else logFeatureBad("ultrareview_post", `ultrareview_post_${kind}`);
  return {
    status: "not-posted",
    reason: postUltrareviewFindings(
      kind,
      status,
      serverMessage === undefined
        ? undefined
        : truncateToLength(
            serverMessage
              .normalize("NFKC")
              .replace(/[<>]|\p{Ps}|\p{Pe}|\p{Cc}|\p{Cf}|\p{Zl}|\p{Zp}/gu, " ")
              .replace(/\p{Zs}+/gu, " "),
            200,
          )
            .trim()
            .replace(/\.+$/, ""),
    ),
  };
}
//@ chunk-e6aww6q8.js:1771288-1775153 placement
/**
 * 把云端 ultrareview 的审查结论回贴到 PR；结论未就绪、路径不保留结论、非 PR 审查等情况各给出说明。
 */
function postUltrareviewFindings(kind, status, r) {
  switch (kind) {
    case "findings_pending":
      return `The review's findings weren't ready on the server yet, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "findings_unavailable":
      return `This review ran on a path that doesn't keep its findings for posting, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "no_pull_request":
      return "This review wasn't of a pull request, so there is nowhere to post the findings.";
    case "unsupported_host":
      return `Posting is available for github.com pull requests only, so nothing was posted. ${FINDINGS_MANUAL_POST_HINT}`;
    case "review_failed":
      return `The server recorded this review as incomplete, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "withheld_by_screen":
      return `The comment was withheld by a content safety check (a finding matched a secret-like or unsafe pattern), so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "github_rejected":
      return `GitHub didn't accept the comment, so nothing was posted. ${FINDINGS_MANUAL_POST_HINT}`;
    case "check_the_pr":
      return "An earlier attempt to post this review may already have gone through, so it wasn't posted again. Check the pull request before posting by hand.";
    case "github_not_connected":
      return `Posting needs a GitHub account connected to your Claude account, and none is connected (or the connection expired). Connect one at ${connectGithubUrl()} to post next time; the findings are above if you want to post them by hand now.`;
    case "github_token_rejected":
      return `GitHub no longer accepts the connection stored for your account, so nothing was posted. Reconnect GitHub at ${connectGithubUrl()} to post next time; the findings are above if you want to post them by hand now.`;
    case "sign_in_rejected":
      return "The server didn't accept this session's Claude sign-in for the post, so nothing went to the pull request. Run /login to fix that for next time; the findings are above if you want to post them by hand now.";
    case "session_not_found":
      return `The server couldn't find this review session under your account, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "pull_request_not_found":
      return `GitHub couldn't find the pull request with your account (it may be private to you, deleted, or moved), so nothing was posted. ${FINDINGS_MANUAL_POST_HINT}`;
    case "permission_denied":
      return `Posting this comment isn't allowed for your account${r ? ` (${r})` : ""}, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "rate_limited":
      return `Posting is being rate-limited right now, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "unavailable":
      return `Posting is temporarily unavailable on the server, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "route_unavailable":
      return `This version of the server can't post review comments yet, so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "unexpected_response":
      return `The post didn't go through (${r || `HTTP ${status}`}), so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "unconfirmed":
      return "The server accepted the post but didn't say where the comment is. Check the pull request before posting by hand.";
    case "disabled":
      return `Posting to the pull request is currently turned off, so nothing went to the PR. ${FINDINGS_MANUAL_POST_HINT}`;
    case "not_logged_in":
      return `Posting needs a working Claude sign-in here${r ? ` (${r})` : ""}, so nothing went to the pull request. Run /login to fix that for next time; the findings are above if you want to post them by hand now.`;
    case "data_residency":
      return "Posting goes through Claude Code cloud sessions, which are unavailable on third-party providers.";
    case "essential_traffic_only":
      return "Posting goes through Claude Code cloud sessions, which are unavailable while essential-traffic-only mode is active.";
    case "not_sent":
      return `The post couldn't be sent (the request never reached the server), so nothing went to the pull request. ${FINDINGS_MANUAL_POST_HINT}`;
    case "no_answer":
      return `The post couldn't be confirmed (no answer came back from the server). ${CHECK_CONNECTION_HINT}`;
    case "deadline":
      return `The post took too long to confirm, so the findings are here without a confirmed post. ${CHECK_CONNECTION_HINT}`;
  }
}
//@ chunk-e6aww6q8.js:1775153-1775166 placement
/**
 * ultrareview 投递结果轮询间隔 1000ms。
 */
var POST_POLL_MS = 1000;
export { POST_POLL_MS, waitForUltrareviewPost };
