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
import { deferInit } from "../../../runtime/deferred-init.js";

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
var CONTROL_CHAR_REGEX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
deferInit("chunk-jv307fw4.js:24045", () => {
  CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
  regExp = new RegExp(CONTROL_CHAR_REGEX, "g");
});
//@ chunk-jv307fw4.js:24132-24172 placement
function stripControlChars(text) {
  return text.replace(regExp, "");
}
//@ chunk-jv307fw4.js:24172-24348 placement
function classifyPageOwnership(assess, ver, vouched, journal, sameChannel) {
  let ownVer = isVouchedOwnVer(ver, vouched, assess.ver);
  let maybeOwn = !assess.typeLocked && !assess.publicRead && !journal && !sameChannel;
  let noForeign = maybeOwn && !mayHaveForeignWriters(assess);
  return {
    workshopPage: journal,
    ownVersion: ownVer,
    ownBytesPage: maybeOwn,
    plainOwner: noForeign,
    vouchedOwn: noForeign && ownVer,
  };
}
//@ chunk-jv307fw4.js:24348-24454 placement
async function assessOwnArtifactPage(artifact, ver, ownPublishMap, options = {}) {
  return classifyPageOwnership(
    artifact,
    ver,
    ownPublishMap,
    (await extractJsonScriptById(artifact.html, "ws-decisions")) !== null,
    options.savedInPage === true,
  );
}
//@ chunk-jv307fw4.js:24454-24554 placement
async function isVouchedOwnPage(html, ver, vouched) {
  return (
    classifyPageOwnership(html, ver, vouched, false, false).vouchedOwn &&
    (await extractJsonScriptById(html.html, "ws-decisions")) === null
  );
}
//@ chunk-jv307fw4.js:24554-24743 placement
function getSharedReadLane(read) {
  if (read.publicRead || read.offOrgRamp === true || read.external === true || read.role === "owner")
    return null;
  if (read.role === "writer" && read.sameChannel === true && isFrameSameChannelRawReadEnabled())
    return "channel";
  return isFrameSameOrgInlineReadEnabled() ? "shared" : null;
}
//@ chunk-jv307fw4.js:24743-25192 placement
/**
 * 根据角色（owner/writer/共写/外部组织）决定页面源码给模型时的包装方式（untrusted 框定或截断）。
 */
