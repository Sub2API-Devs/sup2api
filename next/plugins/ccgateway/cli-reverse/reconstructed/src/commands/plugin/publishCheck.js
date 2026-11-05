/**
 * commands/plugin/publishCheck.ts
 *
 * 插件发布前检查与发布步骤说明（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-731a2452.js (51)
 * attribution: placement 51
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, resolve } from "path";
import { __export } from "../../../runtime/bun-runtime.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import {
  MCP_CONFIG_FILES,
  FILE_MODE_RWX,
  unreadableOnError,
} from "../../services/plugins/publish/validationCopy.js";
import { plural } from "../../utils/stringUtils.js";
import { MAX_CARD_FILES } from "../../components/permissions/FolderAccessPermissionRequest.js";
import { countWhere } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getOriginalCwd, ensureToolResultsDir, writeToolResultFile } from "../../utils/toolResultStorage.js";
import { safeIdentifierOrUndefined } from "../../utils/safeIdentifier.js";
import { sessionScopedMapsSlot } from "../../utils/sessionScopedMaps.js";
import { hasReadDenyRuleForPath, hasReadDenyRuleInForce } from "../../utils/permissions/filesystem.js";
import { getAuthUnavailableReason } from "../../utils/auth/authUnavailableReason.js";
import { getCwd } from "../../utils/cwd.js";

//@ chunk-731a2452.js:14649-14658 placement
var PUBLISH_CHECK_MODULE_EXPORTS = {};
//@ chunk-731a2452.js:14658-14693 placement
__export(PUBLISH_CHECK_MODULE_EXPORTS, {
  check: () => checkPublishPermission,
  default: () => PUBLISH_CHECK_MODULE_EXPORTS,
});
//@ chunk-731a2452.js:14725-14787 placement
var organizationProfileSchema = DoctorLazy(() =>
  objectSchema({
    organization: objectSchema({
      uuid: stringSchema(),
      name: stringSchema().min(1),
    }),
  }),
);
//@ chunk-731a2452.js:14787-14799 placement
var PROFILE_FETCH_TIMEOUT_MS = 5000;
//@ chunk-731a2452.js:14799-15103 placement
/**
 * 有 profile 权限时请求 /api/oauth/profile，组织 uuid 与给定值相同则返回组织名，否则 undefined（带超时与外部中止信号）。
 */
async function fetchOrganizationNameIfMatches(id, organizationId) {
  if (!mayHaveProfileScope()) return;
  let response = await publishRequestOnce({
    method: "get",
    path: "/api/oauth/profile",
    body: undefined,
    headers: {},
    bound: "clock",
    signal: AbortSignal.any([organizationId, AbortSignal.timeout(PROFILE_FETCH_TIMEOUT_MS)]),
  });
  let parsed = organizationProfileSchema().safeParse(
    "status" in response && isClientErrorStatus(response) ? response.data : undefined,
  ).data;
  return parsed?.organization.uuid === id ? parsed.organization.name : undefined;
}
//@ chunk-731a2452.js:15103-15180 placement
async function addOrganizationName(organization, context) {
  return organization.name !== undefined
    ? organization
    : {
        ...organization,
        name: await fetchOrganizationNameIfMatches(organization.id, context),
      };
}
//@ chunk-731a2452.js:15180-15354 placement
async function checkPublishSubmissions(organization, context) {
  let organization_2 = await ensureOrganization(organization);
  if (organization_2 === undefined) return refusalResult(organization ?? organizationAvailability());
  let request = {
    organization: organization_2,
    signal: context,
  };
  let mySubmissions = await fetchMySubmissions(request);
  return Array.isArray(mySubmissions)
    ? addOrganizationName(organization_2, context)
    : stoppedOrResult(request, mySubmissions, "nothing");
}
//@ chunk-731a2452.js:15354-15430 placement
function manifestDraftWrite(plan) {
  return plan.draft !== undefined
    ? {
        path: identityPath_2(PLUGIN_MANIFEST_PATH),
        text: plan.draft ?? "",
      }
    : undefined;
}
//@ chunk-731a2452.js:15430-15452 placement
var manifestDraftWriteLines = (plan) => manifestWriteLines(manifestDraftWrite(plan));
//@ chunk-731a2452.js:15452-15500 placement
var fileListingLine = (ctx) =>
  `${printableOrEmpty(ctx.path, MAX_PUBLISH_PATH_CHARS)} (${formatFileSize(ctx.bytes)})`;
