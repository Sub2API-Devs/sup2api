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
import { u, string, record, unknown, looseObject, E, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { requestIdMeta } from "./frameApi.js";
import { logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { currentRoster, saveRosterToConfig } from "./capabilityRoster.js";
import { plural } from "../../utils/stringUtils.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { resolveContract } from "./contract.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  DATA_ID_ATTR_PATTERN,
  trimHtmlWhitespace,
  skipQuotedAttribute,
  findScriptOpen,
  scriptBlockEnd,
  FRAME_RUNTIME_SENTINELS,
  FRAME_RUNTIME_END_MARKER,
  hasCommentAndScript,
  removeRanges,
  stripMermaidRuntime,
  hasRuntimeSentinels,
  detectPageRuntimes,
  isChartRuntimeEnabled,
  loadChartRuntime,
  mermaidRuntimeBlock,
  loadHighlightRuntime,
  MERMAID_SENTINEL_LIMITS,
  CHART_SENTINEL_LIMITS,
  DATA_ID_ATTR_LENGTH,
} from "./pageRuntimes.js";
import { unwrapSkeletonDocument, repairNestedPage, hasRuntimeSentinelsInHead } from "./composePage.js";

//@ chunk-06y4szbn.js:48149-49246 placement
/**
 * 页面准备的基础样式与发布状态/契约/阻塞清单的 schema，以及 echo manifest 的路径 1024 / 条目上限。
 */
var PAGE_BASE_STYLES =
  "body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>";
var BASE_STYLE_HEAD = "<style>:root{color-scheme:light}" + PAGE_BASE_STYLES;
var BASE_STYLE_HEAD_WITH_SAFE_AREA =
  "<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}" +
  PAGE_BASE_STYLES;
var MERGED_CHANGED_KEEP = 256;
var contractInputSchema = DoctorLazy(() =>
  u({
    contract: string().max(64),
    capabilities: record(string().max(64), unknown()).nullish(),
    type: unknown().optional(),
  }),
);
var publishStatusSchema = DoctorLazy(() =>
  looseObject({
    slug: string().regex(ARTIFACT_SLUG_RE),
    target: string().max(64).nullish(),
    current: string().max(64),
    latest: unknown().optional(),
    blocked: unknown().optional(),
  }),
);
var latestVersionSchema = DoctorLazy(() => string().min(1).max(64));
var blockedStatusSchema = DoctorLazy(() =>
  looseObject({
    to: string().min(1).max(64).optional().catch(undefined),
    reason: string().max(64).catch(""),
    conflict_count: E().int().min(0).max(1e6).optional().catch(undefined),
    paths: array(string().max(MAX_ECHO_MANIFEST_PATH))
      .max(MAX_ECHO_MANIFEST_ENTRIES)
      .optional()
      .catch(undefined),
  }),
);
var MAX_ECHO_MANIFEST_PATH = 1024;
var MAX_ECHO_MANIFEST_ENTRIES = 4096;
var echoManifestSchema = DoctorLazy(() =>
  looseObject({
    manifest: record(
      string().max(MAX_ECHO_MANIFEST_PATH),
      looseObject({
        src: looseObject({}).nullish(),
        doc: string().max(64).nullish().catch(undefined),
      }),
    ).refine((e) => Object.keys(e).length <= MAX_ECHO_MANIFEST_ENTRIES),
  }),
);
//@ chunk-06y4szbn.js:49246-49429 placement
function splitManifestPaths(e) {
  let n = echoManifestSchema().safeParse(e);
  if (!n.success) return;
  let r = [];
  let s = [];
  for (let [key, value] of Object.entries(n.data.manifest)) (value.src != null ? s : r).push(key);
  return {
    own: r.sort(),
    type: s.sort(),
  };
}
//@ chunk-06y4szbn.js:49429-49921 placement
function typeLockFromWire(type) {
  if (type == null) return;
  let n = publishStatusSchema().safeParse(type);
  if (!n.success) return;
  let r = latestVersionSchema().safeParse(n.data.latest);
  let blocked = n.data.blocked;
  let h = blockedStatusSchema().safeParse(blocked);
  return {
    slug: n.data.slug,
    target: n.data.target ?? null,
    current: n.data.current,
    ...(r.success && {
      latest: r.data,
    }),
    ...(h.success
      ? {
          blocked: {
            ...(h.data.to !== undefined && {
              to: h.data.to,
            }),
            reason: h.data.reason,
            ...(h.data.conflict_count !== undefined && {
              conflictCount: h.data.conflict_count,
            }),
            ...(h.data.paths !== undefined && {
              paths: h.data.paths,
            }),
          },
        }
      : blocked != null && {
          blocked: {
            reason: "",
          },
        }),
  };
}
//@ chunk-06y4szbn.js:49921-50107 placement
function readBackTelemetry(frameDecl) {
  if (frameDecl.status !== undefined)
    return {
      readback_status: frameDecl.status,
    };
  if (frameDecl.relayStatus !== undefined)
    return {
      readback_relay_status: frameDecl.relayStatus,
    };
  return frameDecl.unsent
    ? {
        readback_unsent: true,
      }
    : frameDecl.request;
}
//@ chunk-06y4szbn.js:50107-50233 placement
function isRetryableReadBack(frameDecl) {
  return (
    frameDecl.request?.transport === true ||
    (frameDecl.status !== undefined && frameDecl.status >= 500) ||
    (frameDecl.relayStatus !== undefined && frameDecl.relayStatus >= 500)
  );
}
//@ chunk-06y4szbn.js:50233-50244 placement
var READBACK_RETRY_MS = 500;
//@ chunk-06y4szbn.js:50244-50371 placement
function usesLocalMcpServers(e) {
  let servers = e?.mcp?.servers;
  return (
    Array.isArray(servers) &&
    servers.some(
      (server) => typeof server?.server === "string" && getLocalServerName(server.server) !== undefined,
    )
  );
}
//@ chunk-06y4szbn.js:50371-51021 placement
function publishMetadataFields(e) {
  return {
    ...(e.slug && {
      slug: e.slug,
    }),
    title: e.title,
    ...(e.favicon && {
      favicon: e.favicon,
    }),
    ...(e.icon && {
      icon: e.icon,
    }),
    ...(e.label && {
      label: e.label,
    }),
    ...(e.note && {
      note: e.note,
    }),
    ...(e.description && {
      description: e.description,
    }),
    ...(e.publishContext && {
      publish_context: e.publishContext,
    }),
    ...false,
    ...(e.template && {
      template: e.template,
    }),
    ...(e.autoEditAttribution && {
      auto_edit_attribution: {
        thread_id: e.autoEditAttribution.threadId,
        comment_id: e.autoEditAttribution.commentId,
      },
    }),
    ...(isFrameDeclaredThumbnailEnabled() &&
      e.thumbnail && {
        thumbnail: e.thumbnail.toString("base64"),
      }),
    ...(isFrameDeclaredThumbnailEnabled() &&
      e.thumbnailDark && {
        thumbnail_dark: e.thumbnailDark.toString("base64"),
      }),
    ...(carriesDeadline(e) && {
      deadline: e.deadline,
    }),
    ...requestIdMeta(e.requestId),
  };
}
//@ chunk-06y4szbn.js:51021-51086 placement
function carriesDeadline(e) {
  return isHotUpdateFrozenOn() && e.deadline !== undefined && e.slug !== undefined;
}
//@ chunk-06y4szbn.js:51086-51255 placement
var CONTRACT_FETCH_SUBJECT =
  "a session that is allowed to fetch the contract (when this session is a sandboxed agent acting for the user, the user's own Claude Code session usually is one)";
//@ chunk-06y4szbn.js:51255-55026 placement
/**
 * 解析发布请求的能力集：未知能力报错、按契约固定/升级、与页面大小一并决定。
 */
async function resolvePublishCapabilities(e) {
  let { capabilities, echoPin, explicitPin, upgrade, pageBytes, credentials } = e;
  let x = (caps, k, V) => {
    let L = listUnknownCapabilities(caps, k);
    if (L.length === 0) return null;
    logFeatureBad("artifact_publish", "unknown_capability", {
      page_bytes: pageBytes,
      unknown_count: L.length,
    });
    let joined = capListForDisplay(L, 8, sanitizeDisplayText).join(", ");
    let joined_2 = k.capabilities.join(", ");
    let roster = V === null ? undefined : currentRoster()?.roster;
    let P =
      V !== null &&
      roster !== undefined &&
      isNewerContractVersion(roster.version, k.version) &&
      L.every((j) => roster.capabilities.includes(j))
        ? ` ${joined} ${L.length === 1 ? "exists" : "exist"} in contract ${roster.version}; this publish is pinned to ${k.version} by ` +
          (V === "passed" ? "the `contract` you passed." : "the artifact's stored contract.")
        : "";
    return `unknown ${plural(L.length, "capability", "capabilities")}: ${joined} \u2014 contract ${k.version} supports: ${joined_2 || "(none)"}.${P} Fix or drop the declaration; the control plane would reject it anyway.`;
  };
  let w = (capabilities, contract, contract_2, L) => {
    let q = reconcileSelfCapability(capabilities, contract);
    if ("errMsg" in q) {
      logFeatureBad("artifact_publish", "dual_spelling_ambiguous", {
        page_bytes: pageBytes,
      });
      return q;
    }
    let W = x(q.caps, contract, L);
    if (W !== null)
      return {
        errMsg: W,
      };
    return {
      fields: {
        contract: contract_2,
        capabilities: q.caps,
      },
    };
  };
  let R = async (C) => {
    let liveState = getLiveState();
    let epoch = liveState.accountEpoch;
    let contract = await resolveContract({
      credentials,
    });
    if ("err" in contract) {
      logFeatureBad("artifact_publish", "contract_fetch_failed", {
        page_bytes: pageBytes,
        cause: fromEnum(contract.cause),
      });
      let q =
        contract.cause === "http_4xx" &&
        contract.status === 403 &&
        contract.proxyDeny !== "content_scan_transient";
      return {
        errMsg:
          `couldn't fetch the capability contract (${contract.err}) \u2014 ` +
          (q
            ? `the server, or a proxy in front of it, refused this request, so retrying from this session will usually not help. ${C.refused}`
            : C.retry),
      };
    }
    saveRosterToConfig({
      session: liveState,
      epoch,
      roster: contract,
      storageV5: undefined,
    });
    return contract;
  };
  if (explicitPin !== null) {
    if (capabilities !== undefined) {
      let contract = await resolveContract({
        version: explicitPin,
        credentials,
      });
      if (!("err" in contract)) return w(capabilities, contract, explicitPin, "passed");
    }
    return {
      fields: {
        contract: explicitPin,
        ...(capabilities !== undefined && {
          capabilities: renameArtifactCapabilityToSelf(capabilities),
        }),
      },
    };
  }
  if (capabilities !== undefined && echoPin !== null) {
    let contract = await resolveContract({
      version: echoPin,
      credentials,
    });
    if ("err" in contract)
      return {
        fields: {
          contract: echoPin,
          capabilities: renameArtifactCapabilityToSelf(capabilities),
        },
      };
    return w(capabilities, contract, echoPin, "stored");
  }
  if (capabilities !== undefined) {
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
          });
    let k = await R(C);
    if ("errMsg" in k) return k;
    return w(capabilities, k, k.version, null);
  }
  if (echoPin !== null)
    return {
      fields: {
        contract: echoPin,
      },
    };
  if (upgrade) {
    let C = await R({
      retry:
        "an upgrade stamps the current contract, which requires the contract service. Retry when it is reachable.",
      refused: `Nothing was published: an upgrade stamps the current contract. Tell the user that the upgrade has to be published from ${CONTRACT_FETCH_SUBJECT}. To publish the content anyway, publish without the contract field (a stored contract stays as it is; if none is stored the page is published without one).`,
    });
    if ("errMsg" in C) return C;
    return {
      fields: {
        contract: C.version,
      },
    };
  }
  return {
    fields: {},
  };
}
//@ chunk-06y4szbn.js:55026-55254 placement
/**
 * 页面运行时（frame-runtime / base href / preamble）识别的窗口 8192 字符、最大跨度 5 分钟与相关正则。
 */
