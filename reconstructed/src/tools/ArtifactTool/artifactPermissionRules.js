/**
 * tools/ArtifactTool/artifactPermissionRules.ts
 *
 * 2.1.316 新增：为 artifacts MCP 工具（runner/laptop）安装权限与调用包装；artifact MCP 动作到目标字段的映射表等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7zr1t9gr.js (1), chunk-p5cstt88.js (49)
 * attribution: placement 50
 */
import {
  getContentRulesMapForToolName,
  getDenyRuleForTool,
  getAskRuleForTool,
  matchToolRule,
  getAskRules,
  getDenyRules,
  toolMatchesRule,
  applyAskRuleOverride,
  toolAlwaysAllowedRule,
} from "../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, getArtifactPublishStubDir, ArtifactInputError } from "./constants.js";
import { matchWildcard } from "../../utils/permissions/permissionRuleParser.js";
import { regExp_2 as regExp_2_2, regExp as regExp_4, WZe } from "../../services/artifacts/artifactDb.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  artifactViewerUrlFor,
  refusalEcho,
  classifierArtifactTargetFor,
  foldClassifierCodePhrases,
  sweepProvenanceMarker,
  DECISION_SURFACE_BRACKETS_RE,
  SESSION_CREATED_CLASSIFIER_MARK,
} from "./artifactUrls.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { readUntrustedArray, Uf, Eae } from "../../utils/untrustedArray.js";
import {
  findUrlContentRule,
  zln,
  artifactDataRule,
  i_t,
  dataToolEquivalent,
} from "./permissions/ruleTarget.js";
import {
  ARTIFACT_WEBFETCH_READ_ACTIONS,
  webFetchRuleForArtifactRead,
  denyRulePhrase,
} from "./permissions/readRules.js";
import { collapseArtifactAction } from "../../services/artifacts/artifactToolActions.js";
import {
  isArtifactToolsetSplit,
  isArtifactToolEnabled,
  isCoworkFramePublishSession,
} from "../../services/artifacts/artifactToolGates.js";
import { WEBFETCH } from "../WebFetchTool/prompt.js";
import { readWouldBeAutoAllowedForPath } from "../../utils/permissions/filesystem.js";
import { policyDeniedReason, getArtifactCreateNotice } from "../../services/policyLimits/policyEvidence.js";
import {
  consentMustDeny,
  getToolPermissionContext,
  planConsentMustDeny,
  consentAskCanReachUser,
} from "../../utils/permissions/toolPermissionContext.js";
import { isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { NRn } from "../../utils/messageProvenance.js";
import {
  routineRunNobodyJudges,
  newArtifactIsPersonsPrivate,
  recordUnaskedRoutineFirstPublish,
} from "./artifactAccessClasses.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { getSettingSourceDisplayNameLowercase } from "../../utils/settings/constants.js";
import {
  anyAutoReactNoticePending,
  hasAutoReactNoticePending,
  getShareEntry,
  hasOtherCommentPending,
  ownershipClassifierMark,
  otherCommentPendingSeq,
  settleOtherCommentPending,
  deriveShareStatus,
  recordUnaccountedComments,
  recordJudgedComments,
  isSomeoneElses,
  otherOrgClassifierMark,
} from "../../services/artifacts/shareEntries.js";
import {
  personOnlyRegistry,
  personOnlyDecisionFor,
  PERSON_ONLY_DECISION,
  isUserDecidedToolUse,
} from "../../utils/permissions/personOnlyDecisions.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import {
  isCreateAction,
  F3o,
  shareFieldsFromResult,
  publishedArtifactFromResult,
  commentsFromResult,
} from "./actionNames.js";
import {
  artifactsMcpInCloudSession,
  ARTIFACTS_MCP_READ_COMMENTS_TOOL,
  ARTIFACTS_MCP_REPLY_COMMENT_TOOL,
} from "../../services/artifacts/artifactsMcpTools.js";
import { normalizeNfkc } from "../../utils/sanitization.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { Nxe } from "../../utils/messages/forwardedTurnSanitize.js";
import { isRunnerDynamicServer } from "../../services/analytics/metadata.js";
import { USn, n } from "../../services/mcp/client.js";
import { logForDebugging } from "../../utils/debug.js";
import { warmShareEntry } from "../../services/artifacts/shareEntryWarm.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { ownAccountUuid, ownPrincipalTokens } from "../../services/artifacts/comments/commentAuthorship.js";
import { ANTHROPIC_FRAMECREATECONFIRMED } from "../../services/artifacts/frameApi.js";

//@ chunk-p5cstt88.js:6973-7175 placement
var DATA_RULE_FIELDS = new Set(["db_op", "collection", "doc_id", "query", "data", "writes", "as_level"]),
  ENDPOINT_RULE_FIELDS = new Set(["method", "path", "body", "body_file", "mode", "script"]),
  DATA_RULE_ACTIONS = ["read_db", "write_db", "call_endpoint", "run_script"];
//@ chunk-p5cstt88.js:7175-7391 placement
function findDataContentRule(n, e) {
  for (let [s, r] of getContentRulesMapForToolName(n, ARTIFACT_TOOL_NAME, e)) {
    let index = s.indexOf(":"),
      l = index <= 0 ? "" : s.slice(index + 1).trim();
    if (l === "") continue;
    let trimmed = s.slice(0, index).trim();
    if (
      DATA_RULE_FIELDS.has(trimmed) ||
      ENDPOINT_RULE_FIELDS.has(trimmed) ||
      (trimmed === "action" && DATA_RULE_ACTIONS.some((g) => matchWildcard(l, g)))
    )
      return r;
  }
  return;
}
/**
 * artifact MCP 动作到目标字段的映射表。
 */
