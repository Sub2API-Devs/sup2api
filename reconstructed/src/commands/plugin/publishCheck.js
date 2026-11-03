/**
 * commands/plugin/publishCheck.ts
 *
 * 插件发布前检查与发布步骤说明（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xkt86s08.js (51)
 * attribution: placement 51
 */
import { join, dirname, resolve } from "path";
import { Ar } from "../../../runtime/bun-runtime.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { mayHaveProfileScope } from "../../utils/auth.js";
import {
  publishRequestOnce,
  fetchMySubmissions,
  archiveFileName,
} from "../../services/plugins/publish/publishStatus.js";
import {
  isClientErrorStatus,
  stoppedOrResult,
  PUBLISH_STOPPED_TEXT,
  preparePublishFolder,
} from "../../services/plugins/publish/publishSnapshot.js";
import {
  ensureOrganization,
  organizationAvailability,
  publishRequestHash,
  explainUnreadable,
  hashPublishInput,
  hashCanonical,
  hasPublishDenyRule,
  publishFlagState,
  checkPublishReadRules,
  normalizePublishInput,
  readDeniedOutcome,
} from "../../services/plugins/publish/publishUpload.js";
import {
  refusalResult,
  MAX_PUBLISH_PATH_CHARS,
  pluginNameLine,
  MAX_PUBLISH_LIST_ITEMS,
  publishRefusalDenial,
} from "../../tools/PublishPluginTool/constants.js";
import { identityPath_2 } from "../../skills/loadSkillsDir.js";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import {
  manifestWriteLines,
  staysOnMachineLines,
  manifestEntryLines,
} from "../../utils/teleport/uploadManifestText.js";
import { printableOrEmpty, printableName } from "../../utils/printableName.js";
import { formatFileSize } from "../../utils/format.js";
import { X0s, FILE_MODE_RWX, unreadableOnError } from "../../services/plugins/publish/validationCopy.js";
import { plural } from "../../utils/stringUtils.js";
import { MAX_CARD_FILES } from "../../components/permissions/FolderAccessPermissionRequest.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getOriginalCwd, ensureToolResultsDir, writeToolResultFile } from "../../utils/toolResultStorage.js";
import { safeIdentifierOrUndefined } from "../../utils/safeIdentifier.js";
import { sessionScopedMapsSlot } from "../../utils/sessionScopedMaps.js";
import { hasReadDenyRuleForPath, hasReadDenyRuleInForce } from "../../utils/permissions/filesystem.js";
import { getAuthUnavailableReason } from "../../utils/auth/authUnavailableReason.js";
import { getCwd } from "../../utils/cwd.js";

//@ chunk-xkt86s08.js:13501-13510 placement
var PUBLISH_CHECK_MODULE_EXPORTS = {};
//@ chunk-xkt86s08.js:13510-13545 placement
Ar(PUBLISH_CHECK_MODULE_EXPORTS, {
  check: () => checkPublishPermission,
  default: () => PUBLISH_CHECK_MODULE_EXPORTS,
});
//@ chunk-xkt86s08.js:13577-13639 placement
var organizationProfileSchema = DoctorLazy(() =>
  u({
    organization: u({
      uuid: string(),
      name: string().min(1),
    }),
  }),
);
//@ chunk-xkt86s08.js:13639-13651 placement
var PROFILE_FETCH_TIMEOUT_MS = 5000;
//@ chunk-xkt86s08.js:13651-13955 placement
/**
 * 有 profile 权限时请求 /api/oauth/profile，组织 uuid 与给定值相同则返回组织名，否则 undefined（带超时与外部中止信号）。
 */
