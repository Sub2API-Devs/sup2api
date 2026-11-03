/**
 * services/artifacts/pagePreparation.ts
 *
 * 2.1.316 新增：发布前页面准备（能力解析、正文处理、元数据）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (35)
 * attribution: placement 35
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, pe, oe, kt, E, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { ARTIFACT_SLUG_RE, ArtifactInputError } from "../../tools/ArtifactTool/constants.js";
import {
  getLocalServerName,
  listUnknownCapabilities,
  capListForDisplay,
  sanitizeDisplayText,
  isNewerContractVersion,
  reconcileSelfCapability,
  renameArtifactCapabilityToSelf,
} from "./capabilityDeclaration.js";
import { isFrameDeclaredThumbnailEnabled, isHotUpdateFrozenOn } from "./frameFlags.js";
import { Kxe } from "./frameApi.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { currentRoster, saveRosterToConfig } from "./capabilityRoster.js";
import { plural } from "../../utils/stringUtils.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { resolveContract } from "./contract.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  ir,
  trimHtmlWhitespace,
  skipQuotedAttribute,
  findScriptOpen,
  scriptBlockEnd,
  FRAME_RUNTIME_SENTINELS,
  Dt,
  hasCommentAndScript,
  removeRanges,
  stripMermaidRuntime,
  hasRuntimeSentinels,
  detectPageRuntimes,
  isChartRuntimeEnabled,
  loadChartRuntime,
  mermaidRuntimeBlock,
  loadHighlightRuntime,
  Bi,
  Fi,
  rr,
} from "./pageRuntimes.js";
import { unwrapSkeletonDocument, repairNestedPage, fa } from "./composePage.js";

//@ chunk-06y4szbn.js:48149-49246 placement
var PAGE_BASE_STYLES =
    "body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>",
  ul = "<style>:root{color-scheme:light}" + PAGE_BASE_STYLES,
  fl =
    "<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}" +
    PAGE_BASE_STYLES,
  MERGED_CHANGED_KEEP = 256,
  pl = DoctorLazy(() =>
    u({ contract: o().max(64), capabilities: pe(o().max(64), oe()).nullish(), type: oe().optional() }),
  ),
  hl = DoctorLazy(() =>
    kt({
      slug: o().regex(ARTIFACT_SLUG_RE),
      target: o().max(64).nullish(),
      current: o().max(64),
      latest: oe().optional(),
      blocked: oe().optional(),
    }),
  ),
  gl = DoctorLazy(() => o().min(1).max(64)),
  ml = DoctorLazy(() =>
    kt({
      to: o()
        .min(1)
        .max(64)
        .optional()
        .catch(void 0),
      reason: o().max(64).catch(""),
      conflict_count: E()
        .int()
        .min(0)
        .max(1e6)
        .optional()
        .catch(void 0),
      paths: A(o().max(MAX_ECHO_MANIFEST_PATH))
        .max(MAX_ECHO_MANIFEST_ENTRIES)
        .optional()
        .catch(void 0),
    }),
  ),
  MAX_ECHO_MANIFEST_PATH = 1024,
  MAX_ECHO_MANIFEST_ENTRIES = 4096,
  Ys = DoctorLazy(() =>
    kt({
      manifest: pe(
        o().max(MAX_ECHO_MANIFEST_PATH),
        kt({
          src: kt({}).nullish(),
          doc: o()
            .max(64)
            .nullish()
            .catch(void 0),
        }),
      ).refine((e) => Object.keys(e).length <= MAX_ECHO_MANIFEST_ENTRIES),
    }),
  );
//@ chunk-06y4szbn.js:49246-49429 placement
function splitManifestPaths(e) {
  let safeParse = Ys().safeParse(e);
  if (!safeParse.success) return;
  let r = [],
    s = [];
  for (let [h, b] of Object.entries(safeParse.data.manifest)) (b.src != null ? s : r).push(h);
  return { own: r.sort(), type: s.sort() };
}
//@ chunk-06y4szbn.js:49429-49921 placement
function typeLockFromWire(e) {
  if (e == null) return;
  let safeParse = hl().safeParse(e);
  if (!safeParse.success) return;
  let safeParse_2 = gl().safeParse(safeParse.data.latest),
    blocked = safeParse.data.blocked,
    safeParse_3 = ml().safeParse(blocked);
  return {
    slug: safeParse.data.slug,
    target: safeParse.data.target ?? null,
    current: safeParse.data.current,
    ...(safeParse_2.success && { latest: safeParse_2.data }),
    ...(safeParse_3.success
      ? {
          blocked: {
            ...(safeParse_3.data.to !== void 0 && { to: safeParse_3.data.to }),
            reason: safeParse_3.data.reason,
            ...(safeParse_3.data.conflict_count !== void 0 && {
              conflictCount: safeParse_3.data.conflict_count,
            }),
            ...(safeParse_3.data.paths !== void 0 && { paths: safeParse_3.data.paths }),
          },
        }
      : blocked != null && { blocked: { reason: "" } }),
  };
}
//@ chunk-06y4szbn.js:49921-50107 placement
function readBackTelemetry(e) {
  if (e.status !== void 0) return { readback_status: e.status };
  if (e.relayStatus !== void 0) return { readback_relay_status: e.relayStatus };
  return e.unsent ? { readback_unsent: !0 } : e.request;
}
//@ chunk-06y4szbn.js:50107-50233 placement
function isRetryableReadBack(e) {
  return (
    e.request?.transport === !0 ||
    (e.status !== void 0 && e.status >= 500) ||
    (e.relayStatus !== void 0 && e.relayStatus >= 500)
  );
}
//@ chunk-06y4szbn.js:50233-50244 placement
var READBACK_RETRY_MS = 500;
//@ chunk-06y4szbn.js:50244-50371 placement
function usesLocalMcpServers(e) {
  let n = e?.mcp?.servers;
  return (
    Array.isArray(n) &&
    n.some((r) => typeof r?.server === "string" && getLocalServerName(r.server) !== void 0)
  );
}
//@ chunk-06y4szbn.js:50371-51021 placement
function publishMetadataFields(e) {
  return {
    ...(e.slug && { slug: e.slug }),
    title: e.title,
    ...(e.favicon && { favicon: e.favicon }),
    ...(e.icon && { icon: e.icon }),
    ...(e.label && { label: e.label }),
    ...(e.note && { note: e.note }),
    ...(e.description && { description: e.description }),
    ...(e.publishContext && { publish_context: e.publishContext }),
    ...!1,
    ...(e.template && { template: e.template }),
    ...(e.autoEditAttribution && {
      auto_edit_attribution: {
        thread_id: e.autoEditAttribution.threadId,
        comment_id: e.autoEditAttribution.commentId,
      },
    }),
    ...(isFrameDeclaredThumbnailEnabled() && e.thumbnail && { thumbnail: e.thumbnail.toString("base64") }),
    ...(isFrameDeclaredThumbnailEnabled() &&
      e.thumbnailDark && { thumbnail_dark: e.thumbnailDark.toString("base64") }),
    ...(carriesDeadline(e) && { deadline: e.deadline }),
    ...Kxe(e.requestId),
  };
}
//@ chunk-06y4szbn.js:51021-51086 placement
function carriesDeadline(e) {
  return isHotUpdateFrozenOn() && e.deadline !== void 0 && e.slug !== void 0;
}
//@ chunk-06y4szbn.js:51086-51255 placement
var CONTRACT_FETCH_SUBJECT =
  "a session that is allowed to fetch the contract (when this session is a sandboxed agent acting for the user, the user's own Claude Code session usually is one)";
/**
 * 解析发布请求的能力集：未知能力报错、按契约固定/升级、与页面大小一并决定。
 */
