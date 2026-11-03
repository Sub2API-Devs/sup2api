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
import {
  regExp_2 as regExp_2_2,
  regExp as regExp_4,
  DB_SCOPES,
} from "../../services/artifacts/artifactDb.js";
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
import {
  readUntrustedArray,
  UNREADABLE_ARRAY,
  readUntrustedArrayOrUndefined,
} from "../../utils/untrustedArray.js";
import {
  findUrlContentRule,
  matchArtifactRuleOrEquivalent,
  artifactDataRule,
  ARTIFACT_ACTION_TOOL_NAMES,
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
import { isHostOriginHonored } from "../../utils/messageProvenance.js";
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
  PUBLISH_ACTION_NAMES,
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
import { INVISIBLE_FORMAT_CHARS_RE } from "../../utils/messages/forwardedTurnSanitize.js";
import { isRunnerDynamicServer } from "../../services/analytics/metadata.js";
import { artifactsMcpClient, MCP_SERVER_NOT_ALLOWED_MESSAGE } from "../../services/mcp/client.js";
import { logForDebugging } from "../../utils/debug.js";
import { warmShareEntry } from "../../services/artifacts/shareEntryWarm.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { ownAccountUuid, ownPrincipalTokens } from "../../services/artifacts/comments/commentAuthorship.js";
import { ANTHROPIC_FRAMECREATECONFIRMED } from "../../services/artifacts/frameApi.js";

//@ chunk-p5cstt88.js:6973-7175 placement
var DATA_RULE_FIELDS = new Set(["db_op", "collection", "doc_id", "query", "data", "writes", "as_level"]);
var ENDPOINT_RULE_FIELDS = new Set(["method", "path", "body", "body_file", "mode", "script"]);
var DATA_RULE_ACTIONS = ["read_db", "write_db", "call_endpoint", "run_script"];
//@ chunk-p5cstt88.js:7175-7391 placement
function findDataContentRule(n, e) {
  for (let [s, r] of getContentRulesMapForToolName(n, ARTIFACT_TOOL_NAME, e)) {
    let index = s.indexOf(":");
    let l = index <= 0 ? "" : s.slice(index + 1).trim();
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
//@ chunk-p5cstt88.js:7391-10137 placement
/**
 * artifact MCP 动作到目标字段的映射表。
 */
var ARTIFACT_ACTION_TARGETS = () => require("./chunk-d5fbj7hf.js");
var artifactRuleToolRef = {
  name: ARTIFACT_TOOL_NAME,
  mcpInfo: undefined,
  ruleContentField: undefined,
};
var ARTIFACT_ACTION_TARGETS_MAP = {
  publish_version: {
    action: "publish",
    target: "slug",
  },
  edit_version: {
    action: "publish",
    target: "slug",
  },
  publish_files: {
    action: "publish",
    target: "slug",
  },
  copy_file: {
    action: "publish",
    target: "slug",
    source: "from_slug",
  },
  create_from_type: {
    action: "publish",
    type: "slug",
  },
  declare_capabilities: {
    action: "publish",
    target: "slug",
  },
  get_artifact: {
    action: "read",
    target: "slug",
  },
  read_artifact: {
    action: "read",
    target: "slug",
  },
  read_shared_artifact: {
    action: "read",
    target: "slug",
  },
  list_artifacts: {
    action: "list",
  },
  list_types: {
    action: "list_types",
  },
  describe_type: {
    action: "describe_type",
    type: "slug",
  },
  guide: {},
  pin_artifact: {
    action: "pin",
    target: "slug",
  },
  unpin_artifact: {
    action: "unpin",
    target: "slug",
  },
  read_comments: {
    action: "comments",
    target: "slug",
  },
  reply_comment: {
    action: "reply",
    target: "slug",
  },
  reply_shared_comment: {
    action: "reply",
    target: "slug",
  },
  resolve_comment: {
    action: "resolve",
    target: "slug",
  },
  watch: {
    action: "watch",
    target: "slug",
  },
  unwatch: {
    action: "unwatch",
    target: "slug",
  },
  upload_asset: {
    action: "upload_asset",
    target: "slug",
  },
  list_assets: {
    action: "list_assets",
    target: "slug",
  },
  read_asset: {
    action: "read_asset",
    target: "slug",
  },
  copy_asset: {
    action: "copy_from",
    target: "slug",
    source: "from",
  },
  delete_asset: {
    action: "delete_asset",
    target: "slug",
  },
  list_files: {
    action: "list_files",
    target: "slug",
  },
  read_file: {
    action: "read_file",
    target: "slug",
  },
  read_declaration: {
    action: "read",
    target: "slug",
  },
  describe_capabilities: {},
  authorize_upload: {
    action: "publish",
    target: "slug",
  },
  delete_artifact: {
    action: "delete",
    target: "slug",
  },
  db_write: {
    action: "write_db",
    target: "slug",
  },
  db_get: {
    action: "read_db",
    target: "slug",
  },
  db_list: {
    action: "read_db",
    target: "slug",
  },
  db_query: {
    action: "read_db",
    target: "slug",
  },
  db_usage: {
    action: "read_db",
    target: "slug",
  },
  db_whoami: {
    action: "read_db",
    target: "slug",
  },
  db_profiles: {
    action: "read_db",
    target: "slug",
  },
  db_rules_get: {
    action: "read_db",
    target: "slug",
  },
  db_str_replace: {
    action: "write_db",
    target: "slug",
    readsBack: true,
  },
  ...{},
};
var DB_OP_NAMES = {
  db_get: "get",
  db_list: "list",
  db_query: "query",
  db_profiles: "profiles",
  db_str_replace: "str_replace",
};
var SHARED_SCOPE_FIELDS = new Set(["slug", "shared_live", "owned_by", "asLevel"]);
var DB_OP_ARG_SPECS = {
  db_get: {
    names: "document",
    takes: new Set(["path"]),
  },
  db_list: {
    names: "collection",
    takes: new Set(["collection", "limit", "cursor"]),
  },
  db_query: {
    names: "collection",
    takes: new Set(["collection", "where", "orderBy", "limit", "cursor"]),
  },
  db_write: {
    names: "operations",
    takes: new Set(["ops", "idempotencyKey"]),
  },
  db_str_replace: {
    names: "document",
    takes: new Set(["path", "field", "old_str", "new_str", "replace_all", "ifVersion", "idempotencyKey"]),
  },
  db_profiles: {
    takes: new Set(["ids"]),
  },
  db_usage: {
    takes: new Set(),
  },
  db_whoami: {
    takes: new Set(),
  },
  db_rules_get: {
    takes: new Set(),
  },
};
var DB_BATCH_OP_FIELDS = new Set(["op", "path", "data", "ifVersion"]);
var DB_BATCH_OP_TYPES = new Set(["set", "merge", "update", "delete"]);
//@ chunk-p5cstt88.js:10137-10273 placement
function isArtifactAssetPath(path) {
  if (typeof path !== "string") return false;
  let index = path.lastIndexOf("/");
  return regExp_2_2.test(path.slice(0, Math.max(index, 0))) && regExp_4.test(path.slice(index + 1));
}
//@ chunk-p5cstt88.js:10273-10697 placement
/**
 * artifact URL/UUID 的匹配模式。
 */
var ARTIFACT_URL_PATTERNS = "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}";
var regExp = new RegExp(`^${ARTIFACT_URL_PATTERNS.replaceAll("A-F", "")}$`);
var regExp_2 = new RegExp(
  `^https://(?:preview\\.)?(?:claude\\.ai|claude\\.com|claude-ai\\.staging\\.ant\\.dev)/(?:code/(?:artifact|frame)|artifact)/(?:[A-Za-z0-9_-]*-)?(${ARTIFACT_URL_PATTERNS}|[1-9A-HJ-NP-Za-km-z]{22})(?:[/?#]|$)`,
);
var regExp_3 = new RegExp(
  `^https://(${ARTIFACT_URL_PATTERNS})\\.frame\\.(?:staging\\.)?claudeusercontent\\.com(?:[/?#]|$)`,
);
//@ chunk-p5cstt88.js:10697-10972 placement
/**
 * 把 artifact 地址或 slug 规范成小写 UUID slug：已是 slug 直接返回，否则从 URL 中解析（22 位 base58 解码为 UUID），失败返回 null。
 */
function normalizeArtifactSlug(n) {
  let lower = n.toLowerCase();
  if (regExp.test(lower)) return lower;
  let trimmed = n.trim();
  let r = trimmed.match(/^[^:/?#]+:\/\/[^/?#]*/)?.[0] ?? "";
  let a = r.toLowerCase() + trimmed.slice(r.length);
  let l = a.match(regExp_2)?.[1];
  if (l !== undefined) return l.length === 22 ? decodeBase58Uuid(l) : l.toLowerCase();
  return a.match(regExp_3)?.[1]?.toLowerCase() ?? null;
}
//@ chunk-p5cstt88.js:10972-12919 placement
/**
 * 规范化 artifact 调用输入（目标、来源、拷贝）。
 */
function normalizeArtifactInput(n, e, s) {
  let r = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, n);
  let a = r
    ? ARTIFACT_ACTION_TARGETS_MAP[n]
    : {
        target: "slug",
      };
  let l = isPlainObject(e) ? e : {};
  let u = {};
  let g = !r;
  let d = false;
  let A = false;
  let y = a?.target === undefined ? undefined : l[a.target];
  let c = a?.source === undefined ? undefined : l[a.source];
  for (let [m, o] of [
    ["url", a?.target],
    ["from_url", a?.source],
    ["type_url", a?.type],
  ]) {
    let i = o === undefined ? undefined : l[o];
    if (typeof i !== "string") {
      if (i !== undefined && i !== null) {
        g = true;
        d ||= m === "from_url";
      }
      continue;
    }
    let p = normalizeArtifactSlug(i);
    if (p === null) {
      g = true;
      d ||= m === "from_url";
    } else
      u[m] = artifactViewerUrlFor({
        slug: p,
        env: claudeAiEnvironment(),
      });
  }
  if (a?.action !== undefined) u.action = a.action;
  if (typeof l.title === "string") u.title = l.title;
  let w = a?.action === "read_db" || a?.action === "write_db";
  let untrustedArray = readUntrustedArray(l.ops);
  if (!w && typeof l.path === "string") u.path = l.path;
  if (Array.isArray(l.paths)) u.paths = l.paths;
  if (w) {
    let m = s?.op ?? DB_OP_NAMES[n] ?? (untrustedArray !== undefined ? "batch" : undefined);
    if (m !== undefined) u.db_op = m;
    let o = s?.path ?? (typeof l.path === "string" ? l.path : undefined);
    let i = DB_OP_ARG_SPECS[n];
    A =
      i === undefined ||
      Object.keys(l).some((key) => !SHARED_SCOPE_FIELDS.has(key) && !i.takes.has(key)) ||
      (l.asLevel !== undefined && !DB_SCOPES.some((f) => f === l.asLevel)) ||
      (i.names === "document" && !isArtifactAssetPath(l.path)) ||
      (i.names === "collection" && !(typeof l.collection === "string" && regExp_2_2.test(l.collection))) ||
      (i.names === "operations" &&
        !(
          untrustedArray !== undefined &&
          untrustedArray !== UNREADABLE_ARRAY &&
          untrustedArray.length > 0 &&
          untrustedArray.every(
            (untrusted) =>
              isPlainObject(untrusted) &&
              Object.keys(untrusted).every((key) => DB_BATCH_OP_FIELDS.has(key)) &&
              DB_BATCH_OP_TYPES.has(untrusted.op) &&
              isArtifactAssetPath(untrusted.path),
          )
        ));
    if (typeof l.asLevel === "string") u.as_level = l.asLevel;
    let p = o === undefined ? -1 : o.lastIndexOf("/");
    if (o !== undefined && p > 0) {
      u.collection = o.slice(0, p);
      u.doc_id = o.slice(p + 1);
    } else if (typeof l.collection === "string") u.collection = l.collection;
  }
  if (typeof l.id === "string" && a?.action?.endsWith("_asset")) u.asset_id = l.id;
  if (a?.action === "upload_asset" || n === "publish_files") {
    let flattened = (readUntrustedArrayOrUndefined(l.files) ?? []).flatMap((o) =>
      isPlainObject(o) && typeof o.path === "string" ? [o.path] : [],
    );
    u.file_paths = flattened;
    if (flattened.length === 1) u.file_path = flattened[0];
  }
  return {
    input: u,
    unread: g,
    known: r,
    ...(typeof y === "string" && {
      rawUrl: y,
    }),
    ...(typeof c === "string" && {
      rawSourceUrl: c,
    }),
    ...(d && {
      copies: true,
    }),
    ...(A && {
      dbUnread: true,
    }),
    ...((a?.readsBack === true ||
      l.ifVersion !== undefined ||
      untrustedArray === UNREADABLE_ARRAY ||
      (untrustedArray ?? []).some((m) => isPlainObject(m) && m.ifVersion !== undefined)) && {
      readsBack: true,
    }),
  };
}
//@ chunk-p5cstt88.js:12919-12982 placement
/**
 * 按谓词找第一个匹配项的值。
 */
function findFirstMatch(contentRulesMapForToolName, e) {
  for (let [s, r] of contentRulesMapForToolName) if (e(s)) return r;
  return null;
}
//@ chunk-p5cstt88.js:12982-13098 placement
function findRuleForFields(contentRulesMapForToolName, e) {
  for (let [s, r] of contentRulesMapForToolName) {
    let index = s.indexOf(":");
    if (index > 0 && e.includes(s.slice(0, index).trim())) return r;
  }
  return null;
}
//@ chunk-p5cstt88.js:13098-13250 placement
function withoutNarrowingDenyRules(n) {
  if ((n.alwaysDenyRules.toolsNarrowing?.length ?? 0) === 0) return n;
  let { toolsNarrowing, ...s } = n.alwaysDenyRules;
  return {
    ...n,
    alwaysDenyRules: s,
  };
}
//@ chunk-p5cstt88.js:13250-13296 placement
var PLACEHOLDER_SLUG = "00000000-0000-4000-8000-000000000000";
//@ chunk-p5cstt88.js:13296-14937 placement
/**
 * 用权限规则匹配 artifact 调用。
 */
function matchArtifactRule(n, e, s) {
  let { action, ...a } = e.input;
  let url = e.input.url;
  let u = typeof url === "string" ? normalizeArtifactSlug(url) : null;
  let fromUrl = e.input.from_url;
  let d = typeof fromUrl === "string" ? normalizeArtifactSlug(fromUrl) : null;
  let A =
    (s === "deny"
      ? getDenyRuleForTool(withoutNarrowingDenyRules(n), artifactRuleToolRef)
      : getAskRuleForTool(n, artifactRuleToolRef)) ??
    findUrlContentRule(n, e.input, s) ??
    matchArtifactRuleOrEquivalent(n, artifactRuleToolRef, e.input, s) ??
    matchToolRule(n, artifactRuleToolRef, a, s) ??
    artifactDataRule(s === "deny" ? withoutNarrowingDenyRules(n) : n, artifactRuleToolRef, e.input, s) ??
    ((!e.known || ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(e.input.action)) || e.readsBack === true) &&
    u !== null
      ? webFetchRuleForArtifactRead(
          n,
          {
            slug: u,
            env: claudeAiEnvironment(),
          },
          e.rawUrl ?? url,
          s,
        )
      : null) ??
    (d !== null && typeof fromUrl === "string"
      ? webFetchRuleForArtifactRead(
          n,
          {
            slug: d,
            env: claudeAiEnvironment(),
          },
          e.rawSourceUrl ?? fromUrl,
          s,
        )
      : null);
  if (A !== null)
    return {
      rule: A,
      why: "named",
    };
  if (e.input.action === "run_script" || e.input.action === "call_endpoint") {
    let c =
      findDataContentRule(s === "deny" ? withoutNarrowingDenyRules(n) : n, s) ??
      findRuleForFields(getContentRulesMapForToolName(n, ARTIFACT_ACTION_TOOL_NAMES.data, s), [
        ...DATA_RULE_FIELDS,
        "action",
      ]) ??
      undefined;
    if (c !== undefined)
      return {
        rule: c,
        why: "named",
      };
  }
  let y = collapseArtifactAction(e.input);
  if (isPlainObject(y) && y !== e.input) {
    let { action, ...w } = y;
    let h = matchToolRule(n, artifactRuleToolRef, isArtifactToolsetSplit() ? y : w, s);
    if (h !== null)
      return {
        rule: h,
        why: "named",
      };
  }
  if (e.dbUnread === true)
    for (let c of [ARTIFACT_TOOL_NAME, ARTIFACT_ACTION_TOOL_NAMES.data]) {
      let ruleForFields = findRuleForFields(
        getContentRulesMapForToolName(n, c, s),
        c === ARTIFACT_TOOL_NAME ? [...DATA_RULE_FIELDS] : [...DATA_RULE_FIELDS, "action"],
      );
      if (ruleForFields !== null)
        return {
          rule: ruleForFields,
          why: "unread",
        };
    }
  for (let c of [ARTIFACT_TOOL_NAME, ...Object.values(ARTIFACT_ACTION_TOOL_NAMES)]) {
    let contentRulesMapForToolName = getContentRulesMapForToolName(n, c, s);
    let h = e.unread ? findRuleForFields(contentRulesMapForToolName, ["url", "from_url", "type_url"]) : null;
    if (h !== null)
      return {
        rule: h,
        why: "unread",
      };
    let m = {
      name: c,
      mcpInfo: undefined,
      ruleContentField: undefined,
    };
    let o = e.known
      ? null
      : ([...contentRulesMapForToolName.values()][0] ??
        (c === ARTIFACT_TOOL_NAME
          ? null
          : s === "deny"
            ? getDenyRuleForTool(withoutNarrowingDenyRules(n), m)
            : getAskRuleForTool(n, m)));
    if (o !== null)
      return {
        rule: o,
        why: "unknown",
      };
  }
  if (
    e.unread &&
    (!e.known ||
      ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(e.input.action)) ||
      e.readsBack === true ||
      e.copies === true)
  ) {
    let c = {
      slug: PLACEHOLDER_SLUG,
      env: claudeAiEnvironment(),
    };
    for (let h of [e.rawUrl, e.rawSourceUrl, artifactViewerUrlFor(c)]) {
      let m = h === undefined ? null : webFetchRuleForArtifactRead(n, c, h, s);
      if (m !== null)
        return {
          rule: m,
          why: "unread",
        };
    }
    let firstMatch = findFirstMatch(getContentRulesMapForToolName(n, WEBFETCH, s), (h) =>
      /^domain:(?:.*[.*])?claudeusercontent\.com$/i.test(h.trim()),
    );
    if (firstMatch !== null)
      return {
        rule: firstMatch,
        why: "unread",
      };
  }
  return null;
}
//@ chunk-p5cstt88.js:14937-15249 placement
/**
 * 去掉参数值末尾误带的 </invoke> 标签。
 */
function stripTrailingInvoke(n) {
  let e = n;
  if (isPlainObject(n))
    for (let [key, value] of Object.entries(n)) {
      let a = typeof value === "string" ? value.trimEnd() : "";
      if (!a.toLowerCase().endsWith("</invoke>")) continue;
      let l = a.slice(0, -9).trimEnd();
      if (l.toLowerCase().endsWith(`</${key.toLowerCase()}>`)) l = l.slice(0, -`</${key}>`.length).trimEnd();
      e = {
        ...(isPlainObject(e) ? e : n),
        [key]: l,
      };
    }
  return e;
}
//@ chunk-p5cstt88.js:15249-15801 placement
/**
 * 生成用于规则匹配的输入变体（多文件拆分）。
 */
function artifactRuleInputs(toolPermissionContext, toolName, s, r) {
  let a = stripTrailingInvoke(s);
  let files = isPlainObject(s) && Array.isArray(s.files) && s.files.length > 1 ? s.files : [];
  let mapped = [
    s,
    ...(a === s ? [] : [a]),
    ...files.map((file) => ({
      ...(isPlainObject(s) ? s : {}),
      files: [file],
    })),
  ].map((d) => [d, undefined]);
  let g = !isPlainObject(s)
    ? []
    : toolName === "db_str_replace"
      ? [
          {
            op: "update",
            path: s.path,
          },
        ]
      : toolName === "db_write" && Array.isArray(s.ops)
        ? s.ops.filter(isPlainObject).flatMap((op) =>
            (op.op === "merge" ? ["set", "update"] : [op.op]).map((op_2) => ({
              op: op_2,
              path: op.path,
            })),
          )
        : [];
  for (let [d, A] of [
    ...mapped,
    ...g.flatMap(({ op, path }) =>
      typeof op === "string" && typeof path === "string"
        ? [
            [
              s,
              {
                op,
                path,
              },
            ],
          ]
        : [],
    ),
  ]) {
    let y = matchArtifactRule(toolPermissionContext, normalizeArtifactInput(toolName, d, A), r);
    if (y !== null) return y;
  }
  return null;
}
//@ chunk-p5cstt88.js:15801-15915 placement
function listDataToolNames() {
  let values = Object.values(ARTIFACT_ACTION_TOOL_NAMES);
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
]);
var KNOWN_MCP_ARG_NAMES_UPPER = new Set([...KNOWN_MCP_ARG_NAMES].map((n) => n.toUpperCase()));
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
var UPLOAD_MCP_TOOLS = new Set(["publish_files", "declare_capabilities", "authorize_upload"]);
var READ_ONLY_ACTIONS = new Set([
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
function allPublishFilesAutoReadable(n, toolPermissionContext) {
  let filePaths = normalizeArtifactInput("publish_files", n).input.file_paths;
  return (
    Array.isArray(filePaths) &&
    filePaths.every(
      (filePath) =>
        typeof filePath === "string" && readWouldBeAutoAllowedForPath(filePath, toolPermissionContext),
    )
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
//@ chunk-p5cstt88.js:17176-18899 placement
/**
 * artifact 工具权限检查（参数拼写、规则、分类器）。
 */
function checkArtifactPermission(n, toolName, s, r, a, l = false) {
  let u = artifactsMcpUnavailableReason(n);
  if (u !== null)
    return {
      behavior: "deny",
      message: u,
      decisionReason: {
        type: "other",
        reason: u,
      },
    };
  let misspelledArgName = findMisspelledArgName(r);
  if (misspelledArgName !== undefined) {
    let c = `${s} takes no argument spelled ${refusalEcho(misspelledArgName)}. Spell argument names exactly as the tool lists them.`;
    return {
      behavior: "deny",
      message: c,
      decisionReason: {
        type: "other",
        reason: c,
      },
    };
  }
  let d = ARTIFACT_ACTION_TARGETS_MAP[toolName];
  if (
    isCoworkFramePublishSession() &&
    consentMustDeny(a) &&
    !l &&
    (d === undefined || d.action === "publish" || d.target !== undefined) &&
    !(
      (READ_ONLY_ACTIONS.has(d?.action)
        ? isOwnedTarget(toolName, r)
        : isOwnPersonArtifactWithoutOtherComments(toolName, r)) &&
      isPlainObject(r) &&
      (r.shared_live ?? "") === "" &&
      r.contract === undefined &&
      d?.source === undefined &&
      d?.action !== "upload_asset" &&
      d?.action !== "call_endpoint" &&
      d?.action !== "run_script" &&
      !UPLOAD_MCP_TOOLS.has(toolName) &&
      pendingNoticeReadKind(toolName, r) === null
    )
  ) {
    let c = `In Cowork ${s} needs the approval card here, and no one can answer it. ${pendingNoticeReadKind(toolName, r) === null ? "Do not retry this call in this session." : "Tell the user in chat; do not retry it on this turn."}`;
    return {
      behavior: "deny",
      message: c,
      decisionReason: {
        type: "safetyCheck",
        reason: c,
        classifierApprovable: false,
      },
    };
  }
  let A = artifactRuleInputs(getToolPermissionContext(a), toolName, r, "deny");
  if (A !== null)
    return {
      behavior: "deny",
      message: `Permission to use ${s} has been denied: ${denyRulePhrase(A.rule)} covers it.${unreadCallRuleNote(A.why)}`,
      decisionReason: {
        type: "rule",
        rule: A.rule,
      },
    };
  if (
    n === "laptop" &&
    toolName === "publish_files" &&
    getArtifactPublishStubDir() !== null &&
    !allPublishFilesAutoReadable(r, getToolPermissionContext(a))
  ) {
    let c = `A Read rule refuses a file sent to ${s}, so nothing was read.`;
    return {
      behavior: "deny",
      message: c,
      decisionReason: {
        type: "other",
        reason: c,
      },
    };
  }
  let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
  if (
    planConsentMustDeny(a) &&
    (dbWriteMayAsk(toolName, r) || !PLAN_SAFE_MCP_TOOLS.has(action) || action === "resolve")
  )
    return {
      behavior: "deny",
      message: `${s} doesn't run in plan mode in this session, where no one can answer a prompt. Keep planning, and make this call once the plan is approved.`,
      decisionReason: {
        type: "safetyCheck",
        reason: "Plan mode with no one to ask runs no Artifacts call that names an artifact",
        classifierApprovable: false,
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
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: e,
      classifierApprovable: false,
    },
  };
}
//@ chunk-p5cstt88.js:19130-19800 placement
/**
 * 数据库写入触发询问的原因。
 */
function artifactDbAskReason(n, e, s) {
  let toolName = n.mcpInfo?.toolName;
  let toolPermissionContext = getToolPermissionContext(s);
  if (
    toolName === undefined ||
    toolPermissionContext.mode === "plan" ||
    isAutoAllowedInMode(n, toolPermissionContext) === "bypassPermissions" ||
    !dbWriteMayAsk(toolName, e)
  )
    return;
  let l = pendingNoticeReadKind(toolName, e);
  let u = l === null ? null : targetFromSlugArg(e);
  let g =
    u === null
      ? null
      : `the database of ${artifactViewerUrlFor(u)} \u2014 prompted by the new-comments notification; rows there are written by artifact viewers`;
  let d =
    g !== null && l === "rows"
      ? `Claude wants to read ${g}.`
      : g !== null && l === "edit"
        ? `Claude wants to edit a document in ${g}, so only a person can approve this edit.`
        : `Each call of the Artifacts tool ${toolName} like this one is approved by itself.`;
  return {
    behavior: "ask",
    message: d,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: d,
      classifierApprovable: l !== "edit",
    },
  };
}
//@ chunk-p5cstt88.js:19800-20083 placement
/**
 * laptop 端的 publish_version 是否属于"例行、仅自己可见的首次发布"：无 slug/共享/合约、非子代理、无人判断的例行运行、新 Artifact 默认私有、且没有针对这些工具的 ask/deny 规则。
 */
function isRoutinePrivateFirstPublish(n, toolName, s, r) {
  return (
    n === "laptop" &&
    toolName === "publish_version" &&
    isPlainObject(s) &&
    (s.slug ?? "") === "" &&
    (s.shared_live ?? "") === "" &&
    s.contract === undefined &&
    r.agentId === undefined &&
    isHostOriginHonored() &&
    routineRunNobodyJudges(r) &&
    newArtifactIsPersonsPrivate() &&
    ![...getAskRules(getToolPermissionContext(r)), ...getDenyRules(getToolPermissionContext(r))].some(
      (a) =>
        toolMatchesRule(getToolPermissionContext(r), artifactRuleToolRef, a) ||
        Object.values(ARTIFACT_ACTION_TOOL_NAMES).includes(a.ruleValue.toolName),
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
  return e === null
    ? null
    : {
        slug: e,
        env: claudeAiEnvironment(),
      };
}
//@ chunk-p5cstt88.js:20340-20398 placement
/**
 * 该 artifact（或任意 artifact）是否有待处理的自动反应通知。
 */
function isAutoReactNoticePendingFor(n) {
  let e = targetFromSlugArg(n);
  return e === null ? anyAutoReactNoticePending() : hasAutoReactNoticePending(e.slug);
}
//@ chunk-p5cstt88.js:20398-20447 placement
/**
 * 评论读取的决策入口（有待处理通知时用已载入规则）。
 */
function commentReadDecision(n) {
  return isAutoReactNoticePendingFor(n) ? personOnlyRegistry.loaded() : personOnlyRegistry.read;
}
//@ chunk-p5cstt88.js:20447-20858 placement
/**
 * 读取评论需要先批准时的拒绝说明。
 */
var COMMENTS_READ_REFUSALS =
  "Nothing was read: while a new-comments notification is pending, reading an artifact's comments needs the user's approval first,";
var UNKNOWN_ARTIFACT_COMMENTS_MESSAGE = `${COMMENTS_READ_REFUSALS} and Claude Code couldn't tell which artifact this call names. Pass the artifact's full id (a UUID) or its link.`;
var ASSET_MUTATING_ACTIONS = new Set([
  "upload_asset",
  "copy_from",
  "pin",
  "write_db",
  "call_endpoint",
  "run_script",
]);
var VALID_SHARED_SCOPES = new Set([undefined, null, "", "users", "org", "others", "agent_scoped"]);
//@ chunk-p5cstt88.js:20858-21006 placement
function pendingNoticeReadKind(n, e) {
  let { action, readsBack } = ARTIFACT_ACTION_TARGETS_MAP[n] ?? {};
  let a =
    readsBack === true ? "edit" : action === "read_db" ? "rows" : action === "comments" ? "comments" : null;
  return a !== null && isAutoReactNoticePendingFor(e) ? a : null;
}
//@ chunk-p5cstt88.js:21006-21189 placement
function dbWriteMayAsk(toolName, e) {
  return (
    ASSET_MUTATING_ACTIONS.has(ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action) ||
    toolName === "declare_capabilities" ||
    ARTIFACT_ACTION_TARGETS_MAP[toolName]?.source !== undefined ||
    (ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action === "publish" &&
      isCoworkFramePublishSession() &&
      !isOwnPersonArtifactWithoutOtherComments(toolName, e)) ||
    !isPlainObject(e) ||
    !VALID_SHARED_SCOPES.has(e.shared_live) ||
    pendingNoticeReadKind(toolName, e) !== null
  );
}
//@ chunk-p5cstt88.js:21189-21403 placement
var SHARED_AUDIENCE_MODES = new Set(["users", "org", "others", "agent_scoped", "public"]);
var UNRECOGNIZED_ADDRESS = "(unrecognized address)";
var ANYONE_MAY_VIEW_NOTE =
  ", anyone may be a viewer, not only the user's colleagues: internal code and infrastructure detail count as sensitive";
//@ chunk-p5cstt88.js:21403-21539 placement
function isSessionWrittenArtifact(n) {
  let e = typeof n === "string" ? normalizeArtifactSlug(n) : null;
  let s = e === null ? undefined : getLiveState().ownCreatedSlugs.get(e);
  return s?.wrotePage === true && s.env === claudeAiEnvironment();
}
//@ chunk-p5cstt88.js:21539-21757 placement
function noticeRequestedTag(n) {
  return n === null
    ? ""
    : ` [requested after a new-comments notification${n === "rows" ? ": rows are written by artifact viewers" : n === "comments" ? ": the comment text it ingests is written by artifact viewers" : ""}]`;
}
//@ chunk-p5cstt88.js:21757-22880 placement
/**
 * 检查 artifact 读取（共享、未读评论）。
 */
function checkArtifactRead(toolName, e, s, r) {
  let { input, unread, copies } = normalizeArtifactInput(toolName, e);
  let g = isCreateAction(toolName, e);
  let d = !g && (typeof input.url === "string" || unread);
  let A = d ? classifierOwnershipMarks(input.url) : "";
  let y = noticeRequestedTag(pendingNoticeReadKind(toolName, e));
  let sharedLive = r.statesAudience && isPlainObject(e) ? e.shared_live : undefined;
  let w = sharedLive === undefined || sharedLive === null || sharedLive === "";
  let h = (g || d) && !r.readOnly && w && artifactsMcpInCloudSession();
  let m =
    sharedLive !== undefined && sharedLive !== null && sharedLive !== ""
      ? SHARED_AUDIENCE_MODES.has(sharedLive)
        ? String(sharedLive)
        : "unknown"
      : d && !r.statesAudience && !r.readOnly
        ? "unknown"
        : h
          ? "agent_scoped"
          : undefined;
  let o =
    m === undefined
      ? ""
      : ` [${sharedLive === undefined && !h ? "shared" : "shared-live"}: ${m}${sharedLive === undefined && !h ? "" : m === "agent_scoped" || !VALID_SHARED_SCOPES.has(m) ? ANYONE_MAY_VIEW_NOTE : ""}]`;
  let { shared_live: sharedLive_2, ...p } = isPlainObject(e) ? e : {};
  let f = s(r.statesAudience && SHARED_AUDIENCE_MODES.has(sharedLive_2) ? p : e);
  let R =
    typeof input.from_url === "string" || copies === true
      ? ` [copies from: ${classifierArtifactTargetFor(input.from_url, UNRECOGNIZED_ADDRESS)}]${classifierOwnershipMarks(input.from_url).replace("[ownership:", "[copy source:").replace("[artifact created", "[copy source: created")}`
      : "";
  let E = g
    ? ` \u2192 a new ${m === undefined ? "private " : ""}artifact${toolName === "create_from_type" ? ` from the Artifact type ${classifierArtifactTargetFor(input.type_url, UNRECOGNIZED_ADDRESS)}` : ""}`
    : d
      ? ` \u2192 ${classifierArtifactTargetFor(input.url, UNRECOGNIZED_ADDRESS)}`
      : "";
  return `${ARTIFACT_TOOL_NAME} ${typeof input.action === "string" ? input.action : "tool"}${r.readOnly ? " [read-only]" : ""}${A}${o}${y}${R}${E}, as Claude wrote it: ${foldClassifierCodePhrases(sweepProvenanceMarker(normalizeNfkc(typeof f === "string" ? f : jsonStringify(f)).replace(INVISIBLE_FORMAT_CHARS_RE, "?")).replace(DECISION_SURFACE_BRACKETS_RE, " "))}`;
}
//@ chunk-p5cstt88.js:22880-23045 placement
function createArtifactNotice(toolName, e) {
  let slug = isPlainObject(e) ? e.slug : undefined;
  let r = typeof slug === "string" ? normalizeArtifactSlug(slug) : null;
  return toolName === "create_from_type" ||
    (PUBLISH_ACTION_NAMES.has(toolName) && (r === null || getLiveState().reservedMints.has(r)))
    ? getArtifactCreateNotice()
    : null;
}
//@ chunk-p5cstt88.js:23045-23279 placement
function createArtifactAsk(toolName, e, s) {
  let artifactNotice = createArtifactNotice(toolName, e);
  if (artifactNotice === null) return;
  let a = `Claude wants to create a new artifact on claude.ai. ${artifactNotice}`;
  return (
    personOnlyDecisionFor(s) ?? {
      behavior: "ask",
      message: a,
      ...PERSON_ONLY_DECISION,
      decisionReason: {
        type: "safetyCheck",
        reason: a,
        classifierApprovable: false,
      },
    }
  );
}
//@ chunk-p5cstt88.js:23279-23391 placement
function mcpTargetSlug(toolName, e) {
  let target = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.target;
  let r = stripTrailingInvoke(e);
  let a = target !== undefined && isPlainObject(r) ? r[target] : undefined;
  return typeof a === "string" ? normalizeArtifactSlug(a) : null;
}
//@ chunk-p5cstt88.js:23391-23595 placement
function ownPersonPublishedTarget(n, e) {
  let target = ARTIFACT_ACTION_TARGETS_MAP[n]?.target;
  let r = target !== undefined && isPlainObject(e) ? e[target] : undefined;
  let a = typeof r === "string" ? normalizeArtifactSlug(r) : null;
  let l = a === null ? undefined : getLiveState().ownPublishedSlugs.get(a);
  return a !== null && l?.byPerson === true
    ? {
        slug: a,
        env: l.env,
      }
    : null;
}
//@ chunk-p5cstt88.js:23595-23737 placement
function isOwnedTarget(n, e) {
  let s = ownPersonPublishedTarget(n, e);
  if (s !== null && getArtifactPublishStubDir() !== null) return true;
  let r = s === null ? undefined : getShareEntry(s.slug);
  return r?.mode === "owner" && r.probeFailed !== true;
}
//@ chunk-p5cstt88.js:23737-23806 placement
/**
 * 自己发布的 artifact 且没有他人待处理评论。
 */
function isOwnPersonArtifactWithoutOtherComments(n, e) {
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
  undefined,
]);
var WRITE_MCP_TOOLS = new Set(["publish_version", "edit_version", "publish_files", "reply_comment"]);
//@ chunk-p5cstt88.js:23974-30311 placement
/**
 * 为 artifacts MCP 工具（runner/laptop）安装权限与调用包装。
 */
function applyArtifactRules(n, e) {
  let s = isRunnerDynamicServer(n)
    ? "runner"
    : ARTIFACT_ACTION_TARGETS()?.isArtifactsMcpLaptopEntry(n) === true
      ? "laptop"
      : null;
  if (s === null || e.mcpInfo === undefined) return;
  if (s === "runner") {
    e.mcpInfo = {
      ...e.mcpInfo,
      standsInForBuiltIn: true,
    };
    let o = e.call;
    e.call = async (...i) => {
      let p = artifactsMcpClient();
      try {
        return await o.apply(e, i);
      } catch (error) {
        if (isArtifactForbiddenError(error)) getLiveState().mcpEntryRowNotServed = p ?? null;
        throw error;
      }
    };
  }
  let toolName = e.mcpInfo.toolName;
  if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)) {
    e.requiresUserInteraction = () => true;
    e.suppressesAlwaysAllowRule = () => true;
  }
  let suppressesAlwaysAllowRule = e.suppressesAlwaysAllowRule;
  e.suppressesAlwaysAllowRule = (o, i) =>
    dbWriteMayAsk(toolName, o) ||
    createArtifactNotice(toolName, o) !== null ||
    suppressesAlwaysAllowRule?.call(e, o, i) === true;
  let ignoresWholeToolAllowRule = e.ignoresWholeToolAllowRule;
  e.ignoresWholeToolAllowRule = (o) =>
    dbWriteMayAsk(toolName, o) ||
    createArtifactNotice(toolName, o) !== null ||
    ignoresWholeToolAllowRule?.call(e, o) === true;
  let u = `the Artifacts tool ${toolName}`;
  let { checkPermissions, permissionCheckFailureDecision, toAutoClassifierInput } = e;
  e.toAutoClassifierInput = (o) => {
    try {
      let i = isPlainObject(o)
        ? {
            ...o,
          }
        : {};
      return checkArtifactRead(toolName, i, (p) => toAutoClassifierInput.call(e, isPlainObject(p) ? p : {}), {
        statesAudience: e.inputJSONSchema?.properties?.shared_live !== undefined,
        readOnly: e.isReadOnly(i),
      });
    } catch {
      logForDebugging(`[artifacts-mcp] the classifier's line for ${toolName} could not be built`, {
        level: "warn",
      });
      return `${ARTIFACT_TOOL_NAME} ${ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action ?? "tool"}${ownershipClassifierMark(
        {
          role: undefined,
        },
      )} [shared: unknown]${noticeRequestedTag(pendingNoticeReadKind(toolName, {}))} \u2192 ${UNRECOGNIZED_ADDRESS}, as Claude wrote it: (unreadable arguments)`;
    }
  };
  let y = new Set();
  let c = new Set();
  let w = new Map();
  e.hookMatcherFamilyNames = (o) => {
    let i = dataToolEquivalent(artifactRuleToolRef, normalizeArtifactInput(toolName, o).input);
    if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName))
      return [ARTIFACT_TOOL_NAME, ...Object.values(ARTIFACT_ACTION_TOOL_NAMES)];
    return i === undefined
      ? [ARTIFACT_TOOL_NAME]
      : isArtifactToolsetSplit()
        ? [ARTIFACT_TOOL_NAME, i.tool.name]
        : [i.tool.name, ARTIFACT_TOOL_NAME];
  };
  e.checkPermissions = async (o, i) => {
    let p = s === "laptop" ? ownPersonPublishedTarget(toolName, o) : null;
    if (
      p !== null &&
      getArtifactPublishStubDir() === null &&
      artifactsMcpUnavailableReason(s) === null &&
      findMisspelledArgName(o) === undefined &&
      artifactRuleInputs(getToolPermissionContext(i), toolName, o, "deny") === null
    )
      await warmShareEntry(p, i, "artifacts-mcp-published");
    let f = checkArtifactPermission(s, toolName, u, o, i, isRoutinePrivateFirstPublish(s, toolName, o, i));
    if (f !== undefined) return f;
    if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
      let P = targetFromSlugArg(o);
      if (P === null && isAutoReactNoticePendingFor(o))
        return {
          behavior: "deny",
          message: UNKNOWN_ARTIFACT_COMMENTS_MESSAGE,
          decisionReason: {
            type: "other",
            reason: UNKNOWN_ARTIFACT_COMMENTS_MESSAGE,
          },
        };
      let Y =
        P === null
          ? null
          : await commentReadDecision(o)?.decide(i, P, {
              replyGrant: null,
              threadId: () => (isPlainObject(o) && typeof o.thread === "string" ? o.thread : undefined),
              lateDeny: () => checkArtifactPermission(s, toolName, u, o, i) ?? null,
              askRule: (re) => artifactRuleInputs(re, toolName, o, "ask")?.rule ?? getAskRuleForTool(re, e),
              updatedInput: () => {
                return;
              },
            });
      if (Y !== null && Y !== undefined) return Y;
    }
    let R = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)
      ? await checkPermissions.call(e, o, i)
      : unknownMcpToolAsk(u);
    let E = checkArtifactPermission(s, toolName, u, o, i, isRoutinePrivateFirstPublish(s, toolName, o, i));
    if (E !== undefined) return E;
    let k = artifactRuleInputs(getToolPermissionContext(i), toolName, o, "ask");
    let C = await applyAskRuleOverride(R, k?.rule ?? null, async () =>
      k === null ? "" : askRuleCoversMessage(k, u),
    );
    let S = C.behavior === "deny" ? undefined : createArtifactAsk(toolName, o, i);
    if (S !== undefined) {
      if (S.behavior === "ask" && i.toolUseId !== undefined) rememberToolUseId(y, i.toolUseId);
      return S;
    }
    if (k !== null && C.behavior === "ask")
      return {
        ...C,
        suppressAlwaysAllowRule: true,
      };
    if (C.behavior !== "passthrough") return C;
    let toolPermissionContext = getToolPermissionContext(i);
    if (toolPermissionContext.mode === "plan") return C;
    if (isRoutinePrivateFirstPublish(s, toolName, o, i)) {
      if (i.toolUseId === undefined) getLiveState().routineRunTainted = true;
      else c.add(i.toolUseId);
      return {
        behavior: "allow",
        updatedInput: o,
        decisionReason: {
          type: "other",
          reason: "A scheduled task's new artifact, private to the person",
        },
      };
    }
    let I = checkArtifactPermission(s, toolName, u, o, i);
    if (I !== undefined) return I;
    let V =
      toolName !== ARTIFACTS_MCP_REPLY_COMMENT_TOOL && WRITE_MCP_TOOLS.has(toolName)
        ? mcpTargetSlug(toolName, o)
        : null;
    let G = V === null ? undefined : otherCommentPendingSeq(V);
    if (
      V !== null &&
      G !== undefined &&
      i.toolUseId !== undefined &&
      consentAskCanReachUser(i) &&
      !isAutoClassifierActive(toolPermissionContext.mode) &&
      !isDelegatedObservationContext(i.agentContext)
    ) {
      w.set(i.toolUseId, {
        slug: V,
        seq: G,
      });
      let P = `A comment that may not be the person's own is pending on this artifact, so ${u} needs their answer.`;
      return {
        behavior: "ask",
        message: P,
        suppressAlwaysAllowRule: true,
        decisionReason: {
          type: "safetyCheck",
          reason: P,
          classifierApprovable: false,
        },
      };
    }
    let te = artifactDbAskReason(e, o, i);
    if (te !== undefined) return te;
    if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName) || dbWriteMayAsk(toolName, o)) return C;
    if (
      s === "laptop" &&
      (toolName === "publish_version" || toolName === "edit_version") &&
      isOwnPersonArtifactWithoutOtherComments(toolName, o) &&
      isPlainObject(o) &&
      (o.shared_live ?? "") === "" &&
      o.contract === undefined &&
      !isDelegatedObservationContext(i.agentContext) &&
      isStrictHumanTurn(i.messages)
    )
      return {
        behavior: "allow",
        updatedInput: o,
        decisionReason: {
          type: "other",
          reason: "Redeploy of an artifact already published this session",
        },
      };
    let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
    if (PLAN_SAFE_MCP_TOOLS.has(action))
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
      G === undefined &&
      !isAutoClassifierActive(toolPermissionContext.mode) &&
      (toolPermissionContext.modeBeforeRewrite === undefined ||
        !isAutoClassifierActive(toolPermissionContext.modeBeforeRewrite))
        ? toolAlwaysAllowedRule(toolPermissionContext, artifactRuleToolRef)
        : null;
    return se === null
      ? C
      : {
          behavior: "allow",
          updatedInput: o,
          decisionReason: {
            type: "rule",
            rule: se,
          },
        };
  };
  e.permissionCheckFailureDecision = (o, i) => {
    let p = checkArtifactPermission(s, toolName, u, o, i);
    if (p !== undefined) return p;
    if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL && isAutoReactNoticePendingFor(o)) {
      let k = `${COMMENTS_READ_REFUSALS} and the permission check for this call couldn't finish. Try once more; if it fails again, tell the user the comments couldn't be read.`;
      return {
        behavior: "deny",
        message: k,
        decisionReason: {
          type: "other",
          reason: k,
        },
      };
    }
    let f = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)
      ? (permissionCheckFailureDecision?.call(e, o, i) ?? artifactDbAskReason(e, o, i))
      : unknownMcpToolAsk(u);
    let R = f?.behavior === "deny" ? undefined : createArtifactAsk(toolName, o, i);
    if (R !== undefined) {
      if (R.behavior === "ask" && i.toolUseId !== undefined) rememberToolUseId(y, i.toolUseId);
      return R;
    }
    let E = artifactRuleInputs(getToolPermissionContext(i), toolName, o, "ask");
    if (E === null || f?.behavior === "deny") return f;
    return f?.behavior === "ask"
      ? {
          ...f,
          matchedAskRule: f.matchedAskRule ?? E.rule,
        }
      : {
          behavior: "ask",
          message: `${askRuleCoversMessage(E, u)} This tool's permission check couldn't finish, so approving covers this call only.`,
          suppressAlwaysAllowRule: true,
          decisionReason: {
            type: "rule",
            rule: E.rule,
          },
        };
  };
  let h = e.call;
  e.call = async (o, i, p, f, R, E) => {
    let k = i.toolUseId !== undefined && c.delete(i.toolUseId);
    let C = i.toolUseId === undefined ? undefined : w.get(i.toolUseId);
    if (i.toolUseId !== undefined) w.delete(i.toolUseId);
    try {
      let S = await h.call(e, o, i, p, f, R, markFrameCreateConfirmed(E, i, y));
      if (
        C !== undefined &&
        consentAskCanReachUser(i) &&
        !isAutoClassifierActive(getToolPermissionContext(i).mode)
      )
        settleOtherCommentPending(C.slug, C.seq);
      if (k) {
        let { read, shared } = shareFieldsFromResult(S.data);
        recordUnaskedRoutineFirstPublish(
          publishedArtifactFromResult(S.data)?.slug,
          read === undefined
            ? "unknown_outcome"
            : read === ""
              ? "empty"
              : deriveShareStatus(read, shared).mode,
        );
      }
      return S;
    } catch (error) {
      if (k) recordUnaskedRoutineFirstPublish(undefined, "unknown_outcome");
      throw error;
    }
  };
  let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
  if (action === "delete_asset" || action === "delete") {
    let { checkPermissions, permissionCheckFailureDecision } = e;
    e.checkPermissions = async (p, f) => askDefaultsToNo(e, await checkPermissions.call(e, p, f));
    e.permissionCheckFailureDecision = (p, f) => {
      let R = askDefaultsToNo(
        e,
        permissionCheckFailureDecision?.call(e, p, f) ?? {
          behavior: "passthrough",
          message: `The permission check for ${u} couldn't finish.`,
          checkIncomplete: true,
        },
      );
      return R.behavior === "passthrough" ? undefined : R;
    };
  }
  if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
    let o = e.call;
    e.call = async (i, p, ...f) => {
      let R = targetFromSlugArg(i);
      if (R === null && isAutoReactNoticePendingFor(i))
        throw new ArtifactInputError(UNKNOWN_ARTIFACT_COMMENTS_MESSAGE, "mcp_comments_slug_unread");
      let E = R === null ? undefined : commentReadDecision(i)?.consume(p, R.slug);
      if (E?.noticeStood === true && !E.judged)
        throw new ArtifactInputError(
          `${COMMENTS_READ_REFUSALS} and this call's permission check did not ask for it. Call read_comments again for this artifact so the user can be asked.`,
          "mcp_comments_notice_unchecked",
        );
      let k = s === "laptop" ? await ownAccountUuid(p.credentials) : null;
      let C = await o.call(e, i, p, ...f);
      let S = mcpTargetSlug(toolName, i);
      if (S !== null && !isDelegatedObservationContext(p.agentContext)) {
        let viewer =
          k === null
            ? {
                account: undefined,
                tokens: ownPrincipalTokens(),
              }
            : await ownAccountUuid(p.credentials);
        let I = commentsFromResult(
          C.data,
          viewer,
          k === null || (k.account !== undefined && k.account === viewer.account),
        );
        if (I === null) recordUnaccountedComments(S, "fromRead");
        else recordJudgedComments(S, I);
      }
      return C;
    };
  }
}
//@ chunk-p5cstt88.js:30311-30591 placement
function askDefaultsToNo(n, e) {
  if (e.behavior === "ask")
    return {
      ...e,
      defaultToNo: true,
    };
  if (e.behavior !== "passthrough" || n.mcpInfo?.effectiveMaxPermission !== "ask") return e;
  return {
    behavior: "ask",
    message: e.message,
    suppressAlwaysAllowRule: true,
    defaultToNo: true,
    ...(e.checkIncomplete === true && {
      checkIncomplete: true,
    }),
  };
}
//@ chunk-p5cstt88.js:30591-30601 placement
var MAX_REMEMBERED_TOOL_USE_IDS = 64;
//@ chunk-p5cstt88.js:30601-30694 placement
/**
 * 记住被询问过的 toolUseId，超过上限逐出最早的。
 */
