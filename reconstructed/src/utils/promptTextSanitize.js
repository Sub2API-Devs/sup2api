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
import { EXIT_COMMAND_WORDS } from "./handlePromptSubmit.js";
import { getSecondRootError } from "../ink/terminal.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { stripInvisibleChars_2 } from "./invisibleChars.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:67247-67365 placement
/**
 * 去除提示中的不可见字符并记录移除统计。
 */
function sanitizePromptText_2(e, n) {
  let { text, removed } = stripInvisiblePromptText(e);
  if (removed.removedTotal > 0) stripInvisiblePromptChars(removed, n);
  return {
    text,
    removedTotal: removed.removedTotal,
  };
}
//@ chunk-e6aww6q8.js:67365-68313 placement
/**
 * 展开粘贴文本引用（[Pasted text #N]）。
 */
function expandPastedTextRefs(e, n) {
  let r = stripInvisiblePromptText(e);
  let { removed, text } = r;
  let y = n;
  let pastedRefs = parsePastedRefs(text);
  let w = new Map();
  for (let { id } of pastedRefs) {
    let G = y[id];
    if (G?.type !== "text") continue;
    let q = stripInvisiblePromptText(G.content);
    if (q.text !== G.content) {
      if (y === n)
        y = {
          ...n,
        };
      y[id] = {
        ...G,
        content: q.text,
      };
      addRemovalCounts(removed, q.removed);
      let pastedTextRefNumLines = getPastedTextRefNumLines(q.text);
      if (pastedTextRefNumLines !== getPastedTextRefNumLines(G.content)) w.set(id, pastedTextRefNumLines);
    }
  }
  for (let L of Object.values(y)) {
    if (L.type !== "text" || !L.inline) continue;
    let trimmed = stripInvisiblePromptText(L.content).text.trim();
    if (trimmed === L.content) continue;
    let found = nfcVariants(L.content).find((ke) => e.includes(ke));
    let Z =
      found === undefined || found === L.content ? trimmed : stripInvisiblePromptText(found).text.trim();
    let Se = text.includes(Z) ? Z : trimmed;
    if (y === n)
      y = {
        ...n,
      };
    if (Se === "") delete y[L.id];
    else
      y[L.id] = {
        ...L,
        content: Se,
      };
  }
  if (w.size > 0)
    for (let idx = pastedRefs.length - 1; idx >= 0; idx--) {
      let G = pastedRefs[idx];
      let q = w.get(G.id);
      if (q === undefined) continue;
      let Z = G.match.startsWith("[Pasted text #")
        ? formatPastedTextRef(G.id, q)
        : G.match.startsWith("[...Truncated text #")
          ? `[...Truncated text #${G.id} +${q} lines...]`
          : G.match;
      text = text.slice(0, G.index) + Z + text.slice(G.index + G.match.length);
    }
  return {
    input: text,
    pastedContents: y,
    removed,
  };
}
//@ chunk-e6aww6q8.js:68313-68434 placement
/**
 * 判断是否不需要提示"已移除不可见字符"：非 prompt 模式、空文本、含双向控制字符、斜杠/叹号命令或内置命令。
 */
function skipInvisibleCharsNotice(e, removed, mode) {
  let trimmed = e.trim();
  return (
    mode !== "prompt" ||
    trimmed === "" ||
    removed.removedByClass.bidi > 0 ||
    /^[/!]/.test(trimmed) ||
    EXIT_COMMAND_WORDS.includes(trimmed)
  );
}
//@ chunk-e6aww6q8.js:68434-68504 placement
/**
 * forceRedraw：强制重绘。
 */
function forceRedraw() {
  getSecondRootError().get(process.stdout)?.forceRedraw({
    flushReact: true,
  });
}
//@ chunk-e6aww6q8.js:68504-69013 placement
function stripInvisiblePromptChars(removed, n) {
  logEvent("tengu_prompt_invisible_strip", {
    surface: fromEnum(n),
    removed_total: removed.removedTotal,
    removed_tags: removed.removedByClass.tags,
    removed_bidi: removed.removedByClass.bidi,
    removed_zero_width: removed.removedByClass.zeroWidth,
    removed_selectors: removed.removedByClass.selectors,
    removed_other: removed.removedByClass.other,
    kept_conditional: removed.keptConditional,
    text_length_bucket:
      removed.textLength <= 100
        ? lit_2("le_100")
        : removed.textLength <= 1000
          ? lit_2("le_1k")
          : removed.textLength <= 1e4
            ? lit_2("le_10k")
            : removed.textLength <= 1e5
              ? lit_2("le_100k")
              : lit_2("gt_100k"),
  });
  logFeatureOk("input_invisible_strip");
}
//@ chunk-e6aww6q8.js:69013-69273 placement
function stripInvisiblePromptText(e) {
  let n = stripInvisibleChars_2(e);
  if (n.text === e || !tranquilCloudOn())
    return {
      text: e,
      removed: {
        removedTotal: 0,
        removedByClass: {
          tags: 0,
          bidi: 0,
          zeroWidth: 0,
          selectors: 0,
          other: 0,
        },
        keptConditional: 0,
        textLength: e.length,
      },
    };
  let { text, ...s } = n;
  return {
    text,
    removed: {
      ...s,
      textLength: e.length,
    },
  };
}
//@ chunk-e6aww6q8.js:69273-69470 placement
function addRemovalCounts(removed, removed_2) {
  removed.removedTotal += removed_2.removedTotal;
  removed.keptConditional += removed_2.keptConditional;
  removed.textLength += removed_2.textLength;
  for (let key of Object.keys(removed_2.removedByClass))
    removed.removedByClass[key] += removed_2.removedByClass[key];
}
//@ chunk-e6aww6q8.js:69470-69521 placement
function tranquilCloudOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tranquil_cloud", true);
}
//@ chunk-e6aww6q8.js:69521-69575 placement
/**
 * sanitizePromptText：按开关清洗提示词文本。
 */
function sanitizePromptText() {
  let e = tranquilCloudOn();
  return (n) => (e ? stripInvisibleChars_2(n).text : n);
}
export {
  sanitizePromptText,
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  skipInvisibleCharsNotice,
  sanitizePromptText_2,
  forceRedraw,
};
