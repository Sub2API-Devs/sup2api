/**
 * services/artifacts/artifactTypes.ts
 *
 * 2.1.316 新增：Artifact 类型目录：列出类型与实例、读取类型文件、描述类型、经中继拉取与错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w08rdxhd.js (64)
 * attribution: placement 64
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { TENGU_COBALT_PLINTH_LARCH, artifactTypesEnabled, canCreateFromType } from "./createFromType.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  array,
  unknown,
  stringSchema,
  booleanSchema,
  numberSchema,
  _enum,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE, BASE58_UUID_LENGTH } from "../../tools/ArtifactTool/constants.js";
import { truncateSingleLine, sanitizeDisplayTitle } from "../../utils/textNormalize.js";
import { markAttestation, revokeAttestations, REVOCABLE_INSTANCE_KINDS } from "./typeInstances.js";
import { artifactViewerUrl } from "./publishInstanceFiles.js";
import { VER_SHAPE } from "./ownPublishes.js";
import {
  isFrameNotFoundBody,
  frameApi,
  wireOfThrow,
  isRelayUnsent,
  wireOf,
  CCR_CREDENTIAL_REFUSED_PREFIX,
} from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { isMaxContentLengthError } from "../../utils/errors.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { sleep } from "../../utils/sleep.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { describeArtifactAuthFailure, isFrameMultiFileEnabled } from "./frameFlags.js";
import { denyPolicyBody, errBody } from "./publishErrors.js";
import {
  TAG_BRACKET_CLASSES,
  latinLetterConfusableClass,
  CONNECTOR_CHAR_CLASS,
  COLON_CHAR_CLASS,
} from "../../utils/confusables.js";
import { normalizeQuotes } from "./pageRuntimes.js";
import {
  DECISION_SURFACE_BRACKETS_RE,
  QUOTE_HOMOGLYPHS,
  scrubArtifactEnvelopeTags,
  scrubServerLine,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { uniq, count } from "../../utils/collections.js";
import { isSafeDisplayName } from "./artifactTypeRelease.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { CAPABILITY_NAME_REGEX } from "./capabilityDeclaration.js";
import { validateReadPath } from "./publishPaths.js";
import { countCharInString, truncateCodePoints } from "../../utils/stringUtils.js";
import { parseToolOutputSchema } from "../mcp/schemaParse.js";
import { isMeaningfulFlag } from "./textSanitize.js";
import { getAttestationKind } from "./attestation.js";
import { ARTIFACT_LIST_RELS } from "./listArtifacts.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { webfetchReadFile, getFetchErrorText } from "./webfetchRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { extractPageText, stripControlChars } from "./audience.js";
import {
  ARTIFACT_CONTENT_AUTHORED_TAG,
  ARTIFACT_INSTRUCTIONS_BELOW_PUBLISHER,
  ARTIFACT_INSTRUCTIONS_BELOW_FOUND,
  ARTIFACT_TYPE_INSTRUCTIONS,
  ARTIFACT_INSTRUCTIONS_ABOVE_THIRD_PARTY,
} from "../../constants/xml.js";
import { buildSpellingNoteForText } from "./artifactPromptText.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-w08rdxhd.js:28307-28375 placement
function isArtifactTypeCatalogEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPE_CATALOG ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, true)
  );
}
//@ chunk-w08rdxhd.js:28375-28435 placement
function isArtifactQuickstartEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_QUICKSTART ?? true;
}
//@ chunk-w08rdxhd.js:28435-28454 placement
var ANTHROPIC = "anthropic";
//@ chunk-w08rdxhd.js:28454-28636 placement
function getTypesListPath(query, typeQuery = false) {
  let parts = [
    ...(typeQuery ? [`scopes=${ANTHROPIC}`] : []),
    ...(query === undefined || query === "" ? [] : [`q=${encodeURIComponent(query)}`]),
  ];
  return parts.length === 0 ? "/api/frame/types" : `/api/frame/types?${parts.join("&")}`;
}
//@ chunk-w08rdxhd.js:28636-28701 placement
function typeApiPath(slug) {
  return `/api/frame/types/${encodeURIComponent(slug)}`;
}
//@ chunk-w08rdxhd.js:28701-28816 placement
function getTypeInstancesPath(slug, scope) {
  return `/api/frame/types/${encodeURIComponent(slug)}/instances?limit=${TYPE_INSTANCES_LIMIT}${scope === "all" ? "" : `&rel=${scope}`}`;
}
//@ chunk-w08rdxhd.js:28816-28947 placement
function getTypeFilePath(slug, path) {
  return `/api/frame/types/${encodeURIComponent(slug)}/files/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}
//@ chunk-w08rdxhd.js:28947-29057 placement
/**
 * 类型目录的大小/数量上限常量与列表等级顺序（core、solution、community）。
 */
var MAX_TYPE_FILE_BYTES = 4194304;
var TYPE_DESCRIBE_MAX_BYTES = 1048576;
var TYPE_LISTING_MAX_BYTES = 1048576;
var TYPE_INSTANCES_LIMIT = 200;
var LIST_DESCRIPTION_MAX_RUNES = 240;
var DETAIL_DESCRIPTION_MAX_RUNES = 1200;
var CAPABILITY_NAMES_MAX = 16;
var MAX_TYPE_FILE_ENTRIES = 4096;
var TYPE_TIER_ORDER = ["core", "solution", "community"];
//@ chunk-w08rdxhd.js:29057-29100 placement
function isKnownTier(tier) {
  return TYPE_TIER_ORDER.some((tierName) => tierName === tier);
}
//@ chunk-w08rdxhd.js:29100-29991 placement
/**
 * 类型目录接口的响应 schema：类型列表、类型条目的 listing（scope/tier）、类型摘要、类型详情（文件、能力、可创建）、类型文件条目与文件内容；以及描述不可用的提示与类型说明文件名 SKILL.md。
 */
