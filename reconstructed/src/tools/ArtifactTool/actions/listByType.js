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
import { wi } from "../typeCatalog.js";
import { sweepScalarField } from "../../../services/artifacts/artifactPeople.js";
import { Ro } from "../designSystems.js";

//@ chunk-8wvtd8sr.js:106809-106924 placement
function describeTypeTarget(e, n = canonicalArtifactTargetFor) {
  let s = typeOf(e);
  return s !== void 0
    ? `the type named ${quoteForDecisionSurface(s, TITLE_MAX_CHARS)}`
    : n(typeUrlOf(e), "(unrecognized address)");
}
//@ chunk-8wvtd8sr.js:106924-106977 placement
function Non(e) {
  return e.scope === void 0 ? "all" : listScopeFrom(e);
}
//@ chunk-8wvtd8sr.js:106977-107255 placement
var LIST_BY_TYPE_UNAVAILABLE = "listing the Artifacts made from a type is not available in this session",
  TYPE_AND_TYPE_URL_BOTH = "`type` and `type_url` both name the type to list \u2014 pass one of them",
  EMPTY_TYPE_NAME =
    '`type` is empty \u2014 pass an Artifact type\'s name (as action "list_types" shows it), or its link as `type_url`';
//@ chunk-8wvtd8sr.js:107255-107390 placement
function noTypeNamedMessage(e) {
  return `no Artifact type named ${jsonStringify(e)} is published for this account \u2014 action "list_types" shows the ones that are`;
}
//@ chunk-8wvtd8sr.js:107390-107632 placement
function typeNotFoundPartialMessage(e, n) {
  return `none of the ${n} Artifact ${plural(n, "type")} read is named ${jsonStringify(e)} exactly, and the listing could not be read completely \u2014 action "list_types" shows what is published; pass the type's link from there as \`type_url\``;
}
//@ chunk-8wvtd8sr.js:107632-107853 placement
function ambiguousTypeNameMessage(e, n) {
  return `${n.length} published Artifact types are named ${jsonStringify(e)}: ${n.map((s) => `${jsonStringify(s.title)} \u2014 ${s.typeUrl}`).join("; ")} \u2014 pass the one you mean by its link, as \`type_url\` instead of \`type\``;
}
//@ chunk-8wvtd8sr.js:107853-107914 placement
var cy = new Set(["action", "type", "type_url", "scope", "limit"]);
/**
 * 校验 list + type/type_url：类型目录需开启，只能带 scope/limit，type 与 type_url 只能二选一，type 名不能为空，type_url 必须是合法类型链接。
 */
//@ chunk-8wvtd8sr.js:107914-108673 placement
function validateListByTypeInput(e) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== !0)
    return { result: !1, message: LIST_BY_TYPE_UNAVAILABLE, errorCode: 8 };
  let filtered = Object.keys(e).filter((y) => !cy.has(y) && e[y] !== void 0);
  if (filtered.length > 0)
    return {
      result: !1,
      message: `action "list" with \`type\` or \`type_url\` takes only \`scope\` and \`limit\` \u2014 remove ${filtered.join(", ")}.${getLiveState().frozenArtifactTypes?.typeCreateOn === !0 ? " To start a new Artifact from the type, omit `action` and pass its `type_url`." : ""}`,
      errorCode: 8,
    };
  let s = typeOf(e),
    r = typeUrlOf(e);
  if (s !== void 0 && r !== void 0) return { result: !1, message: TYPE_AND_TYPE_URL_BOTH, errorCode: 8 };
  if (s !== void 0)
    return typeNameKey(typeNameWithoutQuotes(s)) === ""
      ? { result: !1, message: EMPTY_TYPE_NAME, errorCode: 8 }
      : { result: !0 };
  let h = parseSessionArtifactUrl(r ?? "", { notUrlMessage: notTypeUrlError(r ?? "") });
  if (!h.ok) return { result: !1, message: h.message, errorCode: h.errorCode };
  return { result: !0 };
}
/**
 * 按类型列出 Artifact 为只读操作的说明，以及会把组织内他人发布的标题与链接读入对话的提示。
 */
