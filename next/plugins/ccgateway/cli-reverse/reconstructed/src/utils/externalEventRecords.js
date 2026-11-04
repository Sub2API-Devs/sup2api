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
function externalEventRecordIfEnabled(record) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_external_event_record", false) ? record : undefined;
}
//@ chunk-xnxk5g3e.js:675-1127 placement
function recordPastedSpans(text, inlineGroups, sessionTag) {
  let inlineTexts = inlineGroups.flat();
  let substringFinder = createSubstringFinder(text);
  let historyCopySpans = findHistoryCopySpans(text, inlineTexts, substringFinder);
  let historyCopies = new Set(
    historyCopySpans.map((historyCopySpan) => text.slice(historyCopySpan.from, historyCopySpan.to)),
  );
  let isCoveredByHistory = (candidate) => {
    let findFrom = substringFinder(candidate);
    let foundAt = findFrom(0);
    for (let historyCopySpan of historyCopySpans) {
      if (foundAt !== -1 && foundAt < historyCopySpan.from) foundAt = findFrom(historyCopySpan.from);
      if (foundAt === -1) return false;
      if (foundAt + candidate.length <= historyCopySpan.to) return true;
    }
    return false;
  };
  if (
    inlineGroups.some(
      (group) => !group.some((segment) => historyCopies.has(segment)) && !group.some(isCoveredByHistory),
    )
  )
    logFeatureSad("sdk_pasted_content", "inline_paste_not_found");
  let salt = sessionTagSalt();
  return renderWithBlocks(
    text,
    mergeBlocks(
      historyCopySpans,
      findTaggedBlocks(
        text,
        mergeAdjacentSpans([...historyCopySpans, ...findPasteSpans(text, inlineTexts, substringFinder)]),
        sessionTag,
      ),
    ),
    (pastedText) => ({
      opener: pastedContentOpenTag(salt),
      body: escapePastedContentTag(pastedText),
      closer: pastedContentCloseTag(salt),
    }),
    escapePastedContentTag,
  );
}
//@ chunk-xnxk5g3e.js:1127-2135 placement
/**
 * 构建外部事件（频道消息等）的记录：解析入站内容与内联粘贴，记录问题。
 */
function buildExternalEventRecord(content, pastedContent, inlinePastes) {
  let baseText = content ?? "";
  let { texts, problem } = parseInboundContent(pastedContent);
  let inlinePastes_2 = parseInlinePastes(inlinePastes);
  if (problem !== undefined) logFeatureSad("sdk_pasted_content", problem);
  if (inlinePastes_2.problem !== undefined) logFeatureSad("sdk_pasted_content", inlinePastes_2.problem);
  if (texts.length === 0 && inlinePastes_2.texts.length === 0) return baseText;
  let virtualPancake = isVirtualPancakeEnabled();
  if (problem === undefined && inlinePastes_2.problem === undefined)
    logFeatureOk("sdk_pasted_content", {
      tagged: virtualPancake,
      ...(inlinePastes_2.texts.length > 0 && {
        inline: true,
      }),
    });
  if (texts.length === 0 && !virtualPancake) return baseText;
  let inlineGroups = inlinePastes_2.texts
    .map((text) => text.trim())
    .filter((text) => text.length >= MIN_INLINE_TAG_CHARS)
    .map((inlineText) =>
      uniq(
        [
          inlineText,
          stripSystemReminders(`x${inlineText}`).slice(1).trim(),
          stripSystemReminders(`${inlineText}x`).slice(0, -1).trim(),
          stripSystemReminders(inlineText).trim(),
        ].flatMap((variant) => [variant, neutralizePeerTags(variant), escapePluginTags(variant)]),
      ).filter((tagged) => tagged.length >= MIN_INLINE_TAG_CHARS),
    );
  let tagPastes = (value) =>
    !virtualPancake
      ? value
      : Array.isArray(inlinePastes)
        ? recordPastedSpans(
            value,
            inlineGroups,
            inlinePastes_2.texts
              .map((text) => text.trim())
              .filter((shortText) => shortText !== "" && shortText.length < MIN_INLINE_TAG_CHARS),
          )
        : escapePastedContentTag(value);
  let joined = texts
    .map((text) =>
      virtualPancake
        ? wrapUserTurnContent(text)
        : `

${text}`,
    )
    .join("");
  if (typeof baseText === "string") return escapePluginTags(tagPastes(baseText) + joined);
  let lastIndex = baseText.findLastIndex((block) => block.type === "text");
  let mapped = baseText.map((block, index) =>
    block.type !== "text"
      ? block
      : index === lastIndex
        ? {
            ...block,
            text: tagPastes(block.text),
          }
        : virtualPancake
          ? {
              ...block,
              text: escapePastedContentTag(block.text),
            }
          : block,
  );
  let tailBlock = mapped[lastIndex];
  return escapePluginTags(
    tailBlock?.type !== "text"
      ? joined === ""
        ? mapped
        : [
            ...mapped,
            {
              type: "text",
              text: joined,
            },
          ]
      : [
          ...mapped.slice(0, lastIndex),
          {
            ...tailBlock,
            text: tailBlock.text + joined,
          },
          ...mapped.slice(lastIndex + 1),
        ],
  );
}
export { buildExternalEventRecord, externalEventRecordIfEnabled };
