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
import { join, join as join_2, dirname, resolve } from "path";
import { Ar } from "../../../runtime/bun-runtime.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { Qh, rsn, TOr, osn, aTo } from "../../tools/PublishPluginTool/constants.js";
import { _P } from "../../skills/loadSkillsDir.js";
import { PLUGIN_MANIFEST_PATH } from "../../utils/plugins/commandSource.js";
import {
  manifestWriteLines,
  staysOnMachineLines,
  manifestEntryLines,
} from "../../utils/teleport/uploadManifestText.js";
import { printableOrEmpty, printableName } from "../../utils/printableName.js";
import { formatFileSize } from "../../utils/format.js";
import { freeze_2, FILE_MODE_RWX, unreadableOnError } from "../../services/plugins/publish/validationCopy.js";
import { plural } from "../../utils/stringUtils.js";
import { MAX_CARD_FILES } from "../../components/permissions/FolderAccessPermissionRequest.js";
import { count } from "../../utils/collections.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getOriginalCwd, ensureToolResultsDir, writeToolResultFile } from "../../utils/toolResultStorage.js";
import { kN } from "../../utils/safeIdentifier.js";
import { AWn } from "../../utils/sessionScopedMaps.js";
import { hasReadDenyRuleForPath, hasReadDenyRuleInForce } from "../../utils/permissions/filesystem.js";
import { getAuthUnavailableReason } from "../../utils/auth/authUnavailableReason.js";
import { getCwd } from "../../utils/cwd.js";

//@ chunk-xkt86s08.js:13501-13510 placement
var W = {};
//@ chunk-xkt86s08.js:13510-13545 placement
Ar(W, { check: () => checkPublishPermission, default: () => W });
//@ chunk-xkt86s08.js:13577-13639 placement
var ze = DoctorLazy(() => u({ organization: u({ uuid: o(), name: o().min(1) }) }));
//@ chunk-xkt86s08.js:13639-13651 placement
var Ee = 5000;
/**
 * 有 profile 权限时请求 /api/oauth/profile，组织 uuid 与给定值相同则返回组织名，否则 undefined（带超时与外部中止信号）。
 */