//@ chunk-p5cstt88.js:7391-10137 placement
var ARTIFACT_ACTION_TARGETS = () => require("./chunk-d5fbj7hf.js"),
  T = { name: ARTIFACT_TOOL_NAME, mcpInfo: void 0, ruleContentField: void 0 },
  b = {
    publish_version: { action: "publish", target: "slug" },
    edit_version: { action: "publish", target: "slug" },
    publish_files: { action: "publish", target: "slug" },
    copy_file: { action: "publish", target: "slug", source: "from_slug" },
    create_from_type: { action: "publish", type: "slug" },
    declare_capabilities: { action: "publish", target: "slug" },
    get_artifact: { action: "read", target: "slug" },
    read_artifact: { action: "read", target: "slug" },
    read_shared_artifact: { action: "read", target: "slug" },
    list_artifacts: { action: "list" },
    list_types: { action: "list_types" },
    describe_type: { action: "describe_type", type: "slug" },
    guide: {},
    pin_artifact: { action: "pin", target: "slug" },
    unpin_artifact: { action: "unpin", target: "slug" },
    read_comments: { action: "comments", target: "slug" },
    reply_comment: { action: "reply", target: "slug" },
    reply_shared_comment: { action: "reply", target: "slug" },
    resolve_comment: { action: "resolve", target: "slug" },
    watch: { action: "watch", target: "slug" },
    unwatch: { action: "unwatch", target: "slug" },
    upload_asset: { action: "upload_asset", target: "slug" },
    list_assets: { action: "list_assets", target: "slug" },
    read_asset: { action: "read_asset", target: "slug" },
    copy_asset: { action: "copy_from", target: "slug", source: "from" },
    delete_asset: { action: "delete_asset", target: "slug" },
    list_files: { action: "list_files", target: "slug" },
    read_file: { action: "read_file", target: "slug" },
    read_declaration: { action: "read", target: "slug" },
    describe_capabilities: {},
    authorize_upload: { action: "publish", target: "slug" },
    delete_artifact: { action: "delete", target: "slug" },
    db_write: { action: "write_db", target: "slug" },
    db_get: { action: "read_db", target: "slug" },
    db_list: { action: "read_db", target: "slug" },
    db_query: { action: "read_db", target: "slug" },
    db_usage: { action: "read_db", target: "slug" },
    db_whoami: { action: "read_db", target: "slug" },
    db_profiles: { action: "read_db", target: "slug" },
    db_rules_get: { action: "read_db", target: "slug" },
    db_str_replace: { action: "write_db", target: "slug", readsBack: !0 },
    ...{},
  },
  Ue = {
    db_get: "get",
    db_list: "list",
    db_query: "query",
    db_profiles: "profiles",
    db_str_replace: "str_replace",
  },
  Ne = new Set(["slug", "shared_live", "owned_by", "asLevel"]),
  Fe = {
    db_get: { names: "document", takes: new Set(["path"]) },
    db_list: { names: "collection", takes: new Set(["collection", "limit", "cursor"]) },
    db_query: { names: "collection", takes: new Set(["collection", "where", "orderBy", "limit", "cursor"]) },
    db_write: { names: "operations", takes: new Set(["ops", "idempotencyKey"]) },
    db_str_replace: {
      names: "document",
      takes: new Set(["path", "field", "old_str", "new_str", "replace_all", "ifVersion", "idempotencyKey"]),
    },
    db_profiles: { takes: new Set(["ids"]) },
    db_usage: { takes: new Set() },
    db_whoami: { takes: new Set() },
    db_rules_get: { takes: new Set() },
  },
  $e = new Set(["op", "path", "data", "ifVersion"]),
  Me = new Set(["set", "merge", "update", "delete"]);
//@ chunk-p5cstt88.js:10137-10273 placement
function isArtifactAssetPath(n) {
  if (typeof n !== "string") return !1;
  let index = n.lastIndexOf("/");
  return regExp_2_2.test(n.slice(0, Math.max(index, 0))) && regExp_4.test(n.slice(index + 1));
}
/**
 * artifact URL/UUID 的匹配模式。
 */
//@ chunk-p5cstt88.js:10273-10697 placement
var ARTIFACT_URL_PATTERNS = "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}",
  regExp = new RegExp(`^${ARTIFACT_URL_PATTERNS.replaceAll("A-F", "")}$`),
  regExp_2 = new RegExp(
    `^https://(?:preview\\.)?(?:claude\\.ai|claude\\.com|claude-ai\\.staging\\.ant\\.dev)/(?:code/(?:artifact|frame)|artifact)/(?:[A-Za-z0-9_-]*-)?(${ARTIFACT_URL_PATTERNS}|[1-9A-HJ-NP-Za-km-z]{22})(?:[/?#]|$)`,
  ),
  regExp_3 = new RegExp(
    `^https://(${ARTIFACT_URL_PATTERNS})\\.frame\\.(?:staging\\.)?claudeusercontent\\.com(?:[/?#]|$)`,
  );
/**
 * 把 artifact 地址或 slug 规范成小写 UUID slug：已是 slug 直接返回，否则从 URL 中解析（22 位 base58 解码为 UUID），失败返回 null。
 */