//@ chunk-06y4szbn.js:51255-55026 placement
async function resolvePublishCapabilities(e) {
  let {
      capabilities: capabilities,
      echoPin: echoPin,
      explicitPin: explicitPin,
      upgrade: upgrade,
      pageBytes: pageBytes,
      credentials: credentials,
    } = e,
    x = (C, k, V) => {
      let L = listUnknownCapabilities(C, k);
      if (L.length === 0) return null;
      logFeatureBad("artifact_publish", "unknown_capability", {
        page_bytes: pageBytes,
        unknown_count: L.length,
      });
      let joined = capListForDisplay(L, 8, sanitizeDisplayText).join(", "),
        joined_2 = k.capabilities.join(", "),
        G = V === null ? void 0 : currentRoster()?.roster,
        P =
          V !== null &&
          G !== void 0 &&
          isNewerContractVersion(G.version, k.version) &&
          L.every((j) => G.capabilities.includes(j))
            ? ` ${joined} ${L.length === 1 ? "exists" : "exist"} in contract ${G.version}; this publish is pinned to ${k.version} by ` +
              (V === "passed" ? "the `contract` you passed." : "the artifact's stored contract.")
            : "";
      return `unknown ${plural(L.length, "capability", "capabilities")}: ${joined} \u2014 contract ${k.version} supports: ${joined_2 || "(none)"}.${P} Fix or drop the declaration; the control plane would reject it anyway.`;
    },
    w = (C, k, V, L) => {
      let q = reconcileSelfCapability(C, k);
      if ("errMsg" in q)
        return (logFeatureBad("artifact_publish", "dual_spelling_ambiguous", { page_bytes: pageBytes }), q);
      let W = x(q.caps, k, L);
      if (W !== null) return { errMsg: W };
      return { fields: { contract: V, capabilities: q.caps } };
    },
    R = async (C) => {
      let k = getLiveState(),
        accountEpoch = k.accountEpoch,
        L = await resolveContract({ credentials: credentials });
      if ("err" in L) {
        logFeatureBad("artifact_publish", "contract_fetch_failed", {
          page_bytes: pageBytes,
          cause: fromEnum(L.cause),
        });
        let q = L.cause === "http_4xx" && L.status === 403 && L.proxyDeny !== "content_scan_transient";
        return {
          errMsg:
            `couldn't fetch the capability contract (${L.err}) \u2014 ` +
            (q
              ? `the server, or a proxy in front of it, refused this request, so retrying from this session will usually not help. ${C.refused}`
              : C.retry),
        };
      }
      return (saveRosterToConfig({ session: k, epoch: accountEpoch, roster: L, storageV5: void 0 }), L);
    };
  if (explicitPin !== null) {
    if (capabilities !== void 0) {
      let C = await resolveContract({ version: explicitPin, credentials: credentials });
      if (!("err" in C)) return w(capabilities, C, explicitPin, "passed");
    }
    return {
      fields: {
        contract: explicitPin,
        ...(capabilities !== void 0 && { capabilities: renameArtifactCapabilityToSelf(capabilities) }),
      },
    };
  }
  if (capabilities !== void 0 && echoPin !== null) {
    let C = await resolveContract({ version: echoPin, credentials: credentials });
    if ("err" in C)
      return { fields: { contract: echoPin, capabilities: renameArtifactCapabilityToSelf(capabilities) } };
    return w(capabilities, C, echoPin, "stored");
  }
  if (capabilities !== void 0) {
    let C =
        e.latestFetchRemedy ??
        (Object.keys(capabilities).length === 0
          ? {
              retry:
                "clearing a stored declaration also needs the current " +
                "contract. Retry when the contract service is reachable \u2014 " +
                "until the clear lands, the stored grants stay live.",
              refused: `Nothing was cleared: clearing a stored declaration needs the current contract, so any stored grants are still live. Tell the user that, and that the declaration has to be cleared from ${CONTRACT_FETCH_SUBJECT}.`,
            }
          : {
              retry:
                "a publish that declares capabilities needs the current contract from the server. Retry; or publish without the capabilities field and declare them on a later redeploy (a stored declaration carries forward unchanged).",
              refused: `Nothing was published: a publish that declares capabilities needs the current contract from the server. Tell the user that the declaration has to be published from ${CONTRACT_FETCH_SUBJECT}. Do not publish without the capabilities field unless every capability the page needs is already stored or the user asks: a declaration already stored carries forward unchanged, but capabilities declared for the first time are not granted, so a page that depends on them will not work. If you do publish without the field (and without contract: 'latest' if you passed it), tell the user which capabilities were not granted.`,
            }),
      k = await R(C);
    if ("errMsg" in k) return k;
    return w(capabilities, k, k.version, null);
  }
  if (echoPin !== null) return { fields: { contract: echoPin } };
  if (upgrade) {
    let C = await R({
      retry:
        "an upgrade stamps the current contract, which requires the contract service. Retry when it is reachable.",
      refused: `Nothing was published: an upgrade stamps the current contract. Tell the user that the upgrade has to be published from ${CONTRACT_FETCH_SUBJECT}. To publish the content anyway, publish without the contract field (a stored contract stays as it is; if none is stored the page is published without one).`,
    });
    if ("errMsg" in C) return C;
    return { fields: { contract: C.version } };
  }
  return { fields: {} };
}
//@ chunk-06y4szbn.js:55026-55254 placement
var FRAME_RUNTIME_HEAD_WINDOW = 8192,
  FRAME_RUNTIME_MAX_SPAN = 300000,
  Ss = 'window.__FRAME_PREAMBLE={"v":1',
  regExp_3 = new RegExp(`^<base[\\t\\n\\f\\r ]+href="\\/_f\\/[^">]*"(?:${ir})?[\\t\\n\\f\\r ]*\\/?>`),
  regExp_4 = new RegExp(`<base\\s+href="\\/_f\\/[^">]*"(?:${ir})?\\s*\\/?>\\n?`, "gi");
