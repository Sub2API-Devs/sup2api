/**
 * tools/ArtifactTool/actions/listByType.ts
 *
 * 2.1.316 新增：按类型列出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (20)
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
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { ArtifactInputError } from "../constants.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { parseArtifactUrlOrThrow, formatRuleForDisplay } from "../permissions/artifactPermissionRules.js";
import { getDenyAndAskUrlRules, matchesWildcardPattern } from "../permissions/urlRules.js";
import { artifactViewerUrl } from "../../../services/artifacts/publishInstanceFiles.js";
import { findUrlContentRule } from "../permissions/ruleTarget.js";
import { getRuleExactDomain, filterRulesMatchingUrls } from "../../../utils/permissions/permissions.js";
import { typeRowTitle } from "../typeCatalog.js";
import { sweepScalarField } from "../../../services/artifacts/artifactPeople.js";
import { clearQuickstartNoneFlags } from "../designSystems.js";

//@ chunk-8wvtd8sr.js:106809-106924 placement
function describeTypeTarget(e, classifierArtifactTargetFor = canonicalArtifactTargetFor) {
  let s = typeOf(e);
  return s !== undefined
    ? `the type named ${quoteForDecisionSurface(s, TITLE_MAX_CHARS)}`
    : classifierArtifactTargetFor(typeUrlOf(e), "(unrecognized address)");
}
//@ chunk-8wvtd8sr.js:106924-106977 placement
/**
 * 取列表 scope，未设置时按 all 处理。
 */
function listScopeOrDefault(e) {
  return e.scope === undefined ? "all" : listScopeFrom(e);
}
//@ chunk-8wvtd8sr.js:106977-107255 placement
var LIST_BY_TYPE_UNAVAILABLE = "listing the Artifacts made from a type is not available in this session";
var TYPE_AND_TYPE_URL_BOTH = "`type` and `type_url` both name the type to list \u2014 pass one of them";
var EMPTY_TYPE_NAME =
  '`type` is empty \u2014 pass an Artifact type\'s name (as action "list_types" shows it), or its link as `type_url`';
//@ chunk-8wvtd8sr.js:107255-107390 placement
function noTypeNamedMessage(e) {
  return `no Artifact type named ${jsonStringify(e)} is published for this account \u2014 action "list_types" shows the ones that are`;
}
//@ chunk-8wvtd8sr.js:107390-107632 placement
function typeNotFoundPartialMessage(e, listed) {
  return `none of the ${listed} Artifact ${plural(listed, "type")} read is named ${jsonStringify(e)} exactly, and the listing could not be read completely \u2014 action "list_types" shows what is published; pass the type's link from there as \`type_url\``;
}
//@ chunk-8wvtd8sr.js:107632-107853 placement
function ambiguousTypeNameMessage(e, named) {
  return `${named.length} published Artifact types are named ${jsonStringify(e)}: ${named.map((s) => `${jsonStringify(s.title)} \u2014 ${s.typeUrl}`).join("; ")} \u2014 pass the one you mean by its link, as \`type_url\` instead of \`type\``;
}
//@ chunk-8wvtd8sr.js:107853-107914 placement
var LIST_BY_TYPE_ALLOWED_KEYS = new Set(["action", "type", "type_url", "scope", "limit"]);
//@ chunk-8wvtd8sr.js:107914-108673 placement
/**
 * 校验 list + type/type_url：类型目录需开启，只能带 scope/limit，type 与 type_url 只能二选一，type 名不能为空，type_url 必须是合法类型链接。
 */
function validateListByTypeInput(e) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== true)
    return {
      result: false,
      message: LIST_BY_TYPE_UNAVAILABLE,
      errorCode: 8,
    };
  let filtered = Object.keys(e).filter((key) => !LIST_BY_TYPE_ALLOWED_KEYS.has(key) && e[key] !== undefined);
  if (filtered.length > 0)
    return {
      result: false,
      message: `action "list" with \`type\` or \`type_url\` takes only \`scope\` and \`limit\` \u2014 remove ${filtered.join(", ")}.${getLiveState().frozenArtifactTypes?.typeCreateOn === true ? " To start a new Artifact from the type, omit `action` and pass its `type_url`." : ""}`,
      errorCode: 8,
    };
  let s = typeOf(e);
  let r = typeUrlOf(e);
  if (s !== undefined && r !== undefined)
    return {
      result: false,
      message: TYPE_AND_TYPE_URL_BOTH,
      errorCode: 8,
    };
  if (s !== undefined)
    return typeNameKey(typeNameWithoutQuotes(s)) === ""
      ? {
          result: false,
          message: EMPTY_TYPE_NAME,
          errorCode: 8,
        }
      : {
          result: true,
        };
  let sessionArtifactUrl = parseSessionArtifactUrl(r ?? "", {
    notUrlMessage: notTypeUrlError(r ?? ""),
  });
  if (!sessionArtifactUrl.ok)
    return {
      result: false,
      message: sessionArtifactUrl.message,
      errorCode: sessionArtifactUrl.errorCode,
    };
  return {
    result: true,
  };
}
//@ chunk-8wvtd8sr.js:108673-108893 placement
/**
 * 按类型列出 Artifact 为只读操作的说明，以及会把组织内他人发布的标题与链接读入对话的提示。
 */
