/**
 * tools/ArtifactTool/artifactPermissionRules.ts
 *
 * 2.1.316 新增：为 artifacts MCP 工具（runner/laptop）安装权限与调用包装；artifact MCP 动作到目标字段的映射表等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4wmswyss.js (1), chunk-f2b3q7t8.js (55)
 * attribution: placement 55, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MCP_SERVER_NOT_ALLOWED_MESSAGE, artifactsMcpClient } from "../../services/mcp/client.js";
import {
  getContentRulesMapForToolName,
  getDenyRuleForTool,
  findAskRuleForTool,
  matchToolRule,
  askedBashRules,
  deniedBashRules,
  toolMatchesRule,
  applyAskRuleOverride,
  toolAlwaysAllowedRule,
} from "../../utils/permissions/permissions.js";
import { ARTIFACT_TOOL_NAME, getArtifactPublishStubDir, ArtifactInputError } from "./constants.js";
import {
  matchWildcard,
  permissionRuleValueFromString,
} from "../../utils/permissions/permissionRuleParser.js";
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
  ACTION_WITH_RESERVED_MINT,
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
import { logForDebugging } from "../../utils/debug.js";
import { warmShareEntry } from "../../services/artifacts/shareEntryWarm.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { ownAccountUuid, ownPrincipalTokens } from "../../services/artifacts/comments/commentAuthorship.js";
import { ANTHROPIC_FRAMECREATECONFIRMED } from "../../services/artifacts/frameApi.js";

//@ chunk-4wmswyss.js:360-667 placement
/**
 * 判断错误是否是 Artifact 服务返回的 403 禁止访问错误。
 */
function isArtifactForbiddenError(error) {
  if (!(error instanceof Error)) return false;
  let message = error.message.trimEnd();
  if (message === `Streamable HTTP error: ${MCP_SERVER_NOT_ALLOWED_MESSAGE}`)
    return "code" in error && error.code === 403;
  if (message !== MCP_SERVER_NOT_ALLOWED_MESSAGE) return false;
  return "status" in error
    ? error.status === 403
    : "telemetryMessage" in error &&
        typeof error.telemetryMessage === "string" &&
        error.telemetryMessage.startsWith("SdkHttpError ");
}
//@ chunk-f2b3q7t8.js:1574-1776 placement
var DATA_RULE_FIELDS = new Set(["db_op", "collection", "doc_id", "query", "data", "writes", "as_level"]);
var ENDPOINT_RULE_FIELDS = new Set(["method", "path", "body", "body_file", "mode", "script"]);
var DATA_RULE_ACTIONS = ["read_db", "write_db", "call_endpoint", "run_script"];
//@ chunk-f2b3q7t8.js:1776-1992 placement
function findDataContentRule(toolName, context) {
  for (let [ruleContent, rule] of getContentRulesMapForToolName(toolName, ARTIFACT_TOOL_NAME, context)) {
    let index = ruleContent.indexOf(":");
    let value = index <= 0 ? "" : ruleContent.slice(index + 1).trim();
    if (value === "") continue;
    let trimmed = ruleContent.slice(0, index).trim();
    if (
      DATA_RULE_FIELDS.has(trimmed) ||
      ENDPOINT_RULE_FIELDS.has(trimmed) ||
      (trimmed === "action" && DATA_RULE_ACTIONS.some((action) => matchWildcard(value, action)))
    )
      return rule;
  }
  return;
}
//@ chunk-f2b3q7t8.js:1992-4776 placement
/**
 * artifact MCP 动作到目标字段的映射表。
 */
