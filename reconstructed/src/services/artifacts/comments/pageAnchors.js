/**
 * services/artifacts/comments/pageAnchors.ts
 *
 * 2.1.316 新增：评论锚点对应页面源码片段的读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (10)
 * attribution: placement 10
 */
import {
  ANCHOR_ID_SELECTOR_RE,
  ANCHOR_DATA_ID_SELECTOR_RE,
  ANCHOR_NTH_OF_TYPE_RE,
} from "./commentFormatting.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { uniq } from "../../../utils/collections.js";
import { parseHtml, attrOf } from "../pageScripts.js";
import { truncateCodePoints } from "../../../utils/stringUtils.js";
import { webfetchReadFile } from "../webfetchRead.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { withDeadline } from "../../../utils/sleep.js";
import { isAudienceVersionServed } from "../audience.js";

//@ chunk-9tgt55am.js:31729-31905 placement
/**
 * 评论锚点定位用的长度/数量上限常量、跳过的标签（script/style/template/noscript）与 id/data-id 选择器构造。
 */
var MAX_ANCHOR_TEXT = 160;
var ANCHOR_SNIPPET_MAX_CHARS = 120;
var MAX_PAGE_HTML_CHARS = 2000000;
var ANCHOR_CACHE_MAX_PAGES = 32;
var MAX_ANCHOR_FILES = 3;
var ANCHOR_FETCH_TIMEOUT_MS = 3000;
var MAX_ANCHORS_PER_FILE = 64;
var MAX_ANCHOR_CANDIDATES = 2000000;
var MAX_SNIPPET_NODES = 2000;
var SKIPPED_TAGS = new Set(["script", "style", "template", "noscript"]);
var MAX_SNIPPET_LOOKUPS = 256;
var idSelector = (e) => `#${e}`;
var dataIdSelector = (e) => `[data-id="${e}"]`;
//@ chunk-9tgt55am.js:31905-32279 placement
function parseAnchorSelector(e) {
  let parts = e.trim().split(" > ");
  if (parts.length === 0 || parts.length > 10) return;
  let n = [];
  for (let [a, r] of parts.entries()) {
    if (a === 0 && ANCHOR_ID_SELECTOR_RE.test(r)) {
      n.push({
        id: r.slice(1),
      });
      continue;
    }
    let s = a === 0 ? ANCHOR_DATA_ID_SELECTOR_RE.exec(r)?.[1] : undefined;
    if (s !== undefined) {
      n.push({
        dataId: s,
      });
      continue;
    }
    if (!ANCHOR_NTH_OF_TYPE_RE.test(r)) return;
    let index = r.indexOf(":nth-of-type(");
    n.push({
      tag: r.slice(0, index),
      index: Number(r.slice(index + 13, -1)),
    });
  }
  return n;
}
//@ chunk-9tgt55am.js:32279-32320 placement = call (0.735)
function call(e) {
  return e.tagName !== undefined;
}
//@ chunk-9tgt55am.js:32320-32364 placement
function collapseWhitespace(e) {
  return e.replace(/\s+/g, " ");
}
//@ chunk-9tgt55am.js:32364-32424 placement
/**
 * 导出函数 `isTealCorbelFinialEnabled`：返回 !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_finial", !0)。
 */