var LIST_BY_TYPE_READ_ONLY_REASON =
  "Listing the Artifacts made from a type that the user can open is a read-only action";
var OTHERS_TITLES_READ_CLAUSE =
  "titles, descriptions and links of Artifacts other people in the organization published will be read into the conversation";
//@ chunk-8wvtd8sr.js:108893-109113 placement
/**
 * 按类型列出 Artifact 的分类器摘要（含范围与目标类型）。
 */
function describeListByTypeSummary(e) {
  let n = listScopeOrDefault(e);
  return `list artifacts made from a type (read-only, scope: ${n}${n === "mine" ? "" : " \u2014 includes titles and descriptions of artifacts other users in the organization published"}): ${describeTypeTarget(e, classifierArtifactTargetFor)}`;
}
//@ chunk-8wvtd8sr.js:109113-109439 placement
/**
 * 按类型列出 Artifact 的权限询问描述：区分只列自己的、组织内他人发布的、或用户能打开的（只读）。
 */
function describeListByTypeAsk(e) {
  let n = listScopeOrDefault(e);
  let s = describeTypeTarget(e);
  return n === "mine"
    ? `List the user's own Artifacts made from one Artifact type (${s}) \u2014 titles and links (read-only).`
    : `List the Artifacts made from one Artifact type (${s}) that ${n === "shared" ? "other people in the organization published" : "the user can open"} \u2014 ${OTHERS_TITLES_READ_CLAUSE} (read-only).`;
}
//@ chunk-8wvtd8sr.js:109439-109603 placement
/**
 * 按类型列出 Artifact 的简短描述（范围非 mine 时附他人内容读入的提示）。
 */