//@ chunk-8wvtd8sr.js:108673-108893 placement
var LIST_BY_TYPE_READ_ONLY_REASON =
    "Listing the Artifacts made from a type that the user can open is a read-only action",
  OTHERS_TITLES_READ_CLAUSE =
    "titles, descriptions and links of Artifacts other people in the organization published will be read into the conversation";
/**
 * 按类型列出 Artifact 的分类器摘要（含范围与目标类型）。
 */
//@ chunk-8wvtd8sr.js:108893-109113 placement
function describeListByTypeSummary(e) {
  let n = Non(e);
  return `list artifacts made from a type (read-only, scope: ${n}${n === "mine" ? "" : " \u2014 includes titles and descriptions of artifacts other users in the organization published"}): ${describeTypeTarget(e, classifierArtifactTargetFor)}`;
}
/**
 * 按类型列出 Artifact 的权限询问描述：区分只列自己的、组织内他人发布的、或用户能打开的（只读）。
 */
//@ chunk-8wvtd8sr.js:109113-109439 placement
function describeListByTypeAsk(e) {
  let n = Non(e),
    s = describeTypeTarget(e);
  return n === "mine"
    ? `List the user's own Artifacts made from one Artifact type (${s}) \u2014 titles and links (read-only).`
    : `List the Artifacts made from one Artifact type (${s}) that ${n === "shared" ? "other people in the organization published" : "the user can open"} \u2014 ${OTHERS_TITLES_READ_CLAUSE} (read-only).`;
}
/**
 * 按类型列出 Artifact 的简短描述（范围非 mine 时附他人内容读入的提示）。
 */