//@ chunk-06y4szbn.js:55254-55624 placement
function isFramePreambleOnly(e) {
  let n = trimHtmlWhitespace(e),
    match = n.match(regExp_3);
  if (match) n = trimHtmlWhitespace(n.slice(match[0].length));
  else if (!n.length) return !1;
  let s = match !== null;
  while (n.length) {
    if (!/^<script(?=[\t\n\f\r />])/.test(n)) return !1;
    let h = skipQuotedAttribute(n, 7);
    if (h < 0) return !1;
    let sliced = n.slice(h);
    if (
      !s &&
      (findScriptOpen(n, 0) !== h || !sliced.startsWith(Ss) || !",}".includes(sliced[Ss.length] ?? " "))
    )
      return !1;
    s = !0;
    let y = scriptBlockEnd(sliced);
    if (y < 0) return !1;
    n = trimHtmlWhitespace(sliced.slice(y));
  }
  return !0;
}
//@ chunk-06y4szbn.js:55624-55738 placement
function isFrameHeadPreambleOnly(e) {
  let n = trimHtmlWhitespace(e);
  if (n.startsWith("<head>") && n.endsWith("</head>")) return isFramePreambleOnly(n.slice(6, -7));
  return isFramePreambleOnly(n);
}
//@ chunk-06y4szbn.js:55738-56021 placement = resolveMetadataBuf (0.737)
function exciseFrameAssetServeBlock(carry, chunkBuf = () => !0) {
  let r = 4,
    firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS);
  while (firstNl >= 0 && firstNl < FRAME_RUNTIME_HEAD_WINDOW && r > 0) {
    let h = firstNl + FRAME_RUNTIME_SENTINELS.length,
      index = carry.subarray(0, firstNl + FRAME_RUNTIME_MAX_SPAN + Dt.length).indexOf(Dt, h);
    if (index >= 0 && isFrameHeadPreambleOnly(carry.toString("utf8", h, index))) {
      let buffer = Buffer.concat([carry.subarray(0, firstNl), carry.subarray(index + Dt.length)]);
      if (chunkBuf(buffer)) return buffer;
      r--;
    }
    firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS, h);
  }
  return;
}
//@ chunk-06y4szbn.js:56021-56187 placement
var HTML_TAG_PATTERNS = /^<body(?=[\t\n\f\r />])/i,
  As = /^<base(?=[\t\n\f\r />])/i,
  El = /^<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript|plaintext)(?=[\t\n\f\r />])/i;