function describeListByTypeShort(e) {
  let n = listScopeOrDefault(e);
  return n === "mine"
    ? "list artifacts made from a type (read-only)"
    : `list artifacts made from a type (read-only, scope: ${n} \u2014 ${OTHERS_TITLES_READ_CLAUSE})`;
}
//@ chunk-8wvtd8sr.js:109603-113502 placement
async function listArtifactsByType(e, n, tool) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== true)
    throw new ArtifactInputError(LIST_BY_TYPE_UNAVAILABLE, "list_type_unavailable");
  let scope = listScopeOrDefault(e);
  let h = typeOf(e);
  let y = {
    signal: n.abortController.signal,
    credentials: n.credentials,
  };
  let toolPermissionContext = getToolPermissionContext(n);
  let w;
  let A;
  if (h === undefined) {
    A = parseArtifactUrlOrThrow(typeUrlOf(e)).slug;
    let L = {
      action: "list",
      type_url: typeUrlOf(e),
    };
    let V = getDenyAndAskUrlRules(toolPermissionContext, tool)[0];
    if (V !== undefined) {
      let q = await describeArtifactType(A, y);
      if (q.err !== null) {
        if (q.reason === "ccr_credential_refused" || q.reason === "relay_unserved")
          return typeListUnavailableResult(
            {
              type_url: artifactViewerUrl(A),
            },
            scope,
          );
        throw new ArtifactInputError(q.err, `list_type_describe_${q.reason}`);
      }
      let { title } = q.detail;
      if (q.detail.untitled || typeNameMatchKey(title) === "")
        throw new ArtifactInputError(
          `This link's Artifact type has no readable name, so it cannot be checked against the permission rule ${formatRuleForDisplay(V)}. Nothing was listed; tell the user.`,
          "list_type_rule_unresolved",
        );
      let toolPermissionContext_2 = getToolPermissionContext(n);
      assertListTypeNotDenied(toolPermissionContext_2, tool, title);
      assertTypeListNotDenied(toolPermissionContext_2, L, title);
      let askTypeRule = findAskTypeRule(toolPermissionContext_2, toolPermissionContext, tool, title);
      if (askTypeRule !== undefined && findUrlContentRule(toolPermissionContext, L, "ask") === null) {
        let we = getRuleExactDomain(askTypeRule) ?? title;
        let artifactTypeByName = await findArtifactTypeByName(we, y);
        if (artifactTypeByName.err !== null)
          throw new ArtifactInputError(artifactTypeByName.err, `list_type_${artifactTypeByName.reason}`);
        let ie = artifactTypeByName.found?.typeUrl === artifactViewerUrl(A);
        let _e = jsonStringify(typeRowTitle(title));
        if (
          !ie &&
          artifactTypeByName.found === undefined &&
          "partial" in artifactTypeByName &&
          artifactTypeByName.partial
        )
          throw new ArtifactInputError(
            `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${_e} type is listed, and the type listing could not be read completely to find the name to ask under, so nothing was listed \u2014 retry.`,
            "list_type_name_unread",
          );
        throw ie
          ? new ArtifactInputError(typeRuleAskNote(askTypeRule, _e, we), "list_type_rule_ask_retry")
          : new ArtifactInputError(
              `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${_e} type is listed, and this type can be listed only by its link, where nothing can ask the user, so nothing was listed. Tell the user; an ask rule naming the link (\`type_url:\`) would let them be asked.`,
              "list_type_rule_ask_unaskable",
            );
      }
    }
    let toolPermissionContext_2 = getToolPermissionContext(n);
    assertTypeListNotDenied(toolPermissionContext_2, L);
    let x =
      findUrlContentRule(toolPermissionContext, L, "ask") === null
        ? findUrlContentRule(toolPermissionContext_2, L, "ask")
        : null;
    if (x !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(x)} asks the user before this type is listed, and it was added after this call's permission check ran, so nothing was listed. List it again the same way to have the user asked.`,
        "list_type_rule_ask_retry",
      );
  } else {
    w = sweepScalarField(h.trim(), TITLE_MAX_CHARS);
    if (typeUrlOf(e) !== undefined || typeNameKey(typeNameWithoutQuotes(h)) === "")
      throw new ArtifactInputError(
        "pass the type as `type` (its name) or `type_url` (its link) \u2014 exactly one",
        "list_type_name_bad",
      );
    let artifactTypeByName = await findArtifactTypeByName(h, y);
    if (artifactTypeByName.err !== null)
      throw new ArtifactInputError(artifactTypeByName.err, `list_type_${artifactTypeByName.reason}`);
    if (artifactTypeByName.found === undefined) {
      if ("unavailable" in artifactTypeByName)
        return typeListUnavailableResult(
          {
            type: w,
          },
          scope,
        );
      throw new ArtifactInputError(
        artifactTypeByName.named.length > 0
          ? ambiguousTypeNameMessage(w, artifactTypeByName.named)
          : artifactTypeByName.partial
            ? typeNotFoundPartialMessage(w, artifactTypeByName.listed)
            : noTypeNamedMessage(w),
        artifactTypeByName.named.length > 0
          ? "list_type_name_ambiguous"
          : artifactTypeByName.partial
            ? "list_type_name_unread"
            : "list_type_name_unknown",
      );
    }
    w = artifactTypeByName.found.title;
    let toolPermissionContext_2 = getToolPermissionContext(n);
    let M = typeNameMatchKey(h);
    let x = {
      action: "list",
      type_url: artifactTypeByName.found.typeUrl,
    };
    let q = jsonStringify(typeRowTitle(artifactTypeByName.found.title));
    assertListTypeNotDenied(toolPermissionContext_2, tool, artifactTypeByName.found.title, M);
    assertTypeListNotDenied(toolPermissionContext_2, x, artifactTypeByName.found.title);
    let askTypeRule = findAskTypeRule(
      toolPermissionContext_2,
      toolPermissionContext,
      tool,
      artifactTypeByName.found.title,
      M,
    );
    if (askTypeRule !== undefined)
      throw new ArtifactInputError(
        typeRuleAskNote(askTypeRule, q, getRuleExactDomain(askTypeRule) ?? artifactTypeByName.found.title),
        "list_type_rule_ask_retry",
      );
    let Z = hasAskRuleForUrl(toolPermissionContext, tool, artifactTypeByName.found.title, M)
      ? null
      : findUrlContentRule(toolPermissionContext_2, x, "ask");
    if (Z !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(Z)} asks the user before the ${q} type is listed, and the user is asked only when the call names the type by that link, so nothing was listed. To have the user asked, list it again with \`type_url\` set to ${artifactTypeByName.found.typeUrl} instead of \`type\`.`,
        "list_type_rule_ask_retry",
      );
    A = parseArtifactUrlOrThrow(artifactTypeByName.found.typeUrl).slug;
  }
  let S = await listTypeInstances(A, {
    scope,
    ...y,
  });
  if (S.err !== null) throw new ArtifactInputError(S.err, `list_type_${S.reason}`);
  let designSystemTypeSlug = getLiveState().designSystemTypeSlug;
  if (
    S.rows.length > 0 &&
    ((designSystemTypeSlug !== undefined && A === designSystemTypeSlug) || w === DESIGN_SYSTEM_TYPE_TITLE)
  )
    clearQuickstartNoneFlags();
  let min = Math.min(Math.max(1, e.limit ?? DEFAULT_LIST_LIMIT), TYPE_LIST_LIMIT_MAX);
  let sliced = S.rows.slice(0, min);
  return {
    data: {
      type_instances: {
        ...(w !== undefined && {
          type: w,
        }),
        type_url: artifactViewerUrl(A),
        scope,
        instances: sliced.map((L) => ({
          title: L.title,
          url: L.url,
          ...(L.description !== undefined && {
            description: L.description,
          }),
          ...(L.createdAt !== undefined && {
            created_at: L.createdAt,
          }),
          rel: L.rel,
          ...(L.audience !== undefined && {
            audience: L.audience,
          }),
          ...(L.default !== undefined && {
            default: L.default,
          }),
          ...(L.outsidersMayHaveWritten && {
            outsiders_may_have_written: true,
          }),
        })),
        ...(sliced.length < S.rows.length && {
          more: true,
        }),
        ...(S.overflow && {
          overflow: true,
        }),
        ...(S.dropped > 0 && {
          dropped: S.dropped,
        }),
        ...(S.unavailable && {
          unavailable: true,
        }),
      },
    },
  };
}
//@ chunk-8wvtd8sr.js:113502-113567 placement
/**
 * 把类型实例列表格式化成工具结果。
 */
