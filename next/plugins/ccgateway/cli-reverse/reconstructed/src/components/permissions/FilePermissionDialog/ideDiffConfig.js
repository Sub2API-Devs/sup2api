/**
 * components/permissions/FilePermissionDialog/ideDiffConfig.ts
 *
 * IDE diff 配置：单个编辑的 diff 描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/ideDiffConfig.ts
 * pieces: chunk-s67vc0kc.js (2)
 * attribution: placement 1, fingerprint 1
 */

//@ chunk-s67vc0kc.js:1066-1196 placement (2.1.88 match: UNDERLINE_STYLES, 0.497)
function quoteKind(char) {
  if (char === "'" || (char >= "\u2018" && char <= "\u201B")) return "single";
  if (char === '"' || (char >= "\u201C" && char <= "\u201E")) return "double";
  return null;
}
//@ chunk-s67vc0kc.js:1196-1510 fingerprint (2.1.88 match: createSingleEditDiffConfig, 0.38)
function createSingleEditDiffConfig(text) {
  let out = "";
  let openQuote = null;
  for (let idx = 0; idx < text.length; idx++) {
    let char = text[idx];
    if (char === "`") {
      if (openQuote === "single") out += "``";
      else if (idx + 1 < text.length) {
        out += char + text[idx + 1];
        idx++;
      } else out += char;
      continue;
    }
    let kind = quoteKind(char);
    if (openQuote === null) {
      if (kind !== null) {
        openQuote = kind;
        continue;
      }
      out += char;
    } else if (kind === openQuote) {
      if (idx + 1 < text.length && quoteKind(text[idx + 1]) === kind) {
        out += text[idx + 1];
        idx++;
        continue;
      }
      openQuote = null;
    } else out += char;
  }
  return out;
}
export { createSingleEditDiffConfig };