//@ chunk-06y4szbn.js:56187-57125 placement
function findTagOutsideComments(e, n, r) {
  let s = /[\t\n\f\r />]/g,
    h = r;
  for (;;) {
    if (((h = e.indexOf("<", h)), h < 0)) return -1;
    if (e.startsWith("<!--", h)) {
      let y = -1;
      if (e.startsWith(">", h + 4)) y = h + 5;
      else if (e.startsWith("->", h + 4)) y = h + 6;
      else
        for (let index = e.indexOf("--", h + 4); index >= 0;) {
          if (e.startsWith(">", index + 2)) y = index + 3;
          else if (e.startsWith("!>", index + 2)) y = index + 4;
          else {
            index = e.indexOf("--", index + 1);
            continue;
          }
          break;
        }
      if (y < 0) return -1;
      h = y;
      continue;
    }
    let match = El.exec(e.slice(h, h + 11));
    if (match) {
      let lower = match[1].toLowerCase(),
        x = lower === "plaintext" ? -1 : skipQuotedAttribute(e, h + 1 + lower.length),
        regExp = new RegExp(`</${lower}(?=[\\t\\n\\f\\r />])`, "gi");
      regExp.lastIndex = Math.max(x, 0);
      let R = x < 0 ? null : regExp.exec(e),
        C = R === null ? -1 : skipQuotedAttribute(e, R.index + R[0].length);
      if (C < 0 || (lower === "script" && hasCommentAndScript(e.slice(x, R.index)))) return -1;
      h = C;
    } else if (n.test(e.slice(h, h + 8))) return h;
    else if (/^<\/?[a-zA-Z]/.test(e.slice(h, h + 3))) {
      s.lastIndex = h + 2;
      let match = s.exec(e);
      if (((h = match === null ? -1 : skipQuotedAttribute(e, match.index)), h < 0)) return -1;
    } else if (/^<(?:[?!]|\/(?!>))/.test(e.slice(h, h + 3))) {
      if (((h = e.indexOf(">", h + 2)), h < 0)) return -1;
      h++;
    } else h++;
  }
}
//@ chunk-06y4szbn.js:57125-57173 placement
function stripStaleInjections(e) {
  return Zs(e, findRuntimeBlocks, Ks(STRIP_LIMITS, "blocks"));
}
//@ chunk-06y4szbn.js:57173-57195 placement
var STRIP_LIMITS = 64,
  Sl = 96,
  Xs = 64;
