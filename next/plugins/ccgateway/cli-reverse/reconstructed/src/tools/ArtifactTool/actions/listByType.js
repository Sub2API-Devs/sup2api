/**
 * tools/ArtifactTool/actions/listByType.ts
 *
 * 2.1.316 新增：按类型列出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (20)
 * attribution: placement 20
 */
import {
  canonicalArtifactTargetFor,
  listScopeFrom,
  classifierArtifactTargetFor,
  DEFAULT_LIST_LIMIT,
  TYPE_LIST_LIMIT_MAX,
} from "../artifactUrls.js";
import { typeOf, typeUrlOf, notTypeUrlError } from "../permissions/dbWriteInputs.js";
import { quoteForDecisionSurface } from "../permissions/consentStamps.js";
import { TITLE_MAX_CHARS, DESIGN_SYSTEM_TYPE_TITLE, formatArtifactListEntry } from "./list.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { plural } from "../../../utils/stringUtils.js";
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import {
  typeNameKey,
  typeNameWithoutQuotes,
  describeArtifactType,
  typeNameMatchKey,
  findArtifactTypeByName,
  listTypeInstances,
  typeTitleMatchKeys,
} from "../../../services/artifacts/artifactTypes.js";
import { validateSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { ArtifactInputError } from "../constants.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { parseArtifactUrlOrThrow, formatRuleForDisplay } from "../permissions/artifactPermissionRules.js";
import {
  getDenyAndAskUrlRules,
  getRuleExactDomain,
  filterRulesMatchingUrls,
  matchesWildcardPattern,
} from "../permissions/urlRules.js";
import { artifactViewerUrl } from "../../../services/artifacts/publishInstanceFiles.js";
import { findUrlContentRule } from "../permissions/ruleTarget.js";
import { typeRowTitle } from "../typeCatalog.js";
import { sweepScalarField } from "../../../services/artifacts/artifactPeople.js";
import { clearQuickstartNoneFlags } from "../designSystems.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-xzmy9dn4.js:107149-107264 placement
function describeTypeTarget(input, classifierArtifactTargetFor = canonicalArtifactTargetFor) {
  let typeName = typeOf(input);
  return typeName !== undefined
    ? `the type named ${quoteForDecisionSurface(typeName, TITLE_MAX_CHARS)}`
    : classifierArtifactTargetFor(typeUrlOf(input), "(unrecognized address)");
}
//@ chunk-xzmy9dn4.js:107264-107317 placement
/**
 * 取列表 scope，未设置时按 all 处理。
 */
function listScopeOrDefault(input) {
  return input.scope === undefined ? "all" : listScopeFrom(input);
}
//@ chunk-xzmy9dn4.js:107317-107595 placement
var LIST_BY_TYPE_UNAVAILABLE = "listing the Artifacts made from a type is not available in this session";
var TYPE_AND_TYPE_URL_BOTH = "`type` and `type_url` both name the type to list \u2014 pass one of them";
var EMPTY_TYPE_NAME =
  '`type` is empty \u2014 pass an Artifact type\'s name (as action "list_types" shows it), or its link as `type_url`';
//@ chunk-xzmy9dn4.js:107595-107730 placement
function noTypeNamedMessage(typeName) {
  return `no Artifact type named ${jsonStringify(typeName)} is published for this account \u2014 action "list_types" shows the ones that are`;
}
//@ chunk-xzmy9dn4.js:107730-107972 placement
function typeNotFoundPartialMessage(typeName, listed) {
  return `none of the ${listed} Artifact ${plural(listed, "type")} read is named ${jsonStringify(typeName)} exactly, and the listing could not be read completely \u2014 action "list_types" shows what is published; pass the type's link from there as \`type_url\``;
}
//@ chunk-xzmy9dn4.js:107972-108193 placement
function ambiguousTypeNameMessage(typeName, named) {
  return `${named.length} published Artifact types are named ${jsonStringify(typeName)}: ${named.map((type) => `${jsonStringify(type.title)} \u2014 ${type.typeUrl}`).join("; ")} \u2014 pass the one you mean by its link, as \`type_url\` instead of \`type\``;
}
//@ chunk-xzmy9dn4.js:108193-108254 placement
var LIST_BY_TYPE_ALLOWED_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xzmy9dn4.js:108193", () => {
  LIST_BY_TYPE_ALLOWED_KEYS = new Set(["action", "type", "type_url", "scope", "limit"]);
});
//@ chunk-xzmy9dn4.js:108254-109013 placement
/**
 * 校验 list + type/type_url：类型目录需开启，只能带 scope/limit，type 与 type_url 只能二选一，type 名不能为空，type_url 必须是合法类型链接。
 */
