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
  freeze_8,
  PUBLISH_HTTP,
  parsePublishApiError,
  freeze_6,
  isClientErrorStatus,
  publishApiOutcome,
  slugifyPluginName,
  stoppedOrResult,
} from "./publishSnapshot.js";
import { OAUTH_BETA_HEADER } from "../../../constants/oauth.js";
import { apiClient } from "../../routines/routinesApi.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { Qh, sTo, z0s } from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { buildOrgGetRequest, organizationSubPath } from "./orgRequests.js";
import { toAccountMarketplaceLocalName } from "../../../utils/plugins/claudeAiMarketplaces.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { flushLogs } from "../../analytics/datadog.js";
import { buildInstallPreferenceFields } from "../../../utils/swarm/permissionSync.js";

//@ chunk-9cjx5pnm.js:15235-15319 placement
function Tn(e) {
  return e.bound === "progress" ? { streamUpload: freeze_8 } : { timeout: PUBLISH_HTTP[e.method] };
}
//@ chunk-9cjx5pnm.js:15319-15368 placement
var Mn = (e) => ({ ...e.headers, "anthropic-beta": OAUTH_BETA_HEADER });
//@ chunk-9cjx5pnm.js:15368-15383 placement
var In = 4194304;
//@ chunk-9cjx5pnm.js:15383-15559 placement
var publishRequestOptions = (e) => ({
  auth: "teleport-org",
  headers: Mn(e),
  ...Tn(e),
  signal: e.signal,
  maxBodyLength: Buffer.byteLength(e.body ?? ""),
  maxContentLength: In,
  maxRedirects: 0,
  validateStatus: () => !0,
});
//@ chunk-9cjx5pnm.js:15559-15648 placement
function Fn(e) {
  return e.method === "get"
    ? apiClient.get(e.path, publishRequestOptions(e))
    : apiClient.post(e.path, e.body, publishRequestOptions(e));
}
//@ chunk-9cjx5pnm.js:15648-15693 placement
var freeze_9 = Object.freeze({ status: 0, data: void 0 });
//@ chunk-9cjx5pnm.js:15693-15800 placement
function noAnswerOutcome(e, r) {
  return (
    logForDebugging(`plugin publish: ${e.method} ${e.path} got no answer: ` + errorMessage(r), {
      level: "error",
    }),
    freeze_9
  );
}
//@ chunk-9cjx5pnm.js:15800-15917 placement
var freeze_10 = Object.freeze({
  "data-residency": "third-party",
  "essential-traffic-only": "traffic-off",
  "no-auth": "signed-out",
});
//@ chunk-9cjx5pnm.js:15917-16052 placement
async function publishRequestOnce(e) {
  let r = await Fn(e).catch((n) => noAnswerOutcome(e, n));
  return "status" in r ? { status: r.status, data: r.data } : Qh(freeze_10[r.reason] ?? "other");
}
//@ chunk-9cjx5pnm.js:16052-16263 placement
var freeze_11 = Object.freeze([
  "plugin_upload_conflict",
  "plugin_previous_save_scanning",
  "plugin_upload_busy",
  "plugin_content_scan_rate_limited",
  "org_library_submission_conflict",
  "org_library_submission_source_changed",
]);
//@ chunk-9cjx5pnm.js:16263-16274 placement
var Un = 429;
//@ chunk-9cjx5pnm.js:16274-16285 placement
var zn = 503;
//@ chunk-9cjx5pnm.js:16285-16315 placement
var freeze_12 = Object.freeze([Un, zn]);
//@ chunk-9cjx5pnm.js:16315-16420 placement
var isRetryablePublishResponse = (e, r) =>
  (e.method === "get" && r.status === freeze_9.status) ||
  freeze_12.includes(r.status) ||
  freeze_11.includes(parsePublishApiError(r).code ?? "");