function rememberToolUseId(n, toolUseId) {
  n.add(toolUseId);
  let s = n.values().next().value;
  if (n.size > MAX_REMEMBERED_TOOL_USE_IDS && s !== undefined) n.delete(s);
}
//@ chunk-p5cstt88.js:30694-30822 placement
function markFrameCreateConfirmed(n, e, s) {
  return e.toolUseId !== undefined && s.delete(e.toolUseId) && isUserDecidedToolUse(e)
    ? {
        ...n,
        mcpCallMeta: {
          ...n?.mcpCallMeta,
          [ANTHROPIC_FRAMECREATECONFIRMED]: true,
        },
      }
    : n;
}
//@ chunk-p5cstt88.js:30822-30952 placement
function classifierOwnershipMarks(n) {
  let e = typeof n === "string" ? normalizeArtifactSlug(n) : null;
  let s = e === null ? undefined : getShareEntry(e);
  return `${
    isSessionWrittenArtifact(n)
      ? SESSION_CREATED_CLASSIFIER_MARK
      : ownershipClassifierMark(
          isSomeoneElses(s)
            ? s
            : {
                role: undefined,
              },
        )
  }${otherOrgClassifierMark(s)}`;
}
//@ chunk-7zr1t9gr.js:360-667 placement
/**
 * 判断错误是否是 Artifact 服务返回的 403 禁止访问错误。
 */
function isArtifactForbiddenError(error) {
  if (!(error instanceof Error)) return false;
  let e = error.message.trimEnd();
  if (e === `Streamable HTTP error: ${MCP_SERVER_NOT_ALLOWED_MESSAGE}`)
    return "code" in error && error.code === 403;
  if (e !== MCP_SERVER_NOT_ALLOWED_MESSAGE) return false;
  return "status" in error
    ? error.status === 403
    : "telemetryMessage" in error &&
        typeof error.telemetryMessage === "string" &&
        error.telemetryMessage.startsWith("SdkHttpError ");
}
