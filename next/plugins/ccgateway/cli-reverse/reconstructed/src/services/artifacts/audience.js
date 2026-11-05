/**
 * services/artifacts/audience.ts
 *
 * 2.1.316 新增：按角色决定 artifact 页面源码给模型时的框定方式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-m0ks5273.js (26)
 * attribution: placement 26
 */
import { isVouchedOwnVer } from "./ownPublishes.js";
import { readMarkedForeign } from "./frameComments.js";
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
import { fetchBootUngated } from "./boot.js";
import { triState } from "./shareEntries.js";
import { storedDeclFromWire } from "./readBack.js";
import { typeLockFromWire } from "./pagePreparation.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { ORG_SCOPE_CACHE_MS } from "./orgScope.js";
import { checkBehindLive } from "./liveSubscribe.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m0ks5273.js:23900-23961 placement
var SAFE_AUDIENCE_KEY_RE = /^[a-z][a-z0-9_-]{0,63}$/;
var AUDIENCE_SCOPES = ["users", "org", "public"];
//@ chunk-m0ks5273.js:23961-24062 placement
/**
 * 读取受众信息中的文档数量，非安全非负整数时返回 undefined。
 */
function getDocumentCount(dbUsage) {
  let documents = dbUsage?.documents;
  return typeof documents === "number" && Number.isSafeInteger(documents) && documents >= 0
    ? documents
    : undefined;
}
//@ chunk-m0ks5273.js:24062-24149 placement
var ARTIFACT_INLINE_CONTROL_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp;
deferInit("chunk-m0ks5273.js:24062", () => {
  ARTIFACT_INLINE_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
  regExp = new RegExp(ARTIFACT_INLINE_CONTROL_RE, "g");
});
//@ chunk-m0ks5273.js:24149-24189 placement
function stripInlineControlBytes(text) {
  return text.replace(regExp, "");
}
//@ chunk-m0ks5273.js:24189-24365 placement
function classifyPageOwnership(assess, ver, vouched, journal, sameChannel) {
  let ownVer = isVouchedOwnVer(ver, vouched, assess.ver);
  let maybeOwn = !assess.typeLocked && !assess.publicRead && !journal && !sameChannel;
  let noForeign = maybeOwn && !readMarkedForeign(assess);
  return {
    workshopPage: journal,
    ownVersion: ownVer,
    ownBytesPage: maybeOwn,
    plainOwner: noForeign,
    vouchedOwn: noForeign && ownVer,
  };
}
//@ chunk-m0ks5273.js:24365-24471 placement
async function classifyArtifactBytes(artifact, ver, ownPublishMap, options = {}) {
  return classifyPageOwnership(
    artifact,
    ver,
    ownPublishMap,
    (await extractJsonScriptById(artifact.html, "ws-decisions")) !== null,
    options.savedInPage === true,
  );
}
//@ chunk-m0ks5273.js:24471-24571 placement
async function vouchedOwnBytes(html, ver, vouched) {
  return (
    classifyPageOwnership(html, ver, vouched, false, false).vouchedOwn &&
    (await extractJsonScriptById(html.html, "ws-decisions")) === null
  );
}
//@ chunk-m0ks5273.js:24571-24760 placement
function sharedReadInline(read) {
  if (read.publicRead || read.offOrgRamp === true || read.external === true || read.role === "owner")
    return null;
  if (read.role === "writer" && read.sameChannel === true && isFrameSameChannelRawReadEnabled())
    return "channel";
  return isFrameSameOrgInlineReadEnabled() ? "shared" : null;
}
//@ chunk-m0ks5273.js:24760-25209 placement
/**
 * 根据角色（owner/writer/共写/外部组织）决定页面源码给模型时的包装方式（untrusted 框定或截断）。
 */