var FRAME_RUNTIME_HEAD_WINDOW = 8192;
var FRAME_RUNTIME_MAX_SPAN = 300000;
var FRAME_PREAMBLE_PREFIX = 'window.__FRAME_PREAMBLE={"v":1';
var BASE_HREF_TAG_RE = new RegExp(
  `^<base[\\t\\n\\f\\r ]+href="\\/_f\\/[^">]*"(?:${DATA_ID_ATTR_PATTERN})?[\\t\\n\\f\\r ]*\\/?>`,
);
var BASE_HREF_STRIP_RE = new RegExp(
  `<base\\s+href="\\/_f\\/[^">]*"(?:${DATA_ID_ATTR_PATTERN})?\\s*\\/?>\\n?`,
  "gi",
);
//@ chunk-06y4szbn.js:55254-55624 placement
function isFramePreambleOnly(e) {
  let n = trimHtmlWhitespace(e);
  let match = n.match(BASE_HREF_TAG_RE);
  if (match) n = trimHtmlWhitespace(n.slice(match[0].length));
  else if (!n.length) return false;
  let s = match !== null;
  while (n.length) {
    if (!/^<script(?=[\t\n\f\r />])/.test(n)) return false;
    let h = skipQuotedAttribute(n, 7);
    if (h < 0) return false;
    let sliced = n.slice(h);
    if (
      !s &&
      (findScriptOpen(n, 0) !== h ||
        !sliced.startsWith(FRAME_PREAMBLE_PREFIX) ||
        !",}".includes(sliced[FRAME_PREAMBLE_PREFIX.length] ?? " "))
    )
      return false;
    s = true;
    let y = scriptBlockEnd(sliced);
    if (y < 0) return false;
    n = trimHtmlWhitespace(sliced.slice(y));
  }
  return true;
}
//@ chunk-06y4szbn.js:55624-55738 placement
function isFrameHeadPreambleOnly(e) {
  let n = trimHtmlWhitespace(e);
  if (n.startsWith("<head>") && n.endsWith("</head>")) return isFramePreambleOnly(n.slice(6, -7));
  return isFramePreambleOnly(n);
}
//@ chunk-06y4szbn.js:55738-56021 placement = resolveMetadataBuf (0.737)
function exciseFrameAssetServeBlock(carry, chunkBuf = () => true) {
  let r = 4;
  let firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS);
  while (firstNl >= 0 && firstNl < FRAME_RUNTIME_HEAD_WINDOW && r > 0) {
    let h = firstNl + FRAME_RUNTIME_SENTINELS.length;
    let index = carry
      .subarray(0, firstNl + FRAME_RUNTIME_MAX_SPAN + FRAME_RUNTIME_END_MARKER.length)
      .indexOf(FRAME_RUNTIME_END_MARKER, h);
    if (index >= 0 && isFrameHeadPreambleOnly(carry.toString("utf8", h, index))) {
      let buffer = Buffer.concat([
        carry.subarray(0, firstNl),
        carry.subarray(index + FRAME_RUNTIME_END_MARKER.length),
      ]);
      if (chunkBuf(buffer)) return buffer;
      r--;
    }
    firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS, h);
  }
  return;
}
//@ chunk-06y4szbn.js:56021-56187 placement
/**
 * HTML 开标签识别正则（body、base、原始文本元素）。
 */
