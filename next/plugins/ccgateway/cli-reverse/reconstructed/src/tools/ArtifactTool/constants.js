/**
 * tools/ArtifactTool/constants.ts
 *
 * 2.1.316 新增：Artifact 工具常量
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1), chunk-bvz8t570.js (37)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bvz8t570.js:16552-16727 placement
/**
 * base58 UUID 编码常量与正则。
 */
var BASE58_RADIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UUID_MAX;
var BASE58_UUID_LENGTH;
var BASE58_UUID_PATTERN;
var regExp_3_2;
var UUID_RE;
deferInit("chunk-bvz8t570.js:16552", () => {
  BASE58_RADIX = 58n;
  UUID_MAX = (1n << 128n) - 1n;
  BASE58_UUID_LENGTH = 22;
  BASE58_UUID_PATTERN = "[1-9A-HJ-NP-Za-km-z]{22}";
  regExp_3_2 = new RegExp("^[1-9A-HJ-NP-Za-km-z]{22}$");
  UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
});
//@ chunk-bvz8t570.js:16727-16928 placement
/**
 * 把 UUID 编码为 22 位 base58。
 */
function encodeUuidBase58(slug) {
  if (!UUID_RE.test(slug)) return null;
  let value = BigInt(`0x${slug.replaceAll("-", "")}`);
  let out = "";
  for (let idx = 0; idx < 22; idx++) {
    out = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Number(value % BASE58_RADIX)] + out;
    value /= BASE58_RADIX;
  }
  return out;
}
//@ chunk-bvz8t570.js:17230-18625 placement
/**
 * Artifact 工具名与各类拒绝/提示文案前缀（必须给 file_path、冲突拒绝、策略来源等）。
 */