var ARTIFACT_ACTION_TARGETS = () => require("../../services/artifacts/artifactsMcpLaptop.js");
var artifactRuleToolRef = {
  name: ARTIFACT_TOOL_NAME,
  mcpInfo: undefined,
  ruleContentField: undefined,
};
var COUNTERPARTS = {
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
    givesStoredText: true,
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
  guide: {
    givesStoredText: true,
  },
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
//@ chunk-f2b3q7t8.js:4776-4912 placement
function isArtifactAssetPath(path) {
  if (typeof path !== "string") return false;
  let index = path.lastIndexOf("/");
  return regExp_2_2.test(path.slice(0, Math.max(index, 0))) && regExp_4.test(path.slice(index + 1));
}
//@ chunk-f2b3q7t8.js:4912-5336 placement
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
//@ chunk-f2b3q7t8.js:5336-5613 placement
/**
 * 把 artifact 地址或 slug 规范成小写 UUID slug：已是 slug 直接返回，否则从 URL 中解析（22 位 base58 解码为 UUID），失败返回 null。
 */
function artifactIdOf(value) {
  let lower = value.toLowerCase();
  if (regExp.test(lower)) return lower;
  let trimmed = value.trim();
  let origin = trimmed.match(/^[^:/?#]+:\/\/[^/?#]*/)?.[0] ?? "";
  let lowered = origin.toLowerCase() + trimmed.slice(origin.length);
  let slugMatch = lowered.match(regExp_2)?.[1];
  if (slugMatch !== undefined)
    return slugMatch.length === 22 ? decodeBase58Uuid(slugMatch) : slugMatch.toLowerCase();
  return lowered.match(regExp_3)?.[1]?.toLowerCase() ?? null;
}
//@ chunk-f2b3q7t8.js:5613-7566 placement
/**
 * 规范化 artifact 调用输入（目标、来源、拷贝）。
 */
function artifactInputFor(verb, input, hints) {
  let known = Object.hasOwn(COUNTERPARTS, verb);
  let targets = known
    ? COUNTERPARTS[verb]
    : {
        target: "slug",
      };
  let fields = isPlainObject(input) ? input : {};
  let normalized = {};
  let unread = !known;
  let copies = false;
  let dbUnread = false;
  let rawUrlField = targets?.target === undefined ? undefined : fields[targets.target];
  let rawSourceField = targets?.source === undefined ? undefined : fields[targets.source];
  for (let [normalizedKey, sourceField] of [
    ["url", targets?.target],
    ["from_url", targets?.source],
    ["type_url", targets?.type],
  ]) {
    let rawValue = sourceField === undefined ? undefined : fields[sourceField];
    if (typeof rawValue !== "string") {
      if (rawValue !== undefined && rawValue !== null) {
        unread = true;
        copies ||= normalizedKey === "from_url";
      }
      continue;
    }
    let slug = artifactIdOf(rawValue);
    if (slug === null) {
      unread = true;
      copies ||= normalizedKey === "from_url";
    } else
      normalized[normalizedKey] = artifactViewerUrlFor({
        slug,
        env: claudeAiEnvironment(),
      });
  }
  if (targets?.action !== undefined) normalized.action = targets.action;
  if (typeof fields.title === "string") normalized.title = fields.title;
  let isDbOp = targets?.action === "read_db" || targets?.action === "write_db";
  let untrustedArray = readUntrustedArray(fields.ops);
  if (!isDbOp && typeof fields.path === "string") normalized.path = fields.path;
  if (Array.isArray(fields.paths)) normalized.paths = fields.paths;
  if (isDbOp) {
    let dbOp = hints?.op ?? DB_OP_NAMES[verb] ?? (untrustedArray !== undefined ? "batch" : undefined);
    if (dbOp !== undefined) normalized.db_op = dbOp;
    let documentPath = hints?.path ?? (typeof fields.path === "string" ? fields.path : undefined);
    let argSpec = DB_OP_ARG_SPECS[verb];
    dbUnread =
      argSpec === undefined ||
      Object.keys(fields).some((key) => !SHARED_SCOPE_FIELDS.has(key) && !argSpec.takes.has(key)) ||
      (fields.asLevel !== undefined && !DB_SCOPES.some((scope) => scope === fields.asLevel)) ||
      (argSpec.names === "document" && !isArtifactAssetPath(fields.path)) ||
      (argSpec.names === "collection" &&
        !(typeof fields.collection === "string" && regExp_2_2.test(fields.collection))) ||
      (argSpec.names === "operations" &&
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
    if (typeof fields.asLevel === "string") normalized.as_level = fields.asLevel;
    let lastSlash = documentPath === undefined ? -1 : documentPath.lastIndexOf("/");
    if (documentPath !== undefined && lastSlash > 0) {
      normalized.collection = documentPath.slice(0, lastSlash);
      normalized.doc_id = documentPath.slice(lastSlash + 1);
    } else if (typeof fields.collection === "string") normalized.collection = fields.collection;
  }
  if (typeof fields.id === "string" && targets?.action?.endsWith("_asset")) normalized.asset_id = fields.id;
  if (targets?.action === "upload_asset" || verb === "publish_files") {
    let flattened = (readUntrustedArrayOrUndefined(fields.files) ?? []).flatMap((file) =>
      isPlainObject(file) && typeof file.path === "string" ? [file.path] : [],
    );
    normalized.file_paths = flattened;
    if (flattened.length === 1) normalized.file_path = flattened[0];
  }
  return {
    input: normalized,
    unread,
    known,
    ...(typeof rawUrlField === "string" && {
      rawUrl: rawUrlField,
    }),
    ...(typeof rawSourceField === "string" && {
      rawSourceUrl: rawSourceField,
    }),
    ...(copies && {
      copies: true,
    }),
    ...(dbUnread && {
      dbUnread: true,
    }),
    ...((targets?.readsBack === true ||
      fields.ifVersion !== undefined ||
      untrustedArray === UNREADABLE_ARRAY ||
      (untrustedArray ?? []).some((op) => isPlainObject(op) && op.ifVersion !== undefined)) && {
      readsBack: true,
    }),
  };
}
//@ chunk-f2b3q7t8.js:7566-7629 placement
/**
 * 按谓词找第一个匹配项的值。
 */
function findFirstMatch(contentRulesMapForToolName, predicate) {
  for (let [key, rule] of contentRulesMapForToolName) if (predicate(key)) return rule;
  return null;
}
//@ chunk-f2b3q7t8.js:7629-7745 placement
function findRuleForFields(contentRulesMapForToolName, fieldNames) {
  for (let [key, rule] of contentRulesMapForToolName) {
    let index = key.indexOf(":");
    if (index > 0 && fieldNames.includes(key.slice(0, index).trim())) return rule;
  }
  return null;
}
//@ chunk-f2b3q7t8.js:7745-7897 placement
function withoutNarrowingDenyRules(context) {
  if ((context.alwaysDenyRules.toolsNarrowing?.length ?? 0) === 0) return context;
  let { toolsNarrowing, ...rest } = context.alwaysDenyRules;
  return {
    ...context,
    alwaysDenyRules: rest,
  };
}
//@ chunk-f2b3q7t8.js:7897-7943 placement
var PLACEHOLDER_SLUG = "00000000-0000-4000-8000-000000000000";
//@ chunk-f2b3q7t8.js:7943-9589 placement
/**
 * 用权限规则匹配 artifact 调用。
 */
function artifactRuleFor(context, normalized, behavior) {
  let { action, ...fields } = normalized.input;
  let url = normalized.input.url;
  let slug = typeof url === "string" ? artifactIdOf(url) : null;
  let fromUrl = normalized.input.from_url;
  let sourceSlug = typeof fromUrl === "string" ? artifactIdOf(fromUrl) : null;
  let rule =
    (behavior === "deny"
      ? getDenyRuleForTool(withoutNarrowingDenyRules(context), artifactRuleToolRef)
      : findAskRuleForTool(context, artifactRuleToolRef)) ??
    findUrlContentRule(context, normalized.input, behavior) ??
    matchArtifactRuleOrEquivalent(context, artifactRuleToolRef, normalized.input, behavior) ??
    matchToolRule(context, artifactRuleToolRef, fields, behavior) ??
    artifactDataRule(
      behavior === "deny" ? withoutNarrowingDenyRules(context) : context,
      artifactRuleToolRef,
      normalized.input,
      behavior,
    ) ??
    ((!normalized.known ||
      ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(normalized.input.action)) ||
      normalized.readsBack === true) &&
    slug !== null
      ? webFetchRuleForArtifactRead(
          context,
          {
            slug,
            env: claudeAiEnvironment(),
          },
          normalized.rawUrl ?? url,
          behavior,
        )
      : null) ??
    (sourceSlug !== null && typeof fromUrl === "string"
      ? webFetchRuleForArtifactRead(
          context,
          {
            slug: sourceSlug,
            env: claudeAiEnvironment(),
          },
          normalized.rawSourceUrl ?? fromUrl,
          behavior,
        )
      : null);
  if (rule !== null)
    return {
      rule,
      why: "named",
    };
  if (normalized.input.action === "run_script" || normalized.input.action === "call_endpoint") {
    let dataRule =
      findDataContentRule(behavior === "deny" ? withoutNarrowingDenyRules(context) : context, behavior) ??
      findRuleForFields(getContentRulesMapForToolName(context, ARTIFACT_ACTION_TOOL_NAMES.data, behavior), [
        ...DATA_RULE_FIELDS,
        "action",
      ]) ??
      undefined;
    if (dataRule !== undefined)
      return {
        rule: dataRule,
        why: "named",
      };
  }
  let collapsed = collapseArtifactAction(normalized.input);
  if (isPlainObject(collapsed) && collapsed !== normalized.input) {
    let { action, ...rest } = collapsed;
    let collapsedRule = matchToolRule(
      context,
      artifactRuleToolRef,
      isArtifactToolsetSplit() ? collapsed : rest,
      behavior,
    );
    if (collapsedRule !== null)
      return {
        rule: collapsedRule,
        why: "named",
      };
  }
  if (normalized.dbUnread === true)
    for (let toolName of [ARTIFACT_TOOL_NAME, ARTIFACT_ACTION_TOOL_NAMES.data]) {
      let ruleForFields = findRuleForFields(
        getContentRulesMapForToolName(context, toolName, behavior),
        toolName === ARTIFACT_TOOL_NAME ? [...DATA_RULE_FIELDS] : [...DATA_RULE_FIELDS, "action"],
      );
      if (ruleForFields !== null)
        return {
          rule: ruleForFields,
          why: "unread",
        };
    }
  for (let toolName of [ARTIFACT_TOOL_NAME, ...Object.values(ARTIFACT_ACTION_TOOL_NAMES)]) {
    let contentRulesMapForToolName = getContentRulesMapForToolName(context, toolName, behavior);
    let unreadRule = normalized.unread
      ? findRuleForFields(contentRulesMapForToolName, ["url", "from_url", "type_url"])
      : null;
    if (unreadRule !== null)
      return {
        rule: unreadRule,
        why: "unread",
      };
    let toolRef = {
      name: toolName,
      mcpInfo: undefined,
      ruleContentField: undefined,
    };
    let unknownRule = normalized.known
      ? null
      : ([...contentRulesMapForToolName.values()][0] ??
        (toolName === ARTIFACT_TOOL_NAME
          ? null
          : behavior === "deny"
            ? getDenyRuleForTool(withoutNarrowingDenyRules(context), toolRef)
            : findAskRuleForTool(context, toolRef)));
    if (unknownRule !== null)
      return {
        rule: unknownRule,
        why: "unknown",
      };
  }
  if (
    normalized.unread &&
    (!normalized.known ||
      ARTIFACT_WEBFETCH_READ_ACTIONS.has(String(normalized.input.action)) ||
      normalized.readsBack === true ||
      normalized.copies === true)
  ) {
    let placeholder = {
      slug: PLACEHOLDER_SLUG,
      env: claudeAiEnvironment(),
    };
    for (let candidateUrl of [
      normalized.rawUrl,
      normalized.rawSourceUrl,
      artifactViewerUrlFor(placeholder),
    ]) {
      let webFetchRule =
        candidateUrl === undefined
          ? null
          : webFetchRuleForArtifactRead(context, placeholder, candidateUrl, behavior);
      if (webFetchRule !== null)
        return {
          rule: webFetchRule,
          why: "unread",
        };
    }
    let firstMatch = findFirstMatch(getContentRulesMapForToolName(context, WEBFETCH, behavior), (key) =>
      /^domain:(?:.*[.*])?claudeusercontent\.com$/i.test(key.trim()),
    );
    if (firstMatch !== null)
      return {
        rule: firstMatch,
        why: "unread",
      };
  }
  return null;
}
//@ chunk-f2b3q7t8.js:9589-9901 placement
/**
 * 去掉参数值末尾误带的 </invoke> 标签。
 */
function stripTrailingInvoke(value) {
  let stripped = value;
  if (isPlainObject(value))
    for (let [key, value_2] of Object.entries(value)) {
      let text = typeof value_2 === "string" ? value_2.trimEnd() : "";
      if (!text.toLowerCase().endsWith("</invoke>")) continue;
      let withoutInvoke = text.slice(0, -9).trimEnd();
      if (withoutInvoke.toLowerCase().endsWith(`</${key.toLowerCase()}>`))
        withoutInvoke = withoutInvoke.slice(0, -`</${key}>`.length).trimEnd();
      stripped = {
        ...(isPlainObject(stripped) ? stripped : value),
        [key]: withoutInvoke,
      };
    }
  return stripped;
}
//@ chunk-f2b3q7t8.js:9901-10456 placement
/**
 * 生成用于规则匹配的输入变体（多文件拆分）。
 */
function artifactRuleInputs(context, toolName, input, behavior) {
  let stripped = stripTrailingInvoke(input);
  let files = isPlainObject(input) && Array.isArray(input.files) && input.files.length > 1 ? input.files : [];
  let mapped = [
    input,
    ...(stripped === input ? [] : [stripped]),
    ...files.map((file) => ({
      ...(isPlainObject(input) ? input : {}),
      files: [file],
    })),
  ].map((files) => [files, undefined]);
  let ruleInput = !isPlainObject(input)
    ? []
    : toolName === "db_str_replace"
      ? [
          {
            op: "update",
            path: input.path,
          },
        ]
      : toolName === "db_write" && Array.isArray(input.ops)
        ? input.ops.filter(isPlainObject).flatMap((op) =>
            (op.op === "merge" ? ["set", "update"] : [op.op]).map((op_2) => ({
              op: op_2,
              path: op.path,
            })),
          )
        : [];
  for (let [file, index] of [
    ...mapped,
    ...ruleInput.flatMap(({ op, path }) =>
      typeof op === "string" && typeof path === "string"
        ? [
            [
              input,
              {
                op,
                path,
              },
            ],
          ]
        : [],
    ),
  ]) {
    let listInput = artifactRuleFor(context, artifactInputFor(toolName, file, index), behavior);
    if (listInput !== null) return listInput;
  }
  return null;
}
//@ chunk-f2b3q7t8.js:10456-10570 placement
function listDataToolNames() {
  let values = Object.values(ARTIFACT_ACTION_TOOL_NAMES);
  return values.length < 2 ? values.join("") : `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`;
}
//@ chunk-f2b3q7t8.js:10570-10856 placement
function unreadCallRuleNote(why) {
  return why === "unread"
    ? " Claude Code couldn't tell what this call names or does, so the rule applies to it."
    : why === "unknown"
      ? ` Claude Code doesn't know what this tool does, so every ${ARTIFACT_TOOL_NAME} rule that names something in parentheses, and every rule on ${listDataToolNames()}, applies to it.`
      : "";
}
//@ chunk-f2b3q7t8.js:10856-11053 placement
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
var KNOWN_MCP_ARG_NAMES_UPPER = new Set([...KNOWN_MCP_ARG_NAMES].map((name) => name.toUpperCase()));
//@ chunk-f2b3q7t8.js:11053-11146 placement
/**
 * Artifact 工具名归一：NFKD、去组合符、转小写再大写。
 */
function foldedArgumentName(name) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().toUpperCase();
}
//@ chunk-f2b3q7t8.js:11146-11418 placement
function respelledArgument(input, mark) {
  if (!isPlainObject(input)) return;
  let keys = mark === undefined ? [] : [mark.arg, mark.local, mark.ref];
  let mapped = keys.map((key) => key.toUpperCase());
  return [input, ...[input.files, input.ops, mark && input[mark.arg]].flat().filter(isPlainObject)]
    .flatMap(Object.keys)
    .find((key) => {
      let fieldName = foldedArgumentName(key);
      return (
        !keys.includes(key) &&
        (mapped.includes(fieldName) ||
          (!KNOWN_MCP_ARG_NAMES.has(key) && KNOWN_MCP_ARG_NAMES_UPPER.has(fieldName)))
      );
    });
}
//@ chunk-f2b3q7t8.js:11418-11604 placement
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
//@ chunk-f2b3q7t8.js:11604-11736 placement
function allPublishFilesAutoReadable(input, toolPermissionContext) {
  let filePaths = artifactInputFor("publish_files", input).input.file_paths;
  return (
    Array.isArray(filePaths) &&
    filePaths.every(
      (filePath) =>
        typeof filePath === "string" && readWouldBeAutoAllowedForPath(filePath, toolPermissionContext),
    )
  );
}
//@ chunk-f2b3q7t8.js:11736-11999 placement
function artifactsMcpUnavailableReason(backend) {
  return (
    (backend !== "laptop" || getArtifactPublishStubDir() === null
      ? policyDeniedReason("allow_cobalt_plinth", "Artifacts", "are")
      : null) ??
    (isArtifactToolEnabled()
      ? null
      : `The Artifact tool isn't available in this session, so the Artifacts MCP tools aren't available either.${backend === "laptop" ? " Check /login and /config." : ""}`)
  );
}
//@ chunk-f2b3q7t8.js:11999-13724 placement
/**
 * artifact 工具权限检查（参数拼写、规则、分类器）。
 */
function checkArtifactPermission(backend, toolName, displayToolName, input, context, allowCowork = false) {
  let unavailable = artifactsMcpUnavailableReason(backend);
  if (unavailable !== null)
    return {
      behavior: "deny",
      message: unavailable,
      decisionReason: {
        type: "other",
        reason: unavailable,
      },
    };
  let extraArg = respelledArgument(input);
  if (extraArg !== undefined) {
    let message = `${displayToolName} takes no argument spelled ${refusalEcho(extraArg)}. Spell argument names exactly as the tool lists them.`;
    return {
      behavior: "deny",
      message,
      decisionReason: {
        type: "other",
        reason: message,
      },
    };
  }
  let targets = COUNTERPARTS[toolName];
  if (
    isCoworkFramePublishSession() &&
    consentMustDeny(context) &&
    !allowCowork &&
    (targets === undefined || targets.action === "publish" || targets.target !== undefined) &&
    !(
      (READ_ONLY_ACTIONS.has(targets?.action)
        ? isOwnedTarget(toolName, input)
        : isOwnPersonArtifactWithoutOtherComments(toolName, input)) &&
      isPlainObject(input) &&
      (input.shared_live ?? "") === "" &&
      input.contract === undefined &&
      targets?.source === undefined &&
      targets?.action !== "upload_asset" &&
      targets?.action !== "call_endpoint" &&
      targets?.action !== "run_script" &&
      !UPLOAD_MCP_TOOLS.has(toolName) &&
      pendingNoticeReadKind(toolName, input) === null
    )
  ) {
    let coworkMessage = `In Cowork ${displayToolName} needs the approval card here, and no one can answer it. ${pendingNoticeReadKind(toolName, input) === null ? "Do not retry this call in this session." : "Tell the user in chat; do not retry it on this turn."}`;
    return {
      behavior: "deny",
      message: coworkMessage,
      decisionReason: {
        type: "safetyCheck",
        reason: coworkMessage,
        classifierApprovable: false,
      },
    };
  }
  let denial = artifactRuleInputs(getToolPermissionContext(context), toolName, input, "deny");
  if (denial !== null)
    return {
      behavior: "deny",
      message: `Permission to use ${displayToolName} has been denied: ${denyRulePhrase(denial.rule)} covers it.${unreadCallRuleNote(denial.why)}`,
      decisionReason: {
        type: "rule",
        rule: denial.rule,
      },
    };
  if (
    backend === "laptop" &&
    toolName === "publish_files" &&
    getArtifactPublishStubDir() !== null &&
    !allPublishFilesAutoReadable(input, getToolPermissionContext(context))
  ) {
    let message = `A Read rule refuses a file sent to ${displayToolName}, so nothing was read.`;
    return {
      behavior: "deny",
      message,
      decisionReason: {
        type: "other",
        reason: message,
      },
    };
  }
  let action = COUNTERPARTS[toolName]?.action;
  if (
    planConsentMustDeny(context) &&
    (dbWriteMayAsk(toolName, input) || !PLAN_SAFE_MCP_TOOLS.has(action) || action === "resolve")
  )
    return {
      behavior: "deny",
      message: `${displayToolName} doesn't run in plan mode in this session, where no one can answer a prompt. Keep planning, and make this call once the plan is approved.`,
      decisionReason: {
        type: "safetyCheck",
        reason: "Plan mode with no one to ask runs no Artifacts call that names an artifact",
        classifierApprovable: false,
      },
    };
  return;
}
//@ chunk-f2b3q7t8.js:13724-13955 placement
function unknownMcpToolAsk(toolName) {
  let message = `Claude Code doesn't know what ${toolName} does yet, so each call needs your approval.`;
  return {
    behavior: "ask",
    message,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: message,
      classifierApprovable: false,
    },
  };
}
//@ chunk-f2b3q7t8.js:13955-14625 placement
/**
 * 数据库写入触发询问的原因。
 */
function artifactDbAskReason(tool, input, context) {
  let toolName = tool.mcpInfo?.toolName;
  let toolPermissionContext = getToolPermissionContext(context);
  if (
    toolName === undefined ||
    toolPermissionContext.mode === "plan" ||
    isAutoAllowedInMode(tool, toolPermissionContext) === "bypassPermissions" ||
    !dbWriteMayAsk(toolName, input)
  )
    return;
  let dbOp = pendingNoticeReadKind(toolName, input);
  let allowed = dbOp === null ? null : targetFromSlugArg(input);
  let reason =
    allowed === null
      ? null
      : `the database of ${artifactViewerUrlFor(allowed)} \u2014 prompted by the new-comments notification; rows there are written by artifact viewers`;
  let rule =
    reason !== null && dbOp === "rows"
      ? `Claude wants to read ${reason}.`
      : reason !== null && dbOp === "edit"
        ? `Claude wants to edit a document in ${reason}, so only a person can approve this edit.`
        : `Each call of the Artifacts tool ${toolName} like this one is approved by itself.`;
  return {
    behavior: "ask",
    message: rule,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: rule,
      classifierApprovable: dbOp !== "edit",
    },
  };
}
//@ chunk-f2b3q7t8.js:14625-14908 placement
/**
 * laptop 端的 publish_version 是否属于"例行、仅自己可见的首次发布"：无 slug/共享/合约、非子代理、无人判断的例行运行、新 Artifact 默认私有、且没有针对这些工具的 ask/deny 规则。
 */