var TYPES_LIST_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var TYPE_LISTING_SCHEMA;
var TYPE_SUMMARY_SCHEMA;
var TYPE_DETAIL_SCHEMA;
var TYPE_FILE_ENTRY_SCHEMA;
var TYPE_FILE_TEXT_SCHEMA;
var TYPE_DESCRIBE_UNAVAILABLE_MESSAGE;
var TYPE_INSTRUCTIONS_FILE;
deferInit("chunk-w08rdxhd.js:29100", () => {
  TYPES_LIST_SCHEMA = DoctorLazy(() =>
    objectSchema({
      types: array(unknown()).nullable(),
      next_page_token: stringSchema().optional().catch(undefined),
    }),
  );
  TYPE_LISTING_SCHEMA = DoctorLazy(() =>
    objectSchema({
      scope: stringSchema().optional().catch(undefined),
      tier: stringSchema().optional().catch(undefined),
    }),
  );
  TYPE_SUMMARY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      title: stringSchema().max(2048).optional().catch(undefined),
      description: stringSchema().max(8192).optional().catch(undefined),
      listings: array(unknown()).optional().catch(undefined),
      release: objectSchema({
        version: stringSchema().optional().catch(undefined),
      })
        .optional()
        .catch(undefined),
    }),
  );
  TYPE_DETAIL_SCHEMA = DoctorLazy(() =>
    TYPE_SUMMARY_SCHEMA().extend({
      files: array(unknown()).optional().catch(undefined),
      capabilities: unknown().optional(),
      creatable: booleanSchema().optional().catch(undefined),
    }),
  );
  TYPE_FILE_ENTRY_SCHEMA = DoctorLazy(() =>
    objectSchema({
      path: stringSchema().min(1).max(512),
      size: numberSchema().int().min(0).optional().catch(undefined),
      content_type: stringSchema().max(128).optional().catch(undefined),
    }),
  );
  TYPE_FILE_TEXT_SCHEMA = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      chars: numberSchema().int().min(0).optional().catch(undefined),
      truncated: booleanSchema().optional().catch(undefined),
      text: stringSchema(),
    }),
  );
  TYPE_DESCRIBE_UNAVAILABLE_MESSAGE = "describing an Artifact type is not available in this session";
  TYPE_INSTRUCTIONS_FILE = "SKILL.md";
});
//@ chunk-w08rdxhd.js:29991-30050 placement
function singleLineOrUndefined(description, descriptionValue) {
  return description === undefined
    ? undefined
    : (truncateSingleLine(description, descriptionValue) ?? undefined);
}
//@ chunk-w08rdxhd.js:30050-30266 placement
function getBestAnthropicTier(listings) {
  let out;
  for (let listing of listings ?? []) {
    let parsed = TYPE_LISTING_SCHEMA().safeParse(listing);
    if (!parsed.success || parsed.data.scope !== ANTHROPIC || !isKnownTier(parsed.data.tier)) continue;
    let index = TYPE_TIER_ORDER.indexOf(parsed.data.tier);
    out = out === undefined ? index : Math.min(out, index);
  }
  return out === undefined ? undefined : TYPE_TIER_ORDER[out];
}
//@ chunk-w08rdxhd.js:30266-30368 placement
function isAnthropicListed(listings) {
  return (listings ?? []).some((listing) => {
    let parsed = TYPE_LISTING_SCHEMA().safeParse(listing);
    return parsed.success && parsed.data.scope === ANTHROPIC;
  });
}
//@ chunk-w08rdxhd.js:30368-30459 placement
function updateFirstPartyAttestation(slug, listings, listingRows) {
  if (isAnthropicListed(listings)) markAttestation(slug, "first_party_type", listingRows);
  else revokeAttestations(slug, ["first_party_type"], listingRows);
}
//@ chunk-w08rdxhd.js:30459-30726 placement
function toTypeSummaryRow(row, url) {
  let bestAnthropicTier = getBestAnthropicTier(row.listings);
  let description = singleLineOrUndefined(row.description, url);
  let version = row.release?.version;
  let title = sanitizeDisplayTitle(row.title ?? "");
  return {
    typeUrl: artifactViewerUrl(row.slug),
    title: title ?? "Untitled",
    ...(title === null && {
      untitled: true,
    }),
    ...(description !== undefined && {
      description,
    }),
    ...(bestAnthropicTier !== undefined && {
      tier: bestAnthropicTier,
    }),
    ...(version !== undefined &&
      VER_SHAPE.test(version) && {
        release: version,
      }),
  };
}
//@ chunk-w08rdxhd.js:30726-30815 placement
function isFrameNotFound(frameWithRetry) {
  return (
    frameWithRetry.ok &&
    frameWithRetry.fromFrame &&
    frameWithRetry.status === 404 &&
    (frameWithRetry.route === "relay" || isFrameNotFoundBody(frameWithRetry.data))
  );
}
//@ chunk-w08rdxhd.js:30815-31709 placement
/**
 * 经中继 GET 类型目录接口：首次网络错误、5xx、带 retry-after 的 429/503 或中继不可用时等待后重试一次；响应超过大小上限时打点并返回 oversize。
 */
async function fetchFrameWithRetry(path, options) {
  for (let j = 0; ; j++) {
    let response;
    try {
      response = await frameApi.getRelayBound(path, {
        refreshOAuth: true,
        headers: buildFrameHeaders(),
        timeout: 15000,
        maxContentLength: options.maxContentLength,
        signal: options.signal,
        credentials: options.credentials,
        httpOnly: options.httpOnly,
      });
    } catch (error) {
      if (isCancel(error) || options.signal.aborted) throw error;
      if (isMaxContentLengthError(error)) {
        logFeatureBad(options.feature, "oversize_body", {
          ...(TYPE_CATALOG_FEATURES.has(options.feature) && {
            wire: wireOfThrow(error),
          }),
        });
        return {
          threw: true,
          oversize: true,
        };
      }
      if (j === 0) {
        await sleep(300 + Math.random() * 500, options.signal, {
          throwOnAbort: true,
        });
        continue;
      }
      logFeatureBad(options.feature, "request_error", {
        ...(TYPE_CATALOG_FEATURES.has(options.feature) && {
          wire: wireOfThrow(error),
        }),
      });
      return {
        threw: true,
        oversize: false,
      };
    }
    let retryAfter =
      response.ok && (response.status === 503 || response.status === 429)
        ? response.response?.headers?.["retry-after"]
        : undefined;
    if (
      ((response.ok && (response.status >= 500 || typeof retryAfter === "string")) ||
        (isRelayUnsent(response) &&
          response.reason === "relay-unavailable" &&
          (response.status === 0 || response.status >= 499))) &&
      j === 0
    ) {
      let result =
        typeof retryAfter === "string"
          ? Math.min(parseRetryAfterMs(retryAfter) ?? 1000, 5000)
          : 300 + Math.random() * 500;
      await sleep(result, options.signal, {
        throwOnAbort: true,
      });
      continue;
    }
    return response;
  }
}
//@ chunk-w08rdxhd.js:31709-31774 placement
var TYPE_CATALOG_FEATURES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w08rdxhd.js:31709", () => {
  TYPE_CATALOG_FEATURES = new Set(["artifact_type_list", "artifact_type_instances"]);
});
//@ chunk-w08rdxhd.js:31774-32601 placement
/**
 * 把类型目录请求的失败（未认证、中继错误、403 被策略拒绝、429、503、其他 HTTP 错误）转成给模型的错误文字并打点，返回 {err, reason}。
 */
