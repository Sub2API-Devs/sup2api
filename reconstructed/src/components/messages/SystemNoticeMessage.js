/**
 * components/messages/SystemNoticeMessage.tsx
 *
 * 2.1.316 新增：解析系统消息（informational、模型回退、定时任务触发等）为显示结构；识别系统通知文本的类别与语气。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (5)
 * attribution: placement 5
 */
import {
  CONVERSATION_TOO_LONG_HINT,
  COMPACT_FAILED_CONTEXT_LIMIT,
  MEDIA_TOO_LARGE_HINT,
  COMPACT_FAILED_MEDIA_LIMIT,
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COULD_NOT_COMPACT,
} from "../../services/compact/compactErrors.js";
import { COMPACTION_BLOCKED_BY_HOOK } from "../../services/compact/compact.js";
import { DIAMOND_GLYPH, Wx } from "../../utils/permissions/autoModeRulesPrompt.js";
import { FOREIGN_ORG_THINKING_NOTICE, FOREIGN_ORG_THINKING_HINT } from "../../constants/messages.js";
import { renderTruncatedContent } from "../../utils/terminal.js";
import { splitNoticeDetail, buildSystemNoticeLine } from "./CompactBoundaryMessage.js";
import {
  getValidStringArray,
  getValidHookLabel,
  normalizeHookSummary,
} from "../../utils/collapseHookSummaries.js";
import { permissionRetryText, tjt } from "../../utils/messages.js";
import { teamMemSavedPart, getMemorySavedVerb } from "./teamMemSaved.js";
import { ISOLATION_CHECK_INTERVAL } from "../../services/tools/webToolIsolation.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:48594-48611 placement
var ky = "Error: ";
/**
 * 识别系统通知文本的类别与语气。
 */
//@ chunk-ah34pb7m.js:48611-48976 placement
function classifySystemNoticeText(m) {
  let d = m.startsWith(ky) ? m.slice(ky.length) : m;
  switch (d) {
    case COMPACT_FAILED_CONTEXT_LIMIT:
      return Qu(CONVERSATION_TOO_LONG_HINT);
    case COMPACT_FAILED_MEDIA_LIMIT:
      return Qu(MEDIA_TOO_LARGE_HINT);
    case NO_MESSAGES_TO_COMPACT:
      return { tone: "dim", text: NO_MESSAGES_TO_COMPACT };
    default:
      break;
  }
  let trimEnd = COMPACT_ERROR_PREFIX.trimEnd();
  if (d.startsWith(trimEnd)) return Qu(d.slice(trimEnd.length).trim());
  if (d.startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
    let replaced = d.slice(COMPACTION_BLOCKED_BY_HOOK.length).replace(/^:\s*/, "");
    return { tone: "dim", text: COMPACTION_BLOCKED_BY_HOOK, detail: replaced || void 0 };
  }
  return null;
}
//@ chunk-ah34pb7m.js:48976-49036 placement
function Qu(m) {
  return { tone: "red", text: COULD_NOT_COMPACT, detail: m || void 0 };
}
//@ chunk-ah34pb7m.js:49036-49091 placement
var wy = null,
  Cy = 200,
  Zu = 5,
  Ir = 1000,
  eE = [`${DIAMOND_GLYPH} `, `${Wx} `];
/**
 * 解析系统消息（informational、模型回退、定时任务触发等）为显示结构。
 */