function isRoutinePrivateFirstPublish(kind, toolName, input, context) {
  return (
    kind === "laptop" &&
    toolName === "publish_version" &&
    isPlainObject(input) &&
    (input.slug ?? "") === "" &&
    (input.shared_live ?? "") === "" &&
    input.contract === undefined &&
    context.agentId === undefined &&
    isHostOriginHonored() &&
    routineRunNobodyJudges(context) &&
    newArtifactIsPersonsPrivate() &&
    ![
      ...askedBashRules(getToolPermissionContext(context)),
      ...deniedBashRules(getToolPermissionContext(context)),
    ].some(
      (isFirstPublish) =>
        toolMatchesRule(getToolPermissionContext(context), artifactRuleToolRef, isFirstPublish) ||
        Object.values(ARTIFACT_ACTION_TOOL_NAMES).includes(isFirstPublish.ruleValue.toolName),
    )
  );
}
//@ chunk-f2b3q7t8.js:14908-15060 placement
function askRuleCoversMessage(denial, subject) {
  return `The ${refusalEcho(permissionRuleValueFromString(denial.rule.ruleValue))} ask rule from ${getSettingSourceDisplayNameLowercase(denial.rule.source)} covers ${subject}, so this call needs your approval.${unreadCallRuleNote(denial.why)}`;
}
//@ chunk-f2b3q7t8.js:15060-15167 placement
function targetFromSlugArg(input) {
  let slug = isPlainObject(input) && typeof input.slug === "string" ? artifactIdOf(input.slug) : null;
  return slug === null
    ? null
    : {
        slug,
        env: claudeAiEnvironment(),
      };
}
//@ chunk-f2b3q7t8.js:15167-15225 placement
/**
 * 该 artifact（或任意 artifact）是否有待处理的自动反应通知。
 */
