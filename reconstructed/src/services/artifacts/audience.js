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
import { mayHaveForeignWriters } from "./frameComments.js";
import { extractJsonScriptById } from "./pageScripts.js";
import {
  isFrameSameChannelRawReadEnabled,
  isFrameSameOrgInlineReadEnabled,
  isFrameLiveSubscribeEnabled,
} from "./frameFlags.js";
import {
  COWRITTEN_HTML_BELOW_SESSION,
  COWRITTEN_HTML_ABOVE_PUBLISHED,
  COWRITTEN_HTML_BELOW_CREATED,
  COWRITTEN_HTML_ABOVE_CREATED,
  COWRITTEN_HTML_BELOW_OTHERS,
  COWRITTEN_HTML_ABOVE_OWNED,
  COWRITTEN_ARTIFACT_PROMPTS,
  COWRITTEN_HTML_ABOVE_OTHERS,
  COWRITTEN_HTML_BELOW_UNPUBLISHED,
  COWRITTEN_HTML_ABOVE_UNPUBLISHED,
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
import { ORG_SCOPE_CACHE_MS } from "./orgScope.js";
import { checkBehindLive } from "./liveSubscribe.js";

//@ chunk-jv307fw4.js:23883-23944 placement
var SAFE_AUDIENCE_KEY_RE = /^[a-z][a-z0-9_-]{0,63}$/;
var AUDIENCE_SCOPES = ["users", "org", "public"];
//@ chunk-jv307fw4.js:23944-24045 placement
/**
 * 读取受众信息中的文档数量，非安全非负整数时返回 undefined。
 */
function getDocumentCount(dbUsage) {
  let documents = dbUsage?.documents;
  return typeof documents === "number" && Number.isSafeInteger(documents) && documents >= 0
    ? documents
    : undefined;
}
//@ chunk-jv307fw4.js:24045-24132 placement
var CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
var regExp = new RegExp(CONTROL_CHAR_REGEX, "g");
//@ chunk-jv307fw4.js:24132-24172 placement
function stripControlChars(e) {
  return e.replace(regExp, "");
}
//@ chunk-jv307fw4.js:24172-24348 placement
function classifyPageOwnership(e, n, r, s, a) {
  let l = isVouchedOwnVer(n, r, e.ver);
  let d = !e.typeLocked && !e.publicRead && !s && !a;
  let h = d && !mayHaveForeignWriters(e);
  return {
    workshopPage: s,
    ownVersion: l,
    ownBytesPage: d,
    plainOwner: h,
    vouchedOwn: h && l,
  };
}
//@ chunk-jv307fw4.js:24348-24454 placement
async function assessOwnArtifactPage(e, ownPublishes, r, s = {}) {
  return classifyPageOwnership(
    e,
    ownPublishes,
    r,
    (await extractJsonScriptById(e.html, "ws-decisions")) !== null,
    s.savedInPage === true,
  );
}
//@ chunk-jv307fw4.js:24454-24554 placement
async function isVouchedOwnPage(e, ownPublishes, slug) {
  return (
    classifyPageOwnership(e, ownPublishes, slug, false, false).vouchedOwn &&
    (await extractJsonScriptById(e.html, "ws-decisions")) === null
  );
}
//@ chunk-jv307fw4.js:24554-24743 placement
function getSharedReadLane(e) {
  if (e.publicRead || e.offOrgRamp === true || e.external === true || e.role === "owner") return null;
  if (e.role === "writer" && e.sameChannel === true && isFrameSameChannelRawReadEnabled()) return "channel";
  return isFrameSameOrgInlineReadEnabled() ? "shared" : null;
}
//@ chunk-jv307fw4.js:24743-25192 placement
/**
 * 根据角色（owner/writer/共写/外部组织）决定页面源码给模型时的包装方式（untrusted 框定或截断）。
 */
function buildAudienceFraming(e) {
  let n = e.role !== "owner" || e.cowritten || e.typeLocked === true || e.outsideOrg === true;
  let pageText = extractPageText(e.html, "page");
  let head = (a) => truncatePageText(pageText, a, "page");
  if (n || !e.vouchedOwn) {
    let [a, l] =
      n && e.sameChannel === true
        ? [COWRITTEN_HTML_BELOW_SESSION, COWRITTEN_HTML_ABOVE_PUBLISHED]
        : e.typeLocked
          ? [COWRITTEN_HTML_BELOW_CREATED, COWRITTEN_HTML_ABOVE_CREATED]
          : e.role === "owner" && e.outsideOrg === true
            ? [COWRITTEN_HTML_BELOW_OTHERS, COWRITTEN_HTML_ABOVE_OWNED]
            : n
              ? [COWRITTEN_ARTIFACT_PROMPTS, COWRITTEN_HTML_ABOVE_OTHERS]
              : [COWRITTEN_HTML_BELOW_UNPUBLISHED, COWRITTEN_HTML_ABOVE_UNPUBLISHED];
    return {
      enveloped: true,
      otherWriters: n,
      lead: `${a}
<${COWRITTEN_ARTIFACT_HTML}>
`,
      body: pageText,
      tail: `
</${COWRITTEN_ARTIFACT_HTML}>

${l}`,
      head,
    };
  }
  return {
    enveloped: false,
    otherWriters: false,
    lead: "",
    body: pageText,
    tail: "",
    head,
  };
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
function truncatePageText(pageText, n, r = "all") {
  if (n <= 0) return "";
  for (let s = n; ; s--) {
    let a = scrubPageText(scrubbedHead(pageText, s, r));
    if (a.length <= n) return a;
  }
}
//@ chunk-jv307fw4.js:25376-25608 placement
function getLiveSubscriptionToken(e) {
  if (!isFrameLiveSubscribeEnabled()) return;
  if (e.syncClient === true)
    return typeof e.syncToken === "string" && e.syncToken !== ""
      ? {
          transport: "sync",
          token: e.syncToken,
        }
      : undefined;
  return e.subscriptionToken
    ? {
        transport: "live",
        token: e.subscriptionToken,
      }
    : undefined;
}
//@ chunk-jv307fw4.js:35848-35897 placement
function isWriterRole(role) {
  return role === "owner" || role === "writer";
}
//@ chunk-jv307fw4.js:35897-35945 placement
function ownerVisibleRole(role, n) {
  return n && role === "owner" ? undefined : role;
}
//@ chunk-jv307fw4.js:35945-36012 placement
function isReaderRole(role) {
  return role === "reader" || role === "viewer" || role === "commenter";
}
//@ chunk-jv307fw4.js:36012-36542 placement
/**
 * 探测 artifact：取 boot 数据，判定角色/受众/资产令牌并返回可用于读写的上下文。
 */
async function probeArtifactAccess(e, signal, credentials, s) {
  let artifactBoot = await fetchArtifactBoot(e, signal, {
    readBack: s?.readBack === true,
    credentials,
  });
  if (artifactBoot.err !== null)
    return {
      err: artifactBoot.err,
      errorCode: artifactBoot.errorCode,
      ...(artifactBoot.gone && {
        gone: true,
      }),
    };
  let l = artifactBoot.assetToken === undefined;
  let role = artifactBoot.data.perm?.role;
  let h = triState(artifactBoot.data.outsideWriter);
  let currentStoredDecl = getCurrentStoredDecl(artifactBoot.data);
  return {
    err: null,
    mode: l ? "public" : (artifactBoot.data.perm?.mode ?? artifactBoot.data.mode),
    shared: artifactBoot.data.shared,
    role: ownerVisibleRole(role, l),
    outsideOrgReader: l,
    cowritten: artifactBoot.data.cowritten === true,
    ...(h !== undefined && {
      outsideWriter: h,
    }),
    ...(typeof artifactBoot.data.title === "string" && {
      title: artifactBoot.data.title,
    }),
    ...(currentStoredDecl !== undefined && {
      readBack: currentStoredDecl,
    }),
    boot: artifactBoot,
  };
}
//@ chunk-jv307fw4.js:36542-36805 placement
/**
 * 从发布读回结果里取出已存储的 frame 声明：类型实例必须带类型锁，且类型锁不能落后于最新发行版；不满足返回 undefined。
 */
function getCurrentStoredDecl(e) {
  if (e.readback === undefined || typeof e.typeInstance !== "boolean") return;
  let n = storedDeclFromWire(e.readback);
  if (n === undefined) return;
  let r = e.typeInstance || typeLockFromWire(e.type) !== undefined;
  let typeLock = n.typeLock;
  if (r && typeLock === undefined) return;
  if (typeLock?.latest !== undefined && typeLock.latest !== typeLock.current) return;
  return n;
}
//@ chunk-jv307fw4.js:36805-36997 placement
function getRecentProbeBoot(slug, toolUseId) {
  if (toolUseId === undefined) return;
  let r = getLiveState().shareStatus.probeBoots.get(slug);
  return r !== undefined &&
    r.toolUseId === toolUseId &&
    Date.now() - r.issuedAt <= ORG_SCOPE_CACHE_MS &&
    !checkBehindLive(slug, r.boot.ver).behind
    ? getCurrentStoredDecl(r.boot.data)
    : undefined;
}
//@ chunk-jv307fw4.js:41220-41354 placement
function isAudienceVersionServed(e) {
  return (
    e.servedAudienceVersion === true ||
    e.audience === "owner" ||
    e.audienceView === "live" ||
    e.audienceView === "pinned-current"
  );
}
//@ chunk-jv307fw4.js:41354-41368 placement
var SOURCE_KEY = "_src";
//@ chunk-jv307fw4.js:41368-41471 placement
function canReadAssets(artifactBootWithProbe) {
  return (
    artifactBootWithProbe.assetToken !== undefined &&
    (artifactBootWithProbe.data.mode !== "external" || artifactBootWithProbe.data.perm?.role === "writer")
  );
}
//@ chunk-jv307fw4.js:41471-41716 placement
function classifyArtifactOwnership(artifactBootWithProbe) {
  let { mode, perm } = artifactBootWithProbe.data;
  if (mode === "external") return "external";
  if (artifactBootWithProbe.assetToken === undefined) return "public";
  if (mode !== undefined) return "unproven";
  if (perm?.role === "owner") return "own";
  return typeof perm?.mode === "string" && perm.mode !== "" ? "same" : "unproven";
}
//@ chunk-jv307fw4.js:41716-41761 placement
function isForeignOwnership(e) {
  return e !== "own" && e !== "same";
}
//@ chunk-jv307fw4.js:41761-41827 placement
function buildFrameFilePath(ver, n) {
  return `/_f/${ver}/${SOURCE_KEY}/${n === "" ? "index.html" : n}`;
}
//@ chunk-jv307fw4.js:41827-41841 placement
/**
 * 导出常量或表 `AUDIENCE_QUERY_TIMEOUT_MS`：值为 30000; export { scrubPageText, assessOwnArtifactPage, getSharedReadLane, CONTROL_CHAR_REGEX, buildAudienceFraming, isWri…。
 */
var AUDIENCE_QUERY_TIMEOUT_MS = 30000;
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
  AUDIENCE_QUERY_TIMEOUT_MS,
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
  ownerVisibleRole,
  AUDIENCE_SCOPES,
  getCurrentStoredDecl,
  getDocumentCount,
  SAFE_AUDIENCE_KEY_RE,
};
