/**
 * services/plugins/publish/publishStatus.ts
 *
 * 2.1.316 新增：插件发布请求与提交状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-77qzxtqv.js (49)
 * attribution: placement 49
 */
import {
  EMPTY_OUTCOME,
  PUBLISH_HTTP,
  parsePublishApiError,
  NOT_SERVED_STATUSES,
  isClientErrorStatus,
  publishApiOutcome,
  slugifyPluginName,
  stoppedOrResult,
} from "./publishSnapshot.js";
import { OAUTH_BETA_HEADER } from "../../../constants/oauth.js";
import { apiClient } from "../../routines/routinesApi.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import {
  refusalResult,
  pluginCustomizeUrl,
  securityScanLines,
} from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { objectSchema, stringSchema, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { buildOrgGetRequest, organizationSubPath } from "./orgRequests.js";
import { toAccountMarketplaceLocalName } from "../../../utils/plugins/claudeAiMarketplaces.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { flushLogs } from "../../analytics/datadog.js";
import { buildInstallPreferenceFields } from "../../../utils/swarm/permissionSync.js";

//@ chunk-77qzxtqv.js:15303-15387 placement
/**
 * 为发布请求生成选项（进度上传或按方法取超时）。
 */
function requestOptionsFor(request) {
  return request.bound === "progress"
    ? {
        streamUpload: EMPTY_OUTCOME,
      }
    : {
        timeout: PUBLISH_HTTP[request.method],
      };
}
//@ chunk-77qzxtqv.js:15387-15436 placement
/**
 * 给请求头加上 anthropic-beta。
 */
var withOAuthBetaHeader = (options) => ({
  ...options.headers,
  "anthropic-beta": OAUTH_BETA_HEADER,
});
//@ chunk-77qzxtqv.js:15436-15451 placement
/**
 * 发布响应的最大字节数（4 MiB）。
 */
var MAX_PUBLISH_CONTENT_LENGTH = 4194304;
//@ chunk-77qzxtqv.js:15451-15627 placement
var publishRequestOptions = (request) => ({
  auth: "teleport-org",
  headers: withOAuthBetaHeader(request),
  ...requestOptionsFor(request),
  signal: request.signal,
  maxBodyLength: Buffer.byteLength(request.body ?? ""),
  maxContentLength: MAX_PUBLISH_CONTENT_LENGTH,
  maxRedirects: 0,
  validateStatus: () => true,
});
//@ chunk-77qzxtqv.js:15627-15716 placement
/**
 * 发出一次发布请求（GET 或 POST）。
 */
function publishRequest(request) {
  return request.method === "get"
    ? apiClient.get(request.path, publishRequestOptions(request))
    : apiClient.post(request.path, request.body, publishRequestOptions(request));
}
//@ chunk-77qzxtqv.js:15716-15761 placement
var NO_ANSWER_OUTCOME = Object.freeze({
  status: 0,
  data: undefined,
});
//@ chunk-77qzxtqv.js:15761-15868 placement
function noAnswerOutcome(request, error) {
  logForDebugging(`plugin publish: ${request.method} ${request.path} got no answer: ` + errorMessage(error), {
    level: "error",
  });
  return NO_ANSWER_OUTCOME;
}
//@ chunk-77qzxtqv.js:15868-15985 placement
var REFUSAL_REASON_CLASSES = Object.freeze({
  "data-residency": "third-party",
  "essential-traffic-only": "traffic-off",
  "no-auth": "signed-out",
});
//@ chunk-77qzxtqv.js:15985-16120 placement
async function publishRequestOnce(request) {
  let response = await publishRequest(request).catch((error) => noAnswerOutcome(request, error));
  return "status" in response
    ? {
        status: response.status,
        data: response.data,
      }
    : refusalResult(REFUSAL_REASON_CLASSES[response.reason] ?? "other");
}
//@ chunk-77qzxtqv.js:16120-16331 placement
var RETRYABLE_PUBLISH_ERROR_CODES = Object.freeze([
  "plugin_upload_conflict",
  "plugin_previous_save_scanning",
  "plugin_upload_busy",
  "plugin_content_scan_rate_limited",
  "org_library_submission_conflict",
  "org_library_submission_source_changed",
]);
//@ chunk-77qzxtqv.js:16331-16342 placement
/**
 * 状态码 429。
 */
var STATUS_TOO_MANY_REQUESTS = 429;
//@ chunk-77qzxtqv.js:16342-16353 placement
/**
 * 状态码 503。
 */
var STATUS_UNAVAILABLE = 503;
//@ chunk-77qzxtqv.js:16353-16383 placement
var RETRYABLE_PUBLISH_STATUSES = Object.freeze([STATUS_TOO_MANY_REQUESTS, STATUS_UNAVAILABLE]);
//@ chunk-77qzxtqv.js:16383-16488 placement
var isRetryablePublishResponse = (request, response) =>
  (request.method === "get" && response.status === NO_ANSWER_OUTCOME.status) ||
  RETRYABLE_PUBLISH_STATUSES.includes(response.status) ||
  RETRYABLE_PUBLISH_ERROR_CODES.includes(parsePublishApiError(response).code ?? "");
//@ chunk-77qzxtqv.js:16488-16497 placement
/**
 * 发布请求的最多尝试次数（3）。
 */
var MAX_PUBLISH_RETRIES = 3;
//@ chunk-77qzxtqv.js:16497-16509 placement
/**
 * 发布重试的等待（2000 毫秒）。
 */
var PUBLISH_RETRY_DELAY_MS = 2000;
//@ chunk-77qzxtqv.js:16509-16653 placement
async function publishRequestWithRetry(request, retriesLeft = MAX_PUBLISH_RETRIES) {
  let response = await publishRequestOnce(request);
  if (!(
    retriesLeft > 0 &&
    !request.signal.aborted &&
    "status" in response &&
    isRetryablePublishResponse(request, response)
  ))
    return response;
  await sleep(PUBLISH_RETRY_DELAY_MS, request.signal);
  return publishRequestWithRetry(request, retriesLeft - 1);
}
//@ chunk-77qzxtqv.js:16653-16721 placement
var firstArrayIn = (body) => [body, ...Object.values(Object(body))].find(Array.isArray) ?? [];
//@ chunk-77qzxtqv.js:16721-17084 placement
var librarySubmissionSchema = DoctorLazy(() =>
  objectSchema({
    uuid: stringSchema().optional(),
    plugin_id: stringSchema().nullish(),
    plugin_name: stringSchema().nullish(),
    status: stringSchema().optional(),
    publish_state: stringSchema().nullish(),
    updates_published_plugin_id: stringSchema().nullish(),
    denial_reason: stringSchema().nullish(),
    content_scan: unknown().optional(),
    outcome: objectSchema({
      published_plugin_id: stringSchema().nullish(),
      published_marketplace_id: stringSchema().nullish(),
      failure_reason: stringSchema().nullish(),
    }).nullish(),
  }),
);
//@ chunk-77qzxtqv.js:17084-17172 placement
/**
 * 从错误响应里解析已提交记录。
 */
var submissionsFromErrorBody = (body) =>
  firstArrayIn(body).flatMap((item) =>
    [librarySubmissionSchema().safeParse(item)].flatMap((parsed) => (parsed.success ? [parsed.data] : [])),
  );
//@ chunk-77qzxtqv.js:17172-18090 placement
var SUBMISSION_STATE_REASONS_2 = Object.freeze({
  plugin_version_scan_pending: "scan-pending",
  plugin_version_scan_failed: "scan",
  org_library_submission_already_pending: "already-pending",
  org_library_submission_installs_for_members: "installs-for-members",
  org_library_submission_nothing_to_publish: "nothing-new",
  org_library_submission_publish_in_progress: "in-progress",
  org_library_submission_update_needs_admin: "needs-admin",
  org_library_submission_update_needs_org_settings: "needs-org-settings",
  org_library_submission_name_taken: "name-conflict",
  org_library_submission_library_full: "library-full",
  org_library_submission_update_name_mismatch: "busy",
  org_library_submission_update_target_deleted: "busy",
  org_library_submission_install_preference_requires_review: "busy",
  org_library_submission_conflict: "busy",
  org_library_submission_source_changed: "busy",
  plugin_upload_busy: "busy",
  plugin_content_scan_rate_limited: "busy",
  legal_attestation_required: "legal",
});
//@ chunk-77qzxtqv.js:18090-18183 placement
var SUBMISSION_STATUS_CLASSES = Object.freeze({
  0: "busy",
  401: "signed-out",
  404: "publishing-off",
  429: "busy",
  503: "busy",
});
//@ chunk-77qzxtqv.js:18183-18228 placement
var SUBMISSION_CLASSES = Object.freeze({
  codes: SUBMISSION_STATE_REASONS_2,
  statuses: SUBMISSION_STATUS_CLASSES,
});
//@ chunk-77qzxtqv.js:18228-18404 placement
async function fetchMySubmissions(organization) {
  let response = await publishRequestWithRetry(
    buildOrgGetRequest(organization, ["library_submissions", "me"]),
  );
  if ("kind" in response) return response;
  if (NOT_SERVED_STATUSES.includes(response.status)) return refusalResult("not-served");
  return isClientErrorStatus(response)
    ? submissionsFromErrorBody(response.data)
    : publishApiOutcome(response, SUBMISSION_CLASSES);
}
//@ chunk-77qzxtqv.js:18404-18504 placement
var withUploadLink = (result, submission) =>
  refusalResult(
    result.refusal.kind,
    result.refusal.details.concat(`See or remove the upload: ${pluginCustomizeUrl(submission.id)}`),
  );
//@ chunk-77qzxtqv.js:18504-18755 placement
var SUBMISSION_STATE_REASONS_ALT = Object.freeze({
  plugin_version_scan_pending: "scan-pending",
  plugin_version_scan_failed: "scan",
  org_library_submission_publish_not_started: "busy",
  org_library_submission_publish_timed_out: "busy",
  org_library_submission_publisher_unavailable: "busy",
});
//@ chunk-77qzxtqv.js:18755-18794 placement
var CLAUDEAI_ORGANIZATION_LIBRARY = "claudeai-organization-library";
//@ chunk-77qzxtqv.js:18794-18865 placement
/**
 * 市场名信息的 schema。
 */
var marketplaceNameSchema = DoctorLazy(() =>
  objectSchema({
    name: stringSchema().optional(),
    marketplace_name: stringSchema().optional(),
  }),
);
//@ chunk-77qzxtqv.js:18865-18973 placement
function installSpecFromPlugin(pluginBody, fallbackName) {
  let parsed = marketplaceNameSchema().safeParse(pluginBody).data;
  let marketplaceName =
    toAccountMarketplaceLocalName(parsed?.marketplace_name ?? "") ?? CLAUDEAI_ORGANIZATION_LIBRARY;
  return `${parsed?.name ?? fallbackName}@${marketplaceName}`;
}
//@ chunk-77qzxtqv.js:18973-19074 placement
async function fetchPublishedInstallSpec(organization, pluginId, fallbackName) {
  let response = await publishRequestOnce(buildOrgGetRequest(organization, ["plugins", pluginId]));
  return installSpecFromPlugin("status" in response ? response.data : undefined, fallbackName);
}
//@ chunk-77qzxtqv.js:19074-19084 placement
/**
 * 归档文件名里名称的最长字符数（64）。
 */
var MAX_ARCHIVE_NAME_CHARS = 64;
//@ chunk-77qzxtqv.js:19084-19122 placement
var archiveFileName = (manifest) =>
  slugifyPluginName(slugifyPluginName(manifest.name).slice(0, MAX_ARCHIVE_NAME_CHARS));
//@ chunk-77qzxtqv.js:19122-19284 placement
async function publishedOutcome(request, pluginId, verdict, isUnscanned) {
  let install = await fetchPublishedInstallSpec(request, pluginId, archiveFileName(request.manifest));
  return {
    kind: "published",
    manifest: request.manifest,
    isUnscanned,
    verdict: verdict.verdict,
    install,
    link: pluginCustomizeUrl(pluginId),
  };
}
//@ chunk-77qzxtqv.js:19284-19373 placement
/**
 * 构造进行中/审核中的发布结果。
 */
var pendingPublishOutcome = (request, kind, verdict, isUnscanned) => ({
  kind,
  manifest: request.manifest,
  isUnscanned,
  verdict: verdict.verdict,
  id: verdict.id,
});
//@ chunk-77qzxtqv.js:19373-19732 placement
async function describePublishOutcome(request, librarySubmission, verdict) {
  let publishedPluginId = librarySubmission.outcome?.published_plugin_id ?? undefined;
  let hasPublishedId = librarySubmission.publish_state === "completed" && publishedPluginId !== undefined;
  let publishFailed = librarySubmission.status === "approved" && librarySubmission.publish_state === "failed";
  let approved = librarySubmission.status === "approved";
  if (publishFailed)
    return refusalResult(
      SUBMISSION_STATE_REASONS_ALT[librarySubmission.outcome?.failure_reason ?? ""] ?? "other",
    );
  let isPublished = approved && hasPublishedId;
  let isUnscanned = verdict.scan === "none" && librarySubmission.content_scan === null;
  return isPublished
    ? publishedOutcome(request, publishedPluginId, verdict, isUnscanned)
    : pendingPublishOutcome(request, approved ? "publishing" : "in-review", verdict, isUnscanned);
}
//@ chunk-77qzxtqv.js:20054-20152 placement
var postToOrganization = (organization, segments, body) => ({
  method: "post",
  path: organizationSubPath(organization, segments),
  body: jsonStringify(body),
  headers: flushLogs,
  bound: "clock",
  signal: organization.signal,
});
//@ chunk-77qzxtqv.js:20152-20308 placement
async function createLibrarySubmission(request, body) {
  let response = await publishRequestWithRetry(postToOrganization(request, ["library_submissions"], body));
  if ("kind" in response) return response;
  return isClientErrorStatus(response)
    ? (librarySubmissionSchema().safeParse(response.data).data ?? refusalResult("other"))
    : publishApiOutcome(response, SUBMISSION_CLASSES);
}
//@ chunk-77qzxtqv.js:20308-20548 placement
function scanStateOutcome(request, published) {
  if (request.signal.aborted || published.scan === "failed")
    return withUploadLink(
      stoppedOrResult(request, refusalResult("scan", securityScanLines(published)), "shelved"),
      published,
    );
  if (published.isAwaitingCurrent) return withUploadLink(refusalResult("not-current"), published);
  return published.scan === "processing"
    ? {
        kind: "on-shelf",
        manifest: request.manifest,
        id: published.id,
      }
    : undefined;
}
//@ chunk-77qzxtqv.js:20548-20692 placement
async function setPluginInstallPreference(request, published, entries) {
  let outcome = scanStateOutcome(request, published);
  if (outcome !== undefined) return outcome;
  let librarySubmission = await createLibrarySubmission(
    request,
    buildInstallPreferenceFields(published, entries),
  );
  return "kind" in librarySubmission
    ? withUploadLink(stoppedOrResult(request, librarySubmission, "submitting"), published)
    : describePublishOutcome(request, librarySubmission, published);
}
//@ chunk-77qzxtqv.js:20692-20708 placement
var MANUAL_SOURCE = "manual";
//@ chunk-77qzxtqv.js:20708-20774 placement
var MY_UPLOADS_MARKETPLACE = Object.freeze({
  name: "My Uploads",
  source: MANUAL_SOURCE,
  source_url: "",
});
//@ chunk-77qzxtqv.js:20774-20829 placement
var marketplaceRefSchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema().min(1),
    source: stringSchema().optional(),
  }),
);
//@ chunk-77qzxtqv.js:20829-20917 placement
/**
 * 找出手工上传市场的 id。
 */
