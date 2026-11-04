/**
 * services/plugins/publish/publishUpload.ts
 *
 * 2.1.316 新增：插件上传、内容扫描等待与读规则检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (38)
 * attribution: placement 38
 */
import { randomUUID } from "crypto";
import { join, resolve } from "path";
import { realpath } from "fs/promises";
import {
  firstTruthy,
  isDesktopSessionWithOwnToken,
  authUnavailableReasonByMode,
} from "../../../utils/auth/authUnavailableReason.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { organizationSubPath, buildOrgGetRequest } from "./orgRequests.js";
import {
  archiveFileName,
  publishRequestWithRetry,
  UPLOAD_CLASSES,
  publishRequestOnce,
  MAX_SCAN_POLLS,
  requestPublishOutcome,
  ensureUploadsMarketplace,
} from "./publishStatus.js";
import {
  parsePublishApiError,
  isClientErrorStatus,
  publishApiOutcome,
  scanPublishFolder,
} from "./publishSnapshot.js";
import {
  refusalResult,
  pluginNameLine,
  PUBLISH_QUESTION_SCHEMA,
} from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { normalizeUuidOrNull } from "../../../utils/agentId.js";
import { env } from "../../../utils/env.js";
import { getOrganizationUUID } from "../../oauth/client.js";
import { getStoredOauthAccountInfo } from "../../../utils/auth.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import {
  hasReadDenyRuleInForce,
  hasReadDenyRuleForPath,
  layeredReadVerdictForPaths,
  checkReadNetworkPathSafety,
  checkWritePermissionForTool,
} from "../../../utils/permissions/filesystem.js";
import { getCwd } from "../../../utils/cwd.js";
import { unreadableOnError } from "./validationCopy.js";
import { getPathsForNetworkScreen } from "../../../utils/fsOperations.js";
import { isPluginPublishAllowed } from "./publishGate.js";
import { sortKeysDeep } from "../../../utils/settings/settingsSourceTrust.js";
import { FileWriteTool } from "../../../tools/FileWriteTool/FileWriteTool.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import {
  getDenyRules,
  NARROWING_RULE_SOURCES,
  getDenyRuleForTool,
} from "../../../utils/permissions/permissions.js";
import { uniq } from "../../../utils/collections.js";
import { PLUGIN_MANIFEST_PATH } from "../../../utils/plugins/commandSource.js";

//@ chunk-9cjx5pnm.js:21557-21634 placement
/**
 * 生成 multipart 上传的 Content-Type。
 */
var multipartHeaders = (publishMultipart) => ({
  "Content-Type": `multipart/form-data; boundary=${publishMultipart.boundary}`,
});
//@ chunk-9cjx5pnm.js:21634-21690 placement
var withArchive = (archive, plan, request) => ({
  ...request,
  archive,
  manifest: plan.manifest,
});
//@ chunk-9cjx5pnm.js:21690-21738 placement
var SEVERITIES_APPLIED = Object.freeze(["pass", "warn", "unknown"]);
//@ chunk-9cjx5pnm.js:21738-22110 placement
function scanStateOf(plugin, requested, prior) {
  let scanAbsent = prior ? plugin.content_scan === null : plugin.content_scan == null;
  let scanNone = requested === false && scanAbsent;
  let hasPendingVersion = Boolean(plugin.pending_version) && plugin.served !== true;
  let included = SEVERITIES_APPLIED.includes(plugin.content_scan?.combined_assessment ?? "");
  return (
    firstTruthy([
      plugin.content_scan?.status === "errored" && "failed",
      !scanNone && plugin.content_scan?.status !== "completed" && "processing",
      plugin.served === false && "processing",
      hasPendingVersion && "processing",
      scanNone && "none",
      !included && "failed",
    ]) ?? "passed"
  );
}
//@ chunk-9cjx5pnm.js:22110-22407 placement
var toPublishedPlugin = (id, plugin, prior) => ({
  id,
  name: plugin.name,
  version: plugin.version,
  scan: scanStateOf(plugin, plugin.scan_requested ?? prior?.isScanAsked, prior !== undefined),
  isScanAsked: plugin.scan_requested ?? prior?.isScanAsked,
  verdict: plugin.content_scan?.combined_assessment ?? plugin.content_scan?.status,
  isAwaitingCurrent: plugin.awaiting_make_current === true || prior?.isAwaitingCurrent === true,
});
//@ chunk-9cjx5pnm.js:22407-22727 placement
var publishResponseSchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema().min(1).optional(),
    name: stringSchema().optional(),
    version: stringSchema().optional(),
    marketplace_id: stringSchema().optional(),
    served: booleanSchema().optional(),
    pending_version: stringSchema().nullish(),
    scan_requested: booleanSchema().nullish(),
    awaiting_make_current: unknown().optional(),
    content_scan: objectSchema({
      status: stringSchema().optional(),
      combined_assessment: stringSchema().nullish(),
    }).nullish(),
  }),
);
//@ chunk-9cjx5pnm.js:22727-22826 placement
/**
 * 从响应里取出已发布的插件信息。
 */