function isAutoReactNoticePendingFor(input) {
  let target = targetFromSlugArg(input);
  return target === null ? anyAutoReactNoticePending() : hasAutoReactNoticePending(target.slug);
}
//@ chunk-f2b3q7t8.js:15225-15274 placement
/**
 * 评论读取的决策入口（有待处理通知时用已载入规则）。
 */
function commentReadDecision(input) {
  return isAutoReactNoticePendingFor(input) ? personOnlyRegistry.loaded() : personOnlyRegistry.read;
}
//@ chunk-f2b3q7t8.js:15274-15707 placement
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
var NOT_PUBLIC_BY_THE_SERVERS_MARK = new Set(["users", "org"]);
var VALID_SHARED_SCOPES = new Set([
  undefined,
  null,
  "",
  ...NOT_PUBLIC_BY_THE_SERVERS_MARK,
  "others",
  "agent_scoped",
]);
//@ chunk-f2b3q7t8.js:15707-15764 placement
function pendingNoticeReadKind(toolName, input) {
  let kind = readBackKind(toolName);
  return kind !== null && isAutoReactNoticePendingFor(input) ? kind : null;
}
//@ chunk-f2b3q7t8.js:15764-15925 placement
/**
 * 该 action 是否不需要读权限判定（未知/端点类/脚本类）。
 */