function describeFrameReadFailure(response, feature, what) {
  let fail = (reason, err) => {
    logFeatureBad(feature, reason, {
      ...(response.ok && {
        status: response.status,
      }),
      ...(TYPE_CATALOG_FEATURES.has(feature) && {
        wire: wireOf(response),
      }),
    });
    return {
      err,
      reason,
    };
  };
  if (!response.ok)
    return fail(
      "not_ok",
      response.reason === "no-auth"
        ? describeArtifactAuthFailure(response.detail)
        : `${what} unavailable here: ${response.reason}`,
    );
  if (!response.fromFrame)
    return fail("relay_error", `${what} could not be read (relay HTTP ${response.status}) \u2014 retry`);
  if (response.status === 403) {
    let body = denyPolicyBody(response.data);
    return fail(
      body ? "denied" : "forbidden",
      `${what}: not available to this session (${body ? errBody(body.error) : errBody(response.data)}) \u2014 nothing to retry`,
    );
  }
  if (response.status === 429)
    return fail("rate_limited", `${what}: rate limited \u2014 wait a little before asking again`);
  if (response.status === 503)
    return fail(
      "unavailable",
      `${what} temporarily unavailable (${errBody(response.data)}) \u2014 retry shortly; this is not an empty answer`,
    );
  return fail(
    response.status >= 500 ? "http_5xx" : "http_4xx",
    `${what} could not be read (HTTP ${response.status}: ${errBody(response.data)})`,
  );
}
//@ chunk-w08rdxhd.js:32601-34592 placement
async function listArtifactTypes(request) {
  let firstParty = request.firstParty === true;
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(getTypesListPath(request.query, firstParty), {
    signal: request.signal,
    maxContentLength: MAX_TYPE_FILE_BYTES,
    feature: "artifact_type_list",
    credentials: request.credentials,
    httpOnly: request.httpOnly,
  });
  if ("threw" in frameWithRetry)
    return frameWithRetry.oversize
      ? {
          err: "the Artifact type listing could not be read (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : {
          err: "the Artifact type listing could not be read (network error) \u2014 retry",
          reason: "request_error",
        };
  let wire = wireOf(frameWithRetry);
  if (isRelayUnsent(frameWithRetry)) {
    logFeatureSad("artifact_type_list", "relay_unserved", {
      status: frameWithRetry.status,
      wire,
    });
    return {
      err: null,
      rows: [],
      dropped: 0,
      more: false,
      unavailable: true,
    };
  }
  if (isFrameNotFound(frameWithRetry)) {
    logFeatureSad("artifact_type_list", "catalog_off", {
      wire,
    });
    return {
      err: null,
      rows: [],
      dropped: 0,
      more: false,
      unavailable: true,
    };
  }
  if (!frameWithRetry.ok || !frameWithRetry.fromFrame || frameWithRetry.status !== 200) {
    let failure = describeFrameReadFailure(frameWithRetry, "artifact_type_list", "the Artifact type listing");
    return frameWithRetry.ok &&
      frameWithRetry.fromFrame &&
      frameWithRetry.status === 403 &&
      typeof frameWithRetry.data === "string" &&
      frameWithRetry.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? {
          ...failure,
          reason: "ccr_credential_refused",
        }
      : failure;
  }
  let parsed = TYPES_LIST_SCHEMA().safeParse(frameWithRetry.data);
  if (!parsed.success) {
    logFeatureBad("artifact_type_list", "malformed_body", {
      wire,
    });
    return {
      err: "the Artifact type listing could not be read (malformed response)",
      reason: "malformed_body",
    };
  }
  let types = parsed.data.types ?? [];
  let mapped = types.map((type) => {
    let typeParsed = TYPE_SUMMARY_SCHEMA().safeParse(type);
    return typeParsed.success ? typeParsed.data : undefined;
  });
  for (let row of mapped) if (row !== undefined) updateFirstPartyAttestation(row.slug, row.listings, now);
  let rows = [];
  let dropped = 0;
  let unlistedDrop = 0;
  for (let row of mapped) {
    if (rows.length >= TYPE_INSTANCES_LIMIT) break;
    if (row === undefined) {
      dropped++;
      continue;
    }
    let anthropicListed = isAnthropicListed(row.listings);
    if (firstParty && !anthropicListed) {
      if (row.listings === undefined) dropped++;
      else unlistedDrop++;
      continue;
    }
    rows.push(toTypeSummaryRow(row, LIST_DESCRIPTION_MAX_RUNES));
  }
  if (types.length > unlistedDrop && rows.length === 0) {
    logFeatureBad("artifact_type_list", "all_rows_dropped", {
      wire,
    });
    return {
      err: "the Artifact type listing could not be read (response rows were unreadable)",
      reason: "all_rows_dropped",
    };
  }
  let more =
    rows.length + dropped + unlistedDrop < types.length ||
    (typeof parsed.data.next_page_token === "string" && parsed.data.next_page_token !== "");
  if (dropped > 0)
    logFeatureSad("artifact_type_list", "rows_dropped", {
      count: dropped,
      wire,
    });
  else
    logFeatureOk("artifact_type_list", {
      n_types: rows.length,
      queried: request.query !== undefined && request.query !== "",
      more,
      wire,
    });
  return {
    err: null,
    rows,
    dropped,
    more,
    unavailable: false,
  };
}
//@ chunk-w08rdxhd.js:34592-34695 placement
/**
 * 弯引号与各种短横线的替换正则，用于清洗类型目录文本。
 */