//@ chunk-06y4szbn.js:57195-57246 placement
function Ks(e, n) {
  return { spent: 0, cap: e, exhausted: n };
}
//@ chunk-06y4szbn.js:57246-57325 placement
function spendStripPass(e) {
  if (e.spent === e.cap) throw new StripUnsettledError(e.exhausted, e.spent);
  e.spent++;
}
//@ chunk-06y4szbn.js:57325-57413 placement
class StripUnsettledError extends ArtifactInputError {
  passes;
  constructor(e = "blocks", n) {
    super(Al[e], STRIP_ERROR_TEXT[e]);
    this.passes = n;
  }
}
//@ chunk-06y4szbn.js:57413-58831 placement
var STRIP_ERROR_TEXT = {
    blocks: "strip_unsettled",
    author: "strip_unsettled",
    levels: "nested_repair_depth_cap",
  },
  Al = {
    blocks:
      "This page carries `<!-- frame-runtime -->` serve-marker blocks or `data-frame-runtime` attributes nested so that removing one keeps exposing another \u2014 nothing a genuine page or a fetched artifact contains. Delete those comment blocks and attributes from the source and publish again.",
    author:
      'This page carries runtime-marker comment blocks (`<!-- frame-runtime -->\u2026<!-- /frame-runtime -->`, `<!-- chart-runtime -->\u2026<!-- /chart-runtime -->`, `<!--claude-mermaid-runtime-begin\u2026`, `<!--claude-hljs-runtime-begin\u2026`), `data-frame-runtime` attributes, `<base href="/_f/\u2026">` tags, or repeated artifact skeletons (`<!doctype html><html><head>\u2026` wrapped around the page again and again) nested so that removing one keeps exposing another \u2014 nothing a genuine page or a fetched artifact contains. Delete every such comment block, attribute, tag, and repeated outer skeleton from the source, keep the innermost document, and publish again.',
    levels: `This page is a published artifact page wrapped inside more than ${Xs} nested copies of the artifact skeleton (\`<!doctype html><html><head><!-- frame-runtime -->\u2026\` repeated) \u2014 nothing a genuine page contains. Publish the innermost document on its own: delete the repeated outer skeletons from the source and publish again.`,
  };