function mayHoldOthersWriting(actionName) {
  let action = Object.hasOwn(COUNTERPARTS, actionName) ? COUNTERPARTS[actionName]?.action : "unknown";
  return (
    action === "unknown" ||
    action === "get_endpoints" ||
    action === "call_endpoint" ||
    action === "run_script" ||
    readBackKind(actionName) !== null
  );
}
//@ chunk-f2b3q7t8.js:15925-16089 placement
var READ_ONLY_ACTION_NAMES = new Set([
  "read",
  "read_file",
  "read_asset",
  "list",
  "list_files",
  "list_types",
  "describe_type",
]);
var ARTIFACT_READ_ACTION_NAMES = new Set(["get_artifact", "read_declaration", "list_artifacts"]);
//@ chunk-f2b3q7t8.js:16089-16217 placement
/**
 * 读类 action 需要哪种同意（cannot 或 by_mark），不需要时 null。
 */
function othersStoredTextIsTold(actionName) {
  let { action: rule, givesStoredText } = COUNTERPARTS[actionName] ?? {};
  return mayHoldOthersWriting(actionName) || !(givesStoredText === true || READ_ONLY_ACTION_NAMES.has(rule))
    ? null
    : ARTIFACT_READ_ACTION_NAMES.has(actionName)
      ? "cannot"
      : "by_mark";
}
//@ chunk-f2b3q7t8.js:16217-16341 layout
function readBackKind(actionName) {
  let { action, readsBack } = COUNTERPARTS[actionName] ?? {};
  return readsBack === true
    ? "edit"
    : action === "read_db"
      ? "rows"
      : action === "comments"
        ? "comments"
        : null;
}
//@ chunk-f2b3q7t8.js:16341-16526 placement
function dbWriteMayAsk(toolName, input) {
  return (
    ASSET_MUTATING_ACTIONS.has(COUNTERPARTS[toolName]?.action) ||
    toolName === "declare_capabilities" ||
    COUNTERPARTS[toolName]?.source !== undefined ||
    (COUNTERPARTS[toolName]?.action === "publish" &&
      isCoworkFramePublishSession() &&
      !isOwnPersonArtifactWithoutOtherComments(toolName, input)) ||
    !isPlainObject(input) ||
    !VALID_SHARED_SCOPES.has(input.shared_live) ||
    pendingNoticeReadKind(toolName, input) !== null
  );
}
//@ chunk-f2b3q7t8.js:16526-16740 placement
var SHARED_AUDIENCE_MODES = new Set(["users", "org", "others", "agent_scoped", "public"]);
var UNRECOGNIZED_ADDRESS = "(unrecognized address)";
var ANYONE_MAY_VIEW_NOTE =
  ", anyone may be a viewer, not only the user's colleagues: internal code and infrastructure detail count as sensitive";
//@ chunk-f2b3q7t8.js:16740-16878 placement
function isSessionWrittenArtifact(url) {
  let slug = typeof url === "string" ? artifactIdOf(url) : null;
  let record = slug === null ? undefined : getLiveState().ownCreatedSlugs.get(slug);
  return record?.wrotePage === true && record.env === claudeAiEnvironment();
}
//@ chunk-f2b3q7t8.js:16878-17096 placement
function noticeRequestedTag(kind) {
  return kind === null
    ? ""
    : ` [requested after a new-comments notification${kind === "rows" ? ": rows are written by artifact viewers" : kind === "comments" ? ": the comment text it ingests is written by artifact viewers" : ""}]`;
}
//@ chunk-f2b3q7t8.js:17096-18222 placement
/**
 * 检查 artifact 读取（共享、未读评论）。
 */
function artifactClassifierLine(actionName, rawInput, renderPhrases, options) {
  let { input, unread, copies } = artifactInputFor(actionName, rawInput);
  let isCreate = isCreateAction(actionName, rawInput);
  let hasTarget = !isCreate && (typeof input.url === "string" || unread);
  let ownershipMarks = hasTarget ? classifierOwnershipMarks(input.url) : "";
  let noticeTag = noticeRequestedTag(pendingNoticeReadKind(actionName, rawInput));
  let sharedLive = options.statesAudience && isPlainObject(rawInput) ? rawInput.shared_live : undefined;
  let sharedLiveUnset = sharedLive === undefined || sharedLive === null || sharedLive === "";
  let agentScoped =
    (isCreate || hasTarget) && !options.readOnly && sharedLiveUnset && artifactsMcpInCloudSession();
  let audience =
    sharedLive !== undefined && sharedLive !== null && sharedLive !== ""
      ? SHARED_AUDIENCE_MODES.has(sharedLive)
        ? String(sharedLive)
        : "unknown"
      : hasTarget && !options.statesAudience && !options.readOnly
        ? "unknown"
        : agentScoped
          ? "agent_scoped"
          : undefined;
  let audienceTag =
    audience === undefined
      ? ""
      : ` [${sharedLive === undefined && !agentScoped ? "shared" : "shared-live"}: ${audience}${sharedLive === undefined && !agentScoped ? "" : audience === "agent_scoped" || !VALID_SHARED_SCOPES.has(audience) ? ANYONE_MAY_VIEW_NOTE : ""}]`;
  let { shared_live: sharedLive_2, ...rest } = isPlainObject(rawInput) ? rawInput : {};
  let phrasedInput = renderPhrases(
    options.statesAudience && SHARED_AUDIENCE_MODES.has(sharedLive_2) ? rest : rawInput,
  );
  let copyTag =
    typeof input.from_url === "string" || copies === true
      ? ` [copies from: ${classifierArtifactTargetFor(input.from_url, UNRECOGNIZED_ADDRESS)}]${classifierOwnershipMarks(input.from_url).replace("[ownership:", "[copy source:").replace("[artifact created", "[copy source: created")}`
      : "";
  let targetTag = isCreate
    ? ` \u2192 a new ${audience === undefined ? "private " : ""}artifact${actionName === "create_from_type" ? ` from the Artifact type ${classifierArtifactTargetFor(input.type_url, UNRECOGNIZED_ADDRESS)}` : ""}`
    : hasTarget
      ? ` \u2192 ${classifierArtifactTargetFor(input.url, UNRECOGNIZED_ADDRESS)}`
      : "";
  return `${ARTIFACT_TOOL_NAME} ${typeof input.action === "string" ? input.action : "tool"}${options.readOnly ? " [read-only]" : ""}${ownershipMarks}${audienceTag}${noticeTag}${copyTag}${targetTag}, as Claude wrote it: ${foldClassifierCodePhrases(sweepProvenanceMarker(normalizeNfkc(typeof phrasedInput === "string" ? phrasedInput : jsonStringify(phrasedInput)).replace(INVISIBLE_FORMAT_CHARS_RE, "?")).replace(DECISION_SURFACE_BRACKETS_RE, " "))}`;
}
//@ chunk-f2b3q7t8.js:18222-18380 placement
/**
 * 该调用是否要 mint 新的 artifact（create_from_type 或受保留字节限制的类型）。
 */
