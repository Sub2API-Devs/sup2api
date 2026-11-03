/**
 * tools/ArtifactTool/constants.ts
 *
 * 2.1.316 新增：Artifact 工具常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1), chunk-yxnffbzs.js (37)
 * attribution: placement 38
 */
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { zhr, authExpiredBlock } from "../../services/policyLimits/capabilityBlocks.js";
import {
  formatPolicyDisabledMessage,
  policyBlockedMessage,
  policyUnverifiedMessage,
  policy404Message,
  policyUnavailableMessage,
} from "../../services/policyLimits/policyMessages.js";
import { getCurrentTaints } from "../../services/policyLimits/complianceTaints.js";
import { isCoworkSession } from "../../utils/entrypointKinds.js";
import { POLICY_LIMITS_PATH } from "../../services/policyLimits/index.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { antEnv } from "../../utils/env.js";
import { HBe, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";

/**
 * base58 UUID 编码常量与正则。
 */
//@ chunk-yxnffbzs.js:16505-16680 placement
var BASE58_RADIX = 58n,
  UUID_MAX = (1n << 128n) - 1n,
  BASE58_UUID_LENGTH = 22,
  BASE58_UUID_PATTERN = "[1-9A-HJ-NP-Za-km-z]{22}",
  regExp_3_2 = new RegExp("^[1-9A-HJ-NP-Za-km-z]{22}$"),
  UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/**
 * 把 UUID 编码为 22 位 base58。
 */
//@ chunk-yxnffbzs.js:16680-16881 placement
function encodeUuidBase58(e) {
  if (!UUID_RE.test(e)) return null;
  let n = BigInt(`0x${e.replaceAll("-", "")}`),
    r = "";
  for (let o = 0; o < 22; o++)
    ((r = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Number(n % BASE58_RADIX)] + r),
      (n /= BASE58_RADIX));
  return r;
}
//@ chunk-yxnffbzs.js:17183-18578 placement
var ARTIFACT_TOOL_NAME = "Artifact",
  QUICKSTART_INTENTS = ["document", "slides", "design", "other"],
  ARTIFACT_COMMENTS_TOOL_NAME = "ArtifactComments",
  ARTIFACT_DATA_TOOL_NAME = "ArtifactData",
  ARTIFACT_CHECK_TOOL_NAME = "ArtifactCheck",
  ARTIFACT_FAMILY_TOOL_NAMES = [
    ARTIFACT_TOOL_NAME,
    ARTIFACT_COMMENTS_TOOL_NAME,
    ARTIFACT_DATA_TOOL_NAME,
    ARTIFACT_CHECK_TOOL_NAME,
  ],
  ASSET_ID_RE = /^[0-9a-f]{32}$/,
  ARTIFACT_RULE_CONTENT_FIELD = "file_path",
  ARTIFACT_READ_INPUT_FIELDS = ["action", "url", "prompt"],
  ARTIFACT_READ_GATED_INPUT_FIELDS = ["page", "version"],
  DEFAULT_ARTIFACT_READ_PROMPT =
    "Describe what this page contains and reproduce its substantive text content, structure, and any data it presents.",
  STALE_GUARD_CONTENT_HEADER_SUFFIX = " \u2014 live version; raw HTML follows]",
  STALE_GUARD_REJECTION_PREFIX =
    "You hadn't viewed the live version of this artifact, so the publish was refused.",
  STALE_GUARD_REJECTION_PREFIX_LEGACY =
    "This session hadn't viewed the live version of this artifact, so the publish was refused.",
  STALE_GUARD_CONTENT_HEADER = (e) => `[Artifact ${e}${STALE_GUARD_CONTENT_HEADER_SUFFIX}`,
  STALE_GUARD_DIFF_HEADER_SUFFIX = " \u2014 live version; a line diff against the content you sent follows]",
  STALE_GUARD_DIFF_HEADER = (e) => `[Artifact ${e}${STALE_GUARD_DIFF_HEADER_SUFFIX}`,
  STALE_GUARD_CONTENT_HEADER_LINE_RE = new RegExp(
    `\\n\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n`,
  ),
  HANDOVER_SAVED_SOURCE_LEAD = "Its full source (",
  HANDOVER_INLINE_REMEDY_LEAD = "Merge your edits onto it",
  HANDOVER_DETAILS_START_RE = new RegExp(
    `\\n(?=\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n|${urlPatternToRegex(HANDOVER_SAVED_SOURCE_LEAD)}|${urlPatternToRegex(HANDOVER_INLINE_REMEDY_LEAD)})`,
  ),
  CONFLICT_REJECTION_PREFIX = "Publish refused \u2014 nothing was merged or published:",
  ee =
    "file_path required to publish. Write the page to an .html file, then call again with its path as `file_path`",
  NO_PAGE_REJECTION_TYPES_ON = `${ee}, or pass \`type_url\` to start a new Artifact from a type. There is no inline content parameter.`,
  NO_PAGE_REJECTION_TYPES_OFF = `${ee}. There is no inline content parameter, and creating an Artifact from a type is not available in this session, so build the page yourself.`,
  NO_PAGE_REJECTIONS = [NO_PAGE_REJECTION_TYPES_ON, NO_PAGE_REJECTION_TYPES_OFF];
