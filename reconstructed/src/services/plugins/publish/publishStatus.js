/**
 * services/plugins/publish/publishStatus.ts
 *
 * 2.1.316 新增：插件发布请求与提交状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (49)
 * attribution: placement 49
 */
import {
  An,
  PUBLISH_HTTP,
  parsePublishApiError,
  Rn,
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
import { u, string, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { buildOrgGetRequest, organizationSubPath } from "./orgRequests.js";
import { toAccountMarketplaceLocalName } from "../../../utils/plugins/claudeAiMarketplaces.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { flushLogs } from "../../analytics/datadog.js";
import { buildInstallPreferenceFields } from "../../../utils/swarm/permissionSync.js";

//@ chunk-9cjx5pnm.js:15235-15319 placement
/**
 * 为发布请求生成选项（进度上传或按方法取超时）。
 */
function requestOptionsFor(e) {
  return e.bound === "progress"
    ? {
        streamUpload: An,
      }
    : {
        timeout: PUBLISH_HTTP[e.method],
      };
}
//@ chunk-9cjx5pnm.js:15319-15368 placement
/**
 * 给请求头加上 anthropic-beta。
 */
var withOAuthBetaHeader = (e) => ({
  ...e.headers,
  "anthropic-beta": OAUTH_BETA_HEADER,
});
//@ chunk-9cjx5pnm.js:15368-15383 placement
/**
 * 发布响应的最大字节数（4 MiB）。
 */
var MAX_PUBLISH_CONTENT_LENGTH = 4194304;
//@ chunk-9cjx5pnm.js:15383-15559 placement
var publishRequestOptions = (e) => ({
  auth: "teleport-org",
  headers: withOAuthBetaHeader(e),
  ...requestOptionsFor(e),
  signal: e.signal,
  maxBodyLength: Buffer.byteLength(e.body ?? ""),
  maxContentLength: MAX_PUBLISH_CONTENT_LENGTH,
  maxRedirects: 0,
  validateStatus: () => true,
});
//@ chunk-9cjx5pnm.js:15559-15648 placement
/**
 * 发出一次发布请求（GET 或 POST）。
 */
function publishRequest(e) {
  return e.method === "get"
    ? apiClient.get(e.path, publishRequestOptions(e))
    : apiClient.post(e.path, e.body, publishRequestOptions(e));
}
//@ chunk-9cjx5pnm.js:15648-15693 placement
var qo = Object.freeze({
  status: 0,
  data: undefined,
});
//@ chunk-9cjx5pnm.js:15693-15800 placement
function noAnswerOutcome(e, error) {
  logForDebugging(`plugin publish: ${e.method} ${e.path} got no answer: ` + errorMessage(error), {
    level: "error",
  });
  return qo;
}
//@ chunk-9cjx5pnm.js:15800-15917 placement
var kn = Object.freeze({
  "data-residency": "third-party",
  "essential-traffic-only": "traffic-off",
  "no-auth": "signed-out",
});
//@ chunk-9cjx5pnm.js:15917-16052 placement
async function publishRequestOnce(orgGetRequest) {
  let r = await publishRequest(orgGetRequest).catch((error) => noAnswerOutcome(orgGetRequest, error));
  return "status" in r
    ? {
        status: r.status,
        data: r.data,
      }
    : refusalResult(kn[r.reason] ?? "other");
}
//@ chunk-9cjx5pnm.js:16052-16263 placement
var Dn = Object.freeze([
  "plugin_upload_conflict",
  "plugin_previous_save_scanning",
  "plugin_upload_busy",
  "plugin_content_scan_rate_limited",
  "org_library_submission_conflict",
  "org_library_submission_source_changed",
]);
//@ chunk-9cjx5pnm.js:16263-16274 placement
/**
 * 状态码 429。
 */
var STATUS_TOO_MANY_REQUESTS = 429;
//@ chunk-9cjx5pnm.js:16274-16285 placement
/**
 * 状态码 503。
 */
var STATUS_UNAVAILABLE = 503;
//@ chunk-9cjx5pnm.js:16285-16315 placement
var Cn = Object.freeze([STATUS_TOO_MANY_REQUESTS, STATUS_UNAVAILABLE]);
//@ chunk-9cjx5pnm.js:16315-16420 placement
var isRetryablePublishResponse = (e, r) =>
  (e.method === "get" && r.status === qo.status) ||
  Cn.includes(r.status) ||
  Dn.includes(parsePublishApiError(r).code ?? "");
//@ chunk-9cjx5pnm.js:16420-16429 placement
/**
 * 发布请求的最多尝试次数（3）。
 */
var MAX_PUBLISH_RETRIES = 3;
//@ chunk-9cjx5pnm.js:16429-16441 placement
/**
 * 发布重试的等待（2000 毫秒）。
 */
var PUBLISH_RETRY_DELAY_MS = 2000;
//@ chunk-9cjx5pnm.js:16441-16585 placement
async function publishRequestWithRetry(e, r = MAX_PUBLISH_RETRIES) {
  let s = await publishRequestOnce(e);
  if (!(r > 0 && !e.signal.aborted && "status" in s && isRetryablePublishResponse(e, s))) return s;
  await sleep(PUBLISH_RETRY_DELAY_MS, e.signal);
  return publishRequestWithRetry(e, r - 1);
}
//@ chunk-9cjx5pnm.js:16585-16653 placement
var firstArrayIn = (e) => [e, ...Object.values(Object(e))].find(Array.isArray) ?? [];
//@ chunk-9cjx5pnm.js:16653-17016 placement
var librarySubmissionSchema = DoctorLazy(() =>
  u({
    uuid: string().optional(),
    plugin_id: string().nullish(),
    plugin_name: string().nullish(),
    status: string().optional(),
    publish_state: string().nullish(),
    updates_published_plugin_id: string().nullish(),
    denial_reason: string().nullish(),
    content_scan: unknown().optional(),
    outcome: u({
      published_plugin_id: string().nullish(),
      published_marketplace_id: string().nullish(),
      failure_reason: string().nullish(),
    }).nullish(),
  }),
);
//@ chunk-9cjx5pnm.js:17016-17104 placement
/**
 * 从错误响应里解析已提交记录。
 */
var submissionsFromErrorBody = (e) =>
  firstArrayIn(e).flatMap((r) =>
    [librarySubmissionSchema().safeParse(r)].flatMap((s) => (s.success ? [s.data] : [])),
  );
//@ chunk-9cjx5pnm.js:17104-18022 placement
var SUBMISSION_STATE_REASONS = Object.freeze({
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
//@ chunk-9cjx5pnm.js:18022-18115 placement
var qn = Object.freeze({
  0: "busy",
  401: "signed-out",
  404: "publishing-off",
  429: "busy",
  503: "busy",
});
//@ chunk-9cjx5pnm.js:18115-18160 placement
var mt = Object.freeze({
  codes: SUBMISSION_STATE_REASONS,
  statuses: qn,
});
//@ chunk-9cjx5pnm.js:18160-18336 placement
async function fetchMySubmissions(e) {
  let r = await publishRequestWithRetry(buildOrgGetRequest(e, ["library_submissions", "me"]));
  if ("kind" in r) return r;
  if (Rn.includes(r.status)) return refusalResult("not-served");
  return isClientErrorStatus(r) ? submissionsFromErrorBody(r.data) : publishApiOutcome(r, mt);
}
//@ chunk-9cjx5pnm.js:18336-18436 placement
var withUploadLink = (e, r) =>
  refusalResult(
    e.refusal.kind,
    e.refusal.details.concat(`See or remove the upload: ${pluginCustomizeUrl(r.id)}`),
  );
//@ chunk-9cjx5pnm.js:18436-18687 placement
var SUBMISSION_STATE_REASONS_ALT = Object.freeze({
  plugin_version_scan_pending: "scan-pending",
  plugin_version_scan_failed: "scan",
  org_library_submission_publish_not_started: "busy",
  org_library_submission_publish_timed_out: "busy",
  org_library_submission_publisher_unavailable: "busy",
});
//@ chunk-9cjx5pnm.js:18687-18726 placement
var CLAUDEAI_ORGANIZATION_LIBRARY = "claudeai-organization-library";
//@ chunk-9cjx5pnm.js:18726-18797 placement
/**
 * 市场名信息的 schema。
 */
var marketplaceNameSchema = DoctorLazy(() =>
  u({
    name: string().optional(),
    marketplace_name: string().optional(),
  }),
);
//@ chunk-9cjx5pnm.js:18797-18905 placement
function installSpecFromPlugin(e, r) {
  let s = marketplaceNameSchema().safeParse(e).data;
  let n = toAccountMarketplaceLocalName(s?.marketplace_name ?? "") ?? CLAUDEAI_ORGANIZATION_LIBRARY;
  return `${s?.name ?? r}@${n}`;
}
//@ chunk-9cjx5pnm.js:18905-19006 placement
async function fetchPublishedInstallSpec(e, r, s) {
  let n = await publishRequestOnce(buildOrgGetRequest(e, ["plugins", r]));
  return installSpecFromPlugin("status" in n ? n.data : undefined, s);
}
//@ chunk-9cjx5pnm.js:19006-19016 placement
/**
 * 归档文件名里名称的最长字符数（64）。
 */
var MAX_ARCHIVE_NAME_CHARS = 64;
//@ chunk-9cjx5pnm.js:19016-19054 placement
var archiveFileName = (manifest) =>
  slugifyPluginName(slugifyPluginName(manifest.name).slice(0, MAX_ARCHIVE_NAME_CHARS));
//@ chunk-9cjx5pnm.js:19054-19216 placement
async function publishedOutcome(e, publishedPluginId, s, isUnscanned) {
  let install = await fetchPublishedInstallSpec(e, publishedPluginId, archiveFileName(e.manifest));
  return {
    kind: "published",
    manifest: e.manifest,
    isUnscanned,
    verdict: s.verdict,
    install,
    link: pluginCustomizeUrl(publishedPluginId),
  };
}
//@ chunk-9cjx5pnm.js:19216-19305 placement
/**
 * 构造进行中/审核中的发布结果。
 */
var pendingPublishOutcome = (e, kind, s, isUnscanned) => ({
  kind,
  manifest: e.manifest,
  isUnscanned,
  verdict: s.verdict,
  id: s.id,
});
//@ chunk-9cjx5pnm.js:19305-19664 placement
async function describePublishOutcome(e, librarySubmission, s) {
  let publishedPluginId = librarySubmission.outcome?.published_plugin_id ?? undefined;
  let a = librarySubmission.publish_state === "completed" && publishedPluginId !== undefined;
  let m = librarySubmission.status === "approved" && librarySubmission.publish_state === "failed";
  let f = librarySubmission.status === "approved";
  if (m)
    return refusalResult(
      SUBMISSION_STATE_REASONS_ALT[librarySubmission.outcome?.failure_reason ?? ""] ?? "other",
    );
  let c = f && a;
  let isUnscanned = s.scan === "none" && librarySubmission.content_scan === null;
  return c
    ? publishedOutcome(e, publishedPluginId, s, isUnscanned)
    : pendingPublishOutcome(e, f ? "publishing" : "in-review", s, isUnscanned);
}
//@ chunk-9cjx5pnm.js:19986-20084 placement
var postToOrganization = (e, r, s) => ({
  method: "post",
  path: organizationSubPath(e, r),
  body: jsonStringify(s),
  headers: flushLogs,
  bound: "clock",
  signal: e.signal,
});
//@ chunk-9cjx5pnm.js:20084-20240 placement
async function createLibrarySubmission(e, installPreferenceFields) {
  let s = await publishRequestWithRetry(
    postToOrganization(e, ["library_submissions"], installPreferenceFields),
  );
  if ("kind" in s) return s;
  return isClientErrorStatus(s)
    ? (librarySubmissionSchema().safeParse(s.data).data ?? refusalResult("other"))
    : publishApiOutcome(s, mt);
}
//@ chunk-9cjx5pnm.js:20240-20480 placement
function scanStateOutcome(e, r) {
  if (e.signal.aborted || r.scan === "failed")
    return withUploadLink(stoppedOrResult(e, refusalResult("scan", securityScanLines(r)), "shelved"), r);
  if (r.isAwaitingCurrent) return withUploadLink(refusalResult("not-current"), r);
  return r.scan === "processing"
    ? {
        kind: "on-shelf",
        manifest: e.manifest,
        id: r.id,
      }
    : undefined;
}
//@ chunk-9cjx5pnm.js:20480-20624 placement
async function setPluginInstallPreference(e, r, mySubmissions) {
  let n = scanStateOutcome(e, r);
  if (n !== undefined) return n;
  let librarySubmission = await createLibrarySubmission(e, buildInstallPreferenceFields(r, mySubmissions));
  return "kind" in librarySubmission
    ? withUploadLink(stoppedOrResult(e, librarySubmission, "submitting"), r)
    : describePublishOutcome(e, librarySubmission, r);
}
//@ chunk-9cjx5pnm.js:20624-20640 placement
var MANUAL_SOURCE = "manual";
//@ chunk-9cjx5pnm.js:20640-20706 placement
var MY_UPLOADS_MARKETPLACE = Object.freeze({
  name: "My Uploads",
  source: MANUAL_SOURCE,
  source_url: "",
});
//@ chunk-9cjx5pnm.js:20706-20761 placement
var marketplaceRefSchema = DoctorLazy(() =>
  u({
    id: string().min(1),
    source: string().optional(),
  }),
);
//@ chunk-9cjx5pnm.js:20761-20849 placement
/**
 * 找出手工上传市场的 id。
 */
var manualMarketplaceId = (e) =>
  [e, ...firstArrayIn(e)]
    .map((r) => marketplaceRefSchema().safeParse(r).data)
    .find((r) => r?.source === MANUAL_SOURCE)?.id;
//@ chunk-9cjx5pnm.js:20849-21202 placement
var da = Object.freeze({
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
//@ chunk-9cjx5pnm.js:21202-21309 placement
var ca = Object.freeze({
  0: "busy",
  401: "signed-out",
  403: "creation-off",
  413: "too-large",
  429: "busy",
  503: "busy",
});
//@ chunk-9cjx5pnm.js:21309-21354 placement
/**
 * 插件上传错误码/HTTP 状态到简短分类的表（归属错误，属插件上传）。
 */
var Dt = Object.freeze({
  codes: da,
  statuses: ca,
});
//@ chunk-9cjx5pnm.js:21354-21455 placement = extractMarkupText (1)
/**
 * 插件市场请求：响应带 kind 直接返回，否则按错误表分类（误配名 extractMarkupText，归属错误）。
 */
async function extractMarkupText(e, r) {
  let s = await publishRequestWithRetry(e);
  if ("kind" in s) return s;
  return isClientErrorStatus(s) ? (manualMarketplaceId(s.data) ?? r()) : publishApiOutcome(s, Dt);
}
//@ chunk-9cjx5pnm.js:21455-21547 placement
/**
 * 创建账号市场（marketplaces/create-account-marketplace）的请求包装（归属错误）。
 */
var ensureUploadsMarketplace = (e) =>
  extractMarkupText(
    postToOrganization(e, ["marketplaces", "create-account-marketplace"], MY_UPLOADS_MARKETPLACE),
    async () => refusalResult("other"),
  );
//@ chunk-9cjx5pnm.js:21547-21557 placement
var MAX_SCAN_POLLS = 60;
export {
  archiveFileName,
  publishRequestWithRetry,
  Dt,
  publishRequestOnce,
  MAX_SCAN_POLLS,
  extractMarkupText,
  ensureUploadsMarketplace,
  fetchMySubmissions,
  setPluginInstallPreference,
};
