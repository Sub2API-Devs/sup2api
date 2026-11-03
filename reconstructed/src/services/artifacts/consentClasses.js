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
var CLASSIFIER = "classifier",
  PERSON = "person",
  CLASSIFIER_2 = "classifier";
/**
 * 按 artifact 操作决定是否需要同意及由谁回答：delete/change_access 问人；standing_job、write、read 按是否由人发起、是否公开、是否属于他组织、是否本人所有、网络是否关闭等事实决定 ask（类别/回答者/记住范围/依据/缺失事实）或直接放行（read 可标记为外部读取）。
 */
//@ chunk-4xpk3fhh.js:2893-4252 placement
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
          (facts.routineWrite === !0 || facts.commentWrite === !0) &&
          facts.public === !1 &&
          facts.canWrite === !0 &&
          facts.invitedByOtherOrg !== !0
        )
          return { ask: !1, foreignRead: !1 };
        return askConsent("public_change", "classifier", "this_call", "unattended");
      }
      if (facts.public === !0) return askConsent("public_change", "classifier", "artifact", "known");
      if (facts.public === void 0)
        return askConsent("public_change", "classifier", "this_call", "facts_missing", "public");
      if (facts.invitedByOtherOrg === !0)
        return { ...askConsent("public_change", "classifier", "artifact", "known"), about: "someone_else" };
      return { ask: !1, foreignRead: !1 };
    }
    case "read": {
      if (facts.owned === !0) return { ask: !1, foreignRead: !1 };
      if (facts.outsideOrg === !0)
        return {
          ...askConsent("foreign_read", PERSON, facts.turnStartedByHuman ? "artifact" : "this_call", "known"),
          about: "outside_org",
        };
      if (facts.owned === void 0)
        return askConsent("foreign_read", CLASSIFIER, "this_call", "facts_missing", "owned");
      if (facts.networkOff === void 0)
        return askConsent("foreign_read", CLASSIFIER, "this_call", "facts_missing", "networkOff");
      if (facts.networkOff)
        return askConsent(
          "foreign_read",
          CLASSIFIER,
          facts.turnStartedByHuman ? "artifact" : "this_call",
          "known",
        );
      return { ask: !1, foreignRead: !0 };
    }
  }
}
//@ chunk-4xpk3fhh.js:4252-4261 placement
var Z = !0;
/**
 * 判断修改 artifact 公开状态是否需要询问：功能关闭或设为非公开时不问；设为公开或公开状态未知时按分类器规则询问。
 */
//@ chunk-4xpk3fhh.js:4261-4470 placement
function classifyPublicWriteConsent(e) {
  if (!Z || e.public === !1) return { ask: !1, foreignRead: !1 };
  return e.public === !0
    ? askConsent("public_change", "classifier", "this_call", "known")
    : askConsent("public_change", "classifier", "this_call", "facts_missing", "public");
}
//@ chunk-4xpk3fhh.js:4470-4574 placement
function askConsent(e, n, r, o, s) {
  return { ask: !0, class: e, answeredBy: n, remember: r, basis: o, ...(s !== void 0 && { missing: s }) };
}
//@ chunk-4xpk3fhh.js:4574-4628 placement
function Ncr(e) {
  return e.ask && e.remember === "artifact";
}
//@ chunk-4xpk3fhh.js:4628-4692 placement
function iRt(e) {
  return e.endpoint ? `${e.class}:endpoint` : e.class;
}
//@ chunk-4xpk3fhh.js:4692-4749 placement
function b3(e, n) {
  return getLiveState().askClassConsent.has(g(e, n));
}
/**
 * 记录本会话已对某类询问给出同意（可选同时记为本人同意）。
 */
//@ chunk-4xpk3fhh.js:4749-4854 placement
function recordAskClassConsent(e, n, r = !1) {
  let o = getLiveState();
  if ((o.askClassConsent.add(g(e, n)), r)) o.askClassPersonConsent.add(g(e, n));
}
/**
 * 按询问结果记住同意：仅告知的走告知记录；本人回答或强制时记为本人同意，否则记为一般同意。
 */