function buildAudienceFraming(meta) {
  let base = meta.role !== "owner" || meta.cowritten || meta.typeLocked === true || meta.outsideOrg === true;
  let pageText = extractPageText(meta.html, "page");
  let head = (limit) => truncatePageText(pageText, limit, "page");
  if (base || !meta.vouchedOwn) {
    let [headText, tailText] =
      base && meta.sameChannel === true
        ? [COWRITTEN_HTML_BELOW_SESSION, COWRITTEN_HTML_ABOVE_PUBLISHED]
        : meta.typeLocked
          ? [COWRITTEN_HTML_BELOW_CREATED, COWRITTEN_HTML_ABOVE_CREATED]
          : meta.role === "owner" && meta.outsideOrg === true
            ? [COWRITTEN_HTML_BELOW_OTHERS, COWRITTEN_HTML_ABOVE_OWNED]
            : base
              ? [COWRITTEN_ARTIFACT_PROMPTS, COWRITTEN_HTML_ABOVE_OTHERS]
              : [COWRITTEN_HTML_BELOW_UNPUBLISHED, COWRITTEN_HTML_ABOVE_UNPUBLISHED];
    return {
      enveloped: true,
      otherWriters: base,
      lead: `${headText}
<${COWRITTEN_ARTIFACT_HTML}>
`,
      body: pageText,
      tail: `
</${COWRITTEN_ARTIFACT_HTML}>

${tailText}`,
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
function scrubPageText(text) {
  return neutralizeForgedMarkup(text, RESERVED_XML_TAGS);
}
//@ chunk-jv307fw4.js:25225-25268 placement
function extractPageText(html, scope = "all") {
  return scrubPageText(scrubArtifactEnvelopeTags(html, scope));
}
//@ chunk-jv307fw4.js:25268-25376 placement
function truncatePageText(text, limit, scope = "all") {
  if (limit <= 0) return "";
  for (let size = limit; ; size--) {
    let text_2 = scrubPageText(scrubbedHead(text, size, scope));
    if (text_2.length <= limit) return text_2;
  }
}
//@ chunk-jv307fw4.js:25376-25608 placement
function getLiveSubscriptionToken(slug) {
  if (!isFrameLiveSubscribeEnabled()) return;
  if (slug.syncClient === true)
    return typeof slug.syncToken === "string" && slug.syncToken !== ""
      ? {
          transport: "sync",
          token: slug.syncToken,
        }
      : undefined;
  return slug.subscriptionToken
    ? {
        transport: "live",
        token: slug.subscriptionToken,
      }
    : undefined;
}
//@ chunk-jv307fw4.js:35848-35897 placement
function isWriterRole(role) {
  return role === "owner" || role === "writer";
}
//@ chunk-jv307fw4.js:35897-35945 placement
function ownerVisibleRole(role, roleValue) {
  return roleValue && role === "owner" ? undefined : role;
}
//@ chunk-jv307fw4.js:35945-36012 placement
function isReaderRole(role) {
  return role === "reader" || role === "viewer" || role === "commenter";
}
//@ chunk-jv307fw4.js:36012-36542 placement
/**
 * 探测 artifact：取 boot 数据，判定角色/受众/资产令牌并返回可用于读写的上下文。
 */
async function probeArtifactAccess(artifact, signal, credentials, options) {
  let artifactBoot = await fetchArtifactBoot(artifact, signal, {
    readBack: options?.readBack === true,
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
  let noAssetToken = artifactBoot.assetToken === undefined;
  let role = artifactBoot.data.perm?.role;
  let outsideWriter = triState(artifactBoot.data.outsideWriter);
  let currentStoredDecl = getCurrentStoredDecl(artifactBoot.data);
  return {
    err: null,
    mode: noAssetToken ? "public" : (artifactBoot.data.perm?.mode ?? artifactBoot.data.mode),
    shared: artifactBoot.data.shared,
    role: ownerVisibleRole(role, noAssetToken),
    outsideOrgReader: noAssetToken,
    cowritten: artifactBoot.data.cowritten === true,
    ...(outsideWriter !== undefined && {
      outsideWriter,
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
function getCurrentStoredDecl(decl) {
  if (decl.readback === undefined || typeof decl.typeInstance !== "boolean") return;
  let stored = storedDeclFromWire(decl.readback);
  if (stored === undefined) return;
  let typeLocked = decl.typeInstance || typeLockFromWire(decl.type) !== undefined;
  let typeLock = stored.typeLock;
  if (typeLocked && typeLock === undefined) return;
  if (typeLock?.latest !== undefined && typeLock.latest !== typeLock.current) return;
  return stored;
}
//@ chunk-jv307fw4.js:36805-36997 placement
function getRecentProbeBoot(slug, toolUseId) {
  if (toolUseId === undefined) return;
  let boot = getLiveState().shareStatus.probeBoots.get(slug);
  return boot !== undefined &&
    boot.toolUseId === toolUseId &&
    Date.now() - boot.issuedAt <= ORG_SCOPE_CACHE_MS &&
    !checkBehindLive(slug, boot.boot.ver).behind
    ? getCurrentStoredDecl(boot.boot.data)
    : undefined;
}
//@ chunk-jv307fw4.js:41220-41354 placement
function isAudienceVersionServed(read) {
  return (
    read.servedAudienceVersion === true ||
    read.audience === "owner" ||
    read.audienceView === "live" ||
    read.audienceView === "pinned-current"
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
function isForeignOwnership(share) {
  return share !== "own" && share !== "same";
}
//@ chunk-jv307fw4.js:41761-41827 placement
function buildFrameFilePath(ver, verValue) {
  return `/_f/${ver}/${SOURCE_KEY}/${verValue === "" ? "index.html" : verValue}`;
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
