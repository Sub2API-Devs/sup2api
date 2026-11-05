/**
 * components/PromptInput/inputPaste.ts
 *
 * 超长输入截断：超过 10000 字符时中间部分折叠为 "[...Truncated text #N +M lines...]" 并存入 pastedContents。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/inputPaste.ts
 * pieces: chunk-4b7tnq3g.js (1), chunk-czq1j3j2.js (4)
 * attribution: placement 2, affinity 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  stripPlaceholdersWithOptions,
  getTypedPasteContents,
  getInlinePasteTexts,
  getPastedTextRefNumLines,
  mintPasteId,
  parsePastedRefs,
} from "../../history.js";
import { stripSystemReminders } from "../messageActions.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-4b7tnq3g.js:1891-1903 placement
var TRUNCATE_THRESHOLD_CHARS = 1e4;
//@ chunk-czq1j3j2.js:321824-322462 placement
function resolvePastedTextReference(text, nextPasteId) {
  let { stripped, expanded, removed } = stripPlaceholdersWithOptions(text, nextPasteId);
  let isSlashText = text.trimStart().startsWith("/");
  if (removed.length > 0 && (stripped.trim() === "" || isSlashText))
    return {
      kind: "cancel",
      reason: "paste_gone",
      removed,
    };
  let trimmed = expanded.trim();
  let filtered = Object.values(nextPasteId).filter((state) => state.type === "image" && !state.unavailable);
  if (trimmed === "" && filtered.length === 0)
    return {
      kind: "cancel",
      reason: removed.length > 0 ? "paste_gone" : "blank",
      removed,
    };
  let postedText =
    !isSlashText && stripSystemReminders(trimmed).trimStart().startsWith("/")
      ? `Pasted text:
${trimmed}`
      : trimmed;
  let truncatedLines = normalizeCaseForComparison_2(
    [...getTypedPasteContents(text, nextPasteId), ...getInlinePasteTexts(nextPasteId)]
      .map((state) => state.trim())
      .filter(
        (removedFragment) =>
          removedFragment !== "" &&
          trimmed.includes(removedFragment) &&
          !(isSlashText && trimmed.startsWith(removedFragment)),
      ),
  );
  return {
    kind: "send",
    removed,
    text: trimmed,
    postedText,
    inlinePastes: truncatedLines,
    images: filtered,
  };
}
//@ chunk-czq1j3j2.js:908802-908814 affinity
var TRUNCATE_KEEP_CHARS = 1000;
//@ chunk-czq1j3j2.js:908814-909121 fingerprint (2.1.88 match: formatTruncatedTextRef, 0.784)
/**
 * 超过阈值时保留首尾各 500 字符，中段替换为 "[...Truncated text #id +N lines...]"，返回 {truncatedText, placeholderContent}。
 */
function formatTruncatedTextRef(text, nextPasteId, force = false) {
  if ((!force && text.length <= TRUNCATE_THRESHOLD_CHARS) || text.length <= TRUNCATE_KEEP_CHARS)
    return {
      truncatedText: text,
      placeholderContent: "",
    };
  let startLength = Math.floor(TRUNCATE_KEEP_CHARS / 2);
  let endLength = Math.floor(TRUNCATE_KEEP_CHARS / 2);
  let startText = text.slice(0, startLength);
  let endText = text.slice(-endLength);
  let placeholderContent = text.slice(startLength, -endLength);
  let truncatedLines = getPastedTextRefNumLines(placeholderContent);
  let placeholder = `[...Truncated text #${nextPasteId} +${truncatedLines} lines...]`;
  return {
    truncatedText: startText + placeholder + endText,
    placeholderContent,
  };
}
//@ chunk-czq1j3j2.js:909121-910000 fingerprint (2.1.88 match: maybeTruncateInput, 0.926)
/**
 * 对整段输入做截断：先把中段内已有的文本粘贴引用展开、图片引用移出，再调用 formatTruncatedTextRef；把被折叠的中段作为新的 text 粘贴内容存入 pastedContents。
 */
function maybeTruncateInput(input, pastedContents) {
  if (input.length <= TRUNCATE_THRESHOLD_CHARS)
    return {
      newInput: input,
      newPastedContents: pastedContents,
    };
  let nextPasteId = mintPasteId(input, pastedContents);
  let floored = Math.floor(TRUNCATE_KEEP_CHARS / 2);
  let rightEdge = input.length - Math.floor(TRUNCATE_KEEP_CHARS / 2);
  let pastesInWindow = new Set();
  let pastesOutsideWindow = new Set();
  let reinsertedRefs = [];
  let text = input;
  let pastedRefs = parsePastedRefs(input);
  for (let idx = pastedRefs.length - 1; idx >= 0; idx--) {
    let ref = pastedRefs[idx];
    let pasted = pastedContents[ref.id];
    if (!pasted) continue;
    let refEnd = ref.index + ref.match.length;
    let inWindow = refEnd > floored && ref.index < rightEdge;
    if (pasted.type !== "text") {
      if (inWindow) {
        reinsertedRefs.unshift(ref.match);
        text = text.slice(0, ref.index) + text.slice(refEnd);
      }
      continue;
    }
    if (!inWindow) {
      pastesOutsideWindow.add(ref.id);
      continue;
    }
    text = text.slice(0, ref.index) + pasted.content + text.slice(refEnd);
    pastesInWindow.add(ref.id);
  }
  let { truncatedText, placeholderContent } = formatTruncatedTextRef(text, nextPasteId, true);
  if (!placeholderContent)
    return {
      newInput: input,
      newPastedContents: pastedContents,
    };
  let newInput = truncatedText;
  if (reinsertedRefs.length > 0) {
    let floored = Math.floor(TRUNCATE_KEEP_CHARS / 2);
    newInput = truncatedText.slice(0, floored) + reinsertedRefs.join("") + truncatedText.slice(floored);
  }
  let keptContents = {};
  for (let [key, value] of Object.entries(pastedContents)) {
    let pasteId = Number(key);
    if (pastesInWindow.has(pasteId) && !pastesOutsideWindow.has(pasteId)) continue;
    keptContents[pasteId] = value;
  }
  keptContents[nextPasteId] = {
    id: nextPasteId,
    type: "text",
    content: placeholderContent,
  };
  return {
    newInput,
    newPastedContents: keptContents,
  };
}
export { resolvePastedTextReference, TRUNCATE_THRESHOLD_CHARS, maybeTruncateInput };
