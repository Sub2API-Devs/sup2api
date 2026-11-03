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
import { TENGU_COBALT_PLINTH_LARCH, B_t, canCreateFromType } from "./createFromType.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, A, oe, o, M, E, U, T } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { UK, latinLetterConfusableClass, Mso, N3e } from "../../utils/confusables.js";
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
import { t0 } from "../mcp/schemaParse.js";
import { aK } from "./textSanitize.js";
import { getAttestationKind } from "./attestation.js";
import { ARTIFACT_LIST_RELS } from "./listArtifacts.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { gF, getFetchErrorText } from "./webfetchRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { extractPageText, stripControlChars } from "./audience.js";
import { Sh, pDi, mDi, ARTIFACT_TYPE_INSTRUCTIONS, hDi } from "../../constants/xml.js";
import { buildSpellingNoteForText } from "./artifactPromptText.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";

//@ chunk-w08rdxhd.js:28307-28375 placement
function isArtifactTypeCatalogEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_TYPE_CATALOG ??
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COBALT_PLINTH_LARCH, !0)
  );
}
//@ chunk-w08rdxhd.js:28375-28435 placement
function isArtifactQuickstartEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_QUICKSTART ?? !0;
}
//@ chunk-w08rdxhd.js:28435-28454 placement
var ANTHROPIC = "anthropic";
//@ chunk-w08rdxhd.js:28454-28636 placement
function getTypesListPath(e, r = !1) {
  let s = [
    ...(r ? [`scopes=${ANTHROPIC}`] : []),
    ...(e === void 0 || e === "" ? [] : [`q=${encodeURIComponent(e)}`]),
  ];
  return s.length === 0 ? "/api/frame/types" : `/api/frame/types?${s.join("&")}`;
}
//@ chunk-w08rdxhd.js:28636-28701 placement
function It(e) {
  return `/api/frame/types/${encodeURIComponent(e)}`;
}
//@ chunk-w08rdxhd.js:28701-28816 placement
function getTypeInstancesPath(e, r) {
  return `/api/frame/types/${encodeURIComponent(e)}/instances?limit=${TYPE_INSTANCES_LIMIT}${r === "all" ? "" : `&rel=${r}`}`;
}
//@ chunk-w08rdxhd.js:28816-28947 placement
function getTypeFilePath(e, r) {
  return `/api/frame/types/${encodeURIComponent(e)}/files/${r
    .split("/")
    .map((s) => encodeURIComponent(s))
    .join("/")}`;
}
/**
 * 类型目录的大小/数量上限常量与列表等级顺序（core、solution、community）。
 */
//@ chunk-w08rdxhd.js:28947-29057 placement
var MAX_TYPE_FILE_BYTES = 4194304,
  TYPE_DESCRIBE_MAX_BYTES = 1048576,
  TYPE_LISTING_MAX_BYTES = 1048576,
  TYPE_INSTANCES_LIMIT = 200,
  LIST_DESCRIPTION_MAX_RUNES = 240,
  DETAIL_DESCRIPTION_MAX_RUNES = 1200,
  CAPABILITY_NAMES_MAX = 16,
  MAX_TYPE_FILE_ENTRIES = 4096,
  TYPE_TIER_ORDER = ["core", "solution", "community"];
//@ chunk-w08rdxhd.js:29057-29100 placement
function isKnownTier(e) {
  return TYPE_TIER_ORDER.some((r) => r === e);
}
/**
 * 类型目录接口的响应 schema：类型列表、类型条目的 listing（scope/tier）、类型摘要、类型详情（文件、能力、可创建）、类型文件条目与文件内容；以及描述不可用的提示与类型说明文件名 SKILL.md。
 */