//@ chunk-ah34pb7m.js:49091-51889 placement
function parseSystemMessage(m) {
  switch (m.subtype) {
    case "informational":
    case "model_fallback":
    case "model_consent_fallback":
    case "model_refusal_fallback":
    case "scheduled_task_fire":
      if (typeof m.content !== "string") return { kind: "legacy" };
      break;
    default:
      break;
  }
  switch (m.subtype) {
    case "turn_duration":
      if (
        m.budgetLimit !== void 0 ||
        (m.briefHiddenCount ?? 0) > 0 ||
        (m.pendingBackgroundAgentCount ?? 0) > 0 ||
        (m.pendingWorkflowCount ?? 0) > 0
      )
        return { kind: "legacy" };
      return { kind: "hidden" };
    case "informational": {
      if (m.highlight !== void 0) return { kind: "legacy" };
      let d;
      switch (m.level) {
        case "warning":
          d = "gold";
          break;
        case "notice":
          d = "dim";
          break;
        case "info":
        case "suggestion":
          d = null;
          break;
      }
      if (d === null) return { kind: "legacy" };
      if (
        m.content.startsWith(`${FOREIGN_ORG_THINKING_NOTICE}
`)
      )
        return {
          kind: "line",
          row: { tone: d, text: FOREIGN_ORG_THINKING_NOTICE, detail: FOREIGN_ORG_THINKING_HINT, linkify: !1 },
        };
      let [c, ...g] = renderTruncatedContent(m.content, { maxChars: Ir });
      if (c === void 0) return { kind: "legacy" };
      return {
        kind: "line",
        row: {
          ...(m.level === "warning" && c.startsWith(COULD_NOT_COMPACT)
            ? splitNoticeDetail("red", c, { linkify: !1 })
            : { tone: d, text: c, linkify: !1 }),
          subLines: g.length > 0 ? g : void 0,
        },
      };
    }
    case "model_fallback":
      return buildSystemNoticeLine("gold", m.content, { maxChars: Ir, linkify: !1 });
    case "model_consent_fallback":
      return { kind: "line", row: splitNoticeDetail("gold", m.content, { linkify: !1 }) };
    case "model_refusal_fallback":
      return buildSystemNoticeLine("gold", m.content, { maxChars: Ir, linkify: !0 });
    case "agents_killed":
      return { kind: "line", row: { tone: "red", text: "All background agents stopped", linkify: !1 } };
    case "permission_retry": {
      let d = getValidStringArray(m.commands);
      if (d.length === 0) return { kind: "legacy" };
      return buildSystemNoticeLine(
        "dim",
        `${permissionRetryText(m.heardAtNextPrompt === !0)} ${d.join(", ")}. ${tjt(d.length)}`,
        { linkify: !1 },
      );
    }
    case "scheduled_task_fire":
      return buildSystemNoticeLine("dim", m.content, { maxChars: Ir, linkify: !1 });
    case "memory_saved": {
      let d = teamMemSavedPart(m),
        c = getValidStringArray(m.writtenPaths),
        g = getMemorySavedVerb(m),
        f = c.length - (d?.count ?? 0),
        h = wy?.localMemoryQualifier() ?? "",
        filtered = [f > 0 ? `${f} ${h}${f === 1 ? "memory" : "memories"}` : null, d?.segment ?? null].filter(
          (T) => T !== null,
        );
      return { kind: "line", row: { tone: "dim", text: `${g} ${filtered.join(" \xB7 ")}`, linkify: !1 } };
    }
    case "stop_hook_summary": {
      if (getValidHookLabel(m) !== void 0) return { kind: "legacy" };
      let {
          hookCount: hookCount,
          hookInfos: hookInfos,
          hookErrors: hookErrors,
          hookAdditionalContext: hookAdditionalContext = [],
          preventedContinuation: preventedContinuation,
          stopReason: stopReason,
          totalDurationMs: totalDurationMs,
        } = normalizeHookSummary(m),
        x = totalDurationMs ?? hookInfos.reduce((E, B) => E + (B.durationMs ?? 0), 0),
        k = !1;
      if (
        hookErrors.length === 0 &&
        hookAdditionalContext.length === 0 &&
        !preventedContinuation &&
        (!k || x < ISOLATION_CHECK_INTERVAL)
      )
        return { kind: "hidden" };
      let b = renderTruncatedContent(
        [
          ...(preventedContinuation && stopReason ? [stopReason] : []),
          ...hookErrors.map((E) => `Stop hook error: ${E}`),
          ...hookAdditionalContext.map((E) => `Stop hook feedback: ${E}`),
        ].join(`
`),
        { maxLines: Zu },
      );
      return {
        kind: "line",
        row: {
          tone:
            hookErrors.length > 0
              ? "red"
              : preventedContinuation || hookAdditionalContext.length > 0
                ? "gold"
                : "dim",
          text: `Ran ${hookCount} stop ${hookCount === 1 ? "hook" : "hooks"}`,
          detail: k && x > 0 ? formatSecondsShort(x) : void 0,
          subLines: b.length > 0 ? b : void 0,
          linkify: !1,
        },
      };
    }
    default: {
      let d = wy?.accountMemorySavedParts(m);
      if (d === void 0) return { kind: "legacy" };
      return {
        kind: "line",
        row: {
          tone: "dim",
          text: d.header,
          detail: d.hint,
          subLines: [
            ...d.pathRows,
            ...(d.bodyRows === void 0
              ? []
              : renderTruncatedContent(
                  d.bodyRows.join(`
`),
                  { maxLines: d.bodyRows.length, preserveLayout: !0 },
                )),
          ],
          linkify: !1,
        },
      };
    }
  }
}

export { eE, Ir, classifySystemNoticeText, Zu, Cy, parseSystemMessage };