function isTealCorbelFinialEnabled() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_finial", true);
}
//@ chunk-9tgt55am.js:32424-33555 placement
async function resolveAnchorElements(e, t, n) {
  let a = new Map();
  if (e.length > MAX_PAGE_HTML_CHARS) return a;
  let r = new Map();
  for (let s of uniq(t).slice(0, MAX_ANCHORS_PER_FILE)) {
    let anchorSelector = parseAnchorSelector(s);
    if (anchorSelector === undefined) continue;
    let last = anchorSelector.at(-1);
    let y = "id" in last ? idSelector(last.id) : "dataId" in last ? dataIdSelector(last.dataId) : last.tag;
    r.set(y, [...(r.get(y) ?? []), [s, anchorSelector]]);
  }
  if (r.size === 0) return a;
  try {
    let { nestingBudgetExceeded } = await import("./chunk-kpk3x82b.js");
    if (nestingBudgetExceeded(e)) return a;
    let { parse } = await import("./chunk-ytv6b64r.js");
    let html = parseHtml(parse(e));
    let y = new Map();
    let C = new Map();
    let R = 0;
    let b = [html];
    for (;;) {
      let S = b.pop();
      if (S === undefined) break;
      let w = new Map();
      for (let G of S.childNodes ?? []) {
        if (!call(G)) continue;
        let V = `${G.namespaceURI ?? ""} ${G.tagName}`;
        let q = (w.get(V) ?? 0) + 1;
        w.set(V, q);
        y.set(G, q);
        b.push(G);
      }
      if (!call(S)) continue;
      let L = attrOf(S, "id");
      let P = attrOf(S, "data-id");
      let D = [
        ...(r.get(S.tagName) ?? []),
        ...(L !== undefined ? (r.get(idSelector(L)) ?? []) : []),
        ...(P !== undefined ? (r.get(dataIdSelector(P)) ?? []) : []),
      ];
      R += D.length;
      if (R > MAX_ANCHOR_CANDIDATES) return a;
      for (let [G, V] of D) {
        if (!matchesAnchorPath(S, V, y)) continue;
        let q = C.get(G) ?? [];
        if (q.length < 2) {
          q.push(S);
          C.set(G, q);
        }
      }
    }
    let N = MAX_SNIPPET_LOOKUPS;
    for (let S of uniq([...(n?.keys() ?? []), ...C.keys()])) {
      let w = C.get(S);
      if (w === undefined || w.length !== 1) continue;
      let L = renderChildAnchors(w[0], n?.get(S), N);
      N -= L?.size ?? 0;
      a.set(S, {
        snippet: renderAnchorElement(w[0]),
        ...(L && {
          kids: L,
        }),
      });
    }
  } catch {}
  return a;
}
//@ chunk-9tgt55am.js:33555-33748 placement
function renderChildAnchors(e, t, n) {
  if (t === undefined || t.length === 0) return;
  let filtered = (e.childNodes ?? []).filter(call);
  let r = new Map();
  for (let s of uniq(t).slice(0, Math.max(0, n))) {
    let d = filtered[s];
    r.set(s, d === undefined ? null : renderAnchorElement(d));
  }
  return r;
}
//@ chunk-9tgt55am.js:33748-34043 placement
function matchesAnchorPath(e, t, n) {
  let a = e;
  for (let j = t.length - 1; j >= 0; j--) {
    if (a === undefined || a === null || !call(a)) return false;
    let s = t[j];
    if ("id" in s) {
      if (attrOf(a, "id") !== s.id) return false;
    } else if ("dataId" in s) {
      if (attrOf(a, "data-id") !== s.dataId) return false;
    } else if (a.tagName !== s.tag || n.get(a) !== s.index) return false;
    a = a.parentNode;
  }
  return true;
}
//@ chunk-9tgt55am.js:34043-34690 placement
function renderAnchorElement(e) {
  let joined = (e.attrs ?? [])
    .map((R) => ` ${R.name}="${collapseWhitespace(R.value).replaceAll('"', "&quot;")}"`)
    .join("");
  let n = `<${e.tagName}${joined}>`;
  let a = truncateCodePoints(n, MAX_ANCHOR_TEXT);
  let r = a + (a.length < n.length ? "\u2026" : "");
  if (SKIPPED_TAGS.has(e.tagName)) return r;
  let s = "";
  let d = false;
  let h = 0;
  let y = [...(e.childNodes ?? [])].reverse();
  for (;;) {
    if (++h > MAX_SNIPPET_NODES) {
      d = true;
      break;
    }
    if ([...s].length > ANCHOR_SNIPPET_MAX_CHARS + 2) {
      d = y.length > 0;
      break;
    }
    let R = y.pop();
    if (R === undefined) break;
    if (R.nodeName === "#text" && typeof R.value === "string") {
      s = collapseWhitespace(s + R.value);
      continue;
    }
    if (call(R) && !SKIPPED_TAGS.has(R.tagName)) {
      s = collapseWhitespace(s + " ");
      for (let j = (R.childNodes?.length ?? 0) - 1; j >= 0; j--) y.push(R.childNodes[j]);
    }
  }
  s = s.trim();
  let C = truncateCodePoints(s, ANCHOR_SNIPPET_MAX_CHARS);
  return C === "" ? r : `${r} ${C}${d || C.length < s.length ? "\u2026" : ""}`;
}
//@ chunk-9tgt55am.js:34690-35231 placement
async function fetchAnchorPageSource(e) {
  if (e.signal.aborted) return;
  let abortController = new AbortController();
  let n = () => abortController.abort();
  e.signal.addEventListener("abort", n, {
    once: true,
  });
  let timer = setTimeout((r) => r.abort(), ANCHOR_FETCH_TIMEOUT_MS, abortController);
  try {
    let r = webfetchReadFile(
      {
        slug: e.slug,
        env: claudeAiEnvironment(),
        ...(e.file !== undefined && {
          file: e.file,
        }),
      },
      abortController.signal,
      e.credentials,
      e.feature,
    ).catch(() => {
      return;
    });
    let s = await withDeadline(r, ANCHOR_FETCH_TIMEOUT_MS + 250);
    if (s === undefined || s.err !== null) return;
    if ("contentType" in s && s.contentType !== "text/html") return;
    return {
      html: s.html,
      ver: s.ver,
      audienceSees: isAudienceVersionServed(s),
    };
  } catch {
    return;
  } finally {
    clearTimeout(timer);
    e.signal.removeEventListener("abort", n);
  }
}
export {
  fetchAnchorPageSource,
  isTealCorbelFinialEnabled,
  MAX_ANCHOR_FILES,
  MAX_ANCHORS_PER_FILE,
  resolveAnchorElements,
  ANCHOR_CACHE_MAX_PAGES,
};