var ARTIFACT_TOOL_NAME; // deferred: uses urlPatternToRegex (../../utils/stringUtils.js) of its import cycle while loading; runs once the cycle is complete
var QUICKSTART_INTENTS;
var ARTIFACT_COMMENTS_TOOL_NAME;
var ARTIFACT_DATA_TOOL_NAME;
var ARTIFACT_CHECK_TOOL_NAME;
var ARTIFACT_FAMILY_TOOL_NAMES;
var ASSET_ID_RE;
var ARTIFACT_RULE_CONTENT_FIELD;
var ARTIFACT_READ_INPUT_FIELDS;
var ARTIFACT_READ_GATED_INPUT_FIELDS;
var DEFAULT_ARTIFACT_READ_PROMPT;
var STALE_GUARD_CONTENT_HEADER_SUFFIX;
var STALE_GUARD_REJECTION_PREFIX;
var STALE_GUARD_REJECTION_PREFIX_LEGACY;
var STALE_GUARD_CONTENT_HEADER;
var STALE_GUARD_DIFF_HEADER_SUFFIX;
var STALE_GUARD_DIFF_HEADER;
var STALE_GUARD_CONTENT_HEADER_LINE_RE;
var HANDOVER_SAVED_SOURCE_LEAD;
var HANDOVER_INLINE_REMEDY_LEAD;
var HANDOVER_DETAILS_START_RE;
var CONFLICT_REJECTION_PREFIX;
var NO_PAGE_SHORT_REJECTION;
var NO_PAGE_REJECTION_TYPES_ON;
var NO_PAGE_REJECTION_TYPES_OFF;
var NO_PAGE_REJECTIONS;
deferInit("chunk-bvz8t570.js:17230", () => {
  ARTIFACT_TOOL_NAME = "Artifact";
  QUICKSTART_INTENTS = ["document", "slides", "design", "other"];
  ARTIFACT_COMMENTS_TOOL_NAME = "ArtifactComments";
  ARTIFACT_DATA_TOOL_NAME = "ArtifactData";
  ARTIFACT_CHECK_TOOL_NAME = "ArtifactCheck";
  ARTIFACT_FAMILY_TOOL_NAMES = [
    ARTIFACT_TOOL_NAME,
    ARTIFACT_COMMENTS_TOOL_NAME,
    ARTIFACT_DATA_TOOL_NAME,
    ARTIFACT_CHECK_TOOL_NAME,
  ];
  ASSET_ID_RE = /^[0-9a-f]{32}$/;
  ARTIFACT_RULE_CONTENT_FIELD = "file_path";
  ARTIFACT_READ_INPUT_FIELDS = ["action", "url", "prompt"];
  ARTIFACT_READ_GATED_INPUT_FIELDS = ["page", "version"];
  DEFAULT_ARTIFACT_READ_PROMPT =
    "Describe what this page contains and reproduce its substantive text content, structure, and any data it presents.";
  STALE_GUARD_CONTENT_HEADER_SUFFIX = " \u2014 live version; raw HTML follows]";
  STALE_GUARD_REJECTION_PREFIX =
    "You hadn't viewed the live version of this artifact, so the publish was refused.";
  STALE_GUARD_REJECTION_PREFIX_LEGACY =
    "This session hadn't viewed the live version of this artifact, so the publish was refused.";
  STALE_GUARD_CONTENT_HEADER = (slug) => `[Artifact ${slug}${STALE_GUARD_CONTENT_HEADER_SUFFIX}`;
  STALE_GUARD_DIFF_HEADER_SUFFIX = " \u2014 live version; a line diff against the content you sent follows]";
  STALE_GUARD_DIFF_HEADER = (slug) => `[Artifact ${slug}${STALE_GUARD_DIFF_HEADER_SUFFIX}`;
  STALE_GUARD_CONTENT_HEADER_LINE_RE = new RegExp(
    `\\n\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n`,
  );
  HANDOVER_SAVED_SOURCE_LEAD = "Its full source (";
  HANDOVER_INLINE_REMEDY_LEAD = "Merge your edits onto it";
  HANDOVER_DETAILS_START_RE = new RegExp(
    `\\n(?=\\[Artifact [\\w-]{1,64}(?:${urlPatternToRegex(STALE_GUARD_CONTENT_HEADER_SUFFIX)}|${urlPatternToRegex(STALE_GUARD_DIFF_HEADER_SUFFIX)})\\n|${urlPatternToRegex(HANDOVER_SAVED_SOURCE_LEAD)}|${urlPatternToRegex(HANDOVER_INLINE_REMEDY_LEAD)})`,
  );
  CONFLICT_REJECTION_PREFIX = "Publish refused \u2014 nothing was merged or published:";
  NO_PAGE_SHORT_REJECTION =
    "file_path required to publish. Write the page to an .html file, then call again with its path as `file_path`";
  NO_PAGE_REJECTION_TYPES_ON = `${NO_PAGE_SHORT_REJECTION}, or pass \`type_url\` to start a new Artifact from a type. There is no inline content parameter.`;
  NO_PAGE_REJECTION_TYPES_OFF = `${NO_PAGE_SHORT_REJECTION}. There is no inline content parameter, and creating an Artifact from a type is not available in this session, so build the page yourself.`;
  NO_PAGE_REJECTIONS = [NO_PAGE_REJECTION_TYPES_ON, NO_PAGE_REJECTION_TYPES_OFF];
});
//@ chunk-bvz8t570.js:18625-18706 placement
function artifactLinkShapeHint() {
  return isCobaltGateOn() ? "\u2026/artifact/<id>" : "\u2026/code/artifact/<uuid>";
}
//@ chunk-bvz8t570.js:18706-19973 placement
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
//@ chunk-bvz8t570.js:19973-20330 placement
function artifactLoginEnvQuadMessage(managed) {
  return `${ARTIFACT_LOGIN_MESSAGE_LEAD}. This session's API access is set up by ${managed ? "your organization's managed settings" : "the ANTHROPIC_FEDERATION_RULE_ID / ANTHROPIC_ORGANIZATION_ID environment variables"}, which stays active for everything else \u2014 artifacts also use a claude.ai account. Run /login and select "Claude account with subscription", then retry.`;
}
//@ chunk-bvz8t570.js:20330-21428 placement
function artifactPolicyBlockedMessage(cause) {
  switch (cause) {
    case "org_policy_unverifiable":
      return "Artifacts can't check the signed-in Claude account's organization settings from this session: the account belongs to a Claude organization (Team or Enterprise), and this session's API access uses a different credential that can't read those settings. Run /login with a personal Claude account on a paid plan, then retry.";
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
//@ chunk-bvz8t570.js:21428-21690 placement
function artifactPolicyBlockedRemedy(cause) {
  switch (cause) {
    case "plan_unreadable":
      return authExpiredBlock();
    case "org_denied":
    case "latched":
      return {
        kind: "policy_denied",
        feature: "artifacts",
        policy_kind: cause,
      };
    case "org_policy_unverifiable":
    case "cache_miss":
    case "policy_route_missing":
    case "policy_unavailable":
      return;
  }
}
//@ chunk-bvz8t570.js:21690-21922 placement
function artifactPolicyUnobtainedMessage(unobtained) {
  if (isCoworkOauthNotAllowed(unobtained))
    return "Artifacts aren't available: Anthropic couldn't confirm your organization's settings for this cloud session (HTTP 403). This isn't a problem with your network.";
  return policyUnavailableMessage("Artifacts", "are", unobtained.outcome);
}
//@ chunk-bvz8t570.js:21922-22072 placement
function isCoworkOauthNotAllowed({ cause, outcome }) {
  return (
    cause === "policy_fetch_failed" &&
    isCoworkSession() &&
    outcome.httpStatus === 403 &&
    outcome.serverErrorCode === "oauth_not_allowed_for_organization"
  );
}
//@ chunk-bvz8t570.js:22072-22149 placement
/**
 * 「Claude Code 会从…读取策略」的前缀，与策略来源地址的正则。
 */
var POLICY_READ_FROM_PREFIX = "Claude Code reads that policy from ";
var HOST_PORT_REGEX = /^[A-Za-z0-9.-]+(:[0-9]+)?$/;
//@ chunk-bvz8t570.js:22149-22220 placement
/**
 * 拼出策略来源地址（合法主机名则加路径，否则说明是 API 的路由）。
 */
function policySourceAddress(host) {
  return HOST_PORT_REGEX.test(host)
    ? `${host}${POLICY_LIMITS_PATH}`
    : `the API's ${POLICY_LIMITS_PATH} route`;
}
//@ chunk-bvz8t570.js:22220-22733 placement
/**
 * 策略仍在加载时 artifact 不可用的说明。
 */
var ARTIFACT_POLICY_LOADING_NOTE =
  " and keeps retrying it in the background; whether artifacts are allowed is decided once it loads. Do not retry this call now. Tell the user why artifacts are unavailable and, if a proxy, VPN or web filter is involved, that their IT admin needs to let that address through.";
var POLICY_ROUTE_NOT_FORWARDED_NOTE =
  ", and a proxy or gateway that does not forward that path will keep answering 404, so nothing in this session can load it. Do not retry this call. Tell the user that their IT admin needs to let that address through to the API.";
//@ chunk-bvz8t570.js:22733-23222 placement
function artifactPolicyUnobtainedNote(unobtained) {
  let address = policySourceAddress(unobtained.outcome.host);
  if (isCoworkOauthNotAllowed(unobtained))
    return `Claude Code reads the organization's policy from ${address}. In this cloud session, Anthropic's API refused the request for the user's organization (HTTP 403). Do not retry this call now. Tell the user that artifacts are unavailable because Anthropic couldn't confirm their organization's settings for this cloud session, and that it isn't a problem with their network.`;
  let note =
    unobtained.cause === "policy_route_missing"
      ? POLICY_ROUTE_NOT_FORWARDED_NOTE
      : ARTIFACT_POLICY_LOADING_NOTE;
  return `${POLICY_READ_FROM_PREFIX}${address}${note}`;
}
//@ chunk-bvz8t570.js:23222-23267 placement
function artifactPolicyUnobtainedRefusal(unobtained) {
  return `${artifactPolicyUnobtainedMessage(unobtained)}

${artifactPolicyUnobtainedNote(unobtained)}`;
}
//@ chunk-bvz8t570.js:23267-23464 placement
function artifactLoginBlockedByCredentialMessage(source, remedy) {
  return `${ARTIFACT_LOGIN_MESSAGE_LEAD}, and this session is authenticating with ${source}, which takes precedence over a claude.ai account. ${remedy} Then run /login and select "Claude account with subscription".`;
}
//@ chunk-bvz8t570.js:23464-23626 placement
class ArtifactInputError extends Error {
  reasonCode;
  maxErrorChars;
  constructor(message, reasonCode, options) {
    super(message);
    this.name = "ArtifactInputError";
    this.reasonCode = reasonCode;
    this.maxErrorChars = options?.maxErrorChars;
  }
}
//@ chunk-bvz8t570.js:23626-23894 placement
/**
 * Artifact 地址正则片段：UUID、claude.ai 来源、查看器路径前缀、Artifact id，以及查看器 URL 与其子路径的匹配模式。
 */
var UUID_PATTERN; // deferred: uses BASE58_RADIX of its import cycle while loading; runs once the cycle is complete
var CLAUDE_AI_ORIGIN_PATTERN;
var VIEWER_PREFIX_RE;
var ARTIFACT_ID_PATTERN;
var VIEWER_URL_PATTERN;
var VIEWER_SUBPATH_PATTERN;
deferInit("chunk-bvz8t570.js:23626", () => {
  UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  CLAUDE_AI_ORIGIN_PATTERN = "https://(?:[a-z0-9-]+\\.)?claude\\.ai";
  VIEWER_PREFIX_RE = "/(?:artifact|code/(?:artifact|frame))/";
  ARTIFACT_ID_PATTERN = `${UUID_PATTERN}|${BASE58_UUID_PATTERN}`;
  VIEWER_URL_PATTERN = `${VIEWER_PREFIX_RE}(?:([A-Za-z0-9_-]*)-)?(${ARTIFACT_ID_PATTERN})(?:[/?#]|$)`;
  VIEWER_SUBPATH_PATTERN = `${VIEWER_PREFIX_RE}(?:[A-Za-z0-9_-]*-)?(?:${ARTIFACT_ID_PATTERN})/([^?#]+)`;
});
//@ chunk-bvz8t570.js:23894-23986 placement
/**
 * base58 长度的 artifact id 需要解码，其余原样返回。
 */
function decodeShortArtifactId(id, keepShort = false) {
  if (id === undefined) return null;
  if (id.length !== BASE58_UUID_LENGTH) return id;
  return keepShort ? null : decodeBase58Uuid(id);
}
//@ chunk-bvz8t570.js:23986-24039 placement
/**
 * 短 id 时返回 {shortId: true} 标记。
 */
function shortIdFlag(id) {
  return id?.length === BASE58_UUID_LENGTH
    ? {
        shortId: true,
      }
    : {};
}
//@ chunk-bvz8t570.js:24039-24169 placement
var ARTIFACT_SLUG_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ARTIFACT_VERSION_SAFE_RE;
var MAX_LISTED_FILES_SHOWN;
var ARTIFACT_MAX_RESULT_SIZE_CHARS;
var ARTIFACT_PAGE_INLINE_RESULT_CAP;
var WEBFETCH_TYPE_INSTRUCTIONS_MAX_CHARS;
var ARTIFACT_FILE_INLINE_RESULT_CAP;
var ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS;
var ARTIFACT_STUB_URL_PREFIX;
deferInit("chunk-bvz8t570.js:24039", () => {
  ARTIFACT_SLUG_RE = new RegExp(`^${UUID_PATTERN}$`);
  ARTIFACT_VERSION_SAFE_RE = /^[\w-]{1,64}$/;
  MAX_LISTED_FILES_SHOWN = 1024;
  ARTIFACT_MAX_RESULT_SIZE_CHARS = 16000;
  ARTIFACT_PAGE_INLINE_RESULT_CAP = OUTPUT_SIZE_LIMITS;
  WEBFETCH_TYPE_INSTRUCTIONS_MAX_CHARS = 20000;
  ARTIFACT_FILE_INLINE_RESULT_CAP = 20000;
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS = 300000;
  ARTIFACT_STUB_URL_PREFIX = "eval-stub://artifact/";
});
//@ chunk-bvz8t570.js:24169-24273 placement
function getArtifactPublishStubDir() {
  let CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR = antEnv.CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR;
  return typeof CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR === "string" &&
    CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR.length > 0
    ? CLAUDE_CODE_EVAL_ARTIFACT_STUB_DIR
    : null;
}
//@ chunk-bvz8t570.js:24273-24298 placement
function stagingOriginOrNull() {
  return null;
}
//@ chunk-bvz8t570.js:24298-24459 placement
function claudeAiWebEnvOf(value) {
  if (new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}(?:[/?#]|$)`).test(value)) return "prod";
  let stagingOrigin = stagingOriginOrNull();
  if (stagingOrigin !== null && new RegExp(`^${stagingOrigin}(?:[/?#]|$)`).test(value)) return "staging";
  return null;
}
//@ chunk-bvz8t570.js:24459-24490 placement
function parseArtifactUrl(url) {
  return parseArtifactUrl_2(url, false);
}
//@ chunk-bvz8t570.js:24490-25119 placement
/**
 * 解析 artifact URL（prod/staging、slug）。
 */
function parseArtifactUrl_2(value, keepShort) {
  let match = value.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_URL_PATTERN}`));
  let slug = decodeShortArtifactId(match?.[2], keepShort);
  if (slug !== null)
    return withUrlExtras(
      value,
      {
        slug,
        env: "prod",
        ...shortIdFlag(match?.[2]),
      },
      match?.[1],
    );
  let query = stagingOriginOrNull();
  if (query !== null) {
    let match = value.match(new RegExp(`^${query}${VIEWER_URL_PATTERN}`));
    let host = decodeShortArtifactId(match?.[2], keepShort);
    if (host !== null)
      return withUrlExtras(
        value,
        {
          slug: host,
          env: "staging",
          ...shortIdFlag(match?.[2]),
        },
        match?.[1],
      );
  }
  let match_2 = value.match(
    new RegExp(`^https://(${UUID_PATTERN})\\.frame\\.(staging\\.)?claudeusercontent\\.com(?:[/?#]|$)`),
  );
  if (match_2?.[1])
    return withUrlExtras(value, {
      slug: match_2[1],
      env: match_2[2] ? "staging" : "prod",
    });
  let artifactHostOverride = getArtifactHostOverride();
  if (artifactHostOverride) {
    let match = value.match(new RegExp(`^https?://([^/?#]+)${VIEWER_URL_PATTERN}`));
    let vanity = decodeShortArtifactId(match?.[3], keepShort);
    if (match !== null && vanity !== null && match[1] === new URL(artifactHostOverride).host)
      return withUrlExtras(
        value,
        {
          slug: vanity,
          env: claudeAiEnvironment(),
          ...shortIdFlag(match[3]),
        },
        match[2],
      );
  }
  return null;
}
//@ chunk-bvz8t570.js:25119-25181 placement
/**
 * 应用 id（sk）与自定义 slug（vanity）的正则。
 */
var APP_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;
var VANITY_SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,59}$/;
//@ chunk-bvz8t570.js:25181-25438 placement
function withUrlExtras(url, result, vanitySlug) {
  let withVanity =
    vanitySlug !== undefined && VANITY_SLUG_REGEX.test(vanitySlug)
      ? {
          ...result,
          vanity: vanitySlug,
        }
      : result;
  let index = url.indexOf("#");
  let hashIndex = index === -1 ? url : url.slice(0, index);
  let index_2 = hashIndex.indexOf("?");
  if (index_2 === -1) return withVanity;
  let sliced = hashIndex
    .slice(index_2 + 1)
    .split("&")
    .find((pathPart) => pathPart.startsWith("sk="))
    ?.slice(3);
  return sliced !== undefined && APP_ID_REGEX.test(sliced)
    ? {
        ...withVanity,
        sk: sliced,
      }
    : withVanity;
}
//@ chunk-bvz8t570.js:25438-25681 placement
function artifactUrlSubPath(url) {
  let artifactHostOverride = getArtifactHostOverride();
  let stagingOrigin = stagingOriginOrNull();
  let match =
    url.match(new RegExp(`^${CLAUDE_AI_ORIGIN_PATTERN}${VIEWER_SUBPATH_PATTERN}`))?.[1] ??
    (stagingOrigin !== null
      ? url.match(new RegExp(`^${stagingOrigin}${VIEWER_SUBPATH_PATTERN}`))?.[1]
      : undefined) ??
    (artifactHostOverride
      ? url.match(
          new RegExp(
            `^https?://${urlPatternToRegex(new URL(artifactHostOverride).host)}${VIEWER_SUBPATH_PATTERN}`,
          ),
        )?.[1]
      : undefined);
  return match === undefined || match === "" ? undefined : match;
}
//@ chunk-bvz8t570.js:25681-25853 placement
function canonicalizeArtifactUrlInput(value) {
  try {
    let parsed = new URL(value);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    if (parsed.hostname.endsWith(".")) parsed.hostname = parsed.hostname.slice(0, -1);
    return parsed.href;
  } catch {
    return value;
  }
}
//@ chunk-bvz8t570.js:25853-25910 placement
function parseArtifactUrlInput(url) {
  return typeof url === "string" ? parseArtifactUrl(canonicalizeArtifactUrlInput(url)) : null;
}
//@ chunk-bvz8t570.js:25910-25975 placement
function parseArtifactUrlAnyCase(value) {
  let canonical = canonicalizeArtifactUrlInput(value);
  return parseArtifactUrl(canonical) ?? parseArtifactUrl_2(canonical.toLowerCase(), true);
}
//@ chunk-bvz8t570.js:25975-26025 placement
var regExp_4; // deferred: uses urlPatternToRegex (../../utils/stringUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bvz8t570.js:25975", () => {
  regExp_4 = new RegExp(`^${urlPatternToRegex(ARTIFACT_STUB_URL_PREFIX)}(${UUID_PATTERN})(?:[/?#]|$)`);
});
//@ chunk-bvz8t570.js:26025-26090 placement
function parseStubArtifactUrl(url) {
  let match = url.match(regExp_4);
  return match?.[1]
    ? {
        slug: match[1],
      }
    : null;
}
//@ chunk-bvz8t570.js:26090-26255 placement
var ARTIFACT_DELETED_NOTE_TAG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ARTIFACT_DELETED_NOTE_RE;
var ARTIFACT_ATTACHED_NOTE_TAG;
var ARTIFACT_ATTACHED_NOTE_RE;
deferInit("chunk-bvz8t570.js:26090", () => {
  ARTIFACT_DELETED_NOTE_TAG = "artifact-deleted";
  ARTIFACT_DELETED_NOTE_RE = new RegExp(`^<${ARTIFACT_DELETED_NOTE_TAG} url="([^"]+)"/>`);
  ARTIFACT_ATTACHED_NOTE_TAG = "artifact-attached";
  ARTIFACT_ATTACHED_NOTE_RE = new RegExp(
    `^<${ARTIFACT_ATTACHED_NOTE_TAG} url="([^"]+)"(?: title="([^"]*)")?( own)?/>`,
  );
});
//@ chunk-bvz8t570.js:26255-26354 placement
function uuidSlugFromUrl(url) {
  let slug = parseArtifactUrl(url)?.slug;
  if (slug !== undefined) return slug;
  return getArtifactPublishStubDir() !== null ? (parseStubArtifactUrl(url)?.slug ?? null) : null;
}
//@ chunk-bvz8t570.js:26354-26454 placement
function artifactViewerPath(slug) {
  if (isCobaltGateOn()) {
    let shortId = encodeUuidBase58(slug);
    if (shortId !== null) return `/artifact/${shortId}`;
  }
  return `/code/artifact/${slug}`;
}
//@ chunk-5xgkngpb.js:834586-834976 placement
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
  ARTIFACT_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  getArtifactPublishStubDir,
  regExp_3_2,
  BASE58_RADIX,
  UUID_MAX,
  parseArtifactUrl,
  ARTIFACT_SLUG_RE,
  canonicalizeArtifactUrlInput,
  uuidSlugFromUrl,
  parseArtifactUrlInput,
  ARTIFACT_MAX_RESULT_SIZE_CHARS,
  ASSET_ID_RE,
  ARTIFACT_FILE_INLINE_RESULT_CAP,
  ArtifactInputError,
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_LOGIN_ERROR_CODE,
  ARTIFACT_LOGIN_REASON_CODE,
  ARTIFACT_POLICY_UNOBTAINED_ERROR_CODE,
  TRANSIENT_PUBLISH_REASON,
  ARTIFACT_RULE_CONTENT_FIELD,
  ARTIFACT_VERSION_SAFE_RE,
  artifactUrlSubPath,
  ARTIFACT_LOGIN_RETRY_NOTE,
  artifactPolicyBlockedMessage,
  ARTIFACT_POLICY_ERROR_CODE,
  artifactPolicyBlockedRemedy,
  artifactPolicyUnobtainedRefusal,
  ARTIFACT_LOGIN_BEFORE_SHAPE_NOTE,
  parseStubArtifactUrl,
  ARTIFACT_READ_INPUT_FIELDS,
  ARTIFACT_READ_GATED_INPUT_FIELDS,
  NO_PAGE_REJECTION_TYPES_ON,
  NO_PAGE_REJECTION_TYPES_OFF,
  artifactLinkShapeHint,
  MAX_LISTED_FILES_SHOWN,
  ARTIFACT_CHECK_TOOL_NAME,
  DEFAULT_ARTIFACT_READ_PROMPT,
  ARTIFACT_DELETED_NOTE_TAG,
  ARTIFACT_FAMILY_TOOL_NAMES,
  artifactPolicyUnobtainedMessage,
  NO_PAGE_REJECTIONS,
  ARTIFACT_LOGIN_MESSAGE_LEAD,
  STALE_GUARD_REJECTION_PREFIX,
  STALE_GUARD_REJECTION_PREFIX_LEGACY,
  CONFLICT_REJECTION_PREFIX,
  HANDOVER_DETAILS_START_RE,
  parseArtifactUrlAnyCase,
  ARTIFACT_STUB_URL_PREFIX,
  ARTIFACT_PAGE_INLINE_RESULT_CAP,
  artifactViewerPath,
  HANDOVER_INLINE_REMEDY_LEAD,
  STALE_GUARD_CONTENT_HEADER,
  HANDOVER_SAVED_SOURCE_LEAD,
  STALE_GUARD_DIFF_HEADER,
  SPLIT_TOOL_PARENT,
  SPLIT_TOOL_BY_ACTION,
  ARTIFACT_DELETED_NOTE_RE,
  ARTIFACT_ATTACHED_NOTE_RE,
  BASE58_UUID_LENGTH,
  encodeUuidBase58,
  VIEWER_PREFIX_RE,
  ARTIFACT_ID_PATTERN,
  decodeShortArtifactId,
  QUICKSTART_INTENTS,
  ARTIFACT_ATTACHED_NOTE_TAG,
  claudeAiWebEnvOf,
  STALE_GUARD_CONTENT_HEADER_LINE_RE,
  ARTIFACT_LOGIN_PROXIED_MESSAGE,
  ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE,
  artifactLoginBlockedByCredentialMessage,
  artifactLoginEnvQuadMessage,
  ARTIFACT_LOGIN_REQUIRED_MESSAGE,
  ARTIFACT_POLICY_REASON_CODES,
  STALE_GUARD_CONTENT_HEADER_SUFFIX,
  STALE_GUARD_DIFF_HEADER_SUFFIX,
  WEBFETCH_TYPE_INSTRUCTIONS_MAX_CHARS,
  artifactPolicyUnobtainedNote,
};