function publishedFromResponse(body, prior) {
  let parsed = publishResponseSchema().safeParse(body).data ?? {};
  let id = prior?.id ?? parsed.id;
  return id !== undefined ? toPublishedPlugin(id, parsed, prior) : undefined;
}
//@ chunk-9cjx5pnm.js:22826-22934 placement
var accountUploadPath = (marketplaceId, organization, mode) =>
  `${organizationSubPath(organization, ["marketplaces", marketplaceId, "plugins", "account-upload"])}?overwrite=${String(mode === "replace")}`;
//@ chunk-9cjx5pnm.js:22971-23092 placement
function newNameFormPart(boundary, manifest) {
  let fileName = archiveFileName(manifest);
  return fileName !== manifest.name
    ? `\r
--${boundary}\r
Content-Disposition: form-data; name="new_name"\r
\r
` + fileName
    : "";
}
//@ chunk-9cjx5pnm.js:23092-23359 placement
function buildPublishMultipart(archive, manifest) {
  let boundary = `----PluginPublish${randomUUID()}`;
  let archiveName = archiveFileName(manifest);
  return {
    boundary,
    body: Buffer.concat([
      Buffer.from(`--${boundary}\r
Content-Disposition: form-data; name="file"; filename="${archiveName}.zip"\r
Content-Type: application/zip\r
\r
`),
      archive,
      Buffer.from(
        newNameFormPart(boundary, manifest) +
          `\r
--${boundary}--\r
`,
      ),
    ]),
  };
}
//@ chunk-9cjx5pnm.js:23359-23505 placement
function buildUploadRequest(organization, plan, mode) {
  let publishMultipart = buildPublishMultipart(plan.archive, plan.manifest);
  return {
    method: "post",
    path: accountUploadPath(organization, plan, mode),
    body: publishMultipart.body,
    headers: multipartHeaders(publishMultipart),
    bound: "progress",
    signal: plan.signal,
  };
}
//@ chunk-9cjx5pnm.js:23505-23693 placement
async function uploadPluginArchive(organization, plan, mode) {
  let response = await publishRequestWithRetry(buildUploadRequest(organization, plan, mode));
  if ("kind" in response) return response;
  if (parsePublishApiError(response).code === "plugin_upload_already_exists") return "exists";
  return isClientErrorStatus(response)
    ? (publishedFromResponse(response.data, undefined) ?? refusalResult("other"))
    : publishApiOutcome(response, UPLOAD_CLASSES);
}
//@ chunk-9cjx5pnm.js:23693-23779 placement
/**
 * 替换已存在的归档（已存在则返回 busy）。
 */
async function replaceArchive(organization, plan) {
  let result = await uploadPluginArchive(organization, plan, "replace");
  return result === "exists" ? refusalResult("busy") : result;
}
//@ chunk-9cjx5pnm.js:23779-23791 placement
/**
 * 轮询扫描状态的间隔（5000 毫秒）。
 */
var POLL_DELAY_MS = 5000;
//@ chunk-9cjx5pnm.js:23791-23912 placement
async function refreshScanStatus(request, published) {
  let response = await publishRequestOnce(
    buildOrgGetRequest(request, ["plugins", published.id, "scan-status"]),
  );
  return "status" in response && isClientErrorStatus(response)
    ? (publishedFromResponse(response.data, published) ?? published)
    : published;
}
//@ chunk-9cjx5pnm.js:23912-23926 placement
/**
 * 等待内容扫描的最长时间（300000 毫秒）。
 */