async function fetchOrganizationNameIfMatches(id, r) {
  if (!mayHaveProfileScope()) return;
  let t = await publishRequestOnce({
    method: "get",
    path: "/api/oauth/profile",
    body: undefined,
    headers: {},
    bound: "clock",
    signal: AbortSignal.any([r, AbortSignal.timeout(PROFILE_FETCH_TIMEOUT_MS)]),
  });
  let s = organizationProfileSchema().safeParse(
    "status" in t && isClientErrorStatus(t) ? t.data : undefined,
  ).data;
  return s?.organization.uuid === id ? s.organization.name : undefined;
}
//@ chunk-xkt86s08.js:13955-14032 placement
async function addOrganizationName(organization, r) {
  return organization.name !== undefined
    ? organization
    : {
        ...organization,
        name: await fetchOrganizationNameIfMatches(organization.id, r),
      };
}
//@ chunk-xkt86s08.js:14032-14206 placement
async function checkPublishSubmissions(authUnavailableReason, signal) {
  let organization = await ensureOrganization(authUnavailableReason);
  if (organization === undefined) return refusalResult(authUnavailableReason ?? organizationAvailability());
  let s = {
    organization,
    signal,
  };
  let mySubmissions = await fetchMySubmissions(s);
  return Array.isArray(mySubmissions)
    ? addOrganizationName(organization, signal)
    : stoppedOrResult(s, mySubmissions, "nothing");
}
//@ chunk-xkt86s08.js:14206-14282 placement
function manifestDraftWrite(e) {
  return e.draft !== undefined
    ? {
        path: identityPath_2(PLUGIN_MANIFEST_PATH),
        text: e.draft ?? "",
      }
    : undefined;
}
//@ chunk-xkt86s08.js:14282-14304 placement
var manifestDraftWriteLines = (e) => manifestWriteLines(manifestDraftWrite(e));
//@ chunk-xkt86s08.js:14304-14352 placement
var fileListingLine = (e) =>
  `${printableOrEmpty(e.path, MAX_PUBLISH_PATH_CHARS)} (${formatFileSize(e.bytes)})`;
//@ chunk-xkt86s08.js:14352-14399 placement
var leftOutFileLines = (e) => staysOnMachineLines(e.plan.listing.leftOut.length);
//@ chunk-xkt86s08.js:14399-14471 placement
var organizationLabel = (e) => printableName(e.organization.name ?? `organization ${e.organization.id}`);
//@ chunk-xkt86s08.js:14471-14953 placement
var PUBLISH_STEPS_TEXT = (e) => [
  "First uploads it to your own shelf on claude.ai (My Uploads); whether it is scanned there depends on your organization",
  `Then submits it to ${organizationLabel(e)} for an administrator's review; where the organization publishes without review, it is published at once`,
  ...[archiveFileName(e.plan.manifest)]
    .filter((r) => r !== e.plan.manifest.name)
    .map((r) => `Listed under the name ${r}`),
  ...[e.wanted.mode]
    .filter((r) => r === "replace")
    .map(() => "Replaces the plugin of this name on your shelf, if any"),
];
//@ chunk-xkt86s08.js:14953-15090 placement
var listSensitiveSentFiles = (e) =>
  e.plan.listing.files
    .filter((file) => X0s.includes(file.path))
    .map((file) => `Sends ${file.path}: keys and tokens written in it go with it`);
//@ chunk-xkt86s08.js:15090-15200 placement
var WITHHELD_ENTRIES_NOTE =
  "Entries stay behind that are neither named nor counted here: this session's rules deny reading them.";
