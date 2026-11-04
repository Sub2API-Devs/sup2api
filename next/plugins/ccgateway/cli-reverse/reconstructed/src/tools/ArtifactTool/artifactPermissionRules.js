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
import { MCP_SERVER_NOT_ALLOWED_MESSAGE, artifactsMcpClient } from "../../services/mcp/client.js";
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
import { logForDebugging } from "../../utils/debug.js";
import { warmShareEntry } from "../../services/artifacts/shareEntryWarm.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { isStrictHumanTurn } from "../../utils/turnOrigin.js";
import { ownAccountUuid, ownPrincipalTokens } from "../../services/artifacts/comments/commentAuthorship.js";
import { ANTHROPIC_FRAMECREATECONFIRMED } from "../../services/artifacts/frameApi.js";

//@ chunk-7zr1t9gr.js:360-667 placement
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
//@ chunk-p5cstt88.js:6973-7175 placement
var DATA_RULE_FIELDS = new Set(["db_op", "collection", "doc_id", "query", "data", "writes", "as_level"]);
var ENDPOINT_RULE_FIELDS = new Set(["method", "path", "body", "body_file", "mode", "script"]);
var DATA_RULE_ACTIONS = ["read_db", "write_db", "call_endpoint", "run_script"];
//@ chunk-p5cstt88.js:7175-7391 placement
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
//@ chunk-p5cstt88.js:7391-10137 placement
/**
 * artifact MCP 动作到目标字段的映射表。
 */
