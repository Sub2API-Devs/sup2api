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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-9tgt55am.js:31729-31905 placement
/**
 * 评论锚点定位用的长度/数量上限常量、跳过的标签（script/style/template/noscript）与 id/data-id 选择器构造。
 */
var MAX_ANCHOR_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANCHOR_SNIPPET_MAX_CHARS;
var MAX_PAGE_HTML_CHARS;
var ANCHOR_CACHE_MAX_PAGES;
var MAX_ANCHOR_FILES;
var ANCHOR_FETCH_TIMEOUT_MS;
var MAX_ANCHORS_PER_FILE;
var MAX_ANCHOR_CANDIDATES;
var MAX_SNIPPET_NODES;
var SKIPPED_TAGS;
var MAX_SNIPPET_LOOKUPS;
var idSelector;
var dataIdSelector;
deferInit("chunk-9tgt55am.js:31729", () => {
  MAX_ANCHOR_TEXT = 160;
  ANCHOR_SNIPPET_MAX_CHARS = 120;
  MAX_PAGE_HTML_CHARS = 2000000;
  ANCHOR_CACHE_MAX_PAGES = 32;
  MAX_ANCHOR_FILES = 3;
  ANCHOR_FETCH_TIMEOUT_MS = 3000;
  MAX_ANCHORS_PER_FILE = 64;
  MAX_ANCHOR_CANDIDATES = 2000000;
  MAX_SNIPPET_NODES = 2000;
  SKIPPED_TAGS = new Set(["script", "style", "template", "noscript"]);
  MAX_SNIPPET_LOOKUPS = 256;
  idSelector = (id) => `#${id}`;
  dataIdSelector = (id) => `[data-id="${id}"]`;
});
//@ chunk-9tgt55am.js:31905-32279 placement
function parseAnchorSelector(selector) {
  let parts = selector.trim().split(" > ");
  if (parts.length === 0 || parts.length > 10) return;
  let steps = [];
  for (let [partIndex, part] of parts.entries()) {
    if (partIndex === 0 && ANCHOR_ID_SELECTOR_RE.test(part)) {
      steps.push({
        id: part.slice(1),
      });
      continue;
    }
    let dataId = partIndex === 0 ? ANCHOR_DATA_ID_SELECTOR_RE.exec(part)?.[1] : undefined;
    if (dataId !== undefined) {
      steps.push({
        dataId,
      });
      continue;
    }
    if (!ANCHOR_NTH_OF_TYPE_RE.test(part)) return;
    let index = part.indexOf(":nth-of-type(");
    steps.push({
      tag: part.slice(0, index),
      index: Number(part.slice(index + 13, -1)),
    });
  }
  return steps;
}
//@ chunk-9tgt55am.js:32279-32320 placement (2.1.88 match: call, 0.735)
function call(selector) {
  return selector.tagName !== undefined;
}
//@ chunk-9tgt55am.js:32320-32364 placement
function collapseWhitespace(text) {
  return text.replace(/\s+/g, " ");
}
//@ chunk-9tgt55am.js:32364-32424 placement
/**
 * 导出函数 `isTealCorbelFinialEnabled`：返回 !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_finial", !0)。
 */