//@ chunk-yxnffbzs.js:18578-18659 placement
function artifactLinkShapeHint() {
  return zhr() ? "\u2026/artifact/<id>" : "\u2026/code/artifact/<uuid>";
}
//@ chunk-yxnffbzs.js:18659-19926 placement
var ARTIFACT_LOGIN_MESSAGE_LEAD = "Artifacts need a claude.ai login",
  ARTIFACT_LOGIN_ERROR_CODE = 13,
  ARTIFACT_LOGIN_REASON_CODE = "not_logged_in",
  ARTIFACT_POLICY_ERROR_CODE = 15,
  ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE = 22,
  ARTIFACT_POLICY_REASON_CODES = ["policy_blocked", "policy_fetch_failed", "policy_route_missing"],
  TRANSIENT_PUBLISH_REASON = {
    rate_limited: "publish_rate_limited",
    contract_rollout: "publish_contract_rollout",
  },
  ARTIFACT_LOGIN_REQUIRED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}. Run /login and select "Claude account with subscription", then retry \u2014 the "Anthropic Console account" option does not provide claude.ai credentials.`,
  ARTIFACT_LOGIN_RETRY_NOTE =
    "Every Artifact call is refused like this until a claude.ai login is available, so do not retry; tell the user what is needed.",
  ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE =
    "Changing the input will not help: every Artifact call is refused like this until a claude.ai login is available, so do not retry; tell the user what is needed. The input was also invalid, but the schema error below matters only once that login is available.",
  ARTIFACT_LOGIN_PROXIED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}, and this remote session authenticates through the machine that launched it, which is not signed in to claude.ai. Sign in to claude.ai on that machine (/login, "Claude account with subscription"), then reconnect this session.`,
  ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}, but this session authenticates with a credential injected by its host environment, which takes precedence and cannot be changed here. Start a session that is signed in to claude.ai to publish or read artifacts.`;
//@ chunk-yxnffbzs.js:19926-20283 placement
function artifactLoginEnvQuadMessage(e) {
  return `${ARTIFACT_LOGIN_MESSAGE_LEAD}. This session's API access is set up by ${e ? "your organization's managed settings" : "the ANTHROPIC_FEDERATION_RULE_ID / ANTHROPIC_ORGANIZATION_ID environment variables"}, which stays active for everything else \u2014 artifacts also use a claude.ai account. Run /login and select "Claude account with subscription", then retry.`;
}
//@ chunk-yxnffbzs.js:20283-21379 placement
function artifactPolicyBlockedMessage(e) {
  switch (e) {
    case "org_policy_unverifiable":
      return "Artifacts can't check the signed-in Claude account's organization settings from this session: the account belongs to a Claude organization (Team or Enterprise), and this session's API access uses a different credential that can't read those settings. Run /login with a personal Claude account (Pro or Max), then retry.";
    case "plan_unreadable":
      return "The signed-in Claude account's plan couldn't be read from this session. Run /login again to refresh the signed-in account, then retry.";
    case "org_denied":
      return formatPolicyDisabledMessage(
        "Artifacts",
        "are",
        getCurrentTaints(),
        "Artifacts are disabled by your organization's policy. Contact your organization admin to enable them, then retry.",
      );
    case "latched":
      return policyBlockedMessage("Artifacts", "are");
    case "cache_miss":
      return policyUnverifiedMessage("Artifacts");
    case "policy_route_missing":
      return policy404Message("Artifacts");
    case "policy_unavailable":
      return "Artifacts can't check the organization settings that apply to this session: the session's configuration (such as a custom ANTHROPIC_BASE_URL) prevents the policy lookup. Remove that configuration, then retry.";
  }
}
//@ chunk-yxnffbzs.js:21379-21641 placement
function artifactPolicyBlockedRemedy(e) {
  switch (e) {
    case "plan_unreadable":
      return authExpiredBlock();
    case "org_denied":
    case "latched":
      return { kind: "policy_denied", feature: "artifacts", policy_kind: e };
    case "org_policy_unverifiable":
    case "cache_miss":
    case "policy_route_missing":
    case "policy_unavailable":
      return;
  }
}
//@ chunk-yxnffbzs.js:21641-21873 placement
function artifactPolicyUnobtainedMessage(e) {
  if (isCoworkOauthNotAllowed(e))
    return "Artifacts aren't available: Anthropic couldn't confirm your organization's settings for this cloud session (HTTP 403). This isn't a problem with your network.";
  return policyUnavailableMessage("Artifacts", "are", e.outcome);
}
//@ chunk-yxnffbzs.js:21873-22023 placement
function isCoworkOauthNotAllowed({ cause: cause, outcome: outcome }) {
  return (
    cause === "policy_fetch_failed" &&
    isCoworkSession() &&
    outcome.httpStatus === 403 &&
    outcome.serverErrorCode === "oauth_not_allowed_for_organization"
  );
}
//@ chunk-yxnffbzs.js:22023-22100 placement
var Ne = "Claude Code reads that policy from ",
  xe = /^[A-Za-z0-9.-]+(:[0-9]+)?$/;