function makesANewArtifact(actionName, args) {
  let slug = isPlainObject(args) ? args.slug : undefined;
  let reservedArtifactId = typeof slug === "string" ? artifactIdOf(slug) : null;
  return (
    actionName === "create_from_type" ||
    (ACTION_WITH_RESERVED_MINT.has(actionName) &&
      (reservedArtifactId === null || getLiveState().reservedMints.has(reservedArtifactId)))
  );
}
//@ chunk-f2b3q7t8.js:18380-18423 placement
function createArtifactNotice(actionName, actionName_2) {
  return makesANewArtifact(actionName, actionName_2) ? getArtifactCreateNotice() : null;
}
//@ chunk-f2b3q7t8.js:18423-18658 placement
function createNoticeDecision(argName, input, context) {
  let artifactNotice = createArtifactNotice(argName, input);
  if (artifactNotice === null) return;
  let message = `Claude wants to create a new artifact on claude.ai. ${artifactNotice}`;
  return (
    personOnlyDecisionFor(context) ?? {
      behavior: "ask",
      message,
      ...PERSON_ONLY_DECISION,
      decisionReason: {
        type: "safetyCheck",
        reason: message,
        classifierApprovable: false,
      },
    }
  );
}
//@ chunk-f2b3q7t8.js:18658-18773 placement
function mcpTargetSlug(toolName, input) {
  let target = COUNTERPARTS[toolName]?.target;
  let stripped = stripTrailingInvoke(input);
  let rawSlug = target !== undefined && isPlainObject(stripped) ? stripped[target] : undefined;
  return typeof rawSlug === "string" ? artifactIdOf(rawSlug) : null;
}
//@ chunk-f2b3q7t8.js:18773-18980 placement
function ownPersonPublishedTarget(toolName, input) {
  let target = COUNTERPARTS[toolName]?.target;
  let rawSlug = target !== undefined && isPlainObject(input) ? input[target] : undefined;
  let slug = typeof rawSlug === "string" ? artifactIdOf(rawSlug) : null;
  let record = slug === null ? undefined : getLiveState().ownPublishedSlugs.get(slug);
  return slug !== null && record?.byPerson === true
    ? {
        slug,
        env: record.env,
      }
    : null;
}
//@ chunk-f2b3q7t8.js:18980-19122 placement
function isOwnedTarget(toolName, input) {
  let target = ownPersonPublishedTarget(toolName, input);
  if (target !== null && getArtifactPublishStubDir() !== null) return true;
  let shareEntry = target === null ? undefined : getShareEntry(target.slug);
  return shareEntry?.mode === "owner" && shareEntry.probeFailed !== true;
}
//@ chunk-f2b3q7t8.js:19122-19190 placement
/**
 * 自己发布的 artifact 且没有他人待处理评论。
 */
function isOwnPersonArtifactWithoutOtherComments(toolName, input) {
  let target = ownPersonPublishedTarget(toolName, input);
  return target !== null && isOwnedTarget(toolName, input) && !hasOtherCommentPending(target.slug);
}
//@ chunk-f2b3q7t8.js:19190-19358 placement
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
//@ chunk-f2b3q7t8.js:19358-25703 placement
/**
 * 为 artifacts MCP 工具（runner/laptop）安装权限与调用包装。
 */