function validateListByTypeInput(input) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== true)
    return {
      result: false,
      message: LIST_BY_TYPE_UNAVAILABLE,
      errorCode: 8,
    };
  let filtered = Object.keys(input).filter(
    (key) => !LIST_BY_TYPE_ALLOWED_KEYS.has(key) && input[key] !== undefined,
  );
  if (filtered.length > 0)
    return {
      result: false,
      message: `action "list" with \`type\` or \`type_url\` takes only \`scope\` and \`limit\` \u2014 remove ${filtered.join(", ")}.${getLiveState().frozenArtifactTypes?.typeCreateOn === true ? " To start a new Artifact from the type, omit `action` and pass its `type_url`." : ""}`,
      errorCode: 8,
    };
  let typeName = typeOf(input);
  let typeUrl = typeUrlOf(input);
  if (typeName !== undefined && typeUrl !== undefined)
    return {
      result: false,
      message: TYPE_AND_TYPE_URL_BOTH,
      errorCode: 8,
    };
  if (typeName !== undefined)
    return typeNameKey(typeNameWithoutQuotes(typeName)) === ""
      ? {
          result: false,
          message: EMPTY_TYPE_NAME,
          errorCode: 8,
        }
      : {
          result: true,
        };
  let urlCheck = validateSessionArtifactUrl(typeUrl ?? "", {
    notUrlMessage: notTypeUrlError(typeUrl ?? ""),
  });
  if (!urlCheck.ok)
    return {
      result: false,
      message: urlCheck.message,
      errorCode: urlCheck.errorCode,
    };
  return {
    result: true,
  };
}
//@ chunk-xzmy9dn4.js:109013-109233 placement
/**
 * 按类型列出 Artifact 为只读操作的说明，以及会把组织内他人发布的标题与链接读入对话的提示。
 */
var LIST_BY_TYPE_READ_ONLY_REASON =
  "Listing the Artifacts made from a type that the user can open is a read-only action";
var OTHERS_TITLES_READ_CLAUSE =
  "titles, descriptions and links of Artifacts other people in the organization published will be read into the conversation";
//@ chunk-xzmy9dn4.js:109233-109453 placement
/**
 * 按类型列出 Artifact 的分类器摘要（含范围与目标类型）。
 */
function describeListByTypeSummary(input) {
  let scope = listScopeOrDefault(input);
  return `list artifacts made from a type (read-only, scope: ${scope}${scope === "mine" ? "" : " \u2014 includes titles and descriptions of artifacts other users in the organization published"}): ${describeTypeTarget(input, classifierArtifactTargetFor)}`;
}
//@ chunk-xzmy9dn4.js:109453-109779 placement
/**
 * 按类型列出 Artifact 的权限询问描述：区分只列自己的、组织内他人发布的、或用户能打开的（只读）。
 */
function describeListByTypeAsk(input) {
  let scope = listScopeOrDefault(input);
  let target = describeTypeTarget(input);
  return scope === "mine"
    ? `List the user's own Artifacts made from one Artifact type (${target}) \u2014 titles and links (read-only).`
    : `List the Artifacts made from one Artifact type (${target}) that ${scope === "shared" ? "other people in the organization published" : "the user can open"} \u2014 ${OTHERS_TITLES_READ_CLAUSE} (read-only).`;
}
//@ chunk-xzmy9dn4.js:109779-109943 placement
/**
 * 按类型列出 Artifact 的简短描述（范围非 mine 时附他人内容读入的提示）。
 */