var MAX_SCAN_WAIT_MS = 300000;
//@ chunk-9cjx5pnm.js:23926-24169 placement
/**
 * 轮询插件内容扫描状态，直到完成、超时或被中止。
 */
async function waitForContentScan(
  request,
  published,
  budget = {
    left: MAX_SCAN_POLLS,
    until: Date.now() + MAX_SCAN_WAIT_MS,
  },
) {
  if (!(
    published.scan === "processing" &&
    !published.isAwaitingCurrent &&
    !request.signal.aborted &&
    budget.left > 0 &&
    Date.now() < budget.until
  ))
    return published;
  await sleep(POLL_DELAY_MS, request.signal);
  return waitForContentScan(request, await refreshScanStatus(request, published), {
    left: budget.left - 1,
    until: budget.until,
  });
}
//@ chunk-9cjx5pnm.js:24169-24246 placement
var listAccountMarketplaces = (request) =>
  requestPublishOutcome(buildOrgGetRequest(request, ["marketplaces", "list-account-marketplaces"]), () =>
    ensureUploadsMarketplace(request),
  );
//@ chunk-9cjx5pnm.js:24246-24368 placement
async function uploadOrReplace(organization, plan) {
  let result = await uploadPluginArchive(organization, plan, "new");
  if (result !== "exists") return result;
  return plan.mode === "replace" ? replaceArchive(organization, plan) : refusalResult("exists");
}
//@ chunk-9cjx5pnm.js:24368-24549 placement
async function currentOrganization() {
  let organizationUuid = normalizeUuidOrNull(
    isDesktopSessionWithOwnToken() ? env.CLAUDE_CODE_ORGANIZATION_UUID : await getOrganizationUUID(),
  );
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let sameOrganization = storedOauthAccountInfo?.organizationUuid === organizationUuid;
  if (organizationUuid === null) return;
  return {
    id: organizationUuid,
    name: (sameOrganization && storedOauthAccountInfo?.organizationName) || undefined,
  };
}
//@ chunk-9cjx5pnm.js:24549-24601 placement
async function ensureOrganization(organization) {
  return organization !== undefined ? undefined : currentOrganization();
}
//@ chunk-9cjx5pnm.js:24601-24643 placement
var organizationAvailability = () =>
  isDesktopSessionWithOwnToken() ? "no-organization" : authUnavailableReasonByMode();
//@ chunk-9cjx5pnm.js:24643-24828 placement
var publishRequestHash = (request) =>
  computeContentHash(
    jsonStringify([
      request.plan.root,
      request.wanted.destination,
      request.organization.id,
      pluginNameLine(request.plan.manifest),
      request.wanted.mode,
      request.plan.listing.files.map((file) => [
        file.path,
        file.bytes,
        file.mode,
        request.plan.hashes[file.path],
      ]),
    ]),
  );
//@ chunk-9cjx5pnm.js:24828-24948 placement
function explainUnreadable(result, context) {
  return result.refusal.kind === "unreadable" && hasReadDenyRuleInForce(context.permissions())
    ? {
        ...result,
        refusal: {
          ...result.refusal,
          details: [],
        },
      }
    : result;
}
//@ chunk-9cjx5pnm.js:24977-25086 placement
var readDeniedFiles = (roots, listing, context) =>
  listing.files
    .map((file) => file.path)
    .filter((path) =>
      hasReadDenyRuleForPath(
        join(roots[0] ?? "", path),
        context.permissions(),
        roots.map((root) => join(root, path)),
      ),
    );
//@ chunk-9cjx5pnm.js:25086-25159 placement
function readDeniedOutcome(roots, listing, context) {
  return readDeniedFiles(roots, listing, context).length === 0 ? undefined : refusalResult("read-denied");
}
//@ chunk-9cjx5pnm.js:25231-25264 placement
/**
 * 表示“被规则拒绝”的分层判定结果。
 */
var DENY_LAYERS = ["bare-deny", "path-deny"];
//@ chunk-9cjx5pnm.js:25264-25351 placement
/**
 * 判断路径读取是否被规则拒绝。
 */
