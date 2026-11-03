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
import { DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { FOREIGN_ORG_THINKING_NOTICE, FOREIGN_ORG_THINKING_HINT } from "../../constants/messages.js";
import { renderTruncatedContent } from "../../utils/terminal.js";
import { splitNoticeDetail, buildSystemNoticeLine } from "./CompactBoundaryMessage.js";
import {
  getValidStringArray,
  getValidHookLabel,
  normalizeHookSummary,
} from "../../utils/collapseHookSummaries.js";
import { permissionRetryText, autoModeRetrySuffix } from "../../utils/messages.js";
import { teamMemSavedPart, getMemorySavedVerb } from "./teamMemSaved.js";
import { ISOLATION_CHECK_INTERVAL } from "../../services/tools/webToolIsolation.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-ah34pb7m.js:48594-48611 placement
var ERROR_PREFIX = "Error: ";
//@ chunk-ah34pb7m.js:48611-48976 placement
/**
 * 识别系统通知文本的类别与语气。
 */
function classifySystemNoticeText(m) {
  let d = m.startsWith(ERROR_PREFIX) ? m.slice(ERROR_PREFIX.length) : m;
  switch (d) {
    case COMPACT_FAILED_CONTEXT_LIMIT:
      return couldNotCompactRow(CONVERSATION_TOO_LONG_HINT);
    case COMPACT_FAILED_MEDIA_LIMIT:
      return couldNotCompactRow(MEDIA_TOO_LARGE_HINT);
    case NO_MESSAGES_TO_COMPACT:
      return {
        tone: "dim",
        text: NO_MESSAGES_TO_COMPACT,
      };
    default:
      break;
  }
  let c = COMPACT_ERROR_PREFIX.trimEnd();
  if (d.startsWith(c)) return couldNotCompactRow(d.slice(c.length).trim());
  if (d.startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
    let replaced = d.slice(COMPACTION_BLOCKED_BY_HOOK.length).replace(/^:\s*/, "");
    return {
      tone: "dim",
      text: COMPACTION_BLOCKED_BY_HOOK,
      detail: replaced || undefined,
    };
  }
  return null;
}
//@ chunk-ah34pb7m.js:48976-49036 placement
function couldNotCompactRow(m) {
  return {
    tone: "red",
    text: COULD_NOT_COMPACT,
    detail: m || undefined,
  };
}
//@ chunk-ah34pb7m.js:49036-49091 placement
var memorySavedVerbApi = null;
var HOOK_FEEDBACK_MAX_WIDTH = 200;
var HOOK_FEEDBACK_MAX_LINES = 5;
var SCHEDULED_TEXT_MAX_LENGTH = 1000;
var SYSTEM_NOTICE_PREFIXES = [`${DIAMOND_GLYPH} `, `${FILLED_DIAMOND_GLYPH} `];
//@ chunk-ah34pb7m.js:49091-51889 placement
/**
 * 解析系统消息（informational、模型回退、定时任务触发等）为显示结构。
 */
function parseSystemMessage(message) {
  switch (message.subtype) {
    case "informational":
    case "model_fallback":
    case "model_consent_fallback":
    case "model_refusal_fallback":
    case "scheduled_task_fire":
      if (typeof message.content !== "string")
        return {
          kind: "legacy",
        };
      break;
    default:
      break;
  }
  switch (message.subtype) {
    case "turn_duration":
      if (
        message.budgetLimit !== undefined ||
        (message.briefHiddenCount ?? 0) > 0 ||
        (message.pendingBackgroundAgentCount ?? 0) > 0 ||
        (message.pendingWorkflowCount ?? 0) > 0
      )
        return {
          kind: "legacy",
        };
      return {
        kind: "hidden",
      };
    case "informational": {
      if (message.highlight !== undefined)
        return {
          kind: "legacy",
        };
      let d;
      switch (message.level) {
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
      if (d === null)
        return {
          kind: "legacy",
        };
      if (
        message.content.startsWith(`${FOREIGN_ORG_THINKING_NOTICE}
`)
      )
        return {
          kind: "line",
          row: {
            tone: d,
            text: FOREIGN_ORG_THINKING_NOTICE,
            detail: FOREIGN_ORG_THINKING_HINT,
            linkify: false,
          },
        };
      let [c, ...g] = renderTruncatedContent(message.content, {
        maxChars: SCHEDULED_TEXT_MAX_LENGTH,
      });
      if (c === undefined)
        return {
          kind: "legacy",
        };
      return {
        kind: "line",
        row: {
          ...(message.level === "warning" && c.startsWith(COULD_NOT_COMPACT)
            ? splitNoticeDetail("red", c, {
                linkify: false,
              })
            : {
                tone: d,
                text: c,
                linkify: false,
              }),
          subLines: g.length > 0 ? g : undefined,
        },
      };
    }
    case "model_fallback":
      return buildSystemNoticeLine("gold", message.content, {
        maxChars: SCHEDULED_TEXT_MAX_LENGTH,
        linkify: false,
      });
    case "model_consent_fallback":
      return {
        kind: "line",
        row: splitNoticeDetail("gold", message.content, {
          linkify: false,
        }),
      };
    case "model_refusal_fallback":
      return buildSystemNoticeLine("gold", message.content, {
        maxChars: SCHEDULED_TEXT_MAX_LENGTH,
        linkify: true,
      });
    case "agents_killed":
      return {
        kind: "line",
        row: {
          tone: "red",
          text: "All background agents stopped",
          linkify: false,
        },
      };
    case "permission_retry": {
      let validStringArray = getValidStringArray(message.commands);
      if (validStringArray.length === 0)
        return {
          kind: "legacy",
        };
      return buildSystemNoticeLine(
        "dim",
        `${permissionRetryText(message.heardAtNextPrompt === true)} ${validStringArray.join(", ")}. ${autoModeRetrySuffix(validStringArray.length)}`,
        {
          linkify: false,
        },
      );
    }
    case "scheduled_task_fire":
      return buildSystemNoticeLine("dim", message.content, {
        maxChars: SCHEDULED_TEXT_MAX_LENGTH,
        linkify: false,
      });
    case "memory_saved": {
      let d = teamMemSavedPart(message);
      let validStringArray = getValidStringArray(message.writtenPaths);
      let memorySavedVerb = getMemorySavedVerb(message);
      let f = validStringArray.length - (d?.count ?? 0);
      let h = memorySavedVerbApi?.localMemoryQualifier() ?? "";
      let filtered = [
        f > 0 ? `${f} ${h}${f === 1 ? "memory" : "memories"}` : null,
        d?.segment ?? null,
      ].filter((T) => T !== null);
      return {
        kind: "line",
        row: {
          tone: "dim",
          text: `${memorySavedVerb} ${filtered.join(" \xB7 ")}`,
          linkify: false,
        },
      };
    }
    case "stop_hook_summary": {
      if (getValidHookLabel(message) !== undefined)
        return {
          kind: "legacy",
        };
      let {
        hookCount,
        hookInfos,
        hookErrors,
        hookAdditionalContext = [],
        preventedContinuation,
        stopReason,
        totalDurationMs,
      } = normalizeHookSummary(message);
      let ms = totalDurationMs ?? hookInfos.reduce((acc, B) => acc + (B.durationMs ?? 0), 0);
      let k = false;
      if (
        hookErrors.length === 0 &&
        hookAdditionalContext.length === 0 &&
        !preventedContinuation &&
        (!k || ms < ISOLATION_CHECK_INTERVAL)
      )
        return {
          kind: "hidden",
        };
      let b = renderTruncatedContent(
        [
          ...(preventedContinuation && stopReason ? [stopReason] : []),
          ...hookErrors.map((hookError) => `Stop hook error: ${hookError}`),
          ...hookAdditionalContext.map((E) => `Stop hook feedback: ${E}`),
        ].join(`
`),
        {
          maxLines: HOOK_FEEDBACK_MAX_LINES,
        },
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
          detail: k && ms > 0 ? formatSecondsShort(ms) : undefined,
          subLines: b.length > 0 ? b : undefined,
          linkify: false,
        },
      };
    }
    default: {
      let d = memorySavedVerbApi?.accountMemorySavedParts(message);
      if (d === undefined)
        return {
          kind: "legacy",
        };
      return {
        kind: "line",
        row: {
          tone: "dim",
          text: d.header,
          detail: d.hint,
          subLines: [
            ...d.pathRows,
            ...(d.bodyRows === undefined
              ? []
              : renderTruncatedContent(
                  d.bodyRows.join(`
`),
                  {
                    maxLines: d.bodyRows.length,
                    preserveLayout: true,
                  },
                )),
          ],
          linkify: false,
        },
      };
    }
  }
}
export {
  SYSTEM_NOTICE_PREFIXES,
  SCHEDULED_TEXT_MAX_LENGTH,
  classifySystemNoticeText,
  HOOK_FEEDBACK_MAX_LINES,
  HOOK_FEEDBACK_MAX_WIDTH,
  parseSystemMessage,
};