function describeListByTypeShort(input) {
  let scope = listScopeOrDefault(input);
  return scope === "mine"
    ? "list artifacts made from a type (read-only)"
    : `list artifacts made from a type (read-only, scope: ${scope} \u2014 ${OTHERS_TITLES_READ_CLAUSE})`;
}
//@ chunk-xzmy9dn4.js:109943-113849 placement
async function listArtifactsByType(input, context, tool) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== true)
    throw new ArtifactInputError(LIST_BY_TYPE_UNAVAILABLE, "list_type_unavailable");
  let scope = listScopeOrDefault(input);
  let typeName = typeOf(input);
  let requestOptions = {
    signal: context.abortController.signal,
    credentials: context.credentials,
  };
  let toolPermissionContext = getToolPermissionContext(context);
  let sweptTypeName;
  let slug;
  if (typeName === undefined) {
    slug = parseArtifactUrlOrThrow(typeUrlOf(input)).slug;
    let listInput = {
      action: "list",
      type_url: typeUrlOf(input),
    };
    let initialRule = getDenyAndAskUrlRules(toolPermissionContext, tool)[0];
    if (initialRule !== undefined) {
      let typeDetail = await describeArtifactType(slug, requestOptions);
      if (typeDetail.err !== null) {
        if (typeDetail.reason === "ccr_credential_refused" || typeDetail.reason === "relay_unserved")
          return typeListUnavailableResult(
            {
              type_url: artifactViewerUrl(slug),
            },
            scope,
          );
        throw new ArtifactInputError(typeDetail.err, `list_type_describe_${typeDetail.reason}`);
      }
      let { title } = typeDetail.detail;
      if (typeDetail.detail.untitled || typeNameMatchKey(title) === "")
        throw new ArtifactInputError(
          `This link's Artifact type has no readable name, so it cannot be checked against the permission rule ${formatRuleForDisplay(initialRule)}. Nothing was listed; tell the user.`,
          "list_type_rule_unresolved",
        );
      let toolPermissionContext_2 = getToolPermissionContext(context);
      assertListTypeNotDenied(toolPermissionContext_2, tool, title);
      assertTypeListNotDenied(toolPermissionContext_2, listInput, title);
      let askTypeRule = findAskTypeRule(toolPermissionContext_2, toolPermissionContext, tool, title);
      if (askTypeRule !== undefined && findUrlContentRule(toolPermissionContext, listInput, "ask") === null) {
        let ruleTypeName = getRuleExactDomain(askTypeRule) ?? title;
        let artifactTypeByName = await findArtifactTypeByName(ruleTypeName, requestOptions);
        if (artifactTypeByName.err !== null)
          throw new ArtifactInputError(artifactTypeByName.err, `list_type_${artifactTypeByName.reason}`);
        let isSameType = artifactTypeByName.found?.typeUrl === artifactViewerUrl(slug);
        let quotedTitle = jsonStringify(typeRowTitle(title));
        if (
          !isSameType &&
          artifactTypeByName.found === undefined &&
          "partial" in artifactTypeByName &&
          artifactTypeByName.partial
        )
          throw new ArtifactInputError(
            `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${quotedTitle} type is listed, and the type listing could not be read completely to find the name to ask under, so nothing was listed \u2014 retry.`,
            "list_type_name_unread",
          );
        throw isSameType
          ? new ArtifactInputError(
              typeRuleAskNote(askTypeRule, quotedTitle, ruleTypeName),
              "list_type_rule_ask_retry",
            )
          : new ArtifactInputError(
              `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${quotedTitle} type is listed, and this type can be listed only by its link, where nothing can ask the user, so nothing was listed. Tell the user; an ask rule naming the link (\`type_url:\`) would let them be asked.`,
              "list_type_rule_ask_unaskable",
            );
      }
    }
    let toolPermissionContext_2 = getToolPermissionContext(context);
    assertTypeListNotDenied(toolPermissionContext_2, listInput);
    let lateAskRule =
      findUrlContentRule(toolPermissionContext, listInput, "ask") === null
        ? findUrlContentRule(toolPermissionContext_2, listInput, "ask")
        : null;
    if (lateAskRule !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(lateAskRule)} asks the user before this type is listed, and it was added after this call's permission check ran, so nothing was listed. List it again the same way to have the user asked.`,
        "list_type_rule_ask_retry",
      );
  } else {
    sweptTypeName = sweepScalarField(typeName.trim(), TITLE_MAX_CHARS);
    if (typeUrlOf(input) !== undefined || typeNameKey(typeNameWithoutQuotes(typeName)) === "")
      throw new ArtifactInputError(
        "pass the type as `type` (its name) or `type_url` (its link) \u2014 exactly one",
        "list_type_name_bad",
      );
    let artifactTypeByName = await findArtifactTypeByName(typeName, requestOptions);
    if (artifactTypeByName.err !== null)
      throw new ArtifactInputError(artifactTypeByName.err, `list_type_${artifactTypeByName.reason}`);
    if (artifactTypeByName.found === undefined) {
      if ("unavailable" in artifactTypeByName)
        return typeListUnavailableResult(
          {
            type: sweptTypeName,
          },
          scope,
        );
      throw new ArtifactInputError(
        artifactTypeByName.named.length > 0
          ? ambiguousTypeNameMessage(sweptTypeName, artifactTypeByName.named)
          : artifactTypeByName.partial
            ? typeNotFoundPartialMessage(sweptTypeName, artifactTypeByName.listed)
            : noTypeNamedMessage(sweptTypeName),
        artifactTypeByName.named.length > 0
          ? "list_type_name_ambiguous"
          : artifactTypeByName.partial
            ? "list_type_name_unread"
            : "list_type_name_unknown",
      );
    }
    sweptTypeName = artifactTypeByName.found.title;
    let toolPermissionContext_2 = getToolPermissionContext(context);
    let matchKey = typeNameMatchKey(typeName);
    let listInput = {
      action: "list",
      type_url: artifactTypeByName.found.typeUrl,
    };
    let quotedTitle = jsonStringify(typeRowTitle(artifactTypeByName.found.title));
    assertListTypeNotDenied(toolPermissionContext_2, tool, artifactTypeByName.found.title, matchKey);
    assertTypeListNotDenied(toolPermissionContext_2, listInput, artifactTypeByName.found.title);
    let askTypeRule = findAskTypeRule(
      toolPermissionContext_2,
      toolPermissionContext,
      tool,
      artifactTypeByName.found.title,
      matchKey,
    );
    if (askTypeRule !== undefined)
      throw new ArtifactInputError(
        typeRuleAskNote(
          askTypeRule,
          quotedTitle,
          getRuleExactDomain(askTypeRule) ?? artifactTypeByName.found.title,
        ),
        "list_type_rule_ask_retry",
      );
    let lateAskRule = hasAskRuleForUrl(toolPermissionContext, tool, artifactTypeByName.found.title, matchKey)
      ? null
      : findUrlContentRule(toolPermissionContext_2, listInput, "ask");
    if (lateAskRule !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(lateAskRule)} asks the user before the ${quotedTitle} type is listed, and the user is asked only when the call names the type by that link, so nothing was listed. To have the user asked, list it again with \`type_url\` set to ${artifactTypeByName.found.typeUrl} instead of \`type\`.`,
        "list_type_rule_ask_retry",
      );
    slug = parseArtifactUrlOrThrow(artifactTypeByName.found.typeUrl).slug;
  }
  let listing = await listTypeInstances(slug, {
    scope,
    ...requestOptions,
  });
  if (listing.err !== null) throw new ArtifactInputError(listing.err, `list_type_${listing.reason}`);
  let designSystemTypeSlug = getLiveState().designSystemTypeSlug;
  if (
    listing.rows.length > 0 &&
    ((designSystemTypeSlug !== undefined && slug === designSystemTypeSlug) ||
      sweptTypeName === DESIGN_SYSTEM_TYPE_TITLE)
  )
    clearQuickstartNoneFlags();
  let min = Math.min(Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT), TYPE_LIST_LIMIT_MAX);
  let sliced = listing.rows.slice(0, min);
  return {
    data: {
      type_instances: {
        ...(sweptTypeName !== undefined && {
          type: sweptTypeName,
        }),
        type_url: artifactViewerUrl(slug),
        scope,
        instances: sliced.map((row) => ({
          title: row.title,
          url: row.url,
          ...(row.description !== undefined && {
            description: row.description,
          }),
          ...(row.createdAt !== undefined && {
            created_at: row.createdAt,
          }),
          rel: row.rel,
          ...(row.audience !== undefined && {
            audience: row.audience,
          }),
          ...(row.default !== undefined && {
            default: row.default,
          }),
          ...(row.outsidersMayHaveWritten && {
            outsiders_may_have_written: true,
          }),
        })),
        ...(sliced.length < listing.rows.length && {
          more: true,
        }),
        ...(listing.overflow && {
          overflow: true,
        }),
        ...(listing.dropped > 0 && {
          dropped: listing.dropped,
        }),
        ...(listing.unavailable && {
          unavailable: true,
        }),
      },
    },
  };
}
//@ chunk-xzmy9dn4.js:113849-113914 placement
/**
 * 把类型实例列表格式化成工具结果。
 */