function isTealCorbelFinialEnabled() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel_finial", true);
}
//@ chunk-9tgt55am.js:32424-33555 placement
async function resolveAnchorElements(html, anchorPaths, regionKidsByPath) {
  let results = new Map();
  if (html.length > MAX_PAGE_HTML_CHARS) return results;
  let candidatesBySelector = new Map();
  for (let anchorPath of uniq(anchorPaths).slice(0, MAX_ANCHORS_PER_FILE)) {
    let anchorSelector = parseAnchorSelector(anchorPath);
    if (anchorSelector === undefined) continue;
    let last = anchorSelector.at(-1);
    let selector =
      "id" in last ? idSelector(last.id) : "dataId" in last ? dataIdSelector(last.dataId) : last.tag;
    candidatesBySelector.set(selector, [
      ...(candidatesBySelector.get(selector) ?? []),
      [anchorPath, anchorSelector],
    ]);
  }
  if (candidatesBySelector.size === 0) return results;
  try {
    let { nestingBudgetExceeded } =
      await import("../../../../vendor/@mixmark-io/domino/lib/RAWTEXT_MODES.lazy.js");
    if (nestingBudgetExceeded(html)) return results;
    let { parse } = await import("../../../../vendor/parse5/dist/tokenizer/Tokenizer.lazy.js");
    let html_2 = parseHtml(parse(html));
    let siblingIndexes = new Map();
    let matchesById = new Map();
    let candidateCount = 0;
    let pending = [html_2];
    for (;;) {
      let node = pending.pop();
      if (node === undefined) break;
      let tagCounts = new Map();
      for (let child of node.childNodes ?? []) {
        if (!call(child)) continue;
        let tagKey = `${child.namespaceURI ?? ""} ${child.tagName}`;
        let siblingIndex = (tagCounts.get(tagKey) ?? 0) + 1;
        tagCounts.set(tagKey, siblingIndex);
        siblingIndexes.set(child, siblingIndex);
        pending.push(child);
      }
      if (!call(node)) continue;
      let id = attrOf(node, "id");
      let dataId = attrOf(node, "data-id");
      let candidates = [
        ...(candidatesBySelector.get(node.tagName) ?? []),
        ...(id !== undefined ? (candidatesBySelector.get(idSelector(id)) ?? []) : []),
        ...(dataId !== undefined ? (candidatesBySelector.get(dataIdSelector(dataId)) ?? []) : []),
      ];
      candidateCount += candidates.length;
      if (candidateCount > MAX_ANCHOR_CANDIDATES) return results;
      for (let [anchorPath, anchorSelector] of candidates) {
        if (!matchesAnchorPath(node, anchorSelector, siblingIndexes)) continue;
        let matches = matchesById.get(anchorPath) ?? [];
        if (matches.length < 2) {
          matches.push(node);
          matchesById.set(anchorPath, matches);
        }
      }
    }
    let snippetBudget = MAX_SNIPPET_LOOKUPS;
    for (let anchorPath of uniq([...(regionKidsByPath?.keys() ?? []), ...matchesById.keys()])) {
      let matches = matchesById.get(anchorPath);
      if (matches === undefined || matches.length !== 1) continue;
      let kids = renderChildAnchors(matches[0], regionKidsByPath?.get(anchorPath), snippetBudget);
      snippetBudget -= kids?.size ?? 0;
      results.set(anchorPath, {
        snippet: renderAnchorElement(matches[0]),
        ...(kids && {
          kids,
        }),
      });
    }
  } catch {}
  return results;
}
//@ chunk-9tgt55am.js:33555-33748 placement
function renderChildAnchors(element, kidIndexes, budget) {
  if (kidIndexes === undefined || kidIndexes.length === 0) return;
  let filtered = (element.childNodes ?? []).filter(call);
  let kids = new Map();
  for (let kidIndex of uniq(kidIndexes).slice(0, Math.max(0, budget))) {
    let child = filtered[kidIndex];
    kids.set(kidIndex, child === undefined ? null : renderAnchorElement(child));
  }
  return kids;
}
//@ chunk-9tgt55am.js:33748-34043 placement
function matchesAnchorPath(element, anchorSelector, siblingIndexes) {
  let current = element;
  for (let j = anchorSelector.length - 1; j >= 0; j--) {
    if (current === undefined || current === null || !call(current)) return false;
    let part = anchorSelector[j];
    if ("id" in part) {
      if (attrOf(current, "id") !== part.id) return false;
    } else if ("dataId" in part) {
      if (attrOf(current, "data-id") !== part.dataId) return false;
    } else if (current.tagName !== part.tag || siblingIndexes.get(current) !== part.index) return false;
    current = current.parentNode;
  }
  return true;
}
//@ chunk-9tgt55am.js:34043-34690 placement
function renderAnchorElement(element) {
  let joined = (element.attrs ?? [])
    .map((attr) => ` ${attr.name}="${collapseWhitespace(attr.value).replaceAll('"', "&quot;")}"`)
    .join("");
  let openTag = `<${element.tagName}${joined}>`;
  let tagHead = truncateCodePoints(openTag, MAX_ANCHOR_TEXT);
  let header = tagHead + (tagHead.length < openTag.length ? "\u2026" : "");
  if (SKIPPED_TAGS.has(element.tagName)) return header;
  let text = "";
  let truncated = false;
  let visitedCount = 0;
  let stack = [...(element.childNodes ?? [])].reverse();
  for (;;) {
    if (++visitedCount > MAX_SNIPPET_NODES) {
      truncated = true;
      break;
    }
    if ([...text].length > ANCHOR_SNIPPET_MAX_CHARS + 2) {
      truncated = stack.length > 0;
      break;
    }
    let node = stack.pop();
    if (node === undefined) break;
    if (node.nodeName === "#text" && typeof node.value === "string") {
      text = collapseWhitespace(text + node.value);
      continue;
    }
    if (call(node) && !SKIPPED_TAGS.has(node.tagName)) {
      text = collapseWhitespace(text + " ");
      for (let j = (node.childNodes?.length ?? 0) - 1; j >= 0; j--) stack.push(node.childNodes[j]);
    }
  }
  text = text.trim();
  let snippet = truncateCodePoints(text, ANCHOR_SNIPPET_MAX_CHARS);
  return snippet === ""
    ? header
    : `${header} ${snippet}${truncated || snippet.length < text.length ? "\u2026" : ""}`;
}
//@ chunk-9tgt55am.js:34690-35231 placement
async function fetchAnchorPageSource(options) {
  if (options.signal.aborted) return;
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  options.signal.addEventListener("abort", onAbort, {
    once: true,
  });
  let timer = setTimeout(
    (abortController) => abortController.abort(),
    ANCHOR_FETCH_TIMEOUT_MS,
    abortController,
  );
  try {
    let readPromise = webfetchReadFile(
      {
        slug: options.slug,
        env: claudeAiEnvironment(),
        ...(options.file !== undefined && {
          file: options.file,
        }),
      },
      abortController.signal,
      options.credentials,
      options.feature,
    ).catch(() => {
      return;
    });
    let result = await withDeadline(readPromise, ANCHOR_FETCH_TIMEOUT_MS + 250);
    if (result === undefined || result.err !== null) return;
    if ("contentType" in result && result.contentType !== "text/html") return;
    return {
      html: result.html,
      ver: result.ver,
      audienceSees: isAudienceVersionServed(result),
    };
  } catch {
    return;
  } finally {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", onAbort);
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
