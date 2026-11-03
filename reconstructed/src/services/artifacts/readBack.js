/**
 * services/artifacts/readBack.ts
 *
 * 2.1.316 新增：发布后回读与 base href 说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (12)
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

//@ chunk-06y4szbn.js:61435-61691 placement
function storedDeclFromWire(e) {
  let n = contractInputSchema().safeParse(e);
  if (!n.success) {
    logForDebugging(`[artifact] malformed read-back body: ${n.error.message}`);
    return;
  }
  let { contract, capabilities } = n.data;
  let h = typeLockFromWire(n.data.type);
  return {
    contract,
    ...(capabilities != null && {
      capabilities,
    }),
    ...(h !== undefined && {
      typeLock: h,
    }),
  };
}
//@ chunk-06y4szbn.js:61691-62400 placement
async function readFrameDecl(slug, signal, credentials) {
  let startTime = performance.now();
  try {
    let h = await frameApi.get(`/api/frame/read/${encodeURIComponent(slug)}`, {
      refreshOAuth: true,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
      ...(signal && {
        signal,
      }),
      credentials,
    });
    if (!h.ok)
      return {
        err: `read-back unavailable: ${h.reason}`,
        unsent: true,
      };
    if (!h.fromFrame)
      return {
        err: `read-back relay HTTP ${h.status}`,
        relayStatus: h.status,
      };
    if (h.status === 404) return null;
    if (h.status < 200 || h.status >= 300) {
      logForDebugging(`[artifact] read-back ${h.status}: ${errBody(h.data)}`);
      return {
        err: `read-back HTTP ${h.status}`,
        status: h.status,
      };
    }
    let b = storedDeclFromWire(h.data);
    if (b === undefined)
      return {
        err: "malformed read-back body",
        status: h.status,
      };
    return b;
  } catch (error) {
    return {
      err: error instanceof Error ? error.message : String(error),
      request: getTransportErrorProps(error, startTime),
    };
  }
}
//@ chunk-06y4szbn.js:62400-62830 placement
async function readBackAfterPublish(e, n, credentials, signal) {
  let h = await e;
  if (h.err !== null || n === undefined || h.readBackEchoed) return h;
  let frameDecl = await readFrameDecl(n, signal, credentials);
  if (frameDecl === null || "err" in frameDecl) {
    if (frameDecl !== null) logForDebugging(`[artifact] read-back skipped: ${frameDecl.err}`);
    return h;
  }
  let { typeLock, ...x } = frameDecl;
  let w =
    typeLock !== undefined
      ? {
          ...h,
          typeLock,
        }
      : h;
  if (
    h.stored?.capabilities !== undefined ||
    (!isNonEmptyObject(x.capabilities ?? undefined) && parseContractVersion(x.contract) === null)
  )
    return w;
  return {
    ...w,
    stored: {
      ...x,
      ...(isNonEmptyObject(x.capabilities ?? undefined) && {
        carried: true,
      }),
    },
  };
}
//@ chunk-06y4szbn.js:62830-63392 placement
function readBaseHref(e) {
  let n = /[\t\n\f\r ]/;
  let tagOutsideComments = findTagOutsideComments(e, BASE_TAG_RE, 0);
  while (tagOutsideComments >= 0) {
    let s = skipQuotedAttribute(e, tagOutsideComments + 5);
    if (s < 0) return;
    let h = tagOutsideComments + 5;
    while (h < s - 1) {
      let b = e[h];
      if (n.test(b) || b === "/") {
        h++;
        continue;
      }
      let y = h++;
      while (h < s - 1 && !n.test(e[h]) && !"/=".includes(e[h])) h++;
      let lower = e.slice(y, h).toLowerCase();
      while (h < s - 1 && n.test(e[h])) h++;
      if (e[h] !== "=") continue;
      h++;
      while (h < s - 1 && n.test(e[h])) h++;
      let w = h;
      let R;
      let C = e[h];
      if (C === '"' || C === "'") {
        let index = e.indexOf(C, h + 1);
        h = index < 0 ? s : index + 1;
        R = e.slice(w + 1, h - 1);
      } else {
        while (h < s - 1 && !n.test(e[h])) h++;
        R = e.slice(w, h);
      }
      if (lower === "href") {
        if (!R.startsWith("/_f/")) return R;
        break;
      }
    }
    tagOutsideComments = findTagOutsideComments(e, BASE_TAG_RE, s);
  }
  return;
}
//@ chunk-06y4szbn.js:63392-63443 placement
var HAS_SCHEME_OR_ROOT_RE = /^[\f ]*(?:[a-zA-Z][a-zA-Z0-9+.-]*:|[/\\])/;
//@ chunk-06y4szbn.js:63443-63560 placement
function hasSuspiciousBaseHref(body) {
  let baseHref = readBaseHref(body);
  if (baseHref === undefined) return false;
  let replaced = baseHref.replace(/[\t\n\r]/g, "");
  return replaced.includes("&") || HAS_SCHEME_OR_ROOT_RE.test(replaced);
}
//@ chunk-06y4szbn.js:63560-64245 placement
/**
 * <base href> 指向 artifact 之外时的两段说明（含 files 的内联版与单页版）。
 */
