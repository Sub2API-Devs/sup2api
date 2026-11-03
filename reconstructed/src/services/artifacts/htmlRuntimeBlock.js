/**
 * services/artifacts/htmlRuntimeBlock.ts
 *
 * 2.1.316 新增：Artifact HTML 运行时代码块插入位置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1c8ngz3c.js (2)
 * attribution: placement 2
 */
import { budgetedTokenizer } from "./htmlTokenizerBudget.js";
import { RAWTEXT_MODES } from "../../../vendor/@mixmark-io/domino/lib/HTMLParser.js";

//@ chunk-1c8ngz3c.js:260-299 placement
var d = /<\/(?:body|html)[\t\n\f\r />]/i;
//@ chunk-1c8ngz3c.js:299-802 placement
function runtimeBlockInsertionIndex(n) {
  if (!d.test(n)) return n.length;
  let e = -1,
    o = () => {
      e = -1;
    },
    r = () => {},
    { tokenizer: tokenizer, overBudget: overBudget } = budgetedTokenizer(
      { sourceCodeLocationInfo: !0 },
      {
        onStartTag(t) {
          let i = RAWTEXT_MODES.get(t.tagName);
          if (i !== void 0) ((tokenizer.state = i), (tokenizer.lastStartTagName = t.tagName));
          if (t.tagName !== "html") o();
        },
        onEndTag(t) {
          if (t.tagName !== "body" && t.tagName !== "html") o();
          else if (e < 0 && t.location) e = t.location.startOffset;
        },
        onComment: r,
        onDoctype: r,
        onCharacter: o,
        onNullCharacter: o,
        onWhitespaceCharacter: r,
        onEof: r,
      },
    );
  if ((tokenizer.write(n, !0), overBudget())) return;
  return e >= 0 ? e : n.length;
}
