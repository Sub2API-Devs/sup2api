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
import { isCobaltGateOn, authExpiredBlock } from "../../services/policyLimits/capabilityBlocks.js";
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
import { getArtifactHostOverride, claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";

//@ chunk-yxnffbzs.js:16505-16680 placement
/**
 * base58 UUID 编码常量与正则。
 */
var BASE58_RADIX = 58n;
var UUID_MAX = (1n << 128n) - 1n;
var BASE58_UUID_LENGTH = 22;
var BASE58_UUID_PATTERN = "[1-9A-HJ-NP-Za-km-z]{22}";
var regExp_3_2 = new RegExp("^[1-9A-HJ-NP-Za-km-z]{22}$");
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
//@ chunk-yxnffbzs.js:16680-16881 placement
/**
 * 把 UUID 编码为 22 位 base58。
 */
function encodeUuidBase58(slug) {
  if (!UUID_RE.test(slug)) return null;
  let n = BigInt(`0x${slug.replaceAll("-", "")}`);
  let r = "";
  for (let idx = 0; idx < 22; idx++) {
    r = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Number(n % BASE58_RADIX)] + r;
    n /= BASE58_RADIX;
  }
  return r;
}
//@ chunk-yxnffbzs.js:17183-18578 placement
/**
 * Artifact 工具名与各类拒绝/提示文案前缀（必须给 file_path、冲突拒绝、策略来源等）。
 */
var ARTIFACT_TOOL_NAME = "Artifact";
var QUICKSTART_INTENTS = ["document", "slides", "design", "other"];
var ARTIFACT_COMMENTS_TOOL_NAME = "ArtifactComments";
var ARTIFACT_DATA_TOOL_NAME = "ArtifactData";
var ARTIFACT_CHECK_TOOL_NAME = "ArtifactCheck";
var ARTIFACT_FAMILY_TOOL_NAMES = [
  ARTIFACT_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
];
var ASSET_ID_RE = /^[0-9a-f]{32}$/;
var ARTIFACT_RULE_CONTENT_FIELD = "file_path";
var ARTIFACT_READ_INPUT_FIELDS = ["action", "url", "prompt"];
var ARTIFACT_READ_GATED_INPUT_FIELDS = ["page", "version"];
var DEFAULT_ARTIFACT_READ_PROMPT =
  "Describe what this page contains and reproduce its substantive text content, structure, and any data it presents.";
var STALE_GUARD_CONTENT_HEADER_SUFFIX = " \u2014 live version; raw HTML follows]";
var STALE_GUARD_REJECTION_PREFIX =
  "You hadn't viewed the live version of this artifact, so the publish was refused.";
var STALE_GUARD_REJECTION_PREFIX_LEGACY =
  "This session hadn't viewed the live version of this artifact, so the publish was refused.";
var STALE_GUARD_CONTENT_HEADER = (e) => `[Artifact ${e}${STALE_GUARD_CONTENT_HEADER_SUFFIX}`;
var STALE_GUARD_DIFF_HEADER_SUFFIX =
  " \u2014 live version; a line diff against the content you sent follows]";
var STALE_GUARD_DIFF_HEADER = (e) => `[Artifact ${e}${STALE_GUARD_DIFF_HEADER_SUFFIX}`;
var STALE_GUARD_CONTENT_HEADER_LINE_RE = new RegExp(
  `\\n\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n`,
);
var HANDOVER_SAVED_SOURCE_LEAD = "Its full source (";
var HANDOVER_INLINE_REMEDY_LEAD = "Merge your edits onto it";
var HANDOVER_DETAILS_START_RE = new RegExp(
  `\\n(?=\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n|${urlPatternToRegex(HANDOVER_SAVED_SOURCE_LEAD)}|${urlPatternToRegex(HANDOVER_INLINE_REMEDY_LEAD)})`,
);
var CONFLICT_REJECTION_PREFIX = "Publish refused \u2014 nothing was merged or published:";
var NO_PAGE_SHORT_REJECTION =
  "file_path required to publish. Write the page to an .html file, then call again with its path as `file_path`";