//@ chunk-p5cstt88.js:10697-10972 placement
function normalizeArtifactSlug(n) {
  let lower = n.toLowerCase();
  if (regExp.test(lower)) return lower;
  let trimmed = n.trim(),
    r = trimmed.match(/^[^:/?#]+:\/\/[^/?#]*/)?.[0] ?? "",
    a = r.toLowerCase() + trimmed.slice(r.length),
    l = a.match(regExp_2)?.[1];
  if (l !== void 0) return l.length === 22 ? decodeBase58Uuid(l) : l.toLowerCase();
  return a.match(regExp_3)?.[1]?.toLowerCase() ?? null;
}
/**
 * 规范化 artifact 调用输入（目标、来源、拷贝）。
 */
//@ chunk-p5cstt88.js:10972-12919 placement
function normalizeArtifactInput(n, e, s) {
  let hasOwn = Object.hasOwn(b, n),
    a = hasOwn ? b[n] : { target: "slug" },
    l = isPlainObject(e) ? e : {},
    u = {},
    g = !hasOwn,
    d = !1,
    A = !1,
    y = a?.target === void 0 ? void 0 : l[a.target],
    c = a?.source === void 0 ? void 0 : l[a.source];
  for (let [m, o] of [
    ["url", a?.target],
    ["from_url", a?.source],
    ["type_url", a?.type],
  ]) {
    let i = o === void 0 ? void 0 : l[o];
    if (typeof i !== "string") {
      if (i !== void 0 && i !== null) ((g = !0), (d ||= m === "from_url"));
      continue;
    }
    let p = normalizeArtifactSlug(i);
    if (p === null) ((g = !0), (d ||= m === "from_url"));
    else u[m] = artifactViewerUrlFor({ slug: p, env: claudeAiEnvironment() });
  }
  if (a?.action !== void 0) u.action = a.action;
  if (typeof l.title === "string") u.title = l.title;
  let w = a?.action === "read_db" || a?.action === "write_db",
    h = readUntrustedArray(l.ops);
  if (!w && typeof l.path === "string") u.path = l.path;
  if (Array.isArray(l.paths)) u.paths = l.paths;
  if (w) {
    let m = s?.op ?? Ue[n] ?? (h !== void 0 ? "batch" : void 0);
    if (m !== void 0) u.db_op = m;
    let o = s?.path ?? (typeof l.path === "string" ? l.path : void 0),
      i = Fe[n];
    if (
      ((A =
        i === void 0 ||
        Object.keys(l).some((f) => !Ne.has(f) && !i.takes.has(f)) ||
        (l.asLevel !== void 0 && !WZe.some((f) => f === l.asLevel)) ||
        (i.names === "document" && !isArtifactAssetPath(l.path)) ||
        (i.names === "collection" && !(typeof l.collection === "string" && regExp_2_2.test(l.collection))) ||
        (i.names === "operations" &&
          !(
            h !== void 0 &&
            h !== Uf &&
            h.length > 0 &&
            h.every(
              (f) =>
                isPlainObject(f) &&
                Object.keys(f).every((R) => $e.has(R)) &&
                Me.has(f.op) &&
                isArtifactAssetPath(f.path),
            )
          ))),
      typeof l.asLevel === "string")
    )
      u.as_level = l.asLevel;
    let p = o === void 0 ? -1 : o.lastIndexOf("/");
    if (o !== void 0 && p > 0) ((u.collection = o.slice(0, p)), (u.doc_id = o.slice(p + 1)));
    else if (typeof l.collection === "string") u.collection = l.collection;
  }
  if (typeof l.id === "string" && a?.action?.endsWith("_asset")) u.asset_id = l.id;
  if (a?.action === "upload_asset" || n === "publish_files") {
    let flattened = (Eae(l.files) ?? []).flatMap((o) =>
      isPlainObject(o) && typeof o.path === "string" ? [o.path] : [],
    );
    if (((u.file_paths = flattened), flattened.length === 1)) u.file_path = flattened[0];
  }
  return {
    input: u,
    unread: g,
    known: hasOwn,
    ...(typeof y === "string" && { rawUrl: y }),
    ...(typeof c === "string" && { rawSourceUrl: c }),
    ...(d && { copies: !0 }),
    ...(A && { dbUnread: !0 }),
    ...((a?.readsBack === !0 ||
      l.ifVersion !== void 0 ||
      h === Uf ||
      (h ?? []).some((m) => isPlainObject(m) && m.ifVersion !== void 0)) && { readsBack: !0 }),
  };
}
//@ chunk-p5cstt88.js:12919-12982 placement
function Ke(n, e) {
  for (let [s, r] of n) if (e(s)) return r;
  return null;
}
//@ chunk-p5cstt88.js:12982-13098 placement
function findRuleForFields(n, e) {
  for (let [s, r] of n) {
    let index = s.indexOf(":");
    if (index > 0 && e.includes(s.slice(0, index).trim())) return r;
  }
  return null;
}
//@ chunk-p5cstt88.js:13098-13250 placement
function withoutNarrowingDenyRules(n) {
  if ((n.alwaysDenyRules.toolsNarrowing?.length ?? 0) === 0) return n;
  let { toolsNarrowing: toolsNarrowing, ...s } = n.alwaysDenyRules;
  return { ...n, alwaysDenyRules: s };
}
//@ chunk-p5cstt88.js:13250-13296 placement
var He = "00000000-0000-4000-8000-000000000000";
/**
 * 用权限规则匹配 artifact 调用。
 */
//@ chunk-p5cstt88.js:13296-14937 placement
function matchArtifactRule(n, e, s) {
  let { action: action, ...a } = e.input,
    url = e.input.url,
    u = typeof url === "string" ? normalizeArtifactSlug(url) : null,
    from_url = e.input.from_url,
    d = typeof from_url === "string" ? normalizeArtifactSlug(from_url) : null,
    A =
      (s === "deny" ? getDenyRuleForTool(withoutNarrowingDenyRules(n), T) : getAskRuleForTool(n, T)) ??
      findUrlContentRule(n, e.input, s) ??
      zln(n, T, e.input, s) ??
      matchToolRule(n, T, a, s) ??
      artifactDataRule(s === "deny" ? withoutNarrowingDenyRules(n) : n, T, e.input, s) ??
      ((!e.known || ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(e.input.action)) || e.readsBack === !0) &&
      u !== null
        ? webFetchRuleForArtifactRead(n, { slug: u, env: claudeAiEnvironment() }, e.rawUrl ?? url, s)
        : null) ??
      (d !== null && typeof from_url === "string"
        ? webFetchRuleForArtifactRead(
            n,
            { slug: d, env: claudeAiEnvironment() },
            e.rawSourceUrl ?? from_url,
            s,
          )
        : null);
  if (A !== null) return { rule: A, why: "named" };
  if (e.input.action === "run_script" || e.input.action === "call_endpoint") {
    let c =
      findDataContentRule(s === "deny" ? withoutNarrowingDenyRules(n) : n, s) ??
      findRuleForFields(getContentRulesMapForToolName(n, i_t.data, s), [...DATA_RULE_FIELDS, "action"]) ??
      void 0;
    if (c !== void 0) return { rule: c, why: "named" };
  }
  let y = collapseArtifactAction(e.input);
  if (isPlainObject(y) && y !== e.input) {
    let { action: action, ...w } = y,
      h = matchToolRule(n, T, isArtifactToolsetSplit() ? y : w, s);
    if (h !== null) return { rule: h, why: "named" };
  }
  if (e.dbUnread === !0)
    for (let c of [ARTIFACT_TOOL_NAME, i_t.data]) {
      let w = findRuleForFields(
        getContentRulesMapForToolName(n, c, s),
        c === ARTIFACT_TOOL_NAME ? [...DATA_RULE_FIELDS] : [...DATA_RULE_FIELDS, "action"],
      );
      if (w !== null) return { rule: w, why: "unread" };
    }
  for (let c of [ARTIFACT_TOOL_NAME, ...Object.values(i_t)]) {
    let w = getContentRulesMapForToolName(n, c, s),
      h = e.unread ? findRuleForFields(w, ["url", "from_url", "type_url"]) : null;
    if (h !== null) return { rule: h, why: "unread" };
    let m = { name: c, mcpInfo: void 0, ruleContentField: void 0 },
      o = e.known
        ? null
        : ([...w.values()][0] ??
          (c === ARTIFACT_TOOL_NAME
            ? null
            : s === "deny"
              ? getDenyRuleForTool(withoutNarrowingDenyRules(n), m)
              : getAskRuleForTool(n, m)));
    if (o !== null) return { rule: o, why: "unknown" };
  }
  if (
    e.unread &&
    (!e.known ||
      ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(e.input.action)) ||
      e.readsBack === !0 ||
      e.copies === !0)
  ) {
    let c = { slug: He, env: claudeAiEnvironment() };
    for (let h of [e.rawUrl, e.rawSourceUrl, artifactViewerUrlFor(c)]) {
      let m = h === void 0 ? null : webFetchRuleForArtifactRead(n, c, h, s);
      if (m !== null) return { rule: m, why: "unread" };
    }
    let w = Ke(getContentRulesMapForToolName(n, WEBFETCH, s), (h) =>
      /^domain:(?:.*[.*])?claudeusercontent\.com$/i.test(h.trim()),
    );
    if (w !== null) return { rule: w, why: "unread" };
  }
  return null;
}
/**
 * 去掉参数值末尾误带的 </invoke> 标签。
 */
//@ chunk-p5cstt88.js:14937-15249 placement
function stripTrailingInvoke(n) {
  let e = n;
  if (isPlainObject(n))
    for (let [s, r] of Object.entries(n)) {
      let a = typeof r === "string" ? r.trimEnd() : "";
      if (!a.toLowerCase().endsWith("</invoke>")) continue;
      let trimEnd = a.slice(0, -9).trimEnd();
      if (trimEnd.toLowerCase().endsWith(`</${s.toLowerCase()}>`))
        trimEnd = trimEnd.slice(0, -`</${s}>`.length).trimEnd();
      e = { ...(isPlainObject(e) ? e : n), [s]: trimEnd };
    }
  return e;
}
/**
 * 生成用于规则匹配的输入变体（多文件拆分）。
 */