//@ chunk-9cjx5pnm.js:16420-16429 placement
var jn = 3;
//@ chunk-9cjx5pnm.js:16429-16441 placement
var Hn = 2000;
//@ chunk-9cjx5pnm.js:16441-16585 placement
async function publishRequestWithRetry(e, r = jn) {
  let s = await publishRequestOnce(e);
  if (!(r > 0 && !e.signal.aborted && "status" in s && isRetryablePublishResponse(e, s))) return s;
  return (await sleep(Hn, e.signal), publishRequestWithRetry(e, r - 1));
}
//@ chunk-9cjx5pnm.js:16585-16653 placement
var firstArrayIn = (e) => [e, ...Object.values(Object(e))].find(Array.isArray) ?? [];
//@ chunk-9cjx5pnm.js:16653-17016 placement
var librarySubmissionSchema = DoctorLazy(() =>
  u({
    uuid: o().optional(),
    plugin_id: o().nullish(),
    plugin_name: o().nullish(),
    status: o().optional(),
    publish_state: o().nullish(),
    updates_published_plugin_id: o().nullish(),
    denial_reason: o().nullish(),
    content_scan: oe().optional(),
    outcome: u({
      published_plugin_id: o().nullish(),
      published_marketplace_id: o().nullish(),
      failure_reason: o().nullish(),
    }).nullish(),
  }),
);
//@ chunk-9cjx5pnm.js:17016-17104 placement
var Wn = (e) =>
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
var freeze_13 = Object.freeze({
  0: "busy",
  401: "signed-out",
  404: "publishing-off",
  429: "busy",
  503: "busy",
});
//@ chunk-9cjx5pnm.js:18115-18160 placement
var freeze_14 = Object.freeze({ codes: SUBMISSION_STATE_REASONS, statuses: freeze_13 });
//@ chunk-9cjx5pnm.js:18160-18336 placement
async function fetchMySubmissions(e) {
  let r = await publishRequestWithRetry(buildOrgGetRequest(e, ["library_submissions", "me"]));
  if ("kind" in r) return r;
  if (freeze_6.includes(r.status)) return Qh("not-served");
  return isClientErrorStatus(r) ? Wn(r.data) : publishApiOutcome(r, freeze_14);
}
//@ chunk-9cjx5pnm.js:18336-18436 placement
var withUploadLink = (e, r) =>
  Qh(e.refusal.kind, e.refusal.details.concat(`See or remove the upload: ${sTo(r.id)}`));
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
var Xn = DoctorLazy(() => u({ name: o().optional(), marketplace_name: o().optional() }));
//@ chunk-9cjx5pnm.js:18797-18905 placement
function installSpecFromPlugin(e, r) {
  let s = Xn().safeParse(e).data,
    n = toAccountMarketplaceLocalName(s?.marketplace_name ?? "") ?? CLAUDEAI_ORGANIZATION_LIBRARY;
  return `${s?.name ?? r}@${n}`;
}
//@ chunk-9cjx5pnm.js:18905-19006 placement
async function fetchPublishedInstallSpec(e, r, s) {
  let n = await publishRequestOnce(buildOrgGetRequest(e, ["plugins", r]));
  return installSpecFromPlugin("status" in n ? n.data : void 0, s);
}
//@ chunk-9cjx5pnm.js:19006-19016 placement
var Zn = 64;
//@ chunk-9cjx5pnm.js:19016-19054 placement
var archiveFileName = (e) => slugifyPluginName(slugifyPluginName(e.name).slice(0, Zn));
//@ chunk-9cjx5pnm.js:19054-19216 placement
async function publishedOutcome(e, r, s, n) {
  let a = await fetchPublishedInstallSpec(e, r, archiveFileName(e.manifest));
  return {
    kind: "published",
    manifest: e.manifest,
    isUnscanned: n,
    verdict: s.verdict,
    install: a,
    link: sTo(r),
  };
}
//@ chunk-9cjx5pnm.js:19216-19305 placement
var ra = (e, r, s, n) => ({ kind: r, manifest: e.manifest, isUnscanned: n, verdict: s.verdict, id: s.id });
//@ chunk-9cjx5pnm.js:19305-19664 placement
async function describePublishOutcome(e, r, s) {
  let n = r.outcome?.published_plugin_id ?? void 0,
    a = r.publish_state === "completed" && n !== void 0,
    m = r.status === "approved" && r.publish_state === "failed",
    f = r.status === "approved";
  if (m) return Qh(SUBMISSION_STATE_REASONS_ALT[r.outcome?.failure_reason ?? ""] ?? "other");
  let c = f && a,
    g = s.scan === "none" && r.content_scan === null;
  return c ? publishedOutcome(e, n, s, g) : ra(e, f ? "publishing" : "in-review", s, g);
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
async function createLibrarySubmission(e, r) {
  let s = await publishRequestWithRetry(postToOrganization(e, ["library_submissions"], r));
  if ("kind" in s) return s;
  return isClientErrorStatus(s)
    ? (librarySubmissionSchema().safeParse(s.data).data ?? Qh("other"))
    : publishApiOutcome(s, freeze_14);
}
//@ chunk-9cjx5pnm.js:20240-20480 placement
function scanStateOutcome(e, r) {
  if (e.signal.aborted || r.scan === "failed")
    return withUploadLink(stoppedOrResult(e, Qh("scan", z0s(r)), "shelved"), r);
  if (r.isAwaitingCurrent) return withUploadLink(Qh("not-current"), r);
  return r.scan === "processing" ? { kind: "on-shelf", manifest: e.manifest, id: r.id } : void 0;
}
//@ chunk-9cjx5pnm.js:20480-20624 placement
async function setPluginInstallPreference(e, r, s) {
  let n = scanStateOutcome(e, r);
  if (n !== void 0) return n;
  let a = await createLibrarySubmission(e, buildInstallPreferenceFields(r, s));
  return "kind" in a
    ? withUploadLink(stoppedOrResult(e, a, "submitting"), r)
    : describePublishOutcome(e, a, r);
}
//@ chunk-9cjx5pnm.js:20624-20640 placement
var MANUAL_SOURCE = "manual";
//@ chunk-9cjx5pnm.js:20640-20706 placement
var MY_UPLOADS_MARKETPLACE = Object.freeze({ name: "My Uploads", source: MANUAL_SOURCE, source_url: "" });
//@ chunk-9cjx5pnm.js:20706-20761 placement
var marketplaceRefSchema = DoctorLazy(() => u({ id: o().min(1), source: o().optional() }));
//@ chunk-9cjx5pnm.js:20761-20849 placement
var ua = (e) =>
  [e, ...firstArrayIn(e)]
    .map((r) => marketplaceRefSchema().safeParse(r).data)
    .find((r) => r?.source === MANUAL_SOURCE)?.id;
//@ chunk-9cjx5pnm.js:20849-21202 placement
var freeze_15 = Object.freeze({
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
var freeze_16 = Object.freeze({
  0: "busy",
  401: "signed-out",
  403: "creation-off",
  413: "too-large",
  429: "busy",
  503: "busy",
});
/**
 * 插件上传错误码/HTTP 状态到简短分类的表（归属错误，属插件上传）。
 */
//@ chunk-9cjx5pnm.js:21309-21354 placement
var freeze_17 = Object.freeze({ codes: freeze_15, statuses: freeze_16 });
/**
 * 插件市场请求：响应带 kind 直接返回，否则按错误表分类（误配名 extractMarkupText，归属错误）。
 */
//@ chunk-9cjx5pnm.js:21354-21455 placement = extractMarkupText (1)
async function extractMarkupText(e, r) {
  let s = await publishRequestWithRetry(e);
  if ("kind" in s) return s;
  return isClientErrorStatus(s) ? (ua(s.data) ?? r()) : publishApiOutcome(s, freeze_17);
}
/**
 * 创建账号市场（marketplaces/create-account-marketplace）的请求包装（归属错误）。
 */
//@ chunk-9cjx5pnm.js:21455-21547 placement
var ga = (e) =>
  extractMarkupText(
    postToOrganization(e, ["marketplaces", "create-account-marketplace"], MY_UPLOADS_MARKETPLACE),
    async () => Qh("other"),
  );
//@ chunk-9cjx5pnm.js:21547-21557 placement
var MAX_SCAN_POLLS = 60;

export {
  archiveFileName,
  publishRequestWithRetry,
  freeze_17,
  publishRequestOnce,
  MAX_SCAN_POLLS,
  extractMarkupText,
  ga,
  fetchMySubmissions,
  setPluginInstallPreference,
};