var NO_PAGE_REJECTION_TYPES_ON = `${NO_PAGE_SHORT_REJECTION}, or pass \`type_url\` to start a new Artifact from a type. There is no inline content parameter.`;
var NO_PAGE_REJECTION_TYPES_OFF = `${NO_PAGE_SHORT_REJECTION}. There is no inline content parameter, and creating an Artifact from a type is not available in this session, so build the page yourself.`;
var NO_PAGE_REJECTIONS = [NO_PAGE_REJECTION_TYPES_ON, NO_PAGE_REJECTION_TYPES_OFF];
//@ chunk-yxnffbzs.js:18578-18659 placement
function artifactLinkShapeHint() {
  return isCobaltGateOn() ? "\u2026/artifact/<id>" : "\u2026/code/artifact/<uuid>";
}
//@ chunk-yxnffbzs.js:18659-19926 placement
var ARTIFACT_LOGIN_MESSAGE_LEAD = "Artifacts need a claude.ai login";
var ARTIFACT_LOGIN_ERROR_CODE = 13;
var ARTIFACT_LOGIN_REASON_CODE = "not_logged_in";
var ARTIFACT_POLICY_ERROR_CODE = 15;
var ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE = 22;
var ARTIFACT_POLICY_REASON_CODES = ["policy_blocked", "policy_fetch_failed", "policy_route_missing"];
var TRANSIENT_PUBLISH_REASON = {
  rate_limited: "publish_rate_limited",
  contract_rollout: "publish_contract_rollout",
};
var ARTIFACT_LOGIN_REQUIRED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}. Run /login and select "Claude account with subscription", then retry \u2014 the "Anthropic Console account" option does not provide claude.ai credentials.`;
var ARTIFACT_LOGIN_RETRY_NOTE =
  "Every Artifact call is refused like this until a claude.ai login is available, so do not retry; tell the user what is needed.";
var ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE =
  "Changing the input will not help: every Artifact call is refused like this until a claude.ai login is available, so do not retry; tell the user what is needed. The input was also invalid, but the schema error below matters only once that login is available.";
var ARTIFACT_LOGIN_PROXIED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}, and this remote session authenticates through the machine that launched it, which is not signed in to claude.ai. Sign in to claude.ai on that machine (/login, "Claude account with subscription"), then reconnect this session.`;
var ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE = `${ARTIFACT_LOGIN_MESSAGE_LEAD}, but this session authenticates with a credential injected by its host environment, which takes precedence and cannot be changed here. Start a session that is signed in to claude.ai to publish or read artifacts.`;
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
      return {
        kind: "policy_denied",
        feature: "artifacts",
        policy_kind: e,
      };
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
function isCoworkOauthNotAllowed({ cause, outcome }) {
  return (
    cause === "policy_fetch_failed" &&
    isCoworkSession() &&
    outcome.httpStatus === 403 &&
    outcome.serverErrorCode === "oauth_not_allowed_for_organization"
  );
}
//@ chunk-yxnffbzs.js:22023-22100 placement
/**
 * 「Claude Code 会从…读取策略」的前缀，与策略来源地址的正则。
 */
var POLICY_READ_FROM_PREFIX = "Claude Code reads that policy from ";
var HOST_PORT_REGEX = /^[A-Za-z0-9.-]+(:[0-9]+)?$/;
//@ chunk-yxnffbzs.js:22100-22171 placement
/**
 * 拼出策略来源地址（合法主机名则加路径，否则说明是 API 的路由）。
 */
function policySourceAddress(host) {
  return HOST_PORT_REGEX.test(host)
    ? `${host}${POLICY_LIMITS_PATH}`
    : `the API's ${POLICY_LIMITS_PATH} route`;
}
//@ chunk-yxnffbzs.js:22171-22684 placement
/**
 * 策略仍在加载时 artifact 不可用的说明。
 */
