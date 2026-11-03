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
import { u, string, M, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { organizationSubPath, buildOrgGetRequest } from "./orgRequests.js";
import {
  archiveFileName,
  publishRequestWithRetry,
  Dt,
  publishRequestOnce,
  MAX_SCAN_POLLS,
  extractMarkupText,
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
var withArchive = (archive, r, s) => ({
  ...s,
  archive,
  manifest: r.manifest,
});
//@ chunk-9cjx5pnm.js:21690-21738 placement
var xa = Object.freeze(["pass", "warn", "unknown"]);
//@ chunk-9cjx5pnm.js:21738-22110 placement
function scanStateOf(e, r, s) {
  let n = s ? e.content_scan === null : e.content_scan == null;
  let a = r === false && n;
  let m = Boolean(e.pending_version) && e.served !== true;
  let included = xa.includes(e.content_scan?.combined_assessment ?? "");
  return (
    firstTruthy([
      e.content_scan?.status === "errored" && "failed",
      !a && e.content_scan?.status !== "completed" && "processing",
      e.served === false && "processing",
      m && "processing",
      a && "none",
      !included && "failed",
    ]) ?? "passed"
  );
}
//@ chunk-9cjx5pnm.js:22110-22407 placement
var toPublishedPlugin = (id, r, s) => ({
  id,
  name: r.name,
  version: r.version,
  scan: scanStateOf(r, r.scan_requested ?? s?.isScanAsked, s !== undefined),
  isScanAsked: r.scan_requested ?? s?.isScanAsked,
  verdict: r.content_scan?.combined_assessment ?? r.content_scan?.status,
  isAwaitingCurrent: r.awaiting_make_current === true || s?.isAwaitingCurrent === true,
});
//@ chunk-9cjx5pnm.js:22407-22727 placement
var publishResponseSchema = DoctorLazy(() =>
  u({
    id: string().min(1).optional(),
    name: string().optional(),
    version: string().optional(),
    marketplace_id: string().optional(),
    served: M().optional(),
    pending_version: string().nullish(),
    scan_requested: M().nullish(),
    awaiting_make_current: unknown().optional(),
    content_scan: u({
      status: string().optional(),
      combined_assessment: string().nullish(),
    }).nullish(),
  }),
);
//@ chunk-9cjx5pnm.js:22727-22826 placement
/**
 * 从响应里取出已发布的插件信息。
 */
function publishedFromResponse(e, r) {
  let s = publishResponseSchema().safeParse(e).data ?? {};
  let id = r?.id ?? s.id;
  return id !== undefined ? toPublishedPlugin(id, s, r) : undefined;
}
//@ chunk-9cjx5pnm.js:22826-22934 placement
var accountUploadPath = (e, r, s) =>
  `${organizationSubPath(r, ["marketplaces", e, "plugins", "account-upload"])}?overwrite=${String(s === "replace")}`;
//@ chunk-9cjx5pnm.js:22971-23092 placement
function newNameFormPart(e, r) {
  let s = archiveFileName(r);
  return s !== r.name
    ? `\r
--${e}\r
Content-Disposition: form-data; name="new_name"\r
\r
` + s
    : "";
}
//@ chunk-9cjx5pnm.js:23092-23359 placement
function buildPublishMultipart(archive, manifest) {
  let s = `----PluginPublish${randomUUID()}`;
  let n = archiveFileName(manifest);
  return {
    boundary: s,
    body: Buffer.concat([
      Buffer.from(`--${s}\r
Content-Disposition: form-data; name="file"; filename="${n}.zip"\r
Content-Type: application/zip\r
\r
`),
      archive,
      Buffer.from(
        newNameFormPart(s, manifest) +
          `\r
--${s}--\r
`,
      ),
    ]),
  };
}
//@ chunk-9cjx5pnm.js:23359-23505 placement
function buildUploadRequest(e, r, s) {
  let publishMultipart = buildPublishMultipart(r.archive, r.manifest);
  return {
    method: "post",
    path: accountUploadPath(e, r, s),
    body: publishMultipart.body,
    headers: multipartHeaders(publishMultipart),
    bound: "progress",
    signal: r.signal,
  };
}
//@ chunk-9cjx5pnm.js:23505-23693 placement
async function uploadPluginArchive(e, r, s) {
  let n = await publishRequestWithRetry(buildUploadRequest(e, r, s));
  if ("kind" in n) return n;
  if (parsePublishApiError(n).code === "plugin_upload_already_exists") return "exists";
  return isClientErrorStatus(n)
    ? (publishedFromResponse(n.data, undefined) ?? refusalResult("other"))
    : publishApiOutcome(n, Dt);
}
//@ chunk-9cjx5pnm.js:23693-23779 placement
/**
 * 替换已存在的归档（已存在则返回 busy）。
 */
async function replaceArchive(e, r) {
  let s = await uploadPluginArchive(e, r, "replace");
  return s === "exists" ? refusalResult("busy") : s;
}
//@ chunk-9cjx5pnm.js:23779-23791 placement
/**
 * 轮询扫描状态的间隔（5000 毫秒）。
 */
var POLL_DELAY_MS = 5000;
//@ chunk-9cjx5pnm.js:23791-23912 placement
async function refreshScanStatus(e, r) {
  let s = await publishRequestOnce(buildOrgGetRequest(e, ["plugins", r.id, "scan-status"]));
  return "status" in s && isClientErrorStatus(s) ? (publishedFromResponse(s.data, r) ?? r) : r;
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
  e,
  r,
  s = {
    left: MAX_SCAN_POLLS,
    until: Date.now() + MAX_SCAN_WAIT_MS,
  },
) {
  if (!(
    r.scan === "processing" &&
    !r.isAwaitingCurrent &&
    !e.signal.aborted &&
    s.left > 0 &&
    Date.now() < s.until
  ))
    return r;
  await sleep(POLL_DELAY_MS, e.signal);
  return waitForContentScan(e, await refreshScanStatus(e, r), {
    left: s.left - 1,
    until: s.until,
  });
}
//@ chunk-9cjx5pnm.js:24169-24246 placement
var listAccountMarketplaces = (e) =>
  extractMarkupText(buildOrgGetRequest(e, ["marketplaces", "list-account-marketplaces"]), () =>
    ensureUploadsMarketplace(e),
  );
//@ chunk-9cjx5pnm.js:24246-24368 placement
async function uploadOrReplace(e, r) {
  let s = await uploadPluginArchive(e, r, "new");
  if (s !== "exists") return s;
  return r.mode === "replace" ? replaceArchive(e, r) : refusalResult("exists");
}
//@ chunk-9cjx5pnm.js:24368-24549 placement
async function currentOrganization() {
  let e = normalizeUuidOrNull(
    isDesktopSessionWithOwnToken() ? env.CLAUDE_CODE_ORGANIZATION_UUID : await getOrganizationUUID(),
  );
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  let s = storedOauthAccountInfo?.organizationUuid === e;
  if (e === null) return;
  return {
    id: e,
    name: (s && storedOauthAccountInfo?.organizationName) || undefined,
  };
}
//@ chunk-9cjx5pnm.js:24549-24601 placement
async function ensureOrganization(e) {
  return e !== undefined ? undefined : currentOrganization();
}
//@ chunk-9cjx5pnm.js:24601-24643 placement
var organizationAvailability = () =>
  isDesktopSessionWithOwnToken() ? "no-organization" : authUnavailableReasonByMode();
//@ chunk-9cjx5pnm.js:24643-24828 placement
var publishRequestHash = (e) =>
  computeContentHash(
    jsonStringify([
      e.plan.root,
      e.wanted.destination,
      e.organization.id,
      pluginNameLine(e.plan.manifest),
      e.wanted.mode,
      e.plan.listing.files.map((file) => [file.path, file.bytes, file.mode, e.plan.hashes[file.path]]),
    ]),
  );
//@ chunk-9cjx5pnm.js:24828-24948 placement
function explainUnreadable(e, r) {
  return e.refusal.kind === "unreadable" && hasReadDenyRuleInForce(r.permissions())
    ? {
        ...e,
        refusal: {
          ...e.refusal,
          details: [],
        },
      }
    : e;
}
//@ chunk-9cjx5pnm.js:24977-25086 placement
var readDeniedFiles = (e, r, s) =>
  r.files
    .map((file) => file.path)
    .filter((n) =>
      hasReadDenyRuleForPath(
        join(e[0] ?? "", n),
        s.permissions(),
        e.map((a) => join(a, n)),
      ),
    );
//@ chunk-9cjx5pnm.js:25086-25159 placement
function readDeniedOutcome(e, r, s) {
  return readDeniedFiles(e, r, s).length === 0 ? undefined : refusalResult("read-denied");
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
var isReadDeniedByRule = (e, r) =>
  DENY_LAYERS.includes(
    layeredReadVerdictForPaths([e], r.permissions(), {
      refuseAutomounterShapes: true,
    }).layer,
  );
//@ chunk-9cjx5pnm.js:25351-25549 placement
async function checkPublishReadRules(e, r) {
  let s = resolve(getCwd(), e.path);
  if (isReadDeniedByRule(s, r)) return refusalResult("read-denied");
  if (!hasReadDenyRuleInForce(r.permissions())) return;
  let n = await realpath(s).catch(() => s);
  let a = await unreadableOnError(scanPublishFolder(n));
  return "kind" in a ? a : readDeniedOutcome([s, n], a, r);
}
//@ chunk-9cjx5pnm.js:25581-25643 placement
/**
 * 判断读取路径是否会经过网络路径。
 */
var isNetworkPathRead = (path, r, s) =>
  checkReadNetworkPathSafety(
    s.tool,
    {
      path,
    },
    s.permissions(),
    r,
  ) !== null;
//@ chunk-9cjx5pnm.js:25643-25803 placement
function publishPathScreenState(e, r) {
  if (isNetworkPathRead(e.path, [e.path], r)) return "network-path";
  let path = resolve(getCwd(), e.path);
  let pathsForNetworkScreen = getPathsForNetworkScreen(path);
  return isNetworkPathRead(path, pathsForNetworkScreen.paths, r)
    ? "network-path"
    : pathsForNetworkScreen.vetted
      ? undefined
      : "unreadable";
}
//@ chunk-9cjx5pnm.js:25803-25843 placement
var publishFlagState = (e, r) => (isPluginPublishAllowed() ? publishPathScreenState(e, r) : "flag-off");
//@ chunk-9cjx5pnm.js:25843-25869 placement
var hashCanonical = (shown) => computeContentHash(jsonStringify(sortKeysDeep(shown)));
//@ chunk-9cjx5pnm.js:25869-25914 placement
var hashPublishInput = (question) =>
  hashCanonical(PUBLISH_QUESTION_SCHEMA().safeParse(question).data ?? question);
//@ chunk-9cjx5pnm.js:25914-26049 placement
var normalizePublishInput = (e) => ({
  folder: e.path,
  destination: e.destination ?? "organization",
  description: e.description,
  mode: e.replace === true ? "replace" : "new",
});
//@ chunk-9cjx5pnm.js:26078-26153 placement
/**
 * 判断 manifest 的写入是否被拒绝。
 */
var isManifestWriteDenied = (e, r) =>
  checkWritePermissionForTool(
    FileWriteTool,
    {
      file_path: e,
      content: "",
    },
    r,
  ).behavior === "deny" || hasReadDenyRuleForPath(e, r);
//@ chunk-9cjx5pnm.js:26153-26323 placement
var ep = Object.freeze(
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
function hasPublishDenyRule(e, r) {
  let s = r.permissions();
  let filtered = getDenyRules(s).filter((a) => !NARROWING_RULE_SOURCES.includes(a.source));
  return (
    ep.some((a) => getDenyRuleForTool(s, a, filtered) !== null) ||
    uniq(e).some((a) => isManifestWriteDenied(join(a, PLUGIN_MANIFEST_PATH), s))
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