//@ chunk-xkt86s08.js:13651-13955 placement
async function fetchOrganizationNameIfMatches(e, r) {
  if (!mayHaveProfileScope()) return;
  let t = await publishRequestOnce({
      method: "get",
      path: "/api/oauth/profile",
      body: void 0,
      headers: {},
      bound: "clock",
      signal: AbortSignal.any([r, AbortSignal.timeout(Ee)]),
    }),
    s = ze().safeParse("status" in t && isClientErrorStatus(t) ? t.data : void 0).data;
  return s?.organization.uuid === e ? s.organization.name : void 0;
}
//@ chunk-xkt86s08.js:13955-14032 placement
async function Ce(e, r) {
  return e.name !== void 0 ? e : { ...e, name: await fetchOrganizationNameIfMatches(e.id, r) };
}
//@ chunk-xkt86s08.js:14032-14206 placement
async function checkPublishSubmissions(e, r) {
  let t = await ensureOrganization(e);
  if (t === void 0) return Qh(e ?? organizationAvailability());
  let s = { organization: t, signal: r },
    i = await fetchMySubmissions(s);
  return Array.isArray(i) ? Ce(t, r) : stoppedOrResult(s, i, "nothing");
}
//@ chunk-xkt86s08.js:14206-14282 placement
function j(e) {
  return e.draft !== void 0 ? { path: _P(PLUGIN_MANIFEST_PATH), text: e.draft ?? "" } : void 0;
}
//@ chunk-xkt86s08.js:14282-14304 placement
var Ue = (e) => manifestWriteLines(j(e));
//@ chunk-xkt86s08.js:14304-14352 placement
var B = (e) => `${printableOrEmpty(e.path, rsn)} (${formatFileSize(e.bytes)})`;
//@ chunk-xkt86s08.js:14352-14399 placement
var $e = (e) => staysOnMachineLines(e.plan.listing.leftOut.length);
//@ chunk-xkt86s08.js:14399-14471 placement
var A = (e) => printableName(e.organization.name ?? `organization ${e.organization.id}`);
//@ chunk-xkt86s08.js:14471-14953 placement
var PUBLISH_STEPS_TEXT = (e) => [
  "First uploads it to your own shelf on claude.ai (My Uploads); whether it is scanned there depends on your organization",
  `Then submits it to ${A(e)} for an administrator's review; where the organization publishes without review, it is published at once`,
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
    .filter((file) => freeze_2.includes(file.path))
    .map((r) => `Sends ${r.path}: keys and tokens written in it go with it`);
//@ chunk-xkt86s08.js:15090-15200 placement
var WITHHELD_ENTRIES_NOTE =
  "Entries stay behind that are neither named nor counted here: this session's rules deny reading them.";
//@ chunk-xkt86s08.js:15200-15230 placement
var Z = (e) => (e.withheld ? [WITHHELD_ENTRIES_NOTE] : []);
//@ chunk-xkt86s08.js:15230-15261 placement
var ee = (e) => [...listSensitiveSentFiles(e), ...Z(e)];
//@ chunk-xkt86s08.js:15261-15537 placement
var buildPublishCard = (e) => ({
  question: `Publish ${TOr(e.plan.manifest)} to ${A(e)}?`,
  lines: [
    `Folder: ${printableOrEmpty(e.plan.root)}`,
    `Sends ${e.plan.listing.files.length} ${plural(e.plan.listing.files.length, "file")}, ` +
      formatFileSize(e.plan.bytes),
    ...ee(e),
    ...$e(e),
    ...PUBLISH_STEPS_TEXT(e),
    ...Ue(e),
  ],
  values: e.plan.listing.files.map(B),
});
//@ chunk-xkt86s08.js:15537-15547 placement
var je = 48;
//@ chunk-xkt86s08.js:15547-15729 placement
function capFileListForCard(e, r) {
  let filtered = e.slice(0, MAX_CARD_FILES).filter(
      (n, f) =>
        e.slice(0, f + 1).join(`
`).length +
          je <=
        r,
    ),
    s = e.length - filtered.length;
  return s === 0 ? filtered : filtered.concat(`and ${s} more ${plural(s, "file")} not named here`);
}
//@ chunk-xkt86s08.js:15729-15802 placement
var te = (e, r) => [
  buildPublishCard(e).question,
  `Organization: ${A(e)}`,
  ...buildPublishCard(e).lines,
  ...r,
];
//@ chunk-xkt86s08.js:15802-15814 placement
var Ke = 1800;
//@ chunk-xkt86s08.js:15814-15900 placement
function Be(e, r) {
  let t = te(e, r);
  return t.concat(
    capFileListForCard(
      buildPublishCard(e).values,
      Ke -
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
var Ye = (e) => ({
  type: "other",
  reason: e.join(`
`),
});
//@ chunk-xkt86s08.js:16148-16159 placement
var Ge = 1e5;
//@ chunk-xkt86s08.js:16159-16285 placement
function capPathsByLength(e) {
  let sliced = e.slice(0, osn);
  return sliced.slice(
    0,
    count(
      sliced.reduce((t, s) => t.concat((t.at(-1) ?? 0) + s.path.length), []),
      (t) => t <= Ge,
    ),
  );
}
//@ chunk-xkt86s08.js:16285-16339 placement
var Je = (e) => ({ files: capPathsByLength(e.files), stays: capPathsByLength(e.leftOut) });
//@ chunk-xkt86s08.js:16339-16471 placement
function countUnnamedEntries(e, r) {
  let t = e.files.length - r.files.length,
    s = e.leftOut.length - r.stays.length;
  return t === 0 && s === 0 ? void 0 : { files: t, stays: s };
}
//@ chunk-xkt86s08.js:16471-16756 placement
var freeze = Object.freeze({
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
var Ze = (e) => "stays here: " + printableOrEmpty(e.path, rsn) + ` (${freeze[e.why]})`;
//@ chunk-xkt86s08.js:16816-16895 placement
var he = (e) => [...e.plan.listing.files.map(B), ...e.plan.listing.leftOut.map(Ze)];
//@ chunk-xkt86s08.js:16895-16926 placement
var er = (e) => [...he(e), ...Z(e)];
//@ chunk-xkt86s08.js:16926-16960 placement
var ye = (e) => `${er(e).join(`
`)}
`;
/**
 * 构造发布请求的结构化摘要（供审批/展示）：请求摘要哈希、标题、组织、插件名与版本、目录、模式、步骤、警告、写入项、发送文件（路径/字节/sha256/是否可执行）、留下的条目及原因、完整清单文件的哈希与路径、未列出的数量。
 */
//@ chunk-xkt86s08.js:16960-17634 placement
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
  folder: printableOrEmpty(publishCtx.plan.root, rsn),
  mode: publishCtx.wanted.mode,
  steps: PUBLISH_STEPS_TEXT(publishCtx),
  warnings: ee(publishCtx),
  writes: j(publishCtx),
  sends: { files: publishCtx.plan.listing.files.length, bytes: publishCtx.plan.bytes },
  files: shown.files.map((file) => ({
    path: printableOrEmpty(file.path, rsn),
    bytes: file.bytes,
    sha256: publishCtx.plan.hashes[file.path] ?? "",
    runs: file.mode === FILE_MODE_RWX,
  })),
  staying: publishCtx.plan.listing.leftOut.length,
  stays: shown.stays.map((stay) => ({
    path: printableOrEmpty(stay.path, rsn),
    why: stay.why,
    words: freeze[stay.why],
  })),
  list: { sha256: computeContentHash(ye(publishCtx)), path: listPath },
  unnamed: countUnnamedEntries(publishCtx.plan.listing, shown),
});
//@ chunk-xkt86s08.js:17634-17675 placement
var tr = (e, r) => buildPublishSummary(e, r, Je(e.plan.listing));
//@ chunk-xkt86s08.js:17675-17885 placement
function buildPublishPromptInput(e, r) {
  let t = tr(e, r);
  return {
    path: e.plan.root,
    destination: e.wanted.destination,
    description: e.wanted.description,
    replace: e.wanted.mode === "replace" || void 0,
    shown: [...te(e, describeFullListLocation(r, e)), ...manifestEntryLines(t)],
    question: t,
  };
}
/**
 * 生成发布的 ask 权限决定：问题文案、updatedInput（目录、目的地、描述、replace、展示行）、不允许"始终允许"规则，附带决定原因。
 */
//@ chunk-xkt86s08.js:17885-18056 placement
function buildPublishAskDecision(e, r) {
  let t = Be(e, describeFullListLocation(r, e));
  return {
    behavior: "ask",
    message: buildPublishCard(e).question,
    updatedInput: buildPublishPromptInput(e, r),
    suppressAlwaysAllowRule: !0,
    localDisplayOnly: !1,
    decisionReason: Ye(t),
  };
}
//@ chunk-xkt86s08.js:18056-18132 placement
function d(e, r) {
  let t = explainUnreadable(e, r);
  return aTo(t.refusal.kind, t.refusal.details);
}
//@ chunk-xkt86s08.js:18132-18233 placement
var cannotPromptForPublish = (e, r) =>
  r !== void 0 || e.shouldAvoidPermissionPrompts === !0 || e.servedCall === !0 || e.mode === "dontAsk";
//@ chunk-xkt86s08.js:18276-18287 placement
var fr = 384;
/**
 * 把完整的发布文件清单写到会话工具结果目录下的 publish-<toolUseId>.txt；toolUseId 不是普通标识时放弃，返回文件路径或 undefined。
 */
//@ chunk-xkt86s08.js:18287-18533 placement
async function writePublishListFile(e, r, t) {
  let s = getOriginalCwd(t.session),
    i = kN(e),
    n = join(s, `publish-${i}.txt`);
  return (
    i !== void 0 && dirname(n) === s
      ? ensureToolResultsDir(s, void 0)
      : Promise.reject(Error("The tool use id is no plain token"))
  )
    .then(() => writeToolResultFile(n, Buffer.from(ye(r)), fr))
    .then(
      () => n,
      () => {
        return;
      },
    );
}
//@ chunk-xkt86s08.js:18533-18543 placement
var dr = 16;
//@ chunk-xkt86s08.js:18543-18675 placement
function rememberPublishRequest(e, r, t) {
  let of = AWn.of(t.session);
  (of.set(e, r),
    Array.from(of.keys())
      .slice(0, Math.max(0, of.size - dr))
      .forEach((i) => of.delete(i)));
}
//@ chunk-xkt86s08.js:18675-18802 placement
var buildPublishRequestDigest = (e, r) => ({
  digest: publishRequestHash(e),
  question: hashPublishInput(r.question),
  lines: hashCanonical(r.shown),
  drafts: e.draft !== void 0,
  card: buildPublishCard(e),
  everything: he(e),
});
//@ chunk-xkt86s08.js:18802-18865 placement
var D = (e) => (e.signal.aborted ? Qh("stopped", [PUBLISH_STOPPED_TEXT.nothing]) : void 0);
//@ chunk-xkt86s08.js:18893-18991 placement
var cr = (e, r, t) =>
  [r, join_2(r, "within")].some((s) =>
    hasReadDenyRuleForPath(
      join_2(e[0] ?? "", s),
      t.permissions(),
      e.map((i) => join_2(i, s)),
    ),
  );
//@ chunk-xkt86s08.js:18991-19117 placement
var withLeftOutEntries = (e, r) => ({
  ...e,
  plan: { ...e.plan, listing: { ...e.plan.listing, leftOut: r } },
  withheld: r.length < e.plan.listing.leftOut.length,
});
//@ chunk-xkt86s08.js:19117-19232 placement
function filterLeftOutByReadRules(e, r, t) {
  let s = !hasReadDenyRuleInForce(t.permissions());
  return withLeftOutEntries(
    e,
    e.plan.listing.leftOut.filter((i) => s || !cr(r, i.path, t)),
  );
}
//@ chunk-xkt86s08.js:19232-19311 placement
function yr(e, r, t) {
  return r.draft !== void 0 && hasPublishDenyRule(e, t) ? Qh("write-denied") : void 0;
}
/**
 * 发布插件工具的权限检查流程：功能开关/不能提示时直接返回；确认组织；检查读规则；准备发布目录与清单；检查读拒绝；写出完整清单文件并返回 ask 决定（同时记下请求摘要供后续核对）。
 */
//@ chunk-xkt86s08.js:19311-19861 placement
async function checkPublishPermission(input, options, toolContext) {
  let { toolUseId: toolUseId } = options,
    i = publishFlagState(input, toolContext),
    n = toolUseId === void 0 || cannotPromptForPublish(toolContext.permissions(), toolContext.agentId);
  if (i !== void 0 || n) return aTo(i ?? "nobody-to-ask");
  let organization =
    D(options) ?? (await checkPublishSubmissions(getAuthUnavailableReason(), options.signal));
  if ("kind" in organization) return d(organization, toolContext);
  let _ = (await checkPublishReadRules(input, toolContext)) ?? D(options);
  if (_ !== void 0) return d(_, toolContext);
  let prepared = await unreadableOnError(preparePublishFolder(normalizePublishInput(input), organization));
  if ("kind" in prepared) return d(prepared, toolContext);
  let publishRoots = [resolve(getCwd(), input.path), prepared.plan.root],
    I =
      readDeniedOutcome(publishRoots, prepared.plan.listing, toolContext) ??
      yr(publishRoots, prepared, toolContext);
  if (I !== void 0) return d(I, toolContext);
  let publishCtx = filterLeftOutByReadRules(prepared, publishRoots, toolContext),
    Me = await writePublishListFile(toolUseId, publishCtx, toolContext),
    N = D(options);
  if (N !== void 0) return d(N, toolContext);
  let M = buildPublishAskDecision(publishCtx, Me);
  return (
    rememberPublishRequest(toolUseId, buildPublishRequestDigest(publishCtx, M.updatedInput), toolContext),
    M
  );
}