//@ chunk-8wvtd8sr.js:109439-109603 placement
function describeListByTypeShort(e) {
  let n = Non(e);
  return n === "mine"
    ? "list artifacts made from a type (read-only)"
    : `list artifacts made from a type (read-only, scope: ${n} \u2014 ${OTHERS_TITLES_READ_CLAUSE})`;
}
//@ chunk-8wvtd8sr.js:109603-113502 placement
async function listArtifactsByType(e, n, s) {
  if (getLiveState().frozenArtifactTypes?.typeCatalogOn !== !0)
    throw new ArtifactInputError(LIST_BY_TYPE_UNAVAILABLE, "list_type_unavailable");
  let r = Non(e),
    h = typeOf(e),
    y = { signal: n.abortController.signal, credentials: n.credentials },
    p = getToolPermissionContext(n),
    w,
    A;
  if (h === void 0) {
    A = parseArtifactUrlOrThrow(typeUrlOf(e)).slug;
    let L = { action: "list", type_url: typeUrlOf(e) },
      V = getDenyAndAskUrlRules(p, s)[0];
    if (V !== void 0) {
      let q = await describeArtifactType(A, y);
      if (q.err !== null) {
        if (q.reason === "ccr_credential_refused" || q.reason === "relay_unserved")
          return Su({ type_url: artifactViewerUrl(A) }, r);
        throw new ArtifactInputError(q.err, `list_type_describe_${q.reason}`);
      }
      let { title: title } = q.detail;
      if (q.detail.untitled || typeNameMatchKey(title) === "")
        throw new ArtifactInputError(
          `This link's Artifact type has no readable name, so it cannot be checked against the permission rule ${formatRuleForDisplay(V)}. Nothing was listed; tell the user.`,
          "list_type_rule_unresolved",
        );
      let Z = getToolPermissionContext(n);
      (assertListTypeNotDenied(Z, s, title), assertTypeListNotDenied(Z, L, title));
      let ue = findAskTypeRule(Z, p, s, title);
      if (ue !== void 0 && findUrlContentRule(p, L, "ask") === null) {
        let we = getRuleExactDomain(ue) ?? title,
          Ie = await findArtifactTypeByName(we, y);
        if (Ie.err !== null) throw new ArtifactInputError(Ie.err, `list_type_${Ie.reason}`);
        let ie = Ie.found?.typeUrl === artifactViewerUrl(A),
          _e = jsonStringify(wi(title));
        if (!ie && Ie.found === void 0 && "partial" in Ie && Ie.partial)
          throw new ArtifactInputError(
            `The permission rule ${formatRuleForDisplay(ue)} asks the user before the ${_e} type is listed, and the type listing could not be read completely to find the name to ask under, so nothing was listed \u2014 retry.`,
            "list_type_name_unread",
          );
        throw ie
          ? new ArtifactInputError(typeRuleAskNote(ue, _e, we), "list_type_rule_ask_retry")
          : new ArtifactInputError(
              `The permission rule ${formatRuleForDisplay(ue)} asks the user before the ${_e} type is listed, and this type can be listed only by its link, where nothing can ask the user, so nothing was listed. Tell the user; an ask rule naming the link (\`type_url:\`) would let them be asked.`,
              "list_type_rule_ask_unaskable",
            );
      }
    }
    let M = getToolPermissionContext(n);
    assertTypeListNotDenied(M, L);
    let x = findUrlContentRule(p, L, "ask") === null ? findUrlContentRule(M, L, "ask") : null;
    if (x !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(x)} asks the user before this type is listed, and it was added after this call's permission check ran, so nothing was listed. List it again the same way to have the user asked.`,
        "list_type_rule_ask_retry",
      );
  } else {
    if (
      ((w = sweepScalarField(h.trim(), TITLE_MAX_CHARS)),
      typeUrlOf(e) !== void 0 || typeNameKey(typeNameWithoutQuotes(h)) === "")
    )
      throw new ArtifactInputError(
        "pass the type as `type` (its name) or `type_url` (its link) \u2014 exactly one",
        "list_type_name_bad",
      );
    let L = await findArtifactTypeByName(h, y);
    if (L.err !== null) throw new ArtifactInputError(L.err, `list_type_${L.reason}`);
    if (L.found === void 0) {
      if ("unavailable" in L) return Su({ type: w }, r);
      throw new ArtifactInputError(
        L.named.length > 0
          ? ambiguousTypeNameMessage(w, L.named)
          : L.partial
            ? typeNotFoundPartialMessage(w, L.listed)
            : noTypeNamedMessage(w),
        L.named.length > 0
          ? "list_type_name_ambiguous"
          : L.partial
            ? "list_type_name_unread"
            : "list_type_name_unknown",
      );
    }
    w = L.found.title;
    let V = getToolPermissionContext(n),
      M = typeNameMatchKey(h),
      x = { action: "list", type_url: L.found.typeUrl },
      q = jsonStringify(wi(L.found.title));
    (assertListTypeNotDenied(V, s, L.found.title, M), assertTypeListNotDenied(V, x, L.found.title));
    let re = findAskTypeRule(V, p, s, L.found.title, M);
    if (re !== void 0)
      throw new ArtifactInputError(
        typeRuleAskNote(re, q, getRuleExactDomain(re) ?? L.found.title),
        "list_type_rule_ask_retry",
      );
    let Z = hasAskRuleForUrl(p, s, L.found.title, M) ? null : findUrlContentRule(V, x, "ask");
    if (Z !== null)
      throw new ArtifactInputError(
        `The permission rule ${formatRuleForDisplay(Z)} asks the user before the ${q} type is listed, and the user is asked only when the call names the type by that link, so nothing was listed. To have the user asked, list it again with \`type_url\` set to ${L.found.typeUrl} instead of \`type\`.`,
        "list_type_rule_ask_retry",
      );
    A = parseArtifactUrlOrThrow(L.found.typeUrl).slug;
  }
  let S = await listTypeInstances(A, { scope: r, ...y });
  if (S.err !== null) throw new ArtifactInputError(S.err, `list_type_${S.reason}`);
  let designSystemTypeSlug = getLiveState().designSystemTypeSlug;
  if (
    S.rows.length > 0 &&
    ((designSystemTypeSlug !== void 0 && A === designSystemTypeSlug) || w === DESIGN_SYSTEM_TYPE_TITLE)
  )
    Ro();
  let min = Math.min(Math.max(1, e.limit ?? DEFAULT_LIST_LIMIT), TYPE_LIST_LIMIT_MAX),
    sliced = S.rows.slice(0, min);
  return {
    data: {
      type_instances: {
        ...(w !== void 0 && { type: w }),
        type_url: artifactViewerUrl(A),
        scope: r,
        instances: sliced.map((L) => ({
          title: L.title,
          url: L.url,
          ...(L.description !== void 0 && { description: L.description }),
          ...(L.createdAt !== void 0 && { created_at: L.createdAt }),
          rel: L.rel,
          ...(L.audience !== void 0 && { audience: L.audience }),
          ...(L.default !== void 0 && { default: L.default }),
          ...(L.outsidersMayHaveWritten && { outsiders_may_have_written: !0 }),
        })),
        ...(sliced.length < S.rows.length && { more: !0 }),
        ...(S.overflow && { overflow: !0 }),
        ...(S.dropped > 0 && { dropped: S.dropped }),
        ...(S.unavailable && { unavailable: !0 }),
      },
    },
  };
}
//@ chunk-8wvtd8sr.js:113502-113567 placement
var Uu = (e, n) => ({ tool_use_id: n, type: "tool_result", content: formatArtifactListEntry(e) });
//@ chunk-8wvtd8sr.js:113567-113657 placement
function Su(e, n) {
  return { data: { type_instances: { ...e, scope: n, instances: [], unavailable: !0 } } };
}
//@ chunk-8wvtd8sr.js:113657-113915 placement
function assertTypeListNotDenied(e, n, s) {
  let r = findUrlContentRule(e, n, "deny");
  if (r !== null)
    throw new ArtifactInputError(
      `Listing ${s === void 0 ? "this" : `the ${jsonStringify(wi(s))}`} type is blocked by the permission rule ${formatRuleForDisplay(r)}, which names that type by its link. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-8wvtd8sr.js:113915-114253 placement
function assertListTypeNotDenied(e, n, s, r) {
  let h = typeTitleMatchKeys(s),
    y = filterRulesMatchingUrls(e, n, r === void 0 ? h : [...h, r], "deny")[0];
  if (y !== void 0)
    throw new ArtifactInputError(
      `Listing the ${jsonStringify(wi(s))} type is blocked by the permission rule ${formatRuleForDisplay(y)}, which covers that type however ${r === void 0 ? "the call names it" : "its name is spelled in the call"}. Nothing was listed; tell the user.`,
      "list_type_rule_denied",
    );
}
//@ chunk-8wvtd8sr.js:114253-114326 placement
function findAskTypeRule(e, n, s, r, h) {
  return hasAskRuleForUrl(n, s, r, h)
    ? void 0
    : filterRulesMatchingUrls(e, s, typeTitleMatchKeys(r), "ask")[0];
}
//@ chunk-8wvtd8sr.js:114326-114434 placement = getDenyRuleForAgent (1)
function hasAskRuleForUrl(e, n, s, r) {
  return (
    r !== void 0 &&
    filterRulesMatchingUrls(e, n, typeTitleMatchKeys(s), "ask").some((rule) =>
      matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", [r]),
    )
  );
}
//@ chunk-8wvtd8sr.js:114434-114698 placement
function typeRuleAskNote(e, n, s) {
  return `The permission rule ${formatRuleForDisplay(e)} asks the user before the ${n} type is listed, and the user is asked only when \`type\` matches the rule, so nothing was listed. To have the user asked, list it again with \`type\` set to exactly ${jsonStringify(wi(s))}.`;
}

export {
  describeListByTypeAsk,
  LIST_BY_TYPE_READ_ONLY_REASON,
  validateListByTypeInput,
  describeListByTypeSummary,
  describeListByTypeShort,
  listArtifactsByType,
  Uu,
  Non,
};