var ARTIFACT_POLICY_LOADING_NOTE =
  " and keeps retrying it in the background; whether artifacts are allowed is decided once it loads. Do not retry this call now. Tell the user why artifacts are unavailable and, if a proxy, VPN or web filter is involved, that their IT admin needs to let that address through.";
var POLICY_ROUTE_NOT_FORWARDED_NOTE =
  ", and a proxy or gateway that does not forward that path will keep answering 404, so nothing in this session can load it. Do not retry this call. Tell the user that their IT admin needs to let that address through to the API.";
//@ chunk-yxnffbzs.js:22684-23173 placement
function artifactPolicyUnobtainedNote(e) {
  let n = policySourceAddress(e.outcome.host);
  if (isCoworkOauthNotAllowed(e))
    return `Claude Code reads the organization's policy from ${n}. In this cloud session, Anthropic's API refused the request for the user's organization (HTTP 403). Do not retry this call now. Tell the user that artifacts are unavailable because Anthropic couldn't confirm their organization's settings for this cloud session, and that it isn't a problem with their network.`;
  let r = e.cause === "policy_route_missing" ? POLICY_ROUTE_NOT_FORWARDED_NOTE : ARTIFACT_POLICY_LOADING_NOTE;
  return `${POLICY_READ_FROM_PREFIX}${n}${r}`;
}
//@ chunk-yxnffbzs.js:23173-23218 placement
function artifactPolicyUnobtainedRefusal(e) {
  return `${artifactPolicyUnobtainedMessage(e)}

${artifactPolicyUnobtainedNote(e)}`;
}
//@ chunk-yxnffbzs.js:23218-23415 placement
function artifactLoginBlockedByCredentialMessage(source, n) {
  return `${ARTIFACT_LOGIN_MESSAGE_LEAD}, and this session is authenticating with ${source}, which takes precedence over a claude.ai account. ${n} Then run /login and select "Claude account with subscription".`;
}
//@ chunk-yxnffbzs.js:23415-23577 placement
class ArtifactInputError extends Error {
  reasonCode;
  maxErrorChars;
  constructor(message, reasonCode, r) {
    super(message);
    this.name = "ArtifactInputError";
    this.reasonCode = reasonCode;
    this.maxErrorChars = r?.maxErrorChars;
  }
}
//@ chunk-yxnffbzs.js:23577-23845 placement
/**
 * Artifact 地址正则片段：UUID、claude.ai 来源、查看器路径前缀、Artifact id，以及查看器 URL 与其子路径的匹配模式。
 */
var UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
var CLAUDE_AI_ORIGIN_PATTERN = "https://(?:[a-z0-9-]+\\.)?claude\\.ai";
var VIEWER_PREFIX_RE = "/(?:artifact|code/(?:artifact|frame))/";
var ARTIFACT_ID_PATTERN = `${UUID_PATTERN}|${BASE58_UUID_PATTERN}`;
var VIEWER_URL_PATTERN = `${VIEWER_PREFIX_RE}(?:([A-Za-z0-9_-]*)-)?(${ARTIFACT_ID_PATTERN})(?:[/?#]|$)`;
var VIEWER_SUBPATH_PATTERN = `${VIEWER_PREFIX_RE}(?:[A-Za-z0-9_-]*-)?(?:${ARTIFACT_ID_PATTERN})/([^?#]+)`;
//@ chunk-yxnffbzs.js:23845-23937 placement
/**
 * base58 长度的 artifact id 需要解码，其余原样返回。
 */
function decodeShortArtifactId(e, n = false) {
  if (e === undefined) return null;
  if (e.length !== BASE58_UUID_LENGTH) return e;
  return n ? null : decodeBase58Uuid(e);
}
//@ chunk-yxnffbzs.js:23937-23990 placement
/**
 * 短 id 时返回 {shortId: true} 标记。
 */
