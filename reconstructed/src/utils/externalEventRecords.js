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
import { v0e, ofe, zSt, cbe } from "./userTurnTags.js";
import { Gwr, zDn } from "./pastedContent.js";
import { parseInboundContent, parseInlinePastes } from "../bridge/inboundMessageOrigin.js";
import { isVirtualPancakeEnabled } from "./permissions/permissionSetup.js";
import { uniq } from "./collections.js";
import { stripSystemReminders } from "../components/messageActions.js";
import { iIt } from "./sessionPeers.js";
import { escapePluginTags } from "./messages/pluginTags.js";

//@ chunk-xnxk5g3e.js:603-675 placement
function externalEventRecordIfEnabled(r) {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_external_event_record", !1) ? r : void 0;
}
//@ chunk-xnxk5g3e.js:675-1127 placement
function recordPastedSpans(r, c, u) {
  let flat = c.flat(),
    m = createSubstringFinder(r),
    p = findHistoryCopySpans(r, flat, m),
    i = new Set(p.map((e) => r.slice(e.from, e.to))),
    l = (e) => {
      let a = m(e),
        o = a(0);
      for (let d of p) {
        if (o !== -1 && o < d.from) o = a(d.from);
        if (o === -1) return !1;
        if (o + e.length <= d.to) return !0;
      }
      return !1;
    };
  if (c.some((e) => !e.some((a) => i.has(a)) && !e.some(l)))
    logFeatureSad("sdk_pasted_content", "inline_paste_not_found");
  let _ = v0e();
  return renderWithBlocks(
    r,
    mergeBlocks(p, findTaggedBlocks(r, mergeAdjacentSpans([...p, ...findPasteSpans(r, flat, m)]), u)),
    (e) => ({ opener: Gwr(_), body: ofe(e), closer: zDn(_) }),
    ofe,
  );
}
/**
 * 构建外部事件（频道消息等）的记录：解析入站内容与内联粘贴，记录问题。
 */
//@ chunk-xnxk5g3e.js:1127-2135 placement
function buildExternalEventRecord(r, c, u) {
  let s = r ?? "",
    { texts: texts, problem: problem } = parseInboundContent(c),
    i = parseInlinePastes(u);
  if (problem !== void 0) logFeatureSad("sdk_pasted_content", problem);
  if (i.problem !== void 0) logFeatureSad("sdk_pasted_content", i.problem);
  if (texts.length === 0 && i.texts.length === 0) return s;
  let l = isVirtualPancakeEnabled();
  if (problem === void 0 && i.problem === void 0)
    logFeatureOk("sdk_pasted_content", { tagged: l, ...(i.texts.length > 0 && { inline: !0 }) });
  if (texts.length === 0 && !l) return s;
  let mapped = i.texts
      .map((text) => text.trim())
      .filter((t) => t.length >= zSt)
      .map((t) =>
        uniq(
          [
            t,
            stripSystemReminders(`x${t}`).slice(1).trim(),
            stripSystemReminders(`${t}x`).slice(0, -1).trim(),
            stripSystemReminders(t).trim(),
          ].flatMap((n) => [n, iIt(n), escapePluginTags(n)]),
        ).filter((n) => n.length >= zSt),
      ),
    e = (t) =>
      !l
        ? t
        : Array.isArray(u)
          ? recordPastedSpans(
              t,
              mapped,
              i.texts.map((text) => text.trim()).filter((n) => n !== "" && n.length < zSt),
            )
          : ofe(t),
    joined = texts
      .map((t) =>
        l
          ? cbe(t)
          : `

${t}`,
      )
      .join("");
  if (typeof s === "string") return escapePluginTags(e(s) + joined);
  let lastIndex = s.findLastIndex((t) => t.type === "text"),
    mapped_2 = s.map((t, n) =>
      t.type !== "text"
        ? t
        : n === lastIndex
          ? { ...t, text: e(t.text) }
          : l
            ? { ...t, text: ofe(t.text) }
            : t,
    ),
    P = mapped_2[lastIndex];
  return escapePluginTags(
    P?.type !== "text"
      ? joined === ""
        ? mapped_2
        : [...mapped_2, { type: "text", text: joined }]
      : [...mapped_2.slice(0, lastIndex), { ...P, text: P.text + joined }, ...mapped_2.slice(lastIndex + 1)],
  );
}

export { buildExternalEventRecord, externalEventRecordIfEnabled };