var manualMarketplaceId = (body) =>
  [body, ...firstArrayIn(body)]
    .map((entry) => marketplaceRefSchema().safeParse(entry).data)
    .find((parsed) => parsed?.source === MANUAL_SOURCE)?.id;
//@ chunk-77qzxtqv.js:20917-21270 placement
var UPLOAD_ERROR_CLASSES = Object.freeze({
  plugin_upload_already_exists: "exists",
  plugin_upload_validation_failed: "invalid",
  plugin_upload_limit_reached: "shelf-full",
  plugin_previous_save_failed_scan: "scan",
  plugin_upload_conflict: "busy",
  plugin_previous_save_scanning: "busy",
  plugin_upload_busy: "busy",
  plugin_content_scan_rate_limited: "busy",
  legal_attestation_required: "legal",
});
//@ chunk-77qzxtqv.js:21270-21377 placement
var UPLOAD_STATUS_CLASSES = Object.freeze({
  0: "busy",
  401: "signed-out",
  403: "creation-off",
  413: "too-large",
  429: "busy",
  503: "busy",
});
//@ chunk-77qzxtqv.js:21377-21422 placement
/**
 * 插件上传错误码/HTTP 状态到简短分类的表（归属错误，属插件上传）。
 */
var UPLOAD_CLASSES = Object.freeze({
  codes: UPLOAD_ERROR_CLASSES,
  statuses: UPLOAD_STATUS_CLASSES,
});
//@ chunk-77qzxtqv.js:21422-21523 placement (2.1.88 match: extractMarkupText, 1)
/**
 * 发布请求的通用收尾：发请求→带 kind 直接返回→4xx 时取手工市场 id 或兜底 refusal，否则按错误码/HTTP 状态表归类。原先误配名 extractMarkupText（同名的另外三个声明分别属于 SDK schema、LSP formatter、SendMessageTool）。
 */
async function requestPublishOutcome(request, fallback) {
  let response = await publishRequestWithRetry(request);
  if ("kind" in response) return response;
  return isClientErrorStatus(response)
    ? (manualMarketplaceId(response.data) ?? fallback())
    : publishApiOutcome(response, UPLOAD_CLASSES);
}
//@ chunk-77qzxtqv.js:21523-21615 placement
/**
 * 创建账号级“My Uploads”市场：POST marketplaces/create-account-marketplace，失败给 refusalResult("other")。
 */
var ensureUploadsMarketplace = (request) =>
  requestPublishOutcome(
    postToOrganization(request, ["marketplaces", "create-account-marketplace"], MY_UPLOADS_MARKETPLACE),
    async () => refusalResult("other"),
  );
//@ chunk-77qzxtqv.js:21615-21625 placement
var MAX_SCAN_POLLS = 60;
export {
  publishRequestOnce,
  fetchMySubmissions,
  archiveFileName,
  publishRequestWithRetry,
  UPLOAD_CLASSES,
  MAX_SCAN_POLLS,
  requestPublishOutcome,
  ensureUploadsMarketplace,
  setPluginInstallPreference,
};
