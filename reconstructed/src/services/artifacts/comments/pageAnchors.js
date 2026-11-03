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
import { jLo, WLo, GLo } from "./commentFormatting.js";
import { isDiskless } from "../../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { uniq } from "../../../utils/collections.js";
import { hFr, abt } from "../pageScripts.js";
import { truncateCodePoints } from "../../../utils/stringUtils.js";
import { gF } from "../webfetchRead.js";
import { claudeAiEnvironment } from "../../../constants/claudeAiOrigin.js";
import { withDeadline } from "../../../utils/sleep.js";
import { isAudienceVersionServed } from "../audience.js";

/**
 * 评论锚点定位用的长度/数量上限常量、跳过的标签（script/style/template/noscript）与 id/data-id 选择器构造。
 */
//@ chunk-9tgt55am.js:31729-31905 placement
var MAX_ANCHOR_TEXT = 160,
  ANCHOR_SNIPPET_MAX_CHARS = 120,
  MAX_PAGE_HTML_CHARS = 2000000,
  ANCHOR_CACHE_MAX_PAGES = 32,
  MAX_ANCHOR_FILES = 3,
  ANCHOR_FETCH_TIMEOUT_MS = 3000,
  MAX_ANCHORS_PER_FILE = 64,
  MAX_ANCHOR_CANDIDATES = 2000000,
  MAX_SNIPPET_NODES = 2000,
  SKIPPED_TAGS = new Set(["script", "style", "template", "noscript"]),
  MAX_SNIPPET_LOOKUPS = 256,
  idSelector = (e) => `#${e}`,
  dataIdSelector = (e) => `[data-id="${e}"]`;