var HTML_TAG_PATTERNS = /^<body(?=[\t\n\f\r />])/i;
var BASE_TAG_RE = /^<base(?=[\t\n\f\r />])/i;
var RAW_TEXT_TAG_RE =
  /^<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript|plaintext)(?=[\t\n\f\r />])/i;
//@ chunk-06y4szbn.js:56187-57125 placement
function findTagOutsideComments(e, n, r) {
  let s = /[\t\n\f\r />]/g;
  let h = r;
  for (;;) {
    h = e.indexOf("<", h);
    if (h < 0) return -1;
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
    let match = RAW_TEXT_TAG_RE.exec(e.slice(h, h + 11));
    if (match) {
      let lower = match[1].toLowerCase();
      let x = lower === "plaintext" ? -1 : skipQuotedAttribute(e, h + 1 + lower.length);
      let regExp = new RegExp(`</${lower}(?=[\\t\\n\\f\\r />])`, "gi");
      regExp.lastIndex = Math.max(x, 0);
      let R = x < 0 ? null : regExp.exec(e);
      let C = R === null ? -1 : skipQuotedAttribute(e, R.index + R[0].length);
      if (C < 0 || (lower === "script" && hasCommentAndScript(e.slice(x, R.index)))) return -1;
      h = C;
    } else if (n.test(e.slice(h, h + 8))) return h;
    else if (/^<\/?[a-zA-Z]/.test(e.slice(h, h + 3))) {
      s.lastIndex = h + 2;
      let match = s.exec(e);
      h = match === null ? -1 : skipQuotedAttribute(e, match.index);
      if (h < 0) return -1;
    } else if (/^<(?:[?!]|\/(?!>))/.test(e.slice(h, h + 3))) {
      h = e.indexOf(">", h + 2);
      if (h < 0) return -1;
      h++;
    } else h++;
  }
}
//@ chunk-06y4szbn.js:57125-57173 placement
function stripStaleInjections(html) {
  return stripUntilStable(html, findRuntimeBlocks, newStripBudget(STRIP_LIMITS, "blocks"));
}
//@ chunk-06y4szbn.js:57173-57195 placement
/**
 * 去除运行时标记时的迭代上限（64/96/64）。
 */