//@ chunk-731a2452.js:15500-15547 placement
var leftOutFileLines = (ctx) => staysOnMachineLines(ctx.plan.listing.leftOut.length);
//@ chunk-731a2452.js:15547-15619 placement
var organizationLabel = (ctx) =>
  printableName(ctx.organization.name ?? `organization ${ctx.organization.id}`);
//@ chunk-731a2452.js:15619-16101 placement
var PUBLISH_STEPS_TEXT = (ctx) => [
  "First uploads it to your own shelf on claude.ai (My Uploads); whether it is scanned there depends on your organization",
  `Then submits it to ${organizationLabel(ctx)} for an administrator's review; where the organization publishes without review, it is published at once`,
  ...[archiveFileName(ctx.plan.manifest)]
    .filter((name) => name !== ctx.plan.manifest.name)
    .map((name) => `Listed under the name ${name}`),
  ...[ctx.wanted.mode]
    .filter((value) => value === "replace")
    .map(() => "Replaces the plugin of this name on your shelf, if any"),
];
//@ chunk-731a2452.js:16101-16238 placement
var listSensitiveSentFiles = (ctx) =>
  ctx.plan.listing.files
    .filter((file) => MCP_CONFIG_FILES.includes(file.path))
    .map((file) => `Sends ${file.path}: keys and tokens written in it go with it`);
//@ chunk-731a2452.js:16238-16348 placement
var WITHHELD_ENTRIES_NOTE =
  "Entries stay behind that are neither named nor counted here: this session's rules deny reading them.";
