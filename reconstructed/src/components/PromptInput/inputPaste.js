/**
 * components/PromptInput/inputPaste.ts
 *
 * 超长输入截断：超过 10000 字符时中间部分折叠为 "[...Truncated text #N +M lines...]" 并存入 pastedContents。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/inputPaste.ts
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 1, affinity 1, fingerprint 2
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
import { uniq } from "../../utils/collections.js";

//@ chunk-18hwfzwa.js:312232-312870 placement
function resolvePastedTextReference(text, nextPasteId) {
  let { stripped, expanded, removed } = stripPlaceholdersWithOptions(text, nextPasteId);
  let ke = text.trimStart().startsWith("/");
  if (removed.length > 0 && (stripped.trim() === "" || ke))
    return {
      kind: "cancel",
      reason: "paste_gone",
      removed,
    };
  let trimmed = expanded.trim();
  let filtered = Object.values(nextPasteId).filter((Xe) => Xe.type === "image" && !Xe.unavailable);
  if (trimmed === "" && filtered.length === 0)
    return {
      kind: "cancel",
      reason: removed.length > 0 ? "paste_gone" : "blank",
      removed,
    };
  let postedText =
    !ke && stripSystemReminders(trimmed).trimStart().startsWith("/")
      ? `Pasted text:
${trimmed}`
      : trimmed;
  let truncatedLines = uniq(
    [...getTypedPasteContents(text, nextPasteId), ...getInlinePasteTexts(nextPasteId)]
      .map((Xe) => Xe.trim())
      .filter((Xe) => Xe !== "" && trimmed.includes(Xe) && !(ke && trimmed.startsWith(Xe))),
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
//@ chunk-18hwfzwa.js:875921-875941 affinity
var TRUNCATE_THRESHOLD_CHARS = 1e4;
var TRUNCATE_KEEP_CHARS = 1000;
//@ chunk-18hwfzwa.js:875941-876248 fingerprint = formatTruncatedTextRef (0.784)
/**
 * 超过阈值时保留首尾各 500 字符，中段替换为 "[...Truncated text #id +N lines...]"，返回 {truncatedText, placeholderContent}。
 */
function formatTruncatedTextRef(text, nextPasteId, D = false) {
  if ((!D && text.length <= TRUNCATE_THRESHOLD_CHARS) || text.length <= TRUNCATE_KEEP_CHARS)
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
  let ze = `[...Truncated text #${nextPasteId} +${truncatedLines} lines...]`;
  return {
    truncatedText: startText + ze + endText,
    placeholderContent,
  };
}
//@ chunk-18hwfzwa.js:876248-877127 fingerprint = maybeTruncateInput (0.926)
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
  let ee = input.length - Math.floor(TRUNCATE_KEEP_CHARS / 2);
  let ke = new Set();
  let Re = new Set();
  let Be = [];
  let text = input;
  let pastedRefs = parsePastedRefs(input);
  for (let idx = pastedRefs.length - 1; idx >= 0; idx--) {
    let It = pastedRefs[idx];
    let Ot = pastedContents[It.id];
    if (!Ot) continue;
    let Et = It.index + It.match.length;
    let Dt = Et > floored && It.index < ee;
    if (Ot.type !== "text") {
      if (Dt) {
        Be.unshift(It.match);
        text = text.slice(0, It.index) + text.slice(Et);
      }
      continue;
    }
    if (!Dt) {
      Re.add(It.id);
      continue;
    }
    text = text.slice(0, It.index) + Ot.content + text.slice(Et);
    ke.add(It.id);
  }
  let { truncatedText, placeholderContent } = formatTruncatedTextRef(text, nextPasteId, true);
  if (!placeholderContent)
    return {
      newInput: input,
      newPastedContents: pastedContents,
    };
  let newInput = truncatedText;
  if (Be.length > 0) {
    let floored = Math.floor(TRUNCATE_KEEP_CHARS / 2);
    newInput = truncatedText.slice(0, floored) + Be.join("") + truncatedText.slice(floored);
  }
  let kt = {};
  for (let [key, value] of Object.entries(pastedContents)) {
    let Ot = Number(key);
    if (ke.has(Ot) && !Re.has(Ot)) continue;
    kt[Ot] = value;
  }
  kt[nextPasteId] = {
    id: nextPasteId,
    type: "text",
    content: placeholderContent,
  };
  return {
    newInput,
    newPastedContents: kt,
  };
}
export { resolvePastedTextReference, maybeTruncateInput };