//@ chunk-xkt86s08.js:15200-15230 placement
var withheldNoteLines = (e) => (e.withheld ? [WITHHELD_ENTRIES_NOTE] : []);
//@ chunk-xkt86s08.js:15230-15261 placement
var publishWarningLines = (e) => [...listSensitiveSentFiles(e), ...withheldNoteLines(e)];
//@ chunk-xkt86s08.js:15261-15537 placement
var buildPublishCard = (e) => ({
  question: `Publish ${pluginNameLine(e.plan.manifest)} to ${organizationLabel(e)}?`,
  lines: [
    `Folder: ${printableOrEmpty(e.plan.root)}`,
    `Sends ${e.plan.listing.files.length} ${plural(e.plan.listing.files.length, "file")}, ` +
      formatFileSize(e.plan.bytes),
    ...publishWarningLines(e),
    ...leftOutFileLines(e),
    ...PUBLISH_STEPS_TEXT(e),
    ...manifestDraftWriteLines(e),
  ],
  values: e.plan.listing.files.map(fileListingLine),
});
//@ chunk-xkt86s08.js:15537-15547 placement
var MAX_CARD_QUESTION_CHARS = 48;
//@ chunk-xkt86s08.js:15547-15729 placement
function capFileListForCard(e, r) {
  let filtered = e.slice(0, MAX_CARD_FILES).filter(
    (n, f) =>
      e.slice(0, f + 1).join(`
`).length +
        MAX_CARD_QUESTION_CHARS <=
      r,
  );
  let s = e.length - filtered.length;
  return s === 0 ? filtered : filtered.concat(`and ${s} more ${plural(s, "file")} not named here`);
}
//@ chunk-xkt86s08.js:15729-15802 placement
var publishCardLines = (e, r) => [
  buildPublishCard(e).question,
  `Organization: ${organizationLabel(e)}`,
  ...buildPublishCard(e).lines,
  ...r,
];
//@ chunk-xkt86s08.js:15802-15814 placement
var CARD_WIDTH_RESERVE = 1800;
//@ chunk-xkt86s08.js:15814-15900 placement
function publishReviewCard(e, r) {
  let t = publishCardLines(e, r);
  return t.concat(
    capFileListForCard(
      buildPublishCard(e).values,
      CARD_WIDTH_RESERVE -
        t.join(`
`).length,
    ),
  );
}
//@ chunk-xkt86s08.js:15900-16100 placement
function describeFullListLocation(e, r) {
  let t = r.withheld
    ? "Every file, and what stays behind that is named, is listed in"
    : "Every file, and what stays behind, is listed in";
  return [e ?? ""].filter(Boolean).map((s) => `${t} ${s}`);
}
//@ chunk-xkt86s08.js:16100-16148 placement
var refusalDecision = (e) => ({
  type: "other",
  reason: e.join(`
`),
});
//@ chunk-xkt86s08.js:16148-16159 placement
var MAX_LIST_PATH_CHARS = 1e5;
//@ chunk-xkt86s08.js:16159-16285 placement
function capPathsByLength(e) {
  let sliced = e.slice(0, MAX_PUBLISH_LIST_ITEMS);
  return sliced.slice(
    0,
    count(
      sliced.reduce((acc, s) => acc.concat((acc.at(-1) ?? 0) + s.path.length), []),
      (t) => t <= MAX_LIST_PATH_CHARS,
    ),
  );
}
//@ chunk-xkt86s08.js:16285-16339 placement
var capListingPaths = (listing) => ({
  files: capPathsByLength(listing.files),
  stays: capPathsByLength(listing.leftOut),
});
//@ chunk-xkt86s08.js:16339-16471 placement
function countUnnamedEntries(listing, shown) {
  let t = listing.files.length - shown.files.length;
  let s = listing.leftOut.length - shown.stays.length;
  return t === 0 && s === 0
    ? undefined
    : {
        files: t,
        stays: s,
      };
}
//@ chunk-xkt86s08.js:16471-16756 placement
var xe = Object.freeze({
  link: "a link, not followed",
  "hard-link": "shares what it holds with another name on this disk",
  ignored: "ignored by .gitignore",
  secret: "may hold a secret",
  never: "never sent",
  generated: "made by Claude Code",
  special: "not a file",
  backslash: "a backslash in its name",
});
//@ chunk-xkt86s08.js:16756-16816 placement
var leftOutLine = (e) =>
  "stays here: " + printableOrEmpty(e.path, MAX_PUBLISH_PATH_CHARS) + ` (${xe[e.why]})`;
//@ chunk-xkt86s08.js:16816-16895 placement
var fullListingLines = (e) => [
  ...e.plan.listing.files.map(fileListingLine),
  ...e.plan.listing.leftOut.map(leftOutLine),
];
//@ chunk-xkt86s08.js:16895-16926 placement
var listingWithNotes = (e) => [...fullListingLines(e), ...withheldNoteLines(e)];
//@ chunk-xkt86s08.js:16926-16960 placement
var renderListingText = (e) => `${listingWithNotes(e).join(`
`)}
`;
//@ chunk-xkt86s08.js:16960-17634 placement
/**
 * 构造发布请求的结构化摘要（供审批/展示）：请求摘要哈希、标题、组织、插件名与版本、目录、模式、步骤、警告、写入项、发送文件（路径/字节/sha256/是否可执行）、留下的条目及原因、完整清单文件的哈希与路径、未列出的数量。
 */