//@ chunk-731a2452.js:16348-16378 placement
var withheldNoteLines = (ctx) => (ctx.withheld ? [WITHHELD_ENTRIES_NOTE] : []);
//@ chunk-731a2452.js:16378-16409 placement
var publishWarningLines = (ctx) => [...listSensitiveSentFiles(ctx), ...withheldNoteLines(ctx)];
//@ chunk-731a2452.js:16409-16685 placement
var buildPublishCard = (ctx) => ({
  question: `Publish ${pluginNameLine(ctx.plan.manifest)} to ${organizationLabel(ctx)}?`,
  lines: [
    `Folder: ${printableOrEmpty(ctx.plan.root)}`,
    `Sends ${ctx.plan.listing.files.length} ${plural(ctx.plan.listing.files.length, "file")}, ` +
      formatFileSize(ctx.plan.bytes),
    ...publishWarningLines(ctx),
    ...leftOutFileLines(ctx),
    ...PUBLISH_STEPS_TEXT(ctx),
    ...manifestDraftWriteLines(ctx),
  ],
  values: ctx.plan.listing.files.map(fileListingLine),
});
//@ chunk-731a2452.js:16685-16695 placement
var MAX_CARD_QUESTION_CHARS = 48;
//@ chunk-731a2452.js:16695-16877 placement
function capFileListForCard(paths, limit) {
  let filtered = paths.slice(0, MAX_CARD_FILES).filter(
    (entry, path) =>
      paths.slice(0, path + 1).join(`
`).length +
        MAX_CARD_QUESTION_CHARS <=
      limit,
  );
  let omittedCount = paths.length - filtered.length;
  return omittedCount === 0
    ? filtered
    : filtered.concat(`and ${omittedCount} more ${plural(omittedCount, "file")} not named here`);
}
//@ chunk-731a2452.js:16877-16950 placement
var publishCardLines = (ctx, locationPrefix) => [
  buildPublishCard(ctx).question,
  `Organization: ${organizationLabel(ctx)}`,
  ...buildPublishCard(ctx).lines,
  ...locationPrefix,
];
//@ chunk-731a2452.js:16950-16962 placement
var CARD_WIDTH_RESERVE = 1800;
//@ chunk-731a2452.js:16962-17048 placement
function publishReviewCard(ctx, locationPrefix) {
  let lines = publishCardLines(ctx, locationPrefix);
  return lines.concat(
    capFileListForCard(
      buildPublishCard(ctx).values,
      CARD_WIDTH_RESERVE -
        lines.join(`
`).length,
    ),
  );
}
//@ chunk-731a2452.js:17048-17248 placement
function describeFullListLocation(prefix, ctx) {
  let where = ctx.withheld
    ? "Every file, and what stays behind that is named, is listed in"
    : "Every file, and what stays behind, is listed in";
  return [prefix ?? ""].filter(Boolean).map((path) => `${where} ${path}`);
}
//@ chunk-731a2452.js:17248-17296 placement
var refusalDecision = (reason) => ({
  type: "other",
  reason: reason.join(`
`),
});
//@ chunk-731a2452.js:17296-17307 placement
var MAX_LIST_PATH_CHARS = 1e5;
//@ chunk-731a2452.js:17307-17433 placement
function capPathsByLength(paths) {
  let sliced = paths.slice(0, MAX_PUBLISH_LIST_ITEMS);
  return sliced.slice(
    0,
    countWhere(
      sliced.reduce((acc, entry) => acc.concat((acc.at(-1) ?? 0) + entry.path.length), []),
      (total) => total <= MAX_LIST_PATH_CHARS,
    ),
  );
}
//@ chunk-731a2452.js:17433-17487 placement
var capListingPaths = (listing) => ({
  files: capPathsByLength(listing.files),
  stays: capPathsByLength(listing.leftOut),
});
//@ chunk-731a2452.js:17487-17619 placement
function countUnnamedEntries(listing, shown) {
  let omittedFiles = listing.files.length - shown.files.length;
  let omittedLeftOut = listing.leftOut.length - shown.stays.length;
  return omittedFiles === 0 && omittedLeftOut === 0
    ? undefined
    : {
        files: omittedFiles,
        stays: omittedLeftOut,
      };
}
//@ chunk-731a2452.js:17619-17904 placement
var FILE_KIND_DESCRIPTIONS = Object.freeze({
  link: "a link, not followed",
  "hard-link": "shares what it holds with another name on this disk",
  ignored: "ignored by .gitignore",
  secret: "may hold a secret",
  never: "never sent",
  generated: "made by Claude Code",
  special: "not a file",
  backslash: "a backslash in its name",
});
//@ chunk-731a2452.js:17904-17964 placement
var leftOutLine = (ctx) =>
  "stays here: " +
  printableOrEmpty(ctx.path, MAX_PUBLISH_PATH_CHARS) +
  ` (${FILE_KIND_DESCRIPTIONS[ctx.why]})`;
//@ chunk-731a2452.js:17964-18043 placement
var fullListingLines = (ctx) => [
  ...ctx.plan.listing.files.map(fileListingLine),
  ...ctx.plan.listing.leftOut.map(leftOutLine),
];
//@ chunk-731a2452.js:18043-18074 placement
var listingWithNotes = (ctx) => [...fullListingLines(ctx), ...withheldNoteLines(ctx)];
//@ chunk-731a2452.js:18074-18108 placement
var renderListingText = (ctx) => `${listingWithNotes(ctx).join(`
`)}
`;
//@ chunk-731a2452.js:18108-18782 placement
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
    words: FILE_KIND_DESCRIPTIONS[stay.why],
  })),
  list: {
    sha256: computeContentHash(renderListingText(publishCtx)),
    path: listPath,
  },
  unnamed: countUnnamedEntries(publishCtx.plan.listing, shown),
});
//@ chunk-731a2452.js:18782-18823 placement
var publishSummary = (publishCtx, listPath) =>
  buildPublishSummary(publishCtx, listPath, capListingPaths(publishCtx.plan.listing));