//@ chunk-p5cstt88.js:15249-15801 placement
function artifactRuleInputs(n, e, s, r) {
  let a = stripTrailingInvoke(s),
    l = isPlainObject(s) && Array.isArray(s.files) && s.files.length > 1 ? s.files : [],
    mapped = [
      s,
      ...(a === s ? [] : [a]),
      ...l.map((d) => ({ ...(isPlainObject(s) ? s : {}), files: [d] })),
    ].map((d) => [d, void 0]),
    g = !isPlainObject(s)
      ? []
      : e === "db_str_replace"
        ? [{ op: "update", path: s.path }]
        : e === "db_write" && Array.isArray(s.ops)
          ? s.ops
              .filter(isPlainObject)
              .flatMap((d) =>
                (d.op === "merge" ? ["set", "update"] : [d.op]).map((A) => ({ op: A, path: d.path })),
              )
          : [];
  for (let [d, A] of [
    ...mapped,
    ...g.flatMap(({ op: op, path: path }) =>
      typeof op === "string" && typeof path === "string" ? [[s, { op: op, path: path }]] : [],
    ),
  ]) {
    let y = matchArtifactRule(n, normalizeArtifactInput(e, d, A), r);
    if (y !== null) return y;
  }
  return null;
}
//@ chunk-p5cstt88.js:15801-15915 placement
function listDataToolNames() {
  let values = Object.values(i_t);
  return values.length < 2 ? values.join("") : `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`;
}
//@ chunk-p5cstt88.js:15915-16201 placement
function unreadCallRuleNote(n) {
  return n === "unread"
    ? " Claude Code couldn't tell what this call names or does, so the rule applies to it."
    : n === "unknown"
      ? ` Claude Code doesn't know what this tool does, so every ${ARTIFACT_TOOL_NAME} rule that names something in parentheses, and every rule on ${listDataToolNames()}, applies to it.`
      : "";
}
//@ chunk-p5cstt88.js:16201-16398 placement
var KNOWN_MCP_ARG_NAMES = new Set([
    "slug",
    "from_slug",
    "from",
    "shared_live",
    "contract",
    "title",
    "path",
    "paths",
    "files",
    "id",
    "collection",
    "op",
    "ops",
    "ifVersion",
    "asLevel",
  ]),
  KNOWN_MCP_ARG_NAMES_UPPER = new Set([...KNOWN_MCP_ARG_NAMES].map((n) => n.toUpperCase()));
//@ chunk-p5cstt88.js:16398-16597 placement
function findMisspelledArgName(n) {
  if (!isPlainObject(n)) return;
  return [n, ...[n.files, n.ops].flat().filter(isPlainObject)]
    .flatMap(Object.keys)
    .find(
      (e) =>
        !KNOWN_MCP_ARG_NAMES.has(e) &&
        KNOWN_MCP_ARG_NAMES_UPPER.has(e.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().toUpperCase()),
    );
}
//@ chunk-p5cstt88.js:16597-16783 placement
var UPLOAD_MCP_TOOLS = new Set(["publish_files", "declare_capabilities", "authorize_upload"]),
  READ_ONLY_ACTIONS = new Set([
    "read",
    "comments",
    "read_db",
    "list_assets",
    "read_asset",
    "list_files",
    "read_file",
    "get_endpoints",
  ]);
//@ chunk-p5cstt88.js:16783-16913 placement
function allPublishFilesAutoReadable(n, e) {
  let file_paths = normalizeArtifactInput("publish_files", n).input.file_paths;
  return (
    Array.isArray(file_paths) &&
    file_paths.every((r) => typeof r === "string" && readWouldBeAutoAllowedForPath(r, e))
  );
}
//@ chunk-p5cstt88.js:16913-17176 placement
function artifactsMcpUnavailableReason(n) {
  return (
    (n !== "laptop" || getArtifactPublishStubDir() === null
      ? policyDeniedReason("allow_cobalt_plinth", "Artifacts", "are")
      : null) ??
    (isArtifactToolEnabled()
      ? null
      : `The Artifact tool isn't available in this session, so the Artifacts MCP tools aren't available either.${n === "laptop" ? " Check /login and /config." : ""}`)
  );
}
/**
 * artifact 工具权限检查（参数拼写、规则、分类器）。
 */
//@ chunk-p5cstt88.js:17176-18899 placement
function checkArtifactPermission(n, e, s, r, a, l = !1) {
  let u = artifactsMcpUnavailableReason(n);
  if (u !== null) return { behavior: "deny", message: u, decisionReason: { type: "other", reason: u } };
  let g = findMisspelledArgName(r);
  if (g !== void 0) {
    let c = `${s} takes no argument spelled ${refusalEcho(g)}. Spell argument names exactly as the tool lists them.`;
    return { behavior: "deny", message: c, decisionReason: { type: "other", reason: c } };
  }
  let d = b[e];
  if (
    isCoworkFramePublishSession() &&
    consentMustDeny(a) &&
    !l &&
    (d === void 0 || d.action === "publish" || d.target !== void 0) &&
    !(
      (READ_ONLY_ACTIONS.has(d?.action) ? isOwnedTarget(e, r) : ne(e, r)) &&
      isPlainObject(r) &&
      (r.shared_live ?? "") === "" &&
      r.contract === void 0 &&
      d?.source === void 0 &&
      d?.action !== "upload_asset" &&
      d?.action !== "call_endpoint" &&
      d?.action !== "run_script" &&
      !UPLOAD_MCP_TOOLS.has(e) &&
      pendingNoticeReadKind(e, r) === null
    )
  ) {
    let c = `In Cowork ${s} needs the approval card here, and no one can answer it. ${pendingNoticeReadKind(e, r) === null ? "Do not retry this call in this session." : "Tell the user in chat; do not retry it on this turn."}`;
    return {
      behavior: "deny",
      message: c,
      decisionReason: { type: "safetyCheck", reason: c, classifierApprovable: !1 },
    };
  }
  let A = artifactRuleInputs(getToolPermissionContext(a), e, r, "deny");
  if (A !== null)
    return {
      behavior: "deny",
      message: `Permission to use ${s} has been denied: ${denyRulePhrase(A.rule)} covers it.${unreadCallRuleNote(A.why)}`,
      decisionReason: { type: "rule", rule: A.rule },
    };
  if (
    n === "laptop" &&
    e === "publish_files" &&
    getArtifactPublishStubDir() !== null &&
    !allPublishFilesAutoReadable(r, getToolPermissionContext(a))
  ) {
    let c = `A Read rule refuses a file sent to ${s}, so nothing was read.`;
    return { behavior: "deny", message: c, decisionReason: { type: "other", reason: c } };
  }
  let y = b[e]?.action;
  if (planConsentMustDeny(a) && (dbWriteMayAsk(e, r) || !PLAN_SAFE_MCP_TOOLS.has(y) || y === "resolve"))
    return {
      behavior: "deny",
      message: `${s} doesn't run in plan mode in this session, where no one can answer a prompt. Keep planning, and make this call once the plan is approved.`,
      decisionReason: {
        type: "safetyCheck",
        reason: "Plan mode with no one to ask runs no Artifacts call that names an artifact",
        classifierApprovable: !1,
      },
    };
  return;
}
//@ chunk-p5cstt88.js:18899-19130 placement
function unknownMcpToolAsk(n) {
  let e = `Claude Code doesn't know what ${n} does yet, so each call needs your approval.`;
  return {
    behavior: "ask",
    message: e,
    suppressAlwaysAllowRule: !0,
    decisionReason: { type: "safetyCheck", reason: e, classifierApprovable: !1 },
  };
}
/**
 * 数据库写入触发询问的原因。
 */
