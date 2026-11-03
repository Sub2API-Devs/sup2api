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
  pl,
  typeLockFromWire,
  MAX_PAGE_BYTES_FOR_STRIP,
  findTagOutsideComments,
  As,
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
  let safeParse = pl().safeParse(e);
  if (!safeParse.success) {
    logForDebugging(`[artifact] malformed read-back body: ${safeParse.error.message}`);
    return;
  }
  let { contract: contract, capabilities: capabilities } = safeParse.data,
    h = typeLockFromWire(safeParse.data.type);
  return {
    contract: contract,
    ...(capabilities != null && { capabilities: capabilities }),
    ...(h !== void 0 && { typeLock: h }),
  };
}
//@ chunk-06y4szbn.js:61691-62400 placement
async function readFrameDecl(e, n, r) {
  let startTime = performance.now();
  try {
    let h = await frameApi.get(`/api/frame/read/${encodeURIComponent(e)}`, {
      refreshOAuth: !0,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: MAX_PAGE_BYTES_FOR_STRIP,
      ...(n && { signal: n }),
      credentials: r,
    });
    if (!h.ok) return { err: `read-back unavailable: ${h.reason}`, unsent: !0 };
    if (!h.fromFrame) return { err: `read-back relay HTTP ${h.status}`, relayStatus: h.status };
    if (h.status === 404) return null;
    if (h.status < 200 || h.status >= 300)
      return (
        logForDebugging(`[artifact] read-back ${h.status}: ${errBody(h.data)}`),
        { err: `read-back HTTP ${h.status}`, status: h.status }
      );
    let b = storedDeclFromWire(h.data);
    if (b === void 0) return { err: "malformed read-back body", status: h.status };
    return b;
  } catch (error) {
    return {
      err: error instanceof Error ? error.message : String(error),
      request: getTransportErrorProps(error, startTime),
    };
  }
}
//@ chunk-06y4szbn.js:62400-62830 placement
async function readBackAfterPublish(e, n, r, s) {
  let h = await e;
  if (h.err !== null || n === void 0 || h.readBackEchoed) return h;
  let b = await readFrameDecl(n, s, r);
  if (b === null || "err" in b) {
    if (b !== null) logForDebugging(`[artifact] read-back skipped: ${b.err}`);
    return h;
  }
  let { typeLock: typeLock, ...x } = b,
    w = typeLock !== void 0 ? { ...h, typeLock: typeLock } : h;
  if (
    h.stored?.capabilities !== void 0 ||
    (!isNonEmptyObject(x.capabilities ?? void 0) && parseContractVersion(x.contract) === null)
  )
    return w;
  return { ...w, stored: { ...x, ...(isNonEmptyObject(x.capabilities ?? void 0) && { carried: !0 }) } };
}
//@ chunk-06y4szbn.js:62830-63392 placement
function readBaseHref(e) {
  let n = /[\t\n\f\r ]/,
    r = findTagOutsideComments(e, As, 0);
  while (r >= 0) {
    let s = skipQuotedAttribute(e, r + 5);
    if (s < 0) return;
    let h = r + 5;
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
      let w = h,
        R,
        C = e[h];
      if (C === '"' || C === "'") {
        let index = e.indexOf(C, h + 1);
        ((h = index < 0 ? s : index + 1), (R = e.slice(w + 1, h - 1)));
      } else {
        while (h < s - 1 && !n.test(e[h])) h++;
        R = e.slice(w, h);
      }
      if (lower === "href") {
        if (!R.startsWith("/_f/")) return R;
        break;
      }
    }
    r = findTagOutsideComments(e, As, s);
  }
  return;
}
//@ chunk-06y4szbn.js:63392-63443 placement
var Ol = /^[\f ]*(?:[a-zA-Z][a-zA-Z0-9+.-]*:|[/\\])/;
//@ chunk-06y4szbn.js:63443-63560 placement
function hasSuspiciousBaseHref(e) {
  let n = readBaseHref(e);
  if (n === void 0) return !1;
  let replaced = n.replace(/[\t\n\r]/g, "");
  return replaced.includes("&") || Ol.test(replaced);
}
//@ chunk-06y4szbn.js:63560-64245 placement
var BASE_HREF_TEXT =
    "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and publish those files alongside the page (`files`), referenced by relative path.",
  Ml =
    "This page's <base href> points outside the artifact \u2014 at another site, or at the site root. Artifact hosting serves only the artifact's own folder and refuses a base on another site, so relative references won't resolve through it \u2014 remove the tag and make those references work without it (inline what the page needs).";
//@ chunk-06y4szbn.js:64245-64552 placement
function detectBom(e) {
  let n = typeof e === "string" ? e.slice(0, 16384) : e.subarray(0, 16384).toString("utf8"),
    r = n.startsWith("\uFEFF") ? 1 : 0;
  for (;;) {
    while (r < n.length && /\s/.test(n[r])) r++;
    if (!n.startsWith("<!--", r)) break;
    let index = n.indexOf("-->", r + 4);
    if (index === -1) return !1;
    r = index + 3;
  }
  return /^<!doctype html[\s>]/i.test(n.slice(r, r + 16));
}
//@ chunk-06y4szbn.js:64552-64796 placement
function notLivePathsResult(e, n) {
  if (e.err !== null) return e;
  let filtered = listReadBackHtmlPaths(n).filter((s) => !(e.livePaths ?? []).includes(s));
  if (filtered.length === 0) return e;
  return (
    logFeatureSad("artifact_publish", "files_html_no_doctype", { raw_html_pages: filtered.length }),
    { ...e, warnings: [...(e.warnings ?? []), describePages(filtered)] }
  );
}
//@ chunk-06y4szbn.js:64796-64926 placement
function listReadBackHtmlPaths(e) {
  return e
    .filter(
      (n) =>
        baseMediaType(n.contentType) === "text/html" &&
        n.live !== !0 &&
        n.reseed !== !0 &&
        !detectBom(n.content),
    )
    .map((n) => n.path);
}
//@ chunk-06y4szbn.js:64926-65501 placement
function describePages(e) {
  let mapped = e.slice(0, 3).map((b) => jsonStringify(b)),
    r = e.length - mapped.length,
    s = mapped.join(", ") + (r > 0 ? ` and ${r} more` : ""),
    h = e.length === 1;
  return `files: ${s} ${h ? "has" : "have"} no <!doctype html> \u2014 supporting HTML pages are served exactly as written (only the page itself is wrapped in the skeleton), so if ${h ? "it is a page" : "they are pages"} people open, start ${h ? "it" : "each"} with a doctype, charset and viewport meta and its base styles and publish again (a fragment the page fetches and inserts can stay as written); as published ${h ? "it renders" : "they render"} in quirks mode.`;
}
//@ chunk-06y4szbn.js:65613-65657 placement
var READ_BACK_LIMITS = 8,
  jl = 0.7,
  floored = Math.floor((ARTIFACT_MAX_RESULT_SIZE_CHARS * jl) / (READ_BACK_LIMITS * 2));

export {
  READ_BACK_LIMITS,
  floored,
  hasSuspiciousBaseHref,
  BASE_HREF_TEXT,
  Ml,
  readFrameDecl,
  readBackAfterPublish,
  notLivePathsResult,
  storedDeclFromWire,
};