function applyArtifactRules(serverName, entry) {
  let kind = isRunnerDynamicServer(serverName)
    ? "runner"
    : ARTIFACT_ACTION_TARGETS()?.isArtifactsMcpLaptopEntry(serverName) === true
      ? "laptop"
      : null;
  if (kind === null || entry.mcpInfo === undefined) return;
  if (kind === "runner") {
    entry.mcpInfo = {
      ...entry.mcpInfo,
      standsInForBuiltIn: true,
    };
    let originalCall = entry.call;
    entry.call = async (...args) => {
      let client = artifactsMcpClient();
      try {
        return await originalCall.apply(entry, args);
      } catch (error) {
        if (isArtifactForbiddenError(error)) getLiveState().mcpEntryRowNotServed = client ?? null;
        throw error;
      }
    };
  }
  let toolName = entry.mcpInfo.toolName;
  if (!Object.hasOwn(COUNTERPARTS, toolName)) {
    entry.requiresUserInteraction = () => true;
    entry.suppressesAlwaysAllowRule = () => true;
  }
  let suppressesAlwaysAllowRule = entry.suppressesAlwaysAllowRule;
  entry.suppressesAlwaysAllowRule = (input, context) =>
    dbWriteMayAsk(toolName, input) ||
    createArtifactNotice(toolName, input) !== null ||
    suppressesAlwaysAllowRule?.call(entry, input, context) === true;
  let ignoresWholeToolAllowRule = entry.ignoresWholeToolAllowRule;
  entry.ignoresWholeToolAllowRule = (input) =>
    dbWriteMayAsk(toolName, input) ||
    createArtifactNotice(toolName, input) !== null ||
    ignoresWholeToolAllowRule?.call(entry, input) === true;
  let toolLabel = `the Artifacts tool ${toolName}`;
  let { checkPermissions, permissionCheckFailureDecision, toAutoClassifierInput } = entry;
  entry.toAutoClassifierInput = (input) => {
    try {
      let copiedInput = isPlainObject(input)
        ? {
            ...input,
          }
        : {};
      return artifactClassifierLine(
        toolName,
        copiedInput,
        (innerInput) => toAutoClassifierInput.call(entry, isPlainObject(innerInput) ? innerInput : {}),
        {
          statesAudience: entry.inputJSONSchema?.properties?.shared_live !== undefined,
          readOnly: entry.isReadOnly(copiedInput),
        },
      );
    } catch {
      logForDebugging(`[artifacts-mcp] the classifier's line for ${toolName} could not be built`, {
        level: "warn",
      });
      return `${ARTIFACT_TOOL_NAME} ${COUNTERPARTS[toolName]?.action ?? "tool"}${ownershipClassifierMark({
        role: undefined,
      })} [shared: unknown]${noticeRequestedTag(pendingNoticeReadKind(toolName, {}))} \u2192 ${UNRECOGNIZED_ADDRESS}, as Claude wrote it: (unreadable arguments)`;
    }
  };
  let seenSlugs = new Set();
  let seenPaths = new Set();
  let memo = new Map();
  entry.hookMatcherFamilyNames = (input) => {
    let equivalent = dataToolEquivalent(artifactRuleToolRef, artifactInputFor(toolName, input).input);
    if (!Object.hasOwn(COUNTERPARTS, toolName))
      return [ARTIFACT_TOOL_NAME, ...Object.values(ARTIFACT_ACTION_TOOL_NAMES)];
    return equivalent === undefined
      ? [ARTIFACT_TOOL_NAME]
      : isArtifactToolsetSplit()
        ? [ARTIFACT_TOOL_NAME, equivalent.tool.name]
        : [equivalent.tool.name, ARTIFACT_TOOL_NAME];
  };
  entry.checkPermissions = async (input, context) => {
    let ownTarget = kind === "laptop" ? ownPersonPublishedTarget(toolName, input) : null;
    if (
      ownTarget !== null &&
      getArtifactPublishStubDir() === null &&
      artifactsMcpUnavailableReason(kind) === null &&
      respelledArgument(input) === undefined &&
      artifactRuleInputs(getToolPermissionContext(context), toolName, input, "deny") === null
    )
      await warmShareEntry(ownTarget, context, "artifacts-mcp-published");
    let permissionRefusal = checkArtifactPermission(
      kind,
      toolName,
      toolLabel,
      input,
      context,
      isRoutinePrivateFirstPublish(kind, toolName, input, context),
    );
    if (permissionRefusal !== undefined) return permissionRefusal;
    if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
      let noticeTarget = targetFromSlugArg(input);
      if (noticeTarget === null && isAutoReactNoticePendingFor(input))
        return {
          behavior: "deny",
          message: UNKNOWN_ARTIFACT_COMMENTS_MESSAGE,
          decisionReason: {
            type: "other",
            reason: UNKNOWN_ARTIFACT_COMMENTS_MESSAGE,
          },
        };
      let commentDecision =
        noticeTarget === null
          ? null
          : await commentReadDecision(input)?.decide(context, noticeTarget, {
              replyGrant: null,
              threadId: () =>
                isPlainObject(input) && typeof input.thread === "string" ? input.thread : undefined,
              lateDeny: () => checkArtifactPermission(kind, toolName, toolLabel, input, context) ?? null,
              askRule: (permissionContext) =>
                artifactRuleInputs(permissionContext, toolName, input, "ask")?.rule ??
                findAskRuleForTool(permissionContext, entry),
              updatedInput: () => {
                return;
              },
            });
      if (commentDecision !== null && commentDecision !== undefined) return commentDecision;
    }
    let toolDecision = Object.hasOwn(COUNTERPARTS, toolName)
      ? await checkPermissions.call(entry, input, context)
      : unknownMcpToolAsk(toolLabel);
    let refusal = checkArtifactPermission(
      kind,
      toolName,
      toolLabel,
      input,
      context,
      isRoutinePrivateFirstPublish(kind, toolName, input, context),
    );
    if (refusal !== undefined) return refusal;
    let askRule = artifactRuleInputs(getToolPermissionContext(context), toolName, input, "ask");
    let overridden = await applyAskRuleOverride(toolDecision, askRule?.rule ?? null, async () =>
      askRule === null ? "" : askRuleCoversMessage(askRule, toolLabel),
    );
    let createAsk =
      overridden.behavior === "deny" ? undefined : createNoticeDecision(toolName, input, context);
    if (createAsk !== undefined) {
      if (createAsk.behavior === "ask" && context.toolUseId !== undefined)
        rememberToolUseId(seenSlugs, context.toolUseId);
      return createAsk;
    }
    if (askRule !== null && overridden.behavior === "ask")
      return {
        ...overridden,
        suppressAlwaysAllowRule: true,
      };
    if (overridden.behavior !== "passthrough") return overridden;
    let toolPermissionContext = getToolPermissionContext(context);
    if (toolPermissionContext.mode === "plan") return overridden;
    if (isRoutinePrivateFirstPublish(kind, toolName, input, context)) {
      if (context.toolUseId === undefined) getLiveState().routineRunTainted = true;
      else seenPaths.add(context.toolUseId);
      return {
        behavior: "allow",
        updatedInput: input,
        decisionReason: {
          type: "other",
          reason: "A scheduled task's new artifact, private to the person",
        },
      };
    }
    let finalRefusal = checkArtifactPermission(kind, toolName, toolLabel, input, context);
    if (finalRefusal !== undefined) return finalRefusal;
    let targetSlug =
      toolName !== ARTIFACTS_MCP_REPLY_COMMENT_TOOL && WRITE_MCP_TOOLS.has(toolName)
        ? mcpTargetSlug(toolName, input)
        : null;
    let pendingSeq = targetSlug === null ? undefined : otherCommentPendingSeq(targetSlug);
    if (
      targetSlug !== null &&
      pendingSeq !== undefined &&
      context.toolUseId !== undefined &&
      consentAskCanReachUser(context) &&
      !isAutoClassifierActive(toolPermissionContext.mode) &&
      !isDelegatedObservationContext(context.agentContext)
    ) {
      memo.set(context.toolUseId, {
        slug: targetSlug,
        seq: pendingSeq,
      });
      let commentPrompt = `A comment that may not be the person's own is pending on this artifact, so ${toolLabel} needs their answer.`;
      return {
        behavior: "ask",
        message: commentPrompt,
        suppressAlwaysAllowRule: true,
        decisionReason: {
          type: "safetyCheck",
          reason: commentPrompt,
          classifierApprovable: false,
        },
      };
    }
    let dbAskReason = artifactDbAskReason(entry, input, context);
    if (dbAskReason !== undefined) return dbAskReason;
    if (!Object.hasOwn(COUNTERPARTS, toolName) || dbWriteMayAsk(toolName, input)) return overridden;
    if (
      kind === "laptop" &&
      (toolName === "publish_version" || toolName === "edit_version") &&
      isOwnPersonArtifactWithoutOtherComments(toolName, input) &&
      isPlainObject(input) &&
      (input.shared_live ?? "") === "" &&
      input.contract === undefined &&
      !isDelegatedObservationContext(context.agentContext) &&
      isStrictHumanTurn(context.messages)
    )
      return {
        behavior: "allow",
        updatedInput: input,
        decisionReason: {
          type: "other",
          reason: "Redeploy of an artifact already published this session",
        },
      };
    let action = COUNTERPARTS[toolName]?.action;
    if (PLAN_SAFE_MCP_TOOLS.has(action))
      return {
        behavior: "allow",
        updatedInput: input,
        decisionReason: {
          type: "other",
          reason: `The ${ARTIFACT_TOOL_NAME} tool asks nobody about this action`,
        },
      };
    let commentPrompt =
      WRITE_MCP_TOOLS.has(toolName) &&
      isPlainObject(input) &&
      (input.shared_live ?? "") === "" &&
      pendingSeq === undefined &&
      !isAutoClassifierActive(toolPermissionContext.mode) &&
      (toolPermissionContext.modeBeforeRewrite === undefined ||
        !isAutoClassifierActive(toolPermissionContext.modeBeforeRewrite))
        ? toolAlwaysAllowedRule(toolPermissionContext, artifactRuleToolRef)
        : null;
    return commentPrompt === null
      ? overridden
      : {
          behavior: "allow",
          updatedInput: input,
          decisionReason: {
            type: "rule",
            rule: commentPrompt,
          },
        };
  };
  entry.permissionCheckFailureDecision = (permissionFailure, input) => {
    let denial = checkArtifactPermission(kind, toolName, toolLabel, permissionFailure, input);
    if (denial !== undefined) return denial;
    if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL && isAutoReactNoticePendingFor(permissionFailure)) {
      let failureText = `${COMMENTS_READ_REFUSALS} and the permission check for this call couldn't finish. Try once more; if it fails again, tell the user the comments couldn't be read.`;
      return {
        behavior: "deny",
        message: failureText,
        decisionReason: {
          type: "other",
          reason: failureText,
        },
      };
    }
    let batchDeny = Object.hasOwn(COUNTERPARTS, toolName)
      ? (permissionCheckFailureDecision?.call(entry, permissionFailure, input) ??
        artifactDbAskReason(entry, permissionFailure, input))
      : unknownMcpToolAsk(toolLabel);
    let askDecision =
      batchDeny?.behavior === "deny" ? undefined : createNoticeDecision(toolName, permissionFailure, input);
    if (askDecision !== undefined) {
      if (askDecision.behavior === "ask" && input.toolUseId !== undefined)
        rememberToolUseId(seenSlugs, input.toolUseId);
      return askDecision;
    }
    let askRule = artifactRuleInputs(getToolPermissionContext(input), toolName, permissionFailure, "ask");
    if (askRule === null || batchDeny?.behavior === "deny") return batchDeny;
    return batchDeny?.behavior === "ask"
      ? {
          ...batchDeny,
          matchedAskRule: batchDeny.matchedAskRule ?? askRule.rule,
        }
      : {
          behavior: "ask",
          message: `${askRuleCoversMessage(askRule, toolLabel)} This tool's permission check couldn't finish, so approving covers this call only.`,
          suppressAlwaysAllowRule: true,
          decisionReason: {
            type: "rule",
            rule: askRule.rule,
          },
        };
  };
  let originalCall = entry.call;
  entry.call = async (slug, toolUseContext, a, b_2, argC, d) => {
    let cleared = toolUseContext.toolUseId !== undefined && seenPaths.delete(toolUseContext.toolUseId);
    let cachedSeq = toolUseContext.toolUseId === undefined ? undefined : memo.get(toolUseContext.toolUseId);
    if (toolUseContext.toolUseId !== undefined) memo.delete(toolUseContext.toolUseId);
    try {
      let callResult = await originalCall.call(
        entry,
        slug,
        toolUseContext,
        a,
        b_2,
        argC,
        markFrameCreateConfirmed(d, toolUseContext, seenSlugs),
      );
      if (
        cachedSeq !== undefined &&
        consentAskCanReachUser(toolUseContext) &&
        !isAutoClassifierActive(getToolPermissionContext(toolUseContext).mode)
      )
        settleOtherCommentPending(cachedSeq.slug, cachedSeq.seq);
      if (cleared) {
        let { read, shared } = shareFieldsFromResult(callResult.data);
        recordUnaskedRoutineFirstPublish(
          publishedArtifactFromResult(callResult.data)?.slug,
          read === undefined
            ? "unknown_outcome"
            : read === ""
              ? "empty"
              : deriveShareStatus(read, shared).mode,
        );
      }
      return callResult;
    } catch (error) {
      if (cleared) recordUnaskedRoutineFirstPublish(undefined, "unknown_outcome");
      throw error;
    }
  };
  let action = COUNTERPARTS[toolName]?.action;
  if (action === "delete_asset" || action === "delete") {
    let { checkPermissions, permissionCheckFailureDecision } = entry;
    entry.checkPermissions = async (checkPermissionsWrapped, input) =>
      askDefaultsToNo(entry, await checkPermissions.call(entry, checkPermissionsWrapped, input));
    entry.permissionCheckFailureDecision = (failureWrapped, input) => {
      let askDefaults = askDefaultsToNo(
        entry,
        permissionCheckFailureDecision?.call(entry, failureWrapped, input) ?? {
          behavior: "passthrough",
          message: `The permission check for ${toolLabel} couldn't finish.`,
          checkIncomplete: true,
        },
      );
      return askDefaults.behavior === "passthrough" ? undefined : askDefaults;
    };
  }
  if (toolName === ARTIFACTS_MCP_READ_COMMENTS_TOOL) {
    let originalCall = entry.call;
    entry.call = async (slugArg, toolUseContext, ...rest) => {
      let target = targetFromSlugArg(slugArg);
      if (target === null && isAutoReactNoticePendingFor(slugArg))
        throw new ArtifactInputError(UNKNOWN_ARTIFACT_COMMENTS_MESSAGE, "mcp_comments_slug_unread");
      let callResult =
        target === null ? undefined : commentReadDecision(slugArg)?.consume(toolUseContext, target.slug);
      if (callResult?.noticeStood === true && !callResult.judged)
        throw new ArtifactInputError(
          `${COMMENTS_READ_REFUSALS} and this call's permission check did not ask for it. Call read_comments again for this artifact so the user can be asked.`,
          "mcp_comments_notice_unchecked",
        );
      let accountUuid = kind === "laptop" ? await ownAccountUuid(toolUseContext.credentials) : null;
      let callResultRaw = await originalCall.call(entry, slugArg, toolUseContext, ...rest);
      let targetSlug = mcpTargetSlug(toolName, slugArg);
      if (targetSlug !== null && !isDelegatedObservationContext(toolUseContext.agentContext)) {
        let viewer =
          accountUuid === null
            ? {
                account: undefined,
                tokens: ownPrincipalTokens(),
              }
            : await ownAccountUuid(toolUseContext.credentials);
        let comments = commentsFromResult(
          callResultRaw.data,
          viewer,
          accountUuid === null ||
            (accountUuid.account !== undefined && accountUuid.account === viewer.account),
        );
        if (comments === null) recordUnaccountedComments(targetSlug, "fromRead");
        else recordJudgedComments(targetSlug, comments);
      }
      return callResultRaw;
    };
  }
}
//@ chunk-f2b3q7t8.js:25703-25983 placement
function askDefaultsToNo(entry, decision) {
  if (decision.behavior === "ask")
    return {
      ...decision,
      defaultToNo: true,
    };
  if (decision.behavior !== "passthrough" || entry.mcpInfo?.effectiveMaxPermission !== "ask") return decision;
  return {
    behavior: "ask",
    message: decision.message,
    suppressAlwaysAllowRule: true,
    defaultToNo: true,
    ...(decision.checkIncomplete === true && {
      checkIncomplete: true,
    }),
  };
}
//@ chunk-f2b3q7t8.js:25983-25993 placement
var MAX_REMEMBERED_TOOL_USE_IDS = 64;
//@ chunk-f2b3q7t8.js:25993-26086 placement
/**
 * 记住被询问过的 toolUseId，超过上限逐出最早的。
 */