//@ chunk-p5cstt88.js:19130-19800 placement
function artifactDbAskReason(n, e, s) {
  let r = n.mcpInfo?.toolName,
    a = getToolPermissionContext(s);
  if (
    r === void 0 ||
    a.mode === "plan" ||
    isAutoAllowedInMode(n, a) === "bypassPermissions" ||
    !dbWriteMayAsk(r, e)
  )
    return;
  let l = pendingNoticeReadKind(r, e),
    u = l === null ? null : targetFromSlugArg(e),
    g =
      u === null
        ? null
        : `the database of ${artifactViewerUrlFor(u)} \u2014 prompted by the new-comments notification; rows there are written by artifact viewers`,
    d =
      g !== null && l === "rows"
        ? `Claude wants to read ${g}.`
        : g !== null && l === "edit"
          ? `Claude wants to edit a document in ${g}, so only a person can approve this edit.`
          : `Each call of the Artifacts tool ${r} like this one is approved by itself.`;
  return {
    behavior: "ask",
    message: d,
    suppressAlwaysAllowRule: !0,
    decisionReason: { type: "safetyCheck", reason: d, classifierApprovable: l !== "edit" },
  };
}
/**
 * laptop 端的 publish_version 是否属于"例行、仅自己可见的首次发布"：无 slug/共享/合约、非子代理、无人判断的例行运行、新 Artifact 默认私有、且没有针对这些工具的 ask/deny 规则。
 */
//@ chunk-p5cstt88.js:19800-20083 placement
function isRoutinePrivateFirstPublish(n, e, s, r) {
  return (
    n === "laptop" &&
    e === "publish_version" &&
    isPlainObject(s) &&
    (s.slug ?? "") === "" &&
    (s.shared_live ?? "") === "" &&
    s.contract === void 0 &&
    r.agentId === void 0 &&
    NRn() &&
    routineRunNobodyJudges(r) &&
    newArtifactIsPersonsPrivate() &&
    ![...getAskRules(getToolPermissionContext(r)), ...getDenyRules(getToolPermissionContext(r))].some(
      (a) =>
        toolMatchesRule(getToolPermissionContext(r), T, a) ||
        Object.values(i_t).includes(a.ruleValue.toolName),
    )
  );
}
//@ chunk-p5cstt88.js:20083-20235 placement
function askRuleCoversMessage(n, e) {
  return `The ${refusalEcho(formatPermissionRule(n.rule.ruleValue))} ask rule from ${getSettingSourceDisplayNameLowercase(n.rule.source)} covers ${e}, so this call needs your approval.${unreadCallRuleNote(n.why)}`;
}
//@ chunk-p5cstt88.js:20235-20340 placement
function targetFromSlugArg(n) {
  let e = isPlainObject(n) && typeof n.slug === "string" ? normalizeArtifactSlug(n.slug) : null;
  return e === null ? null : { slug: e, env: claudeAiEnvironment() };
}
//@ chunk-p5cstt88.js:20340-20398 placement
function L(n) {
  let e = targetFromSlugArg(n);
  return e === null ? anyAutoReactNoticePending() : hasAutoReactNoticePending(e.slug);
}
//@ chunk-p5cstt88.js:20398-20447 placement
function de(n) {
  return L(n) ? personOnlyRegistry.loaded() : personOnlyRegistry.read;
}
/**
 * 读取评论需要先批准时的拒绝说明。
 */
//@ chunk-p5cstt88.js:20447-20858 placement
var COMMENTS_READ_REFUSALS =
    "Nothing was read: while a new-comments notification is pending, reading an artifact's comments needs the user's approval first,",
  j = `${COMMENTS_READ_REFUSALS} and Claude Code couldn't tell which artifact this call names. Pass the artifact's full id (a UUID) or its link.`,
  Ze = new Set(["upload_asset", "copy_from", "pin", "write_db", "call_endpoint", "run_script"]),
  Ce = new Set([void 0, null, "", "users", "org", "others", "agent_scoped"]);
//@ chunk-p5cstt88.js:20858-21006 placement
function pendingNoticeReadKind(n, e) {
  let { action: action, readsBack: readsBack } = b[n] ?? {},
    a = readsBack === !0 ? "edit" : action === "read_db" ? "rows" : action === "comments" ? "comments" : null;
  return a !== null && L(e) ? a : null;
}
//@ chunk-p5cstt88.js:21006-21189 placement
function dbWriteMayAsk(n, e) {
  return (
    Ze.has(b[n]?.action) ||
    n === "declare_capabilities" ||
    b[n]?.source !== void 0 ||
    (b[n]?.action === "publish" && isCoworkFramePublishSession() && !ne(n, e)) ||
    !isPlainObject(e) ||
    !Ce.has(e.shared_live) ||
    pendingNoticeReadKind(n, e) !== null
  );
}
//@ chunk-p5cstt88.js:21189-21403 placement
var SHARED_AUDIENCE_MODES = new Set(["users", "org", "others", "agent_scoped", "public"]),
  UNRECOGNIZED_ADDRESS = "(unrecognized address)",
  ANYONE_MAY_VIEW_NOTE =
    ", anyone may be a viewer, not only the user's colleagues: internal code and infrastructure detail count as sensitive";
//@ chunk-p5cstt88.js:21403-21539 placement
function isSessionWrittenArtifact(n) {
  let e = typeof n === "string" ? normalizeArtifactSlug(n) : null,
    s = e === null ? void 0 : getLiveState().ownCreatedSlugs.get(e);
  return s?.wrotePage === !0 && s.env === claudeAiEnvironment();
}
//@ chunk-p5cstt88.js:21539-21757 placement
function noticeRequestedTag(n) {
  return n === null
    ? ""
    : ` [requested after a new-comments notification${n === "rows" ? ": rows are written by artifact viewers" : n === "comments" ? ": the comment text it ingests is written by artifact viewers" : ""}]`;
}
/**
 * 检查 artifact 读取（共享、未读评论）。
 */
