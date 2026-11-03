/**
 * services/artifacts/audience.ts
 *
 * 2.1.316 新增：按角色决定 artifact 页面源码给模型时的框定方式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (26)
 * attribution: placement 26
 */
import { isVouchedOwnVer } from "./ownPublishes.js";
import { v_e } from "./frameComments.js";
import { extractJsonScriptById } from "./pageScripts.js";
import {
  isFrameSameChannelRawReadEnabled,
  isFrameSameOrgInlineReadEnabled,
  isFrameLiveSubscribeEnabled,
} from "./frameFlags.js";
import {
  sDi,
  iDi,
  aDi,
  lDi,
  rDi,
  oDi,
  COWRITTEN_ARTIFACT_PROMPTS,
  nDi,
  dDi,
  cDi,
  COWRITTEN_ARTIFACT_HTML,
  RESERVED_XML_TAGS,
} from "../../constants/xml.js";
import { neutralizeForgedMarkup } from "../../utils/subagentOutputScan.js";
import { scrubArtifactEnvelopeTags, scrubbedHead } from "../../tools/ArtifactTool/artifactUrls.js";
import { fetchArtifactBoot } from "./boot.js";
import { triState } from "./shareEntries.js";
import { storedDeclFromWire } from "./readBack.js";
import { typeLockFromWire } from "./pagePreparation.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { st } from "./orgScope.js";
import { checkBehindLive } from "./liveSubscribe.js";

//@ chunk-jv307fw4.js:23883-23944 placement
var Dt = /^[a-z][a-z0-9_-]{0,63}$/,
  Qe = ["users", "org", "public"];
/**
 * 读取受众信息中的文档数量，非安全非负整数时返回 undefined。
 */
//@ chunk-jv307fw4.js:23944-24045 placement
function getDocumentCount(e) {
  let n = e?.documents;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : void 0;
}
//@ chunk-jv307fw4.js:24045-24132 placement
var CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/,
  regExp = new RegExp(CONTROL_CHAR_REGEX, "g");
//@ chunk-jv307fw4.js:24132-24172 placement
function stripControlChars(e) {
  return e.replace(regExp, "");
}
//@ chunk-jv307fw4.js:24172-24348 placement
function classifyPageOwnership(e, n, r, s, a) {
  let l = isVouchedOwnVer(n, r, e.ver),
    d = !e.typeLocked && !e.publicRead && !s && !a,
    h = d && !v_e(e);
  return { workshopPage: s, ownVersion: l, ownBytesPage: d, plainOwner: h, vouchedOwn: h && l };
}
//@ chunk-jv307fw4.js:24348-24454 placement
async function assessOwnArtifactPage(e, n, r, s = {}) {
  return classifyPageOwnership(
    e,
    n,
    r,
    (await extractJsonScriptById(e.html, "ws-decisions")) !== null,
    s.savedInPage === !0,
  );
}
//@ chunk-jv307fw4.js:24454-24554 placement
async function isVouchedOwnPage(e, n, r) {
  return (
    classifyPageOwnership(e, n, r, !1, !1).vouchedOwn &&
    (await extractJsonScriptById(e.html, "ws-decisions")) === null
  );
}
//@ chunk-jv307fw4.js:24554-24743 placement
function getSharedReadLane(e) {
  if (e.publicRead || e.offOrgRamp === !0 || e.external === !0 || e.role === "owner") return null;
  if (e.role === "writer" && e.sameChannel === !0 && isFrameSameChannelRawReadEnabled()) return "channel";
  return isFrameSameOrgInlineReadEnabled() ? "shared" : null;
}
/**
 * 根据角色（owner/writer/共写/外部组织）决定页面源码给模型时的包装方式（untrusted 框定或截断）。
 */
//@ chunk-jv307fw4.js:24743-25192 placement
function buildAudienceFraming(e) {
  let n = e.role !== "owner" || e.cowritten || e.typeLocked === !0 || e.outsideOrg === !0,
    r = extractPageText(e.html, "page"),
    s = (a) => truncatePageText(r, a, "page");
  if (n || !e.vouchedOwn) {
    let [a, l] =
      n && e.sameChannel === !0
        ? [sDi, iDi]
        : e.typeLocked
          ? [aDi, lDi]
          : e.role === "owner" && e.outsideOrg === !0
            ? [rDi, oDi]
            : n
              ? [COWRITTEN_ARTIFACT_PROMPTS, nDi]
              : [dDi, cDi];
    return {
      enveloped: !0,
      otherWriters: n,
      lead: `${a}
<${COWRITTEN_ARTIFACT_HTML}>
`,
      body: r,
      tail: `
</${COWRITTEN_ARTIFACT_HTML}>

${l}`,
      head: s,
    };
  }
  return { enveloped: !1, otherWriters: !1, lead: "", body: r, tail: "", head: s };
}
//@ chunk-jv307fw4.js:25192-25225 placement
function scrubPageText(e) {
  return neutralizeForgedMarkup(e, RESERVED_XML_TAGS);
}
//@ chunk-jv307fw4.js:25225-25268 placement
function extractPageText(e, n = "all") {
  return scrubPageText(scrubArtifactEnvelopeTags(e, n));
}
//@ chunk-jv307fw4.js:25268-25376 placement
function truncatePageText(e, n, r = "all") {
  if (n <= 0) return "";
  for (let s = n; ; s--) {
    let a = scrubPageText(scrubbedHead(e, s, r));
    if (a.length <= n) return a;
  }
}
//@ chunk-jv307fw4.js:25376-25608 placement
function getLiveSubscriptionToken(e) {
  if (!isFrameLiveSubscribeEnabled()) return;
  if (e.syncClient === !0)
    return typeof e.syncToken === "string" && e.syncToken !== ""
      ? { transport: "sync", token: e.syncToken }
      : void 0;
  return e.subscriptionToken ? { transport: "live", token: e.subscriptionToken } : void 0;
}
//@ chunk-jv307fw4.js:35848-35897 placement
function isWriterRole(e) {
  return e === "owner" || e === "writer";
}
//@ chunk-jv307fw4.js:35897-35945 placement
function dt(e, n) {
  return n && e === "owner" ? void 0 : e;
}
//@ chunk-jv307fw4.js:35945-36012 placement
function isReaderRole(e) {
  return e === "reader" || e === "viewer" || e === "commenter";
}
/**
 * 探测 artifact：取 boot 数据，判定角色/受众/资产令牌并返回可用于读写的上下文。
 */
