/**
 * components/messages/SystemNoticeMessage.tsx
 *
 * 2.1.316 新增：解析系统消息（informational、模型回退、定时任务触发等）为显示结构；识别系统通知文本的类别与语气。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  CONVERSATION_TOO_LONG_HINT,
  COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE,
  MEDIA_TOO_LARGE_HINT,
  COMPACT_FAILED_MEDIA_LIMIT_MESSAGE,
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COULD_NOT_COMPACT,
} from "../../services/compact/compactErrors.js";
import { COMPACTION_BLOCKED_BY_HOOK } from "../../services/compact/compact.js";
import { DIAMOND_GLYPH, FILLED_DIAMOND_GLYPH } from "../../constants/figures.js";
import {
  FOREIGN_ORG_THINKING_NOTICE,
  FOREIGN_ORG_THINKING_HINT,
  permissionRetryText,
  autoModeRetrySuffix,
} from "../../utils/messages.js";
import { renderTruncatedContent } from "../../utils/terminal.js";
import { splitNoticeDetail, buildSystemNoticeLine } from "./CompactBoundaryMessage.js";
import {
  getValidStringArray,
  getValidHookLabel,
  normalizeHookSummary,
} from "../../utils/collapseHookSummaries.js";
import { teamMemSavedPart, getMemorySavedVerb } from "./teamMemSaved.js";
import { ISOLATION_CHECK_INTERVAL } from "../../services/tools/webToolIsolation.js";
import { formatSecondsShort } from "../../utils/format.js";

//@ chunk-wjygkcr4.js:49210-49227 placement
var ERROR_PREFIX = "Error: ";
//@ chunk-wjygkcr4.js:49227-49592 placement
/**
 * 识别系统通知文本的类别与语气。
 */
function classifySystemNoticeText(rawText) {
  let text = rawText.startsWith(ERROR_PREFIX) ? rawText.slice(ERROR_PREFIX.length) : rawText;
  switch (text) {
    case COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE:
      return couldNotCompactRow(CONVERSATION_TOO_LONG_HINT);
    case COMPACT_FAILED_MEDIA_LIMIT_MESSAGE:
      return couldNotCompactRow(MEDIA_TOO_LARGE_HINT);
    case NO_MESSAGES_TO_COMPACT:
      return {
        tone: "dim",
        text: NO_MESSAGES_TO_COMPACT,
      };
    default:
      break;
  }
  let errorPrefix = COMPACT_ERROR_PREFIX.trimEnd();
  if (text.startsWith(errorPrefix)) return couldNotCompactRow(text.slice(errorPrefix.length).trim());
  if (text.startsWith(COMPACTION_BLOCKED_BY_HOOK)) {
    let replaced = text.slice(COMPACTION_BLOCKED_BY_HOOK.length).replace(/^:\s*/, "");
    return {
      tone: "dim",
      text: COMPACTION_BLOCKED_BY_HOOK,
      detail: replaced || undefined,
    };
  }
  return null;
}
//@ chunk-wjygkcr4.js:49592-49652 placement
function couldNotCompactRow(detail) {
  return {
    tone: "red",
    text: COULD_NOT_COMPACT,
    detail: detail || undefined,
  };
}
//@ chunk-wjygkcr4.js:49652-49707 placement
var memorySavedVerbApi = null;
var HOOK_FEEDBACK_MAX_WIDTH = 200;
var HOOK_FEEDBACK_MAX_LINES = 5;
var SCHEDULED_TEXT_MAX_LENGTH = 1000;
var SYSTEM_NOTICE_PREFIXES = [`${DIAMOND_GLYPH} `, `${FILLED_DIAMOND_GLYPH} `];
//@ chunk-wjygkcr4.js:49707-52505 placement
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
      let tone;
      switch (message.level) {
        case "warning":
          tone = "gold";
          break;
        case "notice":
          tone = "dim";
          break;
        case "info":
        case "suggestion":
          tone = null;
          break;
      }
      if (tone === null)
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
            tone,
            text: FOREIGN_ORG_THINKING_NOTICE,
            detail: FOREIGN_ORG_THINKING_HINT,
            linkify: false,
          },
        };
      let [firstText, ...subTexts] = renderTruncatedContent(message.content, {
        maxChars: SCHEDULED_TEXT_MAX_LENGTH,
      });
      if (firstText === undefined)
        return {
          kind: "legacy",
        };
      return {
        kind: "line",
        row: {
          ...(message.level === "warning" && firstText.startsWith(COULD_NOT_COMPACT)
            ? splitNoticeDetail("red", firstText, {
                linkify: false,
              })
            : {
                tone,
                text: firstText,
                linkify: false,
              }),
          subLines: subTexts.length > 0 ? subTexts : undefined,
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
      let savedPart = teamMemSavedPart(message);
      let validStringArray = getValidStringArray(message.writtenPaths);
      let memorySavedVerb = getMemorySavedVerb(message);
      let localCount = validStringArray.length - (savedPart?.count ?? 0);
      let localQualifier = memorySavedVerbApi?.localMemoryQualifier() ?? "";
      let filtered = [
        localCount > 0 ? `${localCount} ${localQualifier}${localCount === 1 ? "memory" : "memories"}` : null,
        savedPart?.segment ?? null,
      ].filter((part) => part !== null);
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
      let ms = totalDurationMs ?? hookInfos.reduce((acc, hookInfo) => acc + (hookInfo.durationMs ?? 0), 0);
      let isIsolated = false;
      if (
        hookErrors.length === 0 &&
        hookAdditionalContext.length === 0 &&
        !preventedContinuation &&
        (!isIsolated || ms < ISOLATION_CHECK_INTERVAL)
      )
        return {
          kind: "hidden",
        };
      let contentRows = renderTruncatedContent(
        [
          ...(preventedContinuation && stopReason ? [stopReason] : []),
          ...hookErrors.map((hookError) => `Stop hook error: ${hookError}`),
          ...hookAdditionalContext.map((feedbackLine) => `Stop hook feedback: ${feedbackLine}`),
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
          detail: isIsolated && ms > 0 ? formatSecondsShort(ms) : undefined,
          subLines: contentRows.length > 0 ? contentRows : undefined,
          linkify: false,
        },
      };
    }
    default: {
      let savedParts = memorySavedVerbApi?.accountMemorySavedParts(message);
      if (savedParts === undefined)
        return {
          kind: "legacy",
        };
      return {
        kind: "line",
        row: {
          tone: "dim",
          text: savedParts.header,
          detail: savedParts.hint,
          subLines: [
            ...savedParts.pathRows,
            ...(savedParts.bodyRows === undefined
              ? []
              : renderTruncatedContent(
                  savedParts.bodyRows.join(`
`),
                  {
                    maxLines: savedParts.bodyRows.length,
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
  parseSystemMessage,
  HOOK_FEEDBACK_MAX_WIDTH,
  HOOK_FEEDBACK_MAX_LINES,
  SYSTEM_NOTICE_PREFIXES,
  SCHEDULED_TEXT_MAX_LENGTH,
  classifySystemNoticeText,
};
