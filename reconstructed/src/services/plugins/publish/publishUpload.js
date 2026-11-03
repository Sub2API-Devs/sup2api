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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import { realpath, realpath as realpath_2, realpath as realpath_3 } from "fs/promises";
import { wAo, lGn, A$s } from "../../../utils/auth/authUnavailableReason.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, M, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { organizationSubPath, buildOrgGetRequest } from "./orgRequests.js";
import {
  archiveFileName,
  publishRequestWithRetry,
  freeze_17,
  publishRequestOnce,
  MAX_SCAN_POLLS,
  extractMarkupText,
  ga,
} from "./publishStatus.js";
import {
  parsePublishApiError,
  isClientErrorStatus,
  publishApiOutcome,
  scanPublishFolder,
} from "./publishSnapshot.js";
import { Qh, TOr, PUBLISH_QUESTION_SCHEMA } from "../../../tools/PublishPluginTool/constants.js";
import { sleep } from "../../../utils/sleep.js";
import { Vt } from "../../../utils/agentId.js";
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
var ba = (e) => ({ "Content-Type": `multipart/form-data; boundary=${e.boundary}` });
//@ chunk-9cjx5pnm.js:21634-21690 placement
var withArchive = (e, r, s) => ({ ...s, archive: e, manifest: r.manifest });
//@ chunk-9cjx5pnm.js:21690-21738 placement
var freeze_18 = Object.freeze(["pass", "warn", "unknown"]);
//@ chunk-9cjx5pnm.js:21738-22110 placement
function scanStateOf(e, r, s) {
  let n = s ? e.content_scan === null : e.content_scan == null,
    a = r === !1 && n,
    m = Boolean(e.pending_version) && e.served !== !0,
    included = freeze_18.includes(e.content_scan?.combined_assessment ?? "");
  return (
    wAo([
      e.content_scan?.status === "errored" && "failed",
      !a && e.content_scan?.status !== "completed" && "processing",
      e.served === !1 && "processing",
      m && "processing",
      a && "none",
      !included && "failed",
    ]) ?? "passed"
  );
}
//@ chunk-9cjx5pnm.js:22110-22407 placement
var toPublishedPlugin = (e, r, s) => ({
  id: e,
  name: r.name,
  version: r.version,
  scan: scanStateOf(r, r.scan_requested ?? s?.isScanAsked, s !== void 0),
  isScanAsked: r.scan_requested ?? s?.isScanAsked,
  verdict: r.content_scan?.combined_assessment ?? r.content_scan?.status,
  isAwaitingCurrent: r.awaiting_make_current === !0 || s?.isAwaitingCurrent === !0,
});
//@ chunk-9cjx5pnm.js:22407-22727 placement
var publishResponseSchema = DoctorLazy(() =>
  u({
    id: o().min(1).optional(),
    name: o().optional(),
    version: o().optional(),
    marketplace_id: o().optional(),
    served: M().optional(),
    pending_version: o().nullish(),
    scan_requested: M().nullish(),
    awaiting_make_current: oe().optional(),
    content_scan: u({ status: o().optional(), combined_assessment: o().nullish() }).nullish(),
  }),
);
//@ chunk-9cjx5pnm.js:22727-22826 placement
function $t(e, r) {
  let s = publishResponseSchema().safeParse(e).data ?? {},
    n = r?.id ?? s.id;
  return n !== void 0 ? toPublishedPlugin(n, s, r) : void 0;
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
function buildPublishMultipart(e, r) {
  let s = `----PluginPublish${randomUUID()}`,
    n = archiveFileName(r);
  return {
    boundary: s,
    body: Buffer.concat([
      Buffer.from(`--${s}\r
Content-Disposition: form-data; name="file"; filename="${n}.zip"\r
Content-Type: application/zip\r
\r
`),
      e,
      Buffer.from(
        newNameFormPart(s, r) +
          `\r
--${s}--\r
`,
      ),
    ]),
  };
}
//@ chunk-9cjx5pnm.js:23359-23505 placement
function buildUploadRequest(e, r, s) {
  let n = buildPublishMultipart(r.archive, r.manifest);
  return {
    method: "post",
    path: accountUploadPath(e, r, s),
    body: n.body,
    headers: ba(n),
    bound: "progress",
    signal: r.signal,
  };
}
//@ chunk-9cjx5pnm.js:23505-23693 placement
async function uploadPluginArchive(e, r, s) {
  let n = await publishRequestWithRetry(buildUploadRequest(e, r, s));
  if ("kind" in n) return n;
  if (parsePublishApiError(n).code === "plugin_upload_already_exists") return "exists";
  return isClientErrorStatus(n) ? ($t(n.data, void 0) ?? Qh("other")) : publishApiOutcome(n, freeze_17);
}
//@ chunk-9cjx5pnm.js:23693-23779 placement
async function wa(e, r) {
  let s = await uploadPluginArchive(e, r, "replace");
  return s === "exists" ? Qh("busy") : s;
}
//@ chunk-9cjx5pnm.js:23779-23791 placement
var Ta = 5000;
//@ chunk-9cjx5pnm.js:23791-23912 placement
async function refreshScanStatus(e, r) {
  let s = await publishRequestOnce(buildOrgGetRequest(e, ["plugins", r.id, "scan-status"]));
  return "status" in s && isClientErrorStatus(s) ? ($t(s.data, r) ?? r) : r;
}
//@ chunk-9cjx5pnm.js:23912-23926 placement
var Ia = 300000;
/**
 * 轮询插件内容扫描状态，直到完成、超时或被中止。
 */
//@ chunk-9cjx5pnm.js:23926-24169 placement
async function waitForContentScan(e, r, s = { left: MAX_SCAN_POLLS, until: Date.now() + Ia }) {
  if (!(
    r.scan === "processing" &&
    !r.isAwaitingCurrent &&
    !e.signal.aborted &&
    s.left > 0 &&
    Date.now() < s.until
  ))
    return r;
  return (
    await sleep(Ta, e.signal),
    waitForContentScan(e, await refreshScanStatus(e, r), { left: s.left - 1, until: s.until })
  );
}
//@ chunk-9cjx5pnm.js:24169-24246 placement
var listAccountMarketplaces = (e) =>
  extractMarkupText(buildOrgGetRequest(e, ["marketplaces", "list-account-marketplaces"]), () => ga(e));
//@ chunk-9cjx5pnm.js:24246-24368 placement
async function uploadOrReplace(e, r) {
  let s = await uploadPluginArchive(e, r, "new");
  if (s !== "exists") return s;
  return r.mode === "replace" ? wa(e, r) : Qh("exists");
}
//@ chunk-9cjx5pnm.js:24368-24549 placement
async function currentOrganization() {
  let e = Vt(lGn() ? env.CLAUDE_CODE_ORGANIZATION_UUID : await getOrganizationUUID()),
    r = getStoredOauthAccountInfo(),
    s = r?.organizationUuid === e;
  if (e === null) return;
  return { id: e, name: (s && r?.organizationName) || void 0 };
}
//@ chunk-9cjx5pnm.js:24549-24601 placement
async function ensureOrganization(e) {
  return e !== void 0 ? void 0 : currentOrganization();
}
//@ chunk-9cjx5pnm.js:24601-24643 placement
var organizationAvailability = () => (lGn() ? "no-organization" : A$s());
//@ chunk-9cjx5pnm.js:24643-24828 placement
var publishRequestHash = (e) =>
  computeContentHash(
    jsonStringify([
      e.plan.root,
      e.wanted.destination,
      e.organization.id,
      TOr(e.plan.manifest),
      e.wanted.mode,
      e.plan.listing.files.map((file) => [file.path, file.bytes, file.mode, e.plan.hashes[file.path]]),
    ]),
  );
//@ chunk-9cjx5pnm.js:24828-24948 placement
function explainUnreadable(e, r) {
  return e.refusal.kind === "unreadable" && hasReadDenyRuleInForce(r.permissions())
    ? { ...e, refusal: { ...e.refusal, details: [] } }
    : e;
}
//@ chunk-9cjx5pnm.js:24977-25086 placement
var readDeniedFiles = (e, r, s) =>
  r.files
    .map((file) => file.path)
    .filter((n) =>
      hasReadDenyRuleForPath(
        join_12(e[0] ?? "", n),
        s.permissions(),
        e.map((a) => join_12(a, n)),
      ),
    );
//@ chunk-9cjx5pnm.js:25086-25159 placement
function readDeniedOutcome(e, r, s) {
  return readDeniedFiles(e, r, s).length === 0 ? void 0 : Qh("read-denied");
}
//@ chunk-9cjx5pnm.js:25231-25264 placement
var Wa = ["bare-deny", "path-deny"];
//@ chunk-9cjx5pnm.js:25264-25351 placement
var Ka = (e, r) =>
  Wa.includes(layeredReadVerdictForPaths([e], r.permissions(), { refuseAutomounterShapes: !0 }).layer);
//@ chunk-9cjx5pnm.js:25351-25549 placement
async function checkPublishReadRules(e, r) {
  let s = resolve_2(getCwd(), e.path);
  if (Ka(s, r)) return Qh("read-denied");
  if (!hasReadDenyRuleInForce(r.permissions())) return;
  let n = await realpath_3(s).catch(() => s),
    a = await unreadableOnError(scanPublishFolder(n));
  return "kind" in a ? a : readDeniedOutcome([s, n], a, r);
}
//@ chunk-9cjx5pnm.js:25581-25643 placement
var fs = (e, r, s) => checkReadNetworkPathSafety(s.tool, { path: e }, s.permissions(), r) !== null;
//@ chunk-9cjx5pnm.js:25643-25803 placement
function publishPathScreenState(e, r) {
  if (fs(e.path, [e.path], r)) return "network-path";
  let s = resolve_3(getCwd(), e.path),
    n = getPathsForNetworkScreen(s);
  return fs(s, n.paths, r) ? "network-path" : n.vetted ? void 0 : "unreadable";
}
//@ chunk-9cjx5pnm.js:25803-25843 placement
var publishFlagState = (e, r) => (isPluginPublishAllowed() ? publishPathScreenState(e, r) : "flag-off");
//@ chunk-9cjx5pnm.js:25843-25869 placement
var hashCanonical = (e) => computeContentHash(jsonStringify(sortKeysDeep(e)));
//@ chunk-9cjx5pnm.js:25869-25914 placement
var hashPublishInput = (e) => hashCanonical(PUBLISH_QUESTION_SCHEMA().safeParse(e).data ?? e);
//@ chunk-9cjx5pnm.js:25914-26049 placement
var normalizePublishInput = (e) => ({
  folder: e.path,
  destination: e.destination ?? "organization",
  description: e.description,
  mode: e.replace === !0 ? "replace" : "new",
});
//@ chunk-9cjx5pnm.js:26078-26153 placement
var Za = (e, r) =>
  checkWritePermissionForTool(FileWriteTool, { file_path: e, content: "" }, r).behavior === "deny" ||
  hasReadDenyRuleForPath(e, r);
//@ chunk-9cjx5pnm.js:26153-26323 placement
var freeze_19 = Object.freeze(
  [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME].map((e) =>
    Object.freeze({
      name: e,
      mcpInfo: void 0,
      familyParentToolName: void 0,
      aliasSkillToolNames: void 0,
      packagingAliasSkillToolNames: void 0,
    }),
  ),
);
//@ chunk-9cjx5pnm.js:26323-26478 placement
function hasPublishDenyRule(e, r) {
  let permissions = r.permissions(),
    filtered = getDenyRules(permissions).filter((a) => !NARROWING_RULE_SOURCES.includes(a.source));
  return (
    freeze_19.some((a) => getDenyRuleForTool(permissions, a, filtered) !== null) ||
    uniq(e).some((a) => Za(join_13(a, PLUGIN_MANIFEST_PATH), permissions))
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
