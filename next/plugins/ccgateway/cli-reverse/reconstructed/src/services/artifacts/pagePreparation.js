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
import {
  objectSchema,
  stringSchema,
  record,
  unknown,
  looseObject,
  numberSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-06y4szbn.js:48149-49246 placement
/**
 * 页面准备的基础样式与发布状态/契约/阻塞清单的 schema，以及 echo manifest 的路径 1024 / 条目上限。
 */
var PAGE_BASE_STYLES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BASE_STYLE_HEAD;
var BASE_STYLE_HEAD_WITH_SAFE_AREA;
var MERGED_CHANGED_KEEP;
var contractInputSchema;
var publishStatusSchema;
var latestVersionSchema;
var blockedStatusSchema;
var MAX_ECHO_MANIFEST_PATH;
var MAX_ECHO_MANIFEST_ENTRIES;
var echoManifestSchema;
deferInit("chunk-06y4szbn.js:48149", () => {
  PAGE_BASE_STYLES =
    "body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style>";
  BASE_STYLE_HEAD = "<style>:root{color-scheme:light}" + PAGE_BASE_STYLES;
  BASE_STYLE_HEAD_WITH_SAFE_AREA =
    "<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}" +
    PAGE_BASE_STYLES;
  MERGED_CHANGED_KEEP = 256;
  contractInputSchema = DoctorLazy(() =>
    objectSchema({
      contract: stringSchema().max(64),
      capabilities: record(stringSchema().max(64), unknown()).nullish(),
      type: unknown().optional(),
    }),
  );
  publishStatusSchema = DoctorLazy(() =>
    looseObject({
      slug: stringSchema().regex(ARTIFACT_SLUG_RE),
      target: stringSchema().max(64).nullish(),
      current: stringSchema().max(64),
      latest: unknown().optional(),
      blocked: unknown().optional(),
    }),
  );
  latestVersionSchema = DoctorLazy(() => stringSchema().min(1).max(64));
  blockedStatusSchema = DoctorLazy(() =>
    looseObject({
      to: stringSchema().min(1).max(64).optional().catch(undefined),
      reason: stringSchema().max(64).catch(""),
      conflict_count: numberSchema().int().min(0).max(1e6).optional().catch(undefined),
      paths: array(stringSchema().max(MAX_ECHO_MANIFEST_PATH))
        .max(MAX_ECHO_MANIFEST_ENTRIES)
        .optional()
        .catch(undefined),
    }),
  );
  MAX_ECHO_MANIFEST_PATH = 1024;
  MAX_ECHO_MANIFEST_ENTRIES = 4096;
  echoManifestSchema = DoctorLazy(() =>
    looseObject({
      manifest: record(
        stringSchema().max(MAX_ECHO_MANIFEST_PATH),
        looseObject({
          src: looseObject({}).nullish(),
          doc: stringSchema().max(64).nullish().catch(undefined),
        }),
      ).refine((manifest) => Object.keys(manifest).length <= MAX_ECHO_MANIFEST_ENTRIES),
    }),
  );
});
//@ chunk-06y4szbn.js:49246-49429 placement
function splitManifestPaths(body) {
  let parsed = echoManifestSchema().safeParse(body);
  if (!parsed.success) return;
  let ownPaths = [];
  let typePaths = [];
  for (let [key, value] of Object.entries(parsed.data.manifest))
    (value.src != null ? typePaths : ownPaths).push(key);
  return {
    own: ownPaths.sort(),
    type: typePaths.sort(),
  };
}
//@ chunk-06y4szbn.js:49429-49921 placement
function typeLockFromWire(type) {
  if (type == null) return;
  let publishParsed = publishStatusSchema().safeParse(type);
  if (!publishParsed.success) return;
  let versionParsed = latestVersionSchema().safeParse(publishParsed.data.latest);
  let blocked = publishParsed.data.blocked;
  let blockedParsed = blockedStatusSchema().safeParse(blocked);
  return {
    slug: publishParsed.data.slug,
    target: publishParsed.data.target ?? null,
    current: publishParsed.data.current,
    ...(versionParsed.success && {
      latest: versionParsed.data,
    }),
    ...(blockedParsed.success
      ? {
          blocked: {
            ...(blockedParsed.data.to !== undefined && {
              to: blockedParsed.data.to,
            }),
            reason: blockedParsed.data.reason,
            ...(blockedParsed.data.conflict_count !== undefined && {
              conflictCount: blockedParsed.data.conflict_count,
            }),
            ...(blockedParsed.data.paths !== undefined && {
              paths: blockedParsed.data.paths,
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
function usesLocalMcpServers(tool) {
  let servers = tool?.mcp?.servers;
  return (
    Array.isArray(servers) &&
    servers.some(
      (server) => typeof server?.server === "string" && getLocalServerName(server.server) !== undefined,
    )
  );
}
//@ chunk-06y4szbn.js:50371-51021 placement
function publishMetadataFields(response) {
  return {
    ...(response.slug && {
      slug: response.slug,
    }),
    title: response.title,
    ...(response.favicon && {
      favicon: response.favicon,
    }),
    ...(response.icon && {
      icon: response.icon,
    }),
    ...(response.label && {
      label: response.label,
    }),
    ...(response.note && {
      note: response.note,
    }),
    ...(response.description && {
      description: response.description,
    }),
    ...(response.publishContext && {
      publish_context: response.publishContext,
    }),
    ...false,
    ...(response.template && {
      template: response.template,
    }),
    ...(response.autoEditAttribution && {
      auto_edit_attribution: {
        thread_id: response.autoEditAttribution.threadId,
        comment_id: response.autoEditAttribution.commentId,
      },
    }),
    ...(isFrameDeclaredThumbnailEnabled() &&
      response.thumbnail && {
        thumbnail: response.thumbnail.toString("base64"),
      }),
    ...(isFrameDeclaredThumbnailEnabled() &&
      response.thumbnailDark && {
        thumbnail_dark: response.thumbnailDark.toString("base64"),
      }),
    ...(carriesDeadline(response) && {
      deadline: response.deadline,
    }),
    ...requestIdMeta(response.requestId),
  };
}
//@ chunk-06y4szbn.js:51021-51086 placement
function carriesDeadline(request) {
  return isHotUpdateFrozenOn() && request.deadline !== undefined && request.slug !== undefined;
}
//@ chunk-06y4szbn.js:51086-51255 placement
var CONTRACT_FETCH_SUBJECT =
  "a session that is allowed to fetch the contract (when this session is a sandboxed agent acting for the user, the user's own Claude Code session usually is one)";
//@ chunk-06y4szbn.js:51255-55026 placement
/**
 * 解析发布请求的能力集：未知能力报错、按契约固定/升级、与页面大小一并决定。
 */
async function resolvePublishCapabilities(request) {
  let { capabilities, echoPin, explicitPin, upgrade, pageBytes, credentials } = request;
  let unknownCapabilityMessage = (caps, contract, contractSource) => {
    let unknownCaps = listUnknownCapabilities(caps, contract);
    if (unknownCaps.length === 0) return null;
    logFeatureBad("artifact_publish", "unknown_capability", {
      page_bytes: pageBytes,
      unknown_count: unknownCaps.length,
    });
    let joined = capListForDisplay(unknownCaps, 8, sanitizeDisplayText).join(", ");
    let joined_2 = contract.capabilities.join(", ");
    let roster = contractSource === null ? undefined : currentRoster()?.roster;
    let rosterHint =
      contractSource !== null &&
      roster !== undefined &&
      isNewerContractVersion(roster.version, contract.version) &&
      unknownCaps.every((capability) => roster.capabilities.includes(capability))
        ? ` ${joined} ${unknownCaps.length === 1 ? "exists" : "exist"} in contract ${roster.version}; this publish is pinned to ${contract.version} by ` +
          (contractSource === "passed" ? "the `contract` you passed." : "the artifact's stored contract.")
        : "";
    return `unknown ${plural(unknownCaps.length, "capability", "capabilities")}: ${joined} \u2014 contract ${contract.version} supports: ${joined_2 || "(none)"}.${rosterHint} Fix or drop the declaration; the control plane would reject it anyway.`;
  };
  let reconcileCapabilities = (capabilities, contract, contract_2, contractSource) => {
    let reconciled = reconcileSelfCapability(capabilities, contract);
    if ("errMsg" in reconciled) {
      logFeatureBad("artifact_publish", "dual_spelling_ambiguous", {
        page_bytes: pageBytes,
      });
      return reconciled;
    }
    let message = unknownCapabilityMessage(reconciled.caps, contract, contractSource);
    if (message !== null)
      return {
        errMsg: message,
      };
    return {
      fields: {
        contract: contract_2,
        capabilities: reconciled.caps,
      },
    };
  };
  let resolveAgainstContract = async (caps) => {
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
      let outcome =
        contract.cause === "http_4xx" &&
        contract.status === 403 &&
        contract.proxyDeny !== "content_scan_transient";
      return {
        errMsg:
          `couldn't fetch the capability contract (${contract.err}) \u2014 ` +
          (outcome
            ? `the server, or a proxy in front of it, refused this request, so retrying from this session will usually not help. ${caps.refused}`
            : caps.retry),
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
      if (!("err" in contract)) return reconcileCapabilities(capabilities, contract, explicitPin, "passed");
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
    return reconcileCapabilities(capabilities, contract, echoPin, "stored");
  }
  if (capabilities !== undefined) {
    let capsInput =
      request.latestFetchRemedy ??
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
    let firstResult = await resolveAgainstContract(capsInput);
    if ("errMsg" in firstResult) return firstResult;
    return reconcileCapabilities(capabilities, firstResult, firstResult.version, null);
  }
  if (echoPin !== null)
    return {
      fields: {
        contract: echoPin,
      },
    };
  if (upgrade) {
    let secondResult = await resolveAgainstContract({
      retry:
        "an upgrade stamps the current contract, which requires the contract service. Retry when it is reachable.",
      refused: `Nothing was published: an upgrade stamps the current contract. Tell the user that the upgrade has to be published from ${CONTRACT_FETCH_SUBJECT}. To publish the content anyway, publish without the contract field (a stored contract stays as it is; if none is stored the page is published without one).`,
    });
    if ("errMsg" in secondResult) return secondResult;
    return {
      fields: {
        contract: secondResult.version,
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
var FRAME_RUNTIME_HEAD_WINDOW; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FRAME_RUNTIME_MAX_SPAN;
var FRAME_PREAMBLE_PREFIX;
var BASE_HREF_TAG_RE;
var BASE_HREF_STRIP_RE;
deferInit("chunk-06y4szbn.js:55026", () => {
  FRAME_RUNTIME_HEAD_WINDOW = 8192;
  FRAME_RUNTIME_MAX_SPAN = 300000;
  FRAME_PREAMBLE_PREFIX = 'window.__FRAME_PREAMBLE={"v":1';
  BASE_HREF_TAG_RE = new RegExp(
    `^<base[\\t\\n\\f\\r ]+href="\\/_f\\/[^">]*"(?:${DATA_ID_ATTR_PATTERN})?[\\t\\n\\f\\r ]*\\/?>`,
  );
  BASE_HREF_STRIP_RE = new RegExp(
    `<base\\s+href="\\/_f\\/[^">]*"(?:${DATA_ID_ATTR_PATTERN})?\\s*\\/?>\\n?`,
    "gi",
  );
});
//@ chunk-06y4szbn.js:55254-55624 placement
function isFramePreambleOnly(html) {
  let rest = trimHtmlWhitespace(html);
  let match = rest.match(BASE_HREF_TAG_RE);
  if (match) rest = trimHtmlWhitespace(rest.slice(match[0].length));
  else if (!rest.length) return false;
  let sawScript = match !== null;
  while (rest.length) {
    if (!/^<script(?=[\t\n\f\r />])/.test(rest)) return false;
    let openEnd = skipQuotedAttribute(rest, 7);
    if (openEnd < 0) return false;
    let text = rest.slice(openEnd);
    if (
      !sawScript &&
      (findScriptOpen(rest, 0) !== openEnd ||
        !text.startsWith(FRAME_PREAMBLE_PREFIX) ||
        !",}".includes(text[FRAME_PREAMBLE_PREFIX.length] ?? " "))
    )
      return false;
    sawScript = true;
    let blockEnd = scriptBlockEnd(text);
    if (blockEnd < 0) return false;
    rest = trimHtmlWhitespace(text.slice(blockEnd));
  }
  return true;
}
//@ chunk-06y4szbn.js:55624-55738 placement
function isFrameHeadPreambleOnly(html) {
  let trimmed = trimHtmlWhitespace(html);
  if (trimmed.startsWith("<head>") && trimmed.endsWith("</head>"))
    return isFramePreambleOnly(trimmed.slice(6, -7));
  return isFramePreambleOnly(trimmed);
}
//@ chunk-06y4szbn.js:55738-56021 placement = resolveMetadataBuf (0.737)
function exciseFrameAssetServeBlock(carry, chunkBuf = () => true) {
  let offset = 4;
  let firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS);
  while (firstNl >= 0 && firstNl < FRAME_RUNTIME_HEAD_WINDOW && offset > 0) {
    let sentinelsStart = firstNl + FRAME_RUNTIME_SENTINELS.length;
    let index = carry
      .subarray(0, firstNl + FRAME_RUNTIME_MAX_SPAN + FRAME_RUNTIME_END_MARKER.length)
      .indexOf(FRAME_RUNTIME_END_MARKER, sentinelsStart);
    if (index >= 0 && isFrameHeadPreambleOnly(carry.toString("utf8", sentinelsStart, index))) {
      let buffer = Buffer.concat([
        carry.subarray(0, firstNl),
        carry.subarray(index + FRAME_RUNTIME_END_MARKER.length),
      ]);
      if (chunkBuf(buffer)) return buffer;
      offset--;
    }
    firstNl = carry.indexOf(FRAME_RUNTIME_SENTINELS, sentinelsStart);
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
function findTagOutsideComments(text, pattern, from) {
  let nameEndRe = /[\t\n\f\r />]/g;
  let index = from;
  for (;;) {
    index = text.indexOf("<", index);
    if (index < 0) return -1;
    if (text.startsWith("<!--", index)) {
      let commentEnd = -1;
      if (text.startsWith(">", index + 4)) commentEnd = index + 5;
      else if (text.startsWith("->", index + 4)) commentEnd = index + 6;
      else
        for (let index_2 = text.indexOf("--", index + 4); index_2 >= 0;) {
          if (text.startsWith(">", index_2 + 2)) commentEnd = index_2 + 3;
          else if (text.startsWith("!>", index_2 + 2)) commentEnd = index_2 + 4;
          else {
            index_2 = text.indexOf("--", index_2 + 1);
            continue;
          }
          break;
        }
      if (commentEnd < 0) return -1;
      index = commentEnd;
      continue;
    }
    let match = RAW_TEXT_TAG_RE.exec(text.slice(index, index + 11));
    if (match) {
      let lower = match[1].toLowerCase();
      let openEnd = lower === "plaintext" ? -1 : skipQuotedAttribute(text, index + 1 + lower.length);
      let regExp = new RegExp(`</${lower}(?=[\\t\\n\\f\\r />])`, "gi");
      regExp.lastIndex = Math.max(openEnd, 0);
      let closeMatch = openEnd < 0 ? null : regExp.exec(text);
      let closeEnd =
        closeMatch === null ? -1 : skipQuotedAttribute(text, closeMatch.index + closeMatch[0].length);
      if (closeEnd < 0 || (lower === "script" && hasCommentAndScript(text.slice(openEnd, closeMatch.index))))
        return -1;
      index = closeEnd;
    } else if (pattern.test(text.slice(index, index + 8))) return index;
    else if (/^<\/?[a-zA-Z]/.test(text.slice(index, index + 3))) {
      nameEndRe.lastIndex = index + 2;
      let match = nameEndRe.exec(text);
      index = match === null ? -1 : skipQuotedAttribute(text, match.index);
      if (index < 0) return -1;
    } else if (/^<(?:[?!]|\/(?!>))/.test(text.slice(index, index + 3))) {
      index = text.indexOf(">", index + 2);
      if (index < 0) return -1;
      index++;
    } else index++;
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
function spendStripPass(budget) {
  if (budget.spent === budget.cap) throw new StripUnsettledError(budget.exhausted, budget.spent);
  budget.spent++;
}
//@ chunk-06y4szbn.js:57325-57413 placement
let StripUnsettledError; // deferred: uses ArtifactInputError (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-06y4szbn.js:57325", () => {
  StripUnsettledError = class StripUnsettledError extends ArtifactInputError {
    passes;
    constructor(mode = "blocks", passes) {
      super(STRIP_FAILURE_TEXT_BY_KIND[mode], STRIP_ERROR_TEXT[mode]);
      this.passes = passes;
    }
  };
});
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
function stripUntilStable(html, stripOnce, budget) {
  for (;;) {
    spendStripPass(budget);
    let next = stripOnce(html);
    if (next === html) return next;
    html = next;
  }
}
//@ chunk-06y4szbn.js:58898-59272 placement
function findRuntimeBlocks(html) {
  let ranges = [];
  let scannedSpan = 0;
  let tagOutsideComments = findTagOutsideComments(html, HTML_TAG_PATTERNS, 0);
  let headLimit = tagOutsideComments < 0 ? 1 / 0 : tagOutsideComments;
  let index = html.indexOf(FRAME_RUNTIME_SENTINELS);
  let endMarkerAt = -1;
  while (index >= 0 && index < headLimit && index - scannedSpan < FRAME_RUNTIME_HEAD_WINDOW) {
    let searchFrom = index + FRAME_RUNTIME_SENTINELS.length;
    if (endMarkerAt < searchFrom) {
      endMarkerAt = html.indexOf(FRAME_RUNTIME_END_MARKER, searchFrom);
      if (endMarkerAt < 0) break;
    }
    let index_2 = html.indexOf(FRAME_RUNTIME_SENTINELS, searchFrom);
    if (
      (index_2 < 0 || index_2 > endMarkerAt) &&
      endMarkerAt - index < FRAME_RUNTIME_MAX_SPAN &&
      isFrameHeadPreambleOnly(html.slice(searchFrom, endMarkerAt))
    ) {
      let blockEnd = endMarkerAt + FRAME_RUNTIME_END_MARKER.length;
      if (
        html[blockEnd] ===
        `
`
      )
        blockEnd++;
      ranges.push([index, blockEnd]);
      scannedSpan += blockEnd - index;
    }
    index = index_2;
  }
  html = findChartSentinelBlocks(removeRanges(html, ranges));
  html = findMermaidSentinelBlocks(html);
  return html.replace(BASE_HREF_STRIP_RE, "").replace(/\sdata-frame-runtime="[^">]*"/gi, "");
}
//@ chunk-06y4szbn.js:59272-59306 placement
function strippedAuthorBody(html) {
  return stripAuthorInjections(html).body;
}
//@ chunk-06y4szbn.js:59306-59647 placement
function stripAuthorInjections(html) {
  let stripOnce = (value) => stripMermaidRuntime(findRuntimeBlocks(value));
  let stripBudget = newStripBudget(MAX_STRIP_AUTHOR_PASSES, "author");
  let stripStable = (value) => stripUntilStable(value, stripOnce, stripBudget);
  let stripped = stripStable(html);
  let unwrapped = unwrapSkeletonDocument(stripped);
  if (unwrapped === null)
    return {
      body: stripped,
      unwrapped: false,
      passes: stripBudget.spent,
    };
  let repaired = repairNestedPage(unwrapped.body, unwrapped.lang, unwrapped.cover, stripStable, stripBudget);
  return {
    body: repaired.body,
    passes: stripBudget.spent,
    lang: repaired.lang,
    cover: repaired.cover,
    unwrapped: true,
    ...(repaired.outcome && {
      repair: repaired.outcome,
    }),
    ...(unwrapped.hoistedCommentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-06y4szbn.js:59647-59768 placement
function servedPageLooksNested(html) {
  let inputHtml;
  try {
    inputHtml = stripStaleInjections(html);
  } catch (error) {
    if (error instanceof StripUnsettledError) return false;
    throw error;
  }
  let unwrapped = unwrapSkeletonDocument(inputHtml);
  return unwrapped !== null && hasRuntimeSentinelsInHead(unwrapped.body);
}
//@ chunk-06y4szbn.js:59768-59813 placement
var LANGUAGE_TAG_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{1,8})*$/;
//@ chunk-06y4szbn.js:59813-59860 placement
function isValidLangTag(tag) {
  return tag.length <= 35 && LANGUAGE_TAG_RE.test(tag);
}
//@ chunk-06y4szbn.js:59860-60853 placement
async function prepareArtifactBody(html, options = {}) {
  let { injectDiagramRuntime, injectHighlightRuntime, expectRoundTrippedPage } = options;
  let stripped = stripAuthorInjections(html);
  let { body, lang, cover } = stripped;
  let unnested;
  switch (stripped.repair) {
    case "repaired":
    case "partial":
      unnested = stripped.repair;
      break;
    case "miss":
      logFeatureSad("artifact_publish", "nested_repair_miss");
      break;
    case undefined:
      break;
  }
  if (!stripped.unwrapped && expectRoundTrippedPage === true)
    logFeatureSad("artifact_publish", "round_trip_unwrap_miss");
  if (hasRuntimeSentinels(body)) logFeatureSad("artifact_publish", "runtime_sentinel_residual");
  let pageRuntimes = detectPageRuntimes(body);
  let hasChart = pageRuntimes.chart && isChartRuntimeEnabled();
  let mermaid = injectDiagramRuntime === true && pageRuntimes.mermaid;
  let highlight = injectHighlightRuntime === true && pageRuntimes.highlight;
  let runtimeBlocks = "";
  if (hasChart) {
    let chartRuntime = await loadChartRuntime();
    if (chartRuntime !== null) runtimeBlocks += chartRuntime;
  }
  let chartInjected = false;
  if (mermaid) {
    let block = mermaidRuntimeBlock();
    if (block !== null) {
      runtimeBlocks += block;
      chartInjected = true;
    }
  }
  let runtimeAppended = false;
  if (highlight) {
    let highlightRuntime = await loadHighlightRuntime();
    if (highlightRuntime !== null) {
      runtimeBlocks += highlightRuntime;
      runtimeAppended = true;
    }
  }
  if (runtimeBlocks !== "") {
    let { runtimeBlockInsertionIndex } = await import("./htmlRuntimeBlock.js");
    let insertionIndex = runtimeBlockInsertionIndex(body);
    if (insertionIndex === undefined) {
      logFeatureSad("artifact_publish", "runtime_blocks_over_budget");
      chartInjected = false;
      runtimeAppended = false;
    } else body = body.slice(0, insertionIndex) + runtimeBlocks + body.slice(insertionIndex);
  }
  return {
    body,
    mermaidInjected: chartInjected,
    hljsInjected: runtimeAppended,
    roundTripLang: lang,
    ...(cover !== undefined && {
      roundTripCover: cover,
    }),
    unnested,
    ...(stripped.hoistedCommentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-06y4szbn.js:60853-60884 placement
function findChartSentinelBlocks(html) {
  return findSentinelBlocks(html, MERMAID_SENTINEL_LIMITS);
}
//@ chunk-06y4szbn.js:60884-60915 placement
function findMermaidSentinelBlocks(html) {
  return findSentinelBlocks(html, CHART_SENTINEL_LIMITS);
}
//@ chunk-06y4szbn.js:60915-61420 placement
function findSentinelBlocks(html, spec) {
  let ranges = [];
  let index = html.indexOf(spec.beginPrefix);
  while (index >= 0) {
    let prefixEnd = index + spec.beginPrefix.length;
    let index_2 = html.indexOf(spec.beginPrefix, prefixEnd);
    let numEnd = prefixEnd;
    let scanLimit = prefixEnd + spec.lenDigitsMax;
    while (numEnd < scanLimit) {
      let code = html.charCodeAt(numEnd);
      if (code < 48 || code > 57) break;
      numEnd++;
    }
    if (numEnd > prefixEnd && html.startsWith("-->", numEnd)) {
      let length = Number(html.slice(prefixEnd, numEnd));
      let payloadStart = numEnd + 3;
      let skipped = 0;
      let closingAt = payloadStart + length;
      while (skipped <= spec.openTags && !html.startsWith(spec.end, closingAt)) {
        skipped++;
        closingAt += DATA_ID_ATTR_LENGTH;
      }
      if (
        length < spec.maxSpan &&
        skipped <= spec.openTags &&
        (index_2 < 0 || index_2 > closingAt) &&
        spec.validate(html.slice(payloadStart, closingAt), skipped)
      ) {
        let afterEnd = closingAt + spec.end.length;
        if (
          html[afterEnd] ===
          `
`
        )
          afterEnd++;
        let tail =
          index > 0 &&
          html[index - 1] ===
            `
`
            ? index - 1
            : index;
        ranges.push([tail, afterEnd]);
      }
    }
    index = index_2;
  }
  return removeRanges(html, ranges);
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