var typeInstanceListToolResult = (result, toolUseId) => ({
  tool_use_id: toolUseId,
  type: "tool_result",
  content: formatArtifactListEntry(result),
});
//@ chunk-xzmy9dn4.js:113914-114004 placement
/**
 * 类型列表不可用时的空结果（instances 为空、unavailable）。
 */
function typeListUnavailableResult(typeRef, scope) {
  return {
    data: {
      type_instances: {
        ...typeRef,
        scope,
        instances: [],
        unavailable: true,
      },
    },
  };
}
//@ chunk-xzmy9dn4.js:114004-114262 placement
function assertTypeListNotDenied(toolPermissionContext, listInput, title) {
  let urlContentRule = findUrlContentRule(toolPermissionContext, listInput, "deny");
  if (urlContentRule !== null)
    throw new ArtifactInputError(
      `Listing ${title === undefined ? "this" : `the ${jsonStringify(typeRowTitle(title))}`} type is blocked by the permission rule ${formatRuleForDisplay(urlContentRule)}, which names that type by its link. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-xzmy9dn4.js:114262-114600 placement
function assertListTypeNotDenied(toolPermissionContext, listInput, title, extraMatchKey) {
  let titleKeys = typeTitleMatchKeys(title);
  let denyRule = filterRulesMatchingUrls(
    toolPermissionContext,
    listInput,
    extraMatchKey === undefined ? titleKeys : [...titleKeys, extraMatchKey],
    "deny",
  )[0];
  if (denyRule !== undefined)
    throw new ArtifactInputError(
      `Listing the ${jsonStringify(typeRowTitle(title))} type is blocked by the permission rule ${formatRuleForDisplay(denyRule)}, which covers that type however ${extraMatchKey === undefined ? "the call names it" : "its name is spelled in the call"}. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-xzmy9dn4.js:114600-114673 placement
function findAskTypeRule(toolPermissionContext, toolPermissionContext_2, tool, title, titleMatchKey) {
  return hasAskRuleForUrl(toolPermissionContext_2, tool, title, titleMatchKey)
    ? undefined
    : filterRulesMatchingUrls(toolPermissionContext, tool, typeTitleMatchKeys(title), "ask")[0];
}
//@ chunk-xzmy9dn4.js:114673-114781 placement (2.1.88 match: getDenyRuleForAgent, 1)
function hasAskRuleForUrl(toolPermissionContext, tool, title, titleMatchKey) {
  return (
    titleMatchKey !== undefined &&
    filterRulesMatchingUrls(toolPermissionContext, tool, typeTitleMatchKeys(title), "ask").some((rule) =>
      matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", [titleMatchKey]),
    )
  );
}
//@ chunk-xzmy9dn4.js:114781-115045 placement
function typeRuleAskNote(askTypeRule, quotedTitle, exactName) {
  return `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${quotedTitle} type is listed, and the user is asked only when \`type\` matches the rule, so nothing was listed. To have the user asked, list it again with \`type\` set to exactly ${jsonStringify(typeRowTitle(exactName))}.`;
}
export {
  listScopeOrDefault,
  describeListByTypeAsk,
  LIST_BY_TYPE_READ_ONLY_REASON,
  validateListByTypeInput,
  describeListByTypeSummary,
  describeListByTypeShort,
  listArtifactsByType,
  typeInstanceListToolResult,
};