var BASE_HREF_TEXT =
  "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and publish those files alongside the page (`files`), referenced by relative path.";
var BASE_HREF_OUTSIDE_TEXT_SINGLE =
  "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and make those references work without it (inline what the page needs).";
//@ chunk-06y4szbn.js:64245-64552 placement
function detectBom(content) {
  let n = typeof content === "string" ? content.slice(0, 16384) : content.subarray(0, 16384).toString("utf8");
  let r = n.startsWith("\uFEFF") ? 1 : 0;
  for (;;) {
    while (r < n.length && /\s/.test(n[r])) r++;
    if (!n.startsWith("<!--", r)) break;
    let index = n.indexOf("-->", r + 4);
    if (index === -1) return false;
    r = index + 3;
  }
  return /^<!doctype html[\s>]/i.test(n.slice(r, r + 16));
}
//@ chunk-06y4szbn.js:64552-64796 placement
function notLivePathsResult(installationHealthDiagnostics, n) {
  if (installationHealthDiagnostics.err !== null) return installationHealthDiagnostics;
  let filtered = listReadBackHtmlPaths(n).filter(
    (s) => !(installationHealthDiagnostics.livePaths ?? []).includes(s),
  );
  if (filtered.length === 0) return installationHealthDiagnostics;
  logFeatureSad("artifact_publish", "files_html_no_doctype", {
    raw_html_pages: filtered.length,
  });
  return {
    ...installationHealthDiagnostics,
    warnings: [...(installationHealthDiagnostics.warnings ?? []), describePages(filtered)],
  };
}
//@ chunk-06y4szbn.js:64796-64926 placement
function listReadBackHtmlPaths(e) {
  return e
    .filter(
      (n) =>
        baseMediaType(n.contentType) === "text/html" &&
        n.live !== true &&
        n.reseed !== true &&
        !detectBom(n.content),
    )
    .map((n) => n.path);
}
//@ chunk-06y4szbn.js:64926-65501 placement
function describePages(e) {
  let mapped = e.slice(0, 3).map((b) => jsonStringify(b));
  let r = e.length - mapped.length;
  let s = mapped.join(", ") + (r > 0 ? ` and ${r} more` : "");
  let h = e.length === 1;
  return `files: ${s} ${h ? "has" : "have"} no <!doctype html> \u2014 supporting HTML pages are served exactly as written (only the page itself is wrapped in the skeleton), so if ${h ? "it is a page" : "they are pages"} people open, start ${h ? "it" : "each"} with a doctype, charset and viewport meta and its base styles and publish again (a fragment the page fetches and inserts can stay as written); as published ${h ? "it renders" : "they render"} in quirks mode.`;
}
//@ chunk-06y4szbn.js:65613-65657 placement
/**
 * 发布后回读的限额：最多 8 项、占结果大小上限的 7 成。
 */
var READ_BACK_LIMITS = 8;
var READ_BACK_SIZE_RATIO = 0.7;
var floored = Math.floor((ARTIFACT_MAX_RESULT_SIZE_CHARS * READ_BACK_SIZE_RATIO) / (READ_BACK_LIMITS * 2));
export {
  READ_BACK_LIMITS,
  floored,
  hasSuspiciousBaseHref,
  BASE_HREF_TEXT,
  BASE_HREF_OUTSIDE_TEXT_SINGLE,
  readFrameDecl,
  readBackAfterPublish,
  notLivePathsResult,
  storedDeclFromWire,
};