//@ chunk-p5cstt88.js:21757-22880 placement
function checkArtifactRead(n, e, s, r) {
  let { input: input, unread: unread, copies: copies } = normalizeArtifactInput(n, e),
    g = isCreateAction(n, e),
    d = !g && (typeof input.url === "string" || unread),
    A = d ? classifierOwnershipMarks(input.url) : "",
    y = noticeRequestedTag(pendingNoticeReadKind(n, e)),
    c = r.statesAudience && isPlainObject(e) ? e.shared_live : void 0,
    w = c === void 0 || c === null || c === "",
    h = (g || d) && !r.readOnly && w && artifactsMcpInCloudSession(),
    m =
      c !== void 0 && c !== null && c !== ""
        ? SHARED_AUDIENCE_MODES.has(c)
          ? String(c)
          : "unknown"
        : d && !r.statesAudience && !r.readOnly
          ? "unknown"
          : h
            ? "agent_scoped"
            : void 0,
    o =
      m === void 0
        ? ""
        : ` [${c === void 0 && !h ? "shared" : "shared-live"}: ${m}${c === void 0 && !h ? "" : m === "agent_scoped" || !Ce.has(m) ? ANYONE_MAY_VIEW_NOTE : ""}]`,
    { shared_live: shared_live, ...p } = isPlainObject(e) ? e : {},
    f = s(r.statesAudience && SHARED_AUDIENCE_MODES.has(shared_live) ? p : e),
    R =
      typeof input.from_url === "string" || copies === !0
        ? ` [copies from: ${classifierArtifactTargetFor(input.from_url, UNRECOGNIZED_ADDRESS)}]${classifierOwnershipMarks(input.from_url).replace("[ownership:", "[copy source:").replace("[artifact created", "[copy source: created")}`
        : "",
    E = g
      ? ` \u2192 a new ${m === void 0 ? "private " : ""}artifact${n === "create_from_type" ? ` from the Artifact type ${classifierArtifactTargetFor(input.type_url, UNRECOGNIZED_ADDRESS)}` : ""}`
      : d
        ? ` \u2192 ${classifierArtifactTargetFor(input.url, UNRECOGNIZED_ADDRESS)}`
        : "";
  return `${ARTIFACT_TOOL_NAME} ${typeof input.action === "string" ? input.action : "tool"}${r.readOnly ? " [read-only]" : ""}${A}${o}${y}${R}${E}, as Claude wrote it: ${foldClassifierCodePhrases(sweepProvenanceMarker(normalizeNfkc(typeof f === "string" ? f : jsonStringify(f)).replace(Nxe, "?")).replace(DECISION_SURFACE_BRACKETS_RE, " "))}`;
}
//@ chunk-p5cstt88.js:22880-23045 placement
function createArtifactNotice(n, e) {
  let s = isPlainObject(e) ? e.slug : void 0,
    r = typeof s === "string" ? normalizeArtifactSlug(s) : null;
  return n === "create_from_type" || (F3o.has(n) && (r === null || getLiveState().reservedMints.has(r)))
    ? getArtifactCreateNotice()
    : null;
}
//@ chunk-p5cstt88.js:23045-23279 placement
function createArtifactAsk(n, e, s) {
  let r = createArtifactNotice(n, e);
  if (r === null) return;
  let a = `Claude wants to create a new artifact on claude.ai. ${r}`;
  return (
    personOnlyDecisionFor(s) ?? {
      behavior: "ask",
      message: a,
      ...PERSON_ONLY_DECISION,
      decisionReason: { type: "safetyCheck", reason: a, classifierApprovable: !1 },
    }
  );
}
//@ chunk-p5cstt88.js:23279-23391 placement
function mcpTargetSlug(n, e) {
  let s = b[n]?.target,
    r = stripTrailingInvoke(e),
    a = s !== void 0 && isPlainObject(r) ? r[s] : void 0;
  return typeof a === "string" ? normalizeArtifactSlug(a) : null;
}
//@ chunk-p5cstt88.js:23391-23595 placement
function ownPersonPublishedTarget(n, e) {
  let s = b[n]?.target,
    r = s !== void 0 && isPlainObject(e) ? e[s] : void 0,
    a = typeof r === "string" ? normalizeArtifactSlug(r) : null,
    l = a === null ? void 0 : getLiveState().ownPublishedSlugs.get(a);
  return a !== null && l?.byPerson === !0 ? { slug: a, env: l.env } : null;
}
//@ chunk-p5cstt88.js:23595-23737 placement
function isOwnedTarget(n, e) {
  let s = ownPersonPublishedTarget(n, e);
  if (s !== null && getArtifactPublishStubDir() !== null) return !0;
  let r = s === null ? void 0 : getShareEntry(s.slug);
  return r?.mode === "owner" && r.probeFailed !== !0;
}
//@ chunk-p5cstt88.js:23737-23806 placement
function ne(n, e) {
  let s = ownPersonPublishedTarget(n, e);
  return s !== null && isOwnedTarget(n, e) && !hasOtherCommentPending(s.slug);
}
//@ chunk-p5cstt88.js:23806-23974 placement
var PLAN_SAFE_MCP_TOOLS = new Set([
    "list",
    "list_types",
    "describe_type",
    "resolve",
    "unpin",
    "unwatch",
    void 0,
  ]),
  WRITE_MCP_TOOLS = new Set(["publish_version", "edit_version", "publish_files", "reply_comment"]);
/**
 * 为 artifacts MCP 工具（runner/laptop）安装权限与调用包装。
 */
