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
  Ter,
  getTypedPasteContents,
  getInlinePasteTexts,
  getPastedTextRefNumLines,
  ZR,
  parsePastedRefs,
} from "../../history.js";
import { stripSystemReminders } from "../messageActions.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-18hwfzwa.js:312232-312870 placement
function resolvePastedTextReference(text, nextPasteId) {
  let { stripped: stripped, expanded: expanded, removed: removed } = Ter(text, nextPasteId),
    startsWith = text.trimStart().startsWith("/");
  if (removed.length > 0 && (stripped.trim() === "" || startsWith))
    return { kind: "cancel", reason: "paste_gone", removed: removed };
  let trimmed = expanded.trim(),
    filtered = Object.values(nextPasteId).filter((Xe) => Xe.type === "image" && !Xe.unavailable);
  if (trimmed === "" && filtered.length === 0)
    return { kind: "cancel", reason: removed.length > 0 ? "paste_gone" : "blank", removed: removed };
  let We =
      !startsWith && stripSystemReminders(trimmed).trimStart().startsWith("/")
        ? `Pasted text:
${trimmed}`
        : trimmed,
    truncatedLines = uniq(
      [...getTypedPasteContents(text, nextPasteId), ...getInlinePasteTexts(nextPasteId)]
        .map((Xe) => Xe.trim())
        .filter((Xe) => Xe !== "" && trimmed.includes(Xe) && !(startsWith && trimmed.startsWith(Xe))),
    );
  return {
    kind: "send",
    removed: removed,
    text: trimmed,
    postedText: We,
    inlinePastes: truncatedLines,
    images: filtered,
  };
}
//@ chunk-18hwfzwa.js:875921-875941 affinity
var TRUNCATE_THRESHOLD_CHARS = 1e4,
  TRUNCATE_KEEP_CHARS = 1000;
/**
 * 超过阈值时保留首尾各 500 字符，中段替换为 "[...Truncated text #id +N lines...]"，返回 {truncatedText, placeholderContent}。
 */
//@ chunk-18hwfzwa.js:875941-876248 fingerprint = formatTruncatedTextRef (0.784)
function formatTruncatedTextRef(h, x, D = !1) {
  if ((!D && h.length <= TRUNCATE_THRESHOLD_CHARS) || h.length <= TRUNCATE_KEEP_CHARS)
    return { truncatedText: h, placeholderContent: "" };
  let floored = Math.floor(TRUNCATE_KEEP_CHARS / 2),
    floored_2 = Math.floor(TRUNCATE_KEEP_CHARS / 2),
    sliced = h.slice(0, floored),
    sliced_2 = h.slice(-floored_2),
    sliced_3 = h.slice(floored, -floored_2),
    He = getPastedTextRefNumLines(sliced_3),
    ze = `[...Truncated text #${x} +${He} lines...]`;
  return { truncatedText: sliced + ze + sliced_2, placeholderContent: sliced_3 };
}
/**
 * 对整段输入做截断：先把中段内已有的文本粘贴引用展开、图片引用移出，再调用 formatTruncatedTextRef；把被折叠的中段作为新的 text 粘贴内容存入 pastedContents。
 */
//@ chunk-18hwfzwa.js:876248-877127 fingerprint = maybeTruncateInput (0.926)
function maybeTruncateInput(input, pastedContents) {
  if (input.length <= TRUNCATE_THRESHOLD_CHARS) return { newInput: input, newPastedContents: pastedContents };
  let D = ZR(input, pastedContents),
    floored = Math.floor(TRUNCATE_KEEP_CHARS / 2),
    ee = input.length - Math.floor(TRUNCATE_KEEP_CHARS / 2),
    ke = new Set(),
    Re = new Set(),
    Be = [],
    He = input,
    We = parsePastedRefs(input);
  for (let At = We.length - 1; At >= 0; At--) {
    let It = We[At],
      Ot = pastedContents[It.id];
    if (!Ot) continue;
    let Et = It.index + It.match.length,
      Dt = Et > floored && It.index < ee;
    if (Ot.type !== "text") {
      if (Dt) (Be.unshift(It.match), (He = He.slice(0, It.index) + He.slice(Et)));
      continue;
    }
    if (!Dt) {
      Re.add(It.id);
      continue;
    }
    ((He = He.slice(0, It.index) + Ot.content + He.slice(Et)), ke.add(It.id));
  }
  let { truncatedText: truncatedText, placeholderContent: placeholderContent } = formatTruncatedTextRef(
    He,
    D,
    !0,
  );
  if (!placeholderContent) return { newInput: input, newPastedContents: pastedContents };
  let rt = truncatedText;
  if (Be.length > 0) {
    let floored = Math.floor(TRUNCATE_KEEP_CHARS / 2);
    rt = truncatedText.slice(0, floored) + Be.join("") + truncatedText.slice(floored);
  }
  let kt = {};
  for (let [At, It] of Object.entries(pastedContents)) {
    let Ot = Number(At);
    if (ke.has(Ot) && !Re.has(Ot)) continue;
    kt[Ot] = It;
  }
  return (
    (kt[D] = { id: D, type: "text", content: placeholderContent }),
    { newInput: rt, newPastedContents: kt }
  );
}

export { resolvePastedTextReference, maybeTruncateInput };
