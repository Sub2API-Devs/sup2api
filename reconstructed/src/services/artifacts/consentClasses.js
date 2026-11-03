/**
 * services/artifacts/consentClasses.ts
 *
 * 2.1.316 新增：artifact 能力同意类别划分
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4xpk3fhh.js (23)
 * attribution: placement 23
 */
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-4xpk3fhh.js:2846-2893 placement
var CLASSIFIER = "classifier";
var PERSON = "person";
var CLASSIFIER_2 = "classifier";
//@ chunk-4xpk3fhh.js:2893-4252 placement
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
//@ chunk-4xpk3fhh.js:4252-4261 placement
/**
 * 是否对修改 artifact 公开状态的询问总是询问（当前恒 true），以及 artifact 同意记录的键构造。
 */
var ALWAYS_ASK_CONSENT = true;
//@ chunk-4xpk3fhh.js:4261-4470 placement
/**
 * 判断修改 artifact 公开状态是否需要询问：功能关闭或设为非公开时不问；设为公开或公开状态未知时按分类器规则询问。
 */
function classifyPublicWriteConsent(e) {
  if (!ALWAYS_ASK_CONSENT || e.public === false)
    return {
      ask: false,
      foreignRead: false,
    };
  return e.public === true
    ? askConsent("public_change", "classifier", "this_call", "known")
    : askConsent("public_change", "classifier", "this_call", "facts_missing", "public");
}
//@ chunk-4xpk3fhh.js:4470-4574 placement
function askConsent(e, answeredBy, remember, basis, s) {
  return {
    ask: true,
    class: e,
    answeredBy,
    remember,
    basis,
    ...(s !== undefined && {
      missing: s,
    }),
  };
}
//@ chunk-4xpk3fhh.js:4574-4628 placement
/**
 * 导出函数 `isRememberedArtifactConsent`：参数 e，返回 e.ask && e.remember === "artifact"。
 */
function isRememberedArtifactConsent(e) {
  return e.ask && e.remember === "artifact";
}
//@ chunk-4xpk3fhh.js:4628-4692 placement
/**
 * 导出函数 `consentClassKey`：参数 e，返回 e.endpoint ? `${e.class}:endpoint` : e.class。
 */
function consentClassKey(e) {
  return e.endpoint ? `${e.class}:endpoint` : e.class;
}
//@ chunk-4xpk3fhh.js:4692-4749 placement
/**
 * 导出函数 `hasClassConsent`：参数 e, n，返回 getLiveState().askClassConsent.has(g(e, n))。
 */
function hasClassConsent(e, slug) {
  return getLiveState().askClassConsent.has(classConsentKey(e, slug));
}
//@ chunk-4xpk3fhh.js:4749-4854 placement
/**
 * 记录本会话已对某类询问给出同意（可选同时记为本人同意）。
 */
function recordAskClassConsent(e, slug, r = false) {
  let liveState = getLiveState();
  liveState.askClassConsent.add(classConsentKey(e, slug));
  if (r) liveState.askClassPersonConsent.add(classConsentKey(e, slug));
}
//@ chunk-4xpk3fhh.js:4854-4963 placement
/**
 * 按询问结果记住同意：仅告知的走告知记录；本人回答或强制时记为本人同意，否则记为一般同意。
 */
function rememberConsentForAsk(e, slug, r = false) {
  let o = consentClassKey(e);
  return e.informedOnly
    ? hasOutsideOrgConsent(slug)
    : e.answeredBy === "person" || r
      ? hasClassPersonConsent(o, slug)
      : hasClassConsent(o, slug);
}
//@ chunk-4xpk3fhh.js:4963-5035 placement
/**
 * 导出函数 `rememberOutsideOrgConsent`：参数 e。
 */
function rememberOutsideOrgConsent(slug) {
  getLiveState().askClassOutsideOrgConsent.add(classConsentKey("foreign_read", slug));
}
//@ chunk-4xpk3fhh.js:5035-5114 placement
/**
 * 导出函数 `hasOutsideOrgConsent`：参数 e，返回 getLiveState().askClassOutsideOrgConsent.has(g("foreign_read", e))。
 */
function hasOutsideOrgConsent(e) {
  return getLiveState().askClassOutsideOrgConsent.has(classConsentKey("foreign_read", e));
}
//@ chunk-4xpk3fhh.js:5114-5125 placement
var MAX_NAMED_OTHER_ORG = 512;
//@ chunk-4xpk3fhh.js:5125-5390 placement
/**
 * 记录一次询问中被点名的其他组织（与此前记录取交集），按工具调用 id 保存，超出容量时淘汰最旧的。
 */
