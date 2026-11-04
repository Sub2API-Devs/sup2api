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
function sanitizePromptText_2(text, surface) {
  let { text: text_2, removed } = stripInvisiblePromptText(text);
  if (removed.removedTotal > 0) stripInvisiblePromptChars(removed, surface);
  return {
    text: text_2,
    removedTotal: removed.removedTotal,
  };
}
//@ chunk-e6aww6q8.js:67365-68313 placement
/**
 * 展开粘贴文本引用（[Pasted text #N]）。
 */
function expandPastedTextRefs(input, pastedContents) {
  let stripped = stripInvisiblePromptText(input);
  let { removed, text } = stripped;
  let pasted = pastedContents;
  let pastedRefs = parsePastedRefs(text);
  let lineCountChanges = new Map();
  for (let { id } of pastedRefs) {
    let entry = pasted[id];
    if (entry?.type !== "text") continue;
    let strippedEntry = stripInvisiblePromptText(entry.content);
    if (strippedEntry.text !== entry.content) {
      if (pasted === pastedContents)
        pasted = {
          ...pastedContents,
        };
      pasted[id] = {
        ...entry,
        content: strippedEntry.text,
      };
      addRemovalCounts(removed, strippedEntry.removed);
      let pastedTextRefNumLines = getPastedTextRefNumLines(strippedEntry.text);
      if (pastedTextRefNumLines !== getPastedTextRefNumLines(entry.content))
        lineCountChanges.set(id, pastedTextRefNumLines);
    }
  }
  for (let entry of Object.values(pasted)) {
    if (entry.type !== "text" || !entry.inline) continue;
    let trimmed = stripInvisiblePromptText(entry.content).text.trim();
    if (trimmed === entry.content) continue;
    let found = nfcVariants(entry.content).find((variant) => input.includes(variant));
    let strippedCandidate =
      found === undefined || found === entry.content ? trimmed : stripInvisiblePromptText(found).text.trim();
    let replacement = text.includes(strippedCandidate) ? strippedCandidate : trimmed;
    if (pasted === pastedContents)
      pasted = {
        ...pastedContents,
      };
    if (replacement === "") delete pasted[entry.id];
    else
      pasted[entry.id] = {
        ...entry,
        content: replacement,
      };
  }
  if (lineCountChanges.size > 0)
    for (let idx = pastedRefs.length - 1; idx >= 0; idx--) {
      let ref = pastedRefs[idx];
      let newLineCount = lineCountChanges.get(ref.id);
      if (newLineCount === undefined) continue;
      let newRefText = ref.match.startsWith("[Pasted text #")
        ? formatPastedTextRef(ref.id, newLineCount)
        : ref.match.startsWith("[...Truncated text #")
          ? `[...Truncated text #${ref.id} +${newLineCount} lines...]`
          : ref.match;
      text = text.slice(0, ref.index) + newRefText + text.slice(ref.index + ref.match.length);
    }
  return {
    input: text,
    pastedContents: pasted,
    removed,
  };
}
//@ chunk-e6aww6q8.js:68313-68434 placement
/**
 * 判断是否不需要提示"已移除不可见字符"：非 prompt 模式、空文本、含双向控制字符、斜杠/叹号命令或内置命令。
 */
function skipInvisibleCharsNotice(text, removed, mode) {
  let trimmed = text.trim();
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
function stripInvisiblePromptChars(removed, surface) {
  logEvent("tengu_prompt_invisible_strip", {
    surface: fromEnum(surface),
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
function stripInvisiblePromptText(text) {
  let stripped = stripInvisibleChars_2(text);
  if (stripped.text === text || !tranquilCloudOn())
    return {
      text,
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
        textLength: text.length,
      },
    };
  let { text: text_2, ...removed } = stripped;
  return {
    text: text_2,
    removed: {
      ...removed,
      textLength: text.length,
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
  let enabled = tranquilCloudOn();
  return (text) => (enabled ? stripInvisibleChars_2(text).text : text);
}
export {
  sanitizePromptText,
  expandPastedTextRefs,
  stripInvisiblePromptChars,
  skipInvisibleCharsNotice,
  sanitizePromptText_2,
  forceRedraw,
};
