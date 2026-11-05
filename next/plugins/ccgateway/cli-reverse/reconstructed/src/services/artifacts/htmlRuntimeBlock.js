/**
 * services/artifacts/htmlRuntimeBlock.ts
 *
 * 2.1.316 新增：Artifact HTML 运行时代码块插入位置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h1zz05d3.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { budgetedTokenizer } from "./htmlTokenizerBudget.js";
import { RAWTEXT_MODES } from "../../../vendor/@mixmark-io/domino/lib/HTMLParser.js";

//@ chunk-h1zz05d3.js:260-299 placement
var HTML_CLOSE_TAG_RE = /<\/(?:body|html)[\t\n\f\r />]/i;
//@ chunk-h1zz05d3.js:299-802 placement
function runtimeBlockInsertionIndex(html) {
  if (!HTML_CLOSE_TAG_RE.test(html)) return html.length;
  let depth = -1;
  let onHtmlClose = () => {
    depth = -1;
  };
  let noop = () => {};
  let { tokenizer, overBudget } = budgetedTokenizer(
    {
      sourceCodeLocationInfo: true,
    },
    {
      onStartTag(tag) {
        let mode = RAWTEXT_MODES.get(tag.tagName);
        if (mode !== undefined) {
          tokenizer.state = mode;
          tokenizer.lastStartTagName = tag.tagName;
        }
        if (tag.tagName !== "html") onHtmlClose();
      },
      onEndTag(tag) {
        if (tag.tagName !== "body" && tag.tagName !== "html") onHtmlClose();
        else if (depth < 0 && tag.location) depth = tag.location.startOffset;
      },
      onComment: noop,
      onDoctype: noop,
      onCharacter: onHtmlClose,
      onNullCharacter: onHtmlClose,
      onWhitespaceCharacter: noop,
      onEof: noop,
    },
  );
  tokenizer.write(html, true);
  if (overBudget()) return;
  return depth >= 0 ? depth : html.length;
}
export { runtimeBlockInsertionIndex };
