/**
 * services/artifacts/htmlTokenizerBudget.ts
 *
 * 2.1.316 新增。带嵌套与属性预算的 HTML 扫描，用于检查 artifact 页面中的运行时块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ktx79ksk.js (4)
 * attribution: placement 4
 */
import {
  MAX_TREE_DEPTH,
  MAX_TOTAL_OPENS,
  MAX_FORMAT_ESTIMATE,
  MAX_TAG_COUNT,
  formattingElements,
  RAWTEXT_MODES,
  voidElements,
  formattingElementsWithoutNobr,
  MAX_ACTIVE_FORMATTING,
  svgBreakoutElements,
  mathTextIntegrationPoints,
  scopeBoundaryElements,
  specialElements,
  impliedEndTagsByOpener,
  scopeBreakElements,
  LAST_ANCESTOR_SCAN_DEPTH,
  foreignContentElements,
} from "../../../vendor/@mixmark-io/domino/lib/HTMLParser.js";
import { Tokenizer } from "../../../vendor/parse5/dist/tokenizer/index.js";

//@ chunk-ktx79ksk.js:2221-2282 placement
function nestingBudgetExceeded(budget) {
  return scanHtmlWithBudget(budget, {
    depth: MAX_TREE_DEPTH,
    totalOpens: MAX_TOTAL_OPENS,
  }).exceeded;
}
//@ chunk-ktx79ksk.js:2282-2416 placement
function budgetedTokenizer(budget, tokenizer) {
  let tokenCount = 0;
  let exhausted = false;
  let budgetedTokenizer = new BudgetedTokenizer(budget, tokenizer, (text) => {
    tokenCount += text;
    if (tokenCount > MAX_FORMAT_ESTIMATE) {
      exhausted = true;
      budgetedTokenizer.pause();
      return false;
    }
    return true;
  });
  return {
    tokenizer: budgetedTokenizer,
    overBudget: () => exhausted,
  };
}
//@ chunk-ktx79ksk.js:2416-6062 placement
/**
 * 在嵌套与属性预算内扫描 HTML
 */