//@ chunk-06y4szbn.js:58831-58898 placement
function Zs(e, n, r) {
  for (;;) {
    spendStripPass(r);
    let s = n(e);
    if (s === e) return s;
    e = s;
  }
}
//@ chunk-06y4szbn.js:58898-59272 placement
function findRuntimeBlocks(e) {
  let n = [],
    r = 0,
    s = findTagOutsideComments(e, HTML_TAG_PATTERNS, 0),
    h = s < 0 ? 1 / 0 : s,
    index = e.indexOf(FRAME_RUNTIME_SENTINELS),
    y = -1;
  while (index >= 0 && index < h && index - r < FRAME_RUNTIME_HEAD_WINDOW) {
    let x = index + FRAME_RUNTIME_SENTINELS.length;
    if (y < x) {
      if (((y = e.indexOf(Dt, x)), y < 0)) break;
    }
    let index_2 = e.indexOf(FRAME_RUNTIME_SENTINELS, x);
    if (
      (index_2 < 0 || index_2 > y) &&
      y - index < FRAME_RUNTIME_MAX_SPAN &&
      isFrameHeadPreambleOnly(e.slice(x, y))
    ) {
      let R = y + Dt.length;
      if (
        e[R] ===
        `
`
      )
        R++;
      (n.push([index, R]), (r += R - index));
    }
    index = index_2;
  }
  return (
    (e = kl(removeRanges(e, n))),
    (e = Cl(e)),
    e.replace(regExp_4, "").replace(/\sdata-frame-runtime="[^">]*"/gi, "")
  );
}
//@ chunk-06y4szbn.js:59272-59306 placement
function strippedAuthorBody(e) {
  return stripAuthorInjections(e).body;
}
//@ chunk-06y4szbn.js:59306-59647 placement
function stripAuthorInjections(e) {
  let n = (x) => stripMermaidRuntime(findRuntimeBlocks(x)),
    r = Ks(Sl, "author"),
    s = (x) => Zs(x, n, r),
    h = s(e),
    b = unwrapSkeletonDocument(h);
  if (b === null) return { body: h, unwrapped: !1, passes: r.spent };
  let y = repairNestedPage(b.body, b.lang, b.cover, s, r);
  return {
    body: y.body,
    passes: r.spent,
    lang: y.lang,
    cover: y.cover,
    unwrapped: !0,
    ...(y.outcome && { repair: y.outcome }),
    ...(b.hoistedCommentsDropped && { hoistedCommentsDropped: !0 }),
  };
}
//@ chunk-06y4szbn.js:59647-59768 placement
function servedPageLooksNested(e) {
  let n;
  try {
    n = stripStaleInjections(e);
  } catch (error) {
    if (error instanceof StripUnsettledError) return !1;
    throw error;
  }
  let r = unwrapSkeletonDocument(n);
  return r !== null && fa(r.body);
}
//@ chunk-06y4szbn.js:59768-59813 placement
var Tl = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
//@ chunk-06y4szbn.js:59813-59860 placement
function isValidLangTag(e) {
  return e.length <= 35 && Tl.test(e);
}
//@ chunk-06y4szbn.js:59860-60853 placement
async function prepareArtifactBody(e, n = {}) {
  let {
      injectDiagramRuntime: injectDiagramRuntime,
      injectHighlightRuntime: injectHighlightRuntime,
      expectRoundTrippedPage: expectRoundTrippedPage,
    } = n,
    b = stripAuthorInjections(e),
    { body: body, lang: lang, cover: cover } = b,
    R;
  switch (b.repair) {
    case "repaired":
    case "partial":
      R = b.repair;
      break;
    case "miss":
      logFeatureSad("artifact_publish", "nested_repair_miss");
      break;
    case void 0:
      break;
  }
  if (!b.unwrapped && expectRoundTrippedPage === !0)
    logFeatureSad("artifact_publish", "round_trip_unwrap_miss");
  if (hasRuntimeSentinels(body)) logFeatureSad("artifact_publish", "runtime_sentinel_residual");
  let C = detectPageRuntimes(body),
    k = C.chart && isChartRuntimeEnabled(),
    V = injectDiagramRuntime === !0 && C.mermaid,
    L = injectHighlightRuntime === !0 && C.highlight,
    q = "";
  if (k) {
    let P = await loadChartRuntime();
    if (P !== null) q += P;
  }
  let W = !1;
  if (V) {
    let P = mermaidRuntimeBlock();
    if (P !== null) ((q += P), (W = !0));
  }
  let G = !1;
  if (L) {
    let P = await loadHighlightRuntime();
    if (P !== null) ((q += P), (G = !0));
  }
  if (q !== "") {
    let { runtimeBlockInsertionIndex: runtimeBlockInsertionIndex } = await import("./chunk-1c8ngz3c.js"),
      j = runtimeBlockInsertionIndex(body);
    if (j === void 0) (logFeatureSad("artifact_publish", "runtime_blocks_over_budget"), (W = !1), (G = !1));
    else body = body.slice(0, j) + q + body.slice(j);
  }
  return {
    body: body,
    mermaidInjected: W,
    hljsInjected: G,
    roundTripLang: lang,
    ...(cover !== void 0 && { roundTripCover: cover }),
    unnested: R,
    ...(b.hoistedCommentsDropped && { hoistedCommentsDropped: !0 }),
  };
}
//@ chunk-06y4szbn.js:60853-60884 placement
function kl(e) {
  return findSentinelBlocks(e, Bi);
}
//@ chunk-06y4szbn.js:60884-60915 placement
function Cl(e) {
  return findSentinelBlocks(e, Fi);
}
//@ chunk-06y4szbn.js:60915-61420 placement
function findSentinelBlocks(e, n) {
  let r = [],
    index = e.indexOf(n.beginPrefix);
  while (index >= 0) {
    let h = index + n.beginPrefix.length,
      index_2 = e.indexOf(n.beginPrefix, h),
      y = h,
      x = h + n.lenDigitsMax;
    while (y < x) {
      let code = e.charCodeAt(y);
      if (code < 48 || code > 57) break;
      y++;
    }
    if (y > h && e.startsWith("-->", y)) {
      let w = Number(e.slice(h, y)),
        R = y + 3,
        C = 0,
        k = R + w;
      while (C <= n.openTags && !e.startsWith(n.end, k)) (C++, (k += rr));
      if (w < n.maxSpan && C <= n.openTags && (index_2 < 0 || index_2 > k) && n.validate(e.slice(R, k), C)) {
        let V = k + n.end.length;
        if (
          e[V] ===
          `
`
        )
          V++;
        let L =
          index > 0 &&
          e[index - 1] ===
            `
`
            ? index - 1
            : index;
        r.push([L, V]);
      }
    }
    index = index_2;
  }
  return removeRanges(e, r);
}
//@ chunk-06y4szbn.js:61420-61435 placement
var MAX_PAGE_BYTES_FOR_STRIP = 2097152;

export {
  pl,
  typeLockFromWire,
  MAX_PAGE_BYTES_FOR_STRIP,
  findTagOutsideComments,
  As,
  Ys,
  isValidLangTag,
  fl,
  ul,
  spendStripPass,
  Xs,
  StripUnsettledError,
  FRAME_RUNTIME_HEAD_WINDOW,
  FRAME_RUNTIME_MAX_SPAN,
  prepareArtifactBody,
  isRetryableReadBack,
  readBackTelemetry,
  READBACK_RETRY_MS,
  resolvePublishCapabilities,
  CONTRACT_FETCH_SUBJECT,
  usesLocalMcpServers,
  carriesDeadline,
  publishMetadataFields,
  splitManifestPaths,
  MAX_ECHO_MANIFEST_PATH,
  MAX_ECHO_MANIFEST_ENTRIES,
  strippedAuthorBody,
  stripStaleInjections,
  exciseFrameAssetServeBlock,
  MERGED_CHANGED_KEEP,
  servedPageLooksNested,
};