function shortIdFlag(e) {
  return e?.length === BASE58_UUID_LENGTH
    ? {
        shortId: true,
      }
    : {};
}
//@ chunk-yxnffbzs.js:23990-24110 placement
var ARTIFACT_SLUG_RE = new RegExp(`^${UUID_PATTERN}$`);
var ARTIFACT_VERSION_SAFE_RE = /^[\w-]{1,64}$/;
var MAX_LISTED_FILES_SHOWN = 1024;
var ARTIFACT_MAX_RESULT_SIZE_CHARS = 16000;
var ARTIFACT_PAGE_INLINE_RESULT_CAP = OUTPUT_SIZE_LIMITS;
var ARTIFACT_FILE_INLINE_RESULT_CAP = 20000;
var ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS = 300000;
var ARTIFACT_STUB_URL_PREFIX = "eval-stub://artifact/";
//@ chunk-yxnffbzs.js:24110-24214 placement
function getArtifactPublishStubDir() {
  let CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = antEnv.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR;
  return typeof CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR === "string" &&
    CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR.length > 0
    ? CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR
    : null;
}
//@ chunk-yxnffbzs.js:24214-24239 placement
function stagingOriginOrNull() {
  return null;
}
//@ chunk-yxnffbzs.js:24239-24400 placement
function claudeAiWebEnvOf(e) {
  if (new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}(?:[/?#]|$)`).test(e)) return "prod";
  let n = stagingOriginOrNull();
  if (n !== null && new RegExp(`^${n}(?:[/?#]|$)`).test(e)) return "staging";
  return null;
}
//@ chunk-yxnffbzs.js:24400-24431 placement
function parseArtifactUrl(url) {
  return parseArtifactUrl_2(url, false);
}
//@ chunk-yxnffbzs.js:24431-25060 placement
/**
 * 解析 artifact URL（prod/staging、slug）。
 */
function parseArtifactUrl_2(e, n) {
  let match = e.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_URL_PATTERN}`));
  let o = decodeShortArtifactId(match?.[2], n);
  if (o !== null)
    return withUrlExtras(
      e,
      {
        slug: o,
        env: "prod",
        ...shortIdFlag(match?.[2]),
      },
      match?.[1],
    );
  let s = stagingOriginOrNull();
  if (s !== null) {
    let match = e.match(new RegExp(`^${s}${VIEWER_URL_PATTERN}`));
    let l = decodeShortArtifactId(match?.[2], n);
    if (l !== null)
      return withUrlExtras(
        e,
        {
          slug: l,
          env: "staging",
          ...shortIdFlag(match?.[2]),
        },
        match?.[1],
      );
  }
  let match_2 = e.match(
    new RegExp(`^https://(${UUID_PATTERN})\\.frame\\.(staging\\.)?claudeusercontent\\.com(?:[/?#]|$)`),
  );
  if (match_2?.[1])
    return withUrlExtras(e, {
      slug: match_2[1],
      env: match_2[2] ? "staging" : "prod",
    });
  let artifactHostOverride = getArtifactHostOverride();
  if (artifactHostOverride) {
    let match = e.match(new RegExp(`^https?://([^/?#]+)${VIEWER_URL_PATTERN}`));
    let l = decodeShortArtifactId(match?.[3], n);
    if (match !== null && l !== null && match[1] === new URL(artifactHostOverride).host)
      return withUrlExtras(
        e,
        {
          slug: l,
          env: claudeAiEnvironment(),
          ...shortIdFlag(match[3]),
        },
        match[2],
      );
  }
  return null;
}
//@ chunk-yxnffbzs.js:25060-25122 placement
/**
 * 应用 id（sk）与自定义 slug（vanity）的正则。
 */