var buildPublishSummary = (publishCtx, listPath, shown) => ({
  digest: publishRequestHash(publishCtx),
  title: buildPublishCard(publishCtx).question,
  organization: {
    id: printableName(publishCtx.organization.id),
    name: publishCtx.organization.name && printableName(publishCtx.organization.name),
  },
  plugin: {
    name: printableName(publishCtx.plan.manifest.name),
    version: publishCtx.plan.manifest.version && printableName(publishCtx.plan.manifest.version),
  },
  folder: printableOrEmpty(publishCtx.plan.root, MAX_PUBLISH_PATH_CHARS),
  mode: publishCtx.wanted.mode,
  steps: PUBLISH_STEPS_TEXT(publishCtx),
  warnings: publishWarningLines(publishCtx),
  writes: manifestDraftWrite(publishCtx),
  sends: {
    files: publishCtx.plan.listing.files.length,
    bytes: publishCtx.plan.bytes,
  },
  files: shown.files.map((file) => ({
    path: printableOrEmpty(file.path, MAX_PUBLISH_PATH_CHARS),
    bytes: file.bytes,
    sha256: publishCtx.plan.hashes[file.path] ?? "",
    runs: file.mode === FILE_MODE_RWX,
  })),
  staying: publishCtx.plan.listing.leftOut.length,
  stays: shown.stays.map((stay) => ({
    path: printableOrEmpty(stay.path, MAX_PUBLISH_PATH_CHARS),
    why: stay.why,
    words: xe[stay.why],
  })),
  list: {
    sha256: computeContentHash(renderListingText(publishCtx)),
    path: listPath,
  },
  unnamed: countUnnamedEntries(publishCtx.plan.listing, shown),
});
//@ chunk-xkt86s08.js:17634-17675 placement
var publishSummary = (publishCtx, listPath) =>
  buildPublishSummary(publishCtx, listPath, capListingPaths(publishCtx.plan.listing));
//@ chunk-xkt86s08.js:17675-17885 placement
function buildPublishPromptInput(e, r) {
  let t = publishSummary(e, r);
  return {
    path: e.plan.root,
    destination: e.wanted.destination,
    description: e.wanted.description,
    replace: e.wanted.mode === "replace" || undefined,
    shown: [...publishCardLines(e, describeFullListLocation(r, e)), ...manifestEntryLines(t)],
    question: t,
  };
}
//@ chunk-xkt86s08.js:17885-18056 placement
/**
 * 生成发布的 ask 权限决定：问题文案、updatedInput（目录、目的地、描述、replace、展示行）、不允许"始终允许"规则，附带决定原因。
 */
function buildPublishAskDecision(publishCtx, r) {
  let t = publishReviewCard(publishCtx, describeFullListLocation(r, publishCtx));
  return {
    behavior: "ask",
    message: buildPublishCard(publishCtx).question,
    updatedInput: buildPublishPromptInput(publishCtx, r),
    suppressAlwaysAllowRule: true,
    localDisplayOnly: false,
    decisionReason: refusalDecision(t),
  };
}
//@ chunk-xkt86s08.js:18056-18132 placement
function refusalFromUnreadable(e, toolContext) {
  let t = explainUnreadable(e, toolContext);
  return publishRefusalDenial(t.refusal.kind, t.refusal.details);
}
//@ chunk-xkt86s08.js:18132-18233 placement
var cannotPromptForPublish = (e, agentId) =>
  agentId !== undefined ||
  e.shouldAvoidPermissionPrompts === true ||
  e.servedCall === true ||
  e.mode === "dontAsk";
//@ chunk-xkt86s08.js:18276-18287 placement
var TOOL_RESULT_FILE_MODE = 384;
//@ chunk-xkt86s08.js:18287-18533 placement
/**
 * 把完整的发布文件清单写到会话工具结果目录下的 publish-<toolUseId>.txt；toolUseId 不是普通标识时放弃，返回文件路径或 undefined。
 */
async function writePublishListFile(toolUseId, publishCtx, toolContext) {
  let originalCwd = getOriginalCwd(toolContext.session);
  let i = safeIdentifierOrUndefined(toolUseId);
  let n = join(originalCwd, `publish-${i}.txt`);
  return (
    i !== undefined && dirname(n) === originalCwd
      ? ensureToolResultsDir(originalCwd, undefined)
      : Promise.reject(Error("The tool use id is no plain token"))
  )
    .then(() => writeToolResultFile(n, Buffer.from(renderListingText(publishCtx)), TOOL_RESULT_FILE_MODE))
    .then(
      () => n,
      () => {
        return;
      },
    );
}
//@ chunk-xkt86s08.js:18533-18543 placement
var SHA_PREFIX_TRIM = 16;
//@ chunk-xkt86s08.js:18543-18675 placement
function rememberPublishRequest(toolUseId, publishRequestDigest, toolContext) {
  let s = sessionScopedMapsSlot.of(toolContext.session);
  s.set(toolUseId, publishRequestDigest);
  Array.from(s.keys())
    .slice(0, Math.max(0, s.size - SHA_PREFIX_TRIM))
    .forEach((key) => s.delete(key));
}
//@ chunk-xkt86s08.js:18675-18802 placement
var buildPublishRequestDigest = (publishCtx, updatedInput) => ({
  digest: publishRequestHash(publishCtx),
  question: hashPublishInput(updatedInput.question),
  lines: hashCanonical(updatedInput.shown),
  drafts: publishCtx.draft !== undefined,
  card: buildPublishCard(publishCtx),
  everything: fullListingLines(publishCtx),
});
//@ chunk-xkt86s08.js:18802-18865 placement
var abortedRefusal = (options) =>
  options.signal.aborted ? refusalResult("stopped", [PUBLISH_STOPPED_TEXT.nothing]) : undefined;