//@ chunk-4xpk3fhh.js:4854-4963 placement
function rememberConsentForAsk(e, n, r = !1) {
  let o = iRt(e);
  return e.informedOnly ? Res(n) : e.answeredBy === "person" || r ? z5t(o, n) : b3(o, n);
}
//@ chunk-4xpk3fhh.js:4963-5035 placement
function Iyi(e) {
  getLiveState().askClassOutsideOrgConsent.add(g("foreign_read", e));
}
//@ chunk-4xpk3fhh.js:5035-5114 placement
function Res(e) {
  return getLiveState().askClassOutsideOrgConsent.has(g("foreign_read", e));
}
//@ chunk-4xpk3fhh.js:5114-5125 placement
var te = 512;
/**
 * 记录一次询问中被点名的其他组织（与此前记录取交集），按工具调用 id 保存，超出容量时淘汰最旧的。
 */
//@ chunk-4xpk3fhh.js:5125-5390 placement
function recordNamedOtherOrgs(e, n, r) {
  if (e.toolUseId === void 0) return;
  let askNamedOtherOrg = getLiveState().askNamedOtherOrg,
    s = askNamedOtherOrg.get(e.toolUseId),
    f = r ? n : [],
    l = s === void 0 ? f : f.filter((u) => s.includes(u));
  if (
    (askNamedOtherOrg.delete(e.toolUseId), askNamedOtherOrg.set(e.toolUseId, l), askNamedOtherOrg.size > te)
  ) {
    let u = askNamedOtherOrg.keys().next().value;
    if (u !== void 0) askNamedOtherOrg.delete(u);
  }
}
//@ chunk-4xpk3fhh.js:5390-5472 placement
function xQr(e) {
  if (e.toolUseId !== void 0) getLiveState().askNamedOtherOrg.delete(e.toolUseId);
}
/**
 * 判断某次工具调用的询问中是否点名了指定的其他组织。
 */
//@ chunk-4xpk3fhh.js:5472-5576 placement
function wasOtherOrgNamed(e, n) {
  return e.toolUseId !== void 0 && (getLiveState().askNamedOtherOrg.get(e.toolUseId) ?? []).includes(n);
}
//@ chunk-4xpk3fhh.js:5576-5640 placement
function z5t(e, n) {
  return getLiveState().askClassPersonConsent.has(g(e, n));
}
/**
 * 会话里记录 artifact 同意的键名：读取/资源/外组织/处理器读写等按 slug 记的同意，以及房间加入、计划发布路径、监听与数据库写入批准；freeze 为共享空对象。
 */
//@ chunk-4xpk3fhh.js:5640-6245 placement
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
  ],
  ALL_CONSENT_KEYS = [
    ...READ_CONSENT_SLUG_KEYS,
    "artifactRoomJoinConsentSlugs",
    "artifactPlanPublishConsentPaths",
    "artifactWatchApproved",
    "artifactDbWriteApproved",
    "artifactDbWriteHumanApproved",
  ],
  freeze = Object.freeze({});
//@ chunk-4xpk3fhh.js:6245-6320 placement
function i5e(e) {
  return (e.artifactConsentEpoch ?? 0) === getLiveState().accountEpoch ? e : freeze;
}
//@ chunk-4xpk3fhh.js:6320-6367 placement
function Hte(e, n, r) {
  return i5e(e)[n]?.[r] === !0;
}
/**
 * 判断当前同意纪元下是否已对该 artifact 给出共享读取同意。
 */
//@ chunk-4xpk3fhh.js:6367-6521 placement
function hasSharedReadConsent(e, n) {
  return Hte(
    { artifactConsentEpoch: e.consentEpoch.get(), artifactReadConsentSlugs: e.sharedReadConsent.get() },
    "artifactReadConsentSlugs",
    n,
  );
}
//@ chunk-4xpk3fhh.js:6521-6599 placement
function $it() {
  let { accountEpoch: accountEpoch, conversationEpoch: conversationEpoch } = getLiveState();
  return `${accountEpoch}:${conversationEpoch}`;
}
//@ chunk-4xpk3fhh.js:6599-6642 placement
function g(e, n) {
  return `${$it()}:${e}:${n}`;
}

export {
  PERSON,
  Hte,
  rememberConsentForAsk,
  i5e,
  classifyArtifactConsent,
  b3,
  hasSharedReadConsent,
  Ncr,
  classifyPublicWriteConsent,
  recordNamedOtherOrgs,
  wasOtherOrgNamed,
  xQr,
  iRt,
  Res,
  $it,
  recordAskClassConsent,
  Iyi,
  z5t,
  ALL_CONSENT_KEYS,
  CLASSIFIER_2,
};
