/**
 * utils/promptTextSanitize.ts
 *
 * 2.1.316 新增：提示文本清理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { parsePastedRefs, getPastedTextRefNumLines, nfcVariants, formatPastedTextRef } from "../history.js";
import { cX } from "./handlePromptSubmit.js";
import { di } from "../ink/terminal.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { stripInvisibleChars as stripInvisibleChars_2 } from "./invisibleChars.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

/**
 * 去除提示中的不可见字符并记录移除统计。
 */
//@ chunk-e6aww6q8.js:67247-67365 placement
function sanitizePromptText(e, n) {
  let { text: text, removed: removed } = stripInvisiblePromptText(e);
  if (removed.removedTotal > 0) stripInvisiblePromptChars(removed, n);
  return { text: text, removedTotal: removed.removedTotal };
}
/**
 * 展开粘贴文本引用（[Pasted text #N]）。
 */
//@ chunk-e6aww6q8.js:67365-68313 placement
function expandPastedTextRefs(e, n) {
  let r = stripInvisiblePromptText(e),
    { removed: removed, text: text } = r,
    y = n,
    S = parsePastedRefs(text),
    w = new Map();
  for (let { id: id } of S) {
    let G = y[id];
    if (G?.type !== "text") continue;
    let q = stripInvisiblePromptText(G.content);
    if (q.text !== G.content) {
      if (y === n) y = { ...n };
      ((y[id] = { ...G, content: q.text }), addRemovalCounts(removed, q.removed));
      let Z = getPastedTextRefNumLines(q.text);
      if (Z !== getPastedTextRefNumLines(G.content)) w.set(id, Z);
    }
  }
  for (let L of Object.values(y)) {
    if (L.type !== "text" || !L.inline) continue;
    let trimmed = stripInvisiblePromptText(L.content).text.trim();
    if (trimmed === L.content) continue;
    let found = nfcVariants(L.content).find((ke) => e.includes(ke)),
      Z = found === void 0 || found === L.content ? trimmed : stripInvisiblePromptText(found).text.trim(),
      Se = text.includes(Z) ? Z : trimmed;
    if (y === n) y = { ...n };
    if (Se === "") delete y[L.id];
    else y[L.id] = { ...L, content: Se };
  }
  if (w.size > 0)
    for (let L = S.length - 1; L >= 0; L--) {
      let G = S[L],
        q = w.get(G.id);
      if (q === void 0) continue;
      let Z = G.match.startsWith("[Pasted text #")
        ? formatPastedTextRef(G.id, q)
        : G.match.startsWith("[...Truncated text #")
          ? `[...Truncated text #${G.id} +${q} lines...]`
          : G.match;
      text = text.slice(0, G.index) + Z + text.slice(G.index + G.match.length);
    }
  return { input: text, pastedContents: y, removed: removed };
}
/**
 * 判断是否不需要提示"已移除不可见字符"：非 prompt 模式、空文本、含双向控制字符、斜杠/叹号命令或内置命令。
 */
//@ chunk-e6aww6q8.js:68313-68434 placement
function skipInvisibleCharsNotice(e, n, r) {
  let trimmed = e.trim();
  return (
    r !== "prompt" ||
    trimmed === "" ||
    n.removedByClass.bidi > 0 ||
    /^[/!]/.test(trimmed) ||
    cX.includes(trimmed)
  );
}
//@ chunk-e6aww6q8.js:68434-68504 placement
function M1r() {
  di().get(process.stdout)?.forceRedraw({ flushReact: !0 });
}
//@ chunk-e6aww6q8.js:68504-69013 placement
function stripInvisiblePromptChars(e, n) {
  (logEvent("tengu_prompt_invisible_strip", {
    surface: fromEnum(n),
    removed_total: e.removedTotal,
    removed_tags: e.removedByClass.tags,
    removed_bidi: e.removedByClass.bidi,
    removed_zero_width: e.removedByClass.zeroWidth,
    removed_selectors: e.removedByClass.selectors,
    removed_other: e.removedByClass.other,
    kept_conditional: e.keptConditional,
    text_length_bucket:
      e.textLength <= 100
        ? lit_2("le_100")
        : e.textLength <= 1000
          ? lit_2("le_1k")
          : e.textLength <= 1e4
            ? lit_2("le_10k")
            : e.textLength <= 1e5
              ? lit_2("le_100k")
              : lit_2("gt_100k"),
  }),
    logFeatureOk("input_invisible_strip"));
}
//@ chunk-e6aww6q8.js:69013-69273 placement
function stripInvisiblePromptText(e) {
  let n = stripInvisibleChars_2(e);
  if (n.text === e || !SNe())
    return {
      text: e,
      removed: {
        removedTotal: 0,
        removedByClass: { tags: 0, bidi: 0, zeroWidth: 0, selectors: 0, other: 0 },
        keptConditional: 0,
        textLength: e.length,
      },
    };
  let { text: text, ...s } = n;
  return { text: text, removed: { ...s, textLength: e.length } };
}
//@ chunk-e6aww6q8.js:69273-69470 placement
function addRemovalCounts(e, n) {
  ((e.removedTotal += n.removedTotal),
    (e.keptConditional += n.keptConditional),
    (e.textLength += n.textLength));
  for (let r of Object.keys(n.removedByClass)) e.removedByClass[r] += n.removedByClass[r];
}
//@ chunk-e6aww6q8.js:69470-69521 placement
function SNe() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tranquil_cloud", !0);
}
//@ chunk-e6aww6q8.js:69521-69575 placement
function tUo() {
  let e = SNe();
  return (n) => (e ? stripInvisibleChars_2(n).text : n);
}

export {
  tUo,
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  skipInvisibleCharsNotice,
  sanitizePromptText,
  M1r,
};