function scanHtmlWithBudget(html, budget) {
  let openTags = [];
  let integrationPoints = [];
  let foreignDepthFlags = [];
  let foreignRoots = [];
  let htmlNamespaceStack = [];
  let selectDepth = 0;
  let framesetDepth = 0;
  let maxDepth = 0;
  let totalOpens = 0;
  let foreignRootDepth = 0;
  let integrationPointDepth = 0;
  let costEstimate = 0;
  let htmlBodyAttrs = new Set();
  let openTagCount = 0;
  let formatDepth = 0;
  let maxFormatDepth = 0;
  let formSplices = 0;
  let failClosed = false;
  let openCountByTag = new Map();
  let exceeded = false;
  function abort() {
    exceeded = true;
    tokenizer.pause();
  }
  let noop = () => {};
  function dropForeignUntilHtml() {
    while (openTags.length > 0 && htmlNamespaceStack.at(-1) === "f") {
      let tag = openTags.pop();
      foreignDepthFlags.pop();
      if (integrationPoints.pop() === true && integrationPointDepth > 0) {
        integrationPointDepth--;
        if (htmlNamespaceStack.at(-1) === "i") htmlNamespaceStack.pop();
      }
      if (tag === "svg" || tag === "math") {
        foreignRootDepth--;
        foreignRoots.pop();
        if (htmlNamespaceStack.at(-1) === "f") htmlNamespaceStack.pop();
      } else if (tag === "select" && selectDepth > 0) selectDepth--;
      else if (tag === "frameset" && framesetDepth > 0) framesetDepth--;
    }
  }
  function hasFontAttrs(attrs) {
    if (attrs === undefined) return false;
    return attrs.some((attr) => {
      let name = attr !== null && typeof attr === "object" ? attr.name : undefined;
      if (typeof name !== "string") return false;
      let lower = name.toLowerCase();
      return lower === "color" || lower === "face" || lower === "size";
    });
  }
  let tokenizer = new BudgetedTokenizer(
    {},
    {
      onStartTag(token) {
        if (exceeded) return;
        costEstimate += openTags.length + 1 + formatDepth;
        openTagCount++;
        if (budget !== null && (costEstimate > MAX_FORMAT_ESTIMATE || openTagCount > MAX_TAG_COUNT)) {
          abort();
          return;
        }
        let tagName = token.tagName;
        if (
          htmlNamespaceStack.at(-1) === "f" &&
          formattingElements.has(tagName) &&
          (tagName !== "font" || hasFontAttrs(token.attrs))
        )
          dropForeignUntilHtml();
        let htmlNamespace = htmlNamespaceStack.length === 0 || htmlNamespaceStack.at(-1) === "i";
        if (htmlNamespace && (tagName === "html" || tagName === "body")) {
          let isMismatch = !(
            openTags.length <= 2 && openTags.every((tag) => tag === "html" || tag === "head")
          );
          for (let attr of token.attrs ?? [])
            htmlBodyAttrs.add((tagName === "html" ? "h:" : "b:") + attr.name);
          if (isMismatch) {
            costEstimate += 8 * htmlBodyAttrs.size;
            if (budget !== null && costEstimate > MAX_FORMAT_ESTIMATE) abort();
            return;
          }
        }
        if (
          (foreignRootDepth > 0 && (tagName === "mglyph" || tagName === "malignmark")) ||
          (!htmlNamespace && selectDepth > 0 && (tagName === "script" || tagName === "textarea")) ||
          (htmlNamespaceStack.at(-1) === "f" &&
            (tagName === "svg" || tagName === "math") &&
            foreignRoots.at(-1) !== tagName)
        ) {
          failClosed = true;
          abort();
          return;
        }
        let mode = htmlNamespace ? RAWTEXT_MODES.get(tagName) : undefined;
        if (mode !== undefined && (framesetDepth > 0 || (selectDepth > 0 && tagName !== "script"))) {
          failClosed = true;
          abort();
          return;
        }
        if (mode !== undefined) {
          tokenizer.state = mode;
          tokenizer.lastStartTagName = tagName;
        }
        if (voidElements.has(tagName) && htmlNamespace) return;
        totalOpens++;
        if ((tagName === "svg" || tagName === "math") && token.selfClosing) return;
        if (!(token.selfClosing && !htmlNamespace)) {
          if (formattingElementsWithoutNobr.has(tagName)) {
            openCountByTag.set(tagName, (openCountByTag.get(tagName) ?? 0) + 1);
            formatDepth++;
            if (formatDepth > maxFormatDepth) maxFormatDepth = formatDepth;
            if (budget !== null && formatDepth > MAX_ACTIVE_FORMATTING) {
              abort();
              return;
            }
          }
          openTags.push(tagName);
          if (openTags.length > maxDepth) maxDepth = openTags.length;
          let integrationPoint = false;
          let inForeign = htmlNamespaceStack.at(-1) === "f";
          if (tagName === "svg" || tagName === "math") {
            foreignRootDepth++;
            foreignRoots.push(tagName);
            htmlNamespaceStack.push("f");
          } else if (tagName === "select") selectDepth++;
          else if (tagName === "frameset") framesetDepth++;
          else if (inForeign) {
            let last = foreignRoots.at(-1);
            if (last === "svg") integrationPoint = svgBreakoutElements.has(tagName);
            else if (last === "math")
              integrationPoint =
                mathTextIntegrationPoints.has(tagName) ||
                (tagName === "annotation-xml" &&
                  token.attrs?.some(
                    (attr) =>
                      attr.name.toLowerCase() === "encoding" &&
                      ["text/html", "application/xhtml+xml"].includes(attr.value.toLowerCase()),
                  ) === true);
            if (integrationPoint) {
              integrationPointDepth++;
              htmlNamespaceStack.push("i");
            }
          }
          integrationPoints.push(integrationPoint);
          foreignDepthFlags.push(tagName === "svg" || tagName === "math" || (inForeign && !integrationPoint));
        }
        if (budget !== null && (openTags.length > budget.depth || totalOpens > budget.totalOpens)) abort();
      },
      onEndTag(token) {
        if (exceeded) return;
        costEstimate += openTags.length + 1 + formatDepth;
        openTagCount++;
        if (budget !== null && (costEstimate > MAX_FORMAT_ESTIMATE || openTagCount > MAX_TAG_COUNT)) {
          abort();
          return;
        }
        let tagName = token.tagName;
        if (
          htmlNamespaceStack.at(-1) === "i" &&
          tagName !== "p" &&
          tagName !== "br" &&
          !(openTags.at(-1) === tagName && integrationPoints.at(-1) === true)
        ) {
          for (let idx = openTags.length - 1; idx >= 0; idx--)
            if ((foreignDepthFlags[idx] || integrationPoints[idx] === true) && openTags[idx] === tagName) {
              failClosed = true;
              abort();
              return;
            }
        }
        if (scopeBoundaryElements.has(tagName)) {
          if (tagName === "html" && foreignRootDepth > 0) {
            for (let idx = openTags.length - 1; idx >= 0; idx--)
              if (foreignDepthFlags[idx] && openTags[idx] === "html") {
                failClosed = true;
                abort();
                return;
              }
          }
          return;
        }
        if (selectDepth > 0 && htmlNamespaceStack.at(-1) === "f" && (tagName === "p" || tagName === "br")) {
          failClosed = true;
          abort();
          return;
        }
        if (
          selectDepth > 0 &&
          !(
            openTags.at(-1) === tagName &&
            (foreignDepthFlags.at(-1) === true || integrationPoints.at(-1) === true)
          ) &&
          tagName !== "select" &&
          tagName !== "option" &&
          tagName !== "optgroup" &&
          tagName !== "template" &&
          tagName !== "script"
        )
          return;
        if (htmlNamespaceStack.at(-1) === "f" && (tagName === "p" || tagName === "br"))
          dropForeignUntilHtml();
        let isScopeBoundary = specialElements.has(tagName);
        let stops = impliedEndTagsByOpener.get(tagName);
        let floor = scopeBreakElements.has(tagName)
          ? Math.max(0, openTags.length - 1)
          : Math.max(0, openTags.length - LAST_ANCESTOR_SCAN_DEPTH);
        for (let idx = openTags.length - 1; idx >= floor; idx--) {
          let tag = openTags[idx];
          if (tag === tagName) {
            if (formattingElementsWithoutNobr.has(tagName)) {
              let count = openCountByTag.get(tagName) ?? 0;
              if (count > 0) {
                openCountByTag.set(tagName, count - 1);
                if (formatDepth > 0) formatDepth--;
              }
            }
            if (tagName === "form") {
              openTags.splice(idx, 1);
              integrationPoints.splice(idx, 1);
              foreignDepthFlags.splice(idx, 1);
              formSplices++;
              return;
            }
            for (let idx_2 = openTags.length - 1; idx_2 >= idx; idx_2--) {
              let tag = openTags[idx_2];
              if (integrationPoints[idx_2] === true && integrationPointDepth > 0) {
                integrationPointDepth--;
                if (htmlNamespaceStack.at(-1) === "i") htmlNamespaceStack.pop();
              }
              if (tag === "svg" || tag === "math") {
                if (foreignRootDepth > 0) foreignRootDepth--;
                foreignRoots.pop();
                if (htmlNamespaceStack.at(-1) === "f") htmlNamespaceStack.pop();
              } else if (tag === "select" && selectDepth > 0) selectDepth--;
              else if (tag === "frameset" && framesetDepth > 0) framesetDepth--;
            }
            openTags.length = idx;
            integrationPoints.length = idx;
            foreignDepthFlags.length = idx;
            return;
          }
          if (foreignContentElements.has(tag) || stops?.has(tag) === true) return;
          if (!isScopeBoundary && specialElements.has(tag)) return;
        }
      },
      onComment(comment) {
        if (
          exceeded ||
          foreignRootDepth === 0 ||
          !comment.data.startsWith("[CDATA[") ||
          comment.data.endsWith("]]")
        )
          return;
        let start = tokenizer.preprocessor.offset + 1;
        let index = html.indexOf("]]>", start);
        let body = index === -1 ? html.slice(start) : html.slice(start, index);
        if (/<[a-zA-Z!/?]/.test(body)) {
          failClosed = true;
          abort();
        }
      },
      onDoctype: noop,
      onCharacter: noop,
      onNullCharacter: noop,
      onWhitespaceCharacter: noop,
      onEof: noop,
      onParseError: noop,
    },
    (cost) => {
      costEstimate += cost;
      if (budget !== null && costEstimate > MAX_FORMAT_ESTIMATE) {
        abort();
        return false;
      }
      return true;
    },
  );
  tokenizer.write(html, true);
  return {
    exceeded,
    maxDepth,
    totalOpens,
    maxFmtEstimate: maxFormatDepth,
    formSplices,
    failClosed,
  };
}
//@ chunk-ktx79ksk.js:6062-6283 placement
/**
 * 计入属性预算的 HTML 分词器
 */
class BudgetedTokenizer extends Tokenizer {
  #e;
  constructor(budget, tokenizer, shouldSkip) {
    super(budget, tokenizer);
    this.#e = shouldSkip;
  }
  _leaveAttrName() {
    let currentToken = this.currentToken;
    let attrName =
      currentToken !== null && "attrs" in currentToken
        ? currentToken.attrs.length * (1 + (this.currentAttr.name.length >> 6))
        : 0;
    if (this.#e(attrName)) super._leaveAttrName();
  }
}
export { budgetedTokenizer, nestingBudgetExceeded };
