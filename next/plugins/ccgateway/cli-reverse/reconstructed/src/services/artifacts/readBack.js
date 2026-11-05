/**
 * services/artifacts/readBack.ts
 *
 * 2.1.316 新增：发布后回读与 base href 说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (12)
 * attribution: placement 12
 */
import {
  contractInputSchema,
  typeLockFromWire,
  MAX_PAGE_BYTES_FOR_STRIP,
  findTagOutsideComments,
  BASE_TAG_RE,
} from "./pagePreparation.js";
import { logForDebugging } from "../../utils/debug.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders, getTransportErrorProps } from "./frameApi.js";
import { errBody } from "./publishErrors.js";
import { isNonEmptyObject, parseContractVersion } from "./capabilityDeclaration.js";
import { skipQuotedAttribute } from "./pageRuntimes.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { baseMediaType } from "./contentTypes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { ARTIFACT_MAX_RESULT_SIZE_CHARS } from "../../tools/ArtifactTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:63687-63943 placement
function storedDeclFromWire(wire) {
  let parsed = contractInputSchema().safeParse(wire);
  if (!parsed.success) {
    logForDebugging(`[artifact] malformed read-back body: ${parsed.error.message}`);
    return;
  }
  let { contract, capabilities } = parsed.data;
  let typeLock = typeLockFromWire(parsed.data.type);
  return {
    contract,
    ...(capabilities != null && {
      capabilities,
    }),
    ...(typeLock !== undefined && {
      typeLock,
    }),
  };
}
//@ chunk-51jy8ztq.js:63943-64652 placement
async function readFrameDecl(slug, signal, credentials) {
  let startTime = performance.now();
  try {
    let response = await frameApi.get(`/api/frame/read/${encodeURIComponent(slug)}`, {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
      ...(signal && {
        signal,
      }),
      credentials,
    });
    if (!response.ok)
      return {
        err: `read-back unavailable: ${response.reason}`,
        unsent: true,
      };
    if (!response.fromFrame)
      return {
        err: `read-back relay HTTP ${response.status}`,
        relayStatus: response.status,
      };
    if (response.status === 404) return null;
    if (response.status < 200 || response.status >= 300) {
      logForDebugging(`[artifact] read-back ${response.status}: ${errBody(response.data)}`);
      return {
        err: `read-back HTTP ${response.status}`,
        status: response.status,
      };
    }
    let decl = storedDeclFromWire(response.data);
    if (decl === undefined)
      return {
        err: "malformed read-back body",
        status: response.status,
      };
    return decl;
  } catch (error) {
    return {
      err: error instanceof Error ? error.message : String(error),
      request: getTransportErrorProps(error, startTime),
    };
  }
}
//@ chunk-51jy8ztq.js:64652-65082 placement
async function readBackAfterPublish(published, slug, credentials, signal) {
  let result = await published;
  if (result.err !== null || slug === undefined || result.readBackEchoed) return result;
  let frameDecl = await readFrameDecl(slug, signal, credentials);
  if (frameDecl === null || "err" in frameDecl) {
    if (frameDecl !== null) logForDebugging(`[artifact] read-back skipped: ${frameDecl.err}`);
    return result;
  }
  let { typeLock, ...rest } = frameDecl;
  let merged =
    typeLock !== undefined
      ? {
          ...result,
          typeLock,
        }
      : result;
  if (
    result.stored?.capabilities !== undefined ||
    (!isNonEmptyObject(rest.capabilities ?? undefined) && parseContractVersion(rest.contract) === null)
  )
    return merged;
  return {
    ...merged,
    stored: {
      ...rest,
      ...(isNonEmptyObject(rest.capabilities ?? undefined) && {
        carried: true,
      }),
    },
  };
}
//@ chunk-51jy8ztq.js:65082-65644 placement
function readBaseHref(html) {
  let spaceRe = /[\t\n\f\r ]/;
  let tagOutsideComments = findTagOutsideComments(html, BASE_TAG_RE, 0);
  while (tagOutsideComments >= 0) {
    let tagEnd = skipQuotedAttribute(html, tagOutsideComments + 5);
    if (tagEnd < 0) return;
    let cursor = tagOutsideComments + 5;
    while (cursor < tagEnd - 1) {
      let ch = html[cursor];
      if (spaceRe.test(ch) || ch === "/") {
        cursor++;
        continue;
      }
      let nameStart = cursor++;
      while (cursor < tagEnd - 1 && !spaceRe.test(html[cursor]) && !"/=".includes(html[cursor])) cursor++;
      let lower = html.slice(nameStart, cursor).toLowerCase();
      while (cursor < tagEnd - 1 && spaceRe.test(html[cursor])) cursor++;
      if (html[cursor] !== "=") continue;
      cursor++;
      while (cursor < tagEnd - 1 && spaceRe.test(html[cursor])) cursor++;
      let valueStart = cursor;
      let valueEnd;
      let quote = html[cursor];
      if (quote === '"' || quote === "'") {
        let index = html.indexOf(quote, cursor + 1);
        cursor = index < 0 ? tagEnd : index + 1;
        valueEnd = html.slice(valueStart + 1, cursor - 1);
      } else {
        while (cursor < tagEnd - 1 && !spaceRe.test(html[cursor])) cursor++;
        valueEnd = html.slice(valueStart, cursor);
      }
      if (lower === "href") {
        if (!valueEnd.startsWith("/_f/")) return valueEnd;
        break;
      }
    }
    tagOutsideComments = findTagOutsideComments(html, BASE_TAG_RE, tagEnd);
  }
  return;
}
//@ chunk-51jy8ztq.js:65644-65695 placement
var HAS_SCHEME_OR_ROOT_RE = /^[\f ]*(?:[a-zA-Z][a-zA-Z0-9+.-]*:|[/\\])/;
//@ chunk-51jy8ztq.js:65695-65812 placement
function hasSuspiciousBaseHref(html) {
  let baseHref = readBaseHref(html);
  if (baseHref === undefined) return false;
  let replaced = baseHref.replace(/[\t\n\r]/g, "");
  return replaced.includes("&") || HAS_SCHEME_OR_ROOT_RE.test(replaced);
}
//@ chunk-51jy8ztq.js:65812-66497 placement
/**
 * <base href> 指向 artifact 之外时的两段说明（含 files 的内联版与单页版）。
 */
