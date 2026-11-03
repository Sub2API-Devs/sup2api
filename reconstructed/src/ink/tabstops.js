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
import { tt, Rt } from "../utils/textWrap.js";

/**
 * 把文本里的制表符展开成空格（逐行、逐 \r 段，用分词器保留转义序列不展开）。
 */
//@ chunk-7p2hc4jn.js:19521-19779 fingerprint = expandTabs (0.923)
function expandTabs(e) {
  let tokenizer = createTokenizer();
  return e
    .split(
      `
`,
    )
    .map((n) =>
      n.search(tt) === -1
        ? n
        : n
            .split("\r")
            .map((s) =>
              s.search(tt) === -1
                ? s
                : [...tokenizer.feed(s), ...tokenizer.flush()]
                    .map((o) => (o.type === "sequence" ? Rt.repeat(o.value.length) : o.value.replace(tt, Rt)))
                    .join(""),
            )
            .join("\r"),
    ).join(`
`);
}

export { expandTabs };