//@ chunk-w08rdxhd.js:29100-29991 placement
var TYPES_LIST_SCHEMA = DoctorLazy(() =>
    u({
      types: A(oe()).nullable(),
      next_page_token: o()
        .optional()
        .catch(void 0),
    }),
  ),
  TYPE_LISTING_SCHEMA = DoctorLazy(() =>
    u({
      scope: o()
        .optional()
        .catch(void 0),
      tier: o()
        .optional()
        .catch(void 0),
    }),
  ),
  TYPE_SUMMARY_SCHEMA = DoctorLazy(() =>
    u({
      slug: o().regex(ARTIFACT_SLUG_RE),
      title: o()
        .max(2048)
        .optional()
        .catch(void 0),
      description: o()
        .max(8192)
        .optional()
        .catch(void 0),
      listings: A(oe())
        .optional()
        .catch(void 0),
      release: u({
        version: o()
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
    }),
  ),
  TYPE_DETAIL_SCHEMA = DoctorLazy(() =>
    TYPE_SUMMARY_SCHEMA().extend({
      files: A(oe())
        .optional()
        .catch(void 0),
      capabilities: oe().optional(),
      creatable: M()
        .optional()
        .catch(void 0),
    }),
  ),
  TYPE_FILE_ENTRY_SCHEMA = DoctorLazy(() =>
    u({
      path: o().min(1).max(512),
      size: E()
        .int()
        .min(0)
        .optional()
        .catch(void 0),
      content_type: o()
        .max(128)
        .optional()
        .catch(void 0),
    }),
  ),
  TYPE_FILE_TEXT_SCHEMA = DoctorLazy(() =>
    u({
      path: o(),
      chars: E()
        .int()
        .min(0)
        .optional()
        .catch(void 0),
      truncated: M()
        .optional()
        .catch(void 0),
      text: o(),
    }),
  ),
  TYPE_DESCRIBE_UNAVAILABLE_MESSAGE = "describing an Artifact type is not available in this session",
  TYPE_INSTRUCTIONS_FILE = "SKILL.md";
//@ chunk-w08rdxhd.js:29991-30050 placement
function He(e, r) {
  return e === void 0 ? void 0 : (truncateSingleLine(e, r) ?? void 0);
}
//@ chunk-w08rdxhd.js:30050-30266 placement
function getBestAnthropicTier(e) {
  let r;
  for (let s of e ?? []) {
    let safeParse = TYPE_LISTING_SCHEMA().safeParse(s);
    if (!safeParse.success || safeParse.data.scope !== ANTHROPIC || !isKnownTier(safeParse.data.tier))
      continue;
    let index = TYPE_TIER_ORDER.indexOf(safeParse.data.tier);
    r = r === void 0 ? index : Math.min(r, index);
  }
  return r === void 0 ? void 0 : TYPE_TIER_ORDER[r];
}
//@ chunk-w08rdxhd.js:30266-30368 placement
function isAnthropicListed(e) {
  return (e ?? []).some((r) => {
    let safeParse = TYPE_LISTING_SCHEMA().safeParse(r);
    return safeParse.success && safeParse.data.scope === ANTHROPIC;
  });
}
//@ chunk-w08rdxhd.js:30368-30459 placement
function Be(e, r, s) {
  if (isAnthropicListed(r)) markAttestation(e, "first_party_type", s);
  else revokeAttestations(e, ["first_party_type"], s);
}
//@ chunk-w08rdxhd.js:30459-30726 placement
function toTypeSummaryRow(e, r) {
  let s = getBestAnthropicTier(e.listings),
    n = He(e.description, r),
    a = e.release?.version,
    l = sanitizeDisplayTitle(e.title ?? "");
  return {
    typeUrl: artifactViewerUrl(e.slug),
    title: l ?? "Untitled",
    ...(l === null && { untitled: !0 }),
    ...(n !== void 0 && { description: n }),
    ...(s !== void 0 && { tier: s }),
    ...(a !== void 0 && VER_SHAPE.test(a) && { release: a }),
  };
}
//@ chunk-w08rdxhd.js:30726-30815 placement
function re(e) {
  return e.ok && e.fromFrame && e.status === 404 && (e.route === "relay" || isFrameNotFoundBody(e.data));
}
/**
 * 经中继 GET 类型目录接口：首次网络错误、5xx、带 retry-after 的 429/503 或中继不可用时等待后重试一次；响应超过大小上限时打点并返回 oversize。
 */
//@ chunk-w08rdxhd.js:30815-31709 placement
async function fetchFrameWithRetry(path, options) {
  for (let s = 0; ; s++) {
    let response;
    try {
      response = await frameApi.getRelayBound(path, {
        refreshOAuth: !0,
        headers: buildFrameHeaders(),
        timeout: 15000,
        maxContentLength: options.maxContentLength,
        signal: options.signal,
        credentials: options.credentials,
        httpOnly: options.httpOnly,
      });
    } catch (error) {
      if (isCancel(error) || options.signal.aborted) throw error;
      if (isMaxContentLengthError(error))
        return (
          logFeatureBad(options.feature, "oversize_body", {
            ...(me.has(options.feature) && { wire: wireOfThrow(error) }),
          }),
          { threw: !0, oversize: !0 }
        );
      if (s === 0) {
        await sleep(300 + Math.random() * 500, options.signal, { throwOnAbort: !0 });
        continue;
      }
      return (
        logFeatureBad(options.feature, "request_error", {
          ...(me.has(options.feature) && { wire: wireOfThrow(error) }),
        }),
        { threw: !0, oversize: !1 }
      );
    }
    let retryAfter =
      response.ok && (response.status === 503 || response.status === 429)
        ? response.response?.headers?.["retry-after"]
        : void 0;
    if (
      ((response.ok && (response.status >= 500 || typeof retryAfter === "string")) ||
        (isRelayUnsent(response) &&
          response.reason === "relay-unavailable" &&
          (response.status === 0 || response.status >= 499))) &&
      s === 0
    ) {
      let h =
        typeof retryAfter === "string"
          ? Math.min(parseRetryAfterMs(retryAfter) ?? 1000, 5000)
          : 300 + Math.random() * 500;
      await sleep(h, options.signal, { throwOnAbort: !0 });
      continue;
    }
    return response;
  }
}
//@ chunk-w08rdxhd.js:31709-31774 placement
var me = new Set(["artifact_type_list", "artifact_type_instances"]);
/**
 * 把类型目录请求的失败（未认证、中继错误、403 被策略拒绝、429、503、其他 HTTP 错误）转成给模型的错误文字并打点，返回 {err, reason}。
 */
//@ chunk-w08rdxhd.js:31774-32601 placement
function describeFrameReadFailure(response, feature, what) {
  let fail = (a, l) => (
    logFeatureBad(feature, a, {
      ...(response.ok && { status: response.status }),
      ...(me.has(feature) && { wire: wireOf(response) }),
    }),
    { err: l, reason: a }
  );
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
  let r = e.firstParty === !0,
    now = Date.now(),
    n = await fetchFrameWithRetry(getTypesListPath(e.query, r), {
      signal: e.signal,
      maxContentLength: MAX_TYPE_FILE_BYTES,
      feature: "artifact_type_list",
      credentials: e.credentials,
      httpOnly: e.httpOnly,
    });
  if ("threw" in n)
    return n.oversize
      ? {
          err: "the Artifact type listing could not be read (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : {
          err: "the Artifact type listing could not be read (network error) \u2014 retry",
          reason: "request_error",
        };
  let a = wireOf(n);
  if (isRelayUnsent(n))
    return (
      logFeatureSad("artifact_type_list", "relay_unserved", { status: n.status, wire: a }),
      { err: null, rows: [], dropped: 0, more: !1, unavailable: !0 }
    );
  if (re(n))
    return (
      logFeatureSad("artifact_type_list", "catalog_off", { wire: a }),
      { err: null, rows: [], dropped: 0, more: !1, unavailable: !0 }
    );
  if (!n.ok || !n.fromFrame || n.status !== 200) {
    let R = describeFrameReadFailure(n, "artifact_type_list", "the Artifact type listing");
    return n.ok &&
      n.fromFrame &&
      n.status === 403 &&
      typeof n.data === "string" &&
      n.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? { ...R, reason: "ccr_credential_refused" }
      : R;
  }
  let safeParse = TYPES_LIST_SCHEMA().safeParse(n.data);
  if (!safeParse.success)
    return (
      logFeatureBad("artifact_type_list", "malformed_body", { wire: a }),
      { err: "the Artifact type listing could not be read (malformed response)", reason: "malformed_body" }
    );
  let h = safeParse.data.types ?? [],
    mapped = h.map((R) => {
      let safeParse = TYPE_SUMMARY_SCHEMA().safeParse(R);
      return safeParse.success ? safeParse.data : void 0;
    });
  for (let R of mapped) if (R !== void 0) Be(R.slug, R.listings, now);
  let x = [],
    w = 0,
    k = 0;
  for (let R of mapped) {
    if (x.length >= TYPE_INSTANCES_LIMIT) break;
    if (R === void 0) {
      w++;
      continue;
    }
    let L = isAnthropicListed(R.listings);
    if (r && !L) {
      if (R.listings === void 0) w++;
      else k++;
      continue;
    }
    x.push(toTypeSummaryRow(R, LIST_DESCRIPTION_MAX_RUNES));
  }
  if (h.length > k && x.length === 0)
    return (
      logFeatureBad("artifact_type_list", "all_rows_dropped", { wire: a }),
      {
        err: "the Artifact type listing could not be read (response rows were unreadable)",
        reason: "all_rows_dropped",
      }
    );
  let I =
    x.length + w + k < h.length ||
    (typeof safeParse.data.next_page_token === "string" && safeParse.data.next_page_token !== "");
  if (w > 0) logFeatureSad("artifact_type_list", "rows_dropped", { count: w, wire: a });
  else
    logFeatureOk("artifact_type_list", {
      n_types: x.length,
      queried: e.query !== void 0 && e.query !== "",
      more: I,
      wire: a,
    });
  return { err: null, rows: x, dropped: w, more: I, unavailable: !1 };
}
//@ chunk-w08rdxhd.js:34592-34695 placement
var regExp = new RegExp(`[${UK.open}${UK.close}]`, "gu"),
  Bt = /[\u2012-\u2015\u2E3A\u2E3B\uFE31\uFE32\uFE58]/gu;
//@ chunk-w08rdxhd.js:34695-34877 placement
function typeRowTitle(e) {
  return scrubArtifactLinks(
    normalizeQuotes(e.replaceAll('"', "'"))
      .replaceAll("\\", " ")
      .replace(regExp, " ")
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(Bt, "-"),
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
var Yt = ".\\u00B7\\u2027\\uFF0E\\u2024\\u30FB\\u2219\\u22C5",
  fe;
/**
 * 惰性构造匹配"type url"标签（中间可夹杂分隔符、格式字符或组合符号）的正则，用于识别伪造的类型链接标签。
 */
//@ chunk-w08rdxhd.js:35046-35365 placement
function getTypeUrlLabelRegex() {
  if (fe === void 0) {
    let s = `(?:[\\s\\p{Cf}\\p{M}]*[${Mso}/${N3e}][\\s\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*[${Yt}][\\p{Cf}\\p{M}]*|[\\s\\p{Cf}\\p{M}]*)`;
    fe = new RegExp(
      `(?<![A-Za-z0-9_])${confusableWordPattern("type")}${s}${confusableWordPattern("url")}(?![A-Za-z0-9_])(?=\\s*[${N3e}\\u1361\\u1365\\u1804\\uA6F4\\u2E35\\u0903\\u0F7F])`,
      "gu",
    );
  }
  return fe;
}
//@ chunk-w08rdxhd.js:35365-35372 placement
var pe;
/**
 * 惰性构造清洗链接用的模式集合：拉丁字母易混字符、UUID 状片段、artifact/code 路径片段等。
 */
//@ chunk-w08rdxhd.js:35372-35766 placement
function getLinkScrubPatterns() {
  if (pe === void 0)
    pe = {
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
  return pe;
}
//@ chunk-w08rdxhd.js:35766-35817 placement
var Vt = /^[1-9A-HJ-NP-Za-km-z]$/,
  he = /^[0-9A-Za-z]$/;
/**
 * 在文字里找出伪装的 artifact 链接或 ID（同形字母、UUID 形状、base58 UUID、/artifact/ 路径），把包含它们的整个词替换成 "(link removed)"。
 */
//@ chunk-w08rdxhd.js:35817-36759 placement
function scrubArtifactLinks(text) {
  let { confusable: confusable, marks: marks, slash: slash } = getLinkScrubPatterns(),
    chars = [...text],
    folded = "",
    indexMap = [],
    S = [];
  chars.forEach((y, d) => {
    let normalized = y.normalize("NFKC"),
      matches = /^[A-Za-z]\p{M}+$/u.test(y.normalize("NFD")),
      N = /^\s$/u.test(y)
        ? " "
        : /^[0-9A-Za-z]+$/.test(normalized)
          ? normalized
          : matches
            ? y.normalize("NFD")[0]
            : /^[\p{Cf}\p{M}]$/u.test(y)
              ? ""
              : /^\p{Nd}$/u.test(y)
                ? "1"
                : slash.test(normalized)
                  ? "/"
                  : (confusable.find(([, O]) => O.test(y))?.[0] ?? ".");
    for (let O of N) ((folded += O), indexMap.push(d), S.push(!he.test(y) && !matches));
  });
  let x = new Set(),
    w = (y, d) => {
      for (let z = y; z < y + d; z++) x.add(indexMap[z]);
    };
  for (let y of marks) for (let d of folded.matchAll(y)) w(d.index, d[0].length);
  let k = BASE58_UUID_LENGTH;
  for (let y = 0; y + k <= folded.length; y++) {
    let sliced = folded.slice(y, y + k),
      z = indexMap[y],
      C = indexMap[y + k - 1];
    if (
      ![...sliced].every((N) => Vt.test(N)) ||
      indexMap[y - 1] === z ||
      indexMap[y + k] === C ||
      he.test(chars[z - 1] ?? "") ||
      he.test(chars[C + 1] ?? "")
    )
      continue;
    if (S.slice(y, y + k).some(Boolean) || decodeBase58Uuid(sliced) !== null) w(y, k);
  }
  if (x.size === 0) return text;
  let I = "",
    R = "",
    L = !1;
  return (
    chars.forEach((y, d) => {
      if (/^\s$/u.test(y)) ((I += (L ? "(link removed)" : R) + y), (R = ""), (L = !1));
      else ((R += y), (L ||= x.has(d)));
    }),
    I + (L ? "(link removed)" : R)
  );
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
var Pe = `"${QUOTE_HOMOGLYPHS.source.slice(1, -1)}`,
  regExp_2 = new RegExp(`^[${Pe}]([\\s\\S]*)[${Pe}]$`, "u");
//@ chunk-w08rdxhd.js:37131-37180 placement
function typeNameWithoutQuotes(e) {
  return e.trim().replace(regExp_2, "$1");
}
//@ chunk-w08rdxhd.js:37180-37243 placement
var Kt = 3,
  De = (e) => [...e].length >= Kt,
  K = (e) => e.replaceAll(" ", "");
//@ chunk-w08rdxhd.js:37243-37281 placement
function typeNameMatchKey(e) {
  return K(typeNameKey(typeNameWithoutQuotes(e)));
}
//@ chunk-w08rdxhd.js:37281-37326 placement
function typeTitleMatchKeys(e) {
  return uniq([K(typeNameKey(e)), typeNameMatchKey(e)]);
}
//@ chunk-w08rdxhd.js:37326-37891 placement
function typesNamed(e, r) {
  let s = typeNameKey(typeNameWithoutQuotes(r));
  if (s === "") return { named: [], exact: !1 };
  let n = typeNameMatchKey(r),
    a = K(typeNameKey(r)),
    l = !1,
    h = [],
    S = [],
    x = [];
  for (let R of e) {
    let L = R.untitled ? "" : typeNameKey(R.title);
    if (L === "") continue;
    let y = K(L);
    if (y === n) {
      ((l = !0), h.push(R));
      continue;
    }
    let d = y === a;
    if (d) h.push(R);
    if (De(y) && n.includes(y)) S.push(R);
    else if (d || (De(n) && L.includes(s))) x.push(R);
  }
  if (l) return { named: h, exact: !0 };
  let w = [...S, ...x];
  if (w.length < 2 || x.length > 0) return { named: w, exact: !1 };
  let mapped = S.map((R) => K(typeNameKey(R.title))),
    filtered = S.filter((R, L) => mapped.every((y, d) => d === L || mapped[L].includes(y)));
  return { named: filtered.length === 1 ? filtered : w, exact: !1 };
}
//@ chunk-w08rdxhd.js:37891-38365 placement
async function findArtifactTypeByName(e, r) {
  let s = await listArtifactTypes({ ...r, firstParty: !0 });
  if (s.err !== null && s.reason !== "ccr_credential_refused")
    return { err: s.err, reason: `name_${s.reason}` };
  if (s.err !== null || s.unavailable) return { err: null, found: void 0, unavailable: !0 };
  let n = s.more || s.dropped > 0 || s.rows.some((row) => row.untitled),
    { named: named, exact: exact } = typesNamed(s.rows, e);
  return named.length === 1 && named[0] !== void 0 && (exact || !n)
    ? { err: null, found: named[0], exact: exact }
    : { err: null, found: void 0, named: named.length > 1 ? named : [], listed: s.rows.length, partial: n };
}
//@ chunk-w08rdxhd.js:38365-38638 placement
var TYPE_NOT_FOUND_MESSAGE_2 =
  "Artifact type not found in this account's catalog \u2014 check the link (use a `type_url` from action \"list_types\"); a type that exists but isn't listed for this account, a single-file page, or the catalog not being available to this account all answer this way";
//@ chunk-w08rdxhd.js:38638-40526 placement
async function describeArtifactType(e, r) {
  if (!ARTIFACT_SLUG_RE.test(e))
    return (
      logFeatureBad("artifact_type_describe", "invalid_slug"),
      { err: "type_url does not name an Artifact type", reason: "invalid_slug" }
    );
  let now = Date.now(),
    n = await fetchFrameWithRetry(It(e), {
      signal: r.signal,
      maxContentLength: TYPE_DESCRIBE_MAX_BYTES,
      feature: "artifact_type_describe",
      credentials: r.credentials,
    });
  if ("threw" in n)
    return n.oversize
      ? {
          err: "the Artifact type could not be read (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : { err: "the Artifact type could not be read (network error) \u2014 retry", reason: "request_error" };
  if (isRelayUnsent(n))
    return (
      logFeatureBad("artifact_type_describe", "relay_unserved", { status: n.status }),
      { err: TYPE_DESCRIBE_UNAVAILABLE_MESSAGE, reason: "relay_unserved" }
    );
  if (re(n))
    return (
      logFeatureSad("artifact_type_describe", "not_found"),
      { err: TYPE_NOT_FOUND_MESSAGE_2, reason: "not_found" }
    );
  if (!n.ok || !n.fromFrame || n.status !== 200) {
    let I = describeFrameReadFailure(n, "artifact_type_describe", "the Artifact type");
    return n.ok &&
      n.fromFrame &&
      n.status === 403 &&
      typeof n.data === "string" &&
      n.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
      ? { ...I, reason: "ccr_credential_refused" }
      : I;
  }
  let safeParse = TYPE_DETAIL_SCHEMA().safeParse(n.data);
  if (!safeParse.success || safeParse.data.slug !== e)
    return (
      logFeatureBad("artifact_type_describe", "malformed_body"),
      { err: "the Artifact type could not be read (malformed response)", reason: "malformed_body" }
    );
  let l = safeParse.data;
  Be(l.slug, l.listings, now);
  let h = [],
    S = l.files ?? [];
  for (let I of S.slice(0, MAX_TYPE_FILE_ENTRIES)) {
    let safeParse = TYPE_FILE_ENTRY_SCHEMA().safeParse(I);
    if (safeParse.success && isSafeDisplayName(safeParse.data.path)) h.push(safeParse.data.path);
  }
  let x = S.length - h.length,
    w = l.capabilities == null ? void 0 : isPlainObject(l.capabilities) ? l.capabilities : "malformed",
    sliced = Object.keys(w !== void 0 && w !== "malformed" ? w : {})
      .filter((I) => CAPABILITY_NAME_REGEX.test(I))
      .sort()
      .slice(0, CAPABILITY_NAMES_MAX);
  return (
    logFeatureOk("artifact_type_describe", {
      n_files: h.length,
      n_capabilities: sliced.length,
      ships_instructions: h.includes(TYPE_INSTRUCTIONS_FILE),
      ...(l.creatable !== void 0 && { creatable: l.creatable }),
    }),
    {
      err: null,
      detail: {
        ...toTypeSummaryRow(l, DETAIL_DESCRIPTION_MAX_RUNES),
        files: h,
        filesOmitted: x,
        shipsInstructions: h.includes(TYPE_INSTRUCTIONS_FILE),
        firstParty: isAnthropicListed(l.listings),
        capabilities: sliced,
        ...(w !== void 0 && { declaration: w }),
        ...(l.creatable !== void 0 && { creatable: l.creatable }),
      },
    }
  );
}
//@ chunk-w08rdxhd.js:40526-40535 placement
var Xt = 5;
//@ chunk-w08rdxhd.js:40535-42679 placement
async function readArtifactTypeFile(e, r, s) {
  if (!ARTIFACT_SLUG_RE.test(e))
    return (
      logFeatureBad("artifact_type_file_read", "invalid_slug"),
      {
        kind: "unavailable",
        why: "the link does not name an Artifact type \u2014 nothing to retry",
        reason: "invalid_slug",
      }
    );
  let n = validateReadPath(r);
  if ("errMsg" in n || n.key !== r)
    return (logFeatureSad("artifact_type_file_read", "invalid_path"), { kind: "withheld" });
  if (countCharInString(r, "/") + 1 > Xt)
    return (logFeatureSad("artifact_type_file_read", "too_deep"), { kind: "withheld" });
  let a;
  try {
    a = await frameApi.getRelayBound(getTypeFilePath(e, r), {
      refreshOAuth: !0,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: TYPE_LISTING_MAX_BYTES,
      signal: s.signal,
      credentials: s.credentials,
    });
  } catch (error) {
    if (isCancel(error) || s.signal.aborted) throw error;
    let k = isMaxContentLengthError(error);
    return (
      logFeatureBad("artifact_type_file_read", k ? "oversize_body" : "request_error"),
      k
        ? {
            kind: "unavailable",
            why: "the answer was larger than this client accepts \u2014 nothing to retry",
            reason: "oversize_body",
          }
        : { kind: "unavailable", why: "a network error \u2014 retry shortly", reason: "request_error" }
    );
  }
  if (isRelayUnsent(a))
    return (
      logFeatureSad("artifact_type_file_read", "relay_unserved", { status: a.status }),
      { kind: "withheld" }
    );
  if (!a.ok) {
    let { reason: reason } = describeFrameReadFailure(a, "artifact_type_file_read", "the type file");
    return { kind: "unavailable", why: catalogErrorMessage(reason), reason: reason };
  }
  if (re(a))
    return (
      logFeatureSad("artifact_type_file_read", "withheld", { relay: a.route === "relay" }),
      { kind: "withheld" }
    );
  if (
    a.ok &&
    a.fromFrame &&
    a.status === 403 &&
    typeof a.data === "string" &&
    a.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  )
    return (logFeatureSad("artifact_type_file_read", "ccr_credential_refused"), { kind: "withheld" });
  if (a.ok && a.fromFrame && a.status === 415)
    return (logFeatureSad("artifact_type_file_read", "not_text"), { kind: "not_text" });
  if (a.ok && a.fromFrame && a.status === 413)
    return (logFeatureSad("artifact_type_file_read", "too_large"), { kind: "too_large" });
  if (!a.fromFrame || a.status !== 200) {
    let { reason: reason } = describeFrameReadFailure(a, "artifact_type_file_read", "the type file");
    return { kind: "unavailable", why: catalogErrorMessage(reason), reason: reason };
  }
  let safeParse = TYPE_FILE_TEXT_SCHEMA().safeParse(a.data);
  if (!safeParse.success || safeParse.data.path !== r)
    return (
      logFeatureBad("artifact_type_file_read", "malformed_body"),
      {
        kind: "unavailable",
        why: "the answer was malformed \u2014 nothing to retry",
        reason: "malformed_body",
      }
    );
  let h = instructionsFromText(safeParse.data.text, !0),
    S = h.clipped || safeParse.data.truncated === !0,
    max = Math.max(h.chars, safeParse.data.chars ?? 0);
  return (
    logFeatureOk("artifact_type_file_read", { chars: max, clipped: S, relay: a.route === "relay" }),
    { kind: "read", text: h.text, chars: max, clipped: S }
  );
}
//@ chunk-w08rdxhd.js:42679-43120 placement
function catalogErrorMessage(e) {
  switch (e) {
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
async function readTypeOwnInstructions(e, r, s, n, a) {
  let l = n !== void 0 && n.length > 0 ? n : void 0;
  if (l !== void 0 && !l.includes(TYPE_INSTRUCTIONS_FILE)) return { kind: "none" };
  let h = await readArtifactTypeFile(e.slug, TYPE_INSTRUCTIONS_FILE, { signal: r, credentials: s });
  switch (h.kind) {
    case "read":
      return h.text.trim() === "" ? { kind: "none" } : { ...h, fromType: !0 };
    case "not_text":
      return { kind: "unavailable", why: "the file is not text", known: !0 };
    case "too_large":
      return { kind: "unavailable", why: "the file is larger than this read accepts", known: !0 };
    case "withheld":
    case "unavailable":
      return a
        ? readTypeInstructions(e, r, s, n)
        : {
            kind: "unavailable",
            why: h.kind === "withheld" ? "the type catalog does not serve it to this session yet" : h.why,
            known: l !== void 0,
          };
  }
}
//@ chunk-w08rdxhd.js:43735-43801 placement
var Ke = ["org", "user"],
  Zt = ["owner", "users", "org", "public", "other"];
//@ chunk-w08rdxhd.js:43801-43838 placement
function Qt(e) {
  return Zt.includes(e);
}
//@ chunk-w08rdxhd.js:43838-43871 placement
var Jt = new Set(["org", "public"]);
//@ chunk-w08rdxhd.js:43871-43962 placement
function isSharedWithUser(e) {
  return e.rel === "shared" && typeof e.audience === "string" && !Jt.has(e.audience);
}
/**
 * 类型实例接口的 schema：实例行（slug、标题、描述、创建时间、关系、受众、是否默认/置顶/外部写过、所有者类型）、实例列表、默认实例，以及不可用时的空结果。
 */
//@ chunk-w08rdxhd.js:43962-44774 placement
var TYPE_INSTANCE_SCHEMA = DoctorLazy(() =>
    u({
      slug: o().regex(ARTIFACT_SLUG_RE),
      title: o()
        .max(2048)
        .optional()
        .catch(void 0),
      description: o()
        .max(8192)
        .optional()
        .catch(void 0),
      created_at: t0({ offset: !0 })
        .optional()
        .catch(void 0),
      rel: o()
        .optional()
        .catch(void 0),
      audience: o()
        .min(1)
        .transform((e) => (Qt(e) ? e : "other"))
        .optional()
        .catch(void 0),
      default: U(Ke)
        .optional()
        .catch(void 0),
      pinned: T(!0)
        .optional()
        .catch(void 0),
      outsidersMayHaveWritten: T(!0)
        .optional()
        .catch((e) => (aK(e.input) ? !0 : void 0)),
      owner: u({
        kind: o()
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
    }),
  ),
  SERVICE_ACCOUNT = "service_account",
  TYPE_INSTANCES_SCHEMA = DoctorLazy(() =>
    u({
      instances: A(oe()).nullable(),
      next_page_token: o()
        .optional()
        .catch(void 0),
      default: oe().optional(),
    }),
  ),
  DEFAULT_INSTANCE_SCHEMA = DoctorLazy(() =>
    u({
      effective: o()
        .regex(ARTIFACT_SLUG_RE)
        .optional()
        .catch(void 0),
      scope: U(Ke)
        .optional()
        .catch(void 0),
    }),
  ),
  UNAVAILABLE_INSTANCES = { err: null, rows: [], dropped: 0, overflow: !1, unavailable: !0 };
//@ chunk-w08rdxhd.js:44774-44845 placement
function ze(e) {
  return e.default !== void 0 ? 0 : e.rel === "mine" ? 1 : isSharedWithUser(e) ? 2 : 3;
}
//@ chunk-w08rdxhd.js:44845-45127 placement
function recordInstanceKind(e, r, s, n, a) {
  let l =
    e.pinned === !0
      ? "org_pinned_instance"
      : e.owner?.kind === SERVICE_ACCOUNT && getAttestationKind(r) === "first_party_type"
        ? "pipeline_instance"
        : n
          ? "template_instance"
          : void 0;
  revokeAttestations(
    e.slug,
    REVOCABLE_INSTANCE_KINDS.filter((S) => S !== l),
    a,
  );
  let any = ARTIFACT_LIST_RELS.some((S) => S === e.rel && (s === "all" || S === s));
  if (l !== void 0 && any) markAttestation(e.slug, l, a);
}
//@ chunk-w08rdxhd.js:45127-48011 placement
async function listTypeInstances(e, r) {
  if (!ARTIFACT_SLUG_RE.test(e))
    return (
      logFeatureBad("artifact_type_instances", "invalid_slug"),
      { err: "type_url does not name an Artifact type", reason: "invalid_slug" }
    );
  let now = Date.now(),
    n = await fetchFrameWithRetry(getTypeInstancesPath(e, r.scope), {
      signal: r.signal,
      maxContentLength: MAX_TYPE_FILE_BYTES,
      feature: "artifact_type_instances",
      credentials: r.credentials,
      httpOnly: r.httpOnly,
    });
  if ("threw" in n)
    return n.oversize
      ? {
          err: "the Artifacts made from this type could not be listed (the response was larger than this client accepts)",
          reason: "oversize_body",
        }
      : {
          err: "the Artifacts made from this type could not be listed (network error) \u2014 retry",
          reason: "request_error",
        };
  let a = wireOf(n);
  if (isRelayUnsent(n))
    return (
      logFeatureSad("artifact_type_instances", "relay_unserved", { status: n.status, wire: a }),
      UNAVAILABLE_INSTANCES
    );
  if (re(n))
    return (logFeatureSad("artifact_type_instances", "not_found", { wire: a }), UNAVAILABLE_INSTANCES);
  if (
    n.ok &&
    n.fromFrame &&
    n.status === 403 &&
    typeof n.data === "string" &&
    n.data.startsWith(CCR_CREDENTIAL_REFUSED_PREFIX)
  )
    return (
      logFeatureSad("artifact_type_instances", "ccr_credential_refused", { wire: a }),
      UNAVAILABLE_INSTANCES
    );
  if (!n.ok || !n.fromFrame || n.status !== 200)
    return describeFrameReadFailure(n, "artifact_type_instances", "the Artifacts made from this type");
  let safeParse = TYPE_INSTANCES_SCHEMA().safeParse(n.data);
  if (!safeParse.success)
    return (
      logFeatureBad("artifact_type_instances", "malformed_body", { wire: a }),
      {
        err: "the Artifacts made from this type could not be listed (malformed response)",
        reason: "malformed_body",
      }
    );
  let h = safeParse.data.instances ?? [],
    S = isPlainObject(safeParse.data.default),
    x = S ? DEFAULT_INSTANCE_SCHEMA().safeParse(safeParse.data.default) : void 0,
    w = [],
    k = 0;
  for (let [C, N] of h.entries()) {
    let safeParse = TYPE_INSTANCE_SCHEMA().safeParse(N);
    if (!safeParse.success) {
      if (C < TYPE_INSTANCES_LIMIT) k++;
      continue;
    }
    if ((recordInstanceKind(safeParse.data, e, r.scope, S, now), C < TYPE_INSTANCES_LIMIT))
      w.push(safeParse.data);
  }
  if (h.length > 0 && w.length === 0)
    return (
      logFeatureBad("artifact_type_instances", "all_rows_dropped", { wire: a }),
      {
        err: "the Artifacts made from this type could not be listed (response rows were unreadable)",
        reason: "all_rows_dropped",
      }
    );
  let I = (C) => w.find((N) => N.default === C)?.slug,
    R = ((x?.success ? x.data.effective : void 0) ?? I("user") ?? I("org"))?.toLowerCase(),
    L =
      R === void 0
        ? void 0
        : ((x?.success ? x.data.scope : void 0) ??
          w.find((C) => C.slug.toLowerCase() === R)?.default ??
          "org"),
    y = [],
    d = !1;
  for (let C of w) {
    let found = ARTIFACT_LIST_RELS.find((X) => X === C.rel);
    if (found === void 0 || (r.scope !== "all" && found !== r.scope)) {
      k++;
      continue;
    }
    let O = !d && C.slug.toLowerCase() === R;
    if (O) d = !0;
    let Y = He(C.description, LIST_DESCRIPTION_MAX_RUNES);
    y.push({
      url: artifactViewerUrl(C.slug),
      title: sanitizeDisplayTitle(C.title ?? "") ?? "Untitled",
      ...(Y !== void 0 && { description: Y }),
      ...(C.created_at !== void 0 && { createdAt: C.created_at }),
      rel: found,
      ...(found === "shared" && C.audience !== void 0 && { audience: C.audience }),
      ...(O && L !== void 0 && { default: L }),
      ...(found === "mine" && C.outsidersMayHaveWritten === !0 && { outsidersMayHaveWritten: !0 }),
    });
  }
  y.sort((C, N) => ze(C) - ze(N) || C.title.localeCompare(N.title));
  let z =
    h.length > TYPE_INSTANCES_LIMIT ||
    (typeof safeParse.data.next_page_token === "string" && safeParse.data.next_page_token !== "");
  if (k > 0) logFeatureSad("artifact_type_instances", "rows_dropped", { count: k, wire: a });
  else
    logFeatureOk("artifact_type_instances", {
      n_instances: y.length,
      scope: fromEnum(r.scope),
      curated: S,
      has_default: y.some((C) => C.default !== void 0),
      n_shared_with_user: count(y, isSharedWithUser),
      overflow: z,
      wire: a,
    });
  return { err: null, rows: y, dropped: k, overflow: z, unavailable: !1 };
}
//@ chunk-w08rdxhd.js:48011-48039 placement
var _e = 20000,
  an = 300,
  TYPE_INSTRUCTIONS_READ_MS = 1e4;
//@ chunk-w08rdxhd.js:48039-48339 placement
function instructionsWhy(e) {
  if (e.deterministic === "egress-blocked" || /network allowlist blocks|needs outbound HTTPS to/.test(e.err))
    return "Artifact files can't be fetched directly from this environment, or the file is not there";
  return scrubArtifactEnvelopeTags(
    scrubServerLine(e.err, an)
      .replace(DECISION_SURFACE_BRACKETS_RE, " ")
      .replace(/[[\]]/g, " ")
      .replace(/[.\s]+$/u, ""),
  );
}
//@ chunk-w08rdxhd.js:48339-48898 placement
async function readTypeInstructions(e, r, s, n) {
  let a = n !== void 0 && n.length > 0 ? n : void 0;
  if (a !== void 0 && !a.includes(TYPE_INSTRUCTIONS_FILE)) return { kind: "none" };
  let l = await gF({ ...e, file: TYPE_INSTRUCTIONS_FILE }, r, s, "artifact_type_instructions_read");
  if (l.err !== null) {
    if (l.missingFile === !0 && a === void 0) return { kind: "none" };
    let h = getFetchErrorText(l);
    if (h !== l.err) logForDebugging(`[artifact] type instructions read failed: ${l.err}`);
    return {
      kind: "unavailable",
      why:
        l.missingFile === !0
          ? "the file is not on the version of the Artifact that was read"
          : instructionsWhy({ ...l, err: h }),
      known: a !== void 0,
    };
  }
  if (l.html.trim() === "") return { kind: "none" };
  return instructionsFromText(l.html, a !== void 0);
}
//@ chunk-w08rdxhd.js:48898-49034 placement
function instructionsFromText(e, r) {
  let s = extractPageText(stripControlChars(e)),
    n = Array.from(s).length,
    a = n > _e;
  return {
    kind: "read",
    text: a ? extractPageText(truncateCodePoints(s, _e)) : s,
    chars: n,
    clipped: a,
    fromType: r,
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

${Sh}
${buildSpellingNoteForText(e.text)}${r ?? (e.fromType ? pDi : mDi)}
<${ARTIFACT_TYPE_INSTRUCTIONS}>
${e.text}${
        e.clipped
          ? `
[\u2026clipped at ${_e} of ${e.chars} characters]`
          : ""
      }
</${ARTIFACT_TYPE_INSTRUCTIONS}>

${hDi}${replRouteSection(e.text)}`;
  }
}
//@ chunk-w08rdxhd.js:49644-49656 placement
var on = 2048;
//@ chunk-w08rdxhd.js:49656-49827 placement
function instructionsTypeKey(e) {
  let match = /^\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(truncateCodePoints(e, on));
  if (match === null) return;
  return /^name:[ \t]*["']?([A-Za-z0-9_-]+)["']?[ \t]*$/m.exec(match[1])?.[1];
}
//@ chunk-w08rdxhd.js:49827-50069 placement
function replRouteSection(e) {
  {
    let { artifactReplToolPresent: artifactReplToolPresent } = require("./chunk-6jghtm4d.js");
    if (!artifactReplToolPresent()) return "";
    let { REPL_ROUTE_SECTION_BY_TYPE_KEY: REPL_ROUTE_SECTION_BY_TYPE_KEY } = require("./chunk-thjasdp6.js"),
      n = instructionsTypeKey(e),
      a = n === void 0 ? void 0 : REPL_ROUTE_SECTION_BY_TYPE_KEY.get(n);
    return a === void 0
      ? ""
      : `

${a}`;
  }
  return "";
}
//@ chunk-w08rdxhd.js:50069-50308 placement
function replRouteTwoSteps(e) {
  {
    let { artifactReplToolPresent: artifactReplToolPresent } = require("./chunk-6jghtm4d.js");
    if (!artifactReplToolPresent()) return null;
    let {
        REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY: REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY,
      } = require("./chunk-thjasdp6.js"),
      n = instructionsTypeKey(e);
    if (n === void 0) return null;
    return REPL_ROUTE_TWO_STEPS_BY_TYPE_KEY.get(n) ?? null;
  }
  return null;
}
//@ chunk-w08rdxhd.js:50308-50407 placement
function typeCatalogOnForSession() {
  let frozenArtifactTypes = getLiveState().frozenArtifactTypes;
  return frozenArtifactTypes !== void 0
    ? frozenArtifactTypes.typeCatalogOn
    : B_t() && isFrameMultiFileEnabled() && isArtifactTypeCatalogEnabled();
}
//@ chunk-w08rdxhd.js:50407-50511 placement
function quickstartOnForSession() {
  let frozenArtifactTypes = getLiveState().frozenArtifactTypes;
  return frozenArtifactTypes !== void 0
    ? frozenArtifactTypes.quickstartOn === !0
    : typeCatalogOnForSession() && canCreateFromType() && isArtifactQuickstartEnabled();
}
//@ chunk-w08rdxhd.js:50511-50785 placement
async function typeInstructionsForRead(e, r, s) {
  if (!typeCatalogOnForSession()) return null;
  let n = createCombinedAbortSignal(r, { timeoutMs: TYPE_INSTRUCTIONS_READ_MS, refTimer: !0 });
  try {
    return await readTypeInstructions(e, n.signal, s);
  } catch (error) {
    if (r.aborted || !n.signal.aborted) throw error;
    return { kind: "unavailable", why: "reading the instructions took too long", known: !1 };
  } finally {
    n.cleanup();
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