var BASE_HREF_TEXT =
  "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and publish those files alongside the page (`files`), referenced by relative path.";
var BASE_HREF_OUTSIDE_TEXT_SINGLE =
  "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and make those references work without it (inline what the page needs).";
//@ chunk-51jy8ztq.js:66497-66804 placement
function detectBom(content) {
  let text =
    typeof content === "string" ? content.slice(0, 16384) : content.subarray(0, 16384).toString("utf8");
  let bomLen = text.startsWith("\uFEFF") ? 1 : 0;
  for (;;) {
    while (bomLen < text.length && /\s/.test(text[bomLen])) bomLen++;
    if (!text.startsWith("<!--", bomLen)) break;
    let index = text.indexOf("-->", bomLen + 4);
    if (index === -1) return false;
    bomLen = index + 3;
  }
  return /^<!doctype html[\s>]/i.test(text.slice(bomLen, bomLen + 16));
}
//@ chunk-51jy8ztq.js:66804-67048 placement
function notLivePathsResult(installationHealthDiagnostics, diagnostics) {
  if (installationHealthDiagnostics.err !== null) return installationHealthDiagnostics;
  let pages = listReadBackHtmlPaths(diagnostics).filter(
    (path) => !(installationHealthDiagnostics.livePaths ?? []).includes(path),
  );
  if (pages.length === 0) return installationHealthDiagnostics;
  logFeatureSad("artifact_publish", "files_html_no_doctype", {
    raw_html_pages: pages.length,
  });
  return {
    ...installationHealthDiagnostics,
    warnings: [...(installationHealthDiagnostics.warnings ?? []), describePages(pages)],
  };
}
//@ chunk-51jy8ztq.js:67048-67178 placement
function listReadBackHtmlPaths(diagnostics) {
  return diagnostics
    .filter(
      (path) =>
        baseMediaType(path.contentType) === "text/html" &&
        path.live !== true &&
        path.reseed !== true &&
        !detectBom(path.content),
    )
    .map((path) => path.path);
}
//@ chunk-51jy8ztq.js:67178-67753 placement
function describePages(pages) {
  let mapped = pages.slice(0, 3).map((page) => jsonStringify(page));
  let more = pages.length - mapped.length;
  let list = mapped.join(", ") + (more > 0 ? ` and ${more} more` : "");
  let single = pages.length === 1;
  return `files: ${list} ${single ? "has" : "have"} no <!doctype html> \u2014 supporting HTML pages are served exactly as written (only the page itself is wrapped in the skeleton), so if ${single ? "it is a page" : "they are pages"} people open, start ${single ? "it" : "each"} with a doctype, charset and viewport meta and its base styles and publish again (a fragment the page fetches and inserts can stay as written); as published ${single ? "it renders" : "they render"} in quirks mode.`;
}
//@ chunk-51jy8ztq.js:67865-67909 placement
/**
 * 发布后回读的限额：最多 8 项、占结果大小上限的 7 成。
 */
var READ_BACK_LIMITS; // deferred: uses ARTIFACT_SLUG_RE (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var READ_BACK_SIZE_RATIO;
var floored;
deferInit("chunk-51jy8ztq.js:67865", () => {
  READ_BACK_LIMITS = 8;
  READ_BACK_SIZE_RATIO = 0.7;
  floored = Math.floor((ARTIFACT_MAX_RESULT_SIZE_CHARS * READ_BACK_SIZE_RATIO) / (READ_BACK_LIMITS * 2));
});
export {
  readFrameDecl,
  READ_BACK_LIMITS,
  floored,
  hasSuspiciousBaseHref,
  BASE_HREF_TEXT,
  BASE_HREF_OUTSIDE_TEXT_SINGLE,
  readBackAfterPublish,
  notLivePathsResult,
  storedDeclFromWire,
};
