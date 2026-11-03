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
import { u, array, unknown, string, M, E, _enum, literal } from "../../../vendor/zod/v4/classic/schemas.js";
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
function getTypesListPath(query, r = false) {
  let s = [
    ...(r ? [`scopes=${ANTHROPIC}`] : []),
    ...(query === undefined || query === "" ? [] : [`q=${encodeURIComponent(query)}`]),
  ];
  return s.length === 0 ? "/api/frame/types" : `/api/frame/types?${s.join("&")}`;
}
//@ chunk-w08rdxhd.js:28636-28701 placement
function typeApiPath(e) {
  return `/api/frame/types/${encodeURIComponent(e)}`;
}
//@ chunk-w08rdxhd.js:28701-28816 placement
function getTypeInstancesPath(e, scope) {
  return `/api/frame/types/${encodeURIComponent(e)}/instances?limit=${TYPE_INSTANCES_LIMIT}${scope === "all" ? "" : `&rel=${scope}`}`;
}
//@ chunk-w08rdxhd.js:28816-28947 placement
function getTypeFilePath(e, r) {
  return `/api/frame/types/${encodeURIComponent(e)}/files/${r
    .split("/")
    .map((s) => encodeURIComponent(s))
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
  return TYPE_TIER_ORDER.some((r) => r === tier);
}
//@ chunk-w08rdxhd.js:29100-29991 placement
/**
 * 类型目录接口的响应 schema：类型列表、类型条目的 listing（scope/tier）、类型摘要、类型详情（文件、能力、可创建）、类型文件条目与文件内容；以及描述不可用的提示与类型说明文件名 SKILL.md。
 */
var TYPES_LIST_SCHEMA = DoctorLazy(() =>
  u({
    types: array(unknown()).nullable(),
    next_page_token: string().optional().catch(undefined),
  }),
);
var TYPE_LISTING_SCHEMA = DoctorLazy(() =>
  u({
    scope: string().optional().catch(undefined),
    tier: string().optional().catch(undefined),
  }),
);
var TYPE_SUMMARY_SCHEMA = DoctorLazy(() =>
  u({
    slug: string().regex(ARTIFACT_SLUG_RE),
    title: string().max(2048).optional().catch(undefined),
    description: string().max(8192).optional().catch(undefined),
    listings: array(unknown()).optional().catch(undefined),
    release: u({
      version: string().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
  }),
);
var TYPE_DETAIL_SCHEMA = DoctorLazy(() =>
  TYPE_SUMMARY_SCHEMA().extend({
    files: array(unknown()).optional().catch(undefined),
    capabilities: unknown().optional(),
    creatable: M().optional().catch(undefined),
  }),
);
var TYPE_FILE_ENTRY_SCHEMA = DoctorLazy(() =>
  u({
    path: string().min(1).max(512),
    size: E().int().min(0).optional().catch(undefined),
    content_type: string().max(128).optional().catch(undefined),
  }),
);
var TYPE_FILE_TEXT_SCHEMA = DoctorLazy(() =>
  u({
    path: string(),
    chars: E().int().min(0).optional().catch(undefined),
    truncated: M().optional().catch(undefined),
    text: string(),
  }),
);
var TYPE_DESCRIBE_UNAVAILABLE_MESSAGE = "describing an Artifact type is not available in this session";
var TYPE_INSTRUCTIONS_FILE = "SKILL.md";
//@ chunk-w08rdxhd.js:29991-30050 placement
function singleLineOrUndefined(description, r) {
  return description === undefined ? undefined : (truncateSingleLine(description, r) ?? undefined);
}
//@ chunk-w08rdxhd.js:30050-30266 placement
function getBestAnthropicTier(listings) {
  let r;
  for (let s of listings ?? []) {
    let n = TYPE_LISTING_SCHEMA().safeParse(s);
    if (!n.success || n.data.scope !== ANTHROPIC || !isKnownTier(n.data.tier)) continue;
    let index = TYPE_TIER_ORDER.indexOf(n.data.tier);
    r = r === undefined ? index : Math.min(r, index);
  }
  return r === undefined ? undefined : TYPE_TIER_ORDER[r];
}
//@ chunk-w08rdxhd.js:30266-30368 placement
function isAnthropicListed(listings) {
  return (listings ?? []).some((r) => {
    let s = TYPE_LISTING_SCHEMA().safeParse(r);
    return s.success && s.data.scope === ANTHROPIC;
  });
}
//@ chunk-w08rdxhd.js:30368-30459 placement
function updateFirstPartyAttestation(slug, listings, s) {
  if (isAnthropicListed(listings)) markAttestation(slug, "first_party_type", s);
  else revokeAttestations(slug, ["first_party_type"], s);
}
//@ chunk-w08rdxhd.js:30459-30726 placement
function toTypeSummaryRow(e, r) {
  let bestAnthropicTier = getBestAnthropicTier(e.listings);
  let n = singleLineOrUndefined(e.description, r);
  let version = e.release?.version;
  let l = sanitizeDisplayTitle(e.title ?? "");
  return {
    typeUrl: artifactViewerUrl(e.slug),
    title: l ?? "Untitled",
    ...(l === null && {
      untitled: true,
    }),
    ...(n !== undefined && {
      description: n,
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
      let h =
        typeof retryAfter === "string"
          ? Math.min(parseRetryAfterMs(retryAfter) ?? 1000, 5000)
          : 300 + Math.random() * 500;
      await sleep(h, options.signal, {
        throwOnAbort: true,
      });
      continue;
    }
    return response;
  }
}
//@ chunk-w08rdxhd.js:31709-31774 placement
var TYPE_CATALOG_FEATURES = new Set(["artifact_type_list", "artifact_type_instances"]);
//@ chunk-w08rdxhd.js:31774-32601 placement
/**
 * 把类型目录请求的失败（未认证、中继错误、403 被策略拒绝、429、503、其他 HTTP 错误）转成给模型的错误文字并打点，返回 {err, reason}。
 */
function describeFrameReadFailure(response, feature, what) {
  let fail = (a, err) => {
    logFeatureBad(feature, a, {
      ...(response.ok && {
        status: response.status,
      }),
      ...(TYPE_CATALOG_FEATURES.has(feature) && {
        wire: wireOf(response),
      }),
    });
    return {
      err,
      reason: a,
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
    let a = denyPolicyBody(response.data);
    return fail(
      a ? "denied" : "forbidden",
      `${what}: not available to this session (${a ? errBody(a.error) : errBody(response.data)}) \u2014 nothing to retry`,
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
async function listArtifactTypes(e) {
  let r = e.firstParty === true;
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(getTypesListPath(e.query, r), {
    signal: e.signal,
    maxContentLength: MAX_TYPE_FILE_BYTES,
    feature: "artifact_type_list",
    credentials: e.credentials,
    httpOnly: e.httpOnly,
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
    let R = describeFrameReadFailure(frameWithRetry, "artifact_type_list", "the Artifact type listing");
    return frameWithRetry.ok &&
      frameWithRetry.fromFrame &&
      frameWithRetry.status === 403 &&
      typeof frameWithRetry.data === "string" &&
      frameWithRetry.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? {
          ...R,
          reason: "ccr_credential_refused",
        }
      : R;
  }
  let l = TYPES_LIST_SCHEMA().safeParse(frameWithRetry.data);
  if (!l.success) {
    logFeatureBad("artifact_type_list", "malformed_body", {
      wire,
    });
    return {
      err: "the Artifact type listing could not be read (malformed response)",
      reason: "malformed_body",
    };
  }
  let types = l.data.types ?? [];
  let mapped = types.map((type) => {
    let L = TYPE_SUMMARY_SCHEMA().safeParse(type);
    return L.success ? L.data : undefined;
  });
  for (let R of mapped) if (R !== undefined) updateFirstPartyAttestation(R.slug, R.listings, now);
  let x = [];
  let w = 0;
  let k = 0;
  for (let R of mapped) {
    if (x.length >= TYPE_INSTANCES_LIMIT) break;
    if (R === undefined) {
      w++;
      continue;
    }
    let L = isAnthropicListed(R.listings);
    if (r && !L) {
      if (R.listings === undefined) w++;
      else k++;
      continue;
    }
    x.push(toTypeSummaryRow(R, LIST_DESCRIPTION_MAX_RUNES));
  }
  if (types.length > k && x.length === 0) {
    logFeatureBad("artifact_type_list", "all_rows_dropped", {
      wire,
    });
    return {
      err: "the Artifact type listing could not be read (response rows were unreadable)",
      reason: "all_rows_dropped",
    };
  }
  let more =
    x.length + w + k < types.length ||
    (typeof l.data.next_page_token === "string" && l.data.next_page_token !== "");
  if (w > 0)
    logFeatureSad("artifact_type_list", "rows_dropped", {
      count: w,
      wire,
    });
  else
    logFeatureOk("artifact_type_list", {
      n_types: x.length,
      queried: e.query !== undefined && e.query !== "",
      more,
      wire,
    });
  return {
    err: null,
    rows: x,
    dropped: w,
    more,
    unavailable: false,
  };
}
//@ chunk-w08rdxhd.js:34592-34695 placement
/**
 * 弯引号与各种短横线的替换正则，用于清洗类型目录文本。
 */
var regExp = new RegExp(`[${TAG_BRACKET_CLASSES.open}${TAG_BRACKET_CLASSES.close}]`, "gu");
var DASH_VARIANT_RE = /[\u2012-\u2015\u2E3A\u2E3B\uFE31\uFE32\uFE58]/gu;
//@ chunk-w08rdxhd.js:34695-34877 placement
function typeRowTitle(e) {
  return scrubArtifactLinks(
    normalizeQuotes(e.replaceAll('"', "'"))
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
function confusableWordPattern(e) {
  return [...e]
    .map((r) =>
      r === "l"
        ? `[${latinLetterConfusableClass("l")}I1|\u01C0]\\p{M}*`
        : `[${latinLetterConfusableClass(r)}]\\p{M}*`,
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
    let s = `(?:[\\s\\p{Cf}\\p{M}]*[${CONNECTOR_CHAR_CLASS}/${COLON_CHAR_CLASS}][\\s\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*[${TYPE_URL_SEPARATORS}][\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*)`;
    typeUrlLabelRegex = new RegExp(
      `(?<![A-Za-z0-9_])${confusableWordPattern("type")}${s}${confusableWordPattern("url")}(?![A-Za-z0-9_])(?=\\s*[${COLON_CHAR_CLASS}\\u1361\\u1365\\u1804\\uA6F4\\u2E35\\u0903\\u0F7F])`,
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
      confusable: [..."abcdefghijklmnopqrstuvwxyz"].map((s) => [
        s,
        new RegExp(`^[${latinLetterConfusableClass(s)}]$`, "u"),
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
  let S = [];
  chars.forEach((char, d) => {
    let normalized = char.normalize("NFKC");
    let matches = /^[A-Za-z]\p{M}+$/u.test(char.normalize("NFD"));
    let N = /^\s$/u.test(char)
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
                : (confusable.find(([, O]) => O.test(char))?.[0] ?? ".");
    for (let O of N) {
      folded += O;
      indexMap.push(d);
      S.push(!ALNUM_CHAR_RE.test(char) && !matches);
    }
  });
  let x = new Set();
  let w = (y, d) => {
    for (let z = y; z < y + d; z++) x.add(indexMap[z]);
  };
  for (let mark of marks) for (let d of folded.matchAll(mark)) w(d.index, d[0].length);
  let k = BASE58_UUID_LENGTH;
  for (let j = 0; j + k <= folded.length; j++) {
    let sliced = folded.slice(j, j + k);
    let z = indexMap[j];
    let C = indexMap[j + k - 1];
    if (
      ![...sliced].every((N) => BASE58_CHAR_RE.test(N)) ||
      indexMap[j - 1] === z ||
      indexMap[j + k] === C ||
      ALNUM_CHAR_RE.test(chars[z - 1] ?? "") ||
      ALNUM_CHAR_RE.test(chars[C + 1] ?? "")
    )
      continue;
    if (S.slice(j, j + k).some(Boolean) || decodeBase58Uuid(sliced) !== null) w(j, k);
  }
  if (x.size === 0) return text;
  let I = "";
  let R = "";
  let L = false;
  chars.forEach((char, d) => {
    if (/^\s$/u.test(char)) {
      I += (L ? "(link removed)" : R) + char;
      R = "";
      L = false;
    } else {
      R += char;
      L ||= x.has(d);
    }
  });
  return I + (L ? "(link removed)" : R);
}
//@ chunk-w08rdxhd.js:36759-36925 placement
function typeRowDescription(e) {
  return scrubArtifactLinks(
    normalizeQuotes(e.replaceAll('"', "'"))
      .replaceAll("\\", " ")
      .replace(regExp, " ")
      .replace(DECISION_SURFACE_BRACKETS_RE, " "),
  )
    .replace(getTypeUrlLabelRegex(), "(label removed)")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-w08rdxhd.js:36925-37047 placement
function typeNameKey(e) {
  return typeRowTitle(e)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{Z}\p{Cc}\p{Cf}\p{Pd}_\u2212]+/gu, " ")
    .trim();
}
//@ chunk-w08rdxhd.js:37047-37131 placement
var QUOTE_HOMOGLYPH_CLASS = `"${QUOTE_HOMOGLYPHS.source.slice(1, -1)}`;
var QUOTED_TEXT_RE = new RegExp(`^[${QUOTE_HOMOGLYPH_CLASS}]([\\s\\S]*)[${QUOTE_HOMOGLYPH_CLASS}]$`, "u");
//@ chunk-w08rdxhd.js:37131-37180 placement
function typeNameWithoutQuotes(e) {
  return e.trim().replace(QUOTED_TEXT_RE, "$1");
}
//@ chunk-w08rdxhd.js:37180-37243 placement
var MIN_TYPE_NAME_CHARS = 3;
var isLongEnoughName = (e) => [...e].length >= MIN_TYPE_NAME_CHARS;
var normalizeSpaces = (e) => e.replaceAll(" ", "");
//@ chunk-w08rdxhd.js:37243-37281 placement
function typeNameMatchKey(e) {
  return normalizeSpaces(typeNameKey(typeNameWithoutQuotes(e)));
}
//@ chunk-w08rdxhd.js:37281-37326 placement
function typeTitleMatchKeys(e) {
  return uniq([normalizeSpaces(typeNameKey(e)), typeNameMatchKey(e)]);
}
//@ chunk-w08rdxhd.js:37326-37891 placement
function typesNamed(e, r) {
  let s = typeNameKey(typeNameWithoutQuotes(r));
  if (s === "")
    return {
      named: [],
      exact: false,
    };
  let n = typeNameMatchKey(r);
  let a = normalizeSpaces(typeNameKey(r));
  let l = false;
  let h = [];
  let S = [];
  let x = [];
  for (let R of e) {
    let L = R.untitled ? "" : typeNameKey(R.title);
    if (L === "") continue;
    let y = normalizeSpaces(L);
    if (y === n) {
      l = true;
      h.push(R);
      continue;
    }
    let d = y === a;
    if (d) h.push(R);
    if (isLongEnoughName(y) && n.includes(y)) S.push(R);
    else if (d || (isLongEnoughName(n) && L.includes(s))) x.push(R);
  }
  if (l)
    return {
      named: h,
      exact: true,
    };
  let w = [...S, ...x];
  if (w.length < 2 || x.length > 0)
    return {
      named: w,
      exact: false,
    };
  let mapped = S.map((R) => normalizeSpaces(typeNameKey(R.title)));
  let filtered = S.filter((R, L) => mapped.every((y, d) => d === L || mapped[L].includes(y)));
  return {
    named: filtered.length === 1 ? filtered : w,
    exact: false,
  };
}
//@ chunk-w08rdxhd.js:37891-38365 placement
async function findArtifactTypeByName(e, r) {
  let s = await listArtifactTypes({
    ...r,
    firstParty: true,
  });
  if (s.err !== null && s.reason !== "ccr_credential_refused")
    return {
      err: s.err,
      reason: `name_${s.reason}`,
    };
  if (s.err !== null || s.unavailable)
    return {
      err: null,
      found: undefined,
      unavailable: true,
    };
  let n = s.more || s.dropped > 0 || s.rows.some((h) => h.untitled);
  let { named, exact } = typesNamed(s.rows, e);
  return named.length === 1 && named[0] !== undefined && (exact || !n)
    ? {
        err: null,
        found: named[0],
        exact,
      }
    : {
        err: null,
        found: undefined,
        named: named.length > 1 ? named : [],
        listed: s.rows.length,
        partial: n,
      };
}
//@ chunk-w08rdxhd.js:38365-38638 placement
var TYPE_NOT_FOUND_MESSAGE_2 =
  "Artifact type not found in this account's catalog \u2014 check the link (use a `type_url` from action \"list_types\"); a type that exists but isn't listed for this account, a single-file page, or the catalog not being available to this account all answer this way";
//@ chunk-w08rdxhd.js:38638-40526 placement
async function describeArtifactType(e, r) {
  if (!ARTIFACT_SLUG_RE.test(e)) {
    logFeatureBad("artifact_type_describe", "invalid_slug");
    return {
      err: "type_url does not name an Artifact type",
      reason: "invalid_slug",
    };
  }
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(typeApiPath(e), {
    signal: r.signal,
    maxContentLength: TYPE_DESCRIBE_MAX_BYTES,
    feature: "artifact_type_describe",
    credentials: r.credentials,
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
    let I = describeFrameReadFailure(frameWithRetry, "artifact_type_describe", "the Artifact type");
    return frameWithRetry.ok &&
      frameWithRetry.fromFrame &&
      frameWithRetry.status === 403 &&
      typeof frameWithRetry.data === "string" &&
      frameWithRetry.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? {
          ...I,
          reason: "ccr_credential_refused",
        }
      : I;
  }
  let a = TYPE_DETAIL_SCHEMA().safeParse(frameWithRetry.data);
  if (!a.success || a.data.slug !== e) {
    logFeatureBad("artifact_type_describe", "malformed_body");
    return {
      err: "the Artifact type could not be read (malformed response)",
      reason: "malformed_body",
    };
  }
  let l = a.data;
  updateFirstPartyAttestation(l.slug, l.listings, now);
  let h = [];
  let files = l.files ?? [];
  for (let file of files.slice(0, MAX_TYPE_FILE_ENTRIES)) {
    let R = TYPE_FILE_ENTRY_SCHEMA().safeParse(file);
    if (R.success && isSafeDisplayName(R.data.path)) h.push(R.data.path);
  }
  let filesOmitted = files.length - h.length;
  let w = l.capabilities == null ? undefined : isPlainObject(l.capabilities) ? l.capabilities : "malformed";
  let sliced = Object.keys(w !== undefined && w !== "malformed" ? w : {})
    .filter((key) => CAPABILITY_NAME_REGEX.test(key))
    .sort()
    .slice(0, CAPABILITY_NAMES_MAX);
  logFeatureOk("artifact_type_describe", {
    n_files: h.length,
    n_capabilities: sliced.length,
    ships_instructions: h.includes(TYPE_INSTRUCTIONS_FILE),
    ...(l.creatable !== undefined && {
      creatable: l.creatable,
    }),
  });
  return {
    err: null,
    detail: {
      ...toTypeSummaryRow(l, DETAIL_DESCRIPTION_MAX_RUNES),
      files: h,
      filesOmitted,
      shipsInstructions: h.includes(TYPE_INSTRUCTIONS_FILE),
      firstParty: isAnthropicListed(l.listings),
      capabilities: sliced,
      ...(w !== undefined && {
        declaration: w,
      }),
      ...(l.creatable !== undefined && {
        creatable: l.creatable,
      }),
    },
  };
}
//@ chunk-w08rdxhd.js:40526-40535 placement
var MAX_PATH_SEGMENTS = 5;
//@ chunk-w08rdxhd.js:40535-42679 placement
async function readArtifactTypeFile(slug, r, s) {
  if (!ARTIFACT_SLUG_RE.test(slug)) {
    logFeatureBad("artifact_type_file_read", "invalid_slug");
    return {
      kind: "unavailable",
      why: "the link does not name an Artifact type \u2014 nothing to retry",
      reason: "invalid_slug",
    };
  }
  let n = validateReadPath(r);
  if ("errMsg" in n || n.key !== r) {
    logFeatureSad("artifact_type_file_read", "invalid_path");
    return {
      kind: "withheld",
    };
  }
  if (countCharInString(r, "/") + 1 > MAX_PATH_SEGMENTS) {
    logFeatureSad("artifact_type_file_read", "too_deep");
    return {
      kind: "withheld",
    };
  }
  let a;
  try {
    a = await frameApi.getRelayBound(getTypeFilePath(slug, r), {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: TYPE_LISTING_MAX_BYTES,
      signal: s.signal,
      credentials: s.credentials,
    });
  } catch (error) {
    if (isCancel(error) || s.signal.aborted) throw error;
    let k = isMaxContentLengthError(error);
    logFeatureBad("artifact_type_file_read", k ? "oversize_body" : "request_error");
    return k
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
  if (isRelayUnsent(a)) {
    logFeatureSad("artifact_type_file_read", "relay_unserved", {
      status: a.status,
    });
    return {
      kind: "withheld",
    };
  }
  if (!a.ok) {
    let { reason } = describeFrameReadFailure(a, "artifact_type_file_read", "the type file");
    return {
      kind: "unavailable",
      why: catalogErrorMessage(reason),
      reason,
    };
  }
  if (isFrameNotFound(a)) {
    logFeatureSad("artifact_type_file_read", "withheld", {
      relay: a.route === "relay",
    });
    return {
      kind: "withheld",
    };
  }
  if (
    a.ok &&
    a.fromFrame &&
    a.status === 403 &&
    typeof a.data === "string" &&
    a.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  ) {
    logFeatureSad("artifact_type_file_read", "ccr_credential_refused");
    return {
      kind: "withheld",
    };
  }
  if (a.ok && a.fromFrame && a.status === 415) {
    logFeatureSad("artifact_type_file_read", "not_text");
    return {
      kind: "not_text",
    };
  }
  if (a.ok && a.fromFrame && a.status === 413) {
    logFeatureSad("artifact_type_file_read", "too_large");
    return {
      kind: "too_large",
    };
  }
  if (!a.fromFrame || a.status !== 200) {
    let { reason } = describeFrameReadFailure(a, "artifact_type_file_read", "the type file");
    return {
      kind: "unavailable",
      why: catalogErrorMessage(reason),
      reason,
    };
  }
  let l = TYPE_FILE_TEXT_SCHEMA().safeParse(a.data);
  if (!l.success || l.data.path !== r) {
    logFeatureBad("artifact_type_file_read", "malformed_body");
    return {
      kind: "unavailable",
      why: "the answer was malformed \u2014 nothing to retry",
      reason: "malformed_body",
    };
  }
  let h = instructionsFromText(l.data.text, true);
  let clipped = h.clipped || l.data.truncated === true;
  let chars = Math.max(h.chars, l.data.chars ?? 0);
  logFeatureOk("artifact_type_file_read", {
    chars,
    clipped,
    relay: a.route === "relay",
  });
  return {
    kind: "read",
    text: h.text,
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
async function readTypeOwnInstructions(e, signal, credentials, files, a) {
  let l = files !== undefined && files.length > 0 ? files : undefined;
  if (l !== undefined && !l.includes(TYPE_INSTRUCTIONS_FILE))
    return {
      kind: "none",
    };
  let artifactTypeFile = await readArtifactTypeFile(e.slug, TYPE_INSTRUCTIONS_FILE, {
    signal,
    credentials,
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
      return a
        ? readTypeInstructions(e, signal, credentials, files)
        : {
            kind: "unavailable",
            why:
              artifactTypeFile.kind === "withheld"
                ? "the type catalog does not serve it to this session yet"
                : artifactTypeFile.why,
            known: l !== undefined,
          };
  }
}
//@ chunk-w08rdxhd.js:43735-43801 placement
var LIST_SCOPES = ["org", "user"];
var AUDIENCE_KINDS = ["owner", "users", "org", "public", "other"];
//@ chunk-w08rdxhd.js:43801-43838 placement
function isAudienceKind(e) {
  return AUDIENCE_KINDS.includes(e);
}
//@ chunk-w08rdxhd.js:43838-43871 placement
var PUBLIC_AUDIENCES = new Set(["org", "public"]);
//@ chunk-w08rdxhd.js:43871-43962 placement
function isSharedWithUser(e) {
  return e.rel === "shared" && typeof e.audience === "string" && !PUBLIC_AUDIENCES.has(e.audience);
}
//@ chunk-w08rdxhd.js:43962-44774 placement
/**
 * 类型实例接口的 schema：实例行（slug、标题、描述、创建时间、关系、受众、是否默认/置顶/外部写过、所有者类型）、实例列表、默认实例，以及不可用时的空结果。
 */
var TYPE_INSTANCE_SCHEMA = DoctorLazy(() =>
  u({
    slug: string().regex(ARTIFACT_SLUG_RE),
    title: string().max(2048).optional().catch(undefined),
    description: string().max(8192).optional().catch(undefined),
    created_at: parseToolOutputSchema({
      offset: true,
    })
      .optional()
      .catch(undefined),
    rel: string().optional().catch(undefined),
    audience: string()
      .min(1)
      .transform((e) => (isAudienceKind(e) ? e : "other"))
      .optional()
      .catch(undefined),
    default: _enum(LIST_SCOPES).optional().catch(undefined),
    pinned: literal(true).optional().catch(undefined),
    outsidersMayHaveWritten: literal(true)
      .optional()
      .catch((error) => (isMeaningfulFlag(error.input) ? true : undefined)),
    owner: u({
      kind: string().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
  }),
);
var SERVICE_ACCOUNT = "service_account";
var TYPE_INSTANCES_SCHEMA = DoctorLazy(() =>
  u({
    instances: array(unknown()).nullable(),
    next_page_token: string().optional().catch(undefined),
    default: unknown().optional(),
  }),
);
var DEFAULT_INSTANCE_SCHEMA = DoctorLazy(() =>
  u({
    effective: string().regex(ARTIFACT_SLUG_RE).optional().catch(undefined),
    scope: _enum(LIST_SCOPES).optional().catch(undefined),
  }),
);
var UNAVAILABLE_INSTANCES = {
  err: null,
  rows: [],
  dropped: 0,
  overflow: false,
  unavailable: true,
};
//@ chunk-w08rdxhd.js:44774-44845 placement
function artifactListOrder(e) {
  return e.default !== undefined ? 0 : e.rel === "mine" ? 1 : isSharedWithUser(e) ? 2 : 3;
}
//@ chunk-w08rdxhd.js:44845-45127 placement
function recordInstanceKind(e, r, scope, n, a) {
  let l =
    e.pinned === true
      ? "org_pinned_instance"
      : e.owner?.kind === SERVICE_ACCOUNT && getAttestationKind(r) === "first_party_type"
        ? "pipeline_instance"
        : n
          ? "template_instance"
          : undefined;
  revokeAttestations(
    e.slug,
    REVOCABLE_INSTANCE_KINDS.filter((S) => S !== l),
    a,
  );
  let any = ARTIFACT_LIST_RELS.some((S) => S === e.rel && (scope === "all" || S === scope));
  if (l !== undefined && any) markAttestation(e.slug, l, a);
}
//@ chunk-w08rdxhd.js:45127-48011 placement
async function listTypeInstances(e, r) {
  if (!ARTIFACT_SLUG_RE.test(e)) {
    logFeatureBad("artifact_type_instances", "invalid_slug");
    return {
      err: "type_url does not name an Artifact type",
      reason: "invalid_slug",
    };
  }
  let now = Date.now();
  let frameWithRetry = await fetchFrameWithRetry(getTypeInstancesPath(e, r.scope), {
    signal: r.signal,
    maxContentLength: MAX_TYPE_FILE_BYTES,
    feature: "artifact_type_instances",
    credentials: r.credentials,
    httpOnly: r.httpOnly,
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
  let l = TYPE_INSTANCES_SCHEMA().safeParse(frameWithRetry.data);
  if (!l.success) {
    logFeatureBad("artifact_type_instances", "malformed_body", {
      wire,
    });
    return {
      err: "the Artifacts made from this type could not be listed (malformed response)",
      reason: "malformed_body",
    };
  }
  let instances = l.data.instances ?? [];
  let S = isPlainObject(l.data.default);
  let x = S ? DEFAULT_INSTANCE_SCHEMA().safeParse(l.data.default) : undefined;
  let w = [];
  let k = 0;
  for (let [C, N] of instances.entries()) {
    let O = TYPE_INSTANCE_SCHEMA().safeParse(N);
    if (!O.success) {
      if (C < TYPE_INSTANCES_LIMIT) k++;
      continue;
    }
    recordInstanceKind(O.data, e, r.scope, S, now);
    if (C < TYPE_INSTANCES_LIMIT) w.push(O.data);
  }
  if (instances.length > 0 && w.length === 0) {
    logFeatureBad("artifact_type_instances", "all_rows_dropped", {
      wire,
    });
    return {
      err: "the Artifacts made from this type could not be listed (response rows were unreadable)",
      reason: "all_rows_dropped",
    };
  }
  let I = (C) => w.find((N) => N.default === C)?.slug;
  let lower = ((x?.success ? x.data.effective : undefined) ?? I("user") ?? I("org"))?.toLowerCase();
  let L =
    lower === undefined
      ? undefined
      : ((x?.success ? x.data.scope : undefined) ??
        w.find((C) => C.slug.toLowerCase() === lower)?.default ??
        "org");
  let y = [];
  let d = false;
  for (let C of w) {
    let found = ARTIFACT_LIST_RELS.find((X) => X === C.rel);
    if (found === undefined || (r.scope !== "all" && found !== r.scope)) {
      k++;
      continue;
    }
    let O = !d && C.slug.toLowerCase() === lower;
    if (O) d = true;
    let Y = singleLineOrUndefined(C.description, LIST_DESCRIPTION_MAX_RUNES);
    y.push({
      url: artifactViewerUrl(C.slug),
      title: sanitizeDisplayTitle(C.title ?? "") ?? "Untitled",
      ...(Y !== undefined && {
        description: Y,
      }),
      ...(C.created_at !== undefined && {
        createdAt: C.created_at,
      }),
      rel: found,
      ...(found === "shared" &&
        C.audience !== undefined && {
          audience: C.audience,
        }),
      ...(O &&
        L !== undefined && {
          default: L,
        }),
      ...(found === "mine" &&
        C.outsidersMayHaveWritten === true && {
          outsidersMayHaveWritten: true,
        }),
    });
  }
  y.sort((C, N) => artifactListOrder(C) - artifactListOrder(N) || C.title.localeCompare(N.title));
  let overflow =
    instances.length > TYPE_INSTANCES_LIMIT ||
    (typeof l.data.next_page_token === "string" && l.data.next_page_token !== "");
  if (k > 0)
    logFeatureSad("artifact_type_instances", "rows_dropped", {
      count: k,
      wire,
    });
  else
    logFeatureOk("artifact_type_instances", {
      n_instances: y.length,
      scope: fromEnum(r.scope),
      curated: S,
      has_default: y.some((C) => C.default !== undefined),
      n_shared_with_user: count(y, isSharedWithUser),
      overflow,
      wire,
    });
  return {
    err: null,
    rows: y,
    dropped: k,
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
function instructionsWhy(e) {
  if (e.deterministic === "egress-blocked" || /network allowlist blocks|needs outbound HTTPS to/.test(e.err))
    return "Artifact files can't be fetched directly from this environment, or the file is not there";
  return scrubArtifactEnvelopeTags(
    scrubServerLine(e.err, MAX_SERVER_LINE_CHARS)
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/[[\]]/g, " ")
      .replace(/[.\s]+$/u, ""),
  );
}
//@ chunk-w08rdxhd.js:48339-48898 placement
async function readTypeInstructions(e, signal, s, n) {
  let a = n !== undefined && n.length > 0 ? n : undefined;
  if (a !== undefined && !a.includes(TYPE_INSTRUCTIONS_FILE))
    return {
      kind: "none",
    };
  let l = await webfetchReadFile(
    {
      ...e,
      file: TYPE_INSTRUCTIONS_FILE,
    },
    signal,
    s,
    "artifact_type_instructions_read",
  );
  if (l.err !== null) {
    if (l.missingFile === true && a === undefined)
      return {
        kind: "none",
      };
    let fetchErrorText = getFetchErrorText(l);
    if (fetchErrorText !== l.err) logForDebugging(`[artifact] type instructions read failed: ${l.err}`);
    return {
      kind: "unavailable",
      why:
        l.missingFile === true
          ? "the file is not on the version of the Artifact that was read"
          : instructionsWhy({
              ...l,
              err: fetchErrorText,
            }),
      known: a !== undefined,
    };
  }
  if (l.html.trim() === "")
    return {
      kind: "none",
    };
  return instructionsFromText(l.html, a !== undefined);
}
//@ chunk-w08rdxhd.js:48898-49034 placement
function instructionsFromText(e, fromType) {
  let pageText = extractPageText(stripControlChars(e));
  let n = Array.from(pageText).length;
  let a = n > MAX_INLINE_TYPE_TEXT_CHARS;
  return {
    kind: "read",
    text: a ? extractPageText(truncateCodePoints(pageText, MAX_INLINE_TYPE_TEXT_CHARS)) : pageText,
    chars: n,
    clipped: a,
    fromType,
  };
}
//@ chunk-w08rdxhd.js:49034-49644 placement
function renderTypeInstructions(e, r) {
  switch (e.kind) {
    case "none":
      return "";
    case "unavailable":
      return e.known
        ? `

[This Artifact's type ships an instructions file (${TYPE_INSTRUCTIONS_FILE}) describing the content its page expects, but it could not be read here: ${e.why}. If what it expects isn't clear from the file names, ask the user before writing data to it.]`
        : `

[Could not check whether this Artifact carries its type's instructions file (${TYPE_INSTRUCTIONS_FILE}): ${e.why}.]`;
    case "read":
      return `

${ARTIFACT_CONTENT_AUTHORED_TAG}
${buildSpellingNoteForText(e.text)}${r ?? (e.fromType ? ARTIFACT_INSTRUCTIONS_BELOW_PUBLISHER : ARTIFACT_INSTRUCTIONS_BELOW_FOUND)}
<${ARTIFACT_TYPE_INSTRUCTIONS}>
${e.text}${
        e.clipped
          ? `
[\u2026clipped at ${MAX_INLINE_TYPE_TEXT_CHARS} of ${e.chars} characters]`
          : ""
      }
</${ARTIFACT_TYPE_INSTRUCTIONS}>

${ARTIFACT_INSTRUCTIONS_ABOVE_THIRD_PARTY}${replRouteSection(e.text)}`;
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
    let { artifactReplToolPresent } = require("./chunk-6jghtm4d.js");
    if (!artifactReplToolPresent()) return "";
    let { REPL_ROUTE_SECTION_BY_TYPE_KEY } = require("./chunk-thjasdp6.js");
    let n = instructionsTypeKey(text);
    let a = n === undefined ? undefined : REPL_ROUTE_SECTION_BY_TYPE_KEY.get(n);
    return a === undefined
      ? ""
      : `

${a}`;
  }
  return "";
}
//@ chunk-w08rdxhd.js:50069-50308 placement
function replRouteTwoSteps(text) {
  {
    let { artifactReplToolPresent } = require("./chunk-6jghtm4d.js");
    if (!artifactReplToolPresent()) return null;
    let { REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY } = require("./chunk-thjasdp6.js");
    let n = instructionsTypeKey(text);
    if (n === undefined) return null;
    return REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY.get(n) ?? null;
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
async function typeInstructionsForRead(parsedArtifact, signal, credentials) {
  if (!typeCatalogOnForSession()) return null;
  let combinedAbortSignal = createCombinedAbortSignal(signal, {
    timeoutMs: TYPE_INSTRUCTIONS_READ_MS,
    refTimer: true,
  });
  try {
    return await readTypeInstructions(parsedArtifact, combinedAbortSignal.signal, credentials);
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
};