//@ chunk-yxnffbzs.js:22100-22171 placement
function Le(e) {
  return xe.test(e) ? `${e}${POLICY_LIMITS_PATH}` : `the API's ${POLICY_LIMITS_PATH} route`;
}
/**
 * 策略仍在加载时 artifact 不可用的说明。
 */
//@ chunk-yxnffbzs.js:22171-22684 placement
var ARTIFACT_POLICY_LOADING_NOTE =
    " and keeps retrying it in the background; whether artifacts are allowed is decided once it loads. Do not retry this call now. Tell the user why artifacts are unavailable and, if a proxy, VPN or web filter is involved, that their IT admin needs to let that address through.",
  Fe =
    ", and a proxy or gateway that does not forward that path will keep answering 404, so nothing in this session can load it. Do not retry this call. Tell the user that their IT admin needs to let that address through to the API.";
//@ chunk-yxnffbzs.js:22684-23173 placement
function artifactPolicyUnobtainedNote(e) {
  let n = Le(e.outcome.host);
  if (isCoworkOauthNotAllowed(e))
    return `Claude Code reads the organization's policy from ${n}. In this cloud session, Anthropic's API refused the request for the user's organization (HTTP 403). Do not retry this call now. Tell the user that artifacts are unavailable because Anthropic couldn't confirm their organization's settings for this cloud session, and that it isn't a problem with their network.`;
  let r = e.cause === "policy_route_missing" ? Fe : ARTIFACT_POLICY_LOADING_NOTE;
  return `${Ne}${n}${r}`;
}
//@ chunk-yxnffbzs.js:23173-23218 placement
function artifactPolicyUnobtainedRefusal(e) {
  return `${artifactPolicyUnobtainedMessage(e)}

${artifactPolicyUnobtainedNote(e)}`;
}
//@ chunk-yxnffbzs.js:23218-23415 placement
function artifactLoginBlockedByCredentialMessage(e, n) {
  return `${ARTIFACT_LOGIN_MESSAGE_LEAD}, and this session is authenticating with ${e}, which takes precedence over a claude.ai account. ${n} Then run /login and select "Claude account with subscription".`;
}
//@ chunk-yxnffbzs.js:23415-23577 placement
class ArtifactInputError extends Error {
  reasonCode;
  maxErrorChars;
  constructor(e, n, r) {
    super(e);
    ((this.name = "ArtifactInputError"), (this.reasonCode = n), (this.maxErrorChars = r?.maxErrorChars));
  }
}
/**
 * Artifact 地址正则片段：UUID、claude.ai 来源、查看器路径前缀、Artifact id，以及查看器 URL 与其子路径的匹配模式。
 */