//@ chunk-731a2452.js:18823-19033 placement
function buildPublishPromptInput(ctx, locationPrefix) {
  let summary = publishSummary(ctx, locationPrefix);
  return {
    path: ctx.plan.root,
    destination: ctx.wanted.destination,
    description: ctx.wanted.description,
    replace: ctx.wanted.mode === "replace" || undefined,
    shown: [
      ...publishCardLines(ctx, describeFullListLocation(locationPrefix, ctx)),
      ...manifestEntryLines(summary),
    ],
    question: summary,
  };
}
//@ chunk-731a2452.js:19033-19204 placement
/**
 * 生成发布的 ask 权限决定：问题文案、updatedInput（目录、目的地、描述、replace、展示行）、不允许"始终允许"规则，附带决定原因。
 */
function buildPublishAskDecision(ctx, ctx_2) {
  let card = publishReviewCard(ctx, describeFullListLocation(ctx_2, ctx));
  return {
    behavior: "ask",
    message: buildPublishCard(ctx).question,
    updatedInput: buildPublishPromptInput(ctx, ctx_2),
    suppressAlwaysAllowRule: true,
    localDisplayOnly: false,
    decisionReason: refusalDecision(card),
  };
}
//@ chunk-731a2452.js:19204-19280 placement
function refusalFromUnreadable(error, toolContext) {
  let explanation = explainUnreadable(error, toolContext);
  return publishRefusalDenial(explanation.refusal.kind, explanation.refusal.details);
}
//@ chunk-731a2452.js:19280-19381 placement
var cannotPromptForPublish = (toolContext, agentId) =>
  agentId !== undefined ||
  toolContext.shouldAvoidPermissionPrompts === true ||
  toolContext.servedCall === true ||
  toolContext.mode === "dontAsk";
//@ chunk-731a2452.js:19424-19435 placement
var TOOL_RESULT_FILE_MODE = 384;
//@ chunk-731a2452.js:19435-19681 placement
/**
 * 把完整的发布文件清单写到会话工具结果目录下的 publish-<toolUseId>.txt；toolUseId 不是普通标识时放弃，返回文件路径或 undefined。
 */
async function writePublishListFile(toolUseId, ctx, toolContext) {
  let originalCwd = getOriginalCwd(toolContext.session);
  let safeToolUseId = safeIdentifierOrUndefined(toolUseId);
  let listPath = join(originalCwd, `publish-${safeToolUseId}.txt`);
  return (
    safeToolUseId !== undefined && dirname(listPath) === originalCwd
      ? ensureToolResultsDir(originalCwd, undefined)
      : Promise.reject(Error("The tool use id is no plain token"))
  )
    .then(() => writeToolResultFile(listPath, Buffer.from(renderListingText(ctx)), TOOL_RESULT_FILE_MODE))
    .then(
      () => listPath,
      () => {
        return;
      },
    );
}
//@ chunk-731a2452.js:19681-19691 placement
var SHA_PREFIX_TRIM = 16;
//@ chunk-731a2452.js:19691-19823 placement
function rememberPublishRequest(toolUseId, publishRequestDigest, toolContext) {
  let map = sessionScopedMapsSlot.of(toolContext.session);
  map.set(toolUseId, publishRequestDigest);
  Array.from(map.keys())
    .slice(0, Math.max(0, map.size - SHA_PREFIX_TRIM))
    .forEach((key) => map.delete(key));
}
//@ chunk-731a2452.js:19823-19950 placement
var buildPublishRequestDigest = (publishCtx, updatedInput) => ({
  digest: publishRequestHash(publishCtx),
  question: hashPublishInput(updatedInput.question),
  lines: hashCanonical(updatedInput.shown),
  drafts: publishCtx.draft !== undefined,
  card: buildPublishCard(publishCtx),
  everything: fullListingLines(publishCtx),
});
//@ chunk-731a2452.js:19950-20013 placement
var abortedRefusal = (options) =>
  options.signal.aborted ? refusalResult("stopped", [PUBLISH_STOPPED_TEXT.nothing]) : undefined;