function rememberToolUseId(set, toolUseId) {
  set.add(toolUseId);
  let oldest = set.values().next().value;
  if (set.size > MAX_REMEMBERED_TOOL_USE_IDS && oldest !== undefined) set.delete(oldest);
}
//@ chunk-f2b3q7t8.js:26086-26214 placement
function markFrameCreateConfirmed(result, context, seenPaths) {
  return context.toolUseId !== undefined &&
    seenPaths.delete(context.toolUseId) &&
    isUserDecidedToolUse(context)
    ? {
        ...result,
        mcpCallMeta: {
          ...result?.mcpCallMeta,
          [ANTHROPIC_FRAMECREATECONFIRMED]: true,
        },
      }
    : result;
}
//@ chunk-f2b3q7t8.js:26214-26346 placement
function classifierOwnershipMarks(url) {
  let slug = typeof url === "string" ? artifactIdOf(url) : null;
  let shareEntry = slug === null ? undefined : getShareEntry(slug);
  return `${
    isSessionWrittenArtifact(url)
      ? SESSION_CREATED_CLASSIFIER_MARK
      : ownershipClassifierMark(
          isSomeoneElses(shareEntry)
            ? shareEntry
            : {
                role: undefined,
              },
        )
  }${otherOrgClassifierMark(shareEntry)}`;
}
export {
  foldedArgumentName,
  mayHoldOthersWriting,
  othersStoredTextIsTold,
  respelledArgument,
  NOT_PUBLIC_BY_THE_SERVERS_MARK,
  createNoticeDecision,
  makesANewArtifact,
  COUNTERPARTS,
  applyArtifactRules,
  artifactClassifierLine,
  artifactIdOf,
  artifactInputFor,
  artifactRuleFor,
};