function artifactInlineEnvelope(meta) {
  let base = meta.role !== "owner" || meta.cowritten || meta.typeLocked === true || meta.outsideOrg === true;
  let html = scrubThirdPartyText(meta.html, "page");
  let head = (limit) => thirdPartyTextHead(html, limit, "page");
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
      body: html,
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
    body: html,
    tail: "",
    head,
  };
}
//@ chunk-m0ks5273.js:25209-25243 placement
function scrubCowrittenTag(text) {
  return neutralizeForgedMarkup(text, RESERVED_XML_TAGS);
}
//@ chunk-m0ks5273.js:25243-25286 placement
function scrubThirdPartyText(html, scope = "all") {
  return scrubCowrittenTag(scrubArtifactEnvelopeTags(html, scope));
}
//@ chunk-m0ks5273.js:25286-25394 placement
function thirdPartyTextHead(text, limit, scope = "all") {
  if (limit <= 0) return "";
  for (let size = limit; ; size--) {
    let text_2 = scrubCowrittenTag(scrubbedHead(text, size, scope));
    if (text_2.length <= limit) return text_2;
  }
}
//@ chunk-m0ks5273.js:25394-25626 placement
function liveChannelCredential(slug) {
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
//@ chunk-m0ks5273.js:36049-36098 placement
function isPublishingRole(role) {
  return role === "owner" || role === "writer";
}
//@ chunk-m0ks5273.js:36098-36146 placement
function ownerVisibleRole(role, roleValue) {
  return roleValue && role === "owner" ? undefined : role;
}
//@ chunk-m0ks5273.js:36146-36213 placement
function isReaderClassRole(role) {
  return role === "reader" || role === "viewer" || role === "commenter";
}
//@ chunk-m0ks5273.js:36213-36871 placement
/**
 * 探测 artifact：取 boot 数据，判定角色/受众/资产令牌并返回可用于读写的上下文。
 */
async function getFrameShareStatus(artifact, signal, credentials, options) {
  let bootUngated = await fetchBootUngated(artifact, signal, {
    readBack: options?.readBack === true,
    credentials,
    audienceOutside: true,
  });
  if (bootUngated.err !== null)
    return {
      err: bootUngated.err,
      errorCode: bootUngated.errorCode,
      ...(bootUngated.gone && {
        gone: true,
      }),
    };
  let noAssetToken = bootUngated.assetToken === undefined;
  let role = bootUngated.data.perm?.role;
  let permRole = triState(bootUngated.data.outsideWriter);
  let outsideAudience =
    typeof bootUngated.data.outsideAudience === "boolean" ? bootUngated.data.outsideAudience : undefined;
  let currentStoredDecl = getCurrentStoredDecl(bootUngated.data);
  return {
    err: null,
    mode: noAssetToken ? "public" : (bootUngated.data.perm?.mode ?? bootUngated.data.mode),
    shared: bootUngated.data.shared,
    role: ownerVisibleRole(role, noAssetToken),
    outsideOrgReader: noAssetToken,
    cowritten: bootUngated.data.cowritten === true,
    ...(permRole !== undefined && {
      outsideWriter: permRole,
    }),
    ...(outsideAudience !== undefined && {
      outsideAudience,
    }),
    ...(typeof bootUngated.data.title === "string" && {
      title: bootUngated.data.title,
    }),
    ...(currentStoredDecl !== undefined && {
      readBack: currentStoredDecl,
    }),
    boot: bootUngated,
  };
}
//@ chunk-m0ks5273.js:36871-37134 placement
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
//@ chunk-m0ks5273.js:37134-37326 placement
function keptProbeReadBack(slug, toolUseId) {
  if (toolUseId === undefined) return;
  let boot = getLiveState().shareStatus.probeBoots.get(slug);
  return boot !== undefined &&
    boot.toolUseId === toolUseId &&
    Date.now() - boot.issuedAt <= ORG_SCOPE_CACHE_MS &&
    !checkBehindLive(slug, boot.boot.ver).behind
    ? getCurrentStoredDecl(boot.boot.data)
    : undefined;
}
//@ chunk-m0ks5273.js:41549-41683 placement
function contentIsWhatAudienceSees(read) {
  return (
    read.servedAudienceVersion === true ||
    read.audience === "owner" ||
    read.audienceView === "live" ||
    read.audienceView === "pinned-current"
  );
}
//@ chunk-m0ks5273.js:41683-41697 placement
var SOURCE_KEY = "_src";
//@ chunk-m0ks5273.js:41697-41800 placement
function bootReadsSource(boot) {
  return (
    boot.assetToken !== undefined && (boot.data.mode !== "external" || boot.data.perm?.role === "writer")
  );
}
//@ chunk-m0ks5273.js:41800-42045 placement
function bootOrgRelation(boot) {
  let { mode, perm } = boot.data;
  if (mode === "external") return "external";
  if (boot.assetToken === undefined) return "public";
  if (mode !== undefined) return "unproven";
  if (perm?.role === "owner") return "own";
  return typeof perm?.mode === "string" && perm.mode !== "" ? "same" : "unproven";
}
//@ chunk-m0ks5273.js:42045-42090 placement
function isOffOrgRamp(share) {
  return share !== "own" && share !== "same";
}
//@ chunk-m0ks5273.js:42090-42156 placement
function storedSourcePath(ver, verValue) {
  return `/_f/${ver}/${SOURCE_KEY}/${verValue === "" ? "index.html" : verValue}`;
}
//@ chunk-m0ks5273.js:42156-42170 placement
/**
 * 导出常量或表 `AUDIENCE_QUERY_TIMEOUT_MS`：值为 30000; export { scrubPageText, assessOwnArtifactPage, getSharedReadLane, CONTROL_CHAR_REGEX, buildAudienceFraming, isWri…。
 */
var SERVED_CONTENT_TIMEOUT_MS = 30000;
export {
  keptProbeReadBack,
  isPublishingRole,
  getFrameShareStatus,
  scrubCowrittenTag,
  classifyArtifactBytes,
  sharedReadInline,
  ARTIFACT_INLINE_CONTROL_RE,
  artifactInlineEnvelope,
  bootOrgRelation,
  bootReadsSource,
  isOffOrgRamp,
  SERVED_CONTENT_TIMEOUT_MS,
  storedSourcePath,
  scrubThirdPartyText,
  isReaderClassRole,
  stripInlineControlBytes,
  contentIsWhatAudienceSees,
  liveChannelCredential,
  ownerVisibleRole,
  AUDIENCE_SCOPES,
  getCurrentStoredDecl,
  getDocumentCount,
  SAFE_AUDIENCE_KEY_RE,
  thirdPartyTextHead,
  vouchedOwnBytes,
};