var ARTIFACT_ACTION_TARGETS = () => require("../../services/artifacts/artifactsMcpLaptop.js");
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
function normalizeArtifactSlug(value) {
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
//@ chunk-p5cstt88.js:10972-12919 placement
/**
 * 规范化 artifact 调用输入（目标、来源、拷贝）。
 */
function normalizeArtifactInput(verb, input, hints) {
  let known = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, verb);
  let targets = known
    ? ARTIFACT_ACTION_TARGETS_MAP[verb]
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
    let slug = normalizeArtifactSlug(rawValue);
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
//@ chunk-p5cstt88.js:12919-12982 placement
/**
 * 按谓词找第一个匹配项的值。
 */
function findFirstMatch(contentRulesMapForToolName, predicate) {
  for (let [key, rule] of contentRulesMapForToolName) if (predicate(key)) return rule;
  return null;
}
//@ chunk-p5cstt88.js:12982-13098 placement
function findRuleForFields(contentRulesMapForToolName, fieldNames) {
  for (let [key, rule] of contentRulesMapForToolName) {
    let index = key.indexOf(":");
    if (index > 0 && fieldNames.includes(key.slice(0, index).trim())) return rule;
  }
  return null;
}
//@ chunk-p5cstt88.js:13098-13250 placement
function withoutNarrowingDenyRules(context) {
  if ((context.alwaysDenyRules.toolsNarrowing?.length ?? 0) === 0) return context;
  let { toolsNarrowing, ...rest } = context.alwaysDenyRules;
  return {
    ...context,
    alwaysDenyRules: rest,
  };
}
//@ chunk-p5cstt88.js:13250-13296 placement
var PLACEHOLDER_SLUG = "00000000-0000-4000-8000-000000000000";
//@ chunk-p5cstt88.js:13296-14937 placement
/**
 * 用权限规则匹配 artifact 调用。
 */
function matchArtifactRule(context, normalized, behavior) {
  let { action, ...fields } = normalized.input;
  let url = normalized.input.url;
  let slug = typeof url === "string" ? normalizeArtifactSlug(url) : null;
  let fromUrl = normalized.input.from_url;
  let sourceSlug = typeof fromUrl === "string" ? normalizeArtifactSlug(fromUrl) : null;
  let rule =
    (behavior === "deny"
      ? getDenyRuleForTool(withoutNarrowingDenyRules(context), artifactRuleToolRef)
      : getAskRuleForTool(context, artifactRuleToolRef)) ??
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
            : getAskRuleForTool(context, toolRef)));
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
//@ chunk-p5cstt88.js:14937-15249 placement
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
//@ chunk-p5cstt88.js:15249-15801 placement
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
    let listInput = matchArtifactRule(context, normalizeArtifactInput(toolName, file, index), behavior);
    if (listInput !== null) return listInput;
  }
  return null;
}
//@ chunk-p5cstt88.js:15801-15915 placement
function listDataToolNames() {
  let values = Object.values(ARTIFACT_ACTION_TOOL_NAMES);
  return values.length < 2 ? values.join("") : `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`;
}
//@ chunk-p5cstt88.js:15915-16201 placement
function unreadCallRuleNote(why) {
  return why === "unread"
    ? " Claude Code couldn't tell what this call names or does, so the rule applies to it."
    : why === "unknown"
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
var KNOWN_MCP_ARG_NAMES_UPPER = new Set([...KNOWN_MCP_ARG_NAMES].map((name) => name.toUpperCase()));
//@ chunk-p5cstt88.js:16398-16597 placement
function findMisspelledArgName(input) {
  if (!isPlainObject(input)) return;
  return [input, ...[input.files, input.ops].flat().filter(isPlainObject)]
    .flatMap(Object.keys)
    .find(
      (key) =>
        !KNOWN_MCP_ARG_NAMES.has(key) &&
        KNOWN_MCP_ARG_NAMES_UPPER.has(
          key.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().toUpperCase(),
        ),
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
function allPublishFilesAutoReadable(input, toolPermissionContext) {
  let filePaths = normalizeArtifactInput("publish_files", input).input.file_paths;
  return (
    Array.isArray(filePaths) &&
    filePaths.every(
      (filePath) =>
        typeof filePath === "string" && readWouldBeAutoAllowedForPath(filePath, toolPermissionContext),
    )
  );
}
//@ chunk-p5cstt88.js:16913-17176 placement
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
//@ chunk-p5cstt88.js:17176-18899 placement
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
  let misspelledArgName = findMisspelledArgName(input);
  if (misspelledArgName !== undefined) {
    let message = `${displayToolName} takes no argument spelled ${refusalEcho(misspelledArgName)}. Spell argument names exactly as the tool lists them.`;
    return {
      behavior: "deny",
      message,
      decisionReason: {
        type: "other",
        reason: message,
      },
    };
  }
  let targets = ARTIFACT_ACTION_TARGETS_MAP[toolName];
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
  let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
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
//@ chunk-p5cstt88.js:18899-19130 placement
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
//@ chunk-p5cstt88.js:19130-19800 placement
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
//@ chunk-p5cstt88.js:19800-20083 placement
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
      ...getAskRules(getToolPermissionContext(context)),
      ...getDenyRules(getToolPermissionContext(context)),
    ].some(
      (isFirstPublish) =>
        toolMatchesRule(getToolPermissionContext(context), artifactRuleToolRef, isFirstPublish) ||
        Object.values(ARTIFACT_ACTION_TOOL_NAMES).includes(isFirstPublish.ruleValue.toolName),
    )
  );
}
//@ chunk-p5cstt88.js:20083-20235 placement
function askRuleCoversMessage(denial, subject) {
  return `The ${refusalEcho(formatPermissionRule(denial.rule.ruleValue))} ask rule from ${getSettingSourceDisplayNameLowercase(denial.rule.source)} covers ${subject}, so this call needs your approval.${unreadCallRuleNote(denial.why)}`;
}
//@ chunk-p5cstt88.js:20235-20340 placement
function targetFromSlugArg(input) {
  let slug =
    isPlainObject(input) && typeof input.slug === "string" ? normalizeArtifactSlug(input.slug) : null;
  return slug === null
    ? null
    : {
        slug,
        env: claudeAiEnvironment(),
      };
}
//@ chunk-p5cstt88.js:20340-20398 placement
/**
 * 该 artifact（或任意 artifact）是否有待处理的自动反应通知。
 */
function isAutoReactNoticePendingFor(input) {
  let target = targetFromSlugArg(input);
  return target === null ? anyAutoReactNoticePending() : hasAutoReactNoticePending(target.slug);
}
//@ chunk-p5cstt88.js:20398-20447 placement
/**
 * 评论读取的决策入口（有待处理通知时用已载入规则）。
 */