//@ chunk-xkt86s08.js:18893-18991 placement
var isReadDeniedPath = (e, path, t) =>
  [path, join(path, "within")].some((s) =>
    hasReadDenyRuleForPath(
      join(e[0] ?? "", s),
      t.permissions(),
      e.map((i) => join(i, s)),
    ),
  );
//@ chunk-xkt86s08.js:18991-19117 placement
var withLeftOutEntries = (e, r) => ({
  ...e,
  plan: {
    ...e.plan,
    listing: {
      ...e.plan.listing,
      leftOut: r,
    },
  },
  withheld: r.length < e.plan.listing.leftOut.length,
});
//@ chunk-xkt86s08.js:19117-19232 placement
function filterLeftOutByReadRules(prepared, publishRoots, toolContext) {
  let s = !hasReadDenyRuleInForce(toolContext.permissions());
  return withLeftOutEntries(
    prepared,
    prepared.plan.listing.leftOut.filter((i) => s || !isReadDeniedPath(publishRoots, i.path, toolContext)),
  );
}
//@ chunk-xkt86s08.js:19232-19311 placement
function writeDeniedRefusal(publishRoots, prepared, toolContext) {
  return prepared.draft !== undefined && hasPublishDenyRule(publishRoots, toolContext)
    ? refusalResult("write-denied")
    : undefined;
}
//@ chunk-xkt86s08.js:19311-19861 placement
/**
 * 发布插件工具的权限检查流程：功能开关/不能提示时直接返回；确认组织；检查读规则；准备发布目录与清单；检查读拒绝；写出完整清单文件并返回 ask 决定（同时记下请求摘要供后续核对）。
 */
async function checkPublishPermission(input, options, toolContext) {
  let { toolUseId } = options;
  let i = publishFlagState(input, toolContext);
  let n = toolUseId === undefined || cannotPromptForPublish(toolContext.permissions(), toolContext.agentId);
  if (i !== undefined || n) return publishRefusalDenial(i ?? "nobody-to-ask");
  let organization =
    abortedRefusal(options) ?? (await checkPublishSubmissions(getAuthUnavailableReason(), options.signal));
  if ("kind" in organization) return refusalFromUnreadable(organization, toolContext);
  let _ = (await checkPublishReadRules(input, toolContext)) ?? abortedRefusal(options);
  if (_ !== undefined) return refusalFromUnreadable(_, toolContext);
  let prepared = await unreadableOnError(preparePublishFolder(normalizePublishInput(input), organization));
  if ("kind" in prepared) return refusalFromUnreadable(prepared, toolContext);
  let publishRoots = [resolve(getCwd(), input.path), prepared.plan.root];
  let I =
    readDeniedOutcome(publishRoots, prepared.plan.listing, toolContext) ??
    writeDeniedRefusal(publishRoots, prepared, toolContext);
  if (I !== undefined) return refusalFromUnreadable(I, toolContext);
  let publishCtx = filterLeftOutByReadRules(prepared, publishRoots, toolContext);
  let Me = await writePublishListFile(toolUseId, publishCtx, toolContext);
  let N = abortedRefusal(options);
  if (N !== undefined) return refusalFromUnreadable(N, toolContext);
  let publishAskDecision = buildPublishAskDecision(publishCtx, Me);
  rememberPublishRequest(
    toolUseId,
    buildPublishRequestDigest(publishCtx, publishAskDecision.updatedInput),
    toolContext,
  );
  return publishAskDecision;
}