//@ chunk-yxnffbzs.js:23577-23845 placement
var UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
  CLAUDE_AI_ORIGIN_PATTERN = "https://(?:[a-z0-9-]+\\.)?claude\\.ai",
  VIEWER_PREFIX_RE = "/(?:artifact|code/(?:artifact|frame))/",
  ARTIFACT_ID_PATTERN = `${UUID_PATTERN}|${BASE58_UUID_PATTERN}`,
  VIEWER_URL_PATTERN = `${VIEWER_PREFIX_RE}(?:([A-Za-z0-9_-]*)-)?(${ARTIFACT_ID_PATTERN})(?:[/?#]|$)`,
  VIEWER_SUBPATH_PATTERN = `${VIEWER_PREFIX_RE}(?:[A-Za-z0-9_-]*-)?(?:${ARTIFACT_ID_PATTERN})/([^?#]+)`;
//@ chunk-yxnffbzs.js:23845-23937 placement
function R(e, n = !1) {
  if (e === void 0) return null;
  if (e.length !== BASE58_UUID_LENGTH) return e;
  return n ? null : decodeBase58Uuid(e);
}
//@ chunk-yxnffbzs.js:23937-23990 placement
function O(e) {
  return e?.length === BASE58_UUID_LENGTH ? { shortId: !0 } : {};
}
//@ chunk-yxnffbzs.js:23990-24110 placement
var ARTIFACT_SLUG_RE = new RegExp(`^${UUID_PATTERN}$`),
  ARTIFACT_VERSION_SAFE_RE = /^[\w-]{1,64}$/,
  MAX_LISTED_FILES_SHOWN = 1024,
  ARTIFACT_MAX_RESULT_SIZE_CHARS = 16000,
  ARTIFACT_PAGE_INLINE_RESULT_CAP = OUTPUT_SIZE_LIMITS,
  ARTIFACT_FILE_INLINE_RESULT_CAP = 20000,
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS = 300000,
  ARTIFACT_STUB_URL_PREFIX = "eval-stub://artifact/";
//@ chunk-yxnffbzs.js:24110-24214 placement
function getArtifactPublishStubDir() {
  let CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = antEnv.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR;
  return typeof CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR === "string" &&
    CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR.length > 0
    ? CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR
    : null;
}
//@ chunk-yxnffbzs.js:24214-24239 placement
function L() {
  return null;
}
//@ chunk-yxnffbzs.js:24239-24400 placement
function claudeAiWebEnvOf(e) {
  if (new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}(?:[/?#]|$)`).test(e)) return "prod";
  let n = L();
  if (n !== null && new RegExp(`^${n}(?:[/?#]|$)`).test(e)) return "staging";
  return null;
}
//@ chunk-yxnffbzs.js:24400-24431 placement
function parseArtifactUrl(e) {
  return parseArtifactUrl_2(e, !1);
}
/**
 * 解析 artifact URL（prod/staging、slug）。
 */
//@ chunk-yxnffbzs.js:24431-25060 placement
function parseArtifactUrl_2(e, n) {
  let match = e.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_URL_PATTERN}`)),
    o = R(match?.[2], n);
  if (o !== null) return withUrlExtras(e, { slug: o, env: "prod", ...O(match?.[2]) }, match?.[1]);
  let s = L();
  if (s !== null) {
    let match = e.match(new RegExp(`^${s}${VIEWER_URL_PATTERN}`)),
      l = R(match?.[2], n);
    if (l !== null) return withUrlExtras(e, { slug: l, env: "staging", ...O(match?.[2]) }, match?.[1]);
  }
  let match_2 = e.match(
    new RegExp(`^https://(${UUID_PATTERN})\\.frame\\.(staging\\.)?claudeusercontent\\.com(?:[/?#]|$)`),
  );
  if (match_2?.[1]) return withUrlExtras(e, { slug: match_2[1], env: match_2[2] ? "staging" : "prod" });
  let u = HBe();
  if (u) {
    let match = e.match(new RegExp(`^https?://([^/?#]+)${VIEWER_URL_PATTERN}`)),
      l = R(match?.[3], n);
    if (match !== null && l !== null && match[1] === new URL(u).host)
      return withUrlExtras(e, { slug: l, env: claudeAiEnvironment(), ...O(match[3]) }, match[2]);
  }
  return null;
}
//@ chunk-yxnffbzs.js:25060-25122 placement
var we = /^[A-Za-z0-9_-]{1,64}$/,
  De = /^[a-z0-9][a-z0-9-]{0,59}$/;