var regExp; // deferred: uses INVISIBLE_CHAR_CLASSES (../../utils/confusables.js) of its import cycle while loading; runs once the cycle is complete
var DASH_VARIANT_RE;
deferInit("chunk-w08rdxhd.js:34592", () => {
  regExp = new RegExp(`[${TAG_BRACKET_CLASSES.open}${TAG_BRACKET_CLASSES.close}]`, "gu");
  DASH_VARIANT_RE = /[\u2012-\u2015\u2E3A\u2E3B\uFE31\uFE32\uFE58]/gu;
});
//@ chunk-w08rdxhd.js:34695-34877 placement
function typeRowTitle(row) {
  return scrubArtifactLinks(
    normalizeQuotes(row.replaceAll('"', "'"))
      .replaceAll("\\", " ")
      .replace(regExp, " ")
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(DASH_VARIANT_RE, "-"),
  )
    .replace(getTypeUrlLabelRegex(), "(label removed)")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-w08rdxhd.js:34877-34983 placement
function confusableWordPattern(word) {
  return [...word]
    .map((char) =>
      char === "l"
        ? `[${latinLetterConfusableClass("l")}I1|\u01C0]\\p{M}*`
        : `[${latinLetterConfusableClass(char)}]\\p{M}*`,
    )
    .join("");
}
//@ chunk-w08rdxhd.js:34983-35046 placement
/**
 * “type url”标签匹配用的分隔符字符集与惰性正则。
 */
var TYPE_URL_SEPARATORS = ".\\u00B7\\u2027\\uFF0E\\u2024\\u30FB\\u2219\\u22C5";
var typeUrlLabelRegex;
//@ chunk-w08rdxhd.js:35046-35365 placement
/**
 * 惰性构造匹配"type url"标签（中间可夹杂分隔符、格式字符或组合符号）的正则，用于识别伪造的类型链接标签。
 */
function getTypeUrlLabelRegex() {
  if (typeUrlLabelRegex === undefined) {
    let pattern = `(?:[\\s\\p{Cf}\\p{M}]*[${CONNECTOR_CHAR_CLASS}/${COLON_CHAR_CLASS}][\\s\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*[${TYPE_URL_SEPARATORS}][\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*)`;
    typeUrlLabelRegex = new RegExp(
      `(?<![A-Za-z0-9_])${confusableWordPattern("type")}${pattern}${confusableWordPattern("url")}(?![A-Za-z0-9_])(?=\\s*[${COLON_CHAR_CLASS}\\u1361\\u1365\\u1804\\uA6F4\\u2E35\\u0903\\u0F7F])`,
      "gu",
    );
  }
  return typeUrlLabelRegex;
}
//@ chunk-w08rdxhd.js:35365-35372 placement
/**
 * 清洗链接的易混字符/UUID/路径片段模式集合（惰性构造）。
 */
var linkScrubPatterns;
//@ chunk-w08rdxhd.js:35372-35766 placement
/**
 * 惰性构造清洗链接用的模式集合：拉丁字母易混字符、UUID 状片段、artifact/code 路径片段等。
 */
function getLinkScrubPatterns() {
  if (linkScrubPatterns === undefined)
    linkScrubPatterns = {
      confusable: [..."abcdefghijklmnopqrstuvwxyz"].map((letter) => [
        letter,
        new RegExp(`^[${latinLetterConfusableClass(letter)}]$`, "u"),
      ]),
      marks: [
        new RegExp(
          "[0-9a-fiol]{8}[^0-9a-z]+[0-9a-fiol]{4}[^0-9a-z]+[0-9a-fiol]{4}[^0-9a-z]+[0-9a-fiol]{4}[^0-9a-z]+[0-9a-fiol]{12}",
          "gi",
        ),
        /\/(?:artifact|code\/(?:artifact|frame))\//gi,
      ],
      slash: /^[/\u2044\u2215\uFF0F\u29F8\u27CB\u2571\u3033\u2CDC\u1735\u31D3]$/u,
    };
  return linkScrubPatterns;
}
//@ chunk-w08rdxhd.js:35766-35817 placement
var BASE58_CHAR_RE = /^[1-9A-HJ-NP-Za-km-z]$/;
var ALNUM_CHAR_RE = /^[0-9A-Za-z]$/;
//@ chunk-w08rdxhd.js:35817-36759 placement
/**
 * 在文字里找出伪装的 artifact 链接或 ID（同形字母、UUID 形状、base58 UUID、/artifact/ 路径），把包含它们的整个词替换成 "(link removed)"。
 */
function scrubArtifactLinks(text) {
  let { confusable, marks, slash } = getLinkScrubPatterns();
  let chars = [...text];
  let folded = "";
  let indexMap = [];
  let suspicious = [];
  chars.forEach((char, charIndex) => {
    let normalized = char.normalize("NFKC");
    let matches = /^[A-Za-z]\p{M}+$/u.test(char.normalize("NFD"));
    let foldedChar = /^\s$/u.test(char)
      ? " "
      : /^[0-9A-Za-z]+$/.test(normalized)
        ? normalized
        : matches
          ? char.normalize("NFD")[0]
          : /^[\p{Cf}\p{M}]$/u.test(char)
            ? ""
            : /^\p{Nd}$/u.test(char)
              ? "1"
              : slash.test(normalized)
                ? "/"
                : (confusable.find(([, pattern]) => pattern.test(char))?.[0] ?? ".");
    for (let ch of foldedChar) {
      folded += ch;
      indexMap.push(charIndex);
      suspicious.push(!ALNUM_CHAR_RE.test(char) && !matches);
    }
  });
  let marked = new Set();
  let markRange = (start, length) => {
    for (let position = start; position < start + length; position++) marked.add(indexMap[position]);
  };
  for (let mark of marks) for (let match of folded.matchAll(mark)) markRange(match.index, match[0].length);
  let idLength = BASE58_UUID_LENGTH;
  for (let j = 0; j + idLength <= folded.length; j++) {
    let sliced = folded.slice(j, j + idLength);
    let firstIndex = indexMap[j];
    let lastIndex = indexMap[j + idLength - 1];
    if (
      ![...sliced].every((ch) => BASE58_CHAR_RE.test(ch)) ||
      indexMap[j - 1] === firstIndex ||
      indexMap[j + idLength] === lastIndex ||
      ALNUM_CHAR_RE.test(chars[firstIndex - 1] ?? "") ||
      ALNUM_CHAR_RE.test(chars[lastIndex + 1] ?? "")
    )
      continue;
    if (suspicious.slice(j, j + idLength).some(Boolean) || decodeBase58Uuid(sliced) !== null)
      markRange(j, idLength);
  }
  if (marked.size === 0) return text;
  let out = "";
  let currentWord = "";
  let wordMarked = false;
  chars.forEach((char, charIndex) => {
    if (/^\s$/u.test(char)) {
      out += (wordMarked ? "(link removed)" : currentWord) + char;
      currentWord = "";
      wordMarked = false;
    } else {
      currentWord += char;
      wordMarked ||= marked.has(charIndex);
    }
  });
  return out + (wordMarked ? "(link removed)" : currentWord);
}
//@ chunk-w08rdxhd.js:36759-36925 placement
function typeRowDescription(row) {
  return scrubArtifactLinks(
    normalizeQuotes(row.replaceAll('"', "'"))
      .replaceAll("\\", " ")
      .replace(regExp, " ")
      .replace(DECISION_SURFACE_BRACKETS_RE, " "),
  )
    .replace(getTypeUrlLabelRegex(), "(label removed)")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-w08rdxhd.js:36925-37047 placement
function typeNameKey(name) {
  return typeRowTitle(name)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{Z}\p{Cc}\p{Cf}\p{Pd}_\u2212]+/gu, " ")
    .trim();
}
//@ chunk-w08rdxhd.js:37047-37131 placement
var QUOTE_HOMOGLYPH_CLASS; // deferred: uses QUOTE_HOMOGLYPHS (../../tools/ArtifactTool/artifactUrls.js) of its import cycle while loading; runs once the cycle is complete
var QUOTED_TEXT_RE;
deferInit("chunk-w08rdxhd.js:37047", () => {
  QUOTE_HOMOGLYPH_CLASS = `"${QUOTE_HOMOGLYPHS.source.slice(1, -1)}`;
  QUOTED_TEXT_RE = new RegExp(`^[${QUOTE_HOMOGLYPH_CLASS}]([\\s\\S]*)[${QUOTE_HOMOGLYPH_CLASS}]$`, "u");
});
//@ chunk-w08rdxhd.js:37131-37180 placement
function typeNameWithoutQuotes(name) {
  return name.trim().replace(QUOTED_TEXT_RE, "$1");
}
//@ chunk-w08rdxhd.js:37180-37243 placement
var MIN_TYPE_NAME_CHARS = 3;
var isLongEnoughName = (name) => [...name].length >= MIN_TYPE_NAME_CHARS;
var normalizeSpaces = (text) => text.replaceAll(" ", "");
//@ chunk-w08rdxhd.js:37243-37281 placement
function typeNameMatchKey(name) {
  return normalizeSpaces(typeNameKey(typeNameWithoutQuotes(name)));
}
//@ chunk-w08rdxhd.js:37281-37326 placement
function typeTitleMatchKeys(title) {
  return uniq([normalizeSpaces(typeNameKey(title)), typeNameMatchKey(title)]);
}
//@ chunk-w08rdxhd.js:37326-37891 placement
function typesNamed(rows, query) {
  let queryKey = typeNameKey(typeNameWithoutQuotes(query));
  if (queryKey === "")
    return {
      named: [],
      exact: false,
    };
  let querySpaced = typeNameMatchKey(query);
  let queryNormalized = normalizeSpaces(typeNameKey(query));
  let exactFound = false;
  let named = [];
  let prefixMatches = [];
  let looseMatches = [];
  for (let row of rows) {
    let titleKey = row.untitled ? "" : typeNameKey(row.title);
    if (titleKey === "") continue;
    let titleSpaced = normalizeSpaces(titleKey);
    if (titleSpaced === querySpaced) {
      exactFound = true;
      named.push(row);
      continue;
    }
    let spacedMatch = titleSpaced === queryNormalized;
    if (spacedMatch) named.push(row);
    if (isLongEnoughName(titleSpaced) && querySpaced.includes(titleSpaced)) prefixMatches.push(row);
    else if (spacedMatch || (isLongEnoughName(querySpaced) && titleKey.includes(queryKey)))
      looseMatches.push(row);
  }
  if (exactFound)
    return {
      named,
      exact: true,
    };
  let candidates = [...prefixMatches, ...looseMatches];
  if (candidates.length < 2 || looseMatches.length > 0)
    return {
      named: candidates,
      exact: false,
    };
  let mapped = prefixMatches.map((row) => normalizeSpaces(typeNameKey(row.title)));
  let filtered = prefixMatches.filter((row, rowIndex) =>
    mapped.every((other, otherIndex) => otherIndex === rowIndex || mapped[rowIndex].includes(other)),
  );
  return {
    named: filtered.length === 1 ? filtered : candidates,
    exact: false,
  };
}
//@ chunk-w08rdxhd.js:37891-38365 placement
async function findArtifactTypeByName(name, options) {
  let listing = await listArtifactTypes({
    ...options,
    firstParty: true,
  });
  if (listing.err !== null && listing.reason !== "ccr_credential_refused")
    return {
      err: listing.err,
      reason: `name_${listing.reason}`,
    };
  if (listing.err !== null || listing.unavailable)
    return {
      err: null,
      found: undefined,
      unavailable: true,
    };
  let hasGaps = listing.more || listing.dropped > 0 || listing.rows.some((row) => row.untitled);
  let { named, exact } = typesNamed(listing.rows, name);
  return named.length === 1 && named[0] !== undefined && (exact || !hasGaps)
    ? {
        err: null,
        found: named[0],
        exact,
      }
    : {
        err: null,
        found: undefined,
        named: named.length > 1 ? named : [],
        listed: listing.rows.length,
        partial: hasGaps,
      };
}
//@ chunk-w08rdxhd.js:38365-38638 placement
var TYPE_NOT_FOUND_MESSAGE_2 =
  "Artifact type not found in this account's catalog \u2014 check the link (use a `type_url` from action \"list_types\"); a type that exists but isn't listed for this account, a single-file page, or the catalog not being available to this account all answer this way";