//@ chunk-jv307fw4.js:36012-36542 placement
async function probeArtifactAccess(e, n, r, s) {
  let a = await fetchArtifactBoot(e, n, { readBack: s?.readBack === !0, credentials: r });
  if (a.err !== null) return { err: a.err, errorCode: a.errorCode, ...(a.gone && { gone: !0 }) };
  let l = a.assetToken === void 0,
    d = a.data.perm?.role,
    h = triState(a.data.outsideWriter),
    b = getCurrentStoredDecl(a.data);
  return {
    err: null,
    mode: l ? "public" : (a.data.perm?.mode ?? a.data.mode),
    shared: a.data.shared,
    role: dt(d, l),
    outsideOrgReader: l,
    cowritten: a.data.cowritten === !0,
    ...(h !== void 0 && { outsideWriter: h }),
    ...(typeof a.data.title === "string" && { title: a.data.title }),
    ...(b !== void 0 && { readBack: b }),
    boot: a,
  };
}
/**
 * 从发布读回结果里取出已存储的 frame 声明：类型实例必须带类型锁，且类型锁不能落后于最新发行版；不满足返回 undefined。
 */
//@ chunk-jv307fw4.js:36542-36805 placement
function getCurrentStoredDecl(e) {
  if (e.readback === void 0 || typeof e.typeInstance !== "boolean") return;
  let n = storedDeclFromWire(e.readback);
  if (n === void 0) return;
  let r = e.typeInstance || typeLockFromWire(e.type) !== void 0,
    typeLock = n.typeLock;
  if (r && typeLock === void 0) return;
  if (typeLock?.latest !== void 0 && typeLock.latest !== typeLock.current) return;
  return n;
}
//@ chunk-jv307fw4.js:36805-36997 placement
function getRecentProbeBoot(e, n) {
  if (n === void 0) return;
  let r = getLiveState().shareStatus.probeBoots.get(e);
  return r !== void 0 &&
    r.toolUseId === n &&
    Date.now() - r.issuedAt <= st &&
    !checkBehindLive(e, r.boot.ver).behind
    ? getCurrentStoredDecl(r.boot.data)
    : void 0;
}
//@ chunk-jv307fw4.js:41220-41354 placement
function isAudienceVersionServed(e) {
  return (
    e.servedAudienceVersion === !0 ||
    e.audience === "owner" ||
    e.audienceView === "live" ||
    e.audienceView === "pinned-current"
  );
}
//@ chunk-jv307fw4.js:41354-41368 placement
var on = "_src";
//@ chunk-jv307fw4.js:41368-41471 placement
function canReadAssets(e) {
  return e.assetToken !== void 0 && (e.data.mode !== "external" || e.data.perm?.role === "writer");
}
//@ chunk-jv307fw4.js:41471-41716 placement
function classifyArtifactOwnership(e) {
  let { mode: mode, perm: perm } = e.data;
  if (mode === "external") return "external";
  if (e.assetToken === void 0) return "public";
  if (mode !== void 0) return "unproven";
  if (perm?.role === "owner") return "own";
  return typeof perm?.mode === "string" && perm.mode !== "" ? "same" : "unproven";
}
//@ chunk-jv307fw4.js:41716-41761 placement
function isForeignOwnership(e) {
  return e !== "own" && e !== "same";
}
//@ chunk-jv307fw4.js:41761-41827 placement
function buildFrameFilePath(e, n) {
  return `/_f/${e}/${on}/${n === "" ? "index.html" : n}`;
}
//@ chunk-jv307fw4.js:41827-41841 placement
var TFr = 30000;

export {
  scrubPageText,
  assessOwnArtifactPage,
  getSharedReadLane,
  CONTROL_CHAR_REGEX,
  buildAudienceFraming,
  isWriterRole,
  classifyArtifactOwnership,
  canReadAssets,
  isForeignOwnership,
  TFr,
  buildFrameFilePath,
  extractPageText,
  stripControlChars,
  getRecentProbeBoot,
  truncatePageText,
  isVouchedOwnPage,
  probeArtifactAccess,
  isAudienceVersionServed,
  getLiveSubscriptionToken,
  isReaderRole,
  dt,
  Qe,
  getCurrentStoredDecl,
  getDocumentCount,
  Dt,
};