var STRIP_LIMITS = 64;
var MAX_STRIP_AUTHOR_PASSES = 96;
var MAX_NESTED_SKELETON_LEVELS = 64;
//@ chunk-06y4szbn.js:57195-57246 placement
function newStripBudget(cap, exhausted) {
  return {
    spent: 0,
    cap,
    exhausted,
  };
}
//@ chunk-06y4szbn.js:57246-57325 placement
function spendStripPass(e) {
  if (e.spent === e.cap) throw new StripUnsettledError(e.exhausted, e.spent);
  e.spent++;
}
//@ chunk-06y4szbn.js:57325-57413 placement
class StripUnsettledError extends ArtifactInputError {
  passes;
  constructor(e = "blocks", passes) {
    super(STRIP_FAILURE_TEXT_BY_KIND[e], STRIP_ERROR_TEXT[e]);
    this.passes = passes;
  }
}
//@ chunk-06y4szbn.js:57413-58831 placement
/**
 * 页面剥除运行时标记失败的错误说明：blocks/author 两类说明与嵌套层级超限说明。
 */
var STRIP_ERROR_TEXT = {
  blocks: "strip_unsettled",
  author: "strip_unsettled",
  levels: "nested_repair_depth_cap",
};
var STRIP_FAILURE_TEXT_BY_KIND = {
  blocks:
    "This page carries `<!-- frame-runtime -->` serve-marker blocks or `data-frame-runtime` attributes nested so that removing one keeps exposing another \u2014 nothing a genuine page or a fetched artifact contains. Delete those comment blocks and attributes from the source and publish again.",
  author:
    'This page carries runtime-marker comment blocks (`<!-- frame-runtime -->\u2026<!-- /frame-runtime -->`, `<!-- chart-runtime -->\u2026<!-- /chart-runtime -->`, `<!--claude-mermaid-runtime-begin\u2026`, `<!--claude-hljs-runtime-begin\u2026`), `data-frame-runtime` attributes, `<base href="/_f/\u2026">` tags, or repeated artifact skeletons (`<!doctype html><html><head>\u2026` wrapped around the page again and again) nested so that removing one keeps exposing another \u2014 nothing a genuine page or a fetched artifact contains. Delete every such comment block, attribute, tag, and repeated outer skeleton from the source, keep the innermost document, and publish again.',
  levels: `This page is a published artifact page wrapped inside more than ${MAX_NESTED_SKELETON_LEVELS} nested copies of the artifact skeleton (\`<!doctype html><html><head><!-- frame-runtime -->\u2026\` repeated) \u2014 nothing a genuine page contains. Publish the innermost document on its own: delete the repeated outer skeletons from the source and publish again.`,
};
//@ chunk-06y4szbn.js:58831-58898 placement
function stripUntilStable(e, n, stripBudget) {
  for (;;) {
    spendStripPass(stripBudget);
    let s = n(e);
    if (s === e) return s;
    e = s;
  }
}
//@ chunk-06y4szbn.js:58898-59272 placement
function findRuntimeBlocks(e) {
  let n = [];
  let r = 0;
  let tagOutsideComments = findTagOutsideComments(e, HTML_TAG_PATTERNS, 0);
  let h = tagOutsideComments < 0 ? 1 / 0 : tagOutsideComments;
  let index = e.indexOf(FRAME_RUNTIME_SENTINELS);
  let y = -1;
  while (index >= 0 && index < h && index - r < FRAME_RUNTIME_HEAD_WINDOW) {
    let x = index + FRAME_RUNTIME_SENTINELS.length;
    if (y < x) {
      y = e.indexOf(FRAME_RUNTIME_END_MARKER, x);
      if (y < 0) break;
    }
    let index_2 = e.indexOf(FRAME_RUNTIME_SENTINELS, x);
    if (
      (index_2 < 0 || index_2 > y) &&
      y - index < FRAME_RUNTIME_MAX_SPAN &&
      isFrameHeadPreambleOnly(e.slice(x, y))
    ) {
      let R = y + FRAME_RUNTIME_END_MARKER.length;
      if (
        e[R] ===
        `
`
      )
        R++;
      n.push([index, R]);
      r += R - index;
    }
    index = index_2;
  }
  e = findChartSentinelBlocks(removeRanges(e, n));
  e = findMermaidSentinelBlocks(e);
  return e.replace(BASE_HREF_STRIP_RE, "").replace(/\sdata-frame-runtime="[^">]*"/gi, "");
}
//@ chunk-06y4szbn.js:59272-59306 placement
function strippedAuthorBody(e) {
  return stripAuthorInjections(e).body;
}
//@ chunk-06y4szbn.js:59306-59647 placement
function stripAuthorInjections(e) {
  let n = (x) => stripMermaidRuntime(findRuntimeBlocks(x));
  let stripBudget = newStripBudget(MAX_STRIP_AUTHOR_PASSES, "author");
  let s = (x) => stripUntilStable(x, n, stripBudget);
  let h = s(e);
  let b = unwrapSkeletonDocument(h);
  if (b === null)
    return {
      body: h,
      unwrapped: false,
      passes: stripBudget.spent,
    };
  let y = repairNestedPage(b.body, b.lang, b.cover, s, stripBudget);
  return {
    body: y.body,
    passes: stripBudget.spent,
    lang: y.lang,
    cover: y.cover,
    unwrapped: true,
    ...(y.outcome && {
      repair: y.outcome,
    }),
    ...(b.hoistedCommentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-06y4szbn.js:59647-59768 placement
function servedPageLooksNested(html) {
  let n;
  try {
    n = stripStaleInjections(html);
  } catch (error) {
    if (error instanceof StripUnsettledError) return false;
    throw error;
  }
  let r = unwrapSkeletonDocument(n);
  return r !== null && hasRuntimeSentinelsInHead(r.body);
}
//@ chunk-06y4szbn.js:59768-59813 placement
var LANGUAGE_TAG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
//@ chunk-06y4szbn.js:59813-59860 placement
function isValidLangTag(e) {
  return e.length <= 35 && LANGUAGE_TAG_RE.test(e);
}
//@ chunk-06y4szbn.js:59860-60853 placement
async function prepareArtifactBody(e, n = {}) {
  let { injectDiagramRuntime, injectHighlightRuntime, expectRoundTrippedPage } = n;
  let b = stripAuthorInjections(e);
  let { body, lang, cover } = b;
  let unnested;
  switch (b.repair) {
    case "repaired":
    case "partial":
      unnested = b.repair;
      break;
    case "miss":
      logFeatureSad("artifact_publish", "nested_repair_miss");
      break;
    case undefined:
      break;
  }
  if (!b.unwrapped && expectRoundTrippedPage === true)
    logFeatureSad("artifact_publish", "round_trip_unwrap_miss");
  if (hasRuntimeSentinels(body)) logFeatureSad("artifact_publish", "runtime_sentinel_residual");
  let pageRuntimes = detectPageRuntimes(body);
  let k = pageRuntimes.chart && isChartRuntimeEnabled();
  let mermaid = injectDiagramRuntime === true && pageRuntimes.mermaid;
  let highlight = injectHighlightRuntime === true && pageRuntimes.highlight;
  let q = "";
  if (k) {
    let chartRuntime = await loadChartRuntime();
    if (chartRuntime !== null) q += chartRuntime;
  }
  let W = false;
  if (mermaid) {
    let P = mermaidRuntimeBlock();
    if (P !== null) {
      q += P;
      W = true;
    }
  }
  let G = false;
  if (highlight) {
    let highlightRuntime = await loadHighlightRuntime();
    if (highlightRuntime !== null) {
      q += highlightRuntime;
      G = true;
    }
  }
  if (q !== "") {
    let { runtimeBlockInsertionIndex } = await import("./chunk-1c8ngz3c.js");
    let j = runtimeBlockInsertionIndex(body);
    if (j === undefined) {
      logFeatureSad("artifact_publish", "runtime_blocks_over_budget");
      W = false;
      G = false;
    } else body = body.slice(0, j) + q + body.slice(j);
  }
  return {
    body,
    mermaidInjected: W,
    hljsInjected: G,
    roundTripLang: lang,
    ...(cover !== undefined && {
      roundTripCover: cover,
    }),
    unnested,
    ...(b.hoistedCommentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-06y4szbn.js:60853-60884 placement
function findChartSentinelBlocks(e) {
  return findSentinelBlocks(e, MERMAID_SENTINEL_LIMITS);
}
//@ chunk-06y4szbn.js:60884-60915 placement
function findMermaidSentinelBlocks(e) {
  return findSentinelBlocks(e, CHART_SENTINEL_LIMITS);
}
//@ chunk-06y4szbn.js:60915-61420 placement
function findSentinelBlocks(e, n) {
  let r = [];
  let index = e.indexOf(n.beginPrefix);
  while (index >= 0) {
    let h = index + n.beginPrefix.length;
    let index_2 = e.indexOf(n.beginPrefix, h);
    let y = h;
    let x = h + n.lenDigitsMax;
    while (y < x) {
      let code = e.charCodeAt(y);
      if (code < 48 || code > 57) break;
      y++;
    }
    if (y > h && e.startsWith("-->", y)) {
      let w = Number(e.slice(h, y));
      let R = y + 3;
      let C = 0;
      let k = R + w;
      while (C <= n.openTags && !e.startsWith(n.end, k)) {
        C++;
        k += DATA_ID_ATTR_LENGTH;
      }
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
  contractInputSchema,
  typeLockFromWire,
  MAX_PAGE_BYTES_FOR_STRIP,
  findTagOutsideComments,
  BASE_TAG_RE,
  echoManifestSchema,
  isValidLangTag,
  BASE_STYLE_HEAD_WITH_SAFE_AREA,
  BASE_STYLE_HEAD,
  spendStripPass,
  MAX_NESTED_SKELETON_LEVELS,
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