//@ chunk-w08rdxhd.js:38638-40526 placement
async function describeArtifactType(slug, options) {
  if (!ARTIFACT_SLUG_RE.test(slug)) {
    logFeatureBad("artifact_type_describe", "invalid_slug");
    return {
      err: "type_url does not name an Artifact type",
      reason: "invalid_slug",
    };
  }
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(typeApiPath(slug), {
    signal: options.signal,
    maxContentLength: TYPE_DESCRIBE_MAX_BYTES,
    feature: "artifact_type_describe",
    credentials: options.credentials,
  });
  if ("threw" in frameWithRetry)
    return frameWithRetry.oversize
      ? {
          err: "the Artifact type could not be read (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : {
          err: "the Artifact type could not be read (network error) \u2014 retry",
          reason: "request_error",
        };
  if (isRelayUnsent(frameWithRetry)) {
    logFeatureBad("artifact_type_describe", "relay_unserved", {
      status: frameWithRetry.status,
    });
    return {
      err: TYPE_DESCRIBE_UNAVAILABLE_MESSAGE,
      reason: "relay_unserved",
    };
  }
  if (isFrameNotFound(frameWithRetry)) {
    logFeatureSad("artifact_type_describe", "not_found");
    return {
      err: TYPE_NOT_FOUND_MESSAGE_2,
      reason: "not_found",
    };
  }
  if (!frameWithRetry.ok || !frameWithRetry.fromFrame || frameWithRetry.status !== 200) {
    let failure = describeFrameReadFailure(frameWithRetry, "artifact_type_describe", "the Artifact type");
    return frameWithRetry.ok &&
      frameWithRetry.fromFrame &&
      frameWithRetry.status === 403 &&
      typeof frameWithRetry.data === "string" &&
      frameWithRetry.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? {
          ...failure,
          reason: "ccr_credential_refused",
        }
      : failure;
  }
  let parsed = TYPE_DETAIL_SCHEMA().safeParse(frameWithRetry.data);
  if (!parsed.success || parsed.data.slug !== slug) {
    logFeatureBad("artifact_type_describe", "malformed_body");
    return {
      err: "the Artifact type could not be read (malformed response)",
      reason: "malformed_body",
    };
  }
  let data = parsed.data;
  updateFirstPartyAttestation(data.slug, data.listings, now);
  let files = [];
  let files_2 = data.files ?? [];
  for (let file of files_2.slice(0, MAX_TYPE_FILE_ENTRIES)) {
    let parsedFile = TYPE_FILE_ENTRY_SCHEMA().safeParse(file);
    if (parsedFile.success && isSafeDisplayName(parsedFile.data.path)) files.push(parsedFile.data.path);
  }
  let filesOmitted = files_2.length - files.length;
  let out =
    data.capabilities == null
      ? undefined
      : isPlainObject(data.capabilities)
        ? data.capabilities
        : "malformed";
  let sliced = Object.keys(out !== undefined && out !== "malformed" ? out : {})
    .filter((key) => CAPABILITY_NAME_REGEX.test(key))
    .sort()
    .slice(0, CAPABILITY_NAMES_MAX);
  logFeatureOk("artifact_type_describe", {
    n_files: files.length,
    n_capabilities: sliced.length,
    ships_instructions: files.includes(TYPE_INSTRUCTIONS_FILE),
    ...(data.creatable !== undefined && {
      creatable: data.creatable,
    }),
  });
  return {
    err: null,
    detail: {
      ...toTypeSummaryRow(data, DETAIL_DESCRIPTION_MAX_RUNES),
      files,
      filesOmitted,
      shipsInstructions: files.includes(TYPE_INSTRUCTIONS_FILE),
      firstParty: isAnthropicListed(data.listings),
      capabilities: sliced,
      ...(out !== undefined && {
        declaration: out,
      }),
      ...(data.creatable !== undefined && {
        creatable: data.creatable,
      }),
    },
  };
}
//@ chunk-w08rdxhd.js:40526-40535 placement
var MAX_PATH_SEGMENTS = 5;
//@ chunk-w08rdxhd.js:40535-42679 placement
async function readArtifactTypeFile(slug, path, options) {
  if (!ARTIFACT_SLUG_RE.test(slug)) {
    logFeatureBad("artifact_type_file_read", "invalid_slug");
    return {
      kind: "unavailable",
      why: "the link does not name an Artifact type \u2014 nothing to retry",
      reason: "invalid_slug",
    };
  }
  let validated = validateReadPath(path);
  if ("errMsg" in validated || validated.key !== path) {
    logFeatureSad("artifact_type_file_read", "invalid_path");
    return {
      kind: "withheld",
    };
  }
  if (countCharInString(path, "/") + 1 > MAX_PATH_SEGMENTS) {
    logFeatureSad("artifact_type_file_read", "too_deep");
    return {
      kind: "withheld",
    };
  }
  let response;
  try {
    response = await frameApi.getRelayBound(getTypeFilePath(slug, path), {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: TYPE_LISTING_MAX_BYTES,
      signal: options.signal,
      credentials: options.credentials,
    });
  } catch (error) {
    if (isCancel(error) || options.signal.aborted) throw error;
    let tooLarge = isMaxContentLengthError(error);
    logFeatureBad("artifact_type_file_read", tooLarge ? "oversize_body" : "request_error");
    return tooLarge
      ? {
          kind: "unavailable",
          why: "the answer was larger than this client accepts \u2014 nothing to retry",
          reason: "oversize_body",
        }
      : {
          kind: "unavailable",
          why: "a network error \u2014 retry shortly",
          reason: "request_error",
        };
  }
  if (isRelayUnsent(response)) {
    logFeatureSad("artifact_type_file_read", "relay_unserved", {
      status: response.status,
    });
    return {
      kind: "withheld",
    };
  }
  if (!response.ok) {
    let { reason } = describeFrameReadFailure(response, "artifact_type_file_read", "the type file");
    return {
      kind: "unavailable",
      why: catalogErrorMessage(reason),
      reason,
    };
  }
  if (isFrameNotFound(response)) {
    logFeatureSad("artifact_type_file_read", "withheld", {
      relay: response.route === "relay",
    });
    return {
      kind: "withheld",
    };
  }
  if (
    response.ok &&
    response.fromFrame &&
    response.status === 403 &&
    typeof response.data === "string" &&
    response.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  ) {
    logFeatureSad("artifact_type_file_read", "ccr_credential_refused");
    return {
      kind: "withheld",
    };
  }
  if (response.ok && response.fromFrame && response.status === 415) {
    logFeatureSad("artifact_type_file_read", "not_text");
    return {
      kind: "not_text",
    };
  }
  if (response.ok && response.fromFrame && response.status === 413) {
    logFeatureSad("artifact_type_file_read", "too_large");
    return {
      kind: "too_large",
    };
  }
  if (!response.fromFrame || response.status !== 200) {
    let { reason } = describeFrameReadFailure(response, "artifact_type_file_read", "the type file");
    return {
      kind: "unavailable",
      why: catalogErrorMessage(reason),
      reason,
    };
  }
  let parsedText = TYPE_FILE_TEXT_SCHEMA().safeParse(response.data);
  if (!parsedText.success || parsedText.data.path !== path) {
    logFeatureBad("artifact_type_file_read", "malformed_body");
    return {
      kind: "unavailable",
      why: "the answer was malformed \u2014 nothing to retry",
      reason: "malformed_body",
    };
  }
  let instructions = instructionsFromText(parsedText.data.text, true);
  let clipped = instructions.clipped || parsedText.data.truncated === true;
  let chars = Math.max(instructions.chars, parsedText.data.chars ?? 0);
  logFeatureOk("artifact_type_file_read", {
    chars,
    clipped,
    relay: response.route === "relay",
  });
  return {
    kind: "read",
    text: instructions.text,
    chars,
    clipped,
  };
}
//@ chunk-w08rdxhd.js:42679-43120 placement
function catalogErrorMessage(reason) {
  switch (reason) {
    case "rate_limited":
      return "the catalog is rate limited \u2014 retry in a little while";
    case "unavailable":
    case "http_5xx":
    case "relay_error":
      return "the catalog did not answer \u2014 retry shortly";
    case "not_ok":
      return "the request could not be sent from here \u2014 nothing to retry";
    case "ccr_credential_refused":
    case "denied":
    case "forbidden":
    case "http_4xx":
      return "the catalog refused the request \u2014 nothing to retry";
  }
}
//@ chunk-w08rdxhd.js:43120-43735 placement
async function readTypeOwnInstructions(artifact, signal, readSignal, files, fileList) {
  let filesArg = files !== undefined && files.length > 0 ? files : undefined;
  if (filesArg !== undefined && !filesArg.includes(TYPE_INSTRUCTIONS_FILE))
    return {
      kind: "none",
    };
  let artifactTypeFile = await readArtifactTypeFile(artifact.slug, TYPE_INSTRUCTIONS_FILE, {
    signal,
    credentials: readSignal,
  });
  switch (artifactTypeFile.kind) {
    case "read":
      return artifactTypeFile.text.trim() === ""
        ? {
            kind: "none",
          }
        : {
            ...artifactTypeFile,
            fromType: true,
          };
    case "not_text":
      return {
        kind: "unavailable",
        why: "the file is not text",
        known: true,
      };
    case "too_large":
      return {
        kind: "unavailable",
        why: "the file is larger than this read accepts",
        known: true,
      };
    case "withheld":
    case "unavailable":
      return fileList
        ? readTypeInstructions(artifact, signal, readSignal, files)
        : {
            kind: "unavailable",
            why:
              artifactTypeFile.kind === "withheld"
                ? "the type catalog does not serve it to this session yet"
                : artifactTypeFile.why,
            known: filesArg !== undefined,
          };
  }
}
//@ chunk-w08rdxhd.js:43735-43801 placement
var LIST_SCOPES = ["org", "user"];
var AUDIENCE_KINDS = ["owner", "users", "org", "public", "other"];
//@ chunk-w08rdxhd.js:43801-43838 placement
function isAudienceKind(kind) {
  return AUDIENCE_KINDS.includes(kind);
}
//@ chunk-w08rdxhd.js:43838-43871 placement
var PUBLIC_AUDIENCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-w08rdxhd.js:43838", () => {
  PUBLIC_AUDIENCES = new Set(["org", "public"]);
});
//@ chunk-w08rdxhd.js:43871-43962 placement
function isSharedWithUser(artifact) {
  return (
    artifact.rel === "shared" &&
    typeof artifact.audience === "string" &&
    !PUBLIC_AUDIENCES.has(artifact.audience)
  );
}
//@ chunk-w08rdxhd.js:43962-44774 placement
/**
 * 类型实例接口的 schema：实例行（slug、标题、描述、创建时间、关系、受众、是否默认/置顶/外部写过、所有者类型）、实例列表、默认实例，以及不可用时的空结果。
 */