var typeInstanceListToolResult = (e, toolUseId) => ({
  tool_use_id: toolUseId,
  type: "tool_result",
  content: formatArtifactListEntry(e),
});
//@ chunk-8wvtd8sr.js:113567-113657 placement
/**
 * 类型列表不可用时的空结果（instances 为空、unavailable）。
 */
function typeListUnavailableResult(e, scope) {
  return {
    data: {
      type_instances: {
        ...e,
        scope,
        instances: [],
        unavailable: true,
      },
    },
  };
}
//@ chunk-8wvtd8sr.js:113657-113915 placement
function assertTypeListNotDenied(toolPermissionContext, n, title) {
  let urlContentRule = findUrlContentRule(toolPermissionContext, n, "deny");
  if (urlContentRule !== null)
    throw new ArtifactInputError(
      `Listing ${title === undefined ? "this" : `the ${jsonStringify(typeRowTitle(title))}`} type is blocked by the permission rule ${formatRuleForDisplay(urlContentRule)}, which names that type by its link. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-8wvtd8sr.js:113915-114253 placement
function assertListTypeNotDenied(toolPermissionContext, n, title, r) {
  let h = typeTitleMatchKeys(title);
  let y = filterRulesMatchingUrls(toolPermissionContext, n, r === undefined ? h : [...h, r], "deny")[0];
  if (y !== undefined)
    throw new ArtifactInputError(
      `Listing the ${jsonStringify(typeRowTitle(title))} type is blocked by the permission rule ${formatRuleForDisplay(y)}, which covers that type however ${r === undefined ? "the call names it" : "its name is spelled in the call"}. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-8wvtd8sr.js:114253-114326 placement
function findAskTypeRule(toolPermissionContext, toolPermissionContext_2, s, title, h) {
  return hasAskRuleForUrl(toolPermissionContext_2, s, title, h)
    ? undefined
    : filterRulesMatchingUrls(toolPermissionContext, s, typeTitleMatchKeys(title), "ask")[0];
}
//@ chunk-8wvtd8sr.js:114326-114434 placement = getDenyRuleForAgent (1)
function hasAskRuleForUrl(e, n, s, r) {
  return (
    r !== undefined &&
    filterRulesMatchingUrls(e, n, typeTitleMatchKeys(s), "ask").some((rule) =>
      matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", [r]),
    )
  );
}
//@ chunk-8wvtd8sr.js:114434-114698 placement
function typeRuleAskNote(askTypeRule, n, s) {
  return `The permission rule ${formatRuleForDisplay(askTypeRule)} asks the user before the ${n} type is listed, and the user is asked only when \`type\` matches the rule, so nothing was listed. To have the user asked, list it again with \`type\` set to exactly ${jsonStringify(typeRowTitle(s))}.`;
}
export {
  describeListByTypeAsk,
  LIST_BY_TYPE_READ_ONLY_REASON,
  validateListByTypeInput,
  describeListByTypeSummary,
  describeListByTypeShort,
  listArtifactsByType,
  typeInstanceListToolResult,
  listScopeOrDefault,
};
