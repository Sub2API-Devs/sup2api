/**
 * services/artifacts/pageScripts.ts
 *
 * 2.1.316 新增：页面脚本提取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (10)
 * attribution: placement 10
 */
import { dataIdAttributeLength } from "./pageRuntimes.js";

//@ chunk-jv307fw4.js:16408-16426 placement
var PASSIVE = "passive";
//@ chunk-jv307fw4.js:16426-16451 placement
/**
 * 导出函数 `parseHtml`：参数 e，返回 e。
 */
function parseHtml(html) {
  return html;
}
//@ chunk-jv307fw4.js:16451-16550 placement
/**
 * 导出函数 `attrOf`：参数 e, n，返回 e.attrs?.find((s) => s.name.toLowerCase() === lower)?.value。
 */
function attrOf(node, name) {
  let lower = name.toLowerCase();
  return node.attrs?.find((attr) => attr.name.toLowerCase() === lower)?.value;
}
//@ chunk-jv307fw4.js:16550-16585 placement
var SAFE_SCRIPT_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
//@ chunk-jv307fw4.js:16585-16750 placement
function findIdAttributeTags(html, id) {
  let idAttr = `id="${id}"`;
  let ranges = [];
  let index = html.indexOf(idAttr);
  while (index !== -1) {
    let afterId = index + idAttr.length;
    let afterDataId = afterId + dataIdAttributeLength(html, afterId);
    if (html.charCodeAt(afterDataId) === 62) ranges.push([index, afterDataId + 1]);
    index = html.indexOf(idAttr, afterId);
  }
  return ranges;
}
//@ chunk-jv307fw4.js:16750-16902 placement
async function findElementsByIdSafe(html, id) {
  try {
    let { nestingBudgetExceeded } =
      await import("../../../vendor/@mixmark-io/domino/lib/RAWTEXT_MODES.lazy.js");
    if (nestingBudgetExceeded(html)) return null;
    return await findElementsById(html, id);
  } catch {
    return null;
  }
}
//@ chunk-jv307fw4.js:16902-17326 placement
/**
 * 解析 HTML 并遍历所有节点（包括 template 内容），找出 id 等于给定值的元素及其是否位于 template 中。
 */
async function findElementsById(html, id) {
  let { parse } = await import("../../../vendor/parse5/dist/tokenizer/Tokenizer.lazy.js");
  let node = parseHtml(
    parse(html, {
      sourceCodeLocationInfo: true,
    }),
  );
  let found = [];
  let stack = [
    {
      node,
      inTemplate: false,
    },
  ];
  for (;;) {
    let entry = stack.pop();
    if (entry === undefined) break;
    let { node, inTemplate } = entry;
    if (node.tagName !== undefined) {
      if (attrOf(node, "id") === id)
        found.push({
          node,
          inTemplate,
        });
    }
    for (let node_2 of node.childNodes ?? [])
      stack.push({
        node: node_2,
        inTemplate,
      });
    for (let node_2 of node.content?.childNodes ?? [])
      stack.push({
        node: node_2,
        inTemplate: true,
      });
  }
  return found;
}
//@ chunk-jv307fw4.js:17326-18001 placement
/**
 * 从页面 HTML 中提取 id 为给定值的 <script type="application/json"> 内容：先用字符串查找，再用 HTML 解析器核对唯一、不在 template 内、类型正确且位置一致；不确定时返回 ambiguous，找不到返回 null。
 */
async function extractJsonScriptById(html, id) {
  if (!SAFE_SCRIPT_ID_RE.test(id))
    return {
      ambiguous: true,
    };
  let textMatches = findIdAttributeTags(html, id);
  if (textMatches.length === 0) {
    let elementsById = await findElementsByIdSafe(html, id);
    if (elementsById === null)
      return {
        ambiguous: true,
      };
    return elementsById.length === 0
      ? null
      : {
          ambiguous: true,
        };
  }
  if (textMatches.length !== 1)
    return {
      ambiguous: true,
    };
  let [fullMatch, text] = textMatches[0];
  let parsedMatches = await findElementsByIdSafe(html, id);
  if (parsedMatches === null || parsedMatches.length !== 1 || parsedMatches[0].inTemplate)
    return {
      ambiguous: true,
    };
  let node = parsedMatches[0].node;
  let lower = (attrOf(node, "type") ?? "").trim().toLowerCase();
  let startTag = node.sourceCodeLocation?.startTag;
  let endTag = node.sourceCodeLocation?.endTag;
  if (
    (node.tagName ?? "").toLowerCase() !== "script" ||
    lower !== "application/json" ||
    startTag === undefined ||
    startTag === null ||
    endTag === undefined ||
    endTag === null
  )
    return {
      ambiguous: true,
    };
  if (fullMatch < startTag.startOffset || text !== startTag.endOffset)
    return {
      ambiguous: true,
    };
  return {
    json: html.slice(startTag.endOffset, endTag.startOffset),
  };
}
//@ chunk-jv307fw4.js:18001-18033 placement
/**
 * 接受“版本号时间戳不超前”的容差 10 分钟与版本串前缀正则。
 */
var MAX_VERSION_AHEAD_MS = 600000;
var VERSION_TS_PREFIX_RE = /^(\d{1,15})-/;
//@ chunk-jv307fw4.js:18033-18146 placement
/**
 * 接受版本号时间戳不超前于当前时间（允许少量偏差）的版本字符串，否则返回 undefined。
 */
function acceptVersionNotAhead(ver) {
  let timestampPart = ver === undefined ? undefined : VERSION_TS_PREFIX_RE.exec(ver)?.[1];
  return timestampPart !== undefined && Number(timestampPart) * 1000 <= Date.now() + MAX_VERSION_AHEAD_MS
    ? ver
    : undefined;
}
export { extractJsonScriptById, parseHtml, attrOf, PASSIVE, acceptVersionNotAhead, VERSION_TS_PREFIX_RE };
