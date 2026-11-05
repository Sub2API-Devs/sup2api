/**
 * ink/tabstops.ts
 *
 * 把制表符展开成空格（按 8 列制表位）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/tabstops.ts
 * pieces: chunk-42wa4pww.js (1)
 * attribution: fingerprint 1
 */
import { createTokenizer } from "./termio/tokenize.js";
import { ANSI_OR_C1_RE, WORD_JOINER } from "../utils/textWrap.js";

//@ chunk-42wa4pww.js:19521-19779 fingerprint (2.1.88 match: expandTabs, 0.923)
/**
 * 把文本里的制表符展开成空格（逐行、逐 \r 段，用分词器保留转义序列不展开）。
 */
function expandTabs(text) {
  let tokenizer = createTokenizer();
  return text
    .split(
      `
`,
    )
    .map((line) =>
      line.search(ANSI_OR_C1_RE) === -1
        ? line
        : line
            .split("\r")
            .map((line) =>
              line.search(ANSI_OR_C1_RE) === -1
                ? line
                : [...tokenizer.feed(line), ...tokenizer.flush()]
                    .map((token) =>
                      token.type === "sequence"
                        ? WORD_JOINER.repeat(token.value.length)
                        : token.value.replace(ANSI_OR_C1_RE, WORD_JOINER),
                    )
                    .join(""),
            )
            .join("\r"),
    ).join(`
`);
}
export { expandTabs };