var TYPE_INSTANCE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SERVICE_ACCOUNT;
var TYPE_INSTANCES_SCHEMA;
var DEFAULT_INSTANCE_SCHEMA;
var UNAVAILABLE_INSTANCES;
deferInit("chunk-w08rdxhd.js:43962", () => {
  TYPE_INSTANCE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      title: stringSchema().max(2048).optional().catch(undefined),
      description: stringSchema().max(8192).optional().catch(undefined),
      created_at: parseToolOutputSchema({
        offset: true,
      })
        .optional()
        .catch(undefined),
      rel: stringSchema().optional().catch(undefined),
      audience: stringSchema()
        .min(1)
        .transform((kind) => (isAudienceKind(kind) ? kind : "other"))
        .optional()
        .catch(undefined),
      default: _enum(LIST_SCOPES).optional().catch(undefined),
      pinned: literal(true).optional().catch(undefined),
      outsidersMayHaveWritten: literal(true)
        .optional()
        .catch((error) => (isMeaningfulFlag(error.input) ? true : undefined)),
      owner: objectSchema({
        kind: stringSchema().optional().catch(undefined),
      })
        .optional()
        .catch(undefined),
    }),
  );
  SERVICE_ACCOUNT = "service_account";
  TYPE_INSTANCES_SCHEMA = DoctorLazy(() =>
    objectSchema({
      instances: array(unknown()).nullable(),
      next_page_token: stringSchema().optional().catch(undefined),
      default: unknown().optional(),
    }),
  );
  DEFAULT_INSTANCE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      effective: stringSchema().regex(ARTIFACT_SLUG_RE).optional().catch(undefined),
      scope: _enum(LIST_SCOPES).optional().catch(undefined),
    }),
  );
  UNAVAILABLE_INSTANCES = {
    err: null,
    rows: [],
    dropped: 0,
    overflow: false,
    unavailable: true,
  };
});
//@ chunk-w08rdxhd.js:44774-44845 placement
function artifactListOrder(entry) {
  return entry.default !== undefined ? 0 : entry.rel === "mine" ? 1 : isSharedWithUser(entry) ? 2 : 3;
}
//@ chunk-w08rdxhd.js:44845-45127 placement
function recordInstanceKind(ref, kind, scope, scopeArg, out) {
  let kindValue =
    ref.pinned === true
      ? "org_pinned_instance"
      : ref.owner?.kind === SERVICE_ACCOUNT && getAttestationKind(kind) === "first_party_type"
        ? "pipeline_instance"
        : scopeArg
          ? "template_instance"
          : undefined;
  revokeAttestations(
    ref.slug,
    REVOCABLE_INSTANCE_KINDS.filter((otherKind) => otherKind !== kindValue),
    out,
  );
  let any = ARTIFACT_LIST_RELS.some((entry) => entry === ref.rel && (scope === "all" || entry === scope));
  if (kindValue !== undefined && any) markAttestation(ref.slug, kindValue, out);
}
//@ chunk-w08rdxhd.js:45127-48011 placement
async function listTypeInstances(typeSlug, options) {
  if (!ARTIFACT_SLUG_RE.test(typeSlug)) {
    logFeatureBad("artifact_type_instances", "invalid_slug");
    return {
      err: "type_url does not name an Artifact type",
      reason: "invalid_slug",
    };
  }
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(getTypeInstancesPath(typeSlug, options.scope), {
    signal: options.signal,
    maxContentLength: MAX_TYPE_FILE_BYTES,
    feature: "artifact_type_instances",
    credentials: options.credentials,
    httpOnly: options.httpOnly,
  });
  if ("threw" in frameWithRetry)
    return frameWithRetry.oversize
      ? {
          err: "the Artifacts made from this type could not be listed (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : {
          err: "the Artifacts made from this type could not be listed (network error) \u2014 retry",
          reason: "request_error",
        };
  let wire = wireOf(frameWithRetry);
  if (isRelayUnsent(frameWithRetry)) {
    logFeatureSad("artifact_type_instances", "relay_unserved", {
      status: frameWithRetry.status,
      wire,
    });
    return UNAVAILABLE_INSTANCES;
  }
  if (isFrameNotFound(frameWithRetry)) {
    logFeatureSad("artifact_type_instances", "not_found", {
      wire,
    });
    return UNAVAILABLE_INSTANCES;
  }
  if (
    frameWithRetry.ok &&
    frameWithRetry.fromFrame &&
    frameWithRetry.status === 403 &&
    typeof frameWithRetry.data === "string" &&
    frameWithRetry.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  ) {
    logFeatureSad("artifact_type_instances", "ccr_credential_refused", {
      wire,
    });
    return UNAVAILABLE_INSTANCES;
  }
  if (!frameWithRetry.ok || !frameWithRetry.fromFrame || frameWithRetry.status !== 200)
    return describeFrameReadFailure(
      frameWithRetry,
      "artifact_type_instances",
      "the Artifacts made from this type",
    );
  let parsed = TYPE_INSTANCES_SCHEMA().safeParse(frameWithRetry.data);
  if (!parsed.success) {
    logFeatureBad("artifact_type_instances", "malformed_body", {
      wire,
    });
    return {
      err: "the Artifacts made from this type could not be listed (malformed response)",
      reason: "malformed_body",
    };
  }
  let instances = parsed.data.instances ?? [];
  let hasDefault = isPlainObject(parsed.data.default);
  let defaultParsed = hasDefault ? DEFAULT_INSTANCE_SCHEMA().safeParse(parsed.data.default) : undefined;
  let instancesKept = [];
  let dropped = 0;
  for (let [index, raw] of instances.entries()) {
    let parsedInstance = TYPE_INSTANCE_SCHEMA().safeParse(raw);
    if (!parsedInstance.success) {
      if (index < TYPE_INSTANCES_LIMIT) dropped++;
      continue;
    }
    recordInstanceKind(parsedInstance.data, typeSlug, options.scope, hasDefault, now);
    if (index < TYPE_INSTANCES_LIMIT) instancesKept.push(parsedInstance.data);
  }
  if (instances.length > 0 && instancesKept.length === 0) {
    logFeatureBad("artifact_type_instances", "all_rows_dropped", {
      wire,
    });
    return {
      err: "the Artifacts made from this type could not be listed (response rows were unreadable)",
      reason: "all_rows_dropped",
    };
  }
  let slugOfDefault = (kind) => instancesKept.find((instance) => instance.default === kind)?.slug;
  let lower = (
    (defaultParsed?.success ? defaultParsed.data.effective : undefined) ??
    slugOfDefault("user") ??
    slugOfDefault("org")
  )?.toLowerCase();
  let effectiveSlug =
    lower === undefined
      ? undefined
      : ((defaultParsed?.success ? defaultParsed.data.scope : undefined) ??
        instancesKept.find((instance) => instance.slug.toLowerCase() === lower)?.default ??
        "org");
  let defaults = [];
  let sawEffective = false;
  for (let instance of instancesKept) {
    let found = ARTIFACT_LIST_RELS.find((rel) => rel === instance.rel);
    if (found === undefined || (options.scope !== "all" && found !== options.scope)) {
      dropped++;
      continue;
    }
    let isEffective = !sawEffective && instance.slug.toLowerCase() === lower;
    if (isEffective) sawEffective = true;
    let description = singleLineOrUndefined(instance.description, LIST_DESCRIPTION_MAX_RUNES);
    defaults.push({
      url: artifactViewerUrl(instance.slug),
      title: sanitizeDisplayTitle(instance.title ?? "") ?? "Untitled",
      ...(description !== undefined && {
        description,
      }),
      ...(instance.created_at !== undefined && {
        createdAt: instance.created_at,
      }),
      rel: found,
      ...(found === "shared" &&
        instance.audience !== undefined && {
          audience: instance.audience,
        }),
      ...(isEffective &&
        effectiveSlug !== undefined && {
          default: effectiveSlug,
        }),
      ...(found === "mine" &&
        instance.outsidersMayHaveWritten === true && {
          outsidersMayHaveWritten: true,
        }),
    });
  }
  defaults.sort((a, b) => artifactListOrder(a) - artifactListOrder(b) || a.title.localeCompare(b.title));
  let overflow =
    instances.length > TYPE_INSTANCES_LIMIT ||
    (typeof parsed.data.next_page_token === "string" && parsed.data.next_page_token !== "");
  if (dropped > 0)
    logFeatureSad("artifact_type_instances", "rows_dropped", {
      count: dropped,
      wire,
    });
  else
    logFeatureOk("artifact_type_instances", {
      n_instances: defaults.length,
      scope: fromEnum(options.scope),
      curated: hasDefault,
      has_default: defaults.some((instance) => instance.default !== undefined),
      n_shared_with_user: count(defaults, isSharedWithUser),
      overflow,
      wire,
    });
  return {
    err: null,
    rows: defaults,
    dropped,
    overflow,
    unavailable: false,
  };
}
//@ chunk-w08rdxhd.js:48011-48039 placement
/**
 * 类型说明文本的内联上限 20000 字符、服务端行 300 字符与待读时长。
 */
