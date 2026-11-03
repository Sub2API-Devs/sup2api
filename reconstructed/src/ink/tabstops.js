/**
 * ink/tabstops.ts
 *
 * 把制表符展开成空格（按 8 列制表位）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/tabstops.ts
 * pieces: chunk-7p2hc4jn.js (1)
 * attribution: fingerprint 1
 */
import { createTokenizer } from "./termio/tokenize.js";
import { ANSI_OR_C1_RE, WORD_JOINER } from "../utils/textWrap.js";

//@ chunk-7p2hc4jn.js:19521-19779 fingerprint = expandTabs (0.923)
/**
 * 把文本里的制表符展开成空格（逐行、逐 \r 段，用分词器保留转义序列不展开）。
 */
function expandTabs(e) {
  let tokenizer = createTokenizer();
  return e
    .split(
      `
`,
    )
    .map((line) =>
      line.search(ANSI_OR_C1_RE) === -1
        ? line
        : line
            .split("\r")
            .map((s) =>
              s.search(ANSI_OR_C1_RE) === -1
                ? s
                : [...tokenizer.feed(s), ...tokenizer.flush()]
                    .map((o) =>
                      o.type === "sequence"
                        ? WORD_JOINER.repeat(o.value.length)
                        : o.value.replace(ANSI_OR_C1_RE, WORD_JOINER),
                    )
                    .join(""),
            )
            .join("\r"),
    ).join(`
`);
}
export { expandTabs };