var isReadDeniedByRule = (path, context) =>
  DENY_LAYERS.includes(
    layeredReadVerdictForPaths([path], context.permissions(), {
      refuseAutomounterShapes: true,
    }).layer,
  );
//@ chunk-9cjx5pnm.js:25351-25549 placement
async function checkPublishReadRules(input, context) {
  let absPath = resolve(getCwd(), input.path);
  if (isReadDeniedByRule(absPath, context)) return refusalResult("read-denied");
  if (!hasReadDenyRuleInForce(context.permissions())) return;
  let realPath = await realpath(absPath).catch(() => absPath);
  let listing = await unreadableOnError(scanPublishFolder(realPath));
  return "kind" in listing ? listing : readDeniedOutcome([absPath, realPath], listing, context);
}
//@ chunk-9cjx5pnm.js:25581-25643 placement
/**
 * 判断读取路径是否会经过网络路径。
 */
var isNetworkPathRead = (path, paths, context) =>
  checkReadNetworkPathSafety(
    context.tool,
    {
      path,
    },
    context.permissions(),
    paths,
  ) !== null;
//@ chunk-9cjx5pnm.js:25643-25803 placement
function publishPathScreenState(input, context) {
  if (isNetworkPathRead(input.path, [input.path], context)) return "network-path";
  let path = resolve(getCwd(), input.path);
  let pathsForNetworkScreen = getPathsForNetworkScreen(path);
  return isNetworkPathRead(path, pathsForNetworkScreen.paths, context)
    ? "network-path"
    : pathsForNetworkScreen.vetted
      ? undefined
      : "unreadable";
}
//@ chunk-9cjx5pnm.js:25803-25843 placement
var publishFlagState = (input, context) =>
  isPluginPublishAllowed() ? publishPathScreenState(input, context) : "flag-off";
//@ chunk-9cjx5pnm.js:25843-25869 placement
var hashCanonical = (shown) => computeContentHash(jsonStringify(sortKeysDeep(shown)));
//@ chunk-9cjx5pnm.js:25869-25914 placement
var hashPublishInput = (question) =>
  hashCanonical(PUBLISH_QUESTION_SCHEMA().safeParse(question).data ?? question);
//@ chunk-9cjx5pnm.js:25914-26049 placement
var normalizePublishInput = (input) => ({
  folder: input.path,
  destination: input.destination ?? "organization",
  description: input.description,
  mode: input.replace === true ? "replace" : "new",
});
//@ chunk-9cjx5pnm.js:26078-26153 placement
/**
 * 判断 manifest 的写入是否被拒绝。
 */
var isManifestWriteDenied = (filePath, permissions) =>
  checkWritePermissionForTool(
    FileWriteTool,
    {
      file_path: filePath,
      content: "",
    },
    permissions,
  ).behavior === "deny" || hasReadDenyRuleForPath(filePath, permissions);
//@ chunk-9cjx5pnm.js:26153-26323 placement
var PATCH_TOOL_CAPS = Object.freeze(
  [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME].map((name) =>
    Object.freeze({
      name,
      mcpInfo: undefined,
      familyParentToolName: undefined,
      aliasSkillToolNames: undefined,
      packagingAliasSkillToolNames: undefined,
    }),
  ),
);
//@ chunk-9cjx5pnm.js:26323-26478 placement
function hasPublishDenyRule(roots, context) {
  let permissions = context.permissions();
  let filtered = getDenyRules(permissions).filter((rule) => !NARROWING_RULE_SOURCES.includes(rule.source));
  return (
    PATCH_TOOL_CAPS.some((toolName) => getDenyRuleForTool(permissions, toolName, filtered) !== null) ||
    uniq(roots).some((root) => isManifestWriteDenied(join(root, PLUGIN_MANIFEST_PATH), permissions))
  );
}
export {
  publishRequestHash,
  listAccountMarketplaces,
  uploadOrReplace,
  waitForContentScan,
  withArchive,
  organizationAvailability,
  normalizePublishInput,
  hashPublishInput,
  hashCanonical,
  hasPublishDenyRule,
  publishFlagState,
  checkPublishReadRules,
  ensureOrganization,
  explainUnreadable,
  readDeniedOutcome,
};
