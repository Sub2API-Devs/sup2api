/**
 * services/compact/_new/withToolsLoadedBeforeSummary.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: sole-consumer-new 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage, toError } from "../../../utils/errors.js";
import { isProactivityActive } from "../../../Tool.js";
import { sSe } from "../../../utils/proactivityMode.js";
import { q1 } from "../../../utils/proactivity.js";

/**
 * 错误文本自证。压缩后给 deferred_tools_delta 附件补 loadedBeforeSummaryNames（压缩前已加载、本次又新增的工具名）；开关 tengu_radiant_lemur。
 */
//@ chunk-e6aww6q8.js:1652913-1653514 sole-consumer-new
function withToolsLoadedBeforeSummary(e, n) {
  try {
    return e.map((r) => {
      if (r.type !== "deferred_tools_delta" || r.toolSearchAbsent === !0) return r;
      let s = new Set([...(r.loadedNames ?? []), ...(r.surfacedNames ?? []), ...(r.replacedNames ?? [])]),
        filtered = r.addedNames.filter((addedName) => n.has(addedName) && !s.has(addedName));
      if (filtered.length === 0) return r;
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_lemur", !1))
        return (logFeatureSad("compact_names_loaded_tools", "flag_off", { count: filtered.length }), r);
      return (
        logFeatureOk("compact_names_loaded_tools", { count: filtered.length }),
        { ...r, loadedBeforeSummaryNames: filtered }
      );
    });
  } catch (error) {
    return (
      logError(
        withTelemetryMessage(
          toError(error),
          "withToolsLoadedBeforeSummary threw: the notice names no loaded tool",
        ),
      ),
      logFeatureBad("compact_names_loaded_tools", "threw"),
      e
    );
  }
}
/**
 * 压缩后若新消息里没有 proactivity 附件，保留历史中最后一个未撤回的 proactivity 附件。
 */
//@ chunk-e6aww6q8.js:1653514-1653656 sole-consumer-new
function getProactivityAttachmentToKeep(e, n) {
  {
    if (!isProactivityActive() || n.some(isProactivityAttachment)) return [];
    let r = e.findLast(isProactivityAttachment)?.attachment;
    return r !== void 0 && r.status !== "withdrawn" ? [r] : [];
  }
  return [];
}
/**
 * 消息是 proactivity 附件，且已撤回或级别/工具有效。
 */
//@ chunk-e6aww6q8.js:1653656-1653817 sole-consumer-new
function isProactivityAttachment(e) {
  if (e.type !== "attachment" || e.attachment.type !== "proactivity") return !1;
  let attachment = e.attachment;
  return attachment.status === "withdrawn" || (sSe(attachment.level) && q1(attachment.tools));
}

export { withToolsLoadedBeforeSummary, getProactivityAttachmentToKeep };