var APP_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
var VANITY_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,59}$/;
//@ chunk-yxnffbzs.js:25122-25379 placement
function withUrlExtras(e, n, r) {
  let o =
    r !== undefined && VANITY_SLUG_REGEX.test(r)
      ? {
          ...n,
          vanity: r,
        }
      : n;
  let index = e.indexOf("#");
  let a = index === -1 ? e : e.slice(0, index);
  let index_2 = a.indexOf("?");
  if (index_2 === -1) return o;
  let sliced = a
    .slice(index_2 + 1)
    .split("&")
    .find((d) => d.startsWith("sk="))
    ?.slice(3);
  return sliced !== undefined && APP_ID_REGEX.test(sliced)
    ? {
        ...o,
        sk: sliced,
      }
    : o;
}
//@ chunk-yxnffbzs.js:25379-25622 placement
function artifactUrlSubPath(e) {
  let artifactHostOverride = getArtifactHostOverride();
  let r = stagingOriginOrNull();
  let o =
    e.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_SUBPATH_PATTERN}`))?.[1] ??
    (r !== null ? e.match(new RegExp(`^${r}${VIEWER_SUBPATH_PATTERN}`))?.[1] : undefined) ??
    (artifactHostOverride
      ? e.match(
          new RegExp(
            `^https?://${urlPatternToRegex(new URL(artifactHostOverride).host)}${VIEWER_SUBPATH_PATTERN}`,
          ),
        )?.[1]
      : undefined);
  return o === undefined || o === "" ? undefined : o;
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
function parseArtifactUrlInput(url) {
  return typeof url === "string" ? parseArtifactUrl(canonicalizeArtifactUrlInput(url)) : null;
}
//@ chunk-yxnffbzs.js:25851-25916 placement
function parseArtifactUrlAnyCase(e) {
  let n = canonicalizeArtifactUrlInput(e);
  return parseArtifactUrl(n) ?? parseArtifactUrl_2(n.toLowerCase(), true);
}
//@ chunk-yxnffbzs.js:25916-25966 placement
var regExp_4 = new RegExp(`^${urlPatternToRegex(ARTIFACT_STUB_URL_PREFIX)}(${UUID_PATTERN})(?:[/?#]|$)`);
//@ chunk-yxnffbzs.js:25966-26031 placement
function parseStubArtifactUrl(url) {
  let match = url.match(regExp_4);
  return match?.[1]
    ? {
        slug: match[1],
      }
    : null;
}
//@ chunk-yxnffbzs.js:26031-26196 placement
var ARTIFACT_DELETED_NOTE_TAG = "artifact-deleted";
var ARTIFACT_DELETED_NOTE_RE = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`);
var ARTIFACT_ATTACHED_NOTE_TAG = "artifact-attached";
var ARTIFACT_ATTACHED_NOTE_RE = new RegExp(
  `^<${ARTIFACT_ATTACHED_NOTE_TAG} url="([^"]+)"(?: title="([^"]*)")?( own)?/>`,
);
//@ chunk-yxnffbzs.js:26196-26295 placement
function uuidSlugFromUrl(url) {
  let slug = parseArtifactUrl(url)?.slug;
  if (slug !== undefined) return slug;
  return getArtifactPublishStubDir() !== null ? (parseStubArtifactUrl(url)?.slug ?? null) : null;
}
//@ chunk-yxnffbzs.js:26295-26395 placement
function artifactViewerPath(e) {
  if (isCobaltGateOn()) {
    let n = encodeUuidBase58(e);
    if (n !== null) return `/artifact/${n}`;
  }
  return `/code/artifact/${e}`;
}
//@ chunk-e6aww6q8.js:822970-823360 placement
/**
 * 拆分版 Artifact 工具集的映射：ArtifactComments/ArtifactData/ArtifactCheck 的父工具都是 Artifact，以及各动作（评论类、数据库、verify/preview）归属的拆分工具名。
 */
var SPLIT_TOOL_PARENT = {
  ArtifactComments: "Artifact",
  ArtifactData: "Artifact",
  ArtifactCheck: "Artifact",
};
var SPLIT_TOOL_BY_ACTION = {
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
  decodeShortArtifactId,
};
