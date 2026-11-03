/**
 * utils/externalEventRecords.ts
 *
 * 2.1.316 新增：外部事件（频道消息、粘贴内容）记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xnxk5g3e.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  createSubstringFinder,
  findHistoryCopySpans,
  renderWithBlocks,
  mergeBlocks,
  findTaggedBlocks,
  mergeAdjacentSpans,
  findPasteSpans,
} from "./historyFile.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import {
  sessionTagSalt,
  escapePastedContentTag,
  MIN_INLINE_TAG_CHARS,
  wrapUserTurnContent,
} from "./userTurnTags.js";
import { pastedContentOpenTag, pastedContentCloseTag } from "./pastedContent.js";
import { parseInboundContent, parseInlinePastes } from "../bridge/inboundMessageOrigin.js";
import { isVirtualPancakeEnabled } from "./permissions/permissionSetup.js";
import { uniq } from "./collections.js";
import { stripSystemReminders } from "../components/messageActions.js";
import { neutralizePeerTags } from "./sessionPeers.js";
import { escapePluginTags } from "./messages/pluginTags.js";

//@ chunk-xnxk5g3e.js:603-675 placement
function externalEventRecordIfEnabled(r) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_external_event_record", false) ? r : undefined;
}
//@ chunk-xnxk5g3e.js:675-1127 placement
function recordPastedSpans(r, c, u) {
  let s = c.flat();
  let substringFinder = createSubstringFinder(r);
  let historyCopySpans = findHistoryCopySpans(r, s, substringFinder);
  let i = new Set(
    historyCopySpans.map((historyCopySpan) => r.slice(historyCopySpan.from, historyCopySpan.to)),
  );
  let l = (e) => {
    let a = substringFinder(e);
    let o = a(0);
    for (let historyCopySpan of historyCopySpans) {
      if (o !== -1 && o < historyCopySpan.from) o = a(historyCopySpan.from);
      if (o === -1) return false;
      if (o + e.length <= historyCopySpan.to) return true;
    }
    return false;
  };
  if (c.some((e) => !e.some((a) => i.has(a)) && !e.some(l)))
    logFeatureSad("sdk_pasted_content", "inline_paste_not_found");
  let _ = sessionTagSalt();
  return renderWithBlocks(
    r,
    mergeBlocks(
      historyCopySpans,
      findTaggedBlocks(
        r,
        mergeAdjacentSpans([...historyCopySpans, ...findPasteSpans(r, s, substringFinder)]),
        u,
      ),
    ),
    (e) => ({
      opener: pastedContentOpenTag(_),
      body: escapePastedContentTag(e),
      closer: pastedContentCloseTag(_),
    }),
    escapePastedContentTag,
  );
}
//@ chunk-xnxk5g3e.js:1127-2135 placement
/**
 * 构建外部事件（频道消息等）的记录：解析入站内容与内联粘贴，记录问题。
 */
function buildExternalEventRecord(r, pastedContent, inlinePastes) {
  let s = r ?? "";
  let { texts, problem } = parseInboundContent(pastedContent);
  let inlinePastes_2 = parseInlinePastes(inlinePastes);
  if (problem !== undefined) logFeatureSad("sdk_pasted_content", problem);
  if (inlinePastes_2.problem !== undefined) logFeatureSad("sdk_pasted_content", inlinePastes_2.problem);
  if (texts.length === 0 && inlinePastes_2.texts.length === 0) return s;
  let l = isVirtualPancakeEnabled();
  if (problem === undefined && inlinePastes_2.problem === undefined)
    logFeatureOk("sdk_pasted_content", {
      tagged: l,
      ...(inlinePastes_2.texts.length > 0 && {
        inline: true,
      }),
    });
  if (texts.length === 0 && !l) return s;
  let mapped = inlinePastes_2.texts
    .map((text) => text.trim())
    .filter((t) => t.length >= MIN_INLINE_TAG_CHARS)
    .map((t) =>
      uniq(
        [
          t,
          stripSystemReminders(`x${t}`).slice(1).trim(),
          stripSystemReminders(`${t}x`).slice(0, -1).trim(),
          stripSystemReminders(t).trim(),
        ].flatMap((n) => [n, neutralizePeerTags(n), escapePluginTags(n)]),
      ).filter((n) => n.length >= MIN_INLINE_TAG_CHARS),
    );
  let e = (t) =>
    !l
      ? t
      : Array.isArray(inlinePastes)
        ? recordPastedSpans(
            t,
            mapped,
            inlinePastes_2.texts
              .map((text) => text.trim())
              .filter((n) => n !== "" && n.length < MIN_INLINE_TAG_CHARS),
          )
        : escapePastedContentTag(t);
  let joined = texts
    .map((text) =>
      l
        ? wrapUserTurnContent(text)
        : `

${text}`,
    )
    .join("");
  if (typeof s === "string") return escapePluginTags(e(s) + joined);
  let lastIndex = s.findLastIndex((t) => t.type === "text");
  let mapped_2 = s.map((t, n) =>
    t.type !== "text"
      ? t
      : n === lastIndex
        ? {
            ...t,
            text: e(t.text),
          }
        : l
          ? {
              ...t,
              text: escapePastedContentTag(t.text),
            }
          : t,
  );
  let P = mapped_2[lastIndex];
  return escapePluginTags(
    P?.type !== "text"
      ? joined === ""
        ? mapped_2
        : [
            ...mapped_2,
            {
              type: "text",
              text: joined,
            },
          ]
      : [
          ...mapped_2.slice(0, lastIndex),
          {
            ...P,
            text: P.text + joined,
          },
          ...mapped_2.slice(lastIndex + 1),
        ],
  );
}
export { buildExternalEventRecord, externalEventRecordIfEnabled };