function recordNamedOtherOrgs(e, n, r) {
  if (e.toolUseId === undefined) return;
  let askNamedOtherOrg = getLiveState().askNamedOtherOrg;
  let s = askNamedOtherOrg.get(e.toolUseId);
  let f = r ? n : [];
  let l = s === undefined ? f : f.filter((u) => s.includes(u));
  askNamedOtherOrg.delete(e.toolUseId);
  askNamedOtherOrg.set(e.toolUseId, l);
  if (askNamedOtherOrg.size > MAX_NAMED_OTHER_ORG) {
    let u = askNamedOtherOrg.keys().next().value;
    if (u !== undefined) askNamedOtherOrg.delete(u);
  }
}
//@ chunk-4xpk3fhh.js:5390-5472 placement
/**
 * 导出函数 `forgetNamedOtherOrg`：参数 e。
 */
function forgetNamedOtherOrg(e) {
  if (e.toolUseId !== undefined) getLiveState().askNamedOtherOrg.delete(e.toolUseId);
}
//@ chunk-4xpk3fhh.js:5472-5576 placement
/**
 * 判断某次工具调用的询问中是否点名了指定的其他组织。
 */
function wasOtherOrgNamed(e, slug) {
  return e.toolUseId !== undefined && (getLiveState().askNamedOtherOrg.get(e.toolUseId) ?? []).includes(slug);
}
//@ chunk-4xpk3fhh.js:5576-5640 placement
/**
 * 导出函数 `hasClassPersonConsent`：参数 e, n，返回 getLiveState().askClassPersonConsent.has(g(e, n))。
 */
function hasClassPersonConsent(e, slug) {
  return getLiveState().askClassPersonConsent.has(classConsentKey(e, slug));
}
//@ chunk-4xpk3fhh.js:5640-6245 placement
/**
 * 会话里记录 artifact 同意的键名：读取/资源/外组织/处理器读写等按 slug 记的同意，以及房间加入、计划发布路径、监听与数据库写入批准；freeze 为共享空对象。
 */
var READ_CONSENT_SLUG_KEYS = [
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
var ALL_CONSENT_KEYS = [
  ...READ_CONSENT_SLUG_KEYS,
  "artifactRoomJoinConsentSlugs",
  "artifactPlanPublishConsentPaths",
  "artifactWatchApproved",
  "artifactDbWriteApproved",
  "artifactDbWriteHumanApproved",
];
var re = Object.freeze({});
//@ chunk-4xpk3fhh.js:6245-6320 placement
/**
 * 导出函数 `consentEpochGuard`：参数 e，返回 (e.artifactConsentEpoch ?? 0) === getLiveState().accountEpoch ? e : freeze。
 */
function consentEpochGuard(appState) {
  return (appState.artifactConsentEpoch ?? 0) === getLiveState().accountEpoch ? appState : re;
}
//@ chunk-4xpk3fhh.js:6320-6367 placement
/**
 * 导出函数 `hasSharedReadConsentClasses`：参数 e, n, r，返回 i5e(e)[n]?.[r] === !0。
 */
function hasSharedReadConsentClasses(e, n, slug) {
  return consentEpochGuard(e)[n]?.[slug] === true;
}
//@ chunk-4xpk3fhh.js:6367-6521 placement
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
//@ chunk-4xpk3fhh.js:6521-6599 placement
/**
 * 导出函数 `consentEpochKey`：返回 `${accountEpoch}:${conversationEpoch}`。
 */
function consentEpochKey() {
  let { accountEpoch, conversationEpoch } = getLiveState();
  return `${accountEpoch}:${conversationEpoch}`;
}
//@ chunk-4xpk3fhh.js:6599-6642 placement
function classConsentKey(e, n) {
  return `${consentEpochKey()}:${e}:${n}`;
}
export {
  PERSON,
  hasSharedReadConsentClasses,
  rememberConsentForAsk,
  consentEpochGuard,
  classifyArtifactConsent,
  hasClassConsent,
  hasSharedReadConsent,
  isRememberedArtifactConsent,
  classifyPublicWriteConsent,
  recordNamedOtherOrgs,
  wasOtherOrgNamed,
  forgetNamedOtherOrg,
  consentClassKey,
  hasOutsideOrgConsent,
  consentEpochKey,
  recordAskClassConsent,
  rememberOutsideOrgConsent,
  hasClassPersonConsent,
  ALL_CONSENT_KEYS,
  CLASSIFIER_2,
};