function commentReadDecision(input) {
  return isAutoReactNoticePendingFor(input) ? personOnlyRegistry.loaded() : personOnlyRegistry.read;
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
function pendingNoticeReadKind(toolName, input) {
  let { action, readsBack } = ARTIFACT_ACTION_TARGETS_MAP[toolName] ?? {};
  let kind =
    readsBack === true ? "edit" : action === "read_db" ? "rows" : action === "comments" ? "comments" : null;
  return kind !== null && isAutoReactNoticePendingFor(input) ? kind : null;
}
//@ chunk-p5cstt88.js:21006-21189 placement
function dbWriteMayAsk(toolName, input) {
  return (
    ASSET_MUTATING_ACTIONS.has(ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action) ||
    toolName === "declare_capabilities" ||
    ARTIFACT_ACTION_TARGETS_MAP[toolName]?.source !== undefined ||
    (ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action === "publish" &&
      isCoworkFramePublishSession() &&
      !isOwnPersonArtifactWithoutOtherComments(toolName, input)) ||
    !isPlainObject(input) ||
    !VALID_SHARED_SCOPES.has(input.shared_live) ||
    pendingNoticeReadKind(toolName, input) !== null
  );
}
//@ chunk-p5cstt88.js:21189-21403 placement
var SHARED_AUDIENCE_MODES = new Set(["users", "org", "others", "agent_scoped", "public"]);
var UNRECOGNIZED_ADDRESS = "(unrecognized address)";
var ANYONE_MAY_VIEW_NOTE =
  ", anyone may be a viewer, not only the user's colleagues: internal code and infrastructure detail count as sensitive";
//@ chunk-p5cstt88.js:21403-21539 placement
function isSessionWrittenArtifact(url) {
  let slug = typeof url === "string" ? normalizeArtifactSlug(url) : null;
  let record = slug === null ? undefined : getLiveState().ownCreatedSlugs.get(slug);
  return record?.wrotePage === true && record.env === claudeAiEnvironment();
}
//@ chunk-p5cstt88.js:21539-21757 placement
function noticeRequestedTag(kind) {
  return kind === null
    ? ""
    : ` [requested after a new-comments notification${kind === "rows" ? ": rows are written by artifact viewers" : kind === "comments" ? ": the comment text it ingests is written by artifact viewers" : ""}]`;
}
//@ chunk-p5cstt88.js:21757-22880 placement
/**
 * 检查 artifact 读取（共享、未读评论）。
 */
function checkArtifactRead(actionName, rawInput, renderPhrases, options) {
  let { input, unread, copies } = normalizeArtifactInput(actionName, rawInput);
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
//@ chunk-p5cstt88.js:22880-23045 placement
function createArtifactNotice(toolName, input) {
  let slug = isPlainObject(input) ? input.slug : undefined;
  let normalizedSlug = typeof slug === "string" ? normalizeArtifactSlug(slug) : null;
  return toolName === "create_from_type" ||
    (PUBLISH_ACTION_NAMES.has(toolName) &&
      (normalizedSlug === null || getLiveState().reservedMints.has(normalizedSlug)))
    ? getArtifactCreateNotice()
    : null;
}
//@ chunk-p5cstt88.js:23045-23279 placement
function createArtifactAsk(toolName, input, context) {
  let artifactNotice = createArtifactNotice(toolName, input);
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
//@ chunk-p5cstt88.js:23279-23391 placement
function mcpTargetSlug(toolName, input) {
  let target = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.target;
  let stripped = stripTrailingInvoke(input);
  let rawSlug = target !== undefined && isPlainObject(stripped) ? stripped[target] : undefined;
  return typeof rawSlug === "string" ? normalizeArtifactSlug(rawSlug) : null;
}
//@ chunk-p5cstt88.js:23391-23595 placement
function ownPersonPublishedTarget(toolName, input) {
  let target = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.target;
  let rawSlug = target !== undefined && isPlainObject(input) ? input[target] : undefined;
  let slug = typeof rawSlug === "string" ? normalizeArtifactSlug(rawSlug) : null;
  let record = slug === null ? undefined : getLiveState().ownPublishedSlugs.get(slug);
  return slug !== null && record?.byPerson === true
    ? {
        slug,
        env: record.env,
      }
    : null;
}
//@ chunk-p5cstt88.js:23595-23737 placement
function isOwnedTarget(toolName, input) {
  let target = ownPersonPublishedTarget(toolName, input);
  if (target !== null && getArtifactPublishStubDir() !== null) return true;
  let shareEntry = target === null ? undefined : getShareEntry(target.slug);
  return shareEntry?.mode === "owner" && shareEntry.probeFailed !== true;
}
//@ chunk-p5cstt88.js:23737-23806 placement
/**
 * 自己发布的 artifact 且没有他人待处理评论。
 */
function isOwnPersonArtifactWithoutOtherComments(toolName, input) {
  let target = ownPersonPublishedTarget(toolName, input);
  return target !== null && isOwnedTarget(toolName, input) && !hasOtherCommentPending(target.slug);
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
  if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)) {
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
      return checkArtifactRead(
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
      return `${ARTIFACT_TOOL_NAME} ${ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action ?? "tool"}${ownershipClassifierMark(
        {
          role: undefined,
        },
      )} [shared: unknown]${noticeRequestedTag(pendingNoticeReadKind(toolName, {}))} \u2192 ${UNRECOGNIZED_ADDRESS}, as Claude wrote it: (unreadable arguments)`;
    }
  };
  let seenSlugs = new Set();
  let seenPaths = new Set();
  let memo = new Map();
  entry.hookMatcherFamilyNames = (input) => {
    let equivalent = dataToolEquivalent(artifactRuleToolRef, normalizeArtifactInput(toolName, input).input);
    if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName))
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
      findMisspelledArgName(input) === undefined &&
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
                getAskRuleForTool(permissionContext, entry),
              updatedInput: () => {
                return;
              },
            });
      if (commentDecision !== null && commentDecision !== undefined) return commentDecision;
    }
    let toolDecision = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)
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
    let createAsk = overridden.behavior === "deny" ? undefined : createArtifactAsk(toolName, input, context);
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
    if (!Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName) || dbWriteMayAsk(toolName, input))
      return overridden;
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
    let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
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
    let batchDeny = Object.hasOwn(ARTIFACT_ACTION_TARGETS_MAP, toolName)
      ? (permissionCheckFailureDecision?.call(entry, permissionFailure, input) ??
        artifactDbAskReason(entry, permissionFailure, input))
      : unknownMcpToolAsk(toolLabel);
    let askDecision =
      batchDeny?.behavior === "deny" ? undefined : createArtifactAsk(toolName, permissionFailure, input);
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
  entry.call = async (slug, toolUseContext, a, b, argC, d) => {
    let cleared = toolUseContext.toolUseId !== undefined && seenPaths.delete(toolUseContext.toolUseId);
    let cachedSeq = toolUseContext.toolUseId === undefined ? undefined : memo.get(toolUseContext.toolUseId);
    if (toolUseContext.toolUseId !== undefined) memo.delete(toolUseContext.toolUseId);
    try {
      let callResult = await originalCall.call(
        entry,
        slug,
        toolUseContext,
        a,
        b,
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
  let action = ARTIFACT_ACTION_TARGETS_MAP[toolName]?.action;
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
//@ chunk-p5cstt88.js:30311-30591 placement
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
//@ chunk-p5cstt88.js:30591-30601 placement
var MAX_REMEMBERED_TOOL_USE_IDS = 64;
//@ chunk-p5cstt88.js:30601-30694 placement
/**
 * 记住被询问过的 toolUseId，超过上限逐出最早的。
 */
function rememberToolUseId(set, toolUseId) {
  set.add(toolUseId);
  let oldest = set.values().next().value;
  if (set.size > MAX_REMEMBERED_TOOL_USE_IDS && oldest !== undefined) set.delete(oldest);
}
//@ chunk-p5cstt88.js:30694-30822 placement
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
//@ chunk-p5cstt88.js:30822-30952 placement
function classifierOwnershipMarks(url) {
  let slug = typeof url === "string" ? normalizeArtifactSlug(url) : null;
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
  ARTIFACT_ACTION_TARGETS_MAP,
  applyArtifactRules,
  checkArtifactRead,
  normalizeArtifactSlug,
  normalizeArtifactInput,
  matchArtifactRule,
};