//@ chunk-731a2452.js:20041-20139 placement
var isReadDeniedPath = (permissions, path, toolContext) =>
  [path, join(path, "within")].some((candidate) =>
    hasReadDenyRuleForPath(
      join(permissions[0] ?? "", candidate),
      toolContext.permissions(),
      permissions.map((root) => join(root, candidate)),
    ),
  );
//@ chunk-731a2452.js:20139-20265 placement
var withLeftOutEntries = (ctx, extra) => ({
  ...ctx,
  plan: {
    ...ctx.plan,
    listing: {
      ...ctx.plan.listing,
      leftOut: extra,
    },
  },
  withheld: extra.length < ctx.plan.listing.leftOut.length,
});
//@ chunk-731a2452.js:20265-20380 placement
function filterLeftOutByReadRules(ctx, permissions, toolContext) {
  let grantAll = !hasReadDenyRuleInForce(toolContext.permissions());
  return withLeftOutEntries(
    ctx,
    ctx.plan.listing.leftOut.filter(
      (entry) => grantAll || !isReadDeniedPath(permissions, entry.path, toolContext),
    ),
  );
}
//@ chunk-731a2452.js:20380-20459 placement
function writeDeniedRefusal(roots, prepared, context) {
  return prepared.draft !== undefined && hasPublishDenyRule(roots, context)
    ? refusalResult("write-denied")
    : undefined;
}
//@ chunk-731a2452.js:20459-21009 placement
/**
 * 发布插件工具的权限检查流程：功能开关/不能提示时直接返回；确认组织；检查读规则；准备发布目录与清单；检查读拒绝；写出完整清单文件并返回 ask 决定（同时记下请求摘要供后续核对）。
 */
async function checkPublishPermission(input, options, toolContext) {
  let { toolUseId } = options;
  let flagState = publishFlagState(input, toolContext);
  let cannotPrompt =
    toolUseId === undefined || cannotPromptForPublish(toolContext.permissions(), toolContext.agentId);
  if (flagState !== undefined || cannotPrompt) return publishRefusalDenial(flagState ?? "nobody-to-ask");
  let organization =
    abortedRefusal(options) ?? (await checkPublishSubmissions(getAuthUnavailableReason(), options.signal));
  if ("kind" in organization) return refusalFromUnreadable(organization, toolContext);
  let readResult = (await checkPublishReadRules(input, toolContext)) ?? abortedRefusal(options);
  if (readResult !== undefined) return refusalFromUnreadable(readResult, toolContext);
  let prepared = await unreadableOnError(preparePublishFolder(normalizePublishInput(input), organization));
  if ("kind" in prepared) return refusalFromUnreadable(prepared, toolContext);
  let publishRoots = [resolve(getCwd(), input.path), prepared.plan.root];
  let deniedOutcome =
    readDeniedOutcome(publishRoots, prepared.plan.listing, toolContext) ??
    writeDeniedRefusal(publishRoots, prepared, toolContext);
  if (deniedOutcome !== undefined) return refusalFromUnreadable(deniedOutcome, toolContext);
  let publishCtx = filterLeftOutByReadRules(prepared, publishRoots, toolContext);
  let listResult = await writePublishListFile(toolUseId, publishCtx, toolContext);
  let aborted = abortedRefusal(options);
  if (aborted !== undefined) return refusalFromUnreadable(aborted, toolContext);
  let publishAskDecision = buildPublishAskDecision(publishCtx, listResult);
  rememberPublishRequest(
    toolUseId,
    buildPublishRequestDigest(publishCtx, publishAskDecision.updatedInput),
    toolContext,
  );
  return publishAskDecision;
}
export { checkPublishPermission, PUBLISH_CHECK_MODULE_EXPORTS };