//@ chunk-9tgt55am.js:31905-32279 placement
function parseAnchorSelector(e) {
  let parts = e.trim().split(" > ");
  if (parts.length === 0 || parts.length > 10) return;
  let n = [];
  for (let [a, r] of parts.entries()) {
    if (a === 0 && jLo.test(r)) {
      n.push({ id: r.slice(1) });
      continue;
    }
    let s = a === 0 ? WLo.exec(r)?.[1] : void 0;
    if (s !== void 0) {
      n.push({ dataId: s });
      continue;
    }
    if (!GLo.test(r)) return;
    let index = r.indexOf(":nth-of-type(");
    n.push({ tag: r.slice(0, index), index: Number(r.slice(index + 13, -1)) });
  }
  return n;
}
//@ chunk-9tgt55am.js:32279-32320 placement = call (0.735)
function call(e) {
  return e.tagName !== void 0;
}
//@ chunk-9tgt55am.js:32320-32364 placement
function Kn(e) {
  return e.replace(/\s+/g, " ");
}
//@ chunk-9tgt55am.js:32364-32424 placement
function $Dr() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_finial", !0);
}
//@ chunk-9tgt55am.js:32424-33555 placement
async function resolveAnchorElements(e, t, n) {
  let a = new Map();
  if (e.length > MAX_PAGE_HTML_CHARS) return a;
  let r = new Map();
  for (let s of uniq(t).slice(0, MAX_ANCHORS_PER_FILE)) {
    let d = parseAnchorSelector(s);
    if (d === void 0) continue;
    let at = d.at(-1),
      y = "id" in at ? idSelector(at.id) : "dataId" in at ? dataIdSelector(at.dataId) : at.tag;
    r.set(y, [...(r.get(y) ?? []), [s, d]]);
  }
  if (r.size === 0) return a;
  try {
    let { nestingBudgetExceeded: nestingBudgetExceeded } = await import("./chunk-kpk3x82b.js");
    if (nestingBudgetExceeded(e)) return a;
    let { parse: parse } = await import("./chunk-ytv6b64r.js"),
      h = hFr(parse(e)),
      y = new Map(),
      C = new Map(),
      R = 0,
      b = [h];
    for (;;) {
      let S = b.pop();
      if (S === void 0) break;
      let w = new Map();
      for (let G of S.childNodes ?? []) {
        if (!call(G)) continue;
        let V = `${G.namespaceURI ?? ""} ${G.tagName}`,
          q = (w.get(V) ?? 0) + 1;
        (w.set(V, q), y.set(G, q), b.push(G));
      }
      if (!call(S)) continue;
      let L = abt(S, "id"),
        P = abt(S, "data-id"),
        D = [
          ...(r.get(S.tagName) ?? []),
          ...(L !== void 0 ? (r.get(idSelector(L)) ?? []) : []),
          ...(P !== void 0 ? (r.get(dataIdSelector(P)) ?? []) : []),
        ];
      if (((R += D.length), R > MAX_ANCHOR_CANDIDATES)) return a;
      for (let [G, V] of D) {
        if (!matchesAnchorPath(S, V, y)) continue;
        let q = C.get(G) ?? [];
        if (q.length < 2) (q.push(S), C.set(G, q));
      }
    }
    let N = MAX_SNIPPET_LOOKUPS;
    for (let S of uniq([...(n?.keys() ?? []), ...C.keys()])) {
      let w = C.get(S);
      if (w === void 0 || w.length !== 1) continue;
      let L = renderChildAnchors(w[0], n?.get(S), N);
      ((N -= L?.size ?? 0), a.set(S, { snippet: renderAnchorElement(w[0]), ...(L && { kids: L }) }));
    }
  } catch {}
  return a;
}
//@ chunk-9tgt55am.js:33555-33748 placement
function renderChildAnchors(e, t, n) {
  if (t === void 0 || t.length === 0) return;
  let filtered = (e.childNodes ?? []).filter(call),
    r = new Map();
  for (let s of uniq(t).slice(0, Math.max(0, n))) {
    let d = filtered[s];
    r.set(s, d === void 0 ? null : renderAnchorElement(d));
  }
  return r;
}
//@ chunk-9tgt55am.js:33748-34043 placement
function matchesAnchorPath(e, t, n) {
  let a = e;
  for (let r = t.length - 1; r >= 0; r--) {
    if (a === void 0 || a === null || !call(a)) return !1;
    let s = t[r];
    if ("id" in s) {
      if (abt(a, "id") !== s.id) return !1;
    } else if ("dataId" in s) {
      if (abt(a, "data-id") !== s.dataId) return !1;
    } else if (a.tagName !== s.tag || n.get(a) !== s.index) return !1;
    a = a.parentNode;
  }
  return !0;
}
//@ chunk-9tgt55am.js:34043-34690 placement
function renderAnchorElement(e) {
  let joined = (e.attrs ?? []).map((R) => ` ${R.name}="${Kn(R.value).replaceAll('"', "&quot;")}"`).join(""),
    n = `<${e.tagName}${joined}>`,
    a = truncateCodePoints(n, MAX_ANCHOR_TEXT),
    r = a + (a.length < n.length ? "\u2026" : "");
  if (SKIPPED_TAGS.has(e.tagName)) return r;
  let s = "",
    d = !1,
    h = 0,
    reverse = [...(e.childNodes ?? [])].reverse();
  for (;;) {
    if (++h > MAX_SNIPPET_NODES) {
      d = !0;
      break;
    }
    if ([...s].length > ANCHOR_SNIPPET_MAX_CHARS + 2) {
      d = reverse.length > 0;
      break;
    }
    let R = reverse.pop();
    if (R === void 0) break;
    if (R.nodeName === "#text" && typeof R.value === "string") {
      s = Kn(s + R.value);
      continue;
    }
    if (call(R) && !SKIPPED_TAGS.has(R.tagName)) {
      s = Kn(s + " ");
      for (let b = (R.childNodes?.length ?? 0) - 1; b >= 0; b--) reverse.push(R.childNodes[b]);
    }
  }
  s = s.trim();
  let C = truncateCodePoints(s, ANCHOR_SNIPPET_MAX_CHARS);
  return C === "" ? r : `${r} ${C}${d || C.length < s.length ? "\u2026" : ""}`;
}
//@ chunk-9tgt55am.js:34690-35231 placement
async function fetchAnchorPageSource(e) {
  if (e.signal.aborted) return;
  let abortController = new AbortController(),
    n = () => abortController.abort();
  e.signal.addEventListener("abort", n, { once: !0 });
  let a = setTimeout((r) => r.abort(), ANCHOR_FETCH_TIMEOUT_MS, abortController);
  try {
    let r = gF(
        { slug: e.slug, env: claudeAiEnvironment(), ...(e.file !== void 0 && { file: e.file }) },
        abortController.signal,
        e.credentials,
        e.feature,
      ).catch(() => {
        return;
      }),
      s = await withDeadline(r, ANCHOR_FETCH_TIMEOUT_MS + 250);
    if (s === void 0 || s.err !== null) return;
    if ("contentType" in s && s.contentType !== "text/html") return;
    return { html: s.html, ver: s.ver, audienceSees: isAudienceVersionServed(s) };
  } catch {
    return;
  } finally {
    (clearTimeout(a), e.signal.removeEventListener("abort", n));
  }
}

export {
  fetchAnchorPageSource,
  $Dr,
  MAX_ANCHOR_FILES,
  MAX_ANCHORS_PER_FILE,
  resolveAnchorElements,
  ANCHOR_CACHE_MAX_PAGES,
};
