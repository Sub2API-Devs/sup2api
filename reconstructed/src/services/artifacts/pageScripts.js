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
function hFr(e) {
  return e;
}
//@ chunk-jv307fw4.js:16451-16550 placement
function abt(e, n) {
  let lower = n.toLowerCase();
  return e.attrs?.find((s) => s.name.toLowerCase() === lower)?.value;
}
//@ chunk-jv307fw4.js:16550-16585 placement
var Et = /^[a-z0-9][a-z0-9-]{0,63}$/;
//@ chunk-jv307fw4.js:16585-16750 placement
function findIdAttributeTags(e, n) {
  let r = `id="${n}"`,
    s = [],
    index = e.indexOf(r);
  while (index !== -1) {
    let l = index + r.length,
      d = l + dataIdAttributeLength(e, l);
    if (e.charCodeAt(d) === 62) s.push([index, d + 1]);
    index = e.indexOf(r, l);
  }
  return s;
}
//@ chunk-jv307fw4.js:16750-16902 placement
async function findElementsByIdSafe(e, n) {
  try {
    let { nestingBudgetExceeded: nestingBudgetExceeded } = await import("./chunk-kpk3x82b.js");
    if (nestingBudgetExceeded(e)) return null;
    return await findElementsById(e, n);
  } catch {
    return null;
  }
}
/**
 * 解析 HTML 并遍历所有节点（包括 template 内容），找出 id 等于给定值的元素及其是否位于 template 中。
 */
//@ chunk-jv307fw4.js:16902-17326 placement
async function findElementsById(e, n) {
  let { parse: parse } = await import("./chunk-ytv6b64r.js"),
    s = hFr(parse(e, { sourceCodeLocationInfo: !0 })),
    a = [],
    l = [{ node: s, inTemplate: !1 }];
  for (;;) {
    let d = l.pop();
    if (d === void 0) break;
    let { node: node, inTemplate: inTemplate } = d;
    if (node.tagName !== void 0) {
      if (abt(node, "id") === n) a.push({ node: node, inTemplate: inTemplate });
    }
    for (let T of node.childNodes ?? []) l.push({ node: T, inTemplate: inTemplate });
    for (let T of node.content?.childNodes ?? []) l.push({ node: T, inTemplate: !0 });
  }
  return a;
}
/**
 * 从页面 HTML 中提取 id 为给定值的 <script type="application/json"> 内容：先用字符串查找，再用 HTML 解析器核对唯一、不在 template 内、类型正确且位置一致；不确定时返回 ambiguous，找不到返回 null。
 */
//@ chunk-jv307fw4.js:17326-18001 placement
async function extractJsonScriptById(html, id) {
  if (!Et.test(id)) return { ambiguous: !0 };
  let textMatches = findIdAttributeTags(html, id);
  if (textMatches.length === 0) {
    let P = await findElementsByIdSafe(html, id);
    if (P === null) return { ambiguous: !0 };
    return P.length === 0 ? null : { ambiguous: !0 };
  }
  if (textMatches.length !== 1) return { ambiguous: !0 };
  let [s, a] = textMatches[0],
    parsedMatches = await findElementsByIdSafe(html, id);
  if (parsedMatches === null || parsedMatches.length !== 1 || parsedMatches[0].inTemplate)
    return { ambiguous: !0 };
  let node = parsedMatches[0].node,
    lower = (abt(node, "type") ?? "").trim().toLowerCase(),
    startTag = node.sourceCodeLocation?.startTag,
    endTag = node.sourceCodeLocation?.endTag;
  if (
    (node.tagName ?? "").toLowerCase() !== "script" ||
    lower !== "application/json" ||
    startTag === void 0 ||
    startTag === null ||
    endTag === void 0 ||
    endTag === null
  )
    return { ambiguous: !0 };
  if (s < startTag.startOffset || a !== startTag.endOffset) return { ambiguous: !0 };
  return { json: html.slice(startTag.endOffset, endTag.startOffset) };
}
//@ chunk-jv307fw4.js:18001-18033 placement
var St = 600000,
  We = /^(\d{1,15})-/;
/**
 * 接受版本号时间戳不超前于当前时间（允许少量偏差）的版本字符串，否则返回 undefined。
 */
//@ chunk-jv307fw4.js:18033-18146 placement
function acceptVersionNotAhead(e) {
  let n = e === void 0 ? void 0 : We.exec(e)?.[1];
  return n !== void 0 && Number(n) * 1000 <= Date.now() + St ? e : void 0;
}

export { extractJsonScriptById, hFr, abt, PASSIVE, acceptVersionNotAhead, We };