//@ chunk-yxnffbzs.js:25122-25379 placement
function withUrlExtras(e, n, r) {
  let o = r !== void 0 && De.test(r) ? { ...n, vanity: r } : n,
    index = e.indexOf("#"),
    a = index === -1 ? e : e.slice(0, index),
    index_2 = a.indexOf("?");
  if (index_2 === -1) return o;
  let l = a
    .slice(index_2 + 1)
    .split("&")
    .find((d) => d.startsWith("sk="))
    ?.slice(3);
  return l !== void 0 && we.test(l) ? { ...o, sk: l } : o;
}
//@ chunk-yxnffbzs.js:25379-25622 placement
function artifactUrlSubPath(e) {
  let n = HBe(),
    r = L(),
    o =
      e.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_SUBPATH_PATTERN}`))?.[1] ??
      (r !== null ? e.match(new RegExp(`^${r}${VIEWER_SUBPATH_PATTERN}`))?.[1] : void 0) ??
      (n
        ? e.match(new RegExp(`^https?://${urlPatternToRegex(new URL(n).host)}${VIEWER_SUBPATH_PATTERN}`))?.[1]
        : void 0);
  return o === void 0 || o === "" ? void 0 : o;
}
//@ chunk-yxnffbzs.js:25622-25794 placement
function canonicalizeArtifactUrlInput(e) {
  try {
    let n = new URL(e);
    if (n.protocol === "http:") n.protocol = "https:";
    if (n.hostname.endsWith(".")) n.hostname = n.hostname.slice(0, -1);
    return n.href;
  } catch {
    return e;
  }
}
//@ chunk-yxnffbzs.js:25794-25851 placement
function parseArtifactUrlInput(e) {
  return typeof e === "string" ? parseArtifactUrl(canonicalizeArtifactUrlInput(e)) : null;
}
//@ chunk-yxnffbzs.js:25851-25916 placement
function parseArtifactUrlAnyCase(e) {
  let n = canonicalizeArtifactUrlInput(e);
  return parseArtifactUrl(n) ?? parseArtifactUrl_2(n.toLowerCase(), !0);
}
//@ chunk-yxnffbzs.js:25916-25966 placement
var regExp_4 = new RegExp(`^${urlPatternToRegex(ARTIFACT_STUB_URL_PREFIX)}(${UUID_PATTERN})(?:[/?#]|$)`);
//@ chunk-yxnffbzs.js:25966-26031 placement
function parseStubArtifactUrl(e) {
  let match = e.match(regExp_4);
  return match?.[1] ? { slug: match[1] } : null;
}
//@ chunk-yxnffbzs.js:26031-26196 placement
var ARTIFACT_DELETED_NOTE_TAG = "artifact-deleted",
  ARTIFACT_DELETED_NOTE_RE = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`),
  ARTIFACT_ATTACHED_NOTE_TAG = "artifact-attached",
  ARTIFACT_ATTACHED_NOTE_RE = new RegExp(
    `^<${ARTIFACT_ATTACHED_NOTE_TAG} url="([^"]+)"(?: title="([^"]*)")?( own)?/>`,
  );
//@ chunk-yxnffbzs.js:26196-26295 placement
function uuidSlugFromUrl(e) {
  let n = parseArtifactUrl(e)?.slug;
  if (n !== void 0) return n;
  return getArtifactPublishStubDir() !== null ? (parseStubArtifactUrl(e)?.slug ?? null) : null;
}
//@ chunk-yxnffbzs.js:26295-26395 placement
function artifactViewerPath(e) {
  if (zhr()) {
    let n = encodeUuidBase58(e);
    if (n !== null) return `/artifact/${n}`;
  }
  return `/code/artifact/${e}`;
}
/**
 * 拆分版 Artifact 工具集的映射：ArtifactComments/ArtifactData/ArtifactCheck 的父工具都是 Artifact，以及各动作（评论类、数据库、verify/preview）归属的拆分工具名。
 */
//@ chunk-e6aww6q8.js:822970-823360 placement
var SPLIT_TOOL_PARENT = { ArtifactComments: "Artifact", ArtifactData: "Artifact", ArtifactCheck: "Artifact" },
  SPLIT_TOOL_BY_ACTION = {
    Artifact: {
      comments: "ArtifactComments",
      reply: "ArtifactComments",
      resolve: "ArtifactComments",
      watch: "ArtifactComments",
      unwatch: "ArtifactComments",
      status: "ArtifactComments",
      resume_replies: "ArtifactComments",
      read_db: "ArtifactData",
      write_db: "ArtifactData",
      verify: "ArtifactCheck",
      preview: "ArtifactCheck",
    },
  };

export {
  ARTIFACT_SLUG_RE,
  ARTIFACT_STUB_URL_PREFIX,
  getArtifactPublishStubDir,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_TOOL_NAME,
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_PAGE_INLINE_RESULT_CAP,
  ARTIFACT_VERSION_SAFE_RE,
  ArtifactInputError,
  ARTIFACT_MAX_RESULT_SIZE_CHARS,
  artifactViewerPath,
  CONFLICT_REJECTION_PREFIX,
  parseArtifactUrl,
  HANDOVER_INLINE_REMEDY_LEAD,
  STALE_GUARD_CONTENT_HEADER,
  HANDOVER_SAVED_SOURCE_LEAD,
  STALE_GUARD_DIFF_HEADER,
  STALE_GUARD_REJECTION_PREFIX,
  regExp_3_2,
  BASE58_RADIX,
  UUID_MAX,
  ASSET_ID_RE,
  ARTIFACT_FILE_INLINE_RESULT_CAP,
  ARTIFACT_DATA_TOOL_NAME,
  parseArtifactUrlAnyCase,
  uuidSlugFromUrl,
  ARTIFACT_CHECK_TOOL_NAME,
  ARTIFACT_FAMILY_TOOL_NAMES,
  artifactUrlSubPath,
  parseArtifactUrlInput,
  ARTIFACT_LOGIN_PROXIED_MESSAGE,
  ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE,
  artifactLoginBlockedByCredentialMessage,
  artifactLoginEnvQuadMessage,
  ARTIFACT_LOGIN_REQUIRED_MESSAGE,
  canonicalizeArtifactUrlInput,
  QUICKSTART_INTENTS,
  VIEWER_PREFIX_RE,
  ARTIFACT_LOGIN_RETRY_NOTE,
  artifactPolicyBlockedMessage,
  ARTIFACT_POLICY_ERROR_CODE,
  artifactPolicyBlockedRemedy,
  artifactPolicyUnobtainedRefusal,
  ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE,
  ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE,
  ARTIFACT_LOGIN_ERROR_CODE,
  parseStubArtifactUrl,
  ARTIFACT_READ_INPUT_FIELDS,
  ARTIFACT_READ_GATED_INPUT_FIELDS,
  NO_PAGE_REJECTION_TYPES_ON,
  NO_PAGE_REJECTION_TYPES_OFF,
  artifactLinkShapeHint,
  MAX_LISTED_FILES_SHOWN,
  ARTIFACT_LOGIN_REASON_CODE,
  DEFAULT_ARTIFACT_READ_PROMPT,
  TRANSIENT_PUBLISH_REASON,
  ARTIFACT_DELETED_NOTE_TAG,
  ARTIFACT_RULE_CONTENT_FIELD,
  SPLIT_TOOL_PARENT,
  SPLIT_TOOL_BY_ACTION,
  ARTIFACT_DELETED_NOTE_RE,
  ARTIFACT_ATTACHED_NOTE_RE,
  claudeAiWebEnvOf,
  STALE_GUARD_CONTENT_HEADER_LINE_RE,
  ARTIFACT_ATTACHED_NOTE_TAG,
  BASE58_UUID_LENGTH,
  artifactPolicyUnobtainedMessage,
  NO_PAGE_REJECTIONS,
  ARTIFACT_LOGIN_MESSAGE_LEAD,
  STALE_GUARD_REJECTION_PREFIX_LEGACY,
  HANDOVER_DETAILS_START_RE,
  encodeUuidBase58,
  ARTIFACT_ID_PATTERN,
  R,
};
