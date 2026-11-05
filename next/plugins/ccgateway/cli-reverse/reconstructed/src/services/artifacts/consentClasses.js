/**
 * services/artifacts/consentClasses.ts
 *
 * 2.1.316 新增：artifact 能力同意类别划分
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0avm71bs.js (23)
 * attribution: placement 23
 */
import { getLiveState } from "../liveReplica/liveReplica.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0avm71bs.js:2965-3012 placement
var CLASSIFIER = "classifier";
var PERSON = "person";
var CLASSIFIER_2 = "classifier";
//@ chunk-0avm71bs.js:3012-4571 placement
/**
 * 按 artifact 操作决定是否需要同意及由谁回答：delete/change_access 问人；standing_job、write、read 按是否由人发起、是否公开、是否属于他组织、是否本人所有、网络是否关闭等事实决定 ask（类别/回答者/记住范围/依据/缺失事实）或直接放行（read 可标记为外部读取）。
 */
function classifyArtifactConsent(facts) {
  switch (facts.operation) {
    case "delete":
      return askConsent("delete", "person", "this_call", "known");
    case "change_access":
      return askConsent("access_change", "person", "this_call", "known");
    case "standing_job":
      return facts.turnStartedByHuman
        ? askConsent("standing_job", "classifier", "artifact", "known")
        : askConsent("standing_job", "classifier", "this_call", "unattended");
    case "write": {
      if (!facts.turnStartedByHuman) {
        if (
          (facts.routineWrite === true || facts.commentWrite === true) &&
          facts.public === false &&
          facts.outsideAudience !== true &&
          facts.canWrite === true &&
          facts.invitedByOtherOrg !== true
        )
          return {
            ask: false,
            foreignRead: false,
          };
        return askConsent("public_change", "classifier", "this_call", "unattended");
      }
      if (facts.public === true) return askConsent("public_change", "classifier", "artifact", "known");
      if (facts.public === undefined)
        return askConsent("public_change", "classifier", "this_call", "facts_missing", "public");
      if (facts.invitedByOtherOrg === true)
        return {
          ...askConsent("public_change", "classifier", "artifact", "known"),
          about: "someone_else",
        };
      if (facts.owned !== true && facts.canWrite !== true)
        return {
          ask: false,
          foreignRead: false,
        };
      if (facts.outsideAudience === true)
        return {
          ...askConsent("public_change", "classifier", "artifact", "known"),
          about: "outside_audience",
        };
      return {
        ask: false,
        foreignRead: false,
      };
    }
    case "read": {
      if (facts.owned === true)
        return {
          ask: false,
          foreignRead: false,
        };
      if (facts.outsideOrg === true)
        return {
          ...askConsent("foreign_read", PERSON, facts.turnStartedByHuman ? "artifact" : "this_call", "known"),
          about: "outside_org",
        };
      if (facts.owned === undefined)
        return askConsent("foreign_read", CLASSIFIER, "this_call", "facts_missing", "owned");
      if (facts.networkOff === undefined)
        return askConsent("foreign_read", CLASSIFIER, "this_call", "facts_missing", "networkOff");
      if (facts.networkOff)
        return askConsent(
          "foreign_read",
          CLASSIFIER,
          facts.turnStartedByHuman ? "artifact" : "this_call",
          "known",
        );
      return {
        ask: false,
        foreignRead: true,
      };
    }
  }
}
//@ chunk-0avm71bs.js:4571-4581 placement
/**
 * 是否对修改 artifact 公开状态的询问总是询问（当前恒 true），以及 artifact 同意记录的键构造。
 */
var ALWAYS_ASK_CONSENT = true;
//@ chunk-0avm71bs.js:4581-5063 placement
/**
 * 判断修改 artifact 公开状态是否需要询问：功能关闭或设为非公开时不问；设为公开或公开状态未知时按分类器规则询问。
 */
function classifyPublicWriteConsent(intent) {
  if (!ALWAYS_ASK_CONSENT)
    return {
      ask: false,
      foreignRead: false,
    };
  if (intent.public === true) return askConsent("public_change", "classifier", "this_call", "known");
  if (intent.public === undefined)
    return askConsent("public_change", "classifier", "this_call", "facts_missing", "public");
  if (intent.invitedByOtherOrg === true)
    return {
      ...askConsent("public_change", "classifier", "this_call", "known"),
      about: "someone_else",
    };
  if (intent.outsideAudience === true)
    return {
      ...askConsent("public_change", "classifier", "this_call", "known"),
      about: "outside_audience",
    };
  return {
    ask: false,
    foreignRead: false,
  };
}
//@ chunk-0avm71bs.js:5063-5167 placement
function askConsent(request, answeredBy, remember, basis, options) {
  return {
    ask: true,
    class: request,
    answeredBy,
    remember,
    basis,
    ...(options !== undefined && {
      missing: options,
    }),
  };
}
//@ chunk-0avm71bs.js:5167-5221 placement
/**
 * 导出函数 `isRememberedArtifactConsent`：参数 e，返回 e.ask && e.remember === "artifact"。
 */