var MAX_INLINE_TYPE_TEXT_CHARS = 20000;
var MAX_SERVER_LINE_CHARS = 300;
var TYPE_INSTRUCTIONS_READ_MS = 1e4;
//@ chunk-w08rdxhd.js:48039-48339 placement
function instructionsWhy(instructions) {
  if (
    instructions.deterministic === "egress-blocked" ||
    /network allowlist blocks|needs outbound HTTPS to/.test(instructions.err)
  )
    return "Artifact files can't be fetched directly from this environment, or the file is not there";
  return scrubArtifactEnvelopeTags(
    scrubServerLine(instructions.err, MAX_SERVER_LINE_CHARS)
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/[[\]]/g, " ")
      .replace(/[.\s]+$/u, ""),
  );
}
//@ chunk-w08rdxhd.js:48339-48898 placement
async function readTypeInstructions(artifact, signal, readSignal, files) {
  let filesArg = files !== undefined && files.length > 0 ? files : undefined;
  if (filesArg !== undefined && !filesArg.includes(TYPE_INSTRUCTIONS_FILE))
    return {
      kind: "none",
    };
  let read = await webfetchReadFile(
    {
      ...artifact,
      file: TYPE_INSTRUCTIONS_FILE,
    },
    signal,
    readSignal,
    "artifact_type_instructions_read",
  );
  if (read.err !== null) {
    if (read.missingFile === true && filesArg === undefined)
      return {
        kind: "none",
      };
    let fetchErrorText = getFetchErrorText(read);
    if (fetchErrorText !== read.err) logForDebugging(`[artifact] type instructions read failed: ${read.err}`);
    return {
      kind: "unavailable",
      why:
        read.missingFile === true
          ? "the file is not on the version of the Artifact that was read"
          : instructionsWhy({
              ...read,
              err: fetchErrorText,
            }),
      known: filesArg !== undefined,
    };
  }
  if (read.html.trim() === "")
    return {
      kind: "none",
    };
  return instructionsFromText(read.html, filesArg !== undefined);
}
//@ chunk-w08rdxhd.js:48898-49034 placement
function instructionsFromText(text, fromType) {
  let pageText = extractPageText(stripControlChars(text));
  let length = Array.from(pageText).length;
  let tooLong = length > MAX_INLINE_TYPE_TEXT_CHARS;
  return {
    kind: "read",
    text: tooLong ? extractPageText(truncateCodePoints(pageText, MAX_INLINE_TYPE_TEXT_CHARS)) : pageText,
    chars: length,
    clipped: tooLong,
    fromType,
  };
}
//@ chunk-w08rdxhd.js:49034-49644 placement
function renderTypeInstructions(read, includesFile) {
  switch (read.kind) {
    case "none":
      return "";
    case "unavailable":
      return read.known
        ? `

[This Artifact's type ships an instructions file (${TYPE_INSTRUCTIONS_FILE}) describing the content its page expects, but it could not be read here: ${read.why}. If what it expects isn't clear from the file names, ask the user before writing data to it.]`
        : `

[Could not check whether this Artifact carries its type's instructions file (${TYPE_INSTRUCTIONS_FILE}): ${read.why}.]`;
    case "read":
      return `

${ARTIFACT_CONTENT_AUTHORED_TAG}
${buildSpellingNoteForText(read.text)}${includesFile ?? (read.fromType ? ARTIFACT_INSTRUCTIONS_BELOW_PUBLISHER : ARTIFACT_INSTRUCTIONS_BELOW_FOUND)}
<${ARTIFACT_TYPE_INSTRUCTIONS}>
${read.text}${
        read.clipped
          ? `
[\u2026clipped at ${MAX_INLINE_TYPE_TEXT_CHARS} of ${read.chars} characters]`
          : ""
      }
</${ARTIFACT_TYPE_INSTRUCTIONS}>

${ARTIFACT_INSTRUCTIONS_ABOVE_THIRD_PARTY}${replRouteSection(read.text)}`;
  }
}
//@ chunk-w08rdxhd.js:49644-49656 placement
var MAX_FRONTMATTER_CHARS = 2048;
//@ chunk-w08rdxhd.js:49656-49827 placement
function instructionsTypeKey(text) {
  let match = /^\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
    truncateCodePoints(text, MAX_FRONTMATTER_CHARS),
  );
  if (match === null) return;
  return /^name:[ \t]*["']?([A-Za-z0-9_-]+)["']?[ \t]*$/m.exec(match[1])?.[1];
}
//@ chunk-w08rdxhd.js:49827-50069 placement
function replRouteSection(text) {
  {
    let { artifactReplToolPresent } = require("../../tools/ArtifactTool/promptText.js");
    if (!artifactReplToolPresent()) return "";
    let {
      REPL_ROUTE_SECTION_BY_TYPE_KEY,
    } = require("../../tools/ArtifactTool/REPL_ROUTE_HOW_TO_BY_TYPE_KEY.lazy.js");
    let typeKey = instructionsTypeKey(text);
    let route = typeKey === undefined ? undefined : REPL_ROUTE_SECTION_BY_TYPE_KEY.get(typeKey);
    return route === undefined
      ? ""
      : `

${route}`;
  }
  return "";
}
//@ chunk-w08rdxhd.js:50069-50308 placement
function replRouteTwoSteps(text) {
  {
    let { artifactReplToolPresent } = require("../../tools/ArtifactTool/promptText.js");
    if (!artifactReplToolPresent()) return null;
    let {
      REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY,
    } = require("../../tools/ArtifactTool/REPL_ROUTE_HOW_TO_BY_TYPE_KEY.lazy.js");
    let typeKey = instructionsTypeKey(text);
    if (typeKey === undefined) return null;
    return REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY.get(typeKey) ?? null;
  }
  return null;
}
//@ chunk-w08rdxhd.js:50308-50407 placement
function typeCatalogOnForSession() {
  let frozenArtifactTypes = getLiveState().frozenArtifactTypes;
  return frozenArtifactTypes !== undefined
    ? frozenArtifactTypes.typeCatalogOn
    : artifactTypesEnabled() && isFrameMultiFileEnabled() && isArtifactTypeCatalogEnabled();
}
//@ chunk-w08rdxhd.js:50407-50511 placement
function quickstartOnForSession() {
  let frozenArtifactTypes = getLiveState().frozenArtifactTypes;
  return frozenArtifactTypes !== undefined
    ? frozenArtifactTypes.quickstartOn === true
    : typeCatalogOnForSession() && canCreateFromType() && isArtifactQuickstartEnabled();
}
//@ chunk-w08rdxhd.js:50511-50785 placement
async function typeInstructionsForRead(artifact, signal, readSignal) {
  if (!typeCatalogOnForSession()) return null;
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: TYPE_INSTRUCTIONS_READ_MS,
    refTimer: true,
  });
  try {
    return await readTypeInstructions(artifact, combinedAbortSignal.signal, readSignal);
  } catch (error) {
    if (signal.aborted || !combinedAbortSignal.signal.aborted) throw error;
    return {
      kind: "unavailable",
      why: "reading the instructions took too long",
      known: false,
    };
  } finally {
    combinedAbortSignal.cleanup();
  }
}
export {
  describeArtifactType,
  typeNameWithoutQuotes,
  readTypeInstructions,
  listArtifactTypes,
  typeCatalogOnForSession,
  renderTypeInstructions,
  replRouteTwoSteps,
  replRouteSection,
  TYPE_INSTRUCTIONS_FILE,
  instructionsTypeKey,
  typeInstructionsForRead,
  listTypeInstances,
  typeNameMatchKey,
  isSharedWithUser,
  LIST_DESCRIPTION_MAX_RUNES,
  typesNamed,
  TYPE_INSTRUCTIONS_READ_MS,
  isKnownTier,
  typeRowTitle,
  typeRowDescription,
  typeNameKey,
  findArtifactTypeByName,
  typeTitleMatchKeys,
  readTypeOwnInstructions,
  readArtifactTypeFile,
  TYPE_DESCRIBE_UNAVAILABLE_MESSAGE,
  CAPABILITY_NAMES_MAX,
  DETAIL_DESCRIPTION_MAX_RUNES,
  instructionsWhy,
  instructionsFromText,
  isArtifactTypeCatalogEnabled,
  isArtifactQuickstartEnabled,
  quickstartOnForSession,
};