//@ chunk-p5cstt88.js:23974-30311 placement
function applyArtifactRules(n, e) {
  let s = isRunnerDynamicServer(n)
    ? "runner"
    : ARTIFACT_ACTION_TARGETS()?.isArtifactsMcpLaptopEntry(n) === !0
      ? "laptop"
      : null;
  if (s === null || e.mcpInfo === void 0) return;
  if (s === "runner") {
    e.mcpInfo = { ...e.mcpInfo, standsInForBuiltIn: !0 };
    let o = e.call;
    e.call = async (...i) => {
      let p = USn();
      try {
        return await o.apply(e, i);
      } catch (error) {
        if (isArtifactForbiddenError(error)) getLiveState().mcpEntryRowNotServed = p ?? null;
        throw error;
      }
    };
  }
  let toolName = e.mcpInfo.toolName;
  if (!Object.hasOwn(b, toolName))
    ((e.requiresUserInteraction = () => !0), (e.suppressesAlwaysAllowRule = () => !0));
  let suppressesAlwaysAllowRule = e.suppressesAlwaysAllowRule;
  e.suppressesAlwaysAllowRule = (o, i) =>
    dbWriteMayAsk(toolName, o) ||
    createArtifactNotice(toolName, o) !== null ||
    suppressesAlwaysAllowRule?.call(e, o, i) === !0;
  let ignoresWholeToolAllowRule = e.ignoresWholeToolAllowRule;
  e.ignoresWholeToolAllowRule = (o) =>
    dbWriteMayAsk(toolName, o) ||
    createArtifactNotice(toolName, o) !== null ||
    ignoresWholeToolAllowRule?.call(e, o) === !0;
  let u = `the Artifacts tool ${toolName}`,
    {
      checkPermissions: checkPermissions,
      permissionCheckFailureDecision: permissionCheckFailureDecision,
      toAutoClassifierInput: toAutoClassifierInput,
    } = e;
  e.toAutoClassifierInput = (o) => {
    try {
      let i = isPlainObject(o) ? { ...o } : {};
      return checkArtifactRead(toolName, i, (p) => toAutoClassifierInput.call(e, isPlainObject(p) ? p : {}), {
        statesAudience: e.inputJSONSchema?.properties?.shared_live !== void 0,
        readOnly: e.isReadOnly(i),
      });
    } catch {
      return (
        logForDebugging(`[artifacts-mcp] the classifier's line for ${toolName} could not be built`, {
          level: "warn",
        }),
        `${ARTIFACT_TOOL_NAME} ${b[toolName]?.action ?? "tool"}${ownershipClassifierMark({ role: void 0 })} [shared: unknown]${noticeRequestedTag(pendingNoticeReadKind(toolName, {}))} \u2192 ${UNRECOGNIZED_ADDRESS}, as Claude wrote it: (unreadable arguments)`
      );
    }
  };
  let y = new Set(),
    c = new Set(),
    w = new Map();
  ((e.hookMatcherFamilyNames = (o) => {
    let i = dataToolEquivalent(T, normalizeArtifactInput(toolName, o).input);
    if (!Object.hasOwn(b, toolName)) return [ARTIFACT_TOOL_NAME, ...Object.values(i_t)];
    return i === void 0
      ? [ARTIFACT_TOOL_NAME]
      : isArtifactToolsetSplit()
        ? [ARTIFACT_TOOL_NAME, i.tool.name]
        : [i.tool.name, ARTIFACT_TOOL_NAME];
  }),
    (e.checkPermissions = async (o, i) => {
      let p = s === "laptop" ? ownPersonPublishedTarget(toolName, o) : null;
      if (
        p !== null &&
        getArtifactPublishStubDir() === null &&
        artifactsMcpUnavailableReason(s) === null &&
        findMisspelledArgName(o) === void 0 &&
        artifactRuleInputs(getToolPermissionContext(i), toolName, o, "deny") === null
      )
        await warmShareEntry(p, i, "artifacts-mcp-published");
      let f = checkArtifactPermission(s, toolName, u, o, i, isRoutinePrivateFirstPublish(s, toolName, o, i));
      if (f !== void 0) return f;
      if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
        let P = targetFromSlugArg(o);
        if (P === null && L(o))
          return { behavior: "deny", message: j, decisionReason: { type: "other", reason: j } };
        let Y =
          P === null
            ? null
            : await de(o)?.decide(i, P, {
                replyGrant: null,
                threadId: () => (isPlainObject(o) && typeof o.thread === "string" ? o.thread : void 0),
                lateDeny: () => checkArtifactPermission(s, toolName, u, o, i) ?? null,
                askRule: (re) => artifactRuleInputs(re, toolName, o, "ask")?.rule ?? getAskRuleForTool(re, e),
                updatedInput: () => {
                  return;
                },
              });
        if (Y !== null && Y !== void 0) return Y;
      }
      let R = Object.hasOwn(b, toolName) ? await checkPermissions.call(e, o, i) : unknownMcpToolAsk(u),
        E = checkArtifactPermission(s, toolName, u, o, i, isRoutinePrivateFirstPublish(s, toolName, o, i));
      if (E !== void 0) return E;
      let k = artifactRuleInputs(getToolPermissionContext(i), toolName, o, "ask"),
        C = await applyAskRuleOverride(R, k?.rule ?? null, async () =>
          k === null ? "" : askRuleCoversMessage(k, u),
        ),
        S = C.behavior === "deny" ? void 0 : createArtifactAsk(toolName, o, i);
      if (S !== void 0) {
        if (S.behavior === "ask" && i.toolUseId !== void 0) _e(y, i.toolUseId);
        return S;
      }
      if (k !== null && C.behavior === "ask") return { ...C, suppressAlwaysAllowRule: !0 };
      if (C.behavior !== "passthrough") return C;
      let O = getToolPermissionContext(i);
      if (O.mode === "plan") return C;
      if (isRoutinePrivateFirstPublish(s, toolName, o, i)) {
        if (i.toolUseId === void 0) getLiveState().routineRunTainted = !0;
        else c.add(i.toolUseId);
        return {
          behavior: "allow",
          updatedInput: o,
          decisionReason: { type: "other", reason: "A scheduled task's new artifact, private to the person" },
        };
      }
      let I = checkArtifactPermission(s, toolName, u, o, i);
      if (I !== void 0) return I;
      let V =
          toolName !== ARTIFACTS_MCP_REPLY_COMMENT_TOOL && WRITE_MCP_TOOLS.has(toolName)
            ? mcpTargetSlug(toolName, o)
            : null,
        G = V === null ? void 0 : otherCommentPendingSeq(V);
      if (
        V !== null &&
        G !== void 0 &&
        i.toolUseId !== void 0 &&
        consentAskCanReachUser(i) &&
        !isAutoClassifierActive(O.mode) &&
        !isDelegatedObservationContext(i.agentContext)
      ) {
        w.set(i.toolUseId, { slug: V, seq: G });
        let P = `A comment that may not be the person's own is pending on this artifact, so ${u} needs their answer.`;
        return {
          behavior: "ask",
          message: P,
          suppressAlwaysAllowRule: !0,
          decisionReason: { type: "safetyCheck", reason: P, classifierApprovable: !1 },
        };
      }
      let te = artifactDbAskReason(e, o, i);
      if (te !== void 0) return te;
      if (!Object.hasOwn(b, toolName) || dbWriteMayAsk(toolName, o)) return C;
      if (
        s === "laptop" &&
        (toolName === "publish_version" || toolName === "edit_version") &&
        ne(toolName, o) &&
        isPlainObject(o) &&
        (o.shared_live ?? "") === "" &&
        o.contract === void 0 &&
        !isDelegatedObservationContext(i.agentContext) &&
        isStrictHumanTurn(i.messages)
      )
        return {
          behavior: "allow",
          updatedInput: o,
          decisionReason: { type: "other", reason: "Redeploy of an artifact already published this session" },
        };
      let Te = b[toolName]?.action;
      if (PLAN_SAFE_MCP_TOOLS.has(Te))
        return {
          behavior: "allow",
          updatedInput: o,
          decisionReason: {
            type: "other",
            reason: `The ${ARTIFACT_TOOL_NAME} tool asks nobody about this action`,
          },
        };
      let se =
        WRITE_MCP_TOOLS.has(toolName) &&
        isPlainObject(o) &&
        (o.shared_live ?? "") === "" &&
        G === void 0 &&
        !isAutoClassifierActive(O.mode) &&
        (O.modeBeforeRewrite === void 0 || !isAutoClassifierActive(O.modeBeforeRewrite))
          ? toolAlwaysAllowedRule(O, T)
          : null;
      return se === null
        ? C
        : { behavior: "allow", updatedInput: o, decisionReason: { type: "rule", rule: se } };
    }),
    (e.permissionCheckFailureDecision = (o, i) => {
      let p = checkArtifactPermission(s, toolName, u, o, i);
      if (p !== void 0) return p;
      if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL && L(o)) {
        let k = `${COMMENTS_READ_REFUSALS} and the permission check for this call couldn't finish. Try once more; if it fails again, tell the user the comments couldn't be read.`;
        return { behavior: "deny", message: k, decisionReason: { type: "other", reason: k } };
      }
      let f = Object.hasOwn(b, toolName)
          ? (permissionCheckFailureDecision?.call(e, o, i) ?? artifactDbAskReason(e, o, i))
          : unknownMcpToolAsk(u),
        R = f?.behavior === "deny" ? void 0 : createArtifactAsk(toolName, o, i);
      if (R !== void 0) {
        if (R.behavior === "ask" && i.toolUseId !== void 0) _e(y, i.toolUseId);
        return R;
      }
      let E = artifactRuleInputs(getToolPermissionContext(i), toolName, o, "ask");
      if (E === null || f?.behavior === "deny") return f;
      return f?.behavior === "ask"
        ? { ...f, matchedAskRule: f.matchedAskRule ?? E.rule }
        : {
            behavior: "ask",
            message: `${askRuleCoversMessage(E, u)} This tool's permission check couldn't finish, so approving covers this call only.`,
            suppressAlwaysAllowRule: !0,
            decisionReason: { type: "rule", rule: E.rule },
          };
    }));
  let h = e.call;
  e.call = async (o, i, p, f, R, E) => {
    let k = i.toolUseId !== void 0 && c.delete(i.toolUseId),
      C = i.toolUseId === void 0 ? void 0 : w.get(i.toolUseId);
    if (i.toolUseId !== void 0) w.delete(i.toolUseId);
    try {
      let S = await h.call(e, o, i, p, f, R, markFrameCreateConfirmed(E, i, y));
      if (
        C !== void 0 &&
        consentAskCanReachUser(i) &&
        !isAutoClassifierActive(getToolPermissionContext(i).mode)
      )
        settleOtherCommentPending(C.slug, C.seq);
      if (k) {
        let { read: read, shared: shared } = shareFieldsFromResult(S.data);
        recordUnaskedRoutineFirstPublish(
          publishedArtifactFromResult(S.data)?.slug,
          read === void 0 ? "unknown_outcome" : read === "" ? "empty" : deriveShareStatus(read, shared).mode,
        );
      }
      return S;
    } catch (error) {
      if (k) recordUnaskedRoutineFirstPublish(void 0, "unknown_outcome");
      throw error;
    }
  };
  let m = b[toolName]?.action;
  if (m === "delete_asset" || m === "delete") {
    let {
      checkPermissions: checkPermissions,
      permissionCheckFailureDecision: permissionCheckFailureDecision,
    } = e;
    ((e.checkPermissions = async (p, f) => askDefaultsToNo(e, await checkPermissions.call(e, p, f))),
      (e.permissionCheckFailureDecision = (p, f) => {
        let R = askDefaultsToNo(
          e,
          permissionCheckFailureDecision?.call(e, p, f) ?? {
            behavior: "passthrough",
            message: `The permission check for ${u} couldn't finish.`,
            checkIncomplete: !0,
          },
        );
        return R.behavior === "passthrough" ? void 0 : R;
      }));
  }
  if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
    let o = e.call;
    e.call = async (i, p, ...f) => {
      let R = targetFromSlugArg(i);
      if (R === null && L(i)) throw new ArtifactInputError(j, "mcp_comments_slug_unread");
      let E = R === null ? void 0 : de(i)?.consume(p, R.slug);
      if (E?.noticeStood === !0 && !E.judged)
        throw new ArtifactInputError(
          `${COMMENTS_READ_REFUSALS} and this call's permission check did not ask for it. Call read_comments again for this artifact so the user can be asked.`,
          "mcp_comments_notice_unchecked",
        );
      let k = s === "laptop" ? await ownAccountUuid(p.credentials) : null,
        C = await o.call(e, i, p, ...f),
        S = mcpTargetSlug(toolName, i);
      if (S !== null && !isDelegatedObservationContext(p.agentContext)) {
        let O =
            k === null
              ? { account: void 0, tokens: ownPrincipalTokens() }
              : await ownAccountUuid(p.credentials),
          I = commentsFromResult(C.data, O, k === null || (k.account !== void 0 && k.account === O.account));
        if (I === null) recordUnaccountedComments(S, "fromRead");
        else recordJudgedComments(S, I);
      }
      return C;
    };
  }
}
//@ chunk-p5cstt88.js:30311-30591 placement
function askDefaultsToNo(n, e) {
  if (e.behavior === "ask") return { ...e, defaultToNo: !0 };
  if (e.behavior !== "passthrough" || n.mcpInfo?.effectiveMaxPermission !== "ask") return e;
  return {
    behavior: "ask",
    message: e.message,
    suppressAlwaysAllowRule: !0,
    defaultToNo: !0,
    ...(e.checkIncomplete === !0 && { checkIncomplete: !0 }),
  };
}
//@ chunk-p5cstt88.js:30591-30601 placement
var en = 64;
//@ chunk-p5cstt88.js:30601-30694 placement
function _e(n, e) {
  n.add(e);
  let s = n.values().next().value;
  if (n.size > en && s !== void 0) n.delete(s);
}
//@ chunk-p5cstt88.js:30694-30822 placement
function markFrameCreateConfirmed(n, e, s) {
  return e.toolUseId !== void 0 && s.delete(e.toolUseId) && isUserDecidedToolUse(e)
    ? { ...n, mcpCallMeta: { ...n?.mcpCallMeta, [ANTHROPIC_FRAMECREATECONFIRMED]: !0 } }
    : n;
}
//@ chunk-p5cstt88.js:30822-30952 placement
function classifierOwnershipMarks(n) {
  let e = typeof n === "string" ? normalizeArtifactSlug(n) : null,
    s = e === null ? void 0 : getShareEntry(e);
  return `${isSessionWrittenArtifact(n) ? SESSION_CREATED_CLASSIFIER_MARK : ownershipClassifierMark(isSomeoneElses(s) ? s : { role: void 0 })}${otherOrgClassifierMark(s)}`;
}
/**
 * 判断错误是否是 Artifact 服务返回的 403 禁止访问错误。
 */
//@ chunk-7zr1t9gr.js:360-667 placement
function isArtifactForbiddenError(t) {
  if (!(t instanceof Error)) return !1;
  let trimEnd = t.message.trimEnd();
  if (trimEnd === `Streamable HTTP error: ${n}`) return "code" in t && t.code === 403;
  if (trimEnd !== n) return !1;
  return "status" in t
    ? t.status === 403
    : "telemetryMessage" in t &&
        typeof t.telemetryMessage === "string" &&
        t.telemetryMessage.startsWith("SdkHttpError ");
}