function isRememberedArtifactConsent(entry) {
  return entry.ask && entry.remember === "artifact";
}
//@ chunk-0avm71bs.js:5221-5285 placement
/**
 * 导出函数 `consentClassKey`：参数 e，返回 e.endpoint ? `${e.class}:endpoint` : e.class。
 */
function consentClassKey(consentClass) {
  return consentClass.endpoint ? `${consentClass.class}:endpoint` : consentClass.class;
}
//@ chunk-0avm71bs.js:5285-5342 placement
/**
 * 导出函数 `hasClassConsent`：参数 e, n，返回 getLiveState().askClassConsent.has(g(e, n))。
 */
function hasClassConsent(consentClass, slug) {
  return getLiveState().askClassConsent.has(classConsentKey(consentClass, slug));
}
//@ chunk-0avm71bs.js:5342-5447 placement
/**
 * 记录本会话已对某类询问给出同意（可选同时记为本人同意）。
 */
function recordAskClassConsent(consentClass, slug, byUser = false) {
  let liveState = getLiveState();
  liveState.askClassConsent.add(classConsentKey(consentClass, slug));
  if (byUser) liveState.askClassPersonConsent.add(classConsentKey(consentClass, slug));
}
//@ chunk-0avm71bs.js:5447-5556 placement
/**
 * 按询问结果记住同意：仅告知的走告知记录；本人回答或强制时记为本人同意，否则记为一般同意。
 */
function rememberConsentForAsk(consentClass, slug, byUser = false) {
  let key = consentClassKey(consentClass);
  return consentClass.informedOnly
    ? hasOutsideOrgConsent(slug)
    : consentClass.answeredBy === "person" || byUser
      ? hasClassPersonConsent(key, slug)
      : hasClassConsent(key, slug);
}
//@ chunk-0avm71bs.js:5556-5628 placement
/**
 * 导出函数 `rememberOutsideOrgConsent`：参数 e。
 */
function rememberOutsideOrgConsent(slug) {
  getLiveState().askClassOutsideOrgConsent.add(classConsentKey("foreign_read", slug));
}
//@ chunk-0avm71bs.js:5628-5707 placement
/**
 * 导出函数 `hasOutsideOrgConsent`：参数 e，返回 getLiveState().askClassOutsideOrgConsent.has(g("foreign_read", e))。
 */
function hasOutsideOrgConsent(slug) {
  return getLiveState().askClassOutsideOrgConsent.has(classConsentKey("foreign_read", slug));
}
//@ chunk-0avm71bs.js:5707-5718 placement
var MAX_NAMED_OTHER_ORG = 512;
//@ chunk-0avm71bs.js:5718-5983 placement
/**
 * 记录一次询问中被点名的其他组织（与此前记录取交集），按工具调用 id 保存，超出容量时淘汰最旧的。
 */
function recordNamedOtherOrgs(request, orgNames, confirmed) {
  if (request.toolUseId === undefined) return;
  let askNamedOtherOrg = getLiveState().askNamedOtherOrg;
  let existing = askNamedOtherOrg.get(request.toolUseId);
  let candidates = confirmed ? orgNames : [];
  let namedOrgs =
    existing === undefined ? candidates : candidates.filter((orgName) => existing.includes(orgName));
  askNamedOtherOrg.delete(request.toolUseId);
  askNamedOtherOrg.set(request.toolUseId, namedOrgs);
  if (askNamedOtherOrg.size > MAX_NAMED_OTHER_ORG) {
    let oldestKey = askNamedOtherOrg.keys().next().value;
    if (oldestKey !== undefined) askNamedOtherOrg.delete(oldestKey);
  }
}
//@ chunk-0avm71bs.js:5983-6065 placement
/**
 * 导出函数 `forgetNamedOtherOrg`：参数 e。
 */
function forgetNamedOtherOrg(key) {
  if (key.toolUseId !== undefined) getLiveState().askNamedOtherOrg.delete(key.toolUseId);
}
//@ chunk-0avm71bs.js:6065-6169 placement
/**
 * 判断某次工具调用的询问中是否点名了指定的其他组织。
 */
function wasOtherOrgNamed(slug, orgName) {
  return (
    slug.toolUseId !== undefined &&
    (getLiveState().askNamedOtherOrg.get(slug.toolUseId) ?? []).includes(orgName)
  );
}
//@ chunk-0avm71bs.js:6169-6233 placement
/**
 * 导出函数 `hasClassPersonConsent`：参数 e, n，返回 getLiveState().askClassPersonConsent.has(g(e, n))。
 */
function hasClassPersonConsent(slug, slug_2) {
  return getLiveState().askClassPersonConsent.has(classConsentKey(slug, slug_2));
}
//@ chunk-0avm71bs.js:6233-6838 placement
/**
 * 会话里记录 artifact 同意的键名：读取/资源/外组织/处理器读写等按 slug 记的同意，以及房间加入、计划发布路径、监听与数据库写入批准；freeze 为共享空对象。
 */
var READ_CONSENT_SLUG_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ALL_CONSENT_KEYS;
var NO_CONSENT_STATE;
deferInit("chunk-0avm71bs.js:6233", () => {
  READ_CONSENT_SLUG_KEYS = [
    "artifactDbReadConsentSlugs",
    "artifactDbReadHumanConsentSlugs",
    "artifactReadConsentSlugs",
    "artifactAssetUploadConsentSlugs",
    "artifactAssetUploadHumanConsentSlugs",
    "artifactAssetReadConsentSlugs",
    "artifactAssetReadHumanConsentSlugs",
    "artifactOutsideOrgConsentSlugs",
    "artifactHandlersReadConsentSlugs",
    "artifactHandlersReadHumanConsentSlugs",
    "artifactHandlersWriteConsentSlugs",
    "artifactHandlersWriteHumanConsentSlugs",
  ];
  ALL_CONSENT_KEYS = [
    ...READ_CONSENT_SLUG_KEYS,
    "artifactRoomJoinConsentSlugs",
    "artifactPlanPublishConsentPaths",
    "artifactWatchApproved",
    "artifactDbWriteApproved",
    "artifactDbWriteHumanApproved",
  ];
  NO_CONSENT_STATE = Object.freeze({});
});
//@ chunk-0avm71bs.js:6838-6913 placement
/**
 * 导出函数 `consentEpochGuard`：参数 e，返回 (e.artifactConsentEpoch ?? 0) === getLiveState().accountEpoch ? e : freeze。
 */
function consentEpochGuard(appState) {
  return (appState.artifactConsentEpoch ?? 0) === getLiveState().accountEpoch ? appState : NO_CONSENT_STATE;
}
//@ chunk-0avm71bs.js:6913-6960 placement
/**
 * 导出函数 `hasSharedReadConsentClasses`：参数 e, n, r，返回 i5e(e)[n]?.[r] === !0。
 */
function hasSharedReadConsentClasses(consentClasses, slug, slug_2) {
  return consentEpochGuard(consentClasses)[slug]?.[slug_2] === true;
}
//@ chunk-0avm71bs.js:6960-7114 placement
/**
 * 判断当前同意纪元下是否已对该 artifact 给出共享读取同意。
 */
function hasSharedReadConsent(artifactRegistries, slug) {
  return hasSharedReadConsentClasses(
    {
      artifactConsentEpoch: artifactRegistries.consentEpoch.get(),
      artifactReadConsentSlugs: artifactRegistries.sharedReadConsent.get(),
    },
    "artifactReadConsentSlugs",
    slug,
  );
}
//@ chunk-0avm71bs.js:7114-7192 placement
/**
 * 导出函数 `consentEpochKey`：返回 `${accountEpoch}:${conversationEpoch}`。
 */
function consentEpochKey() {
  let { accountEpoch, conversationEpoch } = getLiveState();
  return `${accountEpoch}:${conversationEpoch}`;
}
//@ chunk-0avm71bs.js:7192-7235 placement
function classConsentKey(slug, consentClass) {
  return `${consentEpochKey()}:${slug}:${consentClass}`;
}
export {
  PERSON,
  hasSharedReadConsentClasses,
  rememberConsentForAsk,
  consentEpochGuard,
  classifyArtifactConsent,
  hasClassConsent,
  isRememberedArtifactConsent,
  recordNamedOtherOrgs,
  consentClassKey,
  wasOtherOrgNamed,
  forgetNamedOtherOrg,
  consentEpochKey,
  ALL_CONSENT_KEYS,
  hasClassPersonConsent,
  CLASSIFIER_2,
  hasSharedReadConsent,
  hasOutsideOrgConsent,
  recordAskClassConsent,
  rememberOutsideOrgConsent,
  classifyPublicWriteConsent,
};
